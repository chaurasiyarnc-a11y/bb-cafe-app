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

// --- ADVANCED OFFLINE GEMINI FALLBACK REPLY ENGINE (To Prevent Connection Error) ---
const getLocalBotReply = (queryText: string, menuItems: any[]) => {
  const q = queryText.toLowerCase().trim();
  
  if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("राम राम") || q.includes("नमस्ते") || q.includes("namaste") || q.includes("हलो")) {
    return "राम-राम भैया! 🙏 हम हैं बम बम कैफ़े की डिजिटल हेल्पडेस्क 'रिया दीदी'। आज आपका का खाबे को मन है? हमें बजट या मूड बताओ, हम बढ़िया डिश बता रहे! 🍕🥤";
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
      // --- TRIGGER SMART OFFLINE DESI REPLY ENGINE IF API FAILS ---
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
    const finalTotal = Math.max(0, subtotal - couponDiscount) + deliveryCharge;
    
    const pointsEarned = Math.floor(finalTotal / 100);
    const totalPointsCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);

    try {
      await addDoc(collection(db, "orders"), {
        billNumber, tokenNumber, customerName: customerDetails.name, customerPhone: customerDetails.phone,
        address, items: cart, subtotal, discount: couponDiscount, total: finalTotal, timestamp: new Date(), status: 'pending'
      });
      if (pointsEarned > 0 || totalPointsCost > 0) {
        await setDoc(doc(db, "customer_points", customerDetails.phone.replace("+91", "")), {
          name: customerDetails.name, phone: customerDetails.phone.replace("+91", ""), points: increment(pointsEarned - totalPointsCost), lastActive: new Date()
        }, { merge: true });
      }
    } catch (e) {}

    let itemsText = "";
    cart.forEach((i: any) => itemsText += `• ${i.name || "Item"} x${i.quantity || 1} - ₹${(i.price || 0) * (i.quantity || 1)}\n`);
    
    const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Address:* ${address}\n*Cutlery Needed:* ${noCutlery ? 'No 🌳' : 'Yes'}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal}\n*Coupon Discount:* -₹${couponDiscount}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${finalTotal}*\n\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}\n_Confirm order by replying 'YES'_`;
    
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

      {/* STICKY SEARCH BAR WITH SLIDING PLACEHOLDER & VOICE SEARCH (z-50) */}
      <div className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md py-4 px-4 border-b border-white/5 rounded-b-3xl">
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

      {/* DOUBLE SIDE-TOGGLES STACKED CLEANLY ON THE RIGHT */}
      <button 
        onClick={() => setIsSocialsOpen(true)} 
        className="fixed right-0 top-[31%] -translate-y-1/2 bg-[#ff5e00] text-white py-4 px-2.5 rounded-l-2xl z-40 text-[9px] font-black tracking-widest uppercase flex flex-col items-center gap-1 shadow-xl border-l border-y border-white/10"
        style={{ writingMode: 'vertical-lr' }}
      >
        📱 FOLLOW & EARN
      </button>

      <button 
        onClick={() => setIsReviewsDrawerOpen(true)} 
        className="fixed right-0 top-[44%] -translate-y-1/2 bg-yellow-400 text-black py-4 px-2.5 rounded-l-2xl z-40 text-[9px] font-black tracking-widest uppercase flex flex-col items-center gap-1 shadow-xl"
        style={{ writingMode: 'vertical-lr' }}
      >
        ⭐ REVIEWS
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

        {/* ZOMATO-STYLE CATEGORY HORIZONTAL SLIDER (Without "See More" Button) */}
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
              <p className="text-gray-200">Bum Bum Cafe, बस स्टैंड मोहंद्रा, पीपल पेड़ के नीचे, मोहंद्रा (जिला पन्ना, मध्य प्रदेश)</p>
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

      {/* --- FLOATING AI CHAT BUBBLE (Bottom Left) --- */}
      <button 
        onClick={() => setIsAiOpen(true)} 
        className="fixed bottom-24 left-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3.5 rounded-full shadow-2xl z-40 transition-all active:scale-95 border border-white/10 animate-pulse"
      >
        💬 AI
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
              {/* Header (Updated with Riya Didi Avatar Calling Face) */}
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

      {/* --- CART / CHECKOUT SIDEBAR - PREMIUM SLIDE-UP BOTTOM SHEET --- */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-end">
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 26, stiffness: 190 }}
              className="bg-[#0b0c10] w-full h-[92vh] rounded-t-[3rem] border-t border-white/10 overflow-y-auto pb-32 p-6 max-w-lg mx-auto relative shadow-2xl"
            >
              <div className="w-16 h-1.5 bg-white/15 rounded-full mx-auto mb-6" />
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-white">Your Order</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all"><X size={24} /></button>
              </div>

              {cart.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center bg-white/[0.02] p-5 rounded-3xl mb-4 border border-white/5">
                  <div className="min-w-0 pr-3">
                    <h4 className="font-bold text-sm text-gray-100 truncate">{item?.name || "Item"}</h4>
                    <p className="text-orange-500 font-black mt-1">₹{item?.price || 0}</p>
                  </div>
                  <div className="flex items-center gap-2.5 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/10 flex-shrink-0">
                    <button onClick={() => removeItem(item.id)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg text-lg font-black">-</button>
                    <span className="font-black text-sm px-1.5 text-white">{item.quantity}</span>
                    {item.isReward ? (
                      <button disabled className="w-8 h-8 flex items-center justify-center bg-white/5 text-gray-600 rounded-lg text-lg font-black cursor-not-allowed">+</button>
                    ) : (
                      <button onClick={() => addItem(item)} className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 rounded-lg text-lg font-black">+</button>
                    )}
                  </div>
                </div>
              ))}

              <div className="mt-10 space-y-6">
                
                {/* --- FREE DELIVERY VISUAL PROGRESS BAR --- */}
                {(() => {
                  const subtotal = getTotal();
                  const threshold = 99;
                  const progress = Math.min((subtotal / threshold) * 100, 100);
                  const needed = threshold - subtotal;

                  return (
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3">
                      {subtotal < threshold ? (
                        <>
                          <div className="flex justify-between items-center text-[10px] font-black uppercase">
                            <span className="text-orange-400">⚡ Free Delivery Progress</span>
                            <span className="text-gray-400">Add ₹{needed} more</span>
                          </div>
                          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-orange-500 to-yellow-400 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/20 p-3 rounded-2xl justify-center">
                          🎉 Congratulations! You got FREE Delivery
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* DYNAMIC DELIVERY AREA SELECTOR (Updated for 12km) */}
                <div className="bg-white/[0.02] p-5 rounded-[2.2rem] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-orange-500">
                    <MapPin size={18}/>
                    <h3 className="font-black uppercase text-xs">Select Delivery Area</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryArea('town')}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase border ${deliveryArea === 'town' ? 'bg-orange-500 text-black border-orange-500 shadow-md' : 'bg-white/5 text-gray-400 border-white/5'}`}
                    >
                      Town (Free &gt; ₹99)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryArea('outer')}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase border ${deliveryArea === 'outer' ? 'bg-orange-500 text-black border-orange-500 shadow-md' : 'bg-white/5 text-gray-400 border-white/5'}`}
                    >
                      5 Km (Free &gt; ₹499)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryArea('long')}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase border ${deliveryArea === 'long' ? 'bg-orange-500 text-black border-orange-500 shadow-md' : 'bg-white/5 text-gray-400 border-white/5'}`}
                    >
                      12 Km (Charge: ₹99)
                    </button>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-[2rem] p-5 space-y-2">
                  <div className="flex items-center gap-2 text-orange-400 font-black text-xs uppercase"><Sparkles size={16}/> <span>Free Delivery Rules</span></div>
                  <ul className="text-[11px] text-gray-400 font-bold space-y-1">
                    <li>• मोहंद्रा टाउन: Free above ₹99 <span className="text-green-500">({getTotal() >= 99 ? 'Achieved' : 'Need ₹' + (99 - getTotal()) + ' more'})</span></li>
                    <li>• 5 किलोमीटर: Free above ₹499</li>
                    <li>• 12 किलोमीटर: Free above ₹999</li>
                  </ul>
                </div>

                {customerDetails && (
                  <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-[2rem] p-5 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-400 font-black text-xs uppercase"><Gift size={14}/> <span>⭐ बम बम लॉयल्टी क्लब</span></div>
                    
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <h4 className="text-3xl font-black text-white">{customerPoints} <span className="text-[10px] text-gray-500 font-bold uppercase">Points</span></h4>
                        <p className="text-[9px] text-gray-400">Spend ₹100 = Get 1 Point!</p>
                      </div>
                      <div className="text-right text-[9px] text-yellow-400 font-black space-y-1 uppercase tracking-wider bg-yellow-400/5 p-3 rounded-xl border border-yellow-400/10 max-h-24 overflow-y-auto no-scrollbar">
                        {loyaltyRules.length === 0 ? (
                          <><p>🎁 10 Pts = Sandwich</p><p>🎁 20 Pts = Small Pizza</p></>
                        ) : (
                          loyaltyRules.map(rule => (<p key={rule.id}>🎁 {rule.pointsCost} Pts = {rule.rewardName}</p>))
                        )}
                      </div>
                    </div>

                    {/* SHARE & REFERRAL POINTS CARD */}
                    <div className="pt-2 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-black uppercase flex items-center gap-1">📤 Share Progress:</span>
                        <span className="text-[10px] text-yellow-400 font-black tracking-widest bg-yellow-400/10 px-2.5 py-0.5 rounded-lg border border-yellow-400/20">{shareCount}/5 Shared</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleShareApp} 
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-2 border border-green-500/20 transition-all shadow-md active:scale-95"
                      >
                        <Share2 size={14}/>
                        <span>Invite 5 Friends & Get +1 Point! 🎁</span>
                      </button>
                    </div>
                    
                    <div className="pt-2.5 border-t border-white/5 flex justify-between items-center mt-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Gift points to friend:</span>
                      <button type="button" onClick={() => setIsGiftModalOpen(true)} className="bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400 border border-yellow-400/20 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase">🎁 Gift Points</button>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-white/5 mt-2">
                      <p className="text-[10px] text-gray-400 font-black uppercase">Redeem Your Points Here:</p>
                      <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto no-scrollbar pr-1 mt-1">
                        {loyaltyRules.length === 0 ? (
                          <>
                            <button type="button" onClick={() => handleCustomerRedeem("reward-sandwich", "🎁 FREE Loyalty Sandwich", 10)} disabled={customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) < 10} className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase border ${(customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) >= 10) ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white/5 text-gray-500 border-white/5'}`}>🥪 Sandwich (10 P)</button>
                            <button type="button" onClick={() => handleCustomerRedeem("reward-pizza", "🎁 FREE Loyalty Small Pizza", 20)} disabled={customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) < 20} className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase border ${(customerPoints - cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0) >= 20) ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white/5 text-gray-500 border-white/5'}`}>🍕 Pizza (20 P)</button>
                          </>
                        ) : (
                          loyaltyRules.map(rule => {
                            const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                            const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                            return (
                              <button key={rule.id} type="button" onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)} disabled={!isAffordable} className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase border truncate ${isAffordable ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white/5 text-gray-500 border-white/5'}`}>🎁 {rule.rewardName} ({rule.pointsCost} P)</button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* GREEN CUTLERY SELECTOR */}
                <div className="flex items-center justify-between px-5 py-4 bg-green-500/5 border border-green-500/10 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🌳</span>
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase text-green-400 block">Don't send plastic spoons (Save Earth)</span>
                      <p className="text-[8px] text-gray-400 font-semibold">Ghar par chammach hai? Plastic kachra bachayein!</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={noCutlery} 
                    onChange={(e) => setNoCutlery(e.target.checked)} 
                    className="w-5 h-5 accent-green-500 cursor-pointer" 
                  />
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] space-y-3">
                  <div className="flex items-center gap-2 text-orange-500 font-black text-xs uppercase"><Percent size={16}/> <span>Have a promo code?</span></div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="e.g. WELCOME" value={enteredCoupon} onChange={(e) => setEnteredCoupon(e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white uppercase" />
                    <button type="button" onClick={handleApplyCoupon} className="bg-orange-500 text-black font-black text-xs p-3 px-5 rounded-xl">APPLY</button>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-xs bg-green-500/10 border border-green-500/25 p-3 rounded-xl">
                      <span className="text-green-400 font-bold uppercase">Code Applied: {appliedCoupon.code}</span>
                      <button onClick={() => { setAppliedCoupon(null); setEnteredCoupon(""); }} className="text-red-400 font-bold">Remove</button>
                    </div>
                  )}
                </div>

                {customerDetails ? (
                  <div className="bg-white/[0.02] p-5 rounded-[2.2rem] border border-white/5 flex justify-between items-center">
                    <div className="text-left">
                      <p className="text-[9px] text-gray-500 font-black uppercase">Ordering As</p>
                      <h4 className="font-black text-md text-orange-500">{customerDetails.name}</h4>
                      <p className="text-xs text-gray-400">{customerDetails.phone}</p>
                    </div>
                    <button onClick={() => { localStorage.removeItem('bb_cafe_customer'); setCustomerDetails(null); }} className="text-[10px] bg-red-500/10 text-red-500 px-3 py-2 rounded-xl font-black uppercase">Change</button>
                  </div>
                ) : (
                  <button onClick={() => setIsLoginOpen(true)} className="w-full p-5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-[2.2rem] font-black text-sm uppercase">👤 Add Name & Phone To Order</button>
                )}

                <div className="bg-white/[0.02] p-5 rounded-[2.2rem] border border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-orange-500"><MapPin size={18}/> <h3 className="font-black uppercase text-xs">Delivery Address</h3></div>
                  <textarea placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-semibold text-white resize-none h-24 outline-none" />
                </div>

                <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-8 rounded-[2.5rem] text-white">
                  <div className="flex justify-between font-bold mb-2 text-sm"><span>Items Total</span> <span>₹{getTotal()}</span></div>
                  {appliedCoupon && (
                    <div className="flex justify-between font-bold mb-2 text-sm text-green-200"><span>Coupon Discount</span> <span>-₹{appliedCoupon.discountValue}</span></div>
                  )}
                  <div className="flex justify-between font-bold mb-4 text-sm opacity-90"><span>Delivery Charge</span> <span>{deliveryArea === 'town' ? (getTotal() < 99 ? "₹20" : "FREE") : deliveryArea === 'outer' ? (getTotal() < 499 ? "₹50" : "FREE") : (getTotal() < 999 ? "₹99" : "FREE")}</span></div>
                  <div className="h-px bg-white/20 mb-4" />
                  <div className="flex justify-between font-black text-2xl"><span>To Pay</span> <span>₹{Math.max(0, getTotal() - (appliedCoupon ? appliedCoupon.discountValue : 0)) + (deliveryArea === 'town' ? (getTotal() < 99 ? 20 : 0) : deliveryArea === 'outer' ? (getTotal() < 499 ? 50 : 0) : (getTotal() < 999 ? 99 : 0))}</span></div>
                </div>

                <button onClick={sendWhatsAppOrder} type="button" className="w-full bg-green-600 hover:bg-green-700 p-6 rounded-[2.5rem] font-black text-md text-white flex items-center justify-center gap-3">ORDER ON WHATSAPP</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- LARGE YELLOW FLOATING CART BUTTON (Springy Slide-up) --- */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm md:max-w-md px-4">
          <motion.button
            key={cart.reduce((acc: number, item: any) => acc + item.quantity, 0)}
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#facc15] hover:bg-[#eab308] text-black py-4.5 px-6 rounded-[2rem] font-black text-sm uppercase flex justify-between items-center shadow-[0_12px_40px_rgba(250,204,21,0.25)] border border-yellow-300/30 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={20} />
              <span className="text-xs font-black tracking-wider">{cart.reduce((acc: number, item: any) => acc + item.quantity, 0)} Items Added</span>
            </div>
            <div className="flex items-center gap-1 bg-black/10 px-3.5 py-1.5 rounded-full border border-black/5">
              <span className="text-[10px] font-black uppercase">View Cart</span>
              <ChevronRight size={14} />
            </div>
          </motion.button>
        </div>
      )}

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
                  <label className="text-xs font-bold text-gray-500 uppercase">Your Name</label>
                  <input type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center font-bold text-white outline-none focus:border-orange-500" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mobile Number</label>
                  <input type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center font-bold text-white outline-none focus:border-orange-500" required />
                </div>
              </div>
              <button type="submit" className="w-full bg-orange-500 text-black p-5 rounded-2xl font-black text-md uppercase">PROCEED TO ORDER</button>
              <button type="button" onClick={() => setIsLoginOpen(false)} className="mt-6 text-gray-500 text-xs font-black uppercase block mx-auto">Close</button>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* GIFT POINTS MODAL */}
      <AnimatePresence>
        {isGiftModalOpen && (
          <div className="fixed inset-0 bg-black/95 z-[260] flex items-center justify-center p-6">
            <motion.form onSubmit={handleGiftPoints} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] w-full max-w-md p-8 rounded-[3rem] border border-white/10 text-center space-y-6 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-400/10 blur-3xl rounded-full" />
              <div className="inline-flex p-4 bg-yellow-400/10 rounded-full text-yellow-400"><Gift size={32} /></div>
              <div>
                <h3 className="text-2xl font-black text-yellow-400 uppercase italic">Gift Loyalty Points</h3>
                <p className="text-xs text-gray-500 font-semibold mt-1">अपने पॉइंट्स किसी दोस्त को गिफ्ट करें</p>
              </div>
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">Friend's Phone Number</label>
                  <input type="tel" maxLength={10} placeholder="e.g. 9876543210" value={giftPhone} onChange={(e) => setGiftPhone(e.target.value)} required className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm font-bold text-white outline-none text-center" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">Points to Gift (Your Pts: {customerPoints})</label>
                  <input type="number" placeholder="e.g. 10" value={giftPointsAmount} onChange={(e) => setGiftPointsAmount(e.target.value === "" ? "" : Number(e.target.value))} required className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-sm font-bold text-white outline-none text-center" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isGiftingLoading} className="flex-1 bg-yellow-400 text-black font-black p-4 rounded-xl text-sm uppercase flex items-center justify-center gap-2">
                  {isGiftingLoading ? <Loader2 className="animate-spin" size={16} /> : <span>Gift Points 🎁</span>}
                </button>
                <button type="button" onClick={() => { setIsGiftModalOpen(false); setGiftPhone(""); setGiftPointsAmount(""); }} className="bg-white/5 text-gray-400 font-bold p-4 rounded-xl text-sm">CANCEL</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* GAMIFIED SOCIAL MEDIA MODAL */}
      <AnimatePresence>
        {isSocialsOpen && (
          <div className="fixed inset-0 bg-black/95 z-[250] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111] w-full max-w-md p-8 rounded-[3rem] border border-white/10 text-center space-y-6 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
              <div>
                <h3 className="text-2xl font-black text-orange-500 uppercase italic">Connect & Earn Points</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">हर प्लेटफार्म पर फॉलो/सब्सक्राइब करने का +1 पॉइंट पाएं!</p>
              </div>
              <div className="space-y-3 text-left max-h-[22rem] overflow-y-auto no-scrollbar pr-1">
                
                {/* WHATSAPP MESSAGE */}
                <button 
                  onClick={() => handleSocialClick('whatsapp_msg', 'https://wa.me/919714293759')}
                  className="w-full flex items-center justify-between bg-green-500/10 border border-green-500/20 p-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🟢</span>
                    <div>
                      <h4 className="text-xs font-black text-white">WhatsApp Message</h4>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Contact Us: 9714293759</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${getClaimStatus('whatsapp_msg').startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-400 text-black'}`}>
                    {getClaimStatus('whatsapp_msg')}
                  </span>
                </button>

                {/* WHATSAPP CHANNEL */}
                <button 
                  onClick={() => handleSocialClick('whatsapp_channel', 'https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y')}
                  className="w-full flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">📢</span>
                    <div>
                      <h4 className="text-xs font-black text-white">WhatsApp Channel</h4>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Subscribe for Offers</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${getClaimStatus('whatsapp_channel').startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-400 text-black'}`}>
                    {getClaimStatus('whatsapp_channel')}
                  </span>
                </button>

                {/* YOUTUBE */}
                <button 
                  onClick={() => handleSocialClick('youtube', 'https://www.youtube.com/@bbcafe.i')}
                  className="w-full flex items-center justify-between bg-red-600/10 border border-red-600/20 p-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🔴</span>
                    <div>
                      <h4 className="text-xs font-black text-white">YouTube Channel</h4>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Subscribe @bbcafe.i</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${getClaimStatus('youtube').startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-400 text-black'}`}>
                    {getClaimStatus('youtube')}
                  </span>
                </button>

                {/* INSTAGRAM */}
                <button 
                  onClick={() => handleSocialClick('instagram', 'https://www.instagram.com/bbcafe.in/')}
                  className="w-full flex items-center justify-between bg-pink-500/10 border border-pink-500/20 p-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">📸</span>
                    <div>
                      <h4 className="text-xs font-black text-white">Instagram</h4>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Follow @bbcafe.in</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${getClaimStatus('instagram').startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-400 text-black'}`}>
                    {getClaimStatus('instagram')}
                  </span>
                </button>

                {/* FACEBOOK */}
                <button 
                  onClick={() => handleSocialClick('facebook', 'https://www.facebook.com/bbcafe.in/')}
                  className="w-full flex items-center justify-between bg-blue-600/10 border border-blue-600/20 p-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🔵</span>
                    <div>
                      <h4 className="text-xs font-black text-white">Facebook</h4>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Like @bbcafe.in</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${getClaimStatus('facebook').startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-400 text-black'}`}>
                    {getClaimStatus('facebook')}
                  </span>
                </button>

                {/* SNAPCHAT */}
                <button 
                  onClick={() => handleSocialClick('snapchat', 'https://www.snapchat.com/add/bbcafe.in')}
                  className="w-full flex items-center justify-between bg-yellow-400/10 border border-yellow-400/20 p-3.5 rounded-2xl active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🟡</span>
                    <div>
                      <h4 className="text-xs font-black text-white">Snapchat</h4>
                      <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5">Add bbcafe.in</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${getClaimStatus('snapchat').startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-400 text-black'}`}>
                    {getClaimStatus('snapchat')}
                  </span>
                </button>

              </div>
              <button type="button" onClick={() => setIsSocialsOpen(false)} className="w-full bg-orange-500 text-black font-black p-4 rounded-xl text-xs uppercase">CLOSE</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
