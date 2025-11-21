#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { GitHubMCPServer } from './server.js';

dotenv.config();

const args = process.argv.slice(2);
const transportArg = (args[0] ?? process.env.MCP_TRANSPORT ?? 'stdio').toLowerCase();

const startStdio = async () => {
  const githubServer = new GitHubMCPServer();
  const transport = new StdioServerTransport();
  await githubServer.connect(transport);
  console.error("GitHub MCP Server started successfully (stdio)");
};

const startStreamable = async () => {
  const { startStreamableHttpServer } = await import('./streamableHttp.js');
  await startStreamableHttpServer();
  console.log("GitHub MCP Streamable HTTP server is listening");
};

async function main() {
  switch (transportArg) {
    case 'http':
    case 'streamablehttp':
    case 'streamable':
      await startStreamable();
      break;
    case 'stdio':
      await startStdio();
      break;
    default:
      console.error(`Unknown transport '${transportArg}'. Use 'stdio' or 'http'.`);
      process.exit(1);
  }
}

await main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { GitHubMCPServer };