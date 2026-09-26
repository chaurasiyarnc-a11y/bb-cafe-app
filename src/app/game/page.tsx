"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

// --- Constants & Helpers ---

// नाम को सही टाइटल केस में बदलने के लिए (सुधारा गया)
const formatNameTitleCase = (text: string) => {
  return text
    .toLowerCase()
    .split(/\s+/) // एक से अधिक स्पेस को भी हैंडल करता है
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// केवल 10 अंकों के भारतीय नंबरों के लिए (कोई +91 नहीं)
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

const PROBABILITIES = [70, 13, 7, 5, 2.5, 1.5, 1]; // कुल 100%
const PRIZE_ICONS = ["❌", "💵", "☕", "🏷️", "🥪", "🥟", "🍚"];

// --- Audio & Confetti Helpers ---

const playAudio = (type: "win" | "lose" | "spin" | "scratch"): HTMLAudioElement | null => {
  if (typeof window === "undefined") return null;

  let src = "";
  if (type === "win") src = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3";
  if (type === "lose") src = "https://assets.mixkit.co/active_storage/sfx/1436/1436-preview.mp3";
  if (type === "spin") src = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3";
  if (type === "scratch") src = "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3";

  try {
    const audio = new Audio(src);
    if (type === "spin") audio.loop = true;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((e) => console.warn("Audio block alert:", e));
    }
    return audio;
  } catch (err) {
    return null;
  }
};

const triggerConfetti = () => {
  if (typeof window === "undefined") return;

  const runAnimation = () => {
    const confetti = (window as any).confetti;
    if (!confetti) return;

    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
  };

  if (!(window as any).confetti) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js";
    script.onload = runAnimation;
    document.body.appendChild(script);
  } else {
    runAnimation();
  }
};

// --- Main Component ---

export default function SurpriseArcadeGame() {
  const [isMounted, setIsMounted] = useState(false);
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
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("table");
      if (t) setTableNo(`टेबल नं: ${t}`);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- Logic ---

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let timeLeft = 300; // 5 minutes in seconds
    
    const updateDisplay = () => {
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      setTimerText(`ऑफर समाप्त होने में: ${m}:${s < 10 ? "0" + s : s} मिनट`);
      timeLeft--;
      if (timeLeft < 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerText("⚠️ ऑफर समाप्त हो गया!");
      }
    };

    updateDisplay(); // तुरंत शुरू करें
    timerRef.current = setInterval(updateDisplay, 1000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formatNameTitleCase(name.trim());
    if (cleanName.length < 2) return toast.error("कृपया अपना सही नाम दर्ज करें!");

    const cleanPhone = phoneNumber.replace(/\D/g, ""); // केवल अंक रखें
    if (!isValidIndianPhone(cleanPhone)) {
      return toast.error("कृपया सही 10-अंकों का मोबाइल नंबर डालें!");
    }

    setIsLoading(true);
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    const isTestMode = cleanPhone === "9999999999";

    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const userSnap = await getDoc(userRef);

      // 🛑 स्टेप 1: डेटाबेस (Firebase) में नंबर चेक करें
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
            return toast.error(`यह नंबर हाल ही में इस्तेमाल हुआ है! कृपया ${remMin} मिनट बाद आएं।`, { duration: 5000 });
          }
        }
      }

      // 🚨 स्टेप 2: डिवाइस चेक (LocalStorage + Cookies)
      if (!isTestMode && typeof window !== "undefined") {
        const deviceLast = localStorage.getItem("device_last_played");
        const hasCookie = document.cookie.includes("device_played=true");

        if (deviceLast || hasCookie) {
          let isDeviceBlocked = hasCookie;
          if (deviceLast) {
            const elapsedDevice = now - parseInt(deviceLast, 10);
            if (elapsedDevice < ONE_HOUR) isDeviceBlocked = true;
          }

          if (isDeviceBlocked) {
            setIsLoading(false);
            return toast.error("🚨 आप इस मोबाइल से पहले ही खेल चुके हैं! एक फोन से केवल 1 बार ही खेल सकते हैं।", { duration: 6000 });
          }
        }
      }

      await setDoc(
        userRef,
        { name: cleanName, phone: cleanPhone, table: tableNo, lastActive: serverTimestamp() },
        { merge: true }
      );

      // गेम्स को शफल करें और एक रैंडम गेम चुनें
      const lastGame = typeof window !== "undefined" ? parseInt(localStorage.getItem("last_selected_game") || "0", 10) : 0;
      const availableGames = [1, 2, 3, 4].filter((g) => g !== lastGame);
      const randomGameNum = availableGames[Math.floor(Math.random() * availableGames.length)];
      if (typeof window !== "undefined") {
        localStorage.setItem("last_selected_game", randomGameNum.toString());
      }

      setSelectedGame(randomGameNum);
      setName(cleanName);
      setPhoneNumber(cleanPhone);
      setAlreadyWonPrize(null);
      setIsLoggedIn(true);

      const gameNames = ["", "लकी स्पिन व्हील 🎡", "लकी स्क्रैच कार्ड 🪙", "777 स्लॉट मशीन 🎰", "मिस्ट्री गिफ्ट बॉक्स 🎁"];
      toast.success(`सरप्राइज! आज आपके लिए खुला है: ${gameNames[randomGameNum]}`, { duration: 3500 });
    } catch (err) {
      console.error("Login error:", err);
      toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  const executeGameResult = async () => {
    // 🚨 जैसे ही गेम ख़त्म हो, फ़ोन को 1 घंटे के लिए लॉक कर दें
    if (typeof window !== "undefined") {
      localStorage.setItem("device_last_played", Date.now().toString());
      document.cookie = `device_played=true; max-age=3600; path=/`; // 1 hour
    }

    // Probability calculation
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
      console.error("Error saving game result:", e);
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

  if (!isMounted) return null;

  // --- Render ---

  return (
    <>
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
                  style={{ width: "100%", boxSizing: "border-box", padding: "14px", borderRadius: "12px", border: "2px solid #3b82f6", backgroundColor: "#0f172a", color: "#ffffff", fontSize: "16px", fontWeight: "bold", textAlign: "center", outline: "none", textTransform:
