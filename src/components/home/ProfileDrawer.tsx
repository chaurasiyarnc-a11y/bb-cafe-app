'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { X, User, LogOut, Award, Gift, Star, History, Phone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileDrawerProps {
  isHindi: boolean;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  customerDetails: { name: string; phone: string; refCode?: string } | null;
  setCustomerDetails: (details: any) => void;
  tempName: string;
  setTempName: (name: string) => void;
  tempPhone: string;
  setTempPhone: (phone: string) => void;
  tempRefCode: string;
  setTempRefCode: (code: string) => void;
  handleSaveDetails: (e: React.FormEvent) => void;
  customerPoints: number;
  setCustomerPoints: React.Dispatch<React.SetStateAction<number>>;
  getCustomerTier: (points: number) => { name: string; color: string };
  loyaltyRules: any[];
  pointsHistory: any[];
  shareCount: number;
  handleShareApp: () => void;
  setIsGiftModalOpen: (open: boolean) => void;
  setIsClaimModalOpen: (open: boolean) => void;
  setClaimingPlatform: (platform: any) => void;
  SOCIAL_LINKS: any[];
  handleCustomerRedeem: (ruleId: string, rewardName: string, pointsCost: number) => void;
  cart: any[];
  pastOrders: any[];
  formatBillNumber: (num: number) => string;
  whatsappNumber: string;
  triggerHaptic: (ms?: number) => void;
  ecoCutlerySaves: number;
  getReferralCode: () => string;
  setLiveOrder: (order: any) => void; 
}

