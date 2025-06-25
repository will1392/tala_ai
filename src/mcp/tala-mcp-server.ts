import { MCPServer } from 'mcp-framework';

/**
 * Tala AI MCP Server
 * 
 * This server exposes Tala AI's travel assistant capabilities through the
 * Model Context Protocol, allowing integration with Claude Desktop and other MCP clients.
 */

interface TalaMCPServerConfig {
  name: string;
  version: string;
  description: string;
}

class TalaMCPServer {
  private server: MCPServer;
  private config: TalaMCPServerConfig;

  constructor(config: TalaMCPServerConfig) {
    this.config = config;
    this.server = new MCPServer({
      name: config.name,
      version: config.version,
    });

    this.setupTools();
  }

  private setupTools() {
    // Tool: Search Knowledge Base
    this.server.addTool({
      name: 'search_travel_knowledge',
      description: 'Search Tala AI\'s travel knowledge base for visa requirements, airline policies, and destination information',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g., "Japan visa requirements", "United Airlines baggage policy")'
          },
          category: {
            type: 'string',
            enum: ['all', 'visa', 'airline', 'destination', 'agency'],
            description: 'Filter by document category',
            default: 'all'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 5
          }
        },
        required: ['query']
      }
    }, async (params) => {
      // This will be implemented when we connect to the actual search service
      const { query, category = 'all', limit = 5 } = params;
      
      // Placeholder response for now
      return {
        results: [
          {
            title: `Search results for: ${query}`,
            category: category,
            excerpt: 'This will be replaced with actual search results from the RAG system.',
            relevance_score: 0.95,
            source: 'Tala AI Knowledge Base'
          }
        ],
        total_results: 1,
        query: query,
        category: category
      };
    });

    // Tool: Get Travel Recommendations
    this.server.addTool({
      name: 'get_travel_recommendations',
      description: 'Get AI-powered travel recommendations based on destination and preferences',
      inputSchema: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: 'Destination country or city'
          },
          travel_type: {
            type: 'string',
            enum: ['business', 'leisure', 'family', 'adventure', 'cultural'],
            description: 'Type of travel'
          },
          duration: {
            type: 'string',
            description: 'Trip duration (e.g., "1 week", "3 days")'
          }
        },
        required: ['destination']
      }
    }, async (params) => {
      const { destination, travel_type = 'leisure', duration = '1 week' } = params;
      
      // Placeholder response for now
      return {
        destination: destination,
        recommendations: [
          {
            category: 'visa_requirements',
            info: `Visa requirements for ${destination} will be retrieved from our knowledge base.`
          },
          {
            category: 'best_time_to_visit',
            info: `Optimal travel times for ${destination} based on weather and tourist seasons.`
          },
          {
            category: 'travel_tips',
            info: `Essential travel tips and cultural considerations for ${destination}.`
          }
        ],
        travel_type: travel_type,
        duration: duration
      };
    });

    // Tool: Check Document Status
    this.server.addTool({
      name: 'check_document_status',
      description: 'Check the processing status of uploaded travel documents',
      inputSchema: {
        type: 'object',
        properties: {
          document_id: {
            type: 'string',
            description: 'Document ID to check status for'
          }
        },
        required: ['document_id']
      }
    }, async (params) => {
      const { document_id } = params;
      
      // Placeholder response for now
      return {
        document_id: document_id,
        status: 'processed',
        processing_time: '2.3 seconds',
        extracted_info: {
          document_type: 'visa_policy',
          pages: 5,
          key_sections: ['requirements', 'fees', 'processing_time'],
          indexed: true
        }
      };
    });
  }

  async start(port: number = 3001) {
    try {
      await this.server.start({
        transport: {
          type: 'http',
          port: port
        }
      });
      console.log(`🚀 Tala AI MCP Server started on port ${port}`);
      console.log(`📋 Available tools: ${this.server.getTools().map(t => t.name).join(', ')}`);
    } catch (error) {
      console.error('❌ Failed to start Tala AI MCP Server:', error);
      throw error;
    }
  }

  async stop() {
    await this.server.stop();
    console.log('🛑 Tala AI MCP Server stopped');
  }

  getServerInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      tools: this.server.getTools().map(tool => ({
        name: tool.name,
        description: tool.description
      }))
    };
  }
}

export { TalaMCPServer };
export type { TalaMCPServerConfig };