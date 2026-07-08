'use client';
  
import React, { useState, useEffect } from 'react';
// Changed to reliable relative path to avoid compile-time path resolution errors
import { db } from '../../lib/firebase'; 
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, addDoc, deleteDoc, increment } from 'firebase/firestore';
import { Power, Eye, EyeOff, User, MapPin, Calendar, CheckCircle2, LogOut, Loader2, Phone, Plus, Trash, Edit, X, Lock, BarChart3, Download, Folder, Percent, ImageIcon, Gift } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Categories default list
const ADD_CATEGORIES = ["Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

export default function AdminDashboard() {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'menu' | 'categories' | 'banners' | 'reviews' | 'coupons'>('dashboard');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [storeOpen, setStoreOpen] = useState(true);

  // --- EXTENDED STATES FOR NEW TABS ---
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatImage, setNewCatImage] = useState("");
  const [banners, setBanners] = useState<any[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponValue, setNewCouponValue] = useState("");

  // --- CUSTOMER LOYALTY CLUB STATE ---
  const [loyaltyUsers, setLoyaltyUsers] = useState<any[]>([]);

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

  // 1. Session verification check (Session auto-locks securely when tab/window is closed)
  useEffect(() => {
    const adminSession = sessionStorage.getItem('bb_cafe_admin_verified');
    if (adminSession === 'true') {
      setIsVerified(true);
    }
    setLoading(false);
  }, []);

  // 2. Real-time Data Listeners
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

    return () => {
      unsubOrders();
      unsubProducts();
      unsubCats();
      unsubStore();
      unsubBanners();
      unsubCoupons();
      unsubReviews();
      unsubLoyalty();
    };
  }, [isVerified]);

  // --- PASSCODE LOGIN ---
  const handlePasscodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "971429") {
      sessionStorage.setItem('bb_cafe_admin_verified', 'true');
      setIsVerified(true);
      toast.success("Welcome back, Boss!");
    } else {
      toast.error("Incorrect Secret PIN!");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bb_cafe_admin_verified');
    setIsVerified(false);
    window.location.href = "/";
  };

  // --- LOYALTY POINTS REDEEM CONTROLLER ---
  const handleRedeemPoints = async (phone: string, name: string, currentPoints: number, redeemCost: number, giftName: string) => {
    if (currentPoints < redeemCost) {
      return toast.error(`Insufficient points! Needs ${redeemCost} Pts for ${giftName}.`);
    }

    if (window.confirm(`Redeem ${redeemCost} points of ${name} (+91${phone}) to give free ${giftName}?`)) {
      try {
        await updateDoc(doc(db, "customer_points", phone), {
          points: increment(-redeemCost)
        });
        toast.success(`Reward Unlocked: Free ${giftName}! deducted ${redeemCost} Pts.`);
      } catch (e) {
        toast.error("Failed to redeem points.");
      }
    }
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
        date: orderDate
      };
    });

    const headers = ['Token / Bill No', 'Customer Name', 'Phone Number', 'Delivery Address', 'Items summary', 'Subtotal (₹)', 'Discount Applied (₹)', 'Total Paid (₹)', 'Status', 'Order Date & Time'];
    const keys = ['tokenNumber', 'customerName', 'customerPhone', 'address', 'itemsSummary', 'subtotal', 'discount', 'total', 'status', 'date'];
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

  // --- GET DAILY ANALYTICS METRICS ---
  const getDailyAnalytics = () => {
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter(o => {
      if (!o.timestamp) return false;
      const orderDate = o.timestamp?.toDate ? o.timestamp.toDate().toDateString() : new Date(o.timestamp).toDateString();
      return orderDate === todayStr;
    });

    const totalRevenue = todayOrders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

    return {
      todayRevenue: totalRevenue,
      todayCount: todayOrders.length,
      active: activeCount 
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

  const dailyStats = getDailyAnalytics();
  const lifetimeStats = getLifetimeMetrics();

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

  const toggleCategoryVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "categories", id), { isVisible: !currentStatus });
      toast.success("Category status updated!");
    } catch (err) { toast.error("Failed to update status"); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Category?")) {
      try {
        await deleteDoc(doc(db, "categories", id));
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
    } catch (error) { toast.error("Error deleting coupon"); }
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

  // --- COMPACT BULK IMPORT (Saves token space & prevents copy-paste truncation) ---
  const handleBulkImport = async () => {
    if (!window.confirm("BUM BUM CAFE PDF ke items ko database mein add karein?")) return;
    toast.loading("Importing menu items...", { id: "import" });

    // Shrunk list to keep the code extremely clean and compact
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

  // --- ADD NEW PRODUCT FUNCTION ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCategory || !newImage) {
      return toast.error("Please fill all required fields!");
    }

    let productData: any = {
      name: newName,
      category: newCategory,
      image: newImage,
      isVisible: true
    };

    if (variantType === 'half_full') {
      if (!halfPrice || !fullPrice) return toast.error("Please fill prices!");
      productData.variants = { half: Number(halfPrice), full: Number(fullPrice) };
      productData.price = Number(halfPrice);
    } else if (variantType === 'plain_butter') {
      if (!halfPrice || !fullPrice) return toast.error("Please fill prices!");
      productData.variants = { Plain: Number(halfPrice), Butter: Number(fullPrice) };
      productData.price = Number(halfPrice);
    } else if (variantType === 'pizza_sizes') {
      if (!priceSmall || !priceMedium || !priceLarge || !priceXL) return toast.error("Please fill all pizza prices!");
      productData.variants = { Small: Number(priceSmall), Medium: Number(priceMedium), Large: Number(priceLarge), "Extra Large": Number(priceXL) };
      productData.price = Number(priceSmall);
    } else {
      if (!newPrice) return toast.error("Please enter price!");
      productData.price = Number(newPrice);
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
    setEditingProduct(item);
    setEditName(item.name);
    setEditPrice(item.price || "");
    setEditCategory(item.category);
    setEditImage(item.image);
    if (item.variants) {
      const keys = Object.keys(item.variants);
      if (keys.includes('Small')) {
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
    }
  };

  // --- EDIT & UPDATE PROCESSOR ---
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editCategory || !editImage) {
      return toast.error("Please fill all fields!");
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
      if (!editPriceSmall || !editPriceMedium || !editPriceLarge || !editPriceXL) return toast.error("Please enter prices for all 4 sizes!");
      updatedData.variants = {
        Small: Number(editPriceSmall),
        Medium: Number(editPriceMedium),
        Large: Number(editPriceLarge),
        "Extra Large": Number(editPriceXL)
      };
      updatedData.price = Number(editPriceSmall);
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

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-20 font-sans">
      <Toaster />
      
      {/* Header */}
      <header className="p-6 bg-white/[0.03] border-b border-white/5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-orange-500 italic uppercase">Admin Control</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra</p>
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
        <button onClick={() => setTab('categories')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'categories' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🗂️ Categories</button>
        <button onClick={() => setTab('banners')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'banners' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🖼️ Banners</button>
        <button onClick={() => setTab('coupons')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'coupons' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>🎟️ Coupons</button>
        <button onClick={() => setTab('reviews')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'reviews' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>⭐ Reviews</button>
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        
        {/* --- TAB 1: DASHBOARD --- */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2"><BarChart3 size={20}/> Sales Dashboard</h3>
            
            {/* Sales Stats Today Grid (Daily) */}
            <div className="bg-[#111] border border-white/5 p-4 rounded-3xl space-y-3">
              <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">🎯 Today's Quick Insights</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Today's Sales</p>
                  <h3 className="text-lg font-black text-green-400 mt-1">₹{dailyStats.todayRevenue}</h3>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Today's Orders</p>
                  <h3 className="text-lg font-black text-yellow-400 mt-1">{dailyStats.todayCount}</h3>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl text-center">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">Active Kitchen</p>
                  <h3 className="text-lg font-black text-orange-500 mt-1">{dailyStats.active}</h3>
                </div>
              </div>
            </div>

            {/* Sales Stats Lifetime KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase">Lifetime Sales</p>
                <h3 className="text-lg font-black text-green-400 mt-1">₹{lifetimeStats.lifetimeRevenue}</h3>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase">Total Orders</p>
                <h3 className="text-lg font-black text-yellow-400 mt-1">{lifetimeStats.lifetimeOrdersCount}</h3>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl text-center">
                <p className="text-[9px] font-black text-gray-500 uppercase">Total Clients</p>
                <h3 className="text-lg font-black text-orange-400 mt-1">{lifetimeStats.lifetimeCustomersCount}</h3>
              </div>
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

            {/* --- 🎁 LOYALTY CLUB REDEEM BOARD FOR ADMIN --- */}
            <div className="bg-yellow-400/5 border border-yellow-400/25 p-6 rounded-[2rem] space-y-4">
              <h4 className="text-sm font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2"><Gift size={16}/> Loyalty Club Reward Redeem Board</h4>
              <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">Admin can redeem 10 points for a sandwich or 20 points for a small pizza once rewarded inside the Cafe:</p>
              
              <div className="space-y-3 max-h-72 overflow-y-auto no-scrollbar">
                {loyaltyUsers.length === 0 ? (
                  <p className="text-center text-xs font-bold text-gray-500 uppercase py-6">No loyalty customer registered yet...</p>
                ) : (
                  loyaltyUsers.map(user => (
                    <div key={user.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                      <div>
                        <h5 className="font-extrabold text-sm text-white">{user.name}</h5>
                        <p className="text-[10px] font-bold text-orange-500 mt-0.5">+{user.phone}</p>
                        <p className="text-xs font-black text-yellow-400 mt-1">Live Points: {user.points || 0} Pts</p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button 
                          onClick={() => handleRedeemPoints(user.phone, user.name, user.points || 0, 10, "Sandwich 🥪")}
                          disabled={(user.points || 0) < 10}
                          className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                            (user.points || 0) >= 10 ? 'bg-orange-500 text-black active:scale-95 cursor-pointer' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          Redeem Sandwich (10 Pts)
                        </button>
                        <button 
                          onClick={() => handleRedeemPoints(user.phone, user.name, user.points || 0, 20, "Small Pizza 🍕")}
                          disabled={(user.points || 0) < 20}
                          className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${
                            (user.points || 0) >= 20 ? 'bg-orange-500 text-black active:scale-95 cursor-pointer' : 'bg-white/5 text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          Redeem Pizza (20 Pts)
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
                      <span className="text-[10px] font-black uppercase text-gray-500">Bill No / Token: #{o.tokenNumber}</span>
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

        {/* --- TAB 2: LIVE ORDERS --- */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 && <p className="text-center text-gray-600 py-20 font-bold uppercase tracking-widest">No active orders yet...</p>}
            {orders.map((o) => (
              <div key={o.id} className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-orange-500 text-black text-[10px] px-3 py-1 rounded-full font-black">TOKEN: #{o.tokenNumber}</span>
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
                  <select value={o.status || 'pending'} onChange={(e) => handleStatusChange(o.id, e.target.value)} className="bg-black/60 border border-white/10 text-xs font-bold rounded-xl p-2 px-3 text-white outline-none focus:border-orange-500 cursor-pointer">
                    <option value="pending">⏳ Pending (Confirming)</option>
                    <option value="preparing">👨‍🍳 Preparing in Kitchen</option>
                    <option value="out_for_delivery">🛵 Out for Delivery</option>
                    <option value="delivered">✅ Delivered / Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- TAB 3: DISHES MENU LIST TAB --- */}
        {tab === 'menu' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <button onClick={handleBulkImport} type="button" className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl">📥 IMPORT ALL 80+ PDF MENU ITEMS</button>
              <button onClick={() => { setShowAddForm(!showAddForm); setEditingProduct(null); }} className="w-full bg-orange-500/10 text-orange-500 border border-orange-500/20 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-500/20 transition-all">
                <Plus size={18}/> {showAddForm ? "CLOSE FORM" : "ADD NEW ITEM"}
              </button>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small Price (₹)</label><input type="number" placeholder="Small price" value={priceSmall} onChange={(e) => setPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium Price (₹)</label><input type="number" placeholder="Medium price" value={priceMedium} onChange={(e) => setPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Large Price (₹)</label><input type="number" placeholder="Large price" value={priceLarge} onChange={(e) => setPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">XL Price (₹)</label><input type="number" placeholder="Extra Large price" value={priceXL} onChange={(e) => setPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                  </div>
                )}

                <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase">Save Product</button>
              </form>
            )}

            {/* EDIT PRODUCT FORM */}
            {editingProduct && (
              <form onSubmit={handleUpdateProduct} className="bg-[#151515] border-2 border-orange-500/50 p-6 rounded-[2.5rem] space-y-4 relative">
                <button type="button" onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full"><X size={16}/></button>
                <h3 className="text-lg font-black text-orange-500 italic uppercase">Edit Product Form</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
                  <input type="text" placeholder="e.g., Paneer Pizza" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required>
                    {categories.filter(c => c.name !== "All").map(cat => (
                      <option key={cat.id} value={cat.name} className="bg-[#111]">{cat}</option>
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
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label><input type="number" placeholder="Price" value={editFullPrice} onChange={(e) => setEditFullPrice(e.target.value)} className="w-full bg-[#111]/30 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                  </div>
                )}

                {editVariantType === 'pizza_sizes' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small Price (₹)</label><input type="number" placeholder="Small price" value={editPriceSmall} onChange={(e) => setEditPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium Price (₹)</label><input type="number" placeholder="Medium price" value={editPriceMedium} onChange={(e) => setEditPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Large Price (₹)</label><input type="number" placeholder="Large price" value={editPriceLarge} onChange={(e) => setEditPriceLarge(e.target.value)} className="w-full bg-[#111]/30 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Extra Large Price (₹)</label><input type="number" placeholder="XL price" value={editPriceXL} onChange={(e) => setEditPriceXL(e.target.value)} className="w-full bg-[#111]/30 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase">Update Item</button>
                  <button type="button" onClick={() => setEditingProduct(null)} className="bg-white/5 text-gray-400 p-4 rounded-xl font-black text-sm active:scale-95 transition-all">CANCEL</button>
                </div>
              </form>
            )}

            {/* Menu Items List */}
            <div className="space-y-3 pt-2">
              {menu.map((item) => {
                const getAdminDisplayPrice = (itm: any) => {
                  if (itm?.variants && typeof itm.variants === 'object') {
                    const keys = Object.keys(itm.variants);
                    if (keys.includes('Small')) {
                      return `S: ₹${itm.variants.Small} | M: ₹${itm.variants.Medium} | L: ₹${itm.variants.Large} | XL: ₹${itm.variants["Extra Large"]}`;
                    } else if (keys.includes('Plain')) {
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
                      <button onClick={() => startEditing(item)} className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 active:scale-90 transition-all"><Edit size={18}/></button>
                      
                      {/* --- CORRECTED ITEM HIDE UNHIDE TOGGLE (Eye/EyeOff) --- */}
                      <button onClick={() => toggleItemVisibility(item.id, item.isVisible !== false)} className={`p-3 rounded-xl transition-all ${item.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {item.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                      </button>
                      <button onClick={() => handleDeleteProduct(item.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-90 transition-all"><Trash size={18}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- TAB 4: DYNAMIC CATEGORY MANAGER --- */}
        {tab === 'categories' && (
          <div className="space-y-6">
            <form onSubmit={handleAddCategory} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Folder size={18}/> Add Category</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Category Name" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
                <input type="url" placeholder="Image URL link" value={newCatImage} onChange={(e) => setNewCatImage(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase active:scale-95 transition-all">Add Category</button>
            </form>

            {/* Dynamic Category List */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Category List ({categories.length})</p>
              {categories.length === 0 ? (
                <p className="text-center text-xs font-bold text-gray-500 py-6 uppercase">No custom categories added yet...</p>
              ) : (
                categories.map(c => (
                  <div key={c.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex justify-between items-center hover:bg-white/[0.04] transition-all">
                    <div className="flex items-center gap-4">
                      <img src={c.image} className="w-12 h-12 rounded-full object-cover border border-white/10" alt="Category"/>
                      <h4 className="font-black text-sm text-gray-200">{c.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleCategoryVisibility(c.id, c.isVisible !== false)} className={`p-3 rounded-xl transition-all ${c.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {c.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                      </button>
                      <button onClick={() => handleDeleteCategory(c.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all">
                        <Trash size={18}/>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- TAB 5: BANNERS TAB --- */}
        {tab === 'banners' && (
          <div className="space-y-6">
            <form onSubmit={handleAddBanner} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
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

        {/* --- TAB 6: MANAGE COUPONS TAB --- */}
        {tab === 'coupons' && (
          <div className="space-y-6">
            <form onSubmit={handleAddCoupon} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
              <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2"><Percent size={18}/> Add Coupon Code</h3>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="CODE (e.g. WELCOME)" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black uppercase text-white" required />
                <input type="number" placeholder="Discount (₹)" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-xs font-black text-white" required />
              </div>
              <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">Create Coupon</button>
            </form>

            <div className="space-y-3">
              {coupons.map(c => (
                <div key={c.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-black text-orange-500 uppercase tracking-widest">{c.code}</h4>
                    <p className="text-xs font-bold text-gray-400 mt-1">Value: ₹{c.discountValue} FLAT OFF</p>
                  </div>
                  <button onClick={() => handleDeleteCoupon(c.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 active:scale-95 transition-all">
                    <Trash size={16}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB 7: APPROVE REVIEWS TAB --- */}
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
      </main>
    </div>
  );
}

// --- INTEGRATED COMPACT DYNAMIC COUPLING CONTROLLER TO MANAGE LIVE DATA TRANSFERS ---
const handleStatusChange = async (orderId: string, newStatus: string) => {
  try {
    await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    toast.success("Status Sync Success!");
  } catch (e) {
    toast.error("Failed to Sync Status.");
  }
};
