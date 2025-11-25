# MCP Server OAuth Authorization Implementation Guide

This document details how to add a standard OAuth 2.0 authorization mechanism to a Model Context Protocol (MCP) Server. This implementation has been verified with `@modelcontextprotocol/inspector`.

## 1. Overview

The MCP OAuth flow is designed to allow Clients (such as Claude Desktop, MCP Inspector) to securely obtain the Token required to access protected resources.

The entire process consists of the following 6 stages:
1.  **Metadata Discovery**: The Client discovers the Server's OAuth configuration.
2.  **Client Registration**: The Client registers itself with the Server (supports dynamic registration).
3.  **Preparing Authorization**: The Client prepares the authorization request.
4.  **Authorization**: The user completes authorization in the browser, and the Client obtains an Authorization Code.
5.  **Token Request**: The Client exchanges the Code for an Access Token.
6.  **Authentication Complete**: The Client uses the Token to access MCP resources.

## 2. Prerequisites

Before you begin, you need:
1.  A GitHub OAuth App (or an application from another OAuth provider).
2.  Obtain the `Client ID` and `Client Secret`.
3.  Set the Callback URL, e.g., `http://localhost:3001/auth/callback`.
4.  Configure environment variables:
    *   `GITHUB_CLIENT_ID`: GitHub App Client ID
    *   `GITHUB_CLIENT_SECRET`: GitHub App Client Secret
    *   `GITHUB_REDIRECT_URI`: (Optional) Explicitly specify the callback address, defaults to `http://localhost:3001/auth/callback`

## 3. Implementation Steps

### 3.1. Dependencies

This project uses `hono` as the HTTP framework and `@modelcontextprotocol/sdk` as the MCP SDK.

### 3.2. CORS Configuration

**Key Point**: CORS must be configured correctly, especially `Access-Control-Expose-Headers`, otherwise the Client cannot read the `WWW-Authenticate` header, causing the flow to fail to start.

```typescript
const createCors = () => cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version', 'Authorization', 'Access-Control-Request-Headers', 'Access-Control-Request-Method'],
  exposeHeaders: ['mcp-session-id', 'last-event-id', 'mcp-protocol-version', 'WWW-Authenticate']
});
```

### 3.3. Protect MCP Endpoint (HTTP 401)

When a Client requests an MCP endpoint (e.g., `/mcp`) without a Token, the Server must return `401 Unauthorized` and guide the Client in the Header on where to discover Metadata.

```typescript
// Check for Authorization header
const authHeader = ctx.req.header('Authorization');
let token = config?.token;

if (authHeader && authHeader.startsWith('Bearer ')) {
  token = authHeader.substring(7);
}

// If no token provided and no session ID (initial request), return 401
const sessionId = ctx.req.header(PORT_HEADER);
if (!token && !sessionId) {
  const port = Number(process.env.STREAMABLE_HTTP_PORT) || Number(process.env.PORT) || 3001;
  const hostname = process.env.HOSTNAME || 'localhost';
  const metadataUrl = `http://${hostname}:${port}/.well-known/oauth-protected-resource`;
  
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Bearer realm="mcp", resource_metadata="${metadataUrl}"`
    }
  });
}
```

### 3.4. Metadata Discovery

Implement two standard endpoints to return the OAuth server configuration information.

*   `/.well-known/oauth-protected-resource`
*   `/.well-known/oauth-authorization-server`

```typescript
const getMetadata = () => {
  const hostname = process.env.HOSTNAME || 'localhost';
  const baseUrl = `http://${hostname}:${port}`;
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/auth/authorize`,
    token_endpoint: `${baseUrl}/auth/token`,
    registration_endpoint: `${baseUrl}/auth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["repo", "user"]
  };
};
```

### 3.5. Client Registration (Dynamic Registration)

Clients like Inspector need dynamic registration to obtain a `client_id`.

```typescript
app.post('/auth/register', async (c) => {
  const body = await c.req.json();
  const redirectUris = body.redirect_uris;
  
  return c.json({
    client_id: "mcp-inspector", // Can be any identifier
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    redirect_uris: redirectUris || [],
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"]
  });
});
```

### 3.6. Authorization Endpoint (`/auth/authorize`)

This endpoint receives the authorization request from the Client and redirects to the real OAuth provider (e.g., GitHub).
**Note**: The Client's `redirect_uri` and `state` need to be encoded and passed through to GitHub so they can be restored upon callback. Also, use `GITHUB_CLIENT_ID` and `GITHUB_REDIRECT_URI` from environment variables.

```typescript
app.get('/auth/authorize', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = c.req.query('redirect_uri');
  const state = c.req.query('state');
  
  // Encode client state to pass through GitHub
  const serverState = Buffer.from(JSON.stringify({ redirectUri, state })).toString('base64');
  const serverRedirectUri = process.env.GITHUB_REDIRECT_URI || `http://${hostname}:${port}/auth/callback`;
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&redirect_uri=${encodeURIComponent(serverRedirectUri)}&state=${serverState}`;
  return c.redirect(authUrl);
});
```

### 3.7. Callback Endpoint (`/auth/callback`)

Receives the callback from GitHub and exchanges the `Client Secret` on the Server side for an Access Token.
For security reasons, we do not give the GitHub Token directly to the Client, but generate a temporary `code` for the Client to exchange.

```typescript
// Temporary storage for OAuth flow
const tempCodeMap = new Map<string, string>();

app.get('/auth/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  
  // ... Parse state, get Client's redirect_uri ...
  const { redirectUri: clientRedirectUri, state: clientState } = JSON.parse(Buffer.from(state, 'base64').toString());
  
  // Exchange code for GitHub Access Token
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'GitHub-MCP-Server'
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  const data = await response.json();
  const accessToken = data.access_token;

  if (accessToken) {
    // Generate a temporary code for the client to exchange
    const tempCode = randomUUID();
    tempCodeMap.set(tempCode, accessToken);
    
    // Expire temp code after 1 minute
    setTimeout(() => tempCodeMap.delete(tempCode), 60000);

    const redirectUrl = `${clientRedirectUri}?code=${tempCode}&state=${clientState}`;
    return c.redirect(redirectUrl);
  }
  // ...
});
```

### 3.8. Token Endpoint (`/auth/token`)

The Client uses the temporary `code` to exchange for the final Access Token.

```typescript
app.post('/auth/token', async (c) => {
  let code: string | undefined;
    
  try {
    const contentType = c.req.header('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      code = body.code;
    } else {
      const body = await c.req.parseBody();
      code = body['code'] as string;
    }
  } catch (e) {
    return c.json({ error: 'invalid_request' }, 400);
  }
  
  if (!code || !tempCodeMap.has(code)) {
    return c.json({ error: 'invalid_grant' }, 400);
  }

  const accessToken = tempCodeMap.get(code);
  tempCodeMap.delete(code); // One-time use

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
    scope: 'repo,user',
    expires_in: 28800
  });
});
```

## 4. Troubleshooting

1.  **CORS Error / 401 No Response**: Check if `Access-Control-Expose-Headers` includes `WWW-Authenticate`.
2.  **Client Registration Error**: Ensure `/auth/register` returns the `redirect_uris` field.
3.  **Token Request Error (500)**: Ensure `/auth/token` can correctly parse `application/x-www-form-urlencoded` request bodies, as some Clients (like Inspector) use form submission by default.
4.  **Fetch Failed**: Check server network connection and if a proxy configuration is needed.

## 5. References

*   [MCP Security: Authorization](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
*   [OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591)
