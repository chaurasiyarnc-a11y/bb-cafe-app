'use client';

import React, { useState, useMemo, useEffect } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  storeQty: number;
  kitchenQty: number; 
  unit: string;
  purchasePrice: number;
  minLimit: number;
  category?: string;
}

interface CategoryItem {
  id: string;
  name: string;
  hidden: boolean;
}

interface KitchenClosingRecord {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  systemQty: number;
  physicalQty: number;
  consumedQty: number;
  timestamp: string;
  staffName: string;
}

interface StockKitchenProps {
  isDarkMode: boolean;
  inventory: InventoryItem[];
  categories: CategoryItem[];
  currentUser: any;
  stockOutHistory: any[];
  kitchenClosingsHistory: KitchenClosingRecord[];
  kitchenClosingInputs: Record<string, string>;
  setKitchenClosingInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSaveAllKitchenClosings: () => Promise<void>;
  handleSaveSingleKitchenClosing: (itemId: string, physicalInput: string) => Promise<void>;
  toastMessage: (message: string, type?: 'success' | 'error' | 'info') => void;
  triggerHaptic: (ms?: number) => void;
}

export default function StockKitchen({
  isDarkMode,
  inventory,
  categories,
  currentUser,
  stockOutHistory,
  kitchenClosingsHistory,
  kitchenClosingInputs,
  setKitchenClosingInputs,
  handleSaveAllKitchenClosings,
  handleSaveSingleKitchenClosing,
  toastMessage,
  triggerHaptic
}: StockKitchenProps) {
  const [activeKitchenSubTab, setActiveKitchenSubTab] = useState<'closing' | 'today_use' | 'history'>('closing');
  const [kitchenSearchQuery, setKitchenSearchQuery] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // पेज लोड होने पर यदि कोई पुराना ड्राफ्ट बचा हो तो उसे पुनर्प्राप्त (Restore) करना
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem('kitchen_closing_draft');
      if (draft) {
        try {
          setKitchenClosingInputs(JSON.parse(draft));
        } catch {
          localStorage.removeItem('kitchen_closing_draft');
        }
      }
    }
  }, [setKitchenClosingInputs]);

  // इनपुट अपडेट करने और ड्राफ्ट को सहेजने के लिए हेल्पर
  const updateClosingInput = (itemId: string, value: string) => {
    const updated = { ...kitchenClosingInputs, [itemId]: value };
    setKitchenClosingInputs(updated);
    localStorage.setItem('kitchen_closing_draft', JSON.stringify(updated));
  };

  // 🪄 त्वरित क्रिया: अपेक्षित सिस्टम स्टॉक को कॉपी करना
  const handleCopyExpectedStock = () => {
    triggerHaptic(40);
    const newInputs: Record<string, string> = {};
    filteredKitchenInventory.forEach(item => {
      newInputs[item.id] = String(item.kitchenQty || 0);
    });
    setKitchenClosingInputs(newInputs);
    localStorage.setItem('kitchen_closing_draft', JSON.stringify(newInputs));
    toastMessage("सिस्टम स्टॉक कॉपी किया गया! कृपया ड्राफ्ट की जांच करें।", "info");
  };

  // ➕/➖ त्वरित स्टॉक एडजस्टर बटन
  const handleAdjustInputValue = (itemId: string, expectedVal: number, diff: number) => {
    triggerHaptic(20);
    const currentStr = kitchenClosingInputs[itemId] || "";
    let currentNum = parseFloat(currentStr);
    if (isNaN(currentNum)) {
      currentNum = expectedVal; // यदि इनपुट खाली है तो सिस्टम स्टॉक से शुरू करें
    }
    const nextVal = Math.max(0, currentNum + diff);
    updateClosingInput(itemId, String(nextVal));
  };

  // 📁 फोल्डर को समेटने (Collapse/Expand) का फंक्शन
  const toggleCategoryFolder = (catName: string) => {
    triggerHaptic(15);
    setExpandedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const isCategoryFolderExpanded = (catName: string) => {
    return expandedCategories[catName] !== false; // डिफ़ॉल्ट रूप से खुला (Expanded) रहेगा
  };

  // 🖨️ PDF प्रिंटर फंक्शन (Hidden Iframe तकनीक)
  const handlePrintKitchenChecklist = () => {
    triggerHaptic(50);
    let iframe = document.getElementById('kitchen-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'kitchen-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const activeItems = inventory.filter(item => {
      const itemCatObj = categories.find(c => c.name === item.category);
      return !(itemCatObj?.hidden);
    });

    const rows = activeItems.map((item, idx) => `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; text-align: center; font-size: 12px; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase;">${item.name}</td>
        <td style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #555;">${item.category || 'OTHER'}</td>
        <td style="padding: 10px; text-align: center; font-size: 12px; font-weight: bold;">${item.kitchenQty || 0} ${item.unit}</td>
        <td style="padding: 10px; text-align: center; font-size: 12px; font-weight: bold; width: 180px;">[ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Bum_Bum_Cafe_Kitchen_Closing_Checklist</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; background-color: #fff; }
            .header { text-align: center; margin-bottom: 25px; border-bottom: 3px double #333; padding-bottom: 12px; }
            .title { font-size: 24px; font-weight: bold; color: #ff6b00; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
            .subtitle { font-size: 11px; color: #666; margin-top: 5px; margin-bottom: 0; font-weight: bold; text-transform: uppercase; }
            .meta-info { width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse; }
            .meta-info td { padding: 4px 0; }
            table.items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.items-table th, table.items-table td { border: 1px solid #ccc; padding: 10px 8px; font-size: 12px; text-align: left; }
            table.items-table th { background-color: #f7f7f7; font-weight: bold; text-transform: uppercase; color: #444; }
            .center { text-align: center !important; }
            .footer { margin-top: 40px; font-size: 11px; color: #777; text-align: center; border-top: 1px dashed #ddd; padding-top: 15px; }
            .signature-area { margin-top: 60px; display: flex; justify-content: space-between; }
            .sig-box { width: 220px; text-align: center; border-top: 1px solid #333; padding-top: 5px; font-size: 12px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">BUM BUM CAFE</h1>
            <p class="subtitle">Kitchen Night Closing Checklist / किचन क्लोजिंग शीट</p>
          </div>
          <table class="meta-info">
            <tr>
              <td style="width: 50%;"><strong>DATE:</strong> ____________________________</td>
              <td style="width: 50%; text-align: right;"><strong>TIME:</strong> _________________</td>
            </tr>
            <tr>
              <td style="width: 50%;"><strong>STAFF NAME:</strong> ________________________</td>
              <td style="width: 50%; text-align: right;"><strong>VERIFIED BY:</strong> ___________</td>
            </tr>
          </table>
          <table class="items-table">
            <thead>
              <tr>
                <th class="center" style="width: 50px;">S.No</th>
                <th>ITEM NAME / सामग्री का नाम</th>
                <th style="width: 120px;">CATEGORY</th>
                <th class="center" style="width: 120px;">SYSTEM QTY</th>
                <th class="center" style="width: 180px;">PHYSICAL STOCK (वास्तविक)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <div class="signature-area">
            <div class="sig-box">Staff Signature</div>
            <div class="sig-box">Manager / Admin Signature</div>
          </div>
          <div class="footer">किचन में घूमकर पेन से सही स्टॉक लिखें, फिर इसे इन्वेंटरी पोर्टल पर दर्ज करें।</div>
        </body>
      </html>
    `;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 500);
    }
  };

  // आज की कुल किचन खपत की गणना
  const todayKitchenConsumption = useMemo(() => {
    const todayStr = getLocalDateString(0);
    const dailyMap: Record<string, { qty: number; unit: string }> = {};
    
    stockOutHistory.forEach(log => {
      if (log.date === todayStr && log.purpose === "Kitchen Use") {
        const item = inventory.find(i => i.id === log.itemId);
        const unit = item?.unit || "Units";
        const current = dailyMap[log.itemName] || { qty: 0, unit };
        dailyMap[log.itemName] = {
          qty: current.qty + log.qty,
          unit
        };
      }
    });

    return Object.entries(dailyMap).map(([name, val]) => ({
      name,
      qty: val.qty,
      unit: val.unit
    }));
  }, [stockOutHistory, inventory]);

  // क्लोजिंग स्नैपशॉट को तारीख वार व्यवस्थित करना
  const groupedKitchenClosings = useMemo(() => {
    const map: Record<string, KitchenClosingRecord[]> = {};
    kitchenClosingsHistory.forEach(log => {
      if (!map[log.date]) map[log.date] = [];
      map[log.date].push(log);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [kitchenClosingsHistory]);

  const filteredKitchenInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(kitchenSearchQuery.toLowerCase());
      return matchesSearch && (item.kitchenQty > 0 || item.storeQty > 0);
    });
  }, [inventory, kitchenSearchQuery]);

  // सामग्री को कैटेगरी फोल्डर के हिसाब से ग्रुप करना
  const groupedClosingInventory = useMemo(() => {
    const map: Record<string, InventoryItem[]> = {};
    filteredKitchenInventory.forEach(item => {
      const cat = item.category || "OTHER";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredKitchenInventory]);

  return (
    <div className="space-y-4">
      {/* 📍 KITCHEN INNER SEGMENTED SUB-TABS */}
      <div className={`p-1 rounded-2xl flex border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'} text-xs font-black uppercase`}>
        <button 
          onClick={() => { triggerHaptic(15); setActiveKitchenSubTab('closing'); }} 
          className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${activeKitchenSubTab === 'closing' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400'}`}
        >
          🌙 क्लोजिंग
        </button>
        <button 
          onClick={() => { triggerHaptic(15); setActiveKitchenSubTab('today_use'); }} 
          className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${activeKitchenSubTab === 'today_use' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400'}`}
        >
          🔥 आज का उपयोग
        </button>
        <button 
          onClick={() => { triggerHaptic(15); setActiveKitchenSubTab('history'); }} 
          className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${activeKitchenSubTab === 'history' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400'}`}
        >
          📅 7-दिन इतिहास
        </button>
      </div>

      {/* SUB-TAB 1: 🌙 क्लोजिंग (NIGHT CLOSING) */}
      {activeKitchenSubTab === 'closing' && (
        <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm space-y-3`}>
          <div className="flex flex-col space-y-2 pb-1 border-b dark:border-neutral-800">
            <div className="flex justify-between items-center gap-2">
              <div className="min-w-0">
                <h2 className="text-xs font-black text-green-500 uppercase tracking-wider">🌙 रात्रि क्लोजिंग स्टॉक</h2>
                <p className="text-[9px] text-neutral-400 font-bold">चेकलिस्ट प्रिंट करें फिर एंट्री करें</p>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* 🖨️ PDF प्रिंटर */}
                <button 
                  onClick={handlePrintKitchenChecklist}
                  className="px-2 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-[9px] font-black uppercase shadow-md transition-all"
                  title="PDF चेकलिस्ट प्रिंट करें"
                >
                  🖨️ प्रिंट
                </button>
                {/* 🪄 अपेक्षित स्टॉक कॉपी बटन */}
                <button 
                  onClick={handleCopyExpectedStock}
                  className="px-2 py-1.5 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase shadow-md transition-all"
                  title="सिस्टम स्टॉक को इनपुट में कॉपी करें"
                >
                  🪄 कॉपी
                </button>
                {Object.keys(kitchenClosingInputs).length > 0 && (
                  <button 
                    onClick={handleSaveAllKitchenClosings}
                    className="px-2 py-1.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md transition-all"
                  >
                    💾 सहेजें
                  </button>
                )}
              </div>
            </div>
          </div>

          <input 
            type="text" 
            placeholder="सामग्री खोजें... (जैसे: MILK)" 
            value={kitchenSearchQuery}
            onChange={e => setKitchenSearchQuery(e.target.value)}
            className="w-full p-2.5 rounded-xl text-xs font-bold border dark:bg-neutral-950 dark:border-neutral-800 focus:outline-none"
          />

          {/* 📂 फोल्डर आधारित क्लोजिंग लिस्ट */}
          <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
            {groupedClosingInventory.length === 0 ? (
              <p className="text-xs text-center py-4 text-neutral-400 font-bold">कोई सामग्री नहीं मिली।</p>
            ) : (
              groupedClosingInventory.map(([catName, items]) => {
                const isExpanded = isCategoryFolderExpanded(catName);
                return (
                  <div key={catName} className="space-y-1.5">
                    {/* फोल्डर हेडर बटन */}
                    <button
                      type="button"
                      onClick={() => toggleCategoryFolder(catName)}
                      className={`w-full flex justify-between items-center py-2 px-3 rounded-xl font-black text-[10px] uppercase transition-all ${isDarkMode ? 'bg-neutral-900 hover:bg-neutral-850' : 'bg-neutral-100 hover:bg-neutral-150'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        📁 {catName} 
                        <span className="text-[9px] text-neutral-400">({items.length} आइटम)</span>
                      </span>
                      <span className="text-[9px]">{isExpanded ? '▼' : '►'}</span>
                    </button>

                    {/* फोल्डर की सामग्रियां */}
                    {isExpanded && (
                      <div className="space-y-1.5 pl-1.5">
                        {items.map(item => {
                          const expected = item.kitchenQty || 0;
                          const typedVal = kitchenClosingInputs[item.id] || "";
                          const typedNum = parseFloat(typedVal);
                          const consumed = !isNaN(typedNum) ? (expected - typedNum) : 0;

                          return (
                            <div key={item.id} className={`p-2.5 rounded-2xl border ${isDarkMode ? 'bg-neutral-950 border-neutral-850' : 'bg-white border-neutral-100'} flex items-center justify-between gap-1`}>
                              <div className="flex-1 min-w-0 pr-1">
                                <p className="text-xs font-black truncate uppercase">{item.name}</p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[9px] text-neutral-400 font-bold">
                                  <span>सिस्टम: <strong className={isDarkMode ? 'text-white' : 'text-black'}>{expected} {item.unit}</strong></span>
                                  {consumed > 0 && (
                                    <span className="text-orange-500 animate-pulse">🔥 उपयोग: {consumed.toFixed(1)}</span>
                                  )}
                                </div>
                              </div>

                              {/* ➖ इनपुट ➕ त्वरित बटन्स */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustInputValue(item.id, expected, -1)}
                                  className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black transition-colors ${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200'}`}
                                >
                                  -
                                </button>
                                <input 
                                  type="number" 
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={typedVal}
                                  onChange={e => updateClosingInput(item.id, e.target.value)}
                                  className="w-12 p-1 rounded-lg text-center text-xs font-black border dark:bg-neutral-900 h-6 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdjustInputValue(item.id, expected, 1)}
                                  className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black transition-colors ${isDarkMode ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-neutral-100 hover:bg-neutral-200'}`}
                                >
                                  +
                                </button>
                                {typedVal.trim() !== "" && (
                                  <button 
                                    onClick={() => handleSaveSingleKitchenClosing(item.id, typedVal)}
                                    className="p-1.5 bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400 rounded-lg font-bold text-xs"
                                  >
                                    ✓
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: 🔥 आज का उपयोग (TODAY USE) */}
      {activeKitchenSubTab === 'today_use' && (
        <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
          <h2 className="text-xs font-black text-orange-500 uppercase tracking-wider mb-2">🔥 आज की कुल किचन खपत (Today's Usage)</h2>
          {todayKitchenConsumption.length === 0 ? (
            <p className="text-xs text-neutral-400 font-medium py-4 text-center">आज अभी तक कोई खपत दर्ज नहीं की गई है। रात्रि क्लोजिंग करें!</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {todayKitchenConsumption.map((c, idx) => (
                <div key={idx} className={`p-2.5 rounded-xl border text-xs font-bold flex justify-between ${isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-150'}`}>
                  <span className="text-neutral-400 truncate max-w-[100px]">{c.name}</span>
                  <span className="text-orange-500">{c.qty} {c.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: 📅 7-दिन इतिहास (PAST 7 DAYS HISTORY) */}
      {activeKitchenSubTab === 'history' && (
        <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
          <h2 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2.5">📅 डेली क्लोजिंग और उपयोग इतिहास (Closing Logs)</h2>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {groupedKitchenClosings.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center">कोई डेली क्लोजिंग इतिहास रिकॉर्ड नहीं मिला।</p>
            ) : (
              groupedKitchenClosings.map(([date, logs], idx) => (
                <div key={idx} className={`p-3.5 rounded-2xl border ${isDarkMode ? 'bg-neutral-950 border-neutral-850' : 'bg-white border-neutral-100'} space-y-2`}>
                  <div className="flex justify-between items-center border-b dark:border-neutral-850 pb-1.5">
                    <p className="text-[10px] font-black uppercase text-orange-500">
                      {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <span className="text-[8px] font-bold text-neutral-400 uppercase font-sans">स्टाफ: {logs[0]?.staffName || 'System'}</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {logs.map((log) => {
                      const matchedItem = inventory.find(i => i.id === log.itemId);
                      const unit = matchedItem?.unit || 'Units';
                      return (
                        <div key={log.id} className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-neutral-400 truncate max-w-[120px] uppercase">{log.itemName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-neutral-500">सिस्टम: {log.systemQty}</span>
                            <span className="text-[9px] text-green-500 font-extrabold">बचा: {log.physicalQty} {unit}</span>
                            {log.consumedQty > 0 && (
                              <span className="text-orange-500 text-[9px]">खपत: -{log.consumedQty}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
