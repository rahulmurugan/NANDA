# EVMAuth-Protected MCP Server Specification

## Executive Summary

This specification outlines the architecture, implementation approach, and enhancement opportunities for building a Model Context Protocol (MCP) server protected by EVMAuth on the Radius blockchain. The primary goal is to demonstrate seamless integration between MCP services and blockchain-based authentication, creating a secure, decentralized access control system for AI-powered services.

## 1. Project Overview

### 1.1 Objective
Create a demonstration MCP server that:
- Requires users to own specific EVMAuth tokens on Radius blockchain for access
- Implements efficient JWT-based session management to minimize blockchain queries
- Provides a scalable authentication pattern for future MCP services
- Demonstrates NANDA integration capabilities

### 1.2 Key Components
- **MCP Server**: Express-based server implementing Model Context Protocol
- **EVMAuth Integration**: Token ownership verification on Radius blockchain
- **JWT Authentication**: Stateless session management for performance
- **Protected Endpoints**: MCP functionality accessible only to token holders

## 2. Current Architecture Analysis

### 2.1 Strengths of Current Approach
✅ **Efficient Authentication Flow**: Single blockchain verification followed by JWT issuance
✅ **Scalable Design**: JWT validation is computationally cheaper than repeated blockchain queries
✅ **Standard Protocols**: Uses industry-standard JWT for session management
✅ **Clean Separation**: Authentication logic is modular and reusable
✅ **MCP Compliance**: Follows MCP protocol specifications correctly

### 2.2 Architecture Flow

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Client    │────▶│  /auth API  │────▶│   Radius     │
│  (Wallet)   │     │  Endpoint   │     │  Blockchain  │
└─────────────┘     └─────────────┘     └──────────────┘
       │                    │                     │
       │                    │      Token Check    │
       │                    │◀────────────────────┘
       │                    │
       │      JWT Token     │
       │◀───────────────────┘
       │
       │     ┌─────────────┐
       │────▶│  /mcp API   │
       │     │  (Protected) │
       │     └─────────────┘
       ▼
   MCP Services
```

### 2.3 Security Model
1. **Initial Authentication**: Wallet address verification against EVMAuth contract
2. **Token Issuance**: Time-limited JWT with wallet address claim
3. **Session Management**: Stateless JWT validation on each request
4. **Access Control**: Token ownership determines service access

## 3. Validation Against Best Practices

### 3.1 ✅ Correct Approach Elements
- **Blockchain Optimization**: Checking once and issuing JWT is the right approach
- **Stateless Design**: JWT-based auth scales horizontally
- **Standard Protocols**: Using established auth patterns
- **Modular Architecture**: Clean separation of concerns

### 3.2 ⚠️ Areas for Improvement
- **Token Refresh**: No refresh token mechanism
- **Revocation**: No JWT blacklist for compromised tokens
- **Rate Limiting**: Missing protection against abuse
- **Monitoring**: No authentication metrics or logging

## 4. Proposed Enhancements

### 4.1 Immediate Improvements

#### A. Enhanced JWT Security
```typescript
interface EnhancedJWTPayload {
  address: string;
  tokenId: string;
  chainId: number;
  iat: number;
  exp: number;
  jti: string; // JWT ID for revocation
}
```

#### B. Rate Limiting
```typescript
// Add to middleware stack
import rateLimit from 'express-rate-limit';
 

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth attempts per window
  message: 'Too many authentication attempts'
});

