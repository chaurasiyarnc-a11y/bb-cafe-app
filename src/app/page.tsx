'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment, runTransaction, getDoc, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { ShoppingBag, Plus, Search, X, MapPin, Phone, User, Sparkles, Star, Percent, Gift, Loader2, Share2, Heart, Clock, ChevronRight, WifiOff, History, LogOut, Lock, Video, Award, Check, Play, Navigation } from 'lucide-react';
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

const DIY_PIZZA_PRICES: any = {
  small: {
    base: 15, sauce: 10, mozzarella: 40,
    veggies: { onion: 10, tomato: 10, capsicum: 10, corn: 10 },
    black_olive: 20, jalapeno: 20, red_peprica: 20, paneer: 30, mushroom: 30
  },
  medium: {
    base: 20, sauce: 15, mozzarella: 60,
    veggies: { onion: 15, tomato: 15, capsicum: 15, corn: 15 },
    black_olive: 30, jalapeno: 30, red_peprica: 30, paneer: 40, mushroom: 40
  },
  large: {
    base: 30, sauce: 30, mozzarella: 100,
    veggies: { onion: 20, tomato: 20, capsicum: 20, corn: 20 },
    black_olive: 50, jalapeno: 50, red_peprica: 40, paneer: 50, mushroom: 50
  }
};

const SOCIAL_LINKS = [
  { id: 'whatsapp_msg', label: '🟢 WhatsApp Msg', icon: '💬', points: 1, url: 'https://wa.me/919714293759' },
  { id: 'whatsapp_channel', label: '📢 WhatsApp Channel', icon: '📢', points: 1, url: 'https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y' },
  { id: 'youtube', label: '🔴 YouTube', icon: '🎥', points: 1, url: 'https://www.youtube.com/@bbcafe.i' },
  { id: 'instagram', label: '📸 Instagram', icon: '📸', points: 1, url: 'https://www.instagram.com/bbcafe.in/' },
  { id: 'facebook', label: '🔵 Facebook', icon: '📘', points: 1, url: 'https://www.facebook.com/bbcafe.in/' },
  { id: 'snapchat', label: '👻 Snapchat', icon: '👻', points: 1, url: 'https://www.snapchat.com/add/bbcafe.in' }
];

const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

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
  { id: "rev4", name: "Neha Chaurasia", rating: 5, comment: "इस क्षेत्र का सबसे अच्छा कैफे। पिज्जा विभाग ताज़ा है और क्रस्ट बहुत सॉफ्ट है! ⭐⭐⭐⭐⭐" }
];

const DEFAULT_SOCIAL_PROOF = [
  { id: "sp1", text: "प्रियंका जी (वार्ड 2) ने अभी-अभी 'पनीर पिज्जा' ऑर्डर किया 🍕" },
  { id: "sp2", text: "अमित सोनी जी (टाउन) ने अभी-अभी 'स्पेशल थाली' ऑर्डर की 🍱" },
  { id: "sp3", text: "राहुल कुमार जी (वार्ड 4) ने अभी--अभी 'चॉकलेट शेक' ऑर्डर किया 🥤" },
  { id: "sp4", text: "अंजलि जी (वार्ड 5) ने अभी-अभी 'मिक्स वेज पिज्जा' आर्डर किया 🧀" }
];

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  const addItem = store?.addItem || (() => {});
  const removeItem = store?.removeItem || (() => {});
  const clearCart = store?.clearCart || (() => {});

  const menuRef = useRef<HTMLDivElement | null>(null);

  // --- STATE VARIABLES ---
  const [menu, setMenu] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSocialsOpen, setIsSocialsOpen] = useState(false); 
  const [storeOpen, setStoreOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [whatsappNumber, setWhatsappNumber] = useState("919714293759");
  const [storeCoordinates, setStoreCoordinates] = useState({ lat: 24.2863, lng: 80.1245 });

  const [pointsHistory, setPointsHistory] = useState<any[]>([]);
  const [pastOrders, setPastOrders] = useState<any[]>([]);

  const [liveOrder, setLiveOrder] = useState<any | null>(null);

  const [closingMinutesLeft, setClosingMinutesLeft] = useState<number | null>(null);

  const [customerDetails, setCustomerDetails] = useState<{ name: string, phone: string, refCode?: string, pin?: string } | null>(null);
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");
  const [tempPin, setTempPin] = useState(""); 
  const [tempRefCode, setTempRefCode] = useState(""); 
  const [address, setAddress] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 

  const [customerPoints, setCustomerPoints] = useState<number>(0);
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]);

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftPhone, setGiftPhone] = useState("");
  const [giftPointsAmount, setGiftPointsAmount] = useState<number | "">("");
  const [giftSenderPin, setGiftSenderPin] = useState(""); 
  const [isGiftingLoading, setIsGiftingLoading] = useState(false);

  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerError, setBannerError] = useState(false);
  const [headerVideoUrl, setHeaderVideoUrl] = useState("https://www.basewfp.com/wp-content/uploads/2024/06/Video-for-Homepage-s.mp4");
  
  const [reviews, setReviews] = useState<any[]>([]);
  
  const [isReviewsDrawerOpen, setIsReviewsDrawerOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  
  const [enteredCoupon, setEnteredCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Normal Pizza Customization Addons
  const [normalPizzaSize, setNormalPizzaSize] = useState("");
  const [normalPizzaPrice, setNormalPizzaPrice] = useState(0);
  const [normalPizzaAddons, setNormalPizzaAddons] = useState<{ [addon: string]: boolean }>({});
  const [chefNote, setChefNote] = useState(""); 

  // --- NEW DIY PIZZA WORKSPACE STATES ---
  const [diySize, setDiySize] = useState<string>("small"); 
  const [diySauce, setDiySauce] = useState<boolean>(true); 
  const [diyMozzarella, setDiyMozzarella] = useState<boolean>(true); 
  const [diyVegSelection, setDiyVegSelection] = useState<{ [veg: string]: boolean }>({ onion: false, tomato: false, capsicum: false, corn: false });
  const [diyPremiumToppings, setDiyPremiumToppings] = useState<{ [top: string]: boolean }>({ black_olive: false, jalapeno: false, red_peprica: false, paneer: false, mushroom: false });
  const [diyChefNote, setDiyChefNote] = useState<string>("");

  // Reels/Stories States
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any | null>(null);

  // Social Proof Alerts States
  const [socialProofs, setSocialProofs] = useState<any[]>([]);
  const [socialAlertIndex, setSocialAlertIndex] = useState(0);
  const [showSocialAlert, setShowSocialAlert] = useState(false);

  // Social Media Point Claims
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimingPlatform, setClaimingPlatform] = useState<any>(null);
  const [claimUsername, setClaimUsername] = useState("");
  const [isClaimingLoading, setIsClaimingLoading] = useState(false);

  // Cart Specific Add-ons
  const [ketchupAddon, setKetchupAddon] = useState(false);
  const [oreganoAddon, setOreganoAddon] = useState(false);
  const [chiliFlakesAddon, setChiliFlakesAddon] = useState(false);

  const [noCutlery, setNoCutlery] = useState(false);
  const [selectedArea, setSelectedArea] = useState(DELIVERY_AREAS[0]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [shareCount, setShareCount] = useState<number>(0);
  const [isTooFar, setIsTooFar] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // UI States (Requirement: Greet timer disappearing UX)
  const [showGreeting, setShowGreeting] = useState(true);

  // --- COMPILER FIXES: DECLARED PROPERLY BEFORE RETURN STATEMENT ---
  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

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
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {}
  };

  const scrollToMenu = () => {
    triggerHaptic();
    if (menuRef && menuRef.current) {
      menuRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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
    if (points >= 50) return { name: "Platinum Member 👑", color: "text-cyan-600 border-cyan-500/30 bg-cyan-100/30 dark:text-cyan-400 dark:border-cyan-400/30 dark:bg-cyan-400/10" };
    if (points >= 20) return { name: "Gold Member 🌟", color: "text-yellow-600 border-yellow-500/30 bg-yellow-100/30 dark:text-yellow-400 dark:border-yellow-400/30 dark:bg-yellow-400/10" };
    return { name: "Bronze Member 🥉", color: "text-orange-600 border-orange-500/30 bg-orange-100/30 dark:text-orange-400 dark:border-orange-400/30 dark:bg-orange-400/10" };
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

  const getReferralCode = () => {
    if (!customerDetails) return "WELCOME";
    const namePart = customerDetails.name.trim().split(" ")[0].substring(0, 4).toUpperCase();
    const phonePart = customerDetails.phone.slice(-4);
    return `${namePart}${phonePart}`;
  };

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const calculatedDiyPizzaPrice = useMemo(() => {
    const config = DIY_PIZZA_PRICES[diySize];
    if (!config) return 0;
    let total = config.base;
    if (diySauce) total += config.sauce;
    if (diyMozzarella) total += config.mozzarella;

    Object.entries(diyVegSelection).forEach(([veg, isSelected]) => {
      if (isSelected) {
        total += config.veggies[veg] || 0;
      }
    });

    Object.entries(diyPremiumToppings).forEach(([top, isSelected]) => {
      if (isSelected) {
        total += config[top] || 0;
      }
    });

    return total;
  }, [diySize, diySauce, diyMozzarella, diyVegSelection, diyPremiumToppings]);

  const getClaimStatus = (platform: string) => {
    if (!customerDetails?.phone) return "🎁 +1 Pt";
    const storageKey = `bb_claimed_${customerDetails.phone.replace("+91", "").trim()}_${platform}`;
    return localStorage.getItem(storageKey) ? "✅ Claimed" : "🎁 Claim +1 Pt";
  };

  const handleReelEnded = () => {
    triggerHaptic(20);
    const currentIndex = stories.findIndex(s => s.id === activeStory.id);
    if (currentIndex !== -1 && currentIndex < stories.length - 1) {
      setActiveStory(stories[currentIndex + 1]);
    } else {
      setActiveStory(null);
      toast.success("सभी रील्स समाप्त हो गईं! 😊");
    }
  };

  const quickAppendInstruction = (tag: string, type = "normal") => {
    triggerHaptic(20);
    if (type === "diy") {
      setDiyChefNote(prev => prev ? `${prev}, ${tag}` : tag);
    } else {
      setChefNote(prev => prev ? `${prev}, ${tag}` : tag);
    }
  };

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
      return { bg: "from-rose-600 to-amber-800", accent: "text-yellow-250", name: "रक्षाबंधन विशेष स्नेह 💖" };
    }
    return { bg: "from-[#ff5e00] to-[#b33600]", accent: "text-yellow-300", name: "BUM BUM CAFE - Mohandra" };
  }, []);

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

  // --- DETECT LATEST ORDERS & ENERGIZE CHECKS ---
  useEffect(() => {
    const savedDetails = localStorage.getItem('bb_cafe_customer');
    if (savedDetails) {
      try {
        const parsed = JSON.parse(savedDetails);
        if (parsed && parsed.name && parsed.phone) {
          setCustomerDetails(parsed);
          setTempName(parsed.name);
          setTempPhone(parsed.phone.replace("+91", ""));
          if (parsed.pin) setTempPin(parsed.pin);
        }
      } catch (err) {
        console.error("Failed to load customer details", err);
      }
    }

    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => { 
      if (d.exists()) {
        setStoreOpen(d.data().isOpen);
        if (d.data().whatsappNumber) {
          setWhatsappNumber(d.data().whatsappNumber);
        }
        if (d.data().latitude && d.data().longitude) {
          setStoreCoordinates({ lat: Number(d.data().latitude), lng: Number(d.data().longitude) });
        }
        if (d.data().headerVideoUrl) {
          setHeaderVideoUrl(d.data().headerVideoUrl);
        }
      }
    });
    
    setMenuLoading(true);
    const unsubMenu = onSnapshot(query(collection(db, "products")), (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.isVisible !== false);
      setMenu(prev => {
        if (prev.length === 0) {
          return shuffleArray(items);
        } else {
          return items.map(newItem => {
            const matched = prev.find(p => p.id === newItem.id);
            return matched ? { ...matched, ...newItem } : newItem;
          });
        }
      });
      setMenuLoading(false);
      localStorage.setItem('bb_cached_menu', JSON.stringify(items)); 
    }, () => {
      const localCached = localStorage.getItem('bb_cached_menu');
      if (localCached) {
        setMenu(shuffleArray(JSON.parse(localCached)));
      }
      setMenuLoading(false);
    });

    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => { setDbCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => { setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubStories = onSnapshot(collection(db, "reels"), (snap) => { setStories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => { setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.isApproved === true || r.isApproved === "true")); });
    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => { setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });

    return () => { 
      unsubStore(); 
      unsubMenu(); 
      unsubCats(); 
      unsubBanners(); 
      unsubStories();
      unsubReviews(); 
      unsubRules(); 
    };
  }, []);

  // Dine-In QR Auto-detection & table allocation (Requirement 3)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableNum = params.get('table');
      if (tableNum) {
        setAddress(`Dine-In: Table Number ${tableNum} 🍽️`);
        setSelectedArea({ name: "Dine-In (Table)", fee: 0, minFree: 0, range: "Inside Cafe" }); // Dine-in delivery is free!
        toast.success(`🍽️ Welcome to Table ${tableNum}! Direct table self-ordering is now active.`);
      }
    }
  }, []);

  // Greeting disappears after 6 seconds (Requirement: Greet timer disappearing UX)
 // Visible Categories slider memo (Requirement Fix)
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

    const dedupedList = Array.from(new Set(result));
    
    // Inject "DIY Pizza" dynamically
    const finalWithDiy: string[] = [];
    dedupedList.forEach(cat => {
      if (cat === "All") {
        finalWithDiy.push("DIY Pizza"); 
      }
      finalWithDiy.push(cat);
    });

    return Array.from(new Set(finalWithDiy));
  }, [dbCategories]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreeting(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);
