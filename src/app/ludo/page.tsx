'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, VolumeX, Bot, User, Gift, Phone, ArrowRight, Loader2, Swords, Play, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

type Player = 'player' | 'cafe'; 
// Player = Red (Bottom-Left), Cafe = Yellow (Top-Right)

interface Token {
  id: number;
  owner: Player;
  slotIndex: number;
  step: number; // -1 = Base, 0 to 50 = Track, 51 to 55 = Runway, 56 = Home
}

// 15x15 ट्रैक कोऑर्डिनेट्स [row, col] - स्टैंडर्ड लूडो ट्रैक
const BOARD_PATH: [number, number][] = [
  // Red Track Starts (Row 13 Col 6 going up & clockwise)
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], // Left Arrow
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], // Top junction
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], // Right junction
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], // Bottom Junction
  [14, 6]  // Red entrance
];

const START_OFFSETS: Record<Player, number> = {
  player: 0,
  cafe: 26
};

const RUNWAYS: Record<Player, [number, number][]> = {
  player: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // Red Runway (Bottom to Center)
  cafe: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]]       // Yellow Runway (Top to Center)
};

const BASE_POCKETS: Record<Player, [number, number][]> = {
  player: [[11.5, 1.8], [11.5, 3.8]], // Red Base Inside
  cafe: [[2.5, 10.8], [2.5, 12.8]]    // Yellow Base Inside
};

// 🔊 SINGLETON AUDIO ENGINE (हमेशा एक्टिव रहने वाली लाउड आवाज़)
let globalAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

