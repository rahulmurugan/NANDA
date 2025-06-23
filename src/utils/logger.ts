import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about the colors
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console(),
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  // File transport for all logs
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

// Security-focused logging functions
export const logAuth = {
  attempt: (address: string, ip: string, userAgent?: string) => {
    logger.info(`Auth attempt`, {
      type: 'AUTH_ATTEMPT',
      address,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  },
  
  success: (address: string, ip: string, jti?: string) => {
    logger.info(`Auth success`, {
      type: 'AUTH_SUCCESS',
      address,
      ip,
      jti,
      timestamp: new Date().toISOString()
    });
  },
  
  failure: (address: string, reason: string, ip: string) => {
    logger.warn(`Auth failed`, {
      type: 'AUTH_FAILURE',
      address,
      reason,
      ip,
      timestamp: new Date().toISOString()
    });
  },
  
  jwtIssued: (address: string, exp: number, jti?: string) => {
    logger.info(`JWT issued`, {
      type: 'JWT_ISSUED',
      address,
      exp,
      jti,
      timestamp: new Date().toISOString()
    });
  },
  
  jwtRefreshed: (address: string, oldJti?: string, newJti?: string) => {
    logger.info(`JWT refreshed`, {
      type: 'JWT_REFRESHED',
      address,
      oldJti,
      newJti,
      timestamp: new Date().toISOString()
    });
  },
  
  jwtRevoked: (jti: string, address: string) => {
    logger.warn(`JWT revoked`, {
      type: 'JWT_REVOKED',
      jti,
      address,
      timestamp: new Date().toISOString()
    });
  }
};

export const logMcp = {
  request: (sessionId: string, method: string, tool?: string) => {
    logger.http(`MCP request`, {
      type: 'MCP_REQUEST',
      sessionId,
      method,
      tool,
      timestamp: new Date().toISOString()
    });
  },
  
  response: (sessionId: string, status: number, duration: number) => {
    logger.http(`MCP response`, {
      type: 'MCP_RESPONSE',
      sessionId,
      status,
      duration,
      timestamp: new Date().toISOString()
    });
  },
  
  error: (sessionId: string, error: any) => {
    logger.error(`MCP error`, {
      type: 'MCP_ERROR',
      sessionId,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};

export const logSecurity = {
  rateLimitExceeded: (key: string, endpoint: string) => {
    logger.warn(`Rate limit exceeded`, {
      type: 'RATE_LIMIT_EXCEEDED',
      key,
      endpoint,
      timestamp: new Date().toISOString()
    });
  },
  
  suspiciousActivity: (ip: string, reason: string, details?: any) => {
    logger.error(`Suspicious activity detected`, {
      type: 'SUSPICIOUS_ACTIVITY',
      ip,
      reason,
      details,
      timestamp: new Date().toISOString()
    });
  }
};

export default logger;