'use client';

import React from 'react';
import { Plus } from 'lucide-react';

export default function StockLedger({
  isDarkMode, ledgerFilter, setLedgerFilter, unifiedLedger, setShowStockOutModal
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-black text-orange-600 uppercase">Stock Ledger</h2>
          <p className="text-[10px] text-neutral-400">आने और जाने वाले सामान का पूरा इतिहास</p>
        </div>
        <button onClick={() => setShowStockOutModal(true)} className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow"><Plus size={14} /> Log Wastage</button>
      </div>

      <div className="flex gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl text-xs">
        {(['All', 'IN', 'OUT'] as const).map((filter) => (
          <button 
            key={filter} onClick={() => setLedgerFilter(filter)}
            className={`flex-1 py-1.5 text-center font-bold rounded-lg transition-all ${
              ledgerFilter === filter ? 'bg-orange-500 text-white shadow' : 'text-neutral-400'
            }`}
          >
            {filter === 'All' ? 'सभी' : filter === 'IN' ? '📥 आवक' : '📤 जावक'}
          </button>
        ))}
      </div>

      <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
        {unifiedLedger
          .filter((log) => {
            if (ledgerFilter === 'IN') return log.type === 'IN';
            if (ledgerFilter === 'OUT') return log.type === 'OUT';
            return true;
          })
          .map((log: any) => (
            <div key={log.id} className={`p-3.5 rounded-2xl border flex flex-col justify-between ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{log.itemName}</p>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">📅 {log.date}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                  log.type === 'IN' ? 'bg-green-100 text-green-600 dark:bg-green-500/10' : 'bg-red-100 text-red-500'
                }`}>
                  {log.type === 'IN' ? '📥 STOCK IN' : `📤 ${log.purpose}`}
                </span>
              </div>
              {log.remarks && <p className="text-xs text-neutral-500 mt-2 italic">“{log.remarks}”</p>}
              <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase">
                <span>मात्रा: {log.qty} Units</span>
                {log.financialLoss ? <span className="text-red-500 font-black">नुकसान: ₹{log.financialLoss}</span> : null}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
