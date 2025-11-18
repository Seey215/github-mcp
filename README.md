<div align="center">

![GitHub MCP Server](./logo.svg)

<h1>🚀 Let AI Control Your GitHub</h1>

<p>
  <strong>A powerful GitHub automation tool that seamlessly connects AI assistants to your GitHub repositories</strong>
</p>

<p>
  <a href="https://github.com/Seey215/github-mcp/stargazers"><img src="https://img.shields.io/github/stars/Seey215/github-mcp?style=social" alt="GitHub stars"></a>
  <a href="https://github.com/Seey215/github-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://www.npmjs.com/package/github-mcp"><img src="https://img.shields.io/npm/v/github-mcp.svg" alt="npm version"></a>
  <a href="https://github.com/Seey215/github-mcp/issues"><img src="https://img.shields.io/github/issues/Seey215/github-mcp.svg" alt="GitHub issues"></a>
</p>

</div>

---

## 💡 Why GitHub MCP?

Have you ever faced these challenges?

- ❌ **Repetitive Work**: Manually checking, creating, and updating Issues and Pull Requests every day
- ❌ **Low Efficiency**: Constantly switching between command line and browser
- ❌ **Collaboration Difficulties**: Team members need a unified way to operate GitHub

**GitHub MCP solves all of this!**

✅ Let Claude, ChatGPT and other AI assistants **directly operate** GitHub  
✅ No need to leave the conversation interface, **complete tasks with one sentence**  
✅ Based on Model Context Protocol, **secure and reliable**  
✅ Fully open source, **easily extensible** with new features

---

## ⚡️ Quick Start (3 Steps)

### Step 1: Install

```bash
npm install github-mcp
```

Or install globally:

```bash
npm install -g github-mcp
```

### Step 2: Get GitHub Token

