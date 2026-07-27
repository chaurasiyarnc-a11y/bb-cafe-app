'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, ShieldAlert, Truck, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function StaffLauncher() {
  const router = useRouter();
  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState<string | null>(null); 
  const [pinInput, setPinInput] = useState('');
  
  // कैफ़े का मास्टर एडमिन पिन (सुरक्षा के लिए)
  const MASTER_ADMIN_PIN = "1234"; 

  useEffect(() => {
    const savedRole = localStorage.getItem('bb_staff_role');
    if (savedRole) {
      setActiveWorkspace(savedRole);
      router.replace(`/${savedRole}`);
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleSelectWorkspace = (role: string, needsAuth: boolean) => {
    if (needsAuth) {
      setShowPinModal(role);
      setPinInput('');
    } else {
      saveAndRedirect(role);
    }
  };

  const saveAndRedirect = (role: string) => {
    localStorage.setItem('bb_staff_role', role);
    toast.success("Workspace Set Successfully! 🚀");
    setTimeout(() => {
      router.push(`/${role}`);
    }, 800);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === MASTER_ADMIN_PIN) {
      if (showPinModal) {
        saveAndRedirect(showPinModal);
        setShowPinModal(null);
      }
    } else {
      toast.error("Incorrect Passcode!");
      setPinInput('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-sans">
        <p className="text-xs uppercase font-bold tracking-widest text-neutral-400">Loading Workspace...</p>
      </div>
    );
  }

  const workspaces = [
    { id: 'pos', label: 'POS Counter', icon: ShoppingBag, color: 'from-orange-600 to-orange-500', needsAuth: true, desc: 'काउंटर बिलिंग के लिए' },
    { id: 'kitchen', label: 'Kitchen (KDS)', icon: Clock, color: 'from-yellow-600 to-yellow-500', needsAuth: false, desc: 'शेफ़ ऑर्डर डिस्प्ले स्क्रीन' },
    { id: 'delivery', label: 'Delivery Rider', icon: Truck, color: 'from-blue-600 to-blue-500', needsAuth: false, desc: 'डिलीवरी राइडर ट्रैकिंग' },
    { id: 'admin', label: 'Admin & Godown', icon: ShieldAlert, color: 'from-red-600 to-red-500', needsAuth: true, desc: 'रिपोर्ट, सेटिंग्स और गोडाउन' }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center p-6 font-sans">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-2xl text-center space-y-3 mb-10">
        <h1 className="text-3xl font-black tracking-wider text-yellow-500 font-mono uppercase">BUM BUM STAFF SUITE</h1>
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">Select Workspace for this Device</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {workspaces.map((ws) => {
          const Icon = ws.icon;
          return (
            <button
              key={ws.id}
              onClick={() => handleSelectWorkspace(ws.id, ws.needsAuth)}
              className="bg-[#121212] border border-white/5 p-5 rounded-3xl hover:border-orange-500/50 hover:bg-neutral-900 text-left flex items-center gap-5 transition-all duration-300 active:scale-95 group shadow-lg"
            >
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${ws.color} text-black shrink-0 shadow-md group-hover:scale-105 transition-all`}>
                <Icon size={24} />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-100 uppercase tracking-wide group-hover:text-yellow-400 transition-all">{ws.label}</h3>
                <p className="text-[10px] text-neutral-400 font-medium mt-1 leading-normal">{ws.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-neutral-950 border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center space-y-5 shadow-2xl">
            <div className="flex flex-col items-center gap-1.5">
              <h3 className="text-sm font-black text-gray-100 uppercase tracking-wider">Manager Authorization Required</h3>
              <p className="text-[10px] text-neutral-400">Enter passcode to activate this workspace</p>
            </div>
            
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input 
                type="password" 
                maxLength={4} 
                autoFocus
                placeholder="••••"
                value={pinInput} 
                onChange={(e) => setPinInput(e.target.value)} 
                className="w-full bg-neutral-900 border border-white/10 text-center text-3xl font-mono py-3.5 rounded-2xl outline-none focus:border-orange-500 text-orange-400 font-black" 
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPinModal(null)} className="flex-1 bg-white/5 hover:bg-white/10 text-xs font-black py-3 rounded-xl uppercase tracking-wider text-neutral-300">Cancel</button>
                <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 text-xs font-black py-3 rounded-xl uppercase tracking-wider text-white shadow-lg active:scale-95 transition-all">Verify</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
