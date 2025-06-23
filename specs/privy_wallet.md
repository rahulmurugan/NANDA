# Privy Wallet Integration Specification for EVMAuth MCP Server

## Executive Summary

This specification outlines the integration of Privy's authentication and wallet infrastructure into our EVMAuth-protected MCP server. Privy will enhance user experience by providing multiple authentication methods while maintaining our core token-gating functionality on the Radius blockchain.

## 1. Overview

### 1.1 Current State
- Users must know their wallet address
- Direct wallet interaction required
- Technical barrier for non-crypto users
- Manual wallet management

### 1.2 Enhanced State with Privy
- Multiple login methods (email, social, wallet)
- Automatic wallet creation and management
- Seamless user experience
- Maintained EVMAuth token-gating

## 2. Architecture

### 2.1 Current Authentication Flow
```
User provides wallet address
    ↓
Server checks EVMAuth token on Radius
    ↓
If token exists → Issue JWT
    ↓
Access MCP endpoints
```

### 2.2 Enhanced Flow with Privy
```
User logs in via Privy (email/social/wallet)
    ↓
Privy provides/creates wallet
    ↓
Server gets wallet address from Privy
    ↓
Server checks EVMAuth token on Radius
    ↓
If token exists → Issue JWT
    ↓
Access MCP endpoints
```

## 3. Technical Integration

### 3.1 Dependencies
```json
{
  "@privy-io/server-auth": "latest",
  "existing-dependencies": "..."
}
```

### 3.2 Environment Configuration
```env
# Existing config
RADIUS_RPC=https://rpc.stg.tryradi.us/
EVMAUTH_ADDRESS=0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96
JWT_SECRET=your-jwt-secret

# New Privy config
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
PRIVY_VERIFICATION_KEY=your-verification-key
```

### 3.3 New Endpoints

#### POST /auth/privy/login
Initiates Privy authentication flow
```typescript
interface PrivyLoginRequest {
  authMethod: 'email' | 'social' | 'wallet';
  identifier: string; // email, social ID, or wallet address
}

interface PrivyLoginResponse {
  privyToken: string;
  userId: string;
  walletAddress?: string;
}
```

#### POST /auth/privy/verify
Verifies Privy access token and gets user wallet
```typescript
interface PrivyVerifyRequest {
  privyToken: string;
}

interface PrivyVerifyResponse {
  valid: boolean;
  userId: string;
  walletAddress: string;
  hasEvmAuthToken: boolean;
}
```

#### POST /auth/privy/link-wallet
Links existing wallet to Privy user
```typescript
interface LinkWalletRequest {
  privyToken: string;
  walletAddress: string;
  signature: string; // Proof of wallet ownership
}
```

### 3.4 Modified Authentication Flow

```typescript
// Enhanced auth handler
async function enhancedAuthHandler(req: Request, res: Response) {
  const { privyToken, walletAddress } = req.body;
  
  // Option 1: Direct wallet address (backward compatible)
  if (walletAddress && !privyToken) {
    return originalAuthHandler(req, res);
  }
  
  // Option 2: Privy authentication
  if (privyToken) {
    // Verify Privy token
    const privyUser = await verifyPrivyToken(privyToken);
    
    // Get user's wallet (created or existing)
    const userWallet = await getPrivyUserWallet(privyUser.id);
    
    // Check EVMAuth token
    const hasToken = await checkEvmAuthToken(userWallet.address);
    
    if (hasToken) {
      // Issue JWT
      return issueJWT(userWallet.address);
    } else {
      // Return token acquisition instructions
      return tokenRequiredResponse(userWallet.address);
    }
  }
}
```

## 4. User Experience Flows

### 4.1 New User Journey (No Crypto Experience)
1. User clicks "Login with Email"
2. Enters email and receives magic link
3. Privy creates embedded wallet automatically
4. System checks for EVMAuth token (likely none)
5. Shows clear instructions: "To access premium content, you need a Starbucks Access Token"
6. Provides token acquisition options
7. Once token acquired, user can access service

### 4.2 Existing Crypto User Journey
1. User clicks "Connect Wallet"
2. Connects MetaMask/WalletConnect via Privy
3. System checks EVMAuth token ownership
4. If token exists, immediate access granted
5. If not, shows token acquisition instructions

