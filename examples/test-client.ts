#!/usr/bin/env tsx

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function testMcpServer() {
  try {
    console.log('🔌 Connecting to Project NANDA MCP Server...');
    
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    const transport = new StreamableHTTPClientTransport(
      new URL('http://localhost:3000/mcp')
    );

    await client.connect(transport);
    console.log('✅ Connected successfully!');

    // Test the requestinfo tool with different categories
    const categories = ['all', 'overview', 'focus', 'contact', 'investment'];
    
    for (const category of categories) {
      console.log(`\n📊 Testing category: ${category}`);
      console.log('=' + '='.repeat(50));
      
      const result = await client.callTool({
        name: 'requestinfo',
        arguments: { category }
      });

      if (result.content && result.content[0] && result.content[0].type === 'text') {
        console.log(result.content[0].text);
      }
    }

    console.log('\n🎉 All tests completed successfully!');
    
    // Clean up
    await transport.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the test
testMcpServer(); 