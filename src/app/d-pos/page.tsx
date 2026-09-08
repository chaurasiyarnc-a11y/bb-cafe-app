'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDocs 
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, Loader2, Clock, Printer, Utensils, 
  Trash2, Plus, Minus, Wifi, Image as ImageIcon, LayoutDashboard, LogOut 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- ESC/POS Commands for 80mm ---
const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  RESET: ESC + '@',
  CENTER: ESC + 'a' + '\x01',
  LEFT: ESC + 'a' + '\x00',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DB_SIZE: GS + '!' + '\x11', 
  NORMAL: GS + '!' + '\x00',
  CUT: GS + 'V' + '\x41' + '\x03',
};

export default function BumBumCafe_Fixed_POS() {
  // --- UI States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'orders'>('billing');
  const [usbDevice, setUsbDevice] = useState<any>(null);
  
  // --- Data States ---
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All'); // Fixed missing state
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- 1. WebUSB Connection ---
  const connectUSBPrinter = async () => {
    if (!("usb" in navigator)) {
      toast.error("WebUSB is not supported in this browser. Use Chrome.");
      return;
    }
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      await device.claimInterface(device.configuration.interfaces[0].interfaceNumber);
      
      setUsbDevice(device);
      toast.success("USB Printer Ready!");
    } catch (e) {
      console.error(e);
      toast.error("Printer connection failed.");
    }
  };

  // --- 2. Print Logic ---
  const executePrint = async (order: any) => {
    if (!usbDevice) return;
    const encoder = new TextEncoder();
    try {
      let b = CMD.RESET;
      // KOT Section
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "KITCHEN KOT\n" + CMD.NORMAL;
      b += `TOKEN: #${order.tokenNumber}\n` + CMD.LEFT + "------------------------------------------\n";
      order.items.forEach((it: any) => { b += `${it.quantity} x ${it.name}\n`; });
      b += "------------------------------------------\n\n\n\n";

      // BILL Section
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "BUM BUM CAFE\n" + CMD.NORMAL;
      b += "------------------------------------------\n" + CMD.LEFT;
      b += `BILL: #${order.billNumber} | TK: #${order.tokenNumber}\n`;
      b += `DATE: ${new Date().toLocaleString()}\n------------------------------------------\n`;
      order.items.forEach((it: any) => {
        const name = it.name.substring(0, 18).padEnd(20);
        b += `${name} ${it.quantity} x ${it.price} = ${it.price * it.quantity}\n`;
      });
      b += "------------------------------------------\n" + CMD.CENTER + CMD.BOLD_ON;
      b += `TOTAL: Rs. ${order.total}\n` + CMD.NORMAL + "\nThank You! Visit Again\n\n\n\n" + CMD.CUT;

      const data = encoder.encode(b);
      await usbDevice.transferOut(1, data); 
    } catch (e) {
      toast.error("Printing failed.");
    }
  };

  // --- 3. Order Logic ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await runTransaction(db, async (txn) => {
        const bRef = doc(db, "settings", "bill_counter");
        const tRef = doc(db, "settings", `token_${today}`);
        const bSnap = await txn.get(bRef);
        const tSnap = await txn.get(tRef);
        const nb = bSnap.exists() ? (bSnap.data().value + 1) : 3001;
        const nt = tSnap.exists() ? (tSnap.data().value + 1) : 1;
        txn.set(bRef, { value: nb }, { merge: true });
        txn.set(tRef, { value: nt }, { merge: true });
        return { nb, nt };
      });

      const orderData = {
        billNumber: res.nb,
        tokenNumber: String(res.nt).padStart(2, '0'),
        items: cart,
        total: cart.reduce((a, b) => a + (b.price * b.quantity), 0),
        status: 'pending',
        timestamp: new Date()
      };

      await addDoc(collection(db, "orders"), orderData);
      if (usbDevice) await executePrint(orderData);
      
      setCart([]);
      toast.success("Order Placed!");
    } catch (e) {
      toast.error("Failed to save order");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]);
    });
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(10));
    return onSnapshot(q, (snap) => setLiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  if (!isLoggedIn) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="bg-neutral-900 p-10 rounded-[2.5rem] border border-neutral-800 w-96 text-center shadow-2xl">
        <Utensils className="mx-auto text-orange-500 mb-6" size={50} />
        <input 
          type="password" placeholder="PIN (1234)" className="w-full bg-black border border-neutral-700 rounded-2xl py-4 text-center text-2xl mb-6 text-white outline-none focus:border-orange-500"
          onChange={(e) => e.target.value === '1234' && setIsLoggedIn(true)}
        />
        <p className="text-neutral-500 text-xs">Bum Bum POS Professional</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Sidebar Nav */}
      <nav className="w-24 border-r border-neutral-900 flex flex-col items-center py-8 gap-8">
        <Utensils className="text-orange-600" size={32} />
        <button onClick={() => setActiveTab('billing')} className={`p-4 rounded-2xl ${activeTab === 'billing' ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500'}`}><LayoutDashboard/></button>
        <button onClick={() => setActiveTab('orders')} className={`p-4 rounded-2xl ${activeTab === 'orders' ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500'}`}><Clock/></button>
        <button onClick={connectUSBPrinter} className={`mt-auto p-4 rounded-2xl ${usbDevice ? 'bg-green-600 text-white' : 'bg-neutral-900 text-neutral-500'}`}><Wifi/></button>
        <button onClick={() => setIsLoggedIn(false)} className="p-4 text-red-500"><LogOut/></button>
      </nav>

      {/* Main Grid */}
      <main className="flex-1 flex flex-col overflow-hidden p-8">
        {activeTab === 'billing' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-8 gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-3 text-neutral-500" size={18} />
                <input 
                  type="text" placeholder="Search food..." 
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-3 pl-12 text-sm outline-none focus:border-orange-500"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {categories.map(c => (
                  <button key={c} onClick={() => setSelectedCategory(c)} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase ${selectedCategory === c ? 'bg-orange-600' : 'bg-neutral-900'}`}>{c}</button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-4 xl:grid-cols-5 gap-6 overflow-y-auto pr-2">
              {products
                .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                <button key={p.id} onClick={() => setCart([...cart, {...p, quantity: 1}])} className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-4 text-left hover:border-orange-500 transition-all">
                  <div className="h-32 bg-neutral-800 rounded-2xl mb-4 overflow-hidden">
                    {(p.imageUrl || p.image) && <img src={p.imageUrl || p.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <h3 className="font-bold text-sm truncate">{p.name}</h3>
                  <p className="text-orange-500 font-black">₹{p.price}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6 overflow-y-auto">
            {liveOrders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="bg-neutral-900 p-6 rounded-[2rem] border border-neutral-800">
                <div className="flex justify-between mb-4"><span className="bg-orange-600 px-3 py-1 rounded-lg text-[10px] font-black">TK: #{order.tokenNumber}</span></div>
                <div className="space-y-2 mb-6 h-32 overflow-y-auto">
                  {order.items.map((it: any, i: number) => <div key={i} className="flex justify-between text-sm"><span>{it.name}</span><span>x{it.quantity}</span></div>)}
                </div>
                <button onClick={() => updateDoc(doc(db, "orders", order.id), { status: 'completed' })} className="w-full bg-green-600 py-3 rounded-xl font-bold uppercase text-xs">Mark Ready</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      <aside className="w-[420px] bg-neutral-900/40 border-l border-neutral-900 flex flex-col p-8">
        <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><ShoppingBag className="text-orange-500" /> ORDER</h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          {cart.map((item, idx) => (
            <div key={idx} className="bg-black/40 p-4 rounded-2xl flex justify-between items-center border border-neutral-800">
              <div className="flex-1 pr-2">
                <p className="font-bold text-sm truncate">{item.name}</p>
                <p className="text-orange-500 font-black">₹{item.price}</p>
              </div>
              <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-neutral-500 hover:text-red-500"><Trash2 size={18}/></button>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-8 border-t border-neutral-800">
          <div className="flex justify-between text-4xl font-black mb-8"><span>Total</span><span className="text-orange-500">₹{cart.reduce((a, b) => a + b.price, 0)}</span></div>
          <button 
            disabled={cart.length === 0 || isSubmitting} 
            onClick={handlePlaceOrder} 
            className="w-full bg-orange-600 py-6 rounded-[2rem] font-black text-xl uppercase flex items-center justify-center gap-4 shadow-xl shadow-orange-600/20 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Printer size={28} />} PRINT & SAVE
          </button>
        </div>
      </aside>
    </div>
  );
}
