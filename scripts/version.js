#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Version increment types
const VERSION_TYPES = {
  PATCH: 'patch', // 1.0.0 -> 1.0.1 (bug fixes)
  MINOR: 'minor', // 1.0.0 -> 1.1.0 (new features)
  MAJOR: 'major'  // 1.0.0 -> 2.0.0 (breaking changes)
};

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

function incrementVersion(version, type = VERSION_TYPES.PATCH) {
  const parsed = parseVersion(version);
  
  switch (type) {
    case VERSION_TYPES.MAJOR:
      parsed.major++;
      parsed.minor = 0;
      parsed.patch = 0;
      break;
    case VERSION_TYPES.MINOR:
      parsed.minor++;
      parsed.patch = 0;
      break;
    case VERSION_TYPES.PATCH:
    default:
      parsed.patch++;
      break;
  }
  
  return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
}

function updatePackageVersion(packagePath, newVersion) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const oldVersion = packageJson.version;
    packageJson.version = newVersion;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ Updated ${path.basename(path.dirname(packagePath))}: ${oldVersion} -> ${newVersion}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update ${packagePath}:`, error.message);
    return false;
  }
}

function getCommitMessage() {
  const commitMsg = process.env.COMMIT_MESSAGE || '';
  const commitMsgLower = commitMsg.toLowerCase();
  
  // Determine version type based on commit message
  if (commitMsgLower.includes('breaking') || commitMsgLower.includes('major')) {
    return VERSION_TYPES.MAJOR;
  } else if (commitMsgLower.includes('feat') || commitMsgLower.includes('feature') || commitMsgLower.includes('minor')) {
    return VERSION_TYPES.MINOR;
  } else {
    return VERSION_TYPES.PATCH;
  }
}

function main() {
  const versionType = process.argv[2] || getCommitMessage();
  
  if (!Object.values(VERSION_TYPES).includes(versionType)) {
    console.error(`❌ Invalid version type: ${versionType}`);
    console.error(`Valid types: ${Object.values(VERSION_TYPES).join(', ')}`);
    process.exit(1);
  }
  
  console.log(`🚀 Bumping versions (${versionType})...`);
  
  const backendPath = path.join(__dirname, '..', 'backend', 'package.json');
  const frontendPath = path.join(__dirname, '..', 'frontend', 'package.json');
  
  // Read current versions
  const backendPackage = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
  const frontendPackage = JSON.parse(fs.readFileSync(frontendPath, 'utf8'));
  
  // Calculate new versions
  const newBackendVersion = incrementVersion(backendPackage.version, versionType);
  const newFrontendVersion = incrementVersion(frontendPackage.version, versionType);
  
  // Update package.json files
  const backendUpdated = updatePackageVersion(backendPath, newBackendVersion);
  const frontendUpdated = updatePackageVersion(frontendPath, newFrontendVersion);
  
  if (backendUpdated && frontendUpdated) {
    console.log('\n🎉 Version bump completed successfully!');
    console.log(`📦 Backend: ${backendPackage.version} -> ${newBackendVersion}`);
    console.log(`🌐 Frontend: ${frontendPackage.version} -> ${newFrontendVersion}`);
  } else {
    console.error('\n❌ Version bump failed!');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  incrementVersion,
  parseVersion,
  VERSION_TYPES
};
