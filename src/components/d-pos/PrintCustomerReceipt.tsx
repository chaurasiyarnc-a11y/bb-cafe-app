import React from 'react';

interface PrintReceiptProps {
  orderObj: any;
  currentUser: any;
}

export default function PrintCustomerReceipt({ orderObj, currentUser }: PrintReceiptProps) {
  if (!orderObj) return null;

  const formattedDate = orderObj.timestamp?.toDate 
    ? orderObj.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  const earnedPts = Math.floor((orderObj.total || 0) / 100);
  const totalAmount = orderObj.total || 0;
  const hasCustomer = Boolean(orderObj.customerName && orderObj.customerName !== "Walk-in Guest");
  
  const cafeUpiId = "Q231198993@ybl";
  const cafeName = "Bum Bum Cafe";
  const upiPayUrl = `upi://pay?pa=${cafeUpiId}&pn=${encodeURIComponent(cafeName)}&am=${totalAmount}&cu=INR&tn=Bill%20%23${orderObj.billNumber}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiPayUrl)}`;

  return (
    <html>
      <head>
        <title>Receipt #{orderObj.billNumber || '5001'}</title>
        <style>{`
          @page { size: 80mm auto; margin: 0mm; }
          body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.25; width: 72mm; margin: 0 auto; padding: 4px; color: #000; background: #fff; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .flex { display: flex; justify-content: space-between; }
          .line { border-bottom: 1px dashed #000; margin: 5px 0; }
          
          /* कैफ़े का नाम बड़ा और हाइलाइटेड */
          .cafe-title { font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 1px; margin-top: 4px; }
          
          /* टोकन नंबर बॉक्स */
          .highlight-token { font-size: 24px; font-weight: bold; border: 3px solid #000; padding: 2px 10px; display: inline-block; margin: 6px 0; }
          
          .item-row { margin-bottom: 5px; }
          .note { font-size: 10px; font-style: italic; padding-left: 10px; color: #333; }
          
          .receipt-container { position: relative; padding: 0 4mm; }
          .side-border-left, .side-border-right {
            position: absolute; top: 0; bottom: 0; font-size: 8px; letter-spacing: 2px; color: #555;
            writing-mode: vertical-lr; text-orientation: mixed; overflow: hidden; white-space: nowrap;
          }
          .side-border-left { left: 0; }
          .side-border-right { right: 0; }
        `}</style>
      </head>
      <body>
        <div className="receipt-container">
          <div className="side-border-left">BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE</div>
          <div className="side-border-right">BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE • BUM BUM CAFE</div>

          <div className="cafe-title">Bum Bum Cafe</div>
          <div className="center" style={{ fontSize: '10px' }}>न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने,</div>
          <div className="center" style={{ fontSize: '10px' }}>जिला पन्ना, मोहंद्रा, मध्य प्रदेश - 488442</div>
          <div className="center bold" style={{ fontSize: '11px', marginTop: '2px' }}>Mob: 9714293759</div>
          <div className="line"></div>
          
          <div className="flex"><span>Invoice: #${orderObj.billNumber || '5001'}</span><span>Server: {currentUser?.name || 'Owner'}</span></div>
          <div>Date & Time: {formattedDate}</div>
          
          <div className="center">
            <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>TOKEN NUMBER</div>
            <div className="highlight-token">#{String(orderObj.tokenNumber || '1').padStart(2, '0')}</div>
          </div>

          <div className="line"></div>

          <div>Customer: {orderObj.customerName || 'Walk-in Guest'}</div>
          {orderObj.customerPhone && <div>Phone: {orderObj.customerPhone}</div>}
          {orderObj.tableNumber ? <div className="bold">Dine In: {orderObj.tableNumber}</div> : <div>Type: {orderObj.fulfillmentType ? orderObj.fulfillmentType.toUpperCase() : 'PICKUP'}</div>}
          <div className="line"></div>

          <div className="bold flex"><span>ITEM DESCRIPTION</span><span>TOTAL</span></div>
          <div className="line"></div>

          {orderObj.items.map((i: any, idx: number) => (
            <div className="item-row" key={idx}>
              <div className="bold">{i.quantity} x {i.name}</div>
              {i.note && <div className="note">{i.note}</div>}
              <div className="flex" style={{ fontSize: '12px', paddingLeft: '10px' }}>
                <span>Price: ₹{i.price}</span>
                <span className="bold">₹{i.price * i.quantity}</span>
              </div>
            </div>
          ))}

          <div className="line"></div>
          <div className="flex"><span>Subtotal:</span><span>₹{orderObj.subtotal || orderObj.total}</span></div>
          
          {orderObj.discountAmount > 0 && (
            <div className="flex"><span>Discount:</span><span>-₹{orderObj.discountAmount}</span></div>
          )}

          {hasCustomer && orderObj.pointsRedeemed > 0 && (
            <div className="flex"><span>Points Redeemed:</span><span>-{orderObj.pointsRedeemed} pts</span></div>
          )}

          <div className="line"></div>
          <div className="flex" style={{ fontSize: '15px', fontWeight: 'bold' }}>
            <span>GRAND TOTAL:</span>
            <span>₹{totalAmount}</span>
          </div>
          <div className="flex" style={{ fontSize: '11px', marginTop: '2px' }}><span>Payment Mode:</span><span className="bold">{(orderObj.paymentMethod || 'cash').toUpperCase()}</span></div>
          
          {hasCustomer && (
            <>
              <div className="line"></div>
              <div style={{ fontSize: '10px' }}>
                <div>Loyalty Earned: +{earnedPts} Pts</div>
                <div>Points Balance: {orderObj.remainingPoints || 0} Pts</div>
              </div>
            </>
          )}

          <div className="line"></div>
          
          {/* QR Code Section */}
          <div className="center">
            <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>SCAN TO PAY ₹{totalAmount} VIA UPI</div>
            <img src={qrCodeImageUrl} alt="UPI QR Code" width="120" height="120" style={{ display: 'block', margin: '0 auto', background: '#fff', padding: '2px' }} />
            <div style={{ fontSize: '9px', marginTop: '3px', fontWeight: 'bold' }}>UPI ID: {cafeUpiId}</div>
          </div>

          <div className="line"></div>
          <div className="center" style={{ fontSize: '10px', fontWeight: 'bold' }}>Online Order Website:</div>
          <div className="center bold" style={{ fontSize: '11px' }}>bb-cafe-app.vercel.app</div>
          <div className="center" style={{ fontSize: '10px', marginTop: '4px' }}>Follow us: @bb-cafe.in</div>
          <br />
          <div className="center" style={{ fontSize: '15px', fontWeight: 'bold' }}>🖤 Thank You, Visit Again 🖤</div>
          <div className="center" style={{ fontSize: '9px', marginTop: '4px' }}>Powered by BumBumCafe POS v2.1</div>
        </div>
      </body>
    </html>
  );
}
