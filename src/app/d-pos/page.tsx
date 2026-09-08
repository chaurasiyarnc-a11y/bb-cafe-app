'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, getDocs, where, setDoc, Timestamp
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  Database, RefreshCw, Layers, Menu, LogOut, Lock, ToggleLeft, ToggleRight, 
  Sun, Moon, Tag, Calculator, TrendingUp, Utensils, User, Banknote, CreditCard, Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import CustomizerModal from '@/components/pos/CustomizerModal';
import { handlePrintKot, handlePrintReceipt, PrintConfig } from '@/lib/printerUtils';

// --- Safe Icons ---
const SafeLock = Lock as any;
const SafePrinter = Printer as any;
const SafeClock = Clock as any;
const SafeSearch = Search as any;
const SafeSettings = Settings as any;

// --- Interfaces ---
interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string; 
}

let globalAudioCtx: AudioContext | null = null;

export default function BbCafePosDesktop() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'receipts' | 'inventory' | 'reports' | 'settings'>('billing');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [tableNumber, setTableNumber] = useState('1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  const [dailySales, setDailySales] = useState({ total: 0, cash: 0, upi: 0, count: 0 });
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Printer Config
  const pConfig: PrintConfig = { 
    printerPaperSize: '58mm', 
    printerType: 'thermal_bluetooth' 
  } as any;

  // --- Token Number Logic (PC Version) ---
  const tokenNumber = useMemo(() => {
    return Math.floor(100 + Math.random() * 900);
  }, [cart.length === 0]);

  // --- Audio Logic ---
  const triggerBeep = (type: 'tap' | 'success' | 'alarm') => {
    try {
      if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.connect(gain); gain.connect(globalAudioCtx.destination);
      if (type === 'tap') {
        osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F1') { e.preventDefault(); setPaymentMethod('cash'); toast('Cash Selected'); }
      if (e.key === 'F2') { e.preventDefault(); setPaymentMethod('upi'); toast('UPI Selected'); }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handlePlaceOrder();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMethod, isSubmittingOrder]);

  // --- Firebase Listeners ---
  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); }

    const unsubProd = onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[]]);
    });

    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    const qStats = query(collection(db, "orders"), where("timestamp", ">=", start), where("timestamp", "<=", end));
    
    const unsubStats = onSnapshot(qStats, (snap) => {
      let total = 0, cash = 0, upi = 0;
      const list = snap.docs.map(d => {
        const data = d.data() as any;
        if(data.status === 'completed') {
          total += (data.total || 0);
          if(data.paymentMethod === 'cash') cash += (data.total || 0);
          if(data.paymentMethod === 'upi') upi += (data.total || 0);
        }
        return { id: d.id, ...data };
      });
      const sorted = [...list].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setDailySales({ total, cash, upi, count: list.length });
      setPastReceipts(sorted);
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
      toast.success("Welcome to Bum Bum Cafe");
    } else { toast.error("Invalid PIN"); }
    setPinInput('');
  };

  const addToCart = (item: any) => {
    triggerBeep('tap');
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const toastId = toast.loading("Processing Order...");
    try {
      const billNumber = Date.now().toString().slice(-5);
      const total = cart.reduce((a,b) => a + (b.price * b.quantity), 0);
      
      const orderObj = { 
        billNumber, tokenNumber, items: cart, total, 
        customerName: customerName || "Guest", 
        customerPhone: customerPhone ? `+91${customerPhone}` : "",
        timestamp: new Date(), status: 'completed', paymentMethod, fulfillmentType, 
        tableNumber: fulfillmentType === 'table' ? tableNumber : '', source: 'PC-POS'
      };

      await addDoc(collection(db, "orders"), orderObj);
      triggerBeep('success');

      // Sequential Printing
      toast.loading("Printing KOT...", { id: toastId });
      await handlePrintKot(orderObj, pConfig);
      await new Promise(r => setTimeout(r, 1600)); 
      toast.loading("Printing Bill...", { id: toastId });
      await handlePrintReceipt(orderObj, pConfig);

      toast.success(`Success! Bill #${billNumber}`, { id: toastId });
      setCart([]); setCustomerName(''); setCustomerPhone('');
    } catch (err) {
      toast.error("Failed to save order", { id: toastId });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleReprint = async (order: any) => {
    toast.success("Reprinting...");
    await handlePrintReceipt(order, pConfig);
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-sans">
        <Toaster />
        <div className="bg-[#151515] p-12 rounded-[40px] border border-white/5 w-[420px] text-center shadow-2xl">
          <SafeLock size={64} className="text-orange-500 mx-auto mb-8" />
          <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Terminal Locked</h1>
          <form onSubmit={handleLogin}>
            <input type="password" maxLength={4} value={pinInput} onChange={e => setPinInput(e.target.value)} 
              className="w-full bg-[#202020] border-none text-center text-5xl font-mono tracking-[15px] py-6 rounded-2xl text-orange-500 outline-none mb-6" autoFocus />
            <button type="submit" className="w-full bg-orange-600 text-white font-black py-4 rounded-xl text-lg uppercase shadow-xl shadow-orange-600/20">Access POS</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#080808] text-white flex overflow-hidden font-sans select-none">
      <Toaster position="top-right" />

      {/* --- SIDEBAR --- */}
      <aside className="w-64 border-r border-white/5 bg-[#111] flex flex-col shrink-0">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-black text-orange-500 italic tracking-tighter">BUM BUM CAFE</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Terminal: PC-01</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarBtn icon={<Calculator size={20}/>} label="Billing" active={activeTab === 'billing'} onClick={()=>setActiveTab('billing')} />
          <SidebarBtn icon={<SafeClock size={20}/>} label="History / Reprint" active={activeTab === 'receipts'} onClick={()=>setActiveTab('receipts')} />
          <SidebarBtn icon={<TrendingUp size={20}/>} label="Daily Sales" active={activeTab === 'reports'} onClick={()=>setActiveTab('reports')} />
          <SidebarBtn icon={<Layers size={20}/>} label="Inventory" active={activeTab === 'inventory'} onClick={()=>setActiveTab('inventory')} />
          <SidebarBtn icon={<SafeSettings size={20}/>} label="Settings" active={activeTab === 'settings'} onClick={()=>setActiveTab('settings')} />
        </nav>
        <div className="p-6 border-t border-white/5">
           <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 mb-4 text-center">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Today's Revenue</p>
              <p className="text-2xl font-black">₹{dailySales.total}</p>
           </div>
           <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center gap-3 text-slate-500 hover:text-red-500 font-bold text-sm w-full p-2">
            <LogOut size={18} /> Logout PC
          </button>
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex overflow-hidden bg-[#000]">
        
        {activeTab === 'billing' && (
          <>
            <div className="flex-1 flex flex-col min-w-0">
              {/* Search & Categories */}
              <div className="p-6 border-b border-white/5 bg-[#111]/50 flex gap-4 items-center">
                <div className="relative flex-1">
                  <SafeSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input ref={searchInputRef} type="text" placeholder="Search menu... (Press Space)" className="w-full bg-[#1a1a1a] border-none rounded-2xl py-4 pl-12 pr-6 outline-none text-lg font-medium" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="p-6 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                {categories.map(c => <button key={c} onClick={()=>setSelectedCategory(c)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === c ? 'bg-orange-500 text-white' : 'bg-[#111] text-slate-500'}`}>{c}</button>)}
              </div>
              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 content-start">
                {products.filter(p => (selectedCategory==='All'||p.category===selectedCategory)&&p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                  <div key={item.id} onClick={()=>addToCart(item)} className={`bg-[#111] p-6 rounded-[40px] border border-white/5 cursor-pointer hover:border-orange-500/50 transition-all group relative overflow-hidden ${item.isAvailable === false ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                    <div className="h-32 bg-[#1a1a1a] rounded-[28px] mb-4 flex items-center justify-center">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-[28px] group-hover:scale-110 transition-transform duration-500" /> : <Utensils className="text-white/10" size={40} />}
                    </div>
                    <h3 className="font-bold text-sm line-clamp-1 uppercase tracking-tight">{item.name}</h3>
                    <p className="text-orange-500 font-black text-xl mt-1">₹{item.price}</p>
                  </div>
                ))}
              </div>
              {/* Shortcuts Bar */}
              <div className="h-14 bg-orange-600/90 flex items-center px-10 gap-8 shrink-0">
                 <div className="flex items-center gap-2 text-[10px] font-black"><Keyboard size={16}/> SHORTCUTS:</div>
                 <div className="text-[9px] font-bold bg-black/20 px-3 py-1 rounded-lg">F1: CASH</div>
                 <div className="text-[9px] font-bold bg-black/20 px-3 py-1 rounded-lg">F2: UPI</div>
                 <div className="text-[9px] font-bold bg-black/20 px-3 py-1 rounded-lg">CTRL+ENTER: PRINT BILL</div>
              </div>
            </div>

            {/* --- RIGHT CART PANEL --- */}
            <aside className="w-[480px] border-l border-white/5 bg-[#111] flex flex-col shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#151515]">
                <h2 className="font-black text-xl flex items-center gap-3"><ShoppingBag size={24} className="text-orange-500"/> Order Cart</h2>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Token</p>
                  <p className="text-3xl font-black text-orange-500 font-mono italic">#{tokenNumber}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-30">
                    <ShoppingBag size={100} strokeWidth={1} />
                    <p className="mt-4 font-black uppercase tracking-widest text-lg text-center">Cart is empty.<br/><span className="text-xs">Select items to start billing.</span></p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <motion.div layout initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={idx} className="flex justify-between items-center bg-black/30 p-5 rounded-3xl border border-white/5 group">
                      <div className="flex-1 min-w-0">
                          <p className="text-base font-black truncate">{item.name}</p>
                          <p className="text-sm text-orange-500 font-bold font-mono">₹{item.price} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-4 bg-black rounded-2xl px-3 py-1.5 shadow-sm">
                         <button onClick={()=>setCart(cart.map((it, i) => i === idx ? {...it, quantity: Math.max(0, it.quantity - 1)} : it).filter(it => it.quantity > 0))} className="text-lg font-black hover:text-orange-500">-</button>
                         <span className="text-base font-black w-4 text-center font-mono">{item.quantity}</span>
                         <button onClick={()=>setCart(cart.map((it, i) => i === idx ? {...it, quantity: it.quantity + 1} : it))} className="text-lg font-black hover:text-orange-500">+</button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="p-8 bg-[#151515] border-t border-white/5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Mobile No" className="bg-[#000] p-4 rounded-2xl outline-none text-base font-bold border border-white/5 focus:ring-1 ring-orange-500" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} />
                    <input type="text" placeholder="Customer Name" className="bg-[#000] p-4 rounded-2xl outline-none text-base font-bold border border-white/5 focus:ring-1 ring-orange-500" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
                </div>
                <div className="flex bg-[#000] p-2 rounded-2xl">
                    <button onClick={()=>setPaymentMethod('cash')} className={`flex-1 py-4 rounded-xl text-xs font-black transition-all ${paymentMethod==='cash'?'bg-green-600 shadow-xl shadow-green-600/20':'text-slate-500'}`}>CASH (F1)</button>
                    <button onClick={()=>setPaymentMethod('upi')} className={`flex-1 py-4 rounded-xl text-xs font-black transition-all ${paymentMethod==='upi'?'bg-blue-600 shadow-xl shadow-blue-600/20':'text-slate-500'}`}>UPI / ONLINE (F2)</button>
                </div>
                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <span className="text-slate-500 font-black uppercase text-xs tracking-widest">Net Payable</span>
                    <span className="text-5xl font-black text-orange-500 font-mono tracking-tighter">₹{cart.reduce((a,b)=>a+(b.price*b.quantity),0)}</span>
                </div>
                <button disabled={isSubmittingOrder||cart.length===0} onClick={handlePlaceOrder} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-6 rounded-[32px] text-2xl shadow-2xl shadow-orange-600/20 active:scale-95 transition-all">
                  {isSubmittingOrder ? <Loader2 className="animate-spin mx-auto" size={32} /> : "PLACE ORDER & PRINT"}
                </button>
              </div>
            </aside>
          </>
        )}

        {/* --- OTHER TABS --- */}
        {activeTab === 'receipts' && (
          <div className="flex-1 p-12 overflow-y-auto space-y-6">
             <h2 className="text-3xl font-black mb-8 italic flex items-center gap-4"><SafePrinter/> History & Reprint</h2>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {pastReceipts.map(order => (
                <div key={order.id} className="bg-[#111] p-8 rounded-[40px] flex justify-between items-center border border-white/5 hover:border-orange-500/50 group transition-all">
                    <div className="flex gap-8 items-center">
                        <div className="bg-black/50 px-6 py-4 rounded-3xl text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Token</p>
                            <p className="text-3xl font-black text-orange-500 font-mono leading-none">#{order.tokenNumber}</p>
                        </div>
                        <div>
                            <p className="font-mono text-xs text-slate-500 mb-1">Bill: #{order.billNumber}</p>
                            <p className="text-xl font-black">{order.customerName} - <span className="text-green-500 font-mono">₹{order.total}</span></p>
                        </div>
                    </div>
                    <button onClick={()=>handleReprint(order)} className="bg-orange-600 text-white p-5 rounded-3xl shadow-xl opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                        <Printer size={24} />
                    </button>
                </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="flex-1 p-12 space-y-8 overflow-y-auto">
             <h2 className="text-3xl font-black mb-8 italic">Sales Overview</h2>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="bg-green-600/10 border border-green-600/20 p-12 rounded-[50px]">
                    <Banknote size={56} className="text-green-500 mb-6" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Cash Collected</p>
                    <p className="text-6xl font-black font-mono">₹{dailySales.cash}</p>
                 </div>
                 <div className="bg-blue-600/10 border border-blue-600/20 p-12 rounded-[50px]">
                    <CreditCard size={56} className="text-blue-500 mb-6" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">UPI / Card</p>
                    <p className="text-6xl font-black font-mono">₹{dailySales.upi}</p>
                 </div>
                 <div className="bg-orange-600/10 border border-orange-600/20 p-12 rounded-[50px]">
                    <TrendingUp size={56} className="text-orange-500 mb-6" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-2">Total Sales</p>
                    <p className="text-6xl font-black font-mono">₹{dailySales.total}</p>
                 </div>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function SidebarBtn({icon, label, active, onClick, badge}: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
      <span className={`${active ? 'text-white' : 'group-hover:text-orange-500'} transition-colors`}>{icon}</span>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
      {badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{badge}</span>}
    </button>
  );
}
