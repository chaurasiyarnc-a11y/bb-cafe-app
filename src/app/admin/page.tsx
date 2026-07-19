'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase'; 
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { Power, LogOut, Loader2, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// नव-निर्मित यूटिलिटी फ़ंक्शंस
import { sha256, formatBillNumber } from '../../lib/utils';

// चाइल्ड मॉड्यूल कंपोनेंट्स
import DashboardStats from '../../components/admin/DashboardStats';
import OrdersTab from '../../components/admin/OrdersTab';
import MenuTab from '../../components/admin/MenuTab';
import CustomersTab from '../../components/admin/CustomersTab';
import LoyaltyTab from '../../components/admin/LoyaltyTab';
import SettingsTab from '../../components/admin/SettingsTab';

export default function AdminDashboard() {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'menu' | 'categories' | 'customers' | 'loyalty' | 'banners' | 'reels' | 'header_video' | 'reviews' | 'coupons' | 'roster' | 'proofs' | 'claims' | 'security'>('dashboard');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [storeOpen, setStoreOpen] = useState(true);

  // ऑर्डर्स फ़िल्टर स्टेट्स
  const [orderPeriodFilter, setOrderPeriodFilter] = useState<'today' | 'yesterday' | 'week'>('today');

  // एक्सटेंडेड कलेक्शन्स स्टेट्स
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [socialProofs, setSocialProofs] = useState<any[]>([]);
  const [pointsClaims, setPointsClaims] = useState<any[]>([]);
  const [loyaltyUsers, setLoyaltyUsers] = useState<any[]>([]);
  const [loyaltyRules, setLoyaltyRules] = useState<any[]>([]);
  const [transferLogs, setTransferLogs] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [cafeHelperUsers, setCafeHelperUsers] = useState<any[]>([]);

  // रीयल-टाइम पासकोड्स और रोल
  const [passcodes, setPasscodes] = useState({ adminPin: "", managerPin: "" });
  const [userRole, setUserRole] = useState<'admin' | 'manager' | null>(null);

  // सेल्स डेट रेंज फ़िल्टर्स
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); 
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); 

  const prevOrdersCountRef = useRef<number | null>(null);

  const playNewOrderBeep = () => {
    try {
      const audio = new Audio('/admin.mp3');
      audio.play().catch((err) => console.log("Sound play blocked by browser:", err));
    } catch (e) {}
  };

  useEffect(() => {
    const adminSession = sessionStorage.getItem('bb_cafe_admin_verified');
    const adminRole = sessionStorage.getItem('bb_cafe_admin_role') as 'admin' | 'manager' | null;
    if (adminSession === 'true' && adminRole) {
      setIsVerified(true);
      setUserRole(adminRole);
    }
    setLoading(false);
  }, []);

  // Passcodes Loader और ऑटो सीडिंग
  useEffect(() => {
    const unsubPasscodes = onSnapshot(doc(db, "settings", "passcodes"), async (d) => {
      if (d.exists()) {
        const loaded = {
          adminPin: d.data().adminPin || "",
          managerPin: d.data().managerPin || ""
        };
        if (!loaded.adminPin || !loaded.managerPin) {
          const hashedAdmin = await sha256("971429");
          const hashedManager = await sha256("123456");
          await setDoc(doc(db, "settings", "passcodes"), {
            adminPin: hashedAdmin,
            managerPin: hashedManager
          }, { merge: true });
        } else {
          setPasscodes(loaded);
        }
      } else {
        const hashedAdmin = await sha256("971429");
        const hashedManager = await sha256("123456");
        await setDoc(doc(db, "settings", "passcodes"), {
          adminPin: hashedAdmin,
          managerPin: hashedManager
        });
      }
    });
    return () => unsubPasscodes();
  }, []);

  // रीयल-टाइम डेटाबेस लिसनर्स (SWR और रीयल-टाइम सिंक)
  useEffect(() => {
    if (!isVerified) return;

    const qOrders = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snap) => {
      const currentOrdersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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

    const unsubStore = onSnapshot(doc(db, "settings", "store"), (d) => {
      if (d.exists()) {
        setStoreOpen(d.data().isOpen);
      }
    });

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

    const unsubProofs = onSnapshot(collection(db, "social_proofs"), (snap) => {
      setSocialProofs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

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

    const unsubStaff = onSnapshot(collection(db, "staff_members"), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubCafeHelperUsers = onSnapshot(collection(db, "cafe_users"), (snap) => {
      setCafeHelperUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      unsubCafeHelperUsers();
    };
  }, [isVerified]);

  const verifyPasscode = async (entered: string, stored: string) => {
    if (!stored) return false;
    if (stored.length === 64) {
      const hashed = await sha256(entered);
      return hashed === stored;
    }
    return entered === stored;
  };

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = passcode.trim();

    if (entered === "BUM_BUM_RECOVERY_2026") {
      const hashedAdmin = await sha256("971429");
      const hashedManager = await sha256("123456");
      await setDoc(doc(db, "settings", "passcodes"), {
        adminPin: hashedAdmin,
        managerPin: hashedManager
      }, { merge: true });
      toast.success("Master recovery key activated! Default PINs restored.");
      setPasscode("");
      return;
    }

    const isAdminMatched = await verifyPasscode(entered, passcodes.adminPin);
    const isManagerMatched = await verifyPasscode(entered, passcodes.managerPin);

    if (isAdminMatched) {
      sessionStorage.setItem('bb_cafe_admin_verified', 'true');
      sessionStorage.setItem('bb_cafe_admin_role', 'admin');
      setIsVerified(true);
      setUserRole('admin');
      toast.success("Welcome back, Boss!");
    } else if (isManagerMatched) {
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

  // बिल प्रिंटिंग हेल्पर फ़ंक्शन (नॉन-ब्लॉकिंग विंडो रेंडर)
  const handlePrintReceipt = (order: any) => {
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      return toast.error("Please allow pop-ups in your browser to print the bill.");
    }

    const formattedBillNo = formatBillNumber(order.billNumber || 0);
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

  const applyQuickSalesFilter = (filterType: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filterType === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filterType === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (filterType === 'week') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      end = now;
    } else if (filterType === 'month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      end = now;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    toast.success(`${filterType.toUpperCase()} Filter Applied!`);
  };

  const handleResetSalesData = async () => {
    if (!window.confirm("⚠️ चेतावनी: क्या आप वाकई सभी सेल डेटा (Orders) को डिलीट करके रीसेट करना चाहते हैं? इसे वापस नहीं लाया जा सकेगा!")) return;
    const enteredPin = prompt("सुरक्षा के लिए अपना एडमिन पिन दर्ज करें:");
    if (!enteredPin) return;
    const isMatched = await verifyPasscode(enteredPin, passcodes.adminPin);
    if (!isMatched) {
      return toast.error("गलत पिन दर्ज किया गया! रीसेट रद्द कर दिया गया।");
    }
    toast.loading("सेल डेटा रीसेट किया जा रहा है...", { id: "sales-reset" });
    try {
      const querySnap = await getDocs(collection(db, "orders"));
      const deletePromises = querySnap.docs.map(d => deleteDoc(doc(db, "orders", d.id)));
      await Promise.all(deletePromises);
      toast.success("सभी सेल डेटा रीसेट कर दिया गया है! 🎉", { id: "sales-reset" });
    } catch (err) {
      toast.error("डेटा रीसेट करने में समस्या आई।", { id: "sales-reset" });
    }
  };

  const handleSendDailyClosingReport = () => {
    // टॉप 5 बेस्ट सेलिंग डिशेज की संक्षिप्त रिपोर्ट
    const countsMap: any = {};
    orders.forEach(o => {
      o.items?.forEach((item: any) => {
        if (!item.name) return;
        countsMap[item.name] = (countsMap[item.name] || 0) + (Number(item.quantity) || 1);
      });
    });
    const topDishes = Object.entries(countsMap)
      .map(([name, qty]: any) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const formattedDate = new Date(endDate).toLocaleDateString('en-IN');
    const topDishesText = topDishes.map((d: any, idx: number) => `${idx + 1}. ${d.name} (${d.qty} times)`).join('\n') || 'None';

    const rangeOrders = orders.filter(o => {
      const oDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      const startObj = new Date(startDate); startObj.setHours(0,0,0,0);
      const endObj = new Date(endDate); endObj.setHours(23,59,59,999);
      return oDate >= startObj && oDate <= endObj && o.status !== "rejected";
    });

    const rangeRevenue = rangeOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const message = encodeURIComponent(
`*BUM BUM CAFE - DAILY CLOSING REPORT*
*Date:* ${formattedDate}
--------------------------------------
*Total Orders:* ${rangeOrders.length}
*Total Revenue:* *₹${rangeRevenue}*

*Top Selling Dishes today:*
${topDishesText}
--------------------------------------
Report generated automatically by Bum Bum Cafe POS.`
    );

    window.open(`https://wa.me/919714293759?text=${message}`, '_blank');
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

  const handleSendWhatsAppBill = (order: any) => {
    const phone = String(order.customerPhone || "").replace("+91", "").trim();
    if (!phone) return toast.error("Customer phone not found!");
    const formattedBillNo = formatBillNumber(order.billNumber || 0);
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

Thank you for your order, *${order.customerName || 'Guest'}*! Visit Again! 😊`
    );
    window.open(`https://wa.me/91${phone}?text=${message}`, '_blank');
  };

  const toggleStore = async () => {
    try {
      await setDoc(doc(db, "settings", "store"), { isOpen: !storeOpen }, { merge: true });
      toast.success(storeOpen ? "Cafe is now OFFLINE 🔴" : "Cafe is now ONLINE 🟢");
    } catch (e) { toast.error("Error toggling store"); }
  };

  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex flex-col items-center justify-center font-sans">
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Securing Session...</p>
      </div>
    );
  }

  // सुरक्षा लॉक स्क्रीन
  if (!isVerified) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4 font-sans">
        <link rel="manifest" href="/admin-manifest.json" />
        <Toaster />
        <div className="w-full max-w-md bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center relative overflow-hidden">
          <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-orange-500 italic uppercase">Staff Portal</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra</p>
          </div>

          <form onSubmit={handlePasscodeLogin} className="space-y-4">
            <input 
              type="password" 
              placeholder="Enter Access Key" 
              value={passcode} 
              onChange={(e) => setPasscode(e.target.value)} 
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
              required 
            />
            <button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.98]"
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
      <link rel="manifest" href="/admin-manifest.json" />
      <Toaster />
      
      {/* मुख्य हेडर */}
      <header className="p-6 bg-white/[0.03] border-b border-white/5 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-orange-500 italic uppercase">Admin Control</h1>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Bum Bum Cafe Mohandra ({userRole === 'admin' ? 'Boss' : 'Manager'})</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleStore} className={`px-4 py-2 rounded-full text-[10px] font-black flex items-center gap-2 transition-all border ${storeOpen ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            <Power size={14} /> {storeOpen ? "ONLINE" : "OFFLINE"}
          </button>
          <button onClick={handleLogout} className="p-2 bg-white/5 rounded-full text-gray-400 active:scale-90 transition-all"><LogOut size={18}/></button>
        </div>
      </header>

      {/* --- मुख्य नेविगेशन टैब्स (Tabs menu) --- */}
      <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'orders', label: `📦 Orders (${orders.length})` },
          { id: 'menu', label: '🍔 Menu List' },
          { id: 'customers', label: `👥 Customers` },
          { id: 'loyalty', label: '🎁 Loyalty' },
          { id: 'settings', label: '⚙️ Settings' }
        ].map((t) => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id as any)} 
            className={`px-5 py-3.5 rounded-2xl font-black text-xs whitespace-nowrap uppercase transition-all ${
              tab === t.id ? 'bg-orange-500 text-white shadow-lg animate-none' : 'bg-white/5 text-gray-500 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* --- टैब कंटेंट्स की रेंडरिंग (Tab renders) --- */}
      <main className="p-4 max-w-2xl mx-auto">
        
        {/* 1. डैशबोर्ड टैब */}
        {tab === 'dashboard' && (
          <DashboardStats 
            orders={orders}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            applyQuickSalesFilter={applyQuickSalesFilter}
            handleResetSalesData={handleResetSalesData}
            handleSendDailyClosingReport={handleSendDailyClosingReport}
            handleExportOrders={handleExportOrders}
            handleExportCustomers={handleExportCustomers}
            setSelectedCustomerHistory={() => {}}
          />
        )}

        {/* 2. लाइव ऑर्डर्स टैब */}
        {tab === 'orders' && (
          <OrdersTab 
            orders={orders}
            orderPeriodFilter={orderPeriodFilter}
            setOrderPeriodFilter={setOrderPeriodFilter}
            handlePrintReceipt={handlePrintReceipt}
            handleSendWhatsAppBill={handleSendWhatsAppBill}
            handleStatusChange={handleStatusChange}
            formatBillNumber={formatBillNumber}
          />
        )}

        {/* 3. मेन्यू लिस्ट टैब */}
        {tab === 'menu' && (
          <MenuTab 
            menu={menu}
            categories={categories}
          />
        )}

        {/* 4. कस्टमर्स मैनेजमेंट टैब */}
        {tab === 'customers' && (
          <CustomersTab 
            loyaltyUsers={loyaltyUsers}
            orders={orders}
          />
        )}

        {/* 5. लॉयल्टी और ट्रांसफर लॉग्स टैब */}
        {tab === 'loyalty' && (
          <LoyaltyTab 
            loyaltyRules={loyaltyRules}
            transferLogs={transferLogs}
          />
        )}

        {/* 6. मास्टर सेटिंग्स टैब (सारे बचे हुए मॉड्यूल्स) */}
        {tab === 'settings' && (
          <SettingsTab 
            banners={banners}
            reels={reels}
            coupons={coupons}
            reviews={reviews}
            socialProofs={socialProofs}
            pointsClaims={pointsClaims}
            staff={staff}
            cafeHelperUsers={cafeHelperUsers}
            passcodes={passcodes}
            userRole={userRole}
            storeOpen={storeOpen}
          />
        )}

      </main>
    </div>
  );
}
