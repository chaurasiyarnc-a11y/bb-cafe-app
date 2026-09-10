'use client';
import React from 'react';

interface PrintReceiptProps {
  orderObj: any;
  currentUser?: any;
}

export default function PrintCustomerReceipt({ orderObj, currentUser }: PrintReceiptProps) {
  if (!orderObj) return null;

  const orderDate = orderObj.timestamp?.toDate 
    ? orderObj.timestamp.toDate() 
    : new Date(orderObj.timestamp || Date.now());

  let upiId = (orderObj.upiId || 'Q991347275@ybl').trim();
  if (!upiId.includes('@') && upiId.toLowerCase().includes('ybl')) {
    upiId = upiId.replace(/ybl/i, '@ybl');
  }

  const totalAmount = Number(orderObj.total || 0).toFixed(2);
  const payeeName = 'Bum Bum Cafe';
  
  const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiString)}&margin=1`;

  // लॉयल्टी पॉइंट्स का सटीक कैलकुलेशन
  const earnedPts = Number(orderObj.pointsEarned ?? Math.floor((orderObj.total || 0) / 100));
  const redeemedPts = Number(orderObj.pointsRedeemed || 0);
  const balancePts = Number(orderObj.remainingPoints ?? orderObj.customerPoints ?? 0);
  const pointsDiscountAmt = Number(orderObj.pointsDiscount || (redeemedPts > 0 ? redeemedPts : 0));

  return (
    <div 
      style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
      className="w-[68mm] max-w-[68mm] mx-auto text-black bg-white p-0 pr-1 text-left select-none"
    >
      {/* हेडर */}
      <div className="text-center pb-2 border-b border-black">
        <h1 className="text-lg font-black uppercase tracking-wider leading-tight">BUM BUM CAFE</h1>
        <p className="text-[10px] font-bold mt-1 leading-snug">
          न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने,<br />
          जिला पन्ना, मोहंद्रा, मध्य प्रदेश - 488442
        </p>
        <p className="text-[11px] font-black mt-1">Mob: 9714293759</p>
      </div>

      {/* इनवॉइस और सर्वर */}
      <div className="text-[10px] font-bold py-1 border-b border-black flex justify-between pr-1">
        <span>Invoice: #{orderObj.billNumber || 5001}</span>
        <span>Server: {(currentUser?.name || 'YOGESH').toUpperCase()}</span>
      </div>
      <div className="text-[10px] font-bold pb-1 flex justify-between pr-1">
        <span>Date: {orderDate.toLocaleDateString()}</span>
        <span>Time: {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* टोकन नंबर */}
      <div className="my-1.5 border-2 border-black py-1 text-center bg-white">
        <p className="text-[9px] font-black uppercase tracking-widest">TOKEN NUMBER</p>
        <p className="text-2xl font-black">#{orderObj.tokenNumber || '01'}</p>
      </div>

      {/* कस्टमर विवरण */}
      <div className="text-[10px] font-bold pb-1.5 border-b border-black">
        <p>Customer: {orderObj.customerName || 'Walk-in Guest'}</p>
        {orderObj.customerPhone && <p>Phone: {orderObj.customerPhone}</p>}
        <p className="uppercase">Type: {orderObj.fulfillmentType || 'Counter'}</p>
        {orderObj.tableNumber && <p className="font-black">Table: {orderObj.tableNumber}</p>}
      </div>

      {/* आइटम सूची */}
      <div className="py-1.5 border-b border-black">
        <div className="flex justify-between text-[10px] font-black uppercase pb-1 border-b border-dashed border-black pr-1">
          <span>ITEM DESCRIPTION</span>
          <span>TOTAL</span>
        </div>

        <div className="space-y-1.5 pt-1.5 pr-1">
          {orderObj.items?.map((item: any, idx: number) => (
            <div key={idx} className="text-[11px] leading-tight">
              <div className="flex justify-between font-black items-start">
                <span className="pr-1 break-words flex-1">
                  {item.quantity} x {item.name}
                </span>
                <span className="shrink-0 font-bold ml-1">₹{item.price * item.quantity}</span>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-black pl-3">
                <span>Price: ₹{item.price}</span>
              </div>
              {item.note && (
                <p className="text-[9px] italic pl-3 font-bold text-black">
                  Note: {item.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* बिल टोटल्स (सबटोटल, डिस्काउंट व पॉइंट्स डिस्काउंट) */}
      <div className="py-1.5 border-b border-black text-[11px] space-y-1 pr-1">
        <div className="flex justify-between font-bold">
          <span>Subtotal:</span>
          <span>₹{orderObj.subtotal || orderObj.total}</span>
        </div>

        {orderObj.discountAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Discount:</span>
            <span>-₹{orderObj.discountAmount}</span>
          </div>
        )}

        {pointsDiscountAmt > 0 && (
          <div className="flex justify-between font-bold">
            <span>Points Redeemed:</span>
            <span>-₹{pointsDiscountAmt}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{orderObj.total}</span>
        </div>

        <div className="flex justify-between text-[10px] font-black uppercase pt-0.5">
          <span>Payment Mode:</span>
          <span>{orderObj.paymentMethod || 'CASH'}</span>
        </div>
      </div>

      {/* ⭐ लॉयल्टी पॉइंट्स बॉक्स (Earned, Redeemed & Balance) ⭐ */}
      {orderObj.customerPhone && (
        <div style={{ padding: '6px 0', borderBottom: '1px dashed #000', fontSize: '10px', lineHeight: '1.4' }}>
          <div style={{ textAlign: 'center', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>
            ⭐ LOYALTY REWARDS ⭐
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <span>Points Earned this Bill:</span>
            <span>+{earnedPts} Pts</span>
          </div>
          {redeemedPts > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Points Redeemed:</span>
              <span>-{redeemedPts} Pts</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', borderTop: '1px dotted #000', paddingTop: '3px', marginTop: '2px' }}>
            <span>Total Balance Points:</span>
            <span>{balancePts} Pts</span>
          </div>
        </div>
      )}

      {/* QR कोड */}
      <div className="py-2 text-center border-b border-black flex flex-col items-center justify-center">
        <p className="text-[10px] font-black uppercase tracking-wider mb-1">
          SCAN TO PAY ₹{orderObj.total} VIA UPI
        </p>
        
        <div className="p-1 bg-white border border-black inline-block rounded">
          <img 
            src={qrCodeUrl} 
            alt="UPI QR Code" 
            className="w-36 h-36 object-contain block mx-auto"
            crossOrigin="anonymous"
          />
        </div>

        <p className="text-[10px] font-bold mt-1 font-mono text-black">
          UPI ID: {upiId}
        </p>
      </div>

      {/* फुटर */}
      <div className="pt-2 text-center text-[9px] font-bold space-y-0.5">
        <p>Online Order Website:</p>
        <p className="font-black">bb-cafe-app.vercel.app</p>
        <p className="text-[10px] font-black mt-1">❤ Thank You, Visit Again ❤</p>
        <p className="text-[8px] text-black mt-0.5">Powered by BumBumCafe POS v3.3</p>
      </div>
    </div>
  );
}
