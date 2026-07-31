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
import StockKitchen from '../../components/store/StockKitchen'; // 🍳 विभाजित और प्रबंधित किचन कंपोनेंट

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

interface KitchenClosingRecord {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  systemQty: number;
  physicalQty: number;
  consumedQty: number;
  timestamp: string;
  staffName: string;
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
  const [editedQties, setEditedQties] = useState<Record<string, string | number>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // किचन क्लोजिंग इनपुट्स और स्नैपशॉट
  const [kitchenClosingInputs, setKitchenClosingInputs] = useState<Record<string, string>>({});
  const [kitchenClosingsHistory, setKitchenClosingsHistory] = useState<KitchenClosingRecord[]>([]);

  const [currentUser, setCurrentUser] = useState<UserPin | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(true); 

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

    const unsubKitchenClosings = onSnapshot(
      query(collection(db, "kitchen_closings_log"), orderBy("timestamp", "desc"), limit(150)),
      (snap) => {
        setKitchenClosingsHistory(snap.docs.map(d => d.data() as KitchenClosingRecord));
      }
    );

    return () => {
      unsubInventory(); unsubCategories(); unsubStockIns(); unsubStockOuts(); unsubSavedOrders(); unsubFixedAssets(); unsubKitchenClosings();
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
        setKitchenClosingInputs({});
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

        const closingLogRef = doc(db, "kitchen_closings_log", `${item.id}_${getLocalDateString(0)}`);
        batch.set(closingLogRef, {
          id: `${item.id}_${getLocalDateString(0)}`,
          date: getLocalDateString(0),
          itemId: item.id,
          itemName: item.name,
          systemQty: expectedQty,
          physicalQty: physicalQty,
          consumedQty: consumedQty > 0 ? consumedQty : 0,
          timestamp: new Date().toISOString(),
          staffName: currentUser?.name || "Staff"
        });

        updateCount++;
      }