app.post('/auth', authLimiter, authHandler);
```

#### C. Comprehensive Logging
```typescript
// Authentication events
logger.info('Auth attempt', { address, ip, userAgent });
logger.warn('Auth failed', { address, reason, ip });
logger.info('JWT issued', { address, jti, exp });
```

### 4.2 Advanced Features

#### A. Multi-Token Support
Allow access based on multiple token types or tiers:
```typescript
interface TokenRequirement {
  contractAddress: string;
  tokenId?: string;
  minBalance?: number;
  attributes?: Record<string, any>;
}
```

#### B. Dynamic Permission System
```typescript
interface MCPPermissions {
  tools: string[];        // Allowed MCP tools
  rateLimit: number;      // Requests per hour
  dataAccess: string[];   // Data categories
  priority: 'standard' | 'premium';
}
```

#### C. WebSocket Support
For real-time MCP communication:
```typescript
// Upgrade connection for authenticated users
wss.on('connection', (ws, req) => {
  const token = extractToken(req);
  if (validateJWT(token)) {
    handleMCPWebSocket(ws, token);
  }
});
```

### 4.3 Production Readiness

#### A. Environment Configuration
```typescript
// config/production.ts
export const config = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  redis: {
    url: process.env.REDIS_URL // For JWT blacklist
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN
  }
};
```

#### B. Health Checks
```typescript
app.get('/health/detailed', async (req, res) => {
  const checks = {
    server: 'ok',
    blockchain: await checkBlockchainConnection(),
    jwt: checkJWTService(),
    database: await checkDatabaseConnection()
  };
  
  res.json({ status: 'healthy', checks, timestamp: Date.now() });
});
```

## 5. Integration with NANDA

### 5.1 NANDA-Specific Considerations
- **Identity Layer**: EVMAuth provides decentralized identity
- **Access Control**: Token-gated access to NANDA services
- **Billing Integration**: Token balance could determine service tiers
- **Audit Trail**: On-chain verification provides transparency

### 5.2 Potential NANDA Extensions
1. **Service Discovery**: MCP tools registry protected by EVMAuth
2. **Usage Metering**: Track MCP calls per wallet address
3. **Dynamic Pricing**: Adjust service costs based on token holdings
4. **Governance**: Token holders vote on service parameters

## 6. Implementation Roadmap

### Phase 1: Core Functionality (Current)
- [x] Basic MCP server
- [x] EVMAuth integration
- [x] JWT authentication
- [x] Protected endpoints

### Phase 2: Security Enhancements 
- [ ] Rate limiting
- [ ] Comprehensive logging
- [ ] JWT refresh tokens
- [ ] Token revocation mechanism

### Phase 3: Advanced Features 
- [ ] Multi-token support
- [ ] Permission system
- [ ] WebSocket support
- [ ] Monitoring dashboard

### Phase 4: Production Deployment 
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation
- [ ] CI/CD pipeline

## 7. Testing Strategy

### 7.1 Unit Tests
```typescript
describe('EVMAuth Middleware', () => {
  it('should reject invalid JWT', async () => {
    const response = await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer invalid-token');
    expect(response.status).toBe(401);
  });
  
  it('should accept valid JWT', async () => {
    const token = generateTestJWT();
    const response = await request(app)
      .post('/mcp')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
  });
});
```

### 7.2 Integration Tests
- Test full auth flow from wallet to MCP access
- Verify blockchain integration under various conditions
- Test JWT expiration and refresh flows

### 7.3 Load Testing
```bash
# Using k6 for load testing
k6 run --vus 100 --duration 30s tests/load/auth-flow.js
```

## 8. Security Considerations

### 8.1 Attack Vectors
1. **JWT Theft**: Mitigated by short expiration times
2. **Replay Attacks**: Include nonce in JWT claims
3. **DDoS**: Rate limiting and CloudFlare protection
4. **Smart Contract Exploits**: Regular audits of EVMAuth contract

### 8.2 Best Practices
- Never log sensitive data (private keys, full JWTs)
- Use HTTPS in production
- Implement CORS properly
- Regular security audits
- Monitor for unusual patterns

## 9. Monitoring & Analytics

### 9.1 Key Metrics
- Authentication success/failure rates
- JWT issuance frequency
- MCP endpoint usage by wallet
- Response times and error rates

### 9.2 Alerting
- Failed auth attempts spike
- Blockchain connection issues
- High error rates
- Unusual usage patterns

## 10. Conclusion

The current implementation provides a solid foundation for demonstrating EVMAuth-protected MCP services. The architecture correctly optimizes blockchain interactions through JWT caching while maintaining security. The proposed enhancements will transform this demo into a production-ready system suitable for real-world NANDA integration.

### Next Steps
1. Implement immediate security improvements
2. Add comprehensive testing suite
3. Deploy to staging environment
4. Conduct security review
5. Plan production rollout

This specification serves as both validation of the current approach and a roadmap for building a robust, scalable authentication layer for MCP services in the NANDA ecosystem.