1. Visit [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Check `repo` permission (for accessing repository information)
4. Copy the generated Token

### Step 3: Start the Server

```bash
# Set environment variable
export GITHUB_ACCESS_TOKEN="your_github_token_here"

# Start the server
npx github-mcp
```

🎉 **Done!** Now your AI assistant can operate GitHub!

> **Tip**: You can start the server even without a Token, authentication is only required when calling GitHub APIs.

---

## 🎯 Use Cases

### Scenario 1: Quickly View Issue List

**Traditional Way**:
1. Open browser
2. Log in to GitHub
3. Find the repository
4. Click Issues tab
5. Manually filter and view

**With GitHub MCP**:
```
You: Help me check what unresolved Issues are in Seey215/github-mcp repository
AI:  Querying... Found 3 unresolved Issues:
     1. #12 - Add Pull Request management feature
     2. #10 - Support GitHub Actions trigger
     3. #8 - Optimize error messages
```

### Scenario 2: Batch Process Issues

```
You: Mark all Issues with "bug" in the title as high priority
AI:  Added high priority label to 5 Issues
```

### Scenario 3: Automated Workflows

```
You: Summarize new Issues from yesterday every morning at 9 AM
AI:  Scheduled task created, will send daily report via email
```

---

## 🛠️ Core Features

### ✅ Currently Available

| Feature | Description | Status |
|---------|-------------|--------|
| 🔍 **List Issues** | Query Issues list for any repository | ✅ Available |
| 📊 **Issue Details** | Get complete information for a single Issue | ✅ Available |
| 🔐 **Secure Authentication** | Safe access based on GitHub Token | ✅ Available |
| ⚙️ **Flexible Configuration** | Support environment variables and code configuration | ✅ Available |
| 🎨 **Object-Oriented Design** | Clear class structure, easy to extend | ✅ Available |

### 🚧 Coming Soon

| Feature | Description | Estimated Time |
|---------|-------------|----------------|
| ✏️ **Create Issue** | Quickly create Issues through AI | Q1 2026 |
| 🏷️ **Label Management** | Add, delete, modify Issue labels | Q1 2026 |
| 💬 **Comment Feature** | Comment on Issues and PRs | Q1 2026 |
| 🔀 **Pull Request** | Complete PR management functionality | Q2 2026 |
| 🤖 **GitHub Actions** | Trigger and monitor workflows | Q2 2026 |
| 📈 **Data Analytics** | Issue trends and statistical analysis | Q2 2026 |

---

## 📚 Detailed Usage Guide

### Running as MCP Server (Recommended)

This is the most common usage, suitable for integration with AI tools like Claude Desktop, Continue, etc.

**Configure Claude Desktop**:

Edit the configuration file `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "github-mcp"],
      "env": {
        "GITHUB_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

Restart Claude Desktop, and you can use GitHub features in conversations!

### Using as Node.js Library

If you want to use it in your own project:

```typescript
import { GitHubMCPServer } from 'github-mcp';
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create server instance
const server = new GitHubMCPServer({
  token: 'your_github_token',
  serverName: 'my-custom-server',
  serverVersion: '1.0.0'
});

// Connect transport layer
const transport = new StdioServerTransport();
await server.connect(transport);

console.log('GitHub MCP Server started!');
```

### Configuration Options

`GitHubMCPServer` supports the following configuration:

```typescript
interface GitHubConfig {
  token?: string;           // GitHub Personal Access Token
  apiBase?: string;         // API base URL (default: https://api.github.com)
  apiVersion?: string;      // API version (default: 2022-11-28)
  serverName?: string;      // Server name (default: github-mcp-server)
  serverVersion?: string;   // Server version (default: 1.0.0)
}
```

**Configuration Priority**: Constructor parameters > Environment variables > Default values

---

## 🔧 API Reference

### Tool: list_issues

List Issues in a specified repository

**Input Parameters**:
```typescript
{
  owner: string;    // Repository owner, e.g., "Seey215"
  repo: string;     // Repository name, e.g., "github-mcp"
  state?: 'open' | 'closed';  // Issue state (optional, default 'open')
}
```

**Return Data**:
```typescript
{
  issues: Array<{
    number: number;        // Issue number
    title: string;         // Title
    body: string | null;   // Description content
    state: 'open' | 'closed';
    user: string;          // Creator
    created_at: string;    // Creation time
    updated_at: string;    // Update time
    html_url: string;      // GitHub page link
  }>
}
```

**Usage Example**:
```typescript
// In AI conversation
"Help me check all Issues in Seey215/github-mcp repository"

// Underlying call
await server.callTool('list_issues', {
  owner: 'Seey215',
  repo: 'github-mcp'
});
```

---

## 🏗️ Architecture Design

### Object-Oriented Architecture

```
┌─────────────────────────────────────┐
│   GitHubMCPServer (Core Class)      │
├─────────────────────────────────────┤
│ - config: GitHubConfig              │
│ - server: McpServer                 │
├─────────────────────────────────────┤
│ + constructor(config?)              │
│ + connect(transport)                │
│ - registerTools()                   │
│ - githubApiRequest(endpoint)        │
└─────────────────────────────────────┘
         │
         │ uses
         ▼
┌─────────────────────────────────────┐
│   MCP SDK (Communication Protocol)  │
│   - StdioServerTransport            │
│   - Tool Registration & Invocation  │
└─────────────────────────────────────┘
         │
         │ calls
         ▼
┌─────────────────────────────────────┐
│   GitHub REST API                   │
│   - Issues                          │
│   - Pull Requests (coming soon)     │
│   - Actions (planned)               │
└─────────────────────────────────────┘
```

### Design Principles

- **Single Responsibility**: `GitHubMCPServer` focuses on GitHub API integration
- **Encapsulation**: Private methods hide implementation details
- **Configurability**: Flexible constructor supports multiple configuration methods
- **Extensibility**: Clear structure makes it easy to add new tools
- **Lazy Validation**: Token is only validated when using API, improving user experience

---

## 🤝 Contributing

We warmly welcome community contributions! Whether it's:

- 🐛 **Report Bugs**: Found an issue? Submit an [Issue](https://github.com/Seey215/github-mcp/issues)
- 💡 **Suggest Features**: Have a great idea? Tell us!
- 🔨 **Submit Code**: Fork the project, submit a Pull Request
- 📖 **Improve Documentation**: Help improve docs and examples

### Development Environment Setup

```bash
# 1. Fork and clone repository
git clone https://github.com/your-username/github-mcp.git
cd github-mcp

# 2. Install dependencies
npm install

# 3. Build project
npm run build

# 4. Start development mode (auto-recompile)
npm run watch

# 5. Run tests
npx tsx demo.ts
```

### Project Structure

```
github-mcp/
├── src/
│   ├── types.ts              # TypeScript type definitions
│   ├── server.ts             # GitHubMCPServer main class
│   └── index.ts              # Entry file
├── dist/                     # Compiled output directory
├── demo.ts                   # Example and test file
├── package.json              # Project configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project documentation
```

### Adding New Tools

1. Add a new private method in `src/server.ts`
2. Register the tool in `registerTools()`
3. Update README documentation
4. Submit a Pull Request

Example code:

```typescript
private registerCreateIssueTool(): void {
  this.server.registerTool(
    'create_issue',
    {
      title: 'Create Issue',
      description: 'Create a new issue in a GitHub repository',
      inputSchema: {
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        body: z.string().optional()
      },
      outputSchema: {
        issue: z.object({
          number: z.number(),
          html_url: z.string()
        })
      }
    },
    async ({ owner, repo, title, body }) => {
      const endpoint = `/repos/${owner}/${repo}/issues`;
      const data = await this.githubApiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ title, body })
      });
      
      return {
        content: [],
        structuredContent: { issue: data }
      };
    }
  );
}
```

---

## ❓ FAQ

### Q: Why not validate Token at startup?

**A**: For better user experience! Even without a Token, you can:
- View all available tools
- Understand each tool's functionality
- Use them when Token is ready

### Q: Is the Token secure?

**A**: Yes! The Token is only stored in local environment variables and is never uploaded or shared. Recommendations:
- Use Fine-grained tokens to limit permission scope
- Rotate Token regularly
- Never hardcode Token in public code

### Q: Does it support GitHub Enterprise?

**A**: Yes! Just configure a custom API address:

```typescript
const server = new GitHubMCPServer({
  apiBase: 'https://github.your-company.com/api/v3',
  token: 'your_token'
});
```

### Q: How to debug?

**A**: Use the demo file for testing:

```bash
# Set Token
export GITHUB_ACCESS_TOKEN="your_token"

