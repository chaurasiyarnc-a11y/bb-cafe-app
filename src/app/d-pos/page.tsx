'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, ToggleLeft, ToggleRight, Utensils, Trash2, Plus, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// --- Interfaces ---
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
}

let globalAudioCtx: AudioContext | null = null;

export default function BumBumCafeDesktopPOS() {
  // Constants
  const DELIVERY_AREAS: DeliveryArea[] = [
    { name: "Mohandra Town", fee: 20, minFree: 99 },
    { name: "Within 5 KM", fee: 50, minFree: 499 },
    { name: "Within 12 KM", fee: 99, minFree: 999 }
  ];

  // Auth & UI States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'orders' | 'receipts' | 'settings'>('billing');

  // POS Settings
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [kotEnabled, setKotEnabled] = useState(true);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);

  // Data States
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Cart & Customer States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Audio System ---
  const triggerBeep = (type: 'tap' | 'success' | 'alarm') => {
    try {
      if (!globalAudioCtx) globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (globalAudioCtx.state === 'suspended') globalAudioCtx.resume();
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.connect(gain); gain.connect(globalAudioCtx.destination);
      if (type === 'tap') { osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime); gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime); osc.start(); osc.stop(globalAudioCtx.currentTime + 0.05); }
      else if (type === 'success') { osc.frequency.setValueAtTime(800, globalAudioCtx.currentTime); gain.gain.setValueAtTime(0.1, globalAudioCtx.currentTime); osc.start(); osc.stop(globalAudioCtx.currentTime + 0.2); }
    } catch (e) {}
  };

  // --- Effects ---
  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
    return onSnapshot(q, (snap) => setLiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "products"));
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]);
      setLoading(false);
    })();
  }, [isLoggedIn]);

  // --- Printing Engine ---
  const executeRawPrint = async (text: string) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text + "\n\n\n\x1D\x56\x00"); // Text + Paper Cut
      if (bleCharacteristic) {
        await bleCharacteristic.writeValue(data);
      } else {
        console.warn("Printer not connected, using browser print.");
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`<pre>${text}</pre>`);
        printWindow?.print();
        printWindow?.close();
      }
    } catch (err) {
      console.error("Print Error:", err);
      throw new Error("Printer failed");
    }
  };

  const generateBillText = (order: any, isKot: boolean) => {
    let t = "";
    if (isKot) {
      t += "---------- KITCHEN KOT ----------\n";
      t += `TOKEN: #${order.tokenNumber}\n`;
    } else {
      t += "        BUM BUM CAFE        \n";
      t += "   THE TASTE OF HAPPINESS   \n";
      t += "----------------------------\n";
      t += `BILL: #${order.billNumber} | TK: #${order.tokenNumber}\n`;
    }
    t += `TYPE: ${order.fulfillmentType.toUpperCase()}\n`;
    if (order.tableNumber) t += `TABLE: ${order.tableNumber}\n`;
    t += `DATE: ${new Date().toLocaleString()}\n`;
    t += "----------------------------\n";
    order.items.forEach((it: any) => {
      t += `${it.quantity} x ${it.name.substring(0, 18)}\n`;
    });
    t += "----------------------------\n";
    if (!isKot) t += `TOTAL: Rs. ${order.total}\n\n`;
    return t;
  };

  // --- Core Functions ---
  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234') { // Default PIN
        const user = { name: "Cashier 1", role: "admin" };
        setIsLoggedIn(true); setCurrentUser(user);
        localStorage.setItem("bb_pos_user", JSON.stringify(user));
    } else {
        toast.error("Invalid PIN");
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const toastId = toast.loading("Processing Order...");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const tokenRef = doc(db, "settings", `token_${today}`);
      const billRef = doc(db, "settings", "bill_counter");

      // 1. Transaction for unique numbers
      const { billNo, tokenNo } = await runTransaction(db, async (txn) => {
        const bSnap = await txn.get(billRef);
        const tSnap = await txn.get(tokenRef);
        
        const nextBill = bSnap.exists() ? (bSnap.data().value + 1) : 1001;
        const nextToken = tSnap.exists() ? (tSnap.data().value + 1) : 1;

        txn.set(billRef, { value: nextBill }, { merge: true });
        txn.set(tokenRef, { value: nextToken }, { merge: true });

        return { billNo: nextBill, tokenNo: nextToken };
      });

      const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const orderData = {
        billNumber: billNo,
        tokenNumber: String(tokenNo).padStart(2, '0'),
        items: cart,
        total: subtotal,
        status: 'pending',
        fulfillmentType,
        tableNumber: fulfillmentType === 'table' ? tableNumber : '',
        customerName: customerName || "Walk-in",
        customerPhone,
        paymentMethod,
        timestamp: new Date()
      };

      // 2. Save Order
      await addDoc(collection(db, "orders"), orderData);
      
      toast.success("Order Saved Successfully!", { id: toastId });
      triggerBeep('success');

      // 3. Separate Printing Logic (Doesn't crash the UI if fails)
      try {
        if (kotEnabled) await executeRawPrint(generateBillText(orderData, true));
        await new Promise(r => setTimeout(r, 500));
        await executeRawPrint(generateBillText(orderData, false));
      } catch (pErr) {
        toast.error("Printer Error, but order saved!");
      }

      setCart([]); setCustomerPhone(''); setCustomerName('');
    } catch (err: any) {
      console.error(err);
      toast.error("Database Error: " + err.message, { id: toastId });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const addToCart = (p: any) => {
    triggerBeep('tap');
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <form onSubmit={handlePinLogin} className="bg-neutral-900 p-8 rounded-3xl border border-neutral-800 w-80 text-center space-y-6">
          <div className="flex flex-col items-center gap-2">
            <Lock className="text-orange-500" size={40} />
            <h1 className="text-xl font-black uppercase tracking-widest">Bum Bum POS</h1>
          </div>
          <input 
            type="password" 
            value={pinInput} 
            onChange={e => setPinInput(e.target.value)}
            className="w-full bg-black border border-neutral-700 rounded-xl py-4 text-center text-2xl tracking-[1em] outline-none focus:border-orange-500" 
            placeholder="****"
            autoFocus
          />
          <button className="w-full bg-orange-600 py-4 rounded-xl font-bold uppercase hover:bg-orange-500 transition-all">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-black text-neutral-200 overflow-hidden font-sans">
      <Toaster position="top-right" />
      
      {/* Sidebar Nav */}
      <nav className="w-20 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-6 gap-8">
        <div className="text-orange-500 mb-4"><Utensils size={32} /></div>
        <button onClick={() => setActiveTab('billing')} className={`p-3 rounded-2xl ${activeTab === 'billing' ? 'bg-orange-600 text-white' : 'text-neutral-500'}`}><ShoppingBag /></button>
        <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-2xl ${activeTab === 'orders' ? 'bg-orange-600 text-white' : 'text-neutral-500'}`}><Clock /></button>
        <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-2xl ${activeTab === 'settings' ? 'bg-orange-600 text-white' : 'text-neutral-500'}`}><Settings /></button>
        <button onClick={() => setIsLoggedIn(false)} className="mt-auto text-red-500 p-3"><LogOut /></button>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden gap-6">
            <div className="flex justify-between items-center">
              <div className="relative w-96">
                <Search className="absolute left-4 top-3 text-neutral-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search Menu..." 
                  className="w-full bg-neutral-900 rounded-xl py-3 pl-12 pr-4 outline-none border border-neutral-800 focus:border-orange-500"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                {categories.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setSelectedCategory(c)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${selectedCategory === c ? 'bg-orange-600' : 'bg-neutral-900 text-neutral-400'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-4 xl:grid-cols-5 gap-4 content-start pr-2">
              {products
                .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => addToCart(p)}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-left hover:border-orange-500 transition-all active:scale-95 group"
                  >
                    <div className="h-24 bg-neutral-800 rounded-lg mb-3 overflow-hidden">
                      {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" />}
                    </div>
                    <h3 className="font-bold text-sm line-clamp-1">{p.name}</h3>
                    <p className="text-orange-500 font-mono font-bold mt-1">₹{p.price}</p>
                  </button>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="p-6 grid grid-cols-3 gap-4 overflow-y-auto">
            {liveOrders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between">
                  <span className="bg-orange-600 px-2 py-1 rounded text-[10px] font-black uppercase">TK: #{order.tokenNumber}</span>
                  <span className="text-neutral-500 text-[10px] font-mono">{new Date(order.timestamp?.toDate()).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-1">
                  {order.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{it.name}</span>
                      <span className="font-bold">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, "orders", order.id), { status: 'completed' })}
                  className="w-full bg-green-600 py-2 rounded-xl text-xs font-bold uppercase"
                >
                  Mark Ready
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Right Cart Panel */}
      <aside className="w-96 bg-neutral-900 border-l border-neutral-800 flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black uppercase flex items-center gap-2"><ShoppingBag className="text-orange-500" /> Cart</h2>
          <button onClick={() => setCart([])} className="text-neutral-500 hover:text-red-500 transition-all"><Trash2 size={20} /></button>
        </div>

        <div className="space-y-2 mb-6">
          <input 
            placeholder="Customer Phone" 
            className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
          />
          {customerPhone && (
            <input 
              placeholder="Customer Name" 
              className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-500"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-6">
          {cart.map(item => (
            <div key={item.id} className="bg-black border border-neutral-800 p-3 rounded-xl flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-4">
                <h4 className="text-xs font-bold truncate">{item.name}</h4>
                <p className="text-orange-500 text-[10px] font-mono">₹{item.price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                  className="p-1 bg-neutral-800 rounded"
                ><Minus size={14}/></button>
                <span className="text-xs font-mono w-4 text-center">{item.quantity}</span>
                <button 
                  onClick={() => setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                  className="p-1 bg-neutral-800 rounded"
                ><Plus size={14}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 border-t border-neutral-800 pt-6">
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-xl text-orange-500 font-mono">₹{cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setPaymentMethod('cash')}
              className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${paymentMethod === 'cash' ? 'bg-green-600 border-green-600' : 'border-neutral-800'}`}
            >Cash</button>
            <button 
              onClick={() => setPaymentMethod('upi')}
              className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${paymentMethod === 'upi' ? 'bg-blue-600 border-blue-600' : 'border-neutral-800'}`}
            >UPI</button>
          </div>

          <button 
            disabled={cart.length === 0 || isSubmittingOrder}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-600 py-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            {isSubmittingOrder ? <Loader2 className="animate-spin" /> : <Printer size={20} />}
            Place & Print
          </button>
        </div>
      </aside>
    </div>
  );
}
