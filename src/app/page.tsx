'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment, runTransaction, getDoc, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { ShoppingBag, Plus, Search, X, MapPin, Phone, User, Sparkles, Star, Gift, Loader2, Heart, Clock, ChevronRight, WifiOff, History, LogOut, Lock, Award, Play, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { useCartStore } from '../store/useCartStore';

// सब-कंपोनेंट इम्पोर्ट्स (छोटे अक्षरों वाले home फोल्डर से)
import CategorySlider from '../components/admin/home/CategorySlider';
import DiyPizzaBuilder from '../components/admin/home/DiyPizzaBuilder';
import CartDrawer from '../components/admin/home/CartDrawer';
import UpiPaymentModal from '../components/admin/home/UpiPaymentModal';

// TypeScript कम्पाइलेशन बाईपास के लिए कास्टिंग
const SafeCartDrawer = CartDrawer as any;
const SafeUpiPaymentModal = UpiPaymentModal as any;

// =========================================================================
// CONSTANTS & DICTIONARIES
// =========================================================================
const FALLBACK_CATEGORIES = ["All", "Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

const CATEGORY_IMAGES: { [key: string]: string } = {
  "All": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=70",
  "Special Pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=120&q=70",
  "Special Thali": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=120&q=70",
  "Paneer Special": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=120&q=70",
  "Special Mix veg": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=70",
  "Fast Food": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&q=70",
  "Super Cool": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=120&q=70",
  "Indian Bread": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=120&q=70",
  "Special Rice": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=120&q=70"
};

const DELIVERY_AREAS = [
  { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
  { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
  { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
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

const DIY_PIZZA_PRICES: Record<string, any> = {
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

const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

const SOCIAL_LINKS = [
  { id: 'facebook', label: '🔵 Facebook', icon: '/facebook.png', points: 1, url: 'https://www.facebook.com/bbcafe.in/' },
  { id: 'instagram', label: '📸 Instagram', icon: '/instagram.png', points: 1, url: 'https://www.instagram.com/bbcafe.in/' },
  { id: 'whatsapp_channel', label: '📢 WhatsApp Channel', icon: '/whatsapp.png', points: 1, url: 'https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y' },
  { id: 'snapchat', label: '👻 Snapchat', icon: '/snapchat.png', points: 1, url: 'https://www.snapchat.com/add/bbcafe.in' },
  { id: 'youtube', label: '🔴 YouTube', icon: '/youtube.png', points: 1, url: 'https://www.youtube.com/@bbcafe.i' }
];

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

// =========================================================================
// MAIN CAFE COMPONENT
// =========================================================================
export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  const addItem = store?.addItem || (() => {});
  const removeItem = store?.removeItem || (() => {});
  const clearCart = store?.clearCart || (() => {});

  const menuRef = useRef<HTMLDivElement | null>(null);

  // --- STATE VARIABLES ---
  const [menu, setMenu] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [isBannerEnabled, setIsBannerEnabled] = useState(true); 
  const [isInlineBannerEnabled, setIsInlineBannerEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [whatsappNumber, setWhatsappNumber] = useState("919714293759");
  const [upiId, setUpiId] = useState("Q231198993@ybl");
  const [storeCoordinates, setStoreCoordinates] = useState({ lat: 24.2863, lng: 80.1245 });

  const [storeTimingHindi, setStoreTimingHindi] = useState("सुबह 10:00 से रात 11:00 बजे");
  const [storeTimingEnglish, setStoreTimingEnglish] = useState("10:00 AM to 11:00 PM");

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

  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup" | "table">("delivery");
  const [tableNumber, setTableNumber] = useState("Table 1"); 
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");

  const [isHindi, setIsHindi] = useState(false);
  const [customerPoints, setCustomerPoints] = useState<number>(0);

  const [socialCounts, setSocialCounts] = useState<any>({
    facebook: "500+ Followers",
    instagram: "1.2K+ Followers",
    whatsapp_channel: "1K+ Channel Members",
    snapchat: "200+ Subs",
    youtube: "1.5K+ Subs"
  });
  
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
  const [reviews, setReviews] = useState<any[]>([]);
  
  const [isReviewsDrawerOpen, setIsReviewsDrawerOpen] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  
  const [enteredCoupon, setEnteredCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Normal Pizza Customization
  const [normalPizzaSize, setNormalPizzaSize] = useState("");
  const [normalPizzaPrice, setNormalPizzaPrice] = useState(0);
  const [normalPizzaAddons, setNormalPizzaAddons] = useState<{ [addon: string]: boolean }>({});
  const [chefNote, setChefNote] = useState(""); 

  // DIY Pizza
  const [diySize, setDiySize] = useState<string>("small"); 
  const [diySauce, setDiySauce] = useState<boolean>(true); 
  const [diyMozzarella, setDiyMozzarella] = useState<boolean>(true); 
  const [diyVegSelection, setDiyVegSelection] = useState<{ [veg: string]: boolean }>({ onion: false, tomato: false, capsicum: false, corn: false });
  const [diyPremiumToppings, setDiyPremiumToppings] = useState<{ [top: string]: boolean }>({ black_olive: false, jalapeno: false, red_peprica: false, paneer: false, mushroom: false });
  const [diyChefNote, setDiyChefNote] = useState<string>("");

  // Reels, proof, shares
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any | null>(null);
  const [socialProofs, setSocialProofs] = useState<any[]>([]);
  const [socialAlertIndex, setSocialAlertIndex] = useState(0);
  const [showSocialAlert, setShowSocialAlert] = useState(false);

  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimingPlatform, setClaimingPlatform] = useState<any>(null);
  const [claimUsername, setClaimUsername] = useState("");
  const [isClaimingLoading, setIsClaimingLoading] = useState(false);

  const [ketchupAddon, setKetchupAddon] = useState(false);
  const [oreganoAddon, setOreganoAddon] = useState(false);
  const [chiliFlakesAddon, setChiliFlakesAddon] = useState(false);

  const [noCutlery, setNoCutlery] = useState(false);
  const [selectedArea, setSelectedArea] = useState(DELIVERY_AREAS[0]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [, setLastPlacedOrder] = useState<any>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [shareCount, setShareCount] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUpiPopupOpen, setIsUpiPopupOpen] = useState(false);

  const [showGreeting] = useState(true);

  // --- CONSTANT DERIVED UTILS & MEMOS ---
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

  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.includes('/video');
  };

  const formatBillNumber = (num: number) => String(num).padStart(4, '0');

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

  const getCartSubtotal = () => cart.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

  const getCartAddonsPrice = () => {
    let total = 0;
    if (ketchupAddon) total += 10;
    if (oreganoAddon) total += 10;
    if (chiliFlakesAddon) total += 10;
    return total;
  };

  const getDeliveryCharge = () => {
    if (fulfillmentType === "pickup" || fulfillmentType === "table") return 0;
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

  const getCustomerTier = (points: number) => {
    if (points >= 50) return { name: "Platinum Member 👑", color: "text-cyan-700 border-cyan-500/40 bg-cyan-100/50 dark:text-cyan-400" };
    if (points >= 20) return { name: "Gold Member 🌟", color: "text-yellow-800 border-yellow-500/40 bg-yellow-100/50 dark:text-yellow-400" };
    return { name: "Bronze Member 🥉", color: "text-orange-700 border-orange-500/40 bg-orange-100/50 dark:text-orange-400" };
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

  const getCategoryImage = (catName: string) => {
    const found = dbCategories.find(c => String(c.name).toLowerCase().trim() === String(catName).toLowerCase().trim());
    if (found) {
      return found.image || found.imageUrl || found.coverUrl || CATEGORY_IMAGES[catName] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=70";
    }
    return CATEGORY_IMAGES[catName] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=70";
  };

  const getReferralCode = () => {
    if (!customerDetails) return "WELCOME";
    const namePart = customerDetails.name.trim().split(" ")[0].substring(0, 4).toUpperCase();
    const phonePart = customerDetails.phone.slice(-4);
    return `${namePart}${phonePart}`;
  };

  // --- CALCULATION MEMOS ---
  const ecoCutlerySaves = useMemo(() => pastOrders.filter((o: any) => o.noCutlery === true).length, [pastOrders]);

  const calculatedDiyPizzaPrice = useMemo(() => {
    const config = DIY_PIZZA_PRICES[diySize];
    if (!config) return 0;
    let total = config.base;
    if (diySauce) total += config.sauce;
    if (diyMozzarella) total += config.mozzarella;
    Object.entries(diyVegSelection).forEach(([veg, isSelected]) => { if (isSelected) total += config.veggies[veg] || 0; });
    Object.entries(diyPremiumToppings).forEach(([top, isSelected]) => { if (isSelected) total += config[top] || 0; });
    return total;
  }, [diySize, diySauce, diyMozzarella, diyVegSelection, diyPremiumToppings]);

  const greetingText = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    let timeGreeting = "Namaste";
    if (hours >= 5 && hours < 12) timeGreeting = "Good Morning ☀️";
    else if (hours >= 12 && hours < 17) timeGreeting = "Good Afternoon 🌤️";
    else if (hours >= 17 && hours < 22) timeGreeting = "Good Evening 🌆";
    else timeGreeting = "Good Night 🌙";

    return customerDetails?.name 
      ? `Namaste ${customerDetails.name} ji, ${timeGreeting}! What can Bum Bum Cafe make for you today? 😊`
      : `Namaste, ${timeGreeting}! What can Bum Bum Cafe make for you today? 😊`;
  }, [customerDetails]);

  const deduplicatedMenu = useMemo(() => {
    const seen = new Set();
    const hiddenCategoryNames = new Set(dbCategories.filter((c: any) => c.isVisible === false).map((c: any) => String(c.name).toLowerCase().trim()));
    return menu.filter(item => {
      const itemCatClean = item?.category ? String(item.category).toLowerCase().trim() : "";
      if (hiddenCategoryNames.has(itemCatClean)) return false;
      const idKey = String(item.id).trim();
      if (seen.has(idKey)) return false;
      seen.add(idKey);
      return true;
    });
  }, [menu, dbCategories]);

  const filteredMenu = useMemo(() => {
    const searchWords = debouncedSearchQuery.split(/\s+/).filter(Boolean);
    return deduplicatedMenu.filter(item => {
      const itemName = item?.name ? String(item.name).toLowerCase() : "";
      const isFavoriteFilter = selectedCategory === "Favorites";
      const matchesCategory = isFavoriteFilter ? favorites.includes(item.id) : (selectedCategory.toLowerCase() === "all" || String(item.category).toLowerCase().trim() === selectedCategory.toLowerCase().trim());
      const matchesSearch = searchWords.every((word: string) => itemName.includes(word));
      return matchesCategory && matchesSearch;
    });
  }, [deduplicatedMenu, selectedCategory, favorites, debouncedSearchQuery]);

  const visibleCategories = useMemo(() => {
    const dbCatsMap = new Map();
    dbCategories.forEach(c => { if (c?.name) dbCatsMap.set(String(c.name).toLowerCase().trim(), c); });
    const result: string[] = [];
    FALLBACK_CATEGORIES.forEach(catName => {
      const cleanName = catName.toLowerCase().trim();
      if (!dbCatsMap.has(cleanName) || dbCatsMap.get(cleanName).isVisible !== false) result.push(catName);
    });
    dbCategories.forEach(c => {
      if (c?.name && c.isVisible !== false) {
        const cleanName = String(c.name).toLowerCase().trim();
        if (!FALLBACK_CATEGORIES.some(f => f.toLowerCase().trim() === cleanName) && cleanName !== "all" && cleanName !== "diy pizza") {
          result.push(c.name);
        }
      }
    });
    const finalized = ["All", "DIY Pizza", ...result.filter(c => c !== "All" && c !== "DIY Pizza")];
    return Array.from(new Set(finalized));
  }, [dbCategories]);

  const lastDeliveryAddress = useMemo(() => {
    const found = pastOrders.find(o => o.fulfillmentType === "delivery" && o.address);
    return found ? found.address : "";
  }, [pastOrders]);

  const displayReviews = useMemo(() => reviews.length > 0 ? reviews : PERMANENT_REVIEWS, [reviews]);
  const hasManyReviews = useMemo(() => displayReviews.length > 10, [displayReviews]);
  const showAddonsSection = useMemo(() => {
    const eligibleKeywords = ['pizza', 'sandwich', 'burger', 'momo', 'fries', 'chips', 'finger'];
    return cart.some((item: any) => eligibleKeywords.some(keyword => (item.name || '').toLowerCase().includes(keyword)));
  }, [cart]);

  // --- ACTIONS & HANDLERS ---
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('bb_favorites', JSON.stringify(next));
      return next;
    });
  };

  const quickAppendInstruction = (tag: string, type: "diy" | "normal") => {
    triggerHaptic(20);
    if (type === "diy") setDiyChefNote(prev => prev ? `${prev}, ${tag}` : tag);
    else setChefNote(prev => prev ? `${prev}, ${tag}` : tag);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!reviewName || !reviewComment) return toast.error("सभी फ़ील्ड भरें!");
    const toastId = toast.loading("समीक्षा सबमिट की जा रही है...");
    try {
      await addDoc(collection(db, "reviews"), { name: reviewName, comment: reviewComment, rating: reviewRating, isApproved: false, timestamp: new Date() });
      toast.dismiss(toastId);
      toast.success("समीक्षा सबमिट हो गई! वेरिफिकेशन के बाद दिखेगी।");
      setReviewName(""); setReviewComment(""); setReviewRating(5); setIsReviewFormOpen(false);
    } catch {
      toast.dismiss(toastId); toast.error("त्रुटि! कृपया दोबारा प्रयास करें।");
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!tempName || !tempPhone || tempPhone.length !== 10 || !tempPin || tempPin.length !== 4) {
      return toast.error("कृपया सभी सही विवरण दर्ज करें!");
    }
    const phoneClean = tempPhone.trim();
    const customerObj = { name: tempName.trim(), phone: `+91${phoneClean}`, pin: tempPin, refCode: tempRefCode.trim() || undefined };
    const toastId = toast.loading("प्रोफाइल सहेज रहा है...");
    try {
      const userDocRef = doc(db, "customer_points", phoneClean);
      const userSnap = await getDoc(userDocRef);
      if (!userSnap.exists()) {
        await setDoc(userDocRef, { name: customerObj.name, phone: phoneClean, pin: customerObj.pin, points: tempRefCode ? 5 : 0, lastActive: new Date() });
      } else {
        await setDoc(userDocRef, { name: customerObj.name, pin: customerObj.pin, lastActive: new Date() }, { merge: true });
      }
      localStorage.setItem('bb_cafe_customer', JSON.stringify(customerObj));
      setCustomerDetails(customerObj); setIsProfileOpen(false);
      toast.dismiss(toastId); toast.success("प्रोफ़ाइल सफलतापूर्वक सहेजी गई!");
    } catch {
      toast.dismiss(toastId); toast.error("प्रोफाइल सहेजने में त्रुटि आई!");
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!customerDetails?.phone) return toast.error("कृपया पहले अपनी प्रोफाइल कस्टमाइज़ करें!");
    if (!claimUsername) return toast.error("यूज़रनेम दर्ज करें!");
    setIsClaimingLoading(true);
    try {
      await addDoc(collection(db, "point_claims"), { customerName: customerDetails.name, customerPhone: customerDetails.phone, platform: claimingPlatform.id, username: claimUsername, pointsToEarn: claimingPlatform.points, status: 'pending', timestamp: new Date() });
      toast.success("दावा सबमिट किया गया! वेरिफिकेशन के बाद पॉइंट्स मिलेंगे।");
      setClaimUsername(""); setIsClaimModalOpen(false);
    } catch {
      toast.error("Claim failed. Try again.");
    } finally {
      setIsClaimingLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    triggerHaptic();
    if (!enteredCoupon.trim()) return toast.error("कृपया कूपन कोड दर्ज करें!");
    const codeUpper = enteredCoupon.trim().toUpperCase();
    const toastId = toast.loading("कूपन जाँचा जा रहा है...");
    try {
      const couponRef = doc(db, "coupons", codeUpper);
      const couponSnap = await getDoc(couponRef);
      if (couponSnap.exists()) {
        const data = couponSnap.data();
        const subtotal = getCartSubtotal();
        const minOrderLimit = data.minOrder ?? data.minOrderAmount ?? data.min ?? 0;
        if (subtotal < Number(minOrderLimit)) {
          toast.dismiss(toastId);
          return toast.error(`न्यूनतम ऑर्डर राशि ₹${minOrderLimit} होनी चाहिए!`);
        }
        const discountAmount = data.discount ?? data.discountValue ?? data.discountAmount ?? 0;
        setAppliedCoupon({ code: codeUpper, discountValue: Number(discountAmount) });
        toast.dismiss(toastId); toast.success("कूपन सफलतापूर्वक लागू किया गया!");
      } else {
        toast.dismiss(toastId); toast.error("अमान्य कूपन कोड!");
      }
    } catch {
      toast.dismiss(toastId); toast.error("कूपन जांचने में समस्या आई!");
    }
  };

  const handleGiftPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!customerDetails?.phone) return toast.error("कृपया पहले अपनी प्रोफाइल कस्टमाइज़ करें!");
    const senderPhoneClean = customerDetails.phone.replace("+91", "").trim();
    const receiverPhoneClean = giftPhone.trim();
    const pointsToGift = Number(giftPointsAmount);

    if (receiverPhoneClean.length !== 10) return toast.error("नंबर 10 अंकों का होना चाहिए!");
    if (senderPhoneClean === receiverPhoneClean) return toast.error("आप स्वयं को गिफ्ट नहीं कर सकते!");
    if (isNaN(pointsToGift) || pointsToGift <= 0) return toast.error("कृपया सही पॉइंट्स संख्या दर्ज करें!");
    if (customerPoints < pointsToGift) return toast.error("आपके पास पर्याप्त पॉइंट्स उपलब्ध नहीं हैं!");
    if (giftSenderPin !== customerDetails.pin) return toast.error("सुरक्षा पिन गलत है!");

    setIsGiftingLoading(true);
    const toastId = toast.loading("पॉइंट्स ट्रांसफर किए जा रहे हैं...");
    try {
      const receiverDocRef = doc(db, "customer_points", receiverPhoneClean);
      const receiverSnap = await getDoc(receiverDocRef);
      if (!receiverSnap.exists()) {
        toast.dismiss(toastId);
        setIsGiftingLoading(false);
        return toast.error("गिफ्ट पाने वाले का नंबर पंजीकृत नहीं है!");
      }
      const senderDocRef = doc(db, "customer_points", senderPhoneClean);
      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(senderDocRef);
        if (!senderSnap.exists()) throw new Error("Sender records not found.");
        const currentSenderPoints = senderSnap.data().points || 0;
        if (currentSenderPoints < pointsToGift) throw new Error("Insufficient points.");
        transaction.update(senderDocRef, { points: increment(-pointsToGift) });
        transaction.update(receiverDocRef, { points: increment(pointsToGift) });
      });
      await addDoc(collection(db, "customer_points", senderPhoneClean, "history"), { type: 'redeem', points: pointsToGift, description: `Gifted points to ${receiverPhoneClean} 🎁`, timestamp: new Date() });
      await addDoc(collection(db, "customer_points", receiverPhoneClean, "history"), { type: 'earn', points: pointsToGift, description: `Received points from ${senderPhoneClean} 🎁`, timestamp: new Date() });
      setCustomerPoints(prev => prev - pointsToGift);
      toast.dismiss(toastId); toast.success("पॉइंट्स गिफ्ट कर दिए गए!");
      setIsGiftModalOpen(false); setGiftPhone(""); setGiftPointsAmount(""); setGiftSenderPin("");
    } catch (err: any) {
      toast.dismiss(toastId); toast.error(`स्थानांतरण विफल: ${err.message}`);
    } finally {
      setIsGiftingLoading(false);
    }
  };

  const handleAddDiyPizzaToCart = () => {
    triggerHaptic();
    if (calculatedDiyPizzaPrice <= 0) return toast.error("कृपया कोई आकार और सामग्री चुनें!");
    const toppingsList: string[] = [];
    Object.entries(diyVegSelection).forEach(([v, s]) => { if (isSelected(v, diyVegSelection)) toppingsList.push(v); });
    Object.entries(diyPremiumToppings).forEach(([t, s]) => { if (isSelected(t, diyPremiumToppings)) toppingsList.push(t); });
    
    addItem({
      id: `diy-pizza-${Date.now()}`,
      name: isHindi ? `डीआईवाई पिज्जा (${diySize})` : `DIY Pizza (${diySize})`,
      price: calculatedDiyPizzaPrice, quantity: 1, note: diyChefNote || `Toppings: ${toppingsList.join(', ')}`, category: "DIY Pizza"
    });
    setDiySize("small"); setDiySauce(true); setDiyMozzarella(true);
    setDiyVegSelection({ onion: false, tomato: false, capsicum: false, corn: false });
    setDiyPremiumToppings({ black_olive: false, jalapeno: false, red_peprica: false, paneer: false, mushroom: false });
    setDiyChefNote(""); toast.success("कास्ट पिज्जा कार्ट में जोड़ा गया!");
  };

  const isSelected = (key: string, obj: any) => !!obj[key];

  const handleNormalPizzaAdd = () => {
    triggerHaptic();
    if (!normalPizzaSize) return toast.error("कृपया साइज चुनें!");
    let finalPrice = normalPizzaPrice;
    const selectedAddons: string[] = [];
    Object.entries(normalPizzaAddons).forEach(([addon, isSelected]) => {
      if (isSelected) {
        finalPrice += PIZZA_ADDONS[normalPizzaSize.toLowerCase()]?.[addon] || 0;
        selectedAddons.push(addon);
      }
    });
    const noteParts = [];
    if (selectedAddons.length > 0) noteParts.push(`Add-ons: ${selectedAddons.join(', ')}`);
    if (chefNote) noteParts.push(`Note: ${chefNote}`);

    addItem({ id: `${selectedProduct.id}-${normalPizzaSize.toLowerCase()}`, name: `${selectedProduct.name} (${normalPizzaSize.toUpperCase()})`, price: finalPrice, quantity: 1, note: noteParts.join(' | '), category: selectedProduct.category });
    setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setNormalPizzaAddons({}); setChefNote("");
    toast.success("कस्टमाइज्ड पिज्जा कार्ट में जोड़ा गया!");
  };

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    triggerHaptic();
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    const reader = new FileReader();
    reader.onloadend = () => { setPaymentScreenshot(reader.result as string); setIsCompressing(false); toast.success("स्क्रीनशॉट लोड हो गया है!"); };
    reader.onerror = () => { setIsCompressing(false); toast.error("फाइल लोड करने में समस्या आई।"); };
    reader.readAsDataURL(file);
  };

  const handleDetectLocation = () => {
    triggerHaptic();
    if (typeof window === "undefined" || !navigator.geolocation) return toast.error("जियोलोकेशन समर्थित नहीं है।");
    const toastId = toast.loading("लोकेशन खोजी जा रही है...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = calculateDistanceInKm(pos.coords.latitude, pos.coords.longitude, storeCoordinates.lat, storeCoordinates.lng);
        setDistanceKm(Number(distance.toFixed(2)));
        setAddress(`Live Location: Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
        toast.dismiss(toastId); toast.success("लोकेशन सफलतापूर्वक डिटेक्ट की गई!");
      },
      () => { toast.dismiss(toastId); toast.error("लोकेशन एक्सेस करने में असमर्थ।"); },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleShareApp = async () => {
    triggerHaptic();
    const shareText = `Order delicious food from Bum Bum Cafe! Use my invite code: ${getReferralCode()} 🍕`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://bbcafe.in';
    const performClipboardCopy = () => {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success("शेयर लिंक क्लिपबोर्ड पर कॉपी हो गया!");
      updateShareCount();
    };
    if (navigator.share) {
      try { await navigator.share({ title: 'Bum Bum Cafe', text: shareText, url: shareUrl }); updateShareCount(); }
      catch { performClipboardCopy(); }
    } else { performClipboardCopy(); }
  };

  const updateShareCount = async () => {
    const nextCount = shareCount + 1; setShareCount(nextCount);
    if (nextCount % 5 === 0 && customerDetails?.phone) {
      const phoneClean = customerDetails.phone.replace("+91", "").trim();
      try {
        await setDoc(doc(db, "customer_points", phoneClean), { points: increment(1) }, { merge: true });
        await addDoc(collection(db, "customer_points", phoneClean, "history"), { type: 'earn', points: 1, description: `Shared app 5 times! 🎁`, timestamp: new Date() });
        setCustomerPoints(p => p + 1); toast.success("मुफ़्त +1 पॉइंट जोड़ा गया!");
      } catch (err) { console.error(err); }
    }
  };

  const handleCustomerRedeem = (ruleId: string, rewardName: string, pointsCost: number) => {
    triggerHaptic();
    if (!customerDetails?.phone) return toast.error("कृपया पहले प्रोफाइल बनाएं!");
    addItem({ id: ruleId, name: rewardName, price: 0, quantity: 1, isReward: true, pointsCost: pointsCost, category: "Special" });
    toast.success(`${rewardName} आपके कार्ट में मुफ़्त जोड़ा गया!`);
  };

  // --- LIFECYCLES ---
  useEffect(() => {
    setMounted(true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstallPrompt = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); if (!localStorage.getItem('bb_app_installed_or_dismissed')) setShowInstallBanner(true); };

    if (typeof window !== "undefined") {
      setIsOnline(window.navigator.onLine);
      window.addEventListener("online", handleOnline); window.addEventListener("offline", handleOffline);
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }

    // Load Cache
    try {
      if (localStorage.getItem('bb_cached_menu')) setMenu(JSON.parse(localStorage.getItem('bb_cached_menu')!));
      if (localStorage.getItem('bb_cached_social_counts')) setSocialCounts(JSON.parse(localStorage.getItem('bb_cached_social_counts')!));
      if (localStorage.getItem('bb_cached_loyalty_rules')) setLoyaltyRules(JSON.parse(localStorage.getItem('bb_cached_loyalty_rules')!));
      if (localStorage.getItem('bb_cached_categories')) setDbCategories(JSON.parse(localStorage.getItem('bb_cached_categories')!));
      if (localStorage.getItem('bb_cached_banners')) setBanners(JSON.parse(localStorage.getItem('bb_cached_banners')!));
      if (localStorage.getItem('bb_cached_reels')) setStories(JSON.parse(localStorage.getItem('bb_cached_reels')!));
      if (localStorage.getItem('bb_cached_reviews')) setReviews(JSON.parse(localStorage.getItem('bb_cached_reviews')!));
      if (localStorage.getItem('bb_favorites')) setFavorites(JSON.parse(localStorage.getItem('bb_favorites')!));
      if (localStorage.getItem('bb_past_orders')) setPastOrders(JSON.parse(localStorage.getItem('bb_past_orders')!));
      
      const savedDetails = localStorage.getItem('bb_cafe_customer');
      if (savedDetails) {
        const p = JSON.parse(savedDetails);
        setCustomerDetails(p); setTempName(p.name); setTempPhone(p.phone.replace("+91", "")); if (p.pin) setTempPin(p.pin);
      }
    } catch {}

    // SWR Sync
    const fetchFreshDbData = async () => {
      setMenuLoading(true);
      try {
        const storeSnap = await getDoc(doc(db, "settings", "store"));
        if (storeSnap.exists()) {
          const d = storeSnap.data(); setStoreOpen(d.isOpen);
          setIsBannerEnabled(d.isBannerEnabled ?? d.showPromoBanner ?? true);
          setIsInlineBannerEnabled(d.isInlineBannerEnabled ?? d.showInlinePromo ?? true);
          if (d.whatsappNumber) setWhatsappNumber(d.whatsappNumber);
          if (d.upiId) setUpiId(d.upiId);
          if (d.latitude && d.longitude) setStoreCoordinates({ lat: Number(d.latitude), lng: Number(d.longitude) });
          if (d.timingHindi) setStoreTimingHindi(d.timingHindi);
          if (d.timingEnglish) setStoreTimingEnglish(d.timingEnglish);
          if (d.closingMinutesLeft !== undefined) setClosingMinutesLeft(d.closingMinutesLeft);
        }
        const productsSnap = await getDocs(collection(db, "products"));
        const items = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.isVisible !== false);
        setMenu(shuffleArray(items)); localStorage.setItem('bb_cached_menu', JSON.stringify(items));

        const catsSnap = await getDocs(collection(db, "categories"));
        const cats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDbCategories(cats); localStorage.setItem('bb_cached_categories', JSON.stringify(cats));

        const bannersSnap = await getDocs(collection(db, "banners"));
        const banData = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBanners(banData); localStorage.setItem('bb_cached_banners', JSON.stringify(banData));

        const reelsSnap = await getDocs(collection(db, "reels"));
        const reelData = reelsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStories(reelData); localStorage.setItem('bb_cached_reels', JSON.stringify(reelData));

        const revsSnap = await getDocs(collection(db, "reviews"));
        const revData = revsSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter((r: any) => r.isApproved === true || r.isApproved === "approved" || r.approved === true);
        setReviews(revData); localStorage.setItem('bb_cached_reviews', JSON.stringify(revData));

        const rulesSnap = await getDocs(collection(db, "loyalty_rules"));
        const ruleData = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLoyaltyRules(ruleData); localStorage.setItem('bb_cached_loyalty_rules', JSON.stringify(ruleData));

        const socialSnap = await getDoc(doc(db, "settings", "social_counts"));
        if (socialSnap.exists()) { setSocialCounts(socialSnap.data()); localStorage.setItem('bb_cached_social_counts', JSON.stringify(socialSnap.data())); }
      } catch {} finally { setMenuLoading(false); }
    };
    fetchFreshDbData();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      }
    };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <span className="text-xs font-bold uppercase tracking-wider">Bum Bum Cafe Loading...</span>
      </div>
    );
  }

  return (
    <div className="dark:bg-[#050505] bg-neutral-50 min-h-screen dark:text-white text-neutral-800 pb-32 font-sans relative overflow-x-clip transition-colors duration-200">
      <link rel="manifest" href="/manifest.json" />
      <Toaster position="top-center" toastOptions={{ duration: 3000, style: { background: '#222', color: '#fff', fontSize: '12px' } }} />

      {/* Ribbon Notifications */}
      {!isOnline && (
        <div className="bg-red-600 text-white font-black py-2 px-4 text-center text-xs flex items-center justify-center gap-2 shadow-lg sticky top-0 z-[150]">
          <WifiOff size={14} className="animate-pulse" />
          <span>आप ऑफ़लाइन हैं। कैश्ड मेनू दिखाया जा रहा है।</span>
        </div>
      )}
      {closingMinutesLeft !== null && storeOpen && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold py-2 px-4 text-center text-[10px] flex items-center justify-center gap-1.5 shadow-md">
          <span>⏰ आर्डर चेतावनी: बम बम कैफ़े अगले {closingMinutesLeft} मिनट में बंद होने वाला है!</span>
        </div>
      )}

      {/* Social Proof Toasts */}
      <AnimatePresence>
        {showSocialAlert && socialProofs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 20, x: '-50%' }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-black/90 border border-orange-500/30 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-center">
            <span className="text-xs">🔥 {socialProofs[socialAlertIndex]?.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div key={i} className="absolute w-2 h-2 rounded-full" style={{ backgroundColor: ["#facc15", "#f97316", "#ef4444", "#3b82f6"][i % 4], left: `${Math.random() * 100}%`, top: `-10px` }} animate={{ y: [0, window.innerHeight], x: [0, (Math.random() - 0.5) * 200], rotate: [0, 360] }} transition={{ duration: 2 + Math.random() * 2, ease: "easeOut", repeat: Infinity }} />
          ))}
        </div>
      )}

      {/* Reviews Tab */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <button onClick={() => { triggerHaptic(); setIsReviewFormOpen(true); }} className="bg-emerald-600 text-white font-black text-[10px] py-3 px-1.5 rounded-l-xl shadow-2xl border-l border-y border-white/20 flex flex-col items-center gap-1" style={{ writingMode: 'vertical-rl' }}>
          <span>{isHindi ? "समीक्षा" : "Reviews"}</span>
        </button>
      </div>

      {/* HEADER HERO */}
      <header className="relative pt-6 pb-4 px-4 shadow-md flex flex-col justify-end min-h-[120px] bg-neutral-950 border-b border-neutral-800">
        <div className="relative z-20 max-w-[85%] mt-auto bg-black/40 backdrop-blur-sm p-2.5 rounded-xl border border-white/10">
          <h1 className="text-base font-black tracking-wide text-yellow-300 mb-1">{isHindi ? "बम बम कैफ़े" : "Bum Bum Cafe"}</h1>
          <p className="text-[9px] text-gray-300 font-bold">{isHindi ? "पिज्जा, स्पेशल सैंडविच और पनीर तुरंत आर्डर करें!" : "Order Pizza, Sandwich & Paneer Delights instantly!"}</p>
          <button onClick={scrollToMenu} className="mt-1 bg-orange-600 text-white font-black text-[7px] px-2.5 py-0.5 rounded-md uppercase tracking-wider">{isHindi ? "ऑर्डर करें" : "Order Now"}</button>
        </div>
      </header>

      {/* STICKY SEARCH & ACTIONS */}
      <div className="sticky top-0 z-40 dark:bg-[#050505]/95 bg-white/95 backdrop-blur-md py-3 px-4 border-b dark:border-white/5 border-neutral-300 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input type="text" placeholder={isHindi ? "पिज़्ज़ा, सैंडविच, पनीर स्पेशल खोजें..." : "Search pizza, sandwich, paneer special..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-100 py-2.5 px-11 rounded-xl outline-none text-xs font-semibold border dark:border-neutral-700 border-neutral-300" />
        </div>
        <button onClick={() => { triggerHaptic(); setIsHindi(!isHindi); }} className="px-3 py-2.5 bg-orange-500 text-white rounded-xl text-[10px] font-black tracking-wider flex items-center gap-1">
          <Globe size={12} /><span>{isHindi ? "English" : "हिंदी"}</span>
        </button>
        <a href="tel:+919714293759" className="p-2.5 bg-green-600 text-white rounded-xl flex items-center justify-center"><Phone size={18} /></a>
        <button onClick={() => { triggerHaptic(); setIsProfileOpen(true); }} className="p-2.5 dark:bg-neutral-800 bg-neutral-100 rounded-xl border dark:border-neutral-700 border-neutral-300"><User size={18} /></button>
      </div>

      {/* MAIN CONTAINER */}
      <main ref={menuRef} className="pt-3 px-3 max-w-lg mx-auto space-y-4">
        {showGreeting && <h3 className="text-xs font-black dark:text-gray-200 text-neutral-900 px-1">{greetingText}</h3>}

        {showInstallBanner && (
          <div className="bg-gradient-to-r from-[#ff5e00] to-amber-500 p-3.5 rounded-2xl flex items-center justify-between shadow-lg relative mx-1">
            <button onClick={handleDismissInstallBanner} className="absolute top-2 right-2 text-white/70"><X size={14} /></button>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📲</span>
              <div>
                <h4 className="text-xs font-black text-white">Bum Bum Cafe App</h4>
                <p className="text-[9px] text-orange-100 font-bold">{isHindi ? "बिना प्ले स्टोर के सीधे फोन में चलाएं!" : "Add directly to your home screen!"}</p>
              </div>
            </div>
            <button onClick={handleInstallClick} className="bg-white text-black font-black text-[10px] px-3 py-2 rounded-xl">Install ➔</button>
          </div>
        )}

        {/* Stories Reels */}
        {stories.length > 0 && (
          <div className="space-y-1 px-1">
            <p className="text-[8px] font-black uppercase text-orange-500">{isHindi ? "स्वादिष्ट रील्स" : "Daily Food Reels"}</p>
            <div className="flex gap-4 overflow-x-auto py-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {stories.map((story) => (
                <button key={story.id} onClick={() => { triggerHaptic(); setActiveStory(story); }} className="flex flex-col items-center flex-shrink-0">
                  <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-red-600">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-900 relative">
                      <img src={story.coverUrl || story.url} className="w-full h-full object-cover" alt="" loading="lazy" />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><Play size={14} className="text-white fill-white" /></div>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold mt-1 max-w-[70px] truncate">{story.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isBannerEnabled && banners.length > 0 && !bannerError && (
          <div className="w-full h-36 rounded-2xl overflow-hidden relative bg-white/[0.02] border border-neutral-800">
            <AnimatePresence mode="wait">
              <motion.div key={bannerIndex} initial={{ opacity: 0, x: 70 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -70 }} className="w-full h-full absolute inset-0">
                {isVideoUrl(banners[bannerIndex]?.url) ? (
                  <video src={banners[bannerIndex]?.url} autoPlay loop muted playsInline className="w-full h-full object-cover" onError={() => setBannerError(true)} />
                ) : (
                  <img src={banners[bannerIndex]?.url} className="w-full h-full object-cover" onError={() => setBannerError(true)} alt="" loading="lazy" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Categories Component */}
        <CategorySlider isHindi={isHindi} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} visibleCategories={visibleCategories} favorites={favorites} getCategoryImage={getCategoryImage} triggerHaptic={triggerHaptic} />

        {/* DIY Work Space */}
        {selectedCategory === "DIY Pizza" ? (
          <DiyPizzaBuilder isHindi={isHindi} diySize={diySize} setDiySize={setDiySize} diySauce={diySauce} setDiySauce={setDiySauce} diyMozzarella={diyMozzarella} setDiyMozzarella={setDiyMozzarella} diyVegSelection={diyVegSelection} setDiyVegSelection={setDiyVegSelection} diyPremiumToppings={diyPremiumToppings} setDiyPremiumToppings={setDiyPremiumToppings} diyChefNote={diyChefNote} setDiyChefNote={setDiyChefNote} calculatedDiyPizzaPrice={calculatedDiyPizzaPrice} DIY_PIZZA_PRICES={DIY_PIZZA_PRICES} QUICK_INSTRUCTION_TAGS={QUICK_INSTRUCTION_TAGS} quickAppendInstruction={quickAppendInstruction} handleAddDiyPizzaToCart={handleAddDiyPizzaToCart} triggerHaptic={triggerHaptic} storeOpen={storeOpen} />
        ) : (
          /* Products List */
          <div className="grid grid-cols-1 gap-4">
            {menuLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="dark:bg-white/[0.02] bg-white rounded-2xl p-4 space-y-4 animate-pulse">
                  <div className="h-44 bg-neutral-300 dark:bg-neutral-800 rounded-xl" />
                  <div className="h-4 bg-neutral-300 dark:bg-neutral-800 rounded w-1/2" />
                </div>
              ))
            ) : filteredMenu.length === 0 ? (
              <p className="text-center text-neutral-500 py-8 text-xs font-bold uppercase">No items found...</p>
            ) : (
              filteredMenu.map((item, index) => {
                const isItemAvailable = item.isAvailable !== false;
                return (
                  <React.Fragment key={item.id}>
                    <motion.div layout className={`group dark:bg-white/[0.02] bg-white rounded-2xl border dark:border-white/5 border-neutral-200 overflow-hidden flex flex-col relative shadow shadow-neutral-100 dark:shadow-none transition-all ${!isItemAvailable ? 'opacity-70' : ''}`}>
                      <div className="relative h-44 w-full overflow-hidden">
                        <img src={item.image || item.imageUrl || item.url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=70"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="" loading="lazy" />
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 text-[8px] font-black uppercase text-green-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />VEG
                        </div>
                        <div className="absolute bottom-0 left-0 bg-blue-600 text-white font-black text-[9px] px-3 py-1 rounded-tr-xl flex items-center gap-1">
                          <span>🛵</span> <span>{isHindi ? "फ्री डिलीवरी" : "FREE delivery"}</span>
                        </div>
                        {!isItemAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-widest">{isHindi ? "आज उपलब्ध नहीं है" : "Out of Stock"}</span>
                          </div>
                        )}
                        <button onClick={(e) => handleToggleFavorite(item.id, e)} className="absolute top-3 right-3 bg-black/60 p-1.5 rounded-full text-white">
                          <Heart size={14} className={favorites.includes(item.id) ? "fill-red-500 text-red-500" : "text-white"} />
                        </button>
                      </div>

                      <div className="p-4 flex flex-col justify-between flex-1">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-black text-sm dark:text-gray-100 text-neutral-900 line-clamp-1">{item.name}</h4>
                          <div className="bg-green-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded flex items-center gap-0.5">
                            <span>4.9</span><Star size={8} className="fill-white" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-neutral-400 mt-1 uppercase">
                          <span>{item.category}</span><span>• 15-25 min</span>
                        </div>
                        <div className="h-px dark:bg-neutral-800 bg-neutral-200 my-2.5" />
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-neutral-500 text-[8px] font-black uppercase leading-none mb-1">Price</p>
                            <p className="text-orange-600 font-black text-base font-mono">{getDisplayPrice(item)}</p>
                          </div>
                          {storeOpen && isItemAvailable && (
                            <button onClick={() => { triggerHaptic(); item.variants ? setSelectedProduct(item) : addItem(item); }} className="px-4 py-2 bg-orange-500/10 text-orange-600 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-lg font-black text-[10px] uppercase flex items-center gap-1 transition-all">
                              <Plus size={12} /> {isHindi ? "जोड़ें" : "ADD"}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Loyalty Promotion after 4th item */}
                    {index === 3 && (
                      <div onClick={() => { triggerHaptic(); setIsProfileOpen(true); }} className="cursor-pointer bg-gradient-to-r from-amber-500 to-red-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
                        <div className="relative z-10 flex justify-between items-center gap-4">
                          <div className="space-y-1">
                            <span className="bg-black/30 border border-white/20 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-yellow-300">🎁 LOYALTY CLUB PROMO PASS</span>
                            <h4 className="text-sm font-black italic">{isHindi ? "फ्री पिज्जा, सैंडविच और शेक अनलॉक करें!" : "Unlock Free Pizza, Sandwich & Shakes!"}</h4>
                            <p className="text-[10px] text-orange-100 font-bold">{isHindi ? "अपना नाम और नंबर दर्ज करके पास एक्टिवेट करें ➔" : "Tap here to activate pass & view rewards ➔"}</p>
                          </div>
                          <Gift size={24} className="text-yellow-300" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        )}

        {/* REVIEWS GRID */}
        <div className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase text-yellow-500 flex items-center gap-1">⭐ {isHindi ? "ग्राहकों का फीडबैक" : "Feedback from our loved guests"}</h3>
            <span className="text-[9px] text-neutral-400">Total ({displayReviews.length})</span>
          </div>
          <div className={hasManyReviews ? "max-h-[380px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin" : "space-y-3.5"}>
            {displayReviews.slice(0, 5).map((r) => (
              <div key={r.id} className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 p-4 rounded-2xl space-y-2 shadow-sm">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs text-orange-600">{r.name}</h4>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: r.rating || 5 }).map((_, i) => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}
                  </div>
                </div>
                <p className="text-[10.5px] italic leading-relaxed text-neutral-600 dark:text-gray-300">"{r.comment}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pt-8 border-t dark:border-white/5 border-neutral-200 space-y-6">
          <div className="bg-gradient-to-br dark:from-green-950/20 from-green-50 to-emerald-50 p-6 rounded-[2rem] border dark:border-green-500/10 border-green-200 text-center space-y-3 relative overflow-hidden">
            <span className="text-[9px] font-black uppercase text-green-500 bg-green-500/10 px-3 py-1 rounded-full">About Us</span>
            <h4 className="text-xl font-black italic text-yellow-500">BUM BUM CAFE</h4>
            <p className="text-[11.5px] leading-relaxed max-w-sm mx-auto text-neutral-600 dark:text-gray-300">
              {isHindi ? "हमने BAM BAM CAFE की शुरुआत घर जैसा स्वाद और कैफे वाला माहौल देने के लिए की थी। यहाँ हर पिज्जा प्यार और शुद्धता के साथ बनाया जाता है।" : "We serve hygienic, delicious, home-style fast food in Mohandra town. Every slice of pizza here is crafted with ultimate love, purity and hygiene."}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 py-5 dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 rounded-2xl shadow-sm">
            {SOCIAL_LINKS.map((link) => (
              <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1">
                <img src={link.icon} alt="" className="w-8 h-8 object-contain" />
                <span className="text-[8px] font-bold text-neutral-400 mt-0.5">{socialCounts[link.id] || "Follow"}</span>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-black uppercase">
            <div className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1">
              <Clock className="text-orange-500" size={16} />
              <p className="text-[8px] text-neutral-400">{isHindi ? "खुलने का समय" : "Open Timing"}</p>
              <p className="text-[9px] font-mono">{isHindi ? storeTimingHindi : storeTimingEnglish}</p>
            </div>
            <a href="https://maps.app.goo.gl/8pj1Xby3bbMn5qxu5" target="_blank" rel="noreferrer" className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-orange-500/30">
              <MapPin className="text-green-500 animate-bounce" size={16} />
              <p className="text-[8px] text-neutral-400">{isHindi ? "हमारा पता" : "Our Location"}</p>
              <p className="text-yellow-600 text-[9px] underline">Google Map 🗺️</p>
            </a>
          </div>

          <p className="text-center text-[9px] text-neutral-500 font-mono">© 2026 BUM BUM CAFE - MOHANDRA. ALL RIGHTS RESERVED.</p>
        </footer>
      </main>

      {/* STICKY BOTTOM CART FOOTER */}
      <div className="fixed bottom-6 inset-x-0 z-[80] flex justify-center pointer-events-none">
        {cart.length > 0 && (
          <motion.button initial={{ scale: 0, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, y: 50 }} onClick={() => { triggerHaptic(); setIsCartOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-orange-500/30 pointer-events-auto">
            <div className="relative">
              <ShoppingBag size={18} />
              <span className="absolute -top-2.5 -right-2.5 bg-yellow-400 text-black text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-orange-600">
                {cart.reduce((sum: number, item: any) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="text-left leading-none">
              <p className="text-[8px] uppercase tracking-wider text-orange-200">{isHindi ? "कार्ट देखें" : "View Cart"}</p>
              <p className="text-xs font-black font-mono">₹{getTotalBillPrice()}</p>
            </div>
            <ChevronRight size={16} />
          </motion.button>
        )}
      </div>

      {/* Live Order Tracking Status */}
      <AnimatePresence>
        {liveOrder && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }} className="fixed bottom-24 inset-x-4 z-50 max-w-sm mx-auto bg-neutral-950/95 border border-orange-500/30 p-4 rounded-3xl shadow-2xl flex flex-col gap-2 text-xs font-bold">
            <div className="flex justify-between items-center">
              <span className="text-gray-200">{isHindi ? `लाइव ट्रैकिंग (Bill #${formatBillNumber(liveOrder.billNumber)})` : `Live Tracking (#${formatBillNumber(liveOrder.billNumber)})`}</span>
              <button onClick={() => setLiveOrder(null)} className="text-gray-400"><X size={14} /></button>
            </div>
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full" style={{ width: liveOrder.status === 'pending' ? '25%' : liveOrder.status === 'preparing' ? '65%' : '90%' }} />
            </div>
            <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(liveOrder.billNumber)} का लाइव स्टेटस बताएं।`)}`} target="_blank" rel="noreferrer" className="bg-white/5 text-center text-[10px] text-yellow-400 py-1.5 rounded-xl border border-white/5">Track Status on WhatsApp 🔍</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reels fullscreen player */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 bg-black z-[250] flex flex-col justify-between">
            <div className="absolute top-4 inset-x-0 px-4 z-[260] flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pb-10">
              <span className="text-white text-xs font-black tracking-wider uppercase">{activeStory.title}</span>
              <button onClick={() => setActiveStory(null)} className="p-2 bg-white/10 rounded-full text-white"><X size={18} /></button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <video src={activeStory.url} autoPlay playsInline onEnded={handleReelEnded} className="w-full h-auto max-h-[80vh] object-contain" />
            </div>
            <div className="p-6 bg-gradient-to-t from-black text-center space-y-4">
              <p className="text-xs text-gray-300 font-semibold">{activeStory.description}</p>
              <button onClick={() => handleQuickAddFromStory(activeStory.title, activeStory.price)} className="w-full max-w-sm mx-auto bg-orange-500 py-4 rounded-2xl font-black text-xs uppercase">ADD TO CART • ₹{activeStory.price}</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
         DIVIDED MODAL SUB-COMPONENTS (COMPACT WORKSPACE)
         ========================================================================= */}
      
      {/* Review Drawer */}
      <ReviewsDrawer isOpen={isReviewsDrawerOpen} onClose={() => setIsReviewsDrawerOpen(false)} displayReviews={displayReviews} triggerHaptic={triggerHaptic} setIsReviewFormOpen={setIsReviewFormOpen} />

      {/* Review Form Modal */}
      <ReviewFormModal isOpen={isReviewFormOpen} onClose={() => setIsReviewFormOpen(false)} isHindi={isHindi} reviewName={reviewName} setReviewName={setReviewName} reviewRating={reviewRating} setReviewRating={setReviewRating} reviewComment={reviewComment} setReviewComment={setReviewComment} handleReviewSubmit={handleReviewSubmit} triggerHaptic={triggerHaptic} />

      {/* Pizza Customization Modal */}
      <PizzaCustomizationModal selectedProduct={selectedProduct} isHindi={isHindi} normalPizzaSize={normalPizzaSize} setNormalPizzaSize={setNormalPizzaSize} setNormalPizzaPrice={setNormalPizzaPrice} normalPizzaAddons={normalPizzaAddons} setNormalPizzaAddons={setNormalPizzaAddons} PIZZA_ADDONS={PIZZA_ADDONS} chefNote={chefNote} setChefNote={setChefNote} quickAppendInstruction={quickAppendInstruction} handleNormalPizzaAdd={handleNormalPizzaAdd} setSelectedProduct={setSelectedProduct} />

      {/* Install Guide Modal */}
      <InstallGuideModal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} isHindi={isHindi} triggerHaptic={triggerHaptic} />

      {/* Gift Points Modal */}
      <GiftPointsModal isOpen={isGiftModalOpen} onClose={() => setIsGiftModalOpen(false)} isHindi={isHindi} giftPhone={giftPhone} setGiftPhone={setGiftPhone} giftPointsAmount={giftPointsAmount} setGiftPointsAmount={setGiftPointsAmount} giftSenderPin={giftSenderPin} setGiftSenderPin={setGiftSenderPin} customerPoints={customerPoints} isGiftingLoading={isGiftingLoading} handleGiftPoints={handleGiftPoints} triggerHaptic={triggerHaptic} />

      {/* Social Media Points Claim Modal */}
      <SocialClaimModal isOpen={isClaimModalOpen} onClose={() => setIsClaimModalOpen(false)} isHindi={isHindi} claimingPlatform={claimingPlatform} claimUsername={claimUsername} setClaimUsername={setClaimUsername} isClaimingLoading={isClaimingLoading} handleClaimSubmit={handleClaimSubmit} triggerHaptic={triggerHaptic} />

      {/* Profile Drawer Component */}
      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} isHindi={isHindi} customerDetails={customerDetails} setCustomerDetails={setCustomerDetails} tempName={tempName} setTempName={setTempName} tempPhone={tempPhone} setTempPhone={setTempPhone} tempPin={tempPin} setTempPin={setTempPin} tempRefCode={tempRefCode} setTempRefCode={setTempRefCode} handleSaveDetails={handleSaveDetails} ecoCutlerySaves={ecoCutlerySaves} customerPoints={customerPoints} getCustomerTier={getCustomerTier} loyaltyRules={loyaltyRules} pointsHistory={pointsHistory} shareCount={shareCount} handleShareApp={handleShareApp} setIsGiftModalOpen={setIsGiftModalOpen} setClaimingPlatform={setClaimingPlatform} setIsClaimModalOpen={setIsClaimModalOpen} cart={cart} handleCustomerRedeem={handleCustomerRedeem} pastOrders={pastOrders} formatBillNumber={formatBillNumber} whatsappNumber={whatsappNumber} triggerHaptic={triggerHaptic} setTempNameState={setTempName} setTempPhoneState={setTempPhone} setTempPinState={setTempPin} />

      {/* SAFE COMPATIBLE INVOCATIONS FOR PREVENTING RUNTIME BLOCKING */}
      <SafeCartDrawer 
        // Drawer toggle options to satisfy both formats safely
        isOpen={isCartOpen}
        isCartOpen={isCartOpen}
        open={isCartOpen}
        show={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        close={() => setIsCartOpen(false)}
        setIsCartOpen={setIsCartOpen}
        setIsOpen={setIsCartOpen}

        // Standard Props list
        cart={cart}
        addItem={addItem}
        removeItem={removeItem}
        clearCart={clearCart}
        subtotal={getCartSubtotal()}
        total={getTotalBillPrice()}
        fulfillmentType={fulfillmentType}
        setFulfillmentType={setFulfillmentType}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        selectedArea={selectedArea}
        setSelectedArea={setSelectedArea}
        deliveryAreas={DELIVERY_AREAS}
        address={address}
        setAddress={setAddress}
        isHindi={isHindi}
        onCheckout={handleCheckoutClick}
        customerDetails={customerDetails}
        appliedCoupon={appliedCoupon}
        setAppliedCoupon={setAppliedCoupon}
        enteredCoupon={enteredCoupon}
        setEnteredCoupon={setEnteredCoupon}
        handleApplyCoupon={handleApplyCoupon}
        ketchupAddon={ketchupAddon}
        setKetchupAddon={setKetchupAddon}
        oreganoAddon={oreganoAddon}
        setOreganoAddon={setOreganoAddon}
        chiliFlakesAddon={chiliFlakesAddon}
        setChiliFlakesAddon={setChiliFlakesAddon}
        noCutlery={noCutlery}
        setNoCutlery={setNoCutlery}
        showAddonsSection={showAddonsSection}
        isSubmittingOrder={isSubmittingOrder}
        handleDetectLocation={handleDetectLocation}
        distanceKm={distanceKm}
        lastDeliveryAddress={lastDeliveryAddress}
      />

      <SafeUpiPaymentModal 
        isOpen={isUpiPopupOpen}
        isUpiPopupOpen={isUpiPopupOpen}
        open={isUpiPopupOpen}
        show={isUpiPopupOpen}
        onClose={() => setIsUpiPopupOpen(false)}
        close={() => setIsUpiPopupOpen(false)}

        amount={getTotalBillPrice()}
        upiId={upiId}
        onPaymentSuccess={sendWhatsAppOrder}
        paymentScreenshot={paymentScreenshot}
        handleScreenshotChange={handleScreenshotChange}
        isCompressing={isCompressing}
        isHindi={isHindi}
        handleLaunchUpiPay={handleLaunchUpiPay}
      />
    </div>
  );
}

