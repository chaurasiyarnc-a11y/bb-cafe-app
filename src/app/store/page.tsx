'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Home, Store, Wrench, Layers, AlertTriangle, Lock, X, Eye, EyeOff, Trash2, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, doc, setDoc, increment, addDoc, deleteDoc, writeBatch, limit, getDocs, where 
} from 'firebase/firestore';

// कस्टमाइज़्ड सब-कंपोनेंट्स के इम्पोर्ट्स
import StockDashboard from '../../components/store/StockDashboard';
import StockGodown from '../../components/store/StockGodown';
import StockAssets from '../../components/store/StockAssets';
import StockSupplierOrder from '../../components/store/StockSupplierOrder';
import StockLedger from '../../components/store/StockLedger';

interface InventoryItem {
  id: string;
  name: string;
  storeQty: number;
  kitchenQty: number; 
  unit: string;
  purchasePrice: number;
  minLimit: number;
  supplier?: string;
  lastPurchaseDate?: string;
  category?: string;
}

interface CategoryItem {
  id: string;
  name: string;
  hidden: boolean;
}

interface StockInLog {
  id: string;
  itemName: string;
  itemId: string;
  qty: number;
  date: string;
  remarks?: string;
}

interface StockOutLog {
  id: string;
  itemName: string;
  itemId?: string;
  qty: number;
  purpose: "Kitchen Use" | "Waste" | "Damage" | "Staff Use";
  date: string;
  remarks: string;
  financialLoss?: number;
}

interface OrderListMeta {
  id: string;
  name: string;
  date: string;
}

interface SavedOrderItem {
  id: string; 
  itemId: string;
  listId: string;
  name: string;
  storeQty: number;
  unit: string;
  orderQty: string;
}

interface FixedAsset {
  id: string;
  name: string;
  quantity: number;
  purchaseDate?: string;
  cost?: number;
  condition: "Working" | "Needs Repair" | "Broken";
  remarks?: string;
  type?: string; 
  unit?: string; 
}

interface UserPin {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'staff';
}

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const triggerHaptic = (ms = 35) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
};

