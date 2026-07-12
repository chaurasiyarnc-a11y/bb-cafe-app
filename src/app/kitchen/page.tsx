'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Clock, Check, Loader2, Play, AlertCircle, WifiOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function KitchenDisplaySystem() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const prevOrdersCountRef = useRef<number | null>(null);

  // Play Sound alert for kitchen when new order arrives
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5 note
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3); // A5 note
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  };

  useEffect(() => {
    const qKitchen = query(
      collection(db, "orders"),
      where("status", "in", ["pending", "preparing", "out_for_delivery"]),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(qKitchen, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sound alert if a new order arrives
      if (prevOrdersCountRef.current !== null && list.length > prevOrdersCountRef.current) {
        playAlertSound();
        toast.success("🚨 रसोई घर: नया आर्डर आया है!");
      }
      prevOrdersCountRef.current = list.length;
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    const nextStatusMap: { [key: string]: string } = {
      'pending': 'preparing',
      'preparing': 'out_for_delivery',
      'out_for_delivery': 'delivered'
    };
    const nextStatus = nextStatusMap[currentStatus];
    if (!nextStatus) return;

    try {
      await updateDoc(doc(db, "orders", orderId), { status: nextStatus });
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}!`);
    } catch (e) {
      toast.error("Failed to update status.");
    }
  };

  if (loading) {
    return (
      <div className="bg-[#050505] min-h-screen text-white flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 mb-2" size={32} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Kitchen Display Syncing...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#080808] min-h-screen text-white p-6 font-sans">
      <Toaster />
      <header className="border-b border-white/5 pb-4 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-orange-500 italic uppercase">Bum Bum Cafe - KDS</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Kitchen Order Screen • Real-time Cooking</p>
        </div>
        <div className="bg-orange-500/10 text-orange-500 font-black px-4 py-2 rounded-full text-xs border border-orange-500/20">
          🔥 Cooking Orders: {orders.length}
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

              <div className="space-y-3">
                {o.deliveryArea && (
                  <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    📍 Area: {o.deliveryArea}
                  </p>
                )}
                
                <button
                  onClick={() => handleUpdateStatus(o.id, o.status)}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${o.status === 'pending' ? 'bg-red-600 hover:bg-red-700 text-white' : o.status === 'preparing' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {o.status === 'pending' ? (
                    <>👨‍🍳 Start Cooking (तैयारी शुरू करें)</>
                  ) : o.status === 'preparing' ? (
                    <>🛵 Mark Ready (भेजने के लिए तैयार)</>
                  ) : (
                    <>✅ Order Delivered (डिलीवर हो गया)</>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
