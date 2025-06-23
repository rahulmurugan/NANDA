import { ethers } from "ethers";
import { EVMAuth } from "evmauth";
import config from "../config/index.js";
import { issueTokenPair } from "./tokenManager.js";
import { logAuth } from "../utils/logger.js";

// Dynamic auth request interface
export interface DynamicAuthRequest {
  wallet: string;
  contract: string;
  tokenId: number;
}

/**
 * Dynamic JWT issuer that can verify any contract on Radius
 * Uses the existing Radius RPC but accepts any contract address
 */
export async function issueDynamicJwt(
  authRequest: DynamicAuthRequest,
  ip: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}> {
  try {
    const { wallet, contract, tokenId } = authRequest;
    
    // Log auth attempt
    logAuth.attempt(wallet, ip);
    
    // Validate inputs
    if (!ethers.isAddress(wallet)) {
      throw new Error("Invalid wallet address");
    }
    
    if (!ethers.isAddress(contract)) {
      throw new Error("Invalid contract address");
    }
    
    if (tokenId < 0 || !Number.isInteger(tokenId)) {
      throw new Error("Invalid token ID");
    }
    
    // Use the same Radius RPC from config
    const provider = new ethers.JsonRpcProvider(config.radiusRpc);
    
    // Create EVMAuth instance with the provided contract
    const evmAuth = new EVMAuth(contract, provider);
    
    // Check balance for the specified token ID
    const balance = await evmAuth.balanceOf(wallet, tokenId);
    
    if (balance === 0n) {
      const error = `Wallet ${wallet} does not hold token ID ${tokenId} on contract ${contract}`;
      logAuth.failure(wallet, error, ip);
      throw new Error(error);
    }
    
    // Issue token pair with contract details embedded
    const tokens = await issueTokenPair(
      wallet,
      tokenId,
      config.jwtSecret,
      {
        contract: contract,
        issuedFor: "Starbucks Premium MCP"
      }
    );
    
    // Log success with contract info
    logAuth.success(wallet, ip, tokens.jti);
    console.log(`✅ Dynamic auth successful - Wallet: ${wallet}, Contract: ${contract}, Token: ${tokenId}`);
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.accessTokenExp,
      refreshExpiresIn: tokens.refreshTokenExp
    };
  } catch (error) {
    if (error instanceof Error) {
      logAuth.failure(authRequest.wallet, error.message, ip);
    }
    throw error;
  }
}

/**
 * Refresh JWT tokens (reuse existing function)
 */
export { refreshJwt } from "./jwtIssuer.js";