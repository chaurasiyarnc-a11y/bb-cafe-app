'use client';

import React from 'react';
import { Trash2, Edit, X, Printer, MessageCircle } from 'lucide-react';

interface OrderListMeta {
  id: string;
  name: string;
  date: string;
}

interface SavedOrderItem {
  id: string;
  itemId: string;
  listId: string;
  name: string;
  storeQty: number;
  unit: string;
  orderQty: string;
}

interface StockSupplierOrderProps {
  isDarkMode: boolean;
  orderLists: OrderListMeta[];
  savedOrders: SavedOrderItem[];
  activeListId: string;
  setActiveListId: (val: string) => void;
  handleDeleteActiveList: () => void;
  isEditingListName: boolean;
  setIsEditingListName: (val: boolean) => void;
  tempListNameInput: string;
  setTempListNameInput: (val: string) => void;
  handleUpdateListName: (val: string) => void;
  activeListName: string;
  localOrderQties: Record<string, string>;
  setLocalOrderQties: (val: any) => void;
  setFocusedOrderField: (val: string | null) => void;
  handleUpdateOrderQty: (compoundId: string, qty: string) => void;
  handleRemoveFromSavedList: (compoundId: string, name: string) => void;
  handlePrintSavedList: () => void;
  handleWhatsAppShare: () => void;
}

export default function StockSupplierOrder({
  isDarkMode, orderLists, savedOrders, activeListId, setActiveListId, handleDeleteActiveList,
  isEditingListName, setIsEditingListName, tempListNameInput, setTempListNameInput, handleUpdateListName,
  activeListName, localOrderQties, setLocalOrderQties, setFocusedOrderField, handleUpdateOrderQty,
  handleRemoveFromSavedList, handlePrintSavedList, handleWhatsAppShare
}: StockSupplierOrderProps) {
  const listItems = savedOrders.filter((o) => o.listId === activeListId);

  return (
    <div className="space-y-4">
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-100'}`}>
        <div className="bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-neutral-400 shrink-0">Choose List:</span>
            <select 
              value={activeListId} onChange={e => setActiveListId(e.target.value)}
              className={`flex-1 p-2 text-xs font-bold rounded-xl border ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}
            >
              <option value="">-- No Active List --</option>
              {orderLists.map((list) => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
            {activeListId && <button onClick={handleDeleteActiveList} className="p-2 bg-red-100 text-red-500 rounded-xl"><Trash2 size={14} /></button>}
          </div>

          {activeListId && (
            <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-2">
              {isEditingListName ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input type="text" value={tempListNameInput} onChange={e => setTempListNameInput(e.target.value)} className={`flex-1 p-2 rounded-xl border text-xs font-bold ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`} />
                  <button onClick={() => { handleUpdateListName(tempListNameInput); setIsEditingListName(false); }} className="px-3.5 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase">Save</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-black text-orange-600 uppercase tracking-widest">{activeListName}</h2>
                    <button onClick={() => { setTempListNameInput(activeListName); setIsEditingListName(true); }} className="text-neutral-400 hover:text-orange-500"><Edit size={12} /></button>
                  </div>
                  <span className="text-[8px] text-neutral-400 font-bold uppercase">{listItems.length} Items</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
        {listItems.map((item) => {
          const localValue = localOrderQties[item.id] !== undefined ? localOrderQties[item.id] : (item.orderQty || "");
          return (
            <div key={item.id} className={`p-3.5 rounded-2xl border flex justify-between items-center text-xs ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <div className="flex-1 pr-3">
                <p className="font-bold text-sm text-[#FF6B00]">{item.name}</p>
                <p className="text-[9px] text-neutral-400 font-bold uppercase">Stock: {item.storeQty} {item.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="text" placeholder="Qty" value={localValue} onFocus={() => setFocusedOrderField(item.id)}
                  onChange={e => setLocalOrderQties((prev: any) => ({ ...prev, [item.id]: e.target.value }))}
                  onBlur={() => { setFocusedOrderField(null); handleUpdateOrderQty(item.id, localValue); }}
                  className="w-24 p-2 rounded-xl border text-center font-bold text-xs bg-transparent dark:text-white"
                />
                <button onClick={() => handleRemoveFromSavedList(item.id, item.name)} className="text-neutral-400 hover:text-red-500"><X size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {listItems.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={handlePrintSavedList} className="py-3.5 bg-neutral-800 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow"><Printer size={15} /> Print Sheet</button>
          <button onClick={handleWhatsAppShare} className="py-3.5 bg-green-600 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow"><MessageCircle size={15} /> Send WhatsApp</button>
        </div>
      )}
    </div>
  );
}
