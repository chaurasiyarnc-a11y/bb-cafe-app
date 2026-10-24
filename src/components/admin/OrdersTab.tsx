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
    <div className="space-y-4 transition-colors duration-300">
      {/* आर्डर टाइम-पीरियड फ़िल्टर सेगमेंट */}
      <div className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/5 p-4 rounded-3xl grid grid-cols-3 gap-2 shadow-sm transition-colors duration-300">
        <button 
          onClick={() => setOrderPeriodFilter('today')} 
          className={`py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-sm ${orderPeriodFilter === 'today' ? 'bg-orange-600 dark:bg-orange-500 text-white shadow-md scale-105' : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'}`}
        >
          आज के ऑर्डर
        </button>
        <button 
          onClick={() => setOrderPeriodFilter('yesterday')} 
          className={`py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-sm ${orderPeriodFilter === 'yesterday' ? 'bg-orange-600 dark:bg-orange-500 text-white shadow-md scale-105' : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'}`}
        >
          कल के ऑर्डर
        </button>
        <button 
          onClick={() => setOrderPeriodFilter('week')} 
          className={`py-3 rounded-2xl font-black text-xs uppercase transition-all shadow-sm ${orderPeriodFilter === 'week' ? 'bg-orange-600 dark:bg-orange-500 text-white shadow-md scale-105' : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-gray-400 hover:text-neutral-900 dark:hover:text-white'}`}
        >
          इस हफ़्ते के
        </button>
      </div>

      {/* ऑर्डर्स की रेंडरिंग */}
      {filteredOrdersList.length === 0 ? (
        <p className="text-center text-neutral-500 dark:text-gray-500 py-20 font-bold uppercase tracking-widest text-xs">
          इस सेगमेंट में कोई एक्टिव आर्डर नहीं है...
        </p>
      ) : (
        filteredOrdersList.map((o) => {
          const isDineInOrPickup = o.fulfillmentType === "pickup" || o.fulfillmentType === "table";

          return (
            <div 
              key={o.id} 
              className={`p-6 rounded-[2rem] border relative overflow-hidden transition-colors duration-300 shadow-sm ${
                o.status === 'rejected' ? 'bg-red-50 dark:bg-red-500/[0.02] border-red-200 dark:border-red-500/20' : 'bg-white dark:bg-white/[0.03] border-neutral-200 dark:border-white/5 hover:border-orange-500 dark:hover:border-white/10'
              }`}
            >
              {o.status === 'rejected' && (
                <div className="mb-3 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20 text-[9px] font-black uppercase px-3 py-1 rounded-full w-max shadow-sm">
                  🚫 Rejected / Fake Order
                </div>
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-orange-100 dark:bg-orange-500 text-orange-700 dark:text-black text-[10px] px-3 py-1 rounded-full font-black font-mono shadow-sm border border-orange-200 dark:border-transparent">
                    BILL: #{formatBillNumber(o.billNumber || 0)}
                  </span>
                  <span className="bg-yellow-100 dark:bg-yellow-400 text-yellow-700 dark:text-black text-[10px] px-3 py-1 rounded-full font-black font-mono shadow-sm border border-yellow-200 dark:border-transparent">
                    TOKEN: #{o.tokenNumber || "N/A"}
                  </span>
                </div>
                <span className={`font-black text-xl ${o.status === 'rejected' ? 'line-through text-red-500' : 'text-green-600 dark:text-orange-500'}`}>
                  ₹{o.total}
                </span>
              </div>
              
              {/* आर्डर के आइटम्स की लिस्ट */}
              <div className="space-y-2 mb-6 border-b border-neutral-200 dark:border-white/5 pb-4">
                {o.items?.map((item: any, idx: number) => (
                  <div key={idx} className="text-sm font-bold text-neutral-700 dark:text-gray-300 font-sans">
                    <p className="flex justify-between">
                      <span className="text-neutral-900 dark:text-gray-200"><span className="text-orange-600 dark:text-orange-500">×{item.quantity}</span> {item.name}</span>
                      <span className="font-mono text-neutral-600 dark:text-gray-400">₹{item.price * item.quantity}</span>
                    </p>
                    {item.note && (
                      <p className="text-[10px] text-orange-600 dark:text-orange-400 italic pl-3 mt-1 font-semibold">
                        👩‍🍳 निर्देश: {item.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* कस्टमर डिटेल्स */}
              <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-neutral-500 dark:text-gray-500 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-2 font-sans text-neutral-700 dark:text-gray-400">
                  <Phone size={12} className="text-orange-500"/> {o.customerPhone || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-neutral-700 dark:text-gray-400">
                  <MapPin size={12} className="text-orange-500"/> {o.address || "N/A"}
                </div>
                <div className="flex items-center gap-2 col-span-2 font-sans text-neutral-700 dark:text-gray-400">
                  <Calendar size={12} className="text-orange-500"/> {o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}
                </div>
              </div>

              {/* एक्शन्स फ़ूटर */}
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-white/5 flex flex-wrap justify-between items-center gap-3">
                <span className="text-[10px] font-black text-neutral-600 dark:text-gray-400 uppercase tracking-widest font-sans flex items-center gap-1.5">
                  <span className="text-xl">👤</span> {o.customerName || 'Guest'}
                </span>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => handlePrintReceipt(o)}
                    className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 dark:text-black rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 shadow-sm border border-orange-200 dark:border-transparent flex items-center gap-1"
                  >
                    📄 Bill PDF
                  </button>
                  <button 
                    onClick={() => handleSendWhatsAppBill(o)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 shadow-sm flex items-center gap-1"
                  >
                    📲 Send Bill
                  </button>

                  {/* कस्टमाइज्ड स्टेटस सेलेक्टर - Dine-In और Pickup के अनुसार स्टेटस बदलना */}
                  <div className="relative">
                    <select 
                      value={o.status || 'pending'} 
                      onChange={(e) => handleStatusChange(o, e.target.value)} 
                      className={`appearance-none font-bold text-[10px] uppercase rounded-xl p-2 px-3 outline-none cursor-pointer transition-colors duration-300 shadow-sm pr-6 border ${
                        o.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-500/10 dark:text-green-500 dark:border-green-500/20' : 
                        o.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-500 dark:border-red-500/20' :
                        o.status === 'preparing' ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20' :
                        'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-black/60 dark:text-white dark:border-white/10'
                      }`}
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
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-500 dark:text-gray-400">
                      <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
