const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
  width: 1200,
  height: 800,
  // 'titleBarStyle' is the secret to a modern Mac look
  titleBarStyle: 'hiddenInset', 
  trafficLightPosition: { x: 15, y: 15 }, // Positions the red/yellow/green buttons
  
  backgroundColor: '#0A0A14', // Matches your sketch background to prevent white flashes
  show: false, // Prevents the "white box" while loading
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
});

// Smooth fade-in once the p5.js sketch is ready
win.once('ready-to-show', () => {
  win.show();
});

  win.loadFile('index.html'); // This loads your p5.js sketch
}

app.whenReady().then(createWindow);


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Re-open the window if the user clicks the Dock icon (Standard Mac behavior)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});