# Run test
npx tsx demo.ts
```

### Q: What about API rate limiting?

**A**: GitHub API has rate limits:
- Unauthenticated: 60 requests/hour
- Authenticated: 5000 requests/hour

Recommended to use Token for higher quota.

---

## 📊 Roadmap

### v0.1.0 - Current Version ✅
- [x] Basic MCP server framework
- [x] GitHub Issues list query
- [x] Object-oriented architecture design
- [x] TypeScript type support

### v0.2.0 - Next Version 🚧
- [ ] Create and update Issues
- [ ] Issue comment functionality
- [ ] Label management
- [ ] Search functionality optimization

### v0.3.0 - Future Plans 📋
- [ ] Full Pull Request support
- [ ] GitHub Actions integration
- [ ] Webhook support
- [ ] Batch operation functionality

### v1.0.0 - Long-term Goals 🎯
- [ ] Complete GitHub API coverage
- [ ] Graphical management interface
- [ ] Plugin system
- [ ] Multi-account management

**Want to participate in development?** Check [Issues](https://github.com/Seey215/github-mcp/issues) for pending tasks!

---

## 🌟 Acknowledgments

Thanks to the following projects and communities:

- [Model Context Protocol](https://modelcontextprotocol.io/) - Powerful AI integration protocol
- [GitHub REST API](https://docs.github.com/rest) - Comprehensive API documentation
- [Anthropic Claude](https://www.anthropic.com/) - Excellent AI assistant
- All contributors and users ❤️

---

## 📞 Contact

- **GitHub**: [@Seey215](https://github.com/Seey215)
- **Issues**: [Submit Issues](https://github.com/Seey215/github-mcp/issues)
- **Discussions**: [Join Discussion](https://github.com/Seey215/github-mcp/issues)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2025 Seey215

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

<div align="center">

**If this project helps you, please give it a ⭐️ Star!**

Made with ❤️ by [Seey215](https://github.com/Seey215)

</div>
