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
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}&margin=1`;

  // लॉयल्टी पॉइंट्स
  const earnedPts = Number(orderObj.pointsEarned ?? Math.floor((orderObj.total || 0) / 100));
  const redeemedPts = Number(orderObj.pointsRedeemed || 0);
  const balancePts = Number(orderObj.remainingPoints ?? orderObj.customerPoints ?? 0);
  const pointsDiscountAmt = Number(orderObj.pointsDiscount || (redeemedPts > 0 ? redeemedPts : 0));

  return (
    <>
      {/* 
        ⭐ यह CSS ब्राउज़र को लंबा बिल काटने से रोकेगा ⭐
      */}
      <style>{`
        @media print {
          @page {
            margin: 0;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }
          /* किसी भी चीज़ को कटने से रोकेगा */
          * {
            overflow: visible !important;
          }
          /* आइटम लिस्ट के बीच में पेज ब्रेक नहीं होने देगा */
          .prevent-cut {
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div 
        style={{ 
          fontFamily: 'Arial, Helvetica, sans-serif', 
          color: '#000000',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'none' 
        }}
        className="w-[68mm] max-w-[68mm] mx-auto bg-white p-0 text-left select-none print:m-0 print:p-0"
      >
        {/* हेडर */}
        <div className="text-center pb-2 border-b border-black prevent-cut">
          <h1 className="text-xl font-black uppercase tracking-wider leading-tight">BUM BUM CAFE</h1>
          <p className="text-[11px] font-bold mt-1 leading-snug">
            न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने,<br />
            जिला पन्ना, मध्य प्रदेश - 488442
          </p>
          <p className="text-[12px] font-bold mt-1">Mob: 9714293759</p>
        </div>

        {/* इनवॉइस और सर्वर */}
        <div className="text-[11px] font-bold py-1.5 border-b border-black flex justify-between prevent-cut">
          <span>Invoice: #{orderObj.billNumber || 5001}</span>
          <span>Server: {(currentUser?.name || 'YOGESH').toUpperCase()}</span>
        </div>
        <div className="text-[11px] font-bold pb-1.5 pt-1 border-b border-black flex justify-between prevent-cut">
          <span>Date: {orderDate.toLocaleDateString()}</span>
          <span>Time: {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* टोकन नंबर */}
        <div className="my-2 border-2 border-black py-1.5 text-center bg-white prevent-cut">
          <p className="text-[11px] font-bold uppercase tracking-widest">TOKEN NUMBER</p>
          <p className="text-[28px] font-black leading-none mt-1">#{orderObj.tokenNumber || '01'}</p>
        </div>

        {/* कस्टमर विवरण */}
        <div className="text-[11px] font-bold pb-1.5 pt-0.5 border-b border-black prevent-cut">
          <p>Customer: {orderObj.customerName || 'Walk-in Guest'}</p>
          {orderObj.customerPhone && <p>Phone: {orderObj.customerPhone}</p>}
          <p className="uppercase">Type: {orderObj.fulfillmentType || 'Counter'}</p>
          {orderObj.tableNumber && <p className="font-black text-[13px] mt-0.5">Table: {orderObj.tableNumber}</p>}
        </div>

        {/* आइटम सूची */}
        <div className="py-1.5 border-b border-black">
          <div className="flex justify-between text-[11px] font-bold uppercase pb-1 border-b-2 border-dotted border-black prevent-cut">
            <span>ITEM DESCRIPTION</span>
            <span>TOTAL</span>
          </div>

          <div className="space-y-2 pt-2">
            {orderObj.items?.map((item: any, idx: number) => (
              <div key={idx} className="text-[12px] leading-tight prevent-cut">
                <div className="flex justify-between font-bold items-start">
                  <span className="pr-1 break-words flex-1">
                    {item.quantity} x {item.name}
                  </span>
                  <span className="shrink-0 ml-1">₹{item.price * item.quantity}</span>
                </div>
                <div className="flex justify-between text-[11px] text-black pl-3 mt-0.5">
                  <span>Price: ₹{item.price}</span>
                </div>
                {item.note && (
                  <p className="text-[11px] italic pl-3 mt-0.5 font-semibold text-black">
                    Note: {item.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* बिल टोटल्स */}
        <div className="py-2 border-b border-black text-[12px] space-y-1 prevent-cut">
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

          <div className="flex justify-between text-[14px] font-black pt-1.5 mt-1 border-t-2 border-black">
            <span>GRAND TOTAL:</span>
            <span>₹{orderObj.total}</span>
          </div>

          <div className="flex justify-between text-[11px] font-bold uppercase pt-1">
            <span>Payment Mode:</span>
            <span>{orderObj.paymentMethod || 'CASH'}</span>
          </div>
        </div>

        {/* ⭐ लॉयल्टी पॉइंट्स बॉक्स ⭐ */}
        {orderObj.customerPhone && (
          <div className="py-1.5 border-b-2 border-dotted border-black text-[11px] leading-snug prevent-cut">
            <div className="text-center font-black uppercase tracking-wider mb-1">
              ⭐ LOYALTY REWARDS ⭐
            </div>
            <div className="flex justify-between font-bold">
              <span>Points Earned this Bill:</span>
              <span>+{earnedPts} Pts</span>
            </div>
            {redeemedPts > 0 && (
              <div className="flex justify-between font-bold">
                <span>Points Redeemed:</span>
                <span>-{redeemedPts} Pts</span>
              </div>
            )}
            <div className="flex justify-between font-black pt-1 border-t border-dotted border-black mt-1">
              <span>Total Balance Points:</span>
              <span>{balancePts} Pts</span>
            </div>
          </div>
        )}

        {/* QR कोड */}
        <div className="py-2 text-center border-b border-black flex flex-col items-center justify-center prevent-cut">
          <p className="text-[12px] font-black uppercase tracking-wider mb-1">
            SCAN TO PAY ₹{orderObj.total}
          </p>
          
          <div className="p-0.5 bg-white border-2 border-black inline-block rounded">
            <img 
              src={qrCodeUrl} 
              alt="UPI QR Code" 
              className="w-32 h-32 object-contain block mx-auto"
              crossOrigin="anonymous"
              style={{ imageRendering: 'pixelated', filter: 'grayscale(100%) contrast(150%)' }}
            />
          </div>

          <p className="text-[12px] font-bold mt-1.5 font-mono text-black">
            UPI: {upiId}
          </p>
        </div>

        {/* फुटर */}
        <div className="pt-2 pb-4 text-center flex flex-col items-center justify-center prevent-cut">
          <p className="text-[11px] font-bold">Online Order Website:</p>
          <p className="text-[13px] font-black tracking-wide my-0.5">bb-cafe-app.vercel.app</p>
          <p className="text-[12px] font-bold mt-1">❤ Thank You, Visit Again ❤</p>
          <p className="text-[10px] font-normal mt-1 border-t border-dotted border-black pt-1 inline-block w-full">
            Powered by BumBumCafe POS v3.3
          </p>
        </div>
      </div>
    </>
  );
}
