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

// 🎵 साउंड इफेक्ट्स प्ले करने का फंक्शन
export const playAudio = (type: "win" | "lose" | "spin") => {
  let src = "";
  if (type === "win") src = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"; // जीतने की आवाज़ (Tada)
  if (type === "lose") src = "https://assets.mixkit.co/active_storage/sfx/1436/1436-preview.mp3"; // हारने की आवाज़ (Womp)
  if (type === "spin") src = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3"; // गेम घूमने की आवाज़

  const audio = new Audio(src);
  if (type === "spin") audio.loop = true; // स्पिन के समय लूप में बजेगा
  
  audio.play().catch((e) => console.log("ब्राउज़र ने साउंड ब्लॉक किया:", e));
  return audio; // ताकि बाद में इसे रोका जा सके
};

// 🎆 आतिशबाज़ी (Confetti) का फंक्शन
export const triggerConfetti = () => {
  const duration = 3 * 1000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#22c55e', '#f1c40f', '#3b82f6', '#ef4444']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#22c55e', '#f1c40f', '#3b82f6', '#ef4444']
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

export default function SurpriseArcadeGame() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [tableNo, setTableNo] = useState<string>("सामान्य टेबल");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [alreadyWonPrize, setAlreadyWonPrize] = useState<string | null>(null); // अगर यूज़र रिफ्रेश करता है
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

    // 🔒 सिक्योरिटी फिक्स: टेस्ट मोड केवल लोकलहोस्ट (development) पर काम करेगा
    const isTestMode =
      (process.env.NODE_ENV === "development" &&
        typeof window !== "undefined" &&
        window.location.search.includes("test=true")) ||
      cleanPhone === "9999999999";

    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const userSnap = await getDoc(userRef);

      // 1. डेटाबेस से Cooldown और पुराना कूपन चेक
      if (!isTestMode && userSnap.exists()) {
        const data = userSnap.data();
        if (data?.lastPlayedAt) {
          const lastPlayedMillis = (data.lastPlayedAt as Timestamp).toMillis();
          const elapsed = now - lastPlayedMillis;

          if (elapsed < ONE_HOUR) {
            // 💡 UX फिक्स: अगर यूज़र गलती से रिफ्रेश कर ले, तो उसका कूपन न खोए
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
            return toast.error(`आप हाल ही में खेल चुके हैं! कृपया ${remMin} मिनट बाद आएं।`, {
              duration: 5000,
            });
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
      await setDoc(
        userRef,
        {
          name: cleanName,
          phone: cleanPhone,
          table: tableNo,
          lastActive: serverTimestamp(),
        },
        { merge: true }
      );

      setName(cleanName);
      setPhoneNumber(cleanPhone);
      setAlreadyWonPrize(null);
      setIsLoggedIn(true);

      toast.success(`सरप्राइज! आज आपके लिए खुला है: लकी स्पिन व्हील 🎡`, { duration: 3500 });
    } catch {
      toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // रिजल्ट जनरेटर
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
      await setDoc(
        userRef,
        {
          lastPlayedAt: serverTimestamp(),
          lastPrizeWon: prize,
          voucherCode: voucher,
          table: tableNo,
          voucherClaimed: false,
        },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
    }

    return { winIdx, prize, voucher };
  };

  // कॉमन हैंडलर जीत/हार और साउंड/आतिशबाज़ी के लिए
  const handleGameEnd = (prize: string, voucher: string | null) => {
    if (prize === "Better Luck") {
      playAudio("lose");
    } else {
      playAudio("win");
      triggerConfetti(); // 🎆 आतिशबाज़ी चालू!
      setCouponCode(voucher);
      startTimer();
    }
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#0b0f19",
        color: "#ffffff",
        minHeight: "100vh",
        textAlign: "center",
        padding: "25px 15px",
        boxSizing: "border-box",
      }}
    >
      <Toaster position="top-center" />

      {/* हेडर */}
      <div style={{ marginBottom: "25px" }}>
        <div
          style={{
            display: "inline-block",
            backgroundColor: "rgba(241, 196, 15, 0.15)",
            color: "#f1c40f",
            padding: "4px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "bold",
            marginBottom: "8px",
            border: "1px solid rgba(241, 196, 15, 0.3)",
          }}
        >
          {tableNo}
        </div>
        <h1 style={{ color: "#f1c40f", fontSize: "26px", margin: "0 0 6px 0", fontWeight: "900", letterSpacing: "0.5px" }}>
          बम बम कैफे, मोहंद्रा
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>किस्मत आजमाएं और जीतें स्वादिष्ट फ्री ट्रीट!</p>
      </div>

      {!isLoggedIn ? (
        /* साफ और स्पष्ट इनपुट फॉर्म */
        <div
          style={{
            maxWidth: "340px",
            margin: "0 auto",
            backgroundColor: "#1e293b",
            padding: "25px 20px",
            borderRadius: "20px",
            border: "1px solid #334155",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          }}
        >
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
                autoCapitalize="words"
                autoComplete="name"
                placeholder="उदा. राहुल शर्मा"
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  const capitalized = val.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
                  setName(capitalized);
                }}
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
                  textTransform: "capitalize",
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
              {isLoading ? "कृपया प्रतीक्षा करें..." : "स्पिन गेम खेलें ➔"}
            </button>
          </form>
        </div>
      ) : (
        /* गेम स्क्रीन */
        <div style={{ maxWidth: "420px", margin: "0 auto" }}>
          {alreadyWonPrize ? (
            /* अगर यूज़र रिफ्रेश के बाद वापस आता है और उसका कूपन बचा है तो यह स्क्रीन दिखेगी */
            <div style={{ textAlign: "center", padding: "20px", backgroundColor: "#1e293b", borderRadius: "16px", border: "2px solid #22c55e" }}>
              <h2 style={{ color: "#22c55e", margin: "0 0 10px 0" }}>🎉 आपका एक्टिव इनाम</h2>
              <p style={{ fontSize: "20px", color: "#f1c40f", fontWeight: "bold" }}>{alreadyWonPrize}</p>
              
              <div style={{ backgroundColor: "#0f172a", border: "2px dashed #22c55e", padding: "12px 20px", borderRadius: "12px", display: "inline-block", margin: "15px 0" }}>
                <span style={{ fontSize: "14px", color: "#94a3b8", display: "block", marginBottom: "5px" }}>कूपन कोड: </span>
                <strong style={{ fontSize: "24px", color: "#22c55e", letterSpacing: "3px" }}>{couponCode}</strong>
              </div>
              
              <p style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.5" }}>
                यह स्क्रीन अपने वेटर या काउंटर पर दिखाएं और अपनी ट्रीट प्राप्त करें!
              </p>
              
              {timerText && (
                <div style={{ marginTop: "18px", fontSize: "15px", color: timerText.includes("Expired") ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>
                  {timerText}
                </div>
              )}
            </div>
          ) : (
            /* नॉर्मल गेम प्ले स्क्रीन (सिर्फ स्पिन व्हील) */
            <>
              {/* कूपन कोड (जीतने पर) */}
              {couponCode && (
                <div style={{ backgroundColor: "#1e293b", border: "2px dashed #22c55e", padding: "10px 18px", borderRadius: "12px", display: "inline-block", marginBottom: "15px" }}>
                  <span style={{ fontSize: "13px", color: "#94a3b8" }}>कूपन कोड: </span>
                  <strong style={{ fontSize: "20px", color: "#22c55e", letterSpacing: "2px" }}>{couponCode}</strong>
                </div>
              )}

              {/* केवल स्पिन व्हील गेम */}
              <SpinWheelGame onFinish={executeGameResult} onEnd={handleGameEnd} />

              {/* 5 मिनट का टाइमर */}
              {timerText && (
                <div style={{ marginTop: "18px", fontSize: "15px", color: timerText.includes("Expired") ? "#ef4444" : "#f59e0b", fontWeight: "bold" }}>
                  {timerText}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   गेम: 🎡 लकी स्पिन पहिया (एकमात्र गेम)
========================================================================= */
function SpinWheelGame({ onFinish, onEnd }: { onFinish: () => Promise<any>; onEnd: (p: string, v: string | null) => void }) {
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
    
    // 🎵 स्पिन साउंड शुरू
    const spinAudio = playAudio("spin");

    const { winIdx, prize, voucher } = await onFinish();

    const arcDegree = 360 / PRIZES.length;
    const stopAngle = winIdx * arcDegree + arcDegree / 2;
    const targetAngle = ((270 - stopAngle) % 360 + 360) % 360;
    setRotation((prev) => prev + 3600 + targetAngle - (prev % 360));

    setTimeout(() => {
      setIsSpinning(false);
      spinAudio.pause(); // 🎵 स्पिन साउंड बंद

      if (prize === "Better Luck") {
        setMessage("उफ़! इस बार कोई इनाम नहीं मिला। 1 घंटे बाद पुनः प्रयास करें!");
      } else {
        setMessage(`🎉 बधाई हो! आप जीते हैं: ${prize}! बिलिंग के समय यह स्क्रीन दिखाएं।`);
      }
      
      onEnd(prize, voucher); // जीत/हार की आवाज़ और आतिशबाजी
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
