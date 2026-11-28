'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Printer, Search, Trash2, User, Phone, Tag, Shirt, ScanBarcode, Menu, Users, Truck, PackagePlus, Settings, X, QrCode, Bluetooth, BarChart3, Calendar, ArrowLeft } from 'lucide-react';

// --- DEFAULT DUMMY INVENTORY ---
const INITIAL_INVENTORY = [
  { id: '101', barcode: '123456789012', name: 'Nike Running Shoes', category: 'Sports', size: 'UK 8', color: 'Black', price: 1500, stock: 10, vendor: 'Nike India' },
  { id: '102', barcode: '890123456789', name: 'Adidas Trackpant', category: 'Clothing', size: 'L', color: 'Blue', price: 800, stock: 5, vendor: 'Delhi Traders' },
];

export default function RetailPos() {
  // --- SYSTEM STATES ---
  const [activeTab, setActiveTab] = useState('billing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  const [storeSettings, setStoreSettings] = useState({ 
    name: 'MY CLOTHING & SPORTS', 
    phone: '9876543210', 
    address: 'Main Market, Your City',
    upiId: 'yourname@upi',
    enableScanner: true,
  });

  // --- DYNAMIC SIZES & COLORS ---
  const [sizes, setSizes] = useState(['S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', 'UK 7', 'UK 8', 'UK 9']);
  const [colors, setColors] = useState(['Black', 'White', 'Blue', 'Red', 'Grey', 'Green', 'Yellow', 'Pink', 'Mixed']);

  // --- DATABASE STATES ---
  const [inventory, setInventory] = useState<any[]>(INITIAL_INVENTORY);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([{ id: 'v1', name: 'Delhi Traders', phone: '9988776655', supplied: 'Clothes' }]);
  const [orders, setOrders] = useState<any[]>([]); 
  
  // --- BILLING STATES ---
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number | ''>('');

  // --- REPORT STATES ---
  const [reportFilter, setReportFilter] = useState<'today' | 'yesterday' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // --- REAL BLUETOOTH BARCODE SCANNER LOGIC ---
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'billing' || !storeSettings.enableScanner) return; 
      
      // Ignore if typing in text inputs OTHER than the search box (like phone/name inputs)
      if (document.activeElement?.tagName === 'INPUT') {
        const inputType = (document.activeElement as HTMLInputElement).type;
        if (inputType !== 'text') return; // Ignore tel, number etc.
        if ((document.activeElement as HTMLInputElement).placeholder.includes('Customer')) return; // Ignore Customer Name box
      }
      if (document.activeElement?.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      
      // SPEED LIMIT INCREASED TO 250ms FOR SLOW BLUETOOTH SCANNERS
      if (currentTime - lastKeyTime.current > 250) { 
        barcodeBuffer.current = ''; 
      } 
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          processBarcode(barcodeBuffer.current);
          barcodeBuffer.current = ''; 
          e.preventDefault();
        }
      } else if (e.key.length === 1) { 
        barcodeBuffer.current += e.key;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, inventory, storeSettings.enableScanner]);

  const processBarcode = (scannedCode: string) => {
    const product = inventory.find(item => item.barcode === scannedCode);
    if (product) {
      addToCart(product);
      setSearchQuery(''); // Taki agar search box me type ho gaya ho to clear ho jaye
    } else {
      alert(`❌ Item not found for Barcode: ${scannedCode}`);
    }
  };

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Agar scanner chal raha hai (buffer mein data hai), toh ise ignore karo taaki DOUBLE add na ho
    if (barcodeBuffer.current.length >= 3) return;

    if (e.key === 'Enter' && searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      const product = inventory.find(item => item.barcode === query || item.name.toLowerCase() === query);
      if (product) {
        addToCart(product);
        setSearchQuery('');
      } else {
        alert('Item not found in inventory!');
      }
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

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  // --- BILLING CALCULATIONS ---
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const dVal = Number(discountValue) || 0;
  const discountAmount = discountType === 'flat' ? Math.min(dVal, subtotal) : (subtotal * dVal) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // --- CHECKOUT & THERMAL PRINT LOGIC ---
  const handleCheckout = () => {
    if (cart.length === 0) return alert('Cart khali hai!');

    let newInventory = [...inventory];
    cart.forEach(cItem => {
      const idx = newInventory.findIndex(i => i.id === cItem.id);
      if (idx > -1) { newInventory[idx].stock -= cItem.qty; }
    });
    setInventory(newInventory);

    const newOrder = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      customerName: customerName || 'Walk-in Guest',
      customerPhone: customerPhone || 'N/A',
      items: [...cart],
      subtotal,
      discountAmount,
      grandTotal
    };
    setOrders(prev => [newOrder, ...prev]);

    if (customerPhone) {
      setCustomers(prev => {
        const existing = prev.find(c => c.phone === customerPhone);
        if (existing) {
          return prev.map(c => c.phone === customerPhone ? { ...c, totalSpent: c.totalSpent + grandTotal, lastVisit: new Date().toLocaleDateString() } : c);
        }
        return [...prev, { name: customerName || 'Guest', phone: customerPhone, totalSpent: grandTotal, lastVisit: new Date().toLocaleDateString() }];
      });
    }

    const upiUri = `upi://pay?pa=${storeSettings.upiId}&pn=${encodeURIComponent(storeSettings.name)}&am=${grandTotal.toFixed(2)}&cu=INR`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;

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
            .qr-section { text-align: center; margin-top: 15px; border-top: 1px dashed black; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>${storeSettings.name}</h2>
          <p>${storeSettings.address}</p>
          <p>Mob: ${storeSettings.phone}</p>
          <p>---------------------------------</p>
          <div class="left-text">
            Customer: ${customerName || 'Guest'}<br>
            Phone: ${customerPhone || 'N/A'}<br>
            Date: ${new Date().toLocaleString()}
          </div>
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
          <div class="totals">
            <div><span>Subtotal:</span> <span>Rs. ${subtotal}</span></div>
            ${discountAmount > 0 ? `<div><span>Discount:</span> <span>- Rs. ${discountAmount.toFixed(2)}</span></div>` : ''}
            <div class="grand-total"><span>TOTAL:</span> <span>Rs. ${grandTotal.toFixed(2)}</span></div>
          </div>
          ${storeSettings.upiId ? `
            <div class="qr-section">
              <p>Scan to Pay: Rs. ${grandTotal.toFixed(2)}</p>
              <img src="${qrImageUrl}" alt="UPI QR" style="width: 120px; height: 120px; margin: 5px 0;" />
              <p style="font-size: 10px;">${storeSettings.upiId}</p>
            </div>
          ` : ''}
          <p style="margin-top: 20px;">Thank You for Shopping!</p>
          <p>No Exchange without Bill.</p>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus(); printWindow.print(); printWindow.close();
      setCart([]); setCustomerName(''); setCustomerPhone(''); setDiscountValue('');
      setShowMobileCart(false); 
    }, 1000); 
  };

  // --- REPORT FILTERING LOGIC ---
  const getFilteredOrders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      orderDate.setHours(0,0,0,0);

      if (reportFilter === 'today') {
        return orderDate.getTime() === today.getTime();
      } else if (reportFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return orderDate.getTime() === yesterday.getTime();
      } else if (reportFilter === 'month') {
        return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
      } else if (reportFilter === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        start.setHours(0,0,0,0);
        const end = new Date(customEndDate);
        end.setHours(23,59,59,999);
        const orderTime = new Date(order.timestamp).getTime();
        return orderTime >= start.getTime() && orderTime <= end.getTime();
      }
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();
  const totalReportSales = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalReportItems = filteredOrders.reduce((sum, o) => sum + o.items.reduce((iSum:number, i:any) => iSum + i.qty, 0), 0);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden pb-16 md:pb-0">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <div className={`hidden md:flex bg-gray-900 text-white flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'} z-20`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800 h-16">
          {isSidebarOpen && <span className="font-black text-lg tracking-widest text-blue-400">RETAIL POS</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-gray-800 rounded">
            {isSidebarOpen ? <X size={20} /> : <Menu size={24} />}
          </button>
        </div>
        
        <div className="flex-1 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          <SidebarBtn icon={<ShoppingBag/>} label="Billing (POS)" isActive={activeTab==='billing'} onClick={()=>{setActiveTab('billing'); setShowMobileCart(false);}} open={isSidebarOpen} />
          <SidebarBtn icon={<BarChart3/>} label="Sales Report" isActive={activeTab==='reports'} onClick={()=>setActiveTab('reports')} open={isSidebarOpen} />
          <SidebarBtn icon={<PackagePlus/>} label="Inventory & Stock" isActive={activeTab==='inventory'} onClick={()=>setActiveTab('inventory')} open={isSidebarOpen} />
          <SidebarBtn icon={<Users/>} label="Customers" isActive={activeTab==='customers'} onClick={()=>setActiveTab('customers')} open={isSidebarOpen} />
          <SidebarBtn icon={<Truck/>} label="Vendors" isActive={activeTab==='vendors'} onClick={()=>setActiveTab('vendors')} open={isSidebarOpen} />
        </div>

        <div className="p-4 border-t border-gray-800">
           <SidebarBtn icon={<Settings/>} label="Settings" isActive={activeTab==='settings'} onClick={()=>setActiveTab('settings')} open={isSidebarOpen} />
        </div>
      </div>

      {/* --- MOBILE TOP HEADER --- */}
      <div className="md:hidden flex justify-between items-center bg-gray-900 text-white p-3 shadow-md z-20">
        <span className="font-black text-lg tracking-widest text-blue-400 uppercase">{activeTab}</span>
        <div className="flex items-center gap-2">
          {storeSettings.enableScanner && <Bluetooth size={18} className="text-green-400" />}
          <span className="text-xs font-bold">{storeSettings.name}</span>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex h-full relative overflow-hidden">
        
        {/* TAB 1: BILLING (POS) */}
        {activeTab === 'billing' && (
          <>
            {/* LEFT AREA: SEARCH & ITEMS */}
            <div className={`w-full md:w-[60%] p-4 md:p-6 flex-col h-full bg-gray-50 md:border-r ${showMobileCart ? 'hidden md:flex' : 'flex'}`}>
              <h1 className="hidden md:flex text-xl font-black text-gray-800 mb-4 items-center gap-2"><Shirt className="text-blue-600"/> Checkout Counter</h1>
              <div className="relative mb-4 md:mb-6 shrink-0">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Scan Barcode or Search Item..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  onKeyDown={handleSearchEnter}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 shadow-sm outline-none focus:border-blue-500 font-bold" 
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 overflow-y-auto pr-1 pb-4">
                {inventory.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.barcode.includes(searchQuery)).map(item => (
                  <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-3 md:p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-500 text-left flex flex-col justify-between h-28 md:h-32 transition-all active:scale-95">
                    <div>
                      <p className="font-bold text-gray-800 text-xs md:text-sm leading-tight line-clamp-2">{item.name}</p>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {item.size && <span className="bg-blue-50 text-blue-600 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded border border-blue-200 font-bold">{item.size}</span>}
                        {item.color && <span className="bg-gray-100 text-gray-600 text-[9px] md:text-[10px] px-1.5 py-0.5 rounded font-bold">{item.color}</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                      <span className="text-blue-600 font-black text-sm md:text-lg">₹{item.price}</span>
                      <span className="text-[9px] md:text-[10px] text-gray-400 font-mono font-bold">Stk: {item.stock}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT AREA: CART */}
            <div className={`w-full md:w-[40%] bg-white flex-col h-full shadow-xl z-30 absolute inset-0 md:relative md:inset-auto ${showMobileCart ? 'flex' : 'hidden md:flex'}`}>
              
              <div className="md:hidden bg-gray-900 text-white p-3 flex items-center gap-2 shrink-0">
                <button onClick={() => setShowMobileCart(false)} className="p-1 bg-gray-800 rounded-full"><ArrowLeft size={20}/></button>
                <span className="font-bold">Back to Products</span>
              </div>

              <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                <h2 className="font-black text-base md:text-lg flex items-center gap-2 text-gray-800"><ShoppingBag className="text-orange-500"/> Cart ({cart.length})</h2>
                {storeSettings.enableScanner ? (
                  <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase text-green-600 bg-green-100 px-2 py-1 rounded-full"><Bluetooth size={14} /> BT ON</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold uppercase text-red-600 bg-red-100 px-2 py-1 rounded-full"><Bluetooth size={14} /> BT OFF</span>
                )}
              </div>
              
              <div className="p-3 md:p-4 bg-white border-b space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input type="tel" maxLength={10} placeholder="Mobile No..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2 rounded-lg border outline-none focus:border-blue-500 text-xs md:text-sm font-bold bg-gray-50" />
                  </div>
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input type="text" placeholder="Customer Name..." value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border outline-none focus:border-blue-500 text-xs md:text-sm font-bold bg-gray-50" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <ShoppingBag size={40} className="mb-2" />
                    <p className="text-center font-bold">Cart is empty.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border bg-white p-2.5 md:p-3 rounded-xl shadow-sm">
                      <div className="flex-1 pr-2">
                        <p className="font-bold text-xs md:text-sm text-gray-800 line-clamp-1">{item.name}</p>
                        <p className="text-[10px] md:text-xs text-gray-500 font-mono mt-0.5">
                          {item.size && `${item.size}`} {item.color && `| ${item.color}`} | ₹{item.price} <span className="text-orange-500 font-bold">x {item.qty}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <span className="font-black text-green-600 text-sm md:text-base">₹{item.price * item.qty}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-500 hover:text-white"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="bg-white border-t p-3 md:p-5 shrink-0">
                <div className="flex justify-between items-center mb-3 md:mb-4 bg-gray-50 p-2 md:p-3 rounded-xl border">
                  <span className="text-xs md:text-sm font-bold flex items-center gap-1.5 text-gray-700"><Tag size={16} className="text-orange-500"/> Discount:</span>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                      <button onClick={() => setDiscountType('flat')} className={`px-2 py-1 rounded text-[9px] md:text-[10px] font-black uppercase ${discountType === 'flat' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}>₹ Flat</button>
                      <button onClick={() => setDiscountType('percent')} className={`px-2 py-1 rounded text-[9px] md:text-[10px] font-black uppercase ${discountType === 'percent' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}>% Off</button>
                    </div>
                    <input type="number" min="0" placeholder={discountType === 'flat' ? "Amount" : "%"} value={discountValue} onChange={e => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-16 md:w-20 bg-white border rounded-lg px-2 py-1.5 outline-none font-bold text-xs md:text-sm focus:border-blue-500" />
                  </div>
                </div>

                <div className="space-y-1 mb-3 md:mb-4 text-xs md:text-sm font-bold text-gray-600">
                  <div className="flex justify-between"><span>Subtotal:</span> <span>₹{subtotal}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-orange-500"><span>Discount:</span> <span>- ₹{discountAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-xl md:text-2xl font-black text-green-600 mt-2 pt-2 border-t border-dashed">
                    <span>Total:</span> <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 md:py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all text-xs md:text-sm">
                  <Printer size={18} /> Checkout & Print
                </button>
              </div>
            </div>

            {/* Mobile Floating Cart Button */}
            {!showMobileCart && (
              <button 
                onClick={() => setShowMobileCart(true)} 
                className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(234,88,12,0.5)] z-40 animate-bounce"
              >
                <ShoppingBag size={24} />
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                  {cart.length}
                </span>
              </button>
            )}
          </>
        )}

        {/* TAB 2: SALES REPORT */}
        {activeTab === 'reports' && (
          <div className="p-4 md:p-8 w-full h-full overflow-y-auto bg-gray-50">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 md:mb-6 flex items-center gap-2"><BarChart3 className="text-blue-600"/> Sales Report</h2>
            
            <div className="bg-white p-3 md:p-5 rounded-xl border mb-4 md:mb-6 shadow-sm flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center justify-between">
              <div className="flex gap-1 md:gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-hide">
                <button onClick={() => setReportFilter('today')} className={`flex-1 sm:flex-none px-3 py-1.5 md:py-2 rounded font-bold text-xs md:text-sm whitespace-nowrap ${reportFilter === 'today' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>Today</button>
                <button onClick={() => setReportFilter('yesterday')} className={`flex-1 sm:flex-none px-3 py-1.5 md:py-2 rounded font-bold text-xs md:text-sm whitespace-nowrap ${reportFilter === 'yesterday' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>Yesterday</button>
                <button onClick={() => setReportFilter('month')} className={`flex-1 sm:flex-none px-3 py-1.5 md:py-2 rounded font-bold text-xs md:text-sm whitespace-nowrap ${reportFilter === 'month' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>Month</button>
                <button onClick={() => setReportFilter('custom')} className={`flex-1 sm:flex-none px-3 py-1.5 md:py-2 rounded font-bold text-xs md:text-sm whitespace-nowrap ${reportFilter === 'custom' ? 'bg-blue-600 text-white shadow' : 'text-gray-600'}`}>Custom</button>
              </div>
              
              {reportFilter === 'custom' && (
                <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100 w-full sm:w-auto">
                  <Calendar size={16} className="text-blue-500 shrink-0" />
                  <input type="date" value={customStartDate} onChange={e=>setCustomStartDate(e.target.value)} className="p-1 md:p-1.5 rounded border outline-none text-xs w-full" />
                  <span className="font-bold text-gray-500 text-xs">To</span>
                  <input type="date" value={customEndDate} onChange={e=>setCustomEndDate(e.target.value)} className="p-1 md:p-1.5 rounded border outline-none text-xs w-full" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="bg-white border rounded-xl p-4 md:p-6 shadow-sm border-l-4 border-l-green-500">
                <p className="text-xs md:text-sm font-bold text-gray-500 uppercase">Total Sales</p>
                <p className="text-2xl md:text-3xl font-black text-green-600 mt-1 md:mt-2">₹{totalReportSales.toFixed(2)}</p>
              </div>
              <div className="bg-white border rounded-xl p-4 md:p-6 shadow-sm border-l-4 border-l-blue-500">
                <p className="text-xs md:text-sm font-bold text-gray-500 uppercase">Total Orders</p>
                <p className="text-2xl md:text-3xl font-black text-blue-600 mt-1 md:mt-2">{filteredOrders.length}</p>
              </div>
              <div className="bg-white border rounded-xl p-4 md:p-6 shadow-sm border-l-4 border-l-orange-500">
                <p className="text-xs md:text-sm font-bold text-gray-500 uppercase">Items Sold</p>
                <p className="text-2xl md:text-3xl font-black text-orange-600 mt-1 md:mt-2">{totalReportItems}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="p-3 md:p-4 font-bold text-xs md:text-sm">Date & Time</th>
                    <th className="p-3 md:p-4 font-bold text-xs md:text-sm">Customer</th>
                    <th className="p-3 md:p-4 font-bold text-xs md:text-sm">Items Bought</th>
                    <th className="p-3 md:p-4 font-bold text-xs md:text-sm">Discount</th>
                    <th className="p-3 md:p-4 font-bold text-xs md:text-sm text-right">Bill Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 md:p-8 text-center text-gray-500 font-bold">No sales data found.</td></tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="p-3 md:p-4 text-xs font-mono text-gray-600">{new Date(order.timestamp).toLocaleString()}</td>
                        <td className="p-3 md:p-4 font-bold text-xs md:text-sm">{order.customerName} <br/><span className="text-[10px] text-gray-400">{order.customerPhone}</span></td>
                        <td className="p-3 md:p-4 text-xs text-gray-600">
                          {order.items.map((i:any) => `${i.name} (x${i.qty})`).join(', ')}
                        </td>
                        <td className="p-3 md:p-4 text-orange-500 text-xs md:text-sm font-bold">{order.discountAmount > 0 ? `- ₹${order.discountAmount.toFixed(2)}` : '-'}</td>
                        <td className="p-3 md:p-4 text-right font-black text-green-600 text-sm md:text-lg">₹{order.grandTotal.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: INVENTORY */}
        {activeTab === 'inventory' && (
          <div className="p-4 md:p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 md:mb-6 flex items-center gap-2"><PackagePlus/> Manage Inventory & Stock</h2>
            <div className="bg-gray-50 p-4 md:p-5 rounded-xl border mb-4 md:mb-6 shadow-sm">
              <h3 className="font-bold text-gray-600 mb-3 uppercase text-xs md:text-sm">Add New Item</h3>
              <form 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4" 
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const item = {
                    id: Date.now().toString(),
                    barcode: (fd.get('barcode') as string) || Math.floor(Math.random()*1000000000).toString(),
                    name: fd.get('name'), size: fd.get('size'), color: fd.get('color'),
                    price: Number(fd.get('price')), stock: Number(fd.get('stock')), vendor: fd.get('vendor')
                  };
                  setInventory([item, ...inventory]);
                  e.currentTarget.reset();
                  alert('Item Added Successfully!');
                }}
              >
                <input required name="name" type="text" placeholder="Item Name (e.g. Shirt) *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold text-sm" />
                <input name="barcode" type="text" placeholder="Barcode (Scan / Blank for auto)" className="border p-2 rounded outline-none focus:border-blue-500 text-sm" />
                
                <select name="size" onChange={e => {
                  if (e.target.value === 'ADD_NEW') {
                    const newSz = prompt("Naya Size likhein (e.g. XXL, 38):");
                    if (newSz) { setSizes([...sizes, newSz]); e.target.value = newSz; } else { e.target.value = ''; }
                  }
                }} className="border p-2 rounded outline-none bg-white focus:border-blue-500 cursor-pointer text-sm">
                  <option value="">Select Size...</option>
                  {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="ADD_NEW" className="text-blue-600 font-bold">+ Add New...</option>
                </select>

                <select name="color" onChange={e => {
                  if (e.target.value === 'ADD_NEW') {
                    const newCol = prompt("Naya Color likhein (e.g. Maroon, Olive):");
                    if (newCol) { setColors([...colors, newCol]); e.target.value = newCol; } else { e.target.value = ''; }
                  }
                }} className="border p-2 rounded outline-none bg-white focus:border-blue-500 cursor-pointer text-sm">
                  <option value="">Select Color...</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="ADD_NEW" className="text-blue-600 font-bold">+ Add New...</option>
                </select>

                <input required name="price" type="number" placeholder="Price (₹) *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold text-sm" />
                <input required name="stock" type="number" placeholder="Total Stock Qty *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold text-sm" />
                
                <select name="vendor" className="border p-2 rounded outline-none bg-white cursor-pointer text-sm">
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
                <button type="submit" className="bg-green-600 text-white font-black rounded hover:bg-green-500 shadow py-2 sm:py-0">Save Item</button>
              </form>
            </div>
            
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead><tr className="bg-gray-800 text-white"><th className="p-3">Barcode</th><th className="p-3">Name</th><th className="p-3">Size & Color</th><th className="p-3">Vendor</th><th className="p-3">Price</th><th className="p-3">Stock</th></tr></thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs md:text-sm">{item.barcode}</td>
                      <td className="p-3 font-bold text-sm">{item.name}</td>
                      <td className="p-3 text-xs">{item.size || '-'} {item.color ? `| ${item.color}` : ''}</td>
                      <td className="p-3 text-xs text-gray-500">{item.vendor || '-'}</td>
                      <td className="p-3 font-bold text-green-600">₹{item.price}</td>
                      <td className={`p-3 font-black ${item.stock < 5 ? 'text-red-500' : 'text-gray-800'}`}>{item.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="p-4 md:p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 md:mb-6 flex items-center gap-2"><Users/> Customer Profiles</h2>
            {customers.length === 0 ? <p className="text-gray-500">No customers yet.</p> : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse border min-w-[500px]">
                  <thead><tr className="bg-gray-100"><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Total Spent (₹)</th><th className="p-3">Last Visit</th></tr></thead>
                  <tbody>
                    {customers.map((c, i) => (<tr key={i} className="border-b"><td className="p-3 font-bold">{c.name}</td><td className="p-3 font-mono">{c.phone}</td><td className="p-3 font-black text-green-600">₹{c.totalSpent}</td><td className="p-3 text-gray-500">{c.lastVisit}</td></tr>))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* TAB 5: VENDORS */}
        {activeTab === 'vendors' && (
          <div className="p-4 md:p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 md:mb-6 flex items-center gap-2"><Truck/> Vendors</h2>
            <div className="bg-blue-50 p-4 md:p-5 rounded-xl border border-blue-100 mb-6 flex flex-col sm:flex-row gap-3 md:gap-4">
              <input type="text" id="vName" placeholder="Vendor Name" className="flex-1 p-2 border rounded" />
              <input type="text" id="vPhone" placeholder="Phone No." className="flex-1 p-2 border rounded" />
              <button onClick={()=>{
                const n = (document.getElementById('vName') as HTMLInputElement).value;
                const p = (document.getElementById('vPhone') as HTMLInputElement).value;
                if(n) { setVendors([...vendors, {id: Date.now().toString(), name:n, phone:p, supplied:'Miscellaneous'}]); alert('Vendor Added'); }
              }} className="bg-blue-600 text-white px-6 py-2 font-bold rounded">Add Vendor</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {vendors.map(v => (
                <div key={v.id} className="border p-4 rounded-xl shadow-sm bg-white"><p className="font-black text-lg uppercase">{v.name}</p><p className="font-mono text-gray-600 mt-1">📞 {v.phone}</p></div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-4 md:p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-xl md:text-2xl font-black text-gray-800 mb-4 md:mb-6 flex items-center gap-2"><Settings/> System Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 md:p-6 rounded-xl border space-y-4">
                <h3 className="font-black text-gray-700 flex items-center gap-2"><User size={18}/> Store Details</h3>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Store Name</label>
                  <input type="text" value={storeSettings.name} onChange={e=>setStoreSettings({...storeSettings, name: e.target.value})} className="w-full p-2 border rounded mt-1 font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Store Phone</label>
                  <input type="text" value={storeSettings.phone} onChange={e=>setStoreSettings({...storeSettings, phone: e.target.value})} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Store Address</label>
                  <textarea value={storeSettings.address} onChange={e=>setStoreSettings({...storeSettings, address: e.target.value})} className="w-full p-2 border rounded mt-1" />
                </div>
                <div className="border-t pt-4">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><QrCode size={14}/> UPI ID (For Bill QR Code)</label>
                  <input type="text" placeholder="e.g. 9876543210@paytm" value={storeSettings.upiId} onChange={e=>setStoreSettings({...storeSettings, upiId: e.target.value})} className="w-full p-2 border border-blue-300 bg-blue-50 rounded mt-1 font-mono font-bold" />
                </div>
              </div>

              <div className="bg-gray-50 p-4 md:p-6 rounded-xl border space-y-6">
                <h3 className="font-black text-gray-700 flex items-center gap-2"><Bluetooth size={18}/> Hardware Settings</h3>
                <div className="bg-white p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-bold text-gray-700 flex items-center gap-2"><ScanBarcode size={16}/> Barcode Scanner (USB/BT)</label>
                    <input type="checkbox" checked={storeSettings.enableScanner} onChange={e => setStoreSettings({...storeSettings, enableScanner: e.target.checked})} className="w-5 h-5 cursor-pointer accent-blue-600" />
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-500">Enable this to allow scanners to auto-add items to the cart.</p>
                </div>
                <button onClick={()=>alert('Hardware & Store Settings Saved Successfully!')} className="w-full bg-green-600 text-white font-black py-3 rounded shadow hover:bg-green-500">Save All Settings</button>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {/* MOBILE BOTTOM NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-400 flex justify-between px-2 py-2 border-t border-gray-800 z-50">
        <button onClick={() => {setActiveTab('billing'); setShowMobileCart(false);}} className={`flex flex-col items-center p-2 rounded-lg flex-1 ${activeTab==='billing'?'text-blue-400 bg-gray-800':''}`}>
          <ShoppingBag size={20}/>
          <span className="text-[10px] mt-1 font-bold">POS</span>
        </button>
        <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center p-2 rounded-lg flex-1 ${activeTab==='reports'?'text-blue-400 bg-gray-800':''}`}>
          <BarChart3 size={20}/>
          <span className="text-[10px] mt-1 font-bold">Sales</span>
        </button>
        <button onClick={() => setActiveTab('inventory')} className={`flex flex-col items-center p-2 rounded-lg flex-1 ${activeTab==='inventory'?'text-blue-400 bg-gray-800':''}`}>
          <PackagePlus size={20}/>
          <span className="text-[10px] mt-1 font-bold">Stock</span>
        </button>
        <button onClick={() => setActiveTab('customers')} className={`flex flex-col items-center p-2 rounded-lg flex-1 ${activeTab==='customers'?'text-blue-400 bg-gray-800':''}`}>
          <Users size={20}/>
          <span className="text-[10px] mt-1 font-bold">CRM</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center p-2 rounded-lg flex-1 ${activeTab==='settings'?'text-blue-400 bg-gray-800':''}`}>
          <Settings size={20}/>
          <span className="text-[10px] mt-1 font-bold">Settings</span>
        </button>
      </div>

    </div>
  );
}

function SidebarBtn({ icon, label, isActive, onClick, open }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isActive ? 'bg-blue-600 text-white border-l-4 border-blue-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'}`}>
      {icon} {open && <span className="font-bold text-sm tracking-wide">{label}</span>}
    </button>
  );
}
