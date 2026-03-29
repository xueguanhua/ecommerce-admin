#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESOURCES_DIR = path.join(__dirname, '..', 'resources');
const NODE_VERSION = '20.11.0'; // 使用与 Electron 28 兼容的 Node.js 版本

// 需要下载的所有平台配置
const PLATFORMS = [
  { platform: 'darwin', arch: 'x64', name: 'darwin-x64' },
  { platform: 'darwin', arch: 'arm64', name: 'darwin-arm64' },
  { platform: 'win32', arch: 'x64', name: 'win-x64' },
  // Linux 可选，如果需要可以添加
  // { platform: 'linux', arch: 'x64', name: 'linux-x64' },
];

// 平台映射到 Node.js 下载文件名
function getNodeFilename(platform, arch) {
  const map = {
    darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
    win32: { x64: 'win-x64' },
    linux: { x64: 'linux-x64', arm64: 'linux-arm64' }
  };
  const archInfo = map[platform]?.[arch];
  if (!archInfo) {
    throw new Error(`Unsupported platform/arch: ${platform}/${arch}`);
  }
  return `node-v${NODE_VERSION}-${archInfo}`;
}

// 使用 curl 下载文件（避免证书问题）
function downloadWithCurl(url, dest) {
  console.log(`Downloading: ${url}`);
  try {
    execSync(`curl -L -k -o "${dest}" "${url}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to download: ${error.message}`);
    return false;
  }
}

// 解压文件
function extractTarGz(tarPath, destDir) {
  console.log(`Extracting: ${tarPath}`);
  try {
    execSync(`tar -xzf "${tarPath}" -C "${destDir}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Failed to extract: ${error.message}`);
    return false;
  }
}

// 处理 Windows 的 .zip 文件
function extractZip(zipPath, destDir) {
  console.log(`Extracting: ${zipPath}`);
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'inherit' });
    } else {
      execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
    }
    return true;
  } catch (error) {
    console.error(`Failed to extract zip: ${error.message}`);
    return false;
  }
}

async function downloadPlatform(platformConfig) {
  const { platform, arch, name } = platformConfig;
  const nodeFilename = getNodeFilename(platform, arch);
  const platformDir = path.join(RESOURCES_DIR, name);
  
  // 创建平台目录
  if (!fs.existsSync(platformDir)) {
    fs.mkdirSync(platformDir, { recursive: true });
  }
  
  // 检查是否已经存在
  const nodeExecutable = path.join(platformDir, platform === 'win32' ? 'node.exe' : 'node');
  if (fs.existsSync(nodeExecutable)) {
    console.log(`✓ Node.js for ${name} already exists, skipping`);
    return true;
  }
  
  console.log(`\n=== Downloading Node.js for ${name} ===`);
  
  // 确定文件扩展名
  const isWindows = platform === 'win32';
  const ext = isWindows ? 'zip' : 'tar.gz';
  const downloadUrl = `https://nodejs.org/dist/v${NODE_VERSION}/${nodeFilename}.${ext}`;
  const archivePath = path.join(RESOURCES_DIR, `${name}.${ext}`);
  
  // 下载
  if (!downloadWithCurl(downloadUrl, archivePath)) {
    return false;
  }
  
  // 解压
  const extractedDir = path.join(RESOURCES_DIR, nodeFilename);
  const success = isWindows ? 
    extractZip(archivePath, RESOURCES_DIR) :
    extractTarGz(archivePath, RESOURCES_DIR);
  
  if (!success) {
    return false;
  }
  
  // 找到 node 可执行文件
  let sourceExecutable;
  if (isWindows) {
    sourceExecutable = path.join(extractedDir, 'node.exe');
  } else {
    sourceExecutable = path.join(extractedDir, 'bin', 'node');
  }
  
  if (!fs.existsSync(sourceExecutable)) {
    console.error(`Node executable not found at: ${sourceExecutable}`);
    return false;
  }
  
  // 复制到平台目录
  fs.copyFileSync(sourceExecutable, nodeExecutable);
  
  // 设置执行权限（非 Windows）
  if (!isWindows) {
    fs.chmodSync(nodeExecutable, '755');
  }
  
  // 清理临时文件
  fs.unlinkSync(archivePath);
  try {
    fs.rmSync(extractedDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Could not clean up ${extractedDir}: ${err.message}`);
  }
  
  console.log(`✓ Node.js for ${name} saved to: ${nodeExecutable}`);
  console.log(`  File size: ${fs.statSync(nodeExecutable).size} bytes`);
  return true;
}

async function downloadAllPlatforms(platforms) {
  console.log(`Downloading Node.js binaries for ${platforms.length} platform(s)...`);
  console.log(`Node.js version: ${NODE_VERSION}`);
  console.log(`Target platforms: ${platforms.map(p => p.name).join(', ')}`);
  
  // 创建 resources 目录
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  }
  
  let allSuccess = true;
  for (const platform of platforms) {
    const success = await downloadPlatform(platform);
    if (!success) {
      console.error(`Failed to download for ${platform.name}`);
      allSuccess = false;
    }
  }
  
  if (allSuccess) {
    console.log('\n✅ All requested Node.js binaries downloaded successfully!');
    console.log('\nFiles structure:');
    platforms.forEach(p => {
      const nodePath = path.join(RESOURCES_DIR, p.name, p.platform === 'win32' ? 'node.exe' : 'node');
      if (fs.existsSync(nodePath)) {
        console.log(`  resources/${p.name}/ - ${fs.statSync(nodePath).size} bytes`);
      }
    });
  } else {
    console.error('\n❌ Some downloads failed. You may need to run again or download manually.');
    process.exit(1);
  }
}

function getCurrentPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  
  // 映射到支持的平台配置
  if (platform === 'darwin') {
    return arch === 'arm64' 
      ? PLATFORMS.find(p => p.name === 'darwin-arm64')
      : PLATFORMS.find(p => p.name === 'darwin-x64');
  } else if (platform === 'win32' && arch === 'x64') {
    return PLATFORMS.find(p => p.name === 'win-x64');
  }
  
  // 如果不匹配任何预定义平台，返回 null
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const isCurrentOnly = args.includes('--current');
  
  let platformsToDownload;
  
  if (isCurrentOnly) {
    const currentPlatform = getCurrentPlatform();
    if (!currentPlatform) {
      console.error(`❌ Current platform (${process.platform}/${process.arch}) is not supported for embedded Node.js.`);
      console.error('   The app will fall back to system Node.js if available.');
      process.exit(0);
    }
    platformsToDownload = [currentPlatform];
    console.log(`Downloading Node.js for current platform only (${currentPlatform.name})...`);
  } else {
    platformsToDownload = PLATFORMS;
  }
  
  await downloadAllPlatforms(platformsToDownload);
}

if (require.main === module) {
  main();
}

module.exports = { downloadNodeBinary: main, getCurrentPlatform };