'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, onSnapshot, query, orderBy, limit, addDoc, where } from 'firebase/firestore';
import { 
  ShoppingBag, Search, X, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Calculator, TrendingUp, Utensils, Banknote, CreditCard, Keyboard, Layers, Cpu, Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import { handlePrintKot, handlePrintReceipt, PrintConfig } from '@/lib/printerUtils';

export default function BbCafePosDesktop() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- States ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'receipts' | 'reports' | 'inventory' | 'printer_setup'>('billing');
  
  // USB Printer States
  const [usbDevice, setUsbDevice] = useState<USBDevice | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Billing States
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState({ total: 0, cash: 0, upi: 0, count: 0 });

  // --- WebUSB Printer Logic ---
  const connectUsbPrinter = async () => {
    setIsConnecting(true);
    try {
      // ब्राउज़र से USB डिवाइस चुनने का प्रॉम्ट
      const device = await navigator.usb.requestDevice({ filters: [] });
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      await device.claimInterface(0);
      
      setUsbDevice(device);
      localStorage.setItem("bb_pos_usb_vendor_id", device.vendorId.toString());
      toast.success(`Connected to: ${device.productName || 'Unknown Printer'}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Printer Connection Failed: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const testUsbPrint = async () => {
    if (!usbDevice) return toast.error("No Printer Connected");
    try {
      const encoder = new TextEncoder();
      // ESC/POS Commands for Testing
      const data = encoder.encode(
        "\x1B\x40" +          // Initialize
        "\x1B\x61\x01" +      // Center align
        "BUM BUM CAFE\n" +
        "USB PRINTER TEST\n" +
        "----------------\n" +
        "Status: Working OK\n" +
        "\x1D\x56\x41\x03"     // Paper Cut
      );
      await usbDevice.transferOut(1, data); // Endpoint 1 for most thermal printers
      toast.success("Test Print Sent!");
    } catch (err) {
      toast.error("Printing Failed");
    }
  };

  // --- Sidebar Buttons ---
  const navItems = [
    { id: 'billing', label: 'Billing', icon: <Calculator size={20}/> },
    { id: 'receipts', label: 'Receipts', icon: <Printer size={20}/> },
    { id: 'reports', label: 'Reports', icon: <TrendingUp size={20}/> },
    { id: 'inventory', label: 'Inventory', icon: <Layers size={20}/> },
    { id: 'printer_setup', label: 'USB Printer', icon: <Cpu size={20}/> }, // नया टैब
  ];

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <div className="h-screen w-full bg-[#080808] text-white flex overflow-hidden font-sans select-none">
      <Toaster position="top-right" />

      {/* --- SIDEBAR --- */}
      <aside className="w-64 border-r border-white/5 bg-[#111] flex flex-col shrink-0">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-black text-orange-500 italic">BUM BUM CAFE</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => (
            <SidebarBtn 
              key={item.id}
              icon={item.icon} 
              label={item.label} 
              active={activeTab === item.id} 
              onClick={() => setActiveTab(item.id as any)} 
            />
          ))}
        </nav>
        <div className="p-6 border-t border-white/5">
           <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="flex items-center gap-3 text-slate-500 hover:text-red-500 font-bold text-sm w-full p-2">
            <LogOut size={18} /> Exit System
          </button>
        </div>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className="flex-1 flex overflow-hidden bg-[#000]">
        
        {/* 1. BILLING TAB (Your existing code) */}
        {activeTab === 'billing' && (
           <div className="flex-1"> {/* ... (Billing Code) */} </div>
        )}

        {/* 2. PRINTER SETUP TAB (NEW) */}
        {activeTab === 'printer_setup' && (
          <div className="flex-1 p-12 overflow-y-auto space-y-8">
            <div className="max-w-4xl">
                <h2 className="text-4xl font-black mb-2 italic">USB Printer Setup</h2>
                <p className="text-slate-500 font-bold mb-10 uppercase tracking-widest text-xs">Configure your thermal bill printer for PC</p>

                <div className="grid grid-cols-2 gap-8">
                    {/* Device Selection Card */}
                    <div className="bg-[#111] border border-white/5 p-10 rounded-[50px] space-y-6">
                        <div className="bg-orange-500/10 w-16 h-16 rounded-2xl flex items-center justify-center text-orange-500 mb-4">
                            <Link size={32} />
                        </div>
                        <h3 className="text-xl font-black uppercase">Connection</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            USB केबल को प्रिंटर और PC से कनेक्ट करें, फिर नीचे दिए गए बटन पर क्लिक करके प्रिंटर चुनें।
                        </p>
                        <button 
                            onClick={connectUsbPrinter}
                            disabled={isConnecting}
                            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-5 rounded-[25px] transition-all flex items-center justify-center gap-3"
                        >
                            {isConnecting ? <Loader2 className="animate-spin"/> : <Search size={20}/>}
                            {usbDevice ? "CHANGE PRINTER" : "SELECT USB PRINTER"}
                        </button>
                    </div>

                    {/* Printer Status Card */}
                    <div className="bg-[#111] border border-white/5 p-10 rounded-[50px] space-y-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${usbDevice ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            <Printer size={32} />
                        </div>
                        <h3 className="text-xl font-black uppercase">Status</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                                <span className="text-xs font-bold text-slate-500 uppercase">State:</span>
                                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${usbDevice ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}`}>
                                    {usbDevice ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            {usbDevice && (
                                <div className="p-4 bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Device Name</p>
                                    <p className="text-sm font-black truncate">{usbDevice.productName}</p>
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={testUsbPrint}
                            disabled={!usbDevice}
                            className="w-full border border-white/10 hover:bg-white/5 text-white font-black py-5 rounded-[25px] transition-all disabled:opacity-20 uppercase tracking-widest text-xs"
                        >
                            Send Test Print
                        </button>
                    </div>
                </div>

                {/* Technical Note */}
                <div className="mt-12 bg-blue-600/5 border border-blue-600/10 p-8 rounded-[40px] flex gap-6 items-start">
                    <div className="bg-blue-600/20 p-3 rounded-xl text-blue-500 shrink-0 mt-1">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h4 className="font-black text-blue-500 uppercase text-xs tracking-widest mb-2">Pro Tip for PC Users</h4>
                        <p className="text-sm text-slate-500 leading-relaxed italic">
                            WebUSB तकनीक के लिए आपका प्रिंटर **Zadig** ड्राइवर का उपयोग करना चाहिए। यदि ब्राउज़र प्रिंटर नहीं पहचान रहा है, तो "WinUSB" ड्राइवर इंस्टॉल करें।
                        </p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Existing Tabs: Receipts, Reports, Inventory etc. */}
        {/* ... */}
      </main>
    </div>
  );
}

// Sidebar Button Component
function SidebarBtn({icon, label, active, onClick}: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/20' : 'text-slate-500 hover:bg-white/5'}`}>
      {icon} <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function Login({onLogin}: any) {
    const [p, setP] = useState('');
    return (
      <div className="h-screen w-full bg-[#050505] flex items-center justify-center">
        <div className="bg-[#111] p-12 rounded-[50px] border border-white/5 w-[400px] text-center shadow-2xl">
          <SafeLock size={64} className="text-orange-500 mx-auto mb-8" />
          <h1 className="text-2xl font-black mb-8 italic">BUM BUM CAFE</h1>
          <input type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter' && p==='1234' && onLogin()} className="w-full bg-[#1a1a1a] text-center text-4xl font-mono py-6 rounded-[25px] mb-8 outline-none border border-white/5 text-orange-500" placeholder="••••" maxLength={4} autoFocus />
          <button onClick={()=>{if(p==='1234') onLogin()}} className="w-full bg-orange-600 py-5 rounded-[25px] font-black text-xl shadow-xl shadow-orange-600/20 transition-all">UNLOCK TERMINAL</button>
        </div>
      </div>
    );
  }
