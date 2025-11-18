#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';
import dotenv from "dotenv";

dotenv.config();

const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
if (!GITHUB_ACCESS_TOKEN) {
  console.error("Error: GITHUB_ACCESS_TOKEN environment variable is required");
  process.exit(1);
}

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

async function githubApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${GITHUB_API_BASE}${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${GITHUB_ACCESS_TOKEN}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
    );
  }

  return response.json();
}

const server = new McpServer({ name: 'demo-server', version: '1.0.0' });

server.registerTool(
  'add',
  {
    title: 'Addition Tool',
    description: 'Add two numbers',
    inputSchema: { a: z.number(), b: z.number() },
    outputSchema: { result: z.number() }
  },
  async ({ a, b }) => {
    const output = { result: a + b };
    return {
      content: [], // If the Tool does not define an outputSchema, this field MUST be present in the result. For backwards compatibility, this field is always present, but it may be empty.
      structuredContent: output
    };
  }
);

server.registerTool(
  'list_issues',
  {
    title: 'List Issues',
    description: 'List issues in a GitHub repository',
    inputSchema: { owner: z.string(), repo: z.string() },
    outputSchema: {
      issues: z.array(z.object({
        number: z.number(),
        title: z.string(),
        body: z.string().nullable(),
        state: z.string(),
        user: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        html_url: z.string()
      }))
    }
  },
  async ({ owner, repo }) => {
    try {
      // API Document: https://docs.github.com/en/rest/issues/issues#list-repository-issues
      const endpoint = `/repos/${owner}/${repo}/issues?state=all&per_page=100`;
      const data = await githubApiRequest(endpoint) as any[];

      const issues = data.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state,
        user: issue.user?.login || 'unknown',
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url
      }));

      return {
        content: [],
        structuredContent: { issues }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch issues: ${errorMessage}`);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("GitHub MCP started successfully");
}

await main().catch(console.error);

export { server };