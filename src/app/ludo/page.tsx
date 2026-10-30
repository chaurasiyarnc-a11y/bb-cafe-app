'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number;
  color: PlayerColor;
  step: number; // -1 = Base me, 0 to 50 = Track me, 51 to 55 = Home Path, 56 = Winner Home
}

// 15x15 Ludo Board का पूरा 52-स्टेप मुख्य ट्रैक
const MAIN_TRACK: { r: number; c: number }[] = [
  { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 }, // 0-4
  { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 }, // 5-10
  { r: 0, c: 7 }, // 11
  { r: 0, c: 8 }, { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 }, // 12-17
  { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 }, // 18-23
  { r: 7, c: 14 }, // 24
  { r: 8, c: 14 }, { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 }, // 25-30
  { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 }, // 31-36
  { r: 14, c: 7 }, // 37
  { r: 14, c: 6 }, { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 }, // 38-43
  { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 }, // 44-49
  { r: 7, c: 0 }, // 50
  { r: 6, c: 0 }  // 51
];

// हर रंग का शुरुआती बिंदु (Start Step)
const START_STEPS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

// होम पाथ के 5 खाने (51 से 55)
const HOME_PATHS: Record<PlayerColor, { r: number; c: number }[]> = {
  red: [{ r: 7, c: 1 }, { r: 7, c: 2 }, { r: 7, c: 3 }, { r: 7, c: 4 }, { r: 7, c: 5 }],
  green: [{ r: 1, c: 7 }, { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }],
  yellow: [{ r: 7, c: 13 }, { r: 7, c: 12 }, { r: 7, c: 11 }, { r: 7, c: 10 }, { r: 7, c: 9 }],
  blue: [{ r: 13, c: 7 }, { r: 12, c: 7 }, { r: 11, c: 7 }, { r: 10, c: 7 }, { r: 9, c: 7 }]
};

// बेस के अंदर 4 गोलियों की जगह (Rows & Cols)
const BASE_SLOTS: Record<PlayerColor, { r: number; c: number }[]> = {
  red: [{ r: 2, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 2 }, { r: 3, c: 3 }],
  green: [{ r: 2, c: 11 }, { r: 2, c: 12 }, { r: 3, c: 11 }, { r: 3, c: 12 }],
  yellow: [{ r: 11, c: 11 }, { r: 11, c: 12 }, { r: 12, c: 11 }, { r: 12, c: 12 }],
  blue: [{ r: 11, c: 2 }, { r: 11, c: 3 }, { r: 12, c: 2 }, { r: 12, c: 3 }]
};

