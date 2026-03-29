const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
let nextServer = null;

function startNextServer() {
  return new Promise((resolve, reject) => {
    // 启动 Next.js 生产服务
    nextServer = spawn('node', [path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start'], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'production', PORT: '3000' },
    });

    nextServer.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data}`);
      if (data.toString().includes('Ready') || data.toString().includes('3000')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`[Next.js Error] ${data}`);
    });

    nextServer.on('error', reject);
    
    // 超时处理
    setTimeout(() => resolve(), 5000);
  });
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'default',
  });

  if (isDev) {
    // 开发模式：加载 Next.js dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：启动 Next.js 服务并加载
    try {
      await startNextServer();
      mainWindow.loadURL('http://localhost:3000');
    } catch (error) {
      console.error('启动 Next.js 服务失败:', error);
    }
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (nextServer) {
    nextServer.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
});
