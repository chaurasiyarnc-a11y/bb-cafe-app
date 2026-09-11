

'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, getDoc, getDocs, where, setDoc,
  waitForPendingWrites, deleteDoc, Timestamp
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Settings, 
  Database, RefreshCw, Layers, LogOut, Lock, ToggleLeft, ToggleRight, 
  Trash2, UserPlus, Download, Edit3, FileText, LayoutGrid, ChevronLeft, ChevronRight, 
  Gift, PackagePlus, BarChart3, HelpCircle, PauseCircle, PlayCircle, QrCode, 
  Share2, Calculator, Receipt, IndianRupee, Send, Check, Plus, Eye,
  Users, Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';

import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import PrintCustomerReceipt from '@/components/d-pos/PrintCustomerReceipt';
import PrintKitchenKot from '@/components/d-pos/PrintKitchenKot';

const SafeLock = Lock as any;
const SafeDatabase = Database as any;
const SafeLogOut = LogOut as any;
const SafeToggleRight = ToggleRight as any;
const SafeToggleLeft = ToggleLeft as any;
const SafeShoppingBag = ShoppingBag as any;
const SafeClock = Clock as any; 
const SafeLayers = Layers as any;
const SafePrinter = Printer as any;
const SafeSearch = Search as any;
const SafeX = X as any;
const SafeRefreshCw = RefreshCw as any;
const SafeSettings = Settings as any;
const SafeTrash2 = Trash2 as any;
const SafeUserPlus = UserPlus as any;
const SafeEdit3 = Edit3 as any;
const SafeFileText = FileText as any;
const SafeLayoutGrid = LayoutGrid as any;
const SafeChevronLeft = ChevronLeft as any;
const SafeChevronRight = ChevronRight as any;
const SafeGift = Gift as any;
const SafePackagePlus = PackagePlus as any;
const SafeBarChart3 = BarChart3 as any;
const SafeHelpCircle = HelpCircle as any;
const SafePauseCircle = PauseCircle as any;
const SafePlayCircle = PlayCircle as any;
const SafeQrCode = QrCode as any;
const SafeShare2 = Share2 as any;
const SafeCalculator = Calculator as any;
const SafeSend = Send as any;
const SafePlus = Plus as any;
const SafeEye = Eye as any;
const SafeUsers = Users as any;
const SafeTruck = Truck as any;

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

const PIZZA_ADDONS: { [size: string]: { [addon: string]: number } } = {
  "small": { "Veg Add-on": 10, "Paneer": 20, "Black Olives": 20, "Jalapeno": 20, "Extra Cheese": 20, "Mushroom": 20 },
  "medium": { "Veg Add-on": 10, "Paneer": 30, "Black Olives": 30, "Jalapeno": 30, "Extra Cheese": 30, "Mushroom": 30 },
  "large": { "Veg Add-on": 20, "Paneer": 40, "Black Olives": 40, "Jalapeno": 40, "Extra Cheese": 40, "Mushroom": 40 },
  "extra large": { "Veg Add-on": 30, "Paneer": 50, "Black Olives": 50, "Jalapeno": 50, "Extra Cheese": 60, "Mushroom": 50 }
};

const COOKING_TAGS = ['🌶️ Less Spicy', '🧅 No Onion/Garlic', '📦 Parcel/To-Go', '🧊 Less Ice', '🧀 Extra Dip', '☕ Kadak'];

let globalAudioCtx: AudioContext | null = null;

