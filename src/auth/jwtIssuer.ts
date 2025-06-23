import { ethers } from "ethers";
import { EVMAuth } from "evmauth";
import config from "../config/index.js";
import { issueTokenPair, refreshAccessToken } from "./tokenManager.js";
import { logAuth } from "../utils/logger.js";

// 1) Set up a Radius provider and EVMAuth contract instance
const provider = new ethers.JsonRpcProvider(config.radiusRpc);
const evmAuth = new EVMAuth(config.evmAuthAddress, provider);

/**
 * issueJwt
 *  - Checks on-chain that `address` owns the required EVMAuth token
 *  - If yes, issues both access and refresh tokens
 *  - If no, throws an error
 */
export async function issueJwt(address: string, ip: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}> {
  try {
    // Log auth attempt
    logAuth.attempt(address, ip);
    
    // On-chain balance check
    const balance = await evmAuth.balanceOf(address, config.requiredTokenId);
    if (balance === 0n) {
      const error = `Wallet ${address} does not hold token ID ${config.requiredTokenId}`;
      logAuth.failure(address, error, ip);
      throw new Error(error);
    }

    // Issue token pair
    const tokens = await issueTokenPair(
      address,
      config.requiredTokenId,
      config.jwtSecret
    );
    
    // Log success
    logAuth.success(address, ip, tokens.jti);
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.accessTokenExp,
      refreshExpiresIn: tokens.refreshTokenExp
    };
  } catch (error) {
    if (error instanceof Error && !error.message.includes('does not hold token')) {
      logAuth.failure(address, error.message, ip);
    }
    throw error;
  }
}

/**
 * Refresh JWT tokens
 */
export async function refreshJwt(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}> {
  const tokens = await refreshAccessToken(refreshToken, config.jwtSecret);
  
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.accessTokenExp,
    refreshExpiresIn: tokens.refreshTokenExp
  };
}
