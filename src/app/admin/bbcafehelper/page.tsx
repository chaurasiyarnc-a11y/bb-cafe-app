

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Home, Store, Trash2, Search, Plus, X, BarChart3, 
  PlusCircle, MinusCircle, ChevronRight, Sparkles, AlertTriangle, Printer, Edit, Layers, MessageCircle, Wrench, Tag, Eye, EyeOff, Settings, Calendar, Lock, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, doc, setDoc, increment, addDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';

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
}

interface UserPin {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'staff';
}

const triggerHaptic = (ms = 35) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
};

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "dry_1", name: "DOODH MILK", storeQty: 40, kitchenQty: 0, unit: "Ltr", purchasePrice: 60, minLimit: 10, category: "DAIRY" },
  { id: "dry_2", name: "DAHI CURD", storeQty: 15, kitchenQty: 0, unit: "Kg", purchasePrice: 80, minLimit: 5, category: "DAIRY" },
  { id: "dry_3", name: "MAKKHAN BUTTER", storeQty: 24, kitchenQty: 0, unit: "Kg", purchasePrice: 420, minLimit: 8, category: "DAIRY" },
  { id: "veg_2", name: "TAMATAR TOMATO", storeQty: 30, kitchenQty: 0, unit: "Kg", purchasePrice: 40, minLimit: 10, category: "VEGETABLES" }
];

