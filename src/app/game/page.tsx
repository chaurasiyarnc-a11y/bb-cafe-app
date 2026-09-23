"use client";

import React, { useEffect, useRef, useState } from "react";

export default function SecureSpinGame() {
  // Login States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Game States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [message, setMessage] = useState("अपना इनाम जीतें (दिन में केवल 1 मौका)");
  const [timer, setTimer] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Prizes (Chakra ke andar English sahi dikhta hai isliye English rakha hai)
  const prizes = ["Better Luck", "10% OFF", "Free Coffee", "20% OFF", "Free Sandwich", "100% FREE"];
  const colors = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#e67e22", "#2ecc71"];
  
  // 80% Better Luck, baki 20% me inam (Total = 100)
  const probabilities = [80, 10, 5, 3, 1.5, 0.5]; 

  // --- LOGIN LOGIC ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10 || isNaN(Number(phoneNumber))) {
      setLoginError("कृपया सही 10-अंकों का मोबाइल नंबर डालें");
      return;
    }
    
    setLoginError("");
    const today = new Date().toDateString();
    
    // Check if this phone number played today
    if (localStorage.getItem(`played_${phoneNumber}`) === today) {
      setIsDisabled(true);
      setMessage("आप इस नंबर से आज का गेम खेल चुके हैं। कृपया कल फिर आएं!");
    } else {
      setIsDisabled(false);
      setMessage(`स्वागत है, ${phoneNumber}! अब अपना पहिया घुमाएं।`);
    }
    
    setIsLoggedIn(true);
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
        if(wonPrize === "Better Luck") {
            setMessage("उफ़! कोई इनाम नहीं मिला। अगली बार ज़रूर प्रयास करें!");
        } else {
            setMessage(`🎉 बहुत-बहुत बधाई! आप जीते हैं: ${wonPrize}! कृपया बिल देते समय काउंटर पर यह टाइमर दिखाएं।`);
            startTimer();
        }
        localStorage.setItem(`played_${phoneNumber}`, today);
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
      
      {/* CAFE KA NAAM YAHAN HAI */}
      <h1 style={{ color: '#f1c40f', fontSize: '36px', marginBottom: '5px' }}>बम बम कैफे, मोहंद्रा</h1>
      <h2 style={{ color: '#fff', fontSize: '20px', marginTop: '0', marginBottom: '20px' }}>स्पिन करें और शानदार इनाम जीतें!</h2>
      
      {!isLoggedIn ? (
        <div style={{ marginTop: '30px', padding: '20px' }}>
          <p style={{ color: '#bdc3c7', fontSize: '18px', marginBottom: '20px' }}>खेलने के लिए अपना मोबाइल नंबर दर्ज करें</p>
          <form onSubmit={handleLogin}>
            <input 
              type="tel" 
              maxLength={10}
              placeholder="10-अंकों का मोबाइल नंबर" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              style={{ padding: '15px', fontSize: '18px', width: '250px', borderRadius: '10px', border: '2px solid #f1c40f', textAlign: 'center' }}
            />
            <br />
            {loginError && <p style={{ color: '#e74c3c', marginTop: '10px', fontWeight: 'bold' }}>{loginError}</p>}
            <button 
              type="submit" 
              style={{ backgroundColor: '#2ecc71', color: 'white', fontSize: '18px', padding: '12px 30px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' }}
            >
              वेरीफाई करें और खेलें
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
              style={{
                borderRadius: '50%',
                border: '5px solid #fff',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                backgroundColor: '#fff',
                transition: 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)',
                transform: `rotate(${rotation}deg)`
              }}
            ></canvas>
          </div>

          <button
            onClick={spinWheel}
            disabled={isDisabled}
            style={{ 
                backgroundColor: isDisabled ? '#6b7280' : '#e74c3c', 
                color: 'white', 
                fontSize: '20px', 
                padding: '15px 40px', 
                border: 'none', 
                borderRadius: '30px', 
                cursor: isDisabled ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', 
                marginTop: '10px',
                boxShadow: isDisabled ? 'none' : '0 4px 6px rgba(231, 76, 60, 0.4)'
            }}
          >
            {isDisabled ? "आज का मौका खत्म" : "अभी घुमाएं (SPIN NOW)"}
          </button>

          {timer && (
              <div style={{ marginTop: '20px', fontSize: '18px', color: timer === "ऑफर समाप्त हो गया (Offer Expired)!" ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>
                  {timer}
              </div>
          )}
        </div>
      )}
    </div>
  );
}
