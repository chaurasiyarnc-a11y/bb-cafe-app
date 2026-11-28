'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Printer, Search, Trash2, Tag, Shirt, ScanBarcode } from 'lucide-react';

// 1. DUMMY INVENTORY (Ise aap baad mein Firebase se connect kar sakte hain)
const INVENTORY = [
  { id: '101', barcode: '123456789012', name: 'Nike Running Shoes', category: 'Sports', size: 'UK 8', price: 1500, stock: 10 },
  { id: '102', barcode: '890123456789', name: 'Adidas Trackpant', category: 'Clothing', size: 'L', color: 'Black', price: 800, stock: 5 },
  { id: '103', barcode: '112233445566', name: 'Cotton T-Shirt', category: 'Clothing', size: 'M', color: 'White', price: 400, stock: 20 },
  { id: '104', barcode: '998877665544', name: 'SG Cricket Bat', category: 'Sports', size: 'Full', price: 2500, stock: 3 },
];

export default function RetailPos() {
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 2. BARCODE SCANNER LOGIC ("Jadu")
  // Barcode scanner asal mein ek bahut fast keyboard hota hai jo aakhri mein 'Enter' dabata hai.
  useEffect(() => {
    const handleBarcodeScan = (e: KeyboardEvent) => {
      // Agar user input box mein type nahi kar raha hai, tabhi barcode scan maane
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 5) {
          processBarcode(barcodeBuffer);
        }
        setBarcodeBuffer(''); // Reset buffer
      } else {
        // Fast typing buffer mein save karo
        setBarcodeBuffer((prev) => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleBarcodeScan);
    return () => window.removeEventListener('keydown', handleBarcodeScan);
  }, [barcodeBuffer]);

  // Barcode se item cart mein dalna
  const processBarcode = (scannedCode: string) => {
    const product = INVENTORY.find(item => item.barcode === scannedCode);
    if (product) {
      addToCart(product);
      alert(`✅ Scanned: ${product.name}`);
    } else {
      alert(`❌ Item not found for Barcode: ${scannedCode}`);
    }
  };

  const addToCart = (product: any) => {
    if (product.stock <= 0) {
      alert('Stock Khatam (Out of Stock)!');
      return;
    }

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

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // 3. THERMAL PRINTER LOGIC
  const handleThermalPrint = () => {
    if (cart.length === 0) return alert('Cart khali hai!');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 80mm / 58mm Thermal Printer CSS
    const htmlContent = `
      <html>
        <head>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: monospace; padding: 5mm; width: 70mm; margin: 0 auto; color: black; }
            h2 { text-align: center; margin: 0; font-size: 18px; }
            p { text-align: center; margin: 2px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { text-align: left; padding: 4px 0; border-bottom: 1px dashed black; }
            th:last-child, td:last-child { text-align: right; }
            .total-section { font-weight: bold; font-size: 14px; margin-top: 10px; text-align: right; }
          </style>
        </head>
        <body>
          <h2>MY SPORTS & APPAREL</h2>
          <p>Main Market, Your City</p>
          <p>Mob: 9876543210</p>
          <p>---------------------------------</p>
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
          <div class="total-section">
            GRAND TOTAL: Rs. ${subtotal}
          </div>
          <p style="margin-top: 15px;">Thank You for Shopping!</p>
          <p>No Exchange without Bill.</p>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto Print Trigger
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      setCart([]); // Bill nikalne ke baad cart clear
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      
      {/* LEFT: INVENTORY & SEARCH */}
      <div className="w-2/3 p-6 flex flex-col">
        <h1 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2">
          <Shirt className="text-blue-600" /> Retail & Sports POS
        </h1>
        
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            ref={searchInputRef}
            placeholder="Search by Name or Scan Barcode..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border shadow-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-3 gap-4 overflow-y-auto">
          {INVENTORY.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-white p-4 rounded-xl shadow hover:shadow-md border border-transparent hover:border-blue-500 text-left flex flex-col justify-between h-32 transition-all"
            >
              <div>
                <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                <div className="flex gap-2 mt-1">
                  {item.size && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold">Size: {item.size}</span>}
                  {item.color && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold">{item.color}</span>}
                </div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-blue-600 font-black">₹{item.price}</span>
                <span className="text-xs text-gray-400 font-mono">Stock: {item.stock}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: CART & BILLING */}
      <div className="w-1/3 bg-white shadow-xl flex flex-col">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h2 className="font-black text-lg flex items-center gap-2"><ShoppingBag /> Cart ({cart.length})</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full animate-pulse">
            <ScanBarcode size={14} /> Ready to Scan
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-gray-400 mt-10">Cart is empty.</p>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.size && `Size: ${item.size}`} | ₹{item.price} x {item.qty}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-gray-800">₹{item.price * item.qty}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex justify-between text-xl font-black mb-4 text-green-600">
            <span>Total:</span>
            <span>₹{subtotal}</span>
          </div>
          
          <button 
            onClick={handleThermalPrint}
            disabled={cart.length === 0}
            className="w-full bg-blue-600 disabled:bg-gray-400 hover:bg-blue-700 text-white py-3 rounded-lg font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Printer /> Print Thermal Bill
          </button>
        </div>
      </div>
    </div>
  );
}
