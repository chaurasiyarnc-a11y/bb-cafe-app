"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import GameGuard from "@/components/GameGuard";
import confetti from "canvas-confetti"; 
import { motion, AnimatePresence } from "framer-motion"; 

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

// 🎵 AUDIO SYSTEM (साउंड इफेक्ट्स के लिए)
let globalAudioCtx: AudioContext | null = null;
const initAudio = () => {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
};

const playSound = (type: 'tick' | 'win' | 'lose') => {
  if (!globalAudioCtx) return;
  const osc = globalAudioCtx.createOscillator();
  const gain = globalAudioCtx.createGain();
  osc.connect(gain);
  gain.connect(globalAudioCtx.destination);

  if (type === 'tick') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, globalAudioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, globalAudioCtx.currentTime);
    osc.start(); osc.stop(globalAudioCtx.currentTime + 0.05);
  } else if (type === 'win') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, globalAudioCtx.currentTime);
    osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime + 0.2);
    osc.frequency.setValueAtTime(1000, globalAudioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
    osc.start(); osc.stop(globalAudioCtx.currentTime + 0.8);
  } else if (type === 'lose') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, globalAudioCtx.currentTime);
    osc.frequency.setValueAtTime(150, globalAudioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
    osc.start(); osc.stop(globalAudioCtx.currentTime + 0.5);
  }
};

