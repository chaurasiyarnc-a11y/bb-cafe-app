import toast from 'react-hot-toast';

export interface PrintConfig {
  printerPaperSize: '58mm' | '80mm';
  printerType: 'thermal_usb' | 'thermal_bluetooth' | 'network_ip' | 'laser';
  bleCharacteristic: any;
  serialPort: any;
  usbDevice: any;
}

// ==========================================
// 1. अलाइनमेंट और फॉर्मेटिंग हेल्पर फंक्शन्स
// ==========================================

// पेपर चौड़ाई के अनुसार टेक्स्ट को हमेशा सेंटर में रखने के लिए
const centerAlign = (text: string, cols: number): string => {
  const trimmed = text.trim();
  if (trimmed.length >= cols) return trimmed.slice(0, cols) + "\n";
  const padding = Math.floor((cols - trimmed.length) / 2);
  return " ".repeat(padding) + trimmed + "\n";
};

// दाईं और बाईं ओर के टेक्स्ट को परफेक्ट अलाइन करने के लिए (2-कॉलम)
const formatRow = (left: string, right: string, cols: number): string => {
  const spaceForRight = cols - left.length;
  if (spaceForRight <= 0) {
    return left.slice(0, cols - right.length - 1) + " " + right + "\n";
  }
  return left + right.padStart(spaceForRight) + "\n";
};

// आइटम, क्वांटिटी और अमाउंट को 1 ही लाइन में सेट करने के लिए (3-कॉलम)
const formatThreeColumns = (col1: string, col2: string, col3: string, cols: number): string => {
  // 58mm के लिए: 16 (नाम) + 6 (QTY) + 10 (अमाउंट) = 32
  // 80mm के लिए: 26 (नाम) + 6 (QTY) + 16 (अमाउंट) = 48
  const c1Width = cols === 48 ? 26 : 16;
  const c2Width = 6;
  const c3Width = cols === 48 ? 16 : 10;

  let item = col1.trim();
  if (item.length > c1Width) {
    // नाम बड़ा होने पर छोटा करके अंत में '.' लगा देंगे
    item = item.slice(0, c1Width - 1) + "."; 
  }
  const p1 = item.padEnd(c1Width);
  const p2 = col2.trim().padStart(3).padEnd(c2Width); // परफेक्ट सेंटर अलाइनमेंट
  const p3 = col3.trim().padStart(c3Width); // परफेक्ट राइट अलाइनमेंट

  return p1 + p2 + p3 + "\n";
};

// ==========================================
// 2. डायरेक्ट थर्मल प्रिंटर बाइट-कोड जेनरेटर
// ==========================================
export const generateEscPosQrBytes = (upiUrl: string): Uint8Array => {
  const encoder = new TextEncoder();
  const urlBytes = encoder.encode(upiUrl);
  const pL = (urlBytes.length + 3) & 0xFF;
  const pH = ((urlBytes.length + 3) >> 8) & 0xFF;

  const commands = [
    0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06,
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30,
    0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...Array.from(urlBytes),
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x48,
    0x0A, 0x0A
  ];
  return new Uint8Array(commands);
};

