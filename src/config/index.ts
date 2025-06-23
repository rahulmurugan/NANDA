import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define configuration schema
const configSchema = z.object({
  // Server
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  
  // JWT
  jwtSecret: z.string().min(32),
  accessTokenExpiry: z.string().default('15m'),
  refreshTokenExpiry: z.string().default('7d'),
  
  // Blockchain
  radiusRpc: z.string().url(),
  evmAuthAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  requiredTokenId: z.number(),
  
  // Rate Limiting
  rateLimitWindowMs: z.number().default(900000), // 15 minutes
  rateLimitMaxRequests: z.number().default(5)
});

// Parse and validate configuration
const config = configSchema.parse({
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY,
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY,
  
  // Blockchain
  radiusRpc: process.env.RADIUS_RPC || 'https://rpc.stg.tryradi.us/',
  evmAuthAddress: process.env.EVMAUTH_ADDRESS || '0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96',
  requiredTokenId: parseInt(process.env.REQUIRED_TOKEN_ID || '0', 10),
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5', 10)
});

// Warn if using default JWT secret in production
if (config.nodeEnv === 'production' && config.jwtSecret === 'default-secret-change-in-production') {
  console.error('WARNING: Using default JWT secret in production! This is a security risk.');
  process.exit(1);
}

export default config;