      if (updateCount > 0) {
        await batch.commit();
        setKitchenClosingInputs({});
        // सफल सबमिशन पर क्लोजिंग स्टॉक ड्राफ्ट को साफ़ (Clear) करना
        localStorage.removeItem('kitchen_closing_draft');
        toastMessage(`${updateCount} आइटम का क्लोजिंग स्टॉक सहेजा गया! 🍳`, "success");
      }
    } catch {
      toastMessage("क्लोजिंग स्टॉक अपडेट करने में त्रुटि!", "error");
    }
  };

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

      const closingLogRef = doc(db, "kitchen_closings_log", `${item.id}_${getLocalDateString(0)}`);
      batch.set(closingLogRef, {
        id: `${item.id}_${getLocalDateString(0)}`,
        date: getLocalDateString(0),
        itemId: item.id,
        itemName: item.name,
        systemQty: expectedQty,
        physicalQty: physicalQty,
        consumedQty: consumedQty > 0 ? consumedQty : 0,
        timestamp: new Date().toISOString(),
        staffName: currentUser?.name || "Staff"
      });

      await batch.commit();
      setKitchenClosingInputs(prev => {
        const copy = { ...prev };
        delete copy[itemId];
        // सफल व्यक्तिगत सबमिशन पर ड्राफ्ट को लोकल स्टोरेज में भी अपडेट करना
        localStorage.setItem('kitchen_closing_draft', JSON.stringify(copy));
        return copy;
      });
      toastMessage(`"${item.name}" का स्टॉक अपडेट किया गया!`, "success");
    } catch {
      toastMessage("अपडेट फेल हुआ।", "error");
    }
  };

  // --- नए आवश्यक एक्शन हैंडलर्स की परिभाषा (New Required Action Handlers) ---

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { item: itemId, quantity, purpose, remarks } = formStockOut;
    if (!itemId || !quantity) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    const originalItem = inventory.find(i => i.id === itemId);
    if (!originalItem) return;

    if (originalItem.storeQty < qty) {
      toastMessage("गोदाम में पर्याप्त स्टॉक नहीं है!", "error");
      return;
    }

    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "godown_inventory", itemId), { storeQty: increment(-qty) }, { merge: true });

      const logRef = doc(collection(db, "stock_out_history"));
      const loss = qty * (originalItem.purchasePrice || 0);
      batch.set(logRef, {
        id: logRef.id,
        itemName: originalItem.name,
        itemId: itemId,
        qty,
        purpose,
        date: getLocalDateString(0),
        remarks: remarks || "नुकसान दर्ज किया गया",
        financialLoss: loss
      });

      await batch.commit();
      setShowStockOutModal(false);
      setFormStockOut({ item: '', quantity: '', purpose: 'Waste', remarks: '' });
      toastMessage("नुकसान सफलतापूर्वक दर्ज किया गया!", "success");
    } catch {
      toastMessage("दर्ज करने में त्रुटि!", "error");
    }
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, storeQty, kitchenQty, unit, purchasePrice, minLimit, category, lastPurchaseDate } = formAddProduct;
    if (!name.trim() || !purchasePrice) return;

    try {
      const newDocId = `item_${Date.now()}`;
      const parsedStoreQty = parseFloat(storeQty) || 0;
      const parsedKitchenQty = parseFloat(kitchenQty) || 0;
      const parsedPrice = parseFloat(purchasePrice) || 0;
      const parsedMinLimit = parseFloat(minLimit) || 0;

      const newItemData = {
        id: newDocId,
        name: name.trim().toUpperCase(),
        storeQty: parsedStoreQty,
        kitchenQty: parsedKitchenQty,
        unit,
        purchasePrice: parsedPrice,
        minLimit: parsedMinLimit,
        category: category || "OTHER",
        lastPurchaseDate: lastPurchaseDate || getLocalDateString(0)
      };

      await setDoc(doc(db, "godown_inventory", newDocId), newItemData);
      
      if (parsedStoreQty > 0) {
        await addDoc(collection(db, "stock_in_history"), {
          itemName: newItemData.name,
          itemId: newDocId,
          qty: parsedStoreQty,
          date: getLocalDateString(0),
          remarks: "प्रारंभिक गोदाम स्टॉक"
        });
      }

      setShowAddProductModal(false);
      setFormAddProduct({ name: '', storeQty: '0', kitchenQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', category: 'OTHER', lastPurchaseDate: getLocalDateString(0) });
      toastMessage("नया उत्पाद जोड़ा गया!", "success");
    } catch {
      toastMessage("उत्पाद जोड़ने में समस्या आई।", "error");
    }
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await setDoc(doc(db, "godown_inventory", editingProduct.id), editingProduct, { merge: true });
      setEditingProduct(null);
      toastMessage("उत्पाद विवरण सहेजा गया!", "success");
    } catch {
      toastMessage("अपडेट करने में समस्या आई।", "error");
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    confirmDeleteWithPin(`क्या आप सच में "${name}" को गोदाम सूची से हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "godown_inventory", id));
      setEditingProduct(null);
    });
  };

  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, quantity, purchaseDate, cost, condition, remarks, type, unit } = formAddAsset;
    if (!name.trim()) return;

    try {
      const assetId = `asset_${Date.now()}`;
      await setDoc(doc(db, "fixed_assets", assetId), {
        id: assetId,
        name: name.trim().toUpperCase(),
        quantity: parseFloat(quantity) || 1,
        purchaseDate: purchaseDate || getLocalDateString(0),
        cost: parseFloat(cost) || 0,
        condition,
        remarks,
        type,
        unit
      });

      setShowAddAssetModal(false);
      setFormAddAsset({ name: '', quantity: '1', purchaseDate: '', cost: '', condition: 'Working', remarks: '', type: 'general', unit: 'Pcs' });
      toastMessage("अचल संपत्ति जोड़ी गई!", "success");
    } catch {
      toastMessage("एसेट जोड़ने में समस्या आई।", "error");
    }
  };

  const handleEditAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    try {
      await setDoc(doc(db, "fixed_assets", editingAsset.id), editingAsset, { merge: true });
      setEditingAsset(null);
      toastMessage("अचल संपत्ति अपडेट की गई!", "success");
    } catch {
      toastMessage("अपडेट करने में समस्या आई।", "error");
    }
  };

  const handleDeleteAsset = (id: string, name: string) => {
    confirmDeleteWithPin(`क्या आप सच में अचल संपत्ति "${name}" को हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "fixed_assets", id));
    });
  };

  const handleAdjustAssetQty = async (id: string, diff: number) => {
    const asset = fixedAssets.find(a => a.id === id);
    if (!asset) return;
    const currentQty = asset.quantity || 0;
    const newQty = Math.max(0, currentQty + diff);
    try {
      await setDoc(doc(db, "fixed_assets", id), { quantity: newQty }, { merge: true });
      toastMessage("मात्रा अपडेट की गई!", "success");
    } catch {
      toastMessage("त्रुटि आई!", "error");
    }
  };

  const handleDeleteActiveList = () => {
    if (!activeListId || activeListId === "general_list") {
      toastMessage("मुख्य सूची को हटाया नहीं जा सकता!", "error");
      return;
    }
    const list = orderLists.find(l => l.id === activeListId);
    const listName = list ? list.name : "इस सूची";
    confirmDeleteWithPin(`क्या आप सच में "${listName}" और इसके सभी आइटम्स को हटाना चाहते हैं?`, async () => {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "order_lists", activeListId));

        const listItems = savedOrders.filter(item => item.listId === activeListId);
        listItems.forEach(item => {
          batch.delete(doc(db, "saved_orders", item.id));
        });

        await batch.commit();
        setActiveListId("general_list");
        toastMessage("सूची हटा दी गई!", "success");
      } catch {
        toastMessage("हटाने में त्रुटि!", "error");
      }
    });
  };

  const handleUpdateListName = async () => {
    if (!tempListNameInput.trim() || !activeListId) return;
    try {
      await setDoc(doc(db, "order_lists", activeListId), { name: tempListNameInput.trim().toUpperCase() }, { merge: true });
      setIsEditingListName(false);
      setTempListNameInput("");
      toastMessage("सूची का नाम बदला गया!", "success");
    } catch {
      toastMessage("त्रुटि!", "error");
    }
  };

  const handleUpdateOrderQty = async (id: string, qty: string) => {
    try {
      await setDoc(doc(db, "saved_orders", id), { orderQty: qty }, { merge: true });
    } catch {}
  };

  const handleRemoveFromSavedList = async (id: string) => {
    try {
      await deleteDoc(doc(db, "saved_orders", id));
      toastMessage("सामग्री हटाई गई", "info");
    } catch {}
  };

  const handlePrintSavedList = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleWhatsAppShare = () => {
    const listItems = savedOrders.filter(item => item.listId === activeListId);
    if (listItems.length === 0) {
      toastMessage("साझा करने के लिए कोई आइटम नहीं है!", "info");
      return;
    }

    let text = `📋 *${activeListName}*\n📅 *दिनांक:* ${getLocalDateString(0)}\n\n`;
    listItems.forEach((item, idx) => {
      const orderStr = item.orderQty ? `-> *${item.orderQty} ${item.unit}*` : "(मात्रा दर्ज नहीं)";
      text += `${idx + 1}. ${item.name} ${orderStr}\n`;
    });

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

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

        {/* 🍳 NEW KITCHEN SEGMENTED TAB */}
        {activeTab === 'kitchen' && (
          <StockKitchen 
            isDarkMode={isDarkMode}
            inventory={inventory}
            categories={categories}
            currentUser={currentUser}
            stockOutHistory={stockOutHistory}
            kitchenClosingsHistory={kitchenClosingsHistory}
            kitchenClosingInputs={kitchenClosingInputs}
            setKitchenClosingInputs={setKitchenClosingInputs}
            handleSaveAllKitchenClosings={handleSaveAllKitchenClosings}
            handleSaveSingleKitchenClosing={handleSaveSingleKitchenClosing}
            toastMessage={toastMessage}
            triggerHaptic={triggerHaptic}
          />
        )}

        {activeTab === 'fixed_assets' && (
          <StockAssets 
            isDarkMode={isDarkMode} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filteredAssets={filteredAssets} setShowAddAssetModal={setShowAddAssetModal}
            handleDeleteAsset={handleDeleteAsset}
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
