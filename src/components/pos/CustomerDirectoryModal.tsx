'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { X, Search, History, ArrowLeft, Edit, Loader2 } from 'lucide-react';

interface CustomerDirectoryModalProps {
  isCustomerModalOpen: boolean;
  setIsCustomerModalOpen: (open: boolean) => void;
  customerSearchQuery: string;
  setCustomerSearchQuery: (val: string) => void;
  searchedCustomers: any[];
  isSearchingCustomer: boolean;
  newCustName: string;
  setNewCustName: (val: string) => void;
  newCustPhone: string;
  setNewCustPhone: (val: string) => void;
  newCustAddress: string;
  setNewCustAddress: (val: string) => void;
  editingCustomer: any;
  viewingHistoryCustomer: any;
  customerHistoryList: any[];
  editCustPoints: number;
  setEditCustPoints: (val: number) => void;
  handleSelectCustomer: (cust: any) => void;
  handleLoadCustomerHistory: (cust: any) => void;
  handleStartEditProfile: (cust: any) => void;
  handleUpdateCustomerProfile: () => void;
  handleSaveNewCustomer: (e: any) => void;
  setViewingHistoryCustomer: (val: any) => void;
  setCustomerHistoryList: (val: any[]) => void;
  setEditingCustomer: (val: any) => void;
  searchDbCustomers: (text: string) => void;
  triggerBeep: (type: 'tap' | 'success') => void;
}

