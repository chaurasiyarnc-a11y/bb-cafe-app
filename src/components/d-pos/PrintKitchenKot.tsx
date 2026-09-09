import React from 'react';

interface PrintKotProps {
  orderObj: any;
}

export default function PrintKitchenKot({ orderObj }: PrintKotProps) {
  if (!orderObj) return null;

  const formattedDate = orderObj.timestamp?.toDate 
    ? orderObj.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    : new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <html>
      <head>
        <title>KOT #{orderObj.billNumber || '5001'}</title>
        <style>{`
          @page { size: 80mm auto; margin: 0mm; }
          body { font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.25; width: 72mm; margin: 0 auto; padding: 4px; color: #000; background: #fff; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed #000; margin: 6px 0; }
          .double { font-size: 16px; font-weight: bold; }
          .highlight-token { font-size: 24px; font-weight: bold; border: 3px solid #000; padding: 2px 10px; display: inline-block; margin: 4px 0; }
          .item-row { margin-bottom: 8px; }
          .note { font-size: 11px; font-style: italic; padding-left: 12px; font-weight: bold; color: #000; }
        `}</style>
      </head>
      <body>
        <div className="center double">*** KITCHEN KOT ***</div>
        
        <div className="center">
          <div style={{ fontSize: '11px', textTransform: 'uppercase' }}>TOKEN NO:</div>
          <div className="highlight-token">#{String(orderObj.tokenNumber || '1').padStart(2, '0')}</div>
        </div>

        <div className="center" style={{ fontSize: '13px' }}>Type: <b>{orderObj.fulfillmentType ? orderObj.fulfillmentType.toUpperCase() : 'TABLE'}</b></div>
        {orderObj.tableNumber && <div className="center bold" style={{ fontSize: '18px', marginTop: '3px' }}>TABLE: {orderObj.tableNumber}</div>}
        
        <div className="line"></div>
        <div>Time: {formattedDate} | Bill: #{orderObj.billNumber}</div>
        <div className="line"></div>
        
        {orderObj.items.map((i: any, idx: number) => (
          <div className="item-row" key={idx}>
            <div className="bold" style={{ fontSize: '15px' }}>[ ] {i.name}</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', paddingLeft: '15px' }}>Quantity: {i.quantity}</div>
            {i.note && <div className="note">↳ Note: {i.note}</div>}
          </div>
        ))}

        <div className="line"></div>
        <div className="center bold" style={{ fontSize: '14px' }}>-- End of KOT --</div>
      </body>
    </html>
  );
}
