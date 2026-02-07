const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  db: {
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    sync: (data) => ipcRenderer.invoke('db:sync', data)
  },
  
  // App operations
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    checkInternet: () => ipcRenderer.invoke('app:check-internet'),
    quit: () => ipcRenderer.invoke('app:quit')
  },
  
  // Events
  on: (channel, callback) => {
    const validChannels = ['sync-progress', 'sync-complete', 'sync-error'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});
