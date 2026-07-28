'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, getDoc, where, getDocsFromServer } from 'firebase/firestore'; 
import { Clock, Check, Loader2, Play, Lock, WifiOff, X, Navigation } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { requestKitchenPermission } from '../../lib/messaging';

export default function KitchenDisplaySystem() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  
  // लॉगिन फ़ील्ड्स (यूज़रनेम और पिन दोनों)
  const [usernameInput, setUsernameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [cookName, setCookName] = useState(""); // Hydration mismatch से बचने के लिए क्लाइंट स्टेट

  const [passcodes, setPasscodes] = useState({ adminPin: "971429", managerPin: "123456" });
  
  // कैफ़े ओपन/क्लोज के लिए स्टोर की स्थिति का स्टेट
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  // --- प्रिंटर सेटिंग्स स्टेट्स ---
  const [printerMethod, setPrinterMethod] = useState<"none" | "browser" | "rawbt">("none");
  const [autoPrintOnAccept, setAutoPrintOnAccept] = useState<boolean>(false);
  const [printTargetOrder, setPrintTargetOrder] = useState<any | null>(null);
  const [printType, setPrintType] = useState<"kot" | "bill">("kot"); 

  // लॉगिन लोडिंग और बटन लॉक के लिए स्टेट
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const prevOrdersCountRef = useRef<number | null>(null);

  const formatBillNumber = (num: number) => String(num).padStart(4, '0');

  // नया ऑर्डर आने पर तेज़ रिंगटोन बजाने का फंक्शन
  const playAlertSound = () => {
    try {
      const audio = new Audio('/kitchen.mp3');
      audio.play().catch(() => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const playBeep = (delay: number, freq: number, dur: number) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
            osc.start();
            osc.stop(audioCtx.currentTime + dur);
          }, delay);
        };
        playBeep(0, 950, 0.4);
        playBeep(450, 950, 0.4);
        playBeep(900, 1200, 0.6);
      });
    } catch (e) {
      console.warn("Sound play error: ", e);
    }
  };

  // Check login session, Fetch passcodes & Register Service Worker
  useEffect(() => {
    const isVerifiedSession = localStorage.getItem('bb_kds_verified') === 'true';
    if (isVerifiedSession) {
      setIsLocked(false);
      setCookName(localStorage.getItem('bb_kds_cook_name') || "");
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

  // Real-time listener for orders
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
        triggerHaptic(500); 
        toast.success("🚨 रसोई घर: नया आर्डर आया है!");
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("नया रसोई आर्डर! 👨‍🍳", {
            body: "कृपया रसोई स्क्रीन चेक करें, नया आर्डर खाना बनाने के लिए आ गया है।",
            icon: "/icon.png",
            vibrate: [400, 150, 400],
            requireInteraction: true
          } as any);
        }
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

  // --- किचन नोटिफिकेशन परमिशन रजिस्टर ---
  useEffect(() => {
    const MY_VAPID_KEY = "BCKwFGxjNPQdsUFLasSoQonNesm5nVYy9uoikufClZCsCFqhJNUWDP9j1Cqujd8VzqwRKn8I3R3exxo85RtPEn0"; 

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
        return; 
      }
      originalAlert(msg);
    };

    try {
      requestKitchenPermission(MY_VAPID_KEY);
    } catch (err) {
      console.warn("FCM Permission registration skipped silently:", err);
    }

    return () => {
      window.alert = originalAlert; 
    };
  }, []);

  // --- प्रिंटिंग हेल्पर फ़ंक्शंस ---
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

  // KOT (केवल रसोई के लिए) प्लेन-टेक्स्ट रसीद जनरेटर
  const generatePlainTextKOT = (order: any) => {
    const line = "--------------------------------\n";
    const dLine = "================================\n";
    let text = "";
    text += dLine;
    text += "       KITCHEN ORDER TICKET     \n";
    text += "               KOT              \n";
    text += dLine;
    text += `TOKEN: #${order.tokenNumber || "N/A"}\n`;
    text += `Bill No: #${formatBillNumber(order.billNumber || 0)}\n`;
    text += `Mode: ${order.fulfillmentType?.toUpperCase() || ""}\n`;
    if (order.fulfillmentType === "table") {
      text += `Table: ${order.tableNumber || "N/A"}\n`;
    }
    text += line;
    text += "ITEMS:\n";
    order.items?.forEach((item: any) => {
      text += `x${item.quantity} ${item.name}\n`;
      if (item.note) {
        text += `   └─ Cooking Note: ${item.note}\n`;
      }
    });
    text += dLine;
    return text;
  };

  // ग्राहकों के लिए पूरी बिल रसीद जनरेटर
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

  // प्रिंट ट्रिगर करने का मुख्य फंक्शन
  const triggerPrintCombined = (order: any, type: "kot" | "bill") => {
    if (printerMethod === "none") return;
    triggerHaptic(20);
    setPrintType(type);

    if (printerMethod === "browser") {
      setPrintTargetOrder(order);
      setTimeout(() => {
        window.print();
      }, 150);
    } else if (printerMethod === "rawbt") {
      const textStr = type === "kot" ? generatePlainTextKOT(order) : generatePlainTextReceipt(order);
      window.location.href = "rawbt:" + encodeURIComponent(textStr);
    }
  };

  // LOGIN: Verifies Entered Username & PIN
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return; // डबल-सबमिशन ब्लॉक करें

    if (!usernameInput.trim() || !pinInput.trim()) {
      return toast.error("कृपया Username और PIN दोनों दर्ज करें!");
    }

    setIsLoggingIn(true);
    const toastId = toast.loading("Verifying kitchen credentials...");
    try {
      // एडमिन लॉगिन बाईपास चेक
      if (pinInput.trim() === passcodes.adminPin && usernameInput.trim().toLowerCase() === "admin") {
        localStorage.setItem('bb_kds_verified', 'true');
        localStorage.setItem('bb_kds_cook_name', "Admin");
        setCookName("Admin");
        setIsLocked(false);
        toast.success("KDS Unlocked as Admin! 👑");
        return;
      }

      // केवल PIN और किचन रोल से पुरानी सुरक्षित क्वेरी
      const q = query(
        collection(db, "staff_members"),
        where("pin", "==", pinInput.trim()),
        where("role", "==", "kitchen")
      );

      // --- 8 सेकंड का टाइमआउट गार्ड ---
      const getDocsWithTimeout = (queryObj: any, timeoutMs = 8000) => {
        return Promise.race([
          getDocsFromServer(queryObj), 
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("KDS_DATABASE_TIMEOUT")), timeoutMs)
          )
        ]);
      };

      const snap = (await getDocsWithTimeout(q)) as any;

      // फ़ायरबेस से डेटा मिलने के बाद क्लाइंट-साइड ही नाम का मिलान (केस-सेंसिटिव से सुरक्षा)
      const matchedCookDoc = snap.docs.find((doc: any) => {
        const dbName = String(doc.data().name || "").trim().toLowerCase();
        const inputName = usernameInput.trim().toLowerCase();
        return dbName === inputName;
      });

      if (matchedCookDoc) {
        const cook = matchedCookDoc.data();
        localStorage.setItem('bb_kds_verified', 'true');
        localStorage.setItem('bb_kds_cook_name', cook.name);
        setCookName(cook.name);
        setIsLocked(false);
        toast.success(`Welcome, Chef ${cook.name}! KDS Unlocked! 👨‍🍳`);
      } else {
        toast.error("Incorrect Name or PIN! Access Denied. ❌");
        setPinInput("");
      }
    } catch (err: any) {
      if (err.message === "KDS_DATABASE_TIMEOUT") {
        toast.error("कनेक्शन धीमा है या डेटाबेस लोड नहीं हो सका! ❌");
      } else {
        toast.error("लॉगिन वेरिफिकेशन फेल हुआ। डेटाबेस एरर।");
      }
      console.error(err);
    } finally {
      toast.dismiss(toastId);
      setIsLoggingIn(false);
    }
  };

  // --- डिलीवरी बॉय को पुश नोटिफिकेशन भेजने की क्रिया ---
  const triggerDeliveryBoyNotification = async (orderId: string) => {
    try {
      const orderSnap = await getDoc(doc(db, "orders", orderId));
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        
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
      nextStatus = (fType === "pickup" || fType === "table") ? 'delivered' : 'out_for_delivery';
    } else if (currentStatus === 'out_for_delivery') {
      nextStatus = 'delivered';
    }

    if (!nextStatus) return;

    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}!`);

      // आर्डर एक्सेप्ट होते ही ऑटो-प्रिंट KOT ट्रिगर करें
      if (currentStatus === 'pending' && autoPrintOnAccept) {
        triggerPrintCombined(order, "kot");
      }

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

  // --- PREMIUM LOCK SCREEN (WITH USERNAME AND PIN) ---
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

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input 
              type="text" 
              placeholder="Enter Your Name / Username" 
              value={usernameInput} 
              onChange={(e) => setUsernameInput(e.target.value)} 
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white placeholder:normal-case"
              required 
            />
            <input 
              type="text" // गूगल पासवर्ड वार्निंग बाईपास के लिए 'text'
              maxLength={6} 
              placeholder="Enter Your PIN" 
              value={pinInput} 
              onChange={(e) => setPinInput(e.target.value)} 
              style={{ WebkitTextSecurity: 'disc' } as any} // पिन के अक्षरों को डॉट (•) दिखाने के लिए CSS
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
              required 
            />
            <button 
              type="submit" 
              disabled={isLoggingIn} // वेरिफिकेशन के समय डबल-क्लिक लॉक करने के लिए
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 disabled:cursor-not-allowed text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
            >
              {isLoggingIn ? "Verifying..." : "Unlock Terminal"}
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

      {/* थर्मल प्रिंटर मीडिया ओवरराइड CSS */}
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
            Bum Bum Cafe - KDS {cookName ? `- Chef ${cookName}` : ''}
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Kitchen Order Screen • Real-time Cooking
          </p>
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
              {autoPrintOnAccept ? "✓ Auto-Print KOT: ON" : "✗ Auto-Print KOT: OFF"}
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
              setCookName("");
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

                {/* --- अत्यंत स्पष्ट और चमकीला आइटम्स डिस्प्ले जो दूर से दिखेगा --- */}
                <div className="space-y-3.5 border-y border-white/5 py-4 mb-5">
                  {o.items?.map((item: any, idx: number) => (
                    <div key={idx} className="pb-3 border-b border-white/[0.03] last:border-b-0 last:pb-0 space-y-1.5 text-left">
                      <div className="flex items-center gap-3">
                        {/* चमकीला बड़ा क्वांटिटी बैज */}
                        <span className="inline-flex items-center justify-center bg-orange-500/15 border border-orange-500/30 text-orange-400 text-lg font-black px-3 py-1 rounded-xl min-w-[38px]">
                          {item.quantity}x
                        </span>
                        {/* बड़ा और साफ़ आइटम नेम */}
                        <span className="text-base font-black text-white tracking-wide capitalize">
                          {item.name}
                        </span>
                      </div>
                      
                      {/* विशेष कुकिंग निर्देश (Highlighted Yellow Box) */}
                      {item.note && (
                        <div className="text-xs text-yellow-300 font-bold bg-yellow-500/10 px-3 py-2 rounded-xl border border-yellow-500/20 shadow-inner flex items-start gap-1.5 leading-relaxed">
                          <span className="text-sm">👩‍🍳</span>
                          <span>निर्देश: {item.note}</span>
                        </div>
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

                {/* केओटी (KOT) और बिल (BILL) प्रिंटिंग के बटन्स */}
                {printerMethod !== "none" && (
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => triggerPrintCombined(o, "kot")}
                      className="py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-green-400 hover:text-green-500 hover:bg-green-500/10 border border-green-500/20 transition-all flex items-center justify-center gap-1"
                    >
                      <span>🖨️ Print KOT (रसोई पर्ची)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerPrintCombined(o, "bill")}
                      className="py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-500 hover:bg-orange-500/10 border border-orange-500/20 transition-all flex items-center justify-center gap-1"
                    >
                      <span>🧾 Print Bill (पूरा बिल)</span>
                    </button>
                  </div>
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

      {/* --- हिडन प्रिंटिंग रसीद ब्लॉक --- */}
      {printTargetOrder && (
        <div id="print-receipt-section" className="hidden print:block text-black bg-white p-4 font-mono text-xs w-[58mm] leading-tight mx-auto text-left">
          {printType === "kot" ? (
            // केओटी (KOT) प्रिंट फॉर्मेट
            <>
              <div className="text-center font-bold text-sm uppercase border-b-2 border-dashed border-black pb-2 mb-2">
                KITCHEN TICKET (KOT)
              </div>
              <div className="space-y-1 text-[10px]">
                <p className="font-bold text-xs text-center">TOKEN: #{printTargetOrder.tokenNumber || "N/A"}</p>
                <p className="text-center">Bill No: #{formatBillNumber(printTargetOrder.billNumber || 0)}</p>
                <div className="border-t border-dashed border-black my-2"></div>
                <p className="font-bold">Mode: {printTargetOrder.fulfillmentType?.toUpperCase()}</p>
                {printTargetOrder.fulfillmentType === "table" && <p>Table No: {printTargetOrder.tableNumber}</p>}
                <div className="border-t border-dashed border-black my-2"></div>
                <p className="font-bold uppercase text-[10px] mb-1">KITCHEN ITEMS:</p>
                {printTargetOrder.items?.map((item: any, idx: number) => (
                  <div key={idx} className="space-y-0.5 mb-1.5 border-b border-gray-100 pb-1">
                    <div className="flex justify-between font-bold text-xs">
                      <span>{item.name} (x{item.quantity})</span>
                    </div>
                    {item.note && <p className="text-[9px] font-bold italic pl-2 bg-gray-50 p-1 rounded">└─ निर्देश: {item.note}</p>}
                  </div>
                ))}
              </div>
              <div className="text-center text-[9px] border-t-2 border-dashed border-black pt-2 mt-4 font-bold">
                *** COOK FAST • SERVE HOT ***
              </div>
            </>
          ) : (
            // ग्राहकों के लिए पूरा बिल प्रिंट फॉर्मेट
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
