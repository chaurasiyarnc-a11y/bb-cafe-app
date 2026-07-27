import toast from 'react-hot-toast';

// ==========================================
// TYPES & CONFIGURATION
// ==========================================
export interface PrintConfig {
  printerPaperSize: '58mm' | '80mm';
  printerType: 'thermal_usb' | 'thermal_bluetooth' | 'network_ip' | 'laser';
  fontSize?: number; // Dynamic font size control
  bleCharacteristic?: any;
  serialPort?: any;
  usbDevice?: any;
}

// ==========================================
// SAFE DATE FORMATTING HELPERS
// ==========================================
export const getFormattedDate = (timestamp: any): string => {
  if (!timestamp) return new Date().toLocaleString('en-IN');
  try {
    const dateObj = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return isNaN(dateObj.getTime()) 
      ? new Date().toLocaleString('en-IN').toUpperCase() 
      : dateObj.toLocaleString('en-IN').toUpperCase();
  } catch {
    return new Date().toLocaleString('en-IN').toUpperCase();
  }
};

export const getFormattedReceiptDate = (timestamp: any): string => {
  try {
    const now = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp || new Date());
    const validNow = isNaN(now.getTime()) ? new Date() : now;
    const day = String(validNow.getDate()).padStart(2, '0');
    const month = String(validNow.getMonth() + 1).padStart(2, '0');
    const year = String(validNow.getFullYear()).slice(-2);
    let hours = validNow.getHours();
    const minutes = String(validNow.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return getFormattedReceiptDate(new Date());
  }
};

// ==========================================
// ALIGNMENT & TEXT FORMATTING HELPERS
// ==========================================
export const centerAlign = (text: string, cols: number): string => {
  const trimmed = text.trim();
  if (trimmed.length >= cols) return trimmed.slice(0, cols) + "\n";
  const padding = Math.floor((cols - trimmed.length) / 2);
  return " ".repeat(padding) + trimmed + "\n";
};

export const formatRow = (left: string, right: string, cols: number): string => {
  const minGap = 2; // न्यूनतम स्पेस गैप
  const availableSpace = cols - left.length - right.length;
  
  if (availableSpace >= minGap) {
    return left + " ".repeat(availableSpace) + right + "\n";
  } else {
    const truncatedLeft = left.slice(0, cols - right.length - minGap);
    return truncatedLeft + " ".repeat(minGap) + right + "\n";
  }
};

export const formatThreeColumns = (col1: string, col2: string, col3: string, cols: number): string => {
  // कड़ाई से मोनोस्पेस संरेखण के लिए मानक चौड़ाई
  const c1Width = cols === 48 ? 26 : 16;
  const c2Width = cols === 48 ? 6 : 6;
  const c3Width = cols === 48 ? 16 : 10;
  let item = col1.trim();
  if (item.length > c1Width) item = item.slice(0, c1Width - 1) + ".";
  
  const p1 = item.padEnd(c1Width);
  const p2 = col2.trim().padStart(2).padEnd(c2Width); // 2-स्पेस पैडेड क्वांटिटी
  const p3 = col3.trim().padStart(c3Width); // राइट अलाइन्ड अमाउंट
  
  return p1 + p2 + p3 + "\n";
};

const cleanTableNum = (tableStr: string): string => {
  if (!tableStr) return "";
  const upper = tableStr.toUpperCase().trim();
  if (upper.startsWith("TABLE ")) {
    return "T-" + upper.replace("TABLE ", "");
  }
  return tableStr;
};

const cleanAsciiOnly = (str: string): string => {
  if (!str) return "";
  return str
    .replace(/[^\x00-\x7F]/g, "") 
    .replace(/\(\s*\)/g, "")      
    .replace(/\[\s*\]/g, "")      
    .replace(/\s+/g, " ")         
    .trim();
};

