import dotenv from 'dotenv';
import ChromeDevToolsMCPServer from './server.js';

// Load environment variables
dotenv.config();

async function testClaudeIntegration() {
  console.log('🧪 Testing Claude Integration...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`- ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`- CLAUDE_ANALYSIS_ENABLED: ${process.env.CLAUDE_ANALYSIS_ENABLED || 'not set'}`);
  console.log(`- CLAUDE_MODEL: ${process.env.CLAUDE_MODEL || 'not set'}`);
  console.log();
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in .env file!');
    console.log('\nMake sure your .env file contains:');
    console.log('ANTHROPIC_API_KEY=sk-ant-api03-...');
    console.log('CLAUDE_ANALYSIS_ENABLED=true');
    return;
  }
  
  // Create server instance
  const server = new ChromeDevToolsMCPServer();
  
  try {
    // Test 1: Basic problem
    console.log('🔍 Test 1: Basic TypeError');
    const response1 = await server.callTool('suggest_debugging_strategy', {
      problemDescription: 'TypeError: Cannot read property "name" of undefined in React component'
    });
    
    console.log('Result:', {
      success: response1.success,
      problemType: response1.problemCategory?.type,
      strategiesCount: response1.strategies?.length,
      firstStrategyName: response1.strategies?.[0]?.name
    });
    
    // Check if Claude strategy is present (it will have 'claude-' prefix in ID)
    const hasClaudeStrategy = response1.strategies?.some((s: any) => s.id.startsWith('claude-'));
    console.log(`Claude Strategy: ${hasClaudeStrategy ? '✅ Present' : '❌ Not found'}`);
    console.log();
    
    // Test 2: Complex problem
    console.log('🔍 Test 2: Complex Performance Issue');
    const response2 = await server.callTool('suggest_debugging_strategy', {
      problemDescription: 'React app becomes unresponsive after 5 minutes of use, memory usage increases from 50MB to 2GB'
    });
    
    console.log('Result:', {
      success: response2.success,
      problemType: response2.problemCategory?.type,
      confidence: response2.problemCategory?.confidence,
      hasClaudeEnhancement: response2.strategies?.some((s: any) => s.id.startsWith('claude-'))
    });
    
    if (response2.strategies?.[0]?.id.startsWith('claude-')) {
      console.log('\n📝 Claude Strategy Details:');
      const claudeStrategy = response2.strategies[0];
      console.log(`Name: ${claudeStrategy.name}`);
      console.log(`Steps: ${claudeStrategy.steps.length}`);
      console.log('First 3 steps:');
      claudeStrategy.steps.slice(0, 3).forEach((step: any, i: number) => {
        console.log(`  ${i + 1}. ${step.description} (using ${step.tool})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Clean up
    const cleanupInterval = (server as any).cleanupInterval;
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  }
}

// Run the test
console.log('Chrome Lens v1.2 - Claude Integration Test\n');
testClaudeIntegration().catch(console.error);