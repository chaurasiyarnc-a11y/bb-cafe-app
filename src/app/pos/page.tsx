

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
  Menu, Users, Edit, ArrowLeft, History, LogOut, Lock, ToggleLeft, ToggleRight, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

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

const PIZZA_ADDONS: { [size: string]: { [addon: string]: number } } = {
  "small": { "Veg Add-on": 10, "Paneer": 20, "Black Olives": 20, "Jalapeno": 20, "Extra Cheese": 20, "Mushroom": 20 },
  "medium": { "Veg Add-on": 10, "Paneer": 30, "Black Olives": 30, "Jalapeno": 30, "Extra Cheese": 30, "Mushroom": 30 },
  "large": { "Veg Add-on": 20, "Paneer": 40, "Black Olives": 40, "Jalapeno": 40, "Extra Cheese": 40, "Mushroom": 40 },
  "extra large": { "Veg Add-on": 30, "Paneer": 50, "Black Olives": 50, "Jalapeno": 50, "Extra Cheese": 60, "Mushroom": 50 }
};

const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

export default function BbCafePos() {
  // Authentication & Security Lockscreen States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [pinInput, setPinInput] = useState<string>('');

  // Navigation & View States - Default tab is 'billing'
  const [activeTab, setActiveTab] = useState<'orders' | 'billing' | 'inventory' | 'receipts' | 'settings'>('billing');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); 
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // Fully collapsible sidebar state

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

  // On Mount: Load login session and configurations
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

  // Live Orders Listener & Store Open Listener
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(ordersList);
    }, (error) => {
      console.error("Orders sync failed", error);
    });

    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) {
        setStoreOpen(d.data().isOpen);
      }
    });

    return () => {
      unsubscribe();
      unsubStore();
    };
  }, []);

  // Fetch Menu Products
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

  // Handler for PIN Entry Authentication (Checks Admin Dashboard's cafe_users collection)
  const handlePinLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4) {
      toast.error("Please enter a valid 4-digit PIN!");
      return;
    }

    // ⚡ Master Test PIN Bypass (Development testing purpose)
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
      // Direct lookup in the Admin panel's cafe_users collection
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

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Order updated to ${nextStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleCheckLoyalty = async () => {
    triggerBeep('tap');
    if (customerPhone.trim().length !== 10) {
      toast.error("Please enter a valid 10-digit number!");
      return;
    }
    const phoneClean = customerPhone.trim();
    const toastId = toast.loading("Checking loyalty points...");
    try {
      const docSnap = await getDoc(doc(db, "customer_points", phoneClean));
      toast.dismiss(toastId);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomerName(data.name || '');
        setCustomerPoints(data.points || 0);
        if (data.address) setAddress(data.address);
        toast.success(`Member Found! Points: ${data.points || 0}`);
      } else {
        setCustomerName('');
        setCustomerPoints(0);
        toast.success("New Guest profile initialized!");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Error checking loyalty DB");
    }
  };

  // Search Firestore Customer points list
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

  const handleSelectCustomer = (cust: any) => {
    triggerBeep('tap');
    setCustomerPhone(cust.phone);
    setCustomerName(cust.name);
    setCustomerPoints(cust.points || 0);
    if (cust.address) {
      setAddress(cust.address);
    }
    setIsCustomerModalOpen(false);
    toast.success(`Active Customer: ${cust.name}`);
  };

  // Fetch Customer Points ledger/history logs
  const handleLoadCustomerHistory = async (cust: any) => {
    triggerBeep('tap');
    setViewingHistoryCustomer(cust);
    const toastId = toast.loading("Loading points passbook...");
    try {
      const hSnap = await getDocs(
        query(
          collection(db, "customer_points", cust.phone, "history"),
          orderBy("timestamp", "desc"),
          limit(25)
        )
      );
      setCustomerHistoryList(hSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      toast.dismiss(toastId);
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Failed to load points ledger");
    }
  };

  // Edit Customer profile name, address & points balance directly
  const handleStartEditProfile = (cust: any) => {
    triggerBeep('tap');
    setEditingCustomer(cust);
    setNewCustName(cust.name);
    setNewCustAddress(cust.address || '');
    setEditCustPoints(cust.points || 0);
  };

  const handleUpdateCustomerProfile = async () => {
    triggerBeep('tap');
    if (!newCustName.trim()) {
      toast.error("Name field is mandatory!");
      return;
    }
    const toastId = toast.loading("Saving updates...");
    try {
      const userRef = doc(db, "customer_points", editingCustomer.phone);
      
      const updatedFields = {
        name: newCustName.trim(),
        address: newCustAddress.trim(),
        points: editCustPoints
      };

      await updateDoc(userRef, updatedFields);
      toast.dismiss(toastId);
      toast.success("Profile saved successfully!");

      if (customerPhone === editingCustomer.phone) {
        setCustomerName(updatedFields.name);
        setAddress(updatedFields.address);
        setCustomerPoints(updatedFields.points);
      }

      setEditingCustomer(null);
      searchDbCustomers(customerSearchQuery); 
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to edit user profile");
    }
  };

  // Save New Customer to Loyalty program DB directly
  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerBeep('tap');
    const cleanPhone = newCustPhone.trim();
    if (cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      toast.error("Mobile number must be exactly 10 digits!");
      return;
    }
    if (!newCustName.trim()) {
      toast.error("Name field cannot be left blank!");
      return;
    }

    const toastId = toast.loading("Registering guest...");
    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        toast.dismiss(toastId);
        toast.error("This phone number is already registered!");
        return;
      }

      const newDoc = {
        name: newCustName.trim(),
        phone: cleanPhone,
        points: 0,
        address: newCustAddress.trim() || "",
        lastActive: new Date()
      };

      await setDoc(userRef, newDoc);
      toast.dismiss(toastId);
      toast.success("New Customer Registered Successfully!");

      setCustomerPhone(cleanPhone);
      setCustomerName(newDoc.name);
      setCustomerPoints(0);
      if (newDoc.address) {
        setAddress(newDoc.address);
      }

      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setIsCustomerModalOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Database write operation failed");
    }
  };

  const handleAddProductToCart = (item: any) => {
    triggerBeep('tap');
    setCart((prev) => {
      const existingIndex = prev.findIndex(c => c.id === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: 1
      }];
    });
    toast.success(`${item.name} added!`, { duration: 800 });
  };

  const handleAddCustomizedItemToCart = () => {
    triggerBeep('tap');
    if (!normalPizzaSize) {
      toast.error("Please select a size first!");
      return;
    }

    let finalPrice = normalPizzaPrice;
    const selectedAddons: string[] = [];

    Object.entries(normalPizzaAddons).forEach(([addon, isSelected]) => {
      if (isSelected) {
        const cost = PIZZA_ADDONS[normalPizzaSize.toLowerCase()]?.[addon] || 0;
        finalPrice += cost;
        selectedAddons.push(addon);
      }
    });

    const noteParts: string[] = [];
    if (selectedAddons.length > 0) noteParts.push(`Addons: ${selectedAddons.join(', ')}`);
    if (customizerChefNote.trim()) noteParts.push(`Note: ${customizerChefNote.trim()}`);

    const compositeId = `${selectedProduct.id}-${normalPizzaSize.toLowerCase()}`;
    const compositeName = `${selectedProduct.name} (${normalPizzaSize.toUpperCase()})`;

    setCart((prev) => {
      const existingIndex = prev.findIndex(c => c.id === compositeId && c.note === noteParts.join(' | '));
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, {
        id: compositeId,
        name: compositeName,
        price: finalPrice,
        quantity: 1,
        note: noteParts.join(' | ')
      }];
    });

    setSelectedProduct(null);
    setNormalPizzaSize("");
    setNormalPizzaPrice(0);
    setNormalPizzaAddons({});
    setCustomizerChefNote("");

    toast.success("Customized item added!");
  };

  const handleUpdateCartQuantity = (id: string, amount: number) => {
    triggerBeep('tap');
    setCart((prev) => 
      prev.map(item => {
        if (item.id === id) {
          const updatedQty = item.quantity + amount;
          return updatedQty > 0 ? { ...item, quantity: updatedQty } : null;
        }
        return item;
      }).filter(Boolean) as PosCartItem[]
    );
  };

  const handleUpdateCartItemNote = (itemId: string, noteValue: string) => {
    setCart(prev => 
      prev.map(item => item.id === itemId ? { ...item, note: noteValue } : item)
    );
  };

  // Pricing Helpers
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

  const handleRedeemLoyaltyReward = (rule: any) => {
    triggerBeep('tap');
    const currentRedeemedCost = cart.reduce((acc, i) => acc + (i.pointsCost || 0), 0);
    const availablePointsPool = customerPoints - currentRedeemedCost;

    if (availablePointsPool < rule.pointsCost) {
      toast.error("Not enough loyalty points balance!");
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        id: `reward-${rule.id}-${Date.now()}`,
        name: `🎁 FREE ${rule.rewardName}`,
        price: 0,
        quantity: 1,
        isReward: true,
        pointsCost: Number(rule.pointsCost) || 0,
        category: "Special"
      }
    ]);
    toast.success(`${rule.rewardName} added as reward!`);
  };

  const getLoyaltyDiscount = () => Math.min(pointsToRedeem, getCartSubtotal());
  
  // Real-time GST calculation logic
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

  // 📄 THERMAL RECEIPT PRINTING FUNCTION
  const handlePrintReceipt = (order: any) => {
    triggerBeep('tap');
    const widthPixels = printerPaperSize === '58mm' ? '240px' : '290px';
    const printWindow = window.open('', '_blank', 'width=340,height=600');
    if (!printWindow) return;

    const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
    const itemsRows = order.items.map((it: any) => `
      <tr>
        <td style="font-size: 11px; padding: 4px 0; max-width: 140px; word-break: break-word;">
          ${it.name}
          ${it.note ? `<br/><span style="font-size: 9px; color: #555; font-style: italic;">(${it.note})</span>` : ''}
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
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: ${widthPixels}; 
              margin: 0; 
              padding: 8px; 
              color: #000;
              background-color: #fff;
            }
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
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="divider"></div>
          <div style="font-size: 11px; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>₹${order.subtotal}</span>
            </div>
            ${order.discount ? `
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Savings:</span>
              <span>-₹${order.discount}</span>
            </div>` : ''}
            ${order.gstRate ? `
            <div style="display: flex; justify-content: space-between;">
              <span>GST (${order.gstRate}%):</span>
              <span>+₹${order.gstAmount || 0}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; margin-top: 2px;">
              <span>GRAND TOTAL:</span>
              <span>₹${order.total}</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size: 9px; margin-top: 6px;">
            <b>Thank you! Visit Again! 🍕🍔</b>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Checkout submission to Firestore & print trigger
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your billing cart is empty!");
      return;
    }
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const addOnsCost = getCartAddonsPrice();
    const deliveryCharge = getDeliveryCharge();
    const totalPointsCost = getTotalPointsRedeemedInCart(); 
    const discountCombined = customDiscount; 
    const gstAmount = getGstAmountCalculated();
    const finalTotal = getTotalBillPrice();

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

      const orderObj = {
        billNumber,
        tokenNumber,
        deliveryPin,
        customerName: customerName.trim() || "Walk-in Guest",
        customerPhone: customerPhone ? `+91${customerPhone}` : "",
        items: cart,
        subtotal: subtotal + addOnsCost,
        discount: discountCombined,
        gstRate: gstEnabled ? gstRate : 0,
        gstAmount: gstAmount,
        total: finalTotal,
        timestamp: new Date(),
        status: 'completed',
        fulfillmentType: fulfillmentType,
        deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "",
        tableNumber: fulfillmentType === 'table' ? tableNumber : '',
        paymentMethod: paymentMethod, 
        ketchupAddon,
        oreganoAddon,
        chiliFlakesAddon,
        noCutlery,
        source: 'POS'
      };

      await addDoc(collection(db, "orders"), orderObj);

      if (customerPhone && customerPhone.trim().length === 10) {
        const phoneClean = customerPhone.trim();
        const pointsEarned = Math.floor(finalTotal / 100);
        const netPointsChange = pointsEarned - totalPointsCost;

        await runTransaction(db, async (txn) => {
          const userRef = doc(db, "customer_points", phoneClean);
          const userSnap = await txn.get(userRef);

          if (!userSnap.exists()) {
            txn.set(userRef, {
              name: customerName.trim() || "Walk-in Guest",
              phone: phoneClean,
              points: pointsEarned,
              lastActive: new Date()
            });
          } else {
            txn.update(userRef, {
              points: increment(netPointsChange),
              lastActive: new Date()
            });
          }
        });

        if (pointsEarned > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'earn',
            points: pointsEarned,
            description: `Earned on Bill #${billNumber} at POS Counter`,
            timestamp: new Date()
          });
        }
        if (totalPointsCost > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'redeem',
            points: totalPointsCost,
            description: `Redeemed rewards on Bill #${billNumber} at POS Counter`,
            timestamp: new Date()
          });
        }
      }

      triggerBeep('success');
      toast.success(`Bill #${billNumber} processed!`);
      
      handlePrintReceipt(orderObj);

      // Reset billing states
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerPoints(0);
      setPointsToRedeem(0);
      setCustomDiscount(0);
      setIsCartOpen(false); 
      setPaymentMethod('cash');
      setKetchupAddon(false);
      setOreganoAddon(false);
      setChiliFlakesAddon(false);
      setNoCutlery(false);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to process counter transaction");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "products", productId), {
        isAvailable: !currentStatus
      });
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, isAvailable: !currentStatus } : p)
      );
      toast.success("Stock status updated on Web App!");
    } catch (err) {
      toast.error("Error updating stock");
    }
  };

  // Toggle Theme mode globally
  const handleToggleTheme = (mode: 'dark' | 'light') => {
    triggerBeep('tap');
    setThemeMode(mode);
    localStorage.setItem("bb_pos_theme", mode);
    if (mode === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Filtered lists
  const filteredMenu = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const filteredPastReceipts = useMemo(() => {
    return liveOrders.filter(o => {
      const bStr = String(o.billNumber);
      const phoneStr = String(o.customerPhone || '');
      const nameStr = String(o.customerName || '').toLowerCase();
      const q = receiptSearchQuery.trim().toLowerCase();
      return bStr.includes(q) || phoneStr.includes(q) || nameStr.includes(q);
    });
  }, [liveOrders, receiptSearchQuery]);

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

  // Verification if addons are showable (Matches the pasted logic)
  const showAddonsSection = useMemo(() => {
    const eligibleKeywords = ['pizza', 'sandwich', 'burger', 'momo', 'fries', 'chips', 'finger'];
    return cart.some((item: any) => {
      const nameLower = (item.name || '').toLowerCase();
      return eligibleKeywords.some(keyword => nameLower.includes(keyword));
    });
  }, [cart]);

  const handleDetectLocation = () => {
    triggerBeep('tap');
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your device.");
      return;
    }

    const toastId = toast.loading("Detecting live location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAddress(`GPS Location: https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
        toast.dismiss(toastId);
        toast.success("Location successfully detected!");
      },
      () => {
        toast.dismiss(toastId);
        toast.error("Unable to retrieve location.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // --- RENDERING SECURE SECURITY LOCK SCREEN PANEL IF LOGGED OUT ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 font-sans antialiased">
        <Toaster position="top-center" />
        <form onSubmit={handlePinLoginSubmit} className="bg-neutral-950 border border-white/5 p-8 rounded-[2rem] w-full max-w-sm text-center space-y-6 shadow-2xl">
          <div className="space-y-2">
            <Lock className="text-orange-500 animate-bounce mx-auto" size={40} />
            <h1 className="text-lg font-black tracking-wider uppercase text-yellow-300">Bum Bum POS Security</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Please enter 4-Digit Security PIN</p>
          </div>
          
          <input 
            type="password" 
            maxLength={4}
            value={pinInput}
            readOnly
            className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-center text-2xl font-black font-mono tracking-widest text-orange-500 outline-none"
          />

          {/* Clean Virtual Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput(p => p + num); }}
                className="bg-neutral-900 hover:bg-neutral-800 border border-white/5 py-3 rounded-xl font-bold font-mono text-base transition-all active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { triggerBeep('tap'); setPinInput(''); }}
              className="bg-neutral-900 hover:bg-red-950 hover:text-red-400 border border-white/5 py-3 rounded-xl font-black text-xs transition-all active:scale-95"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput(p => p + '0'); }}
              className="bg-neutral-900 hover:bg-neutral-800 border border-white/5 py-3 rounded-xl font-bold font-mono text-base transition-all active:scale-95"
            >
              0
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-black font-black py-3 rounded-xl text-xs transition-all active:scale-95 uppercase tracking-wider"
            >
              LOGIN
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-800 dark:text-gray-100 flex flex-col md:flex-row font-sans antialiased overflow-hidden transition-colors duration-200">
      <Toaster position="top-center" />

      {/* 1. FLEXIBLE/RESPONSIVE LEFT NAVIGATION SIDEBAR */}
      <aside 
        className={`bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-white/5 flex flex-col justify-between p-4 shrink-0 shadow-lg z-30 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-64 md:w-20 lg:w-64'
        }`}
      >
        <div className="space-y-6">
          {/* Header block with responsive indicators */}
          <div className="flex items-center justify-between px-1 py-1 border-b border-neutral-200 dark:border-white/5 pb-4 gap-2">
            <div className="flex items-center gap-2">
              <Database className="text-orange-500 animate-pulse" size={18} />
              <h1 className="text-xs font-black tracking-wider uppercase text-yellow-500 dark:text-yellow-300">
                Bum Bum POS <span className="text-[8px] text-gray-400 lowercase font-mono">v1.12</span>
              </h1>
            </div>
            <button 
              onClick={() => { triggerBeep('tap'); setIsSidebarOpen(!isSidebarOpen); }}
              className="p-1.5 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-gray-400 hover:text-white rounded-lg md:hidden"
            >
              <X size={14} />
            </button>
          </div>

          {/* Navigation stack */}
          <nav className="space-y-1.5">
            <button 
              onClick={() => { triggerBeep('tap'); setActiveTab('billing'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'billing' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}
            >
              <ShoppingBag size={14} />
              <span className={`md:hidden lg:inline`}>Counter Billing</span>
            </button>

            <button 
              onClick={() => { triggerBeep('tap'); setActiveTab('orders'); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}
            >
              <div className="flex items-center gap-3">
                <Clock size={14} />
                <span className={`md:hidden lg:inline`}>Live Orders</span>
              </div>
              {liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length > 0 && (
                <span className="bg-yellow-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full font-mono">
                  {liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { triggerBeep('tap'); setActiveTab('inventory'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'inventory' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}
            >
              <Layers size={14} />
              <span className={`md:hidden lg:inline`}>Stock Toggle</span>
            </button>

            <button 
              onClick={() => { triggerBeep('tap'); setActiveTab('receipts'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'receipts' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}
            >
              <Printer size={14} />
              <span className={`md:hidden lg:inline`}>Past Receipts</span>
            </button>

            <button 
              onClick={() => { triggerBeep('tap'); setActiveTab('settings'); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'settings' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}
            >
              <Settings size={14} />
              <span className={`md:hidden lg:inline`}>POS Settings</span>
            </button>
          </nav>
        </div>

        {/* LOGOUT BUTTON IN VERTICAL SIDEBAR BASE */}
        <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/5">
          <div className="px-2 text-neutral-500 dark:text-gray-400">
            <p className="text-[8px] font-mono tracking-wider font-bold">LOGGED IN AS</p>
            <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase truncate">{currentUser?.name || "Cashier"}</p>
          </div>
          <button 
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
            <span className={`md:hidden lg:inline`}>Lock Terminal</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT AREA */}
      <main className="flex-1 p-5 overflow-hidden flex flex-col relative h-screen">
        
        {/* GLOBAL HEADER BAR WITH SIDEBAR MENU TOGGLE */}
        <div className="flex items-center gap-3 mb-4 shrink-0 border-b border-neutral-200 dark:border-white/5 pb-3">
          <button 
            type="button"
            onClick={() => { triggerBeep('tap'); setIsSidebarOpen(true); }}
            className="p-2.5 bg-neutral-200 dark:bg-neutral-950 hover:bg-neutral-300 dark:hover:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-orange-500 hover:text-orange-400 rounded-xl transition-all shadow-md md:hidden"
          >
            <Menu size={16} />
          </button>
          
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-orange-500 leading-none">
              {activeTab === 'billing' ? 'Counter Billing Workspace' : activeTab === 'orders' ? 'Live Orders Pipeline' : 'Item Availability Control'}
            </h2>
            <span className="text-[9px] text-gray-400 font-bold mt-1">Bum Bum Cafe • Mohandra</span>
          </div>

          {/* DYNAMIC CUSTOMER SEARCH DIRECTORY TRIGGER IN HEADER */}
          {activeTab === 'billing' && (
            <button
              type="button"
              onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(true); searchDbCustomers(''); }}
              className="ml-auto p-2.5 bg-neutral-200 dark:bg-neutral-950 hover:bg-neutral-300 dark:hover:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-yellow-600 dark:text-yellow-400 rounded-xl transition-all shadow-md flex items-center gap-1.5 text-[10px] font-black uppercase"
            >
              <Users size={14} />
              <span>Search Guest</span>
            </button>
          )}
        </div>

        {/* VIEW 1: LIVE ORDERS TICKET PIPELINE */}
        {activeTab === 'orders' && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {liveOrders.map((order: any) => {
                if (order.status === 'completed' || order.status === 'rejected') return null;

                return (
                  <motion.div 
                    layout
                    key={order.id}
                    className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-neutral-200 dark:border-white/5 pb-2 mb-3">
                        <div>
                          <p className="text-xs font-black text-yellow-600 dark:text-yellow-300 font-mono">Bill: #${String(order.billNumber).padStart(4, '0')}</p>
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Token: #{order.tokenNumber}</p>
                        </div>
                        <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                          {order.fulfillmentType || 'table'}
                        </span>
                      </div>

                      <div className="space-y-1 mb-3 text-[10px] font-semibold text-neutral-800 dark:text-gray-300">
                        <p className="dark:text-white text-neutral-950 truncate font-black">👤 {order.customerName}</p>
                        {order.customerPhone && <p className="font-mono text-gray-400">📞 {order.customerPhone}</p>}
                        {order.address && <p className="text-gray-400 line-clamp-1">📍 {order.address}</p>}
                      </div>

                      <div className="space-y-1.5 border-t border-dashed border-neutral-200 dark:border-white/5 pt-2.5 mb-4">
                        {order.items?.map((it: any, index: number) => (
                          <div key={index} className="flex justify-between text-[11px] text-neutral-800 dark:text-gray-200">
                            <span className="font-bold">
                              {it.name} <span className="text-orange-500">x{it.quantity}</span>
                              {it.note ? `<br/><span style="font-size: 9px; color: #888;">(${it.note})</span>` : ''}
                            </span>
                            <span className="font-mono text-gray-400">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-black text-green-400 mb-3 font-mono border-t border-neutral-200 dark:border-white/5 pt-2.5">
                        <span>Grand Total:</span>
                        <span>₹{order.total}</span>
                      </div>

                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'preparing')}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                          >
                            <Play size={10} className="fill-black" /> Accept (To KDS)
                          </button>
                        )}
                        
                        {order.status === 'preparing' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'completed')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                          >
                            <Check size={10} /> Dispatch
                          </button>
                        )}

                        {order.status === 'out_for_delivery' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                          >
                            <Check size={10} /> Mark Completed
                          </button>
                        )}

                        <button 
                          onClick={() => handlePrintReceipt(order)}
                          className="p-2.5 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-gray-500 hover:text-white rounded-xl transition-all"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: BILLING WORKSPACE */}
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* PRODUCT CATALOG */}
            <div className="flex-1 bg-neutral-950 border border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
              <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search dishes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/5 rounded-xl py-2 px-9 text-xs outline-none text-white focus:border-orange-500 placeholder-gray-500 transition-colors"
                  />
                </div>

                {/* ACTIVE DRAWER TRIGGER */}
                <button 
                  type="button"
                  onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <ShoppingBag size={14} />
                  <span>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
                </button>
              </div>

              {/* Category Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-3.5 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 transition-all ${selectedCategory === cat ? 'bg-orange-500 text-black border-orange-500 font-bold' : 'bg-neutral-900 text-gray-400 border-neutral-200 dark:border-white/5'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* PRODUCTS DISPLAY GRID VS LIST */}
              {loading ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="animate-spin text-orange-500" size={24} />
                </div>
              ) : filteredMenu.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-10 uppercase tracking-widest font-black">No matching items found</p>
              ) : viewMode === 'grid' ? (
                
                /* EXTREMELY HIGH-DENSITY 4-COLUMN GRID LAYOUT */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 overflow-y-auto flex-1 pr-1 pb-16">
                  {filteredMenu.map((item) => {
                    const isAvailable = item.isAvailable !== false;
                    return (
                      <button
                        key={item.id}
                        disabled={!isAvailable}
                        onClick={() => {
                          triggerBeep('tap');
                          item.variants ? setSelectedProduct(item) : handleAddProductToCart(item);
                        }}
                        className={`bg-neutral-900 border p-3 rounded-2xl text-left flex flex-col justify-between h-24 hover:border-orange-500 transition-all duration-200 active:scale-95 ${!isAvailable ? 'opacity-40 cursor-not-allowed border-white/5' : 'border-white/5'}`}
                      >
                        <div>
                          <p className="font-bold text-xs text-gray-100 line-clamp-2 leading-snug">{item.name}</p>
                          <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">{item.category}</p>
                        </div>
                        <div className="flex justify-between items-end w-full">
                          <p className="text-yellow-300 font-black text-xs font-mono">{getDisplayPrice(item)}</p>
                          {!isAvailable && <span className="text-[7px] font-black text-red-500 uppercase">Unavailable</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                
                /* DENSE LIST VIEW */
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 pb-16">
                  {filteredMenu.map((item) => {
                    const isAvailable = item.isAvailable !== false;
                    return (
                      <button
                        key={item.id}
                        disabled={!isAvailable}
                        onClick={() => {
                          triggerBeep('tap');
                          item.variants ? setSelectedProduct(item) : handleAddProductToCart(item);
                        }}
                        className={`bg-neutral-900 border p-3 rounded-xl flex items-center justify-between text-left hover:border-orange-500 transition-all duration-150 active:scale-[0.99] ${!isAvailable ? 'opacity-45 cursor-not-allowed border-white/5' : 'border-white/5'}`}
                      >
                        <div className="space-y-0.5 pr-4 flex-1">
                          <p className="font-bold text-xs text-gray-100 line-clamp-1">{item.name}</p>
                          <p className="text-[8px] text-gray-500 uppercase tracking-wider">{item.category}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-yellow-300 font-black text-xs font-mono">{getDisplayPrice(item)}</p>
                          <div className="bg-orange-500/10 text-orange-400 p-1.5 rounded-lg border border-orange-500/20">
                            <Plus size={12} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FLOATING ACTION CART BAR */}
            {cart.length > 0 && !isCartOpen && (
              <motion.button
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }}
                className="fixed bottom-6 right-6 left-6 md:left-auto bg-green-600 hover:bg-green-700 text-white font-black px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-40 border border-green-500/20 active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-white/10 p-2 rounded-xl">
                    <ShoppingBag size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] uppercase tracking-wider text-green-100">Active Bill Cart</p>
                    <p className="text-xs font-bold font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-black font-mono">
                  <span>To Pay: ₹{getTotalBillPrice()}</span>
                  <span>➔</span>
                </div>
              </motion.button>
            )}

          </div>
        )}

        {/* VIEW 3: INVENTORY STOCK MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-5 flex-1 overflow-y-auto pb-20 shadow-xl rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Live Item Availability & Stock Control</h2>
                <p className="text-[10px] text-neutral-500 dark:text-gray-400 font-bold mt-1">Disabling an item here immediately makes it unavailable on customers' phones.</p>
              </div>
              <button 
                onClick={async () => {
                  triggerBeep('tap');
                  const prodSnap = await getDocs(collection(db, "products"));
                  setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                  toast.success("Catalog updated!");
                }}
                className="p-2 bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-white/5 text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-2 max-w-2xl">
              {products.map((item) => {
                const isAvailable = item.isAvailable !== false;
                return (
                  <div 
                    key={item.id} 
                    className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-neutral-800 dark:text-white block">{item.name}</span>
                      <span className="text-[8px] text-gray-500 uppercase tracking-wider block font-mono">Category: {item.category} | Price: ₹{item.price}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${isAvailable ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {isAvailable ? 'In Stock' : 'Out of Stock'}
                      </span>
                      <button
                        onClick={() => handleToggleStock(item.id, isAvailable)}
                        className={`text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all active:scale-95 ${isAvailable ? 'bg-red-950/25 border-red-500/20 text-red-400 hover:bg-red-950' : 'bg-green-950/25 border-green-500/20 text-green-400 hover:bg-green-950'}`}
                      >
                        {isAvailable ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: PAST RECEIPTS & REPRINT LEDGER SCREEN */}
        {activeTab === 'receipts' && (
          <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
            
            {/* Left side: Search Receipts list */}
            <div className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Search past bills by Bill No, Name or Phone..." 
                  value={receiptSearchQuery}
                  onChange={(e) => setReceiptSearchQuery(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl py-2 px-9 text-xs outline-none text-neutral-800 dark:text-white focus:border-orange-500 placeholder-gray-500 transition-colors"
                />
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 pr-1 pb-16">
                {filteredPastReceipts.map((order) => {
                  const isSelected = selectedReceipt?.id === order.id;
                  const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
                  
                  return (
                    <div 
                      key={order.id}
                      onClick={() => { triggerBeep('tap'); setSelectedReceipt(order); }}
                      className={`bg-neutral-50 dark:bg-neutral-900 border p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all hover:border-orange-500 ${
                        isSelected ? 'border-orange-500 bg-orange-500/10' : 'border-neutral-200 dark:border-white/5'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs block text-neutral-900 dark:text-white font-mono">Bill No: #${order.billNumber}</span>
                        <span className="text-[9px] text-gray-400 block font-mono">Token: #{order.tokenNumber} | ${formattedDate}</span>
                        <span className="text-[9px] text-gray-400 block uppercase">Guest: {order.customerName || 'Walk-in'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-green-600 dark:text-green-400 font-mono">₹{order.total}</span>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold">{order.paymentMethod?.toUpperCase() || 'CASH'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side: Detailed selected bill parameters & print trigger */}
            <div className="w-full md:w-[380px] bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-4 rounded-3xl flex flex-col justify-between shadow-xl overflow-y-auto h-full">
              {selectedReceipt ? (
                <div className="space-y-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="border-b border-neutral-200 dark:border-white/5 pb-3">
                      <span className="text-[9px] text-orange-500 font-black uppercase tracking-wider">Receipt Inspector Panel</span>
                      <h3 className="text-base font-black text-neutral-900 dark:text-white font-mono">Bill No: #${selectedReceipt.billNumber}</h3>
                      <p className="text-[10px] text-gray-400 font-mono">Token: #{selectedReceipt.tokenNumber}</p>
                    </div>

                    <div className="space-y-3 mt-4">
                      {/* Customer metrics */}
                      <div className="bg-neutral-50 dark:bg-white/5 p-3 rounded-2xl text-[10px] font-semibold text-neutral-800 dark:text-gray-300 space-y-1">
                        <p>👤 <b>Name:</b> {selectedReceipt.customerName || 'Walk-in Guest'}</p>
                        {selectedReceipt.customerPhone && <p className="font-mono">📞 <b>Phone:</b> {selectedReceipt.customerPhone}</p>}
                        <p><b>Pay Mode:</b> {selectedReceipt.paymentMethod?.toUpperCase() || 'CASH'}</p>
                        {selectedReceipt.tableNumber && <p>🪑 <b>Table No:</b> {selectedReceipt.tableNumber}</p>}
                      </div>

                      {/* Item Details */}
                      <div className="space-y-2 border-t border-neutral-200 dark:border-white/5 pt-3">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Items Purchased:</p>
                        {selectedReceipt.items?.map((it: any, index: number) => (
                          <div key={index} className="flex justify-between text-xs text-neutral-800 dark:text-gray-200">
                            <span>
                              {it.name} <span className="text-orange-500">x{it.quantity}</span>
                              {it.note ? `<br/><span style="font-size: 9.5px; color: #888;">(${it.note})</span>` : ''}
                            </span>
                            <span className="font-mono text-gray-400">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Financial statistics */}
                      <div className="border-t border-neutral-200 dark:border-white/5 pt-3 space-y-1.5 text-xs font-semibold text-neutral-600 dark:text-gray-400 font-mono">
                        <div className="flex justify-between"><span>Subtotal:</span><span>₹{selectedReceipt.subtotal}</span></div>
                        {selectedReceipt.discount > 0 && <div className="flex justify-between text-yellow-500"><span>Savings/Discount:</span><span>-₹{selectedReceipt.discount}</span></div>}
                        {selectedReceipt.gstRate > 0 && <div className="flex justify-between"><span>GST (${selectedReceipt.gstRate}%):</span><span>+₹{selectedReceipt.gstAmount || 0}</span></div>}
                        <div className="flex justify-between font-black text-green-600 dark:text-green-400 text-sm border-t border-dashed border-neutral-200 dark:border-white/5 pt-2">
                          <span>Grand Total:</span><span>₹{selectedReceipt.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="button"
                    onClick={() => handlePrintReceipt(selectedReceipt)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Printer size={16} /> Reprint Thermal Invoice
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs text-center uppercase py-20 font-bold">
                  <span>Select any past receipt to view breakdown & reprint bill 🧾</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: CONFIGURATION SETTINGS VIEW */}
        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-6 rounded-3xl shadow-xl flex-grow max-w-2xl space-y-6 overflow-y-auto">
            <h3 className="text-sm font-black uppercase text-orange-500 tracking-wider">POS Configuration & Hardware settings</h3>

            {/* A. Dark/Light Theme Switching */}
            <div className="border-b border-neutral-200 dark:border-white/5 pb-4 space-y-3">
              <p className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">A. Dashboard UI Theme mode:</p>
              <div className="flex bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-1 rounded-xl w-60">
                <button
                  type="button"
                  onClick={() => handleToggleTheme('dark')}
                  className={`flex-grow flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                    themeMode === 'dark' ? 'bg-[#050505] text-amber-400 border border-white/5 shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Moon size={12} /> Dark Mode
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTheme('light')}
                  className={`flex-grow flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                    themeMode === 'light' ? 'bg-white text-orange-600 border border-neutral-200 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  <Sun size={12} /> Light Mode
                </button>
              </div>
            </div>

            {/* B. GST Configuration parameters */}
            <div className="border-b border-neutral-200 dark:border-white/5 pb-4 space-y-3">
              <p className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">B. GST Configuration Setup:</p>
              
              <div className="flex items-center justify-between max-w-sm">
                <span className="text-[11px] font-semibold text-neutral-600 dark:text-gray-300">Enable GST calculations on all bills:</span>
                <button 
                  type="button"
                  onClick={() => {
                    triggerBeep('tap');
                    const next = !gstEnabled;
                    setGstEnabled(next);
                    localStorage.setItem("bb_pos_gst_enabled", String(next));
                  }}
                  className="text-orange-500"
                >
                  {gstEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-neutral-500" />}
                </button>
              </div>

              {gstEnabled && (
                <div className="space-y-1 max-w-sm">
                  <label className="text-[9px] font-black uppercase text-gray-500">GST Rate (%) Percentage</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 5"
                    value={gstRate}
                    onChange={(e) => {
                      const r = Math.max(0, Number(e.target.value));
                      setGstRate(r);
                      localStorage.setItem("bb_pos_gst_rate", String(r));
                    }}
                    className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-3 rounded-xl text-xs outline-none focus:border-orange-500 font-mono font-black"
                  />
                </div>
              )}
            </div>

            {/* C. Printer configuration parameter */}
            <div className="pb-4 space-y-3">
              <p className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">C. Thermal Receipt Paper Settings:</p>
              
              <div className="flex bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-1 rounded-xl w-60">
                <button
                  type="button"
                  onClick={() => {
                    triggerBeep('tap');
                    setPrinterPaperSize('58mm');
                    localStorage.setItem("bb_pos_paper_size", '58mm');
                  }}
                  className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                    printerPaperSize === '58mm' ? 'bg-[#050505] text-amber-400 border border-white/5 shadow-sm' : 'text-gray-400'
                  }`}
                >
                  58mm Roll width
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerBeep('tap');
                    setPrinterPaperSize('80mm');
                    localStorage.setItem("bb_pos_paper_size", '80mm');
                  }}
                  className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                    printerPaperSize === '80mm' ? 'bg-[#050505] text-amber-400 border border-white/5 shadow-sm' : 'text-gray-400'
                  }`}
                >
                  80mm Roll width
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ACTIVE ORDER DESK DRAWER - MOVED TO ROOT LEVEL & SET TO HIGHER Z-INDEX (z-[120]) */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-end font-sans"
            />

            <motion.div
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed right-0 bottom-0 top-0 w-full sm:w-[460px] bg-[#0b0c10] border-l border-white/10 p-5 z-[120] flex flex-col justify-between shadow-2xl overflow-y-auto pb-32 scrollbar-thin text-gray-100"
            >
              <div>
                {/* Live Bill Sticky Progress Header */}
                <div className="sticky top-0 z-30 bg-[#0b0c10] pb-3 border-b border-white/5 space-y-2 mb-4">
                  {fulfillmentType === "delivery" && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 space-y-1.5 text-[10px] font-sans font-bold">
                      <div className="flex justify-between items-center font-black uppercase text-orange-400">
                        <span>🚚 Free Delivery Target:</span>
                        <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="bg-neutral-950 p-3 rounded-2xl border border-white/5 flex justify-between items-center font-mono font-bold">
                    <span className="text-[10px] font-black uppercase text-gray-400 font-sans">LIVE BILL TOTAL:</span>
                    <span className="text-sm font-black text-yellow-400 font-mono">₹{getTotalBillPrice()}</span>
                  </div>
                </div>

                {/* Header with Title and Clear Cart Option */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-white font-mono font-bold">Your POS Cart</h2>
                  <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => { triggerBeep('tap'); setCart([]); }}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                      >
                        <Trash2 size={12} /> Clear Cart
                      </button>
                    )}
                    <button onClick={() => { triggerBeep('tap'); setIsCartOpen(false); }} className="p-2.5 bg-white/5 text-white rounded-full hover:bg-white/10 transition-all">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                
                {/* 1. CART ITEMS LIST */}
                <div className="space-y-3.5 mb-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex flex-col bg-white/[0.02] p-4 rounded-2xl border border-white/5 shadow-sm transition-colors duration-200 gap-1.5 font-sans font-bold">
                      <div className="flex justify-between items-center">
                        <div className="min-w-0 pr-3 flex-1">
                          <h4 className="font-bold text-xs text-gray-100 truncate">{item.name}</h4>
                          <p className="text-orange-500 font-black mt-1 text-[11px] font-mono">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-xl border border-white/10 flex-shrink-0">
                          <button type="button" onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded text-sm font-black">-</button>
                          <span className="font-black text-xs px-1 text-white font-mono">{item.quantity}</span>
                          {item.isReward ? (
                            <button type="button" disabled className="w-6 h-6 flex items-center justify-center bg-white/5 text-gray-500 rounded text-sm font-black cursor-not-allowed opacity-30">+</button>
                          ) : (
                            <button type="button" onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-green-500/10 text-green-500 rounded text-sm font-black">+</button>
                          )}
                        </div>
                      </div>
                      
                      {/* Inline instructions note */}
                      <input 
                        type="text"
                        placeholder="Instructions for KOT..."
                        value={item.note || ''}
                        onChange={(e) => handleUpdateCartItemNote(item.id, e.target.value)}
                        className="w-full bg-black/40 border border-white/10 text-[10px] p-2 rounded-xl outline-none focus:border-orange-500/40 text-yellow-300 font-bold"
                      />
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <p className="text-center py-8 text-gray-500 text-[10px] uppercase font-bold tracking-wider">Your bill is empty</p>
                  )}
                </div>

                {/* 2. INLINE ADD-ONS FOR CORRESPONDING ITEMS */}
                {showAddonsSection && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                    <p className="text-[9px] font-black uppercase text-gray-400">Add Add-ons to order:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => { triggerBeep('tap'); setKetchupAddon(!ketchupAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-600' : 'border-white/5 bg-transparent text-gray-300'}`}>
                        Ketchup (+₹10)
                      </button>
                      <button type="button" onClick={() => { triggerBeep('tap'); setOreganoAddon(!oreganoAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-600' : 'border-white/5 bg-transparent text-gray-300'}`}>
                        Oregano (+₹10)
                      </button>
                      <button type="button" onClick={() => { triggerBeep('tap'); setChiliFlakesAddon(!chiliFlakesAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'border-white/5 bg-transparent text-gray-300'}`}>
                        Chili Flakes (+₹10)
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. POS ORDER TYPE SELECTION */}
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                  <label className="text-[10px] font-black uppercase text-gray-400">Select Order Mode:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { triggerBeep('tap'); setFulfillmentType("delivery"); }}
                      className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "delivery" ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-sm' : 'border-white/5 text-gray-300 font-semibold'}`}
                    >
                      <span className="text-base">🛵</span>
                      <span className="text-[9px] font-black">Home Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { triggerBeep('tap'); setFulfillmentType("pickup"); }}
                      className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "pickup" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                    >
                      <span className="text-base">🛍️</span>
                      <span className="text-[9px] font-black">Self-Pickup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { triggerBeep('tap'); setFulfillmentType("table"); }}
                      className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "table" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                    >
                      <span className="text-base">🍽️</span>
                      <span className="text-[9px] font-black">Dine-In (Table)</span>
                    </button>
                  </div>
                </div>

                {/* 4. CONDITIONAL MODE INPUTS */}
                {fulfillmentType === "delivery" && (
                  <div className="space-y-4 mt-4 font-sans font-bold">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
                      <label className="text-[9px] font-black uppercase text-gray-400">Select Delivery Zone (KM):</label>
                      <div className="grid grid-cols-2 gap-2">
                        {DELIVERY_AREAS.map((area) => {
                          const isSelected = selectedArea.name === area.name;
                          return (
                            <button
                              type="button"
                              key={area.name}
                              onClick={() => { triggerBeep('tap'); setSelectedArea(area); }}
                              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 ${
                                isSelected 
                                  ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md font-black' 
                                  : 'border-white/5 bg-white/[0.01] text-neutral-300 hover:border-white/10'
                              }`}
                            >
                              <span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span>
                              <div className="flex justify-between items-center w-full mt-2 font-mono">
                                <span className="text-[8px] font-black text-neutral-300 font-bold">Fee: ₹{area.fee}</span>
                                <span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded text-yellow-400">Min: ₹{area.minFree}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/><h3 className="font-black uppercase text-[10px]">Delivery Address</h3></div>
                        <button type="button" onClick={handleDetectLocation} className="text-[8px] bg-green-600 hover:bg-green-700 text-white font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase">📍 Live GPS Location</button>
                      </div>
                      <textarea placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-semibold text-white outline-none resize-none h-16" />
                    </div>
                  </div>
                )}

                {fulfillmentType === "table" && (
                  <div className="mt-3 p-3 bg-neutral-900 rounded-xl border border-white/5 space-y-3 font-sans transition-all duration-300">
                    <p className="text-[10px] font-black uppercase text-orange-400">🪑 Choose Dine-In Table:</p>
                    <div className="space-y-1.5">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">For 2 People (3 Tables):</span>
                      <div className="grid grid-cols-3 gap-2">
                        {["Table 1", "Table 2", "Table 3"].map((t) => {
                          const isSelected = tableNumber === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => { triggerBeep('tap'); setTableNumber(t); }}
                              className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                                isSelected 
                                  ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-sm font-black' 
                                  : 'border-white/10 bg-white/5 text-neutral-300'
                              }`}
                            >
                              <span className="block">{t}</span>
                              <span className="text-[7.5px] text-gray-400 font-normal">👥 2 seats</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">For 4 People (3 Tables):</span>
                      <div className="grid grid-cols-3 gap-2">
                        {["Table 4", "Table 5", "Table 6"].map((t) => {
                          const isSelected = tableNumber === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => { triggerBeep('tap'); setTableNumber(t); }}
                              className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                                isSelected 
                                  ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-sm font-black' 
                                  : 'border-white/10 bg-white/5 text-neutral-300'
                              }`}
                            >
                              <span className="block">{t}</span>
                              <span className="text-[7.5px] text-gray-400 font-normal">👥👥 4 seats</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. ACTIVE CUSTOMER LOYALTY PROFILE DETAILS & DYNAMIC REWARDS REDEMPTION GRID */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 mt-4 font-sans font-bold">
                  <p className="text-[9px] font-black uppercase text-gray-400">Customer Loyalty Profile</p>
                  <div className="flex gap-2">
                    <input 
                      type="tel" 
                      maxLength={10}
                      placeholder="Guest 10-digit phone..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="bg-[#050505] border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-orange-500 font-bold flex-1 font-mono"
                    />
                    <button 
                      type="button"
                      onClick={handleCheckLoyalty}
                      className="bg-orange-500 hover:bg-orange-600 text-black text-xs font-black px-4 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0 font-sans"
                    >
                      <User size={12} /> Verify
                    </button>
                    {/* Search icon shifted inside Cart Drawer exactly adjacent to phone */}
                    <button
                      type="button"
                      onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(true); searchDbCustomers(''); }}
                      className="p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-yellow-300 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0"
                      title="Search Guest from Directory"
                    >
                      <Users size={16} />
                    </button>
                  </div>
                  
                  {customerPhone && (
                    <div className="mt-2 space-y-3">
                      <div className="bg-yellow-400/5 border border-yellow-400/20 p-2.5 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-yellow-300 uppercase leading-none">Net Points Balance</p>
                          <p className="text-[10px] text-gray-300 font-bold mt-1 font-sans">{customerName || 'Loyal Guest'}</p>
                        </div>
                        {/* Calculate net points remaining after committing points rewards in cart */}
                        <div className="text-right">
                          <span className="text-sm font-black text-yellow-400 font-mono">
                            {customerPoints - getTotalPointsRedeemedInCart()}
                          </span>
                          <span className="text-[8px] text-gray-400 block font-sans">Points Left</span>
                        </div>
                      </div>

                      {/* Dynamic rewards selector list */}
                      {loyaltyRules.length > 0 && (
                        <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                          <p className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Redeem Reward Item (रिडीम करें):</p>
                          <div className="grid grid-cols-2 gap-1.5 font-mono">
                            {loyaltyRules.map((rule) => {
                              const remainingPoints = customerPoints - getTotalPointsRedeemedInCart();
                              const isEligible = remainingPoints >= rule.pointsCost;

                              return (
                                <button
                                  key={rule.id}
                                  type="button"
                                  disabled={!isEligible}
                                  onClick={() => handleRedeemLoyaltyReward(rule)}
                                  className={`py-2 px-2 rounded-xl text-[9px] font-black uppercase border truncate transition-all ${
                                    isEligible 
                                      ? 'bg-yellow-400 border-yellow-500 text-black hover:bg-yellow-500 font-sans' 
                                      : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed font-sans'
                                  }`}
                                >
                                  🎁 Free {rule.rewardName} ({rule.pointsCost} Pts)
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 6. DISCOUNTS ADJUSTMENT */}
                <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 mt-4 font-sans font-bold">
                  <label className="text-[10px] font-black uppercase text-gray-400">POS Custom Discount (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 50"
                    value={customDiscount || ''}
                    onChange={(e) => setCustomDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono font-bold"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[10, 20, 50, 100].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => { triggerBeep('tap'); setCustomDiscount(val); }}
                        className="bg-neutral-900 text-[9px] text-orange-400 font-bold py-1 px-2.5 rounded-lg border border-white/5 hover:border-orange-500/30 transition-all font-mono"
                      >
                        -₹{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. ECO FRIENDLY PACKING CONTROL */}
                <div className="bg-green-950/10 border border-green-500/10 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200 mt-4 font-sans font-bold">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-green-500 uppercase tracking-tight">Eco-Friendly Pack</p>
                    <p className="text-[8px] text-gray-400">Skip single-use plastic spoon/tissue paper</p>
                  </div>
                  <input type="checkbox" checked={noCutlery} onChange={() => { triggerBeep('tap'); setNoCutlery(!noCutlery); }} className="w-4 h-4 accent-green-600" />
                </div>
              </div>

              {/* 8. POS BILL SUMMARY CARD */}
              <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white mt-4 font-mono font-bold">
                <div className="flex justify-between mb-1.5 text-xs"><span>Subtotal</span> <span>₹{getCartSubtotal()}</span></div>
                {getCartAddonsPrice() > 0 && <div className="flex justify-between mb-1.5 text-xs"><span>Add-ons</span> <span>+₹{getCartAddonsPrice()}</span></div>}
                {getTotalPointsRedeemedInCart() > 0 && (
                  <div className="flex justify-between mb-1.5 text-xs text-yellow-300 font-bold"><span>Redeemed Points Cost</span> <span>{getTotalPointsRedeemedInCart()} Points</span></div>
                )}
                {customDiscount > 0 && (
                  <div className="flex justify-between mb-1.5 text-xs text-green-200 font-bold"><span>Savings/Discount</span> <span>-₹{customDiscount}</span></div>
                )}
                {fulfillmentType === "delivery" && <div className="flex justify-between mb-3 text-xs opacity-90"><span>Delivery Charge</span> <span>₹{getDeliveryCharge()}</span></div>}
                <div className="h-px bg-white/20 mb-3" />
                <div className="flex justify-between font-black text-xl font-mono"><span>Grand Total</span> <span>₹{getTotalBillPrice()}</span></div>
              </div>

              {/* 9. POS PAYMENT TYPE SELECTION & PRINT SUBMIT */}
              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                <label className="text-[9px] font-black uppercase text-gray-400">Select Counter Payment Method:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { triggerBeep('tap'); setPaymentMethod("cash"); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "cash" ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                  >
                    <span className="text-sm">💵</span>
                    <span className="text-[9px] font-black">Cash </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerBeep('tap'); setPaymentMethod("upi"); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "upi" ? 'border-orange-500 bg-[#fffae6]/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                  >
                    <span className="text-sm">📱</span>
                    <span className="text-[9px] font-black">UPI QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { triggerBeep('tap'); setPaymentMethod("card"); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "card" ? 'border-orange-500 bg-[#fffae6]/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                  >
                    <span className="text-sm">💳</span>
                    <span className="text-[9px] font-black">Card</span>
                  </button>
                </div>

                {/* Dynamic KOT Chef Instructions */}
                <div className="space-y-1.5 mt-2">
                  <label className="text-[8px] font-black uppercase text-gray-400">Special Instructions for KOT</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Extra Spicy, Soft Base..." 
                    value={chefInstructions}
                    onChange={(e) => setChefInstructions(e.target.value)}
                    className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-semibold"
                  />
                </div>

                <button 
                  onClick={handlePlaceOrder} 
                  type="button" 
                  disabled={isSubmittingOrder} 
                  className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                >
                  {isSubmittingOrder ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Processing transaction... ⏳
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 justify-center">
                      <Printer size={16} />
                      <span>CONFIRM & PRINT BILL 🚀</span>
                    </span>
                  )}
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 3. CUSTOMER DIRECTORY / LOYALTY LOOKUP MODAL */}
      <AnimatePresence>
        {isCustomerModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[130] flex items-center justify-center p-4 backdrop-blur-md font-sans text-gray-100">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 w-full max-w-lg p-6 rounded-3xl text-left space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col justify-between"
            >
              {/* IF VIEWING TRANSACTION HISTORY PASSBOOK */}
              {viewingHistoryCustomer ? (
                <div className="flex flex-col h-full flex-grow space-y-4 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2 text-yellow-300">
                      <History size={16} />
                      <div>
                        <h3 className="text-sm font-black text-white">{viewingHistoryCustomer.name}'s Passbook</h3>
                        <p className="text-[8px] text-orange-500 font-bold uppercase tracking-wider">Points Earning & Redemption Ledger</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { triggerBeep('tap'); setViewingHistoryCustomer(null); setCustomerHistoryList([]); }}
                      className="p-1.5 bg-neutral-900 border border-white/5 text-gray-400 hover:text-white rounded-full"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin max-h-[400px]">
                    {customerHistoryList.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 py-10 uppercase tracking-widest font-black">No transactions found</p>
                    ) : (
                      customerHistoryList.map((h: any) => (
                        <div key={h.id} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/5">
                          <div>
                            <span className="text-xs font-black text-gray-200 block">{h.description}</span>
                            <span className="text-[8px] text-gray-500 block font-mono">
                              {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString('en-IN') : new Date(h.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono border ${
                            h.type === 'earn' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                            {h.type === 'earn' ? '+' : '-'}{h.points} Pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : editingCustomer ? (
                /* IF EDITING CUSTOMER PROFILE DIRECTLY FROM THE DIRECTORY */
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2 text-yellow-300">
                      <Edit size={16} />
                      <div>
                        <h3 className="text-sm font-black text-white">Edit Customer Profile</h3>
                        <p className="text-[8px] text-orange-500 font-bold uppercase tracking-wider">Modify loyalty properties</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { triggerBeep('tap'); setEditingCustomer(null); }}
                      className="p-1.5 bg-neutral-900 border border-white/5 text-gray-400 hover:text-white rounded-full"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  </div>

                  <div className="space-y-4 text-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400">Mobile Number (Non-editable)</label>
                        <input type="text" disabled value={editingCustomer.phone} className="w-full bg-neutral-900/50 border border-white/5 text-gray-500 p-2.5 rounded-xl text-xs font-mono font-bold cursor-not-allowed" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400">Customer Name</label>
                        <input type="text" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-bold" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400">Saved Delivery Address</label>
                        <input type="text" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-semibold" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400">Loyalty Points Balance</label>
                        <input type="number" value={editCustPoints} onChange={(e) => setEditCustPoints(Math.max(0, Number(e.target.value)))} className="w-full bg-black/40 border border-white/10 text-yellow-300 p-2.5 rounded-xl text-xs outline-none focus:border-orange-500 font-mono font-black" />
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleUpdateCustomerProfile}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-xl text-xs uppercase"
                    >
                      Save Profile Changes ➔
                    </button>
                  </div>
                </div>
              ) : (
                /* MAIN GUEST SEARCH DIRECTORY PANEL */
                <>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div>
                      <h3 className="text-sm font-black text-white">Customer Directory</h3>
                      <p className="text-[8px] text-orange-500 font-bold uppercase tracking-wider">Loyalty & Address Database Lookup</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(false); }}
                      className="p-1.5 bg-neutral-900 border border-white/5 text-gray-400 hover:text-white rounded-full"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Main Body */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                    
                    {/* Search Section */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Search Existing Member</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search by 10-digit Phone or Name..." 
                          value={customerSearchQuery}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                            searchDbCustomers(e.target.value);
                          }}
                          className="w-full bg-neutral-900 border border-white/5 rounded-xl py-2 px-9 text-xs text-white outline-none focus:border-orange-500 placeholder-gray-500 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Search Results list with Action controls */}
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                      {isSearchingCustomer ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="animate-spin text-orange-500" size={18} />
                        </div>
                      ) : searchedCustomers.length === 0 ? (
                        <p className="text-center text-xs text-gray-500 py-3 uppercase tracking-widest font-black">No matches found</p>
                      ) : (
                        searchedCustomers.map((cust) => (
                          <div 
                            key={cust.id} 
                            className="bg-neutral-900 border border-white/5 p-3 rounded-2xl flex flex-col gap-2.5 hover:border-orange-500/50 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <span className="font-bold text-xs text-white block">{cust.name}</span>
                                <span className="text-[9px] text-gray-400 font-mono block">📞 {cust.phone} {cust.address ? `| 📍 ${cust.address.substring(0, 20)}...` : ''}</span>
                              </div>
                              <span className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-[9px] font-black px-2 py-0.5 rounded-full font-mono">{cust.points || 0} Pts</span>
                            </div>

                            {/* Operational Actions */}
                            <div className="flex gap-2 border-t border-white/5 pt-2">
                              <button 
                                type="button" 
                                onClick={() => handleSelectCustomer(cust)}
                                className="flex-1 bg-green-600/10 hover:bg-green-600 text-green-400 hover:text-white border border-green-500/20 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                              >
                                Select ➔
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleStartEditProfile(cust)}
                                className="bg-neutral-850 hover:bg-neutral-800 text-gray-300 border border-white/5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all"
                              >
                                ✍️ Edit
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleLoadCustomerHistory(cust)}
                                className="bg-neutral-850 hover:bg-neutral-800 text-yellow-400 border border-white/5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all"
                              >
                                📜 Passbook
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Add Form Section */}
                    <div className="border-t border-white/5 pt-4 space-y-3">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Or Register New Guest Profile</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-gray-400">Mobile Number (10 digit)</label>
                          <input 
                            type="tel" 
                            maxLength={10}
                            placeholder="e.g. 9876543210"
                            value={newCustPhone}
                            onChange={(e) => setNewCustPhone(e.target.value)}
                            className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-gray-400">Customer Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Ramesh ji"
                            value={newCustName}
                            onChange={(e) => setNewCustName(e.target.value)}
                            className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-bold"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black uppercase text-gray-400">Delivery Address (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. House No. 12, Mohandra"
                          value={newCustAddress}
                          onChange={(e) => setNewCustAddress(e.target.value)}
                          className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Save Operations */}
                  <div className="border-t border-white/5 pt-3 flex gap-2">
                    <button 
                      type="button" 
                      onClick={handleSaveNewCustomer}
                      className="flex-grow bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow animate-none"
                    >
                      Save & Select Guest ➔
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(false); }}
                      className="bg-neutral-900 border border-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. VARIATIONS AND PORTIONS SELECTION CUSTOMIZATION POPUP MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 w-full max-w-md p-6 rounded-3xl text-left space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                  <h3 className="text-sm font-black text-white">{selectedProduct.name}</h3>
                  <p className="text-[9px] text-orange-500 font-bold uppercase tracking-wider">Customize Counter Order</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setCustomizerChefNote(""); }}
                  className="p-1.5 bg-neutral-900 border border-white/5 rounded-full text-red-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">1. Select Portion Size:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct.variants || {}).map(([size, price]: any) => (
                    <button 
                      type="button" 
                      key={size} 
                      onClick={() => { triggerBeep('tap'); setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} 
                      className={`p-3 rounded-xl flex flex-col items-center border transition-all duration-200 ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-500 font-black' : 'bg-neutral-900 border-white/5 text-gray-400'}`}
                    >
                      <span className="capitalize text-[11px] font-black">{size}</span>
                      <span className="font-black text-xs mt-1 text-white font-mono">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {normalPizzaSize && (selectedProduct.category === "Special Pizza" || selectedProduct.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">2. Select Premium Toppings:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]: any) => {
                      const isSelected = !!normalPizzaAddons[addon];
                      return (
                        <button
                          type="button"
                          key={addon}
                          onClick={() => { triggerBeep('tap'); setNormalPizzaAddons(prev => ({ ...prev, [addon]: !prev[addon] })); }}
                          className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-bold transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'border-white/5 bg-neutral-900 text-gray-400'}`}
                        >
                          <span>{addon}</span>
                          <span className="text-orange-500 font-black font-mono">+₹{cost}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t border-white/5 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">3. Special Cooking instructions:</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_INSTRUCTION_TAGS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => { triggerBeep('tap'); setCustomizerChefNote(prev => prev ? `${prev}, ${tag}` : tag); }}
                      className="text-[9px] font-bold py-1 px-2 rounded-full border border-white/5 bg-neutral-900 text-gray-300 hover:border-orange-500 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  placeholder="e.g. Well baked crust, extra cheese toppings..." 
                  value={customizerChefNote} 
                  onChange={(e) => setCustomizerChefNote(e.target.value)} 
                  className="w-full text-xs p-3 rounded-xl bg-neutral-900 border border-white/5 text-white outline-none focus:border-orange-500 font-semibold"
                />
              </div>

              <div className="border-t border-white/5 pt-3 flex gap-2">
                <button 
                  type="button" 
                  onClick={handleAddCustomizedItemToCart}
                  className="flex-grow bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow"
                >
                  Confirm Portion & Add ➔
                </button>
                <button 
                  type="button" 
                  onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setCustomizerChefNote(""); }}
                  className="bg-neutral-900 border border-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
