'use client';

import React from 'react';

export default function StockDashboard({
  isDarkMode, dashboardDateRange, setDashboardDateRange, startDate, setStartDate, endDate, setEndDate,
  getFilteredLedgerStats, stats, categories, categoryStockValues, stockFlowTimeline
}: any) {
  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-black uppercase text-neutral-400 shrink-0">चुनें:</span>
          <div className="flex gap-1 flex-1 justify-end flex-wrap">
            {([
              { range: 'today', label: 'आज' },
              { range: 'yesterday', label: 'कल' },
              { range: 'week', label: '1 हफ़्ता' },
              { range: 'month', label: 'महीना' },
              { range: 'year', label: 'साल' },
              { range: 'custom', label: 'कैलेंडर 📅' }
            ] as const).map((opt) => (
              <button
                key={opt.range}
                onClick={() => setDashboardDateRange(opt.range)}
                className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 transition-all ${
                  dashboardDateRange === opt.range 
                    ? 'bg-orange-500 text-white shadow' 
                    : isDarkMode ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {dashboardDateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs">
            <div className="space-y-1">
              <label className="text-[9px] text-neutral-400 font-bold uppercase">शुरुआती तारीख</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 rounded-xl border dark:bg-neutral-800 dark:border-neutral-700" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-neutral-400 font-bold uppercase">अंतिम तारीख</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 rounded-xl border dark:bg-neutral-800 dark:border-neutral-700" />
            </div>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
          <p className="text-[8px] font-black text-neutral-400 uppercase">सामान आया (IN)</p>
          <p className="text-xs font-black text-green-500 mt-1">{getFilteredLedgerStats?.totalInwardQty} यूनिट्स</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
          <p className="text-[8px] font-black text-neutral-400 uppercase">किचन गया (OUT)</p>
          <p className="text-xs font-black text-orange-500 mt-1">{getFilteredLedgerStats?.totalKitchenQty} यूनिट्स</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
          <p className="text-[8px] font-black text-neutral-400 uppercase">नुकसान (Loss)</p>
          <p className="text-xs font-black text-red-500 mt-1">₹{getFilteredLedgerStats?.totalWasteLoss?.toLocaleString()}</p>
        </div>
      </div>

      {/* स्टॉक और अचल संपत्ति का वर्गीकृत मूल्य (2x2 ग्रिड) */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
          <p className="text-[8px] font-black text-neutral-400 uppercase">📦 गोदाम का कुल स्टॉक</p>
          <p className="text-xs font-black text-neutral-700 dark:text-neutral-200 mt-1">₹{stats?.totalVal?.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
          <p className="text-[8px] font-black text-neutral-400 uppercase">🏢 सामान्य एसेट्स मूल्य</p>
          <p className="text-xs font-black text-blue-500 mt-1">₹{(stats?.generalAssetsVal || 0).toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
          <p className="text-[8px] font-black text-neutral-400 uppercase">🍴 कटलरी कुल मूल्य</p>
          <p className="text-xs font-black text-amber-500 mt-1">₹{(stats?.cutleryVal || 0).toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
          <p className="text-[8px] font-black text-neutral-400 uppercase">🍽️ क्रॉकरी कुल मूल्य</p>
          <p className="text-xs font-black text-pink-500 mt-1">₹{(stats?.crockeryVal || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* सभी संपत्तियों (Fixed Assets) का ग्रैंड टोटल */}
      <div className={`p-2.5 rounded-xl border text-center text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400' : 'bg-neutral-50 border-neutral-150 text-neutral-500'}`}>
        कुल अचल संपत्ति (Total Assets Value): <span className="text-orange-500 font-bold ml-1">₹{stats?.totalFixedVal?.toLocaleString()}</span>
      </div>

      {/* Category Stock Values */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider px-1">कैटेगरी के अनुसार स्टॉक मूल्य</h3>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat: any) => {
            const value = categoryStockValues[cat.name] || 0;
            return (
              <div key={cat.id} className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${isDarkMode ? 'bg-[#181818]/50 border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <div>
                  <p className="font-bold text-neutral-400 uppercase text-[9px]">{cat.name}</p>
                  <p className="font-black mt-1 text-[#FF6B00]">₹{value.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">आवक और जावक प्रवाह टाइमलाइन</h3>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold uppercase">{stockFlowTimeline.length} एंट्रीज</span>
        </div>
        <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1">
          {stockFlowTimeline.map((item: any) => (
            <div key={item.id} className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${isDarkMode ? 'bg-[#181818]/65 border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.type === 'IN' ? 'bg-green-500' : 'bg-orange-500'}`} />
                <div>
                  <p className={item.type === 'IN' ? 'text-green-500' : 'text-orange-500'}>{item.name}</p>
                  <p className="text-[8px] text-neutral-400 font-bold uppercase mt-0.5">{item.type === 'IN' ? '📥 गोदाम में आवक' : '🍳 किचन स्थानांतरण'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black">{item.type === 'IN' ? '+' : '-'}{item.qty} {item.unit}</p>
                <p className="text-[7px] text-neutral-400 font-bold">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
