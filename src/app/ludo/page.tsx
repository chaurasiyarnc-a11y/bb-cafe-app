'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, VolumeX, Bot, User, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

type Player = 'player' | 'cafe'; // player = Red, cafe = Yellow

interface Token {
  id: number;
  owner: Player;
  slotIndex: number;
  step: number; // -1 = Base, 0 to 50 = Track, 51 to 55 = Runway, 56 = Home
}

// 15x15 ट्रैक कोऑर्डिनेट्स [row, col]
const BOARD_PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0]
];

const START_OFFSETS: Record<Player, number> = { player: 0, cafe: 26 };

const RUNWAYS: Record<Player, [number, number][]> = {
  player: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  cafe: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
};

const BASE_POCKETS: Record<Player, [number, number][]> = {
  player: [[2, 2], [2, 3], [3, 2], [3, 3]],
  cafe: [[11, 11], [11, 12], [12, 11], [12, 12]]
};

const STAR_COORDS: [number, number][] = [
  [6, 1], [2, 6], [1, 8], [6, 12], [8, 13], [12, 8], [13, 6], [8, 2]
];

const getRandomReward = (): string => {
  const rand = Math.random() * 100;
  if (rand < 4) return "1x Pizza (Small Size) 🍕";
  if (rand < 8) return "1x Grilled Sandwich 🥪";
  if (rand < 12) return "1x Manchurian Dry 🥟";
  if (rand < 16) return "1x Manchurian Fried Rice 🍚";
  if (rand < 36) return "₹20 Flat Off Token 💵";
  return "₹10 Flat Off Token 🎟️";
};

