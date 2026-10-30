'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, VolumeX, Bot, User, Gift, Phone, ArrowRight, Loader2, Swords, Users, Share2, LogIn, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

type SeatId = 'p1' | 'p2' | 'p3' | 'cafe';

interface PlayerSlot {
  seat: SeatId;
  name: string;
  phone: string;
  colorName: string;
  hex: string;
  baseLabel: string;
  joined: boolean;
  isBot?: boolean;
}

interface Token {
  id: number;
  ownerSeat: SeatId;
  slotIndex: number;
  step: number; // -1 = Base, 0 to 50 = Track, 51 to 55 = Runway, 56 = Home
}

// 15x15 ग्रिड के 52 मुख्य ट्रैक कोऑर्डिनेट्स [row, col] (Standard Clockwise Track)
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

// हर बेस का अपना एग्जिट पॉइंट (Start Offsets on 52-cell track)
const START_OFFSETS: Record<SeatId, number> = {
  p1: 0,   // Red (Bottom-Left exit at [13, 6])
  p3: 13,  // Green (Top-Left exit at [6, 1])
  cafe: 26,// Yellow (Top-Right exit at [1, 8])
  p2: 39   // Blue (Bottom-Right exit at [8, 13])
};

// हर बेस के अपने खाने के सामने वाले रनवे (Home Runways)
const RUNWAYS: Record<SeatId, [number, number][]> = {
  p1: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],    // Red Runway (Bottom to Center)
  p3: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],        // Green Runway (Left to Center)
  cafe: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],      // Yellow Runway (Top to Center)
  p2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]     // Blue Runway (Right to Center)
};

// 4 बेस के अंदर 2 गोल पॉकेट्स [row, col]
const BASE_POCKETS: Record<SeatId, [number, number][]> = {
  p3: [[2.5, 1.8], [2.5, 3.8]],    // Top-Left Green Base
  cafe: [[2.5, 10.8], [2.5, 12.8]],// Top-Right Yellow Base (Cafe)
  p1: [[11.5, 1.8], [11.5, 3.8]],  // Bottom-Left Red Base
  p2: [[11.5, 10.8], [11.5, 12.8]] // Bottom-Right Blue Base
};

// 🔊 SINGLETON AUDIO ENGINE (तेज़ रिंग और कभी न रुकने वाली आवाज़)
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

