"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import GameGuard from "@/components/GameGuard";

// 🌟 3D Packages Import
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const formatNameTitleCase = (text: string) => {
  return text.toLowerCase().split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};
const isValidIndianPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

// 🎡 स्पिन व्हील के इनाम (रेशियो के साथ)
const PRIZES = [
  { label: "Better Luck", points: 0, type: "none", color: "#ef4444" }, // 0: Red
  { label: "10 Coupon", points: 10, type: "points", color: "#eab308" }, // 1: Yellow
  { label: "Manchurian Half", points: 0, type: "food", color: "#3b82f6" }, // 2: Blue
  { label: "20 Coupon", points: 20, type: "points", color: "#22c55e" }, // 3: Green
  { label: "Manchurian Rice", points: 0, type: "food", color: "#f97316" }, // 4: Orange
  { label: "Sandwich", points: 0, type: "food", color: "#a855f7" }  // 5: Purple
];

// ==========================================
// 🎨 3D WHEEL COMPONENT (Real 3D Physics)
// ==========================================
function Wheel3D({ isSpinning, prizeIndex }: { isSpinning: boolean; prizeIndex: number }) {
  const wheelRef = useRef<THREE.Group>(null);
  const [startRot, setStartRot] = useState(0);
  const [targetRot, setTargetRot] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const duration = 4.5; // घूमने का समय (Seconds)

  useEffect(() => {
    if (isSpinning) {
      const spins = 5; // 5 बार पूरा घूमेगा
      const angle = (Math.PI * 2) / PRIZES.length;
      // सटीक टारगेट कैलकुलेशन (ताकि जो जीता है वही टॉप पर आकर रुके)
      const target = (spins * Math.PI * 2) + Math.PI - (prizeIndex * angle + angle / 2);
      
      setTargetRot(target);
      setTimeElapsed(0);
      setStartRot(wheelRef.current?.rotation.y || 0);
    }
  }, [isSpinning, prizeIndex]);

  useFrame((state, delta) => {
    if (isSpinning && wheelRef.current) {
      let newTime = timeElapsed + delta;
      if (newTime >= duration) newTime = duration;
      setTimeElapsed(newTime);

      const t = newTime / duration;
      // 🚀 स्मूथ एनिमेशन (घूमते हुए धीरे-धीरे रुकेगा)
      const easeOutQuart = 1 - Math.pow(1 - t, 4);

      wheelRef.current.rotation.y = startRot + (targetRot - startRot) * easeOutQuart;
    }
  });

  const angle = (Math.PI * 2) / PRIZES.length;

  return (
    <group>
      {/* 📍 Pointer (ऊपर का पीला काँटा) */}
      <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.3, 0.6, 32]} />
        <meshStandardMaterial color="#facc15" metalness={0.5} roughness={0.2} />
      </mesh>

      {/* 🎡 Main Wheel */}
      <group rotation={[Math.PI / 2, 0, 0]} ref={wheelRef}>
        {PRIZES.map((prize, idx) => (
          <group key={idx} rotation={[0, idx * angle, 0]}>
            {/* 3D Wedge (स्लाइस) */}
            <mesh>
              <cylinderGeometry args={[2.8, 2.8, 0.4, 32, 1, false, 0, angle]} />
              <meshStandardMaterial color={prize.color} metalness={0.1} roughness={0.5} />
            </mesh>
            
            {/* 3D Text (टेक्स्ट) */}
            <group rotation={[0, angle / 2, 0]}>
              <Text
                position={[0, 0.22, 1.8]} 
                rotation={[-Math.PI / 2, 0, Math.PI]} // टेक्स्ट बाहर की तरफ फेस करेगा
                fontSize={0.28}
                color="white"
                fontWeight="bold"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.015}
                outlineColor="#000"
              >
                {prize.label}
              </Text>
            </group>
          </group>
        ))}

        {/* 🔘 Wheel Center Pin (बीच का नट/बोल्ट) */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.2, 32]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.2, 32]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      </group>
    </group>
  );
}


