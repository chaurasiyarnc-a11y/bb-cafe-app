'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc,
  waitForPendingWrites
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Minus, Search, X, User, Star, Gift, 
  Loader2, Clock, Trash2, Printer, Check, Play, Settings, 
  Database, RefreshCw, Layers, Phone, MapPin, LayoutGrid, List,
  Menu, Users, LogOut, Lock, ToggleLeft, ToggleRight, Sun, Moon,
  ChevronLeft, ChevronRight, Smartphone, Monitor, Bell
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  Database, RefreshCw, Layers, Menu, LogOut, Lock, ToggleLeft, ToggleRight, 
  Sun, Moon, Tag
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
// Safe Lucide Icons casting
const SafeLock = Lock as any;
const SafeDatabase = Database as any;
const SafeMenu = Menu as any;
@@ -40,22 +36,11 @@
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
const SafeSmartphone = Smartphone as any;
const SafeMonitor = Monitor as any;
const SafeBell = Bell as any;

interface PosCartItem {
  id: string;
@@ -136,6 +121,7 @@
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]); 
  const [storeOpen, setStoreOpen] = useState(true);

  // Receipts states
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [isSearchingReceipts, setIsSearchingReceipts] = useState(false);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
@@ -145,6 +131,7 @@

  const [isSyncing, setIsSyncing] = useState(false);

  // Cart & Checkout states
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
@@ -157,7 +144,6 @@
  const [tableNumber, setTableNumber] = useState('Table 1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [chefInstructions, setChefInstructions] = useState('');
  
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');

  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
@@ -208,7 +194,7 @@

  const handleClearAllLiveOrders = async () => {
    triggerBeep('tap');
    const confirmClear = window.confirm("क्या आप वाकई सभी एक्टिव लाइव ऑर्डर्स को साफ़ (Complete) करना चाहते हैं?");
    const confirmClear = window.confirm("क्या आप वाकई सभी एक्टिव लाइव ऑर्डर्स को साफ़ करना चाहते हैं?");
    if (!confirmClear) return;

    const toastId = toast.loading("Clearing active orders...");
@@ -218,18 +204,10 @@
      );
      await Promise.all(promises);
      toast.dismiss(toastId);
      toast.success("Active orders cleared successfully!");
      toast.success("Active orders cleared!");
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
      toast.error("Failed to clear orders");
    }
  };

@@ -464,59 +442,6 @@
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
      toast.error("Failed to edit");
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
      toast.error("Failed");
    }
  };

  const handleAddProductToCart = (item: any) => {
    triggerBeep('tap');
    setCart((prev) => {
@@ -563,10 +488,6 @@
    }).filter(Boolean) as PosCartItem[]);
  };

  const handleUpdateCartItemNote = (itemId: string, noteValue: string) => {
    setCart((prev) => prev.map((item) => item.id === itemId ? { ...item, note: noteValue } : item));
  };

  const handleTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = () => {
@@ -619,28 +540,15 @@
          if (characteristic) break;
        }

        if (!characteristic) {
          throw new Error("Could not find writable characteristic on printer.");
        }

        if (!characteristic) throw new Error("Could not find writable characteristic.");
        setBleCharacteristic(characteristic);
        setPrinterConnected(true);
        localStorage.setItem("bb_pos_printer_connected", "true");
        toast.dismiss(toastId);
        toast.success("Bluetooth Thermal Printer Connected!");
      } else if (printerType === 'thermal_usb' && 'serial' in navigator) {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        setSerialPort(port);
        setPrinterConnected(true);
        localStorage.setItem("bb_pos_printer_connected", "true");
        toast.dismiss(toastId);
        toast.success("USB Thermal Printer Connected!");
        toast.success("Bluetooth Printer Connected!");
      } else {
        setTimeout(() => {
          toast.dismiss(toastId);
          setPrinterConnected(true);
          localStorage.setItem("bb_pos_printer_connected", "true");
          toast.success("Connected!");
        }, 1000);
      }
@@ -666,9 +574,9 @@
        total: 100, 
        timestamp: new Date() 
      }, getPrintConfig());
      toast.success("Test print sent to printer!");
      toast.success("Test print sent!");
    } catch (e: any) {
      toast.error("Print failed: " + (e.message || "Unknown error"));
      toast.error("Print failed");
    }
  };

