'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RefreshCw, ArrowLeft, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast, { Toaster } from 'react-hot-toast';

// 4 खिलाड़ियों के रंग
type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
  id: number;
  color: PlayerColor;
  step: number; // -1 = Base में, 0 से 50 = Board Track, 51 से 56 = Home Path, 57 = Won
}

const PLAYER_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
const COLOR_CONFIG = {
  red: { name: 'Red (लाल)', bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500', trackBg: 'bg-red-100 dark:bg-red-950/40' },
  green: { name: 'Green (हरा)', bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500', trackBg: 'bg-green-100 dark:bg-green-950/40' },
  yellow: { name: 'Yellow (पीला)', bg: 'bg-amber-400', text: 'text-amber-500', border: 'border-amber-400', trackBg: 'bg-amber-100 dark:bg-amber-950/40' },
  blue: { name: 'Blue (नीला)', bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500', trackBg: 'bg-blue-100 dark:bg-blue-950/40' },
};

export default function CafeLudoGame() {
  const [activePlayerIndex, setActivePlayerIndex] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [winner, setWinner] = useState<PlayerColor | null>(null);

  // हर खिलाड़ी की 2 गोटी (Quick Cafe Gameplay के लिए 2 गोटियां सबसे बेस्ट हैं ताकि गेम 5-10 मिनट में खत्म हो)
  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, color: 'red', step: -1 },
    { id: 2, color: 'red', step: -1 },
    { id: 3, color: 'green', step: -1 },
    { id: 4, color: 'green', step: -1 },
    { id: 5, color: 'yellow', step: -1 },
    { id: 6, color: 'yellow', step: -1 },
    { id: 7, color: 'blue', step: -1 },
    { id: 8, color: 'blue', step: -1 },
  ]);

  const currentPlayer = PLAYER_COLORS[activePlayerIndex];

  // पासा (Dice) फेंकने का फंक्शन
  const rollDice = () => {
    if (isRolling || hasRolled || winner) return;

    setIsRolling(true);
    let counter = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalVal);
        setIsRolling(false);
        setHasRolled(true);
        checkAutoMoves(finalVal);
      }
    }, 60);
  };

  // जांचें कि क्या कोई चाल संभव है
  const checkAutoMoves = (val: number) => {
    const myTokens = tokens.filter(t => t.color === currentPlayer);
    const movable = myTokens.filter(t => {
      if (t.step === -1 && val === 6) return true;
      if (t.step >= 0 && t.step + val <= 57) return true;
      return false;
    });

    if (movable.length === 0) {
      toast('कोई चाल उपलब्ध नहीं! अगला खिलाड़ी...', { icon: '⏭️' });
      setTimeout(() => nextTurn(false), 1000);
    } else if (movable.length === 1 && movable[0].step === -1 && val === 6) {
      // अगर सिर्फ एक गोटी बेस में है और 6 आया है, तो खुद-ब-खुद बाहर निकाल दें
      setTimeout(() => moveToken(movable[0], val), 400);
    }
  };

  // गोटी चलाने का फंक्शन
  const moveToken = (token: Token, stepsToMove: number = diceValue) => {
    if (!hasRolled || token.color !== currentPlayer || winner) return;

    let newStep = token.step;
    if (token.step === -1) {
      if (stepsToMove === 6) newStep = 0; // बेस से बाहर निकलना
      else return toast.error('गोटी बाहर निकालने के लिए 6 चाहिए!');
    } else {
      if (token.step + stepsToMove > 57) {
        return toast.error('घर पहुंचने के लिए सही अंक चाहिए!');
      }
      newStep = token.step + stepsToMove;
    }

    // गोटी को अपडेट करें
    const updatedTokens = tokens.map(t => {
      if (t.id === token.id) return { ...t, step: newStep };
      return t;
    });

    // ⚔️ गोटी काटना (Cut Mechanism)
    if (newStep >= 0 && newStep < 52) {
      // सेफ जोन: 0, 8, 13, 21, 26, 34, 39, 47 (Ludo Star Safe Spots)
      const safeSpots = [0, 8, 13, 21, 26, 34, 39, 47];
      if (!safeSpots.includes(newStep)) {
        updatedTokens.forEach(t => {
          if (t.color !== currentPlayer && t.step === newStep) {
            t.step = -1; // विपक्षी की गोटी बेस में वापस
            toast.success(`🎉 ${currentPlayer.toUpperCase()} ने ${t.color.toUpperCase()} की गोटी काटी!`);
          }
        });
      }
    }

    setTokens(updatedTokens);
    setHasRolled(false);

    // 🏆 जीत की जांच
    const myFinished = updatedTokens.filter(t => t.color === currentPlayer && t.step === 57).length;
    if (myFinished === 2) {
      setWinner(currentPlayer);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      toast.success(`👑 बधाई हो! ${currentPlayer.toUpperCase()} जीत गया!`);
      return;
    }

    // 6 आने पर दोबारा चाल
    if (stepsToMove === 6) {
      toast('6 आया! आपकी दोबारा चाल है! 🎲', { icon: '🎯' });
    } else {
      nextTurn(false);
    }
  };

  const nextTurn = (extraTurn = false) => {
    setHasRolled(false);
    if (!extraTurn) {
      setActivePlayerIndex(prev => (prev + 1) % 4);
    }
  };

  const restartGame = () => {
    setTokens(tokens.map(t => ({ ...t, step: -1 })));
    setActivePlayerIndex(0);
    setHasRolled(false);
    setWinner(null);
    setDiceValue(1);
    toast.success('नया खेल शुरू हुआ!');
  };

  return (
    <div className="min-h-screen bg-[#0e0e12] text-white flex flex-col justify-between items-center p-4 font-sans select-none">
      <Toaster position="top-center" />

      {/* TOP HEADER */}
      <header className="w-full max-w-md flex justify-between items-center pb-2 border-b border-white/10 shrink-0">
        <button onClick={() => window.history.back()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <h1 className="text-base font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">
            BUM BUM CAFE LUDO
          </h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase">Quick 2-Token Game</p>
        </div>
        <button onClick={restartGame} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300">
          <RefreshCw size={18} />
        </button>
      </header>

      {/* WINNER MODAL */}
      <AnimatePresence>
        {winner && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-neutral-900 border-2 border-amber-500 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.3)]">
              <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full mx-auto flex items-center justify-center">
                <Trophy size={42} />
              </div>
              <h2 className="text-2xl font-black uppercase text-amber-400">{COLOR_CONFIG[winner].name} WON!</h2>
              <p className="text-xs text-neutral-300 font-bold">🎉 विजेता को कैफ़े काउंटर से स्पेशल 10% डिस्काउंट मिलेगा!</p>
              <button onClick={restartGame} className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all">
                Play Again (दोबारा खेलें)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LUDO BOARD CANVAS / GRID */}
      <main className="w-full max-w-[390px] aspect-square bg-[#1b1b22] border-4 border-neutral-800 rounded-3xl shadow-2xl p-2 relative grid grid-cols-3 grid-rows-3 gap-1 my-auto">
        {/* TOP-LEFT: RED BASE */}
        <div className="bg-red-500/20 border-2 border-red-500 rounded-2xl p-3 flex flex-col justify-between items-center relative">
          <span className="text-[10px] font-black uppercase text-red-500">RED</span>
          <div className="flex gap-3 my-auto">
            {tokens.filter(t => t.color === 'red' && t.step === -1).map(t => (
              <button
                key={t.id}
                onClick={() => moveToken(t)}
                className={`w-8 h-8 rounded-full bg-red-500 border-2 border-white shadow-lg flex items-center justify-center text-xs font-black transition-transform active:scale-90 ${
                  currentPlayer === 'red' && diceValue === 6 && hasRolled ? 'animate-bounce ring-4 ring-white' : ''
                }`}
              >
                🔴
              </button>
            ))}
          </div>
        </div>

        {/* TOP-CENTER: GREEN HOME PATH */}
        <div className="bg-neutral-900/60 rounded-xl flex flex-col justify-center items-center text-[10px] text-neutral-500 font-mono font-bold">
          <span>GREEN TRACK</span>
          <div className="w-2 h-16 bg-green-500/40 rounded-full mt-1"></div>
        </div>

        {/* TOP-RIGHT: GREEN BASE */}
        <div className="bg-green-500/20 border-2 border-green-500 rounded-2xl p-3 flex flex-col justify-between items-center relative">
          <span className="text-[10px] font-black uppercase text-green-500">GREEN</span>
          <div className="flex gap-3 my-auto">
            {tokens.filter(t => t.color === 'green' && t.step === -1).map(t => (
              <button
                key={t.id}
                onClick={() => moveToken(t)}
                className={`w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center text-xs font-black transition-transform active:scale-90 ${
                  currentPlayer === 'green' && diceValue === 6 && hasRolled ? 'animate-bounce ring-4 ring-white' : ''
                }`}
              >
                🟢
              </button>
            ))}
          </div>
        </div>

        {/* MIDDLE-LEFT: RED TRACK */}
        <div className="bg-neutral-900/60 rounded-xl flex items-center justify-center text-[10px] text-neutral-500 font-mono font-bold">
          <span>RED TRACK</span>
        </div>

        {/* CENTER: FINISH / WINNING ZONE */}
        <div className="bg-gradient-to-tr from-amber-500/30 to-orange-500/30 border-2 border-amber-400 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <Trophy size={32} className="text-amber-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-amber-300 mt-1">HOME</span>
        </div>

        {/* MIDDLE-RIGHT: YELLOW TRACK */}
        <div className="bg-neutral-900/60 rounded-xl flex items-center justify-center text-[10px] text-neutral-500 font-mono font-bold">
          <span>YELLOW TRACK</span>
        </div>

        {/* BOTTOM-LEFT: BLUE BASE */}
        <div className="bg-blue-500/20 border-2 border-blue-500 rounded-2xl p-3 flex flex-col justify-between items-center relative">
          <span className="text-[10px] font-black uppercase text-blue-500">BLUE</span>
          <div className="flex gap-3 my-auto">
            {tokens.filter(t => t.color === 'blue' && t.step === -1).map(t => (
              <button
                key={t.id}
                onClick={() => moveToken(t)}
                className={`w-8 h-8 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-xs font-black transition-transform active:scale-90 ${
                  currentPlayer === 'blue' && diceValue === 6 && hasRolled ? 'animate-bounce ring-4 ring-white' : ''
                }`}
              >
                🔵
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM-CENTER: BLUE HOME PATH */}
        <div className="bg-neutral-900/60 rounded-xl flex flex-col justify-center items-center text-[10px] text-neutral-500 font-mono font-bold">
          <div className="w-2 h-16 bg-blue-500/40 rounded-full mb-1"></div>
          <span>BLUE TRACK</span>
        </div>

        {/* BOTTOM-RIGHT: YELLOW BASE */}
        <div className="bg-amber-400/20 border-2 border-amber-400 rounded-2xl p-3 flex flex-col justify-between items-center relative">
          <span className="text-[10px] font-black uppercase text-amber-400">YELLOW</span>
          <div className="flex gap-3 my-auto">
            {tokens.filter(t => t.color === 'yellow' && t.step === -1).map(t => (
              <button
                key={t.id}
                onClick={() => moveToken(t)}
                className={`w-8 h-8 rounded-full bg-amber-400 border-2 border-white shadow-lg flex items-center justify-center text-xs font-black transition-transform active:scale-90 ${
                  currentPlayer === 'yellow' && diceValue === 6 && hasRolled ? 'animate-bounce ring-4 ring-white' : ''
                }`}
              >
                🟡
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* CONTROLS: DICE & ACTIVE PLAYER */}
      <footer className="w-full max-w-md bg-neutral-900/90 border border-white/10 rounded-3xl p-4 flex justify-between items-center shadow-xl shrink-0">
        <div className="space-y-0.5">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">Current Turn:</span>
          <p className={`text-base font-black uppercase ${COLOR_CONFIG[currentPlayer].text}`}>
            {COLOR_CONFIG[currentPlayer].name}
          </p>
          <span className="text-[9px] text-neutral-500 block">
            {hasRolled ? '👉 गोटी पर टैप करके आगे बढ़ाएं' : 'पासा फेंकने के लिए बटन दबाएं'}
          </span>
        </div>

        {/* 3D STYLE DICE BUTTON */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={rollDice}
          disabled={isRolling || hasRolled || !!winner}
          className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-mono font-black text-2xl shadow-xl transition-all ${
            hasRolled
              ? 'bg-neutral-800 border-neutral-600 text-neutral-400 cursor-not-allowed'
              : `${COLOR_CONFIG[currentPlayer].bg} border-white text-white animate-pulse shadow-[0_0_20px_rgba(255,255,255,0.2)]`
          }`}
        >
          {isRolling ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.3 }}>
              🎲
            </motion.span>
          ) : (
            <span>{diceValue}</span>
          )}
        </motion.button>
      </footer>
    </div>
  );
}
