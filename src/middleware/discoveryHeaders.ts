import { Request, Response, NextFunction } from 'express';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Discovery Headers Middleware
 * Adds NANDA-compatible headers to responses for service discovery
 */

interface DiscoveryHeaders {
  'X-MCP-Server': string;
  'X-MCP-Version': string;
  'X-MCP-Protocol': string;
  'X-MCP-Authentication': string;
  'X-MCP-Tools': string;
  'X-MCP-Capabilities': string;
  'X-MCP-Token-Required'?: string;
  'X-MCP-Registry': string;
  'X-NANDA-Compatible': string;
  'X-Service-Type': string;
}

/**
 * Main discovery headers middleware
 */
export function discoveryHeaders(req: Request, res: Response, next: NextFunction): void {
  try {
    // Base headers for all responses
    const headers: DiscoveryHeaders = {
      'X-MCP-Server': 'starbucks-premium-mcp',
      'X-MCP-Version': '1.0.0',
      'X-MCP-Protocol': 'mcp',
      'X-MCP-Authentication': 'evmauth',
      'X-MCP-Tools': 'requestinfo',
      'X-MCP-Capabilities': 'token-gated,jwt-auth,rate-limited',
      'X-MCP-Registry': 'nanda',
      'X-NANDA-Compatible': 'true',
      'X-Service-Type': 'premium'
    };

    // Add token requirement header
    if (config.evmAuthAddress && config.requiredTokenId !== undefined) {
      headers['X-MCP-Token-Required'] = `${config.evmAuthAddress}:${config.requiredTokenId}@radius`;
    }

    // Apply headers to response
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Add Link header for metadata discovery
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.setHeader('Link', [
      `<${baseUrl}/metadata>; rel="service-desc"`,
      `<${baseUrl}/metadata/discovery>; rel="discovery"`,
      `<${baseUrl}/metadata/nanda>; rel="nanda-registry"`,
      `<${baseUrl}/auth>; rel="authentication"`
    ].join(', '));

    next();
  } catch (error) {
    logger.error('Error setting discovery headers', { error });
    // Don't break the request, just continue without headers
    next();
  }
}

/**
 * Enhanced discovery headers for specific endpoints
 */
export function enhancedDiscoveryHeaders(req: Request, res: Response, next: NextFunction): void {
  // First apply base headers
  discoveryHeaders(req, res, next);

  // Then add endpoint-specific headers
  const path = req.path.toLowerCase();

  if (path.includes('/mcp')) {
    res.setHeader('X-MCP-Endpoint-Type', 'protocol');
    res.setHeader('X-MCP-Auth-Required', 'true');
  } else if (path.includes('/auth')) {
    res.setHeader('X-MCP-Endpoint-Type', 'authentication');
    res.setHeader('X-MCP-Auth-Flow', 'wallet-address-to-jwt');
  } else if (path.includes('/metadata')) {
    res.setHeader('X-MCP-Endpoint-Type', 'discovery');
    res.setHeader('X-MCP-Auth-Required', 'false');
  }
}

/**
 * OPTIONS request handler for discovery
 */
export function handleDiscoveryOptions(req: Request, res: Response): void {
  // Add all discovery headers
  discoveryHeaders(req, res, () => {});

  // Add allowed methods
  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-MCP-Session-ID');

  // Add service capabilities in response body
  const capabilities = {
    server: {
      name: 'Starbucks Premium MCP Server',
      version: '1.0.0',
      protocol: 'mcp'
    },
    authentication: {
      type: 'evmauth',
      required: true,
      blockchain: 'radius',
      contract: config.evmAuthAddress,
      tokenId: config.requiredTokenId
    },
    endpoints: {
      mcp: '/mcp',
      auth: '/auth',
      metadata: '/metadata',
      health: '/health'
    },
    tools: ['requestinfo'],
    rateLimit: {
      auth: '5 requests per 15 minutes',
      mcp: '100 requests per minute'
    }
  };

  res.status(200).json(capabilities);
}

/**
 * Middleware to add discovery headers only to specific routes
 */
export function selectiveDiscoveryHeaders(routes: string[] = []) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Apply to all routes if no specific routes provided
    if (routes.length === 0) {
      discoveryHeaders(req, res, next);
      return;
    }

    // Check if current path matches any specified route
    const shouldApply = routes.some(route => 
      req.path.toLowerCase().startsWith(route.toLowerCase())
    );

    if (shouldApply) {
      discoveryHeaders(req, res, next);
    } else {
      next();
    }
  };
}

/**
 * Log discovery header access for analytics
 */
export function logDiscoveryAccess(req: Request, _res: Response, next: NextFunction): void {
  // Check if request is from an AI agent or discovery bot
  const userAgent = req.get('user-agent')?.toLowerCase() || '';
  const isDiscoveryRequest = 
    userAgent.includes('mcp') ||
    userAgent.includes('nanda') ||
    userAgent.includes('ai-agent') ||
    userAgent.includes('discovery') ||
    req.get('x-mcp-client') !== undefined;

  if (isDiscoveryRequest) {
    logger.info('🔍 Discovery request detected', {
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
      mcpClient: req.get('x-mcp-client'),
      ip: req.ip
    });
  }

  next();
}

/**
 * Create a discovery manifest for the service
 */
export function getDiscoveryManifest(baseUrl: string): object {
  return {
    '@context': 'https://nanda.media/contexts/mcp-service',
    '@type': 'MCPService',
    name: 'Starbucks Premium MCP Server',
    description: 'Token-gated access to Starbucks company information',
    url: baseUrl,
    protocol: {
      type: 'mcp',
      version: '1.0.0',
      transport: 'http'
    },
    authentication: {
      '@type': 'EVMAuth',
      required: true,
      blockchain: 'radius',
      contractAddress: config.evmAuthAddress,
      tokenId: config.requiredTokenId,
      tokenName: 'Starbucks Access Token'
    },
    endpoints: {
      mcp: `${baseUrl}/mcp`,
      auth: `${baseUrl}/auth`,
      metadata: `${baseUrl}/metadata`,
      discovery: `${baseUrl}/metadata/discovery`
    },
    tools: [
      {
        name: 'requestinfo',
        description: 'Request Starbucks company information',
        parameters: {
          category: {
            type: 'string',
            enum: ['overview', 'focus', 'contact', 'investment', 'all'],
            description: 'Category of information to retrieve'
          }
        }
      }
    ],
    rateLimit: {
      authentication: {
        window: '15 minutes',
        limit: 5
      },
      mcp: {
        window: '1 minute',
        limit: 100
      }
    },
    registry: {
      nanda: true,
      discoverable: true,
      tags: ['company-data', 'premium', 'token-gated', 'evmauth']
    }
  };
}