'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PointsClaimModalProps {
  isHindi: boolean;
  isClaimModalOpen: boolean;
  setIsClaimModalOpen: (open: boolean) => void;
  claimingPlatform: any;
  claimUsername: string;
  setClaimUsername: (name: string) => void;
  isClaimingLoading: boolean;
  handleClaimSubmit: (e: React.FormEvent) => void;
  triggerHaptic: (ms?: number) => void;
}

export default function PointsClaimModal({
  isHindi, isClaimModalOpen, setIsClaimModalOpen, claimingPlatform,
  claimUsername, setClaimUsername, isClaimingLoading, handleClaimSubmit, triggerHaptic
}: PointsClaimModalProps) {
  if (!isClaimModalOpen || !claimingPlatform) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6 font-sans">
        <motion.form 
          onSubmit={handleClaimSubmit}
          className="dark:bg-[#111] bg-white w-full max-w-sm p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-xl font-sans font-bold"
        >
          <img src={claimingPlatform.icon} className="w-10 h-10 object-contain mx-auto" alt="" loading="lazy" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-orange-600 dark:text-orange-500 uppercase">{isHindi ? "दावा अनुरोध सबमिट करें" : "Submit Claim Request"}</h3>
            <p className="text-[10px] text-neutral-600 dark:text-gray-400 leading-normal font-semibold">
              {claimingPlatform.label} {isHindi ? "पर फॉलो करने के बाद अपना सोशल हैंडल/यूज़रनेम दर्ज करें। हमारी जांच टीम जांच करके पॉइंट्स क्रेडिट करेगी!" : "पर फॉलो करने के बाद अपना सोशल हैंडल/यूज़रनेम दर्ज करें। हमारी जांच टीम जांच करके पॉइंट्स क्रेडिट करेगी!"}
            </p>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400">Your Profile Handle / Username</label>
            <input 
              type="text" 
              placeholder="e.g. @yourname" 
              value={claimUsername} 
              onChange={(e) => setClaimUsername(e.target.value)} 
              required 
              className="w-full dark:bg-white/10 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none text-center font-mono" 
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={isClaimingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1">
              {isClaimingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Claim Reward Request ➔</span>}
            </button>
            <button 
              type="button" 
              onClick={() => { triggerHaptic(15); setIsClaimModalOpen(false); setClaimUsername(""); }} 
              className="bg-neutral-100 text-neutral-800 dark:bg-white/5 dark:text-gray-400 p-3 rounded-xl font-black text-xs uppercase"
            >
              Cancel
            </button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
}