const handleAddDiyPizzaToCart = () => {
    triggerHaptic();
    const sizeLabels: any = { small: "Small Base", medium: "Medium Base", large: "Large Base" };
    
    const activeVeggies = Object.entries(diyVegSelection).filter(([_, val]) => val).map(([key]) => key.toUpperCase());
    const activePremiums = Object.entries(diyPremiumToppings).filter(([_, val]) => val).map(([key]) => key.replace('_', ' ').toUpperCase());
    
    const toppingsStr = [...activeVeggies, ...activePremiums].join(", ");

    const finalDiyName = `🍕 DIY Custom Pizza [${sizeLabels[diySize]}]${toppingsStr ? ` - Toppings: ${toppingsStr}` : ''}`;
    
    const uniqueDiyId = `diy-pizza-${diySize}-${Object.keys(diyVegSelection).filter(k => diyVegSelection[k]).join("")}-${Object.keys(diyPremiumToppings).filter(k => diyPremiumToppings[k]).join("")}`;

    addItem({
      id: uniqueDiyId,
      name: finalDiyName,
      price: calculatedDiyPizzaPrice,
      note: diyChefNote ? diyChefNote.trim() : ""
    });

    playSoundEffect('add');
    toast.success("आपका कस्टमाइज़्ड पिज्जा कर्ट में जोड़ा गया! 🍕");

    setDiyVegSelection({ onion: false, tomato: false, capsicum: false, corn: false });
    setDiyPremiumToppings({ black_olive: false, jalapeno: false, red_peprica: false, paneer: false, mushroom: false });
    setDiyChefNote("");
  };
  const handleDismissInstallBanner = () => {
    triggerHaptic(20);
    setShowInstallBanner(false);
    localStorage.setItem('bb_app_installed_or_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    triggerHaptic();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success("बम बम कैफ़े ऐप इंस्टॉल करने के लिए धन्यवाद! ❤️");
      }
      setDeferredPrompt(null);
    } else {
      setIsInstallModalOpen(true);
    }
    // Instantly hide the banner and persist dismiss state
    setShowInstallBanner(false);
    localStorage.setItem('bb_app_installed_or_dismissed', 'true');
  };
