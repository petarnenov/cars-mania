#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function setupGitHooks() {
  const hooksDir = path.join(__dirname, '..', '.git', 'hooks');
  const preCommitHook = path.join(hooksDir, 'pre-commit');
  const preCommitScript = path.join(__dirname, 'pre-commit.js');
  
  // Create hooks directory if it doesn't exist
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }
  
  // Create pre-commit hook
  const hookContent = `#!/bin/sh
# Auto-generated pre-commit hook for versioning
node "${preCommitScript}"
`;
  
  try {
    fs.writeFileSync(preCommitHook, hookContent);
    fs.chmodSync(preCommitHook, '755');
    
    console.log('✅ Git hooks set up successfully!');
    console.log('📝 Pre-commit hook will automatically bump versions');
    console.log('🔧 To disable automatic versioning, remove .git/hooks/pre-commit');
  } catch (error) {
    console.error('❌ Failed to set up Git hooks:', error.message);
    process.exit(1);
  }
}

function checkGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function main() {
  if (!checkGitRepo()) {
    console.error('❌ Not a Git repository. Please run this from a Git repository.');
    process.exit(1);
  }
  
  console.log('🔧 Setting up Git hooks for automatic versioning...');
  setupGitHooks();
}

if (require.main === module) {
  main();
}
