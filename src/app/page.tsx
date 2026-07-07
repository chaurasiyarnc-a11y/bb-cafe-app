"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ShoppingBag, Plus, Minus, X, MessageSquare, Bot, MapPin, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function BbCafeCustomer() {
  const [menu, setMenu] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🟢 डेटाबेस से बिना किसी रुकावट के डेटा लाना
  useEffect(() => {
    try {
      const q = query(collection(db, "products")); // सरल क्वेरी

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          setMenu([]);
        } else {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMenu(items);
        }
        setLoading(false);
      }, (err) => {
        setError(err.message);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
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

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white font-sans">
      <Toaster />
      <nav className="fixed top-0 w-full z-50 p-4">
        <div className="glass rounded-2xl p-4 flex justify-between items-center border border-white/10 max-w-lg mx-auto">
          <h1 className="text-2xl font-black text-[#FF6B00] italic">BB CAFE</h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white/5 rounded-full">
            <ShoppingBag size={22} />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold border-2 border-[#0A0A0A]">{cart.length}</span>}
          </button>
        </div>
      </nav>

      <main className="pt-28 px-6 max-w-lg mx-auto pb-32">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black leading-tight italic">Luxury <br/><span className="text-[#FF6B00]">In Every Bite.</span></h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-2xl mb-6 text-red-500 text-xs">
            Error: {error} (Check Firebase Keys in Vercel)
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 animate-pulse text-white/20 uppercase tracking-widest font-bold">Loading Menu...</div>
        ) : (
          <div className="grid gap-6">
            {menu.length === 0 && <p className="text-center text-white/30 italic py-20 border border-dashed border-white/10 rounded-[2.5rem]">No items found. Add from /admin</p>}
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

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-[#0A0A0A] p-8 flex flex-col border-l border-white/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-[#FF6B00]">Your Order</h3>
                <button onClick={() => setIsCartOpen(false)}><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                    <span className="font-bold">{i.name} (x{i.qty})</span>
                    <span className="text-[#FF6B00]">₹{i.price * i.qty}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-6 border-t border-white/10">
                <div className="flex justify-between text-2xl font-bold mb-6"><span>Total</span><span>₹{total}</span></div>
                <button onClick={() => window.open(`https://wa.me/919714293759?text=Order: ₹${total}`, '_blank')} className="w-full bg-[#FF6B00] py-5 rounded-[2rem] font-bold text-lg">Order on WhatsApp</button>
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
