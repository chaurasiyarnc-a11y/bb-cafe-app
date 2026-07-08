'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc } from 'firebase/firestore';
import { ShoppingBag, Plus, PowerOff, Search, ChevronRight, X, MapPin, Phone, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/useCartStore';

// 1. CATEGORIES
const CATEGORIES = ["All", "Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  
  // Safe destructuring
  const addItem = store?.addItem || (() => {});
  const removeItem = store?.removeItem || (() => {});
  const clearCart = store?.clearCart || (() => {});
  
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Free Contact Form States (Bypassed OTP)
  const [customerDetails, setCustomerDetails] = useState<{ name: string, phone: string } | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // For Half/Full popup

  useEffect(() => {
    setMounted(true);
    // Check Store Status
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if(d.exists()) setStoreOpen(d.data().isOpen);
    });
    // Realtime Menu
    const q = query(collection(db, "products"));
    const unsubMenu = onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenu(items.filter((i: any) => i.isVisible !== false));
    });

    // Mobile ke local memory se customer ki details read karein
    const savedDetails = localStorage.getItem('bb_cafe_customer');
    if (savedDetails) {
      try {
        setCustomerDetails(JSON.parse(savedDetails));
      } catch (err) {}
    }

    return () => {
      unsubStore();
      unsubMenu();
    };
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
    // Agar customer ki name/phone details nahi hain, toh pehle details lene ke liye popup kholiye
    if (!customerDetails) {
      setIsLoginOpen(true);
      return;
    }
    if (!address || address.trim().length < 10) return toast.error("Please enter full address!");

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const total = getTotal();
    
    // Delivery Logic
    let deliveryCharge = 0;
    if (total < 99) deliveryCharge = 20;

    try {
      await addDoc(collection(db, "orders"), {
        tokenNumber, 
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone, 
        address, 
        items: cart, 
        total: total + deliveryCharge, 
        timestamp: new Date(), 
        status: 'pending'
      });

      let itemsText = "";
      cart.forEach((i: any) => itemsText += `• ${i.name} x${i.quantity} - ₹${i.price * i.quantity}\n`);
      
      const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Order ID:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${total}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${total + deliveryCharge}*\n\n_Confirm order by replying 'YES'_`;
      
      window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
      clearCart();
      setIsCartOpen(false);
      toast.success("Order Placed!");
    } catch (e) { 
      toast.error("Failed to place order."); 
    }
  };

  // --- SAVE CONTACT DETAILS (FREE WORKAROUND) ---
  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName || tempName.trim().length < 3) {
      return toast.error("Please enter your real name");
    }
    if (!tempPhone || tempPhone.trim().length < 10) {
      return toast.error("Please enter 10-digit phone number");
    }

    const details = { name: tempName, phone: `+91${tempPhone}` };
    localStorage.setItem('bb_cafe_customer', JSON.stringify(details));
    setCustomerDetails(details);
    setIsLoginOpen(false);
    toast.success(`Welcome to Bum Bum Cafe, ${tempName}!`);
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#080808] min-h-screen text-white pb-32 font-sans selection:bg-orange-500">
      <Toaster position="top-center" />
      
       {/* --- NEW PREMIUM HEADER & SEARCH --- */}
      <header className="relative h-80 bg-gradient-to-b from-[#ff5e00] to-[#b33600] rounded-b-[4rem] flex flex-col justify-center items-center px-6 shadow-[0_15px_40px_rgba(179,54,0,0.3)] overflow-hidden">
        {/* Subtle Background food patterns */}
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/food.png')] bg-center"></div>
        
        {/* Glowing Green Veg Badge */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">100% PURE VEG</span>
        </div>

        {/* Cafe Info Header */}
        <div className="text-center z-10 mt-[-20px]">
          <motion.h1 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }} 
            className="text-5xl font-black italic tracking-tighter text-yellow-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
          >
            BUM BUM CAFE
          </motion.h1>
          <p className="text-[#ffe0cc] font-black tracking-[0.25em] text-[10px] mt-2 uppercase">Sizzle • Brew • Chill</p>
          <p className="text-[9px] font-bold text-yellow-300 mt-1.5 uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full inline-block backdrop-blur-sm border border-white/5">📍 New Bus Stand, Mohandra</p>
        </div>
        
        {/* Modern Floating Search Bar */}
        <div className="absolute -bottom-8 w-[92%] max-w-md">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search paneer, pizza, thali, shakes..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white text-black py-5 px-16 rounded-[2rem] shadow-[0_10px_35px_rgba(0,0,0,0.4)] outline-none focus:ring-4 focus:ring-orange-500/20 text-sm font-semibold transition-all"
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
        {isCartOpen && (
          <div className="fixed inset-0 bg-black z-[110] overflow-y-auto">
            <div className="p-6 max-w-lg mx-auto pb-32">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black tracking-tight">Your Order</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white/5 rounded-full"><X/></button>
              </div>

              {cart.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center bg-white/[0.02] p-5 rounded-3xl mb-4 border border-white/5">
                  <div>
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-orange-500 font-black mt-1">₹{item.price} × {item.quantity}</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-xs font-black uppercase border border-red-500/20 active:scale-95 transition-all">Remove</button>
                </div>
              ))}

              <div className="mt-8 space-y-6">
                
                {/* PDF rules alert widget */}
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-5 space-y-2">
                  <div className="flex items-center gap-2 text-orange-400 font-black text-xs uppercase tracking-wider">
                    <Sparkles size={16}/> <span>Free Delivery Rules (PDF)</span>
                  </div>
                  <ul className="text-[11px] text-gray-400 font-bold space-y-1">
                    <li>• Mohandra Town: Free above ₹99 <span className="text-green-500">({getTotal() >= 99 ? 'Achieved' : 'Need ₹' + (99 - getTotal()) + ' more'})</span></li>
                    <li>• Within 5 Km: Free above ₹499</li>
                    <li>• Within 12 Km: Free above ₹999</li>
                  </ul>
                </div>

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
                  <button key={size} onClick={() => { 
                    addItem({ 
                      ...selectedProduct, 
                      id: `${selectedProduct.id}-${size}`, 
                      name: `${selectedProduct.name} (${size})`, 
                      price 
                    }); 
                    setSelectedProduct(null); 
                  }}
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
                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white/5 rounded-full"><X size={24} /></button>
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
                
                {/* Display details if already saved */}
                {customerDetails && (
                  <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Ordering As</p>
                      <h4 className="font-black text-lg text-orange-500">{customerDetails.name}</h4>
                      <p className="text-xs text-gray-400 font-bold">{customerDetails.phone}</p>
                    </div>
                    <button 
                      onClick={() => { localStorage.removeItem('bb_cafe_customer'); setCustomerDetails(null); }}
                      className="text-xs bg-red-500/10 text-red-500 px-3 py-2 rounded-xl font-bold"
                    >
                      Change
                    </button>
                  </div>
                )}

                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
                  <div className="flex items-center gap-3 mb-4 text-orange-500">
                    <MapPin size={20}/> <h3 className="font-black uppercase text-sm">Delivery Address</h3>
                  </div>
                  <textarea 
                    placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500 h-24 text-sm font-medium"
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

      {/* --- DIRECT CONTACT FORM MODAL (100% FREE NO OTP) --- */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleSaveDetails} className="bg-[#111] w-full max-w-md p-10 rounded-[3rem] border border-white/10 text-center space-y-6">
              <Phone className="mx-auto text-orange-500" size={48} />
              <div>
                <h2 className="text-3xl font-black mb-1">Your Details</h2>
                <p className="text-gray-500 font-medium text-xs">Enter your contact info to place your order.</p>
              </div>
              
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Your Name</label>
                  <input 
                    type="text" placeholder="Apna Naam likhein..." value={tempName} onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center text-lg font-bold" 
                    required 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number</label>
                  <input 
                    type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center text-lg font-bold" 
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-orange-500 p-5 rounded-2xl font-black text-lg shadow-xl shadow-orange-500/20 active:scale-95 transition-all uppercase">
                PROCEED TO ORDER
              </button>
              
              <button type="button" onClick={() => setIsLoginOpen(false)} className="mt-8 text-gray-500 text-xs font-bold uppercase tracking-widest block mx-auto">Close</button>
            </form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
