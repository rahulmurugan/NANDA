#!/usr/bin/env node

/**
 * Demo: How to use Starbucks Premium MCP Server
 * This shows the complete flow from discovery to usage
 */

import axios from 'axios';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

console.log(chalk.blue('\n🎮 Starbucks Premium MCP Usage Demo\n'));

async function demo() {
  try {
    // Step 1: Check server health
    console.log(chalk.yellow('1. Checking server availability...'));
    const health = await axios.get(`${SERVER_URL}/health`);
    console.log(chalk.green('✓ Server is healthy'));

    // Step 2: Discover service metadata
    console.log(chalk.yellow('\n2. Discovering service through NANDA metadata...'));
    const discovery = await axios.get(`${SERVER_URL}/metadata/discovery`);
    const service = discovery.data.discovery;
    
    console.log(`✓ Found: ${service.service.name}`);
    console.log(`  Requires Auth: ${service.service.requiresAuth ? 'Yes' : 'No'}`);
    console.log(`  Tools: ${service.capabilities.tools.join(', ')}`);

    // Step 3: Check authentication requirements
    console.log(chalk.yellow('\n3. Checking authentication requirements...'));
    if (service.authentication) {
      console.log('  ' + service.authentication.instructions);
      console.log(`  Token Contract: ${service.authentication.tokenInfo.contract}`);
      console.log(`  Token ID: ${service.authentication.tokenInfo.tokenId}`);
    }

    // Step 4: Simulate authentication attempt
    console.log(chalk.yellow('\n4. Attempting authentication...'));
    const testWallet = '0x3BE5BcE56D46D04e3E1351616A0bDdBBDa240e69';
    
    try {
      const authResponse = await axios.post(`${SERVER_URL}/auth`, {
        address: testWallet
      });
      
      console.log(chalk.green('✓ Authentication successful!'));
      console.log('  Access Token: ' + authResponse.data.accessToken.substring(0, 20) + '...');
      console.log('  Expires In: ' + authResponse.data.expiresIn + ' seconds');
      
      // Step 5: Use the MCP endpoint
      console.log(chalk.yellow('\n5. Accessing MCP endpoint with JWT...'));
      const mcpResponse = await axios.post(`${SERVER_URL}/mcp`, {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 1
      }, {
        headers: {
          'Authorization': `Bearer ${authResponse.data.accessToken}`
        }
      });
      
      console.log(chalk.green('✓ Successfully accessed MCP endpoint!'));
      console.log('  Available tools:', mcpResponse.data);
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(chalk.red('✗ Authentication failed'));
        console.log(chalk.yellow(`  Reason: ${error.response.data.error}`));
        console.log(chalk.gray('\n  This is expected if the wallet doesn\'t own the required token.'));
        
        // Show how to configure MCP client
        console.log(chalk.yellow('\n5. MCP Client Configuration:'));
        console.log(chalk.gray('  Even without a token, here\'s how you would configure your MCP client:\n'));
        
        const configPath = path.join(process.cwd(), 'examples/nanda-mcp-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        
        console.log(chalk.cyan('  For Claude Desktop:'));
        console.log('  Add this to ~/Library/Application Support/Claude/claude_desktop_config.json:\n');
        console.log(JSON.stringify({
          mcpServers: {
            'starbucks-premium': config.mcpServers['starbucks-premium']
          }
        }, null, 2));
      } else {
        throw error;
      }
    }

    // Step 6: Show next steps
    console.log(chalk.yellow('\n6. Next Steps:'));
    console.log('  1. Acquire the required token on Radius blockchain');
    console.log('  2. Get your JWT using the /auth endpoint');
    console.log('  3. Configure your MCP client with the JWT');
    console.log('  4. Start using the requestinfo tool to get Starbucks data');
    
    // Show example requests
    console.log(chalk.yellow('\n7. Example MCP Requests:'));
    console.log(chalk.gray('\n  Get company overview:'));
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'requestinfo',
        arguments: {
          category: 'overview'
        }
      },
      id: 1
    }, null, 2));

  } catch (error) {
    console.error(chalk.red('\n✗ Error:'), error.message);
  }
}

// Run the demo
demo();