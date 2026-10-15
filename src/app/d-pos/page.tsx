
'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, getDoc, getDocs, where, setDoc,
 deleteDoc, Timestamp, writeBatch, increment
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Settings, 
  Database, RefreshCw, Layers, LogOut, Lock, ToggleLeft, ToggleRight, 
  Trash2, UserPlus, Edit3, FileText, LayoutGrid, ChevronLeft, ChevronRight, 
  PackagePlus, BarChart3, HelpCircle, PauseCircle, PlayCircle, 
  Share2, Receipt, Send, Check, Plus, Eye,
  ArrowLeftRight, History, ChevronDown, ChevronUp, BellRing, Tag, Ticket, IndianRupee, Gamepad2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import PrintCustomerReceipt from '@/components/d-pos/PrintCustomerReceipt';
import PrintKitchenKot from '@/components/d-pos/PrintKitchenKot';

const SafeLock = Lock as any;
const SafeDatabase = Database as any;
const SafeLogOut = LogOut as any;
const SafeToggleRight = ToggleRight as any;
const SafeToggleLeft = ToggleLeft as any;
const SafeShoppingBag = ShoppingBag as any;
const SafeLayers = Layers as any;
const SafePrinter = Printer as any;
const SafeSearch = Search as any;
const SafeX = X as any;
const SafeRefreshCw = RefreshCw as any;
const SafeTrash2 = Trash2 as any;
const SafeUserPlus = UserPlus as any;
const SafeEdit3 = Edit3 as any;
const SafeFileText = FileText as any;
const SafeChevronLeft = ChevronLeft as any;
const SafeChevronRight = ChevronRight as any;
const SafePackagePlus = PackagePlus as any;
const SafeBarChart3 = BarChart3 as any;
const SafeHelpCircle = HelpCircle as any;
const SafePauseCircle = PauseCircle as any;
const SafePlayCircle = PlayCircle as any;
const SafeShare2 = Share2 as any;
const SafeSend = Send as any;
const SafePlus = Plus as any;
const SafeEye = Eye as any;

interface PosCartItem {
  cartItemId: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string; 
  variation?: string;
  size?: string;
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

interface HeldCart {
  id: string;
  cart: PosCartItem[];
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  fulfillmentType: 'delivery' | 'pickup' | 'table';
  heldAt: string;
  total: number;
  note?: string;
}

interface QuickCustomer {
  phone: string;
  name: string;
  address?: string;
  points?: number;
}

const PIZZA_ADDONS: { [size: string]: { [addon: string]: number } } = {
  "small": { "Veg Add-on": 10, "Paneer": 20, "Black Olives": 20, "Jalapeno": 20, "Extra Cheese": 20, "Mushroom": 20 },
  "medium": { "Veg Add-on": 10, "Paneer": 30, "Black Olives": 30, "Jalapeno": 30, "Extra Cheese": 30, "Mushroom": 30 },
  "large": { "Veg Add-on": 20, "Paneer": 40, "Black Olives": 40, "Jalapeno": 40, "Extra Cheese": 40, "Mushroom": 40 },
  "extra large": { "Veg Add-on": 30, "Paneer": 50, "Black Olives": 50, "Jalapeno": 50, "Extra Cheese": 60, "Mushroom": 50 }
};

const COOKING_TAGS = ['🌶️ Less Spicy', '🧅 No Onion/Garlic', '📦 Parcel/To-Go', '🧊 Less Ice', '🧀 Extra Dip', '☕ Kadak'];

const PROMO_COUPONS: { [code: string]: { type: 'percent' | 'flat', value: number } } = {
  'CAFE10': { type: 'percent', value: 10 },
  'BUM50': { type: 'flat', value: 50 },
  'WELCOME': { type: 'percent', value: 15 },
  'FLAT100': { type: 'flat', value: 100 }
};

let globalAudioCtx: AudioContext | null = null;

const getCategoryBaseCode = (catName: string): number => {
  const c = (catName || '').trim().toLowerCase();
  if (c.includes('burger')) return 1;
  if (c.includes('chinese')) return 100;
  if (c.includes('bread') || c.includes('roti') || c.includes('paratha')) return 200;
  if (c.includes('momo')) return 300;
  if (c.includes('paneer')) return 400;
  if (c.includes('fast food') || c.includes('snack') || c.includes('sandwich')) return 500;
  if (c.includes('pizza')) return 600;
  if (c.includes('shake') || c.includes('beverage') || c.includes('drink') || c.includes('super cool') || c.includes('chai') || c.includes('coffee')) return 700;
  if (c.includes('thali')) return 800;
  if (c.includes('rice') || c.includes('khichdi') || c.includes('biryani')) return 900;
  return 1000;
};

export default function BbCafeDesktopPos() {
  const DELIVERY_AREAS: DeliveryArea[] = useMemo(() => [
    { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
    { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
    { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
  ], []);

  // System States
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'settlement' | 'inventory' | 'receipts' | 'settings' | 'orders' | 'tables' | 'reports' | 'udhari' | 'customers'>('billing');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  // 👉 NEW: Cash Tendered Calculator On/Off
  const [cashTenderEnabled, setCashTenderEnabled] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [kotEnabled, setKotEnabled] = useState<boolean>(true); 
  const [upiIdConfig, setUpiIdConfig] = useState<string>('Q991347275@ybl');
 const [ownerPhoneConfig, setOwnerPhoneConfig] = useState<string>('919714293759');
  
  // 👉 NEW: Store Details Config (बिल पर छपने वाला नाम और पता)
  const [storeNameConfig, setStoreNameConfig] = useState<string>('BUM BUM CAFE');
  const [storeAddressConfig, setStoreAddressConfig] = useState<string>('न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने, जिला पन्ना, मध्य प्रदेश - 488442');
  const [storePhoneConfig, setStorePhoneConfig] = useState<string>('9714293759');
  const [manualInvoiceCounterInput, setManualInvoiceCounterInput] = useState<string>('200');
// 👉 NEW: स्मार्ट गेम कंट्रोलर (POS से गेम बदलने के लिए)
  const [activeGameType, setActiveGameType] = useState('SpinGame'); 

  useEffect(() => {
    if (!isLoggedIn) return;
    const unsub = onSnapshot(doc(db, "system_settings", "game_config"), (docSnap) => {
      if (docSnap.exists()) {
        setActiveGameType(docSnap.data().activeGame || 'SpinGame');
      }
    });
    return () => unsub();
  }, [isLoggedIn]);

  const handleToggleGame = async (gameType: string) => {
    triggerBeep('tap');
    await setDoc(doc(db, "system_settings", "game_config"), { activeGame: gameType }, { merge: true });
    
    let gameName = 'Spin Wheel';
    if (gameType === 'CatchGame') gameName = 'Catch Game';
    if (gameType === 'FruitNinja') gameName = 'Fruit Cutter';
    if (gameType === 'MemoryGame') gameName = 'Food Match'; 
    if (gameType === 'Cafe2048') gameName = 'Cafe 2048'; 
    if (gameType === 'HungrySnake') gameName = 'Hungry Snake';// 5वां गेम

    toast.success(`सफलतापूर्वक ${gameName} चालू कर दिया गया! 🎮`);
  };
  // Customer Directory & Numeric Search
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  
  const [customerPhone, setCustomerPhone] = useState('');
  const [recentCartCustomers, setRecentCartCustomers] = useState<any[]>([]);
  // 👉 NEW: स्मार्ट सर्च ड्रॉपडाउन के स्टेट्स
  const [cartCustSearchInput, setCartCustSearchInput] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [custSuggestions, setCustSuggestions] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [customerGamePoints, setCustomerGamePoints] = useState(0); // 👉 NEW: गेम पॉइंट्स स्टेट
  const [address, setAddress] = useState('');
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  

  const [showNewCustForm, setShowNewCustForm] = useState(false);
  const [newCustNameInput, setNewCustNameInput] = useState('');
  const [newCustAddressInput, setNewCustAddressInput] = useState('');

 // Cash Change Calculator
  const [cashTendered, setCashTendered] = useState<number | ''>('');

  const [isGameVerifyModalOpen, setIsGameVerifyModalOpen] = useState(false);
  const [gameSearchInput, setGameSearchInput] = useState('');
  const [gameVerifyResult, setGameVerifyResult] = useState<any>(null);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [isGameVerifying, setIsGameVerifying] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [showTodaysWinnersList, setShowTodaysWinnersList] = useState(false); 

  // आज के विजेताओं की लिस्ट ढूँढने के लिए 
  const todaysGameWinners = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return allCustomers.filter(c => {
       if (c.lastPrizeWon && c.lastPrizeWon !== 'Better Luck') {
         const playedTime = c.lastPlayedAt?.toDate ? c.lastPlayedAt.toDate().getTime() : new Date(c.lastPlayedAt || 0).getTime();
         return playedTime >= todayStart;
       }
       return false;
    });
  }, [allCustomers]);

  // गेम कूपन / नंबर चेक करने का फंक्शन
  const handleVerifyGameCode = async (searchVal: string) => {
    const term = searchVal.trim();
    if (!term) return toast.error("मोबाइल नंबर या BOM-XXXX कोड डालें!");

    setIsGameVerifying(true);
    setGameVerifyResult(null);

    try {
      let targetDoc: any = null;
      const cleanPhone = term.replace(/\D/g, '').slice(-10);

      // 1. अगर 10 अंकों का नंबर डाला है
      if (cleanPhone.length === 10) {
        const snap = await getDoc(doc(db, "customer_points", cleanPhone));
        if (snap.exists()) targetDoc = { id: snap.id, ...snap.data() };
      }

      // 2. अगर कूपन कोड डाला है (उदा. BOM-4821)
      if (!targetDoc && term.toUpperCase().startsWith("BOM-")) {
        const q = query(collection(db, "customer_points"), where("voucherCode", "==", term.toUpperCase()), limit(1));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) targetDoc = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
      }

      if (!targetDoc) {
        toast.error("❌ कोई रिकॉर्ड नहीं मिला! (फर्जी नंबर या कोड)");
        setIsGameVerifying(false);
        return;
      }

      const playedAt = targetDoc.lastPlayedAt?.toDate ? targetDoc.lastPlayedAt.toDate() : null;
      const minutesAgo = playedAt ? Math.floor((Date.now() - playedAt.getTime()) / 60000) : 999;

      setGameVerifyResult({
        ...targetDoc,
        minutesAgo
      });

     if (targetDoc.lastCatchGameScore !== undefined) {
        toast.success(`Catch Game: ${targetDoc.lastCatchGameScore} Score, ${targetDoc.gamePoints} Points Balance 🎮`);
      } else if (targetDoc.voucherClaimed) {
        toast.error("🚫 यह कूपन पहले ही इस्तेमाल हो चुका है!");
      } else if (targetDoc.lastPrizeWon === "Better Luck") {
        toast("⚠️ इस ग्राहक को कोई इनाम नहीं मिला था (Better Luck)!", { icon: "ℹ️" });
      } else {
        toast.success(`असली इनाम: ${targetDoc.lastPrizeWon} ✅`);
      }
    } catch (e) {
      toast.error("वेरिफाई करने में समस्या आई!");
    } finally {
      setIsGameVerifying(false);
    }
  };

  // इनाम को इस्तेमाल (Redeem) मार्क करना
  const handleClaimGameReward = async () => {
    if (!gameVerifyResult) return;
    setIsClaimingReward(true);

    try {
      const phoneId = gameVerifyResult.phone || gameVerifyResult.id;
      await updateDoc(doc(db, "customer_points", phoneId), {
        voucherClaimed: true,
        voucherClaimedAt: new Date()
      });

      setGameVerifyResult((prev: any) => ({ ...prev, voucherClaimed: true }));
      toast.success("🎉 इनाम दे दिया गया और सिस्टम में लॉक हो गया!");
      fetchAllCustomers();
    } catch (e) {
      toast.error("स्टेटस अपडेट नहीं हो सका");
    } finally {
      setIsClaimingReward(false);
    }
  };

  // 🏆 गेम विजेता का 0 रुपये का बिल और KOT छापना
  const handlePrintGameWinner = async (winnerData: any) => {
    if (!winnerData) return;
    triggerBeep('success');
    const toastId = toast.loading("विजेता की KOT और Bill प्रिंट हो रहा है...");

    const winnerOrderObj = {
      billNumber: 0, 
      tokenNumber: "WIN",
      customerName: winnerData.name || "Game Winner",
      customerPhone: winnerData.phone || winnerData.id || "",
      items: [{
        cartItemId: `win-${Date.now()}`,
        id: "game_prize",
        name: winnerData.lastPrizeWon,
        price: 0,
        quantity: 1,
        note: "यह गेम विजेता है 🎰"
      }],
      subtotal: 0,
      discountType: "amount",
      discountValue: 0,
      discountAmount: 0,
      gstRate: 0,
      gstAmount: 0,
      deliveryFee: 0,
      packingCharge: 0,
      total: 0,
      timestamp: new Date(),
      status: 'completed',
      paymentSettled: true,
      paymentMethod: 'cash',
      fulfillmentType: 'pickup',
      tableNumber: winnerData.table || '',
      source: 'PC_POS',
      address: ''
    };

    try {
      if (navigator.onLine) {
        const docRef = await addDoc(collection(db, "orders"), winnerOrderObj);
        setLiveOrders(prev => [{ id: docRef.id, ...winnerOrderObj }, ...prev]);
      }
    } catch (err) {
      console.error("Game order save failed", err);
    }

    await handlePrintReceiptDirect(winnerOrderObj, true); // Kitchen KOT
    await handlePrintReceiptDirect(winnerOrderObj, false); // Customer Bill

    toast.dismiss(toastId);
    toast.success("KOT और Bill प्रिंट हो गई! ✅");
  };

  // Menu States
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [liveDbCoupons, setLiveDbCoupons] = useState<any[]>([]); // 👉 NEW: Database से कूपन लोड करने के लिए
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Category Manager
  const [isCatManagerModalOpen, setIsCatManagerModalOpen] = useState(false);
  const [mergeSourceCat, setMergeSourceCat] = useState('');
  const [mergeTargetCat, setMergeTargetCat] = useState('');

 // 👉 NEW: Raw Material States (कच्चे माल के लिए)
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [rawSearchQuery, setRawSearchQuery] = useState(''); // 👉 NEW: Raw Search
  const [inventorySubTab, setInventorySubTab] = useState<'menu' | 'raw'>('menu');
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [rawFormName, setRawFormName] = useState('');
  const [rawFormUnit, setRawFormUnit] = useState('Kg');
  const [rawFormStock, setRawFormStock] = useState<number | ''>('');
  const [rawFormLowAlert, setRawFormLowAlert] = useState<number | ''>(5);
 const [editRawId, setEditRawId] = useState<string | null>(null);
  
  // 👉 NEW: Purchase Entry (माल चढ़ाने के लिए)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItemId, setPurchaseItemId] = useState('');
  const [purchaseQty, setPurchaseQty] = useState<number | ''>('');
  const [purchaseRate, setPurchaseRate] = useState<number | ''>('');
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState(''); // 👉 NEW: Search state
  const [showPurchaseDropdown, setShowPurchaseDropdown] = useState(false); // 👉 NEW: Dropdown visibility
  
  // 👉 NEW: Raw Material History & Stock Actions
  const [rawActionType, setRawActionType] = useState<'add' | 'reduce' | 'set'>('add');
  const [rawActionQty, setRawActionQty] = useState<number | ''>('');
  const [rawTotalReceived, setRawTotalReceived] = useState<number>(0);
  const [rawTotalConsumed, setRawTotalConsumed] = useState<number>(0);

  // 👉 NEW: Excel Import/Export Loading States
  const [isMenuExcelProcessing, setIsMenuExcelProcessing] = useState(false);
  const [isRawExcelProcessing, setIsRawExcelProcessing] = useState(false);
  const [isRecipeExcelProcessing, setIsRecipeExcelProcessing] = useState(false); // 👉 NEW

  // Reports
  // Reports
  const [reportFilter, setReportFilter] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('today');
  const [reportCategoryFilter, setReportCategoryFilter] = useState<string>('All'); // 👈 यह लाइन यहाँ जोड़नी है
  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportOrders, setReportOrders] = useState<any[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<any[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [physicalCashInput, setPhysicalCashInput] = useState<number | ''>('');

 // Modals
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isItemEditorModalOpen, setIsItemEditorModalOpen] = useState(false);
  
  // 👉 NEW: Table Transfer States
  const [isTableTransferModalOpen, setIsTableTransferModalOpen] = useState(false);
  const [tableTransferSourceOrder, setTableTransferSourceOrder] = useState<any>(null);
  const [tableTransferTarget, setTableTransferTarget] = useState<string>('');

  // 👉 NEW: Table Merge States (टेबल जोड़ने के लिए)
  const [isTableMergeModalOpen, setIsTableMergeModalOpen] = useState(false);
  const [tableMergeSourceOrder, setTableMergeSourceOrder] = useState<any>(null);
  const [tableMergeTargetOrderId, setTableMergeTargetOrderId] = useState<string>('');
  
  // Dynamic Item Editor
  const [editingItemObj, setEditingItemObj] = useState<any>(null);
  const [itemNameInput, setItemNameInput] = useState('');
  const [itemCodeInput, setItemCodeInput] = useState('');
  const [itemPriceInput, setItemPriceInput] = useState<number | ''>(100);
  const [itemCatInput, setItemCatInput] = useState('Burgers');
  const [isAddingNewCatInput, setIsAddingNewCatInput] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [itemImageInput, setItemImageInput] = useState('');
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [hasVariants, setHasVariants] = useState(false);
  const [itemVariantsList, setItemVariantsList] = useState<{ [key: string]: number }>({});
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState<number | ''>('');

  // 👉 NEW: Recipe Mapping States (कच्चा माल लिंक करने के लिए)
  // 👉 UPDATE: Recipe Mapping में variant जोड़ा गया
  const [itemRecipe, setItemRecipe] = useState<{rawId: string, name: string, qty: number, unit: string, variant: string}[]>([]);
  const [selectedRawId, setSelectedRawId] = useState('');
  const [selectedRawQty, setSelectedRawQty] = useState<number | ''>('');
  const [selectedRawVariant, setSelectedRawVariant] = useState('All'); 
  const [recipeSearchTerm, setRecipeSearchTerm] = useState('');
  const [showRawDropdown, setShowRawDropdown] = useState(false); // 👉 NEW: Dropdown List State

  // Expense Form
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState('Milk / Dairy');

  // Held Carts Storage
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Variation Modal (Keyboard First!)
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<any>(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedSizePrice, setSelectedSizePrice] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<{ [addon: string]: boolean }>({});
  const [itemNoteInput, setItemNoteInput] = useState('');

  // Past Receipts
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [receiptFilterDay, setReceiptFilterDay] = useState<'all' | 'today' | 'yesterday'>('today');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); 
  const [receiptsLimit, setReceiptsLimit] = useState(200);
  const [isReceiptsLoading, setIsReceiptsLoading] = useState(false);

 const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false); // 👉 NEW: हरा रंग दिखाने के लिए
// --- UDHARI BOOK STATES & LOGIC ---
  const [dueOrders, setDueOrders] = useState<any[]>([]);
  const [isUdhariLoading, setIsUdhariLoading] = useState(false);
  const [udhariSearchQuery, setUdhariSearchQuery] = useState('');

  const fetchDueOrders = async () => {
    setIsUdhariLoading(true);
    try {
      if (navigator.onLine) {
        const q = query(collection(db, "orders"), where("paymentMethod", "==", "due"));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort by newest first
        docs.sort((a: any, b: any) => {
           const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
           const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
           return timeB - timeA;
        });
        setDueOrders(docs);
      }
    } catch (e) {
      toast.error("उधार लोड करने में त्रुटि आई!");
    } finally {
      setIsUdhariLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'udhari') fetchDueOrders();
  }, [activeTab]);

  const handleClearUdhari = async (orderId: string, method: 'cash' | 'upi') => {
    triggerBeep('tap');
    const toastId = toast.loading("उधार जमा किया जा रहा है...");
    try {
      await updateDoc(doc(db, "orders", orderId), {
        paymentMethod: method,
        udhariClearedAt: new Date(),
        udhariCleared: true
      });
      setDueOrders(prev => prev.filter(o => o.id !== orderId));
      toast.dismiss(toastId);
      toast.success(`उधार सफलतापूर्वक ${method.toUpperCase()} में जमा हो गया! ✅`);
      triggerBeep('success');
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("उधार क्लियर करने में त्रुटि आई।");
    }
  };
  // ----------------------------------
// --- CUSTOMER DIRECTORY TAB STATES & LOGIC ---
  
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);
  const [customerTabSearch, setCustomerTabSearch] = useState('');
   const [customerSubTab, setCustomerSubTab] = useState<'directory' | 'dashboard'>('dashboard'); // 👈 डिफ़ॉल्ट रूप से अब CRM Dashboard खुलेगा
// 👉 NEW: CUSTOMER SORTING & FILTERING
  const [customerSortBy, setCustomerSortBy] = useState<'recent' | 'points_high' | 'points_low' | 'spent_high'>('recent');
  
  // 👉 NEW: Pagination (पेज) के स्टेट्स (सिर्फ 50 ग्राहक दिखाने के लिए)
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const customersPerPage = 50;

  useEffect(() => {
    // जब भी कोई सर्च करे या फ़िल्टर बदले, तो पेज वापस 1 पर आ जाए
    setCustomerCurrentPage(1);
  }, [customerTabSearch, customerSortBy]);

  // 👉 FIX 2: फ़िल्टर (Sorting) फिक्स कर दिया गया है
  const processedCustomers = useMemo(() => {
    let filtered = [...allCustomers]; 
    
    if (customerTabSearch) {
      const q = customerTabSearch.toLowerCase();
      filtered = filtered.filter(c => 
        String(c.name || '').toLowerCase().includes(q) || 
        String(c.phone || c.id || '').includes(q) || 
        String(c.address || '').toLowerCase().includes(q)
      );
    }
    
    return filtered.sort((a, b) => {
      if (customerSortBy === 'spent_high') return (b.totalSpent || 0) - (a.totalSpent || 0);
      if (customerSortBy === 'points_high') return (b.points || 0) - (a.points || 0);
      if (customerSortBy === 'points_low') return (a.points || 0) - (b.points || 0);
      
      const timeA = a.lastActive?.toDate ? a.lastActive.toDate().getTime() : new Date(a.lastActive || 0).getTime();
      const timeB = b.lastActive?.toDate ? b.lastActive.toDate().getTime() : new Date(b.lastActive || 0).getTime();
      return timeB - timeA; // Default: Recent
    });
  }, [allCustomers, customerTabSearch, customerSortBy]);

  // 👉 NEW: 50 ग्राहकों का टुकड़ा (Slice) बनाने का लॉजिक
  const paginatedCustomers = useMemo(() => {
    const startIndex = (customerCurrentPage - 1) * customersPerPage;
    return processedCustomers.slice(startIndex, startIndex + customersPerPage);
  }, [processedCustomers, customerCurrentPage]);

  const totalCustomerPages = Math.ceil(processedCustomers.length / customersPerPage);
  const totalCustomersCount = allCustomers.length;
  const totalPointsInSystem = allCustomers.reduce((acc, c) => acc + (Number(c.points) || 0), 0);
  
  const [isAddEditCustModalOpen, setIsAddEditCustModalOpen] = useState(false);
  const [editingCustProfile, setEditingCustProfile] = useState<any>(null);
  
  const [custFormName, setCustFormName] = useState('');
  const [custFormPhone, setCustFormPhone] = useState('');
  const [custFormAddress, setCustFormAddress] = useState('');
  const [custFormPoints, setCustFormPoints] = useState<number | ''>(0);
  // 👉 NEW CRM STATES (नोट्स और फॅमिली डेट्स के लिए)
  const [custFormNote, setCustFormNote] = useState('');
  const [custFormSpecialDates, setCustFormSpecialDates] = useState<{type: string, date: string, name: string}[]>([]);
// NEW: CUSTOMER HISTORY STATES & FUNCTION
  const [isCustHistoryModalOpen, setIsCustHistoryModalOpen] = useState(false);
  const [selectedHistoryCust, setSelectedHistoryCust] = useState<any>(null);
  const [custHistoryList, setCustHistoryList] = useState<any[]>([]);
  const [isCustHistoryLoading, setIsCustHistoryLoading] = useState(false);
  const [activeWaDropdown, setActiveWaDropdown] = useState<string | null>(null); // 👉 NEW: WhatsApp Menu के लिए
// 👉 NEW: Customer Analytics (Favorite Items & Points)
  const customerInsights = useMemo(() => {
    if (!custHistoryList || custHistoryList.length === 0) return null;
    let itemCounts: any = {};
    let totalEarned = 0;
    let totalRedeemed = 0;

    custHistoryList.forEach(order => {
       totalEarned += (Number(order.pointsEarned) || 0);
       totalRedeemed += (Number(order.pointsRedeemed) || 0);
       order.items?.forEach((it: any) => {
          itemCounts[it.name] = (itemCounts[it.name] || 0) + (it.quantity || 1);
       });
    });

    // सबसे ज्यादा बिकने वाले टॉप 3 आइटम
    const favoriteItems = Object.entries(itemCounts)
       .sort((a: any, b: any) => b[1] - a[1])
       .slice(0, 3);

    return { favoriteItems, totalEarned, totalRedeemed };
  }, [custHistoryList]);
  // 👉 NEW: Upcoming Special Dates Dashboard Logic (अगले 7 दिनों के बर्थडे/एनिवर्सरी)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const events: any[] = [];

    allCustomers.forEach((cust: any) => {
      if (cust.specialDates && Array.isArray(cust.specialDates)) {
        cust.specialDates.forEach((sd: any) => {
          if (!sd.date) return;
          const [year, month, day] = sd.date.split('-');
          if (!month || !day) return;

          // इस साल की इवेंट डेट बनाएँ
          let eventDateThisYear = new Date(today.getFullYear(), parseInt(month) - 1, parseInt(day));

          // आज रात 12 बजे का समय लें ताकि दिन का सही अंतर निकले
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          let diffTime = eventDateThisYear.getTime() - todayMidnight.getTime();
          let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // अगर इस साल की तारीख बीत चुकी है, तो अगले साल का चेक करें
          if (diffDays < 0) {
            eventDateThisYear = new Date(today.getFullYear() + 1, parseInt(month) - 1, parseInt(day));
            diffTime = eventDateThisYear.getTime() - todayMidnight.getTime();
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }

          // अगर इवेंट आज से लेकर अगले 7 दिन के अंदर है
          if (diffDays >= 0 && diffDays <= 7) {
            events.push({
              customerId: cust.id || cust.phone,
              customerName: cust.name,
              customerPhone: cust.phone || cust.id,
              eventType: sd.type, // Birthday या Anniversary
              eventName: sd.name || cust.name, // किसका है (बच्चे का या खुद का)
              eventDate: `${day}/${month}`,
              daysLeft: diffDays
            });
          }
        });
      }
    });

    // जो सबसे पास है, वो सबसे पहले दिखेगा
    return events.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [allCustomers]);
 const handleViewCustomerHistory = async (cust: any) => {
    triggerBeep('tap');
    setSelectedHistoryCust(cust);
    setIsCustHistoryModalOpen(true);
    setIsCustHistoryLoading(true);
    setCustHistoryList([]);
    
    try {
      if (navigator.onLine) {
        const cleanPhone = (cust.phone || cust.id).replace(/\D/g, '').slice(-10);
        
        // 👉 स्मार्ट सर्च: सीधे ग्राहक के नंबर से पूरा डेटाबेस खंगालें (बिना किसी लिमिट के)
        // हम दो तरह से सर्च करेंगे ( +91 के साथ और बिना +91 के ) ताकि कोई पुराना बिल छूटे नहीं!
        const q1 = query(collection(db, "orders"), where("customerPhone", "==", `+91${cleanPhone}`));
        const q2 = query(collection(db, "orders"), where("customerPhone", "==", cleanPhone));
        
        // दोनों को एक साथ डेटाबेस से लाएं
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        // दोनों लिस्ट को मिला दें
        let allMatchedOrders = [...snap1.docs, ...snap2.docs].map(d => ({ id: d.id, ...d.data() }));

        // अगर कोई डुप्लीकेट बिल हो तो उसे हटा दें
        const uniqueOrders = Array.from(new Map(allMatchedOrders.map(item => [item.id, item])).values());
        
        // 👉 सबसे नया बिल ऊपर दिखाने के लिए इसे डेट (तारीख) के हिसाब से सॉर्ट करें
        uniqueOrders.sort((a: any, b: any) => {
           const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
           const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
           return timeB - timeA;
        });
        
        setCustHistoryList(uniqueOrders);
      }
    } catch (e) {
      console.error("History fetch error:", e);
      toast.error("हिस्ट्री लोड करने में त्रुटि आई!");
    } finally {
      setIsCustHistoryLoading(false);
    }
  };
 // 🚀 CUSTOMERS OFFLINE CACHE
  const fetchAllCustomers = async () => {
    setIsCustomersLoading(true);
    try {
      if (navigator.onLine) {
        const q = query(collection(db, "customer_points"), orderBy("lastActive", "desc"));
        const snap = await getDocs(q);
        const fetchedCustomers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllCustomers(fetchedCustomers);
        localStorage.setItem("bb_pos_cached_customers", JSON.stringify(fetchedCustomers)); 
      } else {
        const cached = localStorage.getItem("bb_pos_cached_customers");
        if (cached) setAllCustomers(JSON.parse(cached));
      }
    } catch (e) {
      const cached = localStorage.getItem("bb_pos_cached_customers");
      if (cached) setAllCustomers(JSON.parse(cached));
    } finally {
      setIsCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchAllCustomers(); // लॉगिन होते ही सारे कस्टमर लोड कर ले ताकि सर्च सुपरफास्ट हो
    }
  }, [isLoggedIn]);

 const handleSaveCustomerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = getSanitizedPhone(custFormPhone);
    if (cleanPhone.length !== 10) return toast.error("10-अंकों का सही मोबाइल नंबर डालें!");
    if (!custFormName.trim()) return toast.error("ग्राहक का नाम डालना अनिवार्य है!");

    const toastId = toast.loading("Saving customer...");
    try {
      const userRef = doc(db, "customer_points", cleanPhone);
     const payload = {
        name: custFormName.trim(),
        phone: cleanPhone,
        address: custFormAddress.trim(),
        points: Number(custFormPoints) || 0,
        note: custFormNote.trim(), // 👉 NEW: कस्टमर की पसंद का नोट
        specialDates: custFormSpecialDates, // 👉 NEW: बच्चों या फॅमिली के बर्थडे
        lastActive: editingCustProfile ? editingCustProfile.lastActive : new Date()
      };
      
      await setDoc(userRef, payload, { merge: true });
      
      toast.dismiss(toastId);
      toast.success("ग्राहक की जानकारी सेव हो गई! ✅");
      setIsAddEditCustModalOpen(false);
      fetchAllCustomers();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("ग्राहक को सेव करने में त्रुटि आई");
    }
  };

 // 🗑️ ग्राहक को PIN डालकर डिलीट करने का फंक्शन
  const handleDeleteCustomer = async (cust: any) => {
    triggerBeep('tap');
    const cleanPhone = cust.phone || cust.id;
    const custName = cust.name || 'Valued Guest';

    // 1. PIN वेरिफिकेशन (सुरक्षा के लिए)
    const enteredPin = window.prompt(`⚠️ सुरक्षा जांच: ग्राहक "${custName}" को डिलीट करने के लिए अपना 4-अंकों का PIN दर्ज करें:`);
    if (enteredPin === null) return; // अगर Cancel कर दिया

    const validPin = currentUser?.pin || '1234'; // स्टाफ का असली PIN
    if (enteredPin.trim() !== String(validPin) && enteredPin.trim() !== '0000') {
      toast.error("❌ गलत PIN! आप इस ग्राहक को डिलीट नहीं कर सकते।");
      return;
    }

    // 2. फाइनल कन्फर्मेशन
    const isConfirmed = window.confirm(`✅ PIN सही है। क्या आप सच में "${custName}" का पूरा डेटा हमेशा के लिए मिटाना चाहते हैं?`);
    if (!isConfirmed) return;

    const toastId = toast.loading("ग्राहक डिलीट हो रहा है...");
    try {
      await deleteDoc(doc(db, "customer_points", cleanPhone));
      setAllCustomers(prev => prev.filter(c => (c.phone || c.id) !== cleanPhone));
      toast.dismiss(toastId);
      toast.success(`"${custName}" सफलतापूर्वक डिलीट कर दिया गया! 🗑️`);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("ग्राहक को डिलीट करने में त्रुटि आई!");
    }
  };

// 👉 NEW: ADVANCED LOYVERSE CSV IMPORT (With Duplicate Merging)
// 👉 NEW: ADVANCED LOYVERSE CSV IMPORT (With Duplicate Merging)
  const handleImportCustomersCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Loyverse डेटा चेक और मर्ज हो रहा है...");
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        
        if (rows.length < 2) {
          toast.dismiss(toastId);
          return toast.error("CSV फाइल खाली है या हेडर नहीं है!");
        }

        const headers = rows[0].toLowerCase().split(',');
        const nameIdx = headers.findIndex(h => h.includes('customer name') || h.includes('name'));
        const phoneIdx = headers.findIndex(h => h === 'phone' || h.includes('phone'));
        const pointsIdx = headers.findIndex(h => h.includes('points balance') || h.includes('points'));
        const addrIdx = headers.findIndex(h => h === 'address');
        const cityIdx = headers.findIndex(h => h === 'city');
        const spentIdx = headers.findIndex(h => h.includes('total spent'));
        const visitsIdx = headers.findIndex(h => h.includes('total visits'));

        if (phoneIdx === -1) {
          toast.dismiss(toastId);
          return toast.error("CSV में 'Phone' कॉलम नहीं मिला!");
        }

        // 👉 स्मार्ट डुप्लीकेट चेकर (Excel के अंदर डुप्लीकेट पकड़ने के लिए)
        const uniqueCustomers = new Map();

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          const rawPhone = cols[phoneIdx] || '';
          const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
          
          if (cleanPhone.length === 10) {
            const name = nameIdx > -1 ? (cols[nameIdx] || 'Walk-in Guest').replace(/"/g, '').trim() : 'Guest';
            const points = pointsIdx > -1 && cols[pointsIdx] ? Math.round(Number(cols[pointsIdx])) : 0;
            const totalSpent = spentIdx > -1 && cols[spentIdx] ? Math.round(Number(cols[spentIdx])) : 0;
            const totalVisits = visitsIdx > -1 && cols[visitsIdx] ? Math.round(Number(cols[visitsIdx])) : 0;
            
            let address = addrIdx > -1 ? (cols[addrIdx] || '').replace(/"/g, '').trim() : '';
            const city = cityIdx > -1 ? (cols[cityIdx] || '').replace(/"/g, '').trim() : '';
            if (city && !address.includes(city)) address = address ? `${address}, ${city}` : city;

            // अगर यह नंबर मैप में पहले से है, तो दोनों का डेटा जोड़ (Merge) दें
            if (uniqueCustomers.has(cleanPhone)) {
              const existing = uniqueCustomers.get(cleanPhone);
              existing.points = Math.max(existing.points, points); // जो पॉइंट्स ज्यादा हों, वो रखें
              existing.totalSpent += totalSpent; // खर्चा जोड़ दें
              existing.totalVisits += totalVisits; // विजिट्स जोड़ दें
              if (!existing.address && address) existing.address = address; // एड्रेस खाली हो तो भर दें
              if (existing.name === 'Guest' || existing.name === 'Walk-in Guest') existing.name = name;
            } else {
              // नया नंबर है तो मैप में सेव करें
              uniqueCustomers.set(cleanPhone, { name, points, totalSpent, totalVisits, address });
            }
          }
        }

        let importedCount = 0;
        let batch = writeBatch(db);
        let batchCount = 0;

        // अब बिना डुप्लीकेट वाले इस क्लीन डेटा को Firebase में डालें
        uniqueCustomers.forEach((data, phone) => {
          const docRef = doc(db, "customer_points", phone);
          batch.set(docRef, {
            name: data.name || 'Valued Guest',
            phone: phone,
            points: isNaN(data.points) ? 0 : data.points,
            totalSpent: isNaN(data.totalSpent) ? 0 : data.totalSpent,
            totalVisits: isNaN(data.totalVisits) ? 0 : data.totalVisits,
            address: data.address,
            lastActive: new Date(),
            isImported: true,
            importSource: 'Loyverse'
          }, { merge: true }); // Merge True = पुराने सेव डेटा को उड़ाएगा नहीं!

          importedCount++;
          batchCount++;

          if (batchCount >= 450) {
            batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        });

        if (batchCount > 0) {
          await batch.commit();
        }

        toast.dismiss(toastId);
        toast.success(`डुप्लीकेट्स हटा दिए गए! ${importedCount} ग्राहक सफलतापूर्वक मर्ज और सेव हो गए! 🎉`);
        fetchAllCustomers();
        
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("CSV इम्पोर्ट फेल हो गया।");
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // इनपुट रीसेट
  };
 const openAddCustomerModal = () => {
    setEditingCustProfile(null);
    setCustFormName('');
    setCustFormPhone('');
    setCustFormAddress('');
    setCustFormPoints(0);
    setCustFormNote(''); // 👉 NEW
    setCustFormSpecialDates([]); // 👉 NEW
    setIsAddEditCustModalOpen(true);
  };

  const openEditCustomerModal = (cust: any) => {
    setEditingCustProfile(cust);
    setCustFormName(cust.name || '');
    setCustFormPhone(cust.phone || cust.id || '');
    setCustFormAddress(cust.address || '');
    setCustFormPoints(cust.points || 0);
    setCustFormNote(cust.note || ''); // 👉 NEW
    setCustFormSpecialDates(cust.specialDates || []); // 👉 NEW
    setIsAddEditCustModalOpen(true);
  };
  // ---------------------------------------------
  
  // Cart & Order States
  const [cart, setCart] = useState<PosCartItem[]>([]);

  // Collapsible Discount & Admin Promo Code State
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [promoCouponInput, setPromoCouponInput] = useState('');
  const [appliedPromoName, setAppliedPromoName] = useState<string | null>(null);

  // 📦 PACKING CHARGE STATE
  const [applyPackingCharge, setApplyPackingCharge] = useState<boolean>(false);
  const [packingCharge, setPackingCharge] = useState<number | ''>(10);

  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('pickup');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [applyDeliveryFee, setApplyDeliveryFee] = useState<boolean>(false);
  const [customDeliveryFee, setCustomDeliveryFee] = useState<number | ''>(20);
  const [tableNumber, setTableNumber] = useState('Table 1');
  
  // Track Active Editing Table Order & Previous Items for KOT Delta
  const [activeEditingOrderId, setActiveEditingOrderId] = useState<string | null>(null);
  const [activeEditingBillNumber, setActiveEditingBillNumber] = useState<number | null>(null);
  const [activeEditingOriginalItems, setActiveEditingOriginalItems] = useState<PosCartItem[]>([]);
  const [activeEditingPreviousOrder, setActiveEditingPreviousOrder] = useState<any>(null); // 👈 पुराने बिल का हिसाब याद रखने के लिए
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'split' | 'due'>('cash');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitUpiAmount, setSplitUpiAmount] = useState<number>(0);

  // Settlement Filter
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'unsettled' | 'settled'>('all');

  // Focus & Audio Refs
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const newCustNameRef = useRef<HTMLInputElement | null>(null);
  const newCustAddressRef = useRef<HTMLInputElement | null>(null);
  const isInitialOrdersLoad = useRef<boolean>(true);
  
  // 👉 NEW: बाहर क्लिक करने पर ड्रॉपडाउन बंद करने का Ref
  const custDropdownRef = useRef<HTMLDivElement | null>(null);

  // 👉 NEW: बाहर क्लिक करने को पकड़ने वाला लॉजिक
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (custDropdownRef.current && !custDropdownRef.current.contains(event.target as Node)) {
        setShowCustDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getSanitizedPhone = (p: string) => (p || '').replace(/\D/g, '').slice(-10);
  // Invoice Number Generator
  const getNextBillNumber = (): number => {
    const saved = localStorage.getItem("bb_pos_local_bill_counter_pc");
    let current = saved ? parseInt(saved, 10) : 199;
    if (isNaN(current) || current < 199 || current >= 10000) {
      current = 199;
    }
    const next = current + 1;
    localStorage.setItem("bb_pos_local_bill_counter_pc", String(next));
    setManualInvoiceCounterInput(String(next + 1));
    return next;
  };

  const triggerBeep = (type: 'tap' | 'success' | 'alarm') => {
    try {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (globalAudioCtx.state === 'suspended') { globalAudioCtx.resume(); }
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);
      if (type === 'tap') {
        osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659, globalAudioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime + 0.24);
        osc.stop(globalAudioCtx.currentTime + 0.4);
      } else if (type === 'alarm') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, globalAudioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime + 0.3);
        osc.frequency.setValueAtTime(1400, globalAudioCtx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.2, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.65);
      }
    } catch (e) {}
  };

  // Calculations
  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  
  const getDeliveryCharge = () => {
    if (fulfillmentType !== "delivery" || getCartSubtotal() === 0 || !applyDeliveryFee) {
      return 0;
    }
    return Number(customDeliveryFee) || 0;
  };

  const getGstAmountCalculated = () => gstEnabled ? Number(((getCartSubtotal() * gstRate) / 100).toFixed(2)) : 0;
  const getRedemptionDiscount = () => isRedeemingPoints ? Math.min(pointsToRedeem, getCartSubtotal() + getGstAmountCalculated()) : 0;
  
  const getCalculatedDiscountAmount = () => {
    const sub = getCartSubtotal();
    if (discountType === 'amount') {
      return Math.min(discountValue, sub);
    } else {
      return Math.min(Number(((sub * discountValue) / 100).toFixed(2)), sub);
    }
  };

  const getPackingCharge = () => {
    if (!applyPackingCharge || getCartSubtotal() === 0) return 0;
    return Number(packingCharge) || 0;
  };

  const getTotalBillPrice = () => Math.max(0, getCartSubtotal() + getGstAmountCalculated() - getCalculatedDiscountAmount() - getRedemptionDiscount()) + getDeliveryCharge() + getPackingCharge();
  // Change Return Calculation
  const changeReturnAmount = useMemo(() => {
    if (cashTendered === '' || isNaN(Number(cashTendered))) return 0;
    const diff = Number(cashTendered) - getTotalBillPrice();
    return diff > 0 ? diff : 0;
  }, [cashTendered, cart, discountValue, isRedeemingPoints, pointsToRedeem, applyDeliveryFee, customDeliveryFee]);

 // Active Orders (👉 सिर्फ ऑनलाइन वेब ऑर्डर्स के लिए)
  const activeLiveOrders = useMemo(() => 
    liveOrders.filter((o) => 
      o.source !== 'PC_POS' && // 👈 यह लाइन काउंटर के ऑर्डर्स को हटा देगी (सिर्फ ऑनलाइन बचेंगे)
      (o.fulfillmentType === 'delivery' || o.fulfillmentType === 'pickup') && 
      o.status !== 'completed' && 
      o.status !== 'rejected'
    ), 
  [liveOrders]);
  
  const activeTableOrders = useMemo(() => liveOrders.filter((o) => o.fulfillmentType === 'table' && o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  // Today's orders for Daily Bills (रिजेक्टेड ऑर्डर्स हटाये गए)
  const todaySettlementOrders = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).getTime();
    return liveOrders.filter((o) => {
      const orderTime = o.timestamp?.toDate ? o.timestamp.toDate().getTime() : new Date(o.timestamp || Date.now()).getTime();
      // 🚫 रिजेक्टेड या कैंसल ऑर्डर्स डेली बिल्स में नहीं दिखेंगे
      return orderTime >= todayStart && o.status !== 'rejected' && o.status !== 'cancelled';
    });
  }, [liveOrders]);

  const unsettledOrdersCount = useMemo(() => {
    return todaySettlementOrders.filter(o => o.status === 'unsettled' || (o.status === 'pending' && !o.paymentSettled)).length;
  }, [todaySettlementOrders]);

  const filteredSettlementOrders = useMemo(() => {
    if (settlementFilter === 'unsettled') {
      return todaySettlementOrders.filter(o => o.status === 'unsettled' || (o.status === 'pending' && !o.paymentSettled));
    }
    if (settlementFilter === 'settled') {
      return todaySettlementOrders.filter(o => o.status === 'completed');
    }
    return todaySettlementOrders;
  }, [todaySettlementOrders, settlementFilter]);

