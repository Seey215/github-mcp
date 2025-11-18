/**
 * GitHub MCP Server 配置接口
 */
export interface GitHubConfig {
  /** GitHub Personal Access Token (可选，如果未提供则从环境变量读取) */
  token?: string;
  /** GitHub API 基础 URL */
  apiBase: string;
  /** GitHub API 版本 */
  apiVersion: string;
  /** MCP 服务器名称 */
  serverName: string;
  /** MCP 服务器版本 */
  serverVersion: string;
}

/**
 * GitHub Issue 数据结构
 */
export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  user: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * GitHub API 响应的原始 Issue 数据
 */
export interface GitHubAPIIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  user?: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

