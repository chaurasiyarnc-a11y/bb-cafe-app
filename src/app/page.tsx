'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, setDoc, increment, runTransaction } from 'firebase/firestore';
import { ShoppingBag, Plus, PowerOff, Search, ChevronRight, X, MapPin, Phone, User, Sparkles, Star, Percent, Gift, Loader2, Share2, Mic, Clock, MessageCircle } from 'lucide-react';
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

const ADDON_LABELS: { [key: string]: string } = {
  veg: "🥦 Extra Veg",
  paneer: "🧀 Paneer",
  oregano: "🌿 Oregano",
  chilli_flakes: "🌶️ Chilli Flakes",
  ketchup: "🍅 Tomato Ketchup",
  olive: "🫒 Black Olives",
  jalapeno: "🫑 Jalapeno"
};

const getLocalBotReply = (queryText: string, menuItems: any[]) => {
  const q = queryText.toLowerCase().trim();
  if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("राम राम") || q.includes("नमस्ते")) {
    return "राम-राम भैया! 🙏 हम हैं बम बम कैफ़े की डिजिटल हेल्पडेस्क 'रिया दीदी' 💁‍♀️। आज आपका क्या खाने का मन है? बजट या मूड बताओ, हम बढ़िया डिश बता रहे! 🍕🥤";
  }
  if (q.includes("about") || q.includes("कैफे") || q.includes("cafe") || q.includes("शुरुआत") || q.includes("कहानी")) {
    return "भैया, हमने बम बम कैफ़े की शुरुआत एक छोटे से सपने के साथ की थी—लोगों को घर जैसा स्वाद और कैफ़े वाला माहौल देने के लिए। यहाँ हर कप कॉफ़ी और हर स्लाइस पिज्जा प्यार और शुद्धता के साथ बनाया जाता है। हमारी कोशिश है कि आप जब भी यहाँ आएँ, एक प्यारी मुस्कान के साथ वापस जाएँ। ❤️";
  }
  if (q.includes("pizza") || q.includes("पिज्जा")) {
    const pizzas = menuItems.filter(i => i.category === "Special Pizza" || i.name.toLowerCase().includes("pizza"));
    if (pizzas.length > 0) return `भैया, हमारे यहाँ ये लाजवाब पिज्जा हैं:\n${pizzas.map(p => `• ${p.name} - ₹${p.price}`).join('\n')}\n\nसब शुद्ध अमूल चीज़ से बने हैं! 🍕`;
    return "भैया, गरमा-गरम अमूल चीज़ वाला स्पेशल पिज़्ज़ा मिल जाएगा, अभी आर्डर करें! 🍕";
  }
  if (q.includes("delivery") || q.includes("डिलीवरी")) {
    return "भैया, होम डिलीवरी बिल्कुल फ्री है (टाउन में ₹99 से ऊपर)! स्वाद सीधे आपके दरवाज़े तक आएगा। 🏠🛵\n• मोहंद्रा टाउन: ₹99 से ऊपर फ्री\n• 5 किलोमीटर: ₹499 से ऊपर फ्री\n• 12 किलोमीटर: ₹999 से ऊपर फ्री";
  }
  if (q.includes("address") || q.includes("पता") || q.includes("location")) {
    return "बम बम कैफ़े का पता है: 📍 बस स्टैंड मोहंद्रा, पीपल पेड़ के नीचे, मोहंद्रा (जिला पन्ना, मध्य प्रदेश)। आप नीचे मैप का बटन दबाकर डायरेक्ट नेविगेट कर सकते हैं! 🗺️";
  }
  return "माफ़ी चाहते हैं भैया, आपकी बात हम पूरे तरीके से समझ नहीं पाए। आप हमारे मेनू के बारे में, डिलीवरी या कैफ़े के पते के बारे में कुछ भी पूछ सकते हैं! 🙏";
};

