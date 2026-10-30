'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, VolumeX, Sparkles, User, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number;
  color: PlayerColor;
  slotIndex: number; // 0, 1, 2, 3
  step: number; // -1 = Base, 0 to 50 = Main Track, 51 to 55 = Home Runway, 56 = Home (Finished)
}

// 15x15 Ludo Board का सटीक 52 मेन-ट्रैक कोऑर्डिनेट्स [row, col] (0-indexed)
const BOARD_PATH: [number, number][] = [
  // Red side start & up
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], // Top junction
  // Green side down
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], // Right junction
  // Yellow side left
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], // Bottom junction
  // Blue side up
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], // Left junction
  [6, 0]  // Red entrance
];

const START_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// 4 रंगों के Home Runways (जीत की ओर जाने वाले 5 खाने)
const HOME_RUNWAYS: Record<PlayerColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

// 4 घरों (Bases) के अंदर 4 गोल खानों की सटीक जगह
const BASE_POCKETS: Record<PlayerColor, [number, number][]> = {
  red: [[2, 2], [2, 3], [3, 2], [3, 3]],
  green: [[2, 11], [2, 12], [3, 11], [3, 12]],
  yellow: [[11, 11], [11, 12], [12, 11], [12, 12]],
  blue: [[11, 2], [11, 3], [12, 2], [12, 3]]
};

// सुरक्षित खाने (Stars)
const STAR_COORDS: [number, number][] = [
  [6, 1], [2, 6], [1, 8], [6, 12], [8, 13], [12, 8], [13, 6], [8, 2]
];

const COLOR_THEMES: Record<PlayerColor, { name: string; bg: string; border: string; hex: string; text: string }> = {
  red: { name: 'Red', bg: 'bg-rose-500', border: 'border-rose-600', hex: '#e11d48', text: 'text-rose-500' },
  green: { name: 'Green', bg: 'bg-emerald-500', border: 'border-emerald-600', hex: '#10b981', text: 'text-emerald-500' },
  yellow: { name: 'Yellow', bg: 'bg-amber-400', border: 'border-amber-500', hex: '#fbbf24', text: 'text-amber-400' },
  blue: { name: 'Blue', bg: 'bg-sky-500', border: 'border-sky-600', hex: '#0284c7', text: 'text-sky-500' }
};

