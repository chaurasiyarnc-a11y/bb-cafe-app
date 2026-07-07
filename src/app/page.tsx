"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ShoppingBag, Plus, Minus, X, MessageSquare, Bot, MapPin, Star, User, Calendar, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function BbCafePro() {
  const [menu, setMenu] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // कस्टमर डिटेल्स के लिए स्टेट
  const [custName, setCustName] = useState("");
  const [custAddress, setCustAddress] = useState("");

  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenu(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addToCart = (item: any) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === item.id);
      if (exist) return prev.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i);
      toast.success(`${item.name} added!`);
      return [...prev, {...item, qty: 1}];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.map(i => i.id === id ? {...i, qty: i.qty - 1} : i).filter(i => i.qty > 0));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  // 🟢 प्रोफेशनल WhatsApp मैसेज जेनरेटर
  const sendWhatsAppOrder = () => {
    if (cart.length === 0) return toast.error("आपका कार्ट खाली है!");
    if (!custName || !custAddress) return toast.error("कृपया नाम और पता भरें!");

    const orderID = "BBC-" + Math.floor(1000 + Math.random() * 9000); // रैंडम बिल नंबर
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let itemsList = "";
    cart.forEach((item, index) => {
      itemsList += `${index + 1}. *${item.name}* (x${item.qty}) - ₹${item.price * item.qty}%0A`;
    });

    const message = 
      `*🍔 NEW ORDER - BUM BUM CAFE 🍔*%0A` +
      `---------------------------------------%0A` +
      `*Order ID:* #${orderID}%0A` +
      `*Date:* ${dateStr} | *Time:* ${timeStr}%0A` +
      `---------------------------------------%0A` +
      `*CUSTOMER DETAILS:*%0A` +
      `👤 *Name:* ${custName}%0A` +
      `📍 *Address:* ${custAddress}%0A` +
      `---------------------------------------%0A` +
      `*ORDER SUMMARY:*%0A` +
      itemsList +
      `---------------------------------------%0A` +
      `*GRAND TOTAL: ₹${total}*%0A` +
      `---------------------------------------%0A` +
      `✅ _Please confirm my order!_`;

    window.open(`https://wa.me/919714293759?text=${message}`, '_blank');
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white font-sans">
      <Toaster />
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 p-4">
        <div className="glass rounded-2xl p-4 flex justify-between items-center border border-white/10 max-w-lg mx-auto">
          <h1 className="text-2xl font-black text-[#FF6B00] italic">BB CAFE</h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white/5 rounded-full">
            <ShoppingBag size={22} />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-[#0A0A0A]">{cart.length}</span>}
          </button>
        </div>
      </nav>

      {/* Main Menu */}
      <main className="pt-28 px-6 max-w-lg mx-auto pb-32">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black leading-tight italic">Luxury <br/><span className="text-[#FF6B00]">In Every Bite.</span></h2>
        </div>

        {loading ? (
          <div className="text-center py-20 animate-pulse text-white/20 uppercase tracking-widest font-bold">Loading...</div>
        ) : (
          <div className="grid gap-6">
            {menu.map(item => (
              <div key={item.id} className="glass p-4 rounded-[2.5rem] flex gap-5 items-center border border-white/5">
                <img src={item.image} className="w-24 h-24 rounded-3xl object-cover" alt={item.name} />
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{item.name}</h4>
                  <p className="text-[#FF6B00] font-black text-xl">₹{item.price}</p>
                </div>
                <button onClick={() => addToCart(item)} className="bg-[#FF6B00] p-4 rounded-2xl shadow-lg active:scale-90 transition-all"><Plus size={20}/></button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Advanced Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-[#0A0A0A] p-8 flex flex-col border-l border-white/10 overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-[#FF6B00] italic">Checkout Details</h3>
                <button onClick={() => setIsCartOpen(false)}><X size={24}/></button>
              </div>

              {/* Customer Info Form */}
              <div className="space-y-4 mb-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Your Name</label>
                  <input value={custName} onChange={(e)=>setCustName(e.target.value)} type="text" placeholder="Enter Full Name" className="bg-transparent w-full outline-none font-bold" />
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Delivery Address</label>
                  <textarea value={custAddress} onChange={(e)=>setCustAddress(e.target.value)} placeholder="Enter House No, Area, Landmark" className="bg-transparent w-full outline-none text-sm h-20" />
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-white/30">Order Summary</h4>
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                    <span className="font-bold">{i.name} (x{i.qty})</span>
                    <span className="text-[#FF6B00]">₹{i.price * i.qty}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex justify-between text-2xl font-bold mb-6 italic"><span>Total</span><span className="text-[#FF6B00]">₹{total}</span></div>
                <button onClick={sendWhatsAppOrder} className="w-full bg-[#FF6B00] py-5 rounded-[2rem] font-bold text-lg shadow-xl shadow-[#FF6B00]/20 flex justify-center items-center gap-3 active:scale-95 transition-all">
                  Send Detailed Order <MessageSquare size={20}/>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass border border-white/10 p-4 rounded-[2.5rem] flex justify-around items-center z-[90] max-w-md shadow-2xl">
        <Star size={22} className="text-[#FF6B00]" />
        <div className="bg-[#FF6B00] p-4 rounded-full -mt-14 border-8 border-[#0A0A0A] shadow-2xl"><Bot size={28} className="text-white" /></div>
        <ShoppingBag onClick={() => setIsCartOpen(true)} size={22} className="text-white/30" />
      </div>
    </div>
  );
}
