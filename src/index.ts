#!/usr/bin/env node
import { issueJwt, refreshJwt } from "./auth/jwtIssuer.js";
import { issueDynamicJwt, type DynamicAuthRequest } from "./auth/jwtIssuerDynamic.js";
import { evmAuthMiddleware } from "./auth/evmAuthMiddleware.js";
import { authLimiter, mcpLimiter, generalLimiter } from "./middleware/rateLimiter.js";
import { revokeToken } from "./auth/tokenManager.js";
import logger, { logAuth, logMcp } from "./utils/logger.js";
import config from "./config/index.js";
import metadataRouter from './routes/metadata.js';
import { discoveryHeaders, logDiscoveryAccess, handleDiscoveryOptions } from './middleware/discoveryHeaders.js';

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Project NANDA company information
const COMPANY_INFO = {
  name: "Starbucks",
  description: `Starbucks is the world's largest coffeehouse chain, serving specialty coffee, tea, and food items. Founded in 1971 in Seattle, Washington, Starbucks has become a global brand known for its premium coffee experience, welcoming atmosphere, and commitment to ethical sourcing and community building.`,
  focus_areas: [
    "Premium Coffee & Beverages",
    "Food & Pastries",
    "Digital Innovation & Mobile Ordering",
    "Store Experience & Design",
    "Ethical Sourcing & Sustainability",
    "Community Building",
    "Starbucks Rewards Program"
  ],
  stage: "Established Public Company",
  approach: "Customer-first experience with focus on quality, community, and sustainability",
  website: "https://www.starbucks.com",
  contact: "customerservice@starbucks.com",
  network: "Global coffeehouse network with over 33,000 stores worldwide"
};

// Create the MCP server instance
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "starbucks-server",
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

  // Apply general rate limiter to all routes
  app.use(generalLimiter);
  
  // Add discovery logging
  app.use(logDiscoveryAccess);
  
  // Add discovery headers to all responses
  app.use(discoveryHeaders);
  
  // Enable CORS for all routes
  const corsMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Mcp-Session-Id');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  };
  app.use(corsMiddleware);

  // Map to store transports by session ID
  const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  // Auth endpoint
  const authHandler: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { address } = req.body ?? {};
      if (!address) {
        res.status(400).json({ error: "Missing address" });
        return;
      }
    
      const tokens = await issueJwt(address, req.ip || 'unknown');
      res.json(tokens);
    } catch (e) {
      res.status(401).json({ error: (e as Error).message });
    }
  };
  app.post("/auth", authLimiter, authHandler);
  
  // Refresh token endpoint
  const refreshHandler: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body ?? {};
      if (!refreshToken) {
        res.status(400).json({ error: "Missing refresh token" });
        return;
      }
      
      const tokens = await refreshJwt(refreshToken);
      res.json(tokens);
    } catch (e) {
      res.status(401).json({ error: (e as Error).message });
    }
  };
  app.post("/auth/refresh", refreshHandler);
  
  // Dynamic auth endpoint - accepts any contract/wallet on Radius
  const dynamicAuthHandler: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { wallet, contract, tokenId } = req.body ?? {};
      
      // Validate required fields
      if (!wallet || !contract || tokenId === undefined) {
        res.status(400).json({ 
          error: "Missing required fields. Please provide wallet, contract, and tokenId" 
        });
        return;
      }
      
      const authRequest: DynamicAuthRequest = {
        wallet,
        contract,
        tokenId: Number(tokenId)
      };
      
      const tokens = await issueDynamicJwt(authRequest, req.ip || 'unknown');
      res.json(tokens);
    } catch (e) {
      res.status(401).json({ error: (e as Error).message });
    }
  };
  app.post("/auth/dynamic", authLimiter, dynamicAuthHandler);
  
  // Revoke token endpoint
  const revokeHandler: RequestHandler = async (req: Request, res: Response) => {
    try {
      // This endpoint should be protected - for now just checking JWT
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ error: "Missing Authorization header" });
        return;
      }
      
      const { jti } = req.body ?? {};
      if (!jti) {
        res.status(400).json({ error: "Missing jti to revoke" });
        return;
      }
      
      revokeToken(jti);
      logAuth.jwtRevoked(jti, 'manual-revocation');
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  };
  app.post("/auth/revoke", evmAuthMiddleware as RequestHandler, revokeHandler);
  
  // Mount middlewares for MCP endpoint
  app.use("/mcp", mcpLimiter, evmAuthMiddleware as RequestHandler);

  // Handle MCP endpoint - supports POST, GET, and DELETE
  const mcpHandler: RequestHandler = async (req: Request, res: Response) => {
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
              logger.info(`Session initialized: ${sessionId}`);
            }
          });

          // Clean up transport when closed
          transport.onclose = () => {
            if (transport.sessionId) {
              delete transports[transport.sessionId];
              logger.info(`Session closed: ${transport.sessionId}`);
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
        return;
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
      logger.error('Error handling MCP request:', error);
      logMcp.error(req.headers['mcp-session-id'] as string || 'unknown', error);
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
  };
  app.all('/mcp', mcpHandler);

  // Health check endpoint
  const healthHandler: RequestHandler = (_req: Request, res: Response) => {
    res.json({ 
      status: 'healthy', 
      service: 'starbucks-mcp-server',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  };
  app.get('/health', healthHandler);

  // Root endpoint with basic info
  const rootHandler: RequestHandler = (_req: Request, res: Response) => {
    res.json({
      name: 'Starbucks MCP Server',
      version: '1.0.0',
      description: 'Model Context Protocol server for Starbucks information',
      endpoints: {
        mcp: '/mcp',
        health: '/health',
        auth: '/auth (legacy)',
        authDynamic: '/auth/dynamic (flexible)',
        metadata: '/metadata/*'
      },
      authentication: {
        type: 'EVMAuth on Radius blockchain',
        flexible: true,
        message: 'This server accepts ANY EVMAuth token on Radius. Use /auth/dynamic with your contract details.'
      },
      transport: 'Streamable HTTP',
      company: COMPANY_INFO.name
    });
  };
  app.get('/', rootHandler);
  
  // OPTIONS handler for service discovery
  app.options('/', handleDiscoveryOptions);
  
  // Metadata routes
  app.use('/metadata', metadataRouter);

  const PORT = config.port;
  
  app.listen(PORT, () => {
    logger.info(`🚀 Project Server running on port ${PORT}`);
    logger.info(`📡 MCP endpoint: http://localhost:${PORT}/mcp`);
    logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
    logger.info(`🌐 Transport: Streamable HTTP`);
    logger.info(`🔐 Environment: ${config.nodeEnv}`);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  logger.error('❌ Failed to start server:', error);
  process.exit(1);
}); 