// =========================================================================
// DIVIDED SUB-COMPONENTS (PROPS & MODULAR CODE SEPARATIONS)
// =========================================================================

function ReviewsDrawer({ isOpen, onClose, displayReviews, triggerHaptic, setIsReviewFormOpen }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] overflow-y-auto">
      <div className="p-6 max-w-lg mx-auto pb-32">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white font-mono">All Reviews</h2>
            <p className="text-xs text-yellow-400 font-mono">Rating: 4.8/5.0 ★</p>
          </div>
          <button onClick={() => { triggerHaptic(); onClose(); }} className="p-2.5 bg-white/10 text-white rounded-full"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {displayReviews.map((r: any) => (
            <div key={r.id} className="dark:bg-white/[0.03] bg-white border dark:border-white/5 border-neutral-200 p-5 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs text-orange-600">{r.name}</h4>
                <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded text-[9px]">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  <span className="font-extrabold text-amber-400">{r.rating}</span>
                </div>
              </div>
              <p className="text-[11px] italic text-neutral-600 dark:text-gray-300">"{r.comment}"</p>
            </div>
          ))}
        </div>
        <div className="fixed bottom-6 left-0 w-full px-6 z-50">
          <button onClick={() => { triggerHaptic(); setIsReviewFormOpen(true); }} className="w-full max-w-md mx-auto bg-orange-500 text-black py-3.5 rounded-2xl font-black text-xs uppercase">✍️ Write a Review</button>
        </div>
      </div>
    </div>
  );
}

