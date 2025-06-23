import jwt from "jsonwebtoken";
import crypto from "crypto";
import { logAuth } from "../utils/logger.js";

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExp: number;
  refreshTokenExp: number;
  jti: string;
}

interface RefreshTokenData {
  address: string;
  tokenId: number;
  jti: string;
  createdAt: number;
}

// In-memory storage for refresh tokens (use Redis in production)
const refreshTokenStore = new Map<string, RefreshTokenData>();

// In-memory blacklist for revoked tokens
const tokenBlacklist = new Set<string>();

// Configuration
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

/**
 * Generate a unique JWT ID
 */
function generateJti(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Issue both access and refresh tokens
 */
export async function issueTokenPair(
  address: string, 
  tokenId: number,
  jwtSecret: string,
  additionalClaims?: Record<string, any>
): Promise<TokenPair> {
  const jti = generateJti();
  const now = Math.floor(Date.now() / 1000);
  
  // Create access token with optional additional claims
  const accessToken = jwt.sign(
    {
      sub: address,
      tokenId,
      jti,
      type: 'access',
      ...additionalClaims
    },
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
  );
  
  // Create refresh token
  const refreshToken = jwt.sign(
    {
      sub: address,
      tokenId,
      jti,
      type: 'refresh',
      ...additionalClaims
    },
    jwtSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
  );
  
  // Decode to get expiration times
  const accessDecoded = jwt.decode(accessToken) as any;
  const refreshDecoded = jwt.decode(refreshToken) as any;
  
  // Store refresh token data
  refreshTokenStore.set(refreshToken, {
    address,
    tokenId,
    jti,
    createdAt: now
  });
  
  // Log token issuance
  logAuth.jwtIssued(address, accessDecoded.exp, jti);
  
  return {
    accessToken,
    refreshToken,
    accessTokenExp: accessDecoded.exp,
    refreshTokenExp: refreshDecoded.exp,
    jti
  };
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  jwtSecret: string
): Promise<TokenPair> {
  // Verify refresh token
  const decoded = jwt.verify(refreshToken, jwtSecret) as any;
  
  // Check if it's a refresh token
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  
  // Check if refresh token exists in store
  const storedData = refreshTokenStore.get(refreshToken);
  if (!storedData) {
    throw new Error('Refresh token not found');
  }
  
  // Check if the original JWT ID is blacklisted
  if (tokenBlacklist.has(storedData.jti)) {
    refreshTokenStore.delete(refreshToken);
    throw new Error('Token has been revoked');
  }
  
  // Revoke old tokens
  revokeToken(storedData.jti);
  refreshTokenStore.delete(refreshToken);
  
  // Issue new token pair
  const newTokens = await issueTokenPair(
    storedData.address,
    storedData.tokenId,
    jwtSecret
  );
  
  // Log refresh
  logAuth.jwtRefreshed(storedData.address, storedData.jti, newTokens.jti);
  
  return newTokens;
}

/**
 * Revoke a token by its JWT ID
 */
export function revokeToken(jti: string): void {
  tokenBlacklist.add(jti);
  
  // Clean up refresh tokens with this JTI
  for (const [token, tokenData] of refreshTokenStore.entries()) {
    if (tokenData.jti === jti) {
      refreshTokenStore.delete(token);
    }
  }
}

/**
 * Check if a token is blacklisted
 */
export function isTokenRevoked(jti: string): boolean {
  return tokenBlacklist.has(jti);
}

/**
 * Clean up expired tokens (should be called periodically)
 */
export function cleanupExpiredTokens(): void {
  const now = Math.floor(Date.now() / 1000);
  
  // Clean up refresh tokens
  for (const [token, _data] of refreshTokenStore.entries()) {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded.exp < now) {
        refreshTokenStore.delete(token);
      }
    } catch {
      refreshTokenStore.delete(token);
    }
  }
  
  // Clean up blacklist (remove JTIs older than max refresh token expiry)
  // const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  // const cutoff = now - maxAge;
  
  // This is simplified - in production, store timestamps with blacklisted JTIs
  // For now, we'll keep the blacklist as is
}

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);