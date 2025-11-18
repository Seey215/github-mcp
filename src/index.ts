#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { GitHubMCPServer } from './server.js';

dotenv.config();

async function main() {
  const githubServer = new GitHubMCPServer();

  const transport = new StdioServerTransport();
  await githubServer.connect(transport);

  console.log("GitHub MCP Server started successfully");
}

await main().catch(console.error);

export { GitHubMCPServer };