'use client';
import React, { useMemo } from 'react';
import { BarChart3, Download, Calendar, MapPin, Phone } from 'lucide-react';
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

  // तारीख के अनुसार रेवेन्यू और ऑडिट कैलकुलेशन
  const auditStats = useMemo(() => {
    const startObj = new Date(startDate);
    startObj.setHours(0, 0, 0, 0);
    const endObj = new Date(endDate);
    endObj.setHours(23, 59, 59, 999);

    const rangeOrders = orders.filter(o => {
      if (!o.timestamp) return false;
      const orderDate = o.timestamp?.toDate ? o.timestamp.toDate() : new Date(o.timestamp);
      return orderDate >= startObj && orderDate <= endObj;
    });

    const validRangeOrders = rangeOrders.filter(o => o.status !== "rejected" && o.status !== "fake");

    const todayStr = new Date().toDateString();
    const todayRejectedCount = orders.filter(o => {
      if (!o.timestamp) return false;
      const oDate = o.timestamp?.toDate ? o.timestamp.toDate().toDateString() : new Date(o.timestamp).toDateString();
      return o.status === "rejected" && oDate === todayStr;
    }).length;

    const rangeRevenue = validRangeOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length;

    let cashSales = 0;
    let upiSales = 0;
    validRangeOrders.forEach(o => {
      const amt = Number(o.total) || 0;
      if (o.paymentMethod === 'cod' || o.paymentMethod === 'Cash' || o.billNumber % 2 === 0) {
        cashSales += amt;
      } else {
        upiSales += amt;
      }
    });

    return {
      rangeRevenue,
      rangeCount: rangeOrders.length,
      rejectedCount: rangeOrders.filter(o => o.status === "rejected").length,
      todayRejectedCount,
      active: activeCount,
      cashSales,
      upiSales,
      rangeOrders
    };
  }, [orders, startDate, endDate]);

  // टॉप 5 बेस्ट-सेलिंग डिशेज की गणना
  const topSellingDishes = useMemo(() => {
    const countsMap: any = {};
    orders.forEach(o => {
      o.items?.forEach((item: any) => {
        if (!item.name) return;
        countsMap[item.name] = (countsMap[item.name] || 0) + (Number(item.quantity) || 1);
      });
    });

    return Object.entries(countsMap)
      .map(([name, qty]: any) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  // पिछले 7 दिनों का सेल्स ग्राफ कैलकुलेशन
  const last7DaysChartData = useMemo(() => {
    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        dateStr: d.toDateString(),
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        sales: 0
      });
    }

    orders.forEach(o => {
      if (!o.timestamp) return;
      const orderDateStr = o.timestamp?.toDate ? o.timestamp.toDate().toDateString() : new Date(o.timestamp).toDateString();
      const match = days.find(day => day.dateStr === orderDateStr);
      if (match) {
        match.sales += (Number(o.total) || 0);
      }
    });

    const maxSales = Math.max(...days.map(d => d.sales), 100);

    return days.map(day => ({
      ...day,
      percentage: (day.sales / maxSales) * 100
    }));
  }, [orders]);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-orange-500 uppercase tracking-wider flex items-center gap-2">
        <BarChart3 size={20}/> Sales Dashboard
      </h3>
      
      {/* त्वरित फ़िल्टर बटन्स (English Labels के साथ) */}
      <div className="grid grid-cols-4 gap-2 bg-[#111] p-3 rounded-2xl border border-white/5 font-sans">
        <button onClick={() => applyQuickSalesFilter('today')} className="py-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl font-black text-[10px] uppercase transition-all">Today's Sale</button>
        <button onClick={() => applyQuickSalesFilter('yesterday')} className="py-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl font-black text-[10px] uppercase transition-all">Yesterday's Sale</button>
        <button onClick={() => applyQuickSalesFilter('week')} className="py-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl font-black text-[10px] uppercase transition-all">Weekly Sale</button>
        <button onClick={() => applyQuickSalesFilter('month')} className="py-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-xl font-black text-[10px] uppercase transition-all">Monthly Sale</button>
      </div>

      {/* कस्टम डेट ऑडिट बॉक्स */}
      <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-4">
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">🎯 Custom Date-Range Auditor</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-orange-500 outline-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-gray-500 uppercase">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="bg-black/60 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-orange-500 outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* स्टेट्स ग्रिड */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-white/5 pt-4">
          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
            <p className="text-[9px] font-bold text-gray-500 uppercase">Range Sales</p>
            <h3 className="text-base font-black text-green-400 mt-1">₹{auditStats.rangeRevenue}</h3>
          </div>
          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
            <p className="text-[9px] font-bold text-gray-500 uppercase">Range Orders</p>
            <h3 className="text-base font-black text-yellow-400 mt-1">{auditStats.rangeCount}</h3>
          </div>
          <div className="bg-white/[0.01] border border-white/5 p-3 rounded-2xl text-center">
            <p className="text-[9px] font-bold text-gray-500 uppercase">Active Kitchen</p>
            <h3 className="text-base font-black text-orange-500 mt-1">{auditStats.active}</h3>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl text-center">
            <p className="text-[9px] font-bold text-red-400 uppercase">Today's Rejected 🚫</p>
            <h3 className="text-base font-black text-red-500 mt-1">{auditStats.todayRejectedCount}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-500 uppercase">Cash Collected:</span>
            <span className="text-xs font-black text-green-400">₹{auditStats.cashSales}</span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl flex justify-between items-center">
            <span className="text-[10px] font-black text-gray-500 uppercase">Online (UPI):</span>
            <span className="text-xs font-black text-blue-400">₹{auditStats.upiSales}</span>
          </div>
        </div>
      </div>

      {/* चार्ट ग्राफ़ */}
      <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-3">
        <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">📈 Last 7 Days Sales Trend</p>
        <div className="h-44 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-1">
          {last7DaysChartData.map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[8px] font-bold text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">₹{day.sales}</span>
              <div 
                style={{ height: `${day.percentage}%` }} 
                className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg min-h-[4px] relative"
              ></div>
              <span className="text-[9px] font-bold text-gray-500 uppercase mt-1">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* बेस्ट सेलिंग डिशेज */}
      <div className="bg-[#111] border border-white/5 p-5 rounded-3xl space-y-3">
        <p className="text-[10px] font-black uppercase text-orange-400 tracking-wider">🔥 Top 5 Best Selling Dishes</p>
        <div className="space-y-2">
          {topSellingDishes.map((dish, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl text-xs font-bold">
              <span className="text-gray-300">{idx + 1}. {dish.name}</span>
              <span className="bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full text-[10px] font-black">{dish.qty} times</span>
            </div>
          ))}
          {topSellingDishes.length === 0 && (
            <p className="text-center text-[10px] text-gray-500 uppercase font-bold py-2">No sales logged yet...</p>
          )}
        </div>
      </div>

      {/* डेटा मैनेजमेंट एक्शन्स */}
      <div className="grid grid-cols-2 gap-3 bg-[#111]/30 border border-white/5 p-4 rounded-[2rem] shadow-xl">
        <button onClick={handleResetSalesData} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase font-mono">
          Reset All Sales Data 🚫
        </button>
        <button onClick={handleSendDailyClosingReport} className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-green-500/10 font-mono">
          📲 Send Report to Owner
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-[#111]/30 border border-white/5 p-4 rounded-[2rem] shadow-xl">
        <button onClick={handleExportOrders} className="bg-green-600 hover:bg-green-700 text-white font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-green-500/10 font-mono">
          <Download size={14}/> Sales Ledger Excel
        </button>
        <button onClick={handleExportCustomers} className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-4 px-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all uppercase shadow-md border border-orange-500/10">
          <Download size={14}/> Customer List Excel
        </button>
      </div>

      {/* स्थाई ट्रांजेक्शन लेजर (Permanent Ledger) */}
      <div className="space-y-4 font-mono">
        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest pt-2">📚 Permanent Financial Ledger</h4>
        {orders.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-xs uppercase font-bold tracking-widest">No transaction data logged...</p>
        ) : (
          orders.map((o) => (
            <div key={o.id} className={`p-5 rounded-3xl flex justify-between items-center relative overflow-hidden text-xs border ${o.status === 'rejected' ? 'bg-red-500/[0.02] border-red-500/20' : 'bg-[#111] border-white/5'}`}>
              <div className="space-y-1 pr-4">
                {o.status === 'rejected' && (
                  <div className="mb-2 bg-red-500/10 text-red-500 border border-red-500/20 text-[8px] font-black uppercase px-2.5 py-1 rounded-md w-max">
                    🚫 Rejected / Fake Order
                  </div>
                )}
                <div className="flex gap-2.5">
                  <span className="text-[10px] font-black uppercase text-gray-500">Bill No: #{formatBillNumber(o.billNumber || 0)}</span>
                  <span className="text-[10px] font-black uppercase text-yellow-500">Token: #{o.tokenNumber || "N/A"}</span>
                </div>
                <h4 className="font-extrabold text-sm text-gray-300">Name: {o.customerName || "Customer"}</h4>
                <p className="text-[11px] font-bold text-orange-500 font-sans">Mobile: {o.customerPhone || "N/A"}</p>
                <p className="text-[10px] text-gray-400 font-medium">Address: {o.address || "N/A"}</p>
                
                <div className="border-t border-white/5 pt-2 mt-2 space-y-0.5">
                  {o.items?.map((item: any, idx: number) => (
                    <p key={idx} className="text-[11px] font-bold text-gray-400 font-sans">
                      <span className="text-orange-500">×{item.quantity}</span> {item.name}
                    </p>
                  ))}
                </div>
                <p className="text-[9px] font-semibold text-gray-500 mt-2 font-sans">{o.timestamp?.toDate ? o.timestamp.toDate().toLocaleString() : 'Just now'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-black text-lg leading-none ${o.status === 'rejected' ? 'line-through text-red-500' : 'text-green-400'}`}>₹{o.total}</p>
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md mt-2 inline-block ${o.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-400'}`}>
                  {o.status === 'rejected' ? 'REJECTED' : 'PAID'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
