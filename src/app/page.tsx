
'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase'; 
import { collection, onSnapshot, query } from 'firebase/firestore';
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { ShoppingBag, Plus, Minus, X, MessageSquare, Bot, MapPin, Star, User, Navigation, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/useCartStore';

export default function BbCafePro() {
  // Store se data nikalte waqt default empty values dena zaroori hai build fix karne ke liye
  const store = useCartStore() as any;
  const cart = store?.items || []; // Apne store ke hisab se 'items' ya 'cart' check karein
  const addToCart = store?.addItem || (() => {});
  const removeFromCart = store?.removeItem || (() => {});
  const clearCart = store?.clearCart || (() => {});
  
  // totalAmount ko function ki tarah safely handle karein
  const getTotal = () => {
    if (typeof store?.totalAmount === 'function') return store.totalAmount();
    return cart.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  };

  const [menu, setMenu] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); // 👈 Hydration fix karne ke liye

  // Login States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); 
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Location & Checkout States
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<any>(null);

  // 🟢 Hydration Fix: Component mount hone ke baad hi render ho
  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 🟢 Fetch Menu
  useEffect(() => {
    const q = query(collection(db, "products"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMenu(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Recaptcha fix for build
  const setupRecaptcha = () => {
    if (typeof window !== 'undefined' && !(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
  };

  const sendOtp = async () => {
    if (phoneNumber.length < 10) return toast.error("Enter valid number!");
    setupRecaptcha();
    const appVerifier = (window as any).recaptchaVerifier;
    try {
      const result = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, appVerifier);
      setConfirmationResult(result);
      setStep(2);
      toast.success("OTP Sent!");
    } catch (err) { toast.error("Too many requests. Try later."); }
  };

  const verifyOtp = async () => {
    try {
      await confirmationResult.confirm(otp);
      toast.success("Welcome to BB Cafe!");
      setIsLoginOpen(false);
    } catch (err) { toast.error("Invalid OTP!"); }
  };

  const getLiveLocation = () => {
    if (typeof navigator !== 'undefined' && !navigator.geolocation) return toast.error("GPS not supported!");
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      toast.success("Location captured!");
    });
  };

  const sendWhatsAppOrder = () => {
    if (!user) return setIsLoginOpen(true);
    if (!address) return toast.error("Address is required!");

    const orderID = "BBC-" + Math.floor(1000 + Math.random() * 9000);
    let itemsText = "";
    cart.forEach((i: any) => {
      itemsText += `• ${i.name} ${i.variant ? `(${i.variant.size})` : ''} x${i.quantity || i.qty} - ₹${i.price * (i.quantity || i.qty)}\n`;
    });

    const msg = `🍔 *NEW ORDER - BUM BUM CAFE* 🍔\nID: #${orderID}\n\n👤 *Customer:* ${user.phoneNumber}\n📍 *Address:* ${address}\n🌐 *GPS:* ${location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : 'Not shared'}\n\n*ITEMS:*\n${itemsText}\n*TOTAL: ₹${getTotal()}*`;
    
    window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
    clearCart();
    setIsCartOpen(false);
  };

  if (!mounted) return null; // 👈 Page load hone tak white screen (Build fix)

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white font-sans selection:bg-orange-500">
      <Toaster />
      <div id="recaptcha-container"></div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 p-4">
        <div className="glass rounded-3xl p-4 flex justify-between items-center border border-white/10 max-w-lg mx-auto">
          <h1 className="text-2xl font-black text-[#FF6B00] italic">BB CAFE</h1>
          <div className="flex gap-4 items-center">
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white/5 rounded-full">
              <ShoppingBag size={22} />
              {cart?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cart.length}
                </span>
              )}
            </button>
            <button onClick={() => user ? toast(`Loyalty Points: 0`) : setIsLoginOpen(true)}>
              {user ? <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-xs uppercase">Me</div> : <User size={22} className="text-white/40"/>}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-28 px-6 max-w-lg mx-auto pb-40">
        <div className="text-center mb-10">
          <h2 className="text-5xl font-black luxury-text leading-tight italic">Luxury <br/><span className="text-[#FF6B00]">In Every Bite.</span></h2>
          <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold mt-2">Mohandra | @bbcafe.in</p>
        </div>

        <div className="space-y-6">
          {menu.map((item) => (
            <div key={item.id} className="glass p-5 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="flex gap-4 items-center">
                <img src={item.image} className="w-24 h-24 rounded-3xl object-cover" alt={item.name} />
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{item.name}</h4>
                  <p className="text-[#FF6B00] font-black text-xl">₹{item.price || item.variants?.[0]?.price}</p>
                </div>
              </div>

              {item.variants && (
                <div className="flex gap-2">
                  {item.variants.map((v: any) => (
                    <button 
                      key={v.size}
                      onClick={() => addToCart(item, v)}
                      className="flex-1 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase hover:bg-orange-500 transition-all"
                    >
                      {v.size} - ₹{v.price}
                    </button>
                  ))}
                </div>
              )}
              
              {!item.variants && (
                <button onClick={() => addToCart(item)} className="w-full bg-[#FF6B00] py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <Plus size={18}/> Add to Cart
                </button>
              )}
            </div>
          ))}
        </div>
      </main>

      <AnimatePresence>
        {isCartOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[100] bg-[#0A0A0A] p-8 flex flex-col">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black italic text-[#FF6B00]">Checkout</h3>
                <button onClick={() => setIsCartOpen(false)}><X size={32}/></button>
             </div>

             <div className="space-y-4 mb-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                   <label className="text-[10px] uppercase font-bold text-white/40 block mb-2">Delivery Details</label>
                   <textarea value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Enter Full Address..." className="bg-transparent w-full outline-none text-sm h-20" />
                   <button onClick={getLiveLocation} className="mt-2 flex items-center gap-2 text-[#FF6B00] text-xs font-bold">
                      <Navigation size={14}/> {location ? "Location Saved ✅" : "Use GPS for exact delivery"}
                   </button>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4">
                {cart.map((i: any) => (
                  <div key={i.cartId || i.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                    <div>
                       <span className="font-bold block">{i.name} {i.variant ? `(${i.variant.size})` : ''}</span>
                       <span className="text-[#FF6B00] font-bold text-sm">₹{i.price * (i.quantity || i.qty)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <button onClick={()=>removeFromCart(i.cartId || i.id)} className="p-1 bg-white/10 rounded-md"><Minus size={14}/></button>
                       <span className="font-bold">{i.quantity || i.qty}</span>
                       <button onClick={()=>addToCart(i, i.variant)} className="p-1 bg-white/10 rounded-md"><Plus size={14}/></button>
                    </div>
                  </div>
                ))}
             </div>

             <button onClick={sendWhatsAppOrder} className="w-full bg-[#FF6B00] py-5 rounded-[2rem] font-bold text-lg mt-6 shadow-xl shadow-orange-500/20">
                Confirm Order (₹{getTotal()})
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-6 backdrop-blur-xl">
             <div className="glass w-full max-w-sm p-8 rounded-[3rem] border border-white/10 relative">
                <button onClick={()=>setIsLoginOpen(false)} className="absolute top-6 right-6 text-white/20"><X/></button>
                <h2 className="text-2xl font-bold mb-2">Member Login</h2>
                <p className="text-white/40 text-xs mb-8 uppercase tracking-widest">Get Rewards on every order</p>
                
                {step === 1 ? (
                  <div className="space-y-4">
                    <input type="tel" value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} placeholder="Phone Number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00]" />
                    <button onClick={sendOtp} className="w-full bg-[#FF6B00] py-4 rounded-2xl font-bold">Send OTP</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input type="number" value={otp} onChange={(e)=>setOtp(e.target.value)} placeholder="Enter 6-digit OTP" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-center text-xl tracking-widest" />
                    <button onClick={verifyOtp} className="w-full bg-[#FF6B00] py-4 rounded-2xl font-bold">Verify & Login</button>
                  </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
