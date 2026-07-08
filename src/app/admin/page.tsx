'use client';
import { Phone, MapPin, Calendar, Trash, Edit, Plus } from 'lucide-react';
  
import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase'; // Check karein path sahi hai ya nahi (@/lib/firebase ya ../lib/firebase)
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Power, Eye, EyeOff, User, MapPin, Calendar, CheckCircle2, LogOut, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [storeOpen, setStoreOpen] = useState(true);

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
      toast.success("Product Status Updated");
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
                  <div className="flex items-center gap-2 col-span-2"><Calendar size={12}/> {o.timestamp?.toDate().toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {menu.map((item) => (
              <div key={item.id} className="bg-white/[0.02] p-4 rounded-3xl border border-white/5 flex items-center gap-4">
                <img src={item.image} className="w-16 h-16 rounded-2xl object-cover opacity-80" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{item.name}</h4>
                  <p className="text-orange-500 font-black text-sm">₹{item.price}</p>
                </div>
                <button 
                  onClick={() => toggleItemVisibility(item.id, item.isVisible !== false)}
                  className={`p-4 rounded-2xl transition-all ${item.isVisible !== false ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}
                >
                  {item.isVisible !== false ? <Eye size={20}/> : <EyeOff size={20}/>}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
