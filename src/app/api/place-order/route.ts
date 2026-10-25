import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Firebase Admin Initialize (सर्वर को सुरक्षित चाबी देना)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { orderObj, phoneClean, pointsEarned, totalPointsCost } = data;

    // 1. आर्डर सेव करें (बैकएंड से सुरक्षित)
    const orderRef = await db.collection("orders").add(orderObj);

    // 2. कस्टमर के पॉइंट्स अपडेट करें
    if (pointsEarned > 0 || totalPointsCost > 0) {
      const customerRef = db.collection("customer_points").doc(phoneClean);
      
      await customerRef.set({
        name: orderObj.customerName,
        phone: phoneClean,
        points: admin.firestore.FieldValue.increment(pointsEarned - totalPointsCost),
        lastActive: new Date()
      }, { merge: true });

      if (pointsEarned > 0) {
        await customerRef.collection("history").add({
          type: 'earn',
          points: pointsEarned,
          description: `Ordered Bill #${orderObj.billNumber} 🍕`,
          timestamp: new Date()
        });
      }
      if (totalPointsCost > 0) {
        await customerRef.collection("history").add({
          type: 'redeem',
          points: totalPointsCost,
          description: `Redeemed rewards on Bill #${orderObj.billNumber} 🎁`,
          timestamp: new Date()
        });
      }
    }

    return NextResponse.json({ success: true, orderId: orderRef.id });
  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({ success: false, error: "Order failed" }, { status: 500 });
  }
}
