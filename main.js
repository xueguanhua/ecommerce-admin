const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 更好的环境检测
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';
let nextServer = null;

console.log('[Electron] Starting app...');
console.log('[Electron] __dirname:', __dirname);
console.log('[Electron] isDev:', isDev);

function startNextServer() {
  return new Promise((resolve, reject) => {
    // 调试信息：PATH 和环境
    console.log('[Electron] PATH:', process.env.PATH);
    console.log('[Electron] Current directory:', __dirname);
    
    // standalone 模式下的服务器路径
    // 因为 files 配置将 .next/standalone 复制到应用根目录
    const serverPath = path.join(__dirname, 'server.js');
    
    console.log('[Electron] Server path:', serverPath);
    console.log('[Electron] Server exists:', fs.existsSync(serverPath));
    
    // 列出应用根目录内容用于调试
    console.log('[Electron] App root directory contents:');
    try {
      const files = fs.readdirSync(__dirname);
      files.forEach(file => {
        console.log(`  - ${file}`);
      });
    } catch (err) {
      console.error('[Electron] Error reading directory:', err);
    }
    
    // 检查 standalone 是否存在
    if (!fs.existsSync(serverPath)) {
      console.error('[Electron] ERROR: standalone server not found');
      console.error('[Electron] Please run: npm run build');
      reject(new Error('standalone server not found'));
      return;
    }
    
    // 检查 server.js 依赖的目录是否存在
    const nextDir = path.join(__dirname, '.next');
    const staticDir = path.join(nextDir, 'static');
    console.log('[Electron] .next directory exists:', fs.existsSync(nextDir));
    console.log('[Electron] .next/static exists:', fs.existsSync(staticDir));
    
    // 查找 node 可执行文件路径
    function findNodePath() {
      // 优先使用内嵌的 Node.js 二进制文件（如果已打包）
      if (app.isPackaged) {
        // 根据平台和架构确定二进制文件路径
        const platform = process.platform;
        const arch = process.arch;
        let platformName;
        
        if (platform === 'darwin') {
          platformName = arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
        } else if (platform === 'win32') {
          platformName = 'win-x64';
        } else if (platform === 'linux') {
          platformName = arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
        } else {
          platformName = `${platform}-${arch}`;
        }
        
        const nodeExecutableName = platform === 'win32' ? 'node.exe' : 'node';
        const bundledNode = path.join(process.resourcesPath, 'resources', platformName, nodeExecutableName);
        
        console.log('[Electron] Checking bundled node at:', bundledNode);
        console.log('[Electron] Platform:', platform, 'Arch:', arch, 'Path:', platformName);
        
        if (fs.existsSync(bundledNode)) {
          console.log('[Electron] Using bundled node:', bundledNode);
          // 检查文件权限，如果没有执行权限则添加（非 Windows）
          if (platform !== 'win32') {
            try {
              const stat = fs.statSync(bundledNode);
              if (!(stat.mode & fs.constants.S_IXUSR)) {
                console.log('[Electron] Adding execute permission to bundled node');
                fs.chmodSync(bundledNode, '755');
              }
            } catch (err) {
              console.warn('[Electron] Could not check/set permissions:', err.message);
            }
          }
          return bundledNode;
        }
        console.log('[Electron] No bundled node found for', platformName);
      }
      
      const possiblePaths = [
        '/usr/local/bin/node',
        '/opt/homebrew/bin/node',
        '/usr/bin/node',
        '/bin/node'
      ];
      
      // 首先尝试使用 which 命令（如果 PATH 中有 node）
      try {
        const { execSync } = require('child_process');
        const nodePath = execSync('which node', { encoding: 'utf8' }).trim();
        if (nodePath && fs.existsSync(nodePath)) {
          console.log('[Electron] Found node via which:', nodePath);
          return nodePath;
        }
      } catch (err) {
        console.log('[Electron] which node failed, trying predefined paths');
      }
      
      // 尝试预定义路径
      for (const nodePath of possiblePaths) {
        if (fs.existsSync(nodePath)) {
          console.log('[Electron] Found node at:', nodePath);
          return nodePath;
        }
      }
      
      console.error('[Electron] ERROR: Cannot find node executable');
      return null;
    }
    
    const nodePath = findNodePath();
    if (!nodePath) {
      reject(new Error('Node.js not found'));
      return;
    }
    
    // 启动 Next.js standalone server
    console.log('[Electron] Starting Next.js server with node:', nodePath);
    nextServer = spawn(nodePath, ['server.js'], {
      cwd: __dirname,
      env: { 
        ...process.env, 
        NODE_ENV: 'production', 
        PORT: '3001',  // 使用 3001 避免冲突
        HOSTNAME: 'localhost'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let ready = false;
    let serverOutput = '';
    
    nextServer.stdout.on('data', (data) => {
      const text = data.toString();
      serverOutput += text;
      console.log(`[Next.js] ${text}`);
      if (!ready && (text.includes('Ready') || text.includes('listening') || text.includes('3000') || text.includes('3001'))) {
        ready = true;
        console.log('[Electron] Next.js server is ready!');
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      const text = data.toString();
      serverOutput += text;
      console.error(`[Next.js Error] ${text}`);
    });

    nextServer.on('error', (err) => {
      console.error('[Electron] Failed to start Next.js:', err);
      reject(err);
    });
    
    nextServer.on('close', (code) => {
      console.log(`[Electron] Next.js server process exited with code ${code}`);
      console.log('[Electron] Server output:', serverOutput);
    });
    
    // 超时处理 - 20秒
    setTimeout(() => {
      if (!ready) {
        console.log('[Electron] Timeout reached (20s), server output:', serverOutput);
        console.log('[Electron] Proceeding anyway, server may still work...');
        resolve();
      }
    }, 20000);
  });
}

async function createWindow() {
  console.log('[Electron] Creating window...');
  
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
  });

  // 生产环境关闭开发者工具
  // mainWindow.webContents.openDevTools();

  if (isDev) {
    console.log('[Electron] Loading dev server...');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[Electron] Starting production server...');
    try {
      await startNextServer();
      console.log('[Electron] Loading production URL...');
      mainWindow.loadURL('http://localhost:3001');  // 使用 3001
    } catch (error) {
      console.error('[Electron] Failed to start Next.js:', error);
      // 显示错误页面
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>应用启动失败</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; }
            .error { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; }
            .tip { color: #666; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⚠️ 应用启动失败</h1>
            <p>Next.js 服务器无法启动，请检查以下错误：</p>
            <div class="error">${error.message || error}</div>
            <div class="tip">
              <p>可能的原因：</p>
              <ul style="text-align: left;">
                <li>Node.js 未安装或不在 PATH 中</li>
                <li>应用文件损坏</li>
                <li>端口 3001 被占用</li>
              </ul>
              <p>请通过命令行运行应用查看详细日志：<br>
              <code>/Applications/电商管理平台.app/Contents/MacOS/电商管理平台</code></p>
            </div>
          </div>
        </body>
        </html>
      `;
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
    }
  }
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription);
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] Page finished loading');
  });
}

app.whenReady().then(() => {
  console.log('[Electron] App ready');
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  console.log('[Electron] Window closed');
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  console.log('[Electron] App quitting');
  if (nextServer) {
    nextServer.kill();
  }
});
