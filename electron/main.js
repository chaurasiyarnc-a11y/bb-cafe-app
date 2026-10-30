const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let server;
let mainWindow;

// 1. बैकग्राउंड लोकल इन-मेमोरी सर्वर (Delivery, KDS, POS, Admin सभी के लिए)
function startLocalServer() {
  const baseDir = path.join(__dirname, '../out');

  server = http.createServer((req, res) => {
    let safeUrl = decodeURI(req.url.split('?')[0]);

    // अगर सीधे बेस यूआरएल खुले तो POS पर जाए (या आप चाहें तो / पर रख सकते हैं)
    if (safeUrl === '/' || safeUrl === '') {
      safeUrl = '/d-pos/index.html';
    }

    let filePath = path.join(baseDir, safeUrl);

    // अगर डायरेक्टरी है तो उसके अंदर का index.html देखें
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // अगर बिना एक्सटेंशन वाला रूट है (उदा. /kitchen या /delivery)
    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      } else if (fs.existsSync(path.join(baseDir, safeUrl, 'index.html'))) {
        filePath = path.join(baseDir, safeUrl, 'index.html');
      }
    }

    // अगर फ़ाइल मौजूद नहीं है
    if (!fs.existsSync(filePath)) {
      // अगर JS/CSS/Fonts मांगे गए हों तो 404 दें (ताकि HTML न थमाई जाए)
      if (safeUrl.startsWith('/_next/') || safeUrl.includes('.js') || safeUrl.includes('.css')) {
        res.writeHead(404);
        return res.end('Asset not found');
      }
      // केवल अनजान पेज रूट्स के लिए d-pos/index.html पर भेजें
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

// 2. आइकन पाथ (Development और Installed EXE दोनों के लिए सुरक्षित)
function getAppIconPath() {
  const iconInPublic = path.join(__dirname, '../public/icon.ico');
  const iconInRoot = path.join(__dirname, 'icon.ico');
  
  if (fs.existsSync(iconInPublic)) return iconInPublic;
  if (fs.existsSync(iconInRoot)) return iconInRoot;
  return undefined;
}

function createWindow() {
  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: "Bum Bum Cafe - Desktop POS",
    autoHideMenuBar: true,
    icon: iconPath, // 👈 यह लाइन टास्कबार और विंडो के कोने पर कैफे का लोगो दिखाएगी
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
