"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { LayoutDashboard, Plus, Trash2, Users, ShoppingBag, Eye, EyeOff, Loader2, LogOut, CheckCircle2, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function BbCafeDashboard() {
  const [activeTab, setActiveTab] = useState('stats'); // stats, add, menu, users
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [variantsJson, setVariantsJson] = useState("");

  // 🟢 लाइव डेटा फेचिंग (Products & Users)
  useEffect(() => {
    const qProd = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubProd = onSnapshot(qProd, (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qUser = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubUser = onSnapshot(qUser, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubProd(); unsubUser(); };
  }, []);

  // 🔵 डिश जोड़ने का फंक्शन
  const handleAddDish = async (e: any) => {
    e.preventDefault();
    if (!name || !imageUrl) return toast.error("नाम और फोटो लिंक ज़रूरी है!");
    setLoading(true);
    try {
      let variations = variantsJson.trim() !== "" ? JSON.parse(variantsJson) : null;
      await addDoc(collection(db, "products"), {
        name, price: price ? Number(price) : 0, image: imageUrl, variants: variations,
        visibility: true, stockStatus: 'in-stock', createdAt: serverTimestamp()
      });
      toast.success("डिश पब्लिश हो गई!");
      setName(""); setPrice(""); setImageUrl(""); setVariantsJson(""); setActiveTab('menu');
    } catch (error) { toast.error("Error!"); }
    setLoading(false);
  };

  // 🔴 डिश डिलीट करने का फंक्शन
  const deleteProduct = async (id: string) => {
    if(confirm("क्या आप वाकई इसे हटाना चाहते हैं?")) {
      await deleteDoc(doc(db, "products", id));
      toast.success("हटा दिया गया!");
    }
  };

  // 🟡 स्टॉक स्टेटस बदलने का फंक्शन
  const toggleStock = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'in-stock' ? 'out-of-stock' : 'in-stock';
    await updateDoc(doc(db, "products", id), { stockStatus: newStatus });
    toast.success("स्टॉक अपडेट हुआ!");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-24">
      <Toaster />
      
      {/* Header */}
      <header className="p-6 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-[#FF6B00] italic">BB ADMIN</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Control Center</p>
        </div>
        <button onClick={() => window.location.href='/'} className="p-2 bg-white/5 rounded-full"><LogOut size={20}/></button>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        
        {/* --- Tab 1: Quick Stats --- */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold flex items-center gap-2"><LayoutDashboard className="text-[#FF6B00]"/> Business Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-6 rounded-[2rem] border border-white/10">
                <ShoppingBag className="text-[#FF6B00] mb-2" size={24}/>
                <p className="text-3xl font-black">{products.length}</p>
                <p className="text-[10px] text-white/40 uppercase font-bold">Menu Items</p>
              </div>
              <div className="glass p-6 rounded-[2rem] border border-white/10">
                <Users className="text-[#FF6B00] mb-2" size={24}/>
                <p className="text-3xl font-black">{users.length}</p>
                <p className="text-[10px] text-white/40 uppercase font-bold">Customers</p>
              </div>
            </div>
            <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-bold uppercase">Store Status</p>
                <p className="text-green-500 font-bold">Accepting Orders ✅</p>
              </div>
              <div className="w-12 h-6 bg-green-500/20 rounded-full flex items-center px-1">
                 <div className="w-4 h-4 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
              </div>
            </div>
          </div>
        )}

        {/* --- Tab 2: Menu Manager --- */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Menu</h2>
              <button onClick={()=>setActiveTab('add')} className="p-2 bg-[#FF6B00] rounded-lg"><Plus size={20}/></button>
            </div>
            <div className="space-y-4">
              {products.map(p => (
                <div key={p.id} className="glass p-4 rounded-3xl border border-white/5 flex gap-4 items-center">
                  <img src={p.image} className="w-16 h-16 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm leading-tight">{p.name}</h4>
                    <p className="text-[#FF6B00] font-black text-sm">₹{p.price || (p.variants && p.variants[0].price)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={()=>toggleStock(p.id, p.stockStatus)} className={`${p.stockStatus === 'in-stock' ? 'text-green-500' : 'text-red-500'}`}>
                      {p.stockStatus === 'in-stock' ? <CheckCircle2 size={20}/> : <XCircle size={20}/>}
                    </button>
                    <button onClick={()=>deleteProduct(p.id)} className="text-white/20 hover:text-red-500"><Trash2 size={20}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Tab 3: Add Item Form --- */}
        {activeTab === 'add' && (
          <div className="animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold mb-6">Add New Dish</h2>
            <form onSubmit={handleAddDish} className="space-y-4 bg-white/5 p-6 rounded-[2.5rem] border border-white/10">
               <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Dish Name" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00]" />
               <input type="number" value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="Base Price (Optional)" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00]" />
               <input value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} placeholder="Image Link (URL)" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00]" />
               <textarea value={variantsJson} onChange={(e)=>setVariantsJson(e.target.value)} placeholder='Variations JSON (e.g. [{"size": "Small", "price": 80}])' className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl outline-none text-xs h-24 font-mono" />
               <button disabled={loading} className="w-full bg-[#FF6B00] py-4 rounded-2xl font-bold shadow-xl flex justify-center items-center gap-2">
                 {loading ? <Loader2 className="animate-spin"/> : <><Plus size={20}/> Add to Website</>}
               </button>
            </form>
          </div>
        )}

        {/* --- Tab 4: Customer List --- */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold">Registered Customers</h2>
            <div className="space-y-4">
              {users.length === 0 && <p className="text-center text-white/20 py-10">No users yet.</p>}
              {users.map(u => (
                <div key={u.id} className="glass p-5 rounded-3xl border border-white/5 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm">{u.phoneNumber || "Guest User"}</p>
                    <p className="text-[10px] text-white/40 uppercase font-bold">Joined: {new Date(u.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#FF6B00]">{u.loyaltyPoints || 0}</p>
                    <p className="text-[8px] uppercase font-bold text-white/30">Points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* --- Mobile Bottom Tab Bar --- */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass border border-white/10 p-3 rounded-[2.5rem] flex justify-around items-center z-[100] max-w-md shadow-2xl">
        <button onClick={()=>setActiveTab('stats')} className={`flex flex-col items-center gap-1 ${activeTab === 'stats' ? 'text-[#FF6B00]' : 'text-white/30'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[8px] font-bold uppercase">Stats</span>
        </button>
        <button onClick={()=>setActiveTab('menu')} className={`flex flex-col items-center gap-1 ${activeTab === 'menu' ? 'text-[#FF6B00]' : 'text-white/30'}`}>
          <ShoppingBag size={20} />
          <span className="text-[8px] font-bold uppercase">Menu</span>
        </button>
        <button onClick={()=>setActiveTab('add')} className="bg-[#FF6B00] p-4 rounded-full -mt-12 border-8 border-[#050505] shadow-2xl active:scale-90 transition-all">
          <Plus size={24} className="text-white" />
        </button>
        <button onClick={()=>setActiveTab('users')} className={`flex flex-col items-center gap-1 ${activeTab === 'users' ? 'text-[#FF6B00]' : 'text-white/30'}`}>
          <Users size={20} />
          <span className="text-[8px] font-bold uppercase">Users</span>
        </button>
      </nav>
    </div>
  );
}
