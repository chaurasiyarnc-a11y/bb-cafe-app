'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc,
  waitForPendingWrites, Timestamp
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  Database, RefreshCw, Layers, Menu, LogOut, Lock, 
  Sun, Moon, Tag, Calculator, TrendingUp, Utensils, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import CustomizerModal from '@/components/pos/CustomizerModal';
import { handlePrintKot, handlePrintReceipt, PrintConfig } from '@/lib/printerUtils';

export default function BbCafePosDesktop() {
  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState('billing');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Billing States
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [fulfillmentType, setFulfillmentType] = useState('table');
  const [tableNumber, setTableNumber] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [address, setAddress] = useState('');

  // Stats
  const [todayStats, setTodayStats] = useState({ total: 0, count: 0 });

  // --- Load Data & Listeners ---
  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); }

    // 1. Products Listener
    const unsubProd = onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      const uniqueCats = ['All', ...new Set(items.map((i: any) => i.category).filter(Boolean))] as string[];
      setCategories(uniqueCats);
    });

    // 2. Today's Sales Listener (Daily Change)
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    const qStats = query(collection(db, "orders"), where("timestamp", ">=", start), where("timestamp", "<=", end));
    
    const unsubStats = onSnapshot(qStats, (snap) => {
      let total = 0;
      snap.docs.forEach(d => { if(d.data().status === 'completed') total += (d.data().total || 0); });
      setTodayStats({ total, count: snap.size });
    });

    return () => { unsubProd(); unsubStats(); };
  }, [isLoggedIn]);

  // --- Handlers ---
  const handleLogin = async (e: any) => {
    e.preventDefault();
    const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput)));
    if (!snap.empty) {
      const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setIsLoggedIn(true); setCurrentUser(u);
      localStorage.setItem("bb_pos_user", JSON.stringify(u));
    } else { toast.error("Invalid PIN"); }
    setPinInput('');
  };

  const addToCart = (item: any) => {
    if (item.isAvailable === false) return toast.error("Item Out of Stock");
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const tokenNumber = useMemo(() => Math.floor(100 + Math.random() * 900), [cart.length === 0]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Processing Bill...");

    try {
      const billNumber = Date.now().toString().slice(-5);
      const orderData = {
        billNumber, tokenNumber, items: cart, total: subtotal, subtotal,
        customerName: customerName || "Guest", customerPhone: customerPhone ? `+91${customerPhone}` : "",
        paymentMethod, fulfillmentType, tableNumber: fulfillmentType === 'table' ? tableNumber : '',
        timestamp: new Date(), status: 'completed', source: 'PC-POS'
      };

      await addDoc(collection(db, "orders"), orderData);
      
      // Printing
      const pConfig: PrintConfig = { printerType: 'thermal_bluetooth', printerPaperSize: '58mm' } as any;
      await handlePrintKot(orderData, pConfig);
      await new Promise(r => setTimeout(r, 1000));
      await handlePrintReceipt(orderData, pConfig);

      toast.success(`Success! Bill #${billNumber}`, { id: toastId });
      setCart([]); setCustomerPhone(''); setCustomerName('');
    } catch (err) {
      toast.error("Failed to save order", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-sans">
        <Toaster />
        <div className="bg-[#151515] p-12 rounded-[40px] border border-white/5 w-[450px] text-center shadow-2xl">
          <div className="h-24 w-24 bg-orange-600 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-lg shadow-orange-600/20">
            <Lock size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Terminal Locked</h1>
          <p className="text-slate-500 mb-10 font-bold">ENTER SYSTEM PIN</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="password" maxLength={4} value={pinInput} onChange={e => setPinInput(e.target.value)} 
              className="w-full bg-[#202020] border-none text-center text-5xl font-mono tracking-[20px] py-6 rounded-3xl text-orange-500 focus:ring-2 ring-orange-500 outline-none" autoFocus />
            <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-xl shadow-orange-600/20 uppercase">Login to POS</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8f9fa] dark:bg-[#080808] flex overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      <Toaster position="top-right" />

      {/* --- COLUMN 1: SIDEBAR --- */}
      <aside className="w-72 bg-white dark:bg-[#111] border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0">
        <div className="p-8 border-b border-slate-100 dark:border-white/5">
          <h1 className="text-2xl font-black text-orange-500 tracking-tighter italic">BUM BUM CAFE</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Terminal: PC-01</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <SidebarLink icon={<Calculator size={20}/>} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <SidebarLink icon={<Clock size={20}/>} label="Live Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarLink icon={<TrendingUp size={20}/>} label="Sales Report" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <SidebarLink icon={<Layers size={20}/>} label="Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <SidebarLink icon={<Settings size={20}/>} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-white/5 space-y-4">
          <div className="bg-green-500/10 p-5 rounded-3xl border border-green-500/20">
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Today's Sales (Change)</p>
            <p className="text-3xl font-black text-green-600 leading-none">₹{todayStats.total}</p>
            <p className="text-[11px] text-slate-500 font-bold mt-2">{todayStats.count} Completed Orders</p>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center gap-3 text-slate-400 hover:text-red-500 font-bold text-sm w-full p-2 transition-colors">
            <LogOut size={18} /> Logout System
          </button>
        </div>
      </aside>

      {/* --- COLUMN 2: PRODUCTS --- */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#000]">
        <header className="h-24 bg-white dark:bg-[#111] border-b border-slate-200 dark:border-white/5 flex items-center px-10 gap-8 shrink-0">
          <div className="relative flex-1 max-w-3xl">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input type="text" placeholder="Search product or scan barcode..." className="w-full bg-slate-100 dark:bg-[#1a1a1a] border-none rounded-2xl py-4 pl-16 pr-6 focus:ring-2 ring-orange-500 outline-none text-lg font-medium" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-4 border-l pl-8 border-slate-200 dark:border-white/10">
             <div className="text-right">
                <p className="text-sm font-black">{currentUser?.name}</p>
                <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">System Online</p>
             </div>
             <div className="h-14 w-14 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg">
               {currentUser?.name?.charAt(0)}
             </div>
          </div>
        </header>

        {/* Categories */}
        <div className="p-8 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-white dark:bg-[#111] text-slate-500 hover:bg-orange-50'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {products
            .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(product => (
              <div key={product.id} onClick={() => addToCart(product)} className={`bg-white dark:bg-[#111] border border-slate-200 dark:border-white/5 rounded-[40px] p-6 cursor-pointer hover:shadow-2xl hover:border-orange-500/50 transition-all group relative overflow-hidden ${product.isAvailable === false ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="h-44 w-full bg-slate-100 dark:bg-[#1a1a1a] rounded-[32px] overflow-hidden mb-6 flex items-center justify-center">
                  {product.image ? <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <Utensils size={48} className="text-slate-300" />}
                </div>
                <h3 className="font-black text-lg line-clamp-1 group-hover:text-orange-500 transition-colors">{product.name}</h3>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">₹{product.price}</span>
                  <div className="bg-orange-500/10 text-orange-500 p-3 rounded-2xl group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                    <Check size={20} strokeWidth={3} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </main>

      {/* --- COLUMN 3: CART & CHECKOUT --- */}
      <section className="w-[500px] bg-white dark:bg-[#111] border-l border-slate-200 dark:border-white/5 flex flex-col shadow-2xl shrink-0">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-[#151515]">
          <h2 className="text-xl font-black flex items-center gap-3"><ShoppingBag size={24} className="text-orange-500" /> Order Summary</h2>
          <div className="bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-500/20">
             <span className="text-[10px] font-black text-orange-500 uppercase block tracking-widest text-right">Token No</span>
             <span className="text-2xl font-black text-orange-600 font-mono">#{tokenNumber}</span>
          </div>
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
              <ShoppingBag size={100} strokeWidth={1} />
              <p className="mt-6 font-black text-lg uppercase tracking-widest">Cart is Empty</p>
            </div>
          ) : (
            cart.map(item => (
              <motion.div layout initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={item.id} className="flex justify-between items-center bg-slate-50 dark:bg-[#1a1a1a] p-5 rounded-3xl border border-slate-100 dark:border-white/5">
                <div className="flex-1">
                  <p className="text-base font-black mb-1">{item.name}</p>
                  <p className="text-sm text-orange-500 font-bold font-mono">₹{item.price} <span className="text-slate-400 font-normal">x {item.quantity}</span></p>
                </div>
                <div className="flex items-center gap-5 bg-white dark:bg-[#000] rounded-2xl px-4 py-2 shadow-sm">
                  <button onClick={() => updateQty(item.id, -1)} className="text-xl font-black hover:text-orange-500">-</button>
                  <span className="text-lg font-black w-6 text-center font-mono">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="text-xl font-black hover:text-orange-500">+</button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Checkout Footer */}
        <div className="p-8 bg-slate-50 dark:bg-[#151515] border-t border-slate-200 dark:border-white/5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mobile Number</label>
                <input type="text" placeholder="Customer Mobile" className="w-full bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl text-base font-bold border border-slate-200 dark:border-white/10 outline-none focus:ring-2 ring-orange-500 transition-all" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
             </div>
             <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Guest Name</label>
                <input type="text" placeholder="Name" className="w-full bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl text-base font-bold border border-slate-200 dark:border-white/10 outline-none focus:ring-2 ring-orange-500 transition-all" value={customerName} onChange={e => setCustomerName(e.target.value)} />
             </div>
          </div>

          <div className="flex bg-white dark:bg-[#000] p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
            {['table', 'pickup', 'delivery'].map(type => (
              <button key={type} onClick={() => setFulfillmentType(type)} className={`flex-1 py-3 text-[11px] font-black uppercase rounded-xl transition-all ${fulfillmentType === type ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{type}</button>
            ))}
          </div>

          {fulfillmentType === 'table' && (
            <div className="flex items-center gap-4 bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-orange-500/20 shadow-sm">
               <span className="text-sm font-black uppercase text-orange-500 shrink-0">Table No:</span>
               <input type="text" className="w-full bg-transparent border-none text-lg font-black outline-none" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-slate-500 font-bold text-lg"><span>Total Subtotal</span><span className="font-mono">₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-4xl font-black border-t border-slate-200 dark:border-white/10 pt-6">
              <span className="text-xl uppercase tracking-tighter self-end mb-1">Payable</span>
              <span className="text-orange-500 font-mono tracking-tighter">₹{subtotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-5 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600 shadow-xl shadow-green-600/20' : 'bg-white dark:bg-[#1a1a1a] text-slate-400'}`}>CASH</button>
            <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-5 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20' : 'bg-white dark:bg-[#1a1a1a] text-slate-400'}`}>UPI / CARD</button>
          </div>

          <button disabled={isSubmitting || cart.length === 0} onClick={handlePlaceOrder} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-5 transition-all transform active:scale-95 shadow-2xl shadow-orange-500/40 text-xl tracking-tight">
            {isSubmitting ? <Loader2 className="animate-spin" size={28} /> : <Printer size={28} />}
            CONFIRM & PRINT BILL
          </button>
        </div>
      </section>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl transition-all group relative ${active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'hover:bg-slate-50 dark:hover:bg-[#1a1a1a] text-slate-500'}`}>
      <span className={`${active ? 'text-white' : 'group-hover:text-orange-500'} transition-colors`}>{icon}</span>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      {active && <div className="absolute left-0 w-1.5 h-8 bg-white rounded-r-full" />}
    </button>
  );
}