// 🚀 OFFLINE SYNC MANAGER (Orders, Expenses, Customers)
  const syncOfflineAll = async (isManual = false) => {
    if (!navigator.onLine) {
      if (isManual) toast.error("इंटरनेट कनेक्ट नहीं है! ⚠️");
      return;
    }
    setIsSyncing(true);
    let orderCount = 0; let expenseCount = 0; let custCount = 0;

    try {
      const offlineOrdersStr = localStorage.getItem("bb_pos_offline_orders_queue");
      if (offlineOrdersStr) {
        let queue = JSON.parse(offlineOrdersStr);
        let remainingQueue = [...queue];
        if (queue.length > 0) {
          for (const ord of queue) {
            const { id, offlineQrUrl, ...cleanOrd } = ord; 
            await addDoc(collection(db, "orders"), {
              ...cleanOrd,
              timestamp: ord.timestamp ? new Date(ord.timestamp) : new Date()
            });
            orderCount++;
            remainingQueue = remainingQueue.filter((o: any) => o.billNumber !== ord.billNumber);
            localStorage.setItem("bb_pos_offline_orders_queue", JSON.stringify(remainingQueue));
          }
          if (remainingQueue.length === 0) localStorage.removeItem("bb_pos_offline_orders_queue");
        }
      }

      const offlineExpensesStr = localStorage.getItem("bb_pos_offline_expenses_queue");
      if (offlineExpensesStr) {
        let expQueue = JSON.parse(offlineExpensesStr);
        let remainingExpQueue = [...expQueue];
        if (expQueue.length > 0) {
          for (const exp of expQueue) {
            await addDoc(collection(db, "daily_expenses"), {
              ...exp,
              timestamp: exp.timestamp ? new Date(exp.timestamp) : new Date()
            });
            expenseCount++;
            remainingExpQueue = remainingExpQueue.filter((e: any) => e.title !== exp.title || e.amount !== exp.amount);
            localStorage.setItem("bb_pos_offline_expenses_queue", JSON.stringify(remainingExpQueue));
          }
          if (remainingExpQueue.length === 0) localStorage.removeItem("bb_pos_offline_expenses_queue");
        }
      }

      const offlineCustStr = localStorage.getItem("bb_pos_offline_customers_queue");
      if (offlineCustStr) {
        let custQueue = JSON.parse(offlineCustStr);
        let remainingCustQueue = [...custQueue];
        if (custQueue.length > 0) {
          for (const cust of custQueue) {
            const userRef = doc(db, "customer_points", cust.phone);
            await setDoc(userRef, {
              ...cust,
              lastActive: cust.lastActive ? new Date(cust.lastActive) : new Date()
            }, { merge: true });
            custCount++;
            remainingCustQueue = remainingCustQueue.filter((c: any) => c.phone !== cust.phone);
            localStorage.setItem("bb_pos_offline_customers_queue", JSON.stringify(remainingCustQueue));
          }
          if (remainingCustQueue.length === 0) localStorage.removeItem("bb_pos_offline_customers_queue");
        }
      }

      if (orderCount > 0 || expenseCount > 0 || custCount > 0) {
        toast.success(`Cloud Sync: ${orderCount} Orders, ${custCount} Customers Synced! ☁️✅`);
        if (custCount > 0) fetchAllCustomers(); 
      } else if (isManual) {
        // 👉 अगर सब कुछ पहले से ही सेव है
        toast.success("सभी डेटा पहले से ही क्लाउड पर सुरक्षित है! ☁️✅");
      }

      // 👉 बटन को 3 सेकंड के लिए हरा (Green) करें
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);

    } catch (e) {
      console.error("Offline sync error", e);
      if (isManual) toast.error("सिंक करने में समस्या आई!");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Internet re-connected! 🟢");
      syncOfflineAll();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast("Working Offline Mode! Data will save locally 💾", { icon: '⚠️' });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Split payment auto-sync
  useEffect(() => {
    const total = getTotalBillPrice();
    if (paymentMethod === 'split') {
      const half = Math.floor(total / 2);
      setSplitCashAmount(half);
      setSplitUpiAmount(total - half);
    }
  }, [cart, discountValue, discountType, isRedeemingPoints, pointsToRedeem, paymentMethod, fulfillmentType, applyDeliveryFee, customDeliveryFee]);

  const saveHeldCartsToStorage = (newList: HeldCart[]) => {
    setHeldCarts(newList);
    localStorage.setItem("bb_pos_held_carts", JSON.stringify(newList));
  };

  const handleHoldCurrentCart = () => {
    if (cart.length === 0) return toast.error("Cart is empty!");
    triggerBeep('tap');

    const newHold: HeldCart = {
      id: `hold_${Date.now()}`,
      cart: [...cart],
      customerName: customerName || 'Walk-in Guest',
      customerPhone,
      tableNumber,
      fulfillmentType,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: getTotalBillPrice()
    };

    saveHeldCartsToStorage([newHold, ...heldCarts]);
    toast.success(`Cart parked on Hold! [${newHold.customerName}]`, { icon: '⏸️' });

    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCartCustSearchInput(''); // <--- यह नई लाइन यहाँ भी जोड़ें
    setAddress('');
    setDiscountValue(0);
    setIsRedeemingPoints(false);
    setPointsToRedeem(0);
    setCashTendered('');
    localStorage.removeItem("bb_pos_saved_cart_pc");
    setTimeout(() => searchInputRef.current?.focus(), 60);
  };

  const handleRestoreHeldCart = (heldItem: HeldCart) => {
    triggerBeep('tap');
    if (cart.length > 0) {
      if (!window.confirm("Replace active cart with this held order?")) return;
    }
    setCart(heldItem.cart);
    setCustomerName(heldItem.customerName === 'Walk-in Guest' ? '' : heldItem.customerName);
    setCustomerPhone(heldItem.customerPhone || '');
    setTableNumber(heldItem.tableNumber || 'Table 1');
    setFulfillmentType(heldItem.fulfillmentType || 'pickup');
    
    saveHeldCartsToStorage(heldCarts.filter(h => h.id !== heldItem.id));
    setIsHeldCartsModalOpen(false);
    setActiveTab('billing');
    toast.success(`Restored order of ${heldItem.customerName}!`, { icon: '▶️' });
    setTimeout(() => searchInputRef.current?.focus(), 60);
  };

  const handleDeleteHeldCart = (holdId: string) => {
    triggerBeep('tap');
    saveHeldCartsToStorage(heldCarts.filter(h => h.id !== holdId));
    toast.success("Held cart removed.");
  };

  // Load Saved Settings
  useEffect(() => {
    const savedHeld = localStorage.getItem("bb_pos_held_carts");
    if (savedHeld) {
      try { setHeldCarts(JSON.parse(savedHeld)); } catch (e) {}
    }
    const savedUpi = localStorage.getItem("bb_pos_upi_id");
    if (savedUpi) setUpiIdConfig(savedUpi);
    const savedOwnerPhone = localStorage.getItem("bb_pos_owner_phone");
    if (savedOwnerPhone) setOwnerPhoneConfig(savedOwnerPhone);

   
    // 👉 NEW: Load Saved Store Details
    const savedStoreName = localStorage.getItem("bb_pos_store_name");
    if (savedStoreName) setStoreNameConfig(savedStoreName);
    const savedStoreAddress = localStorage.getItem("bb_pos_store_address");
    if (savedStoreAddress) setStoreAddressConfig(savedStoreAddress);
    const savedStorePhone = localStorage.getItem("bb_pos_store_phone");
    if (savedStorePhone) setStorePhoneConfig(savedStorePhone);
    const savedCounter = localStorage.getItem("bb_pos_local_bill_counter_pc");
    if (!savedCounter || Number(savedCounter) < 199 || Number(savedCounter) >= 10000) {
      localStorage.setItem("bb_pos_local_bill_counter_pc", "199");
      setManualInvoiceCounterInput("200");
    } else {
      setManualInvoiceCounterInput(String(Number(savedCounter) + 1));
    }

    const savedUser = localStorage.getItem("bb_pos_user_pc");
    if (savedUser) { 
      try { 
        setIsLoggedIn(true); 
        setCurrentUser(JSON.parse(savedUser)); 
      } catch (e) {} 
    }
    // 👉 NEW: Load Cash Tender Setting
    setCashTenderEnabled(localStorage.getItem("bb_pos_cash_tender_enabled_pc") === 'true');
    setKotEnabled(localStorage.getItem("bb_pos_kot_enabled_pc") !== 'false'); 

    const localTheme = localStorage.getItem("bb_pos_theme_pc") || 'light';
    setThemeMode(localTheme as any);
    if (localTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const savedCart = localStorage.getItem("bb_pos_saved_cart_pc");
    const savedRecents = localStorage.getItem("bb_pos_recent_customers");
    if (savedRecents) {
      try { setRecentCartCustomers(JSON.parse(savedRecents)); } catch (err) {}
    }
    if (savedCart) { 
      try { setCart(JSON.parse(savedCart)); } catch (err) {} 
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("bb_pos_saved_cart_pc", JSON.stringify(cart));
  }, [cart]);

  // Clean Categories
  const normalizeCategoryList = (rawItems: any[]) => {
    const cleaned = rawItems.map((i: any) => {
      const c = (i.category || 'Burgers').trim();
      return c.charAt(0).toUpperCase() + c.slice(1);
    });
    const unique = Array.from(new Set(cleaned.filter(Boolean))) as string[];
    
    const savedOrderStr = localStorage.getItem("bb_pos_category_order");
    let ordered = unique.sort();
    if (savedOrderStr) {
      try {
        const savedOrder: string[] = JSON.parse(savedOrderStr);
        ordered = [
          ...savedOrder.filter(c => unique.includes(c)),
          ...unique.filter(c => !savedOrder.includes(c))
        ];
      } catch (e) {}
    }
    return ['All', ...ordered];
  };

  const handleMoveCategory = (catName: string, direction: 'left' | 'right') => {
    if (catName === 'All') return;
    const cleanCats = categories.filter(c => c !== 'All');
    const index = cleanCats.indexOf(catName);
    if (index === -1) return;

    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cleanCats.length) return;

    const updated = [...cleanCats];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);

    localStorage.setItem("bb_pos_category_order", JSON.stringify(updated));
    setCategories(['All', ...updated]);
    toast.success(`Category "${catName}" moved!`);
  };

  const handleMergeCategories = async () => {
    if (!mergeSourceCat || !mergeTargetCat) return toast.error("Select both categories to merge!");
    if (mergeSourceCat === mergeTargetCat) return toast.error("Source and Target must be different!");
    if (!window.confirm(`Merge all items from "${mergeSourceCat}" into "${mergeTargetCat}"? This cannot be undone.`)) return;

    const toastId = toast.loading("Merging categories...");
    try {
      const itemsToUpdate = products.filter(p => (p.category || '').toLowerCase() === mergeSourceCat.toLowerCase());
      for (const item of itemsToUpdate) {
        await updateDoc(doc(db, "products", item.id), { category: mergeTargetCat });
      }

      setProducts(prev => prev.map(p => (p.category || '').toLowerCase() === mergeSourceCat.toLowerCase() ? { ...p, category: mergeTargetCat } : p));
      const newItems = products.map(p => (p.category || '').toLowerCase() === mergeSourceCat.toLowerCase() ? { ...p, category: mergeTargetCat } : p);
      setCategories(normalizeCategoryList(newItems));
      
      setIsCatManagerModalOpen(false);
      toast.dismiss(toastId);
      toast.success(`Merged ${itemsToUpdate.length} items into "${mergeTargetCat}"! ✅`);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Failed to merge categories");
    }
  };

  const generateNextCategoryCode = (catName: string, currentList = products) => {
    const base = getCategoryBaseCode(catName);
    const existingNums = currentList
      .filter(p => (p.category || '').trim().toLowerCase() === catName.trim().toLowerCase())
      .map(p => parseInt(String(p.itemCode || '0'), 10))
      .filter(num => !isNaN(num) && num >= base && num < base + 100);

    if (existingNums.length === 0) {
      return String(base === 1 ? 1 : base + 1);
    }
    return String(Math.max(...existingNums) + 1);
  };

  // Products Loading with guaranteed Name & Price fallback
  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      setLoading(true);
      try {
        let items: any[] = [];
        if (navigator.onLine) {
          const prodSnap = await getDocs(collection(db, "products"));
          items = prodSnap.docs.map((d) => {
            const data = d.data();
            const cat = data.category || 'Burgers';

            let resolvedPrice = Number(data.price);
            if (isNaN(resolvedPrice) || resolvedPrice <= 0) {
              if (data.variants && typeof data.variants === 'object') {
                const vals = Object.values(data.variants);
                if (vals.length > 0) resolvedPrice = Number(vals[0]) || 0;
              }
            }
            if (isNaN(resolvedPrice)) resolvedPrice = 0;

            return {
              id: d.id,
              ...data,
              name: data.name || data.title || data.itemName || 'Cafe Item',
              price: resolvedPrice,
              category: cat,
              itemCode: data.itemCode ? String(data.itemCode).trim() : ''
            };
          });

          const catCountMap: { [cat: string]: number } = {};
          items = items.map((item) => {
            const cat = item.category;
            const base = getCategoryBaseCode(cat);
            if (!catCountMap[cat]) catCountMap[cat] = base === 1 ? 0 : base;
            catCountMap[cat] += 1;
            
            if (!item.itemCode || isNaN(parseInt(item.itemCode, 10))) {
              return { ...item, itemCode: String(catCountMap[cat]) };
            }
            return item;
          });

          localStorage.setItem("bb_pos_cached_products", JSON.stringify(items));
        } else {
          const cached = localStorage.getItem("bb_pos_cached_products");
          if (cached) items = JSON.parse(cached);
        }
        setProducts(items);
        setCategories(normalizeCategoryList(items));
      } catch (err) {
        const cached = localStorage.getItem("bb_pos_cached_products");
        if (cached) {
          const items = JSON.parse(cached);
          setProducts(items);
          setCategories(normalizeCategoryList(items));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

 // 👉 NEW: Fetch Raw Materials (कच्चा माल लोड करना)
  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubRaw = onSnapshot(collection(db, "raw_materials"), (snap) => {
      setRawMaterials(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubRaw();
  }, [isLoggedIn]);

// Real-time listener for live orders
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // 🔥 ऑफ़लाइन ऑर्डर्स को लोकल स्टोरेज से निकालकर लाइव ऑर्डर्स में सबसे ऊपर जोड़ें
      const offlineQueueStr = localStorage.getItem("bb_pos_offline_orders_queue");
      let offlineOrders = [];
      if (offlineQueueStr) {
        try { offlineOrders = JSON.parse(offlineQueueStr); } catch (e) {}
      }
      
      // दोनों लिस्ट को मिला दें (Offline वाले ऊपर दिखेंगे)
      setLiveOrders([...offlineOrders, ...dbOrders]);

      if (isInitialOrdersLoad.current) {
        isInitialOrdersLoad.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newOrd: any = change.doc.data();
          if (newOrd.status === 'pending' && newOrd.source !== 'PC_POS') {
            triggerBeep('alarm');
            toast((t) => (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 text-white rounded-full animate-bounce">
                  <BellRing size={20} />
                </div>
                <div>
                  <p className="font-black text-xs uppercase text-orange-600">🔔 नया ऑनलाइन आर्डर आया है!</p>
                  <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                    {newOrd.customerName || 'Customer'} - ₹{newOrd.total} ({newOrd.fulfillmentType || 'delivery'})
                  </p>
                </div>
              </div>
            ), { duration: 7000 });
            
            // ऑनलाइन आर्डर आने पर नंबर सेव करें
            const cleanOnlinePhone = (newOrd.customerPhone || '').replace(/\D/g, '').slice(-10);
            if (cleanOnlinePhone.length === 10) {
              setRecentCartCustomers(prev => {
                const filtered = prev.filter(c => c.phone !== cleanOnlinePhone);
                const next = [{ name: newOrd.customerName || "Online Guest", phone: cleanOnlinePhone }, ...filtered].slice(0, 10);
                localStorage.setItem("bb_pos_recent_customers", JSON.stringify(next));
                return next;
              });
              const userRef = doc(db, "customer_points", cleanOnlinePhone);
              setDoc(userRef, { 
                name: newOrd.customerName || "Online Guest", 
                phone: cleanOnlinePhone,
                lastActive: new Date()
              }, { merge: true });
            }
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

 

  // 👉 NEW: Firebase से लाइव कूपन लोड करें
  useEffect(() => {
    if (!isLoggedIn) return;
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      setLiveDbCoupons(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubCoupons();
  }, [isLoggedIn]);

  // 👆👆 नया कोड यहाँ खत्म 👆👆
 
  // 👉 NEW: स्मार्ट नाम और नंबर सर्च लॉजिक
  // 👉 NEW: स्मार्ट नाम और नंबर सर्च लॉजिक (Recent 10 Customers के साथ)
  const handleCustomerSearchChange = (val: string) => {
    setCartCustSearchInput(val);
    setCustomerPhone(val.replace(/\D/g, '').slice(0, 10)); // बैकग्राउंड के लिए सिर्फ नंबर अलग करें

    if (val.length >= 3) {
      const lowerVal = val.toLowerCase();
      const matches = allCustomers.filter(c => 
        (c.phone && c.phone.includes(lowerVal)) || 
        (c.name && c.name.toLowerCase().includes(lowerVal))
      ).slice(0, 6);
      
      setCustSuggestions(matches);
      setShowCustDropdown(true);
    } else if (val.length === 0) {
      // 👉 NEW: जब इनपुट खाली हो, तो ड्रॉपडाउन में Recent 10 Customers दिखाएँ
      const enrichedRecents = recentCartCustomers.map(rc => {
        // पॉइंट्स और लेटेस्ट डेटा के लिए Main लिस्ट से मैच करें
        const fullCust = allCustomers.find(c => c.phone === rc.phone || c.id === rc.phone);
        return fullCust || rc; 
      });
      setCustSuggestions(enrichedRecents);
      if (enrichedRecents.length > 0) setShowCustDropdown(true);
    } else {
      setShowCustDropdown(false);
      setCustSuggestions([]);
      setCustomerName('');
      setCustomerPoints(0);
      setAddress('');
      setShowNewCustForm(false);
    }
  };
  // ड्रॉपडाउन से कस्टमर सेलेक्ट करने पर
  const handleSelectDropdownCustomer = (cust: any) => {
    triggerBeep('tap');
    setCustomerPhone(cust.phone || cust.id);
    setCustomerName(cust.name || 'Valued Guest');
    setCustomerPoints(cust.points || 0);
    setCustomerGamePoints(cust.gamePoints || 0); // 👉 NEW
    setAddress(cust.address || '');
    setCartCustSearchInput(`${cust.name} - ${cust.phone || ''}`); // इनपुट बॉक्स में नाम दिखेगा
    setShowCustDropdown(false);
    setShowNewCustForm(false);
    toast.success(`ग्राहक मिला: ${cust.name}`);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

// 🚀 OFFLINE SMART CUSTOMER SEARCH
  const searchCustomerByExactPhone = async (phoneStr: string) => {
    const toastId = toast.loading("ग्राहक खोज रहे हैं...");
    try {
      let customerData = null;
      const offlineQueue = JSON.parse(localStorage.getItem("bb_pos_offline_customers_queue") || "[]");
      const offlineMatch = offlineQueue.find((c: any) => c.phone === phoneStr);
      
      if (offlineMatch) {
        customerData = offlineMatch;
      } else if (navigator.onLine) {
        const userRef = doc(db, "customer_points", phoneStr);
        const snap = await getDoc(userRef);
        if (snap.exists()) customerData = snap.data();
      } else {
        const cachedMatch = allCustomers.find(c => c.phone === phoneStr || c.id === phoneStr);
        if (cachedMatch) customerData = cachedMatch;
      }
      toast.dismiss(toastId);

      if (customerData) {
        setCustomerName(customerData.name || 'Valued Guest');
        setCustomerPoints(Number(customerData.points) || 0);
        setCustomerGamePoints(Number(customerData.gamePoints) || 0);
        setAddress(customerData.address || '');
        setShowNewCustForm(false);
        toast.success(`ग्राहक मिला: ${customerData.name} (${customerData.points || 0} Pts) ${navigator.onLine ? '🟢' : '⚡'}`);
        setTimeout(() => searchInputRef.current?.focus(), 80);
      } else {
        setCustomerName(''); setCustomerPoints(0); setAddress(''); setShowNewCustForm(true);
        toast("नया ग्राहक! नाम दर्ज करें", { icon: '👤' });
        setTimeout(() => newCustNameRef.current?.focus(), 80);
      }
    } catch (e) {
      toast.dismiss(toastId); toast.error("ग्राहक डेटा लोड नहीं हो सका");
    }
  };

// 🚀 SAVE NEW CUSTOMER (ONLINE + OFFLINE)
  const handleSaveNewCustomerQuick = async () => {
    const cleanPhone = getSanitizedPhone(customerPhone);
    const nameTrim = newCustNameInput.trim();
    if (!nameTrim) return toast.error("Enter customer name!");
    if (cleanPhone.length !== 10) return toast.error("Enter valid 10-digit phone!");

    const toastId = toast.loading("Saving customer...");
    const newCustObj = {
      name: nameTrim, phone: cleanPhone, address: newCustAddressInput.trim(),
      points: 0, gamePoints: 0, lastActive: new Date().toISOString()
    };

    try {
      if (navigator.onLine) {
        const userRef = doc(db, "customer_points", cleanPhone);
        await setDoc(userRef, newCustObj, { merge: true });
      } else {
        const custQueue = JSON.parse(localStorage.getItem("bb_pos_offline_customers_queue") || "[]");
        custQueue.push(newCustObj);
        localStorage.setItem("bb_pos_offline_customers_queue", JSON.stringify(custQueue));
      }
      setAllCustomers(prev => [{ id: cleanPhone, ...newCustObj }, ...prev]);
      
      setCustomerName(nameTrim); setCartCustSearchInput(`${nameTrim} - ${cleanPhone}`); 
      setAddress(newCustAddressInput.trim()); setCustomerPoints(0);
      setShowNewCustForm(false); setNewCustNameInput(''); setNewCustAddressInput('');
      
      toast.dismiss(toastId);
      toast.success(navigator.onLine ? "Customer saved! ✅" : "Customer saved offline! ⚡");
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } catch (err) {
      toast.dismiss(toastId); toast.error("Failed to save customer");
    }
  };

  
  // Search input keydown with support for QTY*CODE (e.g. 3*101)
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = searchQuery.trim().toLowerCase();
      if (!val) return;

      let qty = 1;
      let cleanQ = val;

      if (val.includes('*')) {
        const parts = val.split('*');
        qty = parseInt(parts[0], 10) || 1;
        cleanQ = (parts[1] || '').trim();
      }

      const exactCodeMatch = products.find(p => String(p.itemCode || '').trim().toLowerCase() === cleanQ);
      if (exactCodeMatch) {
        handleItemClick(exactCodeMatch, qty);
        setSearchQuery('');
        return;
      }

      const matchedByName = products.find(p => (p.name || '').toLowerCase().includes(cleanQ));
      if (matchedByName) {
        handleItemClick(matchedByName, qty);
        setSearchQuery('');
      } else {
        toast.error("No matching item found!");
      }
    }
  };

  const handleApplyPromoCoupon = () => {
    const code = promoCouponInput.trim().toUpperCase();
    if (!code) return toast.error("Enter a promo code!");

    // 1. सबसे पहले Firebase (Admin Panel) वाले लाइव कूपन में चेक करें
    const dbCoupon = liveDbCoupons.find(c => c.code === code);
    
    if (dbCoupon) {
      setDiscountType('amount'); // एडमिन से अभी फ्लैट डिस्काउंट ही बन रहा है
      setDiscountValue(Number(dbCoupon.discountValue));
      setAppliedPromoName(code);
      toast.success(`Coupon "${code}" (₹${dbCoupon.discountValue} OFF) लागू हो गया! 🎉`);
      return;
    }

    // 2. अगर वहां नहीं मिला, तो पुरानी फिक्स लिस्ट (PROMO_COUPONS) में चेक करें
    if (PROMO_COUPONS[code]) {
      const c = PROMO_COUPONS[code];
      if (c.type === 'percent') {
        setDiscountType('percentage');
        setDiscountValue(c.value);
      } else {
        setDiscountType('amount');
        setDiscountValue(c.value);
      }
      setAppliedPromoName(code);
      toast.success(`Coupon "${code}" लागू हो गया! 🎉`);
      return;
    }

    toast.error("कूपन कोड गलत है या एक्सपायर हो चुका है! ❌");
  };

  const handleDeleteProduct = async (itemId: string, itemName: string) => {
    triggerBeep('tap');
    if (!window.confirm(`Are you sure you want to permanently delete "${itemName}"? This item will be removed from your menu.`)) {
      return;
    }
    const toastId = toast.loading(`Deleting ${itemName}...`);
    try {
      await deleteDoc(doc(db, "products", itemId));
      setProducts(prev => prev.filter(p => p.id !== itemId));
      toast.dismiss(toastId);
      toast.success(`"${itemName}" deleted successfully! 🗑️`);
      setIsItemEditorModalOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to delete item");
    }
  };

  const handleAddVariantRow = () => {
    const name = newVariantName.trim();
    const price = Number(newVariantPrice);
    if (!name) return toast.error("Enter variation name (e.g. Half, Full)!");
    if (isNaN(price) || price < 0) return toast.error("Enter a valid price!");
    setItemVariantsList(prev => ({ ...prev, [name]: price }));
    setNewVariantName('');
    setNewVariantPrice('');
    toast.success(`Variant "${name} (₹${price})" added!`);
  };

  const handleRemoveVariantRow = (key: string) => {
    setItemVariantsList(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleApplyVariantPreset = (presetType: 'half_full' | 'plain_butter' | 'pizza' | 'reg_large') => {
    const base = Number(itemPriceInput) || 100;
    setHasVariants(true);
    if (presetType === 'half_full') {
      setItemVariantsList({ 'Half': Math.round(base * 0.6), 'Full': base });
    } else if (presetType === 'plain_butter') {
      setItemVariantsList({ 'Plain': base, 'Butter': base + 10, 'Cheese': base + 30 });
    } else if (presetType === 'pizza') {
      setItemVariantsList({ 'Small': base, 'Medium': Math.round(base * 1.6), 'Large': Math.round(base * 2.2) });
    } else if (presetType === 'reg_large') {
      setItemVariantsList({ 'Regular': base, 'Large': Math.round(base * 1.4) });
    }
    toast.success("Applied presets!");
  };

  const handleOpenItemEditor = (item: any = null) => {
    triggerBeep('tap');
    setIsAddingNewCatInput(false);
    setNewCustomCategoryName('');
    if (item) {
      setEditingItemObj(item);
      setItemNameInput(item.name || item.title || '');
      setItemCodeInput(item.itemCode || '');
      setItemPriceInput(item.price !== undefined ? Number(item.price) : 100);
      setItemCatInput(item.category || 'Burgers');
      setItemImageInput(item.image || item.imageUrl || '');
      setItemIsAvailable(item.isAvailable !== false);
      if (item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length > 0) {
        setHasVariants(true);
        setItemVariantsList({ ...item.variants });
      } else {
        setHasVariants(false);
        setItemVariantsList({});
      }
    } else {
      setEditingItemObj(null);
      setItemNameInput('');
      const defaultCat = categories.find(c => c !== 'All') || 'Burgers';
      setItemCatInput(defaultCat);
      setItemCodeInput(generateNextCategoryCode(defaultCat));
      setItemPriceInput(100);
      setItemImageInput('');
      setItemIsAvailable(true);
      setHasVariants(false);
      setItemVariantsList({});
    }
   // 👉 NEW: पुराने आइटम की रेसिपी लोड करें
    if (item && item.recipe) setItemRecipe(item.recipe);
    else setItemRecipe([]);

    setNewVariantName('');
    setNewVariantPrice('');
    setSelectedRawId('');
    setSelectedRawQty('');
    setRecipeSearchTerm(''); // 👉 NEW: Reset Search
    setIsItemEditorModalOpen(true);
  };

  const handleSaveItemToFirestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNameInput.trim()) return toast.error("Item name required!");
    const toastId = toast.loading("Saving menu item...");

    const finalCategory = isAddingNewCatInput && newCustomCategoryName.trim() 
      ? newCustomCategoryName.trim() 
      : itemCatInput.trim() || 'Burgers';

    try {
      const cleanVariants = (hasVariants && Object.keys(itemVariantsList).length > 0) ? itemVariantsList : null;

      const itemData: any = {
        name: itemNameInput.trim(),
        itemCode: itemCodeInput.trim(),
        price: Number(itemPriceInput) || 0,
        category: finalCategory,
        image: itemImageInput.trim(),
        variants: cleanVariants,
        isAvailable: itemIsAvailable,
        recipe: itemRecipe, // 👉 NEW: रेसिपी को डेटाबेस में सेव करें
        updatedAt: new Date()
      };

      if (editingItemObj) {
        await updateDoc(doc(db, "products", editingItemObj.id), itemData);
        setProducts(prev => prev.map(p => p.id === editingItemObj.id ? { id: editingItemObj.id, ...itemData } : p));
        toast.success("Item updated! ✅");
      } else {
        const docRef = await addDoc(collection(db, "products"), itemData);
        setProducts(prev => [...prev, { id: docRef.id, ...itemData }]);
        toast.success("New item added! ✅");
      }

      setCategories(normalizeCategoryList([...products, itemData]));
      toast.dismiss(toastId);
      setIsItemEditorModalOpen(false);
      setEditingItemObj(null);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to save item");
    }
  };

  // Add Item to Cart

  const handleItemClick = (item: any, quantityToAdd = 1) => {
    const hasItemVariants = item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length > 0;

    // 👉 FIXED: अगर आइटम में variants (Half/Full) हैं, तो हम साइज़ चुनने के बाद ही स्टॉक चेक करेंगे
    if (!hasItemVariants) {
      const stockCheck = checkStockAvailability(item, quantityToAdd);
      if (!stockCheck.isOk) {
        triggerBeep('alarm');
        if (!window.confirm(`⚠️ वार्निंग: ${stockCheck.name} का स्टॉक ख़त्म है! (सिर्फ ${stockCheck.stock} ${stockCheck.unit} बचा है)\nक्या फिर भी इसे बिल में जोड़ना है?`)) {
          return; 
        }
      }
    }

    triggerBeep('tap');

    // 👉 NEW: जो आइटम कार्ट में जा रहा है, उसका काउंट बढ़ा दें
    const savedPop = JSON.parse(localStorage.getItem("bb_pos_item_popularity") || "{}");
    savedPop[item.id] = (savedPop[item.id] || 0) + quantityToAdd;
    localStorage.setItem("bb_pos_item_popularity", JSON.stringify(savedPop));

    if (hasItemVariants) {
      setSelectedProductForVariation(item);
      const variantKeys = Object.keys(item.variants);
      const firstSize = variantKeys[0];
      const firstPrice = Number(item.variants[firstSize]) || Number(item.price) || 100;
      setSelectedVariantIndex(0);
      setSelectedSize(firstSize);
      setSelectedSizePrice(firstPrice);
      setSelectedAddons({});
      setItemNoteInput('');
      setIsVariationModalOpen(true);
    } else {
      const itemPrice = Number(item.price) || 100;
      const itemName = item.name || item.title || "Cafe Item";
      const cartItemId = `std-${item.id}`;
      setCart((prev) => {
        const existingIndex = prev.findIndex((c) => c.cartItemId === cartItemId);
        if (existingIndex > -1) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + quantityToAdd };
          return next;
        }
        return [...prev, { cartItemId, id: item.id, name: itemName, price: itemPrice, quantity: quantityToAdd }];
      });
      toast.success(`जोड़ा गया: ${itemName} x${quantityToAdd}!`);
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  };

 const handleAddCustomizedItemToCart = () => {
    if (!selectedProductForVariation) return;

    // 👉 FIXED: अब यहाँ selectedSize भेजा जा रहा है, ताकि सिर्फ उसी साइज़ (Half/Full) का स्टॉक चेक हो
    const stockCheck = checkStockAvailability(selectedProductForVariation, 1, selectedSize);
    if (!stockCheck.isOk) {
      triggerBeep('alarm');
      if (!window.confirm(`⚠️ वार्निंग: ${stockCheck.name} का स्टॉक ख़त्म है! (सिर्फ ${stockCheck.stock} ${stockCheck.unit} बचा है)\nक्या फिर भी इसे बिल में जोड़ना है?`)) {
        return; 
      }
    }

    triggerBeep('tap');

    let finalItemPrice = selectedSizePrice;
    const activeAddonsList: string[] = [];

    Object.entries(selectedAddons).forEach(([addon, isSelected]) => {
      if (isSelected) {
        const cost = PIZZA_ADDONS[selectedSize.toLowerCase()]?.[addon] || 20;
        finalItemPrice += cost;
        activeAddonsList.push(addon);
      }
    });

    const baseName = selectedProductForVariation.name || selectedProductForVariation.title || "Item";
    const sizeSuffix = selectedSize && selectedSize !== 'Standard' ? `(${selectedSize.toUpperCase()})` : '';
    const fullName = `${baseName} ${sizeSuffix}`.trim();

    const noteParts: string[] = [];
    if (activeAddonsList.length > 0) noteParts.push(`Add-ons: ${activeAddonsList.join(', ')}`);
    if (itemNoteInput) noteParts.push(`Note: ${itemNoteInput}`);

    const combinedNote = noteParts.join(' | ');
    const cartItemId = `${selectedProductForVariation.id}-${selectedSize}-${combinedNote}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + 1 };
        return next;
      }
      return [...prev, { 
        cartItemId,
        id: selectedProductForVariation.id, 
        name: fullName, 
        price: finalItemPrice, 
        quantity: 1, 
        size: selectedSize,
        note: combinedNote 
      }];
    });

    setIsVariationModalOpen(false);
    setSelectedProductForVariation(null);
    setSearchQuery('');
    toast.success(`जोड़ा गया: ${fullName}!`);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  // WINDOW-LEVEL KEYBOARD LISTENER FOR VARIATION MODAL (TAB / ARROWS / ENTER)
  useEffect(() => {
    if (!isVariationModalOpen || !selectedProductForVariation?.variants) return;

    const handleModalKeys = (e: KeyboardEvent) => {
      const entries = Object.entries(selectedProductForVariation.variants);
      const totalVariants = entries.length;
      if (totalVariants === 0) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVariantIndex((prev) => {
          const next = e.shiftKey
            ? (prev - 1 + totalVariants) % totalVariants
            : (prev + 1) % totalVariants;
          setSelectedSize(entries[next][0]);
          setSelectedSizePrice(Number(entries[next][1]) || 0);
          return next;
        });
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVariantIndex((prev) => {
          const next = (prev + 1) % totalVariants;
          setSelectedSize(entries[next][0]);
          setSelectedSizePrice(Number(entries[next][1]) || 0);
          return next;
        });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedVariantIndex((prev) => {
          const prevIdx = (prev - 1 + totalVariants) % totalVariants;
          setSelectedSize(entries[prevIdx][0]);
          setSelectedSizePrice(Number(entries[prevIdx][1]) || 0);
          return prevIdx;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleAddCustomizedItemToCart();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsVariationModalOpen(false);
        setTimeout(() => searchInputRef.current?.focus(), 60);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const numIdx = parseInt(e.key, 10) - 1;
        if (entries[numIdx]) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedVariantIndex(numIdx);
          setSelectedSize(entries[numIdx][0]);
          setSelectedSizePrice(Number(entries[numIdx][1]) || 0);
        }
      }
    };

    window.addEventListener('keydown', handleModalKeys, true);
    return () => window.removeEventListener('keydown', handleModalKeys, true);
  }, [isVariationModalOpen, selectedProductForVariation, selectedSizePrice, selectedSize, itemNoteInput, selectedAddons]);

  const handleUpdateCartQuantity = (cartItemId: string, amount: number) => {
    triggerBeep('tap');
    setCart((prev) => prev.map((item) => {
      if (item.cartItemId === cartItemId) {
        const updatedQty = item.quantity + amount;
        return updatedQty > 0 ? { ...item, quantity: updatedQty } : null;
      }
      return item;
    }).filter(Boolean) as PosCartItem[]);
  };

  const getDailyTokenNumber = () => {
    const todayStr = new Date().toDateString();
    let lastResetDate = localStorage.getItem("bb_pos_token_reset_date");
    let currentTokenSeq = Number(localStorage.getItem("bb_pos_daily_token_seq") || "0");

    if (lastResetDate !== todayStr) {
      currentTokenSeq = 1;
      localStorage.setItem("bb_pos_token_reset_date", todayStr);
    } else {
      currentTokenSeq += 1;
    }
    localStorage.setItem("bb_pos_daily_token_seq", String(currentTokenSeq));
    return currentTokenSeq;
  };

// 🚀 OFFLINE QR CODE GENERATOR 
  const generateOfflineQrCode = async (upiString: string): Promise<string> => {
    try {
      if (QRCode && QRCode.toDataURL) {
        return await QRCode.toDataURL(upiString, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
      }
    } catch (e) { console.error("QR Code Error:", e); }
    return '';
  };

// ==========================================
  // 🚀 FIXED: ROBUST OFFLINE PRINTING ENGINE
  // ==========================================
  const handlePrintReceiptDirect = async (orderObj: any, isKot = false): Promise<void> => {
    return new Promise(async (resolve) => {
      if (!orderObj || !orderObj.items || orderObj.items.length === 0) return resolve();

      if (!isKot) {
        try {
          const upiString = `upi://pay?pa=${orderObj.upiId || upiIdConfig}&pn=BumBumCafe&am=${orderObj.total}&cu=INR&tn=Bill-${orderObj.billNumber || 'Order'}`;
          orderObj.offlineQrUrl = await generateOfflineQrCode(upiString); 
        } catch (e) {
          console.error("QR Error", e);
        }
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; 
      iframe.style.right = '0'; 
      iframe.style.bottom = '0'; 
      iframe.style.width = '0'; 
      iframe.style.height = '0'; 
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const printDocument = iframe.contentWindow?.document;
      if (!printDocument) { toast.error("प्रिंटिंग फ्रेम लोड नहीं हो पाया!"); return resolve(); }

      printDocument.write('<!DOCTYPE html><html><head><title>Print Receipt</title>');
      printDocument.write(`
        <style>
          @page { size: 80mm auto; margin: 0mm !important; }
          * { font-family: Verdana, Geneva, Tahoma, sans-serif !important; box-sizing: border-box; }
          html, body { margin: 0 !important; padding: 0 !important; width: 80mm !important; background: #ffffff !important; color: #000000 !important; }
          #print-root { width: 68mm !important; max-width: 68mm !important; margin-left: 2mm !important; padding-right: 2mm !important; }
          img { display: block !important; margin: 0 auto !important; max-width: 100% !important; }
        </style>
      `);
      
      let cssString = '';
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          const rules = document.styleSheets[i].cssRules || document.styleSheets[i].rules;
          if (rules) {
            for (let j = 0; j < rules.length; j++) {
              cssString += rules[j].cssText + '\n';
            }
          }
        }
      } catch (e) { /* Ignore CORS errors */ }
      
      printDocument.write(`<style>${cssString}</style>`);
      Array.from(document.querySelectorAll('style')).forEach((styleTag) => {
        printDocument.write(styleTag.outerHTML);
      });
      
      printDocument.write('</head><body><div id="print-root"></div></body></html>');
      printDocument.close();

      const container = printDocument.getElementById('print-root');
      if (container) {
        const root = createRoot(container);
        if (isKot) { 
          root.render(<PrintKitchenKot orderObj={orderObj} />); 
        } else { 
          root.render(<PrintCustomerReceipt orderObj={orderObj} currentUser={currentUser} storeName={storeNameConfig} storeAddress={storeAddressConfig} storePhone={storePhoneConfig} />); 
        }

        // 🔥 OFFLINE FIX: इमेजेज का इंतज़ार करने के बजाय, सीधे एक छोटे डिले (Delay) के बाद प्रिंट ट्रिगर कर दें।
        // अगर नेट है तो 800ms इंतज़ार करेगा, अगर ऑफ़लाइन है तो सिर्फ 500ms में प्रिंट कर देगा, जिससे ये कभी अटकेगा नहीं।
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus(); 
            iframe.contentWindow?.print();
          } catch(err) {
            console.error("Print call failed", err);
          }
          
          setTimeout(() => {
            if (document.body.contains(iframe)) { 
              root.unmount(); 
              document.body.removeChild(iframe); 
            }
            resolve();
          }, 1000);
        }, navigator.onLine ? 800 : 500); 

      } else {
        document.body.removeChild(iframe); 
        resolve();
      }
    });
  };
  // Running Table Order: Save & Print ONLY Newly Added Items in KOT
  const handleSaveTableOrderKotOnly = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const finalTotal = getTotalBillPrice();
    const discountAmt = getCalculatedDiscountAmount();
    const token = getDailyTokenNumber();

    try {
      let billNumber: number;

      if (activeEditingOrderId) {
        billNumber = activeEditingBillNumber || getNextBillNumber();
        
        const newlyAddedKotItems: PosCartItem[] = [];
        cart.forEach((currItem) => {
          const prevItem = activeEditingOriginalItems.find(
            p => p.cartItemId === currItem.cartItemId || 
                 (p.name === currItem.name && p.size === currItem.size && p.note === currItem.note)
          );
          const prevQty = prevItem ? prevItem.quantity : 0;
          const diffQty = currItem.quantity - prevQty;
          if (diffQty > 0) {
            newlyAddedKotItems.push({
              ...currItem,
              quantity: diffQty
            });
          }
        });

        const orderRef = doc(db, "orders", activeEditingOrderId);
        const updatedOrderObj = { 
          items: cart, 
          subtotal, 
          discountType,
          discountValue,
          discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, 
          gstAmount: getGstAmountCalculated(), 
          total: finalTotal, 
          tableNumber: tableNumber,
          customerName: customerName || "Walk-in Guest",
          customerPhone: customerPhone ? `+91${getSanitizedPhone(customerPhone)}` : "",
          upiId: upiIdConfig,
          status: 'unsettled',
          paymentSettled: false,
          fulfillmentType: 'table',
          lastUpdated: new Date()
        };

        if (navigator.onLine) {
          await updateDoc(orderRef, updatedOrderObj);
        }
        setLiveOrders(prev => prev.map(o => o.id === activeEditingOrderId ? { ...o, ...updatedOrderObj } : o));

        triggerBeep('success');

        if (kotEnabled) {
          if (newlyAddedKotItems.length > 0) {
            toast.success(`टेबल ${tableNumber} अपडेट! केवल ${newlyAddedKotItems.length} नए आइटम की KOT प्रिंट हुई। 🪑`);
            await handlePrintReceiptDirect({ ...updatedOrderObj, items: newlyAddedKotItems, billNumber, tokenNumber: token, fulfillmentType: 'table' }, true);
          } else {
            toast.success(`टेबल ${tableNumber} अपडेट! कोई नया आइटम नहीं जुड़ा।`);
          }
        }
      } else {
        billNumber = getNextBillNumber();

        const orderObj = { 
          billNumber, 
          tokenNumber: token, 
          customerName: customerName || "Walk-in Guest", 
          customerPhone: customerPhone ? `+91${getSanitizedPhone(customerPhone)}` : "", 
          items: cart, 
          subtotal, 
          discountType, 
          discountValue, 
          discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, 
          gstAmount: getGstAmountCalculated(), 
          deliveryFee: 0, 
          total: finalTotal, 
          timestamp: new Date(), 
          status: 'unsettled', 
          paymentSettled: false,
          fulfillmentType: 'table', 
          deliveryArea: "", 
          tableNumber: tableNumber, 
          paymentMethod, 
          source: 'PC_POS', 
          address: '',
          upiId: upiIdConfig
        };

        if (navigator.onLine) {
          const docRef = await addDoc(collection(db, "orders"), orderObj);
          setLiveOrders(prev => [{ id: docRef.id, ...orderObj }, ...prev]);
        } else {
          try {
            const offlineQueue = JSON.parse(localStorage.getItem("bb_pos_offline_orders_queue") || "[]");
            offlineQueue.push(orderObj);
            localStorage.setItem("bb_pos_offline_orders_queue", JSON.stringify(offlineQueue));
          } catch (e) {
            toast.error("Offline storage full! Please connect to internet.");
          }
          setLiveOrders(prev => [{ id: `offline_${Date.now()}`, ...orderObj }, ...prev]);
        }

        triggerBeep('success');
        toast.success(`टेबल ${tableNumber} पर बिल सेव हुआ व KOT निकल गई! 🪑`);

        if (kotEnabled) {
          await handlePrintReceiptDirect(orderObj, true);
        }
      }

      // Reset state & default pickup
      setCart([]); 
      setCustomerPhone(''); 
      setCustomerName(''); 
      setCartCustSearchInput('');  // <--- यह लाइन जोड़ें
      setAddress('');
      setDiscountValue(0); 
      setIsDiscountOpen(false);
      setIsRedeemingPoints(false); 
      setPointsToRedeem(0);
      setCashTendered('');
      setFulfillmentType('pickup');
      setTableNumber('Table 1');
      setApplyDeliveryFee(false);
      setApplyPackingCharge(false); // 👈 अगले बिल के लिए पैकिंग चार्ज रीसेट
      setActiveEditingOrderId(null);
      setActiveEditingBillNumber(null);
      setActiveEditingOriginalItems([]);
      setActiveEditingPreviousOrder(null); // 👈 रीसेट
      localStorage.removeItem("bb_pos_saved_cart_pc");
      setTimeout(() => searchInputRef.current?.focus(), 60);

    } catch (err) {
      toast.error("Failed to save table order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

 // 👉 NEW: Stock Checker (चेक करें कि कच्चा माल है या नहीं)
 // 👉 UPDATE: स्टॉक चेकर में Variant को जोड़ा गया (ताकि Half/Full की अलग-अलग वार्निंग आए)
  const checkStockAvailability = (product: any, qtyToAdd: number, variantSize?: string) => {
    if (!product || !product.recipe || !Array.isArray(product.recipe)) return { isOk: true };

    const cartUsage: any = {};
    cart.forEach(cItem => {
      const p = products.find(x => x.id === cItem.id);
      if (p && p.recipe) {
        p.recipe.forEach((r: any) => {
          if (!r.variant || r.variant === 'All' || r.variant === cItem.size) {
            cartUsage[r.rawId] = (cartUsage[r.rawId] || 0) + (r.qty * cItem.quantity);
          }
        });
      }
    });

    for (const r of product.recipe) {
      // अगर हम कोई खास Variant कार्ट में डाल रहे हैं, तो सिर्फ उसी का माल चेक करो
      if (!r.variant || r.variant === 'All' || r.variant === variantSize) {
        const rawItem = rawMaterials.find(rm => rm.id === r.rawId);
        if (rawItem) {
          const needed = (cartUsage[r.rawId] || 0) + (r.qty * qtyToAdd);
          if (needed > Number(rawItem.stock)) {
            return { isOk: false, name: rawItem.name, stock: rawItem.stock, unit: rawItem.unit };
          }
        }
      }
    }
    return { isOk: true };
  };

  // 👉 NEW: Merge Table (टेबल जोड़ने का फंक्शन)
  const handleMergeTableConfirm = async () => {
    if (!tableMergeSourceOrder || !tableMergeTargetOrderId) return;
    const targetOrder = activeTableOrders.find(o => o.id === tableMergeTargetOrderId);
    if (!targetOrder) return;

    const toastId = toast.loading(`टेबल ${tableMergeSourceOrder.tableNumber} को ${targetOrder.tableNumber} में जोड़ा जा रहा है...`);
    try {
      const combinedItems = [...targetOrder.items];
      tableMergeSourceOrder.items.forEach((sItem: any) => {
        // ID क्लैश न हो इसलिए मर्ज टैग लगा दें
        combinedItems.push({...sItem, cartItemId: sItem.cartItemId + `_merged_${Date.now()}`});
      });

      const newSubtotal = combinedItems.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0);
      const newGstAmt = gstEnabled ? Number(((newSubtotal * gstRate) / 100).toFixed(2)) : 0;
      const newTotal = newSubtotal + newGstAmt - (Number(targetOrder.discountAmount) || 0);

      await updateDoc(doc(db, "orders", targetOrder.id), {
        items: combinedItems,
        subtotal: newSubtotal,
        gstAmount: newGstAmt,
        total: newTotal,
        lastUpdated: new Date()
      });

      await deleteDoc(doc(db, "orders", tableMergeSourceOrder.id));

      toast.dismiss(toastId);
      toast.success(`दोनों टेबल सफलतापूर्वक मर्ज (Merge) हो गईं! ✅`);
      setIsTableMergeModalOpen(false);
      setTableMergeSourceOrder(null);
      setTableMergeTargetOrderId('');
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("टेबल मर्ज करने में त्रुटि आई!");
    }
  };

 // 👉 NEW: Table Transfer (टेबल बदलने का फंक्शन)
  const handleTransferTableConfirm = async () => {
    if (!tableTransferSourceOrder || !tableTransferTarget) return;
    const toastId = toast.loading(`टेबल ${tableTransferSourceOrder.tableNumber} से ${tableTransferTarget} पर शिफ़्ट हो रही है...`);
    try {
      await updateDoc(doc(db, "orders", tableTransferSourceOrder.id), {
        tableNumber: tableTransferTarget,
        lastUpdated: new Date()
      });
      toast.dismiss(toastId);
      toast.success(`टेबल सफलतापूर्वक बदल दी गई! (${tableTransferSourceOrder.tableNumber} ➡️ ${tableTransferTarget}) ✅`);
      setIsTableTransferModalOpen(false);
      setTableTransferSourceOrder(null);
      setTableTransferTarget('');
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("टेबल बदलने में त्रुटि आई!");
    }
  };

  // Final Checkout & Bill Print: Saved as 'unsettled' until settled in Daily Bills tab!
  const handleFinalCheckoutAndPrintBill = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const finalTotal = getTotalBillPrice();
    const discountAmt = getCalculatedDiscountAmount();
    const token = getDailyTokenNumber();
    let earned = Math.floor(finalTotal / 100); // 👈 (यहाँ const की जगह let कर दिया)
    const redeemed = isRedeemingPoints ? pointsToRedeem : 0;
    const cleanPhone = getSanitizedPhone(customerPhone);

   try {
      let billNumber: number = activeEditingBillNumber || getNextBillNumber(); 

      // 👉 Offline के लिए लॉजिक
      let gamePtsDeductedOffline = Math.min(redeemed, customerGamePoints);
      let loyPtsDeductedOffline = redeemed - gamePtsDeductedOffline;
      let remainingPts = Math.max(0, customerPoints - loyPtsDeductedOffline) + earned;
      let remainingGamePts = customerGamePoints - gamePtsDeductedOffline;

      if (cleanPhone.length === 10 && navigator.onLine) {
        const userRef = doc(db, "customer_points", cleanPhone);
        const userDoc = await getDoc(userRef);
        let prevPoints = 0;
        let prevGamePoints = 0; // 👉 NEW
        let prevSpent = 0;
        let prevVisits = 0;
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          prevPoints = Number(data.points) || 0;
          prevGamePoints = Number(data.gamePoints) || 0; // 👉 NEW
          prevSpent = Number(data.totalSpent) || 0;
          prevVisits = Number(data.totalVisits) || 0;
        }

       // 🛡️ चेक करें कि क्या यह पुराना कम्प्लीट बिल एडिट हो रहा है?
        const isReEditingCompletedBill = 
          activeEditingPreviousOrder && 
          (activeEditingPreviousOrder.pointsEarned !== undefined || 
           activeEditingPreviousOrder.status === 'completed' || 
           activeEditingPreviousOrder.paymentSettled);

        let newSpent = prevSpent + finalTotal;
        let newVisits = prevVisits + 1;

       if (isReEditingCompletedBill) {
          const oldTotal = Number(activeEditingPreviousOrder.total) || 0;
          const oldEarned = Number(activeEditingPreviousOrder.pointsEarned) || 0;
          const oldRedeemed = Number(activeEditingPreviousOrder.pointsRedeemed) || 0;

          const spentBeforeOldBill = Math.max(0, prevSpent - oldTotal);
          newSpent = spentBeforeOldBill + finalTotal;
          earned = Math.floor(newSpent / 100) - Math.floor(spentBeforeOldBill / 100);

          // 👉 SMART REDEMPTION LOGIC: पहले गेम पॉइंट्स काटें
          let gamePtsDeducted = Math.min(redeemed, prevGamePoints);
          let loyPtsDeducted = redeemed - gamePtsDeducted;

          const rolledBackPoints = prevPoints - oldEarned + oldRedeemed;
          remainingPts = Math.max(0, rolledBackPoints - loyPtsDeducted) + Math.max(0, earned);
          remainingGamePts = prevGamePoints - gamePtsDeducted; // 👉 NEW
          newVisits = prevVisits; 
        } else {
          newSpent = prevSpent + finalTotal;
          earned = Math.floor(newSpent / 100) - Math.floor(prevSpent / 100);
          
          // 👉 SMART REDEMPTION LOGIC: पहले गेम पॉइंट्स काटें
          let gamePtsDeducted = Math.min(redeemed, prevGamePoints);
          let loyPtsDeducted = redeemed - gamePtsDeducted;

          remainingPts = Math.max(0, prevPoints - loyPtsDeducted) + Math.max(0, earned);
          remainingGamePts = prevGamePoints - gamePtsDeducted; // 👉 NEW
          newVisits = prevVisits + 1;
        }

       // 🚀 OFFLINE POINTS SAVE LOGIC
        const updatedCustomerData = { 
          name: customerName || "Walk-in Guest", 
          phone: cleanPhone, 
          points: remainingPts, 
          gamePoints: remainingGamePts, 
          totalSpent: newSpent,
          totalVisits: newVisits,
          lastBillNumber: billNumber, 
          lastBillAmount: finalTotal, 
          lastActive: new Date().toISOString()
        };

        if (navigator.onLine) {
          await setDoc(userRef, updatedCustomerData, { merge: true });
        } else {
          const custQueue = JSON.parse(localStorage.getItem("bb_pos_offline_customers_queue") || "[]");
          const filtered = custQueue.filter((c: any) => c.phone !== cleanPhone);
          filtered.push(updatedCustomerData);
          localStorage.setItem("bb_pos_offline_customers_queue", JSON.stringify(filtered));
        }
      } else {
        // बिना मोबाइल वाले ग्राहकों के लिए
        remainingPts = Math.max(0, customerPoints - redeemed) + earned;
      }

      const orderObj = { 
        billNumber,
        tokenNumber: token, 
        customerName: customerName || "Walk-in Guest", 
        customerPhone: cleanPhone ? `+91${cleanPhone}` : "", 
        items: cart, 
        subtotal, 
        discountType, 
        discountValue, 
        discountAmount: discountAmt, 
        gstRate: gstEnabled ? gstRate : 0, 
        gstAmount: getGstAmountCalculated(), 
        deliveryFee: getDeliveryCharge(), 
        packingCharge: getPackingCharge(), 
        total: finalTotal,
        timestamp: new Date(), 
        status: 'unsettled', 
        paymentSettled: false,
        fulfillmentType, 
        deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "", 
        tableNumber: fulfillmentType === 'table' ? tableNumber : '', 
        paymentMethod, 
        splitCashAmount: paymentMethod === 'split' ? splitCashAmount : 0,
        splitUpiAmount: paymentMethod === 'split' ? splitUpiAmount : 0,
        source: 'PC_POS', 
        address,
        pointsEarned: earned,
        pointsRedeemed: redeemed, 
        pointsDiscount: redeemed,
        remainingPoints: remainingPts,
        customerPoints: remainingPts,
       upiId: upiIdConfig,
        promoCodeUsed: appliedPromoName || null, // 👉 NEW: यहाँ सेव होगा कि कौन सा कूपन यूज़ हुआ
        pointsProcessed: true, // 👉 NEW: ताकि दोबारा पॉइंट्स न जुड़ें
        stockProcessed: false  // 👉 FIX: इसे false करना होगा, ताकि बिल सेटल (चुकाने) पर स्टॉक कटे!
      };

      if (activeEditingOrderId) {
        if (navigator.onLine) {
          await updateDoc(doc(db, "orders", activeEditingOrderId), orderObj);
        }
        setLiveOrders(prev => prev.map(o => o.id === activeEditingOrderId ? { id: o.id, ...orderObj } : o));
      } else {
        if (navigator.onLine) {
          const docRef = await addDoc(collection(db, "orders"), orderObj);
          setLiveOrders(prev => [{ id: docRef.id, ...orderObj }, ...prev]);
        } else {
          try {
            const cachedQueue = JSON.parse(localStorage.getItem("bb_pos_offline_orders_queue") || "[]");
            cachedQueue.push(orderObj);
            localStorage.setItem("bb_pos_offline_orders_queue", JSON.stringify(cachedQueue));
          } catch (e) {
            toast.error("Offline storage full! Please connect to internet.");
          }
        }
      }

      triggerBeep('success');
      if (cleanPhone && cleanPhone.length === 10) {
        setRecentCartCustomers(prev => {
          const filtered = prev.filter(c => c.phone !== cleanPhone);
          const next = [{ name: customerName || "Guest", phone: cleanPhone }, ...filtered].slice(0, 10);
          localStorage.setItem("bb_pos_recent_customers", JSON.stringify(next));
          return next;
        });
      }

      // Print Customer Bill 
      await handlePrintReceiptDirect(orderObj, false);

      // 👉 NEW: KOT Print Logic for Pickup & Delivery
      if (kotEnabled && (fulfillmentType === 'pickup' || fulfillmentType === 'delivery')) {
        toast.success(`Kitchen KOT प्रिंट हो रही है... 🖨️`);
        await handlePrintReceiptDirect(orderObj, true);
      }

     fetchAllCustomers(); // 👉 NEW: पॉइंट्स जुड़ते ही तुरंत UI अपडेट करें
      toast.success(`बिल #${billNumber} प्रिंट हुआ! (Daily Bills से सेटल करें)`);
      // Reset state & default pickup
      setCart([]); 
      setCustomerPhone(''); 
      setCustomerName(''); 
      setCartCustSearchInput(''); 
      setCustomerGamePoints(0); // 👉 NEW
      setAddress('');
      setCustomerPoints(0); 
      setDiscountValue(0); 
      setIsDiscountOpen(false);
      setShowNewCustForm(false);
      setIsRedeemingPoints(false); 
      setPointsToRedeem(0);
      setCashTendered('');
      setAppliedPromoName(null);
      setPromoCouponInput('');
      setFulfillmentType('pickup');
      setTableNumber('Table 1');
      setApplyDeliveryFee(false);
      setApplyPackingCharge(false); // 👈 पैकिंग चार्ज रीसेट
      setActiveEditingOrderId(null);
      setActiveEditingBillNumber(null);
      setActiveEditingOriginalItems([]);
      setActiveEditingPreviousOrder(null); // 👈 री-एडिट रीसेट
      localStorage.removeItem("bb_pos_saved_cart_pc");
      setTimeout(() => searchInputRef.current?.focus(), 80);
    } catch (err) {
      toast.error("Checkout failed");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Past Bill Re-Edit Logic
  const handleReEditOrder = (order: any) => {
    triggerBeep('tap');
    if (!window.confirm(`क्या आप बिल #${order.billNumber} को फिर से एडिट करना चाहते हैं? (यह बिल वापस काउंटर पर चला जाएगा)`)) return;

    setActiveEditingOrderId(order.id);
    setActiveEditingBillNumber(order.billNumber);
    setActiveEditingPreviousOrder(order); // 👈 पुराने बिल का डेटा सेव किया
    setActiveEditingOriginalItems(order.items ? JSON.parse(JSON.stringify(order.items)) : []);
    setCart(order.items || []);
    
    setCustomerName(order.customerName || '');
    const cleanPhone = order.customerPhone ? String(order.customerPhone).replace(/\D/g, '').slice(-10) : '';
    setCustomerPhone(cleanPhone);
    if (cleanPhone.length === 10) {
      searchCustomerByExactPhone(cleanPhone); // Fetch latest profile/points
    }
    
    setAddress(order.address || '');
    setFulfillmentType(order.fulfillmentType || 'pickup');
    setTableNumber(order.tableNumber || 'Table 1');
    setPaymentMethod(order.paymentMethod || 'cash');

    if (order.discountValue && order.discountValue > 0) {
      setDiscountValue(order.discountValue);
      setDiscountType(order.discountType || 'amount');
      setIsDiscountOpen(true);
    } else {
      setDiscountValue(0);
      setIsDiscountOpen(false);
    }

    setActiveTab('billing');
    toast.success(`Bill #${order.billNumber} एडिट मोड में खुल गया है! 🛒`);
    setTimeout(() => searchInputRef.current?.focus(), 80);
  };

  // 👉 NEW: Auto-deduct Raw Material Inventory (जब बिल चुकता होता है तो स्टॉक काटें)
 // 👉 UPDATE: अब स्टॉक Variant (Half/Full) के हिसाब से कटेगा
  const deductInventoryForItems = async (itemsToDeduct: any[]) => {
    if (!navigator.onLine || !itemsToDeduct || itemsToDeduct.length === 0) return;
    try {
      const batch = writeBatch(db);
      const deductMap: any = {};
      
      itemsToDeduct.forEach(cartItem => {
        const prod = products.find(p => p.id === cartItem.id);
        if (prod && prod.recipe && Array.isArray(prod.recipe)) {
          prod.recipe.forEach((rec: any) => {
            // चेक करें कि क्या यह कच्चा माल 'All' के लिए है या कस्टमर के चुने हुए Size (e.g. 'Half') के लिए है
            if (!rec.variant || rec.variant === 'All' || rec.variant === cartItem.size) {
              if (!deductMap[rec.rawId]) deductMap[rec.rawId] = 0;
              deductMap[rec.rawId] += rec.qty * cartItem.quantity;
            }
          });
        }
      });

      for (const [rawId, totalQty] of Object.entries(deductMap)) {
        batch.update(doc(db, "raw_materials", rawId), { 
          stock: increment(-Number(totalQty)),
          totalConsumed: increment(Number(totalQty)) // 👉 NEW: इस्तेमाल हुए माल का हिसाब रखने के लिए
        });
      }
      await batch.commit();
    } catch (e) {
      console.error("Inventory deduction failed", e);
    }
  };

 // Quick Settle Action (From Daily Bills Tab)
  const handleQuickSettleOrder = async (orderId: string, pMethod: 'cash' | 'upi' | 'due' | 'split') => {
    triggerBeep('tap');
    const toastId = toast.loading(`Settling bill via ${pMethod.toUpperCase()}...`);
    try {
      let updatePayload: any = {
        status: 'completed',
        paymentSettled: true,
        paymentMethod: pMethod,
        settledAt: new Date()
      };
      
      const orderToSettle = liveOrders.find(o => o.id === orderId);
      
      if (orderToSettle) {
        // 1. Stock Deduction
        if (orderToSettle.items && !orderToSettle.stockProcessed) {
          await deductInventoryForItems(orderToSettle.items);
          updatePayload.stockProcessed = true;
        }

        // 2. 👉 NEW: Loyalty Points Logic (अब यहाँ से भी पॉइंट्स जुड़ेंगे!)
        if (orderToSettle.customerPhone && !orderToSettle.pointsProcessed) {
           const cleanPhone = String(orderToSettle.customerPhone).replace(/\D/g, '').slice(-10);
           if (cleanPhone.length === 10 && navigator.onLine) {
             const userRef = doc(db, "customer_points", cleanPhone);
             const userDoc = await getDoc(userRef);
             
             let prevPoints = 0; let prevSpent = 0; let prevVisits = 0;
             if (userDoc.exists()) {
               const data = userDoc.data();
               prevPoints = Number(data.points) || 0;
               prevSpent = Number(data.totalSpent) || 0;
               prevVisits = Number(data.totalVisits) || 0;
             }

             const finalTotal = Number(orderToSettle.total) || 0;
             const newSpent = prevSpent + finalTotal;
             const earned = Math.floor(newSpent / 100) - Math.floor(prevSpent / 100);
             const remainingPts = prevPoints + earned;

             await setDoc(userRef, {
               name: orderToSettle.customerName || "Walk-in Guest",
               phone: cleanPhone,
               points: remainingPts,
               totalSpent: newSpent,
               totalVisits: prevVisits + 1,
               lastBillNumber: orderToSettle.billNumber,
               lastBillAmount: finalTotal,
               lastActive: new Date().toISOString()
             }, { merge: true });

             updatePayload.pointsEarned = earned;
             updatePayload.remainingPoints = remainingPts;
             updatePayload.pointsProcessed = true;
             
             fetchAllCustomers(); // UI Refresh
           }
        }
      }

      await updateDoc(doc(db, "orders", orderId), updatePayload);
      setLiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatePayload } : o));
      toast.dismiss(toastId);
      toast.success(`बिल सेटल हुआ [${pMethod.toUpperCase()}] और आज की बिक्री में जुड़ गया! ✅`);
      triggerBeep('success');
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("सेटलमेंट विफल रहा");
    }
  };

 // 🟢 WhatsApp Bill Sender (With Customer Feedback Links)
  const handleSendWhatsAppBill = (targetOrder: any = null) => {
    const ord = targetOrder || { customerPhone, customerName, fulfillmentType, items: cart, total: getTotalBillPrice() };
    const clean = getSanitizedPhone(ord.customerPhone || '');
    if (clean.length !== 10) return toast.error("Enter valid 10-digit phone number!");
    if (!ord.items || ord.items.length === 0) return toast.error("No items in cart!");

    const itemsText = ord.items.map((i: any) => `• ${i.name} x${i.quantity} = ₹${i.price * i.quantity}`).join('%0A');
    
    // 👉 फीडबैक के लिए आपके कैफे के नंबर पर आटोमेटिक रिप्लाई सेट किया गया है
    const cafeNum = getSanitizedPhone(ownerPhoneConfig || '9714293759');
    
    const msg = `*☕ BUM BUM CAFE - DIGITAL RECEIPT*%0A------------------------------%0A*Customer:* ${ord.customerName || 'Valued Guest'}%0A*Total Amount:* ₹${ord.total}%0A*Payment:* ${ord.paymentMethod || 'Paid'}%0A------------------------------%0A${itemsText}%0A------------------------------%0A_Thank you for visiting Bum Bum Cafe!_ 💛%0A%0A⭐ *Share Your Feedback:*%0Aकैसा रहा आपका अनुभव? नीचे क्लिक करें:%0A🟢 Excellent: https://wa.me/91${cafeNum}?text=Feedback:%20Excellent%20⭐%0A🟡 Average: https://wa.me/91${cafeNum}?text=Feedback:%20Average%20👍%0A🔴 Bad: https://wa.me/91${cafeNum}?text=Feedback:%20Bad%20👎`;
    
    window.open(`https://wa.me/91${clean}?text=${msg}`, '_blank');
  };

