# Starbucks Premium MCP Server with Flexible EVMAuth

## 🚀 Overview

This is a **Model Context Protocol (MCP) server** that provides Starbucks company information through a token-gated API. The server uses EVMAuth on Radius blockchain for authentication and is designed to be registered on the NANDA registry for AI agent discovery.

### Key Features

- **Flexible EVMAuth Authentication**: Accepts ANY EVMAuth contract on Radius blockchain
- **MCP Protocol**: Compatible with Claude and other AI assistants
- **JWT Session Management**: Efficient authentication with refresh tokens
- **NANDA Registry Ready**: Full metadata and discovery endpoints
- **Production Security**: Rate limiting, CORS, and comprehensive logging

## 🔐 How Authentication Works

This server implements a flexible authentication system that works with ANY EVMAuth token on Radius:

```
1. User provides: wallet address + contract address + token ID
2. Server verifies ownership on Radius blockchain
3. If valid → Issues JWT for session management
4. JWT grants access to Starbucks data via MCP
```

### Authentication Endpoints

#### Dynamic Authentication (Recommended)
```bash
POST /auth/dynamic
{
  "wallet": "0xYourWalletAddress",
  "contract": "0xAnyEVMAuthContract",
  "tokenId": 42
}
```

#### Legacy Authentication
```bash
POST /auth
{
  "address": "0xYourWalletAddress"
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- A wallet with any EVMAuth token on Radius blockchain

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd hackathon

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Build the TypeScript code
npm run build

# Start the server
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Server information and available endpoints
- `GET /health` - Health check endpoint
- `POST /auth/dynamic` - Flexible authentication with any EVMAuth contract
- `POST /auth` - Legacy authentication (uses default contract)
- `POST /auth/refresh` - Refresh JWT tokens
- `POST /mcp` - MCP protocol endpoint (requires JWT)

### Metadata Endpoints (for NANDA)
- `GET /metadata` - General server metadata
- `GET /metadata/discovery` - Service discovery information
- `GET /metadata/nanda` - NANDA registry format
- `GET /metadata/requirements` - Authentication requirements
- `GET /metadata/tools` - Available MCP tools

## 🛠️ MCP Tools Available

### `requestinfo` Tool
Retrieves Starbucks company information in various categories:
- `overview` - Company description and overview
- `focus` - Focus areas and strategic priorities
- `investment` - Investment details and financials
- `contact` - Contact information
- `all` - Complete information

## 🌐 NANDA Registry Integration

This server is designed to be registered on the NANDA registry, enabling AI agents to:
1. Discover the service when searching for company data
2. Understand authentication requirements
3. Access the service with proper credentials

### Registration Process
1. Deploy the server to a public URL (e.g., Railway)
2. Visit https://ui.nanda-registry.com/
3. Register your service using metadata from `/metadata/nanda`
4. AI agents can now discover and use your service

## 🔧 Configuration

### Environment Variables
Create a `.env` file with:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-secret-key-here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Blockchain Configuration
RADIUS_RPC=https://rpc.stg.tryradi.us/
EVMAUTH_ADDRESS=0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96
REQUIRED_TOKEN_ID=0
```

## 📦 Deployment

### Railway (Recommended)
1. Push code to GitHub
2. Connect Railway to your repository
3. Set environment variables in Railway dashboard
4. Deploy automatically

### Docker
```bash
docker build -t starbucks-mcp .
docker run -p 3000:3000 --env-file .env starbucks-mcp
```

## 🧪 Testing

### Test Dynamic Authentication
```bash
curl -X POST http://localhost:3000/auth/dynamic \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "0xYourWallet",
    "contract": "0xAnyEVMAuthContract",
    "tokenId": 0
  }'
```

### Test with JWT
```bash
curl http://localhost:3000/mcp \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 🏗️ Architecture

```
├── src/
│   ├── auth/              # Authentication logic
│   │   ├── evmAuthMiddleware.ts
│   │   ├── jwtIssuer.ts
│   │   ├── jwtIssuerDynamic.ts
│   │   └── tokenManager.ts
│   ├── config/            # Configuration
│   ├── middleware/        # Express middleware
│   ├── nanda/            # NANDA registry integration
│   ├── routes/           # API routes
│   └── utils/            # Utilities
├── dist/                 # Compiled JavaScript
└── package.json
```

## 🔒 Security Features

- **Rate Limiting**: Protects against abuse
- **JWT Authentication**: Secure session management
- **Token Revocation**: Support for blacklisting tokens
- **Input Validation**: Validates all user inputs
- **CORS Configuration**: Controlled cross-origin access
- **Comprehensive Logging**: Security and audit logs

## 🤝 Use Cases

1. **Multi-Company Access**: Different companies can grant access using their own EVMAuth tokens
2. **Partner Integration**: Partners can use their contracts for access control
3. **Tiered Access**: Different token IDs can represent different access levels
4. **DAO Governance**: DAOs can control access through their token contracts

## 📝 License

MIT

## 🙏 Acknowledgments

Built for the NANDA ecosystem to demonstrate token-gated AI services on Radius blockchain.