'use client';
  
import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; // Ensure your path is correct (@/lib/firebase or ../../lib/firebase)
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Power, Eye, EyeOff, User, MapPin, Calendar, CheckCircle2, LogOut, Loader2, Phone, Plus, Trash, Edit, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Categories mapping
const ADD_CATEGORIES = ["Special Pizza", "Special Thali", "Paneer Special", "Special Mix veg", "Fast Food", "Super Cool", "Indian Bread", "Special Rice"];

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [storeOpen, setStoreOpen] = useState(true);

  // --- ADD PRODUCT STATES ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Special Pizza");
  const [newImage, setNewImage] = useState("");
  const [isVariant, setIsVariant] = useState(false);
  const [halfPrice, setHalfPrice] = useState("");
  const [fullPrice, setFullPrice] = useState("");

  // --- EDIT PRODUCT STATES ---
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editIsVariant, setEditIsVariant] = useState(false);
  const [editHalfPrice, setEditHalfPrice] = useState("");
  const [editFullPrice, setEditFullPrice] = useState("");

  // 1. Auth & Admin Check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.phoneNumber === '+919714293759') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Data Listeners
  useEffect(() => {
    if (!isAdmin) return;

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

    // Listen for Store Status
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) setStoreOpen(d.data().isOpen);
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubStore();
    };
  }, [isAdmin]);

  // 3. Actions
  const toggleItemVisibility = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "products", id), { isVisible: !currentStatus });
      toast.success("Visibility Updated");
    } catch (e) { toast.error("Error updating product"); }
  };

  const toggleStore = async () => {
    try {
      await setDoc(doc(db, "settings", "store"), { isOpen: !storeOpen });
      toast.success(storeOpen ? "Cafe is now OFFLINE" : "Cafe is now ONLINE");
    } catch (e) { toast.error("Error toggling store"); }
  };

  const handleLogout = () => {
    signOut(auth);
    window.location.href = "/";
  };

  // --- ADD NEW PRODUCT ---
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

    if (isVariant) {
      if (!halfPrice || !fullPrice) {
        return toast.error("Please enter prices for both Half and Full!");
      }
      if (newCategory === "Indian Bread") {
        productData.variants = { Plain: Number(halfPrice), Butter: Number(fullPrice) };
      } else {
        productData.variants = { half: Number(halfPrice), full: Number(fullPrice) };
      }
      productData.price = Number(halfPrice);
    } else {
      if (!newPrice) {
        return toast.error("Please enter item price!");
      }
      productData.price = Number(newPrice);
    }

    try {
      await addDoc(collection(db, "products"), productData);
      toast.success("New Item Added!");
      setNewName(""); setNewPrice(""); setNewImage(""); setNewCategory("Special Pizza"); setHalfPrice(""); setFullPrice(""); setIsVariant(false); setShowAddForm(false);
    } catch (error) {
      toast.error("Error adding product");
    }
  };

  // --- EDIT PRODUCT LOGIC ---
  const startEditing = (item: any) => {
    setEditingProduct(item);
    setEditName(item.name);
    setEditPrice(item.price || "");
    setEditCategory(item.category);
    setEditImage(item.image);
    if (item.variants) {
      setEditIsVariant(true);
      setEditHalfPrice(item.variants.half || item.variants.Plain || "");
      setEditFullPrice(item.variants.full || item.variants.Butter || "");
    } else {
      setEditIsVariant(false);
      setEditHalfPrice("");
      setEditFullPrice("");
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName || !editCategory || !editImage) {
      return toast.error("Please fill all required fields!");
    }

    let updatedData: any = {
      name: editName,
      category: editCategory,
      image: editImage
    };

    if (editIsVariant) {
      if (!editHalfPrice || !editFullPrice) {
        return toast.error("Please enter both variant prices!");
      }
      if (editCategory === "Indian Bread") {
        updatedData.variants = { Plain: Number(editHalfPrice), Butter: Number(editFullPrice) };
      } else {
        updatedData.variants = { half: Number(editHalfPrice), full: Number(editFullPrice) };
      }
      updatedData.price = Number(editHalfPrice);
    } else {
      if (!editPrice) {
        return toast.error("Please enter a price!");
      }
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

  // --- DELETE PRODUCT ---
  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Delete this product permanently?")) {
      try {
        await deleteDoc(doc(db, "products", id));
        toast.success("Product Deleted permanently!");
      } catch (error) {
        toast.error("Error deleting product");
      }
    }
  };

  // --- BULK PDF IMPORT (SEED DATA) ---
  const handleBulkImport = async () => {
    if (!window.confirm("BUM BUM CAFE PDF ke saare 80+ items ko database mein add karein?")) return;
    
    toast.loading("Importing all menu items...", { id: "import" });

    // Menu list compiled perfectly from your PDF
    const defaultMenu = [
      // Page 2: Fast Food / Hot Drinks
      { name: "Special Tea (स्पेशल चाय)", category: "Fast Food", price: 15, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Black Tea (काली चाय)", category: "Fast Food", price: 20, image: "https://images.unsplash.com/photo-1508888620463-70b53b8004c3?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Special Coffee (स्पेशल कॉफी)", category: "Fast Food", price: 20, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Black Coffee (काली कॉफी)", category: "Fast Food", price: 25, image: "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Mix Veg Maggie (मिक्स वेज मैगी)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Pasta (पास्ता)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Finger Chips (फिंगर चिप्स)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Momos (मोमोस्)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Bombe Bhel (बॉम्बे भेल)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Indori Poha (पोहा इंदौरी)", category: "Fast Food", price: 30, image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Tikki Chaat (टिक्की चाट)", category: "Fast Food", price: 30, variants: { half: 30, full: 30 }, image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Kachori Chhat (कचोरी चाट)", category: "Fast Food", price: 30, variants: { half: 30, full: 30 }, image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cheese Garlic Bread (चीस गालिक ब्रेड)", category: "Fast Food", price: 60, image: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Burger (बर्गर)", category: "Fast Food", price: 30, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cheese Burger (चीस बर्गर)", category: "Fast Food", price: 40, image: "https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Paneer Sandwich (पनीर सैंडविच)", category: "Fast Food", price: 80, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Veg Cheese Sandwich (वेज चीस सैंडविच)", category: "Fast Food", price: 60, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Veg Spring Roll (वेज स्प्रिंग रोल)", category: "Fast Food", price: 50, image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Manchuriyan (मंचुरियन)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Manchuriyan Rice (मंचुरियन फ्राय राइस)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Chawmeen (चाउमीन)", category: "Fast Food", price: 30, variants: { half: 30, full: 50 }, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Chines Samosa (चायनीस समोसा)", category: "Fast Food", price: 30, image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Masala Dosa (मसाला डोसा)", category: "Fast Food", price: 30, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Masala Uttapam (मसाला उत्तपम्)", category: "Fast Food", price: 50, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },

      // Page 3: Cool Cool Drinks
      { name: "Cold Coffee (कोल्ड कॉफी)", category: "Super Cool", price: 50, image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Chocolatey Cold Coffee", category: "Super Cool", price: 60, image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Mango Shake (मैगो शेक)", category: "Super Cool", price: 60, image: "https://images.unsplash.com/photo-1571006831117-f582da1551a3?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Black Currant (ब्लैक करंट शेक)", category: "Super Cool", price: 60, image: "https://images.unsplash.com/photo-1571006831117-f582da1551a3?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Blueberry Shake (ब्लूवेरी शेक)", category: "Super Cool", price: 60, image: "https://images.unsplash.com/photo-1571006831117-f582da1551a3?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Strawberry Shake (स्ट्रोवेरी शेक)", category: "Super Cool", price: 60, image: "https://images.unsplash.com/photo-1571006831117-f582da1551a3?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Chocolate Shake (चॉकलेट शेक)", category: "Super Cool", price: 70, image: "https://images.unsplash.com/photo-1571006831117-f582da1551a3?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Virgin Mojito (वर्जिन मोजिटो)", category: "Super Cool", price: 60, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Blue Lagoon (ब्लू लैगून)", category: "Super Cool", price: 90, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Spiced Jaljeera (जलजीरा)", category: "Super Cool", price: 50, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Kala Khatta Fizz (काला खट्टा)", category: "Super Cool", price: 60, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cold Drinks (कोल्ड ड्रिंक्स)", category: "Super Cool", price: 30, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Bottled Water (बोतलबंद पानी)", category: "Super Cool", price: 20, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Special Lassi (स्पेशल लस्सी)", category: "Super Cool", price: 30, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Flavored Lassi (फ्लेवर्ड लस्सी)", category: "Super Cool", price: 40, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Fruits Lassi (ड्राईफ्रूट लस्सी)", category: "Super Cool", price: 50, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=300&q=80", isVisible: true },

      // Page 4: Pizza
      { name: "Cheese Corn Pizza (Small)", category: "Special Pizza", price: 80, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cheese Onion Pizza (Small)", category: "Special Pizza", price: 80, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cheese Capsicum Pizza (Small)", category: "Special Pizza", price: 80, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Mix Veg Cheese Pizza (Small)", category: "Special Pizza", price: 90, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Mix Veg Paneer Pizza (Small)", category: "Special Pizza", price: 100, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cheese Corn Pizza (Medium)", category: "Special Pizza", price: 110, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Mix Veg Pizza (Medium)", category: "Special Pizza", price: 120, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Paneer Makhani Pizza (Medium)", category: "Special Pizza", price: 140, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Super Deluxe Pizza (Medium)", category: "Special Pizza", price: 180, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Farmhouse Pizza (Medium)", category: "Special Pizza", price: 320, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Tandoori Paneer Pizza (Medium)", category: "Special Pizza", price: 280, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Bum Bum Cafe Special Pizza (Medium)", category: "Special Pizza", price: 200, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cheese Corn Pizza (Large)", category: "Special Pizza", price: 140, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Mix Veg Pizza (Large)", category: "Special Pizza", price: 160, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Paneer Makhani Pizza (Large)", category: "Special Pizza", price: 180, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Super Deluxe Pizza (Large)", category: "Special Pizza", price: 200, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Farmhouse Pizza (Large)", category: "Special Pizza", price: 350, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Tandoori Paneer Pizza (Large)", category: "Special Pizza", price: 300, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Bum Bum Cafe Special Pizza (Large)", category: "Special Pizza", price: 250, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80", isVisible: true },

      // Page 5: Thali
      { name: "Bum Bum Cafe Special Thali Fix", category: "Special Thali", price: 200, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Bum Bum Cafe Mini Thali Fix", category: "Special Thali", price: 170, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Special Thali Fix", category: "Special Thali", price: 90, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Special Desi Thali Fix", category: "Special Thali", price: 100, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Desi Dal Rice Papad Combo", category: "Special Thali", price: 60, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Jeera Rice, Dal Fry Combo", category: "Special Thali", price: 110, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Special Khichdi - Dahi Combo", category: "Special Thali", price: 90, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Sukhi Bhaji Puri Combo", category: "Special Thali", price: 70, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Chole Bhature (छोले भटूरे)", category: "Special Thali", price: 60, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Sabudana Khichdi - Dahi Combo", category: "Special Thali", price: 60, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Sabudana Bada - Dahi Combo", category: "Special Thali", price: 60, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "4-Thepla, Curd, Pickle Combo", category: "Special Thali", price: 80, image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=300&q=80", isVisible: true },

      // Page 6: Paneer Special
      { name: "Paneer Tikka Masala", category: "Paneer Special", price: 100, variants: { half: 100, full: 150 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Paneer Butter Masala", category: "Paneer Special", price: 110, variants: { half: 110, full: 160 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Paneer Kadhai Masala", category: "Paneer Special", price: 100, variants: { half: 100, full: 150 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Paneer Tufani", category: "Paneer Special", price: 100, variants: { half: 100, full: 150 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Mutter Paneer Masala", category: "Paneer Special", price: 100, variants: { half: 100, full: 150 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Shahi Paneer Masala", category: "Paneer Special", price: 120, variants: { half: 120, full: 170 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Kaju Paneer Masala", category: "Paneer Special", price: 140, variants: { half: 140, full: 200 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Palak Paneer", category: "Paneer Special", price: 110, variants: { half: 110, full: 160 }, image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=300&q=80", isVisible: true },

      // Page 6: Special Mix Veg
      { name: "Mix Veg Masala", category: "Special Mix veg", price: 90, variants: { half: 90, full: 130 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Veg Tufani", category: "Special Mix veg", price: 90, variants: { half: 90, full: 130 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Veg Kadhai", category: "Special Mix veg", price: 80, variants: { half: 80, full: 120 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Alo Gobhi Mutter", category: "Special Mix veg", price: 70, variants: { half: 70, full: 110 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Sev Tomato", category: "Special Mix veg", price: 70, variants: { half: 70, full: 110 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Sev Bhaji", category: "Special Mix veg", price: 80, variants: { half: 80, full: 130 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Kaju Gathiya", category: "Special Mix veg", price: 100, variants: { half: 100, full: 150 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Jwadi Dhokli", category: "Special Mix veg", price: 80, variants: { half: 80, full: 140 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Baigan Bharta", category: "Special Mix veg", price: 70, variants: { half: 70, full: 100 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Dal Fry", category: "Special Mix veg", price: 60, variants: { half: 60, full: 90 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Dal Tadka", category: "Special Mix veg", price: 80, variants: { half: 80, full: 120 }, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80", isVisible: true },

      // Page 7: Indian Bread
      { name: "Phulka Roti", category: "Indian Bread", price: 10, variants: { Plain: 10, Butter: 10 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Tawa Paratha", category: "Indian Bread", price: 15, variants: { Plain: 15, Butter: 20 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Lachha Paratha", category: "Indian Bread", price: 25, variants: { Plain: 25, Butter: 30 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Thepla/Methi Paratha", category: "Indian Bread", price: 15, variants: { Plain: 15, Butter: 20 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Roti Tandoor", category: "Indian Bread", price: 15, variants: { Plain: 15, Butter: 20 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Naan Tandoor", category: "Indian Bread", price: 25, variants: { Plain: 25, Butter: 30 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Aloo Paratha", category: "Indian Bread", price: 30, variants: { Plain: 30, Butter: 40 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Aloo Gobhi Paratha", category: "Indian Bread", price: 30, variants: { Plain: 30, Butter: 40 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Cheese Onion Garlic", category: "Indian Bread", price: 50, variants: { Plain: 50, Butter: 60 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Paneer Paratha", category: "Indian Bread", price: 50, variants: { Plain: 50, Butter: 60 }, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Rosted Papad", category: "Indian Bread", price: 10, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Masala Papad", category: "Indian Bread", price: 20, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Fry Papad", category: "Indian Bread", price: 15, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=300&q=80", isVisible: true },

      // Page 7: Special Rice
      { name: "Plain Rice (सादा चावल)", category: "Special Rice", price: 50, variants: { half: 50, full: 70 }, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Jeera Rice (जीरा राइस)", category: "Special Rice", price: 70, variants: { half: 70, full: 100 }, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Veg Pulao (वेज पुलाव)", category: "Special Rice", price: 100, variants: { half: 100, full: 120 }, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Veg Biryani (वेज बिरयानी)", category: "Special Rice", price: 110, variants: { half: 110, full: 130 }, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80", isVisible: true },
      { name: "Masala Rice (मसाला राइस)", category: "Special Rice", price: 80, variants: { half: 80, full: 110 }, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80", isVisible: true }
    ];

    try {
      for (const item of defaultMenu) {
        await addDoc(collection(db, "products"), item);
      }
      toast.dismiss("import");
      toast.success("All 80+ PDF menu items imported successfully!");
    } catch (e) {
      toast.dismiss("import");
      toast.error("Error seeding PDF items");
    }
  };

  // --- RENDERING LOGIC ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={40} />
        <p className="font-bold tracking-widest animate-pulse">VERIFYING ADMIN...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-8 rounded-[3rem] border border-red-500/20 max-w-sm">
          <h1 className="text-red-500 text-3xl font-black mb-4 italic">ACCESS DENIED</h1>
          <p className="text-gray-400 mb-8 font-medium">Ye page sirf Cafe Owner ke liye hai. Please sahi number se login karein.</p>
          <button 
            onClick={() => window.location.href = "/"}
            className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20"
          >
            Go to Home Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen text-white pb-20">
      <Toaster />
      
      {/* Header */}
      <header className="p-6 bg-white/[0.03] border-b border-white/5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-orange-500 italic uppercase">Admin Panel</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleStore}
            className={`px-4 py-2 rounded-full text-[10px] font-black flex items-center gap-2 transition-all ${
              storeOpen ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
          >
            <Power size={14} /> {storeOpen ? "ONLINE" : "OFFLINE"}
          </button>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-full text-gray-400"><LogOut size={18}/></button>
        </div>
      </header>

      {/* Tabs */}
      <div className="p-4 flex gap-2">
        <button 
          onClick={() => setTab('orders')}
          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${tab === 'orders' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-gray-500'}`}
        >
          ORDERS ({orders.length})
        </button>
        <button 
          onClick={() => setTab('menu')}
          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${tab === 'menu' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-gray-500'}`}
        >
          MANAGE MENU
        </button>
      </div>

      <main className="p-4 max-w-2xl mx-auto">
        {tab === 'orders' ? (
          <div className="space-y-4">
            {orders.length === 0 && <p className="text-center text-gray-600 py-20 font-bold uppercase tracking-widest">No orders yet...</p>}
            {orders.map((o) => (
              <div key={o.id} className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <CheckCircle2 className="text-green-500 opacity-20" size={40} />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-orange-500 text-black text-[10px] px-3 py-1 rounded-full font-black">TOKEN: {o.tokenNumber}</span>
                  <span className="text-orange-500 font-black text-xl">₹{o.total}</span>
                </div>
                
                <div className="space-y-2 mb-6 border-b border-white/5 pb-4">
                  {o.items.map((item: any, idx: number) => (
                    <p key={idx} className="text-sm font-bold text-gray-300">
                      <span className="text-orange-500">×{item.quantity}</span> {item.name}
                    </p>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2"><Phone size={12}/> {o.customerPhone}</div>
                  <div className="flex items-center gap-2"><MapPin size={12}/> {o.address}</div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Calendar size={12}/> 
                    {o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            
            <div className="flex flex-col gap-2">
              {/* One-Click Import Button */}
              <button 
                onClick={handleBulkImport}
                type="button"
                className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                📥 IMPORT ALL 80+ PDF MENU ITEMS
              </button>

              {/* Add New Product Trigger Button */}
              <button 
                onClick={() => { setShowAddForm(!showAddForm); setEditingProduct(null); }}
                className="w-full bg-orange-500/10 text-orange-500 border border-orange-500/20 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-500/20 transition-all"
              >
                <Plus size={18}/> {showAddForm ? "CLOSE FORM" : "ADD NEW ITEM"}
              </button>
            </div>

            {/* --- ADD PRODUCT FORM --- */}
            {showAddForm && (
              <form onSubmit={handleAddProduct} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
                <h3 className="text-lg font-black text-orange-500 italic uppercase">Add Product Form</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
                  <input type="text" placeholder="e.g., Paneer Butter Masala" value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required>
                    {ADD_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
                  <input type="url" placeholder="Paste image url link..." value={newImage} onChange={(e) => setNewImage(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" required />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input type="checkbox" id="isVariant" checked={isVariant} onChange={(e) => setIsVariant(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <label htmlFor="isVariant" className="text-xs font-black uppercase text-gray-300 cursor-pointer select-none">Portion options (Half/Full or Plain/Butter)?</label>
                </div>

                {isVariant ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Half / Plain Price (₹)</label>
                      <input type="number" placeholder="Price" value={halfPrice} onChange={(e) => setHalfPrice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label>
                      <input type="number" placeholder="Price" value={fullPrice} onChange={(e) => setFullPrice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Price (₹)</label>
                    <input type="number" placeholder="Item Price (e.g., 150)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" />
                  </div>
                )}

                <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase">
                  Save Product
                </button>
              </form>
            )}

            {/* --- EDIT PRODUCT FORM --- */}
            {editingProduct && (
              <form onSubmit={handleUpdateProduct} className="bg-[#151515] border-2 border-orange-500/50 p-6 rounded-[2.5rem] space-y-4 relative">
                <button type="button" onClick={() => setEditingProduct(null)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full"><X size={16}/></button>
                <h3 className="text-lg font-black text-orange-500 italic uppercase">Edit Product Form</h3>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Item Name</label>
                  <input type="text" placeholder="e.g., Paneer Butter Masala" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold text-white" required>
                    {ADD_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Image URL</label>
                  <input type="url" placeholder="Paste image url..." value={editImage} onChange={(e) => setEditImage(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" required />
                </div>

                <div className="flex items-center gap-3 py-2">
                  <input type="checkbox" id="editIsVariant" checked={editIsVariant} onChange={(e) => setEditIsVariant(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                  <label htmlFor="editIsVariant" className="text-xs font-black uppercase text-gray-300 cursor-pointer select-none">Portion options (Half/Full or Plain/Butter)?</label>
                </div>

                {editIsVariant ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Half / Plain Price (₹)</label>
                      <input type="number" placeholder="Price" value={editHalfPrice} onChange={(e) => setEditHalfPrice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400 uppercase">Full / Butter Price (₹)</label>
                      <input type="number" placeholder="Price" value={editFullPrice} onChange={(e) => setEditFullPrice(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Price (₹)</label>
                    <input type="number" placeholder="Item Price (e.g., 150)" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-orange-500 text-sm font-bold" />
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all uppercase">
                    Update Item
                  </button>
                  <button type="button" onClick={() => setEditingProduct(null)} className="bg-white/5 text-gray-400 p-4 rounded-xl font-black text-sm active:scale-95 transition-all">
                    CANCEL
                  </button>
                </div>
              </form>
            )}

            {/* Menu Items List */}
            <div className="space-y-3 pt-2">
              {menu.map((item) => (
                <div key={item.id} className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 flex items-center gap-4 hover:bg-white/[0.04] transition-all">
                  <img src={item.image} className="w-16 h-16 rounded-2xl object-cover opacity-80" alt={item.name} />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-orange-500 font-black text-xs italic capitalize">{item.category}</p>
                    <p className="text-orange-500 font-black text-sm mt-1">
                      {item.variants ? (
                        item.variants.half ? `Half: ₹${item.variants.half} | Full: ₹${item.variants.full}` : `Plain: ₹${item.variants.Plain} | Butter: ₹${item.variants.Butter}`
                      ) : `₹${item.price}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Edit Item */}
                    <button 
                      onClick={() => startEditing(item)}
                      className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 transition-all"
                    >
                      <Edit size={18}/>
                    </button>
                    {/* Toggle Visibility */}
                    <button 
                      onClick={() => toggleItemVisibility(item.id, item.isVisible !== false)}
                      className={`p-3 rounded-xl transition-all ${item.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                    >
                      {item.isVisible !== false ? <Eye size={18}/> : <EyeOff size={18}/>}
                    </button>
                    {/* Delete Product */}
                    <button 
                      onClick={() => handleDeleteProduct(item.id)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                    >
                      <Trash size={18}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