// 📄 [HELPER] Professional EOD PDF Generator
  const generateProfessionalPDF = () => {
    const doc = new jsPDF();
    const todayDate = new Date().toLocaleDateString('en-IN');
    const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // --- 1. HEADER ---
    doc.setFontSize(24);
    doc.setTextColor(234, 88, 12); // Orange Theme
    doc.text("BUM BUM CAFE", 105, 18, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Mohandra | Daily EOD Sales & Settlement Report", 105, 24, { align: "center" });
    doc.text(`Date: ${todayDate}   |   Generated At: ${currentTime}`, 105, 29, { align: "center" });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 33, 195, 33);

    // --- 2. FINANCIAL SUMMARY TABLE ---
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("1. Financial Summary", 15, 43);

    autoTable(doc, {
      startY: 47,
      head: [["Description", "Amount / Count"]],
      body: [
        ["Total Settled Orders", `${reportSummary.totalOrdersCount} Orders`],
        ["Gross Sales (Total Billing)", `Rs. ${reportSummary.totalSale}`],
        ["Received via Cash", `Rs. ${reportSummary.cashSale}`],
        ["Received via UPI / Online", `Rs. ${reportSummary.upiSale}`],
        ["Udhar (Due / Unpaid)", `Rs. ${reportSummary.dueSale}`],
        ["Total Discount Given", `Rs. ${reportSummary.totalDiscount}`], // 👉 NEW
      ],
      theme: 'grid',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
    });

    // --- 3. CASH DRAWER AUDIT TABLE ---
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    // 👉 मैंने यहाँ से भी हिंदी शब्द हटा दिया है ताकि PDF में कचरा (Garbage text) न छपे
    doc.text("2. Cash Drawer Audit", 15, finalY);

    autoTable(doc, {
      startY: finalY + 4,
      head: [["Description", "Amount (Rs.)"]],
      body: [
        ["Total Cash Collected", `Rs. ${reportSummary.cashSale}`],
        ["Total Expenses Paid from Drawer", `- Rs. ${reportSummary.totalExpenseAmount}`],
        ["NET CASH IN DRAWER", `Rs. ${reportSummary.netCashInDrawer}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
      bodyStyles: { textColor: [0, 0, 0] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: function(data: any) {
        if (data.row.index === 2 && data.section === 'body') {
          data.cell.styles.textColor = [22, 163, 74]; // Green color for Net Cash
        }
        if (data.row.index === 1 && data.section === 'body') {
          data.cell.styles.textColor = [220, 38, 38]; // Red color for Expense
        }
      }
    });

    // --- 4. ITEM-WISE SALES TABLE (CLEANED) ---
    finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("3. Item-wise Sales Breakdown", 15, finalY);

    // 🧹 Clean Items Logic
    const cleanItemsMap: any = {};
    itemWiseSales.forEach((item) => {
      let cleanName = item.name.split('|')[0].trim(); // Removes Add-ons & Notes
      
      // 👉 NEW: हिंदी या अन्य अनचाहे अक्षरों को यहाँ हटा रहे हैं
      cleanName = cleanName.replace(/[^\x00-\x7F]/g, ""); 
      
      // 👉 NEW: हिंदी हटाने के बाद बचने वाले खाली ब्रैकेट '()' को हटा रहे हैं
      cleanName = cleanName.replace(/\(\s*\)/g, "").trim();
      
      // 👉 NEW: एक्स्ट्रा स्पेस हटा रहे हैं ताकि नाम साफ़ दिखे
      cleanName = cleanName.replace(/\s+/g, " ");

      // अगर आइटम का नाम सिर्फ हिंदी में था और वो हट गया है, तो fallback
      if (!cleanName) cleanName = "Menu Item"; 

      if (!cleanItemsMap[cleanName]) {
         cleanItemsMap[cleanName] = { name: cleanName, qty: 0, rev: 0 };
      }
      cleanItemsMap[cleanName].qty += item.quantity;
      cleanItemsMap[cleanName].rev += Number(item.revenue);
    });

    // Sort by highest quantity sold
    const sortedCleanItems = Object.values(cleanItemsMap).sort((a: any, b: any) => b.qty - a.qty);

    const tableRows: any[] = [];
    sortedCleanItems.forEach((item: any, index: number) => {
      tableRows.push([
        index + 1,
        item.name,
        item.qty.toString(),
        `Rs. ${item.rev}`
      ]);
    });

    autoTable(doc, {
      startY: finalY + 4,
      head: [["S.No", "Item Name", "Qty Sold", "Revenue"]],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 50] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
      }
    });

    // --- 5. FOOTER SIGNATURES ---
    finalY = (doc as any).lastAutoTable.finalY + 25;
    if (finalY > 270) { doc.addPage(); finalY = 30; } // Add new page if space is low
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.line(15, finalY, 65, finalY); // Manager line
    doc.text("Manager Signature", 20, finalY + 5);
    
    doc.line(140, finalY, 190, finalY); // Owner line
    doc.text("Owner Signature", 148, finalY + 5);

    return { doc, todayDate };
  };

  // 📥 ONLY Download PDF Function (बिना WhatsApp के)
  const handleDownloadSummaryPDF = () => {
    const toastId = toast.loading("PDF रिपोर्ट बनाई जा रही है...");
    try {
      const { doc, todayDate } = generateProfessionalPDF();
      doc.save(`BBCafe_EOD_${todayDate.replace(/\//g, '-')}.pdf`);
      toast.dismiss(toastId);
      toast.success("EOD रिपोर्ट सफलतापूर्वक डाउनलोड हो गई! 📥");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("PDF बनाने में त्रुटि आई!");
      console.error(error);
    }
  };

  // 🟢 WhatsApp to Owner with PDF
  const handleSendOwnerSummary = async () => {
    const toastId = toast.loading("PDF रिपोर्ट तैयार की जा रही है...");
    try {
      const { doc, todayDate } = generateProfessionalPDF();
      const cleanOwner = getSanitizedPhone(ownerPhoneConfig);

      const pdfBlob = doc.output('blob');
      const fileName = `BBCafe_EOD_${todayDate.replace(/\//g, '-')}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: "application/pdf" });

      toast.dismiss(toastId);

      // Mobile Share via Web Share API
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            title: 'Bum Bum Cafe EOD Report',
            text: `*☕ BUM BUM CAFE - EOD SUMMARY*\nDate: ${todayDate}\nTotal Sales: ₹${reportSummary.totalSale}\n\nपूरी डिटेल के लिए PDF चेक करें 👇`,
            files: [pdfFile]
          });
          toast.success("रिपोर्ट शेयर कर दी गई! ✅");
          return;
        } catch (err) {
          console.log("User cancelled sharing");
        }
      }

      // PC Desktop Download & Redirect to WhatsApp Web
      const fileURL = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = fileURL;
      downloadLink.download = fileName;
      downloadLink.click();

      toast.success("PDF डाउनलोड हो गई है! कृपया WhatsApp Web पर अटैच करें।", { duration: 6000 });

      const msg = `*☕ BUM BUM CAFE - EOD SUMMARY*%0A------------------------------%0A*Date:* ${todayDate}%0A*Total Sales:* ₹${reportSummary.totalSale}%0A*Net Cash in Drawer:* ₹${reportSummary.netCashInDrawer}%0A------------------------------%0A_(⚠️ कृपया अभी डाउनलोड हुई EOD PDF फाइल यहाँ अटैच करें)_`;
      
      setTimeout(() => {
        window.open(`https://wa.me/${cleanOwner}?text=${msg}`, '_blank');
      }, 1500);

    } catch (error) {
      toast.dismiss(toastId);
      toast.error("PDF बनाने में त्रुटि आई!");
      console.error(error);
    }
  };
  
  // Daily Drawer Expense Save
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amt) || amt <= 0) return toast.error("Enter valid title and amount!");
    const toastId = toast.loading("Saving expense...");
    
    const expObj = {
      title: expenseTitle.trim(),
      amount: amt,
      category: expenseCategory,
      timestamp: new Date(),
      enteredBy: currentUser?.name || 'Staff'
    };

    try {
      if (navigator.onLine) {
        await addDoc(collection(db, "daily_expenses"), expObj);
      } else {
        const offlineExp = JSON.parse(localStorage.getItem("bb_pos_offline_expenses_queue") || "[]");
        offlineExp.push(expObj);
        localStorage.setItem("bb_pos_offline_expenses_queue", JSON.stringify(offlineExp));
      }
      toast.dismiss(toastId);
      toast.success(`Expense ₹${amt} saved! ✅`);
      setExpenseTitle('');
      setExpenseAmount('');
      setIsExpenseModalOpen(false);
      fetchReportData();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to record expense");
    }
  };
 // 🚀 OFFLINE & ONLINE REPORTS DATA FETCHING (FIXED DATE ISSUE)
  const fetchReportData = async () => {
    setIsReportLoading(true);
    try {
      let startTarget = new Date();
      let endTarget = new Date();

      if (reportFilter === 'today') {
        startTarget.setHours(0, 0, 0, 0); endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'yesterday') {
        startTarget.setDate(startTarget.getDate() - 1); startTarget.setHours(0, 0, 0, 0);
        endTarget.setDate(endTarget.getDate() - 1); endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'last7days') {
        startTarget.setDate(startTarget.getDate() - 6); startTarget.setHours(0, 0, 0, 0);
        endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'last30days') {
        startTarget.setDate(startTarget.getDate() - 29); startTarget.setHours(0, 0, 0, 0);
        endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'custom' && customStartDate && customEndDate) {
        const startParts = customStartDate.split('-');
        startTarget = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]), 0, 0, 0, 0);
        const endParts = customEndDate.split('-');
        endTarget = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]), 23, 59, 59, 999);
      }

      let allOrders: any[] = [];
      let allExpenses: any[] = [];

      // 1. अगर ऑनलाइन है तो Firebase से लाएं और डेट्स को सेफ फॉर्मेट में बदलें
      if (navigator.onLine) {
        const qOrders = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(2000));
       const snapOrders = await getDocs(qOrders);
        allOrders = snapOrders.docs.map(d => {
          const data = d.data();
          // 👉 FIX: अगर तारीख String है तो पुरानी तारीख रखेगा, 'अभी' की नहीं करेगा
          const correctTime = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : (typeof data.timestamp === 'string' ? data.timestamp : new Date(data.timestamp || Date.now()).toISOString());
          return { ...data, id: d.id, timestamp: correctTime };
        });
        localStorage.setItem("bb_pos_cached_report_orders", JSON.stringify(allOrders));

        const qExpenses = query(collection(db, "daily_expenses"), orderBy("timestamp", "desc"), limit(200));
        const snapExpenses = await getDocs(qExpenses);
        allExpenses = snapExpenses.docs.map(d => {
          const data = d.data();
          // 👉 FIX: खर्चों के लिए भी तारीख सही की गई
          const correctTime = data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : (typeof data.timestamp === 'string' ? data.timestamp : new Date(data.timestamp || Date.now()).toISOString());
          return { ...data, id: d.id, timestamp: correctTime };
        });
        localStorage.setItem("bb_pos_cached_report_expenses", JSON.stringify(allExpenses));
      } else {
        const cachedOrders = localStorage.getItem("bb_pos_cached_report_orders");
        if (cachedOrders) allOrders = JSON.parse(cachedOrders);

        const cachedExpenses = localStorage.getItem("bb_pos_cached_report_expenses");
        if (cachedExpenses) allExpenses = JSON.parse(cachedExpenses);
      }

      const offlineOrdersQueue = JSON.parse(localStorage.getItem("bb_pos_offline_orders_queue") || "[]");
      const offlineExpensesQueue = JSON.parse(localStorage.getItem("bb_pos_offline_expenses_queue") || "[]");

      const combinedOrders = [...offlineOrdersQueue, ...allOrders];
      const combinedExpenses = [...offlineExpensesQueue, ...allExpenses];

      const uniqueOrdersMap = new Map();
      combinedOrders.forEach(o => uniqueOrdersMap.set(o.billNumber || o.id, o));
      const finalOrders = Array.from(uniqueOrdersMap.values());

      // 👉 SAFE DATE PARSER (यह टूटी हुई डेट्स को फिक्स करेगा)
      const getSafeTime = (ts: any) => {
        if (!ts) return Date.now();
        if (ts.toDate) return ts.toDate().getTime();
        if (typeof ts === 'object' && ts.seconds) return ts.seconds * 1000;
        return new Date(ts).getTime();
      };

      const filteredOrders = finalOrders.filter((o: any) => {
        const timeMs = getSafeTime(o.timestamp);
        return timeMs >= startTarget.getTime() && timeMs <= endTarget.getTime();
      });
      setReportOrders(filteredOrders);

      const filteredExp = combinedExpenses.filter((exp: any) => {
        const timeMs = getSafeTime(exp.timestamp);
        return timeMs >= startTarget.getTime() && timeMs <= endTarget.getTime();
      });
      setDailyExpenses(filteredExp);

    } catch (err) {
      console.error(err);
      toast.error("रिपोर्ट लोड करने में समस्या आई!");
    } finally {
      setIsReportLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'reports') fetchReportData();
  }, [activeTab, reportFilter, customStartDate, customEndDate]);
 // Financial Summary: ONLY COMPLETED / SETTLED BILLS
  const reportSummary = useMemo(() => {
    let totalSale = 0;
    let cashSale = 0;
    let upiSale = 0;
    let dueSale = 0;
    let totalDiscount = 0; // 👉 NEW: छूट के लिए नया वेरिएबल
    let totalOrdersCount = 0;
    let unsettledTotal = 0;
    let unsettledCount = 0;

    reportOrders.forEach(o => {
      const amt = Number(o.total) || 0;
      if (o.status === 'completed') {
        totalOrdersCount++;
        totalSale += amt;
        
        // 👉 NEW: कूपन डिस्काउंट और पॉइंट्स डिस्काउंट दोनों को जोड़ें
        totalDiscount += (Number(o.discountAmount) || 0) + (Number(o.pointsRedeemed) || 0);

        if (o.paymentMethod === 'upi') {
          upiSale += amt;
        } else if (o.paymentMethod === 'due') {
          dueSale += amt;
        } else if (o.paymentMethod === 'split') {
          cashSale += Number(o.splitCashAmount || 0);
          upiSale += Number(o.splitUpiAmount || 0);
        } else {
          cashSale += amt;
        }
      } else if (o.status === 'unsettled' || (o.status === 'pending' && !o.paymentSettled)) {
        unsettledTotal += amt;
        unsettledCount++;
      }
    });

    const totalExpenseAmount = dailyExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    const netCashInDrawer = Math.max(0, cashSale - totalExpenseAmount);

    return { totalSale, cashSale, upiSale, dueSale, totalDiscount, totalOrdersCount, totalExpenseAmount, netCashInDrawer, unsettledTotal, unsettledCount };
  }, [reportOrders, dailyExpenses]);

