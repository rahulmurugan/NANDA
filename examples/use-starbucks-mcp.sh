#!/bin/bash
# Example: Using Starbucks Premium MCP Server

# Step 1: Get JWT token (replace with your wallet address)
echo "Getting JWT token..."
RESPONSE=$(curl -s -X POST http://localhost:3000/auth \
  -H "Content-Type: application/json" \
  -d '{"address": "0x3BE5BcE56D46D04e3E1351616A0bDdBBDa240e69"}')

# Extract tokens (requires jq)
export STARBUCKS_JWT_TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.refreshToken')

if [ -z "$STARBUCKS_JWT_TOKEN" ] || [ "$STARBUCKS_JWT_TOKEN" = "null" ]; then
  echo "Failed to get JWT token. Make sure you own the required token."
  exit 1
fi

echo "Successfully authenticated!"

# Step 2: Make MCP request
echo "Requesting Starbucks company overview..."
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STARBUCKS_JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "requestinfo",
      "arguments": {
        "category": "overview"
      }
    },
    "id": 1
  }'
