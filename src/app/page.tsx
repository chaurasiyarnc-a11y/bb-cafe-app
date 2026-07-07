'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { ShoppingBag, Plus, Minus, X, User, Navigation, PowerOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/usecartstore';

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  const { addItem, removeItem, clearCart } = store;
  
  const [menu, setMenu] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  // States for Checkout
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Check Store Status
    onSnapshot(doc(db, "settings", "store"), (d) => {
      if(d.exists()) setStoreOpen(d.data().isOpen);
    });
    // Auth
    onAuthStateChanged(auth, (u) => setUser(u));
    // Menu (Only show visible items)
    const q = query(collection(db, "products"));
    return onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenu(items.filter((i: any) => i.isVisible !== false));
    });
  }, []);

  const getTotal = () => cart.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

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
      const msg = `🍔 *NEW ORDER #${tokenNumber}*\n\n👤 ${user.phoneNumber}\n📍 ${address}\n\n*ITEMS:*\n${itemsText}\n*TOTAL: ₹${getTotal()}*`;
      window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
      clearCart();
      setIsCartOpen(false);
      toast.success("Order Placed!");
    } catch (e) { toast.error("Order Failed!"); }
  };

  // Auth Functions (sendOtp, verifyOtp) yahan pehle jaise hi rahenge...
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    }
  };
  const sendOtp = async () => {
    setupRecaptcha();
    try {
      const result = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, (window as any).recaptchaVerifier);
      setConfirmationResult(result); setStep(2); toast.success("OTP Sent");
    } catch (e) { toast.error("Error sending OTP"); }
  };
  const verifyOtp = async () => {
    try { await confirmationResult.confirm(otp); setIsLoginOpen(false); toast.success("Logged In"); }
    catch (e) { toast.error("Invalid OTP"); }
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white pb-20">
      <Toaster />
      <div id="recaptcha-container"></div>
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 p-4">
        <div className="glass rounded-3xl p-4 flex justify-between items-center border border-white/10 max-w-lg mx-auto">
          <h1 className="text-2xl font-black text-orange-500 italic">BB CAFE</h1>
          <div className="flex gap-4">
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white/5 rounded-full">
              <ShoppingBag size={22} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
            </button>
            <button onClick={() => !user && setIsLoginOpen(true)}>
              {user ? <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-xs uppercase">Me</div> : <User size={22}/>}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-28 px-6 max-w-lg mx-auto">
        {!storeOpen && (
          <div className="bg-red-500/20 text-red-500 p-6 rounded-[2.5rem] border border-red-500/20 text-center mb-8">
            <PowerOff className="mx-auto mb-2" />
            <h3 className="font-bold">STORE IS CLOSED</h3>
            <p className="text-xs opacity-70 uppercase tracking-widest">Wapas aaiye kal subah!</p>
          </div>
        )}

        <div className="space-y-6">
          {menu.map((item) => (
            <div key={item.id} className="glass p-5 rounded-[2.5rem] border border-white/5 flex gap-4 items-center">
              <img src={item.image} className="w-20 h-20 rounded-3xl object-cover" />
              <div className="flex-1">
                <h4 className="font-bold">{item.name}</h4>
                <p className="text-orange-500 font-bold">₹{item.price}</p>
              </div>
              {storeOpen && (
                <button onClick={() => addItem(item)} className="p-3 bg-orange-500 rounded-2xl"><Plus size={20}/></button>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Cart Drawer (WhatsApp logic integrated) */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed inset-0 z-[100] bg-[#0A0A0A] p-8 flex flex-col">
            <div className="flex justify-between items-center mb-8"><h3 className="text-3xl font-black italic text-orange-500">Cart</h3><button onClick={() => setIsCartOpen(false)}><X size={32}/></button></div>
            <textarea value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Full Delivery Address..." className="bg-white/5 w-full p-4 rounded-2xl outline-none mb-6 h-24" />
            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.map((i: any) => (
                <div key={i.id} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
                  <div><span className="font-bold block">{i.name}</span><span className="text-orange-500 font-bold text-sm">₹{i.price * i.quantity}</span></div>
                  <div className="flex items-center gap-3">
                    <button onClick={()=>removeItem(i.id)} className="p-1 bg-white/10 rounded-md"><Minus size={14}/></button>
                    <span className="font-bold">{i.quantity}</span>
                    <button onClick={()=>addItem(i)} className="p-1 bg-white/10 rounded-md"><Plus size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={sendWhatsAppOrder} className="w-full bg-orange-500 py-5 rounded-[2rem] font-bold text-lg mt-6">Confirm Order (₹{getTotal()})</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginOpen && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-6 backdrop-blur-xl">
             <div className="glass w-full max-w-sm p-8 rounded-[3rem] border border-white/10 relative">
                <button onClick={()=>setIsLoginOpen(false)} className="absolute top-6 right-6 text-white/20"><X/></button>
                <h2 className="text-2xl font-bold mb-8">Login</h2>
                {step === 1 ? (
                  <div className="space-y-4">
                    <input type="tel" value={phoneNumber} onChange={(e)=>setPhoneNumber(e.target.value)} placeholder="Phone Number" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" />
                    <button onClick={sendOtp} className="w-full bg-orange-500 py-4 rounded-2xl font-bold">Send OTP</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input type="number" value={otp} onChange={(e)=>setOtp(e.target.value)} placeholder="OTP" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none text-center text-xl" />
                    <button onClick={verifyOtp} className="w-full bg-orange-500 py-4 rounded-2xl font-bold">Verify</button>
                  </div>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
