'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, VolumeX, Bot, User, Gift, Flame, Phone, ArrowRight, Loader2, Swords } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type Player = 'player' | 'cafe'; // player = Red (Top-Left), cafe = Yellow (Bottom-Right)

interface Token {
  id: number;
  owner: Player;
  slotIndex: number; // 0, 1
  step: number; // -1 = Base, 0 to 50 = Track, 51 to 55 = Runway, 56 = Home
}

// 15x15 ट्रैक कोऑर्डिनेट्स [row, col] (Exact Standard Ludo Route)
const BOARD_PATH: [number, number][] = [
  // Red Start & Right
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], // Top junction
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], // Right junction
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], // Bottom junction
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], // Left junction
  [6, 0]  // Red Entry
];

// Red Start = 0 (Left), Yellow Start = 26 (Right)
const START_OFFSETS: Record<Player, number> = { player: 0, cafe: 26 };

// Home Runways (जीत के 5 रंगीन खाने)
const RUNWAYS: Record<Player, [number, number][]> = {
  player: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // Red Runway (Left to Center)
  cafe: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]] // Yellow Runway (Right to Center)
};

// 4 बेस के अंदर 2 गोल पॉकेट्स [row, col]
const BASE_POCKETS: Record<Player, [number, number][]> = {
  player: [[2.5, 2], [2.5, 3]], // Red Base Inside
  cafe: [[11.5, 11], [11.5, 12]] // Yellow Base Inside
};

