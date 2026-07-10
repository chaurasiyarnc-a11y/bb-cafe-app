'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment, runTransaction } from 'firebase/firestore';
import { ShoppingBag, Plus, PowerOff, Search, ChevronRight, X, MapPin, Phone, User, Sparkles, Star, Percent, Gift, Loader2, Share2, Mic, Clock } from 'lucide-react';
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

const REVIEW_SUGGESTIONS = ["Swaad Zabardast! 😋", "Super Fast Delivery 🛵", "Best Pizza in Town 🍕", "Value for Money! 💰", "Highly Recommended! 🌟", "Pure & Hygienic food 🧼"];
const DEFAULT_REVIEWS = [
  { id: "def1", name: "Gaurav Soni", rating: 5, comment: "बम बम कैफ़े की पनीर पिज्जा सच में पूरे मोहंद्रा में बेस्ट है! एक्स्ट्रा चीज़ इस रियल लव। ⭐⭐⭐⭐⭐" },
  { id: "def2", name: "Anjali Patel", rating: 5, comment: "फास्ट फ़ूड पैकिंग बहुत अच्छी थी, डिलीवरी बॉय का व्यवहार भी बहुत विनम्र था। रेकमेंडेड! ⭐⭐⭐⭐⭐" }
];

const SEARCH_PLACEHOLDERS = ["सर्च करें स्पेशल पिज्जा... 🍕", "सर्च करें ओरियो शेक... 🥤", "सर्च करें स्पेशल थाली... 🍱", "सर्च करें बर्गर... 🍔"];

