'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDocs, getDoc
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Utensils, Trash2, Plus, Minus, Wifi, Image as ImageIcon,
  LayoutDashboard, UserCircle, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// --- ESC/POS USB Commands for 80mm ---
const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  RESET: ESC + '@',
  CENTER: ESC + 'a' + '\x01',
  LEFT: ESC + 'a' + '\x00',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DB_SIZE: GS + '!' + '\x11', // Double Height & Width
  NORMAL: GS + '!' + '\x00',
  CUT: GS + 'V' + '\x41' + '\x03', // Full Cut
};

export default function BumBumCafePC_POS() {
  // --- UI States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'orders'>('billing');
  const [printerPort, setPrinterPort] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // --- Data States ---
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Customer States ---
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Guest');

  // --- 1. USB Printer Connection ---
  const connectPrinter = async () => {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      setPrinterPort(port);
      toast.success("80mm USB Printer Connected!");
    } catch (e) {
      toast.error("Printer Connection Failed. Use Chrome/Edge.");
    }
  };

  // --- 2. Print KOT + Bill Logic ---
  const printProcess = async (order: any) => {
    if (!printerPort) return;
    const writer = printerPort.writable.getWriter();
    const encoder = new TextEncoder();

    try {
      let b = "";
      // PART 1: KOT
      b += CMD.RESET + CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "KITCHEN KOT\n" + CMD.NORMAL;
      b += `TOKEN: #${order.tokenNumber}\n` + CMD.LEFT + "------------------------------------------\n";
      order.items.forEach((it: any) => {
        b += `${it.quantity} x ${it.name}\n`;
      });
      b += "------------------------------------------\n\n\n\n"; // Space before Bill

      // PART 2: BILL
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "BUM BUM CAFE\n" + CMD.NORMAL;
      b += "The Taste of Happiness\nMohandra Main Road\n";
      b += "------------------------------------------\n" + CMD.LEFT;
      b += `BILL: #${order.billNumber} | TK: #${order.tokenNumber}\n`;
      b += `DATE: ${new Date().toLocaleString()}\n`;
      b += "------------------------------------------\n";
      b += "ITEM NAME            QTY    PRICE    TOTAL\n";
      b += "------------------------------------------\n";
      order.items.forEach((it: any) => {
        const name = it.name.substring(0, 18).padEnd(20);
        b += `${name} ${it.quantity.toString().padEnd(6)} ${it.price.toString().padEnd(8)} ${it.price * it.quantity}\n`;
      });
      b += "------------------------------------------\n";
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + `TOTAL: Rs. ${order.total}\n` + CMD.NORMAL;
      b += "\nThank You! Visit Again\n\n\n\n";
      b += CMD.CUT; // Paper Cut

      await writer.write(encoder.encode(b));
    } catch (e) {
      toast.error("Printing Error!");
    } finally {
      writer.releaseLock();
    }
  };

  // --- 3. Place Order Logic ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Processing Order...");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await runTransaction(db, async (txn) => {
        const bRef = doc(db, "settings", "bill_counter");
        const tRef = doc(db, "settings", `token_${today}`);
        const bSnap = await txn.get(bRef);
        const tSnap = await txn.get(tRef);
        const nb = bSnap.exists() ? (bSnap.data().value + 1) : 1001;
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
        timestamp: new Date(),
        customerName,
        customerPhone
      };

      await addDoc(collection(db, "orders"), orderData);
      toast.success(`Order Saved! Bill #${res.nb}`, { id: toastId });

      if (printerPort) {
        await printProcess(orderData);
      } else {
        toast("Printer not connected, order saved.", { icon: '⚠️' });
      }

      setCart([]); setCustomerPhone(''); setCustomerName('Walk-in Guest');
    } catch (err) {
      toast.error("Failed to save order!", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]);
    });
    const oq = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(20));
    return onSnapshot(oq, (snap) => setLiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  if (!isLoggedIn) return (
    <div className="h-screen bg-black flex items-center justify-center font-sans">
      <div className="bg-neutral-900 p-10 rounded-[2.5rem] border border-neutral-800 w-96 text-center shadow-2xl">
        <Utensils className="mx-auto text-orange-500 mb-6" size={50} />
        <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-8">Bum Bum POS</h1>
        <input 
          type="password" placeholder="ENTER PIN" autoFocus
          className="w-full bg-black border border-neutral-700 rounded-2xl py-5 text-center text-3xl mb-6 outline-none focus:border-orange-500 text-white tracking-[0.5em]"
          onChange={(e) => e.target.value === '1234' && setIsLoggedIn(true)}
        />
        <p className="text-neutral-500 text-xs">Default PIN: 1234</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden font-sans">
      <Toaster position="top-right" />
      
      {/* LEFT NAVIGATION */}
      <nav className="w-24 border-r border-neutral-900 flex flex-col items-center py-8 gap-8">
        <div className="p-3 bg-orange-600 rounded-2xl"><Utensils size={28} /></div>
        <button onClick={() => setActiveTab('billing')} className={`p-4 rounded-2xl ${activeTab === 'billing' ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500'}`}><LayoutDashboard size={28}/></button>
        <button onClick={() => setActiveTab('orders')} className={`p-4 rounded-2xl ${activeTab === 'orders' ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500'}`}><Clock size={28}/></button>
        <button onClick={connectPrinter} className={`mt-auto p-4 rounded-2xl ${printerPort ? 'bg-green-600' : 'bg-neutral-900 text-neutral-500'}`}><Wifi size={28}/></button>
        <button onClick={() => setIsLoggedIn(false)} className="p-4 text-red-500"><LogOut size={28}/></button>
      </nav>

      {/* MIDDLE MENU AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'billing' ? (
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            <header className="flex justify-between items-center mb-8 gap-4">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-5 top-4 text-neutral-500" />
                <input 
                  type="text" placeholder="Search menu..." 
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-orange-500 transition-all text-lg"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(c => (
                  <button 
                    key={c} onClick={() => setSelectedCategory(c)}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${selectedCategory === c ? 'bg-orange-600' : 'bg-neutral-900 text-neutral-500'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pr-4">
              {products
                .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                <button 
                  key={p.id} 
                  onClick={() => {
                    const ex = cart.find(i => i.id === p.id);
                    if (ex) setCart(cart.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i));
                    else setCart([...cart, { ...p, quantity: 1 }]);
                  }}
                  className="bg-neutral-900/50 border border-neutral-800 rounded-[2rem] p-4 text-left hover:border-orange-500 transition-all active:scale-95 group"
                >
                  <div className="h-40 bg-neutral-800 rounded-2xl mb-4 overflow-hidden relative">
                    {(p.imageUrl || p.image) ? (
                      <img src={p.imageUrl || p.image} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-neutral-700" size={32} /></div>
                    )}
                  </div>
                  <h3 className="font-bold text-base truncate">{p.name}</h3>
                  <p className="text-orange-500 font-black text-xl mt-1">₹{p.price}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 grid grid-cols-3 gap-6 overflow-y-auto">
            {liveOrders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="bg-orange-600 px-3 py-1 rounded-lg font-black text-sm">TK: #{order.tokenNumber}</span>
                  <span className="text-neutral-500 font-mono text-xs">{new Date(order.timestamp?.toDate()).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-2 border-y border-neutral-800 py-4">
                  {order.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-neutral-300">{it.name}</span>
                      <span className="font-black">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, "orders", order.id), { status: 'completed' })}
                  className="w-full bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white py-4 rounded-2xl font-black uppercase transition-all"
                >Mark as Ready</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - CART */}
      <aside className="w-[420px] bg-neutral-900/50 border-l border-neutral-900 flex flex-col p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><ShoppingBag className="text-orange-500" /> Cart</h2>
          <button onClick={() => setCart([])} className="text-neutral-500 hover:text-red-500 transition-all"><Trash2 size={22}/></button>
        </div>

        <div className="bg-black/40 border border-neutral-800 rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <UserCircle className="text-neutral-500" size={20} />
            <input 
              placeholder="Customer Phone" 
              className="bg-transparent outline-none flex-1 text-sm font-mono"
              value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-700 opacity-20">
              <ShoppingBag size={80} strokeWidth={1} />
              <p className="font-black mt-4">EMPTY CART</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="bg-black/40 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="font-bold text-sm truncate">{item.name}</p>
                <p className="text-orange-500 font-black mt-1">₹{item.price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-3 bg-neutral-900 p-1 rounded-xl">
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-2 hover:bg-neutral-800 rounded-lg"><Minus size={14}/></button>
                <span className="font-black text-sm w-4 text-center">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-2 hover:bg-neutral-800 rounded-lg"><Plus size={14}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-neutral-800 space-y-6">
          <div className="flex justify-between items-end">
            <span className="text-neutral-500 font-bold uppercase text-xs tracking-widest">Total Bill</span>
            <span className="text-4xl font-black text-white font-mono">₹{cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</span>
          </div>
          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-600 hover:bg-orange-500 py-6 rounded-3xl font-black text-xl uppercase flex items-center justify-center gap-4 shadow-xl shadow-orange-600/20 disabled:opacity-50 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin"/> : <Printer size={28}/>}
            Print KOT & Bill
          </button>
        </div>
      </aside>
    </div>
  );
}
