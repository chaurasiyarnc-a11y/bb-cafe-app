'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast'; // कॉपी कन्फर्मेशन टोस्ट के लिए जोड़ा गया

interface UpiPaymentModalProps {
  isHindi: boolean;
  isUpiPopupOpen: boolean;
  setIsUpiPopupOpen: (open: boolean) => void;
  getTotalBillPrice: () => number;
  handleLaunchUpiPay: (platform: string) => void;
  sendWhatsAppOrder: () => void;
  isSubmittingOrder: boolean;
  triggerHaptic: (ms?: number) => void;
  upiId: string; 
  // TypeScript कंपाइलर को संतुष्ट रखने और एरर्स को बाईपास करने के लिए डमी प्रॉप्स
  handleScreenshotChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCompressing: boolean;
  paymentScreenshot: string | null;
  setPaymentScreenshot: (shot: string | null) => void;
}

export default function UpiPaymentModal({
  isHindi, isUpiPopupOpen, setIsUpiPopupOpen, getTotalBillPrice, handleLaunchUpiPay,
  sendWhatsAppOrder, isSubmittingOrder, triggerHaptic, upiId
}: UpiPaymentModalProps) {
  if (!isUpiPopupOpen) return null;

  const handleCopyUpi = () => {
    triggerHaptic(20);
    try {
      navigator.clipboard.writeText(upiId);
      toast.success(isHindi ? "यूपीआई आईडी कॉपी हो गई है!" : "UPI ID copied successfully!");
    } catch (err) {
      toast.error(isHindi ? "कॉपी करने में विफल!" : "Failed to copy UPI ID");
    }
  };

  const amount = getTotalBillPrice();
  // डायनामिक यूपीआई लिंक
  const upiLink = `upi://pay?pa=${upiId}&pn=Bum%20Bum%20Cafe&am=${amount}&cu=INR&tn=BumBumCafeOrder`;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[130] flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="dark:bg-[#111] bg-white border dark:border-white/10 border-neutral-200 p-6 rounded-[2.5rem] w-full max-w-sm relative shadow-2xl space-y-5 text-center font-sans font-bold overflow-y-auto max-h-[90vh]"
      >
        {/* क्लोज बटन */}
        <button 
          type="button" 
          onClick={() => { triggerHaptic(15); setIsUpiPopupOpen(false); }}
          className="absolute top-4 right-4 p-2 bg-red-100 hover:bg-red-600 hover:text-white text-red-600 rounded-full transition-all shadow"
          title="Close Gateway"
        >
          <X size={16} />
        </button>

        <div className="space-y-1">
          <h3 className="text-base font-black text-orange-500 uppercase italic">
            {isHindi ? "यूपीआई भुगतान गेटवे 📱" : "UPI Payment Gateway 📱"}
          </h3>
          <p className="text-[10.5px] text-neutral-600 dark:text-gray-400 font-semibold leading-relaxed">
            {isHindi 
              ? `₹${amount} का भुगतान पूरा करें!` 
              : `Complete the payment of ₹${amount} and submit order:`}
          </p>
        </div>

        {/* यूपीआई कस्टमाइज्ड क्यूआर कोड और कॉपी सेक्शन */}
        <div className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-4 rounded-3xl space-y-3">
          <p className="text-[9.5px] text-neutral-500 dark:text-gray-400 font-bold uppercase tracking-wider">
            {isHindi ? "👇 QR कोड स्कैन करें या UPI ID कॉपी करें:" : "👇 Scan QR Code or Copy UPI ID:"}
          </p>

          {/* QR Code */}
          <div className="mx-auto w-36 h-36 border-4 border-white dark:border-neutral-800 rounded-2xl overflow-hidden shadow bg-white flex items-center justify-center">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`} 
              alt="UPI QR Code" 
              className="w-full h-full object-contain"
              loading="lazy"
            />
          </div>

          {/* कॉपी यूपीआई आईडी बटन */}
          <button
            type="button"
            onClick={handleCopyUpi}
            className="w-full bg-orange-500/10 hover:bg-orange-500 hover:text-black text-orange-600 border border-orange-500/20 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <span>📋</span>
            <span>{isHindi ? `यूपीआई कॉपी करें: ${upiId}` : `Copy UPI ID: ${upiId}`}</span>
          </button>
        </div>

        {/* यूपीआई ऐप्स ग्रिड */}
        <div className="space-y-1.5">
          <p className="text-[9px] text-neutral-500 dark:text-gray-400 font-bold text-left px-1 uppercase tracking-wider">
            {isHindi ? "या डायरेक्ट ऐप्स से भुगतान का प्रयास करें:" : "Or try direct app redirection:"}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {['phonepe', 'paytm'].map((app) => (
              <button 
                key={app}
                type="button"
                onClick={() => handleLaunchUpiPay(app)}
                className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-orange-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
              >
                <img src={`/${app}.png`} className="w-5 h-5 object-contain flex-shrink-0" alt="" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <span className="text-[10px] font-black font-sans">
                  {app === 'phonepe' ? 'PhonePe' : 'Paytm'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* व्हाट्सएप निर्देश अलर्ट */}
        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-3xl text-left space-y-1">
          <p className="text-[10px] font-black uppercase text-green-600 dark:text-green-400 flex items-center gap-1.5 leading-none">
            <span>✅</span> {isHindi ? "स्क्रीनशॉट अपलोड की आवश्यकता नहीं है!" : "No Screenshot Upload Required!"}
          </p>
          <p className="text-[9.5px] text-neutral-800 dark:text-gray-300 leading-relaxed font-semibold">
            {isHindi 
              ? "पेमेंट पूरा करने के बाद नीचे 'ऑर्डर सबमिट करें' बटन दबाएं। भुगतान का स्क्रीनशॉट आप सीधे व्हाट्सएप चैट पर सेंड कर सकते हैं! 📱" 
              : "After paying, click 'Submit Order' below. You can send the payment screenshot directly inside the WhatsApp chat! 📱"}
          </p>
        </div>

        {/* सबमिट और कैंसिल बटन */}
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={sendWhatsAppOrder}
            disabled={isSubmittingOrder} 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white p-3.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1 shadow-md transition-all active:scale-95"
          >
            {isSubmittingOrder ? "Confirming..." : (isHindi ? "ऑर्डर सबमिट करें" : "Submit Order")}
          </button>
          <button 
            type="button" 
            onClick={() => setIsUpiPopupOpen(false)}
            className="bg-neutral-100 hover:bg-neutral-200 dark:bg-white/5 text-neutral-700 dark:text-gray-400 px-4 py-3.5 rounded-xl font-bold text-xs"
          >
            {isHindi ? "बंद करें" : "Cancel"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