export default function AuthenticLudoVersusCafe() {
  const [gameMode, setGameMode] = useState<'local' | 'online' | null>(null);
  const [onlineAction, setOnlineAction] = useState<'create' | 'join' | null>(null);
  const [friendCount, setFriendCount] = useState<1 | 2 | 3>(1);

  // रूम स्टेट्स
  const [roomId, setRoomId] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [mySeat, setMySeat] = useState<SeatId>('p1');
  const [isSetupDone, setIsSetupDone] = useState(false);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // प्लेयर विवरण
  const [myPhone, setMyPhone] = useState('');
  const [myName, setMyName] = useState('');

  const [players, setPlayers] = useState<Record<SeatId, PlayerSlot>>({
    p1: { seat: 'p1', name: '', phone: '', colorName: 'Red', hex: '#ed1c24', baseLabel: 'Bottom-Left', joined: false },
    p2: { seat: 'p2', name: 'Friend 2', phone: '', colorName: 'Blue', hex: '#00aeef', baseLabel: 'Bottom-Right', joined: false },
    p3: { seat: 'p3', name: 'Friend 3', phone: '', colorName: 'Green', hex: '#00a651', baseLabel: 'Top-Left', joined: false },
    cafe: { seat: 'cafe', name: 'Bum Bum Cafe ☕', phone: '', colorName: 'Yellow', hex: '#ffc20e', baseLabel: 'Top-Right (Boss)', joined: true, isBot: true },
  });

  // गेमप्ले स्टेट्स
  const [turn, setTurn] = useState<SeatId>('p1');
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [isAnimatingMove, setIsAnimatingMove] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 75% कैफे बॉट की जीत
  const [targetWinner, setTargetWinner] = useState<'friends' | 'cafe'>(() => Math.random() < 0.75 ? 'cafe' : 'friends');
  const [winner, setWinner] = useState<'friends' | 'cafe' | null>(null);
  const [winningPlayerName, setWinningPlayerName] = useState('');
  const [voucherCode, setVoucherCode] = useState('');

  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, ownerSeat: 'p1', slotIndex: 0, step: -1 },
    { id: 2, ownerSeat: 'p1', slotIndex: 1, step: -1 },
    { id: 3, ownerSeat: 'p2', slotIndex: 0, step: -1 },
    { id: 4, ownerSeat: 'p2', slotIndex: 1, step: -1 },
    { id: 5, ownerSeat: 'p3', slotIndex: 0, step: -1 },
    { id: 6, ownerSeat: 'p3', slotIndex: 1, step: -1 },
    { id: 7, ownerSeat: 'cafe', slotIndex: 0, step: -1 },
    { id: 8, ownerSeat: 'cafe', slotIndex: 1, step: -1 },
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

  // URL से WhatsApp इनवाइट रूम कोड पढ़ना
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setGameMode('online');
        setOnlineAction('join');
        setInputRoomCode(roomParam.trim().toUpperCase());
        setRoomId(roomParam.trim().toUpperCase());
      }
    }
  }, []);

  // रीयल-टाइम रूम लिसनर (Firestore onSnapshot)
  useEffect(() => {
    if (gameMode !== 'online' || !roomId || !isSetupDone) return;

    const unsub = onSnapshot(doc(db, 'ludo_rooms', roomId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.tokens) setTokens(d.tokens);
        if (d.turn) setTurn(d.turn);
        if (d.dice !== undefined) setDice(d.dice);
        if (d.hasRolled !== undefined) setHasRolled(d.hasRolled);
        if (d.winner) setWinner(d.winner);
        if (d.winningPlayerName) setWinningPlayerName(d.winningPlayerName);
        if (d.voucherCode) setVoucherCode(d.voucherCode);
        if (d.players) setPlayers(d.players);
        if (d.friendCount) setFriendCount(d.friendCount);
      }
    });

    return () => unsub();
  }, [gameMode, roomId, isSetupDone]);

  const syncOnlineRoom = async (updates: any) => {
    if (gameMode === 'online' && roomId) {
      try {
        await updateDoc(doc(db, 'ludo_rooms', roomId), updates);
      } catch {}
    }
  };

  // 🔊 LOUD RING & DICE ROLLING SOUNDS
  const playSfx = (type: 'roll' | 'step' | 'cut' | 'win') => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'roll') {
      // 🎲 पासे की खड़खड़ाहट
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
      // 🔔 लाउड रिंगिंग बेल टोन
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
      // 🪵 लकड़ी की ठोस 'टक' आवाज़
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
      // ⚔️ जोरदार स्लैश
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'win') {
      // 🎺 जीत का बिगुल
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

  const handlePhoneLookup = async (phoneStr: string) => {
    const clean = phoneStr.replace(/\D/g, '').slice(0, 10);
    setMyPhone(clean);

    if (clean.length === 10) {
      setIsCheckingPhone(true);
      try {
        const snap = await getDoc(doc(db, 'customer_points', clean));
        if (snap.exists() && snap.data().name) {
          setMyName(snap.data().name);
          toast.success(`नमस्ते ${snap.data().name}! 👋`);
        }
      } catch {}
      setIsCheckingPhone(false);
    }
  };

  const handleCreateOnlineRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myPhone.length !== 10 || !myName.trim()) return toast.error("फ़ोन नंबर और नाम दर्ज करें!");

    getAudioContext();
    const newRoomCode = `ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
    setRoomId(newRoomCode);
    setMySeat('p1');

    const updatedPlayers = {
      ...players,
      p1: { ...players.p1, name: myName.trim(), phone: myPhone, joined: true },
    };
    setPlayers(updatedPlayers);

    await setDoc(doc(db, 'ludo_rooms', newRoomCode), {
      roomId: newRoomCode,
      createdAt: new Date(),
      targetWinner,
      turn: 'p1',
      dice: null,
      hasRolled: false,
      winner: null,
      players: updatedPlayers,
      friendCount,
      tokens
    });

    setIsSetupDone(true);
    toast.success(`रूम तैयार: ${newRoomCode}! WhatsApp पर इनवाइट भेजें! 🎉`);
  };

  const handleJoinOnlineRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = (inputRoomCode || roomId).trim().toUpperCase();
    if (!targetRoom) return toast.error("रूम कोड डालें!");
    if (myPhone.length !== 10 || !myName.trim()) return toast.error("फ़ोन नंबर और नाम दर्ज करें!");

    getAudioContext();
    setIsCheckingPhone(true);

    try {
      const roomRef = doc(db, 'ludo_rooms', targetRoom);
      const snap = await getDoc(roomRef);

      if (!snap.exists()) {
        setIsCheckingPhone(false);
        return toast.error("❌ यह रूम कोड मौजूद नहीं है!");
      }

      const rData = snap.data();
      const currentPlayers = rData.players;

      // सीट आवंटन: P2 (Blue) या P3 (Green)
      let assignedSeat: SeatId | null = null;
      if (!currentPlayers.p2.joined) assignedSeat = 'p2';
      else if (!currentPlayers.p3.joined) assignedSeat = 'p3';

      if (!assignedSeat) {
        setIsCheckingPhone(false);
        return toast.error("⚠️ यह रूम पहले से फुल है!");
      }

      currentPlayers[assignedSeat] = {
        ...currentPlayers[assignedSeat],
        name: myName.trim(),
        phone: myPhone,
        joined: true
      };

      await updateDoc(roomRef, {
        players: currentPlayers,
        friendCount: Math.max(rData.friendCount || 1, assignedSeat === 'p2' ? 2 : 3)
      });

      setRoomId(targetRoom);
      setMySeat(assignedSeat);
      setPlayers(currentPlayers);
      setIsSetupDone(true);
      toast.success(`जुड़े! आपका बेस ${currentPlayers[assignedSeat].colorName} (${currentPlayers[assignedSeat].baseLabel}) है 🎮`);
    } catch {
      toast.error("रूम से जुड़ने में त्रुटि आई!");
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const handleShareWhatsAppInvite = () => {
    if (!roomId) return;
    const shareUrl = `${window.location.origin}/ludo?room=${roomId}`;
    const text = `🍕 *BUM BUM CAFE LUDO RAID!*\n\nसाथ मिलकर Bum Bum Cafe को लूडो में हराते हैं और *1x Veg Manchurian Half FREE* जीतते हैं! 🥟\n\n👉 रूम से जुड़ने के लिए लिंक दबाएं:\n${shareUrl}\n\nरूम कोड: *${roomId}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // 🎲 75% बायस्ड डाइस लॉजिक
  const getBiasedDiceRoll = (currentSeat: SeatId): number => {
    const raw = Math.floor(Math.random() * 6) + 1;
    const curTokens = tokensRef.current;
    const cafeTokens = curTokens.filter(t => t.ownerSeat === 'cafe');
    const friendTokens = curTokens.filter(t => t.ownerSeat !== 'cafe');

    if (currentSeat === 'cafe') {
      for (let r = 1; r <= 6; r++) {
        const canKill = cafeTokens.some(t => {
          if (t.step === -1) return false;
          const targetStep = t.step + r;
          if (targetStep > 50) return false;
          const targetGlobal = (START_OFFSETS.cafe + targetStep) % 52;
          const safe = [0, 8, 13, 21, 26, 34, 39, 47];
          if (safe.includes(targetGlobal)) return false;

          return friendTokens.some(f => f.step >= 0 && f.step < 51 && (START_OFFSETS[f.ownerSeat] + f.step) % 52 === targetGlobal);
        });
        if (canKill && Math.random() < 0.65) return r;
      }
    }

    if (targetWinner === 'cafe') {
      if (currentSeat === 'cafe') {
        const inBase = cafeTokens.some(t => t.step === -1);
        if (inBase && Math.random() < 0.6) return 6;
        if (Math.random() < 0.5) return Math.random() < 0.5 ? 5 : 6;
      } else {
        const nearWinning = friendTokens.some(t => t.step >= 53);
        if (nearWinning && Math.random() < 0.8) {
          return Math.floor(Math.random() * 4) + 1;
        }
      }
    }

    return raw;
  };

  // 🔒 कड़ा पहरा: जिसकी बारी है सिर्फ वही पासा फेंक सकता है
  const handleRollDice = (isBot = false) => {
    if (rollingRef.current || winnerRef.current || hasRolledRef.current || isAnimatingMoveRef.current) return;
    
    // अगर ऑनलाइन है और आपकी बारी नहीं है तो ब्लॉक करें
    if (gameMode === 'online' && turnRef.current !== mySeat && !isBot) {
      return toast.error(`अभी आपकी बारी नहीं है! ${players[turnRef.current].name} की चाल का इंतज़ार करें। ⏳`);
    }
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
        syncOnlineRoom({ dice: finalVal, hasRolled: true });
        postRollEvaluation(finalVal, turnRef.current);
      }
    }, 40);
  };

  useEffect(() => {
    if (isSetupDone && turn === 'cafe' && !rolling && !hasRolled && !winner && !isAnimatingMove) {
      const botTimer = setTimeout(() => {
        handleRollDice(true);
      }, 700);
      return () => clearTimeout(botTimer);
    }
  }, [turn, hasRolled, rolling, winner, isAnimatingMove, isSetupDone]);

  const postRollEvaluation = (rollVal: number, currentSeat: SeatId) => {
    const myTokens = tokensRef.current.filter(t => t.ownerSeat === currentSeat);
    const movable = myTokens.filter(t => {
      if (t.step === -1 && rollVal === 6) return true;
      if (t.step >= 0 && t.step + rollVal <= 56) return true;
      return false;
    });

    if (movable.length === 0) {
      if (currentSeat !== 'cafe') toast('चाल नहीं बन पाई! ⏭️', { duration: 1200 });
      setTimeout(() => switchTurn(false), 900);
    } else if (currentSeat === 'cafe') {
      setTimeout(() => {
        const curTokens = tokensRef.current;
        const killMove = movable.find(t => {
          const targetStep = t.step === -1 ? 0 : t.step + rollVal;
          const targetGlobal = (START_OFFSETS.cafe + targetStep) % 52;
          return curTokens.some(other => other.ownerSeat !== 'cafe' && other.step >= 0 && other.step < 51 && (START_OFFSETS[other.ownerSeat] + other.step) % 52 === targetGlobal);
        });

        const winMove = movable.find(t => t.step + rollVal === 56);
        const baseMove = movable.find(t => t.step === -1);
        const forwardMove = [...movable].sort((a, b) => b.step - a.step)[0];

        const chosen = killMove || winMove || baseMove || forwardMove || movable[0];
        handleMoveToken(chosen, rollVal);
      }, 600);
    } else if (movable.length === 1 && movable[0].step === -1 && rollVal === 6) {
      setTimeout(() => handleMoveToken(movable[0], rollVal), 400);
    }
  };

  // 🚶‍♂️ 300ms धीमा एक-एक कदम चलना
  const handleMoveToken = async (token: Token, rollValue: number | null = diceRef.current) => {
    if (!hasRolledRef.current || rollValue === null || isAnimatingMoveRef.current) {
      return toast.error("पहले पासा फेंकें! 🎲");
    }

    if (token.ownerSeat !== turnRef.current || winnerRef.current) return;
    if (gameMode === 'online' && token.ownerSeat !== mySeat && token.ownerSeat !== 'cafe') return;

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
        await new Promise(r => setTimeout(r, 300)); // इत्मीनान से 300ms चाल
      }
    }

    const finalStep = token.step === -1 ? 0 : token.step + rollValue;

    const getGlobal = (s: SeatId, step: number) => {
      if (step < 0 || step >= 51) return -1;
      return (START_OFFSETS[s] + step) % 52;
    };

    let updated = tokensRef.current;
    const myGlobal = getGlobal(turnRef.current, finalStep);
    let captured = false;

    if (myGlobal !== -1) {
      const safe = [0, 8, 13, 21, 26, 34, 39, 47];
      if (!safe.includes(myGlobal)) {
        updated = updated.map(t => {
          const isEnemy = turnRef.current === 'cafe' ? t.ownerSeat !== 'cafe' : t.ownerSeat === 'cafe';

          if (isEnemy && t.step >= 0 && t.step < 51 && getGlobal(t.ownerSeat, t.step) === myGlobal) {
            captured = true;
            playSfx('cut');
            toast.success(`⚔️ ${players[turnRef.current].name} ने गोटी काटी!`);
            return { ...t, step: -1 };
          }
          return t;
        });
        setTokens(updated);
      }
    }

    setIsAnimatingMove(false);

    // 🏆 जीत की जांच
    const activeFinished = updated.filter(t => t.ownerSeat === turnRef.current && t.step === 56).length;
    if (activeFinished === 2) {
      const isCafe = turnRef.current === 'cafe';
      const winTeam = isCafe ? 'cafe' : 'friends';
      setWinner(winTeam);
      playSfx('win');

      if (!isCafe) {
        const champName = players[turnRef.current].name;
        setWinningPlayerName(champName);
        const code = `BOM-RAID-${Math.floor(1000 + Math.random() * 9000)}`;
        setVoucherCode(code);
        confetti({ particleCount: 260, spread: 100 });
        toast.success(`🎉 गजब! ${champName} और दोस्तों ने कैफे को हरा दिया! सबको Manchurian FREE 🥟`);

        [players.p1, players.p2, players.p3].forEach(p => {
          if (p.phone && p.phone.length === 10) {
            setDoc(doc(db, "customer_points", p.phone), {
              phone: p.phone,
              name: p.name,
              lastPrizeWon: "1x Veg Manchurian (Half) FREE 🥟",
              voucherCode: code,
              voucherClaimed: false,
              lastPlayedAt: new Date(),
              importSource: 'LudoRaid'
            }, { merge: true }).catch(() => {});
          }
        });

        syncOnlineRoom({ winner: 'friends', winningPlayerName: champName, voucherCode: code });
      } else {
        toast.error("😱 ओह्ह! कैफ़े Boss ने सबको हरा दिया! Manchurian हाथ से निकल गया!");
        syncOnlineRoom({ winner: 'cafe' });
      }
      return;
    }

    syncOnlineRoom({ tokens: updated });

    if (rollValue === 6 || captured) {
      toast(rollValue === 6 ? '6 आया! फिर से पासा फेंकें 🎯' : 'गोटी काटी! बोनस चाल ⚔️', { duration: 1500 });
      if (turnRef.current === 'cafe') {
        setTimeout(() => handleRollDice(true), 750);
      }
    } else {
      switchTurn(false);
    }
  };

  const switchTurn = (extra = false) => {
    setHasRolled(false);
    setDice(null);
    if (!extra) {
      const turnSequence: SeatId[] = friendCount === 1 ? ['p1', 'cafe'] : friendCount === 2 ? ['p1', 'p2', 'cafe'] : ['p1', 'p2', 'p3', 'cafe'];
      const currentIdx = turnSequence.indexOf(turnRef.current);
      const nextSeat = turnSequence[(currentIdx + 1) % turnSequence.length];
      setTurn(nextSeat);
      syncOnlineRoom({ turn: nextSeat, dice: null, hasRolled: false });
    }
  };

  const handleRestart = () => {
    const resetTokens: Token[] = [
      { id: 1, ownerSeat: 'p1', slotIndex: 0, step: -1 },
      { id: 2, ownerSeat: 'p1', slotIndex: 1, step: -1 },
      { id: 3, ownerSeat: 'p2', slotIndex: 0, step: -1 },
      { id: 4, ownerSeat: 'p2', slotIndex: 1, step: -1 },
      { id: 5, ownerSeat: 'p3', slotIndex: 0, step: -1 },
      { id: 6, ownerSeat: 'p3', slotIndex: 1, step: -1 },
      { id: 7, ownerSeat: 'cafe', slotIndex: 0, step: -1 },
      { id: 8, ownerSeat: 'cafe', slotIndex: 1, step: -1 },
    ];
    setTokens(resetTokens);
    setWinner(null);
    setHasRolled(false);
    setDice(null);
    setTurn('p1');
    setTargetWinner(Math.random() < 0.75 ? 'cafe' : 'friends');
    syncOnlineRoom({ tokens: resetTokens, winner: null, turn: 'p1', dice: null, hasRolled: false });
  };

  const getTokenCoords = (t: Token): [number, number] => {
    if (t.step === -1) {
      const pocket = BASE_POCKETS[t.ownerSeat]?.[t.slotIndex];
      return pocket ? [pocket[0], pocket[1]] : [0, 0];
    }
    if (t.step >= 0 && t.step < 51) {
      const idx = (START_OFFSETS[t.ownerSeat] + t.step) % 52;
      const pt = BOARD_PATH[idx];
      return pt ? [pt[0], pt[1]] : [0, 0];
    }
    if (t.step >= 51 && t.step < 56) {
      const rw = RUNWAYS[t.ownerSeat]?.[t.step - 51];
      return rw ? [rw[0], rw[1]] : [7, 7];
    }
    return [7, 7];
  };

  const isMyTurnNow = gameMode === 'local' ? (turn !== 'cafe') : (mySeat === turn);

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col justify-between items-center p-2 sm:p-4 select-none font-sans">
      <Toaster position="top-center" />

      {/* 🎮 MODE SELECTION & SETUP POPUP */}
      <AnimatePresence>
        {!isSetupDone && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl p-3 text-center space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 flex items-center justify-center gap-1">
                  <Gift size={13} /> Co-op Cafe Challenge
                </span>
                <p className="text-sm font-black text-white">
                  हराओ कैफे को और पाओ: <br />
                  <span className="text-amber-400 text-base">1x Veg Manchurian (Half) FREE! 🥟</span>
                </p>
              </div>

              {!gameMode ? (
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-black uppercase text-neutral-400 text-center">खेलने का तरीका चुनें:</p>
                  
                  <button
                    onClick={() => setGameMode('local')}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center">
                        <Users size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black uppercase text-white group-hover:text-amber-400">Option A: 1 ही फ़ोन पर खेलें</p>
                        <p className="text-[10px] text-neutral-400">टेबल पर बारी-बारी पासा फेंकें</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-neutral-500 group-hover:text-white" />
                  </button>

                  <button
                    onClick={() => setGameMode('online')}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                        <Share2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black uppercase text-white group-hover:text-amber-400">Option B: ऑनलाइन दोस्त जोड़ें</p>
                        <p className="text-[10px] text-neutral-400">WhatsApp लिंक या कोड से अलग-अलग फ़ोन पर</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-neutral-500 group-hover:text-white" />
                  </button>
                </div>
              ) : gameMode === 'online' && !onlineAction ? (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-xs font-black uppercase text-blue-400">🌐 Online Multiplayer</span>
                    <button onClick={() => setGameMode(null)} className="text-[10px] text-neutral-400 underline">बदलें</button>
                  </div>

                  <button
                    onClick={() => setOnlineAction('create')}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 text-black font-black uppercase text-xs rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    + नया रूम बनाएं (Host Room)
                  </button>

                  <div className="text-center text-[10px] text-neutral-500 uppercase font-black">--- या ---</div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="रूम कोड डालें (e.g. ROOM-4821)"
                      value={inputRoomCode}
                      onChange={e => setInputRoomCode(e.target.value.toUpperCase())}
                      className="w-full bg-black/60 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-center text-white outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => {
                        if (!inputRoomCode.trim()) return toast.error("रूम कोड लिखें!");
                        setOnlineAction('join');
                      }}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-xs rounded-xl border border-white/10 flex items-center justify-center gap-1.5"
                    >
                      <LogIn size={14} /> रूम में जुड़ें (Join Room)
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={gameMode === 'online' && onlineAction === 'join' ? handleJoinOnlineRoom : handleCreateOnlineRoom} className="space-y-3 pt-1">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-xs font-black uppercase text-amber-400">
                      {gameMode === 'local' ? '📱 Table Pass-and-Play' : onlineAction === 'create' ? '👑 Host New Room' : `🤝 Join Room`}
                    </span>
                    <button type="button" onClick={() => { setOnlineAction(null); setGameMode(null); }} className="text-[10px] text-neutral-400 underline">
                      बदलें
                    </button>
                  </div>

                  {onlineAction === 'create' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-400">कितने दोस्त साथ खेलेंगे?</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setFriendCount(cnt as any)}
                            className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${
                              friendCount === cnt ? 'bg-amber-400 text-black border-amber-400 shadow' : 'bg-white/5 text-neutral-400 border-white/10'
                            }`}
                          >
                            {cnt === 1 ? '1 Friend' : `${cnt} Friends`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400">Your Mobile Number (फ़ोन नंबर) *</label>
                    <div className="relative">
                      <input
                        type="tel"
                        maxLength={10}
                        required
                        placeholder="10 अंकों का नंबर"
                        value={myPhone}
                        onChange={e => handlePhoneLookup(e.target.value)}
                        className="w-full bg-black/60 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-white outline-none focus:border-amber-400"
                      />
                      {isCheckingPhone && <Loader2 size={14} className="animate-spin text-amber-400 absolute right-3 top-3" />}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400">Your Name (आपका नाम) *</label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. राहुल"
                      value={myName}
                      onChange={e => setMyName(e.target.value)}
                      className="w-full bg-black/60 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-rose-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={myPhone.length !== 10 || !myName.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-40 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 tracking-wider mt-2"
                  >
                    <Swords size={16} /> {onlineAction === 'join' ? 'कमरे में प्रवेश करें (Join)' : 'मैच शुरू करें (Start)'}
                  </button>
                </form>
              )}
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
            CLASSIC LUDO RAID
          </h1>
          <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
            {gameMode === 'online' && roomId ? `Room: ${roomId}` : 'Win 1x Veg Manchurian Half 🥟'}
          </p>
        </div>
        <div className="flex gap-2">
          {gameMode === 'online' && roomId && (
            <button onClick={handleShareWhatsAppInvite} title="WhatsApp Invite" className="p-2.5 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30">
              <Share2 size={16} />
            </button>
          )}
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={handleRestart} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* 4 BASES HUD CARDS (हर बेस का अपना कार्ड) */}
      <div className="w-full max-w-md grid grid-cols-4 gap-1.5 my-2 shrink-0">
        {/* P3 (GREEN - TOP LEFT) */}
        <div className={`p-2 rounded-xl border text-center transition-all ${turn === 'p3' ? 'bg-[#00a651] text-white border-white shadow-lg ring-2 ring-white/50 scale-102' : 'bg-white/5 border-white/10 opacity-60'}`}>
          <p className="text-[10px] font-black uppercase truncate">{friendCount >= 3 ? (players.p3.joined ? players.p3.name : 'Waiting...') : 'Empty'}</p>
          <p className="text-[8px] font-mono text-green-300">Top-Left</p>
          <p className="text-[9px] font-mono mt-0.5">{friendCount >= 3 ? `${tokens.filter(t => t.ownerSeat === 'p3' && t.step === 56).length}/2` : '--'}</p>
        </div>

        {/* CAFE BOSS (YELLOW - TOP RIGHT) */}
        <div className={`p-2 rounded-xl border text-center transition-all ${turn === 'cafe' ? 'bg-[#ffc20e] text-black border-white shadow-lg ring-2 ring-white/50 scale-102' : 'bg-white/5 border-white/10 opacity-60'}`}>
          <p className="text-[10px] font-black uppercase truncate">Cafe Boss ☕</p>
          <p className="text-[8px] font-mono text-amber-800">Top-Right</p>
          <p className="text-[9px] font-mono mt-0.5">{tokens.filter(t => t.ownerSeat === 'cafe' && t.step === 56).length}/2 In</p>
        </div>

        {/* P1 (RED - BOTTOM LEFT) */}
        <div className={`p-2 rounded-xl border text-center transition-all ${turn === 'p1' ? 'bg-[#ed1c24] text-white border-white shadow-lg ring-2 ring-white/50 scale-102' : 'bg-white/5 border-white/10 opacity-60'}`}>
          <p className="text-[10px] font-black uppercase truncate">{players.p1.name || 'P1'}</p>
          <p className="text-[8px] font-mono text-red-300">Btm-Left</p>
          <p className="text-[9px] font-mono mt-0.5">{tokens.filter(t => t.ownerSeat === 'p1' && t.step === 56).length}/2 In</p>
        </div>

        {/* P2 (BLUE - BOTTOM RIGHT) */}
        <div className={`p-2 rounded-xl border text-center transition-all ${friendCount < 2 ? 'opacity-20' : turn === 'p2' ? 'bg-[#00aeef] text-white border-white shadow-lg ring-2 ring-white/50 scale-102' : 'bg-white/5 border-white/10 opacity-60'}`}>
          <p className="text-[10px] font-black uppercase truncate">{friendCount >= 2 ? (players.p2.joined ? players.p2.name : 'Waiting...') : 'Empty'}</p>
          <p className="text-[8px] font-mono text-cyan-300">Btm-Right</p>
          <p className="text-[9px] font-mono mt-0.5">{friendCount >= 2 ? `${tokens.filter(t => t.ownerSeat === 'p2' && t.step === 56).length}/2` : '--'}</p>
        </div>
      </div>

      {/* WINNER POPUP */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-neutral-900 border-2 border-amber-400 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              {winner === 'friends' ? (
                <>
                  <div className="w-16 h-16 bg-amber-400/20 text-amber-400 rounded-full mx-auto flex items-center justify-center">
                    <Gift size={36} />
                  </div>
                  <h2 className="text-2xl font-black uppercase text-amber-400">FRIENDS WON! 🎉</h2>
                  <p className="text-xs text-neutral-300 font-bold">
                    बधाई हो! <span className="text-white underline">{winningPlayerName}</span> और पूरी टीम ने Bum Bum Cafe को हरा दिया:
                  </p>
                  
                  <div className="bg-amber-500/10 border-2 border-amber-400 p-3 rounded-2xl">
                    <p className="text-base font-black text-amber-300">1x Veg Manchurian (Half) FREE 🥟</p>
                    <p className="text-xs font-mono text-neutral-400 mt-1">Voucher: <span className="text-white font-bold">{voucherCode}</span></p>
                  </div>
                  <p className="text-[10px] text-green-400 font-bold bg-green-500/10 py-1.5 px-2 rounded-lg border border-green-500/30">
                    ✅ सभी दोस्तों के नंबर पर वाउचर सेव हो गया!
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
                  <h2 className="text-xl font-black uppercase text-rose-400">CAFE BOSS WON! ☕</h2>
                  <p className="text-xs text-neutral-300 font-bold">
                    सब मिलकर भी Bum Bum Cafe को नहीं हरा पाए! आखिरी सेकंड में कैफ़े ने मैच निकाल लिया।
                  </p>
                  <button onClick={handleRestart} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-xs rounded-xl transition-all shadow-lg">
                    एक बार और मिलकर लड़ो (Retry Raid) ⚔️
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🎯 15×15 EXACT MATHEMATICAL SVG LUDO BOARD */}
      <div className="w-full max-w-[420px] aspect-square bg-white border-[6px] border-[#000] shadow-[0_15px_50px_rgba(0,0,0,0.9)] relative overflow-hidden my-auto">
        <svg viewBox="0 0 15 15" className="w-full h-full block">
          {/* ग्रिड सेल्स (1.0 × 1.0 के 100% बराबर चौकोर खाने) */}
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

          {/* 4 कोनों के पक्के बेस (Exact 6×6 Units) */}
          {/* Top-Left Green Base (P3) */}
          <rect x="0" y="0" width="6" height="6" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <rect x="1" y="1" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="2" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="2" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="4" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="4" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
          <text x="3" y="3.15" fontSize="0.45" fontWeight="900" textAnchor="middle" fill="#065f46">{friendCount >= 3 ? players.p3.name.slice(0, 6) : 'GREEN'}</text>

          {/* Top-Right Yellow Base (Bum Bum Cafe Boss ☕) */}
          <rect x="9" y="0" width="6" height="6" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <rect x="10" y="1" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="2" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="2" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="4" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="4" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
          <text x="12" y="3.15" fontSize="0.45" fontWeight="900" textAnchor="middle" fill="#78350f">BOSS ☕</text>

          {/* Bottom-Left Red Base (P1 / You) */}
          <rect x="0" y="9" width="6" height="6" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <rect x="1" y="10" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="11" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="11" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <circle cx="2" cy="13" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <circle cx="4" cy="13" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
          <text x="3" y="12.15" fontSize="0.45" fontWeight="900" textAnchor="middle" fill="#7f1d1d">{players.p1.name ? players.p1.name.slice(0, 6) : 'RED'}</text>

          {/* Bottom-Right Blue Base (P2) */}
          <rect x="9" y="9" width="6" height="6" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <rect x="10" y="10" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="11" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="11" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <circle cx="11" cy="13" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <circle cx="13" cy="13" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
          <text x="12" y="12.15" fontSize="0.45" fontWeight="900" textAnchor="middle" fill="#0369a1">{friendCount >= 2 ? (players.p2.joined ? players.p2.name.slice(0, 6) : 'BLUE') : 'BLUE'}</text>

          {/* सेंटर ट्रायएंगल्स */}
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

        {/* ♟️ गोटियां */}
        {tokens.map(token => {
          if (token.ownerSeat === 'p2' && friendCount < 2) return null;
          if (token.ownerSeat === 'p3' && friendCount < 3) return null;

          const [r, c] = getTokenCoords(token);
          const isMyTurn = token.ownerSeat === turn;
          
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
                if (!isMyTurnNow) {
                  return toast.error("यह आपकी चाल नहीं है!");
                }
                if (canMove) {
                  handleMoveToken(token);
                } else if (!hasRolled) {
                  toast.error("पहले पासा फेंकें! 🎲");
                }
              }}
              className="absolute z-30 flex items-center justify-center p-[2px] cursor-pointer"
            >
              <motion.div
                animate={canMove && isMyTurnNow ? { scale: [1, 1.25, 1], y: [0, -3, 0] } : { scale: 1 }}
                transition={canMove ? { repeat: Infinity, duration: 0.6 } : {}}
                className={`w-[85%] h-[85%] rounded-full border-2 border-white shadow-[0_4px_8px_rgba(0,0,0,0.6)] flex items-center justify-center relative ${
                  token.ownerSeat === 'p1' ? 'bg-[#ed1c24]' :
                  token.ownerSeat === 'p2' ? 'bg-[#00aeef]' :
                  token.ownerSeat === 'p3' ? 'bg-[#00a651]' : 'bg-[#ffc20e]'
                } ${canMove && isMyTurnNow ? 'ring-2 ring-white shadow-[0_0_12px_#fff]' : ''}`}
              >
                <div className="w-[45%] h-[45%] rounded-full bg-white/40 shadow-inner" />
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* FOOTER CONTROLS & LOCKED DICE */}
      <footer className="w-full max-w-md bg-neutral-900/90 border border-white/10 rounded-3xl p-3 flex justify-between items-center shadow-2xl shrink-0 mt-2">
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">किसकी चाल:</span>
          <p className="text-base font-black uppercase flex items-center gap-1.5" style={{ color: players[turn].hex }}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: players[turn].hex }} />
            {players[turn].name} {turn === 'cafe' ? '(Boss)' : ''}
          </p>
          <span className="text-[10px] text-neutral-400 font-bold">
            {isAnimatingMove ? 'गोटी चल रही है...' : (turn === 'cafe' 
              ? '🤖 कैफ़े Boss सोच रहा है...' 
              : isMyTurnNow 
                ? (hasRolled ? '👉 अपनी गोटी पर टैप करें' : '👉 पासा फेंकने के लिए बटन दबाएं') 
                : `⏳ ${players[turn].name} की चाल का इंतज़ार करें...`)}
          </span>
        </div>

        {/* 🎲 पासा बटन (जब अपनी बारी न हो तो कड़ा ताला 🔒) */}
        <motion.button
          whileTap={isMyTurnNow ? { scale: 0.9 } : {}}
          onClick={() => handleRollDice(false)}
          disabled={!isMyTurnNow || rolling || hasRolled || isAnimatingMove || !isSetupDone}
          className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center font-mono font-black text-3xl shadow-xl transition-all ${
            !isMyTurnNow || hasRolled || turn === 'cafe' || isAnimatingMove
              ? 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed opacity-60'
              : 'border-white text-white shadow-[0_0_20px_rgba(255,255,255,0.4)] animate-pulse cursor-pointer'
          }`}
          style={{ backgroundColor: !isMyTurnNow || hasRolled || turn === 'cafe' ? undefined : players[turn].hex }}
        >
          {!isMyTurnNow ? (
            <Lock size={22} className="text-neutral-500" />
          ) : rolling ? (
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
