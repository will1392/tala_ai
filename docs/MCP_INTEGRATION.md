# 🔌 Tala AI MCP Integration

> Model Context Protocol (MCP) integration for Tala AI, enabling seamless interaction with Claude Desktop and other MCP clients.

## 🚀 Overview

Tala AI now includes a Model Context Protocol (MCP) server that exposes our travel assistant capabilities to external AI clients like Claude Desktop. This allows users to interact with Tala AI's knowledge base and services directly through their preferred AI interface.

## 🛠️ MCP Server Features

### Available Tools

1. **`search_travel_knowledge`**
   - Search Tala AI's travel knowledge base
   - Filter by category (visa, airline, destination, agency)
   - Returns relevant documents with relevance scores

2. **`get_travel_recommendations`**
   - Get AI-powered travel recommendations
   - Based on destination and travel preferences
   - Includes visa requirements, best travel times, and tips

3. **`check_document_status`**
   - Check processing status of uploaded documents
   - View extraction results and indexing status
   - Monitor document processing pipeline

## 📋 Setup Instructions

### 1. Build the MCP Server

```bash
# Build TypeScript files
npm run mcp:build

# Or build and start in development
npm run mcp:dev
```

### 2. Start the MCP Server

```bash
# Start the production server
npm run mcp:start

# The server will start on port 3001 by default
```

### 3. Configure Claude Desktop

Add the following to your Claude Desktop MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tala-ai": {
      "command": "node",
      "args": ["/path/to/tala-ui/dist/mcp/server.js"],
      "env": {
        "MCP_PORT": "3001"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

After adding the configuration, restart Claude Desktop to load the Tala AI MCP server.

## 🔧 Development

### Project Structure

```
src/mcp/
├── tala-mcp-server.ts    # Main MCP server implementation
├── server.ts             # Server entry point
└── types.ts              # TypeScript type definitions
```

### Environment Variables

```bash
# Optional: Custom MCP server port
MCP_PORT=3001

# Required for Phase 1: RAG functionality
VITE_QDRANT_URL=https://your-cluster.qdrant.io
VITE_QDRANT_API_KEY=your-qdrant-api-key
VITE_OPENAI_API_KEY=sk-your-openai-key
```

### Adding New Tools

To add a new MCP tool:

1. **Define the tool** in `src/mcp/tala-mcp-server.ts`:

```typescript
this.server.addTool({
  name: 'your_tool_name',
  description: 'Tool description',
  inputSchema: {
    type: 'object',
    properties: {
      // Define input parameters
    },
    required: ['required_param']
  }
}, async (params) => {
  // Tool implementation
  return { result: 'tool response' };
});
```

2. **Rebuild and restart** the server:

```bash
npm run mcp:build
npm run mcp:start
```

## 🌟 Usage Examples

### In Claude Desktop

Once configured, you can use Tala AI tools directly in Claude Desktop:

```
Search for Japan visa requirements
```

Claude will automatically use the `search_travel_knowledge` tool to query Tala AI's knowledge base.

```
Get travel recommendations for Tokyo for a 1-week business trip
```

Claude will use the `get_travel_recommendations` tool with the appropriate parameters.

### Direct API Usage

You can also interact with the MCP server directly:

```bash
# Check if the server is running
curl http://localhost:3001/health

# Get server information
curl http://localhost:3001/info
```

## 🔄 Integration with Phase 1 (RAG)

The MCP server is designed to integrate seamlessly with Phase 1 RAG implementation:

- **Document Search**: Will connect to the actual Qdrant vector database
- **Knowledge Retrieval**: Will use real embeddings and semantic search
- **Source Attribution**: Will provide actual document sources and relevance scores

### Current Implementation Status

- ✅ **MCP Server Framework**: Basic server structure and tools
- ✅ **Tool Definitions**: Search, recommendations, and document status tools
- ✅ **Claude Desktop Integration**: Configuration and setup instructions
- 🚧 **RAG Integration**: Will be connected in Phase 1
- 🚧 **Real Data**: Currently returns placeholder responses

## 🚀 Future Enhancements

### Phase 2: Advanced Chat Integration
- Stream responses through MCP
- Maintain conversation context
- Real-time document processing updates

### Phase 3: Video Processing
- Video content search through MCP
- Transcript extraction tools
- Timeline-based video queries

## 🐛 Troubleshooting

### Common Issues

1. **Server won't start**
   ```bash
   # Check if port is already in use
   lsof -i :3001
   
   # Try a different port
   MCP_PORT=3002 npm run mcp:start
   ```

2. **Claude Desktop doesn't see the server**
   - Verify the configuration file path
   - Check that the server is running
   - Restart Claude Desktop after configuration changes

3. **TypeScript build errors**
   ```bash
   # Clean and rebuild
   rm -rf dist/
   npm run mcp:build
   ```

### Logs and Debugging

The MCP server provides detailed logging:

```bash
# Start with verbose logging
DEBUG=mcp:* npm run mcp:start
```

## 📚 Resources

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Claude Desktop MCP Documentation](https://docs.anthropic.com/en/docs/build-with-claude/computer-use#model-context-protocol-mcp)
- [MCP Framework Documentation](https://github.com/microsoft/mcp-framework)

---

**Next Steps**: The MCP server is ready for integration with Phase 1 RAG implementation. Once the document processing and vector search are implemented, the MCP tools will provide real travel assistant capabilities to Claude Desktop and other MCP clients.