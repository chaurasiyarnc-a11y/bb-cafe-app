"use client";

import React, { useEffect, useRef, useState } from "react";

export default function SpinGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [message, setMessage] = useState("Apna Inam Jeetein (Din mein 1 chance)");
  const [timer, setTimer] = useState<string | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);
  const [rotation, setRotation] = useState(0);

  const prizes = ["Better Luck", "10% OFF", "Free Coffee", "20% OFF", "Free Sandwich", "100% FREE"];
  const colors = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#e67e22", "#2ecc71"];
  const probabilities = [35, 30, 20, 10, 4, 1]; // 100% Free ka sirf 1% chance

  useEffect(() => {
    // Check if played today
    const today = new Date().toDateString();
    if (localStorage.getItem("cafeLastSpin") === today) {
      setIsDisabled(true);
      setMessage("Aap aaj ka spin use kar chuke hain. Kal phir aayen!");
    }

    // Draw Wheel
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
  }, []);

  const spinWheel = () => {
    setIsDisabled(true);
    const today = new Date().toDateString();

    // Logic for winner
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

    // After spin ends
    setTimeout(() => {
        let wonPrize = prizes[winningIndex];
        if(wonPrize === "Better Luck") {
            setMessage("Oops! Koi inam nahi mila. Agli baar zaroor try karein!");
        } else {
            setMessage(`🎉 Badhai Ho! Aap jeete hain: ${wonPrize}! Kripya Counter par bill dete waqt yeh timer dikhayen.`);
            startTimer();
        }
        localStorage.setItem("cafeLastSpin", today);
    }, 4000);
  };

  const startTimer = () => {
    let timeLeft = 300; // 5 minutes
    const interval = setInterval(() => {
        let m = Math.floor(timeLeft / 60);
        let s = timeLeft % 60;
        const formattedS = s < 10 ? "0" + s : s.toString();
        setTimer(`Claim within: ${m}:${formattedS} minutes`);
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(interval);
            setTimer("Offer Expired!");
        }
    }, 1000);
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', textAlign: 'center', backgroundColor: '#111827', color: 'white', minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
      <h1 style={{ color: '#f1c40f', fontSize: '32px', marginBottom: '10px' }}>Spin & Win!</h1>
      <p style={{ color: '#bdc3c7', fontSize: '16px', padding: '0 20px' }}>{message}</p>

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
        {isDisabled ? "Aaj Ka Chance Khatam" : "SPIN NOW"}
      </button>

      {timer && (
          <div style={{ marginTop: '20px', fontSize: '18px', color: timer === "Offer Expired!" ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>
              {timer}
          </div>
      )}
    </div>
  );
}
