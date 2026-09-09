'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc,
  waitForPendingWrites
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  Database, RefreshCw, Layers, Menu, LogOut, Lock, ToggleLeft, ToggleRight, 
  Sun, Moon, Tag, Trash2, ArrowRight, CheckCircle2, UserPlus, Download, PlusCircle, Edit3, FileText, LayoutGrid, ChevronLeft, ChevronRight, Gift, Percent
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';

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
const SafeDownload = Download as any;
const SafePlusCircle = PlusCircle as any;
const SafeEdit3 = Edit3 as any;
const SafeFileText = FileText as any;
const SafeLayoutGrid = LayoutGrid as any;
const SafeChevronLeft = ChevronLeft as any;
const SafeChevronRight = ChevronRight as any;
const SafeGift = Gift as any;
const SafePercent = Percent as any;

interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string; 
  variation?: string;
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

let globalAudioCtx: AudioContext | null = null;

export default function BbCafeDesktopPos() {
  const DELIVERY_AREAS: DeliveryArea[] = useMemo(() => [
    { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
    { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
    { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
  ], []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'receipts' | 'settings' | 'orders' | 'tables'>('billing');

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [usbDevice, setUsbDevice] = useState<any>(null);
  const [kotEnabled, setKotEnabled] = useState<boolean>(true); 

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  
  const [showNewCustForm, setShowNewCustForm] = useState(false);
  const [newCustNameInput, setNewCustNameInput] = useState('');
  const [newCustAddressInput, setNewCustAddressInput] = useState('');

  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Item Variation Popup States
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<any>(null);
  const [availableVariations, setAvailableVariations] = useState<any[]>([]);
  const [selectedVariationType, setSelectedVariationType] = useState('Full');
  const [customVariationPrice, setCustomVariationPrice] = useState<number>(0);
  const [itemNoteInput, setItemNoteInput] = useState('');

  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); 
  const [receiptsLimit, setReceiptsLimit] = useState(30);

  const [isSyncing, setIsSyncing] = useState(false);

  // Cart & Table Management States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('Table 1');
  
  const [activeEditingOrderId, setActiveEditingOrderId] = useState<string | null>(null);
  const [activeEditingBillNumber, setActiveEditingBillNumber] = useState<number | null>(null);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [chefInstructions, setChefInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    const savedUser = localStorage.getItem("bb_pos_user_pc");
    if (savedUser) { try { setIsLoggedIn(true); setCurrentUser(JSON.parse(savedUser)); } catch (e) {} }
    setGstEnabled(localStorage.getItem("bb_pos_gst_enabled_pc") === 'true');
    setGstRate(Number(localStorage.getItem("bb_pos_gst_rate_pc")) || 5);
    setKotEnabled(localStorage.getItem("bb_pos_kot_enabled_pc") !== 'false'); 

    const localTheme = localStorage.getItem("bb_pos_theme_pc") || 'dark';
    setThemeMode(localTheme as any);
    if (localTheme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');

    const savedCart = localStorage.getItem("bb_pos_saved_cart_pc");
    if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch (err) {} }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast("App already installed or browser does not support direct installation.", { icon: 'ℹ️' });
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      toast.success("App installed successfully on your PC! 🎉");
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    localStorage.setItem("bb_pos_saved_cart_pc", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(list);
    });
    return () => unsubscribe();
  }, []);

  const activeLiveOrders = useMemo(() => liveOrders.filter((o) => (o.fulfillmentType === 'delivery' || o.fulfillmentType === 'pickup') && o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const activeTableOrders = useMemo(() => liveOrders.filter((o) => o.fulfillmentType === 'table' && o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);

  const pendingOrdersCount = useMemo(() => activeLiveOrders.filter((o) => o.status === 'pending').length, [activeLiveOrders]);
  const activeTablesCount = useMemo(() => activeTableOrders.length, [activeTableOrders]);

  useEffect(() => {
    if (pendingOrdersCount > 0) {
      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(() => { triggerBeep('alarm'); }, 2000);
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
      } catch (err) {
        toast.error("Error loading products");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

  useEffect(() => {
    if (activeTab !== 'receipts') return;
    (async () => {
      try {
        const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(receiptsLimit));
        const snap = await getDocs(q);
        setPastReceipts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {}
    })();
  }, [activeTab, receiptsLimit]);

  const handleManualSync = async () => {
    triggerBeep('tap');
    if (!navigator.onLine) { toast.error("You are offline!"); return; }
    setIsSyncing(true);
    const toastId = toast.loading("Syncing products...");
    try {
      await waitForPendingWrites(db);
      const prodSnap = await getDocs(collection(db, "products"));
      const items = prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      toast.dismiss(toastId);
      toast.success("Synced successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePinLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Verifying PIN...");
    try {
      const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput)));
      toast.dismiss(toastId);
      if (!snap.empty) {
        const uDoc = snap.docs[0].data();
        setIsLoggedIn(true);
        setCurrentUser({ id: snap.docs[0].id, ...uDoc });
        localStorage.setItem("bb_pos_user_pc", JSON.stringify({ id: snap.docs[0].id, ...uDoc })); 
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
    localStorage.removeItem("bb_pos_user_pc");
    setIsLoggedIn(false);
    setCurrentUser(null);
    toast.success("Locked PC Terminal!");
  };

  const handleCheckLoyalty = async () => {
    triggerBeep('tap');
    const cleanPhone = customerPhone.trim();
    if (cleanPhone.length !== 10) return toast.error("कृपया सही 10-डिजिट मोबाइल नंबर दर्ज करें!");
    
    const toastId = toast.loading("कस्टमर खोजा जा रहा है...");
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
        setIsRedeemingPoints(false);
        setPointsToRedeem(0);
        toast.success(`कस्टमर मिल गया: ${data.name} (पॉइंट्स: ${data.points || 0})`);
      } else {
        setCustomerName('');
        setCustomerPoints(0);
        setIsRedeemingPoints(false);
        setPointsToRedeem(0);
        setShowNewCustForm(true);
        toast("नया नंबर है! कृपया नाम दर्ज करें।", { icon: 'ℹ️' });
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("डेटाबेस कनेक्ट करने में समस्या आई।");
    }
  };

  const handleSaveNewCustomerQuick = async () => {
    const cleanPhone = customerPhone.trim();
    const nameTrim = newCustNameInput.trim();
    if (!nameTrim) return toast.error("कृपया कस्टमर का नाम दर्ज करें!");

    const toastId = toast.loading("कस्टमर सेव हो रहा है...");
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
      toast.success("नया कस्टमर सेव हो गया! ✅");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("कस्टमर सेव करने में विफल।");
    }
  };

  const searchDbCustomers = async (text: string) => {
    const cleanText = text.trim();
    setIsSearchingCustomer(true);
    try {
      let q = cleanText ? (/^\d+$/.test(cleanText) ? query(collection(db, "customer_points"), where("phone", "==", cleanText)) : query(collection(db, "customer_points"), where("name", ">=", cleanText), limit(15))) : query(collection(db, "customer_points"), orderBy("lastActive", "desc"), limit(12));
      const snap = await getDocs(q);
      setSearchedCustomers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (e) {} finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleSelectCustomer = (cust: any) => {
    triggerBeep('tap');
    setCustomerPhone(cust.phone); 
    setCustomerName(cust.name || ''); 
    setCustomerPoints(cust.points || 0); 
    setAddress(cust.address || '');
    setShowNewCustForm(false);
    setIsRedeemingPoints(false);
    setPointsToRedeem(0);
    setIsCustomerModalOpen(false);
  };

  // --- OPEN VARIATION POPUP MODAL FETCHED FROM FIREBASE ---
  const handleOpenVariationModal = (item: any) => {
    triggerBeep('tap');
    setSelectedProductForVariation(item);
    
    const dbVariations = item.variations || item.sizes || item.options;
    if (Array.isArray(dbVariations) && dbVariations.length > 0) {
      setAvailableVariations(dbVariations);
      setSelectedVariationType(dbVariations[0].name || dbVariations[0]);
      setCustomVariationPrice(Number(dbVariations[0].price) || Number(item.price) || 0);
    } else {
      setAvailableVariations([
        { name: 'Full', price: Number(item.price) || 0 },
        { name: 'Half', price: Math.round((Number(item.price) || 0) * 0.6) },
        { name: 'Plain', price: Number(item.price) || 0 },
        { name: 'Butter', price: (Number(item.price) || 0) + 20 }
      ]);
      setSelectedVariationType('Full');
      setCustomVariationPrice(Number(item.price) || 0);
    }

    setItemNoteInput('');
    setIsVariationModalOpen(true);
  };

  const handleAddVariationItemToCart = () => {
    if (!selectedProductForVariation) return;
    triggerBeep('tap');

    const baseName = selectedProductForVariation.name;
    const variationSuffix = selectedVariationType ? `(${selectedVariationType})` : '';
    const fullName = `${baseName} ${variationSuffix}`.trim();
    const finalPrice = Number(customVariationPrice) || 0;

    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.id === selectedProductForVariation.id && c.variation === selectedVariationType && c.note === itemNoteInput);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, { 
        id: selectedProductForVariation.id, 
        name: fullName, 
        price: finalPrice, 
        quantity: 1, 
        variation: selectedVariationType,
        note: itemNoteInput.trim() 
      }];
    });

    setIsVariationModalOpen(false);
    setSelectedProductForVariation(null);
    toast.success(`Added ${fullName} to cart!`);
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

  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const getDeliveryCharge = () => (fulfillmentType === "pickup" || fulfillmentType === "table" || getCartSubtotal() === 0) ? 0 : (getCartSubtotal() >= selectedArea.minFree ? 0 : selectedArea.fee);
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

  const handleLoadTableOrderForEditing = (order: any) => {
    triggerBeep('tap');
    setActiveEditingOrderId(order.id);
    setActiveEditingBillNumber(order.billNumber);
    setTableNumber(order.tableNumber || 'Table 1');
    setFulfillmentType('table');
    setCustomerName(order.customerName || '');
    setCustomerPhone(order.customerPhone ? order.customerPhone.replace('+91', '') : '');
    setCart(order.items || []);
    setDiscountValue(order.discountValue || order.discount || 0);
    setDiscountType(order.discountType || 'amount');
    setIsRedeemingPoints(false);
    setPointsToRedeem(0);
    toast.success(`Loaded ${order.tableNumber} (Bill #${order.billNumber}) for adding items.`);
    setActiveTab('billing');
  };

  const handleCancelTableEditing = () => {
    triggerBeep('tap');
    setActiveEditingOrderId(null);
    setActiveEditingBillNumber(null);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setIsRedeemingPoints(false);
    setPointsToRedeem(0);
    setDiscountValue(0);
    toast("Table closed from billing.", { icon: 'ℹ️' });
  };

  const handleConnectPrinter = async () => {
    triggerBeep('tap');
    setIsConnecting(true);
    const toastId = toast.loading("Connecting to 80mm USB Thermal Printer...");
    try {
      if ('usb' in navigator) {
        const device = await (navigator as any).usb.requestDevice({ filters: [] });
        await device.open();
        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);
        setUsbDevice(device);
        setPrinterConnected(true);
        toast.dismiss(toastId);
        toast.success("USB Thermal Printer Connected!");
      } else {
        setTimeout(() => {
          toast.dismiss(toastId);
          setPrinterConnected(true);
          toast.success("Printer Simulated/Connected!");
        }, 1000);
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Printer connection failed.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePrintReceiptDirect = async (orderObj: any, isKot = false) => {
    if (!orderObj || !orderObj.items || orderObj.items.length === 0) return;

    try {
      if (usbDevice) {
        const encoder = new TextEncoder();
        let commands: number[] = [];
        commands.push(0x1B, 0x40); // Init
        commands.push(0x1B, 0x61, 0x01); // Center

        const addText = (txt: string) => {
          const encoded = encoder.encode(txt);
          for (let i = 0; i < encoded.length; i++) commands.push(encoded[i]);
        };

        if (isKot) {
          commands.push(0x1D, 0x21, 0x11); 
          addText("*** KITCHEN KOT ***\n");
          commands.push(0x1D, 0x21, 0x00);
          addText(`Token: #${orderObj.tokenNumber} | Type: ${orderObj.fulfillmentType.toUpperCase()}\n`);
          if (orderObj.tableNumber) addText(`Table: ${orderObj.tableNumber}\n`);
          addText("------------------------------------------------\n");
          commands.push(0x1B, 0x61, 0x00);
          orderObj.items.forEach((item: any) => {
            addText(`[ ] ${item.name} x ${item.quantity}\n`);
            if (item.note) addText(`    Note: ${item.note}\n`);
          });
          addText("------------------------------------------------\n");
        } else {
          addText("[ QR CODE ]\n\n");

          commands.push(0x1D, 0x21, 0x11); 
          addText("BUM BUM CAFE & RESTAURANT\n");
          commands.push(0x1D, 0x21, 0x00);
          addText("न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने,\n");
          addText("जिला पन्ना, मोहंद्रा, मध्य प्रदेश, 488442\n");
          addText("9714293759\n\n");

          commands.push(0x1B, 0x61, 0x00);
          addText(`Employee: ${currentUser?.name || 'Owner'}\n`);
          addText(`POS: Pos 03\n\n`);
          addText(`Customer: ${orderObj.customerName || 'Walk-in'}\n`);
          if (orderObj.customerPhone) addText(`${orderObj.customerPhone}\n`);
          addText("------------------------------------------------\n");
          
          let fulfillmentLabel = "Dine in";
          if (orderObj.fulfillmentType === 'delivery') fulfillmentLabel = `Delivery (${orderObj.deliveryArea || ''})`;
          if (orderObj.fulfillmentType === 'pickup') fulfillmentLabel = "Takeaway / Pickup";
          if (orderObj.tableNumber) fulfillmentLabel = `Dine in (${orderObj.tableNumber})`;
          
          addText(`${fulfillmentLabel}\n\n`);

          orderObj.items.forEach((item: any) => {
            const itemName = item.name || '';
            const qtyPriceLine = `${item.quantity} x ₹${item.price}`;
            const itemTotal = `₹${(item.price || 0) * (item.quantity || 1)}`;
            
            addText(`${itemName}\n`);
            if (item.note) addText(`  * Note: ${item.note}\n`);
            const spaces = ' '.repeat(Math.max(2, 40 - qtyPriceLine.length - itemTotal.length));
            addText(`${qtyPriceLine}${spaces}${itemTotal}\n\n`);
          });

          addText("------------------------------------------------\n");
          if (orderObj.discountAmount > 0) {
            const discLabel = orderObj.discountType === 'percentage' ? `Discount (${orderObj.discountValue}%)` : `Discount`;
            addText(`${discLabel}${' '.repeat(Math.max(2, 40 - discLabel.length - String(orderObj.discountAmount).length))} -₹${orderObj.discountAmount}\n`);
          }
          if (orderObj.pointsRedeemed > 0) {
            addText(`Points redeemed${' '.repeat(25)}-${orderObj.pointsRedeemed}\n`);
          }
          const earnedPts = Math.floor((orderObj.total || 0) / 100);
          addText(`Points earned${' '.repeat(28)}${earnedPts}\n`);
          addText(`Points balance${' '.repeat(26)}${orderObj.remainingPoints || 0}\n`);
          addText("------------------------------------------------\n");

          commands.push(0x1D, 0x21, 0x01); 
          addText(`Total${' '.repeat(16)}₹${orderObj.total}\n`);
          commands.push(0x1D, 0x21, 0x00);
          
          addText(`Cash${' '.repeat(25)}₹${orderObj.total}\n`);
          addText("------------------------------------------------\n");
          
          commands.push(0x1B, 0x61, 0x01); 
          addText("Follow us\n");
          addText("www.youtube.com/@bbcafe.i\n");
          addText("All Social Media @bbcafe.in\n");
          addText("🖤 Thank you, visit again 🖤\n");
          
          let dateFormatted = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          addText(`${dateFormatted}${' '.repeat(10)}#6-${String(orderObj.billNumber).padStart(4, '0')}\n`);
        }

        commands.push(0x1B, 0x64, 0x02); 
        commands.push(0x1D, 0x56, 0x41, 0x00); 

        let endpointOut = 1;
        const endpoints = usbDevice.configuration.interfaces[0].alternate.endpoints;
        for (const ep of endpoints) {
          if (ep.direction === 'out') { endpointOut = ep.endpointNumber; break; }
        }
        await usbDevice.transferOut(endpointOut, new Uint8Array(commands));
        return;
      }
    } catch (e) {
      console.error("USB Print Error, using browser fallback", e);
    }

    const printWindow = window.open('', '_blank', 'width=350,height=550');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${isKot ? 'KOT' : 'Receipt'} #${orderObj.billNumber}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { font-family: 'Courier New', monospace; font-size: 12px; width: 72mm; margin: 0 auto; padding: 2px; color: #000; background: #fff; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .line { border-bottom: 1px dashed #000; margin: 4px 0; }
              .flex { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            ${isKot ? `
              <div class="center bold" style="font-size: 14px;">*** KITCHEN KOT ***</div>
              <div class="center">Token: #${orderObj.tokenNumber} | Type: ${orderObj.fulfillmentType.toUpperCase()}</div>
              ${orderObj.tableNumber ? `<div class="center bold">Table: ${orderObj.tableNumber}</div>` : ''}
              <div class="line"></div>
              ${orderObj.items.map((i: any) => `<div>[ ] ${i.name} x ${i.quantity}${i.note ? ` (${i.note})` : ''}</div>`).join('')}
              <div class="line"></div>
            ` : `
              <div class="center">
                <svg width="100" height="100" viewBox="0 0 25 25" style="margin: 0 auto; display: block;">
                  <path d="M0 0h7v7H0zM2 2h3v3H2zM9 0h2v2H9zM14 0h3v3h-3zM19 0h6v6h-6zM21 2h2v2h-2zM0 9h2v2H0zM5 9h3v3H5zM10 9h4v2h-4zM16 9h2v2H2zM21 9h4v2h-4zM0 14h3v3H0zM6 14h2v2H6zM11 14h2v2h-2zM15 14h4v2h-4zM22 14h3v3h-3zM0 19h7v7H0zM2 21h3v3H2zM9 19h2v2H9zM14 19h3v3h-3zM19 19h6v6h-6zM21 21h2v2h-2z" fill="#000"/>
                </svg>
              </div>
              <br/>
              <div class="center bold" style="font-size: 15px;">BUM BUM CAFE & RESTAURANT</div>
              <div class="center">न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने,</div>
              <div class="center">जिला पन्ना, मोहंद्रा, मध्य प्रदेश, 488442</div>
              <div class="center">9714293759</div>
              <br/>
              <div>Employee: ${currentUser?.name || 'Owner'}</div>
              <div>POS: Pos 03</div>
              <br/>
              <div>Customer: ${orderObj.customerName || 'Walk-in'}</div>
              <div>${orderObj.customerPhone || ''}</div>
              <div class="line"></div>
              <div class="bold">${orderObj.tableNumber ? `Dine in (${orderObj.tableNumber})` : 'Dine in'}</div>
              <br/>
              ${orderObj.items.map((i: any) => `
                <div>${i.name}</div>
                ${i.note ? `<div style="font-size:10px; font-style:italic;">  * Note: ${i.note}</div>` : ''}
                <div class="flex"><span>${i.quantity} x ₹${i.price}</span><span>₹${i.price * i.quantity}</span></div>
                <br/>
              `).join('')}
              <div class="line"></div>
              ${orderObj.discountAmount > 0 ? `<div class="flex"><span>${orderObj.discountType === 'percentage' ? `Discount (${orderObj.discountValue}%)` : 'Discount'}</span><span>-₹${orderObj.discountAmount}</span></div>` : ''}
              ${orderObj.pointsRedeemed ? `<div class="flex"><span>Points redeemed</span><span>-${orderObj.pointsRedeemed}</span></div>` : ''}
              <div class="flex"><span>Points earned</span><span>${Math.floor(orderObj.total / 100)}</span></div>
              <div class="flex"><span>Points balance</span><span>${orderObj.remainingPoints || 0}</span></div>
              <div class="line"></div>
              <div class="flex bold" style="font-size: 15px;"><span>Total</span><span>₹${orderObj.total}</span></div>
              <div class="flex"><span>Cash</span><span>₹${orderObj.total}</span></div>
              <div class="line"></div>
              <div class="center">Follow us</div>
              <div class="center">www.youtube.com/@bbcafe.i</div>
              <div class="center">All Social Media @bbcafe.in</div>
              <div class="center bold">🖤 Thank you, visit again 🖤</div>
              <br/>
              <div class="flex"><span style="font-size: 10px;">${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span style="font-size: 10px;">#6-${String(orderObj.billNumber).padStart(4, '0')}</span></div>
            `}
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSaveTableOrderKotOnly = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const finalTotal = getTotalBillPrice();
    const discountAmt = getCalculatedDiscountAmount();
    const token = Math.floor(1000 + Math.random() * 9000);

    try {
      let billNumber: number;

      if (activeEditingOrderId) {
        billNumber = activeEditingBillNumber || 5001;
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
          customerPhone: customerPhone ? `+91${customerPhone}` : "",
          lastUpdated: new Date()
        };

        await updateDoc(orderRef, updatedOrderObj);
        triggerBeep('success');
        toast.success(`Table ${tableNumber} updated! KOT printed.`);

        await handlePrintReceiptDirect({ ...updatedOrderObj, billNumber, tokenNumber: token, fulfillmentType: 'table' }, true);

        setActiveEditingOrderId(null);
        setActiveEditingBillNumber(null);
      } else {
        if (navigator.onLine) {
          try {
            billNumber = await runTransaction(db, async (txn) => {
              const snap = await txn.get(doc(db, "settings", "store_bill_counter"));
              const next = snap.exists() ? (snap.data().nextBillNumber || 1) : 1;
              txn.set(doc(db, "settings", "store_bill_counter"), { nextBillNumber: next + 1 });
              return next;
            });
          } catch {
            billNumber = Number(localStorage.getItem("bb_pos_local_bill_counter_pc") || 5000) + 1;
            localStorage.setItem("bb_pos_local_bill_counter_pc", String(billNumber));
          }
        } else {
          billNumber = Number(localStorage.getItem("bb_pos_local_bill_counter_pc") || 5000) + 1;
          localStorage.setItem("bb_pos_local_bill_counter_pc", String(billNumber));
        }

        const orderObj = { 
          billNumber, tokenNumber: token, customerName: customerName || "Walk-in Guest", 
          customerPhone: customerPhone ? `+91${customerPhone}` : "", items: cart, 
          subtotal, discountType, discountValue, discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, gstAmount: getGstAmountCalculated(), 
          deliveryFee: 0, total: finalTotal, timestamp: new Date(), 
          status: 'pending', fulfillmentType: 'table', deliveryArea: "", 
          tableNumber: tableNumber, paymentMethod, chefInstructions, source: 'PC_POS', address: '' 
        };

        await addDoc(collection(db, "orders"), orderObj);
        triggerBeep('success');
        toast.success(`Table ${tableNumber} saved! KOT sent to kitchen.`);

        await handlePrintReceiptDirect(orderObj, true);
      }

      setCart([]); setCustomerPhone(''); setCustomerName(''); setDiscountValue(0);
      setIsRedeemingPoints(false); setPointsToRedeem(0);
      localStorage.removeItem("bb_pos_saved_cart_pc");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save table order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleFinalCheckoutAndPrintBill = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const finalTotal = getTotalBillPrice();
    const discountAmt = getCalculatedDiscountAmount();
    const token = Math.floor(1000 + Math.random() * 9000);
    const earned = Math.floor(finalTotal / 100);
    const redeemed = isRedeemingPoints ? pointsToRedeem : 0;

    try {
      let billNumber: number;

      let remainingPts = customerPoints;
      if (customerPhone && customerPhone.length === 10) {
        const userRef = doc(db, "customer_points", customerPhone.trim());
        const userDoc = await getDoc(userRef);
        const prevPoints = userDoc.exists() ? (userDoc.data().points || 0) : 0;
        
        remainingPts = Math.max(0, prevPoints - redeemed) + earned;
        await setDoc(userRef, { 
          name: customerName || "Walk-in Guest", 
          phone: customerPhone.trim(), 
          points: remainingPts, 
          lastActive: new Date() 
        }, { merge: true });
      }

      if (activeEditingOrderId) {
        billNumber = activeEditingBillNumber || 5001;
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
          customerPhone: customerPhone ? `+91${customerPhone}` : "",
          pointsRedeemed: redeemed,
          remainingPoints: remainingPts,
          settledAt: new Date()
        };

        await updateDoc(orderRef, finalOrderObj);
        triggerBeep('success');
        toast.success(`Table ${tableNumber} Settled! Bill #${billNumber} printed.`);

        await handlePrintReceiptDirect({ ...finalOrderObj, billNumber, tokenNumber: token, fulfillmentType: 'table' }, false);

        setActiveEditingOrderId(null);
        setActiveEditingBillNumber(null);
      } else {
        if (navigator.onLine) {
          try {
            billNumber = await runTransaction(db, async (txn) => {
              const snap = await txn.get(doc(db, "settings", "store_bill_counter"));
              const next = snap.exists() ? (snap.data().nextBillNumber || 1) : 1;
              txn.set(doc(db, "settings", "store_bill_counter"), { nextBillNumber: next + 1 });
              return next;
            });
          } catch {
            billNumber = Number(localStorage.getItem("bb_pos_local_bill_counter_pc") || 5000) + 1;
            localStorage.setItem("bb_pos_local_bill_counter_pc", String(billNumber));
          }
        } else {
          billNumber = Number(localStorage.getItem("bb_pos_local_bill_counter_pc") || 5000) + 1;
          localStorage.setItem("bb_pos_local_bill_counter_pc", String(billNumber));
        }

        const orderObj = { 
          billNumber, tokenNumber: token, customerName: customerName || "Walk-in Guest", 
          customerPhone: customerPhone ? `+91${customerPhone}` : "", items: cart, 
          subtotal, discountType, discountValue, discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, gstAmount: getGstAmountCalculated(), 
          deliveryFee: getDeliveryCharge(), total: finalTotal, timestamp: new Date(), 
          status: 'completed', fulfillmentType, deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "", 
          tableNumber: fulfillmentType === 'table' ? tableNumber : '', paymentMethod, chefInstructions, source: 'PC_POS', address,
          pointsRedeemed: redeemed, remainingPoints: remainingPts 
        };

        await addDoc(collection(db, "orders"), orderObj);

        triggerBeep('success'); 
        toast.success(`Final Bill #${billNumber} printed successfully!`);
        
        if (kotEnabled && fulfillmentType === 'table') {
          await handlePrintReceiptDirect(orderObj, true);
          await new Promise((r) => setTimeout(r, 600));
        }
        await handlePrintReceiptDirect(orderObj, false);
      }

      setCart([]); setCustomerPhone(''); setCustomerName(''); setCustomerPoints(0); setDiscountValue(0); setShowNewCustForm(false);
      setIsRedeemingPoints(false); setPointsToRedeem(0);
      localStorage.removeItem("bb_pos_saved_cart_pc");
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete checkout");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      toast.success(`Status updated to ${newStatus}!`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "products", productId), { isAvailable: !currentStatus });
      setProducts(prev => prev.map((p) => p.id === productId ? { ...p, isAvailable: !currentStatus } : p));
      toast.success("Stock status updated!");
    } catch (err) {
      toast.error("Failed");
    }
  };

  const handleToggleTheme = (mode: 'dark' | 'light') => {
    triggerBeep('tap'); setThemeMode(mode); localStorage.setItem("bb_pos_theme_pc", mode);
    if (mode === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  };

  const filteredMenu = useMemo(() => products.filter((p) => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase())), [products, selectedCategory, searchQuery]);
  const filteredPastReceipts = useMemo(() => pastReceipts.filter((o) => String(o.billNumber).includes(receiptSearchQuery.trim()) || String(o.customerPhone || '').includes(receiptSearchQuery.trim()) || String(o.customerName || '').toLowerCase().includes(receiptSearchQuery.trim().toLowerCase())), [pastReceipts, receiptSearchQuery]);

  const mainClass = "h-screen w-screen flex font-sans antialiased overflow-hidden " + (themeMode === "dark" ? "dark bg-[#0a0a0a] text-neutral-100" : "bg-neutral-100 text-neutral-900");

  return (
    <div className={mainClass}>
      <Toaster position="top-right" />

      {!isLoggedIn ? (
        <div className="fixed inset-0 bg-neutral-950 text-white flex flex-col items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-10 shadow-2xl space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><SafeLock size={36} /></div>
              <h1 className="text-2xl font-black uppercase text-yellow-500">BUM BUM CAFE - PC POS</h1>
              <p className="text-xs text-neutral-400">Desktop Terminal Locked • Enter Staff PIN</p>
            </div>
            <form onSubmit={handlePinLoginSubmit} className="space-y-4">
              <input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter 4-digit PIN" className="w-full bg-neutral-950 border border-neutral-800 text-center text-3xl font-mono py-4 rounded-2xl outline-none text-orange-400 tracking-widest" autoFocus />
              <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-sm uppercase rounded-2xl tracking-wider transition-all">Unlock Terminal</button>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between p-4 shrink-0 select-none h-full transition-all duration-300 relative`}>
            
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="absolute -right-3 top-7 bg-orange-600 text-white p-1 rounded-full shadow-md hover:bg-orange-500 transition-all z-20"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isSidebarCollapsed ? <SafeChevronRight size={14} /> : <SafeChevronLeft size={14} />}
            </button>

            <div className="space-y-6 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <SafeDatabase className="text-orange-500 shrink-0" size={22} />
                {!isSidebarCollapsed && (
                  <div className="truncate">
                    <h1 className="text-xs font-black uppercase text-yellow-500 truncate">Bum Bum Cafe</h1>
                    <span className="text-[10px] text-neutral-400 font-bold">POS v2.1</span>
                  </div>
                )}
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'billing', label: 'Counter Billing', icon: ShoppingBag },
                  { id: 'tables', label: `Tables (${activeTableOrders.length})`, icon: LayoutGrid },
                  { id: 'orders', label: `Live Orders (${activeLiveOrders.length})`, icon: Clock },
                  { id: 'inventory', label: 'Stock Toggle', icon: Layers },
                  { id: 'receipts', label: 'Past Receipts', icon: Printer },
                  { id: 'settings', label: 'Settings & Printer', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => { triggerBeep('tap'); setActiveTab(item.id as any); }} 
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${isActive ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                      title={item.label}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon size={16} className="shrink-0" />
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!isSidebarCollapsed && item.id === 'tables' && activeTablesCount > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">{activeTablesCount}</span>
                      )}
                      {!isSidebarCollapsed && item.id === 'orders' && pendingOrdersCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingOrdersCount}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button onClick={handleInstallClick} className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-xs font-black uppercase text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all" title="Install App">
                <SafeDownload size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Install App</span>}
              </button>
              <button onClick={handleManualSync} disabled={isSyncing} className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-xs font-black uppercase text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all" title="Sync Products">
                {isSyncing ? <Loader2 className="animate-spin shrink-0" size={16} /> : <SafeRefreshCw size={16} className="shrink-0" />}
                {!isSidebarCollapsed && <span className="truncate">Sync Products</span>}
              </button>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-xs font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all" title="Lock Terminal">
                <SafeLogOut size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Lock Terminal</span>}
              </button>
            </div>
          </aside>

          <main className="flex-1 flex h-full overflow-hidden">
            
            {activeTab === 'billing' && (
              <div className="flex-1 flex h-full overflow-hidden">
                <div className="flex-1 flex flex-col p-5 h-full overflow-hidden">
                  
                  {activeEditingOrderId && (
                    <div className="mb-3 bg-amber-500/15 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase">
                        <SafeEdit3 size={16} />
                        <span>Active Table: {tableNumber} (Bill #{activeEditingBillNumber}) - Add items & Print KOT</span>
                      </div>
                      <button onClick={handleCancelTableEditing} className="text-neutral-400 hover:text-white text-xs underline">Cancel</button>
                    </div>
                  )}

                  <div className="flex gap-3 mb-4 items-center shrink-0">
                    <div className="relative flex-1">
                      <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search items by name..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:border-orange-500 shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button 
                          key={cat} 
                          onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} 
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border shrink-0 transition-all ${isSelected ? "bg-orange-500 text-black border-orange-500 shadow-md shadow-orange-500/20" : "bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-orange-500"}`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                  ) : (
                    <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1 pr-2 content-start">
                      {filteredMenu.map((item) => {
                        const isAvail = item.isAvailable !== false;
                        const imgUrl = item.image || item.imageUrl || item.img;
                        return (
                          <button 
                            key={item.id} 
                            disabled={!isAvail} 
                            onClick={() => handleOpenVariationModal(item)} 
                            className={`border rounded-2xl text-left flex flex-col overflow-hidden h-44 transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm ${isAvail ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-orange-500/50" : "opacity-40 bg-neutral-200 dark:bg-neutral-950 border-neutral-800 pointer-events-none"}`}
                          >
                            <div className="w-full h-24 bg-neutral-200 dark:bg-neutral-800 relative shrink-0 overflow-hidden flex items-center justify-center">
                              {imgUrl ? (
                                <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-neutral-400 text-xs font-black uppercase tracking-wider px-2 text-center">{item.category || "Cafe Item"}</span>
                              )}
                            </div>
                            <div className="p-3 flex-grow flex flex-col justify-between w-full">
                              <p className="font-bold text-xs line-clamp-2 leading-tight">{item.name}</p>
                              <p className="text-xs font-mono font-black text-orange-500">₹{item.price}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="w-96 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col p-5 h-full shadow-2xl justify-between overflow-hidden">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-3 shrink-0">
                      <h3 className="text-sm font-black uppercase text-orange-500">Current Order Cart</h3>
                      <button onClick={() => setCart([])} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"><SafeTrash2 size={14} /> Clear</button>
                    </div>

                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-3 shrink-0">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          maxLength={10} 
                          placeholder="10-digit Phone" 
                          value={customerPhone} 
                          onChange={e => setCustomerPhone(e.target.value)} 
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none font-mono" 
                        />
                        <button onClick={handleCheckLoyalty} className="bg-orange-600 hover:bg-orange-500 text-white px-3 rounded-xl text-xs font-black uppercase">Find</button>
                        <button onClick={() => setIsCustomerModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-700 px-3 rounded-xl text-xs font-bold">List</button>
                      </div>

                      {customerName && !showNewCustForm && (
                        <div className="flex justify-between items-center text-xs font-bold text-yellow-500 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                          <span>👤 {customerName}</span>
                          <span>⭐ Pts: {customerPoints}</span>
                        </div>
                      )}

                      {customerName && customerPoints > 0 && !showNewCustForm && (
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs">
                            <SafeGift size={14} className="text-amber-500" />
                            <span>Redeem Points:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min={0} 
                              max={customerPoints}
                              value={pointsToRedeem}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setPointsToRedeem(Math.min(val, customerPoints));
                              }}
                              className="w-16 bg-white dark:bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-center font-mono"
                            />
                            <button 
                              onClick={() => {
                                if (!isRedeemingPoints && pointsToRedeem > 0) {
                                  setIsRedeemingPoints(true);
                                  toast.success(`Redeemed ${pointsToRedeem} points!`);
                                } else {
                                  setIsRedeemingPoints(false);
                                  setPointsToRedeem(0);
                                  toast("Points redemption cancelled", { icon: 'ℹ️' });
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${isRedeemingPoints ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}
                            >
                              {isRedeemingPoints ? 'Cancel' : 'Apply'}
                            </button>
                          </div>
                        </div>
                      )}

                      {showNewCustForm && (
                        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                          <p className="text-[10px] text-red-400 font-bold uppercase">Number not registered! Add details:</p>
                          <input 
                            type="text" 
                            placeholder="Customer Name *" 
                            value={newCustNameInput} 
                            onChange={e => setNewCustNameInput(e.target.value)} 
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs outline-none" 
                          />
                          <button 
                            onClick={handleSaveNewCustomerQuick} 
                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1 shadow"
                          >
                            <SafeUserPlus size={14} /> Save Customer & Link
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 overflow-y-auto flex-1 pr-1 mb-3">
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400 text-xs text-center">
                          <ShoppingBag size={32} className="mb-2 opacity-40" />
                          <p>Cart is empty. Click items from menu to add.</p>
                        </div>
                      ) : (
                        cart.map((item, idx) => (
                          <div key={idx} className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-2xl flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate">{item.name}</p>
                              {item.note && <p className="text-[10px] text-neutral-400 italic truncate">Note: {item.note}</p>}
                              <p className="text-[11px] font-mono text-orange-500 font-bold">₹{item.price * item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-7 h-7 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">-</button>
                              <span className="w-6 text-center text-xs font-mono font-bold">{item.quantity}</span>
                              <button onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-7 h-7 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">+</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-3 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-neutral-400">Discount Option</span>
                        <div className="flex bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-lg">
                          <button onClick={() => setDiscountType('amount')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${discountType === 'amount' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}>₹ Amt</button>
                          <button onClick={() => setDiscountType('percentage')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${discountType === 'percentage' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}>% Off</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min={0} 
                          max={discountType === 'percentage' ? 100 : 100000}
                          placeholder={discountType === 'amount' ? "Enter Amount (₹)" : "Enter Percentage (%)"}
                          value={discountValue || ''}
                          onChange={e => setDiscountValue(Number(e.target.value))}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs outline-none font-mono"
                        />
                        {discountValue > 0 && (
                          <button onClick={() => setDiscountValue(0)} className="text-red-400 text-xs font-bold px-2">Clear</button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-4 shrink-0 border-t border-neutral-200 dark:border-neutral-800 pt-3">
                      <div className="grid grid-cols-3 gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
                        {(['table', 'pickup', 'delivery'] as const).map((type) => (
                          <button key={type} onClick={() => { triggerBeep('tap'); setFulfillmentType(type); }} className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all ${fulfillmentType === type ? "bg-orange-600 text-white shadow-md" : "text-neutral-400"}`}>{type}</button>
                        ))}
                      </div>

                      {fulfillmentType === 'table' && (
                        <input type="text" placeholder="Table Number (e.g., Table 4)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none" />
                      )}

                      {fulfillmentType === 'delivery' && (
                        <div className="space-y-2">
                          <select value={selectedArea.name} onChange={e => { const ar = DELIVERY_AREAS.find(a => a.name === e.target.value); if (ar) setSelectedArea(ar); }} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2 text-xs outline-none">
                            {DELIVERY_AREAS.map(a => <option key={a.name} value={a.name}>{a.name} (Fee: ₹{a.fee})</option>)}
                          </select>
                          <input type="text" placeholder="Delivery Address" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs border-t border-neutral-200 dark:border-neutral-800 pt-3 shrink-0">
                      <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span className="font-mono">₹{getCartSubtotal()}</span></div>
                      {getCalculatedDiscountAmount() > 0 && (
                        <div className="flex justify-between text-orange-400 font-bold">
                          <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : 'Flat'})</span>
                          <span className="font-mono">-₹{getCalculatedDiscountAmount()}</span>
                        </div>
                      )}
                      {isRedeemingPoints && <div className="flex justify-between text-amber-400 font-bold"><span>Points Discount</span><span className="font-mono">-₹{getRedemptionDiscount()}</span></div>}
                      {fulfillmentType === 'delivery' && <div className="flex justify-between text-neutral-400"><span>Delivery Charge</span><span className="font-mono">₹{getDeliveryCharge()}</span></div>}
                      <div className="flex justify-between text-base font-black text-green-500 pt-1 border-t border-dashed border-neutral-700">
                        <span>Grand Total</span><span className="font-mono">₹{getTotalBillPrice()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 my-2 shrink-0">
                      <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>Cash</button>
                      <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>UPI</button>
                    </div>

                    {fulfillmentType === 'table' ? (
                      <div className="space-y-2 shrink-0">
                        <button onClick={handleSaveTableOrderKotOnly} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
                          {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <SafePrinter size={16} />}
                          <span>Save Table & Print KOT Only</span>
                        </button>
                        <button onClick={handleFinalCheckoutAndPrintBill} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                          {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <SafeFileText size={16} />}
                          <span>Settle & Print Final Bill (₹{getTotalBillPrice()})</span>
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleFinalCheckoutAndPrintBill} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 shrink-0">
                        {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        <span>One-Click Print & Pay (₹{getTotalBillPrice()})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TABLES MANAGER */}
            {activeTab === 'tables' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-black uppercase text-amber-500">Active Tables Manager ({activeTableOrders.length})</h2>
                  <span className="text-xs text-neutral-400">Manage running tables, add items, or settle & clear bills</span>
                </div>
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeTableOrders.length === 0 ? (
                    <div className="col-span-4 text-center py-24 text-neutral-500 font-bold">No active tables right now. Select 'Table' in billing to start one.</div>
                  ) : (
                    activeTableOrders.map((order) => (
                      <div key={order.id} className="bg-white dark:bg-neutral-900 border border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                        <div>
                          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
                            <span className="font-mono font-black text-amber-400 text-sm">🪑 {order.tableNumber}</span>
                            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase px-2 py-0.5 rounded">Bill #{order.billNumber}</span>
                          </div>
                          <p className="text-xs font-bold mb-2">👤 {order.customerName || 'Walk-in'}</p>
                          <div className="space-y-1.5 py-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 mb-3 max-h-40 overflow-y-auto">
                            {order.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="truncate pr-2">{it.name}</span>
                                <span className="font-bold text-orange-500 shrink-0">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                          <div className="flex justify-between text-xs font-black text-green-500">
                            <span>Total Amount:</span>
                            <span className="font-mono text-sm">₹{order.total}</span>
                          </div>
                          <button 
                            onClick={() => handleLoadTableOrderForEditing(order)} 
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1 shadow"
                          >
                            <SafeEdit3 size={14} /> Add Items & Print KOT
                          </button>
                          <button 
                            onClick={() => {
                              handleLoadTableOrderForEditing(order);
                              toast("Review items and click 'Settle & Print Final Bill'", { icon: 'ℹ️' });
                            }} 
                            className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1 shadow"
                          >
                            <SafeFileText size={14} /> Settle & Clear Table
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: LIVE ORDERS */}
            {activeTab === 'orders' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-black uppercase text-orange-500">Live Delivery & Pickup Orders ({activeLiveOrders.length})</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {activeLiveOrders.length === 0 ? (
                    <div className="col-span-3 text-center py-24 text-neutral-500 font-bold">No active delivery or pickup orders right now.</div>
                  ) : (
                    activeLiveOrders.map((order) => (
                      <div key={order.id} className={`bg-white dark:bg-neutral-900 border rounded-2xl p-4 flex flex-col justify-between shadow-lg ${order.status === 'pending' ? 'border-red-500 animate-pulse' : 'border-neutral-200 dark:border-neutral-800'}`}>
                        <div>
                          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
                            <span className="font-mono font-black text-yellow-500">Bill #{order.billNumber}</span>
                            <span className="bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">{order.fulfillmentType}</span>
                          </div>
                          <p className="text-xs font-bold mb-2">👤 {order.customerName} ({order.customerPhone || 'Walk-in'})</p>
                          <div className="space-y-1 py-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 mb-3 max-h-36 overflow-y-auto">
                            {order.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>{it.name}</span><span className="font-bold text-orange-500">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-black text-green-500 mb-3 pt-2 border-t">
                            <span>Total: ₹{order.total}</span>
                          </div>
                          <div className="flex gap-2">
                            {order.status === 'pending' && (
                              <button onClick={() => handleUpdateStatus(order.id, 'preparing')} className="flex-1 bg-green-600 text-white font-black py-2 rounded-xl text-xs uppercase">Accept</button>
                            )}
                            <button onClick={() => handlePrintReceiptDirect(order, false)} className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 hover:text-orange-500 rounded-xl"><SafePrinter size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: INVENTORY */}
            {activeTab === 'inventory' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <h2 className="text-sm font-black uppercase text-orange-500 mb-4">Stock Availability Management</h2>
                <div className="grid grid-cols-3 gap-3">
                  {products.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    return (
                      <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-bold text-xs">{item.name}</p>
                          <p className="text-xs font-mono text-orange-500">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${isAvail ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{isAvail ? 'In Stock' : 'Out'}</span>
                          <button onClick={() => handleToggleStock(item.id, isAvail)} className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase border ${isAvail ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'}`}>{isAvail ? 'Disable' : 'Enable'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: PAST RECEIPTS */}
            {activeTab === 'receipts' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden">
                <div className="mb-4 shrink-0">
                  <input type="text" placeholder="Search past receipts by Bill No / Phone..." value={receiptSearchQuery} onChange={e => setReceiptSearchQuery(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 px-4 text-xs outline-none" />
                </div>
                <div className="space-y-2 overflow-y-auto flex-1">
                  {filteredPastReceipts.map((order) => (
                    <div key={order.id} onClick={() => { setSelectedReceipt(order); setIsReceiptModalOpen(true); }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:border-orange-500">
                      <div>
                        <span className="font-mono font-bold text-xs block">Bill #${order.billNumber} • {order.customerName} ({order.customerPhone || 'Walk-in'})</span>
                        <span className="text-[10px] text-neutral-400 font-mono">{new Date(order.timestamp?.toDate ? order.timestamp.toDate() : order.timestamp).toLocaleString()}</span>
                      </div>
                      <span className={`font-mono font-black text-sm ${order.status === 'refunded' ? 'line-through text-neutral-500' : 'text-green-500'}`}>₹{order.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="flex-1 p-6 h-full overflow-y-auto flex justify-center">
                <div className="max-w-xl w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-xl space-y-6">
                  <h3 className="text-sm font-black uppercase text-orange-500">Desktop Hardware & POS Settings</h3>
                  
                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">Install App on Desktop:</p>
                    <button onClick={handleInstallClick} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                      <SafeDownload size={16} /> Install POS as PC Application
                    </button>
                  </div>

                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">UI Theme:</p>
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-48">
                      <button onClick={() => handleToggleTheme('dark')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${themeMode === 'dark' ? 'bg-neutral-950 text-amber-400' : 'text-neutral-400'}`}>Dark</button>
                      <button onClick={() => handleToggleTheme('light')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${themeMode === 'light' ? 'bg-white text-orange-600' : 'text-neutral-400'}`}>Light</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">KOT Printing:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Print Kitchen Order Ticket automatically on checkout:</span>
                      <button onClick={() => { const next = !kotEnabled; setKotEnabled(next); localStorage.setItem("bb_pos_kot_enabled_pc", String(next)); }} className="text-orange-500">
                        {kotEnabled ? <SafeToggleRight size={28} /> : <SafeToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase">80mm USB Thermal Printer Connection (Optimized Height):</p>
                    <button onClick={handleConnectPrinter} disabled={isConnecting} className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded-xl transition-all shadow-md">
                      {isConnecting ? <Loader2 className="animate-spin inline mr-2" size={16} /> : null}
                      {printerConnected ? 'Printer Connected & Ready ✅' : 'Connect 80mm USB Printer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* --- ITEM VARIATION MODAL POPUP --- */}
      <AnimatePresence>
        {isVariationModalOpen && selectedProductForVariation && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 font-sans">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-orange-500">{selectedProductForVariation.name}</h3>
                <button onClick={() => setIsVariationModalOpen(false)}><SafeX size={18} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 block mb-1.5">Select Variation:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableVariations.map((v: any, idx: number) => {
                      const vName = typeof v === 'string' ? v : (v.name || v.size || 'Option');
                      const vPrice = typeof v === 'object' && v.price !== undefined ? Number(v.price) : (vName === 'Half' ? Math.round((Number(selectedProductForVariation.price) || 0) * 0.6) : (vName === 'Butter' ? (Number(selectedProductForVariation.price) || 0) + 20 : Number(selectedProductForVariation.price) || 0));

                      return (
                        <button 
                          key={idx}
                          onClick={() => {
                            triggerBeep('tap');
                            setSelectedVariationType(vName);
                            setCustomVariationPrice(vPrice);
                          }}
                          className={`py-2.5 rounded-xl text-xs font-black uppercase border transition-all ${selectedVariationType === vName ? 'bg-orange-600 text-white border-orange-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}
                        >
                          {vName} (₹{vPrice})
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 block mb-1">Price (₹):</label>
                  <input 
                    type="number" 
                    value={customVariationPrice}
                    onChange={e => setCustomVariationPrice(Number(e.target.value))}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm font-mono font-bold outline-none text-orange-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 block mb-1">Special Note / Customization:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Less spicy, Extra cheese..."
                    value={itemNoteInput}
                    onChange={e => setItemNoteInput(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={handleAddVariationItemToCart} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm">Bill Details (# {selectedReceipt.billNumber})</h3>
                <button onClick={() => setIsReceiptModalOpen(false)}><SafeX size={18} /></button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs font-mono">
                {selectedReceipt.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between"><span>{it.name} x{it.quantity}</span><span>₹{it.price * it.quantity}</span></div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-sm border-t pt-2">
                <span>Total:</span><span className="text-green-500 font-mono">₹{selectedReceipt.total}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handlePrintReceiptDirect(selectedReceipt, false)} className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-xs uppercase">Reprint Bill</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen} setIsCustomerModalOpen={setIsCustomerModalOpen} customerSearchQuery={customerSearchQuery} setCustomerSearchQuery={setCustomerSearchQuery} searchedCustomers={searchedCustomers} isSearchingCustomer={isSearchingCustomer} newCustName="" setNewCustName={() => {}} newCustPhone="" setNewCustPhone={() => {}} newCustAddress="" setNewCustAddress={() => {}} editingCustomer={null} viewingHistoryCustomer={null} customerHistoryList={[]} editCustPoints={0} setEditCustPoints={() => {}} handleSelectCustomer={handleSelectCustomer} handleLoadCustomerHistory={() => {}} handleStartEditProfile={() => {}} handleUpdateCustomerProfile={() => {}} handleSaveNewCustomer={() => {}} setViewingHistoryCustomer={() => {}} setCustomerHistoryList={() => {}} setEditingCustomer={() => {}} searchDbCustomers={searchDbCustomers} triggerBeep={triggerBeep}
      />
    </div>
  );
}
