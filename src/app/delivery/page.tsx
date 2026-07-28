'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, orderBy, getDoc, getDocsFromServer, where } from 'firebase/firestore'; // <-- यहाँ 'getDocsFromServer' इम्पोर्ट किया गया है
import { Phone, MapPin, Check, Loader2, Lock, User, Clock, WifiOff, X, Navigation } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { requestNotificationPermission } from '../../lib/messaging';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  
  // लॉगिन फ़ील्ड्स
  const [usernameInput, setUsernameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [riderName, setRiderName] = useState(""); 

  // सेटिंग्स बैनर और वेक लॉक
  const [showBatteryWarning, setShowBatteryWarning] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // लाइव टाइम दिखाने के लिए स्टेट
  const [now, setNow] = useState(new Date());

  // 'time ago' को हर मिनट अपडेट करने के लिए टाइमर
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // लॉगिन होने के 8 सेकंड बाद बैटरी बैनर अपने आप बंद करने का टाइमर
  useEffect(() => {
    if (!isLocked) {
      const timer = setTimeout(() => {
        setShowBatteryWarning(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isLocked]);

  // ब्राउज़र ऑडियो अनलॉक और रिंगटोन बजाने का फंक्शन
  const playNotificationRing = () => {
    try {
      const audio = new Audio('/ringtone.mp3');
      audio.play().catch(() => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        const playBeep = (delay: number, frequency: number, duration: number) => {
          setTimeout(() => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
          }, delay);
        };
        playBeep(0, 880, 0.25);   
        playBeep(350, 880, 0.25); 
        playBeep(700, 1100, 0.5); 
      });
    } catch (err) {
      console.error("Audio playback failure:", err);
    }
  };

  // स्क्रीन लॉक रोकने का मैकेनिज्म (Wake Lock)
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock Activated.');
      } catch (err) {
        console.error('Wake Lock request failed:', err);
      }
    }
  };

  useEffect(() => {
    if (!isLocked) {
      requestWakeLock();
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLocked) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = null;
        });
      }
    };
  }, [isLocked]);

  // मोबाइल पर पुश नोटिफिकेशन दिखाने का फंक्शन
  const showLocalNotification = (billNo: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification("नया ऑर्डर आया है! 🛵", {
        body: `Bill No: #${billNo} डिलीवरी के लिए तैयार है।`,
        icon: "/icon.png",
        vibrate: [300, 100, 300, 100, 450],
        tag: 'new-delivery-order',
        requireInteraction: true
      } as any);

      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 450]);
      }

      n.onclick = () => {
        window.focus();
      };
    }
  };

  // Initial mount verification
  useEffect(() => {
    const isVerifiedSession = localStorage.getItem('bb_delivery_verified') === 'true';
    if (isVerifiedSession) {
      setIsLocked(false);
      setRiderName(localStorage.getItem('bb_delivery_boy_name') || "");
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker Registered Successfully!', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
    setLoading(false);
  }, []);

  // Real-time listener for orders
  useEffect(() => {
    if (isLocked) return;

    const qSimple = query(
      collection(db, "orders"),
      where("status", "==", "out_for_delivery")
    );

    const unsub = onSnapshot(qSimple, (snap) => {
      const activeDeliveryList = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const deliveryOrders = activeDeliveryList.filter((o: any) => {
        if (!o.timestamp) return false;
        const orderDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
        return orderDate >= todayStart;
      });

      deliveryOrders.sort((a, b) => {
        const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tA.getTime() - tB.getTime();
      });

      setOrders((prevOrders) => {
        if (prevOrders.length > 0) {
          const prevIds = new Set(prevOrders.map(o => o.id));
          const newAddedOrder = deliveryOrders.find(o => !prevIds.has(o.id));
          if (newAddedOrder) {
            playNotificationRing();
            const formattedBillNo = String(newAddedOrder.billNumber || 0).padStart(4, '0');
            showLocalNotification(formattedBillNo);
          }
        }
        return deliveryOrders;
      });
      
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [isLocked]);

  // Register Token
  useEffect(() => {
    if (isLocked) return;
    const MY_VAPID_KEY = "BCKwFGxjNPQdsUFLasSoQonNesm5nVYy9uoikufCIZCsCFqhJNUWDP9j1Cqujd8VzqwRKn8I3R3exxo85RtPEn0"; 
    const riderId = localStorage.getItem('bb_delivery_boy_id');
    if (riderId) {
      requestNotificationPermission(riderId, MY_VAPID_KEY);
    }
  }, [isLocked]);

  // LOGIN: Verifies entered Username & PIN using getDocsFromServer
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;

    if (!usernameInput.trim() || !pinInput.trim()) {
      return toast.error("कृपया Username और PIN दोनों भरें।");
    }

    setIsLoggingIn(true);
    const toastId = toast.loading("Verifying credentials...");
    
    try {
      // केवल PIN और Role से पुरानी सुरक्षित क्वेरी
      const q = query(
        collection(db, "staff_members"),
        where("pin", "==", pinInput.trim()),
        where("role", "==", "delivery")
      );

      // --- टाइमआउट मैकेनिज्म (8 सेकंड का सेफ्टी गार्ड) ---
      const getDocsWithTimeout = (queryObj: any, timeoutMs = 8000) => {
        return Promise.race([
          getDocsFromServer(queryObj), // <-- यहाँ 'getDocsFromServer' का उपयोग किया गया है (अल्ट्रा स्टेबल)
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("DATABASE_TIMEOUT")), timeoutMs)
          )
        ]);
      };

      const snap = (await getDocsWithTimeout(q)) as any;
      
      // फ़ायरबेस से डेटा मिलने के बाद क्लाइंट-साइड ही नाम का मिलान (केस-सेंसिटिव से सुरक्षा)
      const matchedRiderDoc = snap.docs.find((doc: any) => {
        const dbName = String(doc.data().name || "").trim().toLowerCase();
        const inputName = usernameInput.trim().toLowerCase();
        return dbName === inputName;
      });

      if (matchedRiderDoc) {
        const rider = matchedRiderDoc.data();
        
        localStorage.setItem('bb_delivery_verified', 'true');
        localStorage.setItem('bb_delivery_boy_name', rider.name);
        localStorage.setItem('bb_delivery_boy_id', matchedRiderDoc.id); 
        
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = context.createOscillator();
          osc.frequency.value = 1;
          osc.connect(context.destination);
          osc.start();
          osc.stop(0.1);
        } catch (e) {}

        setRiderName(rider.name);
        setIsLocked(false);
        toast.success(`Welcome back, ${rider.name}! Terminal Unlocked! 🛵`);
      } else {
        toast.error("गलत Username या PIN! एक्सेस अस्वीकृत। ❌");
        setPinInput("");
      }
    } catch (err: any) {
      if (err.message === "DATABASE_TIMEOUT") {
        toast.error("नेटवर्क धीमा है या डेटाबेस लोड नहीं हो सका! कृपया दोबारा प्रयास करें। ❌");
      } else {
        toast.error("लॉगिन वेरिफिकेशन फेल हुआ। डेटाबेस एरर।");
      }
      console.error(err);
    } finally {
      toast.dismiss(toastId);
      setIsLoggingIn(false);
    }
  };

  const handleCompleteDelivery = async (order: any) => {
    const enteredPin = prompt(`Confirm Delivery PIN / OTP:\nKripya customer se poocha gaya 4-digit Delivery PIN darj karein:`);
    if (!enteredPin) return;

    if (String(enteredPin).trim() !== String(order.deliveryPin || "")) {
      return toast.error("गलत Delivery PIN! आर्डर डिलीवर मार्क नहीं किया जा सकता। ❌");
    }

    try {
      await updateDoc(doc(db, "orders", order.id), { status: 'delivered' });
      toast.success("Order Marked Delivered! 🎉");

      try {
        const response = await fetch('/api/loyverse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order)
        });
        const result = await response.json();
        if (result.success) {
          toast.success("Synced with Loyverse POS!");
        }
      } catch (posErr) {
        console.error("POS Sync error on delivery:", posErr);
      }
    } catch (e) {
      toast.error("Failed to complete delivery.");
    }
  };

  // समय को "Time Ago" के रूप में दिखाने का हेल्पर
  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return "";
    const orderDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now.getTime() - orderDate.getTime();
    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
    
    const formattedTime = orderDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (diffMins < 1) return `${formattedTime} (Just Now)`;
    if (diffMins < 60) return `${formattedTime} (${diffMins} min ago)`;
    const diffHrs = Math.floor(diffMins / 60);
    return `${formattedTime} (${diffHrs} hr ago)`;
  };

  // LOCK SCREEN
  if (isLocked) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4">
        <link rel="manifest" href="/delivery-manifest.json" />
        <Toaster />
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center relative overflow-hidden">
          <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-orange-500 uppercase italic">Terminal Locked 🔒</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Delivery Boy Dashboard</p>
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
              type="password" 
              maxLength={4}
              placeholder="Enter 4-Digit PIN" 
              value={pinInput} 
              onChange={(e) => setPinInput(e.target.value)} 
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-center outline-none focus:border-orange-500 text-sm font-bold text-white tracking-widest"
              required 
            />
            <button 
              type="submit" 
              disabled={isLoggingIn}
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
        <link rel="manifest" href="/delivery-manifest.json" />
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Syncing Deliveries...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080808] min-h-screen text-white p-4 font-sans pb-24">
      <link rel="manifest" href="/delivery-manifest.json" />
      <Toaster />
      
      {/* HEADER SECTION */}
      <header className="border-b border-white/5 pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-orange-500 italic uppercase flex items-center gap-1.5">
            🛵 Delivery Portal {riderName ? `- ${riderName}` : ''}
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live Syncing with Database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-orange-500/10 text-orange-500 font-black px-3.5 py-1.5 rounded-full text-[10px] border border-orange-500/20">
            Pending: {orders.length}
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('bb_delivery_verified');
              localStorage.removeItem('bb_delivery_boy_name');
              localStorage.removeItem('bb_delivery_boy_id');
              setRiderName("");
              setIsLocked(true);
            }} 
            className="p-2 bg-white/5 rounded-full text-gray-400 active:scale-90 transition-all"
            title="Lock Terminal"
          >
            <Lock size={14} />
          </button>
        </div>
      </header>

      {/* बैटरी चेतावनी बैनर */}
      {showBatteryWarning && (
        <div className="bg-orange-500/10 border border-orange-500/30 p-5 rounded-3xl mb-6 relative">
          <button 
            onClick={() => setShowBatteryWarning(false)} 
            className="absolute top-4 right-4 text-orange-400 hover:text-white"
          >
            <X size={16} />
          </button>
          <h2 className="text-sm font-black text-orange-500 flex items-center gap-2 mb-2">
            ⚠️ आवश्यक मोबाइल सेटिंग्स (Battery Optimization बंद करें)
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            मोबाइल के 'सोने (Sleep)' या बैटरी बचाने के दौरान आर्डर की घंटी समय पर बजने के लिए यह सेटिंग अवश्य करें:
          </p>
          <ul className="text-[11px] text-gray-400 mt-2 space-y-1.5 list-disc pl-4">
            <li>मोबाइल की <b>होम स्क्रीन</b> पर जाकर इस <b>App आइकन को दबाकर रखें (Long Press)</b>।</li>
            <li>वहाँ <b>App Info (i)</b> या 'ऐप की जानकारी' पर टैप करें।</li>
            <li><b>Battery (बैटरी)</b> विकल्प में जाएँ और इसे <b>"Unrestricted" (बिना रोक-टोक)</b> पर सेट करें।</li>
            <li>सुनिश्चित करें कि <b>Background Activity (पृष्ठभूमि गतिविधि)</b> चालू (Allow) हो।</li>
          </ul>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-32 space-y-2">
          <span className="text-4xl">😴</span>
          <h2 className="text-gray-400 font-bold text-sm">शानदार! अभी कोई भी आर्डर डिलीवरी के लिए पेंडिंग नहीं है।</h2>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const formattedBillNo = String(o.billNumber || 0).padStart(4, '0');
            const cleanPhone = String(o.customerPhone || "").replace("+91", "").trim();
            const safeAddress = o.address || "Mohandra";

            return (
              <div key={o.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-4 relative">
                
                {/* Header Bill Info */}
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-white">Bill No: #{formattedBillNo}</h3>
                    <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mt-0.5">Token Number: #{o.tokenNumber || "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-black text-base leading-none">₹{o.total}</p>
                    <p className="text-[8px] text-gray-500 uppercase tracking-wider mt-1">Cash / UPI Online</p>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="text-xs text-gray-300 font-medium space-y-1">
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">📦 Deliver Items:</p>
                  {o.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-gray-350">
                      <span><strong className="text-orange-500">×{item.quantity}</strong> {item.name}</span>
                    </div>
                  ))}
                </div>

                {/* Customer Details & Actions */}
                <div className="space-y-2.5 bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5 capitalize">
                      <User size={13} className="text-orange-500"/>
                      <span>Customer: {o.customerName || "Guest User"}</span>
                    </p>
                    <p className="text-[10px] font-medium text-gray-400 flex items-center gap-1.5">
                      <Clock size={12} className="text-yellow-500" />
                      <span>{getRelativeTime(o.timestamp)}</span>
                    </p>
                  </div>
                  
                  {/* Google Map Trigger Button */}
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-gray-300 flex items-start gap-1.5 hover:text-orange-400 leading-normal"
                  >
                    <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="underline line-clamp-2">Address: {safeAddress}</span>
                  </a>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    <a 
                      href={cleanPhone ? `tel:+91${cleanPhone}` : '#'}
                      onClick={(e) => { if(!cleanPhone) { e.preventDefault(); toast.error("ग्राहक का फ़ोन नंबर उपलब्ध नहीं है।"); } }}
                      className="bg-green-600/10 hover:bg-green-600/20 text-green-400 p-3 rounded-xl text-center text-xs font-black uppercase flex items-center justify-center gap-1 border border-green-500/20 active:scale-95 transition-all"
                    >
                      <Phone size={12}/> Call Customer
                    </a>
                    
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 p-3 rounded-xl text-center text-xs font-black uppercase flex items-center justify-center gap-1 border border-blue-500/20 active:scale-95 transition-all"
                    >
                      <Navigation size={12}/> View Navigation
                    </a>
                  </div>
                </div>

                {/* Mark Completed Button */}
                <button
                  onClick={() => handleCompleteDelivery(o)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-all"
                >
                  <Check size={14}/> Complete Delivery (डिलीवर हो गया)
                </button>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
