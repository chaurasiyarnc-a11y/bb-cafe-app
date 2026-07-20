'use client';
import React from 'react';

interface DiyPizzaBuilderProps {
  isHindi: boolean;
  diySize: string;
  setDiySize: (size: string) => void;
  diySauce: boolean;
  setDiySauce: (sauce: boolean) => void;
  diyMozzarella: boolean;
  setDiyMozzarella: (mozzarella: boolean) => void;
  diyVegSelection: Record<string, boolean>;
  setDiyVegSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  diyPremiumToppings: Record<string, boolean>;
  setDiyPremiumToppings: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  diyChefNote: string;
  setDiyChefNote: (note: string) => void;
  calculatedDiyPizzaPrice: number;
  DIY_PIZZA_PRICES: Record<string, any>;
  QUICK_INSTRUCTION_TAGS: string[];
  quickAppendInstruction: (tag: string, type: "diy" | "normal") => void;
  handleAddDiyPizzaToCart: () => void;
  triggerHaptic: () => void;
  storeOpen: boolean;
}

export default function DiyPizzaBuilder({
  isHindi, diySize, setDiySize, diySauce, setDiySauce, diyMozzarella, setDiyMozzarella,
  diyVegSelection, setDiyVegSelection, diyPremiumToppings, setDiyPremiumToppings,
  diyChefNote, setDiyChefNote, calculatedDiyPizzaPrice, DIY_PIZZA_PRICES,
  QUICK_INSTRUCTION_TAGS, quickAppendInstruction, handleAddDiyPizzaToCart, triggerHaptic, storeOpen
}: DiyPizzaBuilderProps) {
  return (
    <div className="dark:bg-[#0f1115] bg-white border dark:border-white/5 border-neutral-200 rounded-3xl p-5 shadow-xl space-y-6 max-w-sm mx-auto font-sans font-bold">
      <div className="text-center space-y-1">
        <span className="bg-orange-500/10 text-orange-600 dark:text-orange-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
          DIY Pizza Tab
        </span>
        <h3 className="text-lg font-black text-neutral-900 dark:text-white">{isHindi ? "अपने मन का पिज़्ज़ा बनाएं 🍕" : "Create Custom Pizza 🍕"}</h3>
        <p className="text-[10px] text-neutral-600 dark:text-gray-400 font-semibold leading-relaxed">
          {isHindi ? "पसंद का बेस, सॉस, पनीर और मनपसंद वेजीज़ को टच करके अपनी रेसिपी तैयार करें!" : "Touch your preferred base, sauce, cheese and toppings to bake your own recipe!"}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "1. पिज़्ज़ा बेस चुनें:" : "1. Select Base Size:"}</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'small', label: 'Small Base (₹15)' },
            { id: 'medium', label: 'Medium Base (₹20)' },
            { id: 'large', label: 'Large Base (₹30)' }
          ].map((base) => (
            <button
              key={base.id}
              type="button"
              onClick={() => { triggerHaptic(); setDiySize(base.id); }}
              className={`p-3 rounded-xl border text-[10px] font-black text-center transition-all ${diySize === base.id ? 'border-orange-500 bg-orange-500/10 text-orange-600' : 'dark:border-white/5 border-neutral-300'}`}
            >
              {base.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          onClick={() => { triggerHaptic(); setDiySauce(!diySauce); }}
          className={`p-3 rounded-xl border text-xs font-black flex justify-between items-center transition-all ${diySauce ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300 opacity-60'}`}
        >
          <span>🥫 Pizza Sauce</span>
          <span className="font-extrabold text-[10px]">+₹{DIY_PIZZA_PRICES[diySize]?.sauce}</span>
        </button>

        <button
          type="button"
          onClick={() => { triggerHaptic(); setDiyMozzarella(!diyMozzarella); }}
          className={`p-3 rounded-xl border text-xs font-black flex justify-between items-center transition-all ${diyMozzarella ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300 opacity-60'}`}
        >
          <span>🧀 Mozzarella</span>
          <span className="font-extrabold text-[10px]">+₹{DIY_PIZZA_PRICES[diySize]?.mozzarella}</span>
        </button>
      </div>

      <div className="space-y-2.5 pt-2">
        <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "3. ताज़ा वेजीज़ जोड़ें:" : "3. Add Fresh Veggies:"}</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(DIY_PIZZA_PRICES[diySize]?.veggies || {}).map(([veg, cost]: any) => {
            const isSelected = !!diyVegSelection[veg];
            return (
              <button
                key={veg}
                type="button"
                onClick={() => { triggerHaptic(); setDiyVegSelection(p => ({ ...p, [veg]: !p[veg] })); }}
                className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-black capitalize transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300'}`}
              >
                <span>{veg}</span>
                <span className="font-extrabold text-orange-600 font-mono">+₹{cost}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5 pt-2">
        <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "4. प्रीमियम एक्स्ट्रा टॉपिंग:" : "4. Premium Extra Toppings:"}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'black_olive', label: 'Black Olive' },
            { id: 'jalapeno', label: 'Zalapino' },
            { id: 'red_peprica', label: 'Redpeprica' },
            { id: 'paneer', label: 'Paneer' },
            { id: 'mushroom', label: 'Mushroom' }
          ].map((item) => {
            const isSelected = !!diyPremiumToppings[item.id];
            const cost = DIY_PIZZA_PRICES[diySize]?.[item.id] || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { triggerHaptic(); setDiyPremiumToppings(p => ({ ...p, [item.id]: !p[item.id] })); }}
                className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-black transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300'}`}
              >
                <span>{item.label}</span>
                <span className="font-extrabold text-orange-600 font-mono">+₹{cost}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "5. कुकिंग निर्देश:" : "5. Chef Instructions:"}</label>
        <div className="flex flex-wrap gap-1 pb-1">
          {QUICK_INSTRUCTION_TAGS.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => quickAppendInstruction(tag, "diy")}
              className="text-[9px] font-bold py-1 px-2.5 rounded-full border dark:border-white/5 border-neutral-300 bg-neutral-100 dark:bg-neutral-800 dark:text-gray-300 text-neutral-800 hover:border-orange-500 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
        <textarea
          placeholder={isHindi ? "विशेष निर्देश दर्ज करें..." : "Enter custom instructions..."}
          value={diyChefNote}
          onChange={(e) => setDiyChefNote(e.target.value)}
          className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-neutral-50 border dark:border-white/5 border-neutral-300 dark:text-white outline-none focus:border-orange-500 h-16 resize-none text-neutral-900"
        />
      </div>

      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-2xl text-white text-center space-y-1 font-mono">
        <p className="text-[9px] font-bold uppercase opacity-85">Pizza Builder Subtotal</p>
        <h4 className="text-2xl font-black">₹{calculatedDiyPizzaPrice}</h4>
      </div>

      {storeOpen ? (
        <button
          onClick={handleAddDiyPizzaToCart}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-all"
        >
          <span>{isHindi ? "कस्टम पिज्जा कार्ट में जोड़ें ➔" : "Add Custom Pizza to Cart ➔"}</span>
        </button>
      ) : (
        <div className="text-center text-xs font-bold text-red-500 uppercase py-2">
          {isHindi ? "बम बम कैफ़े अभी बंद है!" : "Bum Bum Cafe is Closed!"}
        </div>
      )}
    </div>
  );
}
