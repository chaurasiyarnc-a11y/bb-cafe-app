import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const orderData = await request.json();

    const token = process.env.LOYVERSE_API_TOKEN;
    const storeId = process.env.LOYVERSE_STORE_ID;

    if (!token || !storeId) {
      return NextResponse.json(
        { error: 'Vercel settings are missing Loyverse keys.' },
        { status: 500 }
      );
    }

    // Loyverse के लिए आइटम्स की लिस्ट तैयार करें
    const lineItems = orderData.items?.map((item: any) => ({
      name: item.name || 'Unknown Item',
      quantity: Number(item.quantity || 1),
      price: Number(item.price || 0),
    })) || [];

    const payload = {
      store_id: storeId,
      source: 'website',
      order: orderData.billNumber ? `Bill-${orderData.billNumber}` : `Order-${orderData.id}`,
      receipt_date: new Date().toISOString(),
      note: `Customer: ${orderData.customerName || 'Guest'} (${orderData.customerPhone || 'N/A'})\nAddress: ${orderData.address || 'N/A'}`,
      line_items: lineItems,
      payments: [
        {
          // 'fc52f1b2-31cf-4f51-ba40-c165c1273282' Loyverse का डिफ़ॉल्ट 'Cash' पेमेंट टाइप है
          payment_type_id: 'fc52f1b2-31cf-4f51-ba40-c165c1273282',
          paid_at: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch('https://api.loyverse.com/v1.0/receipts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Loyverse rejected the sync', details: result },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
