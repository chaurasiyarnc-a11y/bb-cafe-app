'use client';

import React, { useState, useMemo } from 'react';

export default function StockDashboard({
  isDarkMode, dashboardDateRange, setDashboardDateRange, startDate, setStartDate, endDate, setEndDate,
  getFilteredLedgerStats, stats, categories, categoryStockValues, stockFlowTimeline
}: any) {
  // लोकल स्टेट: डैशबोर्ड के सब-टैब को कंट्रोल करने के लिए
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'godown' | 'assets'>('overview');

  // --- विस्तृत आवक-जावक रिपोर्ट (Consolidated Itemized Report) निकालने का लॉजिक ---
  // यह चुनी हुई तारीख के आधार पर सभी एंट्रीज को आपस में जोड़कर (group करके) दिखाता है
  const consolidatedReport = useMemo(() => {
    const inwardGroup: Record<string, { qty: number; unit: string }> = {};
    const outwardGroup: Record<string, { qty: number; unit: string }> = {};

    (stockFlowTimeline || []).forEach((item: any) => {
      const name = item.name || "अज्ञात सामान";
      const qty = Number(item.qty || 0);
      const unit = item.unit || "Pcs";

      if (item.type === 'IN') {
        if (!inwardGroup[name]) {
          inwardGroup[name] = { qty: 0, unit: unit };
        }
        inwardGroup[name].qty += qty;
      } else {
        if (!outwardGroup[name]) {
          outwardGroup[name] = { qty: 0, unit: unit };
        }
        outwardGroup[name].qty += qty;
      }
    });

    return {
      inward: Object.entries(inwardGroup).map(([name, data]) => ({ name, ...data })),
      outward: Object.entries(outwardGroup).map(([name, data]) => ({ name, ...data }))
    };
  }, [stockFlowTimeline]);

  // चयनित अवधि का नाम प्राप्त करने का फ़ंक्शन
  const getPeriodLabel = () => {
    if (dashboardDateRange === 'today') return "आज (Today)";
    if (dashboardDateRange === 'yesterday') return "कल (Yesterday)";
    if (dashboardDateRange === 'week') return "इस हफ़्ते (This Week)";
    if (dashboardDateRange === 'month') return "इस महीने (This Month)";
    if (dashboardDateRange === 'year') return "इस साल (This Year)";
    return `कस्टम अवधि (${startDate} से ${endDate})`;
  };

  return (
    <div className="space-y-4">
      {/* 1. Date Range Selector (चिपचिपा तारीख सिलेक्टर) */}
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-black uppercase text-neutral-400 shrink-0">तारीख:</span>
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
                className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 transition-all ${
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

        {/* 2. Dashboard Sub-Tabs Selector (डैशबोर्ड के 3 मुख्य टैब) */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900/60 p-1 rounded-xl mt-2">
          <button
            onClick={() => setDashboardTab('overview')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              dashboardTab === 'overview'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            📊 मुख्य सारांश
          </button>
          <button
            onClick={() => setDashboardTab('godown')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              dashboardTab === 'godown'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            📦 गोदाम स्टॉक
          </button>
          <button
            onClick={() => setDashboardTab('assets')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              dashboardTab === 'assets'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🏢 फिक्स्ड एसेट्स
          </button>
        </div>
      </div>

      {/* --- टैब 1: मुख्य सारांश (OVERVIEW TAB) --- */}
      {dashboardTab === 'overview' && (
        <div className="space-y-4">
          {/* आवक-जावक फ्लो */}
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

          {/* गोदाम और एसेट्स का कुल मूल्य */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-4 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <p className="text-[10px] font-black text-neutral-400 uppercase">📦 गोदाम का कुल स्टॉक</p>
              <p className="text-sm font-black text-neutral-700 dark:text-neutral-200 mt-1">₹{stats?.totalVal?.toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <p className="text-[10px] font-black text-neutral-400 uppercase">🏢 कुल स्थायी संपत्ति</p>
              <p className="text-sm font-black text-blue-500 mt-1">₹{stats?.totalFixedVal?.toLocaleString()}</p>
            </div>
          </div>

          {/* --- 📝 विस्तृत आवक-जावक रिपोर्ट सेक्शन (NEW) --- */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${isDarkMode ? 'bg-[#121212] border-neutral-800' : 'bg-white border-neutral-150'}`}>
            <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2">
              <h3 className="text-xs font-black uppercase text-orange-500">📝 विस्तृत रिपोर्ट (Detailed Report)</h3>
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold uppercase">{getPeriodLabel()}</span>
            </div>

            {consolidatedReport.inward.length === 0 && consolidatedReport.outward.length === 0 ? (
              <p className="text-[10px] text-center text-neutral-400 py-4 font-bold uppercase">इस अवधि में कोई आवक-जावक रिकॉर्ड दर्ज नहीं है।</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                
                {/* कुल आवक सूची (IN) */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-green-500 uppercase border-b border-dashed border-green-500/30 pb-1">📥 कुल आवक (IN):</p>
                  {consolidatedReport.inward.length === 0 ? (
                    <p className="text-[9px] text-neutral-400 italic">कोई आवक नहीं</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[25vh] overflow-y-auto pr-1">
                      {consolidatedReport.inward.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] font-bold">
                          <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-[70px]">{item.name}</span>
                          <span className="text-green-500 font-black shrink-0">+{item.qty} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* कुल जावक सूची (OUT) */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-orange-500 uppercase border-b border-dashed border-orange-500/30 pb-1">🍳 कुल जावक (OUT):</p>
                  {consolidatedReport.outward.length === 0 ? (
                    <p className="text-[9px] text-neutral-400 italic">कोई जावक नहीं</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[25vh] overflow-y-auto pr-1">
                      {consolidatedReport.outward.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[10px] font-bold">
                          <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-[70px]">{item.name}</span>
                          <span className="text-orange-500 font-black shrink-0">-{item.qty} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* --- टैब 2: गोदाम स्टॉक विवरण (GODOWN STOCK TAB) --- */}
      {dashboardTab === 'godown' && (
        <div className="space-y-4">
          {/* कैटेगरी के अनुसार गोदाम का कुल स्टॉक मूल्य */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider px-1">कैटेगरी के अनुसार गोदाम स्टॉक</h3>
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

          {/* आवक-जावक इतिहास (Timeline) */}
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
      )}

      {/* --- टैब 3: फिक्स्ड एसेट्स विवरण (FIXED ASSETS TAB) --- */}
      {dashboardTab === 'assets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <p className="text-[8px] font-black text-neutral-400 uppercase">🏢 सामान्य एसेट्स</p>
              <p className="text-xs font-black text-blue-500 mt-1">₹{(stats?.generalAssetsVal || 0).toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <p className="text-[8px] font-black text-neutral-400 uppercase">🍴 कटलरी</p>
              <p className="text-xs font-black text-amber-500 mt-1">₹{(stats?.cutleryVal || 0).toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-2xl border text-center flex flex-col justify-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
              <p className="text-[8px] font-black text-neutral-400 uppercase">🍽️ क्रॉकरी</p>
              <p className="text-xs font-black text-pink-500 mt-1">₹{(stats?.crockeryVal || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* ग्रैंड टोटल पट्टी */}
          <div className={`p-3 rounded-xl border text-center text-xs font-black uppercase tracking-wider ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400' : 'bg-neutral-50 border-neutral-150 text-neutral-500'}`}>
            कुल अचल संपत्ति (Total Assets Value): <span className="text-orange-500 font-bold ml-1">₹{stats?.totalFixedVal?.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
