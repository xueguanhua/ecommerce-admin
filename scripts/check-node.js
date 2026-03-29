#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources');

// 支持的平台配置
const PLATFORMS = [
  { platform: 'darwin', arch: 'x64', name: 'darwin-x64' },
  { platform: 'darwin', arch: 'arm64', name: 'darwin-arm64' },
  { platform: 'win32', arch: 'x64', name: 'win-x64' },
];

function getCurrentPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  
  if (platform === 'darwin') {
    return arch === 'arm64' 
      ? PLATFORMS.find(p => p.name === 'darwin-arm64')
      : PLATFORMS.find(p => p.name === 'darwin-x64');
  } else if (platform === 'win32' && arch === 'x64') {
    return PLATFORMS.find(p => p.name === 'win-x64');
  }
  return null;
}

function checkPlatform(platformConfig) {
  const { name, platform } = platformConfig;
  const nodeExecutable = path.join(RESOURCES_DIR, name, platform === 'win32' ? 'node.exe' : 'node');
  return fs.existsSync(nodeExecutable);
}

function main() {
  console.log('🔍 Checking embedded Node.js binaries...');
  
  // 确保 resources 目录存在
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
    console.log(`📁 Created resources directory: ${RESOURCES_DIR}`);
  }
  
  // 检查当前平台
  const currentPlatform = getCurrentPlatform();
  if (currentPlatform) {
    const hasCurrent = checkPlatform(currentPlatform);
    if (hasCurrent) {
      console.log(`✅ Current platform (${currentPlatform.name}): Node.js binary found`);
    } else {
      console.log(`⚠️  Current platform (${currentPlatform.name}): Node.js binary NOT found`);
      console.log(`   Run "npm run download-node:current" to download it`);
      console.log(`   Or run "npm run download-node" to download all platforms`);
    }
  } else {
    console.log(`ℹ️  Current platform (${process.platform}/${process.arch}) not in embedded list`);
    console.log(`   App will use system Node.js if available`);
  }
  
  // 检查所有平台
  console.log('\n📦 All platforms status:');
  let allExist = true;
  PLATFORMS.forEach(p => {
    const exists = checkPlatform(p);
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${p.name} ${exists ? '(found)' : '(missing)'}`);
    if (!exists) allExist = false;
  });
  
  if (!allExist) {
    console.log('\n💡 Tip: To download missing binaries, run:');
    console.log('   npm run download-node      # Download all platforms');
    console.log('   npm run download-node:current  # Download current platform only');
    console.log('\n⚠️  Note: Without embedded Node.js, users need to have Node.js installed.');
  } else {
    console.log('\n🎉 All embedded Node.js binaries are ready!');
  }
  
  // 非零退出码不会阻止打包，只是警告
}

if (require.main === module) {
  main();
}

module.exports = { checkNodeBinaries: main };