// ==========================================
// 🎮 MAIN GAME PAGE
// ==========================================
export default function SpinGamePage() {
  const [step, setStep] = useState<"login" | "playing" | "gameover">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  
  const [tableNo, setTableNo] = useState<string>("सामान्य टेबल");
  const [isLoading, setIsLoading] = useState(false);
  
  // स्पिन व्हील स्टेट्स
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetPrizeIdx, setTargetPrizeIdx] = useState(0);
  const [wonPrize, setWonPrize] = useState<any>(null);
  const [voucherCode, setVoucherCode] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("table");
      setTableNo(t && /^[0-9]{1,2}$/.test(t) ? `टेबल नं: ${t}` : "सामान्य टेबल");
    }
  }, []);

  useEffect(() => {
    if (phone.length === 10) {
      getDoc(doc(db, "customer_points", phone)).then((snap) => {
        if (snap.exists() && snap.data().name) {
          setName(snap.data().name); 
        } else {
          setName("");
        }
      });
    }
  }, [phone]);

  const handleStartGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formatNameTitleCase(name.trim());
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    
    if (cleanName.length < 2) return toast.error("कृपया सही नाम दर्ज करें!");
    if (!isValidIndianPhone(cleanPhone)) return toast.error("सही 10-अंकों का नंबर डालें!");

    setIsLoading(true);
    
    const FORTY_MINUTES = 40 * 60 * 1000;
    const now = Date.now();

    const deviceLastPlayed = localStorage.getItem("spin_game_cooldown");
    if (deviceLastPlayed) {
      const elapsed = now - parseInt(deviceLastPlayed, 10);
      if (elapsed < FORTY_MINUTES) {
        setIsLoading(false);
        const minsLeft = Math.ceil((FORTY_MINUTES - elapsed) / 60000);
        return toast.error(`🚫 आप पहले ही खेल चुके हैं! कृपया ${minsLeft} मिनट प्रतीक्षा करें।`, { duration: 5000 });
      }
    }

    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.lastPlayedAt && typeof data.lastPlayedAt.toDate === 'function') {
          const lastPlayedTime = data.lastPlayedAt.toDate().getTime();
          const elapsedDb = now - lastPlayedTime;
          if (elapsedDb < FORTY_MINUTES) {
            setIsLoading(false);
            const minsLeft = Math.ceil((FORTY_MINUTES - elapsedDb) / 60000);
            return toast.error(`🚫 इस नंबर से पहले ही खेला जा चुका है! कृपया ${minsLeft} मिनट प्रतीक्षा करें।`, { duration: 5000 });
          }
        }
      }

      await setDoc(userRef, { 
        name: cleanName, 
        phone: cleanPhone, 
        table: tableNo,
        lastActive: serverTimestamp(),
        importSource: 'SpinGame'
      }, { merge: true });

      setName(cleanName);
      setPhone(cleanPhone);
      
      setStep("playing");
      toast.success("बेस्ट ऑफ़ लक! अपना इनाम स्पिन करें 🎡");

    } catch (err) {
      toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpinClick = () => {
    if (isSpinning) return;
    
    // 🎲 विनिंग रेशियो लॉजिक (Winning Ratio)
    const randomChance = Math.random() * 100;
    let pIndex = 0;

    if (randomChance < 70) pIndex = 0;      // 70% Better Luck
    else if (randomChance < 92) pIndex = 1; // 22% 10 कूपन
    else if (randomChance < 94) pIndex = 2; // 2% Manchurian Half
    else if (randomChance < 97) pIndex = 3; // 3% 20 कूपन
    else if (randomChance < 99) pIndex = 4; // 2% Manchurian Rice
    else pIndex = 5;                        // 1% Sandwich

    setTargetPrizeIdx(pIndex);
    setIsSpinning(true);

    // 4.5 सेकंड बाद गेम ओवर स्क्रीन दिखाएँ और डेटाबेस में सेव करें
    setTimeout(() => {
      savePrizeToDatabase(PRIZES[pIndex]);
    }, 4500); 
  };

  const savePrizeToDatabase = async (prize: any) => {
    try {
      const userRef = doc(db, "customer_points", phone);
      const userSnap = await getDoc(userRef);
      
      let prevGamePoints = 0; 
      let todayGamePoints = 0;
      const todayStr = new Date().toDateString(); 

      if (userSnap.exists()) {
        const data = userSnap.data();
        prevGamePoints = Number(data.gamePoints) || 0; 
        todayGamePoints = data.lastGameDate === todayStr ? (Number(data.todayGamePoints) || 0) : 0;
      }

      let finalPointsToAdd = 0;
      let generatedCode = "";
      let finalPrizeLabel = "Better Luck";
      let isWinner = false;

      if (prize.type === "points") {
        const remainingLimit = Math.max(0, 50 - todayGamePoints);
        finalPointsToAdd = Math.min(prize.points, remainingLimit);
        
        if (finalPointsToAdd > 0) {
          generatedCode = `BOM-${Math.floor(1000 + Math.random() * 9000)}`;
          finalPrizeLabel = `${finalPointsToAdd} कूपन`;
          isWinner = true;
        } else {
          finalPrizeLabel = "लिमिट ख़त्म (0 कूपन)";
        }
      } 
      else if (prize.type === "food") {
        generatedCode = `FOOD-${Math.floor(100 + Math.random() * 900)}`;
        finalPrizeLabel = prize.label;
        isWinner = true;
      }

      await setDoc(userRef, {
        gamePoints: prevGamePoints + finalPointsToAdd, 
        todayGamePoints: todayGamePoints + finalPointsToAdd,
        lastGameDate: todayStr,
        lastPrizeWon: finalPrizeLabel,
        voucherCode: generatedCode || null,
        voucherClaimed: false,
        lastPlayedAt: serverTimestamp() 
      }, { merge: true });

      setWonPrize({ ...prize, actualLabel: finalPrizeLabel, isWinner: isWinner });
      setVoucherCode(generatedCode);
      
      localStorage.setItem("spin_game_cooldown", Date.now().toString());

      setStep("gameover");
      setIsSpinning(false);

    } catch (err) {
      toast.error("इनाम सेव करने में समस्या आई।");
      setIsSpinning(false);
    }
  };

  return (
    <GameGuard allowedGameName="SpinGame">
      <div className="min-h-screen bg-[#0b0f19] text-white font-sans flex flex-col justify-center items-center overflow-hidden relative select-none">
        <Toaster position="top-center" />
        
        {/* ---------------- 1. LOGIN SCREEN ---------------- */}
        {step === "login" && (
          <div className="w-full max-w-sm px-4 z-10 py-6 overflow-y-auto max-h-[100dvh]">
            <div className="mb-6 text-center">
              <h1 className="text-4xl font-black text-purple-500 drop-shadow-md tracking-wider">3D Spin & Win 🎡</h1>
              <p className="text-sm font-bold text-neutral-400 mt-1">बम बम कैफे, मोहंद्रा</p>
            </div>

            <div className="bg-[#1e293b] p-6 rounded-3xl border border-[#334155] shadow-2xl text-center space-y-4">
              <p className="text-xs text-neutral-300 font-bold leading-relaxed bg-black/30 p-3 rounded-xl border border-neutral-700 text-left">
                3D व्हील घुमाएं और अपनी किस्मत आजमाएं!<br/>
                <span className="text-purple-400 block mt-2 text-center text-sm font-black">
                  कूपन और टेस्टी फूड जीतने का मौका! 🍕🥪
                </span>
              </p>
              
              <form onSubmit={handleStartGame} className="space-y-4 pt-2">
                <input type="tel" maxLength={10} placeholder="10-अंकों का मोबाइल नंबर" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} required className="w-full bg-[#0f172a] border-2 border-purple-500 text-center py-3 rounded-xl outline-none text-white focus:border-purple-400 font-mono" />
                <input type="text" placeholder="आपका नाम" value={name} onChange={(e) => setName(formatNameTitleCase(e.target.value))} required className="w-full bg-[#0f172a] border-2 border-purple-500 text-center py-3 rounded-xl outline-none text-white focus:border-purple-400 font-bold" />
                
                <button type="submit" disabled={isLoading} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black text-sm rounded-xl uppercase tracking-wider shadow-lg disabled:opacity-50 mt-4 transition-transform active:scale-95">
                  {isLoading ? "प्रतीक्षा करें..." : "▶ व्हील के पास जाएँ"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ---------------- 2. PLAYING SCREEN (3D Wheel) ---------------- */}
        {step === "playing" && (
          <div className="w-full flex flex-col items-center justify-center h-[100dvh] px-4 relative">
            <h2 className="text-3xl font-black text-purple-400 absolute top-10 z-10 uppercase tracking-widest text-center">
              Spin To Win
            </h2>

            {/* 🌟 3D Canvas Area */}
            <div className="w-full h-[500px] max-h-[70vh] relative z-0">
              <Canvas camera={{ position: [0, 0, 7.5], fov: 60 }}>
                {/* 💡 3D लाइटिंग */}
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 10, 5]} intensity={1.5} />
                <pointLight position={[-5, -5, -5]} intensity={0.5} />
                
                {/* 🎡 व्हील रेंडर */}
                <Wheel3D isSpinning={isSpinning} prizeIndex={targetPrizeIdx} />
              </Canvas>
            </div>

            <div className="absolute bottom-20 z-10 flex flex-col items-center">
              <button 
                onClick={handleSpinClick}
                disabled={isSpinning}
                className="w-40 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-[0_0_20px_rgba(168,85,247,0.5)] border-2 border-purple-400 disabled:opacity-50 transform hover:scale-105 active:scale-95 transition-all"
              >
                {isSpinning ? "SPINNING..." : "SPIN NOW"}
              </button>
              <p className="mt-4 text-xs text-neutral-400 font-bold uppercase tracking-widest text-center animate-pulse">
                {isSpinning ? "इंतजार करें..." : "बटन दबाएं और इनाम पाएं!"}
              </p>
            </div>
          </div>
        )}

        {/* ---------------- 3. GAME OVER SCREEN ---------------- */}
        {step === "gameover" && wonPrize && (
          <div className="bg-[#1e293b] p-8 rounded-3xl w-full max-w-sm border border-[#334155] shadow-2xl text-center space-y-6 z-10 mx-4 relative">
            <div className="text-6xl absolute -top-8 left-1/2 -translate-x-1/2">
              {wonPrize.isWinner ? (wonPrize.type === "food" ? '🍔' : '🎉') : '💥'}
            </div>
            
            <h2 className="text-3xl font-black uppercase text-purple-400 tracking-wider pt-6">Result</h2>
            
            <div className="bg-[#0f172a] p-5 rounded-2xl border border-[#334155] space-y-2 shadow-inner">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">You Won</p>
              <p className="text-3xl font-black mt-2 leading-tight drop-shadow-md" style={{ color: wonPrize.color }}>
                {wonPrize.actualLabel}
              </p>
            </div>

            {wonPrize.isWinner ? (
              <div className="bg-green-900/20 border border-green-500/30 p-5 rounded-2xl space-y-3">
                <p className="text-xs text-green-400 font-bold">
                  बिल बनवाते समय कैशियर को यह कोड दिखाएं:
                </p>
                <div className="bg-white text-black font-mono font-black text-2xl py-2 rounded-xl border-2 border-green-500 tracking-widest shadow-lg">
                  {voucherCode}
                </div>
                <p className="text-[10px] text-neutral-400">
                  (यह कोड आपके मोबाइल नंबर {phone} पर भी लिंक हो गया है।)
                </p>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-500/30 p-5 rounded-2xl">
                 <p className="text-sm font-black text-red-400">Better Luck Next Time! 😔</p>
                 <p className="text-xs text-neutral-400 mt-2">
                   कोई बात नहीं, 40 मिनट बाद फिर से ट्राई करें!
                 </p>
              </div>
            )}
          </div>
        )}
      </div>
    </GameGuard>
  );
}
