import { Router, Request, Response } from 'express';
import { 
  getNANDAMetadata, 
  formatForNANDASubmission, 
  getJSONMetadata, 
  getDiscoveryInfo 
} from '../nanda/metadata.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

const router = Router();

// Get base URL from request
function getBaseUrl(req: Request): string {
  const protocol = req.protocol;
  const host = req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

/**
 * GET /metadata
 * Returns general server metadata in JSON format
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const metadata = getJSONMetadata(baseUrl);
    
    logger.info('📊 Metadata requested', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error serving metadata', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate metadata'
    });
  }
});

/**
 * GET /metadata/nanda
 * Returns metadata formatted for NANDA registry submission
 */
router.get('/nanda', (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const format = req.query.format || 'json';
    
    logger.info('🌐 NANDA metadata requested', {
      format,
      ip: req.ip
    });
    
    if (format === 'markdown' || format === 'md') {
      // Return markdown format for manual submission
      const markdown = formatForNANDASubmission(baseUrl);
      res.type('text/markdown').send(markdown);
    } else {
      // Return full NANDA metadata as JSON
      const metadata = getNANDAMetadata(baseUrl);
      res.json({
        success: true,
        data: metadata,
        submission_url: 'https://ui.nanda-registry.com/',
        instructions: 'Submit this metadata to NANDA registry for AI agent discovery',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('❌ Error serving NANDA metadata', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate NANDA metadata'
    });
  }
});

/**
 * GET /metadata/discovery
 * Returns discovery information for AI agents
 */
router.get('/discovery', (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const discoveryInfo = getDiscoveryInfo(baseUrl);
    
    logger.info('🔍 Discovery info requested', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Add discovery headers
    res.set({
      'X-MCP-Server': 'starbucks-premium-mcp',
      'X-MCP-Version': '1.0.0',
      'X-MCP-Protocol': 'mcp',
      'X-MCP-Authentication': 'evmauth',
      'X-MCP-Tools': 'requestinfo'
    });
    
    res.json({
      success: true,
      discovery: discoveryInfo,
      message: 'Use this information to configure AI agents for accessing this service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error serving discovery info', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate discovery information'
    });
  }
});

/**
 * GET /metadata/tools
 * Returns available MCP tools
 */
router.get('/tools', (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const metadata = getNANDAMetadata(baseUrl);
    
    logger.info('🛠️ Tools metadata requested', {
      ip: req.ip
    });
    
    res.json({
      success: true,
      tools: metadata.capabilities.tools,
      usage: {
        endpoint: `${baseUrl}/mcp`,
        authentication: 'Required - use JWT from /auth endpoint',
        example: {
          tool: 'requestinfo',
          parameters: {
            category: 'overview | focus | contact | investment | all'
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error serving tools metadata', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate tools information'
    });
  }
});

/**
 * GET /metadata/requirements
 * Returns authentication requirements
 */
router.get('/requirements', (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const metadata = getNANDAMetadata(baseUrl);
    
    logger.info('🔐 Requirements requested', {
      ip: req.ip
    });
    
    res.json({
      success: true,
      authentication: {
        required: metadata.authentication.required,
        type: metadata.authentication.type,
        details: metadata.authentication.details,
        endpoints: {
          legacy: {
            url: `${baseUrl}/auth`,
            description: 'Legacy endpoint - uses hardcoded contract configuration',
            requiredTokenId: config.requiredTokenId,
            contractAddress: config.evmAuthAddress
          },
          dynamic: {
            url: `${baseUrl}/auth/dynamic`,
            description: 'Flexible endpoint - accepts any EVMAuth contract on Radius',
            example: {
              wallet: '0xYourWalletAddress',
              contract: '0xAnyEVMAuthContract',
              tokenId: 42
            }
          }
        },
        steps: [
          '1. Have any EVMAuth token on Radius blockchain',
          `2. Send POST request to ${baseUrl}/auth/dynamic with:`,
          '   - wallet: Your wallet address',
          '   - contract: The EVMAuth contract address',
          '   - tokenId: The token ID you own',
          '3. Receive JWT access token and refresh token',
          `4. Use JWT Bearer token to access ${metadata.server.endpoint}`,
          '5. Refresh token before expiration using refresh endpoint'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Error serving requirements', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to generate requirements information'
    });
  }
});

export default router;