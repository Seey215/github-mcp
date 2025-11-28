import { createAdaptorServer } from '@hono/node-server';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GitHubMCPServer } from './server.js';
import type { GitHubConfig } from './types.js';

type NodeRequest = IncomingMessage;
type NodeResponse = ServerResponse;

interface SessionContext {
  server: GitHubMCPServer;
  transport: StreamableHTTPServerTransport;
  sessionId?: string;
}

export interface StreamableHttpOptions {
  /** HTTP port, defaults to `STREAMABLE_HTTP_PORT` / `PORT` / `3001` */
  port?: number;
  /** Optional host to bind to */
  hostname?: string;
  /** MCP path for the streamable transport, defaults to `/mcp` */
  path?: string;
  /** GitHub configuration that will be forwarded to every MCP session */
  config?: Partial<GitHubConfig>;
  /** Extra Node `ServerOptions` forwarded to the adapter */
  serverOptions?: Parameters<typeof createAdaptorServer>[0]['serverOptions'];
}

const responseAlreadySent = () => new Response(null, {
  headers: {
    'x-hono-already-sent': 'true'
  }
});

const requestToIncoming = new WeakMap<Request, NodeRequest>();
const requestToOutgoing = new WeakMap<Request, NodeResponse>();

const nodeRequestFrom = (req: Request | undefined): NodeRequest | undefined => req && requestToIncoming.get(req);
const nodeResponseFrom = (req: Request | undefined): NodeResponse | undefined => req && requestToOutgoing.get(req);

const sessionStore = new Map<string, SessionContext>();
const PORT_HEADER = 'mcp-session-id';

// Temporary storage for OAuth flow
const tempCodeMap = new Map<string, string>();

const createSessionContext = async (config?: Partial<GitHubConfig>): Promise<SessionContext> => {
  const server = new GitHubMCPServer(config);
  const context: SessionContext = { server, transport: null! };
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    eventStore: new InMemoryEventStore(),
    onsessioninitialized: (sessionId: string) => {
      context.sessionId = sessionId;
      if (sessionId) {
        sessionStore.set(sessionId, context);
      }
    },
    onsessionclosed: (sessionId: string) => {
      if (sessionId && sessionStore.get(sessionId) === context) {
        sessionStore.delete(sessionId);
      }
    }
  });

  transport.onclose = async () => {
    const sid = context.sessionId;
    if (sid && sessionStore.get(sid) === context) {
      sessionStore.delete(sid);
    }
    // Avoid infinite recursion: transport.close() calls onclose, which calls server.close(), which might close transport again
    // The SDK handles closing the transport when server closes, so we just need to ensure cleanup happens
    try {
      await context.server.close();
    } catch (e) {
      // Ignore errors during close if already closed
    }
  };

  context.transport = transport;
  await server.connect(transport);
  return context;
};

const streamableError = (message: string, code = 400) => ({
  jsonrpc: '2.0',
  error: {
    code,
    message
  },
  id: null
});
const handlePostRequest = async (ctx: Context, config?: Partial<GitHubConfig>) => {
  const nodeReq = nodeRequestFrom(ctx.req.raw);
  const nodeRes = nodeResponseFrom(ctx.req.raw);
  if (!nodeReq || !nodeRes) {
    return ctx.text('Missing raw request', 500);
  }

  // Check for Authorization header
  const authHeader = ctx.req.header('Authorization');
  let token = config?.token;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Allow unauthenticated connections for metadata operations (listTools, etc.)
  // Authorization is checked at tool execution time for tools that require it
  const sessionId = ctx.req.header(PORT_HEADER);

  try {
    if (sessionId && typeof sessionId === 'string') {
      if (!sessionStore.has(sessionId)) {
        return ctx.json(streamableError('Bad Request: No valid session ID provided', -32000), 400);
      }
      const context = sessionStore.get(sessionId)!;
      await context.transport.handleRequest(nodeReq, nodeRes);
      return responseAlreadySent();
    }

    const sessionConfig = { ...config };
    if (token) {
      sessionConfig.token = token;
    }

    const context = await createSessionContext(sessionConfig);
    await context.transport.handleRequest(nodeReq, nodeRes);
    return responseAlreadySent();
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!nodeRes.headersSent) {
      return ctx.json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      }, 500);
    }
    return responseAlreadySent();
  }
};

const handleReadRequest = async (ctx: Context) => {
  const nodeReq = nodeRequestFrom(ctx.req.raw);
  const nodeRes = nodeResponseFrom(ctx.req.raw);
  if (!nodeReq || !nodeRes) {
    return ctx.text('Missing raw request', 500);
  }

  try {
    const sessionId = nodeReq.headers[PORT_HEADER];
    if (!sessionId || typeof sessionId !== 'string' || !sessionStore.has(sessionId)) {
      return ctx.json(streamableError('Bad Request: No valid session ID provided', -32000), 400);
    }

    const context = sessionStore.get(sessionId)!;
    await context.transport.handleRequest(nodeReq, nodeRes);
    return responseAlreadySent();
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!nodeRes.headersSent) {
      return ctx.json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      }, 500);
    }
    return responseAlreadySent();
  }
};

const handleDeleteRequest = async (ctx: Context) => {
  const nodeReq = nodeRequestFrom(ctx.req.raw);
  const nodeRes = nodeResponseFrom(ctx.req.raw);
  if (!nodeReq || !nodeRes) {
    return ctx.text('Missing raw request', 500);
  }

  try {
    const sessionId = nodeReq.headers[PORT_HEADER];
    if (!sessionId || typeof sessionId !== 'string' || !sessionStore.has(sessionId)) {
      return ctx.json(streamableError('Bad Request: No valid session ID provided', -32000), 400);
    }

    const context = sessionStore.get(sessionId)!;
    await context.transport.handleRequest(nodeReq, nodeRes);
    return responseAlreadySent();
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!nodeRes.headersSent) {
      return ctx.json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      }, 500);
    }
    return responseAlreadySent();
  }
};

