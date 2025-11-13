#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
// Load environment variables
dotenv.config();
// GitHub OAuth token from environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
if (!GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN or GITHUB_ACCESS_TOKEN environment variable is required");
    process.exit(1);
}
// Initialize Octokit with OAuth token
const octokit = new Octokit({
    auth: GITHUB_TOKEN,
});
// Define available tools
const TOOLS = [
    {
        name: "list_issues",
        description: "List issues in a GitHub repository with optional filters",
        inputSchema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or organization)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                state: {
                    type: "string",
                    enum: ["open", "closed", "all"],
                    description: "Filter by issue state (default: open)",
                },
                labels: {
                    type: "string",
                    description: "Comma-separated list of label names to filter by",
                },
                per_page: {
                    type: "number",
                    description: "Number of results per page (max 100, default 30)",
                },
                page: {
                    type: "number",
                    description: "Page number for pagination (default 1)",
                },
            },
            required: ["owner", "repo"],
        },
    },
    {
        name: "get_issue",
        description: "Get details of a specific issue by its number",
        inputSchema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or organization)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                issue_number: {
                    type: "number",
                    description: "Issue number",
                },
            },
            required: ["owner", "repo", "issue_number"],
        },
    },
    {
        name: "create_issue",
        description: "Create a new issue in a GitHub repository",
        inputSchema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or organization)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                title: {
                    type: "string",
                    description: "Issue title",
                },
                body: {
                    type: "string",
                    description: "Issue body/description",
                },
                labels: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Array of label names to add to the issue",
                },
                assignees: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Array of usernames to assign to the issue",
                },
            },
            required: ["owner", "repo", "title"],
        },
    },
    {
        name: "update_issue",
        description: "Update an existing issue",
        inputSchema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or organization)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                issue_number: {
                    type: "number",
                    description: "Issue number",
                },
                title: {
                    type: "string",
                    description: "New issue title",
                },
                body: {
                    type: "string",
                    description: "New issue body/description",
                },
                state: {
                    type: "string",
                    enum: ["open", "closed"],
                    description: "New issue state",
                },
                labels: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Array of label names (replaces existing labels)",
                },
                assignees: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Array of usernames to assign (replaces existing assignees)",
                },
            },
            required: ["owner", "repo", "issue_number"],
        },
    },
    {
        name: "add_issue_comment",
        description: "Add a comment to an existing issue",
        inputSchema: {
            type: "object",
            properties: {
                owner: {
                    type: "string",
                    description: "Repository owner (username or organization)",
                },
                repo: {
                    type: "string",
                    description: "Repository name",
                },
                issue_number: {
                    type: "number",
                    description: "Issue number",
                },
                body: {
                    type: "string",
                    description: "Comment text",
                },
            },
            required: ["owner", "repo", "issue_number", "body"],
        },
    },
];
// Create MCP server
const server = new Server({
    name: "github-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS,
    };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "list_issues": {
                const { owner, repo, state = "open", labels, per_page = 30, page = 1 } = args;
                const response = await octokit.issues.listForRepo({
                    owner,
                    repo,
                    state,
                    labels,
                    per_page,
                    page,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "get_issue": {
                const { owner, repo, issue_number } = args;
                const response = await octokit.issues.get({
                    owner,
                    repo,
                    issue_number,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "create_issue": {
                const { owner, repo, title, body, labels, assignees } = args;
                const response = await octokit.issues.create({
                    owner,
                    repo,
                    title,
                    body,
                    labels,
                    assignees,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "update_issue": {
                const { owner, repo, issue_number, title, body, state, labels, assignees } = args;
                const response = await octokit.issues.update({
                    owner,
                    repo,
                    issue_number,
                    title,
                    body,
                    state,
                    labels,
                    assignees,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            case "add_issue_comment": {
                const { owner, repo, issue_number, body } = args;
                const response = await octokit.issues.createComment({
                    owner,
                    repo,
                    issue_number,
                    body,
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(response.data, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}\n${error.stack || ""}`,
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("GitHub MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map