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
  
  const [usernameInput, setUsernameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [cookName, setCookName] = useState(""); 

  const [passcodes, setPasscodes] = useState({ adminPin: "971429", managerPin: "123456" });
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  // प्रिंटर सेटिंग्स स्टेट्स ('rawbt' ब्लूटूथ और यूएसबी दोनों को सपोर्ट करता है)
  const [printerMethod, setPrinterMethod] = useState<"none" | "browser" | "rawbt">("rawbt");
  const [autoPrintOnAccept, setAutoPrintOnAccept] = useState<boolean>(true);
  const [printTargetOrder, setPrintTargetOrder] = useState<any | null>(null);
  const [printType, setPrintType] = useState<"kot" | "bill">("kot"); 

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasPendingOrders, setHasPendingOrders] = useState(false);

  const prevOrdersCountRef = useRef<number | null>(null);
  const alarmIntervalRef = useRef<any>(null);

  const formatBillNumber = (num: number) => String(num).padStart(4, '0');

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

  // लगातार अलार्म लॉजिक (जब तक पेंडिंग आर्डर रहेंगे, तब तक हर 7 सेकंड में बजेगा)
  useEffect(() => {
    const pendingList = orders.filter(o => o.status === 'pending');
    if (pendingList.length > 0) {
      setHasPendingOrders(true);
      if (!alarmIntervalRef.current) {
        alarmIntervalRef.current = setInterval(() => {
          playAlertSound();
          triggerHaptic(800);
        }, 7000);
      }
    } else {
      setHasPendingOrders(false);
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
    };
  }, [orders]);

  useEffect(() => {
    const isVerifiedSession = localStorage.getItem('bb_kds_verified') === 'true';
    if (isVerifiedSession) {
      setIsLocked(false);
      setCookName(localStorage.getItem('bb_kds_cook_name') || "");
    }

    try {
      const savedPrinter = localStorage.getItem('bb_kds_printer_method') as any;
      if (savedPrinter) setPrinterMethod(savedPrinter);
      const savedAutoPrint = localStorage.getItem('bb_kds_autoprint') === 'true';
      setAutoPrintOnAccept(savedAutoPrint);
    } catch (e) {}

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.error(err));
    }
  }, []);

  useEffect(() => {
    if (isLocked) return;
    const qSimple = query(collection(db, "orders"), where("status", "in", ["pending", "preparing", "out_for_delivery"]));
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
      }
      prevOrdersCountRef.current = kitchenOrders.length;
      setOrders(kitchenOrders);
      setLoading(false);
    });
    return () => unsub();
  }, [isLocked]);

  // प्लेन टेक्स्ट KOT जनरेटर (ब्लूटूथ और यूएसबी थर्मल प्रिंटर के लिए)
  const generatePlainTextKOT = (order: any) => {
    const line = "--------------------------------\n";
    const dLine = "================================\n";
    let text = "";
    text += dLine + "       KITCHEN ORDER TICKET     \n               KOT              \n" + dLine;
    text += `TOKEN: #${order.tokenNumber || "N/A"}\nBill No: #${formatBillNumber(order.billNumber || 0)}\nMode: ${order.fulfillmentType?.toUpperCase() || ""}\n`;
    if (order.fulfillmentType === "table") text += `Table: ${order.tableNumber || "N/A"}\n`;
    text += line + "ITEMS:\n";
    order.items?.forEach((item: any) => {
      text += `x${item.quantity} ${item.name}\n`;
      if (item.note) text += `   └─ Note: ${item.note}\n`;
    });
    return text + dLine + "\n\n";
  };

  const generatePlainTextReceipt = (order: any) => {
    const line = "--------------------------------\n";
    const dLine = "================================\n";
    const dateStr = order.timestamp?.toDate ? order.timestamp.toDate().toLocaleString('en-IN') : new Date(order.timestamp).toLocaleString();
    let text = "";
    text += dLine + "          BUM BUM CAFE          \n" + dLine;
    text += `TOKEN: #${order.tokenNumber || "N/A"}\nBill No: #${formatBillNumber(order.billNumber || 0)}\nDate: ${dateStr}\n` + line;
    text += `Mode: ${order.fulfillmentType?.toUpperCase() || ""}\n`;
    if (order.fulfillmentType === "table") text += `Table: ${order.tableNumber || "N/A"}\n`;
    text += `Cust: ${order.customerName || ""}\nPhone: ${order.customerPhone || ""}\n` + line + "ITEMS:\n";
    order.items?.forEach((item: any) => {
      text += `x${item.quantity} ${item.name.padEnd(20).substring(0, 18)} Rs.${item.price * item.quantity}\n`;
      if (item.note) text += `   └─ Note: ${item.note}\n`;
    });
    text += line + `Total Pay: Rs.${order.total || 0}\n` + dLine + "     Thank You! Visit Again     \n" + dLine + "\n\n";
    return text;
  };

  // प्रिंट ट्रिगर (RawBT के जरिए ब्लूटूथ/यूएसबी दोनों पर सीधे प्रिंट भेजेगा)
  const triggerPrintCombined = (order: any, type: "kot" | "bill") => {
    if (printerMethod === "none") return;
    triggerHaptic(20);
    setPrintType(type);

    if (printerMethod === "rawbt") {
      const textStr = type === "kot" ? generatePlainTextKOT(order) : generatePlainTextReceipt(order);
      // यह लिंक RawBT ऐप को ट्रिगर करेगा और ब्लूटूथ/यूएसबी प्रिंटर से तुरंत पर्ची निकाल देगा
      window.location.href = "rawbt:" + encodeURIComponent(textStr);
    } else if (printerMethod === "browser") {
      setPrintTargetOrder(order);
      setTimeout(() => { window.print(); }, 150);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    if (!usernameInput.trim() || !pinInput.trim()) return toast.error("कृपया Username और PIN दोनों दर्ज करें!");

    setIsLoggingIn(true);
    try {
      if (pinInput.trim() === passcodes.adminPin && usernameInput.trim().toLowerCase() === "admin") {
        localStorage.setItem('bb_kds_verified', 'true');
        localStorage.setItem('bb_kds_cook_name', "Admin");
        setCookName("Admin");
        setIsLocked(false);
        toast.success("KDS Unlocked as Admin! 👑");
        return;
      }
      const q = query(collection(db, "staff_members"), where("pin", "==", pinInput.trim()), where("role", "==", "kitchen"));
      const snap = await getDocsFromServer(q) as any;
      const matchedCookDoc = snap.docs.find((doc: any) => doc.data().name?.trim().toLowerCase() === usernameInput.trim().toLowerCase());

      if (matchedCookDoc) {
        const cook = matchedCookDoc.data();
        localStorage.setItem('bb_kds_verified', 'true');
        localStorage.setItem('bb_kds_cook_name', cook.name);
        setCookName(cook.name);
        setIsLocked(false);
        toast.success(`Welcome, Chef ${cook.name}! 👨‍🍳`);
      } else {
        toast.error("Incorrect Name or PIN! ❌");
        setPinInput("");
      }
    } catch (err) {
      toast.error("लॉगिन एरर।");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const fType = order.fulfillmentType || "delivery";
    let nextStatus = currentStatus === 'pending' ? 'preparing' : currentStatus === 'preparing' ? ((fType === "pickup" || fType === "table") ? 'delivered' : 'out_for_delivery') : 'delivered';

    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Status: ${nextStatus.replace('_', ' ')}`);
      
      // आर्डर स्वीकार करते ही ऑटोमेटिक KOT प्रिंट हो जाएगी (ब्लूटूथ/यूएसबी प्रिंटर पर)
      if (currentStatus === 'pending' && autoPrintOnAccept) {
        triggerPrintCombined(order, "kot");
      }
    } catch (e) {
      toast.error("Failed to update.");
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    triggerHaptic(50);
    if (!window.confirm("क्या आप इस आर्डर को रिजेक्ट करना चाहते हैं?")) return;
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "rejected" });
      toast.success("आर्डर ख़ारिज कर दिया गया! 🚫");
    } catch (e) {}
  };

  const handleToggleStoreStatus = async () => {
    triggerHaptic(50);
    try {
      await updateDoc(doc(db, "settings", "store"), { isOpen: !isStoreOpen });
      toast.success(`Store: ${!isStoreOpen ? "Open" : "Closed"}`);
    } catch (e) {}
  };

  const triggerHaptic = (ms = 35) => {
    if (typeof window !== 'undefined' && window.navigator?.vibrate) window.navigator.vibrate(ms);
  };

  if (isLocked) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4">
        <link rel="manifest" href="/kitchen-manifest.json" />
        <Toaster />
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center">
          <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2"><Lock size={28} /></div>
          <div>
            <h2 className="text-xl font-black text-orange-500 uppercase italic">KDS Locked 🔒</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Kitchen Display System</p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input type="text" placeholder="Enter Username" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white" required />
            <input type="text" maxLength={6} placeholder="Enter PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value)} style={{ WebkitTextSecurity: 'disc' } as any} className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest" required />
            <button type="submit" disabled={isLoggingIn} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all">
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
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Syncing...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080808] min-h-screen text-white p-4 font-sans">
      <link rel="manifest" href="/kitchen-manifest.json" />
      <Toaster />

      <header className="border-b border-white/5 pb-3 mb-5 flex flex-row flex-nowrap justify-between items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <div>
            <h1 className="text-sm md:text-base font-black text-orange-500 italic uppercase tracking-tight">
              Bum Bum Cafe {cookName ? `- Chef ${cookName}` : ''}
            </h1>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live KDS (Printer Ready)
            </p>
          </div>
        </div>

        {/* सिंगल लाइन हेडर कंट्रोल्स */}
        <div className="flex flex-row flex-nowrap items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 px-2 py-1 rounded-xl">
            <span className="text-[9px] font-bold text-gray-400">🖨️</span>
            <select
              value={printerMethod}
              onChange={(e) => {
                setPrinterMethod(e.target.value as any);
                localStorage.setItem('bb_kds_printer_method', e.target.value);
                toast.success(`Printer Mode: ${e.target.value.toUpperCase()}`);
              }}
              className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-orange-400 font-bold focus:outline-none"
            >
              <option value="none">Off</option>
              <option value="rawbt">RawBT (BT/USB)</option>
              <option value="browser">Browser</option>
            </select>
          </div>
          
          {printerMethod !== "none" && (
            <button
              onClick={() => {
                const next = !autoPrintOnAccept;
                setAutoPrintOnAccept(next);
                localStorage.setItem('bb_kds_autoprint', String(next));
                toast.success(`Auto-Print: ${next ? "ON" : "OFF"}`);
              }}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all ${autoPrintOnAccept ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}
            >
              {autoPrintOnAccept ? "Auto: ON" : "Auto: OFF"}
            </button>
          )}

          <button
            onClick={handleToggleStoreStatus}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all border shrink-0 ${isStoreOpen ? 'bg-green-600/10 text-green-400 border-green-500/20' : 'bg-red-600/10 text-red-400 border-red-500/20'}`}
          >
            {isStoreOpen ? "🟢 Online" : "🔴 Offline"}
          </button>

          <div className="bg-orange-500/10 text-orange-400 font-black px-2.5 py-1 rounded-xl text-[10px] border border-orange-500/25 shrink-0">
            🔥 {orders.length}
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem('bb_kds_verified');
              localStorage.removeItem('bb_kds_cook_name');
              setCookName("");
              setIsLocked(true);
            }} 
            className="p-1.5 bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all shrink-0"
            title="Lock"
          >
            <Lock size={14} />
          </button>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-28 space-y-2">
          <span className="text-3xl">😴</span>
          <h2 className="text-gray-400 font-bold text-xs">अभी कोई आर्डर पेंडिंग नहीं है!</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((o) => (
            <div key={o.id} className={`p-4 rounded-[1.8rem] border relative flex flex-col justify-between ${o.status === 'pending' ? 'bg-red-500/[0.02] border-red-500/20' : o.status === 'preparing' ? 'bg-yellow-500/[0.02] border-yellow-500/20' : 'bg-blue-500/[0.02] border-blue-500/20'}`}>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-white/5 border border-white/10 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-yellow-300">
                    Token: #{o.tokenNumber || "N/A"}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${o.status === 'pending' ? 'bg-red-500/10 text-red-500' : o.status === 'preparing' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {o.status === 'pending' ? 'Pending ⏳' : o.status === 'preparing' ? 'Preparing 👨‍🍳' : 'On Delivery 🛵'}
                  </span>
                </div>

                <div className="space-y-3 border-y border-white/5 py-3 mb-4">
                  {o.items?.map((item: any, idx: number) => (
                    <div key={idx} className="pb-2.5 border-b border-white/[0.03] last:border-b-0 last:pb-0 space-y-1 text-left">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center bg-orange-500/15 border border-orange-500/30 text-orange-400 text-base font-black px-2.5 py-0.5 rounded-lg min-w-[32px]">
                          {item.quantity}x
                        </span>
                        <span className="text-sm font-black text-white tracking-wide capitalize">
                          {item.name}
                        </span>
                      </div>
                      
                      {item.note && (
                        <div className="text-[11px] text-yellow-300 font-bold bg-yellow-500/10 px-2.5 py-1.5 rounded-lg border border-yellow-500/20 flex items-start gap-1">
                          <span>👩‍🍳</span>
                          <span>निर्देश: {item.note}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {o.deliveryArea && (
                  <p className="text-[10px] font-bold text-gray-500 uppercase">📍 Area: {o.deliveryArea}</p>
                )}
                {o.fulfillmentType && (
                  <p className="text-[10px] font-black uppercase tracking-wide text-orange-400">
                    ⚙️ Mode: {o.fulfillmentType === "delivery" ? "Home Delivery 🛵" : o.fulfillmentType === "pickup" ? "Self-Pickup 🛍️" : `Table No. ${o.tableNumber || "N/A"} 🍽️`}
                  </p>
                )}
                
                <button
                  onClick={() => handleUpdateStatus(o.id, o.status)}
                  className={`w-full py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-all active:scale-[0.98] ${o.status === 'pending' ? 'bg-red-600 hover:bg-red-700 text-white' : o.status === 'preparing' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {o.status === 'pending' ? '👨‍🍳 Start Cooking (तैयारी शुरू करें)' : o.status === 'preparing' ? (o.fulfillmentType === "pickup" ? '🛍️ Mark Ready & Handover' : o.fulfillmentType === "table" ? '🍽️ Mark Served' : '🛵 Mark Ready') : '✅ Delivered'}
                </button>

                {printerMethod !== "none" && (
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <button type="button" onClick={() => triggerPrintCombined(o, "kot")} className="py-2 rounded-lg text-[9px] font-black uppercase text-green-400 bg-green-500/5 border border-green-500/20 hover:bg-green-500/10">
                      🖨️ Print KOT
                    </button>
                    <button type="button" onClick={() => triggerPrintCombined(o, "bill")} className="py-2 rounded-lg text-[9px] font-black uppercase text-orange-400 bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/10">
                      🧾 Print Bill
                    </button>
                  </div>
                )}

                <button type="button" onClick={() => handleRejectOrder(o.id)} className="w-full py-2 rounded-lg text-[10px] font-black uppercase text-red-400 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 flex items-center justify-center gap-1">
                  <X size={12} /> Reject Fake Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
