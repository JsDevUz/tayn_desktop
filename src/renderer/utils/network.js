export const checkInternetConnection = async () => {
  try {
    // Use the main process to check internet (more reliable than renderer)
    if (window.electronAPI && window.electronAPI.app && window.electronAPI.app.checkInternet) {
      return await window.electronAPI.app.checkInternet();
    }
    
    // Fallback for non-Electron or old version
    return navigator.onLine;
  } catch (error) {
    console.error('Internet check failed:', error);
    return false;
  }
};
