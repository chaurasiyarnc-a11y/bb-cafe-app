import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase'; 
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    // 1. फ्रंटएंड से आया हुआ डेटा पढ़ें
    const body = await request.json();
    const { orderObj, phoneClean, pointsEarned, totalPointsCost } = body;

    if (!orderObj) {
      return NextResponse.json({ success: false, message: "Order data missing" }, { status: 400 });
    }

    // 2. Firebase Database में ऑर्डर सेव करें (Backend से)
    // हम timestamp को backend के टाइम से बदल रहे हैं ताकि कोई गलत टाइम न भेज सके
    const newOrder = {
      ...orderObj,
      timestamp: new Date()
    };
    
    const docRef = await addDoc(collection(db, "orders"), newOrder);

    // 3. Customer Points और Profile अपडेट करें
    if (phoneClean && phoneClean.length === 10) {
      const userRef = doc(db, "customer_points", phoneClean);
      const userSnap = await getDoc(userRef);

      let prevPoints = 0;
      let prevSpent = 0;
      let prevVisits = 0;

      // अगर ग्राहक पहले से मौजूद है, तो पुराना डेटा निकालें
      if (userSnap.exists()) {
        const data = userSnap.data();
        prevPoints = Number(data.points) || 0;
        prevSpent = Number(data.totalSpent) || 0;
        prevVisits = Number(data.totalVisits) || 0;
      }

      // नए पॉइंट्स और खर्चे का हिसाब लगायें
      const finalTotal = Number(orderObj.total) || 0;
      const newSpent = prevSpent + finalTotal;
      const remainingPts = Math.max(0, prevPoints - (Number(totalPointsCost) || 0)) + (Number(pointsEarned) || 0);

      // डेटाबेस में अपडेट करें
      await setDoc(userRef, {
        name: orderObj.customerName || "Walk-in Guest",
        points: remainingPts,
        totalSpent: newSpent,
        totalVisits: prevVisits + 1,
        lastBillNumber: orderObj.billNumber,
        lastBillAmount: finalTotal,
        lastActive: new Date()
      }, { merge: true });
    }

    // 4. सफलतापूर्वक रिस्पांस वापस फ्रंटएंड को भेजें
    return NextResponse.json({ success: true, orderId: docRef.id });

  } catch (error: any) {
    console.error("Backend Error (Place Order):", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