function ReviewFormModal({ isOpen, onClose, isHindi, reviewName, setReviewName, reviewRating, setReviewRating, reviewComment, setReviewComment, handleReviewSubmit, triggerHaptic }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
      <form onSubmit={handleReviewSubmit} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-xl">
        <div className="flex justify-between items-center pb-2 border-b dark:border-white/10 border-neutral-200">
          <h3 className="text-xl font-black text-orange-500 uppercase italic">{isHindi ? "आपकी समीक्षा" : "Your Feedback"}</h3>
          <button type="button" onClick={() => { triggerHaptic(); onClose(); }} className="p-2 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-full"><X size={18} /></button>
        </div>
        <div className="space-y-3 text-left">
          <div>
            <label className="text-[9px] font-black uppercase text-neutral-400">{isHindi ? "आपका नाम" : "Your Name"}</label>
            <input type="text" placeholder={isHindi ? "नाम दर्ज करें..." : "Enter your name..."} value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-lg text-xs outline-none" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-neutral-400">Rating</label>
            <div className="flex gap-1 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} size={20} className="cursor-pointer" style={{ color: '#fbbf24', fill: reviewRating >= star ? '#fbbf24' : 'none' }} onClick={() => setReviewRating(star)} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-neutral-400">Suggestions</label>
            <div className="flex flex-wrap gap-1.5 py-1">
              {SUGGESTED_REVIEWS.map((suggestion: string) => (
                <button type="button" key={suggestion} onClick={() => setReviewComment(suggestion)} className="dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 px-2 py-1 rounded-full text-[9px] font-bold">{suggestion}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-neutral-400">Comments</label>
            <textarea placeholder="Comments..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-lg text-xs outline-none resize-none" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" className="flex-1 bg-orange-500 text-black font-black p-3 rounded-lg text-xs uppercase">{isHindi ? "जमा करें" : "SUBMIT"}</button>
          <button type="button" onClick={() => { triggerHaptic(); onClose(); }} className="dark:bg-white/5 bg-neutral-100 text-neutral-800 p-3 rounded-lg text-xs uppercase">CANCEL</button>
        </div>
      </form>
    </div>
  );
}

function PizzaCustomizationModal({ selectedProduct, isHindi, normalPizzaSize, setNormalPizzaSize, setNormalPizzaPrice, normalPizzaAddons, setNormalPizzaAddons, PIZZA_ADDONS, chefNote, setChefNote, quickAppendInstruction, handleNormalPizzaAdd, setSelectedProduct }: any) {
  if (!selectedProduct) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex items-end">
      <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="dark:bg-[#111] bg-white w-full p-6 rounded-t-3xl border-t dark:border-white/10 border-neutral-200 max-w-lg mx-auto overflow-y-auto max-h-[95vh] shadow-2xl">
        <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
        <h3 className="text-xl font-black text-center">{selectedProduct?.name}</h3>
        <p className="text-orange-500 font-black mb-4 uppercase text-[8px] text-center">{isHindi ? "ऑर्डर कस्टमाइज़ करें" : "Customize Your Order"}</p>
        <div className="space-y-3 mb-4">
          <p className="text-[10px] font-bold text-neutral-400 uppercase">1. Size:</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
              <button type="button" key={size} onClick={() => { setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} className={`p-3 rounded-xl flex flex-col items-center border transition-all ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-600 font-black shadow-sm' : 'dark:bg-white/[0.03] bg-neutral-50 dark:border-white/5 border-neutral-300 dark:text-gray-400'}`}>
                <span className="capitalize text-xs font-black">{size}</span>
                <span className="font-extrabold text-[10px] mt-1 font-mono">₹{price}</span>
              </button>
            ))}
          </div>
        </div>
        {normalPizzaSize && (selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
          <div className="space-y-3 mb-4 border-t border-neutral-800 pt-3">
            <p className="text-[10px] font-bold text-neutral-400 uppercase">2. Select Add-ons:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]: any) => {
                const isSelected = !!normalPizzaAddons[addon];
                return (
                  <button type="button" key={addon} onClick={() => setNormalPizzaAddons((prev: any) => ({ ...prev, [addon]: !prev[addon] }))} className={`p-2.5 rounded-xl border flex justify-between items-center text-[9px] font-bold ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300 dark:bg-white/[0.02] bg-neutral-50 dark:text-gray-300'}`}>
                    <span>{addon}</span>
                    <span className="text-orange-500 font-black font-mono">+₹{cost}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-2 mb-6 border-t border-neutral-800 pt-3">
          <p className="text-[10px] font-bold text-neutral-400 uppercase">Instructions:</p>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {QUICK_INSTRUCTION_TAGS.map((tag: any) => (
              <button type="button" key={tag} onClick={() => quickAppendInstruction(tag, "normal")} className="text-[9px] font-bold py-1 px-2 rounded-full border dark:border-white/5 border-neutral-300 bg-neutral-100 dark:bg-neutral-800">{tag}</button>
            ))}
          </div>
          <textarea placeholder="e.g. Extra spicy, soft crust etc..." value={chefNote} onChange={(e) => setChefNote(e.target.value)} className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-neutral-50 border dark:border-white/5 border-neutral-300 outline-none focus:border-orange-500 h-16 resize-none" />
        </div>
        <button type="button" onClick={handleNormalPizzaAdd} className="w-full bg-orange-500 text-black p-4 rounded-xl font-black text-xs uppercase">{isHindi ? "कर्ट में जोड़ें" : "Confirm Add"}</button>
        <button type="button" onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setChefNote(""); }} className="w-full mt-3 text-neutral-400 font-black text-[10px] text-center uppercase">Close</button>
      </motion.div>
    </div>
  );
}

