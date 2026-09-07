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
  Sun, Moon, Utensils, Monitor, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string; 
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

let globalAudioCtx: AudioContext | null = null;

export default function BumBumCafeSingleFileDesktopPOS() {
  const DELIVERY_AREAS: DeliveryArea[] = useMemo(() => [
    { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
    { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
    { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
  ], []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'orders' | 'inventory' | 'receipts' | 'settings'>('billing');

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('80mm');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [kotEnabled, setKotEnabled] = useState<boolean>(true);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);

  // Data States
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Receipts states
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Cart States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [chefInstructions, setChefInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Audio Beep System
  const triggerBeep = (type: 'tap' | 'success' | 'alarm') => {
    try {
      if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);

      if (type === 'tap') {
        osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.03, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.06);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659, globalAudioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime + 0.2);
        osc.stop(globalAudioCtx.currentTime + 0.35);
      } else if (type === 'alarm') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
        osc.frequency.setValueAtTime(1100, globalAudioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("bb_single_pos_user");
    if (savedUser) { try { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); } catch (e) {} }
    
    setGstEnabled(localStorage.getItem("bb_single_gst") === 'true');
    setGstRate(Number(localStorage.getItem("bb_single_gst_rate")) || 5);
    setPrinterPaperSize((localStorage.getItem("bb_single_paper") as any) || '80mm');
    setKotEnabled(localStorage.getItem("bb_single_kot") !== 'false');

    const localTheme = localStorage.getItem("bb_single_theme") || 'dark';
    setThemeMode(localTheme as any);
    if (localTheme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, []);

  // Firestore Live Listeners for Orders
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLiveOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Fetch Products & Categories
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      setLoading(true);
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const items = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
        setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]);
      } catch (e) {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

  // Fetch Past Receipts
  useEffect(() => {
    if (activeTab !== 'receipts') return;
    (async () => {
      try {
        const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
        const snap = await getDocs(q);
        setPastReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {}
    })();
  }, [activeTab]);

  const activeLiveOrders = useMemo(() => liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const pendingOrdersCount = useMemo(() => liveOrders.filter(o => o.status === 'pending').length, [liveOrders]);

  // Audio Alarm for Pending Orders
  useEffect(() => {
    if (pendingOrdersCount > 0) {
      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(() => triggerBeep('alarm'), 3000);
      }
    } else {
      if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
    }
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, [pendingOrdersCount]);

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Verifying PIN...");
    try {
      const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput)));
      toast.dismiss(toastId);
      if (!snap.empty) {
        const uDoc = snap.docs[0].data();
        setIsLoggedIn(true);
        setCurrentUser({ id: snap.docs[0].id, ...uDoc });
        localStorage.setItem("bb_single_pos_user", JSON.stringify({ id: snap.docs[0].id, ...uDoc }));
        toast.success(`Welcome back, ${uDoc.name}!`);
      } else {
        toast.error("Incorrect PIN!");
      }
      setPinInput('');
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Connection error");
    }
  };

  const handleCheckLoyalty = async () => {
    triggerBeep('tap');
    if (customerPhone.trim().length !== 10) return toast.error("Enter valid 10-digit phone number!");
    const toastId = toast.loading("Checking customer...");
    try {
      const snap = await getDoc(doc(db, "customer_points", customerPhone.trim()));
      toast.dismiss(toastId);
      if (snap.exists()) {
        const data = snap.data();
        setCustomerName(data.name || '');
        setCustomerPoints(data.points || 0);
        toast.success(`Customer found: ${data.name} (${data.points} pts)`);
      } else {
        await setDoc(doc(db, "customer_points", customerPhone.trim()), { name: "Walk-in Guest", phone: customerPhone.trim(), points: 0, lastActive: new Date() }, { merge: true });
        setCustomerName("Walk-in Guest");
        setCustomerPoints(0);
        toast.success("New customer registered!");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Lookup failed");
    }
  };

  const handleAddToCart = (item: any) => {
    triggerBeep('tap');
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === item.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price) || 0, quantity: 1 }];
    });
  };

  const handleUpdateQty = (id: string, delta: number) => {
    triggerBeep('tap');
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as PosCartItem[]);
  };

  const getSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const getDeliveryFee = () => (fulfillmentType === 'delivery' && getSubtotal() < selectedArea.minFree) ? selectedArea.fee : 0;
  const getGstAmount = () => gstEnabled ? Number(((getSubtotal() * gstRate) / 100).toFixed(2)) : 0;
  const getLoyaltyDiscount = () => Math.min(pointsToRedeem, getSubtotal());
  const getGrandTotal = () => Math.max(0, getSubtotal() + getGstAmount() - (getLoyaltyDiscount() + customDiscount)) + getDeliveryFee();

  // ==========================================
  // ESC/POS PRINTER & AUTO-CUT LOGIC (INCLUDED)
  // ==========================================
  const executeRawPrint = async (textToPrint: string) => {
    const encoder = new TextEncoder();
    let commandData = textToPrint + "\n";
    commandData += "\x1D\x56\x00"; // ESC/POS Full Auto-Cut Command

    if (bleCharacteristic) {
      try {
        await bleCharacteristic.writeValue(encoder.encode(commandData));
        return;
      } catch (err) {
        console.error("Print error:", err);
      }
    }
    // Fallback browser print dialog
    window.print();
  };

  const printKotSlip = async (order: any) => {
    let kot = "";
    kot += "================================\n";
    kotText_Header: kot += "         KITCHEN KOT            \n";
    kot += "     BUM BUM CAFE, MOHANDRA     \n";
    kot += "================================\n";
    kot += `TOKEN NO : #${order.tokenNumber} \n`;
    kot += `Bill No  : #${order.billNumber} | Type: ${order.fulfillmentType.toUpperCase()}\n`;
    if (order.tableNumber) kot += `Table    : ${order.tableNumber}\n`;
    kot += `Time     : ${new Date().toLocaleTimeString()}\n`;
    kot += "--------------------------------\n";
    kot += "QTY  ITEM NAME                  \n";
    kot += "--------------------------------\n";

    order.items.forEach((item: any) => {
      const q = String(item.quantity).padEnd(4, ' ');
      const n = item.name.substring(0, 26);
      kot += `${q} ${n}\n`;
      if (item.note) kot += `     -> Note: ${item.note}\n`;
    });

    kot += "--------------------------------\n";
    if (order.chefInstructions) {
      kot += `NOTE: ${order.chefInstructions}\n`;
      kot += "--------------------------------\n";
    }
    kot += "\n\n";

    await executeRawPrint(kot);
  };

  const printCustomerBillReceipt = async (order: any) => {
    let bill = "";
    bill += "        *** BUM BUM CAFE ***    \n";
    bill += "      * THE TASTE OF HAPPINESS *  \n";
    bill += "       Mohandra Main Road       \n";
    bill += "================================\n";
    bill += `TOKEN NO : #${order.tokenNumber} \n`;
    bill += `TAX INVOICE # : ${String(order.billNumber).padStart(4, '0')}\n`;
    bill += `Date     : ${new Date().toLocaleString()}\n`;
    bill += `Customer : ${order.customerName} (${order.customerPhone || 'Walk-in'})\n`;
    bill += `Type     : ${order.fulfillmentType.toUpperCase()}\n`;
    if (order.tableNumber) bill += `Table    : ${order.tableNumber}\n`;
    bill += "--------------------------------\n";
    bill += "ITEM              QTY    PRICE  \n";
    bill += "--------------------------------\n";

    order.items.forEach((item: any) => {
      const name = item.name.substring(0, 16).padEnd(16, ' ');
      const qty = String(item.quantity).padStart(3, ' ');
      const price = String(item.price * item.quantity).padStart(6, ' ');
      bill += `${name} ${qty}  ₹${price}\n`;
    });

    bill += "--------------------------------\n";
    bill += `Subtotal:                  ₹${order.subtotal}\n`;
    if (order.discount > 0) bill += `Discount:                 -₹${order.discount}\n`;
    if (order.gstAmount > 0) bill += `GST (${order.gstRate}%):              ₹${order.gstAmount}\n`;
    bill += "--------------------------------\n";
    bill += `GRAND TOTAL:               ₹${order.total}\n`;
    bill += "--------------------------------\n";
    bill += `Payment Mode: ${order.paymentMethod.toUpperCase()}\n`;
    bill += "\n";
    bill += "      [ POWERED BY PHONEPE ]    \n";
    bill += "         BUM BUM CAFE           \n";
    bill += "   Pay via UPI / GPay / PhonePe \n";
    bill += "   UPI ID: Q231198993@ybl       \n";
    bill += "--------------------------------\n";
    bill += "    Thank You! Visit Again :)   \n";
    bill += "\n\n\n";

    await executeRawPrint(bill);
  };

  // Place Order & Sequential Auto-Printing Logic
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      let dailyToken = 1;
      const tokenRef = doc(db, "settings", `token_counter_${todayStr}`);

      const billNumber = await runTransaction(db, async (txn) => {
        const billSnap = await txn.get(doc(db, "settings", "store_bill_counter"));
        const nextBill = billSnap.exists() ? (billSnap.data().nextBillNumber || 6001) : 6001;
        txn.set(doc(db, "settings", "store_bill_counter"), { nextBillNumber: nextBill + 1 });

        const tokenSnap = await txn.get(tokenRef);
        dailyToken = tokenSnap.exists() ? (tokenSnap.data().currentToken || 1) : 1;
        txn.set(tokenRef, { currentToken: dailyToken + 1 });

        return nextBill;
      });

      const orderObj = {
        billNumber,
        tokenNumber: String(dailyToken).padStart(2, '0'),
        customerName: customerName || "Walk-in Guest",
        customerPhone: customerPhone ? `+91${customerPhone}` : "",
        items: cart,
        subtotal: getSubtotal(),
        discount: customDiscount + getLoyaltyDiscount(),
        gstRate: gstEnabled ? gstRate : 0,
        gstAmount: getGstAmount(),
        total: getGrandTotal(),
        timestamp: new Date(),
        status: 'pending',
        fulfillmentType,
        tableNumber: fulfillmentType === 'table' ? tableNumber : '',
        paymentMethod,
        chefInstructions,
        source: 'Single-File Desktop POS'
      };

      await addDoc(collection(db, "orders"), orderObj);
      triggerBeep('success');
      toast.success(`Bill #${billNumber} | Token #${orderObj.tokenNumber} Generated!`);

      // 1. Print Kitchen KOT First
      if (kotEnabled) {
        await printKotSlip(orderObj);
        await new Promise(r => setTimeout(r, 1500)); // Pause for cutter
      }

      // 2. Print Customer Bill Receipt Second
      await printCustomerBillReceipt(orderObj);

      setCart([]); setCustomerPhone(''); setCustomerName(''); setCustomerPoints(0); setPointsToRedeem(0); setCustomDiscount(0); setChefInstructions('');
    } catch (e) {
      console.error(e);
      toast.error("Order processing failed!");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, selectedCategory, searchQuery]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><Lock size={36} /></div>
            <h1 className="text-2xl font-black uppercase text-yellow-500 tracking-wide">Bum Bum Cafe Desktop POS</h1>
            <p className="text-xs text-neutral-400">Single-File Terminal • Enter Cashier PIN</p>
          </div>
          <form onSubmit={handlePinLogin} className="space-y-4">
            <input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter PIN" className="w-full bg-neutral-950 border border-neutral-800 text-center text-3xl font-mono py-4 rounded-2xl outline-none text-orange-400 tracking-widest focus:border-orange-500" autoFocus />
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs shadow-lg transition-all">Unlock POS Terminal</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex h-screen overflow-hidden font-sans bg-neutral-950 text-neutral-100 select-none">
      <Toaster position="top-right" />

      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className="w-20 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center justify-between py-6 shrink-0">
        <div className="flex flex-col items-center gap-6">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl border border-orange-500/20"><Utensils size={24} /></div>
          <div className="flex flex-col gap-2 w-full px-2">
            {[
              { id: 'billing', label: 'Billing', icon: ShoppingBag },
              { id: 'orders', label: 'Live KDS', icon: Clock, badge: pendingOrdersCount },
              { id: 'inventory', label: 'Stock', icon: Layers },
              { id: 'receipts', label: 'Receipts', icon: Printer },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => { triggerBeep('tap'); setActiveTab(tab.id as any); }} className={`relative p-3 rounded-2xl flex flex-col items-center gap-1 transition-all ${isActive ? 'bg-orange-600 text-white shadow-lg' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                  <Icon size={20} />
                  <span className="text-[9px] font-bold uppercase">{tab.label}</span>
                  {tab.badge ? <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-mono font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">{tab.badge}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => { localStorage.removeItem("bb_single_pos_user"); setIsLoggedIn(false); }} className="p-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all" title="Lock Terminal"><LogOut size={20} /></button>
        </div>
      </aside>

      {/* 2. MIDDLE AREA (TABS WORKSPACE) */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-6 gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                <input ref={searchInputRef} type="text" placeholder="Search menu or scan barcode..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-3 px-12 text-sm outline-none text-neutral-100 focus:border-orange-500 transition-all" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-neutral-400">Cashier: <strong className="text-orange-400">{currentUser?.name}</strong></span>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0">
              {categories.map(cat => (
                <button key={cat} onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${selectedCategory === cat ? 'bg-orange-500 text-neutral-950 border-orange-500 shadow-lg' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'}`}>
                  {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={36} /></div>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto flex-1 pr-2 content-start">
                {filteredProducts.map(item => {
                  const isAvail = item.isAvailable !== false;
                  return (
                    <button key={item.id} disabled={!isAvail} onClick={() => handleAddToCart(item)} className={`border rounded-2xl text-left flex flex-col overflow-hidden h-44 transition-all duration-200 active:scale-95 relative group ${isAvail ? 'bg-neutral-900 hover:border-orange-500 border-neutral-800 shadow-md' : 'opacity-40 bg-neutral-900 border-neutral-800 pointer-events-none'}`}>
                      <div className="w-full h-24 bg-neutral-800 relative overflow-hidden">
                        {item.image || item.imageUrl ? (
                          <img src={item.image || item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500 text-[10px] uppercase font-bold">No Image</div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col justify-between flex-grow w-full">
                        <p className="font-bold text-xs line-clamp-2 text-neutral-100">{item.name}</p>
                        <p className="text-xs font-mono font-bold text-orange-400">₹{item.price}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="flex-1 p-6 flex flex-col overflow-hidden">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-4">Live Kitchen Orders (KDS)</h2>
            <div className="grid grid-cols-3 gap-4 overflow-y-auto flex-1">
              {activeLiveOrders.map(order => (
                <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-3">
                      <span className="font-mono font-black text-yellow-500 text-sm">Token #{order.tokenNumber}</span>
                      <span className="bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">Bill #{order.billNumber}</span>
                    </div>
                    <p className="text-xs font-bold text-neutral-300 mb-3">👤 {order.customerName} ({order.fulfillmentType})</p>
                    <div className="space-y-2 border-t border-neutral-800 pt-3 mb-4">
                      {order.items?.map((it: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{it.name}</span>
                          <span className="font-bold text-orange-400">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-neutral-800">
                    <button onClick={() => updateDoc(doc(db, "orders", order.id), { status: 'completed' })} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-2.5 rounded-xl text-[10px] uppercase">Mark Ready / Complete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="flex-1 p-6 flex flex-col overflow-hidden">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-4">Past Receipts & History</h2>
            <div className="space-y-2 overflow-y-auto flex-1">
              {pastReceipts.map(order => (
                <div key={order.id} onClick={() => { setSelectedReceipt(order); setIsReceiptModalOpen(true); }} className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:border-orange-500">
                  <div>
                    <span className="font-mono text-xs font-bold">Token #{order.tokenNumber} | Bill #${order.billNumber}</span>
                    <span className="text-[10px] text-neutral-400 block">{order.customerName}</span>
                  </div>
                  <span className="font-mono font-black text-green-400">₹{order.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 p-6 max-w-xl">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black uppercase text-orange-500">Single-File POS Settings</h3>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <span className="text-xs">Auto Print KOT for Kitchen:</span>
                <button onClick={() => setKotEnabled(!kotEnabled)} className="text-orange-500">
                  {kotEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. RIGHT SIDEBAR (FIXED DESKTOP CART & CHECKOUT PANEL) */}
      <aside className="w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col justify-between p-6 shrink-0 shadow-2xl">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
            <h2 className="text-sm font-black uppercase text-orange-500 flex items-center gap-2"><ShoppingBag size={18} /> Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-[10px] text-red-400 hover:underline font-bold uppercase">Clear All</button>}
          </div>

          <div className="space-y-2 bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800 mb-4 shrink-0">
            <div className="flex gap-2">
              <input type="text" maxLength={10} placeholder="Customer 10-digit Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs outline-none font-mono text-neutral-100" />
              <button onClick={handleCheckLoyalty} className="bg-orange-600 hover:bg-orange-500 text-white px-4 rounded-xl text-xs font-black uppercase">Find</button>
            </div>
            {customerPhone.length === 10 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <input type="text" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs outline-none text-neutral-100" />
              </div>
            )}
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 mb-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 text-xs font-bold uppercase">Cart is empty</div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs truncate text-neutral-100">{item.name}</p>
                    <p className="text-[10px] font-mono text-orange-400">₹{item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleUpdateQty(item.id, -1)} className="w-7 h-7 bg-neutral-800 rounded-lg flex items-center justify-center font-bold text-xs">-</button>
                    <span className="w-6 text-center text-xs font-mono font-bold">{item.quantity}</span>
                    <button onClick={() => handleUpdateQty(item.id, 1)} className="w-7 h-7 bg-neutral-800 rounded-lg flex items-center justify-center font-bold text-xs">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 mb-4 shrink-0">
            {(['table', 'pickup', 'delivery'] as const).map(type => (
              <button key={type} onClick={() => { triggerBeep('tap'); setFulfillmentType(type); }} className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${fulfillmentType === type ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}>{type}</button>
            ))}
          </div>

          <div className="space-y-2 text-xs border-t border-neutral-800 pt-4 mb-4 shrink-0">
            <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span className="font-mono">₹{getSubtotal()}</span></div>
            {fulfillmentType === 'delivery' && <div className="flex justify-between text-neutral-400"><span>Delivery Charge</span><span className="font-mono">₹{getDeliveryFee()}</span></div>}
            <div className="flex justify-between text-base font-black text-green-400 pt-2 border-t border-dashed border-neutral-800">
              <span>Grand Total</span><span className="font-mono">₹{getGrandTotal()}</span>
            </div>
          </div>

          <div className="flex gap-2 mb-3 shrink-0">
            <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}>Cash</button>
            <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-neutral-950 text-neutral-400 border-neutral-800'}`}>UPI</button>
          </div>

          <button onClick={handlePlaceOrder} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-50 shrink-0">
            {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            <span>Place Order & Print (₹{getGrandTotal()})</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
