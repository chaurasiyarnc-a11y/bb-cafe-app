'use client';
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Printer, Search, Trash2, User, Phone, Tag, Shirt, ScanBarcode, Menu, Users, Truck, PackagePlus, Settings, X } from 'lucide-react';

// Default Data
const INITIAL_INVENTORY = [
  { id: '101', barcode: '123456789012', name: 'Nike Running Shoes', category: 'Sports', size: 'UK 8', price: 1500, stock: 10, vendor: 'Nike India' },
  { id: '102', barcode: '890123456789', name: 'Adidas Trackpant', category: 'Clothing', size: 'L', color: 'Black', price: 800, stock: 5, vendor: 'Delhi Traders' },
];

export default function RetailPos() {
  // --- SYSTEM STATES ---
  const [activeTab, setActiveTab] = useState('billing');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [storeSettings, setStoreSettings] = useState({ name: 'MY CLOTHING & SPORTS', phone: '9876543210', address: 'Main Market, Your City' });

  // --- DATABASE STATES (Aage chal kar inhe Firebase/DB se connect karein) ---
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

  // --- BARCODE SCANNER LOGIC (Sirf Billing Tab mein chalega) ---
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'billing') return; // Agar billing tab nahi hai toh scanner band rakho
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
  }, [activeTab, inventory]);

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

  // BILLING CALCULATIONS
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const dVal = Number(discountValue) || 0;
  const discountAmount = discountType === 'flat' ? Math.min(dVal, subtotal) : (subtotal * dVal) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // CHECKOUT & PRINT LOGIC
  const handleCheckout = () => {
    if (cart.length === 0) return alert('Cart khali hai!');

    // 1. Stock kam karna
    let newInventory = [...inventory];
    cart.forEach(cItem => {
      const idx = newInventory.findIndex(i => i.id === cItem.id);
      if (idx > -1) { newInventory[idx].stock -= cItem.qty; }
    });
    setInventory(newInventory);

    // 2. Customer History save karna
    if (customerPhone) {
      setCustomers(prev => {
        const existing = prev.find(c => c.phone === customerPhone);
        if (existing) {
          return prev.map(c => c.phone === customerPhone ? { ...c, totalSpent: c.totalSpent + grandTotal, lastVisit: new Date().toLocaleDateString() } : c);
        }
        return [...prev, { name: customerName || 'Guest', phone: customerPhone, totalSpent: grandTotal, lastVisit: new Date().toLocaleDateString() }];
      });
    }

    // 3. Print Window
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
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { text-align: left; padding: 4px 0; border-bottom: 1px dashed black; }
            th:last-child, td:last-child { text-align: right; }
            .grand-total { font-size: 16px; border-top: 2px solid black; border-bottom: 2px solid black; padding: 5px 0; font-weight: bold; margin-top:10px; display:flex; justify-content:space-between; }
          </style>
        </head>
        <body>
          <h2>${storeSettings.name}</h2>
          <p>${storeSettings.address}</p>
          <p>Mob: ${storeSettings.phone}</p>
          <p>---------------------------------</p>
          ${customerPhone ? `<p style="text-align:left;">Cust: ${customerName} (${customerPhone})</p>` : ''}
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
          <div style="margin-top:5px; text-align:right; font-size:12px; font-weight:bold;">
            Subtotal: Rs. ${subtotal} <br>
            ${discountAmount > 0 ? `Discount: - Rs. ${discountAmount.toFixed(2)}` : ''}
          </div>
          <div class="grand-total"><span>TOTAL:</span> <span>Rs. ${grandTotal.toFixed(2)}</span></div>
          <p style="margin-top: 20px;">No Exchange without Bill.</p>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus(); printWindow.print(); printWindow.close();
      setCart([]); setCustomerName(''); setCustomerPhone(''); setDiscountValue('');
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900 overflow-hidden">
      
      {/* SIDEBAR (Hidable) */}
      <div className={`bg-gray-900 text-white flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {isSidebarOpen && <span className="font-black text-lg tracking-widest text-blue-400">ERP POS</span>}
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

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex h-full">
        
        {/* TAB 1: BILLING */}
        {activeTab === 'billing' && (
          <>
            <div className="w-[60%] p-6 flex flex-col h-full bg-gray-50 border-r">
              <h1 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2"><Shirt className="text-blue-600"/> Checkout Counter</h1>
              <div className="relative mb-6">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input type="text" placeholder="Search Item Name manually..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 shadow-sm outline-none focus:border-blue-500 font-bold" />
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
            <div className="w-[40%] bg-white flex flex-col h-full shadow-xl">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center shrink-0">
                <h2 className="font-black text-lg flex items-center gap-2 text-gray-800"><ShoppingBag className="text-orange-500"/> Cart</h2>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-green-600 bg-green-100 px-2 py-1 rounded-full"><ScanBarcode size={14} /> Scanner Active</span>
              </div>
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center font-bold text-gray-400 mt-10">Cart is empty. Scan barcode.</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border bg-gray-50 p-3 rounded-xl shadow-sm">
                      <div>
                        <p className="font-bold text-sm text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{item.size && `Size: ${item.size}`} | ₹{item.price} <span className="text-orange-500 font-bold">x {item.qty}</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-green-600 text-base">₹{item.price * item.qty}</span>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 bg-red-100 p-1.5 rounded"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="bg-white border-t p-5 shrink-0">
                <div className="flex justify-between items-center mb-4 bg-gray-50 p-2 rounded-lg border">
                  <span className="text-sm font-bold text-gray-700">Discount:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-200 p-1 rounded-md">
                      <button onClick={() => setDiscountType('flat')} className={`px-2 py-1 rounded text-[10px] font-black uppercase ${discountType === 'flat' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}>₹ Flat</button>
                      <button onClick={() => setDiscountType('percent')} className={`px-2 py-1 rounded text-[10px] font-black uppercase ${discountType === 'percent' ? 'bg-orange-500 text-white shadow' : 'text-gray-500'}`}>% Off</button>
                    </div>
                    <input type="number" min="0" placeholder="Value" value={discountValue} onChange={e => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 bg-white border rounded px-2 py-1 outline-none font-bold text-sm focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex justify-between text-2xl font-black text-green-600 mb-4 border-t pt-2">
                  <span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                  <Printer /> Checkout & Print
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
              <form className="grid grid-cols-4 gap-4" onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const newItem = {
                  id: Date.now().toString(),
                  barcode: fd.get('barcode') || Math.floor(Math.random()*1000000000000).toString(),
                  name: fd.get('name'), category: fd.get('category'), size: fd.get('size'), color: fd.get('color'),
                  price: Number(fd.get('price')), stock: Number(fd.get('stock')), vendor: fd.get('vendor')
                };
                setInventory([newItem, ...inventory]);
                e.currentTarget.reset();
                alert('Item Added Successfully!');
              }}>
                <input required name="name" type="text" placeholder="Item Name *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold" />
                <input required name="barcode" type="text" placeholder="Barcode (Scan here) *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold" />
                <input name="size" type="text" placeholder="Size (S/M/L/UK8)" className="border p-2 rounded outline-none focus:border-blue-500" />
                <input name="color" type="text" placeholder="Color" className="border p-2 rounded outline-none focus:border-blue-500" />
                <input required name="price" type="number" placeholder="Price (₹) *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold" />
                <input required name="stock" type="number" placeholder="Total Stock Qty *" className="border p-2 rounded outline-none focus:border-blue-500 font-bold" />
                <select name="vendor" className="border p-2 rounded outline-none bg-white">
                  <option value="">Select Vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                </select>
                <button type="submit" className="bg-green-600 text-white font-black rounded hover:bg-green-500">Save Item</button>
              </form>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-gray-800 text-white"><th className="p-3">Barcode</th><th className="p-3">Name</th><th className="p-3">Size/Color</th><th className="p-3">Vendor</th><th className="p-3">Price</th><th className="p-3">Stock</th></tr></thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-sm">{item.barcode}</td>
                    <td className="p-3 font-bold">{item.name}</td>
                    <td className="p-3 text-xs">{item.size} {item.color}</td>
                    <td className="p-3 text-xs text-gray-500">{item.vendor || '-'}</td>
                    <td className="p-3 font-bold text-green-600">₹{item.price}</td>
                    <td className={`p-3 font-black ${item.stock < 5 ? 'text-red-500' : 'text-gray-800'}`}>{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><Users/> Customer Profiles</h2>
            {customers.length === 0 ? (
              <p className="text-gray-500">Koi customer save nahi hua abhi. Billing ke waqt number daalein.</p>
            ) : (
              <table className="w-full text-left border-collapse border">
                <thead><tr className="bg-gray-100"><th className="p-3">Name</th><th className="p-3">Phone</th><th className="p-3">Total Spent (₹)</th><th className="p-3">Last Visit</th></tr></thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-bold">{c.name}</td><td className="p-3 font-mono">{c.phone}</td>
                      <td className="p-3 font-black text-green-600">₹{c.totalSpent}</td><td className="p-3 text-gray-500">{c.lastVisit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 4: VENDORS */}
        {activeTab === 'vendors' && (
          <div className="p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><Truck/> Vendor & Supplier Details</h2>
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6 flex gap-4">
              <input type="text" id="vName" placeholder="Vendor Name" className="flex-1 p-2 border rounded" />
              <input type="text" id="vPhone" placeholder="Phone No." className="flex-1 p-2 border rounded" />
              <button onClick={()=>{
                const n = (document.getElementById('vName') as HTMLInputElement).value;
                const p = (document.getElementById('vPhone') as HTMLInputElement).value;
                if(n) { setVendors([...vendors, {id: Date.now().toString(), name:n, phone:p, supplied:'Miscellaneous'}]); alert('Vendor Added'); }
              }} className="bg-blue-600 text-white px-6 font-bold rounded">Add Vendor</button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {vendors.map(v => (
                <div key={v.id} className="border p-4 rounded-xl shadow-sm bg-white">
                  <p className="font-black text-lg uppercase">{v.name}</p>
                  <p className="font-mono text-gray-600 mt-1">📞 {v.phone}</p>
                  <p className="text-xs text-gray-400 mt-2">Provides: {v.supplied}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-8 w-full h-full overflow-y-auto bg-white">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2"><Settings/> Store Settings</h2>
            <div className="max-w-md bg-gray-50 p-6 rounded-xl border space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Store Name (Receipt Title)</label>
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
              <button onClick={()=>alert('Settings Saved! Thermal Print pe yahi details ayengi.')} className="w-full bg-green-600 text-white font-black py-3 rounded">Save Settings</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Sidebar Button Component
function SidebarBtn({ icon, label, isActive, onClick, open }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isActive ? 'bg-blue-600 text-white border-l-4 border-blue-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'}`}>
      {icon} {open && <span className="font-bold text-sm tracking-wide">{label}</span>}
    </button>
  );
}
