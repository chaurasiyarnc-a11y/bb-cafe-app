"use client";
import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';

export default function MobileAdmin() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // फोटो की जगह अब लिंक
  const [loading, setLoading] = useState(false);

  const handleAddDish = async (e: any) => {
    e.preventDefault();
    if (!name || !price || !imageUrl) return toast.error("Please fill all details!");
    
    setLoading(true);
    try {
      // सीधा डेटाबेस (Firestore) में सेव करें
      await addDoc(collection(db, "products"), {
        name,
        price: Number(price),
        image: imageUrl,
        visibility: true,
        stockStatus: 'in-stock',
        createdAt: serverTimestamp()
      });

      toast.success("Super! Dish added to live menu.");
      setName(""); setPrice(""); setImageUrl("");
    } catch (error) {
      toast.error("Error connecting to database. Check your Keys!");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pt-10">
      <Toaster />
      <div className="max-w-lg mx-auto">
        <h1 className="text-4xl font-black text-[#FF6B00] mb-2 italic">Admin Panel</h1>
        <p className="text-white/40 text-sm mb-10 tracking-widest uppercase font-bold">Bum Bum Cafe Manager</p>
        
        <form onSubmit={handleAddDish} className="space-y-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div>
            <label className="text-[10px] uppercase font-bold text-white/30 ml-2">Dish Name</label>
            <input type="text" placeholder="e.g. Super Deluxe Pizza" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00] mt-1" 
            value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/30 ml-2">Price (₹)</label>
            <input type="number" placeholder="e.g. 200" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00] mt-1" 
            value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-white/30 ml-2">Image Link (URL)</label>
            <input type="text" placeholder="Paste photo link here..." className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-[#FF6B00] mt-1 text-xs" 
            value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <p className="text-[9px] text-white/20 mt-2 ml-2">Tip: Google से किसी भी पिज्जा फोटो का लिंक कॉपी करके यहाँ डालें।</p>
          </div>

          <button disabled={loading} className="w-full bg-[#FF6B00] py-5 rounded-2xl font-bold shadow-xl shadow-[#FF6B00]/20 disabled:opacity-50 active:scale-95 transition-all">
            {loading ? "Adding to Menu..." : "Publish to Website"}
          </button>
        </form>
      </div>
    </div>
  );
      }