const PLAYERS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export default function PerfectLudo() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [dice, setDice] = useState<number>(6);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [winner, setWinner] = useState<PlayerColor | null>(null);

  // क्लेम रिवॉर्ड स्टेट्स
  const [claimedPhone, setClaimedPhone] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [savingReward, setSavingReward] = useState(false);

  // 16 टोकन (हर रंग के 4)
  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, color: 'red', slotIndex: 0, step: -1 },
    { id: 2, color: 'red', slotIndex: 1, step: -1 },
    { id: 3, color: 'red', slotIndex: 2, step: -1 },
    { id: 4, color: 'red', slotIndex: 3, step: -1 },
    { id: 5, color: 'green', slotIndex: 0, step: -1 },
    { id: 6, color: 'green', slotIndex: 1, step: -1 },
    { id: 7, color: 'green', slotIndex: 2, step: -1 },
    { id: 8, color: 'green', slotIndex: 3, step: -1 },
    { id: 9, color: 'yellow', slotIndex: 0, step: -1 },
    { id: 10, color: 'yellow', slotIndex: 1, step: -1 },
    { id: 11, color: 'yellow', slotIndex: 2, step: -1 },
    { id: 12, color: 'yellow', slotIndex: 3, step: -1 },
    { id: 13, color: 'blue', slotIndex: 0, step: -1 },
    { id: 14, color: 'blue', slotIndex: 1, step: -1 },
    { id: 15, color: 'blue', slotIndex: 2, step: -1 },
    { id: 16, color: 'blue', slotIndex: 3, step: -1 }
  ]);

  const currentColor = PLAYERS[activeIdx];

  // साउंड इफ़ेक्ट्स जनरेटर (Web Audio API - बिना किसी बाहरी mp3 के)
  const playSfx = (type: 'roll' | 'step' | 'cut' | 'win') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'roll') {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'step') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'cut') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(250, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  // डाइस रोल लॉजिक
  const handleRollDice = () => {
    if (rolling || hasRolled || winner) return;

    setRolling(true);
    playSfx('roll');

    let counter = 0;
    const timer = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      counter++;
      if (counter > 10) {
        clearInterval(timer);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDice(finalVal);
        setRolling(false);
        setHasRolled(true);
        evaluateMoves(finalVal);
      }
    }, 45);
  };

  // ऑटो चेक: क्या खिलाड़ी चल सकता है?
  const evaluateMoves = (roll: number) => {
    const myTokens = tokens.filter(t => t.color === currentColor);
    const movable = myTokens.filter(t => {
      if (t.step === -1 && roll === 6) return true;
      if (t.step >= 0 && t.step + roll <= 56) return true;
      return false;
    });

    if (movable.length === 0) {
      toast('कोई चाल संभव नहीं! ⏭️', { duration: 1200 });
      setTimeout(() => nextPlayer(false), 1000);
    } else if (movable.length === 1 && movable[0].step === -1 && roll === 6) {
      // अगर सिर्फ एक गोटी बेस में है और 6 आया, तो तुरंत बाहर निकालें
      setTimeout(() => handleMoveToken(movable[0], roll), 400);
    }
  };

  // गोटी मूव करने का कोर लॉजिक
  const handleMoveToken = (token: Token, rollValue: number = dice) => {
    if (!hasRolled || token.color !== currentColor || winner) return;

    let targetStep = token.step;

    if (token.step === -1) {
      if (rollValue === 6) targetStep = 0;
      else return toast.error("बाहर निकलने के लिए 6 चाहिए!");
    } else {
      if (token.step + rollValue > 56) {
        return toast.error("होम पहुंचने के लिए सही अंक चाहिए!");
      }
      targetStep = token.step + rollValue;
    }

    playSfx('step');

    // ग्लोबल पोजीशन की गणना
    const getBoardPos = (c: PlayerColor, s: number) => {
      if (s < 0 || s >= 51) return -1;
      return (START_OFFSETS[c] + s) % 52;
    };

    let updated = tokens.map(t => t.id === token.id ? { ...t, step: targetStep } : t);

    // ⚔️ गोटी काटना
    const currentGlobal = getBoardPos(currentColor, targetStep);
    let captured = false;

    if (currentGlobal !== -1) {
      const safeIndices = [0, 8, 13, 21, 26, 34, 39, 47];
      if (!safeIndices.includes(currentGlobal)) {
        updated = updated.map(t => {
          if (t.color !== currentColor && t.step >= 0 && t.step < 51) {
            if (getBoardPos(t.color, t.step) === currentGlobal) {
              captured = true;
              playSfx('cut');
              toast.success(`💥 ${currentColor.toUpperCase()} ने ${t.color.toUpperCase()} को काटा!`);
              return { ...t, step: -1 };
            }
          }
          return t;
        });
      }
    }

    setTokens(updated);
    setHasRolled(false);

    // जीत की जांच
    const homeCount = updated.filter(t => t.color === currentColor && t.step === 56).length;
    if (homeCount === 4) {
      setWinner(currentColor);
      const code = `BOM-LUDO-${Math.floor(1000 + Math.random() * 9000)}`;
      setVoucherCode(code);
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
      toast.success(`👑 बधाई! ${currentColor.toUpperCase()} जीत गया!`);
      return;
    }

    // 6 आने पर या गोटी काटने पर दोबारा चाल
    if (rollValue === 6 || captured) {
      toast(rollValue === 6 ? '6 आया! फिर से चलें 🎯' : 'गोटी काटी! बोनस चाल ⚔️', { duration: 1500 });
    } else {
      nextPlayer(false);
    }
  };

  const nextPlayer = (extra = false) => {
    setHasRolled(false);
    if (!extra) {
      setActiveIdx(prev => (prev + 1) % 4);
    }
  };

  const handleClaimReward = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = claimedPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) return toast.error("10-अंकों का वैध मोबाइल नंबर डालें!");

    setSavingReward(true);
    try {
      await setDoc(doc(db, "customer_points", clean), {
        phone: clean,
        lastPrizeWon: "1x Free Cold Coffee / 20% OFF (Ludo Winner)",
        voucherCode: voucherCode,
        voucherClaimed: false,
        lastPlayedAt: new Date(),
        importSource: 'LudoGame'
      }, { merge: true });

      toast.success("🎉 इनाम आपके नंबर पर लॉक हो गया! काउंटर पर नंबर बताएं।");
    } catch (e) {
      toast.error("इनाम सेव करने में त्रुटि आई!");
    } finally {
      setSavingReward(false);
    }
  };

  // ग्रिड कोऑर्डिनेट हेल्पर
  const getTokenCoords = (t: Token): [number, number] => {
    if (t.step === -1) {
      return BASE_POCKETS[t.color][t.slotIndex];
    }
    if (t.step >= 0 && t.step < 51) {
      const idx = (START_OFFSETS[t.color] + t.step) % 52;
      return BOARD_PATH[idx];
    }
    if (t.step >= 51 && t.step < 56) {
      return HOME_RUNWAYS[t.color][t.step - 51];
    }
    return [7, 7]; // Center Home
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col justify-between items-center p-3 select-none font-sans">
      <Toaster position="top-center" />

      {/* HEADER */}
      <header className="w-full max-w-xl flex justify-between items-center py-2 px-3 border-b border-white/10 shrink-0">
        <button onClick={() => window.history.back()} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500">
            BUM BUM CAFE LUDO
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Classic Cafe Arena</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={() => { setTokens(tokens.map(t => ({ ...t, step: -1 }))); setWinner(null); setHasRolled(false); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* 4 PLAYERS TOP HUD */}
      <div className="w-full max-w-md grid grid-cols-4 gap-2 my-2 shrink-0">
        {PLAYERS.map((col, idx) => {
          const isActive = idx === activeIdx;
          const theme = COLOR_THEMES[col];
          const finished = tokens.filter(t => t.color === col && t.step === 56).length;

          return (
            <div
              key={col}
              className={`p-2 rounded-2xl border text-center transition-all ${
                isActive
                  ? `${theme.bg} text-white border-white shadow-lg scale-105 ring-2 ring-white/50`
                  : 'bg-white/5 border-white/10 text-neutral-400 opacity-60'
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider">{theme.name}</p>
              <p className="text-xs font-mono font-bold mt-0.5">{finished}/4 In</p>
            </div>
          );
        })}
      </div>

      {/* WINNER MODAL */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-amber-400/20 text-amber-400 rounded-full mx-auto flex items-center justify-center">
                <Trophy size={36} />
              </div>
              <h2 className="text-2xl font-black uppercase text-amber-400">{COLOR_THEMES[winner].name} WINS!</h2>
              <p className="text-xs text-neutral-300 font-bold">🎉 बधाई हो! आपको कैफ़े से मुफ़्त इनाम मिलता है।</p>
              
              <div className="bg-white/5 border border-amber-400/30 p-3 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-neutral-400">Voucher Code:</p>
                <p className="text-xl font-mono font-black text-amber-400 tracking-wider mt-1">{voucherCode}</p>
              </div>

              <form onSubmit={handleClaimReward} className="space-y-3 pt-2">
                <input 
                  type="tel" 
                  maxLength={10} 
                  required 
                  placeholder="अपना 10-अंकों का फ़ोन नंबर डालें" 
                  value={claimedPhone} 
                  onChange={e => setClaimedPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black/60 border border-neutral-700 rounded-xl px-3 py-2.5 text-center text-sm font-mono font-bold text-white outline-none focus:border-amber-400"
                />
                <button type="submit" disabled={savingReward} className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all">
                  {savingReward ? 'सेव हो रहा है...' : 'इनाम लॉक करें (Claim Reward)'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎯 15×15 PERFECT SVG / CSS GRID LUDO BOARD */}
      <div className="w-full max-w-[420px] aspect-square bg-[#fff] border-[6px] border-[#20222a] rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.9)] relative overflow-hidden my-auto p-1">
        
        {/* CSS GRID CELLS (15x15 = 225 Cells) */}
        <div className="w-full h-full grid grid-cols-15 grid-rows-15">
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              // 4 कोनों के बड़े रंगीन घर (Bases)
              if (r < 6 && c < 6) return null; // Red Base Area
              if (r < 6 && c > 8) return null; // Green Base Area
              if (r > 8 && c > 8) return null; // Yellow Base Area
              if (r > 8 && c < 6) return null; // Blue Base Area

              // सेंटर होम ज़ोन
              if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return null;

              // रंगीन Home Runways
              const isRedRunway = r === 7 && c >= 1 && c <= 5;
              const isGreenRunway = c === 7 && r >= 1 && r <= 5;
              const isYellowRunway = r === 7 && c >= 9 && c <= 13;
              const isBlueRunway = c === 7 && r >= 9 && r <= 13;

              // शुरुआती खाने (Start Boxes)
              const isRedStart = r === 6 && c === 1;
              const isGreenStart = r === 1 && c === 8;
              const isYellowStart = r === 8 && c === 13;
              const isBlueStart = r === 13 && c === 6;

              const isStar = STAR_COORDS.some(([sr, sc]) => sr === r && sc === c);

              let bg = 'bg-white';
              if (isRedRunway || isRedStart) bg = 'bg-rose-500';
              if (isGreenRunway || isGreenStart) bg = 'bg-emerald-500';
              if (isYellowRunway || isYellowStart) bg = 'bg-amber-400';
              if (isBlueRunway || isBlueStart) bg = 'bg-sky-500';

              return (
                <div
                  key={`${r}-${c}`}
                  style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
                  className={`border-[0.5px] border-neutral-300 relative flex items-center justify-center ${bg}`}
                >
                  {isStar && (
                    <span className={`text-[11px] font-black ${bg === 'bg-white' ? 'text-neutral-400' : 'text-white'}`}>
                      ★
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 4 SOLID BASES WITH WHITE POCKET PLATES */}
        {/* RED BASE */}
        <div className="absolute top-1 left-1 w-[40%] h-[40%] bg-rose-500 rounded-2xl p-2.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center" />)}
          </div>
        </div>

        {/* GREEN BASE */}
        <div className="absolute top-1 right-1 w-[40%] h-[40%] bg-emerald-500 rounded-2xl p-2.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center" />)}
          </div>
        </div>

        {/* YELLOW BASE */}
        <div className="absolute bottom-1 right-1 w-[40%] h-[40%] bg-amber-400 rounded-2xl p-2.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center" />)}
          </div>
        </div>

        {/* BLUE BASE */}
        <div className="absolute bottom-1 left-1 w-[40%] h-[40%] bg-sky-500 rounded-2xl p-2.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center" />)}
          </div>
        </div>

        {/* 🏆 CENTER TRIANGLES (HOME) */}
        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="0,0 50,50 0,100" fill="#e11d48" />
            <polygon points="0,0 50,50 100,0" fill="#10b981" />
            <polygon points="100,0 50,50 100,100" fill="#fbbf24" />
            <polygon points="0,100 50,50 100,100" fill="#0284c7" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Trophy size={18} className="text-white drop-shadow-md" />
          </div>
        </div>

        {/* ♟️ 16 DYNAMIC 3D TOKENS (PIECES) */}
        {tokens.map(token => {
          const [r, c] = getTokenCoords(token);
          const isMyTurn = token.color === currentColor;
          const canMove = hasRolled && isMyTurn && ((token.step === -1 && dice === 6) || (token.step >= 0 && token.step + dice <= 56));

          return (
            <motion.div
              key={token.id}
              layout
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              style={{
                top: `${(r / 15) * 100}%`,
                left: `${(c / 15) * 100}%`,
                width: `${100 / 15}%`,
                height: `${100 / 15}%`
              }}
              onClick={() => handleMoveToken(token)}
              className="absolute z-30 flex items-center justify-center p-0.5 cursor-pointer"
            >
              <motion.div
                animate={canMove ? { scale: [1, 1.25, 1], y: [0, -4, 0] } : { scale: 1 }}
                transition={canMove ? { repeat: Infinity, duration: 0.6 } : {}}
                className={`w-full h-full rounded-full border-2 border-white shadow-[0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center relative ${
                  token.color === 'red' ? 'bg-gradient-to-tr from-rose-700 to-rose-400' :
                  token.color === 'green' ? 'bg-gradient-to-tr from-emerald-700 to-emerald-400' :
                  token.color === 'yellow' ? 'bg-gradient-to-tr from-amber-600 to-amber-300' :
                  'bg-gradient-to-tr from-sky-700 to-sky-400'
                } ${canMove ? 'ring-2 ring-white shadow-[0_0_12px_#fff]' : ''}`}
              >
                {/* 3D Inner Cap */}
                <div className="w-[50%] h-[50%] rounded-full bg-white/40 shadow-inner" />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* FOOTER CONTROLS & 3D DICE */}
      <footer className="w-full max-w-md bg-neutral-900/90 border border-white/10 rounded-3xl p-3 flex justify-between items-center shadow-2xl shrink-0 mt-2">
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Current Turn:</span>
          <p className={`text-base font-black uppercase flex items-center gap-1.5 ${COLOR_THEMES[currentColor].text}`}>
            <span className={`w-3 h-3 rounded-full ${COLOR_THEMES[currentColor].bg}`} />
            {COLOR_THEMES[currentColor].name} Player
          </p>
          <span className="text-[10px] text-neutral-500 font-bold block">
            {hasRolled ? '👉 अपनी गोटी पर टैप करें' : 'पासा फेंकने के लिए बटन दबाएं'}
          </span>
        </div>

        {/* INTERACTIVE 3D DICE */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleRollDice}
          disabled={rolling || hasRolled || !!winner}
          className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-mono font-black text-3xl shadow-xl transition-all ${
            hasRolled
              ? 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed'
              : `${COLOR_THEMES[currentColor].bg} border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse`
          }`}
        >
          {rolling ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.25 }}>
              🎲
            </motion.span>
          ) : (
            <span>{dice}</span>
          )}
        </motion.button>
      </footer>
    </div>
  );
}
