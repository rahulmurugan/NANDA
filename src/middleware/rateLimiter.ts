import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Custom key generator that uses wallet address from JWT if available
const getKey = (req: Request): string => {
  // Try to get wallet address from JWT payload if it exists
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      // Decode without verification just to get the address for rate limiting
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      if (payload.sub) {
        return payload.sub; // Use wallet address as key
      }
    } catch (e) {
      // Fall through to IP-based limiting
    }
  }
  
  // Fallback to IP address
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Rate limiter for authentication endpoint
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per window
  message: 'Too many authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

// Rate limiter for MCP endpoints - more permissive
export const mcpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute (can be adjusted based on token tier)
  message: 'Too many requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getKey,
  skip: (_req: Request) => {
    // Could implement tier-based rate limiting here
    // For now, apply to all requests
    return false;
  }
});

// Rate limiter for general endpoints
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});