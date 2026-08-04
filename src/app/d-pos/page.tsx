'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc,
  waitForPendingWrites
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Minus, Search, X, User, Star, Gift, 
  Loader2, Clock, Trash2, Printer, Check, Play, Settings, 
  Database, RefreshCw, Layers, Phone, MapPin, LayoutGrid, List,
  Menu, Users, LogOut, Lock, ToggleLeft, ToggleRight, Sun, Moon,
  ChevronLeft, ChevronRight, Monitor, Bell, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import CustomizerModal from '@/components/pos/CustomizerModal';

import { 
  handlePrintKot, 
  handlePrintReceipt, 
  generateReceiptHtml, 
  PrintConfig 
} from '@/lib/printerUtils';

// Safe Lucide Icons
const SafeLock = Lock as any;
const SafeDatabase = Database as any;
const SafeMenu = Menu as any;
const SafeLogOut = LogOut as any;
const SafeToggleRight = ToggleRight as any;
const SafeToggleLeft = ToggleLeft as any;
const SafeMoon = Moon as any;
const SafeSun = Sun as any;
const SafeShoppingBag = ShoppingBag as any;
const SafeClock = Clock as any; 
const SafeLayers = Layers as any;
const SafePrinter = Printer as any;
const SafeUsers = Users as any; 
const SafePlay = Play as any; 
const SafeCheck = Check as any;
const SafeSearch = Search as any;
const SafeX = X as any;
const SafeRefreshCw = RefreshCw as any;
const SafeLayoutGrid = LayoutGrid as any;
const SafeList = List as any;
const SafePlus = Plus as any;
const SafeMinus = Minus as any;
const SafeSettings = Settings as any;
const SafeMonitor = Monitor as any;
const SafeBell = Bell as any;

interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isReward?: boolean;
  pointsCost?: number;
  note?: string; 
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

let globalAudioCtx: AudioContext | null = null;

