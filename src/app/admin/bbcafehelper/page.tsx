'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, onSnapshot, query, addDoc, doc, deleteDoc, updateDoc, setDoc, orderBy, getDoc, increment } from 'firebase/firestore';
import { Plus, X, Trash2, Calendar, IndianRupee, ArrowLeft, Lock, Loader2, Filter, ShoppingBag, Flame, Banknote, ShieldAlert, Layers, ChevronRight, Settings, Wrench, Package, AlertTriangle, ArrowRightLeft, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

// Expense categories dropdown options
const EXPENSE_CATEGORIES = [
  { id: "Raw Materials", label: "Raw Materials 🥛" },
  { id: "Packaging", label: "Packaging 📦" },
  { id: "Utility & Fuel", label: "Utility & Fuel 🔥" },
  { id: "Wages/Salary", label: "Wages/Salary 💵" },
  { id: "Others", label: "Others 📝" }
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
    tableBoxes: "पिज्जा बॉक्स स्टॉक"
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
    tableBoxes: "Pizza Boxes Stock Tracker"
  }
};

export default function BbCafeHelper() {
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Tab & Language States
  const [activeTab, setActiveTab] = useState<'expenses' | 'assets' | 'store_room' | 'packaging'>('expenses');
  const [isHindi, setIsHindi] = useState(true);

  // --- 1. EXPENSES STATES & LOGIC ---
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Raw Materials");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState<any[]>([]);

  // --- 2. FIXED ASSETS STATES & LOGIC ---
  const [assetName, setAssetName] = useState("");
  const [assetCost, setAssetCost] = useState("");
  const [assetPurchaseDate, setAssetPurchaseDate] = useState("");
  const [assetLifespan, setAssetLifespan] = useState("");
  const [assetMaintenance, setAssetMaintenance] = useState("");
  const [assets, setAssets] = useState<any[]>([]);

  // --- 3. STORE ROOM STATES & LOGIC ---
  const [storeItemName, setStoreItemName] = useState("");
  const [storeItemQty, setStoreItemQuantity] = useState("");
  const [storeItemUnit, setStoreItemUnit] = useState("Kg");
  const [storeItems, setStoreItems] = useState<any[]>([]);
  const [isTransferringStock, setIsTransferringStock] = useState<any>(null); // holds item being transferred
  const [transferQtyInput, setTransferQtyInput] = useState("");

  // --- 4. PACKAGING STATES & LOGIC (PIZZA BOXES) ---
  const [pizzaBoxes, setPizzaBoxes] = useState<any>({
    small: 100,
    medium: 100,
    large: 100,
    xl: 100,
    minLimit: 30
  });

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
      let correctPin = "971429"; // Default bypass

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

    // Load Fixed Assets
    const unsubAssets = onSnapshot(query(collection(db, "fixed_assets"), orderBy("timestamp", "desc")), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Store Room Bulk Inventory
    const unsubStore = onSnapshot(query(collection(db, "store_room"), orderBy("timestamp", "desc")), (snap) => {
      setStoreItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Load Packaging Stock levels
    const unsubPkg = onSnapshot(doc(db, "settings", "packaging_stock"), (snap) => {
      if (snap.exists()) {
        setPizzaBoxes(snap.data());
      } else {
        // Seed default stock on first load
        setDoc(doc(db, "settings", "packaging_stock"), {
          small: 100, medium: 100, large: 100, xl: 100, minLimit: 30
        });
      }
    });

    return () => {
      unsubExpenses();
      unsubAssets();
      unsubStore();
      unsubPkg();
    };
  }, [isAdminAuthorized]);

  // --- EXPENSE HANDLERS ---
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
    } catch (e) {
      toast.error("खर्च सहेजने में विफल।");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप वाकई इस खर्च को डिलीट करना चाहते हैं?")) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
      toast.success("खर्च हटा दिया गया।");
    } catch (e) {
      toast.error("डिलीट करने में विफल।");
    }
  };

  // --- ASSET HANDLERS ---
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
    } catch (e) {
      toast.error("उपकरण सहेजने में विफल।");
    }
  };

  const handleDeleteAsset = async (id: string) => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप इस संपत्ति को हटाना चाहते हैं?")) return;
    try {
      await deleteDoc(doc(db, "fixed_assets", id));
      toast.success("संपत्ति डेटा हटा दिया गया।");
    } catch (e) {
      toast.error("हटाने में विफल।");
    }
  };

  // Calculates depreciation (current book value) based on estimated lifespan
  const calculateCurrentValue = (purchaseDateStr: string, cost: number, lifespanYears: number) => {
    if (!purchaseDateStr) return cost;
    const purchaseDate = new Date(purchaseDateStr);
    const today = new Date();
    const ageInYears = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageInYears >= lifespanYears) return 0;
    const remainingVal = cost * (1 - (ageInYears / lifespanYears));
    return Math.max(0, Math.round(remainingVal));
  };

  // --- STORE ROOM HANDLERS ---
  const handleSaveStoreItem = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    const numericQty = Number(storeItemQty);
    if (!storeItemName.trim() || isNaN(numericQty) || numericQty < 0) {
      return toast.error("कृपया सही आइटम और मात्रा दर्ज करें!");
    }

    try {
      await addDoc(collection(db, "store_room"), {
        name: storeItemName.trim(),
        quantity: numericQty,
        unit: storeItemUnit,
        timestamp: new Date()
      });
      setStoreItemName("");
      setStoreItemQuantity("");
      toast.success("स्टोर रूम में माल दर्ज हो गया!");
    } catch (e) {
      toast.error("स्टोर रूम में जोड़ने में विफल।");
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
    } catch (e) {
      toast.error("हटाने में विफल।");
    }
  };

  // --- PACKAGING UPDATERS (PIZZA BOXES) ---
  const handleUpdateBoxCount = async (sizeKey: string, newCount: number) => {
    triggerHaptic();
    if (newCount < 0) return;
    try {
      await updateDoc(doc(db, "settings", "packaging_stock"), {
        [sizeKey]: newCount
      });
    } catch (err) {
      toast.error("स्टॉक अपडेट करने में असमर्थ।");
    }
  };

  const handleUpdateMinLimit = async (limitVal: number) => {
    triggerHaptic();
    if (limitVal < 0) return;
    try {
      await updateDoc(doc(db, "settings", "packaging_stock"), {
        minLimit: limitVal
      });
    } catch (err) {
      toast.error("अल्ट सीमा अपडेट करने में असमर्थ।");
    }
  };

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

  const activeTranslation = isHindi ? t.hi : t.en;

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
      <header className="sticky top-0 z-40 dark:bg-[#050505]/95 bg-gray-50/95 backdrop-blur-md py-4 px-4 border-b dark:border-white/5 border-gray-200 shadow-sm">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => { triggerHaptic(); window.history.back(); }}
              className="p-2.5 dark:bg-white/5 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-400"
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

        {/* --- TAB 1: DAILY EXPENSES --- */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                <span className="text-[8px] font-black text-gray-500 uppercase">{activeTranslation.todayExpense}</span>
                <h3 className="text-lg font-black text-green-400 mt-1">₹{todayExpense}</h3>
              </div>
              <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                <span className="text-[8px] font-black text-gray-500 uppercase">{activeTranslation.monthExpense}</span>
                <h3 className="text-lg font-black text-orange-500 mt-1">₹{monthlyExpense}</h3>
              </div>
            </div>

            <form onSubmit={handleSaveExpense} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 border-b border-white/5 pb-2">
                ➕ {activeTranslation.addExpense}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">{activeTranslation.amount}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500" 
                    value={expenseAmount} 
                    onChange={(e) => setExpenseAmount(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">{activeTranslation.category}</label>
                  <select 
                    value={expenseCategory} 
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl bg-neutral-900 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500 cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">{isHindi ? "तारीख (Date)" : "Date"}</label>
                  <input 
                    type="date" 
                    value={expenseDate} 
                    onChange={(e) => setExpenseDate(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500 cursor-pointer"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase">{isHindi ? "खर्च का विवरण (Details)" : "Details/Notes"}</label>
                  <textarea 
                    placeholder={activeTranslation.description}
                    value={expenseDescription} 
                    onChange={(e) => setExpenseDescription(e.target.value)} 
                    className="w-full text-xs font-semibold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500 h-16 resize-none"
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                {activeTranslation.save}
              </button>
            </form>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{isHindi ? "📜 हालिया खर्च सूची" : "📜 Recent Expenses Ledger"}</p>
              {expenses.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-xs uppercase font-bold">{isHindi ? "कोई खर्च दर्ज नहीं मिला।" : "No expense logs recorded yet."}</p>
              ) : (
                expenses.map(e => (
                  <div key={e.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold hover:bg-white/[0.04] transition-colors relative">
                    <div className="space-y-1 pr-6">
                      <h4 className="text-gray-200">{e.description}</h4>
                      <p className="text-[9px] text-orange-400 uppercase">{e.category} • {e.date}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-sm text-green-400 font-black">₹{e.amount}</span>
                      <button type="button" onClick={() => handleDeleteExpense(e.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                  className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500"
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
                    className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-550 border dark:border-neutral-700 border-gray-200 outline-none text-white focus:border-orange-500"
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
                    className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-550 border dark:border-neutral-700 border-gray-200 outline-none text-white focus:border-orange-500"
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
                    className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-550 border dark:border-neutral-700 border-gray-200 outline-none text-white focus:border-orange-500 cursor-pointer"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{activeTranslation.nextService}</label>
                  <input 
                    type="date" 
                    value={assetMaintenance} 
                    onChange={(e) => setAssetMaintenance(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-550 border dark:border-neutral-700 border-gray-200 outline-none text-white focus:border-orange-500 cursor-pointer"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                {activeTranslation.save}
              </button>
            </form>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{isHindi ? "⚙️ संपत्ति सूची व वर्तमान मूल्य" : "⚙️ Registered Assets & Book Value"}</p>
              {assets.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-xs uppercase font-bold">{isHindi ? "कोई उपकरण पंजीकृत नहीं है।" : "No registered assets yet."}</p>
              ) : (
                assets.map(a => {
                  const currentVal = calculateCurrentValue(a.purchaseDate, a.cost, a.lifespanYears);
                  const isMaintenanceOverdue = a.nextMaintenanceDate && new Date(a.nextMaintenanceDate).getTime() < new Date().getTime();

                  return (
                    <div key={a.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-3 hover:bg-white/[0.04] transition-colors relative">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="text-sm font-black text-gray-200">{a.name}</h4>
                          <p className="text-[9px] text-gray-500 uppercase mt-0.5">{isHindi ? "खरीद मूल्य" : "Original Cost"}: ₹{a.cost} • {a.purchaseDate}</p>
                        </div>
                        <button type="button" onClick={() => handleDeleteAsset(a.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 size={15} />
                        </button>
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
          </div>
        )}

        {/* --- TAB 3: STORE ROOM STOCK --- */}
        {activeTab === 'store_room' && (
          <div className="space-y-6">
            <form onSubmit={handleSaveStoreItem} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-500 border-b border-white/5 pb-2">
                📦 {isHindi ? "स्टोर रूम थोक स्टॉक दर्ज करें" : "Add Bulk Inventory to Store Room"}
              </p>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "सामग्री का नाम" : "Raw Material / Grocery Name"}</label>
                <input 
                  type="text" 
                  placeholder="e.g. Flour (मैदा) / Mozzarella Cheese" 
                  value={storeItemName} 
                  onChange={(e) => setStoreItemName(e.target.value)} 
                  className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500"
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "मात्रा (Quantity)" : "Quantity"}</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 5" 
                    value={storeItemQty} 
                    onChange={(e) => setStoreItemQuantity(e.target.value)} 
                    className="w-full text-xs font-bold p-3 rounded-xl dark:bg-white/[0.03] bg-gray-50 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{isHindi ? "इकाई (Unit)" : "Unit"}</label>
                  <select 
                    value={storeItemUnit} 
                    onChange={(e) => setStoreItemUnit(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl bg-neutral-900 border dark:border-white/5 border-gray-200 outline-none text-white focus:border-orange-500 cursor-pointer"
                  >
                    <option value="Kg">Kilogram (Kg)</option>
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Bags">Bags (बोरियां)</option>
                    <option value="Tins">Tins (डिब्बे)</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white font-black py-3 rounded-xl text-xs uppercase shadow">
                {activeTranslation.save}
              </button>
            </form>

            <AnimatePresence>
              {isTransferringStock && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-6">
                  <motion.form 
                    onSubmit={handleMoveToKitchen}
                    className="bg-[#111] border border-orange-500/30 p-6 rounded-3xl w-full max-w-sm space-y-4 text-center"
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
                      <label className="text-[9px] font-bold text-gray-500 uppercase">{activeTranslation.qtyToMove}</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 1" 
                        value={transferQtyInput} 
                        onChange={(e) => setTransferQtyInput(e.target.value)} 
                        className="w-full text-xs font-bold p-3 rounded-xl bg-black border border-white/10 outline-none text-white focus:border-orange-500 text-center"
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

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{isHindi ? "📦 वर्तमान स्टोर रूम स्टॉक" : "📦 Current Store Room Stock"}</p>
              {storeItems.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-xs uppercase font-bold">{isHindi ? "स्टोर रूम खाली है।" : "Store room is empty."}</p>
              ) : (
                storeItems.map(item => (
                  <div key={item.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold hover:bg-white/[0.04] transition-colors relative">
                    <div className="space-y-0.5">
                      <h4 className="text-gray-200">{item.name}</h4>
                      <p className="text-[10px] text-green-400 uppercase">{item.quantity} {item.unit} available</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => { triggerHaptic(); setIsTransferringStock(item); }}
                        className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-orange-500/20"
                      >
                        <ArrowRightLeft size={10} /> {isHindi ? "किचन में भेजें" : "Move"}
                      </button>
                      <button type="button" onClick={() => handleDeleteStoreItem(item.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: PACKAGING & GROCERY --- */}
        {activeTab === 'packaging' && (
          <div className="space-y-6">
            
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-1">
                  <Package size={14} /> {activeTranslation.tableBoxes}
                </h4>
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                  <span className="text-[8px] font-bold text-gray-450 uppercase">{isHindi ? "अलर्ट सीमा" : "Min Limit"}:</span>
                  <input 
                    type="number" 
                    value={pizzaBoxes.minLimit} 
                    onChange={(e) => handleUpdateMinLimit(Number(e.target.value))} 
                    className="w-8 bg-transparent text-center text-[10px] font-black outline-none text-yellow-400"
                  />
                </div>
              </div>

              {Object.entries(pizzaBoxes).some(([key, val]) => key !== 'minLimit' && Number(val) < pizzaBoxes.minLimit) && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-2xl border border-red-500/20 text-[9px] font-black flex items-start gap-1.5 leading-normal animate-pulse">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <p>{activeTranslation.lowStockWarning}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                {[
                  { id: 'small', label: 'Small Box (7")' },
                  { id: 'medium', label: 'Medium Box (9")' },
                  { id: 'large', label: 'Large Box (12")' },
                  { id: 'xl', label: 'XL Box (15")' }
                ].map(box => {
                  const currentStock = pizzaBoxes[box.id] || 0;
                  const isLow = currentStock < pizzaBoxes.minLimit;

                  return (
                    <div 
                      key={box.id} 
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-colors duration-200 ${isLow ? 'bg-red-500/[0.01] border-red-500/30' : 'bg-[#111] border-white/5'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-gray-300 uppercase leading-none">{box.label}</span>
                        {isLow && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className={`text-base font-black ${isLow ? 'text-red-500' : 'text-green-400'}`}>{currentStock} Pcs</span>
                        <div className="flex gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
                          <button 
                            type="button"
                            onClick={() => handleUpdateBoxCount(box.id, currentStock - 10)} 
                            className="w-5 h-5 flex items-center justify-center bg-red-500/10 text-red-500 text-[10px] font-black rounded"
                          >
                            -10
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleUpdateBoxCount(box.id, currentStock + 50)} 
                            className="w-5 h-5 flex items-center justify-center bg-green-500/10 text-green-500 text-[10px] font-black rounded"
                          >
                            +50
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#111] border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs font-bold text-gray-455 uppercase font-mono">
              <span>Generate Packaging WhatsApp Order:</span>
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic();
                  const lowBoxes = Object.entries(pizzaBoxes)
                    .filter(([key, val]) => key !== 'minLimit' && Number(val) < pizzaBoxes.minLimit)
                    .map(([key, val]) => `• ${key.toUpperCase()} Box: Current Stock is ${val} Pcs`)
                    .join("\n");

                  if (!lowBoxes) {
                    return toast.success("सभी पैकेजिंग आइटम पर्याप्त स्टॉक में हैं! 📦");
                  }

                  const msg = encodeURIComponent(`🔥 *BUM BUM CAFE - PACKAGING REORDER*\n\nकृपया निम्नलिखित पिज्जा बॉक्स सप्लायर को आर्डर भेजें:\n${lowBoxes}\n\nधन्यवाद!`);
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
