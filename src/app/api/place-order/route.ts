import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// 1. Firebase Admin को चालू (Initialize) करना
// यह सर्वर को आपके Firebase डेटाबेस में सुरक्षित एंट्री करने की चाबी देता है
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
    // 2. कस्टमर के फोन (Frontend) से आया हुआ डेटा यहाँ रिसीव करें
    const body = await request.json();
    const { orderObj, phoneClean, pointsEarned, totalPointsCost } = body;

    // 3. डेटाबेस में आर्डर सेव करें (अब यह काम सुरक्षित सर्वर कर रहा है)
    const orderRef = await db.collection("orders").add({
      ...orderObj,
      timestamp: admin.firestore.FieldValue.serverTimestamp(), // सर्वर का असली समय
    });

    // 4. लॉयल्टी पॉइंट्स अपडेट करें (हैकर इसे बदल नहीं सकता)
    if (pointsEarned > 0 || totalPointsCost > 0) {
      const customerRef = db.collection("customer_points").doc(phoneClean);
      
      await customerRef.set({
        name: orderObj.customerName,
        phone: phoneClean,
        points: admin.firestore.FieldValue.increment(pointsEarned - totalPointsCost),
        lastActive: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // हिस्ट्री सेव करें
      if (pointsEarned > 0) {
        await customerRef.collection("history").add({
          type: 'earn',
          points: pointsEarned,
          description: `Ordered Bill #${orderObj.billNumber} 🍕`,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      if (totalPointsCost > 0) {
        await customerRef.collection("history").add({
          type: 'redeem',
          points: totalPointsCost,
          description: `Redeemed rewards on Bill #${orderObj.billNumber} 🎁`,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // 5. काम पूरा होने पर Frontend को वापस "Success" का मैसेज भेज दें
    return NextResponse.json({ success: true, orderId: orderRef.id });

  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json({ success: false, error: "Order save failed" }, { status: 500 });
  }
}