// ==========================================
// 🎨 3D WHEEL COMPONENT
// ==========================================
function Wheel3D({ isSpinning, prizeIndex }: { isSpinning: boolean; prizeIndex: number }) {
  const wheelRef = useRef<THREE.Group>(null);
  const [startRot, setStartRot] = useState(0);
  const [targetRot, setTargetRot] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const duration = 5.0; 
  const lastTickAngle = useRef(0);

  useEffect(() => {
    if (isSpinning) {
      const spins = 6; 
      const angle = (Math.PI * 2) / PRIZES.length;
      const target = (spins * Math.PI * 2) + Math.PI - (prizeIndex * angle + angle / 2);
      
      setTargetRot(target);
      setTimeElapsed(0);
      setStartRot(wheelRef.current?.rotation.y || 0);
      lastTickAngle.current = wheelRef.current?.rotation.y || 0;
    }
  }, [isSpinning, prizeIndex]);

  useFrame((state, delta) => {
    if (isSpinning && wheelRef.current) {
      let newTime = timeElapsed + delta;
      if (newTime >= duration) newTime = duration;
      setTimeElapsed(newTime);

      const t = newTime / duration;
      const easeOutQuart = 1 - Math.pow(1 - t, 4); 
      const currentRot = startRot + (targetRot - startRot) * easeOutQuart;
      
      wheelRef.current.rotation.y = currentRot;

      const anglePerSlice = (Math.PI * 2) / PRIZES.length;
      if (Math.abs(currentRot - lastTickAngle.current) >= anglePerSlice) {
        playSound('tick');
        lastTickAngle.current = currentRot;
      }
    }
  });

  const angle = (Math.PI * 2) / PRIZES.length;

  return (
    <group>
      {/* 📍 Pointer (Glowing Neon Pointer) */}
      <mesh position={[0, 3.4, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.35, 0.8, 4]} />
        <meshStandardMaterial color="#fcd34d" emissive="#d97706" emissiveIntensity={1} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 🎡 Main Wheel */}
      <group rotation={[Math.PI / 2, 0, 0]} ref={wheelRef}>
        
        {/* 💍 Golden Outer Ring */}
        <mesh position={[0, 0.1, 0]}>
          <torusGeometry args={[2.9, 0.15, 32, 100]} />
          <meshStandardMaterial color="#fbbf24" emissive="#b45309" emissiveIntensity={0.4} metalness={0.9} roughness={0.1} />
        </mesh>

        {/* 🍕 Slices */}
        {PRIZES.map((prize, idx) => (
          <group key={idx} rotation={[0, idx * angle, 0]}>
            <mesh>
              <cylinderGeometry args={[2.8, 2.8, 0.3, 32, 1, false, 0, angle]} />
              <meshStandardMaterial color={prize.color} metalness={0.2} roughness={0.4} />
            </mesh>
            
            <group rotation={[0, angle / 2, 0]}>
              <Text
                position={[0, 0.16, 1.8]} 
                rotation={[-Math.PI / 2, 0, Math.PI]} 
                fontSize={0.28}
                color="white"
                fontWeight="black"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000"
              >
                {prize.label}
              </Text>
            </group>
          </group>
        ))}

        {/* 🔘 Center Pin */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
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
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetPrizeIdx, setTargetPrizeIdx] = useState(0);
  const [wonPrize, setWonPrize] = useState<any>(null);
  const [voucherCode, setVoucherCode] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("table");
      setTableNo(t && /^[0-9]{1,2}$/.test(t) ? `Table: ${t}` : "Walk-in");
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
    initAudio(); 
    playSound('tick');

    const cleanName = formatNameTitleCase(name.trim());
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    
    if (cleanName.length < 2) return toast.error("कृपया सही नाम दर्ज करें!");
    if (!isValidIndianPhone(cleanPhone)) return toast.error("सही 10-अंकों का नंबर डालें!");

    setIsLoading(true);
    
    const FORTY_MINUTES = 40 * 60 * 1000;
    const now = Date.now();

    // 1. डिवाइस लेवल चेक (LocalStorage + Cookies Fallback for Safari)
    const getDeviceCooldown = () => {
      try {
        let ls = localStorage.getItem("spin_game_cooldown");
        if (ls) return parseInt(ls, 10);
      } catch(e) {} 
      let match = document.cookie.match(new RegExp('(^| )spin_game_cooldown=([^;]+)'));
      if (match) return parseInt(match[2], 10);
      return null;
    };

    const deviceLastPlayed = getDeviceCooldown();
    if (deviceLastPlayed) {
      const elapsed = now - deviceLastPlayed;
      if (elapsed < FORTY_MINUTES) {
        setIsLoading(false);
        const minsLeft = Math.ceil((FORTY_MINUTES - elapsed) / 60000);
        return toast.error(`🚫 आप पहले ही खेल चुके हैं! कृपया ${minsLeft} मिनट प्रतीक्षा करें।`, { icon: '⏳' });
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
            return toast.error(`🚫 इस नंबर से पहले ही खेला जा चुका है! कृपया ${minsLeft} मिनट प्रतीक्षा करें।`, { icon: '⏳' });
          }
        }
      }

      // 👉 गेम स्टार्ट करते ही डिवाइस और मोबाइल नंबर दोनों को तुरंत 40 मिनट के लिए लॉक कर दें
      try {
        localStorage.setItem("spin_game_cooldown", now.toString());
      } catch(e) {}
      document.cookie = `spin_game_cooldown=${now}; max-age=${40 * 60}; path=/`; 

      await setDoc(userRef, { 
        name: cleanName, 
        phone: cleanPhone, 
        table: tableNo,
        lastActive: serverTimestamp(),
        lastPlayedAt: serverTimestamp(), // 👉 यहाँ तुरंत नंबर लॉक हो जाएगा
        importSource: 'SpinGame'
      }, { merge: true });

      setName(cleanName);
      setPhone(cleanPhone);
      setStep("playing");
      toast.success("Ready to Spin! 🎰", { icon: '✨' });

    } catch (err) {
      toast.error("सर्वर त्रुटि! पुनः प्रयास करें।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpinClick = () => {
    if (isSpinning) return;
    initAudio(); 
    playSound('win'); 
    
    // 🎲 विनिंग रेशियो लॉजिक (New Winning Ratio)
    const randomChance = Math.random() * 100;
    let pIndex = 0;

    if (randomChance < 70) pIndex = 0;      // 70% Better Luck
    else if (randomChance < 92) pIndex = 1; // 22% 10 Coupon
    else if (randomChance < 94) pIndex = 2; // 2% Manchurian Half
    else if (randomChance < 97) pIndex = 3; // 3% 20 Coupon
    else if (randomChance < 99) pIndex = 4; // 2% Manchurian Rice
    else pIndex = 5;                        // 1% Sandwich

    setTargetPrizeIdx(pIndex);
    setIsSpinning(true);

    setTimeout(() => {
      savePrizeToDatabase(PRIZES[pIndex]);
    }, 5000); 
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
      
      try {
        localStorage.setItem("spin_game_cooldown", Date.now().toString());
      } catch(e) {}
      document.cookie = `spin_game_cooldown=${Date.now()}; max-age=${40 * 60}; path=/`;

      // 🎉 Celebration Effects
      if (isWinner) {
        playSound('win');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#a855f7', '#fbbf24', '#22c55e'] });
      } else {
        playSound('lose');
      }

      setStep("gameover");
      setIsSpinning(false);

    } catch (err) {
      toast.error("इनाम सेव करने में समस्या आई।");
      setIsSpinning(false);
    }
  };

  return (
    <GameGuard allowedGameName="SpinGame">
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#0b0f19] to-black text-white font-sans flex flex-col justify-center items-center overflow-hidden relative select-none">
        
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        
        <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
        
        <AnimatePresence mode="wait">
          {/* ---------------- 1. LOGIN SCREEN ---------------- */}
          {step === "login" && (
            <motion.div 
              key="login"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm px-4 z-10 py-6"
            >
              <div className="mb-8 text-center">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] tracking-wider pb-1">
                  SPIN & WIN
                </h1>
                <p className="text-sm font-bold text-indigo-300 mt-2 tracking-widest uppercase shadow-black drop-shadow-md">Bum Bum Cafe Exclusive</p>
              </div>

              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] text-center space-y-5">
                <p className="text-xs text-neutral-200 font-bold leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10 text-left shadow-inner">
                  ✨ 3D व्हील घुमाएं और शानदार इनाम जीतें!<br/>
                  <span className="text-yellow-400 block mt-2 text-center text-sm font-black drop-shadow-md">
                    कूपन और टेस्टी फूड जीतने का मौका! 🍕🥪
                  </span>
                </p>
                
                <form onSubmit={handleStartGame} className="space-y-4 pt-2">
                  <input type="tel" maxLength={10} placeholder="📱 मोबाइल नंबर" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} required className="w-full bg-black/40 border-2 border-indigo-500/50 text-center py-3.5 rounded-xl outline-none text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 font-mono transition-all shadow-inner placeholder:text-neutral-500" />
                  <input type="text" placeholder="👤 आपका नाम" value={name} onChange={(e) => setName(formatNameTitleCase(e.target.value))} required className="w-full bg-black/40 border-2 border-indigo-500/50 text-center py-3.5 rounded-xl outline-none text-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 font-bold transition-all shadow-inner placeholder:text-neutral-500" />
                  
                  <button type="submit" disabled={isLoading} className="w-full py-4 mt-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-50 transition-all bg-gradient-to-b from-yellow-300 to-yellow-600 text-black border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 hover:brightness-110">
                    {isLoading ? "प्रतीक्षा करें..." : "▶ Play Now"}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ---------------- 2. PLAYING SCREEN ---------------- */}
          {step === "playing" && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center justify-center h-[100dvh] px-4 relative"
            >
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 absolute top-10 z-10 uppercase tracking-widest text-center drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]">
                Spin To Win
              </h2>

              <div className="w-full h-[500px] max-h-[70vh] relative z-0">
                <Canvas camera={{ position: [0, 0, 7.5], fov: 60 }}>
                  <ambientLight intensity={0.9} />
                  <directionalLight position={[5, 10, 5]} intensity={1.5} />
                  <pointLight position={[-5, -5, 5]} intensity={1} color="#a855f7" />
                  <Wheel3D isSpinning={isSpinning} prizeIndex={targetPrizeIdx} />
                </Canvas>
              </div>

              <div className="absolute bottom-16 z-10 flex flex-col items-center">
                <button 
                  onClick={handleSpinClick}
                  disabled={isSpinning}
                  className="px-10 py-4 rounded-full font-black text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(234,179,8,0.5)] disabled:opacity-50 transition-all bg-gradient-to-b from-yellow-300 to-yellow-600 text-black border-b-[6px] border-yellow-800 active:border-b-0 active:translate-y-[6px] hover:brightness-110"
                >
                  {isSpinning ? "SPINNING..." : "SPIN NOW"}
                </button>
                <p className={`mt-6 text-xs font-bold uppercase tracking-widest text-center transition-all ${isSpinning ? 'text-yellow-400 animate-pulse' : 'text-neutral-400'}`}>
                  {isSpinning ? "इंतजार करें..." : "बटन दबाएं और इनाम पाएं!"}
                </p>
              </div>
            </motion.div>
          )}

          {/* ---------------- 3. GAME OVER SCREEN ---------------- */}
          {step === "gameover" && wonPrize && (
            <motion.div 
              key="gameover"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl w-full max-w-sm border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center space-y-6 z-10 mx-4 relative"
            >
              <div className="text-7xl absolute -top-10 left-1/2 -translate-x-1/2 drop-shadow-2xl">
                {wonPrize.isWinner ? (wonPrize.type === "food" ? '🍔' : '🎟️') : '💥'}
              </div>
              
              <h2 className="text-3xl font-black uppercase text-yellow-400 tracking-wider pt-6 drop-shadow-md">Result</h2>
              
              <div className="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-2 shadow-inner">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">You Won</p>
                <p className="text-3xl font-black mt-2 leading-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ color: wonPrize.isWinner ? wonPrize.color : '#ef4444' }}>
                  {wonPrize.actualLabel}
                </p>
              </div>

              {wonPrize.isWinner ? (
                <div className="bg-green-500/10 border border-green-400/40 p-5 rounded-2xl space-y-3 backdrop-blur-sm">
                  <p className="text-xs text-green-300 font-bold">
                    बिल बनवाते समय कैशियर को यह कोड दिखाएं:
                  </p>
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-black font-mono font-black text-2xl py-2 rounded-xl tracking-widest shadow-lg">
                    {voucherCode}
                  </div>
                  <p className="text-[10px] text-neutral-300">
                    (यह कोड आपके मोबाइल नंबर <span className="font-mono text-white">{phone}</span> पर भी सेव हो गया है।)
                  </p>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-2xl backdrop-blur-sm">
                   <p className="text-sm font-black text-red-400">Better Luck Next Time! 😔</p>
                   <p className="text-xs text-neutral-400 mt-2">
                     कोई बात नहीं, 40 मिनट बाद फिर से ट्राई करें!
                   </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameGuard>
  );
}
