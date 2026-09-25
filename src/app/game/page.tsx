"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import confetti from "canvas-confetti"; // 🎉 आतिशबाज़ी के लिए

// नाम को सही टाइटल केस में बदलने के लिए
const formatNameTitleCase = (text: string) => {
  return text
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const isValidIndianPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

// इनामों की लिस्ट
const PRIZES = [
  "Better Luck",
  "₹10 OFF",
  "Free Coffee",
  "₹20 OFF",
  "Free Sandwich",
  "Free Manchurian",
  "Manchurian Rice",
];

const PROBABILITIES = [70, 13, 7, 5, 2.5, 1.5, 1];
const PRIZE_ICONS = ["❌", "💵", "☕", "🏷️", "🥪", "🥟", "🍚"];

// 🎵 साउंड इफेक्ट्स प्ले करने का सुरक्षित फंक्शन
export const playAudio = (type: "win" | "lose" | "spin" | "scratch") => {
  let src = "";
  if (type === "win") src = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"; 
  if (type === "lose") src = "https://assets.mixkit.co/active_storage/sfx/1436/1436-preview.mp3"; 
  if (type === "spin") src = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3"; 
  if (type === "scratch") src = "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3"; 

  const audio = new Audio(src);
  if (type === "spin") audio.loop = true; 
  
  // ब्राउज़र ब्लॉक से बचने के लिए Promise हैंडलिंग
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch((e) => console.warn("ऑडियो प्लेबैक ब्लॉक हुआ:", e));
  }
  return audio; 
};

// 🎆 शानदार आतिशबाज़ी (Confetti) का फंक्शन
export const triggerConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
  }, 250);
};

