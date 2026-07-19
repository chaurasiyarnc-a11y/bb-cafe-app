'use client';

import React from 'react';
import { Search, Plus, Edit, MinusCircle, PlusCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  storeQty: number;
  kitchenQty: number;
  unit: string;
  purchasePrice: number;
  minLimit: number;
  category?: string;
  lastPurchaseDate?: string;
}

interface CategoryItem {
  id: string;
  name: string;
  hidden: boolean;
}

interface StockGodownProps {
  isDarkMode: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (val: boolean) => void;
  selectedItemIds: string[];
  setSelectedItemIds: (val: any) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (val: string) => void;
  visibleCategories: CategoryItem[];
  filteredInventory: InventoryItem[];
  editedQties: Record<string, string | number>;
  setEditedQties: (val: any) => void;
  adjustQty: (id: string, diff: number) => void;
  saveQty: (id: string) => void;
  handleToggleMultiSelect: (id: string) => void;
  setShowManageCategoriesModal: (val: boolean) => void;
  setShowAddProductModal: (val: boolean) => void;
  setEditingProduct: (item: InventoryItem | null) => void;
  setTransferItem: (item: InventoryItem | null) => void;
  setShowTransferModal: (val: boolean) => void;
  setConsumeItem: (item: InventoryItem | null) => void;
  setShowConsumeModal: (val: boolean) => void;
}

export default function StockGodown({
  isDarkMode, searchQuery, setSearchQuery, isMultiSelectMode, setIsMultiSelectMode, selectedItemIds, setSelectedItemIds,
  selectedCategoryFilter, setSelectedCategoryFilter, visibleCategories, filteredInventory, editedQties, setEditedQties,
  adjustQty, saveQty, handleToggleMultiSelect, setShowManageCategoriesModal, setShowAddProductModal, setEditingProduct,
  setTransferItem, setShowTransferModal, setConsumeItem, setShowConsumeModal
}: StockGodownProps) {
  return (
    <div className="space-y-4">
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input 
              type="text" placeholder="आइटम खोजें..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-950'}`}
            />
          </div>
          <button 
            onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedItemIds([]); }}
            className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
              isMultiSelectMode ? 'bg-orange-500 text-white border-orange-500' : isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
            }`}
          >
            {isMultiSelectMode ? "Stop Select" : "Multi Select"}
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[8px] font-black uppercase text-neutral-400 tracking-wider">क्लिक कर फ़िल्टर करें:</span>
            <button onClick={() => setShowManageCategoriesModal(true)} className="text-[8px] text-orange-500 hover:underline uppercase font-black">🛠️ Manage Categories</button>
          </div>
          
          <div className="flex flex-wrap gap-1.5 w-full">
            <button
              onClick={() => setSelectedCategoryFilter("All")}
              className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                selectedCategoryFilter === "All" ? "bg-orange-500 border-orange-500 text-white" : isDarkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-600"
              }`}
            >
              All Items
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id} onClick={() => setSelectedCategoryFilter(cat.name)}
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                  selectedCategoryFilter === cat.name ? "bg-orange-500 border-orange-500 text-white" : isDarkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={() => setShowAddProductModal(true)} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 shadow">
        <Plus size={14} /> Add New Product (सामान जोड़ें)
      </button>

      <div className="space-y-2.5">
        {filteredInventory.map((item) => {
          const isSelected = selectedItemIds.includes(item.id);
          const displayQty = editedQties[item.id] !== undefined ? editedQties[item.id] : item.storeQty;
          const isDirty = editedQties[item.id] !== undefined && parseFloat(editedQties[item.id] as string) !== item.storeQty;
          const isLowStock = item.storeQty < item.minLimit;

          return (
            <div 
              key={item.id} onClick={() => { if (isMultiSelectMode) handleToggleMultiSelect(item.id); }}
              className={`p-3.5 rounded-2xl border transition-all relative ${isMultiSelectMode ? 'cursor-pointer' : ''} ${
                isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'
              } ${isSelected ? 'ring-2 ring-orange-500 bg-orange-500/[0.01]' : ''} ${isLowStock ? 'border-red-500 bg-red-500/[0.02]' : ''}`}
            >
              {isMultiSelectMode && (
                <div className="absolute top-3.5 right-3.5 w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center z-10">
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-orange-600">{item.name}</p>
                    {item.category && <span className="px-1.5 py-0.5 text-[8px] bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-bold rounded-md uppercase">{item.category}</span>}
                    {isLowStock && <span className="px-1.5 py-0.5 text-[8px] bg-red-100 dark:bg-red-950/40 text-red-600 font-bold rounded-md uppercase flex items-center gap-0.5">⚠️ LOW STOCK</span>}
                    {!isMultiSelectMode && (
                      <button onClick={(e) => { e.stopPropagation(); setEditingProduct(item); }} className="text-neutral-400 hover:text-orange-500"><Edit size={12} /></button>
                    )}
                  </div>
                  
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] font-bold uppercase text-neutral-400">
                    <span>📦 Godown: <span className="text-neutral-800 dark:text-neutral-200">{item.storeQty} {item.unit}</span></span>
                    <span>🍳 Kitchen: <span className="text-orange-500">{item.kitchenQty || 0} {item.unit}</span></span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); adjustQty(item.id, -1); }} className="p-1 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-lg"><MinusCircle size={14} /></button>
                  <input 
                    type="number" value={displayQty} onClick={e => e.stopPropagation()}
                    onChange={e => setEditedQties((prev: any) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-12 text-center text-xs font-bold border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded p-1"
                  />
                  <button onClick={(e) => { e.stopPropagation(); adjustQty(item.id, 1); }} className="p-1 bg-green-100 dark:bg-green-500/10 text-green-500 rounded-lg"><PlusCircle size={14} /></button>
                  {isDirty && <button onClick={(e) => { e.stopPropagation(); saveQty(item.id); }} className="px-2 py-1 bg-green-600 text-white text-[10px] font-black rounded-lg">💾 सेव</button>}
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setTransferItem(item); setShowTransferModal(true); }} className="px-2 py-1 bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 text-orange-600 text-[9px] font-black uppercase rounded-lg flex items-center gap-1">🍳 Send To Kitchen</button>
                  <button onClick={(e) => { e.stopPropagation(); setConsumeItem(item); setShowConsumeModal(true); }} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-300 text-neutral-600 text-[9px] font-black uppercase rounded-lg flex items-center gap-1">🍽️ Use</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
