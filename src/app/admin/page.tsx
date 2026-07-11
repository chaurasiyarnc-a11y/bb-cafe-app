'use client';
  
import React, { useState, useEffect, useMemo } from 'react';
// Changed to reliable relative path to avoid compile-time path resolution errors
import { db } from '../../lib/firebase'; 
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, addDoc, deleteDoc, increment } from 'firebase/firestore';
import { Power, Eye, EyeOff, User, MapPin, Calendar, CheckCircle2, LogOut, Loader2, Phone, Plus, Trash, Edit, X, Lock, BarChart3, Download, Folder, Percent, ImageIcon, Gift, Settings, Search, BookOpen, Share2, MessageSquare } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Categories default list
const ADD_CATEGORIES = ["Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

// --- STATUS CHANGE HANDLER ---
const handleStatusChange = async (order: any, newStatus: string) => {
  try {
    // 1. Firebase में स्टेटस अपडेट करें
    await updateDoc(doc(db, "orders", order.id), { status: newStatus });
    toast.success("Status Sync Success!");

    // 2. जब आर्डर 'delivered' मार्क हो, तब उसे Loyverse POS में भेजें
    if (newStatus === "delivered") {
      toast.loading("Syncing to Loyverse POS...", { id: "pos-sync" });
      try {
        const response = await fetch('/api/loyverse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        const result = await response.json();
        
        if (result.success) {
          toast.success("Synced with Loyverse POS!", { id: "pos-sync" });
        } else {
          console.error("Loyverse Sync Error:", result.error, result.details);
          toast.error(`POS Sync Failed: ${result.error || "Unknown Error"}`, { id: "pos-sync" });
        }
      } catch (err) {
        console.error("Fetch POS error:", err);
        toast.error("Network error during POS sync.", { id: "pos-sync" });
      }
    }
  } catch (e) {
    toast.error("Failed to Sync Status.");
  }
};

// --- PRINT / SAVE AS PDF FUNCTION ---
const handlePrintReceipt = (order: any) => {
  const printWindow = window.open('', '_blank', 'width=600,height=800');
  if (!printWindow) {
    return toast.error("Please allow pop-ups in your browser to print the bill.");
  }

  const formattedBillNo = String(order.billNumber || 0).padStart(4, '0');
  const orderDate = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString() : new Date(order.timestamp).toLocaleString();

  const itemsRows = order.items?.map((item: any) => `
    <tr>
      <td style="padding: 6px 0; font-size: 13px;">${item.name}</td>
      <td style="padding: 6px 0; font-size: 13px; text-align: center;">x${item.quantity}</td>
      <td style="padding: 6px 0; font-size: 13px; text-align: right;">₹${item.price * item.quantity}</td>
    </tr>
  `).join('') || '';

  printWindow.document.write(`
    <html>
      <head>
        <title>Bill_#${formattedBillNo}</title>
        <style>
          @page { size: auto; margin: 0mm; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            color: #000; 
            background: #fff; 
            padding: 20px; 
            width: 320px; 
            margin: 0 auto;
          }
          .text-center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          .total-row { font-weight: bold; font-size: 15px; }
          .qr-container { margin-top: 15px; text-align: center; }
          .qr-image { width: 180px; height: auto; display: block; margin: 10px auto; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h2 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase;">BUM BUM CAFE</h2>
          <p style="margin: 3px 0; font-size: 11px;">Mohandra, Panna (M.P.)</p>
          <p style="margin: 3px 0; font-size: 11px;">Mobile: +91 9714293759</p>
        </div>
        
        <div class="divider"></div>
        
        <div style="font-size: 12px; line-height: 1.5;">
          <div><b>Bill No  :</b> #${formattedBillNo}</div>
          <div><b>Token No :</b> #${order.tokenNumber || 'N/A'}</div>
          <div><b>Date     :</b> ${orderDate}</div>
          <div><b>Name     :</b> ${order.customerName || 'Guest'}</div>
          <div><b>Phone    :</b> ${order.customerPhone || 'N/A'}</div>
        </div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; font-size: 12px; padding-bottom: 5px;">Item</th>
              <th style="text-align: center; font-size: 12px; padding-bottom: 5px;">Qty</th>
              <th style="text-align: right; font-size: 12px; padding-bottom: 5px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <table style="font-size: 13px;">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right;">₹${order.subtotal || order.total}</td>
          </tr>
          ${order.discount ? `
          <tr>
            <td>Discount:</td>
            <td style="text-align: right;">-₹${order.discount}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td style="padding-top: 5px; font-size: 16px;">GRAND TOTAL:</td>
            <td style="text-align: right; padding-top: 5px; font-size: 16px;">₹${order.total}</td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="qr-container">
          <p style="margin: 0; font-size: 11px; font-weight: bold;">Scan with PhonePe / UPI to Pay</p>
          <img class="qr-image" src="/phonepe-qr.png" alt="Payment QR" />
        </div>
        
        <div class="divider"></div>
        
        <p class="text-center" style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold;">Thank You! Visit Again!</p>
        
        <div class="text-center no-print" style="margin-top: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-weight: bold; background: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer;">Print / Save as PDF</button>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// --- PRINT RECIPE POSTER FOR KITCHEN WALL (SOP ROSTER SHEET) ---
const handlePrintRosterSOP = (product: any) => {
  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) {
    return toast.error("Please allow pop-ups to print recipe sheets.");
  }

  const stepsHtml = product.ingredients?.map((item: any) => `
    <div style="margin-bottom: 25px; page-break-inside: avoid;">
      <div style="display: flex; align-items: flex-start; gap: 15px;">
        <div style="background: #000; color: #fff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; flex-shrink: 0;">
          ${item.step}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; border-bottom: 2px dashed #000; padding-bottom: 5px;">
            <span style="font-size: 20px; font-weight: 900; text-transform: uppercase;">${item.name}</span>
            <span style="font-size: 20px; font-weight: 900; color: #f97316;">${item.quantity}</span>
          </div>
          ${item.note ? `<p style="margin: 6px 0 0 0; font-size: 15px; font-style: italic; color: #444; font-weight: 600;">👉 ${item.note}</p>` : ''}
        </div>
      </div>
    </div>
  `).join('') || '<p style="text-align: center; font-size: 16px; font-style: italic;">SOP list has no ingredients added yet.</p>';

  printWindow.document.write(`
    <html>
      <head>
        <title>SOP_Recipe_${product.name}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            color: #000; 
            background: #fff; 
            line-height: 1.5;
            padding: 10px;
          }
          .header { text-align: center; border-bottom: 5px double #000; padding-bottom: 15px; margin-bottom: 30px; }
          .title { margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; }
          .sub-title { font-size: 20px; font-weight: bold; margin-top: 8px; text-transform: uppercase; background: #000; color: #fff; padding: 6px 15px; display: inline-block; }
          .category { font-size: 14px; text-transform: uppercase; font-weight: bold; color: #555; margin-top: 8px; }
          .warning-box { border: 3px solid #000; padding: 15px; text-align: center; margin-top: 40px; font-weight: 900; font-size: 16px; text-transform: uppercase; background: #f3f4f6; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BUM BUM CAFE - KITCHEN MANIFEST</div>
          <div class="sub-title">STANDARD RECIPE: ${product.name}</div>
          <div class="category">Category Segment: ${product.category}</div>
        </div>

        <div style="font-size: 16px; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; border-left: 6px solid #f97316; padding-left: 12px;">
          📝 Step-by-Step Cooking instructions & Raw Materials:
        </div>

        <div style="margin-top: 15px;">
          ${stepsHtml}
        </div>

        <div class="warning-box">
          ⚠️ रसोइया ध्यान दें: कैफ़े की गुणवत्ता बनाए रखने के लिए इस चार्ट के अनुसार ही सटीक मात्रा का उपयोग करें!
        </div>

        <div class="no-print" style="text-align: center; margin-top: 40px;">
          <button onclick="window.print()" style="padding: 14px 35px; font-size: 16px; font-weight: bold; background: #f97316; color: #fff; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;">Print Recipe Poster</button>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export default function AdminDashboard() {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  // Added 'passwords' and 'roster' to tabs
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'menu' | 'categories' | 'customers' | 'loyalty' | 'banners' | 'reviews' | 'coupons' | 'roster' | 'passwords'>('dashboard');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [storeOpen, setStoreOpen] = useState(true);

  // --- SEARCH QUERIES STATES ---
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // --- EXTENDED STATES FOR NEW TABS ---
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatImage, setNewCatImage] = useState("");
  
  // Category Editing State
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatImage, setEditCatImage] = useState("");

  const [banners, setBanners] = useState<any[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponValue, setNewCouponValue] = useState("");

  // --- CUSTOMER LOYALTY CLUB STATE ---
  const [loyaltyUsers, setLoyaltyUsers] = useState<any[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPoints, setEditCustomerPoints] = useState(0);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any>(null);

  // --- DYNAMIC LOYALTY RULES STATE ---
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRulePoints, setNewRulePoints] = useState("");

  // --- CUSTOMER POINT TRANSFERS AUDIT STATE ---
  const [transferLogs, setTransferLogs] = useState<any[]>([]);

  // --- DYNAMIC PASSCODES FROM FIRESTORE ---
  const [passcodes, setPasscodes] = useState({ adminPin: "971429", managerPin: "123456" });
  const [userRole, setUserRole] = useState<'admin' | 'manager' | null>(null);
  const [newAdminPinInput, setNewAdminPinInput] = useState("");
  const [newManagerPinInput, setNewManagerPinInput] = useState("");

  // --- START & END DATE FILTERS (30: Custom Date-Range Sales Audit) ---
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default start: 7 days ago
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Default end: Today
  const [ordersFilterDate, setOrdersFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // --- ADD PRODUCT STATES ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Special Pizza");
  const [newImage, setNewImage] = useState("");
  
  const [variantType, setVariantType] = useState<'none' | 'half_full' | 'plain_butter' | 'pizza_sizes'>('none');
  const [halfPrice, setHalfPrice] = useState("");
  const [fullPrice, setFullPrice] = useState("");
  const [priceSmall, setPriceSmall] = useState("");
  const [priceMedium, setPriceMedium] = useState("");
  const [priceLarge, setPriceLarge] = useState("");
  const [priceXL, setPriceXL] = useState("");

  // --- EDIT PRODUCT STATES ---
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editVariantType, setEditVariantType] = useState<'none' | 'half_full' | 'plain_butter' | 'pizza_sizes'>('none');
  const [editHalfPrice, setEditHalfPrice] = useState("");
  const [editFullPrice, setEditFullPrice] = useState("");
  const [editPriceSmall, setEditPriceSmall] = useState("");
  const [editPriceMedium, setEditPriceMedium] = useState("");
  const [editPriceLarge, setEditPriceLarge] = useState("");
  const [editPriceXL, setEditPriceXL] = useState("");

  // --- SOP / RECIPE STATES (65: SOP Recipe Guide) ---
  const [sopProduct, setSopProduct] = useState<any>(null);
  const [sopRecipeText, setSopRecipeText] = useState("");

  // --- BROADCAST MODAL STATES (39: WhatsApp Broadcast) ---
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("Special Offer from Bum Bum Cafe! Get 10% OFF on all Special Pizzas today! 🍕🔥");

  // --- KITCHEN ROSTER RECIPE STATES ---
  const [rosterSelectedProduct, setRosterSelectedProduct] = useState<any>(null);
  const [rosterStepName, setRosterStepName] = useState("");
  const [rosterStepQty, setRosterStepQty] = useState("");
  const [rosterStepNote, setRosterStepNote] = useState("");

  // Helper function to format bill number to e.g., '0015'
  const formatBillNumber = (num: number) => {
    return String(num).padStart(4, '0');
  };

  // 1. Session verification check
  useEffect(() => {
    const adminSession = sessionStorage.getItem('bb_cafe_admin_verified');
    const adminRole = sessionStorage.getItem('bb_cafe_admin_role') as 'admin' | 'manager' | null;
    if (adminSession === 'true' && adminRole) {
      setIsVerified(true);
      setUserRole(adminRole);
    }
    setLoading(false);
  }, []);

  // 2. Real-time Security Passcodes Loader (Bypasses local storage securely)
  useEffect(() => {
    const unsubPasscodes = onSnapshot(doc(db, "settings", "passcodes"), (d) => {
      if (d.exists()) {
        const loaded = {
          adminPin: d.data().adminPin || "971429",
          managerPin: d.data().managerPin || "123456"
        };
        setPasscodes(loaded);
        setNewAdminPinInput(loaded.adminPin);
        setNewManagerPinInput(loaded.managerPin);
      }
    });
    return () => unsubPasscodes();
  }, []);

  // 3. Real-time Data Listeners
  useEffect(() => {
    if (!isVerified) return;

    // Listen for Orders
    const qOrders = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Products
    const qProducts = query(collection(db, "products"));
    const unsubProducts = onSnapshot(qProducts, (snap) => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Dynamic Categories
    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Store Status
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) setStoreOpen(d.data().isOpen);
    });

    // Listen for Banners
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Coupons
    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Reviews
    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Customer Loyalty Points
    const unsubLoyalty = onSnapshot(collection(db, "customer_points"), (snap) => {
      setLoyaltyUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Loyalty Rules
    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => {
      setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for Customer Point Transfers safely
    const unsubTransfers = onSnapshot(collection(db, "point_transfers"), (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a: any, b: any) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tB - tA;
      });
      setTransferLogs(logs);
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCats();
      unsubStore();
      unsubBanners();
      unsubCoupons();
      unsubReviews();
      unsubLoyalty();
      unsubRules();
      unsubTransfers();
    };
  }, [isVerified]);

  // --- PASSCODE LOGIN ---
  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === passcodes.adminPin) {
      sessionStorage.setItem('bb_cafe_admin_verified', 'true');
      sessionStorage.setItem('bb_cafe_admin_role', 'admin');
      setIsVerified(true);
      setUserRole('admin');
      toast.success("Welcome back, Boss!");
    } else if (passcode === passcodes.managerPin) {
      sessionStorage.setItem('bb_cafe_admin_verified', 'true');
      sessionStorage.setItem('bb_cafe_admin_role', 'manager');
      setIsVerified(true);
      setUserRole('manager');
      toast.success("Logged in as Cafe Manager!");
    } else {
      toast.error("Incorrect Security PIN!");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bb_cafe_admin_verified');
    sessionStorage.removeItem('bb_cafe_admin_role');
    setIsVerified(false);
    setUserRole(null);
    window.location.href = "/";
  };

  // --- MERGE REGISTERED & HISTORICAL (OLD) CUSTOMERS ---
  const combinedCustomers = useMemo(() => {
    const customersMap = new Map();
    
    // 1. Process active loyalty database users
    loyaltyUsers.forEach(user => {
      const cleanPhone = String(user.id || user.phone || "").replace("+91", "").trim();
      customersMap.set(cleanPhone, {
        id: cleanPhone,
        phone: cleanPhone,
        name: user.name || "Customer",
        points: user.points || 0,
        isRegistered: true
      });
    });

    // 2. Scan historical orders to fetch old customer directory safely
    orders.forEach(order => {
      if (!order.customerPhone) return;
      const cleanPhone = String(order.customerPhone).replace("+91", "").trim();
      if (!customersMap.has(cleanPhone)) {
        customersMap.set(cleanPhone, {
          id: cleanPhone,
          phone: cleanPhone,
          name: order.customerName || "Customer",
          points: 0,
          isRegistered: false
        });
      }
    });

    return Array.from(customersMap.values());
  }, [loyaltyUsers, orders]);

  // --- SEARCH CUSTOMERS BY NAME & PHONE (CUSTOMER TAB SEARCH) ---
  const searchedCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return combinedCustomers;
    const q = customerSearchQuery.toLowerCase().trim();
    return combinedCustomers.filter(c => 
      String(c.name).toLowerCase().includes(q) || 
      String(c.phone).includes(q)
    );
  }, [combinedCustomers, customerSearchQuery]);

  // --- COMBINE DYNAMIC + FALLBACK CATEGORIES TO PREVENT EMPTY LISTS ---
  const combinedCategories = useMemo(() => {
    const list = [...categories];
    ADD_CATEGORIES.forEach(fallbackName => {
      const exists = categories.some(c => String(c.name).toLowerCase().trim() === fallbackName.toLowerCase().trim());
      if (!exists) {
        list.push({
          id: `virtual-${fallbackName.replace(/\s+/g, '-')}`,
          name: fallbackName,
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80",
          isVisible: true,
          isVirtual: true
        });
      }
    });
    return list;
  }, [categories]);

  // --- FILTER & SORT ORDERS BY SELECTED DATE AND SEQUENTIAL BILL NUMBER ---
  const filteredOrdersList = useMemo(() => {
    const targetDateStr = new Date(ordersFilterDate).toDateString();
    const matched = orders.filter(o => {
      if (!o.timestamp) return false;
      const orderDate = o.timestamp?.toDate ? o.timestamp.toDate().toDateString() : new Date(o.timestamp).toDateString();
      return orderDate === targetDateStr;
    });
    return matched.sort((a, b) => Number(b.billNumber || 0) - Number(a.billNumber || 0));
  }, [orders, ordersFilterDate]);

  // --- CUSTOMER PROFILE SAVER (POINTS MANUAL OVERRIDE) ---
  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomerName) return toast.error("Name is required!");
    try {
      await setDoc(doc(db, "customer_points", editingCustomer.phone), {
        name: editCustomerName,
        phone: editingCustomer.phone,
        points: Number(editCustomerPoints),
        lastActive: new Date()
      }, { merge: true });
      setEditingCustomer(null);
      toast.success("Customer profile updated!");
    } catch (err) {
      toast.error("Failed to update profile.");
    }
  };

  // --- DYNAMIC LOYALTY RULES CONTROLLER ---
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName || !newRulePoints) return toast.error("Please fill all fields!");
    try {
      await addDoc(collection(db, "loyalty_rules"), {
        rewardName: newRuleName,
        pointsCost: Number(newRulePoints),
        timestamp: new Date()
      });
      setNewRuleName(""); setNewRulePoints("");
      toast.success("New Rule Added!");
    } catch (err) {
      toast.error("Failed to add rule.");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      try {
        await deleteDoc(doc(db, "loyalty_rules", id));
        toast.success("Loyalty Rule Deleted!");
      } catch (err) {
        toast.error("Failed to delete rule.");
      }
    }
  };

  // --- CALCULATE CUSTOMER LOYALTY METRICS (55: VIP Customer Tracker) ---
  const getCustomerLoyaltyMetrics = (phone: string) => {
    const targetPhone = String(phone).replace("+91", "").trim();
    const customerOrders = orders.filter(o => {
      const oPhone = o.customerPhone ? String(o.customerPhone).replace("+91", "").trim() : "";
      return oPhone === targetPhone;
    });

    const totalSpend = customerOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = customerOrders.length;
    
    let tier = "Bronze Member 🥉";
    let tierColor = "text-gray-400 border-gray-500/20 bg-gray-500/5";
    if (totalSpend >= 5000 || orderCount >= 25) {
      tier = "Platinum VIP 👑";
      tierColor = "text-indigo-400 border-indigo-500/20 bg-indigo-500/10 font-black";
    } else if (totalSpend >= 2000 || orderCount >= 10) {
      tier = "Gold VIP 🥇";
      tierColor = "text-yellow-400 border-yellow-500/20 bg-yellow-500/10 font-extrabold";
    } else if (totalSpend >= 800 || orderCount >= 3) {
      tier = "Silver Member 🥈";
      tierColor = "text-gray-300 border-gray-400/20 bg-gray-400/10 font-bold";
    }

    return {
      orderCount,
      totalSpend,
      tier,
      tierColor,
      customerOrders
    };
  };

  // --- CSV / EXCEL EXPORT ENGINE WITH UTF-8 BOM ---
  const triggerCsvDownload = (data: any[], filename: string, headers: string[], keys: string[]) => {
    if (data.length === 0) return toast.error("No data available to export!");

    const csvRows = [];
    csvRows.push(headers.join(',')); // Add headers
    
    data.forEach(item => {
      const values = keys.map(key => {
        let value = item[key];
        if (value === undefined || value === null) value = '';
        const escaped = String(value).replace(/"/g, '""'); 
        return `"${escaped}"`; 
      });
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel Data Exported!");
  };

  // Export 1: Order Sales History
  const handleExportOrders = () => {
    const formattedData = orders.map(o => {
      const itemsSummary = o.items?.map((i: any) => `${i.name} (x${i.quantity})`).join(' | ') || '';
      const orderDate = o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : new Date(o.timestamp).toLocaleString();
      return {
        ...o,
        itemsSummary,
        date: orderDate,
        formattedBill: formatBillNumber(o.billNumber || 0)
      };
    });

    const headers = ['Bill No', 'Token No', 'Customer Name', 'Phone Number', 'Delivery Address', 'Items summary', 'Subtotal (₹)', 'Discount Applied (₹)', 'Total Paid (₹)', 'Status', 'Order Date & Time'];
    const keys = ['formattedBill', 'tokenNumber', 'customerName', 'customerPhone', 'address', 'itemsSummary', 'subtotal', 'discount', 'total', 'status', 'date'];
    triggerCsvDownload(formattedData, `BumBumCafe_SalesLedger_${new Date().toLocaleDateString()}`, headers, keys);
  };

  // Export 2: Unique Client Database
  const handleExportCustomers = () => {
    const seen = new Set();
    const formattedData: any[] = [];

    orders.forEach(o => {
      if (!o.customerPhone) return;
      const phone = String(o.customerPhone);
      if (!seen.has(phone)) {
        seen.add(phone);
        const formattedDate = o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : new Date(o.timestamp).toLocaleString();
        formattedData.push({
          name: o.customerName || "Customer",
          phone: o.customerPhone,
          address: o.address || "N/A",
          lastActive: formattedDate
        });
      }
    });

    const headers = ['Customer Name', 'Mobile Number', 'Last Registered Address', 'Last Active Order Date'];
    const keys = ['name', 'phone', 'address', 'lastActive'];
    triggerCsvDownload(formattedData, `BumBumCafe_CustomersDirectory_${new Date().toLocaleDateString()}`, headers, keys);
  };

  // --- CALENDAR DYNAMIC SALES AUDIT BY RANGE (30: Custom Date-Range Sales Audit) ---
  const getAuditRangeAnalytics = () => {
    const startObj = new Date(startDate);
    startObj.setHours(0,0,0,0);
    const endObj = new Date(endDate);
    endObj.setHours(23,59,59,999);

    const rangeOrders = orders.filter(o => {
      if (!o.timestamp) return false;
      const orderDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      return orderDate >= startObj && orderDate <= endObj;
    });

    const totalRevenue = rangeOrders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

    // Split Sales Cash vs UPI/Card (18: Cash vs UPI payment split)
    let cashSales = 0;
    let upiSales = 0;
    rangeOrders.forEach(o => {
      const amt = Number(o.total) || 0;
      if (o.paymentMethod === 'Cash' || o.billNumber % 2 === 0) {
        cashSales += amt;
      } else {
        upiSales += amt;
      }
    });

    return {
      rangeRevenue: totalRevenue,
      rangeCount: rangeOrders.length,
      active: activeCount,
      cashSales,
      upiSales,
      rangeOrders
    };
  };

  // --- GET LIFETIME DASHBOARD METRICS ---
  const getLifetimeMetrics = () => {
    const seenPhones = new Set();
    orders.forEach(o => { if (o.customerPhone) seenPhones.add(String(o.customerPhone)); });
    const totalBusiness = orders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    return {
      lifetimeRevenue: totalBusiness,
      lifetimeOrdersCount: orders.length,
      lifetimeCustomersCount: seenPhones.size
    };
  };

  const auditStats = getAuditRangeAnalytics();
  const lifetimeStats = getLifetimeMetrics();

  // --- MOST SELLING DISHES (06: Most Selling Items Analytics) ---
  const topSellingDishes = useMemo(() => {
    const countsMap: any = {};
    orders.forEach(o => {
      o.items?.forEach((item: any) => {
        if (!item.name) return;
        countsMap[item.name] = (countsMap[item.name] || 0) + (Number(item.quantity) || 1);
      });
    });

    return Object.entries(countsMap)
      .map(([name, qty]: any) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // Get Top 5
  }, [orders]);

  // --- LAST 7 DAYS CHART DATA (16: Lightweight Sales Bar Chart) ---
  const last7DaysChartData = useMemo(() => {
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        dateStr: d.toDateString(),
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        sales: 0
      });
    }

    orders.forEach(o => {
      if (!o.timestamp) return;
      const orderDateStr = o.timestamp?.toDate ? o.timestamp.toDate().toDateString() : new Date(o.timestamp).toDateString();
      const match = days.find(day => day.dateStr === orderDateStr);
      if (match) {
        match.sales += (Number(o.total) || 0);
      }
    });

    const maxSales = Math.max(...days.map(d => d.sales), 100);

    return days.map(day => ({
      ...day,
      percentage: (day.sales / maxSales) * 100
    }));
  }, [orders]);

  // Dynamic categories helper
  const categoryOptions = categories.length > 0 
    ? categories.map(c => c.name)
    : ADD_CATEGORIES;

  // --- DYNAMIC CATEGORY ACTIONS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatImage) return toast.error("Please fill Name & Image link!");
    try {
      await addDoc(collection(db, "categories"), {
        name: newCatName,
        image: newCatImage,
        isVisible: true,
        timestamp: new Date()
      });
      setNewCatName(""); setNewCatImage("");
      toast.success("Category added!");
    } catch (err) { toast.error("Failed to add category"); }
  };

  const toggleCategoryVisibility = async (cat: any) => {
    try {
      if (cat.isVirtual) {
        // Automatically save virtual fallback category to DB with toggled visibility
        await addDoc(collection(db, "categories"), {
          name: cat.name,
          image: cat.image,
          isVisible: !cat.isVisible,
          timestamp: new Date()
        });
      } else {
        await updateDoc(doc(db, "categories", cat.id), { isVisible: !cat.isVisible });
      }
      toast.success("Category status updated!");
    } catch (err) { toast.error("Failed to update status"); }
  };

  const startEditingCategory = (cat: any) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatImage(cat.image);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatName || !editCatImage) return toast.error("Please fill all fields!");
    try {
      if (editingCategory.isVirtual) {
        // Automatically persist and save virtual category to Database
        await addDoc(collection(db, "categories"), {
          name: editCatName,
          image: editCatImage,
          isVisible: true,
          timestamp: new Date()
        });
      } else {
        await updateDoc(doc(db, "categories", editingCategory.id), {
          name: editCatName,
          image: editCatImage
        });
      }
      setEditingCategory(null);
      toast.success("Category updated successfully!");
    } catch (err) {
      toast.error("Failed to update category.");
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (cat.isVirtual) {
      return toast.error("यह एक डिफॉल्ट कैटेगरी है। इसे डिलीट करने के लिए पहले इसे एडिट करें।");
    }
    if (window.confirm("Are you sure you want to delete this Category?")) {
      try {
        await deleteDoc(doc(db, "categories", cat.id));
        toast.success("Category Deleted!");
      } catch (err) { toast.error("Failed to delete category"); }
    }
  };

  // --- DYNAMIC BANNERS ACTIONS ---
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerUrl) return;
    try {
      await addDoc(collection(db, "banners"), { url: newBannerUrl, timestamp: new Date() });
      setNewBannerUrl("");
      toast.success("New Banner Added!");
    } catch (err) { toast.error("Error adding banner"); }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await deleteDoc(doc(db, "banners", id));
      toast.success("Banner Deleted!");
    } catch (err) { toast.error("Error deleting banner"); }
  };

  // --- DYNAMIC REVIEWS ACTIONS ---
  const handleApproveReview = async (id: string) => {
    try {
      await updateDoc(doc(db, "reviews", id), { isApproved: true });
      toast.success("Review Approved!");
    } catch (err) { toast.error("Error approving review"); }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reviews", id));
      toast.success("Review Deleted!");
    } catch (err) { toast.error("Error deleting review"); }
  };

  // --- DYNAMIC COUPONS ACTIONS ---
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponValue) return;
    try {
      await addDoc(collection(db, "coupons"), {
        code: newCouponCode.trim().toUpperCase(),
        discountValue: Number(newCouponValue),
        timestamp: new Date()
      });
      setNewCouponCode(""); setNewCouponValue("");
      toast.success("New Coupon created!");
    } catch (err) { toast.error("Error creating coupon"); }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    try {
      await deleteDoc(doc(db, "coupons", couponId));
      toast.success("Coupon Deleted!");
    } catch (error) { parseInt("1"); toast.error("Error deleting coupon"); }
  };

  // --- STORE ACTIONS ---
  const toggleStore = async () => {
    try {
      await setDoc(doc(db, "settings", "store"), { isOpen: !storeOpen });
      toast.success(storeOpen ? "Cafe is now OFFLINE" : "Cafe is now ONLINE");
    } catch (e) { toast.error("Error toggling store"); }
  };

  // --- OTHER MENU ITEM ACTIONS ---
  const toggleItemVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "products", id), { isVisible: !currentStatus });
      toast.success("Visibility Updated");
    } catch (e) { toast.error("Error updating product"); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product permanently?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        toast.success("Product Deleted permanently!");
      } catch (error) {
        toast.error("Error deleting product");
      }
    }
  };

  // --- COMPACT BULK IMPORT ---
  const handleBulkImport = async () => {
    if (!window.confirm("BUM BUM CAFE PDF ke items ko database mein add karein?")) return;
    toast.loading("Importing menu items...", { id: "import" });

    const data = [
      { name: "Special Tea (स्पेशल चाय)", category: "Fast Food", price: 15, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=300&q=80" },
      { name: "Cheese Corn Pizza", category: "Special Pizza", price: 80, variants: { Small: 80, Medium: 110, Large: 140, "Extra Large": 180 }, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80" }
    ];

    try {
      for (const item of data) {
        await addDoc(collection(db, "products"), {
          ...item,
          isVisible: true
        });
      }
      toast.dismiss("import");
      toast.success("Sample items imported! Database seeded safely.");
    } catch (e) {
      toast.dismiss("import");
      toast.error("Error seeding PDF items");
    }
  };

  // --- ADD NEW PRODUCT FUNCTION (With Duplicate check) ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCategory || !newImage) {
      return toast.error("Please fill all required fields!");
    }

    // --- (DUPLICATE ITEM PREVENT CHECKER) ---
    const exists = menu.some(item => String(item.name).toLowerCase().trim() === newName.toLowerCase().trim());
    if (exists) {
      return toast.error("यह डिश पहले से मेन्यू में मौजूद है!");
    }

    let productData: any = {
      name: newName,
      category: newCategory,
      image: newImage,
      isVisible: true
    };

    if (variantType === 'none') {
      if (!newPrice) return toast.error("Please enter price!");
      productData.price = Number(newPrice);
    } else if (variantType === 'half_full') {
      if (!halfPrice || !fullPrice) return toast.error("Please fill prices!");
      productData.variants = { half: Number(halfPrice), full: Number(fullPrice) };
      productData.price = Number(halfPrice);
    } else if (variantType === 'plain_butter') {
      if (!halfPrice || !fullPrice) return toast.error("Please fill prices!");
      productData.variants = { Plain: Number(halfPrice), Butter: Number(fullPrice) };
      productData.price = Number(halfPrice);
    } else if (variantType === 'pizza_sizes') {
      const pizzaVariants: any = {};
      if (priceSmall) pizzaVariants.Small = Number(priceSmall);
      if (priceMedium) pizzaVariants.Medium = Number(priceMedium);
      if (priceLarge) pizzaVariants.Large = Number(priceLarge);
      if (priceXL) pizzaVariants["Extra Large"] = Number(priceXL);

      if (Object.keys(pizzaVariants).length === 0) {
        return toast.error("Kam se kam ek size ki price dalna zaroori hai!");
      }

      productData.variants = pizzaVariants;
      const sortedPrices = Object.values(pizzaVariants).map(Number);
      productData.price = Math.min(...sortedPrices);
    }

    try {
      await addDoc(collection(db, "products"), productData);
      toast.success("New Item Added!");
      setNewName(""); setNewPrice(""); setNewImage(""); setVariantType('none');
      setHalfPrice(""); setFullPrice(""); setPriceSmall(""); setPriceMedium(""); setPriceLarge(""); setPriceXL("");
      setShowAddForm(false);
    } catch (error) {
      toast.error("Error adding product");
    }
  };

  // --- EDIT PRODUCT SELECTOR LOGIC ---
  const startEditing = (item: any) => {
    setShowAddForm(false);
    setEditingProduct(item);
    setEditName(item.name);
    setEditPrice(item.price || "");
    setEditCategory(item.category);
    setEditImage(item.image);
    if (item.variants) {
      const keys = Object.keys(item.variants);
      if (keys.includes('Small') || keys.includes('Medium') || keys.includes('Large') || keys.includes('Extra Large')) {
        setEditVariantType('pizza_sizes');
        setEditPriceSmall(item.variants.Small || "");
        setEditPriceMedium(item.variants.Medium || "");
        setEditPriceLarge(item.variants.Large || "");
        setEditPriceXL(item.variants["Extra Large"] || "");
      } else if (keys.includes('Plain')) {
        setEditVariantType('plain_butter');
        setEditHalfPrice(item.variants.Plain || "");
        setEditFullPrice(item.variants.Butter || "");
      } else {
        setEditVariantType('half_full');
        setEditHalfPrice(item.variants.half || "");
        setEditFullPrice(item.variants.full || "");
      }
    } else {
      setEditVariantType('none');
      setEditPriceSmall(""); setEditPriceMedium(""); setEditPriceLarge(""); setEditPriceXL("");
      setEditHalfPrice(""); setEditFullPrice("");
    }
  };

  // --- EDIT & UPDATE PROCESSOR (With Duplicate checker) ---
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editCategory || !editImage) {
      return toast.error("Please fill all fields!");
    }

    // --- (DUPLICATE ITEM PREVENT CHECKER FOR EDITING) ---
    const exists = menu.some(item => 
      item.id !== editingProduct.id && 
      String(item.name).toLowerCase().trim() === editName.toLowerCase().trim()
    );
    if (exists) {
      return toast.error("इस नाम की डिश पहले से मेन्यू में मौजूद है!");
    }

    let updatedData: any = {
      name: editName,
      category: editCategory,
      image: editImage
    };

    if (editVariantType === 'half_full') {
      if (!editHalfPrice || !editFullPrice) return toast.error("Please enter both variant prices!");
      updatedData.variants = { half: Number(editHalfPrice), full: Number(editFullPrice) };
      updatedData.price = Number(editHalfPrice);
    } else if (editVariantType === 'plain_butter') {
      if (!editHalfPrice || !editFullPrice) return toast.error("Please enter both variant prices!");
      updatedData.variants = { Plain: Number(editHalfPrice), Butter: Number(editFullPrice) };
      updatedData.price = Number(editHalfPrice);
    } else if (editVariantType === 'pizza_sizes') {
      const pizzaVariants: any = {};
      if (editPriceSmall) pizzaVariants.Small = Number(editPriceSmall);
      if (editPriceMedium) pizzaVariants.Medium = Number(editPriceMedium);
      if (editPriceLarge) pizzaVariants.Large = Number(editPriceLarge);
      if (editPriceXL) pizzaVariants["Extra Large"] = Number(editPriceXL);

      if (Object.keys(pizzaVariants).length === 0) {
        return toast.error("Kam se kam ek size ki price dalna zaroori hai!");
      }

      updatedData.variants = pizzaVariants;
      const sortedPrices = Object.values(pizzaVariants).map(Number);
      updatedData.price = Math.min(...sortedPrices);
    } else {
      if (!editPrice) return toast.error("Please enter a price!");
      updatedData.price = Number(editPrice);
      updatedData.variants = null;
    }

    try {
      await updateDoc(doc(db, "products", editingProduct.id), updatedData);
      toast.success("Product Updated successfully!");
      setEditingProduct(null);
    } catch (e) {
      toast.error("Error updating product");
    }
  };

  // --- SAVE PRODUCT RECIPE / SOP (65: SOP Recipe Guide) ---
  const handleSaveSopRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sopProduct) return;
    try {
      await updateDoc(doc(db, "products", sopProduct.id), {
        recipe: sopRecipeText
      });
      setSopProduct(null);
      toast.success("Recipe SOP Saved!");
    } catch (err) {
      toast.error("Failed to save recipe SOP.");
    }
  };

  // --- SAVE DYNAMIC PASSCODES (Only Admin can update) ---
  const handleUpdatePasscodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      return toast.error("केवल मुख्य एडमिन ही पिन बदल सकते हैं!");
    }
    if (newAdminPinInput.length < 4 || newManagerPinInput.length < 4) {
      return toast.error("पिन कम से कम 4 अक्षरों का होना चाहिए!");
    }
    try {
      await setDoc(doc(db, "settings", "passcodes"), {
        adminPin: newAdminPinInput,
        managerPin: newManagerPinInput
      }, { merge: true });
      toast.success("Security PINs updated successfully!");
    } catch (err) {
      toast.error("Failed to update security PINs.");
    }
  };

  // --- ADD KITCHEN ROSTER INGREDIENT STEP ---
  const handleAddRosterStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosterSelectedProduct) return toast.error("पहले एक डिश सिलेक्ट करें!");
    if (!rosterStepName || !rosterStepQty) return toast.error("सामग्री का नाम और मात्रा लिखना ज़रूरी है!");

    const currentIngredients = rosterSelectedProduct.ingredients || [];
    const newStepNum = currentIngredients.length + 1;
    const newStep = {
      step: newStepNum,
      name: rosterStepName,
      quantity: rosterStepQty,
      note: rosterStepNote || ""
    };

    const updatedIngredients = [...currentIngredients, newStep];
    try {
      await updateDoc(doc(db, "products", rosterSelectedProduct.id), {
        ingredients: updatedIngredients
      });
      // Update local state to reflect instantly
      setRosterSelectedProduct({ ...rosterSelectedProduct, ingredients: updatedIngredients });
      setRosterStepName(""); setRosterStepQty(""); setRosterStepNote("");
      toast.success("Roster Step Added!");
    } catch (err) {
      toast.error("Failed to add roster step.");
    }
  };

  // --- DELETE KITCHEN ROSTER STEP ---
  const handleDeleteRosterStep = async (idxToDelete: number) => {
    if (!rosterSelectedProduct) return;
    const currentIngredients = rosterSelectedProduct.ingredients || [];
    const filtered = currentIngredients.filter((_: any, idx: number) => idx !== idxToDelete);
    // Re-index steps logically
    const updated = filtered.map((item: any, idx: number) => ({ ...item, step: idx + 1 }));

    try {
      await updateDoc(doc(db, "products", rosterSelectedProduct.id), {
        ingredients: updated
      });
      setRosterSelectedProduct({ ...rosterSelectedProduct, ingredients: updated });
      toast.success("Step Deleted!");
    } catch (err) {
      toast.error("Failed to delete step.");
    }
  };

  // --- SEND WHATSAPP BILL DIRECT TO CUSTOMER (07: No-Cost WhatsApp Bill) ---
  const handleSendWhatsAppBill = (order: any) => {
    const phone = String(order.customerPhone || "").replace("+91", "").trim();
    if (!phone) return toast.error("Customer phone not found!");

    const formattedBillNo = String(order.billNumber || 0).padStart(4, '0');
    const itemsText = order.items?.map((i: any) => `• ${i.name} (x${i.quantity}) - ₹${i.price * i.quantity}`).join('\n') || '';

    const message = encodeURIComponent(
`*BUM BUM CAFE - INVOICE*
--------------------------
*Bill No:* #${formattedBillNo}
*Token :* #${order.tokenNumber || 'N/A'}
--------------------------
${itemsText}
--------------------------
*Subtotal:* ₹${order.subtotal || order.total}
${order.discount ? `*Discount:* -₹${order.discount}\n` : ''}*Grand Total:* *₹${order.total}*

*Scan and Pay using PhonePe QR:* https://bb-cafe-app.vercel.app/
Thank you for your order, *${order.customerName || 'Guest'}*! Visit Again! 😊`
    );

    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  // --- AUTOMATIC WHATSAPP CLOSING REPORT TO OWNER (63: Daily Closing Report) ---
  const handleSendDailyClosingReport = () => {
    const formattedDate = new Date(endDate).toLocaleDateString('en-IN');
    const topDishesText = topSellingDishes.map((d: any, idx: number) => `${idx + 1}. ${d.name} (${d.qty} times)`).join('\n') || 'None';

    const message = encodeURIComponent(
`*BUM BUM CAFE - DAILY CLOSING REPORT*
*Date:* ${formattedDate}
--------------------------------------
*Total Orders:* ${auditStats.rangeCount}
*Total Revenue:* *₹${auditStats.rangeRevenue}*

*Payment Method Breakdown:*
• *Cash Received:* ₹${auditStats.cashSales}
• *Online/UPI:* ₹${auditStats.upiSales}

*Top Selling Dishes today:*
${topDishesText}
--------------------------------------
Report generated automatically by Bum Bum Cafe POS.`
    );

    window.open(`https://wa.me/919714293759?text=${message}`, '_blank');
  };

  // --- SEND WHATSAPP BROADCAST MESSAGE (39: WhatsApp Broadcast) ---
  const triggerWhatsAppBroadcast = (phone: string) => {
    const cleanPhone = String(phone).replace("+91", "").trim();
    const encodedMsg = encodeURIComponent(broadcastMessage);
    window.open(`https://wa.me/91${cleanPhone}?text=${encodedMsg}`, '_blank');
  };

  // --- RESET DAILY TOKEN MANUALLY (19: Daily Token Reset) ---
  const handleResetTokenCounter = () => {
    if (window.confirm("Bum Bum Cafe ke Token Sequence ko reset karein?")) {
      localStorage.setItem('bb_cafe_token_seed', '1');
      toast.success("Token sequence resets safely!");
    }
  };

  // --- CLIENT SIDE FILTER FOR DYNAMIC MENUS & CATEGORIES ---
  const searchedMenu = useMemo(() => {
    if (!menuSearchQuery.trim()) return menu;
    return menu.filter(item => 
      String(item.name).toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
      String(item.category).toLowerCase().includes(menuSearchQuery.toLowerCase())
    );
  }, [menu, menuSearchQuery]);

  const searchedCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return combinedCategories;
    return combinedCategories.filter(cat => 
      String(cat.name).toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [combinedCategories, categorySearchQuery]);

  // --- Loading Screen ---
  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Securing Session...</p>
      </div>
    );
  }

  // --- Secure PIN Login Screen if not verified ---
  if (!isVerified) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4 font-sans">
        <Toaster />
        <div className="w-full max-w-md bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
          
          <div className="text-center space-y-2 relative z-10">
            <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-black text-orange-500 italic uppercase">Admin Vault</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra</p>
          </div>

          <form onSubmit={handlePasscodeLogin} className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Secret Security PIN</label>
              <input 
                type="password" 
                placeholder="Enter 6-digit passcode" 
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)} 
                className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
                required 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-lg shadow-orange-500/10"
            >
              Authorize & Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-20 font-sans">
      <Toaster />
      
      {/* Header */}
      <header className="p-6 bg-white/[0.03] border-b border-white/5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-orange-500 italic uppercase">Admin Control</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra ({userRole === 'admin' ? 'Boss' : 'Manager'})</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleStore} className={`px-4 py-2 rounded-full text-[10px] font-black flex items-center gap-2 transition-all ${storeOpen ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
            <Power size={14} /> {storeOpen ? "ONLINE" : "OFFLINE"}
          </button>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-full text-gray-400 active:scale-90 transition-all"><LogOut size={18}/></button>
        </div>
      </header>

      {/* --- RESPONSIVE HORIZONTAL TABS --- */}
      <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        <button onClick={() => setTab('dashboard')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'dashboard' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-gray-500'}`}>📊 Dashboard</button>
        <button onClick={() => setTab('orders')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'orders' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>📦 Orders ({orders.length})</button>
        <button onClick={() => setTab('menu')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'menu' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🍔 Menu List</button>
        <button onClick={() => setTab('roster')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'roster' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>📋 Kitchen Roster</button>
        <button onClick={() => setTab('categories')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'categories' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🗂️ Categories</button>
        <button onClick={() => setTab('customers')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'customers' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>👥 Customers ({combinedCustomers.length})</button>
        <button onClick={() => setTab('loyalty')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'loyalty' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🎁 Loyalty Rules</button>
        <button onClick={() => setTab('banners')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'banners' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🖼️ Banners</button>
        <button onClick={() => setTab('coupons')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'coupons' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🎟️ Coupons</button>
        <button onClick={() => setTab('reviews')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'reviews' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>⭐ Reviews</button>
        <button onClick={() => setTab('passwords')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'passwords' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🔑 PIN Settings</button>
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        
        {/* --- TAB 1: DASHBOARD --- */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><BarChart3 size={20}/> Sales Dashboard</h3>
            
            {/* Sales Stats Range Grid (30: Custom Date-Range Sales Audit) */}
            <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-4">
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">🎯 Custom Date-Range Auditor</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Start Date</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-orange-500 outline-none cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">End Date</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-orange-500 outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Auditor KPIs */}
              <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Range Sales</p>
                  <h3 className="text-base font-black text-green-400 mt-1">₹{auditStats.rangeRevenue}</h3>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Range Orders</p>
                  <h3 className="text-base font-black text-yellow-400 mt-1">{auditStats.rangeCount}</h3>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Active Kitchen</p>
                  <h3 className="text-base font-black text-orange-500 mt-1">{auditStats.active}</h3>
                </div>
              </div>

              {/* 18: Cash vs UPI payment split */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Cash Collected:</span>
                  <span className="text-xs font-black text-green-400">₹{auditStats.cashSales}</span>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-500 uppercase">Online (UPI):</span>
                  <span className="text-xs font-black text-blue-400">₹{auditStats.upiSales}</span>
                </div>
              </div>
            </div>

            {/* (16: Lightweight Sales Visuals Bar Chart) */}
            <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-3">
              <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">📈 Last 7 Days Sales Trend</p>
              
              <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-1">
                {last7DaysChartData.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[8px] font-bold text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">₹{day.sales}</span>
                    <div 
                      style={{ height: `${day.percentage}%` }} 
                      className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg min-h-[4px] relative"
                    ></div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* (06: Most Selling Items Analytics) */}
            <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-3">
              <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">🔥 Top 5 Best Selling Dishes</p>
              <div className="space-y-2">
                {topSellingDishes.map((dish, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl text-xs font-bold">
                    <span className="text-gray-300">{idx + 1}. {dish.name}</span>
                    <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black">{dish.qty} times</span>
                  </div>
                ))}
                {topSellingDishes.length === 0 && (
                  <p className="text-center text-[10px] text-gray-600 uppercase font-bold py-2">No sales logged yet...</p>
                )}
              </div>
            </div>

            {/* Daily Reset and Reports (19: Daily Reset & 63: WhatsApp Closing Report) */}
            <div className="grid grid-cols-2 gap-3 bg-[#111]/30 border border-white/5 p-4 rounded-[2rem] shadow-xl">
              <button onClick={handleResetTokenCounter} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase">
                Reset Tokens Counter
              </button>
              <button onClick={handleSendDailyClosingReport} className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-green-500/10">
                📲 Send Report to Owner
              </button>
            </div>

            {/* Excel Exports Buttons */}
            <div className="grid grid-cols-2 gap-3 bg-[#111]/30 border border-white/5 p-4 rounded-[2rem] shadow-xl">
              <button onClick={handleExportOrders} className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-green-500/10">
                <Download size={14}/> Sales Ledger Excel
              </button>
              <button onClick={handleExportCustomers} className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-orange-400/10">
                <Download size={14}/> Customer List Excel
              </button>
            </div>

            {/* Permanent Orders Ledger */}
            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest pt-2">📚 Permanent Financial Ledger</h4>
              {orders.length === 0 ? (
                <p className="text-center text-gray-600 py-12 text-xs uppercase font-bold tracking-widest">No transaction data logged...</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="bg-[#111] border border-white/5 p-5 rounded-3xl flex justify-between items-center relative overflow-hidden">
                    <div className="space-y-1 pr-4">
                      <div className="flex gap-2.5">
                        <span className="text-[10px] font-black uppercase text-gray-500">Bill No: #{formatBillNumber(o.billNumber || 0)}</span>
                        <span className="text-[10px] font-black uppercase text-yellow-500">Token: #{o.tokenNumber || "N/A"}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-300">Name: {o.customerName || "Customer"}</h4>
                      <p className="text-[11px] font-bold text-orange-500">Mobile: {o.customerPhone || "N/A"}</p>
                      <p className="text-[10px] text-gray-400 font-medium">Address: {o.address || "N/A"}</p>
                      
                      <div className="border-t border-white/5 pt-2 mt-2 space-y-0.5">
                        {o.items?.map((item: any, idx: number) => (
                          <p key={idx} className="text-[11px] font-bold text-gray-400">
                            <span className="text-orange-500">×{item.quantity}</span> {item.name}
                          </p>
                        ))}
                      </div>

                      <p className="text-[9px] font-semibold text-gray-600 mt-2">{o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-green-400 font-black text-lg leading-none">₹{o.total}</p>
                      <span className="text-[9px] font-black uppercase bg-green-500/10 text-green-400 px-2.5 py-1 rounded-md mt-2 inline-block">PAID</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: LIVE ORDERS WITH DATE FILTER & SEQUENTIAL TOKENS --- */}
        {tab === 'orders' && (
          <div className="space-y-4">
            
            {/* Orders Calendar Filter */}
            <div className="bg-[#111] border border-white/5 p-5 rounded-3xl flex justify-between items-center">
              <div>
                <h4 className="font-black text-sm text-orange-500 uppercase tracking-wider">📦 Filter Daily Orders</h4>
                <p className="text-[10px] text-gray-500 font-bold mt-0.5">Matching Token & Bill Sequences</p>
              </div>
              <input 
                type="date" 
                value={ordersFilterDate} 
                onChange={(e) => setOrdersFilterDate(e.target.value)} 
                className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-bold text-orange-500 outline-none cursor-pointer"
              />
            </div>

            {filteredOrdersList.length === 0 ? (
              <p className="text-center text-gray-600 py-20 font-bold uppercase tracking-widest text-xs">No active orders found for this date...</p>
            ) : (
              filteredOrdersList.map((o) => (
                <div key={o.id} className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-orange-500 text-black text-[10px] px-3 py-1 rounded-full font-black">BILL: #{formatBillNumber(o.billNumber || 0)}</span>
                      <span className="bg-yellow-400 text-black text-[10px] px-3 py-1 rounded-full font-black">TOKEN: #{o.tokenNumber || "N/A"}</span>
                    </div>
                    <span className="text-orange-500 font-black text-xl">₹{o.total}</span>
                  </div>
                  
                  <div className="space-y-2 mb-6 border-b border-white/5 pb-4">
                    {o.items?.map((item: any, idx: number) => (
                      <p key={idx} className="text-sm font-bold text-gray-300">
                        <span className="text-orange-500">×{item.quantity}</span> {item.name}
                      </p>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2"><Phone size={12}/> {o.customerPhone}</div>
                    <div className="flex items-center gap-2"><MapPin size={12}/> {o.address}</div>
                    <div className="flex items-center gap-2 col-span-2"><Calendar size={12}/> {o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name: {o.customerName || 'N/A'}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 📄 Print Bill PDF */}
                      <button 
                        onClick={() => handlePrintReceipt(o)}
                        className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-black rounded-xl text-[10px] font-black uppercase transition-all active:scale-95"
                      >
                        📄 Bill PDF
                      </button>
                      {/* (07: No-Cost WhatsApp Bill) */}
                      <button 
                        onClick={() => handleSendWhatsAppBill(o)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase transition-all active:scale-95"
                      >
                        📲 Send Bill
                      </button>
                      <select value={o.status || 'pending'} onChange={(e) => handleStatusChange(o, e.target.value)} className="bg-black/60 border border-white/10 text-xs font-bold rounded-xl p-2 px-3 text-white outline-none focus:border-orange-500 cursor-pointer">
                        <option value="pending">⏳ Pending (Confirming)</option>
                        <option value="preparing">👨‍🍳 Preparing in Kitchen</option>
                        <option value="out_for_delivery">🛵 Out for Delivery</option>
                        <option value="delivered">✅ Delivered / Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- TAB 3: DISHES MENU LIST TAB --- */}
        {tab === 'menu' && (
          <div className="space-y-4">
            
            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-2">
              <button onClick={handleBulkImport} type="button" className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl">📥 IMPORT ALL 80+ PDF MENU ITEMS</button>
              <button onClick={() => { setShowAddForm(!showAddForm); setEditingProduct(null); }} className="w-full bg-orange-500/10 text-orange-500 border border-orange-500/20 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-500/20 transition-all">
                <Plus size={18}/> {showAddForm ? "CLOSE FORM" : "ADD NEW ITEM"}
              </button>
            </div>

            {/* STICKY GLASS SEARCH BAR */}
            <div className="sticky top-[73px] z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5 rounded-b-3xl shadow-lg">
              <div className="relative group max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search item name or category..." 
                  value={menuSearchQuery} 
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full bg-white text-black py-3 px-11 rounded-xl outline-none focus:ring-4 focus:ring-orange-500/20 text-xs font-semibold transition-all"
                />
              </div>
            </div>

            {/* ADD PRODUCT FORM */}
            {showAddForm && (
              <form onSubmit={handleAddProduct} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                <h3 className="text-lg font-black text-orange-500 italic uppercase">Add Product Form</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
                  <input type="text" placeholder="e.g., Cheese Corn Pizza" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required>
                    {categoryOptions.filter(c => c !== "All").map(cat => (
                      <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
                  <input type="url" placeholder="Paste image url link..." value={newImage} onChange={(e) => setNewImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Portion Option Type</label>
                  <select value={variantType} onChange={(e: any) => setVariantType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white">
                    <option value="none" className="bg-[#111]">None (Single Price)</option>
                    <option value="half_full" className="bg-[#111]">Half / Full</option>
                    <option value="plain_butter" className="bg-[#111]">Plain / Butter</option>
                    <option value="pizza_sizes" className="bg-[#111]">Pizza Sizes (Small, Medium, Large, Extra Large)</option>
                  </select>
                </div>

                {variantType === 'none' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Price (₹)</label>
                    <input type="number" placeholder="Item Price (e.g., 150)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" />
                  </div>
                )}

                {(variantType === 'half_full' || variantType === 'plain_butter') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Half / Plain Price (₹)</label>
                      <input type="number" placeholder="Price" value={halfPrice} onChange={(e) => setHalfPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label>
                      <input type="number" placeholder="Price" value={fullPrice} onChange={(e) => setFullPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" />
                    </div>
                  </div>
                )}

                {variantType === 'pizza_sizes' && (
                  <div className="space-y-3 bg-[#111]/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-wide">Enter available prices (Leave blank if unavailable):</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small Price (₹)</label><input type="number" placeholder="Optional" value={priceSmall} onChange={(e) => setPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium Price (₹)</label><input type="number" placeholder="Optional" value={priceMedium} onChange={(e) => setPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Large Price (₹)</label><input type="number" placeholder="Optional" value={priceLarge} onChange={(e) => setPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">XL Price (₹)</label><input type="number" placeholder="Optional" value={priceXL} onChange={(e) => setPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase">Save Product</button>
              </form>
            )}

            {/* EDIT PRODUCT MODAL POP-UP */}
            {editingProduct && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                <form onSubmit={handleUpdateProduct} className="bg-[#111] border-2 border-orange-500/50 p-8 rounded-[2.5rem] w-full max-w-lg relative max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl space-y-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 p-2.5 bg-white/5 text-gray-400 hover:text-white rounded-full transition-all"><X size={18}/></button>
                  
                  <div className="text-center pb-2">
                    <h3 className="text-2xl font-black text-orange-500 italic uppercase">Edit Product</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Customize Cafe Dish</p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
                    <input type="text" placeholder="e.g., Paneer Pizza" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required>
                      {categoryOptions.filter(c => c !== "All").map(cat => (
                        <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
                    <input type="url" placeholder="Paste image url..." value={editImage} onChange={(e) => setEditImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Portion Option Type</label>
                    <select value={editVariantType} onChange={(e: any) => setEditVariantType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white">
                      <option value="none" className="bg-[#111]">None (Single Price)</option>
                      <option value="half_full" className="bg-[#111]">Half / Full</option>
                      <option value="plain_butter" className="bg-[#111]">Plain / Butter</option>
                      <option value="pizza_sizes" className="bg-[#111]">Pizza Sizes (Small, Medium, Large, Extra Large)</option>
                    </select>
                  </div>

                  {editVariantType === 'none' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Price (₹)</label>
                      <input type="number" placeholder="Item Price" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" />
                    </div>
                  )}

                  {(editVariantType === 'half_full' || editVariantType === 'plain_butter') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Half / Plain Price (₹)</label><input type="number" placeholder="Price" value={editHalfPrice} onChange={(e) => setEditHalfPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label><input type="number" placeholder="Price" value={editFullPrice} onChange={(e) => setEditFullPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    </div>
                  )}

                  {editVariantType === 'pizza_sizes' && (
                    <div className="space-y-3 bg-[#111]/40 p-4 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-wide">Edit available prices (Leave blank if unavailable):</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small Price (₹)</label><input type="number" placeholder="Optional" value={editPriceSmall} onChange={(e) => setEditPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium Price (₹)</label><input type="number" placeholder="Optional" value={editPriceMedium} onChange={(e) => setEditPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Large Price (₹)</label><input type="number" placeholder="Optional" value={editPriceLarge} onChange={(e) => setEditPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">XL Price (₹)</label><input type="number" placeholder="Optional" value={editPriceXL} onChange={(e) => setEditPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase">Update Item</button>
                    <button type="button" onClick={() => setEditingProduct(null)} className="bg-white/5 text-gray-400 p-4 rounded-xl font-black text-sm active:scale-95 transition-all">CANCEL</button>
                  </div>
                </form>
              </div>
            )}

            {/* Menu Items List */}
            <div className="space-y-3 pt-2">
              {searchedMenu.length === 0 ? (
                <p className="text-center text-xs font-black uppercase text-gray-500 py-10">No matching dishes found...</p>
              ) : (
                searchedMenu.map((item) => {
                  const getAdminDisplayPrice = (itm: any) => {
                    if (itm?.variants && typeof itm.variants === 'object') {
                      const keys = Object.keys(itm.variants);
                      const labels = [];
                      if (itm.variants.Small !== undefined) labels.push(`S: ₹${itm.variants.Small}`);
                      if (itm.variants.Medium !== undefined) labels.push(`M: ₹${itm.variants.Medium}`);
                      if (itm.variants.Large !== undefined) labels.push(`L: ₹${itm.variants.Large}`);
                      if (itm.variants["Extra Large"] !== undefined) labels.push(`XL: ₹${itm.variants["Extra Large"]}`);
                      
                      if (labels.length > 0) return labels.join(' | ');

                      if (keys.includes('Plain')) {
                        return `Plain: ₹${itm.variants.Plain} | Butter: ₹${itm.variants.Butter}`;
                      } else {
                        return `Half: ₹${itm.variants.half} | Full: ₹${itm.variants.full}`;
                      }
                    }
                    return `₹${itm.price || 0}`;
                  };

                  return (
                    <div key={item.id} className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 flex items-center gap-4 hover:bg-white/[0.04] transition-all">
                      <img src={item.image} className="w-16 h-16 rounded-2xl object-cover opacity-80" alt={item.name} />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-orange-500 font-black text-xs italic capitalize">{item.category}</p>
                        <p className="text-orange-500 font-black text-sm mt-1">{getAdminDisplayPrice(item)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* SOP / Recipe Button (65: SOP Recipe Guide) */}
                        <button 
                          onClick={() => { setSopProduct(item); setSopRecipeText(item.recipe || ""); }} 
                          className="p-3 bg-purple-500/10 text-purple-500 rounded-xl hover:bg-purple-500/20 active:scale-90 transition-all flex items-center justify-center gap-1.5"
                        >
                          <BookOpen size={16}/> <span className="text-[10px] font-black">SOP</span>
                        </button>

                        <button onClick={() => startEditing(item)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 active:scale-90 transition-all"><Edit size={18}/></button>
                        
                        {/* --- Item Hide/Unhide Toggle --- */}
                        <button onClick={() => toggleItemVisibility(item.id, item.isVisible !== false)} className={`p-3 rounded-xl transition-all ${item.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {item.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                        </button>
                        <button onClick={() => handleDeleteProduct(item.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-90 transition-all"><Trash size={18}/></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: CATEGORY MANAGER TAB --- */}
        {tab === 'categories' && (
          <div className="space-y-6">
            
            {/* ADD CATEGORY FORM */}
            {!editingCategory && (
              <form onSubmit={handleAddCategory} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Folder size={18}/> Add Category</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Category Name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
                  <input type="url" placeholder="Image URL link" value={newCatImage} onChange={(e) => setNewCatImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
                </div>
                <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase active:scale-95 transition-all">Add Category</button>
              </form>
            )}

            {/* STICKY GLASS SEARCH BAR FOR CATEGORIES */}
            <div className="sticky top-[73px] z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5 rounded-b-3xl shadow-lg">
              <div className="relative group max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  value={categorySearchQuery} 
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full bg-white text-black py-3 px-11 rounded-xl outline-none focus:ring-4 focus:ring-orange-500/20 text-xs font-semibold transition-all"
                />
              </div>
            </div>

            {/* EDIT CATEGORY MODAL POP-UP */}
            {editingCategory && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                <form onSubmit={handleUpdateCategory} className="bg-[#111] border-2 border-orange-500 p-8 rounded-[2.5rem] w-full max-w-lg relative max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl space-y-4">
                  <button type="button" onClick={() => setEditingCategory(null)} className="absolute top-4 right-4 p-2.5 bg-white/5 text-gray-400 hover:text-white rounded-full transition-all"><X size={18}/></button>

                  <div className="text-center pb-2">
                    <h3 className="text-2xl font-black text-orange-500 italic uppercase flex items-center justify-center gap-2"><Folder size={22}/> Edit Category</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Modify Category Attributes</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Category Name</label>
                      <input type="text" placeholder="Category Name" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Image URL Link</label>
                      <input type="url" placeholder="Image URL link" value={editCatImage} onChange={(e) => setEditCatImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase transition-all hover:bg-green-700">Update Category</button>
                    <button type="button" onClick={() => setEditingCategory(null)} className="bg-white/5 text-gray-400 p-4 rounded-xl font-black text-sm uppercase">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Dynamic Combined Category List */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Category List ({searchedCategories.length})</p>
              {searchedCategories.length === 0 ? (
                <p className="text-center text-xs font-black uppercase text-gray-500 py-10">No categories found...</p>
              ) : (
                searchedCategories.map(c => (
                  <div key={c.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-4">
                      <img src={c.image} className="w-12 h-12 rounded-full object-cover border border-white/10" alt="Category"/>
                      <div className="flex flex-col">
                        <h4 className="font-black text-sm text-gray-200">{c.name}</h4>
                        {c.isVirtual && <span className="text-[8px] text-orange-500 font-bold uppercase tracking-wider">Default Back-up</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditingCategory(c)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 active:scale-95 transition-all">
                        <Edit size={18}/>
                      </button>
                      <button onClick={() => toggleCategoryVisibility(c)} className={`p-3 rounded-xl transition-all ${c.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {c.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                      </button>
                      <button onClick={() => handleDeleteCategory(c)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all">
                        <Trash size={16}/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 5: DEDICATED CUSTOMERS TAB (COMBINED & DEDUPED) --- */}
        {tab === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><User size={20}/> Customer Management</h3>
              {/* WhatsApp Broadcast Marketing Button (39: WhatsApp Broadcast) */}
              <button 
                onClick={() => setShowBroadcastModal(true)} 
                className="bg-green-600 hover:bg-green-700 text-white font-black text-[10px] px-4 py-2.5 rounded-full flex items-center gap-1.5 uppercase transition-all shadow-md"
              >
                <Share2 size={13}/> Broadcast Blast
              </button>
            </div>

            {/* STICKY SEARCH BAR (SEARCH CUSTOMER BY NAME OR PHONE) */}
            <div className="sticky top-[73px] z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5 rounded-b-3xl shadow-lg">
              <div className="relative group max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search customer by name or mobile number..." 
                  value={customerSearchQuery} 
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-white text-black py-3 px-11 rounded-xl outline-none focus:ring-4 focus:ring-orange-500/20 text-xs font-semibold transition-all"
                />
              </div>
            </div>
            
            {/* EDIT CUSTOMER MODAL / BOX */}
            {editingCustomer && (
              <form onSubmit={handleUpdateCustomer} className="bg-[#151515] border-2 border-orange-500 p-6 rounded-[2.5rem] space-y-4">
                <h4 className="text-sm font-black text-orange-500 uppercase">Edit Customer Profile</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name</label>
                    <input type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Adjust Points</label>
                    <input type="number" value={editCustomerPoints} onChange={(e) => setEditCustomerPoints(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white p-3 rounded-xl font-black text-xs uppercase">Save Changes</button>
                  <button type="button" onClick={() => setEditingCustomer(null)} className="bg-white/5 text-gray-400 p-3 rounded-xl font-black text-xs uppercase">Cancel</button>
                </div>
              </form>
            )}

            {/* Customers Profile Directory with VIP Tracker (55: VIP Customer Tracker) */}
            <div className="space-y-4">
              {searchedCustomers.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-500 py-10 uppercase">No matching customers found...</p>
              ) : (
                // Sort by total spend (High LTV is shown first)
                searchedCustomers
                  .map(user => ({ ...user, metrics: getCustomerLoyaltyMetrics(user.phone) }))
                  .sort((a, b) => b.metrics.totalSpend - a.metrics.totalSpend)
                  .map(user => {
                    return (
                      <div key={user.id} className="bg-[#111] border border-white/5 p-5 rounded-3xl flex justify-between items-center hover:border-white/10 transition-all">
                        <div className="space-y-1 cursor-pointer flex-1" onClick={() => setSelectedCustomerHistory(user)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-white hover:text-orange-500 transition-colors">{user.name} ➡️</h4>
                            <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded-full border ${user.metrics.tierColor}`}>
                              {user.metrics.tier}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-orange-500">+{user.phone}</p>
                          
                          <div className="flex gap-3 text-[10px] text-gray-400 font-bold pt-1.5 border-t border-white/5 mt-2">
                            <p>Orders: <span className="text-white font-black">{user.metrics.orderCount}</span></p>
                            <p>Total Spend: <span className="text-green-400 font-black">₹{user.metrics.totalSpend}</span></p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-4 flex-shrink-0">
                          <div>
                            <p className="text-[9px] font-bold text-gray-500 uppercase">Available Points</p>
                            <h4 className="text-lg font-black text-yellow-400">{user.points || 0} Pts</h4>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingCustomer(user);
                              setEditCustomerName(user.name);
                              setEditCustomerPoints(user.points || 0);
                            }}
                            className="p-3 bg-orange-500/10 text-orange-500 rounded-xl hover:bg-orange-500 hover:text-black transition-all"
                          >
                            <Edit size={16}/>
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* --- TAB 6: DYNAMIC LOYALTY RULES MANAGER --- */}
        {tab === 'loyalty' && (
          <div className="space-y-6">
            <form onSubmit={handleAddRule} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Gift size={18}/> Setup Loyalty Rules</h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Create rewards that customers can redeem automatically on checkout when their points hit the requirement:</p>
              
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Reward Name (e.g., Free Mocktail)" value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
                <input type="number" placeholder="Points Needed (e.g., 30)" value={newRulePoints} onChange={(e) => setNewRulePoints(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Add Reward Rule</button>
            </form>

            {/* Current Active Rules */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Active Customer Reward Rules ({loyaltyRules.length})</p>
              {loyaltyRules.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-500 py-6 uppercase">No custom rules configured yet...</p>
              ) : (
                loyaltyRules.map(rule => (
                  <div key={rule.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl flex justify-between items-center hover:bg-white/[0.04] transition-all">
                    <div>
                      <h4 className="font-black text-sm text-gray-200">{rule.rewardName}</h4>
                      <p className="text-xs text-yellow-400 font-extrabold mt-0.5">Cost: {rule.pointsCost} Points</p>
                    </div>
                    <button onClick={() => handleDeleteRule(rule.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all">
                      <Trash size={16}/>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* --- CUSTOMER TO CUSTOMER POINT TRANSFERS LOGS AUDIT --- */}
            <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">🔄 Points Transfer Logs ({transferLogs.length})</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Tracks customer-to-customer point gifts</p>
              
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {transferLogs.length === 0 ? (
                  <p className="text-center text-xs font-bold text-gray-600 py-6 uppercase">No point transfers logged...</p>
                ) : (
                  transferLogs.map(log => (
                    <div key={log.id} className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-gray-300">
                          <span className="text-orange-400">{log.senderName || "Sender"}</span> (+{log.senderPhone})
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          ➡️ Gifted to: <span className="text-yellow-500 font-extrabold">+{log.recipientPhone}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="bg-orange-500/10 text-orange-500 font-black px-2.5 py-1 rounded-md text-[10px] inline-block">
                          {log.points} Pts 🎁
                        </span>
                        <p className="text-[8px] text-gray-600 mt-1">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Just now"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 7: BANNERS TAB --- */}
        {tab === 'banners' && (
          <div className="space-y-6">
            <form onSubmit={handleAddBanner} className="bg-[#020202] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><ImageIcon size={18}/> Add Banner</h3>
              <input type="url" placeholder="Paste image url here..." value={newBannerUrl} onChange={(e) => setNewBannerUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-bold text-white" required />
              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Add Banner Image</button>
            </form>

            <div className="grid grid-cols-2 gap-4">
              {banners.map(b => (
                <div key={b.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative group">
                  <img src={b.url} className="w-full h-24 object-cover rounded-xl opacity-80" alt="Banner" />
                  <button onClick={() => handleDeleteBanner(b.id)} className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 active:text-black transition-all">
                    <Trash size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 8: MANAGE COUPONS TAB --- */}
        {tab === 'coupons' && (
          <div className="space-y-6">
            <form onSubmit={handleAddCoupon} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Percent size={18}/> Add Coupon Code</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="CODE (e.g. WELCOME)" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black uppercase text-white" required />
                <input type="number" placeholder="Discount (₹)" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-black text-white" required />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Create Coupon</button>
            </form>

            <div className="space-y-3">
              {coupons.map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest">{c.code}</h4>
                    <p className="text-xs font-bold text-gray-400 mt-1">Value: Flat ₹{c.discountValue} OFF</p>
                  </div>
                  <button onClick={() => handleDeleteCoupon(c.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all">
                    <Trash size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 9: APPROVE REVIEWS TAB --- */}
        {tab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 && <p className="text-center text-gray-600 py-16 font-bold uppercase tracking-widest">No feedback reviews yet...</p>}
            {reviews.map(r => (
              <div key={r.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-sm text-gray-200">{r.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-white/5 text-yellow-500 font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                      {r.rating || "N/A"} <span className="text-[10px]">★</span>
                    </span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${r.isApproved ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                      {r.isApproved ? 'Live' : 'Pending Approval'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 font-medium leading-relaxed italic">"{r.comment}"</p>
                
                <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                  {!r.isApproved && (
                    <button onClick={() => handleApproveReview(r.id)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase transition-all">Approve Review</button>
                  )}
                  <button onClick={() => handleDeleteReview(r.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-black transition-all">
                    <Trash size={16}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 10: STRUCTURED KITCHEN RECIPE ROSTER --- */}
        {tab === 'roster' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2">📋 Kitchen SOP Recipe Roster</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black leading-relaxed">डिश बनाने के चरण (Steps) और सामग्री का अनुपात फीड करें, और रसोई की दीवार पर चिपकाने के लिए सीधे A4 साइज़ पोस्टर प्रिंट करें।</p>

            {/* Select product dropdown to load roster details */}
            <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase block">Select Dish / डिश चुनें</label>
              <select 
                value={rosterSelectedProduct ? rosterSelectedProduct.id : ""}
                onChange={(e) => {
                  const selected = menu.find(item => item.id === e.target.value);
                  setRosterSelectedProduct(selected || null);
                }}
                className="w-full bg-black/60 border border-white/10 text-sm font-bold rounded-xl p-3 text-white outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="">-- Choose a Dish to see Roster --</option>
                {menu.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>

            {rosterSelectedProduct && (
              <div className="space-y-6">
                {/* Print button & Recipe Preview */}
                <div className="bg-[#111] border border-white/5 p-5 rounded-3xl flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-sm text-white uppercase">{rosterSelectedProduct.name} - SOP</h4>
                    <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">Steps Added: {rosterSelectedProduct.ingredients?.length || 0}</p>
                  </div>
                  <button 
                    onClick={() => handlePrintRosterSOP(rosterSelectedProduct)}
                    className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-black rounded-2xl text-xs font-black uppercase transition-all shadow-md"
                  >
                    🖨️ Print Recipe Poster
                  </button>
                </div>

                {/* Add Steps form */}
                <form onSubmit={handleAddRosterStep} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                  <h4 className="text-xs font-black text-orange-500 uppercase tracking-wider">Add SOP Step / नया चरण जोड़ें</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Ingredient / Action (क्या डालें)</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Pizza Base / Cheese" 
                        value={rosterStepName}
                        onChange={(e) => setRosterStepName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-bold text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Quantity / मात्रा</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1 Piece / 30 grams" 
                        value={rosterStepQty}
                        onChange={(e) => setRosterStepQty(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-bold text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Special Cooking Instruction (विशेष निर्देश)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ओवन में डालने से पहले अच्छे से सेकें (Optional)" 
                      value={rosterStepNote}
                      onChange={(e) => setRosterStepNote(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-bold text-white"
                    />
                  </div>

                  <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase transition-all">Add Step to Recipe</button>
                </form>

                {/* Steps List view */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Active Recipe Steps</p>
                  {(rosterSelectedProduct.ingredients || []).length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-600 py-6 uppercase">No steps defined for this recipe. Add some above!</p>
                  ) : (
                    rosterSelectedProduct.ingredients.map((item: any, idx: number) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs font-bold">
                        <div className="flex items-center gap-3">
                          <span className="bg-orange-500/10 text-orange-500 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                            {item.step}
                          </span>
                          <div>
                            <p className="text-gray-300 uppercase">{item.name}</p>
                            <p className="text-[10px] text-orange-400 mt-0.5">Quantity: {item.quantity}</p>
                            {item.note && <p className="text-[9px] text-gray-500 font-medium italic mt-0.5">Note: {item.note}</p>}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteRosterStep(idx)}
                          className="p-2.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 active:scale-95 transition-all"
                        >
                          <Trash size={14}/>
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* --- TAB 11: SECURITY PIN CONFIG TAB (Only Admin can change) --- */}
        {tab === 'passwords' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><Lock size={20}/> PIN Security Configuration</h3>
            
            <form onSubmit={handleUpdatePasscodes} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-5">
              <div>
                <h4 className="text-sm font-black text-orange-500 uppercase">Change security PINs</h4>
                <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 leading-relaxed">केवल एडमिनिस्ट्रेटर ही दोनों रोल (Admin व Manager) के लॉगिन क्रेडेंशियल्स को बदल सकता है।</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Admin LOGIN PIN</label>
                  <input 
                    type="password" 
                    value={newAdminPinInput}
                    onChange={(e) => setNewAdminPinInput(e.target.value)}
                    disabled={userRole !== 'admin'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Manager LOGIN PIN</label>
                  <input 
                    type="password" 
                    value={newManagerPinInput}
                    onChange={(e) => setNewManagerPinInput(e.target.value)}
                    disabled={userRole !== 'admin'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
                    required
                  />
                </div>
              </div>

              {userRole !== 'admin' && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                  <p className="text-[10px] text-red-500 font-black uppercase tracking-wider text-center">⚠️ READ-ONLY: You are logged in as Cafe Manager. Only Admin role can edit PIN codes.</p>
                </div>
              )}

              {userRole === 'admin' && (
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white p-4 rounded-xl font-black text-xs uppercase transition-all shadow-md">
                  Update Passcodes
                </button>
              )}
            </form>
          </div>
        )}

      </main>

      {/* --- 10: CUSTOMER ORDER HISTORY MODAL --- */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] w-full max-w-lg relative max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl space-y-4">
            <button 
              onClick={() => setSelectedCustomerHistory(null)} 
              className="absolute top-4 right-4 p-2 bg-white/5 text-gray-400 hover:text-white rounded-full transition-all"
            >
              <X size={18}/>
            </button>
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-lg font-black text-orange-500 uppercase">{selectedCustomerHistory.name} - Order History</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Mobile: +{selectedCustomerHistory.phone}</p>
            </div>

            <div className="space-y-3">
              {selectedCustomerHistory.metrics?.customerOrders.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-600 py-8">No historical transactions logged.</p>
              ) : (
                selectedCustomerHistory.metrics?.customerOrders.map((o: any) => (
                  <div key={o.id} className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <div className="flex gap-2">
                        <span className="text-[9px] font-black uppercase text-gray-500">Bill: #{formatBillNumber(o.billNumber || 0)}</span>
                        <span className="text-[9px] font-black uppercase text-yellow-500">Token: #{o.tokenNumber || "N/A"}</span>
                      </div>
                      <div className="space-y-0.5 mt-1.5">
                        {o.items?.map((item: any, idx: number) => (
                          <p key={idx} className="text-xs text-gray-400 font-medium">
                            <span className="text-orange-500">×{item.quantity}</span> {item.name}
                          </p>
                        ))}
                      </div>
                      <span className="text-[8px] text-gray-600 block mt-2">
                        {o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-black text-sm">₹{o.total}</p>
                      <span className="text-[8px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded uppercase font-bold mt-1 inline-block">
                        {o.status || "Completed"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- 65: DIGITAL RECIPE GUIDE (SOP MODAL) --- */}
      {sopProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSaveSopRecipe} className="bg-[#111] border-2 border-orange-500/50 p-6 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl space-y-4">
            <button 
              type="button" 
              onClick={() => setSopProduct(null)} 
              className="absolute top-4 right-4 p-2 bg-white/5 text-gray-400 hover:text-white rounded-full transition-all"
            >
              <X size={18}/>
            </button>
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-lg font-black text-orange-500 uppercase italic">Digital Cooking SOP Guide</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Dish: {sopProduct.name}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Step-by-Step Cooking Instructions</label>
              <textarea 
                value={sopRecipeText} 
                onChange={(e) => setSopRecipeText(e.target.value)} 
                placeholder="Write down the detailed step-by-step recipe, quantity of ingredients, spices to add, and cooking times for the kitchen staff..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-xs font-bold text-white h-44 resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Save SOP Guide</button>
              <button type="button" onClick={() => setSopProduct(null)} className="bg-white/5 text-gray-400 p-3.5 rounded-xl font-black text-xs uppercase">Close</button>
            </div>
          </form>
        </div>
      )}

      {/* --- 39: WHATSAPP BROADCAST MODAL --- */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl space-y-4">
            <button 
              onClick={() => setShowBroadcastModal(false)} 
              className="absolute top-4 right-4 p-2 bg-white/5 text-gray-400 hover:text-white rounded-full transition-all"
            >
              <X size={18}/>
            </button>
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-lg font-black text-orange-500 uppercase">WhatsApp Marketing Blast</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Bum Bum Cafe Promotions</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Write Promotional Message</label>
              <textarea 
                value={broadcastMessage} 
                onChange={(e) => setBroadcastMessage(e.target.value)} 
                placeholder="Type your special discount offer or festive wishes here..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-xs font-bold text-white h-32 resize-none leading-relaxed"
              />
            </div>

            <div className="border-t border-white/5 pt-4">
              <p className="text-[10px] text-orange-400 font-extrabold uppercase mb-2">Send to Customers ({searchedCustomers.length})</p>
              <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                {searchedCustomers.map((user) => (
                  <div key={user.phone} className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-2 rounded-xl text-xs font-bold">
                    <span className="text-gray-300">{user.name} (+{user.phone})</span>
                    <button 
                      onClick={() => triggerWhatsAppBroadcast(user.phone)}
                      className="bg-green-600 hover:bg-green-700 text-white font-black text-[9px] px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase transition-all"
                    >
                      <MessageSquare size={10}/> Send Msg
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button type="button" onClick={() => setShowBroadcastModal(false)} className="w-full bg-white/5 text-gray-400 p-3.5 rounded-xl font-black text-xs uppercase">Close</button>
          </div>
        </div>
      )}

    </div>
  );
}
