

'use client';
import React from 'react';

interface PrintReceiptProps {
  orderObj: any;
  currentUser?: any;
}

export default function PrintCustomerReceipt({ orderObj, currentUser }: PrintReceiptProps) {
  if (!orderObj) return null;

  const orderDate = orderObj.timestamp?.toDate 
    ? orderObj.timestamp.toDate() 
    : new Date(orderObj.timestamp || Date.now());

  // Clean UPI ID (Auto fix @ symbol if missing)
  let upiId = orderObj.upiId || 'Q231190930@ybl';
  if (!upiId.includes('@') && upiId.includes('ybl')) {
    upiId = upiId.replace('ybl', '@ybl');
  }

  const totalAmount = Number(orderObj.total || 0).toFixed(2);
  const payeeName = 'Bum Bum Cafe';
  
  // Clean NPCI Standard UPI URI (Without invalid # characters)
  const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiString)}&margin=1`;

  // Loyalty calculations
  const earnedPts = orderObj.pointsEarned ?? Math.floor((orderObj.total || 0) / 100);
  const redeemedPts = orderObj.pointsRedeemed || 0;
  const balancePts = orderObj.remainingPoints ?? orderObj.customerPoints ?? 0;

  return (
    <div 
      style={{ fontFamily: 'Verdana, Geneva, Tahoma, sans-serif' }}
      className="w-[68mm] max-w-[68mm] mx-auto text-black bg-white p-0 pr-1 text-left select-none"
    >
      {/* HEADER */}
      <div className="text-center pb-2 border-b border-black">
        <h1 className="text-lg font-black uppercase tracking-wider leading-tight">BUM BUM CAFE</h1>
        <p className="text-[10px] font-bold mt-1 leading-snug">
          न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने,<br />
          जिला पन्ना, मोहंद्रा, मध्य प्रदेश - 488442
        </p>
        <p className="text-[11px] font-black mt-1">Mob: 9714293759</p>
      </div>

      {/* INVOICE & SERVER INFO */}
      <div className="text-[10px] font-bold py-1 border-b border-black flex justify-between pr-1">
        <span>Invoice: #{orderObj.billNumber || 5001}</span>
        <span>Server: {(currentUser?.name || 'YOGESH').toUpperCase()}</span>
      </div>
      <div className="text-[10px] font-bold pb-1 flex justify-between pr-1">
        <span>Date: {orderDate.toLocaleDateString()}</span>
        <span>Time: {orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* BIG TOKEN NUMBER BOX */}
      <div className="my-1.5 border-2 border-black py-1 text-center bg-white">
        <p className="text-[9px] font-black uppercase tracking-widest">TOKEN NUMBER</p>
        <p className="text-2xl font-black">#{orderObj.tokenNumber || '01'}</p>
      </div>

      {/* CUSTOMER INFO */}
      <div className="text-[10px] font-bold pb-1.5 border-b border-black">
        <p>Customer: {orderObj.customerName || 'Walk-in Guest'}</p>
        {orderObj.customerPhone && <p>Phone: {orderObj.customerPhone}</p>}
        <p className="uppercase">Type: {orderObj.fulfillmentType || 'Counter'}</p>
        {orderObj.tableNumber && <p className="font-black">Table: {orderObj.tableNumber}</p>}
      </div>

      {/* ITEMS TABLE */}
      <div className="py-1.5 border-b border-black">
        <div className="flex justify-between text-[10px] font-black uppercase pb-1 border-b border-dashed border-black pr-1">
          <span>ITEM DESCRIPTION</span>
          <span>TOTAL</span>
        </div>

        <div className="space-y-1.5 pt-1.5 pr-1">
          {orderObj.items?.map((item: any, idx: number) => (
            <div key={idx} className="text-[11px] leading-tight">
              <div className="flex justify-between font-black items-start">
                <span className="pr-1 break-words flex-1">
                  {item.quantity} x {item.name}
                </span>
                <span className="shrink-0 font-bold ml-1">₹{item.price * item.quantity}</span>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-black pl-3">
                <span>Price: ₹{item.price}</span>
              </div>
              {item.note && (
                <p className="text-[9px] italic pl-3 font-bold text-black">
                  Note: {item.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* BILL TOTALS */}
      <div className="py-1.5 border-b border-black text-[11px] space-y-1 pr-1">
        <div className="flex justify-between font-bold">
          <span>Subtotal:</span>
          <span>₹{orderObj.subtotal || orderObj.total}</span>
        </div>

        {orderObj.discountAmount > 0 && (
          <div className="flex justify-between font-bold">
            <span>Discount:</span>
            <span>-₹{orderObj.discountAmount}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{orderObj.total}</span>
        </div>

        <div className="flex justify-between text-[10px] font-black uppercase pt-0.5">
          <span>Payment Mode:</span>
          <span>{orderObj.paymentMethod || 'CASH'}</span>
        </div>
      </div>

      {/* ⭐ LOYALTY POINTS SUMMARY ON RECEIPT ⭐ */}
      {orderObj.customerPhone && (
        <div className="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
          <p className="font-black uppercase text-center tracking-wider">⭐ LOYALTY REWARDS ⭐</p>
          <div className="flex justify-between font-bold">
            <span>Points Earned this Bill:</span>
            <span>+{earnedPts} Pts</span>
          </div>
          {redeemedPts > 0 && (
            <div className="flex justify-between font-bold text-black">
              <span>Points Redeemed:</span>
              <span>-{redeemedPts} Pts</span>
            </div>
          )}
          <div className="flex justify-between font-black border-t border-dotted border-black pt-0.5">
            <span>Total Balance Points:</span>
            <span>{balancePts} Pts</span>
          </div>
        </div>
      )}

      {/* DYNAMIC VALID UPI QR CODE */}
      <div className="py-2 text-center border-b border-black flex flex-col items-center justify-center">
        <p className="text-[10px] font-black uppercase tracking-wider mb-1">
          SCAN TO PAY ₹{orderObj.total} VIA UPI
        </p>
        
        <div className="p-1 bg-white border border-black inline-block rounded">
          <img 
            src={qrCodeUrl} 
            alt="UPI QR Code" 
            className="w-36 h-36 object-contain block mx-auto"
            crossOrigin="anonymous"
          />
        </div>

        <p className="text-[10px] font-bold mt-1 font-mono text-black">
          UPI ID: {upiId}
        </p>
      </div>

      {/* FOOTER */}
      <div className="pt-2 text-center text-[9px] font-bold space-y-0.5">
        <p>Online Order Website:</p>
        <p className="font-black">bb-cafe-app.vercel.app</p>
        <p className="text-[10px] font-black mt-1">❤ Thank You, Visit Again ❤</p>
        <p className="text-[8px] text-black mt-0.5">Powered by BumBumCafe POS v3.3</p>
      </div>
    </div>
  );
}

फ़ाइल 2: src/app/d-pos/page.tsx

(आपके GitHub स्क्रीनशॉट वाली मुख्य POS फ़ाइल। इसमें पॉइंट्स रिडीम करने का बॉक्स,
रसीद पर लॉयल्टी डेटा पास करना, 68mm सेफ प्रिंटर मार्जिन, पुराने बिल देखने और
रीप्रिंट करने का टैब, और नया आइटम वेरिएशन्स के साथ जोड़ने का सिस्टम सब कुछ शामिल
है)

'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDoc, getDocs, where, setDoc,
  waitForPendingWrites, deleteDoc, Timestamp
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Settings, 
  Database, RefreshCw, Layers, LogOut, Lock, ToggleLeft, ToggleRight, 
  Trash2, UserPlus, Download, Edit3, FileText, LayoutGrid, ChevronLeft, ChevronRight, 
  Gift, PackagePlus, BarChart3, HelpCircle, PauseCircle, PlayCircle, QrCode, 
  Share2, Calculator, Receipt, IndianRupee, Send, ShieldAlert, Check, Plus, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';

import CustomerDirectoryModal from '@/components/pos/CustomerDirectoryModal';
import PrintCustomerReceipt from '@/components/d-pos/PrintCustomerReceipt';
import PrintKitchenKot from '@/components/d-pos/PrintKitchenKot';

const SafeLock = Lock as any;
const SafeDatabase = Database as any;
const SafeLogOut = LogOut as any;
const SafeToggleRight = ToggleRight as any;
const SafeToggleLeft = ToggleLeft as any;
const SafeShoppingBag = ShoppingBag as any;
const SafeClock = Clock as any; 
const SafeLayers = Layers as any;
const SafePrinter = Printer as any;
const SafeSearch = Search as any;
const SafeX = X as any;
const SafeRefreshCw = RefreshCw as any;
const SafeSettings = Settings as any;
const SafeTrash2 = Trash2 as any;
const SafeUserPlus = UserPlus as any;
const SafeDownload = Download as any;
const SafeEdit3 = Edit3 as any;
const SafeFileText = FileText as any;
const SafeLayoutGrid = LayoutGrid as any;
const SafeChevronLeft = ChevronLeft as any;
const SafeChevronRight = ChevronRight as any;
const SafeGift = Gift as any;
const SafePackagePlus = PackagePlus as any;
const SafeBarChart3 = BarChart3 as any;
const SafeHelpCircle = HelpCircle as any;
const SafePauseCircle = PauseCircle as any;
const SafePlayCircle = PlayCircle as any;
const SafeQrCode = QrCode as any;
const SafeShare2 = Share2 as any;
const SafeCalculator = Calculator as any;
const SafeSend = Send as any;
const SafePlus = Plus as any;
const SafeEye = Eye as any;

interface PosCartItem {
  cartItemId: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string; 
  variation?: string;
  size?: string;
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

interface HeldCart {
  id: string;
  cart: PosCartItem[];
  customerName: string;
  customerPhone: string;
  tableNumber: string;
  fulfillmentType: 'delivery' | 'pickup' | 'table';
  heldAt: string;
  total: number;
  note?: string;
}

const PIZZA_ADDONS: { [size: string]: { [addon: string]: number } } = {
  "small": { "Veg Add-on": 10, "Paneer": 20, "Black Olives": 20, "Jalapeno": 20, "Extra Cheese": 20, "Mushroom": 20 },
  "medium": { "Veg Add-on": 10, "Paneer": 30, "Black Olives": 30, "Jalapeno": 30, "Extra Cheese": 30, "Mushroom": 30 },
  "large": { "Veg Add-on": 20, "Paneer": 40, "Black Olives": 40, "Jalapeno": 40, "Extra Cheese": 40, "Mushroom": 40 },
  "extra large": { "Veg Add-on": 30, "Paneer": 50, "Black Olives": 50, "Jalapeno": 50, "Extra Cheese": 60, "Mushroom": 50 }
};

const COOKING_TAGS = ['🌶️ Less Spicy', '🧅 No Onion/Garlic', '📦 Parcel/To-Go', '🧊 Less Ice', '🧀 Extra Dip', '☕ Kadak'];

let globalAudioCtx: AudioContext | null = null;

export default function BbCafeDesktopPos() {
  const DELIVERY_AREAS: DeliveryArea[] = useMemo(() => [
    { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
    { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
    { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
  ], []);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [activeTab, setActiveTab] = useState<'billing' | 'inventory' | 'receipts' | 'settings' | 'orders' | 'tables' | 'reports'>('billing');

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(5);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [kotEnabled, setKotEnabled] = useState<boolean>(true); 
  const [upiIdConfig, setUpiIdConfig] = useState<string>('Q231190930@ybl');
  const [ownerPhoneConfig, setOwnerPhoneConfig] = useState<string>('919714293759');

  // Customer Directory States
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  
  const [showNewCustForm, setShowNewCustForm] = useState(false);
  const [newCustNameInput, setNewCustNameInput] = useState('');
  const [newCustAddressInput, setNewCustAddressInput] = useState('');

  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Reports & Expenses States
  const [reportFilter, setReportFilter] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customReportDate, setCustomReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportOrders, setReportOrders] = useState<any[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<any[]>([]);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [physicalCashInput, setPhysicalCashInput] = useState<number | ''>('');

  // Modals States
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isItemEditorModalOpen, setIsItemEditorModalOpen] = useState(false);

  // Dynamic Item Editor States
  const [editingItemObj, setEditingItemObj] = useState<any>(null);
  const [itemNameInput, setItemNameInput] = useState('');
  const [itemCodeInput, setItemCodeInput] = useState('');
  const [itemPriceInput, setItemPriceInput] = useState<number | ''>(100);
  const [itemCatInput, setItemCatInput] = useState('Fast Food');
  const [itemImageInput, setItemImageInput] = useState('');
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [hasVariants, setHasVariants] = useState(false);
  const [itemVariantsList, setItemVariantsList] = useState<{ [key: string]: number }>({});
  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState<number | ''>('');

  // Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState('Milk / Dairy');

  // Change Calculator State
  const [tenderCashAmount, setTenderCashAmount] = useState<number | ''>('');

  // Held Carts Storage
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

  // Variation Popup States (During Billing)
  const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
  const [selectedProductForVariation, setSelectedProductForVariation] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedSizePrice, setSelectedSizePrice] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<{ [addon: string]: boolean }>({});
  const [itemNoteInput, setItemNoteInput] = useState('');

  // Past Receipts States
  const [pastReceipts, setPastReceipts] = useState<any[]>([]);
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false); 
  const [receiptsLimit, setReceiptsLimit] = useState(50);
  const [isReceiptsLoading, setIsReceiptsLoading] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // Cart & Order States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  
  const [isRedeemingPoints, setIsRedeemingPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountValue, setDiscountValue] = useState<number>(0);

  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('pickup');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [address, setAddress] = useState('');
  const [tableNumber, setTableNumber] = useState('Table 1');
  
  const [activeEditingOrderId, setActiveEditingOrderId] = useState<string | null>(null);
  const [activeEditingBillNumber, setActiveEditingBillNumber] = useState<number | null>(null);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'split'>('cash');
  const [splitCashAmount, setSplitCashAmount] = useState<number>(0);
  const [splitUpiAmount, setSplitUpiAmount] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getSanitizedPhone = (p: string) => p.replace(/\D/g, '').slice(-10);

  const triggerBeep = (type: 'tap' | 'success' | 'alarm') => {
    try {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (globalAudioCtx.state === 'suspended') { globalAudioCtx.resume(); }
      const osc = globalAudioCtx.createOscillator();
      const gain = globalAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(globalAudioCtx.destination);
      if (type === 'tap') {
        osc.frequency.setValueAtTime(600, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523, globalAudioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, globalAudioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659, globalAudioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime + 0.24);
        osc.stop(globalAudioCtx.currentTime + 0.4);
      } else if (type === 'alarm') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, globalAudioCtx.currentTime);
        osc.frequency.setValueAtTime(1100, globalAudioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, globalAudioCtx.currentTime);
        osc.start(); osc.stop(globalAudioCtx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  // Calculations
  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const getDeliveryCharge = () => (fulfillmentType === "pickup" || fulfillmentType === "table" || getCartSubtotal() === 0) ? 0 : (getCartSubtotal() >= selectedArea.minFree ? 0 : selectedArea.fee);
  const getGstAmountCalculated = () => gstEnabled ? Number(((getCartSubtotal() * gstRate) / 100).toFixed(2)) : 0;
  const getRedemptionDiscount = () => isRedeemingPoints ? Math.min(pointsToRedeem, getCartSubtotal() + getGstAmountCalculated()) : 0;
  
  const getCalculatedDiscountAmount = () => {
    const sub = getCartSubtotal();
    if (discountType === 'amount') {
      return Math.min(discountValue, sub);
    } else {
      return Math.min(Number(((sub * discountValue) / 100).toFixed(2)), sub);
    }
  };

  const getTotalBillPrice = () => Math.max(0, getCartSubtotal() + getGstAmountCalculated() - getCalculatedDiscountAmount() - getRedemptionDiscount()) + getDeliveryCharge();

  const activeLiveOrders = useMemo(() => liveOrders.filter((o) => (o.fulfillmentType === 'delivery' || o.fulfillmentType === 'pickup') && o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const activeTableOrders = useMemo(() => liveOrders.filter((o) => o.fulfillmentType === 'table' && o.status !== 'completed' && o.status !== 'rejected'), [liveOrders]);
  const pendingOrdersCount = useMemo(() => activeLiveOrders.filter((o) => o.status === 'pending').length, [activeLiveOrders]);
  const activeTablesCount = useMemo(() => activeTableOrders.length, [activeTableOrders]);

  // CRASH PROTECTION
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (cart.length > 0 || activeTableOrders.length > 0) {
        e.preventDefault();
        e.returnValue = 'You have active orders or unsaved cart items! Are you sure you want to close?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cart.length, activeTableOrders.length]);

  // Split payment auto-sync
  useEffect(() => {
    const total = getTotalBillPrice();
    if (paymentMethod === 'split') {
      const half = Math.floor(total / 2);
      setSplitCashAmount(half);
      setSplitUpiAmount(total - half);
    }
  }, [cart, discountValue, discountType, isRedeemingPoints, pointsToRedeem, paymentMethod]);

  // Load Saved Settings
  useEffect(() => {
    const savedHeld = localStorage.getItem("bb_pos_held_carts");
    if (savedHeld) {
      try { setHeldCarts(JSON.parse(savedHeld)); } catch (e) {}
    }
    const savedUpi = localStorage.getItem("bb_pos_upi_id");
    if (savedUpi) setUpiIdConfig(savedUpi);

    const savedOwnerPhone = localStorage.getItem("bb_pos_owner_phone");
    if (savedOwnerPhone) setOwnerPhoneConfig(savedOwnerPhone);
  }, []);

  const saveHeldCartsToStorage = (newList: HeldCart[]) => {
    setHeldCarts(newList);
    localStorage.setItem("bb_pos_held_carts", JSON.stringify(newList));
  };

  // --- ITEM EDITOR HANDLERS ---
  const handleOpenItemEditor = (item: any = null) => {
    triggerBeep('tap');
    if (item) {
      setEditingItemObj(item);
      setItemNameInput(item.name || '');
      setItemCodeInput(item.itemCode || '');
      setItemPriceInput(item.price !== undefined ? Number(item.price) : 100);
      setItemCatInput(item.category || 'Fast Food');
      setItemImageInput(item.image || item.imageUrl || '');
      setItemIsAvailable(item.isAvailable !== false);
      
      if (item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length > 0) {
        setHasVariants(true);
        setItemVariantsList({ ...item.variants });
      } else {
        setHasVariants(false);
        setItemVariantsList({});
      }
    } else {
      setEditingItemObj(null);
      setItemNameInput('');
      setItemCodeInput('');
      setItemPriceInput(100);
      setItemCatInput(categories.find(c => c !== 'All') || 'Fast Food');
      setItemImageInput('');
      setItemIsAvailable(true);
      setHasVariants(false);
      setItemVariantsList({});
    }
    setNewVariantName('');
    setNewVariantPrice('');
    setIsItemEditorModalOpen(true);
  };

  const handleAddVariantRow = () => {
    const name = newVariantName.trim();
    const price = Number(newVariantPrice);
    if (!name) return toast.error("Enter size name (e.g. Medium, Half)!");
    if (isNaN(price) || price < 0) return toast.error("Enter a valid price!");
    setItemVariantsList(prev => ({ ...prev, [name]: price }));
    setNewVariantName('');
    setNewVariantPrice('');
    toast.success(`Size "${name} (₹${price})" added!`);
  };

  const handleRemoveVariantRow = (key: string) => {
    setItemVariantsList(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleApplyVariantPreset = (presetType: 'pizza' | 'half_full' | 'reg_large') => {
    const base = Number(itemPriceInput) || 100;
    setHasVariants(true);
    if (presetType === 'pizza') {
      setItemVariantsList({
        'Small': base,
        'Medium': Math.round(base * 1.6),
        'Large': Math.round(base * 2.2)
      });
    } else if (presetType === 'half_full') {
      setItemVariantsList({
        'Half': Math.round(base * 0.6),
        'Full': base
      });
    } else if (presetType === 'reg_large') {
      setItemVariantsList({
        'Regular': base,
        'Large': Math.round(base * 1.4)
      });
    }
    toast.success("Applied size presets!");
  };

  const handleSaveItemToFirestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemNameInput.trim()) return toast.error("कृपया item का नाम दर्ज करें!");
    const toastId = toast.loading("Saving item to menu...");

    try {
      const cleanVariants = (hasVariants && Object.keys(itemVariantsList).length > 0) ? itemVariantsList : null;

      const itemData: any = {
        name: itemNameInput.trim(),
        itemCode: itemCodeInput.trim(),
        price: Number(itemPriceInput) || 0,
        category: itemCatInput.trim() || 'General',
        image: itemImageInput.trim(),
        variants: cleanVariants,
        isAvailable: itemIsAvailable,
        updatedAt: new Date()
      };

      if (editingItemObj) {
        await updateDoc(doc(db, "products", editingItemObj.id), itemData);
        setProducts(prev => prev.map(p => p.id === editingItemObj.id ? { id: editingItemObj.id, ...itemData } : p));
        toast.success("Item updated successfully! ✅");
      } else {
        const docRef = await addDoc(collection(db, "products"), itemData);
        setProducts(prev => [...prev, { id: docRef.id, ...itemData }]);
        toast.success("New item added to menu! ✅");
      }

      const uniqueCats = Array.from(new Set([...products.map((i: any) => i.category), itemData.category].filter(Boolean))) as string[];
      setCategories(['All', ...uniqueCats]);

      toast.dismiss(toastId);
      setIsItemEditorModalOpen(false);
      setEditingItemObj(null);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to save item");
    }
  };

  const handleDeleteProductFromMenu = async (productId: string) => {
    triggerBeep('tap');
    if (!window.confirm("Permanently delete this item from menu?")) return;
    try {
      await deleteDoc(doc(db, "products", productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success("Item deleted from menu");
      if (isItemEditorModalOpen) setIsItemEditorModalOpen(false);
    } catch (e) {
      toast.error("Failed to delete item");
    }
  };

  // --- PAST RECEIPTS ---
  const fetchPastReceipts = async () => {
    setIsReceiptsLoading(true);
    try {
      const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(receiptsLimit));
      const snap = await getDocs(q);
      setPastReceipts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      toast.error("Failed to load past receipts");
    } finally {
      setIsReceiptsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'receipts') fetchPastReceipts();
  }, [activeTab, receiptsLimit]);

  // --- HOLD CURRENT CART [F3] ---
  const handleHoldCurrentCart = () => {
    if (cart.length === 0) return toast.error("Cart is empty!");
    triggerBeep('tap');

    const newHold: HeldCart = {
      id: `hold_${Date.now()}`,
      cart: [...cart],
      customerName: customerName || 'Walk-in Guest',
      customerPhone,
      tableNumber,
      fulfillmentType,
      heldAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: getTotalBillPrice()
    };

    const updated = [newHold, ...heldCarts];
    saveHeldCartsToStorage(updated);
    toast.success(`Cart parked on Hold! [${newHold.customerName}]`, { icon: '⏸️' });

    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscountValue(0);
    setIsRedeemingPoints(false);
    setPointsToRedeem(0);
    localStorage.removeItem("bb_pos_saved_cart_pc");
  };

  // --- RESTORE HELD CART [F5] ---
  const handleRestoreHeldCart = (heldItem: HeldCart) => {
    triggerBeep('tap');
    if (cart.length > 0) {
      if (!window.confirm("Replace active cart with this held order?")) return;
    }
    setCart(heldItem.cart);
    setCustomerName(heldItem.customerName === 'Walk-in Guest' ? '' : heldItem.customerName);
    setCustomerPhone(heldItem.customerPhone || '');
    setTableNumber(heldItem.tableNumber || 'Table 1');
    setFulfillmentType(heldItem.fulfillmentType || 'pickup');
    
    const updated = heldCarts.filter(h => h.id !== heldItem.id);
    saveHeldCartsToStorage(updated);
    setIsHeldCartsModalOpen(false);
    setActiveTab('billing');
    toast.success(`Restored order of ${heldItem.customerName}!`, { icon: '▶️' });
  };

  const handleDeleteHeldCart = (holdId: string) => {
    triggerBeep('tap');
    const updated = heldCarts.filter(h => h.id !== holdId);
    saveHeldCartsToStorage(updated);
    toast.success("Held cart removed.");
  };

  // --- WHATSAPP RECEIPT SENDER ---
  const handleSendWhatsAppBill = (targetOrder: any = null) => {
    const ord = targetOrder || {
      customerPhone,
      customerName,
      fulfillmentType,
      items: cart,
      subtotal: getCartSubtotal(),
      total: getTotalBillPrice()
    };

    const clean = getSanitizedPhone(ord.customerPhone || '');
    if (clean.length !== 10) return toast.error("Enter a valid 10-digit phone number!");
    if (!ord.items || ord.items.length === 0) return toast.error("No items to send!");

    const itemsText = ord.items.map((i: any) => `• ${i.name} x${i.quantity} = ₹${i.price * i.quantity}`).join('%0A');
    const billNumStr = ord.billNumber ? ` (Bill #${ord.billNumber})` : '';

    const message = `*☕ BUM BUM CAFE - DIGITAL RECEIPT*${billNumStr}%0A------------------------------%0A*Customer:* ${ord.customerName || 'Valued Guest'}%0A*Phone:* ${clean}%0A*Mode:* ${(ord.fulfillmentType || 'Counter').toUpperCase()}%0A------------------------------%0A${itemsText}%0A------------------------------%0A*Grand Total:* ₹${ord.total}%0A------------------------------%0A_Thank you for visiting Bum Bum Cafe, Mohandra! Visit Again!_ 💛`;

    const url = `https://wa.me/91${clean}?text=${message}`;
    window.open(url, '_blank');
    toast.success("WhatsApp bill opened! 📱");
  };

  // --- OWNER DAILY SUMMARY WHATSAPP ---
  const handleSendOwnerSummary = () => {
    const cleanOwner = getSanitizedPhone(ownerPhoneConfig);
    const msg = `*☕ BUM BUM CAFE - DAY END SUMMARY*%0A------------------------------%0A*Date:* ${new Date().toLocaleDateString()}%0A*Total Sales:* ₹${reportSummary.totalSale}%0A*Orders Completed:* ${reportSummary.totalOrdersCount}%0A------------------------------%0A*💵 Gross Cash:* ₹${reportSummary.cashSale}%0A*📱 UPI / Bank:* ₹${reportSummary.upiSale}%0A*🧾 Total Expenses:* -₹${reportSummary.totalExpenseAmount}%0A------------------------------%0A*💰 Net Cash in Drawer:* ₹${reportSummary.netCashInDrawer}%0A------------------------------%0A_Generated via Bum Bum Cafe Desktop POS_`;
    
    window.open(`https://wa.me/${cleanOwner}?text=${msg}`, '_blank');
    toast.success("Closing summary sent to owner! 📊");
  };

  // --- SAVE PETTY CASH EXPENSE [F6] ---
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amt) || amt <= 0) return toast.error("Enter valid title and amount!");
    const toastId = toast.loading("Saving expense...");
    try {
      await addDoc(collection(db, "daily_expenses"), {
        title: expenseTitle.trim(),
        amount: amt,
        category: expenseCategory,
        timestamp: new Date(),
        enteredBy: currentUser?.name || 'Staff'
      });
      toast.dismiss(toastId);
      toast.success(`Expense ₹${amt} logged from drawer! ✅`);
      setExpenseTitle('');
      setExpenseAmount('');
      setIsExpenseModalOpen(false);
      fetchReportData();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to record expense");
    }
  };

  // --- FILTERED MENU FOR FAST SEARCH ---
  const filteredMenu = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesName = (p.name || '').toLowerCase().includes(queryStr);
      const matchesCode = p.itemCode && String(p.itemCode).toLowerCase().includes(queryStr);
      return matchesCategory && (matchesName || matchesCode);
    });
  }, [products, selectedCategory, searchQuery]);

  // --- FILTERED INVENTORY PRODUCTS ---
  const filteredInventoryProducts = useMemo(() => {
    const queryStr = inventorySearchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchesName = (p.name || '').toLowerCase().includes(queryStr);
      const matchesCat = (p.category || '').toLowerCase().includes(queryStr);
      const matchesCode = p.itemCode && String(p.itemCode).toLowerCase().includes(queryStr);
      return matchesName || matchesCat || matchesCode;
    });
  }, [products, inventorySearchQuery]);

  // --- KEYBOARD SHORTCUTS (F1 - F10, ESC) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLoggedIn) return;

      if (e.key === 'F1') {
        e.preventDefault();
        setIsHelpModalOpen(prev => !prev);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('billing');
        setTimeout(() => searchInputRef.current?.focus(), 80);
        toast("Search Bar Focused [F2]", { icon: '⌨️' });
      }
      if (e.key === 'F3') {
        e.preventDefault();
        handleHoldCurrentCart();
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setPaymentMethod(prev => {
          const next = prev === 'cash' ? 'upi' : prev === 'upi' ? 'split' : 'cash';
          toast(`Payment Mode: ${next.toUpperCase()} [F4]`, { icon: '💳' });
          return next;
        });
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setIsHeldCartsModalOpen(prev => !prev);
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setIsExpenseModalOpen(prev => !prev);
      }
      if (e.key === 'F7') {
        e.preventDefault();
        handleSendWhatsAppBill();
      }
      if (e.key === 'F8') {
        e.preventDefault();
        if (getTotalBillPrice() <= 0) {
          toast.error("Cart total must be greater than ₹0 for UPI QR!");
        } else {
          setIsQrModalOpen(prev => !prev);
        }
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0 && !isSubmittingOrder) {
          handleFinalCheckoutAndPrintBill();
        } else if (cart.length === 0) {
          toast.error("Cart is empty! Add items first.");
        }
      }
      if (e.key === 'F10') {
        e.preventDefault();
        setTenderCashAmount(getTotalBillPrice());
        setIsChangeModalOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsHelpModalOpen(false);
        setIsHeldCartsModalOpen(false);
        setIsExpenseModalOpen(false);
        setIsQrModalOpen(false);
        setIsChangeModalOpen(false);
        setIsVariationModalOpen(false);
        setIsReceiptModalOpen(false);
        setIsCustomerModalOpen(false);
        setIsItemEditorModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoggedIn, cart, isSubmittingOrder, paymentMethod, customerName, customerPhone, tableNumber, fulfillmentType, heldCarts]);

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredMenu.length > 0) {
        handleItemClick(filteredMenu[0]);
        setSearchQuery('');
      } else {
        toast.error("No matching item found!");
      }
    }
  };

  // --- REPORT CALCULATIONS ---
  const fetchReportData = async () => {
    setIsReportLoading(true);
    try {
      let startTarget = new Date();
      let endTarget = new Date();

      if (reportFilter === 'today') {
        startTarget.setHours(0, 0, 0, 0);
        endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'yesterday') {
        startTarget.setDate(startTarget.getDate() - 1);
        startTarget.setHours(0, 0, 0, 0);
        endTarget.setDate(endTarget.getDate() - 1);
        endTarget.setHours(23, 59, 59, 999);
      } else if (reportFilter === 'custom' && customReportDate) {
        startTarget = new Date(customReportDate);
        startTarget.setHours(0, 0, 0, 0);
        endTarget = new Date(customReportDate);
        endTarget.setHours(23, 59, 59, 999);
      }

      const qOrders = query(
        collection(db, "orders"),
        where("timestamp", ">=", Timestamp.fromDate(startTarget)),
        where("timestamp", "<=", Timestamp.fromDate(endTarget)),
        orderBy("timestamp", "desc")
      );
      const snapOrders = await getDocs(qOrders);
      setReportOrders(snapOrders.docs.map(d => ({ id: d.id, ...d.data() })));

      const qExpenses = query(
        collection(db, "daily_expenses"),
        where("timestamp", ">=", Timestamp.fromDate(startTarget)),
        where("timestamp", "<=", Timestamp.fromDate(endTarget)),
        orderBy("timestamp", "desc")
      );
      const snapExpenses = await getDocs(qExpenses);
      setDailyExpenses(snapExpenses.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') fetchReportData();
  }, [activeTab, reportFilter, customReportDate]);

  const reportSummary = useMemo(() => {
    let totalSale = 0;
    let cashSale = 0;
    let upiSale = 0;
    let totalOrdersCount = reportOrders.filter(o => o.status !== 'rejected').length;

    reportOrders.forEach(o => {
      if (o.status !== 'rejected') {
        const amt = Number(o.total) || 0;
        totalSale += amt;
        if (o.paymentMethod === 'upi') {
          upiSale += amt;
        } else if (o.paymentMethod === 'split') {
          cashSale += Number(o.splitCashAmount || 0);
          upiSale += Number(o.splitUpiAmount || 0);
        } else {
          cashSale += amt;
        }
      }
    });

    const totalExpenseAmount = dailyExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    const netCashInDrawer = Math.max(0, cashSale - totalExpenseAmount);

    return { totalSale, cashSale, upiSale, totalOrdersCount, totalExpenseAmount, netCashInDrawer };
  }, [reportOrders, dailyExpenses]);

  // App initialization
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    const savedUser = localStorage.getItem("bb_pos_user_pc");
    if (savedUser) { 
      try { 
        setIsLoggedIn(true); 
        setCurrentUser(JSON.parse(savedUser)); 
      } catch (e) {} 
    }
    setGstEnabled(localStorage.getItem("bb_pos_gst_enabled_pc") === 'true');
    setGstRate(Number(localStorage.getItem("bb_pos_gst_rate_pc")) || 5);
    setKotEnabled(localStorage.getItem("bb_pos_kot_enabled_pc") !== 'false'); 

    const localTheme = localStorage.getItem("bb_pos_theme_pc") || 'dark';
    setThemeMode(localTheme as any);
    if (localTheme === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');

    const savedCart = localStorage.getItem("bb_pos_saved_cart_pc");
    if (savedCart) { 
      try { setCart(JSON.parse(savedCart)); } catch (err) {} 
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return toast("App already installed or browser unsupported.", { icon: 'ℹ️' });
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
      toast.success("Desktop POS Installed Successfully! 🎉");
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    localStorage.setItem("bb_pos_saved_cart_pc", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(list);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (pendingOrdersCount > 0) {
      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(() => { triggerBeep('alarm'); }, 2500);
      }
    } else {
      if (alarmIntervalRef.current) { clearInterval(alarmIntervalRef.current); alarmIntervalRef.current = null; }
    }
    return () => { if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current); };
  }, [pendingOrdersCount]);

  useEffect(() => {
    if (!isLoggedIn) return;
    (async () => {
      setLoading(true);
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const items = prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
        const uniqueCats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
        setCategories(['All', ...uniqueCats]);
      } catch (err) {
        toast.error("Error loading products");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn]);

  const handleManualSync = async () => {
    triggerBeep('tap');
    if (!navigator.onLine) return toast.error("You are offline!");
    setIsSyncing(true);
    const toastId = toast.loading("Syncing products...");
    try {
      await waitForPendingWrites(db);
      const prodSnap = await getDocs(collection(db, "products"));
      const items = prodSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      const uniqueCats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
      setCategories(['All', ...uniqueCats]);
      toast.dismiss(toastId);
      toast.success("Synced successfully!");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePinLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Verifying PIN...");
    try {
      const snap = await getDocs(query(collection(db, "cafe_users"), where("pin", "==", pinInput.trim())));
      toast.dismiss(toastId);
      if (!snap.empty) {
        const uDoc = snap.docs[0].data();
        setIsLoggedIn(true);
        setCurrentUser({ id: snap.docs[0].id, ...uDoc });
        localStorage.setItem("bb_pos_user_pc", JSON.stringify({ id: snap.docs[0].id, ...uDoc })); 
        toast.success(`Welcome, ${uDoc.name}!`);
      } else {
        toast.error("Incorrect Staff PIN!");
      }
      setPinInput('');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Connection error");
      setPinInput('');
    }
  };

  const handleLogout = () => {
    triggerBeep('tap');
    localStorage.removeItem("bb_pos_user_pc");
    setIsLoggedIn(false);
    setCurrentUser(null);
    toast.success("Terminal Locked!");
  };

  // CART ADD LOGIC
  const handleItemClick = (item: any) => {
    triggerBeep('tap');
    const hasItemVariants = item.variants && typeof item.variants === 'object' && Object.keys(item.variants).length > 0;

    if (hasItemVariants) {
      setSelectedProductForVariation(item);
      const firstSize = Object.keys(item.variants)[0];
      const firstPrice = Number(item.variants[firstSize]) || Number(item.price) || 100;
      setSelectedSize(firstSize);
      setSelectedSizePrice(firstPrice);
      setSelectedAddons({});
      setItemNoteInput('');
      setIsVariationModalOpen(true);
    } else {
      const itemPrice = Number(item.price) || 100;
      const cartItemId = `std-${item.id}`;
      setCart((prev) => {
        const existingIndex = prev.findIndex((c) => c.cartItemId === cartItemId);
        if (existingIndex > -1) {
          const next = [...prev];
          next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + 1 };
          return next;
        }
        return [...prev, { 
          cartItemId,
          id: item.id, 
          name: item.name, 
          price: itemPrice, 
          quantity: 1 
        }];
      });
      toast.success(`Added ${item.name}!`);
    }
  };

  const handleAddCustomizedItemToCart = () => {
    if (!selectedProductForVariation) return;
    triggerBeep('tap');

    let finalItemPrice = selectedSizePrice;
    const activeAddonsList: string[] = [];

    Object.entries(selectedAddons).forEach(([addon, isSelected]) => {
      if (isSelected) {
        const cost = PIZZA_ADDONS[selectedSize.toLowerCase()]?.[addon] || 20;
        finalItemPrice += cost;
        activeAddonsList.push(addon);
      }
    });

    const baseName = selectedProductForVariation.name;
    const sizeSuffix = selectedSize && selectedSize !== 'Standard' ? `(${selectedSize.toUpperCase()})` : '';
    const fullName = `${baseName} ${sizeSuffix}`.trim();

    const noteParts: string[] = [];
    if (activeAddonsList.length > 0) noteParts.push(`Add-ons: ${activeAddonsList.join(', ')}`);
    if (itemNoteInput) noteParts.push(`Note: ${itemNoteInput}`);

    const combinedNote = noteParts.join(' | ');
    const cartItemId = `${selectedProductForVariation.id}-${selectedSize}-${combinedNote}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], quantity: next[existingIndex].quantity + 1 };
        return next;
      }
      return [...prev, { 
        cartItemId,
        id: selectedProductForVariation.id, 
        name: fullName, 
        price: finalItemPrice, 
        quantity: 1, 
        size: selectedSize,
        note: combinedNote 
      }];
    });

    setIsVariationModalOpen(false);
    setSelectedProductForVariation(null);
    toast.success(`Added ${fullName}!`);
  };

  const handleUpdateCartQuantity = (cartItemId: string, amount: number) => {
    triggerBeep('tap');
    setCart((prev) => prev.map((item) => {
      if (item.cartItemId === cartItemId) {
        const updatedQty = item.quantity + amount;
        return updatedQty > 0 ? { ...item, quantity: updatedQty } : null;
      }
      return item;
    }).filter(Boolean) as PosCartItem[]);
  };

  const handleCheckLoyalty = async () => {
    triggerBeep('tap');
    const cleanPhone = getSanitizedPhone(customerPhone);
    if (cleanPhone.length !== 10) return toast.error("Enter a valid 10-digit phone!");
    
    const toastId = toast.loading("Finding customer...");
    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      const docSnap = await getDoc(userRef);
      toast.dismiss(toastId);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomerName(data.name || '');
        setCustomerPoints(data.points || 0);
        setAddress(data.address || '');
        setShowNewCustForm(false);
        setIsRedeemingPoints(false);
        setPointsToRedeem(0);
        toast.success(`Found: ${data.name} (${data.points || 0} Pts)`);
      } else {
        setCustomerName('');
        setCustomerPoints(0);
        setIsRedeemingPoints(false);
        setPointsToRedeem(0);
        setShowNewCustForm(true);
        toast("New customer! Enter details to register.", { icon: 'ℹ️' });
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Failed to connect to database");
    }
  };

  const handleSaveNewCustomerQuick = async () => {
    const cleanPhone = getSanitizedPhone(customerPhone);
    const nameTrim = newCustNameInput.trim();
    if (!nameTrim) return toast.error("Enter customer name!");

    const toastId = toast.loading("Saving customer...");
    try {
      const userRef = doc(db, "customer_points", cleanPhone);
      await setDoc(userRef, {
        name: nameTrim,
        phone: cleanPhone,
        address: newCustAddressInput.trim(),
        points: 0,
        lastActive: new Date()
      }, { merge: true });

      setCustomerName(nameTrim);
      setAddress(newCustAddressInput.trim());
      setCustomerPoints(0);
      setShowNewCustForm(false);
      setNewCustNameInput('');
      setNewCustAddressInput('');
      toast.dismiss(toastId);
      toast.success("Customer saved & linked! ✅");
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to save customer");
    }
  };

  const getDailyTokenNumber = () => {
    const todayStr = new Date().toDateString();
    let lastResetDate = localStorage.getItem("bb_pos_token_reset_date");
    let currentTokenSeq = Number(localStorage.getItem("bb_pos_daily_token_seq") || "0");

    if (lastResetDate !== todayStr) {
      currentTokenSeq = 1;
      localStorage.setItem("bb_pos_token_reset_date", todayStr);
    } else {
      currentTokenSeq += 1;
    }
    localStorage.setItem("bb_pos_daily_token_seq", String(currentTokenSeq));
    return currentTokenSeq;
  };

  // THERMAL PRINTING WITH 68MM SAFE MARGIN
  const handlePrintReceiptDirect = async (orderObj: any, isKot = false): Promise<void> => {
    return new Promise((resolve) => {
      if (!orderObj || !orderObj.items || orderObj.items.length === 0) return resolve();

      const printWindow = window.open('', '_blank', 'width=420,height=700');
      if (!printWindow) {
        toast.error("Popup blocked! Allow popups for thermal printing.");
        return resolve();
      }

      printWindow.document.write('<!DOCTYPE html><html><head><title>Print Receipt</title>');
      
      // Strict 68mm Safe Width to prevent right-edge clipping
      printWindow.document.write(`
        <style>
          @page { 
            size: 80mm auto; 
            margin: 0mm !important; 
          }
          * { 
            font-family: Verdana, Geneva, Tahoma, sans-serif !important;
            box-sizing: border-box;
          }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 80mm !important; 
            background: #ffffff !important;
            color: #000000 !important;
            height: auto !important;
            min-height: 0 !important;
          }
          #print-root { 
            width: 68mm !important; 
            max-width: 68mm !important; 
            margin-left: 2mm !important; 
            padding-right: 2mm !important; 
          }
        </style>
      `);

      Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach((styleTag) => {
        printWindow.document.write(styleTag.outerHTML);
      });

      printWindow.document.write('</head><body><div id="print-root"></div></body></html>');
      printWindow.document.close();

      const container = printWindow.document.getElementById('print-root');
      if (container) {
        const root = createRoot(container);
        if (isKot) {
          root.render(<PrintKitchenKot orderObj={orderObj} />);
        } else {
          root.render(<PrintCustomerReceipt orderObj={orderObj} currentUser={currentUser} />);
        }

        const triggerPrintWhenImagesReady = () => {
          const images = Array.from(printWindow.document.images);
          if (images.length === 0) {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
            resolve();
            return;
          }

          let loadedCount = 0;
          const checkDone = () => {
            loadedCount++;
            if (loadedCount >= images.length) {
              printWindow.focus();
              printWindow.print();
              printWindow.close();
              resolve();
            }
          };

          images.forEach((img) => {
            if (img.complete) {
              checkDone();
            } else {
              img.onload = checkDone;
              img.onerror = checkDone;
            }
          });

          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
            resolve();
          }, 1000);
        };

        setTimeout(triggerPrintWhenImagesReady, 150);
      } else {
        resolve();
      }
    });
  };

  // SAVE TABLE ORDER KOT ONLY
  const handleSaveTableOrderKotOnly = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const finalTotal = getTotalBillPrice();
    const discountAmt = getCalculatedDiscountAmount();
    const token = getDailyTokenNumber();

    try {
      let billNumber: number;

      if (activeEditingOrderId) {
        billNumber = activeEditingBillNumber || 5001;
        const orderRef = doc(db, "orders", activeEditingOrderId);
        const updatedOrderObj = { 
          items: cart, 
          subtotal, 
          discountType,
          discountValue,
          discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, 
          gstAmount: getGstAmountCalculated(), 
          total: finalTotal, 
          tableNumber: tableNumber,
          customerName: customerName || "Walk-in Guest",
          customerPhone: customerPhone ? `+91${getSanitizedPhone(customerPhone)}` : "",
          lastUpdated: new Date()
        };

        await updateDoc(orderRef, updatedOrderObj);
        triggerBeep('success');
        toast.success(`Table ${tableNumber} updated! KOT printed.`);

        await handlePrintReceiptDirect({ ...updatedOrderObj, billNumber, tokenNumber: token, fulfillmentType: 'table' }, true);

        setActiveEditingOrderId(null);
        setActiveEditingBillNumber(null);
      } else {
        billNumber = Number(localStorage.getItem("bb_pos_local_bill_counter_pc") || 5000) + 1;
        localStorage.setItem("bb_pos_local_bill_counter_pc", String(billNumber));

        const orderObj = { 
          billNumber, tokenNumber: token, customerName: customerName || "Walk-in Guest", 
          customerPhone: customerPhone ? `+91${getSanitizedPhone(customerPhone)}` : "", items: cart, 
          subtotal, discountType, discountValue, discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, gstAmount: getGstAmountCalculated(), 
          deliveryFee: 0, total: finalTotal, timestamp: new Date(), 
          status: 'pending', fulfillmentType: 'table', deliveryArea: "", 
          tableNumber: tableNumber, paymentMethod, source: 'PC_POS', address: '' 
        };

        await addDoc(collection(db, "orders"), orderObj);
        triggerBeep('success');
        toast.success(`Table ${tableNumber} saved! KOT sent.`);

        await handlePrintReceiptDirect(orderObj, true);
      }

      setCart([]); setCustomerPhone(''); setCustomerName(''); setDiscountValue(0);
      setIsRedeemingPoints(false); setPointsToRedeem(0);
      localStorage.removeItem("bb_pos_saved_cart_pc");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save table order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // FINAL CHECKOUT & PAY [F9] (WITH LOYALTY SAVED)
  const handleFinalCheckoutAndPrintBill = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const finalTotal = getTotalBillPrice();
    const discountAmt = getCalculatedDiscountAmount();
    const token = getDailyTokenNumber();
    const earned = Math.floor(finalTotal / 100);
    const redeemed = isRedeemingPoints ? pointsToRedeem : 0;
    const cleanPhone = getSanitizedPhone(customerPhone);

    try {
      let billNumber: number;

      let remainingPts = customerPoints;
      if (cleanPhone.length === 10) {
        const userRef = doc(db, "customer_points", cleanPhone);
        const userDoc = await getDoc(userRef);
        const prevPoints = userDoc.exists() ? (userDoc.data().points || 0) : 0;
        
        remainingPts = Math.max(0, prevPoints - redeemed) + earned;
        await setDoc(userRef, { 
          name: customerName || "Walk-in Guest", 
          phone: cleanPhone, 
          points: remainingPts, 
          lastActive: new Date() 
        }, { merge: true });
      }

      if (activeEditingOrderId) {
        billNumber = activeEditingBillNumber || 5001;
        const orderRef = doc(db, "orders", activeEditingOrderId);
        const finalOrderObj = { 
          items: cart, 
          subtotal, 
          discountType,
          discountValue,
          discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, 
          gstAmount: getGstAmountCalculated(), 
          total: finalTotal, 
          status: 'completed', 
          tableNumber: tableNumber,
          customerName: customerName || "Walk-in Guest",
          customerPhone: cleanPhone ? `+91${cleanPhone}` : "",
          paymentMethod,
          splitCashAmount: paymentMethod === 'split' ? splitCashAmount : 0,
          splitUpiAmount: paymentMethod === 'split' ? splitUpiAmount : 0,
          pointsEarned: earned,
          pointsRedeemed: redeemed,
          remainingPoints: remainingPts,
          settledAt: new Date()
        };

        await updateDoc(orderRef, finalOrderObj);
        triggerBeep('success');
        toast.success(`Table ${tableNumber} Settled! Bill #${billNumber} printed.`);

        await handlePrintReceiptDirect({ ...finalOrderObj, billNumber, tokenNumber: token, fulfillmentType: 'table' }, false);

        setActiveEditingOrderId(null);
        setActiveEditingBillNumber(null);
      } else {
        billNumber = Number(localStorage.getItem("bb_pos_local_bill_counter_pc") || 5000) + 1;
        localStorage.setItem("bb_pos_local_bill_counter_pc", String(billNumber));

        const orderObj = { 
          billNumber, tokenNumber: token, customerName: customerName || "Walk-in Guest", 
          customerPhone: cleanPhone ? `+91${cleanPhone}` : "", items: cart, 
          subtotal, discountType, discountValue, discountAmount: discountAmt, 
          gstRate: gstEnabled ? gstRate : 0, gstAmount: getGstAmountCalculated(), 
          deliveryFee: getDeliveryCharge(), total: finalTotal, timestamp: new Date(), 
          status: 'completed', fulfillmentType, deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "", 
          tableNumber: fulfillmentType === 'table' ? tableNumber : '', 
          paymentMethod, 
          splitCashAmount: paymentMethod === 'split' ? splitCashAmount : 0,
          splitUpiAmount: paymentMethod === 'split' ? splitUpiAmount : 0,
          source: 'PC_POS', address,
          pointsEarned: earned,
          pointsRedeemed: redeemed, 
          remainingPoints: remainingPts 
        };

        await addDoc(collection(db, "orders"), orderObj);
        triggerBeep('success'); 

        if (kotEnabled) {
          await handlePrintReceiptDirect(orderObj, true);
        }
        await handlePrintReceiptDirect(orderObj, false);
      }

      setCart([]); setCustomerPhone(''); setCustomerName(''); setCustomerPoints(0); setDiscountValue(0); setShowNewCustForm(false);
      setIsRedeemingPoints(false); setPointsToRedeem(0);
      localStorage.removeItem("bb_pos_saved_cart_pc");
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete checkout");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "products", productId), { isAvailable: !currentStatus });
      setProducts(prev => prev.map((p) => p.id === productId ? { ...p, isAvailable: !currentStatus } : p));
      toast.success("Stock status updated!");
    } catch (err) {
      toast.error("Failed");
    }
  };

  const handleToggleTheme = (mode: 'dark' | 'light') => {
    triggerBeep('tap'); setThemeMode(mode); localStorage.setItem("bb_pos_theme_pc", mode);
    if (mode === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  };

  const filteredPastReceipts = useMemo(() => pastReceipts.filter((o) => 
    String(o.billNumber || '').includes(receiptSearchQuery.trim()) || 
    String(o.customerPhone || '').includes(receiptSearchQuery.trim()) || 
    String(o.customerName || '').toLowerCase().includes(receiptSearchQuery.trim().toLowerCase())
  ), [pastReceipts, receiptSearchQuery]);

  const mainClass = "h-screen w-screen flex font-sans antialiased overflow-hidden " + (themeMode === "dark" ? "dark bg-[#0a0a0a] text-neutral-100" : "bg-neutral-100 text-neutral-900");

  const dynamicUpiUrl = useMemo(() => {
    const total = getTotalBillPrice();
    return `upi://pay?pa=${upiIdConfig}&pn=Bum%20Bum%20Cafe&am=${total}&cu=INR`;
  }, [upiIdConfig, cart, discountValue, isRedeemingPoints]);

  return (
    <div className={mainClass}>
      <Toaster position="top-right" />

      {!isLoggedIn ? (
        <div className="fixed inset-0 bg-neutral-950 text-white flex flex-col items-center justify-center p-4 z-50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-10 shadow-2xl space-y-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/20"><SafeLock size={36} /></div>
              <h1 className="text-2xl font-black uppercase text-yellow-500 tracking-wider">BUM BUM CAFE - PC POS</h1>
              <p className="text-xs text-neutral-400">Desktop Terminal Locked • Enter Staff PIN</p>
            </div>
            <form onSubmit={handlePinLoginSubmit} className="space-y-4">
              <input type="password" maxLength={6} value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter PIN" className="w-full bg-neutral-950 border border-neutral-800 text-center text-3xl font-mono py-4 rounded-2xl outline-none text-orange-400 tracking-widest" autoFocus />
              <button type="submit" className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-sm uppercase rounded-2xl tracking-wider transition-all shadow-lg">Unlock Terminal</button>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          {/* SIDEBAR NAVIGATION */}
          <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col justify-between p-4 shrink-0 select-none h-full transition-all duration-300 relative`}>
            
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              className="absolute -right-3 top-7 bg-orange-600 text-white p-1 rounded-full shadow-md hover:bg-orange-500 transition-all z-20"
            >
              {isSidebarCollapsed ? <SafeChevronRight size={14} /> : <SafeChevronLeft size={14} />}
            </button>

            <div className="space-y-6 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                <SafeDatabase className="text-orange-500 shrink-0" size={22} />
                {!isSidebarCollapsed && (
                  <div className="truncate">
                    <h1 className="text-xs font-black uppercase text-yellow-500 truncate">Bum Bum Cafe</h1>
                    <span className="text-[10px] text-neutral-400 font-bold">POS Pro v3.3</span>
                  </div>
                )}
              </div>

              <nav className="space-y-1.5">
                {[
                  { id: 'billing', label: 'Counter [F2]', icon: ShoppingBag },
                  { id: 'inventory', label: 'Menu & Add Items', icon: Layers },
                  { id: 'receipts', label: 'Past Receipts', icon: Printer },
                  { id: 'tables', label: `Tables (${activeTableOrders.length})`, icon: LayoutGrid },
                  { id: 'orders', label: `Live Orders (${activeLiveOrders.length})`, icon: Clock },
                  { id: 'reports', label: 'Reports & Cash', icon: SafeBarChart3 },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => { triggerBeep('tap'); setActiveTab(item.id as any); }} 
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${isActive ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon size={16} className="shrink-0" />
                        {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      {!isSidebarCollapsed && item.id === 'tables' && activeTablesCount > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">{activeTablesCount}</span>
                      )}
                      {!isSidebarCollapsed && item.id === 'orders' && pendingOrdersCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingOrdersCount}</span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {!isSidebarCollapsed && (
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase text-neutral-400">POS Tools</span>
                    <button onClick={() => setIsHelpModalOpen(true)} className="text-[10px] text-orange-500 font-bold hover:underline flex items-center gap-1">
                      <SafeHelpCircle size={12} /> Help [F1]
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => setIsHeldCartsModalOpen(true)} className="bg-neutral-100 dark:bg-neutral-800 hover:border-orange-500 border border-transparent p-2 rounded-xl text-[10px] font-bold flex items-center gap-1 text-left">
                      <SafePauseCircle size={13} className="text-amber-400 shrink-0" />
                      <span className="truncate">Parked ({heldCarts.length}) [F5]</span>
                    </button>
                    <button onClick={() => setIsExpenseModalOpen(true)} className="bg-neutral-100 dark:bg-neutral-800 hover:border-orange-500 border border-transparent p-2 rounded-xl text-[10px] font-bold flex items-center gap-1 text-left">
                      <Receipt size={13} className="text-red-400 shrink-0" />
                      <span className="truncate">Expense [F6]</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <button onClick={handleManualSync} disabled={isSyncing} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black uppercase text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all">
                {isSyncing ? <Loader2 className="animate-spin shrink-0" size={16} /> : <SafeRefreshCw size={16} />}
                {!isSidebarCollapsed && <span className="truncate">Sync Menu</span>}
              </button>
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-black uppercase text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all">
                <SafeLogOut size={16} className="shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Lock POS</span>}
              </button>
            </div>
          </aside>

          {/* MAIN WORKSPACE */}
          <main className="flex-1 flex h-full overflow-hidden">
            
            {/* TAB 1: BILLING COUNTER */}
            {activeTab === 'billing' && (
              <div className="flex-1 flex h-full overflow-hidden">
                <div className="flex-1 flex flex-col p-5 h-full overflow-hidden">
                  
                  {activeEditingOrderId && (
                    <div className="mb-3 bg-amber-500/15 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase">
                        <SafeEdit3 size={16} />
                        <span>Active Table: {tableNumber} (Bill #{activeEditingBillNumber})</span>
                      </div>
                      <button onClick={() => { setActiveEditingOrderId(null); setCart([]); }} className="text-neutral-400 hover:text-white text-xs underline">Clear Table</button>
                    </div>
                  )}

                  {/* SEARCH BAR */}
                  <div className="flex gap-3 mb-4 items-center shrink-0">
                    <div className="relative flex-1">
                      <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                      <input 
                        ref={searchInputRef}
                        type="text" 
                        placeholder="Search item / Type Code & hit [Enter]... [F2]" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchInputKeyDown} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:border-orange-500 shadow-sm" 
                      />
                    </div>
                    <button 
                      onClick={() => handleOpenItemEditor(null)} 
                      className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-1.5 shadow transition-all shrink-0"
                    >
                      <SafePlus size={16} /> Add Item
                    </button>
                  </div>

                  {/* CATEGORIES */}
                  <div className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button 
                          key={cat} 
                          onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }} 
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border shrink-0 transition-all ${isSelected ? "bg-orange-500 text-black border-orange-500 shadow-md shadow-orange-500/20" : "bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-200 dark:border-neutral-800 hover:text-orange-500"}`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* PRODUCTS GRID */}
                  {loading ? (
                    <div className="flex items-center justify-center flex-1"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                  ) : (
                    <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1 pr-2 content-start">
                      {filteredMenu.map((item) => {
                        const isAvail = item.isAvailable !== false;
                        const imgUrl = item.image || item.imageUrl || item.img;
                        return (
                          <button 
                            key={item.id} 
                            disabled={!isAvail} 
                            onClick={() => handleItemClick(item)} 
                            className={`border rounded-2xl text-left flex flex-col overflow-hidden h-44 transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-sm ${isAvail ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-orange-500/50" : "opacity-40 bg-neutral-200 dark:bg-neutral-950 border-neutral-800 pointer-events-none"}`}
                          >
                            <div className="w-full h-24 bg-neutral-200 dark:bg-neutral-800 relative shrink-0 overflow-hidden flex items-center justify-center">
                              {imgUrl ? (
                                <img src={imgUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-neutral-400 text-xs font-black uppercase tracking-wider px-2 text-center">{item.category || "Cafe Item"}</span>
                              )}
                            </div>
                            <div className="p-3 flex-grow flex flex-col justify-between w-full">
                              <p className="font-bold text-xs line-clamp-2 leading-tight">{item.name}</p>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-mono font-black text-orange-500">₹{item.price}</span>
                                {item.itemCode && <span className="text-[9px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 font-mono">#{item.itemCode}</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT CART PANEL */}
                <div className="w-96 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col p-5 h-full shadow-2xl justify-between overflow-hidden">
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black uppercase text-orange-500">Cart ({cart.length})</h3>
                        <button onClick={handleHoldCurrentCart} title="Park Cart [F3]" className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-md border border-amber-500/30 flex items-center gap-1">
                          <SafePauseCircle size={11} /> Hold [F3]
                        </button>
                      </div>
                      <button onClick={() => setCart([])} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"><SafeTrash2 size={14} /> Clear</button>
                    </div>

                    {/* CUSTOMER PHONE & LOYALTY */}
                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-3 shrink-0">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          maxLength={10} 
                          placeholder="Phone (10-digits)" 
                          value={customerPhone} 
                          onChange={e => setCustomerPhone(e.target.value)} 
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none font-mono" 
                        />
                        <button onClick={handleCheckLoyalty} className="bg-orange-600 hover:bg-orange-500 text-white px-3 rounded-xl text-xs font-black uppercase">Find</button>
                        <button onClick={() => handleSendWhatsAppBill()} title="Send WhatsApp Receipt [F7]" className="bg-green-600/10 hover:bg-green-600/20 text-green-500 px-2.5 rounded-xl text-xs font-bold flex items-center">
                          <SafeShare2 size={14} />
                        </button>
                      </div>

                      {customerName && !showNewCustForm && (
                        <div className="flex justify-between items-center text-xs font-bold text-yellow-500 pt-1 border-t border-neutral-200 dark:border-neutral-700">
                          <span>👤 {customerName}</span>
                          <span>⭐ Pts: {customerPoints}</span>
                        </div>
                      )}

                      {/* ⭐ LOYALTY POINTS REDEEM BOX ⭐ */}
                      {customerName && customerPoints > 0 && !showNewCustForm && (
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <SafeGift size={14} />
                            <span>Redeem ({customerPoints} Pts):</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              min={1} 
                              max={customerPoints}
                              value={pointsToRedeem || ''}
                              onChange={e => setPointsToRedeem(Math.min(Number(e.target.value), customerPoints))}
                              placeholder="Pts"
                              className="w-16 bg-white dark:bg-neutral-900 border border-neutral-700 rounded-lg p-1 text-center font-mono text-xs text-white outline-none"
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (!isRedeemingPoints && pointsToRedeem > 0) {
                                  setIsRedeemingPoints(true);
                                  toast.success(`${pointsToRedeem} Pts Redeemed (₹${pointsToRedeem} Off)!`);
                                } else {
                                  setIsRedeemingPoints(false);
                                  setPointsToRedeem(0);
                                  toast("Points redemption cancelled");
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${isRedeemingPoints ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}
                            >
                              {isRedeemingPoints ? 'Cancel' : 'Apply'}
                            </button>
                          </div>
                        </div>
                      )}

                      {showNewCustForm && (
                        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                          <p className="text-[10px] text-red-400 font-bold uppercase">Unregistered number! Add details:</p>
                          <input 
                            type="text" 
                            placeholder="Customer Name *" 
                            value={newCustNameInput} 
                            onChange={e => setNewCustNameInput(e.target.value)} 
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs outline-none" 
                          />
                          <button 
                            onClick={handleSaveNewCustomerQuick} 
                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1 shadow"
                          >
                            <SafeUserPlus size={14} /> Save Customer
                          </button>
                        </div>
                      )}
                    </div>

                    {/* CART ITEMS */}
                    <div className="space-y-2 overflow-y-auto flex-1 pr-1 mb-3">
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400 text-xs text-center py-10">
                          <ShoppingBag size={32} className="mb-2 opacity-40" />
                          <p>Cart is empty. Click items from menu to add.</p>
                        </div>
                      ) : (
                        cart.map((item) => (
                          <div key={item.cartItemId} className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-2xl flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate">{item.name}</p>
                              {item.note && <p className="text-[10px] text-neutral-400 italic truncate">{item.note}</p>}
                              <p className="text-[11px] font-mono text-orange-500 font-bold">₹{item.price * item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => handleUpdateCartQuantity(item.cartItemId, -1)} className="w-7 h-7 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">-</button>
                              <span className="w-6 text-center text-xs font-mono font-bold">{item.quantity}</span>
                              <button onClick={() => handleUpdateCartQuantity(item.cartItemId, 1)} className="w-7 h-7 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center font-bold text-xs">+</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* DISCOUNT OPTION */}
                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-3 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase text-neutral-400">Discount Option</span>
                        <div className="flex bg-neutral-200 dark:bg-neutral-700 p-0.5 rounded-lg">
                          <button onClick={() => setDiscountType('amount')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${discountType === 'amount' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}>₹ Flat</button>
                          <button onClick={() => setDiscountType('percentage')} className={`px-2 py-0.5 text-[10px] font-bold rounded ${discountType === 'percentage' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}>% Off</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          placeholder={discountType === 'amount' ? "Enter Amount (₹)" : "Enter Percentage (%)"}
                          value={discountValue || ''}
                          onChange={e => setDiscountValue(Number(e.target.value))}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs outline-none font-mono" 
                        />
                        {discountValue > 0 && (
                          <button onClick={() => setDiscountValue(0)} className="text-red-400 text-xs font-bold px-2">Clear</button>
                        )}
                      </div>
                    </div>

                    {/* FULFILLMENT MODE */}
                    <div className="space-y-2 mb-3 shrink-0 border-t border-neutral-200 dark:border-neutral-800 pt-2">
                      <div className="grid grid-cols-3 gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl">
                        {(['pickup', 'table', 'delivery'] as const).map((type) => (
                          <button key={type} onClick={() => { triggerBeep('tap'); setFulfillmentType(type); }} className={`py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${fulfillmentType === type ? "bg-orange-600 text-white shadow-md" : "text-neutral-400"}`}>{type}</button>
                        ))}
                      </div>

                      {fulfillmentType === 'table' && (
                        <input type="text" placeholder="Table No (e.g. Table 4)" value={tableNumber} onChange={e => setTableNumber(e.target.value)} className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 text-xs outline-none" />
                      )}
                    </div>

                    {/* BREAKDOWN TOTALS */}
                    <div className="space-y-1.5 text-xs border-t border-neutral-200 dark:border-neutral-800 pt-2 shrink-0">
                      <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span className="font-mono">₹{getCartSubtotal()}</span></div>
                      {getCalculatedDiscountAmount() > 0 && (
                        <div className="flex justify-between text-orange-400 font-bold"><span>Discount</span><span className="font-mono">-₹{getCalculatedDiscountAmount()}</span></div>
                      )}
                      {isRedeemingPoints && (
                        <div className="flex justify-between text-amber-400 font-bold"><span>Points Redeemed</span><span className="font-mono">-₹{getRedemptionDiscount()}</span></div>
                      )}
                      <div className="flex justify-between text-base font-black text-green-500 pt-1 border-t border-dashed border-neutral-700">
                        <span>Grand Total</span><span className="font-mono">₹{getTotalBillPrice()}</span>
                      </div>
                    </div>

                    {/* PAYMENT METHOD [F4] */}
                    <div className="space-y-2 my-2 shrink-0">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${paymentMethod === 'cash' ? 'bg-green-600 text-white border-green-600 shadow' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>Cash [F4]</button>
                        <button onClick={() => setPaymentMethod('upi')} className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${paymentMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>UPI [F4]</button>
                        <button onClick={() => setPaymentMethod('split')} className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${paymentMethod === 'split' ? 'bg-amber-600 text-white border-amber-600 shadow' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}>Split [F4]</button>
                      </div>

                      {paymentMethod === 'split' && (
                        <div className="grid grid-cols-2 gap-2 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl">
                          <div>
                            <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">Cash Part (₹)</label>
                            <input 
                              type="number" 
                              value={splitCashAmount} 
                              onChange={e => {
                                const val = Number(e.target.value);
                                setSplitCashAmount(val);
                                setSplitUpiAmount(Math.max(0, getTotalBillPrice() - val));
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-xs text-center font-mono" 
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase text-neutral-400 block mb-1">UPI Part (₹)</label>
                            <input 
                              type="number" 
                              value={splitUpiAmount} 
                              onChange={e => {
                                const val = Number(e.target.value);
                                setSplitUpiAmount(val);
                                setSplitCashAmount(Math.max(0, getTotalBillPrice() - val));
                              }}
                              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 text-xs text-center font-mono" 
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* EXTRA TOOLS */}
                    <div className="grid grid-cols-2 gap-2 mb-2 shrink-0">
                      <button onClick={() => setIsQrModalOpen(true)} className="py-2 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-1.5">
                        <SafeQrCode size={14} /> Show QR [F8]
                      </button>
                      <button onClick={() => setIsChangeModalOpen(true)} className="py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl text-[11px] font-black uppercase flex items-center justify-center gap-1.5">
                        <SafeCalculator size={14} /> Change [F10]
                      </button>
                    </div>

                    {/* CHECKOUT ACTION BUTTONS [F9] */}
                    {fulfillmentType === 'table' ? (
                      <div className="space-y-2 shrink-0">
                        <button onClick={handleSaveTableOrderKotOnly} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
                          {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <SafePrinter size={16} />}
                          <span>Save Table & Print KOT</span>
                        </button>
                        <button onClick={handleFinalCheckoutAndPrintBill} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                          {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <SafeFileText size={16} />}
                          <span>Settle & Print Final (₹{getTotalBillPrice()}) [F9]</span>
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleFinalCheckoutAndPrintBill} disabled={cart.length === 0 || isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3.5 rounded-2xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 shrink-0">
                        {isSubmittingOrder ? <Loader2 className="animate-spin" size={16} /> : <Receipt size={16} />}
                        <span>Pay & Print Bill (₹{getTotalBillPrice()}) [F9]</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MANAGE MENU & PRODUCTS */}
            {activeTab === 'inventory' && (
              <div className="flex-1 p-6 h-full overflow-y-auto space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h2 className="text-sm font-black uppercase text-orange-500">Menu Items & Stock Manager</h2>
                    <p className="text-xs text-neutral-400">Add new food items with variations/sizes, toggle stock status, or edit prices.</p>
                  </div>
                  <button 
                    onClick={() => handleOpenItemEditor(null)} 
                    className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-1.5 shadow"
                  >
                    <SafePackagePlus size={16} /> + Add New Item
                  </button>
                </div>

                <div className="relative">
                  <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search menu by item name, category or code..." 
                    value={inventorySearchQuery}
                    onChange={e => setInventorySearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {filteredInventoryProducts.map((item) => {
                    const isAvail = item.isAvailable !== false;
                    const variantsCount = item.variants && typeof item.variants === 'object' ? Object.keys(item.variants).length : 0;
                    return (
                      <div key={item.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                          <div className="flex justify-between items-start mb-1.5">
                            <div>
                              <p className="font-bold text-xs text-neutral-100">{item.name}</p>
                              {item.itemCode && <p className="text-[10px] font-mono text-yellow-500 font-bold">Code: #{item.itemCode}</p>}
                            </div>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isAvail ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              {isAvail ? 'In Stock' : 'Out'}
                            </span>
                          </div>
                          
                          <p className="text-xs font-mono text-orange-500 font-black mb-1">₹{item.price}</p>
                          <p className="text-[10px] text-neutral-400">Category: {item.category || 'General'}</p>

                          {variantsCount > 0 && (
                            <div className="mt-2 pt-2 border-t border-dashed border-neutral-800">
                              <p className="text-[10px] font-bold text-amber-400 uppercase">Sizes / Variants ({variantsCount}):</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.entries(item.variants).map(([vName, vPrice]: any) => (
                                  <span key={vName} className="text-[9px] bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700 font-mono">
                                    {vName}: ₹{vPrice}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                          <button 
                            onClick={() => handleOpenItemEditor(item)} 
                            className="flex-1 bg-neutral-200 dark:bg-neutral-800 hover:bg-orange-600 hover:text-white py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1"
                          >
                            <SafeEdit3 size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => handleToggleStock(item.id, isAvail)} 
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${isAvail ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'}`}
                          >
                            {isAvail ? 'Disable' : 'Enable'}
                          </button>
                          <button 
                            onClick={() => handleDeleteProductFromMenu(item.id)} 
                            className="p-1.5 text-red-400 hover:text-red-300"
                          >
                            <SafeTrash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: PAST RECEIPTS & REPRINT */}
            {activeTab === 'receipts' && (
              <div className="flex-1 p-6 h-full flex flex-col overflow-hidden space-y-4">
                <div className="flex justify-between items-center border-b pb-3 shrink-0">
                  <div>
                    <h2 className="text-sm font-black uppercase text-orange-500 flex items-center gap-2">
                      <Printer size={18} /> Past Receipts & Old Bill Reprints
                    </h2>
                    <p className="text-xs text-neutral-400">Search past bills, inspect ordered items, reprint thermal receipts or KOT, and resend WhatsApp bills.</p>
                  </div>
                  <button 
                    onClick={fetchPastReceipts} 
                    disabled={isReceiptsLoading} 
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 border border-neutral-700"
                  >
                    {isReceiptsLoading ? <Loader2 className="animate-spin" size={14} /> : <SafeRefreshCw size={14} />} Refresh
                  </button>
                </div>

                <div className="flex gap-3 shrink-0">
                  <div className="relative flex-1">
                    <SafeSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search past bills by Bill No, Customer Name or Phone..." 
                      value={receiptSearchQuery} 
                      onChange={e => setReceiptSearchQuery(e.target.value)} 
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none" 
                    />
                  </div>
                  <select 
                    value={receiptsLimit} 
                    onChange={e => setReceiptsLimit(Number(e.target.value))} 
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                  >
                    <option value={30}>Last 30 Bills</option>
                    <option value={50}>Last 50 Bills</option>
                    <option value={100}>Last 100 Bills</option>
                  </select>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {isReceiptsLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                  ) : filteredPastReceipts.length === 0 ? (
                    <div className="text-center py-24 text-neutral-500 font-bold text-xs">
                      No matching receipts found.
                    </div>
                  ) : (
                    filteredPastReceipts.map((order) => {
                      const orderDate = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp || Date.now());
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => { setSelectedReceipt(order); setIsReceiptModalOpen(true); }} 
                          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-orange-500/50 p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all shadow-sm"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-yellow-500 text-sm">Bill #{order.billNumber || 'N/A'}</span>
                              <span className="text-neutral-400">•</span>
                              <span className="font-bold text-xs">{order.customerName || 'Walk-in Guest'}</span>
                              {order.customerPhone && <span className="text-[10px] text-neutral-400 font-mono">({order.customerPhone})</span>}
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 ml-1">
                                {order.fulfillmentType || 'pickup'}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono block mt-1">
                              {orderDate.toLocaleString()} • {order.items?.length || 0} Items
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${order.paymentMethod === 'upi' ? 'bg-blue-500/10 text-blue-400' : order.paymentMethod === 'split' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>
                              {order.paymentMethod || 'cash'}
                            </span>
                            <span className="font-mono font-black text-sm text-green-400">₹{order.total}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceipt(order);
                                setIsReceiptModalOpen(true);
                              }} 
                              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl"
                            >
                              <SafeEye size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: REPORTS & CASH DRAWER */}
            {activeTab === 'reports' && (
              <div className="flex-1 p-6 h-full overflow-y-auto max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h2 className="text-lg font-black uppercase text-orange-500 flex items-center gap-2">
                      <SafeBarChart3 size={20} /> Sales Reports & Cash Drawer Audit
                    </h2>
                    <p className="text-xs text-neutral-400">Total sale, payment modes, daily petty cash expenses and drawer balance.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSendOwnerSummary} className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 shadow">
                      <SafeSend size={14} /> Send WhatsApp to Owner
                    </button>
                    <div className="flex bg-neutral-800 p-1 rounded-2xl border border-neutral-700">
                      <button onClick={() => setReportFilter('today')} className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${reportFilter === 'today' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}>Today</button>
                      <button onClick={() => setReportFilter('yesterday')} className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${reportFilter === 'yesterday' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}>Yesterday</button>
                      <button onClick={() => setReportFilter('custom')} className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition-all ${reportFilter === 'custom' ? 'bg-orange-600 text-white' : 'text-neutral-400'}`}>Custom</button>
                    </div>
                  </div>
                </div>

                {isReportLoading ? (
                  <div className="flex justify-center py-24"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl space-y-1 shadow-lg">
                        <p className="text-[10px] font-black uppercase text-neutral-400">Total Sales</p>
                        <p className="text-2xl font-black font-mono text-green-400">₹{reportSummary.totalSale}</p>
                        <p className="text-[10px] text-neutral-500">{reportSummary.totalOrdersCount} Completed Orders</p>
                      </div>
                      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl space-y-1 shadow-lg">
                        <p className="text-[10px] font-black uppercase text-neutral-400">Gross Cash Sale</p>
                        <p className="text-2xl font-black font-mono text-amber-400">₹{reportSummary.cashSale}</p>
                        <p className="text-[10px] text-neutral-500">Collected at counter</p>
                      </div>
                      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl space-y-1 shadow-lg">
                        <p className="text-[10px] font-black uppercase text-neutral-400">UPI / Online</p>
                        <p className="text-2xl font-black font-mono text-blue-400">₹{reportSummary.upiSale}</p>
                        <p className="text-[10px] text-neutral-500">Bank Settlements</p>
                      </div>
                      <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl space-y-1 shadow-lg">
                        <p className="text-[10px] font-black uppercase text-red-400">Expenses Deducted</p>
                        <p className="text-2xl font-black font-mono text-red-400">-₹{reportSummary.totalExpenseAmount}</p>
                        <p className="text-[10px] text-neutral-500">{dailyExpenses.length} Drawer Vouchers</p>
                      </div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl space-y-4 shadow-xl">
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                        <div>
                          <h3 className="text-xs font-black uppercase text-yellow-400">Cash Drawer Audit (गल्ला मिलान)</h3>
                          <p className="text-[11px] text-neutral-400">Net Expected Cash = Cash Sales (₹{reportSummary.cashSale}) - Expenses (₹{reportSummary.totalExpenseAmount}) = <span className="font-mono text-green-400 font-bold">₹{reportSummary.netCashInDrawer}</span></p>
                        </div>
                        <button onClick={() => setIsExpenseModalOpen(true)} className="px-3 py-1.5 bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/30 rounded-xl text-xs font-black uppercase">
                          + Add Expense [F6]
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          placeholder="Counted Cash in Drawer (₹)" 
                          value={physicalCashInput}
                          onChange={e => setPhysicalCashInput(e.target.value === '' ? '' : Number(e.target.value))}
                          className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none" 
                        />
                        {physicalCashInput !== '' && (
                          <div className={`text-xs font-black px-4 py-2.5 rounded-xl border ${Number(physicalCashInput) === reportSummary.netCashInDrawer ? 'bg-green-500/10 text-green-400 border-green-500/30' : Number(physicalCashInput) > reportSummary.netCashInDrawer ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                            {Number(physicalCashInput) === reportSummary.netCashInDrawer ? '✅ Cash Matched Perfectly!' : Number(physicalCashInput) > reportSummary.netCashInDrawer ? `⚠️ Excess: +₹${Number(physicalCashInput) - reportSummary.netCashInDrawer}` : `❌ Shortage: -₹${reportSummary.netCashInDrawer - Number(physicalCashInput)}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 5: TABLES MANAGER */}
            {activeTab === 'tables' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-black uppercase text-amber-500">Active Tables ({activeTableOrders.length})</h2>
                </div>
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeTableOrders.length === 0 ? (
                    <div className="col-span-4 text-center py-24 text-neutral-500 font-bold">No active tables right now.</div>
                  ) : (
                    activeTableOrders.map((order) => (
                      <div key={order.id} className="bg-white dark:bg-neutral-900 border border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
                        <div>
                          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
                            <span className="font-mono font-black text-amber-400 text-sm">🪑 {order.tableNumber}</span>
                            <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase px-2 py-0.5 rounded">Bill #{order.billNumber}</span>
                          </div>
                          <p className="text-xs font-bold mb-2">👤 {order.customerName || 'Walk-in'}</p>
                          <div className="space-y-1.5 py-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 mb-3 max-h-40 overflow-y-auto">
                            {order.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span className="truncate pr-2">{it.name}</span>
                                <span className="font-bold text-orange-500 shrink-0">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                          <div className="flex justify-between text-xs font-black text-green-500">
                            <span>Total Amount:</span>
                            <span className="font-mono text-sm">₹{order.total}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setActiveEditingOrderId(order.id);
                              setActiveEditingBillNumber(order.billNumber);
                              setTableNumber(order.tableNumber || 'Table 1');
                              setFulfillmentType('table');
                              setCart(order.items || []);
                              setActiveTab('billing');
                            }} 
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-2.5 rounded-xl text-xs uppercase flex items-center justify-center gap-1 shadow"
                          >
                            <SafeEdit3 size={14} /> Add Items & Settle
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 6: LIVE ORDERS */}
            {activeTab === 'orders' && (
              <div className="flex-1 p-6 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-sm font-black uppercase text-orange-500">Live Delivery & Pickup Orders ({activeLiveOrders.length})</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {activeLiveOrders.length === 0 ? (
                    <div className="col-span-3 text-center py-24 text-neutral-500 font-bold">No active delivery or pickup orders right now.</div>
                  ) : (
                    activeLiveOrders.map((order) => (
                      <div key={order.id} className={`bg-white dark:bg-neutral-900 border rounded-2xl p-4 flex flex-col justify-between shadow-lg ${order.status === 'pending' ? 'border-red-500 animate-pulse' : 'border-neutral-200 dark:border-neutral-800'}`}>
                        <div>
                          <div className="flex justify-between items-center border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
                            <span className="font-mono font-black text-yellow-500">Bill #{order.billNumber}</span>
                            <span className="bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase px-2 py-0.5 rounded">{order.fulfillmentType}</span>
                          </div>
                          <p className="text-xs font-bold mb-2">👤 {order.customerName} ({order.customerPhone || 'Walk-in'})</p>
                          <div className="space-y-1 py-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 mb-3 max-h-36 overflow-y-auto">
                            {order.items?.map((it: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs">
                                <span>{it.name}</span><span className="font-bold text-orange-500">x{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-black text-green-500 mb-3 pt-2 border-t">
                            <span>Total: ₹{order.total}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handlePrintReceiptDirect(order, false)} className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1">
                              <SafePrinter size={14} /> Print
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="flex-1 p-6 h-full overflow-y-auto flex justify-center">
                <div className="max-w-xl w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-xl space-y-6">
                  <h3 className="text-sm font-black uppercase text-orange-500">POS & Hardware Settings</h3>
                  
                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">Dynamic UPI ID (VPA for QR Code):</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={upiIdConfig} 
                        onChange={e => setUpiIdConfig(e.target.value)}
                        placeholder="e.g. Q231190930@ybl"
                        className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono outline-none" 
                      />
                      <button onClick={() => { localStorage.setItem("bb_pos_upi_id", upiIdConfig); toast.success("UPI ID Saved!"); }} className="bg-blue-600 text-white px-4 rounded-xl text-xs font-black uppercase">Save</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">Owner WhatsApp Number (for EOD Report):</p>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={ownerPhoneConfig} 
                        onChange={e => setOwnerPhoneConfig(e.target.value)}
                        placeholder="e.g. 919714293759"
                        className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono outline-none" 
                      />
                      <button onClick={() => { localStorage.setItem("bb_pos_owner_phone", ownerPhoneConfig); toast.success("Owner Phone Saved!"); }} className="bg-green-600 text-white px-4 rounded-xl text-xs font-black uppercase">Save</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">UI Theme:</p>
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-48">
                      <button onClick={() => handleToggleTheme('dark')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${themeMode === 'dark' ? 'bg-neutral-950 text-amber-400' : 'text-neutral-400'}`}>Dark</button>
                      <button onClick={() => handleToggleTheme('light')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${themeMode === 'light' ? 'bg-white text-orange-600' : 'text-neutral-400'}`}>Light</button>
                    </div>
                  </div>

                  <div className="space-y-2 border-b border-neutral-200 dark:border-neutral-800 pb-4">
                    <p className="text-xs font-bold uppercase">KOT Printing:</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">Print Kitchen Order Ticket on checkout:</span>
                      <button onClick={() => { const next = !kotEnabled; setKotEnabled(next); localStorage.setItem("bb_pos_kot_enabled_pc", String(next)); }} className="text-orange-500">
                        {kotEnabled ? <SafeToggleRight size={28} /> : <SafeToggleLeft size={28} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* ======================================================== */}
      {/*     ALL POPUP MODALS WITH CLICK-OUTSIDE & CANCEL BUTTON  */}
      {/* ======================================================== */}

      {/* MODAL 1: ADD / EDIT PRODUCT WITH DYNAMIC VARIATIONS */}
      <AnimatePresence>
        {isItemEditorModalOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsItemEditorModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto cursor-default"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-orange-500 flex items-center gap-2">
                  <SafePackagePlus size={18} />
                  <span>{editingItemObj ? 'Edit Menu Item' : 'Add New Item to Menu'}</span>
                </h3>
                <button onClick={() => setIsItemEditorModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <form onSubmit={handleSaveItemToFirestore} className="space-y-4 text-xs">
                <div>
                  <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Item Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Veg Cheese Pizza, Cold Coffee, Paneer Burger" 
                    value={itemNameInput} 
                    onChange={e => setItemNameInput(e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white outline-none" 
                    autoFocus 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Base Price (₹) *</label>
                    <input 
                      type="number" 
                      required 
                      min={0}
                      placeholder="100" 
                      value={itemPriceInput} 
                      onChange={e => setItemPriceInput(e.target.value === '' ? '' : Number(e.target.value))} 
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white font-mono text-sm outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Short Code / Barcode</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 101, PZ01" 
                      value={itemCodeInput} 
                      onChange={e => setItemCodeInput(e.target.value)} 
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white font-mono text-sm outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Category</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Fast Food, Pizza, Beverages" 
                      value={itemCatInput} 
                      onChange={e => setItemCatInput(e.target.value)} 
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Stock Status</label>
                    <button 
                      type="button" 
                      onClick={() => setItemIsAvailable(prev => !prev)} 
                      className={`w-full py-2.5 rounded-xl font-bold uppercase text-xs border ${itemIsAvailable ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}
                    >
                      {itemIsAvailable ? 'In Stock (उपलब्ध)' : 'Out of Stock (खत्म)'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Image URL (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/..." 
                    value={itemImageInput} 
                    onChange={e => setItemImageInput(e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white outline-none" 
                  />
                </div>

                {/* DYNAMIC VARIATIONS / SIZES BLOCK */}
                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-black uppercase text-[11px] text-yellow-400">Multiple Sizes / Variations?</span>
                      <p className="text-[10px] text-neutral-400">Small, Medium, Large या Half/Full अलग-अलग कीमत पर</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setHasVariants(!hasVariants)} 
                      className="text-orange-500"
                    >
                      {hasVariants ? <SafeToggleRight size={30} /> : <SafeToggleLeft size={30} />}
                    </button>
                  </div>

                  {hasVariants && (
                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl space-y-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase mr-1">Presets:</span>
                        <button type="button" onClick={() => handleApplyVariantPreset('pizza')} className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-bold border border-neutral-700">🍕 Pizza Sizes</button>
                        <button type="button" onClick={() => handleApplyVariantPreset('half_full')} className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-bold border border-neutral-700">🍲 Half / Full</button>
                        <button type="button" onClick={() => handleApplyVariantPreset('reg_large')} className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-bold border border-neutral-700">🥤 Regular / Large</button>
                      </div>

                      <div className="space-y-2">
                        {Object.entries(itemVariantsList).map(([size, price]: any) => (
                          <div key={size} className="flex justify-between items-center bg-neutral-900 px-3 py-2 rounded-xl border border-neutral-800">
                            <span className="font-bold text-neutral-200">{size}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-orange-400 font-bold">₹{price}</span>
                              <button type="button" onClick={() => handleRemoveVariantRow(size)} className="text-red-400 hover:text-red-300"><SafeTrash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <input 
                          type="text" 
                          placeholder="Size (e.g. Medium, 250ml)" 
                          value={newVariantName} 
                          onChange={e => setNewVariantName(e.target.value)} 
                          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none" 
                        />
                        <input 
                          type="number" 
                          placeholder="Price (₹)" 
                          value={newVariantPrice} 
                          onChange={e => setNewVariantPrice(e.target.value === '' ? '' : Number(e.target.value))} 
                          className="w-24 bg-neutral-900 border border-neutral-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none" 
                        />
                        <button 
                          type="button" 
                          onClick={handleAddVariantRow} 
                          className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-xl font-bold uppercase text-[10px]"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-800">
                  <button 
                    type="button" 
                    onClick={() => setIsItemEditorModalOpen(false)} 
                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black uppercase text-xs rounded-xl"
                  >
                    Cancel [Esc]
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-xl shadow-lg"
                  >
                    Save to Menu
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PAST RECEIPT DETAILS & REPRINT */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsReceiptModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-800 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default text-xs"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div>
                  <h3 className="font-black text-sm uppercase text-orange-400">Bill Details (# {selectedReceipt.billNumber || 'N/A'})</h3>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    {selectedReceipt.timestamp?.toDate ? selectedReceipt.timestamp.toDate().toLocaleString() : new Date(selectedReceipt.timestamp).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setIsReceiptModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <div className="space-y-1 bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                <p className="font-bold text-white">👤 {selectedReceipt.customerName || 'Walk-in Guest'} {selectedReceipt.customerPhone && `(${selectedReceipt.customerPhone})`}</p>
                <p className="text-[10px] text-neutral-400 uppercase font-mono">Mode: {selectedReceipt.fulfillmentType || 'pickup'} • Pay: {selectedReceipt.paymentMethod || 'cash'}</p>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedReceipt.items?.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <div>
                      <p className="font-bold text-white">{it.name}</p>
                      {it.note && <p className="text-[9px] text-neutral-400 italic">{it.note}</p>}
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-neutral-400">x{it.quantity}</span>
                      <p className="font-bold text-orange-400">₹{it.price * it.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 border-t border-neutral-800 pt-2 font-mono">
                <div className="flex justify-between text-neutral-400"><span>Subtotal:</span><span>₹{selectedReceipt.subtotal || selectedReceipt.total}</span></div>
                {selectedReceipt.discountAmount > 0 && <div className="flex justify-between text-orange-400"><span>Discount:</span><span>-₹{selectedReceipt.discountAmount}</span></div>}
                <div className="flex justify-between font-black text-sm text-green-400 pt-1 border-t border-dashed border-neutral-800">
                  <span>Grand Total:</span><span>₹{selectedReceipt.total}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                <button 
                  onClick={() => handlePrintReceiptDirect(selectedReceipt, false)} 
                  className="py-2.5 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
                >
                  <SafePrinter size={14} /> Print Bill
                </button>
                <button 
                  onClick={() => handlePrintReceiptDirect(selectedReceipt, true)} 
                  className="py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl flex items-center justify-center gap-1.5 shadow"
                >
                  <SafeFileText size={14} /> Print KOT
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleSendWhatsAppBill(selectedReceipt)} 
                  className="flex-1 py-2 bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-500/30 font-black uppercase text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <SafeShare2 size={14} /> Send WhatsApp Bill
                </button>
                <button 
                  onClick={() => setIsReceiptModalOpen(false)} 
                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black uppercase text-xs rounded-xl"
                >
                  Close [Esc]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: SHORTCUTS HELP SHEET [F1] */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsHelpModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 text-neutral-100 cursor-default"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-yellow-500 font-black text-sm uppercase">
                  <SafeHelpCircle size={18} />
                  <span>POS Keyboard Shortcuts (F1 - F10)</span>
                </div>
                <button onClick={() => setIsHelpModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
                {[
                  { key: 'F1', desc: 'Open this Shortcut Help Sheet' },
                  { key: 'F2', desc: 'Focus Item Search & hit [Enter] to quick-add' },
                  { key: 'F3', desc: 'Park / Hold active cart' },
                  { key: 'F4', desc: 'Toggle Payment Mode (Cash / UPI / Split)' },
                  { key: 'F5', desc: 'View & Recall Held / Parked Carts' },
                  { key: 'F6', desc: 'Add Daily Drawer Expense (दूध, बर्फ, सब्ज़ी)' },
                  { key: 'F7', desc: 'Send WhatsApp Receipt to customer phone' },
                  { key: 'F8', desc: 'Display Dynamic UPI QR Code on screen' },
                  { key: 'F9', desc: 'Quick Pay & Print Final Bill (+KOT)' },
                  { key: 'F10', desc: 'Cash Tender / Change Calculator (वापसी पैसे)' },
                  { key: 'Esc', desc: 'Close any active popup modal' },
                ].map((s) => (
                  <div key={s.key} className="flex justify-between items-center p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <span className="font-mono font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">{s.key}</span>
                    <span className="text-neutral-300">{s.desc}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setIsHelpModalOpen(false)} 
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black uppercase text-xs rounded-xl transition-all"
              >
                Close [Esc]
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: HELD / PARKED CARTS [F5] */}
      <AnimatePresence>
        {isHeldCartsModalOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsHeldCartsModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-800 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
                  <SafePauseCircle size={18} />
                  <span>Held / Parked Orders ({heldCarts.length}) [F5]</span>
                </div>
                <button onClick={() => setIsHeldCartsModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {heldCarts.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-10">No orders on hold right now.</p>
                ) : (
                  heldCarts.map((h) => (
                    <div key={h.id} className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{h.customerName}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">({h.heldAt})</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{h.cart.length} items • ₹{h.total}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRestoreHeldCart(h)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow">
                          <SafePlayCircle size={14} /> Resume
                        </button>
                        <button onClick={() => handleDeleteHeldCart(h.id)} className="p-1.5 text-red-400 hover:text-red-300">
                          <SafeTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button 
                onClick={() => setIsHeldCartsModalOpen(false)} 
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black uppercase text-xs rounded-xl transition-all"
              >
                Close [Esc]
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: QUICK DAILY EXPENSE ENTRY [F6] */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsExpenseModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-red-400 flex items-center gap-2">
                  <Receipt size={16} /> Daily Expense Entry [F6]
                </h3>
                <button onClick={() => setIsExpenseModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
                <div>
                  <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Expense Title / Item *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Milk 5L, Ice cubes, Veggies" 
                    value={expenseTitle} 
                    onChange={e => setExpenseTitle(e.target.value)} 
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white outline-none" 
                    autoFocus 
                  />
                </div>
                <div>
                  <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Amount Deducted from Drawer (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min={1} 
                    placeholder="e.g. 150" 
                    value={expenseAmount} 
                    onChange={e => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white font-mono text-sm outline-none" 
                  />
                </div>
                <div>
                  <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Category</label>
                  <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-white outline-none">
                    <option value="Milk / Dairy">Milk / Dairy</option>
                    <option value="Vegetables">Vegetables / Raw Food</option>
                    <option value="Staff Tea / Snacks">Staff Tea / Snacks</option>
                    <option value="Maintenance / Gas">Maintenance / Gas</option>
                    <option value="General">Other / General</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-2.5 bg-neutral-800 text-neutral-300 font-black uppercase text-xs rounded-xl">Cancel [Esc]</button>
                  <button type="submit" className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs rounded-xl shadow-lg">Save Voucher</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: DYNAMIC UPI QR CODE [F8] */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsQrModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 text-center cursor-default"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-blue-400 flex items-center gap-2">
                  <SafeQrCode size={16} /> Dynamic UPI Payment QR [F8]
                </h3>
                <button onClick={() => setIsQrModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-xl">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(dynamicUpiUrl)}`} 
                  alt="UPI QR Code" 
                  className="w-52 h-52 object-contain" 
                />
              </div>

              <div className="space-y-1">
                <p className="text-xl font-black font-mono text-green-400">₹{getTotalBillPrice()}</p>
                <p className="text-xs text-neutral-400">Scan via PhonePe, GPay, Paytm</p>
                <p className="text-[10px] text-neutral-500 font-mono">UPI: {upiIdConfig}</p>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setIsQrModalOpen(false)} 
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black uppercase text-xs rounded-xl"
                >
                  Close [Esc]
                </button>
                <button 
                  onClick={() => { setPaymentMethod('upi'); setIsQrModalOpen(false); toast.success("Switched to UPI mode!"); }} 
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs rounded-xl shadow"
                >
                  Confirm Paid
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: RETURN CHANGE CALCULATOR [F10] */}
      <AnimatePresence>
        {isChangeModalOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsChangeModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="font-black text-sm uppercase text-purple-400 flex items-center gap-2">
                  <SafeCalculator size={16} /> Return Change Calculator [F10]
                </h3>
                <button onClick={() => setIsChangeModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                  <span className="text-neutral-400">Bill Total:</span>
                  <span className="font-mono text-lg font-black text-white">₹{getTotalBillPrice()}</span>
                </div>

                <div>
                  <label className="text-neutral-400 uppercase font-black text-[10px] block mb-1">Customer Tendered Note (₹):</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 500" 
                    value={tenderCashAmount} 
                    onChange={e => setTenderCashAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-white font-mono text-lg font-bold outline-none text-center" 
                    autoFocus 
                  />
                </div>

                <div className="flex gap-2">
                  {[100, 200, 500, 2000].map(amt => (
                    <button key={amt} onClick={() => setTenderCashAmount(amt)} className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg font-mono font-bold text-xs text-neutral-300">
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {tenderCashAmount !== '' && (
                  <div className={`p-4 rounded-xl border text-center space-y-1 ${Number(tenderCashAmount) >= getTotalBillPrice() ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <p className="text-[10px] font-black uppercase text-neutral-400">
                      {Number(tenderCashAmount) >= getTotalBillPrice() ? 'Return to Customer (वापस करें):' : 'Pending Remaining Cash:'}
                    </p>
                    <p className={`text-2xl font-mono font-black ${Number(tenderCashAmount) >= getTotalBillPrice() ? 'text-green-400' : 'text-red-400'}`}>
                      ₹{Math.abs(Number(tenderCashAmount) - getTotalBillPrice())}
                    </p>
                  </div>
                )}

                <button 
                  onClick={() => setIsChangeModalOpen(false)} 
                  className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black uppercase text-xs rounded-xl transition-all mt-2"
                >
                  Done / Close [Esc]
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 8: BILLING VARIATION & COOKING TAGS */}
      <AnimatePresence>
        {isVariationModalOpen && selectedProductForVariation && (
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" 
            onClick={() => setIsVariationModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl space-y-4 cursor-default"
            >
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-sm uppercase text-orange-500">{selectedProductForVariation.name}</h3>
                <button onClick={() => setIsVariationModalOpen(false)} className="text-neutral-400 hover:text-white p-1"><SafeX size={18} /></button>
              </div>

              <div className="space-y-3">
                {selectedProductForVariation.variants && (
                  <div>
                    <label className="text-xs font-bold uppercase text-neutral-400 block mb-1.5">Size / Portion:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedProductForVariation.variants).map(([size, price]: any) => (
                        <button 
                          key={size}
                          onClick={() => {
                            setSelectedSize(size);
                            setSelectedSizePrice(Number(price) || 100);
                          }}
                          className={`py-2 rounded-xl text-xs font-black uppercase border transition-all ${selectedSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-600 text-white border-orange-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border-neutral-700'}`}
                        >
                          {size} (₹{price})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 block mb-1">Quick Cooking Instructions:</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COOKING_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setItemNoteInput(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:border-orange-500 border border-neutral-700 rounded-lg text-[10px] font-bold text-neutral-300 transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-neutral-400 block mb-1">Custom Note / Request:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Extra hot, Less sugar..." 
                    value={itemNoteInput}
                    onChange={e => setItemNoteInput(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs outline-none" 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsVariationModalOpen(false)} 
                  className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 font-black uppercase text-xs rounded-xl"
                >
                  Cancel [Esc]
                </button>
                <button 
                  onClick={handleAddCustomizedItemToCart} 
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow"
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOMER DIRECTORY MODAL */}
      <CustomerDirectoryModal 
        isCustomerModalOpen={isCustomerModalOpen} 
        setIsCustomerModalOpen={setIsCustomerModalOpen} 
        customerSearchQuery={customerSearchQuery} 
        setCustomerSearchQuery={setCustomerSearchQuery} 
        searchedCustomers={searchedCustomers} 
        isSearchingCustomer={isSearchingCustomer} 
        newCustName="" setNewCustName={() => {}} 
        newCustPhone="" setNewCustPhone={() => {}} 
        newCustAddress="" setNewCustAddress={() => {}} 
        editingCustomer={null} viewingHistoryCustomer={null} 
        customerHistoryList={[]} editCustPoints={0} 
        setEditCustPoints={() => {}} 
        handleSelectCustomer={(cust: any) => {
          setCustomerPhone(cust.phone); 
          setCustomerName(cust.name || ''); 
          setCustomerPoints(cust.points || 0); 
          setIsCustomerModalOpen(false);
        }} 
        handleLoadCustomerHistory={() => {}} 
        handleStartEditProfile={() => {}} 
        handleUpdateCustomerProfile={() => {}} 
        handleSaveNewCustomer={() => {}} 
        setViewingHistoryCustomer={() => {}} 
        setCustomerHistoryList={() => {}} 
        setEditingCustomer={() => {}} 
        searchDbCustomers={() => {}} 
        triggerBeep={triggerBeep}
      />
    </div>
  );
}