export default function ProfileDrawer({
  isHindi, isProfileOpen, setIsProfileOpen, customerDetails, setCustomerDetails,
  tempName, setTempName, tempPhone, setTempPhone, tempRefCode, setTempRefCode,
  handleSaveDetails, customerPoints, setCustomerPoints, getCustomerTier,
  loyaltyRules, pointsHistory, shareCount, handleShareApp, setIsGiftModalOpen,
  setIsClaimModalOpen, setClaimingPlatform, SOCIAL_LINKS, handleCustomerRedeem,
  cart, pastOrders, formatBillNumber, whatsappNumber, triggerHaptic,
  ecoCutlerySaves, getReferralCode, setLiveOrder
}: ProfileDrawerProps) {
  if (!isProfileOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[115] flex items-end font-sans">
      <motion.div 
        initial={{ y: "100%" }} 
        animate={{ y: 0 }} 
        exit={{ y: "100%" }} 
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="dark:bg-[#0b0c10] bg-white w-full h-[90vh] rounded-t-3xl border-t dark:border-white/10 border-neutral-200 overflow-y-auto pb-32 p-5 max-w-lg mx-auto relative shadow-2xl transition-colors duration-200"
      >
        <div className="w-12 h-1 bg-neutral-200 dark:bg-white/15 rounded-full mx-auto mb-4" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black dark:text-white text-neutral-900 font-mono">{isHindi ? "मेरा खाता और लॉयल्टी" : "My Account & Loyalty"}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => { triggerHaptic(); setIsProfileOpen(false); }} className="p-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white text-neutral-800 rounded-full transition-all"><X size={20} /></button>
          </div>
        </div>

        {!customerDetails ? (
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="text-center space-y-1.5 pb-2">
              <User className="mx-auto text-orange-500" size={32} />
              <h3 className="text-sm font-black dark:text-white text-neutral-900">{isHindi ? "प्रोफाइल सेटअप करें" : "Set Up Profile"}</h3>
              <p className="text-[10px] text-neutral-600 dark:text-gray-400 font-semibold leading-normal">{isHindi ? "लॉयल्टी पॉइंट्स कमाने और आसान चेकआउट करने के लिए प्रोफाइल बनाएं!" : "Build your profile to unlock free loyalty codes and fast orders!"}</p>
            </div>
            
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-600 uppercase">{isHindi ? "आपका नाम" : "Your Name"}</label>
                <input autoComplete="name" type="text" placeholder="Enter your name..." value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 border dark:border-neutral-700 border-neutral-300 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-600 uppercase">{isHindi ? "मोबाइल नंबर" : "Mobile Number"}</label>
                <input autoComplete="tel" type="tel" maxLength={10} placeholder="10-digit Phone Number" value={tempPhone} onChange={(e) => setTempPhone(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 border dark:border-neutral-700 border-neutral-300 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-600 uppercase">{isHindi ? "इनवाइट कोड (वैकल्पिक)" : "Referral Code (Optional)"}</label>
                <input type="text" placeholder="Enter invite code..." value={tempRefCode} onChange={(e) => setTempRefCode(e.target.value)} className="w-full dark:bg-neutral-800 bg-neutral-50 border dark:border-neutral-700 border-neutral-300 p-3 rounded-xl font-bold dark:text-white text-neutral-900 outline-none focus:border-orange-500 text-xs" />
              </div>
            </div>
            <button type="submit" className="w-full bg-orange-500 text-black p-3.5 rounded-xl font-black text-xs uppercase shadow transition-all active:scale-95 mt-4">{isHindi ? "खाता बनाएं ➔" : "Create Account ➔"}</button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* USER ACCOUNT VIEW */}
            <div className="dark:bg-white/[0.02] bg-neutral-50 p-4 rounded-2xl border dark:border-white/5 border-neutral-200 flex justify-between items-center transition-colors duration-200">
              <div>
                <p className="text-[8px] dark:text-gray-400 text-neutral-600 font-black uppercase">Customer Profile</p>
                <h4 className="font-black text-base text-orange-500">{customerDetails.name}</h4>
                <p className="text-xs dark:text-gray-400 text-neutral-700 font-semibold font-mono">{customerDetails.phone}</p>
                <p className="text-[9px] text-yellow-600 dark:text-yellow-400 font-bold mt-1 uppercase font-mono">{isHindi ? "इन्वाइट कोड:" : "Invite Code:"} {getReferralCode()}</p>
              </div>
              <button 
                onClick={() => { 
                  triggerHaptic();
                  localStorage.removeItem('bb_cafe_customer'); 
                  setCustomerDetails(null); 
                  setTempName(""); 
                  setTempPhone(""); 
                }} 
                className="text-[9px] bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 px-3 py-2 rounded-lg font-black uppercase flex items-center gap-1 transition-all"
              >
                <LogOut size={12}/> {isHindi ? "लॉगआउट" : "Logout"}
              </button>
            </div>

            {/* Eco-Hero Badge */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-wider text-emerald-500 font-black">पर्यावरण संरक्षण (Eco Impact)</p>
                <h4 className="text-xs font-black dark:text-white text-neutral-900">
                  {isHindi ? `आपने बचाए: ` : "You Saved: "}<span className="text-emerald-500 text-sm font-black">{ecoCutlerySaves} {isHindi ? "प्लास्टिक चम्मच 🌳" : "Plastic Cutlery 🌳"}</span>
                </h4>
                <p className="text-[9px] text-neutral-500 dark:text-gray-400 font-medium">{isHindi ? "चम्मच/टिश्यू न चुनकर आपने पर्यावरण की मदद की है।" : "By skipping plastic utensils, you actively protected nature!"}</p>
              </div>
              {ecoCutlerySaves >= 3 && (
                <div className="bg-emerald-500 text-black px-3 py-1.5 rounded-full border border-emerald-400/30 font-black text-[9px] flex items-center gap-1 shadow animate-pulse">
                  <Award size={12}/>
                  <span>Eco-Hero 🍃</span>
                </div>
              )}
            </div>

            <div className="dark:bg-yellow-400/5 bg-yellow-100 border border-yellow-300 dark:border-yellow-400/20 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex justify-between items-center border-b dark:border-white/10 border-yellow-200 pb-2">
                <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-black text-xs uppercase"><Gift size={12}/> <span>{isHindi ? "बम बम लॉयल्टी क्लब" : "Bum Bum Loyalty Club"}</span></div>
                <span className="text-[8px] font-black border px-2 py-0.5 rounded-full border-yellow-500/30 bg-yellow-100/30 dark:text-yellow-400 dark:border-yellow-400/30 dark:bg-yellow-400/10">
                  {getCustomerTier(customerPoints).name}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-2xl font-black dark:text-white text-neutral-900 leading-none font-mono">{customerPoints} <span className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase font-mono">Points</span></h4>
                  <p className="text-[8px] dark:text-gray-400 text-neutral-700 font-bold mt-1">{isHindi ? "₹100 खर्च करें = 1 पॉइंट पाएं!" : "Spend ₹100 = Get 1 Loyalty Point!"}</p>
                </div>
                <div className="text-right text-[8px] dark:text-yellow-400 text-amber-900 font-black space-y-0.5 uppercase max-h-20 overflow-y-auto no-scrollbar font-mono">
                  {loyaltyRules.map((rule: any) => (<p key={rule.id}>🎁 {rule.pointsCost} Pts = {rule.rewardName}</p>))}
                </div>
              </div>

              {pointsHistory.length > 0 && (
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3 font-sans">
                  <p className="text-xs font-black uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                    <span>📜</span> {isHindi ? "पॉइंट्स पासबुक (लेन-देन विवरण):" : "Points Passbook & Ledger:"}
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {pointsHistory.map((h: any) => (
                      <div key={h.id} className="flex justify-between items-center bg-white dark:bg-neutral-900 p-3 rounded-xl border dark:border-neutral-800 border-neutral-200 shadow-sm transition-colors duration-200">
                        <div className="space-y-1">
                          <span className="text-xs font-black text-neutral-800 dark:text-gray-200 block">{h.description}</span>
                          <span className="text-[9px] text-neutral-500 dark:text-gray-400 font-bold block font-mono">
                            {h.timestamp?.toDate ? h.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-0.5 font-mono ${h.type === 'earn' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {h.type === 'earn' ? '+' : '-'}{h.points} Pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1.5 flex flex-col gap-2 font-sans">
                <div className="flex justify-between items-center text-[9px]">
                  <span className="dark:text-gray-400 text-neutral-700 font-black uppercase">{isHindi ? "शेयर प्रोग्रेस:" : "Share Progress:"}</span>
                  <span className="text-yellow-600 dark:text-yellow-400 font-black bg-yellow-100 dark:bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-300 dark:border-yellow-400/20 font-mono">{shareCount}/5 Shared</span>
                </div>
                <button type="button" onClick={handleShareApp} className="w-full bg-green-600 text-white font-black py-2.5 rounded-xl text-[10px] uppercase flex items-center justify-center gap-1 shadow-md transition-all">{isHindi ? "5 बार शेयर करके मुफ्त +1 पॉइंट कमाएं! 🎁" : "Share 5 times to earn +1 free point! 🎁"}</button>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center font-sans">
                <span className="text-[9px] dark:text-gray-400 text-neutral-700 font-bold uppercase">{isHindi ? "दोस्त को गिफ्ट करें:" : "Gift points to a friend:"}</span>
                <button type="button" onClick={() => { triggerHaptic(); setIsGiftModalOpen(true); }} className="bg-yellow-500/10 text-yellow-600 border border-yellow-400/20 px-2.5 py-1 rounded text-[8px] font-black uppercase">🎁 Gift Points</button>
              </div>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase mb-1.5">{isHindi ? "सोशल मीडिया पर फॉलो करके  पॉइंट्स कमाएं:" : "Earn Points by Following Us:"}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SOCIAL_LINKS.map((link: any) => (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic();
                        setClaimingPlatform(link);
                        setIsClaimModalOpen(true);
                        window.open(link.url, '_blank');
                      }}
                      className="flex items-center gap-1 bg-neutral-100 dark:bg-white/5 border dark:border-white/10 border-neutral-200 px-2.5 py-1 rounded-full text-[9px] font-bold dark:text-gray-300 text-neutral-800 hover:border-yellow-400 transition-all"
                    >
                      <img src={link.icon} className="w-3.5 h-3.5 object-contain flex-shrink-0" alt="" loading="lazy" />
                      <span>{link.label.split(' ')[1]} (+{link.points} P)</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-200 dark:border-neutral-800 font-sans">
                <p className="text-[9px] dark:text-gray-400 text-neutral-700 font-black uppercase mb-1.5">{isHindi ? "पॉइंट्स रिडीम करें (सीधे कार्ट में):" : "Redeem Points (Instantly adds to cart):"}</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto no-scrollbar font-mono">
                  {loyaltyRules.map((rule: any) => {
                    const inCartCost = cart.reduce((acc: number, i: any) => acc + (i.pointsCost || 0), 0);
                    const isAffordable = (customerPoints - inCartCost) >= rule.pointsCost;
                    return (
                      <button key={rule.id} type="button" onClick={() => handleCustomerRedeem(`reward-${rule.id}`, `🎁 FREE ${rule.rewardName}`, rule.pointsCost)} disabled={!isAffordable} className={`py-2 px-2 rounded text-[9px] font-black uppercase border truncate transition-all ${isAffordable ? 'bg-yellow-400 text-black border-yellow-500 hover:bg-yellow-500 font-bold' : 'bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-gray-400 border-neutral-200 dark:border-white/5 cursor-not-allowed'}`}>🎁 {rule.rewardName} ({rule.pointsCost} P)</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-800 font-sans">
              <h3 className="text-sm font-black dark:text-gray-200 text-neutral-900 uppercase flex items-center gap-1.5">
                <History size={16} className="text-orange-500" />
                <span>{isHindi ? "मेरा आर्डर इतिहास (विवरण):" : "My Order History Ledger:"}</span>
              </h3>
              {pastOrders.length > 0 ? (
                <div className="space-y-4 pr-1">
                  {pastOrders.map((ord: any, index: number) => {
                    const formattedDate = ord.timestamp?.toDate ? ord.timestamp.toDate().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : new Date(ord.timestamp).toLocaleString();
                    return (
                      <div key={index} className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 border-neutral-200 rounded-2xl p-4 space-y-3 shadow-md transition-colors duration-200 font-sans">
                        <div className="flex justify-between items-center border-b dark:border-neutral-800 border-neutral-200 pb-2 font-mono">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-orange-500 font-bold">Bill: #{formatBillNumber(ord.billNumber || 0)}</span>
                            <span className="text-[9px] text-neutral-500 dark:text-gray-400 font-bold">{formattedDate}</span>
                          </div>
                          <span className="bg-green-600/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2.5 py-1 rounded-lg text-[9px] font-black font-mono">
                            Token: #{ord.tokenNumber || "N/A"}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {ord.items.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-neutral-800 dark:text-gray-300">
                              <span>{it.name} <span className="text-orange-500 text-[10px]">x{it.quantity}</span></span>
                              <span>₹{it.price * it.quantity}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="border-t border-dashed dark:border-neutral-800 border-neutral-200 pt-2.5 flex justify-between items-center text-xs font-black">
                          <span className="text-neutral-500">{isHindi ? "कुल भुगतान राशि:" : "To Pay Amount:"}</span>
                          <span className="text-sm text-green-600 dark:text-green-400 font-mono">₹{ord.total}</span>
                        </div>

                        {/* नया सुधारात्मक क्षेत्र: एक्टिव आर्डर्स के नीचे 'Track on Screen' और 'Call' बटन (डिलीवरी पिन के साथ) */}
                        {ord.status !== 'delivered' && ord.status !== 'completed' && ord.status !== 'rejected' ? (
                          <div className="space-y-2 mt-2 font-sans">
                            {/* डिलीवरी पिन यदि उपलब्ध हो */}
                            {ord.deliveryPin && (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl text-center">
                                <p className="text-[8px] font-bold text-yellow-500 uppercase tracking-wider flex items-center justify-center gap-1 leading-none">
                                  <Lock size={10} />
                                  <span>पिन (Rider PIN): {ord.deliveryPin}</span>
                                </p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic(15);
                                  setLiveOrder(ord); // लाइव ट्रैकर को वापस होम स्क्रीन पर इनेबल करें
                                  setIsProfileOpen(false); // प्रोफाइल ड्रावर बंद करें
                                  toast.success(isHindi ? "लाइव ट्रैकर होम स्क्रीन पर चालू हो गया है! 🛵" : "Live tracker activated on home screen! 🛵");
                                }}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-black text-center text-[10px] font-black py-2.5 rounded-xl transition-all shadow-md"
                              >
                                🔍 Track on Screen
                              </button>
                              <a
                                href={`tel:+${whatsappNumber}`}
                                onClick={() => triggerHaptic(15)}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center text-[10px] font-black py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-md"
                              >
                                <Phone size={11} />
                                <span>Call Cafe</span>
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] text-gray-500 font-bold uppercase mt-1">
                            {ord.status === 'rejected' ? "Order Rejected ❌" : "Order Complete ✓"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-neutral-500 py-6 text-[10px] font-bold uppercase tracking-wider">
                  {isHindi ? "अभी तक कोई आर्डर नहीं मिला। स्वादिष्ट आर्डर शुरू करें! 🍕" : "No orders found yet. Grab some food! 🍕"}
                </p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
