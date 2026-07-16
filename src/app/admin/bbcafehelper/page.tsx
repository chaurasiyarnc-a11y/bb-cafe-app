'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Home, Store, Trash2, Search, Plus, X, BarChart3, QrCode, 
  PlusCircle, MinusCircle, ChevronRight, Sparkles, AlertTriangle, Printer, Edit, Layers, MessageCircle
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
  unit: string;
  purchasePrice: number;
  minLimit: number;
  barcode?: string;
  supplier?: string;
  lastPurchaseDate?: string;
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

interface OrderListMeta {
  id: string;
  name: string;
  date: string;
}

interface SavedOrderItem {
  id: string; // compound: itemId_listId
  itemId: string;
  listId: string;
  name: string;
  storeQty: number;
  unit: string;
  orderQty: string;
}

interface ScannedItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
}

// Dynamics CDN loader for Real Barcode Scanner (html5-qrcode)
const loadHtml5Qrcode = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject();
    if ((window as any).Html5Qrcode) {
      resolve((window as any).Html5Qrcode);
      return;
    }
    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => {
      resolve((window as any).Html5Qrcode);
    };
    script.onerror = (e) => {
      reject(e);
    };
    document.head.appendChild(script);
  });
};

const triggerHaptic = (ms = 35) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
};

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "dry_1", name: "Doodh Milk", storeQty: 40, unit: "Ltr", purchasePrice: 60, minLimit: 10, barcode: "890105800401" },
  { id: "dry_2", name: "Dahi Curd", storeQty: 15, unit: "Kg", purchasePrice: 80, minLimit: 5, barcode: "890105800402" },
  { id: "dry_3", name: "Makkhan Butter", storeQty: 24, unit: "Kg", purchasePrice: 420, minLimit: 8, barcode: "890105800240" },
  { id: "veg_2", name: "Tamatar Tomato", storeQty: 30, unit: "Kg", purchasePrice: 40, minLimit: 10, barcode: "890105800408" }
];

