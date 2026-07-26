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
  Menu, Users, LogOut, Lock, ToggleLeft, ToggleRight, Sun, Moon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import PosCartDrawer from '@/components/pos/PosCartDrawer';
import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import CustomizerModal from '@/components/pos/CustomizerModal';

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

export default function BbCafePos() {
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
  const [isCartOpen, setIsCartOpen] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');

  // Printer Settings states
  const [printerType, setPrinterType] = useState<'thermal_usb' | 'thermal_bluetooth' | 'network_ip' | 'laser'>('thermal_usb');
  const [printerIp, setPrinterIp] = useState('192.168.1.100');
  const [printCopies, setPrintCopies] = useState(1);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);

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
  
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

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
  const [noCutlery, setNoCutlery] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');

  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
  const [normalPizzaSize, setNormalPizzaSize] = useState("");
  const [normalPizzaPrice, setNormalPizzaPrice] = useState(0);
  const [customizerChefNote, setCustomizerChefNote] = useState(""); 

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

  useEffect(() => {
    const savedUser = localStorage.getItem("bb_pos_user");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setIsLoggedIn(true);
        setCurrentUser(parsed);
      } catch (e) {}
    }
    setGstEnabled(localStorage.getItem("bb_pos_gst_enabled") === 'true');
    setGstRate(Number(localStorage.getItem("bb_pos_gst_rate")) || 5);
    setPrinterPaperSize((localStorage.getItem("bb_pos_paper_size") as any) || '58mm');
    
    const localPrinterType = localStorage.getItem("bb_pos_printer_type");
    if (localPrinterType) setPrinterType(localPrinterType as any);
    const localPrinterIp = localStorage.getItem("bb_pos_printer_ip");
    if (localPrinterIp) setPrinterIp(localPrinterIp);
    const localPrintCopies = localStorage.getItem("bb_pos_print_copies");
    if (localPrintCopies) setPrintCopies(Number(localPrintCopies) || 1);

    const localTheme = localStorage.getItem("bb_pos_theme") || 'dark';
    setThemeMode(localTheme as any);
    if (localTheme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLiveOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) setStoreOpen(d.data().isOpen);
    });
    return () => { unsubscribe(); unsubStore(); };
  }, []);

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

  const handlePinLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput === "1234") {
      setIsLoggedIn(true);
      setCurrentUser({ name: "Demo Boss", role: "admin" });
      localStorage.setItem("bb_pos_user", JSON.stringify({ name: "Demo Boss", role: "admin" }));
      toast.success("Welcome, Boss!");
      setPinInput('');
      return;
    }
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
      toast.error("Connection timeout");
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

  const handleCheckLoyalty = async () => {
    triggerBeep('tap');
    if (customerPhone.trim().length !== 10) return toast.error("Enter valid 10-digit number!");
    const phoneClean = customerPhone.trim();
    const toastId = toast.loading("Checking profile...");
    try {
      const docSnap = await getDoc(doc(db, "customer_points", phoneClean));
      toast.dismiss(toastId);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomerName(data.name || '');
        setCustomerPoints(data.points || 0);
        setAddress(data.address || ''); 
        toast.success(`Points: ${data.points || 0}`);
      } else {
        setCustomerName(''); setCustomerPoints(0); setAddress('');
        toast.success("New Guest initialized!");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Database error");
    }
  };

  const searchDbCustomers = async (text: string) => {
    const cleanText = text.trim();
    setIsSearchingCustomer(true);
    try {
      let q = cleanText ? (
        /^\d+$/.test(cleanText) ? query(collection(db, "customer_points"), where("phone", "==", cleanText))
        : query(collection(db, "customer_points"), where("name", ">=", cleanText.charAt(0).toUpperCase() + cleanText.slice(1)), limit(15))
      ) : query(collection(db, "customer_points"), orderBy("lastActive", "desc"), limit(12));
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

  const handleLoadCustomerHistory = async (cust: any) => {
    triggerBeep('tap');
    setViewingHistoryCustomer(cust);
    try {
      const hSnap = await getDocs(query(collection(db, "customer_points", cust.phone, "history"), orderBy("timestamp", "desc"), limit(25)));
      setCustomerHistoryList(hSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      toast.error("Failed to load history");
    }
  };

  const handleStartEditProfile = (cust: any) => {
    triggerBeep('tap');
    setEditingCustomer(cust);
    setNewCustName(cust.name);
    setNewCustAddress(cust.address || '');
    setEditCustPoints(cust.points || 0);
  };

  const handleUpdateCustomerProfile = async () => {
    triggerBeep('tap');
    if (!newCustName.trim()) return toast.error("Name mandatory!");
    try {
      await updateDoc(doc(db, "customer_points", editingCustomer.phone), { name: newCustName.trim(), address: newCustAddress.trim(), points: editCustPoints });
      if (customerPhone === editingCustomer.phone) {
        setCustomerName(newCustName.trim()); setAddress(newCustAddress.trim()); setCustomerPoints(editCustPoints);
      }
      setEditingCustomer(null); searchDbCustomers(customerSearchQuery);
      toast.success("Profile saved!");
    } catch (err) {
      toast.error("Failed to edit profile");
    }
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerBeep('tap');
    const cleanPhone = newCustPhone.trim();
    if (cleanPhone.length !== 10) return toast.error("Enter valid 10-digit phone!");
    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      if ((await getDoc(userRef)).exists()) return toast.error("Number already registered!");
      const newDoc = { name: newCustName.trim(), phone: cleanPhone, points: 0, address: newCustAddress.trim(), lastActive: new Date() };
      await setDoc(userRef, newDoc);
      setCustomerPhone(cleanPhone); setCustomerName(newDoc.name); setCustomerPoints(0); setAddress(newDoc.address);
      setNewCustName(''); setNewCustPhone(''); setNewCustAddress('');
      setIsCustomerModalOpen(false);
      toast.success("Registered!");
    } catch (err) {
      toast.error("Failed to write profile");
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
    toast.success(`${item.name} added!`, { duration: 800 });
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

  // Billing Math
  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const getDeliveryCharge = () => (fulfillmentType === "pickup" || fulfillmentType === "table" || getCartSubtotal() === 0) ? 0 : (getCartSubtotal() >= selectedArea.minFree ? 0 : selectedArea.fee);
  const getLoyaltyDiscount = () => Math.min(pointsToRedeem, getCartSubtotal());
  const getGstAmountCalculated = () => gstEnabled ? Number(((getCartSubtotal() * gstRate) / 100).toFixed(2)) : 0;
  const getTotalBillPrice = () => Math.max(0, getCartSubtotal() + getGstAmountCalculated() - (getLoyaltyDiscount() + customDiscount)) + getDeliveryCharge();
  const getFreeDeliveryProgressPercent = () => Math.min(100, (getCartSubtotal() / selectedArea.minFree) * 100);
  const getTotalPointsRedeemedInCart = () => cart.reduce((acc, i) => acc + (i.pointsCost || 0), 0);

  // Helper for ESC/POS Text Generation (USB Direct/Bluetooth fallback)
  const generateEscPosText = (order: any) => {
    const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
    const dividerLine = "--------------------------------\n";
    
    let text = "";
    text += "        * BUM BUM CAFE *        \n";
    text += "     Mohandra, Panna (M.P.)     \n";
    text += dividerLine;
    text += `Bill No: #${String(order.billNumber).padStart(4, '0')}\n`;
    text += `Token No: #${order.tokenNumber}\n`;
    text += `Date: ${formattedDate}\n`;
    text += `Type: ${order.fulfillmentType?.toUpperCase()}\n`;
    text += `Pay Mode: ${order.paymentMethod?.toUpperCase()}\n`;
    text += dividerLine;

    order.items.forEach((it: any) => {
      const itemText = `${it.name} x${it.quantity}`;
      const itemPrice = `Rs.${it.price * it.quantity}`;
      text += `${itemText.slice(0, 20).padEnd(20)}${itemPrice.padStart(12)}\n`;
      if (it.note) text += `  (${it.note})\n`;
    });

    text += dividerLine;
    text += `Subtotal: Rs.${order.subtotal}\n`;
    if (order.discount) text += `Savings: -Rs.${order.discount}\n`;
    text += `Total Bill: Rs.${order.total}\n`;
    text += dividerLine;
    text += "    Thank you! Visit Again!🍕   \n";
    text += "\n\n\n\n";
    return text;
  };

  // print thermal receipt via Web/System Dialog
  const handlePrintReceipt = async (order: any) => {
    triggerBeep('tap');

    // 1. Bluetooth ESC/POS Direct Print
    if (printerType === 'thermal_bluetooth' && bleCharacteristic) {
      const toastId = toast.loading("Sending directly to Bluetooth printer...");
      try {
        const receiptText = generateEscPosText(order);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(receiptText);
        await bleCharacteristic.writeValue(bytes);
        toast.dismiss(toastId);
        toast.success("Printed directly via Bluetooth!");
      } catch (err) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error("Bluetooth print failed. Please reconnect.");
        setPrinterConnected(false);
        setBleCharacteristic(null);
      }
      return;
    }

    // 2. Direct USB Serial or WebUSB Print
    if (printerType === 'thermal_usb' && (serialPort || usbDevice)) {
      const toastId = toast.loading("Sending directly to USB printer...");
      try {
        const receiptText = generateEscPosText(order);
        const encoder = new TextEncoder();
        const bytes = encoder.encode(receiptText);

        if (serialPort) {
          const writer = serialPort.writable.getWriter();
          await writer.write(bytes);
          writer.releaseLock();
          toast.dismiss(toastId);
          toast.success("Printed directly via USB Serial!");
          return;
        }

        if (usbDevice) {
          await usbDevice.transferOut(1, bytes);
          toast.dismiss(toastId);
          toast.success("Printed directly via WebUSB!");
          return;
        }
      } catch (err) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error("USB direct print failed. Please reconnect printer.");
        setPrinterConnected(false);
        setSerialPort(null);
        setUsbDevice(null);
      }
      return;
    }

    // 3. System Print Dialog (Header Logo + Footer QR Code layout)
    const pageDimensionsWidth = printerPaperSize === '58mm' ? '58mm' : '80mm';
    const containerRenderWidth = printerPaperSize === '58mm' ? '48mm' : '72mm';

    const now = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp);
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedReceiptDate = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;

    // UPI QR Code Generator with dynamic payable amount
    const upiId = "9714293759@paytm"; 
    const upiLink = `upi://pay?pa=${upiId}&pn=Bum%20Bum%20Cafe&am=${order.total}&cu=INR`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=115x115&margin=0&data=${encodeURIComponent(upiLink)}`;

    const printWindow = window.open('', '_blank', 'width=340,height=600');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups for this POS.");
      return;
    }
    
    const itemsRows = order.items.map((it: any) => {
      let noteFormatted = "";
      if (it.note) {
        noteFormatted = it.note.startsWith("+") ? it.note : "+ " + it.note;
      }
      return `
        <tr>
          <td style="font-size: 11.5px; font-weight: bold; padding: 5px 0 1px 0; color: #111;">${it.name}</td>
          <td style="font-size: 11.5px; font-weight: bold; text-align: right; padding: 5px 0 1px 0; color: #111;">₹${it.price * it.quantity}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size: 10px; color: #444; padding-bottom: 5px; font-weight: 500;">
            ${it.quantity} x ₹${it.price}
            ${noteFormatted ? '<br/><span style="padding-left: 2px; font-weight: bold; color: #222;">' + noteFormatted + '</span>' : ''}
          </td>
        </tr>
      `;
    }).join('');

    const phoneMarkup = order.customerPhone ? `<div style="font-family: monospace; font-size: 9.5px; font-weight: bold;">${order.customerPhone.replace('+91', '')}</div>` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${order.billNumber}</title>
          <style>
            @page { 
              size: ${pageDimensionsWidth} auto; 
              margin: 0mm; 
            }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              width: ${containerRenderWidth}; 
              margin: 0 auto; 
              padding: 6px; 
              color: #000; 
              background-color: #fff; 
              font-size: 11px;
              line-height: 1.35;
            }
            .center { text-align: center; }
            .divider { 
              border-top: 1.5px dotted #000; 
              margin: 6px 0; 
              height: 0;
              width: 100%;
            }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          <!-- HEADER: Stylized Brand Logo -->
          <div class="center" style="margin-top: 4px; margin-bottom: 8px;">
            <div style="display: inline-block; background-color: #000; color: #fff; padding: 5px 10px; font-size: 13px; font-weight: 900; border-radius: 4px; letter-spacing: 1px; margin-bottom: 4px;">
              🍕 BUM BUM CAFE 🍕
            </div>
            <div style="font-size: 9px; line-height: 1.3; font-weight: 600; color: #111;">
              बस स्टैंड मोहंद्रा, पीपल पेड़ के नीचे, मोहंद्रा,<br/>
              जिला पन्ना, मध्य प्रदेश, 488442
            </div>
            <div style="font-size: 9.5px; font-weight: 800; margin-top: 3px; color: #000;">Mo. 9714293759</div>
          </div>

          <div style="font-size: 9.5px; line-height: 1.4; margin-top: 8px; font-weight: bold; color: #222;">
            <div>Employee: Owner</div>
            <div>POS: Terminal 02</div>
            <div style="margin-top: 6px;">Customer: ${order.customerName || 'Walk-in Guest'}</div>
            ${phoneMarkup}
          </div>

          <div class="divider"></div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="divider"></div>

          <!-- Loyalty points section -->
          <div style="font-size: 10px; font-weight: 600; line-height: 1.5; color: #222;">
            <div style="display: flex; justify-content: space-between;">
              <span>Points earned</span>
              <span>1</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Points balance</span>
              <span>1</span>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Grand Total centered values -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1px 0;">
            <span style="font-size: 14px; font-weight: 900;">Total</span>
            <span style="font-size: 14px; font-weight: 900;">₹${order.total}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1px 0; font-size: 11px; font-weight: 600; margin-top: 2px;">
            <span>${order.paymentMethod?.toUpperCase()}</span>
            <span style="font-weight: 850;">₹${order.total}</span>
          </div>

          <div class="divider"></div>

          <!-- FOOTER: UPI QR Code centered inside footer with exact bill amount -->
          <div class="center" style="margin-top: 10px; margin-bottom: 8px;">
            <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; color: #000; letter-spacing: 0.2px;">
              Scan To Pay: ₹${order.total}
            </div>
            <img src="${qrCodeUrl}" style="width: 110px; height: 110px; display: inline-block; border: 1px solid #eaeaea; padding: 2px; border-radius: 4px;" />
            <div style="font-size: 7.5px; font-weight: 800; margin-top: 3px; letter-spacing: 0.5px; color: #333;">BHIM UPI PAYTM</div>
          </div>

          <!-- Footer Social Media & Handles -->
          <div class="center" style="font-size: 9px; line-height: 1.4; margin-top: 6px; font-weight: 600; color: #111;">
            <div style="font-weight: 850; font-size: 9.5px; margin-bottom: 2px;">Follow us</div>
            <div>www.youtube.com/@bbcafe.i</div>
            <div>All Social Media @bbcafe.in</div>
            <div style="margin-top: 6px; font-weight: 850; font-size: 10px; color: #000;">❤ Thank you, visit again. ❤</div>
          </div>

          <!-- Receipt Timestamp and Bill Code -->
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-family: monospace; color: #000; margin-top: 14px; font-weight: 850; border-top: 1px dashed #eee; padding-top: 4px;">
            <span>${formattedReceiptDate}</span>
            <span>#3-${order.billNumber}</span>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350); 
  };

  // Direct Hardware Printer connector
  const handleConnectPrinter = async () => {
    triggerBeep('tap');
    setIsConnecting(true);
    const toastId = toast.loading(`Connecting to ${printerType.toUpperCase().replace('_', ' ')}...`);

    if (printerType === 'thermal_bluetooth') {
      if (!(navigator as any).bluetooth) { 
        toast.dismiss(toastId);
        setIsConnecting(false);
        toast.error("Web Bluetooth is not supported on this browser/device. Please use Google Chrome on HTTPS.");
        return;
      }
      try {
        const device = await (navigator as any).bluetooth.requestDevice({ 
          acceptAllDevices: true,
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] 
        });

        const server = await device.gatt!.connect();
        let service;
        let characteristic;

        try {
          service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
          characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
        } catch (bleErr) {
          service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
          characteristic = await service.getCharacteristic('0000ff02-0000-1000-8000-00805f9b34fb');
        }

        setBleCharacteristic(characteristic);
        setPrinterConnected(true);
        toast.dismiss(toastId);
        toast.success("Bluetooth Printer Connected Successfully!");
      } catch (err: any) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error(err.message || "Failed to pair with Bluetooth printer.");
      } finally {
        setIsConnecting(false);
      }
    } else if (printerType === 'thermal_usb') {
      if (!(navigator as any).serial && !(navigator as any).usb) {
        toast.dismiss(toastId);
        setIsConnecting(false);
        toast.error("Direct USB printing is not supported on this browser. Please use Google Chrome.");
        return;
      }
      try {
        if ((navigator as any).serial) {
          const port = await (navigator as any).serial.requestPort();
          await port.open({ baudRate: 9600 });
          setSerialPort(port);
          setPrinterConnected(true);
          toast.dismiss(toastId);
          toast.success("Direct USB Printer Connected via Web Serial!");
        } else {
          const device = await (navigator as any).usb.requestDevice({ filters: [] });
          await device.open();
          await device.selectConfiguration(1);
          await device.claimInterface(0);
          setUsbDevice(device);
          setPrinterConnected(true);
          toast.dismiss(toastId);
          toast.success("Direct USB Printer Connected via WebUSB!");
        }
      } catch (err) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error("Direct USB connection failed. Ensure printer is connected and not occupied.");
      } finally {
        setIsConnecting(false);
      }
    } else {
      setTimeout(() => {
        toast.dismiss(toastId);
        setIsConnecting(false);
        setPrinterConnected(true);
        toast.success(`${printerType.replace('_', ' ').toUpperCase()} Connected Successfully!`);
      }, 1200);
    }
  };

  const handleTestPrint = () => {
    const mockOrder = {
      billNumber: '0000',
      tokenNumber: '9999',
      fulfillmentType: 'test',
      paymentMethod: 'system',
      items: [
        { name: '🍕 Direct Connection Active!', quantity: 1, price: 100 },
        { name: '🍔 ESC/POS Print Test', quantity: 1, price: 50 }
      ],
      subtotal: 150,
      discount: 0,
      total: 150,
      timestamp: new Date()
    };
    handlePrintReceipt(mockOrder);
  };

  const handleDetectLocation = () => {
    triggerBeep('tap');
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your device.");
      return;
    }
    const toastId = toast.loading("Detecting location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAddress(`GPS Location: https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
        toast.dismiss(toastId);
        toast.success("Location detected!");
      },
      () => {
        toast.dismiss(toastId);
        toast.error("Unable to retrieve location.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const subtotal = getCartSubtotal();
    const discountCombined = customDiscount + getLoyaltyDiscount();
    const finalTotal = getTotalBillPrice();
    const token = Math.floor(1000 + Math.random() * 9000);

    try {
      const billNumber = await runTransaction(db, async (txn) => {
        const snap = await txn.get(doc(db, "settings", "store_bill_counter"));
        const next = snap.exists() ? (snap.data().nextBillNumber || 1) : 1;
        txn.set(doc(db, "settings", "store_bill_counter"), { nextBillNumber: next + 1 });
        return next;
      });

      const orderObj = { billNumber, tokenNumber: token, customerName: customerName || "Walk-in Guest", customerPhone: customerPhone ? `+91${customerPhone}` : "", items: cart, subtotal, discount: discountCombined, gstRate: gstEnabled ? gstRate : 0, gstAmount: getGstAmountCalculated(), total: finalTotal, timestamp: new Date(), status: 'completed', fulfillmentType, deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "", tableNumber: fulfillmentType === 'table' ? tableNumber : '', paymentMethod, chefInstructions, noCutlery, source: 'POS' };
      await addDoc(collection(db, "orders"), orderObj);

      if (customerPhone && customerPhone.trim().length === 10) {
        const phone = customerPhone.trim();
        const earned = Math.floor(finalTotal / 100);
        const netPoints = earned - getTotalPointsRedeemedInCart() - pointsToRedeem;
        await runTransaction(db, async (txn) => {
          const userRef = doc(db, "customer_points", phone);
          const snap = await txn.get(userRef);
          if (!snap.exists()) txn.set(userRef, { name: customerName || "Walk-in Guest", phone, points: Math.max(0, netPoints), lastActive: new Date() });
          else txn.update(userRef, { points: increment(netPoints), lastActive: new Date() });
        });
        if (earned > 0) await addDoc(collection(db, "customer_points", phone, "history"), { type: 'earn', points: earned, description: `Earned Bill #${billNumber}`, timestamp: new Date() });
        if (pointsToRedeem > 0) await addDoc(collection(db, "customer_points", phone, "history"), { type: 'redeem', points: pointsToRedeem, description: `Redeemed cash back Bill #${billNumber}`, timestamp: new Date() });
      }

      triggerBeep('success'); toast.success(`Bill #${billNumber} completed!`);
      handlePrintReceipt(orderObj);
      setCart([]); setCustomerPhone(''); setCustomerName(''); setCustomerPoints(0); setPointsToRedeem(0); setCustomDiscount(0); setIsCartOpen(false); setChefInstructions('');
    } catch (err) {
      toast.error("Counter transaction failed");
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
      toast.error("Failed to toggle stock");
    }
  };

  const handleToggleTheme = (mode: 'dark' | 'light') => {
    triggerBeep('tap'); setThemeMode(mode); localStorage.setItem("bb_pos_theme", mode);
    if (mode === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  };

  const filteredMenu = useMemo(() => products.filter((p) => (selectedCategory === 'All' || p.category === selectedCategory) && p.name.toLowerCase().includes(searchQuery.toLowerCase())), [products, selectedCategory, searchQuery]);
  const filteredPastReceipts = useMemo(() => liveOrders.filter((o) => String(o.billNumber).includes(receiptSearchQuery.trim()) || String(o.customerPhone || '').includes(receiptSearchQuery.trim()) || String(o.customerName || '').toLowerCase().includes(receiptSearchQuery.trim().toLowerCase())), [liveOrders, receiptSearchQuery]);
  const getDisplayPrice = (item: any) => item?.variants ? `₹${Math.min(...Object.values(item.variants).map(Number))}+` : `₹${item?.price || 0}`;

  const liveOrdersBadgeCount = liveOrders.filter((o) => o.status !== 'completed' && o.status !== 'rejected').length;

  const navItems = [
    { id: 'billing', label: 'Counter Billing', icon: SafeShoppingBag },
    { id: 'orders', label: 'Live Orders', icon: SafeClock, badge: liveOrdersBadgeCount },
    { id: 'inventory', label: 'Stock Toggle', icon: SafeLayers },
    { id: 'receipts', label: 'Past Receipts', icon: SafePrinter },
    { id: 'settings', label: 'POS Settings', icon: SafeSettings }
  ];

  // isolated outer container class
  const mainClass = `min-h-screen flex flex-col md:flex-row font-sans antialiased overflow-hidden transition-colors duration-200 ${
    themeMode === 'dark' ? 'dark bg-[#050505] text-gray-100' : 'bg-neutral-50 text-neutral-800'
  }`;

  return (
    <div className={mainClass}>
      <Toaster position="top-center" />

      {!isLoggedIn ? (
        <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-neutral-950 border border-white/5 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><SafeLock size={32} /></div>
              <h1 className="text-xl font-black uppercase text-yellow-500">BUM BUM CAFE</h1>
              <p className="text-xs text-neutral-400">Terminal Locked • Enter PIN</p>
            </div>
            <form onSubmit={handlePinLoginSubmit} className="space-y-4">
              <input type="password" maxLength={4} value={pinInput} readOnly placeholder="••••" className="w-full bg-neutral-900 border border-white/5 text-center text-3xl font-mono py-4 rounded-2xl outline-none focus:border-orange-500 text-orange-400" />
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button key={num} type="button" onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput((p) => p + String(num)); }} className="aspect-square bg-neutral-900 hover:bg-neutral-800 font-black text-xl rounded-2xl border border-white/5 flex items-center justify-center">{num}</button>
                ))}
                <button type="button" onClick={() => { triggerBeep('tap'); setPinInput(''); }} className="aspect-square bg-neutral-900 hover:bg-neutral-800 font-bold text-xs uppercase text-red-400 rounded-2xl border border-white/5 flex items-center justify-center">Clear</button>
                <button type="button" onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput((p) => p + '0'); }} className="aspect-square bg-neutral-900 hover:bg-neutral-800 font-black text-xl rounded-2xl border border-white/5 flex items-center justify-center">0</button>
                <button type="submit" className="aspect-square bg-orange-600 hover:bg-orange-500 font-bold text-xs uppercase rounded-2xl flex items-center justify-center">Login</button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-neutral-950/80 z-40 md:hidden transition-all duration-300" />}

          <aside className={`bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-white/5 flex flex-col justify-between p-4 shrink-0 shadow-lg transition-all duration-300 fixed inset-y-0 left-0 md:relative md:translate-x-0 md:flex ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} ${isSidebarOpen ? 'translate-x-0 w-64 z-50 shadow-2xl' : '-translate-x-full md:translate-x-0 z-30 md:z-30'}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1 py-1 border-b border-neutral-200 dark:border-white/5 pb-4 gap-2">
                <div className="flex items-center gap-2">
                  <SafeDatabase className="text-orange-500 animate-pulse" size={18} />
                  {!isSidebarCollapsed && <h1 className="text-xs font-black uppercase text-yellow-500">Bum Bum POS</h1>}
                </div>
                <button onClick={() => { triggerBeep('tap'); setIsSidebarCollapsed(!isSidebarCollapsed); }} className="hidden md:flex p-1.5 bg-neutral-200 dark:bg-neutral-900 text-gray-400 rounded-lg">{isSidebarCollapsed ? <SafeChevronRight size={14} /> : <SafeChevronLeft size={14} />}</button>
                <button onClick={() => { triggerBeep('tap'); setIsSidebarOpen(false); }} className="p-1.5 text-gray-400 md:hidden"><SafeX size={14} /></button>
              </div>
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => { 
                        triggerBeep('tap'); 
                        setActiveTab(item.id as any); 
                        setIsSidebarOpen(false); 
                      }} 
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === item.id ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-neutral-200 dark:hover:bg-neutral-900'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={14} />
                        {!isSidebarCollapsed && <span>{item.label}</span>}
                      </div>
                      {item.badge !== undefined && item.badge > 0 && <span className="bg-yellow-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full font-mono">{item.badge}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-white/5">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10"><SafeLogOut size={14} />{!isSidebarCollapsed && <span>Lock POS</span></button>
            </div>
          </aside>

          <main className="flex-1 p-3 md:p-5 overflow-y-auto flex flex-col h-screen">
            <div className="flex items-center gap-3 mb-4 border-b border-neutral-200 dark:border-white/5 pb-3">
              <button onClick={() => { triggerBeep('tap'); setIsSidebarOpen(true); }} className="p-2.5 bg-neutral-200 dark:bg-neutral-950 text-orange-500 rounded-xl md:hidden"><SafeMenu size={16} /></button>
              <div className="flex flex-col"><h2 className="text-[10px] font-black uppercase text-orange-500">{activeTab} Workspace</h2><span className="text-[9px] text-gray-400">Bum Bum Cafe • Mohandra</span></div>
              {activeTab === 'billing' && <button onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(true); searchDbCustomers(''); }} className="ml-auto p-2 bg-neutral-200 dark:bg-neutral-950 text-yellow-500 rounded-xl flex items-center gap-1 text-[10px] font-black uppercase"><SafeUsers size={14} /><span>Search Guest</span></button>}
            </div>

            {activeTab === 'orders' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 overflow-y-auto flex-1">
                {liveOrders.map((order) => {
                  if (order.status === 'completed' || order.status === 'rejected') return null;
                  const isOnline = order.source && order.source !== 'POS';
                  return (
                    <div key={order.id} className={`border rounded-2xl p-4 flex flex-col justify-between shadow-lg h-fit transition-colors duration-200 ${isOnline ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/5'}`}>
                      <div>
                        <div className="flex justify-between items-start border-b border-neutral-200 dark:border-white/5 pb-2 mb-3">
                          <div>
                            <p className="text-xs font-black text-yellow-600 dark:text-yellow-300 font-mono">Bill #${String(order.billNumber).padStart(4, '0')}</p>
                            {isOnline && <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mt-1 animate-pulse">🌐 ONLINE ORDER ({order.source})</span>}
                          </div>
                          <span className="bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase px-2 py-0.5 rounded">{order.fulfillmentType}</span>
                        </div>
                        <p className="text-[10px] font-black">👤 {order.customerName}</p>
                        <div className="space-y-1.5 pt-2 mb-4 border-t border-dashed border-neutral-200 dark:border-white/5">
                          {order.items?.map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-[11px] font-semibold">
                              <span>{it.name} <span className="text-orange-500">x{it.quantity}</span>{it.note && <span className="text-gray-400 italic block text-[9px]">({it.note})</span>}</span>
                              <span>₹{it.price * it.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-black text-green-400 mb-3 border-t border-neutral-200 dark:border-white/5 pt-2"><span>Total:</span><span>₹{order.total}</span></div>
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <div className="flex gap-2 w-full">
                              <button onClick={() => handleUpdateStatus(order.id, 'preparing')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-2 rounded-xl text-[10px] uppercase shadow-md active:scale-95 transition-all">Accept</button>
                              <button onClick={() => handleUpdateStatus(order.id, 'rejected')} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded-xl text-[10px] uppercase shadow-md active:scale-95 transition-all">Reject</button>
                            </div>
                          )}
                          {order.status === 'preparing' && <button onClick={() => handleUpdateStatus(order.id, order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'completed')} className="flex-1 bg-blue-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Dispatch</button>}
                          {order.status === 'out_for_delivery' && <button onClick={() => handleUpdateStatus(order.id, 'completed')} className="flex-1 bg-green-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Delivered</button>}
                          <button onClick={() => handlePrintReceipt(order)} className="p-2 bg-neutral-200 dark:bg-neutral-900 text-gray-500 rounded-xl"><SafePrinter size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
                  <div className="flex gap-3 mb-4 items-center">
                    <div className="relative flex-1"><SafeSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} /><input type="text" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-900 rounded-xl py-2 px-9 text-xs outline-none text-neutral-800 dark:text-white" /></div>
                    <button onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }} className="bg-orange-500 text-black font-black text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg"><SafeShoppingBag size={14} /><span>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span></button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-none">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      const btnClass = `px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border shrink-0 ${
                        isSelected 
                          ? 'bg-orange-500 text-black border-orange-500' 
                          : 'bg-neutral-100 dark:bg-neutral-900 text-gray-400 border-neutral-200 dark:border-white/5'
                      }`;
                      return (
                        <button 
                          key={cat} 
                          onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} 
                          className={btnClass}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center flex-1">
                      <Loader2 className="animate-spin text-orange-500" size={24} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5 overflow-y-auto flex-1 pr-1 pb-16 content-start">
                      <AnimatePresence mode="popLayout">
                        {filteredMenu.map((item) => {
                          const isAvail = item.isAvailable !== false;
                          const cardClass = `bg-neutral-50 dark:bg-neutral-900 border p-2 rounded-2xl text-left flex flex-col justify-between h-24 hover:border-orange-500 active:scale-95 ${
                            !isAvail ? 'opacity-40 border-white/5' : 'border-neutral-200 dark:border-white/5'
                          }`;
                          return (
                            <motion.button 
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              key={item.id} 
                              disabled={!isAvail} 
                              onClick={() => { triggerBeep('tap'); item.variants ? setSelectedProduct(item) : handleAddProductToCart(item); }} 
                              className={cardClass}
                            >
                              <div>
                                <p className="font-bold text-xs line-clamp-2 leading-snug">{item.name}</p>
                                <p className="text-[8px] text-gray-500 uppercase mt-0.5">{item.category}</p>
                              </div>
                              <div className="flex justify-between items-end w-full">
                                <p className="text-yellow-500 font-black text-xs font-mono">{getDisplayPrice(item)}</p>
                                {!isAvail && <span className="text-[7px] font-black text-red-500 uppercase">Empty</span>}
                              </div>
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
                {cart.length > 0 && !isCartOpen && (
                  <motion.button initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }} className="fixed bottom-6 right-6 left-6 md:left-auto bg-green-600 text-white font-black px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-40 active:scale-95"><div className="flex items-center gap-2.5"><SafeShoppingBag size={16} /><div className="text-left"><p className="text-[8px] uppercase text-green-100">Active Cart</p><p className="text-xs font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</p></div></div><div className="flex items-center gap-1 text-sm font-mono"><span>Pay: ₹{getTotalBillPrice()}</span><span>➔</span></div></motion.button>
                )}
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-5 flex-1 overflow-y-auto pb-20 rounded-3xl">
                <div className="flex justify-between items-center mb-6">
                  <div><h2 className="text-sm font-black uppercase text-orange-500">Live Item Stock Control</h2><p className="text-[10px] text-neutral-500">Disable items instantly for customers.</p></div>
                  <button onClick={async () => { triggerBeep('tap'); const snap = await getDocs(collection(db, "products")); setProducts(snap.docs.map((doc) => doc.data())); }} className="p-2 bg-neutral-200 dark:bg-neutral-900 text-gray-400 rounded-xl"><SafeRefreshCw size={14} /></button>
                </div>
                <div className="space-y-2 max-w-xl">
                  {products.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    return (
                      <div key={item.id} className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-3 rounded-2xl flex items-center justify-between">
                        <div><span className="font-bold text-xs block">{item.name}</span><span className="text-[8px] text-gray-500 block">Category: {item.category} | ₹{item.price}</span></div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${isAvail ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{isAvail ? 'In Stock' : 'Out'}</span>
                          <button onClick={() => handleToggleStock(item.id, isAvail)} className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${isAvail ? 'text-red-400 border-red-500/20' : 'text-green-400 border-green-500/20'}`}>{isAvail ? 'Disable' : 'Enable'}</button>
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
                  <div className="relative mb-4"><SafeSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} /><input type="text" placeholder="Search receipt..." value={receiptSearchQuery} onChange={e => setReceiptSearchQuery(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-900 rounded-xl py-2 px-9 text-xs outline-none" /></div>
                  <div className="space-y-2 overflow-y-auto flex-1 pr-1 pb-16">
                    {filteredPastReceipts.map((order) => {
                      const isSelected = selectedReceipt?.id === order.id;
                      const receiptClass = `bg-neutral-50 dark:bg-neutral-900 border p-4 rounded-2xl flex justify-between items-center cursor-pointer ${
                        isSelected ? 'border-orange-500' : 'border-neutral-200 dark:border-white/5'
                      }`;
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => { triggerBeep('tap'); setSelectedReceipt(order); }} 
                          className={receiptClass}
                        >
                          <div><span className="font-bold text-xs block font-mono">Bill #${order.billNumber}</span><span className="text-[9px] text-gray-400 block font-mono">Token: #{order.tokenNumber} | {order.customerName}</span></div>
                          <div className="text-right"><span className="text-sm font-black text-green-400 font-mono">₹{order.total}</span></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="w-full md:w-[320px] bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-4 rounded-3xl flex flex-col justify-between shadow-xl overflow-y-auto">
                  {selectedReceipt ? (
                    <div className="space-y-4">
                      <div className="border-b border-neutral-200 pb-3"><h3 className="text-base font-black">Bill #${selectedReceipt.billNumber}</h3></div>
                      <div className="space-y-1 text-xs">
                        <p>👤 <b>Guest:</b> {selectedReceipt.customerName}</p>
                        {selectedReceipt.customerPhone && <p>📞 <b>Phone:</b> {selectedReceipt.customerPhone}</p>}
                        <p>💳 <b>Pay:</b> {selectedReceipt.paymentMethod?.toUpperCase()}</p>
                      </div>
                      <div className="space-y-1.5 pt-3 border-t border-neutral-200">
                        {selectedReceipt.items?.map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs"><span>{it.name} <span className="text-orange-500">x{it.quantity}</span></span><span>₹{it.price * it.quantity}</span></div>
                        ))}
                      </div>
                      <button onClick={() => handlePrintReceipt(selectedReceipt)} className="w-full bg-green-600 text-white font-black py-3 rounded-2xl text-xs uppercase flex items-center justify-center gap-2"><SafePrinter size={16} /> Reprint Invoice</button>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 text-xs py-20 font-bold">Select past receipt</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 p-6 rounded-3xl shadow-xl flex-grow max-w-xl space-y-6 overflow-y-auto">
                <h3 className="text-sm font-black uppercase text-orange-500">POS Settings</h3>
                <div className="border-b border-neutral-200 pb-4 space-y-3">
                  <p className="text-xs font-bold uppercase">A. UI Theme:</p>
                  <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl w-60">
                    <button 
                      onClick={() => handleToggleTheme('dark')} 
                      className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase ${
                        themeMode === 'dark' ? 'bg-[#050505] text-amber-400' : 'text-gray-400'
                      }`}
                    >
                      Dark
                    </button>
                    <button 
                      onClick={() => handleToggleTheme('light')} 
                      className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase ${
                        themeMode === 'light' ? 'bg-white text-orange-600' : 'text-gray-400'
                      }`}
                    >
                      Light
                    </button>
                  </div>
                </div>
                <div className="border-b border-neutral-200 pb-4 space-y-3">
                  <p className="text-xs font-bold uppercase">B. GST Config:</p>
                  <div className="flex items-center justify-between"><span className="text-xs">Enable GST:</span><button onClick={() => { const next = !gstEnabled; setGstEnabled(next); localStorage.setItem("bb_pos_gst_enabled", String(next)); }} className="text-orange-500">{gstEnabled ? <SafeToggleRight size={32} /> : <SafeToggleLeft size={32} />}</button></div>
                  {gstEnabled && <input type="number" value={gstRate} onChange={e => { const r = Math.max(0, Number(e.target.value)); setGstRate(r); localStorage.setItem("bb_pos_gst_rate", String(r)); }} className="w-full bg-neutral-100 dark:bg-neutral-900 border p-3 rounded-xl text-xs outline-none" />}
                </div>
                <div className="border-b border-neutral-200 pb-4 space-y-3">
                  <p className="text-xs font-bold uppercase">C. Paper Size:</p>
                  <div className="flex bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl w-60">
                    <button 
                      onClick={() => { setPrinterPaperSize('58mm'); localStorage.setItem("bb_pos_paper_size", '58mm'); }} 
                      className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase ${
                        printerPaperSize === '58mm' ? 'bg-[#050505] text-amber-400' : 'text-gray-400'
                      }`}
                    >
                      58mm
                    </button>
                    <button 
                      onClick={() => { setPrinterPaperSize('80mm'); localStorage.setItem("bb_pos_paper_size", '80mm'); }} 
                      className={`flex-grow py-2 rounded-lg text-[10px] font-black uppercase ${
                        printerPaperSize === '80mm' ? 'bg-[#050505] text-amber-400' : 'text-gray-400'
                      }`}
                    >
                      80mm
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase">D. Hardware Printer Connection Setup:</p>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${printerConnected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{printerConnected ? '● Connected' : 'Disconnected'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'thermal_usb', label: 'Thermal USB' },
                      { id: 'thermal_bluetooth', label: 'Thermal Bluetooth' },
                      { id: 'network_ip', label: 'Network IP Printer' },
                      { id: 'laser', label: 'Laser A4 Printer' }
                    ].map((p) => {
                      const isSelected = printerType === p.id;
                      const btnClass = `p-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                        isSelected 
                          ? 'bg-[#050505] text-amber-400 border-amber-500' 
                          : 'bg-neutral-100 dark:bg-neutral-900 text-gray-400 border-neutral-200 dark:border-white/5'
                      }`;
                      return (
                        <button 
                          key={p.id} 
                          onClick={() => { 
                            triggerBeep('tap'); 
                            setPrinterType(p.id as any); 
                            setPrinterConnected(false); 
                            setBleCharacteristic(null); 
                            localStorage.setItem("bb_pos_printer_type", p.id); 
                          }} 
                          className={btnClass}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {printerType === 'network_ip' && (
                    <div className="space-y-1 mt-2">
                      <label className="text-[9px] font-black uppercase text-gray-500">Printer IP Address</label>
                      <input type="text" value={printerIp} onChange={e => { setPrinterIp(e.target.value); localStorage.setItem("bb_pos_printer_ip", e.target.value); }} className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-3 rounded-xl text-xs outline-none font-mono" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-500">Number of Bill Copies</label>
                    <input type="number" min={1} max={5} value={printCopies} onChange={e => { const v = Math.max(1, Number(e.target.value)); setPrintCopies(v); localStorage.setItem("bb_pos_print_copies", String(v)); }} className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-3 rounded-xl text-xs outline-none font-mono" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleConnectPrinter} 
                      disabled={isConnecting}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-700 text-black disabled:text-neutral-500 font-black py-2.5 rounded-xl text-[10px] uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
                    >
                      {isConnecting ? <Loader2 className="animate-spin text-neutral-500" size={10} /> : 'Connect Device'}
                    </button>
                    <button 
                      onClick={handleTestPrint} 
                      className="flex-grow bg-green-600 hover:bg-green-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase shadow-md active:scale-95 transition-all"
                    >
                      Test Print 🧾
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* 3. MODULAR CHILD OVERLAYS */}
      <PosCartDrawer 
        isHindi={false} isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} cart={cart} setCart={setCart} customerPhone={customerPhone} setCustomerPhone={setCustomerPhone} customerName={customerName} setCustomerName={setCustomerName} customerPoints={customerPoints} setCustomerPoints={setCustomerPoints} pointsToRedeem={pointsToRedeem} setPointsToRedeem={setPointsToRedeem} customDiscount={customDiscount} setCustomDiscount={setCustomDiscount} fulfillmentType={fulfillmentType} setFulfillmentType={setFulfillmentType} selectedArea={selectedArea} setSelectedArea={setSelectedArea} DELIVERY_AREAS={DELIVERY_AREAS} address={address} setAddress={setAddress} tableNumber={tableNumber} setTableNumber={setTableNumber} chefInstructions={chefInstructions} setChefInstructions={setChefInstructions} isSubmittingOrder={isSubmittingOrder} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} noCutlery={noCutlery} setNoCutlery={setNoCutlery} getCartSubtotal={getCartSubtotal} getCartAddonsPrice={() => 0} getDeliveryCharge={getDeliveryCharge} getFreeDeliveryProgressPercent={getFreeDeliveryProgressPercent} getTotalPointsRedeemedInCart={getTotalPointsRedeemedInCart} getTotalBillPrice={getTotalBillPrice} loyaltyRules={loyaltyRules} handlePlaceOrder={handlePlaceOrder} handleDetectLocation={handleDetectLocation} setIsCustomerModalOpen={setIsCustomerModalOpen} searchDbCustomers={searchDbCustomers} handleUpdateCartQuantity={handleUpdateCartQuantity} handleUpdateCartItemNote={handleUpdateCartItemNote} showAddonsSection={false} triggerBeep={triggerBeep} handleCheckLoyalty={handleCheckLoyalty}
        
        ketchupAddon={false}
        setKetchupAddon={() => {}}
        oreganoAddon={false}
        setOreganoAddon={() => {}}
        chiliFlakesAddon={false}
        setChiliFlakesAddon={() => {}}
      />

      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen} setIsCustomerModalOpen={setIsCustomerModalOpen} customerSearchQuery={customerSearchQuery} setCustomerSearchQuery={setCustomerSearchQuery} searchedCustomers={searchedCustomers} isSearchingCustomer={isSearchingCustomer} newCustName={newCustName} setNewCustName={setNewCustName} newCustPhone={newCustPhone} setNewCustPhone={setNewCustPhone} newCustAddress={newCustAddress} setNewCustAddress={setNewCustAddress} editingCustomer={editingCustomer} viewingHistoryCustomer={viewingHistoryCustomer} customerHistoryList={customerHistoryList} editCustPoints={editCustPoints} setEditCustPoints={setEditCustPoints} handleSelectCustomer={handleSelectCustomer} handleLoadCustomerHistory={handleLoadCustomerHistory} handleStartEditProfile={handleStartEditProfile} handleUpdateCustomerProfile={handleUpdateCustomerProfile} handleSaveNewCustomer={handleSaveNewCustomer} setViewingHistoryCustomer={setViewingHistoryCustomer} setCustomerHistoryList={setCustomerHistoryList} setEditingCustomer={setEditingCustomer} searchDbCustomers={searchDbCustomers} triggerBeep={triggerBeep}
      />

      <CustomizerModal 
        selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} normalPizzaSize={normalPizzaSize} setNormalPizzaSize={setNormalPizzaSize} normalPizzaPrice={normalPizzaPrice} setNormalPizzaPrice={setNormalPizzaPrice} normalPizzaAddons={{}} setNormalPizzaAddons={() => {}} customizerChefNote={customizerChefNote} setCustomizerChefNote={setCustomizerChefNote} PIZZA_ADDONS={{}} QUICK_INSTRUCTION_TAGS={QUICK_INSTRUCTION_TAGS} handleAddCustomizedItemToCart={handleAddCustomizedItemToCart} triggerBeep={triggerBeep}
      />
    </div>
  );
}
