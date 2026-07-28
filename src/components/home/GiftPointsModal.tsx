'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Loader2 } from 'lucide-react';

interface GiftPointsModalProps {
  isHindi: boolean;
  isGiftModalOpen: boolean;
  setIsGiftModalOpen: (open: boolean) => void;
  giftPhone: string;
  setGiftPhone: (phone: string) => void;
  giftPointsAmount: number | "";
  setGiftPointsAmount: (amount: number | "") => void;
  isGiftingLoading: boolean;
  customerPoints: number;
  handleGiftPoints: (e: React.FormEvent) => void;
  triggerHaptic: (ms?: number) => void;
}

export default function GiftPointsModal({
  isHindi, isGiftModalOpen, setIsGiftModalOpen, giftPhone, setGiftPhone,
  giftPointsAmount, setGiftPointsAmount, isGiftingLoading, customerPoints,
  handleGiftPoints, triggerHaptic
}: GiftPointsModalProps) {
  if (!isGiftModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6 font-sans">
        <motion.form 
          onSubmit={handleGiftPoints} 
          className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-xl transition-colors duration-200 font-sans font-bold"
        >
          <Gift className="mx-auto text-yellow-400 animate-bounce" size={32} />
          <div>
            <h3 className="text-lg font-black text-yellow-400 uppercase italic font-mono">Gift Loyalty Points</h3>
            <p className="text-[9px] text-neutral-600 font-semibold mt-0.5">{isHindi ? "अपने पॉइंट्स किसी दोस्त के खाते में भेजें" : "Gift your points directly to a friend's ledger"}</p>
          </div>
          <div className="space-y-3 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400">{isHindi ? "दोस्त का मोबाइल नंबर:" : "Friend's Phone Number"}</label>
              <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} required className="w-full dark:bg-white/10 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none text-center font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400">{isHindi ? `कितने पॉइंट्स (आपके पास हैं: ${customerPoints} Pts)` : `Points to Gift (Your Pts: ${customerPoints})`}</label>
              <input type="number" placeholder="e.g. 10" value={giftPointsAmount} onChange={(e) => setGiftPointsAmount(e.target.value === "" ? "" : Number(e.target.value))} required className="w-full dark:bg-white/10 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none text-center font-mono" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isGiftingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1">
              {isGiftingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Gift Points 🎁</span>}
            </button>
            <button type="button" onClick={() => { triggerHaptic(15); setIsGiftModalOpen(false); setGiftPhone(""); setGiftPointsAmount(""); }} className="bg-neutral-100 text-neutral-800 dark:bg-white/5 dark:text-gray-400 font-bold p-3 rounded-xl text-xs uppercase">CANCEL</button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
