#!/usr/bin/env node

import express from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Project NANDA company information
const COMPANY_INFO = {
  name: "Google",
  description: `Google is a company that offers a variety of services, including search, email, and maps.`,
  focus_areas: [
    "Search",
    "Email",
    "Maps",
    "Gmail",
    "Google Drive",
    "Google Cloud",
    "Model Context Protocol (MCP) Extensions"
  ],
  stage: "Series B",
  approach: "NA",
  website: "https://www.google.com",
  contact: "info@google.com",
  network: "Global technology network"
};

// Create the MCP server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "google-server",
    version: "1.0.0"
  });

  // Add the requestinfo tool
  server.tool(
    "requestinfo",
    {
      category: z.string().optional().describe("Category of information to retrieve: 'overview', 'focus', 'contact', 'investment', or 'all'")
    },
    async ({ category = "all" }) => {
      let responseText: string;
      
      switch (category) {
        case "overview":
          responseText = `${COMPANY_INFO.name}\n\n${COMPANY_INFO.description}`;
          break;
        case "focus":
          responseText = `${COMPANY_INFO.name} Focus Areas:\n\n${COMPANY_INFO.focus_areas.map(area => `• ${area}`).join('\n')}\n\nInvestment Stage: ${COMPANY_INFO.stage}\nApproach: ${COMPANY_INFO.approach}`;
          break;
        case "contact":
          responseText = `${COMPANY_INFO.name} Contact Information:\n\nWebsite: ${COMPANY_INFO.website}\nEmail: ${COMPANY_INFO.contact}`;
          break;
        case "investment":
          responseText = `${COMPANY_INFO.name} Investment Details:\n\nStage: ${COMPANY_INFO.stage}\nFocus Areas: ${COMPANY_INFO.focus_areas.join(', ')}\nApproach: ${COMPANY_INFO.approach}\nNetwork: ${COMPANY_INFO.network}`;
          break;
        case "all":
        default:
          responseText = `${COMPANY_INFO.name} - Complete Information\n\n` +
            `OVERVIEW:\n${COMPANY_INFO.description}\n\n` +
            `FOCUS AREAS:\n${COMPANY_INFO.focus_areas.map(area => `• ${area}`).join('\n')}\n\n` +
            `INVESTMENT DETAILS:\n` +
            `• Stage: ${COMPANY_INFO.stage}\n` +
            `• Approach: ${COMPANY_INFO.approach}\n` +
            `• Network: ${COMPANY_INFO.network}\n\n` +
            `CONTACT:\n` +
            `• Website: ${COMPANY_INFO.website}\n` +
            `• Email: ${COMPANY_INFO.contact}`;
          break;
      }

      return {
        content: [{
          type: "text",
          text: responseText
        }]
      };
    }
  );

  return server;
}

// Start the HTTP server with Streamable HTTP transport
async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Enable CORS for all routes
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Mcp-Session-Id');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Map to store transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Handle MCP endpoint - supports POST, GET, and DELETE
  app.all('/mcp', async (req: express.Request, res: express.Response) => {
    try {
      // Handle POST requests for client-to-server communication
      if (req.method === 'POST') {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
          // Reuse existing transport
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sessionId) => {
              // Store the transport by session ID
              transports[sessionId] = transport;
              console.log(`Session initialized: ${sessionId}`);
            }
          });

          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              delete transports[transport.sessionId];
              console.log(`Session closed: ${transport.sessionId}`);
            }
          };

          // Create and connect the MCP server
          const server = createMcpServer();
          await server.connect(transport as any);
        } else {
          // Invalid request
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: No valid session ID provided or not an initialization request',
            },
            id: null,
          });
          return;
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);
      }
      // Handle GET requests for server-to-client notifications
      else if (req.method === 'GET') {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
      }
      // Handle DELETE requests for session termination
      else if (req.method === 'DELETE') {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        
        const transport = transports[sessionId];
        delete transports[sessionId];
        transport.close();
        res.status(200).send('Session terminated');
      }
      // Method not allowed
      else {
        res.status(405).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Method not allowed',
          },
          id: null,
        });
      }
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // Health check endpoint
  app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({ 
      status: 'healthy', 
      service: 'google-mcp-server',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Root endpoint with basic info
  app.get('/', (_req: express.Request, res: express.Response) => {
    res.json({
      name: 'Google MCP Server',
      version: '1.0.0',
      description: 'Model Context Protocol server for Google information',
      endpoints: {
        mcp: '/mcp',
        health: '/health'
      },
      transport: 'Streamable HTTP',
      company: COMPANY_INFO.name
    });
  });

  const PORT = process.env.PORT || 3000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Project Server running on port ${PORT}`);
    console.log(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 Transport: Streamable HTTP`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}); 