// --- ADVANCED OFFLINE GEMINI FALLBACK REPLY ENGINE ---
const getLocalBotReply = (queryText: string, menuItems: any[]) => {
  const q = queryText.toLowerCase().trim();
  
  if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("राम राम") || q.includes("नमस्ते") || q.includes("namaste") || q.includes("हलो")) {
    return "राम-राम भैया! 🙏 हम हैं बम बम कैफ़े की डिजिटल हेल्पडेस्क 'रिया दीदी' 💁‍♀️। आज आपका का खाबे को मन है? हमें बजट या मूड बताओ, हम बढ़िया डिश बता रहे! 🍕🥤";
  }
  if (q.includes("about") || q.includes("कैफे") || q.includes("cafe") || q.includes("शुरुआत") || q.includes("कहानी") || q.includes("बारे") || q.includes("history")) {
    return "भैया, हमने बम बम कैफ़े की शुरुआत एक छोटे से सपने के साथ की थी—लोगों को घर जैसा स्वाद और कैफ़े वाला माहौल देने के लिए। यहाँ हर कप कॉफ़ी और हर स्लाइस पिज्जा प्यार और शुद्धता के साथ बनाया जाता है। हमारी कोशिश है कि आप जब भी यहाँ आएँ, एक प्यारी मुस्कान के साथ वापस जाएँ। ❤️";
  }
  if (q.includes("pizza") || q.includes("पिज्जा") || q.includes("पिज़्ज़ा")) {
    const pizzas = menuItems.filter(i => i.category === "Special Pizza" || i.name.toLowerCase().includes("pizza"));
    if (pizzas.length > 0) {
      return `भैया, हमारे यहाँ ये लाजवाब पिज्जा उपलब्ध हैं:\n${pizzas.map(p => `• ${p.name} - ${p.price ? '₹'+p.price : 'कम रेट में'}`).join('\n')}\n\nसब शुद्ध अमूल चीज़ से प्यार से बनाए जाते हैं! 🍕`;
    }
    return "भैया, गरमा-गरम अमूल चीज़ वाला स्पेशल पिज़्ज़ा मिल जाएगा, अभी आर्डर करें! 🍕";
  }
  if (q.includes("delivery") || q.includes("डिलीवरी") || q.includes("होम") || q.includes("घर") || q.includes("delivery free")) {
    return "भैया, होम डिलीवरी बिल्कुल फ्री है (टाउन में ₹99 से ऊपर)! स्वाद सीधे आपके दरवाज़े तक आएगा। 🏠🛵\n\n• मोहंद्रा टाउन: ₹99 से ऊपर फ्री डिलीवरी\n• 5 किलोमीटर: ₹499 से ऊपर फ्री डिलीवरी\n• 12 किलोमीटर: ₹999 से ऊपर फ्री डिलीवरी";
  }
  if (q.includes("address") || q.includes("पता") || q.includes("location") || q.includes("कहाँ") || q.includes("kahan") || q.includes("shop")) {
    return "बम बम कैफ़े का पता है: 📍 बस स्टैंड मोहंद्रा, पीपल पेड़ के नीचे, मोहंद्रा (जिला पन्ना, मध्य प्रदेश)। आप नीचे मैप का बटन दबाकर डायरेक्ट नेविगेट कर सकते हैं! 🗺️";
  }
  if (q.includes("budget") || q.includes("कम") || q.includes("sasta") || q.includes("सस्ता") || q.includes("100") || q.includes("50") || q.includes("150")) {
    return "भैया, बजट की बिल्कुल टेंशन मत लो! आप ₹50 में ठंडी कोल्ड कॉफ़ी या ओरियो शेक ले सकते हैं, और ₹99 में गरमा-गरम पिज्जा। कम बजट में भी पेट भर जाएगा! 🍕🥤";
  }
  if (q.includes("menu") || q.includes("क्या क्या") || q.includes("khana") || q.includes("खाना") || q.includes("list")) {
    const samples = menuItems.slice(0, 5);
    return `भैया, हमारे यहाँ स्पेशल पिज़्ज़ा, स्पेशल थाली, पनीर स्पेशल, इंडियन ब्रेड और लाजवाब शेक्स (Super Cool) सब कुछ मिलता है।\n\nजैसे:\n${samples.map(s => `• ${s.name} - ₹${s.price || 0}`).join('\n')}\n\nऊपर दिए गए मेनू में सब कुछ रेट के साथ लिखा है! 😋`;
  }
  
  return "माफ़ी चाहते हैं भैया, आपकी बात हम पूरे तरीके से समझ नहीं पाए। आप हमारे मेनू के बारे में, डिलीवरी या कैफ़े के पते के बारे में कुछ भी पूछ सकते हैं! 🙏";
};

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

  const [chosenSize, setChosenSize] = useState<string>("");
  const [chosenPrice, setChosenPrice] = useState<number>(0);
  const [addonCheese, setAddonCheese] = useState(false);
  const [addonVeg, setAddonVeg] = useState(false);

  // App Sharing Tracker State
  const [shareCount, setShareCount] = useState<number>(0);

  // --- NEW INTEGRATED STATES ---
  const [deliveryBoys, setDeliveryBoys] = useState<any[]>([]);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: "model", text: "राम-राम भैया! हम हैं बम बम कैफ़े की जादुई डिजिटल असिस्टेंट 'रिया दीदी' 💁‍♀️। आज आपका का खाबे को मन है? बजट या मूड बताओ, हम बढ़िया डिश बता रहे! 🍕🥤" }
  ]);
  const [greetingMessage, setGreetingMessage] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [sugarLevel, setSugarLevel] = useState("Normal");
  const [iceLevel, setIceLevel] = useState("Normal Ice");
  const [noCutlery, setNoCutlery] = useState(false);
  const [deliveryArea, setDeliveryArea] = useState<'town' | 'outer' | 'long'>('town');

  // --- STOPWATCH GAME STATES ---
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [gameTime, setGameTime] = useState(0); // in centiseconds
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [gameResult, setGameResult] = useState<'win' | 'lose' | null>(null);
  const [hasPlayedGame, setHasPlayedGame] = useState(false); // 1 Attempt lock
  const [gameDiscount, setGameDiscount] = useState(0); // Automatic Win Discount

  const formatBillNumber = (num: number) => String(num).padStart(4, '0');

  useEffect(() => {
    setMounted(true);

    // --- PWA Setup ---
    if (typeof window !== 'undefined') {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('BUM BUM Cafe SW Registered:', reg.scope))
            .catch((err) => console.error('SW Registration Failed:', err));
        });
      }
      if (!document.querySelector('link[rel="manifest"]')) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }
    }

    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => { if(d.exists()) setStoreOpen(d.data().isOpen); });
    const unsubMenu = onSnapshot(query(collection(db, "products")), (snap) => {
      setMenu(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.isVisible !== false));
    });
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => { setDbCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => { setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => { setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.isApproved === true));
    });
    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => { setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    
    // Delivery Boys fetch for CallMeBot trigger
    const unsubRiders = onSnapshot(collection(db, "delivery_boys"), (snap) => {
      setDeliveryBoys(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const savedDetails = localStorage.getItem('bb_cafe_customer');
    if (savedDetails) { try { setCustomerDetails(JSON.parse(savedDetails)); } catch (err) {} }

    return () => { unsubStore(); unsubMenu(); unsubCats(); unsubBanners(); unsubReviews(); unsubCoupons(); unsubRules(); unsubRiders(); };
  }, []);

  useEffect(() => {
    if (!customerDetails?.phone) { setCustomerPoints(0); return; }
    const unsubPoints = onSnapshot(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), (docSnap) => {
      setCustomerPoints(docSnap.exists() ? (docSnap.data().points || 0) : 0);
    }, () => { setCustomerPoints(0); });
    
    const phoneClean = customerDetails.phone.replace("+91", "");
    setShareCount(Number(localStorage.getItem(`bb_shares_${phoneClean}`) || 0));

    return () => unsubPoints();
  }, [customerDetails]);

  // --- Dynamic Greeting Timer-based Logic ---
  useEffect(() => {
    if (!mounted) return;
    const getLocalGreeting = () => {
      const hour = new Date().getHours();
      const name = customerDetails?.name ? customerDetails.name.split(" ")[0] : "";
      const nameStr = name ? `${name} भैया` : "भैया";

      if (hour >= 5 && hour < 12) {
        return `राम-राम ${nameStr}! आज सुबह-सुबह का खाबे को मन है? गरमा-गरम चाय और सैंडविच मँगाएँ? ☕`;
      } else if (hour >= 12 && hour < 16) {
        return `राम-राम जी! दोपहर की तेज भूख लगी है का? बम बम की स्पेशल थाली आज ही आज़माएं! 🍱`;
      } else if (hour >= 16 && hour < 20) {
        return `नमस्ते ${nameStr}! आज शाम की चाय के साथ सैंडविच या बर्गर की जोड़ी कैसी रहेगी? 🍔`;
      } else if (hour >= 20 && hour < 23) {
        return `राम-राम ${nameStr}! रात के खाने में गरमा-गरम स्पेशल पिज़्ज़ा का मज़ा लें? अभी आर्डर करें! 🍕`;
      } else {
        return `नमस्ते जी! इतनी रात को पढ़ाई या काम चल रहा है का? नींद भगाने के लिए एक कड़क कॉफ़ी मंगाई जाए? ☕`;
      }
    };
    setGreetingMessage(getLocalGreeting());
  }, [mounted, customerDetails]);

  // --- Search Bar Sliding Placeholder Timer ---
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // --- Stopwatch Game PRECISION Timer Loop ---
  useEffect(() => {
    let intervalId: any;
    if (isGameRunning) {
      const startTime = Date.now() - gameTime * 10;
      intervalId = setInterval(() => {
        setGameTime(Math.floor((Date.now() - startTime) / 10));
      }, 10);
    } else {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
  }, [isGameRunning]);

  // --- Voice Search Function ---
  const handleVoiceSearch = () => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Hindi voice input
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setSearchQuery(speechToText);
        toast.success(`सर्च किया: ${speechToText}`);
      };
      recognition.start();
    } else {
      toast.error("आपका ब्राउज़र वॉइस सर्च सपोर्ट नहीं करता है।");
    }
  };

  // --- AI Chatbot Send Message Handler (With Instant Offline Fallback) ---
  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMsg = { role: "user", text: aiInput };
    const updatedMessages = [...aiMessages, userMsg];
    setAiMessages(updatedMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, menuData: menu })
      });
      if (!res.ok) throw new Error("Fallback required");
      const data = await res.json();
      setAiMessages([...updatedMessages, { role: "model", text: data.text }]);
    } catch (err) {
      const reply = getLocalBotReply(userMsg.text, menu);
      setAiMessages([...updatedMessages, { role: "model", text: reply }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Compute categories
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

  const getCategoryImage = (catName: string) => {
    const found = dbCategories.find(c => c.name === catName);
    if (found && found.image) return found.image;
    return CATEGORY_IMAGES[catName] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => { setBannerIndex((prev) => (prev + 1) % banners.length); }, 4000);
    return () => clearInterval(interval);
  }, [banners]);

  const getTotal = () => cart.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

  const handleApplyCoupon = () => {
    if (!enteredCoupon) return toast.error("Please enter a coupon code");
    const cleanCode = enteredCoupon.trim().toUpperCase();

    // 10-Sec Challenge Win coupon validator!
    if (cleanCode === 'BUMBUM10SEC') {
      setAppliedCoupon({
        code: 'BUMBUM10SEC',
        discountValue: 500
      });
      toast.success("🎉 10-Sec Challenge Coupon Applied! ₹500 OFF!");
      return;
    }

    const found = coupons.find(c => String(c.code).toLowerCase() === enteredCoupon.trim().toLowerCase());
    if (found) {
      setAppliedCoupon(found);
      toast.success(`Coupon '${found.code}' applied! ₹${found.discountValue} OFF`);
    } else {
      toast.error("Invalid coupon code");
    }
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

  const filteredMenu = deduplicatedMenu.filter(item => {
    const itemName = item?.name ? String(item.name).toLowerCase() : "";
    const itemCategory = item?.category ? String(item.category) : "";
    const matchesCategory = selectedCategory === "All" || itemCategory === selectedCategory;
    return matchesCategory && itemName.includes(searchQuery.toLowerCase());
  });

  const handleCustomerRedeem = (id: string, name: string, pointsCost: number) => {
    const currentPointsInCart = cart.reduce((acc: number, item: any) => acc + (item.pointsCost || 0), 0);
    if (customerPoints - currentPointsInCart < pointsCost) return toast.error("आपके पास पर्याप्त पॉइंट्स उपलब्ध नहीं हैं!");
    addItem({ id, name, price: 0, pointsCost, isReward: true });
    toast.success(`${name} Cart में जोड़ दिया गया है!`);
  };

  const handleGiftPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerDetails?.phone) return toast.error("कृपया पहले अपनी डिटेल्स जोड़ें!");
    const senderPhoneRaw = customerDetails.phone.replace("+91", "").trim();
    const friendPhoneRaw = String(giftPhone).replace("+91", "").trim();
    const pointsToGift = Number(giftPointsAmount);

    if (!friendPhoneRaw || friendPhoneRaw.length < 10) return toast.error("कृपया सही 10-digit मोबाइल नंबर डालें!");
    if (senderPhoneRaw === friendPhoneRaw) return toast.error("आप खुद को पॉइंट्स गिफ्ट नहीं कर सकते!");
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

      toast.success(`🎁 सफलतापूर्वक ${pointsToGift}  पॉइंट्स गिफ्ट कर दिए गए हैं!`);
      const inviteMsg = `हे दोस्त! मैंने तुम्हें BUM BUM Cafe के ऐप पर 🎁 ${pointsToGift} Loyalty Points गिफ्ट किए हैं। यहाँ ऑर्डर करो: ${window.location.origin}`;
      const whatsappUrl = `https://wa.me/91${friendPhoneRaw}?text=${encodeURIComponent(inviteMsg)}`;
      
      setGiftPhone(""); setGiftPointsAmount(""); setIsGiftModalOpen(false);
      if (window.confirm("क्या आप अपने दोस्त को व्हाट्सएप पर गिफ्ट का मैसेज भेजना चाहते हैं?")) window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      toast.error(err.message === "Insufficient points balance!" ? "अपर्याप्त पॉइंट्स!" : "पॉइंट्स गिफ्ट करने में समस्या आई।");
    } finally { setIsGiftingLoading(false); }
  };

  const sendWhatsAppOrder = async () => {
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
    const subtotal = getTotal();
    
    // Dynamic Delivery Area Charges (Updated for 12km)
    let deliveryCharge = 0;
    if (deliveryArea === 'town') {
      deliveryCharge = subtotal < 99 ? 20 : 0;
    } else if (deliveryArea === 'outer') {
      deliveryCharge = subtotal < 499 ? 50 : 0;
    } else {
      deliveryCharge = subtotal < 999 ? 99 : 0; // 12km delivery charge ₹99
    }

    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discountValue) : 0;
    const finalTotal = Math.max(0, subtotal - (couponDiscount + gameDiscount)) + deliveryCharge;
    
    const pointsEarned = Math.floor(finalTotal / 100);
    const totalPointsCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);

    try {
      await addDoc(collection(db, "orders"), {
        billNumber, tokenNumber, customerName: customerDetails.name, customerPhone: customerDetails.phone,
        address, items: cart, subtotal, discount: couponDiscount + gameDiscount, total: finalTotal, timestamp: new Date(), status: 'pending'
      });
      if (pointsEarned > 0 || totalPointsCost > 0) {
        await setDoc(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), {
          name: customerDetails.name, phone: customerDetails.phone.replace("+91", ""), points: increment(pointsEarned - totalPointsCost), lastActive: new Date()
        }, { merge: true });
      }
    } catch (e) {}

    let itemsText = "";
    cart.forEach((i: any) => itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`);
    
    const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Address:* ${address}\n*Cutlery Needed:* ${noCutlery ? 'No 🌳' : 'Yes'}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal}\n*Discount:* -₹${couponDiscount + gameDiscount}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${finalTotal}*\n\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}\n_Confirm order by replying 'YES'_`;
    
    // --- CALLMEBOT MULTIPLE DELIVERY BOYS TRIGGER (BACKGROUND) ---
    const activeRiders = deliveryBoys.filter(b => b.isActive === true);
    activeRiders.forEach(async (rider) => {
      if (rider.phone && rider.apiKey) {
        try {
          const encMsg = encodeURIComponent(`🔥 BUM BUM CAFE - NEW ORDER\nBill No: #${formattedBillStr}\nToken: #${tokenNumber}\nCustomer: ${customerDetails.name}\nPhone: ${customerDetails.phone}\nAddress: ${address}\nTotal: ₹${finalTotal}`);
          await fetch(`https://api.callmebot.com/whatsapp.php?phone=${rider.phone}&text=${encMsg}&apikey=${rider.apiKey}`, { mode: 'no-cors' });
        } catch (e) {}
      }
    });

    window.open(`https://wa.me/919714293759?text=${encodeURIComponent(msg)}`, '_blank');
    
    // Reset Game States after checkout
    setHasPlayedGame(false);
    setGameDiscount(0);
    setGameResult(null);
    setGameTime(0);

    clearCart(); setAppliedCoupon(null); setEnteredCoupon(""); setIsCartOpen(false);
    toast.success("Redirecting to WhatsApp!");
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) return toast.error("Please fill all fields!");
    try {
      await addDoc(collection(db, "reviews"), { name: reviewName, rating: reviewRating, comment: reviewComment, isApproved: false, timestamp: new Date() });
      toast.success("Review submitted! Approved hone ke baad live dikhega.");
      setReviewName(""); setReviewComment(""); setReviewRating(5); setIsReviewFormOpen(false);
    } catch (err) { toast.error("Failed to submit review."); }
  };

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName || tempName.trim().length < 3) return toast.error("Please enter your real name");
    if (!tempPhone || tempPhone.trim().length < 10) return toast.error("Please enter 10-digit number");
    const details = { name: tempName, phone: `+91${tempPhone}` };
    localStorage.setItem('bb_cafe_customer', JSON.stringify(details));
    setCustomerDetails(details); setIsLoginOpen(false);
    toast.success(`Welcome ${tempName}!`);
  };

  const handleAddToCart = () => {
    if (!chosenSize) return toast.error("Please select a size first!");
    const addonsTotal = (addonCheese ? 30 : 0) + (addonVeg ? 20 : 0);
    let finalName = `${selectedProduct.name} (${chosenSize})`;
    if (addonCheese) finalName += " + Extra Cheese";
    if (addonVeg) finalName += " + Extra Veg";
    if (selectedProduct.category === "Super Cool") {
      finalName += ` (${sugarLevel}, ${iceLevel})`;
    }
    const uniqueCartId = `${selectedProduct.id}-${chosenSize}-${addonCheese ? 'cheese' : 'no'}-${addonVeg ? 'veg' : 'no'}-${sugarLevel}-${iceLevel}`;

    addItem({ ...selectedProduct, id: uniqueCartId, name: finalName, price: Number(chosenPrice) + addonsTotal });
    toast.success(`${chosenSize} added to cart!`);
    setSelectedProduct(null); setChosenSize(""); setChosenPrice(0); setAddonCheese(false); setAddonVeg(false); setSugarLevel("Normal"); setIceLevel("Normal Ice");
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

  const handleShareApp = async () => {
    if (!customerDetails?.phone) {
      toast.error("पॉइंट्स कमाने के लिए पहले Name और Phone दर्ज करें!");
      setIsLoginOpen(true);
      return;
    }

    const phoneClean = customerDetails.phone.replace("+91", "").trim();
    const shareCountKey = `bb_shares_${phoneClean}`;
    let currentShares = Number(localStorage.getItem(shareCountKey) || 0);

    const shareMessage = `🔥 *BUM BUM CAFE - Mohandra* 🔥\nयहाँ से ऑर्डर करें बेहतरीन और स्वादिष्ट Pizza, Thali और Fast Food! सीधे आपके घर तक सुपर फास्ट होम डिलीवरी।\nऑर्डर करने और 🎁 फ्री लॉयल्टी पॉइंट्स पाने के लिए अभी नीचे लिंक खोलें:\n👉 ${window.location.origin}`;
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

  // --- STOPWATCH GAME MECHANICS ---
  const handleStartGame = () => {
    if (hasPlayedGame) {
      toast.error("भैया, इस आर्डर पर आप पहले ही गेम खेल चुके हैं! 🛑");
      return;
    }
    setGameTime(0);
    setGameResult(null);
    setIsGameRunning(true);
  };

  const handleStopGame = () => {
    setIsGameRunning(false);
    setHasPlayedGame(true); // Lock further play attempts for this transaction
    const target = 1000; // 10.00 seconds is 1000 centiseconds
    if (gameTime === target) {
      setGameResult('win');
      // Direct dynamic discount logic up to ₹500
      const currentCartTotal = getTotal();
      const calculatedDiscount = Math.min(currentCartTotal, 500);
      setGameDiscount(calculatedDiscount); 
      toast.success(`🎉 अद्भुत! आपने ठीक 10.00s पर स्टॉपवॉच रोकी! आपका यह आर्डर ₹${calculatedDiscount} फ्री हो गया!`);
    } else {
      setGameResult('lose');
    }
  };

  const formatGameTimeDisplay = (cs: number) => {
    const ss = Math.floor(cs / 100);
    const cc = cs % 100;
    return `${String(ss).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-32 font-sans relative overflow-x-hidden">
      <Toaster position="top-center" />
      
      {/* HEADER */}
      <header className="relative h-60 bg-gradient-to-b from-[#ff5e00] to-[#b33600] flex flex-col justify-center items-center px-4">
        <div className="absolute top-4 right-4 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 z-10 text-[9px] font-black uppercase tracking-widest text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />100% PURE VEG
        </div>
        <div className="text-center z-10">
          <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-4xl font-black italic tracking-tighter text-yellow-300">BUM BUM CAFE</motion.h1>
          <p className="text-orange-100 font-bold tracking-wider text-xs mt-1 uppercase">Best Cafe in this Area</p>
        </div>
      </header>

      {/* STICKY SEARCH BAR WITH SLIDING PLACEHOLDER & VOICE SEARCH (z-[60] to prevent sidebar overlap) */}
      <div className="sticky top-0 z-[60] bg-[#050505]/95 backdrop-blur-md py-4 px-4 border-b border-white/5 rounded-b-3xl">
        <div className="relative max-w-sm mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          
          <input 
            type="text" 
            placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-white text-black py-3.5 px-11 rounded-2xl outline-none text-xs font-semibold placeholder-gray-500 transition-all duration-300" 
          />
          
          <button 
            onClick={handleVoiceSearch} 
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-ping' : 'text-gray-500 hover:text-black'}`}
          >
            <Mic size={16} />
          </button>
        </div>
      </div>

      {/* TRIPLE SIDE-TOGGLES STACKED CLEANLY ON THE RIGHT (z-[45] so they scroll cleanly behind search) */}
      <button 
        onClick={() => setIsSocialsOpen(true)} 
        className="fixed right-0 top-[31%] -translate-y-1/2 bg-[#ff5e00] text-white py-4 px-2.5 rounded-l-2xl z-[45] text-[9px] font-black tracking-widest uppercase flex flex-col items-center gap-1 shadow-xl border-l border-y border-white/10"
        style={{ writingMode: 'vertical-lr' }}
      >
        📱 FOLLOW & EARN
      </button>

      <button 
        onClick={() => setIsReviewsDrawerOpen(true)} 
        className="fixed right-0 top-[44%] -translate-y-1/2 bg-yellow-400 text-black py-4 px-2.5 rounded-l-2xl z-[45] text-[9px] font-black tracking-widest uppercase flex flex-col items-center gap-1 shadow-xl"
        style={{ writingMode: 'vertical-lr' }}
      >
        ⭐ REVIEWS
      </button>

      <button 
        onClick={() => setIsGameOpen(true)} 
        className="fixed right-0 top-[57%] -translate-y-1/2 bg-gradient-to-r from-red-500 to-orange-500 text-white py-4 px-2.5 rounded-l-2xl z-[45] text-[9px] font-black tracking-widest uppercase flex flex-col items-center gap-1 shadow-xl border-l border-y border-white/10 animate-bounce"
        style={{ writingMode: 'vertical-lr', animationDuration: '4s' }}
      >
        ⏱️ 10S CHALLENGE
      </button>

      <main className="pt-4 px-4 max-w-lg mx-auto space-y-6">
        
        {/* --- BEM BEM DYNAMIC GREETING CARD --- */}
        {greetingMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/5 p-5 rounded-[2.2rem] text-center shadow-lg relative overflow-hidden"
          >
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full" />
            <p className="text-xs font-black text-yellow-300 leading-relaxed tracking-wide">
              {greetingMessage}
            </p>
          </motion.div>
        )}

        {/* PROMO BANNER */}
        <div className="w-full h-44 rounded-3xl overflow-hidden relative border border-white/5 bg-white/[0.02]">
          {(banners.length === 0 || bannerError) ? (
            <div className="w-full h-full bg-gradient-to-r from-orange-600/35 to-[#b33600]/35 flex flex-col justify-center p-6 space-y-1">
              <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full w-max">Special Offer</span>
              <h3 className="text-xl font-black italic text-yellow-300">GET FREE DELIVERY ABOVE ₹99</h3>
              <p className="text-xs text-gray-400">Enjoy fresh baked pizza & delicious thalis!</p>
            </div>
          ) : (
            <img src={banners[bannerIndex]?.url} onError={() => setBannerError(true)} className="w-full h-full object-cover animate-fade-in" alt="Promo" />
          )}
        </div>

        {/* 10-SECOND CHALLENGE BANNER / PROMO */}
        <div className="bg-gradient-to-r from-red-600/15 to-orange-600/15 border border-red-500/30 p-5 rounded-[2.2rem] text-center space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-red-600 text-white font-black uppercase text-[8px] px-3 py-1 rounded-bl-xl tracking-widest animate-pulse">CHALLENGE</div>
          <span className="text-[10px] font-black uppercase text-red-400 flex justify-center items-center gap-1">⏱️ 10 SECOND SPEED CHALLENGE</span>
          <h4 className="text-sm font-black text-white">Stopwatch को ठीक 10.00s पर रोकें और ₹500 तक का FREE आर्डर जीतें!</h4>
          <p className="text-[9px] text-gray-400 font-semibold">नियम: थोड़ा भी कम या ज्यादा होने पर ऑफर मान्य नहीं होगा।</p>
          <button 
            onClick={() => setIsGameOpen(true)} 
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-black py-2.5 rounded-2xl text-[10px] uppercase active:scale-95 transition-all shadow-md"
          >
            🕹️ PLAY CHALLENGE NOW
          </button>
        </div>

        {/* ZOMATO-STYLE CATEGORY HORIZONTAL SLIDER */}
        <div className="bg-white/[0.01] border border-white/5 p-5 rounded-[2.5rem] space-y-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Inspiration for your first order</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {visibleCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)} 
                  className="flex flex-col items-center flex-shrink-0 group outline-none"
                >
                  <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-orange-500 scale-110 shadow-lg shadow-orange-500/15' : 'border-white/10'}`}>
                    <img src={getCategoryImage(cat)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={cat} />
                  </div>
                  <span className={`text-[10px] font-black uppercase mt-2 max-w-[5rem] truncate text-center ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                    {cat === "All" ? "All" : cat.replace("Special ", "").replace(" Special", "")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRODUCTS MENU GRID WITH ANIMATED HOVER */}
        <div className="grid grid-cols-1 gap-6 pt-2">
          {filteredMenu.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm font-bold uppercase">No items found...</p>
          ) : (
            filteredMenu.map((item) => (
              <motion.div 
                layout 
                key={item.id} 
                className="bg-white/[0.02] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col relative group transition-all duration-300 hover:shadow-xl hover:shadow-white/[0.01]"
              >
                <div className="relative h-56 w-full overflow-hidden">
                  <img 
                    src={item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80"} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    alt={item.name} 
                  />
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5 text-[9px] font-black uppercase text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />VEG
                  </div>
                </div>
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-black text-lg text-gray-100 line-clamp-1">{item.name}</h4>
                    <div className="bg-green-600 text-white font-extrabold text-[11px] px-2.5 py-0.5 rounded-lg flex items-center gap-0.5">
                      <span>4.7</span><span className="text-[9px]">★</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400 font-bold mt-1">
                    <p className="uppercase text-[9px] text-gray-500">{item.category}</p><p className="text-[9px]">• 15-25 min</p>
                  </div>
                  <div className="h-px bg-white/5 my-3" />
                  <div className="flex justify-between items-end mt-1">
                    <div>
                      <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Price</p>
                      <p className="text-orange-500 font-black text-xl leading-none">{getDisplayPrice(item)}</p>
                      {item.variants && <span className="text-[9px] font-bold text-gray-400 mt-1 block">Options available</span>}
                    </div>
                    {storeOpen ? (
                      <button onClick={() => item.variants ? setSelectedProduct(item) : addItem(item)} className="px-5 py-2.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-xl font-black text-xs active:scale-95 transition-all uppercase shadow-md">
                        <Plus size={14} /> ADD
                      </button>
                    ) : (
                      <button disabled className="px-5 py-2.5 bg-white/5 text-gray-550 border border-white/5 rounded-xl font-black text-xs uppercase cursor-not-allowed flex items-center gap-1">
                        <PowerOff size={12} className="text-red-500" /> CLOSED
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* --- ABOUT US CARD (DESIGNED DIRECTLY FROM THE INSTAGRAM FILE) --- */}
        <div className="bg-gradient-to-br from-green-950/40 to-[#b33600]/10 border border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-yellow-500 text-black font-black uppercase text-[8px] px-3 py-1 rounded-bl-xl tracking-widest">ABOUT US</div>
          <h3 className="text-2xl font-black italic text-yellow-300">ABOUT BUM BUM CAFE</h3>
          <p className="text-orange-400 font-extrabold text-xs uppercase tracking-widest leading-none mb-1">जहाँ स्वाद और सुकून मिलते हैं!</p>
          <div className="h-px bg-white/5" />
          <p className="text-xs text-gray-300 leading-relaxed font-semibold">
            हमने BUM BUM CAFE की शुरुआत एक छोटे से सपने के साथ की थी—लोगों को घर जैसा स्वाद और कैफ़े वाला माहौल देने के लिए। यहाँ हर कप कॉफ़ी और हर स्लाइस पिज्जा प्यार और शुद्धता के साथ बनाया जाता है। हमारी कोशिश है कि आप जब भी यहाँ आएँ, एक प्यारी मुस्कान के साथ वापस जाएँ। ❤️
          </p>
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-2xl text-[10px] font-black uppercase text-green-400 tracking-wide">
            🏠 होम डिलीवरी बिल्कुल फ्री है - स्वाद आएगा सीधे दरवाज़े तक!
          </div>
        </div>

        {/* --- DYNAMIC CAFE DETAILS & MAPS ADDRESS CARD (UPDATED WITH NEW ADDRESS & LINK) --- */}
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-xl text-left">
          <h3 className="font-black text-sm text-yellow-300 uppercase italic flex items-center gap-2">
            <Clock size={16} /> CAFE DETAILS & TIMINGS
          </h3>
          <div className="h-px bg-white/5" />
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            <div>
              <p className="text-gray-500 text-[9px] font-black uppercase mb-1">⏰ Operational Hours</p>
              <p className="text-gray-200">11:00 AM - 11:00 PM</p>
              <p className="text-green-500 text-[9px] font-black mt-1 uppercase">Open Everyday 🟢</p>
            </div>
            <div>
              <p className="text-gray-500 text-[9px] font-black uppercase mb-1">📍 Location</p>
              <p className="text-gray-200">बम बम कैफ़े, बस स्टैंड मोहंद्रा, पीपल पेड़ के नीचे, मोहंद्रा (जिला पन्ना, मध्य प्रदेश)</p>
            </div>
          </div>
          
          <div className="flex gap-2.5 pt-2">
            <a 
              href="https://maps.app.goo.gl/trJkZpVtY27hVcru7" 
              target="_blank" 
              rel="noreferrer" 
              className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-3 rounded-2xl text-[10px] uppercase flex items-center justify-center gap-2 border border-white/10"
            >
              <MapPin size={12} /> Open Maps 📍
            </a>
            <a 
              href="tel:+919714293759" 
              className="flex-1 bg-orange-500 text-black font-black py-3 rounded-2xl text-[10px] uppercase flex items-center justify-center gap-2 shadow-md"
            >
              <Phone size={12} /> Call Cafe 📞
            </a>
          </div>
        </div>

      </main>

      {/* --- FLOATING AI CHAT BUBBLE (Bottom Left - Styled as a tiny non-disturbing Cafe Icon ☕) --- */}
      <button 
        onClick={() => setIsAiOpen(true)} 
        className="fixed bottom-24 left-4 w-11 h-11 bg-gradient-to-tr from-[#ff5e00] to-[#b33600] rounded-full shadow-2xl z-40 transition-all active:scale-95 border border-white/10 flex items-center justify-center overflow-hidden hover:rotate-6"
      >
        <span className="text-xl">☕</span>
      </button>

      {/* --- REVIEWS SIDE DRAWER --- */}
      <AnimatePresence>
        {isReviewsDrawerOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] overflow-y-auto">
            <div className="p-6 max-w-lg mx-auto pb-32">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-white">Guest Reviews</h2>
                  <p className="text-xs text-gray-500 font-bold">Rating: 4.8/5.0 ★</p>
                </div>
                <button onClick={() => setIsReviewsDrawerOpen(false)} className="p-3 bg-white/5 rounded-full text-white"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                {(reviews.length === 0 ? DEFAULT_REVIEWS : reviews).map((r: any) => (
                  <div key={r.id} className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-6 space-y-3 shadow-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-sm text-orange-500">{r.name}</h4>
                      <div className="flex items-center gap-1 text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-lg text-[10px]">
                        <Star size={10} fill="currentColor"/><span className="font-extrabold">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 italic">"{r.comment}"</p>
                  </div>
                ))}
              </div>
              <div className="fixed bottom-6 left-0 w-full px-6 z-50">
                <button onClick={() => setIsReviewFormOpen(true)} className="w-full max-w-md mx-auto bg-orange-500 text-black py-4.5 rounded-[2rem] font-black text-sm uppercase">✍️ Write a Review</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- INTERACTIVE STOPWATCH GAME MODAL (10S CHALLENGE) --- */}
      <AnimatePresence>
        {isGameOpen && (
          <div className="fixed inset-0 bg-black/95 z-[270] flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-[#111] w-full max-w-md p-8 rounded-[3rem] border border-white/10 text-center space-y-6 relative overflow-hidden"
            >
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-red-500/10 blur-3xl rounded-full" />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
              
              <div>
                <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 italic uppercase">10S CHALLENGE</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">बम बम कैफ़े - मोहंद्रा विशेष</p>
              </div>

              {/* STOPWATCH DIGITAL DISPLAY */}
              <div className="bg-black/60 border border-white/5 p-8 rounded-[2rem] shadow-inner text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Stopwatch</p>
                <h1 className="text-6xl font-mono font-black text-yellow-300 tracking-tighter">
                  {formatGameTimeDisplay(gameTime)}
                </h1>
                <p className="text-[10px] text-red-400 font-bold uppercase mt-2">Target: 10.00 Seconds Fix</p>
              </div>

              {/* GAME RESULTS DISPLAY */}
              {gameResult === 'win' && (
                <div className="p-4 bg-green-500/10 border border-green-500/25 rounded-2xl text-center space-y-1 animate-pulse">
                  <p className="text-xs font-black text-green-400 uppercase">🎉 विजेता! आपने कर दिखाया!</p>
                  <p className="text-[10px] text-gray-300">आपका यह आर्डर (अधिकतम ₹500 तक) बिल्कुल मुफ्त (Free) हो गया है! 🎁</p>
                </div>
              )}

              {gameResult === 'lose' && (
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-center space-y-1">
                  <p className="text-xs font-black text-red-400 uppercase">❌ अरेरे! चूक गए!</p>
                  <p className="text-[9px] text-gray-300">आपका टाइम: <span className="font-bold text-white font-mono">{formatGameTimeDisplay(gameTime)}</span> रहा। ठीक 10.00 पर रोकें!</p>
                </div>
              )}

              {hasPlayedGame && gameResult !== 'win' && (
                <p className="text-[9px] text-gray-500 font-semibold uppercase italic">⚠️ इस आर्डर का चांस पूरा हो गया है। नया आर्डर बनाकर दोबारा खेलें!</p>
              )}

              {/* CONTROLS */}
              <div className="flex gap-3">
                {!isGameRunning ? (
                  <button 
                    onClick={handleStartGame} 
                    disabled={hasPlayedGame}
                    className={`flex-1 font-black p-4.5 rounded-2xl text-xs uppercase transition-all ${hasPlayedGame ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5' : 'bg-green-500 hover:bg-green-600 text-black'}`}
                  >
                    🚀 START
                  </button>
                ) : (
                  <button 
                    onClick={handleStopGame} 
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black p-4.5 rounded-2xl text-xs uppercase animate-pulse transition-all"
                  >
                    🛑 STOP
                  </button>
                )}
                <button 
                  onClick={() => { setIsGameOpen(false); setGameResult(null); setGameTime(0); }} 
                  className="bg-white/5 hover:bg-white/10 text-gray-400 font-bold p-4.5 rounded-2xl text-xs uppercase"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- AI CHAT INTERFACE MODAL (UPDATED WITH RIYA DIDI AVATAR FACE & OFFLINE ENGINE) --- */}
      <AnimatePresence>
        {isAiOpen && (
          <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="bg-[#111] w-full max-w-md h-[80vh] rounded-[3rem] border border-white/10 flex flex-col overflow-hidden relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-purple-600/10 to-pink-600/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" 
                      className="w-10 h-10 rounded-full object-cover border border-purple-500"
                      alt="Riya Didi"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#111] rounded-full" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-sm text-purple-300 uppercase italic">बम बम दीदी (रिया) 💁‍♀️</h3>
                    <p className="text-[8px] text-green-400 font-black uppercase">Online & Ready to Help</p>
                  </div>
                </div>
                <button onClick={() => setIsAiOpen(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-white"><X size={18} /></button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 no-scrollbar">
                {aiMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`p-4 rounded-2xl max-w-[85%] text-xs font-semibold leading-relaxed ${
                      msg.role === "user" 
                        ? 'bg-purple-600 text-white rounded-br-none' 
                        : 'bg-white/5 text-gray-200 border border-white/5 rounded-bl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-gray-400 flex items-center gap-2">
                      <Loader2 className="animate-spin" size={14} /> AI logic thinking...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendAiMessage} className="p-5 border-t border-white/5 bg-black/40 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Ask me anything (e.g. ₹150 me kya milega?)..." 
                  value={aiInput} 
                  onChange={(e) => setAiInput(e.target.value)} 
                  disabled={aiLoading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3.5 text-xs text-white outline-none focus:border-purple-500" 
                />
                <button type="submit" disabled={aiLoading} className="bg-purple-600 text-white font-black px-5 rounded-xl text-xs uppercase">
                  Send
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- WRITE REVIEW MODAL --- */}
      <AnimatePresence>
        {isReviewFormOpen && (
          <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6">
            <form onSubmit={handleReviewSubmit} className="bg-[#111] w-full max-w-md p-8 rounded-[3rem] border border-white/10 text-center space-y-4">
              <h3 className="text-2xl font-black text-orange-500 uppercase italic">Your Feedback</h3>
              <div className="space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Your Name</label>
                  <input type="text" placeholder="Apna naam likhein..." value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm text-white focus:border-orange-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Rating</label>
                  <div className="flex gap-2 text-yellow-400 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={24} fill={reviewRating >= star ? "currentColor" : "none"} onClick={() => setReviewRating(star)} className="cursor-pointer" />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500">Comments</label>
                  <textarea placeholder="Khana kaisa laga?..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm text-white focus:border-orange-500 outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-orange-500 text-black font-black p-4 rounded-xl text-sm uppercase">SUBMIT</button>
                <button type="button" onClick={() => setIsReviewFormOpen(false)} className="bg-white/5 text-gray-400 font-bold p-4 rounded-xl text-sm">CANCEL</button>
              </div>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* --- VARIANTS POPUP --- */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/95 z-[100] flex items-end">
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} className="bg-[#111] w-full p-8 rounded-t-[3.5rem] border-t border-white/10 max-w-lg mx-auto">
              <div className="w-16 h-1.5 bg-white/15 rounded-full mx-auto mb-6" />
              <h3 className="text-3xl font-black mb-1 text-center">{selectedProduct?.name}</h3>
              <p className="text-orange-500 font-black mb-6 uppercase text-[10px] text-center">Customize Your Order</p>
              
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase">1. Select Portion Size:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct?.variants || {}).map(([size, price]: any) => (
                    <button type="button" key={size} onClick={() => { setChosenSize(size); setChosenPrice(Number(price)); }} className={`p-4 rounded-2xl flex flex-col items-center border transition-all ${chosenSize === size ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-white/[0.03] border-white/5 text-gray-400'}`}>
                      <span className="capitalize text-sm font-black">{size}</span>
                      <span className="font-extrabold text-xs mt-1 text-white">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {(selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-3 mb-8 border-t border-white/5 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase">2. Optional Add-ons:</p>
                  <div className="space-y-2">
                    <div onClick={() => setAddonCheese(!addonCheese)} className={`p-4 rounded-2xl flex justify-between items-center border border-white/5 ${addonCheese ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/[0.03]'}`}>
                      <span className="text-xs font-black uppercase text-gray-300">🧀 Extra Cheese (Cheese burst)</span>
                      <span className="text-xs font-black text-orange-500">+₹30</span>
                    </div>
                    <div onClick={() => setAddonVeg(!addonVeg)} className={`p-4 rounded-2xl flex justify-between items-center border border-white/5 ${addonVeg ? 'bg-orange-500/10 border-orange-500/50' : 'bg-white/[0.03]'}`}>
                      <span className="text-xs font-black uppercase text-gray-300">🥦 Extra Vegetables / Paneer</span>
                      <span className="text-xs font-black text-orange-500">+₹20</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedProduct?.category === "Super Cool" && (
                <div className="space-y-4 border-t border-white/5 pt-4 mb-6">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">🍯 Sweetness (मीठा):</p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["Less Sugar", "Normal", "Extra Sugar"].map(lvl => (
                        <button 
                          type="button" 
                          key={lvl} 
                          onClick={() => setSugarLevel(lvl)} 
                          className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${sugarLevel === lvl ? 'bg-orange-500 text-black border-orange-500' : 'bg-white/5 text-gray-400 border-white/5'}`}
                        >
                          {lvl === "Less Sugar" ? "कम शक्कर" : lvl === "Normal" ? "नॉर्मल" : "तेज शक्कर"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">❄️ Ice Level (बर्फ):</p>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {["No Ice", "Less Ice", "Normal Ice"].map(lvl => (
                        <button 
                          type="button" 
                          key={lvl} 
                          onClick={() => setIceLevel(lvl)} 
                          className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${iceLevel === lvl ? 'bg-orange-500 text-black border-orange-500' : 'bg-white/5 text-gray-400 border-white/5'}`}
                        >
                          {lvl === "No Ice" ? "बिना बर्फ" : lvl === "Less Ice" ? "कम बर्फ" : "नॉर्मल बर्फ"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button type="button" onClick={handleAddToCart} className="w-full bg-orange-500 text-black p-5 rounded-2xl font-black uppercase">Confirm • ₹{chosenPrice + (addonCheese ? 30 : 0) + (addonVeg ? 20 : 0)}</button>
              <button type="button" onClick={() => { setSelectedProduct(null); setChosenSize(""); setChosenPrice(0); setAddonCheese(false); setAddonVeg(false); setSugarLevel("Normal"); setIceLevel("Normal Ice"); }} className="w-full mt-4 text-gray-500 font-black text-xs text-center uppercase">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
