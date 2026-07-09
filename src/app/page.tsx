'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment, runTransaction } from 'firebase/firestore';
import { ShoppingBag, Plus, PowerOff, Search, ChevronRight, X, MapPin, Phone, User, Sparkles, Star, Percent, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/useCartStore';

// CATEGORIES FALLBACK
const FALLBACK_CATEGORIES = ["All", "Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

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

const DEFAULT_REVIEWS = [
  { id: "def1", name: "Gaurav Soni", rating: 5, comment: "Bum Bum Cafe ki paneer pizza sach me pure Mohandra me best hai! Extra cheese is real love. ⭐⭐⭐⭐⭐" },
  { id: "def2", name: "Anjali Patel", rating: 5, comment: "Fast food packing bahut achi thi, delivery boy behavior was also very polite. Recommended! ⭐⭐⭐⭐⭐" },
  { id: "def3", name: "Rohit Chaurasiya", rating: 5, comment: "Shakes and special thali combo is extremely value for money. Quality is pure. ⭐⭐⭐⭐⭐" }
];

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  
  const addItem = store?.addItem || (() => {});
  const removeItem = store?.removeItem || (() => {});
  const clearCart = store?.clearCart || (() => {});
  
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSocialsOpen, setIsSocialsOpen] = useState(false); 
  const [storeOpen, setStoreOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [customerDetails, setCustomerDetails] = useState<{ name: string, phone: string } | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 

  // --- LOYALTY POINTS & DYNAMIC RULES STATE ---
  const [customerPoints, setCustomerPoints] = useState<number>(0);
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]);

  // --- POINT GIFTING STATES ---
  const [giftPhone, setGiftPhone] = useState("");
  const [giftAmount, setGiftAmount] = useState("");
  const [isGiftingOpen, setIsGiftingOpen] = useState(false);
  const [isGiftingLoading, setIsGiftingLoading] = useState(false);

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
  
  const [enteredCoupon, setEnteredCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const [chosenSize, setChosenSize] = useState<string>("");
  const [chosenPrice, setChosenPrice] = useState<number>(0);
  const [addonCheese, setAddonCheese] = useState(false);
  const [addonVeg, setAddonVeg] = useState(false);

  // --- FORMAT BILL NO TO 0001 HELPER ---
  const formatBillNumber = (num: number) => {
    return String(num).padStart(4, '0');
  };

  useEffect(() => {
    setMounted(true);
    // Realtime Store Status
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if(d.exists()) setStoreOpen(d.data().isOpen);
    });
    // Realtime Menu
    const q = query(collection(db, "products"));
    const unsubMenu = onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMenu(items.filter((i: any) => i.isVisible !== false));
    });

    // Realtime Dynamic Categories (Fetch all to determine visibility of default ones)
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbCategories(list);
    });

    // Banners
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Coupons
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Reviews
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      const allRev = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReviews(allRev.filter((r: any) => r.isApproved === true));
    });

    // Dynamic Loyalty Rules Listener
    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => {
      setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      unsubRules();
    };
  }, []);

  // --- LOYALTY POINTS LIVE REALTIME LISTENER ---
  useEffect(() => {
    if (!customerDetails?.phone) {
      setCustomerPoints(0);
      return;
    }
    const unsubPoints = onSnapshot(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), (docSnap) => {
      if (docSnap.exists()) {
        setCustomerPoints(docSnap.data().points || 0);
      } else {
        setCustomerPoints(0);
      }
    }, () => {
      setCustomerPoints(0);
    });
    return () => unsubPoints();
  }, [customerDetails]);

  // Compute categories cleanly with duplicates and explicitly hidden categories removed
  const visibleCategories = useMemo(() => {
    const baseCategories = ["All", ...FALLBACK_CATEGORIES.filter(c => c !== "All")];
    
    const dbCatsMap = new Map();
    dbCategories.forEach(c => {
      dbCatsMap.set(String(c.name).toLowerCase().trim(), c);
    });

    const result: string[] = [];

    // Filter default categories based on customized settings in Database
    baseCategories.forEach(catName => {
      const cleanName = catName.toLowerCase().trim();
      if (dbCatsMap.has(cleanName)) {
        const dbCat = dbCatsMap.get(cleanName);
        if (dbCat.isVisible !== false) {
          result.push(catName);
        }
      } else {
        result.push(catName);
      }
    });

    // Append custom created active categories
    dbCategories.forEach(c => {
      const cleanName = String(c.name).toLowerCase().trim();
      const alreadyAdded = result.some(r => r.toLowerCase().trim() === cleanName);
      if (!alreadyAdded && c.isVisible !== false && c.name !== "All") {
        result.push(c.name);
      }
    });

    return Array.from(new Set(result));
  }, [dbCategories]);

  const getCategoryImage = (catName: string) => {
    const found = dbCategories.find(c => c.name === catName);
    if (found && found.image) return found.image;
    return CATEGORY_IMAGES[catName] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
  };

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

  // Deduplicate menu items by name & FILTER OUT items from hidden categories completely
  const deduplicatedMenu = useMemo(() => {
    const seen = new Set();
    
    const hiddenCategoryNames = new Set(
      dbCategories
        .filter((c: any) => c.isVisible === false)
        .map((c: any) => String(c.name).toLowerCase().trim())
    );

    return menu.filter(item => {
      const itemCatClean = item?.category ? String(item.category).toLowerCase().trim() : "";
      
      if (hiddenCategoryNames.has(itemCatClean)) {
        return false;
      }

      const nameKey = item?.name ? String(item.name).toLowerCase().trim() : item.id;
      if (seen.has(nameKey)) {
        return false;
      }
      seen.add(nameKey);
      return true;
    });
  }, [menu, dbCategories]);

  // Filter Logic with safe string checking on the deduplicated & hidden-category-filtered menu
  const filteredMenu = deduplicatedMenu.filter(item => {
    const itemName = item?.name ? String(item.name).toLowerCase() : "";
    const itemCategory = item?.category ? String(item.category) : "";
    const matchesCategory = selectedCategory === "All" || itemCategory === selectedCategory;
    const matchesSearch = itemName.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // --- CUSTOMER-SIDE POINTS REDEEM CONTROLLER ---
  const handleCustomerRedeem = (id: string, name: string, pointsCost: number) => {
    const currentPointsInCart = cart.reduce((acc: number, item: any) => acc + (item.pointsCost || 0), 0);
    
    if (customerPoints - currentPointsInCart < pointsCost) {
      return toast.error("आपके पास पर्याप्त पॉइंट्स उपलब्ध नहीं हैं!");
    }

    // Add reward item directly to cart store as free product (price: 0)
    addItem({
      id,
      name,
      price: 0,
      pointsCost,
      isReward: true
    });
    toast.success(`${name} Cart में जोड़ दिया गया है!`);
  };

  // --- CUSTOMER TO CUSTOMER POINT GIFTING LOGIC ---
  const handleGiftPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerDetails) return toast.error("Please log in first!");

    const senderPhoneClean = customerDetails.phone.replace("+91", "").trim();
    const recipientPhoneClean = giftPhone.trim().replace("+91", "").replace(/\s/g, "");
    const pointsToGift = parseInt(giftAmount);

    if (isNaN(pointsToGift) || pointsToGift <= 0) {
      return toast.error("Please enter a valid amount of points!");
    }
    if (recipientPhoneClean.length !== 10) {
      return toast.error("Please enter a valid 10-digit mobile number!");
    }
    if (senderPhoneClean === recipientPhoneClean) {
      return toast.error("You cannot gift points to yourself!");
    }
    if (customerPoints < pointsToGift) {
      return toast.error("You do not have enough points to gift!");
    }

    setIsGiftingLoading(true);

    const senderDocRef = doc(db, "customer_points", senderPhoneClean);
    const recipientDocRef = doc(db, "customer_points", recipientPhoneClean);
    const transferLogRef = doc(collection(db, "point_transfers"));

    try {
      await runTransaction(db, async (transaction) => {
        // Read Sender's account balance
        const senderSnap = await transaction.get(senderDocRef);
        const currentSenderPoints = senderSnap.exists() ? (senderSnap.data().points || 0) : 0;

        if (currentSenderPoints < pointsToGift) {
          throw new Error("Insufficient points in account balance!");
        }

        // Read Recipient's account balance
        const recipientSnap = await transaction.get(recipientDocRef);
        const currentRecipientPoints = recipientSnap.exists() ? (recipientSnap.data().points || 0) : 0;
        const recipientName = recipientSnap.exists() ? (recipientSnap.data().name || "Cafe Friend") : "Cafe Friend";

        // Deduct points from sender
        transaction.update(senderDocRef, {
          points: currentSenderPoints - pointsToGift,
          lastActive: new Date()
        });

        // Add points to recipient
        if (!recipientSnap.exists()) {
          transaction.set(recipientDocRef, {
            name: recipientName,
            phone: recipientPhoneClean,
            points: pointsToGift,
            lastActive: new Date()
          });
        } else {
          transaction.update(recipientDocRef, {
            points: currentRecipientPoints + pointsToGift,
            lastActive: new Date()
          });
        }

        // Write Transfer Audit Log
        transaction.set(transferLogRef, {
          senderPhone: senderPhoneClean,
          senderName: customerDetails.name,
          recipientPhone: recipientPhoneClean,
          points: pointsToGift,
          timestamp: new Date()
        });
      });

      toast.success(`Successfully gifted ${pointsToGift} Points to +91${recipientPhoneClean}! 🎁`);
      setGiftPhone("");
      setGiftAmount("");
      setIsGiftingOpen(false);
    } catch (err: any) {
      console.error("Gifting transaction error:", err);
      toast.error(err.message || "Failed to complete point gift transaction.");
    } finally {
      setIsGiftingLoading(false);
    }
  };

  // --- WHATSAPP ORDER LOGIC WITH FIRESTORE TRANSACTION BILL INCREMENT ---
  const sendWhatsAppOrder = async () => {
    if (!customerDetails) {
      setIsLoginOpen(true);
      return;
    }
    if (!address || address.trim().length < 10) return toast.error("Please enter full address!");

    const tokenNumber = Math.floor(1000 + Math.random() * 9000); // Random Token number
    let billNumber = 1; // Sequential Bill number initial setup
    
    const counterDocRef = doc(db, "settings", "store_bill_counter");

    // Securely running a transaction to increment and fetch unique sequential bill number
    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        if (!counterDoc.exists()) {
          transaction.set(counterDocRef, { nextBillNumber: 2 });
          billNumber = 1;
        } else {
          billNumber = counterDoc.data().nextBillNumber || 1;
          transaction.update(counterDocRef, { nextBillNumber: billNumber + 1 });
        }
      });
    } catch (e) {
      console.error("Frictionless transaction fallback active. Generating dynamic timestamp index:", e);
      billNumber = Math.floor((Date.now() / 1000) % 100000);
    }

    const formattedBillStr = formatBillNumber(billNumber);

    const subtotal = getTotal();
    let deliveryCharge = subtotal < 99 ? 20 : 0;
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountValue) : 0;
    const finalTotal = Math.max(0, subtotal - couponDiscount) + deliveryCharge;
    
    // Points calculations
    const pointsEarned = Math.floor(finalTotal / 100);
    const totalPointsCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);

    // 1. Try background write to Firebase (If fails, doesn't block WhatsApp!)
    try {
      await addDoc(collection(db, "orders"), {
        billNumber,
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

      // Update Points (Earned minus Redeemed)
      if (pointsEarned > 0 || totalPointsCost > 0) {
        await setDoc(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), {
          name: customerDetails.name,
          phone: customerDetails.phone.replace("+91", ""),
          points: increment(pointsEarned - totalPointsCost),
          lastActive: new Date()
        }, { merge: true });
      }
    } catch (e) { 
      console.error("Firestore DB permission bypass safety trigger. Ordering directly to WhatsApp:", e);
    }

    // 2. Open WhatsApp (Always triggered!)
    let itemsText = "";
    cart.forEach((i: any) => itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`);
    
    const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails?.name || "Customer"}\n*Phone:* ${customerDetails?.phone || "No Phone"}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal}\n*Coupon Discount:* -₹${couponDiscount}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${finalTotal}*\n\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}\n_Confirm order by replying 'YES'_`;
    
    window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
    
    clearCart();
    setAppliedCoupon(null);
    setEnteredCoupon("");
    setIsCartOpen(false);
    toast.success("Redirecting to WhatsApp!");
  };

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
      
      {/* HEADER */}
      <header className="relative h-60 bg-gradient-to-b from-[#ff5e00] to-[#b33600] flex flex-col justify-center items-center px-4 shadow-[0_15px_40px_rgba(179,54,0,0.2)]">
        <div className="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/food.png')] bg-center rounded-b-[3.5rem] overflow-hidden"></div>
        
        {/* Floating Social Media Access Button */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <button 
            onClick={() => setIsSocialsOpen(true)}
            className="bg-black/50 hover:bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1 active:scale-95 transition-all text-[9px] font-black uppercase tracking-widest text-yellow-300 cursor-pointer"
          >
            📱 Follow Us
          </button>
        </div>

        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 z-10">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-[9px] font-black uppercase tracking-widest text-green-400">100% PURE VEG</span>
        </div>
        <div className="text-center z-10">
          <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-4xl font-black italic tracking-tighter text-yellow-300 drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)]">BUM BUM CAFE</motion.h1>
          <p className="text-orange-100 font-bold tracking-wider text-xs mt-1 uppercase">Best Cafe in this Area</p>
        </div>
      </header>

      {/* STICKY GLASS SEARCH BAR */}
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

      {/* FLOATING REVIEWS BADGE ON SIDE */}
      <button 
        onClick={() => setIsReviewsDrawerOpen(true)}
        className="fixed right-0 top-[40%] -translate-y-1/2 bg-yellow-400 text-black py-4 px-2.5 rounded-l-2xl shadow-[0_10px_25_rgba(0,0,0,0.5)] flex flex-col items-center gap-1.5 z-40 border border-black/10 active:scale-95 transition-all cursor-pointer"
      >
        <span className="text-[9px] font-black uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">⭐ REVIEWS</span>
      </button>

      {/* MAIN CONTENT */}
      <main className="pt-4 px-4 max-w-lg mx-auto space-y-6">
        
        {/* BANNERS */}
        <div className="w-full h-44 rounded-3xl overflow-hidden relative border border-white/5 shadow-xl bg-white/[0.02]">
          {(banners.length === 0 || bannerError) ? (
            <div className="w-full h-full bg-gradient-to-r from-orange-600/35 to-[#b33600]/35 flex flex-col justify-center p-6 space-y-1 relative">
              <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-max">Special Offer</span>
              <h3 className="text-xl font-black italic text-yellow-300">GET FREE DELIVERY ABOVE ₹99</h3>
              <p className="text-xs text-gray-400 font-medium">Enjoy fresh baked pizza & delicious thalis!</p>
            </div>
          ) : (
            <img src={banners[bannerIndex]?.url} onError={() => setBannerError(true)} className="w-full h-full object-cover transition-all duration-700" alt="Promo Banner" />
          )}
          {banners.length > 1 && !bannerError && (
            <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full transition-all ${bannerIndex === i ? 'bg-orange-500 w-3' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
        </div>

        {/* INSPIRATION CATEGORIES GRID (Synchronized with visibleCategories list) */}
        <div className="bg-white/[0.01] border border-white/5 p-5 rounded-[2.5rem] shadow-xl space-y-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Inspiration for your first order</p>
          <div className="grid grid-cols-4 gap-x-2 gap-y-5 text-center">
            {(showAllCategories ? visibleCategories : visibleCategories.slice(0, 8)).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)} type="button" className="flex flex-col items-center group outline-none">
                  <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-orange-500 scale-105 shadow-[0_4px_12px_rgba(239,68,68,0.25)]' : 'border-white/10 group-hover:border-white/30'}`}>
                    <img src={getCategoryImage(cat)} className="w-full h-full object-cover" alt={cat} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wide mt-2 max-w-full truncate px-1 transition-colors leading-tight ${isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-white'}`}>
                    {cat === "All" ? "All" : cat.replace("Special ", "").replace(" Special", "")}
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => setShowAllCategories(!showAllCategories)} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black text-gray-400 uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5">
            <span>{showAllCategories ? "See Less" : "See More"}</span>
            <span className="text-[8px]">{showAllCategories ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* FOOD CARD GRID */}
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
                        <button onClick={() => item?.variants ? setSelectedProduct(item) : addItem(item)} className="px-5 py-2.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-xl font-black text-xs active:scale-95 transition-all flex items-center gap-1.5 uppercase shadow-md">
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

      {/* --- REVIEWS SIDE DRAWER --- */}
      <AnimatePresence>
        {isReviewsDrawerOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] overflow-y-auto">
            <div className="p-6 max-w-lg mx-auto pb-32">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-white">Guest Reviews</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Rating: 4.8/5.0 ★</p>
                </div>
                <button onClick={() => setIsReviewsDrawerOpen(false)} className="p-3 bg-white/5 rounded-full text-white active:scale-90 transition-all"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                {(reviews.length === 0 ? DEFAULT_REVIEWS : reviews).map((r: any) => (
                  <div key={r.id} className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 space-y-3 shadow-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-sm text-orange-500">{r.name}</h4>
                      <div className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-lg">
                        <Star size={10} fill="currentColor"/>
                        <span className="text-[10px] font-extrabold">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 font-medium leading-relaxed italic">"{r.comment}"</p>
                  </div>
                ))}
              </div>

              <div className="fixed bottom-6 left-0 w-full px-6 z-50">
                <button onClick={() => setIsReviewFormOpen(true)} className="w-full max-w-md mx-auto bg-orange-500 hover:bg-orange-600 text-black py-4.5 rounded-[2rem] font-black text-sm uppercase tracking-wider shadow-2xl active:scale-95 transition-all">✍️ Write a Review</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- WRITE REVIEW MODAL --- */}
      <AnimatePresence>
        {isReviewFormOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleReviewSubmit} className="bg-[#111] w-full max-w-md p-8 rounded-[3rem] border border-white/10 text-center space-y-4">
              <h3 className="text-2xl font-black text-orange-500 uppercase italic">Your Feedback</h3>
              <p className="text-xs text-gray-500 font-semibold">Humare swaad ke baare mein apni raye dein</p>
              
              <div className="space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Your Name</label>
                  <input type="text" placeholder="Apna naam likhein..." value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm font-bold text-white outline-none focus:border-orange-500" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Rating</label>
                  <div className="flex gap-2 text-yellow-400 py-1 cursor-pointer">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={24} fill={reviewRating >= star ? "currentColor" : "none"} onClick={() => setReviewRating(star)} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1.5">Quick Suggestions:</label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {REVIEW_SUGGESTIONS.map((tag, idx) => (
                      <button key={idx} type="button" onClick={() => handleAddSuggestion(tag)} className="bg-white/5 border border-white/5 text-[9px] font-bold text-gray-300 px-2.5 py-1 rounded-lg hover:bg-orange-500/10 active:scale-95 transition-all">{tag}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Comment</label>
                  <textarea placeholder="Khana kaisa laga?..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm font-bold text-white outline-none focus:border-orange-500 resize-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-black p-4 rounded-xl text-sm active:scale-95 transition-all uppercase">SUBMIT</button>
                <button type="button" onClick={() => setIsReviewFormOpen(false)} className="bg-white/5 text-gray-400 font-bold p-4 rounded-xl text-sm active:scale-95 transition-all">CANCEL</button>
              </div>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* --- VARIANTS POPUP --- */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-[#111] w-full p-8 rounded-t-[3.5rem] border-t border-white/10 max-w-lg mx-auto">
              <div className="w-16 h-1.5 bg-white/15 rounded-full mx-auto mb-6" />
              <h3 className="text-3xl font-black mb-1 text-center tracking-tight">{selectedProduct?.name}</h3>
              <p className="text-orange-500 font-black mb-6 uppercase tracking-widest text-[10px] text-center">Customize Your Order</p>
              
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Select Portion Size:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                    <button type="button" key={size} onClick={() => { setChosenSize(size); setChosenPrice(Number(price)); }} className={`p-4 rounded-2xl flex flex-col items-center justify-center border transition-all ${chosenSize === size ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-white/[0.03] border-white/5 text-gray-400 hover:border-white/15'}`}>
                      <span className="capitalize text-sm font-black">{size}</span>
                      <span className="font-extrabold text-xs mt-1 text-white">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-3 mb-8 border-t border-white/5 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">2. Optional Add-ons:</p>
                  <div className="space-y-2">
                    <div onClick={() => setAddonCheese(!addonCheese)} className={`p-5 rounded-3xl flex justify-between items-center border border-white/5 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all ${addonCheese ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/[0.03]'}`}>
                      <span className="text-xs font-black uppercase text-gray-300">🧀 Extra Cheese (Cheese burst)</span>
                      <span className="text-xs font-black text-orange-500">+₹30</span>
                    </div>
                    <div onClick={() => setAddonVeg(!addonVeg)} className={`p-5 rounded-3xl flex justify-between items-center border border-white/5 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all ${addonVeg ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/[0.03]'}`}>
                      <span className="text-xs font-black uppercase text-gray-300">🥦 Extra Vegetables / Paneer</span>
                      <span className="text-xs font-black text-orange-500">+₹20</span>
                    </div>
                  </div>
                </div>
              )}

              <button type="button" onClick={handleAddAddToCart} className="w-full bg-orange-500 hover:bg-orange-600 p-5 rounded-2xl font-black text-md shadow-xl active:scale-95 transition-all uppercase">Confirm • ₹{chosenPrice + (addonCheese ? 30 : 0) + (addonVeg ? 20 : 0)}</button>
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
                  <div className="flex items-center gap-2.5 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/10 flex-shrink-0">
                    <button onClick={() => removeItem(item.id)} type="button" className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg text-lg font-black active:scale-90 transition-all hover:bg-red-500/20">-</button>
                    <span className="font-black text-sm px-1.5 text-white min-w-[15px] text-center">{item.quantity}</span>
                    {item.isReward ? (
                      // Disable manually adding more quantity to avoid bypass checks
                      <button disabled className="w-8 h-8 flex items-center justify-center bg-white/5 text-gray-600 rounded-lg text-lg font-black cursor-not-allowed">+</button>
                    ) : (
                      <button onClick={() => addItem(item)} type="button" className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 rounded-lg text-lg font-black active:scale-90 transition-all hover:bg-green-500/20">+</button>
                    )}
                  </div>
                </div>
              ))}

              <div className="mt-10 space-y-6">
                
                {/* PDF rules */}
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

                {/* --- LOYALTY CLUB REDEEM BOARD FOR CUSTOMERS (DYNAMIC RULES FETCHED FROM DATABASE) --- */}
                {customerDetails && (
                  <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-[2rem] p-5 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-400 font-black text-xs uppercase tracking-widest">
                      <Gift size={14}/> <span>⭐ BUM BUM LOYALTY CLUB</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <h4 className="text-3xl font-black text-white">{customerPoints} <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Points</span></h4>
                        <p className="text-[9px] text-gray-400 font-medium mt-1">Spend ₹100 = Get 1 Point!</p>
                      </div>
                      <div className="text-right text-[9px] text-yellow-400 font-black space-y-1 uppercase tracking-wider bg-yellow-400/5 p-3 rounded-xl border border-yellow-400/10 max-h-24 overflow-y-auto no-scrollbar">
                        {loyaltyRules.length === 0 ? (
                          <>
                            <p>🎁 10 Pts = Sandwich</p>
                            <p>🎁 20 Pts = Small Pizza</p>
                          </>
                        ) : (
                          loyaltyRules.map(rule => (
                            <p key={rule.id}>🎁 {rule.pointsCost} Pts = {rule.rewardName}</p>
                          ))
                        )}
                      </div>
                    </div>
                    
                    {/* Customer Redemption Controls */}
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Redeem Your Points Here:</p>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto no-scrollbar pr-1">
                        {loyaltyRules.length === 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCustomerRedeem("reward-sandwich", "🎁 FREE Loyalty Sandwich", 10)}
                              disabled={customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) < 10}
                              className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                (customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) >= 10)
                                  ? 'bg-yellow-400 text-black border-yellow-400 active:scale-95 cursor-pointer'
                                  : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed'
                              }`}
                            >
                              🥪 Sandwich (10 Pts)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCustomerRedeem("reward-pizza", "🎁 FREE Loyalty Small Pizza", 20)}
                              disabled={customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) < 20}
                              className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                (customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) >= 20)
                                  ? 'bg-yellow-400 text-black border-yellow-400 active:scale-95 cursor-pointer'
                                  : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed'
                              }`}
                            >
                              🍕 Small Pizza (20 Pts)
                            </button>
                          </>
                        ) : (
                          loyaltyRules.map(rule => {
                            const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                            const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                            return (
                              <button
                                key={rule.id}
                                type="button"
                                onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)}
                                disabled={!isAffordable}
                                className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border truncate ${
                                  isAffordable
                                    ? 'bg-yellow-400 text-black border-yellow-400 active:scale-95 cursor-pointer'
                                    : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed'
                                }`}
                              >
                                🎁 {rule.rewardName} ({rule.pointsCost} P)
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* --- DYNAMIC LOYALTY POINTS TRANSFER / GIFTING SECTION --- */}
                    <div className="border-t border-white/5 pt-3 mt-3">
                      <button 
                        type="button"
                        onClick={() => setIsGiftingOpen(!isGiftingOpen)}
                        className="w-full py-2.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-2xl text-[10px] font-black uppercase text-orange-400 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>🎁 Gift Points to Friend</span>
                        <span className="text-[8px]">{isGiftingOpen ? "▲" : "▼"}</span>
                      </button>

                      {isGiftingOpen && (
                        <form onSubmit={handleGiftPoints} className="mt-3 bg-black/30 p-4 rounded-[1.5rem] border border-white/5 space-y-3">
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Friend's 10-digit Phone</label>
                            <input 
                              type="tel" 
                              maxLength={10} 
                              placeholder="e.g. 9714293759" 
                              value={giftPhone} 
                              onChange={(e) => setGiftPhone(e.target.value)} 
                              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs font-bold text-white outline-none focus:border-orange-500 text-center" 
                              required 
                            />
                          </div>
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Points to Send (Max: {customerPoints})</label>
                            <input 
                              type="number" 
                              placeholder={`Available: ${customerPoints}`} 
                              value={giftAmount} 
                              onChange={(e) => setGiftAmount(e.target.value)} 
                              className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs font-bold text-white outline-none focus:border-orange-500 text-center" 
                              required 
                            />
                          </div>
                          <button 
                            type="submit" 
                            disabled={isGiftingLoading}
                            className="w-full py-3 bg-yellow-400 text-black font-black text-xs uppercase rounded-xl tracking-wider hover:bg-yellow-500 active:scale-95 transition-all flex items-center justify-center gap-1"
                          >
                            {isGiftingLoading ? (
                              <>
                                <span className="animate-spin mr-1">⏳</span> Transferring...
                              </>
                            ) : (
                              "Send Gift 🎁"
                            )}
                          </button>
                        </form>
                      )}
                    </div>

                  </div>
                )}

                {/* Promo Code block */}
                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] space-y-3">
                  <div className="flex items-center gap-2 text-orange-500 font-black text-xs uppercase">
                    <Percent size={16}/> <span>Have a promo code?</span>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. WELCOME" value={enteredCoupon} onChange={(e) => setEnteredCoupon(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-bold uppercase placeholder-gray-600 text-white" />
                    <button type="button" onClick={handleApplyCoupon} className="bg-orange-500 hover:bg-orange-600 font-black text-xs p-3 px-5 rounded-xl text-black active:scale-95 transition-all">APPLY</button>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-xs bg-green-500/10 border border-green-500/25 p-3 rounded-xl">
                      <span className="text-green-400 font-bold uppercase">Code Applied: {appliedCoupon.code}</span>
                      <button onClick={() => { setAppliedCoupon(null); setEnteredCoupon(""); }} className="text-red-400 font-black font-xs">Remove</button>
                    </div>
                  )}
                </div>

                {/* Contact details */}
                {customerDetails ? (
                  <div className="bg-white/[0.02] p-5 rounded-[2.2rem] border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">Ordering As</p>
                      <h4 className="font-black text-md text-orange-500">{customerDetails?.name}</h4>
                      <p className="text-xs text-gray-400 font-bold mt-0.5">{customerDetails?.phone}</p>
                    </div>
                    <button onClick={() => { localStorage.removeItem('bb_cafe_customer'); setCustomerDetails(null); }} className="text-[10px] bg-red-500/10 text-red-500 px-3 py-2 rounded-xl font-black uppercase tracking-wider">Change</button>
                  </div>
                ) : (
                  <button onClick={() => setIsLoginOpen(true)} className="w-full p-5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-[2.2rem] font-black text-sm uppercase tracking-widest active:scale-95 transition-all">👤 Add Name & Phone To Order</button>
                )}

                {/* Delivery Address */}
                <div className="bg-white/[0.02] p-5 rounded-[2.2rem] border border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-orange-500">
                    <MapPin size={18}/> <h3 className="font-black uppercase text-xs tracking-wider">Delivery Address</h3>
                  </div>
                  <textarea placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-orange-500 h-24 text-xs font-semibold text-white placeholder-gray-600 resize-none" />
                </div>

                {/* Bill Details */}
                <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-8 rounded-[2.5rem] text-white shadow-xl">
                  <div className="flex justify-between font-bold mb-2 text-sm text-orange-100"><span>Items Total</span> <span>₹{getTotal()}</span></div>
                  {appliedCoupon && (
                    <div className="flex justify-between font-bold mb-2 text-sm text-green-200"><span>Coupon Discount</span> <span>-₹{appliedCoupon.discountValue}</span></div>
                  )}
                  <div className="flex justify-between font-bold mb-4 opacity-90 text-sm text-orange-100"><span>Delivery Charge</span> <span>{getTotal() < 99 ? "₹20" : "FREE"}</span></div>
                  <div className="h-px bg-white/20 mb-4" />
                  <div className="flex justify-between font-black text-2xl"><span>To Pay</span> <span>₹{Math.max(0, getTotal() - (appliedCoupon ? appliedCoupon.discountValue : 0)) + (getTotal() < 99 ? 20 : 0)}</span></div>
                </div>

                {/* WHATSAPP ACTION BUTTON */}
                <button onClick={sendWhatsAppOrder} type="button" className="w-full bg-green-600 hover:bg-green-700 p-6 rounded-[2.5rem] font-black text-md shadow-xl border border-green-500/20 text-white flex items-center justify-center gap-3">
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

      {/* CONTACT DETAILS MODAL */}
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
                  <label className="text-xs font-bold text-gray-400 uppercase">Your Name</label>
                  <input type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center text-md font-bold outline-none focus:border-orange-500 text-white" required />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Mobile Number</label>
                  <input type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center text-md font-bold outline-none focus:border-orange-500 text-white" required />
                </div>
              </div>

              <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 p-5 rounded-2xl font-black text-md shadow-xl active:scale-95 transition-all uppercase tracking-wider">PROCEED TO ORDER</button>
              <button type="button" onClick={() => setIsLoginOpen(false)} className="mt-6 text-gray-500 text-xs font-black uppercase tracking-widest block mx-auto hover:text-gray-400">Close</button>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* --- SOCIAL MEDIA LINKS MODAL --- */}
      <AnimatePresence>
        {isSocialsOpen && (
          <div className="fixed inset-0 bg-black/95 z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] w-full max-w-md p-8 rounded-[3rem] border border-white/10 text-center space-y-6 relative overflow-hidden"
            >
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
              
              <div>
                <h3 className="text-2xl font-black text-orange-500 uppercase italic">Connect With Us</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">BUM BUM Cafe Mohandra</p>
              </div>

              <div className="space-y-3 text-left max-h-[22rem] overflow-y-auto no-scrollbar pr-1">
                <a href="https://wa.me/919714293759" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 p-3.5 rounded-2xl transition-all active:scale-[0.98]">
                  <span className="text-2xl">🟢</span>
                  <div>
                    <h4 className="text-xs font-black text-white">WhatsApp Message</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Contact Us: 9714293759</p>
                  </div>
                </a>

                <a href="https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-3.5 rounded-2xl transition-all active:scale-[0.98]">
                  <span className="text-2xl">📢</span>
                  <div>
                    <h4 className="text-xs font-black text-white">WhatsApp Channel</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Subscribe for Offers</p>
                  </div>
                </a>

                <a href="https://www.youtube.com/@bbcafe.i" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 p-3.5 rounded-2xl transition-all active:scale-[0.98]">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <h4 className="text-xs font-black text-white">YouTube</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">@bbcafe.i</p>
                  </div>
                </a>

                <a href="https://www.instagram.com/bbcafe.in/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 p-3.5 rounded-2xl transition-all active:scale-[0.98]">
                  <span className="text-2xl">📸</span>
                  <div>
                    <h4 className="text-xs font-black text-white">Instagram</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">@bbcafe.in</p>
                  </div>
                </a>

                <a href="https://www.facebook.com/bbcafe.in/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 p-3.5 rounded-2xl transition-all active:scale-[0.98]">
                  <span className="text-2xl">🔵</span>
                  <div>
                    <h4 className="text-xs font-black text-white">Facebook</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">@bbcafe.in</p>
                  </div>
                </a>

                <a href="https://www.snapchat.com/add/bbcafe.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 p-3.5 rounded-2xl transition-all active:scale-[0.98]">
                  <span className="text-2xl">🟡</span>
                  <div>
                    <h4 className="text-xs font-black text-white">Snapchat</h4>
                    <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Add bbcafe.in</p>
                  </div>
                </a>
              </div>

              <button type="button" onClick={() => setIsSocialsOpen(false)} className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black p-4 rounded-xl text-xs active:scale-95 transition-all uppercase">CLOSE</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
