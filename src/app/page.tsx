```tsx
"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Star, Plus, Minus, X, MapPin, MessageSquare, CreditCard, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function BbCafeMaster() {
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const menu = [
    { id: 1, name: "Peri Peri Pizza", price: 349, img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" },
    { id: 2, name: "Luxury BBQ Burger", price: 249, img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
    { id: 3, name: "Hazelnut Cold Coffee", price: 189, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400" }
  ];

  const addToCart = (item: any) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === item.id);
      if (exist) return prev.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i);
      toast.success(`${item.name} added to cart!`);
      return [...prev, {...item, qty: 1}];
    });
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
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
          </button>
        </div>
      </nav>

      <main className="pt-28 px-6 max-w-lg mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black leading-tight">Luxury <br/><span className="text-[#FF6B00]">In Every Bite.</span></h2>
          <p className="text-white/40 mt-4 text-sm tracking-widest uppercase font-bold">bbcafe.in | Rajkot</p>
        </div>

        <div className="grid gap-6 pb-32">
          {menu.map(item => (
            <div key={item.id} className="glass p-4 rounded-[2rem] flex gap-4 items-center border border-white/5">
              <img src={item.img} className="w-20 h-20 rounded-2xl object-cover" alt={item.name} />
              <div className="flex-1">
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-[#FF6B00] font-bold">₹{item.price}</p>
              </div>
              <button onClick={() => addToCart(item)} className="bg-[#FF6B00] p-3 rounded-xl hover:scale-110 active:scale-95 transition-all"><Plus size={20}/></button>
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0A0A0A] border-l border-white/10 z-[110] p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold">Order Details</h3>
                <button onClick={() => setIsCartOpen(false)}><X size={30}/></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                    <span className="font-bold">{i.name} (x{i.qty})</span>
                    <span className="text-[#FF6B00] font-bold">₹{i.price * i.qty}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto border-t border-white/10 pt-6">
                <div className="flex justify-between text-2xl font-bold mb-6">
                  <span>Grand Total</span>
                  <span className="text-[#FF6B00]">₹{total}</span>
                </div>
                <button onClick={() => window.open(`https://wa.me/919714293759?text=Order from bbcafe.in: Total ₹${total}`, '_blank')} className="w-full bg-[#FF6B00] py-5 rounded-2xl font-bold flex justify-center items-center gap-2 shadow-xl shadow-[#FF6B00]/20">
                  Confirm via WhatsApp <MessageSquare size={20}/>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass border border-white/10 p-4 rounded-3xl flex justify-around items-center z-[90] max-w-md">
        <Star size={22} className="text-[#FF6B00]" />
        <MapPin size={22} className="text-white/30" />
        <div className="bg-[#FF6B00] p-3 rounded-full -mt-10 border-4 border-[#0A0A0A] shadow-xl"><Plus size={24}/></div>
        <ShoppingBag size={22} className="text-white/30" />
        <ChevronRight size={22} className="text-white/30" />
      </div>
    </div>
  );
}
```
