const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "Bum Bum Cafe - POS",
    autoHideMenuBar: true,
  });

  win.loadFile(path.join(__dirname, '../out/d-pos/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
