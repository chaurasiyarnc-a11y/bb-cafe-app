"use client";

import React, { useEffect, useRef, useState } from "react";
// आपके POS वाले Firebase और Toast को इम्पोर्ट कर रहे हैं
import { db } from '@/lib/firebase'; 
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

// नाम का पहला अक्षर Capital करने का फंक्शन
const formatNameTitleCase = (text: string) => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// भारतीय मोबाइल नंबर चेक करने का फंक्शन (Fake नंबर रोकने के लिए)
const isValidIndianPhone = (phone: string) => {
  const regex = /^[6-9]\d{9}$/; // नंबर 6,7,8,9 से शुरू होना चाहिए और 10 अंक होने चाहिए
  return regex.test(phone);
};

export default function SecureSpinGame() {
  // Login States
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Game States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [message, setMessage] = useState("अपना इनाम जीतें (दिन में केवल 1 मौका)");
  const [timer, setTimer] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [rotation, setRotation] = useState(0);

  const prizes = ["Better Luck", "10% OFF", "Free Coffee", "20% OFF", "Free Sandwich", "100% FREE"];
  const colors = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#e67e22", "#2ecc71"];
  const probabilities = [80, 10, 5, 3, 1.5, 0.5]; 

  // --- LOGIN & FIREBASE SYNC LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. नाम चेक करना और Capitalize करना
    const cleanName = formatNameTitleCase(name.trim());
    if (cleanName.length < 2) {
      return toast.error("कृपया अपना सही नाम दर्ज़ करें!");
    }

    // 2. मोबाइल नंबर चेक करना (Fake रोकने के लिए)
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (!isValidIndianPhone(cleanPhone)) {
      return toast.error("कृपया सही 10-अंकों का मोबाइल नंबर डालें (उदा. 9876543210)");
    }
    
    setIsLoading(true);
    setName(cleanName); // UI में भी Capital Name दिखाने के लिए

    try {
      // 3. Firebase Database (customer_points) में सेव/अपडेट करना
      const userRef = doc(db, "customer_points", cleanPhone);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // अगर कस्टमर पहले से है, तो बस Last Active अपडेट करें
        await setDoc(userRef, { lastActive: new Date() }, { merge: true });
      } else {
        // नया कस्टमर है, तो डिफ़ॉल्ट डेटा के साथ सेव करें
        await setDoc(userRef, {
          name: cleanName,
          phone: cleanPhone,
          points: 0,
          totalSpent: 0,
          totalVisits: 0,
          lastActive: new Date(),
          importSource: 'SpinGame'
        }, { merge: true });
      }

      // 4. गेम के नियम चेक करना (एक दिन में एक बार)
      const today = new Date().toDateString();
      if (localStorage.getItem(`played_${cleanPhone}`) === today) {
        setIsDisabled(true);
        setMessage("आप इस नंबर से आज का गेम खेल चुके हैं। कृपया कल फिर आएं!");
      } else {
        setIsDisabled(false);
        setMessage(`स्वागत है, ${cleanName}! अब अपना पहिया घुमाएं।`);
      }
      
      setIsLoggedIn(true);
      toast.success("नंबर वेरीफाई हो गया! ✅");

    } catch (error) {
      console.error("Firebase Sync Error:", error);
      toast.error("सर्वर से जुड़ने में त्रुटि हुई, कृपया दोबारा प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // --- GAME LOGIC ---
  useEffect(() => {
    if (!isLoggedIn) return; 

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startAngle = 0;
    let arc = (2 * Math.PI) / prizes.length;
    for (let i = 0; i < prizes.length; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.moveTo(150, 150);
        ctx.arc(150, 150, 150, startAngle, startAngle + arc);
        ctx.fill();
        ctx.save();
        ctx.translate(150, 150);
        ctx.rotate(startAngle + arc / 2);
        ctx.fillStyle = "white";
        ctx.font = "bold 15px Arial";
        ctx.fillText(prizes[i], 45, 5);
        ctx.restore();
        startAngle += arc;
    }
  }, [isLoggedIn]); 

  const spinWheel = () => {
    setIsDisabled(true);
    const today = new Date().toDateString();

    let rand = Math.random() * 100;
    let sum = 0;
    let winningIndex = 0;
    for (let i = 0; i < probabilities.length; i++) {
        sum += probabilities[i];
        if (rand <= sum) {
            winningIndex = i;
            break;
        }
    }

    let arcDegree = 360 / prizes.length;
    let stopAngle = (winningIndex * arcDegree) + (arcDegree / 2);
    let totalDegrees = 3600 + (360 - stopAngle) - 90;

    setRotation(totalDegrees);

    setTimeout(() => {
        let wonPrize = prizes[winningIndex];
        const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
        
        if(wonPrize === "Better Luck") {
            setMessage("उफ़! कोई इनाम नहीं मिला। अगली बार ज़रूर प्रयास करें!");
        } else {
            setMessage(`🎉 बधाई हो ${name}! आप जीते हैं: ${wonPrize}! कृपया काउंटर पर बिल देते समय यह टाइमर दिखाएं।`);
            startTimer();
        }
        localStorage.setItem(`played_${cleanPhone}`, today);
    }, 4000);
  };

  const startTimer = () => {
    let timeLeft = 300; 
    const interval = setInterval(() => {
        let m = Math.floor(timeLeft / 60);
        let s = timeLeft % 60;
        const formattedS = s < 10 ? "0" + s : s.toString();
        setTimer(`ऑफर समाप्त होने में: ${m}:${formattedS} मिनट`);
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(interval);
            setTimer("ऑफर समाप्त हो गया (Offer Expired)!");
        }
    }, 1000);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', backgroundColor: '#111827', color: 'white', minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
      <Toaster position="top-center" />
      
      <h1 style={{ color: '#f1c40f', fontSize: '36px', marginBottom: '5px' }}>बम बम कैफे, मोहंद्रा</h1>
      <h2 style={{ color: '#fff', fontSize: '20px', marginTop: '0', marginBottom: '20px' }}>स्पिन करें और शानदार इनाम जीतें!</h2>
      
      {!isLoggedIn ? (
        <div style={{ marginTop: '30px', padding: '20px' }}>
          <p style={{ color: '#bdc3c7', fontSize: '18px', marginBottom: '20px' }}>खेलने के लिए अपना नाम और नंबर दर्ज़ करें</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            
            <input 
              type="text" 
              placeholder="आपका शुभ नाम" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              style={{ padding: '15px', fontSize: '18px', width: '280px', borderRadius: '10px', border: '2px solid #3498db', textAlign: 'center', color: '#000' }}
            />

            <input 
              type="tel" 
              maxLength={10}
              placeholder="10-अंकों का मोबाइल नंबर" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              style={{ padding: '15px', fontSize: '18px', width: '280px', borderRadius: '10px', border: '2px solid #f1c40f', textAlign: 'center', color: '#000' }}
            />
            
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ backgroundColor: isLoading ? '#95a5a6' : '#2ecc71', color: 'white', fontSize: '18px', padding: '12px 30px', border: 'none', borderRadius: '20px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '10px', boxShadow: '0 4px 6px rgba(46, 204, 113, 0.4)' }}
            >
              {isLoading ? "कृपया प्रतीक्षा करें..." : "वेरीफाई करें और खेलें"}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <p style={{ color: '#bdc3c7', fontSize: '16px', padding: '0 20px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>{message}</p>

          <div style={{ position: 'relative', width: '300px', height: '300px', margin: '30px auto' }}>
            <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', fontSize: '40px', color: '#e74c3c', zIndex: 10 }}>▼</div>
            <canvas
              ref={canvasRef}
              width="300"
              height="300"
              style={{ borderRadius: '50%', border: '5px solid #fff', boxShadow: '0 0 20px rgba(0,0,0,0.5)', backgroundColor: '#fff', transition: 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)', transform: `rotate(${rotation}deg)` }}
            ></canvas>
          </div>

          <button onClick={spinWheel} disabled={isDisabled} style={{ backgroundColor: isDisabled ? '#6b7280' : '#e74c3c', color: 'white', fontSize: '20px', padding: '15px 40px', border: 'none', borderRadius: '30px', cursor: isDisabled ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
            {isDisabled ? "आज का मौका खत्म" : "अभी घुमाएं (SPIN NOW)"}
          </button>

          {timer && <div style={{ marginTop: '20px', fontSize: '18px', color: timer === "ऑफर समाप्त हो गया (Offer Expired)!" ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>{timer}</div>}
        </div>
      )}
    </div>
  );
}
