'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, increment, getDoc, getDocs, where 
} from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Minus, Search, X, User, Star, Gift, 
  Loader2, Clock, Trash2, Printer, Check, Play, Settings, 
  Database, RefreshCw, Layers, Phone, MapPin, LayoutGrid, List,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

const DELIVERY_AREAS: DeliveryArea[] = [
  { name: "Mohandra Town", fee: 20, minFree: 99, range: "0-2 KM" },
  { name: "Within 5 KM (Bum Bum Cafe से 5km के दायरे में)", fee: 50, minFree: 499, range: "2-5 KM" },
  { name: "Within 12 KM (12km के दायरे में)", fee: 99, minFree: 999, range: "5-12 KM" }
];

const PIZZA_ADDONS: { [size: string]: { [addon: string]: number } } = {
  "small": { "Veg Add-on": 10, "Paneer": 20, "Black Olives": 20, "Jalapeno": 20, "Extra Cheese": 20, "Mushroom": 20 },
  "medium": { "Veg Add-on": 10, "Paneer": 30, "Black Olives": 30, "Jalapeno": 30, "Extra Cheese": 30, "Mushroom": 30 },
  "large": { "Veg Add-on": 20, "Paneer": 40, "Black Olives": 40, "Jalapeno": 40, "Extra Cheese": 40, "Mushroom": 40 },
  "extra large": { "Veg Add-on": 30, "Paneer": 50, "Black Olives": 50, "Jalapeno": 50, "Extra Cheese": 60, "Mushroom": 50 }
};

const QUICK_INSTRUCTION_TAGS = ["🌶️ Extra Spicy", "🧅 No Onion-Garlic", "🧀 Extra Cheese", "🔥 Well Baked", "🌱 Make it Mild"];

