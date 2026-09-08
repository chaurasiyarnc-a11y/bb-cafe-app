'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc,
  waitForPendingWrites, Timestamp, startOfDay, endOfDay
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  Database, RefreshCw, Layers, Menu, LogOut, Lock, 
  Sun, Moon, Tag, ChevronRight, User, Calculator, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Printer Utils (Assuming these exist in your lib)
import { handlePrintKot, handlePrintReceipt } from '@/lib/printerUtils';

export default function BbCafePosDesktop() {
  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  // Billing & Customer
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [fulfillmentType, setFulfillmentType] = useState('table');
  const [tableNumber, setTableNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Daily Stats
  const [todayStats, setTodayStats] = useState({ total: 0, count: 0 });

  // --- Load Data ---
  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); }

    // Fetch Products
    const unsubProd = onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      const cats = ['All', ...new Set(items.map(i => i.category))];
      setCategories(cats);
    });

    // Fetch Today's Sales (Daily Change)
    const today = new Date();
    const q = query(
      collection(db, "orders"),
      where("timestamp", ">=", startOfDay(today)),
      where("status", "==", "completed")
    );
    const unsubStats = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach(d => total += d.data().total || 0);
      setTodayStats({ total, count: snap.size });
    });

    return () => { unsubProd(); unsubStats(); };
  }, []);

  // --- Logic ---
  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const tokenNumber = useMemo(() => Math.floor(100 + Math.random() * 900), [cart.length === 0]);

  const addToCart = (item) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setIsSubmitting(true);
    const toastId = toast.loading("Processing Bill...");

    try {
      const billNumber = Date.now().toString().slice(-6);
      const orderData = {
        billNumber,
        tokenNumber,
        items: cart,
        subtotal,
        total: subtotal,
        customerName: customerName || "Guest",
        customerPhone: customerPhone,
        paymentMethod,
        fulfillmentType,
        tableNumber: fulfillmentType === 'table' ? tableNumber : '',
        timestamp: new Date(),
        status: 'completed'
      };

      // 1. Save to Firebase
      await addDoc(collection(db, "orders"), orderData);

      // 2. Print KOT
      await handlePrintKot(orderData, { printerType: 'thermal' });
      
      // 3. Print Final Bill
      await handlePrintReceipt(orderData, { printerType: 'thermal' });

      toast.success(`Order #${billNumber} Success!`, { id: toastId });
      setCart([]); setCustomerPhone(''); setCustomerName(''); setTableNumber('');
    } catch (err) {
      toast.error("Failed to place order", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) return <LoginScreen onLogin={(u) => { setIsLoggedIn(true); setCurrentUser(u); }} />;

  return (
    <div className="h-screen w-full bg-[#f8f9fa] dark:bg-[#0f0f0f] flex overflow-hidden font-sans text-slate-900 dark:text-slate-100">
      <Toaster />

      {/* COLUMN 1: SIDEBAR NAVIGATION */}
      <aside className="w-20 lg:w-64 bg-white dark:bg-[#1a1a1a] border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-black text-orange-500 tracking-tighter">BUM BUM CAFE</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Desktop POS v2.0</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <NavItem icon={<Calculator size={20}/>} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <NavItem icon={<Clock size={20}/>} label="Live Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <NavItem icon={<TrendingUp size={20}/>} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          <NavItem icon={<Settings size={20}/>} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-orange-500/10 p-3 rounded-xl mb-4">
            <p className="text-[10px] font-bold text-orange-500 uppercase">Today's Sale</p>
            <p className="text-xl font-black">₹{todayStats.total}</p>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center gap-3 text-red-500 font-bold text-sm p-2 w-full">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* COLUMN 2: PRODUCTS GRID */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#0a0a0a]">
        {/* Search Bar */}
        <header className="h-20 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-800 flex items-center px-8 gap-4">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search dishes, drinks, pizzas..." 
              className="w-full bg-slate-100 dark:bg-[#252525] border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 ring-orange-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold">{currentUser?.name}</p>
              <p className="text-[10px] text-green-500 font-bold">● System Online</p>
            </div>
            <div className="h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-white">
              {currentUser?.name?.charAt(0)}
            </div>
          </div>
        </header>

        {/* Categories */}
        <div className="p-6 flex gap-3 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white dark:bg-[#1a1a1a] text-slate-500 hover:bg-orange-50'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {products
            .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(product => (
              <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} />
            ))}
        </div>
      </main>

      {/* COLUMN 3: CART & BILLING */}
      <section className="w-[400px] bg-white dark:bg-[#1a1a1a] border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-black flex items-center gap-2">
            <ShoppingBag size={20} className="text-orange-500" /> Current Order
          </h2>
          <span className="bg-slate-100 dark:bg-[#252525] px-3 py-1 rounded-lg text-xs font-bold font-mono">
            Token: #{tokenNumber}
          </span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <ShoppingBag size={64} strokeWidth={1} />
              <p className="mt-4 font-bold text-sm text-center">Cart is empty.<br/>Select items to start billing.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center group">
                <div className="flex-1">
                  <p className="text-sm font-bold leading-tight">{item.name}</p>
                  <p className="text-xs text-orange-500 font-mono">₹{item.price} x {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#252525] rounded-xl p-1">
                  <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg shadow-sm transition-all">-</button>
                  <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-[#1a1a1a] rounded-lg shadow-sm transition-all">+</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Customer & Payment Info */}
        <div className="p-6 bg-slate-50 dark:bg-[#151515] space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="text" placeholder="Customer Phone" 
              className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 ring-orange-500"
              value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
            />
            <input 
              type="text" placeholder="Guest Name" 
              className="bg-white dark:bg-[#1a1a1a] p-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 ring-orange-500"
              value={customerName} onChange={e => setCustomerName(e.target.value)}
            />
          </div>

          <div className="flex bg-white dark:bg-[#1a1a1a] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {['table', 'pickup', 'delivery'].map(type => (
              <button 
                key={type}
                onClick={() => setFulfillmentType(type)}
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${fulfillmentType === type ? 'bg-orange-500 text-white' : 'text-slate-400'}`}
              >
                {type}
              </button>
            ))}
          </div>

          {fulfillmentType === 'table' && (
            <input 
              type="text" placeholder="Table Number (e.g. T1)" 
              className="w-full bg-white dark:bg-[#1a1a1a] p-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 outline-none focus:ring-1 ring-orange-500"
              value={tableNumber} onChange={e => setTableNumber(e.target.value)}
            />
          )}

          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Subtotal</span>
              <span className="font-mono font-bold">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-xl font-black">
              <span>Total Amount</span>
              <span className="text-orange-500 font-mono">₹{subtotal}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/20' : 'bg-white dark:bg-[#1a1a1a] text-slate-400 border-slate-200 dark:border-slate-800'}`}>Cash</button>
            <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-[#1a1a1a] text-slate-400 border-slate-200 dark:border-slate-800'}`}>UPI</button>
          </div>

          <button 
            disabled={isSubmitting || cart.length === 0}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-orange-500/20"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Printer size={20} />}
            PLACE ORDER & PRINT (KOT + BILL)
          </button>
        </div>
      </section>
    </div>
  );

  function updateQty(id, delta) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  }
}

