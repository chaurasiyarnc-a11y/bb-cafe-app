'use client';

import React, { useState, useMemo } from 'react';
import { Printer } from 'lucide-react'; // मिसिंग इम्पोर्ट यहाँ जोड़ दिया गया है

export default function StockDashboard({
  isDarkMode, dashboardDateRange, setDashboardDateRange, startDate, setStartDate, endDate, setEndDate,
  getFilteredLedgerStats, stats, categories, categoryStockValues, stockFlowTimeline, fixedAssets
}: any) {
  // लोकल स्टेट: डैशबोर्ड के सब-टैब को कंट्रोल करने के लिए
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'godown' | 'assets'>('overview');

  // --- विस्तृत आवक-जावक रिपोर्ट (Consolidated Itemized Report) निकालने का लॉजिक ---
  // यह चुनी हुई तारीख के आधार पर सभी एंट्रीज को आपस में जोड़कर (group करके) दिखाता है
  const consolidatedReport = useMemo(() => {
    const inwardGroup: Record<string, { qty: number; price: number; unit: string }> = {};
    const outwardGroup: Record<string, { qty: number; price: number; unit: string }> = {};

    (stockFlowTimeline || []).forEach((item: any) => {
      const name = item.name || "अज्ञात सामान";
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0); // दर (Price) यहाँ मैप की गई है
      const unit = item.unit || "Pcs";

      if (item.type === 'IN') {
        if (!inwardGroup[name]) {
          inwardGroup[name] = { qty: 0, price: price, unit: unit };
        }
        inwardGroup[name].qty += qty;
      } else {
        if (!outwardGroup[name]) {
          outwardGroup[name] = { qty: 0, price: price, unit: unit };
        }
        outwardGroup[name].qty += qty;
      }
    });

    return {
      inward: Object.entries(inwardGroup).map(([name, data]) => ({ name, ...data })),
      outward: Object.entries(outwardGroup).map(([name, data]) => ({ name, ...data }))
    };
  }, [stockFlowTimeline]);

  // आवक और जावक रिपोर्ट के ग्रैंड टोटल्स का कैलकुलेशन
  const reportGrandTotals = useMemo(() => {
    const inwardTotal = consolidatedReport.inward.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const outwardTotal = consolidatedReport.outward.reduce((sum, item) => sum + (item.qty * item.price), 0);
    return { inwardTotal, outwardTotal };
  }, [consolidatedReport]);

  // चयनित अवधि का नाम प्राप्त करने का फ़ंक्शन
  const getPeriodLabel = () => {
    if (dashboardDateRange === 'today') return "आज (Today)";
    if (dashboardDateRange === 'yesterday') return "कल (Yesterday)";
    if (dashboardDateRange === 'week') return "इस हफ़्ते (This Week)";
    if (dashboardDateRange === 'month') return "इस महीने (This Month)";
    if (dashboardDateRange === 'year') return "इस साल (This Year)";
    return `कस्टम अवधि (${startDate} से ${endDate})`;
  };

  // --- आवक-जावक रिपोर्ट प्रिंट करने का सुंदर फ़ंक्शन ---
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=750,height=800');
    if (!printWindow) {
      alert("पॉपअप अवरुद्ध हो गया है! कृपया पॉपअप की अनुमति दें।");
      return;
    }

    const period = getPeriodLabel();

    const inwardRows = consolidatedReport.inward.map(item => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold; font-size:12px;">${item.name}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">${item.qty} ${item.unit}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">₹${item.price.toLocaleString()}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; font-weight:bold; color:#22C55E; font-size:12px;">₹${(item.qty * item.price).toLocaleString()}</td>
      </tr>
    `).join('');

    const outwardRows = consolidatedReport.outward.map(item => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold; font-size:12px;">${item.name}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">${item.qty} ${item.unit}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">₹${item.price.toLocaleString()}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; font-weight:bold; color:#EA580C; font-size:12px;">₹${(item.qty * item.price).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Consolidated_IN_OUT_Report</title>
          <style>
            @media print {
              body { margin: 0; padding: 15px; }
              .no-break { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body style="font-family:sans-serif; padding:20px; color:#333;">
          <h2 style="color:#FF6B00; text-align:center; text-transform: uppercase; margin-bottom: 5px;">BUM BUM CAFE</h2>
          <h3 style="text-align:center; text-transform: uppercase; margin-top: 0; color:#555; border-bottom:2px solid #FF6B00; padding-bottom: 8px;">विस्तृत आवक-जावक रिपोर्ट</h3>
          <p style="text-align:center; color:#666; font-size:11px; margin-top:-5px;">Generated on: ${new Date().toLocaleString('en-IN')} | Period: <strong>${period}</strong></p>
          
          <div style="display: flex; gap: 20px; margin-top: 20px;">
            
            <!-- IN Table -->
            <div style="flex: 1;" class="no-break">
              <h4 style="color:#22C55E; border-bottom: 2px solid #22C55E; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">📥 कुल आवक विवरण (IN Detail)</h4>
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="background:#22C55E; color:white;">
                    <th style="padding:8px; text-align:left; font-size:11px;">सामग्री</th>
                    <th style="padding:8px; text-align:center; font-size:11px;">मात्रा</th>
                    <th style="padding:8px; text-align:center; font-size:11px;">दर</th>
                    <th style="padding:8px; text-align:right; font-size:11px;">कुल मूल्य</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.length > 0 ? rows : '<tr><td colspan="4" style="text-align:center; padding:15px; font-size:11px; color:#666;">कोई आवक नहीं</td></tr>'}
                </tbody>
              </table>
              <div style="margin-top:10px; text-align:right; font-size:12px; font-weight:bold; border-top:1px solid #22C55E; padding-top:5px;">
                आवक ग्रैंड टोटल: <span style="color:#22C55E; font-size:13px;">₹${reportGrandTotals.inwardTotal.toLocaleString()}</span>
              </div>
            </div>

            <!-- OUT Table -->
            <div style="flex: 1;" class="no-break">
              <h4 style="color:#EA580C; border-bottom: 2px solid #EA580C; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">🍳 कुल जावक विवरण (OUT Detail)</h4>
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="background:#EA580C; color:white;">
                    <th style="padding:8px; text-align:left; font-size:11px;">सामग्री</th>
                    <th style="padding:8px; text-align:center; font-size:11px;">मात्रा</th>
                    <th style="padding:8px; text-align:center; font-size:11px;">दर</th>
                    <th style="padding:8px; text-align:right; font-size:11px;">कुल मूल्य</th>
                  </tr>
                </thead>
                <tbody>
                  ${outwardRows.length > 0 ? outwardRows : '<tr><td colspan="4" style="text-align:center; padding:15px; font-size:11px; color:#666;">कोई जावक नहीं</td></tr>'}
                </tbody>
              </table>
              <div style="margin-top:10px; text-align:right; font-size:12px; font-weight:bold; border-top:1px solid #EA580C; padding-top:5px;">
                जावक ग्रैंड टोटल: <span style="color:#EA580C; font-size:13px;">₹${reportGrandTotals.outwardTotal.toLocaleString()}</span>
              </div>
            </div>

          </div>

          <div style="margin-top:35px; text-align:center; font-size:11px; color:#777; border-top: 1px dashed #ddd; padding-top: 15px;">
            *** BUM BUM CAFE Stock Management System ***
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 transition-all ${
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

          {/* --- 📝 विस्तृत आवक-जावक रिपोर्ट सेक्शन (UPDATED WITH QTY, PRICE, TOTAL, PRINT) --- */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${isDarkMode ? 'bg-[#121212] border-neutral-800' : 'bg-white border-neutral-150'}`}>
            <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2">
              <div className="space-y-0.5">
                <h3 className="text-xs font-black uppercase text-orange-500">📝 विस्तृत रिपोर्ट (Detailed Report)</h3>
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold uppercase">{getPeriodLabel()}</span>
              </div>
              
              {/* रिपोर्ट प्रिंट करने का नया बटन */}
              {(consolidatedReport.inward.length > 0 || consolidatedReport.outward.length > 0) && (
                <button 
                  onClick={handlePrintReport}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[8px] font-black uppercase flex items-center gap-1 shadow transition-all active:scale-95 shrink-0"
                >
                  <Printer size={10} /> प्रिंट रिपोर्ट
                </button>
              )}
            </div>

            {consolidatedReport.inward.length === 0 && consolidatedReport.outward.length === 0 ? (
              <p className="text-[10px] text-center text-neutral-400 py-4 font-bold uppercase">इस अवधि में कोई आवक-जावक रिकॉर्ड दर्ज नहीं है।</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs">
                
                {/* कुल आवक सूची (IN) */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-green-500 uppercase border-b border-dashed border-green-500/30 pb-1 flex justify-between">
                    <span>📥 कुल आवक (IN):</span>
                    <span className="font-black text-green-600">₹{reportGrandTotals.inwardTotal.toLocaleString()}</span>
                  </p>
                  {consolidatedReport.inward.length === 0 ? (
                    <p className="text-[9px] text-neutral-400 italic">कोई आवक नहीं</p>
                  ) : (
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                      {consolidatedReport.inward.map((item, idx) => {
                        const total = item.qty * item.price;
                        return (
                          <div key={idx} className="p-2 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border dark:border-neutral-800/60 font-bold text-[10px] space-y-0.5">
                            <p className="text-neutral-800 dark:text-neutral-200 truncate">{item.name}</p>
                            <div className="flex justify-between text-[8px] text-neutral-400 font-bold">
                              <span>{item.qty} {item.unit} × ₹{item.price}</span>
                              <span className="text-green-500 font-black">₹{total.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* कुल जावक सूची (OUT) */}
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-orange-500 uppercase border-b border-dashed border-orange-500/30 pb-1 flex justify-between">
                    <span>🍳 कुल जावक (OUT):</span>
                    <span className="font-black text-orange-600">₹{reportGrandTotals.outwardTotal.toLocaleString()}</span>
                  </p>
                  {consolidatedReport.outward.length === 0 ? (
                    <p className="text-[9px] text-neutral-400 italic">कोई जावक नहीं</p>
                  ) : (
                    <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                      {consolidatedReport.outward.map((item, idx) => {
                        const total = item.qty * item.price;
                        return (
                          <div key={idx} className="p-2 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl border dark:border-neutral-800/60 font-bold text-[10px] space-y-0.5">
                            <p className="text-neutral-800 dark:text-neutral-200 truncate">{item.name}</p>
                            <div className="flex justify-between text-[8px] text-neutral-400 font-bold">
                              <span>{item.qty} {item.unit} × ₹{item.price}</span>
                              <span className="text-orange-500 font-black">₹{total.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
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

          {/* एसेट्स का मूल्य विवरण (Diagnostic list) */}
          <div className="space-y-2 mt-4 border-t dark:border-neutral-800 pt-4">
            <h4 className="text-[10px] font-black uppercase text-neutral-400">आइटमवार मूल्य विवरण (Item-wise Value Breakdown):</h4>
            <div className="space-y-1.5 max-h-[35vh] overflow-y-auto pr-1">
              {(fixedAssets || []).map((asset: any) => {
                // सुरक्षित मात्रा गेट (Javascript का 0 || 1 वाला लॉजिकल एरर ठीक हुआ)
                const qty = (asset.quantity === undefined || asset.quantity === null) ? 1 : Number(asset.quantity);
                const cost = Number(asset.cost || 0);
                const itemVal = qty * cost;
                const typeLabel = asset.type === 'crockery' ? '🍽️' : asset.type === 'cutlery' ? '🍴' : '🏢';
                
                return (
                  <div key={asset.id} className="flex justify-between text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                    <span>{typeLabel} {asset.name} ({qty} x ₹{cost})</span>
                    <span className="text-neutral-800 dark:text-neutral-200">₹{itemVal.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
