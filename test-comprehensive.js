#!/usr/bin/env node

/**
 * Comprehensive test to verify all MCP tools are properly registered
 * and the server responds to tool listing requests.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== GitHub MCP Server Comprehensive Test ===\n');

// Set test environment
const serverPath = join(__dirname, 'dist', 'index.js');

// Start the server
const server = spawn('node', [serverPath], {
  env: { ...process.env, GITHUB_TOKEN: 'test_token_for_validation' }
});

let stdoutData = '';
let stderrData = '';
let responseReceived = false;

server.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutData += text;
  
  // Try to parse JSON responses
  const lines = text.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      if (response.result && response.result.tools) {
        console.log('✓ Received tools list from server\n');
        console.log('Available tools:');
        response.result.tools.forEach((tool, index) => {
          console.log(`  ${index + 1}. ${tool.name}`);
          console.log(`     Description: ${tool.description}`);
        });
        
        // Validate expected tools
        const toolNames = response.result.tools.map(t => t.name);
        const expectedTools = [
          'list_issues',
          'get_issue',
          'create_issue',
          'update_issue',
          'add_issue_comment'
        ];
        
        console.log('\nValidating tools:');
        let allPresent = true;
        for (const expected of expectedTools) {
          if (toolNames.includes(expected)) {
            console.log(`  ✓ ${expected}`);
          } else {
            console.log(`  ✗ ${expected} (missing)`);
            allPresent = false;
          }
        }
        
        if (allPresent) {
          console.log('\n✓ All expected tools are present!');
        } else {
          console.log('\n✗ Some tools are missing!');
          process.exit(1);
        }
        
        responseReceived = true;
        setTimeout(() => {
          server.kill();
          process.exit(0);
        }, 500);
      }
    } catch (e) {
      // Not JSON or different format, continue
    }
  }
});

server.stderr.on('data', (data) => {
  stderrData += data.toString();
});

server.on('close', (code) => {
  if (!responseReceived) {
    console.log('Server stderr:', stderrData);
    console.log('\n✗ Did not receive valid response from server');
    process.exit(1);
  }
});

// Wait for server to initialize
setTimeout(() => {
  console.log('Server initialized, requesting tools list...\n');
  
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 1000);

// Timeout if no response
setTimeout(() => {
  if (!responseReceived) {
    console.log('\n✗ Timeout waiting for server response');
    server.kill();
    process.exit(1);
  }
}, 5000);
