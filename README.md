# GitHub MCP Server

A Model Context Protocol (MCP) server that provides GitHub API access with OAuth authentication support. This server enables AI assistants to interact with GitHub Issues through a standardized interface.

## Features

- 🔐 **OAuth Authentication**: Secure access using GitHub Personal Access Tokens
- 📝 **Issue Management**: Complete CRUD operations for GitHub Issues
- 🛠️ **MCP Protocol**: Built on the Model Context Protocol standard
- 🚀 **TypeScript**: Fully typed for better development experience

## Prerequisites

- Node.js >= 18.0.0
- A GitHub Personal Access Token with appropriate permissions

## Installation

```bash
npm install
npm run build
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your GitHub Personal Access Token:
```env
GITHUB_TOKEN=your_github_personal_access_token_here
```

### Getting a GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `repo` (for full repository access, including private repos)
   - Or `public_repo` (for public repositories only)
4. Generate and copy the token to your `.env` file

## Usage

### Running the Server

```bash
npm start
```

Or in development mode with auto-rebuild:

```bash
npm run dev
```

### Available Tools

The server provides the following tools for GitHub Issue management:

#### 1. `list_issues`
List issues in a GitHub repository with optional filters.

**Parameters:**
- `owner` (required): Repository owner (username or organization)
- `repo` (required): Repository name
- `state` (optional): Filter by state - "open", "closed", or "all" (default: "open")
- `labels` (optional): Comma-separated list of label names
- `per_page` (optional): Number of results per page (max 100, default 30)
- `page` (optional): Page number for pagination (default 1)

**Example:**
```json
{
  "owner": "octocat",
  "repo": "Hello-World",
  "state": "open",
  "per_page": 10
}
```

#### 2. `get_issue`
Get details of a specific issue by its number.

**Parameters:**
- `owner` (required): Repository owner
- `repo` (required): Repository name
- `issue_number` (required): Issue number

**Example:**
```json
{
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 1
}
```

#### 3. `create_issue`
Create a new issue in a GitHub repository.

**Parameters:**
- `owner` (required): Repository owner
- `repo` (required): Repository name
- `title` (required): Issue title
- `body` (optional): Issue body/description
- `labels` (optional): Array of label names
- `assignees` (optional): Array of usernames to assign

**Example:**
```json
{
  "owner": "octocat",
  "repo": "Hello-World",
  "title": "Bug: Application crashes on startup",
  "body": "Detailed description of the bug...",
  "labels": ["bug", "high-priority"],
  "assignees": ["octocat"]
}
```

#### 4. `update_issue`
Update an existing issue.

**Parameters:**
- `owner` (required): Repository owner
- `repo` (required): Repository name
- `issue_number` (required): Issue number
- `title` (optional): New issue title
- `body` (optional): New issue body
- `state` (optional): New state - "open" or "closed"
- `labels` (optional): Array of label names (replaces existing)
- `assignees` (optional): Array of usernames (replaces existing)

**Example:**
```json
{
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 1,
  "state": "closed",
  "body": "Updated description"
}
```

#### 5. `add_issue_comment`
Add a comment to an existing issue.

**Parameters:**
- `owner` (required): Repository owner
- `repo` (required): Repository name
- `issue_number` (required): Issue number
- `body` (required): Comment text

**Example:**
```json
{
  "owner": "octocat",
  "repo": "Hello-World",
  "issue_number": 1,
  "body": "This issue has been resolved!"
}
```

## Integration with MCP Clients

This server can be integrated with any MCP-compatible client. Add it to your client's configuration:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/path/to/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Development

### Project Structure

```
github-mcp/
├── src/
│   └── index.ts        # Main server implementation
├── dist/               # Compiled JavaScript (generated)
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── .env.example        # Example environment variables
└── README.md          # This file
```

### Building

```bash
npm run build
```

### Watch Mode

For development with automatic rebuilding:

```bash
npm run watch
```

## Security Considerations

- **Never commit your `.env` file** - it contains sensitive credentials
- Use tokens with minimal required permissions
- Regularly rotate your access tokens
- Consider using GitHub Apps for production deployments

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.