

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Home, 
  Store, 
  Flame, 
  MoreHorizontal, 
  Search, 
  Plus, 
  X,
  Trash2, 
  BarChart3, 
  Settings, 
  QrCode, 
  Wifi, 
  Sun, 
  Moon, 
  Share2, 
  FileText, 
  CheckCircle2, 
  Bell, 
  TrendingDown, 
  Truck, 
  PlusCircle, 
  MinusCircle, 
  Layers, 
  FileSpreadsheet, 
  Clock, 
  ChevronRight, 
  Sparkles,
  Edit,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { db } from '@/lib/firebase'; 
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc,
  increment, 
  addDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';

// ==========================================
// 1. TYPINGS & INTERFACES
// ==========================================
interface InventoryItem {
  id: string;
  name: string;
  category: string;
  storeQty: number;
  cafeQty?: number;
  unit: string;
  purchasePrice: number;
  minLimit: number;
  supplier: string;
  lastPurchaseDate: string;
  expiryDate?: string;
  batchNumber?: string;
  barcode?: string;
}

interface PurchaseLog {
  id: string;
  itemName: string;
  qty: number;
  unit: string;
  price: number;
  supplier: string;
  date: string;
  invoiceNo: string;
  paymentType: "Cash/UPI" | "Credit Ledger";
}

interface StockOutLog {
  id: string;
  itemName: string;
  qty: number;
  purpose: "Kitchen Use" | "Waste" | "Damage" | "Staff Use";
  date: string;
  remarks: string;
  financialLoss?: number;
}

interface NotificationItem {
  id: string;
  type: string;
  text: string;
  time: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  pendingCredit: number;
}

interface PrintGroup {
  id: string;
  name: string;
  itemIds: string[];
}

interface ScannedVerifyItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  unit: string;
  category: string;
  supplier: string;
}

