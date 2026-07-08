'use client';
  
import React, { useState, useEffect } from 'react';
// Changed to reliable relative path to avoid compile-time path resolution errors
import { db } from '../../lib/firebase'; 
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, addDoc, deleteDoc, increment } from 'firebase/firestore';
import { Power, Eye, EyeOff, User, MapPin, Calendar, CheckCircle2, LogOut, Loader2, Phone, Plus, Trash, Edit, X, Lock, BarChart3, Download, Folder, Percent, ImageIcon, Gift } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Categories default list
const ADD_CATEGORIES = ["Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

// Dynamic Unsplash URL Builder
const imgUrl = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=300&q=80`;

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

  // 1. Session verification check (session memory locks admin securely on window close)
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

  // --- ANALYTICS METRICS CALCULATORS ---
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

  // Dynamic dropdown fallback
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

  // --- MENU ITEM ACTIONS ---
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

  // --- COMPRESSED HIGH-EFFICIENCY SEEDER ENGINE ---
  const handleBulkImport = async () => {
    if (!window.confirm("BUM BUM CAFE PDF ke saare 80+ items ko database mein add karein?")) return;
    toast.loading("Importing menu items...", { id: "import" });

    const pz = "1513104890138-7c749659a591", th = "1626777552726-4a6b54c97e46", pa = "1631452180519-c014fe946bc7";
    const vg = "1546069901-ba9599a7e63c", br = "1589301760014-d929f3979dbc", rc = "1563379091339-03b21ab4a4f8";
    const cl = "1513558161293-cdaf765ed2fd";

    // Compact list schema to prevent payload chunk limits during output
    const data = [
      { n: "Special Tea (स्पेशल चाय)", c: "Fast Food", p: 15, i: "1544787219-7f47ccb76574" },
      { n: "Black Tea (काली चाय)", c: "Fast Food", p: 20, i: "1508888620463-70b53b8004c3" },
      { n: "Special Coffee (स्पेशल कॉफी)", c: "Fast Food", p: 20, i: "1514432324607-a09d9b4aefdd" },
      { n: "Black Coffee (काली कॉफी)", c: "Fast Food", p: 25, i: "1497515114629-f71d768fd07c" },
      { n: "Mix Veg Maggie (मिक्स वेज मैगी)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: "1569718212165-3a8278d5f624" },
      { n: "Pasta (पास्ता)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: rc },
      { n: "Finger Chips (फिंगर चिप्स)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: "1573080496219-bb080dd4f877" },
      { n: "Momos (मोमोस्)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: "1534422298391-e4f8c172dddb" },
      { n: "Bombe Bhel (बॉम्बे भेल)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: br },
      { n: "Indori Poha (पोहा इंदौरी)", c: "Fast Food", p: 30, i: "1601050690597-df056fb4ce78" },
      { n: "Tikki Chaat (टिक्की चाट)", c: "Fast Food", p: 30, v: { half: 30, full: 30 }, i: "1601050690597-df056fb4ce78" },
      { n: "Kachori Chhat (कचोरी चाट)", c: "Fast Food", p: 30, v: { half: 30, full: 30 }, i: "1601050690597-df056fb4ce78" },
      { n: "Cheese Garlic Bread (चीस गालिक ब्रेड)", c: "Fast Food", p: 60, i: "1573140247632-f8fd74997d5c" },
      { n: "Burger (बर्गर)", c: "Fast Food", p: 30, i: "1568901346375-23c9450c58cd" },
      { n: "Cheese Burger (चीस बर्गर)", c: "Fast Food", p: 40, i: "1521305916504-4a1121188589" },
      { n: "Paneer Sandwich (पनीर सैंडविच)", c: "Fast Food", p: 80, i: "1528735602780-2552fd46c7af" },
      { n: "Veg Cheese Sandwich (वेज चीस सैंडविच)", c: "Fast Food", p: 60, i: "1528735602780-2552fd46c7af" },
      { n: "Veg Spring Roll (वेज स्प्रिंग रोल)", c: "Fast Food", p: 50, i: "1541532713592-79a0317b6b77" },
      { n: "Manchuriyan (मंचुरियन)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: "1512058564366-18510be2db19" },
      { n: "Manchuriyan Rice (मंचुरियन फ्राय राइस)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: "1512058564366-18510be2db19" },
      { n: "Chawmeen (चाउमीन)", c: "Fast Food", p: 30, v: { half: 30, full: 50 }, i: "1585032226651-759b368d7246" },
      { n: "Chines Samosa (चायनीस समोसा)", c: "Fast Food", p: 30, i: "1601050690597-df056fb4ce78" },
      { n: "Masala Dosa (मसाला डोसा)", c: "Fast Food", p: 30, i: br },
      { n: "Masala Uttapam (मसाला उत्तपम्)", c: "Fast Food", p: 50, i: br },
      { n: "Cold Coffee (कोल्ड कॉफी)", c: "Super Cool", p: 50, i: "1517701604599-bb29b565090c" },
      { n: "Chocolatey Cold Coffee", c: "Super Cool", p: 60, i: "1541167760496-1628856ab772" },
      { n: "Mango Shake (मैगो शेक)", c: "Super Cool", p: 60, i: "1571006831117-f582da1551a3" },
      { n: "Black Currant (ब्लैक करंट)", c: "Super Cool", p: 60, i: "1571006831117-f582da1551a3" },
      { n: "Blueberry Shake (ब्लूवेरी शेक)", c: "Super Cool", p: 60, i: "1571006831117-f582da1551a3" },
      { n: "Strawberry Shake (स्ट्रोवेरी शेक)", c: "Super Cool", p: 60, i: "1571006831117-f582da1551a3" },
      { n: "Chocolate Shake (चॉकलेट शेक)", c: "Super Cool", p: 70, i: "1571006831117-f582da1551a3" },
      { n: "Virgin Mojito (वर्जिन मोजिटो)", c: "Super Cool", p: 60, i: cl },
      { n: "Blue Lagoon (ब्लू लैगून)", c: "Super Cool", p: 90, i: cl },
      { n: "Spiced Jaljeera (जलजीरा)", c: "Super Cool", p: 50, i: cl },
      { n: "Kala Khatta Fizz (काला खट्टा)", c: "Super Cool", p: 60, i: cl },
      { n: "Cold Drinks (कोल्ड ड्रिंक्स)", c: "Super Cool", p: 30, i: cl },
      { n: "Bottled Water (बोतलबंद पानी)", c: "Super Cool", p: 20, i: cl },
      { n: "Special Lassi (स्पेशल लस्सी)", c: "Super Cool", p: 30, i: cl },
      { n: "Flavored Lassi (फ्लेवर्ड लस्सी)", c: "Super Cool", p: 40, i: cl },
      { n: "Fruits Lassi (ड्राईफ्रूट लस्सी)", c: "Super Cool", p: 50, i: cl },
      { n: "Cheese Corn Pizza", c: "Special Pizza", p: 80, v: { Small: 80, Medium: 110, Large: 140, "Extra Large": 180 }, i: pz },
      { n: "Cheese Onion Pizza", c: "Special Pizza", p: 80, v: { Small: 80, Medium: 110, Large: 140, "Extra Large": 180 }, i: pz },
      { n: "Cheese Capsicum Pizza", c: "Special Pizza", p: 80, v: { Small: 80, Medium: 110, Large: 140, "Extra Large": 180 }, i: pz },
      { n: "Mix Veg Cheese Pizza", c: "Special Pizza", p: 90, v: { Small: 90, Medium: 120, Large: 160, "Extra Large": 200 }, i: pz },
      { n: "Mix Veg Paneer Pizza", c: "Special Pizza", p: 100, v: { Small: 100, Medium: 140, Large: 180, "Extra Large": 250 }, i: pz },
      { n: "Paneer Makhani Pizza", c: "Special Pizza", p: 140, v: { Medium: 140, Large: 180 }, i: pz },
      { n: "Super Deluxe Pizza", c: "Special Pizza", p: 180, v: { Medium: 180, Large: 200 }, i: pz },
      { n: "Farmhouse Pizza", c: "Special Pizza", p: 320, v: { Medium: 320, Large: 350 }, i: pz },
      { n: "Tandoori Paneer Pizza", c: "Special Pizza", p: 280, v: { Medium: 280, Large: 300 }, i: pz },
      { n: "Bum Bum Cafe Special Pizza", c: "Special Pizza", p: 200, v: { Medium: 200, Large: 250 }, i: pz },
      { n: "Bum Bum Cafe Special Thali Fix", c: "Special Thali", p: 200, i: th },
      { n: "Bum Bum Cafe Mini Thali Fix", c: "Special Thali", p: 170, i: th },
      { n: "Special Thali Fix", c: "Special Thali", p: 90, i: th },
      { n: "Special Desi Thali Fix", c: "Special Thali", p: 100, i: th },
      { n: "Desi Dal Rice Papad Combo", c: "Special Thali", p: 60, i: th },
      { n: "Jeera Rice, Dal Fry Combo", c: "Special Thali", p: 110, i: th },
      { n: "Special Khichdi - Dahi Combo", c: "Special Thali", p: 90, i: th },
      { n: "Sukhi Bhaji Puri Combo", c: "Special Thali", p: 70, i: th },
      { n: "Chole Bhature (छोले भटूरे)", c: "Special Thali", p: 60, i: th },
      { n: "Sabudana Khichdi - Dahi Combo", c: "Special Thali", p: 60, i: th },
      { n: "Sabudana Bada - Dahi Combo", c: "Special Thali", p: 60, i: th },
      { n: "4-Thepla, Curd, Pickle Combo", c: "Special Thali", p: 80, i: th },
      { n: "Paneer Tikka Masala", c: "Paneer Special", p: 100, v: { half: 100, full: 150 }, i: pa },
      { n: "Paneer Butter Masala", c: "Paneer Special", p: 110, v: { half: 110, full: 160 }, i: pa },
      { n: "Paneer Kadhai Masala", c: "Paneer Special", p: 100, v: { half: 100, full: 150 }, i: pa },
      { n: "Paneer Tufani", c: "Paneer Special", p: 100, v: { half: 100, full: 150 }, i: pa },
      { n: "Mutter Paneer Masala", c: "Paneer Special", p: 100, v: { half: 100, full: 150 }, i: pa },
      { n: "Shahi Paneer Masala", c: "Paneer Special", p: 120, v: { half: 120, full: 170 }, i: pa },
      { n: "Kaju Paneer Masala", c: "Paneer Special", p: 140, v: { half: 140, full: 200 }, i: pa },
      { n: "Palak Paneer", c: "Paneer Special", p: 110, v: { half: 110, full: 160 }, i: pa },
      { n: "Mix Veg Masala", c: "Special Mix veg", p: 90, v: { half: 90, full: 130 }, i: vg },
      { n: "Veg Tufani", c: "Special Mix veg", p: 90, v: { half: 90, full: 130 }, i: vg },
      { n: "Veg Kadhai", c: "Special Mix veg", p: 80, v: { half: 80, full: 120 }, i: vg },
      { n: "Alo Gobhi Mutter", c: "Special Mix veg", p: 70, v: { half: 70, full: 110 }, i: vg },
      { n: "Sev Tomato", c: "Special Mix veg", p: 70, v: { half: 70, full: 110 }, i: vg },
      { n: "Sev Bhaji", c: "Special Mix veg", p: 80, v: { half: 80, full: 130 }, i: vg },
      { n: "Kaju Gathiya", c: "Special Mix veg", p: 100, v: { half: 100, full: 150 }, i: vg },
      { n: "Jwadi Dhokli", c: "Special Mix veg", p: 80, v: { half: 80, full: 140 }, i: vg },
      { n: "Baigan Bharta", c: "Special Mix veg", p: 70, v: { half: 70, full: 100 }, i: vg },
      { n: "Dal Fry", c: "Special Mix veg", p: 60, v: { half: 60, full: 90 }, i: vg },
      { n: "Dal Tadka", c: "Special Mix veg", p: 80, v: { half: 80, full: 120 }, i: vg },
      { n: "Phulka Roti", c: "Indian Bread", p: 10, v: { Plain: 10, Butter: 10 }, i: br },
      { n: "Tawa Paratha", c: "Indian Bread", p: 15, v: { Plain: 15, Butter: 20 }, i: br },
      { n: "Lachha Paratha", c: "Indian Bread", p: 25, v: { Plain: 25, Butter: 30 }, i: br },
      { n: "Thepla/Methi Paratha", c: "Indian Bread", p: 15, v: { Plain: 15, Butter: 20 }, i: br },
      { n: "Roti Tandoor", c: "Indian Bread", p: 15, v: { Plain: 15, Butter: 20 }, i: br },
      { n: "Naan Tandoor", c: "Indian Bread", p: 25, v: { Plain: 25, Butter: 30 }, i: br },
      { n: "Aloo Paratha", c: "Indian Bread", p: 30, v: { Plain: 30, Butter: 40 }, i: br },
      { n: "Aloo Gobhi Paratha", c: "Indian Bread", p: 30, v: { Plain: 30, Butter: 40 }, i: br },
      { n: "Cheese Onion Garlic", c: "Indian Bread", p: 50, v: { Plain: 50, Butter: 60 }, i: br },
      { n: "Paneer Paratha", c: "Indian Bread", p: 50, v: { Plain: 50, Butter: 60 }, i: br },
      { n: "Rosted Papad", c: "Indian Bread", p: 10, i: br },
      { n: "Masala Papad", c: "Indian Bread", p: 20, i: br },
      { n: "Fry Papad", c: "Indian Bread", p: 15, i: br },
      { n: "Plain Rice (सादा चावल)", c: "Special Rice", p: 50, v: { half: 50, full: 70 }, i: rc },
      { n: "Jeera Rice (जीरा राइस)", c: "Special Rice", p: 70, v: { half: 70, full: 100 }, i: rc },
      { n: "Veg Pulao (वेज पुलाव)", c: "Special Rice", p: 100, v: { half: 100, full: 120 }, i: rc },
      { n: "Veg Biryani (वेज बिरयानी)", c: "Special Rice", p: 110, v: { half: 110, full: 130 }, i: rc },
      { n: "Masala Rice (मसाला राइस)", c: "Special Rice", p: 80, v: { half: 80, full: 110 }, i: rc }
    ];

    try {
      for (const item of data) {
        await addDoc(collection(db, "products"), {
          name: item.n,
          category: item.c,
          price: item.p,
          image: item.i.length < 20 ? imgUrl(item.i) : item.i,
          variants: item.v || null,
          isVisible: true
        });
      }
      toast.dismiss("import");
      toast.success("All 80+ PDF menu items imported successfully!");
    } catch (e) {
      toast.dismiss("import");
      toast.error("Error seeding PDF items");
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

      {/* --- HORIZONTAL TABS --- */}
      <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        <button onClick={() => setTab('dashboard')} className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${tab === 'dashboard' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}>📊 Dashboard</button>
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
              <button onClick={handleExportOrders} className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md">
                <Download size={14}/> Sales Ledger Excel
              </button>
              <button onClick={handleExportCustomers} className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md">
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
                  <select value={o.status || 'pending'} onChange={async (e) => {
                    try {
                      await updateDoc(doc(db, "orders", o.id), { status: e.target.value });
                      toast.success("Order status updated!");
                    } catch (err) { toast.error("Error updating status"); }
                  }} className="bg-black/60 border border-white/10 text-xs font-bold rounded-xl p-2 px-3 text-white outline-none cursor-pointer">
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
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label><input type="number" placeholder="Price" value={editFullPrice} onChange={(e) => setEditFullPrice(e.target.value)} className="w-full bg-[#111]/30 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                  </div>
                )}

                {editVariantType === 'pizza_sizes' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Small Price (₹)</label><input type="number" placeholder="Small price" value={editPriceSmall} onChange={(e) => setEditPriceSmall(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Medium Price (₹)</label><input type="number" placeholder="Medium price" value={editPriceMedium} onChange={(e) => setEditPriceMedium(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Large Price (₹)</label><input type="number" placeholder="Large price" value={editPriceLarge} onChange={(e) => setEditPriceLarge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 uppercase">Extra Large Price (₹)</label><input type="number" placeholder="XL price" value={editPriceXL} onChange={(e) => setEditPriceXL(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" /></div>
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
                      
                      {/* --- CORECTED ITEM HIDE UNHIDE TOGGLE (Eye/EyeOff) --- */}
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
