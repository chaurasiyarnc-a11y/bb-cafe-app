'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  Database, RefreshCw, Layers, Menu, LogOut, Lock, ToggleLeft, ToggleRight, 
  Sun, Moon, Utensils, Trash2, Plus, Minus, Wifi, Image as ImageIcon, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// --- Constants ---
const DELIVERY_AREAS = [
  { name: "Mohandra Town", fee: 20, minFree: 99 },
  { name: "Within 5 KM", fee: 50, minFree: 499 },
  { name: "Within 12 KM", fee: 99, minFree: 999 }
];

const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  RESET: ESC + '@',
  CENTER: ESC + 'a' + '\x01',
  LEFT: ESC + 'a' + '\x00',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_SIZE: GS + '!' + '\x11', 
  NORMAL_SIZE: GS + '!' + '\x00',
  CUT: GS + 'V' + '\x41' + '\x03',
};

export default function BumBumCafePOS() {
  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'orders' | 'receipts' | 'settings'>('billing');
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [fulfillmentType, setFulfillmentType] = useState<'table' | 'pickup' | 'delivery'>('table');
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [printerPort, setPrinterPort] = useState<any>(null);

  // --- Functions ---
  const triggerBeep = (t: string) => {}; // Audio Context can be added here

  const connectPrinter = async () => {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      setPrinterPort(port);
      toast.success("80mm Printer Ready!");
    } catch (err) {
      toast.error("Printer Connection Failed");
    }
  };

  const handleCheckLoyalty = async () => {
    if (customerPhone.length !== 10) return toast.error("Enter 10 digit number");
    const snap = await getDoc(doc(db, "customer_points", customerPhone));
    if (snap.exists()) {
      setCustomerName(snap.data().name);
      setCustomerPoints(snap.data().points || 0);
      toast.success("Customer Found!");
    } else {
      toast.error("New Customer");
      setCustomerName("Walk-in Guest");
    }
  };

  const printDirect = async (order: any) => {
    if (!printerPort) return;
    const writer = printerPort.writable.getWriter();
    const encoder = new TextEncoder();
    try {
      let b = CMD.RESET + CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_SIZE + "KITCHEN KOT\n" + CMD.NORMAL_SIZE;
      b += `TOKEN: #${order.tokenNumber}\n` + CMD.LEFT + "------------------------------------------\n";
      order.items.forEach((it: any) => { b += `${it.quantity} x ${it.name}\n`; });
      b += "------------------------------------------\n\n\n";

      b += CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_SIZE + "BUM BUM CAFE\n" + CMD.NORMAL_SIZE;
      b += "------------------------------------------\n" + CMD.LEFT;
      b += `BILL: #${order.billNumber} | TK: #${order.tokenNumber}\n`;
      b += `DATE: ${new Date().toLocaleString()}\n------------------------------------------\n`;
      order.items.forEach((it: any) => {
        b += `${it.name.substring(0, 20).padEnd(20)} ${it.quantity}  ${it.price * it.quantity}\n`;
      });
      b += "------------------------------------------\n" + CMD.CENTER + CMD.BOLD_ON;
      b += `TOTAL: Rs. ${order.total}\n` + CMD.NORMAL_SIZE + "\nThank You!\n\n\n" + CMD.CUT;

      await writer.write(encoder.encode(b));
    } finally {
      writer.releaseLock();
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { billNo, tokenNo } = await runTransaction(db, async (txn) => {
        const bRef = doc(db, "settings", "bill_counter");
        const tRef = doc(db, "settings", `token_${today}`);
        const bSnap = await txn.get(bRef);
        const tSnap = await txn.get(tRef);
        const nb = bSnap.exists() ? bSnap.data().value + 1 : 1001;
        const nt = tSnap.exists() ? tSnap.data().value + 1 : 1;
        txn.set(bRef, { value: nb }, { merge: true });
        txn.set(tRef, { value: nt }, { merge: true });
        return { billNo: nb, tokenNo: nt };
      });

      const orderData = {
        billNumber: billNo,
        tokenNumber: String(tokenNo).padStart(2, '0'),
        items: cart,
        total: cart.reduce((a, b) => a + (b.price * b.quantity), 0),
        status: 'pending',
        timestamp: new Date(),
        customerName, customerPhone, fulfillmentType, tableNumber, paymentMethod
      };

      await addDoc(collection(db, "orders"), orderData);
      if (printerPort) await printDirect(orderData);
      
      setCart([]); setIsCartOpen(false);
      toast.success("Order Successful!");
    } catch (e) {
      toast.error("Failed to place order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const q = query(collection(db, "products"));
    getDocs(q).then(snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]);
    });
    
    const oq = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(20));
    return onSnapshot(oq, (snap) => setLiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  if (!isLoggedIn) return (
    <div className="h-screen bg-black flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-neutral-900 p-8 rounded-3xl border border-neutral-800 w-full max-w-sm text-center">
        <Utensils className="mx-auto text-orange-500 mb-4" size={48} />
        <h1 className="text-xl font-black mb-6 uppercase tracking-widest text-white">Bum Bum POS Login</h1>
        <input 
          type="password" value={pinInput} onChange={e => setPinInput(e.target.value)}
          className="w-full bg-black border border-neutral-700 rounded-2xl py-4 text-center text-3xl mb-6 outline-none focus:border-orange-500 text-white" 
          placeholder="PIN"
        />
        <button onClick={() => pinInput === '1234' ? setIsLoggedIn(true) : toast.error("Wrong PIN")} className="w-full bg-orange-600 py-4 rounded-2xl font-bold uppercase text-white">Unlock Terminal</button>
      </motion.div>
    </div>
  );

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden">
      <Toaster />
      
      {/* Sidebar Navigation */}
      <aside className="w-20 border-r border-neutral-900 flex flex-col items-center py-8 gap-8">
        <div className="p-3 bg-orange-600 rounded-2xl shadow-lg shadow-orange-600/20"><Utensils size={24} /></div>
        <button onClick={() => setActiveTab('billing')} className={`p-3 rounded-xl ${activeTab === 'billing' ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500'}`}><ShoppingBag /></button>
        <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-xl ${activeTab === 'orders' ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500'}`}><Clock /></button>
        <button onClick={connectPrinter} className={`p-3 rounded-xl ${printerPort ? 'bg-green-600' : 'bg-neutral-800'}`}><Wifi /></button>
        <button onClick={() => setIsLoggedIn(false)} className="mt-auto text-red-500"><LogOut /></button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <header className="flex justify-between items-center mb-6">
              <div className="relative w-96">
                <Search className="absolute left-4 top-3 text-neutral-500" size={20} />
                <input 
                  type="text" placeholder="Search menu..." 
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 rounded-2xl py-3 pl-12 pr-4 border border-neutral-800 outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex gap-2">
                {categories.map(c => (
                  <button key={c} onClick={() => setSelectedCategory(c)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${selectedCategory === c ? 'bg-orange-600 text-white' : 'bg-neutral-900 text-neutral-500'}`}>{c}</button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto grid grid-cols-4 xl:grid-cols-6 gap-4 pr-2">
              {products
                .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                <button 
                  key={p.id} 
                  onClick={() => {
                    const ex = cart.find(i => i.id === p.id);
                    if (ex) setCart(cart.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i));
                    else setCart([...cart, { ...p, quantity: 1 }]);
                    setIsCartOpen(true);
                  }}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3 text-left hover:border-orange-500 transition-all group active:scale-95"
                >
                  <div className="h-32 bg-neutral-800 rounded-2xl mb-3 overflow-hidden">
                    {(p.image || p.imageUrl) ? (
                      <img src={p.image || p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-neutral-700" /></div>
                    )}
                  </div>
                  <h3 className="font-bold text-sm truncate">{p.name}</h3>
                  <p className="text-orange-500 font-black">₹{p.price}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="p-6 grid grid-cols-3 gap-4 overflow-y-auto">
            {liveOrders.map(order => (
              <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="bg-orange-600 px-3 py-1 rounded-lg text-xs font-black">TK: #{order.tokenNumber}</span>
                  <span className="text-neutral-500 text-[10px] uppercase font-bold">{order.fulfillmentType}</span>
                </div>
                <div className="space-y-2 border-y border-neutral-800 py-3">
                  {order.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-neutral-300">{it.name}</span>
                      <span className="font-black">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, "orders", order.id), { status: 'completed' })}
                  className="w-full bg-green-600 py-3 rounded-xl text-xs font-black uppercase hover:bg-green-500"
                >Mark as Ready</button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Right Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.aside 
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            className="w-[420px] bg-neutral-900 border-l border-neutral-800 flex flex-col p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase flex items-center gap-2"><ShoppingBag className="text-orange-500" /> Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-neutral-800 rounded-full"><X size={18}/></button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex gap-2">
                <input 
                  placeholder="Customer Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-500"
                />
                <button onClick={handleCheckLoyalty} className="bg-orange-600 px-4 rounded-xl text-xs font-bold uppercase">Find</button>
              </div>
              {customerName && <p className="text-xs text-yellow-500 font-bold px-1">👤 {customerName} | Points: {customerPoints}</p>}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {cart.map(item => (
                <div key={item.id} className="bg-black/40 border border-neutral-800 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-bold text-sm truncate">{item.name}</p>
                    <p className="text-orange-500 font-mono text-xs">₹{item.price * item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-neutral-900 p-1.5 rounded-xl">
                    <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-1 hover:bg-neutral-800 rounded"><Minus size={14}/></button>
                    <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-1 hover:bg-neutral-800 rounded"><Plus size={14}/></button>
                  </div>
                  <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="ml-2 text-neutral-600 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-neutral-800 pt-6 space-y-4">
              <div className="grid grid-cols-3 gap-2 bg-black p-1 rounded-2xl mb-2">
                {['table', 'pickup', 'delivery'].map(type => (
                  <button key={type} onClick={() => setFulfillmentType(type as any)} className={`py-2 rounded-xl text-[10px] font-black uppercase ${fulfillmentType === type ? 'bg-neutral-800 text-orange-500' : 'text-neutral-500'}`}>{type}</button>
                ))}
              </div>
              <div className="flex justify-between items-end mb-4">
                <span className="text-neutral-500 font-bold uppercase text-xs tracking-widest">Total Amount</span>
                <span className="text-3xl font-black text-orange-500 font-mono">₹{cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</span>
              </div>
              <button 
                disabled={cart.length === 0 || isSubmittingOrder}
                onClick={handlePlaceOrder}
                className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-3xl font-black text-lg uppercase flex items-center justify-center gap-3 shadow-lg shadow-orange-600/20 disabled:opacity-50"
              >
                {isSubmittingOrder ? <Loader2 className="animate-spin"/> : <Printer size={24}/>}
                Confirm & Print
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
