'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, getDocs, where, setDoc, Timestamp
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Calculator, TrendingUp, Utensils, CreditCard, Banknote, Keyboard
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { handlePrintKot, handlePrintReceipt, PrintConfig } from '@/lib/printerUtils';

export default function BbCafePosDesktop() {
  // --- Refs for Shortcuts ---
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'receipts' | 'reports'>('billing');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [fulfillmentType, setFulfillmentType] = useState<'table' | 'pickup' | 'delivery'>('table');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState({ total: 0, cash: 0, upi: 0, count: 0 });

  const pConfig: PrintConfig = { printerPaperSize: '58mm', printerType: 'thermal_bluetooth' } as any;

  // --- 1. Keyboard Shortcuts Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to focus Search
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F1 for Cash, F2 for UPI
      if (e.key === 'F1') { e.preventDefault(); setPaymentMethod('cash'); toast('Cash Selected 💵'); }
      if (e.key === 'F2') { e.preventDefault(); setPaymentMethod('upi'); toast('UPI Selected 📱'); }
      
      // Ctrl + Enter to Place Order
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handlePlaceOrder();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMethod, isSubmitting]); // Dependencies for shortcuts

  // --- 2. Real-time Sales & History Listener ---
  useEffect(() => {
    if (!isLoggedIn) return;
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);

    const q = query(collection(db, "orders"), where("timestamp", ">=", start), where("timestamp", "<=", end));
    
    return onSnapshot(q, (snap) => {
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

      // Sorting Fix
      const sorted = [...list].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      
      setDailySales({ total, cash, upi, count: list.length });
      setPastReceipts(sorted);
    });
  }, [isLoggedIn]);

  useEffect(() => {
    onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category))) as string[]]);
    });
  }, []);

  // --- 3. sequential KOT + BILL Print ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Saving & Printing KOT...");

    try {
      const billNumber = Date.now().toString().slice(-5);
      const token = Math.floor(100 + Math.random() * 900);
      const total = cart.reduce((a,b)=>a+(b.price*b.quantity), 0);

      const orderObj = { 
        billNumber, tokenNumber: token, 
        customerName: customerName || "Guest", 
        customerPhone: customerPhone ? `+91${customerPhone}` : "",
        items: cart, total, timestamp: new Date(), status: 'completed',
        paymentMethod, fulfillmentType, source: 'PC-POS' 
      };

      await addDoc(collection(db, "orders"), orderObj);

      // Print KOT
      await handlePrintKot(orderObj, pConfig);
      
      // Delay for Printer Buffer
      toast.loading("Printing Bill...", { id: toastId });
      await new Promise(r => setTimeout(r, 1600)); 
      
      // Print Bill
      await handlePrintReceipt(orderObj, pConfig);

      toast.success(`Order #${billNumber} Success!`, { id: toastId });
      setCart([]); setCustomerName(''); setCustomerPhone('');
    } catch (err) {
      toast.error("Process Failed", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReprint = async (order: any) => {
    toast.success(`Reprinting Bill #${order.billNumber}`);
    await handlePrintReceipt(order, pConfig);
  };

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="h-screen w-full bg-[#080808] text-white flex overflow-hidden font-sans select-none">
      <Toaster />

      {/* --- LEFT SIDEBAR --- */}
      <aside className="w-64 border-r border-white/5 bg-[#111] flex flex-col shrink-0">
        <div className="p-8 font-black text-2xl text-orange-500 italic flex items-center gap-2">
            <Utensils /> BUM BUM
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <SidebarBtn icon={<Calculator/>} label="Billing" active={activeTab === 'billing'} onClick={()=>setActiveTab('billing')} />
          <SidebarBtn icon={<Printer/>} label="Reprint Bill" active={activeTab === 'receipts'} onClick={()=>setActiveTab('receipts')} />
          <SidebarBtn icon={<TrendingUp/>} label="Daily Stats" active={activeTab === 'reports'} onClick={()=>setActiveTab('reports')} />
        </nav>
        
        {/* Real-time Change Box */}
        <div className="p-6 border-t border-white/5 space-y-3">
           <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Today's Revenue</p>
              <div className="flex justify-between items-end">
                <p className="text-3xl font-black text-green-500 italic">₹{dailySales.total}</p>
                <p className="text-[10px] font-bold text-slate-500 mb-1">{dailySales.count} Bills</p>
              </div>
           </div>
           <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center gap-3 text-slate-500 hover:text-red-500 font-bold text-sm w-full p-2 transition-colors">
            <LogOut size={16} /> Logout POS
          </button>
        </div>
      </aside>

      {/* --- CENTER: MENU --- */}
      <main className="flex-1 flex overflow-hidden bg-[#000]">
        
        {activeTab === 'billing' && (
          <>
            <div className="flex-1 flex flex-col min-w-0">
              <div className="p-6 border-b border-white/5 bg-[#111]/50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Type to search... (Press Space)" 
                    className="w-full bg-[#1a1a1a] border-none rounded-2xl py-4 pl-12 focus:ring-2 ring-orange-500 outline-none text-lg" 
                    value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} 
                  />
                </div>
              </div>
              <div className="p-6 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                {categories.map(c => <button key={c} onClick={()=>setSelectedCategory(c)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === c ? 'bg-orange-500 text-white shadow-lg' : 'bg-[#111] text-slate-500 hover:bg-white/5'}`}>{c}</button>)}
              </div>
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 content-start">
                {products.filter(p => (selectedCategory==='All'||p.category===selectedCategory)&&p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                  <div key={item.id} onClick={()=>setCart([...cart, {...item, quantity: 1}])} className="bg-[#111] p-5 rounded-[35px] border border-white/5 cursor-pointer hover:border-orange-500/50 hover:shadow-2xl transition-all group active:scale-95">
                    <div className="h-32 bg-[#1a1a1a] rounded-3xl mb-4 flex items-center justify-center">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-3xl group-hover:scale-110 transition-all" /> : <Utensils className="text-white/10" size={40} />}
                    </div>
                    <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-orange-500 font-black text-xl mt-1">₹{item.price}</p>
                  </div>
                ))}
              </div>

              {/* QUICK CHECKOUT BAR (PC ONLY) */}
              <div className="h-16 bg-orange-600 flex items-center px-10 gap-8">
                 <div className="flex items-center gap-2 text-xs font-black"><Keyboard size={18}/> SHORTCUTS:</div>
                 <div className="text-[10px] font-bold bg-black/20 px-3 py-1 rounded-lg">F1: CASH</div>
                 <div className="text-[10px] font-bold bg-black/20 px-3 py-1 rounded-lg">F2: UPI</div>
                 <div className="text-[10px] font-bold bg-black/20 px-3 py-1 rounded-lg">SPACE: SEARCH</div>
                 <div className="text-[10px] font-bold bg-black/20 px-3 py-1 rounded-lg">CTRL+ENTER: CONFIRM ORDER</div>
              </div>
            </div>

            {/* --- RIGHT: CART --- */}
            <aside className="w-[450px] border-l border-white/5 bg-[#111] flex flex-col shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#151515]">
                <h2 className="font-black text-lg flex items-center gap-2">Order Cart</h2>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Token</p>
                  <p className="text-2xl font-black text-orange-500 font-mono italic">#{tokenNumber}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5 group">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.name}</p>
                        <p className="text-xs text-orange-500 font-mono">₹{item.price} x {item.quantity}</p>
                    </div>
                    <button onClick={()=>setCart(cart.filter((_,i)=>i!==idx))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-500/10 rounded-lg"><X size={16}/></button>
                  </div>
                ))}
              </div>
              <div className="p-8 bg-[#151515] border-t border-white/5 space-y-6 shadow-inner">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Mobile No" className="bg-[#000] p-4 rounded-2xl outline-none text-sm font-bold border border-white/5" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} />
                    <input type="text" placeholder="Name" className="bg-[#000] p-4 rounded-2xl outline-none text-sm font-bold border border-white/5" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
                </div>
                
                <div className="flex bg-[#000] p-1.5 rounded-2xl">
                    <button onClick={()=>setPaymentMethod('cash')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${paymentMethod==='cash'?'bg-green-600 shadow-lg shadow-green-600/20':'text-slate-500'}`}>CASH (F1)</button>
                    <button onClick={()=>setPaymentMethod('upi')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${paymentMethod==='upi'?'bg-blue-600 shadow-lg shadow-blue-600/20':'text-slate-500'}`}>UPI (F2)</button>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <span className="text-slate-500 font-black uppercase text-xs">Net Amount</span>
                    <span className="text-4xl font-black text-orange-500 font-mono tracking-tighter">₹{cart.reduce((a,b)=>a+(b.price*b.quantity),0)}</span>
                </div>

                <button 
                    disabled={isSubmitting||cart.length===0} 
                    onClick={handlePlaceOrder} 
                    className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-5 rounded-[25px] text-xl shadow-2xl shadow-orange-600/20 active:scale-95 transition-all"
                >
                    PLACE ORDER & PRINT
                </button>
              </div>
            </aside>
          </>
        )}

        {/* --- OTHER TABS (Reprint, Reports) --- */}
        {activeTab === 'receipts' && (
          <div className="flex-1 p-10 space-y-4 overflow-y-auto">
             <h2 className="text-2xl font-black mb-8 italic">Bill History & Reprint</h2>
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {pastReceipts.map(order => (
                <div key={order.id} className="bg-[#111] p-6 rounded-3xl flex justify-between items-center border border-white/5 hover:border-orange-500/50 transition-all group">
                    <div className="flex gap-8 items-center">
                        <div className="text-center bg-black/40 px-4 py-2 rounded-xl">
                            <p className="text-[10px] font-black text-slate-500 uppercase leading-none">Token</p>
                            <p className="text-xl font-black text-orange-500 font-mono leading-none mt-1">#{order.tokenNumber}</p>
                        </div>
                        <div>
                            <p className="font-mono text-xs text-slate-500">Bill: #{order.billNumber}</p>
                            <p className="text-lg font-black">{order.customerName} - <span className="text-green-500">₹{order.total}</span></p>
                        </div>
                    </div>
                    <button onClick={()=>handleReprint(order)} className="bg-orange-600 text-white p-4 rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-all">
                        <Printer size={20} />
                    </button>
                </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="flex-1 p-10 space-y-8 overflow-y-auto">
             <h2 className="text-2xl font-black italic">Sales Dashboard</h2>
             <div className="grid grid-cols-3 gap-6">
                 <ReportCard icon={<Banknote/>} label="Cash Balance" value={dailySales.cash} color="text-green-500" bg="bg-green-500/10" />
                 <ReportCard icon={<CreditCard/>} label="UPI / Online" value={dailySales.upi} color="text-blue-500" bg="bg-blue-500/10" />
                 <ReportCard icon={<TrendingUp/>} label="Total Sales" value={dailySales.total} color="text-orange-500" bg="bg-orange-500/10" />
             </div>
          </div>
        )}

      </main>
    </div>
  );
}

// --- UI HELPERS ---

function SidebarBtn({icon, label, active, onClick, badge}: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20 translate-x-2' : 'text-slate-500 hover:bg-white/5'}`}>
      {icon} <span className="font-black text-sm uppercase tracking-widest">{label}</span>
      {badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{badge}</span>}
    </button>
  );
}

