'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment, runTransaction } from 'firebase/firestore';
import { ShoppingBag, Plus, Search, X, MapPin, Phone, User, Sparkles, Star, Percent, Gift, Loader2, Share2, Heart, Clock, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/useCartStore';

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

const DELIVERY_AREAS = [
  { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-1 KM" },
  { name: "Mohandra Ward 1-5 (Within 2 Km)", fee: 20, minFree: 199, range: "1-2 KM" },
  { name: "Nearby Area (Within 5 Km)", fee: 40, minFree: 499, range: "2-5 KM" },
  { name: "Out of Town (5 to 12 Km)", fee: 60, minFree: 999, range: "5-12 KM" }
];

const HINGLISH_DICT: { [key: string]: string } = {
  "piza": "pizza", "pizaa": "pizza", "panir": "paneer", "tali": "thali", "thaly": "thali",
  "fastfud": "fast food", "rice": "rice", "bread": "bread", "veg": "veg", "chiz": "cheese"
};

const PIZZA_ADDONS: { [size: string]: { [addon: string]: number } } = {
  "small": { "Veg Add-on": 10, "Paneer": 20, "Black Olives": 20, "Jalapeno": 20, "Extra Cheese": 20, "Mushroom": 20 },
  "medium": { "Veg Add-on": 10, "Paneer": 30, "Black Olives": 30, "Jalapeno": 30, "Extra Cheese": 30, "Mushroom": 30 },
  "large": { "Veg Add-on": 20, "Paneer": 40, "Black Olives": 40, "Jalapeno": 40, "Extra Cheese": 40, "Mushroom": 40 },
  "extra large": { "Veg Add-on": 30, "Paneer": 50, "Black Olives": 50, "Jalapeno": 50, "Extra Cheese": 60, "Mushroom": 50 }
};

const SUGGESTED_REVIEWS = [
  "पिज्जा का स्वाद लाजवाब है! मज़ा आ गया 🍕😋",
  "मोहांद्रा में सबसे बेस्ट सर्विस और स्वाद! ⭐⭐⭐⭐⭐",
  "सुपर फास्ट डिलीवरी और शानदार पैकेजिंग! 🛵📦",
  "साफ़-सफ़ाई और शुद्धता 10/10 है! 🧼👌"
];

const PERMANENT_REVIEWS = [
  { id: "rev1", name: "Gaurav Soni", rating: 5, comment: "बम बम कैफे की पनीर पिज्जा सच में पूरे मोहांद्रा में बेस्ट है! एक्स्ट्रा चीज़ लव है। ⭐⭐⭐⭐⭐" },
  { id: "rev2", name: "Anjali Patel", rating: 5, comment: "फास्ट फ़ूड की पैकिंग बहुत अच्छी थी, डिलीवरी बॉय का व्यवहार भी बहुत विनम्र था। ⭐⭐⭐⭐⭐" },
  { id: "rev3", name: "Shubham Dwivedi", rating: 5, comment: "स्पेशल थाली का स्वाद एकदम घर जैसा है। सफ़ाई और शुद्धता लाजवाब है। ⭐⭐⭐⭐⭐" },
  { id: "rev4", name: "Neha Chaurasia", rating: 5, comment: "इस क्षेत्र का सबसे अच्छा कैफे। पिज्जा टॉपिंग्स ताज़ा हैं और क्रस्ट बहुत सॉफ्ट है! ⭐⭐⭐⭐⭐" }
];

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  const addItem = store?.addItem || (() => {});
  const removeItem = store?.removeItem || (() => {});
  const clearCart = store?.clearCart || (() => {});

  // --- 1. STATE VARIABLES ---
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSocialsOpen, setIsSocialsOpen] = useState(false); 
  const [storeOpen, setStoreOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [customerDetails, setCustomerDetails] = useState<{ name: string, phone: string, refCode?: string } | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempRefCode, setTempRefCode] = useState(""); 
  const [address, setAddress] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 

  const [customerPoints, setCustomerPoints] = useState<number>(0);
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]);

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftPhone, setGiftPhone] = useState("");
  const [giftPointsAmount, setGiftPointsAmount] = useState<number | "">("");
  const [isGiftingLoading, setIsGiftingLoading] = useState(false);

  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerError, setBannerError] = useState(false);
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  
  const [isReviewsDrawerOpen, setIsReviewsDrawerOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  
  const [enteredCoupon, setEnteredCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Pizza Add-on States
  const [chosenSize, setChosenSize] = useState<string>("");
  const [chosenPrice, setChosenPrice] = useState<number>(0);
  const [pizzaAddons, setPizzaAddons] = useState<{ [addon: string]: boolean }>({});

  // Cart Specific Add-ons
  const [ketchupAddon, setKetchupAddon] = useState(false);
  const [oreganoAddon, setOreganoAddon] = useState(false);
  const [chiliFlakesAddon, setChiliFlakesAddon] = useState(false);

  // Green Toggle
  const [noCutlery, setNoCutlery] = useState(false);

  // Area Wise Delivery State
  const [selectedArea, setSelectedArea] = useState(DELIVERY_AREAS[0]);

  // Favorite Items List
  const [favorites, setFavorites] = useState<string[]>([]);

  // Eco Digital Invoice Modal
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);

  // UPI Payment Helper Modal
  const [showUPIModal, setShowUPIModal] = useState(false);

  // Confetti Visual Particles State
  const [confettiActive, setConfettiActive] = useState(false);

  // App Sharing Tracker State
  const [shareCount, setShareCount] = useState<number>(0);

  // Geofencing limit parameters
  const [isTooFar, setIsTooFar] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  // PWA (App Install) States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // --- 2. COMPONENT HELPERS & CALCULATION FUNCTIONS ---

  const playSoundEffect = (type: 'add' | 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === 'add') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  const getCartSubtotal = () => cart.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

  const getCartAddonsPrice = () => {
    let total = 0;
    if (ketchupAddon) total += 10;
    if (oreganoAddon) total += 10;
    if (chiliFlakesAddon) total += 10;
    return total;
  };

  const getDeliveryCharge = () => {
    const baseSub = getCartSubtotal();
    if (baseSub === 0) return 0;
    return baseSub >= selectedArea.minFree ? 0 : selectedArea.fee;
  };

  const getTotalBillPrice = () => {
    const subtotal = getCartSubtotal();
    const addPrice = getCartAddonsPrice();
    const delivery = getDeliveryCharge();
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountValue) : 0;
    return Math.max(0, subtotal + addPrice - couponDiscount) + delivery;
  };

  const getFreeDeliveryProgressPercent = () => {
    const subtotal = getCartSubtotal();
    const limit = selectedArea.minFree;
    if (subtotal >= limit) return 100;
    return (subtotal / limit) * 100;
  };

  const getCustomerTier = (points: number) => {
    if (points >= 50) return { name: "Platinum Member 👑", color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10" };
    if (points >= 20) return { name: "Gold Member 🌟", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" };
    return { name: "Bronze Member 🥉", color: "text-orange-400 border-orange-400/30 bg-orange-400/10" };
  };

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

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.includes('/video') || cleanUrl.includes('video');
  };

  const calculateDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatBillNumber = (num: number) => String(num).padStart(4, '0');

  const getCategoryImage = (catName: string) => {
    const found = dbCategories.find(c => c.name === catName);
    if (found && found.image) return found.image;
    return CATEGORY_IMAGES[catName] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
  };

  // --- 3. MEMOS ---

  const activeTheme = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1; 
    
    if (month === 10 || month === 11) {
      return { bg: "from-amber-600 to-red-900", accent: "text-yellow-300", name: "शुभ दीपावली उत्सव 🪔" };
    }
    if (month === 3) {
      return { bg: "from-pink-500 to-purple-800", accent: "text-white", name: "होली रंगोत्सव स्पेशल 🎨" };
    }
    if (month === 8) {
      return { bg: "from-rose-600 to-amber-800", accent: "text-yellow-200", name: "रक्षाबंधन विशेष स्नेह 💖" };
    }
    return { bg: "from-[#ff5e00] to-[#b33600]", accent: "text-yellow-300", name: "BUM BUM CAFE - Mohandra" };
  }, []);

  // Personalized Greeting Memo
  const greetingText = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const month = now.getMonth() + 1; 
    
    let timeGreeting = "नमस्ते";
    if (hours >= 5 && hours < 12) {
      timeGreeting = "शुभ प्रभात ☀️";
    } else if (hours >= 12 && hours < 17) {
      timeGreeting = "शुभ दोपहर 🌤️";
    } else if (hours >= 17 && hours < 22) {
      timeGreeting = "शुभ संध्या 🌆";
    } else {
      timeGreeting = "शुभ रात्रि 🌙";
    }

    let festiveGreeting = "";
    if (month === 10 || month === 11) {
      festiveGreeting = "शुभ दीपावली उत्सव 🪔";
    } else if (month === 3) {
      festiveGreeting = "हैप्पी होली रंगोत्सव 🎨";
    } else if (month === 8) {
      festiveGreeting = "रक्षाबंधन की हार्दिक शुभकामनाएं 💖";
    }

    const finalGreeting = festiveGreeting ? `${festiveGreeting}! ${timeGreeting}` : timeGreeting;
    const customerName = customerDetails?.name ? customerDetails.name : "";

    if (customerName) {
      return `नमस्ते ${customerName} जी, ${finalGreeting}! आज बम बम कैफ़े आपके लिए क्या बनाए? 😊`;
    } else {
      return `नमस्ते, ${finalGreeting}! आज बम बम कैफ़े आपके लिए क्या बनाए? 😊`;
    }
  }, [customerDetails]);

  const deduplicatedMenu = useMemo(() => {
    const seen = new Set();
    const hiddenCategoryNames = new Set(dbCategories.filter((c: any) => c.isVisible === false).map((c: any) => String(c.name).toLowerCase().trim()));

    return menu.filter(item => {
      const itemCatClean = item?.category ? String(item.category).toLowerCase().trim() : "";
      if (hiddenCategoryNames.has(itemCatClean)) return false;
      const nameKey = item?.name ? String(item.name).toLowerCase().trim() : item.id;
      if (seen.has(nameKey)) return false;
      seen.add(nameKey);
      return true;
    });
  }, [menu, dbCategories]);

  const normalizedSearchQuery = useMemo(() => {
    const words = searchQuery.toLowerCase().trim().split(/\s+/);
    const mappedWords = words.map(word => HINGLISH_DICT[word] || word);
    return mappedWords.join(" ");
  }, [searchQuery]);

  const filteredMenu = useMemo(() => {
    return deduplicatedMenu.filter(item => {
      const itemName = item?.name ? String(item.name).toLowerCase() : "";
      const itemCategory = item?.category ? String(item.category) : "";
      
      const isFavoriteFilter = selectedCategory === "Favorites";
      const matchesCategory = isFavoriteFilter 
        ? favorites.includes(item.id) 
        : (selectedCategory === "All" || itemCategory === selectedCategory);
        
      return matchesCategory && itemName.includes(normalizedSearchQuery);
    });
  }, [deduplicatedMenu, selectedCategory, favorites, normalizedSearchQuery]);

  const visibleCategories = useMemo(() => {
    const baseCategories = ["All", ...FALLBACK_CATEGORIES.filter(c => c !== "All")];
    const dbCatsMap = new Map();
    dbCategories.forEach(c => dbCatsMap.set(String(c.name).toLowerCase().trim(), c));
    const result: string[] = [];

    baseCategories.forEach(catName => {
      const cleanName = catName.toLowerCase().trim();
      if (dbCatsMap.has(cleanName)) {
        if (dbCatsMap.get(cleanName).isVisible !== false) result.push(catName);
      } else {
        result.push(catName);
      }
    });

    dbCategories.forEach(c => {
      const cleanName = String(c.name).toLowerCase().trim();
      const alreadyAdded = result.some(r => r.toLowerCase().trim() === cleanName);
      if (!alreadyAdded && c.isVisible !== false && c.name !== "All") result.push(c.name);
    });

    return Array.from(new Set(result));
  }, [dbCategories]);

  const upsellSuggestionItems = useMemo(() => {
    return menu.filter(item => {
      const isShake = item?.category === "Super Cool" || item?.category === "Fast Food";
      const notInCart = !cart.some((c: any) => c.id === item.id);
      return isShake && notInCart;
    }).slice(0, 2);
  }, [menu, cart]);

  // --- 4. LIFE CYCLE EFFECTS ---

  useEffect(() => {
    setMounted(true);
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        toast.success("स्मार्ट ऑफलाइन मोड: आप वापस ऑनलाइन हैं!");
      } else {
        toast.error("स्मार्ट ऑफलाइन मोड: ऑफलाइन हैं, पुराना मेनू डेटा कैश से लोड है।");
      }
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    setIsOnline(navigator.onLine);

    const savedFavs = localStorage.getItem('bb_favorites');
    if (savedFavs) {
      try { setFavorites(JSON.parse(savedFavs)); } catch (e) {}
    }

    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => { if(d.exists()) setStoreOpen(d.data().isOpen); });
    
    const unsubMenu = onSnapshot(query(collection(db, "products")), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.isVisible !== false);
      setMenu(items);
      localStorage.setItem('bb_cached_menu', JSON.stringify(items)); 
    }, () => {
      const localCached = localStorage.getItem('bb_cached_menu');
      if (localCached) setMenu(JSON.parse(localCached));
    });

    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => { setDbCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => { setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => { setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.isApproved === true));
    });
    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => { setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });

    const savedDetails = localStorage.getItem('bb_cafe_customer');
    if (savedDetails) { try { setCustomerDetails(JSON.parse(savedDetails)); } catch (err) {} }

    // Smart Cart Restore on window ready
    const savedCart = localStorage.getItem('bb_cafe_draft_cart');
    if (savedCart && cart.length === 0) {
      try {
        const parsed = JSON.parse(savedCart);
        if (parsed && parsed.length > 0) {
          toast((t) => (
            <div className="flex flex-col gap-2 p-1">
              <p className="text-xs font-bold text-gray-800">क्या आप अपने पिछले ड्राफ्ट कार्ट को रीस्टोर करना चाहते हैं?</p>
              <div className="flex gap-2">
                <button onClick={() => {
                  parsed.forEach((item: any) => addItem(item));
                  localStorage.removeItem('bb_cafe_draft_cart');
                  toast.dismiss(t.id);
                  toast.success("कार्ट रीस्टोर हो गया!");
                }} className="bg-green-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase">रीस्टोर करें</button>
                <button onClick={() => {
                  localStorage.removeItem('bb_cafe_draft_cart');
                  toast.dismiss(t.id);
                }} className="bg-red-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase">हटाएं</button>
              </div>
            </div>
          ), { duration: 8000 });
        }
      } catch (err) {}
    }

    return () => { 
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      unsubStore(); 
      unsubMenu(); 
      unsubCats(); 
      unsubBanners(); 
      unsubReviews(); 
      unsubCoupons(); 
      unsubRules(); 
    };
  }, []);

  // Promotional Banners Automatic Cycle Timer
  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000); 
    return () => clearInterval(interval);
  }, [banners]);

  // PWA (App Install Prompt Listener & Service Worker Registration)
  useEffect(() => {
    // 1. सर्विस वर्कर रजिस्टर करें (क्रोम इंस्टॉलेशन एलिजिबिलिटी के लिए यह ज़रूरी है)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log("Service Worker Registered Successfully"))
        .catch((err) => console.log("Service Worker Registration failed", err));
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt' as any, handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt' as any, handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success("बम बम कैफ़े ऐप इंस्टॉल करने के लिए धन्यवाद! ❤️");
      }
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('bb_cafe_draft_cart', JSON.stringify(cart));
    } else {
      localStorage.removeItem('bb_cafe_draft_cart');
    }
  }, [cart]);

  useEffect(() => {
    if (!customerDetails?.phone) { setCustomerPoints(0); return; }
    const unsubPoints = onSnapshot(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), (docSnap) => {
      setCustomerPoints(docSnap.exists() ? (docSnap.data().points || 0) : 0);
    }, () => { setCustomerPoints(0); });
    
    const phoneClean = customerDetails.phone.replace("+91", "");
    setShareCount(Number(localStorage.getItem(`bb_shares_${phoneClean}`) || 0));

    return () => unsubPoints();
  }, [customerDetails]);

  // --- 5. EVENT HANDLERS & OPERATIONS ---

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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("आपके ब्राउज़र में जीपीएस लोकेशन उपलब्ध नहीं है।");
    }
    toast.loading("सटीक लोकेशन ट्रैक कर रहे हैं...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss();
        const { latitude, longitude } = position.coords;
        setAddress(`My GPS Location: https://www.google.com/maps?q=${latitude},${longitude}`);
        toast.success("जीपीएस से लोकेशन सफलतापूर्वक जोड़ी गई!");
        
        const mohandraLat = 24.2863;
        const mohandraLng = 80.1245;
        
        const calculatedDistance = calculateDistanceInKm(latitude, longitude, mohandraLat, mohandraLng);
        setDistanceKm(Number(calculatedDistance.toFixed(2)));

        if (calculatedDistance > 20) {
          setIsTooFar(true);
          toast.error("ध्यान दें: आप बम बम कैफे से 20 किमी से अधिक दूर हैं। आप केवल हमारा शानदार मेनू देख सकते हैं, आर्डर नहीं कर सकते।", { duration: 8000 });
        } else {
          setIsTooFar(false);
          
          if (calculatedDistance <= 1.0) {
            setSelectedArea(DELIVERY_AREAS[0]); 
            toast.success(`सटीक दूरी: ${calculatedDistance.toFixed(2)} KM। आपके लिए 'Mohandra Town' क्षेत्र चुना गया है।`);
          } else if (calculatedDistance <= 2.0) {
            setSelectedArea(DELIVERY_AREAS[1]); 
            toast.success(`सटीक दूरी: ${calculatedDistance.toFixed(2)} KM। आपके लिए 'Mohandra Ward 1-5' क्षेत्र चुना गया है।`);
          } else if (calculatedDistance <= 5.0) {
            setSelectedArea(DELIVERY_AREAS[2]); 
            toast.success(`सटीक दूरी: ${calculatedDistance.toFixed(2)} KM। आपके लिए 'Nearby Area (Within 5 Km)' क्षेत्र चुना गया है।`);
          } else {
            setSelectedArea(DELIVERY_AREAS[3]); 
            toast.success(`सटीक दूरी: ${calculatedDistance.toFixed(2)} KM। आपके लिए 'Out of Town' क्षेत्र चुना गया है।`);
          }
        }
      },
      () => {
        toast.dismiss();
        toast.error("लोकेशन की अनुमति अस्वीकार कर दी गई है या नेटवर्क त्रुटि है।");
      }
    );
  };

  const handleGiftPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerDetails?.phone) return toast.error("कृपया पहले अपनी डिटेल्स जोड़ें!");
    const senderPhoneRaw = customerDetails.phone.replace("+91", "").trim();
    const friendPhoneRaw = String(giftPhone).replace("+91", "").trim();
    const pointsToGift = Number(giftPointsAmount);

    if (!friendPhoneRaw || friendPhoneRaw.length < 10) return toast.error("कृपया सही 10-digit मोबाइल नंबर डालें!");
    if (senderPhoneRaw === friendPhoneRaw) return toast.error("आप खुद को ऑयल्टी पॉइंट्स गिफ्ट नहीं कर सकते!");
    if (isNaN(pointsToGift) || pointsToGift <= 0) return toast.error("कृपया सही पॉइंट्स की संख्या डालें!");
    if (customerPoints < pointsToGift) return toast.error(`आपके पास पर्याप्त पॉइंट्स नहीं हैं! वर्तमान पॉइंट्स: ${customerPoints}`);

    setIsGiftingLoading(true);
    const senderDocRef = doc(db, "customer_points", senderPhoneRaw);
    const receiverDocRef = doc(db, "customer_points", friendPhoneRaw);

    try {
      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(senderDocRef);
        const receiverSnap = await transaction.get(receiverDocRef);
        
        const currentSenderPoints = senderSnap.exists() ? (senderSnap.data().points || 0) : 0;
        if (currentSenderPoints < pointsToGift) throw new Error("Insufficient points balance!");

        transaction.update(senderDocRef, { points: increment(-pointsToGift) });
        if (!receiverSnap.exists()) {
          transaction.set(receiverDocRef, { name: "Loyal Friend 🎁", phone: friendPhoneRaw, points: pointsToGift, lastActive: new Date() });
        } else {
          transaction.update(receiverDocRef, { points: increment(pointsToGift) });
        }
      });

      toast.success(`🎁 सफलतापूर्वक ${pointsToGift} पॉइंट्स गिफ्ट कर दिए गए हैं!`);
      const inviteMsg = `हे दोस्त! मैंने तुम्हें BAM BAM Cafe के ऐप पर 🎁 ${pointsToGift} Loyalty Points गिफ्ट किए हैं। यहाँ से स्वादिष्ट पिज्जा और थाली आर्डर करो: https://bb-cafe-app.vercel.app/`;
      const whatsappUrl = `https://wa.me/91${friendPhoneRaw}?text=${encodeURIComponent(inviteMsg)}`;
      
      setGiftPhone(""); setGiftPointsAmount(""); setIsGiftModalOpen(false);
      if (window.confirm("क्या आप अपने दोस्त को व्हाट्सएप पर गिफ्ट का मैसेज भेजना चाहते हैं?")) window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      toast.error(err.message === "Insufficient points balance!" ? "अपर्याप्त पॉइंट्स!" : "पॉइंट्स गिफ्ट करने में समस्या आई।");
    } finally { setIsGiftingLoading(false); }
  };

  const handleCustomerRedeem = (id: string, name: string, pointsCost: number) => {
    const currentPointsInCart = cart.reduce((acc: number, item: any) => acc + (item.pointsCost || 0), 0);
    if (customerPoints - currentPointsInCart < pointsCost) return toast.error("आपके पास पर्याप्त ऑयल्टी पॉइंट्स उपलब्ध नहीं हैं!");
    addItem({ id, name, price: 0, pointsCost, isReward: true });
    playSoundEffect('add');
    toast.success(`${name} Cart में जोड़ दिया गया है!`);
  };

  const sendWhatsAppOrder = async () => {
    if (isTooFar) {
      return toast.error("आपकी दूरी 20 KM से अधिक है। आप केवल मेनू देख सकते हैं, ऑर्डर प्लेस नहीं कर सकते!");
    }
    if (!customerDetails) { setIsLoginOpen(true); return; }
    if (!address || address.trim().length < 10) return toast.error("Please enter full address!");

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    let billNumber = 1;
    const counterDocRef = doc(db, "settings", "store_bill_counter");

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
    } catch (e) { billNumber = Math.floor((Date.now() / 1000) % 100000); }

    const formattedBillStr = formatBillNumber(billNumber);
    const subtotal = getCartSubtotal();
    const addOnsCost = getCartAddonsPrice();
    const deliveryCharge = getDeliveryCharge();
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountValue) : 0;
    const finalTotal = getTotalBillPrice();
    
    const pointsEarned = Math.floor(finalTotal / 100);
    const totalPointsCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);

    const orderObj = {
      billNumber, tokenNumber, customerName: customerDetails.name, customerPhone: customerDetails.phone,
      address, items: cart, subtotal, discount: couponDiscount, total: finalTotal, timestamp: new Date(), status: 'pending',
      deliveryArea: selectedArea.name, noCutlery, ketchupAddon, oreganoAddon, chiliFlakesAddon
    };

    try {
      await addDoc(collection(db, "orders"), orderObj);
      if (pointsEarned > 0 || totalPointsCost > 0) {
        await setDoc(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), {
          name: customerDetails.name, phone: customerDetails.phone.replace("+91", ""), points: increment(pointsEarned - totalPointsCost), lastActive: new Date()
        }, { merge: true });
      }
    } catch (e) {}

    setLastPlacedOrder(orderObj);

    let itemsText = "";
    cart.forEach((i: any) => itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`);
    
    if (ketchupAddon) itemsText += `• Extra Tomato Ketchup x1 - ₹10\n`;
    if (oreganoAddon) itemsText += `• Extra Oregano x1 - ₹10\n`;
    if (chiliFlakesAddon) itemsText += `• Extra Chilly Flakes x1 - ₹10\n`;
    if (noCutlery) itemsText += `🌱 (Eco-Friendly: No plastic cutlery requested)\n`;

    const msg = `🔥 *BAM BAM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Delivery Area:* ${selectedArea.name}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal + addOnsCost}\n*Coupon Discount:* -₹${couponDiscount}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${finalTotal}*\n\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}\n_Confirm order by replying 'YES'_`;
    
    playSoundEffect('success');
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 5000);

    setShowUPIModal(true);

    const openWA = () => {
      window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
    };

    (window as any)._pendingWA = openWA;
  };

  const executeWAOpen = () => {
    if ((window as any)._pendingWA) {
      (window as any)._pendingWA();
      (window as any)._pendingWA = null;
    }
    setShowUPIModal(false);
    setShowInvoice(true); 
    clearCart(); 
    
    setKetchupAddon(false);
    setOreganoAddon(false);
    setChiliFlakesAddon(false);
    setNoCutlery(false);
    setAppliedCoupon(null); 
    setEnteredCoupon(""); 
    setIsCartOpen(false);
  };

  const handleShareApp = async () => {
    if (!customerDetails?.phone) {
      toast.error("पॉइंट्स कमाने के लिए पहले Name और Phone दर्ज करें!");
      setIsLoginOpen(true);
      return;
    }

    const phoneClean = customerDetails.phone.replace("+91", "").trim();
    const shareCountKey = `bb_shares_${phoneClean}`;
    let currentShares = Number(localStorage.getItem(shareCountKey) || 0);

    const shareMessage = `🔥 *BAM BAM CAFE - Mohandra* 🔥\nयहाँ से ऑर्डर करें बेहतरीन और स्वादिष्ट Pizza, Thali और Fast Food! सीधे आपके घर तक सुपर फास्ट होम डिलीवरी।\n👉 https://bb-cafe-app.vercel.app/`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

    window.open(whatsappUrl, '_blank');

    if (currentShares < 5) {
      const nextShares = currentShares + 1;
      localStorage.setItem(shareCountKey, String(nextShares));
      setShareCount(nextShares);

      if (nextShares === 5) {
        try {
          const pointsRef = doc(db, "customer_points", phoneClean);
          await setDoc(pointsRef, {
            points: increment(1),
            lastActive: new Date()
          }, { merge: true });

          setCustomerPoints(prev => prev + 1);
          toast.success("🎉 शानदार! आपने 5 दोस्तों के साथ ऐप शेयर करके +1 Loyalty Point कमा लिया है!");
        } catch (e) {}
      } else {
        toast.success(`📤 शेयर किया गया! (${nextShares}/5 प्रोग्रेस। +1 पॉइंट के लिए ${5 - nextShares} और दोस्तों को शेयर करें!)`);
      }
    } else {
      localStorage.setItem(shareCountKey, "1");
      setShareCount(1);
      toast.success("📤 नया शेयर प्रोग्रेस शुरू हुआ! (1/5 पूरा)");
    }
  };

  const handleSocialClick = async (platform: string, url: string) => {
    window.open(url, '_blank');

    if (!customerDetails?.phone) {
      toast.error("पॉइंट्स क्लेम करने के लिए कृपया पहले अपना Name और Phone दर्ज करें!");
      setIsLoginOpen(true);
      return;
    }

    const storageKey = `bb_claimed_${customerDetails.phone.replace("+91", "")}_${platform}`;
    const alreadyClaimed = localStorage.getItem(storageKey);

    if (alreadyClaimed) {
      toast.success("आप इस प्लेटफ़ॉर्म के लिए पहले ही पॉइंट ले चुके हैं! धन्यवाद ❤️");
      return;
    }

    try {
      const phoneRaw = customerDetails.phone.replace("+91", "").trim();
      const pointsRef = doc(db, "customer_points", phoneRaw);
      
      await setDoc(pointsRef, {
        points: increment(1),
        lastActive: new Date()
      }, { merge: true });

      localStorage.setItem(storageKey, "true");
      setCustomerPoints(prev => prev + 1);
      toast.success(`🎉 बधाई हो! ${platform.toUpperCase()} पर हमें फॉलो करने के लिए आपको +1 पॉइंट मिला है!`);
    } catch (err) {
      toast.error("पॉइंट्स जोड़ने में समस्या आई।");
    }
  };

  const getClaimStatus = (platform: string) => {
    if (!customerDetails?.phone) return "🎁 +1 Pt";
    const storageKey = `bb_claimed_${customerDetails.phone.replace("+91", "")}_${platform}`;
    return localStorage.getItem(storageKey) ? "✅ Claimed" : "🎁 Claim +1 Pt";
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName || tempName.trim().length < 3) return toast.error("Please enter your real name");
    if (!tempPhone || tempPhone.trim().length < 10) return toast.error("Please enter 10-digit number");
    
    const details: any = { name: tempName, phone: `+91${tempPhone}` };
    if (tempRefCode) {
      details.refCode = tempRefCode;
    }
    
    localStorage.setItem('bb_cafe_customer', JSON.stringify(details));
    setCustomerDetails(details); 
    setIsLoginOpen(false);
    
    if (tempRefCode) {
      toast.success(`स्वागत है ${tempName}! रेफ़रल कूपन लागू कर दिया गया है।`);
    } else {
      toast.success(`Welcome ${tempName}!`);
    }
  };

  const handleToggleFavorite = (id: string, e: any) => {
    e.stopPropagation();
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter(f => f !== id);
      toast.success("पसंदीदा सूची से हटाया गया।");
    } else {
      updated = [...favorites, id];
      toast.success("पसंदीदा सूची में जोड़ा गया! ❤️");
    }
    setFavorites(updated);
    localStorage.setItem('bb_favorites', JSON.stringify(updated));
  };

  const handleAddToCart = () => {
    if (!chosenSize) return toast.error("Please select a size first!");
    
    const sizeAddons = PIZZA_ADDONS[chosenSize.toLowerCase()] || {};
    let addonsTotal = 0;
    const activeAddonNames: string[] = [];

    Object.entries(pizzaAddons).forEach(([addonName, isSelected]) => {
      if (isSelected) {
        const addonCost = sizeAddons[addonName] || 0;
        addonsTotal += addonCost;
        activeAddonNames.push(`${addonName} (+₹${addonCost})`);
      }
    });

    let finalName = `${selectedProduct.name} (${chosenSize})`;
    if (activeAddonNames.length > 0) {
      finalName += ` with [${activeAddonNames.join(", ")}]`;
    }
    
    const uniqueCartId = `${selectedProduct.id}-${chosenSize}-${Object.keys(pizzaAddons).filter(k => pizzaAddons[k]).join("-")}`;

    addItem({ 
      ...selectedProduct, 
      id: uniqueCartId, 
      name: finalName, 
      price: Number(chosenPrice) + addonsTotal 
    });
    
    playSoundEffect('add');
    toast.success(`${chosenSize} added to cart!`);
    
    setSelectedProduct(null); 
    setChosenSize(""); 
    setChosenPrice(0); 
    setPizzaAddons({});
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      return toast.error("कृपया सभी आवश्यक फ़ील्ड भरें!");
    }
    try {
      await addDoc(collection(db, "reviews"), {
        name: reviewName,
        comment: reviewComment,
        rating: reviewRating,
        isApproved: false, 
        timestamp: new Date()
      });
      toast.success("आपका रिव्यू सबमिट हो गया है! यह एडमिन अप्रूवल के बाद दिखेगा। ❤️");
      setReviewName("");
      setReviewComment("");
      setReviewRating(5);
      setIsReviewFormOpen(false);
    } catch (err) {
      toast.error("रिव्यू सबमिट करने में कोई समस्या आई।");
    }
  };

  if (!mounted) return null;

  return (
    // overflow-x-clip avoids breaking position: sticky scroll container
    // dark:bg and bg classes enable system light/dark mode support smoothly
    <div className="dark:bg-[#050505] bg-gray-50 min-h-screen dark:text-white text-gray-900 pb-32 font-sans relative overflow-x-clip transition-colors duration-200">
      <Toaster position="top-center" />
      
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
        .hide-scrollbar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}} />
      
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
          {Array.from({ length: 100 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: ["#facc15", "#f97316", "#ef4444", "#3b82f6", "#10b981"][i % 5],
                left: `${Math.random() * 100}%`,
                top: `-10px`
              }}
              animate={{
                y: [0, window.innerHeight],
                x: [0, (Math.random() - 0.5) * 200],
                rotate: [0, 360]
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                ease: "easeOut",
                repeat: Infinity
              }}
            />
          ))}
        </div>
      )}

      {/* COMPACT HEADER */}
      <header className={`relative py-6 px-4 bg-gradient-to-r ${activeTheme.bg} flex justify-between items-center border-b border-white/10 shadow-lg`}>
        <div>
          <motion.h1 initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-xl font-black italic tracking-tighter text-yellow-300">BAM BAM CAFE</motion.h1>
          <p className="text-[10px] text-yellow-100 font-bold tracking-wider uppercase">{activeTheme.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="tel:9714293759" className="bg-green-600 text-white p-2 rounded-full border border-white/20 flex items-center justify-center animate-pulse" title="डायरेक्ट कॉल करें">
            <Phone size={13} />
          </a>
          <div className="bg-black/40 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 text-[8px] font-black uppercase text-green-400">
            <span className="h-1 w-1 rounded-full bg-green-500" />100% VEG
          </div>
        </div>
      </header>

      {/* FIXED STICKY SEARCH BAR (Adapts smoothly to light/dark themes) */}
      <div className="sticky top-0 z-50 dark:bg-[#050505] bg-white py-3 px-4 border-b dark:border-white/10 border-gray-200 shadow-md transition-colors duration-200">
        <div className="relative max-w-sm mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search pizza, thali, paneer special..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full dark:bg-neutral-800 bg-gray-100 dark:text-white text-gray-900 py-2.5 px-11 rounded-xl outline-none text-xs font-semibold dark:placeholder-gray-400 placeholder-gray-500 border dark:border-neutral-700 border-gray-200 transition-colors duration-200" 
          />
        </div>
      </div>

      {/* DYNAMIC SHOP CLOSURE BANNER WARNING */}
      {!storeOpen && (
        <div className="bg-red-600 text-white font-black py-3 px-4 text-center text-xs flex items-center justify-center gap-2 shadow-lg border-b border-red-500">
          <span className="animate-pulse">⚠️</span>
          <span>बम बम कैफ़े अभी बंद है। आप केवल हमारा मेनू देख सकते हैं।</span>
        </div>
      )}

      {/* HIGH CONTRAST SIDE ACTION BUTTONS */}
      <button 
        onClick={() => setIsSocialsOpen(true)} 
        className="fixed right-0 top-[28%] -translate-y-1/2 bg-yellow-400 text-black border-l border-y border-yellow-500 py-3 px-1.5 rounded-l-lg z-40 text-[8px] font-black tracking-wider uppercase flex flex-col items-center gap-0.5 shadow-2xl"
        style={{ writingMode: 'vertical-lr' }}
      >
        📱 FOLLOW & EARN
      </button>

      <button 
        onClick={() => setIsReviewsDrawerOpen(true)} 
        className="fixed right-0 top-[42%] -translate-y-1/2 bg-white text-black border-l border-y border-gray-300 py-3 px-1.5 rounded-l-lg z-40 text-[8px] font-black tracking-wider uppercase flex flex-col items-center gap-0.5 shadow-2xl"
        style={{ writingMode: 'vertical-lr' }}
      >
        ⭐ WRITE REVIEW
      </button>

      <main className="pt-3 px-3 max-w-lg mx-auto space-y-4">

        {/* PWA INSTALLATION BANNER */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-[#ff5e00] to-amber-500 p-3.5 rounded-2xl flex items-center justify-between shadow-lg border border-white/10 mx-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📲</span>
              <div>
                <h4 className="text-xs font-black text-white">Bum Bum Cafe App</h4>
                <p className="text-[9px] text-orange-100 font-bold">बिना प्ले स्टोर के सीधे अपने फोन में इंस्टॉल करें!</p>
              </div>
            </div>
            <button 
              onClick={handleInstallClick}
              className="bg-white text-black font-black text-[10px] px-3 py-2 rounded-xl uppercase shadow active:scale-95 transition-all flex-shrink-0"
            >
              Install ➔
            </button>
          </div>
        )}

        {/* PERSONALIZED GREETING BANNER (Clean Text, No Background Box as requested) */}
        <div className="px-1.5 py-1">
          <h3 className="text-xs font-bold dark:text-gray-200 text-gray-700 leading-normal">{greetingText}</h3>
        </div>
        
        {/* Animated & Sliding Promotional Banner */}
        <div className="w-full h-36 rounded-2xl overflow-hidden relative border border-white/5 bg-white/[0.02]">
          {(banners.length === 0 || bannerError) ? (
            <div className="w-full h-full bg-gradient-to-r from-orange-600/35 to-[#b33600]/35 flex flex-col justify-center p-5 space-y-1">
              <span className="text-[8px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-max">Special Offer</span>
              <h3 className="text-lg font-black italic text-yellow-300">GET FREE DELIVERY ABOVE ₹99</h3>
              <p className="text-[10px] text-gray-400">Enjoy fresh baked pizza & delicious thalis!</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div 
                key={bannerIndex}
                initial={{ opacity: 0, x: 70, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -70, scale: 0.95 }}
                transition={{ duration: 0.55, ease: "easeInOut" }}
                className="w-full h-full absolute inset-0"
              >
                {isVideoUrl(banners[bannerIndex]?.url) ? (
                  <video 
                    src={banners[bannerIndex]?.url} 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover"
                    onError={() => setBannerError(true)}
                  />
                ) : (
                  <img 
                    src={banners[bannerIndex]?.url} 
                    className="w-full h-full object-cover" 
                    onError={() => setBannerError(true)} 
                    alt="BAM BAM CAFE Promo"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* CATEGORY SLIDER */}
        <div className="space-y-1">
          <p className="text-[8px] font-black uppercase tracking-wider text-orange-500">Inspiration for your first order</p>
          <div className="flex gap-5 overflow-x-auto hide-scrollbar py-2 px-1">
            <button onClick={() => setSelectedCategory("Favorites")} className="flex flex-col items-center flex-shrink-0 group outline-none">
              <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all flex items-center justify-center ${selectedCategory === "Favorites" ? 'border-red-500 scale-105' : 'border-white/10'}`}>
                <Heart size={24} className={selectedCategory === "Favorites" ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
              </div>
              <span className={`text-[9px] font-black uppercase mt-1.5 truncate ${selectedCategory === "Favorites" ? 'text-red-500' : 'text-gray-400'}`}>My Favorites</span>
            </button>

            {visibleCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-center flex-shrink-0 group outline-none">
                  <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all ${isActive ? 'border-orange-500 scale-105 shadow-md' : 'border-white/10'}`}>
                    <img src={getCategoryImage(cat)} className="w-full h-full object-cover" alt={cat} />
                  </div>
                  <span className={`text-[9px] font-black uppercase mt-1.5 truncate max-w-[70px] text-center ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                    {cat === "All" ? "All" : cat.replace("Special ", "").replace(" Special", "")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RANGE ZONE WARNING */}
        {distanceKm !== null && isTooFar && (
          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-2xl flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-red-400 uppercase">आर्डर सीमा से बाहर ({distanceKm} KM)</p>
              <p className="text-[9px] text-gray-400">आप कैफे से 20 किमी से अधिक दूर हैं। आप केवल हमारा शानदार मेनू देख सकते हैं, आर्डर नहीं कर सकते।</p>
            </div>
          </div>
        )}

        {/* PRODUCTS LISTING */}
        <div className="grid grid-cols-1 gap-4 pt-1">
          {filteredMenu.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-xs font-bold uppercase">No items found...</p>
          ) : (
            filteredMenu.map((item) => {
              return (
                <motion.div 
                  layout 
                  key={item.id} 
                  className="dark:bg-white/[0.02] bg-white rounded-2xl border dark:border-white/5 border-gray-200 overflow-hidden flex flex-col relative shadow-sm transition-colors duration-200"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <div className="relative h-44 w-full overflow-hidden">
                    {/* Animated Image with zoom on hover */}
                    <motion.img 
                      src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&bg=80"} 
                      className="w-full h-full object-cover origin-center" 
                      alt={item.name} 
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                    
                    <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1 text-[8px] font-black uppercase text-green-400">
                      <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />VEG
                    </div>

                    <button onClick={(e) => handleToggleFavorite(item.id, e)} className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 text-white hover:text-red-500 transition-colors">
                      <Heart size={14} className={favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-white"} />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="font-black text-sm dark:text-gray-100 text-gray-800 line-clamp-1">{item.name}</h4>
                      <div className="bg-green-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded flex items-center gap-0.5">
                        <span>4.7</span><span className="text-[8px]">★</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] dark:text-gray-400 text-gray-500 font-bold mt-0.5">
                      <p className="uppercase text-[8px] dark:text-gray-500 text-gray-400">{item.category}</p><p>• 15-25 min</p>
                    </div>
                    <div className="h-px dark:bg-white/5 bg-gray-100 my-2.5" />
                    <div className="flex justify-between items-end mt-0.5">
                      <div>
                        <p className="dark:text-gray-500 text-gray-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Price</p>
                        <p className="text-orange-500 font-black text-base leading-none">{getDisplayPrice(item)}</p>
                        {item.variants && <span className="text-[8px] font-bold text-gray-400 mt-1 block">Options available</span>}
                      </div>
                      {storeOpen && !isTooFar && (
                        <button onClick={() => item.variants ? setSelectedProduct(item) : addItem(item)} className="px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-lg font-black text-[10px] active:scale-95 transition-all uppercase flex items-center gap-1 shadow">
                          <Plus size={12} /> ADD
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* PERMANENT REVIEWS SECTION */}
        <div className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1">⭐ हमारे ग्राहकों के प्यारे शब्द</h3>
            <span className="text-[9px] font-bold text-gray-400">Total Reviews ({reviews.length || 4})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {PERMANENT_REVIEWS.map((r) => (
              <div key={r.id} className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl space-y-2 shadow-sm transition-colors duration-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs text-orange-500">{r.name}</h4>
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} size={8} fill="currentColor" />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] dark:text-gray-300 text-gray-600 italic leading-relaxed">"{r.comment}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pt-8 border-t border-white/5 space-y-6">
          <div className="bg-gradient-to-br dark:from-green-950/20 dark:to-emerald-900/10 from-green-50 to-emerald-50/50 p-6 rounded-[2rem] border dark:border-green-500/10 border-green-200/50 relative overflow-hidden transition-colors duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl" />
            
            <div className="text-center space-y-3 relative z-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">About Us</span>
              <h4 className="text-xl font-black italic text-yellow-300 tracking-tight font-serif">BUM BUM CAFE</h4>
              <p className="text-[11px] font-bold text-green-300">जहाँ स्वाद और सुकून मिलते हैं! ✨</p>
              
              <p className="text-[11px] dark:text-gray-300 text-gray-600 leading-relaxed max-w-sm mx-auto font-medium">
                हमने BAM BAM CAFE की शुरुआत एक छोटे से सपने के साथ की थी—लोगों को घर जैसा स्वाद और कैफे वाला माहौल देने के लिए। यहाँ हर कप कॉफी और हर स्लाइस पिज्जा प्यार और शुद्धता के साथ बनाया जाता है। हमारी कोशिश है कि आप जब भी यहाँ आएँ, एक प्यारी मुस्कान के साथ वापस जाएँ। ❤️
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-black uppercase">
            <div className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-sm transition-colors duration-200">
              <Clock className="text-orange-500" size={16} />
              <p className="dark:text-gray-400 text-gray-500 text-[8px]">Open Timing</p>
              <p className="dark:text-white text-gray-800 text-[9px]">सुबह 10:00 से रात 11:00 बजे</p>
            </div>
            
            <a href="https://maps.app.goo.gl/8pj1Xby3bbMn5qxu5" target="_blank" rel="noreferrer" className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-orange-500/30 shadow-sm transition-all duration-200">
              <MapPin className="text-green-500 animate-bounce" size={16} />
              <p className="dark:text-gray-400 text-gray-500 text-[8px]">Our Location</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-[9px] underline">Google Map 🗺️</p>
            </a>
          </div>

          <div className="text-center text-[9px] text-gray-600 font-bold tracking-widest pt-2">
            © 2026 BUM BUM CAFE - MOHANDRA. ALL RIGHTS RESERVED.
          </div>
        </footer>
      </main>

      {/* REVIEWS DRAWER MODAL */}
      <AnimatePresence>
        {isReviewsDrawerOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] overflow-y-auto">
            <div className="p-6 max-w-lg mx-auto pb-32">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white">All Reviews</h2>
                  <p className="text-xs text-gray-500 font-bold">Rating: 4.8/5.0 ★</p>
                </div>
                <button onClick={() => setIsReviewsDrawerOpen(false)} className="p-2.5 bg-white/5 rounded-full text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                {(reviews.length === 0 ? PERMANENT_REVIEWS : reviews).map((r: any) => (
                  <div key={r.id} className="dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 rounded-2xl p-5 space-y-2 shadow-sm transition-colors duration-200">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs text-orange-500">{r.name}</h4>
                      <div className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded text-[9px]">
                        <Star size={8} fill="currentColor"/><span className="font-extrabold">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-[11px] dark:text-gray-300 text-gray-600 italic">"{r.comment}"</p>
                  </div>
                ))}
              </div>
              <div className="fixed bottom-6 left-0 w-full px-6 z-50">
                <button onClick={() => setIsReviewFormOpen(true)} className="w-full max-w-md mx-auto bg-orange-500 text-black py-3.5 rounded-2xl font-black text-xs uppercase">✍️ Write a Review</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReviewFormOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleReviewSubmit} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <h3 className="text-xl font-black text-orange-500 uppercase italic">Your Feedback</h3>
              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">Your Name</label>
                  <input type="text" placeholder="Enter your name..." value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-lg text-xs dark:text-white text-gray-900 focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">Rating</label>
                  <div className="flex gap-1 text-yellow-400 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={20} fill={reviewRating >= star ? "currentColor" : "none"} onClick={() => setReviewRating(star)} className="cursor-pointer" />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">पसंदीदा रिव्यू टच करें:</label>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {SUGGESTED_REVIEWS.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => setReviewComment(suggestion)}
                        className="dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-200 hover:border-orange-500/50 px-2 py-1 rounded-full text-[9px] dark:text-gray-300 text-gray-700 font-bold transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">Comments</label>
                  <textarea placeholder="Khana kaisa laga?..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-lg text-xs dark:text-white text-gray-900 focus:border-orange-500 outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-orange-500 text-black font-black p-3 rounded-lg text-xs uppercase">SUBMIT</button>
                <button type="button" onClick={() => setIsReviewFormOpen(false)} className="dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-gray-600 font-bold p-3 rounded-lg text-xs">CANCEL</button>
              </div>
            </form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="dark:bg-[#111] bg-white w-full p-6 rounded-t-3xl border-t dark:border-white/10 border-gray-200 max-w-lg mx-auto overflow-y-auto max-h-[90vh] shadow-2xl transition-colors duration-200">
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-black text-center">{selectedProduct?.name}</h3>
              <p className="text-orange-500 font-black mb-4 uppercase text-[8px] text-center">Customize Your Order</p>
              
              <div className="space-y-3 mb-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase">1. Select Portion Size:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                    <button 
                      type="button" 
                      key={size} 
                      onClick={() => { setChosenSize(size); setChosenPrice(Number(price)); }} 
                      className={`p-3 rounded-xl flex flex-col items-center border transition-all ${chosenSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'dark:bg-white/[0.03] bg-gray-50 dark:border-white/5 border-gray-200 dark:text-gray-400 text-gray-600'}`}
                    >
                      <span className="capitalize text-xs font-black">{size}</span>
                      <span className="font-extrabold text-[10px] mt-1 dark:text-white text-gray-800">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {chosenSize && (selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-3 mb-6 border-t border-white/5 pt-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">2. Select Add-ons (Prices updated for {chosenSize}):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PIZZA_ADDONS[chosenSize.toLowerCase()] || {}).map(([addon, cost]) => {
                      const isSelected = !!pizzaAddons[addon];
                      return (
                        <button
                          type="button"
                          key={addon}
                          onClick={() => setPizzaAddons(prev => ({ ...prev, [addon]: !prev[addon] }))}
                          className={`p-2.5 rounded-xl border flex justify-between items-center text-[9px] font-bold ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'dark:border-white/5 border-gray-200 dark:bg-white/[0.02] bg-gray-50 dark:text-gray-300 text-gray-600'}`}
                        >
                          <span>{addon}</span>
                          <span className="text-orange-400 font-black">+₹{cost}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button type="button" onClick={handleAddToCart} className="w-full bg-orange-500 text-black p-4 rounded-xl font-black text-xs uppercase">
                Confirm Add To Cart
              </button>
              <button type="button" onClick={() => { setSelectedProduct(null); setChosenSize(""); setChosenPrice(0); }} className="w-full mt-3 dark:text-gray-500 text-gray-400 font-black text-[10px] text-center uppercase">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CART DRAWER MODAL */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-end">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-gray-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200"
            >
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white text-gray-900 font-mono">Your Order Cart</h2>
                <button onClick={() => { setIsCartOpen(false); }} className="p-2.5 dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:text-white text-gray-800 rounded-full transition-all"><X size={20} /></button>
              </div>

              {cart.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center dark:bg-white/[0.02] bg-white p-4 rounded-2xl mb-3 border dark:border-white/5 border-gray-200 shadow-sm transition-colors duration-200">
                  <div className="min-w-0 pr-3">
                    <h4 className="font-bold text-xs dark:text-gray-100 text-gray-800 truncate">{item?.name || "Item"}</h4>
                    <p className="text-orange-500 font-black mt-1 text-[11px]">₹{item?.price || 0}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-xl border border-white/10 flex-shrink-0">
                    <button onClick={() => removeItem(item.id)} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded text-sm font-black">-</button>
                    <span className="font-black text-xs px-1 dark:text-white text-gray-800">{item.quantity}</span>
                    {item.isReward ? (
                      <button disabled className="w-6 h-6 flex items-center justify-center bg-white/5 text-gray-600 rounded text-sm font-black cursor-not-allowed">+</button>
                    ) : (
                      <button onClick={() => addItem(item)} className="w-6 h-6 flex items-center justify-center bg-green-500/10 text-green-500 rounded text-sm font-black">+</button>
                    )}
                  </div>
                </div>
              ))}

              <div className="mt-6 space-y-4">
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-orange-400">
                    <span>🚚 Free Delivery Target:</span>
                    <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                  </div>
                  <p className="text-[8px] text-gray-400 font-bold">*Mohandra Town is free delivery above ₹99. Nearby Areas limit is active.</p>
                </div>

                <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2 transition-colors duration-200">
                  <p className="text-[9px] font-black uppercase text-gray-400">Add Extra condiments to order:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setKetchupAddon(!ketchupAddon)} className={`p-2 rounded-xl border text-[9px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-400' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-gray-500'}`}>
                      Ketchup (+₹10)
                    </button>
                    <button onClick={() => setOreganoAddon(!oreganoAddon)} className={`p-2 rounded-xl border text-[9px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-400' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-gray-500'}`}>
                      Oregano (+₹10)
                    </button>
                    <button onClick={() => setChiliFlakesAddon(!chiliFlakesAddon)} className={`p-2 rounded-xl border text-[9px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-gray-500'}`}>
                      Chili Flakes (+₹10)
                    </button>
                  </div>
                </div>

                {upsellSuggestionItems.length > 0 && (
                  <div className="bg-purple-900/10 border border-purple-500/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] font-black uppercase text-purple-400 tracking-wider">Frequently Bought Together 🥤</p>
                    <div className="space-y-2">
                      {upsellSuggestionItems.map((suggest) => (
                        <div key={suggest.id} className="flex justify-between items-center text-[10px]">
                          <div>
                            <span className="font-bold block text-white">{suggest.name}</span>
                            <span className="text-orange-400 font-extrabold">{getDisplayPrice(suggest)}</span>
                          </div>
                          <button onClick={() => addItem(suggest)} className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg font-black uppercase">ADD</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2 transition-colors duration-200">
                  <label className="text-[9px] font-black uppercase text-gray-400">Select Delivery Zone (KM):</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DELIVERY_AREAS.map((area) => {
                      const isSelected = selectedArea.name === area.name;
                      return (
                        <button
                          type="button"
                          key={area.name}
                          onClick={() => setSelectedArea(area)}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md' 
                              : 'dark:border-white/5 border-gray-200 dark:bg-white/[0.01] bg-gray-50 dark:text-gray-300 text-gray-600 hover:border-gray-300 hover:dark:border-white/10'
                          }`}
                        >
                          <span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span>
                          <div className="flex justify-between items-center w-full mt-2">
                            <span className="text-[8px] font-black text-gray-400">शुल्क: ₹{area.fee}</span>
                            <span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded text-yellow-400">Min: ₹{area.minFree}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="dark:bg-green-950/10 bg-green-50/50 border dark:border-green-500/10 border-green-200/50 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-green-400 uppercase tracking-tight">🌱 Eco-Friendly Packaging</p>
                    <p className="text-[8px] text-gray-400 font-bold">चम्मच / टिश्यू पेपर की आवश्यकता नहीं है</p>
                  </div>
                  <input type="checkbox" checked={noCutlery} onChange={() => setNoCutlery(!noCutlery)} className="w-4 h-4 accent-green-500" />
                </div>

                {customerDetails && (
                  <div className="dark:bg-yellow-400/5 bg-yellow-400/10 border dark:border-yellow-400/20 border-yellow-400/30 rounded-2xl p-4 space-y-3 transition-colors duration-200">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <div className="flex items-center gap-1 text-yellow-400 font-black text-[10px] uppercase"><Gift size={12}/> <span>LOYALTY CLUB</span></div>
                      <span className={`text-[8px] font-black border px-2 py-0.5 rounded-full ${getCustomerTier(customerPoints).color}`}>
                        {getCustomerTier(customerPoints).name}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-2xl font-black dark:text-white text-gray-800">{customerPoints} <span className="text-[9px] text-gray-500 font-bold uppercase">Points</span></h4>
                        <p className="text-[8px] text-gray-400">Spend ₹100 = Get 1 Point!</p>
                      </div>
                      <div className="text-right text-[8px] text-yellow-400 font-black space-y-0.5 uppercase max-h-20 overflow-y-auto no-scrollbar">
                        {loyaltyRules.map(rule => (<p key={rule.id}>🎁 {rule.pointsCost} Pts = {rule.rewardName}</p>))}
                      </div>
                    </div>

                    <div className="pt-1.5 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-gray-400 font-black uppercase">Share Progress:</span>
                        <span className="text-[9px] text-yellow-400 font-black bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">{shareCount}/5 Shared</span>
                      </div>
                      <button type="button" onClick={handleShareApp} className="w-full bg-green-600 text-white font-black py-2 rounded-lg text-[9px] uppercase flex items-center justify-center gap-1 shadow-md">
                        <Share2 size={12}/>
                        <span>Share 5 Times to earn free +1 Loyalty Point! 🎁</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Gift points to friend:</span>
                      <button type="button" onClick={() => setIsGiftModalOpen(true)} className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-1 rounded text-[8px] font-black uppercase">🎁 Gift Points</button>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <p className="text-[9px] text-gray-400 font-black uppercase">Redeem Points:</p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                        {loyaltyRules.map(rule => {
                          const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                          const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                          return (
                            <button key={rule.id} type="button" onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)} disabled={!isAffordable} className={`py-2 px-2 rounded text-[9px] font-black uppercase border truncate ${isAffordable ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white/5 text-gray-500 border-white/5'}`}>🎁 {rule.rewardName} ({rule.pointsCost} P)</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 p-4 rounded-2xl space-y-2 transition-colors duration-200">
                  <div className="flex items-center gap-1.5 text-orange-500 font-black text-[10px] uppercase"><Percent size={14}/> <span>Have a promo code?</span></div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. WELCOME" value={enteredCoupon} onChange={(e) => setEnteredCoupon(e.target.value)} className="flex-1 dark:bg-black/40 bg-white border dark:border-white/10 border-gray-200 rounded-lg p-2 text-xs dark:text-white text-gray-900 uppercase" />
                    <button type="button" onClick={handleApplyCoupon} className="bg-orange-500 text-black font-black text-[10px] p-2 px-4 rounded-lg">APPLY</button>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-[10px] bg-green-500/10 border border-green-500/25 p-2 rounded-lg">
                      <span className="text-green-400 font-bold uppercase">Code Applied: {appliedCoupon.code}</span>
                      <button onClick={() => {  setAppliedCoupon(null); setEnteredCoupon(""); }} className="text-red-400 font-bold">Remove</button>
                    </div>
                  )}
                </div>

                {customerDetails ? (
                  <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 flex justify-between items-center transition-colors duration-200">
                    <div>
                      <p className="text-[8px] text-gray-500 font-black uppercase">Ordering As</p>
                      <h4 className="font-black text-xs text-orange-500">{customerDetails.name}</h4>
                      <p className="text-[10px] text-gray-400">{customerDetails.phone}</p>
                    </div>
                    <button onClick={() => { localStorage.removeItem('bb_cafe_customer'); setCustomerDetails(null); }} className="text-[9px] bg-red-500/10 text-red-500 px-2.5 py-1.5 rounded-lg font-black uppercase">Change</button>
                  </div>
                ) : (
                  <button onClick={() => setIsLoginOpen(true)} className="w-full p-4 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-2xl font-black text-xs uppercase">👤 Add Name & Phone To Order</button>
                )}

                <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 space-y-2 transition-colors duration-200">
                  <div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/> <h3 className="font-black uppercase text-[10px]">Delivery Address</h3></div>
                  <div className="flex justify-between items-center mb-1">
                    <button type="button" onClick={handleDetectLocation} className="text-[8px] bg-green-600 text-white font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase">📍 Detect Location</button>
                  </div>
                  <textarea placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full dark:bg-black/40 bg-white border dark:border-white/10 border-gray-200 rounded-xl p-3 text-xs font-semibold dark:text-white text-gray-900 resize-none h-16 outline-none" />
                </div>

                <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white">
                  <div className="flex justify-between font-bold mb-1.5 text-xs"><span>Items Total</span> <span>₹{getCartSubtotal()}</span></div>
                  {getCartAddonsPrice() > 0 && <div className="flex justify-between font-bold mb-1.5 text-xs"><span>Extra Condiments</span> <span>+₹{getCartAddonsPrice()}</span></div>}
                  {appliedCoupon && (
                    <div className="flex justify-between font-bold mb-1.5 text-xs text-green-200"><span>Coupon Discount</span> <span>-₹{appliedCoupon.discountValue}</span></div>
                  )}
                  <div className="flex justify-between font-bold mb-3 text-xs opacity-90"><span>Delivery Charge</span> <span>₹{getDeliveryCharge()}</span></div>
                  <div className="h-px bg-white/20 mb-3" />
                  <div className="flex justify-between font-black text-xl"><span>To Pay</span> <span>₹{getTotalBillPrice()}</span></div>
                </div>

                {isTooFar ? (
                  <div className="bg-red-600/20 text-red-400 p-4 rounded-2xl text-center text-xs font-bold border border-red-500/20">
                    आप 20 KM से अधिक दूर हैं। आर्डर स्वीकार नहीं किया जा सकता। ❌
                  </div>
                ) : (
                  <button onClick={sendWhatsAppOrder} type="button" className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg">ORDER ON WHATSAPP</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-4 px-5 rounded-2xl font-black text-xs uppercase flex justify-between items-center shadow-2xl active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} />
              <span>{cart.reduce((acc: number, item: any) => acc + item.quantity, 0)} Items Added</span>
            </div>
            <div className="flex items-center gap-0.5 bg-black/10 px-2 py-1 rounded-lg">
              <span>View Cart</span>
              <ChevronRight size={12} />
            </div>
          </button>
        </div>
      )}

      <AnimatePresence>
        {isLoginOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleSaveDetails} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <User className="mx-auto text-orange-500" size={36} />
              <div>
                <h2 className="text-xl font-black mb-0.5">Your Details</h2>
                <p className="text-gray-500 font-semibold text-[8px] uppercase tracking-wider">Setup Once • Order Fast</p>
              </div>
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Your Name</label>
                  <input type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-gray-900 outline-none focus:border-orange-500 text-xs" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Mobile Number</label>
                  <input type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-gray-900 outline-none focus:border-orange-500 text-xs" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">Referral Code (Optional)</label>
                  <input type="text" placeholder="Enter invite code..." value={tempRefCode} onChange={(e) => setTempRefCode(e.target.value)} className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-gray-900 outline-none focus:border-orange-500 text-xs" />
                </div>
              </div>
              <button type="submit" className="w-full bg-orange-500 text-black p-4 rounded-xl font-black text-xs uppercase">PROCEED TO ORDER</button>
              <button type="button" onClick={() => setIsLoginOpen(false)} className="mt-2 text-gray-500 text-[9px] font-black uppercase block mx-auto">Close</button>
            </form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGiftModalOpen && (
          <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6">
            <motion.form onSubmit={handleGiftPoints} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <Gift className="mx-auto text-yellow-400" size={32} />
              <div>
                <h3 className="text-lg font-black text-yellow-400 uppercase italic">Gift Loyalty Points</h3>
                <p className="text-[9px] text-gray-500 font-semibold mt-0.5">अपने पॉइंट्स किसी दोस्त को गिफ्ट करें</p>
              </div>
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">Friend's Phone Number</label>
                  <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} required className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl text-xs font-bold dark:text-white text-gray-900 outline-none text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">Points to Gift (Your Pts: {customerPoints})</label>
                  <input type="number" placeholder="e.g. 10" value={giftPointsAmount} onChange={(e) => setGiftPointsAmount(e.target.value === "" ? "" : Number(e.target.value))} required className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl text-xs font-bold dark:text-white text-gray-900 outline-none text-center" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isGiftingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1">
                  {isGiftingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Gift Points 🎁</span>}
                </button>
                <button type="button" onClick={() => { setIsGiftModalOpen(false); setGiftPhone(""); setGiftPointsAmount(""); }} className="bg-white/5 text-gray-400 font-bold p-3 rounded-xl text-xs">CANCEL</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSocialsOpen && (
          <div className="fixed inset-0 bg-black/95 z-[250] flex items-center justify-center p-6">
            <motion.div className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <div>
                <h3 className="text-xl font-black text-orange-500 uppercase italic">Connect & Earn Points</h3>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">हर प्लेटफार्म पर फॉलो/सब्सक्राइब करने का +1 पॉइंट पाएं!</p>
              </div>
              <div className="space-y-2 text-left max-h-[22rem] overflow-y-auto no-scrollbar pr-1">
                <button onClick={() => handleSocialClick('whatsapp_msg', 'https://wa.me/919714293759')} className="w-full flex items-center justify-between dark:bg-green-500/10 bg-green-50/50 border dark:border-green-500/20 border-green-200/50 p-3 rounded-xl">
                  <span className="text-[10px] font-black dark:text-white text-gray-900">🟢 WhatsApp Message</span>
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded bg-yellow-400 text-black">{getClaimStatus('whatsapp_msg')}</span>
                </button>
                <button onClick={() => handleSocialClick('whatsapp_channel', 'https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y')} className="w-full flex items-center justify-between dark:bg-emerald-500/10 bg-green-50/50 border dark:border-emerald-500/20 border-green-200/50 p-3 rounded-xl">
                  <span className="text-[10px] font-black dark:text-white text-gray-900">📢 WhatsApp Channel</span>
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded bg-yellow-400 text-black">{getClaimStatus('whatsapp_channel')}</span>
                </button>
                <button onClick={() => handleSocialClick('youtube', 'https://www.youtube.com/@bbcafe.i')} className="w-full flex items-center justify-between dark:bg-red-600/10 bg-green-50/50 border dark:border-red-600/20 border-green-200/50 p-3 rounded-xl">
                  <span className="text-[10px] font-black dark:text-white text-gray-900">🔴 YouTube Channel</span>
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded bg-yellow-400 text-black">{getClaimStatus('youtube')}</span>
                </button>
                <button onClick={() => handleSocialClick('instagram', 'https://www.instagram.com/bbcafe.in/')} className="w-full flex items-center justify-between dark:bg-pink-500/10 bg-green-50/50 border dark:border-pink-500/20 border-green-200/50 p-3 rounded-xl">
                  <span className="text-[10px] font-black dark:text-white text-gray-900">📸 Instagram</span>
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded bg-yellow-400 text-black">{getClaimStatus('instagram')}</span>
                </button>
                <button onClick={() => handleSocialClick('facebook', 'https://www.facebook.com/bbcafe.in/')} className="w-full flex items-center justify-between dark:bg-blue-600/10 bg-green-50/50 border dark:border-blue-600/20 border-green-200/50 p-3 rounded-xl">
                  <span className="text-[10px] font-black dark:text-white text-gray-900">🔵 Facebook</span>
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded bg-yellow-400 text-black">{getClaimStatus('facebook')}</span>
                </button>
                <button onClick={() => handleSocialClick('snapchat', 'https://www.snapchat.com/add/bbcafe.in')} className="w-full flex items-center justify-between dark:bg-yellow-400/10 bg-green-50/50 border dark:border-yellow-400/20 border-green-200/50 p-3 rounded-xl">
                  <span className="text-[10px] font-black dark:text-white text-gray-900">🟡 Snapchat</span>
                  <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded bg-yellow-400 text-black">{getClaimStatus('snapchat')}</span>
                </button>
              </div>
              <button type="button" onClick={() => setIsSocialsOpen(false)} className="w-full bg-orange-500 text-black font-black p-3 rounded-xl text-xs uppercase">CLOSE</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPI PAYMENT ASSISTANCE MODAL */}
      <AnimatePresence>
        {showUPIModal && (
          <div className="fixed inset-0 bg-black/95 z-[250] flex items-center justify-center p-6">
            <div className="dark:bg-[#111] bg-white w-full max-w-sm p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <Sparkles className="mx-auto text-yellow-400 animate-pulse" size={28} />
              
              <div className="space-y-1">
                <h3 className="text-lg font-black dark:text-white text-gray-900">आर्डर भुगतान सहायता 💳</h3>
                <p className="text-[10px] dark:text-gray-400 text-gray-600 font-semibold leading-relaxed">
                  नीचे दिए गए बटन पर क्लिक करके अपने फोन के पेमेंट ऐप (GPay, PhonePe, Paytm) से सीधे भुगतान करें।
                </p>
              </div>

              <div className="pt-2">
                <a 
                  href={`upi://pay?pa=Q231198993@ybl&pn=BUM%20BUM%20CAFE&am=${getTotalBillPrice()}&cu=INR`}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black p-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  ⚡ PAY ₹{getTotalBillPrice()} NOW VIA UPI
                </a>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-3 text-gray-500 text-[8px] font-black uppercase">OR (स्कैन करें)</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <div className="bg-white p-3 rounded-2xl w-40 h-40 mx-auto flex items-center justify-center border border-gray-200 shadow-inner transition-colors duration-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=Q231198993@ybl&pn=BUM%20BUM%20CAFE&am=${getTotalBillPrice()}&cu=INR`)}`} 
                  className="w-full h-full" 
                  alt="Merchant QR Code" 
                />
              </div>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-wider block">Scan to Pay with any BHIM UPI App</span>

              <button onClick={executeWAOpen} className="w-full bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-xl font-black text-xs uppercase tracking-wider">
                PROCEED TO WHATSAPP
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DIGITAL GREEN INVOICE */}
      <AnimatePresence>
        {showInvoice && lastPlacedOrder && (
          <div className="fixed inset-0 bg-black/95 z-[240] flex items-center justify-center p-6">
            <div className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 max-h-[85vh] overflow-y-auto shadow-xl transition-colors duration-200">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-green-400">🌱 DIGITAL GREEN INVOICE</span>
                <button onClick={() => setShowInvoice(false)} className="text-gray-400"><X size={16} /></button>
              </div>
              <h4 className="text-xl font-black text-yellow-400 italic">BUM BUM CAFE</h4>
              
              <div className="text-left text-xs space-y-1.5 dark:text-gray-300 text-gray-600 font-mono">
                <p>Order No: #{formatBillNumber(lastPlacedOrder.billNumber)}</p>
                <p>Token No: #{lastPlacedOrder.tokenNumber}</p>
                <p>Customer: {lastPlacedOrder.customerName}</p>
                <p>Phone: {lastPlacedOrder.customerPhone}</p>
                <div className="border-t border-dashed border-white/10 my-2" />
                {lastPlacedOrder.items.map((it: any) => (
                  <div key={it.id} className="flex justify-between">
                    <span>{it.name} x{it.quantity}</span>
                    <span>₹{it.price * it.quantity}</span>
                  </div>
                ))}
                {lastPlacedOrder.ketchupAddon && <div className="flex justify-between"><span>Extra Ketchup</span><span>₹10</span></div>}
                {lastPlacedOrder.oreganoAddon && <div className="flex justify-between"><span>Extra Oregano</span><span>₹10</span></div>}
                {lastPlacedOrder.chiliFlakesAddon && <div className="flex justify-between"><span>Extra Chili Flakes</span><span>₹10</span></div>}
                <div className="border-t border-dashed border-white/10 my-2" />
                <div className="flex justify-between text-yellow-300 font-black">
                  <span>GRAND TOTAL</span>
                  <span>₹{lastPlacedOrder.total}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a 
                  href={`https://wa.me/919714293759?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(lastPlacedOrder.billNumber)} (टोकन नंबर: #${lastPlacedOrder.tokenNumber}) का लाइव स्टेटस बताएं।`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-yellow-400 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wider block"
                >
                  🔍 चेक आर्डर स्टेटस (WA)
                </a>
              </div>

              <p className="text-[9px] text-green-500 dark:text-green-400 dark:bg-green-500/10 bg-green-50 p-2.5 rounded-xl font-bold">
                🌱 पेपर रसीद के बिना DIGITAL इनवॉइस जनरेट किया गया है। धन्यवाद!
              </p>
              <button onClick={() => setShowInvoice(false)} className="w-full bg-white text-black p-3 rounded-xl text-xs font-black uppercase">
                CLOSE RECEIPT
              </button>
            </div>
          </div>
        )}
      </  AnimatePresence>

    </div>
  );
}