const PLAYERS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export default function AuthenticLudoGame() {
  const [activePlayerIdx, setActivePlayerIdx] = useState<number>(0);
  const [diceVal, setDiceVal] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);
  
  // कस्टमर का इनाम क्लेम फॉर्म
  const [claimedPhone, setClaimedPhone] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [isSubmittingWinner, setIsSubmittingWinner] = useState(false);

  // हर खिलाड़ी के पास 4 गोटियाँ
  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, color: 'red', step: -1 }, { id: 2, color: 'red', step: -1 }, { id: 3, color: 'red', step: -1 }, { id: 4, color: 'red', step: -1 },
    { id: 5, color: 'green', step: -1 }, { id: 6, color: 'green', step: -1 }, { id: 7, color: 'green', step: -1 }, { id: 8, color: 'green', step: -1 },
    { id: 9, color: 'yellow', step: -1 }, { id: 10, color: 'yellow', step: -1 }, { id: 11, color: 'yellow', step: -1 }, { id: 12, color: 'yellow', step: -1 },
    { id: 13, color: 'blue', step: -1 }, { id: 14, color: 'blue', step: -1 }, { id: 15, color: 'blue', step: -1 }, { id: 16, color: 'blue', step: -1 }
  ]);

  const currColor = PLAYERS[activePlayerIdx];

  // पासा (Dice) रोल करना
  const rollDice = () => {
    if (isRolling || hasRolled || winner) return;

    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count > 9) {
        clearInterval(interval);
        const finalDice = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalDice);
        setIsRolling(false);
        setHasRolled(true);
        handlePostRoll(finalDice);
      }
    }, 50);
  };

  // रोल होने के बाद चाल की जांच
  const handlePostRoll = (roll: number) => {
    const myTokens = tokens.filter(t => t.color === currColor);
    const movable = myTokens.filter(t => {
      if (t.step === -1 && roll === 6) return true;
      if (t.step >= 0 && t.step + roll <= 56) return true;
      return false;
    });

    if (movable.length === 0) {
      toast('कोई चाल उपलब्ध नहीं! ⏭️', { duration: 1200 });
      setTimeout(() => switchTurn(false), 1000);
    } else if (movable.length === 1 && movable[0].step === -1 && roll === 6) {
      // अगर सिर्फ एक गोटी बेस में है और 6 आया, तो ऑटोमैटिक बाहर निकलेगी
      setTimeout(() => moveToken(movable[0], roll), 400);
    }
  };

  // गोटी चलना
  const moveToken = (token: Token, steps: number = diceVal) => {
    if (!hasRolled || token.color !== currColor || winner) return;

    let newStep = token.step;

    if (token.step === -1) {
      if (steps === 6) {
        newStep = 0; // घर से बाहर ट्रैक पर आई
      } else {
        return toast.error("बाहर निकलने के लिए 6 चाहिए!");
      }
    } else {
      if (token.step + steps > 56) {
        return toast.error("घर पहुंचने के लिए सही अंक चाहिए!");
      }
      newStep = token.step + steps;
    }

    // गोटी का ग्लोबल ट्रैक इंडेक्स निकालना (काटने के लिए)
    const getGlobalPos = (c: PlayerColor, s: number) => {
      if (s < 0 || s >= 51) return -1;
      return (START_STEPS[c] + s) % 52;
    };

    let updatedTokens = tokens.map(t => t.id === token.id ? { ...t, step: newStep } : t);

    // ⚔️ गोटी काटना (Safe Spots: 0, 8, 13, 21, 26, 34, 39, 47)
    const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];
    const myGlobalPos = getGlobalPos(currColor, newStep);

    if (myGlobalPos !== -1 && !safeSpots.includes(myGlobalPos)) {
      updatedTokens = updatedTokens.map(t => {
        if (t.color !== currColor && t.step >= 0 && t.step < 51) {
          const theirGlobal = getGlobalPos(t.color, t.step);
          if (theirGlobal === myGlobalPos) {
            toast.success(`💥 ${currColor.toUpperCase()} ने ${t.color.toUpperCase()} की गोटी काटी!`);
            return { ...t, step: -1 }; // बेस में वापस
          }
        }
        return t;
      });
    }

    setTokens(updatedTokens);
    setHasRolled(false);

    // 🏆 जीत की जांच (क्या चारों गोटियां होम पहुंच गईं?)
    const finishedCount = updatedTokens.filter(t => t.color === currColor && t.step === 56).length;
    if (finishedCount === 4) {
      setWinner(currColor);
      const code = `BOM-LUDO-${Math.floor(1000 + Math.random() * 9000)}`;
      setVoucherCode(code);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      toast.success(`👑 बधाई हो! ${currColor.toUpperCase()} विजेता बना!`);
      return;
    }

    // अगर 6 आया तो दोबारा चाल
    if (steps === 6) {
      toast('6 आया! आपकी दोबारा चाल है! 🎯', { duration: 1500 });
    } else {
      switchTurn(false);
    }
  };

  const switchTurn = (extraTurn = false) => {
    setHasRolled(false);
    if (!extraTurn) {
      setActivePlayerIdx(prev => (prev + 1) % 4);
    }
  };

  // विजेता का नंबर सेव करना (Firebase में POS से क्लेम करने के लिए)
  const handleClaimPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = claimedPhone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) return toast.error("10-अंकों का मोबाइल नंबर डालें!");

    setIsSubmittingWinner(true);
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
      setIsSubmittingWinner(false);
    }
  };

  // ग्रिड सेल का बैकग्राउंड रंग तय करना
  const getCellClass = (r: number, c: number) => {
    // 4 कोने वाले बड़े बेस
    if (r < 6 && c < 6) return 'bg-[#ea2027]'; // Red Base
    if (r < 6 && c > 8) return 'bg-[#009432]'; // Green Base
    if (r > 8 && c > 8) return 'bg-[#FFC312]'; // Yellow Base
    if (r > 8 && c < 6) return 'bg-[#0652DD]'; // Blue Base

    // बीच का होम (Trophy Triangle)
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'bg-neutral-900';

    // होम पाथ्स (रंगीन तीर)
    if (r === 7 && c >= 1 && c <= 5) return 'bg-[#ea2027]';
    if (c === 7 && r >= 1 && r <= 5) return 'bg-[#009432]';
    if (r === 7 && c >= 9 && c <= 13) return 'bg-[#FFC312]';
    if (c === 7 && r >= 9 && r <= 13) return 'bg-[#0652DD]';

    // शुरुआती खाने (Start Boxes)
    if (r === 6 && c === 1) return 'bg-[#ea2027]';
    if (r === 1 && c === 8) return 'bg-[#009432]';
    if (r === 8 && c === 13) return 'bg-[#FFC312]';
    if (r === 13 && c === 6) return 'bg-[#0652DD]';

    return 'bg-white dark:bg-neutral-800';
  };

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col justify-between items-center p-2 sm:p-4 select-none font-sans">
      <Toaster position="top-center" />

      {/* HEADER */}
      <header className="w-full max-w-lg flex justify-between items-center py-2 px-3 border-b border-white/10 shrink-0">
        <button onClick={() => window.history.back()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
            BUM BUM CAFE LUDO
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Classic 15×15 Board</p>
        </div>
        <button onClick={() => { setTokens(tokens.map(t => ({ ...t, step: -1 }))); setWinner(null); setHasRolled(false); }} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300">
          <RefreshCw size={18} />
        </button>
      </header>

      {/* 🏆 WINNER POPUP & VOUCHER FORM */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 border-2 border-yellow-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(234,179,8,0.4)]">
              <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full mx-auto flex items-center justify-center">
                <Trophy size={36} />
              </div>
              <h2 className="text-2xl font-black uppercase text-yellow-400">{winner.toUpperCase()} WINS!</h2>
              <p className="text-xs text-neutral-300 font-bold">🎉 बधाई हो! आपको कैफ़े से मुफ़्त इनाम मिलता है।</p>
              
              <div className="bg-white/5 border border-yellow-500/30 p-3 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-neutral-400">Your Winning Voucher Code:</p>
                <p className="text-xl font-mono font-black text-yellow-400 tracking-wider mt-1">{voucherCode}</p>
              </div>

              <form onSubmit={handleClaimPrize} className="space-y-3 pt-2">
                <input 
                  type="tel" 
                  maxLength={10} 
                  required 
                  placeholder="अपना 10-अंकों का मोबाइल नंबर डालें" 
                  value={claimedPhone} 
                  onChange={e => setClaimedPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black/60 border border-neutral-700 rounded-xl px-3 py-2.5 text-center text-sm font-mono font-bold text-white outline-none focus:border-yellow-500"
                />
                <button type="submit" disabled={isSubmittingWinner} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all">
                  {isSubmittingWinner ? 'सेव हो रहा है...' : 'इनाम लॉक करें (Claim Reward)'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎯 15×15 ASYMMETRICAL AUTHENTIC LUDO BOARD */}
      <main className="w-full max-w-[420px] aspect-square bg-[#fff] border-4 border-[#222] shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-2xl relative grid grid-cols-15 grid-rows-15 p-1 my-auto overflow-hidden">
        
        {/* 15×15 की 225 ग्रिड सेल्स */}
        {Array.from({ length: 15 }).map((_, r) =>
          Array.from({ length: 15 }).map((_, c) => {
            const cellClass = getCellClass(r, c);
            const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

            return (
              <div
                key={`${r}-${c}`}
                className={`relative border-[0.5px] border-neutral-300 dark:border-neutral-700/40 flex items-center justify-center ${cellClass}`}
              >
                {/* सेफ स्पॉट पर स्टार / सिंबल */}
                {((r === 6 && c === 1) || (r === 1 && c === 8) || (r === 8 && c === 13) || (r === 13 && c === 6) ||
                  (r === 8 && c === 2) || (r === 2 && c === 6) || (r === 6 && c === 12) || (r === 12 && c === 8)) && (
                  <span className="text-[9px] opacity-40 select-none">★</span>
                )}

                {/* बीच का होम ज़ोन (Triangles) */}
                {isCenter && r === 7 && c === 7 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trophy size={20} className="text-yellow-400 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* 🔴 RED BASE (4 WHITE CIRCLES) */}
        <div className="absolute top-[3%] left-[3%] w-[34%] h-[34%] bg-white rounded-xl shadow-inner flex flex-wrap items-center justify-around p-3 pointer-events-none">
          {[0, 1, 2, 3].map(idx => (
            <div key={idx} className="w-[38%] h-[38%] rounded-full bg-[#ea2027] border-2 border-white shadow-sm flex items-center justify-center" />
          ))}
        </div>

        {/* 🟢 GREEN BASE (4 WHITE CIRCLES) */}
        <div className="absolute top-[3%] right-[3%] w-[34%] h-[34%] bg-white rounded-xl shadow-inner flex flex-wrap items-center justify-around p-3 pointer-events-none">
          {[0, 1, 2, 3].map(idx => (
            <div key={idx} className="w-[38%] h-[38%] rounded-full bg-[#009432] border-2 border-white shadow-sm flex items-center justify-center" />
          ))}
        </div>

        {/* 🟡 YELLOW BASE (4 WHITE CIRCLES) */}
        <div className="absolute bottom-[3%] right-[3%] w-[34%] h-[34%] bg-white rounded-xl shadow-inner flex flex-wrap items-center justify-around p-3 pointer-events-none">
          {[0, 1, 2, 3].map(idx => (
            <div key={idx} className="w-[38%] h-[38%] rounded-full bg-[#FFC312] border-2 border-white shadow-sm flex items-center justify-center" />
          ))}
        </div>

        {/* 🔵 BLUE BASE (4 WHITE CIRCLES) */}
        <div className="absolute bottom-[3%] left-[3%] w-[34%] h-[34%] bg-white rounded-xl shadow-inner flex flex-wrap items-center justify-around p-3 pointer-events-none">
          {[0, 1, 2, 3].map(idx => (
            <div key={idx} className="w-[38%] h-[38%] rounded-full bg-[#0652DD] border-2 border-white shadow-sm flex items-center justify-center" />
          ))}
        </div>

        {/* ♟️ गोटियां (16 TOKENS - DYNAMIC POSITIONING) */}
        {tokens.map(token => {
          let pos = { r: 0, c: 0 };
          const myIndexInColor = tokens.filter(t => t.color === token.color && t.id <= token.id).length - 1;

          if (token.step === -1) {
            // बेस में है
            pos = BASE_SLOTS[token.color][myIndexInColor];
          } else if (token.step >= 0 && token.step < 51) {
            // मेन ट्रैक पर है
            const gIdx = (START_STEPS[token.color] + token.step) % 52;
            pos = MAIN_TRACK[gIdx];
          } else if (token.step >= 51 && token.step < 56) {
            // होम पाथ पर है
            pos = HOME_PATHS[token.color][token.step - 51];
          } else {
            // जीत गया (होम सेंटर)
            pos = { r: 7, c: 7 };
          }

          const isMyTurn = token.color === currColor;
          const canMove = hasRolled && isMyTurn && ((token.step === -1 && diceVal === 6) || (token.step >= 0 && token.step + diceVal <= 56));

          return (
            <motion.button
              key={token.id}
              layout
              onClick={() => moveToken(token)}
              style={{
                gridRowStart: pos.r + 1,
                gridColumnStart: pos.c + 1
              }}
              className={`w-[85%] h-[85%] m-auto rounded-full z-30 shadow-md border-2 border-white flex items-center justify-center transition-all ${
                token.color === 'red' ? 'bg-[#ea2027]' :
                token.color === 'green' ? 'bg-[#009432]' :
                token.color === 'yellow' ? 'bg-[#FFC312]' : 'bg-[#0652DD]'
              } ${canMove ? 'ring-4 ring-white animate-bounce scale-110 cursor-pointer z-40' : 'cursor-default'}`}
            >
              <div className="w-2 h-2 rounded-full bg-white/70 shadow-inner" />
            </motion.button>
          );
        })}
      </main>

      {/* CONTROLS (DICE & PLAYER TURN) */}
      <footer className="w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl p-3 flex justify-between items-center shadow-2xl shrink-0 mt-2">
        <div>
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">किसकी चाल है:</span>
          <p className={`text-base font-black uppercase ${
            currColor === 'red' ? 'text-red-500' :
            currColor === 'green' ? 'text-green-500' :
            currColor === 'yellow' ? 'text-yellow-400' : 'text-blue-500'
          }`}>
            {currColor} PLAYER
          </p>
          <span className="text-[10px] text-neutral-500">
            {hasRolled ? '👉 अपनी गोटी पर टैप करें' : 'पासा फेंकें'}
          </span>
        </div>

        {/* 3D CUBE DICE BUTTON */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={rollDice}
          disabled={isRolling || hasRolled || !!winner}
          className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-mono font-black text-2xl shadow-xl transition-all ${
            hasRolled
              ? 'bg-neutral-800 border-neutral-700 text-neutral-500'
              : currColor === 'red' ? 'bg-[#ea2027] border-white text-white animate-pulse'
              : currColor === 'green' ? 'bg-[#009432] border-white text-white animate-pulse'
              : currColor === 'yellow' ? 'bg-[#FFC312] border-white text-black animate-pulse'
              : 'bg-[#0652DD] border-white text-white animate-pulse'
          }`}
        >
          {isRolling ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.3 }}>
              🎲
            </motion.span>
          ) : (
            <span>{diceVal}</span>
          )}
        </motion.button>
      </footer>
    </div>
  );
}