export default function BbCafePos() {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'orders' | 'billing' | 'inventory'>('billing');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); 
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); 

  // Database States
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Counter Billing States
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPoints, setCustomerPoints] = useState<number>(0);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [customDiscount, setCustomDiscount] = useState<number>(0);
  const [fulfillmentType, setFulfillmentType] = useState<'delivery' | 'pickup' | 'table'>('table');
  const [selectedArea, setSelectedArea] = useState<DeliveryArea>(DELIVERY_AREAS[0]);
  const [address, setAddress] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [chefInstructions, setChefInstructions] = useState<string>('');
  
  // POS Specific Add-ons
  const [ketchupAddon, setKetchupAddon] = useState<boolean>(false);
  const [oreganoAddon, setOreganoAddon] = useState<boolean>(false);
  const [chiliFlakesAddon, setChiliFlakesAddon] = useState<boolean>(false);
  const [noCutlery, setNoCutlery] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');

  // Dynamic Variation Selection States
  const [selectedProduct, setSelectedProduct] = useState<any>(null); 
  const [normalPizzaSize, setNormalPizzaSize] = useState<string>("");
  const [normalPizzaPrice, setNormalPizzaPrice] = useState<number>(0);
  const [normalPizzaAddons, setNormalPizzaAddons] = useState<{ [addon: string]: boolean }>({});
  const [customizerChefNote, setCustomizerChefNote] = useState<string>("");

  const triggerBeep = (type: 'tap' | 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      if (type === 'tap') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
      } else {
        osc.frequency.setValueAtTime(523, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.24);
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  // Live Orders Listener
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(60));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveOrders(ordersList);
    }, (error) => {
      console.error("Orders sync failed", error);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Menu Products
  useEffect(() => {
    const fetchDbData = async () => {
      setLoading(true);
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const items = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);

        const cats = Array.from(new Set(items.map((i: any) => i.category).filter(Boolean))) as string[];
        setCategories(['All', ...cats]);
      } catch (err) {
        toast.error("Error loading products");
      } finally {
        setLoading(false);
      }
    };
    fetchDbData();
  }, [activeTab]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Order updated to ${nextStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleCheckLoyalty = async () => {
    triggerBeep('tap');
    if (customerPhone.trim().length !== 10) {
      toast.error("Please enter a valid 10-digit number!");
      return;
    }
    const phoneClean = customerPhone.trim();
    const toastId = toast.loading("Checking loyalty points...");
    try {
      const docSnap = await getDoc(doc(db, "customer_points", phoneClean));
      toast.dismiss(toastId);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomerName(data.name || '');
        setCustomerPoints(data.points || 0);
        toast.success(`Member Found! Points: ${data.points || 0}`);
      } else {
        setCustomerName('');
        setCustomerPoints(0);
        toast.success("New Guest profile initialized!");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Error checking loyalty DB");
    }
  };

  const handleAddProductToCart = (item: any) => {
    triggerBeep('tap');
    setCart((prev) => {
      const existingIndex = prev.findIndex(c => c.id === item.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: 1
      }];
    });
    toast.success(`${item.name} added!`, { duration: 800 });
  };

  const handleAddCustomizedItemToCart = () => {
    triggerBeep('tap');
    if (!normalPizzaSize) {
      toast.error("Please select a size first!");
      return;
    }

    let finalPrice = normalPizzaPrice;
    const selectedAddons: string[] = [];

    Object.entries(normalPizzaAddons).forEach(([addon, isSelected]) => {
      if (isSelected) {
        const cost = PIZZA_ADDONS[normalPizzaSize.toLowerCase()]?.[addon] || 0;
        finalPrice += cost;
        selectedAddons.push(addon);
      }
    });

    const noteParts: string[] = [];
    if (selectedAddons.length > 0) noteParts.push(`Addons: ${selectedAddons.join(', ')}`);
    if (customizerChefNote.trim()) noteParts.push(`Note: ${customizerChefNote.trim()}`);

    const compositeId = `${selectedProduct.id}-${normalPizzaSize.toLowerCase()}`;
    const compositeName = `${selectedProduct.name} (${normalPizzaSize.toUpperCase()})`;

    setCart((prev) => {
      const existingIndex = prev.findIndex(c => c.id === compositeId && c.note === noteParts.join(' | '));
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      }
      return [...prev, {
        id: compositeId,
        name: compositeName,
        price: finalPrice,
        quantity: 1,
        note: noteParts.join(' | ')
      }];
    });

    setSelectedProduct(null);
    setNormalPizzaSize("");
    setNormalPizzaPrice(0);
    setNormalPizzaAddons({});
    setCustomizerChefNote("");

    toast.success("Customized item added!");
  };

  const handleUpdateCartQuantity = (id: string, amount: number) => {
    triggerBeep('tap');
    setCart((prev) => 
      prev.map(item => {
        if (item.id === id) {
          const updatedQty = item.quantity + amount;
          return updatedQty > 0 ? { ...item, quantity: updatedQty } : null;
        }
        return item;
      }).filter(Boolean) as PosCartItem[]
    );
  };

  const handleUpdateCartItemNote = (itemId: string, noteValue: string) => {
    setCart(prev => 
      prev.map(item => item.id === itemId ? { ...item, note: noteValue } : item)
    );
  };

  // Pricing Helpers
  const getCartSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  
  const getCartAddonsPrice = () => {
    let total = 0;
    if (ketchupAddon) total += 10;
    if (oreganoAddon) total += 10;
    if (chiliFlakesAddon) total += 10;
    return total;
  };

  const getDeliveryCharge = () => {
    if (fulfillmentType === "pickup" || fulfillmentType === "table") return 0;
    const baseSub = getCartSubtotal();
    if (baseSub === 0) return 0;
    return baseSub >= selectedArea.minFree ? 0 : selectedArea.fee;
  };

  const getLoyaltyDiscount = () => Math.min(pointsToRedeem, getCartSubtotal());
  
  const getTotalBillPrice = () => {
    const subtotal = getCartSubtotal();
    const addPrice = getCartAddonsPrice();
    const delivery = getDeliveryCharge();
    const discountCombined = getLoyaltyDiscount() + customDiscount;
    return Math.max(0, subtotal + addPrice - discountCombined) + delivery;
  };

  const getFreeDeliveryProgressPercent = () => {
    const subtotal = getCartSubtotal();
    const limit = selectedArea.minFree;
    if (subtotal >= limit) return 100;
    return (subtotal / limit) * 100;
  };

  // 📄 THERMAL RECEIPT PRINTING FUNCTION
  const handlePrintReceipt = (order: any) => {
    triggerBeep('tap');
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;

    const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
    const itemsRows = order.items.map((it: any) => `
      <tr>
        <td style="font-size: 11px; padding: 4px 0; max-width: 140px; word-break: break-word;">
          ${it.name}
          ${it.note ? `<br/><span style="font-size: 9px; color: #555; font-style: italic;">(${it.note})</span>` : ''}
        </td>
        <td style="font-size: 11px; text-align: center; padding: 4px 0; vertical-align: top;">x${it.quantity}</td>
        <td style="font-size: 11px; text-align: right; padding: 4px 0; vertical-align: top;">₹${it.price * it.quantity}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${order.billNumber}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 270px; 
              margin: 0; 
              padding: 10px; 
              color: #000;
              background-color: #fff;
            }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <h3 style="margin: 0 0 2px 0; font-size: 16px;">BUM BUM CAFE</h3>
            <span style="font-size: 10px;">Mohandra, Panna (M.P.)</span>
          </div>
          <div class="divider"></div>
          <div style="font-size: 10px; line-height: 1.3;">
            <b>Bill No:</b> #${String(order.billNumber).padStart(4, '0')}<br/>
            <b>Token No:</b> #${order.tokenNumber}<br/>
            <b>Date:</b> ${formattedDate}<br/>
            <b>Type:</b> ${order.fulfillmentType?.toUpperCase()} ${order.tableNumber ? `| Table: ${order.tableNumber}` : ''}<br/>
            <b>Pay Mode:</b> ${order.paymentMethod?.toUpperCase()}<br/>
            <b>Guest:</b> ${order.customerName || 'Walk-in Guest'}<br/>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="font-size: 10px; text-align: left; padding-bottom: 4px;">Item</th>
                <th style="font-size: 10px; text-align: center; padding-bottom: 4px;">Qty</th>
                <th style="font-size: 10px; text-align: right; padding-bottom: 4px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="divider"></div>
          <div style="font-size: 11px; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>₹${order.subtotal}</span>
            </div>
            ${order.discount ? `
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span>Savings:</span>
              <span>-₹${order.discount}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 2px;">
              <span>GRAND TOTAL:</span>
              <span>₹${order.total}</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size: 9px; margin-top: 6px;">
            <b>Thank you! Visit Again! 🍕🍔</b>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Checkout submission to Firestore & print trigger
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your billing cart is empty!");
      return;
    }
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getCartSubtotal();
    const addOnsCost = getCartAddonsPrice();
    const discountCombined = getLoyaltyDiscount() + customDiscount;
    const finalTotal = getTotalBillPrice();

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const deliveryPin = Math.floor(1000 + Math.random() * 9000);

    let billNumber = 1;
    const counterDocRef = doc(db, "settings", "store_bill_counter");

    try {
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        if (!counterDoc.exists()) {
          transaction.set(counterDocRef, { nextBillNumber: 2 });
          billNumber = 1;
        } else {
          billNumber = counterDoc.data().nextBillNumber || 1;
          transaction.update(counterDocRef, { nextBillNumber: billNumber + 1 });
        }
      });

      const orderObj = {
        billNumber,
        tokenNumber,
        deliveryPin,
        customerName: customerName.trim() || "Walk-in Guest",
        customerPhone: customerPhone ? `+91${customerPhone}` : "",
        items: cart,
        subtotal: subtotal + addOnsCost,
        discount: discountCombined,
        total: finalTotal,
        timestamp: new Date(),
        status: 'completed',
        fulfillmentType: fulfillmentType,
        deliveryArea: fulfillmentType === "delivery" ? selectedArea.name : "",
        tableNumber: fulfillmentType === 'table' ? tableNumber : '',
        paymentMethod: paymentMethod, 
        ketchupAddon,
        oreganoAddon,
        chiliFlakesAddon,
        noCutlery,
        source: 'POS'
      };

      await addDoc(collection(db, "orders"), orderObj);

      if (customerPhone && customerPhone.trim().length === 10) {
        const phoneClean = customerPhone.trim();
        const pointsEarned = Math.floor(finalTotal / 100);
        const netPointsChange = pointsEarned - pointsToRedeem;

        await runTransaction(db, async (txn) => {
          const userRef = doc(db, "customer_points", phoneClean);
          const userSnap = await txn.get(userRef);

          if (!userSnap.exists()) {
            txn.set(userRef, {
              name: customerName.trim() || "Walk-in Guest",
              phone: phoneClean,
              points: pointsEarned,
              lastActive: new Date()
            });
          } else {
            txn.update(userRef, {
              points: increment(netPointsChange),
              lastActive: new Date()
            });
          }
        });

        if (pointsEarned > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'earn',
            points: pointsEarned,
            description: `Earned on Bill #${billNumber} at POS Counter`,
            timestamp: new Date()
          });
        }
        if (pointsToRedeem > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'redeem',
            points: pointsToRedeem,
            description: `Redeemed on Bill #${billNumber} at POS Counter`,
            timestamp: new Date()
          });
        }
      }

      triggerBeep('success');
      toast.success(`Bill #${billNumber} processed!`);
      
      handlePrintReceipt(orderObj);

      // Reset billing states
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerPoints(0);
      setPointsToRedeem(0);
      setCustomDiscount(0);
      setIsCartOpen(false); 
      setPaymentMethod('cash');
      setKetchupAddon(false);
      setOreganoAddon(false);
      setChiliFlakesAddon(false);
      setNoCutlery(false);
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to process counter transaction");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "products", productId), {
        isAvailable: !currentStatus
      });
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, isAvailable: !currentStatus } : p)
      );
      toast.success("Stock status updated on Web App!");
    } catch (err) {
      toast.error("Error updating stock");
    }
  };

  const filteredMenu = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const getDisplayPrice = (item: any) => {
    if (item?.variants && typeof item.variants === 'object') {
      const prices = Object.values(item.variants).map(Number).filter(n => !isNaN(n));
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        return minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;
      }
    }
    return `₹${item?.price || 0}`;
  };

  // Verification if addons are showable (Matches the pasted logic)
  const showAddonsSection = useMemo(() => {
    const eligibleKeywords = ['pizza', 'sandwich', 'burger', 'momo', 'fries', 'chips', 'finger'];
    return cart.some((item: any) => {
      const nameLower = (item.name || '').toLowerCase();
      return eligibleKeywords.some(keyword => nameLower.includes(keyword));
    });
  }, [cart]);

  const handleDetectLocation = () => {
    triggerBeep('tap');
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your device.");
      return;
    }

    const toastId = toast.loading("Detecting live location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setAddress(`GPS Location: https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`);
        toast.dismiss(toastId);
        toast.success("Location successfully detected!");
      },
      () => {
        toast.dismiss(toastId);
        toast.error("Unable to retrieve location.");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-row font-sans antialiased overflow-hidden">
      <Toaster position="top-center" />

      {/* 1. COMPLETELY COLLAPSIBLE SLIDE-OUT SIDEBAR DRAWER */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Sidebar Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/70 z-40 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide-out Sidebar */}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-neutral-950 border-r border-white/5 flex flex-col justify-between p-4 shadow-2xl z-50"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1 py-1 border-b border-white/5 pb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <Database className="text-orange-500 animate-pulse" size={18} />
                    <h1 className="text-xs font-black tracking-wider uppercase text-yellow-300">
                      Bum Bum POS <span className="text-[8px] text-gray-400 lowercase font-mono">v1.12</span>
                    </h1>
                  </div>
                  <button 
                    onClick={() => { triggerBeep('tap'); setIsSidebarOpen(false); }}
                    className="p-1.5 bg-neutral-900 border border-white/5 text-gray-400 hover:text-white rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Vertical Navigation items */}
                <nav className="space-y-1.5">
                  <button 
                    onClick={() => { triggerBeep('tap'); setActiveTab('billing'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'billing' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-900'}`}
                  >
                    <ShoppingBag size={14} />
                    <span>Counter Billing</span>
                  </button>

                  <button 
                    onClick={() => { triggerBeep('tap'); setActiveTab('orders'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-900'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock size={14} />
                      <span>Live Orders</span>
                    </div>
                    {liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length > 0 && (
                      <span className="bg-yellow-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full font-mono">
                        {liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length}
                      </span>
                    )}
                  </button>

                  <button 
                    onClick={() => { triggerBeep('tap'); setActiveTab('inventory'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'inventory' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-neutral-900'}`}
                  >
                    <Layers size={14} />
                    <span>Stock Toggle</span>
                  </button>
                </nav>
              </div>

              {/* Sidebar bottom View Toggles */}
              {activeTab === 'billing' && (
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <p className="text-[9px] font-black uppercase text-gray-500 px-2 tracking-wider">Layout View</p>
                  <div className="flex bg-neutral-900 border border-white/5 p-1 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => { triggerBeep('tap'); setViewMode('grid'); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-orange-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                      <LayoutGrid size={12} />
                      <span>Grid</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => { triggerBeep('tap'); setViewMode('list'); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-orange-500 text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                      <List size={12} />
                      <span>List</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 2. MAIN WORKSPACE CONTENT AREA */}
      <main className="flex-1 p-5 overflow-hidden flex flex-col relative h-screen">
        
        {/* GLOBAL HEADER BAR WITH SIDEBAR MENU TOGGLE */}
        <div className="flex items-center gap-3 mb-4 shrink-0 border-b border-white/5 pb-3">
          <button 
            type="button"
            onClick={() => { triggerBeep('tap'); setIsSidebarOpen(true); }}
            className="p-2.5 bg-neutral-950 hover:bg-neutral-900 border border-white/5 text-orange-500 hover:text-orange-400 rounded-xl transition-all shadow-md flex-shrink-0"
          >
            <Menu size={16} />
          </button>
          
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-orange-500 leading-none">
              {activeTab === 'billing' ? 'Counter Billing Workspace' : activeTab === 'orders' ? 'Live Orders Pipeline' : 'Item Availability Control'}
            </h2>
            <span className="text-[9px] text-gray-400 font-bold mt-1">Bum Bum Cafe • Mohandra</span>
          </div>
        </div>

        {/* VIEW 1: LIVE ORDERS TICKET PIPELINE */}
        {activeTab === 'orders' && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {liveOrders.map((order: any) => {
                if (order.status === 'completed' || order.status === 'rejected') return null;

                return (
                  <motion.div 
                    layout
                    key={order.id}
                    className="bg-neutral-950 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-white/5 pb-2 mb-3">
                        <div>
                          <p className="text-xs font-black text-yellow-300 font-mono">Bill: #${String(order.billNumber).padStart(4, '0')}</p>
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Token: #{order.tokenNumber}</p>
                        </div>
                        <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                          {order.fulfillmentType || 'table'}
                        </span>
                      </div>

                      <div className="space-y-1 mb-3 text-[10px] font-semibold text-gray-300">
                        <p className="text-white truncate font-black">👤 {order.customerName}</p>
                        {order.customerPhone && <p className="font-mono text-gray-400">📞 {order.customerPhone}</p>}
                        {order.address && <p className="text-gray-400 line-clamp-1">📍 {order.address}</p>}
                      </div>

                      <div className="space-y-1.5 border-t border-dashed border-white/5 pt-2.5 mb-4">
                        {order.items?.map((it: any, index: number) => (
                          <div key={index} className="flex justify-between text-[11px] text-gray-200">
                            <span className="font-bold">
                              {it.name} <span className="text-orange-500">x{it.quantity}</span>
                              {it.note ? `<br/><span style="font-size: 9px; color: #888;">(${it.note})</span>` : ''}
                            </span>
                            <span className="font-mono text-gray-400">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-black text-green-400 mb-3 font-mono border-t border-white/5 pt-2.5">
                        <span>Grand Total:</span>
                        <span>₹{order.total}</span>
                      </div>

                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'preparing')}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                          >
                            <Play size={10} className="fill-black" /> Accept (To KDS)
                          </button>
                        )}
                        
                        {order.status === 'preparing' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, order.fulfillmentType === 'delivery' ? 'out_for_delivery' : 'completed')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                          >
                            <Check size={10} /> Dispatch
                          </button>
                        )}

                        {order.status === 'out_for_delivery' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'completed')}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-2.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
                          >
                            <Check size={10} /> Mark Completed
                          </button>
                        )}

                        <button 
                          onClick={() => handlePrintReceipt(order)}
                          className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-gray-300 border border-white/5 rounded-xl transition-all"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: BILLING WORKSPACE */}
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* PRODUCT CATALOG */}
            <div className="flex-1 bg-neutral-950 border border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
              <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search dishes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/5 rounded-xl py-2 px-9 text-xs outline-none text-white focus:border-orange-500 placeholder-gray-500 transition-colors"
                  />
                </div>

                {/* ACTIVE DRAWER TRIGGER */}
                <button 
                  type="button"
                  onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <ShoppingBag size={14} />
                  <span>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
                </button>
              </div>

              {/* Category Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-3.5 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { triggerBeep('tap'); setSelectedCategory(cat); }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 transition-all ${selectedCategory === cat ? 'bg-orange-500 text-black border-orange-500 font-bold' : 'bg-neutral-900 text-gray-400 border-white/5'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* PRODUCTS DISPLAY GRID VS LIST */}
              {loading ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="animate-spin text-orange-500" size={24} />
                </div>
              ) : filteredMenu.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-10 uppercase tracking-widest font-black">No matching items found</p>
              ) : viewMode === 'grid' ? (
                
                /* EXTREMELY HIGH-DENSITY 4-COLUMN GRID LAYOUT */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 overflow-y-auto flex-1 pr-1 pb-16">
                  {filteredMenu.map((item) => {
                    const isAvailable = item.isAvailable !== false;
                    return (
                      <button
                        key={item.id}
                        disabled={!isAvailable}
                        onClick={() => {
                          triggerBeep('tap');
                          item.variants ? setSelectedProduct(item) : handleAddProductToCart(item);
                        }}
                        className={`bg-neutral-900 border p-3 rounded-2xl text-left flex flex-col justify-between h-24 hover:border-orange-500 transition-all duration-200 active:scale-95 ${!isAvailable ? 'opacity-40 cursor-not-allowed border-white/5' : 'border-white/5'}`}
                      >
                        <div>
                          <p className="font-bold text-xs text-gray-100 line-clamp-2 leading-snug">{item.name}</p>
                          <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">{item.category}</p>
                        </div>
                        <div className="flex justify-between items-end w-full">
                          <p className="text-yellow-300 font-black text-xs font-mono">{getDisplayPrice(item)}</p>
                          {!isAvailable && <span className="text-[7px] font-black text-red-500 uppercase">Unavailable</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                
                /* DENSE LIST VIEW */
                <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 pb-16">
                  {filteredMenu.map((item) => {
                    const isAvailable = item.isAvailable !== false;
                    return (
                      <button
                        key={item.id}
                        disabled={!isAvailable}
                        onClick={() => {
                          triggerBeep('tap');
                          item.variants ? setSelectedProduct(item) : handleAddProductToCart(item);
                        }}
                        className={`bg-neutral-900 border p-3 rounded-xl flex items-center justify-between text-left hover:border-orange-500 transition-all duration-150 active:scale-[0.99] ${!isAvailable ? 'opacity-45 cursor-not-allowed border-white/5' : 'border-white/5'}`}
                      >
                        <div className="space-y-0.5 pr-4 flex-1">
                          <p className="font-bold text-xs text-gray-100 line-clamp-1">{item.name}</p>
                          <p className="text-[8px] text-gray-500 uppercase tracking-wider">{item.category}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-yellow-300 font-black text-xs font-mono">{getDisplayPrice(item)}</p>
                          <div className="bg-orange-500/10 text-orange-400 p-1.5 rounded-lg border border-orange-500/20">
                            <Plus size={12} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FLOATING ACTION CART BAR */}
            {cart.length > 0 && !isCartOpen && (
              <motion.button
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                onClick={() => { triggerBeep('tap'); setIsCartOpen(true); }}
                className="fixed bottom-6 right-6 left-6 md:left-auto bg-green-600 hover:bg-green-700 text-white font-black px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-40 border border-green-500/20 active:scale-95 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="bg-white/10 p-2 rounded-xl">
                    <ShoppingBag size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] uppercase tracking-wider text-green-100">Active Bill Cart</p>
                    <p className="text-xs font-bold font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)} Items</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm font-black font-mono">
                  <span>To Pay: ₹{getTotalBillPrice()}</span>
                  <span>➔</span>
                </div>
              </motion.button>
            )}

            {/* UPGRADED POS CART DRAWER (MATCHES USER PASTED STYLE EXACTLY) */}
            <AnimatePresence>
              {isCartOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsCartOpen(false)}
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-end font-sans"
                  />

                  <motion.div
                    initial={{ y: "100%" }} 
                    animate={{ y: 0 }} 
                    exit={{ y: "100%" }} 
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="fixed right-0 bottom-0 top-0 w-full sm:w-[460px] bg-[#0b0c10] border-l border-white/10 p-5 z-50 flex flex-col justify-between shadow-2xl overflow-y-auto pb-32 scrollbar-thin"
                  >
                    <div>
                      {/* Live Bill Sticky Progress Header */}
                      <div className="sticky top-0 z-30 bg-[#0b0c10] pb-3 border-b border-white/5 space-y-2 mb-4">
                        {fulfillmentType === "delivery" && (
                          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 space-y-1.5 text-[10px] font-sans font-bold">
                            <div className="flex justify-between items-center font-black uppercase text-orange-400">
                              <span>🚚 Free Delivery Target:</span>
                              <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
                            </div>
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="bg-neutral-950 p-3 rounded-2xl border border-white/5 flex justify-between items-center font-mono font-bold">
                          <span className="text-[10px] font-black uppercase text-gray-400 font-sans">LIVE BILL TOTAL:</span>
                          <span className="text-sm font-black text-yellow-400 font-mono">₹{getTotalBillPrice()}</span>
                        </div>
                      </div>

                      {/* Header with Title and Clear Cart Option */}
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-black text-white font-mono font-bold">Your POS Cart</h2>
                        <div className="flex items-center gap-2">
                          {cart.length > 0 && (
                            <button 
                              type="button" 
                              onClick={() => { triggerBeep('tap'); setCart([]); }}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                            >
                              <Trash2 size={12} /> Clear Cart
                            </button>
                          )}
                          <button onClick={() => { triggerBeep('tap'); setIsCartOpen(false); }} className="p-2.5 bg-white/5 text-white rounded-full hover:bg-white/10 transition-all">
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                      
                      {/* 1. CART ITEMS LIST */}
                      <div className="space-y-3.5 mb-4">
                        {cart.map((item) => (
                          <div key={item.id} className="flex flex-col bg-white/[0.02] p-4 rounded-2xl border border-white/5 shadow-sm transition-colors duration-200 gap-1.5 font-sans font-bold">
                            <div className="flex justify-between items-center">
                              <div className="min-w-0 pr-3 flex-1">
                                <h4 className="font-bold text-xs text-gray-100 truncate">{item.name}</h4>
                                <p className="text-orange-500 font-black mt-1 text-[11px] font-mono">₹{item.price}</p>
                              </div>
                              <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-xl border border-white/10 flex-shrink-0">
                                <button type="button" onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded text-sm font-black">-</button>
                                <span className="font-black text-xs px-1 text-white font-mono">{item.quantity}</span>
                                <button type="button" onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-green-500/10 text-green-500 rounded text-sm font-black">+</button>
                              </div>
                            </div>
                            
                            {/* Inline instructions note */}
                            <input 
                              type="text"
                              placeholder="Instructions for KOT..."
                              value={item.note || ''}
                              onChange={(e) => handleUpdateCartItemNote(item.id, e.target.value)}
                              className="w-full bg-black/40 border border-white/10 text-[10px] p-2 rounded-xl outline-none focus:border-orange-500/40 text-yellow-300 font-bold"
                            />
                          </div>
                        ))}
                        {cart.length === 0 && (
                          <p className="text-center py-8 text-gray-500 text-[10px] uppercase font-bold tracking-wider">Your bill is empty</p>
                        )}
                      </div>

                      {/* 2. INLINE ADD-ONS FOR CORRESPONDING ITEMS */}
                      {showAddonsSection && (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                          <p className="text-[9px] font-black uppercase text-gray-400">Add Add-ons to order:</p>
                          <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => { triggerBeep('tap'); setKetchupAddon(!ketchupAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-600' : 'border-white/5 bg-transparent text-gray-300'}`}>
                              Ketchup (+₹10)
                            </button>
                            <button type="button" onClick={() => { triggerBeep('tap'); setOreganoAddon(!oreganoAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-600' : 'border-white/5 bg-transparent text-gray-300'}`}>
                              Oregano (+₹10)
                            </button>
                            <button type="button" onClick={() => { triggerBeep('tap'); setChiliFlakesAddon(!chiliFlakesAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'border-white/5 bg-transparent text-gray-300'}`}>
                              Chili Flakes (+₹10)
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 3. POS ORDER TYPE SELECTION */}
                      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                        <label className="text-[10px] font-black uppercase text-gray-400">Select Order Mode:</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => { triggerBeep('tap'); setFulfillmentType("delivery"); }}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "delivery" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300 font-semibold'}`}
                          >
                            <span className="text-base">🛵</span>
                            <span className="text-[9px] font-black">Home Delivery</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { triggerBeep('tap'); setFulfillmentType("pickup"); }}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "pickup" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                          >
                            <span className="text-base">🛍️</span>
                            <span className="text-[9px] font-black">Self-Pickup</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { triggerBeep('tap'); setFulfillmentType("table"); }}
                            className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "table" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                          >
                            <span className="text-base">🍽️</span>
                            <span className="text-[9px] font-black">Dine-In (Table)</span>
                          </button>
                        </div>
                      </div>

                      {/* 4. CONDITIONAL MODE INPUTS */}
                      {fulfillmentType === "delivery" && (
                        <div className="space-y-4 mt-4 font-sans font-bold">
                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
                            <label className="text-[9px] font-black uppercase text-gray-400">Select Delivery Zone (KM):</label>
                            <div className="grid grid-cols-2 gap-2">
                              {DELIVERY_AREAS.map((area) => {
                                const isSelected = selectedArea.name === area.name;
                                return (
                                  <button
                                    type="button"
                                    key={area.name}
                                    onClick={() => { triggerBeep('tap'); setSelectedArea(area); }}
                                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 ${
                                      isSelected 
                                        ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md font-black' 
                                        : 'border-white/5 bg-white/[0.01] text-neutral-300 hover:border-white/10'
                                    }`}
                                  >
                                    <span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span>
                                    <div className="flex justify-between items-center w-full mt-2 font-mono">
                                      <span className="text-[8px] font-black text-neutral-300 font-bold">Fee: ₹{area.fee}</span>
                                      <span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded text-yellow-400">Min: ₹{area.minFree}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2 transition-colors duration-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/><h3 className="font-black uppercase text-[10px]">Delivery Address</h3></div>
                              <button type="button" onClick={handleDetectLocation} className="text-[8px] bg-green-600 hover:bg-green-700 text-white font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase">📍 Live GPS Location</button>
                            </div>
                            <textarea placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-semibold text-white outline-none resize-none h-16" />
                          </div>
                        </div>
                      )}

                      {fulfillmentType === "table" && (
                        <div className="mt-3 p-3 bg-neutral-900 rounded-xl border border-white/5 space-y-3 font-sans transition-all duration-300">
                          <p className="text-[10px] font-black uppercase text-orange-400">🪑 Choose Dine-In Table:</p>
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">For 2 People (3 Tables):</span>
                            <div className="grid grid-cols-3 gap-2">
                              {["Table 1", "Table 2", "Table 3"].map((t) => {
                                const isSelected = tableNumber === t;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => { triggerBeep('tap'); setTableNumber(t); }}
                                    className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                                      isSelected 
                                        ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-sm font-black' 
                                        : 'border-white/10 bg-white/5 text-neutral-300'
                                    }`}
                                  >
                                    <span className="block">{t}</span>
                                    <span className="text-[7.5px] text-gray-400 font-normal">👥 2 seats</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">For 4 People (3 Tables):</span>
                            <div className="grid grid-cols-3 gap-2">
                              {["Table 4", "Table 5", "Table 6"].map((t) => {
                                const isSelected = tableNumber === t;
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => { triggerBeep('tap'); setTableNumber(t); }}
                                    className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                                      isSelected 
                                        ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-sm font-black' 
                                        : 'border-white/10 bg-white/5 text-neutral-300'
                                    }`}
                                  >
                                    <span className="block">{t}</span>
                                    <span className="text-[7.5px] text-gray-400 font-normal">👥👥 4 seats</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 5. LOYALTY PROFILE VERIFICATION PANEL */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 mt-4 font-sans font-bold">
                        <p className="text-[9px] font-black uppercase text-gray-400">Customer Loyalty Points Desk</p>
                        <div className="flex gap-2">
                          <input 
                            type="tel" 
                            maxLength={10}
                            placeholder="Guest 10-digit phone..."
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="bg-[#050505] border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-orange-500 font-bold flex-1"
                          />
                          <button 
                            type="button"
                            onClick={handleCheckLoyalty}
                            className="bg-orange-500 hover:bg-orange-600 text-black text-xs font-black px-4 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                          >
                            <User size={12} /> Verify
                          </button>
                        </div>
                        {customerPhone && customerPoints > 0 && (
                          <div className="mt-2 bg-yellow-400/5 border border-yellow-400/20 p-2.5 rounded-xl flex items-center justify-between">
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-black text-yellow-300 uppercase">Points Balance</p>
                              <p className="text-[10px] text-gray-300 font-semibold">{customerName || 'Loyal Guest'} ({customerPoints} pts)</p>
                            </div>
                            <input 
                              type="number"
                              max={Math.min(customerPoints, getCartSubtotal())}
                              placeholder="Redeem"
                              value={pointsToRedeem || ''}
                              onChange={(e) => setPointsToRedeem(Math.max(0, Number(e.target.value)))}
                              className="w-16 bg-[#050505] border border-yellow-400/20 text-yellow-300 p-1.5 rounded text-center text-xs font-mono outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {/* 6. DISCOUNTS ADJUSTMENT */}
                      <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 mt-4 font-sans font-bold">
                        <label className="text-[10px] font-black uppercase text-gray-400">POS Custom Discount (₹)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 50"
                          value={customDiscount || ''}
                          onChange={(e) => setCustomDiscount(Math.max(0, Number(e.target.value)))}
                          className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono font-bold"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {[10, 20, 50, 100].map((val) => (
                            <button
                              type="button"
                              key={val}
                              onClick={() => { triggerBeep('tap'); setCustomDiscount(val); }}
                              className="bg-neutral-900 text-[9px] text-orange-400 font-bold py-1 px-2.5 rounded-lg border border-white/5 hover:border-orange-500/30 transition-all font-mono"
                            >
                              -₹{val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 7. ECO FRIENDLY PACKING CONTROL */}
                      <div className="bg-green-950/10 border border-green-500/10 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200 mt-4 font-sans font-bold">
                        <div className="space-y-0.5">
                          <p className="text-[10px] font-black text-green-500 uppercase tracking-tight">Eco-Friendly Pack</p>
                          <p className="text-[8px] text-gray-400">Skip single-use plastic spoon/tissue paper</p>
                        </div>
                        <input type="checkbox" checked={noCutlery} onChange={() => { triggerBeep('tap'); setNoCutlery(!noCutlery); }} className="w-4 h-4 accent-green-600" />
                      </div>
                    </div>

                    {/* 8. POS BILL SUMMARY CARD */}
                    <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white mt-4 font-mono font-bold">
                      <div className="flex justify-between mb-1.5 text-xs"><span>Subtotal</span> <span>₹{getCartSubtotal()}</span></div>
                      {getCartAddonsPrice() > 0 && <div className="flex justify-between mb-1.5 text-xs"><span>Add-ons</span> <span>+₹{getCartAddonsPrice()}</span></div>}
                      {(pointsToRedeem > 0 || customDiscount > 0) && (
                        <div className="flex justify-between mb-1.5 text-xs text-green-200 font-bold"><span>Discount/Savings</span> <span>-₹{getLoyaltyDiscount() + customDiscount}</span></div>
                      )}
                      {fulfillmentType === "delivery" && <div className="flex justify-between mb-3 text-xs opacity-90"><span>Delivery Charge</span> <span>₹{getDeliveryCharge()}</span></div>}
                      <div className="h-px bg-white/20 mb-3" />
                      <div className="flex justify-between font-black text-xl font-mono"><span>Grand Total</span> <span>₹{getTotalBillPrice()}</span></div>
                    </div>

                    {/* 9. POS PAYMENT TYPE SELECTION & PRINT SUBMIT */}
                    <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
                      <label className="text-[9px] font-black uppercase text-gray-400">Select Counter Payment Method:</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => { triggerBeep('tap'); setPaymentMethod("cash"); }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "cash" ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                        >
                          <span className="text-sm">💵</span>
                          <span className="text-[9px] font-black">Cash </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerBeep('tap'); setPaymentMethod("upi"); }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "upi" ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                        >
                          <span className="text-sm">📱</span>
                          <span className="text-[9px] font-black">UPI QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { triggerBeep('tap'); setPaymentMethod("card"); }}
                          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "card" ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}
                        >
                          <span className="text-sm">💳</span>
                          <span className="text-[9px] font-black">Card</span>
                        </button>
                      </div>

                      {/* Dynamic KOT Chef Instructions */}
                      <div className="space-y-1.5 mt-2">
                        <label className="text-[8px] font-black uppercase text-gray-400">Special Instructions for KOT</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Extra Spicy, Soft Base..." 
                          value={chefInstructions}
                          onChange={(e) => setChefInstructions(e.target.value)}
                          className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-semibold"
                        />
                      </div>

                      <button 
                        onClick={handlePlaceOrder} 
                        type="button" 
                        disabled={isSubmittingOrder} 
                        className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-4"
                      >
                        {isSubmittingOrder ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            Processing transaction... ⏳
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 justify-center">
                            <Printer size={16} />
                            <span>CONFIRM & PRINT BILL 🚀</span>
                          </span>
                        )}
                      </button>
                    </div>

                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* VIEW 3: INVENTORY STOCK MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="bg-neutral-950 border border-white/5 rounded-3xl p-5 flex-1 overflow-y-auto pb-20 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Live Item Availability & Stock Control</h2>
                <p className="text-[10px] text-gray-400 font-bold mt-1">Disabling an item here immediately makes it unavailable on customers' phones.</p>
              </div>
              <button 
                onClick={async () => {
                  triggerBeep('tap');
                  const prodSnap = await getDocs(collection(db, "products"));
                  setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                  toast.success("Catalog updated!");
                }}
                className="p-2 bg-neutral-900 border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-2 max-w-2xl">
              {products.map((item) => {
                const isAvailable = item.isAvailable !== false;
                return (
                  <div 
                    key={item.id} 
                    className="bg-neutral-950 border border-white/5 p-4 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{item.name}</span>
                      <span className="text-[8px] text-gray-500 uppercase tracking-wider block font-mono">Category: {item.category} | Price: ₹{item.price}</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${isAvailable ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {isAvailable ? 'In Stock' : 'Out of Stock'}
                      </span>
                      <button
                        onClick={() => handleToggleStock(item.id, isAvailable)}
                        className={`text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all active:scale-95 ${isAvailable ? 'bg-red-950/25 border-red-500/20 text-red-400 hover:bg-red-950' : 'bg-green-950/25 border-green-500/20 text-green-400 hover:bg-green-950'}`}
                      >
                        {isAvailable ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* 3. VARIATIONS AND PORTIONS SELECTION CUSTOMIZATION POPUP MODAL */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#111] border border-white/10 w-full max-w-md p-6 rounded-3xl text-left space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div>
                  <h3 className="text-sm font-black text-white">{selectedProduct.name}</h3>
                  <p className="text-[9px] text-orange-500 font-bold uppercase tracking-wider">Customize Counter Order</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setCustomizerChefNote(""); }}
                  className="p-1.5 bg-neutral-900 border border-white/5 rounded-full text-red-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">1. Select Portion Size:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedProduct.variants || {}).map(([size, price]: any) => (
                    <button 
                      type="button" 
                      key={size} 
                      onClick={() => { triggerBeep('tap'); setNormalPizzaSize(size); setNormalPizzaPrice(Number(price)); }} 
                      className={`p-3 rounded-xl flex flex-col items-center border transition-all duration-200 ${normalPizzaSize.toLowerCase() === size.toLowerCase() ? 'bg-orange-500/10 border-orange-500 text-orange-500 font-black' : 'bg-neutral-900 border-white/5 text-gray-400'}`}
                    >
                      <span className="capitalize text-[11px] font-black">{size}</span>
                      <span className="font-black text-xs mt-1 text-white font-mono">₹{price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {normalPizzaSize && (selectedProduct.category === "Special Pizza" || selectedProduct.name?.toLowerCase().includes("pizza")) && (
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">2. Select Premium Toppings:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PIZZA_ADDONS[normalPizzaSize.toLowerCase()] || {}).map(([addon, cost]: any) => {
                      const isSelected = !!normalPizzaAddons[addon];
                      return (
                        <button
                          type="button"
                          key={addon}
                          onClick={() => { triggerBeep('tap'); setNormalPizzaAddons(prev => ({ ...prev, [addon]: !prev[addon] })); }}
                          className={`p-2.5 rounded-xl border flex justify-between items-center text-[10px] font-bold transition-all ${isSelected ? 'border-orange-500 bg-orange-500/5 text-orange-400' : 'border-white/5 bg-neutral-900 text-gray-400'}`}
                        >
                          <span>{addon}</span>
                          <span className="text-orange-500 font-black font-mono">+₹{cost}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t border-white/5 pt-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">3. Special Cooking instructions:</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_INSTRUCTION_TAGS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => { triggerBeep('tap'); setCustomizerChefNote(prev => prev ? `${prev}, ${tag}` : tag); }}
                      className="text-[9px] font-bold py-1 px-2 rounded-full border border-white/5 bg-neutral-900 text-gray-300 hover:border-orange-500 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input 
                  type="text" 
                  placeholder="e.g. Well baked crust, extra cheese toppings..." 
                  value={customizerChefNote} 
                  onChange={(e) => setCustomizerChefNote(e.target.value)} 
                  className="w-full text-xs p-3 rounded-xl bg-neutral-900 border border-white/5 text-white outline-none focus:border-orange-500 font-semibold"
                />
              </div>

              <div className="border-t border-white/5 pt-3 flex gap-2">
                <button 
                  type="button" 
                  onClick={handleAddCustomizedItemToCart}
                  className="flex-grow bg-green-600 hover:bg-green-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow"
                >
                  Confirm Portion & Add ➔
                </button>
                <button 
                  type="button" 
                  onClick={() => { setSelectedProduct(null); setNormalPizzaSize(""); setNormalPizzaPrice(0); setCustomizerChefNote(""); }}
                  className="bg-neutral-900 border border-white/5 text-gray-400 hover:text-white px-4 py-3 rounded-xl text-xs font-bold uppercase"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