function ReportCard({icon, label, value, color, bg}: any) {
    return (
        <div className={`${bg} border border-white/5 p-10 rounded-[45px] transition-all hover:scale-105`}>
            <div className={`${color} mb-6`}>{React.cloneElement(icon as React.ReactElement, { size: 48 })}</div>
            <p className="text-sm font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
            <p className="text-5xl font-black font-mono tracking-tighter italic">₹{value}</p>
        </div>
    )
}

function Login({onLogin}: any) {
  const [p, setP] = useState('');
  const submit = () => { if(p==='1234') onLogin(); else { toast.error('Wrong PIN'); setP(''); } };
  return (
    <div className="h-screen w-full bg-[#050505] flex items-center justify-center font-sans">
      <Toaster />
      <div className="bg-[#111] p-16 rounded-[60px] border border-white/5 w-[450px] text-center shadow-2xl">
        <div className="bg-orange-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-10 rotate-12 shadow-2xl shadow-orange-600/30">
            <Lock size={48} className="text-white -rotate-12" />
        </div>
        <h1 className="text-3xl font-black mb-2 italic">TERMINAL LOCKED</h1>
        <p className="text-slate-500 font-bold mb-10 text-sm">BUM BUM CAFE - SECURE ACCESS</p>
        <input 
            type="password" value={p} onChange={e=>setP(e.target.value)} 
            onKeyDown={e=>e.key==='Enter'&&submit()}
            className="w-full bg-[#1a1a1a] text-center text-5xl font-mono py-6 rounded-[30px] mb-8 outline-none border border-white/5 text-orange-500 focus:ring-4 ring-orange-500/20" 
            placeholder="••••" maxLength={4} autoFocus 
        />
        <button onClick={submit} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-[30px] font-black text-xl shadow-xl shadow-orange-600/20 transition-all active:scale-95">ACCESS POS</button>
      </div>
    </div>
  );
}