export default function CustomerDirectoryModal({
  isCustomerModalOpen, setIsCustomerModalOpen, customerSearchQuery, setCustomerSearchQuery,
  searchedCustomers, isSearchingCustomer, newCustName, setNewCustName, newCustPhone, setNewCustPhone,
  newCustAddress, setNewCustAddress, editingCustomer, viewingHistoryCustomer, customerHistoryList,
  editCustPoints, setEditCustPoints, handleSelectCustomer, handleLoadCustomerHistory,
  handleStartEditProfile, handleUpdateCustomerProfile, handleSaveNewCustomer,
  setViewingHistoryCustomer, setCustomerHistoryList, setEditingCustomer, searchDbCustomers, triggerBeep
}: CustomerDirectoryModalProps) {
  if (!isCustomerModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[130] flex items-center justify-center p-4 backdrop-blur-md font-sans text-gray-100">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#111] border border-white/10 w-full max-w-lg p-6 rounded-3xl text-left space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col justify-between"
      >
        {viewingHistoryCustomer ? (
          <div className="flex flex-col h-full flex-grow space-y-4 overflow-hidden">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-2 text-yellow-300">
                <History size={16} />
                <div>
                  <h3 className="text-sm font-black text-white">{viewingHistoryCustomer.name}'s Passbook</h3>
                  <p className="text-[8px] text-orange-500 font-bold uppercase tracking-wider">Points Ledger</p>
                </div>
              </div>
              <button type="button" onClick={() => { triggerBeep('tap'); setViewingHistoryCustomer(null); setCustomerHistoryList([]); }} className="p-1.5 bg-neutral-900 border border-white/5 text-gray-400 hover:text-white rounded-full"><ArrowLeft size={14} /> Back</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-[400px]">
              {customerHistoryList.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-10 uppercase tracking-widest font-black">No transactions found</p>
              ) : (
                customerHistoryList.map((h: any) => (
                  <div key={h.id} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div>
                      <span className="text-xs font-black text-gray-200 block">{h.description}</span>
                      <span className="text-[8px] text-gray-500 block font-mono">{h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString('en-IN') : new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono border ${h.type === 'earn' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{h.type === 'earn' ? '+' : '-'}{h.points} Pts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : editingCustomer ? (
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-2 text-yellow-300">
                <Edit size={16} />
                <div>
                  <h3 className="text-sm font-black text-white">Edit Customer Profile</h3>
                  <p className="text-[8px] text-orange-500 font-bold uppercase tracking-wider">Modify loyalty properties</p>
                </div>
              </div>
              <button type="button" onClick={() => { triggerBeep('tap'); setEditingCustomer(null); }} className="p-1.5 bg-neutral-900 border border-white/5 text-gray-400 hover:text-white rounded-full"><ArrowLeft size={14} /> Back</button>
            </div>
            <div className="space-y-4 text-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400">Mobile Number (Non-editable)</label>
                  <input type="text" disabled value={editingCustomer.phone} className="w-full bg-neutral-900/50 border border-white/5 text-gray-500 p-2.5 rounded-xl text-xs font-mono font-bold cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400">Customer Name</label>
                  <input type="text" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400">Saved Delivery Address</label>
                  <input type="text" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-semibold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400">Loyalty Points Balance</label>
                  <input type="number" value={editCustPoints} onChange={(e) => setEditCustPoints(Math.max(0, Number(e.target.value)))} className="w-full bg-black/40 border border-white/10 text-yellow-300 p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-mono font-black" />
                </div>
              </div>
              <button type="button" onClick={handleUpdateCustomerProfile} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl text-xs uppercase">Save Profile Changes ➔</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div><h3 className="text-sm font-black text-white">Customer Directory</h3><p className="text-[8px] text-orange-500 font-bold uppercase tracking-wider">Loyalty & Address Lookup</p></div>
              <button type="button" onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(false); }} className="p-1.5 bg-neutral-900 border border-white/5 text-gray-400 hover:text-white rounded-full"><X size={14} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Search Existing Member</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                  <input type="text" placeholder="Search by 10-digit Phone or Name..." value={customerSearchQuery} onChange={(e) => { setCustomerSearchQuery(e.target.value); searchDbCustomers(e.target.value); }} className="w-full bg-neutral-900 border border-white/5 rounded-xl py-2 px-9 text-xs text-white outline-none focus:border-orange-500 placeholder-gray-500 transition-colors" />
                </div>
              </div>

              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                {isSearchingCustomer ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-orange-500" size={18} /></div>
                ) : searchedCustomers.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-3 uppercase tracking-widest font-black">No matches found</p>
                ) : (
                  searchedCustomers.map((cust) => (
                    <div key={cust.id} className="bg-neutral-900 border border-white/5 p-3 rounded-2xl flex flex-col gap-2.5 hover:border-orange-500/50 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5"><span className="font-bold text-xs text-white block">{cust.name}</span><span className="text-[9px] text-gray-400 font-mono block">📞 {cust.phone} {cust.address ? `| 📍 ${cust.address.substring(0, 20)}...` : ''}</span></div>
                        <span className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-[9px] font-black px-2 py-0.5 rounded-full font-mono">{cust.points || 0} Pts</span>
                      </div>
                      <div className="flex gap-2 border-t border-white/5 pt-2">
                        <button type="button" onClick={() => handleSelectCustomer(cust)} className="flex-1 bg-green-600/10 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/20 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all">Select ➔</button>
                        <button type="button" onClick={() => handleStartEditProfile(cust)} className="bg-neutral-850 hover:bg-neutral-800 text-gray-300 border border-white/5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all">✍️ Edit</button>
                        <button type="button" onClick={() => handleLoadCustomerHistory(cust)} className="bg-neutral-850 hover:bg-neutral-800 text-yellow-400 border border-white/5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all">📜 Passbook</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Or Register New Guest Profile</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400">Mobile Number (10 digit)</label>
                    <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400">Customer Name</label>
                    <input type="text" placeholder="e.g. Ramesh ji" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-bold" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-gray-400">Delivery Address (Optional)</label>
                  <input type="text" placeholder="e.g. House No. 12, Mohandra" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-semibold" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 flex gap-2">
              <button type="button" onClick={handleSaveNewCustomer} className="flex-grow bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow">Save & Select Guest ➔</button>
              <button type="button" onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(false); }} className="bg-neutral-900 border border-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase">Cancel</button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