// --- Sub Components ---

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-slate-100 dark:hover:bg-[#252525] text-slate-500'}`}
    >
      <span className={`${active ? 'text-white' : 'group-hover:text-orange-500'} transition-colors`}>{icon}</span>
      <span className="text-sm font-bold lg:block hidden">{label}</span>
    </button>
  );
}

function ProductCard({ product, onAdd }) {
  return (
    <div 
      onClick={onAdd}
      className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 cursor-pointer hover:shadow-2xl hover:border-orange-500/50 transition-all group"
    >
      <div className="h-32 w-full bg-slate-100 dark:bg-[#252525] rounded-2xl overflow-hidden mb-4">
        {product.image ? (
          <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 uppercase font-black text-[10px]">{product.category}</div>
        )}
      </div>
      <h3 className="font-black text-sm line-clamp-1">{product.name}</h3>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-orange-500 font-mono font-black">₹{product.price}</span>
        <div className="bg-orange-500/10 text-orange-500 p-1.5 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-all">
          <Check size={16} />
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const handleLogin = async (e) => {
    e.preventDefault();
    const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pin)));
    if(!snap.empty) {
      const userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
      localStorage.setItem("bb_pos_user", JSON.stringify(userData));
      onLogin(userData);
    } else {
      toast.error("Invalid PIN");
      setPin('');
    }
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center">
      <form onSubmit={handleLogin} className="bg-[#151515] p-10 rounded-[40px] border border-white/5 w-96 text-center shadow-2xl">
        <div className="h-20 w-20 bg-orange-500 rounded-3xl mx-auto flex items-center justify-center mb-6 rotate-12">
          <Lock size={40} className="text-white -rotate-12" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase">Terminal Locked</h1>
        <p className="text-slate-500 text-sm mb-8 font-bold">Enter Secure 4-Digit PIN</p>
        <input 
          type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)}
          className="w-full bg-[#202020] border-none text-center text-4xl font-mono tracking-[20px] py-4 rounded-2xl text-orange-500 focus:ring-2 ring-orange-500 outline-none mb-6"
          autoFocus
        />
        <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-orange-600/20">ACCESS TERMINAL</button>
      </form>
    </div>
  );
}