### 4.3 AI Agent Integration
```javascript
// AI Agent pseudocode
const user = await promptUserForPrivyLogin();
const privyToken = await user.authenticate();
const mcpAccess = await checkMCPAccess(privyToken);

if (mcpAccess.hasToken) {
  const data = await fetchStarbucksData(mcpAccess.jwt);
  return presentDataToUser(data);
} else {
  return promptTokenAcquisition(mcpAccess.instructions);
}
```

## 5. Security Considerations

### 5.1 Token Verification
- All Privy tokens must be verified server-side
- Wallet ownership must be cryptographically proven
- EVMAuth checks remain unchanged

### 5.2 Session Management
- Privy sessions integrated with JWT system
- Refresh tokens work across both systems
- Logout invalidates all tokens

### 5.3 Privacy
- User emails/social IDs never exposed to blockchain
- Wallet addresses only used for EVMAuth verification
- Privy handles PII securely

## 6. Benefits

### 6.1 For Users
- **Lower Barrier**: No crypto knowledge required
- **Familiar UX**: Email/social login
- **Wallet Management**: Privy handles complexity
- **Security**: Professional wallet infrastructure

### 6.2 For Developers
- **Broader Audience**: Accessible to non-crypto users
- **Simplified Integration**: Privy SDK handles complexity
- **Maintained Security**: EVMAuth still enforces access
- **Analytics**: Better user insights

### 6.3 For AI Agents
- **Easier Onboarding**: Guide users through familiar flows
- **Better Success Rate**: Users more likely to complete auth
- **Clear Instructions**: Privy provides structured responses

## 7. Implementation Checklist

- [ ] Install Privy SDK
- [ ] Configure Privy credentials
- [ ] Create Privy authentication endpoints
- [ ] Modify existing auth to support Privy
- [ ] Update frontend (if applicable)
- [ ] Test all authentication flows
- [ ] Update documentation
- [ ] Add Privy-specific tests
- [ ] Deploy and monitor

## 8. Testing Strategy

### 8.1 Unit Tests
- Privy token verification
- Wallet retrieval logic
- EVMAuth integration with Privy wallets

### 8.2 Integration Tests
- Email login → wallet creation → EVMAuth check
- Social login flows
- Existing wallet connection
- Token refresh flows

### 8.3 E2E Tests
- Complete user journeys
- AI agent integration scenarios
- Error handling and edge cases

## 9. Migration Strategy

### 9.1 Backward Compatibility
- Existing wallet-based auth continues to work
- No breaking changes to current API
- Gradual user migration

### 9.2 Dual Support Period
- Both auth methods supported simultaneously
- Users can link existing wallets to Privy accounts
- Clear communication about benefits

## 10. Future Enhancements

### 10.1 Multi-Chain Support
- Extend beyond Radius blockchain
- Support multiple EVMAuth contracts
- Cross-chain token verification

### 10.2 Advanced Features
- Social recovery for wallets
- Multi-factor authentication
- Delegated access for teams

### 10.3 Analytics Integration
- User behavior tracking
- Token adoption metrics
- Conversion funnel optimization

## Appendix A: Privy SDK Key Methods

```typescript
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(appId, appSecret);

// Verify access token
const user = await privy.verifyAuthToken(token);

// Get user by ID
const userData = await privy.getUser(userId);

// Get user's wallets
const wallets = await privy.getUserWallets(userId);

// Create embedded wallet
const wallet = await privy.createWallet(userId);
```

## Appendix B: Error Handling

```typescript
enum PrivyErrorCodes {
  INVALID_TOKEN = 'PRIVY_INVALID_TOKEN',
  USER_NOT_FOUND = 'PRIVY_USER_NOT_FOUND',
  WALLET_CREATION_FAILED = 'PRIVY_WALLET_FAILED',
  TOKEN_EXPIRED = 'PRIVY_TOKEN_EXPIRED'
}

function handlePrivyError(error: PrivyError): APIResponse {
  switch (error.code) {
    case PrivyErrorCodes.INVALID_TOKEN:
      return { status: 401, message: 'Invalid authentication token' };
    case PrivyErrorCodes.WALLET_CREATION_FAILED:
      return { status: 500, message: 'Failed to create wallet' };
    // ... other cases
  }
}
```

This specification provides a complete blueprint for integrating Privy while maintaining the core EVMAuth token-gating functionality on Radius blockchain.