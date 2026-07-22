'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Edit, MinusCircle, PlusCircle, Printer } from 'lucide-react';

export default function StockGodown({
  isDarkMode, searchQuery, setSearchQuery, isMultiSelectMode, setIsMultiSelectMode, selectedItemIds, setSelectedItemIds,
  selectedCategoryFilter, setSelectedCategoryFilter, visibleCategories, filteredInventory, editedQties, setEditedQties,
  adjustQty, saveQty, handleToggleMultiSelect, setShowManageCategoriesModal, setShowAddProductModal, setEditingProduct,
  setTransferItem, setShowTransferModal, setConsumeItem, setShowConsumeModal
}: any) {
  
  // लॉन्ग-प्रेस (Long-press) को ट्रैक करने के लिए रेफ़रेंसेज़
  const longPressTimeout = useRef<any>(null);
  const isLongPressActive = useRef<boolean>(false);

  // फोन वाइब्रेशन (हैप्टिक फीडबैक) के लिए फ़ंक्शन
  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

  // लॉन्ग-प्रेस शुरू होने पर टाइमर चालू करना (600ms तक दबाए रखने पर)
  const handlePressStart = (itemId: string) => {
    isLongPressActive.current = false;
    longPressTimeout.current = setTimeout(() => {
      isLongPressActive.current = true;
      setIsMultiSelectMode(true);
      handleToggleMultiSelect(itemId);
      triggerHaptic(50); // लॉन्ग-प्रेस सफल होने पर वाइब्रेशन फ़ीडबैक
    }, 600);
  };

  // उंगली उठाने पर टाइमर बंद करना
  const handlePressEnd = (itemId: string) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
    // यदि यह केवल एक त्वरित टच (Normal Click) था
    if (!isLongPressActive.current) {
      if (isMultiSelectMode) {
        handleToggleMultiSelect(itemId);
      }
    }
  };

  // स्क्रॉल या उंगली फिसलने पर लॉन्ग-प्रेस निरस्त करना
  const handlePressMove = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  // --- प्रिंटिंग हैंडलर फ़ंक्शन (मात्रा, कीमत, कुल मूल्य और ग्रैंड टोटल के साथ) ---
  const handlePrintGodown = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert("पॉपअप अवरुद्ध हो गया है! कृपया पॉपअप की अनुमति दें।");
      return;
    }

    const filterName = selectedCategoryFilter === "All" ? "गोदाम स्टॉक सूची (All Items)" : `कैटेगरी: ${selectedCategoryFilter}`;

    // कुल ग्रैंड टोटल कैलकुलेशन
    const grandTotal = filteredInventory.reduce((sum: number, item: any) => {
      const qty = Number(item.storeQty || 0);
      const price = Number(item.purchasePrice || 0);
      return sum + (qty * price);
    }, 0);

    const rows = filteredInventory.map((item: any) => {
      const qty = Number(item.storeQty || 0);
      const price = Number(item.purchasePrice || 0);
      const total = qty * price;
      return `
        <tr>
          <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold; font-size:12px;">${item.name}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">${qty} ${item.unit || 'Kg'}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center; font-size:12px;">₹${price.toLocaleString()}</td>
          <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; font-weight:bold; color:#FF6B00; font-size:12px;">₹${total.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Godown_Stock_Sheet</title>
          <style>
            @media print {
              body { margin: 0; padding: 15px; }
            }
          </style>
        </head>
        <body style="font-family:sans-serif; padding:20px; color:#333;">
          <h2 style="color:#FF6B00; text-align:center; text-transform: uppercase; margin-bottom: 5px;">BUM BUM CAFE</h2>
          <h3 style="text-align:center; text-transform: uppercase; margin-top: 0; color:#555; border-bottom:2px solid #FF6B00; padding-bottom: 8px;">${filterName}</h3>
          <p style="text-align:center; color:#666; font-size:11px; margin-top:-5px;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
          
          <table style="width:100%; border-collapse:collapse; margin-top:15px;">
            <thead>
              <tr style="background:#FF6B00; color:white;">
                <th style="padding:10px; text-align:left; font-size:12px;">Item Name (सामग्री)</th>
                <th style="padding:10px; text-align:center; font-size:12px;">Godown Qty (मात्रा)</th>
                <th style="padding:10px; text-align:center; font-size:12px;">Price (खरीद दर)</th>
                <th style="padding:10px; text-align:right; font-size:12px;">Total (कुल मूल्य)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : '<tr><td colspan="4" style="text-align:center; padding:20px; font-size:12px;">कोई सामान उपलब्ध नहीं है</td></tr>'}
            </tbody>
          </table>
          
          <div style="margin-top:20px; text-align:right; font-size:14px; font-weight:bold; border-top:2px solid #FF6B00; padding-top:10px;">
            ग्रैंड टोटल (Grand Total): <span style="color:#FF6B00; font-size:16px;">₹${grandTotal.toLocaleString()}</span>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      
      {/* क्रोम और सफारी में हॉरिजॉन्टल स्लाइडर का स्क्रॉलबार पूरी तरह छुपाने के लिए स्टाइल */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Search and Filters */}
      <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input 
              type="text" placeholder="आइटम खोजें..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-950'}`}
            />
          </div>
          {/* केवल तब "Cancel/चयन रद्द करें" बटन दिखेगा जब मल्टी-सेलेक्ट मोड ऑन होगा */}
          {isMultiSelectMode && (
            <button 
              onClick={() => { setIsMultiSelectMode(false); setSelectedItemIds([]); }}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all shadow"
            >
              रद्द करें
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[8px] font-black uppercase text-neutral-400 tracking-wider">क्लिक कर फ़िल्टर करें:</span>
            <div className="flex gap-2.5">
              {/* नया प्रिंट बटन */}
              <button onClick={handlePrintGodown} className="text-[8px] text-blue-500 hover:underline uppercase font-black flex items-center gap-0.5">🖨️ प्रिंट लिस्ट</button>
              <button onClick={() => setShowManageCategoriesModal(true)} className="text-[8px] text-orange-500 hover:underline uppercase font-black">🛠️ Manage Categories</button>
            </div>
          </div>
          
          {/* स्मूथ हॉरिजॉन्टल स्लाइडर (हाइड स्क्रॉलबार के साथ) */}
          <div className="flex gap-1.5 overflow-x-auto py-1 w-full no-scrollbar">
            <button
              onClick={() => setSelectedCategoryFilter("All")}
              className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 transition-all ${
                selectedCategoryFilter === "All" ? "bg-orange-500 border-orange-500 text-white" : isDarkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-600"
              }`}
            >
              All Items
            </button>
            {visibleCategories.map((cat: any) => (
              <button
                key={cat.id} onClick={() => setSelectedCategoryFilter(cat.name)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 transition-all ${
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

      {/* Item List (आइटम कार्ड्स) */}
      <div className="space-y-2.5">
        {filteredInventory.map((item: any) => {
          const isSelected = selectedItemIds.includes(item.id);
          const displayQty = editedQties[item.id] !== undefined ? editedQties[item.id] : item.storeQty;
          const isDirty = editedQties[item.id] !== undefined && parseFloat(editedQties[item.id] as string) !== item.storeQty;
          const isLowStock = item.storeQty < item.minLimit;

          return (
            <div 
              key={item.id}
              onTouchStart={() => handlePressStart(item.id)}
              onTouchEnd={() => handlePressEnd(item.id)}
              onTouchMove={handlePressMove}
              onMouseDown={() => handlePressStart(item.id)}
              onMouseUp={() => handlePressEnd(item.id)}
              onMouseLeave={handlePressMove}
              className={`p-3.5 rounded-2xl border transition-all relative ${isMultiSelectMode ? 'cursor-pointer' : ''} ${
                isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'
              } ${isSelected ? 'ring-2 ring-orange-500 bg-orange-500/[0.01]' : ''} ${isLowStock ? 'border-red-500 bg-red-500/[0.02]' : ''}`}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }} // लॉन्ग प्रेस के समय मोबाइल पर टेक्स्ट सेलेक्ट होने से रोकने के लिए
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