@@ -1117,7 +1025,98 @@
        </>
      )}

      {/* MODALS & DRAWERS */}
      {/* INLINE CART DRAWER */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="bg-white dark:bg-neutral-900 rounded-t-3xl p-5 max-h-[90vh] flex flex-col shadow-2xl overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-3">
                <h3 className="text-sm font-black uppercase text-orange-500">Review Active Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400"><SafeX size={16} /></button>
              </div>

              {/* Customer Phone & Loyalty Section */}
              <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-3">
                <div className="flex gap-2">
                  <input type="text" maxLength={10} placeholder="Customer 10-digit Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none font-mono" />
                  <button onClick={handleCheckLoyalty} className="bg-orange-600 hover:bg-orange-500 text-white px-4 rounded-xl text-xs font-black uppercase">Find</button>
                  <button onClick={() => setIsCustomerModalOpen(true)} className="bg-neutral-200 dark:bg-neutral-700 px-3 rounded-xl text-xs font-bold">List</button>
                </div>
                {customerName && (
                  <div className="flex justify-between text-xs font-bold text-yellow-500 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                    <span>👤 {customerName}</span><span>⭐ Points: {customerPoints}</span>
                  </div>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mb-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate">{item.name}</p>
                      <p className="text-[10px] font-mono text-orange-500">₹{item.price * item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">-</button>
                      <span className="w-6 text-center text-xs font-mono font-bold">{item.quantity}</span>
                      <button onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-6 h-6 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">+</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment Options */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-3 gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
                  {(['table', 'pickup', 'delivery'] as const).map((type) => (
                    <button key={type} onClick={() => { triggerBeep('tap'); setFulfillmentType(type); }} className={"py-1.5 rounded-xl text-[10px] font-black uppercase transition-all " + (fulfillmentType === type ? "bg-orange-600 text-white shadow-sm" : "text-neutral-400")}>{type}</button>
                  ))}
                </div>

                {fulfillmentType === 'table' && (
                  <input type="text" placeholder="Table Number (e.g., Table 4)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none" />
                )}

                {fulfillmentType === 'delivery' && (
                  <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <select value={selectedArea.name} onChange={e => { const ar = DELIVERY_AREAS.find(a => a.name === e.target.value); if (ar) setSelectedArea(ar); }} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2 text-xs outline-none">
                      {DELIVERY_AREAS.map(a => <option key={a.name} value={a.name}>{a.name} (Fee: ₹{a.fee})</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Delivery Address / GPS Link" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none" />
                      <button onClick={handleDetectLocation} className="bg-neutral-200 dark:bg-neutral-700 px-3 rounded-xl text-xs font-bold">GPS 📍</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bill Summary */}
              <div className="space-y-1.5 text-xs border-t border-neutral-200 dark:border-neutral-800 pt-3 mb-4">
                <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span className="font-mono">₹{getCartSubtotal()}</span></div>
                {fulfillmentType === 'delivery' && <div className="flex justify-between text-neutral-400"><span>Delivery Charge</span><span className="font-mono">₹{getDeliveryCharge()}</span></div>}
                <div className="flex justify-between text-sm font-black text-green-500 pt-1 border-t border-dashed border-neutral-700">
                  <span>Grand Total</span><span className="font-mono text-base">₹{getTotalBillPrice()}</span>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>Cash</button>
                <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>UPI</button>
              </div>

              <button onClick={handlePlaceOrder} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3.5 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg">
                {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <SafeCheck size={16} />}
                <span>Place Order & Print (₹{getTotalBillPrice()})</span>
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
@@ -1156,58 +1155,13 @@
        )}
      </AnimatePresence>

      <PosCartDrawer 
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
        getCartSubtotal={getCartSubtotal} 
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
        triggerBeep={triggerBeep} 
        handleCheckLoyalty={handleCheckLoyalty} 
      />

      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen} setIsCustomerModalOpen={setIsCustomerModalOpen} customerSearchQuery={customerSearchQuery} setCustomerSearchQuery={setCustomerSearchQuery} searchedCustomers={searchedCustomers} isSearchingCustomer={isSearchingCustomer} newCustName={newCustName} setNewCustName={setNewCustName} newCustPhone={newCustPhone} setNewCustPhone={setNewCustPhone} newCustAddress={newCustAddress} setNewCustAddress={setNewCustAddress} editingCustomer={editingCustomer} viewingHistoryCustomer={viewingHistoryCustomer} customerHistoryList={customerHistoryList} editCustPoints={editCustPoints} setEditCustPoints={setEditCustPoints} handleSelectCustomer={handleSelectCustomer} handleLoadCustomerHistory={handleLoadCustomerHistory} handleStartEditProfile={handleStartEditProfile} handleUpdateCustomerProfile={handleUpdateCustomerProfile} handleSaveNewCustomer={handleSaveNewCustomer} setViewingHistoryCustomer={setViewingHistoryCustomer} setCustomerHistoryList={setCustomerHistoryList} setEditingCustomer={setEditingCustomer} searchDbCustomers={searchDbCustomers} triggerBeep={triggerBeep}
        isCustomerModalOpen={isCustomerModalOpen} setIsCustomerModalOpen={setIsCustomerModalOpen} customerSearchQuery={customerSearchQuery} setCustomerSearchQuery={setCustomerSearchQuery} searchedCustomers={searchedCustomers} isSearchingCustomer={isSearchingCustomer} newCustName={newCustName} setNewCustName={setNewCustName} newCustPhone={newCustPhone} setNewCustPhone={setNewCustPhone} newCustAddress={newCustAddress} setNewCustAddress={setNewCustAddress} editingCustomer={editingCustomer} viewingHistoryCustomer={viewingHistoryCustomer} customerHistoryList={customerHistoryList} editCustPoints={editCustPoints} setEditCustPoints={setEditCustPoints} handleSelectCustomer={handleSelectCustomer} handleLoadCustomerHistory={() => {}} handleStartEditProfile={() => {}} handleUpdateCustomerProfile={() => {}} handleSaveNewCustomer={() => {}} setViewingHistoryCustomer={() => {}} setCustomerHistoryList={() => {}} setEditingCustomer={() => {}} searchDbCustomers={searchDbCustomers} triggerBeep={triggerBeep}
      />

      <CustomizerModal 
        selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} normalPizzaSize={normalPizzaSize} setNormalPizzaSize={setNormalPizzaSize} normalPizzaPrice={normalPizzaPrice} setNormalPizzaPrice={setNormalPizzaPrice} normalPizzaAddons={{}} setNormalPizzaAddons={() => {}} customizerChefNote={customizerChefNote} setCustomizerChefNote={setCustomizerChefNote} PIZZA_ADDONS={{}} QUICK_INSTRUCTION_TAGS={QUICK_INSTRUCTION_TAGS} handleAddCustomizedItemToCart={handleAddCustomizedItemToCart} triggerBeep={triggerBeep}
      />
    </div>
  );
}
