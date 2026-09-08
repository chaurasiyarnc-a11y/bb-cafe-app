'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc,
  waitForPendingWrites
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  Database, RefreshCw, Layers, Menu, LogOut, Lock, ToggleLeft, ToggleRight, 
  Sun, Moon, Tag, Calculator, TrendingUp, Utensils, User, MapPin, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import CustomizerModal from '@/components/pos/CustomizerModal';
import { handlePrintKot, handlePrintReceipt, PrintConfig } from '@/lib/printerUtils';

// Safe Lucide Icons casting - FIX APPLIED HERE
const SafeLock = Lock as any;
const SafeDatabase = Database as any;
const SafeMenu = Menu as any;
const SafeLogOut = LogOut as any;
const SafeToggleRight = ToggleRight as any;
const SafeToggleLeft = ToggleLeft as any;
const SafeMoon = Moon as any;
const SafeSun = Sun as any;
const SafeShoppingBag = ShoppingBag as any;
const SafeClock = Clock as any; 
const SafeLayers = Layers as any;
const SafePrinter = Printer as any;
const SafeCheck = Check as any;
const SafeSearch = Search as any;
const SafeX = X as any;
const SafeRefreshCw = RefreshCw as any;
const SafeSettings = Settings as any;

interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isReward?: boolean;
  pointsCost?: number;
  note?: string; 
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

let globalAudioCtx: AudioContext | null = null;

