'use client';
import React, { useMemo } from 'react';
import { 
  IndianRupee, ShoppingBag, CreditCard, Activity, 
  Download, Calendar, TrendingUp, Send, FileText, AlertOctagon 
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

  // 1. Date के हिसाब से ऑर्डर्स को फ़िल्टर करना
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o.timestamp) return false;
      const d = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      // टाइम को हटाकर सिर्फ YYYY-MM-DD लेना ताकि सही से मैच हो
      const dStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      return dStr >= startDate && dStr <= endDate;
    });
  }, [orders, startDate, endDate]);

  // 2. बिज़नेस के मुख्य आँकड़े (Metrics) निकालना
  const stats = useMemo(() => {
    let grossSales = 0;
    let completedOrders = 0;
    let cashCollected = 0;
    let upiCollected = 0;
    let pendingDue = 0;
    let totalDiscount = 0;
    let rejectedOrdersCount = 0;
    
    // Top Items के लिए
    const itemMap: { [name: string]: { qty: number; rev: number } } = {};

    filteredOrders.forEach(o => {
      const amt = Number(o.total) || 0;
      
      if (o.status === 'rejected' || o.status === 'cancelled') {
        rejectedOrdersCount++;
        return;
      }
      
      // सिर्फ सेटल हुए (Completed) ऑर्डर्स की सेल जोड़ें
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

        // आइटम की गिनती
        o.items?.forEach((it: any) => {
          const name = (it.name || 'Unknown').split('(')[0].trim();
          if (!itemMap[name]) itemMap[name] = { qty: 0, rev: 0 };
          itemMap[name].qty += (Number(it.quantity) || 1);
          itemMap[name].rev += (Number(it.price) * (Number(it.quantity) || 1));
        });
      }
      
      // उधार (Due) का हिसाब (जो रिजेक्ट नहीं हुए हैं)
      if (o.paymentMethod === 'due' && o.status !== 'rejected') {
        pendingDue += amt;
      }
    });

    const aov = completedOrders > 0 ? Math.round(grossSales / completedOrders) : 0;
    const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return { grossSales, completedOrders, cashCollected, upiCollected, pendingDue, totalDiscount, rejectedOrdersCount, aov, topItems };
  }, [filteredOrders]);

  // पेमेंट का प्रतिशत (Progress Bar के लिए)
  const totalCollected = stats.cashCollected + stats.upiCollected;
  const cashPct = totalCollected > 0 ? Math.round((stats.cashCollected / totalCollected) * 100) : 0;
  const upiPct = totalCollected > 0 ? Math.round((stats.upiCollected / totalCollected) * 100) : 0;

  return (
    <div className="space-y-6 pb-10 transition-colors duration-300">
      
      {/* --- HEADER & DATE FILTER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#111] p-4 rounded-3xl shadow-sm border border-neutral-200 dark:border-white/10 gap-4">
        <div>
          <h2 className="text-xl font-black uppercase text-neutral-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-orange-500" size={24} /> Admin Dashboard
          </h2>
          <p className="text-[11px] text-neutral-500 font-bold mt-1 tracking-widest uppercase">Overview & Analytics</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Filters */}
          <div className="flex bg-neutral-100 dark:bg-white/5 p-1 rounded-xl">
            <button onClick={() => applyQuickSalesFilter('today')} className="px-3 py-1.5 text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 rounded-lg">Today</button>
            <button onClick={() => applyQuickSalesFilter('yesterday')} className="px-3 py-1.5 text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 rounded-lg">Yesterday</button>
            <button onClick={() => applyQuickSalesFilter('month')} className="px-3 py-1.5 text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-500 rounded-lg">Month</button>
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-500/10 p-1.5 rounded-xl border border-orange-200 dark:border-orange-500/20">
            <Calendar size={14} className="text-orange-600 ml-1 shrink-0" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="bg-transparent text-[11px] font-bold text-orange-800 dark:text-orange-400 outline-none cursor-pointer"
            />
            <span className="text-orange-400 font-black text-[10px]">TO</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="bg-transparent text-[11px] font-bold text-orange-800 dark:text-orange-400 outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* --- 4 MAIN METRIC CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/10 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <IndianRupee className="absolute -right-4 -bottom-4 text-emerald-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 relative z-10">Gross Sales (कुल बिक्री)</p>
          <p className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1 relative z-10">₹{stats.grossSales.toLocaleString('en-IN')}</p>
        </div>

        {/* Orders Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/10 p-5 rounded-3xl border border-blue-200 dark:border-blue-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <ShoppingBag className="absolute -right-4 -bottom-4 text-blue-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 relative z-10">Total Bills (बिल बने)</p>
          <p className="text-3xl font-black font-mono text-blue-700 dark:text-blue-400 mt-1 relative z-10">{stats.completedOrders}</p>
        </div>

        {/* AOV Card */}
        <div className="bg-gradient-to-br from-purple-50 to-fuchsia-100 dark:from-purple-900/20 dark:to-fuchsia-900/10 p-5 rounded-3xl border border-purple-200 dark:border-purple-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <Activity className="absolute -right-4 -bottom-4 text-purple-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400 relative z-10">Avg Order Value (औसत बिल)</p>
          <p className="text-3xl font-black font-mono text-purple-700 dark:text-purple-400 mt-1 relative z-10">₹{stats.aov}</p>
        </div>

        {/* Udhari Card */}
        <div className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-900/20 dark:to-red-900/10 p-5 rounded-3xl border border-rose-200 dark:border-rose-800/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <CreditCard className="absolute -right-4 -bottom-4 text-rose-500/20 group-hover:scale-110 transition-transform" size={100} />
          <p className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 relative z-10">Market Due (बाज़ार में उधार)</p>
          <p className="text-3xl font-black font-mono text-rose-700 dark:text-rose-400 mt-1 relative z-10">₹{stats.pendingDue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* --- MIDDLE SECTION: PAYMENT SPLIT & TOP ITEMS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Breakdown */}
        <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col justify-center">
          <h3 className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-white/10 pb-3 mb-5">
            💳 Payment Collection Source
          </h3>
          
          <div className="space-y-5">
            {/* Cash */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-amber-600 dark:text-amber-500">💵 Cash (गल्ला)</span>
                <span className="text-neutral-900 dark:text-white font-mono font-black">₹{stats.cashCollected.toLocaleString('en-IN')} <span className="text-neutral-400 font-normal">({cashPct}%)</span></span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-white/5 rounded-full h-3 overflow-hidden border border-neutral-200 dark:border-transparent">
                <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${cashPct}%` }}></div>
              </div>
            </div>

            {/* UPI */}
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-blue-600 dark:text-blue-400">📱 UPI / Online</span>
                <span className="text-neutral-900 dark:text-white font-mono font-black">₹{stats.upiCollected.toLocaleString('en-IN')} <span className="text-neutral-400 font-normal">({upiPct}%)</span></span>
              </div>
              <div className="w-full bg-neutral-100 dark:bg-white/5 rounded-full h-3 overflow-hidden border border-neutral-200 dark:border-transparent">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${upiPct}%` }}></div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-dashed border-neutral-200 dark:border-white/10 grid grid-cols-2 gap-4">
               <div className="p-3 bg-orange-50 dark:bg-orange-500/10 rounded-xl border border-orange-100 dark:border-orange-500/20 text-center">
                 <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">Discounts Given</p>
                 <p className="text-lg font-black font-mono text-orange-600 dark:text-orange-500 mt-0.5">- ₹{stats.totalDiscount}</p>
               </div>
               <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-100 dark:border-red-500/20 text-center">
                 <p className="text-[10px] font-black uppercase text-red-600 dark:text-red-400">Rejected / Fake</p>
                 <p className="text-lg font-black font-mono text-red-600 dark:text-red-500 mt-0.5">{stats.rejectedOrdersCount} Bills</p>
               </div>
            </div>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-neutral-200 dark:border-white/5 shadow-sm flex flex-col">
          <h3 className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-200 border-b border-neutral-100 dark:border-white/10 pb-3 mb-5">
            🔥 Top 5 Best Selling Items
          </h3>
          
          {stats.topItems.length === 0 ? (
             <div className="flex-1 flex items-center justify-center">
               <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">No Sales Data Found.</p>
             </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {stats.topItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 rounded-2xl hover:border-orange-500 dark:hover:border-orange-500 transition-colors">
                   <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-orange-500 opacity-80">#{idx + 1}</span>
                      <span className="text-xs font-bold text-neutral-900 dark:text-gray-200">{item.name}</span>
                   </div>
                   <div className="flex items-center gap-4 text-right">
                     <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">{item.qty} Qty</span>
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
           <p className="text-sm font-black uppercase text-neutral-800 dark:text-neutral-100">📥 Export & Reports</p>
           <p className="text-[10px] text-neutral-500 font-bold mt-1">अपने सीए (CA) को डेटा भेजें या WhatsApp पर रिपोर्ट मंगाएं।</p>
         </div>
         <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button 
              onClick={handleExportOrders}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-sm flex justify-center items-center gap-1.5 transition-all"
            >
              <FileText size={14} /> Sales Ledger (Excel)
            </button>
            <button 
              onClick={handleExportCustomers}
              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-sm flex justify-center items-center gap-1.5 transition-all"
            >
              <Download size={14} /> Customers (Excel)
            </button>
            <button 
              onClick={handleSendDailyClosingReport}
              className="w-full md:w-auto bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-sm flex justify-center items-center gap-1.5 transition-all"
            >
              <Send size={14} /> Send WhatsApp Report
            </button>
         </div>
      </div>
      
      {/* Danger Zone */}
      <div className="text-right">
        <button 
          onClick={handleResetSalesData}
          className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-500 hover:text-white bg-transparent hover:bg-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          <AlertOctagon size={12} /> Reset All Sales Data
        </button>
      </div>

    </div>
  );
}
