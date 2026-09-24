"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

// नाम को सही टाइटल केस में बदलने के लिए
const formatNameTitleCase = (text: string) => {
  return text
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const isValidIndianPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

// 7 इनामों की लिस्ट
const PRIZES = [
  "Better Luck",
  "₹10 OFF",
  "Free Coffee",
  "₹20 OFF",
  "Free Sandwich",
  "Free Manchurian",
  "Manchurian Rice",
];

// 70% हार, 30% जीत
const PROBABILITIES = [70, 13, 7, 5, 2.5, 1.5, 1];
const PRIZE_ICONS = ["❌", "💵", "☕", "🏷️", "🥪", "🥟", "🍚"];

export default function SurpriseArcadeGame() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tableNo, setTableNo] = useState<string>("सामान्य टेबल");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1: Spin, 2: Scratch, 3: Slot, 4: Mystery Box
  const [selectedGame, setSelectedGame] = useState<number>(1);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [timerText, setTimerText] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // URL से टेबल नंबर (?table=1)
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

  // --- लॉगिन एवं 1-घंटे का Cooldown चेक ---
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

    // 🧪 टेस्टिंग मोड (URL में ?test=true या 9999999999 पर नो-लॉक)
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

      // 🎲 सच्चा रैंडम चुनाव (पिछला खेला गया गेम रिपीट नहीं होगा)
      const lastGame = parseInt(localStorage.getItem("last_selected_game") || "0", 10);
      const availableGames = [1, 2, 3, 4].filter((g) => g !== lastGame);
      const randomGameNum = availableGames[Math.floor(Math.random() * availableGames.length)];
      localStorage.setItem("last_selected_game", randomGameNum.toString());

      setSelectedGame(randomGameNum);
      setName(cleanName);
      setPhoneNumber(cleanPhone);
      setIsLoggedIn(true);

      const gameNames = ["", "लकी स्पिन व्हील 🎡", "लकी स्क्रैच कार्ड 🪙", "777 स्लॉट मशीन 🎰", "मिस्ट्री गिफ्ट बॉक्स 🎁"];
      toast.success(`सरप्राइज! आज आपके लिए खुला है: ${gameNames[randomGameNum]}`, { duration: 3500 });
    } catch {
      toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // कॉमन रिजल्ट जनरेटर (सभी गेम्स के लिए निष्पक्ष नियम)
  const executeGameResult = async () => {
    localStorage.setItem("device_last_played", Date.now().toString());

    // 70% हार, 30% जीत
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
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#0b0f19", color: "#ffffff", minHeight: "100vh", textAlign: "center", padding: "25px 15px", boxSizing: "border-box" }}>
      <Toaster position="top-center" />

      {/* हेडर */}
      <div style={{ marginBottom: "25px" }}>
        <div style={{ display: "inline-block", backgroundColor: "rgba(241, 196, 15, 0.15)", color: "#f1c40f", padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", marginBottom: "8px", border: "1px solid rgba(241, 196, 15, 0.3)" }}>
          {tableNo}
        </div>
        <h1 style={{ color: "#f1c40f", fontSize: "26px", margin: "0 0 6px 0", fontWeight: "900", letterSpacing: "0.5px" }}>
          बम बम कैफे, मोहंद्रा
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
          किस्मत आजमाएं और जीतें स्वादिष्ट फ्री ट्रीट!
        </p>
      </div>

      {!isLoggedIn ? (
        /* साफ और स्पष्ट इनपुट फॉर्म */
        <div style={{ maxWidth: "340px", margin: "0 auto", backgroundColor: "#1e293b", padding: "25px 20px", borderRadius: "20px", border: "1px solid #334155", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: "42px", marginBottom: "8px" }}>🎁</div>
          <h2 style={{ fontSize: "18px", margin: "0 0 16px 0", color: "#38bdf8", fontWeight: "bold" }}>
            खेलने के लिए विवरण दर्ज करें
          </h2>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", textAlign: "left", fontSize: "12px", color: "#94a3b8", marginBottom: "5px", fontWeight: "bold" }}>
                आपका नाम
              </label>
              <input
                type="text"
                placeholder="उदा. राहुल शर्मा"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "2px solid #3b82f6",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: "bold",
                  textAlign: "center",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", textAlign: "left", fontSize: "12px", color: "#94a3b8", marginBottom: "5px", fontWeight: "bold" }}>
                10-अंकों का मोबाइल नंबर
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="उदा. 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "2px solid #f1c40f",
                  backgroundColor: "#0f172a",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: "bold",
                  textAlign: "center",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "25px",
                border: "none",
                backgroundColor: "#22c55e",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "900",
                cursor: isLoading ? "not-allowed" : "pointer",
                marginTop: "10px",
                boxShadow: "0 4px 15px rgba(34, 197, 94, 0.4)",
              }}
            >
              {isLoading ? "कृपया प्रतीक्षा करें..." : "सरप्राइज गेम खेलें ➔"}
            </button>
          </form>
        </div>
      ) : (
        /* गेम स्क्रीन */
        <div style={{ maxWidth: "420px", margin: "0 auto" }}>
          {/* 🎮 गेम स्विचर टैब्स (1 क्लिक में गेम बदलने के लिए) */}
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "15px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setSelectedGame(1)}
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                border: selectedGame === 1 ? "2px solid #f1c40f" : "1px solid #334155",
                backgroundColor: selectedGame === 1 ? "#334155" : "#1e293b",
                color: selectedGame === 1 ? "#f1c40f" : "#94a3b8",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🎡 लकी पहिया
            </button>
            <button
              type="button"
              onClick={() => setSelectedGame(2)}
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                border: selectedGame === 2 ? "2px solid #f1c40f" : "1px solid #334155",
                backgroundColor: selectedGame === 2 ? "#334155" : "#1e293b",
                color: selectedGame === 2 ? "#f1c40f" : "#94a3b8",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🪙 स्क्रैच कार्ड
            </button>
            <button
              type="button"
              onClick={() => setSelectedGame(3)}
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                border: selectedGame === 3 ? "2px solid #f1c40f" : "1px solid #334155",
                backgroundColor: selectedGame === 3 ? "#334155" : "#1e293b",
                color: selectedGame === 3 ? "#f1c40f" : "#94a3b8",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🎰 777 स्लॉट
            </button>
            <button
              type="button"
              onClick={() => setSelectedGame(4)}
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                border: selectedGame === 4 ? "2px solid #f1c40f" : "1px solid #334155",
                backgroundColor: selectedGame === 4 ? "#334155" : "#1e293b",
                color: selectedGame === 4 ? "#f1c40f" : "#94a3b8",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              🎁 मिस्ट्री बॉक्स
            </button>
          </div>

          {/* कूपन कोड (जीतने पर) */}
          {couponCode && (
            <div style={{ backgroundColor: "#1e293b", border: "2px dashed #22c55e", padding: "10px 18px", borderRadius: "12px", display: "inline-block", marginBottom: "15px" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>कूपन कोड: </span>
              <strong style={{ fontSize: "20px", color: "#22c55e", letterSpacing: "2px" }}>{couponCode}</strong>
            </div>
          )}

          {/* 4 में से चयनित गेम */}
          {selectedGame === 1 && (
            <SpinWheelGame onFinish={executeGameResult} onWin={(p, v) => { setCouponCode(v); startTimer(); }} />
          )}

          {selectedGame === 2 && (
            <ScratchCardGame onFinish={executeGameResult} onWin={(p, v) => { setCouponCode(v); startTimer(); }} />
          )}

          {selectedGame === 3 && (
            <SlotMachineGame onFinish={executeGameResult} onWin={(p, v) => { setCouponCode(v); startTimer(); }} />
          )}

          {selectedGame === 4 && (
            <MysteryBoxGame onFinish={executeGameResult} onWin={(p, v) => { setCouponCode(v); startTimer(); }} />
          )}

          {/* 5 मिनट का टाइमर */}
          {timerText && (
            <div style={{ marginTop: "18px", fontSize: "15px", color: timerText.includes("Expired") ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>
              {timerText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   गेम 1: 🎡 लकी स्पिन पहिया
========================================================================= */
function SpinWheelGame({ onFinish, onWin }: { onFinish: () => Promise<any>; onWin: (p: string, v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [message, setMessage] = useState("पहिया घुमाएं और अपना भाग्य देखें!");

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
        setMessage(`🎉 बधाई हो! आप जीते हैं: ${prize}! बिलिंग के समय यह स्क्रीन दिखाएं।`);
        onWin(prize, voucher);
      }
    }, 4000);
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "14px", minHeight: "36px", marginBottom: "10px" }}>{message}</p>
      <div style={{ position: "relative", width: "300px", height: "300px", margin: "10px auto 20px" }}>
        <div style={{ position: "absolute", top: "-18px", left: "50%", transform: "translateX(-50%)", fontSize: "36px", color: "#ef4444", zIndex: 10 }}>▼</div>
        <canvas
          ref={canvasRef}
          style={{ width: "300px", height: "300px", borderRadius: "50%", border: "5px solid #fff", boxShadow: "0 0 25px rgba(0,0,0,0.6)", transform: `rotate(${rotation}deg)`, transition: "transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)" }}
        />
      </div>
      <button onClick={handleSpin} disabled={isSpinning} style={{ padding: "12px 35px", backgroundColor: isSpinning ? "#64748b" : "#ef4444", color: "white", border: "none", borderRadius: "30px", fontWeight: "900", fontSize: "16px", cursor: isSpinning ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(239, 68, 68, 0.4)" }}>
        {isSpinning ? "घूम रहा है..." : "पहिया घुमाएं (SPIN)"}
      </button>
    </div>
  );
}

/* =========================================================================
   गेम 2: 🪙 लकी स्क्रैच कार्ड (Google Pay स्टाइल)
========================================================================= */
function ScratchCardGame({ onFinish, onWin }: { onFinish: () => Promise<any>; onWin: (p: string, v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cardPrize, setCardPrize] = useState<string>("?");
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 280, 180);
    grad.addColorStop(0, "#d4af37");
    grad.addColorStop(0.5, "#fde047");
    grad.addColorStop(1, "#a16207");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 280, 180);

    ctx.fillStyle = "#713f12";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🪙 यहाँ उंगली से स्क्रैच करें", 140, 85);
    ctx.font = "12px Arial";
    ctx.fillText("(Scratch to Reveal)", 140, 110);
  }, []);

  const handleScratch = async (e: any) => {
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
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "14px", marginBottom: "15px" }}>कार्ड को उंगली से रगड़कर अपना इनाम खोलें!</p>
      
      <div style={{ position: "relative", width: "280px", height: "180px", margin: "0 auto 20px", borderRadius: "16px", overflow: "hidden", boxShadow: "0 8px 25px rgba(0,0,0,0.5)" }}>
        {/* नीचे छिपा हुआ इनाम */}
        <div style={{ position: "absolute", inset: 0, backgroundColor: "#1e293b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "2px solid #eab308", borderRadius: "16px" }}>
          <span style={{ fontSize: "40px" }}>{cardPrize === "Better Luck" ? "💔" : "🎉"}</span>
          <strong style={{ fontSize: "18px", color: cardPrize === "Better Luck" ? "#94a3b8" : "#22c55e", marginTop: "8px" }}>
            {cardPrize === "?" ? "स्क्रैच करें..." : cardPrize}
          </strong>
        </div>

        {/* ऊपर की सोने वाली स्क्रैच परत */}
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
   गेम 3: 🎰 777 जैकपॉट स्लॉट मशीन
========================================================================= */
function SlotMachineGame({ onFinish, onWin }: { onFinish: () => Promise<any>; onWin: (p: string, v: string | null) => void }) {
  const [reels, setReels] = useState(["☕", "🥪", "🍜"]);
  const [isRolling, setIsRolling] = useState(false);
  const [status, setStatus] = useState("बटन दबाएं और तीनों रील्स मैच करें!");

  const handleRoll = async () => {
    if (isRolling) return;
    setIsRolling(true);
    setStatus("स्लॉट घूम रहा है...");

    const interval = setInterval(() => {
      setReels([
        PRIZE_ICONS[Math.floor(Math.random() * PRIZE_ICONS.length)],
        PRIZE_ICONS[Math.floor(Math.random() * PRIZE_ICONS.length)],
        PRIZE_ICONS[Math.floor(Math.random() * PRIZE_ICONS.length)],
      ]);
    }, 90);

    const { winIdx, prize, voucher } = await onFinish();

    setTimeout(() => {
      clearInterval(interval);
      setIsRolling(false);

      if (prize === "Better Luck") {
        setReels(["❌", "☕", "🥪"]);
        setStatus("उफ़! कोई मैच नहीं मिला (Better Luck).");
      } else {
        const icon = PRIZE_ICONS[winIdx];
        setReels([icon, icon, icon]);
        setStatus(`🎉 जैकपॉट! आप जीते: ${prize}`);
        onWin(prize, voucher);
      }
    }, 3000);
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "14px", marginBottom: "15px" }}>{status}</p>

      <div style={{ display: "inline-flex", gap: "10px", backgroundColor: "#0f172a", padding: "18px 24px", borderRadius: "18px", border: "4px solid #f59e0b", boxShadow: "0 0 25px rgba(245, 158, 11, 0.4)", marginBottom: "20px" }}>
        {reels.map((icon, i) => (
          <div key={i} style={{ width: "68px", height: "88px", backgroundColor: "#1e293b", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "38px", border: "2px solid #334155", boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)" }}>
            {icon}
          </div>
        ))}
      </div>
      <br />
      <button onClick={handleRoll} disabled={isRolling} style={{ padding: "13px 38px", backgroundColor: isRolling ? "#64748b" : "#f59e0b", color: "#000000", border: "none", borderRadius: "30px", fontWeight: "900", fontSize: "16px", cursor: isRolling ? "not-allowed" : "pointer", boxShadow: "0 4px 15px rgba(245, 158, 11, 0.4)" }}>
        {isRolling ? "जैकपॉट घूम रहा है..." : "🎰 स्लॉट घुमाएं (SPIN)"}
      </button>
    </div>
  );
}

/* =========================================================================
   गेम 4: 🎁 मिस्ट्री गिफ्ट बॉक्स
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
    }, 1200);
  };

  return (
    <div>
      <p style={{ color: "#cbd5e1", fontSize: "14px", marginBottom: "20px" }}>
        {boxPrize ? (boxPrize === "Better Luck" ? "उफ़! यह बॉक्स खाली था।" : `🎉 बधाई हो! इस बॉक्स में निकला: ${boxPrize}`) : "अपनी पसंद का कोई भी 1 बॉक्स खोलें!"}
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
        {[1, 2, 3].map((b) => {
          const isSelected = openedBox === b;
          return (
            <div
              key={b}
              onClick={() => handlePickBox(b)}
              style={{
                width: "92px",
                height: "115px",
                backgroundColor: isSelected ? "#334155" : "#1e293b",
                border: isSelected ? "3px solid #22c55e" : "2px solid #3b82f6",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: openedBox !== null ? "default" : "pointer",
                transform: isSelected ? "scale(1.08)" : "scale(1)",
                transition: "all 0.25s ease",
                boxShadow: "0 6px 15px rgba(0,0,0,0.4)",
              }}
            >
              <span style={{ fontSize: "42px" }}>
                {isSelected && boxPrize ? (boxPrize === "Better Luck" ? "💔" : "🎉") : "🎁"}
              </span>
              <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px", fontWeight: "bold" }}>
                बॉक्स #{b}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
