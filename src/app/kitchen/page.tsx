'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, getDoc, where, getDocs } from 'firebase/firestore';
import { Clock, Check, Loader2, Play, Lock, WifiOff, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { requestKitchenPermission } from '../../lib/messaging';

export default function KitchenDisplaySystem() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [passcodes, setPasscodes] = useState({ adminPin: "971429", managerPin: "123456" });
  
  // कैफ़े ओपन/क्लोज के लिए स्टोर की स्थिति का स्टेट
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  // --- प्रिंटर सेटिंग्स स्टेट्स ---
  const [printerMethod, setPrinterMethod] = useState<"none" | "browser" | "rawbt">("none");
  const [autoPrintOnAccept, setAutoPrintOnAccept] = useState<boolean>(false);
  const [printTargetOrder, setPrintTargetOrder] = useState<any | null>(null);

  const prevOrdersCountRef = useRef<number | null>(null);

  const formatBillNumber = (num: number) => String(num).padStart(4, '0');

  // Play custom MP3 sound alert for kitchen when new order arrives
  const playAlertSound = () => {
    try {
      const audio = new Audio('/kitchen.mp3');
      audio.play().catch((err) => console.log("Sound play blocked by browser:", err));
    } catch (e) {}
  };

  // Check login session, Fetch passcodes & Register Service Worker
  useEffect(() => {
    const isVerifiedSession = localStorage.getItem('bb_kds_verified') === 'true';
    if (isVerifiedSession) {
      setIsLocked(false);
    }

    const fetchPins = async () => {
      try {
        const d = await getDoc(doc(db, "settings", "passcodes"));
        if (d.exists()) {
          setPasscodes({
            adminPin: d.data().adminPin || "971429",
            managerPin: d.data().managerPin || "123456"
          });
        }
      } catch (err) {
        console.error("Failed to load passcodes", err);
      }
    };
    fetchPins();

    // Safely Load Printer Config from LocalStorage
    try {
      const savedPrinter = localStorage.getItem('bb_kds_printer_method') as any;
      if (savedPrinter) setPrinterMethod(savedPrinter);
      
      const savedAutoPrint = localStorage.getItem('bb_kds_autoprint') === 'true';
      setAutoPrintOnAccept(savedAutoPrint);
    } catch (e) {
      console.warn("Error reading printer config", e);
    }

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('KDS Service Worker Registered Successfully!', reg.scope))
        .catch((err) => console.error('KDS Service Worker failed:', err));
    }
  }, []);

  // Real-time simple query with Client-side filtering (Daily Orders Only!)
  useEffect(() => {
    if (isLocked) return;

    const qSimple = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "preparing", "out_for_delivery"])
    );

    const unsub = onSnapshot(qSimple, (snap) => {
      const activeOrdersList = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const kitchenOrders = activeOrdersList.filter((o: any) => {
        if (!o.timestamp) return false;
        const orderDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
        return orderDate >= todayStart;
      });

      kitchenOrders.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tA.getTime() - tB.getTime();
      });
      
      if (prevOrdersCountRef.current !== null && kitchenOrders.length > prevOrdersCountRef.current) {
        playAlertSound();
        toast.success("🚨 रसोई घर: नया आर्डर आया है!");
      }
      prevOrdersCountRef.current = kitchenOrders.length;
      setOrders(kitchenOrders);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [isLocked]);

  // Real-time listener for store status
  useEffect(() => {
    if (isLocked) return;
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (snap) => {
      if (snap.exists()) {
        setIsStoreOpen(snap.data().isOpen);
      }
    });
    return () => unsubStore();
  }, [isLocked]);

  // --- SCREEN AWAKE / KEEP SCREEN ON LOGIC ---
  useEffect(() => {
    if (isLocked) return;

    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          console.log('KDS Screen Wake Lock Activated ☀️');
        }
      } catch (err: any) {
        console.warn('Wake Lock request failed:', err.message);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock) {
        wakeLock.release().then(() => {
          wakeLock = null;
        });
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLocked]);

  // --- किचन नोटिफिकेशन परमिशन रजिस्टर (FCM - On Mount) ---
  useEffect(() => {
    const MY_VAPID_KEY = "BCKwFGxjNPQdsUFLasSoQonNesm5nVYy9uoikufClZCsCFqhJNUWDP9j1Cqujd8VzqwRKn8I3R3exxo85RtPEn0"; 

    // KDS स्क्रीन पर किसी भी FCM, सर्विस वर्कर, टोकन या परमिशन के अलर्ट को पूरी तरह से म्यूट (Silent) करने के लिए इंटरसेप्टर
    const originalAlert = window.alert;
    window.alert = (msg) => {
      if (
        msg && 
        (
          msg.includes("FCM") || 
          msg.includes("Messaging") || 
          msg.includes("subscribing") || 
          msg.includes("credential") ||
          msg.includes("टोकन") ||
          msg.includes("सर्विस वर्कर") ||
          msg.includes("परमिशन") ||
          msg.includes("रजिस्टर") ||
          msg.includes("फ़ायरबेस") ||
          msg.includes("status") ||
          msg.includes("granted")
        )
      ) {
        console.log("Muted KDS popup alert silently:", msg);
        return; // म्यूट कर दिया! कोई ब्राउज़र डायलॉग नहीं दिखेगा।
      }
      originalAlert(msg);
    };

    try {
      requestKitchenPermission(MY_VAPID_KEY);
    } catch (err) {
      console.warn("FCM Permission registration skipped silently:", err);
    }

    return () => {
      window.alert = originalAlert; // अनमाउंट होने पर सामान्य स्थिति रीस्टोर करें
    };
  }, []);

  // --- प्रिंटिंग हेल्पर फ़ंक्शंस (Auto-Print & Manual) ---
  const handlePrinterChange = (method: "none" | "browser" | "rawbt") => {
    setPrinterMethod(method);
    localStorage.setItem('bb_kds_printer_method', method);
    toast.success(`Printer set to: ${method.toUpperCase()}`);
  };

  const handleAutoPrintToggle = () => {
    const next = !autoPrintOnAccept;
    setAutoPrintOnAccept(next);
    localStorage.setItem('bb_kds_autoprint', String(next));
    toast.success(`Auto-Print: ${next ? "ENABLED" : "DISABLED"}`);
  };

  const generatePlainTextReceipt = (order: any) => {
    const line = "--------------------------------\n";
    const dLine = "================================\n";
    const dateStr = order.timestamp?.toDate 
      ? order.timestamp.toDate().toLocaleString('en-IN') 
      : new Date(order.timestamp).toLocaleString();
    
    let text = "";
    text += dLine;
    text += "          BUM BUM CAFE          \n";
    text += dLine;
    text += `TOKEN: #${order.tokenNumber || "N/A"}\n`;
    text += `Bill No: #${formatBillNumber(order.billNumber || 0)}\n`;
    text += `Date: ${dateStr}\n`;
    text += line;
    text += `Mode: ${order.fulfillmentType?.toUpperCase() || ""}\n`;
    if (order.fulfillmentType === "table") {
      text += `Table: ${order.tableNumber || "N/A"}\n`;
    }
    text += `Cust: ${order.customerName || ""}\n`;
    text += `Phone: ${order.customerPhone || ""}\n`;
    if (order.address) {
      text += `Addr: ${order.address}\n`;
    }
    text += line;
    text += "ITEMS:\n";
    order.items?.forEach((item: any) => {
      text += `x${item.quantity} ${item.name.padEnd(20).substring(0, 18)} Rs.${item.price * item.quantity}\n`;
      if (item.note) {
        text += `   └─ Note: ${item.note}\n`;
      }
    });
    text += line;
    text += `Subtotal: Rs.${order.subtotal || 0}\n`;
    if (order.discount > 0) {
      text += `Discount: -Rs.${order.discount}\n`;
    }
    text += `Total Pay: Rs.${order.total || 0}\n`;
    text += dLine;
    text += "     Thank You! Visit Again     \n";
    text += dLine;
    return text;
  };

  const triggerPrint = (order: any) => {
    if (printerMethod === "none") return;
    triggerHaptic(20);

    if (printerMethod === "browser") {
      setPrintTargetOrder(order);
      setTimeout(() => {
        window.print();
      }, 150);
    } else if (printerMethod === "rawbt") {
      const textStr = generatePlainTextReceipt(order);
      window.location.href = "rawbt:" + encodeURIComponent(textStr);
    }
  };

  // LOGIN: Verifies Entered PIN against personal Cook account in Firestore
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Verifying kitchen credentials...");
    try {
      if (pinInput === passcodes.adminPin) {
        toast.dismiss(toastId);
        localStorage.setItem('bb_kds_verified', 'true');
        localStorage.setItem('bb_kds_cook_name', "Admin");
        setIsLocked(false);
        toast.success("KDS Unlocked as Admin! 👑");
        return;
      }

      const q = query(
        collection(db, "staff_members"),
        where("pin", "==", pinInput),
        where("role", "==", "kitchen")
      );
      const snap = await getDocs(q);
      toast.dismiss(toastId);

      if (!snap.empty) {
        const cook = snap.docs[0].data();
        localStorage.setItem('bb_kds_verified', 'true');
        localStorage.setItem('bb_kds_cook_name', cook.name);
        setIsLocked(false);
        toast.success(`Welcome, Chef ${cook.name}! KDS Unlocked! 👨‍🍳`);
      } else {
        toast.error("Incorrect PIN! Access Denied.");
        setPinInput("");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Login verification failed. Database error.");
    }
  };

  // --- डिलीवरी बॉय को पुश नोटिफिकेशन भेजने की क्रिया (केवल Delivery ऑर्डर्स के लिए) ---
  const triggerDeliveryBoyNotification = async (orderId: string) => {
    try {
      const orderSnap = await getDoc(doc(db, "orders", orderId));
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        
        // Self-Pickup या Dine-In (Table) ऑर्डर होने पर डिलीवरी नोटिफिकेशन बाईपास करें
        const fType = orderData.fulfillmentType || "";
        if (fType === "pickup" || fType === "table") {
          console.log(`Order #${orderId} is ${fType}. Skipping delivery boy notification.`);
          return; 
        }

        const assignedTo = orderData.assignedTo || orderData.deliveryBoyId;
        const tokenNumber = orderData.tokenNumber || "N/A";

        if (assignedTo) {
          const staffSnap = await getDoc(doc(db, "staff_members", assignedTo));
          if (staffSnap.exists() && staffSnap.data().fcmToken) {
            const dToken = staffSnap.data().fcmToken;

            await fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: dToken,
                title: "नया आर्डर तैयार है! 🛵",
                body: `टोकन संख्या #${tokenNumber} डिलीवर करने के लिए तैयार है।`,
                url: "/delivery"
              })
            });
            console.log("FCM notification sent successfully to delivery boy!");
          } else {
            console.warn("Delivery boy fcmToken not found in staff_members.");
          }
        }
      }
    } catch (error) {
      console.error("Failed to send FCM notification to delivery boy:", error);
    }
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const fType = order.fulfillmentType || "delivery";

    // डायनामिक स्टेटस बदलाव (Fulfillment Type के आधार पर)
    let nextStatus = "";
    if (currentStatus === 'pending') {
      nextStatus = 'preparing';
    } else if (currentStatus === 'preparing') {
      // Self-Pickup (pickup) और Dine-In (table) ऑर्डर्स सीधे Delivered (पूर्ण) हो जाएंगे
      nextStatus = (fType === "pickup" || fType === "table") ? 'delivered' : 'out_for_delivery';
    } else if (currentStatus === 'out_for_delivery') {
      nextStatus = 'delivered';
    }

    if (!nextStatus) return;

    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}!`);

      // आर्डर एक्सेप्ट (Pending -> Preparing) होते ही ऑटो-प्रिंट ट्रिगर करें
      if (currentStatus === 'pending' && autoPrintOnAccept) {
        triggerPrint(order);
      }

      // केवल Delivery वाले ऑर्डर्स होने पर ही डिलीवरी बॉय को पुश नोटिफिकेशन जाएगा
      if (currentStatus === 'preparing' && fType === 'delivery') {
        triggerDeliveryBoyNotification(orderId);
      }
    } catch (e) {
      toast.error("Failed to update status.");
    }
  };

  // Mark order as Fake / Rejected
  const handleRejectOrder = async (orderId: string) => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप वाकई इस आर्डर को 'फेक आर्डर' मानकर रिजेक्ट करना चाहते हैं?")) return;

    try {
      await updateDoc(doc(db, "orders", orderId), { status: "rejected" });
      toast.success("आर्डर सफलतापूर्वक रिजेक्ट और ख़ारिज कर दिया गया है! 🚫");
    } catch (e) {
      toast.error("ऑर्डर रिजेक्ट करने में समस्या आई।");
    }
  };

  // Toggle Cafe online/offline status from KDS
  const handleToggleStoreStatus = async () => {
    triggerHaptic(50);
    try {
      await updateDoc(doc(db, "settings", "store"), { isOpen: !isStoreOpen });
      toast.success(`Store status updated to ${!isStoreOpen ? "Open" : "Closed"}!`);
    } catch (e) {
      toast.error("Failed to update store status.");
    }
  };

  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(ms);
    }
  };

  // --- SECURITY LOCK SCREEN ---
  if (isLocked) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4">
        <link rel="manifest" href="/kitchen-manifest.json" />
        <Toaster />
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center relative overflow-hidden">
          <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-orange-500 uppercase italic">KDS Locked 🔒</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Kitchen Display System</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              type="password" 
              maxLength={6} 
              placeholder="Enter Your Personal PIN" 
              value={pinInput} 
              onChange={(e) => setPinInput(e.target.value)} 
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
              required 
            />
            <button 
              type="submit" 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
            >
              Unlock Terminal
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex flex-col items-center justify-center">
        <link rel="manifest" href="/kitchen-manifest.json" />
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Kitchen Display Syncing...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080808] min-h-screen text-white p-6 font-sans">
      <link rel="manifest" href="/kitchen-manifest.json" />
      <Toaster />

      {/* थर्मल प्रिंटर मीडिया ओवरराइड CSS - पूरे वेबपेज को हाइड करके केवल 58mm का बिल प्रिंट करने के लिए */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-receipt-section, #print-receipt-section * {
            visibility: visible !important;
          }
          #print-receipt-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 58mm !important;
            margin: 0 !important;
            padding: 5px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}} />

      <header className="border-b border-white/5 pb-4 mb-6 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-orange-500 italic uppercase">
            Bum Bum Cafe - KDS {typeof window !== 'undefined' && localStorage.getItem('bb_kds_cook_name') ? `- Chef ${localStorage.getItem('bb_kds_cook_name')}` : ''}
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Kitchen Order Screen • Real-time Cooking</p>
        </div>

        {/* प्रिंटर कॉन्फ़िगरेशन पैनल */}
        <div className="flex flex-wrap items-center gap-2 bg-white/[0.02] border border-white/5 p-2 rounded-2xl">
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-[10px] uppercase font-bold text-gray-400">🖨️ Printer:</span>
            <select
              value={printerMethod}
              onChange={(e) => handlePrinterChange(e.target.value as any)}
              className="bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-orange-400 font-bold focus:outline-none focus:border-orange-500"
            >
              <option value="none">Disabled (बंद)</option>
              <option value="browser">Browser / Kiosk</option>
              <option value="rawbt">RawBT (Android App)</option>
            </select>
          </div>
          
          {printerMethod !== "none" && (
            <button
              onClick={handleAutoPrintToggle}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${autoPrintOnAccept ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}
            >
              {autoPrintOnAccept ? "✓ Auto-Print: ON" : "✗ Auto-Print: OFF"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleStoreStatus}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all shadow border ${isStoreOpen ? 'bg-green-600/10 text-green-500 border-green-500/20' : 'bg-red-600/10 text-red-500 border-red-500/20'}`}
          >
            {isStoreOpen ? "🟢 Cafe: Online" : "🔴 Cafe: Offline"}
          </button>
          <div className="bg-orange-500/10 text-orange-500 font-black px-4 py-2 rounded-full text-xs border border-orange-500/20">
            🔥 Cooking Orders: {orders.length}
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('bb_kds_verified');
              localStorage.removeItem('bb_kds_cook_name');
              setIsLocked(true);
            }} 
            className="p-2.5 bg-white/5 rounded-full text-gray-400 active:scale-90 transition-all"
            title="Lock Terminal"
          >
            <Lock size={16} />
          </button>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-32 space-y-2">
          <span className="text-4xl">😴</span>
          <h2 className="text-gray-400 font-bold text-sm">अभी कोई आर्डर पेंडिंग नहीं है! रसोइया आराम कर सकते हैं।</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((o) => (
            <div key={o.id} className={`p-5 rounded-[2rem] border relative flex flex-col justify-between ${o.status === 'pending' ? 'bg-red-500/[0.02] border-red-500/20' : o.status === 'preparing' ? 'bg-yellow-500/[0.02] border-yellow-500/20' : 'bg-blue-500/[0.02] border-blue-500/20'}`}>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-white/5 border border-white/10 text-[10px] font-black uppercase px-3 py-1 rounded-full text-yellow-300">
                    Token: #{o.tokenNumber || "N/A"}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md ${o.status === 'pending' ? 'bg-red-500/10 text-red-500' : o.status === 'preparing' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {o.status === 'pending' ? 'Pending ⏳' : o.status === 'preparing' ? 'Preparing 👨‍🍳' : 'On Delivery 🛵'}
                  </span>
                </div>

                <div className="space-y-2 border-y border-white/5 py-3 mb-4">
                  {o.items?.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm font-bold text-gray-200">
                      <p className="flex justify-between">
                        <span><strong className="text-orange-500">×{item.quantity}</strong> {item.name}</span>
                      </p>
                      {item.note && (
                        <p className="text-[10px] text-orange-400 font-medium italic mt-1 bg-orange-500/5 px-2.5 py-1 rounded border border-orange-500/10">
                          👩‍🍳 निर्देश: {item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {o.deliveryArea && (
                  <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    📍 Area: {o.deliveryArea}
                  </p>
                )}

                {/* Fulfillment mode indicator */}
                {o.fulfillmentType && (
                  <p className="text-[10px] font-black uppercase tracking-wide flex items-center gap-1 text-orange-400">
                    ⚙️ Mode: {o.fulfillmentType === "delivery" ? "Home Delivery 🛵" : o.fulfillmentType === "pickup" ? "Self-Pickup 🛍️" : `Table No. ${o.tableNumber || "N/A"} 🍽️`}
                  </p>
                )}
                
                <button
                  onClick={() => handleUpdateStatus(o.id, o.status)}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${o.status === 'pending' ? 'bg-red-600 hover:bg-red-700 text-white' : o.status === 'preparing' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {o.status === 'pending' ? (
                    <>👨‍🍳 Start Cooking (तैयारी शुरू करें)</>
                  ) : o.status === 'preparing' ? (
                    o.fulfillmentType === "pickup" ? (
                      <>🛍️ Mark Ready & Handover (पैक करके सौंपें)</>
                    ) : o.fulfillmentType === "table" ? (
                      <>🍽️ Mark Served (टेबल पर परोसें)</>
                    ) : (
                      <>🛵 Mark Ready (भेजने के लिए तैयार)</>
                    )
                  ) : (
                    <>✅ Order Delivered (डिलीवर हो गया)</>
                  )}
                </button>

                {/* मैनुअल पर्ची प्रिंट करने का बटन (अगर सेटिंग्स में प्रिंटर ऑन है) */}
                {printerMethod !== "none" && (
                  <button
                    type="button"
                    onClick={() => triggerPrint(o)}
                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-500 hover:bg-orange-500/10 border border-orange-500/20 transition-all flex items-center justify-center gap-1.5 mt-1.5"
                    title="Print Bill Receipt"
                  >
                    <span>🖨️ Print Bill Receipt (पर्ची प्रिंट करें)</span>
                  </button>
                )}

                {/* Reject/Fake Order Button */}
                <button
                  type="button"
                  onClick={() => handleRejectOrder(o.id)}
                  className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center justify-center gap-1 mt-1"
                >
                  <X size={12} />
                  <span>Reject Fake Order (ख़ारिज करें)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- हिडन प्रिंटिंग रसीद ब्लॉक (केवल Browser Print ट्रिगर होने पर रेंडर होगा) --- */}
      {printTargetOrder && (
        <div id="print-receipt-section" className="hidden print:block text-black bg-white p-4 font-mono text-xs w-[58mm] leading-tight mx-auto text-left">
          <div className="text-center font-bold text-sm uppercase border-b-2 border-dashed border-black pb-2 mb-2">
            BUM BUM CAFE
          </div>
          <div className="space-y-1 text-[10px]">
            <p className="font-bold text-xs text-center">TOKEN: #{printTargetOrder.tokenNumber || "N/A"}</p>
            <p className="text-center">Bill No: #{formatBillNumber(printTargetOrder.billNumber || 0)}</p>
            <p className="text-center">Date: {printTargetOrder.timestamp?.toDate ? printTargetOrder.timestamp.toDate().toLocaleString('en-IN') : new Date(printTargetOrder.timestamp).toLocaleString()}</p>
            <div className="border-t border-dashed border-black my-2"></div>
            <p className="font-bold">Mode: {printTargetOrder.fulfillmentType?.toUpperCase()}</p>
            {printTargetOrder.fulfillmentType === "table" && <p>Table No: {printTargetOrder.tableNumber}</p>}
            <p>Customer: {printTargetOrder.customerName}</p>
            <p>Phone: {printTargetOrder.customerPhone}</p>
            {printTargetOrder.address && <p className="line-clamp-2">Address: {printTargetOrder.address}</p>}
            <div className="border-t border-dashed border-black my-2"></div>
            <p className="font-bold uppercase text-[10px] mb-1">ITEMS:</p>
            {printTargetOrder.items?.map((item: any, idx: number) => (
              <div key={idx} className="space-y-0.5 mb-1.5">
                <div className="flex justify-between font-bold">
                  <span>{item.name} (x{item.quantity})</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
                {item.note && <p className="text-[9px] italic pl-2">└─ Note: {item.note}</p>}
              </div>
            ))}
            <div className="border-t border-dashed border-black my-2"></div>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{printTargetOrder.subtotal || 0}</span>
            </div>
            {printTargetOrder.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₹{printTargetOrder.discount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t border-dashed border-black pt-1 mt-1">
              <span>Total Pay:</span>
              <span>₹{printTargetOrder.total || 0}</span>
            </div>
          </div>
          <div className="text-center text-[9px] border-t-2 border-dashed border-black pt-2 mt-4">
            *** Thank you! Visit Again ***
          </div>
        </div>
      )}
    </div>
  );
}
