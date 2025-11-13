# Usage Examples for GitHub MCP Server

This document provides practical examples of using the GitHub MCP Server.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your GitHub token:
```bash
cp .env.example .env
# Edit .env and add your GitHub token
```

3. Build the server:
```bash
npm run build
```

## Running the Server

Start the server:
```bash
npm start
```

The server will run on stdio and wait for MCP protocol messages.

## Example Tool Calls

### 1. List Open Issues

Request to list open issues in a repository:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_issues",
    "arguments": {
      "owner": "octocat",
      "repo": "Hello-World",
      "state": "open",
      "per_page": 10
    }
  }
}
```

### 2. Get a Specific Issue

Request to get details of issue #1:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_issue",
    "arguments": {
      "owner": "octocat",
      "repo": "Hello-World",
      "issue_number": 1
    }
  }
}
```

### 3. Create a New Issue

Request to create a new issue:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_issue",
    "arguments": {
      "owner": "myusername",
      "repo": "my-repo",
      "title": "Bug: Application crashes on startup",
      "body": "## Description\n\nThe application crashes when...\n\n## Steps to Reproduce\n\n1. Open app\n2. Click button\n3. See error",
      "labels": ["bug", "high-priority"],
      "assignees": ["myusername"]
    }
  }
}
```

### 4. Update an Issue

Request to update issue #5:

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "update_issue",
    "arguments": {
      "owner": "myusername",
      "repo": "my-repo",
      "issue_number": 5,
      "state": "closed",
      "body": "Issue has been resolved in commit abc123"
    }
  }
}
```

### 5. Add a Comment to an Issue

Request to add a comment to issue #5:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "add_issue_comment",
    "arguments": {
      "owner": "myusername",
      "repo": "my-repo",
      "issue_number": 5,
      "body": "Thank you for reporting this issue! We've fixed it."
    }
  }
}
```

## Integration with Claude Desktop

Add this server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "/absolute/path/to/github-mcp/dist/index.js"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

After restarting Claude Desktop, you can ask questions like:
- "List the open issues in octocat/Hello-World"
- "Create a bug report in my repository"
- "Show me issue #5 from my project"

## Integration with Other MCP Clients

The server follows the Model Context Protocol specification and can be integrated with any compatible client. Refer to the [MCP specification](https://modelcontextprotocol.io/) for details on implementing custom clients.

## Testing

Run the basic validation test:
```bash
node test-server.js
```

Run the comprehensive test:
```bash
node test-comprehensive.js
```

## Troubleshooting

### Error: GITHUB_TOKEN environment variable is required

Make sure you've set up your `.env` file with a valid GitHub token:
```bash
GITHUB_TOKEN=ghp_your_token_here
```

### Authentication Failed

Verify that your GitHub token has the necessary permissions:
- For public repositories: `public_repo` scope
- For private repositories: `repo` scope

### Rate Limiting

GitHub API has rate limits. Authenticated requests have a limit of 5,000 requests per hour. You can check your rate limit status using the GitHub API.

## Next Steps

- Explore more GitHub API endpoints to add additional tools
- Implement error handling for specific GitHub API errors
- Add support for GitHub Apps authentication
- Implement caching for frequently accessed data
