'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, increment, getDoc, getDocs, where, setDoc,
  waitForPendingWrites
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
  const [fontSize, setFontSize] = useState<number>(9); 
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
  
  // रसीद (Past Bills) स्टेट्स और पेजिनेशन लिमिट
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [isSearchingReceipts, setIsSearchingReceipts] = useState(false);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); 
  const [receiptsLimit, setReceiptsLimit] = useState(20);

  // सिंकिंग स्टेट्स
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

  const handleFontSizeChange = (newSize: number) => {
    if (newSize >= 6 && newSize <= 24) {
      setFontSize(newSize);
      localStorage.setItem("bb_pos_font_size", String(newSize));
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

  const triggerBeep = (type: 'tap' | 'success') => {
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
      } else {
        osc.frequency.setValueAtTime(523, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659, globalAudioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime + 0.24);
        osc.stop(globalAudioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio error:", e);
    }
  };

  // Service Worker Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'manifest';
        document.head.appendChild(link);
      }
      link.href = '/pos-menifasto.json';

      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('Service Worker Registered successfully!', reg.scope))
            .catch((err) => console.warn('Service Worker registration failed:', err));
        });
      }
    }
  }, []);

  // Safe manual printer disconnect helper
  const handleDisconnectPrinter = () => {
    triggerBeep('tap');
    if (serialPort) {
      serialPort.close().catch(() => {});
      setSerialPort(null);
    }
    if (usbDevice) {
      usbDevice.close().catch(() => {});
      setUsbDevice(null);
    }
    if (bleCharacteristic && bleCharacteristic.service && bleCharacteristic.service.device) {
      bleCharacteristic.service.device.gatt.disconnect();
      setBleCharacteristic(null);
    }
    setPrinterConnected(false);
    localStorage.removeItem("bb_pos_printer_connected");
    toast.success("Printer disconnected explicitly!");
  };

  // Recovery configuration & LocalStorage Backup load
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
    setKotEnabled(localStorage.getItem("bb_pos_kot_enabled") !== 'false'); 
    
    const localPrinterType = localStorage.getItem("bb_pos_printer_type");
    if (localPrinterType) setPrinterType(localPrinterType as any);
    const localPrinterIp = localStorage.getItem("bb_pos_printer_ip");
    if (localPrinterIp) setPrinterIp(localPrinterIp);
    const localPrintCopies = localStorage.getItem("bb_pos_print_copies");
    if (localPrintCopies) setPrintCopies(Number(localPrintCopies) || 1);

    const localFontSize = localStorage.getItem("bb_pos_font_size");
    if (localFontSize) setFontSize(Number(localFontSize) || 9);

    const localTheme = localStorage.getItem("bb_pos_theme") || 'dark';
    setThemeMode(localTheme as any);
    if (localTheme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');

    // Restore saved inputs and Active Cart state on startup
    const savedCart = localStorage.getItem("bb_pos_saved_cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (err) {}
    }
    setCustomerPhone(localStorage.getItem("bb_pos_saved_cust_phone") || '');
    setCustomerName(localStorage.getItem("bb_pos_saved_cust_name") || '');
    setCustomerPoints(Number(localStorage.getItem("bb_pos_saved_cust_points")) || 0);
    setAddress(localStorage.getItem("bb_pos_saved_cust_address") || '');
    setFulfillmentType((localStorage.getItem("bb_pos_saved_fulfillment_type") as any) || 'table');
    setTableNumber(localStorage.getItem("bb_pos_saved_table_number") || 'Table 1');
    setChefInstructions(localStorage.getItem("bb_pos_saved_chef_instructions") || '');
  }, []);

  // Keep cart & customer states saved to LocalStorage across refreshes
  useEffect(() => {
    localStorage.setItem("bb_pos_saved_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("bb_pos_saved_cust_phone", customerPhone);
    localStorage.setItem("bb_pos_saved_cust_name", customerName);
    localStorage.setItem("bb_pos_saved_cust_points", String(customerPoints));
    localStorage.setItem("bb_pos_saved_cust_address", address);
    localStorage.setItem("bb_pos_saved_fulfillment_type", fulfillmentType);
    localStorage.setItem("bb_pos_saved_table_number", tableNumber);
    localStorage.setItem("bb_pos_saved_chef_instructions", chefInstructions);
  }, [customerPhone, customerName, customerPoints, address, fulfillmentType, tableNumber, chefInstructions]);

  // Robust Persistent Auto-reconnect Printer on refresh (Starts immediately on Login)
  useEffect(() => {
    const autoReconnectPrinters = async () => {
      const isSavedConnected = localStorage.getItem("bb_pos_printer_connected") === 'true';
      if (!isSavedConnected) return;

      const savedType = localStorage.getItem("bb_pos_printer_type") || 'thermal_usb';
      if (typeof window === 'undefined') return;

      setTimeout(async () => {
        // Bluetooth Auto-connect using granted permission check
        if (savedType === 'thermal_bluetooth' && 'bluetooth' in navigator && !bleCharacteristic) {
          try {
            const devices = await (navigator as any).bluetooth.getDevices();
            if (devices.length > 0) {
              const device = devices[0];
              const server = await device.gatt.connect();
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
              toast.success("Bluetooth Printer Reconnected!");
            }
          } catch (e) {
            console.warn("Bluetooth auto-reconnect failed:", e);
          }
        }

        // Web Serial USB Auto-connect
        if (savedType === 'thermal_usb' && 'serial' in navigator && !serialPort) {
          try {
            const ports = await (navigator as any).serial.getPorts();
            if (ports.length > 0) {
              const port = ports[0];
              await port.open({ baudRate: 9600 });
              setSerialPort(port);
              setPrinterConnected(true);
              toast.success("USB Printer Reconnected!");
            }
          } catch (e) {
            console.warn("Serial auto-reconnect failed:", e);
          }
        } 
        
        // WebUSB fallback auto-connect
        if (savedType === 'thermal_usb' && 'usb' in navigator && !serialPort && !usbDevice) {
          try {
            const devices = await (navigator as any).usb.getDevices();
            if (devices.length > 0) {
              const device = devices[0];
              await device.open();
              await device.selectConfiguration(1);
              await device.claimInterface(0);
              setUsbDevice(device);
              setPrinterConnected(true);
              toast.success("USB Printer Reconnected!");
            }
          } catch (e) {
            console.warn("WebUSB auto-reconnect failed:", e);
          }
        }
      }, 500);
    };

    if (isLoggedIn) {
      autoReconnectPrinters();
    }
  }, [isLoggedIn, serialPort, usbDevice, bleCharacteristic]);

  // Sync Live Orders and Align local offline bill sequence
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(40));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(list);

      // Extract highest sequence number online and lock it in offline counter local sequence
      let maxBill = Number(localStorage.getItem("bb_pos_local_bill_counter")) || 5000;
      list.forEach((ord: any) => {
        const bNum = Number(ord.billNumber);
        if (!isNaN(bNum) && bNum > maxBill) {
          maxBill = bNum;
        }
      });
      localStorage.setItem("bb_pos_local_bill_counter", String(maxBill));
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

  // Past Receipts with pagination limit of 20 and manual "Load More"
  useEffect(() => {
    if (activeTab !== 'receipts') return;

    const fetchPastReceipts = async () => {
      setIsSearchingReceipts(true);
      try {
        let q;
        if (receiptSearchQuery.trim()) {
          q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(100)); // allow deeper search query
        } else {
          q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(receiptsLimit));
        }
        const snap = await getDocs(q);
        setPastReceipts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error loading receipts:", err);
      } finally {
        setIsSearchingReceipts(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchPastReceipts();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [activeTab, receiptSearchQuery, receiptsLimit]);

  // Sidebar Manual Sync Handler
  const handleManualSync = async () => {
    triggerBeep('tap');
    if (!navigator.onLine) {
      toast.error("You are offline! Connect to the internet first.");
      return;
    }
    setIsSyncing(true);
    const toastId = toast.loading("Force syncing data with server database...");
    try {
      // Force sync pending writes queue in Firebase
      await waitForPendingWrites(db);

      // Re-download fresh items & loyalty rules to ensure sync
      const prodSnap = await getDocs(collection(db, "products"));
      const items = prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      const uniqueCats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
      setCategories(['All', ...uniqueCats]);
      
      const rulesSnap = await getDocs(collection(db, "loyalty_rules"));
      setLoyaltyRules(rulesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      
      toast.dismiss(toastId);
      toast.success("System fully Synced!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Sync incomplete or connection timeout");
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
      toast.error("Connection timeout");
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
    const confirmRefund = window.confirm("Are you sure you want to refund/cancel this bill?");
    if (!confirmRefund) return;

    const toastId = toast.loading("Processing Refund...");
    try {
      await updateDoc(doc(db, "orders", orderId), { status: 'refunded' });
      
      setSelectedReceipt((prev: any) => prev ? { ...prev, status: 'refunded' } : null);
      setPastReceipts(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded' } : o));
      
      toast.dismiss(toastId);
      toast.success("Bill Refunded/Cancelled Successfully!");
      setIsReceiptModalOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to refund order");
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
      let q;
      if (cleanText) {
        if (/^\d+$/.test(cleanText)) {
          q = query(collection(db, "customer_points"), where("phone", "==", cleanText));
        } else {
          q = query(collection(db, "customer_points"), where("name", ">=", cleanText.charAt(0).toUpperCase() + cleanText.slice(1)), limit(15));
        }
      } else {
        q = query(collection(db, "customer_points"), orderBy("lastActive", "desc"), limit(12));
      }
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

  const getPrintConfig = (): PrintConfig => {
    const configObj: any = {
      printerPaperSize,
      printerType,
      bleCharacteristic,
      serialPort,
      usbDevice,
      fontSize 
    };
    return configObj as PrintConfig;
  };

  const handleConnectPrinter = async () => {
    triggerBeep('tap');
    setIsConnecting(true);
    const toastId = toast.loading(`Connecting to ${printerType.toUpperCase().replace('_', ' ')}...`);

    if (printerType === 'thermal_bluetooth') {
      if (!(navigator as any).bluetooth) { 
        toast.dismiss(toastId);
        setIsConnecting(false);
        toast.error("Web Bluetooth is not supported on this browser/device.");
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
        localStorage.setItem("bb_pos_printer_connected", "true");
        toast.dismiss(toastId);
        toast.success("Bluetooth Printer Connected!");
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
        toast.error("Direct USB printing is not supported on this browser.");
        return;
      }
      try {
        if ((navigator as any).serial) {
          const port = await (navigator as any).serial.requestPort();
          await port.open({ baudRate: 9600 });
          setSerialPort(port);
          setPrinterConnected(true);
          localStorage.setItem("bb_pos_printer_connected", "true");
          toast.dismiss(toastId);
          toast.success("Direct USB Printer Connected via Web Serial!");
        } else {
          const device = await (navigator as any).usb.requestDevice({ filters: [] });
          await device.open();
          await device.selectConfiguration(1);
          await device.claimInterface(0);
          setUsbDevice(device);
          setPrinterConnected(true);
          localStorage.setItem("bb_pos_printer_connected", "true");
          toast.dismiss(toastId);
          toast.success("Direct USB Printer Connected via WebUSB!");
        }
      } catch (err) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error("Direct USB connection failed.");
      } finally {
        setIsConnecting(false);
      }
    } else {
      setTimeout(() => {
        toast.dismiss(toastId);
        setIsConnecting(false);
        setPrinterConnected(true);
        localStorage.setItem("bb_pos_printer_connected", "true");
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
        { name: 'Connection Active!', quantity: 1, price: 100 },
        { name: 'ESC/POS Print Test', quantity: 1, price: 50 }
      ],
      subtotal: 150,
      discount: 0,
      total: 150,
      timestamp: new Date()
    };
    handlePrintReceipt(mockOrder, getPrintConfig());
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

  // Safe offline bill sequence generation
  const getNextLocalBillNumber = () => {
    const currentLocal = Number(localStorage.getItem("bb_pos_local_bill_counter")) || 5000;
    const nextLocal = currentLocal + 1;
    localStorage.setItem("bb_pos_local_bill_counter", String(nextLocal));
    return nextLocal;
  };

  // Place Order flow (Offline sequence resilient & auto-queue sync)
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

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let billNumber: number;

    try {
      if (isOnline) {
        try {
          billNumber = await runTransaction(db, async (txn) => {
            const snap = await txn.get(doc(db, "settings", "store_bill_counter"));
            const next = snap.exists() ? (snap.data().nextBillNumber || 1) : 1;
            txn.set(doc(db, "settings", "store_bill_counter"), { nextBillNumber: next + 1 });
            return next;
          });
          localStorage.setItem("bb_pos_local_bill_counter", String(billNumber));
        } catch (txnError) {
          console.warn("Transaction failed online, falling back to local counter logic:", txnError);
          billNumber = getNextLocalBillNumber();
        }
      } else {
        billNumber = getNextLocalBillNumber();
      }

      const orderObj = { 
        billNumber, 
        tokenNumber: token, 
        customerName: customerName || "Walk-in Guest", 
        customerPhone: customerPhone ? `+91${customerPhone}` : "", 
        customerPointsBefore: customerPhone ? customerPoints : 0,
        customerPointsEarned: customerPhone ? earned : 0,
        customerPointsRedeemed: customerPhone ? pointsToRedeem : 0,
        customerPointsAfter: customerPhone ? pointsAfterBill : 0,
        items: cart, 
        subtotal, 
        discount: discountCombined, 
        gstRate: gstEnabled ? gstRate : 0, 
        gstAmount: getGstAmountCalculated(), 
        total: finalTotal, 
        timestamp: new Date(), 
        status: 'completed', 
        fulfillmentType, 
        deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "", 
        tableNumber: fulfillmentType === 'table' ? tableNumber : '', 
        paymentMethod, 
        chefInstructions, 
        source: 'POS',
        address: address
      };

      // Safely write document (stored in offline sync queue if network drops)
      await addDoc(collection(db, "orders"), orderObj);

      if (customerPhone && customerPhone.trim().length === 10) {
        const phone = customerPhone.trim();
        const userRef = doc(db, "customer_points", phone);

        if (isOnline) {
          try {
            await runTransaction(db, async (txn) => {
              const snap = await txn.get(userRef);
              if (!snap.exists()) {
                txn.set(userRef, { name: customerName || "Walk-in Guest", phone, points: Math.max(0, pointsAfterBill), lastActive: new Date() });
              } else {
                txn.update(userRef, { points: pointsAfterBill, lastActive: new Date() });
              }
            });
          } catch (e) {
            await setDoc(userRef, { name: customerName || "Walk-in Guest", phone, points: Math.max(0, pointsAfterBill), lastActive: new Date() }, { merge: true });
          }
        } else {
          await setDoc(userRef, { name: customerName || "Walk-in Guest", phone, points: Math.max(0, pointsAfterBill), lastActive: new Date() }, { merge: true });
        }

        if (earned > 0) {
          await addDoc(collection(db, "customer_points", phone, "history"), { type: 'earn', points: earned, description: `Earned Bill #${billNumber}`, timestamp: new Date() });
        }
        if (pointsToRedeem > 0) {
          await addDoc(collection(db, "customer_points", phone, "history"), { type: 'redeem', points: pointsToRedeem, description: `Redeemed cashback Bill #${billNumber}`, timestamp: new Date() });
        }
      }

      triggerBeep('success'); 
      toast.success(`Bill #${billNumber} saved successfully!`);
      
      const pConfig = getPrintConfig();

      if (kotEnabled) {
        toast.success("Printing KOT first...");
        await handlePrintKot(orderObj, pConfig);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      toast.success("Printing Customer Receipt...");
      await handlePrintReceipt(orderObj, pConfig);

      // Clean backup logs to start fresh
      setCart([]); setCustomerPhone(''); setCustomerName(''); setCustomerPoints(0); setPointsToRedeem(0); setCustomDiscount(0); setIsCartOpen(false); setChefInstructions('');
      localStorage.removeItem("bb_pos_saved_cart");
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order offline");
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
  
  const filteredPastReceipts = useMemo(() => {
    return pastReceipts.filter((o) => 
      String(o.billNumber).includes(receiptSearchQuery.trim()) || 
      String(o.customerPhone || '').includes(receiptSearchQuery.trim()) || 
      String(o.customerName || '').toLowerCase().includes(receiptSearchQuery.trim().toLowerCase())
    );
  }, [pastReceipts, receiptSearchQuery]);

  const activeLiveOrders = useMemo(() => {
    return liveOrders.filter((o) => o.status !== 'completed' && o.status !== 'rejected');
  }, [liveOrders]);

  const getDisplayPrice = (item: any) => item?.variants ? `₹${Math.min(...Object.values(item.variants).map(Number))}+` : `₹${item?.price || 0}`;

  const liveOrdersBadgeCount = activeLiveOrders.length;

  // Navigation Items (Live Orders Shifted out of Sidebar navigation to Header)
  const navItems = [
    { id: 'billing', label: 'Counter Billing', icon: SafeShoppingBag },
    { id: 'inventory', label: 'Stock Toggle', icon: SafeLayers },
    { id: 'receipts', label: 'Past Receipts', icon: SafePrinter },
    { id: 'settings', label: 'POS Settings', icon: SafeSettings }
  ];

  const sampleOrderForPreview = useMemo(() => {
    return {
      billNumber: 45,
      tokenNumber: 12,
      timestamp: new Date(),
      customerName: customerName || "Walk-in Guest",
      customerPhone: customerPhone ? `+91${customerPhone}` : "",
      address: address || "Mohandra Bus Stand, Panna, MP",
      fulfillmentType,
      tableNumber: tableNumber || "T-1",
      paymentMethod,
      items: cart.length > 0 ? cart : [
        { name: "PANEER TIKKA", quantity: 2, price: 180, note: "EXTRA SPICY" },
        { name: "VEG BURGER", quantity: 1, price: 90 },
        { name: "MASALA CHAI", quantity: 3, price: 20 }
      ],
      subtotal: cart.length > 0 ? getCartSubtotal() : 510,
      discount: cart.length > 0 ? (customDiscount + getLoyaltyDiscount()) : 10,
      customerPointsRedeemed: pointsToRedeem,
      customerPointsEarned: cart.length > 0 ? Math.floor(getTotalBillPrice() / 100) : 5,
      customerPointsAfter: customerPhone ? Math.max(0, customerPoints + (Math.floor(getTotalBillPrice() / 100) - getTotalPointsRedeemedInCart() - pointsToRedeem)) : 25,
      total: cart.length > 0 ? getTotalBillPrice() : 500
    };
  }, [cart, customerName, customerPhone, address, fulfillmentType, tableNumber, paymentMethod, customDiscount, pointsToRedeem, customerPoints]);

  const receiptHtmlContent = useMemo(() => {
    return generateReceiptHtml(sampleOrderForPreview, getPrintConfig());
  }, [sampleOrderForPreview, printerPaperSize, printerType, fontSize]);

  const mainClass = "min-h-screen flex flex-col md:flex-row font-sans antialiased overflow-hidden transition-colors duration-200 " + 
    (themeMode === "dark" ? "dark bg-[#0a0a0a] text-neutral-100" : "bg-neutral-50 text-neutral-800");

  const asideClass = "bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between p-4 shrink-0 shadow-lg transition-all duration-300 fixed inset-y-0 left-0 md:relative md:translate-x-0 md:flex " + 
    (isSidebarCollapsed ? "md:w-20" : "md:w-64") + " " + 
    (isSidebarOpen ? "translate-x-0 w-64 z-50 shadow-2xl" : "-translate-x-full md:translate-x-0 z-30 md:z-30");

  return (
    <div className={mainClass}>
      <Toaster position="top-center" />

      {!isLoggedIn ? (
        <div className="fixed inset-0 bg-neutral-900 text-white flex flex-col items-center justify-center p-4 z-50 animate-fade-in">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><SafeLock size={32} /></div>
              <h1 className="text-xl font-black uppercase text-yellow-500">BUM BUM CAFE</h1>
              <p className="text-xs text-neutral-400">Terminal Locked • Enter PIN</p>
            </div>
            <form onSubmit={handlePinLoginSubmit} className="space-y-4">
              <input type="password" maxLength={4} value={pinInput} readOnly placeholder="••••" className="w-full bg-neutral-900 border border-neutral-800 text-center text-3xl font-mono py-4 rounded-2xl outline-none focus:border-orange-500 text-orange-400" />
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button key={num} type="button" onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput((p) => p + String(num)); }} className="aspect-square bg-neutral-900 hover:bg-[#151515] font-black text-xl rounded-2xl border border-neutral-800 flex items-center justify-center">{num}</button>
                ))}
                <button type="button" onClick={() => { triggerBeep('tap'); setPinInput(''); }} className="aspect-square bg-neutral-900 hover:bg-[#151515] font-bold text-xs uppercase text-red-400 rounded-2xl border border-neutral-800 flex items-center justify-center">Clear</button>
                <button type="button" onClick={() => { triggerBeep('tap'); if (pinInput.length < 4) setPinInput((p) => p + '0'); }} className="aspect-square bg-neutral-900 hover:bg-[#151515] font-black text-xl rounded-2xl border border-neutral-800 flex items-center justify-center">0</button>
                <button type="submit" className="aspect-square bg-orange-600 hover:bg-orange-500 font-bold text-xs uppercase rounded-2xl flex items-center justify-center">Login</button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          {isSidebarOpen && (
            <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-neutral-950/80 z-40 md:hidden transition-all duration-300" />
          )}

          <aside className={asideClass}>
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1 py-1 border-b border-neutral-200 dark:border-neutral-800 pb-4 gap-2">
                <div className="flex items-center gap-2">
                  <SafeDatabase className="text-orange-500 animate-pulse" size={18} />
                  {!isSidebarCollapsed && (
                    <h1 className="text-xs font-black uppercase text-yellow-500">Bum Bum POS</h1>
                  )}
                </div>
                <button onClick={() => { triggerBeep('tap'); setIsSidebarCollapsed(!isSidebarCollapsed); }} className="hidden md:flex p-1.5 bg-neutral-200 dark:bg-neutral-800 text-gray-400 rounded-lg">
                  {isSidebarCollapsed ? <SafeChevronRight size={14} /> : <SafeChevronLeft size={14} />}
                </button>
                <button onClick={() => { triggerBeep('tap'); setIsSidebarOpen(false); }} className="p-1.5 text-gray-400 md:hidden">
                  <SafeX size={14} />
                </button>
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
                      className={"w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 " + (activeTab === item.id ? "bg-orange-600 text-white" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white")}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={14} />
                        {!isSidebarCollapsed && <span>{item.label}</span>}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar bottom action layout - lock & manual sync */}
            <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button 
                onClick={handleManualSync} 
                disabled={isSyncing}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-yellow-500 hover:bg-yellow-500/10 disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />}
                {!isSidebarCollapsed && <span>Sync Now</span>}
              </button>
              
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10">
                <SafeLogOut size={14} />{!isSidebarCollapsed && <span>Lock POS</span>}
              </button>
            </div>
          </aside>

          <main className="flex-1 p-3 md:p-5 overflow-y-auto flex flex-col h-screen">
            <div className="flex items-center gap-3 mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <button onClick={() => { triggerBeep('tap'); setIsSidebarOpen(true); }} className="p-2.5 bg-neutral-200 dark:bg-neutral-850 text-orange-500 rounded-xl md:hidden">
                <SafeMenu size={16} />
              </button>
              <div className="flex flex-col">
                <h2 className="text-[10px] font-black uppercase text-orange-500">{activeTab} Workspace</h2>
                <span className="text-[9px] text-neutral-500 dark:text-neutral-400 font-bold">Bum Bum Cafe • Mohandra</span>
              </div>
              
              {/* Header Shift - "Live Orders" badge button replaces "Search Guest" */}
              <button 
                onClick={() => { triggerBeep('tap'); setActiveTab('orders'); }} 
                className={"ml-auto p-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all relative shadow-sm hover:scale-[1.02] active:scale-95 " + 
                  (activeTab === 'orders' ? "bg-orange-600 text-white" : "bg-neutral-200 dark:bg-neutral-800 text-orange-500")}
              >
                <SafeClock size={14} />
                <span>Live Orders</span>
                {liveOrdersBadgeCount > 0 && (
                  <span className="bg-yellow-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full font-mono animate-pulse">
                    {liveOrdersBadgeCount}
                  </span>
                )}
              </button>
            </div>

            {/* LIVE ORDERS */}
            {activeTab === 'orders' && (
              <div className="flex flex-col flex-1 overflow-hidden font-sans">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase text-neutral-500">
                    Active Live Orders ({activeLiveOrders.length})
                  </span>
                  {activeLiveOrders.length > 0 && (
                    <button 
                      onClick={handleClearAllLiveOrders} 
                      className="text-[9px] font-black uppercase px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      Clean Workspace 🧹
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 overflow-y-auto flex-grow">
                  {activeLiveOrders.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                      <SafeClock size={48} className="text-neutral-400 dark:text-neutral-600 mb-4 animate-pulse" />
                      <p className="text-base font-black text-neutral-500 dark:text-neutral-400">Order Workspace Empty</p>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">All orders are completed and dispatched!</span>
                    </div>
                  ) : (
                    activeLiveOrders.map((order) => {
                      const isOnline = order.source && order.source !== 'POS';
                      const orderCardClass = "border rounded-2xl p-4 flex flex-col justify-between shadow-lg h-fit transition-colors duration-200 " + 
                        (isOnline ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800");
                      return (
                        <div key={order.id} className={orderCardClass}>
                          <div>
                            <div className="flex justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
                              <div>
                                <p className="text-xs font-black text-yellow-600 dark:text-yellow-300 font-mono">Bill #${String(order.billNumber).padStart(4, '0')}</p>
                                {isOnline && (
                                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest block mt-1 animate-pulse">🌐 ONLINE ORDER ({order.source})</span>
                                )}
                              </div>
                              <span className="bg-orange-500/10 text-orange-400 text-[8px] font-black uppercase px-2 py-0.5 rounded">{order.fulfillmentType}</span>
                            </div>
                            <p className="text-[10px] font-black text-neutral-800 dark:text-neutral-200">👤 {order.customerName}</p>
                            <div className="space-y-1.5 pt-2 mb-4 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                              {order.items?.map((it: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                                  <span>{it.name} <span className="text-orange-500 font-bold">x{it.quantity}</span></span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs font-black text-green-500 dark:text-green-400 mb-3 border-t border-neutral-200 dark:border-neutral-800 pt-2">
                              <span>Total:</span><span className="font-mono">₹{order.total}</span>
                            </div>
                            <div className="flex gap-2">
                              {order.status === 'pending' && (
                                <div className="flex gap-2 w-full">
                                  <button onClick={() => handleUpdateStatus(order.id, 'preparing')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-2 rounded-xl text-[10px] uppercase shadow-md active:scale-95 transition-all">Accept</button>
                                  <button onClick={() => handleUpdateStatus(order.id, 'rejected')} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded-xl text-[10px] uppercase shadow-md active:scale-95 transition-all">Reject</button>
                                </div>
                              )}
                              {order.status === 'preparing' && (
                                <button onClick={() => handleUpdateStatus(order.id, order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'completed')} className="flex-1 bg-blue-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Dispatch</button>
                              )}
                              {order.status === 'out_for_delivery' && (
                                <button onClick={() => handleUpdateStatus(order.id, 'completed')} className="flex-1 bg-green-600 text-white font-black py-2 rounded-xl text-[10px] uppercase">Delivered</button>
                              )}
                              <button onClick={() => handlePrintReceipt(order, getPrintConfig())} className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-xl transition-all">
                                <SafePrinter size={14} />
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

            {activeTab === 'billing' && (
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
                  <div className="flex gap-3 mb-4 items-center">
                    <div className="relative flex-1">
                      <SafeSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                      <input type="text" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl py-2 px-9 text-xs outline-none text-neutral-800 dark:text-neutral-100 border border-transparent dark:border-neutral-700 focus:border-orange-500 transition-all" />
                    </div>
                    <button onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }} className="bg-orange-500 text-black font-black text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                      <SafeShoppingBag size={14} /><span>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
                    </button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-none">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      const btnClass = "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border shrink-0 transition-all " + 
                        (isSelected ? "bg-orange-500 text-black border-orange-500" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:text-orange-500 dark:hover:text-orange-400");
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
                          const hasImage = item.image || item.imageUrl || item.img;
                          const cardClass = "bg-neutral-50 dark:bg-neutral-800/40 border p-2.5 rounded-2xl text-left flex flex-col justify-between h-28 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-white dark:hover:bg-neutral-800 active:scale-95 transition-all " + 
                            (!isAvail ? "opacity-40 border-neutral-200 dark:border-neutral-800" : "border-neutral-200 dark:border-neutral-800");
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
                              <div className="flex gap-2 items-start w-full justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xs line-clamp-2 leading-snug text-neutral-800 dark:text-neutral-200">{item.name}</p>
                                  <p className="text-[8px] text-neutral-500 dark:text-neutral-400 uppercase mt-0.5">{item.category}</p>
                                </div>
                                {hasImage && (
                                  <img 
                                    src={item.image || item.imageUrl || item.img} 
                                    alt={item.name} 
                                    className="w-11 h-11 object-cover rounded-xl shrink-0 bg-neutral-200 dark:bg-neutral-700 shadow-sm border border-neutral-200/50 dark:border-neutral-800"
                                    onError={(e) => { (e.target as any).style.display = 'none'; }}
                                  />
                                )}
                              </div>
                              <div className="flex justify-between items-end w-full pt-1">
                                <p className="text-yellow-600 dark:text-yellow-400 font-black text-xs font-mono">{getDisplayPrice(item)}</p>
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
                  <motion.button initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }} className="fixed bottom-6 right-6 left-6 md:left-auto bg-green-600 text-white font-black px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-40 active:scale-95 transition-all">
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

            {activeTab === 'inventory' && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 flex-1 overflow-y-auto pb-20 rounded-3xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-sm font-black uppercase text-orange-500">Live Item Stock Control</h2>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Disable items instantly for customers.</p>
                  </div>
                  <button onClick={async () => { triggerBeep('tap'); const snap = await getDocs(collection(db, "products")); setProducts(snap.docs.map((doc) => doc.data())); }} className="p-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 hover:text-orange-500 dark:hover:text-orange-400 rounded-xl transition-all">
                    <SafeRefreshCw size={14} />
                  </button>
                </div>
                <div className="space-y-2 max-w-xl">
                  {products.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    return (
                      <div key={item.id} className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs block text-neutral-800 dark:text-neutral-200">{item.name}</span>
                          <span className="text-[8px] text-neutral-500 dark:text-neutral-400 block">Category: {item.category} | ₹{item.price}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={"text-[8px] font-black px-2 py-0.5 rounded-full border " + (isAvail ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                            {isAvail ? 'In Stock' : 'Out'}
                          </span>
                          <button onClick={() => handleToggleStock(item.id, isAvail)} className={"text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all " + (isAvail ? "text-red-400 border-red-500/20 hover:bg-red-500/10" : "text-green-400 border-green-500/20 hover:bg-green-500/10")}>
                            {isAvail ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'receipts' && (
              <div className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl max-w-5xl w-full mx-auto font-sans">
                <div className="relative mb-4">
                  <SafeSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search past receipt..." 
                    value={receiptSearchQuery} 
                    onChange={e => setReceiptSearchQuery(e.target.value)} 
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-transparent dark:border-neutral-700 rounded-xl py-2 px-9 text-xs outline-none text-neutral-800 dark:text-neutral-100 focus:border-orange-500 transition-all" 
                  />
                </div>
                {isSearchingReceipts ? (
                  <div className="flex items-center justify-center flex-1">
                    <Loader2 className="animate-spin text-orange-500" size={24} />
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto flex-1 pr-1 pb-16">
                    {filteredPastReceipts.length === 0 ? (
                      <p className="text-center text-neutral-400 dark:text-neutral-500 text-xs py-12">No past receipts found</p>
                    ) : (
                      filteredPastReceipts.map((order) => {
                        const isRefunded = order.status === 'refunded';
                        return (
                          <div 
                            key={order.id} 
                            onClick={() => { 
                              triggerBeep('tap'); 
                              setSelectedReceipt(order); 
                              setIsReceiptModalOpen(true); 
                            }} 
                            className="bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-850 p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs block font-mono text-neutral-900 dark:text-neutral-100">Bill #${order.billNumber}</span>
                              <span className="text-[9px] text-neutral-500 dark:text-neutral-400 block font-mono">Token: #{order.tokenNumber} | {order.customerName}</span>
                              {isRefunded && (
                                <span className="text-[7px] font-black uppercase text-red-500 border border-red-500/20 px-1 py-0.2 rounded bg-red-500/5">Refunded</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-black font-mono ${isRefunded ? 'text-neutral-400 line-through' : 'text-green-500'}`}>₹{order.total}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {/* Load More Pagination Trigger */}
                    {filteredPastReceipts.length >= receiptsLimit && !receiptSearchQuery.trim() && (
                      <div className="pt-4 flex justify-center">
                        <button 
                          onClick={() => { triggerBeep('tap'); setReceiptsLimit(prev => prev + 20); }} 
                          className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-2.5 px-6 rounded-xl shadow-md transition-all active:scale-95 uppercase"
                        >
                          Load More Bills ➔
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS WORKSPACE */}
            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto w-full pb-20 overflow-y-auto flex-1 font-sans animate-fade-in">
                
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-xl space-y-6">
                  <h3 className="text-sm font-black uppercase text-orange-500">POS Settings</h3>
                  
                  {/* UI थीम */}
                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 space-y-3">
                    <p className="text-xs font-bold uppercase text-neutral-800 dark:text-neutral-200">A. UI Theme:</p>
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-60 border border-transparent dark:border-neutral-700">
                      <button 
                        onClick={() => handleToggleTheme('dark')} 
                        className={"flex-grow py-2 rounded-lg text-[10px] font-black uppercase transition-all " + (themeMode === 'dark' ? "bg-neutral-950 text-amber-400 shadow-md" : "text-neutral-400")}
                      >
                        Dark
                      </button>
                      <button 
                        onClick={() => handleToggleTheme('light')} 
                        className={"flex-grow py-2 rounded-lg text-[10px] font-black uppercase transition-all " + (themeMode === 'light' ? "bg-white text-orange-600 shadow-md" : "text-neutral-400")}
                      >
                        Light
                      </button>
                    </div>
                  </div>

                  {/* GST सेटिंग्स */}
                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 space-y-3">
                    <p className="text-xs font-bold uppercase text-neutral-800 dark:text-neutral-200">B. GST Config:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-700 dark:text-neutral-300">Enable GST:</span>
                      <button onClick={() => { const next = !gstEnabled; setGstEnabled(next); localStorage.setItem("bb_pos_gst_enabled", String(next)); }} className="text-orange-500">
                        {gstEnabled ? <SafeToggleRight size={32} /> : <SafeToggleLeft size={32} />}
                      </button>
                    </div>
                    {gstEnabled && (
                      <input type="number" value={gstRate} onChange={e => { const r = Math.max(0, Number(e.target.value)); setGstRate(r); localStorage.setItem("bb_pos_gst_rate", String(r)); }} className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl text-xs outline-none text-neutral-900 dark:text-neutral-100" />
                    )}
                  </div>

                  {/* KOT ON/OFF Switch */}
                  <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase text-neutral-800 dark:text-neutral-200">C. Enable KOT Printing:</p>
                      <button 
                        onClick={() => { 
                          const next = !kotEnabled; 
                          setKotEnabled(next); 
                          localStorage.setItem("bb_pos_kot_enabled", String(next)); 
                          toast.success(next ? "KOT Printing ON" : "KOT Printing OFF");
                        }} 
                        className="text-orange-500"
                      >
                        {kotEnabled ? <SafeToggleRight size={32} /> : <SafeToggleLeft size={32} />}
                      </button>
                    </div>
                  </div>

                  {/* हार्डवेयर प्रिंटर कनेक्शन */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase text-neutral-800 dark:text-neutral-200">D. Hardware Printer Connection:</p>
                      <span className={"text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border " + (printerConnected ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                        {printerConnected ? '● Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'thermal_usb', label: 'Thermal USB' },
                        { id: 'thermal_bluetooth', label: 'Thermal Bluetooth' },
                        { id: 'network_ip', label: 'Network IP Printer' },
                        { id: 'laser', label: 'Laser A4 Printer' }
                      ].map((p) => {
                        const isSelected = printerType === p.id;
                        const btnClass = "p-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all " + 
                          (isSelected 
                            ? "bg-neutral-950 text-amber-400 border-amber-500" 
                            : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:text-orange-500 dark:hover:text-orange-400");
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
                        <label className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400">Printer IP Address</label>
                        <input type="text" value={printerIp} onChange={e => { setPrinterIp(e.target.value); localStorage.setItem("bb_pos_printer_ip", e.target.value); }} className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl text-xs outline-none font-mono text-neutral-800 dark:text-neutral-100" />
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-500 dark:text-gray-400">Number of Bill Copies</label>
                      <input type="number" min={1} max={5} value={printCopies} onChange={e => { const v = Math.max(1, Number(e.target.value)); setPrintCopies(v); localStorage.setItem("bb_pos_print_copies", String(v)); }} className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl text-xs outline-none font-mono text-neutral-800 dark:text-neutral-100" />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={handleConnectPrinter} 
                        disabled={isConnecting}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-750 text-black disabled:text-neutral-500 font-black py-2.5 rounded-xl text-[10px] uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-1"
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
                    {printerConnected && (
                      <button 
                        onClick={handleDisconnectPrinter} 
                        className="w-full mt-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/20 font-black py-2 rounded-xl text-[9px] uppercase tracking-wider transition-all"
                      >
                        Disconnect Printer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* PAST BILL REPRINT & REFUND POPUP MODAL */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 15 }} 
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 max-w-lg w-full rounded-3xl p-6 shadow-2xl relative font-sans flex flex-col max-h-[85vh]"
            >
              <button 
                onClick={() => setIsReceiptModalOpen(false)} 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-500"
              >
                <SafeX size={18} />
              </button>

              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3 pr-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-neutral-950 dark:text-white">Bill Details</h3>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                    selectedReceipt.status === 'refunded' 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                      : 'bg-green-500/10 text-green-500 border border-green-500/20'
                  }`}>
                    {selectedReceipt.status === 'refunded' ? 'Refunded' : 'Completed'}
                  </span>
                </div>
                <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-1">
                  Bill No: #{selectedReceipt.billNumber} | Token: #{selectedReceipt.tokenNumber}
                </p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Date: {selectedReceipt.timestamp?.toDate ? new Date(selectedReceipt.timestamp.toDate()).toLocaleString() : new Date(selectedReceipt.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                {/* Guest Details */}
                <div className="space-y-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 p-3.5 rounded-2xl">
                  <p>👤 <b>Guest Name:</b> <span className="font-medium text-neutral-950 dark:text-white">{selectedReceipt.customerName}</span></p>
                  {selectedReceipt.customerPhone && <p>📞 <b>Phone:</b> <span className="font-medium text-neutral-950 dark:text-white">{selectedReceipt.customerPhone}</span></p>}
                  <p>💳 <b>Method:</b> <span className="font-medium text-neutral-950 dark:text-white uppercase">{selectedReceipt.paymentMethod}</span></p>
                  <p>🍽️ <b>Fulfillment:</b> <span className="font-medium text-neutral-950 dark:text-white uppercase">{selectedReceipt.fulfillmentType}</span></p>
                  {selectedReceipt.tableNumber && <p>🪑 <b>Table No:</b> <span className="font-medium text-neutral-950 dark:text-white font-mono">{selectedReceipt.tableNumber}</span></p>}
                  {selectedReceipt.address && <p>📍 <b>Address:</b> <span className="font-medium text-neutral-950 dark:text-white">{selectedReceipt.address}</span></p>}
                </div>

                {/* Items Container */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Ordered Items</p>
                  <div className="space-y-1 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    {selectedReceipt.items?.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs py-1 border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                        <span className="text-neutral-850 dark:text-neutral-300">
                          {it.name} <span className="text-orange-500 font-bold">x{it.quantity}</span>
                        </span>
                        <span className="font-mono font-medium text-neutral-900 dark:text-white">₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Math Summary */}
                <div className="space-y-1.5 text-xs border-t border-neutral-200 dark:border-neutral-800 pt-3">
                  <div className="flex justify-between font-mono text-neutral-600 dark:text-neutral-400">
                    <span>Subtotal:</span>
                    <span>₹{selectedReceipt.subtotal}</span>
                  </div>
                  {selectedReceipt.discount > 0 && (
                    <div className="flex justify-between text-red-500 font-mono">
                      <span>Discount:</span>
                      <span>-₹{selectedReceipt.discount}</span>
                    </div>
                  )}
                  {selectedReceipt.gstAmount > 0 && (
                    <div className="flex justify-between font-mono text-neutral-600 dark:text-neutral-400">
                      <span>GST (5%):</span>
                      <span>+₹{selectedReceipt.gstAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-green-600 dark:text-green-400 font-mono pt-1.5 border-t border-dashed border-neutral-300 dark:border-neutral-800">
                    <span>Grand Total:</span>
                    <span>₹{selectedReceipt.total}</span>
                  </div>
                </div>
              </div>

              {/* Popup Action Buttons */}
              <div className="flex gap-2.5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button 
                  onClick={() => handlePrintReceipt(selectedReceipt, getPrintConfig())} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-2xl text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                >
                  <SafePrinter size={15} /> Reprint Bill
                </button>
                {selectedReceipt.status !== 'refunded' && (
                  <button 
                    onClick={() => handleRefundOrder(selectedReceipt.id)} 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
                  >
                    <Trash2 size={15} /> Refund Bill
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OVERLAYS */}
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
        setPaymentMethod={handleSetPaymentMethod} 
        noCutlery={false} 
        setNoCutlery={() => {}} 
        getCartSubtotal={getCartSubtotal} 
        getCartAddonsPrice={() => 0} 
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
        showAddonsSection={false} 
        triggerBeep={triggerBeep} 
        handleCheckLoyalty={handleCheckLoyalty}
        
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
