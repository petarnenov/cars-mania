#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Failed to get staged files:', error.message);
    return [];
  }
}

function shouldBumpVersion(stagedFiles) {
  // Check if any source files were modified (excluding version files themselves)
  const sourcePatterns = [
    'src/',
    'backend/src/',
    'frontend/src/',
    'tests/',
    'backend/tests/',
    'frontend/tests/',
    'package.json',
    'backend/package.json',
    'frontend/package.json'
  ];
  
  return stagedFiles.some(file => 
    sourcePatterns.some(pattern => file.includes(pattern))
  );
}

function getCommitMessage() {
  try {
    const output = execSync('git log -1 --pretty=%B', { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error('Failed to get commit message:', error.message);
    return '';
  }
}

function main() {
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.log('No files staged, skipping version bump');
    return;
  }
  
  if (!shouldBumpVersion(stagedFiles)) {
    console.log('No source files modified, skipping version bump');
    return;
  }
  
  const commitMessage = getCommitMessage();
  process.env.COMMIT_MESSAGE = commitMessage;
  
  console.log('🔄 Running automatic version bump...');
  
  try {
    const versionScript = path.join(__dirname, 'version.js');
    execSync(`node ${versionScript}`, { stdio: 'inherit' });
    
    // Stage the updated package.json files
    execSync('git add backend/package.json frontend/package.json', { stdio: 'inherit' });
    
    console.log('✅ Version bump completed and staged');
  } catch (error) {
    console.error('❌ Version bump failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
