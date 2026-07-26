export interface PrintConfig {
  printerPaperSize: '58mm' | '80mm';
  printerType: 'thermal_usb' | 'thermal_bluetooth' | 'network_ip' | 'laser';
  bleCharacteristic?: any;
  serialPort?: any;
  usbDevice?: any;
}

// फायरबेस टाइमस्टैम्प को सुरक्षित रूप से डेट स्ट्रिंग में बदलने का फंक्शन
function formatDate(timestamp: any): string {
  try {
    if (!timestamp) return new Date().toLocaleString('en-IN');
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString('en-IN');
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString('en-IN');
    }
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? new Date().toLocaleString('en-IN') : date.toLocaleString('en-IN');
  } catch (e) {
    return new Date().toLocaleString('en-IN');
  }
}

// दो तरफ के टेक्स्ट को थर्मल प्रिंटर की विड्थ के अनुसार अलाइन करने का हेल्पर (Bluetooth/Serial के लिए)
function padSpaces(left: string, right: string, maxLen: number): string {
  const leftLen = left.length;
  const rightLen = right.length;
  const spacesNeeded = maxLen - (leftLen + rightLen);
  if (spacesNeeded <= 0) return left + " " + right;
  return left + " ".repeat(spacesNeeded) + right;
}

// KOT (Kitchen Order Ticket) प्रिंट करने का फंक्शन
export async function handlePrintKot(order: any, config: PrintConfig) {
  const is58 = config.printerPaperSize === '58mm';
  const widthChars = is58 ? 32 : 48;

  // 1. यदि हार्डवेयर डायरेक्ट कनेक्शन एक्टिव है (Bluetooth/USB Serial)
  if (
    (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) ||
    (config.printerType === 'thermal_usb' && (config.serialPort || config.usbDevice))
  ) {
    let text = "";
    text += "================================\n";
    text += "           K.O.T\n";
    text += `Bill No: #${String(order.billNumber).padStart(4, '0')}\n`;
    text += `Token No: #${order.tokenNumber}\n`;
    text += `Type: ${order.fulfillmentType.toUpperCase()}\n`;
    if (order.tableNumber) text += `Table: ${order.tableNumber}\n`;
    text += `Date: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    text += "--------------------------------\n";
    text += "Item Name               Qty\n";
    text += "--------------------------------\n";

    (order.items || []).forEach((it: any) => {
      const name = it.name.substring(0, 24);
      const qty = `x${it.quantity}`;
      text += padSpaces(name, qty, widthChars) + "\n";
      if (it.note) {
        text += ` * Note: ${it.note}\n`;
      }
    });

    text += "--------------------------------\n";
    if (order.chefInstructions) {
      text += `Inst: ${order.chefInstructions}\n`;
    }
    text += "\n\n\n\n"; // कटर स्पेस

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(text);
    const cutBytes = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);
    const finalBytes = new Uint8Array(dataBytes.length + cutBytes.length);
    finalBytes.set(dataBytes);
    finalBytes.set(cutBytes, dataBytes.length);

    try {
      if (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) {
        await config.bleCharacteristic.writeValue(finalBytes);
      } else if (config.printerType === 'thermal_usb' && config.serialPort) {
        const writer = config.serialPort.writable.getWriter();
        await writer.write(finalBytes);
        writer.releaseLock();
      } else if (config.printerType === 'thermal_usb' && config.usbDevice) {
        await config.usbDevice.transferOut(3, finalBytes);
      }
      return;
    } catch (err) {
      console.error("Direct KOT hardware print failed, falling back to browser dialog...", err);
    }
  }

  // 2. Fallback: Browser Print Window (सिस्टम ड्राइवर आधारित प्रिंटिंग)
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) return;

  const style = `
    <style>
      @media print {
        @page { margin: 0; }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: 'Courier New', Courier, monospace;
        }
      }
      .kot-container {
        width: ${is58 ? '52mm' : '76mm'};
        padding: 1.5mm 1mm;
        margin: 0;
        font-size: 10px;
        line-height: 1.15;
      }
      .kot-title {
        font-size: 13px;
        font-weight: bold;
        text-align: center;
        border-bottom: 1px dashed #000;
        padding-bottom: 2px;
        margin-bottom: 3px;
      }
      .kot-meta {
        font-size: 9px;
        margin-bottom: 4px;
      }
      .kot-table {
        width: 100%;
        font-size: 9px;
        border-collapse: collapse;
      }
      .kot-table th {
        border-bottom: 1px dashed #000;
        text-align: left;
        padding: 2px 0;
      }
      .kot-table td {
        padding: 2px 0;
        vertical-align: top;
      }
      .kot-divider {
        border-top: 1px dashed #000;
        margin: 4px 0;
      }
    </style>
  `;

  const html = `
    <html>
      <head>${style}</head>
      <body>
        <div class="kot-container">
          <div class="kot-title">K.O.T (Kitchen Order)</div>
          <div class="kot-meta">
            <b>Bill No:</b> #${String(order.billNumber).padStart(4, '0')}<br/>
            <b>Token No:</b> #${order.tokenNumber}<br/>
            <b>Fulfillment:</b> ${order.fulfillmentType.toUpperCase()}<br/>
            ${order.tableNumber ? `<b>Table:</b> ${order.tableNumber}<br/>` : ''}
            <b>Time:</b> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div class="kot-divider"></div>
          <table class="kot-table">
            <thead>
              <tr>
                <th style="width: 75%;">Item</th>
                <th style="width: 25%; text-align: right;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map((it: any) => `
                <tr>
                  <td>
                    <b>${it.name}</b>
                    ${it.note ? `<br/><span style="font-size: 8px; color: #444;">* Note: ${it.note}</span>` : ''}
                  </td>
                  <td style="text-align: right; font-weight: bold;">x${it.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="kot-divider"></div>
          ${order.chefInstructions ? `<div style="font-size: 9px;"><b>Chef Inst:</b> ${order.chefInstructions}</div>` : ''}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

// मुख्य ग्राहक रसीद प्रिंट करने का फंक्शन
export async function handlePrintReceipt(order: any, config: PrintConfig) {
  const is58 = config.printerPaperSize === '58mm';
  const widthChars = is58 ? 32 : 48;

  // यूपीआई भुगतान यूआरएल (UPI URL)
  const upiId = "bumbumcafe@upi";
  const upiUrl = `upi://pay?pa=${upiId}&pn=BumBumCafe&am=${order.total}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=75x75&data=${encodeURIComponent(upiUrl)}`;

  // 1. यदि हार्डवेयर डायरेक्ट कनेक्शन एक्टिव है (Bluetooth/USB Serial)
  if (
    (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) ||
    (config.printerType === 'thermal_usb' && (config.serialPort || config.usbDevice))
  ) {
    let text = "";
    text += "================================\n";
    text += "         BUM BUM CAFE\n";
    text += "      Mohandra Town, MP\n";
    text += "        Ph: 9827XXXXXX\n";
    text += "================================\n";
    text += `Bill No: #${String(order.billNumber).padStart(4, '0')}\n`;
    text += `Token: #${order.tokenNumber}\n`;
    text += `Type: ${order.fulfillmentType.toUpperCase()}\n`;
    if (order.tableNumber) text += `Table: ${order.tableNumber}\n`;
    text += `Date: ${formatDate(order.timestamp)}\n`;
    text += "--------------------------------\n";
    text += "Item Name         Qty     Total\n";
    text += "--------------------------------\n";

    (order.items || []).forEach((it: any) => {
      const leftCol = `${it.name.substring(0, 16)} x${it.quantity}`;
      const rightCol = `₹${it.price * it.quantity}`;
      text += padSpaces(leftCol, rightCol, widthChars) + "\n";
      if (it.note) text += ` * Note: ${it.note}\n`;
    });

    text += "--------------------------------\n";
    text += padSpaces("Subtotal:", `₹${order.subtotal}`, widthChars) + "\n";
    if (order.discount > 0) {
      text += padSpaces("Discount:", `-₹${order.discount}`, widthChars) + "\n";
    }
    if (order.gstAmount > 0) {
      text += padSpaces(`GST (${order.gstRate}%):`, `+₹${order.gstAmount}`, widthChars) + "\n";
    }
    text += "--------------------------------\n";
    text += padSpaces("GRAND TOTAL:", `₹${order.total}`, widthChars) + "\n";
    text += "--------------------------------\n";
    text += "       SCAN TO PAY (UPI)\n";
    text += `      UPI: ${upiId}\n`;
    text += `      Amount: ₹${order.total}\n`;
    text += "--------------------------------\n";
    text += "  Thank you! Visit Us Again.\n";
    text += "\n\n\n\n"; // कटर स्पेस

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(text);
    const cutBytes = new Uint8Array([0x1d, 0x56, 0x42, 0x00]);
    const finalBytes = new Uint8Array(dataBytes.length + cutBytes.length);
    finalBytes.set(dataBytes);
    finalBytes.set(cutBytes, dataBytes.length);

    try {
      if (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) {
        await config.bleCharacteristic.writeValue(finalBytes);
      } else if (config.printerType === 'thermal_usb' && config.serialPort) {
        const writer = config.serialPort.writable.getWriter();
        await writer.write(finalBytes);
        writer.releaseLock();
      } else if (config.printerType === 'thermal_usb' && config.usbDevice) {
        await config.usbDevice.transferOut(3, finalBytes);
      }
      return;
    } catch (err) {
      console.error("Direct hardware print failed, falling back to browser window...", err);
    }
  }

  // 2. Fallback: Browser Print Window (कम्पैक्ट विजुअल लेआउट)
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) return;

  const style = `
    <style>
      @media print {
        @page { margin: 0; }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: 'Courier New', Courier, monospace;
        }
      }
      .bill-container {
        width: ${is58 ? '52mm' : '76mm'};
        padding: 2mm 1mm;
        margin: 0;
        font-size: 9.5px;
        line-height: 1.15;
        box-sizing: border-box;
      }
      .bill-header {
        text-align: center;
        margin-bottom: 4px;
      }
      .bill-title {
        font-size: 13px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 0 0 1px 0;
      }
      .bill-subtitle {
        font-size: 8px;
        color: #333;
        margin: 0;
      }
      .bill-meta {
        font-size: 8.5px;
        margin-bottom: 4px;
      }
      .bill-divider {
        border-top: 1px dashed #000;
        margin: 3px 0;
      }
      .bill-table {
        width: 100%;
        font-size: 8.5px;
        border-collapse: collapse;
      }
      .bill-table th {
        border-bottom: 1px dashed #000;
        text-align: left;
        padding: 2px 0;
        font-weight: bold;
      }
      .bill-table td {
        padding: 2px 0;
        vertical-align: top;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        margin: 1.5px 0;
      }
      .grand-total {
        font-size: 11px;
        font-weight: bold;
        border-top: 1px dashed #000;
        border-bottom: 1px dashed #000;
        padding: 3px 0;
        margin-top: 3px;
      }
      .qr-box {
        text-align: center;
        margin: 5px auto;
        padding: 4px;
        border: 1px dashed #000;
        border-radius: 4px;
        max-width: 90%;
        display: block;
        box-sizing: border-box;
      }
      .qr-title {
        font-size: 8.5px;
        font-weight: bold;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
        display: block;
      }
      .qr-img {
        width: 75px;
        height: 75px;
        display: block;
        margin: 0 auto;
      }
      .qr-footer-text {
        font-size: 7.5px;
        color: #555;
        margin-top: 2px;
        display: block;
      }
    </style>
  `;

  const html = `
    <html>
      <head>${style}</head>
      <body>
        <div class="bill-container">
          <div class="bill-header">
            <h1 class="bill-title">Bum Bum Cafe</h1>
            <p class="bill-subtitle">Mohandra Town, Panna (M.P.)<br/>Ph: 9827XXXXXX</p>
          </div>
          <div class="bill-divider"></div>
          <div class="bill-meta">
            <b>Bill No:</b> #${String(order.billNumber).padStart(4, '0')}<br/>
            <b>Token No:</b> #${order.tokenNumber}<br/>
            <b>Fulfillment:</b> ${order.fulfillmentType.toUpperCase()}<br/>
            ${order.tableNumber ? `<b>Table No:</b> ${order.tableNumber}<br/>` : ''}
            <b>Date:</b> ${formatDate(order.timestamp)}
          </div>
          <div class="bill-divider"></div>
          
          <table class="bill-table">
            <thead>
              <tr>
                <th style="width: 50%;">Item</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 35%; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map((it: any) => `
                <tr>
                  <td>
                    ${it.name}
                    ${it.note ? `<br/><span style="font-size: 7.5px; color: #444;">(${it.note})</span>` : ''}
                  </td>
                  <td style="text-align: center;">${it.quantity}</td>
                  <td style="text-align: right;">₹${it.price * it.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="bill-divider"></div>
          
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${order.subtotal}</span>
          </div>
          ${order.discount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-₹${order.discount}</span>
            </div>
          ` : ''}
          ${order.gstAmount > 0 ? `
            <div class="total-row">
              <span>GST (${order.gstRate}%):</span>
              <span>+₹${order.gstAmount}</span>
            </div>
          ` : ''}
          
          <div class="total-row grand-total">
            <span>GRAND TOTAL:</span>
            <span>₹${order.total}</span>
          </div>

          <!-- क्यूआर कोड: "SCAN TO PAY" के ठीक नीचे और छोटे अलाइनमेंट में -->
          <div class="qr-box">
            <span class="qr-title">SCAN TO PAY (UPI)</span>
            <img class="qr-img" src="${qrCodeUrl}" alt="UPI QR Code" />
            <span class="qr-footer-text">Scan with GPay, BHIM, Paytm, PhonePe</span>
          </div>

          <div style="text-align: center; font-size: 8px; margin-top: 6px; border-top: 1px dashed #000; padding-top: 3px;">
            Thank you! Visit Us Again.
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
