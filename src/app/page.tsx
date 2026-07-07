"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase'; // रास्ते को ठीक किया गया
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { ShoppingBag, Star, Plus, Minus, X, MessageSquare, Bot, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

export default function BbCafeCustomer() {
  const [menu, setMenu] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🟢 लाइव डेटाबेस से डिशेज लाना
  useEffect(() => {
    try {
      const q = query(
        collection(db, "products"), 
        where("visibility", "==", true),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setMenu(items);
        setLoading(false);
      }, (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Setup Error:", err);
      setLoading(false);
    }
  }, []);

  const addToCart = (item: any) => {
    setCart(prev => {
      const exist = prev.find(i => i.id === item.id);
      if (exist) return prev.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i);
      toast.success(`${item.name} जोड़ा गया!`);
      return [...prev, {...item, qty: 1}];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.map(i => i.id === id ? {...i, qty: i.qty - 1} : i).filter(i => i.qty > 0));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const sendWhatsApp = () => {
    if (cart.length === 0) return toast.error("कार्ट खाली है!");
    const itemsText = cart.map(i => `• ${i.name} (x${i.qty})`).join('%0A');
    const msg = `*New Order from bbcafe.in*%0A%0A${itemsText}%0A%0A*Total Amount:* ₹${total}`;
    window.open(`https://wa.me/919714293759?text=${msg}`, '_blank');
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white font-sans">
      <Toaster />
      
      {/* --- लग्जरी नेवबार --- */}
      <nav className="fixed top-0 w-full z-50 p-4">
        <div className="glass rounded-2xl p-4 flex justify-between items-center border border-white/10 max-w-lg mx-auto">
          <h1 className="text-2xl font-black text-[#FF6B00] italic tracking-tighter">BB CAFE</h1>
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all">
            <ShoppingBag size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-[#0A0A0A]">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* --- मुख्य कंटेंट --- */}
      <main className="pt-28 px-6 max-w-lg mx-auto pb-32">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black leading-tight tracking-tighter italic">Luxury <br/><span className="text-[#FF6B00]">In Every Bite.</span></h2>
          <div className="flex items-center justify-center gap-2 mt-4 text-[#FF6B00] font-bold text-xs uppercase tracking-widest">
            <MapPin size={14}/> Rajkot, Gujarat
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-white/20 text-sm font-bold uppercase tracking-widest">Loading Menu...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {menu.length === 0 && (
              <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
                <p className="text-white/30 italic">मेन्यू अभी खाली है। एडमिन से डिश जोड़ें।</p>
              </div>
            )}
            {menu.map(item => (
              <div key={item.id} className="glass p-4 rounded-[2.5rem] flex gap-5 items-center border border-white/5 hover:border-[#FF6B00]/30 transition-all">
                <img src={item.image} className="w-24 h-24 rounded-3xl object-cover shadow-2xl" alt={item.name} />
                <div className="flex-1">
                  <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                  <p className="text-[#FF6B00] font-black text-xl mt-1">₹{item.price}</p>
                </div>
                <button onClick={() => addToCart(item)} className="bg-[#FF6B00] p-4 rounded-2xl shadow-lg shadow-[#FF6B00]/20 active:scale-90 transition-all">
                  <Plus size={20}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- शॉपिंग कार्ट साइडबार --- */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-[#0A0A0A] p-8 flex flex-col shadow-2xl border-l border-white/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black italic text-[#FF6B00]">Your Order</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={24}/></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
                {cart.length === 0 && <p className="text-center text-white/20 mt-20">आपका कार्ट खाली है</p>}
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center bg-white/5 p-5 rounded-3xl border border-white/5">
                    <div>
                      <span className="block font-bold text-lg">{i.name}</span>
                      <span className="text-[#FF6B00] font-black">₹{i.price * i.qty}</span>
                    </div>
                    <div className="flex items-center gap-4 bg-black/40 px-3 py-2 rounded-xl">
                      <button onClick={() => removeFromCart(i.id)}><Minus size={16}/></button>
                      <span className="font-bold w-4 text-center">{i.qty}</span>
                      <button onClick={() => addToCart(i)}><Plus size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto border-t border-white/10 pt-6">
                <div className="flex justify-between text-3xl font-black mb-8 italic">
                  <span>Total</span>
                  <span className="text-[#FF6B00]">₹{total}</span>
                </div>
                <button onClick={sendWhatsApp} className="w-full bg-[#FF6B00] py-5 rounded-[2rem] font-bold flex justify-center items-center gap-3 text-lg shadow-xl shadow-[#FF6B00]/20 active:scale-95 transition-all">
                  Order on WhatsApp <MessageSquare size={20}/>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- मोबाइल बॉटम नेविगेशन --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass border border-white/10 p-4 rounded-[2.5rem] flex justify-around items-center z-[90] max-w-md shadow-2xl">
        <Star size={22} className="text-[#FF6B00] fill-[#FF6B00]/20" />
        <div className="bg-[#FF6B00] p-4 rounded-full -mt-14 border-8 border-[#0A0A0A] shadow-2xl shadow-[#FF6B00]/40 active:scale-90 transition-all">
          <Bot size={28} className="text-white" />
        </div>
        <ShoppingBag onClick={() => setIsCartOpen(true)} size={22} className="text-white/30" />
      </div>
    </div>
  );
}
