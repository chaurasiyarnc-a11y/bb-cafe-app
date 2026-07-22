'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, RefreshCw, Edit } from 'lucide-react';

export default function StockAssets({
  isDarkMode, searchQuery, setSearchQuery, filteredAssets, setShowAddAssetModal, handleDeleteAsset, handleMigrate, setEditingAsset, handleAdjustQty
}: any) {
  // लोकल स्टेट: एसेट्स को 3 श्रेणियों में फ़िल्टर करने के लिए ('general', 'cutlery', या 'crockery')
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'cutlery' | 'crockery'>('general');

  // एक्टिव सब-टैब के आधार पर एसेट्स फ़िल्टर करने का लॉजिक
  const displayedAssets = useMemo(() => {
    return filteredAssets.filter((asset: any) => {
      const assetType = asset.type || 'general'; // डिफ़ॉल्ट रूप से 'general' (सामान्य एसेट)
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
      {/* हेडर और एक्शन बटन */}
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-black text-orange-600 uppercase">स्थायी संपत्ति (Fixed Assets)</h2>
            <p className="text-[10px] text-neutral-400">उपकरण, फ्रिज, ओवन, कटलरी और क्रॉकरी</p>
          </div>
          
          <div className="flex gap-1.5">
            {/* गोदाम से डेटा ऑटो-शिफ्ट करने का बटन */}
            <button 
              onClick={handleMigrate}
              className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow transition-all active:scale-95"
              title="गोदाम से सारा क्रॉकरी व कटलरी डेटा यहाँ शिफ्ट करें"
            >
              <RefreshCw size={12} /> डेटा शिफ्ट करें
            </button>
            <button 
              onClick={() => setShowAddAssetModal(true)} 
              className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow transition-all active:scale-95"
            >
              <Plus size={12} /> एसेट जोड़ें
            </button>
          </div>
        </div>

        {/* 3 सब-टैब बटन्स (एसेट्स, कटलरी, क्रॉकरी) */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'general'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🏢 एसेट्स
          </button>
          <button
            onClick={() => setActiveSubTab('cutlery')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'cutlery'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🍴 कटलरी
          </button>
          <button
            onClick={() => setActiveSubTab('crockery')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'crockery'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🍽️ क्रॉकरी
          </button>
        </div>

        {/* सर्च बार */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
          <input 
            type="text" 
            placeholder="एसेट्स खोजें..." 
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
          <div className="text-center py-12 space-y-1">
            <span className="text-2xl">📦</span>
            <p className="text-xs text-neutral-400 font-bold">इस कैटेगरी में कोई सामान नहीं मिला।</p>
          </div>
        ) : (
          displayedAssets.map((asset: any) => {
            const condDetails = getConditionDetails(asset.condition);
            return (
              <div key={asset.id} className={`p-4 rounded-2xl border flex flex-col gap-3 justify-between ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{asset.name}</p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">लागत: ₹{(asset.cost || 0).toLocaleString()}</p>
                  </div>
                  
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${condDetails.style}`}>
                    {condDetails.label}
                  </span>
                </div>

                {/* कम-ज्यादा (मासिक री-काउंटिंग) और एडिट के लिए नीचे का पैनल */}
                <div className="flex items-center justify-between border-t border-dashed dark:border-neutral-800/80 pt-2.5 mt-1">
                  
                  {/* मात्रा कम / ज्यादा करने का कंट्रोलर */}
                  <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
                    <button 
                      onClick={() => handleAdjustQty(asset.id, -1)} 
                      className="w-7 h-7 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-lg text-xs font-black shadow-sm active:scale-90 transition-all text-red-500"
                      title="कम करें (-1)"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-xs font-black dark:text-neutral-200">
                      {asset.quantity} {asset.type === 'general' ? 'Units' : 'Pcs'}
                    </span>
                    <button 
                      onClick={() => handleAdjustQty(asset.id, 1)} 
                      className="w-7 h-7 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-lg text-xs font-black shadow-sm active:scale-90 transition-all text-green-500"
                      title="बढ़ाएं (+1)"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* संपादित करें (Edit Details) बटन */}
                    <button 
                      onClick={() => setEditingAsset(asset)}
                      className="px-3 py-2 bg-orange-100 dark:bg-orange-950/20 text-orange-500 hover:text-orange-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-colors"
                      title="विवरण संपादित करें"
                    >
                      <Edit size={11} /> एडिट
                    </button>
                    <button 
                      onClick={() => handleDeleteAsset(asset.id, asset.name)} 
                      className="p-2 bg-red-50 dark:bg-red-950/10 text-neutral-400 hover:text-red-500 rounded-xl transition-colors"
                      title="हटाएं"
                    >
                      <Trash2 size={12} />
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
