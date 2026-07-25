'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface CustomizerModalProps {
  selectedProduct: any;
  setSelectedProduct: (val: any) => void;
  normalPizzaSize: string;
  setNormalPizzaSize: (val: string) => void;
  normalPizzaPrice: number;
  setNormalPizzaPrice: (val: number) => void;
  normalPizzaAddons: { [addon: string]: boolean };
  setNormalPizzaAddons: (val: any) => void;
  customizerChefNote: string;
  setCustomizerChefNote: (val: string) => void;
  PIZZA_ADDONS: { [size: string]: { [addon: string]: number } };
  QUICK_INSTRUCTION_TAGS: string[];
  handleAddCustomizedItemToCart: () => void;
  triggerBeep: (type: 'tap' | 'success') => void;
}

export default function CustomizerModal({
  selectedProduct, setSelectedProduct, normalPizzaSize, setNormalPizzaSize,
  normalPizzaPrice, setNormalPizzaPrice, normalPizzaAddons, setNormalPizzaAddons,
  customizerChefNote, setCustomizerChefNote, PIZZA_ADDONS, QUICK_INSTRUCTION_TAGS,
  handleAddCustomizedItemToCart, triggerBeep
}: CustomizerModalProps) {
  if (!selectedProduct) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#111] border border-white/10 w-full max-w-md p-6 rounded-3xl text-left space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <div>
            <h3 className="text-sm font-black text-white">{selectedProduct.name}</h3>
            <p className="text-[9px] text-orange-500 font-bold uppercase tracking-wider">Customize Counter Order</p>
          </div>
          <button 
            type="button" 
            onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setCustomizerChefNote(""); }}
            className="p-1.5 bg-neutral-900 border border-white/5 rounded-full text-red-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">1. Select Portion Size:</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(selectedProduct.variants || {}).map(([size, price]: any) => (
              <button 
                type="button" 
                key={size} 
                onClick={() => { triggerBeep('tap'); setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} 
                className={`p-3 rounded-xl flex flex-col items-center border transition-all duration-200 ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-500 font-black' : 'bg-neutral-900 border-white/5 text-gray-400'}`}
              >
                <span className="capitalize text-[11px] font-black">{size}</span>
                <span className="font-black text-xs mt-1 text-white font-mono">₹{price}</span>
              </button>
            ))}
          </div>
        </div>

        {normalPizzaSize && (selectedProduct.category === "Special Pizza" || selectedProduct.name?.toLowerCase().includes("pizza")) && (
          <div className="space-y-2 border-t border-white/5 pt-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">2. Select Premium Toppings:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]: any) => {
                const isSelected = !!normalPizzaAddons[addon];
                return (
                  <button
                    type="button"
                    key={addon}
                    onClick={() => { triggerBeep('tap'); setNormalPizzaAddons((prev: any) => ({ ...prev, [addon]: !prev[addon] })); }}
                    className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-bold transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'border-white/5 bg-neutral-900 text-gray-400'}`}
                  >
                    <span>{addon}</span>
                    <span className="text-orange-500 font-black font-mono">+₹{cost}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t border-white/5 pt-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">3. Special Cooking instructions:</p>
          <div className="flex flex-wrap gap-1">
            {QUICK_INSTRUCTION_TAGS.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => { triggerBeep('tap'); setCustomizerChefNote((prev: any) => prev ? `${prev}, ${tag}` : tag); }}
                className="text-[9px] font-bold py-1 px-2 rounded-full border border-white/5 bg-neutral-900 text-gray-300 hover:border-orange-500 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
          <input 
            type="text" 
            placeholder="e.g. Well baked crust, extra cheese toppings..." 
            value={customizerChefNote} 
            onChange={(e) => setCustomizerChefNote(e.target.value)} 
            className="w-full text-xs p-3 rounded-xl bg-neutral-900 border border-white/5 text-white outline-none focus:border-orange-500 font-semibold"
          />
        </div>

        <div className="border-t border-white/5 pt-3 flex gap-2">
          <button 
            type="button" 
            onClick={handleAddCustomizedItemToCart}
            className="flex-grow bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow"
          >
            Confirm Portion & Add ➔
          </button>
          <button 
            type="button" 
            onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setCustomizerChefNote(""); }}
            className="bg-neutral-900 border border-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
