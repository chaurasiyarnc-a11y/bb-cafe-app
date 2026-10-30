const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;
let mainWindow;

// 1. बैकग्राउंड में लोकल इन-मेमोरी सर्वर
function startLocalServer() {
  const baseDir = path.join(__dirname, '../out');

  server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];

    // अगर रूट खुले तो सीधे d-pos पर भेजे
    if (reqUrl === '/' || reqUrl === '') {
      reqUrl = '/d-pos/index.html';
    }

    let filePath = path.join(baseDir, reqUrl);

    // अगर फ़ोल्डर का नाम है तो index.html जोड़ें
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // अगर फ़ाइल न मिले तो d-pos/index.html खोलें
    if (!fs.existsSync(filePath)) {
      filePath = path.join(baseDir, 'd-pos/index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end(`File not found: ${req.url}`);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  // पोर्ट 48123 पर लोकल सर्वर चलेगा (बिना इंटरनेट के)
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
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  startLocalServer();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});
