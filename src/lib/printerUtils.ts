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
// SMART WORD WRAPPING HELPER
// ==========================================
const wrapText = (text: string, width: number): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + (currentLine ? " " : "") + word).length <= width) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      let remainingWord = word;
      while (remainingWord.length > width) {
        lines.push(remainingWord.slice(0, width));
        remainingWord = remainingWord.slice(width);
      }
      currentLine = remainingWord;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [""];
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

// सुधरा हुआ 3-कॉलम अलाइनर (Rs को हमेशा एक वर्टिकल लाइन पर लॉक रखेगा)
export const formatThreeColumns = (col1: string, col2: string, col3: string, cols: number): string => {
  const c1Width = cols === 48 ? 26 : 19; // डिश नाम के लिए 19 कैरेक्टर चौड़ाई
  const c2Width = cols === 48 ? 6 : 4;  // Quantity के लिए 4 कैरेक्टर चौड़ाई (Strict Layout Safety)
  const c3Width = cols === 48 ? 16 : 6;  // Amount के लिए 6 कैरेक्टर चौड़ाई

  const itemLines = wrapText(col1.trim(), c1Width);
  const p2 = col2.trim().padStart(2).padEnd(c2Width); 

  let p3 = "";
  // यदि col3 कोई संख्या नहीं है (जैसे कि हेडर "AMT"), तो सामान्य रूप से पैड करेंगे
  if (isNaN(Number(col3.replace(/[₹Rs\.]/g, "").trim()))) {
    p3 = col3.trim().padStart(c3Width);
  } else {
    const rawNumberStr = col3.replace(/[₹Rs\.]/g, "").trim();
    const numWidth = c3Width - 2; // "Rs" (2 कैरेक्टर) को घटाकर बची चौड़ाई
    const formattedNum = rawNumberStr.padStart(numWidth);
    p3 = "Rs" + formattedNum; // Rs हमेशा कॉलम के प्रारंभ (इंडेक्स 24) पर लॉक रहेगा
  }

  let output = "";
  for (let i = 0; i < itemLines.length - 1; i++) {
    output += itemLines[i] + "\n";
  }
  
  const lastLineItem = itemLines[itemLines.length - 1].padEnd(c1Width);
  output += lastLineItem + p2 + p3 + "\n";

  return output;
};

// सुधरा हुआ: टोटल ब्लॉक के 'Rs' को भी एक सीध में अलाइन करने के लिए नया हेल्पर
const formatTotalRow = (label: string, value: number, cols: number): string => {
  const rightWidth = cols === 48 ? 16 : 6;
  const numWidth = rightWidth - 2; // "Rs" (2 कैरेक्टर) को घटाकर बची चौड़ाई
  const rightText = "Rs" + String(value).padStart(numWidth);
  return formatRow(label, rightText, cols);
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

// फ़ॉन्ट-होल्डर कमांड्स के साथ सुरक्षित बाइट एनकोडर (100% यूनिवर्सल GS ! कमांड के साथ)
const encodeWithFontPlaceholders = (text: string, encoder: TextEncoder): Uint8Array => {
  const cleanText = text.replace(/₹/g, 'Rs');
  const parts = cleanText.split(/({{[A-Z0-9_]+}})/g);
  const byteArrays: Uint8Array[] = [];
  
  for (const part of parts) {
    if (part === "{{FONT_2X}}") {
      byteArrays.push(new Uint8Array([0x1D, 0x21, 0x11])); // GS ! 0x11 (strictly double height + double width font A)
    } else if (part === "{{FONT_NORMAL}}") {
      byteArrays.push(new Uint8Array([0x1D, 0x21, 0x00])); // GS ! 0x00 (strictly reset to normal size)
    } else if (part) {
      byteArrays.push(encoder.encode(part));
    }
  }
  
  const totalLength = byteArrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of byteArrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
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
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04, // कड़ाई से सीधे मॉड्यूल साइज 0x04 किया गया (25% छोटा)
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30,
    0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...Array.from(urlBytes),
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30, // Print QR Command
    0x0A, 0x1B, 0x61, 0x00
  ]);
};

