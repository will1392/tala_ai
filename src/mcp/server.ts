#!/usr/bin/env node

/**
 * Tala AI MCP Server Entry Point
 * 
 * This script starts the Tala AI MCP server, making travel assistant
 * capabilities available through the Model Context Protocol.
 * 
 * Usage:
 *   npm run mcp:start
 *   or
 *   node src/mcp/server.js
 */

import { TalaMCPServer } from './tala-mcp-server.js';

const config = {
  name: 'tala-ai',
  version: '1.0.0',
  description: 'AI-powered travel assistant with document search, visa information, and travel recommendations'
};

const server = new TalaMCPServer(config);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down Tala AI MCP Server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down Tala AI MCP Server...');
  await server.stop();
  process.exit(0);
});

// Start the server
async function main() {
  try {
    console.log('🌟 Starting Tala AI MCP Server...');
    console.log('📋 Server Info:', server.getServerInfo());
    
    const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3001;
    await server.start(port);
    
    console.log('✅ Tala AI MCP Server is ready!');
    console.log('🔗 Connect this server to Claude Desktop or other MCP clients');
    console.log(`📡 Server URL: http://localhost:${port}`);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}