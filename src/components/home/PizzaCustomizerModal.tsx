'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';

interface PizzaCustomizerModalProps {
  isHindi: boolean;
  selectedProduct: any;
  setSelectedProduct: (prod: any) => void;
  normalPizzaSize: string;
  setNormalPizzaSize: (size: string) => void;
  normalPizzaPrice: number;
  setNormalPizzaPrice: (price: number) => void;
  normalPizzaAddons: Record<string, boolean>;
  setNormalPizzaAddons: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  chefNote: string;
  setChefNote: (note: string) => void;
  PIZZA_ADDONS: Record<string, any>;
  QUICK_INSTRUCTION_TAGS: string[];
  quickAppendInstruction: (tag: string, type: "diy" | "normal") => void;
  handleNormalPizzaAdd: () => void;
  triggerHaptic: (ms?: number) => void;
}

export default function PizzaCustomizerModal({
  isHindi, selectedProduct, setSelectedProduct, normalPizzaSize, setNormalPizzaSize,
  normalPizzaPrice, setNormalPizzaPrice, normalPizzaAddons, setNormalPizzaAddons,
  chefNote, setChefNote, PIZZA_ADDONS, QUICK_INSTRUCTION_TAGS,
  quickAppendInstruction, handleNormalPizzaAdd, triggerHaptic
}: PizzaCustomizerModalProps) {
  if (!selectedProduct) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-end font-sans">
        <motion.div 
          initial={{ y: 300 }} 
          animate={{ y: 0 }} 
          exit={{ y: 300 }} 
          className="dark:bg-[#111] bg-white w-full p-6 rounded-t-3xl border-t dark:border-white/10 border-neutral-200 max-w-lg mx-auto overflow-y-auto max-h-[95vh] shadow-2xl transition-colors duration-200 font-sans font-bold"
        >
          <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
          <h3 className="text-xl font-black text-center text-neutral-900 dark:text-white">{selectedProduct?.name}</h3>
          <p className="text-orange-500 font-black mb-4 uppercase text-[8px] text-center">{isHindi ? "ऑर्डर कस्टमाइज़ करें" : "Customize Your Order"}</p>
          
          <div className="space-y-3 mb-4">
            <p className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase">{isHindi ? "1. साइज चुनें:" : "1. Select Portion Size:"}</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                <button 
                  type="button" 
                  key={size} 
                  onClick={() => { setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} 
                  className={`p-3 rounded-xl flex flex-col items-center border transition-all ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'dark:bg-white/[0.03] bg-neutral-50 dark:border-white/5 border-neutral-300 dark:text-gray-400 text-neutral-800'}`}
                >
                  <span className="capitalize text-xs font-black">{size}</span>
                  <span className="font-extrabold text-[10px] mt-1 dark:text-white text-neutral-900 font-mono">₹{price}</span>
                </button>
              ))}
            </div>
          </div>

          {normalPizzaSize && (selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
            <div className="space-y-3 mb-4 border-t border-neutral-200 dark:border-white/5 pt-3">
              <p className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase">{isHindi ? "2. एक्स्ट्रा मसाला/टॉपिंग चुनें:" : "2. Select Add-ons:"}</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]: any) => {
                  const isSelected = !!normalPizzaAddons[addon];
                  return (
                    <button
                      type="button"
                      key={addon}
                      onClick={() => setNormalPizzaAddons(prev => ({ ...prev, [addon]: !prev[addon] }))}
                      className={`p-2.5 rounded-xl border flex justify-between items-center text-[9px] font-bold ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300 dark:bg-white/[0.02] bg-neutral-50 dark:text-gray-300'}`}
                    >
                      <span>{addon}</span>
                      <span className="text-orange-500 dark:text-orange-400 font-black font-mono">+₹{cost}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 mb-6 border-t border-neutral-200 dark:border-white/5 pt-3">
            <p className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase">{isHindi ? "शेफ के लिए विशेष निर्देश:" : "Special Note for Chef / Instructions:"}</p>
            <div className="flex flex-wrap gap-1.5 pb-2">
              {QUICK_INSTRUCTION_TAGS.map((tag: any) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => quickAppendInstruction(tag, "normal")}
                  className="text-[9px] font-bold py-1 px-2 rounded-full border dark:border-white/5 border-neutral-300 bg-neutral-100 dark:bg-neutral-800 dark:text-gray-300 text-neutral-800 hover:border-orange-500 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea 
              placeholder="e.g. Make it extra spicy, No onions, soft crust etc..." 
              value={chefNote} 
              onChange={(e) => setChefNote(e.target.value)} 
              className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-neutral-50 border dark:border-white/5 border-neutral-300 text-neutral-900 outline-none focus:border-orange-500 h-16 resize-none"
            />
          </div>

          <button type="button" onClick={handleNormalPizzaAdd} className="w-full bg-orange-500 text-black p-4 rounded-xl font-black text-xs uppercase">
            {isHindi ? "कर्ट में जोड़ने की पुष्टि करें" : "Confirm Add To Cart"}
          </button>
          <button type="button" onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setChefNote(""); }} className="w-full mt-3 text-neutral-500 dark:text-gray-400 font-black text-[10px] text-center uppercase">
            {isHindi ? "बंद करें" : "Close"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
