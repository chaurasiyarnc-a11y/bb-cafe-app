'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, getDocs, where, setDoc, Timestamp
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Calculator, TrendingUp, Utensils, CreditCard, Banknote
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { handlePrintKot, handlePrintReceipt, PrintConfig } from '@/lib/printerUtils';

export default function BbCafePosDesktop() {
  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'receipts' | 'reports'>('billing');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  
  // Billing States
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reports & History
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState({ total: 0, cash: 0, upi: 0, count: 0 });

  // Printer Config
  const pConfig: PrintConfig = { 
    printerPaperSize: '58mm', 
    printerType: 'thermal_bluetooth' 
  } as any;

  // --- 1. Today's Sales Logic (Daily Change) ---
  useEffect(() => {
    if (!isLoggedIn) return;

    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);

    const q = query(collection(db, "orders"), where("timestamp", ">=", start), where("timestamp", "<=", end));
    
    return onSnapshot(q, (snap) => {
      let total = 0, cash = 0, upi = 0;
      const list = snap.docs.map(d => {
        const data = d.data();
        if(data.status === 'completed') {
            total += data.total;
            if(data.paymentMethod === 'cash') cash += data.total;
            if(data.paymentMethod === 'upi') upi += data.total;
        }
        return { id: d.id, ...data };
      });
      setDailySales({ total, cash, upi, count: list.length });
      setPastReceipts(list.sort((a,b) => b.timestamp - a.timestamp));
    });
  }, [isLoggedIn]);

  // Load Menu
  useEffect(() => {
    return onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category))) as string[]]);
    });
  }, []);

  // --- 2. KOT + BILL Sequential Printing ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Saving & Printing...");

    try {
      const billNumber = Date.now().toString().slice(-5);
      const token = Math.floor(100 + Math.random() * 900);
      
      const orderObj = { 
        billNumber, tokenNumber: token, 
        customerName: customerName || "Guest", 
        customerPhone: customerPhone ? `+91${customerPhone}` : "",
        items: cart, total: cart.reduce((a,b)=>a+(b.price*b.quantity),0),
        timestamp: new Date(), status: 'completed',
        paymentMethod, source: 'PC-POS' 
      };

      await addDoc(collection(db, "orders"), orderObj);

      // --- DOUBLE PRINTING LOGIC ---
      toast.loading("Printing KOT...", { id: toastId });
      await handlePrintKot(orderObj, pConfig);
      
      await new Promise(r => setTimeout(r, 1500)); // Delay to prevent printer jam
      
      toast.loading("Printing Bill...", { id: toastId });
      await handlePrintReceipt(orderObj, pConfig);

      toast.success("Order Finished!", { id: toastId });
      setCart([]); setCustomerName(''); setCustomerPhone('');
    } catch (err) {
      toast.error("Error saving order", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reprint Function
  const handleReprint = async (order: any) => {
    toast.success(`Reprinting Bill #${order.billNumber}`);
    await handlePrintReceipt(order, pConfig);
  };

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="h-screen w-full bg-[#080808] text-white flex overflow-hidden font-sans">
      <Toaster />

      {/* Side Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#111] flex flex-col shrink-0">
        <div className="p-8 font-black text-2xl text-orange-500 italic">BUM BUM</div>
        <nav className="flex-1 px-4 space-y-2">
          <SidebarBtn icon={<Calculator/>} label="Billing" active={activeTab === 'billing'} onClick={()=>setActiveTab('billing')} />
          <SidebarBtn icon={<Printer/>} label="Reprint Bill" active={activeTab === 'receipts'} onClick={()=>setActiveTab('receipts')} />
          <SidebarBtn icon={<TrendingUp/>} label="Day Report" active={activeTab === 'reports'} onClick={()=>setActiveTab('reports')} />
        </nav>
        <div className="p-6 border-t border-white/5">
           <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20">
              <p className="text-[10px] font-black uppercase text-orange-500">Today's Sale</p>
              <p className="text-2xl font-black font-mono">₹{dailySales.total}</p>
           </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <>
            <div className="flex-1 flex flex-col min-w-0 bg-[#000]">
              <div className="p-6 border-b border-white/5 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" placeholder="Search menu..." className="w-full bg-[#111] border-none rounded-2xl py-3 pl-12" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="p-6 flex gap-2 overflow-x-auto no-scrollbar">
                {categories.map(c => <button key={c} onClick={()=>setSelectedCategory(c)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase ${selectedCategory === c ? 'bg-orange-500' : 'bg-[#111]'}`}>{c}</button>)}
              </div>
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 xl:grid-cols-4 gap-6">
                {products.filter(p => (selectedCategory==='All'||p.category===selectedCategory)&&p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                  <div key={item.id} onClick={()=>setCart([...cart, {...item, quantity: 1}])} className="bg-[#111] p-4 rounded-[30px] border border-white/5 cursor-pointer hover:border-orange-500/50">
                    <div className="h-32 bg-[#1a1a1a] rounded-2xl mb-3" />
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <p className="text-orange-500 font-black">₹{item.price}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="w-[400px] border-l border-white/5 bg-[#111] flex flex-col">
              <div className="p-6 border-b border-white/5 font-black text-lg">Current Order</div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="text-sm font-bold">{item.name}</div>
                    <div className="font-mono text-orange-500">₹{item.price}</div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-[#151515] space-y-4">
                <input type="text" placeholder="Mobile" className="w-full bg-[#111] p-3 rounded-xl" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={()=>setPaymentMethod('cash')} className={`flex-1 py-3 rounded-xl font-black ${paymentMethod==='cash'?'bg-green-600':'bg-white/5'}`}>CASH</button>
                  <button onClick={()=>setPaymentMethod('upi')} className={`flex-1 py-3 rounded-xl font-black ${paymentMethod==='upi'?'bg-blue-600':'bg-white/5'}`}>UPI</button>
                </div>
                <div className="flex justify-between text-2xl font-black"><span>Total:</span><span>₹{cart.reduce((a,b)=>a+(b.price*b.quantity),0)}</span></div>
                <button onClick={handlePlaceOrder} disabled={isSubmitting||cart.length===0} className="w-full bg-orange-600 py-4 rounded-2xl font-black text-xl">PRINT KOT + BILL</button>
              </div>
            </aside>
          </>
        )}

        {/* Reprint Tab */}
        {activeTab === 'receipts' && (
          <div className="flex-1 p-10 space-y-4 overflow-y-auto">
            <h2 className="text-2xl font-black mb-6">Recent Bills (Reprint)</h2>
            {pastReceipts.map(order => (
              <div key={order.id} className="bg-[#111] p-5 rounded-2xl flex justify-between items-center border border-white/5">
                <div>
                  <p className="font-mono text-orange-500">#{order.billNumber}</p>
                  <p className="font-bold">{order.customerName} - ₹{order.total}</p>
                </div>
                <button onClick={()=>handleReprint(order)} className="bg-white/5 p-3 rounded-xl hover:bg-orange-500 transition-all">
                  <Printer size={20} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="flex-1 p-10 grid grid-cols-3 gap-6 content-start">
             <div className="bg-green-600/20 border border-green-600/30 p-8 rounded-[40px]">
                <Banknote size={40} className="text-green-500 mb-4" />
                <p className="text-sm font-bold uppercase text-green-500">Cash Collection</p>
                <p className="text-4xl font-black">₹{dailySales.cash}</p>
             </div>
             <div className="bg-blue-600/20 border border-blue-600/30 p-8 rounded-[40px]">
                <CreditCard size={40} className="text-blue-500 mb-4" />
                <p className="text-sm font-bold uppercase text-blue-500">UPI Collection</p>
                <p className="text-4xl font-black">₹{dailySales.upi}</p>
             </div>
             <div className="bg-orange-600/20 border border-orange-600/30 p-8 rounded-[40px]">
                <TrendingUp size={40} className="text-orange-500 mb-4" />
                <p className="text-sm font-black uppercase text-orange-500">Total Sales</p>
                <p className="text-4xl font-black">₹{dailySales.total}</p>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}

// Helper Components
function SidebarBtn({icon, label, active, onClick, badge}: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
      {icon} <span className="font-bold">{label}</span>
      {badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );
}

function Login({onLogin}: any) {
  const [p, setP] = useState('');
  return (
    <div className="h-screen w-full bg-black flex items-center justify-center">
      <div className="bg-[#111] p-12 rounded-[40px] border border-white/5 w-96 text-center">
        <Lock size={48} className="mx-auto text-orange-500 mb-6" />
        <input type="password" value={p} onChange={e=>setP(e.target.value)} className="w-full bg-black text-center text-4xl font-mono py-4 rounded-2xl mb-6 outline-none" placeholder="****" maxLength={4} />
        <button onClick={()=>{if(p==='1234') onLogin()}} className="w-full bg-orange-600 py-4 rounded-2xl font-black">ACCESS POS</button>
      </div>
    </div>
  );
}