export default function BbCafePosDesktop() {
  const DELIVERY_AREAS: DeliveryArea[] = useMemo(() => [
    { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
    { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
    { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
  ], []);

  const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'orders' | 'inventory' | 'receipts' | 'settings'>('billing');

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('80mm');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Printer Settings states
  const [printerType, setPrinterType] = useState<'thermal_usb' | 'thermal_bluetooth' | 'network_ip' | 'laser'>('thermal_usb');
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);
  const [fontSize, setFontSize] = useState<number>(10); 
  const [kotEnabled, setKotEnabled] = useState<boolean>(true); 

  // USB Web Serial and WebUSB references
  const [serialPort, setSerialPort] = useState<any>(null); 
  const [usbDevice, setUsbDevice] = useState<any>(null); 

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [viewingHistoryCustomer, setViewingHistoryCustomer] = useState<any>(null);
  const [customerHistoryList, setCustomerHistoryList] = useState<any[]>([]);
  const [editCustPoints, setEditCustPoints] = useState(0);

  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]); 
  const [storeOpen, setStoreOpen] = useState(true);
  
  // Receipts states
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [isSearchingReceipts, setIsSearchingReceipts] = useState(false);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); 
  const [receiptsLimit, setReceiptsLimit] = useState(30);

  const [isSyncing, setIsSyncing] = useState(false);

  // Cart States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [chefInstructions, setChefInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');

  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
  const [normalPizzaSize, setNormalPizzaSize] = useState("");
  const [normalPizzaPrice, setNormalPizzaPrice] = useState(0);
  const [customizerChefNote, setCustomizerChefNote] = useState(""); 

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerBeep = (type: 'tap' | 'success' | 'alarm') => {
    try {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }

      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);

      if (type === 'tap') {
        osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start(); 
        osc.stop(globalAudioCtx.currentTime + 0.08);
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
        osc.start();
        osc.stop(globalAudioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio error:", e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("bb_desktop_pos_user");
    if (savedUser) {
      try { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); } catch (e) {}
    }
    setGstEnabled(localStorage.getItem("bb_desktop_gst_enabled") === 'true');
    setGstRate(Number(localStorage.getItem("bb_desktop_gst_rate")) || 5);
    setPrinterPaperSize((localStorage.getItem("bb_desktop_paper_size") as any) || '80mm');
    setKotEnabled(localStorage.getItem("bb_desktop_kot_enabled") !== 'false'); 
    setPrinterType((localStorage.getItem("bb_desktop_printer_type") as any) || 'thermal_usb');

    const localTheme = localStorage.getItem("bb_desktop_theme") || 'dark';
    setThemeMode(localTheme as any);
    if (localTheme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');

    const savedCart = localStorage.getItem("bb_desktop_saved_cart");
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch (err) {} }
  }, []);

  useEffect(() => {
    localStorage.setItem("bb_desktop_saved_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(list);

      let maxBill = Number(localStorage.getItem("bb_desktop_bill_counter")) || 6000;
      list.forEach((ord: any) => {
        const bNum = Number(ord.billNumber);
        if (!isNaN(bNum) && bNum > maxBill) maxBill = bNum;
      });
      localStorage.setItem("bb_desktop_bill_counter", String(maxBill));
    });

    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) setStoreOpen(d.data().isOpen);
    });

    return () => { unsubscribe(); unsubStore(); };
  }, []);

  const activeLiveOrders = useMemo(() => liveOrders.filter((o) => o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const pendingOrdersCount = useMemo(() => liveOrders.filter((o) => o.status === 'pending').length, [liveOrders]);

  useEffect(() => {
    if (pendingOrdersCount > 0) {
      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(() => { triggerBeep('alarm'); }, 2500);
      }
    } else {
      if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
    }
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, [pendingOrdersCount]);

  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      setLoading(true);
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const items = prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
        const uniqueCats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
        setCategories(['All', ...uniqueCats]);
        const rulesSnap = await getDocs(collection(db, "loyalty_rules"));
        setLoyaltyRules(rulesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        toast.error("Error loading products");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab !== 'receipts') return;
    const fetchPastReceipts = async () => {
      setIsSearchingReceipts(true);
      try {
        const q = receiptSearchQuery.trim() ? query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(150)) : query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(receiptsLimit));
        const snap = await getDocs(q);
        setPastReceipts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingReceipts(false);
      }
    };
    const delayDebounce = setTimeout(fetchPastReceipts, 300);
    return () => clearTimeout(delayDebounce);
  }, [activeTab, receiptSearchQuery, receiptsLimit]);

  const handleManualSync = async () => {
    triggerBeep('tap');
    if (!navigator.onLine) { toast.error("You are offline!"); return; }
    setIsSyncing(true);
    const toastId = toast.loading("Syncing data with cloud...");
    try {
      await waitForPendingWrites(db);
      const prodSnap = await getDocs(collection(db, "products"));
      const items = prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      const uniqueCats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
      setCategories(['All', ...uniqueCats]);
      toast.dismiss(toastId);
      toast.success("Sync completed!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePinLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const toastId = toast.loading("Verifying PIN...");
    try {
      const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput)));
      toast.dismiss(toastId);
      if (!snap.empty) {
        const uDoc = snap.docs[0].data();
        setIsLoggedIn(true);
        setCurrentUser({ id: snap.docs[0].id, ...uDoc });
        localStorage.setItem("bb_desktop_pos_user", JSON.stringify({ id: snap.docs[0].id, ...uDoc })); 
        toast.success(`Welcome back, ${uDoc.name}!`);
      } else {
        toast.error("Incorrect PIN code!");
      }
      setPinInput('');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Connection error");
      setPinInput('');
    }
  };

  const handleLogout = () => {
    triggerBeep('tap');
    localStorage.removeItem("bb_desktop_pos_user");
    setIsLoggedIn(false);
    setCurrentUser(null);
    toast.success("Terminal Locked!");
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Order status updated to ${nextStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleRefundOrder = async (orderId: string) => {
    triggerBeep('tap');
    if (!window.confirm("Are you sure you want to process a full refund for this bill?")) return;
    const toastId = toast.loading("Processing Refund...");
    try {
      await updateDoc(doc(db, "orders", orderId), { status: 'refunded' });
      setSelectedReceipt((prev: any) => prev ? { ...prev, status: 'refunded' } : null);
      setPastReceipts(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded' } : o));
      toast.dismiss(toastId);
      toast.success("Refund Processed Successfully!");
      setIsReceiptModalOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Refund failed");
    }
  };

  const handleCheckLoyalty = async () => {
    triggerBeep('tap');
    if (customerPhone.trim().length !== 10) return toast.error("Enter a valid 10-digit phone number!");
    const phoneClean = customerPhone.trim();
    const toastId = toast.loading("Fetching customer profile...");
    try {
      const docSnap = await getDoc(doc(db, "customer_points", phoneClean));
      toast.dismiss(toastId);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomerName(data.name || '');
        setCustomerPoints(data.points || 0);
        setAddress(data.address || ''); 
        toast.success(`Loyalty Points: ${data.points || 0}`);
      } else {
        setCustomerName(''); setCustomerPoints(0); setAddress('');
        toast.success("New Guest Profile Initialized!");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Database lookup error");
    }
  };

  const searchDbCustomers = async (text: string) => {
    const cleanText = text.trim();
    setIsSearchingCustomer(true);
    try {
      let q = cleanText ? (/^\d+$/.test(cleanText) ? query(collection(db, "customer_points"), where("phone", "==", cleanText)) : query(collection(db, "customer_points"), where("name", ">=", cleanText), limit(20))) : query(collection(db, "customer_points"), orderBy("lastActive", "desc"), limit(20));
      const snap = await getDocs(q);
      setSearchedCustomers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleSelectCustomer = (cust: any) => {
    triggerBeep('tap');
    setCustomerPhone(cust.phone); setCustomerName(cust.name); setCustomerPoints(cust.points || 0); setAddress(cust.address || '');
    setIsCustomerModalOpen(false);
  };

  const handleAddProductToCart = (item: any) => {
    triggerBeep('tap');
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price) || 0, quantity: 1 }];
    });
  };

  const handleAddCustomizedItemToCart = () => {
    triggerBeep('tap');
    if (!normalPizzaSize) return toast.error("Please select a size first!");
    const noteParts = customizerChefNote.trim() ? [`Note: ${customizerChefNote.trim()}`] : [];
    const compositeId = `${selectedProduct.id}-${normalPizzaSize.toLowerCase()}`;
    const compositeName = `${selectedProduct.name} (${normalPizzaSize.toUpperCase()})`;

    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === compositeId && c.note === noteParts.join(' | '));
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, { id: compositeId, name: compositeName, price: normalPizzaPrice, quantity: 1, note: noteParts.join(' | ') }];
    });

    setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setCustomizerChefNote("");
    toast.success("Customized item added!");
  };

  const handleUpdateCartQuantity = (id: string, amount: number) => {
    triggerBeep('tap');
    setCart((prev) => prev.map((item) => {
      if (item.id === id) {
        const updatedQty = item.quantity + amount;
        return updatedQty > 0 ? { ...item, quantity: updatedQty } : null;
      }
      return item;
    }).filter(Boolean) as PosCartItem[]);
  };

  const handleUpdateCartItemNote = (itemId: string, noteValue: string) => {
    setCart((prev) => prev.map((item) => item.id === itemId ? { ...item, note: noteValue } : item));
  };

  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const getDeliveryCharge = () => (fulfillmentType === "pickup" || fulfillmentType === "table" || getCartSubtotal() === 0) ? 0 : (getCartSubtotal() >= selectedArea.minFree ? 0 : selectedArea.fee);
  const getLoyaltyDiscount = () => Math.min(pointsToRedeem, getCartSubtotal());
  const getGstAmountCalculated = () => gstEnabled ? Number(((getCartSubtotal() * gstRate) / 100).toFixed(2)) : 0;
  const getTotalBillPrice = () => Math.max(0, getCartSubtotal() + getGstAmountCalculated() - (getLoyaltyDiscount() + customDiscount)) + getDeliveryCharge();
  const getFreeDeliveryProgressPercent = () => Math.min(100, (getCartSubtotal() / selectedArea.minFree) * 100);
  const getTotalPointsRedeemedInCart = () => cart.reduce((acc, i) => acc + (i.pointsCost || 0), 0);

  const getPrintConfig = (): PrintConfig => ({ printerPaperSize, printerType, bleCharacteristic, serialPort, usbDevice, fontSize } as PrintConfig);

  const handleConnectPrinter = async () => {
    triggerBeep('tap');
    setIsConnecting(true);
    const toastId = toast.loading(`Connecting to USB Thermal Printer...`);
    try {
      if ('serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        setSerialPort(port);
        setPrinterConnected(true);
        localStorage.setItem("bb_desktop_printer_connected", "true");
        toast.dismiss(toastId);
        toast.success("USB Thermal Printer Connected!");
      } else {
        setTimeout(() => {
          toast.dismiss(toastId);
          setPrinterConnected(true);
          toast.success("Connected!");
        }, 1000);
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Connection failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    triggerBeep('tap');
    try {
      await handlePrintReceipt({ 
        billNumber: '0000', 
        tokenNumber: '8888', 
        fulfillmentType: 'test', 
        paymentMethod: 'system', 
        items: [{ name: 'Desktop Test Print', quantity: 1, price: 150 }], 
        subtotal: 150, 
        discount: 0, 
        total: 150, 
        timestamp: new Date() 
      }, getPrintConfig());
      toast.success("Test print sent!");
    } catch (e: any) {
      toast.error("Print failed: " + (e.message || "Error"));
    }
  };

  const handleDetectLocation = () => {
    triggerBeep('tap');
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    const toastId = toast.loading("Detecting GPS location...");
    navigator.geolocation.getCurrentPosition((pos) => {
      setAddress(`GPS: https://www.google.com/maps?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
      toast.dismiss(toastId);
      toast.success("Location detected!");
    }, () => {
      toast.dismiss(toastId);
      toast.error("Unable to retrieve location");
    });
  };

  const getNextLocalBillNumber = () => {
    const current = Number(localStorage.getItem("bb_desktop_bill_counter")) || 6000;
    localStorage.setItem("bb_desktop_bill_counter", String(current + 1));
    return current + 1;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    
    const subtotal = getCartSubtotal();
    const discountCombined = customDiscount + getLoyaltyDiscount();
    const finalTotal = getTotalBillPrice();
    const token = Math.floor(1000 + Math.random() * 9000);
    const earned = Math.floor(finalTotal / 100);
    const netPoints = customerPhone ? (earned - getTotalPointsRedeemedInCart() - pointsToRedeem) : 0;
    const pointsAfterBill = customerPhone ? Math.max(0, customerPoints + netPoints) : 0;

    let billNumber: number;
    try {
      if (navigator.onLine) {
        try {
          billNumber = await runTransaction(db, async (txn) => {
            const snap = await txn.get(doc(db, "settings", "store_bill_counter"));
            const next = snap.exists() ? (snap.data().nextBillNumber || 1) : 1;
            txn.set(doc(db, "settings", "store_bill_counter"), { nextBillNumber: next + 1 });
            return next;
          });
          localStorage.setItem("bb_desktop_bill_counter", String(billNumber));
        } catch {
          billNumber = getNextLocalBillNumber();
        }
      } else {
        billNumber = getNextLocalBillNumber();
      }

      const orderObj = { 
        billNumber, tokenNumber: token, customerName: customerName || "Walk-in Guest", 
        customerPhone: customerPhone ? `+91${customerPhone}` : "", items: cart, 
        subtotal, discount: discountCombined, gstRate: gstEnabled ? gstRate : 0, 
        gstAmount: getGstAmountCalculated(), total: finalTotal, timestamp: new Date(), 
        status: 'completed', fulfillmentType, deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "", 
        tableNumber: fulfillmentType === 'table' ? tableNumber : '', paymentMethod, chefInstructions, source: 'Desktop POS', address 
      };

      await addDoc(collection(db, "orders"), orderObj);

      if (customerPhone && customerPhone.length === 10) {
        const userRef = doc(db, "customer_points", customerPhone.trim());
        await setDoc(userRef, { name: customerName || "Walk-in Guest", phone: customerPhone.trim(), points: Math.max(0, pointsAfterBill), lastActive: new Date() }, { merge: true });
        if (earned > 0) await addDoc(collection(db, "customer_points", customerPhone.trim(), "history"), { type: 'earn', points: earned, description: `Earned Bill #${billNumber}`, timestamp: new Date() });
      }

      triggerBeep('success'); 
      toast.success(`Bill #${billNumber} Generated Successfully!`);
      
      const pConfig = getPrintConfig();
      if (kotEnabled) {
        await handlePrintKot(orderObj, pConfig);
        await new Promise((r) => setTimeout(r, 1200));
      }
      await handlePrintReceipt(orderObj, pConfig);

      setCart([]); setCustomerPhone(''); setCustomerName(''); setCustomerPoints(0); setPointsToRedeem(0); setCustomDiscount(0); setChefInstructions('');
      localStorage.removeItem("bb_desktop_saved_cart");
    } catch (err) {
      toast.error("Failed to complete order transaction");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "products", productId), { isAvailable: !currentStatus });
      setProducts(prev => prev.map((p) => p.id === productId ? { ...p, isAvailable: !currentStatus } : p));
      toast.success("Stock status updated!");
    } catch (err) {
      toast.error("Failed to update stock");
    }
  };

  const handleToggleTheme = (mode: 'dark' | 'light') => {
    triggerBeep('tap'); setThemeMode(mode); localStorage.setItem("bb_desktop_theme", mode);
    if (mode === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  };

  const filteredMenu = useMemo(() => products.filter((p) => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase())), [products, selectedCategory, searchQuery]);
  const filteredPastReceipts = useMemo(() => pastReceipts.filter((o) => String(o.billNumber).includes(receiptSearchQuery.trim()) || String(o.customerPhone || '').includes(receiptSearchQuery.trim()) || String(o.customerName || '').toLowerCase().includes(receiptSearchQuery.trim().toLowerCase())), [pastReceipts, receiptSearchQuery]);

  const mainClass = "min-h-screen flex font-sans antialiased overflow-hidden transition-colors duration-200 " + (themeMode === "dark" ? "dark bg-[#0d0d0d] text-neutral-100" : "bg-neutral-100 text-neutral-900");

  return (
    <div className={mainClass}>
      <Toaster position="top-right" />

      {!isLoggedIn ? (
        <div className="fixed inset-0 bg-neutral-950 text-white flex flex-col items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-10 shadow-2xl space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><SafeMonitor size={36} /></div>
              <h1 className="text-2xl font-black tracking-wider uppercase text-yellow-500">BUM BUM CAFE</h1>
              <p className="text-xs text-neutral-400 font-medium">Desktop POS Terminal • Enter Admin/Cashier PIN</p>
            </div>
            <form onSubmit={handlePinLoginSubmit} className="space-y-4">
              <input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="••••" className="w-full bg-neutral-950 border border-neutral-800 text-center text-4xl font-mono py-4 rounded-2xl outline-none text-orange-400 tracking-widest" autoFocus />
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-sm transition-all shadow-lg">Authenticate Terminal</button>
            </form>
          </motion.div>
        </div>
      ) : (
        <div className="flex h-screen w-screen overflow-hidden">
          
          {/* LEFT SIDEBAR (Navigation Menu - Fixed & Always Visible) */}
          <aside className="w-20 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-between py-6 shrink-0 shadow-lg select-none z-30">
            <div className="space-y-6 flex flex-col items-center">
              <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-md"><SafeDatabase size={22} /></div>
              
              <div className="space-y-2 w-full px-2">
                {[
                  { id: 'billing', label: 'POS', icon: SafeShoppingBag },
                  { id: 'orders', label: 'Live', icon: SafeClock, badge: pendingOrdersCount },
                  { id: 'inventory', label: 'Stock', icon: SafeLayers },
                  { id: 'receipts', label: 'Bills', icon: SafePrinter },
                  { id: 'settings', label: 'Setup', icon: SafeSettings }
                ].map((item) => {
                  const Icon = item.icon;
                  const isAct = activeTab === item.id;
                  return (
                    <button key={item.id} onClick={() => { triggerBeep('tap'); setActiveTab(item.id as any); }} title={item.label} className={"w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative " + (isAct ? "bg-orange-600 text-white shadow-lg" : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-orange-500")}>
                      <Icon size={20} />
                      <span className="text-[9px] font-bold uppercase">{item.label}</span>
                      {!!item.badge && item.badge > 0 && (
                        <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">{item.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 flex flex-col items-center w-full px-2">
              <button onClick={handleManualSync} title="Sync Cloud Data" className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center text-yellow-500 hover:bg-yellow-500/15 transition-all">
                {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <SafeRefreshCw size={18} />}
              </button>
              <button onClick={handleLogout} title="Lock Terminal" className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center text-red-500 hover:bg-red-500/15 transition-all">
                <SafeLogOut size={18} />
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 flex flex-col overflow-hidden bg-neutral-50 dark:bg-[#0a0a0a]">
            
            {/* Top Bar */}
            <header className="h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-4">
                <h1 className="text-sm font-black uppercase text-orange-500 tracking-wider">Bum Bum Cafe • Desktop Terminal</h1>
                <span className="text-xs bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full font-bold text-neutral-400">Cashier: {currentUser?.name || 'Admin'}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleToggleTheme(themeMode === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-orange-500">
                  {themeMode === 'dark' ? <SafeSun size={18} /> : <SafeMoon size={18} />}
                </button>
              </div>
            </header>

            {/* TAB 1: BILLING WORKSPACE (Desktop Split View with Integrated Mobile Cart Layout) */}
            {activeTab === 'billing' && (
              <div className="flex-1 flex overflow-hidden">
                
                {/* Left Product Catalog Section */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                      <SafeSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input type="text" placeholder="Search menu items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-12 text-sm outline-none focus:border-orange-500 shadow-sm" />
                    </div>
                  </div>

                  {/* Categories Row */}
                  <div className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button key={cat} onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} className={"px-4 py-2 rounded-xl text-xs font-black uppercase border transition-all shrink-0 " + (isSelected ? "bg-orange-500 text-black border-orange-500 shadow-md" : "bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:border-orange-500")}>
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Product Grid (4 Columns for Desktop) */}
                  {loading ? (
                    <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={36} /></div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4 overflow-y-auto flex-1 pr-2 pb-6 content-start select-none">
                      <AnimatePresence mode="popLayout">
                        {filteredMenu.map((item) => {
                          const isAvail = item.isAvailable !== false;
                          const hasImage = item.image || item.imageUrl || item.img;
                          return (
                            <motion.button layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={item.id} disabled={!isAvail} onClick={() => { triggerBeep('tap'); item.variants ? setSelectedProduct(item) : handleAddProductToCart(item); }} className={`border rounded-3xl text-left flex flex-col overflow-hidden h-44 transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm ${isAvail ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800 hover:border-orange-500" : "opacity-40 bg-neutral-100 dark:bg-neutral-950 border-neutral-800 pointer-events-none"}`}>
                              <div className="w-full h-24 bg-neutral-200 dark:bg-neutral-800 relative shrink-0 overflow-hidden">
                                {hasImage ? (
                                  <img src={hasImage} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px] font-bold uppercase">{item.category || "Item"}</div>
                                )}
                              </div>
                              <div className="p-3 flex-grow flex flex-col justify-between w-full">
                                <p className="font-bold text-xs line-clamp-2 leading-tight">{item.name}</p>
                                <p className="text-xs font-mono font-black text-orange-500">₹{item.price}</p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Right Side: Fixed Desktop Cart Panel (Recreated exactly with all mobile cart capabilities) */}
                <div className="w-[480px] border-l border-neutral-200 dark:border-neutral-800 flex flex-col h-full bg-white dark:bg-neutral-900 shadow-2xl relative shrink-0">
                  <div className="h-full flex flex-col overflow-y-auto p-5 space-y-4">
                    
                    <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3">
                      <h2 className="text-xs font-black uppercase text-orange-500 tracking-wider">Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h2>
                      {cart.length > 0 && <button onClick={() => { triggerBeep('tap'); setCart([]); }} className="text-[10px] font-bold text-red-500 hover:underline">Clear All</button>}
                    </div>

                    {/* Customer Info & Loyalty Section */}
                    <div className="space-y-2.5 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex gap-2">
                        <input type="text" maxLength={10} placeholder="Customer 10-digit Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none font-mono" />
                        <button onClick={handleCheckLoyalty} className="bg-orange-600 hover:bg-orange-500 text-white px-4 rounded-xl text-xs font-black uppercase">Find</button>
                        <button onClick={() => setIsCustomerModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 px-3 rounded-xl text-xs font-bold">Directory</button>
                      </div>

                      {customerName && (
                        <div className="space-y-2 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                          <div className="flex justify-between text-xs font-bold text-yellow-500">
                            <span>👤 {customerName}</span><span>⭐ Available Points: {customerPoints}</span>
                          </div>
                          {customerPoints > 0 && (
                            <div className="flex items-center justify-between text-xs bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20">
                              <span>Redeem Points (₹1 per pt):</span>
                              <input type="number" min={0} max={Math.min(customerPoints, getCartSubtotal())} value={pointsToRedeem} onChange={e => setPointsToRedeem(Number(e.target.value))} className="w-20 bg-white dark:bg-neutral-900 border border-yellow-500/40 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cart Items List */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-neutral-400 space-y-2">
                          <SafeShoppingBag size={32} className="animate-pulse opacity-50" />
                          <p className="text-xs font-bold uppercase">Cart is empty</p>
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.id} className="bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-2xl flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs truncate">{item.name}</p>
                                <p className="text-[10px] font-mono text-orange-500">₹{item.price * item.quantity}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">-</button>
                                <span className="w-6 text-center text-xs font-mono font-bold">{item.quantity}</span>
                                <button onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">+</button>
                              </div>
                            </div>
                            <input type="text" placeholder="Add item note (e.g. less spicy)..." value={item.note || ''} onChange={e => handleUpdateCartItemNote(item.id, e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-[10px] outline-none text-neutral-400" />
                          </div>
                        ))
                      )}
                    </div>

                    {/* Fulfillment Type & Delivery Options */}
                    <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
                        {(['table', 'pickup', 'delivery'] as const).map((type) => (
                          <button key={type} onClick={() => { triggerBeep('tap'); setFulfillmentType(type); }} className={"py-1.5 rounded-xl text-[10px] font-black uppercase transition-all " + (fulfillmentType === type ? "bg-orange-600 text-white shadow-sm" : "text-neutral-400 hover:text-white")}>{type}</button>
                        ))}
                      </div>

                      {fulfillmentType === 'table' && (
                        <input type="text" placeholder="Table Number (e.g., Table 4)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none" />
                      )}

                      {fulfillmentType === 'delivery' && (
                        <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                          <select value={selectedArea.name} onChange={e => { const ar = DELIVERY_AREAS.find(a => a.name === e.target.value); if (ar) setSelectedArea(ar); }} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2 text-xs outline-none">
                            {DELIVERY_AREAS.map(a => <option key={a.name} value={a.name}>{a.name} (Fee: ₹{a.fee})</option>)}
                          </select>
                          <div className="flex gap-2">
                            <input type="text" placeholder="Delivery Address / GPS Link" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none" />
                            <button onClick={handleDetectLocation} className="bg-neutral-200 dark:bg-neutral-700 px-3 rounded-xl text-xs font-bold whitespace-nowrap">GPS 📍</button>
                          </div>
                          {/* Free Delivery Progress Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] font-bold text-neutral-400">
                              <span>Free Delivery Target (₹{selectedArea.minFree})</span>
                              <span>{getFreeDeliveryProgressPercent().toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Custom Discount & Chef Instructions */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-400">Extra Discount (₹)</label>
                        <input type="number" min={0} value={customDiscount} onChange={e => setCustomDiscount(Number(e.target.value))} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs font-mono outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-400">Chef Note</label>
                        <input type="text" placeholder="Special instructions..." value={chefInstructions} onChange={e => setChefInstructions(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs outline-none" />
                      </div>
                    </div>

                    {/* Bill Totals & Checkout Button */}
                    <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800 mt-auto pb-4">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span className="font-mono">₹{getCartSubtotal()}</span></div>
                        {getLoyaltyDiscount() > 0 && <div className="flex justify-between text-yellow-500"><span>Loyalty Discount</span><span className="font-mono">-₹{getLoyaltyDiscount()}</span></div>}
                        {customDiscount > 0 && <div className="flex justify-between text-yellow-500"><span>Manual Discount</span><span className="font-mono">-₹{customDiscount}</span></div>}
                        {fulfillmentType === 'delivery' && <div className="flex justify-between text-neutral-400"><span>Delivery Charge</span><span className="font-mono">₹{getDeliveryCharge()}</span></div>}
                        {gstEnabled && <div className="flex justify-between text-neutral-400"><span>GST ({gstRate}%)</span><span className="font-mono">₹{getGstAmountCalculated()}</span></div>}
                        <div className="flex justify-between text-sm font-black text-green-500 pt-1 border-t border-dashed border-neutral-700">
                          <span>Grand Total</span><span className="font-mono text-base">₹{getTotalBillPrice()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>Cash</button>
                        <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>UPI / Online</button>
                      </div>

                      <button onClick={handlePlaceOrder} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                        {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <SafeCheck size={16} />}
                        <span>Complete & Print Bill (₹{getTotalBillPrice()})</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: LIVE ORDERS WORKSPACE */}
            {activeTab === 'orders' && (
              <div className="flex-1 p-6 overflow-y-auto">
                <h2 className="text-sm font-black uppercase text-orange-500 mb-4">Live Active Orders ({activeLiveOrders.length})</h2>
                <div className="grid grid-cols-3 gap-4">
                  {activeLiveOrders.length === 0 ? (
                    <div className="col-span-3 flex flex-col items-center justify-center py-20 text-neutral-500">
                      <SafeClock size={48} className="mb-2 opacity-50 animate-pulse" />
                      <p className="font-bold text-sm">No Active Live Orders Right Now</p>
                    </div>
                  ) : (
                    activeLiveOrders.map((order) => (
                      <div key={order.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-3">
                            <span className="font-mono text-sm font-black text-yellow-500">Bill #${order.billNumber}</span>
                            <span className="bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">{order.fulfillmentType}</span>
                          </div>
                          <p className="text-xs font-bold mb-2">👤 {order.customerName}</p>
                          <div className="space-y-1 bg-neutral-50 dark:bg-neutral-800/30 p-2.5 rounded-xl">
                            {order.items?.map((it: any, i: number) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span>{it.name}</span><span className="font-bold text-orange-500">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                          <div className="flex justify-between text-xs font-black text-green-500">
                            <span>Total:</span><span className="font-mono">₹{order.total}</span>
                          </div>
                          <div className="flex gap-2">
                            {order.status === 'pending' && (
                              <>
                                <button onClick={() => handleUpdateStatus(order.id, 'preparing')} className="flex-1 bg-green-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Accept</button>
                                <button onClick={() => handleUpdateStatus(order.id, 'rejected')} className="flex-1 bg-red-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Reject</button>
                              </>
                            )}
                            {order.status === 'preparing' && (
                              <button onClick={() => handleUpdateStatus(order.id, 'completed')} className="w-full bg-blue-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Mark Complete</button>
                            )}
                            <button onClick={() => handlePrintReceipt(order, getPrintConfig())} className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 hover:text-orange-500 rounded-xl"><SafePrinter size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: INVENTORY STOCK TOGGLE */}
            {activeTab === 'inventory' && (
              <div className="flex-1 p-6 overflow-y-auto">
                <h2 className="text-sm font-black uppercase text-orange-500 mb-4">Stock Management & Availability</h2>
                <div className="grid grid-cols-3 gap-3">
                  {products.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    return (
                      <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-bold text-xs">{item.name}</p>
                          <p className="text-[10px] text-neutral-400 font-mono">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isAvail ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{isAvail ? 'In Stock' : 'Out'}</span>
                          <button onClick={() => handleToggleStock(item.id, isAvail)} className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${isAvail ? 'text-red-400 border-red-500/20 hover:bg-red-500/10' : 'text-green-400 border-green-500/20 hover:bg-green-500/10'}`}>
                            {isAvail ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: PAST RECEIPTS */}
            {activeTab === 'receipts' && (
              <div className="flex-1 p-6 flex flex-col overflow-hidden">
                <div className="mb-4">
                  <input type="text" placeholder="Search bill number or customer phone..." value={receiptSearchQuery} onChange={e => setReceiptSearchQuery(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-4 text-xs outline-none shadow-sm" />
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {filteredPastReceipts.map((order) => (
                    <div key={order.id} onClick={() => { setSelectedReceipt(order); setIsReceiptModalOpen(true); }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:border-orange-500 transition-all shadow-sm">
                      <div>
                        <p className="font-mono font-bold text-xs">Bill #${order.billNumber}</p>
                        <p className="text-[10px] text-neutral-400">{order.customerName} • {new Date(order.timestamp?.toDate?.() || order.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-black font-mono ${order.status === 'refunded' ? 'line-through text-neutral-500' : 'text-green-500'}`}>₹{order.total}</span>
                        <button onClick={(e) => { e.stopPropagation(); handlePrintReceipt(order, getPrintConfig()); }} className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-orange-500 rounded-xl"><SafePrinter size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: DESKTOP SETTINGS */}
            {activeTab === 'settings' && (
              <div className="flex-1 p-6 overflow-y-auto max-w-2xl">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-xl space-y-6">
                  <h2 className="text-xs font-black uppercase text-orange-500">Desktop Terminal Settings</h2>
                  
                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 space-y-2">
                    <p className="text-xs font-bold uppercase">Kitchen Order Ticket (KOT):</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Automatically print KOT on checkout:</span>
                      <button onClick={() => { const next = !kotEnabled; setKotEnabled(next); localStorage.setItem("bb_desktop_kot_enabled", String(next)); }} className="text-orange-500">
                        {kotEnabled ? <SafeToggleRight size={32} /> : <SafeToggleLeft size={32} />}
                      </button>
                    </div>
                  </div>

                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 space-y-2">
                    <p className="text-xs font-bold uppercase">GST Calculation:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400">Enable GST on bills:</span>
                      <button onClick={() => { const next = !gstEnabled; setGstEnabled(next); localStorage.setItem("bb_desktop_gst_enabled", String(next)); }} className="text-orange-500">
                        {gstEnabled ? <SafeToggleRight size={32} /> : <SafeToggleLeft size={32} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase">USB Receipt Printer Setup:</p>
                    <div className="flex gap-3">
                      <button onClick={handleConnectPrinter} className="bg-amber-500 hover:bg-amber-400 text-black font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider">
                        {printerConnected ? 'USB Printer Connected ✅' : 'Connect USB Printer'}
                      </button>
                      <button onClick={handleTestPrint} className="bg-green-600 hover:bg-green-500 text-white font-black px-5 py-3 rounded-2xl text-xs uppercase tracking-wider">
                        Test Print 🧾
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-md w-full rounded-3xl p-6 shadow-2xl relative font-sans flex flex-col">
              <button onClick={() => setIsReceiptModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"><SafeX size={16} /></button>
              
              <h3 className="text-base font-black mb-1">Receipt Details</h3>
              <p className="text-xs text-neutral-400 font-mono mb-4">Bill No: #{selectedReceipt.billNumber}</p>

              <div className="space-y-3 max-h-60 overflow-y-auto mb-4 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl">
                {selectedReceipt.items?.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{it.name} <span className="text-orange-500 font-bold">x{it.quantity}</span></span>
                    <span className="font-mono">₹{it.price * it.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm font-black text-green-500 font-mono mb-6">
                <span>Total Amount:</span><span>₹{selectedReceipt.total}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => handlePrintReceipt(selectedReceipt, getPrintConfig())} className="flex-1 bg-green-600 text-white font-black py-3 rounded-2xl text-xs uppercase">Reprint Bill</button>
                {selectedReceipt.status !== 'refunded' && (
                  <button onClick={() => handleRefundOrder(selectedReceipt.id)} className="flex-1 bg-red-600 text-white font-black py-3 rounded-2xl text-xs uppercase">Refund Order</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen} setIsCustomerModalOpen={setIsCustomerModalOpen} customerSearchQuery={customerSearchQuery} setCustomerSearchQuery={setCustomerSearchQuery} searchedCustomers={searchedCustomers} isSearchingCustomer={isSearchingCustomer} newCustName={newCustName} setNewCustName={setNewCustName} newCustPhone={newCustPhone} setNewCustPhone={setNewCustPhone} newCustAddress={newCustAddress} setNewCustAddress={setNewCustAddress} editingCustomer={editingCustomer} viewingHistoryCustomer={viewingHistoryCustomer} customerHistoryList={customerHistoryList} editCustPoints={editCustPoints} setEditCustPoints={setEditCustPoints} handleSelectCustomer={handleSelectCustomer} handleLoadCustomerHistory={() => {}} handleStartEditProfile={() => {}} handleUpdateCustomerProfile={() => {}} handleSaveNewCustomer={() => {}} setViewingHistoryCustomer={() => {}} setCustomerHistoryList={() => {}} setEditingCustomer={() => {}} searchDbCustomers={searchDbCustomers} triggerBeep={triggerBeep}
      />

      <CustomizerModal 
        selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} normalPizzaSize={normalPizzaSize} setNormalPizzaSize={setNormalPizzaSize} normalPizzaPrice={normalPizzaPrice} setNormalPizzaPrice={setNormalPizzaPrice} normalPizzaAddons={{}} setNormalPizzaAddons={() => {}} customizerChefNote={customizerChefNote} setCustomizerChefNote={setCustomizerChefNote} PIZZA_ADDONS={{}} QUICK_INSTRUCTION_TAGS={QUICK_INSTRUCTION_TAGS} handleAddCustomizedItemToCart={handleAddCustomizedItemToCart} triggerBeep={triggerBeep}
      />
    </div>
  );
}
