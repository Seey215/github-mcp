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
    await context.server.close();
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

  try {
    const sessionId = nodeReq.headers[PORT_HEADER];

    if (sessionId && typeof sessionId === 'string') {
      if (!sessionStore.has(sessionId)) {
        return ctx.json(streamableError('Bad Request: No valid session ID provided', -32000), 400);
      }
      const context = sessionStore.get(sessionId)!;
      await context.transport.handleRequest(nodeReq, nodeRes);
      return responseAlreadySent();
    }

    const context = await createSessionContext(config);
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
  allowHeaders: ['Content-Type', 'Mcp-Session-Id', 'Last-Event-Id', 'Mcp-Protocol-Version'],
  exposeHeaders: ['mcp-session-id', 'last-event-id', 'mcp-protocol-version']
});

export async function startStreamableHttpServer(options?: StreamableHttpOptions): Promise<ReturnType<typeof createAdaptorServer>> {
  const port = options?.port ?? (Number(process.env.STREAMABLE_HTTP_PORT) || Number(process.env.PORT) || 3001);
  const path = options?.path ?? '/mcp';
  const app = new Hono();
  app.use('*', createCors());
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