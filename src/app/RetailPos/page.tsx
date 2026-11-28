'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Printer, Search, Trash2, User, Phone, Tag, Shirt, ScanBarcode, Menu, Users, Truck, PackagePlus, Settings, X, QrCode, Bluetooth } from 'lucide-react';

// --- DEFAULT DUMMY DATA ---
const INITIAL_INVENTORY = [
  { id: '101', barcode: '123456789012', name: 'Nike Running Shoes', category: 'Sports', size: 'UK 8', color: 'Black', price: 1500, stock: 10, vendor: 'Nike India' },
  { id: '102', barcode: '890123456789', name: 'Adidas Trackpant', category: 'Clothing', size: 'L', color: 'Blue', price: 800, stock: 5, vendor: 'Delhi Traders' },
];

export default function RetailPos() {
  // --- SYSTEM & HARDWARE STATES ---
  const [activeTab, setActiveTab] = useState('billing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [storeSettings, setStoreSettings] = useState({ 
    name: 'MY CLOTHING & SPORTS', 
    phone: '9876543210', 
    address: 'Main Market, Your City',
    upiId: 'yourname@upi', // Naya: UPI ID
    enableScanner: true,   // Naya: BT Scanner Toggle
    printerType: 'system'  // Naya: BT/USB System Printer
  });

  // --- DYNAMIC SIZES & COLORS ---
  const [sizes, setSizes] = useState(['S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', 'UK 7', 'UK 8', 'UK 9']);
  const [colors, setColors] = useState(['Black', 'White', 'Blue', 'Red', 'Grey', 'Green', 'Yellow', 'Pink', 'Mixed']);

  // --- NEW ITEM FORM STATES ---
  const [newItem, setNewItem] = useState({ name: '', barcode: '', size: '', color: '', price: '', stock: '', vendor: '' });

  // --- DATABASE STATES ---
  const [inventory, setInventory] = useState<any[]>(INITIAL_INVENTORY);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([{ id: 'v1', name: 'Delhi Traders', phone: '9988776655', supplied: 'Clothes' }]);
  
  // --- BILLING STATES ---
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- REAL BLUETOOTH BARCODE SCANNER LOGIC ---
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'billing' || !storeSettings.enableScanner) return; 
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime.current > 50) { barcodeBuffer.current = ''; } 
      lastKeyTime.current = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          processBarcode(barcodeBuffer.current);
          barcodeBuffer.current = ''; 
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

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  // --- BILLING CALCULATIONS ---
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const dVal = Number(discountValue) || 0;
  const discountAmount = discountType === 'flat' ? Math.min(dVal, subtotal) : (subtotal * dVal) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // --- CHECKOUT & THERMAL PRINT LOGIC (WITH UPI QR) ---
  const handleCheckout = () => {
    if (cart.length === 0) return alert('Cart khali hai!');

    // 1. Update Stock
    let newInventory = [...inventory];
    cart.forEach(cItem => {
      const idx = newInventory.findIndex(i => i.id === cItem.id);
      if (idx > -1) { newInventory[idx].stock -= cItem.qty; }
    });
    setInventory(newInventory);

    // 2. Generate UPI QR Code Link
    const upiUri = `upi://pay?pa=${storeSettings.upiId}&pn=${encodeURIComponent(storeSettings.name)}&am=${grandTotal.toFixed(2)}&cu=INR`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUri)}`;

    // 3. Thermal Print Window
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
          
          ${customerPhone ? `
            <div class="left-text">
              Customer: ${customerName || 'Guest'}<br>
              Phone: ${customerPhone}
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
            ${discountAmount > 0 ? `<div><span>Discount:</span> <span>- Rs. ${discountAmount.toFixed(2)}</span></div>` : ''}
            <div class="grand-total"><span>TOTAL:</span> <span>Rs. ${grandTotal.toFixed(2)}</span></div>
          </div>

          <!-- DYNAMIC UPI QR CODE SECTION -->
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
    
    // QR Code load hone ka thoda wait karke print trigger karenge
    setTimeout(() => {
      printWindow.focus(); 
      printWindow.print(); 
      printWindow.close();
      setCart([]); setCustomerName(''); setCustomerPhone(''); setDiscountValue('');
    }, 1500); 
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <div className={`bg-gray-900 text-white flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {isSidebarOpen && <span className="font-black text-lg tracking-widest text-blue-400">RETAIL POS</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-gray-800 rounded">
            {isSidebarOpen ? <X size={20} /> : <Menu size={24} />}
          </button>
        </div>
        
        <div className="flex-1 py-4 space-y-2">
          <SidebarBtn icon={<ShoppingBag/>} label="Billing (POS)" isActive={activeTab==='billing'} onClick={()=>setActiveTab('billing')} open={isSidebarOpen} />
          <SidebarBtn icon={<PackagePlus/>} label="Inventory & Stock" isActive={activeTab==='inventory'} onClick={()=>setActiveTab('inventory')} open={isSidebarOpen} />
          <SidebarBtn icon={<Users/>} label="Customers" isActive={activeTab==='customers'} onClick={()=>setActiveTab('customers')} open={isSidebarOpen} />
          <SidebarBtn icon={<Truck/>} label="Vendors (Suppliers)" isActive={activeTab==='vendors'} onClick={()=>setActiveTab('vendors')} open={isSidebarOpen} />
        </div>

        <div className="p-4 border-t border-gray-800">
           <SidebarBtn icon={<Settings/>} label="Settings" isActive={activeTab==='settings'} onClick={()=>setActiveTab('settings')} open={isSidebarOpen} />
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex h-full">
        
        {/* TAB 1: BILLING (POS) */}
        {activeTab === 'billing' && (
          <>
            <div className="w-[60%] p-6 flex flex-col h-full bg-gray-50 border-r">
              <h1 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2"><Shirt className="text-blue-600"/> Checkout Counter</h1>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input type="text" ref={searchInputRef} placeholder="Search Item Name manually..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 shadow-sm outline-none focus:border-blue-500 font-bold" />
              </div>
              <div className="grid grid-cols-3 gap-4 overflow-y-auto pr-2 pb-4">
                {inventory.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                  <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-500 text-left flex flex-col justify-between h-32 transition-all active:scale-95">
                    <div>
                      <p className="font-bold text-gray-800 text-sm leading-tight">{item.name}</p>
                      <div className="flex gap-1 mt-1.5">
                        {item.size && <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded border border-blue-200 font-bold">Size: {item.size}</span>}
                        {item.color && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded font-bold">{item.color}</span>}
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <span className="text-blue-600 font-black text-lg">₹{item.price}</span>
                      <span className="text-[10px] text-gray-400 font-mono font-bold">Stock: {item.stock}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* CART SIDE */}
            <div className="w-[40%] bg-white flex flex-col h-full shadow-xl z-10">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                <h2 className="font-black text-lg flex items-center gap-2 text-gray-800"><ShoppingBag className="text-orange-500"/> Cart ({cart.length})</h2>
                {storeSettings.enableScanner ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-green-600 bg-green-100 px-2 py-1 rounded-full"><Bluetooth size={14} /> BT Scanner ON</span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-red-600 bg-red-100 px-2 py-1 rounded-full"><Bluetooth size={14} /> BT Scanner OFF</span>
                )}
              </div>
              
              {/* Customer Info Box */}
              <div className="p-4 bg-white border-b space-y-3 shrink-0">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input type="tel" maxLength={10} placeholder="Mobile No..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="w-full pl-9 pr-3 py-2 rounded-lg border outline-none focus:border-blue-500 text-sm font-bold bg-gray-50" />
                  </div>
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={14} />
                    <input type="text" placeholder="Customer Name..." value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border outline-none focus:border-blue-500 text-sm font-bold bg-gray-50" />
                  </div>
                </div>
              </div>

              {/* Cart List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50">
                    <ShoppingBag size={40} className="mb-2" />
                    <p className="text-center font-bold">Cart is empty.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border bg-white p-3 rounded-xl shadow-sm">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          {item.size && `${item.size}`} {item.color && `| ${item.color}`} | ₹{item.price} <span className="text-orange-500 font-bold">x {item.qty}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-green-600 text-base">₹{item.price * item.qty}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 bg-red-50 p-1.5 rounded hover:bg-red-500 hover:text-white"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Checkout Footer */}
              <div className="bg-white border-t p-5 shrink-0">
                <div className="flex justify-between items-center mb-4 bg-gray-50 p-3 rounded-xl border">
                  <span className="text-sm font-bold flex items-center gap-1.5 text-gray-700"><Tag size={16} className="text-orange-500"/> Discount:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-200 p-1 rounded-lg">
                      <button onClick={() => setDiscountType('flat')} className={`px-3 py-1 rounded text-[10px] font-black uppercase ${discountType === 'flat' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}>₹ Flat</button>
                      <button onClick={() => setDiscountType('percent')} className={`px-3 py-1 rounded text-[10px] font-black uppercase ${discountType === 'percent' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}>% Off</button>
                    </div>
                    <input type="number" min="0" placeholder={discountType === 'flat' ? "Amount" : "%"} value={discountValue} onChange={e => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 bg-white border rounded-lg px-2 py-1.5 outline-none font-bold text-sm focus:border-blue-500" />
                  </div>
                </div>

                <div className="space-y-1 mb-4 text-sm font-bold text-gray-600">
                  <div className="flex justify-between"><span>Subtotal:</span> <span>₹{subtotal}</span></div>
                  {discountAmount > 0 && <div className="flex justify-between text-orange-500"><span>Discount:</span> <span>- ₹{discountAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-2xl font-black text-green-600 mt-2 pt-2 border-t border-dashed">
                    <span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                  <Printer /> Checkout & Print Bill
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: INVENTORY & STOCK */}
        {activeTab === 'inventory' && (
          <div className="p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><PackagePlus/> Manage Inventory & Stock</h2>
            <div className="bg-gray-50 p-5 rounded-xl border mb-6 shadow-sm">
              <h3 className="font-bold text-gray-600 mb-3 uppercase text-sm">Add New Item</h3>
              
              <form 
                className="grid grid-cols-4 gap-4" 
                onSubmit={(e) => {
                  e.preventDefault();
                  const item = {
                    id: Date.now().toString(),
                    barcode: newItem.barcode || Math.floor(Math.random()*1000000000).toString(),
                    name: newItem.name, size: newItem.size, color: newItem.color,
                    price: Number(newItem.price), stock: Number(newItem.stock), vendor: newItem.vendor
                  };
                  setInventory([item, ...inventory]);
                  setNewItem({ name: '', barcode: '', size: '', color: '', price: '', stock: '', vendor: '' });
                  alert('Item Added Successfully!');
                }}
              >
                <input required value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} type="text" placeholder="Item Name (e.g. Shirt) *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold" />
                <input value={newItem.barcode} onChange={e=>setNewItem({...newItem, barcode: e.target.value})} type="text" placeholder="Barcode (Scan / Blank for auto)" className="border p-2 rounded outline-none focus:border-blue-500" />
                
                {/* DYNAMIC SIZES */}
                <select 
                  value={newItem.size} 
                  onChange={e => {
                    if (e.target.value === 'ADD_NEW') {
                      const newSz = prompt("Naya Size likhein (e.g. XXL, 38):");
                      if (newSz) { setSizes([...sizes, newSz]); setNewItem({...newItem, size: newSz}); }
                    } else { setNewItem({...newItem, size: e.target.value}); }
                  }} 
                  className="border p-2 rounded outline-none bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Size...</option>
                  {sizes.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="ADD_NEW" className="text-blue-600 font-bold">+ Add New...</option>
                </select>

                {/* DYNAMIC COLORS */}
                <select 
                  value={newItem.color} 
                  onChange={e => {
                    if (e.target.value === 'ADD_NEW') {
                      const newCol = prompt("Naya Color likhein (e.g. Maroon, Olive):");
                      if (newCol) { setColors([...colors, newCol]); setNewItem({...newItem, color: newCol}); }
                    } else { setNewItem({...newItem, color: e.target.value}); }
                  }} 
                  className="border p-2 rounded outline-none bg-white focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Select Color...</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="ADD_NEW" className="text-blue-600 font-bold">+ Add New...</option>
                </select>

                <input required value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} type="number" placeholder="Price (₹) *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold" />
                <input required value={newItem.stock} onChange={e=>setNewItem({...newItem, stock: e.target.value})} type="number" placeholder="Total Stock Qty *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold" />
                
                <select value={newItem.vendor} onChange={e=>setNewItem({...newItem, vendor: e.target.value})} className="border p-2 rounded outline-none bg-white cursor-pointer">
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
                <button type="submit" className="bg-green-600 text-white font-black rounded hover:bg-green-500 shadow">Save Item</button>
              </form>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-800 text-white"><th className="p-3">Barcode</th><th className="p-3">Name</th><th className="p-3">Size & Color</th><th className="p-3">Vendor</th><th className="p-3">Price</th><th className="p-3">Stock</th></tr></thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{item.barcode}</td>
                    <td className="p-3 font-bold">{item.name}</td>
                    <td className="p-3 text-xs">{item.size || '-'} {item.color ? `| ${item.color}` : ''}</td>
                    <td className="p-3 text-xs text-gray-500">{item.vendor || '-'}</td>
                    <td className="p-3 font-bold text-green-600">₹{item.price}</td>
                    <td className={`p-3 font-black ${item.stock < 5 ? 'text-red-500' : 'text-gray-800'}`}>{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CUSTOMERS & TAB 4: VENDORS ... Same as before ... */}
        {activeTab === 'customers' && (
          <div className="p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><Users/> Customer Profiles</h2>
            {customers.length === 0 ? <p className="text-gray-500">No customers yet.</p> : (
              <table className="w-full text-left border-collapse border">
                <thead><tr className="bg-gray-100"><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Total Spent (₹)</th><th className="p-3">Last Visit</th></tr></thead>
                <tbody>
                  {customers.map((c, i) => (<tr key={i} className="border-b"><td className="p-3 font-bold">{c.name}</td><td className="p-3 font-mono">{c.phone}</td><td className="p-3 font-black text-green-600">₹{c.totalSpent}</td><td className="p-3 text-gray-500">{c.lastVisit}</td></tr>))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === 'vendors' && (
          <div className="p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><Truck/> Vendors</h2>
            {/* Same Vendor code */}
            <div className="grid grid-cols-3 gap-4">
              {vendors.map(v => (
                <div key={v.id} className="border p-4 rounded-xl shadow-sm bg-white"><p className="font-black text-lg uppercase">{v.name}</p><p className="font-mono text-gray-600 mt-1">📞 {v.phone}</p></div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: HARDWARE & STORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><Settings/> System & Hardware Settings</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Store & UPI Settings */}
              <div className="bg-gray-50 p-6 rounded-xl border space-y-4">
                <h3 className="font-black text-gray-700 flex items-center gap-2"><User size={18}/> Store Details</h3>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Store Name</label>
                  <input type="text" value={storeSettings.name} onChange={e=>setStoreSettings({...storeSettings, name: e.target.value})} className="w-full p-2 border rounded mt-1 font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Store Address</label>
                  <textarea value={storeSettings.address} onChange={e=>setStoreSettings({...storeSettings, address: e.target.value})} className="w-full p-2 border rounded mt-1" />
                </div>
                <div className="border-t pt-4">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><QrCode size={14}/> UPI ID (For Bill QR Code)</label>
                  <input type="text" placeholder="e.g. 9876543210@paytm" value={storeSettings.upiId} onChange={e=>setStoreSettings({...storeSettings, upiId: e.target.value})} className="w-full p-2 border border-blue-300 bg-blue-50 rounded mt-1 font-mono font-bold" />
                  <p className="text-[10px] text-gray-500 mt-1">Is UPI ID se bill par QR code generate hoga.</p>
                </div>
              </div>

              {/* Hardware Settings */}
              <div className="bg-gray-50 p-6 rounded-xl border space-y-6">
                <h3 className="font-black text-gray-700 flex items-center gap-2"><Bluetooth size={18}/> BT Hardware Settings</h3>
                
                <div className="bg-white p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-bold text-gray-700 flex items-center gap-2"><ScanBarcode size={16}/> BT Barcode Scanner</label>
                    <input type="checkbox" checked={storeSettings.enableScanner} onChange={e => setStoreSettings({...storeSettings, enableScanner: e.target.checked})} className="w-4 h-4 cursor-pointer" />
                  </div>
                  <p className="text-[10px] text-gray-500">Enable this to allow Bluetooth or USB Barcode scanners to auto-add items to the cart in the Billing tab.</p>
                </div>

                <div className="bg-white p-4 border rounded-lg">
                  <label className="font-bold text-gray-700 flex items-center gap-2 mb-2"><Printer size={16}/> BT Thermal Printer Mode</label>
                  <select value={storeSettings.printerType} onChange={e=>setStoreSettings({...storeSettings, printerType: e.target.value})} className="w-full p-2 border rounded text-sm font-bold bg-gray-50 cursor-pointer">
                    <option value="system">Standard BT/USB System Print (Recommended)</option>
                    <option value="escpos">Raw ESC/POS Web Bluetooth (Beta)</option>
                  </select>
                  <p className="text-[10px] text-gray-500 mt-2">Mobile me BT printer pair karein aur "Standard Print" use karein.</p>
                </div>

                <button onClick={()=>alert('Hardware & Store Settings Saved Successfully!')} className="w-full bg-green-600 text-white font-black py-3 rounded shadow hover:bg-green-500">Save All Settings</button>
              </div>
            </div>
          </div>
        )}

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
