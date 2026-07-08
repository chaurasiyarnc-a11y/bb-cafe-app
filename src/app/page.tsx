'use client';
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc } from 'firebase/firestore';
import { ShoppingBag, Plus, PowerOff, Search, ChevronRight, X, MapPin, Phone, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/useCartStore';

// CATEGORIES
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
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 

  // --- PIZZA & PORTIONS SELECTION STATES ---
  const [chosenSize, setChosenSize] = useState<string>("");
  const [chosenPrice, setChosenPrice] = useState<number>(0);
  const [addonCheese, setAddonCheese] = useState(false);
  const [addonVeg, setAddonVeg] = useState(false);

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

    // Mobile local memory checking
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

  // Filter Logic with safe string checking
  const filteredMenu = menu.filter(item => {
    const itemName = item?.name ? String(item.name).toLowerCase() : "";
    const itemCategory = item?.category ? String(item.category) : "";
    const matchesCategory = selectedCategory === "All" || itemCategory === selectedCategory;
    const matchesSearch = itemName.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- WHATSAPP ORDER LOGIC ---
  const sendWhatsAppOrder = async () => {
    if (!customerDetails) {
      setIsLoginOpen(true);
      return;
    }
    if (!address || address.trim().length < 10) return toast.error("Please enter full address with landmark!");

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const total = getTotal();
    
    let deliveryCharge = total < 99 ? 20 : 0;

    try {
      await addDoc(collection(db, "orders"), {
        tokenNumber, 
        customerName: customerDetails?.name || "Customer",
        customerPhone: customerDetails?.phone || "No Phone", 
        address, 
        items: cart, 
        total: total + deliveryCharge, 
        timestamp: new Date(), 
        status: 'pending'
      });

      let itemsText = "";
      cart.forEach((i: any) => itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`);
      
      const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Order ID:* #${tokenNumber}\n*Customer:* ${customerDetails?.name || "Customer"}\n*Phone:* ${customerDetails?.phone || "No Phone"}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${total}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${total + deliveryCharge}*\n\n_Confirm order by replying 'YES'_`;
      
      window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
      clearCart();
      setIsCartOpen(false);
      toast.success("Order Placed!");
    } catch (e) { 
      toast.error("Failed to place order."); 
    }
  };

  // --- SAVE CONTACT DETAILS ---
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
    toast.success(`Welcome ${tempName}!`);
  };

  // Safe display price helper
  const getDisplayPrice = (item: any) => {
    if (item?.variants && typeof item.variants === 'object') {
      const prices = Object.values(item.variants).map(Number).filter(n => !isNaN(n));
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        return minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;
      }
    }
    return `₹${item?.price || 0}`;
  };

  // Dynamic Add-to-cart variant trigger
  const handleAddToCart = () => {
    if (!chosenSize) {
      return toast.error("Please select a size first!");
    }

    const basePrice = Number(chosenPrice);
    const addonsTotal = (addonCheese ? 30 : 0) + (addonVeg ? 20 : 0);
    const finalPrice = basePrice + addonsTotal;

    let finalName = `${selectedProduct.name} (${chosenSize})`;
    if (addonCheese) finalName += " + Extra Cheese";
    if (addonVeg) finalName += " + Extra Veg";

    // Unique combination ID to avoid duplicate collisions in cart
    const uniqueCartId = `${selectedProduct.id}-${chosenSize}-${addonCheese ? 'cheese' : 'no'}-${addonVeg ? 'veg' : 'no'}`;

    addItem({
      ...selectedProduct,
      id: uniqueCartId,
      name: finalName,
      price: finalPrice
    });

    toast.success(`${chosenSize} Pizza added to cart!`);
    
    // Reset Popup parameters
    setSelectedProduct(null);
    setChosenSize("");
    setChosenPrice(0);
    setAddonCheese(false);
    setAddonVeg(false);
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-32 font-sans selection:bg-orange-500 overflow-x-hidden">
      <Toaster position="top-center" />
      
      {/* --- COMPACT HEADER --- */}
      <header className="relative h-60 bg-gradient-to-b from-[#ff5e00] to-[#b33600] flex flex-col justify-center items-center px-4 shadow-[0_15px_40px_rgba(179,54,0,0.2)]">
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/food.png')] bg-center rounded-b-[3.5rem] overflow-hidden"></div>
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 z-10">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[9px] font-black uppercase tracking-widest text-green-400">100% PURE VEG</span>
        </div>
        <div className="text-center z-10">
          <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-4xl font-black italic tracking-tighter text-yellow-300 drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]">BUM BUM CAFE</motion.h1>
          <p className="text-orange-100 font-bold tracking-wider text-xs mt-1 uppercase">Best Cafe in this Area</p>
        </div>
      </header>

      {/* --- STICKY GLASS SEARCH BAR --- */}
      <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-md py-4 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.6)] border-b border-white/5 rounded-b-3xl">
        <div className="relative max-w-sm mx-auto group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search pizza, thali, shakes..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-black py-3.5 px-11 rounded-2xl outline-none focus:ring-4 focus:ring-orange-500/20 text-xs font-semibold transition-all"
          />
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-4 px-4 max-w-lg mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar pt-2">
          {CATEGORIES.map((cat) => (
            <button 
              key={cat} 
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-3 rounded-2xl whitespace-nowrap text-xs font-black tracking-wide uppercase transition-all duration-300 border ${
                selectedCategory === cat 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/10 border-orange-500/50 scale-105' 
                  : 'bg-white/[0.03] text-gray-400 border-white/5 hover:bg-white/[0.06]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {!storeOpen && (
          <div className="bg-red-500/10 text-red-400 p-6 rounded-[2.5rem] border border-red-500/20 text-center mb-8 shadow-xl">
            <PowerOff className="mx-auto mb-2 text-red-500" size={28} />
            <h3 className="font-black text-lg uppercase italic tracking-wider">Cafe Closed Now</h3>
            <p className="text-[11px] opacity-80 mt-1">Accepting orders tomorrow morning!</p>
          </div>
        )}

        {/* --- PREMIUM FOOD GRID --- */}
        <div className="grid grid-cols-1 gap-6">
          {filteredMenu.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm font-bold uppercase tracking-widest">No items found...</p>
          ) : (
            filteredMenu.map((item) => {
              const nameStr = item?.name ? String(item.name) : "Delicious Item";
              const catStr = item?.category ? String(item.category) : "Food";
              const mockRating = (((nameStr.length + catStr.length) % 5) * 0.1 + 4.5).toFixed(1);

              return (
                <motion.div layout key={item.id} className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden hover:bg-white/[0.04] transition-all duration-300 shadow-xl group flex flex-col relative">
                  <div className="relative h-56 w-full overflow-hidden">
                    <img src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={nameStr} />
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 z-10">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-green-400">VEG</span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col justify-between flex-1">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-black text-lg text-gray-100 group-hover:text-orange-500 transition-colors line-clamp-1">{nameStr}</h4>
                      <div className="bg-green-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg flex items-center gap-0.5 flex-shrink-0 shadow-md">
                        <span>{mockRating}</span>
                        <span className="text-[9px]">★</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-400 font-bold mt-1">
                      <p className="uppercase tracking-wider text-[9px] text-gray-500">{catStr}</p>
                      <p className="text-[9px] tracking-wide text-gray-500">• 15-25 min</p>
                    </div>
                    <div className="h-px bg-white/5 my-3" />

                    <div className="flex justify-between items-end mt-1">
                      <div>
                        <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Price</p>
                        <p className="text-orange-500 font-black text-xl leading-none">{getDisplayPrice(item)}</p>
                        {item?.variants && <span className="text-[9px] font-bold text-gray-400 mt-1 block">Options available</span>}
                      </div>

                      {storeOpen && (
                        <button 
                          onClick={() => item?.variants ? setSelectedProduct(item) : addItem(item)}
                          className="px-5 py-2.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-xl font-black text-xs active:scale-95 transition-all flex items-center gap-1.5 uppercase shadow-md"
                        >
                          <Plus size={14} strokeWidth={3} />
                          <span>ADD</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </main>

      {/* --- FLOATING BOTTOM CART BAR --- */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-8 left-0 w-full px-6 z-50">
            <button onClick={() => setIsCartOpen(true)} className="w-full max-w-md mx-auto bg-gradient-to-r from-yellow-300 to-amber-400 text-black p-5 rounded-[2.2rem] shadow-2xl flex justify-between items-center border-4 border-black active:scale-95 transition-all">
              <div className="flex items-center gap-4">
                <div className="bg-black text-white p-3 rounded-xl"><ShoppingBag size={20} strokeWidth={2.5} /></div>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-60">Ready to Order?</p>
                  <p className="font-black text-2xl tracking-tighter">{cart.length} Items • ₹{getTotal()}</p>
                </div>
              </div>
              <div className="bg-black text-white p-2.5 rounded-full"><ChevronRight size={24} strokeWidth={3} /></div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NEW VARIANTS POPUP WITH DYNAMIC PORTIONS AND CUSTOM PIZZA ADD-ONS --- */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-[#111] w-full p-8 rounded-t-[3.5rem] border-t border-white/10 max-w-lg mx-auto">
              <div className="w-16 h-1.5 bg-white/15 rounded-full mx-auto mb-6" />
              <h3 className="text-3xl font-black mb-1 text-center tracking-tight">{selectedProduct?.name || "Portion option"}</h3>
              <p className="text-orange-500 font-black mb-6 uppercase tracking-widest text-[10px] text-center">Customize Your Order</p>
              
              {/* STEP 1: Select Portion Size */}
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Select Portion Size:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                    <button 
                      type="button"
                      key={size} 
                      onClick={() => { setChosenSize(size); setChosenPrice(Number(price)); }}
                      className={`p-4 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                        chosenSize === size 
                          ? 'bg-orange-500/10 border-orange-500 text-orange-500 scale-102' 
                          : 'bg-white/[0.03] border-white/5 text-gray-400 hover:border-white/15'
                      }`}
                    >
                      <span className="capitalize text-sm font-black">{size}</span>
                      <span className="font-extrabold text-xs mt-1 text-white">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 2: Optional Custom Pizza Add-ons (Triggered only for Pizza Category) */}
              {(selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-3 mb-8 border-t border-white/5 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">2. Optional Add-ons (Pizza Special):</p>
                  <div className="space-y-2">
                    {/* Addon 1: Extra Cheese */}
                    <div 
                      onClick={() => setAddonCheese(!addonCheese)}
                      className={`p-4 rounded-2xl border flex justify-between items-center cursor-pointer select-none transition-all ${
                        addonCheese ? 'bg-orange-500/5 border-orange-500/50' : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={addonCheese} onChange={() => {}} className="h-4 w-4 rounded border-white/15 text-orange-500 focus:ring-orange-500" />
                        <span className="text-xs font-black uppercase text-gray-300">🧀 Extra Cheese</span>
                      </div>
                      <span className="text-xs font-black text-orange-500">+₹30</span>
                    </div>

                    {/* Addon 2: Extra Veggies */}
                    <div 
                      onClick={() => setAddonVeg(!addonVeg)}
                      className={`p-4 rounded-2xl border flex justify-between items-center cursor-pointer select-none transition-all ${
                        addonVeg ? 'bg-orange-500/5 border-orange-500/50' : 'bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={addonVeg} onChange={() => {}} className="h-4 w-4 rounded border-white/15 text-orange-500 focus:ring-orange-500" />
                        <span className="text-xs font-black uppercase text-gray-300">🥦 Extra Vegetables</span>
                      </div>
                      <span className="text-xs font-black text-orange-500">+₹20</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Confirm addition */}
              <button 
                type="button"
                onClick={handleAddToCart}
                className="w-full bg-orange-500 hover:bg-orange-600 p-5 rounded-2xl font-black text-md shadow-xl active:scale-95 transition-all uppercase"
              >
                Confirm • ₹{chosenPrice + (addonCheese ? 30 : 0) + (addonVeg ? 20 : 0)}
              </button>
              
              <button type="button" onClick={() => { setSelectedProduct(null); setChosenSize(""); setChosenPrice(0); setAddonCheese(false); setAddonVeg(false); }} className="w-full mt-4 p-2 text-gray-500 font-black uppercase text-xs tracking-widest">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CART / CHECKOUT SIDEBAR --- */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 bg-black z-[110] overflow-y-auto">
            <div className="p-6 max-w-lg mx-auto pb-32">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black tracking-tight">Your Order</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white/5 rounded-full"><X size={24} /></button>
              </div>

              {cart.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center bg-white/[0.02] p-5 rounded-3xl mb-4 border border-white/5">
                  <div className="min-w-0 pr-3">
                    <h4 className="font-bold text-sm text-gray-100 truncate">{item?.name || "Item"}</h4>
                    <p className="text-orange-500 font-black mt-1">₹{item?.price || 0}</p>
                  </div>
                  
                  {/* Quantity Controller (Plus/Minus) */}
                  <div className="flex items-center gap-2.5 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/10 flex-shrink-0">
                    <button 
                      onClick={() => removeItem(item.id)} 
                      type="button"
                      className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg text-lg font-black active:scale-90 transition-all hover:bg-red-500/20"
                    >
                      -
                    </button>
                    <span className="font-black text-sm px-1.5 text-white min-w-[15px] text-center">{item.quantity}</span>
                    <button 
                      onClick={() => addItem(item)} 
                      type="button"
                      className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 rounded-lg text-lg font-black active:scale-90 transition-all hover:bg-green-500/20"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-10 space-y-6">
                
                {/* PDF rules alert widget */}
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-5 space-y-2">
                  <div className="flex items-center gap-2 text-orange-400 font-black text-xs uppercase tracking-wider">
                    <Sparkles size={16}/> <span>Free Delivery Rules</span>
                  </div>
                  <ul className="text-[11px] text-gray-400 font-bold space-y-1">
                    <li>• Mohandra Town: Free above ₹99 <span className="text-green-500">({getTotal() >= 99 ? 'Achieved' : 'Need ₹' + (99 - getTotal()) + ' more'})</span></li>
                    <li>• Within 5 Km: Free above ₹499</li>
                    <li>• Within 12 Km: Free above ₹999</li>
                  </ul>
                </div>

                {/* Local Memory Saved Details Block */}
                {customerDetails ? (
                  <div className="bg-white/[0.02] p-5 rounded-[2.2rem] border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Ordering As</p>
                      <h4 className="font-black text-md text-orange-500">{customerDetails?.name}</h4>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">{customerDetails?.phone}</p>
                    </div>
                    <button 
                      onClick={() => { localStorage.removeItem('bb_cafe_customer'); setCustomerDetails(null); }}
                      className="text-[10px] bg-red-500/10 text-red-500 px-3 py-2 rounded-xl font-black uppercase tracking-wider"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="w-full p-5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-[2.2rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
                  >
                    👤 Add Name & Phone To Order
                  </button>
                )}

                {/* Delivery Address */}
                <div className="bg-white/[0.02] p-5 rounded-[2.2rem] border border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-orange-500">
                    <MapPin size={18}/> <h3 className="font-black uppercase text-xs tracking-wider">Delivery Address</h3>
                  </div>
                  <textarea 
                    placeholder="Ghar ka address, Landmark ke saath..." 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500 h-24 text-xs font-semibold text-white placeholder-gray-600 resize-none"
                  />
                </div>

                {/* Bill Details */}
                <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-8 rounded-[2.5rem] text-white shadow-xl">
                  <div className="flex justify-between font-bold mb-2 text-sm text-orange-100"><span>Items Total</span> <span>₹{getTotal()}</span></div>
                  <div className="flex justify-between font-bold mb-4 opacity-90 text-sm text-orange-100"><span>Delivery Charge</span> <span>{getTotal() < 99 ? "₹20" : "FREE"}</span></div>
                  <div className="h-px bg-white/20 mb-4" />
                  <div className="flex justify-between font-black text-2xl"><span>To Pay</span> <span>₹{getTotal() < 99 ? getTotal() + 20 : getTotal()}</span></div>
                </div>

                {/* --- WHATSAPP ORDER BUTTON WITH OFFICIAL LOGO --- */}
                <button 
                  onClick={sendWhatsAppOrder} 
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-700 p-6 rounded-[2.5rem] font-black text-md shadow-xl shadow-green-600/10 flex items-center justify-center gap-3 active:scale-95 transition-all border border-green-500/20 text-white"
                >
                  <svg className="w-6 h-6 fill-current text-white flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M12.037 21.978c-1.92 0-3.805-.502-5.46-1.457l-.391-.227-4.062 1.066 1.085-3.953-.25-.398C2.01 15.352 1.48 13.208 1.48 11.005 1.482 5.21 6.22 .495 12.037.495c2.818 0 5.467 1.1 7.46 3.099a10.45 10.45 0 0 1 3.093 7.42c-.002 5.797-4.74 10.513-10.553 10.513zm5.412-7.587c-.297-.15-1.758-.868-2.03-.96-.273-.092-.471-.137-.67.137-.197.275-.764.96-.938 1.144-.173.183-.347.206-.644.055-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.011c-.198 0-.52.074-.793.372-.272.297-1.04.101-1.04 2.479 0 2.378 1.733 4.678 1.98 5.024.248.346 3.41 5.216 8.26 7.301 1.155.496 2.057.793 2.76 1.017 1.21.383 2.311.33 3.18.198 1.03-.15 2.158-.87 2.46-1.714.3-.842.3-1.564.21-1.714-.09-.15-.335-.24-.633-.39z"/>
                  </svg>
                  <span>ORDER ON WHATSAPP</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DIRECT CONTACT DETAILS MODAL --- */}
      <AnimatePresence>
        {isLoginOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleSaveDetails} className="bg-[#111] w-full max-w-md p-10 rounded-[3rem] border border-white/10 text-center space-y-6">
              <User className="mx-auto text-orange-500" size={48} />
              <div>
                <h2 className="text-3xl font-black mb-1">Your Details</h2>
                <p className="text-gray-500 font-semibold text-xs uppercase tracking-widest">Setup Once • Order Fast</p>
              </div>
              
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter your name..." 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center text-md font-bold outline-none focus:border-orange-500 text-white" 
                    required 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number</label>
                  <input 
                    type="tel" 
                    maxLength={10} 
                    placeholder="10-digit Phone Number" 
                    value={tempPhone} 
                    onChange={(e) => setTempPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center text-md font-bold outline-none focus:border-orange-500 text-white" 
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 p-5 rounded-2xl font-black text-md shadow-xl active:scale-95 transition-all uppercase tracking-wider"
              >
                PROCEED TO ORDER
              </button>
              
              <button 
                type="button" 
                onClick={() => setIsLoginOpen(false)} 
                className="mt-6 text-gray-500 text-xs font-black uppercase tracking-widest block mx-auto hover:text-gray-400"
              >
                Close
              </button>
            </form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
