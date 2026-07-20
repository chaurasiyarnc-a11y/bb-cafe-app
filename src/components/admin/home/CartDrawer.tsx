'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Loader2, ChevronRight, ShoppingBag } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isReward?: boolean;
  note?: string;
  category?: string;
  pointsCost?: number;
}

interface DeliveryArea {
  name: string;
  fee: number;
  minFree: number;
  range: string;
}

interface CartDrawerProps {
  isHindi: boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cart: CartItem[];
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  upsellSuggestionItems: any[];
  fulfillmentType: "delivery" | "pickup" | "table";
  setFulfillmentType: (type: "delivery" | "pickup" | "table") => void;
  ketchupAddon: boolean;
  setKetchupAddon: (val: boolean) => void;
  oreganoAddon: boolean;
  setOreganoAddon: (val: boolean) => void;
  chiliFlakesAddon: boolean;
  setChiliFlakesAddon: (val: boolean) => void;
  selectedArea: DeliveryArea;
  setSelectedArea: (area: DeliveryArea) => void;
  DELIVERY_AREAS: DeliveryArea[];
  lastDeliveryAddress: string;
  address: string;
  setAddress: (addr: string) => void;
  handleDetectLocation: () => void;
  tableNumber: string;
  setTableNumber: (num: string) => void;
  noCutlery: boolean;
  setNoCutlery: (val: boolean) => void;
  enteredCoupon: string;
  setEnteredCoupon: (code: string) => void;
  appliedCoupon: any;
  handleApplyCoupon: () => void;
  paymentMethod: "cod" | "upi";
  setPaymentMethod: (method: "cod" | "upi") => void;
  setIsUpiPopupOpen: (open: boolean) => void;
  handleCheckoutClick: () => void;
  isSubmittingOrder: boolean;
  getCartSubtotal: () => number;
  getCartAddonsPrice: () => number;
  getDeliveryCharge: () => number;
  getFreeDeliveryProgressPercent: () => number;
  getTotalBillPrice: () => number;
  getDisplayPrice: (item: any) => string;
  triggerHaptic: () => void;
  showAddonsSection: boolean;
}

