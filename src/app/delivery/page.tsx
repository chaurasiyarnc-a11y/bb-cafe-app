'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { Phone, MapPin, Check, Loader2, Lock, User, Clock, WifiOff, X, Navigation } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [passcodes, setPasscodes] = useState({ adminPin: "971429", managerPin: "123456" });

  // Check login session & Fetch passcodes on mount
  useEffect(() => {
    const isVerifiedSession = localStorage.getItem('bb_delivery_verified') === 'true';
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
  }, []);

  // Real-time simple query with Client-side filtering (Only Out-For-Delivery & Today's Orders)
  useEffect(() => {
    if (isLocked) return;

    const qSimple = query(
      collection(db, "orders"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(qSimple, (snap) => {
      const allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Filter: Only show orders currently out for delivery today
      const deliveryOrders = allOrders.filter((o: any) => {
        const isStatusMatch = o.status === "out_for_delivery";
        if (!isStatusMatch) return false;

        if (!o.timestamp) return false;
        const orderDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
        return orderDate >= todayStart;
      });
      
      setOrders(deliveryOrders);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, [isLocked]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === passcodes.adminPin || pinInput === passcodes.managerPin) {
      localStorage.setItem('bb_delivery_verified', 'true');
      setIsLocked(false);
      toast.success("Delivery Terminal Unlocked! 🛵");
    } else {
      toast.error("Incorrect PIN! Access Denied.");
      setPinInput("");
    }
  };

  const handleCompleteDelivery = async (order: any) => {
    try {
      // 1. Update Firestore order status to 'delivered'
      await updateDoc(doc(db, "orders", order.id), { status: 'delivered' });
      toast.success("Order Marked Delivered! 🎉");

      // 2. Trigger automatic Loyverse stock synchronization
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

  // --- SECURITY LOCK SCREEN ---
  if (isLocked) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex items-center justify-center p-4">
        <Toaster />
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl text-center relative overflow-hidden">
          <div className="inline-flex p-4 bg-orange-500/10 rounded-full text-orange-500 mb-2">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-orange-500 uppercase italic">Terminal Locked 🔒</h2>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">Delivery Boy Dashboard</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input 
              type="password" 
              maxLength={6}
              placeholder="Enter Access PIN" 
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
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Syncing Deliveries...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080808] min-h-screen text-white p-4 font-sans pb-24">
      <Toaster />
      <header className="border-b border-white/5 pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-orange-500 italic uppercase flex items-center gap-1.5">
            🛵 Delivery Portal
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Out for delivery orders list</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-orange-500/10 text-orange-500 font-black px-3.5 py-1.5 rounded-full text-[10px] border border-orange-500/20">
            Pending: {orders.length}
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('bb_delivery_verified');
              setIsLocked(true);
            }} 
            className="p-2 bg-white/5 rounded-full text-gray-400 active:scale-90 transition-all"
            title="Lock Terminal"
          >
            <Lock size={14} />
          </button>
        </div>
      </header>

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
                  <p className="text-xs font-bold text-white flex items-center gap-1.5 capitalize">
                    <User size={13} className="text-orange-500"/>
                    <span>Customer: {o.customerName || "Guest User"}</span>
                  </p>
                  
                  {/* Google Map Trigger Button */}
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address || "Mohandra")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-gray-300 flex items-start gap-1.5 hover:text-orange-400 leading-normal"
                  >
                    <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="underline line-clamp-2">Address: {o.address}</span>
                  </a>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                    {/* Direct Call Button (tel: integration) */}
                    <a 
                      href={`tel:+91${cleanPhone}`}
                      className="bg-green-600/10 hover:bg-green-600/20 text-green-400 p-3 rounded-xl text-center text-xs font-black uppercase flex items-center justify-center gap-1 border border-green-500/20 active:scale-95 transition-all"
                    >
                      <Phone size={12}/> Call Customer
                    </a>
                    
                    {/* Google Map Directions Trigger */}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}`}
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