// ==========================================
// ESC/POS DIRECT PRINTER CODE GENERATORS
// ==========================================
export const generateEscPosQrBytes = (upiUrl: string): Uint8Array => {
  const encoder = new TextEncoder();
  const urlBytes = encoder.encode(upiUrl);
  const pL = (urlBytes.length + 3) & 0xFF;
  const pH = ((urlBytes.length + 3) >> 8) & 0xFF;

  return new Uint8Array([
    0x1B, 0x61, 0x01, // Center Align
    0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06,
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30,
    0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...Array.from(urlBytes),
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30, // Print QR Command
    0x0A, 0x1B, 0x61, 0x00
  ]);
};

export const sendToPrinterInChunks = async (config: PrintConfig, text: string, upiUrl?: string) => {
  const encoder = new TextEncoder();
  let textBytes: Uint8Array;

  if (upiUrl && text.includes("{{QR_CODE_PLACEHOLDER}}")) {
    const parts = text.split("{{QR_CODE_PLACEHOLDER}}");
    const safePart1 = parts[0]; 
    const safePart2 = parts[1]; 
    
    const part1Bytes = encoder.encode(safePart1);
    const part2Bytes = encoder.encode(safePart2);
    const qrBytes = generateEscPosQrBytes(upiUrl);
    
    textBytes = new Uint8Array(part1Bytes.length + qrBytes.length + part2Bytes.length);
    textBytes.set(part1Bytes);
    textBytes.set(qrBytes, part1Bytes.length);
    textBytes.set(part2Bytes, part1Bytes.length + qrBytes.length);
  } else {
    const safeText = text.replace("{{QR_CODE_PLACEHOLDER}}", ""); 
    textBytes = encoder.encode(safeText);
  }

  // प्रिंटर इनिशियलाइज़ेशन (ESC @) और फ़ॉन्ट-A मोनोस्पेस लॉक (ESC ! 0x00) कमांड्स जोड़ना
  const initBytes = new Uint8Array([0x1B, 0x40, 0x1B, 0x21, 0x00]);
  
  const finalBytes = new Uint8Array(initBytes.length + textBytes.length);
  finalBytes.set(initBytes);
  finalBytes.set(textBytes, initBytes.length);

  const chunkSize = 120;

  if (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) {
    try {
      for (let i = 0; i < finalBytes.length; i += chunkSize) {
        await config.bleCharacteristic.writeValue(finalBytes.slice(i, i + chunkSize));
        await new Promise(r => setTimeout(r, 60));
      }
      return true;
    } catch {
      throw new Error("Bluetooth print failed");
    }
  }

  if (config.printerType === 'thermal_usb') {
    try {
      if (config.serialPort) {
        const writer = config.serialPort.writable.getWriter();
        try {
          for (let i = 0; i < finalBytes.length; i += chunkSize) {
            await writer.write(finalBytes.slice(i, i + chunkSize));
            await new Promise(r => setTimeout(r, 40));
          }
        } finally {
          writer.releaseLock();
        }
        return true;
      }
      if (config.usbDevice) {
        for (let i = 0; i < finalBytes.length; i += chunkSize) {
          await config.usbDevice.transferOut(1, finalBytes.slice(i, i + chunkSize));
          await new Promise(r => setTimeout(r, 40));
        }
        return true;
      }
    } catch {
      throw new Error("USB print failed");
    }
  }
  return false;
};

// ==========================================
// K.O.T & RECEIPT TEXT GENERATORS (ESC/POS)
// ==========================================
export const generateKotEscPosText = (order: any, config: PrintConfig): string => {
  const cols = config.printerPaperSize === '80mm' ? 48 : 32; // मानक 32 कैरेक्टर चौड़ाई पर वापस सेट किया गया
  const dividerLine = "-".repeat(cols) + "\n";
  const doubleDivider = "=".repeat(cols) + "\n";
  const formattedDate = getFormattedDate(order.timestamp);
  
  let text = doubleDivider + centerAlign("K.O.T", cols) + centerAlign("BUM BUM CAFE - KITCHEN", cols) + doubleDivider;
  text += formatRow(`Token: #${order.tokenNumber}`, `Bill: #${String(order.billNumber).padStart(4, '0')}`, cols);
  
  const tableDisplay = order.tableNumber ? cleanTableNum(order.tableNumber) : "";
  const typeLabel = order.fulfillmentType?.toUpperCase() === 'TABLE' && tableDisplay
    ? `Type: TABLE (${tableDisplay})`
    : `Type: ${order.fulfillmentType?.toUpperCase()}`;
  text += `${typeLabel}\nDate: ${formattedDate}\n`;
  
  text += dividerLine + formatRow("ITEM", "QTY", cols) + dividerLine;
  order.items.forEach((it: any) => {
    const itemLeft = cleanAsciiOnly(it.name).toUpperCase();
    text += itemLeft.length > (cols - 6) ? `${itemLeft}\n${formatRow("", String(it.quantity), cols)}` : formatRow(itemLeft, String(it.quantity), cols);
    if (it.note) text += `  * Note: ${it.note.toUpperCase()}\n`;
  });
  
  if (order.chefInstructions) text += dividerLine + `INSTRUCTIONS: ${order.chefInstructions.toUpperCase()}\n`;
  return text + dividerLine + "\n\n\n\n";
};

