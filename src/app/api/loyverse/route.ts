import { NextResponse } from 'next/server';

// 1. GET Request: आपके Loyverse के सभी आइटम्स और उनकी Variant IDs देखने के लिए
export async function GET() {
  try {
    const token = process.env.LOYVERSE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'LOYVERSE_API_TOKEN environment variable is missing on Vercel.' }, { status: 500 });
    }

    const response = await fetch('https://api.loyverse.com/v1.0/items', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch items from Loyverse', details: result }, { status: response.status });
    }

    // Loyverse के आइटम्स की लिस्ट को आसान भाषा में बदलें
    const itemsList = result.items?.map((item: any) => ({
      item_name: item.item_name,
      variants: item.variants?.map((v: any) => ({
        variant_name: v.option_values?.map((o: any) => o.value).join(' - ') || 'Default Variant',
        variant_id: v.variant_id,
        price: v.price
      }))
    })) || [];

    return NextResponse.json({ 
      info: "Copy the 'variant_id' of your preferred default item (e.g. Website Order) and add it as LOYVERSE_DEFAULT_VARIANT_ID in Vercel settings.",
      items: itemsList 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST Request: आर्डर सिंक करने के लिए
export async function POST(request: Request) {
  try {
    const orderData = await request.json();

    const token = process.env.LOYVERSE_API_TOKEN;
    const storeId = process.env.LOYVERSE_STORE_ID;
    const defaultVariantId = process.env.LOYVERSE_DEFAULT_VARIANT_ID;

    if (!token || !storeId) {
      return NextResponse.json({ error: 'Vercel settings are missing Loyverse keys.' }, { status: 500 });
    }

    // यदि आर्डर आइटम में Variant ID नहीं है, तो Vercel में सेव की गई डिफ़ॉल्ट ID का उपयोग करें
    const lineItems = orderData.items?.map((item: any) => {
      const vId = item.variant_id || defaultVariantId;
      
      if (!vId) {
        throw new Error("Variant ID missing! Set LOYVERSE_DEFAULT_VARIANT_ID in Vercel settings.");
      }

      return {
        variant_id: vId,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || 0),
        line_note: item.name || 'Web Item'
      };
    }) || [];

    const payload = {
      store_id: storeId,
      source: 'website',
      order: orderData.billNumber ? `Bill-${orderData.billNumber}` : `Order-${orderData.id}`,
      receipt_date: new Date().toISOString(),
      note: `Customer: ${orderData.customerName || 'Guest'} (${orderData.customerPhone || 'N/A'})\nAddress: ${orderData.address || 'N/A'}`,
      line_items: lineItems,
      payments: [
        {
          payment_type_id: 'fc52f1b2-31cf-4f51-ba40-c165c1273282', // standard Cash ID
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
      return NextResponse.json({ error: 'Loyverse rejected the sync request', details: result }, { status: response.status });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
