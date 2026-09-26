"use client";

import React, { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase"; // सुनिश्चित करें कि यह पथ आपके प्रोजेक्ट के अनुसार सही है
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";

// --- Constants & Helpers ---

// नाम को सही टाइटल केस में बदलने के लिए
const formatNameTitleCase = (text: string) => {
    return text
        .toLowerCase()
        .split(/\s+/)
        .map((w) => (w.charAt(0).toUpperCase() + w.slice(1)))
        .join(" ");
};

// केवल 10 अंकों के भारतीय नंबरों के लिए
const isValidIndianPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

// इनामों की लिस्ट (स्पिन व्हील के 8 सेगमेंट के अनुसार)
const PRIZE_SEGMENTS = [
    { text: "Better Luck", color: "#7f8c8d", icon: "❌" }, // Gray
    { text: "Free Coffee", color: "#f1c40f", icon: "☕" },  // Gold
    { text: "₹10 OFF", color: "#3498db", icon: "💵" },   // Blue
    { text: "Free Sandwich", color: "#2ecc71", icon: "🥪" },// Green
    { text: "Better Luck", color: "#95a5a6", icon: "❌" }, // Light Gray
    { text: "₹20 OFF", color: "#9b59b6", icon: "🏷️" },   // Purple
    { text: "Free Manchurian", color: "#e67e22", icon: "🥟" }, // Orange
    { text: "Manchurian Rice", color: "#c0392b", icon: "🍚" }, // Red
];

// 확률/वितरण (जीतने की संभावना - कुल 100% होनी चाहिए)
const PROBABILITIES = [45, 15, 15, 10, 5, 5, 3, 2];

const getPrizeResult = () => {
    const rand = Math.random() * 100;
    let sum = 0;
    for (let i = 0; i < PROBABILITIES.length; i++) {
        sum += PROBABILITIES[i];
        if (rand <= sum) {
            return { index: i, ...PRIZE_SEGMENTS[i] };
        }
    }
    return { index: 0, ...PRIZE_SEGMENTS[0] }; // डिफ़ॉल्ट
};

// --- Audio & Confetti Helpers ---

const playAudio = (type: "win" | "lose" | "spin"): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;

    let src = "";
    if (type === "win") src = "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3";
    if (type === "lose") src = "https://assets.mixkit.co/active_storage/sfx/1436/1436-preview.mp3";
    if (type === "spin") src = "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3";

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
    const [tableNo, setTableNo] = useState<string>("टेबल नं: काउंटर");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Game State
    const [isSpinning, setIsSpinning] = useState(false);
    const [currentRotation, setCurrentRotation] = useState(0);
    const [showResultModal, setShowResultModal] = useState(false);
    const [wonPrize, setWonPrize] = useState<any>(null);
    const [couponCode, setCouponCode] = useState<string | null>(null);
    const [timerText, setTimerText] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const spinAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setIsMounted(true);
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const t = params.get("table");
            if (t) setTableNo(`टेबल नं: ${t}`);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (spinAudioRef.current) spinAudioRef.current.pause();
        };
    }, []);

    // --- Logic ---

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        let timeLeft = 300; // 5 minutes

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

        updateDisplay();
        timerRef.current = setInterval(updateDisplay, 1000);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const cleanName = formatNameTitleCase(name.trim());
        if (cleanName.length < 2) return toast.error("कृपया अपना सही नाम दर्ज करें!");

        const cleanPhone = phoneNumber.replace(/\D/g, "");
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
                            setWonPrize(PRIZE_SEGMENTS.find(p => p.text === data.lastPrizeWon));
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

            setName(cleanName);
            setPhoneNumber(cleanPhone);
            setIsLoggedIn(true);
            toast.success(`स्वागत है, ${cleanName}! अब अपनी किस्मत आजमाएं।`, { duration: 3000 });

        } catch (err) {
            console.error("Login error:", err);
            toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
        } finally {
            setIsLoading(false);
        }
    };

    const executeSpin = async () => {
        if (isSpinning) return;

        setIsSpinning(true);
        spinAudioRef.current = playAudio("spin");

        // परिणाम निर्धारित करें
        const result = getPrizeResult();
        setWonPrize(result);

        // पूर्ण क्रांतियों की संख्या (5-7)
        const spinRounds = 5 + Math.random() * 2;
        // प्रति सेगमेंट कोण (360 / 8) = 45 डिग्री
        const segmentAngle = 360 / PRIZE_SEGMENTS.length;
        // सटीक लक्ष्य कोण (सेगमेंट के केंद्र में रुकने के लिए)
        const targetAngle = 360 - (result.index * segmentAngle) + (segmentAngle / 2);

        // कुल रोटेशन डिग्री
        const finalRotation = currentRotation + (spinRounds * 360) + targetAngle;
        setCurrentRotation(finalRotation); // अगले स्पिन के लिए सहेजें

        // डिवाइस-विशिष्ट ब्लॉक सेट करें
        if (typeof window !== "undefined") {
            localStorage.setItem("device_last_played", Date.now().toString());
            document.cookie = `device_played=true; max-age=3600; path=/`;
        }

        const voucher = result.text !== "Better Luck" ? `BOM-${Date.now().toString().slice(-6)}` : null;

        // DB अपडेट करें
        try {
            const userRef = doc(db, "customer_points", phoneNumber);
            await setDoc(
                userRef,
                { lastPlayedAt: serverTimestamp(), lastPrizeWon: result.text, voucherCode: voucher, table: tableNo, voucherClaimed: false },
                { merge: true }
            );
        } catch (e) {
            console.error("Error saving game result:", e);
        }

        // एनीमेशन के अंत को संभालें
        setTimeout(() => {
            if (spinAudioRef.current) {
                spinAudioRef.current.pause();
                spinAudioRef.current = null;
            }
            setIsSpinning(false);
            
            if (result.text === "Better Luck") {
                playAudio("lose");
            } else {
                playAudio("win");
                triggerConfetti();
                setCouponCode(voucher);
                startTimer();
            }
            
            setTimeout(() => setShowResultModal(true), 500); // 500ms बाद परिणाम दिखाएं
        }, 5500); // CSS संक्रमण अवधि (5.5s) से मेल खाता है
    };

    const resetGame = () => {
        setIsLoggedIn(false);
        setName("");
        setPhoneNumber("");
        setCouponCode(null);
        setWonPrize(null);
        setTimerText(null);
        setShowResultModal(false);
        setCurrentRotation(0);
    };

    if (!isMounted) return null;

    // --- Render (Part 1) ---

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;900&display=swap');
                
                .main-container {
                    font-family: 'Poppins', sans-serif;
                    background-color: #0b0f19;
                    background-image: radial-gradient(circle at 50% -20%, #1e293b 0%, #0b0f19 100%);
                    color: #ffffff;
                    min-height: 100vh;
                    text-align: center;
                    padding: 20px 15px;
                    box-sizing: border-box;
                }

                .glass-card {
                    background: rgba(30, 41, 59, 0.6);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    padding: 25px;
                    width: 100%;
                    max-width: 400px;
                    margin: 0 auto;
                }

                .input-field {
                    width: 100%; box-sizing: border-box; padding: 16px; margin-bottom: 16px;
                    border-radius: 16px; border: 2px solid #334155; background-color: #0f172a;
                    color: #ffffff; font-size: 16px; font-weight: 600; text-align: center;
                    outline: none; transition: all 0.3s ease;
                }
                .input-field:focus { border-color: #38bdf8; box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.2); }
                .input-label { display: block; text-align: left; font-size: 13px; color: #94a3b8; margin-bottom: 8px; font-weight: 600; }

                .action-btn {
                    width: 100%; padding: 18px; border-radius: 16px; border: none;
                    font-size:
