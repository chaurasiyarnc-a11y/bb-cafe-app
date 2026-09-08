'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDocs
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Utensils, Trash2, Plus, Minus, Wifi
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- ESC/POS Commands for 80mm ---
const ESC = '\x1B';
const GS = '\x1D';
const CMD = {
  RESET: ESC + '@',
  CENTER: ESC + 'a' + '\x01',
  LEFT: ESC + 'a' + '\x00',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_SIZE: GS + '!' + '\x11', // Double height & width
  NORMAL_SIZE: GS + '!' + '\x00',
  CUT: GS + 'V' + '\x41' + '\x03', // Partial cut
};

export default function BumBumCafe80mmPOS() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'billing' | 'orders'>('billing');
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  
  // Printer State
  const [printerPort, setPrinterPort] = useState<any>(null);

  // --- 1. Printer Connection (USB Direct) ---
  const connectPrinter = async () => {
    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      setPrinterPort(port);
      toast.success("80mm Thermal Printer Connected!");
    } catch (err) {
      console.error(err);
      toast.error("Printer connection failed. Use Chrome/Edge browser.");
    }
  };

  // --- 2. Direct Print Logic (ESC/POS) ---
  const printDirect = async (order: any) => {
    if (!printerPort) {
      toast.error("Printer not connected! Printing via Browser...");
      window.print();
      return;
    }

    const encoder = new TextEncoder();
    const writer = printerPort.writable.getWriter();

    const send = async (text: string) => {
      await writer.write(encoder.encode(text));
    };

    try {
      // Start Printing
      await send(CMD.RESET);
      await send(CMD.CENTER);
      await send(CMD.DOUBLE_SIZE + CMD.BOLD_ON + "BUM BUM CAFE\n" + CMD.NORMAL_SIZE);
      await send("The Taste of Happiness\n");
      await send("Mohandra, MP\n");
      await send("------------------------------------------\n"); // 42 chars for 80mm
      
      await send(CMD.LEFT + CMD.BOLD_ON);
      await send(`BILL NO : #${order.billNumber}\n`);
      await send(`TOKEN   : #${order.tokenNumber}\n`);
      await send(CMD.BOLD_OFF);
      await send(`DATE    : ${new Date().toLocaleString()}\n`);
      await send(`TYPE    : ${order.fulfillmentType?.toUpperCase() || 'DINE-IN'}\n`);
      await send("------------------------------------------\n");
      
      // Items Header
      await send("ITEM NAME            QTY    PRICE    TOTAL\n");
      await send("------------------------------------------\n");

      order.items.forEach((it: any) => {
        const name = it.name.substring(0, 18).padEnd(20, ' ');
        const qty = it.quantity.toString().padEnd(6, ' ');
        const price = it.price.toString().padEnd(8, ' ');
        const total = (it.price * it.quantity).toString();
        send(`${name} ${qty} ${price} ${total}\n`);
      });

      await send("------------------------------------------\n");
      await send(CMD.BOLD_ON);
      const grandTotal = `GRAND TOTAL: Rs. ${order.total}`;
      await send(CMD.CENTER + CMD.DOUBLE_SIZE + grandTotal + "\n" + CMD.NORMAL_SIZE);
      await send(CMD.BOLD_OFF);
      await send(CMD.CENTER + "\nThank You! Visit Again\n\n\n");
      
      // Cut Paper
      await send(CMD.CUT);
      
      toast.success("Receipt Printed!");
    } catch (err) {
      toast.error("Print Error!");
    } finally {
      writer.releaseLock();
    }
  };

  // --- 3. Place Order Logic ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    const toastId = toast.loading("Saving Order...");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const tokenRef = doc(db, "settings", `token_${today}`);
      const billRef = doc(db, "settings", "bill_counter");

      // Get Bill & Token Numbers
      const { billNo, tokenNo } = await runTransaction(db, async (txn) => {
        const bSnap = await txn.get(billRef);
        const tSnap = await txn.get(tokenRef);
        const nextBill = bSnap.exists() ? (bSnap.data().value + 1) : 5001;
        const nextToken = tSnap.exists() ? (tSnap.data().value + 1) : 1;
        txn.set(billRef, { value: nextBill }, { merge: true });
        txn.set(tokenRef, { value: nextToken }, { merge: true });
        return { billNo: nextBill, tokenNo: nextToken };
      });

      const total = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const orderData = {
        billNumber: billNo,
        tokenNumber: String(tokenNo).padStart(2, '0'),
        items: cart,
        total: total,
        status: 'pending',
        timestamp: new Date(),
        fulfillmentType: 'Table'
      };

      // Save to Firebase
      await addDoc(collection(db, "orders"), orderData);
      
      toast.success("Order Placed!", { id: toastId });

      // Direct Print
      await printDirect(orderData);

      setCart([]);
    } catch (err) {
      console.error(err);
      toast.error("Order Failed!", { id: toastId });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // --- Firebase Fetch Products ---
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "products"));
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <button 
          onClick={() => setIsLoggedIn(true)}
          className="bg-orange-600 px-10 py-4 rounded-2xl text-white font-bold"
        >
          Enter POS System
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden font-sans">
      <Toaster />
      
      {/* Left Menu */}
      <div className="w-20 border-r border-neutral-800 flex flex-col items-center py-6 gap-6">
        <div className="text-orange-500 mb-6"><Utensils size={30}/></div>
        <button onClick={connectPrinter} className={`p-3 rounded-xl ${printerPort ? 'bg-green-600' : 'bg-neutral-800'}`}>
          <Wifi size={20} />
        </button>
        <button onClick={() => setActiveTab('billing')} className="p-3 bg-neutral-800 rounded-xl"><ShoppingBag size={20}/></button>
      </div>

      {/* Products Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-4 gap-4">
          {products.map(p => (
            <button 
              key={p.id} 
              onClick={() => setCart(prev => {
                const ex = prev.find(i => i.id === p.id);
                if (ex) return prev.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i);
                return [...prev, { ...p, quantity: 1 }];
              })}
              className="bg-neutral-900 p-4 rounded-2xl border border-neutral-800 hover:border-orange-500 text-left"
            >
              <div className="h-24 bg-neutral-800 rounded-lg mb-2"></div>
              <p className="font-bold text-sm truncate">{p.name}</p>
              <p className="text-orange-500 font-mono">₹{p.price}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-[400px] border-l border-neutral-800 flex flex-col p-6 bg-neutral-900">
        <h2 className="text-xl font-black mb-6">CURRENT ORDER</h2>
        
        <div className="flex-1 overflow-y-auto space-y-3">
          {cart.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-black p-3 rounded-xl">
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-xs text-neutral-500">₹{item.price} x {item.quantity}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-1 bg-neutral-800 rounded"><Minus size={14}/></button>
                <span className="font-mono">{item.quantity}</span>
                <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-1 bg-neutral-800 rounded"><Plus size={14}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-800">
          <div className="flex justify-between text-2xl font-black mb-6">
            <span>Total</span>
            <span className="text-orange-500">₹{cart.reduce((a,b) => a + (b.price * b.quantity), 0)}</span>
          </div>
          
          <button 
            disabled={cart.length === 0 || isSubmittingOrder}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSubmittingOrder ? <Loader2 className="animate-spin"/> : <Printer size={24}/>}
            Print 80mm Receipt
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area { visibility: visible; position: absolute; left: 0; top: 0; width: 80mm; }
        }
      `}</style>
    </div>
  );
}