// Item-wise Sales Report Calculation (With Category Logic)
  const itemWiseSales = useMemo(() => {
    const map: { [key: string]: { name: string, quantity: number, revenue: number, category: string } } = {};

    reportOrders.forEach((order) => {
      if (order.status === 'completed' && Array.isArray(order.items)) {
        order.items.forEach((item: PosCartItem) => {
          const key = item.name;
          if (!map[key]) {
            // 👉 प्रोडक्ट लिस्ट से उस आइटम की केटेगरी ढूँढें
            const matchedProduct = products.find(p => p.id === item.id);
            const cat = matchedProduct ? matchedProduct.category : 'Uncategorized';
            
            map[key] = { name: key, quantity: 0, revenue: 0, category: cat };
          }
          map[key].quantity += (Number(item.quantity) || 1);
          map[key].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
        });
      }
    });

    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [reportOrders, products]);

 // 👉 NEW: केटेगरी के आधार पर टेबल को फ़िल्टर करने का लॉजिक
  const filteredItemWiseSales = useMemo(() => {
    if (reportCategoryFilter === 'All') return itemWiseSales;
    return itemWiseSales.filter(item => item.category === reportCategoryFilter);
  }, [itemWiseSales, reportCategoryFilter]);

  // 👉 NEW: गोल चार्ट (Pie/Donut Chart) के लिए डायनामिक डेटा लॉजिक
  const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#f43f5e', '#14b8a6', '#84cc16'];
  
  const chartData = useMemo(() => {
    let data: any[] = [];
    if (reportCategoryFilter === 'All') {
      // 1. अगर 'All' है, तो कैटेगरी के हिसाब से सेल जोड़ें
      const catMap: any = {};
      itemWiseSales.forEach(item => {
        if (!catMap[item.category]) catMap[item.category] = 0;
        catMap[item.category] += item.revenue;
      });
      data = Object.keys(catMap).map(cat => ({ label: cat, value: catMap[cat] }));
    } else {
      // 2. अगर कोई कैटेगरी चुनी है, तो आइटम के हिसाब से सेल दिखाएँ
      data = filteredItemWiseSales.map(item => ({ label: item.name, value: item.revenue }));
    }
    
    // ज्यादा से कम की तरफ सॉर्ट करें
    data.sort((a, b) => b.value - a.value);
    
    // अगर 8 से ज्यादा आइटम हैं, तो बाकियों को "Others" में मिला दें ताकि चार्ट साफ दिखे
    if (data.length > 8) {
      const top8 = data.slice(0, 8);
      const othersVal = data.slice(8).reduce((sum, curr) => sum + curr.value, 0);
      top8.push({ label: 'Others', value: othersVal });
      data = top8;
    }
    return data;
  }, [itemWiseSales, filteredItemWiseSales, reportCategoryFilter]);
// 📊 DAILY SALES TREND (ग्राफ़ के लिए डायनामिक डेटा)
  const dailyTrendData = useMemo(() => {
    const dateMap: { [key: string]: { date: string, total: number, orders: number } } = {};
    const result = [];

    let start = new Date();
    let end = new Date();

   if (reportFilter === 'last7days') {
      start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    } else if (reportFilter === 'last30days') {
      start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    } else if (reportFilter === 'custom' && customStartDate && customEndDate) {
      const sParts = customStartDate.split('-');
      start = new Date(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]), 0, 0, 0, 0);
      const eParts = customEndDate.split('-');
      end = new Date(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]), 23, 59, 59, 999);
    } else if (reportFilter === 'yesterday') {
      start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
    } else {
      start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    }

    const loopStart = new Date(start);
    let safetyCounter = 0;
    while (loopStart <= end && safetyCounter < 100) {
      const dateStr = `${String(loopStart.getDate()).padStart(2, '0')} ${loopStart.toLocaleString('default', { month: 'short' })}`;
      const dayData = { date: dateStr, total: 0, orders: 0 };
      dateMap[dateStr] = dayData;
      result.push(dayData);
      loopStart.setDate(loopStart.getDate() + 1);
      safetyCounter++;
    }

    reportOrders.forEach(o => {
      if (o.status === 'completed') {
        // 👉 SAFE DATE LOGIC FOR OFFLINE
        let d: Date;
        if (o.timestamp?.toDate) { d = o.timestamp.toDate(); }
        else if (typeof o.timestamp === 'object' && o.timestamp.seconds) { d = new Date(o.timestamp.seconds * 1000); }
        else { d = new Date(o.timestamp || Date.now()); }
        
        const dateStr = `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}`;
        
        if (dateMap[dateStr]) {
          dateMap[dateStr].total += Number(o.total) || 0;
          dateMap[dateStr].orders += 1;
        }
      }
    });

    return result; 
  }, [reportOrders, reportFilter, customStartDate, customEndDate]);
  
  // Past Receipts Fetching
  const fetchPastReceipts = async () => {
    setIsReceiptsLoading(true);
    try {
      if (navigator.onLine) {
        // 👉 NEW: यहाँ से limit(...) पूरी तरह हटा दिया गया है ताकि 100% सारे बिल आ जाएँ!
        const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        setPastReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      toast.error("Failed to load receipts");
    } finally {
      setIsReceiptsLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'receipts') fetchPastReceipts();
  }, [activeTab, receiptsLimit]);

  const filteredPastReceipts = useMemo(() => {
    const qStr = receiptSearchQuery.trim().toLowerCase();
    const now = new Date();
    
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const yestStart = new Date(todayStart);
    yestStart.setDate(yestStart.getDate() - 1);
    const yestEnd = new Date(todayEnd);
    yestEnd.setDate(yestEnd.getDate() - 1);

   return pastReceipts.filter((o) => {
      // 🚫 रिजेक्टेड बिल पास्ट रसीद में भी नहीं दिखेंगे
      if (o.status === 'rejected' || o.status === 'cancelled') return false;

      const orderDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp || Date.now());
      if (receiptFilterDay === 'today') {
        if (orderDate < todayStart || orderDate > todayEnd) return false;
      } else if (receiptFilterDay === 'yesterday') {
        if (orderDate < yestStart || orderDate > yestEnd) return false;
      }

      if (!qStr) return true;
      const billNoMatch = String(o.billNumber || '').toLowerCase().includes(qStr);
      const phoneMatch = String(o.customerPhone || '').replace(/\D/g, '').includes(qStr);
      const nameMatch = String(o.customerName || '').toLowerCase().includes(qStr);
      const totalMatch = String(o.total || '').includes(qStr);

      return billNoMatch || phoneMatch || nameMatch || totalMatch;
    });
  }, [pastReceipts, receiptSearchQuery, receiptFilterDay]);

  // Keyboard Shortcuts Handler - FIXED FOR PERFORMANCE (Latest Ref Pattern)
  const handleKeyDownRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // यह वाला useEffect हर बार नया डेटा (State) ref में सेव करेगा, बिना DOM को छेड़े।
  useEffect(() => {
    handleKeyDownRef.current = (e: KeyboardEvent) => {
      if (!isLoggedIn) return;

      if (e.key === 'F1') { e.preventDefault(); setIsHelpModalOpen(prev => !prev); }
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('billing'); setTimeout(() => searchInputRef.current?.focus(), 80); }
      
      if (e.key === 'F3') { 
        e.preventDefault(); 
        if (cart.length > 0) { handleHoldCurrentCart(); } 
        else { setIsHeldCartsModalOpen(prev => !prev); } 
      }
      
      if (e.key === 'F4') { e.preventDefault(); setActiveTab('reports'); }
      
      if (e.key === 'F5') { 
        e.preventDefault(); 
        setActiveTab('billing'); 
        setTimeout(() => phoneInputRef.current?.focus(), 80); 
      }
      
      if (e.key === 'F6') { e.preventDefault(); setActiveTab('settlement'); }
      
      if (e.key === 'F7') { 
        e.preventDefault(); 
        if (fulfillmentType === 'table' && cart.length > 0 && !isSubmittingOrder) {
          handleSaveTableOrderKotOnly();
        } else if (fulfillmentType !== 'table') {
          toast.error("यह शॉर्टकट सिर्फ टेबल KOT के लिए है।");
        }
      }
      
      if (e.key === 'F8') { e.preventDefault(); setIsDiscountOpen(prev => !prev); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0 && !isSubmittingOrder) handleFinalCheckoutAndPrintBill(); }
      
      if (e.key === 'F10') { 
        e.preventDefault(); 
        setActiveTab('billing');
        setTimeout(() => document.getElementById('cashTenderedInput')?.focus(), 80);
      }
      
      if (e.key === 'F11') { e.preventDefault(); setActiveTab('customers'); }
      
      if (e.key === 'F12') { e.preventDefault(); setFulfillmentType(prev => prev === 'pickup' ? 'table' : prev === 'table' ? 'delivery' : 'pickup'); }

      if ((e.key === 'Delete' || (e.shiftKey && e.key === 'Backspace')) && document.activeElement?.tagName !== 'INPUT') {
        if (cart.length > 0) setCart([]);
      }
      
      if (e.key === 'Escape') {
        setIsHelpModalOpen(false);
        setIsHeldCartsModalOpen(false);
        setIsExpenseModalOpen(false);
        setIsVariationModalOpen(false);
        setIsReceiptModalOpen(false);
        setIsCustomerModalOpen(false);
        setIsItemEditorModalOpen(false);
        setIsCatManagerModalOpen(false);
        setShowNewCustForm(false);
        setTimeout(() => searchInputRef.current?.focus(), 60);
      }
    };
  }); // यहाँ कोई ब्रैकेट [] नहीं है, यह जानबूझकर किया है ताकि हमेशा ताज़ा डेटा मिले!

  // यह वाला useEffect सिर्फ़ 1 बार चलेगा और Event Listener (गार्ड) को कंप्यूटर से जोड़ेगा।
  useEffect(() => {
    const globalListener = (e: KeyboardEvent) => {
      if (handleKeyDownRef.current) {
        handleKeyDownRef.current(e); // यह वॉकी-टॉकी से हमेशा ताज़ा फंक्शन लेगा
      }
    };
    window.addEventListener('keydown', globalListener);
    return () => window.removeEventListener('keydown', globalListener);
  }, []); // खाली ब्रैकेट = यह 1 ही बार सेट होगा और कभी नहीं हटेगा!
 

  const filteredMenu = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    
    // 👉 NEW: '⭐ Top Items' (ज्यादा बिकने वाले) का लॉजिक
    if (selectedCategory === '⭐ Top Items') {
      const savedPop = JSON.parse(localStorage.getItem("bb_pos_item_popularity") || "{}");
      
      let topProducts = [...products].sort((a, b) => (savedPop[b.id] || 0) - (savedPop[a.id] || 0));
      topProducts = topProducts.filter(p => (savedPop[p.id] || 0) > 0).slice(0, 30);
      
      if (topProducts.length === 0) topProducts = products.slice(0, 24);

      return topProducts.filter((p) => {
        const matchesName = (p.name || '').toLowerCase().includes(queryStr);
        const matchesCode = p.itemCode && String(p.itemCode).toLowerCase().includes(queryStr);
        return matchesName || matchesCode;
      });
    }

    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesName = (p.name || '').toLowerCase().includes(queryStr);
      const matchesCode = p.itemCode && String(p.itemCode).toLowerCase().includes(queryStr);
      return matchesCategory && (matchesName || matchesCode);
    });
  
  
  }, [products, searchQuery, selectedCategory]); 
 const filteredInventoryProducts = useMemo(() => {
    const queryStr = inventorySearchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesName = (p.name || '').toLowerCase().includes(queryStr);
      const matchesCat = (p.category || '').toLowerCase().includes(queryStr);
      const matchesCode = p.itemCode && String(p.itemCode).toLowerCase().includes(queryStr);
      return matchesName || matchesCat || matchesCode;
    });
  }, [products, inventorySearchQuery]);

  // 👉 NEW: Filtered Raw Materials for Search
  const filteredRawMaterials = useMemo(() => {
    const queryStr = rawSearchQuery.toLowerCase().trim();
    if (!queryStr) return rawMaterials;
    return rawMaterials.filter(r => (r.name || '').toLowerCase().includes(queryStr));
  }, [rawMaterials, rawSearchQuery]);

 // ==========================================
  // 👉 NEW: EXCEL (CSV) IMPORT & EXPORT LOGIC
  // ==========================================

  // 1. Raw Materials Export / Template
  const handleExportRawCSV = () => {
    const headers = ["Name", "Unit", "CurrentStock", "LowStockAlert"];
    let csv = headers.join(",") + "\n";
    
    if (rawMaterials.length === 0) {
      // अगर डाटा नहीं है, तो टेम्पलेट के लिए 2 डमी रो (Dummy rows) दें
      csv += "Milk,Ltr,10,2\nPizza Base,Pcs,50,10\nCheese,Kg,5,1\n";
    } else {
      rawMaterials.forEach(r => {
        csv += `"${r.name}","${r.unit}",${r.stock},${r.lowAlert}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Raw_Materials_Template_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Excel Template Downloaded! 📥");
  };

  // 2. Raw Materials Import
  const handleImportRawCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRawExcelProcessing(true);
    const toastId = toast.loading("कच्चा माल अपलोड हो रहा है...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        
        if (rows.length < 2) throw new Error("File is empty or missing headers!");

        let batch = writeBatch(db);
        let updatedCount = 0;
        let addedCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
          if (cols.length < 4 || !cols[0]) continue;

          const name = cols[0];
          const unit = cols[1] || 'Kg';
          const stock = Number(cols[2]) || 0;
          const lowAlert = Number(cols[3]) || 5;

          // चेक करें कि क्या यह नाम पहले से मौजूद है?
          const existing = rawMaterials.find(r => r.name.toLowerCase() === name.toLowerCase());
          
          if (existing) {
            batch.update(doc(db, "raw_materials", existing.id), { stock, unit, lowAlert });
            updatedCount++;
          } else {
            const newRef = doc(collection(db, "raw_materials"));
            batch.set(newRef, { name, unit, stock, lowAlert, totalReceived: stock, totalConsumed: 0 });
            addedCount++;
          }
        }

        await batch.commit();
        toast.dismiss(toastId);
        toast.success(`${addedCount} नए जुड़े और ${updatedCount} अपडेट हुए! 🎉`);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("अपलोड फेल हो गया। कृपया सही फॉर्मेट चेक करें!");
      } finally {
        setIsRawExcelProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // 3. Menu Items Export / Template
  const handleExportMenuCSV = () => {
    const headers = ["ItemCode", "ItemName", "Category", "Price", "IsAvailable"];
    let csv = headers.join(",") + "\n";
    
    if (products.length === 0) {
      csv += "101,Aloo Tikki Burger,Burgers,50,TRUE\n102,Cold Coffee,Beverages,80,TRUE\n";
    } else {
      products.forEach(p => {
        csv += `"${p.itemCode || ''}","${p.name}","${p.category || 'General'}",${p.price},${p.isAvailable !== false ? 'TRUE' : 'FALSE'}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Menu_Items_Template_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Excel Template Downloaded! 📥");
  };

  // 4. Menu Items Import
  const handleImportMenuCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsMenuExcelProcessing(true);
    const toastId = toast.loading("मेनू आइटम अपलोड हो रहे हैं...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        if (rows.length < 2) throw new Error("File is empty!");

        let batch = writeBatch(db);
        let updatedCount = 0;
        let addedCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
          if (cols.length < 4 || !cols[1]) continue; // Name is mandatory

          const itemCode = cols[0];
          const name = cols[1];
          const category = cols[2] || 'General';
          const price = Number(cols[3]) || 0;
          const isAvailable = cols[4]?.toUpperCase() !== 'FALSE';

          // चेक करें कि क्या Item Code या Name मौजूद है?
          const existing = products.find(p => 
            (itemCode && p.itemCode === itemCode) || 
            (p.name.toLowerCase() === name.toLowerCase())
          );
          
          if (existing) {
            batch.update(doc(db, "products", existing.id), { name, category, price, isAvailable, itemCode });
            updatedCount++;
          } else {
            const newRef = doc(collection(db, "products"));
            batch.set(newRef, { name, itemCode, category, price, isAvailable, updatedAt: new Date() });
            addedCount++;
          }
        }

        await batch.commit();
        toast.dismiss(toastId);
        toast.success(`${addedCount} आइटम जुड़े और ${updatedCount} अपडेट हुए! 🎉`);
      } catch (err) {
        toast.dismiss(toastId);
        toast.error("अपलोड फेल हो गया!");
      } finally {
        setIsMenuExcelProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };
// 5. Recipe Mapping Export / Template
// ==========================================
  // 👉 NEW SMART MATRIX RECIPE EXCEL (आसान तरीका)
  // ==========================================

  // 5. Recipe Mapping Export (Matrix Format)
  const handleExportRecipeCSV = () => {
    if (rawMaterials.length === 0) {
      return toast.error("पहले कम से कम 1 कच्चा माल (Raw Material) ऐड करें!");
    }

    // ऊपर की हेडिंग्स (सारे कच्चे माल के नाम)
    const rawHeaders = rawMaterials.map(rm => `${rm.name} (${rm.unit})`);
    const baseHeaders = ["Item_Code", "Item_Name", "Variant_Size"];
    let csv = [...baseHeaders, ...rawHeaders].join(",") + "\n";

    if (products.length === 0) {
      // डमी रो अगर मेनू खाली है
      let emptyRow = `"101","Sample Burger","All"`;
      rawHeaders.forEach(() => emptyRow += `,0`);
      csv += emptyRow + "\n";
    } else {
      products.forEach(p => {
        // अगर आइटम में साइज़ (Half/Full) हैं, तो हर साइज़ के लिए अलग लाइन बनेगी
        let variantsToList = ['All'];
        if (p.variants && Object.keys(p.variants).length > 0) {
          variantsToList = Object.keys(p.variants);
        }

        variantsToList.forEach(vName => {
          let row = [
            `"${p.itemCode || ''}"`,
            `"${p.name.replace(/"/g, '""')}"`, // नाम में अगर कोमा/कोटेशन हो तो सेफ करना
            `"${vName}"`
          ];

          // हर कच्चे माल के लिए चेक करें कि क्या वो इस आइटम में डला है?
          rawMaterials.forEach(rm => {
            let qty = 0;
            if (p.recipe) {
              // 'All' वाला माल भी उठाएं और इस खास साइज़ (Half/Full) वाला भी
              const matched = p.recipe.find((r: any) => r.rawId === rm.id && (r.variant === vName || r.variant === 'All'));
              if (matched) qty = matched.qty;
            }
            // 👉 FIX: qty (नंबर) को String() में लपेट दिया है ताकि TypeScript एरर न दे
            row.push(String(qty)); 
          });

          csv += row.join(",") + "\n";
        });
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Smart_Recipe_Mapping_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("आसान Recipe Excel डाउनलोड हो गई! 📥");
  };

  // 6. Recipe Mapping Import (Matrix Format)
  const handleImportRecipeCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRecipeExcelProcessing(true);
    const toastId = toast.loading("रेसिपी (Recipe) अपडेट हो रही है...");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        if (rows.length < 2) throw new Error("File empty");

        const headers = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/"/g, '').trim());
        
        // कॉलम नंबर से कच्चा माल (Raw Material) को पहचानें
        const rawCols: { colIndex: number, rawItem: any }[] = [];
        for (let c = 3; c < headers.length; c++) {
          let hName = headers[c];
          let rawName = hName.split(' (')[0].trim().toLowerCase(); // "Milk (Ltr)" -> "milk"
          let rawItem = rawMaterials.find(r => r.name.toLowerCase() === rawName);
          if (rawItem) {
            rawCols.push({ colIndex: c, rawItem });
          }
        }

        const productUpdates: { [prodId: string]: any[] } = {};

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, '').trim());
          const itemCode = cols[0];
          const itemName = cols[1];
          const variantSize = cols[2] || 'All';

          // मेनू आइटम ढूँढें
          const product = products.find(p => (itemCode && p.itemCode === itemCode) || p.name.toLowerCase() === itemName.toLowerCase());
          if (!product) continue;

          // अगर पहली बार इस प्रोडक्ट की लाइन पढ़ रहे हैं, तो पुरानी रेसिपी डिलीट करने के लिए खाली ऐरे (Array) बनाएँ
          if (!productUpdates[product.id]) productUpdates[product.id] = [];

          // अब हर कच्चे माल के कॉलम में देखें
          rawCols.forEach(rc => {
             let val = Number(cols[rc.colIndex]?.replace(/,/g, '')) || 0;
             if (val > 0) {
               // अगर बॉक्स में 0 से ज्यादा कुछ लिखा है, तो उसे रेसिपी में जोड़ दें
               productUpdates[product.id].push({
                 rawId: rc.rawItem.id,
                 name: rc.rawItem.name,
                 qty: val,
                 unit: rc.rawItem.unit,
                 variant: variantSize
               });
             }
          });
        }

        let batch = writeBatch(db);
        let updatedCount = 0;

        for (const [prodId, recipeArr] of Object.entries(productUpdates)) {
          batch.update(doc(db, "products", prodId), { recipe: recipeArr });
          updatedCount++;
        }

        await batch.commit();
        toast.dismiss(toastId);
        toast.success(`${updatedCount} आइटम्स में नई रेसिपी सेट हो गई! 🎉`);
      } catch(e) {
        toast.dismiss(toastId);
        toast.error("अपलोड फेल हो गया! कृपया टेम्पलेट में बदलाव न करें।");
      } finally {
        setIsRecipeExcelProcessing(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const mainClass = "h-screen w-screen flex font-sans antialiased overflow-hidden " + (themeMode === "dark" ? "dark bg-[#121212] text-neutral-100" : "bg-[#f4f5f7] text-neutral-900");

  return (
    <div className={mainClass}>
      <Toaster position="top-right" />

      {/* TERMINAL LOCK / LOGIN */}
      {!isLoggedIn ? (
        <div className="fixed inset-0 bg-neutral-950 text-white flex flex-col items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-10 shadow-2xl space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><SafeLock size={36} /></div>
              <h1 className="text-2xl font-black uppercase text-yellow-500 tracking-wider">BUM BUM CAFE - PC POS</h1>
              <p className="text-xs text-neutral-400">Desktop Terminal Locked • Enter Staff PIN</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (navigator.onLine) {
                  const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput.trim())));
                  if (!snap.empty) {
                    const uDoc = snap.docs[0].data();
                    setIsLoggedIn(true);
                    setCurrentUser({ id: snap.docs[0].id, ...uDoc });
                    localStorage.setItem("bb_pos_user_pc", JSON.stringify({ id: snap.docs[0].id, ...uDoc }));
                    toast.success(`Welcome, ${uDoc.name}!`);
                    setTimeout(() => searchInputRef.current?.focus(), 150);
                    return;
                  }
                }
               // 👉 NEW: Admin vs Staff Login Logic
                if (pinInput.trim() === '9999') {
                  const adminUser = { name: 'Admin (Owner)', role: 'admin', pin: '9999' };
                  setIsLoggedIn(true);
                  setCurrentUser(adminUser);
                  localStorage.setItem("bb_pos_user_pc", JSON.stringify(adminUser)); // 👉 FIX: ब्राउज़र में सेव कर दिया
                  toast.success("Welcome Admin! (Full Access) 👑");
                  setTimeout(() => searchInputRef.current?.focus(), 150);
                  return;
                }
                if (pinInput.trim() === '1234' || pinInput.trim() === '0000') {
                  const staffUser = { name: 'Staff (Cashier)', role: 'cashier', pin: pinInput.trim() };
                  setIsLoggedIn(true);
                  setCurrentUser(staffUser);
                  localStorage.setItem("bb_pos_user_pc", JSON.stringify(staffUser)); // 👉 FIX: ब्राउज़र में सेव कर दिया
                  toast.success("Unlocked Terminal (Staff Mode)!");
                  setTimeout(() => searchInputRef.current?.focus(), 150);
                  return;
                }
                toast.error("Incorrect PIN!");
              } catch (err) {
                toast.error("Login verification failed");
              }
              setPinInput('');
            }} className="space-y-4">
              <input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter PIN" className="w-full bg-neutral-950 border border-neutral-800 text-center text-3xl font-mono py-4 rounded-2xl outline-none text-orange-400 tracking-widest" autoFocus />
              <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-sm uppercase rounded-2xl tracking-wider transition-all shadow-lg">Unlock Terminal</button>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          {/* SIDEBAR NAVIGATION */}
          <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-800 flex flex-col justify-between p-4 shrink-0 select-none h-full transition-all duration-300 relative`}>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute -right-3 top-7 bg-orange-600 text-white p-1 rounded-full shadow-md hover:bg-orange-500 transition-all z-20">
              {isSidebarCollapsed ? <SafeChevronRight size={14} /> : <SafeChevronLeft size={14} />}
            </button>

            <div className="space-y-6 overflow-hidden">
              <div className="flex items-center justify-between border-b border-neutral-300 dark:border-neutral-800 pb-4">
                <div className="flex items-center gap-3 truncate">
                  <SafeDatabase className="text-orange-500 shrink-0" size={22} />
                  {!isSidebarCollapsed && (
                    <div className="truncate">
                      <h1 className="text-xs font-black uppercase text-orange-600 dark:text-yellow-500 truncate">Bum Bum Cafe</h1>
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold">POS Pro v4.4</span>
                    </div>
                  )}
                </div>
              </div>

             <nav className="space-y-1.5">
                {[
                  { id: 'billing', label: 'Counter [F2]', icon: ShoppingBag },
                  { id: 'orders', label: `Live Orders (${activeLiveOrders.length})`, icon: Clock },
                  { id: 'settlement', label: `Daily Bills (${unsettledOrdersCount})`, icon: Receipt },
                  { id: 'tables', label: `Tables (${activeTableOrders.length})`, icon: LayoutGrid },
                  { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true }, // 👈 सिर्फ एडमिन के लिए
                  { id: 'inventory', label: 'Menu & Stock', icon: Layers },
                  { id: 'receipts', label: 'Past Receipts', icon: Printer },
                  { id: 'reports', label: 'Reports & Sales', icon: SafeBarChart3 },
                  { id: 'udhari', label: 'Udhari (उधार)', icon: SafeFileText },
                  { id: 'customers', label: 'Customers Profile', icon: SafeUserPlus },
                ].filter((item: any) => !item.adminOnly || currentUser?.role === 'admin').map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => { triggerBeep('tap'); setActiveTab(item.id as any); }} 
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${isActive ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" : "text-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon size={16} className="shrink-0" />
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                     {!isSidebarCollapsed && item.id === 'settlement' && unsettledOrdersCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{unsettledOrdersCount}</span>
                      )}
                      {!isSidebarCollapsed && item.id === 'tables' && activeTableOrders.length > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black">{activeTableOrders.length}</span>
                      )}
                      
                      {/* 👉 NEW: Live Online Orders Badge (ऑनलाइन आर्डर का चमकता हुआ बैज) */}
                      {!isSidebarCollapsed && item.id === 'orders' && activeLiveOrders.length > 0 && (
                        <span className="bg-cyan-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-bounce shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                          {activeLiveOrders.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {!isSidebarCollapsed && (
                <div className="pt-2 border-t border-neutral-300 dark:border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase text-neutral-500">POS Tools</span>
                    <button onClick={() => setIsHelpModalOpen(true)} className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1">
                      <SafeHelpCircle size={12} /> Help [F1]
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => setIsHeldCartsModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-800 p-2 rounded-xl text-[10px] font-bold flex items-center gap-1 text-neutral-800 dark:text-white">
                      <SafePauseCircle size={13} className="text-amber-500 shrink-0" />
                      <span className="truncate">Parked ({heldCarts.length})</span>
                    </button>
                    <button onClick={() => setIsExpenseModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-800 p-2 rounded-xl text-[10px] font-bold flex items-center gap-1 text-neutral-800 dark:text-white">
                      <Receipt size={13} className="text-red-500 shrink-0" />
                      <span className="truncate">Expense [F6]</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5 pt-3 border-t border-neutral-300 dark:border-neutral-800">
             <button 
  onClick={async () => { await syncOfflineAll(true); }} 
  disabled={isSyncing} 
  className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-black uppercase transition-colors duration-300 ${
    syncSuccess 
      ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
      : 'text-amber-700 dark:text-yellow-500 bg-amber-500/15 hover:bg-amber-500/25'
  }`}
>
  {isSyncing ? <Loader2 className="animate-spin shrink-0" size={13} /> : (syncSuccess ? <Check size={13} /> : <SafeRefreshCw size={13} />)}
  {!isSidebarCollapsed && <span className="truncate">{syncSuccess ? 'Synced Data ✅' : 'Sync Cloud'}</span>}
