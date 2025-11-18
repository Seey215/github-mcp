import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from 'zod';
import { GitHubConfig, GitHubAPIIssue, GitHubIssue } from './types.js';

/**
 * GitHub MCP Server class
 * Wraps all logic for GitHub API interaction and MCP tool registration
 */
export class GitHubMCPServer {
  private server: McpServer;
  private config: GitHubConfig;

  /**
   * Create GitHub MCP Server instance
   * @param config Optional configuration object, default values will be used if not provided
   */
  constructor(config?: Partial<GitHubConfig>) {
    this.config = {
      token: config?.token || process.env.GITHUB_ACCESS_TOKEN,
      apiBase: config?.apiBase || 'https://api.github.com',
      apiVersion: config?.apiVersion || '2022-11-28',
      serverName: config?.serverName || 'github-mcp-server',
      serverVersion: config?.serverVersion || '1.0.0',
    };

    // Initialize MCP server
    this.server = new McpServer({
      name: this.config.serverName,
      version: this.config.serverVersion,
    });

    // Register all tools
    this.registerTools();
  }

  /**
   * Execute GitHub API request
   * @param endpoint API endpoint path
   * @param options fetch request options
   * @returns JSON data from API response
   * @throws If token is not configured or API request fails
   */
  private async githubApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Check token only when actually making API requests
    if (!this.config.token) {
      throw new Error(
        'GitHub Access Token is required for API requests. ' +
        'Please set GITHUB_ACCESS_TOKEN environment variable or provide token in constructor.'
      );
    }

    const url = `${this.config.apiBase}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${this.config.token}`,
      'X-GitHub-Api-Version': this.config.apiVersion,
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

  /**
   * Register all MCP tools
   */
  private registerTools(): void {
    this.registerAddTool();
    this.registerListIssuesTool();
  }

  /**
   * Register addition tool (example tool)
   */
  private registerAddTool(): void {
    this.server.registerTool(
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
          content: [],
          structuredContent: output
        };
      }
    );
  }

  /**
   * Register list issues tool
   */
  private registerListIssuesTool(): void {
    this.server.registerTool(
      'list_issues',
      {
        title: 'List Issues',
        description: 'List issues in a GitHub repository',
        inputSchema: {
          owner: z.string(),
          repo: z.string(),
          state: z.enum(['open', 'closed']).default('open').optional()
        },
        outputSchema: {
          issues: z.array(z.object({
            number: z.number(),
            title: z.string(),
            body: z.string().nullable(),
            state: z.enum(['open', 'closed']).default('open').optional(),
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
          const data: GitHubAPIIssue[] = await this.githubApiRequest(endpoint);

          const issues: GitHubIssue[] = data.map((issue) => ({
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            state: issue.state as 'open' | 'closed',
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
  }

  /**
   * Connect to transport layer and start server
   * @param transport MCP transport layer instance
   */
  async connect(transport: Parameters<McpServer['connect']>[0]): Promise<void> {
    await this.server.connect(transport);
  }

  /**
   * Gracefully shutdown the MCP server instance
   */
  async close(): Promise<void> {
    await this.server.close();
  }
}

