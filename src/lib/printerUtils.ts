import toast from 'react-hot-toast';

export interface PrintConfig {
  printerPaperSize: '58mm' | '80mm';
  printerType: 'thermal_usb' | 'thermal_bluetooth' | 'network_ip' | 'laser';
  bleCharacteristic: any;
  serialPort: any;
  usbDevice: any;
}

// डायरेक्ट हार्डवेयर प्रिंटर के लिए UPI QR कोड बाइट्स (ESC/POS) जेनरेटर
export const generateEscPosQrBytes = (upiUrl: string): Uint8Array => {
  const encoder = new TextEncoder();
  const urlBytes = encoder.encode(upiUrl);
  const pL = (urlBytes.length + 3) & 0xFF;
  const pH = ((urlBytes.length + 3) >> 8) & 0xFF;

  // ESC/POS QR Code कमांड्स
  const commands = [
    // 1. Set model (Model 2)
    0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
    // 2. Set module size (size 6 dots)
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06,
    // 3. Set error correction level (Level L)
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30,
    // 4. Store data in symbol storage area
    0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...Array.from(urlBytes),
    // 5. Print QR Code symbol
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x48,
    0x0A, 0x0A
  ];
  return new Uint8Array(commands);
};

// बफर ओवरफ़्लो रोकने के लिए छोटे चंक्स में प्रिंट बाइट्स भेजने का फ़ंक्शन
export const sendToPrinterInChunks = async (
  config: PrintConfig,
  text: string,
  upiUrl?: string
) => {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  
  let finalBytes = textBytes;
  if (upiUrl) {
    const qrBytes = generateEscPosQrBytes(upiUrl);
    const combined = new Uint8Array(textBytes.length + qrBytes.length);
    combined.set(textBytes);
    combined.set(qrBytes, textBytes.length);
    finalBytes = combined;
  }

  const chunkSize = 120; // 120 बाइट्स का सुरक्षित आकार

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

// K.O.T डायरेक्ट प्रिंटर टेक्स्ट जेनरेटर (No Chinese, items left-aligned, qty right-aligned)
export const generateKotEscPosText = (order: any): string => {
  const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
  const dividerLine = "--------------------------------\n";
  const doubleDivider = "================================\n";
  
  let text = "";
  text += doubleDivider;
  text += "             K.O.T              \n";
  text += "     BUM BUM CAFE - KITCHEN     \n";
  text += doubleDivider;
  text += `Token No: #${order.tokenNumber}\n`;
  text += `Bill No: #${String(order.billNumber).padStart(4, '0')}\n`;
  text += `Date: ${formattedDate}\n`;
  text += `Type: ${order.fulfillmentType?.toUpperCase()}\n`;
  if (order.fulfillmentType === 'table') {
    text += `Table: ${order.tableNumber}\n`;
  }
  text += dividerLine;
  text += "ITEM                       QTY  \n";
  text += dividerLine;
  
  order.items.forEach((it: any) => {
    const itemLine = `${it.name.toUpperCase().slice(0, 24).padEnd(25)}${String(it.quantity).padStart(7)}\n`;
    text += itemLine;
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

// रसीद डायरेक्ट प्रिंटर टेक्स्ट जेनरेटर (No Chinese, Customer details inside header, Aligned details)
export const generateEscPosText = (order: any): string => {
  const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
  const dividerLine = "--------------------------------\n";
  const doubleDivider = "================================\n";
  
  let text = "";
  text += doubleDivider;
  text += "          BUM BUM CAFE          \n";
  text += "     MOHANDRA, PANNA (M.P.)     \n";
  text += doubleDivider;
  
  // Customer details in header
  text += "CUSTOMER DETAILS:\n";
  text += `Name: ${order.customerName || 'Walk-in Guest'}\n`;
  if (order.customerPhone) {
    text += `Phone: ${order.customerPhone}\n`;
    text += `Prev Points: ${order.customerPointsBefore || 0}\n`;
    text += `Earned: +${order.customerPointsEarned || 0}  Redeemed: -${order.customerPointsRedeemed || 0}\n`;
    text += `New Balance: ${order.customerPointsAfter || 0}\n`;
  }
  text += dividerLine;

  // Metadata
  text += `Bill No: #${String(order.billNumber).padStart(4, '0')}\n`;
  text += `Token No: #${order.tokenNumber}\n`;
  text += `Date: ${formattedDate}\n`;
  text += `Type: ${order.fulfillmentType?.toUpperCase()}\n`;
  text += `Pay Mode: ${order.paymentMethod?.toUpperCase()}\n`;
  text += dividerLine;

  // Items alignment: name on line 1, qty/price/total on line 2
  order.items.forEach((it: any) => {
    text += `${it.name.toUpperCase()}\n`;
    const qtyPrice = `  ${it.quantity} x Rs.${it.price}`;
    const itemTotal = `Rs.${it.price * it.quantity}`;
    text += `${qtyPrice.padEnd(20)}${itemTotal.padStart(12)}\n`;
    if (it.note) text += `  Note: (${it.note.toUpperCase()})\n`;
  });

  // Vertical totals stack
  text += dividerLine;
  text += `Total:              Rs.${order.subtotal}\n`;
  
  const customDiscountVal = order.discount - (order.customerPointsRedeemed || 0);
  text += `Discount:           Rs.${customDiscountVal > 0 ? customDiscountVal : 0}\n`;
  text += `Coupon Discount:    Rs.${order.customerPointsRedeemed || 0}\n`;
  
  if (order.gstAmount) {
    text += `GST (${order.gstRate}%):        Rs.${order.gstAmount}\n`;
  }
  
  text += dividerLine;
  text += `GRAND TOTAL:        Rs.${order.total}\n`;
  text += dividerLine;
  
  text += "          SCAN TO PAY           \n";
  text += "\n\n"; 
  text += "    THANK YOU! VISIT AGAIN      \n";
  text += "      BBCAFE.IN / YOUTUBE       \n";
  text += dividerLine;
  text += `Date: ${formattedDate}  #3-${order.billNumber}\n`;
  text += "\n\n\n\n";
  return text;
};

// K.O.T प्रिंट फ़ंक्शन (सिस्टम प्रिंट डायलॉग और डायरेक्ट हार्डवेयर दोनों के लिए)
export const handlePrintKot = async (order: any, config: PrintConfig) => {
  if (
    (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) || 
    (config.printerType === 'thermal_usb' && (config.serialPort || config.usbDevice))
  ) {
    try {
      const kotText = generateKotEscPosText(order);
      await sendToPrinterInChunks(config, kotText);
    } catch (err) {
      toast.error("KOT hardware print failed, launching fallback...");
    }
    return;
  }

  const printWindow = window.open('', '_blank', 'width=340,height=600');
  if (!printWindow) return;
  
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

  printWindow.document.write(`
    <html>
      <head>
        <style>
          @page { size: ${config.printerPaperSize === '58mm' ? '58mm' : '80mm'} auto; margin: 0; }
          body { font-family: monospace; padding: 6px; font-size: 12px; color: #000; background-color: #fff; }
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
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350);
};

// ग्राहक रसीद प्रिंट फ़ंक्शन (सिस्टम प्रिंट डायलॉग और डायरेक्ट हार्डवेयर दोनों के लिए)
export const handlePrintReceipt = async (order: any, config: PrintConfig) => {
  const upiId = "9714293759@paytm"; 
  const upiLink = `upi://pay?pa=${upiId}&pn=Bum%20Bum%20Cafe&am=${order.total}&cu=INR`;

  if (
    (config.printerType === 'thermal_bluetooth' && config.bleCharacteristic) || 
    (config.printerType === 'thermal_usb' && (config.serialPort || config.usbDevice))
  ) {
    const toastId = toast.loading("Sending directly to thermal printer...");
    try {
      const receiptText = generateEscPosText(order);
      // टेक्स्ट के साथ डायनेमिक UPI QR कोड बाइट्स भी एक साथ भेज रहे हैं
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

  const pageDimensionsWidth = config.printerPaperSize === '58mm' ? '58mm' : '80mm';
  const containerRenderWidth = config.printerPaperSize === '58mm' ? '48mm' : '72mm';

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

  const printWindow = window.open('', '_blank', 'width=340,height=600');
  if (!printWindow) {
    toast.error("Popup blocked! Please allow popups for this POS.");
    return;
  }
  
  const itemsRows = order.items.map((it: any) => {
    let noteFormatted = "";
    if (it.note) {
      noteFormatted = it.note.startsWith("+") ? it.note : "+ " + it.note;
    }
    return `
      <tr>
        <td style="font-size: 11px; font-weight: bold; padding: 4px 0 1px 0; color: #111; vertical-align: top;">
          ${it.name.toUpperCase()}
          ${noteFormatted ? `<br/><span style="font-size: 9px; font-weight: bold; color: #555; padding-left: 4px; font-style: italic;">Note: ${noteFormatted}</span>` : ''}
        </td>
      </tr>
      <tr>
        <td style="font-size: 9.5px; color: #666; padding-bottom: 4px; font-weight: 500; font-family: monospace; border-bottom: 1px dashed #eee; display: flex; justify-content: space-between;">
          <span>${it.quantity} x Rs.${it.price}</span>
          <span style="font-family: monospace; font-weight: bold; color: #111;">Rs.${it.price * it.quantity}</span>
        </td>
      </tr>
    `;
  }).join('');

  const phoneMarkup = order.customerPhone ? `<div style="font-family: monospace; font-size: 10px; font-weight: bold; margin-top: 2px;">Phone: ${order.customerPhone.replace('+91', '')}</div>` : '';

  const loyaltyHeaderMarkup = order.customerPhone ? `
    <div style="background-color: #fafafa; border: 1px dashed #aaa; padding: 5px; margin-top: 6px; font-size: 8.5px; border-radius: 4px; font-family: monospace;">
      <div style="font-weight: 900; color: #b45309; text-align: center; margin-bottom: 3px; font-family: sans-serif; letter-spacing: 0.3px;">LOYALTY POINTS PROFILE</div>
      <div style="display: flex; justify-content: space-between;"><span>Prev Balance:</span> <span>${order.customerPointsBefore || 0} pts</span></div>
      <div style="display: flex; justify-content: space-between;"><span>Points Earned:</span> <span style="color: green;">+${order.customerPointsEarned || 0} pts</span></div>
      <div style="display: flex; justify-content: space-between;"><span>Points Redeemed:</span> <span style="color: red;">-${order.customerPointsRedeemed || 0} pts</span></div>
      <div style="display: flex; justify-content: space-between; font-weight: 900; border-top: 1px dotted #ccc; padding-top: 2px; margin-top: 2px; color: #000; font-size: 9px;"><span>New Balance:</span> <span>${order.customerPointsAfter || 0} pts</span></div>
    </div>
  ` : '';

  const customDiscountVal = order.discount - (order.customerPointsRedeemed || 0);

  printWindow.document.write(`
    <html>
      <head>
        <title>Bill #${order.billNumber}</title>
        <style>
          @page { 
            size: ${pageDimensionsWidth} auto; 
            margin: 0mm; 
          }
          body { 
            font-family: monospace;
            width: ${containerRenderWidth}; 
            margin: 0 auto; 
            padding: 4px; 
            color: #000; 
            background-color: #fff; 
            font-size: 11px;
            line-height: 1.3;
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

        <!-- Customer Details strictly inside Receipt Header -->
        <div style="font-size: 10px; line-height: 1.35; font-weight: bold; color: #111;">
          <div style="font-size: 9px; color: #555; text-transform: uppercase;">CUSTOMER DETAILS:</div>
          <div style="font-size: 10.5px; font-weight: 800; color: #000; margin-top: 1px;">Name: ${order.customerName || 'Walk-in Guest'}</div>
          ${phoneMarkup}
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
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="divider"></div>

        <div style="font-size: 10.5px; font-family: monospace; font-weight: bold; line-height: 1.45; color: #111;">
          <div style="display: flex; justify-content: space-between;">
            <span>Total:</span>
            <span>Rs.${order.subtotal}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Discount:</span>
            <span>-Rs.${customDiscountVal > 0 ? customDiscountVal : 0}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Coupon Discount:</span>
            <span>-Rs.${order.customerPointsRedeemed || 0}</span>
          </div>
          ${order.gstAmount ? `
          <div style="display: flex; justify-content: space-between; color: #444;">
            <span>GST (${order.gstRate}%):</span>
            <span>+Rs.${order.gstAmount}</span>
          </div>` : ''}
        </div>

        <div class="double-divider"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0;">
          <span style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Grand Total</span>
          <span style="font-size: 14px; font-weight: 900; font-family: monospace;">Rs.${order.total}</span>
        </div>

        <div class="divider"></div>

        <div class="center" style="margin-top: 8px; margin-bottom: 6px;">
          <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: #000; letter-spacing: 0.2px;">
            SCAN TO PAY: Rs.${order.total}
          </div>
          <img src="${qrCodeUrl}" style="width: 105px; height: 105px; display: inline-block; border: 1.5px solid #000; padding: 2px; border-radius: 4px;" />
          <div style="font-size: 8px; font-weight: 900; margin-top: 4px; letter-spacing: 0.5px; color: #000;">BHIM UPI PAYTM</div>
        </div>

        <div class="divider"></div>

        <div class="center" style="font-size: 8.5px; line-height: 1.4; margin-top: 4px; font-weight: bold; color: #222;">
          <div style="font-weight: 900; font-size: 9px; margin-bottom: 1px;">Follow us</div>
          <div>www.youtube.com/@bbcafe.i</div>
          <div>Social Media: @bbcafe.in</div>
          <div style="margin-top: 4px; font-weight: 900; font-size: 10px; color: #000; font-style: italic;">THANK YOU, VISIT AGAIN!</div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 9px; font-family: monospace; color: #444; margin-top: 10px; font-weight: bold; border-top: 1px dashed #ccc; padding-top: 4px;">
          <span>${formattedReceiptDate}</span>
          <span>#3-${order.billNumber}</span>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 350); 
};
