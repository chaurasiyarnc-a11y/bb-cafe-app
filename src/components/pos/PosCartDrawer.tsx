'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, ShoppingBag, MapPin, Users, User, Printer, Loader2, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast'; // ⚡ यह आवश्यक इम्पोर्ट यहाँ जोड़ा गया है

interface PosCartDrawerProps {
  isHindi: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cart: any[];
  setCart: (cart: any[]) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPoints: number;
  setCustomerPoints: (val: number) => void;
  pointsToRedeem: number;
  setPointsToRedeem: (val: number) => void;
  customDiscount: number;
  setCustomDiscount: (val: number) => void;
  fulfillmentType: 'delivery' | 'pickup' | 'table';
  setFulfillmentType: (val: 'delivery' | 'pickup' | 'table') => void;
  selectedArea: any;
  setSelectedArea: (val: any) => void;
  DELIVERY_AREAS: any[];
  address: string;
  setAddress: (val: string) => void;
  tableNumber: string;
  setTableNumber: (val: string) => void;
  chefInstructions: string;
  setChefInstructions: (val: string) => void;
  isSubmittingOrder: boolean;
  paymentMethod: 'cash' | 'upi' | 'card';
  setPaymentMethod: (val: 'cash' | 'upi' | 'card') => void;
  ketchupAddon: boolean;
  setKetchupAddon: (val: boolean) => void;
  oreganoAddon: boolean;
  setOreganoAddon: (val: boolean) => void;
  chiliFlakesAddon: boolean;
  setChiliFlakesAddon: (val: boolean) => void;
  noCutlery: boolean;
  setNoCutlery: (val: boolean) => void;
  getCartSubtotal: () => number;
  getCartAddonsPrice: () => number;
  getDeliveryCharge: () => number;
  getFreeDeliveryProgressPercent: () => number;
  getTotalPointsRedeemedInCart: () => number;
  getTotalBillPrice: () => number;
  loyaltyRules: any[];
  handlePlaceOrder: (e: any) => void;
  handleDetectLocation: () => void;
  setIsCustomerModalOpen: (open: boolean) => void;
  searchDbCustomers: (text: string) => void;
  handleUpdateCartQuantity: (id: string, amount: number) => void;
  handleUpdateCartItemNote: (id: string, note: string) => void;
  showAddonsSection: boolean;
  triggerBeep: (type: 'tap' | 'success') => void;
}

