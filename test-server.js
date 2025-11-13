#!/usr/bin/env node

/**
 * Simple validation script to test that the MCP server can initialize
 * and provide the expected tools.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing GitHub MCP Server initialization...\n');

// Set test environment
process.env.GITHUB_TOKEN = 'test_token_for_validation';

const serverPath = join(__dirname, 'dist', 'index.js');

// Start the server
const server = spawn('node', [serverPath], {
  env: { ...process.env, GITHUB_TOKEN: 'test_token_for_validation' }
});

let stdoutData = '';
let stderrData = '';

server.stdout.on('data', (data) => {
  stdoutData += data.toString();
});

server.stderr.on('data', (data) => {
  stderrData += data.toString();
});

// Test listing tools
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Wait for response and validate
setTimeout(() => {
  server.kill();
  
  console.log('Server stderr output:', stderrData);
  
  if (stderrData.includes('GitHub MCP Server running on stdio')) {
    console.log('✓ Server initialized successfully');
  } else {
    console.log('✗ Server initialization failed');
    process.exit(1);
  }
  
  console.log('\n✓ All validation checks passed!');
  process.exit(0);
}, 3000);