export default function CartDrawer({
  isHindi, isCartOpen, setIsCartOpen, cart, addItem, removeItem, upsellSuggestionItems,
  fulfillmentType, setFulfillmentType, ketchupAddon, setKetchupAddon, oreganoAddon, setOreganoAddon,
  chiliFlakesAddon, setChiliFlakesAddon, selectedArea, setSelectedArea, DELIVERY_AREAS,
  lastDeliveryAddress, address, setAddress, handleDetectLocation, tableNumber, setTableNumber,
  noCutlery, setNoCutlery, enteredCoupon, setEnteredCoupon, appliedCoupon, handleApplyCoupon,
  paymentMethod, setPaymentMethod, setIsUpiPopupOpen, handleCheckoutClick, isSubmittingOrder,
  getCartSubtotal, getCartAddonsPrice, getDeliveryCharge, getFreeDeliveryProgressPercent,
  getTotalBillPrice, getDisplayPrice, triggerHaptic, showAddonsSection
}: CartDrawerProps) {
  if (!isCartOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-end font-sans"
    >
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-neutral-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200"
      >
        {/* top sticky target values */}
        <div className="sticky top-0 z-30 bg-white dark:bg-[#0b0c10] pb-3 border-b border-neutral-200 dark:border-white/5 space-y-2">
          {fulfillmentType === "delivery" && (
            <div className="bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 space-y-1.5 text-[10px] font-sans font-bold">
              <div className="flex justify-between items-center font-black uppercase text-orange-600 dark:text-orange-400">
                <span>🚚 Free Delivery Target:</span>
                <span>{getCartSubtotal() >= selectedArea.minFree ? "Achieved! 🎉" : `Need ₹${selectedArea.minFree - getCartSubtotal()} more`}</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${getFreeDeliveryProgressPercent()}%` }} />
              </div>
            </div>
          )}

          <div className="bg-neutral-100 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-200 dark:border-white/5 flex justify-between items-center font-mono font-bold">
            <span className="text-[10px] font-black uppercase text-neutral-600 dark:text-gray-400 font-sans">{isHindi ? "लाइव बिल टोटल:" : "LIVE BILL TOTAL:"}</span>
            <span className="text-sm font-black text-orange-600 dark:text-yellow-400 font-mono">₹{getTotalBillPrice()}</span>
          </div>
        </div>

        <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white font-mono font-bold">{isHindi ? "आपका कर्ट आर्डर" : "Your Order Cart"}</h2>
          <button onClick={() => { triggerHaptic(); setIsCartOpen(false); }} className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-800 dark:text-white rounded-full transition-all"><X size={20} /></button>
        </div>

        {/* 1. CART ITEMS LIST */}
        {cart.map((item: CartItem) => (
          <div key={item.id} className="flex flex-col dark:bg-white/[0.02] bg-white p-4 rounded-2xl mb-3 border dark:border-white/5 border-neutral-200 shadow-sm transition-colors duration-200 gap-1.5 font-sans font-bold">
            <div className="flex justify-between items-center">
              <div className="min-w-0 pr-3">
                <h4 className="font-bold text-xs text-neutral-900 dark:text-gray-100 truncate">{item?.name || "Item"}</h4>
                <p className="text-orange-500 font-black mt-1 text-[11px] font-mono">₹{item?.price || 0}</p>
              </div>
              <div className="flex items-center gap-2 bg-neutral-100 dark:bg-black/40 px-2 py-1 rounded-xl border border-neutral-300 dark:border-white/10 flex-shrink-0">
                <button onClick={() => { triggerHaptic(); removeItem(item.id); }} className="w-6 h-6 flex items-center justify-center bg-red-500/10 text-red-500 rounded text-sm font-black">-</button>
                <span className="font-black text-xs px-1 text-neutral-900 dark:text-white font-mono">{item.quantity}</span>
                {item.isReward ? (
                  <button disabled className="w-6 h-6 flex items-center justify-center bg-white/5 text-gray-400 rounded text-sm font-black cursor-not-allowed">+</button>
                ) : (
                  <button onClick={() => { triggerHaptic(); addItem(item); }} className="w-6 h-6 flex items-center justify-center bg-green-500/10 text-green-500 rounded text-sm font-black">+</button>
                )}
              </div>
            </div>
            {item.note && (
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-2 text-[9px] text-orange-600 dark:text-orange-400 italic">
                👩‍🍳 Chef Instructions: {item.note}
              </div>
            )}
          </div>
        ))}

        {/* 2. UPSELL SUGGESTIONS */}
        {upsellSuggestionItems.length > 0 && (
          <div className="dark:bg-purple-950/20 bg-purple-50 border border-purple-500/10 rounded-2xl p-4 space-y-2 mt-4 font-sans font-bold">
            <p className="text-[9px] font-black uppercase text-purple-800 dark:text-purple-400 tracking-wider">{isHindi ? "साथ में यह भी मंगाया गया 🥤" : "Frequently Bought Together 🥤"}</p>
            <div className="space-y-2">
              {upsellSuggestionItems.map((suggest) => (
                <div key={suggest.id} className="flex justify-between items-center text-[10px]">
                  <div>
                    <span className="font-bold block text-neutral-900 dark:text-white">{suggest.name}</span>
                    <span className="text-orange-600 font-extrabold font-mono">{getDisplayPrice(suggest)}</span>
                  </div>
                  <button onClick={() => { triggerHaptic(); addItem(suggest); }} className="bg-purple-500/20 text-purple-600 border border-purple-500/30 px-3 py-1 rounded-lg font-black uppercase">ADD</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. SELECT ORDER MODE */}
        <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
          <label className="text-[10px] font-black uppercase text-neutral-800 dark:text-gray-400">{isHindi ? "ऑर्डर का माध्यम चुनें:" : "Select Order Mode:"}</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { triggerHaptic(); setFulfillmentType("delivery"); }}
              className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "delivery" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-semibold'}`}
            >
              <span className="text-base">🛵</span>
              <span className="text-[9px] font-black">{isHindi ? "होम डिलीवरी" : "Home Delivery"}</span>
            </button>
            <button
              onClick={() => { triggerHaptic(); setFulfillmentType("pickup"); }}
              className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "pickup" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-semibold'}`}
            >
              <span className="text-base">🛍️</span>
              <span className="text-[9px] font-black">{isHindi ? "सेल्फ-पिकअप" : "Self-Pickup"}</span>
            </button>
            <button
              onClick={() => { triggerHaptic(); setFulfillmentType("table"); }}
              className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center ${fulfillmentType === "table" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300 font-semibold'}`}
            >
              <span className="text-base">🍽️</span>
              <span className="text-[9px] font-black">{isHindi ? "टेबल ऑर्डर" : "Dine-In (Table)"}</span>
            </button>
          </div>
        </div>

        {/* 4. ADD ADD-ONS */}
        {showAddonsSection && (
          <div className="dark:bg-white/[0.02] bg-neutral-50 border dark:border-white/5 border-neutral-200 rounded-2xl p-4 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
            <p className="text-[9px] font-black uppercase text-neutral-800 dark:text-gray-400">{isHindi ? "ऐड-ऑन्स जोड़ें (Add-ons):" : "Add Add-ons to order:"}</p>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => { triggerHaptic(); setKetchupAddon(!ketchupAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${ketchupAddon ? 'border-red-500 bg-red-500/5 text-red-600' : 'border-neutral-300 dark:border-white/5 bg-transparent text-neutral-800 dark:text-gray-300'}`}>
                {isHindi ? "केचप" : "Ketchup"} (+₹10)
              </button>
              <button onClick={() => { triggerHaptic(); setOreganoAddon(!oreganoAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${oreganoAddon ? 'border-yellow-500 bg-yellow-500/5 text-yellow-600' : 'border-neutral-300 dark:border-white/5 bg-transparent text-neutral-800 dark:text-gray-300'}`}>
                {isHindi ? "ऑरेगैनो" : "Oregano"} (+₹10)
              </button>
              <button onClick={() => { triggerHaptic(); setChiliFlakesAddon(!chiliFlakesAddon); }} className={`p-2 rounded-xl border text-[9.5px] font-black ${chiliFlakesAddon ? 'border-orange-500 bg-orange-500/5 text-orange-600' : 'border-neutral-300 dark:border-white/5 bg-transparent text-neutral-800 dark:text-gray-300'}`}>
                {isHindi ? "चिली फ्लेक्स" : "Chili Flakes"} (+₹10)
              </button>
            </div>
          </div>
        )}

        {/* 5. CONDITIONAL INPUTS */}
        {fulfillmentType === "delivery" && (
          <div className="space-y-4 mt-4 font-sans font-bold">
            <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 rounded-2xl p-4 space-y-2.5 transition-colors duration-200">
              <label className="text-[9px] font-black uppercase text-neutral-800 dark:text-gray-400">{isHindi ? "डिलीवरी का क्षेत्र चुनें (KM):" : "Select Delivery Zone (KM):"}</label>
              <div className="grid grid-cols-2 gap-2">
                {DELIVERY_AREAS.map((area) => {
                  const isSelected = selectedArea.name === area.name;
                  return (
                    <button
                      type="button"
                      key={area.name}
                      onClick={() => { triggerHaptic(); setSelectedArea(area); }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 active:scale-95 ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-md font-black' 
                          : 'border-neutral-300 dark:border-white/5 bg-white dark:bg-white/[0.01] text-neutral-800 dark:text-neutral-300 hover:border-neutral-400 hover:dark:border-white/10'
                      }`}
                    >
                      <span className="text-[9px] font-black leading-tight uppercase truncate">{area.name.replace("Mohandra ", "")}</span>
                      <div className="flex justify-between items-center w-full mt-2 font-mono">
                        <span className="text-[8px] font-black text-neutral-700 dark:text-neutral-300">शुल्क: ₹{area.fee}</span>
                        <span className="text-[8px] font-black bg-neutral-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-amber-900 dark:text-yellow-400">Min: ₹{area.minFree}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-neutral-200 dark:border-white/5 space-y-2 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-orange-500"><MapPin size={14}/><h3 className="font-black uppercase text-[10px]">{isHindi ? "डिलीवरी का पता" : "Delivery Address"}</h3></div>
                <div className="flex gap-1">
                  {lastDeliveryAddress && (
                    <button 
                      type="button" 
                      onClick={() => { triggerHaptic(20); setAddress(lastDeliveryAddress); }}
                      className="text-[8px] bg-neutral-200 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-800 dark:text-white px-2 py-1 rounded font-bold uppercase transition-all flex items-center gap-1 shadow-sm"
                    >
                      📋 {isHindi ? "पिछला पता भरें" : "Use Last Address"}
                    </button>
                  )}
                  <button type="button" onClick={handleDetectLocation} className="text-[8px] bg-green-600 hover:bg-green-700 text-white font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm uppercase">📍 {isHindi ? "लाइव लोकेशन" : "Live Location"}</button>
                </div>
              </div>
              <textarea placeholder={isHindi ? "घर का पता, मुख्य लैंडमार्क के साथ..." : "Ghar ka address, Landmark ke saath..."} value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-white dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs font-semibold text-neutral-900 dark:text-white outline-none resize-none h-16" />
            </div>
          </div>
        )}

        {fulfillmentType === "table" && (
          <div className="mt-3 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-white/5 space-y-3 font-sans transition-all duration-300">
            <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">{isHindi ? "🪑 उपलब्ध टेबल चुनें:" : "🪑 Choose Available Table:"}</p>
            
            <div className="space-y-1.5">
              <span className="text-[8px] font-black text-neutral-600 dark:text-gray-400 uppercase tracking-wider">{isHindi ? "2 लोगों के बैठने के लिए (3 टेबल्स):" : "For 2 People (3 Tables Available):"}</span>
              <div className="grid grid-cols-3 gap-2">
                {["Table 1", "Table 2", "Table 3"].map((t) => {
                  const isSelected = tableNumber === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { triggerHaptic(); setTableNumber(t); }}
                      className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-sm font-black' 
                          : 'border-neutral-300 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-800 dark:text-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      <span className="block">{t}</span>
                      <span className="text-[7.5px] text-neutral-500 dark:text-gray-400 font-normal">👥 2 seats</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[8px] font-black text-neutral-600 dark:text-gray-400 uppercase tracking-wider">{isHindi ? "4 लोगों के बैठने के लिए (3 टेबल्स):" : "For 4 People (3 Tables Available):"}</span>
              <div className="grid grid-cols-3 gap-2">
                {["Table 4", "Table 5", "Table 6"].map((t) => {
                  const isSelected = tableNumber === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { triggerHaptic(); setTableNumber(t); }}
                      className={`p-2.5 rounded-lg border text-[10px] font-black text-center transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-sm font-black' 
                          : 'border-neutral-300 dark:border-white/10 bg-white dark:bg-white/5 text-neutral-800 dark:text-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      <span className="block">{t}</span>
                      <span className="text-[7.5px] text-neutral-500 dark:text-gray-400 font-normal">👥👥 4 seats</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 6. ECO FRIENDLY PACKAGING */}
        <div className="dark:bg-green-950/10 bg-green-50/50 border dark:border-green-500/10 border-green-200 rounded-2xl p-4 flex justify-between items-center transition-colors duration-200 mt-4 font-sans font-bold">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-green-700 dark:text-green-500 uppercase tracking-tight">इको-फ्रेंडली पैकिंग</p>
            <p className="text-[8px] text-neutral-700 dark:text-gray-400">चम्मच / टिश्यू पेपर की आवश्यकता नहीं है</p>
          </div>
          <input type="checkbox" checked={noCutlery} onChange={() => { triggerHaptic(); setNoCutlery(!noCutlery); }} className="w-4 h-4 accent-green-600" />
        </div>

        {/* 7. RE-ADDED COUPON CODE INTERACTIVE MODULE */}
        <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 space-y-2 transition-colors duration-200 mt-4 font-sans font-bold">
          <label className="text-[10px] font-black uppercase text-neutral-800 dark:text-gray-400">
            {isHindi ? "🎟️ कूपन कोड दर्ज करें (Coupon Code):" : "🎟️ Apply Coupon Code:"}
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={isHindi ? "उदा. WELCOME" : "e.g. WELCOME"} 
              value={enteredCoupon} 
              onChange={(e) => setEnteredCoupon(e.target.value)} 
              className="flex-1 bg-white dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 dark:text-white outline-none uppercase"
            />
            <button 
              type="button" 
              onClick={handleApplyCoupon} 
              className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-xl text-xs font-black uppercase transition-all"
            >
              {isHindi ? "लागू करें" : "Apply"}
            </button>
          </div>
          {appliedCoupon && (
            <p className="text-[9.5px] font-bold text-green-600 dark:text-green-400 mt-1">
              ✅ कूपन {appliedCoupon.code} सफलता से लागू हुआ! (₹{appliedCoupon.discountValue} की छूट मिली)
            </p>
          )}
        </div>

        {/* 8. PAY SUMMARY CARD */}
        <div className="bg-gradient-to-b from-orange-600 to-orange-700 p-5 rounded-2xl text-white mt-4 font-mono font-bold">
          <div className="flex justify-between mb-1.5 text-xs"><span>{isHindi ? "आइटम का टोटल" : "Items Total"}</span> <span>₹{getCartSubtotal()}</span></div>
          {getCartAddonsPrice() > 0 && <div className="flex justify-between mb-1.5 text-xs"><span>{isHindi ? "अतिरिक्त ऐड-ऑन्स" : "Extra Add-ons"}</span> <span>+₹{getCartAddonsPrice()}</span></div>}
          {appliedCoupon && (
            <div className="flex justify-between mb-1.5 text-xs text-green-200 font-bold"><span>{isHindi ? "कूपन छूट" : "Coupon Discount"}</span> <span>-₹{appliedCoupon.discountValue}</span></div>
          )}
          {fulfillmentType === "delivery" && <div className="flex justify-between mb-3 text-xs opacity-90"><span>{isHindi ? "डिलीवरी शुल्क" : "Delivery Charge"}</span> <span>₹{getDeliveryCharge()}</span></div>}
          <div className="h-px bg-white/20 mb-3" />
          <div className="flex justify-between font-black text-xl font-mono"><span>{isHindi ? "भुगतान राशि" : "To Pay"}</span> <span>₹{getTotalBillPrice()}</span></div>
        </div>

        {/* 9. PAYMENT METHOD & CHECKOUT */}
        <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 space-y-2.5 transition-colors duration-200 mt-4 font-sans font-bold">
          <label className="text-[9px] font-black uppercase text-neutral-800 dark:text-gray-400">{isHindi ? "भुगतान का माध्यम चुनें:" : "Select Payment Method:"}</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { triggerHaptic(); setPaymentMethod("cod"); }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "cod" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300'}`}
            >
              <span className="text-sm">💵</span>
              <span className="text-[9px] font-black">
                {fulfillmentType === "delivery" 
                  ? (isHindi ? "कैश ऑन डिलीवरी" : "Cash on Delivery") 
                  : (isHindi ? "कैश काउंटर पेमेंट" : "Cash at Counter")
                }
              </span>
            </button>
            <button
              onClick={() => { triggerHaptic(); setPaymentMethod("upi"); setIsUpiPopupOpen(true); }}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "upi" ? 'border-orange-500 bg-orange-500/10 text-orange-600 font-black shadow-sm' : 'border-neutral-300 dark:border-white/5 text-neutral-800 dark:text-gray-300'}`}
            >
              <span className="text-sm">📱</span>
              <span className="text-[9px] font-black">{isHindi ? "ऑनलाइन भुगतान (UPI)" : "Pay Online (UPI)"}</span>
            </button>
          </div>

          <button 
            onClick={handleCheckoutClick} 
            type="button" 
            disabled={isSubmittingOrder} 
            className="w-full bg-green-600 hover:bg-green-700 p-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isSubmittingOrder ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Kripya thoda wait karein... ⏳
              </span>
            ) : (
              <span className="flex items-center gap-2 justify-center">
                <img src="/whatsapp.png" className="w-5 h-5 object-contain flex-shrink-0" alt="WhatsApp" />
                <span>{isHindi ? "ऑर्डर सबमिट करें" : "ORDER ON WHATSAPP"}</span>
              </span>
            )}
          </button>
        </div>

      </motion.div>
    </motion.div>
  );
}
