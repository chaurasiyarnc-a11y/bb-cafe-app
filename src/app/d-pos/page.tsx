'use client';
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, onSnapshot, query, orderBy, limit, doc, 
  updateDoc, addDoc, runTransaction, getDocs
} from 'firebase/firestore';
import { 
  ShoppingBag, Search, Loader2, Clock, Printer, Check, Settings, 
  LogOut, Lock, Utensils, Trash2, Plus, Minus, Wifi, Image as ImageIcon
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
  DOUBLE_SIZE: GS + '!' + '\x11', 
  NORMAL_SIZE: GS + '!' + '\x00',
  CUT: GS + 'V' + '\x41' + '\x03', // Full Cut
  LINE_FEED: '\n\n\n', // थोड़ा गैप देने के लिए
};

export default function BumBumCafe80mmPOS() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [printerPort, setPrinterPort] = useState<any>(null);

  // --- 1. Printer Connection ---
  const connectPrinter = async () => {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      setPrinterPort(port);
      toast.success("80mm Printer Connected!");
    } catch (err) {
      toast.error("Printer Connection Failed!");
    }
  };

  // --- 2. Sequential Printing (KOT then Bill + Cut) ---
  const printOrder = async (order: any) => {
    if (!printerPort) {
      toast.error("Printer not connected! Using browser print.");
      window.print();
      return;
    }

    const encoder = new TextEncoder();
    const writer = printerPort.writable.getWriter();
    const send = async (text: string) => await writer.write(encoder.encode(text));

    try {
      // --- PART A: KITCHEN KOT (No Cutting) ---
      await send(CMD.RESET + CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_SIZE);
      await send("KITCHEN KOT\n");
      await send(CMD.NORMAL_SIZE + `TOKEN: #${order.tokenNumber}\n`);
      await send(CMD.LEFT + CMD.BOLD_OFF);
      await send(`Type: ${order.fulfillmentType}\n`);
      await send(`Time: ${new Date().toLocaleTimeString()}\n`);
      await send("------------------------------------------\n");
      await send("QTY   ITEM NAME\n");
      await send("------------------------------------------\n");
      order.items.forEach((it: any) => {
        send(`${it.quantity.toString().padEnd(5, ' ')} ${it.name}\n`);
      });
      await send("------------------------------------------\n");
      await send("\n\n"); // KOT के बाद थोड़ा गैप

      // --- PART B: MAIN BILL (With Cutting) ---
      await send(CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_SIZE);
      await send("BUM BUM CAFE\n");
      await send(CMD.NORMAL_SIZE + "The Taste of Happiness\n");
      await send(CMD.CENTER + "Mohandra Main Road\n");
      await send("------------------------------------------\n");
      await send(CMD.LEFT + CMD.BOLD_ON);
      await send(`BILL NO : #${order.billNumber}\n`);
      await send(`TOKEN   : #${order.tokenNumber}\n`);
      await send(CMD.BOLD_OFF);
      await send(`Date: ${new Date().toLocaleString()}\n`);
      await send("------------------------------------------\n");
      await send("ITEM NAME            QTY    PRICE    TOTAL\n");
      await send("------------------------------------------\n");
      
      order.items.forEach((it: any) => {
        const name = it.name.substring(0, 18).padEnd(20, ' ');
        const qty = it.quantity.toString().padEnd(6, ' ');
        const total = (it.price * it.quantity).toString();
        send(`${name} ${qty} ${it.price.toString().padEnd(8, ' ')} ${total}\n`);
      });

      await send("------------------------------------------\n");
      await send(CMD.BOLD_ON + CMD.CENTER + CMD.DOUBLE_SIZE);
      await send(`TOTAL: Rs. ${order.total}\n`);
      await send(CMD.NORMAL_SIZE + CMD.BOLD_OFF);
      await send(CMD.CENTER + "\nThank You! Visit Again\n");
      
      // Finishing
      await send(CMD.LINE_FEED);
      await send(CMD.CUT); // अब पेपर कटेगा

      toast.success("KOT and Bill Printed!");
    } catch (err) {
      toast.error("Print Failed!");
    } finally {
      writer.releaseLock();
    }
  };

  // --- 3. Save Order Function ---
  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tokenRef = doc(db, "settings", `token_${today}`);
      const billRef = doc(db, "settings", "bill_counter");

      const { billNo, tokenNo } = await runTransaction(db, async (txn) => {
        const bSnap = await txn.get(billRef);
        const tSnap = await txn.get(tokenRef);
        const nextB = bSnap.exists() ? (bSnap.data().value + 1) : 7001;
        const nextT = tSnap.exists() ? (tSnap.data().value + 1) : 1;
        txn.set(billRef, { value: nextB }, { merge: true });
        txn.set(tokenRef, { value: nextT }, { merge: true });
        return { billNo: nextB, tokenNo: nextT };
      });

      const orderData = {
        billNumber: billNo,
        tokenNumber: String(tokenNo).padStart(2, '0'),
        items: cart,
        total: cart.reduce((a, b) => a + (b.price * b.quantity), 0),
        status: 'pending',
        timestamp: new Date(),
        fulfillmentType: 'Table'
      };

      await addDoc(collection(db, "orders"), orderData);
      await printOrder(orderData); // प्रिंटिंग शुरू
      setCart([]);
      toast.success("Order Processed!");
    } catch (err) {
      toast.error("Process Failed!");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Fetch Products
  useEffect(() => {
    getDocs(collection(db, "products")).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  if (!isLoggedIn) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <button onClick={() => setIsLoggedIn(true)} className="bg-orange-600 px-12 py-4 rounded-full font-black text-white">START BUM BUM POS</button>
    </div>
  );

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden">
      <Toaster />
      
      {/* Side Nav */}
      <div className="w-20 border-r border-neutral-900 flex flex-col items-center py-8 gap-8">
        <Utensils className="text-orange-500" size={32} />
        <button onClick={connectPrinter} className={`p-4 rounded-2xl ${printerPort ? 'bg-green-500 shadow-green-500/20' : 'bg-neutral-900'} shadow-xl`}>
          <Wifi size={24} />
        </button>
      </div>

      {/* Product Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map(p => (
            <button 
              key={p.id} 
              onClick={() => {
                const ex = cart.find(i => i.id === p.id);
                if (ex) setCart(cart.map(i => i.id === p.id ? {...i, quantity: i.quantity + 1} : i));
                else setCart([...cart, { ...p, quantity: 1 }]);
              }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3 hover:border-orange-500 transition-all text-left group"
            >
              <div className="h-32 bg-neutral-800 rounded-2xl mb-3 overflow-hidden relative">
                {/* Image Logic Fix: image or imageUrl */}
                {(p.image || p.imageUrl) ? (
                  <img src={p.image || p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-neutral-700" /></div>
                )}
              </div>
              <h3 className="font-bold text-sm truncate">{p.name}</h3>
              <p className="text-orange-500 font-black text-lg">₹{p.price}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-[420px] bg-neutral-900 border-l border-neutral-800 flex flex-col p-6">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><ShoppingBag className="text-orange-500"/> CART</h2>
        
        <div className="flex-1 overflow-y-auto space-y-3">
          {cart.map(item => (
            <div key={item.id} className="bg-black/40 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center">
              <div className="flex-1 pr-4">
                <p className="font-bold text-sm line-clamp-1">{item.name}</p>
                <p className="text-orange-500 font-mono text-xs">₹{item.price * item.quantity}</p>
              </div>
              <div className="flex items-center gap-3 bg-neutral-900 p-1 rounded-xl">
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-1.5 hover:bg-neutral-800 rounded-lg"><Minus size={14}/></button>
                <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-1.5 hover:bg-neutral-800 rounded-lg"><Plus size={14}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex justify-between items-end border-t border-neutral-800 pt-4">
            <span className="text-neutral-500 font-bold">Grand Total</span>
            <span className="text-3xl font-black text-orange-500 font-mono">₹{cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</span>
          </div>

          <button 
            disabled={cart.length === 0 || isSubmittingOrder}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-3xl font-black text-lg uppercase flex items-center justify-center gap-3 shadow-lg shadow-orange-600/20 disabled:opacity-50"
          >
            {isSubmittingOrder ? <Loader2 className="animate-spin"/> : <Printer size={24}/>}
            Print KOT & Bill
          </button>
        </div>
      </div>
    </div>
  );
}
