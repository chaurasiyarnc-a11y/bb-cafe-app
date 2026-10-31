'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2, VolumeX, Bot, User, Gift, Phone, ArrowRight, Loader2, Swords, Users, Share2, LogIn, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import GameGuard from '@/components/GameGuard';

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

// 15x15 ग्रिड के 52 मुख्य ट्रैक कोऑर्डिनेट्स [row, col]
const BOARD_PATH: [number, number][] = [
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6]
];

const START_OFFSETS: Record<SeatId, number> = {
  p1: 0,   // Red (Bottom-Left)
  p3: 13,  // Green (Top-Left)
  cafe: 26,// Yellow (Top-Right Boss)
  p2: 39   // Blue (Bottom-Right)
};

const RUNWAYS: Record<SeatId, [number, number][]> = {
  p1: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  p3: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  cafe: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  p2: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
};

const BASE_POCKETS: Record<SeatId, [number, number][]> = {
  p3: [[2.5, 1.8], [2.5, 3.8]],
  cafe: [[2.5, 10.8], [2.5, 12.8]],
  p1: [[11.5, 1.8], [11.5, 3.8]],
  p2: [[11.5, 10.8], [11.5, 12.8]]
};

// 🔊 SINGLETON AUDIO ENGINE
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

  const [seatDiceValues, setSeatDiceValues] = useState<Record<SeatId, number | null>>({
    p1: null,
    p2: null,
    p3: null,
    cafe: null,
  });

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
        if (d.seatDiceValues) setSeatDiceValues(d.seatDiceValues);
        if (d.rolling !== undefined) setRolling(d.rolling);
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

  // 🔊 LOUD AUDIO ENGINE
  const playSfx = (type: 'roll' | 'step' | 'cut' | 'win') => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'roll') {
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
      tokens,
      seatDiceValues
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

  const handleRollDice = (seat: SeatId, isBot = false) => {
    if (rollingRef.current || winnerRef.current || hasRolledRef.current || isAnimatingMoveRef.current) return;
    
    if (turnRef.current !== seat) {
      return toast.error(`अभी ${players[turnRef.current].name} की चाल है!`);
    }

    if (gameMode === 'online' && mySeat !== seat && !isBot) {
      return toast.error("यह आपकी चाल नहीं है! सिर्फ वही खिलाड़ी पासा फेंक सकता है।");
    }
    if (seat === 'cafe' && !isBot) return;

    setRolling(true);
    playSfx('roll');
    syncOnlineRoom({ rolling: true });

    let counter = 0;
    const timer = setInterval(() => {
      const tempRoll = Math.floor(Math.random() * 6) + 1;
      setDice(tempRoll);
      setSeatDiceValues(prev => ({ ...prev, [seat]: tempRoll }));
      counter++;
      if (counter > 7) {
        clearInterval(timer);
        const finalVal = getBiasedDiceRoll(turnRef.current);
        setDice(finalVal);
        setSeatDiceValues(prev => ({ ...prev, [seat]: finalVal }));
        setRolling(false);
        setHasRolled(true);
        syncOnlineRoom({ 
          dice: finalVal, 
          hasRolled: true, 
          rolling: false, 
          seatDiceValues: { ...seatDiceValues, [seat]: finalVal } 
        });
        postRollEvaluation(finalVal, turnRef.current);
      }
    }, 40);
  };

  useEffect(() => {
    if (isSetupDone && turn === 'cafe' && !rolling && !hasRolled && !winner && !isAnimatingMove) {
      const botTimer = setTimeout(() => {
        handleRollDice('cafe', true);
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

  // 🚶‍♂️ 300ms धीमा चलना
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
        await new Promise(r => setTimeout(r, 300));
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
    setSeatDiceValues({ p1: null, p2: null, p3: null, cafe: null });
    setTurn('p1');
    setTargetWinner(Math.random() < 0.75 ? 'cafe' : 'friends');
    syncOnlineRoom({ tokens: resetTokens, winner: null, turn: 'p1', dice: null, hasRolled: false, seatDiceValues: { p1: null, p2: null, p3: null, cafe: null } });
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

  // 🎲 रीयूजेबल कॉर्नर डाइस कंपोनेंट
  const renderCornerPlayerHUD = (seat: SeatId) => {
    const p = players[seat];
    if (seat === 'p2' && friendCount < 2) return <div className="invisible" />;
    if (seat === 'p3' && friendCount < 3) return <div className="invisible" />;

    const isThisTurn = turn === seat;
    const isMe = gameMode === 'local' ? (seat !== 'cafe') : (mySeat === seat);
    const canIRollThisDice = isThisTurn && isMe && !rolling && !hasRolled && !isAnimatingMove;
    const currentVal = seatDiceValues[seat] !== null ? seatDiceValues[seat] : (isThisTurn && dice !== null ? dice : null);

    return (
      <div 
        className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
          isThisTurn 
            ? 'bg-neutral-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] ring-2' 
            : 'bg-black/40 border-white/10 opacity-70'
        }`}
        style={{ borderColor: isThisTurn ? p.hex : undefined }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.hex }} />
            <p className="text-xs font-black uppercase truncate" style={{ color: isThisTurn ? p.hex : '#fff' }}>
              {p.name || p.colorName}
            </p>
          </div>
          <p className="text-[9px] font-mono text-neutral-400 mt-0.5">
            {tokens.filter(t => t.ownerSeat === seat && t.step === 56).length}/2 In
          </p>
        </div>

        <motion.button
          whileTap={canIRollThisDice ? { scale: 0.88 } : {}}
          onClick={() => handleRollDice(seat, seat === 'cafe')}
          disabled={!canIRollThisDice}
          className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-black text-2xl shadow-lg transition-all relative ${
            isThisTurn 
              ? (canIRollThisDice 
                  ? 'border-white text-white animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.4)] cursor-pointer' 
                  : 'border-white/40 text-white cursor-not-allowed')
              : 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed opacity-50'
          }`}
          style={{ backgroundColor: isThisTurn ? p.hex : undefined }}
        >
          {isThisTurn && rolling ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.25 }}>
              🎲
            </motion.span>
          ) : currentVal !== null ? (
            <span>{currentVal}</span>
          ) : (
            <span className="text-base opacity-75">🎲</span>
          )}

          {!canIRollThisDice && isThisTurn && seat !== 'cafe' && (
            <div className="absolute -top-1.5 -right-1.5 bg-black/80 rounded-full p-0.5 border border-white/20">
              <Lock size={10} className="text-neutral-400" />
            </div>
          )}
        </motion.button>
      </div>
    );
  };

  // ♟️ HUBAHU 3D MAP-PIN PAWN WITH PEDESTAL BASE (Ludo King Style)
  const render3DPinPawn = (color: string, owner: SeatId) => {
    const isRed = color === '#ed1c24';
    const isBlue = color === '#00aeef';
    const isGreen = color === '#00a651';
    
    const gradStart = isRed ? '#ff4d4d' : isBlue ? '#00c6ff' : isGreen ? '#2ecc71' : '#ffe066';
    const gradEnd = isRed ? '#b30000' : isBlue ? '#0072bc' : isGreen ? '#1b5e20' : '#e6ac00';
    const ringColor = isRed ? '#800000' : isBlue ? '#004080' : isGreen ? '#0d3813' : '#997300';
    const gradId = `pawn-grad-${owner}-${color.replace('#', '')}`;

    return (
      <svg viewBox="0 0 36 46" className="w-full h-full drop-shadow-[0_5px_5px_rgba(0,0,0,0.65)] overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradStart} />
            <stop offset="60%" stopColor={color} />
            <stop offset="100%" stopColor={gradEnd} />
          </linearGradient>
        </defs>

        {/* 1. Ground Shadow */}
        <ellipse cx="18" cy="42" rx="11" ry="3.8" fill="rgba(0,0,0,0.4)" filter="blur(1px)" />

        {/* 2. Geared Pedestal Base (स्टैंड) */}
        <ellipse cx="18" cy="38" rx="10.5" ry="4.2" fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
        <ellipse cx="18" cy="37" rx="9" ry="3.5" fill={ringColor} stroke="#ffffff" strokeWidth="0.7" strokeDasharray="2 1.5" />
        <ellipse cx="18" cy="36.2" rx="6" ry="2" fill="#ffffff" opacity="0.9" />

        {/* 3. Standing 3D Location Pin */}
        <path
          d="M 18 3 C 9.5 3 3 9.5 3 18 C 3 26 18 36.5 18 36.5 C 18 36.5 33 26 33 18 C 33 9.5 26.5 3 18 3 Z"
          fill={`url(#${gradId})`}
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Pin Center Hole */}
        <circle cx="18" cy="17" r="5.8" fill="#ffffff" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
        <circle cx="18" cy="17" r="4" fill={`url(#${gradId})`} />
        
        {/* 3D Highlight */}
        <path
          d="M 12 7 C 8 10 7 15 8 19"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    );
  };

  return (
    <GameGuard allowedGameName="Ludo">
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
                          <p className="text-[10px] text-neutral-400">टेबल पर अपने-अपने पासे से खेलें</p>
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
                          <p className="text-[10px] text-neutral-400">WhatsApp लिंक से दोस्त अपने फ़ोन से खेलेंगे</p>
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

        {/* 🔝 TOP 2 BASES HUD (GREEN P3 & YELLOW CAFE BOSS ☕) */}
        <div className="w-full max-w-[420px] grid grid-cols-2 gap-2 my-1 shrink-0">
          {renderCornerPlayerHUD('p3')}
          {renderCornerPlayerHUD('cafe')}
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

            {/* 4 कोनों के पक्के बेस */}
            {/* Top-Left Green Base (P3) */}
            <rect x="0" y="0" width="6" height="6" fill="#00a651" stroke="#000" strokeWidth="0.04" />
            <rect x="1" y="1" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
            <circle cx="2" cy="2" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
            <circle cx="4" cy="2" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
            <circle cx="2" cy="4" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />
            <circle cx="4" cy="4" r="0.65" fill="#00a651" stroke="#000" strokeWidth="0.04" />

            {/* Top-Right Yellow Base (Bum Bum Cafe Boss ☕) */}
            <rect x="9" y="0" width="6" height="6" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
            <rect x="10" y="1" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
            <circle cx="11" cy="2" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
            <circle cx="13" cy="2" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
            <circle cx="11" cy="4" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />
            <circle cx="13" cy="4" r="0.65" fill="#ffc20e" stroke="#000" strokeWidth="0.04" />

            {/* Bottom-Left Red Base (P1 / You) */}
            <rect x="0" y="9" width="6" height="6" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
            <rect x="1" y="10" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
            <circle cx="2" cy="11" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
            <circle cx="4" cy="11" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
            <circle cx="2" cy="13" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />
            <circle cx="4" cy="13" r="0.65" fill="#ed1c24" stroke="#000" strokeWidth="0.04" />

            {/* Bottom-Right Blue Base (P2) */}
            <rect x="9" y="9" width="6" height="6" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
            <rect x="10" y="10" width="4" height="4" fill="#ffffff" stroke="#000" strokeWidth="0.04" />
            <circle cx="11" cy="11" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
            <circle cx="13" cy="11" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
            <circle cx="11" cy="13" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />
            <circle cx="13" cy="13" r="0.65" fill="#00aeef" stroke="#000" strokeWidth="0.04" />

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

          {/* ♟️ गोटियां (3D PIN WITH PEDESTAL) */}
          {tokens.map(token => {
            if (token.ownerSeat === 'p2' && friendCount < 2) return null;
            if (token.ownerSeat === 'p3' && friendCount < 3) return null;

            const [r, c] = getTokenCoords(token);
            const isMyTurn = token.ownerSeat === turn;
            const isMyPiece = gameMode === 'local' ? (token.ownerSeat !== 'cafe') : (mySeat === token.ownerSeat);
            
            const canMove = hasRolled && isMyTurn && isMyPiece && dice !== null && !isAnimatingMove && (
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
                  if (!isMyPiece) {
                    return toast.error("यह आपकी गोटी नहीं है!");
                  }
                  if (canMove) {
                    handleMoveToken(token);
                  } else if (!hasRolled) {
                    toast.error("पहले पासा फेंकें! 🎲");
                  }
                }}
                className="absolute z-30 flex items-center justify-center p-[1px] cursor-pointer"
              >
                <motion.div
                  animate={canMove ? { scale: [1, 1.25, 1], y: [0, -3, 0] } : { scale: 1 }}
                  transition={canMove ? { repeat: Infinity, duration: 0.6 } : {}}
                  className={`w-full h-full flex items-center justify-center relative ${
                    canMove ? 'filter drop-shadow-[0_0_8px_#fff]' : ''
                  }`}
                >
                  {render3DPinPawn(
                    token.ownerSeat === 'p1' ? '#ed1c24' :
                    token.ownerSeat === 'p2' ? '#00aeef' :
                    token.ownerSeat === 'p3' ? '#00a651' : '#ffc20e',
                    token.ownerSeat
                  )}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* 🔻 BOTTOM 2 BASES HUD */}
        <div className="w-full max-w-[420px] grid grid-cols-2 gap-2 my-1 shrink-0">
          {renderCornerPlayerHUD('p1')}
          {renderCornerPlayerHUD('p2')}
        </div>

        {/* STATUS BANNER */}
        <footer className="w-full max-w-md bg-neutral-900/90 border border-white/10 rounded-2xl py-2 px-3 text-center shadow-lg shrink-0 mt-1">
          <p className="text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2" style={{ color: players[turn].hex }}>
            <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: players[turn].hex }} />
            {turn === 'cafe' ? (
              '🤖 Bum Bum Cafe (Boss) सोच रहा है...'
            ) : (
              `${players[turn].name} की चाल है (${players[turn].colorName})`
            )}
          </p>
        </footer>
      </div>
    </GameGuard>
  );
}