export const generateEscPosText = (order: any, config: PrintConfig): string => {
  const cols = config.printerPaperSize === '80mm' ? 48 : 32; // मानक 32 कैरेक्टर चौड़ाई पर वापस सेट किया गया
  const dividerLine = "-".repeat(cols) + "\n";
  const doubleDivider = "=".repeat(cols) + "\n";
  const formattedDate = getFormattedDate(order.timestamp);
  
  let text = doubleDivider + centerAlign("BUM BUM CAFE", cols) + centerAlign("MOHANDRA, PANNA (M.P.)", cols) + doubleDivider;
  
  if (order.customerPhone || order.address) {
    text += "CUSTOMER DETAILS:\n";
    text += `Name: ${order.customerName || 'Walk-in Guest'}\n`;
    if (order.customerPhone) text += `Phone: ${order.customerPhone}\n`;
    if (order.address) text += `Address: ${order.address}\n`;
  } else {
    text += `Name: ${order.customerName || 'Walk-in Guest'}\n`;
  }
  
  text += dividerLine;
  text += formatRow(`Bill No: #${String(order.billNumber).padStart(4, '0')}`, `Token: #${order.tokenNumber}`, cols);
  
  const tableDisplay = order.tableNumber ? cleanTableNum(order.tableNumber) : "";
  const typeText = order.fulfillmentType?.toUpperCase() === 'TABLE' && tableDisplay
    ? `Type: TABLE (${tableDisplay})`
    : `Type: ${order.fulfillmentType?.toUpperCase()}`;
    
  text += formatRow(typeText, `Pay: ${order.paymentMethod?.toUpperCase()}`, cols);
  text += `Date: ${formattedDate}\n` + dividerLine;

  text += formatThreeColumns("ITEM", "QTY", "AMOUNT", cols) + dividerLine;
  order.items.forEach((it: any) => {
    const itemCleanName = cleanAsciiOnly(it.name).toUpperCase();
    text += formatThreeColumns(itemCleanName, String(it.quantity), `₹${it.price * it.quantity}`, cols);
    if (it.note) text += `  * Note: ${it.note.toUpperCase()}\n`;
  });

  const customDiscountVal = order.discount - (order.customerPointsRedeemed || 0);
  text += dividerLine;
  text += formatRow("Total:", `₹${order.subtotal}`, cols);
  
  if (customDiscountVal > 0) {
    text += formatRow("Discount:", `₹${customDiscountVal}`, cols);
  }
  if (order.customerPointsRedeemed && order.customerPointsRedeemed > 0) {
    text += formatRow("Coupon Discount:", `₹${order.customerPointsRedeemed}`, cols);
  }
  if (order.gstAmount && order.gstAmount > 0) {
    text += formatRow(`GST (${order.gstRate}%):`, `₹${order.gstAmount}`, cols);
  }
  
  text += dividerLine + formatRow("GRAND TOTAL:", `₹${order.total}`, cols);
  if (order.customerPhone) {
    text += dividerLine;
    text += formatRow("Current Point:", `${order.customerPointsEarned || 0}`, cols);
    text += formatRow("Balance Point:", `${order.customerPointsAfter || 0}`, cols);
  }

  text += dividerLine;
  text += centerAlign("SCAN TO PAY", cols);
  
  text += "\n{{QR_CODE_PLACEHOLDER}}"; 

  // सुधरा हुआ: नीचे की तारीख, समय और बिल नंबर वाली फूटर लाइन को पूरी तरह हटा दिया गया है
  text += centerAlign("THANK YOU! VISIT AGAIN", cols) + centerAlign("www.bb-cafe-app.vercel.app", cols);
  return text + "\n\n\n\n";
};