function InstallGuideModal({ isOpen, onClose, isHindi, triggerHaptic }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[270] flex items-center justify-center p-6">
      <div className="dark:bg-[#111] bg-white w-full max-w-sm p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-2xl">
        <Sparkles className="mx-auto text-yellow-400 animate-bounce" size={32} />
        <div>
          <h3 className="text-base font-black">📲 आसान इंस्टॉलेशन गाइड</h3>
          <p className="text-[10px] text-neutral-400 font-bold leading-normal">होम स्क्रीन पर जोड़ने के लिए आसान निर्देश:</p>
        </div>
        <div className="text-left text-xs space-y-3 border-y border-neutral-800 py-4 font-bold">
          <p className="flex items-start gap-2"><span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">1</span><span>Chrome ब्राउज़र में ऊपर दाईं ओर **(⋮) डॉट्स** पर क्लिक करें।</span></p>
          <p className="flex items-start gap-2"><span className="bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">2</span><span>लिस्ट में **'Install app'** या **'Add to Home screen'** चुनें।</span></p>
        </div>
        <button type="button" onClick={() => { triggerHaptic(); onClose(); }} className="w-full bg-orange-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow">समझ गया</button>
      </div>
    </div>
  );
}

function GiftPointsModal({ isOpen, onClose, isHindi, giftPhone, setGiftPhone, giftPointsAmount, setGiftPointsAmount, giftSenderPin, setGiftSenderPin, customerPoints, isGiftingLoading, handleGiftPoints, triggerHaptic }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6">
      <form onSubmit={handleGiftPoints} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4">
        <Gift className="mx-auto text-yellow-400" size={32} />
        <h3 className="text-lg font-black text-yellow-400 uppercase italic">Gift Loyalty Points</h3>
        <div className="space-y-3 text-left">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-neutral-400">Friend's Phone Number</label>
            <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} required className="w-full dark:bg-white/10 bg-neutral-50 p-3 rounded-xl text-xs font-bold outline-none text-center" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-neutral-400">Points (Your Pts: {customerPoints})</label>
            <input type="number" placeholder="e.g. 10" value={giftPointsAmount} onChange={(e) => setGiftPointsAmount(e.target.value === "" ? "" : Number(e.target.value))} required className="w-full dark:bg-white/10 bg-neutral-50 p-3 rounded-xl text-xs font-bold outline-none text-center" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-neutral-400 flex items-center gap-1"><Lock size={10}/> <span>Your Security PIN (सुरक्षा पिन)</span></label>
            <input type="password" maxLength={4} placeholder="🔒 enter pin" value={giftSenderPin} onChange={(e) => setGiftSenderPin(e.target.value)} required className="w-full dark:bg-white/10 bg-neutral-50 p-3 rounded-xl text-xs font-bold outline-none text-center font-mono tracking-widest" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={isGiftingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1">
            {isGiftingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Gift Points 🎁</span>}
          </button>
          <button type="button" onClick={() => { triggerHaptic(); onClose(); }} className="bg-neutral-100 dark:bg-white/5 dark:text-gray-400 font-bold p-3 rounded-xl text-xs">CANCEL</button>
        </div>
      </form>
    </div>
  );
}

