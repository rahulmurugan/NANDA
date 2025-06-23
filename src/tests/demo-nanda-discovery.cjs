/**
 * NANDA Discovery Demo
 * This simulates how an AI agent would discover and access our token-gated MCP server
 */

const axios = require('axios');

// Simulated NANDA Registry (in reality, this would be queried from ui.nanda-registry.com)
const NANDA_REGISTRY = {
  services: [
    {
      id: 'starbucks-premium-mcp',
      name: 'Starbucks Premium MCP Server',
      description: 'Token-gated access to Starbucks company data',
      endpoint: 'http://localhost:3000/mcp',
      authentication: {
        required: true,
        type: 'evmauth',
        blockchain: 'radius',
        contractAddress: '0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96',
        requiredTokenId: '0',
        authEndpoint: 'http://localhost:3000/auth'
      },
      tools: ['requestinfo'],
      categories: ['company-data', 'premium', 'food-beverage']
    },
    {
      id: 'google-public-mcp',
      name: 'Google Public MCP Server',
      description: 'Free access to Google company information',
      endpoint: 'https://google-mcp.example.com/mcp',
      authentication: {
        required: false
      },
      tools: ['requestinfo'],
      categories: ['company-data', 'tech', 'free']
    }
  ]
};

// Simulated user wallet (in reality, this would come from user's wallet)
const USER_WALLET = {
  address: '0xf6F28Cf87ea064CdED8521eD8661AB6bDde84368', // Updated wallet with token ID 0
  tokens: {
    'radius': {
      '0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96': {
        '0': false  // User does NOT have the token by default
      }
    }
  }
};

class AIAgentWithNANDA {
  constructor() {
    this.registry = NANDA_REGISTRY;
    this.userWallet = USER_WALLET;
  }

