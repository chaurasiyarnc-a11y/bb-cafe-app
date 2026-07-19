 

'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment, runTransaction, getDoc, getDocs, where, limit, orderBy } from 'firebase/firestore';
import { ShoppingBag, Plus, Search, X, MapPin, Phone, User, Sparkles, Star, Percent, Gift, Loader2, Share2, Heart, Clock, ChevronRight, WifiOff, History, LogOut, Lock, Video, Award, Check, Play, Navigation, Globe } from 'lucide-react';
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

export default function BbCafeHome() {
  const store = useCartStore() as any;
  const cart = store?.items || [];
  const addItem = store?.addItem || (() => {});
  const removeItem = store?.removeItem || (() => {});
  const clearCart = store?.clearCart || (() => {});

  const menuRef = useRef<HTMLDivElement | null>(null);

  // --- STATE VARIABLES ---
  const [menu, setMenu] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('bb_cached_menu');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
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
  const [upiId, setUpiId] = useState("9714293759@paytm");
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

  // Fulfillment and payment
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup" | "table">("delivery");
  const [tableNumber, setTableNumber] = useState("Table 1"); 
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");

  // Changed Language Default to ENGLISH (false) as requested [1]
  const [isHindi, setIsHindi] = useState(false);
  const [customerPoints, setCustomerPoints] = useState<number>(0);

  // Social follow counts initialization with local cache fallback [1]
  const [socialCounts, setSocialCounts] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('bb_cached_social_counts');
      return cached ? JSON.parse(cached) : {
        facebook: "500+ Followers",
        instagram: "1.2K+ Followers",
        whatsapp_channel: "1K+ Channel Members",
        snapchat: "200+ Subs",
        youtube: "1.5K+ Subs"
      };
    }
    return {
      facebook: "500+ Followers",
      instagram: "1.2K+ Followers",
      whatsapp_channel: "1K+ Channel Members",
      snapchat: "200+ Subs",
      youtube: "1.5K+ Subs"
    };
  });
  
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('bb_cached_loyalty_rules');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });

  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftPhone, setGiftPhone] = useState("");
  const [giftPointsAmount, setGiftPointsAmount] = useState<number | "">("");
  const [giftSenderPin, setGiftSenderPin] = useState(""); 
  const [isGiftingLoading, setIsGiftingLoading] = useState(false);

  const [dbCategories, setDbCategories] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('bb_cached_categories');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  
  const [banners, setBanners] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('bb_cached_banners');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerError, setBannerError] = useState(false);
  
  const [reviews, setReviews] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('bb_cached_reviews');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  
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

  // DIY PIZZA STATES
  const [diySize, setDiySize] = useState<string>("small"); 
  const [diySauce, setDiySauce] = useState<boolean>(true); 
  const [diyMozzarella, setDiyMozzarella] = useState<boolean>(true); 
  const [diyVegSelection, setDiyVegSelection] = useState<{ [veg: string]: boolean }>({ onion: false, tomato: false, capsicum: false, corn: false });
  const [diyPremiumToppings, setDiyPremiumToppings] = useState<{ [top: string]: boolean }>({ black_olive: false, jalapeno: false, red_peprica: false, paneer: false, mushroom: false });
  const [diyChefNote, setDiyChefNote] = useState<string>("");

  // Reels/Stories States
  const [stories, setStories] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('bb_cached_reels');
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [activeStory, setActiveStory] = useState<any | null>(null);

  // Social Proof Alerts States
  const [socialProofs, setSocialProofs] = useState<any[]>([]);
  const [socialAlertIndex, setSocialAlertIndex] = useState(0);
  const [showSocialAlert, setShowSocialAlert] = useState(false);

  // Social Media Point Claims States
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
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [shareCount, setShareCount] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // UPI Payment states
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUpiPopupOpen, setIsUpiPopupOpen] = useState(false);

  // UI States
  const [showGreeting, setShowGreeting] = useState(true);

  // --- HELPERS, CALCULATIONS & GENERAL UTILS (Declared sequentially for safe scope compile) ---

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
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.includes('/video') || cleanUrl.includes('video');
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

  const getFreeDeliveryProgressPercent = () => {
    const subtotal = getCartSubtotal();
    const limit = selectedArea.minFree;
    if (subtotal >= limit) return 100;
    return (subtotal / limit) * 100;
  };

  const getCustomerTier = (points: number) => {
    if (points >= 50) return { name: "Platinum Member 👑", color: "text-cyan-700 border-cyan-500/40 bg-cyan-100/50 dark:text-cyan-400 dark:border-cyan-400/30 dark:bg-cyan-400/10" };
    if (points >= 20) return { name: "Gold Member 🌟", color: "text-yellow-800 border-yellow-500/40 bg-yellow-100/50 dark:text-yellow-400 dark:border-yellow-400/30 dark:bg-yellow-400/10" };
    return { name: "Bronze Member 🥉", color: "text-orange-700 border-orange-500/40 bg-orange-100/50 dark:text-orange-400 dark:border-orange-400/30 dark:bg-orange-400/10" };
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
      return found.image || found.imageUrl || found.coverUrl || found.cover || found.url || CATEGORY_IMAGES[catName] || CATEGORY_IMAGES[found.name] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
    }
    return CATEGORY_IMAGES[catName] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
  };

  const getReferralCode = () => {
    if (!customerDetails) return "WELCOME";
    const namePart = customerDetails.name.trim().split(" ")[0].substring(0, 4).toUpperCase();
    const phonePart = customerDetails.phone.slice(-4);
    return `${namePart}${phonePart}`;
  };

  // --- CALCULATION MEMOS ---

  const ecoCutlerySaves = useMemo(() => {
    return pastOrders.filter(o => o.noCutlery === true).length;
  }, [pastOrders]);

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

  const greetingText = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    
    let timeGreeting = "Namaste";
    if (hours >= 5 && hours < 12) {
      timeGreeting = "Good Morning ☀️";
    } else if (hours >= 12 && hours < 17) {
      timeGreeting = "Good Afternoon 🌤️";
    } else if (hours >= 17 && hours < 22) {
      timeGreeting = "Good Evening 🌆";
    } else {
      timeGreeting = "Good Night 🌙";
    }

    const customerName = customerDetails?.name ? customerDetails.name : "";
    if (customerName) {
      return `Namaste ${customerName} ji, ${timeGreeting}! What can Bum Bum Cafe make for you today? 😊`;
    } else {
      return `Namaste, ${timeGreeting}! What can Bum Bum Cafe make for you today? 😊`;
    }
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
      const itemCategory = item?.category ? String(item.category) : "";
      
      const isFavoriteFilter = selectedCategory === "Favorites";
      const itemCatClean = itemCategory.toLowerCase().trim();
      const selectedCatClean = selectedCategory.toLowerCase().trim();
      
      const matchesCategory = isFavoriteFilter 
        ? favorites.includes(item.id) 
        : (selectedCatClean === "all" || itemCatClean === selectedCatClean);
        
      const matchesSearch = searchWords.every(word => itemName.includes(word));
      return matchesCategory && matchesSearch;
    });
  }, [deduplicatedMenu, selectedCategory, favorites, debouncedSearchQuery]);

  const visibleCategories = useMemo(() => {
    const dbCatsMap = new Map();
    dbCategories.forEach(c => {
      if (c && c.name) {
        dbCatsMap.set(String(c.name).toLowerCase().trim(), c);
      }
    });

    const result: string[] = [];

    FALLBACK_CATEGORIES.forEach(catName => {
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

    dbCategories.forEach(c => {
      if (c && c.name && c.isVisible !== false) {
        const cleanName = String(c.name).toLowerCase().trim();
        const isFallback = FALLBACK_CATEGORIES.some(f => f.toLowerCase().trim() === cleanName);
        if (!isFallback && cleanName !== "all" && cleanName !== "diy pizza") {
          result.push(c.name);
        }
      }
    });

    const listWithoutSpecial = result.filter(c => c !== "All" && c !== "DIY Pizza");
    const finalized = ["All", "DIY Pizza", ...listWithoutSpecial];

    return Array.from(new Set(finalized));
  }, [dbCategories]);

  const upsellSuggestionItems = useMemo(() => {
    return menu.filter(item => {
      const isShake = item?.category === "Super Cool" || item?.category === "Fast Food";
      const notInCart = !cart.some((c: any) => c.id === item.id);
      return isShake && notInCart;
    }).slice(0, 2);
  }, [menu, cart]);

  const lastDeliveryAddress = useMemo(() => {
    const found = pastOrders.find(o => o.fulfillmentType === "delivery" && o.address);
    return found ? found.address : "";
  }, [pastOrders]);

  const displayReviews = useMemo(() => {
    return reviews.length > 0 ? reviews : PERMANENT_REVIEWS;
  }, [reviews]);

  const hasManyReviews = useMemo(() => {
    return displayReviews.length > 10;
  }, [displayReviews]);

  // --- Dynamic add-ons display verification based on eligible dishes ---
  const showAddonsSection = useMemo(() => {
    const eligibleKeywords = ['pizza', 'sandwich', 'burger', 'momo', 'fries', 'chips', 'finger'];
    return cart.some((item: any) => {
      const nameLower = (item.name || '').toLowerCase();
      return eligibleKeywords.some(keyword => nameLower.includes(keyword));
    });
  }, [cart]);

  // --- Optimized UPI Redirection Link Scheme to Prevent Mobile Safari/Chrome popup blocks ---
  const handleLaunchUpiPay = (platform: string) => {
    triggerHaptic();
    const amount = getTotalBillPrice();
    const merchantName = "Bum Bum Cafe";
    const transactionNote = `BumBumCafe Order`;
    
    const standardUpi = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    
    if (platform === 'phonepe') {
      window.location.href = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    } else if (platform === 'paytm') {
      window.location.href = `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    } else if (platform === 'gpay') {
      window.location.href = `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    } else {
      window.location.href = standardUpi;
    }
  };

  // --- EVENT HANDLERS ---

  const scrollToMenu = () => {
    triggerHaptic();
    menuRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const quickAppendInstruction = (tag: string, type: "diy" | "normal") => {
    triggerHaptic(20);
    if (type === "diy") {
      setDiyChefNote(prev => prev ? `${prev}, ${tag}` : tag);
    } else {
      setChefNote(prev => prev ? `${prev}, ${tag}` : tag);
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('bb_favorites', JSON.stringify(next));
      return next;
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!reviewName || !reviewComment) {
      toast.error(isHindi ? "सभी फ़ील्ड भरें!" : "Please fill all fields!");
      return;
    }
    const toastId = toast.loading(isHindi ? "समीक्षा सबमिट की जा रही है..." : "Submitting review...");
    try {
      await addDoc(collection(db, "reviews"), {
        name: reviewName,
        comment: reviewComment,
        rating: reviewRating,
        isApproved: false,
        timestamp: new Date()
      });
      toast.dismiss(toastId);
      toast.success(isHindi ? "समीक्षा सबमिट हो गई! वेरिफिकेशन के बाद दिखेगी।" : "Review submitted successfully! Post approval it will be shown.");
      setReviewName("");
      setReviewComment("");
      setReviewRating(5);
      setIsReviewFormOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(isHindi ? "त्रुटि! कृपया दोबारा प्रयास करें।" : "Error! Please try again.");
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!tempName || !tempPhone || tempPhone.length !== 10 || !tempPin || tempPin.length !== 4) {
      toast.error(isHindi ? "कृपया सभी सही विवरण दर्ज करें!" : "Please enter correct details!");
      return;
    }
    const phoneClean = tempPhone.trim();
    const formattedPhone = `+91${phoneClean}`;
    
    const customerObj = {
      name: tempName.trim(),
      phone: formattedPhone,
      pin: tempPin,
      refCode: tempRefCode.trim() || undefined
    };
    
    const toastId = toast.loading(isHindi ? "प्रोफाइल सहेज रहा है..." : "Saving profile...");
    try {
      const userDocRef = doc(db, "customer_points", phoneClean);
      const userSnap = await getDoc(userDocRef);
      
      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          name: customerObj.name,
          phone: phoneClean,
          pin: customerObj.pin,
          points: tempRefCode ? 5 : 0, 
          lastActive: new Date()
        });
      } else {
        await setDoc(userDocRef, {
          name: customerObj.name,
          pin: customerObj.pin,
          lastActive: new Date()
        }, { merge: true });
      }
      
      localStorage.setItem('bb_cafe_customer', JSON.stringify(customerObj));
      setCustomerDetails(customerObj);
      setIsProfileOpen(false);
      toast.dismiss(toastId);
      toast.success(isHindi ? "प्रोफ़ाइल सफलतापूर्वक सहेजी गई!" : "Profile saved successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(isHindi ? "प्रोफाइल सहेजने में त्रुटि आई!" : "Error saving profile!");
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!customerDetails?.phone) {
      toast.error(isHindi ? "कृपया पहले अपनी प्रोफाइल कस्टमाइज़ करें!" : "Please set up your profile first!");
      return;
    }
    if (!claimUsername) {
      toast.error(isHindi ? "यूज़रनेम दर्ज करें!" : "Please enter username!");
      return;
    }
    setIsClaimingLoading(true);
    try {
      await addDoc(collection(db, "point_claims"), {
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        platform: claimingPlatform.id,
        username: claimUsername,
        pointsToEarn: claimingPlatform.points,
        status: 'pending',
        timestamp: new Date()
      });
      toast.success(isHindi ? "दावा सबमिट किया गया! वेरिफिकेशन के बाद पॉइंट्स मिलेंगे।" : "Claim request submitted! Points will be added after verification.");
      setClaimUsername("");
      setIsClaimModalOpen(false);
    } catch (err) {
      toast.error("Claim failed. Try again.");
    } finally {
      setIsClaimingLoading(false);
    }
  };

  const handleDismissInstallBanner = () => {
    triggerHaptic();
    setShowInstallBanner(false);
    localStorage.setItem('bb_app_installed_or_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    triggerHaptic();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('bb_app_installed_or_dismissed', 'true');
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const handleApplyCoupon = async () => {
    triggerHaptic();
    if (!enteredCoupon.trim()) {
      toast.error(isHindi ? "कृपया कूपन कोड दर्ज करें!" : "Please enter a coupon code!");
      return;
    }
    const codeUpper = enteredCoupon.trim().toUpperCase();
    const toastId = toast.loading(isHindi ? "कूपन जाँचा जा रहा है..." : "Validating coupon...");
    try {
      const couponRef = doc(db, "coupons", codeUpper);
      const couponSnap = await getDoc(couponRef);
      if (couponSnap.exists()) {
        const data = couponSnap.data();
        const subtotal = getCartSubtotal();
        if (subtotal < (data.minOrder || 0)) {
          toast.dismiss(toastId);
          toast.error(isHindi ? `न्यूनतम ऑर्डर राशि ₹${data.minOrder} होनी चाहिए!` : `Minimum order must be ₹${data.minOrder}!`);
          return;
        }
        setAppliedCoupon({
          code: codeUpper,
          discountValue: data.discount || 0
        });
        toast.dismiss(toastId);
        toast.success(isHindi ? "कूपन सफलतापूर्वक लागू किया गया!" : "Coupon applied successfully!");
      } else {
        toast.dismiss(toastId);
        toast.error(isHindi ? "अमान्य कूपन कोड! यह कूपन मौजूद नहीं है।" : "Invalid coupon code! This coupon does not exist.");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error(isHindi ? "कूपन जांचने में समस्या आई!" : "Error applying coupon!");
    }
  };

  const handleCheckoutClick = () => {
    triggerHaptic();
    if (!customerDetails) {
      setIsProfileOpen(true);
      toast.error(isHindi ? "कृपया पहले अपनी प्रोफाइल कस्टमाइज़ करें!" : "Please set up your profile first!");
      return;
    }
    if (paymentMethod === "upi") {
      setIsUpiPopupOpen(true);
    } else {
      sendWhatsAppOrder();
    }
  };

  const handleGiftPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    
    if (!customerDetails?.phone) {
      toast.error(isHindi ? "कृपया पहले अपनी प्रोफाइल कस्टमाइज़ करें!" : "Please set up your profile first!");
      return;
    }
    
    const senderPhoneClean = customerDetails.phone.replace("+91", "").trim();
    const receiverPhoneClean = giftPhone.trim();
    const pointsToGift = Number(giftPointsAmount);

    if (!receiverPhoneClean || receiverPhoneClean.length !== 10) {
      toast.error(isHindi ? "गिफ्ट प्राप्तकर्ता का नंबर 10 अंकों का होना चाहिए!" : "Friend's number must be 10 digits!");
      return;
    }
    if (senderPhoneClean === receiverPhoneClean) {
      toast.error(isHindi ? "आप स्वयं को पॉइंट्स गिफ्ट नहीं कर सकते!" : "You cannot gift points to yourself!");
      return;
    }
    if (isNaN(pointsToGift) || pointsToGift <= 0) {
      toast.error(isHindi ? "कृपया सही पॉइंट्स संख्या दर्ज करें!" : "Please enter a valid amount of points!");
      return;
    }
    if (customerPoints < pointsToGift) {
      toast.error(isHindi ? "आपके पास पर्याप्त पॉइंट्स उपलब्ध नहीं हैं!" : "You do not have enough points!");
      return;
    }
    if (giftSenderPin !== customerDetails.pin) {
      toast.error(isHindi ? "सुरक्षा पिन गलत है!" : "Invalid security PIN!");
      return;
    }

    setIsGiftingLoading(true);
    const toastId = toast.loading(isHindi ? "पॉइंट्स ट्रांसफर किए जा रहे हैं..." : "Transferring points...");

    try {
      const receiverDocRef = doc(db, "customer_points", receiverPhoneClean);
      const receiverSnap = await getDoc(receiverDocRef);

      if (!receiverSnap.exists()) {
        toast.dismiss(toastId);
        toast.error(isHindi ? "गिफ्ट पाने वाले का नंबर पंजीकृत नहीं है!" : "The receiver's number is not registered!");
        setIsGiftingLoading(false);
        return;
      }

      const senderDocRef = doc(db, "customer_points", senderPhoneClean);

      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(senderDocRef);
        if (!senderSnap.exists()) throw new Error("Sender records not found.");
        
        const currentSenderPoints = senderSnap.data().points || 0;
        if (currentSenderPoints < pointsToGift) throw new Error("Insufficient points balance.");

        transaction.update(senderDocRef, { points: increment(-pointsToGift) });
        transaction.update(receiverDocRef, { points: increment(pointsToGift) });
      });

      await addDoc(collection(db, "customer_points", senderPhoneClean, "history"), {
        type: 'redeem',
        points: pointsToGift,
        description: `Gifted points to ${receiverPhoneClean} 🎁`,
        timestamp: new Date()
      });

      await addDoc(collection(db, "customer_points", receiverPhoneClean, "history"), {
        type: 'earn',
        points: pointsToGift,
        description: `Received points from ${senderPhoneClean} 🎁`,
        timestamp: new Date()
      });

      setCustomerPoints(prev => prev - pointsToGift);
      toast.dismiss(toastId);
      toast.success(isHindi ? "पॉइंट्स गिफ्ट कर दिए गए!" : "Points gifted successfully!");
      
      setIsGiftModalOpen(false);
      setGiftPhone("");
      setGiftPointsAmount("");
      setGiftSenderPin("");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(isHindi ? `स्थानांतरण विफल: ${err.message}` : `Transfer failed: ${err.message}`);
    } finally {
      setIsGiftingLoading(false);
    }
  };

  const sendWhatsAppOrder = async () => {
    triggerHaptic();
    
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    if (!customerDetails) { 
      setIsProfileOpen(true); 
      toast.error("ऑर्डर करने के लिए पहले अपनी प्रोफाइल बनाएं! 👤");
      setIsSubmittingOrder(false);
      return; 
    }

    if (fulfillmentType === "delivery" && (!address || address.trim().length < 10)) {
      setIsSubmittingOrder(false);
      return toast.error("Please enter full address!");
    }

    if (fulfillmentType === "table" && !tableNumber) {
      setIsSubmittingOrder(false);
      return toast.error(isHindi ? "कृपया टेबल चुनें!" : "Please select a table!");
    }

    if (paymentMethod === "upi" && !paymentScreenshot) {
      setIsSubmittingOrder(false);
      return toast.error(isHindi ? "कृपया आगे बढ़ने से पहले यूपीआई भुगतान का स्क्रीनशॉट अपलोड करें!" : "Please upload UPI payment screenshot!");
    }

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const deliveryPin = Math.floor(1000 + Math.random() * 9000);

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
    } catch (e) { 
      billNumber = Math.floor((Date.now() / 1000) % 100000); 
    }

    const formattedBillStr = formatBillNumber(billNumber);
    const subtotal = getCartSubtotal();
    const addOnsCost = getCartAddonsPrice();
    const deliveryCharge = getDeliveryCharge();
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountValue) : 0;
    const finalTotal = getTotalBillPrice();
    
    const pointsEarned = Math.floor(finalTotal / 100);
    const totalPointsCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);

    const orderObj = {
      billNumber, tokenNumber, deliveryPin, customerName: customerDetails.name, customerPhone: customerDetails.phone,
      address: fulfillmentType === "delivery" ? address : `Mode: ${fulfillmentType.toUpperCase()} ${fulfillmentType === 'table' ? `Table: ${tableNumber}` : ''}`, 
      items: cart, subtotal, discount: couponDiscount, total: finalTotal, timestamp: new Date(), status: 'pending',
      deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : fulfillmentType.toUpperCase(), noCutlery, ketchupAddon, oreganoAddon, chiliFlakesAddon,
      fulfillmentType, tableNumber: fulfillmentType === "table" ? tableNumber : "", paymentMethod,
      paymentScreenshot: paymentScreenshot || ""
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
    } catch (e) {
      toast.error("Database sync failed. Kripya dobara try karein.");
      setIsSubmittingOrder(false); 
      return;
    }

    const updatedPastOrders = [orderObj, ...pastOrders];
    setPastOrders(updatedPastOrders);
    localStorage.setItem('bb_past_orders', JSON.stringify(updatedPastOrders));
    setLastPlacedOrder(orderObj);

    let itemsText = "";
    cart.forEach((i: any) => {
      itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`;
      if (i.note) {
        itemsText += `  └─ *Note:* ${i.note}\n`;
      }
    });
    
    if (ketchupAddon) itemsText += `• Extra Tomato Ketchup x1 - ₹10\n`;
    if (oreganoAddon) itemsText += `• Extra Oregano x1 - ₹10\n`;
    if (chiliFlakesAddon) itemsText += `• Extra Chili Flakes x1 - ₹10\n`;
    if (noCutlery) itemsText += `🌱 (Eco-Friendly: No plastic cutlery requested)\n`;

    const refCode = getReferralCode();
    
    const modeLabel = fulfillmentType === "delivery" ? `Delivery (${selectedArea.name})` : fulfillmentType === "pickup" ? "Self-Pickup 🛍️" : `Dine-In (Table: ${tableNumber}) 🍽️`;
    const payModeLabel = paymentMethod === "cod" 
      ? (fulfillmentType === "delivery" ? "Cash on Delivery (COD) 💵" : "Cash at Counter 💵")
      : "UPI Online Payment 📱";

    let msg = `🔥 *BAM BAM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Fulfillment Mode:* ${modeLabel}\n${fulfillmentType === 'delivery' ? `*Address:* ${address}\n` : ''}*Payment Method:* ${payModeLabel}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal + addOnsCost}\n*Coupon Discount:* -₹${couponDiscount}\n${fulfillmentType === 'delivery' ? `*Delivery:* ₹${deliveryCharge}\n` : ''}*TOTAL BILL: ₹${finalTotal}*\n\n🔑 *Delivery PIN:* ${deliveryPin} (Rider ko ye confirm karke hi order le)\n*Invite Code:* ${refCode}\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}`;
    
    if (paymentMethod === "upi") {
      msg += `\n\n📸 *भुगतान स्क्रीनशॉट:* बिल #${formattedBillStr} के साथ डेटाबेस में सफलतापूर्वक सेव कर दिया गया है!`;
    }

    msg += `\n\n_Confirm order by replying 'YES'_`;
    
    playSoundEffect('success');
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 5000);

    try {
      await navigator.clipboard.writeText(msg);
      toast.success(isHindi ? "ऑर्डर विवरण कॉपी कर लिया गया है!" : "Order details copied to clipboard!");
    } catch (err) {}

    if (paymentMethod === "upi") {
      alert(isHindi ? "भुगतान स्क्रीनशॉट डेटाबेस में अपलोड हो गया है! व्हाट्सएप खुलने पर चैट में कृपया स्क्रीनशॉट भी अटैच करके भेजें।" : "Screenshot uploaded to DB! Please attach the screenshot from your gallery in the WhatsApp chat.");
    }

    setTimeout(() => {
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
      clearCart(); 
      setKetchupAddon(false);
      setOreganoAddon(false);
      setChiliFlakesAddon(false);
      setNoCutlery(false);
      setAppliedCoupon(null); 
      setEnteredCoupon(""); 
      setIsCartOpen(false);
      setIsSubmittingOrder(false); 
      setPaymentScreenshot(null);
      setIsUpiPopupOpen(false);
    }, 1500);
  };

  // --- Real-time Watchers for Dynamic Points, Ledger & Order Status only ---
  useEffect(() => {
    if (!customerDetails?.phone) {
      setCustomerPoints(0);
      setPointsHistory([]);
      setLiveOrder(null);
      return;
    }
    
    const phoneClean = customerDetails.phone.replace("+91", "").trim();
    
    const unsubPoints = onSnapshot(doc(db, "customer_points", phoneClean), (snap) => {
      if (snap.exists()) {
        setCustomerPoints(snap.data().points || 0);
      }
    });

    const unsubHistory = onSnapshot(
      query(collection(db, "customer_points", phoneClean, "history"), orderBy("timestamp", "desc")),
      (snap) => {
        setPointsHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubLive = onSnapshot(
      query(
        collection(db, "orders"),
        where("customerPhone", "==", customerDetails.phone),
        orderBy("timestamp", "desc"),
        limit(1)
      ),
      (snap) => {
        if (!snap.empty) {
          const latestOrder = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
          const dismissedRejected = JSON.parse(localStorage.getItem('bb_dismissed_rejected_orders') || '[]');
          if (latestOrder.status !== 'completed' && !dismissedRejected.includes(latestOrder.id)) {
            setLiveOrder(latestOrder);
          } else {
            setLiveOrder(null);
          }
        } else {
          setLiveOrder(null);
        }
      }
    );

    return () => {
      unsubPoints();
      unsubHistory();
      unsubLive();
    };
  }, [customerDetails?.phone]);

  useEffect(() => {
    const fakeProofs = [
      { text: "Ramesh from Mohandra recently ordered Special Thali! 🍛" },
      { text: "Pooja just added Paneer Special Pizza to her cart! 🍕" },
      { text: "5 people are looking at DIY Pizza right now! 🔥" },
      { text: "Amit rated Bum Bum Cafe 5 stars! ⭐⭐⭐⭐⭐" },
      { text: "Sanjay from Mohandra Town just placed an order! 🛵" },
      { text: "Anjali is customizing her DIY Pizza! 🍕" }
    ];
    setSocialProofs(fakeProofs);
    
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * fakeProofs.length);
      setSocialAlertIndex(randomIndex);
      setShowSocialAlert(true);
      setTimeout(() => setShowSocialAlert(false), 5000);
    }, 35500);

    return () => clearInterval(interval);
  }, []);

  // --- INITIAL MOUNT & SWR BACKGROUND DATABASE SYNCHRONIZER (No UI Blocks) ---
  useEffect(() => {
    setMounted(true);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('bb_app_installed_or_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      setIsOnline(window.navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }

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

    const cachedPast = localStorage.getItem('bb_past_orders');
    if (cachedPast) {
      try {
        setPastOrders(JSON.parse(cachedPast));
      } catch (e) {}
    }

    const cachedFavs = localStorage.getItem('bb_favorites');
    if (cachedFavs) {
      try {
        setFavorites(JSON.parse(cachedFavs));
      } catch (e) {}
    }

    // Dynamic SWR Fetchers (One-time getDocs call inside Background Thread)
    const fetchFreshDbData = async () => {
      try {
        // 1. Fetch settings
        const storeSnap = await getDoc(doc(db, "settings", "store"));
        if (storeSnap.exists()) {
          const storeData = storeSnap.data();
          setStoreOpen(storeData.isOpen);
          setIsBannerEnabled(storeData.isBannerEnabled ?? storeData.showPromoBanner ?? true);
          setIsInlineBannerEnabled(storeData.isInlineBannerEnabled ?? storeData.showInlinePromo ?? true);
          if (storeData.whatsappNumber) setWhatsappNumber(storeData.whatsappNumber);
          if (storeData.upiId) setUpiId(storeData.upiId);
          if (storeData.latitude && storeData.longitude) {
            setStoreCoordinates({ lat: Number(storeData.latitude), lng: Number(storeData.longitude) });
          }
          if (storeData.timingHindi) setStoreTimingHindi(storeData.timingHindi);
          if (storeData.timingEnglish) setStoreTimingEnglish(storeData.timingEnglish);
        }

        // 2. Fetch products
        const productsSnap = await getDocs(collection(db, "products"));
        const items = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.isVisible !== false);
        setMenu(shuffleArray(items));
        localStorage.setItem('bb_cached_menu', JSON.stringify(items));

        // 3. Fetch categories
        const catsSnap = await getDocs(collection(db, "categories"));
        const cats = catsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDbCategories(cats);
        localStorage.setItem('bb_cached_categories', JSON.stringify(cats));

        // 4. Fetch banners
        const bannersSnap = await getDocs(collection(db, "banners"));
        const banData = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBanners(banData);
        localStorage.setItem('bb_cached_banners', JSON.stringify(banData));

        // 5. Fetch reels
        const reelsSnap = await getDocs(collection(db, "reels"));
        const reelData = reelsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStories(reelData);
        localStorage.setItem('bb_cached_reels', JSON.stringify(reelData));

        // 6. Fetch reviews
        const revsSnap = await getDocs(collection(db, "reviews"));
        const revData = revsSnap.docs.map(d => ({ id: d.id, ...d.data() as any })).filter((r: any) => r.isApproved === true || r.isApproved === "approved" || r.approved === true);
        setReviews(revData);
        localStorage.setItem('bb_cached_reviews', JSON.stringify(revData));

        // 7. Fetch loyalty rules
        const rulesSnap = await getDocs(collection(db, "loyalty_rules"));
        const ruleData = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLoyaltyRules(ruleData);
        localStorage.setItem('bb_cached_loyalty_rules', JSON.stringify(ruleData));

        // 8. Fetch dynamic follower counts [1]
        const socialSnap = await getDoc(doc(db, "settings", "social_counts"));
        if (socialSnap.exists()) {
          const data = socialSnap.data();
          setSocialCounts(data);
          localStorage.setItem('bb_cached_social_counts', JSON.stringify(data));
        }

      } catch (err) {
        console.warn("Background fetch warning (Offline Mode Active):", err);
      }
    };

    fetchFreshDbData();

    return () => { 
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      }
    };
  }, []);

  return (
    <div className="dark:bg-[#050505] bg-neutral-50 min-h-screen dark:text-white text-neutral-800 pb-32 font-sans relative overflow-x-clip transition-colors duration-200">
      
      <link rel="manifest" href="/manifest.json" />

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
          <span>आर्डर चेतावनी:  बम बम कैफ़े अगले {closingMinutesLeft} minute में बंद होने वाला है!  आर्डर जल्दी पूरा करें।</span>
        </div>
      )}

      {/* Social Proof Toast Alert */}
      <AnimatePresence>
        {showSocialAlert && socialProofs.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-black/90 backdrop-blur-md border border-orange-500/30 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 max-w-[90%] text-center"
          >
            <span className="text-sm">🔥</span>
            <span className="text-[10px] font-black tracking-wide truncate text-white">{socialProofs[socialAlertIndex]?.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
          {Array.from({ length: 105 }).map((_, i) => (
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

      {/* Sticky Right Side Review Tab */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <button 
          onClick={() => { triggerHaptic(); setIsReviewFormOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] py-3 px-1.5 rounded-l-xl shadow-2xl border-l border-y border-white/20 flex flex-col items-center gap-1 transition-all active:translate-x-1"
          style={{ writingMode: 'vertical-rl' }}
        >
          <span className="uppercase tracking-wider font-bold">{isHindi ? "समीक्षा" : "Reviews"}</span>
        </button>
      </div>

      {/* PREMIUM HERO HEADER (Plain background without image) */}
      <header className="relative pt-6 pb-4 px-4 overflow-hidden shadow-md flex flex-col justify-end min-h-[120px] bg-neutral-950 border-b dark:border-white/5 border-neutral-200">
        <div className="relative z-20 max-w-[85%] mt-auto bg-black/40 backdrop-blur-sm p-2.5 rounded-xl border border-white/10 shadow-md">
          <motion.div
            initial={{ x: -25, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-0.5"
          >
            <h1 className="text-base font-black tracking-wide text-yellow-300 font-sans drop-shadow block leading-none mb-1">
              {isHindi ? "बम बम कैफ़े" : "Bum Bum Cafe"}
            </h1>
            <p className="text-[9px] text-gray-300 font-bold">
              {isHindi ? "पिज्जा, स्पेशल सैंडविच और पनीर डिलाइट्स तुरंत आदेश करें!" : "Order Pizza, Special Sandwich & Paneer Delights instantly!"}
            </p>
          </motion.div>
          <button 
            onClick={scrollToMenu}
            className="mt-1 bg-orange-600 hover:bg-orange-700 text-white font-black text-[7px] px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-md transition-all active:scale-95"
          >
            {isHindi ? "ऑर्डर करें" : "Order Now"}
          </button>
        </div>
      </header>

      {/* FIXED STICKY SEARCH BAR */}
      <div className="sticky top-0 z-40 dark:bg-[#050505]/95 bg-white/95 backdrop-blur-md py-3 px-4 border-b dark:border-white/5 border-neutral-300 transition-colors duration-200 shadow-sm">
        <div className="relative max-w-sm mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={isHindi ? "पिज़्ज़ा, सैंडविच, पनीर स्पेशल खोजें..." : "Search pizza, sandwich, paneer special..."} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full dark:bg-neutral-800 bg-neutral-105 dark:text-white text-neutral-900 py-2.5 px-11 rounded-xl outline-none text-xs font-semibold dark:placeholder-gray-400 placeholder-neutral-650 border dark:border-neutral-700 border-neutral-300 transition-colors duration-200 shadow-sm" 
            />
          </div>

          {/* HINDI / ENGLISH LANGUAGE TOGGLE */}
          <button 
            onClick={() => { triggerHaptic(); setIsHindi(!isHindi); }}
            className="px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black tracking-wider flex-shrink-0 transition-all active:scale-95 shadow flex items-center gap-1 min-w-[65px]"
          >
            <Globe size={12} />
            <span>{isHindi ? "English" : "हिंदी"}</span>
          </button>
          
          <a 
            href="tel:+919714293759"
            className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl border border-transparent shadow flex items-center justify-center transition-colors flex-shrink-0"
            title="Direct call to cafe"
          >
            <Phone size={18} />
          </a>

          <button 
            onClick={() => { triggerHaptic(); setIsProfileOpen(true); }}
            className="p-2.5 dark:bg-neutral-800 bg-neutral-105 dark:text-white text-neutral-900 rounded-xl border dark:border-neutral-700 border-neutral-300 hover:border-orange-500 hover:text-orange-500 transition-colors shadow flex-shrink-0"
            title="My Profile & Loyalty Rewards"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {!storeOpen && (
        <div className="bg-red-600 text-white font-black py-3 px-4 text-center text-xs flex items-center justify-center gap-2 shadow-lg border-b border-red-500">
          <span className="animate-pulse">⚠️</span>
          <span>{isHindi ? "बम बम कैफ़े अभी बंद है।  आप केवल हमारा मेनू देख सकते हैं।" : "Bum Bum Cafe is closed now. You can only view our menu."}</span>
        </div>
      )}

      {/* MAIN LAYOUT WRAPPER */}
      <main ref={menuRef} className="pt-3 px-3 max-w-lg mx-auto space-y-4 font-sans font-bold">

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
                <h4 className="text-xs font-black text-white font-sans">Bum Bum Cafe App</h4>
                <p className="text-[9px] text-orange-100 font-bold">{isHindi ? "बिना प्ले स्टोर के सीधे अपने phone में इंस्टॉल करें!" : "Install directly on your phone without Play Store!"}</p>
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

        {/* Dynamic Video Stories */}
        {stories.length > 0 && (
          <div className="space-y-1 px-1">
            <p className="text-[8px] font-black uppercase tracking-wider text-orange-500">{isHindi ? "खूबसूरत  फ़ूड रील्स" : "Daily Food Reels"}</p>
            <div className="flex gap-4 overflow-x-auto py-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden font-sans">
              {stories.map((story) => (
                <button 
                  key={story.id} 
                  onClick={() => { triggerHaptic(); setActiveStory(story); }}
                  className="flex flex-col items-center flex-shrink-0 focus:outline-none"
                >
                  <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-600 relative">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-900 bg-neutral-800 flex items-center justify-center relative">
                      <img src={story.coverUrl || story.url} className="w-full h-full object-cover" alt={story.title} loading="lazy" />
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
        
        {/* Promo Banner */}
        {isBannerEnabled && banners.length > 0 && !bannerError && (
          <div className="w-full h-36 rounded-2xl overflow-hidden relative border border-white/5 bg-white/[0.02]">
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
                    loading="lazy"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* STICKY CATEGORY SLIDER */}
        <div className="sticky top-[64px] z-30 bg-white/95 dark:bg-[#050505]/95 backdrop-blur-md py-2.5 px-1 border-b border-neutral-200 dark:border-white/5 transition-all duration-200 shadow-sm font-sans font-bold">
          <div className="flex gap-5 overflow-x-auto py-2 px-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setSelectedCategory("Favorites")} className="flex flex-col items-center flex-shrink-0 group outline-none">
              <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all flex items-center justify-center ${selectedCategory === "Favorites" ? 'border-red-500 scale-105 shadow-md' : 'dark:border-neutral-300 bg-white dark:bg-neutral-900'}`}>
                <Heart size={24} className={selectedCategory === "Favorites" ? 'text-red-550 fill-red-500' : 'text-neutral-500 dark:text-gray-400'} />
              </div>
              <span className={`text-[9px] font-black uppercase mt-1.5 truncate ${selectedCategory === "Favorites" ? 'text-red-550' : 'dark:text-gray-400 text-neutral-800'}`}>{isHindi ? "पसंदीदा" : "My Favorites"}</span>
            </button>

            {visibleCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-center flex-shrink-0 group outline-none">
                  <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all ${isActive ? 'border-orange-500 scale-105 shadow-md' : 'dark:border-white/10 border-neutral-300 bg-neutral-950'}`}>
                    {cat === "DIY Pizza" ? (
                      <div className="w-full h-full flex items-center justify-center text-lg bg-gradient-to-tr from-yellow-500 to-red-500 text-white">🍕</div>
                    ) : (
                      <img src={getCategoryImage(cat)} className="w-full h-full object-cover" alt={cat} loading="lazy" />
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase mt-1.5 truncate max-w-[70px] text-center ${isActive ? 'dark:text-orange-500 text-orange-700' : 'dark:text-gray-400 text-neutral-800'}`}>
                    {cat === "All" ? (isHindi ? "सभी" : "All") : cat.replace("Special ", "").replace(" Special", "")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {distanceKm !== null && (
          <div className="bg-orange-500/10 border border-orange-500/20 p-3.5 rounded-2xl flex items-center gap-3 font-bold">
            <span className="text-xl font-bold">📍</span>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-orange-500 dark:text-orange-400 uppercase font-sans font-bold">{isHindi ? "अनुमानित दूरी" : "Estimated Distance"}</p>
              <p className="text-[9px] text-neutral-700 dark:text-gray-400 font-sans font-bold">{isHindi ? `आप बम बम कैफे से लगभग ${distanceKm} KM की दूरी पर हैं।` : `You are approximately ${distanceKm} KM away from Bum Bum Cafe.`}</p>
            </div>
          </div>
        )}

        {/* INLINE DEDICATED DIY PIZZA BUILDER WORKSPACE */}
        {selectedCategory === "DIY Pizza" ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="dark:bg-[#0f1115] bg-white border dark:border-white/5 border-neutral-200 rounded-3xl p-5 shadow-xl space-y-6 max-w-sm mx-auto font-sans"
          >
            <div className="text-center space-y-1">
              <span className="bg-orange-500/10 text-orange-655 dark:text-orange-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest font-sans font-bold">
                DIY Pizza Tab
              </span>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white font-sans font-bold">{isHindi ? "अपने मन का पिज़्ज़ा बनाएं 🍕" : "Create Custom Pizza 🍕"}</h3>
              <p className="text-[10px] text-neutral-600 dark:text-gray-400 font-semibold leading-relaxed font-sans font-bold">{isHindi ? "पसंद का बेस, सॉस, पनीर और मनपसंद वेजीज़ को टच करके अपनी रेसिपी तैयार करें!" : "Touch your preferred base, sauce, cheese and toppings to bake your own recipe!"}</p>
            </div>

            {/* Step 1: Base Crust Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-orange-500 font-sans font-bold">{isHindi ? "1. पिज़्ज़ा बेस चुनें:" : "1. Select Base Size:"}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'small', label: 'Small Base (₹15)' },
                  { id: 'medium', label: 'Medium Base (₹20)' },
                  { id: 'large', label: 'Large Base (₹30)' }
                ].map((base) => (
                  <button
                    key={base.id}
                    onClick={() => { triggerHaptic(); setDiySize(base.id); }}
                    className={`p-3 rounded-xl border text-[10px] font-black text-center transition-all ${diySize === base.id ? 'border-orange-500 bg-orange-500/10 text-orange-600' : 'dark:border-white/5 border-neutral-300'}`}
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
                className={`p-3 rounded-xl border text-xs font-black flex justify-between items-center transition-all ${diySauce ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300 opacity-60'}`}
              >
                <span>🥫 Pizza Sauce</span>
                <span className="font-extrabold text-[10px]">
                  +₹{DIY_PIZZA_PRICES[diySize]?.sauce}
                </span>
              </button>

              <button
                onClick={() => { triggerHaptic(); setDiyMozzarella(!diyMozzarella); }}
                className={`p-3 rounded-xl border text-xs font-black flex justify-between items-center transition-all ${diyMozzarella ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300 opacity-60'}`}
              >
                <span>🧀 Mozzarella</span>
                <span className="font-extrabold text-[10px]">
                  +₹{DIY_PIZZA_PRICES[diySize]?.mozzarella}
                </span>
              </button>
            </div>

            {/* Step 3: Veggie Selection */}
            <div className="space-y-2.5 pt-2 font-sans font-bold">
              <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "3. ताज़ा वेजीज़ जोड़ें:" : "3. Add Fresh Veggies:"}</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DIY_PIZZA_PRICES[diySize]?.veggies || {}).map(([veg, cost]: any) => {
                  const isSelected = !!diyVegSelection[veg];
                  return (
                    <button
                      key={veg}
                      onClick={() => { triggerHaptic(); setDiyVegSelection(p => ({ ...p, [veg]: !p[veg] })); }}
                      className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-black capitalize transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300'}`}
                    >
                      <span>{veg}</span>
                      <span className="font-extrabold text-orange-655 font-mono">+₹{cost}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Premium Ingredients */}
            <div className="space-y-2.5 pt-2 font-sans font-bold">
              <label className="text-[10px] font-black uppercase text-orange-500 font-bold">{isHindi ? "4. प्रीमियम एक्स्ट्रा  टॉपिंग:" : "4. Premium Extra Toppings:"}</label>
              <div className="grid grid-cols-2 gap-2 font-sans font-bold">
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
                      className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-black transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300'}`}
                    >
                      <span>{item.label}</span>
                      <span className="font-extrabold text-orange-655 font-mono">+₹{cost}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Cooking Tags & Notes */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "5. कुकिंग निर्देश:" : "5. Chef Instructions:"}</label>
              <div className="flex flex-wrap gap-1 pb-1">
                {QUICK_INSTRUCTION_TAGS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => quickAppendInstruction(tag, "diy")}
                    className="text-[9px] font-bold py-1 px-2.5 rounded-full border dark:border-white/5 border-neutral-300 bg-neutral-105 dark:bg-neutral-800 dark:text-gray-300 text-neutral-800 hover:border-orange-500 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                placeholder={isHindi ? "विशेष निर्देश दर्ज करें..." : "Enter custom instructions..."}
                value={diyChefNote}
                onChange={(e) => setDiyChefNote(e.target.value)}
                className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-neutral-50 border dark:border-white/5 border-neutral-300 dark:text-white outline-none focus:border-orange-500 h-16 resize-none text-neutral-900"
              />
            </div>

            {/* Dynamic Real-time Bill Price Summary Card */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 rounded-2xl text-white text-center space-y-1 font-mono">
              <p className="text-[9px] font-bold uppercase opacity-85">Pizza Builder Subtotal</p>
              <h4 className="text-2xl font-black">₹{calculatedDiyPizzaPrice}</h4>
            </div>

            {/* Confirm & Bake Button */}
            {storeOpen ? (
              <button
                onClick={handleAddDiyPizzaToCart}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-all font-sans font-bold"
              >
                <span>{isHindi ? "कस्टम पिज्जा कार्ट में जोड़ें ➔" : "Add Custom Pizza to Cart ➔"}</span>
              </button>
            ) : (
              <div className="text-center text-xs font-bold text-red-500 uppercase py-2">
                {isHindi ? "बम बम कैफ़े अभी बंद है!" : "Bum Bum Cafe is Closed!"}
              </div>
            )}
          </motion.div>
        ) : (
          // STANDARD PRODUCTS LISTING
          <div className="grid grid-cols-1 gap-4 pt-1 font-bold">
            {menuLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="dark:bg-white/[0.02] bg-white rounded-2xl border dark:border-white/5 border-neutral-200 p-4 space-y-4 animate-pulse font-sans">
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
              <p className="text-center text-neutral-600 dark:text-gray-400 py-8 text-xs font-bold uppercase font-sans">No items found...</p>
            ) : (
              filteredMenu.map((item, index) => {
                const isItemAvailable = item.isAvailable !== false;

                return (
                  <React.Fragment key={item.id}>
                    <motion.div 
                      layout 
                      className={`group dark:bg-white/[0.02] bg-white rounded-2xl border dark:border-white/5 border-neutral-200 overflow-hidden flex flex-col relative shadow-md shadow-neutral-100 dark:shadow-none transition-all duration-300 hover:shadow-lg ${!isItemAvailable ? 'opacity-70' : ''}`}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    >
                      <div className="relative h-44 w-full overflow-hidden font-sans">
                        <img 
                          src={item.image || item.imageUrl || item.url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80"} 
                          className="w-full h-full object-cover origin-center transition-transform duration-700 ease-out group-hover:scale-110" 
                          alt={item.name} 
                          loading="lazy"
                        />
                        
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 text-[8px] font-black uppercase text-green-400 font-bold">
                          <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse font-bold" />VEG
                        </div>

                        <div className="absolute bottom-0 left-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-[9px] px-3 py-1 rounded-tr-xl flex items-center gap-1 shadow-md uppercase tracking-wider font-bold">
                          <span>🛵</span> <span>{isHindi ? "फ्री डिलीवरी" : "FREE delivery"}</span>
                        </div>

                        {!isItemAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-md">
                              {isHindi ? "आज उपलब्ध नहीं है" : "Out of Stock"}
                            </span>
                          </div>
                        )}

                        <button onClick={(e) => handleToggleFavorite(item.id, e)} className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 text-white hover:text-red-555 transition-colors">
                          <Heart size={14} className={favorites.includes(item.id) ? "fill-red-550 text-red-550" : "text-white"} />
                        </button>
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1 font-sans font-bold">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-black text-sm dark:text-gray-100 text-neutral-900 line-clamp-1">{item.name}</h4>
                          <div className="bg-green-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded flex items-center gap-0.5">
                            <span>4.9</span><Star size={8} style={{ color: '#ffffff', fill: '#ffffff' }} />
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-neutral-600 dark:text-gray-400 font-bold mt-0.5 font-sans">
                          <p className="uppercase text-[8px] text-neutral-600 dark:text-gray-400">{item.category}</p><p>• 15-25 min</p>
                        </div>
                        <div className="h-px dark:bg-white/5 bg-neutral-200 my-2.5" />
                        <div className="flex justify-between items-end mt-0.5">
                          <div>
                            <p className="text-neutral-505 dark:text-neutral-405 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Price</p>
                            {/* Rupee duplication fixed by removing the hardcoded '₹' in front of getDisplayPrice */}
                            <p className="text-orange-700 dark:text-orange-500 font-black text-base leading-none font-mono font-bold">{getDisplayPrice(item)}</p>
                            {item.variants && <span className="text-[8px] font-bold text-neutral-600 dark:text-gray-400 mt-1 block">{isHindi ? "विकल्प उपलब्ध हैं" : "Options available"}</span>}
                          </div>
                          
                          {storeOpen && isItemAvailable && (
                            <button 
                              onClick={() => { 
                                triggerHaptic();
                                item.variants ? setSelectedProduct(item) : addItem(item); 
                              }} 
                              className="px-4 py-2 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-lg font-black text-[10px] active:scale-95 transition-all uppercase flex items-center gap-1 shadow"
                            >
                              <Plus size={12} /> {isHindi ? "जोड़ें" : "ADD"}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Promo pass card positioned after 4th item */}
                    {index === 3 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        onClick={() => {
                          triggerHaptic();
                          setIsProfileOpen(true);
                        }}
                        className="cursor-pointer bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white p-5 rounded-2xl shadow-lg border border-white/10 my-2 relative overflow-hidden group font-sans font-bold"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
                        <div className="relative z-10 flex justify-between items-center gap-4 font-sans font-bold">
                          <div className="space-y-1.5 font-sans font-bold">
                            <span className="bg-black/30 border border-white/20 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-yellow-300 font-bold">
                              🎁 LOYALTY CLUB PROMO PASS
                            </span>
                            <h4 className="text-sm font-black italic tracking-tight font-serif">
                              {isHindi ? "फ्री पिज्जा, सैंडविच और शेक अनलॉक करें!" : "Unlock Free Pizza, Sandwich & Shakes!"}
                            </h4>
                            <p className="text-[10px] text-orange-100 font-bold leading-normal font-sans">
                              {customerDetails ? (
                                isHindi ? "आपका प्रोमो पास एक्टिवेटेड है! ✅ हर ₹100 पर 1 पॉइंट कमाएं।  यहाँ क्लिक करके अपने  रिवॉर्ड्स देखें ➔" : "Your promo pass is active! ✅ Earn 1 point per ₹100. Click here to view rewards ➔"
                              ) : (
                                isHindi ? "अपना Name और Number दर्ज करके इस पास को एक्टिवेट करें! 🎁 हर ₹100 पर 1 पॉइंट कमाएं।  टच करें ➔" : "Enter your Name & Number to activate this pass! 🎁 Earn 1 point per ₹100. Tap to activate ➔"
                              )}
                            </p>
                          </div>
                          <div className="bg-white/15 backdrop-blur-md p-3 rounded-full border border-white/20 text-yellow-300 group-hover:rotate-12 transition-transform duration-300">
                            <Gift size={24} />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Secondary Promo Banner positioned after the 7th item */}
                    {index === 6 && isInlineBannerEnabled && (
                      <div className="w-full h-36 rounded-2xl overflow-hidden relative border border-white/5 bg-white/[0.02] my-2 font-sans font-bold">
                        {(banners.length === 0 || bannerError) ? (
                          <div className="w-full h-full bg-gradient-to-r from-yellow-600/35 to-orange-850/35 flex flex-col justify-center p-5 space-y-1 font-sans">
                            <span className="text-[8px] font-black uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full w-max font-bold">
                              {isHindi ? "ताज़ा स्वाद" : "Fresh Taste"}
                            </span>
                            <h3 className="text-sm font-black text-yellow-300">
                              {isHindi ? "शुद्ध और हाइजीनिक फास्ट फूड" : "PURE & HYGIENIC FAST FOOD"}
                            </h3>
                            <p className="text-[9px] text-neutral-605 dark:text-gray-400 font-bold">
                              {isHindi ? "मोहांद्रा में हमारा स्पेशल पनीर पिज़्ज़ा चखें!" : "Try our special Paneer Pizza in Mohandra Town!"}
                            </p>
                          </div>
                        ) : (
                          <div className="w-full h-full relative">
                            {isVideoUrl(banners[(bannerIndex + 1) % banners.length]?.url) ? (
                              <video 
                                src={banners[(bannerIndex + 1) % banners.length]?.url} 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img 
                                src={banners[(bannerIndex + 1) % banners.length]?.url} 
                                className="w-full h-full object-cover" 
                                alt="BAM BAM CAFE Secondary Promo"
                                loading="lazy"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        )}

        {/* REVIEWS SECTION */}
        <div className="pt-6 space-y-4 font-sans font-bold">
          <div className="flex justify-between items-center font-sans font-bold">
            <h3 className="text-sm font-black uppercase tracking-wider text-yellow-500 flex items-center gap-1 font-bold font-sans">⭐ {isHindi ? "हमारे ग्राहकों के प्यारे शब्द" : "Feedback from our loved guests"}</h3>
            <span className="text-[9px] font-bold text-neutral-600 dark:text-gray-400">{isHindi ? "कुल समीक्षाएं" : "Total Reviews"} ({displayReviews.length})</span>
          </div>
          
          <div className={hasManyReviews ? "max-h-[380px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-transparent font-sans" : "space-y-3.5 font-sans"}>
            {displayReviews.map((r: any) => (
              <div key={r.id} className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 p-4 rounded-2xl space-y-2 shadow-md shadow-neutral-200/30 dark:shadow-none transition-colors duration-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs text-orange-605 font-bold">{r.name}</h4>
                  <div className="flex items-center gap-0.5">
                    <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                  </div>
                </div>
                <p className="text-[10.5px] text-neutral-800 dark:text-gray-300 italic leading-relaxed">"{r.comment}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <footer className="pt-8 border-t border-neutral-200 dark:border-white/5 space-y-6">
          <div className="bg-gradient-to-br dark:from-green-950/20 dark:to-emerald-900/10 from-green-50 to-emerald-50 p-6 rounded-[2rem] border dark:border-green-500/10 border-green-200 relative overflow-hidden transition-colors duration-200 font-sans">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl" />
            
            <div className="text-center space-y-3 relative z-10 flex flex-col items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                {isHindi ? "हमारे बारे में" : "About Us"}
              </span>
              <h4 className="text-xl font-black italic text-yellow-355 font-bold font-serif">BUM BUM CAFE</h4>
              <p className="text-[11px] font-bold text-green-600 dark:text-green-300">{isHindi ? "जहाँ स्वाद और सुकून मिलते हैं! ✨" : "Where Taste Meets Serenity! ✨"}</p>
              
              <p className="text-[11.5px] text-neutral-800 dark:text-gray-300 leading-relaxed max-w-sm mx-auto font-medium">
                {isHindi ? 
                  "हमने BAM BAM CAFE की शुरुआत एक छोटे से सपने के साथ की थी—लोगों को घर जैसा स्वाद और कैफे वाला माहौल देने के लिए।  यहाँ हर कप कॉफी और हर स्लाइस पिज्जा प्यार और शुद्धता के साथ बनाया जाता है।  हमारी कोशिश है कि आप जब भी यहाँ आएँ, एक प्यारी मुस्कान के साथ वापस जाएँ।  ❤️" :
                  "We started BAM BAM CAFE with a simple dream - to serve hygienic, delicious, home-style fast food in Mohandra town. Every slice of pizza and plate of thali here is crafted with ultimate love, purity and hygiene. Feel free to dine-in or order online! ❤️"
                }
              </p>
            </div>
          </div>

          {/* Social Icons Container with dynamically fetched Follower Counts [1] */}
          <div className="social-icons flex flex-wrap justify-center gap-6 py-5 dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 rounded-2xl shadow-sm">
            {SOCIAL_LINKS.map((link) => (
              <a 
                key={link.id}
                href={link.url} 
                target="_blank" 
                rel="noreferrer" 
                title={link.label} 
                className="flex flex-col items-center gap-1 hover:scale-105 transition-transform"
              >
                <img src={link.icon} alt="" className="w-8 h-8 object-contain" loading="lazy" />
                <span className="text-[8px] font-bold text-neutral-550 dark:text-gray-400 mt-0.5">
                  {socialCounts[link.id] || "Follow"}
                </span>
              </a>
            ))}
          </div>

          {/* Time & Location Grid */}
          <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-black uppercase font-sans font-bold">
            <div className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-md shadow-neutral-200/30 dark:shadow-none transition-colors duration-200">
              <Clock className="text-orange-500" size={16} />
              <p className="text-neutral-600 dark:text-gray-400 text-[8px]">{isHindi ? "खुलने का समय" : "Open Timing"}</p>
              <p className="dark:text-white text-neutral-800 text-[9px] font-mono">
                {isHindi ? storeTimingHindi : storeTimingEnglish}
              </p>
            </div>
            
            <a href="https://maps.app.goo.gl/8pj1Xby3bbMn5qxu5" target="_blank" rel="noreferrer" className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-neutral-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-orange-500/30 shadow-md shadow-neutral-200/30 dark:shadow-none transition-all duration-200 font-bold">
              <MapPin className="text-green-500 animate-bounce" size={16} />
              <p className="text-neutral-600 dark:text-gray-400 text-[8px]">{isHindi ? "हमारा पता" : "Our Location"}</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-[9px] underline">Google Map 🗺️</p>
            </a>
          </div>

          <div className="text-center text-[9px] text-neutral-505 dark:text-gray-400 font-bold tracking-widest pt-2 font-mono">
            © 2026 BUM BUM CAFE - MOHANDRA. ALL RIGHTS RESERVED.
          </div>
        </footer>
      </main>

      {/* STICKY FLOATING CART BUTTON / BOTTOM NAV */}
      <div className="fixed bottom-6 inset-x-0 z-[80] flex justify-center pointer-events-none font-sans font-bold">
        <div className="flex gap-4 pointer-events-auto">
          {cart.length > 0 && (
            <motion.button
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 50 }}
              onClick={() => { triggerHaptic(); setIsCartOpen(true); }}
              className="bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-orange-500/30"
            >
              <div className="relative">
                <ShoppingBag size={18} />
                <span className="absolute -top-2.5 -right-2.5 bg-yellow-400 text-black text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-orange-600 font-mono font-bold">
                  {cart.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="text-left leading-none">
                <p className="text-[8px] uppercase tracking-wider text-orange-200">{isHindi ? "कर्ट देखें" : "View Cart"}</p>
                <p className="text-xs font-black font-mono font-bold">₹{getTotalBillPrice()}</p>
              </div>
              <ChevronRight size={16} />
            </motion.button>
          )}
        </div>
      </div>

      {/* LIVE ORDER REAL-TIME TRACKING FOOTER PANEL */}
      <AnimatePresence>
        {liveOrder && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 inset-x-4 z-50 max-w-sm mx-auto bg-neutral-950/95 backdrop-blur-md border border-orange-500/30 p-4 rounded-3xl shadow-2xl flex flex-col gap-2 text-xs font-bold font-sans"
          >
            <div className="flex justify-between items-center font-sans font-bold">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${liveOrder.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500 animate-pulse'}`} />
                <span className="text-gray-200">
                  {liveOrder.status === 'rejected' 
                    ? (isHindi ? "⚠️ आर्डर ALERT" : "⚠️ Order Alert")
                    : (isHindi ? `आर्डर लाइव ट्रैकिंग (Bill #${formatBillNumber(liveOrder.billNumber)})` : `Order Tracking (Bill #${formatBillNumber(liveOrder.billNumber)})`)
                  }
                </span>
              </div>
              {liveOrder.status === 'rejected' ? (
                <button 
                  type="button"
                  onClick={() => { 
                    triggerHaptic(); 
                    try {
                      const dismissed = JSON.parse(localStorage.getItem('bb_dismissed_rejected_orders') || '[]');
                      if (!dismissed.includes(liveOrder.id)) {
                        dismissed.push(liveOrder.id);
                        localStorage.setItem('bb_dismissed_rejected_orders', JSON.stringify(dismissed));
                      }
                    } catch (e) {}
                    setLiveOrder(null); 
                  }}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={14} />
                </button>
              ) : (
                <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md text-[9px] uppercase font-black font-mono font-bold">
                  Token: #{liveOrder.tokenNumber}
                </span>
              )}
            </div>

            {liveOrder.status === 'rejected' ? (
              <div className="space-y-3 py-1 font-sans font-bold">
                <p className="text-red-400 text-[10px] leading-relaxed font-black font-sans">
                  {isHindi 
                    ? "🚨 आपका आर्डर कैफ़े द्वारा रद्द (Reject) कर दिया गया है! कृपया स्पष्टीकरण या दोबारा आर्डर के लिए कैफ़े में तुरंत संपर्क करें।"
                    : "🚨 Your order has been rejected by the cafe! Please call us immediately for confirmation or details."
                  }
                </p>
                <a 
                  href="tel:+919714293759"
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-center text-[10px] py-2 rounded-xl block font-black uppercase transition-all"
                >
                  Call Cafe 📞
                </a>
              </div>
            ) : (
              <div className="space-y-1 mt-1 font-mono">
                <div className="flex justify-between text-[8px] text-gray-400 uppercase font-sans font-bold">
                  <span className={liveOrder.status === 'pending' ? 'text-orange-400 font-extrabold font-bold' : ''}>{isHindi ? "स्वीकृति" : "Confirming"} ⏳</span>
                  <span className={liveOrder.status === 'preparing' ? 'text-yellow-400 font-extrabold font-bold' : ''}>{isHindi ? "तैयारी" : "Preparing"} 👨‍🍳</span>
                  <span className={liveOrder.status === 'out_for_delivery' ? 'text-blue-400 font-extrabold font-bold' : ''}>{isHindi ? "मार्ग में" : "On the Way"} 🛵</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-yellow-400 h-full transition-all duration-500" 
                    style={{ 
                      width: liveOrder.status === 'pending' ? '25%' : liveOrder.status === 'preparing' ? '65%' : '90%' 
                    }} 
                  />
                </div>
                <div className="flex gap-2 pt-1 border-t border-white/5 mt-1.5 font-sans font-bold">
                  <a 
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते  बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(liveOrder.billNumber)} का लाइव स्टेटस बताएं।`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-white/5 hover:bg-white/10 text-center text-[10px] text-yellow-400 py-1.5 rounded-xl border border-white/5 transition-all font-bold"
                  >
                    Track Live Status (WA) 🔍
                  </a>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL SCREEN REELS VIEWER */}
      <AnimatePresence>
        {activeStory && (
          <div className="fixed inset-0 bg-black z-[250] flex flex-col justify-between font-sans">
            <div className="absolute top-4 inset-x-0 px-4 z-[260] flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pb-10">
              <span className="text-white text-xs font-black tracking-wider uppercase font-sans font-bold">{activeStory.title}</span>
              <button 
                onClick={() => { triggerHaptic(); setActiveStory(null); }} 
                className="p-2 bg-white/10 rounded-full text-white"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center font-sans">
              <video 
                src={activeStory.url} 
                autoPlay 
                playsInline 
                onEnded={handleReelEnded}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>

            <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent text-center space-y-4 z-[260] font-sans">
              <p className="text-xs text-gray-300 font-semibold">{activeStory.description}</p>
              <button 
                onClick={() => handleQuickAddFromStory(activeStory.title, activeStory.price)}
                className="w-full max-w-sm mx-auto bg-orange-500 hover:bg-orange-600 text-black py-4 rounded-2xl font-black text-xs uppercase shadow font-bold"
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
              <div className="flex justify-between items-center mb-8 font-sans font-bold">
                <div>
                  <h2 className="text-2xl font-black text-white font-mono font-bold">All Reviews</h2>
                  <p className="text-xs text-yellow-400 font-bold font-mono">Rating: 4.8/5.0 ★</p>
                </div>
                <button onClick={() => { triggerHaptic(); setIsReviewsDrawerOpen(false); }} className="p-2.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                {displayReviews.map((r: any) => (
                  <div key={r.id} className="dark:bg-white/[0.03] bg-white border dark:border-white/5 border-neutral-200 p-5 space-y-2 shadow-sm transition-colors duration-200 font-sans">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs text-orange-605 font-bold">{r.name}</h4>
                      <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                        <Star size={10} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                        <span className="font-extrabold text-amber-600 dark:text-amber-400 font-sans font-bold">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-800 dark:text-gray-300 italic">"{r.comment}"</p>
                  </div>
                ))}
              </div>
              <div className="fixed bottom-6 left-0 w-full px-6 z-50">
                <button onClick={() => { triggerHaptic(); setIsReviewFormOpen(true); }} className="w-full max-w-md mx-auto bg-orange-500 text-black py-3.5 rounded-2xl font-black text-xs uppercase font-sans font-bold">✍️ Write a Review</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* WRITING REVIEW FORM MODAL WITH INTEGRATED EXIT OPTIONS */}
      <AnimatePresence>
        {isReviewFormOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 font-sans">
            <form onSubmit={handleReviewSubmit} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <div className="flex justify-between items-center pb-2 border-b dark:border-white/10 border-neutral-200">
                <h3 className="text-xl font-black text-orange-55 uppercase italic">{isHindi ? "आपकी समीक्षा" : "Your Feedback"}</h3>
                <button 
                  type="button" 
                  onClick={() => { triggerHaptic(); setIsReviewFormOpen(false); }} 
                  className="p-2 bg-red-105 hover:bg-red-500 hover:text-white text-red-655 rounded-full transition-all duration-200 shadow"
                  title="Close Feedback"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-left font-sans font-bold">
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-bold">{isHindi ? "क्या नाम" : "Your Name"}</label>
                  <input autoComplete="name" type="text" placeholder={isHindi ? "अपना नाम दर्ज करें..." : "Enter your name..."} value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-lg text-xs text-neutral-900 dark:text-white focus:border-orange-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-bold">{isHindi ? "रेटिंग" : "Rating"}</label>
                  <div className="flex gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={20} 
                        style={{ color: '#fbbf24', fill: reviewRating >= star ? '#fbbf24' : 'none' }} 
                        onClick={() => setReviewRating(star)} 
                        className="cursor-pointer" 
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-bold">{isHindi ? "पसंदीदा समीक्षा टच करें:" : "Quick Suggestions:"}</label>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {SUGGESTED_REVIEWS.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => setReviewComment(suggestion)}
                        className="dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 hover:border-orange-500/50 px-2 py-1 rounded-full text-[9px] text-neutral-800 dark:text-gray-300 font-bold transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-bold">{isHindi ? "समीक्षा टिप्पणी" : "Comments"}</label>
                  <textarea placeholder={isHindi ? "खाना कैसा लगा?..." : "How was the food?..."} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-lg text-xs text-neutral-900 dark:text-white focus:border-orange-500 outline-none resize-none font-bold" />
                </div>
              </div>
              <div className="flex gap-2 pt-1 font-bold">
                <button type="submit" className="flex-1 bg-orange-500 text-black font-black p-3 rounded-lg text-xs uppercase">{isHindi ? "जमा करें" : "SUBMIT"}</button>
                <button type="button" onClick={() => { triggerHaptic(); setIsReviewFormOpen(false); }} className="dark:bg-white/5 bg-neutral-105 text-neutral-805 dark:text-gray-400 font-bold p-3 rounded-lg text-xs uppercase">{isHindi ? "बंद करें" : "CANCEL"}</button>
              </div>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* STANDARD CUSTOMIZATION MODAL FOR REGULAR PIZZAS */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-end font-sans">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="dark:bg-[#111] bg-white w-full p-6 rounded-t-3xl border-t dark:border-white/10 border-neutral-200 max-w-lg mx-auto overflow-y-auto max-h-[95vh] shadow-2xl transition-colors duration-200">
              <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-black text-center text-neutral-900 dark:text-white font-bold">{selectedProduct?.name}</h3>
              <p className="text-orange-500 font-black mb-4 uppercase text-[8px] text-center font-bold">{isHindi ? "ऑर्डर कस्टमाइज़ करें" : "Customize Your Order"}</p>
              
              <div className="space-y-3 mb-4 font-sans font-bold">
                <p className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase font-bold">{isHindi ? "1. साइज चुनें:" : "1. Select Portion Size:"}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                    <button 
                      type="button" 
                      key={size} 
                      onClick={() => { setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} 
                      className={`p-3 rounded-xl flex flex-col items-center border transition-all ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-600 font-black shadow-sm' : 'dark:bg-white/[0.03] bg-neutral-50 dark:border-white/5 border-neutral-300 dark:text-gray-400 text-neutral-800'}`}
                    >
                      <span className="capitalize text-xs font-black">{size}</span>
                      <span className="font-extrabold text-[10px] mt-1 dark:text-white text-neutral-900 font-mono">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {normalPizzaSize && (selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-3 mb-4 border-t border-neutral-200 dark:border-white/5 pt-3">
                  <p className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase font-bold">{isHindi ? "2. एक्स्ट्रा मसाला/टॉपिंग चुनें:" : "2. Select Add-ons:"}</p>
                  <div className="grid grid-cols-2 gap-2 font-sans font-bold">
                    {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]) => {
                      const isSelected = !!normalPizzaAddons[addon];
                      return (
                        <button
                          type="button"
                          key={addon}
                          onClick={() => setNormalPizzaAddons(prev => ({ ...prev, [addon]: !prev[addon] }))}
                          className={`p-2.5 rounded-xl border flex justify-between items-center text-[9px] font-bold ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'dark:border-white/5 border-neutral-300 dark:bg-white/[0.02] bg-neutral-50 dark:text-gray-300'}`}
                        >
                          <span>{addon}</span>
                          <span className="text-orange-500 dark:text-orange-400 font-black font-mono">+₹{cost}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-6 border-t border-neutral-200 dark:border-white/5 pt-3">
                <p className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase font-bold">{isHindi ? "शेफ के लिए विशेष निर्देश:" : "Special Note for Chef / Instructions:"}</p>
                <div className="flex flex-wrap gap-1.5 pb-2 font-sans font-bold">
                  {QUICK_INSTRUCTION_TAGS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => quickAppendInstruction(tag, "normal")}
                      className="text-[9px] font-bold py-1 px-2 rounded-full border dark:border-white/5 border-neutral-300 bg-neutral-105 dark:bg-neutral-800 dark:text-gray-300 text-neutral-800 hover:border-orange-500 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea 
                  placeholder="e.g. Make it extra spicy, No onions, soft crust etc..." 
                  value={chefNote} 
                  onChange={(e) => setChefNote(e.target.value)} 
                  className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-neutral-55 border dark:border-white/5 border-neutral-300 text-neutral-900 outline-none focus:border-orange-500 h-16 resize-none"
                />
              </div>

              <button type="button" onClick={handleNormalPizzaAdd} className="w-full bg-orange-500 text-black p-4 rounded-xl font-black text-xs uppercase font-bold">
                {isHindi ? "कर्ट में जोड़ने की पुष्टि करें" : "Confirm Add To Cart"}
              </button>
              <button type="button" onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setChefNote(""); }} className="w-full mt-3 text-neutral-550 dark:text-gray-400 font-black text-[10px] text-center uppercase font-bold">
                {isHindi ? "बंद करें" : "Close"}
              </button>
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
              className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-neutral-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200 font-sans"
            >
              <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white text-neutral-900 font-mono font-bold">{isHindi ? "मेरा खाता और लॉयल्टी" : "My Account & Loyalty"}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { triggerHaptic(); setIsProfileOpen(false); }} className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white text-neutral-800 rounded-full transition-all"><X size={20} /></button>
                </div>
              </div>

              {!customerDetails ? (
                <form onSubmit={handleSaveDetails} className="space-y-4">
                  <div className="text-center space-y-1.5 pb-2">
                    <User className="mx-auto text-orange-500" size={32} />
                    <h3 className="text-sm font-black dark:text-white text-neutral-900">{isHindi ? "प्रोफाइल सेटअप करें" : "Set Up Profile"}</h3>
                    <p className="text-[10px] text-neutral-600 dark:text-gray-400 font-semibold leading-normal">{isHindi ? "लॉयल्टी पॉइंट्स कमाने, सुरक्षित पिन सेटअप करने और आसान चेकआउट करने के लिए प्रोफाइल बनाएं!" : "Build your profile to unlock free loyalty codes, safety PIN checkout and fast orders!"}</p>
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-600 uppercase">{isHindi ? "आपका नाम" : "Your Name"}</label>
                      <input autoComplete="name" type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 border dark:border-neutral-700 border-neutral-300 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-600 uppercase">{isHindi ? "मोबाइल नंबर" : "Mobile Number"}</label>
                      <input autoComplete="tel" type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 border dark:border-neutral-700 border-neutral-300 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-600 uppercase flex items-center gap-1"><Lock size={10}/> <span>{isHindi ? "सुरक्षा पिन बनाएँ (4-अंक)" : "Create 4-Digit Security PIN"}</span></label>
                      <input type="password" maxLength={4} placeholder="e.g. 1234" value={tempPin} onChange={(e) => setTempPin(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 border dark:border-neutral-700 border-neutral-300 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs text-center tracking-widest font-mono" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-600 uppercase">{isHindi ? "इनवाइट कोड (वैकल्पिक)" : "Referral Code (Optional)"}</label>
                      <input type="text" placeholder="Enter invite code..." value={tempRefCode} onChange={(e) => setTempRefCode(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 border dark:border-neutral-700 border-neutral-300 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-orange-500 text-black p-3.5 rounded-xl font-black text-xs uppercase shadow transition-all active:scale-95 mt-4 font-bold font-sans">{isHindi ? "खाता बनाएं ➔" : "Create Account ➔"}</button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* USER ACCOUNT VIEW */}
                  <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 flex justify-between items-center transition-colors duration-200">
                    <div>
                      <p className="text-[8px] dark:text-gray-400 text-neutral-600 font-black uppercase">Customer Profile</p>
                      <h4 className="font-black text-base text-orange-500 font-bold">{customerDetails.name}</h4>
                      <p className="text-xs dark:text-gray-400 text-neutral-700 font-semibold font-mono">{customerDetails.phone}</p>
                      <p className="text-[9px] text-yellow-650 dark:text-yellow-400 font-bold mt-1 uppercase font-mono">{isHindi ? "इन्वाइट कोड:" : "Invite Code:"} {getReferralCode()}</p>
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
                      className="text-[9px] bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 px-3 py-2 rounded-lg font-black uppercase flex items-center gap-1 transition-all font-bold"
                    >
                      <LogOut size={12}/> {isHindi ? "लॉगआउट" : "Logout"}
                    </button>
                  </div>

                  {/* Eco-Hero Badge */}
                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <p className="text-[8px] uppercase tracking-wider text-emerald-500 font-black">पर्यावरण संरक्षण ट्रैकर (Eco Impact)</p>
                      <h4 className="text-xs font-black dark:text-white text-neutral-900 font-bold">
                        {isHindi ? `आपने बचाए: ` : "You Saved: "}<span className="text-emerald-500 text-sm font-black">{ecoCutlerySaves} {isHindi ? "प्लास्टिक चम्मच 🌳" : "Plastic Cutlery 🌳"}</span>
                      </h4>
                      <p className="text-[9px] text-neutral-505 dark:text-gray-400 font-medium">{isHindi ? "चम्मच/टिश्यू न चुनकर आपने पर्यावरण की मदद की है।" : "By skipping plastic utensils, you actively protected nature!"}</p>
                    </div>
                    {ecoCutlerySaves >= 3 && (
                      <div className="bg-emerald-500 text-black px-3 py-1.5 rounded-full border border-emerald-400/30 font-black text-[9px] flex items-center gap-1 shadow animate-pulse font-bold">
                        <Award size={12}/>
                        <span>Eco-Hero 🍃</span>
                      </div>
                    )}
                  </div>

                  <div className="dark:bg-yellow-400/5 bg-yellow-100 border border-yellow-300 dark:border-yellow-400/20 rounded-2xl p-4 space-y-3 shadow-md">
                    <div className="flex justify-between items-center border-b dark:border-white/10 border-yellow-200 pb-2">
                      <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase font-bold"><Gift size={12}/> <span>{isHindi ? "बम बम लॉयल्टी क्लब" : "Bum Bum Loyalty Club"}</span></div>
                      <span className="text-[8px] font-black border px-2 py-0.5 rounded-full font-bold text-yellow-600 border-yellow-500/30 bg-yellow-100/30 dark:text-yellow-400 dark:border-yellow-400/30 dark:bg-yellow-400/10">
                        {getCustomerTier(customerPoints).name}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-2xl font-black dark:text-white text-neutral-900 leading-none font-mono font-bold">{customerPoints} <span className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase font-mono font-bold">Points</span></h4>
                        <p className="text-[8px] dark:text-gray-400 text-neutral-700 font-bold mt-1">{isHindi ? "₹100 खर्च करें = 1 पॉइंट पाएं!" : "Spend ₹100 = Get 1 Loyalty Point!"}</p>
                      </div>
                      <div className="text-right text-[8px] dark:text-yellow-400 text-amber-900 font-black space-y-0.5 uppercase max-h-20 overflow-y-auto no-scrollbar font-mono">
                        {loyaltyRules.map(rule => (<p key={rule.id}>🎁 {rule.pointsCost} Pts = {rule.rewardName}</p>))}
                      </div>
                    </div>

                    {pointsHistory.length > 0 && (
                      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-850 space-y-3 font-sans">
                        <p className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5 font-bold font-sans">
                          <span>📜</span> {isHindi ? "पॉइंट्स पासबुक (लेन-देन विवरण):" : "Points Passbook & Ledger:"}
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {pointsHistory.map((h: any) => (
                            <div key={h.id} className="flex justify-between items-center bg-white dark:bg-neutral-900 p-3 rounded-xl border dark:border-neutral-800 border-neutral-200 shadow-sm transition-colors duration-200">
                              <div className="space-y-1">
                                <span className="text-xs font-black text-neutral-800 dark:text-gray-200 block font-bold">{h.description}</span>
                                <span className="text-[9px] text-neutral-505 dark:text-gray-400 font-bold block font-mono">
                                  {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : new Date(h.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-0.5 font-mono font-bold ${h.type === 'earn' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-550 border border-red-500/20'}`}>
                                {h.type === 'earn' ? '+' : '-'}{h.points} Pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 flex flex-col gap-2 font-sans font-bold">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="dark:text-gray-400 text-neutral-700 font-black uppercase font-bold">{isHindi ? "शेयर प्रोग्रेस:" : "Share Progress:"}</span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-black bg-yellow-100 dark:bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-300 dark:border-yellow-400/20 font-mono font-bold">{shareCount}/5 Shared</span>
                      </div>
                      <button type="button" onClick={handleShareApp} className="w-full bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1 shadow-md transition-all font-bold">{isHindi ? "5 बार शेयर करके मुफ्त +1 पॉइंट कमाएं! 🎁" : "Share 5 times to earn +1 free point! 🎁"}</button>
                    </div>

                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center font-sans">
                      <span className="text-[9px] dark:text-gray-400 text-neutral-700 font-bold uppercase">{isHindi ? "दोस्त को गिफ्ट करें:" : "Gift points to a friend:"}</span>
                      <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(true); }} className="bg-yellow-500/10 text-yellow-655 border border-yellow-400/20 px-2.5 py-1 rounded text-[8px] font-black uppercase font-bold">🎁 Gift Points</button>
                    </div>

                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase mb-1.5 font-bold">{isHindi ? "सोशल मीडिया पर फॉलो करके  पॉइंट्स कमाएं:" : "Earn Points by Following Us:"}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SOCIAL_LINKS.map((link) => (
                          <button
                            key={link.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic();
                              setClaimingPlatform(link);
                              setIsClaimModalOpen(true);
                              window.open(link.url, '_blank');
                            }}
                            className="flex items-center gap-1 bg-neutral-105 dark:bg-white/5 border dark:border-white/10 border-neutral-200 px-2.5 py-1 rounded-full text-[9px] font-bold dark:text-gray-300 text-neutral-800 hover:border-yellow-400 transition-all"
                          >
                            <img src={link.icon} className="w-3.5 h-3.5 object-contain flex-shrink-0" alt="" loading="lazy" />
                            <span>{link.label.split(' ')[1]} (+{link.points} P)</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-neutral-200 dark:border-neutral-850 font-sans">
                      <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase mb-1.5 font-bold">{isHindi ? "पॉइंट्स रिडीम करें (सीधे कार्ट में):" : "Redeem Points (Instantly adds to cart):"}</p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto no-scrollbar font-mono">
                        {loyaltyRules.map(rule => {
                          const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                          const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                          return (
                            <button key={rule.id} type="button" onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)} disabled={!isAffordable} className={`py-2 px-2 rounded text-[9px] font-black uppercase border truncate transition-all ${isAffordable ? 'bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-500 font-bold' : 'bg-neutral-105 dark:bg-white/5 text-neutral-505 dark:text-gray-400 border-neutral-200 dark:border-white/5 cursor-not-allowed'}`}>🎁 {rule.rewardName} ({rule.pointsCost} P)</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 font-sans">
                    <h3 className="text-sm font-black dark:text-gray-200 text-neutral-900 uppercase flex items-center gap-1.5 font-bold font-sans">
                      <History size={16} className="text-orange-500" />
                      <span>{isHindi ? "मेरा आर्डर इतिहास (विवरण):" : "My Order History Ledger:"}</span>
                    </h3>
                    {pastOrders.length > 0 ? (
                      /* Limit and scrolling completely removed (max-h-72 overflow-y-auto) so that history shows fully at the bottom */
                      <div className="space-y-4 pr-1">
                        {pastOrders.map((ord: any, index: number) => {
                          const formattedDate = ord.timestamp?.toDate ? ord.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : new Date(ord.timestamp).toLocaleString();
                          return (
                            <div key={index} className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 border-neutral-200 rounded-2xl p-4 space-y-3 shadow-md transition-colors duration-200 font-sans">
                              <div className="flex justify-between items-center border-b dark:border-neutral-850 border-neutral-200 pb-2 font-mono font-sans font-bold">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-black text-orange-500 font-bold">Bill: #{formatBillNumber(ord.billNumber || 0)}</span>
                                  <span className="text-[9px] text-neutral-505 dark:text-gray-400 font-bold">{formattedDate}</span>
                                </div>
                                <span className="bg-green-600/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2.5 py-1 rounded-lg text-[9px] font-black font-mono font-bold">
                                  Token: #{ord.tokenNumber || "N/A"}
                                </span>
                              </div>
                              
                              <div className="space-y-1.5 font-sans font-bold">
                                {ord.items.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs text-neutral-800 dark:text-gray-300">
                                    <span>{it.name} <span className="text-orange-500 text-[10px]">x{it.quantity}</span></span>
                                    <span>₹{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="border-t border-dashed dark:border-neutral-800 border-neutral-200 pt-2.5 flex justify-between items-center text-xs font-black font-sans font-bold">
                                <span className="text-neutral-505">{isHindi ? "कुल भुगतान राशि:" : "To Pay Amount:"}</span>
                                <span className="text-sm text-green-600 dark:text-green-400 font-mono font-bold">₹{ord.total}</span>
                              </div>

                              <a 
                                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(ord.billNumber)} (टोकन नंबर: #${ord.tokenNumber}) का लाइव स्टेटस बताएं।`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white dark:bg-white/5 hover:dark:bg-white/10 text-center text-[10px] font-black py-2.5 rounded-xl block border dark:border-neutral-800 border-orange-500/20 transition-all font-sans font-bold"
                              >
                                Track Live Status on WA 🔍
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-neutral-505 py-6 text-[10px] font-bold uppercase tracking-wider font-sans">
                        {isHindi ? "अभी तक कोई आर्डर नहीं मिला।  स्वादिष्ट आर्डर शुरू करें! 🍕" : "No orders found yet. Grab some food! 🍕"}
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-end font-sans"
          >
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-neutral-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200 font-sans"
            >
              {/* STICKY TOP CONTAINER: TARGET PROGRESS BAR + LIVE BILL TOTAL */}
              <div className="sticky top-0 z-30 bg-white dark:bg-[#0b0c10] pb-3 border-b border-neutral-200 dark:border-white/5 space-y-2">
                {/* Free Delivery Target Progress Bar */}
                {fulfillmentType === "delivery" && (
                  <div className="bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 space-y-1.5 text-[10px] font-sans font-bold">
                    <div className="flex justify-between items-center font-black uppercase text-orange-605 dark:text-orange-400">
                      <span>🚚 Free Delivery Target:</span>
                      <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                    </div>
                  </div>
                )}

                {/* Live Bill Total card */}
                <div className="bg-neutral-105 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-200 dark:border-white/5 flex justify-between items-center font-mono font-bold">
                  <span className="text-[10px] font-black uppercase text-neutral-600 dark:text-gray-400 font-sans font-bold">{isHindi ? "लाइव बिल टोटल:" : "LIVE BILL TOTAL:"}</span>
                  <span className="text-sm font-black text-orange-605 dark:text-yellow-400 font-mono font-bold">₹{getTotalBillPrice()}</span>
                </div>
              </div>

              <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-mono font-bold">{isHindi ? "आपका कर्ट आर्डर" : "Your Order Cart"}</h2>
                <button onClick={() => { triggerHaptic(); setIsCartOpen(false); }} className="p-2.5 bg-neutral-105 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-800 dark:text-white rounded-full transition-all"><X size={20} /></button>
              </div>

              {/* 1. CART ITEMS LIST */}
              {cart.map((item: any) => (
                <div key={item.id} className="flex flex-col dark:bg-white/[0.02] bg-white p-4 rounded-2xl mb-3 border dark:border-white/5 border-neutral-200 shadow-sm transition-colors duration-200 gap-1.5 font-sans font-bold">
                  <div className="flex justify-between items-center font-bold">
                    <div className="min-w-0 pr-3 font-sans font-bold">
                      <h4 className="font-bold text-xs text-neutral-900 dark:text-gray-100 truncate font-bold">{item?.name || "Item"}</h4>
                      <p className="text-orange-500 font-black mt-1 text-[11px] font-mono">₹{item?.price || 0}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-black/40 px-2 py-1 rounded-xl border border-neutral-300 dark:border-white/10 flex-shrink-0">
                      <button onClick={() => { triggerHaptic(); removeItem(item.id); }} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-555 rounded text-sm font-black">-</button>
                      <span className="font-black text-xs px-1 text-neutral-900 dark:text-white font-mono">{item.quantity}</span>
                      {item.isReward ? (
                        <button disabled className="w-6 h-6 flex items-center justify-center bg-white/5 text-gray-550 rounded text-sm font-black cursor-not-allowed">+</button>
                      ) : (
                        <button onClick={() => { triggerHaptic(); addItem(item); }} className="w-6 h-6 flex items-center justify-center bg-green-500/10 text-green-500 rounded text-sm font-black">+</button>
                      )}
                    </div>
                  </div>
                  {item.note && (
                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-2 text-[9px] text-orange-655 dark:text-orange-400 italic">
                      👩‍🍳 Chef Instructions: {item.note}
                    </div>
                  )}
                </div>
              ))}

              {/* 2. UPSELL SUGGESTIONS */}
              {upsellSuggestionItems.length > 0 && (
                <div className="dark:bg-purple-950/20 bg-purple-50 border border-purple-500/10 rounded-2xl p-4 space-y-2 mt-4 font-sans font-bold">
                  <p className="text-[9px] font-black uppercase text-purple-800 dark:text-purple-400 tracking-wider font-bold">{isHindi ? "साथ में यह भी मंगाया गया 🥤" : "Frequently Bought Together 🥤"}</p>
                  <div className="space-y-2 font-sans font-bold">
                    {upsellSuggestionItems.map((suggest) => (
                      <div key={suggest.id} className="flex justify-between items-center text-[10px]">
                        <div>
                          <span className="font-bold block text-neutral-900 dark:text-white">{suggest.name}</span>
                          {/* Rupee symbol duplication resolved */}
                          <span className="text-orange-655 font-extrabold font-mono font-bold">{getDisplayPrice(suggest)}</span>
                        </div>
                        <button onClick={() => { triggerHaptic(); addItem(suggest); }} className="bg-purple-500/20 text-purple-655 border border-purple-500/30 px-3 py-1 rounded-lg font-black uppercase font-bold">ADD</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. SELECT ORDER MODE (Shifted above Delivery Zone / Address for logical UX) */}
              <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                <label className="text-[10px] font-black uppercase text-neutral-800 dark:text-gray-400 font-bold">{isHindi ? "ऑर्डर का माध्यम चुनें:" : "Select Order Mode:"}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { triggerHaptic(); setFulfillmentType("delivery"); }}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "delivery" ? 'border-orange-500 bg-orange-500/10 text-orange-655 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-semibold'}`}
                  >
                    <span className="text-base">🛵</span>
                    <span className="text-[9px] font-black">{isHindi ? "होम डिलीवरी" : "Home Delivery"}</span>
                  </button>
                  <button
                    onClick={() => { triggerHaptic(); setFulfillmentType("pickup"); }}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "pickup" ? 'border-orange-500 bg-orange-500/10 text-orange-655 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-semibold'}`}
                  >
                    <span className="text-base">🛍️</span>
                    <span className="text-[9px] font-black">{isHindi ? "सेल्फ-पिकअप" : "Self-Pickup"}</span>
                  </button>
                  <button
                    onClick={() => { triggerHaptic(); setFulfillmentType("table"); }}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "table" ? 'border-orange-500 bg-orange-500/10 text-orange-655 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-semibold'}`}
                  >
                    <span className="text-base">🍽️</span>
                    <span className="text-[9px] font-black">{isHindi ? "टेबल ऑर्डर" : "Dine-In (Table)"}</span>
                  </button>
                </div>
              </div>

              {/* 3. ADD ADD-ONS (Shown only if Pizza, Sandwich, Burger, Momos, Fries/Chips are present in the cart) */}
              {showAddonsSection && (
                <div className="dark:bg-white/[0.02] bg-neutral-50 border dark:border-white/5 border-neutral-200 rounded-2xl p-4 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                  <p className="text-[9px] font-black uppercase text-neutral-800 dark:text-gray-400 font-bold">{isHindi ? "ऐड-ऑन्स जोड़ें (Add-ons):" : "Add Add-ons to order:"}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => { triggerHaptic(); setKetchupAddon(!ketchupAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-655' : 'border-neutral-300 dark:border-white/5 bg-transparent text-neutral-800 dark:text-gray-300'}`}>
                      {isHindi ? "केचप" : "Ketchup"} (+₹10)
                    </button>
                    <button onClick={() => { triggerHaptic(); setOreganoAddon(!oreganoAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-600' : 'border-neutral-300 dark:border-white/5 bg-transparent text-neutral-800 dark:text-gray-300'}`}>
                      {isHindi ? "ऑरेगैनो" : "Oregano"} (+₹10)
                    </button>
                    <button onClick={() => { triggerHaptic(); setChiliFlakesAddon(!chiliFlakesAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-655' : 'border-neutral-300 dark:border-white/5 bg-transparent text-neutral-800 dark:text-gray-300'}`}>
                      {isHindi ? "चिली फ्लेक्स" : "Chili Flakes"} (+₹10)
                    </button>
                  </div>
                </div>
              )}

              {/* 5. CONDITIONAL FULFILLMENT INPUTS (Controlled dynamically below the Mode Selector) */}
              {fulfillmentType === "delivery" && (
                <div className="space-y-4 mt-4 font-sans font-bold">
                  
                  {/* Select Delivery Zone (KM) */}
                  <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
                    <label className="text-[9px] font-black uppercase text-neutral-800 dark:text-gray-400 font-bold">{isHindi ? "डिलीवरी का क्षेत्र चुनें (KM):" : "Select Delivery Zone (KM):"}</label>
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
                                ? 'border-orange-500 bg-orange-500/10 text-orange-655 dark:text-orange-400 shadow-md font-black' 
                                : 'border-neutral-300 dark:border-white/5 bg-white dark:bg-white/[0.01] text-neutral-800 dark:text-neutral-300 hover:border-neutral-400 hover:dark:border-white/10'
                            }`}
                          >
                            <span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span>
                            <div className="flex justify-between items-center w-full mt-2 font-mono">
                              <span className="text-[8px] font-black text-neutral-700 dark:text-neutral-300">शुल्क: ₹{area.fee}</span>
                              <span className="text-[8px] font-black bg-neutral-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-amber-900 dark:text-yellow-400 font-mono">Min: ₹{area.minFree}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Address text area */}
                  <div className="bg-neutral-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-neutral-200 dark:border-white/5 space-y-2 transition-colors duration-200">
                    <div className="flex items-center justify-between font-sans font-bold">
                      <div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/> <h3 className="font-black uppercase text-[10px] font-bold">{isHindi ? "डिलीवरी का पता" : "Delivery Address"}</h3></div>
                      <div className="flex gap-1">
                        {lastDeliveryAddress && (
                          <button 
                            type="button" 
                            onClick={() => { triggerHaptic(20); setAddress(lastDeliveryAddress); }}
                            className="text-[8px] bg-neutral-200 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-800 dark:text-white px-2 py-1 rounded font-bold uppercase transition-all flex items-center gap-1 shadow-sm font-sans"
                          >
                            📋 {isHindi ? "पिछला पता भरें" : "Use Last Address"}
                          </button>
                        )}
                        <button type="button" onClick={handleDetectLocation} className="text-[8px] bg-green-600 hover:bg-green-700 text-white font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase">📍 {isHindi ? "लाइव लोकेशन" : "Live Location"}</button>
                      </div>
                    </div>
                    <textarea placeholder={isHindi ? "घर का पता, मुख्य लैंडमार्क के साथ..." : "Ghar ka address, Landmark ke saath..."} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none resize-none h-16" />
                  </div>

                </div>
              )}

              {/* Dine-In Custom Table Capacity Grid Selector (The duplicate simple input text box was removed) */}
              {fulfillmentType === "table" && (
                <div className="mt-3 p-3 bg-neutral-105 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/5 space-y-3 font-sans transition-all duration-300">
                  <p className="text-[10px] font-black uppercase text-orange-655 dark:text-orange-400 font-bold">{isHindi ? "🪑 उपलब्ध टेबल चुनें:" : "🪑 Choose Available Table:"}</p>
                  
                  {/* 2-Seater Grid */}
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-black text-neutral-650 dark:text-gray-400 uppercase tracking-wider">{isHindi ? "2 लोगों के बैठने के लिए (3 टेबल्स):" : "For 2 People (3 Tables Available):"}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {["Table 1", "Table 2", "Table 3"].map((t) => {
                        const isSelected = tableNumber === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => { triggerHaptic(); setTableNumber(t); }}
                            className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                              isSelected 
                                ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-sm font-black' 
                                : 'border-neutral-300 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-800 dark:text-neutral-300 hover:border-neutral-400'
                            }`}
                          >
                            <span className="block">{t}</span>
                            <span className="text-[7.5px] text-neutral-500 dark:text-gray-400 font-normal">👥 2 seats</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4-Seater Grid */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[8px] font-black text-neutral-655 dark:text-gray-400 uppercase tracking-wider">{isHindi ? "4 लोगों के बैठने के लिए (3 टेबल्स):" : "For 4 People (3 Tables Available):"}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {["Table 4", "Table 5", "Table 6"].map((t) => {
                        const isSelected = tableNumber === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => { triggerHaptic(); setTableNumber(t); }}
                            className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                              isSelected 
                                ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-sm font-black' 
                                : 'border-neutral-300 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-800 dark:text-neutral-300 hover:border-neutral-400'
                            }`}
                          >
                            <span className="block">{t}</span>
                            <span className="text-[7.5px] text-neutral-500 dark:text-gray-400 font-normal">👥👥 4 seats</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. ECO FRIENDLY PACKAGING */}
              <div className="dark:bg-green-950/10 bg-green-50/50 border dark:border-green-500/10 border-green-200 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200 mt-4 font-sans font-bold">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-green-700 dark:text-green-500 uppercase tracking-tight font-bold">{isHindi ? "इको-फ्रेंडली पैकिंग" : "Eco-Friendly Packaging"}</p>
                  <p className="text-[8px] text-neutral-700 dark:text-gray-400 font-bold">{isHindi ? "चम्मच / टिश्यू पेपर की आवश्यकता नहीं है" : "No spoon or tissue paper requested"}</p>
                </div>
                <input type="checkbox" checked={noCutlery} onChange={() => { triggerHaptic(); setNoCutlery(!noCutlery); }} className="w-4 h-4 accent-green-600" />
              </div>

              {/* 8. PAY SUMMARY CARD */}
              <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white mt-4 font-mono font-bold">
                <div className="flex justify-between font-bold mb-1.5 text-xs"><span>{isHindi ? "आइटम का टोटल" : "Items Total"}</span> <span>₹{getCartSubtotal()}</span></div>
                {getCartAddonsPrice() > 0 && <div className="flex justify-between font-bold mb-1.5 text-xs"><span>{isHindi ? "अतिरिक्त ऐड-ऑन्स" : "Extra Add-ons"}</span> <span>+₹{getCartAddonsPrice()}</span></div>}
                {appliedCoupon && (
                  <div className="flex justify-between font-bold mb-1.5 text-xs text-green-200 font-bold"><span>{isHindi ? "कूपन छूट" : "Coupon Discount"}</span> <span>-₹{appliedCoupon.discountValue}</span></div>
                )}
                {fulfillmentType === "delivery" && <div className="flex justify-between font-bold mb-3 text-xs opacity-90"><span>{isHindi ? "डिलीवरी शुल्क" : "Delivery Charge"}</span> <span>₹{getDeliveryCharge()}</span></div>}
                <div className="h-px bg-white/20 mb-3" />
                <div className="flex justify-between font-black text-xl font-bold font-mono"><span>{isHindi ? "भुगतान राशि" : "To Pay"}</span> <span>₹{getTotalBillPrice()}</span></div>
              </div>

              {/* 9. PAYMENT MODE TABS & WHATSAPP CHECKOUT */}
              <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                <label className="text-[9px] font-black uppercase text-neutral-800 dark:text-gray-400 font-bold">{isHindi ? "भुगतान का माध्यम चुनें:" : "Select Payment Method:"}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { triggerHaptic(); setPaymentMethod("cod"); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "cod" ? 'border-orange-500 bg-orange-500/10 text-orange-655 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-bold'}`}
                  >
                    <span className="text-sm">💵</span>
                    <span className="text-[9px] font-black">
                      {fulfillmentType === "delivery" 
                        ? (isHindi ? "कैश ऑन डिलीवरी" : "Cash on Delivery") 
                        : (isHindi ? "कैश काउंटर पेमेंट" : "Cash at Counter")
                      }
                    </span>
                  </button>
                  <button
                    onClick={() => { 
                      triggerHaptic(); 
                      setPaymentMethod("upi"); 
                      setIsUpiPopupOpen(true); 
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "upi" ? 'border-orange-500 bg-orange-500/10 text-orange-655 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-bold'}`}
                  >
                    <span className="text-sm">📱</span>
                    <span className="text-[9px] font-black">{isHindi ? "ऑनलाइन भुगतान (UPI)" : "Pay Online (UPI)"}</span>
                  </button>
                </div>

                {paymentMethod === "upi" && (
                  <div className="bg-[#111] p-3 rounded-2xl border border-white/5 space-y-2.5 text-center text-[10px] font-bold text-gray-300 font-sans">
                    <p className="text-yellow-400 uppercase tracking-wider font-bold">{isHindi ? "आसान ऑनलाइन पेमेंट" : "Instant UPI Checkout"} </p>
                    <p>{isHindi ? "कृपया आगे बढ़ने से पहले यूपीआई भुगतान पूरा करें और स्क्रीनशॉट अपलोड करें!" : "Kindly upload payment screenshot before ordering!"}</p>
                  </div>
                )}

                {/* ORDER BUTTON WITH WHATSAPP LOGO */}
                <button 
                  onClick={handleCheckoutClick} 
                  type="button" 
                  disabled={isSubmittingOrder} 
                  className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2 font-bold font-sans"
                >
                  {isSubmittingOrder ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Kripya thoda wait karein... ⏳
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <img src="/whatsapp.png" className="w-5 h-5 object-contain flex-shrink-0" alt="WhatsApp" />
                      <span>{isHindi ? "व्हाट्सएप पर ऑर्डर भेजें" : "ORDER ON WHATSAPP"}</span>
                    </span>
                  )}
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED INTERACTIVE UPI APP & SCREENSHOT POPUP */}
      <AnimatePresence>
        {isUpiPopupOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[130] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="dark:bg-[#111] bg-white border dark:border-white/10 border-neutral-200 p-6 rounded-[2.5rem] w-full max-sm relative shadow-2xl space-y-5 text-center font-sans"
            >
              <button 
                type="button" 
                onClick={() => { triggerHaptic(); setIsUpiPopupOpen(false); }}
                className="absolute top-4 right-4 p-2 bg-red-105 hover:bg-red-600 hover:text-white text-red-655 rounded-full transition-all shadow"
                title="Close"
              >
                <X size={16} />
              </button>

              <div className="space-y-1">
                <h3 className="text-base font-black text-orange-55 uppercase italic font-bold">
                  {isHindi ? "यूपीआई भुगतान गेटवे 📱" : "UPI Payment Gateway 📱"}
                </h3>
                <p className="text-[10.5px] text-neutral-605 dark:text-gray-400 font-semibold leading-relaxed">
                  {isHindi ? "कृपया नीचे दिए गए किसी भी ऐप को चुनकर ₹" + getTotalBillPrice() + " का भुगतान पूरा करें, फिर स्क्रीनशॉट अपलोड करें!" : "Choose an app to pay ₹" + getTotalBillPrice() + " and upload the screenshot below:"}
                </p>
              </div>

              {/* UPI Apps Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button 
                  onClick={() => handleLaunchUpiPay('phonepe')}
                  className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-purple-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
                >
                  <img src="/phonepe.png" className="w-5 h-5 object-contain" alt="PhonePe" />
                  <span className="text-[10px] font-black font-sans">PhonePe</span>
                </button>
                <button 
                  onClick={() => handleLaunchUpiPay('paytm')}
                  className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-blue-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
                >
                  <img src="/paytm.png" className="w-5 h-5 object-contain" alt="Paytm" />
                  <span className="text-[10px] font-black font-sans">Paytm</span>
                </button>
                <button 
                  onClick={() => handleLaunchUpiPay('gpay')}
                  className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-green-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
                >
                  <div className="w-5 h-5 bg-gradient-to-tr from-blue-500 via-red-500 to-yellow-500 rounded-full flex items-center justify-center text-[8px] text-white font-black">G</div>
                  <span className="text-[10px] font-black font-sans">GPay</span>
                </button>
                <button 
                  onClick={() => handleLaunchUpiPay('whatsapp')}
                  className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-green-600 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
                >
                  <img src="/whatsapp.png" className="w-5 h-5 object-contain" alt="WhatsApp Pay" />
                  <span className="text-[10px] font-black font-sans">WA Pay</span>
                </button>
              </div>

              {/* Interactive Screenshot Attachment Area */}
              <div className="bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 p-3 rounded-2xl text-left space-y-2.5 font-sans font-bold">
                <label className="text-[9.5px] font-black uppercase text-orange-600 block font-bold">
                  {isHindi ? "📸 भुगतान का स्क्रीनशॉट डालें (अनिवार्य):" : "📸 Upload Screenshot (Required):"}
                </label>
                
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={handleScreenshotChange}
                  className="w-full text-xs text-neutral-655 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-orange-500 file:text-black file:cursor-pointer hover:file:bg-orange-600 outline-none"
                />
                
                {isCompressing && (
                  <div className="flex items-center gap-1.5 text-orange-500 dark:text-orange-400 text-[9px] font-bold">
                    <Loader2 className="animate-spin" size={10} />
                    <span>Compressing Image, please wait...</span>
                  </div>
                )}
                
                {paymentScreenshot && (
                  <div className="relative w-20 h-24 border border-neutral-300 dark:border-white/10 rounded-xl overflow-hidden mt-1 bg-black/60 flex items-center justify-center mx-auto">
                    <img src={paymentScreenshot} className="w-full h-full object-cover" alt="Attachment Preview" />
                    <button 
                      type="button" 
                      onClick={() => { triggerHaptic(20); setPaymentScreenshot(null); }}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                      title="Remove Screenshot"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 font-bold font-sans">
                <button 
                  onClick={sendWhatsAppOrder}
                  disabled={!paymentScreenshot || isSubmittingOrder}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 font-bold"
                >
                  {isSubmittingOrder ? "Confirming..." : (isHindi ? "ऑर्डर सबमिट करें" : "Submit Order")}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsUpiPopupOpen(false)}
                  className="bg-neutral-105 hover:bg-neutral-200 dark:bg-white/5 text-neutral-705 dark:text-gray-400 px-4 py-3.5 rounded-xl font-bold text-xs transition-all font-bold"
                >
                  {isHindi ? "बंद करें" : "Cancel"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COMPACT INSTALL BANNER GUIDE MODAL */}
      <AnimatePresence>
        {isInstallModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[270] flex items-center justify-center p-6 font-sans">
            <div className="dark:bg-[#111] bg-white w-full max-sm p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-2xl transition-colors duration-200">
              <Sparkles className="mx-auto text-yellow-400 animate-bounce" size={32} />
              
              <div className="space-y-1">
                <h3 className="text-base font-black dark:text-white text-neutral-900">📲 आसान इंस्टॉलेशन गाइड</h3>
                <p className="text-[10px] text-neutral-600 dark:text-gray-400 font-bold leading-normal">
                  यदि व्यक्तिगत इंस्टॉल काम नहीं कर रहा है, तो आप नीचे दिए गए आसान चरणों से इसे होम स्क्रीन पर जोड़ सकते हैं:
                </p>
              </div>

              <div className="text-left text-xs space-y-3 text-neutral-800 dark:text-gray-300 font-medium border-y dark:border-white/5 border-neutral-200 py-4 font-sans font-bold">
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
                  <span>अब **'Install'** बटन दबाएं।  बम बम कैफ़े ऐप आपके फोन की होम स्क्रीन पर असली ऐप की तरह जुड़ जाएगा!</span>
                </p>
              </div>

              <button 
                onClick={() => { triggerHaptic(); setIsInstallModalOpen(false); }} 
                className="w-full bg-orange-500 text-white p-3.5 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow font-sans font-bold"
              >
                समझ गया, बंद करें
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SECURED GIFT POINTS MODAL */}
      <AnimatePresence>
        {isGiftModalOpen && (
          <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6 font-sans">
            <motion.form onSubmit={handleGiftPoints} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <Gift className="mx-auto text-yellow-400" size={32} />
              <div>
                <h3 className="text-lg font-black text-yellow-400 uppercase italic font-mono font-bold">Gift Loyalty Points</h3>
                <p className="text-[9px] text-neutral-505 font-semibold mt-0.5 font-sans">अपने पॉइंट्स किसी दोस्त को गिफ्ट करें</p>
              </div>
              <div className="space-y-3 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-bold">Friend's Phone Number</label>
                  <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} required className="w-full dark:bg-white/10 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none text-center font-mono font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-bold">Points to Gift (Your Pts: {customerPoints})</label>
                  <input type="number" placeholder="e.g. 10" value={giftPointsAmount} onChange={(e) => setGiftPointsAmount(e.target.value === "" ? "" : Number(e.target.value))} required className="w-full dark:bg-white/10 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none text-center font-mono font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-bold flex items-center gap-1"><Lock size={10}/> <span>Your 4-Digit Security PIN (सुरक्षा पिन)</span></label>
                  <input type="password" maxLength={4} placeholder="🔒 enter your pin" value={giftSenderPin} onChange={(e) => setGiftSenderPin(e.target.value)} required className="w-full dark:bg-white/10 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none text-center tracking-widest font-mono font-bold" />
                </div>
              </div>
              <div className="flex gap-2 font-sans font-bold">
                <button type="submit" disabled={isGiftingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1 font-bold">
                  {isGiftingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Gift Points 🎁</span>}
                </button>
                <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(false); setGiftPhone(""); setGiftPointsAmount(""); setGiftSenderPin(""); }} className="bg-neutral-105 text-neutral-800 dark:bg-white/5 dark:text-gray-400 font-bold p-3 rounded-xl text-xs font-bold">CANCEL</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* VERIFIED SOCIAL POINTS CLAIM MODAL */}
      <AnimatePresence>
        {isClaimModalOpen && claimingPlatform && (
          <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6 font-sans">
            <motion.form 
              onSubmit={handleClaimSubmit}
              className="dark:bg-[#111] bg-white w-full max-sm p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-xl font-sans"
            >
              <img src={claimingPlatform.icon} className="w-10 h-10 object-contain mx-auto" alt="" loading="lazy" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-orange-655 dark:text-orange-500 uppercase font-bold">वेरिफिकेशन दावा सबमिट करें</h3>
                <p className="text-[10px] text-neutral-605 leading-normal font-semibold">
                  {claimingPlatform.label} पर फॉलो/सब्सक्राइब करने के बाद, नीचे अपना यूज़रनेम दर्ज करें। हमारे एडमिन इसकी जांच करके आपका {claimingPlatform.points} पॉइंट क्रेडिट करेंगे!
                </p>
              </div>

              <div className="space-y-1 text-left font-sans font-bold">
                <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400 font-sans font-bold">Your Profile Handle / Username</label>
                <input 
                  type="text" 
                  placeholder="e.g. @yourname" 
                  value={claimUsername} 
                  onChange={(e) => setClaimUsername(e.target.value)} 
                  required 
                  className="w-full dark:bg-white/10 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-xl text-xs font-bold text-neutral-900 dark:text-white outline-none text-center font-mono font-bold" 
                />
              </div>

              <div className="flex gap-2 font-bold font-sans">
                <button type="submit" disabled={isClaimingLoading} className="flex-1 bg-yellow-400 text-black font-black p-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1 font-bold font-sans">
                  {isClaimingLoading ? <Loader2 className="animate-spin" size={14} /> : <span>Claim Reward Request ➔</span>}
                </button>
                <button 
                  type="button" 
                  onClick={() => { triggerHaptic(); setIsClaimModalOpen(false); setClaimUsername(""); }} 
                  className="bg-neutral-105 text-neutral-805 dark:bg-white/5 dark:text-gray-400 p-3 rounded-xl font-black text-xs uppercase font-bold font-sans"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
