'use client';
import React from 'react';
import { Phone, MapPin, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface OrdersTabProps {
  orders: any[];
  orderPeriodFilter: 'today' | 'yesterday' | 'week';
  setOrderPeriodFilter: (val: 'today' | 'yesterday' | 'week') => void;
  handlePrintReceipt: (order: any) => void;
  handleSendWhatsAppBill: (order: any) => void;
  handleStatusChange: (order: any, newStatus: string) => void;
  formatBillNumber: (num: number) => string;
}

export default function OrdersTab({
  orders,
  orderPeriodFilter,
  setOrderPeriodFilter,
  handlePrintReceipt,
  handleSendWhatsAppBill,
  handleStatusChange,
  formatBillNumber
}: OrdersTabProps) {

  // पैरेंट से आए हुए ऑर्डर्स लिस्ट को फ़िल्टर करने की गणना
  const filteredOrdersList = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

    const matched = orders.filter(o => {
      if (!o.timestamp) return false;
      const oDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      
      if (orderPeriodFilter === 'today') {
        return oDate >= todayStart;
      } else if (orderPeriodFilter === 'yesterday') {
        return oDate >= yesterdayStart && oDate <= yesterdayEnd;
      } else if (orderPeriodFilter === 'week') {
        return oDate >= weekStart;
      }
      return false;
    });

    return matched.sort((a, b) => Number(b.billNumber || 0) - Number(a.billNumber || 0));
  }, [orders, orderPeriodFilter]);

  return (
    <div className="space-y-4">
      {/* आर्डर टाइम-पीरियड फ़िल्टर सेगमेंट */}
      <div className="bg-[#111] border border-white/5 p-4 rounded-3xl grid grid-cols-3 gap-2">
        <button 
          onClick={() => setOrderPeriodFilter('today')} 
          className={`py-3 rounded-2xl font-black text-xs uppercase transition-all ${orderPeriodFilter === 'today' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        >
          आज के ऑर्डर
        </button>
        <button 
          onClick={() => setOrderPeriodFilter('yesterday')} 
          className={`py-3 rounded-2xl font-black text-xs uppercase transition-all ${orderPeriodFilter === 'yesterday' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        >
          कल के ऑर्डर
        </button>
        <button 
          onClick={() => setOrderPeriodFilter('week')} 
          className={`py-3 rounded-2xl font-black text-xs uppercase transition-all ${orderPeriodFilter === 'week' ? 'bg-orange-500 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        >
          इस हफ़्ते के
        </button>
      </div>

      {/* ऑर्डर्स की रेंडरिंग */}
      {filteredOrdersList.length === 0 ? (
        <p className="text-center text-gray-500 py-20 font-bold uppercase tracking-widest text-xs">
          इस सेगमेंट में कोई एक्टिव आर्डर नहीं है...
        </p>
      ) : (
        filteredOrdersList.map((o) => {
          const isDineInOrPickup = o.fulfillmentType === "pickup" || o.fulfillmentType === "table";

          return (
            <div 
              key={o.id} 
              className={`p-6 rounded-[2rem] border relative overflow-hidden transition-colors duration-200 ${
                o.status === 'rejected' ? 'bg-red-500/[0.02] border-red-500/20' : 'bg-white/[0.03] border-white/5'
              }`}
            >
              {o.status === 'rejected' && (
                <div className="mb-3 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase px-3 py-1 rounded-full w-max">
                  🚫 Rejected / Fake Order
                </div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-orange-500 text-black text-[10px] px-3 py-1 rounded-full font-black font-mono">
                    BILL: #{formatBillNumber(o.billNumber || 0)}
                  </span>
                  <span className="bg-yellow-400 text-black text-[10px] px-3 py-1 rounded-full font-black font-mono">
                    TOKEN: #{o.tokenNumber || "N/A"}
                  </span>
                </div>
                <span className={`font-black text-xl ${o.status === 'rejected' ? 'line-through text-red-500' : 'text-orange-500'}`}>
                  ₹{o.total}
                </span>
              </div>
              
              {/* आर्डर के आइटम्स की लिस्ट */}
              <div className="space-y-2 mb-6 border-b border-white/5 pb-4">
                {o.items?.map((item: any, idx: number) => (
                  <div key={idx} className="text-sm font-bold text-gray-300 font-sans">
                    <p className="flex justify-between">
                      <span><span className="text-orange-500">×{item.quantity}</span> {item.name}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </p>
                    {item.note && (
                      <p className="text-[10px] text-orange-400 italic pl-3 mt-1">
                        👩‍🍳 निर्देश: {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* कस्टमर डिटेल्स */}
              <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-2 font-sans">
                  <Phone size={12}/> {o.customerPhone || "N/A"}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={12}/> {o.address || "N/A"}
                </div>
                <div className="flex items-center gap-2 col-span-2 font-sans">
                  <Calendar size={12}/> {o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}
                </div>
              </div>

              {/* एक्शन्स फ़ूटर */}
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap justify-between items-center gap-3">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-sans">
                  Name: {o.customerName || 'Guest'}
                </span>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => handlePrintReceipt(o)}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-black rounded-xl text-[10px] font-black uppercase transition-all active:scale-95"
                  >
                    📄 Bill PDF
                  </button>
                  <button 
                    onClick={() => handleSendWhatsAppBill(o)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black uppercase rounded-xl transition-all active:scale-95"
                  >
                    📲 Send Bill
                  </button>

                  {/* कस्टमाइज्ड स्टेटस सेलेक्टर - Dine-In और Pickup के अनुसार स्टेटस बदलना */}
                  <select 
                    value={o.status || 'pending'} 
                    onChange={(e) => handleStatusChange(o, e.target.value)} 
                    className="bg-black/60 border border-white/10 text-xs font-bold rounded-xl p-2 px-3 text-white outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="pending">⏳ Pending (Confirming)</option>
                    <option value="preparing">👨‍🍳 Preparing in Kitchen</option>
                    
                    {/* यदि डाइन-इन या पिकअप का आर्डर है तो 'Out for Delivery' का ऑप्शन ड्रॉपडाउन में नहीं आएगा */}
                    {!isDineInOrPickup && (
                      <option value="out_for_delivery">🛵 Out for Delivery (Rider)</option>
                    )}
                    
                    <option value="delivered">✅ Delivered / Completed</option>
                    <option value="rejected">🚫 Rejected / Fake</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
