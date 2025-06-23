import config from '../config/index.js';

/**
 * Discovery Helper Functions
 * Utilities to help AI agents discover and interact with our token-gated service
 */

export interface TokenRequirement {
  blockchain: string;
  contractAddress: string;
  tokenId: string;
  tokenName: string;
  description: string;
}

export interface AccessDeniedResponse {
  error: string;
  reason: string;
  requirements: TokenRequirement;
  instructions: string[];
  helpUrl?: string;
}

export interface MCPClientConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Format access denied message for AI agents
 */
export function formatAccessDeniedMessage(
  userAddress?: string,
  additionalContext?: string
): AccessDeniedResponse {
  const requirement: TokenRequirement = {
    blockchain: 'radius',
    contractAddress: config.evmAuthAddress,
    tokenId: config.requiredTokenId.toString(),
    tokenName: 'Starbucks Access Token',
    description: 'This token grants premium access to Starbucks company data through the MCP interface'
  };

  const instructions = [
    `1. Obtain EVMAuth token ID ${requirement.tokenId} on ${requirement.blockchain} blockchain`,
    `2. Token contract address: ${requirement.contractAddress}`,
    '3. Once you have the token, authenticate using POST /auth with your wallet address',
    '4. Use the JWT token received to access the MCP endpoint'
  ];

  if (userAddress) {
    instructions.unshift(`Wallet ${userAddress} does not currently own the required token.`);
  }

  if (additionalContext) {
    instructions.push(`Additional context: ${additionalContext}`);
  }

  return {
    error: 'Authentication Required',
    reason: 'This service requires EVMAuth token ownership for access',
    requirements: requirement,
    instructions,
    helpUrl: 'https://github.com/your-org/token-instructions'
  };
}

/**
 * Generate MCP client configuration for AI agents
 */
export function generateMCPClientConfig(
  serverUrl: string,
  jwtToken?: string
): MCPClientConfig {
  const config: MCPClientConfig = {
    name: 'starbucks-premium',
    command: 'node',
    args: [
      '-e',
      `
      const https = require('https');
      const url = new URL('${serverUrl}/mcp');
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ${jwtToken ? `'Authorization': 'Bearer ${jwtToken}',` : ''}
        }
      };
      
      // Handle MCP communication
      process.stdin.on('data', (data) => {
        const req = https.request(options, (res) => {
          res.on('data', (chunk) => process.stdout.write(chunk));
        });
        req.write(data);
        req.end();
      });
      `
    ]
  };

  if (!jwtToken) {
    config.env = {
      NOTE: 'JWT token required. Get it from /auth endpoint first.'
    };
  }

  return config;
}

/**
 * Format token acquisition instructions
 */
export function getTokenAcquisitionInstructions(): string {
  return `
# How to Acquire Starbucks Access Token

## Option 1: Direct Minting (if available)
- Contract: ${config.evmAuthAddress}
- Network: Radius Blockchain
- Token ID: ${config.requiredTokenId}
- Function: mintToken() or similar

## Option 2: Secondary Market
- Check OpenSea or similar marketplaces
- Search for contract: ${config.evmAuthAddress}
- Look for Token ID: ${config.requiredTokenId}

## Option 3: Request Access
- Contact: support@starbucks.com
- Subject: MCP Service Token Access Request
- Include your wallet address and use case

## Verification
Once you have the token:
1. Verify ownership on Radius blockchain explorer
2. Use our check endpoint: GET /auth/check?address=YOUR_ADDRESS
3. Proceed with authentication: POST /auth
`;
}

/**
 * Generate error response for missing authentication
 */
export function generateAuthErrorResponse(
  missingHeader: boolean = true
): object {
  if (missingHeader) {
    return {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required',
        data: {
          reason: 'Missing Authorization header',
          instructions: 'Include "Authorization: Bearer YOUR_JWT_TOKEN" header',
          authEndpoint: '/auth',
          requirements: {
            tokenId: config.requiredTokenId,
            blockchain: 'radius',
            contract: config.evmAuthAddress
          }
        }
      },
      id: null
    };
  }

  return {
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Invalid or expired token',
      data: {
        reason: 'JWT validation failed',
        instructions: 'Get a new token from /auth or refresh using /auth/refresh',
        authEndpoint: '/auth',
        refreshEndpoint: '/auth/refresh'
      }
    },
    id: null
  };
}

/**
 * Generate discovery response for NANDA
 */
export function generateNANDADiscoveryResponse(baseUrl: string): object {
  return {
    mcp_version: '1.0',
    server_info: {
      name: 'Starbucks Premium MCP Server',
      version: '1.0.0',
      description: 'Token-gated access to Starbucks company information'
    },
    authentication: {
      required: true,
      type: 'evmauth',
      blockchain: 'radius',
      contract_address: config.evmAuthAddress,
      token_id: config.requiredTokenId,
      endpoints: {
        auth: `${baseUrl}/auth`,
        refresh: `${baseUrl}/auth/refresh`,
        verify: `${baseUrl}/auth/verify`,
        requirements: `${baseUrl}/metadata/requirements`
      }
    },
    capabilities: {
      tools: ['requestinfo'],
      features: [
        'token-gated-access',
        'jwt-authentication',
        'rate-limiting',
        'refresh-tokens'
      ]
    },
    usage_example: {
      step1: 'Get JWT token by POSTing wallet address to /auth',
      step2: 'Use JWT as Bearer token for /mcp endpoint',
      step3: 'Call requestinfo tool with desired category',
      categories: ['overview', 'focus', 'contact', 'investment', 'all']
    }
  };
}

/**
 * Check if error is due to missing token
 */
export function isTokenError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorReason = error.reason?.toLowerCase() || '';
  
  return (
    errorMessage.includes('token') ||
    errorMessage.includes('auth') ||
    errorReason.includes('token') ||
    error.code === 'TOKEN_REQUIRED' ||
    error.code === 'AUTH_REQUIRED'
  );
}

/**
 * Format user-friendly error message
 */
export function formatUserFriendlyError(error: any): string {
  if (isTokenError(error)) {
    return `🔒 This service requires a Starbucks Access Token (Token ID: ${config.requiredTokenId}).
    
To access this premium service:
1. Acquire the token on Radius blockchain
2. Authenticate with your wallet address
3. Try your request again

Need help? Visit /metadata/requirements for detailed instructions.`;
  }

  if (error.code === 'RATE_LIMITED') {
    return `⏱️ Rate limit exceeded. Please wait before making more requests.
    
Current limits:
- Authentication: 5 attempts per 15 minutes
- MCP requests: 100 per minute`;
  }

  if (error.code === 'JWT_EXPIRED') {
    return `⏰ Your authentication token has expired.
    
Please refresh your token using POST /auth/refresh with your refresh token,
or get a new token pair from POST /auth.`;
  }

  return `❌ An error occurred: ${error.message || 'Unknown error'}`;
}

/**
 * Generate integration test checklist
 */
export function getIntegrationChecklist(): string[] {
  return [
    '✓ Server deployed and accessible',
    '✓ Health endpoint responds: GET /health',
    '✓ Metadata endpoints work: GET /metadata/*',
    '✓ EVMAuth contract verified on Radius',
    '✓ Test wallet has required token',
    '✓ Authentication flow tested: POST /auth',
    '✓ JWT validation working on /mcp',
    '✓ Rate limiting active and tested',
    '✓ Refresh tokens working',
    '✓ NANDA registration completed',
    '✓ Service appears in NANDA search',
    '✓ AI agents can discover service',
    '✓ Error messages are clear',
    '✓ Documentation is complete'
  ];
}