export default function StoreStockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [orderLists, setOrderLists] = useState<OrderListMeta[]>([]);
  const [savedOrders, setSavedOrders] = useState<SavedOrderItem[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [stockInHistory, setStockInHistory] = useState<StockInLog[]>([]);
  const [stockOutHistory, setStockOutHistory] = useState<StockOutLog[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'store' | 'kitchen' | 'fixed_assets' | 'saved_list' | 'waste'>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [kitchenSearchQuery, setKitchenSearchQuery] = useState<string>("");
  const [editedQties, setEditedQties] = useState<Record<string, string | number>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // किचन के आंतरिक सब-टैब के लिए स्टेट
  const [activeKitchenSubTab, setActiveKitchenSubTab] = useState<'closing' | 'today_use' | 'history'>('closing');

  // किचन क्लोजिंग स्टॉक इनपुट्स के लिए स्टेट
  const [kitchenClosingInputs, setKitchenClosingInputs] = useState<Record<string, string>>({});

  const [currentUser, setCurrentUser] = useState<UserPin | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(true); 

  // session restore on reload & Service Worker registration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bum_bum_cafe_user');
      if (savedUser) {
        try { 
          setCurrentUser(JSON.parse(savedUser)); 
        } catch { 
          localStorage.removeItem('bum_bum_cafe_user'); 
        }
      }
      setAuthLoading(false); 
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Store Service Worker Registered Successfully!', reg.scope))
        .catch((err) => console.error('Store Service Worker failed:', err));
    }
  }, []);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{ message: string; action: () => void; } | null>(null);
  const [deletePinInput, setDeletePinInput] = useState<string>("");
  const [deletePinError, setDeletePinError] = useState<string>("");

  const [dashboardDateRange, setDashboardDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(getLocalDateString(6)); 
  const [endDate, setEndDate] = useState<string>(getLocalDateString(0));     

  const [ledgerFilter, setLedgerFilter] = useState<'All' | 'IN' | 'OUT'>('All');
  const [localOrderQties, setLocalOrderQties] = useState<Record<string, string>>({});
  const [focusedOrderField, setFocusedOrderField] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);

  const [activeListId, setActiveListId] = useState<string>("general_list");
  const [showSaveToListModal, setShowSaveToListModal] = useState<boolean>(false);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState<boolean>(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState<boolean>(false);
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string>("");
  const [newCategoryInput, setNewCategoryInput] = useState<string>("");
  const [targetListId, setTargetListId] = useState<string>("");
  const [newListNameInput, setNewListNameInput] = useState<string>("");
  const [addCategoryModalInput, setAddCategoryModalInput] = useState<string>("");

  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
  const [transferQtyInput, setTransferQtyInput] = useState<string>("");

  const [showConsumeModal, setShowConsumeModal] = useState<boolean>(false);
  const [consumeItem, setConsumeItem] = useState<InventoryItem | null>(null);
  const [consumeQtyInput, setConsumeQtyInput] = useState<string>("");
  const [consumeRemarksInput, setConsumeRemarksInput] = useState<string>("");

  const [isEditingListName, setIsEditingListName] = useState<boolean>(false);
  const [tempListNameInput, setTempListNameInput] = useState<string>("");

  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);
  const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null); 

  const [formAddProduct, setFormAddProduct] = useState({ name: '', storeQty: '0', kitchenQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', category: 'OTHER', lastPurchaseDate: getLocalDateString(0) });
  const [formAddAsset, setFormAddAsset] = useState({ name: '', quantity: '1', purchaseDate: '', cost: '', condition: 'Working' as any, remarks: '', type: 'general', unit: 'Pcs' });

  const [showStockOutModal, setShowStockOutModal] = useState<boolean>(false);
  const [formStockOut, setFormStockOut] = useState({ item: '', quantity: '', purpose: 'Waste' as any, remarks: '' });
  
  const toastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  // --- रीयल-टाइम डेटा सिंक्रोनाइज़ेशन (Real-time Sync) ---
  useEffect(() => {
    const unsubInventory = onSnapshot(collection(db, "godown_inventory"), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, kitchenQty: 0, ...d.data() } as InventoryItem)));
    });
    const unsubCategories = onSnapshot(collection(db, "godown_categories"), (snap) => {
      if (!snap.empty) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as CategoryItem)));
    });

    const unsubStockIns = onSnapshot(query(collection(db, "stock_in_history"), orderBy("date", "desc"), limit(100)), (snap) => {
      setStockInHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockInLog)));
    });
    const unsubStockOuts = onSnapshot(query(collection(db, "stock_out_history"), orderBy("date", "desc"), limit(100)), (snap) => {
      setStockOutHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOutLog)));
    });

    const unsubSavedOrders = onSnapshot(collection(db, "saved_orders"), (snap) => {
      setSavedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedOrderItem)));
    });
    const unsubFixedAssets = onSnapshot(collection(db, "fixed_assets"), (snap) => {
      setFixedAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as FixedAsset)));
    });

    return () => {
      unsubInventory(); unsubCategories(); unsubStockIns(); unsubStockOuts(); unsubSavedOrders(); unsubFixedAssets();
    };
  }, []);

  useEffect(() => {
    const unsubOrderLists = onSnapshot(collection(db, "order_lists"), (snap) => {
      const lists = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderListMeta));
      setOrderLists(lists);
      if (lists.length > 0 && (!activeListId || !lists.some(l => l.id === activeListId))) {
        setActiveListId(lists[0].id);
      }
    });
    return () => unsubOrderLists();
  }, [activeListId]);

  useEffect(() => {
    const updatedLocal: Record<string, string> = {};
    savedOrders.forEach(o => { if (focusedOrderField !== o.id) updatedLocal[o.id] = o.orderQty || ""; });
    setLocalOrderQties(prev => ({ ...prev, ...updatedLocal }));
  }, [savedOrders, focusedOrderField]);

  // पिन वेरिफिकेशन हेल्पर
  const verifyPinAndGetDoc = async (pin: string) => {
    const q = query(collection(db, "cafe_users"), where("pin", "==", pin), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as UserPin;
    }
    return null;
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const matched = await verifyPinAndGetDoc(pinInput.trim());
      if (matched) {
        setCurrentUser(matched);
        localStorage.setItem('bum_bum_cafe_user', JSON.stringify(matched));
        setPinInput("");
        setAuthError("");
        toastMessage("सफलतापूर्वक लॉगिन किया गया!", "success");
      } else {
        setAuthError("गलत पिन!");
      }
    } catch {
      setAuthError("सर्वर त्रुटि! कृपया पुनः प्रयास करें।");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bum_bum_cafe_user');
    toastMessage("लॉगआउट कर दिया गया है।", "info");
  };

  const confirmDeleteWithPin = (message: string, actionToExecute: () => void) => {
    setDeleteConfirmation({ message, action: actionToExecute });
    setDeletePinInput("");
    setDeletePinError("");
  };

  const handleDeleteVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const matched = await verifyPinAndGetDoc(deletePinInput.trim());
      if (matched) {
        if (deleteConfirmation) deleteConfirmation.action();
        setDeleteConfirmation(null);
        toastMessage("सफलतापूर्वक हटा दिया गया!", "success");
      } else {
        setDeletePinError("गलत पिन!");
      }
    } catch {
      setDeletePinError("सर्वर त्रुटि!");
    }
  };

  const getAssetSingleVal = (asset: FixedAsset) => {
    const qty = (asset.quantity === undefined || asset.quantity === null) ? 1 : Number(asset.quantity);
    const cost = Number(asset.cost || 0);
    return qty * cost;
  };

  const stats = useMemo(() => {
    const totalVal = inventory.reduce((sum, item) => sum + (item.storeQty * item.purchasePrice), 0);
    const lowCount = inventory.filter(item => item.storeQty < item.minLimit).length;
    const totalFixedQty = fixedAssets.reduce((sum, asset) => sum + (asset.quantity || 0), 0);
    const totalFixedVal = fixedAssets.reduce((sum, asset) => sum + getAssetSingleVal(asset), 0);

    const generalAssetsVal = fixedAssets
      .filter(asset => !asset.type || asset.type === 'general')
      .reduce((sum, asset) => sum + getAssetSingleVal(asset), 0);

    const cutleryVal = fixedAssets
      .filter(asset => asset.type === 'cutlery')
      .reduce((sum, asset) => sum + getAssetSingleVal(asset), 0);

    const crockeryVal = fixedAssets
      .filter(asset => asset.type === 'crockery')
      .reduce((sum, asset) => sum + getAssetSingleVal(asset), 0);

    const decorationVal = fixedAssets
      .filter(asset => asset.type === 'decoration')
      .reduce((sum, asset) => sum + getAssetSingleVal(asset), 0);

    return { 
      totalVal, 
      lowCount, 
      totalFixedQty, 
      totalFixedVal,
      generalAssetsVal,
      cutleryVal,
      crockeryVal,
      decorationVal
    };
  }, [inventory, fixedAssets]);

  const getFilteredLedgerStats = useMemo(() => {
    const todayStr = getLocalDateString(0);
    const yesterdayStr = getLocalDateString(1);
    const weekAgoStr = getLocalDateString(6);
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthPrefix = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let filterFn = (dateStr: string) => dateStr === todayStr;
    if (dashboardDateRange === 'yesterday') filterFn = (dateStr: string) => dateStr === yesterdayStr;
    else if (dashboardDateRange === 'week') filterFn = (dateStr: string) => dateStr >= weekAgoStr && dateStr <= todayStr;
    else if (dashboardDateRange === 'month') filterFn = (dateStr: string) => dateStr.startsWith(monthPrefix);
    else if (dashboardDateRange === 'year') filterFn = (dateStr: string) => dateStr.startsWith(`${currentYear}`);
    else if (dashboardDateRange === 'custom') filterFn = (dateStr: string) => dateStr >= startDate && dateStr <= endDate;

    const matchedInward = stockInHistory.filter(log => filterFn(log.date));
    const totalInwardQty = matchedInward.reduce((sum, log) => sum + log.qty, 0);

    const matchedKitchen = stockOutHistory.filter(log => log.purpose === "Kitchen Use" && filterFn(log.date));
    const totalKitchenQty = matchedKitchen.reduce((sum, log) => sum + log.qty, 0);

    const matchedWasteLogs = stockOutHistory.filter(log => (log.purpose === "Waste" || log.purpose === "Damage" || log.purpose === "Staff Use") && filterFn(log.date));
    const totalWasteLoss = matchedWasteLogs.reduce((sum, log) => sum + (log.financialLoss || 0), 0);

    return { totalInwardQty, totalKitchenQty, totalWasteLoss, matchedInward, matchedKitchen, matchedWasteLogs };
  }, [dashboardDateRange, startDate, endDate, stockInHistory, stockOutHistory]);

  const categoryStockValues = useMemo(() => {
    const values: Record<string, number> = {};
    inventory.forEach(item => {
      const cat = (item.category || "OTHER").toUpperCase().trim();
      values[cat] = (values[cat] || 0) + (item.storeQty * item.purchasePrice);
    });
    return values;
  }, [inventory]);

  const stockFlowTimeline = useMemo(() => {
    const list: any[] = [];
    getFilteredLedgerStats.matchedInward.forEach(log => {
      const item = inventory.find(i => i.id === log.itemId);
      list.push({ 
        id: log.id, 
        name: log.itemName, 
        qty: log.qty, 
        unit: item?.unit || 'Units', 
        price: item?.purchasePrice || 0, 
        type: 'IN', 
        date: log.date, 
        remarks: log.remarks 
      });
    });
    getFilteredLedgerStats.matchedKitchen.forEach(log => {
      const item = inventory.find(i => i.id === log.itemId);
      list.push({ 
        id: log.id, 
        name: log.itemName, 
        qty: log.qty, 
        unit: item?.unit || 'Units', 
        price: item?.purchasePrice || 0, 
        type: 'OUT', 
        date: log.date, 
        remarks: log.remarks 
      });
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [getFilteredLedgerStats, inventory]);

  const unifiedLedger = useMemo(() => {
    const list: any[] = [];
    stockInHistory.forEach(log => list.push({ id: log.id, itemName: log.itemName, qty: log.qty, type: 'IN', purpose: 'Stock In', date: log.date, remarks: log.remarks || 'N/A' }));
    stockOutHistory.forEach(log => list.push({ id: log.id, itemName: log.itemName, qty: log.qty, type: 'OUT', purpose: log.purpose, date: log.date, remarks: log.remarks || 'N/A', financialLoss: log.financialLoss }));
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [stockInHistory, stockOutHistory]);

  const activeListName = useMemo(() => {
    const list = orderLists.find(l => l.id === activeListId);
    return list ? list.name : "BUM BUM CAFE ORDER SHEET";
  }, [orderLists, activeListId]);

  const visibleCategories = useMemo(() => categories.filter(c => !c.hidden), [categories]);
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const itemCatObj = categories.find(c => c.name === item.category);
      if (selectedCategoryFilter === "All") return matchesSearch && !(itemCatObj?.hidden);
      return matchesSearch && item.category === selectedCategoryFilter;
    });
  }, [inventory, searchQuery, selectedCategoryFilter, categories]);

  const filteredAssets = useMemo(() => fixedAssets.filter(asset => asset.name.toLowerCase().includes(searchQuery.toLowerCase())), [fixedAssets, searchQuery]);

  // 🧹 वन-क्लिक डुप्लीकेट मर्ज क्लीनअप लॉजिक
  const handleMergeAllExistingDuplicates = async () => {
    triggerHaptic(50);
    try {
      const groups: Record<string, InventoryItem[]> = {};
      inventory.forEach(item => {
        const key = item.name.toUpperCase().trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      const batch = writeBatch(db);
      let mergedCount = 0;

      for (const name in groups) {
        const items = groups[name];
        if (items.length > 1) {
          const primary = items[0];
          let totalStoreQty = primary.storeQty;
          let totalKitchenQty = primary.kitchenQty || 0;
          let maxPrice = primary.purchasePrice;
          const minLimit = primary.minLimit;
          const category = primary.category || 'OTHER';
          const unit = primary.unit;

          for (let i = 1; i < items.length; i++) {
            const duplicate = items[i];
            totalStoreQty += duplicate.storeQty;
            totalKitchenQty += (duplicate.kitchenQty || 0);
            if (duplicate.purchasePrice > maxPrice) maxPrice = duplicate.purchasePrice;
            
            batch.delete(doc(db, "godown_inventory", duplicate.id));
            mergedCount++;
          }

          batch.set(doc(db, "godown_inventory", primary.id), {
            storeQty: totalStoreQty,
            kitchenQty: totalKitchenQty,
            purchasePrice: maxPrice,
            minLimit,
            category,
            unit
          }, { merge: true });
        }
      }

      if (mergedCount > 0) {
        await batch.commit();
        toastMessage(`${mergedCount} डुप्लीकेट सामान सफलतापूर्वक मर्ज किए गए! 🧹`, "success");
      } else {
        toastMessage("कोई डुप्लीकेट सामान नहीं मिला। ✨", "info");
      }
    } catch {
      toastMessage("मर्ज करने में त्रुटि आई।", "error");
    }
  };

  const adjustQty = (id: string, diff: number) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    const currentVal = editedQties[id] !== undefined ? editedQties[id] : item.storeQty;
    const currentNum = typeof currentVal === 'string' ? (parseFloat(currentVal) || 0) : currentVal;
    setEditedQties(prev => ({ ...prev, [id]: Math.max(0, currentNum + diff) }));
  };

  const saveQty = async (id: string) => {
    const rawVal = editedQties[id];
    if (rawVal === undefined) return;
    const updated = typeof rawVal === 'string' ? parseFloat(rawVal) : rawVal;
    if (isNaN(updated) || updated < 0) return;
    try {
      const originalItem = inventory.find(i => i.id === id);
      if (!originalItem) return;

      const batch = writeBatch(db);
      batch.set(doc(db, "godown_inventory", id), { storeQty: updated }, { merge: true });

      const diff = updated - originalItem.storeQty;
      if (diff > 0) {
        const logRef = doc(collection(db, "stock_in_history"));
        batch.set(logRef, { id: logRef.id, itemName: originalItem.name, itemId: id, qty: diff, date: getLocalDateString(0), remarks: "स्टॉक बढ़ोतरी" });
      } else if (diff < 0) {
        const logRef = doc(collection(db, "stock_out_history"));
        batch.set(logRef, { id: logRef.id, itemName: originalItem.name, itemId: id, qty: Math.abs(diff), purpose: "Damage", date: getLocalDateString(0), remarks: "मैन्युअल सुधार", financialLoss: Math.abs(diff) * (originalItem.purchasePrice || 0) });
      }
      await batch.commit();
      setEditedQties(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
      toastMessage("मात्रा सफलतापूर्वक अपडेट की गई!", "success");
    } catch {}
  };

  const handleToggleMultiSelect = (id: string) => {
    setSelectedItemIds((prev: string[]) => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleConfirmSaveToList = async () => {
    if (selectedItemIds.length === 0) return;
    let targetId = targetListId;
    try {
      if (targetId === "CREATE_NEW") {
        if (!newListNameInput.trim()) return;
        targetId = `list_${Date.now()}`;
        await setDoc(doc(db, "order_lists", targetId), { id: targetId, name: newListNameInput.trim().toUpperCase(), date: new Date().toISOString().split('T')[0] });
        setNewListNameInput("");
      }
      const batch = writeBatch(db);
      for (const id of selectedItemIds) {
        const item = inventory.find(i => i.id === id);
        if (item) {
          const compoundId = `${id}_${targetId}`;
          batch.set(doc(db, "saved_orders", compoundId), { id: compoundId, itemId: item.id, listId: targetId, name: item.name, storeQty: item.storeQty, unit: item.unit, orderQty: "" }, { merge: true });
        }
      }
      await batch.commit();
      setSelectedItemIds([]);
      setIsMultiSelectMode(false);
      setShowSaveToListModal(false);
      setActiveListId(targetId);
      setActiveTab('saved_list'); 
      toastMessage("लिस्ट में आइटम जोड़ दिए गए हैं!", "success");
    } catch {}
  };

  const handleConfirmBulkCategory = async () => {
    if (selectedItemIds.length === 0) return;
    let targetCategory = bulkTargetCategory;
    if (targetCategory === "CREATE_NEW") {
      if (!newCategoryInput.trim()) return;
      targetCategory = newCategoryInput.trim().toUpperCase();
      const catId = targetCategory.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, "godown_categories", catId), { id: catId, name: targetCategory, hidden: false });
    }
    try {
      const batch = writeBatch(db);
      selectedItemIds.forEach(id => batch.set(doc(db, "godown_inventory", id), { category: targetCategory }, { merge: true }));
      await batch.commit();
      setSelectedItemIds([]);
      setIsMultiSelectMode(false);
      setShowBulkCategoryModal(false);
      toastMessage("श्रेणी सफलतापूर्वक बदल दी गई!", "success");
    } catch {}
  };

  const handleAddNewCategoryInModal = async () => {
    if (!addCategoryModalInput.trim()) return;
    try {
      const formattedName = addCategoryModalInput.trim().toUpperCase();
      const catId = formattedName.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, "godown_categories", catId), { id: catId, name: formattedName, hidden: false });
      setAddCategoryModalInput("");
      toastMessage("नई श्रेणी जोड़ी गई!", "success");
    } catch {}
  };

  const handleToggleCategoryHide = async (cat: CategoryItem) => {
    await setDoc(doc(db, "godown_categories", cat.id), { hidden: !cat.hidden }, { merge: true });
  };

  const handleRemoveCategory = (cat: CategoryItem) => {
    confirmDeleteWithPin(`क्या आप सच में "${cat.name}" हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "godown_categories", cat.id));
    });
  };

  const handleTransferToKitchenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem || !transferQtyInput) return;
    const qty = parseFloat(transferQtyInput);
    if (isNaN(qty) || qty <= 0 || transferItem.storeQty < qty) return;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "godown_inventory", transferItem.id), { storeQty: increment(-qty), kitchenQty: increment(qty) }, { merge: true });
      const logRef = doc(collection(db, "stock_out_history"));
      batch.set(logRef, { id: logRef.id, itemName: transferItem.name, itemId: transferItem.id, qty, purpose: "Kitchen Use", date: getLocalDateString(0), remarks: "किचन स्थानांतरण", financialLoss: 0 });
      await batch.commit();
      setShowTransferModal(false);
      toastMessage("सामग्री किचन में भेज दी गई है!", "success");
    } catch {}
  };

  const handleConsumeKitchenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumeItem || !consumeQtyInput) return;
    const qty = parseFloat(consumeQtyInput);
    if (isNaN(qty) || qty <= 0 || consumeItem.kitchenQty < qty) return;
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "godown_inventory", consumeItem.id), { kitchenQty: increment(-qty) }, { merge: true });
      const logRef = doc(collection(db, "stock_out_history"));
      batch.set(logRef, { id: logRef.id, itemName: consumeItem.name, itemId: consumeItem.id, qty, purpose: "Kitchen Use", date: getLocalDateString(0), remarks: consumeRemarksInput || "किचन उपयोग", financialLoss: 0 });
      await batch.commit();
      setShowConsumeModal(false);
      toastMessage("किचन स्टॉक अपडेट किया गया!", "success");
    } catch {}
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formAddProduct.name.toUpperCase().trim();
    if (!cleanName) return;

    const existingItem = inventory.find(
      item => item.name.toUpperCase().trim() === cleanName
    );

    if (existingItem) {
      const addedStoreQty = parseFloat(formAddProduct.storeQty) || 0;
      const addedKitchenQty = parseFloat(formAddProduct.kitchenQty) || 0;
      const newStoreQty = (existingItem.storeQty || 0) + addedStoreQty;
      const newKitchenQty = (existingItem.kitchenQty || 0) + addedKitchenQty;
      const updatedPrice = parseFloat(formAddProduct.purchasePrice) || existingItem.purchasePrice || 0;

      await setDoc(doc(db, "godown_inventory", existingItem.id), {
        storeQty: newStoreQty,
        kitchenQty: newKitchenQty,
        purchasePrice: updatedPrice,
        lastPurchaseDate: formAddProduct.lastPurchaseDate,
        category: formAddProduct.category.toUpperCase(),
        unit: formAddProduct.unit
      }, { merge: true });

      if (addedStoreQty > 0) {
        const logRef = doc(collection(db, "stock_in_history"));
        await setDoc(logRef, {
          id: logRef.id,
          itemName: cleanName,
          itemId: existingItem.id,
          qty: addedStoreQty,
          date: getLocalDateString(0),
          remarks: "सामान दोबारा जोड़ने पर मात्रा स्वतः मर्ज की गई"
        });
      }

      setShowAddProductModal(false);
      setFormAddProduct({ 
        name: '', 
        storeQty: '0', 
        kitchenQty: '0', 
        unit: 'Kg', 
        purchasePrice: '', 
        minLimit: '10', 
        category: 'OTHER', 
        lastPurchaseDate: getLocalDateString(0) 
      });

      toastMessage(`"${cleanName}" पहले से मौजूद था, मात्रा मर्ज कर दी गई है! 🔄`, "success");
      return;
    }

    const customId = `item_${Date.now()}`;
    await setDoc(doc(db, "godown_inventory", customId), {
      id: customId, 
      name: cleanName, 
      storeQty: parseFloat(formAddProduct.storeQty) || 0, 
      kitchenQty: parseFloat(formAddProduct.kitchenQty) || 0,
      unit: formAddProduct.unit, 
      purchasePrice: parseFloat(formAddProduct.purchasePrice) || 0, 
      minLimit: parseFloat(formAddProduct.minLimit) || 10, 
      category: formAddProduct.category.toUpperCase(),
      lastPurchaseDate: formAddProduct.lastPurchaseDate || getLocalDateString(0)
    });

    setShowAddProductModal(false);
    setFormAddProduct({ 
      name: '', 
      storeQty: '0', 
      kitchenQty: '0', 
      unit: 'Kg', 
      purchasePrice: '', 
      minLimit: '10', 
      category: 'OTHER', 
      lastPurchaseDate: getLocalDateString(0) 
    });
    toastMessage("नया उत्पाद जोड़ा गया!", "success");
  };

  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formAddAsset.name.toUpperCase().trim();
    if (!cleanName) return;

    const existingAsset = fixedAssets.find(
      asset => asset.name.toUpperCase().trim() === cleanName
    );

    if (existingAsset) {
      const addedQty = parseFloat(formAddAsset.quantity) || 1;
      const newQty = (existingAsset.quantity || 0) + addedQty;
      const updatedCost = parseFloat(formAddAsset.cost) || existingAsset.cost || 0;

      await setDoc(doc(db, "fixed_assets", existingAsset.id), {
        quantity: newQty,
        cost: updatedCost,
        condition: formAddAsset.condition,
        remarks: formAddAsset.remarks || existingAsset.remarks || "मात्रा अपडेट की गई",
        type: formAddAsset.type || existingAsset.type || 'general',
        unit: formAddAsset.unit || existingAsset.unit || 'Pcs',
        purchaseDate: formAddAsset.purchaseDate || existingAsset.purchaseDate || getLocalDateString(0)
      }, { merge: true });

      setShowAddAssetModal(false);
      setFormAddAsset({ 
        name: '', 
        quantity: '1', 
        purchaseDate: '', 
        cost: '', 
        condition: 'Working', 
        remarks: '', 
        type: 'general', 
        unit: 'Pcs' 
      });

      toastMessage(`"${cleanName}" एसेट्स में पहले से मौजूद था, मात्रा मर्ज कर दी गई है! 🔄`, "success");
      return;
    }

    const customId = `asset_${Date.now()}`;
    await setDoc(doc(db, "fixed_assets", customId), {
      id: customId, 
      name: cleanName, 
      quantity: parseFloat(formAddAsset.quantity) || 1, 
      cost: parseFloat(formAddAsset.cost) || 0, 
      condition: formAddAsset.condition, 
      remarks: formAddAsset.remarks,
      type: formAddAsset.type || 'general',
      unit: formAddAsset.unit || 'Pcs',
      purchaseDate: formAddAsset.purchaseDate || getLocalDateString(0)
    });

    setShowAddAssetModal(false);
    setFormAddAsset({ 
      name: '', 
      quantity: '1', 
      purchaseDate: '', 
      cost: '', 
      condition: 'Working', 
      remarks: '', 
      type: 'general', 
      unit: 'Pcs' 
    });
    toastMessage("नया एसेट सफलतापूर्वक जोड़ा गया!", "success");
  };

  const handleEditAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    await setDoc(doc(db, "fixed_assets", editingAsset.id), editingAsset, { merge: true });
    setEditingAsset(null);
    toastMessage("एसेट का विवरण सफलतापूर्वक अपडेट किया गया!", "success");
  };

  const handleAdjustAssetQty = async (assetId: string, diff: number) => {
    triggerHaptic(20);
    try {
      const asset = fixedAssets.find(a => a.id === assetId);
      if (!asset) return;
      const nextQty = Math.max(0, (asset.quantity || 0) + diff);
      await setDoc(doc(db, "fixed_assets", assetId), { quantity: nextQty }, { merge: true });
      toastMessage("मात्रा सफलतापूर्वक अपडेट की गई!", "success");
    } catch {
      toastMessage("मात्रा अपडेट करने में समस्या आई।", "error");
    }
  };

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(formStockOut.quantity);
    const item = inventory.find(i => i.id === formStockOut.item);
    if (!item || isNaN(qtyNum) || item.storeQty < qtyNum) return;
    await setDoc(doc(db, "godown_inventory", item.id), { storeQty: increment(-qtyNum) }, { merge: true });
    await addDoc(collection(db, "stock_out_history"), {
      itemName: item.name, itemId: item.id, qty: qtyNum, purpose: formStockOut.purpose, date: getLocalDateString(0), remarks: formStockOut.remarks, financialLoss: qtyNum * item.purchasePrice
    });
    setShowStockOutModal(false);
    toastMessage("नुकसान/कचरा दर्ज किया गया!", "success");
  };

  const handleDeleteAsset = (id: string, name: string) => {
    confirmDeleteWithPin(`क्या आप इस एसेट "${name}" को हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "fixed_assets", id));
    });
  };

  const handleDeleteProduct = (id: string, name: string) => {
    confirmDeleteWithPin(`क्या आप इस सामान "${name}" को हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "godown_inventory", id));
      setEditingProduct(null);
    });
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await setDoc(doc(db, "godown_inventory", editingProduct.id), editingProduct, { merge: true });
    setEditingProduct(null);
    toastMessage("विवरण अपडेट किया गया!", "success");
  };

  const handlePrintSavedList = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      toastMessage("पॉपअप अवरुद्ध हो गया है! कृपया पॉपअप की अनुमति दें।", "error");
      return;
    }

    const activeList = orderLists.find(l => l.id === activeListId);
    const listTitle = activeList ? activeList.name : "BUM BUM CAFE ORDER SHEET";
    const matchedItems = savedOrders.filter(o => o.listId === activeListId);

    const rows = matchedItems.map(item => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #ddd; font-weight:bold;">${item.name}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:center;">${item.storeQty} ${item.unit}</td>
        <td style="padding:10px; border-bottom:1px solid #ddd; text-align:right; font-weight:bold; color:#FF6B00;">${item.orderQty || "0"}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head><title>Order_Sheet_${listTitle.replace(/\s+/g, '_')}</title></head>
        <body style="font-family:sans-serif; padding:25px;">
          <h2 style="color:#FF6B00; text-align:center; text-transform: uppercase;">${listTitle}</h2>
          <p style="text-align:center; color:#666; font-size:12px;">Generated on: ${new Date().toLocaleString()}</p>
          <table style="width:100%; border-collapse:collapse; margin-top:20px;">
            <thead>
              <tr style="background:#FF6B00; color:white;">
                <th style="padding:10px; text-align:left;">Item Name</th>
                <th style="padding:10px; text-align:center;">Current Stock</th>
                <th style="padding:10px; text-align:right;">Order Qty</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleWhatsAppShare = () => {
    triggerHaptic();
    if (!activeListId) return;

    const activeList = orderLists.find(l => l.id === activeListId);
    const listTitle = activeList ? activeList.name : "ORDER SHEET";
    const matchedItems = savedOrders.filter(o => o.listId === activeListId);

    if (matchedItems.length === 0) {
      toastMessage("इस लिस्ट में कोई सामान नहीं है!", "error");
      return;
    }

    let text = `*BUM BUM CAFE - ${listTitle.toUpperCase()}*\n`;
    text += `Date: ${new Date().toLocaleDateString('en-GB')}\n\n`;
    text += `Please deliver the following items:\n`;
    text += `--------------------------------\n`;

    matchedItems.forEach(item => {
      const qty = item.orderQty || "0";
      text += `• *${item.name}*: ${qty} ${item.unit}\n`;
    });

    text += `--------------------------------\n`;
    text += `Thank you!`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleMigrateCrockeryCutlery = async () => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप वाकई गोडाउन (Godown) से क्रॉकरी, कटलरी और डेकोरेशन का सारा डेटा स्थायी संपत्ति (Fixed Assets) में शिफ्ट करना चाहते हैं? यह क्रिया उन्हें गोडाउन से हमेशा के लिए हटा देगी।")) return;

    try {
      const itemsToMigrate = inventory.filter(item => {
        const cat = (item.category || "").toUpperCase().trim();
        return cat.includes('CROCKER') || cat.includes('CUTLER') || cat.includes('DECORAT');
      });

      if (itemsToMigrate.length === 0) {
        toastMessage("गोदाम में ट्रांसफर के लिए कोई क्रॉकरी, कटलरी या डेकोरेशन उत्पाद नहीं मिला!", "info");
        return;
      }

      const batch = writeBatch(db);

      itemsToMigrate.forEach(item => {
        const assetId = `asset_${item.id}`;
        const assetDocRef = doc(db, "fixed_assets", assetId);
        const godownDocRef = doc(db, "godown_inventory", item.id);

        const cat = (item.category || "").toUpperCase().trim();
        let finalType = 'general';
        
        if (cat.includes('CROCKER')) {
          finalType = 'crockery';
        } else if (cat.includes('CUTLER')) {
          finalType = 'cutlery';
        } else if (cat.includes('DECORAT')) {
          finalType = 'decoration';
        }

        batch.set(assetDocRef, {
          id: assetId,
          name: item.name,
          quantity: item.storeQty || 1,
          cost: item.purchasePrice || 0,
          condition: "Working",
          remarks: "गोडाउन से स्थानांतरित (Shifted)",
          type: finalType, 
          unit: item.unit || 'Pcs' 
        });

        batch.delete(godownDocRef);
      });

      await batch.commit();
      toastMessage(`${itemsToMigrate.length} सामान सफलतापूर्वक फिक्स्ड एसेट्स में शिफ्ट कर दिए गए हैं! 🚚`, "success");
    } catch {
      toastMessage("स्थानांतरण फेल हो गया। कृपया दोबारा प्रयास करें।", "error");
    }
  };

  const handleUpdateListName = async (newName: string) => {
    if (!newName.trim() || !activeListId) return;
    await setDoc(doc(db, "order_lists", activeListId), { name: newName.toUpperCase() }, { merge: true });
  };

  const handleRemoveFromSavedList = (compoundId: string, name: string) => {
    confirmDeleteWithPin(`हटाएं "${name}"?`, async () => {
      await deleteDoc(doc(db, "saved_orders", compoundId));
    });
  };

  const handleDeleteActiveList = () => {
    confirmDeleteWithPin("क्या आप इस लिस्ट को हटाना चाहते हैं?", async () => {
      const batch = writeBatch(db);
      savedOrders.filter(o => o.listId === activeListId).forEach(item => batch.delete(doc(db, "saved_orders", item.id)));
      batch.delete(doc(db, "order_lists", activeListId));
      await batch.commit();
      setActiveListId("");
    });
  };

  const handleUpdateOrderQty = async (compoundId: string, qty: string) => {
    await setDoc(doc(db, "saved_orders", compoundId), { orderQty: qty }, { merge: true });
  };

  // --- 🍳 किचन क्लोजिंग स्टॉक और दैनिक खपत के नए फ़ंक्शन ---

  // सभी दर्ज किए गए क्लोजिंग स्टॉक आइटम को एक साथ सहेजना
  const handleSaveAllKitchenClosings = async () => {
    const enteredItems = Object.entries(kitchenClosingInputs).filter(([_, val]) => val.trim() !== "");
    if (enteredItems.length === 0) {
      toastMessage("कोई क्लोजिंग मात्रा दर्ज नहीं की गई है!", "info");
      return;
    }

    triggerHaptic(60);
    try {
      const batch = writeBatch(db);
      let updateCount = 0;

      for (const [itemId, physicalInput] of enteredItems) {
        const item = inventory.find(i => i.id === itemId);
        if (!item) continue;
        const physicalQty = parseFloat(physicalInput);
        if (isNaN(physicalQty) || physicalQty < 0) continue;

        const expectedQty = item.kitchenQty || 0;
        const consumedQty = expectedQty - physicalQty;

        // डेटाबेस में किचन स्टॉक मात्रा को नया क्लोजिंग स्टॉक सेट करें
        batch.set(doc(db, "godown_inventory", itemId), { kitchenQty: physicalQty }, { merge: true });

        // यदि कुछ उपयोग हुआ है तो उसे 'Kitchen Use' के तौर पर लेज़र में जोड़ें
        if (consumedQty > 0) {
          const logRef = doc(collection(db, "stock_out_history"));
          batch.set(logRef, {
            id: logRef.id,
            itemName: item.name,
            itemId: item.id,
            qty: consumedQty,
            purpose: "Kitchen Use",
            date: getLocalDateString(0),
            remarks: "रात्रि क्लोजिंग स्टॉक द्वारा स्वचालित गणना",
            financialLoss: 0
          });
        }
        updateCount++;
      }

      if (updateCount > 0) {
        await batch.commit();
        setKitchenClosingInputs({});
        toastMessage(`${updateCount} आइटम का क्लोजिंग स्टॉक सहेजा गया! 🍳`, "success");
      }
    } catch {
      toastMessage("क्लोजिंग स्टॉक अपडेट करने में त्रुटि!", "error");
    }
  };

  // व्यक्तिगत रूप से एक आइटम को सहेजना
  const handleSaveSingleKitchenClosing = async (itemId: string, physicalInput: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;
    const physicalQty = parseFloat(physicalInput);
    if (isNaN(physicalQty) || physicalQty < 0) {
      toastMessage("सही मात्रा दर्ज करें", "error");
      return;
    }

    try {
      const expectedQty = item.kitchenQty || 0;
      const consumedQty = expectedQty - physicalQty;

      const batch = writeBatch(db);
      batch.set(doc(db, "godown_inventory", itemId), { kitchenQty: physicalQty }, { merge: true });

      if (consumedQty > 0) {
        const logRef = doc(collection(db, "stock_out_history"));
        batch.set(logRef, {
          id: logRef.id,
          itemName: item.name,
          itemId: item.id,
          qty: consumedQty,
          purpose: "Kitchen Use",
          date: getLocalDateString(0),
          remarks: "रात्रि क्लोजिंग स्टॉक द्वारा स्वचालित गणना",
          financialLoss: 0
        });
      }

      await batch.commit();
      setKitchenClosingInputs(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      });
      toastMessage(`"${item.name}" का स्टॉक अपडेट किया गया!`, "success");
    } catch {
      toastMessage("अपडेट फेल हुआ।", "error");
    }
  };

  // आज की कुल किचन खपत (Today's Consumption List)
  const todayKitchenConsumption = useMemo(() => {
    const todayStr = getLocalDateString(0);
    const dailyMap: Record<string, { qty: number; unit: string }> = {};
    
    stockOutHistory.forEach(log => {
      if (log.date === todayStr && log.purpose === "Kitchen Use") {
        const item = inventory.find(i => i.id === log.itemId);
        const unit = item?.unit || "Units";
        const current = dailyMap[log.itemName] || { qty: 0, unit };
        dailyMap[log.itemName] = {
          qty: current.qty + log.qty,
          unit
        };
      }
    });

    return Object.entries(dailyMap).map(([name, val]) => ({
      name,
      qty: val.qty,
      unit: val.unit
    }));
  }, [stockOutHistory, inventory]);

  // पिछले 7 दिनों का खपत इतिहास
  const pastDaysConsumption = useMemo(() => {
    const dailyMap: Record<string, Record<string, number>> = {};
    const itemUnits: Record<string, string> = {};

    stockOutHistory.forEach(log => {
      if (log.purpose === "Kitchen Use") {
        const date = log.date;
        const name = log.itemName;
        const item = inventory.find(i => i.id === log.itemId);
        itemUnits[name] = item?.unit || "Units";

        if (!dailyMap[date]) dailyMap[date] = {};
        dailyMap[date][name] = (dailyMap[date][name] || 0) + log.qty;
      }
    });

    return Object.entries(dailyMap)
      .sort((a, b) => b[0].localeCompare(a[0])) 
      .slice(0, 7) 
      .map(([date, items]) => ({
        date,
        consumptions: Object.entries(items).map(([name, qty]) => ({
          name,
          qty,
          unit: itemUnits[name] || "Units"
        }))
      }));
  }, [stockOutHistory, inventory]);

  // किचन टैब के लिए सर्च फ़िल्टर
  const filteredKitchenInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(kitchenSearchQuery.toLowerCase());
      // यदि वर्तमान में किचन में स्टॉक है या उस सामान का उपयोग होता है
      return matchesSearch && (item.kitchenQty > 0 || item.storeQty > 0);
    });
  }, [inventory, kitchenSearchQuery]);

  if (authLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${isDarkMode ? 'bg-[#0E0E0E] text-white' : 'bg-[#FAFAFA] text-neutral-900'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <p className="text-xs font-bold mt-3 text-neutral-400">प्रमाणीकरण की जाँच हो रही है...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-[#0E0E0E] text-white' : 'bg-[#FAFAFA] text-neutral-900'}`}>
        <motion.form 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          onSubmit={handleLoginSubmit} 
          className={`w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 border text-center shadow-xl ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'}`}
        >
          <div className="space-y-2">
            <span className="text-5xl block">☕</span>
            <h1 className="text-xl font-black text-orange-600 tracking-wider uppercase">BUM BUM CAFE</h1>
            <p className="text-[10px] text-neutral-400 font-bold uppercase">इन्वेंटरी पोर्टल</p>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] text-neutral-400 font-bold uppercase block">प्रवेश के लिए अपना पिन डालें</label>
            <input 
              type="password" 
              maxLength={6} 
              placeholder="••••" 
              value={pinInput} 
              onChange={e => setPinInput(e.target.value)} 
              className="w-full text-center text-2xl tracking-[1em] p-3 rounded-2xl border font-black bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-orange-500" 
              required 
              autoFocus
            />
            {authError && <p className="text-xs text-red-500 font-bold">{authError}</p>}
          </div>

          <button 
            type="submit" 
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-lg transition-colors"
          >
            प्रवेश करें ➔
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0E0E0E]' : 'bg-[#FAFAFA]'} pb-24 font-sans relative ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
      <link rel="manifest" href="/store_manifest.json" />

      {/* HEADER */}
      <header className={`sticky top-0 z-40 h-16 border-b px-4 backdrop-blur-md ${isDarkMode ? 'bg-black/80 border-neutral-800' : 'bg-white/80 border-neutral-100'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">☕</span>
          <div>
            <h1 className="text-xs font-black text-orange-600 tracking-wider">BUM BUM CAFE</h1>
            <p className="text-[9px] text-neutral-400 font-bold uppercase">नमस्ते, {currentUser?.name} 👋</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleMergeAllExistingDuplicates} 
            className="p-2 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl text-xs flex items-center gap-1"
            title="पुराने सभी डुप्लीकेट सामान आपस में मर्ज करें"
          >
            🧹 <span className="hidden sm:inline text-[9px] font-bold">मर्ज करें</span>
          </button>
          <button onClick={handleLogout} className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-xl text-xs"><Lock size={13} /></button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs">{isDarkMode ? '☀️' : '🌙'}</button>
        </div>
      </header>

      {/* MAIN VIEW */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {activeTab === 'home' && (
          <StockDashboard 
            isDarkMode={isDarkMode} dashboardDateRange={dashboardDateRange} setDashboardDateRange={setDashboardDateRange}
            startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
            getFilteredLedgerStats={getFilteredLedgerStats} stats={stats} categories={categories}
            categoryStockValues={categoryStockValues} stockFlowTimeline={stockFlowTimeline}
            fixedAssets={fixedAssets} 
          />
        )}

        {activeTab === 'store' && (
          <StockGodown 
            isDarkMode={isDarkMode} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            isMultiSelectMode={isMultiSelectMode} setIsMultiSelectMode={setIsMultiSelectMode}
            selectedItemIds={selectedItemIds} setSelectedItemIds={setSelectedItemIds}
            selectedCategoryFilter={selectedCategoryFilter} setSelectedCategoryFilter={setSelectedCategoryFilter}
            visibleCategories={visibleCategories} filteredInventory={filteredInventory}
            editedQties={editedQties} setEditedQties={setEditedQties} adjustQty={adjustQty} saveQty={saveQty}
            handleToggleMultiSelect={handleToggleMultiSelect} setShowManageCategoriesModal={setShowManageCategoriesModal}
            setShowAddProductModal={setShowAddProductModal} setEditingProduct={setEditingProduct}
            setTransferItem={setTransferItem} setShowTransferModal={setShowTransferModal}
            setConsumeItem={setConsumeItem} setShowConsumeModal={setShowConsumeModal}
            setShowSaveToListModal={setShowSaveToListModal} 
            setShowBulkCategoryModal={setShowBulkCategoryModal} 
          />
        )}

        {/* 🍳 NEW KITCHEN CLOSING & CONSUMPTION TAB */}
        {activeTab === 'kitchen' && (
          <div className="space-y-4">
            
            {/* 📍 KITCHEN INNER SEGMENTED SUB-TABS */}
            <div className={`p-1 rounded-2xl flex border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'} text-xs font-black uppercase`}>
              <button 
                onClick={() => { triggerHaptic(15); setActiveKitchenSubTab('closing'); }} 
                className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${activeKitchenSubTab === 'closing' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400'}`}
              >
                🌙 क्लोजिंग
              </button>
              <button 
                onClick={() => { triggerHaptic(15); setActiveKitchenSubTab('today_use'); }} 
                className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${activeKitchenSubTab === 'today_use' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400'}`}
              >
                🔥 आज का उपयोग
              </button>
              <button 
                onClick={() => { triggerHaptic(15); setActiveKitchenSubTab('history'); }} 
                className={`flex-1 py-2 text-center rounded-xl transition-all duration-200 ${activeKitchenSubTab === 'history' ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-400'}`}
              >
                📅 7-दिन इतिहास
              </button>
            </div>

            {/* SUB-TAB 1: 🌙 क्लोजिंग (NIGHT CLOSING) */}
            {activeKitchenSubTab === 'closing' && (
              <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm space-y-3`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xs font-black text-green-500 uppercase tracking-wider">🌙 रात्रि क्लोजिंग स्टॉक</h2>
                    <p className="text-[9px] text-neutral-400 font-bold">किचन स्टॉक को सत्यापित कर दैनिक उपयोग की जांच करें</p>
                  </div>
                  {Object.keys(kitchenClosingInputs).length > 0 && (
                    <button 
                      onClick={handleSaveAllKitchenClosings}
                      className="px-3 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg transition-all"
                    >
                      💾 सभी सहेजें
                    </button>
                  )}
                </div>

                {/* खोजें */}
                <input 
                  type="text" 
                  placeholder="सामग्री खोजें... (जैसे: MILK)" 
                  value={kitchenSearchQuery}
                  onChange={e => setKitchenSearchQuery(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs font-bold border dark:bg-neutral-950 dark:border-neutral-800 focus:outline-none"
                />

                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                  {filteredKitchenInventory.length === 0 ? (
                    <p className="text-xs text-center py-4 text-neutral-400 font-bold">कोई सामग्री नहीं मिली।</p>
                  ) : (
                    filteredKitchenInventory.map(item => {
                      const expected = item.kitchenQty || 0;
                      const typedVal = kitchenClosingInputs[item.id] || "";
                      const typedNum = parseFloat(typedVal);
                      const consumed = !isNaN(typedNum) ? (expected - typedNum) : 0;

                      return (
                        <div key={item.id} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-neutral-950 border-neutral-850' : 'bg-white border-neutral-100'} flex items-center justify-between gap-2`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate uppercase">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-400 font-bold">
                              <span>सिस्टम स्टॉक: <strong className={isDarkMode ? 'text-white' : 'text-black'}>{expected} {item.unit}</strong></span>
                              {consumed > 0 && (
                                <span className="text-orange-500 animate-pulse">🔥 उपयोग: {consumed.toFixed(1)} {item.unit}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              placeholder="क्लोजिंग"
                              value={typedVal}
                              onChange={e => setKitchenClosingInputs({ ...kitchenClosingInputs, [item.id]: e.target.value })}
                              className="w-16 p-1.5 rounded-xl text-center text-xs font-black border dark:bg-neutral-900"
                            />
                            {typedVal.trim() !== "" && (
                              <button 
                                onClick={() => handleSaveSingleKitchenClosing(item.id, typedVal)}
                                className="p-1.5 bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400 rounded-xl font-bold text-xs"
                                title="सहेजें"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB 2: 🔥 आज का उपयोग (TODAY USE) */}
            {activeKitchenSubTab === 'today_use' && (
              <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                <h2 className="text-xs font-black text-orange-500 uppercase tracking-wider mb-2">🔥 आज की कुल किचन खपत (Today's Usage)</h2>
                {todayKitchenConsumption.length === 0 ? (
                  <p className="text-xs text-neutral-400 font-medium py-4 text-center">आज अभी तक कोई खपत दर्ज नहीं की गई है। रात्रि क्लोजिंग करें!</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {todayKitchenConsumption.map((c, idx) => (
                      <div key={idx} className={`p-2.5 rounded-xl border text-xs font-bold flex justify-between ${isDarkMode ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-50 border-neutral-150'}`}>
                        <span className="text-neutral-400 truncate max-w-[100px]">{c.name}</span>
                        <span className="text-orange-500">{c.qty} {c.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 3: 📅 7-दिन इतिहास (PAST 7 DAYS HISTORY) */}
            {activeKitchenSubTab === 'history' && (
              <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                <h2 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">📅 दैनिक खपत इतिहास (Past 7 Days History)</h2>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {pastDaysConsumption.length === 0 ? (
                    <p className="text-xs text-neutral-400 py-4 text-center">कोई पुराना खपत इतिहास उपलब्ध नहीं है।</p>
                  ) : (
                    pastDaysConsumption.map((day, idx) => (
                      <div key={idx} className="p-3 rounded-2xl border dark:border-neutral-800/80 space-y-1.5">
                        <p className="text-[10px] font-black uppercase text-orange-500">{new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold">
                          {day.consumptions.map((c, cIdx) => (
                            <div key={cIdx} className="flex justify-between border-b border-dashed dark:border-neutral-850 pb-0.5">
                              <span className="text-neutral-400 truncate max-w-[100px]">{c.name}</span>
                              <span>{c.qty} {c.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {activeTab === 'fixed_assets' && (
          <StockAssets 
            isDarkMode={isDarkMode} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filteredAssets={filteredAssets} setShowAddAssetModal={setShowAddAssetModal}
            handleDeleteAsset={handleDeleteAsset}
            handleMigrate={handleMigrateCrockeryCutlery} 
            setEditingAsset={setEditingAsset} 
            handleAdjustQty={handleAdjustAssetQty} 
          />
        )}

        {activeTab === 'saved_list' && (
          <StockSupplierOrder 
            isDarkMode={isDarkMode} orderLists={orderLists} savedOrders={savedOrders}
            activeListId={activeListId} setActiveListId={setActiveListId} handleDeleteActiveList={handleDeleteActiveList}
            isEditingListName={isEditingListName} setIsEditingListName={setIsEditingListName}
            tempListNameInput={tempListNameInput} setTempListNameInput={setTempListNameInput}
            handleUpdateListName={handleUpdateListName} activeListName={activeListName}
            localOrderQties={localOrderQties} setLocalOrderQties={setLocalOrderQties}
            setFocusedOrderField={setFocusedOrderField} handleUpdateOrderQty={handleUpdateOrderQty}
            handleRemoveFromSavedList={handleRemoveFromSavedList} handlePrintSavedList={handlePrintSavedList}
            handleWhatsAppShare={handleWhatsAppShare}
          />
        )}

        {activeTab === 'waste' && (
          <StockLedger 
            isDarkMode={isDarkMode} ledgerFilter={ledgerFilter} setLedgerFilter={setLedgerFilter}
            unifiedLedger={unifiedLedger} setShowStockOutModal={setShowStockOutModal}
          />
        )}
      </main>

      {/* OVERLAY MODALS */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.form onSubmit={handleDeleteVerificationSubmit} className={`w-full max-w-sm rounded-[2.5rem] p-6 space-y-5 border text-center ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-100'}`}>
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2 mb-2 w-full">
                <span className="text-xs font-black text-red-500 uppercase">सुरक्षा प्रमाणीकरण</span>
                <button type="button" onClick={() => setDeleteConfirmation(null)} className="p-1.5 bg-neutral-100 dark:bg-neutral-850 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <p className="text-xs text-neutral-400">{deleteConfirmation.message}</p>
              <input type="password" maxLength={6} placeholder="••••" value={deletePinInput} onChange={e => setDeletePinInput(e.target.value)} className="w-full text-center text-xl tracking-[1em] p-2.5 rounded-xl border font-black dark:bg-neutral-800" required />
              {deletePinError && <p className="text-[10px] text-red-500 font-bold">{deletePinError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteConfirmation(null)} className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-black">रद्द करें</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg">डिलीट ➔</button>
              </div>
            </motion.form>
          </div>
        )}

        {/* Modal: Manage Categories */}
        {showManageCategoriesModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100'}`}>
              <div className="flex justify-between items-center border-b pb-2.5">
                <h3 className="text-xs font-black uppercase text-orange-500">कैटेगरी का प्रबंधन (Manage Categories)</h3>
                <button type="button" onClick={() => setShowManageCategoriesModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>
              <div className="flex gap-1.5 items-center">
                <input type="text" placeholder="FROZEN" value={addCategoryModalInput} onChange={e => setAddCategoryModalInput(e.target.value)} className="flex-1 p-2 rounded-xl text-xs font-bold border uppercase dark:bg-neutral-900" />
                <button onClick={handleAddNewCategoryInModal} className="px-3 py-2 bg-green-600 text-white text-xs font-black uppercase rounded-xl">जोड़ें (Add)</button>
              </div>
              <div className="space-y-1.5 max-h-[35vh] overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-2.5 border rounded-xl text-xs font-bold">
                    <span>{cat.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggleCategoryHide(cat)} className="p-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg">{cat.hidden ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                      <button onClick={() => handleRemoveCategory(cat)} className="p-1.5 bg-red-100 text-red-500 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Transfer to kitchen */}
        {showTransferModal && transferItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleTransferToKitchenSubmit} className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black uppercase text-orange-500">किचन में भेजें - {transferItem.name}</h3>
                <button type="button" onClick={() => setShowTransferModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <input type="number" placeholder="मात्रा (Qty)" value={transferQtyInput} onChange={e => setTransferQtyInput(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-center" required />
              <button type="submit" className="w-full py-3 bg-orange-500 text-white rounded-xl text-xs font-black">पुष्टि करें (Confirm)</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Consume Kitchen stock */}
        {showConsumeModal && consumeItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleConsumeKitchenSubmit} className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black uppercase text-neutral-400">किचन स्टॉक का उपयोग - {consumeItem.name}</h3>
                <button type="button" onClick={() => setShowConsumeModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <input type="number" placeholder="मात्रा (Qty)" value={consumeQtyInput} onChange={e => setConsumeQtyInput(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-center" required />
              <input type="text" placeholder="टिप्पणी (Remarks)" value={consumeRemarksInput} onChange={e => setConsumeRemarksInput(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" />
              <button type="submit" className="w-full py-3 bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-xs font-black">उपयोग सहेजें (Save)</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Log Waste / Damage */}
        {showStockOutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleWasteSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black text-red-500 uppercase">कचरा / नुकसान दर्ज करें</h3>
                <button type="button" onClick={() => setShowStockOutModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <select value={formStockOut.item} onChange={e => setFormStockOut({ ...formStockOut, item: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-bold text-xs" required>
                <option value="">सामान चुनें...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.storeQty} उपलब्ध)</option>)}
              </select>
              <input type="number" placeholder="मात्रा (Qty)" value={formStockOut.quantity} onChange={e => setFormStockOut({ ...formStockOut, quantity: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs" required />
              <select value={formStockOut.purpose} onChange={e => setFormStockOut({ ...formStockOut, purpose: e.target.value as any })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs">
                <option value="Waste">Waste (कचरा)</option>
                <option value="Damage">Damage (नुकसान)</option>
              </select>
              <input type="text" placeholder="टिप्पणी (Remarks)" value={formStockOut.remarks} onChange={e => setFormStockOut({ ...formStockOut, remarks: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs" />
              <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase">रिकॉर्ड सहेजें (Save)</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Add Product */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleAddProductSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black text-green-500 uppercase">नया उत्पाद जोड़ें</h3>
                <button type="button" onClick={() => setShowAddProductModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <input type="text" placeholder="नाम (जैसे: AMUL BUTTER)" value={formAddProduct.name} onChange={e => setFormAddProduct({ ...formAddProduct, name: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs" required />
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">कैटेगरी (Category)</label>
                  <select value={formAddProduct.category} onChange={e => setFormAddProduct({ ...formAddProduct, category: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold">
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">यूनिट (Unit)</label>
                  <select value={formAddProduct.unit} onChange={e => setFormAddProduct({ ...formAddProduct, unit: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-[#181818]">
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="कीमत (INR)" value={formAddProduct.purchasePrice} onChange={e => setFormAddProduct({ ...formAddProduct, purchasePrice: e.target.value })} className="p-2 border rounded-xl dark:bg-neutral-800" required />
                <input type="number" placeholder="गोदाम मात्रा" value={formAddProduct.storeQty} onChange={e => setFormAddProduct({ ...formAddProduct, storeQty: e.target.value })} className="p-2 border rounded-xl dark:bg-neutral-800" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="न्यूनतम सीमा" value={formAddProduct.minLimit} onChange={e => setFormAddProduct({ ...formAddProduct, minLimit: e.target.value })} className="p-2 border rounded-xl dark:bg-neutral-800" />
                <input type="date" value={formAddProduct.lastPurchaseDate} onChange={e => setFormAddProduct({ ...formAddProduct, lastPurchaseDate: e.target.value })} className="p-2 border rounded-xl dark:bg-[#181818]" />
              </div>

              <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-bold uppercase">उत्पाद सहेजें (Save Product)</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Edit Product */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleEditProductSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black uppercase text-orange-500">विवरण संपादित करें</h3>
                <button type="button" onClick={() => setEditingProduct(null)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value.toUpperCase() })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs" required />
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">कैटेगरी (Category)</label>
                  <select value={editingProduct.category || "OTHER"} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold">
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">यूनिट (Unit)</label>
                  <select value={editingProduct.unit} onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-[#181818]">
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="कीमत (INR)" value={editingProduct.purchasePrice} onChange={e => setEditingProduct({ ...editingProduct, purchasePrice: parseFloat(e.target.value) || 0 })} className="p-2 border rounded-xl dark:bg-neutral-800" required />
                <input type="number" placeholder="न्यूनतम सीमा" value={editingProduct.minLimit} onChange={e => setEditingProduct({ ...editingProduct, minLimit: parseFloat(e.target.value) || 0 })} className="p-2 border rounded-xl dark:bg-neutral-800" required />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="गोदाम मात्रा" value={editingProduct.storeQty} onChange={e => setEditingProduct({ ...editingProduct, storeQty: parseFloat(e.target.value) || 0 })} className="p-2 border rounded-xl dark:bg-neutral-800" required />
                <input type="number" placeholder="किचन मात्रा" value={editingProduct.kitchenQty || 0} onChange={e => setEditingProduct({ ...editingProduct, kitchenQty: parseFloat(e.target.value) || 0 })} className="p-2 border rounded-xl dark:bg-neutral-800" required />
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => handleDeleteProduct(editingProduct.id, editingProduct.name)} className="px-4 py-3 bg-red-100 text-red-600 rounded-xl font-bold text-xs uppercase">हटाएं</button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-xs uppercase">अपडेट करें ➔</button>
              </div>
            </motion.form>
          </div>
        )}

        {/* Modal: Add Fixed Asset */}
        {showAddAssetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleAddAssetSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black text-green-500 uppercase">अचल संपत्ति (Fixed Asset) जोड़ें</h3>
                <button type="button" onClick={() => setShowAddAssetModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">एसेट का प्रकार</label>
                <select 
                  value={formAddAsset.type} 
                  onChange={e => setFormAddAsset({ ...formAddAsset, type: e.target.value })} 
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs font-bold"
                >
                  <option value="general">🏢 सामान्य एसेट (General)</option>
                  <option value="cutlery">🍴 कटलरी (Cutlery)</option>
                  <option value="crockery">🍽️ क्रॉकरी (Crockery)</option>
                  <option value="decoration">✨ डेकोरेशन मटेरियल (Decoration)</option>
                </select>
              </div>

              <input type="text" placeholder="एसेट का नाम" value={formAddAsset.name} onChange={e => setFormAddAsset({ ...formAddAsset, name: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs" required />
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">मात्रा (Qty)</label>
                  <input type="number" placeholder="Qty" value={formAddAsset.quantity} onChange={e => setFormAddAsset({ ...formAddAsset, quantity: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">यूनिट (Unit)</label>
                  <select 
                    value={formAddAsset.unit} 
                    onChange={e => setFormAddAsset({ ...formAddAsset, unit: e.target.value })} 
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-bold"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">लागत (Cost)</label>
                <input type="number" placeholder="Cost" value={formAddAsset.cost} onChange={e => setFormAddAsset({ ...formAddAsset, cost: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs" />
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-bold uppercase">एसेट सहेजें (Save Asset)</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Edit Fixed Asset */}
        {editingAsset && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleEditAssetSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black uppercase text-orange-500">एसेट विवरण संपादित करें</h3>
                <button type="button" onClick={() => setEditingAsset(null)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">श्रेणी (Type)</label>
                <select 
                  value={editingAsset.type || 'general'} 
                  onChange={e => setEditingAsset({ ...editingAsset, type: e.target.value })} 
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs font-bold"
                >
                  <option value="general">🏢 सामान्य एसेट</option>
                  <option value="cutlery">🍴 कटलरी</option>
                  <option value="crockery">🍽️ क्रॉकरी</option>
                  <option value="decoration">✨ डेकोरेशन मटेरियल</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">नाम (Name)</label>
                <input 
                  type="text" 
                  value={editingAsset.name} 
                  onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value.toUpperCase() })} 
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-xs" 
                  required 
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">मात्रा (Qty)</label>
                  <input 
                    type="number" 
                    value={editingAsset.quantity} 
                    onChange={e => setEditingAsset({ ...editingAsset, quantity: parseFloat(e.target.value) || 0 })} 
                    className="w-full p-2 border rounded-xl dark:bg-neutral-800" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">यूनिट</label>
                  <select 
                    value={editingAsset.unit || 'Pcs'} 
                    onChange={e => setEditingAsset({ ...editingAsset, unit: e.target.value })} 
                    className="w-full p-2 border rounded-xl dark:bg-neutral-800 font-bold"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Kg">Kg</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">लागत (Cost)</label>
                  <input 
                    type="number" 
                    value={editingAsset.cost || 0} 
                    onChange={e => setEditingAsset({ ...editingAsset, cost: parseFloat(e.target.value) || 0 })} 
                    className="w-full p-2 border rounded-xl dark:bg-neutral-800" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">स्थिति (Condition)</label>
                <select 
                  value={editingAsset.condition} 
                  onChange={e => setEditingAsset({ ...editingAsset, condition: e.target.value as any })} 
                  className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold text-xs"
                >
                  <option value="Working">Working (सक्रिय)</option>
                  <option value="Needs Repair">Needs Repair (मरम्मत योग्य)</option>
                  <option value="Broken">Broken (टूटा हुआ)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    confirmDeleteWithPin(`क्या आप इस एसेट "${editingAsset.name}" को हटाना चाहते हैं?`, async () => {
                      await deleteDoc(doc(db, "fixed_assets", editingAsset.id));
                      setEditingAsset(null);
                    });
                  }} 
                  className="px-4 py-3 bg-red-100 text-red-600 rounded-xl font-bold text-xs uppercase"
                >
                  हटाएं
                </button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-xs uppercase">अपडेट करें ➔</button>
              </div>
            </motion.form>
          </div>
        )}

        {/* Bulk Category Modal */}
        {showBulkCategoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100'}`}>
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black uppercase text-orange-500">कैटेगरी बदलें (Change Category)</h3>
                <button type="button" onClick={() => setShowBulkCategoryModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <select value={bulkTargetCategory} onChange={e => setBulkTargetCategory(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-950 font-bold text-xs">
                <option value="">-- चुनें --</option>
                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                <option value="CREATE_NEW">-- + नई कैटेगरी बनाएं --</option>
              </select>
              {bulkTargetCategory === "CREATE_NEW" && <input type="text" placeholder="FROZEN FOOD" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} className="w-full p-2.5 rounded-xl border uppercase dark:bg-neutral-950 text-xs" required />}
              <button onClick={handleConfirmBulkCategory} className="w-full py-3 bg-[#FF6B00] text-white rounded-xl text-xs font-black">कैटेगरी सेट करें ➔</button>
            </motion.div>
          </div>
        )}

        {/* Supplier Order list selection modal */}
        {showSaveToListModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100'}`}>
              <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-2.5 mb-2">
                <h3 className="text-xs font-black uppercase text-orange-500">सप्लायर ऑर्डर में सहेजें</h3>
                <button type="button" onClick={() => setShowSaveToListModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-500"><X size={14} /></button>
              </div>
              <select value={targetListId} onChange={e => setTargetListId(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-900 font-bold text-xs">
                {orderLists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                <option value="CREATE_NEW">-- + नई ऑर्डर लिस्ट बनाएं --</option>
              </select>
              {targetListId === "CREATE_NEW" && <input type="text" placeholder="WEEKLY ORDER" value={newListNameInput} onChange={e => setNewListNameInput(e.target.value)} className="w-full p-2.5 rounded-xl border uppercase dark:bg-neutral-950 text-xs" required />}
              <button onClick={handleConfirmSaveToList} className="w-full py-3 bg-[#FF6B00] text-white rounded-xl text-xs font-black">पुष्टि करें ➔</button>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* TOAST ALERT */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto flex items-center gap-2.5 p-4 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-black shadow-2xl border border-neutral-800 dark:border-neutral-200"
          >
            <span className="text-base">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p className="text-xs font-bold">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAVIGATION BAR */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md ${isDarkMode ? 'bg-black/90 border-neutral-800 text-white' : 'bg-white/90 border-neutral-100 text-neutral-900'}`}>
        <div className="max-w-md mx-auto grid grid-cols-6 gap-0.5 py-1.5 text-center text-[7.5px] font-black uppercase">
          <button onClick={() => { setActiveTab('home'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'home' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Home size={14} /> <span className="mt-0.5">होम</span>
          </button>
          <button onClick={() => { setActiveTab('store'); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'store' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Store size={14} /> <span className="mt-0.5">गोदाम</span>
          </button>
          
          {/* 🍳 KITCHEN TAB BUTTON */}
          <button onClick={() => { setActiveTab('kitchen'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'kitchen' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Utensils size={14} /> <span className="mt-0.5">किचन</span>
          </button>

          <button onClick={() => { setActiveTab('fixed_assets'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'fixed_assets' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Wrench size={14} /> <span className="mt-0.5">एसेट्स</span>
          </button>
          <button onClick={() => { setActiveTab('saved_list'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'saved_list' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Layers size={14} /> <span className="mt-0.5">ऑर्डर</span>
          </button>
          <button onClick={() => { setActiveTab('waste'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'waste' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <AlertTriangle size={14} /> <span className="mt-0.5">लेज़र</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
