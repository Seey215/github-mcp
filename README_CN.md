# GitHub MCP Server - 中文说明

这是一个完整的 GitHub MCP Server 实现，支持 OAuth 认证和 Issue 管理功能。

## 功能特性

✅ **OAuth 认证**: 支持使用 GitHub Personal Access Token 进行认证  
✅ **Issue 管理**: 提供完整的 Issue CRUD 操作  
✅ **MCP 协议**: 遵循 Model Context Protocol 标准  
✅ **TypeScript**: 完整的类型支持和类型安全  

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 GitHub Token

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的 GitHub Token：

```env
GITHUB_TOKEN=ghp_你的token
```

### 获取 GitHub Token

1. 访问 [GitHub 设置 → 开发者设置 → Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 选择权限范围：
   - `repo` - 访问私有仓库
   - `public_repo` - 仅访问公开仓库
4. 生成并复制 token 到 `.env` 文件

### 3. 构建项目

```bash
npm run build
```

### 4. 运行服务器

```bash
npm start
```

## 可用的工具

服务器提供了 5 个 Issue 管理工具：

### 1. list_issues - 列出 Issues
列出仓库中的 issues，支持过滤和分页。

**参数：**
- `owner` (必需): 仓库所有者
- `repo` (必需): 仓库名称
- `state` (可选): 状态过滤 - "open"、"closed" 或 "all"
- `labels` (可选): 标签过滤，用逗号分隔
- `per_page` (可选): 每页数量，默认 30
- `page` (可选): 页码，默认 1

### 2. get_issue - 获取 Issue 详情
通过 issue 编号获取详细信息。

**参数：**
- `owner` (必需): 仓库所有者
- `repo` (必需): 仓库名称
- `issue_number` (必需): Issue 编号

### 3. create_issue - 创建 Issue
在仓库中创建新的 issue。

**参数：**
- `owner` (必需): 仓库所有者
- `repo` (必需): 仓库名称
- `title` (必需): Issue 标题
- `body` (可选): Issue 内容
- `labels` (可选): 标签数组
- `assignees` (可选): 分配给的用户数组

### 4. update_issue - 更新 Issue
更新现有的 issue。

**参数：**
- `owner` (必需): 仓库所有者
- `repo` (必需): 仓库名称
- `issue_number` (必需): Issue 编号
- `title` (可选): 新标题
- `body` (可选): 新内容
- `state` (可选): 新状态 - "open" 或 "closed"
- `labels` (可选): 标签数组（替换现有标签）
- `assignees` (可选): 用户数组（替换现有分配）

### 5. add_issue_comment - 添加评论
给 issue 添加评论。

**参数：**
- `owner` (必需): 仓库所有者
- `repo` (必需): 仓库名称
- `issue_number` (必需): Issue 编号
- `body` (必需): 评论内容

## 集成到 Claude Desktop

在 Claude Desktop 配置文件中添加此服务器：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "/完整路径/github-mcp/dist/index.js"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_你的token"
      }
    }
  }
}
```

重启 Claude Desktop 后，你可以这样提问：
- "列出 octocat/Hello-World 仓库中的开放 issues"
- "在我的仓库中创建一个 bug 报告"
- "显示我项目中的第 5 号 issue"

## 测试

运行基础验证测试：
```bash
node test-server.js
```

运行完整测试：
```bash
node test-comprehensive.js
```

## 项目结构

```
github-mcp/
├── src/
│   └── index.ts        # 主服务器实现
├── dist/               # 编译后的 JavaScript
├── package.json        # 项目依赖和脚本
├── tsconfig.json       # TypeScript 配置
├── .env.example        # 环境变量示例
├── README.md          # 英文文档
├── README_CN.md       # 中文文档（本文件）
└── USAGE.md           # 使用示例
```

## 技术栈

- **MCP SDK**: @modelcontextprotocol/sdk - Model Context Protocol 官方 SDK
- **Octokit**: @octokit/rest - GitHub API 官方客户端
- **TypeScript**: 类型安全的 JavaScript
- **Node.js**: >= 18.0.0

## 安全建议

- ⚠️ 不要提交 `.env` 文件到版本控制
- 🔑 使用最小权限的 token
- 🔄 定期轮换 access token
- 🏢 生产环境考虑使用 GitHub Apps

## 常见问题

### 错误：需要 GITHUB_TOKEN 环境变量

确保你已经设置了 `.env` 文件：
```bash
GITHUB_TOKEN=ghp_你的token
```

### 认证失败

验证你的 GitHub token 权限：
- 公开仓库：需要 `public_repo` 权限
- 私有仓库：需要 `repo` 权限

### API 限流

GitHub API 有速率限制。认证请求每小时限制 5,000 次。

## 后续扩展

可以考虑添加更多功能：
- Pull Request 管理工具
- Repository 搜索工具
- Workflow 管理工具
- Webhook 支持
- GitHub Apps 认证

## 许可证

MIT License

## 贡献

欢迎提交 Pull Request 和 Issue！
