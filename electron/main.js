const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;
let mainWindow;

function startLocalServer() {
  const baseDir = path.join(__dirname, '../out');

  server = http.createServer((req, res) => {
    // 1. URL को क्लीन करें (क्वेरी स्ट्रिंग हटाएं)
    let safeUrl = decodeURI(req.url.split('?')[0]);

    if (safeUrl === '/' || safeUrl === '') {
      safeUrl = '/d-pos/index.html';
    }

    let filePath = path.join(baseDir, safeUrl);

    // अगर डायरेक्टरी है तो index.html देखें
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // अगर फ़ाइल मौजूद नहीं है
    if (!fs.existsSync(filePath)) {
      // अगर JS/CSS मांगी गई है और नहीं मिली, तो 404 दें (ताकि HTML न थमाई जाए)
      if (safeUrl.startsWith('/_next/') || safeUrl.includes('.js') || safeUrl.includes('.css')) {
        res.writeHead(404);
        return res.end('Asset not found');
      }
      // केवल पेजों के लिए d-pos/index.html पर री-रूट करें
      filePath = path.join(baseDir, 'd-pos/index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  });

  server.listen(48123, '127.0.0.1', () => {
    mainWindow.loadURL('http://127.0.0.1:48123/d-pos/');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: "Bum Bum Cafe - Desktop POS",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
  });

  startLocalServer();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});
