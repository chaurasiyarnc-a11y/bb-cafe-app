

'use client';

import React, { useState, useMemo } from 'react';
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

// ==========================================
// 1. TYPINGS & INTERFACES
// ==========================================
interface InventoryItem {
  id: string;
  name: string;
  category: string;
  storeQty: number;
  cafeQty?: number; // Optional fallback
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

const triggerHaptic = (ms = 35) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
};

// ==========================================
// 2. MASTER INITIAL INVENTORY SEED DATA (FROM KHATABOOK PDF)
// ==========================================
const INITIAL_INVENTORY: InventoryItem[] = [
  // Spices & Raw Materials
  { id: "rep_1", name: "OREGON SACHETS", category: "Raw Material", storeQty: 5, unit: "Pcs", purchasePrice: 150, minLimit: 10, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800301" },
  { id: "rep_2", name: "CHILLI FLAKES", category: "Raw Material", storeQty: 2, unit: "Pcs", purchasePrice: 150, minLimit: 10, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800302" },
  { id: "rep_3", name: "FRESH YEAST KOBO", category: "Raw Material", storeQty: 0, unit: "Pcs", purchasePrice: 80, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800303" },
  { id: "rep_4", name: "MEDA", category: "Raw Material", storeQty: 10, unit: "Kg", purchasePrice: 40, minLimit: 15, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800304" },
  { id: "rep_5", name: "SUGER POWDER", category: "Raw Material", storeQty: 0, unit: "Kg", purchasePrice: 45, minLimit: 8, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800304" },
  { id: "rep_6", name: "MOZZARELLA CHEESE", category: "Dairy", storeQty: 1, unit: "Kg", purchasePrice: 490, minLimit: 5, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800335", expiryDate: "2026-07-16" },
  { id: "rep_7", name: "MAYONNAISE", category: "Raw Material", storeQty: 2, unit: "Pcs", purchasePrice: 160, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800336" },
  { id: "rep_8", name: "PIZZA PASTA SAUCE", category: "Raw Material", storeQty: 8, unit: "Pcs", purchasePrice: 160, minLimit: 10, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800338" },
  
  // Packaging & Disposables
  { id: "rep_9", name: "PIZZA BOX LARGE 10\"", category: "Packaging", storeQty: 400, unit: "Pcs", purchasePrice: 7.50, minLimit: 100, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800357" },
  { id: "rep_10", name: "PIZZA BOX 8\"", category: "Packaging", storeQty: 300, unit: "Pcs", purchasePrice: 4.50, minLimit: 100, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800358" },
  { id: "rep_11", name: "SILVER CONTAINER 500ML", category: "Disposable", storeQty: 150, unit: "Pcs", purchasePrice: 3.50, minLimit: 50, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800319" },
  { id: "rep_12", name: "COLD COFFEE GLASS BIG SET", category: "Disposable", storeQty: 155, unit: "Pcs", purchasePrice: 6.50, minLimit: 50, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800334" },
  
  // Frozen Material & Equipment
  { id: "item_13", name: "FRENCH FRIES", category: "Frozen Material", storeQty: 40, unit: "Kg", purchasePrice: 110, minLimit: 15, supplier: "Sagar Distributors", lastPurchaseDate: "2026-07-12", expiryDate: "2026-10-12", batchNumber: "B-FF890", barcode: "890175800249" },
  { id: "item_14", name: "VEG PATTY", category: "Frozen Material", storeQty: 100, unit: "Pcs", purchasePrice: 18, minLimit: 30, supplier: "Sagar Distributors", lastPurchaseDate: "2026-07-12", expiryDate: "2026-09-12", batchNumber: "B-VP441", barcode: "890175800250" },
  { id: "item_15", name: "DEEP FREEZE", category: "Equipment", storeQty: 2, unit: "Pcs", purchasePrice: 28000, minLimit: 1, supplier: "Sagar Distributors", lastPurchaseDate: "2026-07-01", barcode: "890175800252" }
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
  
  // Custom Dynamic Print Groups State
  const [printGroups, setPrintGroups] = useState<PrintGroup[]>([
    { id: "prg_1", name: "Daily Morning Audit", itemIds: ["rep_1", "rep_4", "top_1"] },
    { id: "prg_2", name: "Urgent Supplier Orders", itemIds: ["rep_6", "pkg_3", "pkg_6"] }
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
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scannerManualBarcode, setScannerManualBarcode] = useState<string>("");
  const [scannedProductDetected, setScannedProductDetected] = useState<InventoryItem | null>(null);
  const [scannedAddQty, setScannedAddQty] = useState<string>("");

  // Form Modals & Managers
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [showStockOutModal, setShowStockOutModal] = useState<boolean>(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [showAuditReconcileModal, setShowAuditReconcileModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [auditItemSelect, setAuditItemSelect] = useState<string>("");
  const [auditPhysicalCount, setAuditPhysicalCount] = useState<string>("");
  
  // Dynamic Category Forms
  const [categoryInput, setCategoryInput] = useState<string>("");
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>("");

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
    { id: "sup_2", name: "Soni Grocery Shop", phone: "9123456780", address: "Station Road, Anand", pendingCredit: 3400 },
    { id: "sup_3", name: "Om Super Market", phone: "9012345678", address: "Cafe Market Street", pendingCredit: 0 },
    { id: "sup_4", name: "Sagar Distributors", phone: "9812736450", address: "GIDC Industrial Estate", pendingCredit: 1280 },
    { id: "sup_5", name: "Sony Dairy", phone: "9900112233", address: "Amul Dairy Road", pendingCredit: 8400 },
    { id: "sup_6", name: "Narmada Packagings", phone: "7014529683", address: "Vapi GIDC", pendingCredit: 4500 },
    { id: "sup_7", name: "Prabhat Polymer", phone: "8989525201", address: "Nadiad Bypass", pendingCredit: 0 }
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

  // Notifications pool (Low stock, Out of Stock, and Expiry Date warnings)
  const notificationsList = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const today = new Date();

    inventory.forEach(item => {
      const total = item.storeQty;
      
      // 1. Stock levels
      if (total === 0) {
        list.push({ id: `notif_out_${item.id}`, type: "Out of Stock", text: `🚨 ${item.name} is completely out of stock!`, time: "Action Required" });
      } else if (total < item.minLimit) {
        list.push({ id: `notif_low_${item.id}`, type: "Low Stock", text: `⚠️ ${item.name} is running low (${total} ${item.unit} left)`, time: "Restock soon" });
      }

      // 2. Expiry dates
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        const timeDiff = exp.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff <= 3 && daysDiff >= 0) {
          list.push({ id: `notif_exp_${item.id}`, type: "Expiry Warning", text: `⏰ ${item.name} is expiring in ${daysDiff} days! (${item.expiryDate})`, time: "Use immediately" });
        }
      }
    });
    return list;
  }, [inventory]);

  // Handle Bottom Nav clicks (routing simulator)
  const handleNavClick = (tab: 'home' | 'store' | 'print' | 'more') => {
    setActiveTab(tab);
    if (tab === 'home') setCurrentView('dashboard');
    else if (tab === 'store') setCurrentView('main_store');
    else if (tab === 'print') setCurrentView('print_items');
  };

  // Dashboard calculation selectors
  const dashboardStats = useMemo(() => {
    let totalStockVal = 0;
    let mainStoreVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach(item => {
      const totalVal = item.storeQty * item.purchasePrice;
      totalStockVal += totalVal;
      mainStoreVal += item.storeQty * item.purchasePrice;

      const combinedQty = item.storeQty;
      if (combinedQty === 0) outOfStockCount++;
      else if (combinedQty < item.minLimit) lowStockCount++;
    });

    const todayPurchases = purchaseHistory
      .filter(p => p.date === "2026-07-14" || p.date === new Date().toISOString().split('T')[0])
      .reduce((sum, p) => sum + (p.qty * p.price), 0);

    const todayWaste = stockOutHistory
      .filter(s => s.date === "2026-07-14" || s.date === new Date().toISOString().split('T')[0])
      .reduce((sum, s) => sum + s.qty, 0);

    const monthlyFinancialWastageLoss = stockOutHistory
      .filter(s => s.purpose === "Waste" || s.purpose === "Damage")
      .reduce((sum, s) => sum + (s.financialLoss || 0), 0);

    return {
      totalStockVal,
      mainStoreVal,
      lowStockCount,
      outOfStockCount,
      todayPurchases,
      todayWaste,
      monthlyFinancialWastageLoss
    };
  }, [inventory, purchaseHistory, stockOutHistory]);

  // Global search & categorized filtering
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // Toast System State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const toastMessage = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Barcode Scan Simulator with Match Logic
  const handleBarcodeManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    if (!scannerManualBarcode.trim()) {
      toastMessage("कृपया सही बारकोड दर्ज करें!", "error");
      return;
    }

    const matchedProduct = inventory.find(
      item => item.barcode === scannerManualBarcode.trim()
    );

    if (matchedProduct) {
      setScannedProductDetected(matchedProduct);
      toastMessage(`Material Found: ${matchedProduct.name}`, "success");
    } else {
      toastMessage("सामग्री नहीं मिली! कृपया बारकोड जांचें।", "error");
    }
  };

  const handleSaveScannedStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProductDetected || !scannedAddQty) return;

    const qtyVal = parseFloat(scannedAddQty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      toastMessage("कृपया सही संख्या दर्ज करें!", "error");
      return;
    }

    setInventory(prev => 
      prev.map(item => {
        if (item.id === scannedProductDetected.id) {
          return { ...item, storeQty: item.storeQty + qtyVal, lastPurchaseDate: new Date().toISOString().split('T')[0] };
        }
        return item;
      })
    );

    const newPurchase: PurchaseLog = {
      id: `p_${Date.now()}`,
      itemName: scannedProductDetected.name,
      qty: qtyVal,
      unit: scannedProductDetected.unit,
      price: scannedProductDetected.purchasePrice,
      supplier: scannedProductDetected.supplier,
      date: new Date().toISOString().split('T')[0],
      invoiceNo: `SCAN-REFILL-${Math.floor(Math.random() * 9000 + 1000)}`,
      paymentType: "Cash/UPI"
    };
    setPurchaseHistory(prev => [newPurchase, ...prev]);

    toastMessage(`${qtyVal} ${scannedProductDetected.unit} of ${scannedProductDetected.name} Added to Godown!`);
    setScannerActive(false);
    setScannedProductDetected(null);
    setScannedAddQty("");
    setScannerManualBarcode("");
  };

  // Supplier Add, Edit & Delete Actions
  const handleSupplierAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier.name.trim()) return;

    const newSupplier: Supplier = {
      id: `sup_${Date.now()}`,
      name: formSupplier.name.trim(),
      phone: formSupplier.phone.trim() || "N/A",
      address: formSupplier.address.trim() || "N/A",
      pendingCredit: parseFloat(formSupplier.pendingCredit) || 0
    };

    setSuppliers(prev => [...prev, newSupplier]);
    toastMessage("Merchant Registered!");
    setShowAddSupplierModal(false);
    setFormSupplier({ name: '', phone: '', address: '', pendingCredit: '0' });
  };

  const handleSupplierEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setSuppliers(prev => 
      prev.map(sup => sup.id === editingSupplier.id ? editingSupplier : sup)
    );

    toastMessage("Supplier details modified!");
    setEditingSupplier(null);
  };

  const handleSupplierDelete = (id: string, name: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप सप्लायर "${name}" को डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    setSuppliers(prev => prev.filter(s => s.id !== id));
    toastMessage("Supplier Removed Successfully!");
  };

  // WhatsApp low stock order generator based on specific supplier
  const triggerWhatsAppOrder = (supplierName: string) => {
    const lowStockForSupplier = inventory.filter(item => 
      item.supplier === supplierName && item.storeQty < item.minLimit
    );

    if (lowStockForSupplier.length === 0) {
      toastMessage(`${supplierName} के पास कोई भी कम स्टॉक सामग्री नहीं है!`, "info");
      return;
    }

    const orderText = lowStockForSupplier
      .map(item => `• ${item.name} (${item.minLimit - item.storeQty} ${item.unit} Required)`)
      .join("\n");

    const message = encodeURIComponent(`🔥 *BUM BUM CAFE - NEW ORDER REQ*\n\nप्रिय ${supplierName} टीम,\nकृपया हमारे गोडाउन के लिए निम्नलिखित कम स्टॉक माल का ऑर्डर भेजें:\n\n${orderText}\n\nधन्यवाद!\n-  मैनेजमेंट (Bum Bum Cafe)`);
    window.open(`https://wa.me/919714293759?text=${message}`, '_blank');
    toastMessage("WhatsApp order drafted!");
  };

  // Item Delete Action
  const handleItemDelete = (id: string, name: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप आइटम "${name}" को हमेशा के लिए डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    setInventory(prev => prev.filter(item => item.id !== id));
    setSelectedItemDetail(null);
    toastMessage("Item Removed Successfully!");
  };

  // Item Edit Submit
  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setInventory(prev => 
      prev.map(item => item.id === editingItem.id ? editingItem : item)
    );

    toastMessage("आइटम विवरण संशोधित किया गया!");
    setEditingItem(null);
    setSelectedItemDetail(null);
  };

  // Category Manager Add/Edit/Delete Actions
  const handleCategoryAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCat = categoryInput.trim();
    if (!cleanCat) return;

    if (categories.includes(cleanCat)) {
      toastMessage("यह श्रेणी पहले से मौजूद है!", "error");
      return;
    }

    setCategories(prev => [...prev, cleanCat]);
    setCategoryInput("");
    toastMessage(`श्रेणी "${cleanCat}" जोड़ी गई!`);
  };

  const handleCategoryEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategoryIndex === null || !editingCategoryValue.trim()) return;

    const oldName = categories[editingCategoryIndex];
    const newName = editingCategoryValue.trim();

    if (categories.includes(newName) && oldName !== newName) {
      toastMessage("यह श्रेणी पहले से मौजूद है!", "error");
      return;
    }

    setCategories(prev => prev.map((cat, idx) => idx === editingCategoryIndex ? newName : cat));
    setInventory(prev => 
      prev.map(item => item.category === oldName ? { ...item, category: newName } : item)
    );

    setEditingCategoryIndex(null);
    setEditingCategoryValue("");
    toastMessage("श्रेणी संशोधित की गई!");
  };

  const handleCategoryDelete = (catName: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप श्रेणी "${catName}" को हटाना चाहते हैं? इस श्रेणी की सभी सामग्री "Others" श्रेणी में चली जाएगी।`);
    if (!confirm) return;

    setCategories(prev => prev.filter(c => c !== catName));
    setInventory(prev => 
      prev.map(item => item.category === catName ? { ...item, category: "Others" } : item)
    );

    toastMessage("श्रेणी हटा दी गई है।");
  };

  // Dynamic Stock-In handler
  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStockIn.item || !formStockIn.quantity || !formStockIn.price) {
      toastMessage("All fields are required!", "error");
      return;
    }

    const qtyNum = parseFloat(formStockIn.quantity);
    const priceNum = parseFloat(formStockIn.price);

    setInventory(prev => {
      const exists = prev.find(i => i.name.toUpperCase() === formStockIn.item.toUpperCase());
      if (exists) {
        return prev.map(i => i.name.toUpperCase() === formStockIn.item.toUpperCase() 
          ? { 
              ...i, 
              storeQty: i.storeQty + qtyNum,
              purchasePrice: priceNum, 
              lastPurchaseDate: new Date().toISOString().split('T')[0] 
            } 
          : i
        );
      } else {
        return [
          ...prev,
          {
            id: `item_${Date.now()}`,
            name: formStockIn.item.toUpperCase(),
            category: formStockIn.category,
            storeQty: qtyNum,
            cafeQty: 0,
            unit: formStockIn.unit,
            purchasePrice: priceNum,
            minLimit: 15,
            supplier: formStockIn.supplier || "Walk-In Supplier",
            lastPurchaseDate: new Date().toISOString().split('T')[0]
          }
        ];
      }
    });

    const newPurchase: PurchaseLog = {
      id: `p_${Date.now()}`,
      itemName: formStockIn.item.toUpperCase(),
      qty: qtyNum,
      unit: formStockIn.unit,
      price: priceNum,
      supplier: formStockIn.supplier || "Walk-In",
      date: new Date().toISOString().split('T')[0],
      invoiceNo: formStockIn.invoiceNo || "INV-TEMP",
      paymentType: formStockIn.paymentType
    };
    setPurchaseHistory(prev => [newPurchase, ...prev]);

    // Update supplier pending credit if purchased via ledger
    if (formStockIn.paymentType === "Credit Ledger") {
      setSuppliers(prev => 
        prev.map(sup => sup.name === formStockIn.supplier ? { ...sup, pendingCredit: sup.pendingCredit + (qtyNum * priceNum) } : sup)
      );
    }

    toastMessage(`Stocked In ${qtyNum} of ${formStockIn.item} successfully to Godown!`);
    setShowAddStockModal(false);
    setFormStockIn({ 
      invoiceNo: '', supplier: '', item: '', category: 'Raw Material', quantity: '', unit: 'Kg', price: '', gst: '5', expiry: '', batch: '', uploadInvoice: '',
      paymentType: 'Cash/UPI'
    });
  };

  // Dynamic Stock-Out Handler
  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStockOut.item || !formStockOut.quantity) {
      toastMessage("All fields are required!", "error");
      return;
    }

    const qtyNum = parseFloat(formStockOut.quantity);
    let stockIsShort = false;

    setInventory(prev => {
      return prev.map(item => {
        if (item.id === formStockOut.item) {
          if (item.storeQty < qtyNum) {
            stockIsShort = true;
            return item;
          }
          return { ...item, storeQty: item.storeQty - qtyNum };
        }
        return item;
      });
    });

    if (stockIsShort) {
      toastMessage("Insufficient quantity in Godown Stock to dispatch!", "error");
      return;
    }

    const matchedItem = inventory.find(i => i.id === formStockOut.item);
    const matchName = matchedItem?.name || "Unknown";
    const unitPrice = matchedItem?.purchasePrice || 0;

    const newLog: StockOutLog = {
      id: `so_${Date.now()}`,
      itemName: matchName,
      qty: qtyNum,
      purpose: formStockOut.purpose,
      date: new Date().toISOString().split('T')[0],
      remarks: formStockOut.remarks || "No remarks",
      financialLoss: (formStockOut.purpose === "Waste" || formStockOut.purpose === "Damage") ? (qtyNum * unitPrice) : 0
    };
    setStockOutHistory(prev => [newLog, ...prev]);

    toastMessage(`Removed ${qtyNum} of ${matchName} (${formStockOut.purpose})`);
    setShowStockOutModal(false);
    setFormStockOut({ item: '', quantity: '', purpose: 'Kitchen Use', remarks: '' });
  };

  // Quick plus-minus adjustment for Main Store Qty directly
  const adjustQuickStoreQty = (id: string, adjustment: number) => {
    triggerHaptic();
    setInventory(prev => 
      prev.map(item => {
        if (item.id === id) {
          const finalVal = item.storeQty + adjustment;
          return { ...item, storeQty: finalVal < 0 ? 0 : finalVal };
        }
        return item;
      })
    );
  };

  // Physical Audit/Reconciliation Submit Handler
  const handleAuditSubmit = (e: React.FormEvent) => {
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

    setInventory(prev => 
      prev.map(i => i.id === auditItemSelect ? { ...i, storeQty: physicalCount } : i)
    );

    if (variance !== 0) {
      const newLog: StockOutLog = {
        id: `so_audit_${Date.now()}`,
        itemName: targetItem.name,
        qty: Math.abs(variance),
        purpose: variance < 0 ? "Waste" : "Kitchen Use",
        date: new Date().toISOString().split('T')[0],
        remarks: `Audit Adjustment (System was: ${systemCount}, Physical: ${physicalCount})`,
        financialLoss: variance < 0 ? (Math.abs(variance) * targetItem.purchasePrice) : 0
      };
      setStockOutHistory(prev => [newLog, ...prev]);
    }

    toastMessage("Audit recorded successfully. Stock aligned!", "success");
    setShowAuditReconcileModal(false);
    setAuditItemSelect("");
    setAuditPhysicalCount("");
  };

  
  // Export CSV/Excel Function
  const triggerSimulationExport = (reportName: string) => {
    const headers = ["Item Name", "Category", "Quantity", "Unit", "Total Value (INR)", "Status"];
    const rows = inventory.map(item => [
      item.name,
      item.category,
      item.storeQty,
      item.unit,
      item.storeQty * item.purchasePrice,
      item.storeQty === 0 ? "Out of Stock" : item.storeQty < item.minLimit ? "Low Stock" : "Normal"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastMessage(`Downloaded: ${reportName} (CSV)!`);
  };

  // Category wise Export
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

  // Custom print group actions
  const handlePrintGroup = (group: PrintGroup) => {
    triggerHaptic();
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return toastMessage("Please allow pop-ups to print.");
    
    const matchedItems = inventory.filter(i => group.itemIds.includes(i.id));
    const rowsHtml = matchedItems.map(item => {
      const orderQty = printOrderQtys[`${group.id}_${item.id}`] || "0";
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-family: sans-serif;">${item.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; font-family: sans-serif;">${item.storeQty} ${item.unit}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; font-family: sans-serif; color: #FF6B00;">${orderQty}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Print_Group_${group.name}</title>
          <style>
            body { font-family: sans-serif; padding: 25px; color: #333; }
            h2 { text-align: center; color: #FF6B00; margin-bottom: 2px; }
            p { text-align: center; font-size: 10px; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f5f5f5; padding: 10px; font-weight: bold; border-bottom: 2px solid #ddd; }
          </style>
        </head>
        <body>
          <h2>BUM BUM CAFE - ${group.name.toUpperCase()}</h2>
          <p>Printed on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item Name</th>
                <th style="text-align: center;">Current Stock</th>
                <th style="text-align: right;">Order Quantity (to buy)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCreatePrintGroup = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!newGroupNameInput.trim() || selectedItemIds.length === 0) {
      toastMessage("Group name and selected items are required!", "error");
      return;
    }

    const newGroup: PrintGroup = {
      id: `prg_${Date.now()}`,
      name: newGroupNameInput.trim(),
      itemIds: [...selectedItemIds]
    };

    setPrintGroups(prev => [...prev, newGroup]);
    setNewGroupNameInput("");
    setSelectedItemIds([]);
    setIsMultiSelectMode(false);
    setShowAddToGroupModal(false);
    toastMessage(`Created print category "${newGroup.name}"!`);
  };

  const handleToggleMultiSelect = (id: string) => {
    triggerHaptic(10);
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleRemoveFromPrintGroup = (groupId: string, itemId: string) => {
    triggerHaptic(30);
    setPrintGroups(prev => 
      prev.map(g => g.id === groupId ? { ...g, itemIds: g.itemIds.filter(id => id !== itemId) } : g)
    );
    toastMessage("Item removed from print list");
  };

  const handleDeletePrintGroup = (groupId: string) => {
    triggerHaptic(50);
    const confirm = window.confirm("क्या आप इस प्रिंट ग्रुप को हटाना चाहते हैं?");
    if (!confirm) return;
    setPrintGroups(prev => prev.filter(g => g.id !== groupId));
    toastMessage("Print list deleted");
  };

  // Simulated AI Bill Scanner Autocompletion
  
  const [isAIScanningAnimation, setIsAIScanningAnimation] = useState<boolean>(false);
  const handleAIScanSimulation = () => {
    setIsAIScanningAnimation(true);
    
    triggerHaptic();
    
    setTimeout(() => {
      setIsAIScanningAnimation(false);
      setShowAIScanner(false);
      
      
      // Auto-extract matching items from user's actual JAYANT SALES invoice
      const JAYANT_BILL_ITEMS = [
        { name: "DEL MONTE PIZZA PASTA 1KG", qty: 12, price: 150, category: "Raw Material" },
        { name: "DEL MONTE CREAMY CHEESE 1KG", qty: 12, price: 170, category: "Dairy" },
        { name: "MOZZARELLA CHEESE", qty: 10, price: 490, category: "Dairy" },
        { name: "SWEET CORN TOPPING", qty: 50, price: 80, category: "Pizza Toppings" },
        { name: "FRENCH FRIES", qty: 5, price: 70, category: "Frozen Material" }
      ];

      // Merge and update quantities inside dynamic state array
      setInventory(prev => 
        prev.map(item => {
          const match = JAYANT_BILL_ITEMS.find(bi => bi.name === item.name);
          if (match) {
            return { 
              ...item, 
              storeQty: item.storeQty + match.qty, 
              purchasePrice: match.price,
              lastPurchaseDate: new Date().toISOString().split('T')[0]
            };
          }
          return item;
        })
      );

      // Push extracted purchases into history ledger
      JAYANT_BILL_ITEMS.forEach(bi => {
        const newPurchase: PurchaseLog = {
          id: `p_${Date.now()}_${bi.name.replace(/ /g, '_')}`,
          itemName: bi.name,
          qty: bi.qty,
          unit: "Pcs",
          price: bi.price,
          supplier: "Jayant Sales Agency",
          date: new Date().toISOString().split('T')[0],
          invoiceNo: "INV-1288-2026",
          paymentType: "Credit Ledger"
        };
        setPurchaseHistory(prev => [newPurchase, ...prev]);
      });

      // Update supplier credit balance automatically
      setSuppliers(prev => 
        prev.map(sup => sup.name === "Rajesh Traders" ? { ...sup, pendingCredit: sup.pendingCredit + 27180 } : sup)
      );

      toastMessage("AI detected & loaded 5 items from JAYANT SALES invoice!", "success");
    }, 3500);
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
            {/* Barcode Scanner overlay trigger */}
            <button 
              onClick={() => setScannerActive(true)}
              className="p-2.5 bg-[#FF6B00]/5 border border-[#FF6B00]/20 hover:bg-[#FF6B00]/10 rounded-xl text-[#FF6B00] transition-all"
              title="Simulator QR Scanner"
            >
              <QrCode size={16} className="animate-pulse" />
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
            3. TAB 1: DASHBOARD (HOME)
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

            {/* DAILY DEVIATION COUNTERS */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm flex items-center justify-between`}>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Today Stock In</p>
                  <h4 className="text-base font-black text-green-500 mt-1">₹{dashboardStats.todayPurchases}</h4>
                </div>
                <PlusCircle size={22} className="text-green-500" />
              </div>

              <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm flex items-center justify-between`}>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Today Waste Qty</p>
                  <h4 className="text-base font-black text-red-500 mt-1">{dashboardStats.todayWaste} Qty</h4>
                </div>
                <TrendingDown size={22} className="text-red-500" />
              </div>
            </div>

            {/* LOW STOCK HUD LIST */}
            <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Low / Out of Stock List</span>
                <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Critical</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {inventory.filter(i => i.storeQty < i.minLimit).map(item => {
                  const combined = item.storeQty;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 text-xs">
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-[9px] text-neutral-400 uppercase font-sans">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-black ${combined === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                          {combined} {item.unit} Left
                        </p>
                        <p className="text-[8px] text-neutral-400">Limit: {item.minLimit}</p>
                      </div>
                    </div>
                  );
                })}
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
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1 font-sans font-sans">Reports</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            4. TAB 2: MAIN STORE (GODOWN)
            ========================================== */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-widest text-neutral-400 font-sans font-sans font-sans">Main Godown Stock</h2>
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

            {/* CATEGORY FILTER SWITCHES */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none font-sans font-sans font-sans">
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

            {/* INVENTORY CARD LIST GRID (DIRECT STOCK VALUE/QUANTITY ENTER OPTION BUILT-IN) */}
            <div className="space-y-3.5">
              {filteredInventory.map(item => {
                const isLow = item.storeQty < item.minLimit;
                const isItemSelected = selectedItemIds.includes(item.id);
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
                            <span className="bg-red-100 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{item.category} • {item.supplier}</p>
                        {item.barcode && <p className="text-[8px] text-neutral-400 tracking-wider">Barcode: {item.barcode}</p>}
                        {item.expiryDate && <p className="text-[8px] text-red-400 font-bold">Expiry: {item.expiryDate}</p>}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-500">Unit: {item.unit}</span>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Price: ₹{item.purchasePrice}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 border-t border-b border-neutral-100 dark:border-neutral-800/80 my-3 py-2 text-center text-xs">
                      <div>
                        {/* DIRECT IN-PLACE ENTRY BOX FOR STOCK QUANTITY/VALUE */}
                        <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block mb-1">
                          Current Stock (हाल की वैल्यू)
                        </label>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); adjustQuickStoreQty(item.id, -1); }} className="p-2 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-xl"><MinusCircle size={14} /></button>
                          
                          <input 
                            type="number"
                            value={item.storeQty}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, storeQty: val } : inv));
                            }}
                            className="w-20 text-center font-black text-sm p-1.5 rounded-xl border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-neutral-900 dark:text-white"
                          />
                          <span className="text-xs font-bold text-neutral-400">{item.unit}</span>

                          <button onClick={(e) => { e.stopPropagation(); adjustQuickStoreQty(item.id, 1); }} className="p-2 bg-green-100 dark:bg-green-500/10 text-green-500 rounded-xl"><PlusCircle size={14} /></button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                      <span className="text-neutral-400">Value: ₹{(item.storeQty * item.purchasePrice).toLocaleString()}</span>
                      
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

            {/* STICKY FLOATING BOTTOM TOOLBAR WHEN MULTI-SELECT ACTIVE */}
            <AnimatePresence>
              {isMultiSelectMode && selectedItemIds.length > 0 && (
                <motion.div 
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  className="fixed bottom-20 left-4 right-4 z-[45] bg-[#FF6B00] text-white p-4 rounded-3xl shadow-xl flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">{selectedItemIds.length} Items Selected</p>
                    <p className="text-[9px] text-orange-200 uppercase font-bold">Ready to map into Print Category</p>
                  </div>
                  <button 
                    onClick={() => {
                      triggerHaptic();
                      setShowAddToGroupModal(true);
                    }}
                    className="px-4 py-2 bg-white text-[#FF6B00] rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow font-sans"
                  >
                    <Layers size={13} /> Add to Print List
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ==========================================
            5. TAB 3: DYNAMIC CUSTOM PRINT GROUPS VIEW
            ========================================== */}
        {activeTab === 'print' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-widest text-neutral-400">Custom Print Categories</h2>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Print or export selected stock categories</p>
              </div>
            </div>

            {/* Print Category quick selectors */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none font-sans font-sans">
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
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest">{matchedItems.length} Materials Assigned</p>
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

                      {/* Display items assigned inside this print group */}
                      <div className="space-y-2">
                        {matchedItems.map(item => {
                          const oQtyValue = printOrderQtys[`${group.id}_${item.id}`] || "";
                          return (
                            <div key={item.id} className="flex justify-between items-center p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-xs">
                              <div className="flex-1 pr-3">
                                <p className="font-black text-sm">{item.name}</p>
                                <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Current Stock: {item.storeQty} {item.unit}</p>
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
            7. MORE OVERLAY / SIDEBAR DETAILS
            ========================================== */}
        {activeTab === 'more' && (
          <div className="space-y-6">
            
            {/* SIMULATED MENU FOR MORE SECTION */}
            {currentView === 'dashboard' || currentView === 'more_home' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6B00] font-black">
                    ➕
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest font-sans">More Operational Features</h2>
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
                    { id: 'cold_chain', label: "Deep Freeze Temperature Logs", desc: "Checklist and history for cold storage", icon: <Sun size={16} /> },
                    { id: 'equipment_manager', label: "Equipment & QR Maintenance", desc: "Track freezer servicing and call logs", icon: <Settings size={16} /> },
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
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px] font-sans">Supplier</label>
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
                    <div className="space-y-1">
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
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Category</label>
                      <select 
                        value={formStockIn.category}
                        onChange={e => setFormStockIn({...formStockIn, category: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800 cursor-pointer"
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-black uppercase tracking-wider text-neutral-400 text-[8px] font-sans">Payment Method</label>
                    <select 
                      value={formStockIn.paymentType}
                      onChange={e => setFormStockIn({...formStockIn, paymentType: e.target.value as any})}
                      className="w-full p-3 rounded-2xl border bg-orange-500/10 border-orange-500/20 text-[#FF6B00] font-black cursor-pointer"
                    >
                      <option value="Cash/UPI">Cash / UPI</option>
                      <option value="Credit Ledger">Supplier Credit Ledger</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl font-black uppercase tracking-wider shadow">
                    Save Receipt ➔
                  </button>
                </form>

                {/* Audit Log */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 font-sans">Incoming Purchase Audit Log</h4>
                  {purchaseHistory.map(log => (
                    <div key={log.id} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} text-xs space-y-1`}>
                      <div className="flex justify-between">
                        <span className="font-bold">{log.itemName}</span>
                        <span className="text-green-500 font-bold">₹{log.price * log.qty}</span>
                      </div>
                      <p className="text-[9px] text-neutral-400 uppercase font-sans">Qty: {log.qty} {log.unit} • Method: {log.paymentType} • {log.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. STOCK OUT HISTORY & CONTROL */}
            {currentView === 'stock_out_logs' && (
              <div className="space-y-4 font-sans">
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

            {/* C. REPORTS PANEL WITH PDF/EXCEL TRIGGER */}
            {currentView === 'reports_list' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between font-sans font-sans font-sans">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Reports Engine</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider font-sans">Back</button>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { title: "Daily Store Audit Report", type: "Daily_Report" },
                    { title: "Weekly Consumption Analysis", type: "Weekly_Report" },
                    { title: "Monthly Stock Valuation Ledger", type: "Monthly_Report" },
                    { title: "Wastage and Discards Auditor", type: "Wastage_Report" },
                    { title: "Inter-store Logistics Audit", type: "Transfer_Report" },
                  ].map((rep, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-3xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{rep.title}</p>
                        <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5">Automated compilation engine</p>
                      </div>

                      <div className="flex gap-1.5 font-sans">
                        <button 
                          onClick={() => triggerSimulationExport(rep.type)}
                          className="px-2.5 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] rounded-xl flex items-center gap-1 font-bold text-[9px] uppercase hover:bg-[#FF6B00]/20 font-sans"
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

            {/* D. MANAGE SUPPLIERS WITH ADD, EDIT & DELETE */}
            {currentView === 'suppliers_list' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Supplier Register</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
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
                      <div className="flex justify-between items-start font-sans">
                        <div>
                          <p className="font-black text-[#FF6B00] text-sm">{s.name}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">📞 {s.phone} • 📍 {s.address}</p>
                          <p className="text-[10px] font-bold mt-1 text-red-500 uppercase tracking-wide">Pending Credit: ₹{s.pendingCredit.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-1.5 font-sans">
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

                      {/* WHATSAPP REORDER QUICK TRIGGER BUTTON */}
                      <button
                        onClick={() => triggerWhatsAppOrder(s.name)}
                        className="w-full py-2 bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white border border-green-500/20 text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Share2 size={11} />
                        <span>Send Low Stock Reorder (WhatsApp)</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. MANAGE CATEGORIES (DYNAMIC LIST INSIDE TAB) */}
            {currentView === 'categories_manager' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Raw Material Categories</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider font-sans">Back</button>
                </div>

                <form onSubmit={handleCategoryAdd} className="flex gap-2 text-xs">
                  <input 
                    type="text" 
                    placeholder="New category name (e.g. Spices)" 
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value)}
                    className="flex-1 p-3 rounded-2xl border dark:bg-[#1A1A1A] dark:border-neutral-800"
                    required
                  />
                  <button type="submit" className="px-5 py-3 bg-[#FF6B00] text-white rounded-2xl font-black uppercase">Add</button>
                </form>

                {editingCategoryIndex !== null && (
                  <form onSubmit={handleCategoryEditSubmit} className="flex gap-2 text-xs p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <input 
                      type="text" 
                      placeholder="Edit category name..." 
                      value={editingCategoryValue}
                      onChange={e => setEditingCategoryValue(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold uppercase">Update</button>
                    <button type="button" onClick={() => setEditingCategoryIndex(null)} className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 rounded-xl font-sans">Cancel</button>
                  </form>
                )}

                <div className="grid grid-cols-1 gap-2 text-xs font-sans">
                  {categories.map((cat, idx) => (
                    <div key={idx} className={`p-4 rounded-3xl border flex items-center justify-between ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <span className="font-bold">{cat}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingCategoryIndex(idx);
                            setEditingCategoryValue(cat);
                          }}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all"
                          title="Edit Category"
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => handleCategoryDelete(cat)}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                          title="Delete Category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* F. DEEP FREEZE TEMPERATURE LOGGING LOGIC */}
            {currentView === 'cold_chain' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Cold-Chain Temperature Logs</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <form onSubmit={handleAddTempLog} className={`p-4 rounded-3xl border flex gap-2 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <input 
                    type="number" 
                    placeholder="Enter Freezer Temp (°C) e.g -18" 
                    value={newTempInput}
                    onChange={e => setNewTempInput(e.target.value)}
                    className="flex-1 p-3 rounded-2xl border dark:bg-neutral-800"
                    required
                  />
                  <button type="submit" className="px-5 py-3 bg-[#FF6B00] text-white rounded-2xl font-black uppercase">Log</button>
                </form>

                <div className="space-y-2 font-sans font-sans">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400 font-sans">Today's Temperature Log Checksheet</h4>
                  {todayTempLog.map((log, idx) => (
                    <div key={idx} className={`p-4 rounded-3xl border flex items-center justify-between text-xs ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <div>
                        <p className={`font-black ${log.temp > -15 ? 'text-red-500' : 'text-green-500'}`}>{log.temp}°C</p>
                        <p className="text-[9px] text-neutral-400 mt-0.5">Recorded by {log.by} at {log.time}</p>
                      </div>
                      {log.temp > -15 ? (
                        <span className="bg-red-100 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide">
                          Warning: Warm
                        </span>
                      ) : (
                        <span className="bg-green-100 dark:bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide font-sans">
                          Safe
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* G. RECONCILIATION PHYSICAL AUDIT MENU */}
            {currentView === 'audit_manager' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Physical Stock Audit</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider font-sans font-sans">Back</button>
                </div>

                <div className={`p-5 rounded-3xl border space-y-4 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <div>
                    <h4 className="font-bold text-sm">Align Stock discrepancies</h4>
                    <p className="text-[9px] text-neutral-400 uppercase tracking-wide mt-0.5 font-sans font-sans font-sans font-sans">Compare counted shelf stock against database numbers</p>
                  </div>

                  <button 
                    onClick={() => setShowAuditReconcileModal(true)}
                    className="w-full p-3.5 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider"
                  >
                    Start Stock Audit Alignment
                  </button>
                </div>
              </div>
            )}

            {/* H. EQUIPMENT SERVICE LOG BOOK */}
            {currentView === 'equipment_manager' && (
              <div className="space-y-4 font-sans">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Equipment Register & Service</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-[#FF6B00] font-bold uppercase tracking-wider">Back</button>
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs font-sans">
                  {equipmentList.map((eq) => (
                    <div key={eq.id} className={`p-4 rounded-3xl border flex flex-col gap-3.5 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-[#FF6B00] text-sm">{eq.name}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5">Last Service: {eq.lastService} • Next: {eq.nextService}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase ${
                          eq.status === 'Good' ? 'bg-green-100 text-green-500' : 'bg-amber-100 text-amber-500'
                        }`}>
                          {eq.status}
                        </span>
                      </div>

                      <div className="flex gap-2 border-t border-neutral-50 dark:border-neutral-800 pt-3">
                        <button 
                          onClick={() => setSelectedEquipmentQR(eq)}
                          className="flex-1 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-bold rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <QrCode size={12} /> Scan Machine QR
                        </button>
                        <a 
                          href={`tel:${eq.phone}`}
                          className="flex-1 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-[#FF6B00] font-bold rounded-xl flex items-center justify-center gap-1.5 text-center"
                        >
                          📞 Call Technician
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* I. SETTINGS PANEL */}
            {currentView === 'app_settings' && (
              <div className="space-y-4 font-sans font-sans">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Application Configuration</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <div className={`p-5 rounded-3xl border space-y-4 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  
                  {/* Theme Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide">Dark Mode Preference</p>
                      <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Optimal design for low light godowns</p>
                    </div>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl"
                    >
                      {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                  </div>

                  {/* Offline Support Status */}
                  <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-4">
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide">Offline PWA Auto-Sync</p>
                      <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Synchronize local cache dynamically</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-500/10 text-green-500 font-black rounded-full text-[9px] uppercase tracking-wider flex items-center gap-1">
                      <Wifi size={10} /> Online
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ==========================================
          8. DETAILED COMPREHENSIVE FLOATING DRAWERS & MODALS
          ========================================== */}
      <AnimatePresence>
        
        {/* A. PRODUCT ITEM SPECIFIC DETAILED DRAWER (WITH ITEM DELETE / EDIT INSIDE) */}
        {selectedItemDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-end justify-center font-sans font-sans font-sans">
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
                  <button 
                    onClick={() => setEditingItem(selectedItemDetail)}
                    className="p-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all"
                    title="Edit Item"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => handleItemDelete(selectedItemDetail.id, selectedItemDetail.name)}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                    title="Delete Item"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={() => setSelectedItemDetail(null)}
                    className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-400 rounded-xl"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Dynamic Qty Spread HUD */}
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl text-center text-xs">
                <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Main Godown Available Stock</span>
                <span className="font-black text-sm">{selectedItemDetail.storeQty} {selectedItemDetail.unit}</span>
              </div>

              {/* Simulated Purchase Timeline */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-sans">Activity & Delivery Audit</h4>
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

              {/* Action row */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => {
                    setFormStockOut({ item: selectedItemDetail.id, quantity: '', purpose: 'Kitchen Use', remarks: '' });
                    setSelectedItemDetail(null);
                    setShowStockOutModal(true);
                  }}
                  className="flex-1 p-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-center font-black text-xs uppercase tracking-wider shadow"
                >
                  Discard / Waste Out
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* B. ITEM EDIT MASTER OVERLAY */}
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

              <div className="space-y-1.5 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Item Name</label>
                <input 
                  type="text" 
                  value={editingItem.name} 
                  onChange={e => setEditingItem({...editingItem, name: e.target.value.toUpperCase()})}
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
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
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Purchase Price</label>
                  <input 
                    type="number" 
                    value={editingItem.purchasePrice} 
                    onChange={e => setEditingItem({...editingItem, purchasePrice: parseFloat(e.target.value)})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
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
                    onChange={e => setEditingItem({...editingItem, minLimit: parseInt(e.target.value)})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Barcode</label>
                  <input 
                    type="text" 
                    value={editingItem.barcode || ""} 
                    onChange={e => setEditingItem({...editingItem, barcode: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    placeholder="Barcode Number"
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow">
                Save Changes ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* C. SUPPLIER EDIT OVERLAY */}
        {editingSupplier && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 font-sans font-sans">
            <motion.form 
              onSubmit={handleSupplierEditSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Edit Supplier Details</h3>
                <button type="button" onClick={() => setEditingSupplier(null)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Supplier Name</label>
                <input 
                  type="text" 
                  value={editingSupplier.name} 
                  onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})}
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Phone</label>
                  <input 
                    type="text" 
                    value={editingSupplier.phone} 
                    onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Address / City</label>
                  <input 
                    type="text" 
                    value={editingSupplier.address} 
                    onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow">
                Save Changes ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* D. INTERACTIVE REAL-TIME BARCODE SCANNER SIMULATOR */}
        {scannerActive && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 font-sans font-sans">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 text-white space-y-5 text-center relative overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#FF6B00] flex items-center gap-1.5">
                  <QrCode size={16} /> Packed Material Scanner
                </p>
                <button 
                  onClick={() => {
                    setScannerActive(false);
                    setScannedProductDetected(null);
                    setScannerManualBarcode("");
                  }} 
                  className="p-1.5 bg-neutral-800 rounded-xl"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="h-44 w-full bg-black/50 border border-dashed border-[#FF6B00]/40 rounded-3xl relative flex items-center justify-center overflow-hidden animate-pulse">
                <span className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-bounce" />
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black z-10 animate-pulse">Scanning Camera Feed Simulator</span>
              </div>

              {!scannedProductDetected ? (
                <form onSubmit={handleBarcodeManualScan} className="space-y-4 text-xs text-left">
                  <div className="space-y-1.5 font-sans">
                    <label className="text-[8px] font-black uppercase tracking-wider text-neutral-500">Simulate Scan (Select Packed Material Barcode)</label>
                    <select 
                      onChange={e => setScannerManualBarcode(e.target.value)}
                      value={scannerManualBarcode}
                      className="w-full p-3 rounded-2xl bg-neutral-800 border border-neutral-700 text-white cursor-pointer"
                    >
                      <option value="">-- Choose Barcode --</option>
                      {inventory.map(i => (
                        <option key={i.id} value={i.barcode}>{i.name} (Barcode: {i.barcode || "N/A"})</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full p-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-wider"
                  >
                    Run Barcode Scan Simulator ➔
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSaveScannedStock} className="space-y-4 text-xs text-left font-sans">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Matched Material Detected</p>
                    <p className="text-sm font-black mt-1 text-white">{scannedProductDetected.name}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Stock Status: Godown ({scannedProductDetected.storeQty})</p>
                  </div>

                  <div className="space-y-1.5 font-sans font-sans">
                    <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Qty to Add ({scannedProductDetected.unit})</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 100" 
                      value={scannedAddQty} 
                      onChange={e => setScannedAddQty(e.target.value)} 
                      className="w-full p-3.5 bg-neutral-800 border border-neutral-700 rounded-2xl text-white font-bold"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      className="flex-1 p-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-wider"
                    >
                      Add Stock ➔
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setScannedProductDetected(null)} 
                      className="flex-1 p-3.5 bg-neutral-800 text-neutral-400 rounded-2xl font-black uppercase tracking-wider"
                    >
                      Scan Again
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* H. MODAL FORM: STOCK IN / INCOMING */}
        {showAddStockModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 font-sans font-sans">
            <motion.form 
              onSubmit={handleStockInSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans font-sans">Stock Receipt (Stock In)</h3>
                <button type="button" onClick={() => setShowAddStockModal(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Item Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CHEESE"
                    value={formStockIn.item}
                    onChange={e => setFormStockIn({...formStockIn, item: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Supplier Name</label>
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

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Qty</label>
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
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Purchase Price</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 440"
                    value={formStockIn.price}
                    onChange={e => setFormStockIn({...formStockIn, price: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400 font-sans">Category</label>
                  <select 
                    value={formStockIn.category}
                    onChange={e => setFormStockIn({...formStockIn, category: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:bg-neutral-800 cursor-pointer"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-black uppercase tracking-wider text-neutral-400 text-[8px] font-sans">Payment Method</label>
                <select 
                  value={formStockIn.paymentType}
                  onChange={e => setFormStockIn({...formStockIn, paymentType: e.target.value as any})}
                  className="w-full p-3 rounded-xl border bg-orange-500/10 border-orange-500/20 text-[#FF6B00] font-black cursor-pointer"
                >
                  <option value="Cash/UPI">Cash / UPI</option>
                  <option value="Credit Ledger">Supplier Credit Ledger</option>
                </select>
              </div>

              <button type="submit" className="w-full p-3 bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow">
                Complete Stock In ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* I. MODAL FORM: ADD SUPPLIER */}
        {showAddSupplierModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 font-sans font-sans">
            <motion.form 
              onSubmit={handleSupplierAdd}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Merchant Registration</h3>
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Company / Supplier Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Swastik Packaging Hub"
                  value={formSupplier.name}
                  onChange={e => setFormSupplier({...formSupplier, name: e.target.value})}
                  className="w-full p-3 rounded-xl border dark:bg-neutral-800" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Phone</label>
                  <input 
                    type="text" 
                    placeholder="98765xxxxx"
                    value={formSupplier.phone}
                    onChange={e => setFormSupplier({...formSupplier, phone: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Address</label>
                  <input 
                    type="text" 
                    placeholder="City / Area"
                    value={formSupplier.address}
                    onChange={e => setFormSupplier({...formSupplier, address: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow">
                Register Supplier ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* J. MODAL FORM: PHYSICAL RECONCILIATION */}
        {showAuditReconcileModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 font-sans font-sans">
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
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00] font-sans">Physical Count Audit</h3>
                <button type="button" onClick={() => setShowAuditReconcileModal(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1 text-xs font-sans">
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

        {/* K. MODAL: EQUIPMENT QR SIMULATION DISPLAY */}
        {selectedEquipmentQR && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4 font-sans font-sans">
            <div className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border text-center ${
              isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
            }`}>
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00]">Asset Control Maintenance</p>
                <button onClick={() => setSelectedEquipmentQR(null)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1.5 font-sans">
                <h3 className="font-black text-sm">{selectedEquipmentQR.name}</h3>
                <p className="text-neutral-400 text-xs">Last Serviced: {selectedEquipmentQR.lastService}</p>
                <p className="text-red-500 text-xs font-bold">Next Service Due: {selectedEquipmentQR.nextService}</p>
              </div>

              <div className="p-4 bg-white rounded-3xl w-40 h-44 mx-auto flex items-center justify-center shadow-lg border border-neutral-100">
                <QrCode size={120} className="text-black" />
              </div>

              <div className="flex gap-2">
                <a 
                  href={`tel:${selectedEquipmentQR.phone}`}
                  className="flex-1 p-3 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase text-center"
                >
                  Call Technician
                </a>
                <button 
                  onClick={() => {
                    toastMessage("Maintenance Service Scheduled!");
                    setSelectedEquipmentQR(null);
                  }}
                  className="flex-1 p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-2xl font-black text-xs uppercase"
                >
                  Log Service Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* L. MODAL: ADD TO CUSTOM PRINT GROUP */}
        {showAddToGroupModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 font-sans font-sans">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Map Selected to Print Group</h3>
                <button onClick={() => setShowAddToGroupModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              {/* Add to Existing Group */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Select Existing Print Group</label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {printGroups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => {
                        triggerHaptic();
                        const updatedIds = Array.from(new Set([...group.itemIds, ...selectedItemIds]));
                        setPrintGroups(prev => prev.map(g => g.id === group.id ? { ...g, itemIds: updatedIds } : g));
                        setSelectedItemIds([]);
                        setIsMultiSelectMode(false);
                        setShowAddToGroupModal(false);
                        toastMessage(`Items added to print category "${group.name}"!`);
                      }}
                      className="w-full p-3 rounded-2xl text-left bg-neutral-50 dark:bg-neutral-800/40 font-bold hover:bg-[#FF6B00] hover:text-white transition-all text-xs"
                    >
                      {group.name} ({group.itemIds.length} items)
                    </button>
                  ))}
                </div>
              </div>

              {/* Create a New Group */}
              <form onSubmit={handleCreatePrintGroup} className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs">
                <label className="text-[9px] font-black uppercase tracking-wider text-neutral-400 block">Or Create New Print Group</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New Group Name (e.g. Bread Items)" 
                    value={newGroupNameInput}
                    onChange={e => setNewGroupNameInput(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border dark:bg-[#1A1A1A] dark:border-neutral-800 text-xs"
                    required
                  />
                  <button type="submit" className="px-4 py-2.5 bg-[#FF6B00] text-white rounded-xl font-black uppercase">Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* FIXED PREMIUM BOTTOM NAVIGATION BAR */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0F0F0F]/90 border-neutral-800 text-white' : 'bg-white/90 border-neutral-100 text-neutral-800'
      }`}>
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 py-2 text-center">
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
            onClick={() => handleNavClick('print')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'print' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Printer size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block font-sans">Print Items</span>
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
