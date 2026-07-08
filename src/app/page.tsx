'use client';
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment } from 'firebase/firestore';
import { ShoppingBag, Plus, PowerOff, Search, ChevronRight, X, MapPin, Phone, User, Sparkles, Star, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/useCartStore';

// CATEGORIES
const CATEGORIES = ["All", "Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

// Beautiful round category icons mapped for Zomato-style circular grid
const CATEGORY_IMAGES: { [key: string]: string } = {
  "All": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80",
  "Special Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=150&q=80",
  "Special Thali": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=150&q=80",
  "Paneer Special": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=150&q=80",
  "Special Mix veg": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80",
  "Fast Food": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80",
  "Super Cool": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=150&q=80",
  "Indian Bread": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=150&q=80",
  "Special Rice": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=150&q=80"
};

// Quick Review Suggestions to make it extremely easy to write reviews on mobile
const REVIEW_SUGGESTIONS = [
  "Swaad Zabardast! 😋",
  "Super Fast Delivery 🛵",
  "Best Pizza in Town 🍕",
  "Value for Money! 💰",
  "Highly Recommended! 🌟",
  "Pure & Hygienic food 🧼",
  "Awesome Mocktails! 🍹",
  "Best Thali Ever 🍱"
];

// Pre-written Default Reviews (Displays if Firestore reviews collection is empty)
const DEFAULT_REVIEWS = [
  { id: "def1", name: "Gaurav Soni", rating: 5, comment: "Bum Bum Cafe ki paneer pizza sach me pure Mohandra me best hai! Extra cheese is real love. ⭐⭐⭐⭐⭐" },
  { id: "def2", name: "Anjali Patel", rating: 5, comment: "Fast food packing bahut achi thi, delivery boy behavior was also very polite. Recommended! ⭐⭐⭐⭐⭐" },
  { id: "def3", name: "Rohit Chaurasiya", rating: 5, comment: "Shakes and special thali combo is extremely value for money. Quality is pure. ⭐⭐⭐⭐⭐" }
];

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

  // --- LOYALTY POINTS STATE ---
  const [customerPoints, setCustomerPoints] = useState<number>(0);

  // --- DYNAMIC DATA STATES ---
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerError, setBannerError] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false); 
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  
  const [isReviewsDrawerOpen, setIsReviewsDrawerOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  
  // Coupon checkout states
  const [enteredCoupon, setEnteredCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Pizza customization states
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

    // Realtime Dynamic Categories
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbCategories(list.filter((c: any) => c.isVisible !== false));
    });

    // Realtime Banners
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Realtime Coupons
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Realtime Reviews
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      const allRev = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReviews(allRev.filter((r: any) => r.isApproved === true));
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
      unsubCats();
      unsubBanners();
      unsubReviews();
      unsubCoupons();
    };
  }, []);

  // --- LOYALTY POINTS LIVE REALTIME LISTENER ---
  useEffect(() => {
    if (!customerDetails?.phone) {
      setCustomerPoints(0);
      return;
    }
    const unsubPoints = onSnapshot(doc(db, "customer_points", customerDetails.phone), (docSnap) => {
      if (docSnap.exists()) {
        setCustomerPoints(docSnap.data().points || 0);
      } else {
        setCustomerPoints(0);
      }
    });
    return () => unsubPoints();
  }, [customerDetails]);

  // Compute dynamic categories cleanly
  const currentCategories = dbCategories.length > 0 
    ? ["All", ...dbCategories.map(c => c.name)]
    : CATEGORIES;

  const getCategoryImage = (catName: string) => {
    const found = dbCategories.find(c => c.name === catName);
    if (found && found.image) return found.image;
    return CATEGORY_IMAGES[catName] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
  };

  // Auto Banner Slider loop
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners]);

  useEffect(() => {
    setBannerError(false);
  }, [bannerIndex]);

  const getTotal = () => cart.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

  // Apply Coupon Logic
  const handleApplyCoupon = () => {
    if (!enteredCoupon) return toast.error("Please enter a coupon code");
    const found = coupons.find(c => String(c.code).toLowerCase() === enteredCoupon.trim().toLowerCase());
    if (found) {
      setAppliedCoupon(found);
      toast.success(`Coupon '${found.code}' applied! ₹${found.discountValue} OFF`);
    } else {
      toast.error("Invalid coupon code");
    }
  };

  // Filter Logic with safe string checking
  const filteredMenu = menu.filter(item => {
    const itemName = item?.name ? String(item.name).toLowerCase() : "";
    const itemCategory = item?.category ? String(item.category) : "";
    const matchesCategory = selectedCategory === "All" || itemCategory === selectedCategory;
    const matchesSearch = itemName.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Start tracking immediately when new order placed
  const startOrderTracking = (orderId: string) => {
    localStorage.setItem('bb_cafe_last_order_id', orderId);
  };

  // --- WHATSAPP ORDER LOGIC ---
  const sendWhatsAppOrder = async () => {
    if (!customerDetails) {
      setIsLoginOpen(true);
      return;
    }
    if (!address || address.trim().length < 10) return toast.error("Please enter full address!");

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const subtotal = getTotal();
    
    let deliveryCharge = subtotal < 99 ? 20 : 0;
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountValue) : 0;
    const finalTotal = Math.max(0, subtotal - couponDiscount) + deliveryCharge;

    // --- LOYALTY POINTS EARNED ON THIS BILL (₹100 = 1 Point) ---
    const pointsEarned = Math.floor(finalTotal / 100);

    try {
      // 1. Add order to Firestore
      const docRef = await addDoc(collection(db, "orders"), {
        tokenNumber, 
        customerName: customerDetails?.name || "Customer",
        customerPhone: customerDetails?.phone || "No Phone", 
        address, 
        items: cart, 
        subtotal,
        discount: couponDiscount,
        total: finalTotal, 
        timestamp: new Date(), 
        status: 'pending'
      });

      // 2. Increment Customer's Loyalty points securely in Firestore
      if (pointsEarned > 0) {
        await setDoc(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), {
          name: customerDetails.name,
          phone: customerDetails.phone.replace("+91", ""),
          points: increment(pointsEarned),
          lastActive: new Date()
        }, { merge: true });
      }

      let itemsText = "";
      cart.forEach((i: any) => itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`);
      
      const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Order ID:* #${tokenNumber}\n*Customer:* ${customerDetails?.name || "Customer"}\n*Phone:* ${customerDetails?.phone || "No Phone"}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal}\n*Coupon Discount:* -₹${couponDiscount}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${finalTotal}*\n\n*Points Earned:* +${pointsEarned} Pts\n\n_Confirm order by replying 'YES'_`;
      
      window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
      clearCart();
      setAppliedCoupon(null);
      setEnteredCoupon("");
      setIsCartOpen(false);
      toast.success(`Order Placed! Earned ${pointsEarned} Points!`);
    } catch (e) { 
      toast.error("Failed to place order."); 
    }
  };

  // --- SUBMIT FEEDBACK REVIEW ---
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) return toast.error("Please fill all fields!");
    
    try {
      await addDoc(collection(db, "reviews"), {
        name: reviewName,
        rating: reviewRating,
        comment: reviewComment,
        isApproved: false, 
        timestamp: new Date()
      });
      toast.success("Review submitted! Approved hone ke baad live dikhega.");
      setReviewName(""); setReviewComment(""); setReviewRating(5);
      setIsReviewFormOpen(false);
    } catch (err) {
      toast.error("Failed to submit review.");
    }
  };

  const handleAddSuggestion = (suggestion: string) => {
    setReviewComment(prev => prev ? `${prev} ${suggestion}` : suggestion);
  };

  // --- SAVE CONTACT DETAILS ---
  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName || tempName.trim().length < 3) return toast.error("Please enter your real name");
    if (!tempPhone || tempPhone.trim().length < 10) return toast.error("Please enter 10-digit number");

    const details = { name: tempName, phone: `+91${tempPhone}` };
    localStorage.setItem('bb_cafe_customer', JSON.stringify(details));
    setCustomerDetails(details);
    setIsLoginOpen(false);
    toast.success(`Welcome ${tempName}!`);
  };

  // Safe display price helper (Fixed placement inside scope)
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

  const handleAddToCart = () => {
    if (!chosenSize) return toast.error("Please select a size first!");
    
    const basePrice = Number(chosenPrice);
    const addonsTotal = (addonCheese ? 30 : 0) + (addonVeg ? 20 : 0);
    const finalPrice = basePrice + addonsTotal;

    let finalName = `${selectedProduct.name} (${chosenSize})`;
    if (addonCheese) finalName += " + Extra Cheese";
    if (addonVeg) finalName += " + Extra Veg";

    const uniqueCartId = `${selectedProduct.id}-${chosenSize}-${addonCheese ? 'cheese' : 'no'}-${addonVeg ? 'veg' : 'no'}`;

    addItem({
      ...selectedProduct,
      id: uniqueCartId,
      name: finalName,
      price: finalPrice
    });

    toast.success(`${chosenSize} Pizza added to cart!`);
    setSelectedProduct(null); setChosenSize(""); setChosenPrice(0); setAddonCheese(false); setAddonVeg(false);
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-32 font-sans selection:bg-orange-500">
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

      {/* --- FLOATING REVIEWS BADGE ON SIDE --- */}
      <button 
        onClick={() => setIsReviewsDrawerOpen(true)}
        className="fixed right-0 top-[40%] -translate-y-1/2 bg-yellow-400 text-black py-4 px-2.5 rounded-l-2xl shadow-[0_10px_25_rgba(0,0,0,0.5)] flex flex-col items-center gap-1.5 z-40 border border-black/10 active:scale-95 transition-all cursor-pointer"
      >
        <span className="text-[9px] font-black uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">⭐ REVIEWS</span>
      </button>

      {/* --- MAIN CONTENT --- */}
      <main className="pt-4 px-4 max-w-lg mx-auto space-y-6">
        
        {/* --- DYNAMIC TOP BANNER SLIDER --- */}
        <div className="w-full h-44 rounded-3xl overflow-hidden relative border border-white/5 shadow-xl bg-white/[0.02]">
          {(banners.length === 0 || bannerError) ? (
            <div className="w-full h-full bg-gradient-to-r from-orange-600/35 to-[#b33600]/35 flex flex-col justify-center p-6 space-y-1 relative">
              <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-max">Special Offer</span>
              <h3 className="text-xl font-black italic text-yellow-300">GET FREE DELIVERY ABOVE ₹99</h3>
              <p className="text-xs text-gray-400 font-medium">Enjoy fresh baked pizza & delicious thalis!</p>
            </div>
          ) : (
            <img 
              src={banners[bannerIndex]?.url} 
              onError={() => setBannerError(true)}
              className="w-full h-full object-cover transition-all duration-700" 
              alt="Promo Banner" 
            />
          )}
          {banners.length > 1 && !bannerError && (
            <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full transition-all ${bannerIndex === i ? 'bg-orange-500 w-3' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
        </div>

        {/* --- DYNAMIC ZOMATO STYLE CIRCULAR CATEGORIES GRID --- */}
        <div className="bg-white/[0.01] border border-white/5 p-5 rounded-[2.5rem] shadow-xl space-y-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Inspiration for your first order</p>
          
          <div className="grid grid-cols-4 gap-x-2 gap-y-5 text-center">
            {(showAllCategories ? currentCategories : currentCategories.slice(0, 8)).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)}
                  type="button"
                  className="flex flex-col items-center group outline-none"
                >
                  <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-300 ${
                    isActive 
                      ? 'border-orange-500 scale-105 shadow-[0_4px_12px_rgba(239,68,68,0.25)]' 
                      : 'border-white/10 group-hover:border-white/30'
                  }`}>
                    <img src={getCategoryImage(cat)} className="w-full h-full object-cover" alt={cat} />
                  </div>
                  
                  <span className={`text-[10px] font-black uppercase tracking-wide mt-2 max-w-full truncate px-1 transition-colors leading-tight ${
                    isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-white'
                  }`}>
                    {cat === "All" ? "All" : cat.replace("Special ", "").replace(" Special", "")}
                  </span>
                </button>
              );
            })}
          </div>

          <button 
            type="button"
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black text-gray-400 uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>{showAllCategories ? "See Less" : "See More"}</span>
            <span className="text-[8px]">{showAllCategories ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* --- PREMIUM FOOD GRID --- */}
        <div className="grid grid-cols-1 gap-6 pt-2">
          {filteredMenu.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm font-bold uppercase tracking-widest">No items found...</p>
          ) : (
            filteredMenu.map((item) => {
              const nameStr = item?.name ? String(item.name) : "Delicious Item";
              const catStr = item?.category ? String(item.category) : "Food";
              const mockRating = (((nameStr.length + catStr.length) % 5) * 0.1 + 4.5).toFixed(1);

              return (
                <motion.div layout key={item.id} className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden hover:bg-white/[0.04] transition-all duration-300 shadow-xl flex flex-col relative">
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
    </div>
  );
}