export default function AuthenticLudoKingVsCafe() {
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

  // हर कोने का अलग डाइस स्टेट
  const [seatDiceValues, setSeatDiceValues] = useState<Record<Player, number | null>>({
    player: null,
    cafe: null,
  });

  // 75% बार कैफे ही जीतेगा, 25% ग्राहक
  const [targetWinner, setTargetWinner] = useState<Player>(() => Math.random() < 0.75 ? 'cafe' : 'player');
  const [winner, setWinner] = useState<Player | null>(null);
  const [voucherCode, setVoucherCode] = useState('');

  // 2-2 गोटियां
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

  // 🔊 LOUD AUDIO ENGINE
  const playSfx = (type: 'roll' | 'step' | 'cut' | 'win' | 'cheer') => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'roll') {
      // 🎲 Dice Rattle & Bell Ring
      for (let i = 0; i < 7; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(260 + Math.random() * 320, now + i * 0.035);
        gain.gain.setValueAtTime(0.35, now + i * 0.035);
        gain.gain.linearRampToValueAtTime(0.01, now + i * 0.035 + 0.032);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.035);
        osc.stop(now + i * 0.035 + 0.032);
      }
      const ringOsc = ctx.createOscillator();
      const ringGain = ctx.createGain();
      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(1250, now);
      ringOsc.frequency.exponentialRampToValueAtTime(980, now + 0.35);
      ringGain.gain.setValueAtTime(0.48, now);
      ringGain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
      ringOsc.connect(ringGain);
      ringGain.connect(ctx.destination);
      ringOsc.start(now);
      ringOsc.stop(now + 0.35);
    } else if (type === 'step') {
      // 🪵 Solid Wooden Step Tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'cut') {
      // ⚔️ Loud Sword Slash / Capture
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.38);
      gain.gain.setValueAtTime(0.65, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'cheer') {
      // 🎯 Home Entry Bonus Sound
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.18);
      });
    } else if (type === 'win') {
      // 🎺 Grand Victory Fanfare
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.13);
        gain.gain.setValueAtTime(0.45, now + idx * 0.13);
        gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.13 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.13);
        osc.stop(now + idx * 0.13 + 0.28);
      });
    }
  };

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

    getAudioContext();

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

  // 🔥 75% सस्पेंस भरा लड़ाकू पासा (Aggressive Clash Engine)
  const getBiasedDiceRoll = (playerTurn: Player): number => {
    const raw = Math.floor(Math.random() * 6) + 1;
    const currentTokens = tokensRef.current;
    const playerTokens = currentTokens.filter(t => t.owner === 'player');
    const cafeTokens = currentTokens.filter(t => t.owner === 'cafe');

    const activeTokens = playerTurn === 'player' ? playerTokens : cafeTokens;
    const enemyTokens = playerTurn === 'player' ? cafeTokens : playerTokens;

    // ⚔️ 1. गोटी काटने का मौका पहले तलाशें (अति-रोमांचक लड़ाई)
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

      // 60% चांस कि मुकाबला रोमांचक करने के लिए गोटी काटने वाला अंक निकलेगा!
      if (canKill && Math.random() < 0.6) return r;
    }

    // 2. शुरुआत में दोनों की गोटियां फटाफट बाहर निकालना ताकि खेल में जान आए
    const inBaseCount = activeTokens.filter(t => t.step === -1).length;
    if (inBaseCount > 0 && Math.random() < 0.5) {
      return 6;
    }

    const isPlayerNearWinning = playerTokens.some(t => t.step >= 53) || playerTokens.filter(t => t.step === 56).length === 1;

    // 75% बार कैफ़े की जीत तय करने का ड्रामा
    if (targetWinner === 'cafe') {
      if (playerTurn === 'player') {
        if (isPlayerNearWinning) {
          const needed = playerTokens.map(t => 56 - t.step).filter(d => d > 0 && d <= 6);
          if (needed.length > 0 && Math.random() < 0.85) {
            const wrong = [1, 2, 3, 4, 5, 6].filter(n => !needed.includes(n));
            if (wrong.length > 0) return wrong[Math.floor(Math.random() * wrong.length)];
          }
        }
      } else {
        if (isPlayerNearWinning) {
          const inBase = cafeTokens.some(t => t.step === -1);
          if (inBase) return 6;
          return Math.random() < 0.65 ? 6 : 5;
        }
      }
    }

    return raw;
  };

  const handleRollDice = (seat: Player, isBot = false) => {
    if (rollingRef.current || winnerRef.current || hasRolledRef.current || isAnimatingMoveRef.current) return;
    if (turnRef.current !== seat) return;
    if (seat === 'cafe' && !isBot) return;

    setRolling(true);
    playSfx('roll');

    let counter = 0;
    const timer = setInterval(() => {
      const temp = Math.floor(Math.random() * 6) + 1;
      setDice(temp);
      setSeatDiceValues(prev => ({ ...prev, [seat]: temp }));
      counter++;
      if (counter > 7) {
        clearInterval(timer);
        const finalVal = getBiasedDiceRoll(turnRef.current);
        setDice(finalVal);
        setSeatDiceValues(prev => ({ ...prev, [seat]: finalVal }));
        setRolling(false);
        setHasRolled(true);
        postRollEvaluation(finalVal, turnRef.current);
      }
    }, 40);
  };

  useEffect(() => {
    if (isCustomerVerified && turn === 'cafe' && !rolling && !hasRolled && !winner && !isAnimatingMove) {
      const botTimer = setTimeout(() => {
        handleRollDice('cafe', true);
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
        const curTokens = tokensRef.current;
        // ⚔️ बोट की पहली प्राथमिकता: ग्राहक की गोटी काटना
        const killMove = movable.find(t => {
          const targetStep = t.step === -1 ? 0 : t.step + rollVal;
          const targetGlobal = (START_OFFSETS.cafe + targetStep) % 52;
          return curTokens.some(other => other.owner === 'player' && other.step >= 0 && other.step < 51 && (START_OFFSETS.player + other.step) % 52 === targetGlobal);
        });

        // 🏠 दूसरी प्राथमिकता: होम में घुसना
        const winMove = movable.find(t => t.step + rollVal === 56);
        // 🟢 तीसरी प्राथमिकता: 6 आने पर नई गोटी बाहर निकालना
        const baseMove = movable.find(t => t.step === -1);
        const forwardMove = [...movable].sort((a, b) => b.step - a.step)[0];

        const chosen = killMove || winMove || baseMove || forwardMove || movable[0];
        handleMoveToken(chosen, rollVal);
      }, 600);
    } else if (movable.length === 1 && movable[0].step === -1 && rollVal === 6) {
      setTimeout(() => handleMoveToken(movable[0], rollVal), 400);
    }
  };

  // 🚶‍♂️ 300ms धीमा एक-एक कदम चलना + बोनस चांस लॉजिक
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
      await new Promise(r => setTimeout(r, 320));
    } else {
      let currentStep = token.step;
      for (let i = 1; i <= rollValue; i++) {
        currentStep += 1;
        playSfx('step');
        setTokens(prev => prev.map(t => t.id === token.id ? { ...t, step: currentStep } : t));
        await new Promise(r => setTimeout(r, 300));
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
    let enteredHome = (finalStep === 56);

    // ⚔️ 1. गोटी काटना
    if (myGlobal !== -1) {
      const safe = [0, 8, 13, 21, 26, 34, 39, 47];
      if (!safe.includes(myGlobal)) {
        updated = updated.map(t => {
          if (t.owner !== turnRef.current && t.step >= 0 && t.step < 51 && getGlobal(t.owner, t.step) === myGlobal) {
            captured = true;
            playSfx('cut');
            toast.success(`⚔️ ${turnRef.current === 'player' ? 'आपने' : 'Bum Bum Cafe ने'} गोटी काटी! बोनस चांस 🎯`);
            return { ...t, step: -1 };
          }
          return t;
        });
        setTokens(updated);
      }
    }

    // 🏠 2. गोटी होम (Home) पहुंची तो स्पेशल साउंड
    if (enteredHome) {
      playSfx('cheer');
      toast.success(`🎉 गोटी घर (Home) पहुंची! बोनस चांस मिला 🎯`, { duration: 2000 });
    }

    setIsAnimatingMove(false);

    // 🏆 जीत की जांच
    const homeCount = updated.filter(t => t.owner === turnRef.current && t.step === 56).length;
    if (homeCount === 2) {
      const winningSide = turnRef.current;
      setWinner(winningSide);
      playSfx('win');

      if (winningSide === 'player') {
        const code = `BOM-MANCHURIAN-${Math.floor(1000 + Math.random() * 9000)}`;
        setVoucherCode(code);
        confetti({ particleCount: 240, spread: 90 });
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
        toast.error("😱 ओह्ह! कैफ़े ने मैच निकाल लिया! Manchurian हाथ से निकल गया!");
      }
      return;
    }

    // 🎁 LUDO KING RULE: 6 आने पर, गोटी काटने पर, या गोटी होम पहुंचने पर दोबारा पासा फेंकने का मौका (Extra Turn)!
    if (rollValue === 6 || captured || enteredHome) {
      if (rollValue === 6 && !captured && !enteredHome) {
        toast('6 आया! फिर से पासा फेंकें 🎯', { duration: 1500 });
      }
      
      // अगर कैफे को बोनस मिला तो वह फिर से पासा फेकेगा
      if (turnRef.current === 'cafe') {
        setTimeout(() => handleRollDice('cafe', true), 750);
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
    setSeatDiceValues({ player: null, cafe: null });
    setTurn('player');
    setTargetWinner(Math.random() < 0.75 ? 'cafe' : 'player');
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
    // 🏠 Home Inside Positions (Ludo King style sharp diagonal placement inside center)
    if (t.owner === 'player') {
      return t.slotIndex === 0 ? [7.6, 6.8] : [7.6, 7.6];
    } else {
      return t.slotIndex === 0 ? [6.8, 7.6] : [7.2, 7.8];
    }
  };

  // 🎲 3D LUDO KING PIN TOKEN COMPONENT
  const render3DPinToken = (color: string) => (
    <svg viewBox="0 0 32 44" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
      <ellipse cx="16" cy="40" rx="10" ry="3.5" fill="#000" opacity="0.3" />
      <path
        d="M16 2 C8.2 2 2 8.2 2 16 C2 26 16 41 16 41 C16 41 30 26 30 16 C30 8.2 23.8 2 16 2 Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth="2"
      />
      <circle cx="16" cy="15" r="5.5" fill="#ffffff" opacity="0.85" />
      <circle cx="14" cy="13" r="2" fill="#ffffff" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col justify-between items-center p-2 sm:p-4 select-none font-sans">
      <Toaster position="top-center" />

      {/* 🥟 लॉगिन बॉक्स (इनाम के साथ) */}
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

      {/* 🔝 TOP-RIGHT FLOATING CAFE DICE BOX (Ludo King Style Screenshot 16) */}
      <div className="w-full max-w-[420px] flex justify-end items-center my-1 pr-1 shrink-0">
        <div className={`flex items-center gap-2 p-1.5 px-3 rounded-2xl border transition-all ${
          turn === 'cafe' ? 'bg-[#ffc20e]/20 border-[#ffc20e] shadow-[0_0_15px_rgba(255,194,14,0.4)]' : 'bg-white/5 border-white/10 opacity-60'
        }`}>
          {turn === 'cafe' && (
            <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-base text-yellow-400">
              👉
            </motion.span>
          )}
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-[#ffc20e]">Bum Bum Cafe ☕</p>
            <p className="text-[9px] font-mono text-neutral-400">{tokens.filter(t => t.owner === 'cafe' && t.step === 56).length}/2 Home</p>
          </div>
          <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center font-mono font-black text-2xl shadow-md ${
            turn === 'cafe' ? 'bg-[#ffc20e] border-white text-black' : 'bg-neutral-800 border-neutral-700 text-neutral-500'
          }`}>
            {turn === 'cafe' && rolling ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.25 }}>🎲</motion.span>
            ) : (
              seatDiceValues.cafe !== null ? seatDiceValues.cafe : '🎲'
            )}
          </div>
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

      {/* 🎯 SHARP 15×15 SVG BOARD (Exact Vector Matching) */}
      <div className="w-full max-w-[420px] aspect-square bg-white border-[6px] border-[#000] shadow-[0_15px_50px_rgba(0,0,0,0.9)] relative overflow-hidden my-auto">
        <svg viewBox="0 0 15 15" className="w-full h-full block">
          {/* ग्रिड सेल्स (1.0 × 1.0 Units) */}
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              if (r < 6 && c < 6) return null;
              if (r < 6 && c > 8) return null;
              if (r > 8 && c < 6) return null;
              if (r > 8 && c > 8) return null;
              if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return null;

              const isGreenRunway = r === 7 && c >= 1 && c <= 5;
              const isYellowRunway = c === 7 && r >= 1 && r <= 5;
              const isBlueRunway = r === 7 && c >= 9 && c <= 13;
              const isRedRunway = c === 7 && r >= 9 && r <= 13;

              const isGreenStart = r === 6 && c === 1;
              const isYellowStart = r === 1 && c === 8;
              const isBlueStart = r === 8 && c === 13;
              const isRedStart = r === 13 && c === 6;

              let fill = '#ffffff';
              if (isGreenRunway || isGreenStart) fill = '#00a651';
              if (isYellowRunway || isYellowStart) fill = '#ffc20e';
              if (isBlueRunway || isBlueStart) fill = '#00aeef';
              if (isRedRunway || isRedStart) fill = '#ed1c24';

              const isGreenStar = r === 8 && c === 2;
              const isYellowStar = r === 2 && c === 6;
              const isBlueStar = r === 6 && c === 12;
              const isRedStar = r === 12 && c === 8;
              if (isGreenStar || isYellowStar || isBlueStar || isRedStar) fill = '#e2e8f0';

              return (
                <rect
                  key={`cell-${r}-${c}`}
                  x={c}
                  y={r}
                  width="1"
                  height="1"
                  fill={fill}
                  stroke="#000000"
                  strokeWidth="0.04"
                />
              );
            })
          )}

          {/* 4 कोनों के पक्के बेस */}
          {/* Top-Left Green Base */}
          <rect x="0" y="0" width="6" height="6" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <rect x="1" y="1" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="2" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="2" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="4" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="4" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />

          {/* Top-Right Yellow Base (Bum Bum Cafe ☕) */}
          <rect x="9" y="0" width="6" height="6" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <rect x="10" y="1" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="2" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="2" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="4" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="4" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <text x="12" y="3.15" fontSize="0.45" fontWeight="900" textAnchor="middle" fill="#78350f">CAFE ☕</text>

          {/* Bottom-Left Red Base (Customer / You) */}
          <rect x="0" y="9" width="6" height="6" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <rect x="1" y="10" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="11" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="11" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="13" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="13" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <text x="3" y="12.15" fontSize="0.45" fontWeight="900" textAnchor="middle" fill="#7f1d1d">{customerName ? customerName.slice(0, 6) : 'YOU'}</text>

          {/* Bottom-Right Blue Base */}
          <rect x="9" y="9" width="6" height="6" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <rect x="10" y="10" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="11" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="11" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="13" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="13" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />

          {/* 3. बीच के 4 तिकोने (Home Center) */}
          <polygon points="6,6 9,6 7.5,7.5" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <polygon points="9,6 9,9 7.5,7.5" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <polygon points="6,9 9,9 7.5,7.5" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <polygon points="6,6 6,9 7.5,7.5" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <rect x="6" y="6" width="3" height="3" fill="none" stroke="#000" strokeWidth="0.05" />

          {/* तीर व सितारे */}
          <text x="0.5" y="7.7" fontSize="0.65" textAnchor="middle" fill="#00a651" fontWeight="bold">➡</text>
          <text x="7.5" y="0.75" fontSize="0.65" textAnchor="middle" fill="#ffc20e" fontWeight="bold">⬇</text>
          <text x="14.5" y="7.7" fontSize="0.65" textAnchor="middle" fill="#00aeef" fontWeight="bold">⬅</text>
          <text x="7.5" y="14.75" fontSize="0.65" textAnchor="middle" fill="#ed1c24" fontWeight="bold">⬆</text>

          <text x="2.5" y="8.75" fontSize="0.6" textAnchor="middle" fill="#334155" fontWeight="bold">★</text>
          <text x="6.5" y="2.75" fontSize="0.6" textAnchor="middle" fill="#334155" fontWeight="bold">★</text>
          <text x="12.5" y="6.75" fontSize="0.6" textAnchor="middle" fill="#334155" fontWeight="bold">★</text>
          <text x="8.5" y="12.75" fontSize="0.6" textAnchor="middle" fill="#334155" fontWeight="bold">★</text>
        </svg>

        {/* ♟️ 3D LUDO KING PIN TOKENS (PIXEL-PERFECT POSITIONING) */}
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
              className="absolute z-30 flex items-center justify-center p-[1px] cursor-pointer"
            >
              <motion.div
                animate={canMove && turn === 'player' ? { scale: [1, 1.25, 1], y: [0, -4, 0] } : { scale: 1 }}
                transition={canMove ? { repeat: Infinity, duration: 0.6 } : {}}
                className={`w-full h-full flex items-center justify-center relative ${
                  canMove && turn === 'player' ? 'filter drop-shadow-[0_0_8px_#fff]' : ''
                }`}
              >
                {render3DPinToken(token.owner === 'player' ? '#ed1c24' : '#ffc20e')}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* 🔻 BOTTOM-LEFT FLOATING PLAYER DICE BOX (Ludo King Style Screenshot 15 & 17) */}
      <div className="w-full max-w-[420px] flex justify-between items-center my-1 pl-1 shrink-0">
        <div className={`flex items-center gap-2 p-1.5 px-3 rounded-2xl border transition-all ${
          turn === 'player' ? 'bg-[#ed1c24]/20 border-[#ed1c24] shadow-[0_0_15px_rgba(237,28,36,0.4)]' : 'bg-white/5 border-white/10 opacity-60'
        }`}>
          <motion.button
            whileTap={turn === 'player' && !hasRolled && !rolling ? { scale: 0.9 } : {}}
            onClick={() => handleRollDice('player', false)}
            disabled={turn !== 'player' || hasRolled || rolling || isAnimatingMove || !isCustomerVerified}
            className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-black text-2xl shadow-lg transition-all ${
              turn === 'player' && !hasRolled
                ? 'bg-[#ed1c24] border-white text-white animate-pulse shadow-[0_0_15px_rgba(237,28,36,0.5)] cursor-pointer'
                : 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed'
            }`}
          >
            {turn === 'player' && rolling ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.25 }}>🎲</motion.span>
            ) : (
              seatDiceValues.player !== null ? seatDiceValues.player : '🎲'
            )}
          </motion.button>
          
          <div>
            <p className="text-xs font-black uppercase text-[#ed1c24] truncate max-w-[100px]">{customerName || 'You (आप)'}</p>
            <p className="text-[9px] font-mono text-neutral-400">{tokens.filter(t => t.owner === 'player' && t.step === 56).length}/2 Home</p>
          </div>
          {turn === 'player' && !hasRolled && (
            <motion.span animate={{ x: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="text-base text-rose-400">
              👈
            </motion.span>
          )}
        </div>

        {/* STATUS HINT */}
        <p className="text-[10px] text-neutral-400 font-bold pr-2">
          {isAnimatingMove ? 'गोटी चल रही है...' : (turn === 'player' 
            ? (hasRolled ? '👉 अपनी गोटी पर टैप करें' : '👉 पासा फेंकने के लिए टैप करें') 
            : '🤖 कैफ़े खेल रहा है...')}
        </p>
      </div>
    </div>
  );
}
