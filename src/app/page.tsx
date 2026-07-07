'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { ShoppingBag, Plus, User, PowerOff, Search, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/usecartstore';

// Categories as per your PDF Menu
const CATEGORIES = ["All", "Special Pizza", "Special Thali", "Paneer Special", "Fast Food", "Super Cool", "Indian Bread"];

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  const { addItem, clearCart } = store;
  
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState("");

  useEffect(() => {
    setMounted(true);
    onSnapshot(doc(db, "settings", "store"), (d) => {
      if(d.exists()) setStoreOpen(d.data().isOpen);
    });
    onAuthStateChanged(auth, (u) => setUser(u));
    
    const q = query(collection(db, "products"));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenu(items.filter((i: any) => i.isVisible !== false));
    });
  }, []);

  const getTotal = () => cart.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

  // Filter Logic
  const filteredMenu = menu.filter(item => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const sendWhatsAppOrder = async () => {
    if (!user) return setIsLoginOpen(true);
    if (!address) return toast.error("Address required!");

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const orderData = {
      tokenNumber,
      customerPhone: user.phoneNumber,
      address,
      items: cart,
      total: getTotal(),
      timestamp: new Date(),
      status: 'pending'
    };

    try {
      await addDoc(collection(db, "orders"), orderData);
      let itemsText = "";
      cart.forEach((i: any) => itemsText += `• ${i.name} x${i.quantity} - ₹${i.price * i.quantity}\n`);
      const msg = `🍔 *BUM BUM CAFE - NEW ORDER*\n\n*Order ID:* #${tokenNumber}\n*Phone:* ${user.phoneNumber}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*TOTAL: ₹${getTotal()}*\n\n_Please confirm this order._`;
      window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
      clearCart();
      setIsCartOpen(false);
      toast.success("Order Placed Successfully!");
    } catch (e) { toast.error("Order Failed!"); }
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-32 font-sans">
      <Toaster position="top-center" />
      
      {/* --- HERO HEADER --- */}
      <header className="relative h-64 bg-orange-600 rounded-b-[3rem] overflow-hidden flex flex-col justify-center items-center px-6 shadow-2xl">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
        <motion.h1 
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="text-5xl font-black italic tracking-tighter text-yellow-400 drop-shadow-md"
        >
          BUM BUM CAFE
        </motion.h1>
        <p className="text-orange-100 font-medium tracking-widest text-sm mt-2">TASTE THE BEST FROM THE OVEN</p>
        
        {/* Search Bar */}
        <div className="absolute -bottom-6 w-[90%] max-w-md">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-black py-4 px-12 rounded-2xl shadow-xl outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="pt-12 px-4 max-w-lg mx-auto">
        {/* --- CATEGORY SCROLLER --- */}
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl whitespace-nowrap font-bold transition-all ${
                selectedCategory === cat 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-105' 
                : 'bg-white/5 text-gray-400 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Store Closed Banner */}
        {!storeOpen && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-red-500/10 text-red-500 p-5 rounded-3xl border border-red-500/20 text-center mb-8">
            <PowerOff className="mx-auto mb-2" />
            <h3 className="font-bold">CAFE IS CURRENTLY CLOSED</h3>
            <p className="text-xs opacity-70">We are not accepting orders right now.</p>
          </motion.div>
        )}

        {/* --- PRODUCT LIST --- */}
        <div className="grid grid-cols-1 gap-4">
          {filteredMenu.map((item) => (
            <motion.div 
              layout key={item.id} 
              className="group bg-white/[0.03] p-4 rounded-[2rem] border border-white/5 flex gap-4 items-center hover:bg-white/[0.06] transition-all"
            >
              <div className="relative h-20 w-20 flex-shrink-0">
                <img src={item.image} className="w-full h-full rounded-2xl object-cover shadow-lg" alt={item.name} />
                <div className="absolute -top-1 -left-1 bg-green-500 w-3 h-3 rounded-full border-2 border-black"></div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-100 group-hover:text-orange-400 transition-colors">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-orange-500 font-black text-lg">₹{item.price}</span>
                  {item.oldPrice && <span className="text-gray-500 line-through text-xs">₹{item.oldPrice}</span>}
                </div>
              </div>
              {storeOpen && (
                <button 
                  onClick={() => {
                    addItem(item);
                    toast.success(`${item.name} Added`, { icon: '🛒', style: { borderRadius: '15px', background: '#333', color: '#fff' } });
                  }}
                  className="p-4 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20 active:scale-90 transition-transform"
                >
                  <Plus size={24} strokeWidth={3} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </main>

      {/* --- FLOATING BOTTOM CART --- */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-6 left-0 w-full px-6 z-50"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full max-w-md mx-auto bg-orange-500 p-4 rounded-[2rem] shadow-2xl flex justify-between items-center border border-orange-400"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2 rounded-xl">
                  <ShoppingBag size={24} />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold opacity-80 tracking-widest">Your Cart</p>
                  <p className="font-black text-xl leading-tight">{cart.length} Items • ₹{getTotal()}</p>
                </div>
              </div>
              <div className="bg-black/20 p-2 rounded-full">
                <ChevronRight size={24} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