const getAddonPrice = (addonKey: string, size: string) => {
  const s = String(size).toLowerCase().trim();
  if (s === 'medium') {
    if (addonKey === 'veg') return 10;
    if (addonKey === 'paneer') return 30;
    if (addonKey === 'oregano') return 5;
    if (addonKey === 'chilli_flakes') return 5;
    if (addonKey === 'ketchup') return 5;
    if (addonKey === 'olive') return 30;
    if (addonKey === 'jalapeno') return 30;
  } else if (s === 'large') {
    if (addonKey === 'veg') return 20;
    if (addonKey === 'paneer') return 40;
    if (addonKey === 'oregano') return 10;
    if (addonKey === 'chilli_flakes') return 10;
    if (addonKey === 'ketchup') return 10;
    if (addonKey === 'olive') return 40;
    if (addonKey === 'jalapeno') return 40;
  } else {
    if (addonKey === 'veg') return 10;
    if (addonKey === 'paneer') return 20;
    if (addonKey === 'oregano') return 5;
    if (addonKey === 'chilli_flakes') return 5;
    if (addonKey === 'ketchup') return 5;
    if (addonKey === 'olive') return 20;
    if (addonKey === 'jalapeno') return 20;
  }
  return 0;
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
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: boolean }>({});

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
  const [isPinned, setIsPinned] = useState(false); 

  const formatBillNumber = (num: number) => String(num).padStart(4, '0');

  useEffect(() => {
    setMounted(true);

    // --- CRASH-PROOF FIREBASE REALTIME SUBSCRIPTIONS ---
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => { 
      if(d.exists()) setStoreOpen(d.data().isOpen); 
    }, (err) => console.log(err));

    const unsubMenu = onSnapshot(query(collection(db, "products")), (snap) => {
      setMenu(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((i: any) => i.isVisible !== false));
    }, (err) => console.log(err));

    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => { 
      setDbCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    }, (err) => console.log(err));

    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => { 
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    }, (err) => console.log(err));

    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => { 
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    }, (err) => console.log(err));

    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((r: any) => r.isApproved === true));
    }, (err) => console.log(err));

    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => { 
      setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    }, (err) => console.log(err));
    
    const unsubRiders = onSnapshot(collection(db, "delivery_boys"), (snap) => {
      setDeliveryBoys(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.log(err));

    const savedDetails = localStorage.getItem('bb_cafe_customer');
    if (savedDetails) { try { setCustomerDetails(JSON.parse(savedDetails)); } catch (err) {} }

    return () => { unsubStore(); unsubMenu(); unsubCats(); unsubBanners(); unsubReviews(); unsubCoupons(); unsubRules(); unsubRiders(); };
  }, []);

  // --- Dynamic Scroll Tracker to Pin/Unpin Search Bar ---
  useEffect(() => {
    const handleScroll = () => {
      setIsPinned(window.scrollY > 180); 
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
      toast.error("काफी दुःख की बात है, आपका ब्राउज़र वॉइस सर्च सपोर्ट नहीं करता है।");
    }
  };

  // --- DEFINED getClaimStatus HELPER ---
  const getClaimStatus = (platform: string) => {
    if (!customerDetails?.phone) return "🎁 +1 Pt";
    const storageKey = `bb_claimed_${customerDetails.phone.replace("+91", "")}_${platform}`;
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) ? "✅ Claimed" : "🎁 Claim +1 Pt";
    }
    return "🎁 Claim +1 Pt";
  };

  // --- DEFINED handleSocialClick HELPER ---
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
      toast.success("🎉 बधाई हो! हमें फॉलो करने के लिए आपको +1 पॉइंट मिला है!");
    } catch (err) {
      toast.error("पॉइंट्स जोड़ने में समस्या आई।");
    }
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

  const getTotal = () => cart.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);

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
    
    const msg = `🔥 *BUM BUM CAFE - NEW ORDER*\n\n*Bill No:* #${formattedBillStr}\n*Token No:* #${tokenNumber}\n*Customer:* ${customerDetails.name}\n*Phone:* ${customerDetails.phone}\n*Address:* ${address}\n*Cutlery Needed:* ${noCutlery ? 'No 🌳' : 'Yes'}\n\n*ITEMS:*\n${itemsText}\n*Subtotal:* ₹${subtotal}\n*Discount:* -₹${couponDiscount}\n*Delivery:* ₹${deliveryCharge}\n*TOTAL BILL: ₹${finalTotal}*\n\n*Points Earned:* +${pointsEarned} Pts\n${totalPointsCost > 0 ? `*Points Redeemed:* -${totalPointsCost} Pts\n` : ''}\n_Confirm order by replying 'YES'_`;
    
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

  if (!mounted) return null;

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-32 font-sans relative">
      <Toaster position="top-center" />
      
      {/* HEADER */}
      <header className="relative h-44 bg-gradient-to-b from-[#ff5e00] to-[#b33600] flex flex-col justify-center items-center px-4">
        <div className="absolute top-4 right-4 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5 z-10 text-[9px] font-black uppercase tracking-widest text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />100% PURE VEG
        </div>
        <div className="text-center z-10">
          <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-4xl font-black italic tracking-tighter text-yellow-300 drop-shadow-[0_4px_12px_rgba(253,224,71,0.2)]">BUM BUM CAFE</motion.h1>
          <p className="text-orange-100 font-bold tracking-wider text-xs mt-1 uppercase">मशहूर स्वाद, अटूट भरोसा! 🔥</p>
          <p className="text-yellow-300 font-black tracking-widest text-[10px] mt-1 uppercase flex items-center gap-1 justify-center"><MapPin size={10} /> मोहंद्रा कैफ़े</p>
        </div>
      </header>

      {/* DYNAMIC FIXED SEARCH BAR WITH SLIDING PLACEHOLDER & VOICE SEARCH (z-[60] to prevent sidebar overlap & layout shift) */}
      <div className="h-[80px]">
        <div className={`${isPinned ? 'fixed top-0 left-0 right-0 border-b-2 border-orange-500/25 bg-[#050505] shadow-2xl shadow-black/80' : 'relative bg-[#050505] border-b border-white/5 rounded-b-3xl'} transition-all duration-300 z-[60] py-4 px-4`}>
          <div className="relative max-w-[220px] mx-auto">
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
      </div>

      {/* TRIPLE SIDE-TOGGLES STACKED CLEANLY ON LEFT SIDE (z-[45] so they scroll cleanly behind fixed search bar) */}
      <button 
        onClick={() => setIsSocialsOpen(true)} 
        className="fixed left-0 top-[280px] -translate-y-1/2 bg-[#ff5e00] text-white py-4 px-2.5 rounded-r-2xl z-[45] text-[9px] font-black tracking-widest uppercase flex flex-col items-center gap-1 shadow-xl border-r border-y border-white/10"
        style={{ writingMode: 'vertical-lr' }}
      >
        FOLLOW
      </button>

      <button 
        onClick={() => setIsReviewsDrawerOpen(true)} 
        className="fixed left-0 top-[360px] -translate-y-1/2 bg-yellow-400 text-black py-4 px-2.5 rounded-r-2xl z-[45] text-[9px] font-black tracking-widest uppercase flex flex-col items-center gap-1 shadow-xl"
        style={{ writingMode: 'vertical-lr' }}
      >
        REVIEWS
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

        {/* PROMO BANNER (Default slider fallback) */}
        <div className="w-full h-44 rounded-3xl overflow-hidden relative border border-white/5 bg-white/[0.02] cursor-pointer">
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

        {/* ZOMATO-STYLE CATEGORY HORIZONTAL SLIDER */}
        <div className="space-y-4 py-2">
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
                <div className="p-5 flex flex-col justify-between flex-1 text-left">
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
                      <button 
                        onClick={() => {
                          item.variants ? setSelectedProduct(item) : addItem(item);
                        }} 
                        className="px-5 py-2.5 bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white rounded-xl font-black text-xs active:scale-95 transition-all uppercase shadow-md"
                      >
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

      {/* --- FLOATING AI CHAT BUBBLE (Bottom Left - Styled as a tiny non-disturbing Message Icon 💬) --- */}
      <button 
        onClick={() => setIsAiOpen(true)} 
        className="fixed bottom-24 left-4 w-11 h-11 bg-gradient-to-tr from-[#ff5e00] to-[#b33600] rounded-full shadow-2xl z-40 transition-all active:scale-95 border border-white/10 flex items-center justify-center overflow-hidden hover:rotate-6"
      >
        <MessageCircle size={18} className="text-white" />
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

      {/* --- GAMIFIED SOCIAL MEDIA MODAL --- */}
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

      {/* --- WRITE REVIEW MODAL (With Quick-Click Suggestion Chips) --- */}
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
                
                {/* QUICK-CLICK REVIEW SUGGESTION CHIPS */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500">Quick Comments (एक क्लिक में चुनें)</label>
                  <div className="flex flex-wrap gap-2 py-1 max-h-24 overflow-y-auto no-scrollbar">
                    {REVIEW_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setReviewComment(sug)}
                        className="bg-white/5 hover:bg-orange-500/20 hover:text-orange-400 text-gray-300 px-3 py-1.5 rounded-full text-[10px] font-bold border border-white/5 transition-all active:scale-95"
                      >
                        {sug}
                      </button>
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

              {/* DYNAMIC SPECIFIC PIZZA SIZE ADD-ON MATRIX SECTION */}
              {(selectedProduct?.category === "Special Pizza" || selectedProduct?.name?.toLowerCase().includes("pizza")) && chosenSize && (
                <div className="space-y-3 mb-8 border-t border-white/5 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase">2. Optional Add-ons (Size: {chosenSize}):</p>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                    {Object.keys(ADDON_LABELS).map((addonKey) => {
                      const isSelected = selectedAddons[addonKey] === true;
                      const price = getAddonPrice(addonKey, chosenSize);
                      return (
                        <button
                          type="button"
                          key={addonKey}
                          onClick={() => handleAddonToggle(addonKey)}
                          className={`p-3.5 rounded-xl border flex justify-between items-center text-[10px] font-black uppercase transition-all ${isSelected ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-white/5 border-white/5 text-gray-400'}`}
                        >
                          <span className="truncate">{ADDON_LABELS[addonKey]}</span>
                          <span>+₹{price}</span>
                        </button>
                      );
                    })}
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

              <button type="button" onClick={handleAddToCart} className="w-full bg-orange-500 text-black p-5 rounded-2xl font-black uppercase">Confirm • ₹{chosenPrice + Object.keys(selectedAddons).filter(k => selectedAddons[k] === true).reduce((acc, k) => acc + getAddonPrice(k, chosenSize), 0)}</button>
              <button type="button" onClick={() => { setSelectedProduct(null); setChosenSize(""); setChosenPrice(0); setSelectedAddons({}); setSugarLevel("Normal"); setIceLevel("Normal Ice"); }} className="w-full mt-4 text-gray-500 font-black text-xs text-center uppercase">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
