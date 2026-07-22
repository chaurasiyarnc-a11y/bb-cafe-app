'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';

export default function StockAssets({
  isDarkMode, searchQuery, setSearchQuery, filteredAssets, setShowAddAssetModal, handleDeleteAsset
}: any) {
  // लोकल स्टेट: एसेट कैटेगरी फ़िल्टर करने के लिए ('general' या 'crockery_cutlery')
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'crockery_cutlery'>('general');

  // एक्टिव सब-टैब के आधार पर एसेट्स फ़िल्टर करने का लॉजिक
  const displayedAssets = useMemo(() => {
    return filteredAssets.filter((asset: any) => {
      const assetType = asset.type || 'general'; // यदि type सेट नहीं है, तो उसे 'general' मानेंगे
      return assetType === activeSubTab;
    });
  }, [filteredAssets, activeSubTab]);

  // एसेट की स्थिति (Condition) का हिंदी अनुवाद और स्टाइलिंग
  const getConditionDetails = (cond: string) => {
    if (cond === 'Working') {
      return { 
        label: 'सक्रिय (Working)', 
        style: 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400' 
      };
    }
    if (cond === 'Needs Repair') {
      return { 
        label: 'मरम्मत योग्य (Needs Repair)', 
        style: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' 
      };
    }
    return { 
      label: 'टूटा हुआ (Broken)', 
      style: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' 
    };
  };

  return (
    <div className="space-y-4">
      {/* चिपचिपा (Sticky) हेडर और सर्च सेक्शन */}
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black text-orange-600 uppercase">स्थायी संपत्ति (Fixed Assets)</h2>
            <p className="text-[10px] text-neutral-400">उपकरण, फ्रिज, क्रॉकरी, ओवन आदि</p>
          </div>
          <button 
            onClick={() => setShowAddAssetModal(true)} 
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow transition-colors"
          >
            <Plus size={14} /> एसेट जोड़ें
          </button>
        </div>

        {/* सब-टैब बटन (सामान्य एसेट्स बनाम क्रॉकरी और कटलरी) */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'general'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🏢 सामान्य एसेट्स
          </button>
          <button
            onClick={() => setActiveSubTab('crockery_cutlery')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'crockery_cutlery'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🍽️ क्रॉकरी और कटलरी
          </button>
        </div>

        {/* सर्च बार */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
          <input 
            type="text" 
            placeholder="यहाँ खोजें..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${
              isDarkMode 
                ? 'bg-neutral-900 border-neutral-800 text-white focus:border-neutral-700' 
                : 'bg-white border-neutral-200 text-neutral-950 focus:border-neutral-300'
            } focus:outline-none`}
          />
        </div>
      </div>

      {/* एसेट्स की सूची */}
      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
        {displayedAssets.length === 0 ? (
          <div className="text-center py-10 space-y-1">
            <span className="text-2xl">📦</span>
            <p className="text-xs text-neutral-400 font-bold">इस कैटेगरी में कोई एसेट नहीं मिला।</p>
          </div>
        ) : (
          displayedAssets.map((asset: any) => {
            const condDetails = getConditionDetails(asset.condition);
            return (
              <div key={asset.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{asset.name}</p>
                    <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">मात्रा: {asset.quantity} यूनिट्स</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${condDetails.style}`}>
                      {condDetails.label}
                    </span>
                    <button 
                      onClick={() => handleDeleteAsset(asset.id, asset.name)} 
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-950/40 text-neutral-400 hover:text-red-500 rounded-lg transition-colors"
                      title="हटाएं"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
