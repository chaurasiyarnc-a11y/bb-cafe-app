"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

// नाम को सही फॉर्मेट में करने के लिए
const formatNameTitleCase = (text: string) => {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// भारतीय 10-अंकों का नंबर जांचने के लिए
const isValidIndianPhone = (phone: string) => {
  return /^[6-9]\d{9}$/.test(phone);
};

export default function SecureSpinGame() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [message, setMessage] = useState("अपना इनाम जीतें (हर 1 घंटे में 1 मौका)");
  const [timerText, setTimerText] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [rotation, setRotation] = useState(0);

  // 👉 7 इनाम (100% Free हटाया, Manchurian और Manchurian Rice जोड़ा)
  const prizes = [
    "Better Luck",
    "₹10 OFF",
    "Free Coffee",
    "₹20 OFF",
    "Free Sandwich",
    "Free Manchurian",
    "Manchurian Rice",
  ];

  // 👉 7 रंगों का कॉम्बिनेशन
  const colors = [
    "#e74c3c", // लाल (Better Luck)
    "#3498db", // नीला (₹10 OFF)
    "#f1c40f", // पीला (Free Coffee)
    "#9b59b6", // बैंगनी (₹20 OFF)
    "#e67e22", // नारंगी (Free Sandwich)
    "#1abc9c", // फिरोजी (Free Manchurian)
    "#2ecc71", // हरा (Manchurian Rice)
  ];

  // 👉 जीतने के चांस का प्रतिशत (कुल योग = 100%)
  const probabilities = [70, 13, 7, 5, 2.5, 1.5, 1];

  const ONE_HOUR_MS = 60 * 60 * 1000; // 1 घंटा मिलीसेकंड में

  // मेमोरी लीक रोकने के लिए टाइमर क्लीनअप
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- LOGIN & FIRESTORE COOLDOWN CHECK ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = formatNameTitleCase(name.trim());
    if (cleanName.length < 2) {
      return toast.error("कृपया अपना सही नाम दर्ज़ करें!");
    }

    const cleanPhone = phoneNumber.replace(/\D/g, "").slice(-10);
    if (!isValidIndianPhone(cleanPhone)) {
      return toast.error("कृपया सही 10-अंकों का मोबाइल नंबर डालें (उदा. 9876543210)");
    }

    setIsLoading(true);

    try {
      const now = Date.now();
      const userRef = doc(db, "customer_points", cleanPhone);
      const userDoc = await getDoc(userRef);

      // 1. FIRESTORE DATABASE CHECK (इन्कॉग्निटो मोड या कैश डिलीट करने पर भी यह रोकेगा)
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const lastPlayedTimestamp: Timestamp | undefined = userData?.lastPlayedAt;

        if (lastPlayedTimestamp) {
          const lastPlayedTime = lastPlayedTimestamp.toMillis();
          const elapsed = now - lastPlayedTime;

          if (elapsed < ONE_HOUR_MS) {
            const remainingMinutes = Math.ceil((ONE_HOUR_MS - elapsed) / 60000);
            setIsLoading(false);
            return toast.error(
              `इस नंबर से हाल ही में खेला गया है! कृपया ${remainingMinutes} मिनट बाद प्रयास करें।`,
              { duration: 5000 }
            );
          }
        }
      }

      // 2. DEVICE LOCALSTORAGE CHECK (अतिरिक्त डिवाइस सुरक्षा)
      const deviceLastPlayed = localStorage.getItem("device_last_played");
      if (deviceLastPlayed) {
        const elapsedDevice = now - parseInt(deviceLastPlayed, 10);
        if (elapsedDevice < ONE_HOUR_MS) {
          const remainingMinutes = Math.ceil((ONE_HOUR_MS - elapsedDevice) / 60000);
          setIsLoading(false);
          return toast.error(
            `इस मोबाइल से खेला जा चुका है! कृपया ${remainingMinutes} मिनट बाद प्रयास करें।`,
            { duration: 5000 }
          );
        }
      }

      // डेटाबेस में प्रोफाइल अपडेट / सेव करना
      await setDoc(
        userRef,
        {
          name: cleanName,
          phone: cleanPhone,
          lastActive: serverTimestamp(),
          importSource: "SpinGame",
        },
        { merge: true }
      );

      setName(cleanName);
      setPhoneNumber(cleanPhone);
      setIsLoggedIn(true);
      setMessage(`स्वागत है, ${cleanName}! अपना पहिया घुमाएं।`);
      toast.success("नंबर वेरीफाई हो गया! ✅");
    } catch (error) {
      console.error("Firebase Sync Error:", error);
      toast.error("सर्वर से जुड़ने में त्रुटि हुई, कृपया दोबारा प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  // --- DRAW CANVAS WHEEL ---
  useEffect(() => {
    if (!isLoggedIn) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // मोबाइल स्क्रीन्स पर शार्प रेंडरिंग के लिए
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 300 * dpr;
    ctx.scale(dpr, dpr);

    let startAngle = 0;
    const arc = (2 * Math.PI) / prizes.length;

    for (let i = 0; i < prizes.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.moveTo(150, 150);
      ctx.arc(150, 150, 145, startAngle, startAngle + arc);
      ctx.fill();

      // टेक्स्ट लिखना
      ctx.save();
      ctx.translate(150, 150);
      ctx.rotate(startAngle + arc / 2);
      ctx.fillStyle = "white";

      // 12px फॉन्ट ताकि Manchurian Rice बॉर्डर से बाहर न कटे
      ctx.font = "bold 12px Arial";
      ctx.fillText(prizes[i], 38, 4);
      ctx.restore();

      startAngle += arc;
    }
  }, [isLoggedIn]);

  // --- 5-MINUTE COUNTDOWN TIMER ---
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    let timeLeft = 300; // 5 मिनट = 300 सेकंड
    timerRef.current = setInterval(() => {
      const m = Math.floor(timeLeft / 60);
      const s = timeLeft % 60;
      const formattedS = s < 10 ? `0${s}` : `${s}`;
      setTimerText(`ऑफर समाप्त होने में: ${m}:${formattedS} मिनट`);
      timeLeft--;

      if (timeLeft < 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimerText("⚠️ ऑफर समाप्त हो गया (Offer Expired)!");
      }
    }, 1000);
  };

  // --- SPIN LOGIC ---
  const spinWheel = async () => {
    if (isSpinning || hasPlayed) return;

    setIsSpinning(true);
    setHasPlayed(true);

    const now = Date.now();
    localStorage.setItem("device_last_played", now.toString());

    // लॉटरी परिणाम निकालना
    const rand = Math.random() * 100;
    let sum = 0;
    let winningIndex = 0;

    for (let i = 0; i < probabilities.length; i++) {
      sum += probabilities[i];
      if (rand <= sum) {
        winningIndex = i;
        break;
      }
    }

    const wonPrize = prizes[winningIndex];
    // काउंटर पर वेरिफाई करने के लिए यूनिक 4-अंकों का कूपन कोड
    const generatedCode =
      wonPrize !== "Better Luck"
        ? `BOM-${Math.floor(1000 + Math.random() * 9000)}`
        : null;

    // खेलने का समय और जीता हुआ इनाम तुरंत Firestore में सेव करना
    try {
      const userRef = doc(db, "customer_points", phoneNumber);
      await setDoc(
        userRef,
        {
          lastPlayedAt: serverTimestamp(),
          lastPrizeWon: wonPrize,
          voucherCode: generatedCode || null,
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Firestore Play Lock Error:", err);
    }

    // पहिये के घूमने का कोण निकालना (तीर 12 बजे / टॉप पर है)
    const arcDegree = 360 / prizes.length;
    const stopAngle = winningIndex * arcDegree + arcDegree / 2;
    const targetAngle = ((270 - stopAngle) % 360 + 360) % 360;
    const totalDegrees = rotation + 3600 + targetAngle - (rotation % 360);

    setRotation(totalDegrees);

    setTimeout(() => {
      setIsSpinning(false);

      if (wonPrize === "Better Luck") {
        setMessage("उफ़! इस बार कोई इनाम नहीं मिला। 1 घंटे बाद पुनः प्रयास करें!");
      } else {
        setCouponCode(generatedCode);
        setMessage(`🎉 बधाई हो ${name}! आप जीते हैं: ${wonPrize}! बिलिंग के समय यह स्क्रीन और कूपन कोड दिखाएं।`);
        startTimer();
      }
    }, 4000);
  };

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
        backgroundColor: "#111827",
        color: "white",
        minHeight: "100vh",
        paddingTop: "40px",
        paddingBottom: "40px",
      }}
    >
      <Toaster position="top-center" />

      <h1 style={{ color: "#f1c40f", fontSize: "32px", margin: "0 0 5px 0" }}>
        बम बम कैफे, मोहंद्रा
      </h1>
      <h2 style={{ color: "#fff", fontSize: "18px", marginTop: "0", marginBottom: "20px" }}>
        स्पिन करें और शानदार इनाम जीतें!
      </h2>

      {!isLoggedIn ? (
        <div style={{ marginTop: "20px", padding: "20px" }}>
          <p style={{ color: "#bdc3c7", fontSize: "16px", marginBottom: "20px" }}>
            खेलने के लिए अपना नाम और नंबर दर्ज़ करें
          </p>
          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "15px" }}
          >
            <input
              type="text"
              placeholder="आपका शुभ नाम"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
              style={{
                padding: "14px",
                fontSize: "16px",
                width: "280px",
                borderRadius: "8px",
                border: "2px solid #3498db",
                textAlign: "center",
                color: "#000",
              }}
            />

            <input
              type="tel"
              maxLength={10}
              placeholder="10-अंकों का मोबाइल नंबर"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              required
              style={{
                padding: "14px",
                fontSize: "16px",
                width: "280px",
                borderRadius: "8px",
                border: "2px solid #f1c40f",
                textAlign: "center",
                color: "#000",
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: isLoading ? "#95a5a6" : "#2ecc71",
                color: "white",
                fontSize: "16px",
                padding: "12px 30px",
                border: "none",
                borderRadius: "20px",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontWeight: "bold",
                marginTop: "10px",
              }}
            >
              {isLoading ? "कृपया प्रतीक्षा करें..." : "वेरीफाई करें और खेलें"}
            </button>
          </form>
        </div>
      ) : (
        <div>
          <p
            style={{
              color: "#f3f4f6",
              fontSize: "16px",
              padding: "0 20px",
              maxWidth: "420px",
              margin: "0 auto 15px",
              lineHeight: "1.5",
            }}
          >
            {message}
          </p>

          {couponCode && (
            <div
              style={{
                backgroundColor: "#1e293b",
                border: "2px dashed #2ecc71",
                padding: "10px 20px",
                borderRadius: "8px",
                display: "inline-block",
                marginBottom: "15px",
              }}
            >
              <span style={{ fontSize: "14px", color: "#94a3b8" }}>कूपन कोड: </span>
              <strong style={{ fontSize: "20px", color: "#2ecc71", letterSpacing: "2px" }}>
                {couponCode}
              </strong>
            </div>
          )}

          <div
            style={{
              position: "relative",
              width: "300px",
              height: "300px",
              margin: "10px auto 25px",
            }}
          >
            {/* ऊपर लगा लाल तीर (Pointer) */}
            <div
              style={{
                position: "absolute",
                top: "-18px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "36px",
                color: "#e74c3c",
                zIndex: 10,
                lineHeight: 1,
              }}
            >
              ▼
            </div>
            <canvas
              ref={canvasRef}
              style={{
                width: "300px",
                height: "300px",
                borderRadius: "50%",
                border: "5px solid #fff",
                boxShadow: "0 0 20px rgba(0,0,0,0.6)",
                backgroundColor: "#fff",
                transition: "transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)",
                transform: `rotate(${rotation}deg)`,
              }}
            />
          </div>

          <button
            onClick={spinWheel}
            disabled={isSpinning || hasPlayed}
            style={{
              backgroundColor: isSpinning || hasPlayed ? "#4b5563" : "#e74c3c",
              color: "white",
              fontSize: "18px",
              padding: "14px 36px",
              border: "none",
              borderRadius: "30px",
              cursor: isSpinning || hasPlayed ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {isSpinning
              ? "पहिया घूम रहा है..."
              : hasPlayed
              ? "मौका खत्म (1 घंटे बाद आएं)"
              : "अभी घुमाएं (SPIN NOW)"}
          </button>

          {timerText && (
            <div
              style={{
                marginTop: "20px",
                fontSize: "16px",
                color: timerText.includes("Expired") ? "#ef4444" : "#f59e0b",
                fontWeight: "bold",
              }}
            >
              {timerText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
