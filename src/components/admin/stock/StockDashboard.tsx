'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Home, Store, Wrench, Layers, AlertTriangle, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, doc, setDoc, increment, addDoc, deleteDoc, writeBatch 
} from 'firebase/firestore';

// कस्टमाइज़्ड सब-कंपोनेंट्स के इम्पोर्ट्स (समर्पित फ़ोल्डर से)
import StockDashboard from '@/components/admin/stock/StockDashboard';
import StockGodown from '@/components/admin/stock/StockGodown';
import StockAssets from '@/components/admin/stock/StockAssets';
import StockSupplierOrder from '@/components/admin/stock/StockSupplierOrder';
import StockLedger from '@/components/admin/stock/StockLedger';

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

export default function AdminStockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
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

  const [users, setUsers] = useState<UserPin[]>([]);
  const [currentUser, setCurrentUser] = useState<UserPin | null>(null);
  const [pinInput, setPinInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // session restore on reload [1]
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('bum_bum_cafe_user');
      if (savedUser) {
        try { setCurrentUser(JSON.parse(savedUser)); } catch { localStorage.removeItem('bum_bum_cafe_user'); }
      }
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

  const [activeListId, setActiveListId] = useState<string>("");
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

  const [formAddProduct, setFormAddProduct] = useState({ name: '', storeQty: '0', kitchenQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', category: 'OTHERS', lastPurchaseDate: getLocalDateString(0) });
  const [formAddAsset, setFormAddAsset] = useState({ name: '', quantity: '1', purchaseDate: '', cost: '', condition: 'Working' as any, remarks: '' });

  const [showStockOutModal, setShowStockOutModal] = useState<boolean>(false);
  const [formStockOut, setFormStockOut] = useState({ item: '', quantity: '', purpose: 'Waste' as any, remarks: '' });

  const toastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "cafe_users"), (snap) => {
      if (!snap.empty) setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserPin)));
    });
    const unsubInventory = onSnapshot(collection(db, "godown_inventory"), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, kitchenQty: 0, ...d.data() } as InventoryItem)));
    });
    const unsubCategories = onSnapshot(collection(db, "categories"), (snap) => {
      if (!snap.empty) setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as CategoryItem)));
    });
    const unsubStockIns = onSnapshot(query(collection(db, "stock_in_history"), orderBy("date", "desc")), (snap) => {
      setStockInHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockInLog)));
    });
    const unsubStockOuts = onSnapshot(query(collection(db, "stock_out_history"), orderBy("date", "desc")), (snap) => {
      setStockOutHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOutLog)));
    });
    const unsubSavedOrders = onSnapshot(collection(db, "saved_orders"), (snap) => {
      setSavedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedOrderItem)));
    });
    const unsubFixedAssets = onSnapshot(collection(db, "fixed_assets"), (snap) => {
      setFixedAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as FixedAsset)));
    });

    return () => {
      unsubUsers(); unsubInventory(); unsubCategories(); unsubStockIns(); unsubStockOuts(); unsubSavedOrders(); unsubFixedAssets();
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

  // Auth Submit
  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const matched = users.find(u => u.pin === pinInput.trim());
    if (matched) {
      setCurrentUser(matched);
      localStorage.setItem('bum_bum_cafe_user', JSON.stringify(matched));
      setPinInput("");
      setAuthError("");
    } else {
      setAuthError("गलत पिन!");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('bum_bum_cafe_user');
  };

  const confirmDeleteWithPin = (message: string, actionToExecute: () => void) => {
    setDeleteConfirmation({ message, action: actionToExecute });
    setDeletePinInput("");
    setDeletePinError("");
  };

  const handleDeleteVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = users.find(u => u.pin === deletePinInput.trim());
    if (matched) {
      if (deleteConfirmation) deleteConfirmation.action();
      setDeleteConfirmation(null);
    } else {
      setDeletePinError("गलत पिन!");
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
    } catch {}
  };

  const handleConfirmBulkCategory = async () => {
    if (selectedItemIds.length === 0) return;
    let targetCategory = bulkTargetCategory;
    if (targetCategory === "CREATE_NEW") {
      if (!newCategoryInput.trim()) return;
      targetCategory = newCategoryInput.trim().toUpperCase();
      const catId = targetCategory.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, "categories", catId), { id: catId, name: targetCategory, hidden: false });
    }
    try {
      const batch = writeBatch(db);
      selectedItemIds.forEach(id => batch.set(doc(db, "godown_inventory", id), { category: targetCategory }, { merge: true }));
      await batch.commit();
      setSelectedItemIds([]);
      setIsMultiSelectMode(false);
      setShowBulkCategoryModal(false);
    } catch {}
  };

  const handleAddNewCategoryInModal = async () => {
    if (!addCategoryModalInput.trim()) return;
    try {
      const formattedName = addCategoryModalInput.trim().toUpperCase();
      const catId = formattedName.toLowerCase().replace(/\s+/g, '_');
      await setDoc(doc(db, "categories", catId), { id: catId, name: formattedName, hidden: false });
      setAddCategoryModalInput("");
    } catch {}
  };

  const handleToggleCategoryHide = async (cat: CategoryItem) => {
    await setDoc(doc(db, "categories", cat.id), { hidden: !cat.hidden }, { merge: true });
  };

  const handleRemoveCategory = (cat: CategoryItem) => {
    confirmDeleteWithPin(`क्या आप सच में "${cat.name}" हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "categories", cat.id));
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
    } catch {}
  };

  const handleUpdateOrderQty = async (compoundId: string, qty: string) => {
    await setDoc(doc(db, "saved_orders", compoundId), { orderQty: qty }, { merge: true });
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

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formAddProduct.name.toUpperCase().trim();
    if (!cleanName) return;
    const customId = `item_${Date.now()}`;
    await setDoc(doc(db, "godown_inventory", customId), {
      id: customId, name: cleanName, storeQty: parseFloat(formAddProduct.storeQty) || 0, kitchenQty: parseFloat(formAddProduct.kitchenQty) || 0,
      unit: formAddProduct.unit, purchasePrice: parseFloat(formAddProduct.purchasePrice) || 0, minLimit: parseFloat(formAddProduct.minLimit) || 10, category: formAddProduct.category.toUpperCase()
    });
    setShowAddProductModal(false);
  };

  const handleAddAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formAddAsset.name.toUpperCase().trim();
    if (!cleanName) return;
    const customId = `asset_${Date.now()}`;
    await setDoc(doc(db, "fixed_assets", customId), {
      id: customId, name: cleanName, quantity: parseFloat(formAddAsset.quantity) || 1, cost: parseFloat(formAddAsset.cost) || 0, condition: formAddAsset.condition, remarks: formAddAsset.remarks
    });
    setShowAddAssetModal(false);
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
  };

  const handleDeleteAsset = (id: string, name: string) => {
    confirmDeleteWithPin(`क्या आप इस एसेट "${name}" को हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "fixed_assets", id));
    });
  };

  const handleDeleteProduct = (id: string, name: string) => {
    confirmDeleteWithPin(`क्या आप इस सामान "${name}" को हटाना चाहते हैं?`, async () => {
      await deleteDoc(doc(db, "godown_inventory", id));
    });
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await setDoc(doc(db, "godown_inventory", editingProduct.id), editingProduct, { merge: true });
    setEditingProduct(null);
  };

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-900'}`}>
        <div className="w-full max-w-sm p-8 rounded-[2.5rem] border shadow-2xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 space-y-6 text-center">
          <span className="text-5xl block">🔒</span>
          <h2 className="text-xl font-black text-orange-600 uppercase tracking-widest">BUM BUM CAFE</h2>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input
              type="password" maxLength={6} placeholder="ENTER PIN" value={pinInput} onChange={e => setPinInput(e.target.value)}
              className="w-full text-center text-3xl tracking-[0.5em] font-black p-4 rounded-2xl border bg-neutral-50 dark:bg-neutral-800 focus:ring-2 focus:ring-orange-500"
              autoFocus
            />
            {authError && <p className="text-xs text-red-500 font-bold">{authError}</p>}
            <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase transition-all">सत्यापित करें ➔</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0E0E0E]' : 'bg-[#FAFAFA]'} pb-24 font-sans relative ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>
      
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
          <button onClick={handleLogout} className="p-2 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-xl text-xs"><Lock size={13} /></button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs">{isDarkMode ? '☀️' : '🌙'}</button>
        </div>
      </header>

      {/* TABS CONTAINER */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        
        {/* SUB NAVIGATION BAR */}
        <div className="flex gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-2xl text-xs font-black uppercase">
          <button onClick={() => setActiveTab('home')} className={`flex-grow py-2 text-center rounded-xl transition-all ${activeTab === 'home' ? 'bg-orange-500 text-white shadow' : 'text-neutral-400'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('store')} className={`flex-grow py-2 text-center rounded-xl transition-all ${activeTab === 'store' ? 'bg-orange-500 text-white shadow' : 'text-neutral-400'}`}>Godown</button>
          <button onClick={() => setActiveTab('fixed_assets')} className={`flex-grow py-2 text-center rounded-xl transition-all ${activeTab === 'fixed_assets' ? 'bg-orange-500 text-white shadow' : 'text-neutral-400'}`}>Assets</button>
          <button onClick={() => setActiveTab('saved_list')} className={`flex-grow py-2 text-center rounded-xl transition-all ${activeTab === 'saved_list' ? 'bg-orange-500 text-white shadow' : 'text-neutral-400'}`}>Order</button>
          <button onClick={() => setActiveTab('waste')} className={`flex-grow py-2 text-center rounded-xl transition-all ${activeTab === 'waste' ? 'bg-orange-500 text-white shadow' : 'text-neutral-400'}`}>Ledger</button>
        </div>

        {/* Dynamic Views */}
        {activeTab === 'home' && (
          <StockDashboard 
            isDarkMode={isDarkMode} dashboardDateRange={dashboardDateRange} setDashboardDateRange={setDashboardDateRange}
            startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate}
            getFilteredLedgerStats={getFilteredLedgerStats} stats={stats} categories={categories}
            categoryStockValues={categoryStockValues} stockFlowTimeline={stockFlowTimeline}
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
          />
        )}

        {activeTab === 'fixed_assets' && (
          <StockAssets 
            isDarkMode={isDarkMode} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filteredAssets={filteredAssets} setShowAddAssetModal={setShowAddAssetModal}
            handleDeleteAsset={handleDeleteAsset}
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
            handleRemoveFromSavedList={handleRemoveFromSavedList} handlePrintSavedList={() => {}}
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
              <span className="text-4xl block">🛡️</span>
              <h3 className="text-sm font-black text-red-500 uppercase">सुरक्षा प्रमाणीकरण</h3>
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

        {/* Modal: Add Product */}
        {showAddProductModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form onSubmit={handleAddProductSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <h3 className="text-xs font-black uppercase text-green-500">Add New Product</h3>
              <input type="text" placeholder="नाम (जैसे: AMUL BUTTER)" value={formAddProduct.name} onChange={e => setFormAddProduct({ ...formAddProduct, name: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" required />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="Price (INR)" value={formAddProduct.purchasePrice} onChange={e => setFormAddProduct({ ...formAddProduct, purchasePrice: e.target.value })} className="p-2 border rounded-xl dark:bg-neutral-800" required />
                <input type="number" placeholder="Initial Qty" value={formAddProduct.storeQty} onChange={e => setFormAddProduct({ ...formAddProduct, storeQty: e.target.value })} className="p-2 border rounded-xl dark:bg-neutral-800" />
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-bold uppercase">Save Product</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Edit Product */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form onSubmit={handleEditProductSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <h3 className="text-xs font-black uppercase text-orange-500">Edit Details</h3>
              <input type="text" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value.toUpperCase() })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" required />
              <div className="flex gap-2">
                <button type="button" onClick={() => handleDeleteProduct(editingProduct.id, editingProduct.name)} className="px-4 py-3 bg-red-100 text-red-600 rounded-xl font-bold text-xs">Delete</button>
                <button type="submit" className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold text-xs uppercase">Update</button>
              </div>
            </motion.form>
          </div>
        )}

        {/* Modal: Transfer to kitchen */}
        {showTransferModal && transferItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form onSubmit={handleTransferToKitchenSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border animate-pulse">
              <h3 className="text-xs font-black uppercase text-orange-500">Send to Kitchen - {transferItem.name}</h3>
              <input type="number" placeholder="Qty" value={transferQtyInput} onChange={e => setTransferQtyInput(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-center" required />
              <button type="submit" className="w-full py-3 bg-orange-500 text-white rounded-xl text-xs font-black">Confirm</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Consume Kitchen stock */}
        {showConsumeModal && consumeItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form onSubmit={handleConsumeKitchenSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <h3 className="text-xs font-black uppercase text-neutral-400">Consume Kitchen Stock - {consumeItem.name}</h3>
              <input type="number" placeholder="Qty" value={consumeQtyInput} onChange={e => setConsumeQtyInput(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 text-center" required />
              <input type="text" placeholder="Remarks" value={consumeRemarksInput} onChange={e => setConsumeRemarksInput(e.target.value)} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" />
              <button type="submit" className="w-full py-3 bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 rounded-xl text-xs font-black">Save Usage</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Log Waste / Damage */}
        {showStockOutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form onSubmit={handleWasteSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <h3 className="text-xs font-black text-red-500 uppercase">Log Waste / Damage</h3>
              <select value={formStockOut.item} onChange={e => setFormStockOut({ ...formStockOut, item: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-bold" required>
                <option value="">Choose item...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.storeQty} available)</option>)}
              </select>
              <input type="number" placeholder="Qty" value={formStockOut.quantity} onChange={e => setFormStockOut({ ...formStockOut, quantity: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" required />
              <select value={formStockOut.purpose} onChange={e => setFormStockOut({ ...formStockOut, purpose: e.target.value as any })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800">
                <option value="Waste">Waste</option>
                <option value="Damage">Damage</option>
              </select>
              <input type="text" placeholder="Remarks" value={formStockOut.remarks} onChange={e => setFormStockOut({ ...formStockOut, remarks: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" />
              <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase">Save Record</button>
            </motion.form>
          </div>
        )}

        {/* Modal: Add Asset */}
        {showAddAssetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form onSubmit={handleAddAssetSubmit} className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white dark:bg-neutral-900 border">
              <h3 className="text-xs font-black text-green-500 uppercase">Add Fixed Asset</h3>
              <input type="text" placeholder="Asset Name" value={formAddAsset.name} onChange={e => setFormAddAsset({ ...formAddAsset, name: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" required />
              <input type="number" placeholder="Qty" value={formAddAsset.quantity} onChange={e => setFormAddAsset({ ...formAddAsset, quantity: e.target.value })} className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" required />
              <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-bold uppercase">Save Asset</button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