export default function BumBumCafeStockApp() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("All");
  const [orderLists, setOrderLists] = useState<OrderListMeta[]>([]);
  const [savedOrders, setSavedOrders] = useState<SavedOrderItem[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [stockInHistory, setStockInHistory] = useState<StockInLog[]>([]);
  const [stockOutHistory, setStockOutHistory] = useState<StockOutLog[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'store' | 'fixed_assets' | 'saved_list' | 'waste'>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editedQties, setEditedQties] = useState<Record<string, string | number>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Users & PIN Authentication system
  const [users, setUsers] = useState<UserPin[]>([]);
  const [currentUser, setCurrentUser] = useState<UserPin | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', pin: '', role: 'staff' as 'admin' | 'staff' });

  // Delete Action Protection states
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    message: string;
    action: () => void;
  } | null>(null);
  const [deletePinInput, setDeletePinInput] = useState<string>("");
  const [deletePinError, setDeletePinError] = useState<string>("");

  // Dashboard date filter state
  const [dashboardDateRange, setDashboardDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(getLocalDateString(6)); // Default 1 week ago
  const [endDate, setEndDate] = useState<string>(getLocalDateString(0));     // Default today

  // Buffer state to prevent excessive Firestore writes while typing order quantities
  const [localOrderQties, setLocalOrderQties] = useState<Record<string, string>>({});
  const [focusedOrderField, setFocusedOrderField] = useState<string | null>(null);

  // Selection States
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);

  // Multiple Lists State
  const [activeListId, setActiveListId] = useState<string>("");
  const [showSaveToListModal, setShowSaveToListModal] = useState<boolean>(false);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState<boolean>(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState<boolean>(false);
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string>("");
  const [newCategoryInput, setNewCategoryInput] = useState<string>("");
  const [targetListId, setTargetListId] = useState<string>("");
  const [newListNameInput, setNewListNameInput] = useState<string>("");

  // Category Setting Input
  const [addCategoryModalInput, setAddCategoryModalInput] = useState<string>("");

  // Kitchen stock management states
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
  const [transferQtyInput, setTransferQtyInput] = useState<string>("");

  const [showConsumeModal, setShowConsumeModal] = useState<boolean>(false);
  const [consumeItem, setConsumeItem] = useState<InventoryItem | null>(null);
  const [consumeQtyInput, setConsumeQtyInput] = useState<string>("");
  const [consumeRemarksInput, setConsumeRemarksInput] = useState<string>("");

  // Rename Active List States
  const [isEditingListName, setIsEditingListName] = useState<boolean>(false);
  const [tempListNameInput, setTempListNameInput] = useState<string>("");

  // Custom Modals & Forms
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);

  const [formAddProduct, setFormAddProduct] = useState({
    name: '', storeQty: '0', kitchenQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', category: 'OTHERS', lastPurchaseDate: getLocalDateString(0)
  });

  const [formAddAsset, setFormAddAsset] = useState({
    name: '', quantity: '1', purchaseDate: '', cost: '', condition: 'Working' as "Working" | "Needs Repair" | "Broken", remarks: ''
  });

  // Waste logs & modals
  const [showStockOutModal, setShowStockOutModal] = useState<boolean>(false);

  const [formStockOut, setFormStockOut] = useState({
    item: '', quantity: '', purpose: 'Waste' as "Kitchen Use" | "Waste" | "Damage" | "Staff Use", remarks: ''
  });

  const toastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Keep inventory reference updated
  const inventoryRef = useRef<InventoryItem[]>(inventory);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  // Sync saved orders database changes with our local buffered state
  useEffect(() => {
    const updatedLocal: Record<string, string> = {};
    savedOrders.forEach(o => {
      if (focusedOrderField !== o.id) {
        updatedLocal[o.id] = o.orderQty || "";
      }
    });
    setLocalOrderQties(prev => ({ ...prev, ...updatedLocal }));
  }, [savedOrders, focusedOrderField]);

  // Static Listeners
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "cafe_users"), (snap) => {
      if (snap.empty) {
        setDoc(doc(db, "cafe_users", "admin_default"), {
          id: "admin_default",
          name: "ADMIN",
          pin: "1234",
          role: "admin"
        });
      } else {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserPin)));
      }
    }, (err) => console.error("Users load error", err));

    const unsubInventory = onSnapshot(collection(db, "godown_inventory"), (snap) => {
      setInventory(snap.docs.map(d => ({ 
        id: d.id, 
        kitchenQty: 0, 
        ...d.data() 
      } as InventoryItem)));
    }, (err) => console.error("Inventory load error", err));

    const unsubCategories = onSnapshot(collection(db, "categories"), (snap) => {
      if (!snap.empty) {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as CategoryItem)));
      } else {
        const defaults = ["DAIRY", "VEGETABLES", "DRY STOCK", "PACKAGING", "OTHERS"];
        defaults.forEach(async (cat) => {
          const catId = cat.toLowerCase().replace(/\s+/g, '_');
          await setDoc(doc(db, "categories", catId), { id: catId, name: cat, hidden: false });
        });
      }
    }, (err) => console.error("Categories load error", err));

    const unsubStockIns = onSnapshot(query(collection(db, "stock_in_history"), orderBy("date", "desc")), (snap) => {
      setStockInHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockInLog)));
    }, (err) => console.error("StockIns load error", err));

    const unsubStockOuts = onSnapshot(query(collection(db, "stock_out_history"), orderBy("date", "desc")), (snap) => {
      setStockOutHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOutLog)));
    }, (err) => console.error("Stockouts load error", err));

    const unsubSavedOrders = onSnapshot(collection(db, "saved_orders"), (snap) => {
      setSavedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedOrderItem)));
    }, (err) => console.error("Saved orders load error", err));

    const unsubFixedAssets = onSnapshot(collection(db, "fixed_assets"), (snap) => {
      setFixedAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as FixedAsset)));
    }, (err) => console.error("Fixed assets load error", err));

    return () => {
      unsubUsers();
      unsubInventory();
      unsubCategories();
      unsubStockIns();
      unsubStockOuts();
      unsubSavedOrders();
      unsubFixedAssets();
    };
  }, []);

  // Dynamic order lists synchronization and active selection logic
  useEffect(() => {
    const unsubOrderLists = onSnapshot(collection(db, "order_lists"), (snap) => {
      const lists = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderListMeta));
      setOrderLists(lists);
      if (lists.length > 0) {
        if (!activeListId || !lists.some(l => l.id === activeListId)) {
          setActiveListId(lists[0].id);
        }
      } else {
        setActiveListId("");
      }
    }, (err) => console.error("Order lists error", err));
    return () => unsubOrderLists();
  }, [activeListId]);

  // Handle default selection in Order List modal
  useEffect(() => {
    if (showSaveToListModal && !targetListId) {
      if (orderLists.length > 0) {
        setTargetListId(activeListId || orderLists[0].id);
      } else {
        setTargetListId("CREATE_NEW");
      }
    }
  }, [showSaveToListModal, orderLists, activeListId, targetListId]);

  // User Authentication Logic
  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const matched = users.find(u => u.pin === pinInput.trim());
    if (matched) {
      setCurrentUser(matched);
      setPinInput("");
      setAuthError("");
      toastMessage(`स्वागत है, ${matched.name}!`, 'success');
    } else {
      setAuthError("गलत पिन! कृपया पुनः प्रयास करें।");
      triggerHaptic(60);
    }
  };

  // Safe deletion validation wrapper
  const confirmDeleteWithPin = (message: string, actionToExecute: () => void) => {
    setDeleteConfirmation({
      message,
      action: actionToExecute
    });
    setDeletePinInput("");
    setDeletePinError("");
  };

  const handleDeleteVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = users.find(u => u.pin === deletePinInput.trim());
    if (matched) {
      if (deleteConfirmation) {
        deleteConfirmation.action();
      }
      setDeleteConfirmation(null);
      setDeletePinInput("");
      setDeletePinError("");
    } else {
      setDeletePinError("गलत सुरक्षा पिन! डिलीट करने की अनुमति नहीं है।");
      triggerHaptic(65);
    }
  };

  // Admin Pin Management methods
  const handleAddNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.pin) {
      toastMessage("सभी फ़ील्ड भरें!", "error");
      return;
    }
    try {
      const uId = `user_${Date.now()}`;
      await setDoc(doc(db, "cafe_users", uId), {
        id: uId,
        name: newUserForm.name.toUpperCase().trim(),
        pin: newUserForm.pin.trim(),
        role: newUserForm.role
      });
      toastMessage("नया यूजर/पिन सहेजा गया!");
      setNewUserForm({ name: '', pin: '', role: 'staff' });
    } catch {
      toastMessage("सहेजने में विफलता।", "error");
    }
  };

  const handleUpdateUserPin = async (userId: string, newPin: string) => {
    if (!newPin.trim()) return;
    try {
      await setDoc(doc(db, "cafe_users", userId), { pin: newPin.trim() }, { merge: true });
      toastMessage("पिन बदल दिया गया!");
    } catch {
      toastMessage("अपडेट करने में असमर्थ।", "error");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (userId === "admin_default") {
      toastMessage("डिफ़ॉल्ट एडमिन को हटाया नहीं जा सकता!", "error");
      return;
    }
    try {
      await deleteDoc(doc(db, "cafe_users", userId));
      toastMessage("यूज़र को हटाया गया।");
    } catch {
      toastMessage("हटाने में असमर्थ।", "error");
    }
  };

  // Calculations & Date-Filtered Analytics
  const getFilteredLedgerStats = useMemo(() => {
    const todayStr = getLocalDateString(0);
    const yesterdayStr = getLocalDateString(1);
    const weekAgoStr = getLocalDateString(6);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonth}`; 
    const yearPrefix = `${currentYear}`; 

    let filterFn = (dateStr: string) => dateStr === todayStr;

    if (dashboardDateRange === 'yesterday') {
      filterFn = (dateStr: string) => dateStr === yesterdayStr;
    } else if (dashboardDateRange === 'week') {
      filterFn = (dateStr: string) => dateStr >= weekAgoStr && dateStr <= todayStr;
    } else if (dashboardDateRange === 'month') {
      filterFn = (dateStr: string) => dateStr.startsWith(monthPrefix);
    } else if (dashboardDateRange === 'year') {
      filterFn = (dateStr: string) => dateStr.startsWith(yearPrefix);
    } else if (dashboardDateRange === 'custom') {
      filterFn = (dateStr: string) => dateStr >= startDate && dateStr <= endDate;
    }

    const matchedInward = stockInHistory.filter(log => filterFn(log.date));
    const totalInwardQty = matchedInward.reduce((sum, log) => sum + log.qty, 0);

    const matchedKitchen = stockOutHistory.filter(log => log.purpose === "Kitchen Use" && filterFn(log.date));
    const totalKitchenQty = matchedKitchen.reduce((sum, log) => sum + log.qty, 0);

    const matchedWasteLogs = stockOutHistory.filter(log => (log.purpose === "Waste" || log.purpose === "Damage" && filterFn(log.date)));
    const totalWasteLoss = matchedWasteLogs.reduce((sum, log) => sum + (log.financialLoss || 0), 0);

    return {
      totalInwardQty,
      totalKitchenQty,
      totalWasteLoss,
      matchedInward,
      matchedKitchen,
      matchedWasteLogs
    };
  }, [dashboardDateRange, startDate, endDate, stockInHistory, stockOutHistory]);

  // Static general stock metrics
  const stats = useMemo(() => {
    const totalVal = inventory.reduce((sum, item) => sum + (item.storeQty * item.purchasePrice), 0);
    const lowCount = inventory.filter(item => item.storeQty < item.minLimit).length;
    
    const totalFixedQty = fixedAssets.reduce((sum, asset) => sum + (asset.quantity || 0), 0);
    const totalFixedVal = fixedAssets.reduce((sum, asset) => sum + ((asset.quantity || 1) * (asset.cost || 0)), 0);

    return { totalVal, lowCount, totalFixedQty, totalFixedVal };
  }, [inventory, fixedAssets]);

  // Category-wise stock calculations
  const categoryStockValues = useMemo(() => {
    const values: Record<string, number> = {};
    inventory.forEach(item => {
      const cat = item.category || "OTHERS";
      const itemVal = (item.storeQty || 0) * (item.purchasePrice || 0);
      values[cat] = (values[cat] || 0) + itemVal;
    });
    return values;
  }, [inventory]);

  // Combined timeline flow
  const stockFlowTimeline = useMemo(() => {
    const list: { id: string; name: string; qty: number; unit: string; type: 'IN' | 'OUT'; date: string; remarks?: string }[] = [];
    
    getFilteredLedgerStats.matchedInward.forEach(log => {
      const item = inventory.find(i => i.id === log.itemId);
      list.push({
        id: log.id,
        name: log.itemName,
        qty: log.qty,
        unit: item?.unit || 'Units',
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
        type: 'OUT',
        date: log.date,
        remarks: log.remarks
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [getFilteredLedgerStats, inventory]);

  const visibleCategories = useMemo(() => {
    return categories.filter(c => !c.hidden);
  }, [categories]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const itemCatObj = categories.find(c => c.name === item.category);
      const isCategoryHidden = itemCatObj ? itemCatObj.hidden : false;

      if (selectedCategoryFilter === "All") {
        return matchesSearch && !isCategoryHidden;
      } else {
        return matchesSearch && item.category === selectedCategoryFilter;
      }
    });
  }, [inventory, searchQuery, selectedCategoryFilter, categories]);

  const filteredAssets = useMemo(() => {
    return fixedAssets.filter(asset => 
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fixedAssets, searchQuery]);

  const adjustQty = (id: string, diff: number) => {
    triggerHaptic();
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
    if (isNaN(updated) || updated < 0) {
      toastMessage("कृपया सही संख्या दर्ज करें।", "error");
      return;
    }
    try {
      const originalItem = inventory.find(i => i.id === id);
      await setDoc(doc(db, "godown_inventory", id), { storeQty: updated }, { merge: true });

      if (originalItem && updated > originalItem.storeQty) {
        const diff = updated - originalItem.storeQty;
        const logId = `in_${id}_${Date.now()}`;
        await setDoc(doc(db, "stock_in_history", logId), {
          id: logId,
          itemName: originalItem.name,
          itemId: id,
          qty: diff,
          date: getLocalDateString(0),
          remarks: "गोदाम स्टॉक बढ़ोतरी दर्ज"
        });
      }

      setEditedQties(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
      toastMessage("स्टॉक सेव हो गया!");
    } catch (e) {
      toastMessage("त्रुटि हुई।", "error");
    }
  };

  const handleToggleMultiSelect = (id: string) => {
    triggerHaptic(10);
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirmSaveToList = async () => {
    triggerHaptic();
    if (selectedItemIds.length === 0) return;

    let targetId = targetListId;

    try {
      if (targetId === "CREATE_NEW") {
        if (!newListNameInput.trim()) {
          toastMessage("नया लिस्ट नाम दर्ज करें!", "error");
          return;
        }
        targetId = `list_${Date.now()}`;
        await setDoc(doc(db, "order_lists", targetId), {
          id: targetId,
          name: newListNameInput.trim().toUpperCase(),
          date: new Date().toISOString().split('T')[0]
        });
        setNewListNameInput("");
      }

      if (!targetId) {
        targetId = `list_${Date.now()}`;
        await setDoc(doc(db, "order_lists", targetId), {
          id: targetId,
          name: "GENERAL ORDER LIST",
          date: new Date().toISOString().split('T')[0]
        });
      }

      const batch = writeBatch(db);
      for (const id of selectedItemIds) {
        const item = inventory.find(i => i.id === id);
        if (item) {
          const compoundId = `${id}_${targetId}`;
          const orderRef = doc(db, "saved_orders", compoundId);
          batch.set(orderRef, {
            id: compoundId,
            itemId: item.id,
            listId: targetId,
            name: item.name,
            storeQty: item.storeQty,
            unit: item.unit,
            orderQty: "" 
          }, { merge: true });
        }
      }
      await batch.commit();
      
      setSelectedItemIds([]);
      setIsMultiSelectMode(false);
      setShowSaveToListModal(false);
      setActiveListId(targetId);
      toastMessage("ऑर्डर लिस्ट में सामान सफलतापूर्वक जोड़े गए!");
      setActiveTab('saved_list'); 
    } catch {
      toastMessage("ऑर्डर लिस्ट सहेजने में विफल।", "error");
    }
  };

  const handleConfirmBulkCategory = async () => {
    triggerHaptic();
    if (selectedItemIds.length === 0) return;

    let targetCategory = bulkTargetCategory;

    if (targetCategory === "CREATE_NEW") {
      if (!newCategoryInput.trim()) {
        toastMessage("नया कैटेगरी नाम दर्ज करें!", "error");
        return;
      }
      targetCategory = newCategoryInput.trim().toUpperCase();
      const catId = targetCategory.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, "categories", catId), { id: catId, name: targetCategory, hidden: false });
      setNewCategoryInput("");
    }

    if (!targetCategory) {
      toastMessage("कृपया कैटेगरी चुनें!", "error");
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedItemIds.forEach(id => {
        const itemRef = doc(db, "godown_inventory", id);
        batch.set(itemRef, { category: targetCategory }, { merge: true });
      });
      await batch.commit();

      setSelectedItemIds([]);
      setIsMultiSelectMode(false);
      setShowBulkCategoryModal(false);
      toastMessage(`सफलतापूर्वक ${selectedItemIds.length} आइटम्स को ${targetCategory} में सेट किया गया!`);
    } catch {
      toastMessage("कैटेगरी अपडेट करने में विफलता।", "error");
    }
  };

  const handleAddNewCategoryInModal = async () => {
    if (!addCategoryModalInput.trim()) {
      toastMessage("कैटेगरी का नाम दर्ज करें!", "error");
      return;
    }
    try {
      const formattedName = addCategoryModalInput.trim().toUpperCase();
      const catId = formattedName.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, "categories", catId), { id: catId, name: formattedName, hidden: false });
      setAddCategoryModalInput("");
      toastMessage("कैटेगरी जोड़ी गई!");
    } catch {
      toastMessage("कैटेगरी जोड़ने में विफलता।", "error");
    }
  };

  const handleToggleCategoryHide = async (cat: CategoryItem) => {
    try {
      await setDoc(doc(db, "categories", cat.id), { hidden: !cat.hidden }, { merge: true });
      toastMessage(cat.hidden ? `${cat.name} अब चालू है!` : `${cat.name} अब छिपा दी गई है!`, "info");
    } catch {
      toastMessage("कैटेगरी अपडेट करने में विफलता।", "error");
    }
  };

  // PIN Protected Category Removal
  const handleRemoveCategory = (cat: CategoryItem) => {
    confirmDeleteWithPin(`क्या आप सच में "${cat.name}" कैटेगरी को हटाना चाहते हैं?`, async () => {
      try {
        await deleteDoc(doc(db, "categories", cat.id));
        toastMessage("कैटेगरी हटा दी गई।");
      } catch {
        toastMessage("कैटेगरी हटाने में विफलता।", "error");
      }
    });
  };

  const handleTransferToKitchenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItem || !transferQtyInput) return;

    const qty = parseFloat(transferQtyInput);
    if (isNaN(qty) || qty <= 0) {
      toastMessage("कृपया सही संख्या दर्ज करें!", "error");
      return;
    }

    if (transferItem.storeQty < qty) {
      toastMessage("गोदाम में पर्याप्त स्टॉक नहीं है!", "error");
      return;
    }

    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, "godown_inventory", transferItem.id);
      
      batch.set(itemRef, {
        storeQty: increment(-qty),
        kitchenQty: increment(qty)
      }, { merge: true });

      const logRef = doc(collection(db, "stock_out_history"));
      batch.set(logRef, {
        id: logRef.id,
        itemName: transferItem.name,
        itemId: transferItem.id,
        qty: qty,
        purpose: "Kitchen Use",
        date: getLocalDateString(0),
        remarks: "गोदाम से किचन भेजा गया",
        financialLoss: 0
      });

      await batch.commit();
      toastMessage(`${qty} ${transferItem.unit} किचन में भेजा गया!`);
      setShowTransferModal(false);
      setTransferItem(null);
      setTransferQtyInput("");
    } catch {
      toastMessage("ट्रांसफर में त्रुटि!", "error");
    }
  };

  const handleConsumeKitchenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consumeItem || !consumeQtyInput) return;

    const qty = parseFloat(consumeQtyInput);
    if (isNaN(qty) || qty <= 0) {
      toastMessage("कृपया सही संख्या दर्ज करें!", "error");
      return;
    }

    if (consumeItem.kitchenQty < qty) {
      toastMessage("किचन में पर्याप्त स्टॉक नहीं है!", "error");
      return;
    }

    try {
      const batch = writeBatch(db);
      const itemRef = doc(db, "godown_inventory", consumeItem.id);

      batch.set(itemRef, {
        kitchenQty: increment(-qty)
      }, { merge: true });

      const logRef = doc(collection(db, "stock_out_history"));
      batch.set(logRef, {
        id: logRef.id,
        itemName: consumeItem.name,
        itemId: consumeItem.id,
        qty: qty,
        purpose: "Kitchen Use",
        date: getLocalDateString(0),
        remarks: consumeRemarksInput.trim() || "किचन में उपयोग किया गया",
        financialLoss: 0
      });

      await batch.commit();
      toastMessage(`${qty} ${consumeItem.unit} उपयोग दर्ज किया गया!`);
      setShowConsumeModal(false);
      setConsumeItem(null);
      setConsumeQtyInput("");
      setConsumeRemarksInput("");
    } catch {
      toastMessage("दर्ज करने में त्रुटि!", "error");
    }
  };

  const handleUpdateOrderQty = async (compoundId: string, qty: string) => {
    try {
      await setDoc(doc(db, "saved_orders", compoundId), { orderQty: qty }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateListName = async (newName: string) => {
    if (!newName.trim() || !activeListId) return;
    try {
      await setDoc(doc(db, "order_lists", activeListId), { name: newName.trim().toUpperCase() }, { merge: true });
      toastMessage("ऑर्डर लिस्ट का नाम बदला गया!");
    } catch {
      toastMessage("नाम बदलने में त्रुटि हुई।", "error");
    }
  };

  // PIN Protected single saved item deletion
  const handleRemoveFromSavedList = (compoundId: string, name: string) => {
    triggerHaptic();
    confirmDeleteWithPin(`क्या आप इस लिस्ट आइटम "${name}" को हटाना चाहते हैं?`, async () => {
      try {
        await deleteDoc(doc(db, "saved_orders", compoundId));
        toastMessage("लिस्ट से सामान हटाया गया।");
      } catch {
        toastMessage("हटाने में त्रुटि हुई।", "error");
      }
    });
  };

  // PIN Protected complete list deletion
  const handleDeleteActiveList = () => {
    triggerHaptic();
    if (!activeListId) return;
    confirmDeleteWithPin("क्या आप इस पूरी लिस्ट को हमेशा के लिए डिलीट करना चाहते हैं?", async () => {
      try {
        const batch = writeBatch(db);
        const itemsToDelete = savedOrders.filter(o => o.listId === activeListId);
        itemsToDelete.forEach(item => {
          batch.delete(doc(db, "saved_orders", item.id));
        });
        batch.delete(doc(db, "order_lists", activeListId));
        await batch.commit();

        setActiveListId("");
        toastMessage("लिस्ट हमेशा के लिए डिलीट कर दी गई!");
      } catch {
        toastMessage("डिलीट करने में त्रुटि हुई।", "error");
      }
    });
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAddProduct.name) {
      toastMessage("सामान का नाम आवश्यक है!", "error");
      return;
    }
    try {
      const customId = `item_${Date.now()}`;
      const payload: InventoryItem = {
        id: customId,
        name: formAddProduct.name.toUpperCase().trim(),
        storeQty: parseFloat(formAddProduct.storeQty) || 0,
        kitchenQty: parseFloat(formAddProduct.kitchenQty) || 0,
        unit: formAddProduct.unit,
        purchasePrice: parseFloat(formAddProduct.purchasePrice) || 0,
        minLimit: parseFloat(formAddProduct.minLimit) || 10,
        supplier: "Walk-In",
        lastPurchaseDate: formAddProduct.lastPurchaseDate || getLocalDateString(0),
        category: formAddProduct.category.toUpperCase()
      };
      await setDoc(doc(db, "godown_inventory", customId), payload);

      if (payload.storeQty > 0) {
        await setDoc(doc(db, "stock_in_history", `in_${customId}`), {
          id: `in_${customId}`,
          itemName: payload.name,
          itemId: payload.id,
          qty: payload.storeQty,
          date: payload.lastPurchaseDate,
          remarks: "नया उत्पाद (प्रारंभिक आवक)"
        });
      }

      toastMessage("नया सामान सहेजा गया!");
      setShowAddProductModal(false);
      setFormAddProduct({ name: '', storeQty: '0', kitchenQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', category: 'OTHERS', lastPurchaseDate: getLocalDateString(0) });
    } catch {
      toastMessage("सामान जोड़ने में विफलता।", "error");
    }
  };

  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAddAsset.name) {
      toastMessage("एसेट का नाम आवश्यक है!", "error");
      return;
    }
    try {
      const customId = `asset_${Date.now()}`;
      const payload: FixedAsset = {
        id: customId,
        name: formAddAsset.name.toUpperCase().trim(),
        quantity: parseFloat(formAddAsset.quantity) || 1,
        purchaseDate: formAddAsset.purchaseDate || new Date().toISOString().split('T')[0],
        cost: parseFloat(formAddAsset.cost) || 0,
        condition: formAddAsset.condition,
        remarks: formAddAsset.remarks || ""
      };
      await setDoc(doc(db, "fixed_assets", customId), payload);
      toastMessage("नया एसेट दर्ज हो गया!");
      setShowAddAssetModal(false);
      setFormAddAsset({ name: '', quantity: '1', purchaseDate: '', cost: '', condition: 'Working', remarks: '' });
    } catch {
      toastMessage("एसेट जोड़ने में त्रुटि।", "error");
    }
  };

  // PIN Protected Asset Deletion
  const handleDeleteAsset = (id: string, name: string) => {
    triggerHaptic();
    confirmDeleteWithPin(`क्या आप इस एसेट "${name}" को डिलीट करना चाहते हैं?`, async () => {
      try {
        await deleteDoc(doc(db, "fixed_assets", id));
        toastMessage("एसेट सफलतापूर्वक हटा दिया गया!");
      } catch {
        toastMessage("हटाने में विफलता।", "error");
      }
    });
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await setDoc(doc(db, "godown_inventory", editingProduct.id), editingProduct, { merge: true });
      toastMessage("सामान सफलतापूर्वक संशोधित हुआ!");
      setEditingProduct(null);
    } catch {
      toastMessage("अपडेट करने में विफलता।", "error");
    }
  };

  // PIN Protected Inventory Product Deletion
  const handleDeleteProduct = (id: string, name: string) => {
    triggerHaptic();
    confirmDeleteWithPin(`क्या आप सच में इस आइटम "${name}" को हमेशा के लिए डिलीट करना चाहते हैं? इससे सभी संबंधित ऑर्डर्स भी डिलीट हो जायेंगे।`, async () => {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "godown_inventory", id));
        const relatedOrders = savedOrders.filter(o => o.itemId === id);
        relatedOrders.forEach(order => {
          batch.delete(doc(db, "saved_orders", order.id));
        });
        await batch.commit();
        toastMessage("आइटम सफलतापूर्वक हटा दिया गया!");
        setEditingProduct(null);
      } catch {
        toastMessage("हटाने में विफलता।", "error");
      }
    });
  };

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStockOut.item || !formStockOut.quantity) {
      toastMessage("कृपया सभी फ़ील्ड भरें!", "error");
      return;
    }

    const qtyNum = parseFloat(formStockOut.quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      toastMessage("कृपया सही मात्रा दर्ज करें!", "error");
      return;
    }

    const item = inventory.find(i => i.id === formStockOut.item);
    if (!item) return;

    if (item.storeQty < qtyNum) {
      toastMessage("स्टॉक में पर्याप्त मात्रा नहीं है!", "error");
      return;
    }

    try {
      await setDoc(doc(db, "godown_inventory", item.id), { storeQty: increment(-qtyNum) }, { merge: true });
      await addDoc(collection(db, "stock_out_history"), {
        itemName: item.name,
        itemId: item.id,
        qty: qtyNum,
        purpose: formStockOut.purpose,
        date: getLocalDateString(0),
        remarks: formStockOut.remarks || "N/A",
        financialLoss: qtyNum * item.purchasePrice
      });
      toastMessage("नुकसान सफलतापूर्वक दर्ज हुआ।");
      setShowStockOutModal(false);
      setFormStockOut({ item: '', quantity: '', purpose: 'Waste', remarks: '' });
    } catch {
      toastMessage("दर्ज करने में विफल।", "error");
    }
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

  const activeListName = useMemo(() => {
    const list = orderLists.find(l => l.id === activeListId);
    return list ? list.name : "BUM BUM CAFE ORDER SHEET";
  }, [orderLists, activeListId]);

  // Lockscreen Screen overlay if NOT Authenticated
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <div className="w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 space-y-6 text-center">
          <div className="space-y-2">
            <span className="text-5xl block animate-pulse">🔒</span>
            <h2 className="text-xl font-black text-orange-600 uppercase tracking-widest">BUM BUM CAFE</h2>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">आगे बढ़ने के लिए अपना पिन दर्ज करें</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input
              type="password"
              maxLength={6}
              placeholder="ENTER PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[0.5em] font-black p-4 rounded-2xl border bg-neutral-50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            {authError && <p className="text-xs text-red-500 font-bold">{authError}</p>}
            <button
              type="submit"
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow transition-all active:scale-98"
            >
              सत्यापित करें (Unlock) ➔
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0E0E0E]' : 'bg-[#FAFAFA]'} pb-24 font-sans relative ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
      
      {/* HUD Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-full bg-orange-500 text-white shadow-lg flex items-center gap-2 text-xs font-bold uppercase text-center">
            <Sparkles size={14} /> <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className={`sticky top-0 z-40 h-16 border-b px-4 backdrop-blur-md ${isDarkMode ? 'bg-black/80 border-neutral-800' : 'bg-white/80 border-neutral-100'} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">☕</span>
          <div>
            <h1 className="text-xs font-black text-orange-600 tracking-wider">BUM BUM CAFE</h1>
            <p className="text-[9px] text-neutral-400 font-bold uppercase">Welcome, {currentUser.name}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          {currentUser.role === 'admin' && (
            <button 
              onClick={() => setShowAdminPanel(true)} 
              className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs flex items-center gap-1 text-orange-500"
              title="Manage Users & PINs"
            >
              <Settings size={14} />
              <span className="hidden xs:inline text-[9px] font-black uppercase">पिन प्रबंधन</span>
            </button>
          )}

          <button 
            onClick={() => { setCurrentUser(null); toastMessage("सफलतापूर्वक लॉगआउट!"); }} 
            className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-xl text-xs"
            title="Lock App"
          >
            <Lock size={13} />
          </button>

          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        
        {/* ==================== TAB 1: HOME / DASHBOARD ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">

            {/* STICKY DATE RANGE SELECTOR BAR */}
            <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-black uppercase text-neutral-400 shrink-0">चुनें:</span>
                <div className="flex gap-1 flex-1 justify-end flex-wrap">
                  {([
                    { range: 'today', label: 'आज' },
                    { range: 'yesterday', label: 'कल' },
                    { range: 'week', label: '1 हफ़्ता' },
                    { range: 'month', label: 'महीना' },
                    { range: 'year', label: 'साल' },
                    { range: 'custom', label: 'कैलेंडर 📅' }
                  ] as const).map((opt) => (
                    <button
                      key={opt.range}
                      onClick={() => { triggerHaptic(15); setDashboardDateRange(opt.range); }}
                      className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 transition-all ${
                        dashboardDateRange === opt.range 
                          ? 'bg-orange-500 text-white shadow' 
                          : isDarkMode ? 'bg-neutral-900 text-neutral-400' : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CALENDAR DATE RANGE SELECTOR (When Custom Selected) */}
              {dashboardDateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">शुरुआती तारीख (From)</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full p-2 rounded-xl border dark:bg-neutral-800 dark:border-neutral-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">अंतिम तारीख (To)</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full p-2 rounded-xl border dark:bg-neutral-800 dark:border-neutral-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dynamic Date-Filtered Ledger Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">सामान आया (IN)</p>
                <p className="text-xs font-black text-green-500 mt-1">{getFilteredLedgerStats.totalInwardQty} Units</p>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">किचन गया (OUT)</p>
                <p className="text-xs font-black text-orange-500 mt-1">{getFilteredLedgerStats.totalKitchenQty} Units</p>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">नुकसान (Loss)</p>
                <p className="text-xs font-black text-red-500 mt-1">₹{getFilteredLedgerStats.totalWasteLoss.toLocaleString()}</p>
              </div>
            </div>

            {/* General Database Static metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">Total Godown stock value</p>
                <p className="text-xs font-black text-neutral-700 dark:text-neutral-200 mt-1">₹{stats.totalVal.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">Fixed Assets Value</p>
                <p className="text-xs font-black text-blue-500 mt-1">₹{stats.totalFixedVal.toLocaleString()}</p>
              </div>
            </div>

            {/* CATEGORY-WISE STOCK VALUE DISPLAY */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider px-1">Category-wise Stock Value</h3>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => {
                  const value = categoryStockValues[cat.name] || 0;
                  return (
                    <div 
                      key={cat.id} 
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                        isDarkMode ? 'bg-[#181818]/50 border-neutral-800' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-neutral-400 uppercase text-[9px]">{cat.name}</p>
                        <p className="font-black mt-1 text-[#FF6B00]">₹{value.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* UNIFIED STOCK FLOW TIMELINE LEDGER */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black uppercase text-neutral-400 tracking-wider">Inward & Outward Flow Timeline</h3>
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 font-bold uppercase">
                  {stockFlowTimeline.length} Entries Found
                </span>
              </div>

              <div className="space-y-1.5 max-h-[30vh] overflow-y-auto pr-1">
                {stockFlowTimeline.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                      isDarkMode ? 'bg-[#181818]/65 border-neutral-800' : 'bg-white border-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.type === 'IN' ? 'bg-green-500' : 'bg-orange-500'}`} />
                      <div>
                        <p className={item.type === 'IN' ? 'text-green-500' : 'text-orange-500'}>
                          {item.name}
                        </p>
                        <p className="text-[8px] text-neutral-400 font-bold uppercase mt-0.5">
                          {item.type === 'IN' ? '📥 गोदाम में आवक' : '🍳 किचन स्थानांतरण'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black">
                        {item.type === 'IN' ? '+' : '-'}{item.qty} {item.unit}
                      </p>
                      <p className="text-[7px] text-neutral-400 font-bold">{item.date}</p>
                    </div>
                  </div>
                ))}

                {stockFlowTimeline.length === 0 && (
                  <p className="text-center py-8 text-xs text-neutral-400 uppercase font-black">इस तिथि सीमा के लिए कोई लेन-देन नहीं मिला।</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 2: GODOWN STOCK ==================== */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            
            {/* STICKY SEARCH & CATEGORY SELECTOR */}
            <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
              
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="आइटम खोजें..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-950'}`}
                  />
                </div>
                <button 
                  onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedItemIds([]); }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                    isMultiSelectMode ? 'bg-orange-500 text-white border-orange-500' : isDarkMode ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
                  }`}
                >
                  {isMultiSelectMode ? "Stop Select" : "Multi Select"}
                </button>
              </div>

              {/* CATEGORIES SELECTION GRID */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[8px] font-black uppercase text-neutral-400 tracking-wider">क्लिक कर फ़िल्टर करें:</span>
                  <button 
                    onClick={() => setShowManageCategoriesModal(true)}
                    className="text-[8px] text-orange-500 hover:underline uppercase font-black"
                  >
                    🛠️ Manage Categories
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-1.5 w-full">
                  <button
                    onClick={() => setSelectedCategoryFilter("All")}
                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                      selectedCategoryFilter === "All"
                        ? "bg-orange-500 border-orange-500 text-white"
                        : isDarkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-600"
                    }`}
                  >
                    All Items
                  </button>
                  {visibleCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryFilter(cat.name)}
                      className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all ${
                        selectedCategoryFilter === cat.name
                          ? "bg-orange-500 border-orange-500 text-white"
                          : isDarkMode ? "bg-neutral-900 border-neutral-800 text-neutral-400" : "bg-neutral-100 border-neutral-200 text-neutral-600"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setFormAddProduct({ name: '', storeQty: '0', kitchenQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', category: 'OTHERS', lastPurchaseDate: getLocalDateString(0) });
                setShowAddProductModal(true);
              }}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 shadow"
            >
              <Plus size={14} /> Add New Product (सामान जोड़ें)
            </button>

            <div className="flex justify-between items-center text-[10px] font-black uppercase text-neutral-400 px-1 border-b border-neutral-100 dark:border-neutral-800/65 pb-2">
              <span>STOCK ITEMS LIST</span>
              <span>Showing {filteredInventory.length} of {inventory.length} total</span>
            </div>

            {/* FLOATING ACTION BOTTOM BANNER FOR MULTI SELECT */}
            {isMultiSelectMode && selectedItemIds.length > 0 && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4">
                <div className="bg-orange-600 text-white rounded-2xl p-4 shadow-2xl space-y-3 border border-orange-400/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black">{selectedItemIds.length} Items Selected</p>
                      <p className="text-[8px] text-orange-100 font-bold uppercase tracking-wider">क्या कार्यवाही करना चाहते हैं?</p>
                    </div>
                    <button 
                      onClick={() => { setSelectedItemIds([]); setIsMultiSelectMode(false); }}
                      className="p-1 bg-white/20 hover:bg-white/30 text-white rounded-full"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        triggerHaptic();
                        setShowSaveToListModal(true);
                      }}
                      className="py-2.5 bg-white text-orange-600 font-black text-[10px] uppercase rounded-xl shadow-md active:scale-95 transition-all text-center"
                    >
                      Supplier Order ➔
                    </button>
                    <button 
                      onClick={() => {
                        triggerHaptic();
                        setBulkTargetCategory("");
                        setShowBulkCategoryModal(true);
                      }}
                      className="py-2.5 bg-orange-950 border border-orange-450 hover:bg-orange-900 text-white font-black text-[10px] uppercase rounded-xl shadow-md active:scale-95 transition-all text-center flex items-center justify-center gap-1"
                    >
                      <Tag size={12} /> Set Category ➔
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STOCK ITEM FLAT LIST */}
            <div className="space-y-2.5">
              {filteredInventory.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                const displayQty = editedQties[item.id] !== undefined ? editedQties[item.id] : item.storeQty;
                const isDirty = editedQties[item.id] !== undefined && parseFloat(editedQties[item.id] as string) !== item.storeQty;

                return (
                  <div 
                    key={item.id} 
                    onClick={() => { if (isMultiSelectMode) handleToggleMultiSelect(item.id); }}
                    className={`p-3.5 rounded-2xl border transition-all relative ${
                      isMultiSelectMode ? 'cursor-pointer' : ''
                    } ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'} ${
                      isSelected ? 'ring-2 ring-orange-500 bg-orange-500/[0.01]' : ''
                    }`}
                  >
                    {isMultiSelectMode && (
                      <div className="absolute top-3.5 right-3.5 w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center z-10">
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-orange-600">{item.name}</p>
                          {item.category && (
                            <span className="px-1.5 py-0.5 text-[8px] bg-neutral-100 dark:bg-neutral-800 text-neutral-400 font-bold rounded-md uppercase">
                              {item.category}
                            </span>
                          )}
                          {!isMultiSelectMode && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingProduct(item); }}
                              className="text-neutral-400 hover:text-orange-500"
                            >
                              <Edit size={12} />
                            </button>
                          )}
                        </div>
                        
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] font-bold uppercase text-neutral-400">
                          <span>📦 Godown: <span className="text-neutral-800 dark:text-neutral-200">{item.storeQty} {item.unit}</span></span>
                          <span>🍳 Kitchen: <span className="text-orange-500">{item.kitchenQty || 0} {item.unit}</span></span>
                        </div>
                        {item.lastPurchaseDate && (
                          <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-neutral-400 uppercase tracking-wider">
                            <span>📅 Last Purchase: {item.lastPurchaseDate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-2">
                      
                      <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); adjustQty(item.id, -1); }} className="p-1 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-lg">
                          <MinusCircle size={14} />
                        </button>
                        <input 
                          type="number" 
                          value={displayQty}
                          onClick={e => e.stopPropagation()}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditedQties(prev => ({ ...prev, [item.id]: val }));
                          }}
                          className="w-12 text-center text-xs font-bold border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 rounded p-1"
                        />
                        <button onClick={(e) => { e.stopPropagation(); adjustQty(item.id, 1); }} className="p-1 bg-green-100 dark:bg-green-500/10 text-green-500 rounded-lg">
                          <PlusCircle size={14} />
                        </button>

                        {isDirty && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); saveQty(item.id); }}
                            className="px-2 py-1 bg-green-600 text-white text-[10px] font-black rounded-lg"
                          >
                            💾 सेव
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setTransferItem(item);
                            setTransferQtyInput("");
                            setShowTransferModal(true);
                          }}
                          className="px-2 py-1 bg-orange-100 hover:bg-orange-200 dark:bg-orange-500/10 dark:text-orange-400 text-orange-600 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all"
                        >
                          🍳 Send To Kitchen
                        </button>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConsumeItem(item);
                            setConsumeQtyInput("");
                            setConsumeRemarksInput("");
                            setShowConsumeModal(true);
                          }}
                          className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 text-neutral-600 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 transition-all"
                        >
                          🍽️ Use
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: FIXED ASSETS ==================== */}
        {activeTab === 'fixed_assets' && (
          <div className="space-y-4">
            
            <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-black text-orange-600 uppercase">Fixed Assets (स्थिर संपत्तियां)</h2>
                  <p className="text-[10px] text-neutral-400">उपकरण, फ्रिज, ओवन आदि</p>
                </div>
                <button 
                  onClick={() => setShowAddAssetModal(true)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow"
                >
                  <Plus size={14} /> Add Asset
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input 
                  type="text" 
                  placeholder="एसेट्स खोजें..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-950'}`}
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredAssets.map(asset => (
                <div key={asset.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{asset.name}</p>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">मात्रा: {asset.quantity} Units</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                        asset.condition === 'Working' ? 'bg-green-100 text-green-600' :
                        asset.condition === 'Needs Repair' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {asset.condition}
                      </span>
                      <button 
                        onClick={() => handleDeleteAsset(asset.id, asset.name)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-500/10 text-neutral-400 hover:text-red-500 rounded-lg transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-3 pt-2.5 border-t border-dashed border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-400 font-bold uppercase">
                    <div>
                      {asset.purchaseDate && <p>तारीख: {asset.purchaseDate}</p>}
                      {asset.cost ? <p className="mt-0.5">लागत: ₹{asset.cost.toLocaleString()}</p> : null}
                    </div>
                    {asset.remarks && (
                      <p className="text-xs text-neutral-500 font-normal italic lowercase max-w-[60%] truncate">
                        “{asset.remarks}”
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {filteredAssets.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs text-neutral-400 uppercase font-black">कोई एसेट रिकॉर्ड नहीं मिला।</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 4: ORDER TO SUPPLIER ==================== */}
        {activeTab === 'saved_list' && (
          <div className="space-y-4">
            
            <div className={`sticky top-[64px] z-30 py-2.5 space-y-2.5 backdrop-blur-md ${isDarkMode ? 'bg-[#0E0E0E]/90' : 'bg-[#FAFAFA]/90'} border-b border-dashed ${isDarkMode ? 'border-neutral-800' : 'border-neutral-100'}`}>
              <div className="bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-neutral-400 shrink-0">Choose List:</span>
                  <select 
                    value={activeListId}
                    onChange={e => {
                      triggerHaptic();
                      setActiveListId(e.target.value);
                    }}
                    className={`flex-1 p-2 text-xs font-bold rounded-xl border ${
                      isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <option value="">-- No Active List --</option>
                    {orderLists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                  {activeListId && (
                    <button 
                      onClick={handleDeleteActiveList}
                      className="p-2 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-xl shrink-0"
                      title="पूरी लिस्ट डिलीट करें"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {activeListId && (
                  <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-2">
                    {isEditingListName ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input 
                          type="text" 
                          value={tempListNameInput} 
                          onChange={e => setTempListNameInput(e.target.value)}
                          className={`flex-1 p-2 rounded-xl border text-xs font-bold ${isDarkMode ? 'bg-neutral-800 border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'}`}
                          required
                        />
                        <button 
                          onClick={() => {
                            handleUpdateListName(tempListNameInput);
                            setIsEditingListName(false);
                          }}
                          className="px-3.5 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xs font-black text-orange-600 uppercase tracking-widest leading-relaxed">
                            {activeListName}
                          </h2>
                          <button 
                            onClick={() => {
                              setTempListNameInput(activeListName);
                              setIsEditingListName(true);
                            }}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-orange-500 transition-all"
                            title="नाम बदलें"
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                        <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wide">
                          {savedOrders.filter(o => o.listId === activeListId).length} Items
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
              {savedOrders
                .filter(item => item.listId === activeListId)
                .map(item => {
                  const localValue = localOrderQties[item.id] !== undefined ? localOrderQties[item.id] : (item.orderQty || "");
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3.5 rounded-2xl border flex justify-between items-center text-xs ${
                        isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div className="flex-1 pr-3">
                        <p className="font-bold text-sm text-[#FF6B00]">{item.name}</p>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase">
                          Current Stock: {item.storeQty} {item.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder="Qty भरें"
                          value={localValue}
                          onFocus={() => setFocusedOrderField(item.id)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalOrderQties(prev => ({ ...prev, [item.id]: val }));
                          }}
                          onBlur={() => {
                            setFocusedOrderField(null);
                            handleUpdateOrderQty(item.id, localValue);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-24 p-2 rounded-xl border text-center font-bold text-xs bg-transparent text-neutral-900 dark:text-white"
                        />
                        <span className="text-[10px] font-bold text-neutral-400 w-8">{item.unit}</span>
                        <button 
                          onClick={() => handleRemoveFromSavedList(item.id, item.name)}
                          className="text-neutral-400 hover:text-red-500 hover:scale-110 transition-transform"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}

              {savedOrders.filter(o => o.listId === activeListId).length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <span className="text-2xl block">🛒</span>
                  <p className="text-xs text-neutral-400 font-bold uppercase">लिस्ट खाली है। Godown में जाकर सामान सेलेक्ट करें!</p>
                </div>
              )}
            </div>

            {savedOrders.filter(o => o.listId === activeListId).length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button 
                  onClick={handlePrintSavedList}
                  className="py-3.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow"
                >
                  <Printer size={15} />
                  <span>Print Sheet</span>
                </button>
                <button 
                  onClick={handleWhatsAppShare}
                  className="py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow"
                >
                  <MessageCircle size={15} />
                  <span>Send WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 5: WASTAGE DETAILS ==================== */}
        {activeTab === 'waste' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-orange-600 uppercase">Wastage & Consumption Logs</h2>
                <p className="text-[10px] text-neutral-400">कचरा, खराब और किचन उपयोग विवरण</p>
              </div>
              <button 
                onClick={() => setShowStockOutModal(true)} 
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow"
              >
                <Plus size={14} /> Log Wastage
              </button>
            </div>

            <div className="space-y-2.5">
              {stockOutHistory.map(log => (
                <div key={log.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{log.itemName}</p>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">{log.date}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                      log.purpose === 'Kitchen Use' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10' : 'bg-red-100 text-red-500 dark:bg-red-500/10'
                    }`}>
                      {log.purpose}
                    </span>
                  </div>
                  
                  <p className="text-xs text-neutral-500 mt-2 italic">“{log.remarks}”</p>
                  
                  <div className="flex justify-between mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 uppercase">
                    <span>मात्रा: {log.qty} Units</span>
                    {log.financialLoss ? (
                      <span className="text-red-500">वित्तीय नुकसान: ₹{log.financialLoss}</span>
                    ) : null}
                  </div>
                </div>
              ))}

              {stockOutHistory.length === 0 && (
                <p className="text-center py-10 text-xs text-neutral-400 uppercase font-black">कोई रिकॉर्ड नहीं मिला।</p>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ==================== SCREEN MODALS ==================== */}
      <AnimatePresence>

        {/* 0. SECURITY DELETE PIN VERIFICATION MODAL */}
        {deleteConfirmation && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleDeleteVerificationSubmit}
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2.5rem] p-6 space-y-5 border text-center ${
                isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="space-y-1">
                <span className="text-4xl block">🛡️</span>
                <h3 className="text-sm font-black text-red-500 uppercase tracking-wider">सुरक्षा प्रमाणीकरण आवश्यक</h3>
                <p className="text-xs text-neutral-400">{deleteConfirmation.message}</p>
              </div>

              <div className="space-y-3 text-xs text-left">
                <label className="text-[9px] text-neutral-400 font-black uppercase">प्रशासक या यूज़र पिन दर्ज करें (Enter PIN)</label>
                <input 
                  type="password"
                  maxLength={6}
                  placeholder="••••"
                  value={deletePinInput}
                  onChange={e => setDeletePinInput(e.target.value)}
                  className="w-full text-center text-xl tracking-[1em] p-2.5 rounded-xl border font-black dark:bg-neutral-800 focus:ring-2 focus:ring-red-500"
                  required
                />
                {deletePinError && <p className="text-[10px] text-red-500 font-bold text-center">{deletePinError}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl text-xs font-black uppercase"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase shadow-lg"
                >
                  सत्यापित करें ➔
                </button>
              </div>
            </motion.form>
          </div>
        )}

        {/* A. ADMIN PIN / USER SETTINGS PANEL MODAL */}
        {showAdminPanel && currentUser.role === 'admin' && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b pb-2.5">
                <div>
                  <h3 className="text-xs font-black uppercase text-orange-500">User & PIN settings</h3>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">नया यूजर जोड़ें या पिन बदलें</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowAdminPanel(false)} 
                  className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Add New User form */}
              <form onSubmit={handleAddNewUserSubmit} className="space-y-2.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800 text-xs">
                <p className="font-black text-[9px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                  <UserPlus size={10} /> Add New User / PIN
                </p>
                <div className="space-y-1.5">
                  <input 
                    type="text" 
                    placeholder="NAME (जैसे: SUNIL)"
                    value={newUserForm.name}
                    onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                    className="w-full p-2 rounded-xl border uppercase font-bold dark:bg-neutral-800"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="PIN (अंक/शब्द)"
                      maxLength={6}
                      value={newUserForm.pin}
                      onChange={e => setNewUserForm({ ...newUserForm, pin: e.target.value })}
                      className="w-full p-2 rounded-xl border font-bold dark:bg-neutral-800 text-center"
                      required
                    />
                    <select 
                      value={newUserForm.role}
                      onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value as any })}
                      className="w-full p-2 rounded-xl border font-bold dark:bg-neutral-800"
                    >
                      <option value="staff">Staff (स्टाफ)</option>
                      <option value="admin">Admin (एडमिन)</option>
                    </select>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-2 bg-green-600 text-white font-black text-[10px] uppercase rounded-xl tracking-wider"
                >
                  Add User ➔
                </button>
              </form>

              {/* Active Users List */}
              <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                <p className="font-black text-[9px] text-neutral-400 uppercase tracking-wider px-1">सक्रिय यूजर्स सूची</p>
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs font-bold bg-neutral-50/50 dark:bg-neutral-900/40">
                    <div>
                      <span className="uppercase text-[#FF6B00]">{u.name}</span>
                      <span className="ml-1 px-1.5 py-0.5 text-[7px] bg-neutral-200 dark:bg-neutral-800 text-neutral-500 rounded font-black uppercase">
                        {u.role}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        defaultValue={u.pin}
                        onBlur={(e) => handleUpdateUserPin(u.id, e.target.value)}
                        placeholder="PIN"
                        className="w-14 p-1 rounded border text-center dark:bg-neutral-800"
                      />
                      <button 
                        type="button"
                        onClick={() => handleRemoveUser(u.id)}
                        className="p-1 hover:bg-red-100 text-red-500 rounded"
                        title="हटाएं"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* 1. MANAGE CATEGORIES MODAL */}
        {showManageCategoriesModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b pb-2.5">
                <div>
                  <h3 className="text-xs font-black uppercase text-orange-500">Manage Categories</h3>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">कैटेगरी जोड़ें, हटाएं या छिपाएं</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowManageCategoriesModal(false)} 
                  className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex gap-1.5 items-center">
                <input 
                  type="text" 
                  placeholder="जैसे: DESSERTS"
                  value={addCategoryModalInput}
                  onChange={e => setAddCategoryModalInput(e.target.value)}
                  className={`flex-1 p-2 rounded-xl text-xs font-bold border uppercase ${
                    isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                />
                <button 
                  onClick={handleAddNewCategoryInModal}
                  className="px-3 py-2 bg-green-600 text-white text-xs font-black uppercase rounded-xl shadow shrink-0"
                >
                  Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-[35vh] overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div 
                    key={cat.id} 
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                      cat.hidden 
                        ? 'opacity-40 border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/20' 
                        : isDarkMode ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50 border-neutral-100'
                    }`}
                  >
                    <span className="uppercase">{cat.name} {cat.hidden && "(Hidden)"}</span>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleToggleCategoryHide(cat)}
                        className={`p-1.5 rounded-lg transition-all ${
                          cat.hidden 
                            ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500' 
                            : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                        }`}
                        title={cat.hidden ? "Unhide Category" : "Hide Category"}
                      >
                        {cat.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button 
                        onClick={() => handleRemoveCategory(cat)}
                        className="p-1.5 bg-red-100 hover:bg-red-200 text-red-500 rounded-lg transition-all"
                        title="Delete Category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* 2. SEND TO KITCHEN MODAL */}
        {showTransferModal && transferItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleTransferToKitchenSubmit} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}
            >
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <h3 className="text-xs font-black uppercase text-orange-500">Send To Kitchen</h3>
                  <p className="text-[9px] text-neutral-400 font-bold mt-0.5">{transferItem.name}</p>
                </div>
                <button type="button" onClick={() => setShowTransferModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="p-3 bg-neutral-100 dark:bg-neutral-950/60 rounded-xl text-xs space-y-1 text-neutral-400 font-bold">
                <p>गोदाम स्टॉक: <span className="text-neutral-800 dark:text-neutral-200">{transferItem.storeQty} {transferItem.unit}</span></p>
                <p>किचन स्टॉक: <span className="text-orange-500">{transferItem.kitchenQty || 0} {transferItem.unit}</span></p>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[9px] text-neutral-400 font-black uppercase">Quantity to Send</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    placeholder="मात्रा दर्ज करें"
                    value={transferQtyInput}
                    onChange={e => setTransferQtyInput(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl border dark:bg-neutral-800 text-center text-sm font-black text-orange-600"
                    required
                  />
                  <span className="font-bold text-neutral-400 w-12">{transferItem.unit}</span>
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black text-xs uppercase shadow">
                Confirm Transfer ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* 3. CONSUME KITCHEN STOCK MODAL */}
        {showConsumeModal && consumeItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleConsumeKitchenSubmit} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}
            >
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <h3 className="text-xs font-black uppercase text-neutral-400">Consume Kitchen Stock</h3>
                  <p className="text-[9px] text-neutral-400 font-bold mt-0.5">{consumeItem.name}</p>
                </div>
                <button type="button" onClick={() => setShowConsumeModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="p-3 bg-orange-100/10 rounded-xl text-xs space-y-1 text-neutral-400 font-bold">
                <p>किचन में उपलब्ध: <span className="text-orange-500 font-black">{consumeItem.kitchenQty || 0} {consumeItem.unit}</span></p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-black uppercase">Quantity Used</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="मात्रा दर्ज करें"
                      value={consumeQtyInput}
                      onChange={e => setConsumeQtyInput(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border dark:bg-neutral-800 text-center text-sm font-black text-neutral-900 dark:text-white"
                      required
                    />
                    <span className="font-bold text-neutral-400 w-12">{consumeItem.unit}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-black uppercase">Remarks / Note</label>
                  <input 
                    type="text"
                    placeholder="जैसे: आज का खाना बनाने में उपयोग"
                    value={consumeRemarksInput}
                    onChange={e => setConsumeRemarksInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-neutral-800 hover:bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-xl font-black text-xs uppercase shadow">
                Save Usage Log ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* 4. NEW WASTAGE LOG MODAL */}
        {showStockOutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleWasteSubmit} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-3xl p-6 space-y-4 ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xs font-black uppercase text-red-500">Log Waste / Damage</h3>
                <button type="button" onClick={() => setShowStockOutModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">Select Item</label>
                <select 
                  value={formStockOut.item} 
                  onChange={e => setFormStockOut({ ...formStockOut, item: e.target.value })} 
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-bold" 
                  required
                >
                  <option value="">Choose item...</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.storeQty} {i.unit} उपलब्ध)</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Qty</label>
                  <input 
                    type="number" 
                    placeholder="कितना खराब हुआ" 
                    value={formStockOut.quantity} 
                    onChange={e => setFormStockOut({ ...formStockOut, quantity: e.target.value })} 
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Type</label>
                  <select 
                    value={formStockOut.purpose} 
                    onChange={e => setFormStockOut({ ...formStockOut, purpose: e.target.value as any })} 
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  >
                    <option value="Waste">Waste (खराब)</option>
                    <option value="Damage">Damage (क्षतिग्रस्त)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">Remarks (कारण)</label>
                <input 
                  type="text" 
                  placeholder="जैसे: दूध फट गया" 
                  value={formStockOut.remarks} 
                  onChange={e => setFormStockOut({ ...formStockOut, remarks: e.target.value })} 
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                />
              </div>

              <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow">
                Save Wastage Record ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* 5. ADD PRODUCT MODAL */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleAddProductSubmit} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-3xl p-6 space-y-4 ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xs font-black uppercase text-green-500">Add New Product</h3>
                <button type="button" onClick={() => setShowAddProductModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Product Name (सामान का नाम)</label>
                  <input 
                    type="text" 
                    placeholder="जैसे: AMUL BUTTER" 
                    value={formAddProduct.name}
                    onChange={e => setFormAddProduct({ ...formAddProduct, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Category</label>
                    <select
                      value={formAddProduct.category}
                      onChange={e => setFormAddProduct({ ...formAddProduct, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Unit (इकाई)</label>
                    <select 
                      value={formAddProduct.unit}
                      onChange={e => setFormAddProduct({ ...formAddProduct, unit: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold"
                    >
                      <option value="Kg">Kg</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Packets">Packets</option>
                      <option value="Tins">Tins</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Price (INR)</label>
                    <input 
                      type="number" 
                      placeholder="खरीद दर"
                      value={formAddProduct.purchasePrice}
                      onChange={e => setFormAddProduct({ ...formAddProduct, purchasePrice: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Godown Qty</label>
                    <input 
                      type="number" 
                      value={formAddProduct.storeQty}
                      onChange={e => setFormAddProduct({ ...formAddProduct, storeQty: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Initial Kitchen Qty</label>
                    <input 
                      type="number" 
                      value={formAddProduct.kitchenQty}
                      onChange={e => setFormAddProduct({ ...formAddProduct, kitchenQty: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Min Stock Limit</label>
                    <input 
                      type="number" 
                      value={formAddProduct.minLimit}
                      onChange={e => setFormAddProduct({ ...formAddProduct, minLimit: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    />
                  </div>
                </div>

                {/* PURCHASE DATE FIELD FOR ADDING PRODUCTS */}
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Purchase Date (खरीद की तारीख)</label>
                  <input 
                    type="date" 
                    value={formAddProduct.lastPurchaseDate}
                    onChange={e => setFormAddProduct({ ...formAddProduct, lastPurchaseDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase shadow">
                Save Product ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* 6. EDIT PRODUCT MODAL */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleEditProductSubmit} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-3xl p-6 space-y-4 ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xs font-black uppercase text-orange-500">Edit Product Details</h3>
                <button type="button" onClick={() => setEditingProduct(null)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Product Name</label>
                  <input 
                    type="text" 
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Category</label>
                    <select
                      value={editingProduct.category || "OTHERS"}
                      onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Unit</label>
                    <select 
                      value={editingProduct.unit}
                      onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold"
                    >
                      <option value="Kg">Kg</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Packets">Packets</option>
                      <option value="Tins">Tins</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Purchase Price (INR)</label>
                    <input 
                      type="number" 
                      value={editingProduct.purchasePrice}
                      onChange={e => setEditingProduct({ ...editingProduct, purchasePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Min Stock Limit</label>
                    <input 
                      type="number" 
                      value={editingProduct.minLimit}
                      onChange={e => setEditingProduct({ ...editingProduct, minLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Godown Qty</label>
                    <input 
                      type="number" 
                      value={editingProduct.storeQty}
                      onChange={e => setEditingProduct({ ...editingProduct, storeQty: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Kitchen Qty</label>
                    <input 
                      type="number" 
                      value={editingProduct.kitchenQty || 0}
                      onChange={e => setEditingProduct({ ...editingProduct, kitchenQty: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                  </div>
                </div>

                {/* EDIT PURCHASE DATE FOR EDITING PRODUCTS */}
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Purchase Date (खरीद की तारीख)</label>
                  <input 
                    type="date" 
                    value={editingProduct.lastPurchaseDate || getLocalDateString(0)}
                    onChange={e => setEditingProduct({ ...editingProduct, lastPurchaseDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => handleDeleteProduct(editingProduct.id, editingProduct.name)}
                  className="px-4 py-3 bg-red-100 text-red-600 hover:bg-red-200 rounded-xl font-bold text-xs uppercase"
                >
                  Delete
                </button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs uppercase shadow">
                  Update ➔
                </button>
              </div>
            </motion.form>
          </div>
        )}

        {/* 7. OVERLAY/MODAL: SET BULK CATEGORY */}
        {showBulkCategoryModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b pb-2.5">
                <div>
                  <h3 className="text-xs font-black uppercase text-orange-500">Change Category</h3>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">चुने हुए सामानों को कैटेगरी में डालें</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowBulkCategoryModal(false)} 
                  className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Select Category (कैटेगरी चुनें)</label>
                  <select
                    value={bulkTargetCategory}
                    onChange={e => setBulkTargetCategory(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <option value="">-- चुनें --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="CREATE_NEW">-- + CREATE NEW CATEGORY --</option>
                  </select>
                </div>

                {bulkTargetCategory === "CREATE_NEW" && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">New Category Name</label>
                    <input 
                      type="text"
                      placeholder="जैसे: FROZEN FOOD"
                      value={newCategoryInput}
                      onChange={e => setNewCategoryInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border font-bold uppercase ${
                        isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                      }`}
                      required
                    />
                  </motion.div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleConfirmBulkCategory}
                  className="w-full py-3 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg"
                >
                  Set Category ➔
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 8. ADD FIXED ASSET MODAL */}
        {showAddAssetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleAddAssetSubmit} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-3xl p-6 space-y-4 ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xs font-black uppercase text-green-500">Add Fixed Asset (संपत्ति जोड़ें)</h3>
                <button type="button" onClick={() => setShowAddAssetModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Asset Name</label>
                  <input 
                    type="text" 
                    placeholder="जैसे: Oven, Fridge, Table" 
                    value={formAddAsset.name}
                    onChange={e => setFormAddAsset({ ...formAddAsset, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Quantity (संख्या)</label>
                    <input 
                      type="number" 
                      value={formAddAsset.quantity}
                      onChange={e => setFormAddAsset({ ...formAddAsset, quantity: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Cost / लागत (₹)</label>
                    <input 
                      type="number" 
                      placeholder="कुल कीमत"
                      value={formAddAsset.cost}
                      onChange={e => setFormAddAsset({ ...formAddAsset, cost: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Purchase Date</label>
                    <input 
                      type="date" 
                      value={formAddAsset.purchaseDate}
                      onChange={e => setFormAddAsset({ ...formAddAsset, purchaseDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-[#181818]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Condition (स्थिति)</label>
                    <select 
                      value={formAddAsset.condition}
                      onChange={e => setFormAddAsset({ ...formAddAsset, condition: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl border dark:bg-[#181818] font-bold"
                    >
                      <option value="Working">Working (चालू)</option>
                      <option value="Needs Repair">Needs Repair (सुधार की जरूरत)</option>
                      <option value="Broken">Broken (खराब)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Remarks (विवरण)</label>
                  <input 
                    type="text" 
                    placeholder="मॉडल नंबर, सप्लायर आदि" 
                    value={formAddAsset.remarks}
                    onChange={e => setFormAddAsset({ ...formAddAsset, remarks: e.target.value })}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase shadow">
                Save Asset ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* 9. SUPPLIER ORDER MODAL */}
        {showSaveToListModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center border-b pb-2.5">
                <div>
                  <h3 className="text-xs font-black uppercase text-orange-500">Save to Supplier Order</h3>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">चुने हुए सामानों को लिस्ट में जोड़ें</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowSaveToListModal(false)} 
                  className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Choose Order List</label>
                  <select
                    value={targetListId}
                    onChange={e => setTargetListId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold ${
                      isDarkMode ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    {orderLists.map(list => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                    <option value="CREATE_NEW">-- + CREATE NEW ORDER LIST --</option>
                  </select>
                </div>

                {targetListId === "CREATE_NEW" && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">New List Name</label>
                    <input 
                      type="text"
                      placeholder="जैसे: WEEKLY MAIN ORDER"
                      value={newListNameInput}
                      onChange={e => setNewListNameInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border font-bold uppercase ${
                        isDarkMode ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
                      }`}
                      required
                    />
                  </motion.div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleConfirmSaveToList}
                  className="w-full py-3 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg"
                >
                  Confirm & Generate Sheet ➔
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* PREMIUM BOTTOM NAVIGATION */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md ${isDarkMode ? 'bg-black/90 border-neutral-800 text-white' : 'bg-white/90 border-neutral-100 text-neutral-900'}`}>
        <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5 py-1.5 text-center text-[8px] font-black uppercase">
          <button onClick={() => { setActiveTab('home'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'home' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Home size={15} /> <span className="mt-0.5">Home</span>
          </button>
          <button onClick={() => { setActiveTab('store'); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'store' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Store size={15} /> <span className="mt-0.5">Godown</span>
          </button>
          <button onClick={() => { setActiveTab('fixed_assets'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'fixed_assets' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Wrench size={15} /> <span className="mt-0.5">Fixed Assets</span>
          </button>
          <button onClick={() => { setActiveTab('saved_list'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'saved_list' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Layers size={15} /> <span className="mt-0.5">Order to Supplier</span>
          </button>
          <button onClick={() => { setActiveTab('waste'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'waste' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <AlertTriangle size={15} /> <span className="mt-0.5">Logs & Waste</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
