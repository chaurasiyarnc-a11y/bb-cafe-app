"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

// नाम को सही फॉर्मेट करने के लिए
const formatNameTitleCase = (text: string) => {
  return text
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const isValidIndianPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

// 7 इनामों की फिक्स लिस्ट
const PRIZES = [
  "Better Luck",
  "₹10 OFF",
  "Free Coffee",
  "₹20 OFF",
  "Free Sandwich",
  "Free Manchurian",
  "Manchurian Rice",
];

// 70% हार, 30% जीत (कुल 100%)
const PROBABILITIES = [70, 13, 7, 5, 2.5, 1.5, 1];

const PRIZE_ICONS = ["❌", "💵", "☕", "🏷️", "🥪", "🥟", "🍚"];

export default function SurpriseArcadeGame() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tableNo, setTableNo] = useState<string>("सामान्य (General)");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 4 गेम्स में से रैंडम चुनाव: 1 = Spin, 2 = Scratch, 3 = Slot, 4 = Mystery Box
  const [selectedGame, setSelectedGame] = useState<number>(1);
  const [wonPrize, setWonPrize] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [timerText, setTimerText] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // URL से टेबल नंबर पढ़ना (?table=1)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("table");
      if (t) setTableNo(`टेबल नं: ${t}`);
    }
  }, []);

  // टाइमर क्लीनअप
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 5 मिनट का टाइमर
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

  // --- LOGIN & FIRESTORE 1-HOUR COOLDOWN CHECK ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formatNameTitleCase(name.trim());
    if (cleanName.length < 2) return toast.error("कृपया सही नाम डालें!");

    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    if (!isValidIndianPhone(cleanPhone)) {
      return toast.error("कृपया सही 10-अंकों का मोबाइल नंबर डालें!");
    }

    setIsLoading(true);
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    // 🧪 टेस्टिंग मोड जांचें (URL में ?test=true या नंबर 9999999999 होने पर 1 घंटे का लॉक नहीं लगेगा)
    const isTestMode =
      (typeof window !== "undefined" && window.location.search.includes("test=true")) ||
      cleanPhone === "9999999999";

    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const userSnap = await getDoc(userRef);

      // 1. डेटाबेस से Cooldown चेक
      if (!isTestMode && userSnap.exists()) {
        const data = userSnap.data();
        if (data?.lastPlayedAt) {
          const lastPlayedMillis = (data.lastPlayedAt as Timestamp).toMillis();
          const elapsed = now - lastPlayedMillis;
          if (elapsed < ONE_HOUR) {
            const remMin = Math.ceil((ONE_HOUR - elapsed) / 60000);
            setIsLoading(false);
            return toast.error(`आप हाल ही में खेल चुके हैं! कृपया ${remMin} मिनट बाद आएं।`, { duration: 5000 });
          }
        }
      }

      // 2. डिवाइस लोकलस्टोरेज चेक
      const deviceLast = localStorage.getItem("device_last_played");
      if (!isTestMode && deviceLast && now - parseInt(deviceLast, 10) < ONE_HOUR) {
        const rem = Math.ceil((ONE_HOUR - (now - parseInt(deviceLast, 10))) / 60000);
        setIsLoading(false);
        return toast.error(`इस मोबाइल से खेला जा चुका है! कृपया ${rem} मिनट बाद प्रयास करें।`);
      }

      // यूजर डेटा अपडेट
      await setDoc(userRef, {
        name: cleanName,
        phone: cleanPhone,
        table: tableNo,
        lastActive: serverTimestamp(),
      }, { merge: true });

      // 🎲 4 गेम्स में से 1 गेम का ऑटोमैटिक सरप्राइज चुनाव (25% चांस प्रत्येक)
      const randomGameNum = Math.floor(Math.random() * 4) + 1; // 1, 2, 3, या 4
      setSelectedGame(randomGameNum);

      setName(cleanName);
      setPhoneNumber(cleanPhone);
      setIsLoggedIn(true);

      const gameNames = ["", "लकी स्पिन व्हील 🎡", "लकी स्क्रैच कार्ड 🪙", "777 स्लॉट मशीन 🎰", "मिस्ट्री गिफ्ट बॉक्स 🎁"];
      toast.success(`सरप्राइज! आज आपके लिए खुला है: ${gameNames[randomGameNum]}`, { duration: 4000 });
    } catch {
      toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // --- कॉमन रिजल्ट जनरेटर (सभी गेम्स के लिए निष्पक्ष नियम) ---
  const executeGameResult = async () => {
    setHasPlayed(true);
    localStorage.setItem("device_last_played", Date.now().toString());

    // लॉटरी परिणाम (70% Better Luck, 30% बाकी)
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

    // डेटाबेस में अंतिम जीत और कूपन तुरंत लॉक करना
    try {
      const userRef = doc(db, "customer_points", phoneNumber);
      await setDoc(userRef, {
        lastPlayedAt: serverTimestamp(),
        lastPrizeWon: prize,
        voucherCode: voucher,
        table: tableNo,
        voucherClaimed: false,
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }

    return { winIdx, prize, voucher };
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", backgroundColor: "#111827", color: "white", minHeight: "100vh", textAlign: "center", padding: "30px 15px" }}>
      <Toaster position="top-center" />

      {/* कैफे हेडर */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ color: "#f1c40f", fontSize: "28px", margin: "0 0 5px 0" }}>बम बम कैफे, मोहंद्रा</h1>
        <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>
          {tableNo} • अपनी किस्मत आजमाएं और फ्री ट्रीट जीतें!
        </p>
      </div>

      {!isLoggedIn ? (
        /* लॉगिन फॉर्म */
        <div style={{ maxWidth: "340px", margin: "20px auto", backgroundColor: "#1f2937", padding: "25px", borderRadius: "16px", border: "1px solid #374151" }}>
          <div style={{ fontSize: "40px", marginBottom: "10px" }}>🎁</div>
          <h2 style={{ fontSize: "18px", marginBottom: "15px", color: "#38bdf8" }}>खेलने के लिए विवरण भरें</h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="text"
              placeholder="आपका शुभ नाम"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid #4b5563", fontSize: "15px", textAlign: "center" }}
            />
            <input
              type="tel"
              maxLength={10}
              placeholder="10-अंकों का मोबाइल नंबर"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              required
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid #4b5563", fontSize: "15px", textAlign: "center" }}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{ padding: "12px", borderRadius: "25px", border: "none", backgroundColor: "#2ecc71", color: "white", fontSize: "16px", fontWeight: "bold", cursor: isLoading ? "not-allowed" : "pointer", marginTop: "10px" }}
            >
              {isLoading ? "जांच हो रही है..." : "सरप्राइज गेम अनलॉक करें ➔"}
            </button>
          </form>
        </div>
      ) : (
        /* गेम्स स्क्रीन */
        <div style={{ maxWidth: "420px", margin: "0 auto" }}>
          {/* जीता हुआ कूपन कोड (यदि जीता हो) */}
          {couponCode && (
            <div style={{ backgroundColor: "#1e293b", border: "2px dashed #2ecc71", padding: "10px 15px", borderRadius: "10px", display: "inline-block", marginBottom: "15px" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>कूपन कोड: </span>
              <strong style={{ fontSize: "20px", color: "#2ecc71", letterSpacing: "2px" }}>{couponCode}</strong>
            </div>
          )}

          {/* 4 रैंडम गेम्स का रेंडरिंग */}
          {selectedGame === 1 && (
            <SpinWheelGame onFinish={executeGameResult} onWin={(p, v) => { setWonPrize(p); setCouponCode(v); startTimer(); }} />
          )}

          {selectedGame === 2 && (
            <ScratchCardGame onFinish={executeGameResult} onWin={(p, v) => { setWonPrize(p); setCouponCode(v); startTimer(); }} />
          )}

          {selectedGame === 3 && (
            <SlotMachineGame onFinish={executeGameResult} onWin={(p, v) => { setWonPrize(p); setCouponCode(v); startTimer(); }} />
          )}

          {selectedGame === 4 && (
            <MysteryBoxGame onFinish={executeGameResult} onWin={(p, v) => { setWonPrize(p); setCouponCode(v); startTimer(); }} />
          )}

          {/* 5 मिनट का टाइमर */}
          {timerText && (
            <div style={{ marginTop: "15px", fontSize: "15px", color: timerText.includes("Expired") ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>
              {timerText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   गेम 1: 🎡 लकी स्पिन व्हील कंपोनेंट
========================================================================= */
function SpinWheelGame({ onFinish, onWin }: { onFinish: () => Promise<any>; onWin: (p: string, v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [message, setMessage] = useState("पहिया घुमाएं और अपनी किस्मत देखें!");

  const colors = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#e67e22", "#1abc9c", "#2ecc71"];

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
      ctx.font = "bold 12px Arial";
      ctx.fillText(PRIZES[i], 38, 4);
      ctx.restore();
      startAngle += arc;
    }
  }, []);

  const handleSpin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const { winIdx, prize, voucher } = await onFinish();

    const arcDegree = 360 / PRIZES.length;
    const stopAngle = winIdx * arcDegree + arcDegree / 2;
    const targetAngle = ((270 - stopAngle) % 360 + 360) % 360;
    setRotation((prev) => prev + 3600 + targetAngle - (prev % 360));

    setTimeout(() => {
      setIsSpinning(false);
      if (prize === "Better Luck") {
        setMessage("उफ़! इस बार कोई इनाम नहीं मिला। 1 घंटे बाद पुनः प्रयास करें!");
      } else {
        setMessage(`🎉 बधाई हो! आप जीते हैं: ${prize}! काउंटर पर बिलिंग के समय यह स्क्रीन दिखाएं।`);
        onWin(prize, voucher);
      }
    }, 4000);
  };

  return (
    <div>
      <h3 style={{ color: "#f1c40f", fontSize: "16px", margin: "0 0 10px 0" }}>🎡 सरप्राइज गेम: लकी स्पिन व्हील</h3>
      <p style={{ color: "#bdc3c7", fontSize: "14px", minHeight: "36px" }}>{message}</p>
      <div style={{ position: "relative", width: "300px", height: "300px", margin: "10px auto 20px" }}>
        <div style={{ position: "absolute", top: "-18px", left: "50%", transform: "translateX(-50%)", fontSize: "36px", color: "#e74c3c", zIndex: 10 }}>▼</div>
        <canvas
          ref={canvasRef}
          style={{ width: "300px", height: "300px", borderRadius: "50%", border: "5px solid #fff", boxShadow: "0 0 20px rgba(0,0,0,0.5)", transform: `rotate(${rotation}deg)`, transition: "transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)" }}
        />
      </div>
      <button onClick={handleSpin} disabled={isSpinning} style={{ padding: "12px 35px", backgroundColor: isSpinning ? "#6b7280" : "#e74c3c", color: "white", border: "none", borderRadius: "30px", fontWeight: "bold", fontSize: "16px", cursor: isSpinning ? "not-allowed" : "pointer" }}>
        {isSpinning ? "घूम रहा है..." : "पहिया घुमाएं (SPIN)"}
      </button>
    </div>
  );
}

/* =========================================================================
   गेम 2: 🪙 लकी स्क्रैच कार्ड कंपोनेंट (Google Pay स्टाइल)
========================================================================= */
function ScratchCardGame({ onFinish, onWin }: { onFinish: () => Promise<any>; onWin: (p: string, v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [cardPrize, setCardPrize] = useState<string>("?");
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // गोल्डन स्क्रैच कोटिंग
    const grad = ctx.createLinearGradient(0, 0, 280, 180);
    grad.addColorStop(0, "#d4af37");
    grad.addColorStop(0.5, "#f9d774");
    grad.addColorStop(1, "#aa7c11");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 280, 180);

    ctx.fillStyle = "#5c3d00";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🪙 यहाँ उंगली से स्क्रैच करें", 140, 85);
    ctx.font = "12px Arial";
    ctx.fillText("(Scratch to Reveal Prize)", 140, 110);
  }, []);

  const handleScratch = async (e: any) => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!hasStarted) {
      setHasStarted(true);
      const res = await onFinish();
      setCardPrize(res.prize);
      if (res.prize !== "Better Luck") onWin(res.prize, res.voucher);
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div>
      <h3 style={{ color: "#f1c40f", fontSize: "16px", margin: "0 0 10px 0" }}>🪙 सरप्राइज गेम: लकी स्क्रैच कार्ड</h3>
      <p style={{ color: "#bdc3c7", fontSize: "14px", marginBottom: "15px" }}>कार्ड को अपनी उंगली से रगड़कर अपना इनाम खोलें!</p>
      
      <div style={{ position: "relative", width: "280px", height: "180px", margin: "0 auto 20px", borderRadius: "14px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
        {/* नीचे छिपा हुआ इनाम */}
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#1e293b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px solid #f1c40f", borderRadius: "14px" }}>
          <span style={{ fontSize: "36px" }}>{cardPrize === "Better Luck" ? "💔" : "🎉"}</span>
          <strong style={{ fontSize: "18px", color: cardPrize === "Better Luck" ? "#9ca3af" : "#2ecc71", marginTop: "5px" }}>
            {cardPrize === "?" ? "स्क्रैच करें..." : cardPrize}
          </strong>
        </div>

        {/* ऊपर की स्क्रैच लेयर */}
        <canvas
          ref={canvasRef}
          width={280}
          height={180}
          onMouseMove={handleScratch}
          onTouchMove={handleScratch}
          style={{ position: "absolute", inset: 0, cursor: "pointer", touchAction: "none" }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   गेम 3: 🎰 777 जैकपॉट स्लॉट मशीन कंपोनेंट
========================================================================= */
function SlotMachineGame({ onFinish, onWin }: { onFinish: () => Promise<any>; onWin: (p: string, v: string | null) => void }) {
  const [reels, setReels] = useState(["☕", "🥪", "🍜"]);
  const [isRolling, setIsRolling] = useState(false);
  const [status, setStatus] = useState("लीवर खींचें या बटन दबाएं!");

  const handleRoll = async () => {
    if (isRolling) return;
    setIsRolling(true);
    setStatus("स्लॉट घूम रहा है...");

    // तेजी से इमोजी बदलना
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

      if (prize === "Better Luck") {
        setReels(["❌", "☕", "🥪"]);
        setStatus("उफ़! कोई मैच नहीं मिला (Better Luck).");
      } else {
        const icon = PRIZE_ICONS[winIdx];
        setReels([icon, icon, icon]); // 3 एक जैसे जैकपॉट मैच
        setStatus(`🎉 जैकपॉट! 3 मैच हुए! आप जीते: ${prize}`);
        onWin(prize, voucher);
      }
    }, 3000);
  };

  return (
    <div>
      <h3 style={{ color: "#f1c40f", fontSize: "16px", margin: "0 0 10px 0" }}>🎰 सरप्राइज गेम: 777 स्लॉट मशीन</h3>
      <p style={{ color: "#bdc3c7", fontSize: "14px", marginBottom: "15px" }}>{status}</p>

      {/* स्लॉट बॉक्स */}
      <div style={{ display: "inline-flex", gap: "10px", backgroundColor: "#0f172a", padding: "20px 25px", borderRadius: "16px", border: "4px solid #f59e0b", boxShadow: "0 0 25px rgba(245, 158, 11, 0.4)", marginBottom: "20px" }}>
        {reels.map((icon, i) => (
          <div key={i} style={{ width: "65px", height: "85px", backgroundColor: "#1e293b", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", border: "2px solid #334155", boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)" }}>
            {icon}
          </div>
        ))}
      </div>
      <br />
      <button onClick={handleRoll} disabled={isRolling} style={{ padding: "12px 35px", backgroundColor: isRolling ? "#6b7280" : "#f59e0b", color: "#000", border: "none", borderRadius: "30px", fontWeight: "black", fontSize: "16px", cursor: isRolling ? "not-allowed" : "pointer" }}>
        {isRolling ? "जैकपॉट घूम रहा है..." : "🎰 स्पिन स्लॉट (SPIN)"}
      </button>
    </div>
  );
}

/* =========================================================================
   गेम 4: 🎁 मिस्ट्री गिफ्ट बॉक्स कंपोनेंट
========================================================================= */
function MysteryBoxGame({ onFinish, onWin }: { onFinish: () => Promise<any>; onWin: (p: string, v: string | null) => void }) {
  const [openedBox, setOpenedBox] = useState<number | null>(null);
  const [boxPrize, setBoxPrize] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handlePickBox = async (boxNum: number) => {
    if (openedBox !== null || isOpening) return;
    setIsOpening(true);
    setOpenedBox(boxNum);

    const { prize, voucher } = await onFinish();

    setTimeout(() => {
      setIsOpening(false);
      setBoxPrize(prize);
      if (prize !== "Better Luck") onWin(prize, voucher);
    }, 1500);
  };

  return (
    <div>
      <h3 style={{ color: "#f1c40f", fontSize: "16px", margin: "0 0 10px 0" }}>🎁 सरप्राइज गेम: मिस्ट्री गिफ्ट बॉक्स</h3>
      <p style={{ color: "#bdc3c7", fontSize: "14px", marginBottom: "20px" }}>
        {boxPrize ? (boxPrize === "Better Luck" ? "उफ़! यह बॉक्स खाली था।" : `🎉 बधाई हो! इस बॉक्स में निकला: ${boxPrize}`) : "अपनी पसंद का कोई भी 1 बॉक्स खोलें!"}
      </p>

      {/* 3 गिफ्ट बॉक्स */}
      <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginBottom: "20px" }}>
        {[1, 2, 3].map((b) => {
          const isSelected = openedBox === b;
          return (
            <div
              key={b}
              onClick={() => handlePickBox(b)}
              style={{
                width: "90px",
                height: "110px",
                backgroundColor: isSelected ? "#374151" : "#1f2937",
                border: isSelected ? "3px solid #2ecc71" : "2px solid #3b82f6",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: openedBox !== null ? "default" : "pointer",
                transform: isSelected ? "scale(1.08)" : "scale(1)",
                transition: "all 0.3s ease",
              }}
            >
              <span style={{ fontSize: "40px" }}>
                {isSelected && boxPrize ? (boxPrize === "Better Luck" ? "💔" : "🎉") : "🎁"}
              </span>
              <span style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px", fontWeight: "bold" }}>
                बॉक्स #{b}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
