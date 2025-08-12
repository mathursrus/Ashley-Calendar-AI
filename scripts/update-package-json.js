#!/usr/bin/env node

// Script to add future-proof test command to package.json
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
    // Read current package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add future-proof test script
    packageJson.scripts.test = 'bash scripts/run-tests.sh';
    
    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log('✅ Successfully added future-proof test script to package.json');
    console.log('📋 Test script: bash scripts/run-tests.sh');
    console.log('🔮 Future-proof: automatically discovers test-*.ts files');
    
} catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    process.exit(1);
}