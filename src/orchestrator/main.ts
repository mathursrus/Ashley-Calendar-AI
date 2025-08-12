// Main entry point for Ashley Calendar AI Orchestrator

import { AshleyOrchestrator } from './ashley-orchestrator';

async function main() {
  console.log('🎯 Ashley Calendar AI Orchestrator');
  console.log('='.repeat(50));

  try {
    const orchestrator = new AshleyOrchestrator();

    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--once')) {
      // Run once and exit (for testing)
      await orchestrator.runOnce();
    } else {
      // Start continuous monitoring
      const intervalMinutes = parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || '1');
      await orchestrator.start(intervalMinutes);
    }

  } catch (error) {
    console.error('💥 Fatal error in Ashley Orchestrator:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Ashley Orchestrator shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Ashley Orchestrator shutting down gracefully...');
  process.exit(0);
});

// Start the orchestrator
if (require.main === module) {
  main().catch(console.error);
}

export { main };