  /**
   * Step 1: Search NANDA Registry
   */
  async searchServices(query) {
    console.log(`\n🔍 AI Agent: Searching NANDA for "${query}"...\n`);
    
    const results = this.registry.services.filter(service => 
      service.name.toLowerCase().includes(query.toLowerCase()) ||
      service.description.toLowerCase().includes(query.toLowerCase()) ||
      service.categories.some(cat => cat.includes(query.toLowerCase()))
    );

    console.log(`📋 Found ${results.length} service(s):\n`);
    results.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   Description: ${service.description}`);
      console.log(`   Categories: ${service.categories.join(', ')}`);
      console.log(`   Authentication: ${service.authentication.required ? '🔒 Required' : '🌐 Open'}`);
      if (service.authentication.required) {
        console.log(`   Token Required: ${service.authentication.blockchain} - Token ID ${service.authentication.requiredTokenId}`);
      }
      console.log('');
    });

    return results;
  }

  /**
   * Step 2: Check Access Requirements
   */
  async checkAccess(service) {
    console.log(`\n🔐 AI Agent: Checking access requirements for ${service.name}...\n`);

    if (!service.authentication.required) {
      console.log('✅ This service is open access - no authentication required!');
      return { hasAccess: true, reason: 'open' };
    }

    // Check if user has the required token
    const { blockchain, contractAddress, requiredTokenId } = service.authentication;
    const hasToken = this.userWallet.tokens[blockchain]?.[contractAddress]?.[requiredTokenId] || false;

    if (hasToken) {
      console.log('✅ User has the required token!');
      return { hasAccess: true, reason: 'token-owned' };
    } else {
      console.log('❌ User does NOT have the required token');
      console.log(`\n📝 To access this service, you need:`);
      console.log(`   - Token ID: ${requiredTokenId}`);
      console.log(`   - Contract: ${contractAddress}`);
      console.log(`   - Blockchain: ${blockchain}`);
      return { hasAccess: false, reason: 'token-required', requirements: service.authentication };
    }
  }

  /**
   * Step 3: Attempt to Access Service
   */
  async accessService(service, query) {
    console.log(`\n🤖 AI Agent: Attempting to access ${service.name}...\n`);

    const accessCheck = await this.checkAccess(service);

    if (!accessCheck.hasAccess) {
      return {
        success: false,
        message: `Cannot access ${service.name} - ${accessCheck.reason}`,
        suggestion: 'Please acquire the required token to access this premium service.',
        requirements: accessCheck.requirements
      };
    }

    // If we have access, simulate getting data
    if (accessCheck.reason === 'open') {
      // Direct access for open services
      return {
        success: true,
        data: `[Simulated data from ${service.name}]`,
        source: service.name
      };
    }

    // For token-gated services, we would:
    // 1. Get JWT from auth endpoint
    // 2. Use JWT to access MCP endpoint
    // 3. Return the data

    console.log('🔄 Getting authentication token...');
    console.log('✅ Authenticated successfully!');
    console.log('📊 Fetching requested data...');

    return {
      success: true,
      data: `[Premium data from ${service.name}]`,
      source: service.name,
      authenticated: true
    };
  }

  /**
   * Main conversation flow
   */
  async handleUserQuery(userQuery) {
    console.log('═'.repeat(60));
    console.log('🧑 User:', userQuery);
    console.log('═'.repeat(60));

    // Extract what the user is looking for
    const searchQuery = userQuery.toLowerCase().includes('starbucks') ? 'starbucks' : 'company';

    // Step 1: Search NANDA
    const services = await this.searchServices(searchQuery);

    if (services.length === 0) {
      console.log('❌ No services found matching your query.');
      return;
    }

    // Step 2: Try to access the first matching service
    const targetService = services[0];
    const result = await this.accessService(targetService, userQuery);

    // Step 3: Respond to user
    console.log('\n' + '═'.repeat(60));
    console.log('🤖 AI Agent Response:');
    console.log('═'.repeat(60) + '\n');

    if (result.success) {
      console.log(`I found the information you requested:\n`);
      console.log(result.data);
      console.log(`\nSource: ${result.source}`);
    } else {
      console.log(`I found a service that can provide this information, but I cannot access it:\n`);
      console.log(`Service: ${targetService.name}`);
      console.log(`Reason: ${result.message}\n`);
      console.log(result.suggestion);
      if (result.requirements) {
        console.log('\nAccess Requirements:');
        console.log(`- Blockchain: ${result.requirements.blockchain}`);
        console.log(`- Token Contract: ${result.requirements.contractAddress}`);
        console.log(`- Token ID: ${result.requirements.requiredTokenId}`);
        console.log(`\nYou can obtain this token and then ask me again.`);
      }
    }
  }
}

// Demo different scenarios
async function runDemo() {
  const agent = new AIAgentWithNANDA();

  console.log('\n🎮 NANDA Discovery Demo - Simulating AI Agent Behavior\n');
  console.log('This demo shows how an AI agent would:');
  console.log('1. Search the NANDA registry for services');
  console.log('2. Check authentication requirements');
  console.log('3. Access services or show token requirements\n');

  // Scenario 1: User asks for Starbucks data WITHOUT token
  console.log('\n' + '━'.repeat(60));
  console.log('SCENARIO 1: User WITHOUT Token');
  console.log('━'.repeat(60));
  await agent.handleUserQuery("Get me Starbucks company revenue data");

  console.log('\n\n' + '🔄'.repeat(30) + '\n\n');

  // Scenario 2: User asks for Google data (open access)
  console.log('━'.repeat(60));
  console.log('SCENARIO 2: Open Access Service');
  console.log('━'.repeat(60));
  await agent.handleUserQuery("Show me Google company information");

  console.log('\n\n' + '🔄'.repeat(30) + '\n\n');

  // Scenario 3: Simulate user WITH token
  console.log('━'.repeat(60));
  console.log('SCENARIO 3: User WITH Token');
  console.log('━'.repeat(60));
  console.log('📝 Simulating scenario where user HAS the required token...\n');
  agent.userWallet.tokens.radius['0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96']['0'] = true;
  await agent.handleUserQuery("Get me Starbucks company revenue data");

  console.log('\n\n' + '🔄'.repeat(30) + '\n\n');

  // Scenario 4: Real API test (if server is running)
  console.log('━'.repeat(60));
  console.log('SCENARIO 4: Real Server Test');
  console.log('━'.repeat(60));
  console.log('📡 Testing against real server metadata...\n');
  
  try {
    const response = await axios.get('http://localhost:3000/metadata/discovery');
    const discovery = response.data.discovery;
    
    console.log('✅ Successfully connected to real server!');
    console.log(`\nServer: ${discovery.service.name}`);
    console.log(`Requires Auth: ${discovery.service.requiresAuth ? 'Yes' : 'No'}`);
    
    if (discovery.authentication) {
      console.log('\nAuthentication Details:');
      console.log(`- ${discovery.authentication.instructions}`);
      console.log(`- Contract: ${discovery.authentication.tokenInfo.contract}`);
      console.log(`- Token ID: ${discovery.authentication.tokenInfo.tokenId}`);
    }
    
    console.log('\nAvailable Tools:', discovery.capabilities.tools.join(', '));
    console.log('Categories:', discovery.capabilities.categories.join(', '));
  } catch (error) {
    console.log('⚠️  Could not connect to real server. Make sure it\'s running on port 3000.');
    console.log('   Run: npm start');
  }
}

// Add interactive mode
async function interactiveMode() {
  const agent = new AIAgentWithNANDA();
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n🎮 NANDA Discovery - Interactive Mode\n');
  console.log('Commands:');
  console.log('  search <query>  - Search NANDA registry');
  console.log('  toggle token    - Toggle token ownership');
  console.log('  status          - Show current wallet status');
  console.log('  exit            - Exit interactive mode\n');

  const askQuestion = () => {
    rl.question('\n> ', async (input) => {
      const [command, ...args] = input.trim().split(' ');
      
      switch (command) {
        case 'search':
          const query = args.join(' ') || 'company';
          await agent.handleUserQuery(`Show me ${query} information`);
          break;
          
        case 'toggle':
          const hasToken = agent.userWallet.tokens.radius['0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96']['0'];
          agent.userWallet.tokens.radius['0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96']['0'] = !hasToken;
          console.log(`\n🔐 Token ownership: ${!hasToken ? 'ENABLED' : 'DISABLED'}`);
          break;
          
        case 'status':
          const tokenStatus = agent.userWallet.tokens.radius['0x5448Dc20ad9e0cDb5Dd0db25e814545d1aa08D96']['0'];
          console.log(`\n📊 Wallet Status:`);
          console.log(`   Address: ${agent.userWallet.address}`);
          console.log(`   Has Starbucks Token: ${tokenStatus ? 'Yes ✅' : 'No ❌'}`);
          break;
          
        case 'exit':
          console.log('\n👋 Goodbye!');
          rl.close();
          return;
          
        default:
          console.log('\n❓ Unknown command. Try: search, toggle, status, or exit');
      }
      
      askQuestion();
    });
  };

  askQuestion();
}

// Check command line arguments
const args = process.argv.slice(2);
if (args[0] === '--interactive' || args[0] === '-i') {
  interactiveMode();
} else {
  // Run the demo
  runDemo().catch(console.error);
}