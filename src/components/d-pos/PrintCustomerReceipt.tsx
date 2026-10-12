'use client';
import React from 'react';

interface PrintReceiptProps {
  orderObj: any;
  currentUser?: any;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export default function PrintCustomerReceipt({ 
  orderObj, 
  currentUser, 
  storeName = 'BUM BUM CAFE', 
  storeAddress = 'न्यू बस स्टैंड मोहंद्रा', 
  storePhone = '9999999999' 
}: PrintReceiptProps) {
  if (!orderObj) return null;

  const orderDate = orderObj.timestamp?.toDate 
    ? orderObj.timestamp.toDate() 
    : new Date(orderObj.timestamp || Date.now());

  let upiId = (orderObj.upiId || 'Q991347275@ybl').trim();
  if (!upiId.includes('@') && upiId.toLowerCase().includes('ybl')) {
    upiId = upiId.replace(/ybl/i, '@ybl');
  }

  // लॉयल्टी पॉइंट्स कैलकुलेशन
  const earnedPts = Number(orderObj.pointsEarned ?? Math.floor((orderObj.total || 0) / 100));
  const redeemedPts = Number(orderObj.pointsRedeemed || 0);
  const balancePts = Number(orderObj.remainingPoints ?? orderObj.customerPoints ?? 0);
  const pointsDiscountAmt = Number(orderObj.pointsDiscount || (redeemedPts > 0 ? redeemedPts : 0));

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0; }
          body, html { margin: 0 !important; padding: 0 !important; height: auto !important; }
          * { overflow: visible !important; }
          .prevent-cut { page-break-inside: avoid; }
        }
      `}</style>

      <div 
        style={{ 
          fontFamily: 'Arial, Helvetica, sans-serif', color: '#000000',
          textRendering: 'optimizeLegibility', WebkitFontSmoothing: 'none' 
        }}
        className="w-[68mm] max-w-[68mm] mx-auto bg-white p-0 text-left select-none print:m-0 print:p-0"
      >
        
        {/* ⭐ टोकन नंबर सबसे ऊपर ⭐ */}
        <div className="mb-2 border-2 border-black py-1.5 text-center bg-white prevent-cut">
          <p className="text-[11px] font-bold uppercase tracking-widest">TOKEN NUMBER</p>
          <p className="text-[28px] font-black leading-none mt-1">#{orderObj.tokenNumber || '01'}</p>
        </div>

        {/* 👉 डायनामिक हेडर */}
        <div className="text-center pb-2 border-b border-black prevent-cut">
          <h1 className="text-xl font-black uppercase tracking-wider leading-tight">{storeName}</h1>
          <p className="text-[11px] font-bold mt-1 leading-snug whitespace-pre-wrap">
            {storeAddress}
          </p>
          <p className="text-[12px] font-bold mt-1">Mob: {storePhone}</p>
        </div>

        {/* इनवॉइस, सर्वर, डेट, टाइम और ऑर्डर टाइप */}
        <div className="text-[11px] font-bold pt-1.5 flex justify-between prevent-cut">
          <span>Invoice: #{orderObj.billNumber || 5001}</span>
          <span>Server: {(currentUser?.name || 'STAFF').toUpperCase()}</span>
        </div>
        <div className="text-[11px] font-bold pt-0.5 flex justify-between prevent-cut">
          <span>Date: {orderDate.toLocaleDateString()}</span>
          <span>Time: {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="text-[11px] font-bold pb-1.5 pt-0.5 border-b border-black flex justify-between prevent-cut">
          <span className="uppercase">Type: {orderObj.fulfillmentType || 'Counter'}</span>
          {orderObj.tableNumber && <span className="font-black text-[12px]">Table: {orderObj.tableNumber}</span>}
        </div>

        {/* कस्टमर विवरण */}
        <div className="text-[11px] font-bold pb-1.5 pt-1.5 border-b border-black prevent-cut">
          <p>Customer: {orderObj.customerName || 'Walk-in Guest'}</p>
          {orderObj.customerPhone && <p>Phone: {orderObj.customerPhone}</p>}
        </div>

        {/* आइटम सूची */}
        <div className="py-1.5 border-b border-black">
          <div className="flex w-full text-[11px] font-bold uppercase pb-1 border-b-2 border-dotted border-black prevent-cut">
            <div className="flex-1 text-left">ITEM</div>
            <div className="w-[35px] text-center">QTY</div>
            <div className="w-[50px] text-right">AMT</div>
          </div>
          <div className="space-y-2 pt-2">
            {orderObj.items?.map((item: any, idx: number) => (
              <div key={idx} className="text-[12px] leading-tight prevent-cut">
                <div className="flex w-full font-bold items-start">
                  <div className="flex-1 text-left pr-1 break-words">{item.name}</div>
                  <div className="w-[35px] text-center shrink-0">{item.quantity}</div>
                  <div className="w-[50px] text-right shrink-0">₹{item.price * item.quantity}</div>
                </div>
                {item.quantity > 1 && <div className="text-[10px] text-black text-left mt-0.5">@ ₹{item.price} /pc</div>}
                {item.note && <div className="text-[10px] italic mt-0.5 font-semibold text-black">Note: {item.note}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* बिल टोटल्स */}
        <div className="py-2 border-b border-black text-[12px] space-y-1 prevent-cut">
          <div className="flex justify-between font-bold"><span>Subtotal:</span><span>₹{orderObj.subtotal || orderObj.total}</span></div>
          {orderObj.discountAmount > 0 && <div className="flex justify-between font-bold"><span>Discount:</span><span>-₹{orderObj.discountAmount}</span></div>}
          {pointsDiscountAmt > 0 && <div className="flex justify-between font-bold"><span>Points Redeemed:</span><span>-₹{pointsDiscountAmt}</span></div>}
          <div className="flex justify-between text-[14px] font-black pt-1.5 mt-1 border-t-2 border-black"><span>GRAND TOTAL:</span><span>₹{orderObj.total}</span></div>
          <div className="flex justify-between text-[11px] font-bold uppercase pt-1"><span>Payment Mode:</span><span>{orderObj.paymentMethod || 'CASH'}</span></div>
        </div>

        {/* ⭐ LOYALTY POINTS SECTION ⭐ */}
        {(earnedPts > 0 || redeemedPts > 0 || balancePts > 0) && (
          <div className="py-2 border-b border-black text-[11px] prevent-cut text-center pb-2">
            <p className="font-black uppercase mb-1 tracking-wider">⭐ Loyalty Rewards ⭐</p>
            <div className="flex flex-col gap-0.5 text-left font-bold">
              {earnedPts > 0 && (
                <div className="flex justify-between">
                  <span>Points Earned:</span>
                  <span>+{earnedPts} Pts</span>
                </div>
              )}
              {redeemedPts > 0 && (
                <div className="flex justify-between">
                  <span>Points Redeemed:</span>
                  <span>-{redeemedPts} Pts</span>
                </div>
              )}
              <div className="flex justify-between text-[12px] font-black border-t border-dotted border-black pt-1 mt-1">
                <span>Point Balance:</span>
                <span>{balancePts} Pts</span>
              </div>
            </div>
          </div>
        )}

        {/* 100% OFFLINE QR कोड */}
        {orderObj.offlineQrUrl && (
          <div className="py-2 text-center border-b border-black flex flex-col items-center justify-center prevent-cut">
            <p className="text-[12px] font-black uppercase tracking-wider mb-1">SCAN TO PAY ₹{orderObj.total}</p>
            <div className="p-0.5 bg-white border-2 border-black inline-block rounded">
              <img src={orderObj.offlineQrUrl} alt="UPI QR Code" className="w-32 h-32 object-contain block mx-auto" style={{ imageRendering: 'pixelated', filter: 'grayscale(100%) contrast(150%)' }} />
            </div>
            <p className="text-[12px] font-bold mt-1.5 font-mono text-black">UPI: {upiId}</p>
          </div>
        )}

        {/* 👉 डायनामिक फुटर */}
        <div className="pt-2 pb-4 text-center flex flex-col items-center justify-center prevent-cut">
          <p className="text-[11px] font-bold">Online Order Website:</p>
          <p className="text-[13px] font-black tracking-wide my-0.5">bb-cafe-app.vercel.app</p>
          <p className="text-[12px] font-bold mt-1">❤ Thank You, Visit Again ❤</p>
          <p className="text-[10px] font-normal mt-1 border-t border-dotted border-black pt-1 inline-block w-full">
            Powered by {storeName.replace(/\s+/g, '')} POS
          </p>
        </div>
      </div>
    </>
  );
}
