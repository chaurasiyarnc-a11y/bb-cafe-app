
"use client";
import React, { useState } from 'react';
import { db, storage } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';

export default function MobileAdmin() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleAddDish = async (e: any) => {
    e.preventDefault();
    if (!name || !price || !file) return toast.error("Please fill all details and select a photo!");
    
    setLoading(true);
    try {
      // 1. Upload Image to Firebase Storage
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // 2. Save Data to Firestore
      await addDoc(collection(db, "products"), {
        name,
        price: Number(price),
        image: imageUrl,
        visibility: true,
        stockStatus: 'in-stock',
        createdAt: serverTimestamp()
      });

      toast.success("Dish added to live menu!");
      setName(""); setPrice(""); setFile(null);
    } catch (error) {
      toast.error("Database connection failed!");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pt-10">
      <Toaster />
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-black text-[#FF6B00] mb-2 luxury-text">Admin Panel</h1>
        <p className="text-white/40 text-sm mb-10">Add new items to bbcafe.in</p>
        
        <form onSubmit={handleAddDish} className="space-y-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 glass">
          <div>
            <label className="text-[10px] uppercase font-bold text-white/30 ml-2">Dish Name</label>
            <input type="text" placeholder="e.g. Peri Peri Pizza" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00] mt-1" 
            value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/30 ml-2">Price (₹)</label>
            <input type="number" placeholder="e.g. 349" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00] mt-1" 
            value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div className="bg-white/5 border-2 border-dashed border-white/10 p-6 rounded-2xl text-center relative hover:border-[#FF6B00]/50 transition-all">
            <input type="file" onChange={(e: any) => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
            <p className="text-sm text-white/40">{file ? file.name : "Click to select dish photo"}</p>
          </div>

          <button disabled={loading} className="w-full bg-[#FF6B00] py-5 rounded-2xl font-bold shadow-xl shadow-[#FF6B00]/20 disabled:opacity-50 active:scale-95 transition-all">
            {loading ? "Uploading to Cafe..." : "Publish to Website"}
          </button>
        </form>
      </div>
    </div>
  );
}
