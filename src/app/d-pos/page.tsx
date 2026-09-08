'use client';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { 
  collection, doc, addDoc, runTransaction, getDocs
} from 'firebase/firestore';
import { 
  ShoppingBag, Loader2, Printer, Utensils, Trash2, Plus, Minus, Wifi, Image as ImageIcon
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- ESC/POS Commands ---
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
  CUT: GS + 'V' + '\x41' + '\x03',
};

export default function BumBumCafePOS() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [printerPort, setPrinterPort] = useState<any>(null);

  const connectPrinter = async () => {
    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      setPrinterPort(port);
      toast.success("Printer Ready!");
    } catch (err) {
      toast.error("Connection Failed!");
    }
  };

  // --- FIXED PRINT LOGIC: One single buffer send ---
  const printOrder = async (order: any) => {
    if (!printerPort) {
      toast.error("Printer not connected!");
      return;
    }

    const writer = printerPort.writable.getWriter();
    const encoder = new TextEncoder();

    try {
      let b = ""; // Accumulate everything in this string
      
      // --- PART A: KOT ---
      b += CMD.RESET + CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_SIZE;
      b += "KITCHEN KOT\n";
      b += CMD.NORMAL_SIZE + `TOKEN: #${order.tokenNumber}\n`;
      b += CMD.LEFT + CMD.BOLD_OFF;
      b += `Time: ${new Date().toLocaleTimeString()}\n`;
      b += "------------------------------------------\n";
      order.items.forEach((it: any) => {
        b += `${it.quantity.toString().padEnd(4, ' ')} x ${it.name}\n`;
      });
      b += "------------------------------------------\n\n\n";

      // --- PART B: MAIN BILL ---
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_SIZE;
      b += "BUM BUM CAFE\n";
      b += CMD.NORMAL_SIZE + "The Taste of Happiness\n";
      b += "------------------------------------------\n";
      b += CMD.LEFT + `BILL: #${order.billNumber} | TK: #${order.tokenNumber}\n`;
      b += `Date: ${new Date().toLocaleString()}\n`;
      b += "------------------------------------------\n";
      b += "ITEM             QTY    PRICE    TOTAL\n";
      
      order.items.forEach((it: any) => {
        const name = it.name.substring(0, 16).padEnd(16, ' ');
        const qty = it.quantity.toString().padEnd(6, ' ');
        const total = (it.price * it.quantity).toString();
        b += `${name} ${qty} ${it.price.toString().padEnd(8, ' ')} ${total}\n`;
      });

      b += "------------------------------------------\n";
      b += CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_SIZE;
      b += `GRAND TOTAL: Rs. ${order.total}\n`;
      b += CMD.NORMAL_SIZE + CMD.BOLD_OFF;
      b += "\n   Thank You! Visit Again\n\n\n";
      b += CMD.CUT; // Paper Cut Command at the very end

      // SEND ALL AT ONCE
      await writer.write(encoder.encode(b));
      toast.success("Printed Successfully!");
    } catch (err) {
      console.error("Print Error:", err);
      toast.error("Printing Interrupted!");
    } finally {
      writer.releaseLock(); // Lock को हटाना बहुत जरूरी है
    }
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || isSubmittingOrder) return;
    setIsSubmittingOrder(true);
    
    try {
      const today = new Date().toISOString().slice(0, 10);
      const tokenRef = doc(db, "settings", `token_${today}`);
      const billRef = doc(db, "settings", "bill_counter");

      // 1. Database Transaction
      const { billNo, tokenNo } = await runTransaction(db, async (txn) => {
        const bSnap = await txn.get(billRef);
        const tSnap = await txn.get(tokenRef);
        const nextB = bSnap.exists() ? (bSnap.data().value + 1) : 8001;
        const nextT = tSnap.exists() ? (tSnap.data().value + 1) : 1;
        txn.set(billRef, { value: nextB }, { merge: true });
        txn.set(tokenRef, { value: nextT }, { merge: true });
        return { billNo: nextB, tokenNo: nextT };
      });

      const orderData = {
        billNumber: billNo,
        tokenNumber: String(tokenNo).padStart(2, '0'),
        items: [...cart], // Clone cart
        total: cart.reduce((a, b) => a + (b.price * b.quantity), 0),
        status: 'pending',
        timestamp: new Date(),
        fulfillmentType: 'Dine-In'
      };

      // 2. Save Order to Firebase
      await addDoc(collection(db, "orders"), orderData);

      // 3. Clear Cart First (To prevent double printing)
      setCart([]);
      
      // 4. Then Start Printing
      if (printerPort) {
        await printOrder(orderData);
      } else {
        toast.error("Order saved, but Printer not connected!");
      }

    } catch (err) {
      toast.error("Order Failed!");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  useEffect(() => {
    getDocs(collection(db, "products")).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  if (!isLoggedIn) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <button onClick={() => setIsLoggedIn(true)} className="bg-orange-600 px-12 py-4 rounded-full font-black text-white">LOGIN POS</button>
    </div>
  );

  return (
    <div className="h-screen flex bg-neutral-950 text-white overflow-hidden">
      <Toaster />
      <div className="w-20 border-r border-neutral-900 flex flex-col items-center py-8 gap-8">
        <Utensils className="text-orange-500" size={32} />
        <button onClick={connectPrinter} className={`p-4 rounded-2xl ${printerPort ? 'bg-green-500' : 'bg-neutral-800'}`}>
          <Wifi size={24} />
        </button>
      </div>

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
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3 hover:border-orange-500 text-left"
            >
              <div className="h-32 bg-neutral-800 rounded-2xl mb-3 overflow-hidden relative">
                {(p.image || p.imageUrl) ? (
                  <img src={p.image || p.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-neutral-700" /></div>
                )}
              </div>
              <h3 className="font-bold text-sm truncate">{p.name}</h3>
              <p className="text-orange-500 font-black">₹{p.price}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-[420px] bg-neutral-900 border-l border-neutral-800 flex flex-col p-6">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2"><ShoppingBag className="text-orange-500"/> CART</h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          {cart.map(item => (
            <div key={item.id} className="bg-black/40 border border-neutral-800 p-4 rounded-2xl flex justify-between items-center">
              <div className="flex-1 pr-4"><p className="font-bold text-sm">{item.name}</p></div>
              <div className="flex items-center gap-3">
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: Math.max(1, i.quantity - 1)} : i))} className="p-1 hover:bg-neutral-800 rounded"><Minus size={14}/></button>
                <span className="font-mono font-bold">{item.quantity}</span>
                <button onClick={() => setCart(cart.map(i => i.id === item.id ? {...i, quantity: i.quantity + 1} : i))} className="p-1 hover:bg-neutral-800 rounded"><Plus size={14}/></button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-neutral-800 pt-4">
          <div className="flex justify-between mb-4">
            <span className="text-neutral-500 font-bold">Total</span>
            <span className="text-3xl font-black text-orange-500">₹{cart.reduce((a, b) => a + (b.price * b.quantity), 0)}</span>
          </div>
          <button 
            disabled={cart.length === 0 || isSubmittingOrder}
            onClick={handlePlaceOrder}
            className="w-full bg-orange-600 hover:bg-orange-500 py-5 rounded-3xl font-black text-lg uppercase flex items-center justify-center gap-3"
          >
            {isSubmittingOrder ? <Loader2 className="animate-spin"/> : <Printer size={24}/>}
            Print Order
          </button>
        </div>
      </div>
    </div>
  );
}
