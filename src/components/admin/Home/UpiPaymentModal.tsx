'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

interface UpiPaymentModalProps {
  isHindi: boolean;
  isUpiPopupOpen: boolean;
  setIsUpiPopupOpen: (open: boolean) => void;
  getTotalBillPrice: () => number;
  handleLaunchUpiPay: (platform: string) => void;
  handleScreenshotChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCompressing: boolean;
  paymentScreenshot: string | null;
  setPaymentScreenshot: (shot: string | null) => void;
  sendWhatsAppOrder: () => void;
  isSubmittingOrder: boolean;
  triggerHaptic: (ms?: number) => void;
}

export default function UpiPaymentModal({
  isHindi, isUpiPopupOpen, setIsUpiPopupOpen, getTotalBillPrice, handleLaunchUpiPay,
  handleScreenshotChange, isCompressing, paymentScreenshot, setPaymentScreenshot,
  sendWhatsAppOrder, isSubmittingOrder, triggerHaptic
}: UpiPaymentModalProps) {
  if (!isUpiPopupOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[130] flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="dark:bg-[#111] bg-white border dark:border-white/10 border-neutral-200 p-6 rounded-[2.5rem] w-full max-w-sm relative shadow-2xl space-y-5 text-center font-sans font-bold"
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
              ? `कृपया नीचे दिए गए किसी भी ऐप को चुनकर ₹${getTotalBillPrice()} का भुगतान पूरा करें, फिर स्क्रीनशॉट अपलोड करें!` 
              : `Choose an app to pay ₹${getTotalBillPrice()} and upload the screenshot below:`}
          </p>
        </div>

        {/* यूपीआई ऐप्स ग्रिड */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button 
            type="button"
            onClick={() => handleLaunchUpiPay('phonepe')}
            className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-purple-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
          >
            <img src="/phonepe.png" className="w-5 h-5 object-contain flex-shrink-0" alt="PhonePe" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-[10px] font-black font-sans">PhonePe</span>
          </button>
          <button 
            type="button"
            onClick={() => handleLaunchUpiPay('paytm')}
            className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-blue-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
          >
            <img src="/paytm.png" className="w-5 h-5 object-contain flex-shrink-0" alt="Paytm" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-[10px] font-black font-sans">Paytm</span>
          </button>
          <button 
            type="button"
            onClick={() => handleLaunchUpiPay('gpay')}
            className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-green-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
          >
            <div className="w-5 h-5 bg-gradient-to-tr from-blue-500 via-red-500 to-yellow-500 rounded-full flex items-center justify-center text-[8px] text-white font-black flex-shrink-0">G</div>
            <span className="text-[10px] font-black font-sans">GPay</span>
          </button>
          <button 
            type="button"
            onClick={() => handleLaunchUpiPay('whatsapp')}
            className="p-3 bg-neutral-50 dark:bg-white/[0.02] border dark:border-white/5 border-neutral-200 hover:border-green-600 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-neutral-800 dark:text-white font-bold"
          >
            <img src="/whatsapp.png" className="w-5 h-5 object-contain flex-shrink-0" alt="WhatsApp Pay" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <span className="text-[10px] font-black font-sans">WA Pay</span>
          </button>
        </div>

        {/* स्क्रीनशॉट अपलोडर */}
        <div className="bg-neutral-100 dark:bg-black/40 border border-neutral-200 dark:border-white/10 p-3 rounded-2xl text-left space-y-2.5">
          <label className="text-[9.5px] font-black uppercase text-orange-600 block">
            {isHindi ? "📸 भुगतान का स्क्रीनशॉट डालें (अनिवार्य):" : "📸 Upload Screenshot (Required):"}
          </label>
          <input 
            type="file" 
            accept="image/png, image/jpeg" 
            onChange={handleScreenshotChange}
            className="w-full text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-orange-500 file:text-black file:cursor-pointer outline-none"
          />
          {isCompressing && (
            <div className="flex items-center gap-1.5 text-orange-500 text-[9px]">
              <Loader2 className="animate-spin" size={10} />
              <span>Processing image...</span>
            </div>
          )}
          {paymentScreenshot && (
            <div className="relative w-20 h-24 border border-neutral-300 dark:border-white/10 rounded-xl overflow-hidden mt-1 bg-black/60 flex items-center justify-center mx-auto">
              <img src={paymentScreenshot} className="w-full h-full object-cover" alt="Screenshot preview" />
              <button 
                type="button" 
                onClick={() => { triggerHaptic(20); setPaymentScreenshot(null); }}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                title="Remove image"
              >
                <X size={10} />
              </button>
            </div>
          )}
        </div>

        {/* सबमिट और कैंसिल बटन */}
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={sendWhatsAppOrder}
            disabled={!paymentScreenshot || isSubmittingOrder}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white p-3.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1"
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
