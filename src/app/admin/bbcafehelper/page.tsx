

'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, deleteDoc, updateDoc, setDoc, orderBy, getDoc, increment, limit } from 'firebase/firestore';
import { Search, Plus, X, Trash2, Calendar, IndianRupee, ArrowLeft, Lock, Loader2, Filter, ShoppingBag, Flame, Banknote, ShieldAlert, Layers, ChevronRight, Settings, Wrench, Package, AlertTriangle, ArrowRightLeft, Globe, Download, Printer, Edit, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Suggested items to prevent repetitive typing issues
const SUGGESTED_STORE_ITEMS = [
  "Paneer (पनीर)", "Milk (दूध)", "Mozzarella Cheese", "Pizza Base (6\")", "Pizza Base (8\")", "Pizza Base (10\")", "Maida (मैदा)", "Sugar (चीनी)", "Onion (प्याज़)", "Tomato (टमाटर)", "Capsicum (शिमला मिर्च)", "Sweet Corn", "Butter (मक्खन)", "Tomato Sauce", "Mayonnaise", "Disposable Spoons", "Tissue Paper", "Carry Bags"
];

// Fallback Default Expense Categories
const DEFAULT_EXP_CATEGORIES = [
  { id: "Raw Materials", name: "Raw Materials 🥛" },
  { id: "Packaging", name: "Packaging 📦" },
  { id: "Utility & Fuel", name: "Utility & Fuel 🔥" },
  { id: "Wages/Salary", name: "Wages/Salary 💵" },
  { id: "Others", name: "Others 📝" }
];

// Fallback Default Store Room Categories
const DEFAULT_STORE_CATEGORIES = [
  { id: "Dairy", name: "Dairy 🥛" },
  { id: "Veggies", name: "Veggies 🥦" },
  { id: "Grocery", name: "Grocery 🍞" },
  { id: "Others", name: "Others 📝" }
];

// Fallback Default Packaging Categories
const DEFAULT_PKG_CATEGORIES = [
  { id: "Boxes", name: "Boxes 📦" },
  { id: "Disposables", name: "Disposables 🥤" },
  { id: "Paper Items", name: "Paper Items 🧻" },
  { id: "Others", name: "Others 📝" }
];

// Bilingual translations dictionary
const t = {
  hi: {
    title: "कैफ़े सहायक डैशबोर्ड",
    subTitle: "BUM BUM CAFE • बैक-एंड ऑपरेशन्स",
    expensesTab: "💸 दैनिक खर्च",
    assetsTab: "🏢 अचल संपत्ति",
    storeTab: "📦 स्टोर रूम",
    packagingTab: "🍕 पैकेजिंग व किराना",
    addExpense: "नया खर्च जोड़ें",
    save: "सहेजें ➔",
    close: "बंद करें",
    amount: "राशि (₹)",
    category: "श्रेणी चुनें",
    description: "खर्च का विवरण (उदा. सोनी डेयरी से पनीर)",
    todayExpense: "आज का कुल खर्च",
    monthExpense: "इस महीने का खर्च",
    assetName: "उपकरण/मशीन का नाम",
    purchaseCost: "खरीद मूल्य (₹)",
    purchaseDate: "खरीद की तारीख",
    lifespan: "अनुमानित कार्य-अवधि (वर्ष)",
    nextService: "अगली सर्विसिंग तारीख",
    currentValue: "वर्तमान मूल्य",
    moveStock: "किचन में भेजें",
    qtyToMove: "स्थानांतरित मात्रा",
    lowStockWarning: "🚨 स्टॉक समाप्त होने की चेतावनी!",
    tableBoxes: "पैकेजिंग व डिस्पोजल डैशबोर्ड",
    manageCategories: "⚙️ श्रेणियां प्रबंधित करें",
    newCategoryPlaceholder: "नई श्रेणी का नाम दर्ज करें",
    addCategoryBtn: "जोड़ें",
    searchPlaceholder: "खोजें...",
    suggestedSelect: "-- सूची से चुनें --",
    customInput: "या नया नाम टाइप करें",
    lowStockReportBtn: "📥 समाप्त स्टॉक रिपोर्ट एक्सपोर्ट करें (Excel)",
    lowStockReportDesc: "स्टोर रूम और पैकेजिंग की वे सामग्रियां जो समाप्त या कम हैं",
    allStockOk: "सभी सामग्रियां पर्याप्त मात्रा में उपलब्ध हैं!"
  },
  en: {
    title: "Cafe Helper Dashboard",
    subTitle: "BUM BUM CAFE • Back-End Operations",
    expensesTab: "💸 Daily Expenses",
    assetsTab: "🏢 Fixed Assets",
    storeTab: "📦 Store Room",
    packagingTab: "🍕 Packaging & Stock",
    addExpense: "Add Daily Expense",
    save: "Save Record ➔",
    close: "Close",
    amount: "Amount (₹)",
    category: "Select Category",
    description: "Description (e.g., Paneer from Soni Dairy)",
    todayExpense: "Today's Expense",
    monthExpense: "Monthly Expense",
    assetName: "Equipment/Asset Name",
    purchaseCost: "Purchase Cost (₹)",
    purchaseDate: "Purchase Date",
    lifespan: "Est. Lifespan (Years)",
    nextService: "Next Service Date",
    currentValue: "Current Value",
    moveStock: "Move to Kitchen",
    qtyToMove: "Quantity to Move",
    lowStockWarning: "🚨 Low Stock Alert!",
    tableBoxes: "Packaging & Disposables Stock Dashboard",
    manageCategories: "⚙️ Manage Categories",
    newCategoryPlaceholder: "Enter new category name",
    addCategoryBtn: "Add",
    searchPlaceholder: "Search here...",
    suggestedSelect: "-- Choose From List --",
    customInput: "Or Type Custom Name",
    lowStockReportBtn: "📥 Export Finished Stock Report (Excel)",
    lowStockReportDesc: "List of items that are completely out or low in stock",
    allStockOk: "All stock items are sufficiently available!"
  }
};

// Helper function to calculate Asset Depreciation (Book Value)
const calculateCurrentValue = (purchaseDateStr: string, cost: number, lifespanYears: number) => {
  if (!purchaseDateStr || !cost || !lifespanYears) return 0;
  try {
    const purchaseDate = new Date(purchaseDateStr);
    const today = new Date();
    const ageInYears = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageInYears <= 0) return cost;
    if (ageInYears >= lifespanYears) return 0;
    const remainingValue = cost * (1 - (ageInYears / lifespanYears));
    return Math.max(0, Math.round(remainingValue));
  } catch (error) {
    return cost;
  }
};

