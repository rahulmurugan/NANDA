// import { Request, Response, NextFunction } from "express";

// // Temporary stub middleware
// export function evmAuthMiddleware(
//   _req: Request,
//   res: Response,
//   _next: NextFunction
// ) {
//   // Always reject until real logic is in place
//   return res
//     .status(501)
//     .json({ error: "EVMAuth middleware not implemented yet" });
// }

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { isTokenRevoked } from "./tokenManager.js";
import { logMcp, logSecurity } from "../utils/logger.js";

// Extend Request type to include JWT payload
declare global {
  namespace Express {
    interface Request {
      jwtPayload?: any;
    }
  }
}

/**
 * evmAuthMiddleware
 * - Expects Authorization: Bearer <JWT>
 * - Verifies signature with jwtSecret
 * - Checks if token is revoked
 * - Confirms tokenId matches config.requiredTokenId
 * - If all good → next()
 * - Otherwise → 401 Unauthorized
 */
export function evmAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload: any = jwt.verify(token, config.jwtSecret);

    // Check if token is an access token
    if (payload.type !== 'access') {
      logSecurity.suspiciousActivity(
        req.ip || 'unknown',
        'Non-access token used for API access',
        { tokenType: payload.type }
      );
      return res.status(401).json({ error: "Invalid token type" });
    }

    // Check if token is revoked
    if (payload.jti && isTokenRevoked(payload.jti)) {
      logSecurity.suspiciousActivity(
        req.ip || 'unknown',
        'Revoked token usage attempt',
        { jti: payload.jti, address: payload.sub }
      );
      return res.status(401).json({ error: "Token has been revoked" });
    }

    // For dynamic auth, we accept any tokenId as long as it was verified
    // The contract field in JWT tells us which contract was used
    if (payload.contract) {
      // Dynamic auth - log which contract was used
      console.log(`✅ Dynamic auth JWT - Contract: ${payload.contract}, Token: ${payload.tokenId}`);
    } else if (payload.tokenId !== config.requiredTokenId) {
      // Legacy auth - check against hardcoded token ID
      return res.status(401).json({ error: "Invalid tokenId in JWT" });
    }

    // Attach payload to request for downstream use
    req.jwtPayload = payload;

    // Log the request
    const sessionId = req.headers['mcp-session-id'] as string || 'no-session';
    logMcp.request(sessionId, req.method);

    // All good ➜ let the request reach /mcp handler
    return next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired" });
    } else if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(401).json({ error: "Authentication failed" });
  }
}
