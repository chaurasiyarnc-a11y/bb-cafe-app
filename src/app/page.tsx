

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
    veggies: { onion: 20, capsicum: 20, corn: 20 },
    black_olive: 50, jalapeno: 50, red_peprica: 40, paneer: 50, mushroom: 50
  }
};

const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

const SOCIAL_LINKS = [
  { id: 'facebook', label: '🔵 Facebook', icon: '📘', points: 1, url: 'https://www.facebook.com/bbcafe.in/' },
  { id: 'instagram', label: '📸 Instagram', icon: '📸', points: 1, url: 'https://www.instagram.com/bbcafe.in/' },
  { id: 'whatsapp_channel', label: '📢 WhatsApp Channel', icon: '📢', points: 1, url: 'https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y' },
  { id: 'snapchat', label: '👻 Snapchat', icon: '👻', points: 1, url: 'https://www.snapchat.com/add/bbcafe.in' },
  { id: 'youtube', label: '🔴 YouTube', icon: '🎥', points: 1, url: 'https://www.youtube.com/@bbcafe.i' }
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
  const [menu, setMenu] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);
  const [isBannerEnabled, setIsBannerEnabled] = useState(true); 
  const [isInlineBannerEnabled, setIsInlineBannerEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [whatsappNumber, setWhatsappNumber] = useState("919714293759");
  const [storeCoordinates, setStoreCoordinates] = useState({ lat: 24.2863, lng: 80.1245 });

  // Store Timings
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
  const [tableNumber, setTableNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");

  // Multi-language Toggle State (Default to Hindi)
  const [isHindi, setIsHindi] = useState(true);

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

  // DIY PIZZA STATES
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

  // --- HELPERS & CALCULATION FUNCTIONS ---

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
      Math.sin(dLon/2) * dLon/2;
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

  // --- MISSING ACTION FUNCTIONS & HELPERS ---

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

  const handleAddDiyPizzaToCart = () => {
    triggerHaptic();
    const selectedVeggies = Object.entries(diyVegSelection)
      .filter(([_, active]) => active)
      .map(([name]) => name)
      .join(', ');
    const selectedToppings = Object.entries(diyPremiumToppings)
      .filter(([_, active]) => active)
      .map(([name]) => name)
      .join(', ');
    
    const noteParts = [];
    if (selectedVeggies) noteParts.push(`Veggies: ${selectedVeggies}`);
    if (selectedToppings) noteParts.push(`Toppings: ${selectedToppings}`);
    if (diyChefNote) noteParts.push(`Note: ${diyChefNote}`);
    
    const item = {
      id: `diy-pizza-${Date.now()}`,
      name: `DIY Pizza (${diySize.toUpperCase()}) 🍕`,
      price: calculatedDiyPizzaPrice,
      quantity: 1,
      note: noteParts.join(' | ') || "Customized Pizza"
    };
    
    addItem(item);
    playSoundEffect('add');
    toast.success(isHindi ? "कस्टम पिज्जा कार्ट में जोड़ा गया!" : "Custom Pizza added to cart!");
    
    // Reset state
    setDiyVegSelection({ onion: false, tomato: false, capsicum: false, corn: false });
    setDiyPremiumToppings({ black_olive: false, jalapeno: false, red_peprica: false, paneer: false, mushroom: false });
    setDiyChefNote("");
  };

  const handleNormalPizzaAdd = () => {
    triggerHaptic();
    if (!normalPizzaSize) {
      toast.error(isHindi ? "कृपया आकार चुनें!" : "Please select a size!");
      return;
    }
    
    const selectedAddons = Object.entries(normalPizzaAddons)
      .filter(([_, active]) => active)
      .map(([name]) => name);
      
    const addonsPrice = selectedAddons.reduce((acc, addon) => {
      return acc + (PIZZA_ADDONS[normalPizzaSize.toLowerCase()]?.[addon] || 0);
    }, 0);
    
    const finalPrice = normalPizzaPrice + addonsPrice;
    
    const noteParts = [];
    if (selectedAddons.length > 0) noteParts.push(`Add-ons: ${selectedAddons.join(', ')}`);
    if (chefNote) noteParts.push(`Note: ${chefNote}`);
    
    const cartItem = {
      id: `${selectedProduct.id}-${normalPizzaSize}`,
      name: `${selectedProduct.name} (${normalPizzaSize.toUpperCase()})`,
      price: finalPrice,
      quantity: 1,
      note: noteParts.join(' | ')
    };
    
    addItem(cartItem);
    playSoundEffect('add');
    toast.success(isHindi ? `${selectedProduct.name} कार्ट में जोड़ा गया!` : `${selectedProduct.name} added to cart!`);
    
    // Reset states
    setSelectedProduct(null);
    setNormalPizzaSize("");
    setNormalPizzaPrice(0);
    setNormalPizzaAddons({});
    setChefNote("");
  };

  const handleReelEnded = () => {
    const currentIndex = stories.findIndex(s => s.id === activeStory.id);
    if (currentIndex !== -1 && currentIndex < stories.length - 1) {
      setActiveStory(stories[currentIndex + 1]);
    } else {
      setActiveStory(null);
    }
  };

  const handleQuickAddFromStory = (title: string, price: number) => {
    triggerHaptic();
    const matchedItem = menu.find(m => m.name.toLowerCase() === title.toLowerCase());
    if (matchedItem) {
      if (matchedItem.variants) {
        setSelectedProduct(matchedItem);
        setActiveStory(null);
        return;
      }
      addItem(matchedItem);
    } else {
      addItem({
        id: `reel-${Date.now()}`,
        name: title,
        price: price,
        quantity: 1
      });
    }
    playSoundEffect('add');
    toast.success(isHindi ? "रील्स से आइटम कार्ट में जोड़ा गया!" : "Added from reels!");
    setActiveStory(null);
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
      toast.success(isHindi ? "समीक्षा सबमिट हो गई! एडमिन द्वारा वेरीफाई करने के बाद दिखेगी।" : "Review submitted! Will show post verification.");
      setReviewName("");
      setReviewComment("");
      setReviewRating(5);
      setIsReviewFormOpen(false);
    } catch (error) {
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

  const handleShareApp = async () => {
    triggerHaptic();
    const shareText = `हे! मोहांद्रा में बम बम कैफे से स्वादिष्ट पिज्जा और थाली ऑर्डर करें। ऑर्डर करने पर लॉयल्टी पॉइंट्स भी मिलते हैं! ऐप इंस्टॉल करें: https://bb-cafe-app.vercel.app/ मेरा इनवाइट कोड: ${getReferralCode()}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bum Bum Cafe',
          text: shareText,
          url: 'https://bb-cafe-app.vercel.app/'
        });
        
        const nextCount = shareCount + 1;
        setShareCount(nextCount);
        if (nextCount >= 5) {
          setShareCount(0);
          if (customerDetails?.phone) {
            const phoneClean = customerDetails.phone.replace("+91", "");
            await setDoc(doc(db, "customer_points", phoneClean), {
              points: increment(1)
            }, { merge: true });
            toast.success(isHindi ? "बधाई हो! आपने 5 बार शेयर करके 1 मुफ्त पॉइंट कमाया! 🎉" : "Congratulations! You earned 1 free point for sharing 5 times! 🎉");
          }
        } else {
          toast.success(isHindi ? `शेयर पूरा हुआ! ${5 - nextCount} बार और शेयर करें पॉइंट पाने के लिए।` : `Shared! Share ${5 - nextCount} more times to earn a point.`);
        }
      } catch (e) {
        // Cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success(isHindi ? "शेयर संदेश क्लिपबोर्ड पर कॉपी हो गया! दोस्तों को भेजें।" : "Share text copied to clipboard! Share with friends.");
        const nextCount = shareCount + 1;
        setShareCount(nextCount);
        if (nextCount >= 5) {
          setShareCount(0);
          if (customerDetails?.phone) {
            const phoneClean = customerDetails.phone.replace("+91", "");
            await setDoc(doc(db, "customer_points", phoneClean), {
              points: increment(1)
            }, { merge: true });
            toast.success(isHindi ? "बधाई हो! आपने 5 बार शेयर करके 1 मुफ्त पॉइंट कमाया! 🎉" : "Congratulations! You earned 1 free point for sharing 5 times! 🎉");
          }
        }
      } catch (err) {
        toast.error("Sharing failed.");
      }
    }
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!customerDetails?.phone) {
      toast.error(isHindi ? "कृपया पहले अपनी प्रोफाइल सेटअप करें!" : "Please set up your profile first!");
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

  // --- MEMOS ---

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
      return { bg: "from-rose-600 to-amber-800", accent: "text-yellow-300", name: "रक्षाबंधन विशेष स्नेह 💖" };
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

    const dedupedList = Array.from(new Set(result));
    
    // Inject "DIY Pizza" between Favorites and All dynamically
    const finalWithDiy: string[] = [];
    dedupedList.forEach(cat => {
      if (cat === "All") {
        finalWithDiy.push("DIY Pizza"); 
      }
      finalWithDiy.push(cat);
    });

    return Array.from(new Set(finalWithDiy));
  }, [dbCategories]);

  const upsellSuggestionItems = useMemo(() => {
    return menu.filter(item => {
      const isShake = item?.category === "Super Cool" || item?.category === "Fast Food";
      const notInCart = !cart.some((c: any) => c.id === item.id);
      return isShake && notInCart;
    }).slice(0, 2);
  }, [menu, cart]);

  const ecoCutlerySaves = useMemo(() => {
    return pastOrders.filter(o => o.noCutlery === true).length;
  }, [pastOrders]);

  // Social Proof alerts
  useEffect(() => {
    if (socialProofs.length === 0) return;
    const interval = setInterval(() => {
      setSocialAlertIndex((prev) => (prev + 1) % socialProofs.length);
      setShowSocialAlert(true);
      
      setTimeout(() => {
        setShowSocialAlert(false);
      }, 7000); 
    }, 80000); 

    return () => clearInterval(interval);
  }, [socialProofs]);

  // Real-time Live Order Tracking (Client-side sorting)
  useEffect(() => {
    if (!customerDetails?.phone) return;
    
    const qOrders = query(
      collection(db, "orders"),
      where("customerPhone", "==", customerDetails.phone)
    );

    const unsubLiveOrder = onSnapshot(qOrders, (snap) => {
      if (!snap.empty) {
        const userOrders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        userOrders.sort((a, b) => {
          const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
          const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
          return tB.getTime() - tA.getTime();
        });

        const latestOrder = userOrders[0];

        let dismissedIds: string[] = [];
        try {
          dismissedIds = JSON.parse(localStorage.getItem('bb_dismissed_rejected_orders') || '[]');
        } catch (e) {}

        if (latestOrder && latestOrder.status !== 'delivered') {
          if (latestOrder.status === 'rejected' && dismissedIds.includes(latestOrder.id)) {
            setLiveOrder(null);
          } else {
            setLiveOrder(latestOrder);
          }
        } else {
          setLiveOrder(null);
        }
      } else {
        setLiveOrder(null);
      }
    }, (err) => {
      console.error("Live order tracking error:", err);
    });

    return () => unsubLiveOrder();
  }, [customerDetails?.phone]);

  // Sync user points immediately after profile setup
  useEffect(() => {
    if (!customerDetails?.phone) return;
    const phoneClean = customerDetails.phone.replace("+91", "").trim();
    const unsubUserPoints = onSnapshot(doc(db, "customer_points", phoneClean), (snap) => {
      if (snap.exists()) {
        setCustomerPoints(snap.data().points || 0);
      }
    });
    return () => unsubUserPoints();
  }, [customerDetails?.phone]);

  // Real-time points history observer
  useEffect(() => {
    if (!customerDetails?.phone) return;
    const phoneClean = customerDetails.phone.replace("+91", "").trim();
    const qHistory = query(
      collection(db, "customer_points", phoneClean, "history"),
      orderBy("timestamp", "desc"),
      limit(10)
    );
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      setPointsHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.log("History subcollection read error:", err);
    });
    return () => unsubHistory();
  }, [customerDetails?.phone]);

  // Load Past Order History & Favorites on Mount
  useEffect(() => {
    const savedOrders = localStorage.getItem('bb_past_orders');
    if (savedOrders) {
      try {
        setPastOrders(JSON.parse(savedOrders));
      } catch (e) {}
    }
    const savedFavorites = localStorage.getItem('bb_favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {}
    }
  }, []);

  // Auto-Sliding Promo Banner
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4000); 
    return () => clearInterval(interval);
  }, [banners]);

  // --- INITIAL DATABASE LOAD AND SYNC ---
  useEffect(() => {
    setMounted(true);

    // FontAwesome Dynamic Loader
    if (!document.getElementById("fa-css")) {
      const link = document.createElement("link");
      link.id = "fa-css";
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      document.head.appendChild(link);
    }

    // Capture PWA Install Promotion
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('bb_app_installed_or_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    // Monitor Online/Offline Status
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

    // Dynamic WhatsApp Number, Timings, background video, and Promo Banner Switch
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => { 
      if (d.exists()) {
        const storeData = d.data();
        setStoreOpen(storeData.isOpen);
        
        // Admin Dynamic Toggle for Promo Banner
        if (storeData.isBannerEnabled !== undefined) {
          setIsBannerEnabled(storeData.isBannerEnabled);
        } else if (storeData.showPromoBanner !== undefined) {
          setIsBannerEnabled(storeData.showPromoBanner);
        }

        // Inline Banner Config
        if (storeData.isInlineBannerEnabled !== undefined) {
          setIsInlineBannerEnabled(storeData.isInlineBannerEnabled);
        } else if (storeData.showInlinePromo !== undefined) {
          setIsInlineBannerEnabled(storeData.showInlinePromo);
        }

        if (storeData.whatsappNumber) {
          setWhatsappNumber(storeData.whatsappNumber);
        }
        if (storeData.latitude && storeData.longitude) {
          setStoreCoordinates({ lat: Number(storeData.latitude), lng: Number(storeData.longitude) });
        }

        if (storeData.timingHindi) {
          setStoreTimingHindi(storeData.timingHindi);
        } else if (storeData.openingTime && storeData.closingTime) {
          setStoreTimingHindi(`सुबह ${storeData.openingTime} से रात ${storeData.closingTime}`);
        }

        if (storeData.timingEnglish) {
          setStoreTimingEnglish(storeData.timingEnglish);
        } else if (storeData.openingTime && storeData.closingTime) {
          setStoreTimingEnglish(`${storeData.openingTime} to ${storeData.closingTime}`);
        }
        
        if (storeData.closingTime) {
          try {
            const [closeH, closeM] = storeData.closingTime.split(':').map(Number);
            const now = new Date();
            const closeDate = new Date();
            closeDate.setHours(closeH, closeM, 0, 0);
            
            const diffMs = closeDate.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins > 0 && diffMins <= 60) {
              setClosingMinutesLeft(diffMins);
            } else {
              setClosingMinutesLeft(null);
            }
          } catch (e) {
            setClosingMinutesLeft(null);
          }
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
    
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => { 
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });
    const unsubStories = onSnapshot(collection(db, "reels"), (snap) => { 
      setStories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    // Enhanced snapshot listener to correctly resolve reviews
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      const approved = fetched.filter((r: any) => 
        r.isApproved === true || 
        r.isApproved === "true" || 
        r.isApproved === "approved" || 
        r.isApproved === "Approved" ||
        r.approved === true ||
        r.approved === "true"
      );
      setReviews(approved);
    });

    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => { setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });

    return () => { 
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      }
      unsubStore(); 
      unsubMenu(); 
      unsubCats(); 
      unsubBanners(); 
      unsubStories();
      unsubReviews(); 
      unsubRules(); 
    };
  }, []);

  // Dine-In QR table allocation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableNum = params.get('table');
      if (tableNum) {
        setFulfillmentType("table");
        setTableNumber(tableNum);
        setAddress(`Dine-In: Table Number ${tableNum} 🍽️`);
        setSelectedArea({ name: "Dine-In (Table)", fee: 0, minFree: 0, range: "Inside Cafe" });
        toast.success(`🍽️ Welcome to Table ${tableNum}! Direct table self-ordering is now active.`);
      }
    }
  }, []);

  // Greeting disappears after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreeting(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

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
    setShowInstallBanner(false);
    localStorage.setItem('bb_app_installed_or_dismissed', 'true');
  };

  const handleDismissInstallBanner = () => {
    triggerHaptic(20);
    setShowInstallBanner(false);
    localStorage.setItem('bb_app_installed_or_dismissed', 'true');
  };

  // --- ACTIONS ---

  const handleApplyCoupon = async () => {
    triggerHaptic();
    if (!enteredCoupon) return toast.error(isHindi ? "कृपया कूपन कोड दर्ज करें" : "Please enter a coupon code");
    const codeClean = enteredCoupon.trim().toUpperCase();
    const toastId = toast.loading(isHindi ? "सत्यापन किया जा रहा है..." : "Verifying...");
    
    try {
      const couponRef = doc(db, "coupons", codeClean);
      const couponSnap = await getDoc(couponRef);
      
      toast.dismiss(toastId);
      if (couponSnap.exists()) {
        const data = couponSnap.data();
        setAppliedCoupon({ id: couponSnap.id, code: codeClean, ...data });
        toast.success(isHindi ? `कूपन '${codeClean}' लागू हो गया! ₹${data.discountValue} की छूट` : `Coupon '${codeClean}' applied! ₹${data.discountValue} OFF`);
      } else {
        toast.error(isHindi ? "यह कूपन कोड मान्य नहीं है!" : "Invalid coupon code!");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(isHindi ? "कूपन चेक करने में समस्या आई।" : "Error verifying coupon.");
    }
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

        if (calculatedDistance <= 2.0) {
          setSelectedArea(DELIVERY_AREAS[0]); 
          toast.success(`सटीक दूरी: ${calculatedDistance.toFixed(2)} KM। आपके लिए 'Mohandra Town' क्षेत्र चुना गया है।`);
        } else if (calculatedDistance <= 5.0) {
          setSelectedArea(DELIVERY_AREAS[1]); 
          toast.success(`सटीक दूरी: ${calculatedDistance.toFixed(2)} KM। आपके लिए 'Bum Bum Cafe से 5km के दायरे में' क्षेत्र चुना गया है।`);
        } else {
          setSelectedArea(DELIVERY_AREAS[2]); 
          toast.success(`सटीक दूरी: ${calculatedDistance.toFixed(2)} KM। आपके लिए '12km के दायरे में' क्षेत्र चुना गया है।`);
        }
      },
      () => {
        toast.dismiss(toastId);
        toast.error("लोकेशन की अनुमति अस्वीकार कर दी गई है या नेटवर्क त्रुटि है।");
      }
    );
  };

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
    if (customerPoints < pointsToGift) return toast.error(`आपके पास पर्याप्त पॉइंट्स नहीं हैं! वर्तमान पॉइंट्स: ${customerPoints}`);
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

      toast.success(`🎁 सफलतापूर्वक ${pointsToGift} पॉइंट्स गिफ्ट कर दिए गए हैं!`);
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
        toast.error(err.message === "Insufficient points balance!" ? "अपर्याप्त पॉइंट्स!" : "पॉइंट्स गिफ्ट करने में समस्या आई।");
      }
    } finally { setIsGiftingLoading(false); }
  };

  const handleCustomerRedeem = async (id: string, name: string, pointsCost: number) => {
    triggerHaptic();
    const currentPointsInCart = cart.reduce((acc: number, item: any) => acc + (item.pointsCost || 0), 0);
    if (customerPoints - currentPointsInCart < pointsCost) return toast.error("आपके पास पर्याप्त ऑयल्टी पॉइंट्स उपलब्ध नहीं हैं!");
    
    const enteredPin = prompt("सुरक्षा के लिए अपना 4-अंकों का सुरक्षा पिन (PIN) दर्ज करें:");
    if (!enteredPin) return;

    if (!customerDetails?.phone) return;
    const phoneClean = customerDetails.phone.replace("+91", "").trim();
    
    try {
      const userSnap = await getDoc(doc(db, "customer_points", phoneClean));
      if (userSnap.exists()) {
        const dbPin = userSnap.data().pin;
        if (dbPin && dbPin !== enteredPin) {
          return toast.error("गलत सुरक्षा पिन! रीडीम रद्द किया गया।");
        }
      }
    } catch (e) {
      return toast.error("पिन वेरिफिकेशन विफल रहा।");
    }

    addItem({ id, name, price: 0, pointsCost, isReward: true });
    playSoundEffect('add');
    toast.success(`${name} Cart में जोड़ दिया गया है!`);
  };

  const handleLaunchUpiPay = (app: 'phonepe' | 'paytm' | 'gpay' | 'whatsapp') => {
    triggerHaptic();
    const baseSub = getCartSubtotal();
    const addPrice = getCartAddonsPrice();
    const delivery = getDeliveryCharge();
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountValue) : 0;
    const finalTotal = Math.max(0, baseSub + addPrice - couponDiscount) + delivery;
    
    const upiId = "q231198993@ybl";
    const merchantName = "BUM BUM CAFE";
    const note = `OrderBill_UPI`;
    
    let deepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${finalTotal}&cu=INR&tn=${note}`;
    
    if (app === 'phonepe') {
      deepLink = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${finalTotal}&cu=INR&tn=${note}`;
    } else if (app === 'paytm') {
      deepLink = `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${finalTotal}&cu=INR&tn=${note}`;
    } else if (app === 'gpay') {
      deepLink = `tez://upi/pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${finalTotal}&cu=INR&tn=${note}`;
    }
    
    window.location.href = deepLink;
    toast.success(isHindi ? "भुगतान एप्लिकेशन खोला जा रहा है..." : "Opening payment app...");
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

    if (fulfillmentType === "table" && !tableNumber.trim()) {
      setIsSubmittingOrder(false);
      return toast.error(isHindi ? "कृपया टेबल नंबर दर्ज करें!" : "Please enter table number!");
    }

    // Force UPI screenshots strictly
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
    
    const modeLabel = fulfillmentType === "delivery" ? `Delivery (${selectedArea.name})` : fulfillmentType === "pickup" ? "Self-Pickup 🛍️" : `Dine-In (Table No. ${tableNumber}) 🍽️`;
    const payModeLabel = paymentMethod === "cod" ? "Cash on Delivery (COD) 💵" : "UPI Online Payment 📱";

    let msg = `🔥 *BAM BAM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Fulfillment Mode:* ${modeLabel}\n${fulfillmentType === 'delivery' ? `*Address:* ${address}\n` : ''}*Payment Method:* ${payModeLabel}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal + addOnsCost}\n*Coupon Discount:* -₹${couponDiscount}\n${fulfillmentType === 'delivery' ? `*Delivery:* ₹${deliveryCharge}\n` : ''}*TOTAL BILL: ₹${finalTotal}*\n\n🔑 *Delivery PIN:* ${deliveryPin} (Rider ko ye confirm karke hi order le)\n*Invite Code:* ${refCode}\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}`;
    
    if (paymentMethod === "upi") {
      msg += `\n\n📸 *भुगतान स्क्रीनशॉट:* एडमिन पैनल में भी बिल #${formattedBillStr} के साथ अपलोड कर दिया गया है!`;
    }

    msg += `\n\n_Confirm order by replying 'YES'_`;
    
    playSoundEffect('success');
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 5000);

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

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; 
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); 
          setPaymentScreenshot(compressedBase64);
          toast.success(isHindi ? "स्क्रीनशॉट सफलतापूर्वक अपलोड और कंप्रेस हो गया!" : "Screenshot uploaded & compressed successfully!");
        }
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCheckoutClick = () => {
    if (paymentMethod === 'upi') {
      setIsUpiPopupOpen(true);
    } else {
      sendWhatsAppOrder();
    }
  };

  const displayReviews = useMemo(() => {
    return reviews.length > 0 ? reviews : PERMANENT_REVIEWS;
  }, [reviews]);

  const hasManyReviews = useMemo(() => {
    return displayReviews.length > 10;
  }, [displayReviews]);

  if (!mounted) return null;

  return (
    <div className="dark:bg-[#050505] bg-gray-50 min-h-screen dark:text-white text-gray-900 pb-32 font-sans relative overflow-x-clip transition-colors duration-200">
      
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
          <span>आर्डर चेतावनी: बम बम कैफ़े अगले {closingMinutesLeft} minute में बंद होने वाला है! आर्डर जल्दी पूरा करें।</span>
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

      {/* PREMIUM HERO HEADER */}
      <header className="relative pt-6 pb-4 px-4 overflow-hidden shadow-xl flex flex-col justify-end min-h-[140px] bg-neutral-900">
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80" 
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
          alt="Bum Bum Cafe Header Background" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />

        <div className="relative z-20 max-w-[85%] mt-auto bg-black/35 backdrop-blur-sm p-2.5 rounded-xl border border-white/5 shadow-md">
          <motion.div
            initial={{ x: -25, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-0.5"
          >
            <span className="text-sm font-extrabold italic tracking-wide text-yellow-300 font-serif drop-shadow block leading-none mb-0.5">
              {isHindi ? "बम बम कैफ़े" : "Bum Bum Cafe"}
            </span>
            <h2 className="text-xs font-black text-white leading-none">
              {isHindi ? "स्वादिष्ट भोजन • तेज़ डिलीवरी" : "Delicious Food • Delivered Fast"}
            </h2>
            <p className="text-[7px] text-gray-300 font-bold">
              {isHindi ? "पिज्जा, स्पेशल सैंडविच और पनीर डिलाइट्स तुरंत ऑर्डर करें!" : "Order Pizza, Special Sandwich & Paneer Delights instantly!"}
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
      <div className="sticky top-0 z-40 dark:bg-[#050505]/95 bg-gray-50/95 backdrop-blur-md py-3 px-4 border-b dark:border-white/5 border-gray-200 transition-colors duration-200 shadow-sm">
        <div className="relative max-w-sm mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder={isHindi ? "पिज़्ज़ा, सैंडविच, पनीर स्पेशल खोजें..." : "Search pizza, sandwich, paneer special..."} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full dark:bg-neutral-800 bg-gray-100 dark:text-white text-neutral-900 py-2.5 px-11 rounded-xl outline-none text-xs font-semibold dark:placeholder-gray-400 placeholder-gray-500 border dark:border-neutral-700 border-gray-200 transition-colors duration-200" 
            />
          </div>

          {/* HINDI / ENGLISH LANGUAGE TOGGLE */}
          <button 
            onClick={() => { triggerHaptic(); setIsHindi(!isHindi); }}
            className="px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black tracking-wider flex-shrink-0 transition-all active:scale-95 shadow flex items-center gap-1"
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
            className="p-2.5 dark:bg-neutral-800 bg-gray-100 dark:text-white text-neutral-900 rounded-xl border dark:border-neutral-700 border-gray-200 hover:border-orange-500 hover:text-orange-500 transition-colors shadow flex-shrink-0"
            title="My Profile & Loyalty Rewards"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {!storeOpen && (
        <div className="bg-red-600 text-white font-black py-3 px-4 text-center text-xs flex items-center justify-center gap-2 shadow-lg border-b border-red-500">
          <span className="animate-pulse">⚠️</span>
          <span>{isHindi ? "बम बम कैफ़े अभी बंद है। आप केवल हमारा मेनू देख सकते हैं।" : "Bum Bum Cafe is closed now. You can only view our menu."}</span>
        </div>
      )}

      {/* MAIN LAYOUT WRAPPER */}
      <main ref={menuRef} className="pt-3 px-3 max-w-lg mx-auto space-y-4">

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
                <h4 className="text-xs font-black text-white">Bum Bum Cafe App</h4>
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
            <p className="text-[8px] font-black uppercase tracking-wider text-orange-500">{isHindi ? "खूबसूरत फ़ूड रील्स" : "Daily Food Reels"}</p>
            <div className="flex gap-4 overflow-x-auto py-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {stories.map((story) => (
                <button 
                  key={story.id} 
                  onClick={() => { triggerHaptic(); setActiveStory(story); }}
                  className="flex flex-col items-center flex-shrink-0 focus:outline-none"
                >
                  <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-600 relative">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-neutral-900 bg-neutral-800 flex items-center justify-center relative">
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
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* STICKY CATEGORY SLIDER */}
        <div className="sticky top-[64px] z-30 bg-gray-50/95 dark:bg-[#050505]/95 backdrop-blur-md py-2.5 px-1 border-b border-gray-200 dark:border-white/5 transition-all duration-200 shadow-sm">
          <div className="flex gap-5 overflow-x-auto py-2 px-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button onClick={() => setSelectedCategory("Favorites")} className="flex flex-col items-center flex-shrink-0 group outline-none">
              <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all flex items-center justify-center ${selectedCategory === "Favorites" ? 'border-red-500 scale-105 shadow-md' : 'dark:border-white/10 border-gray-200 bg-white dark:bg-neutral-900'}`}>
                <Heart size={24} className={selectedCategory === "Favorites" ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
              </div>
              <span className={`text-[9px] font-black uppercase mt-1.5 truncate ${selectedCategory === "Favorites" ? 'text-red-500' : 'dark:text-gray-400 text-neutral-800'}`}>{isHindi ? "पसंदीदा" : "My Favorites"}</span>
            </button>

            {visibleCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className="flex flex-col items-center flex-shrink-0 group outline-none">
                  <div className={`w-14 h-14 rounded-full overflow-hidden border transition-all ${isActive ? 'border-orange-500 scale-105 shadow-md' : 'dark:border-white/10 border-gray-200 bg-neutral-950'}`}>
                    {cat === "DIY Pizza" ? (
                      <div className="w-full h-full flex items-center justify-center text-lg bg-gradient-to-tr from-yellow-500 to-red-500 text-white">🍕</div>
                    ) : (
                      <img src={getCategoryImage(cat)} className="w-full h-full object-cover" alt={cat} />
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
          <div className="bg-orange-500/10 border border-orange-500/20 p-3.5 rounded-2xl flex items-center gap-3">
            <span className="text-xl">📍</span>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-orange-400 uppercase">{isHindi ? "अनुमानित दूरी" : "Estimated Distance"}</p>
              <p className="text-[9px] text-gray-400">{isHindi ? `आप बम बम कैफे से लगभग ${distanceKm} KM की दूरी पर हैं।` : `You are approximately ${distanceKm} KM away from Bum Bum Cafe.`}</p>
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
              <h3 className="text-lg font-black text-neutral-900 dark:text-white">{isHindi ? "अपने मन का पिज़्ज़ा बनाएं 🍕" : "Create Custom Pizza 🍕"}</h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">{isHindi ? "पसंद का बेस, सॉस, पनीर और मनपसंद वेजीज़ को टच करके अपनी रेसिपी तैयार करें!" : "Touch your preferred base, sauce, cheese and toppings to bake your own recipe!"}</p>
            </div>

            {/* Step 1: Base Crust Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "1. पिज़्ज़ा बेस चुनें:" : "1. Select Base Size:"}</label>
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
              <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "3. ताज़ा वेजीज़ जोड़ें:" : "3. Add Fresh Veggies:"}</label>
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
              <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "4. प्रीमियम एक्स्ट्रा टॉपिंग:" : "4. Premium Extra Toppings:"}</label>
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
              <label className="text-[10px] font-black uppercase text-orange-500">{isHindi ? "5. कुकिंग निर्देश:" : "5. Chef Instructions:"}</label>
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
                placeholder={isHindi ? "विशेष निर्देश दर्ज करें..." : "Enter custom instructions..."}
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
            {storeOpen ? (
              <button
                onClick={handleAddDiyPizzaToCart}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-all"
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
              <p className="text-center text-gray-500 py-8 text-xs font-bold uppercase font-sans">No items found...</p>
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
                          <span>🛵</span> <span>{isHindi ? "फ्री डिलीवरी" : "FREE delivery"}</span>
                        </div>

                        {!isItemAvailable && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="bg-red-600 text-white font-black text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-md">
                              {isHindi ? "आज उपलब्ध नहीं है" : "Out of Stock"}
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
                          <p className="uppercase text-[8px] dark:text-gray-500 text-gray-400">{item.category}</p><p>• 15-25 min</p>
                        </div>
                        <div className="h-px dark:bg-white/5 bg-gray-100 my-2.5" />
                        <div className="flex justify-between items-end mt-0.5">
                          <div>
                            <p className="dark:text-gray-500 text-gray-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">{isHindi ? "कीमत" : "Price"}</p>
                            <p className="text-orange-700 dark:text-orange-500 font-black text-base leading-none">{getDisplayPrice(item)}</p>
                            {item.variants && <span className="text-[8px] font-bold dark:text-gray-400 text-gray-500 mt-1 block">{isHindi ? "विकल्प उपलब्ध हैं" : "Options available"}</span>}
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
                        className="cursor-pointer bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white p-5 rounded-2xl shadow-lg border border-white/10 my-2 relative overflow-hidden group animate-none"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-110 transition-transform duration-500" />
                        <div className="relative z-10 flex justify-between items-center gap-4">
                          <div className="space-y-1.5">
                            <span className="bg-black/30 border border-white/20 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-yellow-300">
                              🎁 LOYALTY CLUB PROMO PASS
                            </span>
                            <h4 className="text-sm font-black italic tracking-tight">
                              {isHindi ? "फ्री पिज्जा, सैंडविच और शेक अनलॉक करें!" : "Unlock Free Pizza, Sandwich & Shakes!"}
                            </h4>
                            <p className="text-[10px] text-orange-100 font-bold leading-normal">
                              {customerDetails ? (
                                isHindi ? "आपका प्रोमो पास एक्टिवेटेड है! ✅ हर ₹100 पर 1 पॉइंट कमाएं। यहाँ क्लिक करके अपने रिवॉर्ड्स देखें ➔" : "Your promo pass is active! ✅ Earn 1 point per ₹100. Click here to view rewards ➔"
                              ) : (
                                isHindi ? "अपना Name और Number दर्ज करके इस पास को एक्टिवेट करें! 🎁 हर ₹100 पर 1 पॉइंट कमाएं। टच करें ➔" : "Enter your Name & Number to activate this pass! 🎁 Earn 1 point per ₹100. Tap to activate ➔"
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
                      <div className="w-full h-36 rounded-2xl overflow-hidden relative border border-white/5 bg-white/[0.02] my-2">
                        {(banners.length === 0 || bannerError) ? (
                          <div className="w-full h-full bg-gradient-to-r from-yellow-600/35 to-orange-800/35 flex flex-col justify-center p-5 space-y-1">
                            <span className="text-[8px] font-black uppercase text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full w-max">
                              {isHindi ? "ताज़ा स्वाद" : "Fresh Taste"}
                            </span>
                            <h3 className="text-sm font-black text-yellow-300">
                              {isHindi ? "शुद्ध और हाइजीनिक फास्ट फूड" : "PURE & HYGIENIC FAST FOOD"}
                            </h3>
                            <p className="text-[9px] text-gray-400">
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
        <div className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1">⭐ {isHindi ? "हमारे ग्राहकों के प्यारे शब्द" : "Feedback from our loved guests"}</h3>
            <span className="text-[9px] font-bold text-gray-400">{isHindi ? "कुल समीक्षाएं" : "Total Reviews"} ({displayReviews.length})</span>
          </div>
          
          <div className={hasManyReviews ? "max-h-[380px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-transparent" : "space-y-3.5"}>
            {displayReviews.map((r: any) => (
              <div key={r.id} className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl space-y-2 shadow-md shadow-gray-200/30 dark:shadow-none transition-colors duration-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs text-orange-500">{r.name}</h4>
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    {Array.from({ length: r.rating || 5 }).map((_, idx) => (
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
          <div className="bg-gradient-to-br dark:from-green-950/20 dark:to-emerald-900/10 from-green-50 to-emerald-50 p-6 rounded-[2rem] border dark:border-green-500/10 border-green-200 relative overflow-hidden transition-colors duration-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl" />
            
            <div className="text-center space-y-3 relative z-10 flex flex-col items-center">
              <span className="text-[9px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                {isHindi ? "हमारे बारे में" : "About Us"}
              </span>
              <h4 className="text-xl font-black italic text-yellow-300 tracking-tight font-serif">BUM BUM CAFE</h4>
              <p className="text-[11px] font-bold text-green-300">{isHindi ? "जहाँ स्वाद और सुकून मिलते हैं! ✨" : "Where Taste Meets Serenity! ✨"}</p>
              
              <p className="text-[11px] dark:text-gray-300 text-neutral-800 leading-relaxed max-w-sm mx-auto font-medium">
                {isHindi ? 
                  "हमने BAM BAM CAFE की शुरुआत एक छोटे से सपने के साथ की थी—लोगों को घर जैसा स्वाद और कैफे वाला माहौल देने के लिए। यहाँ हर कप कॉफी और हर स्लाइस पिज्जा प्यार और शुद्धता के साथ बनाया जाता है। हमारी कोशिश है कि आप जब भी यहाँ आएँ, एक प्यारी मुस्कान के साथ वापस जाएँ। ❤️" :
                  "We started BAM BAM CAFE with a simple dream - to serve hygienic, delicious, home-style fast food in Mohandra town. Every slice of pizza and plate of thali here is crafted with ultimate love, purity and hygiene. Feel free to dine-in or order online! ❤️"
                }
              </p>
            </div>
          </div>

          {/* Social Icons Container */}
          <div className="social-icons flex justify-center gap-5 py-4 dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 rounded-2xl shadow-sm">
            <a href="https://www.facebook.com/bbcafe.in/" target="_blank" rel="noreferrer" title="Facebook" className="hover:scale-110 transition-transform">
              <img src="/facebook.png" alt="Facebook" className="w-8 h-8 object-contain" />
            </a>
            <a href="https://www.instagram.com/bbcafe.in/" target="_blank" rel="noreferrer" title="Instagram" className="hover:scale-110 transition-transform">
              <img src="/instagram.png" alt="Instagram" className="w-8 h-8 object-contain" />
            </a>
            <a href="https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y" target="_blank" rel="noreferrer" title="WhatsApp Channel" className="hover:scale-110 transition-transform">
              <img src="/whatsapp.png" alt="WhatsApp Channel" className="w-8 h-8 object-contain" />
            </a>
            <a href="https://www.snapchat.com/add/bbcafe.in" target="_blank" rel="noreferrer" title="Snapchat" className="hover:scale-110 transition-transform">
              <img src="/snapchat.png" alt="Snapchat" className="w-8 h-8 object-contain" />
            </a>
            <a href="https://www.youtube.com/@bbcafe.i" target="_blank" rel="noreferrer" title="YouTube" className="hover:scale-110 transition-transform">
              <img src="/youtube.png" alt="YouTube" className="w-8 h-8 object-contain" />
            </a>
          </div>

          {/* Time & Location Grid */}
          <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-black uppercase">
            <div className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 shadow-md shadow-gray-200/30 dark:shadow-none transition-colors duration-200">
              <Clock className="text-orange-500" size={16} />
              <p className="dark:text-gray-400 text-gray-400 text-[8px]">{isHindi ? "खुलने का समय" : "Open Timing"}</p>
              <p className="dark:text-white text-neutral-800 text-[9px]">
                {isHindi ? storeTimingHindi : storeTimingEnglish}
              </p>
            </div>
            
            <a href="https://maps.app.goo.gl/8pj1Xby3bbMn5qxu5" target="_blank" rel="noreferrer" className="dark:bg-white/[0.02] bg-white border dark:border-white/5 border-gray-200 p-4 rounded-2xl flex flex-col items-center justify-center space-y-1 hover:border-orange-500/30 shadow-md shadow-gray-200/30 dark:shadow-none transition-all duration-200">
              <MapPin className="text-green-500 animate-bounce" size={16} />
              <p className="dark:text-gray-400 text-gray-400 text-[8px]">{isHindi ? "हमारा पता" : "Our Location"}</p>
              <p className="text-yellow-600 dark:text-yellow-400 text-[9px] underline">Google Map 🗺️</p>
            </a>
          </div>

          <div className="text-center text-[9px] text-gray-500 font-bold tracking-widest pt-2">
            © 2026 BUM BUM CAFE - MOHANDRA. ALL RIGHTS RESERVED.
          </div>
        </footer>
      </main>

      {/* STICKY FLOATING CART BUTTON / BOTTOM NAV */}
      <div className="fixed bottom-6 inset-x-0 z-[80] flex justify-center pointer-events-none">
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
                <span className="absolute -top-2.5 -right-2.5 bg-yellow-400 text-black text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-orange-600">
                  {cart.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="text-left leading-none">
                <p className="text-[8px] uppercase tracking-wider text-orange-200">{isHindi ? "कर्ट देखें" : "View Cart"}</p>
                <p className="text-xs font-black">₹{getTotalBillPrice()}</p>
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
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${liveOrder.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500 animate-pulse'}`} />
                <span className="text-gray-200">
                  {liveOrder.status === 'rejected' 
                    ? (isHindi ? "⚠️ आर्डर अलर्ट" : "⚠️ Order Alert")
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
                <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md text-[9px] uppercase font-black font-mono">
                  Token: #{liveOrder.tokenNumber}
                </span>
              )}
            </div>

            {liveOrder.status === 'rejected' ? (
              <div className="space-y-3 py-1">
                <p className="text-red-400 text-[10px] leading-relaxed font-black">
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
              <div className="space-y-1 mt-1">
                <div className="flex justify-between text-[8px] text-gray-400 uppercase">
                  <span className={liveOrder.status === 'pending' ? 'text-orange-400 font-extrabold' : ''}>{isHindi ? "स्वीकृति" : "Confirming"} ⏳</span>
                  <span className={liveOrder.status === 'preparing' ? 'text-yellow-400 font-extrabold' : ''}>{isHindi ? "तैयारी" : "Preparing"} 👨‍🍳</span>
                  <span className={liveOrder.status === 'out_for_delivery' ? 'text-blue-400 font-extrabold' : ''}>{isHindi ? "मार्ग में" : "On the Way"} 🛵</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-yellow-400 h-full transition-all duration-500" 
                    style={{ 
                      width: liveOrder.status === 'pending' ? '25%' : liveOrder.status === 'preparing' ? '65%' : '90%' 
                    }} 
                  />
                </div>
                <div className="flex gap-2 pt-1 border-t border-white/5 mt-1.5">
                  <a 
                    href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(liveOrder.billNumber)} का लाइव स्टेटस बताएं।`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-white/5 hover:bg-white/10 text-center text-[10px] text-yellow-400 py-1.5 rounded-xl border border-white/5 transition-all"
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
                className="w-full max-w-sm mx-auto bg-orange-50 hover:bg-orange-600 text-black py-4 rounded-2xl font-black text-xs uppercase shadow animate-none"
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
                {displayReviews.map((r: any) => (
                  <div key={r.id} className="dark:bg-white/[0.03] bg-white border dark:border-white/5 border-gray-200 rounded-2xl p-5 space-y-2 shadow-sm transition-colors duration-200">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs text-orange-500">{r.name}</h4>
                      <div className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded text-[9px]">
                        <Star size={8} fill="currentColor"/><span className="font-extrabold">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-[11px] dark:text-gray-300 text-neutral-800 italic">"{r.comment}"</p>
                  </div>
                ))}
              </div>
              <div className="fixed bottom-6 left-0 w-full px-6 z-50">
                <button onClick={() => { triggerHaptic(); setIsReviewFormOpen(true); }} className="w-full max-w-md mx-auto bg-orange-50 text-black py-3.5 rounded-2xl font-black text-xs uppercase">✍️ Write a Review</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* WRITING REVIEW FORM MODAL WITH INTEGRATED EXIT OPTIONS */}
      <AnimatePresence>
        {isReviewFormOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleReviewSubmit} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-xl transition-colors duration-200">
              <div className="flex justify-between items-center pb-2 border-b dark:border-white/10 border-gray-100">
                <h3 className="text-xl font-black text-orange-500 uppercase italic">{isHindi ? "आपकी समीक्षा" : "Your Feedback"}</h3>
                <button 
                  type="button" 
                  onClick={() => { triggerHaptic(); setIsReviewFormOpen(false); }} 
                  className="p-2 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-full transition-all duration-200 shadow"
                  title="Close Feedback"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">{isHindi ? "क्या नाम" : "Your Name"}</label>
                  <input type="text" placeholder={isHindi ? "अपना नाम दर्ज करें..." : "Enter your name..."} value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-lg text-xs dark:text-white text-neutral-900 focus:border-orange-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">{isHindi ? "रेटिंग" : "Rating"}</label>
                  <div className="flex gap-1 text-yellow-400 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={20} fill={reviewRating >= star ? "currentColor" : "none"} onClick={() => setReviewRating(star)} className="cursor-pointer" />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-500">{isHindi ? "पसंदीदा समीक्षा टच करें:" : "Quick Suggestions:"}</label>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {SUGGESTED_REVIEWS.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion}
                        onClick={() => setReviewComment(suggestion)}
                        className="dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-200 hover:border-orange-500/50 px-2 py-1 rounded-full text-[9px] dark:text-gray-300 text-neutral-800 font-bold transition-all text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase text-gray-500">{isHindi ? "समीक्षा टिप्पणी" : "Comments"}</label>
                  <textarea placeholder={isHindi ? "खाना कैसा लगा?..." : "How was the food?..."} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full dark:bg-white/5 bg-gray-50 border dark:border-white/10 border-gray-200 p-3 rounded-lg text-xs dark:text-white text-neutral-900 focus:border-orange-500 outline-none resize-none font-bold" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-orange-500 text-black font-black p-3 rounded-lg text-xs uppercase">{isHindi ? "जमा करें" : "SUBMIT"}</button>
                <button type="button" onClick={() => { triggerHaptic(); setIsReviewFormOpen(false); }} className="dark:bg-white/5 bg-gray-100 dark:text-gray-400 text-neutral-700 font-bold p-3 rounded-lg text-xs uppercase">{isHindi ? "बंद करें" : "CANCEL"}</button>
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
              <p className="text-orange-500 font-black mb-4 uppercase text-[8px] text-center">{isHindi ? "ऑर्डर कस्टमाइज़ करें" : "Customize Your Order"}</p>
              
              <div className="space-y-3 mb-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase">{isHindi ? "1. साइज चुनें:" : "1. Select Portion Size:"}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                    <button 
                      type="button" 
                      key={size} 
                      onClick={() => { setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} 
                      className={`p-3 rounded-xl flex flex-col items-center border transition-all ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'dark:bg-white/[0.03] bg-gray-50 dark:border-white/5 border-gray-200 dark:text-gray-400 text-neutral-800'}`}
                    >
                      <span className="capitalize text-xs font-black">{size}</span>
                      <span className="font-extrabold text-[10px] mt-1 dark:text-white text-neutral-900">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {normalPizzaSize && (selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-3 mb-4 border-t border-white/5 pt-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{isHindi ? "2. एक्स्ट्रा मसाला/टॉपिंग चुनें:" : "2. Select Add-ons:"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]) => {
                      const isSelected = !!normalPizzaAddons[addon];
                      return (
                        <button
                          type="button"
                          key={addon}
                          onClick={() => setNormalPizzaAddons(prev => ({ ...prev, [addon]: !prev[addon] }))}
                          className={`p-2.5 rounded-xl border flex justify-between items-center text-[9px] font-bold ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'dark:border-white/5 border-gray-200 dark:bg-white/[0.02] bg-gray-50 dark:text-gray-300'}`}
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
                <p className="text-[10px] font-bold text-gray-500 uppercase">{isHindi ? "शेफ के लिए विशेष निर्देश:" : "Special Note for Chef / Instructions:"}</p>
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
                  className="w-full text-xs p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 dark:text-white outline-none focus:border-orange-500 h-16 resize-none"
                />
              </div>

              <button type="button" onClick={handleNormalPizzaAdd} className="w-full bg-orange-500 text-black p-4 rounded-xl font-black text-xs uppercase animate-none">
                {isHindi ? "कर्ट में जोड़ने की पुष्टि करें" : "Confirm Add To Cart"}
              </button>
              <button type="button" onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setChefNote(""); }} className="w-full mt-3 dark:text-gray-400 text-neutral-400 font-black text-[10px] text-center uppercase">
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
              className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-gray-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200"
            >
              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white text-neutral-900 font-mono">{isHindi ? "मेरा खाता और लॉयल्टी" : "My Account & Loyalty"}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { triggerHaptic(); setIsProfileOpen(false); }} className="p-2.5 dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:text-white text-neutral-800 rounded-full transition-all"><X size={20} /></button>
                </div>
              </div>

              {!customerDetails ? (
                <form onSubmit={handleSaveDetails} className="space-y-4">
                  <div className="text-center space-y-1.5 pb-2">
                    <User className="mx-auto text-orange-500" size={32} />
                    <h3 className="text-sm font-black dark:text-white text-neutral-900">{isHindi ? "प्रोफाइल सेटअप करें" : "Set Up Profile"}</h3>
                    <p className="text-[10px] text-gray-400 font-semibold leading-normal">{isHindi ? "लॉयल्टी पॉइंट्स कमाने, सुरक्षित पिन सेटअप करने और आसान चेकआउट करने के लिए प्रोफाइल बनाएं!" : "Build your profile to unlock free loyalty codes, safety PIN checkout and fast orders!"}</p>
                  </div>
                  
                  <div className="space-y-3 text-left">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-550 uppercase">{isHindi ? "आपका नाम" : "Your Name"}</label>
                      <input type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-555 uppercase">{isHindi ? "मोबाइल नंबर" : "Mobile Number"}</label>
                      <input type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-555 uppercase flex items-center gap-1"><Lock size={10}/> <span>{isHindi ? "सुरक्षा पिन बनाएँ (4-अंक)" : "Create 4-Digit Security PIN"}</span></label>
                      <input type="password" maxLength={4} placeholder="e.g. 1234" value={tempPin} onChange={(e) => setTempPin(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs text-center tracking-widest" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-555 uppercase">{isHindi ? "इनवाइट कोड (वैकल्पिक)" : "Referral Code (Optional)"}</label>
                      <input type="text" placeholder="Enter invite code..." value={tempRefCode} onChange={(e) => setTempRefCode(e.target.value)} className="w-full dark:bg-neutral-800 bg-gray-50 border dark:border-neutral-700 border-gray-200 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-orange-500 text-black p-3.5 rounded-xl font-black text-xs uppercase shadow transition-all active:scale-95 mt-4">{isHindi ? "खाता बनाएं ➔" : "Create Account ➔"}</button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* USER ACCOUNT VIEW */}
                  <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 flex justify-between items-center transition-colors duration-200">
                    <div>
                      <p className="text-[8px] dark:text-gray-500 text-neutral-600 font-black uppercase">{isHindi ? "ग्राहक प्रोफ़ाइल" : "Customer Profile"}</p>
                      <h4 className="font-black text-base text-orange-500">{customerDetails.name}</h4>
                      <p className="text-xs dark:text-gray-400 text-neutral-700 font-semibold">{customerDetails.phone}</p>
                      <p className="text-[9px] text-yellow-600 dark:text-yellow-400 font-bold mt-1 uppercase">{isHindi ? "इन्वाइट कोड:" : "Invite Code:"} {getReferralCode()}</p>
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
                      <LogOut size={12}/> {isHindi ? "लॉगआउट" : "Logout"}
                    </button>
                  </div>

                  {/* Eco-Hero Badge */}
                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <p className="text-[8px] uppercase tracking-wider text-emerald-500 font-black">पर्यावरण संरक्षण ट्रैकर (Eco Impact)</p>
                      <h4 className="text-xs font-black dark:text-white text-neutral-900">
                        {isHindi ? `आपने बचाए: ` : "You Saved: "}<span className="text-emerald-500 text-sm font-black">{ecoCutlerySaves} {isHindi ? "प्लास्टिक चम्मच 🌳" : "Plastic Cutlery 🌳"}</span>
                      </h4>
                      <p className="text-[9px] text-gray-400 font-medium">{isHindi ? "चम्मच/टिश्यू न चुनकर आपने पर्यावरण की मदद की है।" : "By skipping plastic utensils, you actively protected nature!"}</p>
                    </div>
                    {ecoCutlerySaves >= 3 && (
                      <div className="bg-emerald-500 text-black px-3 py-1.5 rounded-full border border-emerald-400/30 font-black text-[9px] flex items-center gap-1 shadow animate-pulse">
                        <Award size={12}/>
                        <span>Eco-Hero 🍃</span>
                      </div>
                    )}
                  </div>

                  {/* LOYALTY SCOREBOARD CARD */}
                  <div className="dark:bg-yellow-400/5 bg-yellow-100 border border-yellow-300 dark:border-yellow-400/20 rounded-2xl p-4 space-y-3 transition-colors duration-200 shadow-md">
                    <div className="flex justify-between items-center border-b dark:border-white/10 border-yellow-200 pb-2">
                      <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase"><Gift size={12}/> <span>{isHindi ? "बम बम लॉयल्टी क्लब" : "Bum Bum Loyalty Club"}</span></div>
                      <span className={`text-[8px] font-black border px-2 py-0.5 rounded-full ${getCustomerTier(customerPoints).color}`}>
                        {getCustomerTier(customerPoints).name}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-2xl font-black dark:text-white text-neutral-900 leading-none">{customerPoints} <span className="text-[9px] dark:text-gray-500 text-neutral-700 font-black uppercase">Points</span></h4>
                        <p className="text-[8px] dark:text-gray-400 text-neutral-700 font-bold mt-1">{isHindi ? "₹100 खर्च करें = 1 पॉइंट पाएं!" : "Spend ₹100 = Get 1 Loyalty Point!"}</p>
                      </div>
                      <div className="text-right text-[8px] dark:text-yellow-400 text-amber-900 font-black space-y-0.5 uppercase max-h-20 overflow-y-auto no-scrollbar">
                        {loyaltyRules.map(rule => (<p key={rule.id}>🎁 {rule.pointsCost} Pts = {rule.rewardName}</p>))}
                      </div>
                    </div>

                    {/* REDESIGNED POINTS PASSBOOK LEDGER */}
                    {pointsHistory.length > 0 && (
                      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800/80 space-y-3">
                        <p className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                          <span>📜</span> {isHindi ? "पॉइंट्स पासबुक (लेन-देन विवरण):" : "Points Passbook & Ledger:"}
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {pointsHistory.map((h: any) => (
                            <div key={h.id} className="flex justify-between items-center bg-gray-50 dark:bg-neutral-900 p-3 rounded-xl border dark:border-neutral-800/60 border-gray-100 shadow-sm transition-colors duration-200">
                              <div className="space-y-1">
                                <span className="text-xs font-black text-neutral-800 dark:text-gray-200 block">{h.description}</span>
                                <span className="text-[9px] text-gray-400 font-bold block">
                                  {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : new Date(h.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-0.5 ${h.type === 'earn' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                {h.type === 'earn' ? '+' : '-'}{h.points} Pts
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-1.5 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="dark:text-gray-400 text-neutral-700 font-black uppercase">{isHindi ? "शेयर प्रोग्रेस:" : "Share Progress:"}</span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-black bg-yellow-100 dark:bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-300 dark:border-yellow-400/20">{shareCount}/5 Shared</span>
                      </div>
                      <button type="button" onClick={handleShareApp} className="w-full bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1 shadow-md transition-all">
                        <Share2 size={12}/>
                        <span>{isHindi ? "5 बार शेयर करके मुफ्त +1 पॉइंट कमाएं! 🎁" : "Share 5 times to earn +1 free point! 🎁"}</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[9px] dark:text-gray-400 text-neutral-700 font-bold uppercase">{isHindi ? "दोस्त को गिफ्ट करें:" : "Gift points to a friend:"}</span>
                      <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(true); }} className="bg-yellow-500/10 text-yellow-500 border border-yellow-400/20 px-2.5 py-1 rounded text-[8px] font-black uppercase">🎁 Gift Points</button>
                    </div>

                    {/* SOCIAL MEDIA CLAIM SECTION */}
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800/80">
                      <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase mb-1.5">{isHindi ? "सोशल मीडिया पर फॉलो करके पॉइंट्स कमाएं:" : "Earn Points by Following Us:"}</p>
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
                            className="flex items-center gap-1 bg-neutral-100 dark:bg-white/5 border dark:border-white/10 border-gray-200 px-2.5 py-1 rounded-full text-[9px] font-bold dark:text-gray-300 text-neutral-800 hover:border-yellow-400 transition-all"
                          >
                            <span>{link.icon}</span>
                            <span>{link.label.split(' ')[1]} (+{link.points} P)</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase">{isHindi ? "पॉइंट्स रिडीम करें (सीधे कार्ट में):" : "Redeem Points (Instantly adds to cart):"}</p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                        {loyaltyRules.map(rule => {
                          const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                          const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                          return (
                            <button key={rule.id} type="button" onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)} disabled={!isAffordable} className={`py-2 px-2 rounded text-[9px] font-black uppercase border truncate transition-all ${isAffordable ? 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-500' : 'bg-neutral-100 dark:bg-white/5 text-gray-500 dark:text-gray-500 border-neutral-200 dark:border-white/5 cursor-not-allowed'}`}>🎁 {rule.rewardName} ({rule.pointsCost} P)</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* REDESIGNED ORDER HISTORY */}
                  <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800/80 font-sans">
                    <h3 className="text-sm font-black dark:text-gray-200 text-neutral-900 uppercase flex items-center gap-1.5">
                      <History size={16} className="text-orange-500" />
                      <span>{isHindi ? "मेरा आर्डर इतिहास (विवरण):" : "My Order History Ledger:"}</span>
                    </h3>
                    {pastOrders.length > 0 ? (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {pastOrders.map((ord: any, index: number) => {
                          const formattedDate = ord.timestamp?.toDate ? ord.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : new Date(ord.timestamp).toLocaleString();
                          return (
                            <div key={index} className="bg-gray-50 dark:bg-neutral-900 border dark:border-neutral-800 border-gray-100 rounded-2xl p-4 space-y-3 shadow-md transition-colors duration-200">
                              <div className="flex justify-between items-center border-b dark:border-neutral-800 border-gray-200 pb-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-black text-orange-500">Bill: #{formatBillNumber(ord.billNumber || 0)}</span>
                                  <span className="text-[9px] text-gray-400 font-bold">{formattedDate}</span>
                                </div>
                                <span className="bg-green-600/10 text-green-500 dark:text-green-400 border border-green-500/20 px-2.5 py-1 rounded-lg text-[9px] font-black">
                                  Token: #{ord.tokenNumber || "N/A"}
                                </span>
                              </div>
                              
                              <div className="space-y-1.5">
                                {ord.items.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between text-xs font-bold text-neutral-800 dark:text-gray-300">
                                    <span>{it.name} <span className="text-orange-500 text-[10px]">x{it.quantity}</span></span>
                                    <span>₹{it.price * it.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              
                              <div className="border-t border-dashed dark:border-neutral-800 border-gray-200 pt-2.5 flex justify-between items-center text-xs font-black">
                                <span className="text-gray-500">{isHindi ? "कुल भुगतान राशि:" : "To Pay Amount:"}</span>
                                <span className="text-sm text-green-500 dark:text-green-400">₹{ord.total}</span>
                              </div>

                              <a 
                                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`नमस्ते बम बम कैफ़े! कृपया मेरे आर्डर नंबर #${formatBillNumber(ord.billNumber)} (टोकन नंबर: #${ord.tokenNumber}) का लाइव स्टेटस बताएं।`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white dark:bg-white/5 hover:dark:bg-white/10 text-center text-[10px] font-black py-2.5 rounded-xl block border dark:border-neutral-800 border-orange-500/20 transition-all"
                              >
                                Track Live Status on WA 🔍
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-6 text-[10px] font-bold uppercase tracking-wider">
                        {isHindi ? "अभी तक कोई आर्डर नहीं मिला। स्वादिष्ट आर्डर शुरू करें! 🍕" : "No orders found yet. Grab some food! 🍕"}
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-end"
          >
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-gray-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200"
            >
              {/* STICKY LIVE BILL TOTAL AT THE TOP OF THE CART DRAWER */}
              <div className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md p-3 rounded-2xl border border-white/5 flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-gray-400">{isHindi ? "लाइव बिल टोटल:" : "LIVE BILL TOTAL:"}</span>
                <span className="text-sm font-black text-yellow-400">₹{getTotalBillPrice()}</span>
              </div>

              <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white text-neutral-900 font-mono">{isHindi ? "आपका कर्ट आर्डर" : "Your Order Cart"}</h2>
                <button onClick={() => { triggerHaptic(); setIsCartOpen(false); }} className="p-2.5 dark:bg-white/5 bg-gray-100 hover:dark:bg-white/10 hover:bg-gray-200 dark:text-white text-neutral-800 rounded-full transition-all"><X size={20} /></button>
              </div>

              {/* 1. CART ITEMS LIST */}
              {cart.map((item: any) => (
                <div key={item.id} className="flex flex-col dark:bg-white/[0.02] bg-white p-4 rounded-2xl mb-3 border dark:border-white/5 border-gray-200 shadow-sm transition-colors duration-200 gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="min-w-0 pr-3">
                      <h4 className="font-bold text-xs dark:text-gray-100 text-neutral-900 truncate">{item?.name || "Item"}</h4>
                      <p className="text-orange-500 font-black mt-1 text-[11px]">₹{item?.price || 0}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-xl border border-white/10 flex-shrink-0">
                      <button onClick={() => { triggerHaptic(); removeItem(item.id); }} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded text-sm font-black">-</button>
                      <span className="font-black text-xs px-1 dark:text-white text-neutral-900">{item.quantity}</span>
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

              {/* 2. ORDER FULFILLMENT MODE BUTTONS */}
              <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 space-y-2 mt-4 transition-colors duration-200">
                <label className="text-[10px] font-black uppercase dark:text-gray-400 text-neutral-800">{isHindi ? "ऑर्डर का माध्यम चुनें:" : "Select Order Mode:"}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { triggerHaptic(); setFulfillmentType("delivery"); }}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "delivery" ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'dark:border-white/5 border-gray-200 dark:text-gray-300'}`}
                  >
                    <span className="text-base">🛵</span>
                    <span className="text-[9px] font-black">{isHindi ? "होम डिलीवरी" : "Home Delivery"}</span>
                  </button>
                  <button
                    onClick={() => { triggerHaptic(); setFulfillmentType("pickup"); }}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "pickup" ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'dark:border-white/5 border-gray-200 dark:text-gray-300'}`}
                  >
                    <span className="text-base">🛍️</span>
                    <span className="text-[9px] font-black">{isHindi ? "सेल्फ-पिकअप" : "Self-Pickup"}</span>
                  </button>
                  <button
                    onClick={() => { triggerHaptic(); setFulfillmentType("table"); }}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "table" ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'dark:border-white/5 border-gray-200 dark:text-gray-300'}`}
                  >
                    <span className="text-base">🍽️</span>
                    <span className="text-[9px] font-black">{isHindi ? "टेबल ऑर्डर" : "Dine-In (Table)"}</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                
                {/* 3. FREE DELIVERY PROGRESS BAR */}
                {fulfillmentType === "delivery" && (
                  <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
                    <label className="text-[9px] font-black uppercase dark:text-gray-400 text-neutral-800">{isHindi ? "डिलीवरी का क्षेत्र चुनें (KM):" : "Select Delivery Zone (KM):"}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DELIVERY_AREAS.map((area) => {
                        const isSelected = selectedArea.name === area.name;
                        return (
                          <button
                            type="button"
                            key={area.name}
                            onClick={() => { triggerHaptic(); setSelectedArea(area); }}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-205 active:scale-95 ${
                              isSelected 
                                ? 'border-orange-500 bg-orange-500/10 text-orange-600 shadow-md' 
                                : 'dark:border-white/5 border-gray-200 dark:bg-white/[0.01] bg-gray-50 dark:text-neutral-300 text-neutral-900 hover:border-gray-300 hover:dark:border-white/10'
                            }`}
                          >
                            <span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span>
                            <div className="flex justify-between items-center w-full mt-2">
                              <span className="text-[8px] font-black dark:text-neutral-300 text-neutral-800">शुल्क: ₹{area.fee}</span>
                              <span className="text-[8px] font-black bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded dark:text-yellow-400 text-amber-900">Min: ₹{area.minFree}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 space-y-2 mt-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-orange-500">
                        <span>🚚 Free Delivery Target:</span>
                        <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. UPSELL SUGGESTIONS */}
                {upsellSuggestionItems.length > 0 && (
                  <div className="dark:bg-purple-950/20 bg-purple-50 border border-purple-500/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] font-black uppercase dark:text-purple-400 text-purple-800 tracking-wider">{isHindi ? "साथ में यह भी मंगाया गया 🥤" : "Frequently Bought Together 🥤"}</p>
                    <div className="space-y-2">
                      {upsellSuggestionItems.map((suggest) => (
                        <div key={suggest.id} className="flex justify-between items-center text-[10px]">
                          <div>
                            <span className="font-bold block dark:text-white text-neutral-900">{suggest.name}</span>
                            <span className="text-orange-600 font-extrabold">{getDisplayPrice(suggest)}</span>
                          </div>
                          <button onClick={() => { triggerHaptic(); addItem(suggest); }} className="bg-purple-500/20 text-purple-600 border border-purple-500/30 px-3 py-1 rounded-lg font-black uppercase animate-none">ADD</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. ADD EXTRA CONDIMENTS */}
                <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2 transition-colors duration-200">
                  <p className="text-[9px] font-black uppercase dark:text-gray-400 text-neutral-800">{isHindi ? "आर्डर में एक्स्ट्रा मसाला जोड़ें:" : "Add Extra condiments to order:"}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => { triggerHaptic(); setKetchupAddon(!ketchupAddon); }} className={`p-2 rounded-xl border text-[9px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-600 animate-none' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-neutral-800'}`}>
                      {isHindi ? "केचप" : "Ketchup"} (+₹10)
                    </button>
                    <button onClick={() => { triggerHaptic(); setOreganoAddon(!oreganoAddon); }} className={`p-2 rounded-xl border text-[9px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-500 animate-none' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-neutral-800'}`}>
                      {isHindi ? "ऑरेगैनो" : "Oregano"} (+₹10)
                    </button>
                    <button onClick={() => { triggerHaptic(); setChiliFlakesAddon(!chiliFlakesAddon); }} className={`p-2 rounded-xl border text-[9px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-500 animate-none' : 'dark:border-white/5 border-gray-200 bg-transparent dark:text-gray-400 text-neutral-800'}`}>
                      {isHindi ? "चिली फ्लेक्स" : "Chili Flakes"} (+₹10)
                    </button>
                  </div>
                </div>

                {/* 6. CONDITIONAL FULFILLMENT INPUTS */}
                {fulfillmentType === "delivery" && (
                  <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 space-y-2 transition-colors duration-200">
                    <div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/> <h3 className="font-black uppercase text-[10px]">{isHindi ? "डिलीवरी का पता" : "Delivery Address"}</h3></div>
                    <div className="flex justify-between items-center mb-1">
                      <button type="button" onClick={handleDetectLocation} className="text-[8px] bg-green-600 text-white font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase animate-none">📍 {isHindi ? "लाइव लोकेशन" : "Live Location"}</button>
                    </div>
                    <textarea placeholder={isHindi ? "घर का पता, मुख्य लैंडमार्क के साथ..." : "Ghar ka address, Landmark ke saath..."} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full dark:bg-black/40 bg-white border dark:border-white/10 border-gray-300 rounded-xl p-3 text-xs font-semibold dark:text-white text-neutral-900 outline-none resize-none h-16" />
                  </div>
                )}

                {fulfillmentType === "table" && (
                  <div className="dark:bg-white/[0.02] bg-gray-50 p-4 rounded-2xl border dark:border-white/5 border-gray-200 space-y-2 transition-colors duration-200">
                    <div className="flex items-center gap-1.5 text-orange-500"><span>🍽️</span> <h3 className="font-black uppercase text-[10px]">{isHindi ? "टेबल नंबर दर्ज करें" : "Enter Table Number"}</h3></div>
                    <input 
                      type="text" 
                      placeholder={isHindi ? "उदा. टेबल संख्या 5" : "e.g. Table No. 5"} 
                      value={tableNumber} 
                      onChange={(e) => setTableNumber(e.target.value)} 
                      className="w-full dark:bg-black/40 bg-white border dark:border-white/10 border-gray-300 rounded-xl p-3 text-xs font-bold dark:text-white text-neutral-900 outline-none" 
                    />
                  </div>
                )}

                {/* 7. ECO FRIENDLY PACKAGING */}
                <div className="dark:bg-green-950/10 bg-green-50/50 border dark:border-green-500/10 border-green-200 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-tight">{isHindi ? "इको-फ्रेंडली पैकिंग" : "Eco-Friendly Packaging"}</p>
                    <p className="text-[8px] dark:text-gray-400 text-neutral-700 font-bold">{isHindi ? "चम्मच / टिश्यू पेपर की आवश्यकता नहीं है" : "No spoon or tissue paper requested"}</p>
                  </div>
                  <input type="checkbox" checked={noCutlery} onChange={() => { triggerHaptic(); setNoCutlery(!noCutlery); }} className="w-4 h-4 accent-green-500" />
                </div>

                {/* PROMO/COUPON CODE INPUT SECTION */}
                <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
                  <label className="text-[9px] font-black uppercase dark:text-gray-400 text-neutral-800">
                    {isHindi ? "कूपन कोड / प्रोमो कोड:" : "Coupon Code / Promo Code:"}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={isHindi ? "कूपन कोड डालें (उदा: SAVE50)" : "Enter code (e.g. SAVE50)"} 
                      value={enteredCoupon} 
                      onChange={(e) => setEnteredCoupon(e.target.value)} 
                      className="flex-1 dark:bg-black/40 bg-white border dark:border-white/10 border-gray-300 rounded-xl px-3 py-2 text-xs font-bold dark:text-white text-neutral-900 outline-none uppercase" 
                    />
                    <button 
                      type="button" 
                      onClick={handleApplyCoupon} 
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                    >
                      {isHindi ? "लागू करें" : "Apply"}
                    </button>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between items-center bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-xl text-[10px] text-green-400 font-bold mt-2">
                      <span>✅ '{appliedCoupon.code}' Applied (-₹{appliedCoupon.discountValue})</span>
                      <button 
                        type="button" 
                        onClick={() => { triggerHaptic(); setAppliedCoupon(null); setEnteredCoupon(""); }} 
                        className="text-red-400 hover:text-red-500 font-black ml-2"
                      >
                        {isHindi ? "हटाएं" : "Remove"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 8. PAY SUMMARY CARD */}
                <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white">
                  <div className="flex justify-between font-bold mb-1.5 text-xs"><span>{isHindi ? "आइटम का टोटल" : "Items Total"}</span> <span>₹{getCartSubtotal()}</span></div>
                  {getCartAddonsPrice() > 0 && <div className="flex justify-between font-bold mb-1.5 text-xs"><span>{isHindi ? "एक्स्ट्रा मसाला" : "Extra Condiments"}</span> <span>+₹{getCartAddonsPrice()}</span></div>}
                  {appliedCoupon && (
                    <div className="flex justify-between font-bold mb-1.5 text-xs text-green-200"><span>{isHindi ? "कूपन छूट" : "Coupon Discount"}</span> <span>-₹{appliedCoupon.discountValue}</span></div>
                  )}
                  {fulfillmentType === "delivery" && <div className="flex justify-between font-bold mb-3 text-xs opacity-90"><span>{isHindi ? "डिलीवरी शुल्क" : "Delivery Charge"}</span> <span>₹{getDeliveryCharge()}</span></div>}
                  <div className="h-px bg-white/20 mb-3" />
                  <div className="flex justify-between font-black text-xl"><span>{isHindi ? "भुगतान राशि" : "To Pay"}</span> <span>₹{getTotalBillPrice()}</span></div>
                </div>

                {/* 9. PAYMENT MODE TABS & WHATSAPP CHECKOUT */}
                <div className="dark:bg-white/[0.02] bg-gray-50 border dark:border-white/5 border-gray-200 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
                  <label className="text-[9px] font-black uppercase dark:text-gray-400 text-neutral-800">{isHindi ? "भुगतान का माध्यम चुनें:" : "Select Payment Method:"}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { triggerHaptic(); setPaymentMethod("cod"); }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "cod" ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'dark:border-white/5 border-gray-200'}`}
                    >
                      <span className="text-sm">💵</span>
                      <span className="text-[9px] font-black">{isHindi ? "कैश ऑन डिलीवरी" : "Cash on Delivery"}</span>
                    </button>
                    <button
                      onClick={() => { triggerHaptic(); setPaymentMethod("upi"); }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "upi" ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'dark:border-white/5 border-gray-200'}`}
                    >
                      <span className="text-sm">📱</span>
                      <span className="text-[9px] font-black">{isHindi ? "ऑनलाइन भुगतान (UPI)" : "Pay Online (UPI)"}</span>
                    </button>
                  </div>

                  {paymentMethod === "upi" && (
                    <div className="bg-[#111] p-3 rounded-2xl border border-white/5 space-y-3.5 text-center text-[10px] font-bold text-gray-300">
                      <p className="text-yellow-400 uppercase tracking-wider">{isHindi ? "आसान ऑनलाइन पेमेंट" : "Instant UPI Checkout"}</p>
                      <p>{isHindi ? "कृपया आगे बढ़ने से पहले यूपीआई भुगतान पूरा करें और स्क्रीनशॉट अपलोड करें!" : "Kindly upload payment screenshot before ordering!"}</p>
                    </div>
                  )}

                  {/* ORDER BUTTON */}
                  <button 
                    onClick={handleCheckoutClick} 
                    type="button" 
                    disabled={isSubmittingOrder} 
                    className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg animate-none disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {isSubmittingOrder ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        Kripya thoda wait karein... ⏳
                      </span>
                    ) : (
                      <span>{isHindi ? "व्हाट्सएप पर ऑर्डर भेजें ➔" : "ORDER ON WHATSAPP ➔"}</span>
                    )}
                  </button>
                </div>

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
              className="dark:bg-[#111] bg-white border dark:border-white/10 border-gray-200 p-6 rounded-[2.5rem] w-full max-w-sm relative shadow-2xl space-y-5 text-center"
            >
              <button 
                type="button" 
                onClick={() => { triggerHaptic(); setIsUpiPopupOpen(false); }}
                className="absolute top-4 right-4 p-2 bg-red-100 hover:bg-red-600 hover:text-white text-red-600 rounded-full transition-all"
                title="Close"
              >
                <X size={16} />
              </button>

              <div className="space-y-1">
                <h3 className="text-base font-black text-orange-500 uppercase italic">
                  {isHindi ? "यूपीआई भुगतान गेटवे 📱" : "UPI Payment Gateway 📱"}
                </h3>
                <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
                  {isHindi ? "कृपया नीचे दिए गए किसी भी ऐप को चुनकर ₹" + getTotalBillPrice() + " का भुगतान पूरा करें, फिर स्क्रीनशॉट अपलोड करें!" : "Choose an app to pay ₹" + getTotalBillPrice() + " and upload the screenshot below:"}
                </p>
              </div>

              {/* UPI Apps Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button 
                  onClick={() => handleLaunchUpiPay('phonepe')}
                  className="p-3 bg-white/[0.02] border dark:border-white/5 border-gray-200 hover:border-purple-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <img src="/phonepe.png" className="w-5 h-5 object-contain" alt="PhonePe" />
                  <span className="text-[10px] font-black">PhonePe</span>
                </button>
                <button 
                  onClick={() => handleLaunchUpiPay('paytm')}
                  className="p-3 bg-white/[0.02] border dark:border-white/5 border-gray-200 hover:border-blue-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <img src="/paytm.png" className="w-5 h-5 object-contain" alt="Paytm" />
                  <span className="text-[10px] font-black">Paytm</span>
                </button>
                <button 
                  onClick={() => handleLaunchUpiPay('gpay')}
                  className="p-3 bg-white/[0.02] border dark:border-white/5 border-gray-200 hover:border-green-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <img src="/youtube.png" className="w-5 h-5 object-contain" alt="Google Pay" />
                  <span className="text-[10px] font-black">GPay</span>
                </button>
                <button 
                  onClick={() => handleLaunchUpiPay('whatsapp')}
                  className="p-3 bg-white/[0.02] border dark:border-white/5 border-gray-200 hover:border-green-600 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <img src="/whatsapp.png" className="w-5 h-5 object-contain" alt="WhatsApp Pay" />
                  <span className="text-[10px] font-black">WA Pay</span>
                </button>
              </div>

              {/* Interactive Screenshot Attachment Area */}
              <div className="bg-black/40 border border-white/10 p-3 rounded-2xl text-left space-y-2.5">
                <label className="text-[9px] font-black uppercase text-orange-500 block">
                  {isHindi ? "📸 भुगतान का स्क्रीनशॉट डालें (अनिवार्य):" : "📸 Upload Screenshot (Required):"}
                </label>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleScreenshotChange}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-orange-500 file:text-black file:cursor-pointer hover:file:bg-orange-600 outline-none"
                />
                
                {isCompressing && (
                  <div className="flex items-center gap-1.5 text-orange-400 text-[9px] font-bold">
                    <Loader2 className="animate-spin" size={10} />
                    <span>Compressing Image, please wait...</span>
                  </div>
                )}
                
                {paymentScreenshot && (
                  <div className="relative w-20 h-24 border border-white/10 rounded-xl overflow-hidden mt-1 bg-black/60 flex items-center justify-center mx-auto">
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

              <div className="flex gap-2">
                <button 
                  onClick={sendWhatsAppOrder}
                  disabled={!paymentScreenshot || isSubmittingOrder}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3.5 rounded-xl font-black text-xs uppercase"
                >
                  {isSubmittingOrder ? "Confirming..." : (isHindi ? "ऑर्डर सबमिट करें" : "Submit Order")}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsUpiPopupOpen(false)}
                  className="bg-white/5 text-gray-400 px-4 py-3.5 rounded-xl font-bold text-xs"
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
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[270] flex items-center justify-center p-6">
            <div className="dark:bg-[#111] bg-white w-full max-w-sm p-6 rounded-3xl border dark:border-white/10 border-gray-200 text-center space-y-4 shadow-2xl transition-colors duration-200">
              <Sparkles className="mx-auto text-yellow-400 animate-bounce" size={32} />
              
              <div className="space-y-1">
                <h3 className="text-base font-black dark:text-white text-neutral-900">📲 आसान इंस्टॉलेशन गाइड</h3>
                <p className="text-[10px] dark:text-gray-400 text-neutral-700 font-bold leading-normal">
                  यदि व्यक्तिगत इंस्टॉल काम नहीं कर रहा है, तो आप नीचे दिए गए आसान चरणों से इसे होम स्क्रीन पर जोड़ सकते हैं:
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
                  <span>अब **'Install'** बटन दबाएं। बम बम कैफ़े ऐप आपके फोन की होम स्क्रीन पर असली ऐप की तरह जुड़ जाएगा!</span>
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

      {/* SECURED GIFT POINTS MODAL */}
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
                <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(false); setGiftPhone(""); setGiftPointsAmount(""); setGiftSenderPin(""); }} className="bg-white/5 text-gray-400 font-bold p-3 rounded-xl text-xs">CANCEL</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* VERIFIED SOCIAL POINTS CLAIM MODAL */}
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
                  className="bg-white/5 text-gray-400 p-3 rounded-xl font-black text-xs uppercase"
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