const attachNodeHandle = (request: Request, incoming: NodeRequest, outgoing: NodeResponse) => {
  requestToIncoming.set(request, incoming);
  requestToOutgoing.set(request, outgoing);
  const cleanup = () => {
    requestToIncoming.delete(request);
    requestToOutgoing.delete(request);
  };
  outgoing.once('finish', cleanup);
};

const createCors = () => cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version', 'Authorization', 'Access-Control-Request-Headers', 'Access-Control-Request-Method'],
  exposeHeaders: ['mcp-session-id', 'last-event-id', 'mcp-protocol-version', 'WWW-Authenticate']
});

export async function startStreamableHttpServer(options?: StreamableHttpOptions): Promise<ReturnType<typeof createAdaptorServer>> {
  const port = options?.port ?? (Number(process.env.STREAMABLE_HTTP_PORT) || Number(process.env.PORT) || 3001);
  const path = options?.path ?? '/mcp';
  const app = new Hono();
  app.use('*', createCors());

  const getAuthServerMetadata = () => {
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

  const getProtectedResourceMetadata = () => {
    const hostname = process.env.HOSTNAME || 'localhost';
    const baseUrl = `http://${hostname}:${port}`;
    return {
      resource: `${baseUrl}${path}`,
      authorization_servers: [baseUrl],
      scopes_supported: ["repo", "user"]
    };
  };

  app.get('/.well-known/oauth-protected-resource', (c) => c.json(getProtectedResourceMetadata()));
  app.get('/.well-known/oauth-authorization-server', (c) => c.json(getAuthServerMetadata()));

  app.post('/auth/register', async (c) => {
    const body = await c.req.json();
    const redirectUris = body.redirect_uris;
    
    return c.json({
      client_id: "mcp-inspector",
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: redirectUris || [],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"]
    });
  });

  app.get('/auth/authorize', (c) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return c.text('GITHUB_CLIENT_ID not configured', 500);
    
    const redirectUri = c.req.query('redirect_uri');
    const state = c.req.query('state');
    
    if (!redirectUri || !state) {
      return c.text('Missing redirect_uri or state', 400);
    }

    // Encode client state to pass through GitHub
    const serverState = Buffer.from(JSON.stringify({ redirectUri, state })).toString('base64');
    const serverRedirectUri = process.env.GITHUB_REDIRECT_URI || `http://${options?.hostname || 'localhost'}:${port}/auth/callback`;
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&redirect_uri=${encodeURIComponent(serverRedirectUri)}&state=${serverState}`;
    return c.redirect(authUrl);
  });

  app.get('/auth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    
    if (!code || !state) return c.text('Missing code or state', 400);

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) return c.text('OAuth not configured', 500);

    try {
      // Decode state to get client redirect URI
      let decodedState;
      try {
        decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch (e) {
        console.error('Failed to decode state:', state);
        return c.text('Invalid state parameter', 400);
      }
      
      const { redirectUri: clientRedirectUri, state: clientState } = decodedState;

      console.log('Exchanging code for token with GitHub...');
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'GitHub-MCP-Server'
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code
        })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('GitHub API error response:', response.status, text);
        return c.text(`GitHub API error: ${response.status} ${text}`, 500);
      }

      const data = await response.json() as any;
      if (data.error) {
        console.error('GitHub OAuth error:', data);
        return c.text(`OAuth error: ${data.error_description || data.error}`, 400);
      }

      const accessToken = data.access_token;
      if (accessToken) {
        // Generate a temporary code for the client to exchange
        const tempCode = randomUUID();
        tempCodeMap.set(tempCode, accessToken);
        
        // Expire temp code after 1 minute
        setTimeout(() => tempCodeMap.delete(tempCode), 60000);

        const redirectUrl = `${clientRedirectUri}?code=${tempCode}&state=${clientState}`;
        return c.redirect(redirectUrl);
      } else {
        return c.text('Failed to retrieve access token', 500);
      }
    } catch (error: any) {
      console.error('Auth callback error:', error);
      return c.text(`Error: ${error.message || error} ${error.cause ? `(Cause: ${error.cause})` : ''}`, 500);
    }
  });

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
      console.error('Error parsing token request body:', e);
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
      expires_in: 28800 // 8 hours (approx)
    });
  });

  app.post(path, async (ctx) => handlePostRequest(ctx, options?.config));
  app.get(path, async (ctx) => handleReadRequest(ctx));
  app.delete(path, async (ctx) => handleDeleteRequest(ctx));
  app.options(path, (ctx) => {
    ctx.status(204);
    return ctx.text('ok');
  });
  app.get('/', () => new Response('GitHub MCP', { status: 200 }));

  const server = createAdaptorServer({
    fetch: (request, nodeContext) => {
      const incoming = nodeContext.incoming as IncomingMessage;
      const outgoing = nodeContext.outgoing as ServerResponse;
      attachNodeHandle(request, incoming, outgoing);
      return app.fetch(request);
    },
    hostname: options?.hostname,
    serverOptions: options?.serverOptions
  });

  server.listen(port, options?.hostname, () => {
    console.error(`MCP Streamable HTTP server listening on port ${port}`);
  });

  const closeAllSessions = async () => {
    const contexts = Array.from(sessionStore.values());
    for (const context of contexts) {
      await context.transport.close();
      await context.server.close();
    }
    sessionStore.clear();
  };

  const shutdown = async () => {
    console.error('Shutting down Streamable HTTP server...');
    await closeAllSessions();
    server.close(() => console.error('Streamable HTTP server stopped.'));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}