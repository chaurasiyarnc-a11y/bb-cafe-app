'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDocs, where 
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Utensils, Trash2, Plus, Minus, Wifi, Image as ImageIcon,
  LayoutDashboard, History, Package, UserCircle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// --- ESC/POS USB Commands ---
const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  RESET: ESC + '@',
  CENTER: ESC + 'a' + '\x01',
  LEFT: ESC + 'a' + '\x00',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DB_SIZE: GS + '!' + '\x11',
  NORMAL: GS + '!' + '\x00',
  CUT: GS + 'V' + '\x41' + '\x03',
};

export default function ProfessionalDesktopPOS() {
  // --- UI & Logic States ---
  const [activeTab, setActiveTab] = useState<'billing' | 'kds' | 'inventory' | 'history'>('billing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [printerPort, setPrinterPort] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // --- Data States ---
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Customer States ---
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Guest');
  const [fulfillment, setFulfillment] = useState<'Dine-in' | 'Takeaway' | 'Delivery'>('Dine-in');

  // --- 1. Printer Connection (PC USB) ---
  const connectPrinter = async () => {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      setPrinterPort(port);
      toast.success("80mm Printer Connected");
    } catch (e) {
      toast.error("Connection Failed");
    }
  };

  // --- 2. Sequential Printing (KOT + Bill) ---
  const handlePrint = async (order: any) => {
    if (!printerPort) return;
    const writer = printerPort.writable.getWriter();
    const encoder = new TextEncoder();
    try {
      let b = CMD.RESET + CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "KITCHEN KOT\n" + CMD.NORMAL;
      b += `TOKEN: #${order.tokenNumber}\n` + CMD.LEFT + "------------------------------------------\n";
      order.items.forEach((it: any) => { b += `${it.quantity} x ${it.name}\n`; });
      b += "------------------------------------------\n\n\n";

      b += CMD.CENTER + CMD.BOLD_ON + CMD.DB_SIZE + "BUM BUM CAFE\n" + CMD.NORMAL;
      b += "------------------------------------------\n" + CMD.LEFT;
      b += `BILL: #${order.billNumber} | TK: #${order.tokenNumber}\n`;
      b += `Date: ${new Date().toLocaleString()}\n`;
      b += "------------------------------------------\n";
      order.items.forEach((it: any) => {
        b += `${it.name.substring(0, 18).padEnd(20)} ${it.quantity}  ${it.price * it.quantity}\n`;
      });
      b += "------------------------------------------\n" + CMD.CENTER + CMD.BOLD_ON;
      b += `TOTAL AMOUNT: Rs. ${order.total}\n` + CMD.NORMAL + "\nThank You! Visit Again\n\n\n" + CMD.CUT;

      await writer.write(encoder.encode(b));
    } finally {
      writer.releaseLock();
    }
  };

  // --- 3. Place Order Logic ---
  const placeOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await runTransaction(db, async (txn) => {
        const bRef = doc(db, "settings", "bill_counter");
        const tRef = doc(db, "settings", `token_${today}`);
        const bSnap = await txn.get(bRef);
        const tSnap = await txn.get(tRef);
        const nb = bSnap.exists() ? bSnap.data().value + 1 : 1001;
        const nt = tSnap.exists() ? tSnap.data().value + 1 : 1;
        txn.set(bRef, { value: nb }, { merge: true });
        txn.set(tRef, { value: nt }, { merge: true });
        return { nb, nt };
      });

      const orderData = {
        billNumber: res.nb,
        tokenNumber: String(res.nt).padStart(2, '0'),
        items: cart,
        total: cart.reduce((a, b) => a + (b.price * b.quantity), 0),
        status: 'pending',
        timestamp: new Date(),
        customerName, customerPhone, fulfillment
      };

      await addDoc(collection(db, "orders"), orderData);
      if (printerPort) await handlePrint(orderData);
      
      setCart([]); setCustomerPhone(''); setCustomerName('Walk-in Guest');
      toast.success("Order Placed Successfully!");
    } catch (e) {
      toast.error("Error placing order");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    onSnapshot(collection(db, "products"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setCategories(['All', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]);
    });
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(20));
    return onSnapshot(q, (snap) => setLiveOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  if (!isLoggedIn) return (
    <div className="h-screen bg-neutral-950 flex items-center justify-center font-sans">
      <div className="bg-neutral-900 p-10 rounded-[2rem] border border-neutral-800 w-96 shadow-2xl text-center">
        <div className="w-20 h-20 bg-orange-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-orange-600/20">
          <Utensils size={40} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">Bum Bum POS</h1>
        <input 
          type="password" placeholder="Enter PIN" 
          className="w-full bg-black border border-neutral-700 rounded-2xl py-4 text-center text-2xl mb-6 outline-none focus:border-orange-500 text-white"
          onChange={(e) => e.target.value === '1234' && setIsLoggedIn(true)}
        />
        <p className="text-neutral-500 text-xs">Professional Desktop Terminal v2.0</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-neutral-950 text-neutral-200 overflow-hidden select-none">
      <Toaster />
      
      {/* 1. NAVIGATION SIDEBAR */}
      <nav className="w-24 border-r border-neutral-900 flex flex-col items-center py-8 gap-10">
        <Utensils className="text-orange-600" size={32} />
        <div className="flex flex-col gap-6">
          <NavItem icon={<LayoutDashboard />} active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
          <NavItem icon={<Clock />} active={activeTab === 'kds'} onClick={() => setActiveTab('kds')} />
          <NavItem icon={<Package />} active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <NavItem icon={<History />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </div>
        <button onClick={connectPrinter} className={`mt-auto p-4 rounded-2xl transition-all ${printerPort ? 'bg-green-600 text-white' : 'bg-neutral-900 text-neutral-500'}`}>
          <Wifi size={24} />
        </button>
        <button onClick={() => setIsLoggedIn(false)} className="p-4 text-red-500"><LogOut size={24} /></button>
      </nav>

      {/* 2. MIDDLE CONTENT (Menu/KDS) */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/20">
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            <header className="flex justify-between items-center mb-8">
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-5 top-4 text-neutral-500" size={20} />
                <input 
                  type="text" placeholder="Search delicious food..." 
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-3xl py-4 pl-14 pr-6 outline-none focus:border-orange-600 transition-all text-lg"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-3 ml-4">
                {categories.map(c => (
                  <button 
                    key={c} onClick={() => setSelectedCategory(c)}
                    className={`px-6 py-3 rounded-2xl text-sm font-bold uppercase transition-all ${selectedCategory === c ? 'bg-orange-600 text-white shadow-lg' : 'bg-neutral-900 text-neutral-500 hover:text-white'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pr-4 scrollbar-hide">
              {products
                .filter(p => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(p => (
                <button 
                  key={p.id} 
                  onClick={() => {
                    const ex = cart.find(i => i.id === p.id);
                    if (ex) setCart(cart.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i));
                    else setCart([...cart, { ...p, quantity: 1 }]);
                  }}
                  className="bg-neutral-900/40 border border-neutral-800 rounded-[2rem] p-4 text-left hover:border-orange-600 transition-all group relative overflow-hidden"
                >
                  <div className="h-40 bg-neutral-800 rounded-2xl mb-4 overflow-hidden">
                    {p.imageUrl || p.image ? (
                      <img src={p.imageUrl || p.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-neutral-700" size={32} /></div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-1 truncate">{p.name}</h3>
                  <p className="text-orange-500 font-black text-xl">₹{p.price}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'kds' && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto">
            {liveOrders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 space-y-6 shadow-xl">
                <div className="flex justify-between items-center">
                  <div className="bg-orange-600 px-4 py-2 rounded-xl text-sm font-black uppercase">Token #{order.tokenNumber}</div>
                  <span className="text-neutral-500 font-mono text-sm">{new Date(order.timestamp?.toDate()).toLocaleTimeString()}</span>
                </div>
                <div className="space-y-3">
                  {order.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-lg text-neutral-300">{it.name}</span>
                      <span className="bg-neutral-800 px-3 py-1 rounded-lg font-black text-orange-500">x{it.quantity}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, "orders", order.id), { status: 'completed' })}
                  className="w-full bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white py-4 rounded-2xl font-black uppercase transition-all"
                >Complete Order</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. RIGHT SIDEBAR (CART) */}
      <aside className="w-[450px] bg-neutral-900/50 border-l border-neutral-900 flex flex-col p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
            <ShoppingBag className="text-orange-600" size={28} /> Current Order
          </h2>
          <button onClick={() => setCart([])} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>
        </div>

        {/* Customer & Settings */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <div className="flex-1 bg-black/40 border border-neutral-800 rounded-2xl p-4 flex items-center gap-3">
              <UserCircle className="text-neutral-500" />
              <input 
                placeholder="Customer Phone" 
                className="bg-transparent outline-none w-full text-sm"
                value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
            <select 
              className="bg-black/40 border border-neutral-800 rounded-2xl px-4 text-xs font-bold outline-none"
              value={fulfillment} onChange={e => setFulfillment(e.target.value as any)}
            >
              <option>Dine-in</option>
              <option>Takeaway</option>
              <option>Delivery</option>
            </select>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-600 space-y-4">
              <ShoppingBag size={64} strokeWidth={1} />
              <p className="font-bold uppercase tracking-widest text-sm">Cart is empty</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="bg-black/40 border border-neutral-800 p-5 rounded-[1.5rem] flex items-center justify-between group transition-all hover:border-neutral-700">
              <div className="flex-1 min-w-0 mr-4">
                <h4 className="font-bold text-neutral-200 truncate">{item.name}</h4>
                <p className="text-orange-600 font-black">₹{item.price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-4 bg-neutral-900 p-2 rounded-2xl">
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-2 hover:bg-neutral-800 rounded-xl transition-all"><Minus size={16}/></button>
                <span className="font-black text-lg w-6 text-center">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-2 hover:bg-neutral-800 rounded-xl transition-all"><Plus size={16}/></button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer & Pay */}
        <div className="mt-auto space-y-6 pt-6 border-t border-neutral-800">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest">Total Amount</p>
              <h3 className="text-4xl font-black text-white">₹{cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</h3>
            </div>
            <div className="text-right text-orange-500 font-bold text-sm">
              Items: {cart.reduce((a, b) => a + b.quantity, 0)}
            </div>
          </div>

          <button 
            disabled={cart.length === 0 || isSubmitting}
            onClick={placeOrder}
            className="w-full bg-orange-600 hover:bg-orange-500 py-6 rounded-[2rem] font-black text-xl uppercase flex items-center justify-center gap-4 shadow-xl shadow-orange-600/20 disabled:opacity-50 transition-all active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Printer size={28} />}
            Place & Print Bill
          </button>
        </div>
      </aside>
    </div>
  );
}

// --- Helper Components ---
function NavItem({ icon, active, onClick }: { icon: any, active: boolean, onClick: any }) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl transition-all ${active ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-neutral-500 hover:text-white hover:bg-neutral-900'}`}
    >
      {React.cloneElement(icon, { size: 28 })}
    </button>
  );
}
