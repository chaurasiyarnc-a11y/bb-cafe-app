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
  Sun, Moon, Tag, ChevronRight, User, Calculator, TrendingUp, Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Printer Utils
import { handlePrintKot, handlePrintReceipt } from '@/lib/printerUtils';

export default function BbCafePosDesktop() {
  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState('billing');
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Billing & Customer States
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [fulfillmentType, setFulfillmentType] = useState('table');
  const [tableNumber, setTableNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Daily Change/Stats State
  const [todayStats, setTodayStats] = useState({ total: 0, count: 0 });

  // --- Effects ---

  // 1. Auth Check
  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) { 
      try {
        setIsLoggedIn(true); 
        setCurrentUser(JSON.parse(savedUser)); 
      } catch(e) { console.error("Auth error"); }
    }
  }, []);

  // 2. Data Listeners (Products & Daily Sales)
  useEffect(() => {
    if (!isLoggedIn) return;

    // Listener for Products
    const unsubProd = onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      const uniqueCats = ['All', ...new Set(items.map(i => i.category).filter(Boolean))];
      setCategories(uniqueCats);
    });

    // Listener for Today's Sales (Daily Change)
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const statsQuery = query(
      collection(db, "orders"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );

    const unsubStats = onSnapshot(statsQuery, (snap) => {
      let totalSales = 0;
      let completedOrders = 0;
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'completed') {
          totalSales += Number(data.total || 0);
          completedOrders++;
        }
      });
      setTodayStats({ total: totalSales, count: completedOrders });
    });

    return () => { unsubProd(); unsubStats(); };
  }, [isLoggedIn]);

  // --- Handlers ---

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    const toastId = toast.loading("Verifying PIN...");
    try {
      const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput)));
      if (!snap.empty) {
        const userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setIsLoggedIn(true);
        setCurrentUser(userData);
        localStorage.setItem("bb_pos_user", JSON.stringify(userData));
        toast.success(`Welcome ${userData.name}`, { id: toastId });
      } else {
        toast.error("Invalid PIN", { id: toastId });
      }
      setPinInput('');
    } catch (err) {
      toast.error("Connection Error", { id: toastId });
    }
  };

  const addToCart = (item) => {
    if (item.isAvailable === false) return toast.error("Out of Stock");
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const tokenNumber = useMemo(() => Math.floor(100 + Math.random() * 900), [cart.length === 0]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setIsSubmitting(true);
    const toastId = toast.loading("Printing KOT & Bill...");

    try {
      const billNumber = Date.now().toString().slice(-6); // Simple unique bill number
      
      const orderData = {
        billNumber,
        tokenNumber,
        items: cart,
        subtotal,
        total: subtotal,
        customerName: customerName || "Guest",
        customerPhone: customerPhone ? `+91${customerPhone}` : "",
        paymentMethod,
        fulfillmentType,
        tableNumber: fulfillmentType === 'table' ? tableNumber : '',
        timestamp: new Date(),
        status: 'completed',
        source: 'Desktop POS'
      };

      // 1. Save to Database
      await addDoc(collection(db, "orders"), orderData);

      // 2. Print Functions
      const printConfig = { printerType: 'thermal_bluetooth', printerPaperSize: '58mm' };
      
      // Print KOT First
      await handlePrintKot(orderData, printConfig);
      
      // Short delay for printer buffer
      await new Promise(r => setTimeout(r, 1000));
      
      // Print Final Receipt
      await handlePrintReceipt(orderData, printConfig);

      toast.success(`Success! Bill #${billNumber}`, { id: toastId });
      
      // Reset
      setCart([]); setCustomerPhone(''); setCustomerName(''); setTableNumber('');
    } catch (err) {
      console.error(err);
      toast.error("Order Failed", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Views ---

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-sans">
        <Toaster />
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#151515] p-10 rounded-[40px] border border-white/5 w-96 text-center shadow-2xl">
          <div className="h-20 w-20 bg-orange-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-orange-600/20">
            <Lock size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Bum Bum Terminal</h1>
          <p className="text-slate-500 text-sm mb-8 font-bold">ENTER SECURE PIN</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" maxLength={4} value={pinInput} onChange={e => setPinInput(e.target.value)}
              className="w-full bg-[#202020] border-none text-center text-4xl font-mono tracking-[20px] py-4 rounded-2xl text-orange-500 focus:ring-2 ring-orange-500 outline-none mb-6 transition-all"
              autoFocus
            />
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-orange-600/20">ACCESS POS</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#f8f9fa] dark:bg-[#0a0a0a] flex overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      <Toaster position="top-right" />

      {/* LEFT SIDEBAR: Navigation & Daily Change */}
      <aside className="w-64 bg-white dark:bg-[#111] border-r border-slate-200 dark:border-white/5 flex flex-col shrink-0 transition-colors">
        <div className="p-8">
          <h1 className="text-2xl font-black text-orange-500 tracking-tighter italic">BUM BUM</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Premium POS Desktop</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<Calculator size={20}/>} label="Counter Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <NavItem icon={<Clock size={20}/>} label="Live Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <NavItem icon={<TrendingUp size={20}/>} label="Daily Sales" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <NavItem icon={<Settings size={20}/>} label="POS Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-6 border-t border-slate-200 dark:border-white/5">
          <div className="bg-green-500/10 p-4 rounded-2xl mb-4 border border-green-500/20">
            <p className="text-[10px] font-black text-green-500 uppercase mb-1 tracking-wider">Today's Sales (Change)</p>
            <p className="text-2xl font-black text-green-600">₹{todayStats.total}</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">{todayStats.count} Bills Generated</p>
          </div>
          <button onClick={() => { localStorage.removeItem("bb_pos_user"); window.location.reload(); }} className="flex items-center gap-3 text-slate-400 hover:text-red-500 font-bold text-sm p-2 w-full transition-colors">
            <LogOut size={18} /> Exit System
          </button>
        </div>
      </aside>

      {/* CENTER: Menu & Products */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#000]">
        <header className="h-20 bg-white dark:bg-[#111] border-b border-slate-200 dark:border-white/5 flex items-center px-8 gap-6 shrink-0 transition-colors">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search menu items (Pizza, Burgers, Drinks...)" 
              className="w-full bg-slate-100 dark:bg-[#1a1a1a] border-none rounded-2xl py-3.5 pl-14 pr-6 focus:ring-2 ring-orange-500 outline-none transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-sm font-black">{currentUser?.name}</p>
                <p className="text-[10px] text-green-500 font-black uppercase tracking-widest animate-pulse">● System Online</p>
             </div>
             <div className="h-12 w-12 bg-orange-500 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-orange-500/30">
               {currentUser?.name?.charAt(0)}
             </div>
          </div>
        </header>

        {/* Categories Scroller */}
        <div className="p-6 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30' : 'bg-white dark:bg-[#111] text-slate-500 hover:bg-orange-50 dark:hover:bg-[#222]'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          <AnimatePresence>
            {products
              .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(product => (
                <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} />
              ))}
          </AnimatePresence>
        </div>
      </main>

      {/* RIGHT SIDEBAR: Cart & Billing */}
      <section className="w-[450px] bg-white dark:bg-[#111] border-l border-slate-200 dark:border-white/5 flex flex-col shadow-2xl shrink-0 transition-colors">
        <div className="p-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-[#151515]">
          <h2 className="text-lg font-black flex items-center gap-3">
            <Utensils size={22} className="text-orange-500" /> Active Order
          </h2>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Token</span>
             <span className="text-xl font-black text-orange-500 font-mono leading-none tracking-tighter">#{tokenNumber}</span>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
              <div className="bg-slate-50 dark:bg-[#1a1a1a] p-10 rounded-full mb-6">
                <ShoppingBag size={80} strokeWidth={1} />
              </div>
              <p className="font-black text-base text-center uppercase tracking-widest opacity-50">Empty Cart</p>
            </div>
          ) : (
            cart.map(item => (
              <motion.div layout initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={item.id} className="flex justify-between items-center group bg-slate-50 dark:bg-[#1a1a1a] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <div className="flex-1">
                  <p className="text-sm font-black leading-tight mb-1">{item.name}</p>
                  <p className="text-xs text-orange-500 font-bold font-mono">₹{item.price} <span className="text-slate-400 text-[10px] ml-1">per unit</span></p>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-[#000] rounded-xl px-3 py-1.5 shadow-sm">
                  <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:text-orange-500 transition-colors font-black">-</button>
                  <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:text-orange-500 transition-colors font-black">+</button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Payment & Customer Details Section */}
        <div className="p-6 bg-slate-50 dark:bg-[#151515] border-t border-slate-200 dark:border-white/5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Mobile</label>
               <input 
                type="text" placeholder="10 Digit Number" 
                className="w-full bg-white dark:bg-[#1a1a1a] p-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10 outline-none focus:ring-2 ring-orange-500 transition-all"
                value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
               <input 
                type="text" placeholder="Guest Name" 
                className="w-full bg-white dark:bg-[#1a1a1a] p-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10 outline-none focus:ring-2 ring-orange-500 transition-all"
                value={customerName} onChange={e => setCustomerName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex bg-white dark:bg-[#000] p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
            {['table', 'pickup', 'delivery'].map(type => (
              <button 
                key={type}
                onClick={() => setFulfillmentType(type)}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${fulfillmentType === type ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                {type}
              </button>
            ))}
          </div>

          {fulfillmentType === 'table' && (
            <input 
              type="text" placeholder="Enter Table Number (e.g. T-04)" 
              className="w-full bg-white dark:bg-[#1a1a1a] p-3 rounded-xl text-sm font-bold border border-orange-500/20 outline-none focus:ring-2 ring-orange-500"
              value={tableNumber} onChange={e => setTableNumber(e.target.value)}
            />
          )}

          {/* Pricing Summary */}
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-slate-500 font-bold text-sm">
              <span>Subtotal Items</span>
              <span className="font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-black border-t border-slate-200 dark:border-white/10 pt-4">
              <span className="tracking-tighter uppercase text-base">Grand Total</span>
              <span className="text-orange-500 font-mono tracking-tighter">₹{subtotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Actions */}
          <div className="flex gap-3">
            <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600 shadow-xl shadow-green-600/20' : 'bg-white dark:bg-[#1a1a1a] text-slate-400 border-slate-200 dark:border-white/10'}`}>Cash</button>
            <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20' : 'bg-white dark:bg-[#1a1a1a] text-slate-400 border-slate-200 dark:border-white/10'}`}>UPI / Online</button>
          </div>

          <button 
            disabled={isSubmitting || cart.length === 0}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-4 transition-all transform active:scale-95 shadow-2xl shadow-orange-500/30 text-base tracking-tight"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Printer size={24} />}
            CONFIRM & PRINT BILL (KOT)
          </button>
        </div>
      </section>
    </div>
  );
}

// --- Sub Components ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group relative ${active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'hover:bg-slate-50 dark:hover:bg-[#1a1a1a] text-slate-500'}`}
    >
      <span className={`${active ? 'text-white' : 'group-hover:text-orange-500'} transition-colors`}>{icon}</span>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      {active && <motion.div layoutId="nav-active" className="absolute left-0 w-1 h-6 bg-white rounded-full ml-1" />}
    </button>
  );
}

function ProductCard({ product, onAdd }) {
  const isOut = product.isAvailable === false;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      onClick={onAdd}
      className={`bg-white dark:bg-[#111] border border-slate-200 dark:border-white/5 rounded-[32px] p-5 cursor-pointer hover:shadow-2xl hover:border-orange-500/40 transition-all group relative overflow-hidden ${isOut ? 'opacity-50 grayscale pointer-events-none' : ''}`}
    >
      <div className="h-40 w-full bg-slate-100 dark:bg-[#1a1a1a] rounded-[24px] overflow-hidden mb-5">
        {product.image ? (
          <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700 uppercase font-black text-[10px] tracking-widest">{product.category || 'No Image'}</div>
        )}
      </div>
      
      <div className="space-y-1">
         <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{product.category}</span>
         <h3 className="font-black text-base line-clamp-1 group-hover:text-orange-500 transition-colors uppercase tracking-tight">{product.name}</h3>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tighter">₹{product.price}</span>
        <div className="bg-orange-500/10 text-orange-500 p-2.5 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
          <Check size={18} strokeWidth={3} />
        </div>
      </div>

      {isOut && (
        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center z-10 backdrop-blur-[2px]">
          <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Out of Stock</span>
        </div>
      )}
    </motion.div>
  );
}
