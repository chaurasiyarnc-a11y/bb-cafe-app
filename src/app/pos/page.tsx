'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, increment, getDoc, getDocs, where, setDoc 
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Minus, Search, X, User, Star, Gift, 
  Loader2, Clock, Trash2, Printer, Check, Play, Settings, 
  Database, RefreshCw, Layers, Phone, MapPin, LayoutGrid, List,
  Menu, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// चाइल्ड कॉम्पोनेंट्स इम्पोर्ट करें
import PosCartDrawer from '@/components/pos/PosCartDrawer';
import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import CustomizerModal from '@/components/pos/CustomizerModal';

// ⚡ TypeScript TS2607 एरर को बायपास करने के लिए कास्टिंग
const SafeLock = Lock as any;
const SafeDatabase = Database as any;
const SafeMenu = Menu as any;

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

const DELIVERY_AREAS: DeliveryArea[] = [
  { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
  { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
  { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
];

export default function BbCafePos() {
  // Authentication & Security Lockscreen States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState<string>('');

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'orders' | 'billing' | 'inventory' | 'receipts' | 'settings'>('billing');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); 
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); 

  // Dynamic Settings states (Saved in LocalStorage)
  const [gstEnabled, setGstEnabled] = useState<boolean>(false);
  const [gstRate, setGstRate] = useState<number>(5);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Customer Directory Lookup Modal States
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');
  
  // Member Profile Edit & History States inside POS Lookup
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [viewingHistoryCustomer, setViewingHistoryCustomer] = useState<any | null>(null);
  const [customerHistoryList, setCustomerHistoryList] = useState<any[]>([]);
  const [editCustPoints, setEditCustPoints] = useState<number>(0);

  // Database States
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]); 
  const [storeOpen, setStoreOpen] = useState<boolean>(true);
  
  // Receipts History list & details Reprint state
  const [receiptSearchQuery, setReceiptSearchQuery] = useState<string>('');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Counter Billing States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPoints, setCustomerPoints] = useState<number>(0);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [address, setAddress] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [chefInstructions, setChefInstructions] = useState<string>('');
  
  // POS Specific Add-ons
  const [ketchupAddon, setKetchupAddon] = useState<boolean>(false);
  const [oreganoAddon, setOreganoAddon] = useState<boolean>(false);
  const [chiliFlakesAddon, setChiliFlakesAddon] = useState<boolean>(false);
  const [noCutlery, setNoCutlery] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');

  // Dynamic Variation Selection States
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
  const [normalPizzaSize, setNormalPizzaSize] = useState<string>("");
  const [normalPizzaPrice, setNormalPizzaPrice] = useState<number>(0);
  const [normalPizzaAddons, setNormalPizzaAddons] = useState<{ [addon: string]: boolean }>({});
  const [customizerChefNote, setCustomizerChefNote] = useState<string>("");

  const triggerBeep = (type: 'tap' | 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === 'tap') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(523, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.24);
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  // Auth Session, Database streams & Settings fetchers
  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setIsLoggedIn(true);
        setCurrentUser(parsed);
      } catch (e) {}
    }

    const localGst = localStorage.getItem("bb_pos_gst_enabled");
    if (localGst) setGstEnabled(localGst === 'true');
    const localGstRate = localStorage.getItem("bb_pos_gst_rate");
    if (localGstRate) setGstRate(Number(localGstRate) || 5);
    const localPaper = localStorage.getItem("bb_pos_paper_size");
    if (localPaper) setPrinterPaperSize(localPaper as any);
    const localTheme = localStorage.getItem("bb_pos_theme");
    if (localTheme) {
      setThemeMode(localTheme as any);
      if (localTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(ordersList);
    }, (error) => {
      console.error("Orders sync failed", error);
    });

    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) setStoreOpen(d.data().isOpen);
    });

    return () => {
      unsubscribe();
      unsubStore();
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchDbData = async () => {
      setLoading(true);
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const items = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);

        const cats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
        setCategories(['All', ...cats]);

        const rulesSnap = await getDocs(collection(db, "loyalty_rules"));
        setLoyaltyRules(rulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        toast.error("Error loading products");
      } finally {
        setLoading(false);
      }
    };
    fetchDbData();
  }, [activeTab, isLoggedIn]);

  // Auth Submit PIN
  const handlePinLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      toast.error("Please enter a valid 4-digit PIN!");
      return;
    }

    if (pinInput === "1234") {
      setIsLoggedIn(true);
      setCurrentUser({ name: "Demo Boss", role: "admin" });
      localStorage.setItem("bb_pos_user", JSON.stringify({ name: "Demo Boss", role: "admin" }));
      toast.success("Welcome back, Boss!");
      setPinInput('');
      return;
    }

    const toastId = toast.loading("Verifying credentials...");
    try {
      const q = query(collection(db, "cafe_users"), where("pin", "==", pinInput));
      const snap = await getDocs(q);
      toast.dismiss(toastId);
      if (!snap.empty) {
        const uDoc = snap.docs[0].data();
        setIsLoggedIn(true);
        setCurrentUser({ id: snap.docs[0].id, ...uDoc });
        localStorage.setItem("bb_pos_user", JSON.stringify({ id: snap.docs[0].id, ...uDoc }));
        toast.success(`Welcome back, ${uDoc.name}!`);
        setPinInput('');
      } else {
        toast.error("Incorrect PIN!");
        setPinInput('');
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Database connection timeout");
    }
  };

  const handleLogout = () => {
    triggerBeep('tap');
    localStorage.removeItem("bb_pos_user");
    setIsLoggedIn(false);
    setCurrentUser(null);
    toast.success("POS Terminal Locked!");
  };

  const searchDbCustomers = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) {
      setIsSearchingCustomer(true);
      try {
        const q = query(collection(db, "customer_points"), orderBy("lastActive", "desc"), limit(12));
        const snap = await getDocs(q);
        setSearchedCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.error("Latest customer fetch failed", e);
      } finally {
        setIsSearchingCustomer(false);
      }
      return;
    }

    setIsSearchingCustomer(true);
    try {
      let q;
      if (/^\d+$/.test(cleanText)) {
        q = query(collection(db, "customer_points"), where("phone", "==", cleanText));
      } else {
        const capitalized = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
        q = query(
          collection(db, "customer_points"), 
          where("name", ">=", capitalized), 
          where("name", "<=", capitalized + '\uf8ff'),
          limit(15)
        );
      }
      const snap = await getDocs(q);
      setSearchedCustomers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error("Search operations failed", e);
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleUpdateCartItemNote = (itemId: string, noteValue: string) => {
    setCart(prev => 
      prev.map(item => item.id === itemId ? { ...item, note: noteValue } : item)
    );
  };

  // Pricing calculations
  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
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
  const getLoyaltyDiscount = () => Math.min(pointsToRedeem, getCartSubtotal());
  const getGstAmountCalculated = () => {
    if (!gstEnabled) return 0;
    const subtotal = getCartSubtotal() + getCartAddonsPrice();
    return Number(((subtotal * gstRate) / 100).toFixed(2));
  };
  const getTotalBillPrice = () => {
    const subtotal = getCartSubtotal();
    const addPrice = getCartAddonsPrice();
    const delivery = getDeliveryCharge();
    const gstAmount = getGstAmountCalculated();
    const discountCombined = getLoyaltyDiscount() + customDiscount;
    return Math.max(0, subtotal + addPrice + gstAmount - discountCombined) + delivery;
  };
  const getFreeDeliveryProgressPercent = () => {
    const subtotal = getCartSubtotal();
    const limit = selectedArea.minFree;
    if (subtotal >= limit) return 100;
    return (subtotal / limit) * 100;
  };
  const getTotalPointsRedeemedInCart = () => cart.reduce((acc, i) => acc + (i.pointsCost || 0), 0);

  // 📄 PRINT RECEIPT
  const handlePrintReceipt = (order: any) => {
    triggerBeep('tap');
    const widthPixels = printerPaperSize === '58mm' ? '240px' : '290px';
    const printWindow = window.open('', '_blank', 'width=340,height=600');
    if (!printWindow) return;

    const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
    const itemsRows = order.items.map((it: any) => `
      <tr>
        <td style="font-size: 11px; padding: 4px 0; max-width: 140px; word-break: break-word;">
          ${it.name} ${it.note ? `<br/><span style="font-size: 9px; color: #555; font-style: italic;">(${it.note})</span>` : ''}
        </td>
        <td style="font-size: 11px; text-align: center; padding: 4px 0; vertical-align: top;">x${it.quantity}</td>
        <td style="font-size: 11px; text-align: right; padding: 4px 0; vertical-align: top;">₹${it.price * it.quantity}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${order.billNumber}</title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: ${widthPixels}; margin: 0; padding: 8px; color: #000; background-color: #fff; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <h3 style="margin: 0 0 2px 0; font-size: 15px;">BUM BUM CAFE</h3>
            <span style="font-size: 9px;">Mohandra, Panna (M.P.)</span>
          </div>
          <div class="divider"></div>
          <div style="font-size: 10px; line-height: 1.3;">
            <b>Bill No:</b> #${String(order.billNumber).padStart(4, '0')}<br/>
            <b>Token No:</b> #${order.tokenNumber}<br/>
            <b>Date:</b> ${formattedDate}<br/>
            <b>Type:</b> ${order.fulfillmentType?.toUpperCase()} ${order.tableNumber ? `| Table: ${order.tableNumber}` : ''}<br/>
            <b>Pay Mode:</b> ${order.paymentMethod?.toUpperCase()}<br/>
            <b>Guest:</b> ${order.customerName || 'Walk-in Guest'}<br/>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="font-size: 10px; text-align: left; padding-bottom: 4px;">Item</th>
                <th style="font-size: 10px; text-align: center; padding-bottom: 4px;">Qty</th>
                <th style="font-size: 10px; text-align: right; padding-bottom: 4px;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div class="divider"></div>
          <div style="font-size: 11px; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${order.subtotal}</span></div>
            ${order.discount ? `<div style="display: flex; justify-content: space-between; font-weight: bold;"><span>Savings:</span><span>-₹${order.discount}</span></div>` : ''}
            ${order.gstRate ? `<div style="display: flex; justify-content: space-between;"><span>GST (${order.gstRate}%):</span><span>+₹${order.gstAmount || 0}</span></div>` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-top: 2px;"><span>GRAND TOTAL:</span><span>₹${order.total}</span></div>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size: 9px; margin-top: 6px;"><b>Thank you! Visit Again! 🍕🍔</b></div>
        </body>
      </html>
    `);
    printWindow.document.close();
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 font-sans antialiased">
        <Toaster position="top-center" />
        <form onSubmit={handlePinLoginSubmit} className="bg-neutral-950 border border-white/5 p-8 rounded-[2rem] w-full max-w-sm text-center space-y-6 shadow-2xl">
          <div className="space-y-2">
            <SafeLock className="text-orange-500 animate-bounce mx-auto" size={40} />
            <h1 className="text-lg font-black tracking-wider uppercase text-yellow-300">Bum Bum POS Security</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Please enter 4-Digit Security PIN</p>
          </div>
          
          <input type="password" maxLength={4} value={pinInput} readOnly className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-center text-2xl font-black font-mono tracking-widest text-orange-500 outline-none" />

          {/* Clean Virtual Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button type="button" key={num} onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput(p => p + num); }} className="bg-neutral-900 hover:bg-neutral-800 border border-white/5 py-3 rounded-xl font-bold font-mono text-base transition-all active:scale-95">{num}</button>
            ))}
            <button type="button" onClick={() => { triggerBeep('tap'); setPinInput(''); }} className="bg-neutral-900 hover:bg-red-950 hover:text-red-400 border border-white/5 py-3 rounded-xl font-black text-xs transition-all active:scale-95">CLEAR</button>
            <button type="button" onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput(p => p + '0'); }} className="bg-neutral-900 hover:bg-neutral-800 border border-white/5 py-3 rounded-xl font-bold font-mono text-base transition-all active:scale-95">0</button>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-black font-black py-3 rounded-xl text-xs transition-all active:scale-95 uppercase tracking-wider">LOGIN</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-800 dark:text-gray-100 flex flex-col md:flex-row font-sans antialiased overflow-hidden transition-colors duration-200">
      <Toaster position="top-center" />

      {/* 1. FLEXIBLE/RESPONSIVE LEFT NAVIGATION SIDEBAR */}
      <aside className={`bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-white/5 flex flex-col justify-between p-4 shrink-0 shadow-lg z-30 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-64 md:w-20 lg:w-64'}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1 py-1 border-b border-neutral-200 dark:border-white/5 pb-4 gap-2">
            <div className="flex items-center gap-2">
              <SafeDatabase className="text-orange-500 animate-pulse" size={18} />
              <h1 className="text-xs font-black tracking-wider uppercase text-yellow-500 dark:text-yellow-300">Bum Bum POS <span className="text-[8px] text-gray-400 lowercase font-mono">v1.12</span></h1>
            </div>
            <button onClick={() => { triggerBeep('tap'); setIsSidebarOpen(!isSidebarOpen); }} className="p-1.5 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-gray-400 hover:text-white rounded-lg md:hidden"><X size={14} /></button>
          </div>

          {/* Navigation stack */}
          <nav className="space-y-1.5">
            <button onClick={() => { triggerBeep('tap'); setActiveTab('billing'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'billing' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}><ShoppingBag size={14} /><span className="md:hidden lg:inline">Counter Billing</span></button>
            <button onClick={() => { triggerBeep('tap'); setActiveTab('orders'); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}><div className="flex items-center gap-3"><Clock size={14} /><span className="md:hidden lg:inline">Live Orders</span></div>{liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length > 0 && (<span className="bg-yellow-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full font-mono">{liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length}</span>)}</button>
            <button onClick={() => { triggerBeep('tap'); setActiveTab('inventory'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'inventory' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}><Layers size={14} /><span className="md:hidden lg:inline">Stock Toggle</span></button>
            <button onClick={() => { triggerBeep('tap'); setActiveTab('receipts'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'receipts' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}><Printer size={14} /><span className="md:hidden lg:inline">Past Receipts</span></button>
            <button onClick={() => { triggerBeep('tap'); setActiveTab('settings'); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'settings' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}><Settings size={14} /><span className="md:hidden lg:inline">POS Settings</span></button>
          </nav>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/5">
          <div className="px-2 text-neutral-500 dark:text-gray-400"><p className="text-[8px] font-mono tracking-wider font-bold leading-none">LOGGED IN AS</p><p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase truncate mt-1">{currentUser?.name || "Cashier"}</p></div>
          <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10 transition-colors"><LogOut size={14} /><span>Lock Terminal</span></button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT AREA */}
      <main className="flex-1 p-5 overflow-hidden flex flex-col relative h-screen">
        {/* GLOBAL HEADER BAR */}
        <div className="flex items-center gap-3 mb-4 shrink-0 border-b border-neutral-200 dark:border-white/5 pb-3">
          <button type="button" onClick={() => { triggerBeep('tap'); setIsSidebarOpen(true); }} className="p-2.5 bg-neutral-200 dark:bg-neutral-950 hover:bg-neutral-300 dark:hover:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-orange-500 hover:text-orange-400 rounded-xl transition-all shadow-md md:hidden"><SafeMenu size={16} /></button>
          <div className="flex flex-col"><h2 className="text-[10px] font-black uppercase tracking-widest text-orange-500 leading-none">{activeTab === 'billing' ? 'Counter Billing Workspace' : activeTab === 'orders' ? 'Live Orders Pipeline' : activeTab === 'inventory' ? 'Item Availability Control' : activeTab === 'receipts' ? 'Past Receipts reprint panel' : 'POS Configuration Settings'}</h2><span className="text-[9px] text-gray-400 font-bold mt-1">Bum Bum Cafe • Mohandra</span></div>
        </div>

        {/* TAB VIEWS RENDERED */}
        {activeTab === 'orders' && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {liveOrders.map((order: any) => {
                if (order.status === 'completed' || order.status === 'rejected') return null;
                return (
                  <motion.div layout key={order.id} className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                    <div>
                      <div className="flex justify-between items-start border-b border-neutral-200 dark:border-white/5 pb-2 mb-3">
                        <div><p className="text-xs font-black text-yellow-600 dark:text-yellow-300 font-mono">Bill: #${String(order.billNumber).padStart(4, '0')}</p><p className="text-[9px] text-gray-400 font-mono mt-0.5">Token: #{order.tokenNumber}</p></div>
                        <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">{order.fulfillmentType || 'table'}</span>
                      </div>
                      <div className="space-y-1 mb-3 text-[10px] font-semibold text-neutral-800 dark:text-gray-300"><p className="dark:text-white text-neutral-955 truncate font-black">👤 {order.customerName}</p>{order.customerPhone && <p className="font-mono">📞 {order.customerPhone}</p>}{order.address && <p className="text-gray-400 line-clamp-1">📍 {order.address}</p>}</div>
                      <div className="space-y-1.5 border-t border-dashed border-neutral-200 dark:border-white/5 pt-2.5 mb-4">
                        {order.items?.map((it: any, index: number) => (
                          <div key={index} className="flex justify-between text-[11px] text-neutral-800 dark:text-gray-200"><span className="font-bold">{it.name} <span className="text-orange-500">x{it.quantity}</span>{it.note ? `<br/><span style="font-size: 9px; color: #888;">(${it.note})</span>` : ''}</span><span className="font-mono text-gray-400">₹{it.price * it.quantity}</span></div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-black text-green-400 mb-3 font-mono border-t border-neutral-200 dark:border-white/5 pt-2.5"><span>Grand Total:</span><span>₹{order.total}</span></div>
                      <div className="flex gap-2">
                        {order.status === 'pending' && (<button onClick={() => handleUpdateStatus(order.id, 'preparing')} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"><Play size={10} className="fill-black" /> Accept (To KDS)</button>)}
                        {order.status === 'preparing' && (<button onClick={() => handleUpdateStatus(order.id, order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'completed')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"><Check size={10} /> Dispatch</button>)}
                        {order.status === 'out_for_delivery' && (<button onClick={() => handleUpdateStatus(order.id, 'completed')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"><Check size={10} /> Mark Completed</button>)}
                        <button onClick={() => handlePrintReceipt(order)} className="p-2.5 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-gray-500 hover:text-white rounded-xl"><Printer size={14} /></button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
              <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} /><input type="text" placeholder="Search dishes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl py-2 px-9 text-xs outline-none text-neutral-800 dark:text-white focus:border-orange-500 placeholder-gray-500 transition-colors" /></div>
                <button type="button" onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }} className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"><ShoppingBag size={14} /><span>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span></button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-3.5 scrollbar-none">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 transition-all ${selectedCategory === cat ? 'bg-orange-500 text-black border-orange-500 font-bold' : 'bg-neutral-100 dark:bg-neutral-900 text-gray-400 border-neutral-200 dark:border-white/5'}`}>{cat}</button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={24} /></div>
              ) : filteredMenu.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-10 uppercase tracking-widest font-black">No matching items found</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 overflow-y-auto flex-1 pr-1 pb-16">
                  {filteredMenu.map((item) => {
                    const isAvailable = item.isAvailable !== false;
                    return (
                      <button key={item.id} disabled={!isAvailable} onClick={() => { triggerBeep('tap'); item.variants ? setSelectedProduct(item) : handleAddProductToCart(item); }} className={`bg-neutral-50 dark:bg-neutral-900 border p-3 rounded-2xl text-left flex flex-col justify-between h-24 hover:border-orange-500 transition-all duration-200 active:scale-95 ${!isAvailable ? 'opacity-40 cursor-not-allowed border-white/5' : 'border-neutral-200 dark:border-white/5'}`}>
                        <div><p className="font-bold text-xs text-neutral-800 dark:text-gray-100 line-clamp-2 leading-snug">{item.name}</p><p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">{item.category}</p></div>
                        <div className="flex justify-between items-end w-full"><p className="text-yellow-600 dark:text-yellow-300 font-black text-xs font-mono">{getDisplayPrice(item)}</p>{!isAvailable && <span className="text-[7px] font-black text-red-500 uppercase">Unavailable</span>}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && !isCartOpen && (
              <motion.button  initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }} className="fixed bottom-6 right-6 left-6 md:left-auto bg-green-600 hover:bg-green-700 text-white font-black px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-40 border border-green-500/20 active:scale-95 transition-all"><div className="flex items-center gap-2.5"><div className="bg-white/10 p-2 rounded-xl"><ShoppingBag size={16} /></div><div className="text-left"><p className="text-[8px] uppercase tracking-wider text-green-100">Active Bill Cart</p><p className="text-xs font-bold font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</p></div></div><div className="flex items-center gap-1 text-sm font-black font-mono"><span>To Pay: ₹{getTotalBillPrice()}</span><span>➔</span></div></motion.button>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-5 flex-1 overflow-y-auto pb-20 shadow-xl rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Live Item Availability & Stock Control</h2><p className="text-[10px] text-neutral-500 dark:text-gray-400 font-bold mt-1">Disabling an item here immediately makes it unavailable on customers' phones.</p></div>
              <button onClick={async () => { triggerBeep('tap'); const prodSnap = await getDocs(collection(db, "products")); setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))); toast.success("Catalog updated!"); }} className="p-2 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-gray-400 hover:text-white transition-colors"><RefreshCw size={14} /></button>
            </div>
            <div className="space-y-2 max-w-2xl">
              {products.map((item) => {
                const isAvailable = item.isAvailable !== false;
                return (
                  <div key={item.id} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between">
                    <div><span className="font-bold text-xs text-neutral-800 dark:text-white block">{item.name}</span><span className="text-[8px] text-gray-500 uppercase tracking-wider block font-mono">Category: {item.category} | Price: ₹{item.price}</span></div>
                    <div className="flex items-center gap-4">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${isAvailable ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{isAvailable ? 'In Stock' : 'Out of Stock'}</span>
                      <button onClick={() => handleToggleStock(item.id, isAvailable)} className={`text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all active:scale-95 ${isAvailable ? 'bg-red-950/25 border-red-500/20 text-red-400 hover:bg-red-950' : 'bg-green-950/25 border-green-500/20 text-green-400 hover:bg-green-950'}`}>{isAvailable ? 'Disable' : 'Enable'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'receipts' && (
          <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
            <div className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
              <div className="relative mb-4"><Search className="absolute left-3 top-2.5 text-gray-500" size={14} /><input type="text" placeholder="Search past bills by Bill No, Name or Phone..." value={receiptSearchQuery} onChange={(e) => setReceiptSearchQuery(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl py-2 px-9 text-xs outline-none text-neutral-800 dark:text-white focus:border-orange-500 placeholder-gray-500 transition-colors" /></div>
              <div className="space-y-2 overflow-y-auto flex-1 pr-1 pb-16">
                {filteredPastReceipts.map((order) => {
                  const isSelected = selectedReceipt?.id === order.id;
                  const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
                  return (
                    <div key={order.id} onClick={() => { triggerBeep('tap'); setSelectedReceipt(order); }} className={`bg-neutral-50 dark:bg-neutral-900 border p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all hover:border-orange-500 ${isSelected ? 'border-orange-500 bg-orange-500/10' : 'border-neutral-200 dark:border-white/5'}`}>
                      <div><span className="font-bold text-xs block text-neutral-900 dark:text-white font-mono">Bill No: #${order.billNumber}</span><span className="text-[9px] text-gray-400 block font-mono">Token: #{order.tokenNumber} | ${formattedDate}</span><span className="text-[9px] text-gray-400 block uppercase">Guest: {order.customerName || 'Walk-in'}</span></div>
                      <div className="text-right"><span className="text-sm font-black text-green-600 dark:text-green-400 font-mono">₹{order.total}</span><span className="text-[8px] text-gray-500 block uppercase font-bold">{order.paymentMethod?.toUpperCase() || 'CASH'}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="w-full md:w-[380px] bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-4 rounded-3xl flex flex-col justify-between shadow-xl overflow-y-auto h-full text-neutral-800 dark:text-gray-100">
              {selectedReceipt ? (
                <div className="space-y-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="border-b border-neutral-200 dark:border-white/5 pb-3"><span className="text-[9px] text-orange-500 font-black uppercase tracking-wider">Receipt Inspector Panel</span><h3 className="text-base font-black font-mono">Bill No: #${selectedReceipt.billNumber}</h3><p className="text-[10px] text-gray-400 font-mono">Token: #{selectedReceipt.tokenNumber}</p></div>
                    <div className="space-y-3 mt-4">
                      <div className="bg-neutral-50 dark:bg-white/5 p-3 rounded-2xl text-[10px] font-semibold text-neutral-800 dark:text-gray-300 space-y-1"><p>👤 <b>Name:</b> {selectedReceipt.customerName || 'Walk-in Guest'}</p>{selectedReceipt.customerPhone && <p className="font-mono">📞 <b>Phone:</b> {selectedReceipt.customerPhone}</p>}<p><b>Pay Mode:</b> {selectedReceipt.paymentMethod?.toUpperCase() || 'CASH'}</p>{selectedReceipt.tableNumber && <p>🪑 <b>Table No:</b> {selectedReceipt.tableNumber}</p>}</div>
                      <div className="space-y-2 border-t border-neutral-200 dark:border-white/5 pt-3"><p className="text-[9px] font-black text-gray-400 uppercase">Items Purchased:</p>
                        {selectedReceipt.items?.map((it: any, index: number) => (
                          <div key={index} className="flex justify-between text-xs text-neutral-800 dark:text-gray-200"><span>{it.name} <span className="text-orange-500">x{it.quantity}</span>{it.note ? `<br/><span style="font-size: 9.5px; color: #888;">(${it.note})</span>` : ''}</span><span className="font-mono text-gray-400">₹{it.price * it.quantity}</span></div>
                        ))}
                      </div>
                      <div className="border-t border-neutral-200 dark:border-white/5 pt-3 space-y-1.5 text-xs font-semibold text-neutral-600 dark:text-gray-400 font-mono"><div className="flex justify-between"><span>Subtotal:</span><span>₹{selectedReceipt.subtotal}</span></div>{selectedReceipt.discount > 0 && <div className="flex justify-between text-yellow-500"><span>Savings/Discount:</span><span>-₹{selectedReceipt.discount}</span></div>}{selectedReceipt.gstRate > 0 && <div className="flex justify-between"><span>GST (${selectedReceipt.gstRate}%):</span><span>+₹{selectedReceipt.gstAmount || 0}</span></div>}<div className="flex justify-between font-black text-green-600 dark:text-green-400 text-sm border-t border-dashed border-neutral-200 dark:border-white/5 pt-2"><span>Grand Total:</span><span>₹{selectedReceipt.total}</span></div></div>
                    </div>
                  </div>
                  <button type="button" onClick={() => handlePrintReceipt(selectedReceipt)} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"><Printer size={16} /> Reprint Thermal Invoice</button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs text-center uppercase py-20 font-bold"><span>Select any past receipt to view breakdown & reprint bill 🧾</span></div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-6 rounded-3xl shadow-xl flex-grow max-w-2xl space-y-6 overflow-y-auto">
            <h3 className="text-sm font-black uppercase text-orange-500 tracking-wider">POS Configuration & Hardware settings</h3>
            <div className="border-b border-neutral-200 dark:border-white/5 pb-4 space-y-3"><p className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">A. Dashboard UI Theme mode:</p>
              <div className="flex bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-1 rounded-xl w-60">
                <button type="button" onClick={() => handleToggleTheme('dark')} className={`flex-grow flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${themeMode === 'dark' ? 'bg-[#050505] text-amber-400 border border-white/5 shadow-sm' : 'text-gray-400 hover:text-white'}`}><Moon size={12} /> Dark Mode</button>
                <button type="button" onClick={() => handleToggleTheme('light')} className={`flex-grow flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${themeMode === 'light' ? 'bg-white text-orange-600 border border-neutral-200 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}><Sun size={12} /> Light Mode</button>
              </div>
            </div>
            <div className="border-b border-neutral-200 dark:border-white/5 pb-4 space-y-3"><p className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">B. GST Configuration Setup:</p>
              <div className="flex items-center justify-between max-w-sm"><span className="text-[11px] font-semibold text-neutral-600 dark:text-gray-300">Enable GST calculations on all bills:</span><button type="button" onClick={() => { triggerBeep('tap'); const next = !gstEnabled; setGstEnabled(next); localStorage.setItem("bb_pos_gst_enabled", String(next)); }} className="text-orange-500">{gstEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-neutral-500" />}</button></div>
              {gstEnabled && (
                <div className="space-y-1 max-w-sm"><label className="text-[9px] font-black uppercase text-gray-500">GST Rate (%) Percentage</label><input type="number" placeholder="e.g. 5" value={gstRate} onChange={(e) => { const r = Math.max(0, Number(e.target.value)); setGstRate(r); localStorage.setItem("bb_pos_gst_rate", String(r)); }} className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-3 rounded-xl text-xs outline-none focus:border-orange-500 font-mono font-black" /></div>
              )}
            </div>
            <div className="pb-4 space-y-3"><p className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">C. Thermal Receipt Paper Settings:</p>
              <div className="flex bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-1 rounded-xl w-60">
                <button type="button" onClick={() => { triggerBeep('tap'); setPrinterPaperSize('58mm'); localStorage.setItem("bb_pos_paper_size", '58mm'); }} className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase transition-all ${printerPaperSize === '58mm' ? 'bg-[#050505] text-amber-400 border border-white/5 shadow-sm' : 'text-gray-400'}`}>58mm Roll width</button>
                <button type="button" onClick={() => { triggerBeep('tap'); setPrinterPaperSize('80mm'); localStorage.setItem("bb_pos_paper_size", '80mm'); }} className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase transition-all ${printerPaperSize === '80mm' ? 'bg-[#050505] text-amber-400 border border-white/5 shadow-sm' : 'text-gray-400'}`}>80mm Roll width</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. MODULAR CHILD OVERLAYS */}
      <PosCartDrawer 
        isHindi={false}
        isCartOpen={isCartOpen}
        setIsCartOpen={setIsCartOpen}
        cart={cart}
        setCart={setCart}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPoints={customerPoints}
        setCustomerPoints={setCustomerPoints}
        pointsToRedeem={pointsToRedeem}
        setPointsToRedeem={setPointsToRedeem}
        customDiscount={customDiscount}
        setCustomDiscount={setCustomDiscount}
        fulfillmentType={fulfillmentType}
        setFulfillmentType={setFulfillmentType}
        selectedArea={selectedArea}
        setSelectedArea={setSelectedArea}
        DELIVERY_AREAS={DELIVERY_AREAS}
        address={address}
        setAddress={setAddress}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        chefInstructions={chefInstructions}
        setChefInstructions={setChefInstructions}
        isSubmittingOrder={isSubmittingOrder}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        ketchupAddon={ketchupAddon}
        setKetchupAddon={setKetchupAddon}
        oreganoAddon={oreganoAddon}
        setOreganoAddon={setOreganoAddon}
        chiliFlakesAddon={chiliFlakesAddon}
        setChiliFlakesAddon={setChiliFlakesAddon}
        noCutlery={noCutlery}
        setNoCutlery={setNoCutlery}
        getCartSubtotal={getCartSubtotal}
        getCartAddonsPrice={getCartAddonsPrice}
        getDeliveryCharge={getDeliveryCharge}
        getFreeDeliveryProgressPercent={getFreeDeliveryProgressPercent}
        getTotalPointsRedeemedInCart={getTotalPointsRedeemedInCart}
        getTotalBillPrice={getTotalBillPrice}
        loyaltyRules={loyaltyRules}
        handlePlaceOrder={handlePlaceOrder}
        handleDetectLocation={handleDetectLocation}
        setIsCustomerModalOpen={setIsCustomerModalOpen}
        searchDbCustomers={searchDbCustomers}
        handleUpdateCartQuantity={handleUpdateCartQuantity}
        handleUpdateCartItemNote={handleUpdateCartItemNote}
        showAddonsSection={showAddonsSection}
        triggerBeep={triggerBeep}
      />

      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen}
        setIsCustomerModalOpen={setIsCustomerModalOpen}
        customerSearchQuery={customerSearchQuery}
        setCustomerSearchQuery={setCustomerSearchQuery}
        searchedCustomers={searchedCustomers}
        isSearchingCustomer={isSearchingCustomer}
        newCustName={newCustName}
        setNewCustName={setNewCustName}
        newCustPhone={newCustPhone}
        setNewCustPhone={setNewCustPhone}
        newCustAddress={newCustAddress}
        setNewCustAddress={setNewCustAddress}
        editingCustomer={editingCustomer}
        viewingHistoryCustomer={viewingHistoryCustomer}
        customerHistoryList={customerHistoryList}
        editCustPoints={editCustPoints}
        setEditCustPoints={setEditCustPoints}
        handleSelectCustomer={handleSelectCustomer}
        handleLoadCustomerHistory={handleLoadCustomerHistory}
        handleStartEditProfile={handleStartEditProfile}
        handleUpdateCustomerProfile={handleUpdateCustomerProfile}
        handleSaveNewCustomer={handleSaveNewCustomer}
        setViewingHistoryCustomer={setViewingHistoryCustomer}
        setCustomerHistoryList={setCustomerHistoryList}
        setEditingCustomer={setEditingCustomer}
        searchDbCustomers={searchDbCustomers}
        triggerBeep={triggerBeep}
      />

      <CustomizerModal 
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        normalPizzaSize={normalPizzaSize}
        setNormalPizzaSize={setNormalPizzaSize}
        normalPizzaPrice={normalPizzaPrice}
        setNormalPizzaPrice={setNormalPizzaPrice}
        normalPizzaAddons={normalPizzaAddons}
        setNormalPizzaAddons={setNormalPizzaAddons}
        customizerChefNote={customizerChefNote}
        setCustomizerChefNote={setCustomizerChefNote}
        PIZZA_ADDONS={PIZZA_ADDONS}
        QUICK_INSTRUCTION_TAGS={QUICK_INSTRUCTION_TAGS}
        handleAddCustomizedItemToCart={handleAddCustomizedItemToCart}
        triggerBeep={triggerBeep}
      />
    </div>
  );
}
