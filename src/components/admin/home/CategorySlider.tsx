
'use client';
import React from 'react';
import { Heart } from 'lucide-react';

interface CategorySliderProps {
  isHindi: boolean;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  visibleCategories: string[];
  favorites: string[];
  getCategoryImage: (catName: string) => string;
  triggerHaptic: () => void;
}

export default function CategorySlider({
  isHindi,
  selectedCategory,
  setSelectedCategory,
  visibleCategories,
  favorites,
  getCategoryImage,
  triggerHaptic
}: CategorySliderProps) {
  return (
    <div className="sticky top-[64px] z-30 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-md py-2.5 px-1 border-b border-neutral-200 dark:border-white/5 transition-all duration-200 shadow-sm font-sans font-bold">
      <div className="flex gap-5 overflow-x-auto py-2 px-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* पसंदीदा (Favorites) बटन */}
        <button 
          onClick={() => { triggerHaptic(); setSelectedCategory("Favorites"); }} 
          className="flex flex-col items-center flex-shrink-0 group outline-none"
        >
          <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all flex items-center justify-center ${selectedCategory === "Favorites" ? 'border-red-500 scale-105 shadow-md' : 'dark:border-neutral-300 bg-white dark:bg-neutral-900'}`}>
            <Heart size={24} className={selectedCategory === "Favorites" ? 'text-red-500 fill-red-500' : 'text-neutral-500 dark:text-gray-400'} />
          </div>
          <span className={`text-[9px] font-black uppercase mt-1.5 truncate ${selectedCategory === "Favorites" ? 'text-red-500' : 'dark:text-gray-400 text-neutral-800'}`}>
            {isHindi ? "पसंदीदा" : "My Favorites"}
          </span>
        </button>

        {/* अन्य कैटगरीज़ */}
        {visibleCategories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-center flex-shrink-0 group outline-none">
              <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all ${isActive ? 'border-orange-500 scale-105 shadow-md' : 'dark:border-white/10 border-neutral-300 bg-neutral-950'}`}>
                {cat === "DIY Pizza" ? (
                  <div className="w-full h-full flex items-center justify-center text-lg bg-gradient-to-tr from-yellow-500 to-red-500 text-white">🍕</div>
                ) : (
                  <img src={getCategoryImage(cat)} className="w-full h-full object-cover" alt={cat} loading="lazy" />
                )}
              </div>
              <span className={`text-[9px] font-black uppercase mt-1.5 truncate max-w-[70px] text-center ${isActive ? 'dark:text-orange-500 text-orange-700' : 'dark:text-gray-400 text-neutral-800'}`}>
                {cat === "All" ? (isHindi ? "सभी" : "All") : cat.replace("Special ", "").replace(" Special", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
