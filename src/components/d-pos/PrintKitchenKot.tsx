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
          .item-row { margin-bottom: 6px; }
          .note { font-size: 11px; font-style: italic; padding-left: 12px; font-weight: bold; }
        `}</style>
      </head>
      <body>
        <div className="center double">*** KITCHEN KOT ***</div>
        <div className="center bold" style={{ fontSize: '15px', margin: '4px 0' }}>TOKEN: #{orderObj.tokenNumber || '101'}</div>
        <div className="center">Type: {orderObj.fulfillmentType ? orderObj.fulfillmentType.toUpperCase() : 'TABLE'}</div>
        {orderObj.tableNumber && <div className="center bold" style={{ fontSize: '16px', marginTop: '2px' }}>TABLE: {orderObj.tableNumber}</div>}
        <div className="line"></div>
        <div>Time: {formattedDate}</div>
        <div className="line"></div>
        
        {orderObj.items.map((i: any, idx: number) => (
          <div className="item-row" key={idx}>
            <div className="bold" style={{ fontSize: '14px' }}>[ ] {i.name} — Qty: {i.quantity}</div>
            {i.note && <div className="note">↳ {i.note}</div>}
          </div>
        ))}

        <div className="line"></div>
        <div className="center">-- End of KOT --</div>
      </body>
    </html>
  );
}
