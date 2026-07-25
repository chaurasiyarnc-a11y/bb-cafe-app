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
  Database, RefreshCw, Layers, Phone, MapPin 
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

export default function BbCafePos() {
  // Tabs: 'orders' (Live orders tracker), 'billing' (Counter billing), 'inventory' (Menu controls)
  const [activeTab, setActiveTab] = useState<'orders' | 'billing' | 'inventory'>('orders');
  
  // Real-time & SWR states
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
  const [fulfillmentType, setFulfillmentType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [tableNumber, setTableNumber] = useState<string>('Table 1');
  const [chefInstructions, setChefInstructions] = useState<string>('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // Sound effects for POS efficiency
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

  // 1. Live Orders Watcher (Real-time syncing from online customers & offline orders)
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

  // 2. Load Products and Categories once
  useEffect(() => {
    const fetchDbData = async () => {
      setLoading(true);
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const items = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);

        // Extract unique categories
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

  // Order state update (Accept, Dispatch, Complete)
  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Order updated to ${nextStatus}`);
    } catch (err) {
      toast.error("Failed to update order status");
    }
  };

  // Lookup Customer Loyalty Profile
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
        toast.success("New Guest detected. Points profile will be created on checkout!");
      }
    } catch (e) {
      toast.dismiss(toastId);
      toast.error("Error checking loyalty DB");
    }
  };

  // Add Item to POS Cart
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

  // Price Calculation Memos
  const getSubtotal = () => cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const getLoyaltyDiscount = () => Math.min(pointsToRedeem, getSubtotal());
  const getTotalBill = () => Math.max(0, getSubtotal() - getLoyaltyDiscount() - customDiscount);

  // Print HTML Thermal Invoice Generator (Compatible with 58mm/80mm POS Thermal printers)
  const handlePrintReceipt = (order: any) => {
    triggerBeep('tap');
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;

    const formattedDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
    const itemsRows = order.items.map((it: any) => `
      <tr>
        <td style="font-size: 11px; padding: 4px 0; max-width: 140px; word-break: break-word;">${it.name}</td>
        <td style="font-size: 11px; text-align: center; padding: 4px 0;">x${it.quantity}</td>
        <td style="font-size: 11px; text-align: right; padding: 4px 0;">₹${it.price * it.quantity}</td>
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
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="center">
            <h3 style="margin: 0 0 2px 0; font-size: 16px;">BUM BUM CAFE</h3>
            <span style="font-size: 10px;">Mohandra, Panna (M.P.)</span><br/>
            <span style="font-size: 10px;">Contact: +91 97142 93759</span>
          </div>
          <div class="divider"></div>
          <div style="font-size: 10px; line-height: 1.3;">
            <b>Bill No:</b> #${String(order.billNumber).padStart(4, '0')}<br/>
            <b>Token No:</b> #${order.tokenNumber}<br/>
            <b>Date:</b> ${formattedDate}<br/>
            <b>Type:</b> ${order.fulfillmentType?.toUpperCase()} ${order.tableNumber ? `| Table: ${order.tableNumber}` : ''}<br/>
            <b>Guest:</b> ${order.customerName || 'Walk-in Guest'}<br/>
            ${order.customerPhone ? `<b>Phone:</b> ${order.customerPhone}<br/>` : ''}
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
              <span>Discount/Points:</span>
              <span>-₹${order.discount}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 2px;">
              <span>GRAND TOTAL:</span>
              <span>₹${order.total}</span>
            </div>
          </div>
          <div class="divider" style="margin-top: 10px;"></div>
          <div class="center" style="font-size: 9px; margin-top: 6px; line-height: 1.2;">
            Swad Aur Suraksha Ka Wada!<br/>
            <b>Thank you! Visit Again! 🍕🍔</b>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Place POS Counter offline Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Your billing cart is empty!");
      return;
    }
    if (isSubmittingOrder) return;
    setIsSubmittingOrder(true);

    const subtotal = getSubtotal();
    const discountCombined = getLoyaltyDiscount() + customDiscount;
    const finalTotal = getTotalBill();

    const tokenNumber = Math.floor(1000 + Math.random() * 9000);
    const deliveryPin = Math.floor(1000 + Math.random() * 9000);

    let billNumber = 1;
    const counterDocRef = doc(db, "settings", "store_bill_counter");

    try {
      // 1. Transaction to fetch unique & consecutive bill number
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
        subtotal,
        discount: discountCombined,
        total: finalTotal,
        timestamp: new Date(),
        status: 'completed', // Counter bills are marked completed instantly
        fulfillmentType: fulfillmentType,
        tableNumber: fulfillmentType === 'dine_in' ? tableNumber : '',
        paymentMethod: 'cash',
        chefInstructions,
        source: 'POS'
      };

      // 2. Add document to main orders database
      await addDoc(collection(db, "orders"), orderObj);

      // 3. Loyalty ledger update
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

        // Points ledger logs
        if (pointsEarned > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'earn',
            points: pointsEarned,
            description: `Earned on Bill #${billNumber} at Counter`,
            timestamp: new Date()
          });
        }
        if (pointsToRedeem > 0) {
          await addDoc(collection(db, "customer_points", phoneClean, "history"), {
            type: 'redeem',
            points: pointsToRedeem,
            description: `Redeemed on Bill #${billNumber} at Counter`,
            timestamp: new Date()
          });
        }
      }

      triggerBeep('success');
      toast.success(`Bill #${billNumber} successfully saved!`);
      
      // Print the Thermal invoice instantly
      handlePrintReceipt(orderObj);

      // Reset billing states
      setCart([]);
      setCustomerPhone('');
      setCustomerName('');
      setCustomerPoints(0);
      setPointsToRedeem(0);
      setCustomDiscount(0);
      setChefInstructions('');
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to process counter transaction");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Toggle Item Out-of-stock/In-stock (Updates customer app instantly)
  const handleToggleStock = async (productId: string, currentStatus: boolean) => {
    triggerBeep('tap');
    try {
      await updateDoc(doc(db, "products", productId), {
        isAvailable: !currentStatus
      });
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, isAvailable: !currentStatus } : p)
      );
      toast.success("Stock availability synced with Online App!");
    } catch (err) {
      toast.error("Error updating product availability");
    }
  };

  // Filtered menu grid
  const filteredMenu = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-black">
      <Toaster position="top-center" />

      {/* FIXED TOP HEADER */}
      <header className="bg-neutral-950 border-b border-white/5 py-3.5 px-6 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <Database className="text-orange-500 animate-pulse" size={18} />
          <h1 className="text-sm font-black tracking-wider uppercase text-yellow-300">
            Bum Bum Cafe <span className="text-white text-xs lowercase font-normal">point of sale v1.2</span>
          </h1>
        </div>

        {/* ADMIN TAB NAVIGATION BUTTONS */}
        <div className="flex bg-neutral-900 border border-white/5 p-1 rounded-xl gap-1">
          <button 
            onClick={() => { triggerBeep('tap'); setActiveTab('orders'); }}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            📋 Live Orders ({liveOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected').length})
          </button>
          <button 
            onClick={() => { triggerBeep('tap'); setActiveTab('billing'); }}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'billing' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            💰 Counter Billing
          </button>
          <button 
            onClick={() => { triggerBeep('tap'); setActiveTab('inventory'); }}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'inventory' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            🍕 Stock Toggle
          </button>
        </div>
      </header>

      {/* POS VIEW CONTAINER */}
      <main className="flex-1 p-5 overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
        
        {/* VIEW 1: REAL-TIME LIVE ORDERS TRACKER */}
        {activeTab === 'orders' && (
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black uppercase tracking-widest text-orange-500">Live Kitchen and Delivery Pipeline</h2>
              <span className="text-[10px] font-bold text-gray-400">Updates instantly as customers order online</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {liveOrders.map((order: any) => {
                const isCompleted = order.status === 'completed';
                const isRejected = order.status === 'rejected';
                if (isCompleted || isRejected) return null; // Don't show inactive bills in the active live window

                return (
                  <motion.div 
                    layout
                    key={order.id}
                    className="bg-neutral-950 border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden"
                  >
                    <div>
                      <div className="flex justify-between items-start border-b border-white/5 pb-2 mb-3">
                        <div>
                          <p className="text-xs font-black text-yellow-300 font-mono">Bill: #${String(order.billNumber).padStart(4, '0')}</p>
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Token: #{order.tokenNumber}</p>
                        </div>
                        <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                          {order.fulfillmentType || 'DINE_IN'}
                        </span>
                      </div>

                      {/* Customer Summary */}
                      <div className="space-y-1 mb-3 text-[10px] font-semibold text-gray-300">
                        <p className="text-white truncate font-black">👤 {order.customerName}</p>
                        {order.customerPhone && <p className="font-mono text-gray-400">📞 {order.customerPhone}</p>}
                        {order.address && <p className="text-gray-400 line-clamp-1">📍 {order.address}</p>}
                        {order.chefInstructions && (
                          <p className="text-yellow-400/90 italic bg-yellow-500/5 p-1.5 rounded border border-yellow-500/10 mt-1">
                            ⚠️ Instructions: {order.chefInstructions}
                          </p>
                        )}
                      </div>

                      {/* Product details inside the card */}
                      <div className="space-y-1.5 border-t border-dashed border-white/5 pt-2.5 mb-4">
                        {order.items?.map((it: any, index: number) => (
                          <div key={index} className="flex justify-between text-[11px] text-gray-200">
                            <span className="font-bold">{it.name} <span className="text-orange-500">x{it.quantity}</span></span>
                            <span className="font-mono text-gray-400">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer operations */}
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
                          title="Print Receipt"
                        >
                          <Printer size={14} />
                        </button>

                        {order.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(order.id, 'rejected')}
                            className="p-2.5 bg-red-950/20 hover:bg-red-950 text-red-500 border border-red-500/10 rounded-xl transition-all"
                            title="Reject/Cancel Order"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: COUNTER BILLING PANEL */}
        {activeTab === 'billing' && (
          <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
            
            {/* LEFT AREA: Product catalog list */}
            <div className="flex-1 bg-neutral-950 border border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl">
              <div className="flex gap-2 items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search dishes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/5 rounded-xl py-2 px-9 text-xs outline-none text-white focus:border-orange-500 placeholder-gray-500 transition-colors"
                  />
                </div>
              </div>

              {/* Categorization chips */}
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

              {/* Product grid list */}
              {loading ? (
                <div className="flex items-center justify-center flex-1">
                  <Loader2 className="animate-spin text-orange-500" size={24} />
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto flex-1 pr-1 pb-16">
                  {filteredMenu.map((item) => {
                    const isAvailable = item.isAvailable !== false;
                    return (
                      <button
                        key={item.id}
                        disabled={!isAvailable}
                        onClick={() => handleAddProductToCart(item)}
                        className={`bg-neutral-900 border p-3 rounded-2xl text-left flex flex-col justify-between h-24 hover:border-orange-500 transition-all duration-200 active:scale-95 ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'border-white/5'}`}
                      >
                        <div>
                          <p className="font-bold text-xs text-gray-100 line-clamp-2 leading-snug">{item.name}</p>
                          <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">{item.category}</p>
                        </div>
                        <div className="flex justify-between items-end w-full">
                          <p className="text-yellow-300 font-black text-xs font-mono">₹{item.price}</p>
                          {!isAvailable && <span className="text-[7px] font-black text-red-500 uppercase">Unavailable</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT AREA: Cart settlement and checkout form */}
            <form onSubmit={handlePlaceOrder} className="w-full md:w-[380px] bg-neutral-950 border border-white/5 rounded-3xl p-4 flex flex-col justify-between shadow-xl overflow-y-auto h-full max-h-[85vh] scrollbar-thin">
              
              {/* Product Ledger Summary */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-orange-500 mb-3 border-b border-white/5 pb-2">Active Order Desk</h3>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto mb-4 pr-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs text-gray-300 font-semibold">
                      <span className="flex-1 truncate pr-2">{item.name}</span>
                      <div className="flex items-center gap-2 bg-neutral-900 border border-white/5 px-2 py-0.5 rounded-lg mr-4">
                        <button type="button" onClick={() => handleUpdateCartQuantity(item.id, -1)} className="text-gray-400 hover:text-white"><Minus size={10} /></button>
                        <span className="font-bold text-white min-w-[12px] text-center font-mono">{item.quantity}</span>
                        <button type="button" onClick={() => handleUpdateCartQuantity(item.id, 1)} className="text-gray-400 hover:text-white"><Plus size={10} /></button>
                      </div>
                      <span className="font-mono text-gray-100 font-black">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <p className="text-center py-8 text-gray-500 text-[10px] uppercase font-bold tracking-wider">Your bill is empty</p>
                  )}
                </div>

                {/* Member Rewards verification Panel */}
                <div className="border-t border-white/5 pt-3.5 mb-4">
                  <p className="text-[8px] font-black uppercase text-gray-400 tracking-wider mb-2">Member Rewards Ledger</p>
                  <div className="flex gap-2">
                    <input 
                      type="tel" 
                      maxLength={10}
                      placeholder="Customer 10-digit phone..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="bg-neutral-900 border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-orange-500 font-bold flex-1"
                    />
                    <button 
                      type="button"
                      onClick={handleCheckLoyalty}
                      className="bg-orange-500 hover:bg-orange-600 text-black text-xs font-black px-3.5 rounded-xl transition-colors flex items-center gap-1 shrink-0"
                    >
                      <User size={12} /> Verify
                    </button>
                  </div>

                  {customerPhone && customerPoints > 0 && (
                    <div className="mt-2 bg-yellow-400/5 border border-yellow-400/20 p-2.5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-yellow-300 uppercase">Loyalty Points Available</p>
                        <p className="text-[10px] text-gray-300 font-semibold">{customerName || 'Walk-in Guest'} ({customerPoints} pts)</p>
                      </div>
                      <input 
                        type="number"
                        max={Math.min(customerPoints, getSubtotal())}
                        placeholder="Points to redeem"
                        value={pointsToRedeem || ''}
                        onChange={(e) => setPointsToRedeem(Math.max(0, Number(e.target.value)))}
                        className="w-16 bg-neutral-900 border border-yellow-400/20 text-yellow-300 p-1 rounded text-center text-xs font-mono outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* POS Discount & Chef Note Fields */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400">Custom Discount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 50"
                      value={customDiscount || ''}
                      onChange={(e) => setCustomDiscount(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-neutral-900 border border-white/5 rounded-xl p-2 text-xs text-white outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-gray-400">Order Fulfilment</label>
                    <div className="flex bg-neutral-900 border border-white/5 p-1 rounded-xl">
                      <button 
                        type="button"
                        onClick={() => setFulfillmentType('dine_in')}
                        className={`flex-1 text-[8px] font-black uppercase py-1.5 rounded ${fulfillmentType === 'dine_in' ? 'bg-orange-500 text-black' : 'text-gray-400'}`}
                      >
                        DINE-IN
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFulfillmentType('takeaway')}
                        className={`flex-1 text-[8px] font-black uppercase py-1.5 rounded ${fulfillmentType === 'takeaway' ? 'bg-orange-500 text-black' : 'text-gray-400'}`}
                      >
                        TAKEAWAY
                      </button>
                    </div>
                  </div>
                </div>

                {fulfillmentType === 'dine_in' && (
                  <div className="space-y-1 mb-4">
                    <label className="text-[8px] font-black uppercase text-gray-400">Dine-In Table Selector</label>
                    <select 
                      value={tableNumber} 
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-bold"
                    >
                      {Array.from({ length: 10 }).map((_, i) => (
                        <option key={i} value={`Table ${i+1}`}>Table {i+1}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1 mb-4">
                  <label className="text-[8px] font-black uppercase text-gray-400">Kitchen Note / Chef Instructions</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Extra Spicy, Soft Base..." 
                    value={chefInstructions}
                    onChange={(e) => setChefInstructions(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-semibold"
                  />
                </div>
              </div>

              {/* Order total placement operations */}
              <div className="border-t border-white/5 pt-3.5 space-y-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                    <span>Subtotal:</span>
                    <span>₹{getSubtotal()}</span>
                  </div>
                  {(pointsToRedeem > 0 || customDiscount > 0) && (
                    <div className="flex justify-between text-[10px] text-yellow-300 font-bold">
                      <span>Total Savings:</span>
                      <span>-₹{getLoyaltyDiscount() + customDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-green-400 font-mono">
                    <span>Grand Total:</span>
                    <span>₹{getTotalBill()}</span>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmittingOrder || cart.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
                >
                  {isSubmittingOrder ? <Loader2 className="animate-spin" size={14} /> : <span>Confirm & Print Bill 🚀</span>}
                </button>
              </div>

            </form>
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
                title="Refresh Menu"
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
                    className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between"
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
    </div>
  );
}