export default function BbCafeHelper() {
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Tab & Language States
  const [activeTab, setActiveTab] = useState<'expenses' | 'assets' | 'store_room' | 'packaging'>('expenses');
  const [isHindi, setIsHindi] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // --- 1. DYNAMIC EXPENSES & CATEGORIES STATES ---
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [newExpenseCatInput, setNewExpenseCatInput] = useState("");
  const [showManageCatPanel, setShowManageCatPanel] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null); 

  // --- MEMOIZED CALCULATIONS ---
  const todayExpense = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return expenses
      .filter(e => e.date === todayStr)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const monthlyExpense = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); 
    return expenses
      .filter(e => e.date && e.date.startsWith(currentMonth))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  // --- 2. FIXED ASSETS STATES & LOGIC ---
  const [assetName, setAssetName] = useState("");
  const [assetCost, setAssetCost] = useState("");
  const [assetPurchaseDate, setAssetPurchaseDate] = useState("");
  const [assetLifespan, setAssetLifespan] = useState("");
  const [assetMaintenance, setAssetMaintenance] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [editingAsset, setEditingAsset] = useState<any>(null); 

  // --- 3. STORE ROOM STATES & LOGIC ---
  const [storeItemName, setStoreItemName] = useState("");
  const [storeItemQty, setStoreItemQuantity] = useState("");
  const [storeItemCategory, setStoreItemCategory] = useState("");
  const [storeItemUnit, setStoreItemUnit] = useState("Kg");
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [isTransferringStock, setIsTransferringStock] = useState<any>(null); 
  const [transferQtyInput, setTransferQtyInput] = useState("");
  const [storeLedger, setStoreLedger] = useState<any[]>([]); 
  const [editingStoreItem, setEditingStoreItem] = useState<any>(null); 

  // Dynamic Store Room Categories
  const [storeCategories, setStoreCategories] = useState<any[]>([]);
  const [newStoreCatInput, setNewStoreCatInput] = useState("");
  const [showManageStoreCat, setShowManageStoreCat] = useState(false);
  const [editingStoreCat, setEditingStoreCat] = useState<any>(null);
  const [editStoreCatName, setEditStoreCatName] = useState("");

  // --- 4. DYNAMIC PACKAGING & DISPOSABLES STATES ---
  const [pkgItems, setPkgItems] = useState<any[]>([]);
  const [pkgCategories, setPkgCategories] = useState<any[]>([]);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgQty, setNewPkgQty] = useState("");
  const [newPkgCategory, setNewPkgCategory] = useState("");
  const [newPkgMinLimit, setNewPkgMinLimit] = useState("30");
  const [showAddPkgForm, setShowAddPkgForm] = useState(false);
  const [editingPkgItem, setEditingPkgItem] = useState<any>(null); 
  const [editPkgName, setEditPkgName] = useState("");
  const [editPkgCategory, setEditPkgCategory] = useState("");
  const [editPkgMinLimit, setEditPkgMinLimit] = useState("");
  const [newPkgCatInput, setNewPkgCatInput] = useState("");
  const [showManagePkgCat, setShowManagePkgCat] = useState(false);

  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

  // KDS / Admin PIN authentication
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    setIsVerifyingPin(true);

    try {
      const passcodeSnap = await getDoc(doc(db, "settings", "passcodes"));
      let correctPin = "971429"; 

      if (passcodeSnap.exists() && passcodeSnap.data().adminPin) {
        correctPin = String(passcodeSnap.data().adminPin);
      }

      if (enteredPin === correctPin) {
        setIsAdminAuthorized(true);
        toast.success("डैशबोर्ड अनलॉक हो गया है!");
      } else {
        toast.error("गलत सुरक्षा पिन दर्ज किया गया!");
        setEnteredPin("");
      }
    } catch (err) {
      toast.error("वेरिफिकेशन विफल रहा।");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Real-time Database listeners
  useEffect(() => {
    if (!isAdminAuthorized) return;

    // Load Daily Expenses
    const unsubExpenses = onSnapshot(query(collection(db, "expenses"), orderBy("timestamp", "desc")), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Custom Expense Categories dynamically
    const unsubExpCats = onSnapshot(query(collection(db, "expense_categories"), orderBy("name", "asc")), (snap) => {
      if (!snap.empty) {
        const loadedCats = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        setExpenseCategories(loadedCats);
        if (loadedCats.length > 0) {
          setExpenseCategory(loadedCats[0].name);
        }
      } else {
        setExpenseCategories(DEFAULT_EXP_CATEGORIES);
        setExpenseCategory(DEFAULT_EXP_CATEGORIES[0].name);
      }
    });

    // Load Fixed Assets
    const unsubAssets = onSnapshot(query(collection(db, "fixed_assets"), orderBy("timestamp", "desc")), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Store Room Bulk Inventory
    const unsubStore = onSnapshot(query(collection(db, "store_room"), orderBy("timestamp", "desc")), (snap) => {
      setStoreItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Store Room Categories dynamically
    const unsubStoreCats = onSnapshot(query(collection(db, "store_room_categories"), orderBy("name", "asc")), (snap) => {
      if (!snap.empty) {
        const loadedStoreCats = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        setStoreCategories(loadedStoreCats);
        if (loadedStoreCats.length > 0) {
          setStoreItemCategory(loadedStoreCats[0].name);
        }
      } else {
        setStoreCategories(DEFAULT_STORE_CATEGORIES);
        setStoreItemCategory(DEFAULT_STORE_CATEGORIES[0].name);
      }
    });

    // Load Store Room In/Out Ledger transactions
    const unsubLedger = onSnapshot(query(collection(db, "store_room_ledger"), orderBy("timestamp", "desc"), limit(20)), (snap) => {
      setStoreLedger(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Dynamic Packaging Categories
    const unsubPkgCats = onSnapshot(query(collection(db, "packaging_categories"), orderBy("name", "asc")), (snap) => {
      if (!snap.empty) {
        const loadedPkgCats = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        setPkgCategories(loadedPkgCats);
        if (loadedPkgCats.length > 0) {
          setNewPkgCategory(loadedPkgCats[0].name);
        }
      } else {
        setPkgCategories(DEFAULT_PKG_CATEGORIES);
        setNewPkgCategory(DEFAULT_PKG_CATEGORIES[0].name);
      }
    });

    // Load Dynamic Packaging Materials Inventory List
    const unsubPkgItems = onSnapshot(query(collection(db, "packaging_inventory"), orderBy("timestamp", "desc")), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPkgItems(items);
    });

    return () => {
      unsubExpenses();
      unsubExpCats();
      unsubAssets();
      unsubStore();
      unsubStoreCats();
      unsubLedger();
      unsubPkgCats();
      unsubPkgItems();
    };
  }, [isAdminAuthorized]);

  // Reset Search Query on Tab Change
  useEffect(() => {
    setSearchQuery("");
  }, [activeTab]);

  // --- 1. DYNAMIC EXPENSES & CATEGORIES HANDLERS ---
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const numericAmount = Number(expenseAmount);
    if (isNaN(numericAmount) || numericAmount <= 0 || !expenseDescription.trim()) {
      return toast.error("कृपया सही डिटेल्स दर्ज करें!");
    }

    try {
      await addDoc(collection(db, "expenses"), {
        amount: numericAmount,
        category: expenseCategory,
        description: expenseDescription.trim(),
        date: expenseDate,
        timestamp: new Date()
      });
      setExpenseAmount("");
      setExpenseDescription("");
      toast.success("खर्च सफलतापूर्वक दर्ज किया गया!");
    } catch (err) {
      toast.error("खर्च सहेजने में विफल।");
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    const numericAmount = Number(editingExpense.amount);
    if (isNaN(numericAmount) || numericAmount <= 0 || !editingExpense.description.trim()) {
      return toast.error("विवरण और राशि सही से दर्ज करें!");
    }

    try {
      await updateDoc(doc(db, "expenses", editingExpense.id), {
        amount: numericAmount,
        category: editingExpense.category,
        description: editingExpense.description.trim(),
        date: editingExpense.date
      });
      setEditingExpense(null);
      toast.success("खर्च संशोधन सफलतापूर्वक सहेजा गया!");
    } catch (err) {
      toast.error("खर्च अपडेट करने में विफलता।");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप वाकई इस खर्च को डिलीट करना चाहते हैं?")) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
      toast.success("खर्च हटा दिया गया।");
    } catch (err) {
      toast.error("डिलीट करने में विफल।");
    }
  };

  const handleAddExpenseCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    const cleanName = newExpenseCatInput.trim();
    if (!cleanName) return toast.error("श्रेणी का नाम दर्ज करें!");

    const exists = expenseCategories.some(c => String(c.name).toLowerCase().trim() === cleanName.toLowerCase());
    if (exists) return toast.error("यह श्रेणी पहले से ही मौजूद है!");

    try {
      await addDoc(collection(db, "expense_categories"), {
        name: cleanName,
        timestamp: new Date()
      });
      setNewExpenseCatInput("");
      toast.success(`श्रेणी '${cleanName}' सफलतापूर्वक जोड़ी गई!`);
    } catch (err) {
      toast.error("श्रेणी जोड़ने में असमर्थ।");
    }
  };

  const handleDeleteExpenseCategory = async (id: string, name: string) => {
    triggerHaptic(50);
    if (!window.confirm(`क्या आप वाकई श्रेणी '${name}' को डिलीट करना चाहते हैं?`)) return;

    try {
      await deleteDoc(doc(db, "expense_categories", id));
      toast.success("श्रेणी हटा दी गई है।");
    } catch (err) {
      toast.error("श्रेणी डिलीट करने में विफल।");
    }
  };

  // --- REPORT EXPORTERS ---
  const handleExportExpensesCSV = () => {
    const headers = ['Description', 'Category', 'Expense Date', 'Amount (INR)'];
    const keys = ['description', 'category', 'date', 'amount'];
    
    const csvRows = [];
    csvRows.push(headers.join(','));
    expenses.forEach(item => {
      const values = keys.map(key => {
        let val = item[key];
        if (val === undefined || val === null) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BumBumCafe_Expenses_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expense Excel report exported!");
  };

  const handlePrintExpensesPDF = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000');
    if (!printWindow) return toast.error("Please allow pop-ups to print reports.");

    const rowsHtml = expenses.map(e => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left;">${e.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${e.category}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${e.date}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: #16a34a;">₹${e.amount}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding: 20px; text-align: center;">No expenses recorded.</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>Daily_Expenses_Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #333; }
            h2 { text-align: center; color: #ea580c; margin-bottom: 5px; }
            p { text-align: center; font-size: 12px; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background-color: #f3f4f6; padding: 12px 10px; font-weight: bold; border-bottom: 2px solid #ddd; }
            .total { font-size: 16px; font-weight: bold; text-align: right; padding-top: 20px; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <h2>BUM BUM CAFE - DAILY EXPENSES</h2>
          <p>Report Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Description</th>
                <th style="text-align: center;">Category</th>
                <th style="text-align: center;">Date</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="total">
            <span style="margin-right: 40px;">Today's Total: ₹${todayExpense}</span>
            <span>Monthly Total: ₹${monthlyExpense}</span>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- NEW FEATURE: DYNAMIC AUTO-FILTER & EXPORT LOW STOCK CSV ---
  const handleExportFinishedStockReport = () => {
    triggerHaptic();

    // 1. Store Room Out of Stock / Low Stock items (Stock qty <= 2)
    const lowStoreItems = storeItems
      .filter(item => (Number(item.quantity) || 0) <= 2)
      .map(item => ({
        name: item.name,
        category: item.category || "General Store 📦",
        currentStock: `${item.quantity} ${item.unit}`,
        status: Number(item.quantity) === 0 ? "OUT OF STOCK" : "LOW STOCK",
        department: "Store Room"
      }));

    // 2. Packaging Out of Stock / Low Stock items (Stock qty < minLimit)
    const lowPkgItems = pkgItems
      .filter(item => (Number(item.quantity) || 0) < (Number(item.minLimit) || 30))
      .map(item => ({
        name: item.name,
        category: item.category || "Packaging 🍕",
        currentStock: `${item.quantity} Pcs`,
        status: Number(item.quantity) === 0 ? "OUT OF STOCK" : "LOW STOCK",
        department: "Packaging Stock"
      }));

    // Combine both lists
    const mergedList = [...lowStoreItems, ...lowPkgItems];

    if (mergedList.length === 0) {
      return toast.success(isHindi ? t.hi.allStockOk : t.en.allStockOk);
    }

    // Automatically sort/filter by category
    mergedList.sort((a, b) => a.category.localeCompare(b.category));

    // Create CSV content
    const headers = ["Item Name", "Category", "Current Stock", "Status", "Department"];
    const csvRows = [headers.join(",")];

    mergedList.forEach(item => {
      const row = [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.category.replace(/"/g, '""')}"`,
        `"${item.currentStock}"`,
        `"${item.status}"`,
        `"${item.department}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\r\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BumBumCafe_Finished_Stock_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(isHindi ? "समाप्त स्टॉक सूची सफलतापूर्वक डाउनलोड हो गई!" : "Finished stock report downloaded!");
  };

  // --- 2. ASSET HANDLERS ---
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const numericCost = Number(assetCost);
    const numericLifespan = Number(assetLifespan);
    if (!assetName.trim() || isNaN(numericCost) || numericCost <= 0 || isNaN(numericLifespan) || numericLifespan <= 0) {
      return toast.error("कृपया सभी उपकरण फ़ील्ड सही से भरें!");
    }

    try {
      await addDoc(collection(db, "fixed_assets"), {
        name: assetName.trim(),
        cost: numericCost,
        purchaseDate: assetPurchaseDate,
        lifespanYears: numericLifespan,
        nextMaintenanceDate: assetMaintenance || "",
        timestamp: new Date()
      });
      setAssetName("");
      setAssetCost("");
      setAssetPurchaseDate("");
      setAssetLifespan("");
      setAssetMaintenance("");
      toast.success("नया अचल उपकरण दर्ज किया गया!");
    } catch (err) {
      toast.error("उपकरण सहेजने में विफल।");
    }
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    const numericCost = Number(editingAsset.cost);
    const numericLifespan = Number(editingAsset.lifespanYears);
    if (!editingAsset.name.trim() || isNaN(numericCost) || numericCost <= 0 || isNaN(numericLifespan) || numericLifespan <= 0) {
      return toast.error("कृपया सभी फ़ील्ड सही से भरें!");
    }

    try {
      await updateDoc(doc(db, "fixed_assets", editingAsset.id), {
        name: editingAsset.name.trim(),
        cost: numericCost,
        purchaseDate: editingAsset.purchaseDate,
        lifespanYears: numericLifespan,
        nextMaintenanceDate: editingAsset.nextMaintenanceDate || ""
      });
      setEditingAsset(null);
      toast.success("संपत्ति विवरण सफलतापूर्वक संशोधित किया गया!");
    } catch (err) {
      toast.error("अपडेट करने में असमर्थ।");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप इस संपत्ति को हटाना चाहते हैं?")) return;
    try {
      await deleteDoc(doc(db, "fixed_assets", id));
      toast.success("संपत्ति डेटा हटा दिया गया।");
    } catch (err) {
      toast.error("हटाने में विफल।");
    }
  };

  // --- 3. STORE ROOM & LEDGER HANDLERS ---
  const handleSaveStoreItem = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const numericQty = Number(storeItemQty);
    if (!storeItemName.trim() || isNaN(numericQty) || numericQty < 0) {
      return toast.error("कृपया सही आइटम और मात्रा दर्ज करें!");
    }

    try {
      // 1. Save main Store Room document
      const docRef = await addDoc(collection(db, "store_room"), {
        name: storeItemName.trim(),
        quantity: numericQty,
        category: storeItemCategory,
        unit: storeItemUnit,
        timestamp: new Date()
      });

      // 2. Log initial entry in Transaction Ledger as "In (आया)"
      await addDoc(collection(db, "store_room_ledger"), {
        itemId: docRef.id,
        name: storeItemName.trim(),
        quantity: numericQty,
        unit: storeItemUnit,
        type: "in",
        timestamp: new Date()
      });

      setStoreItemName("");
      setStoreItemQuantity("");
      toast.success("स्टोर रूम में माल दर्ज हो गया!");
    } catch (err) {
      toast.error("स्टोर रूम में जोड़ने में विफल।");
    }
  };

  const handleUpdateStoreItem = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    const numericQty = Number(editingStoreItem.quantity);
    if (!editingStoreItem.name.trim() || isNaN(numericQty) || numericQty < 0) {
      return toast.error("कृपया नाम और मात्रा सही दर्ज करें!");
    }

    try {
      // Calculate transaction difference for ledger logging
      const originalDoc = storeItems.find(i => i.id === editingStoreItem.id);
      const originalQty = originalDoc ? originalDoc.quantity : 0;
      const difference = numericQty - originalQty;

      await updateDoc(doc(db, "store_room", editingStoreItem.id), {
        name: editingStoreItem.name.trim(),
        quantity: numericQty,
        category: editingStoreItem.category,
        unit: editingStoreItem.unit
      });

      // If quantity was manually adjusted, write audit log
      if (difference !== 0) {
        await addDoc(collection(db, "store_room_ledger"), {
          itemId: editingStoreItem.id,
          name: editingStoreItem.name.trim(),
          quantity: Math.abs(difference),
          unit: editingStoreItem.unit,
          type: difference > 0 ? "in" : "out",
          timestamp: new Date()
        });
      }

      setEditingStoreItem(null);
      toast.success("स्टोर आइटम विवरण संशोधित किया गया!");
    } catch (err) {
      toast.error("विवरण अपडेट करने में असमर्थ।");
    }
  };

  const handleMoveToKitchen = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const moveQty = Number(transferQtyInput);
    if (isNaN(moveQty) || moveQty <= 0 || moveQty > isTransferringStock.quantity) {
      return toast.error("कृपया स्थानांतरित करने के लिए वैध मात्रा दर्ज करें!");
    }

    try {
      const itemRef = doc(db, "store_room", isTransferringStock.id);
      await updateDoc(itemRef, {
        quantity: increment(-moveQty)
      });

      // Log dispatch Transaction Ledger as "Out (गया)"
      await addDoc(collection(db, "store_room_ledger"), {
        itemId: isTransferringStock.id,
        name: isTransferringStock.name,
        quantity: moveQty,
        unit: isTransferringStock.unit,
        type: "out",
        timestamp: new Date()
      });

      toast.success(`${moveQty} ${isTransferringStock.unit} ${isTransferringStock.name} किचन में भेजा गया! 👨‍🍳`);
      setIsTransferringStock(null);
      setTransferQtyInput("");
    } catch (err) {
      toast.error("ट्रांसफर करने में समस्या आई।");
    }
  };

  const handleDeleteStoreItem = async (id: string) => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप इसे स्टोर रूम से हटाना चाहते हैं?")) return;
    try {
      await deleteDoc(doc(db, "store_room", id));
      toast.success("स्टोर आइटम हटाया गया।");
    } catch (err) {
      toast.error("हटाने में विफल।");
    }
  };

  // --- Dynamic Store Room Categories Handlers ---
  const handleAddStoreCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    const cleanName = newStoreCatInput.trim();
    if (!cleanName) return toast.error("श्रेणी का नाम दर्ज करें!");

    const exists = storeCategories.some(c => c.name.toLowerCase().trim() === cleanName.toLowerCase());
    if (exists) return toast.error("यह श्रेणी पहले से मौजूद है!");

    try {
      await addDoc(collection(db, "store_room_categories"), {
        name: cleanName,
        timestamp: new Date()
      });
      setNewStoreCatInput("");
      toast.success(`स्टोर श्रेणी '${cleanName}' जोड़ी गई!`);
    } catch (err) {
      toast.error("श्रेणी जोड़ने में असमर्थ।");
    }
  };

  const handleUpdateStoreCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();
    if (!editStoreCatName.trim()) return toast.error("नाम खाली नहीं हो सकता!");

    try {
      await updateDoc(doc(db, "store_room_categories", editingStoreCat.id), {
        name: editStoreCatName.trim()
      });
      setEditingStoreCat(null);
      toast.success("स्टोर श्रेणी नाम अपडेट किया गया!");
    } catch (err) {
      toast.error("संशोधन सहेजने में त्रुटि।");
    }
  };

  const handleDeleteStoreCategory = async (id: string, name: string) => {
    triggerHaptic(50);
    if (!window.confirm(`क्या आप वाकई कैटेगरी '${name}' को डिलीट करना चाहते हैं?`)) return;

    try {
      await deleteDoc(doc(db, "store_room_categories", id));
      toast.success("कैटेगरी हटा दी गई।");
    } catch (err) {
      toast.error("कैटेगरी हटाने में विफल।");
    }
  };


  // --- 4. DYNAMIC PACKAGING & DISPOSABLES HANDLERS ---
  const handleSavePkgItem = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const numericQty = Number(newPkgQty);
    const numericLimit = Number(newPkgMinLimit);
    if (!newPkgName.trim() || isNaN(numericQty) || numericQty < 0 || isNaN(numericLimit) || numericLimit < 0) {
      return toast.error("कृपया सभी फ़ील्ड्स सही से भरें!");
    }

    try {
      await addDoc(collection(db, "packaging_inventory"), {
        name: newPkgName.trim(),
        quantity: numericQty,
        category: newPkgCategory,
        minLimit: numericLimit,
        timestamp: new Date()
      });
      setNewPkgName("");
      setNewPkgQty("");
      setNewPkgMinLimit("30");
      setShowAddPkgForm(false);
      toast.success("नया पैकेजिंग माल सफलतापूर्वक जोड़ा गया! 📦");
    } catch (err) {
      toast.error("पैकेजिंग माल जोड़ने में विफल।");
    }
  };

  const handleUpdatePkgStock = async (id: string, currentStock: number, valChange: number) => {
    triggerHaptic();
    const finalVal = currentStock + valChange;
    if (finalVal < 0) return;
    try {
      await updateDoc(doc(db, "packaging_inventory", id), {
        quantity: finalVal
      });
    } catch (err) {
      toast.error("स्टॉक अपडेट करने में विफल।");
    }
  };

  const handleEditPkgItem = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const numericLimit = Number(editPkgMinLimit);
    if (!editPkgName.trim() || isNaN(numericLimit) || numericLimit < 0) {
      return toast.error("कृपया सही नाम और अलर्ट सीमा भरें!");
    }

    try {
      await updateDoc(doc(db, "packaging_inventory", editingPkgItem.id), {
        name: editPkgName.trim(),
        category: editPkgCategory,
        minLimit: numericLimit
      });
      setEditingPkgItem(null);
      toast.success("आइटम विवरण सफलतापूर्वक अपडेट किया गया!");
    } catch (err) {
      toast.error("विवरण अपडेट करने में विफल।");
    }
  };

  const handleDeletePkgItem = async (id: string, name: string) => {
    triggerHaptic(50);
    if (!window.confirm(`क्या आप वाकई '${name}' को हमेशा के लिए डिलीट करना चाहते हैं?`)) return;

    try {
      await deleteDoc(doc(db, "packaging_inventory", id));
      toast.success("आइटम सफलतापूर्वक हटा दिया गया।");
    } catch (err) {
      toast.error("आइटम हटाने में विफल।");
    }
  };

  const handleAddPkgCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const cleanCat = newPkgCatInput.trim();
    if (!cleanCat) return toast.error("कैटेगरी का नाम दर्ज करें!");

    const exists = pkgCategories.some(c => c.name.toLowerCase().trim() === cleanCat.toLowerCase());
    if (exists) return toast.error("यह कैटेगरी पहले से मौजूद है!");

    try {
      await addDoc(collection(db, "packaging_categories"), {
        name: cleanCat,
        timestamp: new Date()
      });
      setNewPkgCatInput("");
      toast.success(`कैटेगरी '${cleanCat}' सफलतापूर्वक जोड़ी गई!`);
    } catch (err) {
      toast.error("कैटेगरी जोड़ने में विफल।");
    }
  };

  const handleDeletePkgCategory = async (id: string, name: string) => {
    triggerHaptic(50);
    if (!window.confirm(`क्या आप वाकई कैटेगरी '${name}' को डिलीट करना चाहते हैं?`)) return;

    try {
      await deleteDoc(doc(db, "packaging_categories", id));
      toast.success("कैटेगरी हटा दी गई।");
    } catch (err) {
      toast.error("कैटेगरी हटाने में विफल।");
    }
  };

  // --- SEARCH FILTERING LOGIC ---
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase().trim();
    return expenses.filter(e => 
      e.description.toLowerCase().includes(q) || 
      e.category.toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const q = searchQuery.toLowerCase().trim();
    return assets.filter(a => a.name.toLowerCase().includes(q));
  }, [assets, searchQuery]);

  const filteredStoreItems = useMemo(() => {
    if (!searchQuery.trim()) return storeItems;
    const q = searchQuery.toLowerCase().trim();
    return storeItems.filter(i => 
      i.name.toLowerCase().includes(q) || 
      (i.category && i.category.toLowerCase().includes(q))
    );
  }, [storeItems, searchQuery]);

  const filteredPkgItems = useMemo(() => {
    if (!searchQuery.trim()) return pkgItems;
    const q = searchQuery.toLowerCase().trim();
    return pkgItems.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.category.toLowerCase().includes(q)
    );
  }, [pkgItems, searchQuery]);

  const activeTranslation = isHindi ? t.hi : t.en;

  // Total low stock count from both Store and Packaging
  const totalLowStockItemsCount = useMemo(() => {
    const storeLowCount = storeItems.filter(item => (Number(item.quantity) || 0) <= 2).length;
    const pkgLowCount = pkgItems.filter(item => (Number(item.quantity) || 0) < (Number(item.minLimit) || 30)).length;
    return storeLowCount + pkgLowCount;
  }, [storeItems, pkgItems]);

  // --- SECURITY LOCK SCREEN ---
  if (!isAdminAuthorized) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4">
        <Toaster />
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center relative overflow-hidden">
          <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-orange-500 uppercase italic">Admin Helper Locked 🔒</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Back-End Operations System</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              type="password" 
              maxLength={6} 
              placeholder="Enter Master PIN" 
              value={enteredPin} 
              onChange={(e) => setEnteredPin(e.target.value)} 
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
              required 
            />
            <button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
            >
              Verify and Enter ➔
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-32 font-sans relative overflow-x-clip transition-colors duration-200">
      <Toaster />

      {/* HEADER PANEL */}
      <header className="sticky top-0 z-40 dark:bg-[#050505]/95 bg-[#050505]/95 backdrop-blur-md py-4 px-4 border-b dark:border-white/5 border-white/5 shadow-sm">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => { triggerHaptic(); window.history.back(); }}
              className="p-2.5 dark:bg-white/5 bg-white/5 rounded-xl hover:bg-white/10 text-gray-400"
              title="Back"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="font-black text-sm uppercase tracking-wider text-orange-500">{activeTranslation.title}</h1>
              <p className="text-[8px] text-gray-400 font-bold uppercase">{activeTranslation.subTitle}</p>
            </div>
          </div>

          {/* HINDI / ENGLISH LANGUAGE TOGGLE */}
          <button 
            type="button"
            onClick={() => { triggerHaptic(); setIsHindi(!isHindi); }}
            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[9px] font-black tracking-wider shadow flex items-center gap-1"
          >
            <Globe size={11} />
            <span>{isHindi ? "English" : "हिंदी"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">

        {/* OPERATION TABS SELECTION */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { id: 'expenses', label: activeTranslation.expensesTab },
            { id: 'assets', label: activeTranslation.assetsTab },
            { id: 'store_room', label: activeTranslation.storeTab },
            { id: 'packaging', label: activeTranslation.packagingTab }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { triggerHaptic(); setActiveTab(tab.id as any); }}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase whitespace-nowrap border transition-all ${activeTab === tab.id ? 'bg-orange-500 border-orange-500 text-white shadow-lg' : 'bg-white/[0.02] border-white/5 text-gray-400'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* STICKY SEARCH BAR (Locked cleanly below subheader) */}
        <div className="sticky top-[72px] z-30 bg-[#050505]/95 backdrop-blur-md py-3.5 border-b border-white/5 rounded-b-2xl shadow-lg px-1">
          <div className="relative group max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder={activeTranslation.searchPlaceholder} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-xs font-semibold rounded-xl py-2.5 pl-11 pr-4 text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        {/* --- GLOBAL LOW STOCK REORDER CONTROLLER CARD --- */}
        {totalLowStockItemsCount > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-3xl space-y-3 shadow-md animate-pulse">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-black uppercase text-red-500 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> {isHindi ? "⚠️ कम / समाप्त स्टॉक चेतावनी" : "⚠️ Low / Out of Stock Alert"}
                </p>
                <p className="text-[9px] text-gray-400 font-medium mt-1">
                  {isHindi ? `स्टोर रूम और पैकेजिंग में ${totalLowStockItemsCount} सामग्रियां कम हैं।` : `${totalLowStockItemsCount} items are running low or out of stock.`}
                </p>
              </div>
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                {totalLowStockItemsCount}
              </span>
            </div>
            
            {/* Auto-Filtered Export Trigger Button */}
            <button
              type="button"
              onClick={handleExportFinishedStockReport}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow"
            >
              <Download size={12} />
              {activeTranslation.lowStockReportBtn}
            </button>
          </div>
        )}

        {/* --- TAB 1: DAILY EXPENSES --- */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                <span className="text-[8px] font-black text-gray-400 uppercase">{activeTranslation.todayExpense}</span>
                <h3 className="text-lg font-black text-green-400 mt-1">₹{todayExpense}</h3>
              </div>
              <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                <span className="text-[8px] font-black text-gray-400 uppercase">{activeTranslation.monthExpense}</span>
                <h3 className="text-lg font-black text-orange-500 mt-1">₹{monthlyExpense}</h3>
              </div>
            </div>

            {/* EXPENSE CATEGORY MANAGER SECTION */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-400">{activeTranslation.manageCategories}</p>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setShowManageCatPanel(!showManageCatPanel); }}
                  className="px-3 py-1 bg-white/5 rounded-xl text-[9px] font-black uppercase border border-white/10"
                >
                  {showManageCatPanel ? (isHindi ? "बंद करें" : "Close") : (isHindi ? "खोलें" : "Open")}
                </button>
              </div>

              <AnimatePresence>
                {showManageCatPanel && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    <form onSubmit={handleAddExpenseCategory} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder={activeTranslation.newCategoryPlaceholder}
                        value={newExpenseCatInput}
                        onChange={(e) => setNewExpenseCatInput(e.target.value)}
                        className="flex-1 text-xs font-semibold p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                      />
                      <button 
                        type="submit"
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase"
                      >
                        {activeTranslation.addCategoryBtn}
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar pt-1">
                      {expenseCategories.map(cat => (
                        <div 
                          key={cat.id} 
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] border border-white/5 rounded-xl text-xs font-bold"
                        >
                          <span className="text-gray-300">{cat.name}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpenseCategory(cat.id, cat.name)}
                            className="text-gray-500 hover:text-red-500 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={handleSaveExpense} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 border-b border-white/5 pb-2">
                ➕ {activeTranslation.addExpense}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.amount}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500" 
                    value={expenseAmount} 
                    onChange={(e) => setExpenseAmount(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.category}</label>
                  <select 
                    value={expenseCategory} 
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                  >
                    {expenseCategories.map(cat => (
                      <option key={cat.id} value={cat.name} className="bg-[#111]">{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "तारीख (Date)" : "Date"}</label>
                  <input 
                    type="date" 
                    value={expenseDate} 
                    onChange={(e) => setExpenseDate(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "खर्च का विवरण (Details)" : "Details/Notes"}</label>
                  <textarea 
                    placeholder={activeTranslation.description}
                    value={expenseDescription} 
                    onChange={(e) => setExpenseDescription(e.target.value)} 
                    className="w-full text-xs font-semibold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 h-16 resize-none"
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                {activeTranslation.save}
              </button>
            </form>

            <div className="space-y-3">
              <div className="flex justify-between items-center pl-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isHindi ? "📜 हालिया खर्च सूची" : "📜 Recent Expenses Ledger"}</p>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={handleExportExpensesCSV}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-[9px] font-black text-green-400 flex items-center gap-1 uppercase transition-all"
                  >
                    <Download size={10} /> Excel
                  </button>
                  <button 
                    type="button"
                    onClick={handlePrintExpensesPDF}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-[9px] font-black text-blue-400 flex items-center gap-1 uppercase transition-all"
                  >
                    <Printer size={10} /> PDF/Print
                  </button>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-xs uppercase font-bold">{isHindi ? "कोई खर्च दर्ज नहीं मिला।" : "No expense logs recorded yet."}</p>
              ) : (
                filteredExpenses.map(e => (
                  <div key={e.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold hover:bg-white/[0.04] transition-colors relative">
                    <div className="space-y-1 pr-6 flex-1">
                      <h4 className="text-gray-200">{e.description}</h4>
                      <p className="text-[9px] text-orange-400 uppercase">{e.category} • {e.date}</p>
                    </div>
                    <div className="text-right flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-green-400 font-black">₹{e.amount}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingExpense({ ...e });
                        }}
                        className="text-blue-400 hover:text-blue-500 p-1"
                        title="Edit inline"
                      >
                        <Edit size={14} />
                      </button>
                      <button type="button" onClick={() => handleDeleteExpense(e.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* In-place popup modal to edit expense */}
            <AnimatePresence>
              {editingExpense && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                  <motion.form 
                    onSubmit={handleUpdateExpense}
                    className="bg-[#111] border border-orange-500/30 p-6 rounded-3xl w-full max-w-sm space-y-4"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    <h4 className="font-black text-sm uppercase text-orange-500 text-center">✏️ Edit Expense (खर्च संशोधित करें)</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">{activeTranslation.amount}</label>
                      <input 
                        type="number" 
                        value={editingExpense.amount}
                        onChange={(e) => setEditingExpense({ ...editingExpense, amount: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">{activeTranslation.category}</label>
                      <select 
                        value={editingExpense.category}
                        onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                      >
                        {expenseCategories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Date</label>
                      <input 
                        type="date" 
                        value={editingExpense.date}
                        onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase font-sans">Details</label>
                      <textarea 
                        value={editingExpense.description}
                        onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                        className="w-full text-xs font-semibold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white h-16 resize-none"
                        required 
                      />
                    </div>
                    <div className="flex gap-2 font-sans">
                      <button type="submit" className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase">Save</button>
                      <button type="button" onClick={() => setEditingExpense(null)} className="bg-white/5 text-gray-400 font-bold py-2.5 rounded-xl text-[10px] uppercase">Cancel</button>
                    </div>
                  </motion.form>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* --- TAB 2: FIXED ASSETS LEDGER --- */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <form onSubmit={handleSaveAsset} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 border-b border-white/5 pb-2">
                🏢 {isHindi ? "नया अचल उपकरण जोड़ें" : "Add New Fixed Asset / Machine"}
              </p>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.assetName}</label>
                <input 
                  type="text" 
                  placeholder="e.g. Deep Fridge / Sandwich Griller" 
                  value={assetName} 
                  onChange={(e) => setAssetName(e.target.value)} 
                  className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.purchaseCost}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 15000" 
                    value={assetCost} 
                    onChange={(e) => setAssetCost(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.lifespan}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 5" 
                    value={assetLifespan} 
                    onChange={(e) => setAssetLifespan(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.purchaseDate}</label>
                  <input 
                    type="date" 
                    value={assetPurchaseDate} 
                    onChange={(e) => setAssetPurchaseDate(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.nextService}</label>
                  <input 
                    type="date" 
                    value={assetMaintenance} 
                    onChange={(e) => setAssetMaintenance(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                {activeTranslation.save}
              </button>
            </form>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{isHindi ? "⚙️ संपत्ति सूची व वर्तमान मूल्य" : "⚙️ Registered Assets & Book Value"}</p>
              {filteredAssets.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-xs uppercase font-bold">{isHindi ? "कोई उपकरण पंजीकृत नहीं है।" : "No registered assets yet."}</p>
              ) : (
                filteredAssets.map(a => {
                  const currentVal = calculateCurrentValue(a.purchaseDate, Number(a.cost), Number(a.lifespanYears));
                  const isMaintenanceOverdue = a.nextMaintenanceDate && new Date(a.nextMaintenanceDate).getTime() < new Date().getTime();

                  return (
                    <div key={a.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-3 hover:bg-white/[0.04] transition-colors relative">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-sm font-black text-gray-200">{a.name}</h4>
                          <p className="text-[9px] text-gray-500 uppercase mt-0.5">{isHindi ? "खरीद मूल्य" : "Original Cost"}: ₹{a.cost} • {a.purchaseDate}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingAsset({ ...a });
                            }}
                            className="text-blue-400 hover:text-blue-500 p-1"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDeleteAsset(a.id)} className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2.5 text-[10px] font-semibold text-gray-400">
                        <div>
                          <p className="text-[8px] uppercase text-gray-500">{activeTranslation.currentValue}</p>
                          <p className="text-green-400 font-bold text-sm mt-0.5">₹{currentVal}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] uppercase text-gray-500">{isHindi ? "सर्विसिंग अलर्ट" : "Maintenance Status"}</p>
                          {a.nextMaintenanceDate ? (
                            <p className={`font-bold mt-0.5 text-[9px] uppercase ${isMaintenanceOverdue ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
                              {isMaintenanceOverdue ? (isHindi ? "⚠️ ओवरड्यू!" : "⚠️ Overdue!") : a.nextMaintenanceDate}
                            </p>
                          ) : (
                            <p className="text-gray-600 mt-0.5">N/A</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* In-place popup modal to edit fixed asset */}
            <AnimatePresence>
              {editingAsset && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                  <motion.form 
                    onSubmit={handleUpdateAsset}
                    className="bg-[#111] border border-orange-500/30 p-6 rounded-3xl w-full max-w-sm space-y-4"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    <h4 className="font-black text-sm uppercase text-orange-500 text-center">✏️ Edit Fixed Asset (संपत्ति विवरण बदलें)</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.assetName}</label>
                      <input 
                        type="text" 
                        value={editingAsset.name}
                        onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-orange-500"
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 font-sans">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase font-sans">Cost (₹)</label>
                        <input 
                          type="number" 
                          value={editingAsset.cost}
                          onChange={(e) => setEditingAsset({ ...editingAsset, cost: e.target.value })}
                          className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 outline-none text-white"
                          required 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-400 uppercase font-sans">Lifespan</label>
                        <input 
                          type="number" 
                          value={editingAsset.lifespanYears}
                          onChange={(e) => setEditingAsset({ ...editingAsset, lifespanYears: e.target.value })}
                          className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10"
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase font-sans">Purchase Date</label>
                      <input 
                        type="date" 
                        value={editingAsset.purchaseDate}
                        onChange={(e) => setEditingAsset({ ...editingAsset, purchaseDate: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 text-white"
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase font-sans">Next Service Date</label>
                      <input 
                        type="date" 
                        value={editingAsset.nextMaintenanceDate}
                        onChange={(e) => setEditingAsset({ ...editingAsset, nextMaintenanceDate: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 text-white"
                      />
                    </div>
                    <div className="flex gap-2 font-sans">
                      <button type="submit" className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase">Update</button>
                      <button type="button" onClick={() => setEditingAsset(null)} className="bg-white/5 text-gray-400 p-2.5 rounded-xl font-black text-[10px] uppercase">Cancel</button>
                    </div>
                  </motion.form>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* --- TAB 3: STORE ROOM STOCK --- */}
        {activeTab === 'store_room' && (
          <div className="space-y-6">
            
            {/* Store Room Categories Configuration UI */}
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl space-y-3 shadow-md">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-400">{isHindi ? "⚙️ स्टोर रूम श्रेणियां" : "⚙️ Manage Store Categories"}</p>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); setShowManageStoreCat(!showManageStoreCat); }}
                  className="px-3 py-1 bg-white/5 rounded-xl text-[9px] font-black uppercase border border-white/10"
                >
                  {showManageStoreCat ? (isHindi ? "बंद करें" : "Close") : (isHindi ? "खोलें" : "Open")}
                </button>
              </div>

              <AnimatePresence>
                {showManageStoreCat && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    <form onSubmit={handleAddStoreCategory} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder={isHindi ? "नई स्टोर श्रेणी लिखें (उदा. डेरी)" : "New Category (e.g. Dairy)"}
                        value={newStoreCatInput}
                        onChange={(e) => setNewStoreCatInput(e.target.value)}
                        className="flex-1 text-xs font-semibold p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                      />
                      <button 
                        type="submit"
                        className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase"
                      >
                        {isHindi ? "जोड़ें" : "Add"}
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar pt-1">
                      {storeCategories.map(cat => (
                        <div 
                          key={cat.id} 
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] border border-white/5 rounded-xl text-xs font-bold"
                        >
                          <span className="text-gray-300">{cat.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStoreCat(cat);
                              setEditStoreCatName(cat.name);
                            }}
                            className="text-blue-400 hover:text-blue-500 p-0.5 ml-1"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStoreCategory(cat.id, cat.name)}
                            className="text-gray-500 hover:text-red-500 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* In-place popup modal to edit store category name */}
            <AnimatePresence>
              {editingStoreCat && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[125] flex items-center justify-center p-6">
                  <form 
                    onSubmit={handleUpdateStoreCategory}
                    className="bg-[#111] border border-orange-500/30 p-6 rounded-3xl w-full max-w-sm space-y-4 font-sans"
                  >
                    <h4 className="font-black text-sm uppercase text-orange-500 text-center">✏️ Edit Store Category</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">Category Name</label>
                      <input 
                        type="text" 
                        value={editStoreCatName}
                        onChange={(e) => setEditStoreCatName(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white"
                        required 
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase">Update</button>
                      <button type="button" onClick={() => setEditingStoreCat(null)} className="bg-white/5 text-gray-400 font-bold py-2.5 rounded-xl text-[10px] uppercase">Cancel</button>
                    </div>
                  </form>
                </div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSaveStoreItem} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 border-b border-white/5 pb-2">
                📦 {isHindi ? "स्टोर रूम थोक स्टॉक दर्ज करें" : "Add Bulk Inventory to Store Room"}
              </p>

              {/* Pre-filled dropdown to prevent spelling errors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "सूची से सामग्री चुनें (Suggested)" : "Choose Suggested Material"}</label>
                  <select 
                    onChange={(e) => {
                      if (e.target.value) {
                        setStoreItemName(e.target.value);
                      }
                    }}
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white cursor-pointer"
                  >
                    <option value="">{activeTranslation.suggestedSelect}</option>
                    {SUGGESTED_STORE_ITEMS.map((item, idx) => (
                      <option key={idx} value={item} className="bg-[#111]">{item}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.customInput}</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Flour (मैदा) / Mozzarella Cheese" 
                    value={storeItemName} 
                    onChange={(e) => setStoreItemName(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "मात्रा (Quantity)" : "Quantity"}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 5" 
                    value={storeItemQty} 
                    onChange={(e) => setStoreItemQuantity(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "इकाई (Unit)" : "Unit"}</label>
                  <select 
                    value={storeItemUnit} 
                    onChange={(e) => setStoreItemUnit(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                  >
                    <option value="Kg">Kilogram (Kg)</option>
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Bags">Bags (बोरियां)</option>
                    <option value="Tins">Tins (डिब्बे)</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
              </div>

              {/* Dynamic store category selector dropdown */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "स्टोर श्रेणी (Category)" : "Store Category"}</label>
                <select 
                  value={storeItemCategory} 
                  onChange={(e) => setStoreItemCategory(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                >
                  {storeCategories.map(cat => (
                    <option key={cat.id} value={cat.name} className="bg-[#111]">{cat.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                {activeTranslation.save}
              </button>
            </form>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{isHindi ? "📦 वर्तमान स्टोर रूम स्टॉक" : "📦 Current Store Room Stock"}</p>
              {filteredStoreItems.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-xs uppercase font-bold">{isHindi ? "स्टोर रूम खाली है।" : "Store room is empty."}</p>
              ) : (
                filteredStoreItems.map(item => {
                  const isLow = Number(item.quantity) <= 2;
                  return (
                    <div key={item.id} className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold hover:bg-white/[0.04] transition-colors border relative ${isLow ? 'bg-red-500/[0.01] border-red-500/30' : 'bg-white/[0.02] border-white/5'}`}>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-gray-200">{item.name}</h4>
                          {isLow && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                        </div>
                        <p className={`text-[10px] uppercase ${isLow ? 'text-red-500' : 'text-green-400'}`}>{item.quantity} {item.unit} available</p>
                        <span className="text-[8px] bg-neutral-900 text-gray-400 border border-white/5 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">{item.category || "General"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => { triggerHaptic(); setIsTransferringStock(item); }}
                          className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-orange-500/20"
                        >
                          <ArrowRightLeft size={10} /> {isHindi ? "किचन में भेजें" : "Move"}
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingStoreItem({ ...item });
                          }}
                          className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg"
                          title="Edit inline"
                        >
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteStoreItem(item.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Store Room In/Out Transaction Ledger passbook */}
            <div className="bg-[#111] border border-white/5 p-5 rounded-[2.5rem] space-y-4">
              <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                <History size={15} /> {isHindi ? "📜 आवक-जावक रजिस्टर (Ledger)" : "📜 Store Room In/Out Ledger"}
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                {storeLedger.map((log: any) => (
                  <div key={log.id} className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl flex justify-between items-center text-[10px] font-bold">
                    <div className="space-y-0.5">
                      <p className="text-gray-300 uppercase">{log.name}</p>
                      <p className="text-[8px] text-gray-500">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Just now"}
                      </p>
                    </div>
                    <div className="text-right font-sans">
                      <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase ${log.type === 'in' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'}`}>
                        {log.type === 'in' ? (isHindi ? "आया (+)" : "Received") : (isHindi ? "किचन गया (-)" : "Dispatched")}
                      </span>
                      <p className="text-white mt-1 text-[11px] font-black">{log.quantity} {log.unit}</p>
                    </div>
                  </div>
                ))}
                {storeLedger.length === 0 && (
                  <p className="text-center text-[9px] text-gray-400 font-bold uppercase py-4">No transactions logged yet...</p>
                )}
              </div>
            </div>

            {/* In-place popup modal to edit store room item details */}
            <AnimatePresence>
              {editingStoreItem && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                  <motion.form 
                    onSubmit={handleUpdateStoreItem}
                    className="bg-[#111] border border-orange-500/30 p-6 rounded-3xl w-full max-w-sm space-y-4 font-sans"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    <h4 className="font-black text-sm uppercase text-orange-500 text-center">✏️ Edit Store Item (आइटम विवरण बदलें)</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-450 uppercase">Item Name</label>
                      <input 
                        type="text" 
                        value={editingStoreItem.name}
                        onChange={(e) => setEditingStoreItem({ ...editingStoreItem, name: e.target.value })}
                        className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                        required 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Current Stock Qty</label>
                        <input 
                          type="number" 
                          value={editingStoreItem.quantity}
                          onChange={(e) => setEditingStoreItem({ ...editingStoreItem, quantity: e.target.value })}
                          className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white"
                          required 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-gray-450 uppercase">Category</label>
                        <select 
                          value={editingStoreItem.category || ""}
                          onChange={(e) => setEditingStoreItem({ ...editingStoreItem, category: e.target.value })}
                          className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 text-neutral-900 dark:text-white cursor-pointer"
                        >
                          {storeCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase font-sans">Update</button>
                      <button type="button" onClick={() => setEditingStoreItem(null)} className="bg-white/5 text-gray-400 font-bold py-2.5 rounded-xl text-[10px] uppercase font-sans">Cancel</button>
                    </div>
                  </motion.form>
                </div>
              )}
            </AnimatePresence>

            {/* Pop-up modal for stock movement */}
            <AnimatePresence>
              {isTransferringStock && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                  <motion.form 
                    onSubmit={handleMoveToKitchen}
                    className="bg-[#111] border border-orange-500/30 p-6 rounded-3xl w-full max-w-sm space-y-4 text-center font-sans"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                  >
                    <div className="p-3 bg-orange-500/10 text-orange-500 rounded-full w-max mx-auto">
                      <ArrowRightLeft size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase text-orange-500">{activeTranslation.moveStock}</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Item: {isTransferringStock.name} (Max: {isTransferringStock.quantity} {isTransferringStock.unit})</p>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.qtyToMove}</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 1" 
                        value={transferQtyInput} 
                        onChange={(e) => setTransferQtyInput(e.target.value)} 
                        className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white text-center"
                        required 
                      />
                    </div>

                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase">
                        Confirm Move
                      </button>
                      <button type="button" onClick={() => { setIsTransferringStock(null); setTransferQtyInput(""); }} className="bg-white/5 text-gray-400 font-bold py-2.5 rounded-xl text-[10px] uppercase">
                        {activeTranslation.close}
                      </button>
                    </div>
                  </motion.form>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* --- TAB 4: DYNAMIC PACKAGING & DISPOSABLES DASHBOARD --- */}
        {activeTab === 'packaging' && (
          <div className="space-y-6">
            
            {/* Quick Actions (Add Pkg Item / Manage Categories) */}
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onClick={() => { triggerHaptic(); setShowManagePkgCat(!showManagePkgCat); }} 
                className="bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-2xl font-black text-xs uppercase text-center text-gray-300"
              >
                ⚙️ {isHindi ? "कैटेगरी प्रबंधित करें" : "Manage Categories"}
              </button>
              <button 
                type="button" 
                onClick={() => { triggerHaptic(); setShowAddPkgForm(!showAddPkgForm); setEditingPkgItem(null); }} 
                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 py-3 rounded-2xl font-black text-xs uppercase text-center"
              >
                {showAddPkgForm ? (isHindi ? "फॉर्म बंद करें" : "Close Form") : (isHindi ? "➕ नया माल जोड़ें" : "➕ Add New Item")}
              </button>
            </div>

            {/* Packaging Categories Management */}
            <AnimatePresence>
              {showManagePkgCat && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-white/[0.02] border border-white/5 p-4 rounded-3xl space-y-3"
                >
                  <p className="text-[10px] font-black uppercase text-orange-400">{isHindi ? "पैकेजिंग श्रेणियां जोड़ें:" : "Manage Packaging Categories:"}</p>
                  <form onSubmit={handleAddPkgCategory} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={isHindi ? "उदा. डब्बे, चम्मच, टिशू" : "e.g., Boxes, Cutlery"}
                      value={newPkgCatInput}
                      onChange={(e) => setNewPkgCatInput(e.target.value)}
                      className="flex-1 text-xs font-semibold p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                      required
                    />
                    <button type="submit" className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase">{isHindi ? "जोड़ें" : "Add"}</button>
                  </form>

                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar pt-1">
                    {pkgCategories.map(cat => (
                      <div key={cat.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] border border-white/5 rounded-xl text-xs font-bold">
                        <span className="text-gray-300">{cat.name}</span>
                        <button type="button" onClick={() => handleDeletePkgCategory(cat.id, cat.name)} className="text-gray-500 hover:text-red-500 p-0.5"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add New Packaging Item Form */}
            {showAddPkgForm && (
              <form onSubmit={handleSavePkgItem} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 border-b border-white/5 pb-2">
                  📦 {isHindi ? "नया पैकेजिंग/डिस्पोजल माल जोड़ें" : "Add Packaging/Disposable Stock"}
                </p>

                {/* Pre-filled dropdown to prevent spelling errors during dynamic item add */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "सुझाए गए नाम चुनें" : "Suggested Packaging Item"}</label>
                    <select 
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewPkgName(e.target.value);
                        }
                      }}
                      className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white cursor-pointer"
                    >
                      <option value="">{activeTranslation.suggestedSelect}</option>
                      <option value='Pizza Box Small 6"'>Pizza Box Small 6"</option>
                      <option value='Pizza Box Medium 8"'>Pizza Box Medium 8"</option>
                      <option value='Pizza Box Large 10"'>Pizza Box Large 10"</option>
                      <option value='Pizza Box Extra Large 12"'>Pizza Box Extra Large 12"</option>
                      <option value="Disposable Spoon 🥄">Disposable Spoon 🥄</option>
                      <option value="Tissue Paper 🧻">Tissue Paper 🧻</option>
                      <option value="Water Glass 🥤">Water Glass 🥤</option>
                      <option value="Plastic Carry Bag">Plastic Carry Bag</option>
                    </select>
                  </div>

                  <div className="space-y-1 font-sans">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.customInput}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Spoon / Tissue Paper" 
                      value={newPkgName} 
                      onChange={(e) => setNewPkgName(e.target.value)} 
                      className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "श्रेणी (Category)" : "Category"}</label>
                    <select 
                      value={newPkgCategory} 
                      onChange={(e) => setNewPkgCategory(e.target.value)}
                      className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500 cursor-pointer"
                    >
                      {pkgCategories.map(cat => (
                        <option key={cat.id} value={cat.name} className="bg-[#111]">{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "प्रारंभिक स्टॉक" : "Initial Stock Quantity"}</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 100" 
                      value={newPkgQty} 
                      onChange={(e) => setNewPkgQty(e.target.value)} 
                      className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "न्यूनतम अलर्ट सीमा" : "Reorder Warning Limit"}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 30" 
                    value={newPkgMinLimit} 
                    onChange={(e) => setNewPkgMinLimit(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl bg-white dark:bg-neutral-800 border border-gray-300 dark:border-white/10 outline-none text-neutral-900 dark:text-white focus:border-orange-500"
                    required 
                  />
                </div>

                <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                  {activeTranslation.save}
                </button>
              </form>
            )}

            {/* Editing Packaging Item Popup */}
            {editingPkgItem && (
              <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                <form 
                  onSubmit={handleEditPkgItem}
                  className="bg-[#111] border border-orange-500/30 p-6 rounded-3xl w-full max-w-sm space-y-4 text-left font-sans"
                >
                  <h4 className="font-black text-sm uppercase text-orange-500 text-center">✏️ Edit Packaging Item</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-450 uppercase">Item Name</label>
                    <input type="text" value={editPkgName} onChange={(e) => setEditPkgName(e.target.value)} className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-orange-500" required />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-450 uppercase">Category</label>
                      <select value={editPkgCategory} onChange={(e) => setEditPkgCategory(e.target.value)} className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-orange-500 cursor-pointer">
                        {pkgCategories.map(cat => (
                          <option key={cat.id} value={cat.name} className="bg-[#111]">{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-450 uppercase">Min Limit</label>
                      <input type="number" value={editPkgMinLimit} onChange={(e) => setEditPkgMinLimit(e.target.value)} className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 outline-none text-white" required />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase">Update</button>
                    <button type="button" onClick={() => setEditingPkgItem(null)} className="bg-white/5 text-gray-400 p-2.5 rounded-xl font-black text-[10px] uppercase">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Dynamic Packaging Inventory Dashboard Grid */}
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-1">
                  <Package size={14} /> {activeTranslation.tableBoxes}
                </h4>
              </div>

              {filteredPkgItems.some(i => Number(i.quantity) < Number(i.minLimit)) && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-2xl border border-red-500/20 text-[9px] font-black flex items-start gap-1.5 leading-normal animate-pulse">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <p>{activeTranslation.lowStockWarning}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                {filteredPkgItems.map(item => {
                  const isLow = Number(item.quantity) < Number(item.minLimit);
                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-colors duration-200 relative group font-sans ${isLow ? 'bg-red-500/[0.01] border-red-500/30' : 'bg-[#111] border-white/5'}`}
                    >
                      <button 
                        type="button" 
                        onClick={() => handleDeletePkgItem(item.id, item.name)}
                        className="absolute top-2.5 right-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                      >
                        <Trash2 size={12} />
                      </button>

                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black text-gray-300 uppercase leading-none block truncate max-w-[110px]" title={item.name}>{item.name}</span>
                          <span className="text-[8px] font-bold text-gray-500 uppercase block">{item.category}</span>
                        </div>
                        {isLow && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                      </div>

                      <div className="flex justify-between items-center mt-3">
                        <span className={`text-sm font-black ${isLow ? 'text-red-500' : 'text-green-400'}`}>{item.quantity} Pcs</span>
                        <div className="flex gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5 flex-shrink-0">
                          <button 
                            type="button"
                            onClick={() => handleUpdatePkgStock(item.id, item.quantity, -10)} 
                            className="w-5 h-5 flex items-center justify-center bg-red-500/10 text-red-500 text-[10px] font-black rounded"
                          >
                            -10
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleUpdatePkgStock(item.id, item.quantity, 50)} 
                            className="w-5 h-5 flex items-center justify-center bg-green-500/10 text-green-500 text-[10px] font-black rounded"
                          >
                            +50
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPkgItem(item);
                              setEditPkgName(item.name);
                              setEditPkgCategory(item.category);
                              setEditPkgMinLimit(String(item.minLimit));
                            }}
                            className="w-5 h-5 flex items-center justify-center bg-blue-500/10 text-blue-400 text-[10px] font-black rounded"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#111] border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs font-bold text-gray-400 uppercase font-mono">
              <span>Generate Packaging WhatsApp Order:</span>
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic();
                  const lowBoxes = pkgItems
                    .filter(i => Number(i.quantity) < Number(i.minLimit))
                    .map(i => `• ${i.name}: Stock underlimit (${i.quantity} Pcs Left)`)
                    .join("\n");

                  if (!lowBoxes) {
                    return toast.success("सभी पैकेजिंग आइटम पर्याप्त स्टॉक में हैं! 📦");
                  }

                  const msg = encodeURIComponent(`🔥 *BUM BUM CAFE - PACKAGING REORDER*\n\nकृपया निम्नलिखित डिस्पोजेबल/बॉक्स सप्लायर को आर्डर भेजें:\n${lowBoxes}\n\nधन्यवाद!`);
                  window.open(`https://wa.me/919714293759?text=${msg}`, '_blank');
                }}
                className="px-3 py-1.5 bg-yellow-500 text-black font-black rounded-lg text-[9px]"
              >
                Send Order 📦
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