export default function LudoVersusCafe() {
  const [turn, setTurn] = useState<Player>('player');
  const [dice, setDice] = useState<number>(6);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // 75% कैफ़े को जिताने का बिज़नेस चांस
  const [targetWinner] = useState<Player>(() => Math.random() < 0.75 ? 'cafe' : 'player');
  const [winner, setWinner] = useState<Player | null>(null);
  const [rewardWon, setRewardWon] = useState<string>('');
  const [voucherCode, setVoucherCode] = useState('');
  const [claimedPhone, setClaimedPhone] = useState('');
  const [savingReward, setSavingReward] = useState(false);

  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, owner: 'player', slotIndex: 0, step: -1 },
    { id: 2, owner: 'player', slotIndex: 1, step: -1 },
    { id: 3, owner: 'cafe', slotIndex: 0, step: -1 },
    { id: 4, owner: 'cafe', slotIndex: 1, step: -1 },
  ]);

  // 🔥 Stale State फिक्स: हमेशा ताज़ा वैल्यूज रखने के लिए Refs
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const rollingRef = useRef(rolling);
  rollingRef.current = rolling;
  const winnerRef = useRef(winner);
  winnerRef.current = winner;

  const playSfx = (type: 'roll' | 'step' | 'cut') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'roll') {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start(); osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'step') {
        osc.frequency.setValueAtTime(540, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'cut') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio fallback
    }
  };

  // 🎲 75% बायस्ड डाइस लॉजिक
  const getBiasedDiceRoll = (playerTurn: Player): number => {
    const raw = Math.floor(Math.random() * 6) + 1;
    if (targetWinner === 'cafe') {
      if (playerTurn === 'cafe') {
        const cafeTokens = tokensRef.current.filter(t => t.owner === 'cafe');
        const inBase = cafeTokens.some(t => t.step === -1);
        if (inBase && Math.random() < 0.65) return 6; // बेस से बाहर निकालने में मदद
        if (Math.random() < 0.5) return Math.random() < 0.5 ? 5 : 6;
      } else {
        const playerTokens = tokensRef.current.filter(t => t.owner === 'player');
        const inBase = playerTokens.every(t => t.step === -1);
        if (inBase && Math.random() < 0.65) return Math.floor(Math.random() * 5) + 1;
      }
    }
    return raw;
  };

  // रोल पासा (कस्टमर या ऑटो बोट)
  const handleRollDice = (isBot = false) => {
    if (rollingRef.current || winnerRef.current) return;
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

  // 🤖 बोट के लिए खुद-ब-खुद पासा फेंकने वाला ऑटो इफेक्ट
  useEffect(() => {
    if (turn === 'cafe' && !rolling && !hasRolled && !winner) {
      const botTimer = setTimeout(() => {
        handleRollDice(true);
      }, 700);
      return () => clearTimeout(botTimer);
    }
  }, [turn, hasRolled, rolling, winner]);

  const postRollEvaluation = (rollVal: number, currentTurn: Player) => {
    const myTokens = tokensRef.current.filter(t => t.owner === currentTurn);
    const movable = myTokens.filter(t => {
      if (t.step === -1 && rollVal === 6) return true;
      if (t.step >= 0 && t.step + rollVal <= 56) return true;
      return false;
    });

    if (movable.length === 0) {
      // कोई चाल नहीं मिली
      setTimeout(() => switchTurn(false), 900);
    } else if (currentTurn === 'cafe') {
      // 🤖 बोट का ऑटो मूव निर्णय
      setTimeout(() => {
        const currentTokens = tokensRef.current;
        
        // 1. क्या किसी चाल से कस्टमर की गोटी कट रही है?
        const killMove = movable.find(t => {
          const targetStep = t.step === -1 ? 0 : t.step + rollVal;
          const targetGlobal = (START_OFFSETS.cafe + targetStep) % 52;
          return currentTokens.some(other => other.owner === 'player' && other.step >= 0 && other.step < 51 && (START_OFFSETS.player + other.step) % 52 === targetGlobal);
        });

        // 2. क्या 6 आया है और कोई गोटी बेस में पड़ी है?
        const baseMove = movable.find(t => t.step === -1);

        // 3. सबसे आगे वाली गोटी को बढ़ाओ
        const forwardMove = [...movable].sort((a, b) => b.step - a.step)[0];

        const chosenToken = killMove || baseMove || forwardMove || movable[0];
        handleMoveToken(chosenToken, rollVal);
      }, 600);
    } else if (movable.length === 1 && movable[0].step === -1 && rollVal === 6) {
      // कस्टमर की सिर्फ 1 गोटी बेस में है और 6 आया तो ऑटो बाहर निकालें
      setTimeout(() => handleMoveToken(movable[0], rollVal), 400);
    }
  };

  const handleMoveToken = (token: Token, rollValue: number = dice) => {
    if (token.owner !== turnRef.current || winnerRef.current) return;

    let targetStep = token.step;
    if (token.step === -1) {
      if (rollValue === 6) targetStep = 0;
      else return toast.error("बाहर निकलने के लिए 6 चाहिए!");
    } else {
      if (token.step + rollValue > 56) return toast.error("घर पहुंचने के लिए सही अंक चाहिए!");
      targetStep = token.step + rollValue;
    }

    playSfx('step');

    const getGlobal = (p: Player, s: number) => {
      if (s < 0 || s >= 51) return -1;
      return (START_OFFSETS[p] + s) % 52;
    };

    let updated = tokensRef.current.map(t => t.id === token.id ? { ...t, step: targetStep } : t);
    const myGlobal = getGlobal(turnRef.current, targetStep);
    let captured = false;

    if (myGlobal !== -1) {
      const safe = [0, 8, 13, 21, 26, 34, 39, 47];
      if (!safe.includes(myGlobal)) {
        updated = updated.map(t => {
          if (t.owner !== turnRef.current && t.step >= 0 && t.step < 51 && getGlobal(t.owner, t.step) === myGlobal) {
            captured = true;
            playSfx('cut');
            toast.success(`💥 ${turnRef.current === 'player' ? 'आपने' : 'Bum Bum Cafe ने'} गोटी काटी!`);
            return { ...t, step: -1 };
          }
          return t;
        });
      }
    }

    setTokens(updated);
    setHasRolled(false);

    // 🏆 जीत की जांच
    const homeCount = updated.filter(t => t.owner === turnRef.current && t.step === 56).length;
    if (homeCount === 2) {
      const winningSide = turnRef.current;
      setWinner(winningSide);
      if (winningSide === 'player') {
        const reward = getRandomReward();
        const code = `BOM-${Math.floor(1000 + Math.random() * 9000)}`;
        setRewardWon(reward);
        setVoucherCode(code);
        confetti({ particleCount: 200, spread: 90 });
        toast.success(`🎉 बधाई हो! आप जीत गए: ${reward}`);
      } else {
        toast.error("😢 Bum Bum Cafe जीत गया! Better luck next time!");
      }
      return;
    }

    // 6 आने पर या गोटी काटने पर दोबारा चाल
    if (rollValue === 6 || captured) {
      if (turnRef.current === 'cafe') {
        setTimeout(() => handleRollDice(true), 700);
      }
    } else {
      switchTurn(false);
    }
  };

  const switchTurn = (extra = false) => {
    setHasRolled(false);
    if (!extra) {
      const next: Player = turnRef.current === 'player' ? 'cafe' : 'player';
      setTurn(next);
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
        lastPrizeWon: rewardWon,
        voucherCode: voucherCode,
        voucherClaimed: false,
        lastPlayedAt: new Date(),
        importSource: 'Ludo1v1'
      }, { merge: true });

      toast.success("🎉 इनाम आपके नंबर पर लॉक हो गया! काउंटर पर नंबर बताएं।");
    } catch {
      toast.error("इनाम सेव करने में त्रुटि आई!");
    } finally {
      setSavingReward(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-[#0c0d12] text-white flex flex-col justify-between items-center p-3 select-none font-sans">
      <Toaster position="top-center" />

      {/* HEADER */}
      <header className="w-full max-w-lg flex justify-between items-center py-2 px-3 border-b border-white/10 shrink-0">
        <button onClick={() => window.history.back()} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-400 to-yellow-500">
            BUM BUM CAFE 1v1 LUDO
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Customer vs Cafe Bot</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={() => { setTokens(tokens.map(t => ({ ...t, step: -1 }))); setWinner(null); setHasRolled(false); setTurn('player'); }} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* 2 PLAYERS HUD CARD */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 my-2 shrink-0">
        <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${turn === 'player' ? 'bg-rose-500 text-white border-white shadow-[0_0_20px_rgba(244,63,94,0.4)] ring-2 ring-white/50' : 'bg-white/5 border-white/10 text-neutral-400 opacity-60'}`}>
          <div className="flex items-center gap-2">
            <User size={18} />
            <div>
              <p className="text-xs font-black uppercase">You (ग्राहक)</p>
              <p className="text-[10px] font-mono">{tokens.filter(t => t.owner === 'player' && t.step === 56).length}/2 In</p>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-rose-400 border border-white" />
        </div>

        <div className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${turn === 'cafe' ? 'bg-amber-500 text-black border-white shadow-[0_0_20px_rgba(245,158,11,0.4)] ring-2 ring-white/50' : 'bg-white/5 border-white/10 text-neutral-400 opacity-60'}`}>
          <div className="flex items-center gap-2">
            <Bot size={18} />
            <div>
              <p className="text-xs font-black uppercase">Bum Bum Cafe ☕</p>
              <p className="text-[10px] font-mono">{tokens.filter(t => t.owner === 'cafe' && t.step === 56).length}/2 In</p>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-amber-400 border border-black" />
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
                  <p className="text-xs text-neutral-300 font-bold">बधाई हो! आपने लूडो में जीता है:</p>
                  
                  <div className="bg-amber-500/10 border-2 border-amber-400 p-3 rounded-2xl">
                    <p className="text-base font-black text-amber-300">{rewardWon}</p>
                    <p className="text-xs font-mono text-neutral-400 mt-1">Voucher: <span className="text-white font-bold">{voucherCode}</span></p>
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
                      {savingReward ? 'सेव हो रहा है...' : 'काउंटर के लिए लॉक करें (Claim)'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full mx-auto flex items-center justify-center">
                    <Bot size={36} />
                  </div>
                  <h2 className="text-xl font-black uppercase text-rose-400">CAFE WON! ☕</h2>
                  <p className="text-xs text-neutral-300 font-bold">इस बार Bum Bum Cafe जीत गया! अगली बार फिर कोशिश करें।</p>
                  <button onClick={() => { setTokens(tokens.map(t => ({ ...t, step: -1 }))); setWinner(null); setTurn('player'); }} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-xs rounded-xl transition-all">
                    Play Again (दोबारा खेलें)
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎯 15×15 ASYMMETRICAL 1v1 BOARD */}
      <div className="w-full max-w-[420px] aspect-square bg-[#fff] border-[6px] border-[#222] rounded-3xl shadow-[0_15px_50px_rgba(0,0,0,0.9)] relative overflow-hidden my-auto p-1">
        
        {/* ग्रिड सेल्स */}
        <div className="w-full h-full grid grid-cols-15 grid-rows-15">
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              if (r < 6 && c < 6) return null; // Red Base
              if (r < 6 && c > 8) return null; // Green (Inactive)
              if (r > 8 && c > 8) return null; // Yellow Base (Cafe)
              if (r > 8 && c < 6) return null; // Blue (Inactive)
              if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return null; // Center

              const isRedRunway = r === 7 && c >= 1 && c <= 5;
              const isYellowRunway = r === 7 && c >= 9 && c <= 13;
              const isRedStart = r === 6 && c === 1;
              const isYellowStart = r === 8 && c === 13;
              const isStar = STAR_COORDS.some(([sr, sc]) => sr === r && sc === c);

              let bg = 'bg-white';
              if (isRedRunway || isRedStart) bg = 'bg-rose-500';
              if (isYellowRunway || isYellowStart) bg = 'bg-amber-400';

              return (
                <div
                  key={`${r}-${c}`}
                  style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
                  className={`border-[0.5px] border-neutral-300 relative flex items-center justify-center ${bg}`}
                >
                  {isStar && <span className={`text-[11px] font-black ${bg === 'bg-white' ? 'text-neutral-400' : 'text-white'}`}>★</span>}
                </div>
              );
            })
          )}
        </div>

        {/* 🔴 RED BASE (PLAYER) */}
        <div className="absolute top-1 left-1 w-[40%] h-[40%] bg-rose-500 rounded-2xl p-2.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1].map(i => <div key={i} className="rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center" />)}
            <div className="col-span-2 text-center text-[10px] font-black text-rose-600 uppercase">You (Player)</div>
          </div>
        </div>

        {/* 🟡 YELLOW BASE (CAFE BOT) */}
        <div className="absolute bottom-1 right-1 w-[40%] h-[40%] bg-amber-400 rounded-2xl p-2.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full bg-white rounded-xl shadow-inner grid grid-cols-2 grid-rows-2 p-2 gap-2">
            {[0, 1].map(i => <div key={i} className="rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center" />)}
            <div className="col-span-2 text-center text-[10px] font-black text-amber-700 uppercase">Bum Bum Cafe</div>
          </div>
        </div>

        {/* INACTIVE CORNERS */}
        <div className="absolute top-1 right-1 w-[40%] h-[40%] bg-neutral-100 rounded-2xl p-2.5 flex items-center justify-center opacity-40 border border-neutral-300">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Cafe Zone</span>
        </div>
        <div className="absolute bottom-1 left-1 w-[40%] h-[40%] bg-neutral-100 rounded-2xl p-2.5 flex items-center justify-center opacity-40 border border-neutral-300">
          <span className="text-[10px] font-bold text-neutral-400 uppercase">Cafe Zone</span>
        </div>

        {/* 🏆 CENTER TRIANGLES */}
        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon points="0,0 50,50 0,100" fill="#f43f5e" />
            <polygon points="100,0 50,50 100,100" fill="#f59e0b" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Trophy size={18} className="text-white drop-shadow-md" />
          </div>
        </div>

        {/* ♟️ 4 DYNAMIC TOKENS */}
        {tokens.map(token => {
          const [r, c] = getTokenCoords(token);
          const isMyTurn = token.owner === turn;
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
              onClick={() => {
                if (turn === 'player') handleMoveToken(token);
              }}
              className="absolute z-30 flex items-center justify-center p-0.5 cursor-pointer"
            >
              <motion.div
                animate={canMove && turn === 'player' ? { scale: [1, 1.25, 1], y: [0, -4, 0] } : { scale: 1 }}
                transition={canMove ? { repeat: Infinity, duration: 0.6 } : {}}
                className={`w-full h-full rounded-full border-2 border-white shadow-[0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center relative ${
                  token.owner === 'player' ? 'bg-gradient-to-tr from-rose-700 to-rose-400' : 'bg-gradient-to-tr from-amber-600 to-amber-300'
                } ${canMove && turn === 'player' ? 'ring-2 ring-white shadow-[0_0_12px_#fff]' : ''}`}
              >
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
          <p className={`text-base font-black uppercase flex items-center gap-1.5 ${turn === 'player' ? 'text-rose-500' : 'text-amber-400'}`}>
            <span className={`w-3 h-3 rounded-full ${turn === 'player' ? 'bg-rose-500' : 'bg-amber-400'}`} />
            {turn === 'player' ? 'आपकी चाल (Your Turn)' : 'Bum Bum Cafe (खेल रहा है...)'}
          </p>
          <span className="text-[10px] text-neutral-500 font-bold">
            {turn === 'player' ? (hasRolled ? '👉 अपनी गोटी पर टैप करें' : 'पासा फेंकें') : 'कंप्यूटर सोच रहा है...'}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleRollDice(false)}
          disabled={rolling || hasRolled || turn !== 'player' || !!winner}
          className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-mono font-black text-3xl shadow-xl transition-all ${
            hasRolled || turn !== 'player'
              ? 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed'
              : 'bg-rose-500 border-white text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
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
