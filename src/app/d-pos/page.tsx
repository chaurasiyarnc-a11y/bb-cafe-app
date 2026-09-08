'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDocs
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Utensils, Trash2, Plus, Minus, Wifi, Image as ImageIcon,
  LayoutDashboard, UserCircle, AlertCircle
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
  CUT: GS + 'V' + '\x41' + '\x03', // Auto Cut
};

export default function BumBumCafe_PC_Final() {
  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'orders'>('billing');
  const [printerPort, setPrinterPort] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Guest');

  // --- 1. Printer Connection Logic ---
  const connectPrinter = async () => {
    if (!("serial" in navigator)) {
      alert("आपका ब्राउज़र डायरेक्ट प्रिंटिंग सपोर्ट नहीं करता। कृपया Google Chrome का उपयोग करें।");
      return;
    }
    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      setPrinterPort(port);
      toast.success("80mm USB Printer Connected!");
    } catch (e) {
      console.error(e);
      toast.error("प्रिंटर नहीं मिला! ड्राइवर चेक करें।");
    }
  };

  // --- 2. Professional Print Engine (KOT + Bill) ---
  const executePrint = async (order: any) => {
    if (!printerPort) return;
    
    const writer = printerPort.writable.getWriter();
    const encoder = new TextEncoder();

    try {
      let b = CMD.RESET;

      // --- SECTION 1: KITCHEN KOT ---
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "KITCHEN KOT\n" + CMD.NORMAL;
      b += `TOKEN NO: #${order.tokenNumber}\n` + CMD.LEFT;
      b += "------------------------------------------\n";
      b += `Date: ${new Date().toLocaleTimeString()} | Dine-In\n`;
      b += "------------------------------------------\n";
      b += CMD.BOLD_ON + "QTY   ITEM NAME\n" + CMD.BOLD_OFF;
      order.items.forEach((it: any) => {
        b += `${it.quantity.toString().padEnd(5)} ${it.name}\n`;
      });
      b += "------------------------------------------\n\n\n\n"; // Space between KOT & Bill

      // --- SECTION 2: CUSTOMER BILL ---
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "BUM BUM CAFE\n" + CMD.NORMAL;
      b += "THE TASTE OF HAPPINESS\n";
      b += "Mohandra Main Road, MP\n";
      b += "------------------------------------------\n" + CMD.LEFT;
      b += `BILL NO: #${order.billNumber} | TOKEN: #${order.tokenNumber}\n`;
      b += `DATE   : ${new Date().toLocaleString()}\n`;
      b += "------------------------------------------\n";
      b += "ITEM NAME            QTY    PRICE    TOTAL\n";
      b += "------------------------------------------\n";
      order.items.forEach((it: any) => {
        const name = it.name.substring(0, 18).padEnd(20);
        const qty = it.quantity.toString().padEnd(6);
        const price = it.price.toString().padEnd(8);
        const total = (it.price * it.quantity).toString();
        b += `${name} ${qty} ${price} ${total}\n`;
      });
      b += "------------------------------------------\n";
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + `GRAND TOTAL: Rs. ${order.total}\n` + CMD.NORMAL;
      b += "\n      Thank You! Visit Again\n\n\n\n\n";
      b += CMD.CUT; // Paper Cut

      await writer.write(encoder.encode(b));
      toast.success("KOT & Bill Printed!");
    } catch (e) {
      toast.error("Printing Failed!");
    } finally {
      writer.releaseLock();
    }
  };

  // --- 3. Order Processing ---
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

        const nb = bSnap.exists() ? (bSnap.data().value + 1) : 10001;
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
        customerPhone,
        customerName
      };

      await addDoc(collection(db, "orders"), orderData);
      
      if (printerPort) {
        await executePrint(orderData);
      } else {
        toast("Order Saved, but Printer was not connected.", { icon: '⚠️' });
      }

      setCart([]); setCustomerPhone(''); setCustomerName('Walk-in Guest');
      toast.success("Order Successful!", { id: toastId });
    } catch (err) {
      toast.error("Transaction Failed!", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 4. Load Data ---
  useEffect(() => {
    onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]);
    });
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(15));
    return onSnapshot(q, (snap) => setLiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  if (!isLoggedIn) return (
    <div className="h-screen bg-black flex items-center justify-center font-sans">
      <div className="bg-neutral-900 p-12 rounded-[3rem] border border-neutral-800 w-96 text-center shadow-2xl">
        <Utensils className="mx-auto text-orange-500 mb-6" size={60} />
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-8">Bum Bum POS</h1>
        <input 
          type="password" placeholder="ENTER PIN" autoFocus
          className="w-full bg-black border border-neutral-700 rounded-3xl py-5 text-center text-3xl mb-8 outline-none focus:border-orange-500 text-white tracking-[0.3em]"
          onChange={(e) => e.target.value === '1234' && setIsLoggedIn(true)}
        />
        <p className="text-neutral-600 text-xs font-bold uppercase tracking-widest">Desktop Terminal v3.0</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden font-sans select-none">
      <Toaster position="top-right" />
      
      {/* 1. LEFT SIDEBAR */}
      <nav className="w-24 border-r border-neutral-900 flex flex-col items-center py-8 gap-10">
        <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-600/20"><Utensils size={30} /></div>
        <div className="flex flex-col gap-6">
          <button onClick={() => setActiveTab('billing')} className={`p-4 rounded-2xl transition-all ${activeTab === 'billing' ? 'bg-neutral-800 text-orange-500 shadow-xl' : 'text-neutral-600 hover:text-white'}`}><LayoutDashboard size={28}/></button>
          <button onClick={() => setActiveTab('orders')} className={`p-4 rounded-2xl transition-all ${activeTab === 'orders' ? 'bg-neutral-800 text-orange-500 shadow-xl' : 'text-neutral-600 hover:text-white'}`}><Clock size={28}/></button>
        </div>
        <div className="mt-auto flex flex-col gap-4">
          <button onClick={connectPrinter} className={`p-4 rounded-2xl transition-all ${printerPort ? 'bg-green-600 text-white' : 'bg-neutral-900 text-neutral-600'}`}><Wifi size={28}/></button>
          <button onClick={() => setIsLoggedIn(false)} className="p-4 text-red-500 hover:bg-red-500/10 rounded-2xl"><LogOut size={28}/></button>
        </div>
      </nav>

      {/* 2. MIDDLE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/20">
        {activeTab === 'billing' ? (
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            <header className="flex justify-between items-center mb-8 gap-6">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-6 top-5 text-neutral-500" />
                <input 
                  type="text" placeholder="Search menu items..." 
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-3xl py-5 pl-16 pr-8 outline-none focus:border-orange-500 text-lg transition-all"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(c => (
                  <button key={c} onClick={() => setSelectedCategory(c)} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase whitespace-nowrap transition-all ${selectedCategory === c ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-500 hover:text-white'}`}>{c}</button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pr-4 scrollbar-hide">
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
                  className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-5 text-left hover:border-orange-500 transition-all active:scale-95 group shadow-lg"
                >
                  <div className="h-44 bg-neutral-800 rounded-3xl mb-4 overflow-hidden relative">
                    {(p.imageUrl || p.image) ? (
                      <img src={p.imageUrl || p.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-neutral-800" size={48} /></div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-2 truncate px-1">{p.name}</h3>
                  <p className="text-orange-500 font-black text-2xl px-1">₹{p.price}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 overflow-y-auto">
            {liveOrders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-600"></div>
                <div className="flex justify-between items-center">
                  <span className="bg-orange-600 px-5 py-2 rounded-xl font-black text-sm uppercase">Token: #{order.tokenNumber}</span>
                  <span className="text-neutral-500 font-mono text-sm">{new Date(order.timestamp?.toDate()).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-3 border-y border-neutral-800/50 py-6">
                  {order.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-lg">
                      <span className="text-neutral-300 font-medium">{it.name}</span>
                      <span className="font-black text-orange-500">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, "orders", order.id), { status: 'completed' })}
                  className="w-full bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white py-5 rounded-[1.5rem] font-black uppercase text-sm tracking-widest transition-all"
                >Mark as Prepared</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. RIGHT CART SIDEBAR */}
      <aside className="w-[480px] bg-neutral-900 border-l border-neutral-900 flex flex-col p-10 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4"><ShoppingBag className="text-orange-500" size={32} /> CART</h2>
          <button onClick={() => setCart([])} className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={24}/></button>
        </div>

        {/* Customer Input */}
        <div className="bg-black/40 border border-neutral-800 rounded-3xl p-6 mb-8 flex items-center gap-4">
          <UserCircle className="text-neutral-600" size={28} />
          <input 
            placeholder="Customer Phone (Optional)" 
            className="bg-transparent outline-none flex-1 text-lg font-mono placeholder:text-neutral-700"
            value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
          />
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-800 space-y-6">
              <ShoppingBag size={100} strokeWidth={1} />
              <p className="font-black uppercase tracking-[0.2em] text-sm">Cart is Empty</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="bg-black/40 border border-neutral-800 p-6 rounded-[2rem] flex items-center justify-between group">
              <div className="flex-1 pr-4">
                <p className="font-bold text-lg leading-tight text-neutral-200">{item.name}</p>
                <p className="text-orange-500 font-black text-xl mt-1">₹{item.price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-5 bg-neutral-900 p-2 rounded-2xl">
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-3 hover:bg-neutral-800 rounded-xl transition-all"><Minus size={18}/></button>
                <span className="font-black text-xl w-6 text-center">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-3 hover:bg-neutral-800 rounded-xl transition-all"><Plus size={18}/></button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer & Totals */}
        <div className="mt-auto pt-8 border-t border-neutral-800 space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-neutral-600 font-black uppercase text-xs tracking-widest block mb-1">Payable Amount</span>
              <span className="text-5xl font-black text-white font-mono tracking-tighter">₹{cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</span>
            </div>
            {printerPort === null && (
              <div className="flex items-center gap-2 text-yellow-600 text-xs font-bold bg-yellow-600/10 px-3 py-1.5 rounded-lg">
                <AlertCircle size={14}/> Printer Offline
              </div>
            )}
          </div>
          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-600 hover:bg-orange-500 py-7 rounded-[2.5rem] font-black text-2xl uppercase flex items-center justify-center gap-4 shadow-2xl shadow-orange-600/30 disabled:opacity-50 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin"/> : <Printer size={32}/>}
            Print & Place Order
          </button>
        </div>
      </aside>
    </div>
  );
}