export default function SurpriseArcadeGame() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tableNo, setTableNo] = useState<string>("सामान्य टेबल");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedGame, setSelectedGame] = useState<number>(1);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [alreadyWonPrize, setAlreadyWonPrize] = useState<string | null>(null); 
  const [timerText, setTimerText] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("table");
      if (t) setTableNo(`टेबल नं: ${t}`);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let timeLeft = 300;
    timerRef.current = setInterval(() => {
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      setTimerText(`ऑफर समाप्त होने में: ${m}:${s < 10 ? "0" + s : s} मिनट`);
      timeLeft--;
      if (timeLeft < 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerText("⚠️ ऑफर समाप्त हो गया (Offer Expired)!");
      }
    }, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formatNameTitleCase(name.trim());
    if (cleanName.length < 2) return toast.error("कृपया अपना सही नाम दर्ज करें!");

    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    if (!isValidIndianPhone(cleanPhone)) {
      return toast.error("कृपया सही 10-अंकों का मोबाइल नंबर डालें!");
    }

    setIsLoading(true);
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    const isTestMode = (typeof window !== "undefined" && window.location.search.includes("test=true")) || cleanPhone === "9999999999";

    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const userSnap = await getDoc(userRef);

      if (!isTestMode && userSnap.exists()) {
        const data = userSnap.data();
        if (data?.lastPlayedAt) {
          const lastPlayedMillis = (data.lastPlayedAt as Timestamp).toMillis();
          const elapsed = now - lastPlayedMillis;

          if (elapsed < ONE_HOUR) {
            if (data.voucherCode && !data.voucherClaimed) {
              setName(data.name || cleanName);
              setPhoneNumber(cleanPhone);
              setCouponCode(data.voucherCode);
              setAlreadyWonPrize(data.lastPrizeWon);
              setIsLoggedIn(true);
              startTimer();
              toast.success("आपका जीता हुआ कूपन अभी भी एक्टिव है!");
              setIsLoading(false);
              return; 
            }

            const remMin = Math.ceil((ONE_HOUR - elapsed) / 60000);
            setIsLoading(false);
            return toast.error(`आप हाल ही में खेल चुके हैं! कृपया ${remMin} मिनट बाद आएं।`, { duration: 5000 });
          }
        }
      }

      await setDoc(
        userRef,
        { name: cleanName, phone: cleanPhone, table: tableNo, lastActive: serverTimestamp() },
        { merge: true }
      );

      const lastGame = parseInt(localStorage.getItem("last_selected_game") || "0", 10);
      const availableGames = [1, 2, 3, 4].filter((g) => g !== lastGame);
      const randomGameNum = availableGames[Math.floor(Math.random() * availableGames.length)];
      localStorage.setItem("last_selected_game", randomGameNum.toString());

      setSelectedGame(randomGameNum);
      setName(cleanName);
      setPhoneNumber(cleanPhone);
      setAlreadyWonPrize(null);
      setIsLoggedIn(true);

      const gameNames = ["", "लकी स्पिन व्हील 🎡", "लकी स्क्रैच कार्ड 🪙", "777 स्लॉट मशीन 🎰", "मिस्ट्री गिफ्ट बॉक्स 🎁"];
      toast.success(`सरप्राइज! आज आपके लिए खुला है: ${gameNames[randomGameNum]}`, { duration: 3500 });
    } catch {
      toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  const executeGameResult = async () => {
    const rand = Math.random() * 100;
    let sum = 0;
    let winIdx = 0;
    for (let i = 0; i < PROBABILITIES.length; i++) {
      sum += PROBABILITIES[i];
      if (rand <= sum) {
        winIdx = i;
        break;
      }
    }

    const prize = PRIZES[winIdx];
    const voucher = prize !== "Better Luck" ? `BOM-${Math.floor(1000 + Math.random() * 9000)}` : null;

    try {
      const userRef = doc(db, "customer_points", phoneNumber);
      await setDoc(
        userRef,
        { lastPlayedAt: serverTimestamp(), lastPrizeWon: prize, voucherCode: voucher, table: tableNo, voucherClaimed: false },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
    }

    return { winIdx, prize, voucher };
  };

  const handleGameEnd = (prize: string, voucher: string | null) => {
    if (prize === "Better Luck") {
      playAudio("lose");
    } else {
      playAudio("win");
      triggerConfetti(); 
      setCouponCode(voucher);
      startTimer();
    }
  };

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        .game-btn { transition: all 0.2s ease; }
        .game-btn:active { transform: scale(0.95); }
        .pulse-glow { animation: glow 2s infinite alternate; }
        @keyframes glow {
          0% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.5); }
          100% { box-shadow: 0 0 25px rgba(34, 197, 94, 1); }
        }
      `}</style>
      
      <div
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#0b0f19",
          backgroundImage: "radial-gradient(circle at 50% top, #1e293b 0%, #0b0f19 100%)",
          color: "#ffffff",
          minHeight: "100vh",
          textAlign: "center",
          padding: "30px 15px",
          boxSizing: "border-box",
        }}
      >
        <Toaster position="top-center" />

        <div style={{ marginBottom: "30px" }}>
          <div
            style={{
              display: "inline-block",
              backgroundColor: "rgba(241, 196, 15, 0.15)",
              color: "#f1c40f",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "bold",
              marginBottom: "12px",
              border: "1px solid rgba(241, 196, 15, 0.4)",
            }}
          >
            {tableNo}
          </div>
          <h1 style={{ color: "#f1c40f", fontSize: "28px", margin: "0 0 8px 0", fontWeight: "900", textShadow: "0 2px 10px rgba(241, 196, 15, 0.3)" }}>
            बम बम कैफे, मोहंद्रा
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "15px", margin: 0 }}>किस्मत आजमाएं और जीतें स्वादिष्ट फ्री ट्रीट!</p>
        </div>

        {!isLoggedIn ? (
          <div
            style={{
              maxWidth: "360px",
              margin: "0 auto",
              backgroundColor: "#1e293b",
              padding: "30px 25px",
              borderRadius: "24px",
              border: "1px solid #334155",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎁</div>
            <h2 style={{ fontSize: "20px", margin: "0 0 20px 0", color: "#38bdf8", fontWeight: "bold" }}>
              खेलने के लिए डिटेल्स भरें
            </h2>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", textAlign: "left", fontSize: "13px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "bold" }}>आपका नाम</label>
                <input
                  type="text"
                  placeholder="उदा. राहुल शर्मा"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  required
                  style={{
                    width: "100%", padding: "14px", borderRadius: "12px", border: "2px solid #3b82f6", backgroundColor: "#0f172a", color: "#ffffff", fontSize: "16px", fontWeight: "bold", textAlign: "center", outline: "none", textTransform: "capitalize", transition: "border 0.3s"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", textAlign: "left", fontSize: "13px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "bold" }}>मोबाइल नंबर (10-अंक)</label>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="उदा. 9876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                  required
                  style={{
                    width: "100%", padding: "14px", borderRadius: "12px", border: "2px solid #f1c40f", backgroundColor: "#0f172a", color: "#ffffff", fontSize: "16px", fontWeight: "bold", textAlign: "center", outline: "none"
                  }}
                />
              </div>

              <button
                type="submit"
                className="game-btn pulse-glow"
                disabled={isLoading}
                style={{
                  width: "100%", padding: "16px", borderRadius: "30px", border: "none", backgroundColor: "#22c55e", color: "#ffffff", fontSize: "17px", fontWeight: "900", cursor: isLoading ? "not-allowed" : "pointer", marginTop: "10px"
                }}
              >
                {isLoading ? "प्रतीक्षा करें..." : "सरप्राइज गेम खेलें ➔"}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ maxWidth: "420px", margin: "0 auto" }}>
            {alreadyWonPrize ? (
              <div style={{ textAlign: "center", padding: "30px", backgroundColor: "#1e293b", borderRadius: "20px", border: "2px solid #22c55e", boxShadow: "0 10px 30px rgba(34, 197, 94, 0.2)" }}>
                <h2 style={{ color: "#22c55e", margin: "0 0 10px 0", fontSize: "24px" }}>🎉 आपका एक्टिव इनाम</h2>
                <p style={{ fontSize: "24px", color: "#f1c40f", fontWeight: "bold" }}>{alreadyWonPrize}</p>
                
                <div style={{ backgroundColor: "#0f172a", border: "2px dashed #22c55e", padding: "15px 25px", borderRadius: "16px", display: "inline-block", margin: "20px 0" }}>
                  <span style={{ fontSize: "14px", color: "#94a3b8", display: "block", marginBottom: "5px" }}>कूपन कोड: </span>
                  <strong style={{ fontSize: "28px", color: "#22c55e", letterSpacing: "3px" }}>{couponCode}</strong>
                </div>
                
                <p style={{ color: "#cbd5e1", fontSize: "15px", lineHeight: "1.6" }}>
                  यह स्क्रीन काउंटर पर दिखाएं और अपनी ट्रीट प्राप्त करें!
                </p>
                
                {timerText && (
                  <div style={{ marginTop: "20px", fontSize: "16px", color: timerText.includes("Expired") ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>
                    {timerText}
                  </div>
                )}
              </div>
            ) : (
              <>
                {couponCode && (
                  <div style={{ backgroundColor: "#1e293b", border: "2px dashed #22c55e", padding: "12px 20px", borderRadius: "16px", display: "inline-block", marginBottom: "20px" }}>
                    <span style={{ fontSize: "14px", color: "#94a3b8" }}>कूपन कोड: </span>
                    <strong style={{ fontSize: "22px", color: "#22c55e", letterSpacing: "2px" }}>{couponCode}</strong>
                  </div>
                )}

                {selectedGame === 1 && <SpinWheelGame onFinish={executeGameResult} onEnd={handleGameEnd} />}
                {selectedGame === 2 && <ScratchCardGame onFinish={executeGameResult} onEnd={handleGameEnd} />}
                {selectedGame === 3 && <SlotMachineGame onFinish={executeGameResult} onEnd={handleGameEnd} />}
                {selectedGame === 4 && <MysteryBoxGame onFinish={executeGameResult} onEnd={handleGameEnd} />}

                {timerText && (
                  <div style={{ marginTop: "20px", fontSize: "16px", color: timerText.includes("Expired") ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>
                    {timerText}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================================
   गेम 1: 🎡 लकी स्पिन पहिया
========================================================================= */
function SpinWheelGame({ onFinish, onEnd }: { onFinish: () => Promise<any>; onEnd: (p: string, v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [message, setMessage] = useState("पहिया घुमाएं और अपना भाग्य देखें!");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const colors = ["#ef4444", "#3b82f6", "#eab308", "#a855f7", "#f97316", "#14b8a6", "#22c55e"];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);

    let startAngle = 0;
    const arc = (2 * Math.PI) / PRIZES.length;
    for (let i = 0; i < PRIZES.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(150, 150);
      ctx.arc(150, 150, 145, startAngle, startAngle + arc);
      ctx.fill();

      ctx.save();
      ctx.translate(150, 150);
      ctx.rotate(startAngle + arc / 2);
      ctx.fillStyle = "white";
      ctx.font = "bold 13px Arial";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(PRIZES[i], 40, 5);
      ctx.restore();
      startAngle += arc;
    }

    return () => {
      // मेमोरी लीक फिक्स: कम्पोनेंट हटने पर साउंड बंद
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    
    audioRef.current = playAudio("spin");

    const { winIdx, prize, voucher } = await onFinish();

    const arcDegree = 360 / PRIZES.length;
    const stopAngle = winIdx * arcDegree + arcDegree / 2;
    const targetAngle = ((270 - stopAngle) % 360 + 360) % 360;
    setRotation((prev) => prev + 3600 + targetAngle - (prev % 360));

    setTimeout(() => {
      setIsSpinning(false);
      if (audioRef.current) audioRef.current.pause(); 

      if (prize === "Better Luck") {
        setMessage("उफ़! कोई इनाम नहीं मिला। 1 घंटे बाद पुनः प्रयास करें!");
      } else {
        setMessage(`🎉 बधाई हो! आप जीते हैं: ${prize}!`);
      }
      onEnd(prize, voucher); 
    }, 4000);
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "15px", minHeight: "40px", marginBottom: "15px", fontWeight: "500" }}>{message}</p>
      <div style={{ position: "relative", width: "300px", height: "300px", margin: "10px auto 25px" }}>
        <div style={{ position: "absolute", top: "-22px", left: "50%", transform: "translateX(-50%)", fontSize: "40px", color: "#f87171", zIndex: 10, filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.5))" }}>▼</div>
        <canvas
          ref={canvasRef}
          style={{ width: "300px", height: "300px", borderRadius: "50%", border: "6px solid #fff", boxShadow: "0 10px 30px rgba(0,0,0,0.7)", transform: `rotate(${rotation}deg)`, transition: "transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)" }}
        />
        {/* पहिए के बीच का डॉट */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "24px", height: "24px", backgroundColor: "#ffffff", borderRadius: "50%", boxShadow: "0 0 10px rgba(0,0,0,0.5)", border: "4px solid #1e293b" }}></div>
      </div>
      <button onClick={handleSpin} disabled={isSpinning} className="game-btn" style={{ padding: "14px 40px", backgroundColor: isSpinning ? "#64748b" : "#ef4444", color: "white", border: "none", borderRadius: "30px", fontWeight: "900", fontSize: "17px", cursor: isSpinning ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(239, 68, 68, 0.5)" }}>
        {isSpinning ? "घूम रहा है..." : "पहिया घुमाएं (SPIN)"}
      </button>
    </div>
  );
}

/* =========================================================================
   गेम 2: 🪙 लकी स्क्रैच कार्ड
========================================================================= */
function ScratchCardGame({ onFinish, onEnd }: { onFinish: () => Promise<any>; onEnd: (p: string, v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cardPrize, setCardPrize] = useState<string>("?");
  const hasStartedRef = useRef(false); 

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI fix
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 280 * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);

    const grad = ctx.createLinearGradient(0, 0, 280, 180);
    grad.addColorStop(0, "#d4af37");
    grad.addColorStop(0.5, "#fde047");
    grad.addColorStop(1, "#a16207");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 280, 180);

    ctx.fillStyle = "#713f12";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🪙 यहाँ उंगली से स्क्रैच करें", 140, 85);
    ctx.font = "14px Arial";
    ctx.fillText("(Scratch to Reveal)", 140, 110);
  }, []);

  const handleStartInteraction = () => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      playAudio("scratch"); // मोबाइल सफारी के लिए क्लिक/टच पर ही प्ले होना चाहिए
      
      onFinish().then((res) => {
        setCardPrize(res.prize);
        setTimeout(() => {
          onEnd(res.prize, res.voucher);
        }, 1200); 
      });
    }
  };

  const handleScratch = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Scale coordinates based on real size vs CSS size
    const scaleX = canvas.width / rect.width / (window.devicePixelRatio || 1);
    const scaleY = canvas.height / rect.height / (window.devicePixelRatio || 1);
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "15px", marginBottom: "20px" }}>कार्ड को उंगली से रगड़कर अपना इनाम खोलें!</p>
      
      <div style={{ position: "relative", width: "280px", height: "180px", margin: "0 auto 20px", borderRadius: "16px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#1e293b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px solid #eab308", borderRadius: "16px" }}>
          <span style={{ fontSize: "50px", marginBottom: "10px", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.5))" }}>
            {cardPrize === "Better Luck" ? "💔" : (cardPrize !== "?" ? "🎉" : "")}
          </span>
          <strong style={{ fontSize: "22px", color: cardPrize === "Better Luck" ? "#94a3b8" : "#22c55e", fontWeight: "900", textAlign: "center", padding: "0 10px" }}>
            {cardPrize === "?" ? "स्क्रैच करें..." : cardPrize}
          </strong>
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={handleStartInteraction}
          onTouchStart={handleStartInteraction}
          onMouseMove={handleScratch}
          onTouchMove={handleScratch}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", touchAction: "none" }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   गेम 3: 🎰 777 जैकपॉट स्लॉट मशीन
========================================================================= */
function SlotMachineGame({ onFinish, onEnd }: { onFinish: () => Promise<any>; onEnd: (p: string, v: string | null) => void }) {
  const [reels, setReels] = useState(["☕", "🥪", "🥟"]);
  const [isRolling, setIsRolling] = useState(false);
  const [status, setStatus] = useState("बटन दबाएं और तीनों रील्स मैच करें!");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  const handleRoll = async () => {
    if (isRolling) return;
    setIsRolling(true);
    setStatus("स्लॉट घूम रहा है...");

    audioRef.current = playAudio("spin");

    const interval = setInterval(() => {
      setReels([
        PRIZE_ICONS[Math.floor(Math.random() * PRIZE_ICONS.length)],
        PRIZE_ICONS[Math.floor(Math.random() * PRIZE_ICONS.length)],
        PRIZE_ICONS[Math.floor(Math.random() * PRIZE_ICONS.length)],
      ]);
    }, 100);

    const { winIdx, prize, voucher } = await onFinish();

    setTimeout(() => {
      clearInterval(interval);
      setIsRolling(false);
      if (audioRef.current) audioRef.current.pause();

      if (prize === "Better Luck") {
        setReels(["❌", "☕", "🥪"]);
        setStatus("उफ़! कोई मैच नहीं मिला (Better Luck).");
      } else {
        const icon = PRIZE_ICONS[winIdx];
        setReels([icon, icon, icon]);
        setStatus(`🎉 जैकपॉट! आप जीते: ${prize}`);
      }
      
      onEnd(prize, voucher); 
    }, 3500);
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "15px", marginBottom: "20px", fontWeight: "500" }}>{status}</p>

      <div style={{ display: "inline-flex", gap: "12px", backgroundColor: "#0f172a", padding: "20px 30px", borderRadius: "20px", border: "4px solid #f59e0b", boxShadow: "0 0 30px rgba(245, 158, 11, 0.3)", marginBottom: "25px" }}>
        {reels.map((icon, i) => (
          <div key={i} style={{ width: "70px", height: "90px", backgroundColor: "#1e293b", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "45px", border: "2px solid #334155", boxShadow: "inset 0 10px 15px rgba(0,0,0,0.8)", textShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>
            {icon}
          </div>
        ))}
      </div>
      <br />
      <button onClick={handleRoll} disabled={isRolling} className="game-btn" style={{ padding: "14px 40px", backgroundColor: isRolling ? "#64748b" : "#f59e0b", color: "#000000", border: "none", borderRadius: "30px", fontWeight: "900", fontSize: "17px", cursor: isRolling ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(245, 158, 11, 0.4)" }}>
        {isRolling ? "जैकपॉट घूम रहा है..." : "🎰 स्लॉट घुमाएं (SPIN)"}
      </button>
    </div>
  );
}

/* =========================================================================
   गेम 4: 🎁 मिस्ट्री गिफ्ट बॉक्स
========================================================================= */
function MysteryBoxGame({ onFinish, onEnd }: { onFinish: () => Promise<any>; onEnd: (p: string, v: string | null) => void }) {
  const [openedBox, setOpenedBox] = useState<number | null>(null);
  const [boxPrize, setBoxPrize] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handlePickBox = async (boxNum: number) => {
    if (openedBox !== null || isOpening) return;
    setIsOpening(true);
    setOpenedBox(boxNum);

    playAudio("scratch"); 

    const { prize, voucher } = await onFinish();

    setTimeout(() => {
      setIsOpening(false);
      setBoxPrize(prize);
      onEnd(prize, voucher); 
    }, 1500);
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "15px", marginBottom: "25px", fontWeight: "500", minHeight: "40px" }}>
        {boxPrize ? (boxPrize === "Better Luck" ? "उफ़! यह बॉक्स खाली था।" : `🎉 बधाई हो! इस बॉक्स में निकला: ${boxPrize}`) : "अपनी पसंद का कोई भी 1 बॉक्स खोलें!"}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "20px" }}>
        {[1, 2, 3].map((b) => {
          const isSelected = openedBox === b;
          const isUnselected = openedBox !== null && !isSelected;
          
          return (
            <div
              key={b}
              onClick={() => handlePickBox(b)}
              className={openedBox === null ? "game-btn" : ""}
              style={{
                width: "95px",
                height: "120px",
                backgroundColor: isSelected ? "#0f172a" : (isUnselected ? "#1e293b" : "#3b82f6"),
                border: isSelected ? "3px solid #22c55e" : (isUnselected ? "2px solid #334155" : "2px solid #2563eb"),
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: openedBox !== null ? "default" : "pointer",
                transform: isSelected ? "scale(1.1)" : (isUnselected ? "scale(0.9)" : "scale(1)"),
                opacity: isUnselected ? 0.6 : 1,
                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                boxShadow: isSelected ? "0 10px 25px rgba(34, 197, 94, 0.4)" : "0 6px 15px rgba(0,0,0,0.4)",
              }}
            >
              <span style={{ fontSize: "48px", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }}>
                {isSelected && boxPrize ? (boxPrize === "Better Luck" ? "💔" : "🎉") : "🎁"}
              </span>
              <span style={{ fontSize: "13px", color: isSelected ? "#22c55e" : "#e2e8f0", marginTop: "8px", fontWeight: "bold" }}>
                {isSelected && boxPrize ? "खुला!" : `बॉक्स #${b}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
