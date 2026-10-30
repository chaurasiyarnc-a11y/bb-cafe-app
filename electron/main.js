const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "Bum Bum Cafe - Desktop POS",
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // लोकल फाइल्स को सही से लोड करने के लिए
    },
  });

  // सही HTML फाइल का पाथ (अगर index.html से लोड न हो तो d-pos सीधे चेक करें)
  const indexPath = path.join(__dirname, '../out/d-pos/index.html');
  
  win.loadFile(indexPath).catch(() => {
    // अगर d-pos/index.html न मिले तो मुख्य index.html लोड करें
    win.loadFile(path.join(__dirname, '../out/index.html'));
  });

  // अगर अभी भी कुछ अटका, तो F12 दबाकर एरर देख सकें (Ctrl + Shift + I)
  // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
