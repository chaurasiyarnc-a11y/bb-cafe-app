'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { ShoppingBag, Plus, User, PowerOff, Search, ChevronRight, X, MapPin, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/usecartstore';

// 1. CATEGORIES (Based on your PDF)
const CATEGORIES = ["All", "Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  const { addItem, removeItem, clearCart } = store;
  
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Checkout States
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // For Half/Full popup

  useEffect(() => {
    setMounted(true);
    // Check Store Status
    onSnapshot(doc(db, "settings", "store"), (d) => {
      if(d.exists()) setStoreOpen(d.data().isOpen);
    });
    // Auth Listener
    onAuthStateChanged(auth, (u) => setUser(u));
    // Realtime Menu
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

  // --- WHATSAPP ORDER LOGIC ---
  const sendWhatsAppOrder = async () => {
    if (!user) return setIsLoginOpen(true);
    if (!address || address.length < 10) return toast.error("Please enter full address!");

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const total = getTotal();
    
    // Delivery Logic
    let deliveryCharge = 0;
    if (total < 99) deliveryCharge = 20;

    try {
      await addDoc(collection(db, "orders"), {
        tokenNumber, customerPhone: user.phoneNumber, address, items: cart, total: total + deliveryCharge, timestamp: new Date(), status: 'pending'
      });

      let itemsText = "";
      cart.forEach((i: any) => itemsText += `• ${i.name} x${i.quantity} - ₹${i.price * i.quantity}\n`);
      
      const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Order ID:* #${tokenNumber}\n*Phone:* ${user.phoneNumber}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${total}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${total + deliveryCharge}*\n\n_Confirm order by replying 'YES'_`;
      
      window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
      clearCart();
      setIsCartOpen(false);
      toast.success("Order Placed!");
    } catch (e) { toast.error("Failed to place order."); }
  };

  // --- AUTH LOGIC ---
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
    } catch (e) { toast.error("Invalid phone number"); }
  };
  const verifyOtp = async () => {
    try { await confirmationResult.confirm(otp); setIsLoginOpen(false); toast.success("Welcome to Bum Bum Cafe!"); }
    catch (e) { toast.error("Wrong OTP"); }
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#080808] min-h-screen text-white pb-32 font-sans selection:bg-orange-500">
      <Toaster position="top-center" />
      <div id="recaptcha-container"></div>
      
      {/* --- HEADER --- */}
      <header className="relative h-72 bg-gradient-to-b from-orange-600 to-orange-700 rounded-b-[3.5rem] flex flex-col justify-center items-center px-6 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/food.png')]"></div>
        <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-5xl font-black italic tracking-tighter text-yellow-400 drop-shadow-lg">BUM BUM CAFE</motion.h1>
        <p className="text-orange-100 font-bold tracking-[0.2em] text-xs mt-2 uppercase">Mohandra's Best Taste</p>
        
        {/* Search Bar */}
        <div className="absolute -bottom-7 w-[90%] max-w-md">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500" size={20} />
            <input 
              type="text" placeholder="Search pizza, thali, shakes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-black py-5 px-14 rounded-3xl shadow-2xl outline-none focus:ring-4 focus:ring-orange-500/20 text-lg font-medium"
            />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-14 px-4 max-w-lg mx-auto">
        
        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-3 rounded-2xl whitespace-nowrap font-extrabold transition-all duration-300 ${
                selectedCategory === cat ? 'bg-orange-500 text-white shadow-xl scale-105' : 'bg-white/5 text-gray-500 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Store Closed Banner */}
        {!storeOpen && (
          <div className="bg-red-500/10 text-red-500 p-6 rounded-[2.5rem] border border-red-500/20 text-center mb-8">
            <PowerOff className="mx-auto mb-2" size={30} />
            <h3 className="font-bold text-xl uppercase italic">Cafe Closed Now</h3>
            <p className="text-xs opacity-80 mt-1">Visit us tomorrow for fresh food!</p>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 gap-5">
          {filteredMenu.map((item) => (
            <motion.div layout key={item.id} className="bg-white/[0.03] p-4 rounded-[2.5rem] border border-white/5 flex gap-5 items-center hover:bg-white/[0.06] transition-all group">
              <div className="relative h-24 w-24 flex-shrink-0">
                <img src={item.image} className="w-full h-full rounded-[2rem] object-cover shadow-xl group-hover:scale-105 transition-transform" alt={item.name} />
              </div>
              <div className="flex-1">
                <h4 className="font-black text-lg text-gray-100">{item.name}</h4>
                <p className="text-gray-500 text-xs italic mb-2 capitalize">{item.category}</p>
                <p className="text-orange-500 font-black text-xl">₹{item.price}</p>
              </div>
              {storeOpen && (
                <button 
                  onClick={() => item.variants ? setSelectedProduct(item) : addItem(item)}
                  className="p-4 bg-orange-500 text-white rounded-3xl shadow-lg shadow-orange-500/20 active:scale-90 transition-all"
                >
                  <Plus size={24} strokeWidth={4} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </main>

      {/* --- CART BAR --- */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-0 w-full px-6 z-50">
            <button onClick={() => setIsCartOpen(true)} className="w-full max-w-md mx-auto bg-yellow-400 text-black p-5 rounded-[2.5rem] shadow-2xl flex justify-between items-center border-4 border-black">
              <div className="flex items-center gap-4">
                <div className="bg-black text-white p-2 rounded-xl"><ShoppingBag size={24} /></div>
                <div className="text-left leading-none">
                  <p className="text-xs font-black uppercase opacity-60">Ready to Eat?</p>
                  <p className="font-black text-2xl tracking-tighter">{cart.length} Items • ₹{getTotal()}</p>
                </div>
              </div>
              <ChevronRight size={30} strokeWidth={3} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- VARIANTS POPUP (Half/Full) --- */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-[#111] w-full p-8 rounded-t-[3.5rem] border-t border-white/10 max-w-lg mx-auto">
              <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
              <h3 className="text-3xl font-black mb-1">{selectedProduct.name}</h3>
              <p className="text-gray-500 font-bold mb-8 uppercase tracking-widest text-xs">Select Portion Size</p>
              
              <div className="space-y-4">
                {Object.entries(selectedProduct.variants || {}).map(([size, price]: any) => (
                  <button key={size} onClick={() => { addItem({ ...selectedProduct, name: `${selectedProduct.name} (${size})`, price }); setSelectedProduct(null); }}
                    className="w-full bg-white/5 p-6 rounded-3xl flex justify-between items-center border border-white/5 hover:border-orange-500 hover:bg-orange-500/10 transition-all"
                  >
                    <span className="capitalize text-xl font-black">{size}</span>
                    <span className="text-orange-500 font-black text-xl">₹{price}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setSelectedProduct(null)} className="w-full mt-8 p-4 text-gray-500 font-black uppercase text-sm">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CART / CHECKOUT SIDEBAR --- */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 bg-black z-[110] overflow-y-auto">
            <div className="p-6 max-w-lg mx-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black">Your Order</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white/5 rounded-full"><X/></button>
              </div>

              {cart.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center bg-white/5 p-5 rounded-3xl mb-4 border border-white/5">
                  <div>
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    <p className="text-orange-500 font-black">₹{item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => removeItem(item.id)} className="p-2 bg-red-500/20 text-red-500 rounded-xl">Remove</button>
                  </div>
                </div>
              ))}

              <div className="mt-10 space-y-6">
                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
                  <div className="flex items-center gap-3 mb-4 text-orange-500">
                    <MapPin size={20}/> <h3 className="font-black uppercase text-sm">Delivery Address</h3>
                  </div>
                  <textarea 
                    placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500 h-24"
                  />
                </div>

                <div className="bg-orange-500 p-8 rounded-[2.5rem] text-white">
                  <div className="flex justify-between font-bold mb-2"><span>Items Total</span> <span>₹{getTotal()}</span></div>
                  <div className="flex justify-between font-bold mb-4 opacity-80 text-sm"><span>Delivery Charge</span> <span>{getTotal() < 99 ? "₹20" : "FREE"}</span></div>
                  <div className="h-px bg-white/20 mb-4" />
                  <div className="flex justify-between font-black text-2xl"><span>To Pay</span> <span>₹{getTotal() < 99 ? getTotal() + 20 : getTotal()}</span></div>
                </div>

                <button onClick={sendWhatsAppOrder} className="w-full bg-green-600 p-6 rounded-[2.5rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                   ORDER ON WHATSAPP
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- LOGIN MODAL --- */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <div className="bg-[#111] w-full max-w-md p-10 rounded-[3rem] border border-white/10 text-center">
              <Phone className="mx-auto mb-6 text-orange-500" size={48} />
              <h2 className="text-3xl font-black mb-2">Verification</h2>
              <p className="text-gray-500 mb-8 font-medium">Please verify your number to order.</p>
              
              {step === 1 ? (
                <div className="space-y-4">
                  <input type="tel" placeholder="Enter Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-center text-xl font-bold" />
                  <button onClick={sendOtp} className="w-full bg-orange-500 p-5 rounded-2xl font-black text-lg">SEND OTP</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-5 rounded-2xl text-center text-xl font-bold tracking-[0.5em]" />
                  <button onClick={verifyOtp} className="w-full bg-green-500 p-5 rounded-2xl font-black text-lg">VERIFY & LOGIN</button>
                </div>
              )}
              <button onClick={() => setIsLoginOpen(false)} className="mt-8 text-gray-500 text-xs font-bold uppercase tracking-widest">Close</button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