export default function BbCafePosDesktop() {
  const DELIVERY_AREAS: DeliveryArea[] = useMemo(() => [
    { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
    { name: "Within 5 KM (5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
    { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
  ], []);

  const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'orders' | 'inventory' | 'receipts' | 'settings'>('billing');
  
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [printerType, setPrinterType] = useState<any>('thermal_bluetooth');
  const [printerConnected, setPrinterConnected] = useState(false);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);
  const [fontSize, setFontSize] = useState<number>(9); 
  const [kotEnabled, setKotEnabled] = useState<boolean>(true); 

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [normalPizzaSize, setNormalPizzaSize] = useState("");
  const [normalPizzaPrice, setNormalPizzaPrice] = useState(0);
  const [customizerChefNote, setCustomizerChefNote] = useState("");
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      } else if (type === 'alarm') {
        osc.type = 'square'; osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); }
    setGstEnabled(localStorage.getItem("bb_pos_gst_enabled") === 'true');
    setGstRate(Number(localStorage.getItem("bb_pos_gst_rate")) || 5);
    setThemeMode((localStorage.getItem("bb_pos_theme") as any) || 'dark');
    const savedCart = localStorage.getItem("bb_pos_saved_cart");
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch (err) {} }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubProd = onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[]]);
    });
    const unsubOrders = onSnapshot(query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50)), (snap) => {
      setLiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProd(); unsubOrders(); };
  }, [isLoggedIn]);

  const activeLiveOrders = useMemo(() => liveOrders.filter((o) => o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const tokenNumber = useMemo(() => Math.floor(100 + Math.random() * 900), [cart.length === 0]);

  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const getGstAmount = () => gstEnabled ? Number(((getCartSubtotal() * gstRate) / 100).toFixed(2)) : 0;
  const getTotalBill = () => Math.max(0, getCartSubtotal() + getGstAmount() - (pointsToRedeem + customDiscount));

  const handleAddProductToCart = (item: any) => {
    triggerBeep('tap');
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price) || 0, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    triggerBeep('tap');
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const toastId = toast.loading("Processing Order...");
    try {
      const billNumber = Date.now().toString().slice(-5);
      const orderObj = { 
        billNumber, tokenNumber, customerName: customerName || "Walk-in Guest", 
        customerPhone: customerPhone ? `+91${customerPhone}` : "", items: cart, 
        subtotal: getCartSubtotal(), total: getTotalBill(), timestamp: new Date(), 
        status: 'completed', fulfillmentType, tableNumber: fulfillmentType === 'table' ? tableNumber : '', 
        paymentMethod, source: 'PC-POS', address 
      };

      await addDoc(collection(db, "orders"), orderObj);
      triggerBeep('success');
      toast.success(`Bill #${billNumber} Success!`, { id: toastId });
      
      const pConfig: PrintConfig = { printerPaperSize, printerType, bleCharacteristic } as any;
      if (kotEnabled) await handlePrintKot(orderObj, pConfig);
      await handlePrintReceipt(orderObj, pConfig);

      setCart([]); setCustomerPhone(''); setCustomerName(''); setIsSubmittingOrder(false);
    } catch (err) {
      toast.error("Failed", { id: toastId });
      setIsSubmittingOrder(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full bg-[#0a0a0a] flex items-center justify-center">
        <Toaster />
        <div className="bg-[#151515] p-12 rounded-[40px] border border-white/5 w-[400px] text-center shadow-2xl">
          <SafeLock size={64} className="text-orange-500 mx-auto mb-8" />
          <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter">Terminal Locked</h1>
          <input 
            type="password" maxLength={4} value={pinInput} 
            onChange={e => setPinInput(e.target.value)} 
            className="w-full bg-[#202020] border-none text-center text-4xl font-mono tracking-[15px] py-5 rounded-2xl text-orange-500 outline-none mb-6"
            autoFocus 
          />
          <button className="w-full bg-orange-600 text-white font-black py-4 rounded-xl">ACCESS TERMINAL</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex overflow-hidden font-sans ${themeMode === 'dark' ? 'bg-[#080808] text-white' : 'bg-slate-50 text-slate-900'}`}>
      <Toaster position="top-right" />

      {/* SIDEBAR */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-[#111] flex flex-col shrink-0">
        <div className="p-8">
          <h1 className="text-xl font-black text-orange-500 tracking-tighter italic">BUM BUM</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarBtn icon={<Calculator size={20}/>} label="Billing" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <SidebarBtn icon={<SafeClock size={20}/>} label="Live Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} badge={activeLiveOrders.length} />
          <SidebarBtn icon={<SafePrinter size={20}/>} label="Receipts" active={activeTab === 'receipts'} onClick={() => setActiveTab('receipts')} />
          <SidebarBtn icon={<SafeLayers size={20}/>} label="Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <SidebarBtn icon={<SafeSettings size={20}/>} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-[#111]/50 border-b border-white/5 flex items-center px-8 gap-6 shrink-0">
          <div className="relative flex-1 max-w-xl">
            <SafeSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" placeholder="Search menu..." 
              className="w-full bg-[#1a1a1a] border-none rounded-2xl py-3 pl-12 pr-6 focus:ring-2 ring-orange-500 outline-none text-sm"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 border-l border-white/10 pl-6 text-sm font-bold">
             <div className="text-right">
                <p>{currentUser?.name}</p>
                <p className="text-[10px] text-green-500 uppercase tracking-widest italic">● Online</p>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {activeTab === 'billing' && (
            <div className="flex-1 flex overflow-hidden">
               <div className="flex-1 flex flex-col overflow-hidden bg-[#000]">
                  <div className="p-6 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
                    {categories.map(cat => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${selectedCategory === cat ? 'bg-orange-500 text-white' : 'bg-[#111] text-slate-500'}`}>{cat}</button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-6 content-start">
                    {products
                      .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(item => (
                        <div key={item.id} onClick={() => handleAddProductToCart(item)} className="bg-[#111] border border-white/5 rounded-[30px] p-4 cursor-pointer hover:border-orange-500/50 transition-all group">
                           <div className="h-32 w-full bg-[#1a1a1a] rounded-[24px] mb-4 overflow-hidden">
                             {item.image ? <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px] font-bold">CAFE</div>}
                           </div>
                           <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                           <p className="text-orange-500 font-mono font-black mt-2">₹{item.price}</p>
                        </div>
                    ))}
                  </div>
               </div>

               <aside className="w-[450px] border-l border-white/5 bg-[#111] flex flex-col shrink-0 shadow-2xl">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#151515]">
                    <h2 className="font-black text-lg">Billing Cart</h2>
                    <span className="text-xs font-mono bg-orange-500/10 text-orange-500 px-3 py-1 rounded-lg">Token: #{tokenNumber}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded-2xl border border-white/5">
                        <div className="flex-1"><p className="font-bold text-sm truncate">{item.name}</p><p className="text-xs text-orange-500 font-mono">₹{item.price * item.quantity}</p></div>
                        <div className="flex items-center gap-3 bg-[#000] rounded-xl px-3 py-1.5 font-bold">
                          <button onClick={() => updateQty(item.id, -1)}>-</button>
                          <span className="font-mono text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-[#151515] border-t border-white/5 space-y-4">
                    <input type="text" maxLength={10} placeholder="Mobile" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-[#111] p-3 rounded-xl text-xs outline-none border border-white/5" />
                    <div className="space-y-2 pt-2 border-t border-white/5">
                       <div className="flex justify-between text-slate-500 text-xs"><span>Subtotal</span><span>₹{getCartSubtotal()}</span></div>
                       <div className="flex justify-between text-xl font-black text-orange-500"><span>Pay</span><span>₹{getTotalBill()}</span></div>
                    </div>
                    <button onClick={handlePlaceOrder} className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3">
                      <SafePrinter size={20}/> CONFIRM & PRINT
                    </button>
                  </div>
               </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );

  function SidebarBtn({ icon, label, active, onClick, badge }: any) {
    return (
      <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all relative group ${active ? 'bg-orange-500 text-white' : 'hover:bg-white/5 text-slate-500'}`}>
        {icon}
        <span className="text-sm font-bold hidden lg:block">{label}</span>
        {badge > 0 && <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{badge}</span>}
      </button>
    );
  }
}
