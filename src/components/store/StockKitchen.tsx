'use client';

import React, { useState, useMemo } from 'react';

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

  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 🖨️ PDF प्रिंटर फंक्शन (Hidden Iframe विधि जो पॉप-अप ब्लॉक नहीं होने देती)
  const handlePrintKitchenChecklist = () => {
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
      }, 400);
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

  // तारीख के हिसाब से ग्रुपिंग
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
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-black text-green-500 uppercase tracking-wider">🌙 रात्रि क्लोजिंग स्टॉक</h2>
              <p className="text-[9px] text-neutral-400 font-bold truncate">चेकलिस्ट प्रिंट करें फिर एंट्री करें</p>
            </div>
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button 
                onClick={handlePrintKitchenChecklist}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-[9px] font-black uppercase shadow-md flex items-center gap-1 transition-all"
              >
                🖨️ प्रिंट चेकलिस्ट (PDF)
              </button>
              {Object.keys(kitchenClosingInputs).length > 0 && (
                <button 
                  onClick={handleSaveAllKitchenClosings}
                  className="px-2.5 py-1.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md transition-all"
                >
                  💾 सहेजें
                </button>
              )}
            </div>
          </div>

          <input 
            type="text" 
            placeholder="सामग्री खोजें... (जैसे: MILK)" 
            value={kitchenSearchQuery}
            onChange={e => setKitchenSearchQuery(e.target.value)}
            className="w-full p-2.5 rounded-xl text-xs font-bold border dark:bg-neutral-950 dark:border-neutral-800 focus:outline-none"
          />

          <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
            {filteredKitchenInventory.length === 0 ? (
              <p className="text-xs text-center py-4 text-neutral-400 font-bold">कोई सामग्री नहीं मिली।</p>
            ) : (
              filteredKitchenInventory.map(item => {
                const expected = item.kitchenQty || 0;
                const typedVal = kitchenClosingInputs[item.id] || "";
                const typedNum = parseFloat(typedVal);
                const consumed = !isNaN(typedNum) ? (expected - typedNum) : 0;

                return (
                  <div key={item.id} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-neutral-950 border-neutral-850' : 'bg-white border-neutral-100'} flex items-center justify-between gap-2`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate uppercase">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400 font-bold">
                        <span>सिस्टम स्टॉक: <strong className={isDarkMode ? 'text-white' : 'text-black'}>{expected} {item.unit}</strong></span>
                        {consumed > 0 && (
                          <span className="text-orange-500 animate-pulse">🔥 उपयोग: {consumed.toFixed(1)} {item.unit}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number" 
                        placeholder="क्लोजिंग"
                        value={typedVal}
                        onChange={e => setKitchenClosingInputs({ ...kitchenClosingInputs, [item.id]: e.target.value })}
                        className="w-16 p-1.5 rounded-xl text-center text-xs font-black border dark:bg-neutral-900"
                      />
                      {typedVal.trim() !== "" && (
                        <button 
                          onClick={() => handleSaveSingleKitchenClosing(item.id, typedVal)}
                          className="p-1.5 bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400 rounded-xl font-bold text-xs"
                        >
                          ✓
                        </button>
                      )}
                    </div>
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