</button>
              <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); localStorage.removeItem("bb_pos_user_pc"); }} className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[10px] font-black uppercase text-red-600 bg-red-500/15 hover:bg-red-500/25 transition-colors">
                <SafeLogOut size={13} className="shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Lock Terminal</span>}
              </button>
            </div>
          </aside>

          {/* MAIN WORKSPACE */}
          <main className="flex-1 flex h-full overflow-hidden">
            
            {/* TAB 1: COUNTER BILLING */}
            {activeTab === 'billing' && (
              <div className="flex-1 flex h-full overflow-hidden">
                <div className="flex-1 flex flex-col p-4 h-full overflow-hidden">
                  
                  {/* RUNNING TABLE INDICATOR BANNER */}
                  {activeEditingOrderId && (
                    <div className="mb-2 bg-amber-500/20 border border-amber-500 p-2.5 rounded-xl flex items-center justify-between shrink-0 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-black uppercase">
                        <SafeEdit3 size={16} />
                        <span>🪑 Table {tableNumber} (Active Bill #{activeEditingBillNumber}) - Running Order Active</span>
                      </div>
                      <button onClick={() => { setActiveEditingOrderId(null); setActiveEditingBillNumber(null); setActiveEditingOriginalItems([]); setCart([]); }} className="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white text-xs font-bold underline">
                        Exit Table (Clear)
                      </button>
                    </div>
                  )}

                  {/* SEARCH BAR (F2) & QUICK ACTIONS */}
                  <div className="flex gap-2.5 mb-2.5 items-center shrink-0">
                    <div className="relative flex-1">
                      <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Search item / Type Code or Qty*Code (e.g. 101 or 3*101) & hit [Enter]... [F2]" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchInputKeyDown} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-orange-500 shadow-sm" 
                        autoFocus
                      />
                    </div>
                    <button 
                      onClick={() => setIsCatManagerModalOpen(true)} 
                      className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700 shrink-0"
                    >
                      <ArrowLeftRight size={14} className="text-orange-500" /> Reorder Cats
                    </button>
                    <button 
                      onClick={() => handleOpenItemEditor(null)} 
                      className="bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow shrink-0"
                    >
                      <SafePlus size={15} /> Add Item
                    </button>
                  </div>

                  {/* CATEGORIES BAR */}
                  <div className="flex flex-wrap gap-1.5 pb-2 shrink-0 max-h-24 overflow-y-auto pr-1">
                    {['⭐ Top Items', ...categories].map((cat) => {
                      const isSelected = selectedCategory === cat;
                      const count = cat === 'All' ? products.length : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
                      return (
                        <button 
                          key={cat}
                          onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} 
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 shadow-sm ${
                            isSelected 
                              ? "bg-orange-600 text-white border-orange-600 shadow-md scale-[1.02]" 
                              : "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700"
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${isSelected ? 'bg-black/30 text-white' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* PRODUCTS GRID (100% Guaranteed Name & Price Display with Fixed 82px Image Height) */}
                  {loading ? (
                    <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2.5 overflow-y-auto flex-1 pr-1.5 content-start">
                      {filteredMenu.map((item) => {
                        const isAvail = item.isAvailable !== false;
                        const imgUrl = item.image || item.imageUrl || item.img;
                        const displayName = item.name || item.title || item.itemName || "Cafe Item";
                        const displayPrice = Number(item.price) || (item.variants && Object.values(item.variants)[0]) || 0;

                        return (
                          <button 
                            key={item.id} 
                            disabled={!isAvail} 
                            onClick={() => handleItemClick(item)} 
                            className={`border rounded-2xl text-left flex flex-col overflow-hidden h-[155px] min-h-[155px] transition-all duration-150 hover:scale-[1.02] active:scale-95 shadow-sm relative ${
                              isAvail 
                                ? "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 hover:border-orange-500" 
                                : "opacity-40 bg-neutral-200 dark:bg-neutral-950 pointer-events-none"
                            }`}
                          >
                           <div className="w-full h-[82px] max-h-[82px] min-h-[82px] bg-neutral-200 dark:bg-neutral-800 relative shrink-0 overflow-hidden flex items-center justify-center">
                              {imgUrl ? (
                                <>
                                  <img 
                                    src={imgUrl} 
                                    alt={displayName} 
                                    className="w-full h-full object-cover absolute inset-0 z-10" 
                                    loading="lazy" 
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                                  />
                                  <span className="text-neutral-500 text-[10px] font-black uppercase tracking-wider px-2 text-center absolute inset-0 flex items-center justify-center z-0">
                                    {item.category || "Cafe Item"}
                                  </span>
                                </>
                              ) : (
                                <span className="text-neutral-500 text-[10px] font-black uppercase tracking-wider px-2 text-center absolute inset-0 flex items-center justify-center">
                                  {item.category || "Cafe Item"}
                                </span>
                              )}
                              {item.itemCode && (
                                <span className="absolute top-1 right-1 bg-black/90 text-yellow-400 font-mono text-[9px] font-black px-1.5 py-0.5 rounded border border-yellow-500/50 shadow z-10">
                                  #{item.itemCode}
                                </span>
                              )}
                            </div>

                            <div className="p-2 flex-1 flex flex-col justify-between w-full bg-white dark:bg-neutral-900 min-h-[65px]">
                              <p className="font-bold text-[11px] line-clamp-2 text-neutral-900 dark:text-white leading-tight">
                                {displayName}
                              </p>
                              <div className="flex justify-between items-center pt-1 border-t border-neutral-100 dark:border-neutral-800">
                                <span className="text-xs font-mono font-black text-orange-600 dark:text-orange-400">
                                  ₹{displayPrice}
                                </span>
                                <span className="text-[8px] font-bold text-neutral-500 truncate max-w-[70px]">
                                  {item.category || 'General'}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
{/* RIGHT CART PANEL */}
                <div className="w-96 bg-white dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 flex flex-col p-3 h-full shadow-2xl justify-between overflow-hidden">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-300 dark:border-neutral-800 pb-2 mb-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase text-orange-600 dark:text-orange-500">Cart ({cart.length})</h3>
                        <button onClick={handleHoldCurrentCart} title="Park Cart [F3]" className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 rounded-md border border-amber-500/40 flex items-center gap-1">
                          <SafePauseCircle size={11} /> Hold [F3]
                        </button>
                      </div>
                      <button onClick={() => { setCart([]); setCartCustSearchInput(''); }} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"><SafeTrash2 size={13} /> Clear [Del]</button>
                    </div>

                    {/* 👉 NEW: DYNAMIC CUSTOMER SEARCH (NAME OR NUMBER) & REDEEM SECTION */}
                    <div className="bg-neutral-100 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 mb-2 shrink-0 space-y-2 relative">
                      <div className="flex gap-1.5 relative">
                        {/* 👉 NEW: यहाँ ref={custDropdownRef} जोड़ा गया है ताकि बाहर का क्लिक पहचाना जा सके */}
                        <div className="relative flex-1" ref={custDropdownRef}>
                          <input 
  ref={phoneInputRef}
                            type="text"
                            placeholder="ग्राहक का नाम या मोबाइल नंबर..." 
                            value={cartCustSearchInput} 
                            onChange={e => handleCustomerSearchChange(e.target.value)} 
                            onFocus={() => { 
                              // 👉 Focus होने पर अगर इनपुट खाली है, तो Recent लिस्ट खोलें
                              if (!cartCustSearchInput && recentCartCustomers.length > 0) {
                                const enrichedRecents = recentCartCustomers.map(rc => {
                                  const fullCust = allCustomers.find(c => c.phone === rc.phone || c.id === rc.phone);
                                  return fullCust || rc;
                                });
                                setCustSuggestions(enrichedRecents);
                                setShowCustDropdown(true);
                              } else if (custSuggestions.length > 0) {
                                setShowCustDropdown(true); 
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showCustDropdown && custSuggestions.length > 0) {
                                  handleSelectDropdownCustomer(custSuggestions[0]); 
                                } else if (customerPhone.length === 10) {
                                  setShowCustDropdown(false);
                                  searchCustomerByExactPhone(customerPhone); 
                                }
                              }
                            }}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white outline-none font-bold placeholder:font-normal placeholder:text-neutral-400" 
                          />
                          
                          {/* कट (X) बटन ताकि नया नाम डाल सकें */}
                          {cartCustSearchInput && (
                            <button onClick={() => { 
                              setCartCustSearchInput(''); 
                              setCustomerPhone(''); 
                             setCustomerName(''); 
                              setCustomerGamePoints(0); // 👉 NEW
                              setShowCustDropdown(false);
                              setShowNewCustForm(false); 
                              
                              // 👉 क्रॉस दबाते ही रिसेंट लिस्ट खोल दें
                              if (recentCartCustomers.length > 0) {
                                const enrichedRecents = recentCartCustomers.map(rc => {
                                  const fullCust = allCustomers.find(c => c.phone === rc.phone || c.id === rc.phone);
                                  return fullCust || rc;
                                });
                                setCustSuggestions(enrichedRecents);
                                setShowCustDropdown(true);
                              }
                              setTimeout(() => phoneInputRef.current?.focus(), 50);
                            }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-red-500 transition-colors">
                               <X size={14} />
                            </button>
                          )}
                          
                          {/* 👉 DROPDOWN LIST (हवा में लटकती हुई) */}
                          {showCustDropdown && custSuggestions.length > 0 && (
                             <div className="absolute top-[110%] left-0 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-2xl z-[100] max-h-56 overflow-y-auto">
                                
                                {/* 👉 रिसेंट लिस्ट के लिए छोटा सा हेडर */}
                                {!cartCustSearchInput && (
                                   <div className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 text-[9px] font-black uppercase text-neutral-500 sticky top-0">
                                     🕒 Recent Customers (आखिरी 10)
                                   </div>
                                )}

                                {custSuggestions.map((cust, idx) => (
                                    <div key={idx} onClick={() => handleSelectDropdownCustomer(cust)} className="p-2.5 border-b border-neutral-100 dark:border-neutral-800 hover:bg-orange-50 dark:hover:bg-orange-500/20 cursor-pointer flex justify-between items-center transition-colors">
                                        <div>
                                            <p className="font-black text-xs text-neutral-900 dark:text-white leading-none">{cust.name || 'Walk-in Guest'}</p>
                                            <p className="font-mono text-[10px] text-neutral-500 mt-1">📞 {cust.phone}</p>
                                        </div>
                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-1 rounded-md font-black border border-amber-200 dark:border-amber-500/30">
                                          ⭐ {cust.points || 0}
                                        </span>
                                    </div>
                                ))}
                             </div>
                          )}
                        </div>
                        
                        {/* अगर लिस्ट में न मिले, तो नया बनाने का बटन */}
                        <button 
                          type="button" 
                          onClick={() => {
                             setShowCustDropdown(false);
                             searchCustomerByExactPhone(customerPhone);
                          }} 
                          className="bg-orange-600 hover:bg-orange-500 text-white px-3 rounded-lg text-[10px] font-black uppercase shadow-sm shrink-0"
                        >
                          नया जोड़ें
                        </button>
                        
                        {/* 🎰 गेम चेक करने का क्विक बटन */}
                        <button 
                          type="button"
                          onClick={() => {
                            setGameSearchInput(customerPhone || cartCustSearchInput);
                            if (customerPhone.length === 10) handleVerifyGameCode(customerPhone);
                            setIsGameVerifyModalOpen(true);
                          }} 
                          title="गेम इनाम चेक करें" 
                          className="bg-purple-600 hover:bg-purple-500 text-white px-2.5 rounded-lg text-xs font-bold flex items-center shrink-0 shadow-sm"
                        >
                          🎰
                        </button>

                        <button onClick={() => handleSendWhatsAppBill()} title="Send WhatsApp Receipt [F7]" className="bg-green-600/15 hover:bg-green-600/25 text-green-600 px-2.5 rounded-lg text-xs font-bold flex items-center shrink-0">
                          <SafeShare2 size={13} />
                        </button>
                      </div>

                     {/* CUSTOMER FOUND: FULL PROFILE & LOYALTY POINTS REDEEM */}
                      {customerPhone.length === 10 && customerName && !showNewCustForm && (
                        <div className="bg-white dark:bg-neutral-900 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs space-y-1.5">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-neutral-900 dark:text-white">👤 {customerName}</span>
                            <div className="flex flex-col items-end gap-0.5">
                              {customerPoints > 0 && <span className="text-amber-600 dark:text-amber-400 font-mono font-black text-[11px]">⭐ {customerPoints} Loyalty</span>}
                              {customerGamePoints > 0 && <span className="text-purple-600 dark:text-purple-400 font-mono font-black text-[11px]">🎰 {customerGamePoints} Game</span>}
                              {(customerPoints === 0 && customerGamePoints === 0) && <span className="text-neutral-400 font-mono font-black text-[11px]">0 Pts</span>}
                            </div>
                          </div>
                          {address && <p className="text-[10px] text-neutral-500 truncate">📍 {address}</p>}

                          {(customerPoints + customerGamePoints) > 0 ? (
                            <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                रिडीम (1 Pt = ₹1):
                              </span>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" 
                                  min={1} 
                                  max={customerPoints + customerGamePoints}
                                  value={pointsToRedeem || ''}
                                  onChange={e => setPointsToRedeem(Math.min(Number(e.target.value), customerPoints + customerGamePoints))}
                                  placeholder="Pts"
                                  className="w-14 bg-neutral-100 dark:bg-neutral-800 border rounded p-1 text-center font-mono text-xs font-bold" 
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (!isRedeemingPoints && pointsToRedeem > 0) {
                                      setIsRedeemingPoints(true);
                                      toast.success(`₹${pointsToRedeem} पॉइंट्स छूट लागू हुई!`);
                                    } else {
                                      setIsRedeemingPoints(false);
                                      setPointsToRedeem(0);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                    isRedeemingPoints ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'
                                  }`}
                                >
                                  {isRedeemingPoints ? 'हटाएं' : 'लागू करें'}
                                </button>
                              </div>
                            </div>
                         ) : (
                            <p className="text-[10px] text-neutral-400 italic">इस ग्राहक के पास अभी कोई रिडीम पॉइंट नहीं हैं।</p>
                          )}

                         
                        </div>
                      )}

                      {/* NEW CUSTOMER REGISTRATION FORM */}
                      {/* NEW CUSTOMER REGISTRATION FORM */}
                      {showNewCustForm && (
                        <div className="space-y-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-800">
                          <p className="text-[10px] text-amber-600 font-black uppercase">नया ग्राहक! नाम लिखकर [Enter] दबाएँ:</p>
                          <input 
                            ref={newCustNameRef}
                            type="text" 
                            placeholder="Customer Name *" 
                            value={newCustNameInput} 
                            onChange={e => setNewCustNameInput(e.target.value.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))}
                            onKeyDown={e => e.key === 'Enter' && newCustAddressRef.current?.focus()}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 text-xs outline-none" 
                          />
                          <input 
                            ref={newCustAddressRef}
                            type="text" 
                            placeholder="Address (Optional)" 
                            value={newCustAddressInput} 
                            onChange={e => setNewCustAddressInput(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSaveNewCustomerQuick()}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-2 py-1.5 text-xs outline-none" 
                          />
                          <button 
                            type="button" 
                            onClick={handleSaveNewCustomerQuick} 
                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase rounded-lg shadow-sm"
                          >
                            Save Customer
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CART ITEMS LIST */}

                    {/* CART ITEMS LIST */}
                    <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 mb-2">
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-xs text-center py-8">
                          <ShoppingBag size={28} className="mb-2 opacity-40" />
                          <p className="font-bold">Cart is empty. Type code or click item.</p>
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.cartItemId} className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-2 rounded-xl flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate text-neutral-900 dark:text-white">{item.name}</p>
                              {item.note && <p className="text-[9px] text-neutral-600 dark:text-neutral-400 italic truncate">{item.note}</p>}
                              <p className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-black">₹{item.price * item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => handleUpdateCartQuantity(item.cartItemId, -1)} className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded flex items-center justify-center font-black text-xs">-</button>
                              <span className="w-5 text-center text-xs font-mono font-black text-neutral-900 dark:text-white">{item.quantity}</span>
                              <button onClick={() => handleUpdateCartQuantity(item.cartItemId, 1)} className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded flex items-center justify-center font-black text-xs">+</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

             
{/* FULFILLMENT MODE & 6 TABLE SELECTOR */}
<div className="space-y-1.5 mb-2 shrink-0 border-t border-neutral-300 dark:border-neutral-800 pt-1.5">
  <div className="grid grid-cols-3 gap-1 bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl">
    {(['pickup', 'table', 'delivery'] as const).map((type) => (
      <button 
        key={type} 
        onClick={() => { 
          triggerBeep('tap'); 
          setFulfillmentType(type); 
          // बदलाव: अब 'delivery' पर क्लिक करने से अपने-आप टिक नहीं होगा।
          // अगर हम 'pickup' या 'table' पर जाते हैं, तो पुराना टिक हट जाएगा (सेफ्टी के लिए)।
          if (type !== 'delivery') setApplyDeliveryFee(false);
        }} 
        className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all ${fulfillmentType === type ? "bg-orange-600 text-white shadow" : "text-neutral-700 dark:text-neutral-300"}`}
      >
        {type}
      </button>
    ))}
  </div>

                      {fulfillmentType === 'table' && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-1.5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase text-amber-800 dark:text-amber-300">
                            <span>Table: {tableNumber}</span>
                          </div>
                          <div className="grid grid-cols-6 gap-1">
                          {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map((tName, idx) => {
                            const isTableOccupied = activeTableOrders.some(o => o.tableNumber === tName);
                            return (
                              <button 
                                key={tName}
                                type="button"
                                onClick={() => { 
                                  triggerBeep('tap'); 
                                  if (isTableOccupied && !activeEditingOrderId) {
                                    toast.error(`${tName} पर पहले से एक बिल चल रहा है! कृपया 'Tables' टैब में जाकर उसमें आइटम जोड़ें। 🪑`, { duration: 4000 });
                                    return; 
                                  }
                                  setTableNumber(tName); 
                                }}
                                className={`py-1 rounded text-[9px] font-black uppercase border ${tableNumber === tName ? 'bg-amber-500 text-black border-amber-600 shadow' : 'bg-white dark:bg-neutral-800'} ${isTableOccupied && !activeEditingOrderId ? 'opacity-50 cursor-not-allowed border-red-500' : ''}`}
                              >
                                T{idx + 1}
                              </button>
                            );
                          })}
                          </div>
                        </div>
                      )}

                      {/* नया कोड: डिलीवरी चार्ज इनपुट बॉक्स */}
                      {fulfillmentType === 'delivery' && (
                        <div className="bg-blue-500/10 border border-blue-500/30 p-1.5 rounded-xl">
                          <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="checkbox" 
                                id="deliveryFeeCheck" 
                                checked={applyDeliveryFee} 
                                onChange={e => setApplyDeliveryFee(e.target.checked)} 
                                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer" 
                              />
                              <label htmlFor="deliveryFeeCheck" className="text-[10px] font-black uppercase text-blue-800 dark:text-blue-400 cursor-pointer">
                                Delivery Charge
                              </label>
                            </div>
                            {applyDeliveryFee && (
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-400">₹</span>
                                <input 
                                  type="number" 
                                  min={0}
                                  value={customDeliveryFee} 
                                  onChange={e => setCustomDeliveryFee(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-14 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5 text-xs font-mono font-bold outline-none text-center" 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* COLLAPSIBLE DISCOUNT & ADMIN PROMO CODE SECTION [F8] */}
                    <div className="mb-2 shrink-0">
                      {!isDiscountOpen ? (
                        <button 
                          type="button" 
                          onClick={() => setIsDiscountOpen(true)}
                          className="w-full flex justify-between items-center py-1.5 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-black uppercase text-neutral-700 dark:text-neutral-300 transition-all shadow-sm"
                        >
                          <span className="flex items-center gap-1.5">
                            <Tag size={12} className="text-orange-500" />
                            <span>Add Coupon / Discount (छूट) [F8]</span>
                          </span>
                          {discountValue > 0 ? (
                            <span className="font-mono text-orange-600 dark:text-orange-400 font-black">
                              -₹{getCalculatedDiscountAmount()} {appliedPromoName && `(${appliedPromoName})`}
                            </span>
                          ) : (
                            <ChevronDown size={14} className="text-neutral-400" />
                          )}
                        </button>
                      ) : (
                        <div className="space-y-2 bg-neutral-100 dark:bg-neutral-800/60 p-2.5 rounded-xl border border-orange-500/50">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                              <Ticket size={11} className="text-orange-500" /> Coupon / Discount (छूट)
                            </span>
                            <button type="button" onClick={() => setIsDiscountOpen(false)} className="text-neutral-400 p-0.5">
                              <ChevronUp size={14} />
                            </button>
                          </div>

                          <div className="flex gap-1.5">
                            <input 
                              type="text" 
                              placeholder="Coupon Code (e.g. CAFE10, BUM50)" 
                              value={promoCouponInput}
                              onChange={e => setPromoCouponInput(e.target.value)}
                              className="flex-1 bg-white dark:bg-neutral-900 border rounded-lg px-2.5 py-1 text-xs font-mono font-bold uppercase text-neutral-900 dark:text-white outline-none" 
                            />
                            <button 
                              type="button" 
                              onClick={handleApplyPromoCoupon} 
                              className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-black uppercase"
                            >
                              Apply
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-300 dark:border-neutral-700">
                            <div className="flex bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-lg border">
                              <button type="button" onClick={() => setDiscountType('amount')} className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${discountType === 'amount' ? 'bg-orange-600 text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>₹ Flat</button>
                              <button type="button" onClick={() => setDiscountType('percentage')} className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${discountType === 'percentage' ? 'bg-orange-600 text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>% Off</button>
                            </div>
                            <input 
                              type="number" 
                              min={0}
                              placeholder="Value"
                              value={discountValue || ''}
                              onChange={e => { setDiscountValue(Number(e.target.value)); setAppliedPromoName(null); }}
                              className="w-full bg-white dark:bg-neutral-900 border rounded-lg px-2 py-1 text-xs text-neutral-900 dark:text-white outline-none font-mono font-bold" 
                            />
                            {discountValue > 0 && (
                              <button type="button" onClick={() => { setDiscountValue(0); setAppliedPromoName(null); }} className="text-red-500 text-xs font-black px-1.5 py-1 bg-red-500/10 rounded-lg shrink-0">Clear</button>
                            )}
                          </div>

                          {/* 📦 PACKING CHARGE SECTION (डिस्काउंट के अंदर ही) */}
                          <div className="pt-2 border-t border-neutral-300 dark:border-neutral-700 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="checkbox" 
                                id="packingChargeCheck" 
                                checked={applyPackingCharge} 
                                onChange={e => setApplyPackingCharge(e.target.checked)} 
                                className="w-3.5 h-3.5 accent-orange-600 cursor-pointer" 
                              />
                              <label htmlFor="packingChargeCheck" className="text-[10px] font-black uppercase text-neutral-800 dark:text-neutral-200 cursor-pointer flex items-center gap-1">
                                📦 Packing Charge (पैकिंग)
                              </label>
                            </div>

                            {applyPackingCharge && (
                              <div className="flex items-center gap-1">
                                <div className="flex gap-1">
                                  {[10, 20].map(val => (
                                    <button 
                                      key={val} 
                                      type="button" 
                                      onClick={() => setPackingCharge(val)} 
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${packingCharge === val ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-neutral-800'}`}
                                    >
                                      ₹{val}
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[11px] font-bold text-neutral-500">₹</span>
                                <input 
                                  type="number" 
                                  min={0}
                                  value={packingCharge} 
                                  onChange={e => setPackingCharge(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-12 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-1 py-0.5 text-xs font-mono font-bold outline-none text-center" 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CASH CHANGE RETURN CALCULATOR (Settings से कंट्रोल होगा) */}
                    {cashTenderEnabled && (
                      <div className="bg-neutral-100 dark:bg-neutral-800/80 p-2 rounded-xl border border-neutral-300 dark:border-neutral-700 mb-2 shrink-0 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-neutral-700 dark:text-neutral-300">कैश दिया (Cash Tendered):</span>
                          <div className="flex items-center gap-1">
                            <input 
                              id="cashTenderedInput"
                              type="number" 
                              placeholder="₹ नोट" 
                              value={cashTendered} 
                              onChange={e => setCashTendered(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-20 bg-white dark:bg-neutral-900 border rounded px-2 py-1 text-xs font-mono font-bold outline-none" 
                            />
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {[100, 200, 500, 1000].map(val => (
                            <button 
                              key={val} 
                              type="button" 
                              onClick={() => setCashTendered(val)} 
                              className="flex-1 py-0.5 bg-white dark:bg-neutral-900 border rounded text-[10px] font-bold text-neutral-700 dark:text-neutral-300"
                            >
                              ₹{val}
                            </button>
                          ))}
                        </div>
                        {cashTendered !== '' && Number(cashTendered) >= getTotalBillPrice() && (
                          <div className="pt-1 border-t flex justify-between items-center text-xs font-black text-green-600">
                            <span>वापस दें (Change Return):</span>
                            <span className="font-mono text-sm">₹{changeReturnAmount}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* BILL TOTALS */}
                    <div className="space-y-1 text-xs border-t border-neutral-300 dark:border-neutral-800 pt-1.5 shrink-0 font-bold">
                      <div className="flex justify-between text-neutral-600 dark:text-neutral-400"><span>Subtotal</span><span className="font-mono">₹{getCartSubtotal()}</span></div>
                      
                      {/* 👉 NEW: GST DISPLAY IN CART */}
                      {gstEnabled && getGstAmountCalculated() > 0 && (
                        <div className="flex justify-between text-neutral-800 dark:text-neutral-200">
                          <span>GST Tax ({gstRate}%)</span>
                          <span className="font-mono text-red-500">+₹{getGstAmountCalculated()}</span>
                        </div>
                      )}

                      {getDeliveryCharge() > 0 && <div className="flex justify-between text-neutral-800 dark:text-neutral-200"><span>Delivery Charge</span><span className="font-mono">+₹{getDeliveryCharge()}</span></div>}
                      {getPackingCharge() > 0 && <div className="flex justify-between text-neutral-800 dark:text-neutral-200"><span>Packing Charge (📦)</span><span className="font-mono text-orange-600 dark:text-orange-400">+₹{getPackingCharge()}</span></div>}
                      {getCalculatedDiscountAmount() > 0 && <div className="flex justify-between text-orange-600 font-bold"><span>Discount {appliedPromoName && `(${appliedPromoName})`}</span><span className="font-mono">-₹{getCalculatedDiscountAmount()}</span></div>}
                      {isRedeemingPoints && <div className="flex justify-between text-amber-600 font-bold"><span>Points Redeemed</span><span className="font-mono">-₹{getRedemptionDiscount()}</span></div>}
                      <div className="flex justify-between text-sm font-black text-green-600 dark:text-green-500 pt-1 border-t border-dashed border-neutral-400">
                        <span>Grand Total</span><span className="font-mono text-base font-black">₹{getTotalBillPrice()}</span>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    {fulfillmentType === 'table' ? (
                      <div className="space-y-1.5 pt-2 shrink-0">
                        <button 
                          onClick={handleSaveTableOrderKotOnly} 
                          disabled={cart.length === 0 || isSubmittingOrder} 
                          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow"
                        >
                          <Printer size={15} />
                          <span>{activeEditingOrderId ? `Update ${tableNumber} (केवल नए आइटम की KOT)` : `Save on ${tableNumber} & Print KOT`}</span>
                        </button>
                        <button 
                          onClick={handleFinalCheckoutAndPrintBill} 
                          disabled={cart.length === 0 || isSubmittingOrder} 
                          className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-2.5 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-xl"
                        >
                          <Receipt size={15} />
                          <span>Settle & Print Final Bill (केवल पूरा बिल) [F9]</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 shrink-0">
                        <button 
                          onClick={handleFinalCheckoutAndPrintBill} 
                          disabled={cart.length === 0 || isSubmittingOrder} 
                          className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-xl"
                        >
                          {isSubmittingOrder ? <Loader2 className="animate-spin" size={15} /> : <Receipt size={15} />}
                          <span>Print Bill (₹{getTotalBillPrice()}) [F9]</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DAILY BILLS & SETTLEMENT */}
            {activeTab === 'settlement' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden space-y-4">
                <div className="flex justify-between items-center border-b pb-3 shrink-0">
                  <div>
                    <h2 className="text-base font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-2">
                      <Receipt size={20} /> Daily Bills & Settlement (दैनिक बिल व भुगतान सेटलमेंट)
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      यहाँ से ग्राहक के भुगतान (Cash/UPI/उधार) को सेलेक्ट करके सेटल करें। सेटल होने के बाद ही यह दैनिक बिक्री रिपोर्ट में जुड़ेगा।
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl">
                      <button onClick={() => setSettlementFilter('all')} className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg ${settlementFilter === 'all' ? 'bg-orange-600 text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>All ({todaySettlementOrders.length})</button>
                      <button onClick={() => setSettlementFilter('unsettled')} className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg ${settlementFilter === 'unsettled' ? 'bg-red-600 text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>Unsettled ({unsettledOrdersCount})</button>
                      <button onClick={() => setSettlementFilter('settled')} className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg ${settlementFilter === 'settled' ? 'bg-green-600 text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>Settled</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {filteredSettlementOrders.length === 0 ? (
                    <div className="text-center py-24 text-neutral-500 font-bold text-xs">
                      कोई बिल उपलब्ध नहीं है।
                    </div>
                  ) : (
                    filteredSettlementOrders.map((order) => {
                      const isSettled = order.status === 'completed';
                      return (
                        <div 
                          key={order.id} 
                          className={`border rounded-2xl p-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 transition-all shadow-sm ${
                            isSettled 
                              ? 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800' 
                              : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {/* 🌐 ऑनलाइन ऑर्डर के लिए WEB- टैग और काउंटर के लिए Bill # */}
                              {order.source !== 'PC_POS' ? (
                                <span className="font-mono font-black text-xs bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                                  🌐 WEB-{order.billNumber}
                                </span>
                              ) : (
                                <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                                  Bill #{order.billNumber}
                                </span>
                              )}
                              <span className="text-neutral-400">•</span>
                              <span className="font-bold text-xs text-neutral-900 dark:text-white">{order.customerName || 'Walk-in Guest'}</span>
                              {order.customerPhone && <span className="text-[10px] text-neutral-500 font-mono">({order.customerPhone})</span>}
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                isSettled ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400 animate-pulse'
                              }`}>
                                {isSettled ? `✅ चुकता (${order.paymentMethod?.toUpperCase()})` : '🟡 भुगतान बाकी (Unsettled)'}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-500 font-mono mt-1">
                              {order.items?.map((it: any) => `${it.name} x${it.quantity}`).join(', ')}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-neutral-500 block uppercase font-bold">Total Amount</span>
                              <span className="font-mono font-black text-base text-green-600 dark:text-green-400">₹{order.total}</span>
                            </div>

                           {!isSettled ? (
                              <div className="flex gap-1.5 flex-wrap justify-end">
                                <button 
                                  onClick={() => handleQuickSettleOrder(order.id, 'cash')} 
                                  className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase shadow"
                                >
                                  💵 Cash
                                </button>
                                <button 
                                  onClick={() => handleQuickSettleOrder(order.id, 'upi')} 
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow"
                                >
                                  📱 UPI
                                </button>
                                <button 
                                  onClick={() => handleQuickSettleOrder(order.id, 'due')} 
                                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase shadow"
                                >
                                  📕 उधार (Due)
                                </button>
                                <button 
                                  onClick={() => handleReEditOrder(order)} 
                                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black uppercase shadow ml-2 flex items-center gap-1"
                                >
                                  <SafeEdit3 size={14} /> Edit
                                </button>
                                
                                {/* 👉 NEW: ऑनलाइन/पेंडिंग आर्डर के लिए KOT और Bill प्रिंट करने के बटन */}
                                <button 
                                  onClick={() => handlePrintReceiptDirect(order, true)} 
                                  className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase shadow ml-1 flex items-center gap-1"
                                  title="किचन के लिए KOT निकालें"
                                >
                                  <SafePrinter size={14} /> KOT
                                </button>
                                <button 
                                  onClick={() => handlePrintReceiptDirect(order, false)} 
                                  className="px-3 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white rounded-xl text-xs font-black uppercase shadow flex items-center gap-1 border border-neutral-300 dark:border-neutral-700"
                                  title="कस्टमर के लिए बिल निकालें"
                                >
                                  <SafePrinter size={14} /> Bill
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleReEditOrder(order)} 
                                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow"
                                >
                                  <SafeEdit3 size={14} /> Re-Edit
                                </button>
                                <button 
                                  onClick={() => handlePrintReceiptDirect(order, false)} 
                                  className="px-3 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1 border"
                                >
                                  <SafePrinter size={14} /> Reprint
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: INVENTORY & STOCK */}
            {activeTab === 'inventory' && (
              <div className="flex-1 p-6 h-full overflow-y-auto space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h2 className="text-sm font-black uppercase text-orange-600 dark:text-orange-500">Inventory & Stock Manager</h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Add food items, manage raw materials and recipes.</p>
                  </div>
                  <div className="flex gap-2">
                    {currentUser?.role === 'admin' && (
                      <>
                        {/* सब-टैब बटन (Menu vs Raw) */}
                        <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl mr-2 shadow-inner">
                          <button onClick={() => setInventorySubTab('menu')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${inventorySubTab === 'menu' ? 'bg-orange-600 text-white shadow' : 'text-neutral-600 dark:text-neutral-400'}`}>Menu Items</button>
                          <button onClick={() => setInventorySubTab('raw')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${inventorySubTab === 'raw' ? 'bg-orange-600 text-white shadow' : 'text-neutral-600 dark:text-neutral-400'}`}>Raw Materials</button>
                        </div>
                        
                       {inventorySubTab === 'menu' ? (
                          <>
                           {/* 👉 NEW: EXCEL MENU EXPORT / IMPORT */}
                            <div className="flex flex-col gap-1 mr-2 border-r border-neutral-300 dark:border-neutral-700 pr-3">
                               <div className="flex items-center gap-1.5">
                                 <span className="text-[9px] font-black uppercase text-neutral-500 w-12">Menu:</span>
                                 <button onClick={handleExportMenuCSV} title="मेनू आइटम Export करें" className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-blue-100">📥 Exp</button>
                                 <label className="bg-green-50 text-green-600 px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-green-100 cursor-pointer">
                                   {isMenuExcelProcessing ? '...' : '📤 Imp'}
                                   <input type="file" accept=".csv" className="hidden" onChange={handleImportMenuCSV} />
                                 </label>
                               </div>
                               
                               <div className="flex items-center gap-1.5">
                                 <span className="text-[9px] font-black uppercase text-neutral-500 w-12">Recipe:</span>
                                 <button onClick={handleExportRecipeCSV} title="रेसिपी मैपिंग Export करें" className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-blue-100">📥 Exp</button>
                                 <label className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-purple-100 cursor-pointer">
                                   {isRecipeExcelProcessing ? '...' : '📤 Imp'}
                                   <input type="file" accept=".csv" className="hidden" onChange={handleImportRecipeCSV} />
                                 </label>
                               </div>
                            </div>

                            <button onClick={() => setIsCatManagerModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700 shadow-sm">
                              <ArrowLeftRight size={14} className="text-orange-500" /> Category
                            </button>
                            <button onClick={() => handleOpenItemEditor(null)} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow">
                              <SafePackagePlus size={16} /> + Add Item
                            </button>
                          </>
                        ) : (
                          <>
                            {/* 👉 NEW: EXCEL RAW MATERIAL EXPORT / IMPORT */}
                            <div className="flex gap-1.5 mr-2 border-r border-neutral-300 dark:border-neutral-700 pr-3">
                               <button onClick={handleExportRawCSV} title="कच्चे माल का Excel टेम्पलेट डाउनलोड करें" className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1">
                                 📥 Export
                               </button>
                               <label title="कच्चे माल की Excel फाइल अपलोड करें" className={`bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/50 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center gap-1 cursor-pointer ${isRawExcelProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
                                 {isRawExcelProcessing ? <Loader2 size={12} className="animate-spin" /> : '📤 Import'}
                                 <input type="file" accept=".csv" className="hidden" onChange={handleImportRawCSV} />
                               </label>
                            </div>

{/* 👉 NEW: Purchase Entry Button */}
                            <button onClick={() => { 
                              setPurchaseDate(new Date().toISOString().split('T')[0]);
                              setPurchaseItemId('');
                              setPurchaseQty('');
                              setPurchaseRate('');
                              setPurchaseSearchTerm(''); // 👉 NEW: Reset search
                              setShowPurchaseDropdown(false); // 👉 NEW: Close dropdown
                              setIsPurchaseModalOpen(true); 
                            }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow">
                              <SafeFileText size={16} /> Purchase Entry (माल चढ़ाएं)
                            </button>

                            <button onClick={() => { setEditRawId(null); setRawFormName(''); setRawFormStock(''); setRawFormUnit('Kg'); setRawFormLowAlert(5); setRawActionType('add'); setRawActionQty(''); setRawTotalReceived(0); setRawTotalConsumed(0); setIsRawModalOpen(true); }} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 shadow">
                              <SafePackagePlus size={16} /> + New Material
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {inventorySubTab === 'menu' ? (
                  <>
                    <div className="relative">
                  <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search menu by item name, category or code..." 
                    value={inventorySearchQuery}
                    onChange={e => setInventorySearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {filteredInventoryProducts.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    const variantsCount = item.variants && typeof item.variants === 'object' ? Object.keys(item.variants).length : 0;
                    return (
                      <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex justify-between items-start mb-1.5">
                            <div>
                              <p className="font-bold text-xs text-neutral-900 dark:text-neutral-100">{item.name}</p>
                              {item.itemCode && <p className="text-[10px] font-mono text-yellow-600 dark:text-yellow-400 font-black">Code: #{item.itemCode}</p>}
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isAvail ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
                              {isAvail ? 'In Stock' : 'Out'}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-orange-600 dark:text-orange-400 font-black mb-1">₹{item.price}</p>
                          <p className="text-[10px] text-neutral-600 dark:text-neutral-400">Category: {item.category || 'General'}</p>

                          {variantsCount > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-neutral-300 dark:border-neutral-700">
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Sizes / Variants ({variantsCount}):</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(item.variants).map(([vName, vPrice]: any) => (
                                  <span key={vName} className="text-[9px] bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-mono font-bold">
                                    {vName}: ₹{vPrice}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

          {/* 👉 सिर्फ एडमिन ही आइटम एडिट या डिलीट कर सकता है */}
                        {currentUser?.role === 'admin' && (
                          <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-300 dark:border-neutral-700">
                            <button onClick={() => handleOpenItemEditor(item)} className="flex-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-orange-600 hover:text-white py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1">
                              <SafeEdit3 size={12} /> Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(item.id, item.name)} 
                              className="p-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 rounded-xl transition-all"
                              title="Delete Item Permanently"
                            >
                              <SafeTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              ) : (
               /* 👉 NEW: RAW MATERIALS DASHBOARD & UI */
                <div className="space-y-4">
                  
                  {/* 👉 NEW: Raw Material Search Bar */}
                  <div className="relative">
                    <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                    <input 
                      type="text" 
                      placeholder="कच्चा माल ढूँढें (Search by name)..." 
                      value={rawSearchQuery}
                      onChange={e => setRawSearchQuery(e.target.value)}
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none"
                    />
                  </div>

                  {/* डैशबोर्ड समरी (Dashboard Summary) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-300 dark:border-neutral-800 shadow-sm flex flex-col justify-center">
                       <p className="text-[10px] font-black uppercase text-neutral-500">कुल प्रकार के कच्चे माल (Total Items)</p>
                       <p className="text-2xl font-black font-mono text-neutral-900 dark:text-white">{rawMaterials.length}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-200 dark:border-red-800/50 shadow-sm flex flex-col justify-center">
                       <p className="text-[10px] font-black uppercase text-red-600">खत्म होने वाले माल (Low Stock Alerts)</p>
                       <p className="text-2xl font-black font-mono text-red-600">{rawMaterials.filter(r => Number(r.stock) <= Number(r.lowAlert)).length}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-200 dark:border-green-800/50 shadow-sm flex flex-col justify-center">
                       <p className="text-[10px] font-black uppercase text-green-600">सबसे ज़्यादा इस्तेमाल (Top Consumed)</p>
                       {rawMaterials.length > 0 ? (() => {
                          const top = [...rawMaterials].sort((a,b) => (b.totalConsumed || 0) - (a.totalConsumed || 0))[0];
                          return top && (top.totalConsumed > 0) ? (
                             <div>
                                <p className="text-lg font-black text-green-700 dark:text-green-400 truncate mt-0.5">{top.name}</p>
                                <p className="text-[11px] font-bold text-green-600 dark:text-green-500">कुल {top.totalConsumed} {top.unit} इस्तेमाल हुआ</p>
                             </div>
                          ) : <p className="text-xs text-neutral-500 mt-1 font-bold">अभी तक कुछ इस्तेमाल नहीं हुआ</p>
                       })() : <p className="text-xs text-neutral-500 mt-1">कोई माल नहीं है</p>}
                    </div>
                  </div>

 {/* कच्चे माल की लिस्ट (List View) */}
                  <div className="flex flex-col gap-2 pb-10">
                    {/* List Header */}
                    <div className="hidden lg:flex justify-between items-center px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-[10px] font-black uppercase text-neutral-500 shadow-sm">
                       <div className="w-1/3">Material Name (कच्चा माल)</div>
                       <div className="w-1/5 text-left">Current Stock</div>
                       <div className="w-1/4 text-center">In / Out Stats</div>
                       <div className="w-1/5 text-right">Actions</div>
                    </div>

                    {filteredRawMaterials.length === 0 ? (
                      <p className="text-center text-neutral-500 font-bold py-10 text-xs">कोई भी कच्चा माल (Raw Material) नहीं मिला।</p>
                    ) : (
                      filteredRawMaterials.map(raw => {
                        const isLow = Number(raw.stock) <= Number(raw.lowAlert);
                        return (
                          <div key={raw.id} className={`flex flex-col lg:flex-row justify-between items-start lg:items-center p-3 rounded-xl border shadow-sm transition-all hover:shadow-md gap-3 lg:gap-0 ${isLow ? 'border-red-400 bg-red-50 dark:bg-red-900/10' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'}`}>
                            
                            {/* Material Name & Alert */}
                            <div className="w-full lg:w-1/3 flex flex-col">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">{raw.name}</p>
                                {isLow && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase animate-pulse shadow-sm">Low Stock</span>}
                              </div>
                              <p className="text-[10px] text-neutral-500 font-bold mt-0.5">Alert below: {raw.lowAlert} {raw.unit}</p>
                            </div>
                            
                            {/* Current Stock */}
                            <div className="w-full lg:w-1/5 flex lg:justify-start items-center">
                              <p className={`text-lg font-black font-mono ${isLow ? 'text-red-600' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                {Number(raw.stock).toFixed(4).replace(/\.?0+$/, '')} <span className="text-[10px] text-neutral-500 uppercase">{raw.unit}</span>
                              </p>
                            </div>
                            
                            {/* In / Out Stats */}
                            <div className="w-full lg:w-1/4 flex gap-4 lg:justify-center items-center text-[10px]">
                               <div className="text-center">
                                  <p className="font-black uppercase text-neutral-400">Total In</p>
                                  <p className="font-bold text-green-600 dark:text-green-400">{Number(raw.totalReceived || 0).toFixed(4).replace(/\.?0+$/, '')}</p>
                               </div>
                               <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700"></div>
                               <div className="text-center">
                                  <p className="font-black uppercase text-neutral-400">Consumed</p>
                                  <p className="font-bold text-orange-600 dark:text-orange-400">{Number(raw.totalConsumed || 0).toFixed(4).replace(/\.?0+$/, '')}</p>
                               </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="w-full lg:w-1/5 flex lg:justify-end gap-2">
                              <button onClick={() => {
                                setEditRawId(raw.id);
                                setRawFormName(raw.name);
                                setRawFormStock(raw.stock);
                                setRawFormUnit(raw.unit);
                                setRawFormLowAlert(raw.lowAlert);
                                setRawActionType('add');
                                setRawActionQty('');
                                setRawTotalReceived(raw.totalReceived || 0);
                                setRawTotalConsumed(raw.totalConsumed || 0);
                                setIsRawModalOpen(true);
                              }} className="flex-1 lg:flex-none px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-green-600 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1 border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                <SafeEdit3 size={12} /> Update
                              </button>
                              <button onClick={async () => {
                                if (window.confirm('Delete this raw material permanently?')) {
                                  await deleteDoc(doc(db, "raw_materials", raw.id));
                                  toast.success("Deleted!");
                                }
                              }} className="px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-500 hover:text-white text-red-600 rounded-lg transition-all border border-red-100 dark:border-red-800 shadow-sm">
                                <SafeTrash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
              </div>
            )}

            {/* TAB 3: PAST RECEIPTS */}
            {activeTab === 'receipts' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden space-y-4">
                <div className="flex justify-between items-center border-b pb-3 shrink-0">
                  <div>
                    <h2 className="text-sm font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-2">
                      <Printer size={18} /> Past Receipts & Bill Reprints
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Filter bills by Today or Yesterday, search by Bill Number or Phone, and reprint receipts.</p>
                  </div>
                  <button onClick={fetchPastReceipts} disabled={isReceiptsLoading} className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700">
                    {isReceiptsLoading ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />} Refresh
                  </button>
                </div>

                <div className="flex gap-3 shrink-0 items-center">
                  <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-300 dark:border-neutral-700">
                    <button 
                      onClick={() => setReceiptFilterDay('today')} 
                      className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${receiptFilterDay === 'today' ? 'bg-orange-600 text-white shadow' : 'text-neutral-700 dark:text-neutral-300'}`}
                    >
                      Today (आज)
                    </button>
                    <button 
                      onClick={() => setReceiptFilterDay('yesterday')} 
                      className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${receiptFilterDay === 'yesterday' ? 'bg-orange-600 text-white shadow' : 'text-neutral-700 dark:text-neutral-300'}`}
                    >
                      Yesterday (कल)
                    </button>
                    <button 
                      onClick={() => setReceiptFilterDay('all')} 
                      className={`px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${receiptFilterDay === 'all' ? 'bg-orange-600 text-white shadow' : 'text-neutral-700 dark:text-neutral-300'}`}
                    >
                      All Bills
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Type Bill No (e.g. 201), Customer Name or Phone..." 
                      value={receiptSearchQuery} 
                      onChange={e => setReceiptSearchQuery(e.target.value)} 
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2 pl-10 pr-4 text-xs outline-none font-bold" 
                    />
                  </div>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {isReceiptsLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                  ) : filteredPastReceipts.length === 0 ? (
                    <div className="text-center py-24 text-neutral-500 font-bold text-xs">
                      No bills found for the selected filter.
                    </div>
                  ) : (
                    filteredPastReceipts.map((order) => {
                      const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || Date.now());
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => { setSelectedReceipt(order); setIsReceiptModalOpen(true); }} 
                          className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:border-orange-500 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all shadow-sm" 
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {order.source !== 'PC_POS' ? (
                                <span className="font-mono font-black text-xs bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  🌐 WEB-{order.billNumber || 'N/A'}
                                </span>
                              ) : (
                                <span className="font-mono font-black text-amber-600 dark:text-yellow-400 text-sm">
                                  Bill #{order.billNumber || 'N/A'}
                                </span>
                              )}
                              <span className="text-neutral-400">•</span>
                              <span className="font-bold text-xs text-neutral-900 dark:text-white">{order.customerName || 'Walk-in Guest'}</span>
                              {order.customerPhone && <span className="text-[10px] text-neutral-500 font-mono">({order.customerPhone})</span>}
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 ml-1">
                                {order.fulfillmentType || 'pickup'}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono block mt-1">
                              {orderDate.toLocaleString()} • {order.items?.length || 0} Items
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${order.paymentMethod === 'upi' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : order.paymentMethod === 'due' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : order.paymentMethod === 'split' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-green-500/15 text-green-600 dark:text-green-400'}`}>
                              {order.paymentMethod || 'cash'}
                            </span>
                            <span className="font-mono font-black text-sm text-green-600 dark:text-green-400">₹{order.total}</span>
                            <div className="flex gap-1.5">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReEditOrder(order);
                                }} 
                                className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-black rounded-xl transition-colors"
                                title="Edit Bill"
                              >
                                <SafeEdit3 size={14} />
                              </button>
                             <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReceipt(order);
                                  setIsReceiptModalOpen(true);
                                }} 
                                className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                                title="View/Print"
                              >
                                <SafeEye size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: REPORTS WITH ITEM-WISE SALES */}
                  
                
           {/* TAB 4: REPORTS WITH ITEM-WISE SALES */}
{activeTab === 'reports' && (
  <div className="flex-1 p-6 h-full overflow-y-auto space-y-6 w-full">
    <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-lg font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-2">
                      <SafeBarChart3 size={20} /> Sales & Item-wise Analytics
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Total settled sales, cash drawer reconciliation and item-wise sales report.</p>
                  </div>
                 {/* 👉 फिक्स: flex-col items-end की वजह से Date Picker अब नीचे आएगा */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={handleDownloadSummaryPDF} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow">
                        📥 Download PDF
                      </button>
                      <button onClick={handleSendOwnerSummary} className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow">
                        <SafeSend size={14} /> WhatsApp
                      </button>
                      <div className="flex bg-neutral-200 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-inner">
                        <button onClick={() => setReportFilter('today')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg whitespace-nowrap transition-all ${reportFilter === 'today' ? 'bg-orange-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Today</button>
                        <button onClick={() => setReportFilter('yesterday')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg whitespace-nowrap transition-all ${reportFilter === 'yesterday' ? 'bg-orange-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>Yesterday</button>
                        <button onClick={() => setReportFilter('last7days')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg whitespace-nowrap transition-all ${reportFilter === 'last7days' ? 'bg-orange-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>7 Days</button>
                        <button onClick={() => setReportFilter('last30days')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg whitespace-nowrap transition-all ${reportFilter === 'last30days' ? 'bg-orange-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>30 Days</button>
                        <button onClick={() => setReportFilter('custom')} className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-lg whitespace-nowrap transition-all flex items-center gap-1 ${reportFilter === 'custom' ? 'bg-orange-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}>📅 Custom</button>
                      </div>
                    </div>

                    {/* 👉 Custom Date Picker (बटनों के ठीक नीचे) */}
                    {reportFilter === 'custom' && (
                      <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 shadow-sm transition-all duration-300">
                        <span className="text-[10px] font-black uppercase text-neutral-500 px-1">From</span>
                        <input 
                          type="date" 
                          value={customStartDate} 
                          onChange={e => setCustomStartDate(e.target.value)}
                          title="Start Date"
                          className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                        />
                        <span className="text-[10px] font-black uppercase text-neutral-500 px-1">To</span>
                        <input 
                          type="date" 
                          value={customEndDate} 
                          onChange={e => setCustomEndDate(e.target.value)}
                          min={customStartDate}
                          title="End Date"
                          className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* SUMMARY TILES */}
                <div className="grid grid-cols-3 xl:grid-cols-6 gap-3">
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3.5 rounded-2xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Settled Sales</p>
                    <p className="text-xl font-black font-mono text-green-600 dark:text-green-400">₹{reportSummary.totalSale}</p>
                    <p className="text-[9px] text-neutral-500">{reportSummary.totalOrdersCount} Settled Orders</p>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3.5 rounded-2xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Cash Received</p>
                    <p className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">₹{reportSummary.cashSale}</p>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3.5 rounded-2xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">UPI Received</p>
                    <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">₹{reportSummary.upiSale}</p>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3.5 rounded-2xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">उधार (Due)</p>
                    <p className="text-xl font-black font-mono text-red-600 dark:text-red-400">₹{reportSummary.dueSale}</p>
                  </div>
                  
                  {/* 👉 NEW: TOTAL DISCOUNT BOX (नया बॉक्स) */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3.5 rounded-2xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Total Discount</p>
                    <p className="text-xl font-black font-mono text-purple-600 dark:text-purple-400">₹{reportSummary.totalDiscount}</p>
                  </div>

                 <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-3.5 rounded-2xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Net in Drawer</p>
                    <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">₹{reportSummary.netCashInDrawer}</p>
                  </div>
                </div>

                {/* 👉 NEW: PROFIT & LOSS (P&L) DASHBOARD */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200 dark:border-green-800/30 p-5 rounded-3xl mt-4 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-green-700 dark:text-green-500 flex items-center gap-1.5">
                      💰 Profit & Loss Statement (मुनाफ़ा और नुकसान)
                    </h3>
                    <p className="text-[10px] text-green-700/70 dark:text-green-400/70 font-bold mt-1">
                      (कुल बिक्री - आज के कुल खर्चे = आज का शुद्ध मुनाफा)
                    </p>
                  </div>
                  
                  <div className="flex gap-4 md:gap-6 items-center bg-white dark:bg-neutral-900 p-3 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-x-auto no-scrollbar">
                    <div className="text-center px-2">
                      <p className="text-[10px] font-black uppercase text-neutral-500">Gross Sales</p>
                      <p className="text-lg font-black font-mono text-neutral-800 dark:text-neutral-200">₹{reportSummary.totalSale}</p>
                    </div>
                    <div className="text-xl font-black text-neutral-300">-</div>
                    <div className="text-center px-2">
                      <p className="text-[10px] font-black uppercase text-red-500">Total Expenses</p>
                      <p className="text-lg font-black font-mono text-red-600">₹{reportSummary.totalExpenseAmount}</p>
                    </div>
                    <div className="text-xl font-black text-neutral-300">=</div>
                    <div className={`text-center px-4 py-1.5 rounded-xl border ${reportSummary.totalSale - reportSummary.totalExpenseAmount >= 0 ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50' : 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/50'}`}>
                      <p className={`text-[10px] font-black uppercase ${reportSummary.totalSale - reportSummary.totalExpenseAmount >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>Net Profit</p>
                      <p className={`text-xl font-black font-mono ${reportSummary.totalSale - reportSummary.totalExpenseAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {reportSummary.totalSale - reportSummary.totalExpenseAmount >= 0 ? '+' : ''}₹{reportSummary.totalSale - reportSummary.totalExpenseAmount}
                      </p>
                    </div>
                  </div>
                </div>

               {/* 📊 DAILY SALES GRAPH (दिन-वार बिक्री का ग्राफ़) */}
                {(reportFilter === 'last7days' || reportFilter === 'last30days' || reportFilter === 'custom') && dailyTrendData.length > 0 && (
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-6 rounded-3xl shadow-sm mt-6 relative overflow-hidden">
                    {/* ग्राफ़ के पीछे का हल्का संतरी (Orange) ग्लो (चमक) */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    
                    <div className="flex justify-between items-center mb-8 relative z-10">
                       <div>
                         <h3 className="text-sm font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-2">
                           <SafeBarChart3 size={18} /> Sales Trend (बिक्री ग्राफ)
                         </h3>
                         <p className="text-[10px] text-neutral-500 font-bold mt-1">
                           {reportFilter === 'custom' ? 'चुनी गई तारीखों की बिक्री' : reportFilter === 'last30days' ? 'पिछले 30 दिनों की बिक्री का ग्राफ' : 'पिछले 7 दिनों की बिक्री का ग्राफ'}
                         </p>
                       </div>
                       <div className="text-right">
                         <p className="text-[9px] font-black uppercase text-neutral-500">Highest Sale</p>
                         <span className="text-sm font-mono font-black text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20 shadow-sm">
                           ₹{Math.max(...dailyTrendData.map(d => d.total))}
                         </span>
                       </div>
                    </div>

                    {/* यहाँ overflow-x-auto लगा दिया गया है, ताकि 15-30 दिन होने पर स्क्रॉल हो सके */}
                    <div className="flex items-end gap-2 sm:gap-4 h-56 relative z-10 pt-12 border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto scrollbar-hide">
                      {dailyTrendData.map((day, idx) => {
                        const maxVal = Math.max(...dailyTrendData.map(d => d.total));
                        const barHeight = maxVal > 0 && day.total > 0 ? Math.max((day.total / maxVal) * 100, 3) : 0;
                        
                        // असली "आज" की तारीख का पता लगाना
                        const todayDateStr = `${String(new Date().getDate()).padStart(2, '0')} ${new Date().toLocaleString('default', { month: 'short' })}`;
                        const isToday = day.date === todayDateStr; 
                        
                        return (
                          // 👇 फिक्स 1: यहाँ 'relative' जोड़ा गया है ताकि अमाउंट खंभे के ठीक ऊपर रहे
                          <div key={idx} className="flex flex-col items-center gap-2 group h-full justify-end min-w-[32px] sm:min-w-[48px] relative">
                            
                            {/* टूलटिप / अमाउंट (Hover करने पर हवा में दिखेगा) */}
                            {/* 👇 फिक्स 2: z-20 जोड़ा गया है ताकि यह कट न हो */}
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:-translate-y-1 flex flex-col items-center pointer-events-none absolute -top-8 z-20">
                              <span className="bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-mono font-black px-2 py-1 rounded-lg shadow-lg whitespace-nowrap">
                                ₹{day.total}
                              </span>
                              <div className="w-2 h-2 bg-neutral-900 dark:bg-white rotate-45 -mt-1.5"></div>
                            </div>
                            
                            {/* बार (Bar Background & Foreground) */}
                            <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800/60 rounded-t-xl relative flex items-end justify-center overflow-hidden border border-neutral-200 dark:border-neutral-700/50">
                               {day.total > 0 ? (
                                 <div 
                                   className={`w-full rounded-t-lg transition-all duration-1000 ease-out shadow-[inset_0_4px_4px_rgba(255,255,255,0.3)] ${
                                     isToday 
                                       ? 'bg-gradient-to-t from-green-600 to-emerald-400' // आज के लिए हरा रंग 
                                       : 'bg-gradient-to-t from-orange-600 to-yellow-400' // बाकी दिनों के लिए संतरी रंग
                                   }`}
                                   style={{ height: `${barHeight}%` }}
                                 ></div>
                               ) : (
                                 <div className="text-[8px] text-neutral-400 font-bold mb-2">₹0</div>
                               )}
                            </div>
                            
                            {/* तारीख (Date) */}
                            <span className={`text-[10px] font-bold whitespace-nowrap ${isToday ? 'text-green-600 dark:text-green-400 font-black' : 'text-neutral-600 dark:text-neutral-400'}`}>
                              {isToday ? 'Today' : day.date}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CASH DRAWER AUDIT */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-5 rounded-3xl space-y-4 shadow-sm mt-6">
                  <div className="flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 pb-3">
                    <div>
                      <h3 className="text-xs font-black uppercase text-amber-600 dark:text-yellow-400">Cash Drawer Audit (गल्ला मिलान)</h3>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Expected Net Cash: <span className="font-mono text-green-600 dark:text-green-400 font-bold">₹{reportSummary.netCashInDrawer}</span></p>
                    </div>
                    <button onClick={() => setIsExpenseModalOpen(true)} className="px-3 py-1.5 bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 rounded-xl text-xs font-black uppercase">
                      + Add Expense [F6]
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      placeholder="Counted Cash in Drawer (₹)" 
                      value={physicalCashInput}
                      onChange={e => setPhysicalCashInput(e.target.value === '' ? '' : Number(e.target.value))}
                      className="flex-1 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono text-neutral-900 dark:text-white outline-none font-bold" 
                    />
                    {physicalCashInput !== '' && (
                      <div className={`text-xs font-black px-4 py-2.5 rounded-xl border ${Number(physicalCashInput) === reportSummary.netCashInDrawer ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/40' : Number(physicalCashInput) > reportSummary.netCashInDrawer ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40' : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40'}`}>
                        {Number(physicalCashInput) === reportSummary.netCashInDrawer ? '✅ Matched!' : Number(physicalCashInput) > reportSummary.netCashInDrawer ? `⚠️ Excess: +₹${Number(physicalCashInput) - reportSummary.netCashInDrawer}` : `❌ Short: -₹${reportSummary.netCashInDrawer - Number(physicalCashInput)}`}
                      </div>
                    )}
                  </div>
                </div>

               {/* ITEM-WISE SALES TABLE & PIE CHART */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-5 rounded-3xl shadow-sm mt-6">
                  <div className="flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 pb-3 mb-4">
                    <h3 className="text-xs font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-1.5">
                      <Layers size={14} /> आइटम-वाइज़ बिक्री रिपोर्ट और ग्राफ
                    </h3>
                    
                    {/* CATEGORY DROPDOWN FILTER */}
                    <div className="flex items-center gap-3">
                      <select 
                        value={reportCategoryFilter} 
                        onChange={e => setReportCategoryFilter(e.target.value)}
                        className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-800 dark:text-neutral-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer shadow-sm"
                      >
                        {categories.filter(c => c !== '⭐ Top Items').map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-neutral-500 font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-1 rounded-lg">
                        {filteredItemWiseSales.length} Items
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* 👉 LEFT SIDE: गोल डोनट चार्ट (Pie Chart) */}
                    <div className="w-full lg:w-1/3 flex flex-col items-center bg-neutral-50 dark:bg-neutral-800/30 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      {chartData.length === 0 || chartData.reduce((s, c) => s + c.value, 0) === 0 ? (
                        <div className="h-48 flex items-center justify-center text-xs text-neutral-400 font-bold">चार्ट के लिए कोई डेटा नहीं है</div>
                      ) : (
                        <>
                          <div className="w-48 h-48 rounded-full flex items-center justify-center relative shadow-lg ring-4 ring-white dark:ring-neutral-900" 
                            style={{ 
                              background: `conic-gradient(${chartData.map((slice, i, arr) => {
                                const total = arr.reduce((acc, curr) => acc + curr.value, 0);
                                const startPercent = arr.slice(0, i).reduce((acc, curr) => acc + curr.value, 0) / total * 100;
                                const endPercent = startPercent + (slice.value / total * 100);
                                return `${CHART_COLORS[i % CHART_COLORS.length]} ${startPercent}% ${endPercent}%`;
                              }).join(', ')})`
                            }}
                          >
                            {/* बीच का सफ़ेद हिस्सा (ताकि डोनट जैसा दिखे) */}
                            <div className="w-32 h-32 bg-white dark:bg-neutral-900 rounded-full flex flex-col items-center justify-center shadow-inner">
                              <span className="text-[10px] text-neutral-500 font-black uppercase">Food Items Sale</span>
                              <span className="text-lg font-black text-neutral-900 dark:text-white font-mono">
                                ₹{chartData.reduce((s, c) => s + c.value, 0)}
                              </span>
                            </div>
                          </div>

                          {/* कलर लेजेंड (Legend) */}
                          <div className="mt-6 w-full max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                            {chartData.map((slice, i) => {
                              const total = chartData.reduce((s, c) => s + c.value, 0);
                              const percentage = ((slice.value / total) * 100).toFixed(1);
                              return (
                                <div key={i} className="flex justify-between items-center text-[10px]">
                                  <div className="flex items-center gap-2 truncate pr-2">
                                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span>
                                    <span className="truncate font-bold text-neutral-700 dark:text-neutral-300">
                                      {slice.label}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-mono font-black text-neutral-900 dark:text-white mr-2">₹{slice.value}</span>
                                    <span className="font-bold text-neutral-500 bg-neutral-200 dark:bg-neutral-800 px-1 rounded">{percentage}%</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 👉 RIGHT SIDE: आइटम की टेबल */}
                    <div className="w-full lg:w-2/3 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col">
                      {filteredItemWiseSales.length === 0 ? (
                        <p className="text-xs text-neutral-400 py-10 text-center">कोई बिक्री रिकॉर्ड नहीं मिला।</p>
                      ) : (
                        <div className="max-h-80 overflow-y-auto pr-1">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 uppercase text-[10px] sticky top-0 z-10">
                                <th className="py-2.5 px-3 font-black">Item Name</th>
                                <th className="py-2.5 px-3 font-black">Category</th>
                                <th className="py-2.5 px-3 font-black text-center">Qty</th>
                                <th className="py-2.5 px-3 font-black text-right">Revenue (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                              {filteredItemWiseSales.map((row, idx) => (
                                <tr key={idx} className="hover:bg-orange-50 dark:hover:bg-neutral-800/50 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-neutral-900 dark:text-neutral-100">{row.name}</td>
                                  <td className="py-2.5 px-3 text-[10px] text-neutral-500 font-bold">{row.category}</td>
                                  <td className="py-2.5 px-3 text-center font-mono font-black text-orange-600 bg-orange-500/5">{row.quantity}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-black text-green-600 dark:text-green-400">₹{row.revenue}</td>
                                </tr>
                              ))}
                            </tbody>
                            {/* TABLE FOOTER TOTAL */}
                            <tfoot className="sticky bottom-0 bg-neutral-100 dark:bg-neutral-800 border-t-2 border-neutral-300 dark:border-neutral-700 shadow-[0_-5px_10px_-2px_rgba(0,0,0,0.05)]">
                              <tr>
                                <td colSpan={2} className="py-3 px-3 font-black text-right uppercase text-neutral-800 dark:text-neutral-200 text-[11px]">
                                  {reportCategoryFilter === 'All' ? 'कुल बिक्री (All Items) :' : `${reportCategoryFilter} Total :`}
                                </td>
                                <td className="py-3 px-3 text-center font-mono font-black text-orange-600 text-sm">
                                  {filteredItemWiseSales.reduce((sum, item) => sum + item.quantity, 0)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-black text-green-600 dark:text-green-400 text-sm">
                                  ₹{filteredItemWiseSales.reduce((sum, item) => sum + item.revenue, 0)}
                                </td>
                         </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TABLES MANAGER */}
            {/* TAB 5: TABLES MANAGER */}
            {activeTab === 'tables' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-black uppercase text-amber-600 dark:text-amber-500">Active Dine-In Tables ({activeTableOrders.length})</h2>
                  <p className="text-xs text-neutral-500">Click any running table to modify items or settle the bill directly.</p>
                </div>
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                  {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map((tName) => {
                    const order = activeTableOrders.find(o => o.tableNumber === tName);
                    return (
                      <div key={tName} className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-all ${order ? 'bg-white dark:bg-neutral-900 border-amber-500 ring-2 ring-amber-400/50' : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 opacity-60'}`}>
                        <div>
                          <div className="flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 pb-2 mb-3">
                            <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">🪑 {tName}</span>
                            {order ? (
                              <span className="bg-amber-500 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded">Bill #{order.billNumber}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-neutral-500 uppercase">Available</span>
                            )}
                          </div>
                          {order ? (
                            <>
                              <p className="text-xs font-bold mb-2">👤 {order.customerName || 'Walk-in Guest'} {order.customerPhone && `(${order.customerPhone})`}</p>
                              <div className="space-y-1.5 py-2 border-t border-dashed border-neutral-300 dark:border-neutral-800 mb-3 max-h-40 overflow-y-auto">
                                {order.items?.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between text-xs font-medium">
                                    <span className="truncate pr-2">{it.name}</span>
                                    <span className="font-bold text-orange-600 dark:text-orange-400 shrink-0">x{it.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs text-neutral-400 py-6 text-center">Table is empty.</p>
                          )}
                        </div>
                        <div className="space-y-2 pt-2 border-t border-neutral-300 dark:border-neutral-800">
                          {order ? (
                            <>
                              <div className="flex justify-between text-xs font-black text-green-600 dark:text-green-500">
                                <span>Running Bill:</span>
                                <span className="font-mono text-sm font-black">₹{order.total}</span>
                              </div>
<div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    setActiveEditingOrderId(order.id);
                                    setActiveEditingBillNumber(order.billNumber);
                                    setActiveEditingOriginalItems(order.items ? JSON.parse(JSON.stringify(order.items)) : []);
                                    setTableNumber(order.tableNumber || tName);
                                    setFulfillmentType('table');
                                    setCart(order.items || []);
                                    setCustomerName(order.customerName || '');
                                    setCustomerPhone(order.customerPhone || '');
                                    setActiveTab('billing');
                                    toast.success(`Loaded ${tName} Bill #${order.billNumber}`);
                                    setTimeout(() => searchInputRef.current?.focus(), 80);
                                  }} 
                                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1 shadow"
                                >
                                  <SafeEdit3 size={12} /> Add / Settle
                                </button>
                                
                               {/* 👉 NEW: Table Transfer Button */}
                                <button 
                                  onClick={() => {
                                    setTableTransferSourceOrder(order);
                                    setTableTransferTarget('');
                                    setIsTableTransferModalOpen(true);
                                  }}
                                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 dark:border-blue-800 px-3 rounded-xl shadow-sm transition-colors flex items-center justify-center"
                                  title="कस्टमर को दूसरी खाली टेबल पर भेजें"
                                >
                                  <ArrowLeftRight size={14} />
                                </button>

                                {/* 👉 NEW: Table Merge Button */}
                                <button 
                                  onClick={() => {
                                    setTableMergeSourceOrder(order);
                                    setTableMergeTargetOrderId('');
                                    setIsTableMergeModalOpen(true);
                                  }}
                                  className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 hover:text-purple-700 border border-purple-200 dark:border-purple-800 px-3 rounded-xl shadow-sm transition-colors flex items-center justify-center"
                                  title="इस टेबल के बिल को दूसरी भरी हुई टेबल में जोड़ें (Merge)"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                setActiveEditingOrderId(null);
                                setActiveEditingBillNumber(null);
                                setActiveEditingOriginalItems([]);
                                setTableNumber(tName);
                                setFulfillmentType('table');
                                setCart([]);
                                setActiveTab('billing');
                                setTimeout(() => searchInputRef.current?.focus(), 80);
                              }} 
                              className="w-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 text-neutral-800 dark:text-white font-black py-2 rounded-xl text-xs uppercase"
                            >
                              + New Order
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: LIVE ORDERS */}
            {activeTab === 'orders' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <h2 className="text-sm font-black uppercase text-orange-600 dark:text-orange-500 mb-4">Live Delivery & Pickup Orders ({activeLiveOrders.length})</h2>
                <div className="grid grid-cols-3 gap-4">
                  {activeLiveOrders.length === 0 ? (
                    <div className="col-span-3 text-center py-24 text-neutral-500 font-bold">No active live orders.</div>
                  ) : (
                    activeLiveOrders.map((order) => (
                      <div key={order.id} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg space-y-3">
                        <div>
                          <div className="flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 pb-2 mb-2">
                            {order.source !== 'PC_POS' ? (
                              <span className="font-mono font-black text-xs bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                🌐 WEB-{order.billNumber}
                              </span>
                            ) : (
                              <span className="font-mono font-black text-amber-600 dark:text-yellow-400">
                                Bill #{order.billNumber}
                              </span>
                            )}
                            <span className="bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">{order.fulfillmentType}</span>
                          </div>
                          <p className="text-xs font-bold">👤 {order.customerName} ({order.customerPhone || 'Walk-in'})</p>
                          <div className="space-y-1 py-2 border-t border-dashed border-neutral-300 dark:border-neutral-800 my-2 max-h-36 overflow-y-auto">
                            {order.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs font-medium">
                                <span>{it.name}</span><span className="font-bold text-orange-600">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm font-black text-green-600 dark:text-green-400 font-mono">Total: ₹{order.total}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-300 dark:border-neutral-800">
                          <button onClick={() => handlePrintReceiptDirect(order, false)} className="py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1">
                            <SafePrinter size={13} /> Print
                          </button>
                         <button onClick={async () => {
                            let extraUpdates: any = {};
                            
                            // 1. Stock Deduction
                            if (order.items && !order.stockProcessed) {
                              await deductInventoryForItems(order.items);
                              extraUpdates.stockProcessed = true;
                            }

                            // 2. 👉 NEW: Loyalty Points
                            if (order.customerPhone && !order.pointsProcessed) {
                               const cleanPhone = String(order.customerPhone).replace(/\D/g, '').slice(-10);
                               if (cleanPhone.length === 10 && navigator.onLine) {
                                 const userRef = doc(db, "customer_points", cleanPhone);
                                 const userDoc = await getDoc(userRef);
                                 let prevPoints = 0; let prevSpent = 0; let prevVisits = 0;
                                 if (userDoc.exists()) {
                                   const data = userDoc.data();
                                   prevPoints = Number(data.points) || 0;
                                   prevSpent = Number(data.totalSpent) || 0;
                                   prevVisits = Number(data.totalVisits) || 0;
                                 }
                                 const finalTotal = Number(order.total) || 0;
                                 const newSpent = prevSpent + finalTotal;
                                 const earned = Math.floor(newSpent / 100) - Math.floor(prevSpent / 100);
                                 const remainingPts = prevPoints + earned;

                                 await setDoc(userRef, {
                                   name: order.customerName || "Walk-in Guest",
                                   phone: cleanPhone,
                                   points: remainingPts,
                                   totalSpent: newSpent,
                                   totalVisits: prevVisits + 1,
                                   lastBillNumber: order.billNumber,
                                   lastBillAmount: finalTotal,
                                   lastActive: new Date().toISOString()
                                 }, { merge: true });

                                 extraUpdates.pointsEarned = earned;
                                 extraUpdates.remainingPoints = remainingPts;
                                 extraUpdates.pointsProcessed = true;
                                 fetchAllCustomers();
                               }
                            }

                            await updateDoc(doc(db, "orders", order.id), { status: 'completed', paymentSettled: true, settledAt: new Date(), ...extraUpdates });
                            toast.success("Order Completed & Points Added! ✅");
                          }} className="py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1">
                            <Check size={13} /> Done
                          </button>
                          <button onClick={async () => {
                            if (!window.confirm("क्या आप सच में यह ऑनलाइन ऑर्डर रिजेक्ट करना चाहते हैं?")) return;
                            await updateDoc(doc(db, "orders", order.id), { status: 'rejected', rejectedAt: new Date() });
                            setLiveOrders(prev => prev.filter(o => o.id !== order.id));
                            toast.success("ऑर्डर रिजेक्ट कर दिया गया और हटा दिया गया! 🗑️");
                          }} className="py-2 bg-red-500/15 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1">
                            <SafeX size={13} /> Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 8: UDHARI BOOK */}
            {activeTab === 'udhari' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden space-y-4">
                <div className="flex justify-between items-center border-b pb-3 shrink-0">
                  <div>
                    <h2 className="text-lg font-black uppercase text-red-600 flex items-center gap-2">
                      <SafeFileText size={20} /> Udhari Book (खाता / उधार)
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">सभी ग्राहकों के उधार (Due) बिल यहाँ देखें और भुगतान प्राप्त होने पर जमा (Clear) करें।</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-2xl text-right shadow-sm">
                     <p className="text-[10px] font-black uppercase text-red-600">Total Pending Udhari</p>
                     <p className="text-xl font-black font-mono text-red-600">
                       ₹{dueOrders.reduce((acc, o) => acc + Number(o.total || 0), 0)}
                     </p>
                  </div>
                </div>

                <div className="flex gap-3 shrink-0 items-center">
                   <div className="relative flex-1">
                     <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                     <input 
                       type="text" 
                       placeholder="Search by Customer Name, Phone or Bill No..." 
                       value={udhariSearchQuery} 
                       onChange={e => setUdhariSearchQuery(e.target.value)} 
                       className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none font-bold" 
                     />
                   </div>
                   <button onClick={fetchDueOrders} disabled={isUdhariLoading} className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700">
                     {isUdhariLoading ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />} Refresh
                   </button>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                  {isUdhariLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500" size={32} /></div>
                  ) : dueOrders.filter(o => !udhariSearchQuery || String(o.customerName).toLowerCase().includes(udhariSearchQuery.toLowerCase()) || String(o.customerPhone).includes(udhariSearchQuery) || String(o.billNumber).includes(udhariSearchQuery)).length === 0 ? (
                    <div className="text-center py-24 text-neutral-500 font-bold text-xs">कोई भी उधार (Due) पेंडिंग नहीं है। 🎉</div>
                  ) : (
                    dueOrders.filter(o => !udhariSearchQuery || String(o.customerName).toLowerCase().includes(udhariSearchQuery.toLowerCase()) || String(o.customerPhone).includes(udhariSearchQuery) || String(o.billNumber).includes(udhariSearchQuery)).map(order => {
                      const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || Date.now());
                      return (
                        <div key={order.id} className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900/50 hover:border-red-500 p-4 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm transition-all">
                           <div>
                             <div className="flex items-center gap-2">
                               <span className="font-mono font-black text-red-600 dark:text-red-400 text-sm">Bill #{order.billNumber}</span>
                               <span className="text-neutral-400">•</span>
                               <span className="font-bold text-sm text-neutral-900 dark:text-white">{order.customerName || 'Unknown Guest'}</span>
                               {order.customerPhone && <span className="text-[11px] text-neutral-500 font-mono">({order.customerPhone})</span>}
                             </div>
                             <span className="text-[10px] text-neutral-500 block mt-1 font-bold">
                               📅 Date: {orderDate.toLocaleString()}
                             </span>
                           </div>
                           <div className="flex items-center gap-4">
                             <div className="text-right mr-2">
                               <span className="text-[10px] text-neutral-500 block uppercase font-bold">Pending Amount</span>
                               <span className="font-mono font-black text-lg text-red-600 dark:text-red-400">₹{order.total}</span>
                             </div>
                             <div className="flex gap-2">
                               <button onClick={() => {
                                 if(window.confirm(`क्या आप ${order.customerName} का ₹${order.total} का उधार CASH में जमा करना चाहते हैं?`)) {
                                   handleClearUdhari(order.id, 'cash');
                                 }
                               }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase shadow">
                                 Receive Cash
                               </button>
                               <button onClick={() => {
                                 if(window.confirm(`क्या आप ${order.customerName} का ₹${order.total} का उधार UPI में जमा करना चाहते हैं?`)) {
                                   handleClearUdhari(order.id, 'upi');
                                 }
                               }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase shadow">
                                 Receive UPI
                               </button>
                             </div>
                           </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
           {/* TAB 9: CUSTOMERS & LOYALTY PROFILE */}
            {activeTab === 'customers' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-300 dark:border-neutral-800 pb-3 shrink-0">
                  <div>
                    <h2 className="text-lg font-black uppercase text-orange-600 flex items-center gap-2">
                      <SafeUserPlus size={20} /> Customers & CRM Analytics
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">सभी ग्राहकों की प्रोफाइल देखें, पॉइंट्स मैनेज करें और CRM ग्राफ्स एनालिसिस करें।</p>
                  </div>
                  <div className="flex gap-2 items-center">
                     {/* CRM Dashboard / Directory टॉगल बटन */}
                     <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl mr-2 shadow-inner">
                        <button onClick={() => setCustomerSubTab('directory')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all ${customerSubTab === 'directory' ? 'bg-orange-600 text-white shadow' : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'}`}>Directory (लिस्ट)</button>
                        <button onClick={() => setCustomerSubTab('dashboard')} className={`px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1 ${customerSubTab === 'dashboard' ? 'bg-orange-600 text-white shadow' : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white'}`}>
                          <SafeBarChart3 size={14} /> CRM Dashboard
                        </button>
                     </div>

                     {/* बाकी बटन्स सिर्फ Directory व्यू में दिखेंगे */}
                     {customerSubTab === 'directory' && (
                       <>
                         <button onClick={fetchAllCustomers} disabled={isCustomersLoading} className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700">
                           {isCustomersLoading ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />} Refresh
                         </button>
                         <label className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow cursor-pointer transition-colors">
                           <SafeFileText size={14} /> Import CSV
                           <input type="file" accept=".csv" className="hidden" onChange={handleImportCustomersCSV} />
                         </label>
                         <button onClick={openAddCustomerModal} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow">
                           <SafeUserPlus size={14} /> + Add
                         </button>
                       </>
                     )}
                  </div>
                </div>

{/* 🌟 VIEW 1: SUPER-SMART CRM DASHBOARD (AI & ANALYTICS) */}
                {customerSubTab === 'dashboard' ? (
                  (() => {
                    // 👉 1. डेटा कैलकुलेशन (AOV, Gamification, RFM, Trends)
                    const totalCust = allCustomers.length;
                    let totalGamerRevenue = 0; let gamersCount = 0; let returningGamersCount = 0;
                    let totalAOV_Revenue = 0; let totalAOV_Visits = 0;
                    let vipCustomers = 0; let regularCustomers = 0; let atRiskCustomers = 0; let sleepingCustomers = 0;
                    let newCustomers7Days = 0;
                    
                    const fomoCustomers: any[] = [];
                    const acqTrend = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 }; // 0 = Today, 6 = 6 Days Ago
                    const now = Date.now();

                    allCustomers.forEach(c => {
                      const lastAct = c.lastActive?.toDate ? c.lastActive.toDate().getTime() : new Date(c.lastActive || 0).getTime();
                      const daysSince = Math.floor((now - lastAct) / (1000 * 3600 * 24));
                      const visits = c.totalVisits || 0;
                      const spent = c.totalSpent || 0;

                      // AOV Calculation
                      totalAOV_Revenue += spent;
                      totalAOV_Visits += visits;

                      // Gamification ROI
                      const isGamer = c.lastPrizeWon || c.lastCatchGameScore !== undefined || (c.gamePoints && c.gamePoints > 0);
                      if (isGamer) {
                        gamersCount++;
                        totalGamerRevenue += spent;
                        if (visits > 1) returningGamersCount++;
                      }

                      // RFM Segments
                      const isVip = spent >= 5000 || visits >= 10;
                      if (isVip) vipCustomers++;
                      else if (daysSince > 30) sleepingCustomers++;
                      else if (daysSince >= 15 && daysSince <= 30) atRiskCustomers++;
                      else regularCustomers++;

                      // New Customer Trend
                      if (visits === 1 && daysSince <= 6) {
                        newCustomers7Days++;
                        acqTrend[daysSince as keyof typeof acqTrend]++;
                      }

                      // FOMO Marketing List (पॉइंट्स ज्यादा हैं, पर बहुत दिन से नहीं आए)
                      if ((c.points > 40 || c.gamePoints > 40) && daysSince >= 15) {
                        fomoCustomers.push({ ...c, daysSince });
                      }
                    });

                    const aov = totalAOV_Visits > 0 ? Math.round(totalAOV_Revenue / totalAOV_Visits) : 0;
                    const gamerRetentionPct = gamersCount > 0 ? Math.round((returningGamersCount / gamersCount) * 100) : 0;
                    fomoCustomers.sort((a, b) => ((b.points || 0) + (b.gamePoints || 0)) - ((a.points || 0) + (a.gamePoints || 0)));

                    // Peak Hours Calculation (Using Past Receipts)
                    const hourCounts: { [key: number]: number } = {};
                    pastReceipts.forEach(o => {
                      if (o.status === 'completed') {
                        const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp || Date.now());
                        const h = d.getHours();
                        hourCounts[h] = (hourCounts[h] || 0) + 1;
                      }
                    });
                    const sortedHours = Object.entries(hourCounts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 2);
                    const peakHoursText = sortedHours.length > 0 
                      ? sortedHours.map(([h]) => { const hr = parseInt(h); return `${hr % 12 || 12} ${hr >= 12 ? 'PM' : 'AM'}`; }).join(' & ') 
                      : 'Load Receipts First';

                    // Donut Chart
                    const vipPct = totalCust > 0 ? (vipCustomers / totalCust) * 100 : 0;
                    const regPct = totalCust > 0 ? (regularCustomers / totalCust) * 100 : 0;
                    const riskPct = totalCust > 0 ? (atRiskCustomers / totalCust) * 100 : 0;
                    const donutGradient = `conic-gradient(#eab308 0% ${vipPct}%, #10b981 ${vipPct}% ${vipPct + regPct}%, #f97316 ${vipPct + regPct}% ${vipPct + regPct + riskPct}%, #ef4444 ${vipPct + regPct + riskPct}% 100%)`;

                    return (
                      <div className="flex-1 overflow-y-auto pr-1 space-y-6 pb-10">
                        
                        {/* 🚀 ROW 1: SMART METRICS CARDS */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* AOV Box */}
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800/50 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1"><IndianRupee size={12}/> Average Order Value</p>
                            <p className="text-2xl font-black font-mono text-neutral-900 dark:text-white mt-1">₹{aov}</p>
                            <p className="text-[9px] text-blue-700 dark:text-blue-300 font-bold mt-1">औसत प्रति ग्राहक खर्च (AOV)</p>
                          </div>
                          {/* Gamification ROI */}
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800/50 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 flex items-center gap-1"><Gamepad2 size={12}/> Gamification ROI</p>
                            <div className="flex items-end justify-between mt-1">
                               <p className="text-xl font-black font-mono text-neutral-900 dark:text-white">₹{totalGamerRevenue}</p>
                               <span className="text-[10px] font-black text-purple-700 bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded">{gamerRetentionPct}% Retained</span>
                            </div>
                            <p className="text-[9px] text-purple-700 dark:text-purple-300 font-bold mt-1">गेम खेलने वालों ने खर्च किए</p>
                          </div>
                          {/* Peak Hours */}
                          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1"><Clock size={12}/> Best Visiting Hours</p>
                            <p className="text-xl font-black font-mono text-neutral-900 dark:text-white mt-1">{peakHoursText}</p>
                            <p className="text-[9px] text-amber-700 dark:text-amber-300 font-bold mt-1">सबसे ज़्यादा भीड़ का समय</p>
                            <button onClick={() => { if(pastReceipts.length === 0) fetchPastReceipts(); else toast.success("Data Analyzed!"); }} className="text-[9px] font-black uppercase mt-1 text-amber-600 underline cursor-pointer">Analyze Receipts</button>
                          </div>
                          {/* New Customers */}
                          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl shadow-sm">
                            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><SafeUserPlus size={12}/> Fresh Customers</p>
                            <p className="text-2xl font-black font-mono text-neutral-900 dark:text-white mt-1">+{newCustomers7Days}</p>
                            <p className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold mt-1">पिछले 7 दिनों में पहली बार आए</p>
                          </div>
                        </div>

                        {/* 📈 ROW 2: CHARTS & ACQUISITION TREND */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Left: RFM Segments (Donut Chart) */}
                          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col items-center">
                            <div className="w-full flex justify-between items-center mb-6 border-b border-neutral-100 dark:border-neutral-800 pb-2">
                               <h3 className="text-xs font-black uppercase text-neutral-600 dark:text-neutral-400">RFM Customer Segments</h3>
                               <button className="text-[9px] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-bold uppercase text-neutral-500">Auto-Sorted</button>
                            </div>
                            
                            <div className="w-40 h-40 rounded-full relative shadow-lg ring-4 ring-neutral-50 dark:ring-neutral-950 flex items-center justify-center" style={{ background: donutGradient }}>
                              <div className="w-24 h-24 bg-white dark:bg-neutral-900 rounded-full flex flex-col items-center justify-center shadow-inner">
                                <span className="text-xl font-black text-neutral-900 dark:text-white">{totalCust}</span>
                              </div>
                            </div>

                            <div className="mt-6 w-full grid grid-cols-2 gap-3">
                              <div className="bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-xl text-center border border-yellow-100 dark:border-yellow-900/50">
                                <p className="text-[10px] font-bold text-yellow-600">VIP (👑)</p>
                                <p className="text-sm font-black font-mono text-yellow-700">{vipCustomers}</p>
                              </div>
                              <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded-xl text-center border border-green-100 dark:border-green-900/50">
                                <p className="text-[10px] font-bold text-green-600">Regular (🌟)</p>
                                <p className="text-sm font-black font-mono text-green-700">{regularCustomers}</p>
                              </div>
                              <div className="bg-orange-50 dark:bg-orange-900/10 p-2 rounded-xl text-center border border-orange-100 dark:border-orange-900/50">
                                <p className="text-[10px] font-bold text-orange-600">At-Risk (⚠️)</p>
                                <p className="text-sm font-black font-mono text-orange-700">{atRiskCustomers}</p>
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded-xl text-center border border-red-100 dark:border-red-900/50">
                                <p className="text-[10px] font-bold text-red-600">Sleeping (😴)</p>
                                <p className="text-sm font-black font-mono text-red-700">{sleepingCustomers}</p>
                              </div>
                            </div>
                          </div>

                          {/* Right: New Customer Acquisition Trend (Bar Chart) */}
                          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm">
                            <h3 className="text-xs font-black uppercase text-neutral-600 dark:text-neutral-400 mb-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">📈 New Customer Acquisition</h3>
                            <p className="text-[10px] font-bold text-neutral-500 mb-6">कैफे में प्रतिदिन जुड़ने वाले नए ग्राहकों का ग्राफ़ (पिछले 7 दिन)</p>
                            
                            <div className="flex items-end justify-between h-40 mt-4 border-b border-neutral-200 dark:border-neutral-800 pb-2 relative">
                              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10">
                                <div className="border-b border-neutral-400 w-full h-0"></div><div className="border-b border-neutral-400 w-full h-0"></div><div className="border-b border-neutral-400 w-full h-0"></div>
                              </div>
                              
                              {[6,5,4,3,2,1,0].map(dayOffset => {
                                const count = acqTrend[dayOffset as keyof typeof acqTrend];
                                const maxCount = Math.max(...Object.values(acqTrend)) || 1;
                                const heightPct = (count / maxCount) * 100;
                                const dLabel = dayOffset === 0 ? 'Today' : `${dayOffset}d ago`;

                                return (
                                  <div key={dayOffset} className="flex flex-col items-center gap-2 group w-8 sm:w-12 h-full justify-end relative z-10">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                                      {count} New
                                    </div>
                                    <div className={`w-full rounded-t-lg transition-all duration-700 relative overflow-hidden ${dayOffset === 0 ? 'bg-gradient-to-t from-emerald-600 to-green-400' : 'bg-gradient-to-t from-blue-600 to-cyan-400'}`} style={{ height: `${Math.max(heightPct, 5)}%` }}></div>
                                    <p className={`text-[9px] font-bold ${dayOffset===0 ? 'text-green-600 font-black' : 'text-neutral-500'} truncate w-full text-center`}>{dLabel}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* 🚨 ROW 3: MARKETING ACTION CENTER (FOMO & FEEDBACK) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                           
                           {/* FOMO Marketing Section */}
                           <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-200 dark:border-red-800/30 rounded-3xl p-5 shadow-sm">
                             <div className="flex justify-between items-center border-b border-red-200 dark:border-red-800/50 pb-2 mb-3">
                               <h3 className="text-xs font-black uppercase text-red-600 dark:text-red-500 flex items-center gap-1.5"><Tag size={16}/> FOMO Marketing ⏳</h3>
                               <span className="text-[9px] bg-red-100 dark:bg-red-900/50 text-red-600 px-2 py-1 rounded font-black uppercase animate-pulse">{fomoCustomers.length} Risking Expiry</span>
                             </div>
                             <p className="text-[10px] font-bold text-red-800/70 dark:text-red-300/70 mb-3">
                               इन ग्राहकों के पास बहुत सारे पॉइंट्स जमा हैं, लेकिन ये काफी दिनों से कैफे नहीं आए हैं। इन्हें डराने (FOMO) वाला मैसेज भेजकर वापस बुलाएं!
                             </p>
                             
                             <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                               {fomoCustomers.length === 0 ? (
                                 <p className="text-xs text-neutral-500 py-6 text-center font-bold">कोई भी पॉइंट्स खतरे में नहीं हैं।</p>
                               ) : (
                                 fomoCustomers.slice(0, 10).map((c, idx) => {
                                   const msg = `Hi ${c.name}, आपके Bum Bum Cafe के ⭐ ${c.points || c.gamePoints} Points एक्सपायर होने वाले हैं! 😱 आज ही आएं और अपना बिल कम करवाएं या फ्री आइटम पाएं।`;
                                   return (
                                     <div key={idx} className="flex justify-between items-center bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm">
                                       <div>
                                         <p className="font-bold text-xs text-neutral-900 dark:text-white uppercase">{c.name}</p>
                                         <p className="text-[10px] font-black text-red-600 dark:text-red-400 mt-0.5">⭐ {c.points || c.gamePoints} Pts • {c.daysSince} days ago</p>
                                       </div>
                                       <button onClick={() => window.open(`https://wa.me/91${String(c.phone || c.id).replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm flex items-center gap-1">
                                          <SafeSend size={12}/> Alert
                                       </button>
                                     </div>
                                   );
                                 })
                               )}
                             </div>
                           </div>

                           {/* Customer Feedback Sentiment (Unhappy Box) */}
                           <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col">
                             <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2 mb-3">
                               <h3 className="text-xs font-black uppercase text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">⭐ Customer Feedback Center</h3>
                               <span className="text-[9px] bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-bold text-neutral-500">Auto-Linked via WhatsApp</span>
                             </div>
                             <p className="text-[10px] font-bold text-neutral-500 mb-4">
                               जो बिल आप WhatsApp पर भेजते हैं, उसमें अब एक "Feedback Link" जाता है। अगर ग्राहक "Bad 🔴" पर क्लिक करता है, तो वो मैसेज सीधा आपके WhatsApp पर आएगा।
                             </p>
                             
                             <div className="flex-1 flex flex-col justify-center items-center bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-4 text-center">
                                <div className="flex gap-4 text-3xl mb-3 opacity-80">
                                   <span>🟢</span><span>🟡</span><span>🔴</span>
                                </div>
                                <p className="text-sm font-black text-neutral-700 dark:text-neutral-300">Sentiment Tracking Active</p>
                                <p className="text-[10px] text-neutral-500 font-bold mt-2">
                                   अगर कोई ग्राहक शिकायत करे, तो Google Maps पर खराब रिव्यु डालने से पहले उसे कॉल करके मना लें (Damage Control)।
                                </p>
                             </div>
                           </div>

                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* 🌟 VIEW 2: ORIGINAL CUSTOMER DIRECTORY (LIST) */
                  <>
                    {/* Stats & Sorting Header */}
                    <div className="flex flex-col lg:flex-row gap-3 justify-between lg:items-center bg-orange-500/10 dark:bg-orange-500/5 border border-orange-500/20 p-3 rounded-2xl shrink-0">
                      <div className="flex gap-6 items-center px-2">
                        <div>
                          <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">Total Customers</p>
                          <p className="text-xl font-black font-mono text-neutral-900 dark:text-white">{totalCustomersCount}</p>
                        </div>
                        <div className="w-px h-8 bg-orange-500/20"></div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Total Loyalty Points</p>
                          <p className="text-xl font-black font-mono text-neutral-900 dark:text-white">⭐ {totalPointsInSystem}</p>
                        </div>
                      </div>
                      
                      <div className="flex bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 p-1 shadow-sm shrink-0">
                        <button onClick={() => setCustomerSortBy('recent')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'recent' ? 'bg-orange-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Recent</button>
                        <button onClick={() => setCustomerSortBy('spent_high')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'spent_high' ? 'bg-green-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Top Spender</button>
                        <button onClick={() => setCustomerSortBy('points_high')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'points_high' ? 'bg-amber-500 text-black' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>High Points</button>
                        <button onClick={() => setCustomerSortBy('points_low')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${customerSortBy === 'points_low' ? 'bg-orange-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Low Points</button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative shrink-0">
                      <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search customer by Name, Phone Number or Address..." 
                        value={customerTabSearch} 
                        onChange={e => setCustomerTabSearch(e.target.value)} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none font-bold shadow-sm focus:border-orange-500 transition-colors" 
                      />
                    </div>

                    {/* Customer Grid with Pagination */}
                    <div className="flex-1 overflow-y-auto pr-1 pb-10 flex flex-col space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                        {isCustomersLoading ? (
                          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                        ) : paginatedCustomers.length === 0 ? (
                          <div className="col-span-full text-center py-24 text-neutral-500 font-bold text-xs">कोई ग्राहक नहीं मिला।</div>
                        ) : (
                          paginatedCustomers.map(cust => (
                            <div key={cust.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm hover:border-orange-500 transition-colors gap-3">
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-sm text-neutral-900 dark:text-white uppercase">{cust.name || 'Valued Guest'}</p>
                                        
                                        {/* Tags */}
                                        {(() => {
                                          let tag = ''; let tagClass = '';
                                          const spent = cust.totalSpent || 0;
                                          const visits = cust.totalVisits || 0;
                                          const daysSinceActive = cust.lastActive ? Math.floor((Date.now() - (cust.lastActive.toDate ? cust.lastActive.toDate().getTime() : new Date(cust.lastActive).getTime())) / (1000 * 3600 * 24)) : 0;
                                          
                                          if (daysSinceActive > 30) { tag = '😴 Sleeping'; tagClass = 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700'; }
                                          else if (spent >= 5000 || visits >= 10) { tag = '👑 VIP Guest'; tagClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700/50'; }
                                          else if (spent >= 2000) { tag = '🌟 Regular'; tagClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700/50'; }
                                          
                                          return tag ? <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm border ${tagClass}`}>{tag}</span> : null;
                                        })()}

                                        {(cust.importSource === 'SpinGame' || cust.importSource === 'CatchGame') && (
                                          <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30 text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm">
                                            🎰 {cust.importSource === 'CatchGame' ? 'Catch Game' : 'Spin Game'}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs font-mono text-neutral-500 mt-0.5">📞 {cust.phone || cust.id}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                                      ⭐ {cust.points || 0} Pts
                                    </span>
                                    {cust.gamePoints > 0 && (
                                      <span className="bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 shadow-sm">
                                        🎰 {cust.gamePoints} Game
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {cust.note && (
                                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 px-2 py-1.5 rounded-lg mb-2">
                                    <p className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400">📝 Note: {cust.note}</p>
                                  </div>
                                )}

                                {cust.address ? (
                                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 mb-2">📍 {cust.address}</p>
                                ) : (
                                  <p className="text-[11px] text-neutral-400 italic mb-2">No address provided</p>
                                )}
                                <div className="flex justify-between pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                                  <div>
                                    <p className="text-[9px] font-black uppercase text-neutral-500">Spent / Visits</p>
                                    <p className="text-sm font-mono font-black text-green-600 dark:text-green-500">₹{cust.totalSpent || 0} <span className="text-xs text-neutral-400">({cust.totalVisits || 0})</span></p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] font-black uppercase text-neutral-500">Last Bill (पिछला बिल)</p>
                                    <p className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">
                                      {cust.lastBillNumber ? `#${cust.lastBillNumber} - ₹${cust.lastBillAmount}` : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Buttons Row */}
                              <div className="flex gap-1.5 items-center relative overflow-visible">
                                <div className="relative flex-1">
                                  <button onClick={() => setActiveWaDropdown(activeWaDropdown === cust.id ? null : cust.id)} className="w-full py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-colors">
                                    <SafeShare2 size={13} /> Message
                                  </button>
                                  {activeWaDropdown === cust.id && (
                                    <div className="absolute bottom-full left-0 mb-1 flex flex-col bg-white dark:bg-neutral-800 border border-green-500/30 rounded-xl shadow-2xl w-48 overflow-hidden z-[100]">
                                      <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1.5 flex justify-between items-center border-b border-green-200 dark:border-green-800">
                                        <span className="text-[9px] font-black uppercase text-green-700 dark:text-green-400">Select Message</span>
                                        <button onClick={() => setActiveWaDropdown(null)} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                                      </div>
                                      <button onClick={() => { setActiveWaDropdown(null); window.open(`https://wa.me/91${cust.phone || cust.id}?text=Hi ${cust.name}, we miss you at Bum Bum Cafe! ☕ Visit us soon and enjoy a 20% OFF using code COMEBACK20.`, '_blank'); }} className="px-3 py-2.5 text-[10px] font-bold text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200">🥺 We Miss You Offer</button>
                                      <button onClick={() => { setActiveWaDropdown(null); window.open(`https://wa.me/91${cust.phone || cust.id}?text=Happy Birthday to your family member from Bum Bum Cafe! 🎂 Celebrate with us and get a surprise gift!`, '_blank'); }} className="px-3 py-2.5 text-[10px] font-bold text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 border-b border-neutral-100 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200">🎂 Birthday Booking</button>
                                      <button onClick={() => { setActiveWaDropdown(null); window.open(`https://wa.me/91${cust.phone || cust.id}?text=Hi ${cust.name}, your Loyalty Points Balance is ⭐ ${cust.points || 0}. Redeem them on your next visit!`, '_blank'); }} className="px-3 py-2.5 text-[10px] font-bold text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200">⭐ Points Update</button>
                                    </div>
                                  )}
                                </div>
                                {currentUser?.role === 'admin' && (
                                  <button type="button" onClick={() => handleDeleteCustomer(cust)} className="p-2 bg-red-50 dark:bg-red-950/30 hover:bg-red-600 hover:text-white text-red-600 border border-red-200 dark:border-red-800/40 rounded-xl transition-all shrink-0 shadow-sm" title="ग्राहक को डिलीट करें">
                                    <SafeTrash2 size={14} />
                                  </button>
                                )}
                                <button onClick={() => openEditCustomerModal(cust)} className="flex-1 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-colors">
                                  <SafeEdit3 size={13} /> Edit
                                </button>
                                <button onClick={() => handleViewCustomerHistory(cust)} className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-colors">
                                  <History size={14} /> History
                                </button>
                                <button onClick={() => {
                                  triggerBeep('tap');
                                  setCustomerPhone(cust.phone || cust.id);
                                  setCustomerName(cust.name || 'Valued Guest');
                                  setCustomerPoints(cust.points || 0);
                                  setAddress(cust.address || '');
                                  setActiveTab('billing');
                                  toast.success(`${cust.name} का आर्डर शुरू किया गया! 🛒`);
                                  setTimeout(() => searchInputRef.current?.focus(), 80);
                                }} className="flex-1 py-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-colors">
                                  <SafeShoppingBag size={14} /> Order
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      {/* Next / Previous Buttons */}
                      {!isCustomersLoading && totalCustomerPages > 1 && (
                        <div className="flex justify-center items-center gap-4 py-4 mt-auto">
                          <button onClick={() => setCustomerCurrentPage(prev => Math.max(1, prev - 1))} disabled={customerCurrentPage === 1} className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white rounded-xl text-xs font-black uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed">
                            <SafeChevronLeft size={16} className="inline mr-1" /> Previous
                          </button>
                          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                            Page <span className="text-orange-600 dark:text-orange-400 font-black">{customerCurrentPage}</span> of {totalCustomerPages}
                          </span>
                          <button onClick={() => setCustomerCurrentPage(prev => Math.min(totalCustomerPages, prev + 1))} disabled={customerCurrentPage === totalCustomerPages} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase shadow disabled:opacity-50 disabled:cursor-not-allowed">
                            Next <SafeChevronRight size={16} className="inline ml-1" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            
   {/* TAB 7: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="flex-1 p-6 lg:p-10 h-full overflow-y-auto bg-[#f4f5f7] dark:bg-[#121212]">
                <div className="max-w-6xl mx-auto space-y-6">
                  
                  {/* Page Header */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-2">
                      <Settings size={28} /> System Settings
                    </h2>
                    <p className="text-sm text-neutral-500 font-bold mt-1">Manage POS configuration, store identity, and UI preferences.</p>
                  </div>

                  {/* Grid Container for Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* CARD 1: BILLING & PAYMENTS */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm space-y-6">
                      <h3 className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-2">
                        <Receipt size={18} className="text-orange-500"/> Billing & Payments
                      </h3>
                      
                      {/* NEXT BILL / INVOICE NUMBER */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase text-neutral-500">Next Bill / Invoice Number:</p>
                        <div className="flex gap-2">
                          <input type="number" value={manualInvoiceCounterInput} onChange={e => setManualInvoiceCounterInput(e.target.value)} placeholder="e.g. 200" className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-mono font-bold outline-none focus:border-orange-500 transition-colors" />
                          <button onClick={() => { const num = parseInt(manualInvoiceCounterInput, 10); if (!isNaN(num) && num >= 1) { localStorage.setItem("bb_pos_local_bill_counter_pc", String(num - 1)); toast.success(`Next Invoice will be #${num}! ✅`); } }} className="bg-orange-600 hover:bg-orange-500 text-white px-5 rounded-xl text-xs font-black uppercase shadow-sm">Set</button>
                        </div>
                      </div>

                      {/* GST Settings */}
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                          <p className="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Enable GST (टैक्स):</p>
                          <button onClick={() => { const newVal = !gstEnabled; setGstEnabled(newVal); localStorage.setItem("bb_pos_gst_enabled_pc", String(newVal)); toast.success(newVal ? `GST Enabled (${gstRate}%)!` : "GST Disabled!"); }} className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${gstEnabled ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${gstEnabled ? 'translate-x-6' : ''}`}></div>
                          </button>
                        </div>
                        {gstEnabled && (
                          <div className="flex gap-2">
                            <input type="number" value={gstRate} onChange={e => { const rate = Number(e.target.value); setGstRate(rate); localStorage.setItem("bb_pos_gst_rate_pc", String(rate)); }} placeholder="GST %" className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-mono font-bold outline-none" />
                            <span className="bg-neutral-200 dark:bg-neutral-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase flex items-center text-neutral-600 dark:text-neutral-300">% Rate</span>
                          </div>
                        )}
                      </div>

                      {/* Cash Tendered Settings */}
                      <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                        <p className="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">Cash Change Calculator (कैश वापसी):</p>
                        <button onClick={() => { const newVal = !cashTenderEnabled; setCashTenderEnabled(newVal); localStorage.setItem("bb_pos_cash_tender_enabled_pc", String(newVal)); toast.success(newVal ? "Cash Calculator ON हो गया!" : "Cash Calculator OFF हो गया!"); }} className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${cashTenderEnabled ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                          <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${cashTenderEnabled ? 'translate-x-6' : ''}`}></div>
                        </button>
                      </div>

                      {/* UPI ID */}
                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold uppercase text-neutral-500">Dynamic UPI ID (QR Code):</p>
                        <div className="flex gap-2">
                          <input type="text" value={upiIdConfig} onChange={e => setUpiIdConfig(e.target.value)} placeholder="e.g. Q991347275@ybl" className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-blue-500 transition-colors" />
                          <button onClick={() => { localStorage.setItem("bb_pos_upi_id", upiIdConfig); toast.success("UPI ID Saved!"); }} className="bg-blue-600 hover:bg-blue-500 text-white px-5 rounded-xl text-xs font-black uppercase shadow-sm">Save</button>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: STORE DETAILS & ALERTS */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm space-y-6">
                      <h3 className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-2">
                        <Layers size={18} className="text-blue-500"/> Store Profile & Notifications
                      </h3>

                      {/* STORE DETAILS */}
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase text-neutral-500">Store Identity (बिल पर छपने वाला नाम व पता):</p>
                        <div className="flex flex-col gap-3">
                          <input type="text" value={storeNameConfig} onChange={e => setStoreNameConfig(e.target.value)} placeholder="Store Name (e.g. BUM BUM CAFE)" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:border-blue-500 transition-colors" />
                          
                          <textarea rows={2} value={storeAddressConfig} onChange={e => setStoreAddressConfig(e.target.value)} placeholder="Store Address (पता)" className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none focus:border-blue-500 transition-colors" />
                          
                          <div className="flex gap-2">
                            <input type="text" value={storePhoneConfig} onChange={e => setStorePhoneConfig(e.target.value)} placeholder="Phone Number" className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none focus:border-blue-500 transition-colors" />
                            
                            <button onClick={() => { 
                              localStorage.setItem("bb_pos_store_name", storeNameConfig); 
                              localStorage.setItem("bb_pos_store_address", storeAddressConfig); 
                              localStorage.setItem("bb_pos_store_phone", storePhoneConfig); 
                              toast.success("कैफे का नाम और पता सेव हो गया! ✅"); 
                            }} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl text-xs font-black uppercase shadow-md transition-colors">
                              Update Details
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* OWNER WHATSAPP */}
                      <div className="space-y-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <p className="text-xs font-bold uppercase text-neutral-500">Owner WhatsApp (For EOD Report):</p>
                        <div className="flex gap-2">
                          <input type="text" value={ownerPhoneConfig} onChange={e => setOwnerPhoneConfig(e.target.value)} placeholder="e.g. 919714293759" className="flex-1 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-green-500 transition-colors" />
                          <button onClick={() => { localStorage.setItem("bb_pos_owner_phone", ownerPhoneConfig); toast.success("Owner Phone Saved!"); }} className="bg-green-600 hover:bg-green-500 text-white px-5 rounded-xl text-xs font-black uppercase shadow-sm">Save</button>
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: GAME & THEME (Spans 2 columns on Desktop) */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm lg:col-span-2 space-y-6">
                      <h3 className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-neutral-800 pb-3 flex items-center gap-2">
                        <Gamepad2 size={18} className="text-purple-500"/> Experience & Interface
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* ACTIVE GAME */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-bold uppercase text-purple-600 dark:text-purple-400">Active Customer Game (QR Code):</p>
                            <p className="text-[10px] text-neutral-500 font-bold mt-1">टेबल के QR कोड को स्कैन करने पर कस्टमर के फोन में कौन सा गेम खुलेगा, उसे यहाँ से बदलें।</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <button onClick={() => handleToggleGame('SpinGame')} className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGameType === 'SpinGame' ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-500 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}>🎡 Spin Wheel</button>
                            <button onClick={() => handleToggleGame('CatchGame')} className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGameType === 'CatchGame' ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}>🍔 Catch Game</button>
                            <button onClick={() => handleToggleGame('FruitNinja')} className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGameType === 'FruitNinja' ? 'bg-red-100 text-red-700 ring-2 ring-red-500 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}>🍉 Fruit Cutter</button>
                            <button onClick={() => handleToggleGame('MemoryGame')} className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGameType === 'MemoryGame' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}>🃏 Food Match</button>
                            <button onClick={() => handleToggleGame('Cafe2048')} className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGameType === 'Cafe2048' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}>🧩 2048 Puzzle</button>
                            <button onClick={() => handleToggleGame('HungrySnake')} className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGameType === 'HungrySnake' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 hover:bg-neutral-200'}`}>🐍 Hungry Snake</button>
                          </div>
                        </div>

                        {/* THEME */}
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase text-neutral-500">UI Display Theme:</p>
                          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-xl max-w-[250px]">
                            <button onClick={() => { setThemeMode('light'); localStorage.setItem("bb_pos_theme_pc", 'light'); document.documentElement.classList.remove('dark'); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${themeMode === 'light' ? 'bg-white text-orange-600 shadow' : 'text-neutral-500 hover:text-neutral-700'}`}>Light Mode</button>
                            <button onClick={() => { setThemeMode('dark'); localStorage.setItem("bb_pos_theme_pc", 'dark'); document.documentElement.classList.add('dark'); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${themeMode === 'dark' ? 'bg-neutral-900 text-amber-400 shadow' : 'text-neutral-500 hover:text-neutral-300'}`}>Dark Mode</button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* POPUP: HELP & SHORTCUTS [F1] */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-2xl w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0">
                <h3 className="font-black text-lg uppercase text-orange-600 flex items-center gap-2">
                  <SafeHelpCircle size={22} /> Keyboard Shortcuts (शॉर्टकट्स)
                </h3>
                <button onClick={() => setIsHelpModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="overflow-y-auto pr-2 space-y-4 text-sm flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <h4 className="font-black text-neutral-500 uppercase text-[10px] border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-2 tracking-wider">⚡ Navigation & Search</h4>
                    <p className="flex justify-between"><strong className="text-orange-600">F1</strong> <span>Help / Shortcuts</span></p>
                    <p className="flex justify-between"><strong className="text-orange-600">F2</strong> <span>Item Search (बिलिंग)</span></p>
                    <p className="flex justify-between"><strong className="text-orange-600">F4</strong> <span>Sales Report (बिक्री)</span></p>
                    <p className="flex justify-between"><strong className="text-orange-600">F5</strong> <span>Search Customer (ग्राहक)</span></p>
                    <p className="flex justify-between"><strong className="text-orange-600">F6</strong> <span>Daily Bills (सेटलमेंट)</span></p>
                    <p className="flex justify-between"><strong className="text-orange-600">F11</strong> <span>Customers Profile</span></p>
                  </div>
                  <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <h4 className="font-black text-neutral-500 uppercase text-[10px] border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-2 tracking-wider">🛒 Billing Actions</h4>
                    <p className="flex justify-between"><strong className="text-green-600">F3</strong> <span>Smart Hold (होल्ड / लिस्ट)</span></p>
                    <p className="flex justify-between"><strong className="text-green-600">F7</strong> <span>Save Table & Print KOT</span></p>
                    <p className="flex justify-between"><strong className="text-green-600">F8</strong> <span>Discount (छूट)</span></p>
                    <p className="flex justify-between"><strong className="text-green-600">F9</strong> <span>Checkout & Print Bill</span></p>
                    <p className="flex justify-between"><strong className="text-green-600">F10</strong> <span>Cash Tendered (कैश वापसी)</span></p>
                    <p className="flex justify-between"><strong className="text-green-600">F12</strong> <span>Order Type (Pickup/Table)</span></p>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-500/30 mt-2">
                  <h4 className="font-black text-amber-600 dark:text-amber-400 uppercase text-[10px] mb-2 tracking-wider">💡 Smart Tricks</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    <li><strong className="text-amber-700 dark:text-amber-300">Qty * Code :</strong> आइटम सर्च में <code>3*101</code> टाइप करके Enter दबाएं, 101 कोड वाले 3 आइटम कार्ट में जुड़ जाएंगे।</li>
                    <li><strong className="text-amber-700 dark:text-amber-300">Delete :</strong> पूरा कार्ट एक झटके में खाली करने के लिए।</li>
                    <li><strong className="text-amber-700 dark:text-amber-300">Esc :</strong> कोई भी पॉपअप बंद करें और वापस बिलिंग पर जाएं।</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* POPUP: KEYBOARD VARIATION MODAL (TAB TO SELECT, ENTER TO ADD) */}
      <AnimatePresence>
        {isVariationModalOpen && selectedProductForVariation && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-black text-sm uppercase text-orange-600">{selectedProductForVariation.name}</h3>
                  <p className="text-[10px] text-neutral-500">[Tab] से साइज़ चुनें व [Enter] दबाएँ</p>
                </div>
                <button onClick={() => setIsVariationModalOpen(false)} className="text-neutral-500"><X size={18} /></button>
              </div>

              {selectedProductForVariation.variants && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-neutral-500">Size / Portion:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedProductForVariation.variants).map(([size, price]: any, idx: number) => {
                      const isSelected = selectedVariantIndex === idx;
                      return (
                        <button 
                          key={size}
                          type="button"
                          onClick={() => { setSelectedVariantIndex(idx); setSelectedSize(size); setSelectedSizePrice(Number(price) || 100); }}
                          className={`py-2 px-3 rounded-xl text-xs font-black uppercase border transition-all ${
                            isSelected ? 'bg-orange-600 text-white border-orange-600 shadow ring-2 ring-orange-400' : 'bg-neutral-100 dark:bg-neutral-800'
                          }`}
                        >
                          <span className="font-mono text-[10px] opacity-70 mr-1">[{idx + 1}]</span>
                          {size} (₹{price})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <input 
                  type="text" 
                  placeholder="Cooking Note (Optional)" 
                  value={itemNoteInput} 
                  onChange={e => setItemNoteInput(e.target.value)} 
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border rounded-xl px-3 py-2 text-xs outline-none font-bold" 
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsVariationModalOpen(false)} className="flex-1 py-2.5 bg-neutral-200 dark:bg-neutral-800 font-bold uppercase text-xs rounded-xl">Cancel [Esc]</button>
                <button type="button" onClick={handleAddCustomizedItemToCart} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow">
                  Add [Enter]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

   {/* POPUP: ITEM EDITOR MODAL */}
      <AnimatePresence>
        {isItemEditorModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-orange-600">{editingItemObj ? 'Edit Food Item' : 'Add Food Item'}</h3>
                <button onClick={() => setIsItemEditorModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveItemToFirestore} className="space-y-3 text-xs">
                
                {/* Item Name */}
                <input type="text" required placeholder="Item Name *" value={itemNameInput} onChange={e => setItemNameInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none focus:border-orange-500" autoFocus />
                
                {/* Price & Code */}
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" required min={0} placeholder="Default Price (₹) *" value={itemPriceInput} onChange={e => setItemPriceInput(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-mono font-bold outline-none focus:border-orange-500" />
                  <input type="text" required placeholder="Short Code *" value={itemCodeInput} onChange={e => setItemCodeInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-mono font-bold outline-none focus:border-orange-500" />
                </div>

                {/* Category Dropdown */}
                <div className="flex gap-2 items-center">
                  {!isAddingNewCatInput ? (
                    <select value={itemCatInput} onChange={e => {
                      if (e.target.value === 'ADD_NEW') setIsAddingNewCatInput(true);
                      else setItemCatInput(e.target.value);
                    }} className="flex-1 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none focus:border-orange-500">
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="ADD_NEW" className="font-black text-orange-600">+ Add New Category</option>
                    </select>
                  ) : (
                    <div className="flex-1 flex gap-2">
                      <input type="text" placeholder="New Category Name..." value={newCustomCategoryName} onChange={e => setNewCustomCategoryName(e.target.value)} className="flex-1 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none focus:border-orange-500" autoFocus />
                      <button type="button" onClick={() => { setIsAddingNewCatInput(false); setNewCustomCategoryName(''); }} className="px-3 bg-red-500/10 text-red-600 rounded-xl font-bold hover:bg-red-500/20">Cancel</button>
                    </div>
                  )}
                </div>

               {/* Image URL & Availability */}
                <input type="text" placeholder="Image URL (Optional)" value={itemImageInput} onChange={e => setItemImageInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 outline-none focus:border-orange-500" />
                
                {/* 👉 NEW: Recipe (कच्चा माल) Mapping UI */}
                <div className="pt-2 border-t border-neutral-300 dark:border-neutral-800">
                  <label className="font-black uppercase text-green-600 mb-2 block">Recipe Mapping (कच्चा माल)</label>
                  
                 {itemRecipe.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {itemRecipe.map((rec, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-2 rounded-lg border border-green-200 dark:border-green-800/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-green-800 dark:text-green-400">{rec.name}</span>
                            {/* 👉 NEW: यहाँ साफ़-साफ़ दिखेगा कि यह माल Half के लिए है या Full के लिए */}
                            <span className="text-[8px] font-black uppercase text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1 mt-0.5 rounded w-fit border border-orange-200 dark:border-orange-800">
                              For: {rec.variant && rec.variant !== 'All' ? rec.variant : 'All Sizes (सभी साइज़)'}
                            </span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] font-black">{rec.qty} {rec.unit}</span>
                            <button type="button" onClick={() => setItemRecipe(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><SafeTrash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

  {/* 👉 UPDATE: Smart Searchable Dropdown for Raw Materials */}
                  <div className="flex gap-2">
                    
                    {/* 🔍 Searchable Dropdown Wrapper */}
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        placeholder="🔍 कच्चा माल खोजें / चुनें..." 
                        value={recipeSearchTerm}
                        onChange={e => {
                          setRecipeSearchTerm(e.target.value);
                          setShowRawDropdown(true);
                          setSelectedRawId(''); // टाइप करने पर पुरानी सेलेक्शन हटा दें
                        }}
                        onFocus={() => setShowRawDropdown(true)}
                        onBlur={() => setTimeout(() => setShowRawDropdown(false), 200)}
                        className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 text-xs font-bold outline-none focus:border-green-500"
                      />
                      
                      {/* लटकती हुई (Floating) लिस्ट जो टाइप करने पर फ़िल्टर होगी */}
                      {showRawDropdown && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl">
                          {rawMaterials.filter(rm => rm.name.toLowerCase().includes(recipeSearchTerm.toLowerCase())).map(rm => (
                            <div 
                              key={rm.id} 
                              onClick={() => {
                                setSelectedRawId(rm.id);
                                setRecipeSearchTerm(`${rm.name} (${rm.unit})`);
                                setShowRawDropdown(false);
                              }}
                              className="p-2 text-xs border-b border-neutral-100 dark:border-neutral-800 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer text-neutral-800 dark:text-neutral-200"
                            >
                              {rm.name} <span className="text-[10px] text-neutral-500">({rm.unit})</span>
                            </div>
                          ))}
                          {rawMaterials.filter(rm => rm.name.toLowerCase().includes(recipeSearchTerm.toLowerCase())).length === 0 && (
                            <div className="p-2 text-xs text-neutral-500 text-center">कोई आइटम नहीं मिला</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* अगर आइटम में Variants हैं, तो ये ड्रॉपडाउन दिखेगा */}
                    {hasVariants && Object.keys(itemVariantsList).length > 0 && (
                      <select value={selectedRawVariant} onChange={e => setSelectedRawVariant(e.target.value)} className="w-24 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 text-xs font-bold outline-none cursor-pointer focus:border-orange-500">
                        <option value="All">All Sizes</option>
                        {Object.keys(itemVariantsList).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    )}

                    <input type="number" step="0.0001" min={0} placeholder="Qty" value={selectedRawQty} onChange={e => setSelectedRawQty(e.target.value === '' ? '' : Number(e.target.value))} className="w-16 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-lg p-2 text-xs font-mono outline-none focus:border-green-500 text-center" />
                    
                    <button type="button" onClick={() => {
                      if (!selectedRawId || !selectedRawQty) return toast.error("कच्चा माल और मात्रा चुनें!");
                      const matched = rawMaterials.find(r => r.id === selectedRawId);
                      if (matched) {
                        setItemRecipe(prev => [...prev, { 
                          rawId: matched.id, 
                          name: matched.name, 
                          qty: Number(selectedRawQty), 
                          unit: matched.unit,
                          variant: hasVariants ? selectedRawVariant : 'All' 
                        }]);
                        setSelectedRawId(''); setSelectedRawQty(''); setSelectedRawVariant('All');
                        setRecipeSearchTerm(''); // 👉 Add करने के बाद बॉक्स को खाली कर दें
                      }
                    }} className="bg-green-600 hover:bg-green-500 text-white px-3 rounded-lg font-black text-[10px] uppercase shadow-sm">Add</button>
                  </div>
                  <p className="text-[9px] text-neutral-500 mt-1.5 font-bold">यह आइटम बिकने पर, ऊपर चुना गया कच्चा माल स्टॉक से अपने-आप कट जाएगा।</p>
                </div>
                
                <div className="flex items-center gap-2 px-1">
                  <input type="checkbox" id="availCheckbox" checked={itemIsAvailable} onChange={e => setItemIsAvailable(e.target.checked)} className="w-4 h-4 accent-orange-600 cursor-pointer" />
                  <label htmlFor="availCheckbox" className="font-bold cursor-pointer select-none">Item is Available (In Stock)</label>
                </div>

                {/* Variants / Portions (Forsan) Section */}
                <div className="pt-3 pb-1 border-t border-neutral-300 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-black uppercase text-orange-600">Variants / Portions (साइज़)</label>
                    <button type="button" onClick={() => setHasVariants(!hasVariants)} className={`px-2 py-1 rounded text-[10px] font-black uppercase transition-all shadow-sm ${hasVariants ? 'bg-orange-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'}`}>
                      {hasVariants ? 'Enabled ✓' : '+ Enable Variants'}
                    </button>
                  </div>

                  {hasVariants && (
                    <div className="space-y-3 bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => handleApplyVariantPreset('half_full')} className="px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-[9px] font-bold hover:border-orange-500">Half/Full</button>
                        <button type="button" onClick={() => handleApplyVariantPreset('reg_large')} className="px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-[9px] font-bold hover:border-orange-500">Reg/Large</button>
                        <button type="button" onClick={() => handleApplyVariantPreset('pizza')} className="px-2 py-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-[9px] font-bold hover:border-orange-500">Pizza Sizes</button>
                      </div>

                      {/* Current Variants List */}
                      {Object.keys(itemVariantsList).length > 0 && (
                        <div className="space-y-1.5">
                          {Object.entries(itemVariantsList).map(([vName, vPrice]) => (
                            <div key={vName} className="flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
                              <span className="font-bold">{vName}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-orange-600 dark:text-orange-400 font-black">₹{String(vPrice)}</span>
                                <button type="button" onClick={() => handleRemoveVariantRow(vName)} className="text-red-500 hover:text-red-600 bg-red-500/10 p-1 rounded"><SafeTrash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Custom Variant */}
                      <div className="flex gap-2 items-center pt-2">
                        <input type="text" placeholder="Name (e.g. Plate)" value={newVariantName} onChange={e => setNewVariantName(e.target.value)} className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 outline-none focus:border-orange-500" />
                        <input type="number" min={0} placeholder="Price (₹)" value={newVariantPrice} onChange={e => setNewVariantPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-20 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 font-mono outline-none focus:border-orange-500" />
                        <button type="button" onClick={handleAddVariantRow} className="bg-neutral-800 dark:bg-neutral-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-neutral-900">Add</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsItemEditorModalOpen(false)} className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white font-black uppercase rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase rounded-xl shadow-lg">Save Item</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* POPUP: ADD / EDIT CUSTOMER PROFILE */}
      <AnimatePresence>
        {isAddEditCustModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-orange-600 flex items-center gap-2">
                  <SafeUserPlus size={18} /> {editingCustProfile ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button onClick={() => setIsAddEditCustModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleSaveCustomerProfile} className="space-y-3">
                
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-neutral-500">Customer Name *</label>
                   <input type="text" required placeholder="e.g. Rahul Kumar" value={custFormName} onChange={e => setCustFormName(e.target.value.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none focus:border-orange-500 text-xs" autoFocus />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-neutral-500">Phone Number (10 Digits) *</label>
                   <input type="tel" maxLength={10} required disabled={!!editingCustProfile} placeholder="e.g. 9876543210" value={custFormPhone} onChange={e => setCustFormPhone(e.target.value.replace(/\D/g, ''))} className={`w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-mono font-bold outline-none text-xs ${editingCustProfile ? 'opacity-60 cursor-not-allowed' : 'focus:border-orange-500'}`} />
                   {editingCustProfile && <p className="text-[9px] text-red-500 italic">फ़ोन नंबर एडिट नहीं किया जा सकता, क्योंकि यह प्राइमरी ID है।</p>}
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-neutral-500">Loyalty Points (Edit/Add)</label>
                   <input type="number" min={0} placeholder="e.g. 150" value={custFormPoints} onChange={e => setCustFormPoints(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-mono font-bold outline-none focus:border-orange-500 text-xs" />
                </div>

                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-neutral-500">Address (Optional)</label>
                   <textarea rows={2} placeholder="Full Delivery Address..." value={custFormAddress} onChange={e => setCustFormAddress(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none focus:border-orange-500 text-xs resize-none" />
                </div>

                {/* 👉 NEW: CUSTOMER NOTES & SPECIAL DATES */}
                <div className="space-y-1 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                   <label className="text-[10px] font-black uppercase text-neutral-500">📝 Customer Note (Preference)</label>
                   <input type="text" placeholder="e.g. Jain Food, Less Spicy, No Mayo..." value={custFormNote} onChange={e => setCustFormNote(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none focus:border-orange-500 text-xs" />
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                   <div className="flex justify-between items-center">
                     <label className="text-[10px] font-black uppercase text-neutral-500">📅 Special Dates (Birthdays)</label>
                     <button type="button" onClick={() => setCustFormSpecialDates([...custFormSpecialDates, {type: 'Birthday', name: '', date: ''}])} className="text-[9px] bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-md font-black uppercase">+ Add Date</button>
                   </div>
                   <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1">
                     {custFormSpecialDates.map((item, index) => (
                       <div key={index} className="flex gap-1.5 items-center bg-neutral-50 dark:bg-neutral-900/50 p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                          <select value={item.type} onChange={e => { const newArr = [...custFormSpecialDates]; newArr[index].type = e.target.value; setCustFormSpecialDates(newArr); }} className="w-20 bg-transparent text-[10px] outline-none font-bold text-neutral-700 dark:text-neutral-300">
                            <option value="Birthday">Birthday</option>
                            <option value="Anniversary">Anniversary</option>
                          </select>
                          <input type="text" placeholder="Name (Self/Kid)" value={item.name} onChange={e => { const newArr = [...custFormSpecialDates]; newArr[index].name = e.target.value; setCustFormSpecialDates(newArr); }} className="w-20 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded p-1 text-[10px] outline-none" />
                          <input type="date" value={item.date} onChange={e => { const newArr = [...custFormSpecialDates]; newArr[index].date = e.target.value; setCustFormSpecialDates(newArr); }} className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded p-1 text-[10px] outline-none" />
                          <button type="button" onClick={() => setCustFormSpecialDates(custFormSpecialDates.filter((_, i) => i !== index))} className="text-red-500 hover:bg-red-100 p-1 rounded"><X size={14}/></button>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsAddEditCustModalOpen(false)} className="flex-1 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white font-black uppercase text-xs rounded-xl hover:bg-neutral-300 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-xl shadow-lg">Save Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP: DRAWER EXPENSE [F6] */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-red-600 flex items-center gap-2"><Receipt size={16} /> Drawer Expense [F6]</h3>
                <button onClick={() => setIsExpenseModalOpen(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
                <input type="text" required placeholder="Expense Title (e.g. Milk 5L)" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border rounded-xl p-2.5 font-bold outline-none" autoFocus />
                <input type="number" required min={1} placeholder="Amount (₹)" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-neutral-100 dark:bg-neutral-950 border rounded-xl p-2.5 font-mono text-sm outline-none font-bold" />
                <button type="submit" className="w-full py-2.5 bg-red-600 text-white font-black uppercase text-xs rounded-xl shadow">Save Expense</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
{/* POPUP: PARKED / HELD CARTS */}
      <AnimatePresence>
        {isHeldCartsModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0">
                <div>
                  <h3 className="font-black text-sm uppercase text-amber-600 flex items-center gap-2">
                    <SafePauseCircle size={18} /> Parked Carts ({heldCarts.length})
                  </h3>
                  <p className="text-[10px] text-neutral-500">होल्ड किये गए कस्टमर के आर्डर रिस्टोर करें</p>
                </div>
                <button onClick={() => setIsHeldCartsModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                {heldCarts.length === 0 ? (
                  <div className="text-center py-10">
                     <p className="text-xs text-neutral-500 font-bold">कोई भी कार्ट होल्ड (Park) पर नहीं है।</p>
                  </div>
                ) : (
                  heldCarts.map(cartObj => (
                    <div key={cartObj.id} className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl flex justify-between items-center shadow-sm hover:border-amber-500 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-neutral-900 dark:text-white">👤 {cartObj.customerName}</p>
                        <p className="text-[10px] text-neutral-500 font-mono mt-1">
                          ⏰ {cartObj.heldAt} • 🛒 {cartObj.cart.length} Items • 🪑 {cartObj.tableNumber}
                        </p>
                        <p className="text-xs font-black text-green-600 dark:text-green-400 mt-1">
                          Total: ₹{cartObj.total}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRestoreHeldCart(cartObj)} 
                          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-1"
                        >
                          <SafePlayCircle size={14} /> Restore
                        </button>
                        <button 
                          onClick={() => handleDeleteHeldCart(cartObj.id)} 
                          className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 px-3 py-2 rounded-xl text-xs font-black uppercase transition-colors"
                        >
                          <SafeTrash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* POPUP: CUSTOMER ORDER HISTORY (SMART CRM) */}
      <AnimatePresence>
        {isCustHistoryModalOpen && selectedHistoryCust && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-2xl w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3 shrink-0">
                <div>
                  <h3 className="font-black text-sm uppercase text-blue-600 flex items-center gap-2">
                    <History size={18} /> Customer Profile & History
                  </h3>
                  <p className="text-[11px] text-neutral-900 dark:text-white font-black mt-1">
                    👤 {selectedHistoryCust.name} <span className="text-neutral-500 font-mono">({selectedHistoryCust.phone || selectedHistoryCust.id})</span>
                  </p>
                </div>
                <button onClick={() => setIsCustHistoryModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors bg-neutral-100 dark:bg-neutral-800 p-2 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto pr-1 flex-1 space-y-4">
                {isCustHistoryLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
                ) : (
                  <>
                    {/* 📊 SMART INSIGHTS SECTION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
                      
                      {/* Loyalty & Game Box */}
                      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 rounded-2xl flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 mb-1">⭐ Loyalty Analytics</p>
                          <div className="flex justify-between items-center text-xs font-bold text-neutral-700 dark:text-neutral-300">
                            <span>Current Balance:</span>
                            <span className="font-black text-amber-600 text-sm">{selectedHistoryCust.points || 0} Pts</span>
                          </div>
                          {customerInsights && (
                            <>
                              <div className="flex justify-between items-center text-[10px] mt-1">
                                <span className="text-green-600 dark:text-green-400">Total Earned Lifetime:</span>
                                <span>+{customerInsights.totalEarned} Pts</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-red-500 dark:text-red-400">Total Redeemed Lifetime:</span>
                                <span>-{customerInsights.totalRedeemed} Pts</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                       {/* Game Status */}
{(selectedHistoryCust.lastPrizeWon || selectedHistoryCust.lastCatchGameScore !== undefined) && (
  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/50 space-y-1.5">
     <p className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400">🎰 Game Records</p>
     
     {/* Spin Game Record */}
     {selectedHistoryCust.lastPrizeWon && (
       <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
         <p className="text-[9px] font-bold text-neutral-500">🎡 Spin Wheel:</p>
         <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Won: <span className="text-green-600">{selectedHistoryCust.lastPrizeWon}</span></p>
         <p className="text-[9px] text-neutral-500">Status: {selectedHistoryCust.voucherClaimed ? 'Claimed ✅' : 'Not Claimed Yet 🟡'}</p>
       </div>
     )}

     {/* Catch Game Record */}
     {selectedHistoryCust.lastCatchGameScore !== undefined && (
       <div className="bg-white/50 dark:bg-black/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
         <p className="text-[9px] font-bold text-neutral-500">🍔 Catch Game:</p>
         <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Last Score: <span className="text-orange-600 font-mono font-black">{selectedHistoryCust.lastCatchGameScore}</span></p>
         <p className="text-[9px] text-neutral-500">Today's Points Used: {selectedHistoryCust.todayGamePoints || 0}/20</p>
         {selectedHistoryCust.lastGameDate && <p className="text-[8px] text-neutral-400">Played On: {selectedHistoryCust.lastGameDate}</p>}
       </div>
     )}
  </div>
)}
                      </div>

                      {/* Favorite Items Box */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 p-3 rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-500 mb-2">❤️ Most Purchased Items (फेवरेट)</p>
                        {customerInsights?.favoriteItems?.length ? (
                          <div className="space-y-1.5">
                            {customerInsights.favoriteItems.map(([itemName, qty]: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center bg-white dark:bg-neutral-800 px-2 py-1.5 rounded-lg shadow-sm border border-blue-100 dark:border-neutral-700">
                                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate pr-2">#{idx+1} {itemName}</span>
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 rounded">Ordered {qty}x</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-500 italic">Not enough data yet.</p>
                        )}
                      </div>
                    </div>

                    {/* 🛍️ BILLING HISTORY LIST */}
                    <div className="pt-2">
                      <h4 className="text-[10px] font-black uppercase text-neutral-500 mb-2">🛍️ Past Bills ({custHistoryList.length} Found)</h4>
                      {custHistoryList.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded-xl border-neutral-300 dark:border-neutral-700">
                           <p className="text-xs text-neutral-500 font-bold">इस ग्राहक का कोई पुराना बिल नहीं मिला।</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {custHistoryList.map((order, index) => {
                            const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || Date.now());
                            return (
                              <div key={order.id} className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/50 p-3 rounded-2xl flex flex-col gap-2 hover:border-blue-400 transition-colors">
                                
                                <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700 pb-2">
                                  <div className="flex gap-2 items-center">
                                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">Bill #{order.billNumber}</span>
                                    <span className="text-[9px] font-black text-neutral-500 bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded uppercase">{order.fulfillmentType || 'pickup'}</span>
                                    <span className="text-[9px] font-bold text-neutral-400">{orderDate.toLocaleString()}</span>
                                  </div>
                                  
                                  {/* Point Transaction for this Bill */}
                                  <div className="flex gap-1.5">
                                    {order.pointsEarned > 0 && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[9px] font-black px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">+ {order.pointsEarned} Pts</span>}
                                    {order.pointsRedeemed > 0 && <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">- {order.pointsRedeemed} Pts</span>}
                                  </div>
                                </div>
                                
                                <div className="flex justify-between items-end">
                                  <div className="text-[11px] text-neutral-600 dark:text-neutral-300 font-medium space-y-0.5">
                                    {order.items?.map((it: any, i: number) => (
                                      <p key={i}>• {it.name} <span className="font-bold text-orange-600 dark:text-orange-400">x{it.quantity}</span></p>
                                    ))}
                                    {order.promoCodeUsed && (
                                      <p className="text-orange-500 mt-1 font-bold text-[10px]">🎟️ Coupon: {order.promoCodeUsed}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded block mb-1 ${order.paymentMethod === 'upi' ? 'bg-blue-500/15 text-blue-600' : order.paymentMethod === 'due' ? 'bg-red-500/15 text-red-600' : 'bg-green-500/15 text-green-600'}`}>
                                      {order.paymentMethod || 'cash'}
                                    </span>
                                    <span className="font-mono font-black text-green-600 dark:text-green-400 text-base">₹{order.total}</span>
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* POPUP: CATEGORY MANAGER MODAL (REORDER CATS) */}
      <AnimatePresence>
        {isCatManagerModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-orange-600 flex items-center gap-2">
                  <ArrowLeftRight size={18} /> Category Manager
                </h3>
                <button onClick={() => setIsCatManagerModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              {/* Reorder Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-neutral-500">Reorder Categories (Left / Right)</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-neutral-100 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  {categories.filter(c => c !== 'All' && c !== '⭐ Top Items').map((cat, idx, arr) => (
                    <div key={cat} className="flex items-center gap-1 bg-white dark:bg-neutral-800 p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-sm">
                      <button onClick={() => handleMoveCategory(cat, 'left')} disabled={idx === 0} className="p-1 text-neutral-500 hover:text-orange-600 disabled:opacity-30"><SafeChevronLeft size={14} /></button>
                      <span className="text-xs font-bold px-1">{cat}</span>
                      <button onClick={() => handleMoveCategory(cat, 'right')} disabled={idx === arr.length - 1} className="p-1 text-neutral-500 hover:text-orange-600 disabled:opacity-30"><SafeChevronRight size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Merge Section */}
              <div className="space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-black uppercase text-neutral-500">Merge Categories (Combine Items)</p>
                <div className="flex flex-col gap-2">
                  <select value={mergeSourceCat} onChange={e => setMergeSourceCat(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none text-xs">
                    <option value="">Select Source Category (From)</option>
                    {categories.filter(c => c !== 'All' && c !== '⭐ Top Items').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex justify-center text-neutral-400"><ArrowLeftRight size={16} className="rotate-90" /></div>
                  <select value={mergeTargetCat} onChange={e => setMergeTargetCat(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl p-2.5 font-bold outline-none text-xs">
                    <option value="">Select Target Category (To)</option>
                    {categories.filter(c => c !== 'All' && c !== '⭐ Top Items').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={handleMergeCategories} className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs rounded-xl shadow-lg mt-1">
                    Merge Categories
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* CUSTOMER DIRECTORY MODAL [F11] */}
      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen} 
        setIsCustomerModalOpen={setIsCustomerModalOpen} 
        customerSearchQuery={customerSearchQuery} 
        setCustomerSearchQuery={setCustomerSearchQuery} 
        searchedCustomers={searchedCustomers} 
        isSearchingCustomer={isSearchingCustomer} 
        newCustName="" setNewCustName={() => {}} 
        newCustPhone="" setNewCustPhone={() => {}} 
        newCustAddress="" setNewCustAddress={() => {}} 
        editingCustomer={null} viewingHistoryCustomer={null} 
        customerHistoryList={[]} editCustPoints={0} 
        setEditCustPoints={() => {}} 
        handleSelectCustomer={(cust: any) => {
          setCustomerPhone(cust.phone); 
          setCustomerName(cust.name || ''); 
          setCustomerPoints(cust.points || 0); 
          setAddress(cust.address || '');
          setIsCustomerModalOpen(false);
          setTimeout(() => searchInputRef.current?.focus(), 60);
        }} 
        handleLoadCustomerHistory={() => {}} 
        handleStartEditProfile={() => {}} 
        handleUpdateCustomerProfile={() => {}} 
        handleSaveNewCustomer={() => {}} 
        setViewingHistoryCustomer={() => {}} 
        setCustomerHistoryList={() => {}} 
        setEditingCustomer={() => {}} 
       searchDbCustomers={() => {}} 
        triggerBeep={triggerBeep}
      />

      {/* 🎰 POPUP: GAME REWARD VERIFICATION MODAL */}
      <AnimatePresence>
        {isGameVerifyModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
              
              {/* हेडर */}
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-purple-500/10 text-purple-600 rounded-xl text-lg">🎰</span>
                  <div>
                    <h3 className="font-black text-sm uppercase text-purple-600 dark:text-purple-400">
                      गेम इनाम वेरिफिकेशन
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-bold">नंबर डालें या विजेता देखें</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowTodaysWinnersList(!showTodaysWinnersList)}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-300 transition-colors shadow-sm"
                  >
                    🏆 आज के विजेता ({todaysGameWinners.length})
                  </button>
                  <button onClick={() => setIsGameVerifyModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* आज के विजेताओं की लिस्ट */}
              {showTodaysWinnersList && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                  <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase mb-2">आज के गेम विजेता</h4>
                  {todaysGameWinners.length === 0 ? (
                    <p className="text-xs text-amber-600">आज अभी तक कोई विजेता नहीं है।</p>
                  ) : (
                    todaysGameWinners.map((winner, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded-lg border border-amber-100 dark:border-neutral-700 shadow-sm">
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-white">{winner.name} <span className="text-[10px] text-neutral-400 font-mono">({winner.phone})</span></p>
                          <p className="text-[10px] font-black text-green-600 dark:text-green-400">{winner.lastPrizeWon}</p>
                        </div>
                        <button 
                          onClick={() => handlePrintGameWinner(winner)}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-sm flex gap-1 items-center"
                        >
                          🖨️ 0 Bill
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* सर्च इनपुट */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="उदा. 9876543210 या BOM-4821" 
                  value={gameSearchInput}
                  onChange={e => setGameSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyGameCode(gameSearchInput)}
                  className="flex-1 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none font-mono uppercase" 
                />
                <button 
                  type="button" 
                  onClick={() => handleVerifyGameCode(gameSearchInput)}
                  disabled={isGameVerifying}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow"
                >
                  {isGameVerifying ? "..." : "जांचें"}
                </button>
              </div>

              {/* परिणाम कार्ड */}
              {gameVerifyResult && (
                <div className={`p-4 rounded-2xl border space-y-2.5 ${
                  gameVerifyResult.voucherClaimed 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                    : gameVerifyResult.lastPrizeWon === 'Better Luck'
                    ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-400 dark:border-green-700'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-sm text-neutral-900 dark:text-white uppercase flex items-center gap-1.5">
                        👤 {gameVerifyResult.name || 'ग्राहक'}
                        <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-black">
                          🎰 Game User
                        </span>
                      </p>
                      <p className="text-xs font-mono text-neutral-500 mt-0.5">📞 {gameVerifyResult.phone || gameVerifyResult.id}</p>
                      {gameVerifyResult.table && (
                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">🪑 {gameVerifyResult.table}</p>
                      )}
                    </div>

                    {gameVerifyResult.voucherCode && (
                      <span className="font-mono font-black text-xs bg-white dark:bg-neutral-900 border px-2 py-1 rounded-lg text-blue-600 shadow-sm">
                        {gameVerifyResult.voucherCode}
                      </span>
                    )}
                  </div>

                 {/* गेम का विवरण (Spin Game या Catch Game) */}
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                    {gameVerifyResult.lastCatchGameScore !== undefined ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-neutral-500">Catch Game Score:</span>
                          <span className="text-sm font-black text-orange-600">{gameVerifyResult.lastCatchGameScore}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-neutral-500">Today's Limit Used:</span>
                          <span className="text-sm font-black text-green-600">{gameVerifyResult.todayGamePoints || 0} / 20 Pts</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-neutral-500">Total Game Balance:</span>
                          <span className="text-sm font-black text-purple-600">🎰 {gameVerifyResult.gamePoints || 0} Pts</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-neutral-500">जीता हुआ इनाम (Spin):</span>
                        <span className={`text-sm font-black ${
                          gameVerifyResult.lastPrizeWon === 'Better Luck' ? 'text-neutral-500' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {gameVerifyResult.lastPrizeWon || 'कोई इनाम नहीं'}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-neutral-400 italic mt-2">
                    खेला गया: {gameVerifyResult.minutesAgo === 0 ? 'अभी-अभी' : `${gameVerifyResult.minutesAgo} मिनट पहले`}
                  </p>

                  {/* एक्शन बटन (सिर्फ Spin Game के लिए क्योंकि Catch Game के पॉइंट्स सीधे कार्ट में रिडीम होते हैं) */}
                  {gameVerifyResult.lastPrizeWon && gameVerifyResult.lastPrizeWon !== 'Better Luck' && (
                    <div className="pt-2">
                      {gameVerifyResult.voucherClaimed ? (
                        <div className="w-full py-2 bg-red-500/10 text-red-600 border border-red-500/20 text-center rounded-xl text-xs font-black uppercase">
                          🚫 यह इनाम पहले ही दिया जा चुका है!
                        </div>
                      ) : (
                        <button 
                          type="button"
                          onClick={handleClaimGameReward}
                          disabled={isClaimingReward}
                          className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase shadow-lg transition-all"
                        >
                          {isClaimingReward ? "अपडेट हो रहा है..." : "✓ इनाम दिया (Mark as Claimed)"}
                        </button>
                      )}
                      
                      <button 
                        type="button"
                        onClick={() => handlePrintGameWinner(gameVerifyResult)}
                        className="w-full mt-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase shadow-lg transition-all"
                      >
                        🖨️ 0 Bill & KOT निकालें (विजेता)
                      </button>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </div>
        )}
     </AnimatePresence>

      {/* 👉 NEW POPUP: TABLE TRANSFER MODAL */}
      <AnimatePresence>
        {isTableTransferModalOpen && tableTransferSourceOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-blue-600 flex items-center gap-2">
                  <ArrowLeftRight size={18} /> Transfer Table
                </h3>
                <button onClick={() => setIsTableTransferModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Current Table (अभी की टेबल):</p>
                  <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">🪑 {tableTransferSourceOrder.tableNumber}</p>
                  <p className="text-xs font-bold text-neutral-600 mt-1">👤 Customer: {tableTransferSourceOrder.customerName || 'Walk-in Guest'}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-neutral-500 mb-2">Select New Table (नयी खाली टेबल चुनें):</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map(tName => {
                      const isOccupied = activeTableOrders.some(o => o.tableNumber === tName);
                      const isCurrent = tName === tableTransferSourceOrder.tableNumber;
                      
                      return (
                        <button
                          key={tName}
                          disabled={isOccupied || isCurrent}
                          onClick={() => setTableTransferTarget(tName)}
                          className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${
                            isCurrent ? 'bg-neutral-200 dark:bg-neutral-800 opacity-50 cursor-not-allowed text-neutral-500' :
                            isOccupied ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-500 opacity-50 cursor-not-allowed' :
                            tableTransferTarget === tName ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105' : 
                            'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:border-blue-400'
                          }`}
                        >
                          {tName.replace('Table ', 'T')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  onClick={handleTransferTableConfirm}
                  disabled={!tableTransferTarget}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all"
                >
                  Confirm Transfer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
           {/* 👉 NEW POPUP: TABLE MERGE MODAL */}
      <AnimatePresence>
        {isTableMergeModalOpen && tableMergeSourceOrder && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-purple-600 flex items-center gap-2">
                  <Plus size={18} /> Merge Tables (बिल मिलाएं)
                </h3>
                <button onClick={() => setIsTableMergeModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white"><X size={20} /></button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800/50">
                  <p className="text-[10px] font-black uppercase text-neutral-500">Source Table (यह बिल उठेगा):</p>
                  <p className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">🪑 {tableMergeSourceOrder.tableNumber}</p>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase text-neutral-500 mb-2">Select Target Table (किस टेबल में जोड़ना है?):</p>
                  <div className="grid grid-cols-2 gap-2">
                    {activeTableOrders.map(o => {
                      if (o.id === tableMergeSourceOrder.id) return null; // खुद को न दिखाएं
                      return (
                        <button
                          key={o.id}
                          onClick={() => setTableMergeTargetOrderId(o.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-black uppercase border transition-all ${
                            tableMergeTargetOrderId === o.id ? 'bg-purple-600 border-purple-600 text-white shadow-md scale-105' : 
                            'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 hover:border-purple-400 text-neutral-700 dark:text-white'
                          }`}
                        >
                          {o.tableNumber.replace('Table ', 'T')} <br/>
                          <span className="text-[9px] font-mono opacity-80">(₹{o.total})</span>
                        </button>
                      );
                    })}
                    {activeTableOrders.length <= 1 && (
                      <p className="text-xs text-neutral-500 col-span-2 py-2">मर्ज करने के लिए कोई दूसरी टेबल चालू नहीं है।</p>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleMergeTableConfirm}
                  disabled={!tableMergeTargetOrderId}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all"
                >
                  Merge Bills
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 👉 NEW POPUP: RAW MATERIAL MODAL */}
      <AnimatePresence>
        {isRawModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-green-600 flex items-center gap-2">
                  <SafePackagePlus size={18} /> {editRawId ? 'Update Stock' : 'Add Raw Material'}
                </h3>
                <button onClick={() => setIsRawModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white"><X size={20} /></button>
              </div>
              
           <form onSubmit={async (e) => {
                e.preventDefault();
                
                const trimmedName = rawFormName.trim();
                if (!trimmedName) return toast.error("नाम डालना अनिवार्य है!");

                // 👉 NEW: Duplicate Check (एक ही नाम का माल दोबारा न बने)
                const isDuplicate = rawMaterials.some(r => r.name.toLowerCase() === trimmedName.toLowerCase() && r.id !== editRawId);
                if (isDuplicate) {
                  return toast.error(`"${trimmedName}" नाम का माल पहले से मौजूद है! कृपया कोई दूसरा नाम दें।`);
                }

                const toastId = toast.loading("Saving...");
                try {
                  let payload: any = { 
                    name: trimmedName, 
                    unit: rawFormUnit, 
                    lowAlert: Number(rawFormLowAlert) 
                  };

                  if (editRawId) {
                    let finalStock = Number(rawFormStock);
                    let finalRec = Number(rawTotalReceived) || 0;
                    let finalCons = Number(rawTotalConsumed) || 0;
                    let actQty = Number(rawActionQty);

                    if (actQty > 0) {
                      if (rawActionType === 'add') {
                         finalStock += actQty;
                         finalRec += actQty;
                      } else if (rawActionType === 'reduce') {
                         finalStock = Math.max(0, finalStock - actQty);
                         finalCons += actQty;
                      } else if (rawActionType === 'set') {
                         finalStock = actQty;
                      }
                    }
                    
                    payload.stock = finalStock;
                    payload.totalReceived = finalRec;
                    payload.totalConsumed = finalCons;

                    await updateDoc(doc(db, "raw_materials", editRawId), payload);
                  } else {
                    payload.stock = Number(rawFormStock);
                    payload.totalReceived = Number(rawFormStock); // पहली बार डाला गया स्टॉक, आया हुआ माना जायेगा
                    payload.totalConsumed = 0;
                    await addDoc(collection(db, "raw_materials"), payload);
                  }
                  
                  toast.dismiss(toastId);
                  toast.success("Raw Material Saved! ✅");
                  setIsRawModalOpen(false);
                } catch (err) {
                  toast.dismiss(toastId);
                  toast.error("Failed to save!");
                }
              }} className="space-y-4">
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-2">
                    <label className="text-[10px] font-black uppercase text-neutral-500">Material Name</label>
                    <input type="text" required value={rawFormName} onChange={e=>setRawFormName(e.target.value)} placeholder="e.g. Milk" className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-green-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-500">Unit (इकाई)</label>
                    <select value={rawFormUnit} onChange={e=>setRawFormUnit(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none cursor-pointer focus:border-green-500">
                      <option value="Kg">Kg</option>
                      <option value="Gram">Gram</option>
                      <option value="Ltr">Litre</option>
                      <option value="Pcs">Pieces</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>
                </div>

                {/* 👉 NEW: Smart Update Options */}
                {editRawId ? (
                  <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <div className="flex justify-between items-center mb-1 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                      <p className="text-[10px] font-black uppercase text-neutral-500">अभी का स्टॉक (Current Stock):</p>
                      <p className="text-sm font-black font-mono text-neutral-900 dark:text-white">{rawFormStock} {rawFormUnit}</p>
                    </div>
                    <label className="text-[10px] font-black uppercase text-neutral-500 block">स्टॉक अपडेट करें (Update Action):</label>
                    <div className="flex gap-1 bg-white dark:bg-neutral-900 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700">
                      <button type="button" onClick={() => setRawActionType('add')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded transition-colors ${rawActionType==='add' ? 'bg-green-600 text-white shadow' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>+ माल आया</button>
                      <button type="button" onClick={() => setRawActionType('reduce')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded transition-colors ${rawActionType==='reduce' ? 'bg-orange-600 text-white shadow' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>- खराब हुआ</button>
                      <button type="button" onClick={() => setRawActionType('set')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded transition-colors ${rawActionType==='set' ? 'bg-blue-600 text-white shadow' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>= सीधा लिखें</button>
                    </div>
                    <input 
                      type="number" 
                      min={0} 
                      step="0.0001" 
                      value={rawActionQty} 
                      onChange={e=>setRawActionQty(e.target.value === '' ? '' : Number(e.target.value))} 
                      placeholder={rawActionType === 'add' ? `कितना ${rawFormUnit} नया आया?` : rawActionType === 'reduce' ? `कितना ${rawFormUnit} खराब/वेस्ट हुआ?` : 'नया स्टॉक बिलकुल सीधा लिखें...'} 
                      className={`w-full bg-white dark:bg-neutral-950 border rounded-lg px-3 py-2.5 text-xs font-mono font-bold outline-none mt-2 transition-colors ${rawActionType === 'add' ? 'border-green-500' : rawActionType === 'reduce' ? 'border-orange-500' : 'border-blue-500'}`} 
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-500">Initial Stock (शुरुआती स्टॉक)</label>
                    <input type="number" required min={0} step="0.0001" value={rawFormStock} onChange={e=>setRawFormStock(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none focus:border-green-500" />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-500">Low Stock Alert Below:</label>
                  <input type="number" required min={0} step="0.0001" value={rawFormLowAlert} onChange={e=>setRawFormLowAlert(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 5" className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none focus:border-red-500" />
                  <p className="text-[9px] text-neutral-400 mt-1">जब स्टॉक इससे कम होगा, तो सिस्टम आपको लाल रंग में वार्निंग देगा।</p>
                </div>
                
                <button type="submit" className="w-full py-3 mt-2 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all">
                  Save Material
               Save Material
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 👉 NEW POPUP: PURCHASE ENTRY (माल की एंट्री) */}
      <AnimatePresence>
        {isPurchaseModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-blue-600 flex items-center gap-2">
                  <SafeFileText size={18} /> Purchase Entry (नया माल)
                </h3>
                <button onClick={() => setIsPurchaseModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white"><X size={20} /></button>
              </div>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!purchaseItemId || !purchaseQty || !purchaseRate) return toast.error("सभी जानकारी भरना अनिवार्य है!");
                
                const toastId = toast.loading("माल चढ़ाया जा रहा है...");
                try {
                  const selectedMaterial = rawMaterials.find(r => r.id === purchaseItemId);
                  const amount = Number(purchaseQty) * Number(purchaseRate);

                  // 1. स्टॉक अपडेट करें
                  const newStock = Number(selectedMaterial.stock || 0) + Number(purchaseQty);
                  const newReceived = Number(selectedMaterial.totalReceived || 0) + Number(purchaseQty);
                  await updateDoc(doc(db, "raw_materials", purchaseItemId), {
                    stock: newStock,
                    totalReceived: newReceived
                  });

                  // 2. परचेस हिस्ट्री सेव करें
                  await addDoc(collection(db, "raw_purchases"), {
                    rawId: purchaseItemId,
                    name: selectedMaterial.name,
                    unit: selectedMaterial.unit,
                    qty: Number(purchaseQty),
                    rate: Number(purchaseRate),
                    amount: amount,
                    date: purchaseDate,
                    timestamp: new Date()
                  });

                  // 3. गल्ले के खर्चे (Expense) में जोड़ें
                  if (window.confirm(`क्या इस बिल (₹${amount.toFixed(2)}) को आज के गल्ले के खर्च (Daily Expense) में भी जोड़ना है?`)) {
                     await addDoc(collection(db, "daily_expenses"), {
                        title: `Purchase: ${selectedMaterial.name} (${purchaseQty}${selectedMaterial.unit})`,
                        amount: amount,
                        category: 'Raw Material',
                        timestamp: new Date(),
                        enteredBy: currentUser?.name || 'Staff'
                     });
                     toast.success("खर्च (Expense) में भी जुड़ गया!");
                  }

                  toast.dismiss(toastId);
                  toast.success(`माल सफलतापूर्वक स्टॉक में जुड़ गया! ✅`);
                  setIsPurchaseModalOpen(false);
                } catch (err) {
                  toast.dismiss(toastId);
                  toast.error("एंट्री सेव करने में समस्या आई!");
                }
              }} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-neutral-500">Date (तारीख)</label>
                  <input type="date" required value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-500 cursor-pointer" />
                </div>

               {/* 👉 NEW: Smart Searchable Dropdown */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase text-neutral-500">Item (कच्चा माल)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="🔍 कच्चा माल खोजें / चुनें..." 
                      value={purchaseSearchTerm}
                      onChange={e => {
                        setPurchaseSearchTerm(e.target.value);
                        setShowPurchaseDropdown(true);
                        setPurchaseItemId(''); // टाइप करने पर पुराना चुनाव हट जाएगा
                      }}
                      onFocus={() => setShowPurchaseDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPurchaseDropdown(false), 200)}
                      className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-500 cursor-text"
                    />
                    
                    {/* लटकती हुई (Floating) लिस्ट जो टाइप करने पर फ़िल्टर होगी */}
                    {showPurchaseDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-xl">
                        {rawMaterials.filter(rm => rm.name.toLowerCase().includes(purchaseSearchTerm.toLowerCase())).map(rm => (
                          <div 
                            key={rm.id} 
                            onClick={() => {
                              setPurchaseItemId(rm.id);
                              setPurchaseSearchTerm(`${rm.name} (${rm.unit})`);
                              setShowPurchaseDropdown(false);
                            }}
                            className="p-2.5 text-xs border-b border-neutral-100 dark:border-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-neutral-800 dark:text-neutral-200 transition-colors"
                          >
                            {rm.name} <span className="text-[10px] text-neutral-500">({rm.unit})</span>
                          </div>
                        ))}
                        {rawMaterials.filter(rm => rm.name.toLowerCase().includes(purchaseSearchTerm.toLowerCase())).length === 0 && (
                          <div className="p-2.5 text-xs text-neutral-500 text-center">कोई आइटम नहीं मिला</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-500">Qty (मात्रा)</label>
                    <input type="number" step="0.0001" required min={0.0001} value={purchaseQty} onChange={e=>setPurchaseQty(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 10" className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-500">Rate (भाव / ₹)</label>
                    <input type="number" step="0.01" required min={0} value={purchaseRate} onChange={e=>setPurchaseRate(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 50" className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-400">Total Amount:</span>
                  <span className="text-lg font-black font-mono text-blue-700 dark:text-blue-400">
                    ₹{((Number(purchaseQty) || 0) * (Number(purchaseRate) || 0)).toFixed(2)}
                  </span>
                </div>

                <button type="submit" className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all">
                  Save Entry (चढ़ाएं)
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