// डेटा बफर को छोटे पैकेट्स में भेजने का सुरक्षित सिस्टम
export const sendToPrinterInChunks = async (
  config: PrintConfig,
  text: string,
  upiUrl?: string
) => {
  const encoder = new TextEncoder();
  
  // महत्वपूर्ण सुधार: फिजिकल प्रिंटर पर '₹' को 'Rs.' में बदलें ताकि कचरा अक्षर प्रिंट न हों
  const safeTextForPrinter = text.replace(/₹/g, 'Rs.');
  const textBytes = encoder.encode(safeTextForPrinter);
  
  let finalBytes = textBytes;
  if (upiUrl) {
    const qrBytes = generateEscPosQrBytes(upiUrl);
    const combined = new Uint8Array(textBytes.length + qrBytes.length);
    combined.set(textBytes);
    combined.set(qrBytes, textBytes.length);
    finalBytes = combined;
  }

  const chunkSize = 120;

  if (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) {
    try {
      for (let i = 0; i < finalBytes.length; i += chunkSize) {
        const chunk = finalBytes.slice(i, i + chunkSize);
        await config.bleCharacteristic.writeValue(chunk);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      return true;
    } catch (err) {
      console.error(err);
      throw new Error("Bluetooth print failed");
    }
  }

  if (config.printerType === 'thermal_usb') {
    try {
      if (config.serialPort) {
        const writer = config.serialPort.writable.getWriter();
        for (let i = 0; i < finalBytes.length; i += chunkSize) {
          const chunk = finalBytes.slice(i, i + chunkSize);
          await writer.write(chunk);
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        writer.releaseLock();
        return true;
      }

      if (config.usbDevice) {
        for (let i = 0; i < finalBytes.length; i += chunkSize) {
          const chunk = finalBytes.slice(i, i + chunkSize);
          await config.usbDevice.transferOut(1, chunk);
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        return true;
      }
    } catch (err) {
      console.error(err);
      throw new Error("USB print failed");
    }
  }
  return false;
};

// ==========================================
// 3. सुधरा हुआ K.O.T टेक्स्ट डिज़ाइन (ESC/POS)
// ==========================================
export const generateKotEscPosText = (order: any, config?: PrintConfig): string => {
  const cols = config?.printerPaperSize === '80mm' ? 48 : 32;
  const dividerLine = "-".repeat(cols) + "\n";
  const doubleDivider = "================================\n";
  
  const formattedDate = order.timestamp?.toDate 
    ? order.timestamp.toDate().toLocaleString('en-IN') 
    : new Date(order.timestamp).toLocaleString('en-IN');
  
  let text = "";
  text += doubleDivider;
  text += centerAlign("K.O.T", cols);
  text += centerAlign("BUM BUM CAFE - KITCHEN", cols);
  text += doubleDivider;
  
  text += formatRow(`Token: #${order.tokenNumber}`, `Bill: #${String(order.billNumber).padStart(4, '0')}`, cols);
  text += `Date: ${formattedDate}\n`;
  text += `Type: ${order.fulfillmentType?.toUpperCase()}\n`;
  if (order.fulfillmentType === 'table') {
    text += `Table: ${order.tableNumber}\n`;
  }
  text += dividerLine;
  text += formatRow("ITEM", "QTY", cols);
  text += dividerLine;
  
  order.items.forEach((it: any) => {
    const itemLeft = it.name.toUpperCase();
    const itemQty = String(it.quantity);
    
    if (itemLeft.length > (cols - 6)) {
      text += `${itemLeft}\n`;
      text += formatRow("", itemQty, cols);
    } else {
      text += formatRow(itemLeft, itemQty, cols);
    }
    
    if (it.note) {
      text += `  * Note: ${it.note.toUpperCase()}\n`;
    }
  });
  
  if (order.chefInstructions) {
    text += dividerLine;
    text += `INSTRUCTIONS: ${order.chefInstructions.toUpperCase()}\n`;
  }
  
  text += dividerLine;
  text += "\n\n\n\n";
  return text;
};

// ==========================================
// 4. सुधरा हुआ ग्राहक बिल टेक्स्ट डिज़ाइन (ESC/POS)
// ==========================================
export const generateEscPosText = (order: any, config?: PrintConfig): string => {
  const cols = config?.printerPaperSize === '80mm' ? 48 : 32;
  const dividerLine = "-".repeat(cols) + "\n";
  const doubleDivider = "=".repeat(cols) + "\n";
  
  const formattedDate = order.timestamp?.toDate 
    ? order.timestamp.toDate().toLocaleString('en-IN') 
    : new Date(order.timestamp).toLocaleString('en-IN');
  
  let text = "";
  text += doubleDivider;
  text += centerAlign("BUM BUM CAFE", cols);
  text += centerAlign("MOHANDRA, PANNA (M.P.)", cols);
  text += doubleDivider;
  
  text += "CUSTOMER DETAILS:\n";
  text += `Name: ${order.customerName || 'Walk-in Guest'}\n`;
  if (order.customerPhone) {
    text += `Phone: ${order.customerPhone}\n`;
  }
  if (order.address) {
    text += `Address: ${order.address}\n`;
  }
  text += dividerLine;

  text += formatRow(`Bill No: #${String(order.billNumber).padStart(4, '0')}`, `Token: #${order.tokenNumber}`, cols);
  text += formatRow(`Type: ${order.fulfillmentType?.toUpperCase()}`, `Pay: ${order.paymentMethod?.toUpperCase()}`, cols);
  text += `Date: ${formattedDate}\n`;
  text += dividerLine;

  // 3-कॉलम हेडर
  text += formatThreeColumns("ITEM", "QTY", "AMOUNT", cols);
  text += dividerLine;

  // 3-कॉलम आइटम लिस्टिंग
  order.items.forEach((it: any) => {
    const itemTotalText = `₹${it.price * it.quantity}`;
    text += formatThreeColumns(it.name.toUpperCase(), String(it.quantity), itemTotalText, cols);
    if (it.note) {
      text += `  * Note: ${it.note.toUpperCase()}\n`;
    }
  });

  text += dividerLine;
  text += formatRow("Total:", `₹${order.subtotal}`, cols);
  
  const customDiscountVal = order.discount - (order.customerPointsRedeemed || 0);
  text += formatRow("Discount:", `₹${customDiscountVal > 0 ? customDiscountVal : 0}`, cols);
  text += formatRow("Coupon Discount:", `₹${order.customerPointsRedeemed || 0}`, cols);
  
  if (order.gstAmount) {
    text += formatRow(`GST (${order.gstRate}%):`, `₹${order.gstAmount}`, cols);
  }
  
  text += dividerLine;
  text += formatRow("GRAND TOTAL:", `₹${order.total}`, cols);
  
  if (order.customerPhone) {
    text += dividerLine;
    text += formatRow("Current Point:", `${order.customerPointsEarned || 0}`, cols);
    text += formatRow("Balance Point:", `${order.customerPointsAfter || 0}`, cols);
  }

  text += dividerLine;
  text += centerAlign("SCAN TO PAY", cols);
  text += "\n\n"; // एक्स्ट्रा स्पेस ताकि QR कोड बिना किसी रुकावट के प्रिंट हो सके

  text += centerAlign("THANK YOU! VISIT AGAIN", cols);
  text += centerAlign("www.bb-cafe-app.vercel.app", cols);
  text += dividerLine;
  text += formatRow(formattedDate.split(',')[0], `#3-${order.billNumber}`, cols);
  text += "\n\n\n\n";
  return text;
};

// ==========================================
// 5. ब्राउज़र वेब फॉलबैक के लिए HTML टेम्पलेट्स
// ==========================================
export const generateKotHtml = (order: any, config: PrintConfig): string => {
  const itemsHtml = order.items.map((it: any) => `
    <tr style="border-bottom: 1px dashed #ccc;">
      <td style="font-size: 13px; font-weight: 900; padding: 6px 0; color: #000; text-transform: uppercase;">
        ${it.name.toUpperCase()}
        ${it.note ? `<div style="font-size: 11px; color: #333; font-weight: 800; padding-left: 6px; margin-top: 2px;">Note: ${it.note.toUpperCase()}</div>` : ''}
      </td>
      <td style="font-size: 14px; font-weight: 900; text-align: right; padding: 6px 0; color: #000; font-family: monospace;">
        ${it.quantity}
      </td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <style>
          @page { size: ${config.printerPaperSize === '58mm' ? '58mm' : '80mm'} auto; margin: 0; }
          body { font-family: monospace; padding: 6px; font-size: 12px; color: #000; background-color: #fff; margin: 0; }
          .center { text-align: center; }
          .divider { border-top: 1.5px dotted #000; margin: 6px 0; }
        </style>
      </head>
      <body>
        <div class="center" style="font-size: 17px; font-weight: 900; border: 2.5px solid #000; padding: 5px; letter-spacing: 1px; background-color: #000; color: #fff;">
          K.O.T (KITCHEN)
        </div>
        <div class="center" style="font-size: 10px; font-weight: bold; margin-top: 3px; letter-spacing: 0.5px;">BUM BUM CAFE</div>
        
        <div class="divider"></div>
        
        <div style="font-size: 11.5px; font-weight: bold; line-height: 1.4;">
          <div>Token No: <span style="font-size: 13px; font-weight: 900;">#${order.tokenNumber}</span></div>
          <div>Bill No: #${order.billNumber}</div>
          <div>Mode: <span style="font-size: 12px; font-weight: 950; text-transform: uppercase;">${order.fulfillmentType?.toUpperCase()} ${order.tableNumber ? `(${order.tableNumber})` : ''}</span></div>
        </div>
        
        <div class="divider"></div>
        
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; font-size: 11px; font-weight: 900; padding-bottom: 4px;">ITEM</th>
              <th style="text-align: right; font-size: 11px; font-weight: 900; padding-bottom: 4px;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        ${order.chefInstructions ? `
          <div style="margin-top: 10px; padding: 6px; border: 1.5px solid #000; background-color: #fafafa; border-radius: 4px;">
            <div style="font-size: 10px; font-weight: 900; color: #000; text-decoration: underline; margin-bottom: 2px;">CHEF INSTRUCTION:</div>
            <div style="font-size: 12px; font-weight: 900; line-height: 1.3;">${order.chefInstructions.toUpperCase()}</div>
          </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="center" style="font-size: 9.5px; font-weight: bold;">
          Printed on: ${new Date().toLocaleString('en-IN')}
        </div>
      </body>
    </html>
  `;
};

export const generateReceiptHtml = (order: any, config: PrintConfig): string => {
  // मर्चेंट PhonePe टर्मिनल UPI ID
  const upiId = "Q231198993@ybl"; 
  const upiLink = `upi://pay?pa=${upiId}&pn=Bum%20Bum%20Cafe&am=${order.total}&cu=INR`;
  const containerRenderWidth = config.printerPaperSize === '58mm' ? '100%' : '100%';

  const now = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp);
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedReceiptDate = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=115x115&margin=0&data=${encodeURIComponent(upiLink)}`;

  const itemsRows = order.items.map((it: any) => `
    <tr style="border-bottom: 1px dashed #eee;">
      <td style="font-size: 11px; font-weight: bold; padding: 6px 0; color: #111; text-transform: uppercase;">
        ${it.name.toUpperCase()}
      </td>
      <td style="font-size: 11px; font-weight: bold; text-align: center; padding: 6px 0; color: #111; font-family: monospace;">
        ${it.quantity}
      </td>
      <td style="font-size: 11px; font-weight: bold; text-align: right; padding: 6px 0; color: #111; font-family: monospace;">
        ₹${it.price * it.quantity}
      </td>
    </tr>
  `).join('');

  const phoneMarkup = order.customerPhone ? `<div style="font-family: monospace; font-size: 10px; font-weight: bold; margin-top: 2px;">Phone: ${order.customerPhone.replace('+91', '')}</div>` : '';
  const addressMarkup = order.address ? `<div style="font-size: 10px; font-weight: bold; margin-top: 2px; max-width: 100%; word-wrap: break-word;">Address: ${order.address}</div>` : '';

  const loyaltyHeaderMarkup = order.customerPhone ? `
    <div style="background-color: #fafafa; border: 1px dashed #aaa; padding: 5px; margin-top: 6px; font-size: 8.5px; border-radius: 4px; font-family: monospace;">
      <div style="font-weight: 900; color: #b45309; text-align: center; margin-bottom: 4px; font-family: sans-serif; letter-spacing: 0.3px;">LOYALTY POINTS PROFILE</div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Current Point:</span> <span style="color: green; font-weight: 900;">+${order.customerPointsEarned || 0} pts</span></div>
      <div style="display: flex; justify-content: space-between;"><span>Balance Point:</span> <span style="font-weight: 900;">${order.customerPointsAfter || 0} pts</span></div>
    </div>
  ` : '';

  const customDiscountVal = order.discount - (order.customerPointsRedeemed || 0);

  return `
    <html>
      <head>
        <style>
          @page { size: ${config.printerPaperSize === '58mm' ? '58mm' : '80mm'} auto; margin: 0; }
          body { 
            font-family: monospace;
            width: ${containerRenderWidth}; 
            margin: 0; 
            padding: 4px; 
            color: #000; 
            background-color: #fff; 
            font-size: 11px;
            line-height: 1.3;
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .divider { 
            border-top: 1.5px dotted #000; 
            margin: 6px 0; 
            height: 0;
            width: 100%;
          }
          .double-divider { 
            border-top: 1.5px dotted #000; 
            border-bottom: 1.5px dotted #000; 
            margin: 6px 0; 
            height: 3px;
            width: 100%;
          }
          table { width: 100%; border-collapse: collapse; }
          .meta-grid {
            display: grid;
            grid-template-cols: 1fr 1fr;
            font-size: 9.5px;
            row-gap: 2px;
            font-family: monospace;
            font-weight: bold;
            color: #222;
          }
        </style>
      </head>
      <body>
        <div class="center" style="margin-top: 2px; margin-bottom: 6px;">
          <div style="display: inline-block; background-color: #000; color: #fff; padding: 4px 8px; font-size: 13px; font-weight: 900; border-radius: 3px; letter-spacing: 0.5px; margin-bottom: 3px;">
            BUM BUM CAFE
          </div>
          <div style="font-size: 8.5px; line-height: 1.25; font-weight: bold; color: #333;">
            BUS STAND MOHANDRA, PEOPLE TREE,<br/>
            DIST. PANNA, MADHYA PRADESH, 488442
          </div>
          <div style="font-size: 9.5px; font-weight: 800; margin-top: 2px; color: #000; font-family: monospace;">Mo. 9714293759</div>
        </div>

        <div class="divider"></div>

        <div style="font-size: 10px; line-height: 1.35; font-weight: bold; color: #111;">
          <div style="font-size: 9px; color: #555; text-transform: uppercase;">CUSTOMER DETAILS:</div>
          <div style="font-size: 10.5px; font-weight: 800; color: #000; margin-top: 1px;">Name: ${order.customerName || 'Walk-in Guest'}</div>
          ${phoneMarkup}
          ${addressMarkup}
          ${loyaltyHeaderMarkup}
        </div>

        <div class="divider"></div>

        <div class="meta-grid">
          <div>Bill No: #${String(order.billNumber).padStart(4, '0')}</div>
          <div style="text-align: right;">Token: #<strong>${order.tokenNumber}</strong></div>
          <div>Mode: ${order.fulfillmentType?.toUpperCase()}</div>
          <div style="text-align: right;">Pay: ${order.paymentMethod?.toUpperCase()}</div>
          <div>Date: ${formattedReceiptDate}</div>
        </div>

        <div class="divider" style="margin-top: 8px;"></div>
        
        <table style="margin-top: 2px;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000;">
              <th style="text-align: left; font-size: 11px; font-weight: bold; padding-bottom: 4px;">ITEM</th>
              <th style="text-align: center; font-size: 11px; font-weight: bold; padding-bottom: 4px; width: 40px;">QTY</th>
              <th style="text-align: right; font-size: 11px; font-weight: bold; padding-bottom: 4px; width: 70px;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="divider"></div>

        <div style="font-size: 10.5px; font-family: monospace; font-weight: bold; line-height: 1.45; color: #111;">
          <div style="display: flex; justify-content: space-between;">
            <span>Total:</span>
            <span>₹${order.subtotal}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Discount:</span>
            <span>-₹${customDiscountVal > 0 ? customDiscountVal : 0}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Coupon Discount:</span>
            <span>-₹${order.customerPointsRedeemed || 0}</span>
          </div>
          ${order.gstAmount ? `
          <div style="display: flex; justify-content: space-between; color: #444;">
            <span>GST (${order.gstRate}%):</span>
            <span>+₹${order.gstAmount}</span>
          </div>` : ''}
        </div>

        <div class="double-divider"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
          <span style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total</span>
          <span style="font-size: 14px; font-weight: 900; font-family: monospace;">₹${order.total}</span>
        </div>

        <div class="divider"></div>

        <div class="center" style="margin-top: 8px; margin-bottom: 6px;">
          <img src="${qrCodeUrl}" style="width: 105px; height: 105px; display: inline-block; border: 1.5px solid #000; padding: 2px; border-radius: 4px;" />
          <div style="font-size: 8px; font-weight: 900; margin-top: 6px; letter-spacing: 0.5px; color: #000;">BHIM UPI PAYTM/PHONEPE</div>
        </div>

        <div class="divider"></div>

        <div class="center" style="font-size: 8.5px; line-height: 1.4; margin-top: 4px; font-weight: bold; color: #222;">
          <div style="font-weight: 900; font-size: 9px; margin-bottom: 1px;">Follow us</div>
          <div>www.youtube.com/@bbcafe.i</div>
          <div>Social Media: @bbcafe.in</div>
          <div style="margin-top: 4px; font-weight: 900; font-size: 10px; color: #000; font-style: italic;">THANK YOU, VISIT AGAIN!</div>
          <div style="font-size: 9.5px; font-weight: bold; margin-top: 3px; color: #000;">www.bb-cafe-app.vercel.app</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 9px; font-family: monospace; color: #444; margin-top: 10px; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 4px;">
          <span>${formattedReceiptDate}</span>
          <span>#3-${order.billNumber}</span>
        </div>
      </body>
    </html>
  `;
};

// ==========================================
// 6. प्रिंट ट्रिगर करने वाले मुख्य फंक्शन्स
// ==========================================
export const handlePrintKot = async (order: any, config: PrintConfig) => {
  if (
    (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) || 
    (config.printerType === 'thermal_usb' && (config.serialPort || config.usbDevice))
  ) {
    try {
      const kotText = generateKotEscPosText(order, config);
      await sendToPrinterInChunks(config, kotText);
    } catch (err) {
      toast.error("KOT hardware print failed, launching fallback...");
    }
    return;
  }

  const printWindow = window.open('', '_blank', 'width=340,height=600');
  if (!printWindow) return;
  
  const htmlContent = generateKotHtml(order, config);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
};

export const handlePrintReceipt = async (order: any, config: PrintConfig) => {
  // मर्चेंट PhonePe टर्मिनल UPI ID
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

  const htmlContent = generateReceiptHtml(order, config);
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350); 
};
