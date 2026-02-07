const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const DatabaseService = require('./services/database');

let mainWindow;
let dbService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadURL(
    isDev 
      ? 'http://localhost:3000' 
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    dbService = new DatabaseService();
    await dbService.initialize();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  if (dbService) {
    await dbService.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('db:query', async (event, sql, params) => {
  try {
    const result = await dbService.query(sql, params);
    // Convert Knex result to plain object for IPC
    const plainResult = {
      rows: result.rows || [],
      rowCount: result.rowCount || 0
    };
    return { success: true, data: plainResult };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db:sync', async (event, data) => {
  try {
    const result = await dbService.syncWithServer(data);
    // Convert Knex result to plain object for IPC
    const plainResult = {
      products: result.products,
      categories: result.categories,
      sales: result.sales
    };
    return { success: true, data: plainResult };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:check-internet', async () => {
  return new Promise((resolve) => {
    require('dns').lookup('google.com', (err) => {
      if (err && err.code === 'ENOTFOUND') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
});

ipcMain.handle('app:quit', () => {
  app.quit();
});
