'use client';
import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, updateDoc, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Power, Eye, EyeOff, User, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [storeOpen, setStoreOpen] = useState(true);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u?.phoneNumber === '+919714293759') setIsAdmin(true);
    });
  }, []);

  useEffect(() => {
    //if (!isAdmin) return;
    // Orders
    const qO = query(collection(db, "orders"), orderBy("timestamp", "desc"));
    onSnapshot(qO, (s) => setOrders(s.docs.map(d => ({id: d.id, ...d.data()}))));
    // Menu
    onSnapshot(collection(db, "products"), (s) => setMenu(s.docs.map(d => ({id: d.id, ...d.data()}))));
    // Store
    onSnapshot(doc(db, "settings", "store"), (d) => {
      if(d.exists()) setStoreOpen(d.data().isOpen);
    });
  }, [isAdmin]);

  const toggleItem = async (id: string, current: boolean) => {
    await updateDoc(doc(db, "products", id), { isVisible: !current });
    toast.success("Updated");
  };

  const toggleStore = async () => {
    await setDoc(doc(db, "settings", "store"), { isOpen: !storeOpen });
    toast.success(storeOpen ? "Store Offline" : "Store Online");
  };

  if (!isAdmin) return <div className="p-20 text-center text-white">Access Denied!</div>;

  return (
    <div className="bg-[#0A0A0A] min-h-screen text-white p-6">
      <Toaster />
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black italic text-orange-500">ADMIN PANEL</h1>
        <button onClick={toggleStore} className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 ${storeOpen ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
          <Power size={14}/> {storeOpen ? "ONLINE" : "OFFLINE"}
        </button>
      </header>

      <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl">
        <button onClick={()=>setTab('orders')} className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs ${tab === 'orders' ? 'bg-orange-500' : 'text-white/40'}`}>Orders</button>
        <button onClick={()=>setTab('menu')} className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs ${tab === 'menu' ? 'bg-orange-500' : 'text-white/40'}`}>Menu</button>
      </div>

      {tab === 'orders' ? (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="bg-white/5 p-5 rounded-[2rem] border border-white/10 relative">
              <div className="flex justify-between mb-4">
                <span className="bg-orange-500 px-3 py-1 rounded-lg font-bold text-xs">TOKEN: {o.tokenNumber}</span>
                <span className="text-orange-500 font-bold">₹{o.total}</span>
              </div>
              <div className="space-y-1 mb-4 text-sm opacity-80 border-b border-white/5 pb-4">
                {o.items.map((i:any, idx:number) => <p key={idx}>{i.name} x {i.quantity}</p>)}
              </div>
              <div className="text-[10px] uppercase font-bold space-y-1 opacity-40">
                <p className="flex items-center gap-2"><User size={10}/> {o.customerPhone}</p>
                <p className="flex items-center gap-2"><MapPin size={10}/> {o.address}</p>
                <p className="flex items-center gap-2"><Calendar size={10}/> {o.timestamp?.toDate().toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {menu.map(m => (
            <div key={m.id} className={`flex items-center justify-between p-4 rounded-2xl border ${m.isVisible !== false ? 'bg-white/5 border-white/10' : 'bg-red-500/5 border-red-500/20 opacity-50'}`}>
              <div className="flex gap-4 items-center">
                <img src={m.image} className="w-10 h-10 rounded-xl object-cover" />
                <h4 className="font-bold text-sm">{m.name}</h4>
              </div>
              <button onClick={() => toggleItem(m.id, m.isVisible !== false)} className="p-2 bg-white/5 rounded-lg">
                {m.isVisible !== false ? <Eye size={18} className="text-green-500"/> : <EyeOff size={18} className="text-red-500"/>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