// Normalized search query with Hinglish support (Requirement Fix)
  const normalizedSearchQuery = useMemo(() => {
    const words = searchQuery.toLowerCase().trim().split(/\s+/);
    const mappedWords = words.map(word => HINGLISH_DICT[word] || word);
    return mappedWords.join(" ");
  }, [searchQuery]);

  // Deduplicated menu items filtering out disabled categories (Requirement Fix)
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

  // Main filtered menu memo (Requirement Fix)
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

  // Toggle favorites helper function (Requirement Fix)
  const handleToggleFavorite = (id: string, e: any) => {
    triggerHaptic();
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
  const handleDetectLocation = () => {
    triggerHaptic();
    if (!navigator.geolocation) {
      return toast.error("आपके ब्राउज़र में जीपीएस लोकेशन उपलब्ध नहीं है।");
    }
    const toastId = toast.loading("सटीक लोकेशन ट्रैक कर रहे हैं...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss(toastId); 
        const { latitude, longitude } = position.coords;
        setAddress(`My GPS Location: https://www.google.com/maps?q=${latitude},${longitude}`);
        toast.success("जीपीएस से लोकेशन सफलतापूर्वक जोड़ी गई!");
        
        const mohandraLat = storeCoordinates.lat;
        const mohandraLng = storeCoordinates.lng;
        
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
        toast.dismiss(toastId);
        toast.error("लोकेशन की अनुमति अस्वीकार कर दी गई है या नेटवर्क त्रुटि है।");
      }
    );
  };

  // --- ACTIONS ---

  const handleGiftPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!customerDetails?.phone) return toast.error("कृपया पहले अपनी डिटेल्स जोड़ें!");
    const senderPhoneRaw = customerDetails.phone.replace("+91", "").trim();
    const friendPhoneRaw = String(giftPhone).replace("+91", "").trim();
    const pointsToGift = Number(giftPointsAmount);

    if (!friendPhoneRaw || friendPhoneRaw.length < 10) return toast.error("कृपया सही 10-digit मोबाइल नंबर डालें!");
    if (senderPhoneRaw === friendPhoneRaw) return toast.error("आप खुद को लॉयल्टी पॉइंट्स गिफ्ट नहीं कर सकते!");
    if (isNaN(pointsToGift) || pointsToGift <= 0) return toast.error("कृपया सही पॉइंट्स की संख्या डालें!");
    if (customerPoints < pointsToGift) return toast.error(`आपके पास पर्याप्त  पॉइंट्स नहीं हैं! वर्तमान  पॉइंट्स: ${customerPoints}`);
    if (!giftSenderPin || giftSenderPin.length !== 4) return toast.error("कृपया अपना सही 4-digit सुरक्षा पिन डालें!");

    setIsGiftingLoading(true);
    const senderDocRef = doc(db, "customer_points", senderPhoneRaw);
    const receiverDocRef = doc(db, "customer_points", friendPhoneRaw);

    try {
      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(senderDocRef);
        const receiverSnap = await transaction.get(receiverDocRef);
        
        if (!senderSnap.exists()) throw new Error("Sender account does not exist.");
        
        const dbPin = senderSnap.data().pin;
        if (dbPin && dbPin !== giftSenderPin) {
          throw new Error("Invalid Pin Entered");
        }

        const savedDeviceToken = localStorage.getItem('bb_device_token');
        const dbDeviceToken = senderSnap.data().deviceToken;
        if (dbDeviceToken && dbDeviceToken !== savedDeviceToken) {
          throw new Error("Device mismatch. Transfer blocked.");
        }

        const currentSenderPoints = senderSnap.data().points || 0;
        if (currentSenderPoints < pointsToGift) throw new Error("Insufficient points balance!");

        transaction.update(senderDocRef, { points: increment(-pointsToGift) });
        
        if (!receiverSnap.exists()) {
          transaction.set(receiverDocRef, { name: "Loyal Friend 🎁", phone: friendPhoneRaw, points: pointsToGift, lastActive: new Date() });
        } else {
          transaction.update(receiverDocRef, { points: increment(pointsToGift) });
        }

        const senderHistoryRef = doc(collection(db, "customer_points", senderPhoneRaw, "history"));
        transaction.set(senderHistoryRef, {
          type: 'redeem',
          points: pointsToGift,
          description: `Gifted points to ${friendPhoneRaw} 🎁`,
          timestamp: new Date()
        });

        const receiverHistoryRef = doc(collection(db, "customer_points", friendPhoneRaw, "history"));
        transaction.set(receiverHistoryRef, {
          type: 'earn',
          points: pointsToGift,
          description: `Received gift from ${senderPhoneRaw} 🎁`,
          timestamp: new Date()
        });
      });

      toast.success(`🎁 सफलतापूर्वक ${pointsToGift}  पॉइंट्स गिफ्ट कर दिए गए हैं!`);
      const inviteMsg = `हे दोस्त! मैंने तुम्हें BAM BAM Cafe के ऐप पर 🎁 ${pointsToGift} Loyalty Points गिफ्ट किए हैं। यहाँ से स्वादिष्ट पिज्जा और थाली आर्डर करो: https://bb-cafe-app.vercel.app/`;
      const whatsappUrl = `https://wa.me/91${friendPhoneRaw}?text=${encodeURIComponent(inviteMsg)}`;
      
      setGiftPhone(""); setGiftPointsAmount(""); setGiftSenderPin(""); setIsGiftModalOpen(false);
      if (window.confirm("क्या आप अपने दोस्त को व्हाट्सएप पर गिफ्ट का मैसेज भेजना चाहते हैं?")) window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      if (err.message === "Invalid Pin Entered") {
        toast.error("गलत सुरक्षा पिन! कृपया सही पिन डालें।");
      } else if (err.message === "Device mismatch. Transfer blocked.") {
        toast.error("सुरक्षा अलर्ट: यह डिवाइस इस नंबर से मैच नहीं करता!");
      } else {
        toast.error(err.message === "Insufficient points balance!" ? "अपर्याप्त  पॉइंट्स!" : "पॉइंट्स गिफ्ट करने में समस्या आई।");
      }
    } finally { setIsGiftingLoading(false); }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!tempName || tempName.trim().length < 3) return toast.error("Please enter your real name");
    if (!tempPhone || tempPhone.trim().length < 10) return toast.error("Please enter 10-digit number");
    if (!tempPin || tempPin.length !== 4 || isNaN(Number(tempPin))) {
      return toast.error("सुरक्षा के लिए 4-अंकों का न्यूमेरिकल पिन दर्ज करें!");
    }
    
    const phoneClean = tempPhone.trim().replace("+91", "");
    
    let devToken = localStorage.getItem('bb_device_token');
    if (!devToken) {
      devToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('bb_device_token', devToken);
    }

    const details: any = { name: tempName, phone: `+91${phoneClean}`, pin: tempPin };

    if (tempRefCode) {
      const refCodeClean = tempRefCode.trim().toUpperCase();
      details.refCode = refCodeClean;

      try {
        const q = query(collection(db, "customer_points"), where("inviteCode", "==", refCodeClean));
        const querySnap = await getDocs(q);
        
        if (!querySnap.empty) {
          const inviterDoc = querySnap.docs[0];
          const inviterPhone = inviterDoc.id;

          const myProfileSnap = await getDoc(doc(db, "customer_points", phoneClean));
          if (!myProfileSnap.exists()) {
            await runTransaction(db, async (transaction) => {
              transaction.update(doc(db, "customer_points", inviterPhone), {
                points: increment(5)
              });

              const inviteHistoryRef = doc(collection(db, "customer_points", inviterPhone, "history"));
              transaction.set(inviteHistoryRef, {
                type: 'earn',
                points: 5,
                description: `Invited new friend: ${tempName} 🎉`,
                timestamp: new Date()
              });
            });
            toast.success("सफलतापूर्वक इनवाइट कोड लागू किया गया! आपके दोस्त को 5 ऑयल्टी पॉइंट्स मिले।");
          }
        }
      } catch (err) {
        console.error("Referral process error:", err);
      }
    }

    const namePart = tempName.trim().split(" ")[0].substring(0, 4).toUpperCase();
    const phonePart = phoneClean.slice(-4);
    const computedInviteCode = `${namePart}${phonePart}`;

    try {
      await setDoc(doc(db, "customer_points", phoneClean), {
        name: tempName,
        phone: phoneClean,
        inviteCode: computedInviteCode,
        pin: tempPin,
        deviceToken: devToken,
        lastActive: new Date()
      }, { merge: true });
    } catch (err) {}
    
    localStorage.setItem('bb_cafe_customer', JSON.stringify(details));
    setCustomerDetails(details); 
    toast.success(`Welcome ${tempName}! Your invite code: ${computedInviteCode}`);
  };

  const sendWhatsAppOrder = async () => {
    triggerHaptic();
    const isDineIn = address.toLowerCase().includes("dine-in");

    // Table QR check bypasses the 20km GPS block (Requirement 2)
    if (isTooFar && !isDineIn) {
      return toast.error("आपकी दूरी 20 KM से अधिक है। आप केवल मेनू देख सकते हैं, ऑर्डर प्लेस नहीं कर सकते!");
    }
    if (!customerDetails) { 
      setIsProfileOpen(true); 
      toast.error("ऑर्डर करने के लिए पहले अपनी प्रोफाइल बनाएं! 👤");
      return; 
    }
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

    // Dynamic Delivery security OTP PIN generator (Requirement: secure delivery loop)
    const deliveryPin = Math.floor(1000 + Math.random() * 9000);

    const orderObj = {
      billNumber, tokenNumber, customerName: customerDetails.name, customerPhone: customerDetails.phone,
      address, items: cart, subtotal, discount: couponDiscount, total: finalTotal, timestamp: new Date(), status: 'pending',
      deliveryArea: selectedArea.name, noCutlery, ketchupAddon, oreganoAddon, chiliFlakesAddon,
      deliveryPin // Secure OTP embedded
    };

    try {
      await addDoc(collection(db, "orders"), orderObj);
      const phoneClean = customerDetails.phone.replace("+91", "");
      if (pointsEarned > 0 || totalPointsCost > 0) {
        await setDoc(doc(db, "customer_points", phoneClean), {
          name: customerDetails.name, phone: phoneClean, points: increment(pointsEarned - totalPointsCost), lastActive: new Date()
        }, { merge: true });

        if (pointsEarned > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'earn',
            points: pointsEarned,
            description: `Ordered Bill #${formattedBillStr} 🍕`,
            timestamp: new Date()
          });
        }
        if (totalPointsCost > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'redeem',
            points: totalPointsCost,
            description: `Redeemed rewards on Bill #${formattedBillStr} 🎁`,
            timestamp: new Date()
          });
        }
      }
    } catch (e) {}

    const updatedPastOrders = [orderObj, ...pastOrders];
    setPastOrders(updatedPastOrders);
    localStorage.setItem('bb_past_orders', JSON.stringify(updatedPastOrders));

    setLastPlacedOrder(orderObj);

    let itemsText = "";
    cart.forEach((i: any) => {
      itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`;
      if (i.note) {
        itemsText += `  └─ *Note for Chef:* ${i.note}\n`;
      }
    });
    
    if (ketchupAddon) itemsText += `• Extra Tomato Ketchup x1 - ₹10\n`;
    if (oreganoAddon) itemsText += `• Extra Oregano x1 - ₹10\n`;
    if (chiliFlakesAddon) itemsText += `• Extra Chili Flakes x1 - ₹10\n`;
    if (noCutlery) itemsText += `🌱 (Eco-Friendly: No plastic cutlery requested)\n`;

    const refCode = getReferralCode();
    const msg = `🔥 *BAM BAM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Delivery Area:* ${selectedArea.name}\n*Address:* ${address}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal + addOnsCost}\n*Coupon Discount:* -₹${couponDiscount}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${finalTotal}*\n\n*Invite Code:* ${refCode}\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}\n_Confirm order by replying 'YES'_`;
    
    playSoundEffect('success');
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 5000);

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');

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

  if (!mounted) return null;

  return (
    <div className="dark:bg-[#050505] bg-gray-50 min-h-screen dark:text-white text-gray-900 pb-32 font-sans relative overflow-x-clip transition-colors duration-200">
      
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#222',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '12px'
          }
        }} 
      />

      {/* Network Status Banner */}
      {!isOnline && (
        <div className="bg-red-600 text-white font-black py-2 px-4 text-center text-xs flex items-center justify-center gap-2 shadow-lg sticky top-0 z-[150]">
          <WifiOff size={14} className="animate-pulse" />
          <span>आप ऑफ़लाइन हैं। कैश्ड मेनू दिखाया जा रहा है।</span>
        </div>
      )}

      {/* Closing Warning Timer Ribbon */}
      {closingMinutesLeft !== null && storeOpen && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold py-2 px-4 text-center text-[10px] flex items-center justify-center gap-1.5 shadow-md">
          <span>⏰</span>
          <span>आर्डर चेतावनी: बम बम कैफ़े अगले {closingMinutesLeft} minute में बंद होने वाला है! आर्डर जल्दी पूरा करें।</span>
        </div>
      )}

      {/* Social Proof Toast Alert (Slower & Natural Order Alerts) */}
      <AnimatePresence>
        {showSocialAlert && socialProofs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-black/90 backdrop-blur-md border border-orange-500/30 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 max-w-[90%] text-center"
          >
            <span className="text-sm">🔥</span>
            <span className="text-[10px] font-black tracking-wide truncate">{socialProofs[socialAlertIndex]?.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
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

      {/* FLOATING ACTION SIDEBAR - MINI STICKY TABS (Requirement 3 - visible labels & smaller font size) */}
      <div className="fixed right-0 top-1/3 z-50 flex flex-col gap-2.5 items-end">
        <button 
          onClick={() => { triggerHaptic(); setIsReviewFormOpen(true); }}
          className="pl-3.5 pr-2.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-l-xl shadow-lg border-l border-y border-white/10 flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <Star size={11} className="fill-white" />
          <span className="text-[9px] font-black tracking-widest uppercase">Review</span>
        </button>
        <button 
          onClick={() => { triggerHaptic(); setIsSocialsOpen(true); }}
          className="pl-3.5 pr-2.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-l-xl shadow-lg border-l border-y border-white/10 flex items-center gap-1.5 transition-transform active:scale-95"
        >
          <Sparkles size={11} />
          <span className="text-[9px] font-black tracking-widest uppercase">Socials</span>
        </button>
      </div>

      {/* PREMIUM HERO HEADER (Requirement 6 - Styled with Dynamic background Video support) */}
      <header className="relative pt-6 pb-4 px-4 overflow-hidden shadow-xl flex flex-col justify-end min-h-[140px]">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          key={headerVideoUrl}
          className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
        >
          <source src={headerVideoUrl} type="video/mp4" />
          <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80" className="absolute inset-0 w-full h-full object-cover" alt="Bum Bum Cafe Header" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />

        {/* Repositioned & Refined for maximum Video Background Visibility */}
        <div className="relative z-20 max-w-[85%] mt-auto bg-black/35 backdrop-blur-sm p-2.5 rounded-xl border border-white/5 shadow-md">
          <motion.div
            initial={{ x: -25, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-0.5"
          >
            <span className="text-sm font-extrabold italic tracking-wide text-yellow-300 font-serif drop-shadow block leading-none mb-0.5">
              Bum Bum Cafe
            </span>
            <h2 className="text-xs font-black text-white leading-none">Delicious Food • Delivered Fast</h2>
            <p className="text-[7px] text-gray-300 font-bold">Order Pizza, Special Sandwich & Paneer Delights instantly!</p>
          </motion.div>
          <button 
            onClick={scrollToMenu}
            className="mt-1 bg-orange-600 hover:bg-orange-700 text-white font-black text-[7px] px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            Order Now
          </button>
        </div>
      </header>

      {/* FIXED STICKY SEARCH BAR (Requirement: placeholder changed from Thali to Sandwich) */}
      <div className="sticky top-0 z-40 dark:bg-[#050505]/95 bg-gray-50/95 backdrop-blur-md py-3 px-4 border-b dark:border-white/5 border-gray-200 transition-colors duration-200 shadow-sm">
        <div className="relative max-w-sm mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search pizza, sandwich, paneer special..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full dark:bg-neutral-800 bg-gray-100 dark:text-white text-neutral-900 py-2.5 px-11 rounded-xl outline-none text-xs font-semibold dark:placeholder-gray-400 placeholder-gray-500 border dark:border-neutral-700 border-gray-200 transition-colors duration-200" 
            />
          </div>
          
          <a 
            href="tel:+919714293759"
            className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl border border-transparent shadow flex items-center justify-center transition-colors"
            title="Direct call to cafe"
          >
            <Phone size={18} />
          </a>

          <button 
            onClick={() => { triggerHaptic(); setIsProfileOpen(true); }}
            className="p-2.5 dark:bg-neutral-800 bg-gray-100 dark:text-white text-neutral-955 rounded-xl border dark:border-neutral-700 border-gray-200 hover:border-orange-500 hover:text-orange-500 transition-colors shadow flex-shrink-0"
            title="My Profile & Loyalty Rewards"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT WRAPPER */}
      <main ref={menuRef} className="pt-3 px-3 max-w-lg mx-auto space-y-4">

        {/* REQUIREMENT 2: Greeting message search bar ke just neeche ho (fades away after 6 seconds) */}
        <AnimatePresence>
          {showGreeting && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-1.5 py-1 overflow-hidden"
            >
              <h3 className="text-xs font-black dark:text-gray-200 text-neutral-900 leading-normal">{greetingText}</h3>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REQUIREMENT 1: App install banner dismisses smoothly and persistently */}
        {showInstallBanner && (
          <div className="bg-gradient-to-r from-[#ff5e00] to-amber-500 p-3.5 rounded-2xl flex items-center justify-between shadow-lg border border-white/10 mx-1 relative">
            <button 
              onClick={handleDismissInstallBanner}
              className="absolute top-2 right-2 text-white/70 hover:text-white"
              title="Dismiss"
            >
              <X size={14} />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📲</span>
              <div className="pr-4">
                <h4 className="text-xs font-black text-white">Bum Bum Cafe App</h4>
                <p className="text-[9px] text-orange-100 font-bold">बिना प्ले स्टोर के सीधे अपने phone में इंस्टॉल करें!</p>
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

        {/* REQUIREMENT 3: Banner ke uper sari reel story ho */}
        {/* Dynamic Video Stories / Food Reels (Idea 17) */}
        {stories.length > 0 && (
          <div className="space-y-1 px-1">
            <p className="text-[8px] font-black uppercase tracking-wider text-orange-500">खूबसूरत फ़ूड रील्स (Daily Food Reels)</p>
            <div className="flex gap-4 overflow-x-auto py-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {stories.map((story) => (
                <button 
                  key={story.id} 
                  onClick={() => { triggerHaptic(); setActiveStory(story); }}
                  className="flex flex-col items-center flex-shrink-0 focus:outline-none"
                >
                  <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-orange-505 to-red-600 relative">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-900 bg-neutral-800 flex items-center justify-center relative">
                      {/* Reel Cover Image Integration (Requirement 1) */}
                      <img src={story.coverUrl || story.url} className="w-full h-full object-cover" alt={story.title} />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <Play size={14} className="text-white fill-white" />
                      </div>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold dark:text-gray-300 text-neutral-800 mt-1 max-w-[70px] truncate">{story.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* REQUIREMENT 4: Auto-sliding Promo Banner */}
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
          <div className="flex gap-5 overflow-x-auto py-2 px-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setSelectedCategory("Favorites")} className="flex flex-col items-center flex-shrink-0 group outline-none">
              <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all flex items-center justify-center ${selectedCategory === "Favorites" ? 'border-red-500 scale-105 shadow-md' : 'dark:border-white/10 border-gray-200 bg-white dark:bg-neutral-900'}`}>
                <Heart size={24} className={selectedCategory === "Favorites" ? 'text-red-505 fill-red-500' : 'text-gray-400'} />
              </div>
              <span className={`text-[9px] font-black uppercase mt-1.5 truncate ${selectedCategory === "Favorites" ? 'text-red-500' : 'dark:text-gray-400 text-neutral-800'}`}>My Favorites</span>
            </button>

            {visibleCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-center flex-shrink-0 group outline-none">
                  <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all ${isActive ? 'border-orange-500 scale-105 shadow-md' : 'dark:border-white/10 border-gray-200 bg-neutral-900'}`}>
                    {cat === "DIY Pizza" ? (
                      <div className="w-full h-full flex items-center justify-center text-lg bg-gradient-to-tr from-yellow-505 to-red-500 text-white">🍕</div>
                    ) : (
                      <img src={getCategoryImage(cat)} className="w-full h-full object-cover" alt={cat} />
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase mt-1.5 truncate max-w-[70px] text-center ${isActive ? 'dark:text-orange-500 text-orange-700' : 'dark:text-gray-400 text-neutral-800'}`}>
                    {cat === "All" ? "All" : cat.replace("Special ", "").replace(" Special", "")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {distanceKm !== null && isTooFar && (
          <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-2xl flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-red-400 uppercase">आर्डर सीमा से बाहर ({distanceKm} KM)</p>
              <p className="text-[9px] text-gray-400">आप कैफे से 20 किमी से अधिक दूर हैं। आप केवल हमारा शानदार मेनू देख सकते हैं, आर्डर नहीं कर सकते।</p>
            </div>
          </div>
        )}

        {/* INLINE DEDICATED DIY PIZZA BUILDER WORKSPACE */}
        {selectedCategory === "DIY Pizza" ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="dark:bg-[#0f1115] bg-white border dark:border-white/5 border-gray-200 rounded-3xl p-5 shadow-xl space-y-6 max-w-sm mx-auto"
          >
            <div className="text-center space-y-1">
              <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                DIY Pizza Tab
              </span>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">अपने मन का पिज़्ज़ा बनाएं 🍕</h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">पसंद का बेस, सॉस, पनीर aur मनपसंद वेजीज़ को टच करके अपनी रेसिपी तैयार करें!</p>
            </div>

            {/* Step 1: Base Crust Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-orange-500">1. पिज़्ज़ा बेस चुनें (Base Size):</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'small', label: 'Small Base (₹15)' },
                  { id: 'medium', label: 'Medium Base (₹20)' },
                  { id: 'large', label: 'Large Base (₹30)' }
                ].map((base) => (
                  <button
                    key={base.id}
                    onClick={() => { triggerHaptic(); setDiySize(base.id); }}
                    className={`p-3 rounded-xl border text-[10px] font-black text-center transition-all ${diySize === base.id ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'dark:border-white/5 border-gray-200'}`}
                  >
                    {base.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Sauce & Cheese Base Choices */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => { triggerHaptic(); setDiySauce(!diySauce); }}
                className={`p-3 rounded-xl border text-xs font-black flex justify-between items-center transition-all ${diySauce ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'dark:border-white/5 border-gray-200 opacity-60'}`}
              >
                <span>🥫 Pizza Sauce</span>
                <span className="font-extrabold text-[10px]">
                  +₹{DIY_PIZZA_PRICES[diySize]?.sauce}
                </span>
              </button>

              <button
                onClick={() => { triggerHaptic(); setDiyMozzarella(!diyMozzarella); }}
                className={`p-3 rounded-xl border text-xs font-black flex justify-between items-center transition-all ${diyMozzarella ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'dark:border-white/5 border-gray-200 opacity-60'}`}
              >
                <span>🧀 Mozzarella</span>
                <span className="font-extrabold text-[10px]">
                  +₹{DIY_PIZZA_PRICES[diySize]?.mozzarella}
                </span>
              </button>
            </div>

            {/* Step 3: Veggie Selection */}
            <div className="space-y-2.5 pt-2">
              <label className="text-[10px] font-black uppercase text-orange-500">3. ताज़ा वेजीज़ जोड़ें (Veg Selection):</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DIY_PIZZA_PRICES[diySize]?.veggies || {}).map(([veg, cost]: any) => {
                  const isSelected = !!diyVegSelection[veg];
                  return (
                    <button
                      key={veg}
                      onClick={() => { triggerHaptic(); setDiyVegSelection(p => ({ ...p, [veg]: !p[veg] })); }}
                      className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-black capitalize transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'dark:border-white/5 border-gray-200'}`}
                    >
                      <span>{veg}</span>
                      <span className="font-extrabold text-orange-500">+₹{cost}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Premium Ingredients */}
            <div className="space-y-2.5 pt-2">
              <label className="text-[10px] font-black uppercase text-orange-500">4. प्रीमियम एक्स्ट्रा टॉपिंग (Premium Toppings):</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'black_olive', label: 'Black Olive' },
                  { id: 'jalapeno', label: 'Zalapino' },
                  { id: 'red_peprica', label: 'Redpeprica' },
                  { id: 'paneer', label: 'Paneer' },
                  { id: 'mushroom', label: 'Mushroom' }
                ].map((item) => {
                  const isSelected = !!diyPremiumToppings[item.id];
                  const cost = DIY_PIZZA_PRICES[diySize]?.[item.id] || 0;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { triggerHaptic(); setDiyPremiumToppings(p => ({ ...p, [item.id]: !p[item.id] })); }}
                      className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-black transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'dark:border-white/5 border-gray-200'}`}
                    >
                      <span>{item.label}</span>
                      <span className="font-extrabold text-orange-500">+₹{cost}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Cooking Tags & Notes */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black uppercase text-orange-500">5. कुकिंग निर्देश (Chef Instructions):</label>
              <div className="flex flex-wrap gap-1 pb-1">
                {QUICK_INSTRUCTION_TAGS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => quickAppendInstruction(tag, "diy")}
                    className="text-[9px] font-bold py-1 px-2.5 rounded-full border dark:border-white/5 border-gray-200 bg-neutral-100 dark:bg-neutral-800 dark:text-gray-300 text-neutral-800 hover:border-orange-500 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="पिज्जा के लिए विशेष निर्देश दर्ज करें..."
                value={diyChefNote}
                onChange={(e) => setDiyChefNote(e.target.value)}
                className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 dark:text-white outline-none focus:border-orange-500 h-16 resize-none"
              />
            </div>

            {/* Dynamic Real-time Bill Price Summary Card */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-2xl text-white text-center space-y-1">
              <p className="text-[9px] font-bold uppercase opacity-85">Pizza Builder Subtotal</p>
              <h4 className="text-2xl font-black">₹{calculatedDiyPizzaPrice}</h4>
            </div>

            {/* Confirm & Bake Button */}
            {storeOpen && !isTooFar ? (
              <button
                onClick={handleAddDiyPizzaToCart}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-all"
              >
                <span>Add Custom Pizza to Cart ➔</span>
              </button>
            ) : (
              <div className="text-center text-xs font-bold text-red-500 uppercase py-2">
                {isTooFar ? "आपकी दूरी 20 KM से अधिक है!" : "बम बम कैफ़े अभी बंद है!"}
              </div>
            )}
          </motion.div>
        ) : (
          // STANDARD PRODUCTS LISTING
          <div className="grid grid-cols-1 gap-4 pt-1 font-bold">
            {menuLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="dark:bg-white/[0.02] bg-white rounded-2xl border dark:border-white/5 border-gray-200 p-4 space-y-4 animate-pulse">
                  <div className="h-44 bg-neutral-300 dark:bg-neutral-800 rounded-xl w-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-neutral-300 dark:bg-neutral-800 rounded w-1/2" />
                    <div className="h-3 bg-neutral-300 dark:bg-neutral-800 rounded w-1/4" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-6 bg-neutral-300 dark:bg-neutral-800 rounded w-1/6" />
                    <div className="h-8 bg-neutral-300 dark:bg-neutral-800 rounded w-1/5" />
                  </div>
                </div>
              ))
            ) : filteredMenu.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-xs font-bold uppercase">No items found...</p>
            ) : (
              filteredMenu.map((item, index) => {
                const isItemAvailable = item.isAvailable !== false;

                return (
                  <React.Fragment key={item.id}>
                    <motion.div 
                      layout 
                      className={`group dark:bg-white/[0.02] bg-white rounded-2xl border dark:border-white/5 border-gray-200 overflow-hidden flex flex-col relative shadow-md shadow-gray-200/40 dark:shadow-none transition-all duration-300 hover:shadow-lg ${!isItemAvailable ? 'opacity-70' : ''}`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    >
                      <div className="relative h-44 w-full overflow-hidden">
                        <img 
                          src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80"} 
                          className="w-full h-full object-cover origin-center transition-transform duration-700 ease-out group-hover:scale-110" 
                          alt={item.name} 
                        />
                        
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 text-[8px] font-black uppercase text-green-400">
                          <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />VEG
                        </div>

                        <div className="absolute bottom-0 left-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-[9px] px-3 py-1 rounded-tr-xl flex items-center gap-1 shadow-md uppercase tracking-wider">
                          <span>🛵</span> <span>FREE delivery</span>
                        </div>

                        {!isItemAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-md">
                              आज उपलब्ध नहीं है (Out of Stock)
                            </span>
                          </div>
                        )}

                        <button onClick={(e) => handleToggleFavorite(item.id, e)} className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 text-white hover:text-red-500 transition-colors">
                          <Heart size={14} className={favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-white"} />
                        </button>
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-black text-sm dark:text-gray-100 text-neutral-900 line-clamp-1">{item.name}</h4>
                          <div className="bg-green-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded flex items-center gap-0.5">
                            <span>4.9</span><span className="text-[8px]">★</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] dark:text-gray-400 text-neutral-700 font-bold mt-0.5">
                          <p className="uppercase text-[8px] dark:text-gray-505 text-gray-400">{item.category}</p><p>• 15-25 min</p>
                        </div>
                        <div className="h-px dark:bg-white/5 bg-gray-100 my-2.5" />
                        <div className="flex justify-between items-end mt-0.5">
                          <div>
                            <p className="dark:text-gray-500 text-gray-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Price</p>
                            <p className="text-orange-700 dark:text-orange-500 font-black text-base leading-none">{getDisplayPrice(item)}</p>
                            {item.variants && <span className="text-[8px] font-bold dark:text-gray-400 text-gray-500 mt-1 block">Options available</span>}
                          </div>
                          
                          {storeOpen && !isTooFar && isItemAvailable && (
                            <button 
                              onClick={() => { 
                                triggerHaptic();
                                item.variants ? setSelectedProduct(item) : addItem(item); 
                              }} 
                              className="px-4 py-2 bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-lg font-black text-[10px] active:scale-95 transition-all uppercase flex items-center gap-1 shadow"
                            >
                              <Plus size={12} /> ADD
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {index === 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        onClick={() => {
                          triggerHaptic();
                          setIsProfileOpen(true);
                        }}
                        className="cursor-pointer bg-gradient-to-r from-amber-500 via-orange-505 to-red-655 text-white p-5 rounded-2xl shadow-lg border border-white/10 my-2 relative overflow-hidden group animate-none"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
                        <div className="relative z-10 flex justify-between items-center gap-4">
                          <div className="space-y-1.5">
                            <span className="bg-black/30 border border-white/20 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-yellow-300">
                              🎁 LOYALTY CLUB PROMO PASS
                            </span>
                            <h4 className="text-sm font-black italic tracking-tight">
                              Unlock Free Pizza, Sandwich & Shakes!
                            </h4>
                            <p className="text-[10px] text-orange-100 font-bold leading-normal">
                              {customerDetails ? (
                                "भारत का सबसे लोकप्रिय पास एक्टिवेटेड है! ✅ हर ₹100 पर 1 पॉइंट कमाएं। यहाँ क्लिक कर अपने रिवॉर्ड्स देखें और रीडीम करें ➔"
                              ) : (
                                "अपना Name और Number दर्ज करके इस पास को एक्टिवेट करें! 🎁 हर ₹100 पर 1 पॉइंट कमाएं और फ्री पिज्जा/सैंडविच पाएं। Tap to activate ➔"
                              )}
                            </p>
                          </div>
                          <div className="bg-white/15 backdrop-blur-md p-3 rounded-full border border-white/20 text-yellow-300 group-hover:rotate-12 transition-transform duration-300">
                            <Gift size={24} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        )}

        {/* PERMANENT REVIEWS SECTION */}
        <div className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1">⭐ हमारे ग्राहकों के प्यारे शब्द</h3>
            <span className="text-[9px] font-bold text-gray-400">Total Reviews ({reviews.length || 4})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {PERMANENT_REVIEWS.map((r) => (
              <div key={r.id} className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl space-y-2 shadow-md shadow-gray-200/30 dark:shadow-none transition-colors duration-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs text-orange-500">{r.name}</h4>
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} size={8} fill="currentColor" />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] dark:text-gray-300 text-neutral-800 italic leading-relaxed">"{r.comment}"</p>
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
              
              <p className="text-[11px] dark:text-gray-300 text-neutral-800 leading-relaxed max-w-sm mx-auto font-medium">
                हमने BAM BAM CAFE की शुरुआत एक छोटे से सपने के साथ की थी—लोगों को घर जैसा स्वाद और कैफे वाला माहौल देने के लिए। यहाँ हर कप कॉफी और हर स्लाइस पिज्जा प्यार और शुद्धता के साथ बनाया जाता है। हमारी कोशिश है कि आप जब भी यहाँ आएँ, एक प्यारी मुस्कान के साथ वापस जाएँ। ❤️
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-black uppercase">
            <div className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-md shadow-gray-200/30 dark:shadow-none transition-colors duration-200">
              <Clock className="text-orange-500" size={16} />
              <p className="dark:text-gray-400 text-gray-505 text-[8px]">Open Timing</p>
              <p className="dark:text-white text-neutral-800 text-[9px]">सुबह 10:00 से रात 11:00 बजे</p>
            </div>
            
            <a href="https://maps.app.goo.gl/nHq8rLpn7kV3NsJd6" target="_blank" rel="noreferrer" className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-orange-500/30 shadow-md shadow-gray-200/30 dark:shadow-none transition-all duration-200">
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

      {/* REQUIREMENT: LIVE ORDER REAL-TIME TRACKING FOOTER PANEL */}
      <AnimatePresence>
        {liveOrder && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 inset-x-4 z-50 max-w-sm mx-auto bg-neutral-955/95 backdrop-blur-md border border-orange-500/30 p-4 rounded-3xl shadow-2xl flex flex-col gap-2 text-xs font-bold font-sans animate-none"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-gray-200">आर्डर लाइव ट्रैकिंग (Bill #{formatBillNumber(liveOrder.billNumber)})</span>
              </div>
              <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md text-[9px] uppercase font-black font-mono">
                Token: #{liveOrder.tokenNumber}
              </span>
            </div>

            {/* Progress Bar indicating live state in kitchen */}
            <div className="space-y-1 mt-1">
              <div className="flex justify-between text-[8px] text-gray-400 uppercase">
                <span className={liveOrder.status === 'pending' ? 'text-orange-400 font-extrabold' : ''}>Confirming ⏳</span>
                <span className={liveOrder.status === 'preparing' ? 'text-yellow-400 font-extrabold' : ''}>Preparing 👨‍🍳</span>
                <span className={liveOrder.status === 'out_for_delivery' ? 'text-blue-400 font-extrabold' : ''}>On the Way 🛵</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-yellow-400 h-full transition-all duration-500" 
                  style={{ 
                    width: liveOrder.status === 'pending' ? '25%' : liveOrder.status === 'preparing' ? '65%' : '90%' 
                  }} 
                />
              </div>
            </div>

            <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-xl border border-white/5 mt-1">
              <span className="text-[10px] text-gray-455 uppercase font-sans">Delivery OTP Code (सुरक्षा पिन)</span>
              <span className="text-yellow-400 font-black text-sm font-mono tracking-widest bg-yellow-500/10 px-2.5 py-0.5 rounded border border-yellow-500/20">
                {liveOrder.deliveryPin || "WAIT"}
              </span>
            </div>

            <div className="flex gap-2 pt-1 border-t border-white/5">
              <a 
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(liveOrder.billNumber)} (टोकन नंबर: #${liveOrder.tokenNumber}) का लाइव स्टेटस बताएं।`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-white/5 hover:bg-white/10 text-center text-[10px] text-yellow-400 py-1.5 rounded-xl border border-white/5 transition-all font-sans"
              >
                Track Live Status (WA) 🔍
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN REELS VIEWER (Autoplays seamlessly and exits on finish - Requirement 2) */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 bg-black z-[250] flex flex-col justify-between">
            <div className="absolute top-4 inset-x-0 px-4 z-[260] flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pb-10">
              <span className="text-white text-xs font-black tracking-wider uppercase">{activeStory.title}</span>
              <button 
                onClick={() => { triggerHaptic(); setActiveStory(null); }} 
                className="p-2 bg-white/10 rounded-full text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <video 
                src={activeStory.url} 
                autoPlay 
                playsInline 
                onEnded={handleReelEnded}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>

            <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent text-center space-y-4 z-[260]">
              <p className="text-xs text-gray-300 font-semibold">{activeStory.description}</p>
              <button 
                onClick={() => handleQuickAddFromStory(activeStory.title, activeStory.price)}
                className="w-full max-w-sm mx-auto bg-orange-500 hover:bg-orange-600 text-black py-4 rounded-2xl font-black text-xs uppercase shadow animate-none"
              >
                ADD TO CART • ₹{activeStory.price}
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* REVIEWS DRAWER MODAL */}
      <AnimatePresence>
        {isReviewsDrawerOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] overflow-y-auto">
            <div className="p-6 max-w-lg mx-auto pb-32">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-white">All Reviews</h2>
                  <p className="text-xs text-yellow-400 font-bold">Rating: 4.8/5.0 ★</p>
                </div>
                <button onClick={() => { triggerHaptic(); setIsReviewsDrawerOpen(false); }} className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
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
                    <p className="text-[11px] dark:text-gray-300 text-neutral-800 italic font-sans">"{r.comment}"</p>
                  </div>
                ))}
              </div>
              <div className="fixed bottom-6 left-0 w-full px-6 z-50">
                <button onClick={() => { triggerHaptic(); setIsReviewFormOpen(true); }} className="w-full max-w-md mx-auto bg-orange-500 text-black py-3.5 rounded-2xl font-black text-xs uppercase font-sans">✍️ Write a Review</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* WRITING REVIEW POPUP */}
      <AnimatePresence>
        {isReviewFormOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleReviewSubmit} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <div className="flex justify-between items-center pb-2 border-b dark:border-white/10 border-gray-100">
                <h3 className="text-xl font-black text-orange-500 uppercase italic">Your Feedback</h3>
                <button 
                  type="button" 
                  onClick={() => { triggerHaptic(); setIsReviewFormOpen(false); }} 
                  className="p-2 bg-red-100 hover:bg-red-500 hover:text-white text-red-650 rounded-full transition-all duration-200"
                  title="Close Feedback"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">Your Name</label>
                  <input type="text" placeholder="Enter your name..." value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-lg text-xs dark:text-white text-neutral-900 focus:border-orange-500 outline-none font-bold" />
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
                        className="dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-200 hover:border-orange-500/50 px-2 py-1 rounded-full text-[9px] dark:text-gray-300 text-neutral-850 font-bold transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">Comments</label>
                  <textarea placeholder="Khana kaisa laga?..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-lg text-xs dark:text-white text-neutral-900 focus:border-orange-500 outline-none resize-none font-bold" />
                </div>
              </div>
              <div className="flex gap-2 pt-1 font-sans">
                <button type="submit" className="flex-1 bg-orange-500 text-black font-black p-3 rounded-lg text-xs uppercase">SUBMIT</button>
                <button type="button" onClick={() => { triggerHaptic(); setIsReviewFormOpen(false); }} className="dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-neutral-700 font-bold p-3 rounded-lg text-xs uppercase">CANCEL</button>
              </div>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* STANDARD CUSTOMIZATION MODAL FOR REGULAR PIZZAS */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="dark:bg-[#111] bg-white w-full p-6 rounded-t-3xl border-t dark:border-white/10 border-gray-200 max-w-lg mx-auto overflow-y-auto max-h-[95vh] shadow-2xl transition-colors duration-200">
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-black text-center text-neutral-900 dark:text-white">{selectedProduct?.name}</h3>
              <p className="text-orange-555 font-black mb-4 uppercase text-[8px] text-center">Customize Your Order</p>
              
              <div className="space-y-3 mb-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase">1. Select Portion Size:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                    <button 
                      type="button" 
                      key={size} 
                      onClick={() => { setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} 
                      className={`p-3 rounded-xl flex flex-col items-center border transition-all ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'dark:bg-white/[0.03] bg-gray-50 dark:border-white/5 border-gray-200 dark:text-gray-400 text-neutral-800'}`}
                    >
                      <span className="capitalize text-xs font-black">{size}</span>
                      <span className="font-extrabold text-[10px] mt-1 dark:text-white text-neutral-900 font-mono">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {normalPizzaSize && (selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-3 mb-4 border-t border-white/5 pt-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">2. Select Add-ons:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]) => {
                      const isSelected = !!normalPizzaAddons[addon];
                      return (
                        <button
                          type="button"
                          key={addon}
                          onClick={() => setNormalPizzaAddons(prev => ({ ...prev, [addon]: !prev[addon] }))}
                          className={`p-2.5 rounded-xl border flex justify-between items-center text-[9px] font-bold ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-450' : 'dark:border-white/5 border-gray-200 dark:bg-white/[0.02] bg-gray-50 dark:text-gray-300 text-neutral-855'}`}
                        >
                          <span>{addon}</span>
                          <span className="text-orange-400 font-black">+₹{cost}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-6 border-t border-white/5 pt-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Special Note for Chef / Instructions:</p>
                <div className="flex flex-wrap gap-1.5 pb-2">
                  {QUICK_INSTRUCTION_TAGS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => quickAppendInstruction(tag, "normal")}
                      className="text-[9px] font-bold py-1 px-2 rounded-full border dark:border-white/5 border-gray-200 bg-neutral-100 dark:bg-neutral-800 dark:text-gray-300 text-neutral-800 hover:border-orange-500 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea 
                  placeholder="e.g. Make it extra spicy, No onions, soft crust etc..." 
                  value={chefNote} 
                  onChange={(e) => setChefNote(e.target.value)} 
                  className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 dark:text-white text-neutral-955 outline-none focus:border-orange-500 h-16 resize-none"
                />
              </div>

              <button type="button" onClick={handleNormalPizzaAdd} className="w-full bg-orange-500 text-black p-4 rounded-xl font-black text-xs uppercase animate-none font-sans">
                Confirm Add To Cart
              </button>
              <button type="button" onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setChefNote(""); }} className="w-full mt-3 dark:text-gray-500 text-gray-400 font-black text-[10px] text-center uppercase font-sans">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPACT PROFILE, LOYALTY LEDGER, & ORDER HISTORY DRAWER */}
      <AnimatePresence>
        {isProfileOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[115] flex items-end">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-gray-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200"
            >
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white text-neutral-900 font-mono">My Account & Loyalty</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { triggerHaptic(); setIsProfileOpen(false); }} className="p-2.5 dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:text-white text-neutral-800 rounded-full transition-all"><X size={20} /></button>
                </div>
              </div>

              {!customerDetails ? (
                <form onSubmit={handleSaveDetails} className="space-y-4 font-sans">
                  <div className="text-center space-y-1.5 pb-2">
                    <User className="mx-auto text-orange-500" size={32} />
                    <h3 className="text-sm font-black dark:text-white text-neutral-900">प्रोफाइल सेटअप करें</h3>
                    <p className="text-[10px] text-gray-400 font-semibold leading-normal">लॉयल्टी पॉइंट्स कमाने, सुरक्षित पिन सेटअप करने और आसान चेकआउट करने के लिए प्रोफाइल बनाएं!</p>
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Your Name</label>
                      <input type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Mobile Number</label>
                      <input type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1"><Lock size={10}/> <span>Create 4-Digit Security PIN (सुरक्षा पिन)</span></label>
                      <input type="password" maxLength={4} placeholder="e.g. 1234" value={tempPin} onChange={(e) => setTempPin(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs text-center tracking-widest" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Referral Code (Optional)</label>
                      <input type="text" placeholder="Enter invite code..." value={tempRefCode} onChange={(e) => setTempRefCode(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-205 p-3 rounded-xl font-bold dark:text-white text-neutral-955 outline-none focus:border-orange-500 text-xs" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-orange-500 text-black p-3.5 rounded-xl font-black text-xs uppercase shadow transition-all active:scale-95 mt-4 font-sans">Create Account ➔</button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* USER ACCOUNT VIEW */}
                  <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 flex justify-between items-center transition-colors duration-200">
                    <div>
                      <p className="text-[8px] dark:text-gray-505 text-neutral-655 font-black uppercase">Customer Profile</p>
                      <h4 className="font-black text-base text-orange-500">{customerDetails.name}</h4>
                      <p className="text-xs dark:text-gray-400 text-neutral-700 font-semibold">{customerDetails.phone}</p>
                      <p className="text-[9px] text-yellow-600 dark:text-yellow-400 font-bold mt-1 uppercase">Invite Code: {getReferralCode()}</p>
                    </div>
                    <button 
                      onClick={() => { 
                        triggerHaptic();
                        localStorage.removeItem('bb_cafe_customer'); 
                        setCustomerDetails(null); 
                        setTempName(""); 
                        setTempPhone(""); 
                        setTempPin(""); 
                      }} 
                      className="text-[9px] bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 px-3 py-2 rounded-lg font-black uppercase flex items-center gap-1 transition-all"
                    >
                      <LogOut size={12}/> Logout
                    </button>
                  </div>

                  {/* Eco-Hero Badge & Savings Tracker */}
                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between shadow-sm font-sans">
                    <div className="space-y-1 font-sans">
                      <p className="text-[8px] uppercase tracking-wider text-emerald-500 font-black">पर्यावरण संरक्षण ट्रैकर (Eco Impact)</p>
                      <h4 className="text-xs font-black dark:text-white text-neutral-900">
                        आपने बचाए: <span className="text-emerald-500 text-sm font-black">{ecoCutlerySaves} प्लास्टिक चम्मच 🌳</span>
                      </h4>
                      <p className="text-[9px] text-gray-400 font-medium">चम्मच/टिश्यू न चुनकर आपने पर्यावरण की मदद की है।</p>
                    </div>
                    {ecoCutlerySaves >= 3 && (
                      <div className="bg-emerald-500 text-black px-3 py-1.5 rounded-full border border-emerald-400/30 font-black text-[9px] flex items-center gap-1 shadow animate-pulse">
                        <Award size={12}/>
                        <span>Eco-Hero 🍃</span>
                      </div>
                    )}
                  </div>

                  {/* LOYALTY SCOREBOARD CARD */}
                  <div className="dark:bg-yellow-400/5 bg-yellow-100 border border-yellow-350 dark:border-yellow-400/20 rounded-2xl p-4 space-y-3 transition-colors duration-200 shadow-md">
                    <div className="flex justify-between items-center border-b dark:border-white/10 border-yellow-200 pb-2 font-sans">
                      <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase"><Gift size={12}/> <span>Bum Bum Loyalty Club</span></div>
                      <span className={`text-[8px] font-black border px-2 py-0.5 rounded-full ${getCustomerTier(customerPoints).color}`}>
                        {getCustomerTier(customerPoints).name}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-2xl font-black dark:text-white text-neutral-900 leading-none">{customerPoints} <span className="text-[9px] dark:text-gray-500 text-neutral-700 font-black uppercase">Points</span></h4>
                        <p className="text-[8px] dark:text-gray-400 text-neutral-700 font-bold mt-1">₹100 खर्च करें = 1 पॉइंट पाएं!</p>
                      </div>
                      <div className="text-right text-[8px] dark:text-yellow-400 text-amber-900 font-black space-y-0.5 uppercase max-h-20 overflow-y-auto no-scrollbar font-mono">
                        {loyaltyRules.map(rule => (<p key={rule.id}>🎁 {rule.pointsCost} Pts = {rule.rewardName}</p>))}
                      </div>
                    </div>

                    {/* Points Passbook Ledger */}
                    {pointsHistory.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5 font-mono font-sans">
                        <p className="text-[9px] font-black uppercase dark:text-gray-400 text-neutral-700 font-sans">📜 Points Passbook (हाल ही के लेन-देन):</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[8px] font-bold">
                          {pointsHistory.map((h: any) => (
                            <div key={h.id} className="flex justify-between items-center bg-black/10 dark:bg-white/5 p-1.5 rounded border dark:border-white/5 border-gray-200">
                              <span className="truncate max-w-[170px] dark:text-gray-300 text-neutral-800 font-sans">{h.description}</span>
                              <span className={h.type === 'earn' ? 'text-green-500' : 'text-red-500'}>
                                {h.type === 'earn' ? '+' : '-'}{h.points} Pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 flex flex-col gap-2 font-sans">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="dark:text-gray-400 text-neutral-700 font-black uppercase">Share Progress:</span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-black bg-yellow-100 dark:bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-350 dark:border-yellow-400/20">{shareCount}/5 Shared</span>
                      </div>
                      <button type="button" onClick={handleShareApp} className="w-full bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1 shadow-md transition-all">
                        <Share2 size={12}/>
                        <span>Share 5 Times to earn free +1 Loyalty Point! 🎁</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between items-center font-sans">
                      <span className="text-[9px] dark:text-gray-400 text-neutral-700 font-bold uppercase">Gift points to friend:</span>
                      <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(true); }} className="bg-yellow-500/10 text-yellow-500 border border-yellow-400/20 px-2.5 py-1 rounded text-[8px] font-black uppercase">🎁 Gift Points</button>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5 font-sans">
                      <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase">Redeem Points (adds straight to cart!):</p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                        {loyaltyRules.map(rule => {
                          const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                          const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                          return (
                            <button key={rule.id} type="button" onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)} disabled={!isAffordable} className={`py-2 px-2 rounded text-[9px] font-black uppercase border truncate transition-all ${isAffordable ? 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-500' : 'bg-neutral-100 dark:bg-white/5 text-neutral-455 dark:text-gray-505 border-neutral-200 dark:border-white/5 cursor-not-allowed'}`}>🎁 {rule.rewardName} ({rule.pointsCost} P)</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Synchronized Social Links inside profile drawer */}
                  <div className="pt-2 border-t dark:border-white/10 border-gray-200 space-y-2 font-sans">
                    <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase tracking-wider">Earn Points by Following us:</p>
                    <div className="grid grid-cols-2 gap-2 text-[8px] font-black uppercase">
                      {SOCIAL_LINKS.map((platform) => (
                        <button 
                          key={platform.id}
                          onClick={() => handleSocialClickWithClaim(platform)} 
                          className="flex items-center justify-between dark:bg-green-500/10 bg-green-50 p-2.5 rounded-xl border dark:border-green-500/20 border-green-200/50 p-3 rounded-xl"
                        >
                          <span>{platform.label}</span>
                          <span className="bg-yellow-400 text-black px-1.5 py-0.5 rounded text-[7px]">{getClaimStatus(platform.id)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* USER PERSONAL ORDER HISTORY */}
                  <div className="space-y-3 pt-2 font-sans">
                    <h3 className="text-xs font-black dark:text-gray-300 text-neutral-800 uppercase flex items-center gap-1"><History size={14}/> <span>My Order History</span></h3>
                    {pastOrders.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {pastOrders.map((ord: any, index: number) => (
                          <div key={index} className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-xl p-3.5 space-y-2 text-[10px] font-bold">
                            <div className="flex justify-between items-center">
                              <span className="text-orange-500">Bill No: #{formatBillNumber(ord.billNumber || 0)}</span>
                              <span className="bg-green-600/15 text-green-400 px-1.5 py-0.5 rounded font-black text-[8px]">Token: #{ord.tokenNumber || "N/A"}</span>
                            </div>
                            <div className="text-[9px] text-gray-450 font-semibold space-y-0.5 font-sans">
                              {ord.items.map((it: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                  <span>{it.name} x{it.quantity}</span>
                                  <span>₹{it.price * it.quantity}</span>
                                </div>
                              ))}
                            </div>
                            <div className="h-px bg-white/5 my-1" />
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 font-semibold">Grand Total:</span>
                              <span className="font-black dark:text-white text-neutral-955 font-mono font-bold font-mono">₹{ord.total}</span>
                            </div>
                            <a 
                              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते  बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(ord.billNumber)} (टोकन नंबर: #${ord.tokenNumber}) का लाइव स्टेटस बताएं।`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full bg-white/5 hover:bg-white/10 text-center text-[9px] font-black text-yellow-400 py-2 rounded-lg block border border-white/5 transition-all mt-1 font-sans"
                            >
                              Track Live Status on WA
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-505 py-4 text-[9px] font-bold uppercase tracking-wider">
                        अभी तक कोई आर्डर नहीं मिला। स्वादिष्ट आर्डर शुरू करें! 🍕
                      </p>
                    )}
                  </div>
                </div>
              )}
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
                <h2 className="text-2xl font-black dark:text-white text-neutral-900 font-mono">Your Order Cart</h2>
                <button onClick={() => { triggerHaptic(); setIsCartOpen(false); }} className="p-2.5 dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:text-white text-neutral-800 rounded-full transition-all"><X size={20} /></button>
              </div>

              {/* 1. CART ITEMS LIST */}
              {cart.map((item: any) => (
                <div key={item.id} className="flex flex-col dark:bg-white/[0.02] bg-white p-4 rounded-2xl mb-3 border dark:border-white/5 border-gray-200 shadow-sm transition-colors duration-200 gap-1.5 font-sans">
                  <div className="flex justify-between items-center">
                    <div className="min-w-0 pr-3">
                      <h4 className="font-bold text-xs dark:text-gray-100 text-neutral-900 truncate">{item?.name || "Item"}</h4>
                      <p className="text-orange-555 font-black mt-1 text-[11px] font-mono">₹{item?.price || 0}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-xl border border-white/10 flex-shrink-0">
                      <button onClick={() => { triggerHaptic(); removeItem(item.id); }} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded text-sm font-black">-</button>
                      <span className="font-black text-xs px-1 dark:text-white text-neutral-955">{item.quantity}</span>
                      {item.isReward ? (
                        <button disabled className="w-6 h-6 flex items-center justify-center bg-white/5 text-gray-500 rounded text-sm font-black cursor-not-allowed">+</button>
                      ) : (
                        <button onClick={() => { triggerHaptic(); addItem(item); }} className="w-6 h-6 flex items-center justify-center bg-green-500/10 text-green-500 rounded text-sm font-black">+</button>
                      )}
                    </div>
                  </div>
                  {item.note && (
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-2 text-[9px] text-orange-400 italic">
                      👩‍🍳 Chef Instructions: {item.note}
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-6 space-y-4 font-sans">
                {/* 2. UPSELL / FREQUENTLY BOUGHT TOGETHER */}
                {upsellSuggestionItems.length > 0 && (
                  <div className="dark:bg-purple-950/20 bg-purple-50 border border-purple-500/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] font-black uppercase dark:text-purple-400 text-purple-800 tracking-wider">Frequently Bought Together 🥤</p>
                    <div className="space-y-2">
                      {upsellSuggestionItems.map((suggest) => (
                        <div key={suggest.id} className="flex justify-between items-center text-[10px]">
                          <div>
                            <span className="font-bold block dark:text-white text-neutral-900">{suggest.name}</span>
                            <span className="text-orange-600 font-extrabold">{getDisplayPrice(suggest)}</span>
                          </div>
                          <button onClick={() => { triggerHaptic(); addItem(suggest); }} className="bg-purple-500/20 text-purple-355 border border-purple-500/30 px-3 py-1 rounded-lg font-black uppercase animate-none">ADD</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. FREE DELIVERY PROGRESS TARGET BAR */}
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-orange-500">
                    <span>🚚 Free Delivery Target:</span>
                    <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                  </div>
                  <p className="text-[8px] dark:text-gray-400 text-neutral-800 font-bold">*Mohandra Town is free delivery above ₹99. Nearby Areas limit is active.</p>
                </div>

                {/* 4. SELECT DELIVERY ZONE */}
                <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2 transition-colors duration-200">
                  <label className="text-[9px] font-black uppercase dark:text-gray-400 text-neutral-800">Select Delivery Zone (KM):</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DELIVERY_AREAS.map((area) => {
                      const isSelected = selectedArea.name === area.name;
                      return (
                        <button
                          type="button"
                          key={area.name}
                          onClick={() => { triggerHaptic(); setSelectedArea(area); }}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-500/10 text-orange-655 shadow-md animate-none' 
                              : 'dark:border-white/5 border-gray-200 dark:bg-white/[0.01] bg-gray-50 dark:text-neutral-300 text-neutral-900 hover:border-gray-300 hover:dark:border-white/10'
                          }`}
                        >
                          <span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span>
                          <div className="flex justify-between items-center w-full mt-2 font-mono">
                            <span className="text-[8px] font-black dark:text-neutral-300 text-neutral-800">शुल्क: ₹{area.fee}</span>
                            <span className="text-[8px] font-black bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded dark:text-yellow-400 text-amber-900">Min: ₹{area.minFree}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. DELIVERY ADDRESS INPUT */}
                <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 space-y-2 transition-colors duration-200">
                  <div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/> <h3 className="font-black uppercase text-[10px]">Delivery Address</h3></div>
                  <div className="flex justify-between items-center mb-1">
                    {/* Live Location Fetch Button */}
                    <button type="button" onClick={handleDetectLocation} className="text-[10px] bg-green-600 text-white font-black px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1 shadow-md uppercase animate-none font-mono">📍 Use Live GPS Location (सटीक लाइव लोकेशन)</button>
                  </div>
                  <textarea placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full dark:bg-black/40 bg-white border dark:border-white/10 border-gray-300 rounded-xl p-3 text-xs font-semibold dark:text-white text-neutral-900 outline-none resize-none h-16" />
                </div>

                {/* 6. ADD EXTRA CONDIMENTS BUTTONS */}
                <div className="dark:bg-[#111] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2 transition-colors duration-200">
                  <p className="text-[9px] font-black uppercase dark:text-gray-400 text-neutral-800">Add Extra condiments to order:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => { triggerHaptic(); setKetchupAddon(!ketchupAddon); }} className={`p-2 rounded-xl border text-[9px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-655 animate-none' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-neutral-800'}`}>
                      Ketchup (+₹10)
                    </button>
                    <button onClick={() => { triggerHaptic(); setOreganoAddon(!oreganoAddon); }} className={`p-2 rounded-xl border text-[9px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-500 animate-none' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-neutral-800'}`}>
                      Oregano (+₹10)
                    </button>
                    <button onClick={() => { triggerHaptic(); setChiliFlakesAddon(!chiliFlakesAddon); }} className={`p-2 rounded-xl border text-[9px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-500 animate-none' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-neutral-800'}`}>
                      Chili Flakes (+₹10)
                    </button>
                  </div>
                </div>

                {/* 7. ECO FRIENDLY PACKAGING */}
                <div className="dark:bg-green-950/10 bg-green-50/50 border dark:border-green-500/10 border-green-200/50 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-tight">🌱 Eco-Friendly Packaging</p>
                    <p className="text-[8px] dark:text-gray-400 text-neutral-700 font-bold">चम्मच / टिश्यू पेपर की आवश्यकता नहीं है</p>
                  </div>
                  <input type="checkbox" checked={noCutlery} onChange={() => { triggerHaptic(); setNoCutlery(!noCutlery); }} className="w-4 h-4 accent-green-500" />
                </div>

                {/* 8. PAY SUMMARY CARD */}
                <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white font-mono">
                  <div className="flex justify-between font-bold mb-1.5 text-xs"><span>Items Total</span> <span>₹{getCartSubtotal()}</span></div>
                  {getCartAddonsPrice() > 0 && <div className="flex justify-between font-bold mb-1.5 text-xs"><span>Extra Condiments</span> <span>+₹{getCartAddonsPrice()}</span></div>}
                  {appliedCoupon && (
                    <div className="flex justify-between font-bold mb-1.5 text-xs text-green-200"><span>Coupon Discount</span> <span>-₹{appliedCoupon.discountValue}</span></div>
                  )}
                  <div className="flex justify-between font-bold mb-3 text-xs opacity-90"><span>Delivery Charge</span> <span>₹{getDeliveryCharge()}</span></div>
                  <div className="h-px bg-white/20 mb-3" />
                  <div className="flex justify-between font-black text-xl"><span>To Pay</span> <span>₹{getTotalBillPrice()}</span></div>
                </div>

                {/* 9. WHATSAPP CHECKOUT TRIGGER */}
                {isTooFar && !address.toLowerCase().includes("dine-in") ? (
                  <div className="bg-red-600/20 text-red-400 p-4 rounded-2xl text-center text-xs font-bold border border-red-500/20">
                    आप 20 KM से अधिक दूर हैं। आर्डर स्वीकार नहीं किया जा सकता। ❌
                  </div>
                ) : (
                  <button onClick={sendWhatsAppOrder} type="button" className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg animate-none font-mono">ORDER ON WHATSAPP</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM PWA INSTALL MANUAL GUIDE MODAL */}
      <AnimatePresence>
        {isInstallModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[270] flex items-center justify-center p-6">
            <div className="dark:bg-[#111] bg-white w-full max-w-sm p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-2xl transition-colors duration-200">
              <Sparkles className="mx-auto text-yellow-450 animate-bounce" size={32} />
              
              <div className="space-y-1">
                <h3 className="text-base font-black dark:text-white text-neutral-900">📲 आसान इंस्टॉलेशन गाइड</h3>
                <p className="text-[10px] dark:text-gray-400 text-neutral-700 font-bold leading-normal">
                  यदि स्वचालित इंस्टॉल काम नहीं कर रहा है, तो आप नीचे दिए गए आसान चरणों से इसे होम स्क्रीन पर जोड़ सकते हैं:
                </p>
              </div>

              <div className="text-left text-xs space-y-3 dark:text-gray-300 text-neutral-800 font-medium border-y dark:border-white/5 border-gray-200 py-4">
                <p className="flex items-start gap-2">
                  <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black flex-shrink-0">1</span>
                  <span>गूगल क्रोम (Chrome) में ऊपर दाईं ओर दिख रहे **तीन डॉट्स (⋮)** आइकॉन पर क्लिक करें।</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black flex-shrink-0">2</span>
                  <span>मेन्यू लिस्ट में नीचे जाकर **'Install app'** या **'Add to Home screen'** का विकल्प चुनें।</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black flex-shrink-0">3</span>
                  <span>अब **'Install'** बटन दबाएं। बम बम कैफ़े ऐप आपके phone की होम स्क्रीन पर असली ऐप की तरह जुड़ जाएगा!</span>
                </p>
              </div>

              <button 
                onClick={() => { triggerHaptic(); setIsInstallModalOpen(false); }} 
                className="w-full bg-orange-500 text-white p-3.5 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow"
              >
                समझ गया, बंद करें
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING CART BUTTON */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <button
            onClick={() => { triggerHaptic(); setIsCartOpen(true); }}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-4 px-5 rounded-2xl font-black text-xs uppercase flex justify-between items-center shadow-2xl active:scale-95 transition-all font-mono"
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

      {/* SECURED GIFT POINTS MODAL (Sender PIN Input Integrated) */}
      <AnimatePresence>
        {isGiftModalOpen && (
          <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6">
            <motion.form onSubmit={handleGiftPoints} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200 font-sans">
              <Gift className="mx-auto text-yellow-400" size={32} />
              <div>
                <h3 className="text-lg font-black text-yellow-400 uppercase italic">Gift Loyalty Points</h3>
                <p className="text-[9px] text-gray-500 font-semibold mt-0.5">अपने  पॉइंट्स किसी दोस्त को गिफ्ट करें</p>
              </div>
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">Friend's Phone Number</label>
                  <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} required className="w-full dark:bg-white/10 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl text-xs font-bold dark:text-white text-neutral-900 outline-none text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">Points to Gift (Your Pts: {customerPoints})</label>
                  <input type="number" placeholder="e.g. 10" value={giftPointsAmount} onChange={(e) => setGiftPointsAmount(e.target.value === "" ? "" : Number(e.target.value))} required className="w-full dark:bg-white/10 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl text-xs font-bold dark:text-white text-neutral-900 outline-none text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500 flex items-center gap-1"><Lock size={10}/> <span>Your 4-Digit Security PIN (सुरक्षा पिन)</span></label>
                  <input type="password" maxLength={4} placeholder="🔒 enter your pin" value={giftSenderPin} onChange={(e) => setGiftSenderPin(e.target.value)} required className="w-full dark:bg-white/10 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl text-xs font-bold dark:text-white text-neutral-900 outline-none text-center tracking-widest" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isGiftingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1">
                  {isGiftingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Gift Points 🎁</span>}
                </button>
                <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(false); setGiftPhone(""); setGiftPointsAmount(""); setGiftSenderPin(""); }} className="bg-white/5 text-gray-405 p-3 rounded-xl font-black text-xs">CANCEL</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* VERIFIED SOCIAL POINTS CLAIM MODAL (Requirement 4) */}
      <AnimatePresence>
        {isClaimModalOpen && claimingPlatform && (
          <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6">
            <motion.form 
              onSubmit={handleClaimSubmit}
              className="dark:bg-[#111] bg-white w-full max-w-sm p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl"
            >
              <div className="text-xl">{claimingPlatform.icon}</div>
              <div className="space-y-1">
                <h3 className="text-base font-black dark:text-orange-500 text-orange-700 uppercase">वेरिफिकेशन दावा सबमिट करें</h3>
                <p className="text-[10px] text-gray-400 leading-normal font-semibold">
                  {claimingPlatform.label} पर फॉलो/सब्सक्राइब करने के बाद, नीचे अपना यूज़रनेम दर्ज करें। हमारे एडमिन इसकी जांच करके आपका {claimingPlatform.points} पॉइंट क्रेडिट करेंगे!
                </p>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black uppercase text-gray-500">Your Profile Handle / Username</label>
                <input 
                  type="text" 
                  placeholder="e.g. @yourname" 
                  value={claimUsername} 
                  onChange={(e) => setClaimUsername(e.target.value)} 
                  required 
                  className="w-full dark:bg-white/10 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-xl text-xs font-bold dark:text-white text-neutral-900 outline-none text-center" 
                />
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={isClaimingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1">
                  {isClaimingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Claim Reward Request ➔</span>}
                </button>
                <button 
                  type="button" 
                  onClick={() => { triggerHaptic(); setIsClaimModalOpen(false); setClaimUsername(""); }} 
                  className="bg-white/5 text-gray-455 p-3 rounded-xl font-black text-xs uppercase"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* SOCIALS DIALOG MODAL */}
      <AnimatePresence>
        {isSocialsOpen && (
          <div className="fixed inset-0 bg-[#111]/95 z-[250] flex items-center justify-center p-6">
            <motion.div className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <div>
                <h3 className="text-xl font-black text-orange-500 uppercase italic">Connect & Earn Points</h3>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">हर प्लेटफार्म पर फॉलो/सब्सक्राइब करने का +1 पॉइंट पाएं!</p>
              </div>
              <div className="space-y-2 text-left max-h-[22rem] overflow-y-auto no-scrollbar pr-1">
                {SOCIAL_LINKS.map((platform) => (
                  <button 
                    key={platform.id}
                    onClick={() => handleSocialClickWithClaim(platform)} 
                    className="w-full flex items-center justify-between dark:bg-green-500/10 bg-green-50 p-2.5 rounded-xl border dark:border-green-500/20 border-green-200/50 p-3 rounded-xl"
                  >
                    <span className="text-[10px] font-black dark:text-white text-neutral-900">{platform.label}</span>
                    <span className="text-[8px] font-black uppercase px-2.5 py-1 rounded bg-yellow-400 text-black">{getClaimStatus(platform.id)}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { triggerHaptic(); setIsSocialsOpen(false); }} className="w-full bg-orange-500 text-black font-black p-3 rounded-xl text-xs uppercase">CLOSE</button>
            </motion.div>
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
                <button onClick={() => { triggerHaptic(); setShowInvoice(false); }} className="text-gray-400"><X size={16} /></button>
              </div>
              <h4 className="text-xl font-black text-yellow-400 italic font-serif">BUM BUM CAFE</h4>
              
              <div className="text-left text-xs space-y-1.5 dark:text-gray-300 text-neutral-800 font-mono">
                <p>Order No: #{formatBillNumber(lastPlacedOrder.billNumber)}</p>
                <p>Token No: #{lastPlacedOrder.tokenNumber}</p>
                <p>Customer: {lastPlacedOrder.customerName}</p>
                <p>Phone: {lastPlacedOrder.customerPhone}</p>
                <div className="border-t border-dashed border-white/10 my-2" />
                {lastPlacedOrder.items.map((it: any) => (
                  <div key={it.id} className="flex flex-col">
                    <div className="flex justify-between">
                      <span>{it.name} x{it.quantity}</span>
                      <span>₹{it.price * it.quantity}</span>
                    </div>
                    {it.note && (
                      <span className="text-[9px] text-orange-400 italic font-sans">  └─ Note: {it.note}</span>
                    )}
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

              <div className="bg-black/40 p-3 rounded-2xl border border-dashed border-orange-500/20 text-center my-2 space-y-0.5">
                <p className="text-[9px] text-gray-500 uppercase font-black">Delivery Verification OTP Code</p>
                <p className="text-yellow-400 font-black text-lg tracking-widest font-mono bg-yellow-500/10 px-4 py-1.5 rounded-xl border border-yellow-500/20 inline-block">
                  {lastPlacedOrder.deliveryPin || "WAIT"}
                </p>
                <p className="text-[8px] text-gray-450 mt-1 font-bold">डिलीवरी बॉय के आने पर उसे यह कोड बताएं, तभी आर्डर डिलीवर होगा।</p>
              </div>

              <div className="pt-2 flex flex-col gap-2 font-sans font-sans">
                <a 
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(lastPlacedOrder.billNumber)} (टोकन नंबर: #${lastPlacedOrder.tokenNumber}) का लाइव स्टेटस बताएं।`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-yellow-400 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wider block text-center"
                >
                  🔍 चेक आर्डर स्टेटस (WA)
                </a>
                <button 
                  onClick={handleShareInvoice} 
                  type="button" 
                  className="bg-green-600 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <Share2 size={12}/>
                  <span>Share Receipt (शेयर रसीद)</span>
                </button>
              </div>

              <p className="text-[9px] text-green-555 dark:text-green-400 dark:bg-green-500/10 bg-green-50 p-2.5 rounded-xl font-bold">
                🌱 पेपर रसीद के बिना DIGITAL इनवॉइस जनरेट किया गया है। धन्यवाद!
              </p>
              <button onClick={() => { triggerHaptic(); setShowInvoice(false); }} className="w-full bg-white text-black p-3 rounded-xl text-xs font-black uppercase">
                CLOSE RECEIPT
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
}