export default function PosCartDrawer({
  isHindi, isCartOpen, setIsCartOpen, cart, setCart, customerPhone, setCustomerPhone,
  customerName, setCustomerName, customerPoints, setCustomerPoints, pointsToRedeem, setPointsToRedeem,
  customDiscount, setCustomDiscount, fulfillmentType, setFulfillmentType, selectedArea, setSelectedArea,
  DELIVERY_AREAS, address, setAddress, tableNumber, setTableNumber, chefInstructions, setChefInstructions,
  isSubmittingOrder, paymentMethod, setPaymentMethod, ketchupAddon, setKetchupAddon, oreganoAddon, setOreganoAddon,
  chiliFlakesAddon, setChiliFlakesAddon, noCutlery, setNoCutlery, getCartSubtotal, getCartAddonsPrice,
  getDeliveryCharge, getFreeDeliveryProgressPercent, getTotalPointsRedeemedInCart, getTotalBillPrice,
  loyaltyRules, handlePlaceOrder, handleDetectLocation, setIsCustomerModalOpen, searchDbCustomers,
  handleUpdateCartQuantity, handleUpdateCartItemNote, showAddonsSection, triggerBeep
}: PosCartDrawerProps) {
  if (!isCartOpen) return null;

  const handleRedeemLoyaltyReward = (rule: any) => {
    triggerBeep('tap');
    const currentRedeemedCost = getTotalPointsRedeemedInCart();
    const availablePointsPool = customerPoints - currentRedeemedCost;

    if (availablePointsPool < rule.pointsCost) {
      toast.error("Not enough points!");
      return;
    }

    setCart([
      ...cart,
      {
        id: `reward-${rule.id}-${Date.now()}`,
        name: `🎁 FREE ${rule.rewardName}`,
        price: 0,
        quantity: 1,
        isReward: true,
        pointsCost: Number(rule.pointsCost) || 0,
        category: "Special"
      }
    ]);
    toast.success(`${rule.rewardName} added as reward!`);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsCartOpen(false)}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] cursor-pointer"
      />

      <motion.div
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed right-0 bottom-0 top-0 w-full sm:w-[460px] bg-[#0b0c10] border-l border-white/10 p-5 z-[120] flex flex-col justify-between shadow-2xl overflow-y-auto pb-32 scrollbar-thin text-gray-100 font-sans"
      >
        <div>
          {/* Progress Header */}
          <div className="sticky top-0 z-30 bg-[#0b0c10] pb-3 border-b border-white/5 space-y-2 mb-4">
            {fulfillmentType === "delivery" && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 space-y-1.5 text-[10px] font-bold">
                <div className="flex justify-between items-center font-black uppercase text-orange-400">
                  <span>🚚 Free Delivery Target:</span>
                  <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
                </div>
              </div>
            )}

            <div className="bg-neutral-950 p-3 rounded-2xl border border-white/5 flex justify-between items-center font-mono font-bold">
              <span className="text-[10px] font-black uppercase text-gray-400 font-sans">LIVE BILL TOTAL:</span>
              <span className="text-sm font-black text-yellow-400 font-mono">₹{getTotalBillPrice()}</span>
            </div>
          </div>

          {/* Cart Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white font-mono font-bold">Your POS Cart</h2>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => { triggerBeep('tap'); setCart([]); }}
                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <Trash2 size={12} /> Clear Cart
                </button>
              )}
              <button onClick={() => { triggerBeep('tap'); setIsCartOpen(false); }} className="p-2.5 bg-white/5 text-white rounded-full hover:bg-white/10 transition-all">
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Cart Items */}
          <div className="space-y-3.5 mb-4">
            {cart.map((item) => (
              <div key={item.id} className="flex flex-col bg-white/[0.02] p-4 rounded-2xl border border-white/5 shadow-sm transition-colors duration-200 gap-1.5 font-bold">
                <div className="flex justify-between items-center">
                  <div className="min-w-0 pr-3 flex-1">
                    <h4 className="font-bold text-xs text-gray-100 truncate">{item.name}</h4>
                    <p className="text-orange-500 font-black mt-1 text-[11px] font-mono">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-xl border border-white/10 flex-shrink-0">
                    <button type="button" onClick={() => handleUpdateCartQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded text-sm font-black">-</button>
                    <span className="font-black text-xs px-1 text-white font-mono">{item.quantity}</span>
                    <button type="button" onClick={() => handleUpdateCartQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center bg-green-500/10 text-green-500 rounded text-sm font-black">+</button>
                  </div>
                </div>
                <input 
                  type="text"
                  placeholder="Instructions for KOT..."
                  value={item.note || ''}
                  onChange={(e) => handleUpdateCartItemNote(item.id, e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-[10px] p-2 rounded-xl outline-none focus:border-orange-500/40 text-yellow-300 font-bold"
                />
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-center py-8 text-gray-500 text-[10px] uppercase font-bold tracking-wider">Your bill is empty</p>
            )}
          </div>

          {/* Add-ons */}
          {showAddonsSection && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200 mt-4 font-bold">
              <p className="text-[9px] font-black uppercase text-gray-400">Add Add-ons to order:</p>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => { triggerBeep('tap'); setKetchupAddon(!ketchupAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-600' : 'border-white/5 bg-transparent text-gray-300'}`}>Ketchup (+₹10)</button>
                <button type="button" onClick={() => { triggerBeep('tap'); setOreganoAddon(!oreganoAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-600' : 'border-white/5 bg-transparent text-gray-300'}`}>Oregano (+₹10)</button>
                <button type="button" onClick={() => { triggerBeep('tap'); setChiliFlakesAddon(!chiliFlakesAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'border-white/5 bg-transparent text-gray-300'}`}>Chili Flakes (+₹10)</button>
              </div>
            </div>
          )}

          {/* Fulfillment selection */}
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 transition-colors duration-200 mt-4 font-bold">
            <label className="text-[10px] font-black uppercase text-gray-400">Select Order Mode:</label>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => { triggerBeep('tap'); setFulfillmentType("delivery"); }} className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "delivery" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300 font-semibold'}`}><span className="text-base">🛵</span><span className="text-[9px] font-black">Home Delivery</span></button>
              <button type="button" onClick={() => { triggerBeep('tap'); setFulfillmentType("pickup"); }} className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "pickup" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}><span className="text-base">🛍️</span><span className="text-[9px] font-black">Self-Pickup</span></button>
              <button type="button" onClick={() => { triggerBeep('tap'); setFulfillmentType("table"); }} className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "table" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}><span className="text-base">🍽️</span><span className="text-[9px] font-black">Dine-In (Table)</span></button>
            </div>
          </div>

          {fulfillmentType === "delivery" && (
            <div className="space-y-4 mt-4 font-bold">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
                <label className="text-[9px] font-black uppercase text-gray-400">Select Delivery Zone (KM):</label>
                <div className="grid grid-cols-2 gap-2">
                  {DELIVERY_AREAS.map((area) => {
                    const isSelected = selectedArea.name === area.name;
                    return (
                      <button type="button" key={area.name} onClick={() => { triggerBeep('tap'); setSelectedArea(area); }} className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 ${isSelected ? 'border-orange-500 bg-orange-500/10 text-orange-400 shadow-md font-black' : 'border-white/5 bg-white/[0.01] text-neutral-300 hover:border-white/10'}`}><span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span><div className="flex justify-between items-center w-full mt-2 font-mono"><span className="text-[8px] font-black text-neutral-300 font-bold">Fee: ₹{area.fee}</span><span className="text-[8px] font-black bg-white/5 px-1.5 py-0.5 rounded text-yellow-400">Min: ₹{area.minFree}</span></div></button>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2 transition-colors duration-200">
                <div className="flex items-center justify-between"><div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/><h3 className="font-black uppercase text-[10px]">Delivery Address</h3></div><button type="button" onClick={handleDetectLocation} className="text-[8px] bg-green-600 hover:bg-green-700 text-white font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase">📍 Live GPS Location</button></div>
                <textarea placeholder="Ghar ka address, Landmark ke saath..." value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-semibold text-white outline-none resize-none h-16" />
              </div>
            </div>
          )}

          {fulfillmentType === "table" && (
            <div className="mt-3 p-3 bg-neutral-900 rounded-xl border border-white/5 space-y-3 transition-all duration-300">
              <p className="text-[10px] font-black uppercase text-orange-400">🪑 Choose Dine-In Table:</p>
              <div className="space-y-1.5">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">For 2 People:</span>
                <div className="grid grid-cols-3 gap-2">
                  {["Table 1", "Table 2", "Table 3"].map((t) => {
                    const isSelected = tableNumber === t;
                    return (
                      <button key={t} type="button" onClick={() => { triggerBeep('tap'); setTableNumber(t); }} className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${isSelected ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-sm font-black' : 'border-white/10 bg-white/5 text-neutral-300'}`}><span className="block">{t}</span><span className="text-[7.5px] text-gray-400 font-normal">👥 2 seats</span></button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">For 4 People:</span>
                <div className="grid grid-cols-3 gap-2">
                  {["Table 4", "Table 5", "Table 6"].map((t) => {
                    const isSelected = tableNumber === t;
                    return (
                      <button key={t} type="button" onClick={() => { triggerBeep('tap'); setTableNumber(t); }} className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${isSelected ? 'border-orange-500 bg-orange-500/15 text-orange-400 shadow-sm font-black' : 'border-white/10 bg-white/5 text-neutral-300'}`}><span className="block">{t}</span><span className="text-[7.5px] text-gray-400 font-normal">👥👥 4 seats</span></button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Loyalty checking and selection */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2.5 mt-4 font-bold">
            <p className="text-[9px] font-black uppercase text-gray-400">Customer Loyalty Profile</p>
            <div className="flex gap-2">
              <input type="tel" maxLength={10} placeholder="Guest 10-digit phone..." value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="bg-[#050505] border border-white/5 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-orange-500 font-bold flex-1 font-mono" />
              <button type="button" onClick={handleCheckLoyalty} className="bg-orange-500 hover:bg-orange-600 text-black text-xs font-black px-4 py-2 rounded-xl transition-colors flex items-center gap-1 shrink-0 font-sans"><User size={12} /> Verify</button>
              <button type="button" onClick={() => { triggerBeep('tap'); setIsCustomerModalOpen(true); searchDbCustomers(''); }} className="p-2.5 bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-yellow-300 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0" title="Search Guest from Directory"><Users size={16} /></button>
            </div>
            {customerPhone && customerPoints > 0 && (
              <div className="mt-2 space-y-3">
                <div className="bg-yellow-400/5 border border-yellow-400/20 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5"><p className="text-[9px] font-black text-yellow-300 uppercase leading-none">Net Points Balance</p><p className="text-[10px] text-gray-300 font-bold mt-1 font-sans">{customerName || 'Loyal Guest'}</p></div>
                  <div className="text-right"><span className="text-sm font-black text-yellow-400 font-mono">{customerPoints - getTotalPointsRedeemedInCart()}</span><span className="text-[8px] text-gray-400 block font-sans">Points Left</span></div>
                </div>
                {loyaltyRules.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                    <p className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Redeem Reward Item (रिडीम करें):</p>
                    <div className="grid grid-cols-2 gap-1.5 font-mono">
                      {loyaltyRules.map((rule) => {
                        const remainingPoints = customerPoints - getTotalPointsRedeemedInCart();
                        const isEligible = remainingPoints >= rule.pointsCost;
                        return (
                          <button key={rule.id} type="button" disabled={!isEligible} onClick={() => handleRedeemLoyaltyReward(rule)} className={`py-2 px-2 rounded-xl text-[9px] font-black uppercase border truncate transition-all ${isEligible ? 'bg-yellow-400 border-yellow-500 text-black hover:bg-yellow-500 font-sans' : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed font-sans'}`}>🎁 Free {rule.rewardName} ({rule.pointsCost} Pts)</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Discount */}
          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 mt-4 font-bold">
            <label className="text-[10px] font-black uppercase text-gray-400">POS Custom Discount (₹)</label>
            <input type="number" placeholder="e.g. 50" value={customDiscount || ''} onChange={(e) => setCustomDiscount(Math.max(0, Number(e.target.value)))} className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono font-bold" />
            <div className="flex gap-1.5 flex-wrap">
              {[10, 20, 50, 100].map((val) => (
                <button type="button" key={val} onClick={() => { triggerBeep('tap'); setCustomDiscount(val); }} className="bg-neutral-900 text-[9px] text-orange-400 font-bold py-1 px-2.5 rounded-lg border border-white/5 hover:border-orange-500/30 transition-all font-mono">-₹{val}</button>
              ))}
            </div>
          </div>

          {/* Eco packaging */}
          <div className="bg-green-950/10 border border-green-500/10 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200 mt-4 font-bold">
            <div className="space-y-0.5"><p className="text-[10px] font-black text-green-500 uppercase tracking-tight">Eco-Friendly Pack</p><p className="text-[8px] text-gray-400">Skip single-use plastic spoon/tissue paper</p></div>
            <input type="checkbox" checked={noCutlery} onChange={() => { triggerBeep('tap'); setNoCutlery(!noCutlery); }} className="w-4 h-4 accent-green-600" />
          </div>
        </div>

        {/* Bill summary */}
        <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white mt-4 font-mono font-bold">
          <div className="flex justify-between mb-1.5 text-xs"><span>Subtotal</span> <span>₹{getCartSubtotal()}</span></div>
          {getCartAddonsPrice() > 0 && <div className="flex justify-between mb-1.5 text-xs"><span>Add-ons</span> <span>+₹{getCartAddonsPrice()}</span></div>}
          {getTotalPointsRedeemedInCart() > 0 && <div className="flex justify-between mb-1.5 text-xs text-yellow-300 font-bold"><span>Redeemed Points Cost</span> <span>{getTotalPointsRedeemedInCart()} Points</span></div>}
          {customDiscount > 0 && <div className="flex justify-between mb-1.5 text-xs text-green-200 font-bold"><span>Savings/Discount</span> <span>-₹{customDiscount}</span></div>}
          {fulfillmentType === "delivery" && <div className="flex justify-between mb-3 text-xs opacity-90"><span>Delivery Charge</span> <span>₹{getDeliveryCharge()}</span></div>}
          <div className="h-px bg-white/20 mb-3" />
          <div className="flex justify-between font-black text-xl font-mono"><span>Grand Total</span> <span>₹{getTotalBillPrice()}</span></div>
        </div>

        {/* Payment options */}
        <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 space-y-2.5 transition-colors duration-200 mt-4 font-bold">
          <label className="text-[9px] font-black uppercase text-gray-400">Select Counter Payment Method:</label>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => { triggerBeep('tap'); setPaymentMethod("cash"); }} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "cash" ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}><span className="text-sm">💵</span><span className="text-[9px] font-black">Cash </span></button>
            <button type="button" onClick={() => { triggerBeep('tap'); setPaymentMethod("upi"); }} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "upi" ? 'border-orange-500 bg-[#fffae6]/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}><span className="text-sm">📱</span><span className="text-[9px] font-black">UPI QR</span></button>
            <button type="button" onClick={() => { triggerBeep('tap'); setPaymentMethod("card"); }} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "card" ? 'border-orange-500 bg-[#fffae6]/10 text-orange-400 font-black shadow-sm' : 'border-white/5 text-gray-300'}`}><span className="text-sm">💳</span><span className="text-[9px] font-black">Card</span></button>
          </div>

          <div className="space-y-1.5 mt-2">
            <label className="text-[8px] font-black uppercase text-gray-400">Special Instructions for KOT</label>
            <input type="text" placeholder="e.g. Extra Spicy, Soft Base..." value={chefInstructions} onChange={(e) => setChefInstructions(e.target.value)} className="w-full bg-[#050505] border border-white/5 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-semibold" />
          </div>

          <button onClick={handlePlaceOrder} type="button" disabled={isSubmittingOrder} className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-4">
            {isSubmittingOrder ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} />Processing transaction... ⏳</span>
            ) : (
              <span className="flex items-center gap-2 justify-center"><Printer size={16} /><span>CONFIRM & PRINT BILL 🚀</span></span>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
}
