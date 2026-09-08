'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, getDocs, where, setDoc, Timestamp 
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Calculator, TrendingUp, Utensils, Banknote, CreditCard, Keyboard, Layers, Cpu, Link, Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Printer Utils
import { handlePrintKot, handlePrintReceipt, PrintConfig } from '@/lib/printerUtils';

// --- Interfaces ---
interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

let globalAudioCtx: AudioContext | null = null;

export default function BbCafePosDesktop() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'receipts' | 'reports' | 'inventory' | 'printer_setup'>('billing');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [tableNumber, setTableNumber] = useState('1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  const [dailySales, setDailySales] = useState({ total: 0, cash: 0, upi: 0, count: 0 });
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);

  // USB Printer State
  const [usbDevice, setUsbDevice] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('80mm');

  // Token Number Logic
  const tokenNumber = useMemo(() => {
    return Math.floor(100 + Math.random() * 900);
  }, [cart.length === 0]);

  // Printer Config for 80mm
  const pConfig: PrintConfig = { 
    printerPaperSize: '80mm', 
    printerType: usbDevice ? 'thermal_usb' : 'thermal_bluetooth',
    usbDevice: usbDevice,
    fontSize: 12
  } as any;

  // --- Audio Feedback ---
  const triggerBeep = (type: 'tap' | 'success') => {
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

  // --- Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'F1') setPaymentMethod('cash');
      if (e.key === 'F2') setPaymentMethod('upi');
      if (e.ctrlKey && e.key === 'Enter') handlePlaceOrder();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMethod, isSubmittingOrder]);

  // --- Firebase Sync ---
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
    
    return onSnapshot(qStats, (snap) => {
      let t = 0, c = 0, u = 0;
      const list = snap.docs.map(d => {
        const data = d.data() as any;
        if(data.status === 'completed') {
          t += (Number(data.total) || 0);
          if(data.paymentMethod === 'cash') c += (Number(data.total) || 0);
          if(data.paymentMethod === 'upi') u += (Number(data.total) || 0);
        }
        return { id: d.id, ...data };
      });
      setDailySales({ total: t, cash: c, upi: u, count: list.length });
      setPastReceipts(list.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });
  }, [isLoggedIn]);

  // --- IMPORTANT: Order & Sequential Printing Logic ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const toastId = toast.loading("Saving & Printing...");

    try {
      const billNumber = Date.now().toString().slice(-5);
      const orderTotal = cart.reduce((a,b) => a + (b.price * b.quantity), 0);
      const orderObj = { 
        billNumber, tokenNumber, items: cart, total: orderTotal, 
        customerName: customerName || "Guest", customerPhone: customerPhone ? `+91${customerPhone}` : "",
        timestamp: new Date(), status: 'completed', paymentMethod, fulfillmentType, 
        tableNumber: fulfillmentType === 'table' ? tableNumber : '', source: 'PC-POS'
      };

      // 1. Save to Database
      await addDoc(collection(db, "orders"), orderObj);
      triggerBeep('success');

      // 2. Printing KOT
      toast.loading("Printing KOT (Step 1/2)...", { id: toastId });
      await handlePrintKot(orderObj, pConfig);
      
      // --- CRITICAL DELAY FOR 80mm PRINTERS ---
      // 3.5 सेकंड का इंतज़ार ताकि प्रिंटर KOT काटकर फ्री हो जाए
      await new Promise(r => setTimeout(r, 3500)); 
      
      // 3. Printing Bill
      toast.loading("Printing Customer Bill (Step 2/2)...", { id: toastId });
      await handlePrintReceipt(orderObj, pConfig);

      toast.success(`Success! Bill #${billNumber} Printed.`, { id: toastId });
      setCart([]); setCustomerName(''); setCustomerPhone('');
    } catch (err) {
      console.error(err);
      toast.error("Printer Busy or Not Connected. Try Reprint.", { id: toastId });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const connectUsbPrinter = async () => {
    setIsConnecting(true);
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      try { await device.claimInterface(0); } catch (e) { await device.claimInterface(1); }
      setUsbDevice(device);
      toast.success(`80mm Printer Connected: ${device.productName}`);
    } catch (err: any) {
      toast.error("Connection Failed. Check Driver.");
    } finally { setIsConnecting(false); }
  };

  if (!isLoggedIn) return (
    <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center font-sans">
      <div className="bg-[#111] p-12 rounded-[40px] border border-white/5 w-[400px] text-center">
        <Lock size={64} className="text-orange-500 mx-auto mb-8" />
        <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && pinInput==='1234' && setIsLoggedIn(true)} className="w-full bg-[#1a1a1a] border-none text-center text-5xl font-mono tracking-[15px] py-6 rounded-2xl text-orange-500 outline-none mb-6" autoFocus placeholder="****" />
        <button onClick={()=>pinInput==='1234' && setIsLoggedIn(true)} className="w-full bg-orange-600 text-white font-black py-4 rounded-xl uppercase">Unlock</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-[#080808] text-white flex overflow-hidden font-sans select-none">
      <Toaster position="top-right" />

      {/* --- SIDEBAR --- */}
      <aside className="w-64 border-r border-white/5 bg-[#111] flex flex-col shrink-0">
        <div className="p-8 border-b border-white/5 text-center">
          <h1 className="text-2xl font-black text-orange-500 italic">BUM BUM CAFE</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">80mm Professional</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarBtn icon={<Calculator size={20}/>} label="Billing" active={activeTab === 'billing'} onClick={()=>setActiveTab('billing')} />
          <SidebarBtn icon={<Printer size={20}/>} label="History" active={activeTab === 'receipts'} onClick={()=>setActiveTab('receipts')} />
          <SidebarBtn icon={<TrendingUp size={20}/>} label="Reports" active={activeTab === 'reports'} onClick={()=>setActiveTab('reports')} />
          <SidebarBtn icon={<Cpu size={20}/>} label="Setup" active={activeTab === 'printer_setup'} onClick={()=>setActiveTab('printer_setup')} />
        </nav>
        <div className="p-6 border-t border-white/5 bg-[#0a0a0a]">
           <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 mb-4 text-center">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Today's Sales</p>
              <p className="text-2xl font-black font-mono">₹{dailySales.total}</p>
           </div>
           <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center gap-3 text-slate-500 hover:text-red-500 font-bold text-sm w-full p-2">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex overflow-hidden bg-[#000]">
        
        {activeTab === 'billing' && (
          <>
            <div className="flex-1 flex flex-col min-w-0">
              <header className="p-6 border-b border-white/5 bg-[#111]/50 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input ref={searchInputRef} type="text" placeholder="Search dish..." className="w-full bg-[#1a1a1a] border-none rounded-2xl py-4 pl-12 text-lg outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
                </div>
              </header>

              <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar shrink-0 bg-[#0a0a0a]">
                {categories.map(c => <button key={c} onClick={()=>setSelectedCategory(c)} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === c ? 'bg-orange-500 text-white shadow-lg' : 'bg-[#1a1a1a] text-slate-500 hover:text-white'}`}>{c}</button>)}
              </div>

              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 content-start">
                {products.filter(p => (selectedCategory==='All'||p.category===selectedCategory)&&p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                  <div key={item.id} onClick={()=>setCart([...cart, {...item, quantity: 1}])} 
                       className={`bg-[#111] border border-white/5 rounded-[40px] p-5 cursor-pointer hover:border-orange-500/50 transition-all group overflow-hidden active:scale-95 ${item.isAvailable === false ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                    <div className="aspect-[4/3] w-full bg-[#1a1a1a] rounded-[30px] mb-4 overflow-hidden flex items-center justify-center">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-duration-500" alt={item.name} /> : <div className="text-white/5 font-black text-2xl uppercase italic">Bum Bum</div>}
                    </div>
                    <h3 className="font-bold text-sm uppercase tracking-tight line-clamp-1">{item.name}</h3>
                    <p className="text-orange-500 font-black text-xl font-mono mt-1">₹{item.price}</p>
                  </div>
                ))}
              </div>

              <div className="h-12 bg-orange-600 flex items-center px-10 gap-8 shrink-0 text-[10px] font-black uppercase">
                 <div className="flex items-center gap-2"><Keyboard size={16}/> Keys:</div>
                 <div className="bg-black/20 px-3 py-1 rounded-lg">F1: Cash</div>
                 <div className="bg-black/20 px-3 py-1 rounded-lg">F2: UPI</div>
                 <div className="bg-black/20 px-3 py-1 rounded-lg">Ctrl+Enter: Save & Print</div>
              </div>
            </div>

            {/* --- RIGHT CART --- */}
            <aside className="w-[480px] border-l border-white/5 bg-[#111] flex flex-col shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#151515]">
                <h2 className="font-black text-xl flex items-center gap-3 italic"><Utensils size={24} className="text-orange-500"/> Order Cart</h2>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Token</p>
                  <p className="text-3xl font-black text-orange-500 font-mono italic leading-none">#{tokenNumber}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-40">
                    <ShoppingBag size={100} strokeWidth={1} />
                    <p className="mt-4 font-black uppercase text-sm">Cart is empty</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <motion.div layout initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} key={idx} className="flex justify-between items-center bg-black/30 p-4 rounded-3xl border border-white/5">
                      <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate uppercase tracking-tight">{item.name}</p>
                          <p className="text-xs text-orange-500 font-bold font-mono">₹{item.price} x {item.quantity}</p>
                      </div>
                      <button onClick={()=>setCart(cart.filter((_,i)=>i!==idx))} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg"><X size={16}/></button>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-8 bg-[#151515] border-t border-white/5 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Mobile" className="bg-[#000] p-4 rounded-2xl outline-none text-sm font-bold border border-white/5 focus:ring-1 ring-orange-500" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} />
                    <input type="text" placeholder="Name" className="bg-[#000] p-4 rounded-2xl outline-none text-sm font-bold border border-white/5 focus:ring-1 ring-orange-500" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
                </div>
                <div className="flex bg-[#000] p-1.5 rounded-2xl">
                    <button onClick={()=>setPaymentMethod('cash')} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${paymentMethod==='cash'?'bg-green-600 text-white shadow-lg':'text-slate-500'}`}>CASH (F1)</button>
                    <button onClick={()=>setPaymentMethod('upi')} className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${paymentMethod==='upi'?'bg-blue-600 text-white shadow-lg':'text-slate-500'}`}>UPI (F2)</button>
                </div>
                <div className="flex justify-between items-end border-t border-white/5 pt-4">
                    <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest italic">Payable Amount</span>
                    <span className="text-5xl font-black text-orange-500 font-mono tracking-tighter italic">₹{cart.reduce((a,b)=>a+(b.price*b.quantity),0)}</span>
                </div>
                <button disabled={isSubmittingOrder||cart.length===0} onClick={handlePlaceOrder} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-black py-5 rounded-[28px] text-xl shadow-2xl active:scale-95 transition-all">
                  COMPLETE & PRINT (KOT+BILL)
                </button>
              </div>
            </aside>
          </>
        )}

        {/* --- PRINTER SETUP --- */}
        {activeTab === 'printer_setup' && (
          <div className="flex-1 p-12 overflow-y-auto space-y-10">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Printer Terminal</h2>
            <div className="grid grid-cols-2 gap-10 max-w-5xl">
              <div className="bg-[#111] p-10 rounded-[50px] border border-white/5 space-y-6 shadow-xl">
                 <Link size={48} className="text-orange-500" />
                 <h3 className="text-xl font-black uppercase tracking-tight">Direct USB Link</h3>
                 <p className="text-sm text-slate-500 leading-relaxed italic">USB केबल को PC से जोड़ें और नीचे दिए गए बटन पर क्लिक करें। 80mm प्रिंटर के लिए Zadig ड्राइवर का उपयोग करें।</p>
                 <button onClick={connectUsbPrinter} disabled={isConnecting} className="w-full bg-orange-600 font-black py-5 rounded-[25px] flex items-center justify-center gap-3 shadow-lg hover:bg-orange-500 transition-all active:scale-95">
                    {isConnecting ? <Loader2 className="animate-spin"/> : <Search size={20}/>}
                    DETECT USB PRINTER
                 </button>
              </div>
              <div className="bg-[#111] p-10 rounded-[50px] border border-white/5 flex flex-col justify-center text-center shadow-xl">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Connection Status</p>
                 <div className={`p-8 rounded-[35px] flex flex-col items-center gap-4 border ${usbDevice ? 'bg-green-600/10 text-green-500 border-green-600/20' : 'bg-red-600/10 text-red-500 border-red-600/20'}`}>
                    {usbDevice ? <Wifi size={48} /> : <X size={48} />}
                    <p className="text-2xl font-black uppercase tracking-tighter">{usbDevice ? usbDevice.productName : "NONE DETECTED"}</p>
                 </div>
                 {usbDevice && (
                    <button onClick={async () => {
                      const encoder = new TextEncoder();
                      const data = encoder.encode("\x1B\x40\x1B\x61\x01BUM BUM CAFE\nPRINTER WORKING OK\n\n\x1D\x56\x41\x03");
                      await usbDevice.transferOut(1, data);
                      toast.success("Test print sent!");
                    }} className="mt-8 text-[10px] font-black uppercase text-orange-500 border border-orange-500/20 py-4 rounded-3xl hover:bg-orange-500 hover:text-white transition-all">Send Test Page</button>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* --- REPORTS & REPRINT --- */}
        {activeTab === 'reports' && (
          <div className="flex-1 p-12 grid grid-cols-3 gap-8 content-start">
             <ReportCard icon={<Banknote/>} label="Cash" value={dailySales.cash} color="text-green-500" bg="bg-green-500/10" />
             <ReportCard icon={<CreditCard/>} label="UPI" value={dailySales.upi} color="text-blue-500" bg="bg-blue-500/10" />
             <ReportCard icon={<TrendingUp/>} label="Total" value={dailySales.total} color="text-orange-500" bg="bg-orange-500/10" />
          </div>
        )}

        {activeTab === 'receipts' && (
           <div className="flex-1 p-12 overflow-y-auto space-y-4">
              <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Billing Records</h2>
              <div className="grid grid-cols-2 gap-6">
                {pastReceipts.map(order => (
                  <div key={order.id} className="bg-[#111] p-8 rounded-[40px] flex justify-between items-center border border-white/5 hover:border-orange-500/50 group transition-all shadow-lg">
                    <div className="flex gap-8 items-center">
                      <div className="bg-black/50 px-6 py-4 rounded-3xl text-center shadow-inner">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Token</p>
                        <p className="text-3xl font-black text-orange-500 font-mono italic leading-none mt-2">#{order.tokenNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-mono tracking-tighter italic mb-1">Bill: #{order.billNumber}</p>
                        <p className="text-xl font-black italic">{order.customerName} - <span className="text-green-500 font-mono">₹{order.total}</span></p>
                      </div>
                    </div>
                    <button onClick={() => handlePrintReceipt(order, pConfig)} className="bg-orange-600 text-white p-5 rounded-3xl opacity-0 group-hover:opacity-100 shadow-xl active:scale-90 transition-all"><Printer size={24}/></button>
                  </div>
                ))}
              </div>
           </div>
        )}
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function SidebarBtn({icon, label, active, onClick}: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
      <span className={`${active ? 'text-white' : 'group-hover:text-orange-500'} transition-colors`}>{icon}</span>
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function ReportCard({icon, label, value, color, bg}: any) {
  return (
      <div className={`${bg} border border-white/5 p-12 rounded-[50px] transition-all hover:scale-105 shadow-lg`}>
          <div className={`${color} mb-6`}>{React.cloneElement(icon as React.ReactElement, { size: 56 })}</div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
          <p className="text-5xl font-black font-mono italic tracking-tighter mt-4">₹{value}</p>
      </div>
  )
}