export default function PerfectClassicLudo() {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isCustomerVerified, setIsCustomerVerified] = useState(false);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const [turn, setTurn] = useState<Player>('player');
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // 75% बार कैफे ही जीतेगा, 25% ग्राहक
  const [targetWinner, setTargetWinner] = useState<Player>(() => Math.random() < 0.75 ? 'cafe' : 'player');
  const [winner, setWinner] = useState<Player | null>(null);
  const [voucherCode, setVoucherCode] = useState('');

  // 2-2 गोटियां (Customer vs Bum Bum Cafe)
  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, owner: 'player', slotIndex: 0, step: -1 },
    { id: 2, owner: 'player', slotIndex: 1, step: -1 },
    { id: 3, owner: 'cafe', slotIndex: 0, step: -1 },
    { id: 4, owner: 'cafe', slotIndex: 1, step: -1 },
  ]);

  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const rollingRef = useRef(rolling);
  rollingRef.current = rolling;
  const winnerRef = useRef(winner);
  winnerRef.current = winner;
  const hasRolledRef = useRef(hasRolled);
  hasRolledRef.current = hasRolled;
  const isAnimatingMoveRef = useRef(isAnimatingMove);
  isAnimatingMoveRef.current = isAnimatingMove;
  const diceRef = useRef<number | null>(dice);
  diceRef.current = dice;

  // 🔊 समृद्ध साउंड इफेक्ट्स (Real Synthesized Audio)
  const playSfx = (type: 'roll' | 'step' | 'cut' | 'win') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      if (type === 'roll') {
        // पासा खड़खड़ाने की आवाज़
        for (let i = 0; i < 6; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(180 + Math.random() * 260, ctx.currentTime + i * 0.04);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.04);
          gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + i * 0.04 + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.04);
          osc.stop(ctx.currentTime + i * 0.04 + 0.035);
        }
      } else if (type === 'step') {
        // गोटी का लकड़ी पर गिरना (Wood Tap)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.07);
      } else if (type === 'cut') {
        // गोटी कटना (Heavy Slash Impact)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'win') {
        // जीत का बिगुल (Victory Fanfare)
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.25);
        });
      }
    } catch {}
  };

  // 🔍 मोबाइल नंबर लुकअप
  const handlePhoneLookup = async (inputPhone: string) => {
    const clean = inputPhone.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(clean);

    if (clean.length === 10) {
      setIsCheckingCustomer(true);
      try {
        const docRef = doc(db, 'customer_points', clean);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().name) {
          const fetchedName = docSnap.data().name;
          setCustomerName(fetchedName);
          setIsNewUser(false);
          toast.success(`नमस्ते ${fetchedName}! 👋`);
        } else {
          setIsNewUser(true);
          setCustomerName('');
          toast('नया खिलाड़ी! अपना नाम लिखें ✍️', { icon: '👤' });
        }
      } catch {
        setIsNewUser(true);
      } finally {
        setIsCheckingCustomer(false);
      }
    } else {
      setIsNewUser(false);
      setCustomerName('');
    }
  };

  const handleStartGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerPhone.length !== 10) return toast.error('10 अंकों का मोबाइल नंबर डालें!');
    if (!customerName.trim()) return toast.error('कृपया अपना नाम दर्ज करें!');

    try {
      await setDoc(doc(db, 'customer_points', customerPhone), {
        phone: customerPhone,
        name: customerName.trim(),
        lastActive: new Date()
      }, { merge: true });
    } catch {}

    setIsCustomerVerified(true);
    toast.success(`चैलेंज शुरू! हराओ Bum Bum Cafe को! ⚔️`);
  };

  // 🔥 75% ड्रामा व लड़ाकू पासा (Aggressive Clash)
  const getBiasedDiceRoll = (playerTurn: Player): number => {
    const raw = Math.floor(Math.random() * 6) + 1;
    const currentTokens = tokensRef.current;
    const playerTokens = currentTokens.filter(t => t.owner === 'player');
    const cafeTokens = currentTokens.filter(t => t.owner === 'cafe');

    const activeTokens = playerTurn === 'player' ? playerTokens : cafeTokens;
    const enemyTokens = playerTurn === 'player' ? cafeTokens : playerTokens;

    // 1. गोटी काटने की प्राथमिकता (Attack Priority)
    for (let r = 1; r <= 6; r++) {
      const canKill = activeTokens.some(t => {
        if (t.step === -1) return false;
        const targetStep = t.step + r;
        if (targetStep > 50) return false;
        const targetGlobal = (START_OFFSETS[playerTurn] + targetStep) % 52;
        const safe = [0, 8, 13, 21, 26, 34, 39, 47];
        if (safe.includes(targetGlobal)) return false;

        return enemyTokens.some(e => e.step >= 0 && e.step < 51 && (START_OFFSETS[e.owner] + e.step) % 52 === targetGlobal);
      });

      if (canKill && Math.random() < 0.5) return r;
    }

    const isPlayerNearWinning = playerTokens.some(t => t.step >= 53) || playerTokens.filter(t => t.step === 56).length === 1;

    // 75% बार कैफ़े की जीत
    if (targetWinner === 'cafe') {
      if (playerTurn === 'player') {
        if (!isPlayerNearWinning) {
          const inBase = playerTokens.some(t => t.step === -1);
          if (inBase && Math.random() < 0.6) return 6;
        } else {
          // जीत के मुहाने पर गलत नंबर देना
          const needed = playerTokens.map(t => 56 - t.step).filter(d => d > 0 && d <= 6);
          if (needed.length > 0 && Math.random() < 0.8) {
            const wrong = [1, 2, 3, 4, 5, 6].filter(n => !needed.includes(n));
            if (wrong.length > 0) return wrong[Math.floor(Math.random() * wrong.length)];
          }
        }
      } else {
        if (isPlayerNearWinning) {
          const inBase = cafeTokens.some(t => t.step === -1);
          if (inBase) return 6;
          return Math.random() < 0.6 ? 6 : 5;
        }
      }
    }

    return raw;
  };

  const handleRollDice = (isBot = false) => {
    if (rollingRef.current || winnerRef.current || hasRolledRef.current || isAnimatingMoveRef.current) return;
    if (turnRef.current === 'cafe' && !isBot) return;

    setRolling(true);
    playSfx('roll');

    let counter = 0;
    const timer = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      counter++;
      if (counter > 7) {
        clearInterval(timer);
        const finalVal = getBiasedDiceRoll(turnRef.current);
        setDice(finalVal);
        setRolling(false);
        setHasRolled(true);
        postRollEvaluation(finalVal, turnRef.current);
      }
    }, 40);
  };

  useEffect(() => {
    if (isCustomerVerified && turn === 'cafe' && !rolling && !hasRolled && !winner && !isAnimatingMove) {
      const botTimer = setTimeout(() => {
        handleRollDice(true);
      }, 700);
      return () => clearTimeout(botTimer);
    }
  }, [turn, hasRolled, rolling, winner, isAnimatingMove, isCustomerVerified]);

  const postRollEvaluation = (rollVal: number, currentTurn: Player) => {
    const myTokens = tokensRef.current.filter(t => t.owner === currentTurn);
    const movable = myTokens.filter(t => {
      if (t.step === -1 && rollVal === 6) return true;
      if (t.step >= 0 && t.step + rollVal <= 56) return true;
      return false;
    });

    if (movable.length === 0) {
      if (currentTurn === 'player') toast('चाल नहीं बन पाई! ⏭️', { duration: 1200 });
      setTimeout(() => switchTurn(false), 900);
    } else if (currentTurn === 'cafe') {
      setTimeout(() => {
        const currentTokens = tokensRef.current;
        const killMove = movable.find(t => {
          const targetStep = t.step === -1 ? 0 : t.step + rollVal;
          const targetGlobal = (START_OFFSETS.cafe + targetStep) % 52;
          return currentTokens.some(other => other.owner === 'player' && other.step >= 0 && other.step < 51 && (START_OFFSETS.player + other.step) % 52 === targetGlobal);
        });

        const winMove = movable.find(t => t.step + rollVal === 56);
        const baseMove = movable.find(t => t.step === -1);
        const forwardMove = [...movable].sort((a, b) => b.step - a.step)[0];

        const chosenToken = killMove || winMove || baseMove || forwardMove || movable[0];
        handleMoveToken(chosenToken, rollVal);
      }, 600);
    } else if (movable.length === 1 && movable[0].step === -1 && rollVal === 6) {
      setTimeout(() => handleMoveToken(movable[0], rollVal), 400);
    }
  };

  // स्टेप-बाय-स्टेप चलना और गोटी काटना
  const handleMoveToken = async (token: Token, rollValue: number | null = diceRef.current) => {
    if (!hasRolledRef.current || rollValue === null || isAnimatingMoveRef.current) {
      return toast.error("पहले पासा फेंकें! 🎲");
    }

    if (token.owner !== turnRef.current || winnerRef.current) return;

    if (token.step === -1 && rollValue !== 6) return toast.error("बाहर निकलने के लिए 6 चाहिए!");
    if (token.step >= 0 && token.step + rollValue > 56) return toast.error("होम पहुंचने के लिए सही अंक चाहिए!");

    setIsAnimatingMove(true);
    setHasRolled(false);

    if (token.step === -1 && rollValue === 6) {
      playSfx('step');
      setTokens(prev => prev.map(t => t.id === token.id ? { ...t, step: 0 } : t));
      await new Promise(r => setTimeout(r, 200));
    } else {
      let currentStep = token.step;
      for (let i = 1; i <= rollValue; i++) {
        currentStep += 1;
        playSfx('step');
        setTokens(prev => prev.map(t => t.id === token.id ? { ...t, step: currentStep } : t));
        await new Promise(r => setTimeout(r, 160));
      }
    }

    const finalStep = token.step === -1 ? 0 : token.step + rollValue;

    const getGlobal = (p: Player, s: number) => {
      if (s < 0 || s >= 51) return -1;
      return (START_OFFSETS[p] + s) % 52;
    };

    let updated = tokensRef.current;
    const myGlobal = getGlobal(turnRef.current, finalStep);
    let captured = false;

    if (myGlobal !== -1) {
      const safe = [0, 8, 13, 21, 26, 34, 39, 47];
      if (!safe.includes(myGlobal)) {
        updated = updated.map(t => {
          if (t.owner !== turnRef.current && t.step >= 0 && t.step < 51 && getGlobal(t.owner, t.step) === myGlobal) {
            captured = true;
            playSfx('cut');
            toast.success(`⚔️ ${turnRef.current === 'player' ? 'आपने' : 'Bum Bum Cafe ने'} गोटी काटी!`);
            return { ...t, step: -1 };
          }
          return t;
        });
        setTokens(updated);
      }
    }

    setIsAnimatingMove(false);

    // जीत का फ़ैसला
    const homeCount = updated.filter(t => t.owner === turnRef.current && t.step === 56).length;
    if (homeCount === 2) {
      const winningSide = turnRef.current;
      setWinner(winningSide);
      playSfx('win');

      if (winningSide === 'player') {
        const code = `BOM-MANCHURIAN-${Math.floor(1000 + Math.random() * 9000)}`;
        setVoucherCode(code);
        confetti({ particleCount: 220, spread: 90 });
        toast.success(`🎉 गजब! आपको मिला 1x Veg Manchurian (Half) FREE! 🥟`);

        setDoc(doc(db, "customer_points", customerPhone), {
          phone: customerPhone,
          name: customerName,
          lastPrizeWon: "1x Veg Manchurian (Half) FREE 🥟",
          voucherCode: code,
          voucherClaimed: false,
          lastPlayedAt: new Date(),
          importSource: 'LudoClassic'
        }, { merge: true }).catch(() => {});
      } else {
        toast.error("😱 ओह्ह! कैफ़े ने मैच छीन लिया! Manchurian हाथ से निकल गया!");
      }
      return;
    }

    if (rollValue === 6 || captured) {
      toast(rollValue === 6 ? '6 आया! फिर से पासा फेंकें 🎯' : 'गोटी काटी! बोनस चाल ⚔️', { duration: 1500 });
      if (turnRef.current === 'cafe') {
        setTimeout(() => handleRollDice(true), 700);
      }
    } else {
      switchTurn(false);
    }
  };

  const switchTurn = (extra = false) => {
    setHasRolled(false);
    setDice(null);
    if (!extra) {
      const next: Player = turnRef.current === 'player' ? 'cafe' : 'player';
      setTurn(next);
    }
  };

  const handleRestart = () => {
    setTokens([
      { id: 1, owner: 'player', slotIndex: 0, step: -1 },
      { id: 2, owner: 'player', slotIndex: 1, step: -1 },
      { id: 3, owner: 'cafe', slotIndex: 0, step: -1 },
      { id: 4, owner: 'cafe', slotIndex: 1, step: -1 },
    ]);
    setWinner(null);
    setHasRolled(false);
    setDice(null);
    setTurn('player');
    setTargetWinner(Math.random() < 0.75 ? 'cafe' : 'player');
  };

  // टोकन कोऑर्डिनेट्स [row, col]
  const getTokenCoords = (t: Token): [number, number] => {
    if (t.step === -1) {
      const pocket = BASE_POCKETS[t.owner]?.[t.slotIndex];
      return pocket ? [pocket[0], pocket[1]] : [0, 0];
    }
    if (t.step >= 0 && t.step < 51) {
      const idx = (START_OFFSETS[t.owner] + t.step) % 52;
      const pt = BOARD_PATH[idx];
      return pt ? [pt[0], pt[1]] : [0, 0];
    }
    if (t.step >= 51 && t.step < 56) {
      const rw = RUNWAYS[t.owner]?.[t.step - 51];
      return rw ? [rw[0], rw[1]] : [7, 7];
    }
    return [7, 7];
  };

  const isNearWin = tokens.some(t => t.owner === 'player' && t.step >= 52);

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col justify-between items-center p-2 sm:p-4 select-none font-sans">
      <Toaster position="top-center" />

      {/* 🥟 स्पेशल लॉगिन बॉक्स */}
      <AnimatePresence>
        {!isCustomerVerified && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl p-3 text-center space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center justify-center gap-1">
                  <Gift size={13} /> Special Cafe Challenge
                </span>
                <p className="text-sm font-black text-white">
                  हराओ कैफे को और पाओ: <br />
                  <span className="text-amber-400 text-base">1x Veg Manchurian (Half) FREE! 🥟</span>
                </p>
              </div>

              <form onSubmit={handleStartGame} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-400">Mobile Number (फ़ोन नंबर) *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      autoFocus
                      required
                      placeholder="10 अंकों का नंबर"
                      value={customerPhone}
                      onChange={e => handlePhoneLookup(e.target.value)}
                      className="w-full bg-black/60 border border-neutral-700 rounded-xl px-3.5 py-3 text-sm font-mono font-bold text-white outline-none focus:border-amber-400"
                    />
                    {isCheckingCustomer && (
                      <Loader2 size={16} className="animate-spin text-amber-400 absolute right-3 top-3.5" />
                    )}
                  </div>
                </div>

                {(customerName || isNewUser) && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400">Customer Name (आपका नाम) *</label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. राहुल शर्मा"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full bg-black/60 border border-neutral-700 rounded-xl px-3.5 py-3 text-sm font-bold text-white outline-none focus:border-rose-400"
                    />
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={customerPhone.length !== 10 || !customerName.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-40 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 tracking-wider"
                >
                  <Swords size={16} /> मैच शुरू करें (Play 1v1)
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className="w-full max-w-lg flex justify-between items-center py-2 px-3 border-b border-white/10 shrink-0">
        <button onClick={() => window.history.back()} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-rose-500">
            CLASSIC LUDO ARENA
          </h1>
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Win 1x Veg Manchurian Half 🥟</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={handleRestart} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* HUD CARDS */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 my-2 shrink-0">
        {/* PLAYER (RED - TOP LEFT) */}
        <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all relative overflow-hidden ${turn === 'player' ? 'bg-[#ff2d2d] text-white border-white shadow-[0_0_20px_rgba(255,45,45,0.4)] ring-2 ring-white/50' : 'bg-white/5 border-white/10 text-neutral-400 opacity-60'}`}>
          {isNearWin && (
            <span className="absolute top-1 right-2 text-[8px] bg-yellow-400 text-black px-1 rounded font-black uppercase flex items-center gap-0.5 animate-bounce">
              <Flame size={9} fill="currentColor" /> Winning!
            </span>
          )}
          <div className="flex items-center gap-2">
            <User size={18} />
            <div>
              <p className="text-xs font-black uppercase truncate max-w-[95px]">{customerName || 'You (ग्राहक)'}</p>
              <p className="text-[10px] font-mono">{tokens.filter(t => t.owner === 'player' && t.step === 56).length}/2 In</p>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-red-400 border border-white" />
        </div>

        {/* CAFE (YELLOW - BOTTOM RIGHT) */}
        <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${turn === 'cafe' ? 'bg-[#ffcc00] text-black border-white shadow-[0_0_20px_rgba(255,204,0,0.4)] ring-2 ring-white/50' : 'bg-white/5 border-white/10 text-neutral-400 opacity-60'}`}>
          <div className="flex items-center gap-2">
            <Bot size={18} />
            <div>
              <p className="text-xs font-black uppercase">Bum Bum Cafe ☕</p>
              <p className="text-[10px] font-mono">{tokens.filter(t => t.owner === 'cafe' && t.step === 56).length}/2 In</p>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-yellow-400 border border-black" />
        </div>
      </div>

      {/* WINNER POPUP */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              {winner === 'player' ? (
                <>
                  <div className="w-16 h-16 bg-amber-400/20 text-amber-400 rounded-full mx-auto flex items-center justify-center">
                    <Gift size={36} />
                  </div>
                  <h2 className="text-2xl font-black uppercase text-amber-400">YOU WON! 🎉</h2>
                  <p className="text-xs text-neutral-300 font-bold">बधाई हो <span className="text-white underline">{customerName}</span>! आपने जीता है:</p>
                  
                  <div className="bg-amber-500/10 border-2 border-amber-400 p-3 rounded-2xl">
                    <p className="text-base font-black text-amber-300">1x Veg Manchurian (Half) FREE 🥟</p>
                    <p className="text-xs font-mono text-neutral-400 mt-1">Voucher Code: <span className="text-white font-bold">{voucherCode}</span></p>
                  </div>
                  <p className="text-[10px] text-green-400 font-bold bg-green-500/10 py-1.5 px-2 rounded-lg border border-green-500/30">
                    ✅ आपके फ़ोन {customerPhone} पर सेव हो गया! काउंटर पर दिखाएं।
                  </p>

                  <button onClick={handleRestart} className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all">
                    Done / Play Again
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full mx-auto flex items-center justify-center">
                    <Bot size={36} />
                  </div>
                  <h2 className="text-xl font-black uppercase text-rose-400">SO CLOSE! 😱</h2>
                  <p className="text-xs text-neutral-300 font-bold">
                    आप बस 1 चाल से रह गए! Bum Bum Cafe ने मैच निकाल लिया।
                  </p>
                  <p className="text-[11px] text-amber-400 font-bold bg-white/5 p-2 rounded-xl border border-white/10">
                    💡 अगली बार पासा सही पड़ा तो मंचूरियन पक्का आपका होगा!
                  </p>
                  <button onClick={handleRestart} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-xs rounded-xl transition-all shadow-lg">
                    एक बार और खेलें (Try Again) 🎲
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎯 HUBAHU CLASSIC 15x15 BOARD (इमेज जैसा 100% सटीक) */}
      <div className="w-full max-w-[420px] aspect-square bg-white border-[5px] border-[#000] shadow-[0_15px_50px_rgba(0,0,0,0.9)] relative overflow-hidden my-auto p-[2px]">
        
        {/* 15x15 ग्रिड सेल्स */}
        <div className="w-full h-full grid grid-cols-15 grid-rows-15">
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              // 4 Base Areas
              if (r < 6 && c < 6) return null; // Red Base (Top-Left)
              if (r < 6 && c > 8) return null; // Green Base (Top-Right)
              if (r > 8 && c < 6) return null; // Blue Base (Bottom-Left)
              if (r > 8 && c > 8) return null; // Yellow Base (Bottom-Right)
              if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return null; // Center Box

              // Runways
              const isRedRunway = r === 7 && c >= 1 && c <= 5;
              const isGreenRunway = c === 7 && r >= 1 && r <= 5;
              const isYellowRunway = r === 7 && c >= 9 && c <= 13;
              const isBlueRunway = c === 7 && r >= 9 && r <= 13;

              // Starting Boxes
              const isRedStart = r === 6 && c === 1;
              const isGreenStart = r === 1 && c === 8;
              const isYellowStart = r === 8 && c === 13;
              const isBlueStart = r === 13 && c === 6;

              let bg = 'bg-white';
              if (isRedRunway || isRedStart) bg = 'bg-[#ff2d2d]';
              if (isGreenRunway || isGreenStart) bg = 'bg-[#2ecc71]';
              if (isYellowRunway || isYellowStart) bg = 'bg-[#ffcc00]';
              if (isBlueRunway || isBlueStart) bg = 'bg-[#00a8ff]';

              // Stars / Safe Spots (Exact image spots)
              const isRedStar = r === 2 && c === 8;
              const isGreenStar = r === 8 && c === 12;
              const isYellowStar = r === 12 && c === 6;
              const isBlueStar = r === 6 && c === 2;

              return (
                <div
                  key={`${r}-${c}`}
                  style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
                  className={`border-[0.5px] border-black relative flex items-center justify-center ${bg}`}
                >
                  {/* Arrows as per image */}
                  {r === 7 && c === 0 && <span className="text-[10px] font-black text-[#ff2d2d]">➡</span>}
                  {r === 0 && c === 7 && <span className="text-[10px] font-black text-[#2ecc71]">⬇</span>}
                  {r === 7 && c === 14 && <span className="text-[10px] font-black text-[#ffcc00]">⬅</span>}
                  {r === 14 && c === 7 && <span className="text-[10px] font-black text-[#00a8ff]">⬆</span>}

                  {/* Stars matching image */}
                  {isRedStar && <span className="text-[11px] font-black text-[#ff2d2d]">★</span>}
                  {isGreenStar && <span className="text-[11px] font-black text-[#2ecc71]">★</span>}
                  {isYellowStar && <span className="text-[11px] font-black text-[#ffcc00]">★</span>}
                  {isBlueStar && <span className="text-[11px] font-black text-[#00a8ff]">★</span>}
                </div>
              );
            })
          )}
        </div>

        {/* 🔴 RED BASE (TOP-LEFT - 0 to 5) */}
        <div
          style={{ top: '0%', left: '0%', width: `${(6 / 15) * 100}%`, height: `${(6 / 15) * 100}%` }}
          className="absolute bg-[#ff2d2d] p-[10px] flex items-center justify-center z-10 border-r border-b border-black"
        >
          <div className="w-full h-full bg-white shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="aspect-square rounded-full bg-[#ff2d2d]" />
            ))}
          </div>
        </div>

        {/* 🟢 GREEN BASE (TOP-RIGHT - 9 to 14) */}
        <div
          style={{ top: '0%', left: `${(9 / 15) * 100}%`, width: `${(6 / 15) * 100}%`, height: `${(6 / 15) * 100}%` }}
          className="absolute bg-[#2ecc71] p-[10px] flex items-center justify-center z-10 border-l border-b border-black"
        >
          <div className="w-full h-full bg-white shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="aspect-square rounded-full bg-[#2ecc71]" />
            ))}
          </div>
        </div>

        {/* 🔵 BLUE BASE (BOTTOM-LEFT - 9 to 14) */}
        <div
          style={{ top: `${(9 / 15) * 100}%`, left: '0%', width: `${(6 / 15) * 100}%`, height: `${(6 / 15) * 100}%` }}
          className="absolute bg-[#00a8ff] p-[10px] flex items-center justify-center z-10 border-r border-t border-black"
        >
          <div className="w-full h-full bg-white shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="aspect-square rounded-full bg-[#00a8ff]" />
            ))}
          </div>
        </div>

        {/* 🟡 YELLOW BASE (BOTTOM-RIGHT - 9 to 14) */}
        <div
          style={{ top: `${(9 / 15) * 100}%`, left: `${(9 / 15) * 100}%`, width: `${(6 / 15) * 100}%`, height: `${(6 / 15) * 100}%` }}
          className="absolute bg-[#ffcc00] p-[10px] flex items-center justify-center z-10 border-l border-t border-black"
        >
          <div className="w-full h-full bg-white shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="aspect-square rounded-full bg-[#ffcc00]" />
            ))}
          </div>
        </div>

        {/* 🏆 CENTER TRIANGLES (3x3 Center Box) */}
        <div
          style={{ top: `${(6 / 15) * 100}%`, left: `${(6 / 15) * 100}%`, width: `${(3 / 15) * 100}%`, height: `${(3 / 15) * 100}%` }}
          className="absolute overflow-hidden z-10 border border-black"
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Top Green */}
            <polygon points="0,0 50,50 100,0" fill="#2ecc71" stroke="#000" strokeWidth="1" />
            {/* Right Yellow */}
            <polygon points="100,0 50,50 100,100" fill="#ffcc00" stroke="#000" strokeWidth="1" />
            {/* Bottom Blue */}
            <polygon points="0,100 50,50 100,100" fill="#00a8ff" stroke="#000" strokeWidth="1" />
            {/* Left Red */}
            <polygon points="0,0 50,50 0,100" fill="#ff2d2d" stroke="#000" strokeWidth="1" />
          </svg>
        </div>

        {/* ♟️ 4 DYNAMIC TOKENS (PIXEL-PERFECT POSITIONING) */}
        {tokens.map(token => {
          const [r, c] = getTokenCoords(token);
          const isMyTurn = token.owner === turn;
          
          const canMove = hasRolled && isMyTurn && dice !== null && !isAnimatingMove && (
            (token.step === -1 && dice === 6) ||
            (token.step >= 0 && token.step + dice <= 56)
          );

          return (
            <motion.div
              key={token.id}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              style={{
                top: `${(r / 15) * 100}%`,
                left: `${(c / 15) * 100}%`,
                width: `${100 / 15}%`,
                height: `${100 / 15}%`
              }}
              onClick={() => {
                if (isAnimatingMove) return;
                if (canMove && turn === 'player') {
                  handleMoveToken(token);
                } else if (!hasRolled && turn === 'player') {
                  toast.error("पहले पासा फेंकें! 🎲");
                }
              }}
              className="absolute z-30 flex items-center justify-center p-[2px] cursor-pointer"
            >
              <motion.div
                animate={canMove && turn === 'player' ? { scale: [1, 1.25, 1], y: [0, -4, 0] } : { scale: 1 }}
                transition={canMove ? { repeat: Infinity, duration: 0.6 } : {}}
                className={`w-full h-full rounded-full border-2 border-white shadow-[0_4px_8px_rgba(0,0,0,0.6)] flex items-center justify-center relative ${
                  token.owner === 'player' ? 'bg-[#ff2d2d]' : 'bg-[#ffcc00]'
                } ${canMove && turn === 'player' ? 'ring-2 ring-white shadow-[0_0_12px_#fff]' : ''}`}
              >
                {/* 3D Top Ring */}
                <div className="w-[50%] h-[50%] rounded-full bg-white/40 shadow-inner" />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* FOOTER CONTROLS & DICE */}
      <footer className="w-full max-w-md bg-neutral-900/90 border border-white/10 rounded-3xl p-3 flex justify-between items-center shadow-2xl shrink-0 mt-2">
        <div>
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">किसकी चाल:</span>
          <p className={`text-base font-black uppercase flex items-center gap-1.5 ${turn === 'player' ? 'text-red-500' : 'text-yellow-400'}`}>
            <span className={`w-3 h-3 rounded-full ${turn === 'player' ? 'bg-[#ff2d2d]' : 'bg-[#ffcc00]'}`} />
            {turn === 'player' ? `${customerName || 'आपकी'} चाल` : 'Bum Bum Cafe (खेल रहा है...)'}
          </p>
          <span className="text-[10px] text-neutral-500 font-bold">
            {isAnimatingMove ? 'गोटी चल रही है...' : (turn === 'player' 
              ? (hasRolled ? '👉 अब अपनी गोटी पर टैप करें' : '👉 पहले पासा फेंकने के लिए बटन दबाएं') 
              : 'कंप्यूटर सोच रहा है...')}
          </span>
        </div>

        {/* 🎲 DICE BUTTON */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleRollDice(false)}
          disabled={rolling || hasRolled || turn !== 'player' || !!winner || isAnimatingMove || !isCustomerVerified}
          className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-mono font-black text-3xl shadow-xl transition-all ${
            hasRolled || turn !== 'player' || isAnimatingMove
              ? 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed'
              : 'bg-[#ff2d2d] border-white text-white shadow-[0_0_20px_rgba(255,45,45,0.4)] animate-pulse cursor-pointer'
          }`}
        >
          {rolling ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.25 }}>
              🎲
            </motion.span>
          ) : (
            <span>{dice !== null ? dice : '🎲'}</span>
          )}
        </motion.button>
      </footer>
    </div>
  );
}