const triggerHaptic = (ms = 35) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
};

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "dry_1", name: "Doodh Milk", category: "Dairy", storeQty: 40, unit: "Ltr", purchasePrice: 60, minLimit: 10, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800401" },
  { id: "dry_2", name: "Dahi Curd", category: "Dairy", storeQty: 15, unit: "Kg", purchasePrice: 80, minLimit: 5, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800402" },
  { id: "dry_3", name: "Makkhan Butter", category: "Dairy", storeQty: 24, unit: "Kg", purchasePrice: 420, minLimit: 8, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800240" },
  { id: "dry_4", name: "Ghee", category: "Dairy", storeQty: 10, unit: "Kg", purchasePrice: 680, minLimit: 3, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800239" },
  { id: "dry_5", name: "Processed Cheese", category: "Dairy", storeQty: 15, unit: "Kg", purchasePrice: 420, minLimit: 5, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800403" },
  { id: "dry_6", name: "Mozzarella Cheese", category: "Dairy", storeQty: 18, unit: "Kg", purchasePrice: 440, minLimit: 5, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800241" },
  { id: "dry_7", name: "Paneer", category: "Dairy", storeQty: 20, unit: "Kg", purchasePrice: 320, minLimit: 5, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800404" },
  { id: "dry_8", name: "Fresh Cream", category: "Dairy", storeQty: 10, unit: "Kg", purchasePrice: 240, minLimit: 3, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800405" },
  { id: "dry_9", name: "Vanilla Ice Cream", category: "Dairy", storeQty: 12, unit: "Ltr", purchasePrice: 180, minLimit: 4, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800406" },
  { id: "veg_1", name: "Pyaaj Onion", category: "Vegetables", storeQty: 50, unit: "Kg", purchasePrice: 30, minLimit: 15, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800407" },
  { id: "veg_2", name: "Tamatar Tomato", category: "Vegetables", storeQty: 30, unit: "Kg", purchasePrice: 40, minLimit: 10, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800408" },
  { id: "veg_3", name: "Aloo Potato", category: "Vegetables", storeQty: 60, unit: "Kg", purchasePrice: 25, minLimit: 15, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800409" }
];

export default function BumBumCafeStockApp() {
  // Global States
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [categories, setCategories] = useState<string[]>([
    "Dairy", "Vegetables", "Grains & Bakery", "Rice & Pulses", "Dry Fruits", "Oils", "Spices", "Sauces & Condiments", "Beverage Materials", "Pizza Toppings", "Ready-to-Use Items", "Packaging", "Equipment", "Others"
  ]);
  const [activeTab, setActiveTab] = useState<'home' | 'store' | 'print' | 'more'>('home');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isDbSeeding, setIsDbSeeding] = useState<boolean>(false);

  // local temporary edits tracker for stock quantities (for manual save and offline safety)
  const [editedQties, setEditedQties] = useState<Record<string, number>>({});

  // Toast HUD State & Helper
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const toastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Custom Dynamic Print Groups State
  const [printGroups, setPrintGroups] = useState<PrintGroup[]>([
    { id: "prg_1", name: "Daily Morning Audit", itemIds: ["dry_1", "dry_2"] },
    { id: "prg_2", name: "Urgent Supplier Orders", itemIds: ["veg_1", "veg_2"] }
  ]);
  const [printOrderQtys, setPrintOrderQtys] = useState<Record<string, string>>({});

  // Selection states for custom dynamic print routing
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [showAddToGroupModal, setShowAddToGroupModal] = useState<boolean>(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState<string>("");
  const [activePrintGroupId, setActivePrintGroup] = useState<string>("All");

  // Slide-out panels & Drawers
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);

  // SUPER SMART AI SCANNER STATES
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'barcode' | 'bill'>('barcode');
  const [scannedItemsToVerify, setScannedItemsToVerify] = useState<ScannedVerifyItem[]>([]);
  const [isScannerProcessing, setIsScannerProcessing] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Form Modals & Managers
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [showStockOutModal, setShowStockOutModal] = useState<boolean>(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [showAuditReconcileModal, setShowAuditReconcileModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingPurchaseLog, setEditingPurchaseLog] = useState<PurchaseLog | null>(null);

  // Dynamic Category Forms
  const [categoryInput, setCategoryInput] = useState<string>("");
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>("");

  // Physical Audit Variance form states
  const [auditItemSelect, setAuditItemSelect] = useState<string>("");
  const [auditPhysicalCount, setAuditPhysicalCount] = useState<string>("");

  // Sub-data tracking for History logs
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseLog[]>([
    { id: "p_1", itemName: "OREGON SACHETS", qty: 100, unit: "Pcs", price: 150, supplier: "Rajesh Traders", date: "2026-07-10", invoiceNo: "INV-2026-889", paymentType: "Credit Ledger" },
    { id: "p_2", itemName: "MOZZARELLA CHEESE", qty: 5, unit: "Kg", price: 490, supplier: "Sony Dairy", date: "2026-07-12", invoiceNo: "INV-2026-904", paymentType: "Cash/UPI" },
  ]);
  const [stockOutHistory, setStockOutHistory] = useState<StockOutLog[]>([
    { id: "so_1", itemName: "SUGER POWDER", qty: 1.5, purpose: "Waste", date: "2026-07-12", remarks: "Sugar spoiled by high humidity", financialLoss: 57 },
    { id: "so_2", itemName: "FRENCH FRIES", qty: 2, purpose: "Damage", date: "2026-07-11", remarks: "Defrosted completely", financialLoss: 220 },
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: "sup_1", name: "Rajesh Traders", phone: "9876543210", address: "Anand Godown Area", pendingCredit: 5200 },
    { id: "sup_2", name: "Sony Dairy", phone: "9900112233", address: "Amul Dairy Road", pendingCredit: 8400 }
  ]);

  // Form Inputs States
  const [formStockIn, setFormStockIn] = useState({
    invoiceNo: '', supplier: '', item: '', category: 'Raw Material', quantity: '', unit: 'Kg', price: '', gst: '5', expiry: '', batch: '', uploadInvoice: '',
    paymentType: 'Cash/UPI' as "Cash/UPI" | "Credit Ledger"
  });
  const [formStockOut, setFormStockOut] = useState({
    item: '', quantity: '', purpose: 'Kitchen Use' as "Kitchen Use" | "Waste" | "Damage" | "Staff Use", remarks: ''
  });
  const [formSupplier, setFormSupplier] = useState({ name: '', phone: '', address: '', pendingCredit: '0' });

  // Real-Time Firebase ONSNAPSHOT LISTENERS
  useEffect(() => {
    const unsubInventory = onSnapshot(collection(db, "godown_inventory"), (snap) => {
      if (!snap.empty) {
        setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
      } else {
        setInventory(INITIAL_INVENTORY);
      }
    });

    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snap) => {
      if (!snap.empty) {
        setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
      }
    });

    const unsubCategories = onSnapshot(collection(db, "categories"), (snap) => {
      if (!snap.empty) {
        setCategories(snap.docs.map(d => d.data().name as string));
      }
    });

    const unsubPrintGroups = onSnapshot(collection(db, "print_groups"), (snap) => {
      if (!snap.empty) {
        setPrintGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as PrintGroup)));
      }
    });

    const unsubPurchases = onSnapshot(query(collection(db, "purchase_history"), orderBy("date", "desc")), (snap) => {
      if (!snap.empty) {
        setPurchaseHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseLog)));
      }
    });

    const unsubStockOuts = onSnapshot(query(collection(db, "stock_out_history"), orderBy("date", "desc")), (snap) => {
      if (!snap.empty) {
        setStockOutHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOutLog)));
      }
    });

    return () => {
      unsubInventory();
      unsubSuppliers();
      unsubCategories();
      unsubPrintGroups();
      unsubPurchases();
      unsubStockOuts();
    };
  }, []);

  // Notifications pool
  const notificationsList = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const today = new Date();

    inventory.forEach(item => {
      const total = item.storeQty;
      if (total === 0) {
        list.push({ id: `notif_out_${item.id}`, type: "Out of Stock", text: `🚨 ${item.name} पूरी तरह स्टॉक से बाहर है!`, time: "Action Required" });
      } else if (total < item.minLimit) {
        list.push({ id: `notif_low_${item.id}`, type: "Low Stock", text: `⚠️ ${item.name} का स्टॉक कम है (${total} ${item.unit} शेष)`, time: "Restock soon" });
      }

      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        const timeDiff = exp.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if (daysDiff <= 3 && daysDiff >= 0) {
          list.push({ id: `notif_exp_${item.id}`, type: "Expiry Warning", text: `⏰ ${item.name} अगले ${daysDiff} दिन में एक्सपायर होने वाला है!`, time: "Use immediately" });
        }
      }
    });
    return list;
  }, [inventory]);

  // Unified Smart Camera Handlers
  const startCamera = async () => {
    setCameraPermissionError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera access failed:", err);
      setCameraPermissionError(true);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (scannerActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scannerActive]);

  // Unified AI Capture Handler
  const handleAIScanCapture = () => {
    triggerHaptic();
    setIsScannerProcessing(true);

    setTimeout(() => {
      setIsScannerProcessing(false);

      if (scannerMode === 'barcode') {
        // Mock random item matched via Barcode
        const randomItem = inventory[Math.floor(Math.random() * inventory.length)] || inventory[0];
        setScannedItemsToVerify([
          {
            itemId: randomItem.id,
            name: randomItem.name,
            qty: 10,
            price: randomItem.purchasePrice,
            unit: randomItem.unit,
            category: randomItem.category,
            supplier: randomItem.supplier || 'Unknown Supplier'
          }
        ]);
        toastMessage("बारकोड से सामग्री की पहचान हो गई है!");
      } else {
        // Mock Bill Mode extraction containing multiple items
        setScannedItemsToVerify([
          { itemId: "dry_1", name: "Doodh Milk", qty: 20, price: 60, unit: "Ltr", category: "Dairy", supplier: "Sony Dairy" },
          { itemId: "dry_2", name: "Dahi Curd", qty: 15, price: 80, unit: "Kg", category: "Dairy", supplier: "Sony Dairy" },
          { itemId: "veg_2", name: "Tamatar Tomato", qty: 10, price: 40, unit: "Kg", category: "Vegetables", supplier: "Rajesh Traders" }
        ]);
        toastMessage("बिल से 3 सामग्रियां सफलतापूर्वक निकाली गईं!");
      }
    }, 2000);
  };

  // Verification Screen Edit Handlers
  const handleUpdateVerifyItem = (index: number, field: 'qty' | 'price', val: number) => {
    setScannedItemsToVerify(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleSaveVerifiedItems = async () => {
    triggerHaptic();
    if (scannedItemsToVerify.length === 0) return;

    try {
      const batch = writeBatch(db);

      for (const sItem of scannedItemsToVerify) {
        const itemRef = doc(db, "godown_inventory", sItem.itemId);
        const matchInInventory = inventory.find(i => i.id === sItem.itemId);
        
        const finalItemData = {
          id: sItem.itemId,
          name: sItem.name,
          category: sItem.category,
          unit: sItem.unit,
          purchasePrice: sItem.price,
          supplier: sItem.supplier,
          minLimit: matchInInventory ? matchInInventory.minLimit : 10,
          lastPurchaseDate: new Date().toISOString().split('T')[0],
          storeQty: increment(sItem.qty) // Increment stock directly
        };

        batch.set(itemRef, finalItemData, { merge: true });

        // Add to history
        const logRef = doc(collection(db, "purchase_history"));
        batch.set(logRef, {
          itemName: sItem.name,
          qty: sItem.qty,
          unit: sItem.unit,
          price: sItem.price,
          supplier: sItem.supplier,
          date: new Date().toISOString().split('T')[0],
          invoiceNo: `SCAN-AI-${Math.floor(Math.random() * 9000 + 1000)}`,
          paymentType: "Cash/UPI"
        });
      }

      await batch.commit();
      toastMessage("सत्यापित स्टॉक सफलतापूर्वक सहेजा गया!");
      setScannerActive(false);
      setScannedItemsToVerify([]);
    } catch (err) {
      console.error(err);
      toastMessage("डेटा सेव करने में त्रुटि हुई।", "error");
    }
  };

  // Nav Handlers
  const handleNavClick = (tab: 'home' | 'store' | 'print' | 'more') => {
    setActiveTab(tab);
    if (tab === 'home') setCurrentView('dashboard');
    else if (tab === 'store') setCurrentView('main_store');
    else if (tab === 'print') setCurrentView('print_items');
  };

  // Supplier Controls
  const handleSupplierAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier.name.trim()) return;

    try {
      const payload = {
        name: formSupplier.name.trim(),
        phone: formSupplier.phone.trim() || "N/A",
        address: formSupplier.address.trim() || "N/A",
        pendingCredit: parseFloat(formSupplier.pendingCredit) || 0
      };

      const customId = `sup_${Date.now()}`;
      await setDoc(doc(db, "suppliers", customId), payload, { merge: true });
      toastMessage("Merchant Registered!");
      setShowAddSupplierModal(false);
      setFormSupplier({ name: '', phone: '', address: '', pendingCredit: '0' });
    } catch (err) {
      toastMessage("Failed to save supplier.", "error");
    }
  };

  const handleSupplierEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    try {
      await setDoc(doc(db, "suppliers", editingSupplier.id), {
        name: editingSupplier.name,
        phone: editingSupplier.phone,
        address: editingSupplier.address,
        pendingCredit: editingSupplier.pendingCredit
      }, { merge: true });

      toastMessage("Supplier details modified!");
      setEditingSupplier(null);
    } catch (err) {
      toastMessage("Failed to edit supplier.", "error");
    }
  };

  const handleSupplierDelete = async (id: string, name: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप सप्लायर "${name}" को डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "suppliers", id));
      toastMessage("Supplier Removed Successfully!");
    } catch (err) {
      toastMessage("Failed to remove supplier.", "error");
    }
  };

  const handleItemDelete = async (id: string, name: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप आइटम "${name}" को हमेशा के लिए डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "godown_inventory", id));
      setSelectedItemDetail(null);
      toastMessage("Item Removed Successfully!");
    } catch (err) {
      toastMessage("Failed to delete item.", "error");
    }
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await setDoc(doc(db, "godown_inventory", editingItem.id), {
        name: editingItem.name,
        category: editingItem.category,
        purchasePrice: editingItem.purchasePrice,
        minLimit: editingItem.minLimit,
        barcode: editingItem.barcode || ""
      }, { merge: true });

      toastMessage("विवरण संशोधित किया गया!");
      setEditingItem(null);
      setSelectedItemDetail(null);
    } catch (err) {
      toastMessage("Failed to update item.", "error");
    }
  };

  // Stock In / Purchase Submit
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStockIn.item || !formStockIn.quantity || !formStockIn.price) {
      toastMessage("All fields are required!", "error");
      return;
    }

    const qtyNum = parseFloat(formStockIn.quantity);
    const priceNum = parseFloat(formStockIn.price);

    try {
      const exists = inventory.find(i => i.name.toUpperCase() === formStockIn.item.toUpperCase());
      const customId = exists ? exists.id : `item_${Date.now()}`;
      
      const payload = {
        id: customId,
        name: formStockIn.item.toUpperCase(),
        category: formStockIn.category,
        storeQty: exists ? increment(qtyNum) : qtyNum,
        unit: formStockIn.unit,
        purchasePrice: priceNum,
        minLimit: exists ? exists.minLimit : 15,
        supplier: formStockIn.supplier || "Walk-In Supplier",
        lastPurchaseDate: new Date().toISOString().split('T')[0]
      };

      await setDoc(doc(db, "godown_inventory", customId), payload, { merge: true });

      await addDoc(collection(db, "purchase_history"), {
        itemName: formStockIn.item.toUpperCase(),
        qty: qtyNum,
        unit: formStockIn.unit,
        price: priceNum,
        supplier: formStockIn.supplier || "Walk-In",
        date: new Date().toISOString().split('T')[0],
        invoiceNo: formStockIn.invoiceNo || "INV-TEMP",
        paymentType: formStockIn.paymentType
      });

      toastMessage("स्टॉक सफलतापूर्वक इन किया गया!");
      setShowAddStockModal(false);
      setFormStockIn({ 
        invoiceNo: '', supplier: '', item: '', category: 'Raw Material', quantity: '', unit: 'Kg', price: '', gst: '5', expiry: '', batch: '', uploadInvoice: '',
        paymentType: 'Cash/UPI'
      });
    } catch (err) {
      toastMessage("Stock In failed.", "error");
    }
  };

  // Purchase Bill Edit Submission
  const handlePurchaseLogEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchaseLog) return;

    try {
      await setDoc(doc(db, "purchase_history", editingPurchaseLog.id), {
        itemName: editingPurchaseLog.itemName,
        qty: editingPurchaseLog.qty,
        unit: editingPurchaseLog.unit,
        price: editingPurchaseLog.price,
        supplier: editingPurchaseLog.supplier,
        invoiceNo: editingPurchaseLog.invoiceNo,
        paymentType: editingPurchaseLog.paymentType,
        date: editingPurchaseLog.date
      }, { merge: true });

      toastMessage("बिल सफलतापूर्वक संशोधित किया गया!");
      setEditingPurchaseLog(null);
    } catch (err) {
      toastMessage("बिल एडिट करने में त्रुटि हुई।", "error");
    }
  };

  // Direct manual save to Firestore
  const saveItemStockQty = async (id: string) => {
    triggerHaptic();
    const updatedQty = editedQties[id];
    if (updatedQty === undefined) return;

    const targetItem = inventory.find(i => i.id === id);
    if (!targetItem) return;

    try {
      await setDoc(doc(db, "godown_inventory", id), {
        ...targetItem,
        storeQty: updatedQty,
        lastPurchaseDate: new Date().toISOString().split('T')[0]
      }, { merge: true });

      setEditedQties(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      toastMessage("स्टॉक सफलतापूर्वक सेव हो गया!");
    } catch (err) {
      console.error(err);
      toastMessage("डेटाबेस में सेव करने में त्रुटि हुई।", "error");
    }
  };

  // Direct manual qty change
  const adjustQuickStoreQty = (id: string, adjustment: number) => {
    triggerHaptic();
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    const currentVal = editedQties[id] !== undefined ? editedQties[id] : item.storeQty;
    const newVal = Math.max(0, currentVal + adjustment);

    setEditedQties(prev => ({
      ...prev,
      [id]: newVal
    }));
  };

  // Reset stock to 0
  const setStockToZero = (id: string) => {
    triggerHaptic();
    setEditedQties(prev => ({
      ...prev,
      [id]: 0
    }));
    toastMessage("स्टॉक की वैल्यू 0 सेट की गई! कृपया इसे 'सेव करें' पर क्लिक कर सुरक्षित करें।", "info");
  };

  // Audit Reconciliation Action
  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!auditItemSelect || !auditPhysicalCount) return;

    const physicalCount = parseFloat(auditPhysicalCount);
    if (isNaN(physicalCount) || physicalCount < 0) {
      toastMessage("कृपया सही भौतिक मात्रा दर्ज करें!", "error");
      return;
    }

    const targetItem = inventory.find(i => i.id === auditItemSelect);
    if (!targetItem) return;

    const systemCount = targetItem.storeQty;
    const variance = physicalCount - systemCount;

    try {
      await setDoc(doc(db, "godown_inventory", targetItem.id), {
        ...targetItem,
        storeQty: physicalCount
      }, { merge: true });

      if (variance !== 0) {
        await addDoc(collection(db, "stock_out_history"), {
          itemName: targetItem.name,
          qty: Math.abs(variance),
          purpose: variance < 0 ? "Waste" : "Kitchen Use",
          date: new Date().toISOString().split('T')[0],
          remarks: `Audit Alignment (System: ${systemCount}, Physical: ${physicalCount})`,
          financialLoss: variance < 0 ? (Math.abs(variance) * targetItem.purchasePrice) : 0
        });
      }

      toastMessage("Audit completed successfully. Stock aligned!", "success");
      setShowAuditReconcileModal(false);
      setAuditItemSelect("");
      setAuditPhysicalCount("");
    } catch (err) {
      toastMessage("Audit alignment failed.", "error");
    }
  };

  // Trigger Category-Wise CSV Export
  const triggerCategoryWiseExport = () => {
    triggerHaptic();
    const sortedInventory = [...inventory].sort((a, b) => a.category.localeCompare(b.category));
    const headers = ["Category", "Item Name", "Quantity", "Unit", "Total Value (INR)"];
    const rows = sortedInventory.map(item => [
      item.category,
      item.name,
      item.storeQty,
      item.unit,
      item.storeQty * item.purchasePrice
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CategoryWise_Stock_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastMessage("Category Wise CSV report generated!");
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0F0F0F] text-white' : 'bg-[#FAFAFA] text-neutral-900'} pb-24 font-sans relative transition-colors duration-300`}>

      {/* Toast Notification HUD */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 
              toast.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : 'bg-orange-500/90 border-orange-400 text-white'
            }`}
          >
            <Sparkles size={16} />
            <span className="text-xs font-black uppercase tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREMIUM HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-lg border-b ${isDarkMode ? 'bg-[#0F0F0F]/80 border-neutral-800' : 'bg-white/80 border-neutral-100'} p-4`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/20">
              ☕
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-[#FF6B00]">BUM BUM CAFE</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider font-sans">Godown Inventory Hub</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unified Super Smart Scanner Trigger */}
            <button 
              onClick={() => {
                triggerHaptic();
                setScannerActive(true);
              }}
              className="p-2.5 bg-orange-500 text-white hover:bg-orange-600 rounded-xl transition-all flex items-center gap-1 shadow"
              title="Super Smart AI Scanner"
            >
              <QrCode size={16} className="animate-pulse" />
              <span className="text-[9px] font-black uppercase font-sans">AI Scan</span>
            </button>

            {/* Notifications Trigger Bell */}
            <button 
              onClick={() => setShowNotifications(true)}
              className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl text-neutral-400 relative transition-all"
            >
              <Bell size={16} />
              {notificationsList.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">
                  {notificationsList.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className="max-w-md mx-auto px-4 pt-4 pb-20 space-y-6">

        {/* ==========================================
            TAB 1: DASHBOARD (HOME)
            ========================================== */}
        {activeTab === 'home' && currentView === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Hero Banner */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-5 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                <Flame size={160} />
              </div>
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-200">BUM BUM CAFE OPZ</span>
                <h2 className="text-xl font-black">Stock Management</h2>
                <p className="text-xs text-orange-100 font-medium">Daily operations control, multi-store logistics and material tracking.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10 relative z-10">
                <div onClick={() => { triggerHaptic(); setShowAddStockModal(true); }} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl text-center backdrop-blur-md cursor-pointer transition-all">
                  <PlusCircle size={18} className="mx-auto mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-wider block">Add Stock</span>
                </div>
                <div onClick={() => { triggerHaptic(); setShowStockOutModal(true); }} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl text-center backdrop-blur-md cursor-pointer transition-all">
                  <MinusCircle size={18} className="mx-auto mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-wider block">Stock Out</span>
                </div>
              </div>
            </div>

            {/* DASHBOARD ANALYTICS CARDS */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-1">Inventory Valuations</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Total Godown Value</p>
                  <h4 className="text-lg font-black text-[#FF6B00] mt-1">₹{dashboardStats.totalStockVal.toLocaleString()}</h4>
                </div>
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Wastage / Loss Value</p>
                  <h4 className="text-lg font-black text-red-500 mt-1">₹{dashboardStats.monthlyFinancialWastageLoss.toLocaleString()}</h4>
                </div>
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Critical Low Items</p>
                  <h4 className="text-lg font-black text-amber-500 mt-1">{dashboardStats.lowStockCount} Items</h4>
                </div>
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Out of Stock</p>
                  <h4 className="text-lg font-black text-red-500 mt-1">{dashboardStats.outOfStockCount} Items</h4>
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-1 font-sans">Quick Actions Panel</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div onClick={() => setShowAddStockModal(true)} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm cursor-pointer hover:border-orange-500 transition-all`}>
                  <Plus className="mx-auto text-[#FF6B00]" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1 font-sans">Add Stock</span>
                </div>
                <div onClick={() => setShowStockOutModal(true)} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm cursor-pointer hover:border-orange-500 transition-all`}>
                  <MinusCircle className="mx-auto text-red-500" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1 font-sans">Stock Out</span>
                </div>
                <div onClick={() => { setActiveTab('more'); setCurrentView('reports_list'); }} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm cursor-pointer hover:border-orange-500 transition-all`}>
                  <BarChart3 className="mx-auto text-emerald-500" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1 font-sans">Reports</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 2: MAIN STORE (GODOWN)
            ========================================== */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            
            {/* STICKY SEARCH BAR & CATEGORIES */}
            <div className={`sticky top-[72px] z-30 ${isDarkMode ? 'bg-[#0F0F0F]' : 'bg-[#FAFAFA]'} pb-3 pt-1 space-y-3`}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                <input 
                  type="text"
                  placeholder="सामग्री खोजें... (Category, Supplier, Item Name)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 text-xs font-bold"
                />
              </div>

              {/* CATEGORY FILTER SWITCHES */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none font-sans">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all ${
                    selectedCategory === "All" 
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                      : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all ${
                      selectedCategory === cat 
                        ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                        : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-widest text-neutral-400 font-sans">Main Store Godown</h2>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans">Bulk inventory control system</p>
              </div>
              <button 
                onClick={() => setShowAddStockModal(true)}
                className="px-4 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-1.5 shadow"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>

            {/* CATEGORY-WISE PRINT EXPORT SHORTCUT & MULTI SELECT TRIGGER */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={triggerCategoryWiseExport}
                className="p-3 bg-green-600/10 hover:bg-green-600/20 text-green-600 border border-green-600/20 font-black uppercase rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow font-sans"
              >
                <FileSpreadsheet size={14} /> Export Category CSV
              </button>

              <button
                onClick={() => {
                  triggerHaptic();
                  setIsMultiSelectMode(!isMultiSelectMode);
                  setSelectedItemIds([]);
                }}
                className={`p-3 border font-black uppercase rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow font-sans ${
                  isMultiSelectMode 
                    ? 'bg-orange-500 text-white border-orange-500' 
                    : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
                }`}
              >
                <Layers size={14} /> {isMultiSelectMode ? "Stop Select" : "Multi Select"}
              </button>
            </div>

            {/* INVENTORY CARD LIST GRID */}
            <div className="space-y-3.5">
              {filteredInventory.map(item => {
                const isLow = item.storeQty < item.minLimit;
                const isItemSelected = selectedItemIds.includes(item.id);
                
                // Get current display quantity (either edited locally or from database)
                const displayQty = editedQties[item.id] !== undefined ? editedQties[item.id] : item.storeQty;
                const isDirty = editedQties[item.id] !== undefined && editedQties[item.id] !== item.storeQty;

                return (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      if (isMultiSelectMode) {
                        handleToggleMultiSelect(item.id);
                      }
                    }}
                    className={`rounded-3xl border p-4 hover:shadow-lg transition-all ${
                      isMultiSelectMode ? 'cursor-pointer' : ''
                    } ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    } ${isLow ? 'border-amber-500/40 bg-amber-500/[0.02]' : ''} ${
                      isItemSelected ? 'ring-2 ring-[#FF6B00] bg-orange-500/[0.02]' : ''
                    }`}
                  >
                    {isMultiSelectMode && (
                      <div className="absolute top-4 right-4 h-5 w-5 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center">
                        {isItemSelected && <div className="h-3 w-3 rounded-full bg-[#FF6B00]" />}
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div 
                        onClick={() => {
                          if (!isMultiSelectMode) setSelectedItemDetail(item);
                        }} 
                        className="cursor-pointer space-y-0.5 flex-1 pr-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#FF6B00] dark:text-orange-400">{item.name}</span>
                          {isLow && (
                            <span className="bg-red-100 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase font-sans">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{item.category} • {item.supplier}</p>
                        {item.barcode && <p className="text-[8px] text-neutral-400 tracking-wider">Barcode: {item.barcode}</p>}
                        {item.expiryDate && <p className="text-[8px] text-red-400 font-bold">Expiry: {item.expiryDate}</p>}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-500 font-sans">Unit: {item.unit}</span>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5 font-sans">Price: ₹{item.purchasePrice}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 border-t border-b border-neutral-100 dark:border-neutral-800/80 my-3 py-2 text-center text-xs">
                      <div>
                        {/* DIRECT IN-PLACE ENTRY BOX FOR STOCK QUANTITY/VALUE */}
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                          Current Stock (हाल की वैल्यू)
                        </label>
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); adjustQuickStoreQty(item.id, -1); }} 
                              className="p-2 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-xl"
                            >
                              <MinusCircle size={14} />
                            </button>
                            
                            <input 
                              type="number"
                              value={displayQty}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setEditedQties(prev => ({ ...prev, [item.id]: isNaN(val) ? 0 : val }));
                              }}
                              className="w-20 text-center font-black text-sm p-1.5 rounded-xl border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-900 dark:text-white"
                            />
                            <span className="text-xs font-bold text-neutral-400 font-sans">{item.unit}</span>

                            <button 
                              onClick={(e) => { e.stopPropagation(); adjustQuickStoreQty(item.id, 1); }} 
                              className="p-2 bg-green-100 dark:bg-green-500/10 text-green-500 rounded-xl"
                            >
                              <PlusCircle size={14} />
                            </button>
                          </div>

                          {/* Quick Actions inside Card */}
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setStockToZero(item.id); }}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                            >
                              🗑️ स्टॉक 0 करें
                            </button>
                            
                            {isDirty && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); saveItemStockQty(item.id); }}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all animate-pulse"
                              >
                                💾 सेव करें
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                      <span className="text-neutral-400 font-sans">Value: ₹{(displayQty * item.purchasePrice).toLocaleString()}</span>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isMultiSelectMode) setSelectedItemDetail(item);
                          }}
                          className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl hover:bg-neutral-200 transition-all font-black font-sans"
                        >
                          <span>Manage</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: DYNAMIC CUSTOM PRINT GROUPS VIEW
            ========================================== */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-widest text-neutral-400 font-sans">Custom Print Categories</h2>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans">Print or export selected stock categories</p>
              </div>
            </div>

            {/* Print Category selectors */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none font-sans">
              <button
                onClick={() => { triggerHaptic(); setActivePrintGroup("All"); }}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all ${
                  activePrintGroupId === "All" 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                    : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
                }`}
              >
                All Lists
              </button>
              {printGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => { triggerHaptic(); setActivePrintGroup(g.id); }}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all ${
                    activePrintGroupId === g.id 
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                      : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* Print Groups rendering stack */}
            <div className="space-y-4">
              {printGroups
                .filter(g => activePrintGroupId === "All" || g.id === activePrintGroupId)
                .map(group => {
                  const matchedItems = inventory.filter(i => group.itemIds.includes(i.id));
                  return (
                    <div key={group.id} className={`p-5 rounded-3xl border space-y-4 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <div className="flex justify-between items-center border-b border-neutral-50 dark:border-neutral-800/80 pb-2">
                        <div>
                          <p className="font-black text-sm uppercase text-[#FF6B00]">{group.name}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-sans">{matchedItems.length} Materials Assigned</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handlePrintGroup(group)}
                            className="p-2 bg-orange-500/10 hover:bg-orange-500 text-[#FF6B00] hover:text-white rounded-xl transition-all"
                            title="Instant Print"
                          >
                            <Printer size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeletePrintGroup(group.id)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                            title="Delete Group"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Display items assigned inside print group */}
                      <div className="space-y-2">
                        {matchedItems.map(item => {
                          const oQtyValue = printOrderQtys[`${group.id}_${item.id}`] || "";
                          return (
                            <div key={item.id} className="flex justify-between items-center p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-xs">
                              <div className="flex-1 pr-3">
                                <p className="font-black text-sm">{item.name}</p>
                                <p className="text-[9px] text-neutral-400 uppercase tracking-wider font-sans">Current Stock: {item.storeQty} {item.unit}</p>
                              </div>

                              {/* MANUAL INPUT FOR ORDER QUANTITY BEFORE PRINTING */}
                              <div className="flex items-center gap-2">
                                <input 
                                  type="text"
                                  placeholder="Buy Qty"
                                  value={oQtyValue}
                                  onChange={(e) => setPrintOrderQtys(prev => ({ ...prev, [`${group.id}_${item.id}`]: e.target.value }))}
                                  className="w-16 p-1.5 rounded-lg border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-center font-bold text-xs text-[#FF6B00]"
                                />
                                <button 
                                  onClick={() => handleRemoveFromPrintGroup(group.id, item.id)}
                                  className="text-neutral-400 hover:text-red-500"
                                  title="Remove from list"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {matchedItems.length === 0 && (
                          <p className="text-center py-4 text-[10px] text-neutral-400 uppercase font-black">No items added to this print list...</p>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: MORE OVERLAY / DETAILS
            ========================================== */}
        {activeTab === 'more' && (
          <div className="space-y-6">
            
            {currentView === 'dashboard' || currentView === 'more_home' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6B00] font-black">
                    ➕
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">More Operational Features</h2>
                    <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider font-sans">Access configurations, audits, and settings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { id: 'stock_in', label: "Purchase / Stock In", desc: "Log invoices and stock incoming goods", icon: <PlusCircle size={16} /> },
                    { id: 'stock_out_logs', label: "Stock Out Logs", desc: "View wastage, damage, and staff use logs", icon: <MinusCircle size={16} /> },
                    { id: 'categories_manager', label: "Manage Categories", desc: "Add, Edit or Remove raw material categories", icon: <Layers size={16} /> },
                    { id: 'audit_manager', label: "Physical Stock Reconciliation", desc: "Audit and align physical counts with system", icon: <CheckCircle2 size={16} /> },
                    { id: 'reports_list', label: "Reports & Analytics", desc: "Download simulated Excel & PDF stock sheets", icon: <BarChart3 size={16} /> },
                    { id: 'suppliers_list', label: "Manage Suppliers", desc: "Add, edit, delete, and trigger orders", icon: <Truck size={16} /> },
                    { id: 'app_settings', label: "App Settings", desc: "Theme control, auto-sync, database options", icon: <Settings size={16} /> },
                  ].map(option => (
                    <div 
                      key={option.id}
                      onClick={() => {
                        setCurrentView(option.id);
                      }}
                      className={`p-4 rounded-3xl border cursor-pointer hover:border-orange-500 flex items-center justify-between transition-all ${
                        isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-orange-500">{option.icon}</div>
                        <div>
                          <p className="font-bold">{option.label}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5">{option.desc}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-neutral-400" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* A. PURCHASE / STOCK IN SCREEN */}
            {currentView === 'stock_in' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between font-sans">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Purchase Log / Stock In</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <form onSubmit={handleStockInSubmit} className={`p-5 rounded-3xl border space-y-3 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <div className="space-y-1">
                    <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Invoice Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. INV-2026-904"
                      value={formStockIn.invoiceNo}
                      onChange={e => setFormStockIn({...formStockIn, invoiceNo: e.target.value})}
                      className="w-full p-3 rounded-2xl border dark:bg-neutral-800 dark:border-neutral-700" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 font-sans">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Supplier</label>
                      <select 
                        value={formStockIn.supplier}
                        onChange={e => setFormStockIn({...formStockIn, supplier: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800 dark:border-neutral-700 cursor-pointer"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Item Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. GUD"
                        value={formStockIn.item}
                        onChange={e => setFormStockIn({...formStockIn, item: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800" 
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Quantity</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 50"
                        value={formStockIn.quantity}
                        onChange={e => setFormStockIn({...formStockIn, quantity: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800" 
                        required
                      />
                    </div>
                    <div className="space-y-1 font-sans">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Unit</label>
                      <select 
                        value={formStockIn.unit}
                        onChange={e => setFormStockIn({...formStockIn, unit: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800 cursor-pointer"
                      >
                        <option value="Kg">Kg</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Tins">Tins</option>
                        <option value="Packets">Packets</option>
                        <option value="Ltr">Ltr</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Purchase Price</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 140"
                        value={formStockIn.price}
                        onChange={e => setFormStockIn({...formStockIn, price: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800" 
                        required
                      />
                    </div>
                    <div className="space-y-1 font-sans">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Category</label>
                      <select 
                        value={formStockIn.category}
                        onChange={e => setFormStockIn({...formStockIn, category: e.target.value})}
                        className="w-full p-3 rounded-xl border dark:bg-neutral-800 cursor-pointer font-sans"
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-sans">
                    <label className="font-black uppercase tracking-wider text-neutral-400 text-[8px] font-sans">Payment Method</label>
                    <select 
                      value={formStockIn.paymentType}
                      onChange={e => setFormStockIn({...formStockIn, paymentType: e.target.value as any})}
                      className="w-full p-3 rounded-2xl border bg-orange-500/10 border-orange-500/20 text-[#FF6B00] font-black cursor-pointer font-sans"
                    >
                      <option value="Cash/UPI">Cash / UPI</option>
                      <option value="Credit Ledger">Supplier Credit Ledger</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl font-black uppercase tracking-wider shadow">
                    Save Receipt ➔
                  </button>
                </form>

                {/* Purchase Log History with EDIT/DELETE button */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 font-sans">Incoming Purchase Audit Log</h4>
                  {purchaseHistory.map(log => (
                    <div key={log.id} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} text-xs space-y-1`}>
                      <div className="flex justify-between items-start font-sans">
                        <div>
                          <span className="font-bold text-sm block">{log.itemName}</span>
                          <span className="text-[10px] text-neutral-400 font-black block">BILL: {log.invoiceNo || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => setEditingPurchaseLog(log)}
                            className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                            title="Edit Bill Log"
                          >
                            <Edit size={12} />
                          </button>
                          <span className="text-green-500 font-bold text-sm">₹{log.price * log.qty}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-neutral-400 uppercase font-sans">Qty: {log.qty} {log.unit} • Sulp: {log.supplier} • {log.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. STOCK OUT HISTORY */}
            {currentView === 'stock_out_logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Outward Dispatches</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <div className="space-y-2.5">
                  {stockOutHistory.map(log => (
                    <div key={log.id} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} text-xs space-y-2`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{log.itemName}</span>
                        <span className="bg-red-100 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide">
                          {log.purpose}
                        </span>
                      </div>
                      <p className="text-neutral-500">{log.remarks}</p>
                      <div className="flex justify-between text-[9px] text-neutral-400 uppercase tracking-widest border-t border-neutral-50 dark:border-neutral-800/80 pt-2 font-sans">
                        <span>Quantity: {log.qty}</span>
                        {log.financialLoss && log.financialLoss > 0 ? (
                          <span className="text-red-500 font-bold">Loss: ₹{log.financialLoss}</span>
                        ) : null}
                        <span>{log.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. REPORTS PANEL */}
            {currentView === 'reports_list' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Reports Engine</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider font-sans">Back</button>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { title: "Daily Store Audit Report", type: "Daily_Report" },
                    { title: "Weekly Consumption Analysis", type: "Weekly_Report" },
                    { title: "Monthly Stock Valuation Ledger", type: "Monthly_Report" },
                    { title: "Wastage and Discards Auditor", type: "Wastage_Report" },
                  ].map((rep, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-3xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{rep.title}</p>
                        <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5 font-sans">Automated compilation engine</p>
                      </div>

                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => triggerSimulationExport(rep.type)}
                          className="px-2.5 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] rounded-xl flex items-center gap-1 font-bold text-[9px] uppercase hover:bg-[#FF6B00]/20"
                        >
                          <FileSpreadsheet size={12} /> Excel
                        </button>
                        <button 
                          onClick={() => {
                            triggerHaptic();
                            toastMessage("PDF Report successfully compiled!");
                          }}
                          className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl flex items-center gap-1 font-bold text-[9px] uppercase font-sans"
                        >
                          <FileText size={12} /> PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D. MANAGE SUPPLIERS */}
            {currentView === 'suppliers_list' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between font-sans">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Supplier Register</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider font-sans">Back</button>
                </div>

                <button 
                  onClick={() => setShowAddSupplierModal(true)}
                  className="w-full p-3 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow font-sans"
                >
                  <Plus size={14} /> Add New Supplier
                </button>

                <div className="grid grid-cols-1 gap-2.5 text-xs font-sans">
                  {suppliers.map((s) => (
                    <div key={s.id} className={`p-4 rounded-3xl border flex flex-col gap-3 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-[#FF6B00] text-sm">{s.name}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">📞 {s.phone} • 📍 {s.address}</p>
                          <p className="text-[10px] font-bold mt-1 text-red-500 uppercase tracking-wide font-sans">Pending Credit: ₹{s.pendingCredit.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => setEditingSupplier(s)}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all"
                            title="Edit Supplier"
                          >
                            <Edit size={13} />
                          </button>
                          <button 
                            onClick={() => handleSupplierDelete(s.id, s.name)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                            title="Delete Supplier"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. MANAGE CATEGORIES */}
            {currentView === 'categories_manager' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Raw Material Categories</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider font-sans">Back</button>
                </div>

                <form onSubmit={handleCategoryAdd} className="flex gap-2 text-xs font-sans">
                  <input 
                    type="text" 
                    placeholder="New category (e.g. Spices)" 
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value)}
                    className="flex-1 p-3 rounded-2xl border dark:bg-[#1A1A1A] dark:border-neutral-800"
                    required
                  />
                  <button type="submit" className="px-5 py-3 bg-[#FF6B00] text-white rounded-2xl font-black uppercase font-sans">Add</button>
                </form>

                <div className="grid grid-cols-1 gap-2 text-xs font-sans">
                  {categories.map((cat, idx) => (
                    <div key={idx} className={`p-4 rounded-3xl border flex items-center justify-between ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <span className="font-bold">{cat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* F. PHYSICAL RECONCILIATION AUDIT PANEL */}
            {currentView === 'audit_manager' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Audit Reconciliation</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>
                
                <div className={`p-5 rounded-3xl border space-y-4 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider">मौजूदा स्टॉक को भौतिक स्टॉक से मिलाने के लिए यहाँ दर्ज करें:</p>
                  <button 
                    onClick={() => setShowAuditReconcileModal(true)}
                    className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                  >
                    📝 भौतिक मिलान (Audit) फॉर्म खोलें
                  </button>
                </div>
              </div>
            )}

            {/* G. SETTINGS */}
            {currentView === 'app_settings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Configuration</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>
                <div className={`p-5 rounded-3xl border space-y-4 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide">Dark Mode Preference</p>
                    </div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl">
                      {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ==========================================
          8. DETAILED DRAWERS & MODALS
          ========================================== */}
      <AnimatePresence>
        
        {/* A. NOTIFICATIONS DRAWER (BELL ICON CLICK) */}
        {showNotifications && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-end justify-center font-sans">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`w-full max-w-md rounded-t-[2.5rem] p-6 space-y-5 border-t ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <Bell size={16} className="text-[#FF6B00]" />
                  <span className="font-black text-xs uppercase tracking-widest">स्टॉक अलर्ट और नोटिफिकेशन</span>
                </div>
                <button onClick={() => setShowNotifications(false)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {notificationsList.map(notif => (
                  <div key={notif.id} className="p-3.5 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold">{notif.text}</p>
                      <span className="text-[9px] text-neutral-400 uppercase tracking-widest block mt-0.5">{notif.time}</span>
                    </div>
                    <span className="text-[8px] bg-orange-500/10 text-[#FF6B00] px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                      {notif.type}
                    </span>
                  </div>
                ))}

                {notificationsList.length === 0 && (
                  <div className="text-center py-10 space-y-2">
                    <CheckCircle2 size={24} className="mx-auto text-green-500" />
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">सब ठीक है! कोई क्रिटिकल नोटिफिकेशन नहीं है।</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* B. PRODUCT DETAIL DRAWER */}
        {selectedItemDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-end justify-center font-sans">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`w-full max-w-md rounded-t-[2.5rem] p-6 space-y-5 border-t ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00]">BumBum Master Details</span>
                  <h3 className="text-lg font-black">{selectedItemDetail.name}</h3>
                  <p className="text-neutral-400 text-xs mt-0.5">{selectedItemDetail.category} • Barcode: {selectedItemDetail.barcode || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingItem(selectedItemDetail)} className="p-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all"><Edit size={14} /></button>
                  <button onClick={() => handleItemDelete(selectedItemDetail.id, selectedItemDetail.name)} className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"><Trash2 size={14} /></button>
                  <button onClick={() => setSelectedItemDetail(null)} className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-400 rounded-xl"><X size={15} /></button>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl text-center text-xs">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Main Godown Available Stock</span>
                <span className="font-black text-sm">{selectedItemDetail.storeQty} {selectedItemDetail.unit}</span>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Activity & Delivery Audit</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-neutral-400" />
                      <span>Last Inward Invoice Log</span>
                    </div>
                    <span className="text-neutral-400">{selectedItemDetail.lastPurchaseDate}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Truck size={12} className="text-neutral-400" />
                      <span>Supplier Agency Partner</span>
                    </div>
                    <span className="font-bold text-[#FF6B00]">{selectedItemDetail.supplier}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* C. ITEM EDIT MASTER OVERLAY */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleEditItemSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Edit Stock Item Details</h3>
                <button type="button" onClick={() => setEditingItem(null)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1.5 text-xs font-sans">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Item Name</label>
                <input 
                  type="text" 
                  value={editingItem.name} 
                  onChange={e => setEditingItem({...editingItem, name: e.target.value.toUpperCase()})}
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Category</label>
                  <select 
                    value={editingItem.category} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 font-sans">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Purchase Price</label>
                  <input 
                    type="number" 
                    value={editingItem.purchasePrice} 
                    onChange={e => setEditingItem({...editingItem, purchasePrice: parseFloat(e.target.value) || 0})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-sans"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Min Stock Limit</label>
                  <input 
                    type="number" 
                    value={editingItem.minLimit} 
                    onChange={e => setEditingItem({...editingItem, minLimit: parseInt(e.target.value) || 0})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Barcode</label>
                  <input 
                    type="text" 
                    value={editingItem.barcode || ""} 
                    onChange={e => setEditingItem({...editingItem, barcode: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    placeholder="Barcode Number"
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow font-sans">
                Save Changes ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* D. PURCHASE LOG / BILL EDIT MODAL */}
        {editingPurchaseLog && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handlePurchaseLogEditSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Edit Purchase Receipt</h3>
                <button type="button" onClick={() => setEditingPurchaseLog(null)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-[9px] uppercase tracking-wider text-neutral-400">Material Name</label>
                <input 
                  type="text" 
                  value={editingPurchaseLog.itemName} 
                  onChange={e => setEditingPurchaseLog({...editingPurchaseLog, itemName: e.target.value})}
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-[9px] uppercase text-neutral-400">Quantity (मात्रा)</label>
                  <input 
                    type="number" 
                    value={editingPurchaseLog.qty} 
                    onChange={e => setEditingPurchaseLog({...editingPurchaseLog, qty: parseFloat(e.target.value) || 0})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[9px] uppercase text-neutral-400">Price (मूल्य)</label>
                  <input 
                    type="number" 
                    value={editingPurchaseLog.price} 
                    onChange={e => setEditingPurchaseLog({...editingPurchaseLog, price: parseFloat(e.target.value) || 0})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-[9px] uppercase text-neutral-400">Supplier</label>
                  <input 
                    type="text" 
                    value={editingPurchaseLog.supplier} 
                    onChange={e => setEditingPurchaseLog({...editingPurchaseLog, supplier: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-[9px] uppercase text-neutral-400">Invoice No</label>
                  <input 
                    type="text" 
                    value={editingPurchaseLog.invoiceNo} 
                    onChange={e => setEditingPurchaseLog({...editingPurchaseLog, invoiceNo: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-green-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow font-sans">
                Update Bill Log ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* E. PHYSICAL RECONCILIATION MODAL */}
        {showAuditReconcileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 font-sans">
            <motion.form 
              onSubmit={handleAuditSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Physical Count Audit</h3>
                <button type="button" onClick={() => setShowAuditReconcileModal(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Select Item to Reconcile</label>
                <select 
                  value={auditItemSelect}
                  onChange={e => setAuditItemSelect(e.target.value)}
                  className="w-full p-3 rounded-xl border dark:bg-neutral-800 cursor-pointer"
                  required
                >
                  <option value="">Choose item...</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (Current Godown: {i.storeQty} {i.unit})</option>)}
                </select>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Physically Counted Count on Shelves</label>
                <input 
                  type="number" 
                  placeholder="Enter counted physical quantity"
                  value={auditPhysicalCount}
                  onChange={e => setAuditPhysicalCount(e.target.value)}
                  className="w-full p-3 rounded-xl border dark:bg-neutral-800" 
                  required
                />
              </div>

              <button type="submit" className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow">
                Save & Align Stock Discrepancy ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* F. UNIFIED SUPER SMART AI SCANNER (WITH LIVE VIDEO VIEW & EDIT-CONFIRM) */}
        {scannerActive && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[150] flex flex-col justify-between p-4 font-sans text-white">
            
            {/* Scanner Header */}
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#FF6B00] flex items-center gap-1.5">
                  <QrCode size={16} /> Super Smart AI Scanner
                </p>
                <p className="text-[8px] text-neutral-400 font-bold uppercase mt-0.5">स्कैनर मोड और सत्यापन पैनल</p>
              </div>
              <button 
                onClick={() => {
                  setScannerActive(false);
                  setScannedItemsToVerify([]);
                }} 
                className="p-2 bg-neutral-800 rounded-xl"
              >
                <X size={15} />
              </button>
            </div>

            {/* Verification / Confirmation & Editing Panel */}
            {scannedItemsToVerify.length > 0 ? (
              <div className="flex-1 flex flex-col justify-between py-4 space-y-4 max-w-sm mx-auto w-full">
                <div className="space-y-2">
                  <h4 className="text-sm font-black uppercase tracking-wider text-green-500 text-center animate-pulse">
                    📋 AI Verification & Confirmation Panel
                  </h4>
                  <p className="text-[10px] text-neutral-400 text-center">सेव करने से पहले यदि Qty या Price गलत है, तो आप नीचे एडिट कर सकते हैं:</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-96">
                  {scannedItemsToVerify.map((item, index) => (
                    <div key={index} className="p-4 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-[#FF6B00]">{item.name}</span>
                        <span className="text-[9px] bg-neutral-800 px-2 py-0.5 rounded-full font-bold uppercase text-neutral-400">
                          {item.unit}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Quantity (मात्रा)</label>
                          <input 
                            type="number"
                            value={item.qty}
                            onChange={(e) => handleUpdateVerifyItem(index, 'qty', parseFloat(e.target.value) || 0)}
                            className="w-full p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 font-black text-center text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-neutral-400">Unit Price (मूल्य)</label>
                          <input 
                            type="number"
                            value={item.price}
                            onChange={(e) => handleUpdateVerifyItem(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full p-2.5 rounded-xl bg-neutral-800 border border-neutral-700 font-black text-center text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={handleSaveVerifiedItems}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow"
                  >
                    Confirm & Update Stock (सत्यापित करें और सेव करें) ➔
                  </button>
                  <button 
                    onClick={() => setScannedItemsToVerify([])}
                    className="w-full py-3 bg-neutral-800 text-neutral-400 rounded-xl text-[10px] font-black uppercase tracking-wider"
                  >
                    ← कैमरे पर वापस जाएं (Scan Again)
                  </button>
                </div>
              </div>
            ) : (
              // Live HTML5 Camera View
              <div className="flex-1 flex flex-col justify-between py-4 space-y-4 max-w-sm mx-auto w-full">
                
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1.5 rounded-2xl border border-neutral-800">
                  <button 
                    onClick={() => setScannerMode('barcode')}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      scannerMode === 'barcode' ? 'bg-[#FF6B00] text-white shadow-md' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Barcode mode
                  </button>
                  <button 
                    onClick={() => setScannerMode('bill')}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      scannerMode === 'bill' ? 'bg-[#FF6B00] text-white shadow-md' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    AI Bill Scanner mode
                  </button>
                </div>

                {/* Live Camera Viewfinder */}
                <div className="relative h-64 w-full bg-black border border-neutral-800 rounded-3xl overflow-hidden flex items-center justify-center">
                  {!cameraPermissionError ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-5 text-center space-y-2 z-10">
                      <AlertTriangle className="mx-auto text-amber-500" size={32} />
                      <p className="text-[10px] text-neutral-400 font-black uppercase">कैमरा एक्सेस ब्लॉक है या डिवाइस पर उपलब्ध नहीं है!</p>
                      <p className="text-[8px] text-neutral-500">हम आपके लिए Simulated AI स्कैनर इंजन का उपयोग करेंगे।</p>
                    </div>
                  )}

                  {/* Scan line overlay animation */}
                  <span className="absolute left-0 right-0 h-0.5 bg-red-500 animate-bounce top-1/2 z-20" />
                  
                  {isScannerProcessing && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 space-y-3">
                      <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] animate-pulse">
                        Analyzing Document / Barcode...
                      </span>
                    </div>
                  )}
                </div>

                {/* Scan capture trigger button */}
                <div className="space-y-2 text-center text-xs">
                  <button 
                    onClick={handleAIScanCapture}
                    disabled={isScannerProcessing}
                    className="w-full py-4 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-wider shadow"
                  >
                    📷 Capture & Parse with AI (स्कैन करें)
                  </button>
                  <p className="text-[8px] text-neutral-400 font-bold uppercase">यह लाइव कैमरा फ्रेम से जानकारी पढ़कर पुष्टि पैनल खोलेगा</p>
                </div>

              </div>
            )}
          </div>
        )}

        {/* G. MODAL FORM: STOCK IN / INCOMING */}
        {showAddStockModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 font-sans">
            <motion.form 
              onSubmit={handleStockInSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Stock Receipt (Stock In)</h3>
                <button type="button" onClick={() => setShowAddStockModal(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="space-y-1 font-sans">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Item Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CHEESE"
                    value={formStockIn.item}
                    onChange={e => setFormStockIn({...formStockIn, item: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1 font-sans">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Supplier Name</label>
                  <select 
                    value={formStockIn.supplier}
                    onChange={e => setFormStockIn({...formStockIn, supplier: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Qty</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 10"
                    value={formStockIn.quantity}
                    onChange={e => setFormStockIn({...formStockIn, quantity: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Unit</label>
                  <select 
                    value={formStockIn.unit}
                    onChange={e => setFormStockIn({...formStockIn, unit: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:bg-neutral-800 cursor-pointer"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Tins">Tins</option>
                    <option value="Packets">Packets</option>
                    <option value="Ltr">Ltr</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Purchase Price</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 440"
                    value={formStockIn.price}
                    onChange={e => setFormStockIn({...formStockIn, price: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1 font-sans">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Category</label>
                  <select 
                    value={formStockIn.category}
                    onChange={e => setFormStockIn({...formStockIn, category: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:bg-neutral-800 cursor-pointer"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow">
                Complete Stock In ➔
              </button>
            </motion.form>
          </div>
        )}

      </AnimatePresence>

      {/* FIXED PREMIUM BOTTOM NAVIGATION BAR */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0F0F0F]/90 border-neutral-800 text-white' : 'bg-white/90 border-neutral-100 text-neutral-800'
      }`}>
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1 py-2 text-center">
          <button 
            onClick={() => handleNavClick('home')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'home' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Home size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block">Home</span>
          </button>

          <button 
            onClick={() => handleNavClick('store')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'store' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Store size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block font-sans">Godown Stock</span>
          </button>

          <button 
            onClick={() => handleNavClick('more')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'more' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <MoreHorizontal size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block font-sans">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
