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
  ChevronLeft, ChevronRight, Smartphone, Monitor, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import PosCartDrawer from '@/components/pos/PosCartDrawer';
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
const SafeChevronLeft = ChevronLeft as any;
const SafeChevronRight = ChevronRight as any;
const SafeSettings = Settings as any;
const SafeSmartphone = Smartphone as any;
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

export default function BbCafePosMobile() {
  const DELIVERY_AREAS: DeliveryArea[] = useMemo(() => [
    { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
    { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
    { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
  ], []);

  const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'billing' | 'inventory' | 'receipts' | 'settings'>('billing');
  const [previousTab, setPreviousTab] = useState<'billing' | 'inventory' | 'receipts' | 'settings'>('billing');

  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Printer & KOT Settings states
  const [printerType, setPrinterType] = useState<'thermal_usb' | 'thermal_bluetooth' | 'network_ip' | 'laser'>('thermal_usb');
  const [printerIp, setPrinterIp] = useState('192.168.1.100');
  const [printCopies, setPrintCopies] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);
  const [fontSize, setFontSize] = useState<number>(9); 
  const [kotEnabled, setKotEnabled] = useState<boolean>(true); 

  // USB Web Serial and WebUSB references
  const [serialPort, setSerialPort] = useState<any>(null); 
  const [usbDevice, setUsbDevice] = useState<any>(null); 

  // Swipe gesture tracking states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

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
  const [receiptsLimit, setReceiptsLimit] = useState(20);

  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleClearAllLiveOrders = async () => {
    triggerBeep('tap');
    const confirmClear = window.confirm("क्या आप वाकई सभी एक्टिव लाइव ऑर्डर्स को साफ़ (Complete) करना चाहते हैं?");
    if (!confirmClear) return;
    
    const toastId = toast.loading("Clearing active orders...");
    try {
      const promises = activeLiveOrders.map(order => 
        updateDoc(doc(db, "orders", order.id), { status: 'completed' })
      );
      await Promise.all(promises);
      toast.dismiss(toastId);
      toast.success("Active orders cleared successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to clear active orders");
    }
  };

  const handleSetPaymentMethod = (val: 'cash' | 'upi' | 'card') => {
    if (val === 'card') {
      setPaymentMethod('cash'); 
    } else {
      setPaymentMethod(val);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) {
      try { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); } catch (e) {}
    }
    setGstEnabled(localStorage.getItem("bb_pos_gst_enabled") === 'true');
    setGstRate(Number(localStorage.getItem("bb_pos_gst_rate")) || 5);
    setPrinterPaperSize((localStorage.getItem("bb_pos_paper_size") as any) || '58mm');
    setKotEnabled(localStorage.getItem("bb_pos_kot_enabled") !== 'false'); 

    const localTheme = localStorage.getItem("bb_pos_theme") || 'dark';
    setThemeMode(localTheme as any);
    if (localTheme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');

    const savedCart = localStorage.getItem("bb_pos_saved_cart");
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch (err) {} }
    setCustomerPhone(localStorage.getItem("bb_pos_saved_cust_phone") || '');
    setCustomerName(localStorage.getItem("bb_pos_saved_cust_name") || '');
    setCustomerPoints(Number(localStorage.getItem("bb_pos_saved_cust_points")) || 0);
    setAddress(localStorage.getItem("bb_pos_saved_cust_address") || '');
    setFulfillmentType((localStorage.getItem("bb_pos_saved_fulfillment_type") as any) || 'table');
    setTableNumber(localStorage.getItem("bb_pos_saved_table_number") || 'Table 1');
    setChefInstructions(localStorage.getItem("bb_pos_saved_chef_instructions") || '');
  }, []);

  useEffect(() => {
    localStorage.setItem("bb_pos_saved_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(40));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(list);

      let maxBill = Number(localStorage.getItem("bb_pos_local_bill_counter")) || 5000;
      list.forEach((ord: any) => {
        const bNum = Number(ord.billNumber);
        if (!isNaN(bNum) && bNum > maxBill) maxBill = bNum;
      });
      localStorage.setItem("bb_pos_local_bill_counter", String(maxBill));
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
        alarmIntervalRef.current = setInterval(() => {
          triggerBeep('alarm');
        }, 2000);
      }
    } else {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
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
        const q = receiptSearchQuery.trim() ? query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(100)) : query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(receiptsLimit));
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
    const toastId = toast.loading("Syncing data...");
    try {
      await waitForPendingWrites(db);
      const prodSnap = await getDocs(collection(db, "products"));
      const items = prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      const uniqueCats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
      setCategories(['All', ...uniqueCats]);
      toast.dismiss(toastId);
      toast.success("Synced successfully!");
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
        localStorage.setItem("bb_pos_user", JSON.stringify({ id: snap.docs[0].id, ...uDoc })); 
        toast.success(`Welcome, ${uDoc.name}!`);
      } else {
        toast.error("Incorrect PIN!");
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
    localStorage.removeItem("bb_pos_user");
    setIsLoggedIn(false);
    setCurrentUser(null);
    toast.success("Locked!");
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Updated to ${nextStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleRefundOrder = async (orderId: string) => {
    triggerBeep('tap');
    if (!window.confirm("Are you sure you want to refund this bill?")) return;
    const toastId = toast.loading("Processing Refund...");
    try {
      await updateDoc(doc(db, "orders", orderId), { status: 'refunded' });
      setSelectedReceipt((prev: any) => prev ? { ...prev, status: 'refunded' } : null);
      setPastReceipts(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded' } : o));
      toast.dismiss(toastId);
      toast.success("Refunded Successfully!");
      setIsReceiptModalOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Refund failed");
    }
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
    toast.success(`${item.name} added!`, { duration: 600 });
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

  const handleTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) > minSwipeDistance) {
      const currentIndex = categories.indexOf(selectedCategory);
      if (currentIndex !== -1) {
        if (distance > 0) setSelectedCategory(categories[(currentIndex + 1) % categories.length]);
        else setSelectedCategory(categories[(currentIndex - 1 + categories.length) % categories.length]);
        triggerBeep('tap');
      }
    }
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
    const toastId = toast.loading(`Connecting to ${printerType.toUpperCase()}...`);
    try {
      if (printerType === 'thermal_bluetooth' && 'bluetooth' in navigator) {
        const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] });
        const server = await device.gatt!.connect();
        let service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb').catch(() => server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb'));
        let characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb').catch(() => service.getCharacteristic('0000ff02-0000-1000-8000-00805f9b34fb'));
        setBleCharacteristic(characteristic);
        setPrinterConnected(true);
        localStorage.setItem("bb_pos_printer_connected", "true");
        toast.dismiss(toastId);
        toast.success("Bluetooth Printer Connected!");
      } else if (printerType === 'thermal_usb' && 'serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        setSerialPort(port);
        setPrinterConnected(true);
        localStorage.setItem("bb_pos_printer_connected", "true");
        toast.dismiss(toastId);
        toast.success("USB Printer Connected!");
      } else {
        setTimeout(() => {
          toast.dismiss(toastId);
          setPrinterConnected(true);
          localStorage.setItem("bb_pos_printer_connected", "true");
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

  const handleTestPrint = () => {
    handlePrintReceipt({ billNumber: '0000', tokenNumber: '9999', fulfillmentType: 'test', paymentMethod: 'system', items: [{ name: 'Print Test', quantity: 1, price: 100 }], subtotal: 100, discount: 0, total: 100, timestamp: new Date() }, getPrintConfig());
  };

  const getNextLocalBillNumber = () => {
    const current = Number(localStorage.getItem("bb_pos_local_bill_counter")) || 5000;
    localStorage.setItem("bb_pos_local_bill_counter", String(current + 1));
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
          localStorage.setItem("bb_pos_local_bill_counter", String(billNumber));
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
        tableNumber: fulfillmentType === 'table' ? tableNumber : '', paymentMethod, chefInstructions, source: 'POS', address 
      };

      await addDoc(collection(db, "orders"), orderObj);

      if (customerPhone && customerPhone.length === 10) {
        const userRef = doc(db, "customer_points", customerPhone.trim());
        await setDoc(userRef, { name: customerName || "Walk-in Guest", phone: customerPhone.trim(), points: Math.max(0, pointsAfterBill), lastActive: new Date() }, { merge: true });
        if (earned > 0) await addDoc(collection(db, "customer_points", customerPhone.trim(), "history"), { type: 'earn', points: earned, description: `Earned Bill #${billNumber}`, timestamp: new Date() });
      }

      triggerBeep('success'); 
      toast.success(`Bill #${billNumber} saved!`);
      
      const pConfig = getPrintConfig();
      if (kotEnabled) {
        await handlePrintKot(orderObj, pConfig);
        await new Promise((r) => setTimeout(r, 1500));
      }
      await handlePrintReceipt(orderObj, pConfig);

      setCart([]); setCustomerPhone(''); setCustomerName(''); setCustomerPoints(0); setPointsToRedeem(0); setCustomDiscount(0); setIsCartOpen(false); setChefInstructions('');
      localStorage.removeItem("bb_pos_saved_cart");
    } catch (err) {
      toast.error("Failed to place order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "products", productId), { isAvailable: !currentStatus });
      setProducts(prev => prev.map((p) => p.id === productId ? { ...p, isAvailable: !currentStatus } : p));
      toast.success("Stock toggled!");
    } catch (err) {
      toast.error("Failed");
    }
  };

  const handleToggleTheme = (mode: 'dark' | 'light') => {
    triggerBeep('tap'); setThemeMode(mode); localStorage.setItem("bb_pos_theme", mode);
    if (mode === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  };

  const filteredMenu = useMemo(() => products.filter((p) => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase())), [products, selectedCategory, searchQuery]);
  const filteredPastReceipts = useMemo(() => pastReceipts.filter((o) => String(o.billNumber).includes(receiptSearchQuery.trim()) || String(o.customerPhone || '').includes(receiptSearchQuery.trim()) || String(o.customerName || '').toLowerCase().includes(receiptSearchQuery.trim().toLowerCase())), [pastReceipts, receiptSearchQuery]);
  const liveOrdersBadgeCount = activeLiveOrders.length;

  const navItems = [
    { id: 'billing', label: 'Counter Billing', icon: SafeShoppingBag },
    { id: 'inventory', label: 'Stock Toggle', icon: SafeLayers },
    { id: 'receipts', label: 'Past Receipts', icon: SafePrinter },
    { id: 'settings', label: 'POS Settings', icon: SafeSettings }
  ];

  const mainClass = "min-h-screen flex flex-col font-sans antialiased overflow-hidden transition-colors duration-200 " + (themeMode === "dark" ? "dark bg-[#0a0a0a] text-neutral-100" : "bg-neutral-50 text-neutral-800");
  const asideClass = "bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between p-4 shrink-0 shadow-2xl transition-all duration-300 fixed inset-y-0 left-0 z-50 w-64 " + (isSidebarOpen ? "translate-x-0" : "-translate-x-full");

  return (
    <div className={mainClass}>
      <Toaster position="top-center" />

      {!isLoggedIn ? (
        <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><SafeLock size={32} /></div>
              <h1 className="text-xl font-black uppercase text-yellow-500">BUM BUM CAFE</h1>
              <p className="text-xs text-neutral-400">Terminal Locked • Enter PIN</p>
            </div>
            <form onSubmit={handlePinLoginSubmit} className="space-y-4">
              <input type="password" maxLength={4} value={pinInput} readOnly placeholder="••••" className="w-full bg-neutral-900 border border-neutral-800 text-center text-3xl font-mono py-4 rounded-2xl outline-none text-orange-400" />
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button key={num} type="button" onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput((p) => p + String(num)); }} className="aspect-square bg-neutral-900 hover:bg-[#151515] font-black text-xl rounded-2xl border border-neutral-800 flex items-center justify-center">{num}</button>
                ))}
                <button type="button" onClick={() => { triggerBeep('tap'); setPinInput(''); }} className="aspect-square bg-neutral-900 font-bold text-xs uppercase text-red-400 rounded-2xl border border-neutral-800 flex items-center justify-center">Clear</button>
                <button type="button" onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput((p) => p + '0'); }} className="aspect-square bg-neutral-900 font-black text-xl rounded-2xl border border-neutral-800 flex items-center justify-center">0</button>
                <button type="submit" className="aspect-square bg-orange-600 font-bold text-xs uppercase rounded-2xl flex items-center justify-center">Login</button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-neutral-950/80 z-40" />}

          <aside className={asideClass}>
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1 py-1 border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-2">
                <div className="flex items-center gap-2">
                  <SafeDatabase className="text-orange-500 animate-pulse" size={18} />
                  <h1 className="text-xs font-black uppercase text-yellow-500">Bum Bum Mobile POS</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-gray-400"><SafeX size={16} /></button>
              </div>
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => { triggerBeep('tap'); setActiveTab(item.id as any); setIsSidebarOpen(false); }} className={"w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all " + (activeTab === item.id ? "bg-orange-600 text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800")}>
                      <div className="flex items-center gap-3"><Icon size={14} /><span>{item.label}</span></div>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button onClick={handleManualSync} disabled={isSyncing} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-50">
                {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />}
                <span>Sync Now</span>
              </button>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10">
                <SafeLogOut size={14} /><span>Lock POS</span>
              </button>
            </div>
          </aside>

          <main className="flex-1 p-3 overflow-y-auto flex flex-col h-screen relative">
            <div className="flex items-center gap-3 mb-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-neutral-200 dark:bg-neutral-800 text-orange-500 rounded-xl"><SafeMenu size={18} /></button>

              <div className="flex flex-col">
                <h2 className="text-[10px] font-black uppercase text-orange-500">{activeTab} Workspace</h2>
                <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold">Bum Bum Cafe • Mohandra</span>
              </div>
              
              <button 
                onClick={() => {
                  triggerBeep('tap');
                  if (activeTab === 'orders') {
                    setActiveTab(previousTab);
                  } else {
                    setPreviousTab(activeTab as any);
                    setActiveTab('orders');
                  }
                }} 
                className={"ml-auto p-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all relative " + (activeTab === 'orders' ? "bg-orange-600 text-white" : "bg-neutral-200 dark:bg-neutral-800 text-orange-500")}
              >
                <SafeClock size={14} />
                <span>{activeTab === 'orders' ? 'Menu' : 'Live'}</span>
                {liveOrdersBadgeCount > 0 && (
                  <span className={`font-black text-[9px] px-2 py-0.5 rounded-full font-mono animate-pulse ${pendingOrdersCount > 0 ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'}`}>
                    {liveOrdersBadgeCount}
                  </span>
                )}
              </button>
            </div>

            {/* LIVE ORDERS */}
            {activeTab === 'orders' && (
              <div className="flex flex-col flex-1 overflow-hidden font-sans">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase text-neutral-500">Active Orders ({activeLiveOrders.length})</span>
                  {activeLiveOrders.length > 0 && <button onClick={handleClearAllLiveOrders} className="text-[9px] font-black uppercase px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl">Clean 🧹</button>}
                </div>
                <div className="grid grid-cols-1 gap-3 pb-24 overflow-y-auto flex-grow">
                  {activeLiveOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <SafeClock size={48} className="text-neutral-400 mb-4 animate-pulse" />
                      <p className="text-base font-black text-neutral-500">No Active Orders</p>
                    </div>
                  ) : (
                    activeLiveOrders.map((order) => (
                      <div key={order.id} className={`border bg-white dark:bg-neutral-950 rounded-2xl p-4 flex flex-col justify-between shadow-lg ${order.status === 'pending' ? 'border-red-500 animate-pulse' : 'border-neutral-200 dark:border-neutral-800'}`}>
                        <div>
                          <div className="flex justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
                            <p className="text-xs font-black text-yellow-500 font-mono">Bill #${String(order.billNumber).padStart(4, '0')}</p>
                            <span className="bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase px-2 py-0.5 rounded">{order.fulfillmentType}</span>
                          </div>
                          <p className="text-[10px] font-black">👤 {order.customerName}</p>
                          <div className="space-y-1.5 pt-2 mb-4 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                            {order.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-[11px] font-semibold">
                                <span>{it.name} <span className="text-orange-500">x{it.quantity}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-black text-green-500 mb-3 border-t border-neutral-200 dark:border-neutral-800 pt-2">
                            <span>Total:</span><span className="font-mono">₹{order.total}</span>
                          </div>
                          <div className="flex gap-2">
                            {order.status === 'pending' && (
                              <div className="flex gap-2 w-full">
                                <button onClick={() => handleUpdateStatus(order.id, 'preparing')} className="flex-1 bg-green-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Accept</button>
                                <button onClick={() => handleUpdateStatus(order.id, 'rejected')} className="flex-1 bg-red-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Reject</button>
                              </div>
                            )}
                            {order.status === 'preparing' && <button onClick={() => handleUpdateStatus(order.id, order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'completed')} className="flex-1 bg-blue-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Dispatch</button>}
                            {order.status === 'out_for_delivery' && <button onClick={() => handleUpdateStatus(order.id, 'completed')} className="flex-1 bg-green-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Delivered</button>}
                            <button onClick={() => handlePrintReceipt(order, getPrintConfig())} className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 hover:text-orange-500 rounded-xl"><SafePrinter size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* BILLING WORKSPACE */}
            {activeTab === 'billing' && (
              <div className="flex-1 flex flex-col gap-3 overflow-hidden relative h-full">
                
                <div className="relative">
                  <SafeSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input type="text" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl py-2 px-9 text-xs outline-none text-neutral-800 dark:text-neutral-100 border border-transparent dark:border-neutral-700 focus:border-orange-500" />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none shrink-0">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button key={cat} onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} className={"px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border shrink-0 transition-all " + (isSelected ? "bg-orange-500 text-black border-orange-500" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:text-orange-500")}>
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
                ) : (
                  <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 pb-24 content-start select-none touch-pan-y">
                    <AnimatePresence mode="popLayout">
                      {filteredMenu.map((item) => {
                        const isAvail = item.isAvailable !== false;
                        const hasImage = item.image || item.imageUrl || item.img;
                        return (
                          <motion.button layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={item.id} disabled={!isAvail} onClick={() => { triggerBeep('tap'); item.variants ? setSelectedProduct(item) : handleAddProductToCart(item); }} className={`border rounded-2xl text-left flex flex-col overflow-hidden h-32 transition-all duration-200 active:scale-95 ${isAvail ? "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-850 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700" : "opacity-40 bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 pointer-events-none"}`}>
                            {hasImage ? (
                              <img src={hasImage} alt={item.name} className="w-full h-18 object-cover shrink-0 bg-neutral-200 dark:bg-neutral-700" />
                            ) : (
                              <div className="w-full h-18 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-400 text-[8px] font-bold uppercase shrink-0">{item.category || "No Image"}</div>
                            )}
                            <div className="p-1.5 flex-grow flex flex-col justify-center">
                              <p className="font-bold text-[10px] line-clamp-2 leading-tight">{item.name}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}

                {/* Mobile Floating Cart Button */}
                {cart.length > 0 && (
                  <motion.button initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={() => setIsCartOpen(true)} className="fixed bottom-4 right-4 left-4 bg-green-600 text-white font-black px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-40 active:scale-95 transition-all">
                    <div className="flex items-center gap-2.5">
                      <SafeShoppingBag size={16} />
                      <div className="text-left">
                        <p className="text-[8px] uppercase text-green-100 font-bold">Active Cart</p>
                        <p className="text-xs font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-mono">
                      <span>Pay: ₹{getTotalBillPrice()}</span><span>➔</span>
                    </div>
                  </motion.button>
                )}

              </div>
            )}

            {/* INVENTORY WORKSPACE */}
            {activeTab === 'inventory' && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 flex-1 overflow-y-auto pb-20 rounded-3xl shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xs font-black uppercase text-orange-500">Stock Control</h2>
                  <button onClick={async () => { triggerBeep('tap'); const snap = await getDocs(collection(db, "products")); setProducts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))); }} className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 rounded-xl"><SafeRefreshCw size={14} /></button>
                </div>
                <div className="space-y-2">
                  {products.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    return (
                      <div key={item.id} className="bg-neutral-50 dark:bg-neutral-800/45 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs block">{item.name}</span>
                          <span className="text-[8px] text-neutral-400 block">₹{item.price}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={"text-[8px] font-black px-2 py-0.5 rounded-full border " + (isAvail ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>{isAvail ? 'In Stock' : 'Out'}</span>
                          <button onClick={() => handleToggleStock(item.id, isAvail)} className={"text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all " + (isAvail ? "text-red-400 border-red-500/20" : "text-green-400 border-green-500/20")}>{isAvail ? 'Disable' : 'Enable'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PAST RECEIPTS WORKSPACE */}
            {activeTab === 'receipts' && (
              <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-3 flex flex-col overflow-hidden shadow-xl">
                <div className="relative mb-3">
                  <SafeSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input type="text" placeholder="Search receipt..." value={receiptSearchQuery} onChange={e => setReceiptSearchQuery(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl py-2 px-9 text-xs outline-none" />
                </div>
                {isSearchingReceipts ? (
                  <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
                ) : (
                  <div className="space-y-2 overflow-y-auto flex-1 pr-1 pb-16">
                    {filteredPastReceipts.length === 0 ? (
                      <p className="text-center text-neutral-400 text-xs py-12">No receipts found</p>
                    ) : (
                      filteredPastReceipts.map((order) => {
                        const isRefunded = order.status === 'refunded';
                        return (
                          <div key={order.id} onClick={() => { triggerBeep('tap'); setSelectedReceipt(order); setIsReceiptModalOpen(true); }} className="bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-850 p-3 rounded-2xl flex justify-between items-center">
                            <div>
                              <span className="font-bold text-xs block font-mono">Bill #${order.billNumber}</span>
                              <span className="text-[9px] text-neutral-400 block font-mono">{order.customerName}</span>
                            </div>
                            <span className={`text-sm font-black font-mono ${isRefunded ? 'text-neutral-400 line-through' : 'text-green-500'}`}>₹{order.total}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS WORKSPACE (KOT Print Option Added Back) */}
            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto w-full pb-20 overflow-y-auto flex-1 font-sans">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-xl space-y-5">
                  <h3 className="text-xs font-black uppercase text-orange-500">Mobile POS Settings</h3>
                  
                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3 space-y-2">
                    <p className="text-xs font-bold uppercase">UI Theme:</p>
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-48">
                      <button onClick={() => handleToggleTheme('dark')} className={"flex-grow py-1.5 rounded-lg text-[9px] font-black uppercase " + (themeMode === 'dark' ? "bg-neutral-950 text-amber-400" : "text-neutral-400")}>Dark</button>
                      <button onClick={() => handleToggleTheme('light')} className={"flex-grow py-1.5 rounded-lg text-[9px] font-black uppercase " + (themeMode === 'light' ? "bg-white text-orange-600" : "text-neutral-400")}>Light</button>
                    </div>
                  </div>

                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3 space-y-2">
                    <p className="text-xs font-bold uppercase">GST Config:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Enable GST:</span>
                      <button onClick={() => { const next = !gstEnabled; setGstEnabled(next); localStorage.setItem("bb_pos_gst_enabled", String(next)); }} className="text-orange-500">
                        {gstEnabled ? <SafeToggleRight size={28} /> : <SafeToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>

                  {/* KOT Printing Toggle Option Added */}
                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase">Enable KOT Printing:</p>
                      <button onClick={() => { const next = !kotEnabled; setKotEnabled(next); localStorage.setItem("bb_pos_kot_enabled", String(next)); toast.success(next ? "KOT ON" : "KOT OFF"); }} className="text-orange-500">
                        {kotEnabled ? <SafeToggleRight size={28} /> : <SafeToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase">Printer Connection:</p>
                    <div className="flex gap-2">
                      <button onClick={handleConnectPrinter} disabled={isConnecting} className="flex-1 bg-amber-500 text-black font-black py-2.5 rounded-xl text-[9px] uppercase">Connect</button>
                      <button onClick={handleTestPrint} className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-[9px] uppercase">Test Print 🧾</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      <PosCartDrawer 
        isHindi={false} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} cart={cart} setCart={setCart} customerPhone={customerPhone} setCustomerPhone={setCustomerPhone} customerName={customerName} setCustomerName={setCustomerName} customerPoints={customerPoints} setCustomerPoints={setCustomerPoints} pointsToRedeem={pointsToRedeem} setPointsToRedeem={setPointsToRedeem} customDiscount={customDiscount} setCustomDiscount={setCustomDiscount} fulfillmentType={fulfillmentType} setFulfillmentType={setFulfillmentType} selectedArea={selectedArea} setSelectedArea={setSelectedArea} DELIVERY_AREAS={DELIVERY_AREAS} address={address} setAddress={setAddress} tableNumber={tableNumber} setTableNumber={setTableNumber} chefInstructions={chefInstructions} setChefInstructions={setChefInstructions} isSubmittingOrder={isSubmittingOrder} paymentMethod={paymentMethod} setPaymentMethod={handleSetPaymentMethod} noCutlery={false} setNoCutlery={() => {}} getCartSubtotal={getCartSubtotal} getCartAddonsPrice={() => 0} getDeliveryCharge={getDeliveryCharge} getFreeDeliveryProgressPercent={getFreeDeliveryProgressPercent} getTotalPointsRedeemedInCart={getTotalPointsRedeemedInCart} getTotalBillPrice={getTotalBillPrice} loyaltyRules={loyaltyRules} handlePlaceOrder={handlePlaceOrder} handleDetectLocation={handleDetectLocation} setIsCustomerModalOpen={setIsCustomerModalOpen} searchDbCustomers={searchDbCustomers} handleUpdateCartQuantity={handleUpdateCartQuantity} handleUpdateCartItemNote={handleUpdateCartItemNote} showAddonsSection={false} triggerBeep={triggerBeep} handleCheckLoyalty={handleCheckLoyalty} ketchupAddon={false} setKetchupAddon={() => {}} oreganoAddon={false} setOreganoAddon={() => {}} chiliFlakesAddon={false} setChiliFlakesAddon={() => {}}
      />

      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen} setIsCustomerModalOpen={setIsCustomerModalOpen} customerSearchQuery={customerSearchQuery} setCustomerSearchQuery={setCustomerSearchQuery} searchedCustomers={searchedCustomers} isSearchingCustomer={isSearchingCustomer} newCustName={newCustName} setNewCustName={setNewCustName} newCustPhone={newCustPhone} setNewCustPhone={setNewCustPhone} newCustAddress={newCustAddress} setNewCustAddress={newCustAddress} editingCustomer={editingCustomer} viewingHistoryCustomer={viewingHistoryCustomer} customerHistoryList={customerHistoryList} editCustPoints={editCustPoints} setEditCustPoints={setEditCustPoints} handleSelectCustomer={handleSelectCustomer} handleLoadCustomerHistory={handleLoadCustomerHistory} handleStartEditProfile={handleStartEditProfile} handleUpdateCustomerProfile={handleUpdateCustomerProfile} handleSaveNewCustomer={handleSaveNewCustomer} setViewingHistoryCustomer={setViewingHistoryCustomer} setCustomerHistoryList={setCustomerHistoryList} setEditingCustomer={setEditingCustomer} searchDbCustomers={searchDbCustomers} triggerBeep={triggerBeep}
      />

      <CustomizerModal 
        selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} normalPizzaSize={normalPizzaSize} setNormalPizzaSize={setNormalPizzaSize} normalPizzaPrice={normalPizzaPrice} setNormalPizzaPrice={setNormalPizzaPrice} normalPizzaAddons={{}} setNormalPizzaAddons={() => {}} customizerChefNote={customizerChefNote} setCustomizerChefNote={setCustomizerChefNote} PIZZA_ADDONS={{}} QUICK_INSTRUCTION_TAGS={QUICK_INSTRUCTION_TAGS} handleAddCustomizedItemToCart={handleAddCustomizedItemToCart} triggerBeep={triggerBeep}
      />
    </div>
  );
}
