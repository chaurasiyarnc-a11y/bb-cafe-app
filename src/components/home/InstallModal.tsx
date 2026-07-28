'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface InstallModalProps {
  isInstallModalOpen: boolean;
  setIsInstallModalOpen: (open: boolean) => void;
  triggerHaptic: (ms?: number) => void;
}

export default function InstallModal({
  isInstallModalOpen,
  setIsInstallModalOpen,
  triggerHaptic
}: InstallModalProps) {
  if (!isInstallModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[270] flex items-center justify-center p-6 font-sans">
        <div className="dark:bg-[#111] bg-white w-full max-sm p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-2xl transition-colors duration-200">
          <Sparkles className="mx-auto text-yellow-400 animate-bounce" size={32} />
          
          <div className="space-y-1">
            <h3 className="text-base font-black dark:text-white text-neutral-900">📲 आसान इंस्टॉलेशन गाइड</h3>
            <p className="text-[10px] text-neutral-600 dark:text-gray-400 font-bold leading-normal">
              यदि ऑटोमैटिक इंस्टॉल काम नहीं कर रहा है, तो आप नीचे दिए गए आसान चरणों से इसे अपनी होम स्क्रीन पर ऐप की तरह जोड़ सकते हैं:
            </p>
          </div>

          <div className="text-left text-xs space-y-3 text-neutral-800 dark:text-gray-300 font-medium border-y dark:border-white/5 border-neutral-200 py-4 font-sans font-bold">
            <p className="flex items-start gap-2">
              <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black flex-shrink-0">1</span>
              <span>गूगल क्रोम (Chrome) में ऊपर दाईं ओर दिख रहे **तीन डॉट्स (⋮)** आइकॉन पर क्लिक करें।</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black flex-shrink-0">2</span>
              <span>मेन्यू लिस्ट में नीचे जाकर **'Install app'** या **'Add to Home screen'** का विकल्प चुनें।</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black flex-shrink-0">3</span>
              <span>अब **'Install'** बटन दबाएं। बम बम कैफ़े ऐप आपके फोन की होम स्क्रीन पर असली ऐप की तरह जुड़ जाएगा!</span>
            </p>
          </div>

          <button 
            onClick={() => { triggerHaptic(15); setIsInstallModalOpen(false); }} 
            className="w-full bg-orange-500 text-white p-3.5 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow"
          >
            समझ गया, बंद करें
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