export default function BumBumCafeStockApp() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [orderLists, setOrderLists] = useState<OrderListMeta[]>([]);
  const [savedOrders, setSavedOrders] = useState<SavedOrderItem[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'store' | 'saved_list' | 'waste'>('home');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editedQties, setEditedQties] = useState<Record<string, string | number>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Print/Selection States
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);

  // Multiple Lists State
  const [activeListId, setActiveListId] = useState<string>("");
  const [showSaveToListModal, setShowSaveToListModal] = useState<boolean>(false);
  const [targetListId, setTargetListId] = useState<string>("");
  const [newListNameInput, setNewListNameInput] = useState<string>("");

  // Rename Active List States
  const [isEditingListName, setIsEditingListName] = useState<boolean>(false);
  const [tempListNameInput, setTempListNameInput] = useState<string>("");

  // Scanner States
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scannedItemsToVerify, setScannedItemsToVerify] = useState<ScannedItem[]>([]);
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState<string | null>(null);
  const [isScannerProcessing, setIsScannerProcessing] = useState<boolean>(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>("");
  const html5QrCodeRef = useRef<any>(null);

  // Custom Modals & Forms
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);

  const [formAddProduct, setFormAddProduct] = useState({
    name: '', storeQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', barcode: ''
  });

  // Waste logs & modals
  const [showStockOutModal, setShowStockOutModal] = useState<boolean>(false);
  const [stockOutHistory, setStockOutHistory] = useState<StockOutLog[]>([
    { id: "so_1", itemName: "Doodh Milk", qty: 2, purpose: "Waste", date: "2026-07-15", remarks: "दूध फट गया", financialLoss: 120 },
    { id: "so_2", itemName: "Tamatar Tomato", qty: 5, purpose: "Damage", date: "2026-07-16", remarks: "सड़े हुए टमाटर फेंके", financialLoss: 200 },
  ]);

  const [formStockOut, setFormStockOut] = useState({
    item: '', quantity: '', purpose: 'Waste' as "Kitchen Use" | "Waste" | "Damage" | "Staff Use", remarks: ''
  });

  const toastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Keep inventory reference updated to prevent stale closures in Scanner
  const inventoryRef = useRef<InventoryItem[]>(inventory);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  // Static Listeners
  useEffect(() => {
    const unsubInventory = onSnapshot(collection(db, "godown_inventory"), (snap) => {
      setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
    const unsubStockOuts = onSnapshot(query(collection(db, "stock_out_history"), orderBy("date", "desc")), (snap) => {
      setStockOutHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockOutLog)));
    });
    const unsubSavedOrders = onSnapshot(collection(db, "saved_orders"), (snap) => {
      setSavedOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedOrderItem)));
    });
    return () => {
      unsubInventory();
      unsubStockOuts();
      unsubSavedOrders();
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
    });
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

  // Real Camera Barcode Scanner initialization using html5-qrcode
  useEffect(() => {
    let active = true;
    if (scannerActive) {
      setIsScannerProcessing(true);
      loadHtml5Qrcode().then((Html5QrcodeClass) => {
        if (!active) return;
        setIsScannerProcessing(false);
        try {
          const scannerInstance = new Html5QrcodeClass("reader");
          html5QrCodeRef.current = scannerInstance;
          
          scannerInstance.start(
            { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (width: number, height: number) => {
                return { width: Math.min(width * 0.8, 260), height: 160 };
              }
            },
            (decodedText: string) => {
              handleDetectedBarcode(decodedText);
            },
            () => {
              // Frame scanning error is ignored to keep loop alive
            }
          ).catch((err: any) => {
            console.warn("Camera start err", err);
            toastMessage("कैमरा लोड करने में समस्या।", "error");
          });
        } catch (e) {
          console.error(e);
        }
      }).catch(() => {
        setIsScannerProcessing(false);
        toastMessage("स्कैनर लाइब्रेरी लोड करने में विफल।", "error");
      });
    } else {
      stopCamera();
    }

    return () => {
      active = false;
      stopCamera();
    };
  }, [scannerActive]);

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      const scanner = html5QrCodeRef.current;
      if (scanner.isScanning) {
        scanner.stop().then(() => {
          scanner.clear();
        }).catch((e: any) => console.log(e));
      }
      html5QrCodeRef.current = null;
    }
  };

  // Calculations
  const stats = useMemo(() => {
    const totalVal = inventory.reduce((sum, item) => sum + (item.storeQty * item.purchasePrice), 0);
    const lowCount = inventory.filter(item => item.storeQty < item.minLimit).length;
    const wasteLoss = stockOutHistory
      .filter(s => s.purpose === "Waste" || s.purpose === "Damage")
      .reduce((sum, s) => sum + (s.financialLoss || 0), 0);
    return { totalVal, lowCount, wasteLoss };
  }, [inventory, stockOutHistory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventory, searchQuery]);

  // Process manual or scanned barcode
  const handleDetectedBarcode = (code: string) => {
    triggerHaptic(80);
    
    // Stop camera temporarily once scanned
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current.stop().catch(() => {});
    }

    const foundItem = inventoryRef.current.find(i => i.barcode === code);
    if (foundItem) {
      setUnrecognizedBarcode(null);
      setScannedItemsToVerify([{
        id: foundItem.id,
        name: foundItem.name,
        qty: 1,
        unit: foundItem.unit,
        price: foundItem.purchasePrice
      }]);
      toastMessage(`सामग्री मिली: ${foundItem.name}`);
    } else {
      setScannedItemsToVerify([]);
      setUnrecognizedBarcode(code);
      toastMessage(`नया बारकोड पाया गया: ${code}`, "info");
    }
  };

  // Trigger modal to add completely new product pre-filling scanned barcode
  const handleAddNewItemFromScanner = () => {
    if (!unrecognizedBarcode) return;
    setFormAddProduct({
      name: '',
      storeQty: '0',
      unit: 'Kg',
      purchasePrice: '',
      minLimit: '10',
      barcode: unrecognizedBarcode
    });
    setScannerActive(false);
    setUnrecognizedBarcode(null);
    setScannedItemsToVerify([]);
    setShowAddProductModal(true);
  };

  // Demo Scan for testing (Supports both existing and random registration)
  const simulateBarcodeScan = () => {
    setIsScannerProcessing(true);
    setTimeout(() => {
      setIsScannerProcessing(false);
      // 30% chance of generating a brand new barcode, otherwise scan existing
      if (Math.random() < 0.3 || inventory.length === 0) {
        const randomNewBarcode = `89010580${Math.floor(1000 + Math.random() * 9000)}`;
        handleDetectedBarcode(randomNewBarcode);
      } else {
        const randomItem = inventory[Math.floor(Math.random() * inventory.length)];
        handleDetectedBarcode(randomItem.barcode || "890105800401");
      }
    }, 1000);
  };

  const saveVerifiedScan = async () => {
    if (scannedItemsToVerify.length === 0) return;
    const batch = writeBatch(db);
    for (const item of scannedItemsToVerify) {
      const itemRef = doc(db, "godown_inventory", item.id);
      batch.set(itemRef, { storeQty: increment(item.qty) }, { merge: true });
    }
    await batch.commit();
    toastMessage("स्टॉक अपडेट कर दिया गया!");
    setScannerActive(false);
    setScannedItemsToVerify([]);
  };

  // Adjust stock quantity in list
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
    if (isNaN(updated)) {
      toastMessage("कृपया सही संख्या दर्ज करें।", "error");
      return;
    }
    try {
      await setDoc(doc(db, "godown_inventory", id), { storeQty: updated }, { merge: true });
      setEditedQties(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
      toastMessage("स्टॉक सेव हो गया!");
    } catch (e) {
      toastMessage("त्रुटि हुई।", "error");
    }
  };

  // Toggle Selection function
  const handleToggleMultiSelect = (id: string) => {
    triggerHaptic(10);
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // SAVE SELECTED ITEMS TO CHOSEN / NEW DATABASE ORDER LIST
  const handleConfirmSaveToList = async () => {
    triggerHaptic();
    if (selectedItemIds.length === 0) return;

    let targetId = targetListId;

    try {
      // 1. If user wants a new list, create it first
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

      // 2. Fallback if no list is chosen or created
      if (!targetId) {
        targetId = `list_${Date.now()}`;
        await setDoc(doc(db, "order_lists", targetId), {
          id: targetId,
          name: "GENERAL ORDER LIST",
          date: new Date().toISOString().split('T')[0]
        });
      }

      // 3. Save selected items into saved_orders referencing listId
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

  // Update Specific Order Qty in Firestore on keychange
  const handleUpdateOrderQty = async (compoundId: string, qty: string) => {
    try {
      await setDoc(doc(db, "saved_orders", compoundId), { orderQty: qty }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  // Rename Order List Name
  const handleUpdateListName = async (newName: string) => {
    if (!newName.trim() || !activeListId) return;
    try {
      await setDoc(doc(db, "order_lists", activeListId), { name: newName.trim().toUpperCase() }, { merge: true });
      toastMessage("ऑर्डर लिस्ट का नाम बदला गया!");
    } catch {
      toastMessage("नाम बदलने में त्रुटि हुई।", "error");
    }
  };

  // Delete Individual Saved item
  const handleRemoveFromSavedList = async (compoundId: string) => {
    triggerHaptic();
    try {
      await deleteDoc(doc(db, "saved_orders", compoundId));
    } catch {
      toastMessage("हटाने में त्रुटि हुई।", "error");
    }
  };

  // Clear/Delete entire Order List
  const handleDeleteActiveList = async () => {
    triggerHaptic();
    if (!activeListId) return;
    const confirm = window.confirm("क्या आप इस पूरी लिस्ट को डिलीट करना चाहते हैं? इसमें मौजूद सभी सामान हटा दिए जायेंगे।");
    if (!confirm) return;

    try {
      const batch = writeBatch(db);
      // Delete all items of this list
      const itemsToDelete = savedOrders.filter(o => o.listId === activeListId);
      itemsToDelete.forEach(item => {
        batch.delete(doc(db, "saved_orders", item.id));
      });
      // Delete list metadata
      batch.delete(doc(db, "order_lists", activeListId));
      await batch.commit();

      setActiveListId("");
      toastMessage("लिस्ट डिलीट कर दी गई!");
    } catch {
      toastMessage("डिलीट करने में त्रुटि हुई।", "error");
    }
  };

  // Add Product Submit
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
        unit: formAddProduct.unit,
        purchasePrice: parseFloat(formAddProduct.purchasePrice) || 0,
        minLimit: parseFloat(formAddProduct.minLimit) || 10,
        barcode: formAddProduct.barcode.trim() || "",
        supplier: "Walk-In",
        lastPurchaseDate: new Date().toISOString().split('T')[0]
      };
      await setDoc(doc(db, "godown_inventory", customId), payload);
      toastMessage("नया सामान सफलतापूर्वक दर्ज हुआ!");
      setShowAddProductModal(false);
      setFormAddProduct({ name: '', storeQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', barcode: '' });
    } catch {
      toastMessage("सामान जोड़ने में विफलता।", "error");
    }
  };

  // Edit Product Submit
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

  // Submit Wastage Log
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
        qty: qtyNum,
        purpose: formStockOut.purpose,
        date: new Date().toISOString().split('T')[0],
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

  // Direct print compiled saved orders list
  const handlePrintSavedList = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

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

  // WHATSAPP SHARE GENERATOR
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

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0E0E0E] text-white' : 'bg-[#FAFAFA] text-neutral-900'} pb-24 font-sans relative`}>
      
      {/* HUD Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-full bg-orange-500 text-white shadow-lg flex items-center gap-2 text-xs font-bold uppercase">
            <Sparkles size={14} /> <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <header className={`sticky top-0 z-40 border-b p-4 backdrop-blur-md ${isDarkMode ? 'bg-black/80 border-neutral-800' : 'bg-white/80 border-neutral-100'}`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <div>
              <h1 className="text-xs font-black text-orange-600 tracking-wider">BUM BUM CAFE</h1>
              <p className="text-[9px] text-neutral-400 font-bold uppercase">Godown Control</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setScannerActive(true)} className="p-2 bg-orange-500 text-white rounded-xl flex items-center gap-1 text-[10px] font-black uppercase">
              <QrCode size={14} /> <span>Scan</span>
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs">
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        
        {/* ==================== TAB 1: HOME / DASHBOARD ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-tr from-orange-500 to-amber-500 rounded-3xl p-5 text-white shadow-lg">
              <h2 className="text-lg font-black uppercase tracking-wider">BumBum Dashboard</h2>
              <p className="text-xs text-orange-100">स्टॉक और वेस्टेज रिपोर्ट ट्रैक करें</p>
              
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
                <div onClick={() => { setActiveTab('store'); setIsMultiSelectMode(true); }} className="bg-white/10 p-3 rounded-2xl text-center cursor-pointer hover:bg-white/20 transition-all">
                  <span className="text-xs font-bold block">📦 Multi Select</span>
                </div>
                <div onClick={() => { triggerHaptic(); setShowStockOutModal(true); }} className="bg-white/10 p-3 rounded-2xl text-center cursor-pointer hover:bg-white/20 transition-all">
                  <span className="text-xs font-bold block">⚠️ Log Waste</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">Total Stock Val</p>
                <p className="text-xs font-black text-orange-500 mt-1">₹{stats.totalVal.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">Wastage Loss</p>
                <p className="text-xs font-black text-red-500 mt-1">₹{stats.wasteLoss.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                <p className="text-[8px] font-black text-neutral-400 uppercase">Low Stock</p>
                <p className="text-xs font-black text-amber-500 mt-1">{stats.lowCount} items</p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: GODOWN STOCK ==================== */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            
            {/* SEARCH AND CONTROL ACTIONS */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input 
                  type="text" 
                  placeholder="आइटम खोजें..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border ${isDarkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}
                />
              </div>
              <button 
                onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedItemIds([]); }}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
                  isMultiSelectMode ? 'bg-orange-500 text-white border-orange-500' : isDarkMode ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-neutral-200'
                }`}
              >
                {isMultiSelectMode ? "Stop Select" : "Multi Select"}
              </button>
            </div>

            <button 
              onClick={() => {
                setFormAddProduct({ name: '', storeQty: '0', unit: 'Kg', purchasePrice: '', minLimit: '10', barcode: '' });
                setShowAddProductModal(true);
              }}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 shadow"
            >
              <Plus size={14} /> Add New Product (सामान जोड़ें)
            </button>

            {/* FLOATING ACTION BOTTOM BANNER - ENHANCED Z-INDEX LAYER [100] */}
            {isMultiSelectMode && selectedItemIds.length > 0 && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs px-2">
                <div className="bg-orange-600 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between border border-orange-400/30">
                  <div>
                    <p className="text-xs font-black">{selectedItemIds.length} Items Selected</p>
                    <p className="text-[9px] text-orange-100 font-bold uppercase tracking-wider">ऑर्डर लिस्ट टैब में भेजें</p>
                  </div>
                  <button 
                    onClick={() => {
                      triggerHaptic();
                      setShowSaveToListModal(true);
                    }}
                    className="px-4 py-2 bg-white text-orange-600 font-black text-xs uppercase rounded-xl shadow-lg shadow-orange-950/20 active:scale-95 transition-all"
                  >
                    Save to Order Tab ➔
                  </button>
                </div>
              </div>
            )}

            {/* STOCK ITEM CARDS */}
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

                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-orange-600">{item.name}</p>
                          {!isMultiSelectMode && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingProduct(item); }}
                              className="text-neutral-400 hover:text-orange-500"
                            >
                              <Edit size={12} />
                            </button>
                          )}
                        </div>
                        {item.barcode && <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-widest">Barcode: {item.barcode}</p>}
                      </div>
                      <div className="text-right pr-6">
                        <span className="text-xs text-neutral-400 font-bold">{item.storeQty} {item.unit}</span>
                      </div>
                    </div>

                    {/* Dynamic counter editing inside card */}
                    <div className="mt-3 pt-2.5 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
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
                      </div>

                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditedQties(prev => ({ ...prev, [item.id]: "0" })); toastMessage("0 सेट किया गया!", "info"); }}
                          className="px-2 py-1 bg-red-100 dark:bg-red-500/10 text-red-500 text-[10px] font-bold rounded-lg"
                        >
                          🗑️ 0 करें
                        </button>
                        {isDirty && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); saveQty(item.id); }}
                            className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg"
                          >
                            💾 सेव
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: SAVED ORDER LISTS (DYNAMIC MULTI-LISTS TAB) ==================== */}
        {activeTab === 'saved_list' && (
          <div className="space-y-4">
            
            {/* MULTIPLE LISTS DROPDOWN AND RENAMING HEADER */}
            <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3.5">
              
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-neutral-400">Choose Active List:</span>
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
                    className="p-2 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-xl"
                    title="पूरी लिस्ट डिलीट करें"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {activeListId && (
                <div className="border-t border-dashed border-neutral-200 dark:border-neutral-800 pt-3">
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
                          title="ऑर्डर लिस्ट का नाम बदलें"
                        >
                          <Edit size={12} />
                        </button>
                      </div>
                      <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wide">
                        {savedOrders.filter(o => o.listId === activeListId).length} Items listed
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* List Table of Saved orders (Filtered by activeListId) */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {savedOrders
                .filter(item => item.listId === activeListId)
                .map(item => (
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
                        value={item.orderQty || ""}
                        onChange={(e) => handleUpdateOrderQty(item.id, e.target.value)}
                        className="w-24 p-2 rounded-xl border text-center font-bold text-xs bg-transparent text-neutral-900 dark:text-white"
                      />
                      <span className="text-[10px] font-bold text-neutral-400 w-8">{item.unit}</span>
                      <button 
                        onClick={() => handleRemoveFromSavedList(item.id)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

              {savedOrders.filter(o => o.listId === activeListId).length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <span className="text-2xl block">🛒</span>
                  <p className="text-xs text-neutral-400 font-bold uppercase">लिस्ट खाली है या कोई लिस्ट एक्टिव नहीं है। Godown में जाकर सामान सेलेक्ट करें!</p>
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

        {/* ==================== TAB 4: WASTAGE DETAILS ==================== */}
        {activeTab === 'waste' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black text-orange-600 uppercase">Wastage Details Log</h2>
                <p className="text-[10px] text-neutral-400">कचरा और खराब हुए सामानों की विस्तृत सूची</p>
              </div>
              <button 
                onClick={() => setShowStockOutModal(true)} 
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow"
              >
                <Plus size={14} /> New Waste
              </button>
            </div>

            {/* List of Wastage logs */}
            <div className="space-y-2.5">
              {stockOutHistory
                .filter(log => log.purpose === "Waste" || log.purpose === "Damage")
                .map(log => (
                  <div key={log.id} className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-[#181818] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{log.itemName}</p>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">{log.date}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full text-[8px] font-black uppercase tracking-wider">
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
                <p className="text-center py-10 text-xs text-neutral-400 uppercase font-black">कोई नुकसान रिकॉर्ड नहीं मिला।</p>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ==================== SCREEN MODALS ==================== */}
      <AnimatePresence>

        {/* 1. REAL CAMERA BARCODE SCANNER WINDOW */}
        {scannerActive && (
          <div className="fixed inset-0 bg-black z-[150] flex flex-col justify-between p-4 text-white">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <p className="text-xs font-black uppercase text-orange-500">📷 Real Camera Scanner</p>
                <p className="text-[9px] text-neutral-400">सामान का बारकोड स्कैन करें</p>
              </div>
              <button 
                onClick={() => { 
                  setScannerActive(false); 
                  setScannedItemsToVerify([]); 
                  setUnrecognizedBarcode(null); 
                }} 
                className="p-2 bg-neutral-900 rounded-xl"
              >
                <X size={15} />
              </button>
            </div>

            {/* SCANNER LOGIC VIEWS */}
            {scannedItemsToVerify.length > 0 ? (
              /* Scenario A: Scanned Item exists in Database */
              <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#FF6B00] text-sm">{scannedItemsToVerify[0].name}</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <label className="text-[9px] text-neutral-400 font-bold block uppercase">Quantity to Add (जोड़ने की मात्रा)</label>
                    <input 
                      type="number"
                      value={scannedItemsToVerify[0].qty}
                      onChange={e => setScannedItemsToVerify([{ ...scannedItemsToVerify[0], qty: parseFloat(e.target.value) || 0 }])}
                      className="w-full p-2.5 bg-neutral-800 rounded-xl text-center font-black text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setScannedItemsToVerify([]);
                      setUnrecognizedBarcode(null);
                      // Restart Scanning Stream
                      if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
                        html5QrCodeRef.current.start(
                          { facingMode: "environment" },
                          { fps: 15, qrbox: (w: number, h: number) => ({ width: Math.min(w * 0.8, 260), height: 160 }) },
                          handleDetectedBarcode,
                          () => {}
                        ).catch(() => {});
                      }
                    }} 
                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-bold text-xs uppercase"
                  >
                    Scan Again
                  </button>
                  <button onClick={saveVerifiedScan} className="flex-1 py-3 bg-green-600 rounded-xl font-black text-xs uppercase">
                    Verify & Add
                  </button>
                </div>
              </div>
            ) : unrecognizedBarcode ? (
              /* Scenario B: Unrecognized Barcode -> Create New Product with pre-filled barcode */
              <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                <div className="p-5 bg-neutral-900 border border-red-500/30 rounded-2xl text-center space-y-3">
                  <span className="text-3xl">⚠️</span>
                  <p className="text-sm font-bold text-red-400">यह बारकोड गोदाम में मौजूद नहीं है!</p>
                  <p className="text-xs text-neutral-300">
                    Barcode: <span className="font-mono text-white bg-neutral-800 px-2 py-1 rounded font-bold">{unrecognizedBarcode}</span>
                  </p>
                  <p className="text-[10px] text-neutral-500">क्या आप इस बारकोड के साथ नया सामान जोड़ना चाहते हैं?</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setUnrecognizedBarcode(null);
                      if (html5QrCodeRef.current && !html5QrCodeRef.current.isScanning) {
                        html5QrCodeRef.current.start(
                          { facingMode: "environment" },
                          { fps: 15, qrbox: (w: number, h: number) => ({ width: Math.min(w * 0.8, 260), height: 160 }) },
                          handleDetectedBarcode,
                          () => {}
                        ).catch(() => {});
                      }
                    }} 
                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-bold text-xs uppercase"
                  >
                    Scan Again
                  </button>
                  <button 
                    onClick={handleAddNewItemFromScanner} 
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-black text-xs uppercase"
                  >
                    + Register New Item
                  </button>
                </div>
              </div>
            ) : (
              /* Scenario C: Scanning Camera screen active feed */
              <div className="flex-1 flex flex-col justify-between py-4 max-w-sm mx-auto w-full">
                <div className="space-y-1">
                  <input 
                    type="text" 
                    placeholder="Type/Paste Barcode manually..." 
                    value={manualBarcodeInput}
                    onChange={e => setManualBarcodeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { handleDetectedBarcode(manualBarcodeInput); setManualBarcodeInput(""); } }}
                    className="w-full p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-center text-xs text-white font-mono"
                  />
                </div>

                {/* Real-time HTML5 Camera scanning overlay */}
                <div className="relative h-60 w-full bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden flex items-center justify-center">
                  <div id="reader" className="absolute inset-0 w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full z-0" />
                  <span className="absolute left-0 right-0 h-0.5 bg-red-500 animate-bounce top-1/2 pointer-events-none z-10" />
                  
                  {isScannerProcessing && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 z-20">
                      <span className="text-[10px] font-bold text-orange-500 animate-pulse">STARTING REAL CAMERA...</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <button onClick={simulateBarcodeScan} className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-[10px] font-black uppercase">
                    ⚡ Demo Scan Emulator (आइटम स्कैन सिमुलेशन)
                  </button>
                  <p className="text-[8px] text-neutral-400 text-center font-black">यदि ब्राउज़र कैमरा बारकोड नहीं पढ़ पा रहा, तो ऊपर डेमो क्लिक करके टेस्ट करें</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. NEW WASTAGE SUBMISSION MODAL */}
        {showStockOutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.form onSubmit={handleWasteSubmit} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full max-w-sm rounded-3xl p-6 space-y-4 ${isDarkMode ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'}`}>
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-xs font-black uppercase text-red-500">Log Waste / Damage</h3>
                <button type="button" onClick={() => setShowStockOutModal(false)} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">Select Item (आइटम चुनें)</label>
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
                    <option value="Damage">Damage (टूटा/क्षतिग्रस्त)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[9px] text-neutral-400 font-bold uppercase">Remarks (कारण)</label>
                <input 
                  type="text" 
                  placeholder="जैसे: दूध फट गया, टमाटर सड़ गया" 
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

        {/* 3. ADD PRODUCT MODAL */}
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
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Unit (इकाई)</label>
                    <select 
                      value={formAddProduct.unit}
                      onChange={e => setFormAddProduct({ ...formAddProduct, unit: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-bold"
                    >
                      <option value="Kg">Kg</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Packets">Packets</option>
                      <option value="Tins">Tins</option>
                    </select>
                  </div>

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
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Initial Qty</label>
                    <input 
                      type="number" 
                      value={formAddProduct.storeQty}
                      onChange={e => setFormAddProduct({ ...formAddProduct, storeQty: e.target.value })}
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

                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Barcode (बारकोड)</label>
                  <input 
                    type="text" 
                    placeholder="जैसे: EAN-13 नंबर या स्कैन कोड" 
                    value={formAddProduct.barcode}
                    onChange={e => setFormAddProduct({ ...formAddProduct, barcode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-mono"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase shadow">
                Save Product ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* 4. EDIT PRODUCT MODAL */}
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
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                  <div className="space-y-1">
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">Barcode</label>
                    <input 
                      type="text" 
                      value={editingProduct.barcode || ""}
                      onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                      className="w-full p-2.5 rounded-xl border dark:bg-neutral-800 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={async () => {
                    const confirm = window.confirm(`क्या आप इस आइटम "${editingProduct.name}" को हमेशा के लिए डिलीट करना चाहते हैं?`);
                    if (!confirm) return;
                    try {
                      await deleteDoc(doc(db, "godown_inventory", editingProduct.id));
                      toastMessage("आइटम डिलीट कर दिया गया।");
                      setEditingProduct(null);
                    } catch {
                      toastMessage("डिलीट करने में विफलता।", "error");
                    }
                  }}
                  className="px-4 py-3 bg-red-100 text-red-600 rounded-xl font-bold text-xs uppercase"
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

        {/* 5. OVERLAY/MODAL: CHOOSE OR CREATE MULTIPLE ORDER LIST ON MULTI-SAVE */}
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
                  <h3 className="text-xs font-black uppercase text-orange-500">Save Selected Items</h3>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">ऑर्डर लिस्ट चुनें या नई लिस्ट बनाएं</p>
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
                
                {/* Dynamic List Selection Dropdown */}
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-400 font-bold uppercase">Select Existing List (मौजूदा लिस्ट चुनें)</label>
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
                    <option value="CREATE_NEW">-- + CREATE NEW LIST (नई लिस्ट बनाएं) --</option>
                  </select>
                </div>

                {/* Conditional Text Input if "Create New" is selected */}
                {targetListId === "CREATE_NEW" && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <label className="text-[9px] text-neutral-400 font-bold uppercase">New List Name (नई लिस्ट का नाम)</label>
                    <input 
                      type="text"
                      placeholder="जैसे: DAIRY ORDER JULY"
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
                  className="w-full py-3 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-orange-500/10"
                >
                  Confirm & Save (सहेजें) ➔
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>

      {/* PREMIUM BOTTOM NAVIGATION */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md ${isDarkMode ? 'bg-black/90 border-neutral-800 text-white' : 'bg-white/90 border-neutral-100 text-neutral-800'}`}>
        <div className="max-w-md mx-auto grid grid-cols-4 gap-0.5 py-1.5 text-center text-[9px] font-black uppercase">
          <button onClick={() => { setActiveTab('home'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'home' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Home size={15} /> <span className="mt-0.5">Home</span>
          </button>
          <button onClick={() => { setActiveTab('store'); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'store' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Store size={15} /> <span className="mt-0.5">Godown</span>
          </button>
          <button onClick={() => { setActiveTab('saved_list'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'saved_list' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <Layers size={15} /> <span className="mt-0.5">Saved List</span>
          </button>
          <button onClick={() => { setActiveTab('waste'); setIsMultiSelectMode(false); }} className={`flex flex-col items-center justify-center py-1 ${activeTab === 'waste' ? 'text-[#FF6B00]' : 'text-neutral-400'}`}>
            <AlertTriangle size={15} /> <span className="mt-0.5">Wastage Logs</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
