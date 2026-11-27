'use client';
import React, { useMemo } from 'react';
import { 
  IndianRupee, ShoppingBag, CreditCard, Activity, 
  Download, Calendar, Globe, Send, FileText, AlertOctagon 
} from 'lucide-react';
import { formatBillNumber } from '../../lib/utils'; 

interface DashboardStatsProps {
  orders: any[];
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  applyQuickSalesFilter: (filterType: 'today' | 'yesterday' | 'week' | 'month') => void;
  handleResetSalesData: () => void;
  handleSendDailyClosingReport: () => void;
  handleExportOrders: () => void;
  handleExportCustomers: () => void;
  setSelectedCustomerHistory: (customer: any) => void;
}

export default function DashboardStats({
  orders,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  applyQuickSalesFilter,
  handleResetSalesData,
  handleSendDailyClosingReport,
  handleExportOrders,
  handleExportCustomers,
  setSelectedCustomerHistory
}: DashboardStatsProps) {

  // 1. सिर्फ 'ONLINE ORDERS' को फ़िल्टर करना और Date मिलाना
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 🔴 सबसे ज़रूरी लाइन: अगर यह बिल काउंटर (PC_POS) से कटा है, तो इसे डैशबोर्ड में मत दिखाओ
      if (o.source === 'PC_POS') return false;

      if (!o.timestamp) return false;
      const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      const dStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      return dStr >= startDate && dStr <= endDate;
    });
  }, [orders, startDate, endDate]);

  // 2. ऑनलाइन बिज़नेस के मुख्य आँकड़े (Metrics) निकालना
  const stats = useMemo(() => {
    let grossSales = 0;
    let completedOrders = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let pendingDue = 0;
    let totalDiscount = 0;
    let rejectedOrdersCount = 0;
    
    // Top Items के लिए (यहाँ name को टाइप में जोड़ दिया गया है)
    const itemMap: { [name: string]: { name: string; qty: number; rev: number } } = {};

    filteredOrders.forEach(o => {
      const amt = Number(o.total) || 0;
      
      if (o.status === 'rejected' || o.status === 'cancelled') {
        rejectedOrdersCount++;
        return;
      }
      
      // सिर्फ सेटल हुए (Completed) ऑनलाइन ऑर्डर्स की सेल जोड़ें
      if (o.status === 'completed') {
        grossSales += amt;
        completedOrders += 1;
        totalDiscount += (Number(o.discountAmount) || 0);

        if (o.paymentMethod === 'upi') upiCollected += amt;
        else if (o.paymentMethod === 'cash') cashCollected += amt;
        else if (o.paymentMethod === 'split') {
          cashCollected += (Number(o.splitCashAmount) || 0);
          upiCollected += (Number(o.splitUpiAmount) || 0);
        }

        // ऑनलाइन बिकने वाले आइटम की गिनती
        o.items?.forEach((it: any) => {
          const name = (it.name || 'Unknown').split('(')[0].trim();
          // यहाँ name को ऑब्जेक्ट के अंदर सेव कर दिया
          if (!itemMap[name]) itemMap[name] = { name: name, qty: 0, rev: 0 };
          itemMap[name].qty += (Number(it.quantity) || 1);
          itemMap[name].rev += (Number(it.price) * (Number(it.quantity) || 1));
        });
      }
      
      // ऑनलाइन उधार (COD / Due) का हिसाब
      if (o.paymentMethod === 'due' && o.status !== 'rejected') {
        pendingDue += amt;
      }
    });

    const aov = completedOrders > 0 ? Math.round(grossSales / completedOrders) : 0;
    const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return { grossSales, completedOrders, cashCollected, upiCollected, pendingDue, totalDiscount, rejectedOrdersCount, aov, topItems };
  }, [filteredOrders]);

  // पेमेंट का प्रतिशत
  const totalCollected = stats.cashCollected + stats.upiCollected;
  const cashPct = totalCollected > 0 ? Math.round((stats.cashCollected / totalCollected) * 100) : 0;
  const upiPct = totalCollected > 0 ? Math.round((stats.upiCollected / totalCollected) * 100) : 0;

  return (
    <div className="space-y-6 pb-10 transition-colors duration-300">
      
      {/* --- HEADER & DATE FILTER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#111] p-4 rounded-3xl shadow-sm border border-neutral-200 dark:border-white/10 gap-4">
        <div>
          <h2 className="text-xl font-black uppercase text-cyan-600 dark:text-cyan-500 flex items-center gap-2">
            <Globe className="text-cyan-500" size={24} /> Online Orders Dashboard
          </h2>
          <p className="text-[11px] text-neutral-500 font-bold mt-1 tracking-widest uppercase">Website & App Sales Only</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filters */}
          <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl">
            <button onClick={() => applyQuickSalesFilter('today')} className="px-3 py-1.5 text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-500 rounded-lg">Today</button>
            <button onClick={() => applyQuickSalesFilter('yesterday')} className="px-3 py-1.5 text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-500 rounded-lg">Yesterday</button>
            <button onClick={() => applyQuickSalesFilter('month')} className="px-3 py-1.5 text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-500 rounded-lg">Month</button>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-500/10 p-1.5 rounded-xl border border-cyan-200 dark:border-cyan-500/20">
            <Calendar size={14} className="text-cyan-600 ml-1 shrink-0" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="bg-transparent text-[11px] font-bold text-cyan-800 dark:text-cyan-400 outline-none cursor-pointer"
            />
            <span className="text-cyan-400 font-black text-[10px]">TO</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="bg-transparent text-[11px] font-bold text-cyan-800 dark:text-cyan-400 outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* --- 4 MAIN METRIC CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/10 p-5 rounded-3xl border border-cyan-200 dark:border-cyan-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <IndianRupee className="absolute -right-4 -bottom-4 text-cyan-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-cyan-700 dark:text-cyan-400 relative z-10">Online Sales (कुल ऑनलाइन बिक्री)</p>
          <p className="text-3xl font-black font-mono text-cyan-700 dark:text-cyan-400 mt-1 relative z-10">₹{stats.grossSales.toLocaleString('en-IN')}</p>
        </div>

        {/* Orders Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/10 p-5 rounded-3xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <Globe className="absolute -right-4 -bottom-4 text-indigo-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 relative z-10">Web Orders (वेब ऑर्डर्स)</p>
          <p className="text-3xl font-black font-mono text-indigo-700 dark:text-indigo-400 mt-1 relative z-10">{stats.completedOrders}</p>
        </div>

        {/* AOV Card */}
        <div className="bg-gradient-to-br from-fuchsia-50 to-pink-100 dark:from-fuchsia-900/20 dark:to-pink-900/10 p-5 rounded-3xl border border-fuchsia-200 dark:border-fuchsia-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <Activity className="absolute -right-4 -bottom-4 text-fuchsia-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-fuchsia-700 dark:text-fuchsia-400 relative z-10">Online AOV (औसत ऑनलाइन बिल)</p>
          <p className="text-3xl font-black font-mono text-fuchsia-700 dark:text-fuchsia-400 mt-1 relative z-10">₹{stats.aov}</p>
        </div>

        {/* Udhari Card */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/10 p-5 rounded-3xl border border-orange-200 dark:border-orange-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <CreditCard className="absolute -right-4 -bottom-4 text-orange-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-orange-700 dark:text-orange-400 relative z-10">Online COD / Due</p>
          <p className="text-3xl font-black font-mono text-orange-700 dark:text-orange-400 mt-1 relative z-10">₹{stats.pendingDue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* --- MIDDLE SECTION: PAYMENT SPLIT & TOP ITEMS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Breakdown */}
        <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col justify-center">
          <h3 className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-white/10 pb-3 mb-5 flex items-center gap-2">
            💳 Online Collection Source
          </h3>
          
          <div className="space-y-5">
            {/* Cash */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-amber-600 dark:text-amber-500">💵 COD / Pay at Counter</span>
                <span className="text-neutral-900 dark:text-white font-mono font-black">₹{stats.cashCollected.toLocaleString('en-IN')} <span className="text-neutral-400 font-normal">({cashPct}%)</span></span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-white/5 rounded-full h-3 overflow-hidden border border-neutral-200 dark:border-transparent">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${cashPct}%` }}></div>
              </div>
            </div>

            {/* UPI */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-blue-600 dark:text-blue-400">📱 Paid Online (UPI/Card)</span>
                <span className="text-neutral-900 dark:text-white font-mono font-black">₹{stats.upiCollected.toLocaleString('en-IN')} <span className="text-neutral-400 font-normal">({upiPct}%)</span></span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-white/5 rounded-full h-3 overflow-hidden border border-neutral-200 dark:border-transparent">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${upiPct}%` }}></div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-dashed border-neutral-200 dark:border-white/10 grid grid-cols-2 gap-4">
               <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-100 dark:border-orange-500/20 text-center">
                 <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">Online Discounts</p>
                 <p className="text-lg font-black font-mono text-orange-600 dark:text-orange-500 mt-0.5">- ₹{stats.totalDiscount}</p>
               </div>
               <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20 text-center">
                 <p className="text-[10px] font-black uppercase text-red-600 dark:text-red-400">Rejected Online</p>
                 <p className="text-lg font-black font-mono text-red-600 dark:text-red-500 mt-0.5">{stats.rejectedOrdersCount} Bills</p>
               </div>
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col">
          <h3 className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-white/10 pb-3 mb-5 flex items-center gap-2">
            🔥 Top 5 Online Items
          </h3>
          
          {stats.topItems.length === 0 ? (
             <div className="flex-1 flex items-center justify-center">
               <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">No Online Sales Yet.</p>
             </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {stats.topItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-100 dark:border-cyan-900/30 rounded-2xl hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors">
                   <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-cyan-600 opacity-80">#{idx + 1}</span>
                      <span className="text-xs font-bold text-neutral-900 dark:text-gray-200">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-4 text-right">
                     <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">{item.qty} Qty</span>
                     <span className="text-sm font-black font-mono text-green-600 dark:text-green-400 w-16">₹{item.rev}</span>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* --- BOTTOM SECTION: EXPORT ACTIONS --- */}
      <div className="bg-white dark:bg-[#111] p-5 rounded-3xl border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
         <div>
           <p className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-100">📥 Online Order Reports</p>
           <p className="text-[10px] text-neutral-500 font-bold mt-1">वेबसाइट और ऐप से आए ऑर्डर्स का डेटा डाउनलोड करें।</p>
         </div>
         <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={handleExportOrders}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-sm flex justify-center items-center gap-1.5 transition-all"
            >
              <FileText size={14} /> Online Sales Excel
            </button>
         </div>
      </div>

    </div>
  );
}