// ==========================================
// DYNAMIC COMPACT HTML GENERATORS (BROWSER FALLBACK)
// ==========================================
export const generateKotHtml = (order: any, config: PrintConfig): string => {
  const fSize = config.fontSize || 9.5;
  const itemsHtml = order.items.map((it: any) => `
    <tr style="border-bottom: 1px dashed #ccc;">
      <td style="font-size: ${fSize}px; font-weight: 900; padding: 4px 0; color: #000; text-transform: uppercase; width: 75%; word-break: break-word; white-space: normal;">
        ${it.name.toUpperCase()}
        ${it.note ? `<div style="font-size: ${fSize - 1.5}px; color: #333; font-weight: 800; padding-left: 4px;">Note: ${it.note.toUpperCase()}</div>` : ''}
      </td>
      <td style="font-size: ${fSize}px; font-weight: 900; text-align: right; padding: 4px 0; font-family: monospace; width: 25%;">${it.quantity}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          @media print {
            @page { size: ${config.printerPaperSize === '58mm' ? '58mm' : '80mm'} auto; margin: 0; }
            body { margin: 0; padding: 2px; }
          }
          body { font-family: monospace; padding: 2px; font-size: ${fSize}px; color: #000; background-color: #fff; margin: 0; }
          .center { text-align: center; }
          .divider { border-top: 1px dotted #000; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        </style>
      </head>
      <body>
        <div class="center" style="font-size: ${fSize + 3}px; font-weight: 900; border: 1.5px solid #000; padding: 3px; background-color: #000; color: #fff;">K.O.T (KITCHEN)</div>
        <div class="center" style="font-size: ${fSize - 1}px; font-weight: bold; margin-top: 2px;">BUM BUM CAFE</div>
        <div class="divider"></div>
        <div style="font-size: ${fSize - 0.5}px; font-weight: bold; line-height: 1.3;">
          <div>Token No: <span style="font-size: ${fSize + 1.5}px; font-weight: 900;">#${order.tokenNumber}</span></div>
          <div>Bill No: #${order.billNumber}</div>
          <div>Mode: <span style="text-transform: uppercase;">${order.fulfillmentType?.toUpperCase()} ${order.tableNumber ? `(${order.tableNumber})` : ''}</span></div>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; font-size: 9.5px; font-weight: 900; padding-bottom: 3px; width: 75%;">ITEM</th>
              <th style="text-align: right; font-size: 9.5px; font-weight: 900; padding-bottom: 3px; width: 25%;">QTY</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        ${order.chefInstructions ? `
          <div style="margin-top: 6px; padding: 4px; border: 1.5px solid #000; background-color: #fafafa;">
            <div style="font-size: 8.5px; font-weight: 900; text-decoration: underline;">CHEF INSTRUCTION:</div>
            <div style="font-size: 10px; font-weight: 900;">${order.chefInstructions.toUpperCase()}</div>
          </div>
        ` : ''}
        <div class="divider"></div>
        <div class="center" style="font-size: 8px; font-weight: bold;">Printed: ${getFormattedDate(order.timestamp)}</div>
      </body>
    </html>
  `;
};

export const generateReceiptHtml = (order: any, config: PrintConfig): string => {
  const upiId = "Q231198993@ybl"; 
  const upiLink = `upi://pay?pa=${upiId}&pn=Bum%20Bum%20Cafe&am=${order.total}&cu=INR`;
  const fSize = config.fontSize || 9;
  const formattedReceiptDate = getFormattedReceiptDate(order.timestamp);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(upiLink)}`;

  const itemsRows = order.items.map((it: any) => `
    <tr style="border-bottom: 1px dashed #eee;">
      <td style="font-size: ${fSize}px; font-weight: bold; padding: 4px 0; color: #111; text-transform: uppercase; width: 55%; word-break: break-word; white-space: normal;">${it.name.toUpperCase()}</td>
      <td style="font-size: ${fSize}px; font-weight: bold; text-align: center; padding: 4px 0; font-family: monospace; width: 15%;">${it.quantity}</td>
      <td style="font-size: ${fSize}px; font-weight: bold; text-align: right; padding: 4px 0; font-family: monospace; width: 30%;">₹${it.price * it.quantity}</td>
    </tr>
  `).join('');

  const loyaltyMarkup = order.customerPhone ? `
    <div style="background-color: #fafafa; border: 1px dashed #aaa; padding: 4px; margin-top: 4px; font-size: 7.5px; font-family: monospace;">
      <div style="font-weight: 900; text-align: center; color: #b45309; margin-bottom: 2px;">LOYALTY POINTS</div>
      <div style="display: flex; justify-content: space-between;"><span>Current:</span> <span>+${order.customerPointsEarned || 0} pts</span></div>
      <div style="display: flex; justify-content: space-between;"><span>Balance:</span> <span>${order.customerPointsAfter || 0} pts</span></div>
    </div>
  ` : '';

  const customDiscountVal = order.discount - (order.customerPointsRedeemed || 0);

  return `
    <html>
      <head>
        <style>
          @media print {
            @page { size: ${config.printerPaperSize === '58mm' ? '58mm' : '80mm'} auto; margin: 0; }
            body { margin: 0; padding: 2px; }
          }
          body { font-family: monospace; width: 100%; margin: 0; padding: 2px; color: #000; font-size: ${fSize}px; line-height: 1.25; box-sizing: border-box; }
          .center { text-align: center; }
          .divider { border-top: 1.5px dotted #000; margin: 4px 0; height: 0; }
          .double-divider { border-top: 1.5px dotted #000; border-bottom: 1.5px dotted #000; margin: 4px 0; height: 3px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        </style>
      </head>
      <body>
        <div class="center" style="margin-bottom: 4px;">
          <div style="background-color: #000; color: #fff; padding: 3px 6px; font-size: ${fSize + 2}px; font-weight: 900; display: inline-block;">BUM BUM CAFE</div>
          <div style="font-size: ${fSize - 1.5}px; font-weight: bold; color: #333; margin-top: 1px;">BUS STAND MOHANDRA, DIST. PANNA, M.P.</div>
          <div style="font-size: 8px; font-weight: bold;">Mo. 9714293759</div>
        </div>
        <div class="divider"></div>
        <div style="font-size: 8.5px; font-weight: bold;">
          <div>Name: ${order.customerName || 'Walk-in Guest'}</div>
          ${order.customerPhone ? `<div>Phone: ${order.customerPhone.replace('+91', '')}</div>` : ''}
          ${order.address ? `<div>Address: ${order.address}</div>` : ''}
          ${loyaltyMarkup}
        </div>
        <div class="divider"></div>
        <div style="display: grid; grid-template-cols: 1fr 1fr; font-size: 8px; font-weight: bold; row-gap: 1px;">
          <div>Bill No: #${String(order.billNumber).padStart(4, '0')}</div>
          <div style="text-align: right;">Token: #<strong>${order.tokenNumber}</strong></div>
          <div>Mode: ${order.fulfillmentType?.toUpperCase()} ${order.tableNumber ? `(Table: ${order.tableNumber})` : ''}</div>
          <div style="text-align: right;">Pay: ${order.paymentMethod?.toUpperCase()}</div>
          <div>Date: ${formattedReceiptDate}</div>
        </div>
        <div class="divider" style="margin-top: 6px;"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; font-size: 8.5px; padding-bottom: 3px; width: 55%;">ITEM</th>
              <th style="text-align: center; font-size: 8.5px; padding-bottom: 3px; width: 15%;">QTY</th>
              <th style="text-align: right; font-size: 8.5px; padding-bottom: 3px; width: 30%;">AMT</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div class="divider"></div>
        <div style="font-size: 8.5px; font-weight: bold; line-height: 1.3;">
          <div style="display: flex; justify-content: space-between;"><span>Total:</span><span>₹${order.subtotal}</span></div>
          
          ${customDiscountVal > 0 ? `
          <div style="display: flex; justify-content: space-between; color: green;">
            <span>Discount:</span>
            <span>-₹${customDiscountVal}</span>
          </div>` : ''}
          
          ${order.customerPointsRedeemed > 0 ? `
          <div style="display: flex; justify-content: space-between; color: green;">
            <span>Coupon Discount:</span>
            <span>-₹${order.customerPointsRedeemed}</span>
          </div>` : ''}
          
          ${order.gstAmount && order.gstAmount > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>GST (${order.gstRate}%):</span>
            <span>+₹${order.gstAmount}</span>
          </div>` : ''}
        </div>
        <div class="double-divider"></div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 900; font-size: 11px;">
          <span>Grand Total</span><span>₹${order.total}</span>
        </div>
        <div class="divider"></div>
        
        <div class="center" style="margin: 4px 0;">
          <div style="font-size: 8px; margin-bottom: 4.5px; font-weight: bold;">SCAN TO PAY</div>
          <img src="${qrCodeUrl}" style="width: 80px; height: 80px; border: 1px solid #000; padding: 2px; display: inline-block;" />
          <div style="font-size: 7px; font-weight: 900; margin-top: 4.5px;">BHIM UPI PAYTM/PHONEPE</div>
        </div>
        
        <div class="divider"></div>
        <div class="center" style="font-size: 7.5px; line-height: 1.3; font-weight: bold;">
          <div>www.youtube.com/@bbcafe.i | @bbcafe.in</div>
          <div style="font-weight: 900; font-size: 8.5px; margin-top: 2px; font-style: italic;">THANK YOU, VISIT AGAIN!</div>
          <div style="font-size: 8px; margin-top: 1px;">www.bb-cafe-app.vercel.app</div>
        </div>
        
        <!-- सुधरा हुआ: नीचे की तारीख, समय और बिल नंबर वाली एक्स्ट्रा फूटर लाइन को यहाँ से भी पूरी तरह हटा दिया गया है -->
      </body>
    </html>
  `;
};

// ==========================================
// MAIN TRIGGER PRINT FUNCTIONS (KOT & RECEIPT)
// ==========================================
export const handlePrintKot = async (order: any, config: PrintConfig) => {
  if (
    (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) || 
    (config.printerType === 'thermal_usb' && (config.serialPort || config.usbDevice))
  ) {
    try {
      const kotText = generateKotEscPosText(order, config);
      await sendToPrinterInChunks(config, kotText);
    } catch {
      toast.error("KOT hardware print failed, launching fallback...");
    }
    return;
  }

  const printWindow = window.open('', '_blank', 'width=340,height=600');
  if (!printWindow) return;
  
  printWindow.document.write(generateKotHtml(order, config));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
};

export const handlePrintReceipt = async (order: any, config: PrintConfig) => {
  const upiId = "Q231198993@ybl"; 
  const upiLink = `upi://pay?pa=${upiId}&pn=Bum%20Bum%20Cafe&am=${order.total}&cu=INR`;

  if (
    (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) || 
    (config.printerType === 'thermal_usb' && (config.serialPort || config.usbDevice))
  ) {
    const toastId = toast.loading("Sending directly to thermal printer...");
    try {
      const receiptText = generateEscPosText(order, config);
      await sendToPrinterInChunks(config, receiptText, upiLink);
      toast.dismiss(toastId);
      toast.success("Customer receipt printed!");
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Hardware print failed, launching fallback...");
    }
    return;
  }

  const printWindow = window.open('', '_blank', 'width=340,height=600');
  if (!printWindow) {
    toast.error("Popup blocked! Please allow popups for this POS.");
    return;
  }

  printWindow.document.write(generateReceiptHtml(order, config));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350); 
};
