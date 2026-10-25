// फाइल: app/api/place-order/route.ts (यह Backend है)
import { NextResponse } from 'next/server';
import { adminDb } from '../../../lib/firebase-admin'; // Firebase Admin का इस्तेमाल

export async function POST(request) {
  try {
    const data = await request.json();
    const { customerPhone, cartItems } = data; // ग्राहक ने सिर्फ आइटम और नंबर भेजा

    let realTotalAmount = 0;
    let realPointsEarned = 0;

    // 1. हर आइटम की असली कीमत डेटाबेस से चेक करो (ग्राहक की भेजी कीमत पर भरोसा मत करो)
    for (let item of cartItems) {
      // डेटाबेस से असली प्रोडक्ट मंगाओ
      const productRef = await adminDb.collection("products").doc(item.id).get();
      const realProduct = productRef.data();

      // असली कीमत से कैलकुलेशन करो
      realTotalAmount += (realProduct.price * item.quantity); 
    }

    // 2. असली पॉइंट्स कैलकुलेट करो (उदा: 100 रुपये पर 1 पॉइंट)
    realPointsEarned = Math.floor(realTotalAmount / 100);

    // 3. अब इस आर्डर को डेटाबेस में सेव करो 
    const newOrder = {
      customerPhone: customerPhone,
      items: cartItems,
      totalToPay: realTotalAmount, // असली बिल
      status: "pending",
      timestamp: new Date()
    };

    await adminDb.collection("orders").add(newOrder);

    // 4. यूजर के पॉइंट्स भी बैकएंड से ही बढ़ाओ 
    await adminDb.collection("customer_points").doc(customerPhone).update({
      points: FirebaseAdmin.firestore.FieldValue.increment(realPointsEarned)
    });

    // 5. ग्राहक को मैसेज भेजो कि आर्डर सक्सेस हो गया
    return NextResponse.json({ success: true, message: "Order placed!", billAmount: realTotalAmount });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Error placing order" }, { status: 500 });
  }
}
