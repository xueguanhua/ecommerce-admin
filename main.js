const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';
let nextServer = null;

console.log('[Electron] Starting app...');
console.log('[Electron] __dirname:', __dirname);
console.log('[Electron] isDev:', isDev);

function startNextServer() {
  return new Promise((resolve, reject) => {
    // standalone 模式下的服务器路径
    const standalonePath = path.join(__dirname, '.next', 'standalone');
    const serverPath = path.join(standalonePath, 'server.js');
    
    console.log('[Electron] Standalone path:', standalonePath);
    console.log('[Electron] Server path:', serverPath);
    console.log('[Electron] Server exists:', fs.existsSync(serverPath));
    
    // 检查 standalone 是否存在
    if (!fs.existsSync(serverPath)) {
      console.error('[Electron] ERROR: standalone server not found');
      console.error('[Electron] Please run: npm run build');
      reject(new Error('standalone server not found'));
      return;
    }
    
    // 启动 Next.js standalone server
    nextServer = spawn('node', ['server.js'], {
      cwd: standalonePath,
      env: { 
        ...process.env, 
        NODE_ENV: 'production', 
        PORT: '3000',
        HOSTNAME: 'localhost'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let ready = false;
    
    nextServer.stdout.on('data', (data) => {
      const text = data.toString();
      console.log(`[Next.js] ${text}`);
      if (!ready && (text.includes('Ready') || text.includes('listening') || text.includes('3000'))) {
        ready = true;
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`);
    });

    nextServer.on('error', (err) => {
      console.error('[Electron] Failed to start Next.js:', err);
      reject(err);
    });
    
    // 超时处理 - 15秒
    setTimeout(() => {
      if (!ready) {
        console.log('[Electron] Timeout reached, proceeding anyway');
        resolve();
      }
    }, 15000);
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
      mainWindow.loadURL('http://localhost:3000');
    } catch (error) {
      console.error('[Electron] Failed to start Next.js:', error);
      mainWindow.loadURL('http://localhost:3000');
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