// ⭐ CATEGORY-WISE NUMERIC CODE SERIES (1 से Burger, 100 से Chinese, 200 से Bread/Paratha...) ⭐
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
  const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'receipts' | 'settings' | 'orders' | 'tables' | 'reports'>('billing');

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [kotEnabled, setKotEnabled] = useState<boolean>(true); 
  const [upiIdConfig, setUpiIdConfig] = useState<string>('Q991347275@ybl');
  const [ownerPhoneConfig, setOwnerPhoneConfig] = useState<string>('919714293759');
  const [manualInvoiceCounterInput, setManualInvoiceCounterInput] = useState<string>('200');

  // Customer Directory States
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  
  const [showNewCustForm, setShowNewCustForm] = useState(false);
  const [newCustNameInput, setNewCustNameInput] = useState('');
  const [newCustAddressInput, setNewCustAddressInput] = useState('');

  // Menu States
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Reports States
  const [reportFilter, setReportFilter] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customReportDate, setCustomReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportOrders, setReportOrders] = useState<any[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<any[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [physicalCashInput, setPhysicalCashInput] = useState<number | ''>('');

  // Modals States
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isItemEditorModalOpen, setIsItemEditorModalOpen] = useState(false);

  // Dynamic Item Editor States
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

  // Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState('Milk / Dairy');

  // Change Calculator State
  const [tenderCashAmount, setTenderCashAmount] = useState<number | ''>('');

  // Held Carts Storage
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Variation Popup States (Billing)
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedSizePrice, setSelectedSizePrice] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<{ [addon: string]: boolean }>({});
  const [itemNoteInput, setItemNoteInput] = useState('');

  // Past Receipts States
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); 
  const [receiptsLimit, setReceiptsLimit] = useState(50);
  const [isReceiptsLoading, setIsReceiptsLoading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // Cart & Order States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('pickup');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [applyDeliveryFee, setApplyDeliveryFee] = useState<boolean>(false);
  const [customDeliveryFee, setCustomDeliveryFee] = useState<number | ''>(20);
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('Table 1');
  
  const [activeEditingOrderId, setActiveEditingOrderId] = useState<string | null>(null);
  const [activeEditingBillNumber, setActiveEditingBillNumber] = useState<number | null>(null);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'split'>('cash');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitUpiAmount, setSplitUpiAmount] = useState<number>(0);

  // Focus Refs
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const newCustNameRef = useRef<HTMLInputElement | null>(null);
  const newCustAddressRef = useRef<HTMLInputElement | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const firstVariantButtonRef = useRef<HTMLButtonElement | null>(null);
  const addToCartButtonRef = useRef<HTMLButtonElement | null>(null);

  const getSanitizedPhone = (p: string) => p.replace(/\D/g, '').slice(-10);

  // ⭐ INVOICE NUMBER GENERATOR (STARTS AT 200) ⭐
  const getNextBillNumber = (): number => {
    const saved = localStorage.getItem("bb_pos_local_bill_counter_pc");
    let current = saved ? parseInt(saved, 10) : 199;
    if (isNaN(current) || current < 199 || current >= 5000) {
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
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
        osc.frequency.setValueAtTime(1100, globalAudioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.3);
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

  const getTotalBillPrice = () => Math.max(0, getCartSubtotal() + getGstAmountCalculated() - getCalculatedDiscountAmount() - getRedemptionDiscount()) + getDeliveryCharge();

  // Active Orders Filters
  const activeLiveOrders = useMemo(() => liveOrders.filter((o) => (o.fulfillmentType === 'delivery' || o.fulfillmentType === 'pickup') && o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const activeTableOrders = useMemo(() => liveOrders.filter((o) => o.fulfillmentType === 'table' && o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const pendingOrdersCount = useMemo(() => activeLiveOrders.filter((o) => o.status === 'pending').length, [activeLiveOrders]);
  const activeTablesCount = useMemo(() => activeTableOrders.length, [activeTableOrders]);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Internet re-connected! 🟢");
      syncOfflineOrders();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast("Working Offline! 🟠", { icon: '⚠️' });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineOrders = async () => {
    const offlineStr = localStorage.getItem("bb_pos_offline_orders_queue");
    if (!offlineStr) return;
    try {
      const queue: any[] = JSON.parse(offlineStr);
      if (queue.length > 0) {
        for (const ord of queue) {
          await addDoc(collection(db, "orders"), ord);
        }
        localStorage.removeItem("bb_pos_offline_orders_queue");
        toast.success(`Synced ${queue.length} offline orders! ✅`);
      }
    } catch (e) {}
  };

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

  // ⭐ HOLD & RESTORE FUNCTIONS ⭐
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
    setDiscountValue(0);
    setIsRedeemingPoints(false);
    setPointsToRedeem(0);
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

  // Load Saved Settings & Initialize Bill Counter at 199 (Next will be 200)
  useEffect(() => {
    const savedHeld = localStorage.getItem("bb_pos_held_carts");
    if (savedHeld) {
      try { setHeldCarts(JSON.parse(savedHeld)); } catch (e) {}
    }
    const savedUpi = localStorage.getItem("bb_pos_upi_id");
    if (savedUpi) {
      setUpiIdConfig(savedUpi);
    } else {
      setUpiIdConfig('Q991347275@ybl');
    }

    const savedOwnerPhone = localStorage.getItem("bb_pos_owner_phone");
    if (savedOwnerPhone) setOwnerPhoneConfig(savedOwnerPhone);

    const savedCounter = localStorage.getItem("bb_pos_local_bill_counter_pc");
    if (!savedCounter || Number(savedCounter) < 199 || Number(savedCounter) >= 5000) {
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
    setGstEnabled(localStorage.getItem("bb_pos_gst_enabled_pc") === 'true');
    setGstRate(Number(localStorage.getItem("bb_pos_gst_rate_pc")) || 5);
    setKotEnabled(localStorage.getItem("bb_pos_kot_enabled_pc") !== 'false'); 

    const localTheme = localStorage.getItem("bb_pos_theme_pc") || 'light';
    setThemeMode(localTheme as any);
    if (localTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const savedCart = localStorage.getItem("bb_pos_saved_cart_pc");
    if (savedCart) { 
      try { setCart(JSON.parse(savedCart)); } catch (err) {} 
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("bb_pos_saved_cart_pc", JSON.stringify(cart));
  }, [cart]);

  // Clean Categories Deduplication
  const normalizeCategoryList = (rawItems: any[]) => {
    const cleaned = rawItems.map((i: any) => {
      const c = (i.category || 'Burgers').trim();
      return c.charAt(0).toUpperCase() + c.slice(1);
    });
    const unique = Array.from(new Set(cleaned.filter(Boolean))) as string[];
    return ['All', ...unique.sort()];
  };

  // Generate Next Sequential Code within Category Series
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

  // Products Loading with Automatic Category Code Series
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
            return {
              id: d.id,
              ...data,
              category: cat,
              itemCode: data.itemCode ? String(data.itemCode).trim() : ''
            };
          });

          // Group by category and assign series if empty
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
        toast.error("Error loading products");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

  // Auto-focus on first variant button when Variation Modal opens
  useEffect(() => {
    if (isVariationModalOpen) {
      const timer = setTimeout(() => {
        if (firstVariantButtonRef.current) {
          firstVariantButtonRef.current.focus();
        } else if (addToCartButtonRef.current) {
          addToCartButtonRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isVariationModalOpen]);

  // Real-time listener for orders to sync active tables immediately
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLiveOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Search by exact numeric code or fast-add
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cleanQ = searchQuery.trim().toLowerCase();
      if (!cleanQ) return;

      const exactCodeMatch = products.find(p => String(p.itemCode || '').trim().toLowerCase() === cleanQ);
      if (exactCodeMatch) {
        handleItemClick(exactCodeMatch);
        setSearchQuery('');
        const hasVariants = exactCodeMatch.variants && typeof exactCodeMatch.variants === 'object' && Object.keys(exactCodeMatch.variants).length > 0;
        if (!hasVariants) setTimeout(() => searchInputRef.current?.focus(), 60);
        return;
      }

      if (filteredMenu.length > 0) {
        const item = filteredMenu[0];
        handleItemClick(item);
        setSearchQuery('');
        const hasVariants = item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length > 0;
        if (!hasVariants) setTimeout(() => searchInputRef.current?.focus(), 60);
      } else {
        toast.error("No matching item found!");
      }
    }
  };

  // Customer Phone Enter Key -> Auto Find or Auto Jump to Name
  const handlePhoneInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cleanPhone = getSanitizedPhone(customerPhone);
      if (cleanPhone.length !== 10) {
        return toast.error("Enter a valid 10-digit phone number!");
      }
      await handleCheckLoyaltyWithAutoJump();
    }
  };

  const handleCheckLoyaltyWithAutoJump = async () => {
    triggerBeep('tap');
    const cleanPhone = getSanitizedPhone(customerPhone);
    if (cleanPhone.length !== 10) return toast.error("Enter 10-digit phone!");

    const toastId = toast.loading("Searching customer...");
    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const docSnap = await getDoc(userRef);
      toast.dismiss(toastId);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomerName(data.name || '');
        setCustomerPoints(data.points || 0);
        setAddress(data.address || '');
        setShowNewCustForm(false);
        toast.success(`Found: ${data.name} (${data.points || 0} Pts)`);
        setTimeout(() => searchInputRef.current?.focus(), 80);
      } else {
        setCustomerName('');
        setCustomerPoints(0);
        setShowNewCustForm(true);
        toast("New Customer! Enter Name & press [Enter]", { icon: '👤' });
        setTimeout(() => newCustNameRef.current?.focus(), 80);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Could not fetch customer");
    }
  };

  const handleSaveNewCustomerQuick = async () => {
    const cleanPhone = getSanitizedPhone(customerPhone);
    const nameTrim = newCustNameInput.trim();
    if (!nameTrim) return toast.error("Enter customer name!");

    const toastId = toast.loading("Saving customer...");
    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      await setDoc(userRef, {
        name: nameTrim,
        phone: cleanPhone,
        address: newCustAddressInput.trim(),
        points: 0,
        lastActive: new Date()
      }, { merge: true });

      setCustomerName(nameTrim);
      setAddress(newCustAddressInput.trim());
      setCustomerPoints(0);
      setShowNewCustForm(false);
      setNewCustNameInput('');
      setNewCustAddressInput('');
      toast.dismiss(toastId);
      toast.success("Customer saved & linked! ✅");
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to save customer");
    }
  };

  // Variation Handlers in Item Editor Modal
  const handleAddVariantRow = () => {
    const name = newVariantName.trim();
    const price = Number(newVariantPrice);
    if (!name) return toast.error("Enter variation name (e.g. Half, Full, Butter)!");
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
      setItemVariantsList({
        'Half': Math.round(base * 0.6),
        'Full': base
      });
    } else if (presetType === 'plain_butter') {
      setItemVariantsList({
        'Plain': base,
        'Butter': base + 10,
        'Cheese': base + 30
      });
    } else if (presetType === 'pizza') {
      setItemVariantsList({
        'Small': base,
        'Medium': Math.round(base * 1.6),
        'Large': Math.round(base * 2.2)
      });
    } else if (presetType === 'reg_large') {
      setItemVariantsList({
        'Regular': base,
        'Large': Math.round(base * 1.4)
      });
    }
    toast.success("Applied presets!");
  };

  // Item Editor: Save or Add Category
  const handleOpenItemEditor = (item: any = null) => {
    triggerBeep('tap');
    setIsAddingNewCatInput(false);
    setNewCustomCategoryName('');
    if (item) {
      setEditingItemObj(item);
      setItemNameInput(item.name || '');
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
    setNewVariantName('');
    setNewVariantPrice('');
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

  // Add Item to Cart (Standard or Variation Modal)
  const handleItemClick = (item: any) => {
    triggerBeep('tap');
    const hasItemVariants = item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length > 0;

    if (hasItemVariants) {
      setSelectedProductForVariation(item);
      const firstSize = Object.keys(item.variants)[0];
      const firstPrice = Number(item.variants[firstSize]) || Number(item.price) || 100;
      setSelectedSize(firstSize);
      setSelectedSizePrice(firstPrice);
      setSelectedAddons({});
      setItemNoteInput('');
      setIsVariationModalOpen(true);
    } else {
      const itemPrice = Number(item.price) || 100;
      const cartItemId = `std-${item.id}`;
      setCart((prev) => {
        const existingIndex = prev.findIndex((c) => c.cartItemId === cartItemId);
        if (existingIndex > -1) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + 1 };
          return next;
        }
        return [...prev, { cartItemId, id: item.id, name: item.name, price: itemPrice, quantity: 1 }];
      });
      toast.success(`Added ${item.name}!`);
    }
  };

  const handleAddCustomizedItemToCart = () => {
    if (!selectedProductForVariation) return;
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

    const baseName = selectedProductForVariation.name;
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
    toast.success(`Added ${fullName}!`);
    setTimeout(() => searchInputRef.current?.focus(), 60);
  };

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

  // ⭐ GUARANTEED QR THERMAL PRINTING DIRECT (NO EMPTY QR CODE) ⭐
  const handlePrintReceiptDirect = async (orderObj: any, isKot = false): Promise<void> => {
    return new Promise((resolve) => {
      if (!orderObj || !orderObj.items || orderObj.items.length === 0) return resolve();

      const printWindow = window.open('', '_blank', 'width=420,height=700');
      if (!printWindow) {
        toast.error("Popup blocked! Allow popups for thermal printing.");
        return resolve();
      }

      printWindow.document.write('<!DOCTYPE html><html><head><title>Print Receipt</title>');
      printWindow.document.write(`
        <style>
          @page { size: 80mm auto; margin: 0mm !important; }
          * { font-family: Verdana, Geneva, Tahoma, sans-serif !important; box-sizing: border-box; }
          html, body { margin: 0 !important; padding: 0 !important; width: 80mm !important; background: #ffffff !important; color: #000000 !important; }
          #print-root { width: 68mm !important; max-width: 68mm !important; margin-left: 2mm !important; padding-right: 2mm !important; }
        </style>
      `);

      Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach((styleTag) => {
        printWindow.document.write(styleTag.outerHTML);
      });

      printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
      printWindow.document.close();

      const container = printWindow.document.getElementById('print-root');
      if (container) {
        const root = createRoot(container);
        if (isKot) {
          root.render(<PrintKitchenKot orderObj={orderObj} />);
        } else {
          root.render(<PrintCustomerReceipt orderObj={orderObj} currentUser={currentUser} />);
        }

        // Wait strictly for QR Code Image to finish loading before printing!
        const executePrint = () => {
          if (isKot) {
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
              printWindow.close();
              resolve();
            }, 250);
            return;
          }

          const qrImg = printWindow.document.querySelector('img[alt="UPI QR Code"]') as HTMLImageElement | null;
          if (qrImg) {
            if (qrImg.complete && qrImg.naturalWidth > 0) {
              printWindow.focus();
              printWindow.print();
              printWindow.close();
              resolve();
            } else {
              let printed = false;
              const trigger = () => {
                if (!printed) {
                  printed = true;
                  printWindow.focus();
                  printWindow.print();
                  printWindow.close();
                  resolve();
                }
              };
              qrImg.onload = trigger;
              qrImg.onerror = trigger;
              setTimeout(trigger, 2500); // Safety timeout
            }
          } else {
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
              printWindow.close();
              resolve();
            }, 400);
          }
        };

        setTimeout(executePrint, 200);
      } else {
        resolve();
      }
    });
  };

  // ⭐ SAVE & UPDATE RUNNING TABLE ORDER (BILL REMAINS SAVED IN SIDEBAR & FREES UP CART) ⭐
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
          status: 'pending',
          fulfillmentType: 'table',
          lastUpdated: new Date()
        };

        await updateDoc(orderRef, updatedOrderObj);

        // Immediately reflect in local state for instant sidebar update
        setLiveOrders(prev => prev.map(o => o.id === activeEditingOrderId ? { ...o, ...updatedOrderObj } : o));

        triggerBeep('success');
        toast.success(`Table ${tableNumber} updated! Running KOT printed. 🪑`);

        if (kotEnabled) {
          await handlePrintReceiptDirect({ ...updatedOrderObj, billNumber, tokenNumber: token, fulfillmentType: 'table' }, true);
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
          status: 'pending', 
          fulfillmentType: 'table', 
          deliveryArea: "", 
          tableNumber: tableNumber, 
          paymentMethod, 
          source: 'PC_POS', 
          address: '',
          upiId: upiIdConfig
        };

        const docRef = await addDoc(collection(db, "orders"), orderObj);
        
        // Immediately reflect in local state for instant sidebar update
        setLiveOrders(prev => [{ id: docRef.id, ...orderObj }, ...prev]);

        triggerBeep('success');
        toast.success(`Table ${tableNumber} Saved on Table! KOT printed. 🪑`);

        if (kotEnabled) {
          await handlePrintReceiptDirect(orderObj, true);
        }
      }

      // ⭐ CLEAR CART SO CASHIER CAN ATTEND OTHER TABLES ⭐
      setCart([]); 
      setCustomerPhone(''); 
      setCustomerName(''); 
      setDiscountValue(0); 
      setIsRedeemingPoints(false); 
      setPointsToRedeem(0);
      setActiveEditingOrderId(null);
      setActiveEditingBillNumber(null);
      localStorage.removeItem("bb_pos_saved_cart_pc");
      setTimeout(() => searchInputRef.current?.focus(), 60);

    } catch (err) {
      console.error(err);
      toast.error("Failed to save table order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Final Checkout & Settle [F9] (Invoice Starts from 200)
  const handleFinalCheckoutAndPrintBill = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const finalTotal = getTotalBillPrice();
    const discountAmt = getCalculatedDiscountAmount();
    const token = getDailyTokenNumber();
    const earned = Math.floor(finalTotal / 100);
    const redeemed = isRedeemingPoints ? pointsToRedeem : 0;
    const cleanPhone = getSanitizedPhone(customerPhone);

    try {
      let billNumber: number;
      let remainingPts = customerPoints;

      if (cleanPhone.length === 10 && navigator.onLine) {
        const userRef = doc(db, "customer_points", cleanPhone);
        const userDoc = await getDoc(userRef);
        const prevPoints = userDoc.exists() ? (Number(userDoc.data().points) || 0) : 0;
        remainingPts = Math.max(0, prevPoints - redeemed) + earned;
        await setDoc(userRef, { name: customerName || "Walk-in Guest", phone: cleanPhone, points: remainingPts, lastActive: new Date() }, { merge: true });
      }

      if (activeEditingOrderId) {
        billNumber = activeEditingBillNumber || getNextBillNumber();
        const orderRef = doc(db, "orders", activeEditingOrderId);
        const finalOrderObj = { 
          items: cart, 
          subtotal, 
          discountType,
          discountValue,
          discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, 
          gstAmount: getGstAmountCalculated(), 
          total: finalTotal, 
          status: 'completed', 
          tableNumber: tableNumber,
          customerName: customerName || "Walk-in Guest",
          customerPhone: cleanPhone ? `+91${cleanPhone}` : "",
          paymentMethod,
          splitCashAmount: paymentMethod === 'split' ? splitCashAmount : 0,
          splitUpiAmount: paymentMethod === 'split' ? splitUpiAmount : 0,
          pointsEarned: earned,
          pointsRedeemed: redeemed,
          pointsDiscount: redeemed,
          remainingPoints: remainingPts,
          customerPoints: remainingPts,
          upiId: upiIdConfig,
          settledAt: new Date()
        };

        await updateDoc(orderRef, finalOrderObj);
        
        // Remove from active tables
        setLiveOrders(prev => prev.filter(o => o.id !== activeEditingOrderId));

        triggerBeep('success');
        toast.success(`Table ${tableNumber} Settled & Bill #${billNumber} Printed! ✅`);

        await handlePrintReceiptDirect({ ...finalOrderObj, billNumber, tokenNumber: token, fulfillmentType: 'table' }, false);

        setActiveEditingOrderId(null);
        setActiveEditingBillNumber(null);
      } else {
        billNumber = getNextBillNumber();

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
          total: finalTotal, 
          timestamp: new Date(), 
          status: 'completed', 
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
          upiId: upiIdConfig
        };

        if (navigator.onLine) {
          await addDoc(collection(db, "orders"), orderObj);
        } else {
          const cachedQueue = JSON.parse(localStorage.getItem("bb_pos_offline_orders_queue") || "[]");
          cachedQueue.push(orderObj);
          localStorage.setItem("bb_pos_offline_orders_queue", JSON.stringify(cachedQueue));
          toast("Saved offline! 💾", { icon: '💾' });
        }

        triggerBeep('success'); 

        if (kotEnabled) await handlePrintReceiptDirect(orderObj, true);
        await handlePrintReceiptDirect(orderObj, false);
      }

      setCart([]); 
      setCustomerPhone(''); 
      setCustomerName(''); 
      setCustomerPoints(0); 
      setDiscountValue(0); 
      setShowNewCustForm(false);
      setIsRedeemingPoints(false); 
      setPointsToRedeem(0);
      localStorage.removeItem("bb_pos_saved_cart_pc");
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } catch (err) {
      toast.error("Checkout failed");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // WhatsApp Bill Sender
  const handleSendWhatsAppBill = (targetOrder: any = null) => {
    const ord = targetOrder || { customerPhone, customerName, fulfillmentType, items: cart, total: getTotalBillPrice() };
    const clean = getSanitizedPhone(ord.customerPhone || '');
    if (clean.length !== 10) return toast.error("Enter 10-digit phone number!");
    if (!ord.items || ord.items.length === 0) return toast.error("No items in cart!");

    const itemsText = ord.items.map((i: any) => `• ${i.name} x${i.quantity} = ₹${i.price * i.quantity}`).join('%0A');
    const msg = `*☕ BUM BUM CAFE - DIGITAL RECEIPT*%0A------------------------------%0A*Customer:* ${ord.customerName || 'Valued Guest'}%0A*Total Amount:* ₹${ord.total}%0A------------------------------%0A${itemsText}%0A------------------------------%0A_Thank you for visiting Bum Bum Cafe! Visit Again!_ 💛`;
    window.open(`https://wa.me/91${clean}?text=${msg}`, '_blank');
  };

  // Owner EOD Summary WhatsApp
  const handleSendOwnerSummary = () => {
    const cleanOwner = getSanitizedPhone(ownerPhoneConfig);
    const msg = `*☕ BUM BUM CAFE - DAY END SUMMARY*%0A------------------------------%0A*Date:* ${new Date().toLocaleDateString()}%0A*Total Sales:* ₹${reportSummary.totalSale}%0A*Orders Completed:* ${reportSummary.totalOrdersCount}%0A------------------------------%0A*💵 Gross Cash:* ₹${reportSummary.cashSale}%0A*📱 UPI / Bank:* ₹${reportSummary.upiSale}%0A*🧾 Expenses:* -₹${reportSummary.totalExpenseAmount}%0A------------------------------%0A*💰 Net Cash in Drawer:* ₹${reportSummary.netCashInDrawer}%0A------------------------------%0A_Generated via Bum Bum Cafe Desktop POS_`;
    window.open(`https://wa.me/${cleanOwner}?text=${msg}`, '_blank');
  };

  // Daily Drawer Expense Save [F6]
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amt) || amt <= 0) return toast.error("Enter valid title and amount!");
    const toastId = toast.loading("Saving expense...");
    try {
      await addDoc(collection(db, "daily_expenses"), {
        title: expenseTitle.trim(),
        amount: amt,
        category: expenseCategory,
        timestamp: new Date(),
        enteredBy: currentUser?.name || 'Staff'
      });
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

  // Reports Data Fetching
  const fetchReportData = async () => {
    setIsReportLoading(true);
    try {
      let startTarget = new Date();
      let endTarget = new Date();

      if (reportFilter === 'today') {
        startTarget.setHours(0, 0, 0, 0);
        endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'yesterday') {
        startTarget.setDate(startTarget.getDate() - 1);
        startTarget.setHours(0, 0, 0, 0);
        endTarget.setDate(endTarget.getDate() - 1);
        endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'custom' && customReportDate) {
        startTarget = new Date(customReportDate);
        startTarget.setHours(0, 0, 0, 0);
        endTarget = new Date(customReportDate);
        endTarget.setHours(23, 59, 59, 999);
      }

      const qOrders = query(
        collection(db, "orders"),
        where("timestamp", ">=", Timestamp.fromDate(startTarget)),
        where("timestamp", "<=", Timestamp.fromDate(endTarget)),
        orderBy("timestamp", "desc")
      );
      const snapOrders = await getDocs(qOrders);
      setReportOrders(snapOrders.docs.map(d => ({ id: d.id, ...d.data() })));

      const qExpenses = query(
        collection(db, "daily_expenses"),
        where("timestamp", ">=", Timestamp.fromDate(startTarget)),
        where("timestamp", "<=", Timestamp.fromDate(endTarget)),
        orderBy("timestamp", "desc")
      );
      const snapExpenses = await getDocs(qExpenses);
      setDailyExpenses(snapExpenses.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') fetchReportData();
  }, [activeTab, reportFilter, customReportDate]);

  const reportSummary = useMemo(() => {
    let totalSale = 0;
    let cashSale = 0;
    let upiSale = 0;
    let totalOrdersCount = reportOrders.filter(o => o.status !== 'rejected').length;

    reportOrders.forEach(o => {
      if (o.status !== 'rejected') {
        const amt = Number(o.total) || 0;
        totalSale += amt;
        if (o.paymentMethod === 'upi') {
          upiSale += amt;
        } else if (o.paymentMethod === 'split') {
          cashSale += Number(o.splitCashAmount || 0);
          upiSale += Number(o.splitUpiAmount || 0);
        } else {
          cashSale += amt;
        }
      }
    });

    const totalExpenseAmount = dailyExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    const netCashInDrawer = Math.max(0, cashSale - totalExpenseAmount);

    return { totalSale, cashSale, upiSale, totalOrdersCount, totalExpenseAmount, netCashInDrawer };
  }, [reportOrders, dailyExpenses]);

  // Item-wise sales calculation
  const itemWiseSales = useMemo(() => {
    const map: { [name: string]: { qty: number; revenue: number } } = {};
    reportOrders.forEach(o => {
      if (o.status !== 'rejected' && o.items) {
        o.items.forEach((it: any) => {
          const name = it.name || 'Unknown Item';
          if (!map[name]) map[name] = { qty: 0, revenue: 0 };
          map[name].qty += (Number(it.quantity) || 1);
          map[name].revenue += ((Number(it.price) || 0) * (Number(it.quantity) || 1));
        });
      }
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.qty - a.qty);
  }, [reportOrders]);

  // Past Receipts Fetching
  const fetchPastReceipts = async () => {
    setIsReceiptsLoading(true);
    try {
      const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(receiptsLimit));
      const snap = await getDocs(q);
      setPastReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error("Failed to load receipts");
    } finally {
      setIsReceiptsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'receipts') fetchPastReceipts();
  }, [activeTab, receiptsLimit]);

  const filteredPastReceipts = useMemo(() => pastReceipts.filter((o) => 
    String(o.billNumber || '').includes(receiptSearchQuery.trim()) || 
    String(o.customerPhone || '').includes(receiptSearchQuery.trim()) || 
    String(o.customerName || '').toLowerCase().includes(receiptSearchQuery.trim().toLowerCase())
  ), [pastReceipts, receiptSearchQuery]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLoggedIn) return;

      if (e.key === 'F1') { e.preventDefault(); setIsHelpModalOpen(prev => !prev); }
      if (e.key === 'F2') { e.preventDefault(); setActiveTab('billing'); setTimeout(() => searchInputRef.current?.focus(), 80); }
      if (e.key === 'F3') { e.preventDefault(); handleHoldCurrentCart(); }
      if (e.key === 'F4') { e.preventDefault(); setPaymentMethod(p => p === 'cash' ? 'upi' : p === 'upi' ? 'split' : 'cash'); }
      if (e.key === 'F5') { e.preventDefault(); setIsHeldCartsModalOpen(prev => !prev); }
      if (e.key === 'F6') { e.preventDefault(); setIsExpenseModalOpen(prev => !prev); }
      if (e.key === 'F7') { e.preventDefault(); handleSendWhatsAppBill(); }
      if (e.key === 'F8') { e.preventDefault(); if (getTotalBillPrice() > 0) setIsQrModalOpen(prev => !prev); }
      if (e.key === 'F9') { e.preventDefault(); if (cart.length > 0 && !isSubmittingOrder) handleFinalCheckoutAndPrintBill(); }
      if (e.key === 'F10') { e.preventDefault(); setTenderCashAmount(getTotalBillPrice()); setIsChangeModalOpen(prev => !prev); }
      if (e.key === 'F11') { e.preventDefault(); setIsCustomerModalOpen(prev => !prev); }
      if (e.key === 'F12') { e.preventDefault(); setFulfillmentType(prev => prev === 'pickup' ? 'table' : prev === 'table' ? 'delivery' : 'pickup'); }
      if ((e.key === 'Delete' || (e.shiftKey && e.key === 'Backspace')) && document.activeElement?.tagName !== 'INPUT') {
        if (cart.length > 0) setCart([]);
      }
      if (e.key === 'Escape') {
        setIsHelpModalOpen(false);
        setIsHeldCartsModalOpen(false);
        setIsExpenseModalOpen(false);
        setIsQrModalOpen(false);
        setIsChangeModalOpen(false);
        setIsVariationModalOpen(false);
        setIsReceiptModalOpen(false);
        setIsCustomerModalOpen(false);
        setIsItemEditorModalOpen(false);
        setTimeout(() => searchInputRef.current?.focus(), 60);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoggedIn, cart, isSubmittingOrder, paymentMethod, customerName, customerPhone, tableNumber, fulfillmentType, heldCarts]);

  const filteredMenu = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesName = (p.name || '').toLowerCase().includes(queryStr);
      const matchesCode = p.itemCode && String(p.itemCode).toLowerCase().includes(queryStr);
      return matchesCategory && (matchesName || matchesCode);
    });
  }, [products, selectedCategory, searchQuery]);

  const filteredInventoryProducts = useMemo(() => {
    const queryStr = inventorySearchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesName = (p.name || '').toLowerCase().includes(queryStr);
      const matchesCat = (p.category || '').toLowerCase().includes(queryStr);
      const matchesCode = p.itemCode && String(p.itemCode).toLowerCase().includes(queryStr);
      return matchesName || matchesCat || matchesCode;
    });
  }, [products, inventorySearchQuery]);

  // Clean High-Contrast Workspace Base Class
  const mainClass = "h-screen w-screen flex font-sans antialiased overflow-hidden " + (themeMode === "dark" ? "dark bg-[#121212] text-neutral-100" : "bg-[#f4f5f7] text-neutral-900");

  const dynamicUpiUrl = useMemo(() => {
    const total = getTotalBillPrice();
    return `upi://pay?pa=${encodeURIComponent(upiIdConfig.trim())}&pn=Bum%20Bum%20Cafe&am=${total}&cu=INR`;
  }, [upiIdConfig, cart, discountValue, discountType, isRedeemingPoints, pointsToRedeem, fulfillmentType, applyDeliveryFee, customDeliveryFee, gstEnabled, gstRate]);

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
              const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput.trim())));
              if (!snap.empty) {
                const uDoc = snap.docs[0].data();
                setIsLoggedIn(true);
                setCurrentUser({ id: snap.docs[0].id, ...uDoc });
                localStorage.setItem("bb_pos_user_pc", JSON.stringify({ id: snap.docs[0].id, ...uDoc }));
                toast.success(`Welcome, ${uDoc.name}!`);
                setTimeout(() => searchInputRef.current?.focus(), 150);
              } else {
                toast.error("Incorrect PIN!");
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
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 font-bold">POS Pro v3.7</span>
                    </div>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${isOnline ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-orange-500/15 text-orange-700 dark:text-orange-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>

              <nav className="space-y-1.5">
                {[
                  { id: 'billing', label: 'Counter [F2]', icon: ShoppingBag },
                  { id: 'inventory', label: 'Menu & Add Items', icon: Layers },
                  { id: 'receipts', label: 'Past Receipts', icon: Printer },
                  { id: 'tables', label: `Tables (${activeTableOrders.length})`, icon: LayoutGrid },
                  { id: 'orders', label: `Live Orders (${activeLiveOrders.length})`, icon: Clock },
                  { id: 'reports', label: 'Reports & Sales', icon: SafeBarChart3 },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
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
                      {!isSidebarCollapsed && item.id === 'tables' && activeTablesCount > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{activeTablesCount}</span>
                      )}
                      {!isSidebarCollapsed && item.id === 'orders' && pendingOrdersCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingOrdersCount}</span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {!isSidebarCollapsed && (
                <div className="pt-2 border-t border-neutral-300 dark:border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase text-neutral-500 dark:text-neutral-400">POS Tools</span>
                    <button onClick={() => setIsHelpModalOpen(true)} className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1">
                      <SafeHelpCircle size={12} /> Help [F1]
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => setIsHeldCartsModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-800 p-2 rounded-xl text-[10px] font-bold flex items-center gap-1 text-neutral-800 dark:text-white">
                      <SafePauseCircle size={13} className="text-amber-500 shrink-0" />
                      <span className="truncate">Parked ({heldCarts.length}) [F5]</span>
                    </button>
                    <button onClick={() => setIsExpenseModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-800 p-2 rounded-xl text-[10px] font-bold flex items-center gap-1 text-neutral-800 dark:text-white">
                      <Receipt size={13} className="text-red-500 shrink-0" />
                      <span className="truncate">Expense [F6]</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-neutral-300 dark:border-neutral-800">
              <button onClick={async () => {
                setIsSyncing(true);
                await waitForPendingWrites(db);
                await syncOfflineOrders();
                setIsSyncing(false);
                toast.success("Synced Cloud Data!");
              }} disabled={isSyncing} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black uppercase text-amber-700 dark:text-yellow-500 bg-amber-500/15 hover:bg-amber-500/25">
                {isSyncing ? <Loader2 className="animate-spin shrink-0" size={16} /> : <SafeRefreshCw size={16} />}
                {!isSidebarCollapsed && <span className="truncate">Sync Data</span>}
              </button>
              <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); localStorage.removeItem("bb_pos_user_pc"); }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black uppercase text-red-600 bg-red-500/15 hover:bg-red-500/25">
                <SafeLogOut size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Lock Terminal</span>}
              </button>
            </div>
          </aside>

          {/* MAIN WORKSPACE */}
          <main className="flex-1 flex h-full overflow-hidden">
            
            {/* TAB 1: BILLING */}
            {activeTab === 'billing' && (
              <div className="flex-1 flex h-full overflow-hidden">
                <div className="flex-1 flex flex-col p-4 h-full overflow-hidden">
                  
                  {/* RUNNING TABLE INDICATOR BANNER */}
                  {activeEditingOrderId && (
                    <div className="mb-2 bg-amber-500/20 border border-amber-500 p-2.5 rounded-xl flex items-center justify-between shrink-0 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-black uppercase">
                        <SafeEdit3 size={16} />
                        <span>🪑 Table {tableNumber} (Active Bill #{activeEditingBillNumber}) - Add more items or Settle</span>
                      </div>
                      <button onClick={() => { setActiveEditingOrderId(null); setActiveEditingBillNumber(null); setCart([]); }} className="text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white text-xs font-bold underline">
                        Exit Table (Clear)
                      </button>
                    </div>
                  )}

                  {/* SEARCH BAR (F2) */}
                  <div className="flex gap-2.5 mb-2.5 items-center shrink-0">
                    <div className="relative flex-1">
                      <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Search item / Type Code (e.g. 1, 101, 201, 301) & hit [Enter]... [F2]" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchInputKeyDown} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-neutral-900 dark:text-white outline-none focus:border-orange-500 shadow-sm" 
                        autoFocus
                      />
                    </div>
                    <button 
                      onClick={() => handleOpenItemEditor(null)} 
                      className="bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow transition-all shrink-0"
                    >
                      <SafePlus size={15} /> Add Item
                    </button>
                  </div>

                  {/* CATEGORIES - CLEAN 2-LINE COMPACT WRAP */}
                  <div className="flex flex-wrap gap-1.5 pb-2 shrink-0 max-h-20 overflow-y-auto pr-1">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      const count = cat === 'All' ? products.length : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
                      return (
                        <button 
                          key={cat} 
                          onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} 
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1.5 shadow-sm ${
                            isSelected 
                              ? "bg-orange-600 text-white border-orange-600 shadow-md scale-[1.02]" 
                              : "bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-orange-500 hover:text-orange-600"
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${isSelected ? 'bg-black/30 text-white' : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-300'}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* PRODUCTS GRID */}
                  {loading ? (
                    <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                  ) : (
                    <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto flex-1 pr-1.5 content-start">
                      {filteredMenu.map((item) => {
                        const isAvail = item.isAvailable !== false;
                        const imgUrl = item.image || item.imageUrl || item.img;
                        return (
                          <button 
                            key={item.id} 
                            disabled={!isAvail} 
                            onClick={() => handleItemClick(item)} 
                            className={`border rounded-xl text-left flex flex-col overflow-hidden h-40 transition-all duration-150 hover:scale-[1.01] active:scale-95 shadow-sm ${isAvail ? "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 hover:border-orange-500" : "opacity-40 bg-neutral-200 dark:bg-neutral-950 border-neutral-300 dark:border-neutral-800 pointer-events-none"}`}
                          >
                            <div className="w-full h-20 bg-neutral-200 dark:bg-neutral-800 relative shrink-0 overflow-hidden flex items-center justify-center">
                              {imgUrl ? (
                                <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-neutral-500 text-[11px] font-black uppercase tracking-wider px-2 text-center">{item.category || "Cafe Item"}</span>
                              )}
                              {item.itemCode && (
                                <span className="absolute top-1.5 right-1.5 bg-black/90 text-yellow-400 font-mono text-[10px] font-black px-2 py-0.5 rounded border border-yellow-500/50 shadow">
                                  #{item.itemCode}
                                </span>
                              )}
                            </div>
                            <div className="p-2.5 flex-grow flex flex-col justify-between w-full">
                              <p className="font-bold text-xs line-clamp-2 text-neutral-900 dark:text-white leading-tight">{item.name}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-mono font-black text-orange-600 dark:text-orange-400">₹{item.price}</span>
                                <span className="text-[9px] font-bold text-neutral-500 truncate max-w-[90px]">{item.category}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT CART PANEL */}
                <div className="w-96 bg-white dark:bg-neutral-900 border-l border-neutral-300 dark:border-neutral-800 flex flex-col p-4 h-full shadow-2xl justify-between overflow-hidden">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-300 dark:border-neutral-800 pb-2 mb-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase text-orange-600 dark:text-orange-500">Cart ({cart.length})</h3>
                        <button onClick={handleHoldCurrentCart} title="Park Cart [F3]" className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 rounded-md border border-amber-500/40 flex items-center gap-1">
                          <SafePauseCircle size={11} /> Hold [F3]
                        </button>
                      </div>
                      <button onClick={() => setCart([])} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"><SafeTrash2 size={13} /> Clear [Del]</button>
                    </div>

                    {/* CUSTOMER PHONE & AUTO JUMP ON ENTER */}
                    <div className="space-y-1.5 bg-neutral-100 dark:bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 mb-2 shrink-0">
                      <div className="flex gap-1.5">
                        <input 
                          ref={phoneInputRef}
                          type="text" 
                          maxLength={10} 
                          placeholder="Phone No & press [Enter]" 
                          value={customerPhone} 
                          onChange={e => setCustomerPhone(e.target.value)} 
                          onKeyDown={handlePhoneInputKeyDown}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white outline-none font-mono font-bold" 
                        />
                        <button onClick={handleCheckLoyaltyWithAutoJump} className="bg-orange-600 hover:bg-orange-500 text-white px-2.5 rounded-lg text-xs font-black uppercase">Find</button>
                        <button onClick={() => handleSendWhatsAppBill()} title="Send WhatsApp Receipt [F7]" className="bg-green-600/15 hover:bg-green-600/25 text-green-600 dark:text-green-400 px-2 rounded-lg text-xs font-bold flex items-center">
                          <SafeShare2 size={13} />
                        </button>
                      </div>

                      {customerName && !showNewCustForm && (
                        <div className="flex justify-between items-center text-xs font-black text-amber-600 dark:text-yellow-400 pt-1 border-t border-neutral-300 dark:border-neutral-700">
                          <span>👤 {customerName}</span>
                          <span>⭐ Pts: {customerPoints}</span>
                        </div>
                      )}

                      {/* LOYALTY REDEMPTION */}
                      {customerName && customerPoints > 0 && !showNewCustForm && (
                        <div className="pt-1.5 border-t border-neutral-300 dark:border-neutral-700 flex items-center justify-between text-xs">
                          <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">⭐ Redeem ({customerPoints} Pts):</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              min={1} 
                              max={customerPoints}
                              value={pointsToRedeem || ''}
                              onChange={e => setPointsToRedeem(Math.min(Number(e.target.value), customerPoints))}
                              placeholder="Pts"
                              className="w-14 bg-white dark:bg-neutral-900 border border-neutral-400 dark:border-neutral-700 rounded-lg p-1 text-center font-mono text-xs text-neutral-900 dark:text-white outline-none font-bold" 
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (!isRedeemingPoints && pointsToRedeem > 0) {
                                  setIsRedeemingPoints(true);
                                  toast.success(`Redeemed ₹${pointsToRedeem} off!`);
                                } else {
                                  setIsRedeemingPoints(false);
                                  setPointsToRedeem(0);
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isRedeemingPoints ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}
                            >
                              {isRedeemingPoints ? 'Cancel' : 'Apply'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* NEW CUSTOMER REGISTRATION */}
                      {showNewCustForm && (
                        <div className="space-y-1.5 pt-1.5 border-t border-neutral-300 dark:border-neutral-700">
                          <p className="text-[9px] text-amber-700 dark:text-yellow-400 font-black uppercase">New Customer! Type Name & Press [Enter]:</p>
                          <input 
                            ref={newCustNameRef}
                            type="text" 
                            placeholder="Customer Name *" 
                            value={newCustNameInput} 
                            onChange={e => setNewCustNameInput(e.target.value)} 
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                newCustAddressRef.current?.focus();
                              }
                            }}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white outline-none" 
                          />
                          <input 
                            ref={newCustAddressRef}
                            type="text" 
                            placeholder="Address (Optional) & hit [Enter]" 
                            value={newCustAddressInput} 
                            onChange={e => setNewCustAddressInput(e.target.value)} 
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveNewCustomerQuick();
                              }
                            }}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white outline-none" 
                          />
                          <button onClick={handleSaveNewCustomerQuick} className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase rounded-lg flex items-center justify-center gap-1 shadow">
                            <SafeUserPlus size={13} /> Save Customer [Enter]
                          </button>
                        </div>
                      )}
                    </div>

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


{/* ⭐ DISCOUNT OPTION (₹ FLAT / % OFF) ⭐ */}
<div className="space-y-1.5 bg-neutral-100 dark:bg-neutral-800/50 p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 mb-2 shrink-0">
  <div className="flex items-center justify-between">
    <span className="text-[10px] font-black uppercase text-neutral-700 dark:text-neutral-300">
      Discount (छूट)
    </span>
    <div className="flex bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-lg border border-neutral-300 dark:border-neutral-600">
      <button 
        type="button"
        onClick={() => setDiscountType('amount')} 
        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${
          discountType === 'amount' 
            ? 'bg-orange-600 text-white shadow' 
            : 'text-neutral-700 dark:text-neutral-300'
        }`}
      >
        ₹ Flat
      </button>
      <button 
        type="button"
        onClick={() => setDiscountType('percentage')} 
        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${
          discountType === 'percentage' 
            ? 'bg-orange-600 text-white shadow' 
            : 'text-neutral-700 dark:text-neutral-300'
        }`}
      >
        % Off
      </button>
    </div>
  </div>

  <div className="flex items-center gap-1.5">
    <input 
      type="number" 
      min={0}
      placeholder={discountType === 'amount' ? "Enter Discount (₹)" : "Enter Discount (%)"}
      value={discountValue || ''}
      onChange={e => setDiscountValue(Number(e.target.value))}
      className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-900 dark:text-white outline-none font-mono font-bold" 
    />
    {discountValue > 0 && (
      <button 
        type="button"
        onClick={() => setDiscountValue(0)} 
        className="text-red-500 hover:text-red-700 text-xs font-black px-2 py-1 bg-red-500/10 rounded-lg shrink-0"
      >
        Clear
      </button>
    )}
  </div>

  {/* त्वरित छूट बटन (Quick Presets) */}
  <div className="flex gap-1 pt-0.5">
    {discountType === 'percentage' ? (
      [5, 10, 15, 20].map((pct) => (
        <button
          key={pct}
          type="button"
          onClick={() => setDiscountValue(pct)}
          className={`flex-1 py-0.5 rounded text-[9px] font-black border font-mono transition-all ${
            discountValue === pct 
              ? 'bg-orange-600 text-white border-orange-600' 
              : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-500'
          }`}
        >
          {pct}%
        </button>
      ))
    ) : (
      [10, 20, 50, 100].map((amt) => (
        <button
          key={amt}
          type="button"
          onClick={() => setDiscountValue(amt)}
          className={`flex-1 py-0.5 rounded text-[9px] font-black border font-mono transition-all ${
            discountValue === amt 
              ? 'bg-orange-600 text-white border-orange-600' 
              : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-orange-500'
          }`}
        >
          ₹{amt}
        </button>
      ))
    )}
  </div>
</div>

                    
                    {/* FULFILLMENT MODE & 6 TABLE SELECTION / OPTIONAL DELIVERY FEE */}
                    <div className="space-y-2 mb-2 shrink-0 border-t border-neutral-300 dark:border-neutral-800 pt-2">
                      <div className="grid grid-cols-3 gap-1 bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl">
                        {(['pickup', 'table', 'delivery'] as const).map((type) => (
                          <button key={type} onClick={() => { triggerBeep('tap'); setFulfillmentType(type); }} className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all ${fulfillmentType === type ? "bg-orange-600 text-white shadow" : "text-neutral-700 dark:text-neutral-300"}`}>{type}</button>
                        ))}
                      </div>

                      {/* 6 FIXED TABLE BUTTONS WITH AUTO-LOAD RUNNING ORDERS */}
                      {fulfillmentType === 'table' && (
                        <div className="grid grid-cols-3 gap-1 pt-1">
                          {['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'].map((tName) => {
                            const occupiedOrder = activeTableOrders.find(o => o.tableNumber === tName);
                            const isSelected = tableNumber === tName;
                            return (
                              <button 
                                key={tName}
                                type="button"
                                onClick={() => { 
                                  triggerBeep('tap'); 
                                  setTableNumber(tName);
                                  // Auto-load running table bill if occupied!
                                  if (occupiedOrder) {
                                    setActiveEditingOrderId(occupiedOrder.id);
                                    setActiveEditingBillNumber(occupiedOrder.billNumber);
                                    setCart(occupiedOrder.items || []);
                                    setCustomerName(occupiedOrder.customerName || '');
                                    setCustomerPhone(occupiedOrder.customerPhone || '');
                                    toast.success(`${tName} Active Bill #${occupiedOrder.billNumber} Loaded!`);
                                  } else {
                                    setActiveEditingOrderId(null);
                                    setActiveEditingBillNumber(null);
                                    setCart([]);
                                  }
                                }}
                                className={`py-1.5 px-1 rounded-lg text-xs font-black uppercase border transition-all text-center ${
                                  isSelected 
                                    ? 'bg-amber-500 text-black border-amber-600 shadow-md ring-2 ring-amber-400 font-black' 
                                    : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-700 hover:border-amber-500'
                                }`}
                              >
                                <span>{tName}</span>
                                {occupiedOrder ? (
                                  <span className="block text-[8px] text-red-600 dark:text-red-400 font-black uppercase">
                                    ● Running (₹{occupiedOrder.total})
                                  </span>
                                ) : (
                                  <span className="block text-[8px] text-green-600 dark:text-green-400 font-bold uppercase">
                                    Free
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* OPTIONAL DELIVERY CHARGE BOX */}
                      {fulfillmentType === 'delivery' && (
                        <div className="bg-neutral-100 dark:bg-neutral-800/80 p-2 rounded-xl border border-neutral-300 dark:border-neutral-700 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-neutral-900 dark:text-neutral-200">
                              <input 
                                type="checkbox" 
                                checked={applyDeliveryFee} 
                                onChange={e => setApplyDeliveryFee(e.target.checked)}
                                className="accent-orange-600 w-3.5 h-3.5 cursor-pointer" 
                              />
                              <span>Delivery Charge (वैकल्पिक):</span>
                            </label>
                            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 font-mono">
                              {applyDeliveryFee ? `+₹${customDeliveryFee || 0}` : 'FREE (₹0)'}
                            </span>
                          </div>

                          {applyDeliveryFee && (
                            <div className="flex items-center gap-1.5 pt-1">
                              <input 
                                type="number" 
                                min={0}
                                placeholder="Fee ₹" 
                                value={customDeliveryFee} 
                                onChange={e => setCustomDeliveryFee(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-20 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg p-1 text-xs text-center font-mono text-neutral-900 dark:text-white outline-none font-bold" 
                              />
                              <div className="flex gap-1 flex-1">
                                {[0, 20, 30, 50].map((amt) => (
                                  <button 
                                    key={amt}
                                    type="button"
                                    onClick={() => setCustomDeliveryFee(amt)}
                                    className={`flex-1 py-1 rounded text-[10px] font-bold border font-mono ${customDeliveryFee === amt ? 'bg-orange-600 text-white border-orange-600' : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                                  >
                                    {amt === 0 ? 'Free' : `₹${amt}`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BREAKDOWN & GRAND TOTAL */}
                    <div className="space-y-1 text-xs border-t border-neutral-300 dark:border-neutral-800 pt-1.5 shrink-0 font-bold">
                      <div className="flex justify-between text-neutral-600 dark:text-neutral-400"><span>Subtotal</span><span className="font-mono">₹{getCartSubtotal()}</span></div>
                      {getDeliveryCharge() > 0 && <div className="flex justify-between text-neutral-800 dark:text-neutral-200"><span>Delivery Charge</span><span className="font-mono">+₹{getDeliveryCharge()}</span></div>}
                      {getCalculatedDiscountAmount() > 0 && <div className="flex justify-between text-orange-600 font-bold"><span>Discount</span><span className="font-mono">-₹{getCalculatedDiscountAmount()}</span></div>}
                      {isRedeemingPoints && <div className="flex justify-between text-amber-600 font-bold"><span>Points Redeemed</span><span className="font-mono">-₹{getRedemptionDiscount()}</span></div>}
                      <div className="flex justify-between text-sm font-black text-green-600 dark:text-green-500 pt-1 border-t border-dashed border-neutral-400">
                        <span>Grand Total</span><span className="font-mono text-base font-black">₹{getTotalBillPrice()}</span>
                      </div>
                    </div>

                    {/* PAYMENT METHOD [F4] */}
                    <div className="space-y-1.5 my-1.5 shrink-0">
                      <div className="grid grid-cols-3 gap-1">
                        <button onClick={() => setPaymentMethod('cash')} className={`py-1.5 rounded-lg text-xs font-black uppercase border ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600 shadow' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'}`}>Cash [F4]</button>
                        <button onClick={() => setPaymentMethod('upi')} className={`py-1.5 rounded-lg text-xs font-black uppercase border ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'}`}>UPI [F4]</button>
                        <button onClick={() => setPaymentMethod('split')} className={`py-1.5 rounded-lg text-xs font-black uppercase border ${paymentMethod === 'split' ? 'bg-amber-600 text-white border-amber-600 shadow' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'}`}>Split [F4]</button>
                      </div>
                    </div>

                    {/* EXTRA TOOLS */}
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5 shrink-0">
                      <button onClick={() => setIsQrModalOpen(true)} className="py-1.5 px-2 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/40 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1">
                        <SafeQrCode size={13} /> QR [F8]
                      </button>
                      <button onClick={() => setIsChangeModalOpen(true)} className="py-1.5 px-2 bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/40 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1">
                        <SafeCalculator size={13} /> Change [F10]
                      </button>
                    </div>

                    {/* CHECKOUT ACTION BUTTONS [F9] */}
                    {fulfillmentType === 'table' ? (
                      <div className="space-y-1.5 shrink-0">
                        <button onClick={handleSaveTableOrderKotOnly} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow disabled:opacity-50">
                          {isSubmittingOrder ? <Loader2 className="animate-spin" size={15} /> : <SafePrinter size={15} />}
                          <span>{activeEditingOrderId ? "Update Table & Print Running KOT" : "Save Table Order & KOT"}</span>
                        </button>
                        <button onClick={handleFinalCheckoutAndPrintBill} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-2.5 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                          {isSubmittingOrder ? <Loader2 className="animate-spin" size={15} /> : <SafeFileText size={15} />}
                          <span>Settle & Final Bill (₹{getTotalBillPrice()}) [F9]</span>
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleFinalCheckoutAndPrintBill} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 shrink-0">
                        {isSubmittingOrder ? <Loader2 className="animate-spin" size={15} /> : <Receipt size={15} />}
                        <span>Pay & Print Bill (₹{getTotalBillPrice()}) [F9]</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INVENTORY & MENU */}
            {activeTab === 'inventory' && (
              <div className="flex-1 p-6 h-full overflow-y-auto space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h2 className="text-sm font-black uppercase text-orange-600 dark:text-orange-500">Menu Items & Stock Manager</h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Add new food items with variations/sizes, category codes, and prices.</p>
                  </div>
                  <button onClick={() => handleOpenItemEditor(null)} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-1.5 shadow">
                    <SafePackagePlus size={16} /> + Add New Food Item
                  </button>
                </div>

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

                        <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-300 dark:border-neutral-700">
                          <button onClick={() => handleOpenItemEditor(item)} className="flex-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-orange-600 hover:text-white py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1">
                            <SafeEdit3 size={12} /> Edit
                          </button>
                          <button 
                            onClick={async () => {
                              await updateDoc(doc(db, "products", item.id), { isAvailable: !isAvail });
                              setProducts(prev => prev.map(p => p.id === item.id ? { ...p, isAvailable: !isAvail } : p));
                            }} 
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${isAvail ? 'text-red-600 border-red-500/30' : 'text-green-600 border-green-500/30'}`}
                          >
                            {isAvail ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: PAST RECEIPTS */}
            {activeTab === 'receipts' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden space-y-4">
                <div className="flex justify-between items-center border-b pb-3 shrink-0">
                  <div>
                    <h2 className="text-sm font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-2">
                      <Printer size={18} /> Past Receipts & Old Bill Reprints
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Search past bills, reprint thermal receipts or KOT, and resend WhatsApp bills.</p>
                  </div>
                  <button onClick={fetchPastReceipts} disabled={isReceiptsLoading} className="bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700">
                    {isReceiptsLoading ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />} Refresh
                  </button>
                </div>

                <div className="flex gap-3 shrink-0">
                  <div className="relative flex-1">
                    <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search past bills by Bill No, Customer Name or Phone..." 
                      value={receiptSearchQuery} 
                      onChange={e => setReceiptSearchQuery(e.target.value)} 
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none font-bold" 
                    />
                  </div>
                  <select 
                    value={receiptsLimit} 
                    onChange={e => setReceiptsLimit(Number(e.target.value))} 
                    className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none" 
                  >
                    <option value={30}>Last 30 Bills</option>
                    <option value={50}>Last 50 Bills</option>
                    <option value={100}>Last 100 Bills</option>
                  </select>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {isReceiptsLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                  ) : filteredPastReceipts.length === 0 ? (
                    <div className="text-center py-24 text-neutral-500 font-bold text-xs">No receipts found.</div>
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
                              <span className="font-mono font-black text-amber-600 dark:text-yellow-400 text-sm">Bill #{order.billNumber || 'N/A'}</span>
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
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${order.paymentMethod === 'upi' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : order.paymentMethod === 'split' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-green-500/15 text-green-600 dark:text-green-400'}`}>
                              {order.paymentMethod || 'cash'}
                            </span>
                            <span className="font-mono font-black text-sm text-green-600 dark:text-green-400">₹{order.total}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceipt(order);
                                setIsReceiptModalOpen(true);
                              }} 
                              className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl"
                            >
                              <SafeEye size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: REPORTS WITH ITEM-WISE BREAKDOWN & CUSTOM DATE */}
            {activeTab === 'reports' && (
              <div className="flex-1 p-6 h-full overflow-y-auto max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-lg font-black uppercase text-orange-600 dark:text-orange-500 flex items-center gap-2">
                      <SafeBarChart3 size={20} /> Sales & Item-wise Analytics
                    </h2>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">Check total sales and see which food item sold how much.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleSendOwnerSummary} className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow">
                      <SafeSend size={14} /> Send WhatsApp to Owner
                    </button>
                    <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-2xl border border-neutral-300 dark:border-neutral-700">
                      <button onClick={() => setReportFilter('today')} className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl ${reportFilter === 'today' ? 'bg-orange-600 text-white' : 'text-neutral-700 dark:text-neutral-400'}`}>Today</button>
                      <button onClick={() => setReportFilter('yesterday')} className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl ${reportFilter === 'yesterday' ? 'bg-orange-600 text-white' : 'text-neutral-700 dark:text-neutral-400'}`}>Yesterday</button>
                      <button onClick={() => setReportFilter('custom')} className={`px-3 py-1.5 text-xs font-black uppercase rounded-xl ${reportFilter === 'custom' ? 'bg-orange-600 text-white' : 'text-neutral-700 dark:text-neutral-400'}`}>Date Picker</button>
                    </div>
                    {reportFilter === 'custom' && (
                      <input 
                        type="date" 
                        value={customReportDate} 
                        onChange={e => setCustomReportDate(e.target.value)}
                        className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs px-3 py-1.5 rounded-xl outline-none font-mono font-bold" 
                      />
                    )}
                  </div>
                </div>

                {/* SUMMARY STATS */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-4 rounded-3xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Total Sales</p>
                    <p className="text-2xl font-black font-mono text-green-600 dark:text-green-400">₹{reportSummary.totalSale}</p>
                    <p className="text-[10px] text-neutral-500">{reportSummary.totalOrdersCount} Completed Orders</p>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-4 rounded-3xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Gross Cash</p>
                    <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">₹{reportSummary.cashSale}</p>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-4 rounded-3xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">UPI Payments</p>
                    <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">₹{reportSummary.upiSale}</p>
                  </div>
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-4 rounded-3xl space-y-1 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-neutral-500">Net in Drawer</p>
                    <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">₹{reportSummary.netCashInDrawer}</p>
                  </div>
                </div>

                {/* CASH DRAWER AUDIT */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-5 rounded-3xl space-y-4 shadow-sm">
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

                {/* ITEM-WISE SALES TABLE */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-5 rounded-3xl space-y-3 shadow-sm">
                  <h3 className="text-xs font-black uppercase text-amber-600 dark:text-yellow-400 flex items-center justify-between">
                    <span>📊 Item-wise Sales Breakdown</span>
                    <span className="text-neutral-500 font-normal">Sorted by Most Sold</span>
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] uppercase font-black">
                          <th className="py-2">Item Name</th>
                          <th className="py-2 text-center">Qty Sold</th>
                          <th className="py-2 text-right">Revenue (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono">
                        {itemWiseSales.length === 0 ? (
                          <tr><td colSpan={3} className="py-6 text-center text-neutral-500 font-sans">No items sold on this date.</td></tr>
                        ) : (
                          itemWiseSales.map((item, idx) => (
                            <tr key={idx} className="hover:bg-neutral-100 dark:hover:bg-neutral-800/40">
                              <td className="py-2.5 font-sans font-bold text-neutral-900 dark:text-white">{item.name}</td>
                              <td className="py-2.5 text-center font-bold text-orange-600 dark:text-orange-400">x{item.qty}</td>
                              <td className="py-2.5 text-right font-black text-green-600 dark:text-green-400">₹{item.revenue}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TABLES MANAGER (DINE-IN ACTIVE TABLES) */}
            {activeTab === 'tables' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-black uppercase text-amber-600 dark:text-amber-500">Active Tables ({activeTableOrders.length})</h2>
                  <p className="text-xs text-neutral-500">Click any table to add more items/KOT or settle the final bill.</p>
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
                              <button 
                                onClick={() => {
                                  setActiveEditingOrderId(order.id);
                                  setActiveEditingBillNumber(order.billNumber);
                                  setTableNumber(order.tableNumber || tName);
                                  setFulfillmentType('table');
                                  setCart(order.items || []);
                                  setCustomerName(order.customerName || '');
                                  setCustomerPhone(order.customerPhone || '');
                                  setActiveTab('billing');
                                  toast.success(`Loaded ${tName} Bill #${order.billNumber}`);
                                  setTimeout(() => searchInputRef.current?.focus(), 80);
                                }} 
                                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1 shadow"
                              >
                                <SafeEdit3 size={14} /> Add Items / Settle
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                setActiveEditingOrderId(null);
                                setActiveEditingBillNumber(null);
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
                            <span className="font-mono font-black text-amber-600 dark:text-yellow-400">Bill #{order.billNumber}</span>
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
                            await updateDoc(doc(db, "orders", order.id), { status: 'completed', settledAt: new Date() });
                            toast.success("Order Completed! ✅");
                          }} className="py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1">
                            <Check size={13} /> Done
                          </button>
                          <button onClick={async () => {
                            if (!window.confirm("Reject order?")) return;
                            await updateDoc(doc(db, "orders", order.id), { status: 'rejected', rejectedAt: new Date() });
                            toast.success("Rejected.");
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

            {/* TAB 7: HARDWARE & SETTINGS */}
            {activeTab === 'settings' && (
              <div className="flex-1 p-6 h-full overflow-y-auto flex justify-center">
                <div className="max-w-xl w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 p-6 rounded-3xl shadow-xl space-y-6">
                  <h3 className="text-sm font-black uppercase text-orange-600 dark:text-orange-500">POS & Hardware Settings</h3>
                  
                  {/* INVOICE STARTING NUMBER CONFIG */}
                  <div className="space-y-2 border-b border-neutral-300 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">Next Bill / Invoice Number:</p>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={manualInvoiceCounterInput} 
                        onChange={e => setManualInvoiceCounterInput(e.target.value)}
                        placeholder="e.g. 200"
                        className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none" 
                      />
                      <button onClick={() => { 
                        const num = parseInt(manualInvoiceCounterInput, 10);
                        if (!isNaN(num) && num >= 1) {
                          localStorage.setItem("bb_pos_local_bill_counter_pc", String(num - 1));
                          toast.success(`Next Invoice will be #${num}! ✅`);
                        }
                      }} className="bg-orange-600 text-white px-4 rounded-xl text-xs font-black uppercase">Set Counter</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-300 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">Dynamic UPI ID (VPA for QR Code):</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={upiIdConfig} 
                        onChange={e => setUpiIdConfig(e.target.value)}
                        placeholder="e.g. Q991347275@ybl"
                        className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono outline-none" 
                      />
                      <button onClick={() => { localStorage.setItem("bb_pos_upi_id", upiIdConfig); toast.success("UPI ID Saved!"); }} className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black uppercase">Save</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-300 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">Owner WhatsApp Number (for EOD Report):</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={ownerPhoneConfig} 
                        onChange={e => setOwnerPhoneConfig(e.target.value)}
                        placeholder="e.g. 919714293759"
                        className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono outline-none" 
                      />
                      <button onClick={() => { localStorage.setItem("bb_pos_owner_phone", ownerPhoneConfig); toast.success("Owner Phone Saved!"); }} className="bg-green-600 text-white px-4 rounded-xl text-xs font-black uppercase">Save</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-300 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">UI Theme:</p>
                    <div className="flex bg-neutral-200 dark:bg-neutral-800 p-1 rounded-xl w-48">
                      <button onClick={() => { setThemeMode('light'); localStorage.setItem("bb_pos_theme_pc", 'light'); document.documentElement.classList.remove('dark'); }} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${themeMode === 'light' ? 'bg-white text-orange-600 shadow' : 'text-neutral-700 dark:text-neutral-400'}`}>Light</button>
                      <button onClick={() => { setThemeMode('dark'); localStorage.setItem("bb_pos_theme_pc", 'dark'); document.documentElement.classList.add('dark'); }} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${themeMode === 'dark' ? 'bg-neutral-950 text-amber-400 shadow' : 'text-neutral-700 dark:text-neutral-400'}`}>Dark</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-300 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">KOT Printing:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Print Kitchen Order Ticket on checkout:</span>
                      <button onClick={() => { const next = !kotEnabled; setKotEnabled(next); localStorage.setItem("bb_pos_kot_enabled_pc", String(next)); }} className="text-orange-500">
                        {kotEnabled ? <SafeToggleRight size={28} /> : <SafeToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* ALL POPUP MODALS */}

      {/* MODAL 1: ADD / EDIT PRODUCT */}
      <AnimatePresence>
        {isItemEditorModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsItemEditorModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-orange-600 dark:text-orange-500">{editingItemObj ? 'Edit Food Item' : 'Add New Food Item'}</h3>
                <button onClick={() => setIsItemEditorModalOpen(false)} className="text-neutral-500 hover:text-black dark:hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <form onSubmit={handleSaveItemToFirestore} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-300 uppercase font-bold text-[10px] block mb-1">Item Name *</label>
                  <input type="text" required placeholder="e.g. Cheese Pizza, Masala Dosa, Paneer Paratha" value={itemNameInput} onChange={e => setItemNameInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none font-bold" autoFocus />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-700 dark:text-neutral-300 uppercase font-bold text-[10px] block mb-1">Base Price (₹) *</label>
                    <input type="number" required min={0} value={itemPriceInput} onChange={e => setItemPriceInput(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white font-mono font-bold" />
                  </div>
                  <div>
                    <label className="text-neutral-700 dark:text-neutral-300 uppercase font-bold text-[10px] block mb-1">Short Code (Category-based) *</label>
                    <input type="text" required placeholder="e.g. 1, 101, 201" value={itemCodeInput} onChange={e => setItemCodeInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white font-mono font-bold" />
                  </div>
                </div>

                {/* CATEGORY SELECTION WITH DROPDOWN + NEW CATEGORY OPTION */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-700 dark:text-neutral-300 uppercase font-bold text-[10px]">Category Selection *</label>
                    <button type="button" onClick={() => setIsAddingNewCatInput(!isAddingNewCatInput)} className="text-orange-600 dark:text-orange-400 text-[10px] font-bold underline">
                      {isAddingNewCatInput ? 'Select Existing Category' : '+ Add New Category'}
                    </button>
                  </div>
                  {isAddingNewCatInput ? (
                    <input 
                      type="text" 
                      placeholder="Type New Category (e.g. Shakes, Paratha, Momos)" 
                      value={newCustomCategoryName} 
                      onChange={e => {
                        setNewCustomCategoryName(e.target.value);
                        if (!editingItemObj) setItemCodeInput(generateNextCategoryCode(e.target.value));
                      }} 
                      className="w-full bg-neutral-100 dark:bg-neutral-950 border border-orange-500 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none font-bold" 
                    />
                  ) : (
                    <select 
                      value={itemCatInput} 
                      onChange={e => {
                        const newCat = e.target.value;
                        setItemCatInput(newCat);
                        if (!editingItemObj) setItemCodeInput(generateNextCategoryCode(newCat));
                      }} 
                      className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none font-bold" 
                    >
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* IMAGE URL BOX */}
                <div>
                  <label className="text-neutral-700 dark:text-neutral-300 uppercase font-bold text-[10px] block mb-1">
                    Image URL (फोटो का लिंक / Web URL):
                  </label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/... या फोटो का लिंक" 
                    value={itemImageInput} 
                    onChange={e => setItemImageInput(e.target.value)} 
                    className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none font-medium" 
                  />
                </div>

                {/* FULL VARIATION BUILDER */}
                <div className="pt-3 border-t border-neutral-300 dark:border-neutral-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-black uppercase text-[11px] text-amber-700 dark:text-yellow-400">Multiple Sizes / Variations?</span>
                      <p className="text-[10px] text-neutral-600 dark:text-neutral-400">Half/Full, Plain/Butter, Small/Medium/Large</p>
                    </div>
                    <button type="button" onClick={() => setHasVariants(!hasVariants)} className="text-orange-500">
                      {hasVariants ? <SafeToggleRight size={30} /> : <SafeToggleLeft size={30} />}
                    </button>
                  </div>

                  {hasVariants && (
                    <div className="bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 p-3 rounded-2xl space-y-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[9px] font-bold text-neutral-600 uppercase mr-1">Presets:</span>
                        <button type="button" onClick={() => handleApplyVariantPreset('half_full')} className="px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-200 rounded text-[10px] font-bold border border-neutral-300 dark:border-neutral-700">🍲 Half / Full</button>
                        <button type="button" onClick={() => handleApplyVariantPreset('plain_butter')} className="px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-200 rounded text-[10px] font-bold border border-neutral-300 dark:border-neutral-700">🧈 Plain / Butter</button>
                        <button type="button" onClick={() => handleApplyVariantPreset('pizza')} className="px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-200 rounded text-[10px] font-bold border border-neutral-300 dark:border-neutral-700">🍕 Pizza Sizes</button>
                        <button type="button" onClick={() => handleApplyVariantPreset('reg_large')} className="px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-200 rounded text-[10px] font-bold border border-neutral-300 dark:border-neutral-700">🥤 Reg / Large</button>
                      </div>

                      <div className="space-y-1.5">
                        {Object.entries(itemVariantsList).map(([vName, vPrice]: any) => (
                          <div key={vName} className="flex justify-between items-center bg-white dark:bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-800 font-bold">
                            <span className="text-neutral-900 dark:text-neutral-200">{vName}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-orange-600 dark:text-orange-400 font-black">₹{vPrice}</span>
                              <button type="button" onClick={() => handleRemoveVariantRow(vName)} className="text-red-500 hover:text-red-700"><SafeTrash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input 
                          type="text" 
                          placeholder="Size (e.g. Half, Butter, Large, 500ml)" 
                          value={newVariantName} 
                          onChange={e => setNewVariantName(e.target.value)} 
                          className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white outline-none font-bold" 
                        />
                        <input 
                          type="number" 
                          placeholder="Price (₹)" 
                          value={newVariantPrice} 
                          onChange={e => setNewVariantPrice(e.target.value === '' ? '' : Number(e.target.value))} 
                          className="w-24 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white font-mono outline-none font-bold" 
                        />
                        <button 
                          type="button" 
                          onClick={handleAddVariantRow} 
                          className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-xl font-black uppercase text-[10px]"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-300 dark:border-neutral-800">
                  <button type="button" onClick={() => setIsItemEditorModalOpen(false)} className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-bold uppercase rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-green-600 text-white font-black uppercase rounded-xl shadow-lg">Save Item</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PAST RECEIPT DETAILS */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsReceiptModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 text-xs cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-black text-sm uppercase text-orange-600 dark:text-orange-400">Bill Details (#{selectedReceipt.billNumber})</h3>
                  <p className="text-[10px] text-neutral-500 font-mono">{new Date(selectedReceipt.timestamp?.toDate ? selectedReceipt.timestamp.toDate() : selectedReceipt.timestamp).toLocaleString()}</p>
                </div>
                <button onClick={() => setIsReceiptModalOpen(false)} className="text-neutral-500"><SafeX size={18} /></button>
              </div>
              <div className="space-y-1 bg-neutral-100 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-300 dark:border-neutral-800">
                <p className="font-bold text-neutral-900 dark:text-white">👤 {selectedReceipt.customerName} {selectedReceipt.customerPhone && `(${selectedReceipt.customerPhone})`}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-mono">Mode: {selectedReceipt.fulfillmentType} • Payment: {selectedReceipt.paymentMethod}</p>
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedReceipt.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-neutral-100 dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-800 font-bold">
                    <p className="text-neutral-900 dark:text-white">{it.name}</p>
                    <p className="font-mono text-orange-600 dark:text-orange-400">{it.quantity} x ₹{it.price}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-300 dark:border-neutral-800 pt-2 font-mono space-y-1 font-bold">
                <div className="flex justify-between text-neutral-600 dark:text-neutral-400"><span>Subtotal:</span><span>₹{selectedReceipt.subtotal}</span></div>
                {selectedReceipt.deliveryFee > 0 && <div className="flex justify-between text-neutral-900 dark:text-neutral-200"><span>Delivery Fee:</span><span>+₹{selectedReceipt.deliveryFee}</span></div>}
                <div className="flex justify-between font-black text-sm text-green-600 dark:text-green-400 pt-1 border-t border-dashed border-neutral-400">
                  <span>Grand Total:</span><span>₹{selectedReceipt.total}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-300 dark:border-neutral-800">
                <button onClick={() => handlePrintReceiptDirect(selectedReceipt, false)} className="py-2.5 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-xl flex items-center justify-center gap-1.5 shadow">
                  <SafePrinter size={14} /> Print Bill
                </button>
                <button onClick={() => handlePrintReceiptDirect(selectedReceipt, true)} className="py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-1.5 shadow">
                  <SafeFileText size={14} /> Print KOT
                </button>
              </div>
              <button onClick={() => handleSendWhatsAppBill(selectedReceipt)} className="w-full py-2 bg-green-600/15 text-green-700 dark:text-green-400 border border-green-500/30 font-black uppercase text-xs rounded-xl flex items-center justify-center gap-1.5">
                <SafeShare2 size={14} /> Send WhatsApp Bill
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: SHORTCUTS SHEET [F1] */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsHelpModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 text-neutral-900 dark:text-neutral-100 cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2 text-orange-600 dark:text-yellow-500 font-black text-sm uppercase">
                  <SafeHelpCircle size={18} />
                  <span>POS Keyboard Shortcuts (F1 - F12)</span>
                </div>
                <button onClick={() => setIsHelpModalOpen(false)} className="text-neutral-500"><SafeX size={18} /></button>
              </div>
              <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
                {[
                  { key: 'F1', desc: 'Open Shortcuts Guide' },
                  { key: 'F2', desc: 'Focus Search Bar & hit [Enter] to auto-add item' },
                  { key: 'F3', desc: 'Park / Hold active cart order' },
                  { key: 'F4', desc: 'Toggle Payment Mode (Cash / UPI / Split)' },
                  { key: 'F5', desc: 'Recall / Open Held / Parked Carts' },
                  { key: 'F6', desc: 'Record Daily Drawer Expense (दूध, बर्फ)' },
                  { key: 'F7', desc: 'Send WhatsApp Receipt to mobile' },
                  { key: 'F8', desc: 'Display Dynamic UPI QR Code on Screen' },
                  { key: 'F9', desc: 'Pay & Print Bill (or Settle Table)' },
                  { key: 'F10', desc: 'Cash Tender / Return Change Calculator' },
                  { key: 'F11', desc: 'Open Customer Directory / Loyalty' },
                  { key: 'F12', desc: 'Toggle Mode (Pickup ➔ Table ➔ Delivery)' },
                  { key: 'Del', desc: 'Clear Current Cart Items' },
                  { key: 'Esc', desc: 'Close any active popup modal' },
                ].map((s) => (
                  <div key={s.key} className="flex justify-between items-center p-2 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 font-bold">
                    <span className="font-mono font-black text-orange-600 dark:text-orange-400 bg-orange-500/15 px-2.5 py-1 rounded-lg border border-orange-500/30">{s.key}</span>
                    <span className="text-neutral-800 dark:text-neutral-300">{s.desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: HELD CARTS [F5] */}
      <AnimatePresence>
        {isHeldCartsModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsHeldCartsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-sm uppercase">
                  <SafePauseCircle size={18} />
                  <span>Held Orders ({heldCarts.length}) [F5]</span>
                </div>
                <button onClick={() => setIsHeldCartsModalOpen(false)} className="text-neutral-500"><SafeX size={18} /></button>
              </div>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {heldCarts.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-10 font-bold">No parked orders.</p>
                ) : (
                  heldCarts.map((h) => (
                    <div key={h.id} className="bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 p-3.5 rounded-2xl flex justify-between items-center font-bold">
                      <div>
                        <p className="text-xs text-neutral-900 dark:text-white">{h.customerName} ({h.heldAt})</p>
                        <p className="text-[10px] text-neutral-500 font-mono">{h.cart.length} items • ₹{h.total}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRestoreHeldCart(h)} className="bg-green-600 text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow">
                          <SafePlayCircle size={14} /> Resume
                        </button>
                        <button onClick={() => handleDeleteHeldCart(h.id)} className="p-1.5 text-red-500"><SafeTrash2 size={16} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: EXPENSE [F6] */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsExpenseModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-red-600 flex items-center gap-2"><Receipt size={16} /> Drawer Expense Entry [F6]</h3>
                <button onClick={() => setIsExpenseModalOpen(false)} className="text-neutral-500"><SafeX size={18} /></button>
              </div>
              <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-700 dark:text-neutral-300 uppercase font-black text-[10px] block mb-1">Expense Title *</label>
                  <input type="text" required placeholder="e.g. Milk 5L, Ice cubes" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none font-bold" autoFocus />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-300 uppercase font-black text-[10px] block mb-1">Amount Deducted (₹) *</label>
                  <input type="number" required min={1} placeholder="e.g. 150" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white font-mono text-sm outline-none font-bold" />
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-300 uppercase font-black text-[10px] block mb-1">Category</label>
                  <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white font-bold">
                    <option value="Milk / Dairy">Milk / Dairy</option>
                    <option value="Vegetables">Vegetables / Raw Food</option>
                    <option value="Staff Snacks">Staff Tea / Snacks</option>
                    <option value="Gas / Maintenance">Maintenance / Gas</option>
                    <option value="General">Other / General</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs rounded-xl shadow-lg">Save Expense</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: QR CODE [F8] */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsQrModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 text-center cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2"><SafeQrCode size={16} /> Dynamic UPI QR [F8]</h3>
                <button onClick={() => setIsQrModalOpen(false)} className="text-neutral-500"><SafeX size={18} /></button>
              </div>
              <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border border-neutral-300">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(dynamicUpiUrl)}`} alt="UPI QR Code" className="w-52 h-52 object-contain mx-auto" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black font-mono text-green-600 dark:text-green-400">₹{getTotalBillPrice()}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-bold">Scan via PhonePe, GPay, Paytm</p>
                <p className="text-[10px] text-neutral-500 font-mono font-bold">UPI: {upiIdConfig}</p>
              </div>
              <button onClick={() => { setPaymentMethod('upi'); setIsQrModalOpen(false); toast.success("Switched to UPI mode!"); }} className="w-full py-2.5 bg-blue-600 text-white font-black uppercase text-xs rounded-xl shadow">Confirm Paid</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: CHANGE CALCULATOR [F10] */}
      <AnimatePresence>
        {isChangeModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setIsChangeModalOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-purple-600 dark:text-purple-400 flex items-center gap-2"><SafeCalculator size={16} /> Return Change Calculator [F10]</h3>
                <button onClick={() => setIsChangeModalOpen(false)} className="text-neutral-500"><SafeX size={18} /></button>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-neutral-100 dark:bg-neutral-950 rounded-xl border border-neutral-300 dark:border-neutral-800">
                  <span className="text-neutral-600 dark:text-neutral-400 font-bold">Bill Total:</span>
                  <span className="font-mono text-lg font-black text-neutral-900 dark:text-white">₹{getTotalBillPrice()}</span>
                </div>
                <div>
                  <label className="text-neutral-700 dark:text-neutral-300 uppercase font-black text-[10px] block mb-1">Customer Tendered (₹):</label>
                  <input type="number" placeholder="e.g. 500" value={tenderCashAmount} onChange={e => setTenderCashAmount(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-xl p-3 text-neutral-900 dark:text-white font-mono text-lg font-bold outline-none text-center" autoFocus />
                </div>
                <div className="flex gap-2">
                  {[100, 200, 500, 2000].map(amt => (
                    <button key={amt} onClick={() => setTenderCashAmount(amt)} className="flex-1 py-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg font-mono font-black text-xs text-neutral-900 dark:text-neutral-300">₹{amt}</button>
                  ))}
                </div>
                {tenderCashAmount !== '' && (
                  <div className={`p-4 rounded-xl border text-center space-y-1 ${Number(tenderCashAmount) >= getTotalBillPrice() ? 'bg-green-500/15 border-green-500/40' : 'bg-red-500/15 border-red-500/40'}`}>
                    <p className="text-[10px] font-black uppercase text-neutral-700 dark:text-neutral-300">{Number(tenderCashAmount) >= getTotalBillPrice() ? 'Return to Customer:' : 'Pending Remaining:'}</p>
                    <p className={`text-2xl font-mono font-black ${Number(tenderCashAmount) >= getTotalBillPrice() ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>₹{Math.abs(Number(tenderCashAmount) - getTotalBillPrice())}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 8: BILLING VARIATION MODAL */}
      <AnimatePresence>
        {isVariationModalOpen && selectedProductForVariation && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => { setIsVariationModalOpen(false); setTimeout(() => searchInputRef.current?.focus(), 60); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-orange-600 dark:text-orange-500">{selectedProductForVariation.name}</h3>
                <button tabIndex={-1} onClick={() => { setIsVariationModalOpen(false); setTimeout(() => searchInputRef.current?.focus(), 60); }} className="text-neutral-500"><SafeX size={18} /></button>
              </div>

              <div className="space-y-3">
                {selectedProductForVariation.variants && (
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1.5">Size / Portion ([Tab] to switch, [Enter] to select):</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedProductForVariation.variants).map(([size, price]: any, idx: number) => {
                        const isSelected = selectedSize.toLowerCase() === size.toLowerCase();
                        return (
                          <button 
                            key={size}
                            ref={idx === 0 ? firstVariantButtonRef : null}
                            type="button"
                            tabIndex={0}
                            onFocus={() => { setSelectedSize(size); setSelectedSizePrice(Number(price) || 100); }}
                            onClick={() => { setSelectedSize(size); setSelectedSizePrice(Number(price) || 100); }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomizedItemToCart(); } }}
                            className={`py-2 px-3 rounded-xl text-xs font-black uppercase border transition-all outline-none focus:ring-2 focus:ring-orange-500 ${
                              isSelected ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                            }`}
                          >
                            {size} (₹{price})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">Instructions (Optional):</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COOKING_TAGS.map((tag) => (
                      <button key={tag} type="button" tabIndex={-1} onClick={() => setItemNoteInput(prev => prev ? `${prev}, ${tag}` : tag)} className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-[10px] font-bold text-neutral-800 dark:text-neutral-300">
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <input type="text" tabIndex={-1} placeholder="Custom Note (Optional)" value={itemNoteInput} onChange={e => setItemNoteInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none font-bold" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" tabIndex={-1} onClick={() => { setIsVariationModalOpen(false); setTimeout(() => searchInputRef.current?.focus(), 60); }} className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-300 font-bold uppercase text-xs rounded-xl">Cancel [Esc]</button>
                <button ref={addToCartButtonRef} type="button" tabIndex={0} onClick={handleAddCustomizedItemToCart} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                  Add to Cart [Enter]
                </button>
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
    </div>
  );
}

