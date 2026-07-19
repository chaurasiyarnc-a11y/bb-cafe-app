'use client';

import React from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';

export default function StockAssets({
  isDarkMode, searchQuery, setSearchQuery, filteredAssets, setShowAddAssetModal, handleDeleteAsset
}: any) {
  return (
    <div className="space-y-4">
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-black text-orange-600 uppercase">Fixed Assets</h2>
            <p className="text-[10px] text-neutral-400">उपकरण, फ्रिज, ओवन आदि</p>
          </div>
          <button onClick={() => setShowAddAssetModal(true)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow">
            <Plus size={14} /> Add Asset
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
          <input 
            type="text" placeholder="एसेट्स खोजें..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-950'}`}
          />
        </div>
      </div>

      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
        {filteredAssets.map((asset: any) => (
          <div key={asset.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{asset.name}</p>
                <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">मात्रा: {asset.quantity} Units</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                  asset.condition === 'Working' ? 'bg-green-100 text-green-600' : asset.condition === 'Needs Repair' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }`}>
                  {asset.condition}
                </span>
                <button onClick={() => handleDeleteAsset(asset.id, asset.name)} className="p-1 hover:bg-red-100 text-neutral-400 hover:text-red-500 rounded-lg"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