export const sendToPrinterInChunks = async (config: PrintConfig, text: string, upiUrl?: string) => {
  const encoder = new TextEncoder();
  let finalBytes: Uint8Array;

  // रसीद प्रिंटर पर भेजने से ठीक पहले सभी ₹ को Rs में बदलेंगे
  if (upiUrl && text.includes("{{QR_CODE_PLACEHOLDER}}")) {
    const parts = text.split("{{QR_CODE_PLACEHOLDER}}");
    const safePart1 = encodeWithFontPlaceholders(parts[0], encoder);
    const safePart2 = encodeWithFontPlaceholders(parts[1], encoder);
    const qrBytes = generateEscPosQrBytes(upiUrl);

    finalBytes = new Uint8Array(safePart1.length + qrBytes.length + safePart2.length);
    finalBytes.set(safePart1);
    finalBytes.set(qrBytes, safePart1.length);
    finalBytes.set(safePart2, safePart1.length + qrBytes.length);
  } else {
    finalBytes = encodeWithFontPlaceholders(text.replace("{{QR_CODE_PLACEHOLDER}}", ""), encoder);
  }

  // मोनोस्पेस फ़ॉन्ट लॉक करने के लिए कड़ा प्रिंटर इनिशियलाइज़ेशन कमांड्स
  const initBytes = new Uint8Array([0x1B, 0x40]);
  
  const finalBytesWithInit = new Uint8Array(initBytes.length + finalBytes.length);
  finalBytesWithInit.set(initBytes);
  finalBytesWithInit.set(finalBytes, initBytes.length);

  const chunkSize = 120;

  if (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) {
    try {
      for (let i = 0; i < finalBytesWithInit.length; i += chunkSize) {
        await config.bleCharacteristic.writeValue(finalBytesWithInit.slice(i, i + chunkSize));
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
          for (let i = 0; i < finalBytesWithInit.length; i += chunkSize) {
            await writer.write(finalBytesWithInit.slice(i, i + chunkSize));
            await new Promise(r => setTimeout(r, 40));
          }
        } finally {
          writer.releaseLock();
        }
        return true;
      }
      if (config.usbDevice) {
        for (let i = 0; i < finalBytesWithInit.length; i += chunkSize) {
          await config.usbDevice.transferOut(1, finalBytesWithInit.slice(i, i + chunkSize));
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
  const cols = config.printerPaperSize === '80mm' ? 48 : 29; // 58mm चौड़ाई को कड़ाई से 29 पर सेट किया गया (Strict Safety Margin)
  const dividerLine = "-".repeat(cols) + "\n";
  const doubleDivider = "=".repeat(cols) + "\n";
  const formattedDate = getFormattedDate(order.timestamp);
  
  let text = doubleDivider;
  text += "{{FONT_2X}}" + centerAlign("K.O.T", 14) + "{{FONT_NORMAL}}";
  text += centerAlign("BUM BUM CAFE - KITCHEN", cols);
  text += doubleDivider;
  
  text += formatRow(`Token: #${order.tokenNumber}`, `Bill: #${String(order.billNumber).padStart(4, '0')}`, cols);
  
  const tableDisplay = order.tableNumber ? cleanTableNum(order.tableNumber) : "";
  const typeLabel = order.fulfillmentType?.toUpperCase() === 'TABLE' && tableDisplay
    ? `Type: TABLE (${tableDisplay})`
    : `Type: ${order.fulfillmentType?.toUpperCase()}`;
  
  const dateParts = formattedDate.split(', ');
  const dateOnly = dateParts[0];
  const timeOnly = dateParts[1] || "";
  
  text += `${typeLabel}\n`;
  text += formatRow(`Date: ${dateOnly}`, timeOnly, cols);
  
  text += dividerLine + formatRow("ITEM", "QTY", cols) + dividerLine;
  order.items.forEach((it: any) => {
    const itemLeft = cleanAsciiOnly(it.name).toUpperCase();
    const c1WidthKOT = cols - 6; 
    
    const itemLines = wrapText(itemLeft, c1WidthKOT);
    for (let i = 0; i < itemLines.length - 1; i++) {
      text += itemLines[i] + "\n";
    }
    text += formatRow(itemLines[itemLines.length - 1], String(it.quantity), cols);
  });
  
  if (order.chefInstructions) text += dividerLine + `INSTRUCTIONS: ${order.chefInstructions.toUpperCase()}\n`;
  return text + dividerLine + "\n\n\n\n";
};

export const generateEscPosText = (order: any, config: PrintConfig): string => {
  const cols = config.printerPaperSize === '80mm' ? 48 : 29; // 58mm चौड़ाई को कड़ाई से 29 पर सेट किया गया (Strict Right Margin Lock)
  const dividerLine = "-".repeat(cols) + "\n";
  const doubleDivider = "=".repeat(cols) + "\n";
  const formattedDate = getFormattedDate(order.timestamp);
  
  let text = doubleDivider;
  text += "{{FONT_2X}}" + centerAlign("BUM BUM CAFE", 14) + "{{FONT_NORMAL}}";
  text += centerAlign("NEW BUS STAND MOHANDRA,", cols);
  text += centerAlign("POLICE CHOKI KE SAMNE,", cols);
  text += centerAlign("PANNA M.P.", cols);
  text += doubleDivider;
  
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
  
  const dateParts = formattedDate.split(', ');
  const dateOnly = dateParts[0];
  const timeOnly = dateParts[1] || "";
  text += formatRow(`Date: ${dateOnly}`, timeOnly, cols);
  
  text += dividerLine;

  text += formatThreeColumns("ITEM", "QTY", "AMT", cols) + dividerLine;
  order.items.forEach((it: any) => {
    const itemCleanName = cleanAsciiOnly(it.name).toUpperCase();
    text += formatThreeColumns(itemCleanName, String(it.quantity), `₹${it.price * it.quantity}`, cols);
  });

  const customDiscountVal = order.discount - (order.customerPointsRedeemed || 0);
  text += dividerLine;
  
  // सुधरा हुआ: Total, Discount, और Grand Total में 'Rs' को एक सीध में अलाइन किया गया
  text += formatTotalRow("Total:", order.subtotal, cols);
  if (customDiscountVal > 0) {
    text += formatTotalRow("Discount:", customDiscountVal, cols);
  }
  if (order.customerPointsRedeemed && order.customerPointsRedeemed > 0) {
    text += formatTotalRow("Coupon Discount:", order.customerPointsRedeemed, cols);
  }
  if (order.gstAmount && order.gstAmount > 0) {
    text += formatTotalRow(`GST (${order.gstRate}%):`, order.gstAmount, cols);
  }
  
  text += dividerLine + formatTotalRow("GRAND TOTAL:", order.total, cols);
  if (order.customerPhone) {
    text += dividerLine;
    text += formatRow("Current Point:", `${order.customerPointsEarned || 0}`, cols);
    text += formatRow("Balance Point:", `${order.customerPointsAfter || 0}`, cols);
  }

  text += dividerLine;
  text += centerAlign("SCAN TO PAY", cols);
  
  text += "\n{{QR_CODE_PLACEHOLDER}}"; 

  // फूटर
  text += centerAlign("THANK YOU! VISIT AGAIN", cols) + centerAlign("www.bb-cafe-app.vercel.app", cols);
  return text + "\n\n\n\n";
};

// ==========================================
// DYNAMIC COMPACT HTML GENERATORS (BROWSER FALLBACK - VERDANA)
// ==========================================
export const generateKotHtml = (order: any, config: PrintConfig): string => {
  const fSize = config.fontSize || 9.5;
  const itemsHtml = order.items.map((it: any) => `
    <tr style="border-bottom: 1px dashed #ccc;">
      <td style="font-size: ${fSize}px; font-weight: 900; padding: 4px 0; color: #000; text-transform: uppercase; width: 75%; word-break: break-word; white-space: normal;">
        ${it.name.toUpperCase()}
      </td>
      <td style="font-size: ${fSize}px; font-weight: 900; text-align: right; padding: 4px 0; width: 25%;">${it.quantity}</td>
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
          body { font-family: 'Verdana', sans-serif; padding: 2px; font-size: ${fSize}px; color: #000; background-color: #fff; margin: 0; }
          .center { text-align: center; }
          .divider { border-top: 1px dotted #000; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        </style>
      </head>
      <body>
        <div class="center" style="font-family: 'Verdana', sans-serif; font-size: ${fSize + 5}px; font-weight: 900; border: 2px solid #000; padding: 4px; color: #000; letter-spacing: 1px;">K.O.T (KITCHEN)</div>
        <div class="center" style="font-size: ${fSize + 1}px; font-weight: 900; margin-top: 3px; color: #000;">BUM BUM CAFE</div>
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
              <th style="text-align: left; font-size: 8.5px; padding-bottom: 3px; width: 75%;">ITEM</th>
              <th style="text-align: right; font-size: 8.5px; padding-bottom: 3px; width: 25%;">QTY</th>
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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=65x65&margin=0&data=${encodeURIComponent(upiLink)}`;

  const itemsRows = order.items.map((it: any) => `
    <tr style="border-bottom: 1px dashed #eee;">
      <td style="font-size: ${fSize}px; font-weight: bold; padding: 4px 0; color: #111; text-transform: uppercase; width: 55%; word-break: break-word; white-space: normal;">${it.name.toUpperCase()}</td>
      <td style="font-size: ${fSize}px; font-weight: bold; text-align: center; padding: 4px 0; width: 15%;">${it.quantity}</td>
      <td style="font-size: ${fSize}px; font-weight: bold; text-align: right; padding: 4px 0; width: 30%;">₹${it.price * it.quantity}</td>
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
          body { font-family: 'Verdana', sans-serif; width: 100%; margin: 0; padding: 2px; color: #000; font-size: ${fSize}px; line-height: 1.25; box-sizing: border-box; }
          .center { text-align: center; }
          .divider { border-top: 1px dotted #000; margin: 4px 0; height: 0; }
          .double-divider { border-top: 1px dotted #000; border-bottom: 1.5px dotted #000; margin: 4px 0; height: 3px; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        </style>
      </head>
      <body>
        <div class="center" style="margin-bottom: 4px;">
          <div style="font-family: 'Verdana', sans-serif; font-size: ${fSize + 5}px; font-weight: 900; color: #000; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 0.5px;">BUM BUM CAFE</div>
          <div style="font-size: ${fSize - 1.5}px; font-weight: bold; color: #333; margin-top: 1px; max-width: 100%; word-wrap: break-word;">
            NEW BUS STAND MOHANDRA, POLICE CHOKI KE SAMNE, PANNA M.P.
          </div>
          <div style="font-size: 8px; font-weight: bold; margin-top: 2px;">Mo. 9714293759</div>
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
          <div style="grid-column: span 2;">Date: ${formattedReceiptDate}</div>
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
        
        <!-- सुधरा हुआ: तारीख, समय और फूटर लाइन को यहाँ से भी पूरी तरह हटा दिया गया है -->
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
