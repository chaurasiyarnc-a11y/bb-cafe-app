'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Printer, Search, Trash2, User, Phone, Tag, Shirt, ScanBarcode } from 'lucide-react';

// 1. INVENTORY (Jab aap Firebase connect karenge, toh iski jagah Database se data aayega)
const INVENTORY = [
  { id: '101', barcode: '123456789012', name: 'Nike Running Shoes', category: 'Sports', size: 'UK 8', price: 1500, stock: 10 },
  { id: '102', barcode: '890123456789', name: 'Adidas Trackpant', category: 'Clothing', size: 'L', color: 'Black', price: 800, stock: 5 },
  { id: '103', barcode: '112233445566', name: 'Cotton T-Shirt', category: 'Clothing', size: 'M', color: 'White', price: 400, stock: 20 },
  { id: '104', barcode: '998877665544', name: 'SG Cricket Bat', category: 'Sports', size: 'Full', price: 2500, stock: 3 },
];

export default function RetailPos() {
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Customer Details State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Discount State
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number | ''>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 2. REAL BARCODE SCANNER LOGIC (Time-based speed detection)
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Agar user search box ya kisi text input mein type kar raha hai, toh scanner background mein intercept na kare
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      // Agar do button dabne ke beech 50ms se zyada ka time hai, toh ye insaan type kar raha hai, scanner nahi.
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          processBarcode(barcodeBuffer.current);
          barcodeBuffer.current = ''; // Reset buffer after scan
        }
      } else if (e.key.length === 1) { // Sirf letters/numbers add kare (Shift, Ctrl wagera ignore kare)
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Database / Inventory mein barcode dhundhne ka function
  const processBarcode = (scannedCode: string) => {
    // Yahan aap apna Firebase logic laga sakte hain: 
    // const doc = await getDoc(collection(db, 'products'), where('barcode', '==', scannedCode));
    
    const product = INVENTORY.find(item => item.barcode === scannedCode);
    if (product) {
      addToCart(product);
      // Optional: Beep sound play karne ka logic
    } else {
      alert(`❌ Item not found for Barcode: ${scannedCode}`);
    }
  };

  const addToCart = (product: any) => {
    if (product.stock <= 0) return alert('Stock Khatam (Out of Stock)!');
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // 3. CALCULATIONS (Subtotal, Discount, Grand Total)
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  let discountAmount = 0;
  const dVal = Number(discountValue) || 0;
  if (discountType === 'flat') {
    discountAmount = Math.min(dVal, subtotal); // Discount subtotal se zyada nahi ho sakta
  } else {
    discountAmount = (subtotal * dVal) / 100;
  }
  
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // 4. THERMAL PRINTER LOGIC (With Discount & Customer Info)
  const handleThermalPrint = () => {
    if (cart.length === 0) return alert('Cart khali hai!');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: monospace; padding: 5mm; width: 70mm; margin: 0 auto; color: black; }
            h2 { text-align: center; margin: 0; font-size: 18px; font-weight: bold; }
            p { text-align: center; margin: 2px 0; font-size: 12px; }
            .left-text { text-align: left; margin-top: 10px; font-size: 12px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { text-align: left; padding: 4px 0; border-bottom: 1px dashed black; }
            th:last-child, td:last-child { text-align: right; }
            .totals { margin-top: 10px; font-size: 13px; font-weight: bold; }
            .totals div { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .grand-total { font-size: 16px; border-top: 2px solid black; border-bottom: 2px solid black; padding: 5px 0; }
          </style>
        </head>
        <body>
          <h2>MY CLOTHING & SPORTS</h2>
          <p>Main Market, Your City</p>
          <p>Mob: 9876543210</p>
          <p>---------------------------------</p>
          
          ${customerName || customerPhone ? `
            <div class="left-text">
              Customer: ${customerName || 'Guest'}<br>
              Phone: ${customerPhone || 'N/A'}
            </div>
            <p>---------------------------------</p>
          ` : ''}

          <table>
            <tr><th>Item</th><th>Qty</th><th>Total</th></tr>
            ${cart.map(item => `
              <tr>
                <td>${item.name} <br><small>${item.size || ''} ${item.color || ''}</small></td>
                <td>${item.qty}</td>
                <td>Rs.${item.price * item.qty}</td>
              </tr>
            `).join('')}
          </table>

          <div class="totals">
            <div><span>Subtotal:</span> <span>Rs. ${subtotal}</span></div>
            ${discountAmount > 0 ? `<div><span>Discount (${discountType === 'flat' ? 'Flat' : dVal + '%'}):</span> <span>- Rs. ${discountAmount.toFixed(2)}</span></div>` : ''}
            <div class="grand-total"><span>GRAND TOTAL:</span> <span>Rs. ${grandTotal.toFixed(2)}</span></div>
          </div>
          
          <p style="margin-top: 20px;">Thank You for Shopping!</p>
          <p>No Exchange without Bill.</p>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto Print Trigger
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      
      // Clear Cart after print
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDiscountValue('');
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* LEFT: INVENTORY & SEARCH */}
      <div className="w-[60%] p-6 flex flex-col border-r border-gray-200">
        <h1 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
          <Shirt className="text-blue-600" /> Retail & Sports POS
        </h1>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input 
            type="text" 
            ref={searchInputRef}
            placeholder="Search Item Name Manually..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 shadow-sm outline-none focus:border-blue-500 font-bold"
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-3 gap-4 overflow-y-auto pr-2 pb-10">
          {INVENTORY.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-500 text-left flex flex-col justify-between h-32 transition-all active:scale-95"
            >
              <div>
                <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                <div className="flex gap-1 mt-1.5">
                  {item.size && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded border border-blue-200 font-bold">Size: {item.size}</span>}
                  {item.color && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold">{item.color}</span>}
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-blue-600 font-black text-lg">₹{item.price}</span>
                <span className="text-xs text-gray-400 font-mono font-bold">Stock: {item.stock}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: CART & BILLING */}
      <div className="w-[40%] bg-white flex flex-col h-full shadow-2xl z-10 relative">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h2 className="font-black text-lg flex items-center gap-2 text-gray-800"><ShoppingBag className="text-orange-500"/> Cart ({cart.length})</h2>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-green-600 bg-green-100 border border-green-300 px-2 py-1 rounded-full">
            <ScanBarcode size={14} /> Scanner Active
          </div>
        </div>

        {/* Customer Details Form */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-3 shrink-0">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="tel" 
                maxLength={10}
                placeholder="Mobile No..." 
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-blue-500 text-sm font-bold bg-gray-50"
              />
            </div>
            <div className="relative flex-1">
              <User className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Customer Name..." 
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-blue-500 text-sm font-bold bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <ShoppingBag size={40} className="mb-2" />
              <p className="text-center font-bold">Cart is empty.</p>
              <p className="text-xs mt-1">Use barcode scanner to add items.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center border border-gray-200 bg-white p-3 rounded-xl shadow-sm">
                <div>
                  <p className="font-bold text-sm text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{item.size && `Size: ${item.size}`} | ₹{item.price} <span className="text-orange-500 font-bold">x {item.qty}</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-green-600 text-base">₹{item.price * item.qty}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Discount & Total */}
        <div className="bg-white border-t border-gray-200 p-5 shrink-0">
          
          {/* Discount Section */}
          <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <span className="text-sm font-bold flex items-center gap-1.5 text-gray-700"><Tag size={16} className="text-orange-500"/> Discount:</span>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-200 p-1 rounded-lg">
                <button 
                  onClick={() => setDiscountType('flat')} 
                  className={`px-3 py-1 rounded text-xs font-black uppercase ${discountType === 'flat' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}
                >₹ Flat</button>
                <button 
                  onClick={() => setDiscountType('percent')} 
                  className={`px-3 py-1 rounded text-xs font-black uppercase ${discountType === 'percent' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}
                >% Off</button>
              </div>
              <input 
                type="number" 
                min="0"
                placeholder={discountType === 'flat' ? "Amount (₹)" : "Percent (%)"}
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-24 bg-white border border-gray-300 rounded-lg px-2 py-1.5 outline-none font-bold text-sm focus:border-blue-500"
              />
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1 mb-4 text-sm font-bold text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal:</span> <span>₹{subtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-orange-500">
                <span>Discount:</span> <span>- ₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-2xl font-black text-green-600 mt-2 pt-2 border-t border-dashed border-gray-300">
              <span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            onClick={handleThermalPrint}
            disabled={cart.length === 0}
            className="w-full bg-blue-600 disabled:bg-gray-300 hover:bg-blue-700 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Printer /> Checkout & Print Bill
          </button>
        </div>
      </div>
    </div>
  );
}
