'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone } from 'lucide-react';

interface LiveOrderTrackerProps {
  isHindi: boolean;
  liveOrder: any;
  setLiveOrder: (order: any) => void;
  formatBillNumber: (num: number) => string;
  whatsappNumber: string; // कैफ़े का डिफ़ॉल्ट नंबर
  triggerHaptic: (ms?: number) => void;
}

export default function LiveOrderTracker({
  isHindi,
  liveOrder,
  setLiveOrder,
  formatBillNumber,
  whatsappNumber,
  triggerHaptic
}: LiveOrderTrackerProps) {
  if (!liveOrder) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-orange-500/30 p-5 rounded-3xl shadow-xl flex flex-col gap-4 text-xs text-left font-sans font-bold"
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-gray-100 font-extrabold uppercase tracking-wide">
              {isHindi ? `लाइव आर्डर ट्रैकिंग (Bill #${formatBillNumber(liveOrder.billNumber)})` : `Live Tracker (Bill #${formatBillNumber(liveOrder.billNumber)})`}
            </span>
          </div>
          <span className="bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-lg text-[9px] font-black font-mono">
            Token: #{liveOrder.tokenNumber}
          </span>
        </div>

        {/* एनिमेटेड रोड-मैप पाथ */}
        <div className="space-y-4">
          <div className="relative w-full h-8 flex items-center mt-3">
            {/* सड़क (Dotted Road) */}
            <div className="absolute inset-x-4 h-1 border-t-2 border-dashed border-gray-600 top-1/2 -translate-y-1/2" />
            
            {/* शुरुआत (कैफ़े) */}
            <div className="absolute left-0 z-10 flex flex-col items-center">
              <span className="text-lg bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">🏨</span>
              <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider mt-1">{isHindi ? "कैफ़े" : "Cafe"}</span>
            </div>

            {/* मज़िल (कस्टमर का घर) */}
            <div className="absolute right-0 z-10 flex flex-col items-center">
              <span className="text-lg bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">🏠</span>
              <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider mt-1">{isHindi ? "आपका घर" : "Home"}</span>
            </div>

            {/* चलता हुआ डिलीवरी स्कूटर 🛵 */}
            <motion.div 
              className="absolute z-20"
              animate={{ 
                left: liveOrder.status === 'pending' ? '4%' : liveOrder.status === 'preparing' ? '12%' : liveOrder.status === 'out_for_delivery' ? '46%' : '88%',
                scale: liveOrder.status === 'preparing' ? [1, 1.15, 1] : 1
              }}
              transition={{ 
                left: { type: "spring", stiffness: 45, damping: 15 },
                scale: { repeat: Infinity, duration: 1.5 }
              }}
            >
              <span className="text-2xl drop-shadow-md inline-block -translate-y-3.5">🛵</span>
            </motion.div>
          </div>

          {/* लाइव स्टेटस टेक्स्ट विवरण */}
          <div className="text-center bg-black/40 p-3 rounded-2xl border border-white/5 space-y-1 mt-2">
            <p className="text-xs font-black text-yellow-400">
              {liveOrder.status === 'pending' && (isHindi ? "⏳ आपके आर्डर की पुष्टि की जा रही है..." : "⏳ Confirming your order at counter...")}
              {liveOrder.status === 'preparing' && (isHindi ? "👨‍🍳 शेफ रसोईघर में आपका भोजन तैयार कर रहे हैं..." : "👨‍🍳 Chef is preparing your delicious meal...")}
              {liveOrder.status === 'out_for_delivery' && (isHindi ? "🛵 डिलीवरी राइडर आर्डर लेकर निकल चुके हैं!" : "🛵 Rider is on the way to deliver your food!")}
              {liveOrder.status === 'delivered' && (isHindi ? "✅ आर्डर सफलतापूर्वक डिलीवर हो गया है!" : "✅ Order successfully delivered!")}
              {liveOrder.status === 'rejected' && (isHindi ? "❌ आर्डर रद्द कर दिया गया है।" : "❌ Order was rejected.")}
            </p>
            <p className="text-[10px] text-gray-400 font-medium font-sans leading-relaxed">
              {liveOrder.status === 'pending' && (isHindi ? "काउंटर मैनेजर आर्डर की जांच कर रहे हैं।" : "We are checking items availability.")}
              {liveOrder.status === 'preparing' && (isHindi ? "ताज़ा और गरम सामग्री के साथ आर्डर बनाया जा रहा है।" : "We are cooking with fresh ingredients.")}
              {liveOrder.status === 'out_for_delivery' && (isHindi ? "कृपया राइडर को रिसीव करने के लिए अपना मोबाइल ऑन रखें।" : "Please keep your mobile active for delivery boy call.")}
              {liveOrder.status === 'delivered' && (isHindi ? "बम बम कैफ़े का भोजन चुनने के लिए धन्यवाद! 😊" : "Thank you for choosing Bum Bum Cafe! 😊")}
              {liveOrder.status === 'rejected' && (isHindi ? "कृपया अधिक जानकारी के लिए सीधे कैफ़े को कॉल करें।" : "Please call the cafe directly for more info.")}
            </p>
          </div>

          <div className="flex gap-2">
            {/* नया: सीधे फ़ोन कॉल का बटन (व्हाट्सएप ट्रैकिंग की जगह इसे जोड़ा गया है) */}
            <a 
              href={`tel:+${whatsappNumber}`}
              onClick={() => triggerHaptic(20)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center text-[10px] py-3 rounded-xl border border-transparent transition-all flex items-center justify-center gap-1 uppercase"
            >
              <Phone size={12} />
              <span>{isHindi ? "कैफ़े को कॉल करें" : "Call Cafe"}</span>
            </a>
            <button 
              type="button"
              onClick={() => { 
                triggerHaptic(); 
                setLiveOrder(null); 
              }}
              className="bg-neutral-800 text-gray-400 px-3.5 py-3 rounded-xl hover:text-white"
            >
              {isHindi ? "छिपाएं" : "Dismiss"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