function SocialClaimModal({ isOpen, onClose, isHindi, claimingPlatform, claimUsername, setClaimUsername, isClaimingLoading, handleClaimSubmit, triggerHaptic }: any) {
  if (!isOpen || !claimingPlatform) return null;
  return (
    <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6">
      <form onSubmit={handleClaimSubmit} className="dark:bg-[#111] bg-white w-full max-w-sm p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4">
        <img src={claimingPlatform.icon} className="w-10 h-10 object-contain mx-auto" alt="" />
        <h3 className="text-base font-black text-orange-500 uppercase">वेरिफिकेशन दावा सबमिट करें</h3>
        <p className="text-[10px] text-neutral-400 font-semibold leading-normal">
          फॉलो करने के बाद, नीचे अपना यूज़रनेम दर्ज करें। हमारे एडमिन इसकी जांच करके आपका {claimingPlatform.points} पॉइंट क्रेडिट करेंगे!
        </p>
        <input type="text" placeholder="e.g. @yourname" value={claimUsername} onChange={(e) => setClaimUsername(e.target.value)} required className="w-full dark:bg-white/10 bg-neutral-50 p-3 rounded-xl text-xs font-bold outline-none text-center" />
        <div className="flex gap-2">
          <button type="submit" disabled={isClaimingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase">
            {isClaimingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Claim Reward Request ➔</span>}
          </button>
          <button type="button" onClick={() => { triggerHaptic(); onClose(); }} className="bg-neutral-100 dark:bg-white/5 p-3 rounded-xl font-black text-xs uppercase">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function ProfileDrawer({ isOpen, onClose, isHindi, customerDetails, setCustomerDetails, tempName, setTempNameState, tempPhone, setTempPhoneState, tempPin, setTempPinState, tempRefCode, setTempRefCode, handleSaveDetails, ecoCutlerySaves, customerPoints, getCustomerTier, loyaltyRules, pointsHistory, shareCount, handleShareApp, setIsGiftModalOpen, setClaimingPlatform, setIsClaimModalOpen, cart, handleCustomerRedeem, pastOrders, formatBillNumber, whatsappNumber, triggerHaptic }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[115] flex items-end">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-neutral-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200">
        <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black dark:text-white text-neutral-900 font-mono">{isHindi ? "मेरा खाता और लॉयल्टी" : "My Account & Loyalty"}</h2>
          <button onClick={() => { triggerHaptic(); onClose(); }} className="p-2.5 bg-neutral-100 dark:bg-white/5 rounded-full"><X size={20} /></button>
        </div>

        {!customerDetails ? (
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="text-center space-y-1.5 pb-2">
              <User className="mx-auto text-orange-500" size={32} />
              <h3 className="text-sm font-black">{isHindi ? "प्रोफाइल सेटअप करें" : "Set Up Profile"}</h3>
            </div>
            <div className="space-y-3 text-left">
              <input type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempNameState(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 p-3 rounded-xl font-bold text-xs outline-none" required />
              <input type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhoneState(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 p-3 rounded-xl font-bold text-xs outline-none" required />
              <input type="password" maxLength={4} placeholder="Create 4-Digit Security PIN" value={tempPin} onChange={(e) => setTempPinState(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 p-3 rounded-xl font-bold text-xs outline-none text-center tracking-widest font-mono" required />
              <input type="text" placeholder="Referral Code (Optional)" value={tempRefCode} onChange={(e) => setTempRefCode(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 p-3 rounded-xl font-bold text-xs outline-none" />
            </div>
            <button type="submit" className="w-full bg-orange-500 text-black p-3.5 rounded-xl font-black text-xs uppercase shadow transition-all">Create Account ➔</button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 flex justify-between items-center">
              <div>
                <p className="text-[8px] dark:text-gray-400 text-neutral-600 font-black uppercase">Customer Profile</p>
                <h4 className="font-black text-base text-orange-500">{customerDetails.name}</h4>
                <p className="text-xs dark:text-gray-400 text-neutral-700 font-semibold font-mono">{customerDetails.phone}</p>
              </div>
              <button onClick={() => { triggerHaptic(); localStorage.removeItem('bb_cafe_customer'); setCustomerDetails(null); }} className="text-[9px] bg-red-500/10 text-red-500 px-3 py-2 rounded-lg font-black uppercase flex items-center gap-1">
                <LogOut size={12}/> Logout
              </button>
            </div>

            {/* Eco impact */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-wider text-emerald-500 font-black">Eco Impact Tracker</p>
                <h4 className="text-xs font-black">You Saved: <span className="text-emerald-500 text-sm font-black">{ecoCutlerySaves} Cutlery 🌳</span></h4>
              </div>
              {ecoCutlerySaves >= 3 && <span className="bg-emerald-500 text-black px-3 py-1 rounded-full text-[9px] font-black">Eco-Hero 🍃</span>}
            </div>

            {/* Loyalty Ledger */}
            <div className="dark:bg-yellow-400/5 bg-yellow-100 border border-yellow-300 dark:border-yellow-400/20 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-yellow-500/20 pb-2">
                <span className="text-yellow-600 font-black text-xs uppercase">Bum Bum Loyalty Club</span>
                <span className="text-[8px] font-black border px-2 py-0.5 rounded-full border-yellow-500/30">
                  {getCustomerTier(customerPoints).name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <h4 className="text-2xl font-black font-mono">{customerPoints} <span className="text-[9px] text-neutral-500">Points</span></h4>
                <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(true); }} className="bg-yellow-500/10 text-yellow-600 border border-yellow-400/20 px-2.5 py-1 rounded text-[8px] font-black uppercase">🎁 Gift Points</button>
              </div>

              {pointsHistory.length > 0 && (
                <div className="pt-2 border-t dark:border-neutral-800 space-y-2">
                  <p className="text-[9px] font-black uppercase text-neutral-400">Passbook Ledger:</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {pointsHistory.map((h: any) => (
                      <div key={h.id} className="flex justify-between text-[10px] bg-black/20 p-2 rounded">
                        <span>{h.description}</span>
                        <span className={h.type === 'earn' ? 'text-green-500' : 'text-red-500'}>{h.type === 'earn' ? '+' : '-'}{h.points} Pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" onClick={handleShareApp} className="w-full bg-green-600 text-white font-black py-2 rounded-xl text-[10px] mt-2">Share & Earn Free Points! 🎁</button>

              <div className="pt-2 border-t dark:border-neutral-800 space-y-1.5">
                <p className="text-[9px] font-black uppercase text-neutral-400">Follow to Earn points:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SOCIAL_LINKS.map((link: any) => (
                    <button key={link.id} type="button" onClick={() => { triggerHaptic(); setClaimingPlatform(link); setIsClaimModalOpen(true); window.open(link.url, '_blank'); }} className="flex items-center gap-1 bg-white/5 border dark:border-white/10 px-2 py-1 rounded-full text-[9px] font-bold">
                      <img src={link.icon} className="w-3 h-3 object-contain" alt="" />
                      <span>{link.label.split(' ')[1]} (+{link.points} P)</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t dark:border-neutral-800 space-y-1.5">
                <p className="text-[9px] font-black uppercase text-neutral-400">Redeem Points:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {loyaltyRules.map((rule: any) => {
                    const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                    const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                    return (
                      <button key={rule.id} type="button" onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)} disabled={!isAffordable} className={`py-1.5 px-2 rounded text-[9px] font-black uppercase border truncate ${isAffordable ? 'bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-500' : 'bg-white/5 text-neutral-400 border-white/5 cursor-not-allowed'}`}>🎁 {rule.rewardName} ({rule.pointsCost} P)</button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="space-y-4 pt-4 border-t dark:border-neutral-800">
              <h3 className="text-sm font-black uppercase flex items-center gap-1.5"><History size={16} className="text-orange-500" />Order History</h3>
              {pastOrders.length > 0 ? (
                <div className="space-y-4">
                  {pastOrders.map((ord: any, index: number) => (
                    <div key={index} className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 border-neutral-200 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between text-xs border-b pb-1 font-mono">
                        <span className="font-black text-orange-500">Bill: #{formatBillNumber(ord.billNumber || 0)}</span>
                        <span className="bg-green-600/10 text-green-600 px-2 py-0.5 rounded text-[9px]">Token: #{ord.tokenNumber || "N/A"}</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {ord.items.map((it: any, i: number) => <div key={i} className="flex justify-between"><span>{it.name} x{it.quantity}</span><span>₹{it.price * it.quantity}</span></div>)}
                      </div>
                      <div className="border-t pt-2 flex justify-between items-center text-xs font-black"><span>Total paid:</span><span className="text-sm text-green-500">₹{ord.total}</span></div>
                      <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(ord.billNumber)} का लाइव स्टेटस बताएं।`)}`} target="_blank" rel="noreferrer" className="w-full bg-orange-500/10 text-orange-600 text-center text-[10px] font-black py-2 rounded-xl block border border-orange-500/20">Track Live Status 🔍</a>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-neutral-500 py-6 text-[10px] font-bold uppercase">No orders found...</p>}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
