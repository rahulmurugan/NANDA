// Config import removed as we're using flexible auth now

// Company information constants
const COMPANY_INFO = {
  name: "Starbucks",
  website: "https://www.starbucks.com",
  contact: "investor@starbucks.com"
};

/**
 * NANDA Registry Metadata
 * This provides standardized metadata about our MCP server
 * for registration in the NANDA registry
 */

export interface NANDAMetadata {
  server: {
    name: string;
    description: string;
    version: string;
    protocol: string;
    endpoint: string;
  };
  authentication: {
    required: boolean;
    type: string;
    details: {
      blockchain: string;
      contractAddress: string;
      requiredTokenId: string;
      tokenName: string;
      tokenDescription: string;
      authEndpoint: string;
      documentation: string;
    };
  };
  capabilities: {
    tools: Array<{
      name: string;
      description: string;
      categories?: string[];
    }>;
    features: string[];
    limitations?: string[];
  };
  metadata: {
    maintainer: string;
    repository?: string;
    documentation?: string;
    support?: string;
    tags: string[];
  };
}

/**
 * Get NANDA registry metadata for our server
 */
export function getNANDAMetadata(baseUrl: string): NANDAMetadata {
  return {
    server: {
      name: 'Starbucks Premium MCP Server',
      description: 'Token-gated access to comprehensive Starbucks company information. Requires EVMAuth token ownership on Radius blockchain for access.',
      version: '1.0.0',
      protocol: 'mcp',
      endpoint: `${baseUrl}/mcp`
    },
    authentication: {
      required: true,
      type: 'evmauth',
      details: {
        blockchain: 'radius',
        contractAddress: 'Any EVMAuth-compatible contract on Radius',
        requiredTokenId: 'Any token ID',
        tokenName: 'EVMAuth Access Token',
        tokenDescription: 'Any EVMAuth token on Radius blockchain can be used for authentication. Use /auth/dynamic endpoint with your contract details.',
        authEndpoint: `${baseUrl}/auth/dynamic`,
        documentation: `${baseUrl}/docs/authentication`
      }
    },
    capabilities: {
      tools: [
        {
          name: 'requestinfo',
          description: 'Request detailed Starbucks company information',
          categories: ['overview', 'focus', 'contact', 'investment', 'all']
        }
      ],
      features: [
        'Real-time data access',
        'Comprehensive company insights',
        'Financial information',
        'Strategic focus areas',
        'Investment opportunities',
        'JWT-based session management',
        'Rate limiting protection',
        'Token refresh support'
      ],
      limitations: [
        'Requires EVMAuth token ownership',
        'Rate limited to 100 requests per minute',
        'JWT expires after 15 minutes (refresh available)'
      ]
    },
    metadata: {
      maintainer: 'Starbucks MCP Server Demo',
      // repository: 'https://github.com/your-org/mcp-server', // Add when available
      documentation: `${baseUrl}/docs`,
      support: COMPANY_INFO.contact,
      tags: [
        'company-data',
        'premium',
        'token-gated',
        'evmauth',
        'blockchain',
        'food-beverage',
        'enterprise',
        'mcp',
        'radius'
      ]
    }
  };
}

/**
 * Format metadata for NANDA registry submission
 */
export function formatForNANDASubmission(baseUrl: string): string {
  const metadata = getNANDAMetadata(baseUrl);
  
  return `
# NANDA Registry Submission

## Server Information
- **Name**: ${metadata.server.name}
- **Description**: ${metadata.server.description}
- **Version**: ${metadata.server.version}
- **Protocol**: ${metadata.server.protocol}
- **Endpoint**: ${metadata.server.endpoint}

## Authentication Requirements
- **Type**: ${metadata.authentication.type}
- **Blockchain**: ${metadata.authentication.details.blockchain}
- **Contract**: ${metadata.authentication.details.contractAddress}
- **Required Token ID**: ${metadata.authentication.details.requiredTokenId}
- **Token Name**: ${metadata.authentication.details.tokenName}
- **Auth Endpoint**: ${metadata.authentication.details.authEndpoint}

## How to Access
1. Obtain EVMAuth token ID ${metadata.authentication.details.requiredTokenId} on ${metadata.authentication.details.blockchain} blockchain
2. POST to ${metadata.authentication.details.authEndpoint} with your wallet address
3. Use the JWT token to access ${metadata.server.endpoint}

## Available Tools
${metadata.capabilities.tools.map(tool => 
  `- **${tool.name}**: ${tool.description} (Categories: ${tool.categories?.join(', ')})`
).join('\n')}

## Features
${metadata.capabilities.features.map(f => `- ${f}`).join('\n')}

## Tags
${metadata.metadata.tags.join(', ')}

## Support
- Maintainer: ${metadata.metadata.maintainer}
- Contact: ${metadata.metadata.support}
${metadata.metadata.documentation ? `- Documentation: ${metadata.metadata.documentation}` : ''}
`;
}

/**
 * Get metadata in JSON format for API responses
 */
export function getJSONMetadata(baseUrl: string): object {
  const metadata = getNANDAMetadata(baseUrl);
  
  return {
    name: metadata.server.name,
    description: metadata.server.description,
    version: metadata.server.version,
    protocol: metadata.server.protocol,
    endpoint: metadata.server.endpoint,
    authentication: {
      required: metadata.authentication.required,
      type: metadata.authentication.type,
      blockchain: metadata.authentication.details.blockchain,
      contract: metadata.authentication.details.contractAddress,
      requiredTokenId: metadata.authentication.details.requiredTokenId,
      tokenName: metadata.authentication.details.tokenName,
      authEndpoint: metadata.authentication.details.authEndpoint
    },
    tools: metadata.capabilities.tools,
    features: metadata.capabilities.features,
    limitations: metadata.capabilities.limitations,
    tags: metadata.metadata.tags,
    maintainer: metadata.metadata.maintainer,
    support: metadata.metadata.support
  };
}

/**
 * Get discovery information for AI agents
 */
export function getDiscoveryInfo(baseUrl: string): object {
  const metadata = getNANDAMetadata(baseUrl);
  
  return {
    service: {
      name: metadata.server.name,
      endpoint: metadata.server.endpoint,
      requiresAuth: metadata.authentication.required
    },
    authentication: metadata.authentication.required ? {
      instructions: `This service requires EVMAuth token ownership. You need token ID ${metadata.authentication.details.requiredTokenId} on ${metadata.authentication.details.blockchain} blockchain.`,
      checkEndpoint: `${baseUrl}/auth/check`,
      authEndpoint: metadata.authentication.details.authEndpoint,
      tokenInfo: {
        blockchain: metadata.authentication.details.blockchain,
        contract: metadata.authentication.details.contractAddress,
        tokenId: metadata.authentication.details.requiredTokenId,
        name: metadata.authentication.details.tokenName
      }
    } : null,
    capabilities: {
      tools: metadata.capabilities.tools.map(t => t.name),
      categories: Array.from(new Set(metadata.capabilities.tools.flatMap(t => t.categories || [])))
    },
    status: {
      operational: true,
      message: 'Service is operational'
    }
  };
}