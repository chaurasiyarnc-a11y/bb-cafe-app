'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';

interface ReelsViewerProps {
  isHindi: boolean;
  activeStory: any;
  setActiveStory: (story: any) => void;
  handleReelEnded: () => void;
  handleQuickAddFromStory: (title: string, price: number) => void;
  triggerHaptic: (ms?: number) => void;
}

export default function ReelsViewer({
  isHindi, activeStory, setActiveStory, handleReelEnded,
  handleQuickAddFromStory, triggerHaptic
}: ReelsViewerProps) {
  if (!activeStory) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black z-[250] flex flex-col justify-between font-sans font-bold">
        <div className="absolute top-4 inset-x-0 px-4 z-[260] flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pb-10">
          <span className="text-white text-xs font-black tracking-wider uppercase">{activeStory.title}</span>
          <button 
            onClick={() => { triggerHaptic(15); setActiveStory(null); }} 
            className="p-2 bg-white/10 rounded-full text-white"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <video 
            src={activeStory.url} 
            autoPlay 
            playsInline 
            onEnded={handleReelEnded}
            className="w-full h-auto max-h-[80vh] object-contain"
          />
        </div>

        <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent text-center space-y-4 z-[260]">
          <p className="text-xs text-gray-300 font-semibold">{activeStory.description}</p>
          <button 
            onClick={() => handleQuickAddFromStory(activeStory.title, activeStory.price)}
            className="w-full max-w-sm mx-auto bg-orange-500 hover:bg-orange-600 text-black py-4 rounded-2xl font-black text-xs uppercase shadow"
          >
            ADD TO CART • ₹{activeStory.price}
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
