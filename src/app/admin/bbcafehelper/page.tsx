

'use client';

import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Store, 
  Flame, 
  RefreshCw, 
  MoreHorizontal, 
  Search, 
  Plus, 
  X,
  Trash2, 
  BarChart3, 
  Settings, 
  QrCode, 
  Wifi, 
  Sun, 
  Moon, 
  Share2, 
  FileText, 
  CheckCircle2, 
  Bell, 
  TrendingDown, 
  Truck, 
  PlusCircle, 
  MinusCircle, 
  Layers, 
  FileSpreadsheet, 
  Clock, 
  ChevronRight, 
  Sparkles,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 1. TYPINGS & INTERFACES
// ==========================================
interface InventoryItem {
  id: string;
  name: string;
  category: string;
  storeQty: number;
  cafeQty: number;
  unit: string;
  purchasePrice: number;
  minLimit: number;
  supplier: string;
  lastPurchaseDate: string;
  expiryDate?: string;
  batchNumber?: string;
  barcode?: string;
  totalConsumption?: number;
}

interface TransferLog {
  id: string;
  itemName: string;
  qty: number;
  unit: string;
  direction: "Store ➜ Cafe" | "Cafe ➜ Store";
  date: string;
  by: string;
  notes: string;
}

interface PurchaseLog {
  id: string;
  itemName: string;
  qty: number;
  unit: string;
  price: number;
  supplier: string;
  date: string;
  invoiceNo: string;
  targetLocation: "Main Store" | "Cafe Kitchen";
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

interface NotificationItem {
  id: string;
  type: string;
  text: string;
  time: string;
}

interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
}

const triggerHaptic = (ms = 35) => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
};

