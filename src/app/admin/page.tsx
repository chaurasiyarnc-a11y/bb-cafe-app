

'use client';
  
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../lib/firebase'; 
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, addDoc, deleteDoc, increment, runTransaction } from 'firebase/firestore';
import { Power, Eye, EyeOff, User, MapPin, Calendar, CheckCircle2, LogOut, Loader2, Phone, Plus, Trash, Edit, X, Lock, BarChart3, Download, Folder, Percent, ImageIcon, Gift, Settings, Search, BookOpen, Share2, MessageSquare, Filter, RefreshCw, Check, CheckCircle, XCircle, Play, Shield, Users } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const ADD_CATEGORIES = ["Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

const SOCIAL_LINKS = [
  { id: 'whatsapp_msg', label: '🟢 WhatsApp Msg', icon: '💬', points: 1, url: 'https://wa.me/919714293759' },
  { id: 'whatsapp_channel', label: '📢 WhatsApp Channel', icon: '📢', points: 1, url: 'https://whatsapp.com/channel/0029VaLhggoGE56natoQI43y' },
  { id: 'youtube', label: '🔴 YouTube', icon: '🎥', points: 1, url: 'https://www.youtube.com/@bbcafe.i' },
  { id: 'instagram', label: '📸 Instagram', icon: '📸', points: 1, url: 'https://www.instagram.com/bbcafe.in/' },
  { id: 'facebook', label: '🔵 Facebook', icon: '📘', points: 1, url: 'https://www.facebook.com/bbcafe.in/' },
  { id: 'snapchat', label: '👻 Snapchat', icon: '👻', points: 1, url: 'https://www.snapchat.com/add/bbcafe.in' }
];

// Helper to determine if a URL points to a video
const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase().split('?')[0];
  return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.includes('/video') || cleanUrl.includes('video');
};

const formatBillNumber = (num: number) => {
  return String(num).padStart(4, '0');
};

const handleStatusChange = async (order: any, newStatus: string) => {
  try {
    await updateDoc(doc(db, "orders", order.id), { status: newStatus });
    toast.success("Status Sync Success!");

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
          @media print { .no-print { display: none; } }
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
          @media print { .no-print { display: none; } }
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
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'menu' | 'categories' | 'customers' | 'loyalty' | 'banners' | 'reels' | 'header_video' | 'reviews' | 'coupons' | 'roster' | 'proofs' | 'claims' | 'security'>('dashboard');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [storeOpen, setStoreOpen] = useState(true);

  // SEARCH SEARCH
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  // EXTENDED STATES FOR NEW TABS
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatImage, setNewCatImage] = useState("");
  
  // Category Editing State
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatImage, setEditCatImage] = useState("");

  // Banners & Reels Management
  const [banners, setBanners] = useState<any[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newBannerTitle, setNewBannerTitle] = useState("");

  const [reels, setReels] = useState<any[]>([]);
  const [newReelUrl, setNewReelUrl] = useState("");
  const [newReelCoverUrl, setNewReelCoverUrl] = useState("");
  const [newReelTitle, setNewReelTitle] = useState("");
  const [newReelDesc, setNewReelDesc] = useState("");
  const [newReelPrice, setNewReelPrice] = useState("");

  // Table QR Generator state
  const [genTableNum, setGenTableNum] = useState("1");

  // Header Background Video State
  const [headerVideoInput, setHeaderVideoInput] = useState("");

  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponValue, setNewCouponValue] = useState("");

  // Dynamic Social Proofs
  const [socialProofs, setSocialProofs] = useState<any[]>([]);
  const [newProofText, setNewProofText] = useState("");

  // Social point claims
  const [pointsClaims, setPointsClaims] = useState<any[]>([]);

  // CUSTOMER LOYAL CLUB STATE
  const [loyaltyUsers, setLoyaltyUsers] = useState<any[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerPoints, setEditCustomerPoints] = useState(0);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<any>(null);

  // DYNAMIC LOYALTY RULES STATE
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRulePoints, setNewRulePoints] = useState("");

  // CUSTOMER POINT TRANSFERS AUDIT STATE
  const [transferLogs, setTransferLogs] = useState<any[]>([]);

  
