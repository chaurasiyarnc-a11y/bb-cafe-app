'use client';

import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, RefreshCw, Edit, Printer } from 'lucide-react';

export default function StockAssets({
  isDarkMode, searchQuery, setSearchQuery, filteredAssets, setShowAddAssetModal, handleDeleteAsset, handleMigrate, setEditingAsset, handleAdjustQty
}: any) {
  // लोकल स्टेट: एसेट्स को 3 श्रेणियों में फ़िल्टर करने के लिए ('general', 'cutlery', या 'crockery')
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'cutlery' | 'crockery'>('general');

  // एक्टिव सब-टैब के आधार पर एसेट्स फ़िल्टर करने का लॉजिक
  const displayedAssets = useMemo(() => {
    return filteredAssets.filter((asset: any) => {
      const assetType = asset.type || 'general'; // डिफ़ॉल्ट रूप से 'general' (सामान्य एसेट)
      return assetType === activeSubTab;
    });
  }, [filteredAssets, activeSubTab]);

  // वर्तमान सब-टैब का ग्रैंड टोटल निकालने का लॉजिक
  const currentTabGrandTotal = useMemo(() => {
    return displayedAssets.reduce((sum: number, asset: any) => {
      const qty = (asset.quantity === undefined || asset.quantity === null) ? 1 : Number(asset.quantity);
      const cost = Number(asset.cost || 0);
      return sum + (qty * cost);
    }, 0);
  }, [displayedAssets]);

  // एसेट की स्थिति (Condition) का हिंदी अनुवाद और स्टाइलिंग
  const getConditionDetails = (cond: string) => {
    if (cond === 'Working') {
      return { 
        label: 'सक्रिय (Working)', 
        style: 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400' 
      };
    }
    if (cond === 'Needs Repair') {
      return { 
        label: 'मरम्मत योग्य (Needs Repair)', 
        style: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' 
      };
    }
    return { 
      label: 'टूटा हुआ (Broken)', 
      style: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' 
    };
  };

  // --- प्रिंटिंग हैंडलर फ़ंक्शन (Qty, Price, Total, और Grand Total के साथ) ---
  const handlePrintAssets = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert("पॉपअप अवरुद्ध हो गया है! कृपया पॉपअप की अनुमति दें।");
      return;
    }

    const tabName = activeSubTab === 'general' ? '🏢 सामान्य एसेट्स (General Assets)' : activeSubTab === 'cutlery' ? '🍴 कटलरी (Cutlery)' : '🍽️ क्रॉकरी (Crockery)';

    const rows = displayedAssets.map((asset: any) => {
      const qty = (asset.quantity === undefined || asset.quantity === null) ? 1 : Number(asset.quantity);
      const cost = Number(asset.cost || 0);
      const total = qty * cost;
      return `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold; font-size:12px;">${asset.name}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">${qty} ${asset.unit || 'Pcs'}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">₹${cost.toLocaleString()}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; font-weight:bold; color:#FF6B00; font-size:12px;">₹${total.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Order_Sheet_Bum_Bum_Cafe</title>
          <style>
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body style="font-family:sans-serif; padding:20px; color:#333;">
          <h2 style="color:#FF6B00; text-align:center; text-transform: uppercase; margin-bottom: 5px;">BUM BUM CAFE</h2>
          <h3 style="text-align:center; text-transform: uppercase; margin-top: 0; color:#555; border-bottom:2px solid #FF6B00; padding-bottom: 8px;">${tabName}</h3>
          <p style="text-align:center; color:#666; font-size:11px; margin-top:-5px;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
          
          <table style="width:100%; border-collapse:collapse; margin-top:15px;">
            <thead>
              <tr style="background:#FF6B00; color:white;">
                <th style="padding:10px; text-align:left; font-size:12px;">Item Name (नाम)</th>
                <th style="padding:10px; text-align:center; font-size:12px;">Qty (मात्रा)</th>
                <th style="padding:10px; text-align:center; font-size:12px;">Price (दर)</th>
                <th style="padding:10px; text-align:right; font-size:12px;">Total (कुल मूल्य)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : '<tr><td colspan="4" style="text-align:center; padding:20px; font-size:12px;">कोई सामान उपलब्ध नहीं है</td></tr>'}
            </tbody>
          </table>
          
          <div style="margin-top:20px; text-align:right; font-size:14px; font-weight:bold; border-top:2px solid #FF6B00; padding-top:10px;">
            ग्रैंड टोटल (Grand Total): <span style="color:#FF6B00; font-size:16px;">₹${currentTabGrandTotal.toLocaleString()}</span>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      {/* हेडर और एक्शन बटन */}
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex justify-between items-start gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-black text-orange-600 uppercase">स्थायी संपत्ति (Fixed Assets)</h2>
            <p className="text-[10px] text-neutral-400">उपकरण, फ्रिज, ओवन, कटलरी और क्रॉकरी</p>
          </div>
          
          <div className="flex gap-1.5 flex-wrap">
            {/* गोदाम से डेटा ऑटो-शिफ्ट करने का बटन */}
            <button 
              onClick={handleMigrate}
              className="px-2 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow transition-all active:scale-95"
              title="गोदाम से सारा क्रॉकरी व कटलरी डेटा यहाँ शिफ्ट करें"
            >
              <RefreshCw size={11} /> डेटा शिफ्ट करें
            </button>
            {/* प्रिंट करने का नया विकल्प */}
            <button 
              onClick={handlePrintAssets}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow transition-all active:scale-95"
              title="वर्तमान चुनी हुई सूची प्रिंट करें"
            >
              <Printer size={11} /> प्रिंट करें
            </button>
            <button 
              onClick={() => setShowAddAssetModal(true)} 
              className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-1 shadow transition-all active:scale-95"
            >
              <Plus size={11} /> एसेट जोड़ें
            </button>
          </div>
        </div>

        {/* 3 सब-टैब बटन्स (एसेट्स, कटलरी, क्रॉकरी) */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'general'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🏢 एसेट्स
          </button>
          <button
            onClick={() => setActiveSubTab('cutlery')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'cutlery'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🍴 कटलरी
          </button>
          <button
            onClick={() => setActiveSubTab('crockery')}
            className={`flex-1 py-2 text-center rounded-lg text-xs font-black transition-all ${
              activeSubTab === 'crockery'
                ? (isDarkMode ? 'bg-neutral-800 text-white shadow' : 'bg-white text-neutral-950 shadow')
                : 'text-neutral-400'
            }`}
          >
            🍽️ क्रॉकरी
          </button>
        </div>

        {/* वर्तमान चयनित लिस्ट का कुल टोटल (Grand Total) */}
        <div className={`p-3 rounded-xl border text-center text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800/80 text-neutral-400' : 'bg-neutral-50 border-neutral-150 text-neutral-500'}`}>
          इस लिस्ट का ग्रैंड टोटल: <span className="text-orange-500 font-bold ml-1">₹{currentTabGrandTotal.toLocaleString()}</span>
        </div>

        {/* सर्च बार */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
          <input 
            type="text" 
            placeholder="खोजें..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${
              isDarkMode 
                ? 'bg-neutral-900 border-neutral-800 text-white focus:border-neutral-700' 
                : 'bg-white border-neutral-200 text-neutral-950 focus:border-neutral-300'
            } focus:outline-none`}
          />
        </div>
      </div>

      {/* एसेट्स की सूची */}
      <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1">
        {displayedAssets.length === 0 ? (
          <div className="text-center py-12 space-y-1">
            <span className="text-2xl">📦</span>
            <p className="text-xs text-neutral-400 font-bold">इस कैटेगरी में कोई सामान नहीं मिला।</p>
          </div>
        ) : (
          displayedAssets.map((asset: any) => {
            const condDetails = getConditionDetails(asset.condition);
            
            // गणितीय सुधार: Qty, Price, और Total मूल्य का कैलकुलेशन
            const qty = (asset.quantity === undefined || asset.quantity === null) ? 1 : Number(asset.quantity);
            const cost = Number(asset.cost || 0);
            const total = qty * cost;

            return (
              <div key={asset.id} className={`p-4 rounded-2xl border flex flex-col gap-3 justify-between ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <div className="flex justify-between items-start">
                  <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{asset.name}</p>
                  
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${condDetails.style}`}>
                    {condDetails.label}
                  </span>
                </div>

                {/* --- स्क्रीन पर Qty, Price, और Total का सुंदर 3-कॉलम विवरण --- */}
                <div className="grid grid-cols-3 gap-1 bg-neutral-50 dark:bg-neutral-900/40 p-2 rounded-xl text-[9px] font-black uppercase text-neutral-500">
                  <div className="text-center border-r border-neutral-200 dark:border-neutral-800">
                    <p className="text-[7px] text-neutral-400 font-bold">Qty (मात्रा)</p>
                    <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">{qty} {asset.unit || 'Pcs'}</p>
                  </div>
                  <div className="text-center border-r border-neutral-200 dark:border-neutral-800">
                    <p className="text-[7px] text-neutral-400 font-bold">Price (कीमत)</p>
                    <p className="mt-0.5 text-neutral-700 dark:text-neutral-300">₹{cost.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] text-neutral-400 font-bold">Total (कुल मूल्य)</p>
                    <p className="mt-0.5 text-orange-500 font-black">₹{total.toLocaleString()}</p>
                  </div>
                </div>

                {/* कम-ज्यादा (मासिक री-काउंटिंग) और एडिट के लिए नीचे का पैनल */}
                <div className="flex items-center justify-between border-t border-dashed dark:border-neutral-800/80 pt-2.5 mt-1">
                  
                  {/* मात्रा कम / ज्यादा करने का कंट्रोलर */}
                  <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl">
                    <button 
                      onClick={() => handleAdjustQty(asset.id, -1)} 
                      className="w-7 h-7 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-lg text-xs font-black shadow-sm active:scale-90 transition-all text-red-500"
                      title="कम करें (-1)"
                    >
                      -
                    </button>
                    <span className="w-12 text-center text-xs font-black dark:text-neutral-200">
                      {qty} {asset.unit || 'Pcs'}
                    </span>
                    <button 
                      onClick={() => handleAdjustQty(asset.id, 1)} 
                      className="w-7 h-7 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-lg text-xs font-black shadow-sm active:scale-90 transition-all text-green-500"
                      title="बढ़ाएं (+1)"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* संपादित करें (Edit Details) बटन */}
                    <button 
                      onClick={() => setEditingAsset(asset)}
                      className="px-3 py-2 bg-orange-100 dark:bg-orange-950/20 text-orange-500 hover:text-orange-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 transition-colors"
                      title="विवरण संपादित करें"
                    >
                      <Edit size={11} /> एडिट
                    </button>
                    <button 
                      onClick={() => handleDeleteAsset(asset.id, asset.name)} 
                      className="p-2 bg-red-50 dark:bg-red-950/10 text-neutral-400 hover:text-red-500 rounded-xl transition-colors"
                      title="हटाएं"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
