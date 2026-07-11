import { NextResponse } from 'next/server';

// 1. GET Request: आपके Loyverse के सभी आइटम्स और Payment Types की ID देखने के लिए
export async function GET() {
  try {
    const token = process.env.LOYVERSE_API_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'LOYVERSE_API_TOKEN environment variable is missing on Vercel.' }, { status: 500 });
    }

    // 1. Items फ़ेच करें
    const itemResponse = await fetch('https://api.loyverse.com/v1.0/items', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const itemResult = await itemResponse.json();

    // 2. Payment Types फ़ेच करें
    const paymentResponse = await fetch('https://api.loyverse.com/v1.0/payment_types', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const paymentResult = await paymentResponse.json();

    const itemsList = itemResult.items?.map((item: any) => ({
      item_name: item.item_name,
      variants: item.variants?.map((v: any) => ({
        variant_name: v.option_values?.map((o: any) => o.value).join(' - ') || 'Default Variant',
        variant_id: v.variant_id,
        price: v.price
      }))
    })) || [];

    const paymentTypesList = paymentResult.payment_types?.map((p: any) => ({
      name: p.name,
      id: p.id,
      type: p.type
    })) || [];

    return NextResponse.json({ 
      info: "If your sync fails, check if LOYVERSE_DEFAULT_VARIANT_ID and LOYVERSE_PAYMENT_TYPE_ID are added to Vercel.",
      items: itemsList,
      payment_types: paymentTypesList
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
    const paymentTypeId = process.env.LOYVERSE_PAYMENT_TYPE_ID || 'fc52f1b2-31cf-4f51-ba40-c165c1273282'; // Default Cash

    if (!token || !storeId) {
      return NextResponse.json({ error: 'Vercel settings are missing Loyverse keys.' }, { status: 500 });
    }

    // कुल पेमेंट राशि कैलकुलेट करें और लाइन आइटम्स तैयार करें
    let totalAmount = 0;
    const lineItems = orderData.items?.map((item: any) => {
      const vId = item.variant_id || defaultVariantId;
      
      if (!vId) {
        throw new Error("Variant ID missing! Set LOYVERSE_DEFAULT_VARIANT_ID in Vercel settings.");
      }

      const itemPrice = Number(item.price || 0);
      const itemQty = Number(item.quantity || 1);
      totalAmount += itemPrice * itemQty;

      return {
        variant_id: vId,
        quantity: itemQty,
        price: itemPrice,
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
          payment_type_id: paymentTypeId,
          paid_at: new Date().toISOString(),
          money_amount: totalAmount // Loyverse के लिए भुगतान राशि
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