// STAFF MANAGEMENT STATES
  const [staff, setStaff] = useState<any[]>([]);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("delivery");
  const [newStaffPin, setNewStaffPin] = useState("");
  
  // Staff Editing States
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState("");
  const [editingStaffRole, setEditingStaffRole] = useState("delivery");
  const [editingStaffPin, setEditingStaffPin] = useState("");
  const [revealPinId, setRevealPinId] = useState<string | null>(null);
  
  // DYNAMIC PASSCODES FROM FIRESTORE
  const [passcodes, setPasscodes] = useState({ adminPin: "971429", managerPin: "123456" });
  const [userRole, setUserRole] = useState<'admin' | 'manager' | null>(null);
  const [newAdminPinInput, setNewAdminPinInput] = useState("");
  const [newManagerPinInput, setNewManagerPinInput] = useState("");

  // START & END DATE FILTERS
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); 
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); 
  const [ordersFilterDate, setOrdersFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // ADD PRODUCT STATES
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

  // EDIT PRODUCT STATES
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

  // SOP RECIPE STATES
  const [sopProduct, setSopProduct] = useState<any>(null);
  const [sopRecipeText, setSopRecipeText] = useState("");

  // BROADCAST MODAL STATES
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("Special Offer from Bum Bum Cafe! Get 10% OFF on all Special Pizzas today! 🍕🔥");
  const [broadcastTierFilter, setBroadcastTierFilter] = useState<string>('all');
  const [broadcastMinPoints, setBroadcastMinPoints] = useState<number>(0);
  const [broadcastMinSpend, setBroadcastMinSpend] = useState<number>(0);
  const [sentBroadcastPhones, setSentBroadcastPhones] = useState<string[]>([]);

  // KITCHEN ROSTER RECIPE STATES
  const [rosterSelectedProduct, setRosterSelectedProduct] = useState<any>(null);
  const [rosterStepName, setRosterStepName] = useState("");
  const [rosterStepQty, setRosterStepQty] = useState("");
  const [rosterStepNote, setRosterStepNote] = useState("");

  // Play custom MP3 sound warning for Admin/Counter when new order arrives
  const playNewOrderBeep = () => {
    try {
      const audio = new Audio('/admin.mp3');
      audio.play().catch((err) => console.log("Sound play blocked by browser:", err));
    } catch (e) {}
  };

  const prevOrdersCountRef = useRef<number | null>(null);

  useEffect(() => {
    const adminSession = sessionStorage.getItem('bb_cafe_admin_verified');
    const adminRole = sessionStorage.getItem('bb_cafe_admin_role') as 'admin' | 'manager' | null;
    if (adminSession === 'true' && adminRole) {
      setIsVerified(true);
      setUserRole(adminRole);
    }
    setLoading(false);
  }, []);

  // Passcodes Loader
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

  // Real-time Data Listeners
  useEffect(() => {
    if (!isVerified) return;

    const qOrders = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const currentOrdersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // PLAY ALERT IF NEW ORDER ARRIVES (Requirement 2 / sound warning beep)
      if (prevOrdersCountRef.current !== null && currentOrdersList.length > prevOrdersCountRef.current) {
        playNewOrderBeep();
        toast.success("🚨 ALERT: Naya Online Order Received!");
      }
      prevOrdersCountRef.current = currentOrdersList.length;
      setOrders(currentOrdersList);
    });

    const qProducts = query(collection(db, "products"));
    const unsubProducts = onSnapshot(qProducts, (snap) => {
      setMenu(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Dynamic WhatsApp Number & Background Video Listener
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) {
        setStoreOpen(d.data().isOpen);
        if (d.data().headerVideoUrl) {
          setHeaderVideoInput(d.data().headerVideoUrl);
        }
      }
    });

    // Separate collections fetch
    const unsubBanners = onSnapshot(collection(db, "banners"), (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReels = onSnapshot(collection(db, "reels"), (snap) => {
      setReels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCoupons = onSnapshot(collection(db, "coupons"), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReviews = onSnapshot(collection(db, "reviews"), (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubLoyalty = onSnapshot(collection(db, "customer_points"), (snap) => {
      setLoyaltyUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubRules = onSnapshot(collection(db, "loyalty_rules"), (snap) => {
      setLoyaltyRules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Real-time Social Proofs Loader
    const unsubProofs = onSnapshot(collection(db, "social_proofs"), (snap) => {
      setSocialProofs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Real-time Social Point Claims Loader
    const unsubClaims = onSnapshot(collection(db, "points_claims"), (snap) => {
      setPointsClaims(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTransfers = onSnapshot(collection(db, "point_transfers"), (snap) => {
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a: any, b: any) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tB - tA;
      });
      setTransferLogs(logs);
    });

    // Staff Accounts Real-time Listener (Real-time Staff list sync)
    const unsubStaff = onSnapshot(collection(db, "staff_members"), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCats();
      unsubStore();
      unsubBanners();
      unsubReels();
      unsubCoupons();
      unsubReviews();
      unsubLoyalty();
      unsubRules();
      unsubProofs();
      unsubClaims();
      unsubTransfers();
      unsubStaff();
    };
  }, [isVerified]);

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
      toast.error("Incorrect Security Key!");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bb_cafe_admin_verified');
    sessionStorage.removeItem('bb_cafe_admin_role');
    setIsVerified(false);
    setUserRole(null);
    window.location.href = "/";
  };

  const combinedCustomers = useMemo(() => {
    const customersMap = new Map();
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

  const searchedCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return combinedCustomers;
    const q = customerSearchQuery.toLowerCase().trim();
    return combinedCustomers.filter(c => 
      String(c.name).toLowerCase().includes(q) || 
      String(c.phone).includes(q)
    );
  }, [combinedCustomers, customerSearchQuery]);

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

  const filteredOrdersList = useMemo(() => {
    const targetDateStr = new Date(ordersFilterDate).toDateString();
    const matched = orders.filter(o => {
      if (!o.timestamp) return false;
      const orderDate = o.timestamp?.toDate ? o.timestamp.toDate().toDateString() : new Date(o.timestamp).toDateString();
      return orderDate === targetDateStr;
    });
    return matched.sort((a, b) => Number(b.billNumber || 0) - Number(a.billNumber || 0));
  }, [orders, ordersFilterDate]);

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

  const triggerCsvDownload = (data: any[], filename: string, headers: string[], keys: string[]) => {
    if (data.length === 0) return toast.error("No data available to export!");

    const csvRows = [];
    csvRows.push(headers.join(','));
    
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

    // Filter out rejected or fake orders from range calculations
    const validRangeOrders = rangeOrders.filter(o => o.status !== "rejected" && o.status !== "fake");

    // Count today's rejected orders
    const todayStr = new Date().toDateString();
    const todayRejectedCount = orders.filter(o => {
      if (!o.timestamp) return false;
      const oDate = o.timestamp?.toDate ? o.timestamp.toDate().toDateString() : new Date(o.timestamp).toDateString();
      return o.status === "rejected" && oDate === todayStr;
    }).length;

    const rangeRevenue = validRangeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

    let cashSales = 0;
    let upiSales = 0;
    validRangeOrders.forEach(o => {
      const amt = Number(o.total) || 0;
      if (o.paymentMethod === 'cod' || o.paymentMethod === 'Cash' || o.billNumber % 2 === 0) {
        cashSales += amt;
      } else {
        upiSales += amt;
      }
    });

    return {
      rangeRevenue,
      rangeCount: rangeOrders.length,
      rejectedCount: rangeOrders.filter(o => o.status === "rejected").length,
      todayRejectedCount,
      active: activeCount,
      cashSales,
      upiSales,
      rangeOrders
    };
  };

  const getLifetimeMetrics = () => {
    const seenPhones = new Set();
    orders.forEach(o => { if (o.customerPhone) seenPhones.add(String(o.customerPhone)); });
    
    // Filter out rejected orders from lifetime total business
    const totalBusiness = orders
      .filter(o => o.status !== "rejected" && o.status !== "fake")
      .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

    return {
      lifetimeRevenue: totalBusiness,
      lifetimeOrdersCount: orders.length,
      lifetimeCustomersCount: seenPhones.size
    };
  };

  const auditStats = getAuditRangeAnalytics();
  const lifetimeStats = getLifetimeMetrics();

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
      .slice(0, 5); 
  }, [orders]);

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

  const categoryOptions = categories.length > 0 
    ? categories.map(c => c.name)
    : ADD_CATEGORIES;

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

  // Manage Circular Food Reels/Stories & Banners Separately
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerUrl || !newBannerTitle) return toast.error("Please enter a media link and title!");
    try {
      await addDoc(collection(db, "banners"), { 
        url: newBannerUrl, 
        title: newBannerTitle,
        timestamp: new Date() 
      });
      setNewBannerUrl(""); setNewBannerTitle("");
      toast.success("New Promo Banner Added! 🖼️");
    } catch (err) { toast.error("Error adding banner"); }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await deleteDoc(doc(db, "banners", id));
      toast.success("Promo Banner Deleted!");
    } catch (err) { toast.error("Error deleting item"); }
  };

  // Manage Food Reels/Stories Collection (With Cover URL Support)
  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReelUrl || !newReelTitle || !newReelPrice) {
      return toast.error("Please enter Reel title, price, and media URL!");
    }
    try {
      await addDoc(collection(db, "reels"), {
        url: newReelUrl,
        coverUrl: newReelCoverUrl || "",
        title: newReelTitle,
        description: newReelDesc || "",
        price: Number(newReelPrice) || 0,
        timestamp: new Date()
      });
      setNewReelUrl(""); setNewReelCoverUrl(""); setNewReelTitle(""); setNewReelDesc(""); setNewReelPrice("");
      toast.success("New Food Reel / Story Added! 🎥");
    } catch (err) {
      toast.error("Error adding reel story.");
    }
  };

  const handleDeleteReel = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reels", id));
      toast.success("Food Reel / Story Deleted!");
    } catch (err) {
      toast.error("Error deleting reel story.");
    }
  };

  // Background Video Change Support
  const handleUpdateHeaderVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerVideoInput) return toast.error("Please enter a valid video link!");
    try {
      await setDoc(doc(db, "settings", "store"), { headerVideoUrl: headerVideoInput }, { merge: true });
      toast.success("Main background header video updated! 🎬");
    } catch (err) {
      toast.error("Failed to update video.");
    }
  };

  // Manage Social Proof Alerts CRUD
  const handleAddSocialProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofText.trim()) return toast.error("Please enter alert text!");
    try {
      await addDoc(collection(db, "social_proofs"), {
        text: newProofText.trim(),
        timestamp: new Date()
      });
      setNewProofText("");
      toast.success("New Order Alert Added!");
    } catch (err) { toast.error("Error adding alert"); }
  };

  const handleDeleteSocialProof = async (id: string) => {
    try {
      await deleteDoc(doc(db, "social_proofs", id));
      toast.success("Order Alert Deleted!");
    } catch (err) { toast.error("Error deleting alert"); }
  };

  // Verification Loop for Point claims
  const handleVerifyClaimApproval = async (claim: any) => {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "customer_points", claim.customerPhone);
        const claimRef = doc(db, "points_claims", claim.id);

        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          transaction.set(userRef, { name: claim.customerName, phone: claim.customerPhone, points: claim.pointsToReward, lastActive: new Date() });
        } else {
          transaction.update(userRef, { points: increment(claim.pointsToReward) });
        }

        transaction.update(claimRef, { status: "approved" });

        const histRef = doc(collection(db, "customer_points", claim.customerPhone, "history"));
        transaction.set(histRef, {
          type: "earn",
          points: claim.pointsToReward,
          description: `Followed us on ${claim.platformLabel} 📱 (Approved)`,
          timestamp: new Date()
        });
      });

      toast.success("Claim Approved! Point successfully credited.");
    } catch (err) { toast.error("Verification transaction failed."); }
  };

  const handleRejectClaim = async (id: string) => {
    try {
      await updateDoc(doc(db, "points_claims", id), { status: "rejected" });
      toast.success("Claim Request Rejected!");
    } catch (err) { toast.error("Failed to reject claim request."); }
  };

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
    } catch (error) { toast.error("Error deleting coupon"); }
  };

  const toggleStore = async () => {
    try {
      await setDoc(doc(db, "settings", "store"), { isOpen: !storeOpen });
      toast.success(storeOpen ? "Cafe is now OFFLINE" : "Cafe is now ONLINE");
    } catch (e) { toast.error("Error toggling store"); }
  };

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

  // Bulk Import
  const handleBulkImport = async () => {
    if (!window.confirm("BUM BUM CAFE PDF ke items ko database mein add karein?")) return;
    toast.loading("Importing menu items...", { id: "import" });

    const data = [
      { name: "Special Tea (स्पेशल चाय)", category: "Fast Food", price: 15, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=300&q=80" },
      { name: "Cheese Corn Pizza", category: "Special Pizza", price: 80, variants: { Small: 80, Medium: 110, Large: 140, "Extra Large": 180 }, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80" }
    ];

    try {
      let importedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const matched = menu.find(m => String(m.name).toLowerCase().trim() === item.name.toLowerCase().trim());
        if (matched) {
          await updateDoc(doc(db, "products", matched.id), {
            price: item.price,
            category: item.category,
            image: item.image,
            variants: item.variants || null
          });
          skippedCount++;
        } else {
          await addDoc(collection(db, "products"), {
            ...item,
            isVisible: true
          });
          importedCount++;
        }
      }
      toast.dismiss("import");
      toast.success(`Excel Import Success! ${importedCount} Added, ${skippedCount} Duplicates Merged.`);
    } catch (e) {
      toast.dismiss("import");
      toast.error("Error seeding PDF items");
    }
  };

  // Merge Duplicates
  const handleMergeDuplicates = async () => {
    if (!window.confirm("क्या आप वाकई सभी डुप्लीकेट आइटम्स को मर्ज करके डिलीट करना चाहते हैं?")) return;
    toast.loading("Merging duplicates...", { id: "merge" });

    try {
      const nameMap = new Map<string, any[]>();
      menu.forEach(item => {
        const cleanName = String(item.name).toLowerCase().trim();
        if (!nameMap.has(cleanName)) {
          nameMap.set(cleanName, []);
        }
        nameMap.get(cleanName)!.push(item);
      });

      let mergedCount = 0;
      const entries = Array.from(nameMap.entries());

      for (let i = 0; i < entries.length; i++) {
        const [name, items] = entries[i];
        if (items.length > 1) {
          const primaryItem = items[0];
          
          let mergedVariants = { ...(primaryItem.variants || {}) };
          items.slice(1).forEach(dup => {
            if (dup.variants) {
              mergedVariants = { ...mergedVariants, ...dup.variants };
            }
          });

          const updatePayload: any = {};
          if (Object.keys(mergedVariants).length > 0) {
            updatePayload.variants = mergedVariants;
          }

          await updateDoc(doc(db, "products", primaryItem.id), updatePayload);

          for (const dup of items.slice(1)) {
            await deleteDoc(doc(db, "products", dup.id));
          }

          mergedCount += (items.length - 1);
        }
      }

      toast.dismiss("merge");
      toast.success(`Deduplication complete! merged and removed ${mergedCount} duplicates.`);
    } catch (err) {
      toast.dismiss("merge");
      toast.error("Failed to merge duplicate items.");
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCategory || !newImage) {
      return toast.error("Please fill all required fields!");
    }

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

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editCategory || !editImage) {
      return toast.error("Please fill all fields!");
    }

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



  // Real-time Staff Members listener
  useEffect(() => {
    if (!isVerified) return;
    const unsubStaff = onSnapshot(collection(db, "staff_members"), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubStaff();
  }, [isVerified]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPin) return toast.error("Kripya saari details bharein!");
    if (newStaffPin.length !== 4 || isNaN(Number(newStaffPin))) {
      return toast.error("PIN 4-अंकों ka numerical hona chahiye!");
    }
    
    try {
      await addDoc(collection(db, "staff_members"), {
        name: newStaffName.trim(),
        role: newStaffRole,
        pin: newStaffPin,
        timestamp: new Date()
      });
      setNewStaffName("");
      setNewStaffPin("");
      toast.success("Naya staff member successfully add ho gaya! 🎉");
    } catch (err) {
      toast.error("Staff member add karne me dikkat aayi.");
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Kya aap sach me is staff member ko delete karna chahte hain?")) return;
    try {
      await deleteDoc(doc(db, "staff_members", id));
      toast.success("Staff member successfully deleted.");
    } catch (err) {
      toast.error("Delete failed.");
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId) return;
    if (!editingStaffName.trim() || !editingStaffPin) return toast.error("Saari details bharein!");
    if (editingStaffPin.length !== 4 || isNaN(Number(editingStaffPin))) {
      return toast.error("PIN 4-अंकों ka numerical hona chahiye!");
    }

    try {
      await updateDoc(doc(db, "staff_members", editingStaffId), {
        name: editingStaffName.trim(),
        role: editingStaffRole,
        pin: editingStaffPin
      });
      setEditingStaffId(null);
      toast.success("Staff member details updated!");
    } catch (err) {
      toast.error("Update failed.");
    }
  };

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
      toast.success("Access Keys updated successfully!");
    } catch (err) {
      toast.error("Failed to update keys.");
    }
  };

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
      setRosterSelectedProduct({ ...rosterSelectedProduct, ingredients: updatedIngredients });
      setRosterStepName(""); setRosterStepQty(""); setRosterStepNote("");
      toast.success("Roster Step Added!");
    } catch (err) {
      toast.error("Failed to add roster step.");
    }
  };

  const handleDeleteRosterStep = async (idxToDelete: number) => {
    if (!rosterSelectedProduct) return;
    const currentIngredients = rosterSelectedProduct.ingredients || [];
    const filtered = currentIngredients.filter((_: any, idx: number) => idx !== idxToDelete);
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

  const triggerWhatsAppBroadcast = (phone: string) => {
    const cleanPhone = String(phone).replace("+91", "").trim();
    const encodedMsg = encodeURIComponent(broadcastMessage);
    window.open(`https://wa.me/91${cleanPhone}?text=${encodedMsg}`, '_blank');

    if (!sentBroadcastPhones.includes(cleanPhone)) {
      setSentBroadcastPhones(prev => [...prev, cleanPhone]);
    }
  };

  const handleResetTokenCounter = () => {
    if (window.confirm("Bum Bum Cafe ke Token Sequence ko reset karein?")) {
      localStorage.setItem('bb_cafe_token_seed', '1');
      toast.success("Token sequence resets safely!");
    }
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.loading("Processing Excel/CSV Import...", { id: "csv-import" });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/);
        
        if (lines.length <= 1) {
          toast.error("File is empty or invalid!", { id: "csv-import" });
          return;
        }

        let successCount = 0;
        let failCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const columns = line.split(',').map(col => col.replace(/^"|"$/g, '').trim());
          
          let name = columns[0] || "Customer";
          let phone = columns[1] || "";
          let points = Number(columns[2]) || 0;

          if (!phone && name && /^\d+$/.test(name)) {
            phone = name;
            name = "Customer";
          }

          const cleanPhone = phone.replace("+91", "").replace(/\s+/g, "").trim();

          if (!cleanPhone || cleanPhone.length < 10) {
            failCount++;
            continue;
          }

          await setDoc(doc(db, "customer_points", cleanPhone), {
            name: name,
            phone: cleanPhone,
            points: points,
            lastActive: new Date()
          }, { merge: true });

          successCount++;
        }

        toast.success(`Successfully imported ${successCount} customers! (Failed/Skipped: ${failCount})`, { 
          id: "csv-import", 
          duration: 5000 
        });
      } catch (err) {
        console.error("CSV Parsing Error:", err);
        toast.error("Failed to parse and import file.", { id: "csv-import" });
      }
    };

    reader.readAsText(file);
    e.target.value = ""; 
  };

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

  const broadcastTargetedCustomers = useMemo(() => {
    return searchedCustomers.map(user => {
      const metrics = getCustomerLoyaltyMetrics(user.phone);
      return { ...user, metrics };
    }).filter(user => {
      if (broadcastTierFilter !== 'all') {
        const tLower = user.metrics.tier.toLowerCase();
        if (broadcastTierFilter === 'platinum' && !tLower.includes('platinum')) return false;
        if (broadcastTierFilter === 'gold' && !tLower.includes('gold')) return false;
        if (broadcastTierFilter === 'silver' && !tLower.includes('silver')) return false;
        if (broadcastTierFilter === 'bronze' && !tLower.includes('bronze')) return false;
      }

      if (Number(user.points || 0) < broadcastMinPoints) return false;
      if (Number(user.metrics.totalSpend || 0) < broadcastMinSpend) return false;

      return true;
    });
  }, [searchedCustomers, broadcastTierFilter, broadcastMinPoints, broadcastMinSpend]);

  const handleSendNextUnsentBroadcast = () => {
    const unsentList = broadcastTargetedCustomers.filter(u => !sentBroadcastPhones.includes(u.phone));
    if (unsentList.length === 0) {
      return toast.error("All targeted customers have been messaged in this session!");
    }
    const nextTarget = unsentList[0];
    triggerWhatsAppBroadcast(nextTarget.phone);
    toast.success(`Opening WhatsApp for ${nextTarget.name}...`);
  };

  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Securing Session...</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4 font-sans">
        {/* Linked dedicated Admin manifest */}
        <link rel="manifest" href="/admin-manifest.json" />
        <Toaster />
        <div className="w-full max-w-md bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
          
          <div className="text-center space-y-2 relative z-10">
            <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-black text-orange-500 italic uppercase">Staff Portal</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra</p>
          </div>

          <form onSubmit={handlePasscodeLogin} className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terminal Access Key</label>
              <input 
                type="password" 
                placeholder="Enter Access Key" 
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
      {/* Linked dedicated Admin manifest */}
      <link rel="manifest" href="/admin-manifest.json" />
      <Toaster />
      
      {/* Header */}
      <header className="p-6 bg-white/[0.03] border-b border-white/5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-orange-500 italic uppercase">Admin Control</h1>
          <p className="text-[10px] text-gray-505 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra ({userRole === 'admin' ? 'Boss' : 'Manager'})</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleStore} className={`px-4 py-2 rounded-full text-[10px] font-black flex items-center gap-2 transition-all ${storeOpen ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
            <Power size={14} /> {storeOpen ? "ONLINE" : "OFFLINE"}
          </button>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-full text-gray-400 active:scale-90 transition-all"><LogOut size={18}/></button>
        </div>
      </header>

      {/* --- NAV TABS --- */}
      <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        <button onClick={() => setTab('dashboard')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'dashboard' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>📊 Dashboard</button>
        <button onClick={() => setTab('orders')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'orders' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>📦 Orders ({orders.length})</button>
        <button onClick={() => setTab('menu')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'menu' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🍔 Menu List</button>
        <button onClick={() => setTab('roster')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'roster' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>📋 Kitchen Roster</button>
        <button onClick={() => setTab('categories')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'categories' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🗂️ Categories</button>
        <button onClick={() => setTab('customers')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'customers' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>👥 Customers ({combinedCustomers.length})</button>
        <button onClick={() => setTab('loyalty')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'loyalty' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🎁 Loyalty Rules</button>
        <button onClick={() => setTab('banners')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'banners' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🖼️ Promo Banners</button>
        <button onClick={() => setTab('reels')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'reels' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🎥 Food Reels</button>
        <button onClick={() => setTab('header_video')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'header_video' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🎬 Header Video</button>
        <button onClick={() => setTab('coupons')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'coupons' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🎟️ Coupons</button>
        <button onClick={() => setTab('reviews')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'reviews' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>⭐ Reviews</button>
        <button onClick={() => setTab('proofs')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'proofs' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🔥 Order Alerts</button>
        <button onClick={() => setTab('claims')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'claims' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>✅ Verification Claims</button>
        <button onClick={() => setTab('security')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'security' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🔑 PIN Settings</button>
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        
        {/* --- TAB 1: DASHBOARD --- */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><BarChart3 size={20}/> Sales Dashboard</h3>
            
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

              {/* 4-Column stats grid with direct integration of the Rejected Orders metric */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-white/5 pt-4">
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Range Sales</p>
                  <h3 className="text-base font-black text-green-400 mt-1">₹{auditStats.rangeRevenue}</h3>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Range Orders</p>
                  <h3 className="text-base font-black text-yellow-400 mt-1">{auditStats.rangeCount}</h3>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-505 uppercase">Active Kitchen</p>
                  <h3 className="text-base font-black text-orange-500 mt-1">{auditStats.active}</h3>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-red-400 uppercase">Today's Rejected 🚫</p>
                  <h3 className="text-base font-black text-red-500 mt-1">{auditStats.todayRejectedCount}</h3>
                </div>
              </div>

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
                    <span className="text-[9px] font-bold text-gray-505 uppercase mt-1">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>

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
                  <p className="text-center text-[10px] text-gray-655 uppercase font-bold py-2">No sales logged yet...</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#111]/30 border border-white/5 p-4 rounded-[2rem] shadow-xl">
              <button onClick={handleResetTokenCounter} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase font-mono">
                Reset Tokens Counter
              </button>
              <button onClick={handleSendDailyClosingReport} className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-green-500/10 font-mono">
                📲 Send Report to Owner
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-[#111]/30 border border-white/5 p-4 rounded-[2rem] shadow-xl">
              <button onClick={handleExportOrders} className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-green-500/10 font-mono">
                <Download size={14}/> Sales Ledger Excel
              </button>
              <button onClick={handleExportCustomers} className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-orange-455/10">
                <Download size={14}/> Customer List Excel
              </button>
            </div>

            {/* Permanent Financial Ledger with visual formatting for rejected/fake orders */}
            <div className="space-y-4 font-mono">
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest pt-2">📚 Permanent Financial Ledger</h4>
              {orders.length === 0 ? (
                <p className="text-center text-gray-655 py-12 text-xs uppercase font-bold tracking-widest">No transaction data logged...</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className={`p-5 rounded-3xl flex justify-between items-center relative overflow-hidden text-xs border ${o.status === 'rejected' ? 'bg-red-500/[0.02] border-red-500/20' : 'bg-[#111] border-white/5'}`}>
                    <div className="space-y-1 pr-4">
                      {o.status === 'rejected' && (
                        <div className="mb-2 bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-black uppercase px-2.5 py-1 rounded-md w-max">
                          🚫 Rejected / Fake Order
                        </div>
                      )}
                      <div className="flex gap-2.5">
                        <span className="text-[10px] font-black uppercase text-gray-500">Bill No: #{formatBillNumber(o.billNumber || 0)}</span>
                        <span className="text-[10px] font-black uppercase text-yellow-500">Token: #{o.tokenNumber || "N/A"}</span>
                      </div>
                      <h4 className="font-extrabold text-sm text-gray-300">Name: {o.customerName || "Customer"}</h4>
                      <p className="text-[11px] font-bold text-orange-500 font-sans">Mobile: {o.customerPhone || "N/A"}</p>
                      <p className="text-[10px] text-gray-450 font-medium">Address: {o.address || "N/A"}</p>
                      
                      <div className="border-t border-white/5 pt-2 mt-2 space-y-0.5">
                        {o.items?.map((item: any, idx: number) => (
                          <p key={idx} className="text-[11px] font-bold text-gray-400 font-sans">
                            <span className="text-orange-500">×{item.quantity}</span> {item.name}
                          </p>
                        ))}
                      </div>
                      <p className="text-[9px] font-semibold text-gray-600 mt-2 font-sans">{o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-black text-lg leading-none ${o.status === 'rejected' ? 'line-through text-red-500' : 'text-green-400'}`}>₹{o.total}</p>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md mt-2 inline-block ${o.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-400'}`}>
                        {o.status === 'rejected' ? 'REJECTED' : 'PAID'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: LIVE ORDERS --- */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-[#111] border border-white/5 p-5 rounded-3xl flex justify-between items-center">
              <div>
                <h4 className="font-black text-sm text-orange-500 uppercase tracking-wider">📦 Filter Daily Orders</h4>
                <p className="text-[10px] text-gray-505 font-bold mt-0.5">Matching Token & Bill Sequences</p>
              </div>
              <input 
                type="date" 
                value={ordersFilterDate} 
                onChange={(e) => setOrdersFilterDate(e.target.value)} 
                className="bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-bold text-orange-500 outline-none cursor-pointer"
              />
            </div>

            {filteredOrdersList.length === 0 ? (
              <p className="text-center text-gray-655 py-20 font-bold uppercase tracking-widest text-xs">No active orders found for this date...</p>
            ) : (
              filteredOrdersList.map((o) => (
                <div key={o.id} className={`p-6 rounded-[2rem] border relative overflow-hidden ${o.status === 'rejected' ? 'bg-red-500/[0.02] border-red-500/20' : 'bg-white/[0.03] border-white/5'}`}>
                  {o.status === 'rejected' && (
                    <div className="mb-3 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase px-3 py-1 rounded-full w-max">
                      🚫 Rejected / Fake Order
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-orange-500 text-black text-[10px] px-3 py-1 rounded-full font-black font-mono">BILL: #{formatBillNumber(o.billNumber || 0)}</span>
                      <span className="bg-yellow-400 text-black text-[10px] px-3 py-1 rounded-full font-black font-mono">TOKEN: #{o.tokenNumber || "N/A"}</span>
                    </div>
                    <span className={`font-black text-xl ${o.status === 'rejected' ? 'line-through text-red-500' : 'text-orange-500'}`}>₹{o.total}</span>
                  </div>
                  
                  <div className="space-y-2 mb-6 border-b border-white/5 pb-4">
                    {o.items?.map((item: any, idx: number) => (
                      <p key={idx} className="text-sm font-bold text-gray-350 font-sans">
                        <span className="text-orange-500">×{item.quantity}</span> {item.name}
                      </p>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                    <div className="flex items-center gap-2 font-sans"><Phone size={12}/> {o.customerPhone}</div>
                    <div className="flex items-center gap-2"><MapPin size={12}/> {o.address}</div>
                    <div className="flex items-center gap-2 col-span-2 font-sans"><Calendar size={12}/> {o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-sans">Name: {o.customerName || 'N/A'}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => handlePrintReceipt(o)}
                        className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-black rounded-xl text-[10px] font-black uppercase transition-all active:scale-95"
                      >
                        📄 Bill PDF
                      </button>
                      <button 
                        onClick={() => handleSendWhatsAppBill(o)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase rounded-xl"
                      >
                        📲 Send Bill
                      </button>
                      <select value={o.status || 'pending'} onChange={(e) => handleStatusChange(o, e.target.value)} className="bg-black/60 border border-white/10 text-xs font-bold rounded-xl p-2 px-3 text-white outline-none focus:border-orange-500 cursor-pointer">
                        <option value="pending">⏳ Pending (Confirming)</option>
                        <option value="preparing">👨‍🍳 Preparing in Kitchen</option>
                        <option value="out_for_delivery">🛵 Out for Delivery</option>
                        <option value="delivered">✅ Delivered / Completed</option>
                        <option value="rejected">🚫 Rejected / Fake</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- TAB 3: DISHES MENU LIST --- */}
        {tab === 'menu' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <button onClick={handleBulkImport} type="button" className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl font-sans">📥 IMPORT ALL 80+ PDF MENU ITEMS</button>
              
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleMergeDuplicates} className="bg-indigo-650 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all">
                  🔍 Merge Existing Duplicates
                </button>
                <button onClick={() => { setShowAddForm(!showAddForm); setEditingProduct(null); }} className="bg-orange-500/10 text-orange-500 border border-orange-500/20 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-orange-500/20 active:scale-95 transition-all uppercase">
                  <Plus size={16}/> {showAddForm ? "CLOSE FORM" : "ADD NEW ITEM"}
                </button>
              </div>
            </div>

            {/* Sticky Search bar directly aligned under sticky header */}
            <div className="sticky top-[73px] z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5 rounded-b-3xl shadow-lg">
              <div className="relative group max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search item name or category..." 
                  value={menuSearchQuery} 
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="w-full bg-white text-black py-3 px-11 rounded-xl outline-none text-xs font-semibold"
                />
              </div>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddProduct} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                <h3 className="text-lg font-black text-orange-500 italic uppercase">Add Product Form</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
                  <input type="text" placeholder="e.g., Cheese Corn Pizza" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" required>
                    {categoryOptions.filter(c => c !== "All" && c !== "DIY Pizza").map(cat => (
                      <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
                  <input type="url" placeholder="Paste image url link..." value={newImage} onChange={(e) => setNewImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Portion Option Type</label>
                  <select value={variantType} onChange={(e: any) => setVariantType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white">
                    <option value="none" className="bg-[#111]">None (Single Price)</option>
                    <option value="half_full" className="bg-[#111]">Half / Full</option>
                    <option value="plain_butter" className="bg-[#111]">Plain / Butter</option>
                    <option value="pizza_sizes" className="bg-[#111]">Pizza Sizes</option>
                  </select>
                </div>

                {variantType === 'none' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Price (₹)</label>
                    <input type="number" placeholder="Item Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
                  </div>
                )}

                {(variantType === 'half_full' || variantType === 'plain_butter') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Half / Plain Price (₹)</label>
                      <input type="number" placeholder="Price" value={halfPrice} onChange={(e) => setHalfPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label>
                      <input type="number" placeholder="Price" value={fullPrice} onChange={(e) => setFullPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
                    </div>
                  </div>
                )}

                {variantType === 'pizza_sizes' && (
                  <div className="space-y-3 bg-[#111]/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-orange-400 font-extrabold uppercase">Prices (Leave blank if unavailable):</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small (₹)</label><input type="number" value={priceSmall} onChange={(e) => setPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium (₹)</label><input type="number" value={priceMedium} onChange={(e) => setPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-405 uppercase">Large (₹)</label><input type="number" value={priceLarge} onChange={(e) => setPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-455 uppercase">Extra Large (₹)</label><input type="number" value={priceXL} onChange={(e) => setPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white text-xs font-bold" /></div>
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Save Product</button>
              </form>
            )}

            <div className="space-y-3 pt-2">
              {searchedMenu.length === 0 ? (
                <p className="text-center text-xs font-black uppercase text-gray-505 py-10">No matching dishes found...</p>
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
                        <p className="text-orange-555 font-black text-xs italic capitalize">{item.category}</p>
                        <p className="text-orange-500 font-black text-sm mt-1">{getAdminDisplayPrice(item)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { setSopProduct(item); setSopRecipeText(item.recipe || ""); }} 
                          className="p-3 bg-purple-500/10 text-purple-500 rounded-xl flex items-center gap-1.5"
                        >
                          <BookOpen size={16}/> <span className="text-[10px] font-black">SOP</span>
                        </button>
                        <button onClick={() => startEditing(item)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Edit size={18}/></button>
                        <button onClick={() => toggleItemVisibility(item.id, item.isVisible !== false)} className={`p-3 rounded-xl transition-all ${item.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {item.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                        </button>
                        <button onClick={() => handleDeleteProduct(item.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Trash size={18}/></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: CATEGORY MANAGER --- */}
        {tab === 'categories' && (
          <div className="space-y-6">
            {!editingCategory && (
              <form onSubmit={handleAddCategory} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Folder size={18}/> Add Category</h3>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Category Name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" required />
                  <input type="url" placeholder="Image URL link" value={newCatImage} onChange={(e) => setNewCatImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-black text-white" required />
                </div>
                <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Add Category</button>
              </form>
            )}

            <div className="sticky top-[73px] z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5 rounded-b-3xl shadow-lg">
              <div className="relative group max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search categories..." 
                  value={categorySearchQuery} 
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  className="w-full bg-white text-black py-3 px-11 rounded-xl outline-none text-xs font-semibold"
                />
              </div>
            </div>

            {editingCategory && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <form onSubmit={handleUpdateCategory} className="bg-[#111] border-2 border-orange-500 p-8 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl space-y-4">
                  <button type="button" onClick={() => setEditingCategory(null)} className="absolute top-4 right-4 p-2.5 bg-white/5 text-gray-455 hover:text-white rounded-full"><X size={18}/></button>
                  <div className="text-center pb-2">
                    <h3 className="text-2xl font-black text-orange-500 italic uppercase flex items-center justify-center gap-2"><Folder size={22}/> Edit Category</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-455 uppercase">Category Name</label>
                      <input type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-455 uppercase">Image URL Link</label>
                      <input type="url" value={editCatImage} onChange={(e) => setEditCatImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Update Category</button>
                    <button type="button" onClick={() => setEditingCategory(null)} className="bg-white/5 text-gray-405 p-4 rounded-xl font-black text-xs uppercase">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-3">
              {searchedCategories.map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/[0.04]">
                  <div className="flex items-center gap-4">
                    <img src={c.image} className="w-12 h-12 rounded-full object-cover" alt="Category"/>
                    <div className="flex flex-col">
                      <h4 className="font-black text-sm text-gray-200">{c.name}</h4>
                      {c.isVirtual && <span className="text-[8px] text-orange-500 font-bold uppercase">Default Back-up</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEditingCategory(c)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Edit size={18}/></button>
                    <button onClick={() => toggleCategoryVisibility(c)} className={`p-3 rounded-xl transition-all ${c.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {c.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                    </button>
                    <button onClick={() => handleDeleteCategory(c)} className="p-3 bg-red-500/10 text-red-500 rounded-xl"><Trash size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 5: CUSTOMERS TAB --- */}
        {tab === 'customers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><User size={20}/> Customer Management</h3>
              <div className="flex gap-2">
                <label className="bg-[#facc15] hover:bg-yellow-600 text-black font-black text-[10px] px-4 py-2.5 rounded-full flex items-center gap-1.5 uppercase cursor-pointer transition-all">
                  Import CSV
                  <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
                </label>
                <button onClick={() => setShowBroadcastModal(true)} className="bg-green-600 text-white font-black text-[10px] px-4 py-2.5 rounded-full flex items-center gap-1.5 uppercase shadow-md">
                  <Share2 size={13}/> Broadcast Blast
                </button>
              </div>
            </div>

            <div className="sticky top-[73px] z-30 bg-[#050505]/95 backdrop-blur-md py-4 border-b border-white/5 rounded-b-3xl shadow-lg">
              <div className="relative group max-w-lg mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search customer by name or mobile number..." 
                  value={customerSearchQuery} 
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full bg-white text-black py-3 px-11 rounded-xl outline-none text-xs font-semibold"
                />
              </div>
            </div>
            
            {editingCustomer && (
              <form onSubmit={handleUpdateCustomer} className="bg-[#151515] border-2 border-orange-500 p-6 rounded-[2.5rem] space-y-4">
                <h4 className="text-sm font-black text-orange-500 uppercase">Edit Customer Profile</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Customer Name</label>
                    <input type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Adjust Points</label>
                    <input type="number" value={editCustomerPoints} onChange={(e) => setEditCustomerPoints(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white p-3 rounded-xl font-black text-xs uppercase">Save Changes</button>
                  <button type="button" onClick={() => setEditingCustomer(null)} className="bg-white/5 text-gray-455 p-3 rounded-xl font-black text-xs uppercase">Cancel</button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {searchedCustomers.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-550 py-10 uppercase">No matching customers found...</p>
              ) : (
                searchedCustomers
                  .map(user => ({ ...user, metrics: getCustomerLoyaltyMetrics(user.phone) }))
                  .sort((a, b) => b.metrics.totalSpend - a.metrics.totalSpend)
                  .map(user => {
                    return (
                      <div key={user.id} className="bg-[#111] border border-white/5 p-5 rounded-3xl flex justify-between items-center hover:border-white/10">
                        <div className="space-y-1 cursor-pointer flex-1" onClick={() => setSelectedCustomerHistory(user)}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-white hover:text-orange-500">{user.name} ➡️</h4>
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
                            <p className="text-[9px] font-bold text-gray-555 uppercase">Available Points</p>
                            <h4 className="text-lg font-black text-yellow-400">{user.points || 0} Pts</h4>
                          </div>
                          <button 
                            onClick={() => {
                              setEditingCustomer(user);
                              setEditCustomerName(user.name);
                              setEditCustomerPoints(user.points || 0);
                            }}
                            className="p-3 bg-orange-500/10 text-orange-500 rounded-xl"
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

        {/* --- TAB 6: LOYALTY RULES --- */}
        {tab === 'loyalty' && (
          <div className="space-y-6">
            <form onSubmit={handleAddRule} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Gift size={18}/> Setup Loyalty Rules</h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Create rewards that customers can redeem automatically on checkout when their points hit the requirement:</p>
              
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Reward Name" value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" required />
                <input type="number" placeholder="Points Needed" value={newRulePoints} onChange={(e) => setNewRulePoints(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-black text-white" required />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Add Reward Rule</button>
            </form>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-505 uppercase tracking-widest pl-1">Active Customer Reward Rules ({loyaltyRules.length})</p>
              {loyaltyRules.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-505 py-6">No custom rules configured yet...</p>
              ) : (
                loyaltyRules.map(rule => (
                  <div key={rule.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex justify-between items-center hover:bg-white/[0.04]">
                    <div>
                      <h4 className="font-black text-sm text-gray-200">{rule.rewardName}</h4>
                      <p className="text-xs text-yellow-400 font-extrabold mt-0.5">Cost: {rule.pointsCost} Points</p>
                    </div>
                    <button onClick={() => handleDeleteRule(rule.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                      <Trash size={16}/>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">🔄 Points Transfer Logs ({transferLogs.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                {transferLogs.map(log => (
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
                      <p className="text-[8px] text-gray-655 mt-1">
                        {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Just now"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 7: BANNERS MANAGER --- */}
        {tab === 'banners' && (
          <div className="space-y-6">
            <form onSubmit={handleAddBanner} className="bg-[#020202] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><ImageIcon size={18}/> Manage Promo Banners</h3>
              <p className="text-[10px] text-gray-550 font-bold uppercase leading-normal">यहाँ से आप मुख्य स्क्रीन के बड़े आफर बैनर्स (Image या Video) को जोड़ सकते हैं।</p>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Banner Title</label>
                <input type="text" placeholder="e.g. Free Delivery above ₹99" value={newBannerTitle} onChange={(e) => setNewBannerTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-405 uppercase">Media Link (Video/Image URL)</label>
                <input type="url" placeholder="Paste Image link or Video URL..." value={newBannerUrl} onChange={(e) => setNewBannerUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
              </div>

              {newBannerUrl && (
                <div className="space-y-2">
                  <p className="text-[10px] text-orange-400 font-extrabold uppercase">Media Preview:</p>
                  <div className="h-40 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 flex items-center justify-center">
                    {isVideoUrl(newBannerUrl) ? (
                      <video src={newBannerUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={newBannerUrl} className="w-full h-full object-cover" alt="Preview" />
                    )}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Add Promo Banner 🖼️</button>
            </form>

            <div className="grid grid-cols-2 gap-4">
              {banners.map(b => (
                <div key={b.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative group">
                  <div className="h-24 overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center">
                    {isVideoUrl(b.url) ? (
                      <video src={b.url} muted className="w-full h-full object-cover" />
                    ) : (
                      <img src={b.url} className="w-full h-full object-cover opacity-80" alt="Banner" />
                    )}
                  </div>
                  <div className="mt-2 text-[10px] space-y-0.5">
                    <p className="font-black text-gray-200 truncate">{b.title || "Offer Banner"}</p>
                  </div>
                  <button onClick={() => handleDeleteBanner(b.id)} className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 active:text-black">
                    <Trash size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 7.5: FOOD REELS / STORIES MANAGER --- */}
        {tab === 'reels' && (
          <div className="space-y-6">
            <form onSubmit={handleAddReel} className="bg-[#020202] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Play size={18}/> Manage Food Reels / Stories</h3>
              <p className="text-[10px] text-gray-550 font-bold uppercase leading-normal">यहाँ से आप circular food stories और video reels add kar sakte hain (with item price).</p>
              
              <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Title/Dish Name</label>
                  <input type="text" placeholder="e.g. Cheese Pizza Reel" value={newReelTitle} onChange={(e) => setNewReelTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Item Price (₹)</label>
                  <input type="number" placeholder="e.g. 120" value={newReelPrice} onChange={(e) => setNewReelPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                <input type="text" placeholder="e.g. Freshly baked mozzarella cheese pull!" value={newReelDesc} onChange={(e) => setNewReelDesc(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Reel Cover Image (URL)</label>
                <input type="url" placeholder="Paste static thumbnail image URL..." value={newReelCoverUrl} onChange={(e) => setNewReelCoverUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Media Link (Video/Image URL)</label>
                <input type="url" placeholder="Paste .mp4 link or Image URL..." value={newReelUrl} onChange={(e) => setNewReelUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
              </div>

              {newReelUrl && (
                <div className="space-y-2">
                  <p className="text-[10px] text-orange-400 font-extrabold uppercase">Media Preview:</p>
                  <div className="h-40 rounded-xl overflow-hidden bg-neutral-900 border border-white/5 flex items-center justify-center">
                    {isVideoUrl(newReelUrl) ? (
                      <video src={newReelUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={newReelUrl} className="w-full h-full object-cover" alt="Preview" />
                    )}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Add Food Reel 🎥</button>
            </form>

            <div className="grid grid-cols-2 gap-4">
              {reels.map(r => (
                <div key={r.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative group">
                  <div className="h-32 overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center">
                    {isVideoUrl(r.url) ? (
                      <video src={r.url} muted loop autoPlay className="w-full h-full object-cover" />
                    ) : (
                      <img src={r.url} className="w-full h-full object-cover" alt="Reel Preview" />
                    )}
                  </div>
                  <div className="mt-2 text-[10px] space-y-0.5">
                    <p className="font-black text-gray-200 truncate">{r.title}</p>
                    <p className="text-orange-500 font-bold">Price: ₹{r.price}</p>
                    <p className="text-gray-455 truncate">{r.description}</p>
                  </div>
                  <button onClick={() => handleDeleteReel(r.id)} className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 active:text-black">
                    <Trash size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 7.6: MAIN BACKGROUND HEADER VIDEO --- */}
        {tab === 'header_video' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2">🎬 Main Background Header Video</h3>
            <p className="text-[10px] text-gray-550 uppercase tracking-widest font-black leading-relaxed font-mono">यहाँ से आप मुख्य होमपेज के पीछे चलने वाले बैकग्राउंड वीडियो को बदल सकते हैं।</p>

            <form onSubmit={handleUpdateHeaderVideo} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-405 uppercase">Background Video URL</label>
                <input 
                  type="url" 
                  value={headerVideoInput} 
                  onChange={(e) => setHeaderVideoInput(e.target.value)} 
                  placeholder="Paste .mp4 or stream video URL..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" 
                  required 
                />
              </div>
              
              {headerVideoInput && (
                <div className="space-y-2">
                  <p className="text-[10px] text-orange-400 font-extrabold uppercase">Live Preview:</p>
                  <div className="h-36 rounded-2xl overflow-hidden bg-neutral-900 border border-white/5">
                    <video src={headerVideoInput} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Update Header Video 🎬</button>
            </form>
          </div>
        )}

        {/* --- TAB 8: COUPONS --- */}
        {tab === 'coupons' && (
          <div className="space-y-6">
            <form onSubmit={handleAddCoupon} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Percent size={18}/> Add Coupon Code</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="CODE (e.g. WELCOME)" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black uppercase text-white" required />
                <input type="number" placeholder="Discount (₹)" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-black text-white" required />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Create Coupon</button>
            </form>

            <div className="space-y-3">
              {coupons.map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest">{c.code}</h4>
                    <p className="text-xs font-bold text-gray-455 mt-1">Value: Flat ₹{c.discountValue} OFF</p>
                  </div>
                  <button onClick={() => handleDeleteCoupon(c.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                    <Trash size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 9: APPROVE & MANAGE REVIEWS --- */}
        {tab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 && <p className="text-center text-gray-550 py-16 font-bold uppercase tracking-widest">No reviews found...</p>}
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
                    <button onClick={() => handleApproveReview(r.id)} className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase">Approve Review</button>
                  )}
                  <button onClick={() => handleDeleteReview(r.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                    <Trash size={16}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 10: KITCHEN RECIPE ROSTER --- */}
        {tab === 'roster' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><Settings size={20}/> Kitchen SOP Recipe Roster</h3>
            <p className="text-[10px] text-gray-550 uppercase tracking-widest font-black leading-relaxed font-mono">डिश बनाने के चरण (Steps) और सामग्री का अनुपात फीड करें, और रसोई की दीवार पर चिपकाने के लिए सीधे A4 साइज़ पोस्टर प्रिंट करें।</p>

            <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-3">
              <label className="text-xs font-bold text-gray-405 uppercase block">Select Dish / डिश चुनें</label>
              <select 
                value={rosterSelectedProduct ? rosterSelectedProduct.id : ""}
                onChange={(e) => {
                  const selected = menu.find(item => item.id === e.target.value);
                  setRosterSelectedProduct(selected || null);
                }}
                className="w-full bg-black/60 border border-white/10 text-sm font-bold rounded-xl p-3 text-white outline-none cursor-pointer"
              >
                <option value="">-- Choose a Dish --</option>
                {menu.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>

            {rosterSelectedProduct && (
              <div className="space-y-6">
                <div className="bg-[#111] border border-white/5 p-5 rounded-3xl flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-sm text-white uppercase">{rosterSelectedProduct.name} - SOP</h4>
                    <p className="text-[9px] text-gray-555 font-bold uppercase mt-0.5">Steps: {rosterSelectedProduct.ingredients?.length || 0}</p>
                  </div>
                  <button 
                    onClick={() => handlePrintRosterSOP(rosterSelectedProduct)}
                    className="px-5 py-3 bg-orange-500 text-black rounded-2xl text-xs font-black uppercase"
                  >
                    🖨️ Print Recipe Poster
                  </button>
                </div>

                <form onSubmit={handleAddRosterStep} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                  <h4 className="text-xs font-black text-orange-500 uppercase">Add SOP Step / नया चरण जोड़ें</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-455 uppercase">Ingredient / Action (क्या डालें)</label>
                      <input type="text" placeholder="e.g. Pizza Base / Cheese" value={rosterStepName} onChange={(e) => setRosterStepName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-bold text-white" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-455 uppercase">Quantity / मात्रा</label>
                      <input type="text" placeholder="e.g. 1 Piece / 30 grams" value={rosterStepQty} onChange={(e) => setRosterStepQty(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-bold text-white" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-405 uppercase">Special Cooking Instruction (विशेष निर्देश)</label>
                    <input type="text" placeholder="e.g. ओवन में डालने से पहले अच्छे से सेकें (Optional)" value={rosterStepNote} onChange={(e) => setRosterStepNote(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-bold text-white" />
                  </div>
                  <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Add Step to Recipe</button>
                </form>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-455 uppercase pl-1">Active Recipe Steps</p>
                  {(rosterSelectedProduct.ingredients || []).length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-600 py-6">No steps defined for this recipe.</p>
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
                        <button onClick={() => handleDeleteRosterStep(idx)} className="p-2.5 bg-red-500/10 text-red-500 rounded-lg">
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

        {/* --- TAB 11: SOCIAL PROOF MANAGER --- */}
        {tab === 'proofs' && (
          <div className="space-y-6">
            <form onSubmit={handleAddSocialProof} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2">🔥 Create Social Proof Notification</h3>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">यहाँ से आप नीचे स्क्रॉल होने वाले आर्डर अलर्ट बदल सकते हैं।</p>
              
              <textarea 
                rows={2}
                placeholder="उदा: शुभम द्विवेदी जी (टाउन) ने अभी-अभी 'स्पेशल थाली' आर्डर की 🍱" 
                value={newProofText}
                onChange={(e) => setNewProofText(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-white outline-none font-bold animate-none"
                required
              />
              <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Add Custom Alert</button>
            </form>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-550 uppercase pl-1">All Live Order Alerts ({socialProofs.length})</p>
              {socialProofs.map(alert => (
                <div key={alert.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex justify-between items-center text-xs">
                  <p className="font-bold text-gray-300 max-w-[80%] leading-relaxed">{alert.text}</p>
                  <button onClick={() => handleDeleteSocialProof(alert.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-lg">
                    <Trash size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 12: SECURITY POINT CLAIMS MANAGER --- */}
        {tab === 'claims' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2">📢 Points Claims Manager</h3>
              <p className="text-[10px] text-gray-505 font-bold uppercase mt-1">वेरिफाई करें कि क्या यूज़र ने आपको वाकई सोशल मीडिया पर फॉलो किया है</p>
            </div>

            <div className="space-y-3">
              {pointsClaims.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-505 py-12 uppercase">कोई दावा अनुरोध नहीं मिला।</p>
              ) : (
                pointsClaims.map((claim) => (
                  <div key={claim.id} className="bg-neutral-900 border border-white/5 p-4 rounded-3xl space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-black text-orange-500">{claim.customerName}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${claim.status === 'approved' ? 'bg-green-500/10 text-green-500' : claim.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {claim.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-semibold space-y-0.5">
                      <p>प्लेटформа: <span className="text-white">{claim.platformLabel}</span></p>
                      <p>सोशल यूज़रनेम / हैंडल: <span className="text-yellow-400 font-black">{claim.socialUsername}</span></p>
                      <p>कस्टमर नंबर: <span className="text-white">+{claim.customerPhone}</span></p>
                      <p className="text-[9px] text-gray-650">{claim.timestamp?.toDate ? claim.timestamp.toDate().toLocaleString() : ""}</p>
                    </div>
                    {claim.status === "pending" && (
                      <div className="flex gap-2 pt-1.5">
                        <button 
                          onClick={() => handleVerifyClaimApproval(claim)} 
                          className="flex-1 bg-green-600 text-white font-black py-1.5 rounded text-[9px] uppercase flex items-center justify-center gap-1 shadow-md"
                        >
                          <CheckCircle size={10}/> Accept (+1 Point)
                        </button>
                        <button 
                          onClick={() => handleRejectClaim(claim.id)} 
                          className="flex-1 bg-red-955 text-red-400 font-black py-1.5 rounded text-[9px] uppercase flex items-center justify-center gap-1"
                        >
                          <XCircle size={10}/> Reject claim
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 13: PIN SETTINGS & MULTI-STAFF MANAGEMENT --- */}
        {tab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><Lock size={20}/> PIN & Staff Configuration</h3>
            
            {/* 1. MASTER CODES FORM (Admins only) */}
            <form onSubmit={handleUpdatePasscodes} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-5">
              <div>
                <h4 className="text-sm font-black text-orange-500 uppercase">Change security PINs</h4>
                <p className="text-[9px] text-gray-555 font-bold uppercase mt-1 leading-relaxed font-mono">केवल एडमिनिस्ट्रेटर ही दोनों रोल (Admin व Manager) के क्रेडेंशियल्स को बदल सकता है।</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Admin LOGIN PIN</label>
                  <input 
                    type="password" 
                    value={newAdminPinInput}
                    onChange={(e) => setNewAdminPinInput(e.target.value)}
                    disabled={userRole !== 'admin'}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest animate-none"
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
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest animate-none"
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

            {/* 2. DYNAMIC STAFF MANAGEMENT DIRECTORY */}
            <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-5">
              <div>
                <h4 className="text-sm font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">👥 Staff Accounts Registry</h4>
                <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 leading-relaxed">Yahan se aap sabhi Delivery boys aur Kitchen Cooks ke liye alag se unique PIN aur Name setup kar sakte hain:</p>
              </div>

              {/* Add Staff Member Form */}
              {!editingStaffId ? (
                <form onSubmit={handleAddStaff} className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-3.5 text-xs font-bold text-left">
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider">➕ Add Staff Member / नया स्टाफ जोड़ें</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase">Staff Name</label>
                      <input type="text" placeholder="e.g. Ramesh" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase">Personal 4-digit PIN</label>
                      <input type="password" maxLength={4} placeholder="e.g. 1234" value={newStaffPin} onChange={(e) => setNewStaffPin(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none text-center tracking-widest" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase">Staff Role</label>
                    <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none cursor-pointer">
                      <option value="delivery">Rider / Delivery Boy 🛵</option>
                      <option value="kitchen">Cook / Kitchen Staff 👨‍🍳</option>
                      <option value="cashier">Cashier / Counter Manager 💼</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-green-600 text-white p-2.5 rounded-lg font-black uppercase text-[10px]">Add Staff Member</button>
                </form>
              ) : (
                <form onSubmit={handleUpdateStaff} className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-2xl space-y-3.5 text-xs font-bold text-left">
                  <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider">✏️ Edit Staff Member</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase">Staff Name</label>
                      <input type="text" value={editingStaffName} onChange={(e) => setEditingStaffName(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-gray-500 uppercase">Personal 4-digit PIN</label>
                      <input type="password" maxLength={4} value={editingStaffPin} onChange={(e) => setEditingStaffPin(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none text-center tracking-widest" required />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-500 uppercase">Staff Role</label>
                    <select value={editingStaffRole} onChange={(e) => setEditingStaffRole(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none cursor-pointer">
                      <option value="delivery">Rider / Delivery Boy 🛵</option>
                      <option value="kitchen">Cook / Kitchen Staff 👨‍🍳</option>
                      <option value="cashier">Cashier / Counter Manager 💼</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-green-600 text-white p-2.5 rounded-lg font-black uppercase text-[10px]">Save Changes</button>
                    <button type="button" onClick={() => setEditingStaffId(null)} className="bg-white/5 text-gray-404 p-2.5 rounded-lg font-black uppercase text-[10px]">Cancel</button>
                  </div>
                </form>
              )}

              {/* Staff Accounts List Directory */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Registered Staff Directory ({staff.length})</p>
                {staff.length === 0 ? (
                  <p className="text-center text-[10px] text-gray-500 uppercase font-bold py-4">No staff members registered yet.</p>
                ) : (
                  staff.map((member) => {
                    const isPinRevealed = revealPinId === member.id;
                    return (
                      <div key={member.id} className="bg-black/30 border border-white/5 p-3.5 rounded-2xl flex justify-between items-center text-xs font-bold gap-4">
                        <div>
                          <p className="text-white font-black">{member.name}</p>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block ${member.role === 'delivery' ? 'bg-blue-500/10 text-blue-400' : member.role === 'kitchen' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                            {member.role === 'delivery' ? 'Rider 🛵' : member.role === 'kitchen' ? 'Kitchen 👨‍🍳' : 'Cashier 💼'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* PIN Hide/Reveal Widget */}
                          <div className="flex items-center gap-1.5 bg-black/50 border border-white/5 px-2.5 py-1.5 rounded-xl">
                            <span className="text-[10px] font-mono text-orange-400 tracking-wider">
                              PIN: {isPinRevealed ? member.pin : '••••'}
                            </span>
                            <button 
                              onClick={() => setRevealPinId(isPinRevealed ? null : member.id)}
                              className="text-gray-400 hover:text-white"
                              title="Toggle PIN Visibility"
                            >
                              {isPinRevealed ? <EyeOff size={12}/> : <Eye size={12}/>}
                            </button>
                          </div>

                          <button 
                            onClick={() => {
                              setEditingStaffId(member.id);
                              setEditingStaffName(member.name);
                              setEditingStaffRole(member.role);
                              setEditingStaffPin(member.pin);
                            }}
                            className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"
                            title="Edit"
                          >
                            <Edit size={12}/>
                          </button>
                          <button 
                            onClick={() => handleDeleteStaff(member.id)}
                            className="p-2 bg-red-500/10 text-red-500 rounded-xl"
                            title="Delete"
                          >
                            <Trash size={12}/>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Table QR Code Generator Widget */}
            <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <div>
                <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">🍽️ Dine-In Table QR Generator</h4>
                <p className="text-[9px] text-gray-555 font-bold uppercase mt-1 leading-relaxed">Select a table number to generate a direct scan QR code for automatic table order routing:</p>
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Table Number</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={genTableNum} 
                    onChange={(e) => setGenTableNum(e.target.value)} 
                    placeholder="e.g. 3"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" 
                  />
                </div>
                <button 
                  onClick={() => {
                    if (!genTableNum) return toast.error("Please enter a table number!");
                    const url = `https://bb-cafe-app.vercel.app/?table=${genTableNum}`;
                    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-3.5 px-6 rounded-xl uppercase tracking-wider transition-all"
                >
                  Generate QR Code
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- CUSTOMER ORDER HISTORY MODAL --- */}
      {selectedCustomerHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] w-full max-w-lg relative max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl space-y-4">
            <button 
              onClick={() => setSelectedCustomerHistory(null)} 
              className="absolute top-4 right-4 p-2 bg-white/5 text-gray-455 hover:text-white rounded-full transition-all"
            >
              <X size={18}/>
            </button>
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-lg font-black text-orange-500 uppercase">{selectedCustomerHistory.name} - Order History</h3>
              <p className="text-[10px] text-gray-555 font-bold uppercase tracking-widest mt-0.5">Mobile: +{selectedCustomerHistory.phone}</p>
            </div>

            <div className="space-y-3">
              {selectedCustomerHistory.metrics?.customerOrders.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-655 py-8">No historical transactions logged.</p>
              ) : (
                selectedCustomerHistory.metrics?.customerOrders.map((o: any) => (
                  <div key={o.id} className={`p-4 rounded-2xl flex justify-between items-center text-xs border ${o.status === 'rejected' ? 'bg-red-500/[0.02] border-red-500/20' : 'bg-white/[0.01] border-white/5'}`}>
                    <div>
                      {o.status === 'rejected' && (
                        <div className="mb-2 bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-md w-max">
                          🚫 Rejected / Fake
                        </div>
                      )}
                      <div className="flex gap-2">
                        <span className="text-[9px] font-black uppercase text-gray-550">Bill: #{formatBillNumber(o.billNumber || 0)}</span>
                        <span className="text-[9px] font-black uppercase text-yellow-500">Token: #{o.tokenNumber || "N/A"}</span>
                      </div>
                      <div className="space-y-0.5 mt-1.5">
                        {o.items?.map((item: any, idx: number) => (
                          <p key={idx} className="text-xs text-gray-400 font-medium">
                            <span className="text-orange-500">×{item.quantity}</span> {item.name}
                          </p>
                        ))}
                      </div>
                      <span className="text-[8px] text-gray-655 block mt-2">
                        {o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className={`font-black text-sm ${o.status === 'rejected' ? 'line-through text-red-500' : 'text-green-400'}`}>₹{o.total}</p>
                      <span className={`text-[8px] px-2 py-0.5 rounded uppercase font-bold mt-1 inline-block ${o.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-400'}`}>
                        {o.status === 'rejected' ? 'REJECTED' : (o.status || 'Completed')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- DIGITAL RECIPE GUIDE (SOP MODAL) --- */}
      {sopProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSaveSopRecipe} className="bg-[#111] border-2 border-orange-500/50 p-6 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl space-y-4">
            <button 
              type="button" 
              onClick={() => setSopProduct(null)} 
              className="absolute top-4 right-4 p-2 bg-white/5 text-gray-405 hover:text-white rounded-full transition-all"
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
                placeholder="Write down the detailed step-by-step recipe, quantity of ingredients..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-xs font-bold text-white h-44 resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Save SOP Guide</button>
              <button type="button" onClick={() => setSopProduct(null)} className="bg-white/5 text-gray-405 p-3.5 rounded-xl font-black text-xs uppercase">Close</button>
            </div>
          </form>
        </div>
      )}

      {/* --- IMPROVED WHATSAPP BROADCAST MODAL --- */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <button 
              onClick={() => setShowBroadcastModal(false)} 
              className="absolute top-4 right-4 p-2 bg-white/5 text-gray-455 hover:text-white rounded-full transition-all"
            >
              <X size={18}/>
            </button>
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-lg font-black text-orange-500 uppercase">Smart Marketing Blast</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">Target the Right Loyal Customers</p>
            </div>

            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-3">
              <p className="text-[10px] font-black uppercase text-orange-400 flex items-center gap-1">
                <Filter size={12}/> Target Segment Filters
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-505 uppercase font-sans">VIP Tier</label>
                  <select 
                    value={broadcastTierFilter} 
                    onChange={(e) => setBroadcastTierFilter(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 text-[10px] font-bold rounded-lg p-2 text-white outline-none cursor-pointer"
                  >
                    <option value="all">All Tiers</option>
                    <option value="platinum">👑 Platinum</option>
                    <option value="gold">🥇 Gold VIP</option>
                    <option value="silver">🥈 Silver VIP</option>
                    <option value="bronze">🥉 Regular</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-505 uppercase">Min Points</label>
                  <input 
                    type="number" 
                    placeholder="Min Points"
                    value={broadcastMinPoints || ""}
                    onChange={(e) => setBroadcastMinPoints(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 text-[10px] font-bold rounded-lg p-2 text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-505 uppercase">Min Spend (₹)</label>
                  <input 
                    type="number" 
                    placeholder="Min Spend"
                    value={broadcastMinSpend || ""}
                    onChange={(e) => setBroadcastMinSpend(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/10 text-[10px] font-bold rounded-lg p-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold border-t border-white/5 pt-2.5">
                <span>Targets Found: <strong className="text-orange-500">{broadcastTargetedCustomers.length}</strong></span>
                <span>Sent: <strong className="text-green-500">{broadcastTargetedCustomers.filter(c => sentBroadcastPhones.includes(c.phone)).length}</strong></span>
                <span>Remaining: <strong className="text-yellow-500">{broadcastTargetedCustomers.filter(c => !sentBroadcastPhones.includes(c.phone)).length}</strong></span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Write Promotional Message</label>
              <textarea 
                value={broadcastMessage} 
                onChange={(e) => setBroadcastMessage(e.target.value)} 
                placeholder="Type your special discount offer or festive wishes here..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-orange-500 text-xs font-bold text-white h-24 resize-none leading-relaxed animate-none"
              />
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl space-y-3 text-center">
              <p className="text-[10px] text-orange-400 font-extrabold uppercase tracking-wide">⚡ One-Click Queue Sender Assistant</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleSendNextUnsentBroadcast}
                  type="button"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-black font-black text-xs uppercase py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md animate-none"
                >
                  💬 Send Next (Unsent Queue)
                </button>
                <button 
                  onClick={() => { setSentBroadcastPhones([]); toast.success("Sent history reset successfully!"); }}
                  title="Reset session"
                  type="button"
                  className="bg-white/5 text-gray-455 transition-all active:scale-95"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] text-gray-400 font-extrabold uppercase">Target Audience List ({broadcastTargetedCustomers.length})</p>
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {broadcastTargetedCustomers.length === 0 ? (
                  <p className="text-center text-[10px] text-gray-505 py-6 uppercase font-bold">No customers match...</p>
                ) : (
                  broadcastTargetedCustomers.map((user) => {
                    const isAlreadySent = sentBroadcastPhones.includes(user.phone);
                    return (
                      <div key={user.phone} className={`flex justify-between items-center p-2 rounded-xl text-xs font-bold border transition-colors ${isAlreadySent ? 'bg-green-500/[0.02] border-green-500/10' : 'bg-white/[0.01] border-white/5'}`}>
                        <div className="flex flex-col">
                          <span className={`${isAlreadySent ? 'text-gray-500' : 'text-gray-350'}`}>{user.name} (+{user.phone})</span>
                          <span className="text-[8px] text-gray-505 uppercase tracking-widest">{user.metrics.tier} • {user.points || 0} Pts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAlreadySent ? (
                            <span className="text-[9px] text-green-500 font-extrabold uppercase flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-md">
                              <Check size={10}/> Sent
                            </span>
                          ) : (
                            <span className="text-[9px] text-yellow-500 font-extrabold uppercase flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-md">
                              Unsent
                            </span>
                          )}
                          <button 
                            onClick={() => triggerWhatsAppBroadcast(user.phone)}
                            className={`font-black text-[9px] px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase transition-all ${isAlreadySent ? 'bg-white/5 text-gray-505' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                          >
                            <MessageSquare size={10}/> Send
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button type="button" onClick={() => setShowBroadcastModal(false)} className="w-full bg-white/5 text-gray-400 p-3.5 rounded-xl font-black text-xs uppercase">Close</button>
          </div>
        </div>
      )}

      {/* --- OVERLAY PRODUCT EDIT MODAL --- */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleUpdateProduct} className="bg-[#111] border-2 border-orange-500/50 p-6 rounded-[2.5rem] w-full max-w-lg relative max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <button type="button" onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 p-2.5 bg-white/5 text-gray-455 hover:text-white rounded-full"><X size={18}/></button>
            
            <div className="text-center pb-2 border-b border-white/5">
              <h3 className="text-xl font-black text-orange-500 italic uppercase">Edit Product Info</h3>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500" required>
                {categoryOptions.filter(c => c !== "All" && c !== "DIY Pizza").map(cat => (
                  <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
              <input type="url" value={editImage} onChange={(e) => setEditImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Option Type</label>
              <select value={editVariantType} onChange={(e: any) => setEditVariantType(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white focus:border-orange-500">
                <option value="none" className="bg-[#111]">None (Single Price)</option>
                <option value="half_full" className="bg-[#111]">Half / Full</option>
                <option value="plain_butter" className="bg-[#111]">Plain / Butter</option>
                <option value="pizza_sizes" className="bg-[#111]">Pizza Sizes</option>
              </select>
            </div>

            {editVariantType === 'none' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Price (₹)</label>
                <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-sm font-bold text-white" />
              </div>
            )}

            {(editVariantType === 'half_full' || editVariantType === 'plain_butter') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-455 uppercase">Half / Plain (₹)</label><input type="number" value={editHalfPrice} onChange={(e) => setEditHalfPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-455 uppercase">Full / Butter (₹)</label><input type="number" value={editFullPrice} onChange={(e) => setEditFullPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold" /></div>
              </div>
            )}

            {editVariantType === 'pizza_sizes' && (
              <div className="space-y-3 bg-[#111]/40 p-4 rounded-2xl border border-white/5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small Price</label><input type="number" value={editPriceSmall} onChange={(e) => setEditPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium Price</label><input type="number" value={editPriceMedium} onChange={(e) => setEditPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Large Price</label><input type="number" value={editPriceLarge} onChange={(e) => setEditPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Extra Large</label><input type="number" value={editPriceXL} onChange={(e) => setEditPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold text-white" /></div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Update Item</button>
              <button type="button" onClick={() => setEditingProduct(null)} className="bg-white/5 text-gray-405 p-4 rounded-xl font-black text-xs uppercase">Cancel</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