// ==========================================
// 2. MASTER INITIAL INVENTORY SEED DATA
// ==========================================
const INITIAL_INVENTORY: InventoryItem[] = [
  // --- INVENTORY FROM SUMMARY REPORT ---
  { id: "rep_1", name: "OREGON SACHETS", category: "Raw Material", storeQty: 5, cafeQty: 0, unit: "Pcs", purchasePrice: 120, minLimit: 10, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800301" },
  { id: "rep_2", name: "CHILLI FLAKES", category: "Raw Material", storeQty: 2, cafeQty: 0, unit: "Pcs", purchasePrice: 120, minLimit: 10, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800302" },
  { id: "rep_3", name: "FRESH YEAST KOBO", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 80, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800303" },
  { id: "rep_4", name: "MEDA", category: "Raw Material", storeQty: 10, cafeQty: 0, unit: "Kg", purchasePrice: 32, minLimit: 15, supplier: "Rajesh Traders", lastPurchaseDate: "2026-07-14", barcode: "890105800304" },
  { id: "rep_5", name: "SUGER POWDER", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 38, minLimit: 10, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800305" },
  { id: "rep_6", name: "MILK POWDER", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 140, minLimit: 5, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800306" },
  { id: "rep_7", name: "BREAD IMPROVER _1", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 210, minLimit: 3, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800307" },
  { id: "rep_8", name: "SALT", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 20, minLimit: 10, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800308" },
  { id: "rep_9", name: "MIRCHI POWDER", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 420, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800309" },
  { id: "rep_10", name: "MONO SODIUM GLUTAMATE", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 85, minLimit: 5, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800310" },
  { id: "rep_11", name: "BLACK PEPPER", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 550, minLimit: 4, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800311" },
  { id: "rep_12", name: "BURGER BUN", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 6, minLimit: 30, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800312" },
  { id: "rep_13", name: "SANDWICH BREAD", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 55, minLimit: 12, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800313" },
  { id: "rep_14", name: "NAMKEEN POHA", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 110, minLimit: 10, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800314" },
  { id: "rep_15", name: "CUMIN SEEDS JEERA", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 320, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800315" },
  { id: "rep_16", name: "FENNEL SEEDS SAUNF", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 240, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800316" },
  { id: "rep_17", name: "MUSTARD SEEDS RAI", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 120, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800317" },
  { id: "rep_18", name: "COCOA POWDER", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 380, minLimit: 3, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800318" },
  
  // CONTAINER/FOILS DISPOSABLES
  { id: "rep_19", name: "SILVER CONTAINER 500ML", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 4.5, minLimit: 100, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800319" },
  { id: "rep_20", name: "SILVER CONTAINER 200ML", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 3.2, minLimit: 100, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800320" },
  { id: "rep_21", name: "BUTTER PAPER ROLL", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 110, minLimit: 10, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800321" },
  { id: "rep_22", name: "SILVER FOIL", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 120, minLimit: 10, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800322" },
  { id: "rep_23", name: "PLASTIC CONTAINERS 200ML", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 2.8, minLimit: 100, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800323" },
  { id: "rep_24", name: "PLASTIC CONTAINERS 500ML", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 4.2, minLimit: 100, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800324" },
  { id: "rep_25", name: "PLASTIC SPOON", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 0.9, minLimit: 300, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800325" },
  { id: "rep_26", name: "PLASTIC FORKS", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 0.9, minLimit: 300, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800326" },
  { id: "rep_27", name: "PAPER PLATE 12NO", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 2.5, minLimit: 150, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800327" },
  { id: "rep_28", name: "PAPER KATORI", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 0.7, minLimit: 200, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800328" },
  { id: "rep_29", name: "PAPER PALT RICE", category: "Disposable", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 1.8, minLimit: 200, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800329" },
  
  // CONDIMENTS & SAUCES
  { id: "rep_30", name: "HALDI POWDER", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 210, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800330" },
  { id: "rep_31", name: "KITCHEN KING MASALA", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 72, minLimit: 10, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800331" },
  { id: "rep_32", name: "NAMKEEN BHEL", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 130, minLimit: 10, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800332" },
  { id: "rep_33", name: "MURMURA", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 65, minLimit: 10, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800333" },
  { id: "rep_34", name: "COLD COFFEE GLASS BIG SET", category: "Disposable", storeQty: 155, cafeQty: 0, unit: "Pcs", purchasePrice: 6.5, minLimit: 50, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800334" },
  { id: "rep_35", name: "MOZZARELLA CHEESE", category: "Dairy", storeQty: 1, cafeQty: 0, unit: "Kg", purchasePrice: 490, minLimit: 5, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800335" },
  { id: "rep_36", name: "MAYONNAISE", category: "Raw Material", storeQty: 2, cafeQty: 0, unit: "Kg", purchasePrice: 80, minLimit: 4, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800336" },
  { id: "rep_37", name: "1000 ICELAND SAUCE", category: "Raw Material", storeQty: 2, cafeQty: 0, unit: "Pcs", purchasePrice: 190, minLimit: 4, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800337" },
  { id: "rep_38", name: "PIZZA PASTA SAUCE", category: "Raw Material", storeQty: 8, cafeQty: 0, unit: "Pcs", purchasePrice: 160, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800338" },
  { id: "rep_39", name: "CREMICA TOMATO KETCHUP", category: "Raw Material", storeQty: 8, cafeQty: 0, unit: "Pcs", purchasePrice: 65, minLimit: 10, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800339" },
  { id: "rep_40", name: "LIQUID CHEESE", category: "Dairy", storeQty: 6, cafeQty: 0, unit: "Kg", purchasePrice: 185, minLimit: 4, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-14", barcode: "890105800340" },
  { id: "rep_41", name: "TOMAKHAN MAYONNAISE", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 220, minLimit: 3, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800341" },
  { id: "rep_42", name: "VEG TANDOORI MAYONNAISE", category: "Raw Material", storeQty: 2, cafeQty: 0, unit: "Pcs", purchasePrice: 190, minLimit: 4, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800342" },
  { id: "rep_43", name: "GARLIC CHILLI SAUCE", category: "Raw Material", storeQty: 1, cafeQty: 0, unit: "Pcs", purchasePrice: 160, minLimit: 3, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800343" },
  { id: "rep_44", name: "JALAPENO CHEESE DRESSING", category: "Raw Material", storeQty: 1, cafeQty: 0, unit: "Pcs", purchasePrice: 240, minLimit: 3, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800344" },
  { id: "rep_45", name: "BURGER MAYONNAISE", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 190, minLimit: 3, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800345" },
  { id: "rep_46", name: "TOMATO KETCHUP", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 95, minLimit: 10, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800346" },
  { id: "rep_47", name: "MSG", category: "Raw Material", storeQty: 6, cafeQty: 0, unit: "Kg", purchasePrice: 80, minLimit: 3, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800347" },
  { id: "rep_48", name: "CALCIUM POWDER", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Kg", purchasePrice: 180, minLimit: 3, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800348" },
  { id: "rep_49", name: "SLICED BLACK OLIVES", category: "Raw Material", storeQty: 3, cafeQty: 0, unit: "Pcs", purchasePrice: 140, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800349" },
  { id: "rep_50", name: "SLICED RED PAPRIKA", category: "Raw Material", storeQty: 1, cafeQty: 0, unit: "Pcs", purchasePrice: 140, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800350" },
  { id: "rep_51", name: "JALAPENO SLICE", category: "Raw Material", storeQty: 3, cafeQty: 0, unit: "Pcs", purchasePrice: 140, minLimit: 5, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800351" },
  { id: "rep_52", name: "CHOCOLATE SYRUP", category: "Raw Material", storeQty: 1, cafeQty: 0, unit: "Pcs", purchasePrice: 160, minLimit: 4, supplier: "Om Super Market", lastPurchaseDate: "2026-07-14", barcode: "890105800352" },
  { id: "rep_53", name: "COLD COFFEE GLASS STRAW & CAP", category: "Disposable", storeQty: 75, cafeQty: 0, unit: "Pcs", purchasePrice: 5.0, minLimit: 50, supplier: "Prabhat Polymer", lastPurchaseDate: "2026-07-14", barcode: "890105800353" },
  
  // PIZZA BASE & BOXES
  { id: "rep_54", name: "PIZZA BASE LARGE", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 12, minLimit: 20, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800354" },
  { id: "rep_55", name: "PIZZA BASE SMALL 6\"", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 7, minLimit: 20, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800355" },
  { id: "rep_56", name: "PIZZA BASE MEDIUM 8\"", category: "Raw Material", storeQty: 0, cafeQty: 0, unit: "Pcs", purchasePrice: 10, minLimit: 20, supplier: "Soni Grocery Shop", lastPurchaseDate: "2026-07-14", barcode: "890105800356" },
  { id: "rep_57", name: "PIZZA BOX LARGE 10\"", category: "Packaging", storeQty: 400, cafeQty: 0, unit: "Pcs", purchasePrice: 7.50, minLimit: 100, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800357" },
  { id: "rep_58", name: "PIZZA BOX 8\"", category: "Packaging", storeQty: 300, cafeQty: 0, unit: "Pcs", purchasePrice: 4.50, minLimit: 100, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800358" },
  { id: "rep_59", name: "PIZZA BOX 7\"", category: "Packaging", storeQty: 800, cafeQty: 0, unit: "Pcs", purchasePrice: 3.60, minLimit: 150, supplier: "Narmada Packagings", lastPurchaseDate: "2026-07-14", barcode: "890105800359" },

  // --- CORE SYSTEM EQUIPMENT & FROZEN PRE-SETS ---
  { id: "item_19", name: "FRENCH FRIES", category: "Frozen Material", storeQty: 40, cafeQty: 10, unit: "Kg", purchasePrice: 110, minLimit: 15, supplier: "Sagar Distributors", lastPurchaseDate: "2026-07-12", expiryDate: "2026-10-12", batchNumber: "B-FF890", barcode: "890175800249" },
  { id: "item_20", name: "VEG PATTY", category: "Frozen Material", storeQty: 100, cafeQty: 25, unit: "Pcs", purchasePrice: 18, minLimit: 30, supplier: "Sagar Distributors", lastPurchaseDate: "2026-07-12", expiryDate: "2026-09-12", batchNumber: "B-VP441", barcode: "890175800250" },
  { id: "item_21", name: "PANEER POPPERS", category: "Frozen Material", storeQty: 60, cafeQty: 15, unit: "Pcs", purchasePrice: 15, minLimit: 20, supplier: "Sony Dairy", lastPurchaseDate: "2026-07-11", expiryDate: "2026-09-11", batchNumber: "B-PP902", barcode: "890175800251" },
  { id: "item_22", name: "DEEP FREEZE", category: "Equipment", storeQty: 2, cafeQty: 1, unit: "Pcs", purchasePrice: 28000, minLimit: 1, supplier: "Sagar Distributors", lastPurchaseDate: "2026-07-01", barcode: "890175800252" }
];

export default function BumBumCafeStockApp() {
  // Global States
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [categories, setCategories] = useState<string[]>([
    "Raw Material", "Packaging", "Disposable", "Beverages", "Dairy", "Frozen Material", "Cleaning", "Equipment", "Others"
  ]);
  const [activeTab, setActiveTab] = useState<'home' | 'store' | 'cafe' | 'transfer' | 'more'>('home');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  
  // Slide-out panels & Drawers
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<InventoryItem | null>(null);
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [scannerManualBarcode, setScannerManualBarcode] = useState<string>("");
  const [scannedProductDetected, setScannedProductDetected] = useState<InventoryItem | null>(null);
  const [scannedAddQty, setScannedAddQty] = useState<string>("");
  const [scannedLocation, setScannedLocation] = useState<"Main Store" | "Cafe Kitchen">("Main Store");

  // Form Modals & Managers
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [showStockOutModal, setShowStockOutModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Dynamic Category Forms
  const [categoryInput, setCategoryInput] = useState<string>("");
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState<string>("");

  // Sub-data tracking for History logs
  const [transferHistory, setTransferHistory] = useState<TransferLog[]>([
    { id: "tx_1", itemName: "TABLE RICE", qty: 25, unit: "Kg", direction: "Store ➜ Cafe", date: "2026-07-13", by: "Admin (System)", notes: "Regular daily kitchen stock refill" },
    { id: "tx_2", itemName: "CHEESE", qty: 5, unit: "Kg", direction: "Store ➜ Cafe", date: "2026-07-13", by: "Admin (System)", notes: "Pizza toppings restocking" },
  ]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseLog[]>([
    { id: "p_1", itemName: "TABLE RICE", qty: 100, unit: "Kg", price: 52, supplier: "Rajesh Traders", date: "2026-07-10", invoiceNo: "INV-2026-889", targetLocation: "Main Store" },
    { id: "p_2", itemName: "CHEESE", qty: 15, unit: "Kg", price: 440, supplier: "Sony Dairy", date: "2026-07-12", invoiceNo: "INV-2026-904", targetLocation: "Cafe Kitchen" },
  ]);
  const [stockOutHistory, setStockOutHistory] = useState<StockOutLog[]>([
    { id: "so_1", itemName: "SUGER", qty: 1.5, purpose: "Waste", date: "2026-07-12", remarks: "Sugar spoiled by high humidity", financialLoss: 66 },
    { id: "so_2", itemName: "THUMSUP 750ML", qty: 2, purpose: "Damage", date: "2026-07-11", remarks: "Bottles leaked during dispatch handling", financialLoss: 80 },
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: "sup_1", name: "Rajesh Traders", phone: "9876543210", address: "Anand Godown Area" },
    { id: "sup_2", name: "Soni Grocery Shop", phone: "9123456780", address: "Station Road, Anand" },
    { id: "sup_3", name: "Om Super Market", phone: "9012345678", address: "Cafe Market Street" },
    { id: "sup_4", name: "Sagar Distributors", phone: "9812736450", address: "GIDC Industrial Estate" },
    { id: "sup_5", name: "Sony Dairy", phone: "9900112233", address: "Amul Dairy Road" },
    { id: "sup_6", name: "Bharat Gas", phone: "9426055112", address: "Bharat Terminal" },
    { id: "sup_7", name: "Narmada Packagings", phone: "7014529683", address: "Vapi GIDC" },
    { id: "sup_8", name: "Prabhat Polymer", phone: "8989525201", address: "Nadiad Bypass" },
    { id: "sup_9", name: "Coca-Cola Agency", phone: "9515253545", address: "Baroda Highway" }
  ]);

  // Form Inputs States
  const [formStockIn, setFormStockIn] = useState({
    invoiceNo: '', supplier: '', item: '', category: 'Raw Material', quantity: '', unit: 'Kg', price: '', gst: '5', expiry: '', batch: '', uploadInvoice: '',
    targetLocation: 'Main Store' as "Main Store" | "Cafe Kitchen"
  });
  const [formStockOut, setFormStockOut] = useState({
    item: '', quantity: '', purpose: 'Kitchen Use' as "Kitchen Use" | "Waste" | "Damage" | "Staff Use", remarks: ''
  });
  const [formTransfer, setFormTransfer] = useState({
    item: '', quantity: '', direction: 'Store ➜ Cafe' as "Store ➜ Cafe" | "Cafe ➜ Store", notes: ''
  });
  const [formSupplier, setFormSupplier] = useState({ name: '', phone: '', address: '' });

  // Notifications pool (Low stock, Out of Stock, and Expiry Date warnings)
  const notificationsList = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const today = new Date();

    inventory.forEach(item => {
      const total = item.storeQty + item.cafeQty;
      
      // 1. Stock levels
      if (total === 0) {
        list.push({ id: `notif_out_${item.id}`, type: "Out of Stock", text: `🚨 ${item.name} is completely out of stock!`, time: "Action Required" });
      } else if (total < item.minLimit) {
        list.push({ id: `notif_low_${item.id}`, type: "Low Stock", text: `⚠️ ${item.name} is running low (${total} ${item.unit} left)`, time: "Restock soon" });
      }

      // 2. Expiry dates
      if (item.expiryDate) {
        const exp = new Date(item.expiryDate);
        const timeDiff = exp.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff <= 3 && daysDiff >= 0) {
          list.push({ id: `notif_exp_${item.id}`, type: "Expiry Warning", text: `⏰ ${item.name} is expiring in ${daysDiff} days! (${item.expiryDate})`, time: "Use immediately" });
        }
      }
    });
    return list;
  }, [inventory]);

  // Handle Bottom Nav clicks (routing simulator)
  const handleNavClick = (tab: 'home' | 'store' | 'cafe' | 'transfer' | 'more') => {
    setActiveTab(tab);
    if (tab === 'home') setCurrentView('dashboard');
    else if (tab === 'store') setCurrentView('main_store');
    else if (tab === 'cafe') setCurrentView('cafe_stock');
    else if (tab === 'transfer') setCurrentView('stock_transfer');
  };

  // Dashboard calculation selectors
  const dashboardStats = useMemo(() => {
    let totalStockVal = 0;
    let mainStoreVal = 0;
    let cafeStockVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach(item => {
      const totalVal = (item.storeQty + item.cafeQty) * item.purchasePrice;
      totalStockVal += totalVal;
      mainStoreVal += item.storeQty * item.purchasePrice;
      cafeStockVal += item.cafeQty * item.purchasePrice;

      const combinedQty = item.storeQty + item.cafeQty;
      if (combinedQty === 0) outOfStockCount++;
      else if (combinedQty < item.minLimit) lowStockCount++;
    });

    const todayPurchases = purchaseHistory
      .filter(p => p.date === "2026-07-14" || p.date === new Date().toISOString().split('T')[0])
      .reduce((sum, p) => sum + (p.qty * p.price), 0);

    const todayWaste = stockOutHistory
      .filter(s => s.date === "2026-07-14" || s.date === new Date().toISOString().split('T')[0])
      .reduce((sum, s) => sum + s.qty, 0);

    const monthlyFinancialWastageLoss = stockOutHistory
      .filter(s => s.purpose === "Waste" || s.purpose === "Damage")
      .reduce((sum, s) => sum + (s.financialLoss || 0), 0);

    return {
      totalStockVal,
      mainStoreVal,
      cafeStockVal,
      lowStockCount,
      outOfStockCount,
      todayPurchases,
      todayWaste,
      monthlyFinancialWastageLoss
    };
  }, [inventory, purchaseHistory, stockOutHistory]);

  // Global search & categorized filtering
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchQuery, selectedCategory]);

  // Toast System State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const toastMessage = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Barcode Scan Simulator with Match Logic & Location Targeting
  const handleBarcodeManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic();

    if (!scannerManualBarcode.trim()) {
      toastMessage("कृपया सही बारकोड दर्ज करें!", "error");
      return;
    }

    const matchedProduct = inventory.find(
      item => item.barcode === scannerManualBarcode.trim()
    );

    if (matchedProduct) {
      setScannedProductDetected(matchedProduct);
      toastMessage(`Material Found: ${matchedProduct.name}`, "success");
    } else {
      toastMessage("सामग्री नहीं मिली! कृपया बारकोड जांचें।", "error");
    }
  };

  const handleSaveScannedStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedProductDetected || !scannedAddQty) return;

    const qtyVal = parseFloat(scannedAddQty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      toastMessage("कृपया सही संख्या दर्ज करें!", "error");
      return;
    }

    setInventory(prev => 
      prev.map(item => {
        if (item.id === scannedProductDetected.id) {
          if (scannedLocation === "Main Store") {
            return { ...item, storeQty: item.storeQty + qtyVal, lastPurchaseDate: new Date().toISOString().split('T')[0] };
          } else {
            return { ...item, cafeQty: item.cafeQty + qtyVal, lastPurchaseDate: new Date().toISOString().split('T')[0] };
          }
        }
        return item;
      })
    );

    // Save purchase history audit with routed target location
    const newPurchase: PurchaseLog = {
      id: `p_${Date.now()}`,
      itemName: scannedProductDetected.name,
      qty: qtyVal,
      unit: scannedProductDetected.unit,
      price: scannedProductDetected.purchasePrice,
      supplier: scannedProductDetected.supplier,
      date: new Date().toISOString().split('T')[0],
      invoiceNo: `SCAN-REFILL-${Math.floor(Math.random() * 9000 + 1000)}`,
      targetLocation: scannedLocation
    };
    setPurchaseHistory(prev => [newPurchase, ...prev]);

    toastMessage(`${qtyVal} ${scannedProductDetected.unit} of ${scannedProductDetected.name} Added to ${scannedLocation}!`);
    setScannerActive(false);
    setScannedProductDetected(null);
    setScannedAddQty("");
    setScannerManualBarcode("");
  };

  // Supplier Add, Edit & Delete Actions
  const handleSupplierAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier.name.trim()) return;

    const newSupplier: Supplier = {
      id: `sup_${Date.now()}`,
      name: formSupplier.name.trim(),
      phone: formSupplier.phone.trim() || "N/A",
      address: formSupplier.address.trim() || "N/A"
    };

    setSuppliers(prev => [...prev, newSupplier]);
    toastMessage("Merchant Registered!");
    setShowAddSupplierModal(false);
    setFormSupplier({ name: '', phone: '', address: '' });
  };

  const handleSupplierEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setSuppliers(prev => 
      prev.map(sup => sup.id === editingSupplier.id ? editingSupplier : sup)
    );

    toastMessage("Supplier details modified!");
    setEditingSupplier(null);
  };

  const handleSupplierDelete = (id: string, name: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप सप्लायर "${name}" को डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    setSuppliers(prev => prev.filter(s => s.id !== id));
    toastMessage("Supplier Removed Successfully!");
  };

  // WhatsApp low stock order generator based on specific supplier
  const triggerWhatsAppOrder = (supplierName: string) => {
    const lowStockForSupplier = inventory.filter(item => 
      item.supplier === supplierName && (item.storeQty + item.cafeQty) < item.minLimit
    );

    if (lowStockForSupplier.length === 0) {
      toastMessage(`${supplierName} के पास कोई भी कम स्टॉक सामग्री नहीं है!`, "info");
      return;
    }

    const orderText = lowStockForSupplier
      .map(item => `• ${item.name} (${item.minLimit - (item.storeQty + item.cafeQty)} ${item.unit} Required)`)
      .join("\n");

    const message = encodeURIComponent(`🔥 *BUM BUM CAFE - NEW ORDER REQ*\n\nप्रिय ${supplierName} टीम,\nकृपया हमारे कैफ़े के लिए निम्नलिखित कम स्टॉक माल का ऑर्डर भेजें:\n\n${orderText}\n\nधन्यवाद!\n- मैनेजमेंट (Bum Bum Cafe)`);
    window.open(`https://wa.me/919714293759?text=${message}`, '_blank');
    toastMessage("WhatsApp order drafted!");
  };

  // Item Delete Action
  const handleItemDelete = (id: string, name: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप आइटम "${name}" को हमेशा के लिए डिलीट करना चाहते हैं?`);
    if (!confirm) return;

    setInventory(prev => prev.filter(item => item.id !== id));
    setSelectedItemDetail(null);
    toastMessage("Item Removed Successfully!");
  };

  // Item Edit Submit
  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setInventory(prev => 
      prev.map(item => item.id === editingItem.id ? editingItem : item)
    );

    toastMessage("आइटम विवरण संशोधित किया गया!");
    setEditingItem(null);
    setSelectedItemDetail(null);
  };

  // Category Manager Add/Edit/Delete Actions
  const handleCategoryAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCat = categoryInput.trim();
    if (!cleanCat) return;

    if (categories.includes(cleanCat)) {
      toastMessage("यह श्रेणी पहले से मौजूद है!", "error");
      return;
    }

    setCategories(prev => [...prev, cleanCat]);
    setCategoryInput("");
    toastMessage(`श्रेणी "${cleanCat}" जोड़ी गई!`);
  };

  const handleCategoryEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategoryIndex === null || !editingCategoryValue.trim()) return;

    const oldName = categories[editingCategoryIndex];
    const newName = editingCategoryValue.trim();

    if (categories.includes(newName) && oldName !== newName) {
      toastMessage("यह श्रेणी पहले से मौजूद है!", "error");
      return;
    }

    setCategories(prev => prev.map((cat, idx) => idx === editingCategoryIndex ? newName : cat));
    setInventory(prev => 
      prev.map(item => item.category === oldName ? { ...item, category: newName } : item)
    );

    setEditingCategoryIndex(null);
    setEditingCategoryValue("");
    toastMessage("श्रेणी संशोधित की गई!");
  };

  const handleCategoryDelete = (catName: string) => {
    triggerHaptic(50);
    const confirm = window.confirm(`क्या आप श्रेणी "${catName}" को हटाना चाहते हैं? इस श्रेणी की सभी सामग्री "Others" श्रेणी में चली जाएगी।`);
    if (!confirm) return;

    setCategories(prev => prev.filter(c => c !== catName));
    setInventory(prev => 
      prev.map(item => item.category === catName ? { ...item, category: "Others" } : item)
    );

    toastMessage("श्रेणी हटा दी गई है।");
  };

  // Dynamic Stock-In handler (Routes to either Main Store or Cafe Kitchen dynamically)
  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStockIn.item || !formStockIn.quantity || !formStockIn.price) {
      toastMessage("All fields are required!", "error");
      return;
    }

    const qtyNum = parseFloat(formStockIn.quantity);
    const priceNum = parseFloat(formStockIn.price);
    const target = formStockIn.targetLocation;

    setInventory(prev => {
      const exists = prev.find(i => i.name.toUpperCase() === formStockIn.item.toUpperCase());
      if (exists) {
        return prev.map(i => i.name.toUpperCase() === formStockIn.item.toUpperCase() 
          ? { 
              ...i, 
              storeQty: target === "Main Store" ? i.storeQty + qtyNum : i.storeQty,
              cafeQty: target === "Cafe Kitchen" ? i.cafeQty + qtyNum : i.cafeQty,
              purchasePrice: priceNum, 
              lastPurchaseDate: new Date().toISOString().split('T')[0] 
            } 
          : i
        );
      } else {
        return [
          ...prev,
          {
            id: `item_${Date.now()}`,
            name: formStockIn.item.toUpperCase(),
            category: formStockIn.category,
            storeQty: target === "Main Store" ? qtyNum : 0,
            cafeQty: target === "Cafe Kitchen" ? qtyNum : 0,
            unit: formStockIn.unit,
            purchasePrice: priceNum,
            minLimit: 15,
            supplier: formStockIn.supplier || "Walk-In Supplier",
            lastPurchaseDate: new Date().toISOString().split('T')[0]
          }
        ];
      }
    });

    const newPurchase: PurchaseLog = {
      id: `p_${Date.now()}`,
      itemName: formStockIn.item.toUpperCase(),
      qty: qtyNum,
      unit: formStockIn.unit,
      price: priceNum,
      supplier: formStockIn.supplier || "Walk-In",
      date: new Date().toISOString().split('T')[0],
      invoiceNo: formStockIn.invoiceNo || "INV-TEMP",
      targetLocation: target
    };
    setPurchaseHistory(prev => [newPurchase, ...prev]);

    toastMessage(`Stocked In ${qtyNum} of ${formStockIn.item} successfully to ${target}!`);
    setShowAddStockModal(false);
    setFormStockIn({ 
      invoiceNo: '', supplier: '', item: '', category: 'Raw Material', quantity: '', unit: 'Kg', price: '', gst: '5', expiry: '', batch: '', uploadInvoice: '',
      targetLocation: 'Main Store'
    });
  };

  // Dynamic Stock-Out Handler (Deducts Cafe stock)
  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStockOut.item || !formStockOut.quantity) {
      toastMessage("All fields are required!", "error");
      return;
    }

    const qtyNum = parseFloat(formStockOut.quantity);
    let stockIsShort = false;

    setInventory(prev => {
      return prev.map(item => {
        if (item.id === formStockOut.item) {
          if (item.cafeQty < qtyNum) {
            stockIsShort = true;
            return item;
          }
          return { ...item, cafeQty: item.cafeQty - qtyNum };
        }
        return item;
      });
    });

    if (stockIsShort) {
      toastMessage("Insufficient quantity in Cafe Stock to dispatch!", "error");
      return;
    }

    const matchedItem = inventory.find(i => i.id === formStockOut.item);
    const matchName = matchedItem?.name || "Unknown";
    const unitPrice = matchedItem?.purchasePrice || 0;

    const newLog: StockOutLog = {
      id: `so_${Date.now()}`,
      itemName: matchName,
      qty: qtyNum,
      purpose: formStockOut.purpose,
      date: new Date().toISOString().split('T')[0],
      remarks: formStockOut.remarks || "No remarks",
      financialLoss: (formStockOut.purpose === "Waste" || formStockOut.purpose === "Damage") ? (qtyNum * unitPrice) : 0
    };
    setStockOutHistory(prev => [newLog, ...prev]);

    toastMessage(`Removed ${qtyNum} of ${matchName} (${formStockOut.purpose})`);
    setShowStockOutModal(false);
    setFormStockOut({ item: '', quantity: '', purpose: 'Kitchen Use', remarks: '' });
  };

  // Quick plus-minus adjustment for Main Store Qty directly
  const adjustQuickStoreQty = (id: string, adjustment: number) => {
    triggerHaptic();
    setInventory(prev => 
      prev.map(item => {
        if (item.id === id) {
          const finalVal = item.storeQty + adjustment;
          return { ...item, storeQty: finalVal < 0 ? 0 : finalVal };
        }
        return item;
      })
    );
  };

  // Dynamic Transfer Handler
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTransfer.item || !formTransfer.quantity) {
      toastMessage("Fill out all transfer fields!", "error");
      return;
    }

    const qtyNum = parseFloat(formTransfer.quantity);
    const dir = formTransfer.direction;
    let failed = false;

    setInventory(prev => {
      return prev.map(item => {
        if (item.id === formTransfer.item) {
          if (dir === "Store ➜ Cafe") {
            if (item.storeQty < qtyNum) { failed = true; return item; }
            return { ...item, storeQty: item.storeQty - qtyNum, cafeQty: item.cafeQty + qtyNum };
          } else {
            if (item.cafeQty < qtyNum) { failed = true; return item; }
            return { ...item, cafeQty: item.cafeQty - qtyNum, storeQty: item.storeQty + qtyNum };
          }
        }
        return item;
      });
    });

    if (failed) {
      toastMessage("Transfer failed! Insufficient source stock.", "error");
      return;
    }

    const matchName = inventory.find(i => i.id === formTransfer.item)?.name || "Unknown";
    const newTx: TransferLog = {
      id: `tx_${Date.now()}`,
      itemName: matchName,
      qty: qtyNum,
      unit: inventory.find(i => i.id === formTransfer.item)?.unit || "Pcs",
      direction: dir,
      date: new Date().toISOString().split('T')[0],
      by: "Admin (System)",
      notes: formTransfer.notes || "Standard workflow transfer"
    };
    setTransferHistory(prev => [newTx, ...prev]);

    toastMessage(`Successfully transferred ${qtyNum} of ${matchName}!`);
    setShowTransferModal(false);
    setFormTransfer({ item: '', quantity: '', direction: 'Store ➜ Cafe', notes: '' });
  };

  // Export CSV/Excel Function
  const triggerSimulationExport = (reportName: string) => {
    const headers = ["Item Name", "Category", "Quantity", "Unit", "Total Value (INR)", "Status"];
    const rows = inventory.map(item => [
      item.name,
      item.category,
      item.storeQty + item.cafeQty,
      item.unit,
      (item.storeQty + item.cafeQty) * item.purchasePrice,
      (item.storeQty + item.cafeQty) === 0 ? "Out of Stock" : (item.storeQty + item.cafeQty) < item.minLimit ? "Low Stock" : "Normal"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastMessage(`Downloaded: ${reportName} (CSV)!`);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0F0F0F] text-white' : 'bg-[#FAFAFA] text-neutral-900'} pb-24 font-sans relative transition-colors duration-300`}>

      {/* Toast Notification HUD */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 
              toast.type === 'info' ? 'bg-blue-500/90 border-blue-400 text-white' : 'bg-orange-500/90 border-orange-400 text-white'
            }`}
          >
            <Sparkles size={16} />
            <span className="text-xs font-black uppercase tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREMIUM HEADER */}
      <header className={`sticky top-0 z-40 backdrop-blur-lg border-b ${isDarkMode ? 'bg-[#0F0F0F]/80 border-neutral-800' : 'bg-white/80 border-neutral-100'} p-4`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/20">
              ☕
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-[#FF6B00]">BUM BUM CAFE</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Live Inventory Hub</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Barcode Scanner overlay trigger */}
            <button 
              onClick={() => setScannerActive(true)}
              className="p-2.5 bg-[#FF6B00]/5 border border-[#FF6B00]/20 hover:bg-[#FF6B00]/10 rounded-xl text-[#FF6B00] transition-all"
              title="Simulator QR Scanner"
            >
              <QrCode size={16} className="animate-pulse" />
            </button>

            {/* Notifications Trigger Bell */}
            <button 
              onClick={() => setShowNotifications(true)}
              className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl text-neutral-400 relative transition-all"
            >
              <Bell size={16} />
              {notificationsList.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center animate-bounce">
                  {notificationsList.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CORE WRAPPER */}
      <main className="max-w-md mx-auto px-4 pt-4 pb-20 space-y-6">

        {/* ==========================================
            3. TAB 1: DASHBOARD (HOME)
            ========================================== */}
        {activeTab === 'home' && currentView === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Hero Banner */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-5 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                <Flame size={160} />
              </div>
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-200">BUM BUM CAFE OPZ</span>
                <h2 className="text-xl font-black">Stock Management</h2>
                <p className="text-xs text-orange-100 font-medium">Daily operations control, multi-store logistics and material tracking.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10 relative z-10">
                <div onClick={() => { triggerHaptic(); setShowAddStockModal(true); }} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl text-center backdrop-blur-md cursor-pointer transition-all">
                  <PlusCircle size={18} className="mx-auto mb-1" />
                  <span className="text-[10px] font-black uppercase tracking-wider block">Add Stock</span>
                </div>
                <div onClick={() => { triggerHaptic(); setShowTransferModal(true); }} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl text-center backdrop-blur-md cursor-pointer transition-all">
                  <RefreshCw size={18} className="mx-auto mb-1 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-wider block">Transfer</span>
                </div>
              </div>
            </div>

            {/* DASHBOARD ANALYTICS CARDS */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-1">Inventory Valuations</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Total Stock Value</p>
                  <h4 className="text-lg font-black text-[#FF6B00] mt-1">₹{dashboardStats.totalStockVal.toLocaleString()}</h4>
                </div>
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Main Store Value</p>
                  <h4 className="text-lg font-black mt-1">₹{dashboardStats.mainStoreVal.toLocaleString()}</h4>
                </div>
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Cafe Stock Value</p>
                  <h4 className="text-lg font-black mt-1">₹{dashboardStats.cafeStockVal.toLocaleString()}</h4>
                </div>
                <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm`}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Monthly Wastage Loss</p>
                  <h4 className="text-lg font-black mt-1 text-red-500">₹{dashboardStats.monthlyFinancialWastageLoss.toLocaleString()}</h4>
                </div>
              </div>
            </div>

            {/* DAILY DEVIATION COUNTERS */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm flex items-center justify-between`}>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Today Stock In</p>
                  <h4 className="text-base font-black text-green-500 mt-1">₹{dashboardStats.todayPurchases}</h4>
                </div>
                <PlusCircle size={22} className="text-green-500" />
              </div>

              <div className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm flex items-center justify-between`}>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Today Waste Qty</p>
                  <h4 className="text-base font-black text-red-500 mt-1">{dashboardStats.todayWaste} Qty</h4>
                </div>
                <TrendingDown size={22} className="text-red-500" />
              </div>
            </div>

            {/* LOW STOCK HUD LIST */}
            <div className={`p-5 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Low / Out of Stock List</span>
                <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">Critical</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {inventory.filter(i => (i.storeQty + i.cafeQty) < i.minLimit).map(item => {
                  const combined = item.storeQty + item.cafeQty;
                  return (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 text-xs">
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-[9px] text-neutral-400 uppercase">{item.category}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-black ${combined === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                          {combined} {item.unit} Left
                        </p>
                        <p className="text-[8px] text-neutral-400">Limit: {item.minLimit}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-1">Quick Actions Panel</h3>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div onClick={() => setShowAddStockModal(true)} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm cursor-pointer hover:border-orange-500 transition-all`}>
                  <Plus className="mx-auto text-[#FF6B00]" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1">Add Stock</span>
                </div>
                <div onClick={() => setShowStockOutModal(true)} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm cursor-pointer hover:border-orange-500 transition-all`}>
                  <MinusCircle className="mx-auto text-red-500" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1">Stock Out</span>
                </div>
                <div onClick={() => setShowTransferModal(true)} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm cursor-pointer hover:border-orange-500 transition-all`}>
                  <RefreshCw className="mx-auto text-blue-500" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1">Transfer</span>
                </div>
                <div onClick={() => { setActiveTab('more'); setCurrentView('reports_list'); }} className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} shadow-sm cursor-pointer hover:border-orange-500 transition-all`}>
                  <BarChart3 className="mx-auto text-emerald-500" size={16} />
                  <span className="text-[9px] font-black uppercase tracking-wider block mt-1">Reports</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ==========================================
            4. TAB 2: MAIN STORE (GODOWN)
            ========================================== */}
        {activeTab === 'store' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-widest text-neutral-400">Main Store Godown</h2>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Bulk inventory control system</p>
              </div>
              <button 
                onClick={() => setShowAddStockModal(true)}
                className="px-4 py-2 bg-[#FF6B00] hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-1.5 shadow"
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>

            {/* CATEGORY FILTER SWITCHES */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all ${
                  selectedCategory === "All" 
                    ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                    : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all ${
                    selectedCategory === cat 
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md' 
                      : isDarkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-400' : 'bg-white border-neutral-200 text-neutral-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* INVENTORY CARD LIST GRID */}
            <div className="space-y-3.5">
              {filteredInventory.map(item => {
                const isLow = (item.storeQty + item.cafeQty) < item.minLimit;
                return (
                  <div 
                    key={item.id} 
                    className={`rounded-3xl border p-4 hover:shadow-lg transition-all ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    } ${isLow ? 'border-amber-500/40 bg-amber-500/[0.02]' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div onClick={() => setSelectedItemDetail(item)} className="cursor-pointer space-y-0.5 flex-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-[#FF6B00] dark:text-orange-400">{item.name}</span>
                          {isLow && (
                            <span className="bg-red-100 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{item.category} • {item.supplier}</p>
                        {item.barcode && <p className="text-[8px] text-neutral-400 tracking-wider">Barcode: {item.barcode}</p>}
                        {item.expiryDate && <p className="text-[8px] text-red-400 font-bold">Expiry: {item.expiryDate}</p>}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-neutral-500">Unit: {item.unit}</span>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Price: ₹{item.purchasePrice}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-b border-neutral-100 dark:border-neutral-800/80 my-3 py-2 text-center text-xs">
                      <div>
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Main Godown</span>
                        <span className="font-black text-sm">{item.storeQty} {item.unit}</span>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <button onClick={() => adjustQuickStoreQty(item.id, -1)} className="p-1 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-md"><MinusCircle size={10} /></button>
                          <button onClick={() => adjustQuickStoreQty(item.id, 1)} className="p-1 bg-green-100 dark:bg-green-500/10 text-green-500 rounded-md"><PlusCircle size={10} /></button>
                        </div>
                      </div>
                      <div className="border-l border-neutral-100 dark:border-neutral-800/80">
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Cafe Stock</span>
                        <span className="font-black text-sm text-orange-500">{item.cafeQty} {item.unit}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                      <span className="text-neutral-400">Value: ₹{(item.storeQty * item.purchasePrice).toLocaleString()}</span>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setFormTransfer({ item: item.id, quantity: '', direction: 'Store ➜ Cafe', notes: '' });
                            setShowTransferModal(true);
                          }}
                          className="px-3 py-1.5 bg-orange-500/10 text-[#FF6B00] rounded-xl flex items-center gap-1 hover:bg-orange-500/20 transition-all"
                        >
                          <RefreshCw size={11} />
                          <span>Transfer</span>
                        </button>
                        <button 
                          onClick={() => setSelectedItemDetail(item)}
                          className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl hover:bg-neutral-200 transition-all"
                        >
                          <span>Manage</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            5. TAB 3: CAFE STOCK (KITCHEN PREP)
            ========================================== */}
        {activeTab === 'cafe' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-neutral-400">Cafe Kitchen Stock</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Daily cooking ingredients & instant stock</p>
            </div>

            <div className="space-y-3.5">
              {inventory.map(item => {
                const isLow = item.cafeQty < item.minLimit / 3;
                return (
                  <div 
                    key={item.id} 
                    className={`rounded-3xl border p-4 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    } ${isLow ? 'border-red-500/40 bg-red-500/[0.01]' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-sm font-black text-[#FF6B00]">{item.name}</span>
                        <p className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">Min Threshold: {item.minLimit / 3} {item.unit}</p>
                      </div>

                      {isLow && (
                        <span className="bg-red-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                          Restock Urgent
                        </span>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Available Kitchen Qty</span>
                        <span className="text-lg font-black">{item.cafeQty} {item.unit}</span>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setFormTransfer({ item: item.id, quantity: '', direction: 'Store ➜ Cafe', notes: '' });
                            setShowTransferModal(true);
                          }}
                          className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl flex items-center gap-1 shadow"
                        >
                          <Plus size={11} /> Request
                        </button>
                        <button
                          onClick={() => {
                            setFormStockOut({ item: item.id, quantity: '', purpose: 'Kitchen Use', remarks: '' });
                            setShowStockOutModal(true);
                          }}
                          className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-400 font-black text-[9px] uppercase tracking-wider rounded-xl"
                        >
                          Out
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            6. TAB 4: STOCK TRANSFER LOGISTICS
            ========================================== */}
        {activeTab === 'transfer' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-black uppercase tracking-widest text-neutral-400">Logistics & Transfers</h2>
              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Dispatch materials between Godown & Kitchen</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <button 
                onClick={() => {
                  setFormTransfer({ item: '', quantity: '', direction: 'Store ➜ Cafe', notes: '' });
                  setShowTransferModal(true);
                }}
                className="p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-3xl font-black uppercase tracking-wider shadow"
              >
                🏬 Godown ➜ 🍕 Cafe
              </button>
              <button 
                onClick={() => {
                  setFormTransfer({ item: '', quantity: '', direction: 'Cafe ➜ Store', notes: '' });
                  setShowTransferModal(true);
                }}
                className="p-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 rounded-3xl font-black uppercase tracking-wider text-neutral-400"
              >
                🍕 Cafe ➜ 🏬 Godown
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-1">Recent Transfer Audit Log</h3>
              
              <div className="space-y-2.5">
                {transferHistory.map(log => (
                  <div key={log.id} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} text-xs space-y-2`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{log.itemName}</span>
                      <span className="bg-blue-100 dark:bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide">
                        {log.direction}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-neutral-400 uppercase tracking-wider border-t border-neutral-50 dark:border-neutral-800/80 pt-2">
                      <span>Qty: {log.qty} {log.unit}</span>
                      <span>By: {log.by}</span>
                      <span>{log.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            7. MORE OVERLAY / SIDEBAR DETAILS
            ========================================== */}
        {activeTab === 'more' && (
          <div className="space-y-6">
            
            {/* SIMULATED MENU FOR MORE SECTION */}
            {currentView === 'dashboard' || currentView === 'more_home' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF6B00] font-black">
                    ➕
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">More Operational Features</h2>
                    <p className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider">Access configurations, audits, and settings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { id: 'stock_in', label: "Purchase / Stock In", desc: "Log invoices and stock incoming goods", icon: <PlusCircle size={16} /> },
                    { id: 'stock_out_logs', label: "Stock Out Logs", desc: "View wastage, damage, and staff use logs", icon: <MinusCircle size={16} /> },
                    { id: 'categories_manager', label: "Manage Categories", desc: "Add, Edit or Remove raw material categories", icon: <Layers size={16} /> },
                    { id: 'reports_list', label: "Reports & Analytics", desc: "Download simulated Excel & PDF stock sheets", icon: <BarChart3 size={16} /> },
                    { id: 'suppliers_list', label: "Manage Suppliers", desc: "Add, edit, delete, and trigger orders", icon: <Truck size={16} /> },
                    { id: 'app_settings', label: "App Settings", desc: "Theme control, auto-sync, database options", icon: <Settings size={16} /> },
                  ].map(option => (
                    <div 
                      key={option.id}
                      onClick={() => {
                        setCurrentView(option.id);
                      }}
                      className={`p-4 rounded-3xl border cursor-pointer hover:border-orange-500 flex items-center justify-between transition-all ${
                        isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-orange-500">{option.icon}</div>
                        <div>
                          <p className="font-bold">{option.label}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5">{option.desc}</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-neutral-400" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* A. PURCHASE / STOCK IN SCREEN */}
            {currentView === 'stock_in' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Purchase Log / Stock In</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <form onSubmit={handleStockInSubmit} className={`p-5 rounded-3xl border space-y-3 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  <div className="space-y-1">
                    <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Invoice Number</label>
                    <input 
                      type="text" 
                      placeholder="e.g. INV-2026-904"
                      value={formStockIn.invoiceNo}
                      onChange={e => setFormStockIn({...formStockIn, invoiceNo: e.target.value})}
                      className="w-full p-3 rounded-2xl border dark:bg-neutral-800 dark:border-neutral-700" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Supplier</label>
                      <select 
                        value={formStockIn.supplier}
                        onChange={e => setFormStockIn({...formStockIn, supplier: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800 dark:border-neutral-700 cursor-pointer"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Item Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. GUD"
                        value={formStockIn.item}
                        onChange={e => setFormStockIn({...formStockIn, item: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800" 
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Quantity</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 50"
                        value={formStockIn.quantity}
                        onChange={e => setFormStockIn({...formStockIn, quantity: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800" 
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Unit</label>
                      <select 
                        value={formStockIn.unit}
                        onChange={e => setFormStockIn({...formStockIn, unit: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800 cursor-pointer"
                      >
                        <option value="Kg">Kg</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Tins">Tins</option>
                        <option value="Packets">Packets</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Purchase Price</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 140"
                        value={formStockIn.price}
                        onChange={e => setFormStockIn({...formStockIn, price: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800" 
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Category</label>
                      <select 
                        value={formStockIn.category}
                        onChange={e => setFormStockIn({...formStockIn, category: e.target.value})}
                        className="w-full p-3 rounded-2xl border dark:bg-neutral-800 cursor-pointer"
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* DIRECT STOCKING LOCATION TARGET SELECTOR */}
                  <div className="space-y-1">
                    <label className="font-black uppercase tracking-wider text-neutral-400 text-[9px]">Deliver Target Location</label>
                    <select 
                      value={formStockIn.targetLocation}
                      onChange={e => setFormStockIn({...formStockIn, targetLocation: e.target.value as any})}
                      className="w-full p-3 rounded-2xl border bg-orange-500/10 border-orange-500/20 text-[#FF6B00] font-black cursor-pointer"
                    >
                      <option value="Main Store">🏬 Main Godown (bulk store)</option>
                      <option value="Cafe Kitchen">🍕 Cafe Kitchen (instant use)</option>
                    </select>
                  </div>

                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl font-black uppercase tracking-wider shadow">
                    Save Receipt ➔
                  </button>
                </form>

                {/* Audit Log */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-400 font-sans">Incoming Purchase Audit Log</h4>
                  {purchaseHistory.map(log => (
                    <div key={log.id} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} text-xs space-y-1`}>
                      <div className="flex justify-between">
                        <span className="font-bold">{log.itemName}</span>
                        <span className="text-green-500 font-bold">₹{log.price * log.qty}</span>
                      </div>
                      <p className="text-[9px] text-neutral-400 uppercase font-sans">Qty: {log.qty} {log.unit} • Delivered: {log.targetLocation} • {log.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. STOCK OUT HISTORY & CONTROL */}
            {currentView === 'stock_out_logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Outward Dispatches</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <div className="space-y-2.5">
                  {stockOutHistory.map(log => (
                    <div key={log.id} className={`p-4 rounded-3xl border ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'} text-xs space-y-2`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold">{log.itemName}</span>
                        <span className="bg-red-100 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide">
                          {log.purpose}
                        </span>
                      </div>
                      <p className="text-neutral-500">{log.remarks}</p>
                      <div className="flex justify-between text-[9px] text-neutral-400 uppercase tracking-widest border-t border-neutral-50 dark:border-neutral-800/80 pt-2">
                        <span>Quantity: {log.qty}</span>
                        {log.financialLoss && log.financialLoss > 0 ? (
                          <span className="text-red-500 font-bold">Loss: ₹{log.financialLoss}</span>
                        ) : null}
                        <span>{log.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. REPORTS PANEL WITH PDF/EXCEL TRIGGER */}
            {currentView === 'reports_list' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Reports Engine</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {[
                    { title: "Daily Store Audit Report", type: "Daily_Report" },
                    { title: "Weekly Consumption Analysis", type: "Weekly_Report" },
                    { title: "Monthly Stock Valuation Ledger", type: "Monthly_Report" },
                    { title: "Wastage and Discards Auditor", type: "Wastage_Report" },
                    { title: "Inter-store Logistics Audit", type: "Transfer_Report" },
                  ].map((rep, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-3xl border flex items-center justify-between ${
                        isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{rep.title}</p>
                        <p className="text-[9px] text-neutral-400 uppercase tracking-wider mt-0.5">Automated compilation engine</p>
                      </div>

                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => triggerSimulationExport(rep.type)}
                          className="px-2.5 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] rounded-xl flex items-center gap-1 font-bold text-[9px] uppercase hover:bg-[#FF6B00]/20"
                        >
                          <FileSpreadsheet size={12} /> Excel
                        </button>
                        <button 
                          onClick={() => {
                            triggerHaptic();
                            toastMessage("PDF Report successfully compiled!");
                          }}
                          className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl flex items-center gap-1 font-bold text-[9px] uppercase"
                        >
                          <FileText size={12} /> PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D. MANAGE SUPPLIERS WITH ADD, EDIT & DELETE */}
            {currentView === 'suppliers_list' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Supplier Register</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <button 
                  onClick={() => setShowAddSupplierModal(true)}
                  className="w-full p-3 bg-[#FF6B00] hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus size={14} /> Add New Supplier
                </button>

                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  {suppliers.map((s) => (
                    <div key={s.id} className={`p-4 rounded-3xl border flex flex-col gap-3 ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-[#FF6B00] text-sm">{s.name}</p>
                          <p className="text-[9px] text-neutral-400 uppercase tracking-widest mt-0.5 font-sans">📞 {s.phone} • 📍 {s.address}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => setEditingSupplier(s)}
                            className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all"
                            title="Edit Supplier"
                          >
                            <Edit size={13} />
                          </button>
                          <button 
                            onClick={() => handleSupplierDelete(s.id, s.name)}
                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                            title="Delete Supplier"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* WHATSAPP REORDER QUICK TRIGGER BUTTON */}
                      <button
                        onClick={() => triggerWhatsAppOrder(s.name)}
                        className="w-full py-2 bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white border border-green-500/20 text-[9px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Share2 size={11} />
                        <span>Send Low Stock Reorder (WhatsApp)</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* E. MANAGE CATEGORIES (DYNAMIC LIST INSIDE TAB) */}
            {currentView === 'categories_manager' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Raw Material Categories</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <form onSubmit={handleCategoryAdd} className="flex gap-2 text-xs">
                  <input 
                    type="text" 
                    placeholder="New category name (e.g. Spices)" 
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value)}
                    className="flex-1 p-3 rounded-2xl border dark:bg-[#1A1A1A] dark:border-neutral-800"
                    required
                  />
                  <button type="submit" className="px-5 py-3 bg-[#FF6B00] text-white rounded-2xl font-black uppercase">Add</button>
                </form>

                {editingCategoryIndex !== null && (
                  <form onSubmit={handleCategoryEditSubmit} className="flex gap-2 text-xs p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <input 
                      type="text" 
                      placeholder="Edit category name..." 
                      value={editingCategoryValue}
                      onChange={e => setEditingCategoryValue(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl border dark:bg-neutral-800"
                      required
                    />
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold uppercase">Update</button>
                    <button type="button" onClick={() => setEditingCategoryIndex(null)} className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-400 rounded-xl">Cancel</button>
                  </form>
                )}

                <div className="grid grid-cols-1 gap-2 text-xs">
                  {categories.map((cat, idx) => (
                    <div key={idx} className={`p-4 rounded-3xl border flex items-center justify-between ${
                      isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'
                    }`}>
                      <span className="font-bold">{cat}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setEditingCategoryIndex(idx);
                            setEditingCategoryValue(cat);
                          }}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all"
                          title="Edit Category"
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => handleCategoryDelete(cat)}
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                          title="Delete Category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* F. SETTINGS PANEL */}
            {currentView === 'app_settings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Application Configuration</h3>
                  <button onClick={() => setCurrentView('more_home')} className="text-xs text-orange-500 font-bold uppercase tracking-wider">Back</button>
                </div>

                <div className={`p-5 rounded-3xl border space-y-4 text-xs ${isDarkMode ? 'bg-[#1A1A1A] border-neutral-800' : 'bg-white border-neutral-100'}`}>
                  
                  {/* Theme Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide">Dark Mode Preference</p>
                      <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Optimal design for low light godowns</p>
                    </div>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-xl"
                    >
                      {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                  </div>

                  {/* Offline Support Status */}
                  <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-4">
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide">Offline PWA Auto-Sync</p>
                      <p className="text-[9px] text-neutral-400 uppercase tracking-wider">Synchronize local cache dynamically</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-500/10 text-green-500 font-black rounded-full text-[9px] uppercase tracking-wider flex items-center gap-1">
                      <Wifi size={10} /> Online
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ==========================================
          8. DETAILED COMPREHENSIVE FLOATING DRAWERS & MODALS
          ========================================== */}
      <AnimatePresence>
        
        {/* A. PRODUCT ITEM SPECIFIC DETAILED DRAWER (WITH ITEM DELETE / EDIT INSIDE) */}
        {selectedItemDetail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-end justify-center">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`w-full max-w-md rounded-t-[2.5rem] p-6 space-y-5 border-t ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#FF6B00]">BumBum Master Details</span>
                  <h3 className="text-lg font-black">{selectedItemDetail.name}</h3>
                  <p className="text-neutral-400 text-xs mt-0.5">{selectedItemDetail.category} • Barcode: {selectedItemDetail.barcode || 'N/A'}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingItem(selectedItemDetail)}
                    className="p-2.5 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl transition-all"
                    title="Edit Item"
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={() => handleItemDelete(selectedItemDetail.id, selectedItemDetail.name)}
                    className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                    title="Delete Item"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={() => setSelectedItemDetail(null)}
                    className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-400 rounded-xl"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Dynamic Qty Spread HUD */}
              <div className="grid grid-cols-2 gap-3.5 text-center text-xs">
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-wider block">Main Godown</span>
                  <span className="font-black text-sm">{selectedItemDetail.storeQty} {selectedItemDetail.unit}</span>
                </div>
                <div className="p-4 bg-orange-500/5 rounded-2xl">
                  <span className="text-[8px] font-black text-[#FF6B00] uppercase tracking-wider block">Cafe Prep Stock</span>
                  <span className="font-black text-sm text-[#FF6B00]">{selectedItemDetail.cafeQty} {selectedItemDetail.unit}</span>
                </div>
              </div>

              {/* Simulated Purchase Timeline */}
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-sans">Activity & Delivery Audit</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-neutral-400" />
                      <span>Last Inward Invoice Log</span>
                    </div>
                    <span className="text-neutral-400">{selectedItemDetail.lastPurchaseDate}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Truck size={12} className="text-neutral-400" />
                      <span>Supplier Agency Partner</span>
                    </div>
                    <span className="font-bold text-[#FF6B00]">{selectedItemDetail.supplier}</span>
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => {
                    setFormTransfer({ item: selectedItemDetail.id, quantity: '', direction: 'Store ➜ Cafe', notes: '' });
                    setSelectedItemDetail(null);
                    setShowTransferModal(true);
                  }}
                  className="flex-1 p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-center font-black text-xs uppercase tracking-wider shadow"
                >
                  Initiate Transfer
                </button>
                <button 
                  onClick={() => {
                    setFormStockOut({ item: selectedItemDetail.id, quantity: '', purpose: 'Kitchen Use', remarks: '' });
                    setSelectedItemDetail(null);
                    setShowStockOutModal(true);
                  }}
                  className="flex-1 p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-400 rounded-2xl text-center font-black text-xs uppercase tracking-wider"
                >
                  Discard / Waste Out
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* B. ITEM EDIT MASTER OVERLAY */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleEditItemSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Edit Stock Item Details</h3>
                <button type="button" onClick={() => setEditingItem(null)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Item Name</label>
                <input 
                  type="text" 
                  value={editingItem.name} 
                  onChange={e => setEditingItem({...editingItem, name: e.target.value.toUpperCase()})}
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Category</label>
                  <select 
                    value={editingItem.category} 
                    onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Purchase Price</label>
                  <input 
                    type="number" 
                    value={editingItem.purchasePrice} 
                    onChange={e => setEditingItem({...editingItem, purchasePrice: parseFloat(e.target.value)})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Min Stock Limit</label>
                  <input 
                    type="number" 
                    value={editingItem.minLimit} 
                    onChange={e => setEditingItem({...editingItem, minLimit: parseInt(e.target.value)})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Barcode</label>
                  <input 
                    type="text" 
                    value={editingItem.barcode || ""} 
                    onChange={e => setEditingItem({...editingItem, barcode: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    placeholder="Barcode Number"
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow">
                Save Changes ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* C. SUPPLIER EDIT OVERLAY */}
        {editingSupplier && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSupplierEditSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#FF6B00]">Edit Supplier Details</h3>
                <button type="button" onClick={() => setEditingSupplier(null)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Supplier Name</label>
                <input 
                  type="text" 
                  value={editingSupplier.name} 
                  onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})}
                  className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Phone</label>
                  <input 
                    type="text" 
                    value={editingSupplier.phone} 
                    onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Address / City</label>
                  <input 
                    type="text" 
                    value={editingSupplier.address} 
                    onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow">
                Save Changes ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* D. INTERACTIVE REAL-TIME BARCODE SCANNER SIMULATOR */}
        {scannerActive && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 text-white space-y-5 text-center relative overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#FF6B00] flex items-center gap-1.5">
                  <QrCode size={16} /> Packed Material Scanner
                </p>
                <button 
                  onClick={() => {
                    setScannerActive(false);
                    setScannedProductDetected(null);
                    setScannerManualBarcode("");
                  }} 
                  className="p-1.5 bg-neutral-800 rounded-xl"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="h-44 w-full bg-black/50 border border-dashed border-[#FF6B00]/40 rounded-3xl relative flex items-center justify-center overflow-hidden">
                <span className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-bounce" />
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-black z-10 animate-pulse">Scanning Camera Feed Simulator</span>
              </div>

              {!scannedProductDetected ? (
                <form onSubmit={handleBarcodeManualScan} className="space-y-4 text-xs text-left">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-wider text-neutral-500">Simulate Scan (Select Packed Material Barcode)</label>
                    <select 
                      onChange={e => setScannerManualBarcode(e.target.value)}
                      value={scannerManualBarcode}
                      className="w-full p-3 rounded-2xl bg-neutral-800 border border-neutral-700 text-white cursor-pointer"
                    >
                      <option value="">-- Choose Barcode --</option>
                      {inventory.map(i => (
                        <option key={i.id} value={i.barcode}>{i.name} (Barcode: {i.barcode || "N/A"})</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full p-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-wider"
                  >
                    Run Barcode Scan Simulator ➔
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSaveScannedStock} className="space-y-4 text-xs text-left">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <p className="text-[8px] font-black text-green-500 uppercase tracking-widest">Matched Material Detected</p>
                    <p className="text-sm font-black mt-1 text-white">{scannedProductDetected.name}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">Stock Status: Godown ({scannedProductDetected.storeQty}) | Kitchen ({scannedProductDetected.cafeQty})</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Qty to Add ({scannedProductDetected.unit})</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 100" 
                      value={scannedAddQty} 
                      onChange={e => setScannedAddQty(e.target.value)} 
                      className="w-full p-3.5 bg-neutral-800 border border-neutral-700 rounded-2xl text-white font-bold"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Select Target Delivery Location</label>
                    <select 
                      value={scannedLocation}
                      onChange={e => setScannedLocation(e.target.value as any)}
                      className="w-full p-3 rounded-2xl bg-neutral-800 border border-neutral-700 text-white cursor-pointer font-bold"
                    >
                      <option value="Main Store">🏬 Main Godown (bulk store)</option>
                      <option value="Cafe Kitchen">🍕 Cafe Kitchen (instant kitchen use)</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="submit" 
                      className="flex-1 p-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black uppercase tracking-wider"
                    >
                      Add Stock ➔
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setScannedProductAtDetected(null)} 
                      className="flex-1 p-3.5 bg-neutral-800 text-neutral-400 rounded-2xl font-black uppercase tracking-wider"
                    >
                      Scan Again
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}

        {/* H. MODAL FORM: STOCK IN / INCOMING */}
        {showAddStockModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleStockInSubmit}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-sans">Stock Receipt (Stock In)</h3>
                <button type="button" onClick={() => setShowAddStockModal(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Item Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CHEESE"
                    value={formStockIn.item}
                    onChange={e => setFormStockIn({...formStockIn, item: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Supplier Name</label>
                  <select 
                    value={formStockIn.supplier}
                    onChange={e => setFormStockIn({...formStockIn, supplier: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Qty</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 10"
                    value={formStockIn.quantity}
                    onChange={e => setFormStockIn({...formStockIn, quantity: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Unit</label>
                  <select 
                    value={formStockIn.unit}
                    onChange={e => setFormStockIn({...formStockIn, unit: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:bg-neutral-800 cursor-pointer"
                  >
                    <option value="Kg">Kg</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Tins">Tins</option>
                    <option value="Packets">Packets</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Purchase Price</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 440"
                    value={formStockIn.price}
                    onChange={e => setFormStockIn({...formStockIn, price: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Category</label>
                  <select 
                    value={formStockIn.category}
                    onChange={e => setFormStockIn({...formStockIn, category: e.target.value})}
                    className="w-full p-3 rounded-xl border dark:bg-neutral-800 cursor-pointer"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="font-black uppercase tracking-wider text-neutral-400 text-[8px]">Deliver Target Location</label>
                <select 
                  value={formStockIn.targetLocation}
                  onChange={e => setFormStockIn({...formStockIn, targetLocation: e.target.value as any})}
                  className="w-full p-3 rounded-xl border bg-orange-500/10 border-orange-500/20 text-[#FF6B00] font-black cursor-pointer"
                >
                  <option value="Main Store">🏬 Main Godown (bulk store)</option>
                  <option value="Cafe Kitchen">🍕 Cafe Kitchen (instant use)</option>
                </select>
              </div>

              <button type="submit" className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow">
                Complete Stock In ➔
              </button>
            </motion.form>
          </div>
        )}

        {/* I. MODAL FORM: ADD SUPPLIER */}
        {showAddSupplierModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
            <motion.form 
              onSubmit={handleSupplierAdd}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-[2rem] p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0F0F0F] border-neutral-800 text-white' : 'bg-white border-neutral-100 text-neutral-900'
              }`}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Merchant Registration</h3>
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl"><X size={14} /></button>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Company / Supplier Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Swastik Packaging Hub"
                  value={formSupplier.name}
                  onChange={e => setFormSupplier({...formSupplier, name: e.target.value})}
                  className="w-full p-3 rounded-xl border dark:bg-neutral-800" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Phone</label>
                  <input 
                    type="text" 
                    placeholder="98765xxxxx"
                    value={formSupplier.phone}
                    onChange={e => setFormSupplier({...formSupplier, phone: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Address</label>
                  <input 
                    type="text" 
                    placeholder="City / Area"
                    value={formSupplier.address}
                    onChange={e => setFormSupplier({...formSupplier, address: e.target.value})}
                    className="w-full p-2.5 rounded-xl border dark:bg-neutral-800" 
                  />
                </div>
              </div>

              <button type="submit" className="w-full p-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow">
                Register Supplier ➔
              </button>
            </motion.form>
          </div>
        )}

      </AnimatePresence>

      {/* FIXED PREMIUM BOTTOM NAVIGATION BAR */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md transition-colors duration-300 ${
        isDarkMode ? 'bg-[#0F0F0F]/90 border-neutral-800 text-white' : 'bg-white/90 border-neutral-100 text-neutral-800'
      }`}>
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1 py-2 text-center">
          <button 
            onClick={() => handleNavClick('home')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'home' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Home size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block">Home</span>
          </button>

          <button 
            onClick={() => handleNavClick('store')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'store' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Store size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block">Main Store</span>
          </button>

          <button 
            onClick={() => handleNavClick('cafe')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'cafe' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Flame size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block">Cafe Stock</span>
          </button>

          <button 
            onClick={() => handleNavClick('transfer')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'transfer' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <RefreshCw size={18} className={activeTab === 'transfer' ? 'animate-spin' : ''} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block">Transfer</span>
          </button>

          <button 
            onClick={() => handleNavClick('more')}
            className={`flex flex-col items-center justify-center py-1 transition-all ${
              activeTab === 'more' ? 'text-[#FF6B00]' : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <MoreHorizontal size={18} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1 block">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
