'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, Loader2 } from 'lucide-react';

interface LiveOrderTrackerProps {
  isHindi: boolean;
  liveOrder: any;
  setLiveOrder: (order: any) => void;
  formatBillNumber: (num: number) => string;
  whatsappNumber: string;
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapplsMapRef = useRef<any>(null);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Mappls API Key
  const MAPPLS_KEY = "xxytvmxywdbfxyfzujfatkuxnfaxyenmwwuu";

  // कैफे की फिक्स लोकेशन (मोहांद्रा)
  const CAFE_LAT = 24.2863;
  const CAFE_LNG = 80.1245;

  useEffect(() => {
    if (!liveOrder || liveOrder.fulfillmentType !== 'delivery') return;

    let checkInterval: any;

    const initMap = () => {
      if (!(window as any).mappls || mapplsMapRef.current || !mapContainerRef.current) return;
      
      try {
        // ग्राहक की लोकेशन (अगर न मिले तो कैफे से थोड़ा दूर सेट करें)
        const custLat = liveOrder.latitude || CAFE_LAT + 0.0060;
        const custLng = liveOrder.longitude || CAFE_LNG + 0.0060;

        // कैफे और घर के बीच का सेंटर निकालें
        const centerLat = (CAFE_LAT + custLat) / 2;
        const centerLng = (CAFE_LNG + custLng) / 2;

        // 1. मैप लोड करें
        mapplsMapRef.current = new (window as any).mappls.Map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: 14,
        });

        // 2. कैफे का मार्कर (पिन)
        new (window as any).mappls.Marker({
          map: mapplsMapRef.current,
          position: { lat: CAFE_LAT, lng: CAFE_LNG },
          draggable: false,
        });

        // 3. कस्टमर के घर का मार्कर (पिन)
        new (window as any).mappls.Marker({
          map: mapplsMapRef.current,
          position: { lat: custLat, lng: custLng },
          draggable: false,
        });

        setIsMapReady(true);
      } catch (err) {
        console.error("Tracker Map Error:", err);
        setMapLoadError(true);
      }
    };

    // 👉 मैप की स्क्रिप्ट लोड करें (अगर पहले से लोड नहीं है)
    if (!document.getElementById("mappls-script")) {
      const script = document.createElement('script');
      script.id = "mappls-script";
      script.src = `https://apis.mappls.com/advancedmaps/api/${MAPPLS_KEY}/map_sdk?layer=vector&v=3.0`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // हर 0.5 सेकंड में चेक करें कि MapmyIndia का बेस कोड आ गया या नहीं
    checkInterval = setInterval(() => {
      if ((window as any).mappls && mapContainerRef.current) {
        initMap();
        clearInterval(checkInterval);
      }
    }, 500);

    // 10 सेकंड बाद भी लोड न हो, तो एरर दिखा दें
    const timeout = setTimeout(() => {
      if (!mapplsMapRef.current) {
        clearInterval(checkInterval);
        setMapLoadError(true);
      }
    }, 10000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [liveOrder]);

  if (!liveOrder) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-orange-500/30 p-5 rounded-3xl shadow-xl flex flex-col gap-4 text-xs text-left font-sans font-bold w-full"
      >
        <div className="flex justify-between items-center border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-gray-100 font-extrabold uppercase tracking-wide">
              {isHindi ? `लाइव आर्डर (#${formatBillNumber(liveOrder.billNumber)})` : `Live Tracker (#${formatBillNumber(liveOrder.billNumber)})`}
            </span>
          </div>
          <span className="bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-lg text-[9px] font-black font-mono">
            Token: #{liveOrder.tokenNumber}
          </span>
        </div>

        {/* 🗺️ MAPPLS LIVE TRACKING MAP (केवल डिलीवरी के लिए) */}
        {liveOrder.fulfillmentType === 'delivery' && (
          <div className="w-full h-40 bg-neutral-800 rounded-2xl overflow-hidden relative border-2 border-neutral-700 shadow-inner">
            
            {/* लोडिंग स्टेट */}
            {!isMapReady && !mapLoadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-500 bg-neutral-900 z-10">
                <Loader2 className="animate-spin mb-2" size={24} />
                <span className="text-[10px] font-bold uppercase">{isHindi ? "लाइव मैप कनेक्ट हो रहा है..." : "Connecting to Live Map..."}</span>
              </div>
            )}
            
            {/* एरर स्टेट */}
            {mapLoadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 bg-neutral-900 z-10">
                <span className="text-[10px] font-bold uppercase">⚠️ {isHindi ? "मैप लोड नहीं हो सका" : "Map failed to load"}</span>
              </div>
            )}
            
            {/* असली मैप (Mappls Container) */}
            <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0"></div>

            {/* स्कूटर एनीमेशन ओवरले (हवा में चलता हुआ स्कूटर) */}
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-center px-4">
              <motion.div 
                className="absolute z-20"
                animate={{ 
                  left: liveOrder.status === 'pending' ? '10%' : liveOrder.status === 'preparing' ? '20%' : liveOrder.status === 'out_for_delivery' ? '60%' : '88%',
                  scale: liveOrder.status === 'preparing' ? [1, 1.15, 1] : 1
                }}
                transition={{ 
                  left: { type: "spring", stiffness: 45, damping: 15 },
                  scale: { repeat: Infinity, duration: 1.5 }
                }}
              >
                <div className="bg-white p-1.5 rounded-full shadow-lg border-2 border-orange-500 flex items-center justify-center -translate-y-4">
                  <span className="text-xl">🛵</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* अगर पिकअप/डाइन-इन है, तो पुरानी सड़क वाला डिज़ाइन दिखेगा */}
        {liveOrder.fulfillmentType !== 'delivery' && (
          <div className="relative w-full h-8 flex items-center mt-3">
            <div className="absolute inset-x-4 h-1 border-t-2 border-dashed border-gray-600 top-1/2 -translate-y-1/2" />
            
            <div className="absolute left-0 z-10 flex flex-col items-center">
              <span className="text-lg bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">🏨</span>
              <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider mt-1">{isHindi ? "कैफ़े" : "Cafe"}</span>
            </div>

            <div className="absolute right-0 z-10 flex flex-col items-center">
              <span className="text-lg bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">{liveOrder.fulfillmentType === 'pickup' ? '🛍️' : '🪑'}</span>
              <span className="text-[7px] text-gray-500 font-bold uppercase tracking-wider mt-1">{isHindi ? "आपको मिलेगा" : "You"}</span>
            </div>

            <motion.div 
              className="absolute z-20"
              animate={{ 
                left: liveOrder.status === 'pending' ? '4%' : liveOrder.status === 'preparing' ? '46%' : '88%',
                scale: liveOrder.status === 'preparing' ? [1, 1.15, 1] : 1
              }}
              transition={{ 
                left: { type: "spring", stiffness: 45, damping: 15 },
                scale: { repeat: Infinity, duration: 1.5 }
              }}
            >
              <span className="text-2xl drop-shadow-md inline-block -translate-y-3.5">🍳</span>
            </motion.div>
          </div>
        )}

        {/* लाइव स्टेटस टेक्स्ट विवरण */}
        <div className="text-center bg-black/40 p-3 rounded-2xl border border-white/5 space-y-1 mt-2">
          <p className="text-xs font-black text-yellow-400">
            {liveOrder.status === 'pending' && (isHindi ? "⏳ आपके आर्डर की पुष्टि की जा रही है..." : "⏳ Confirming your order at counter...")}
            {liveOrder.status === 'preparing' && (isHindi ? "👨‍🍳 शेफ रसोईघर में आपका भोजन तैयार कर रहे हैं..." : "👨‍🍳 Chef is preparing your delicious meal...")}
            {liveOrder.status === 'out_for_delivery' && (isHindi ? "🛵 डिलीवरी बॉय रास्ते में है..." : "🛵 Rider is on the way to deliver your food!")}
            {liveOrder.status === 'delivered' && (isHindi ? "✅ आर्डर सफलतापूर्वक पूरा हो गया है!" : "✅ Order successfully completed!")}
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

        {/* --- डिलीवरी पिन (OTP) --- */}
        {liveOrder.status !== 'delivered' && liveOrder.status !== 'completed' && liveOrder.status !== 'rejected' && liveOrder.deliveryPin && liveOrder.fulfillmentType === 'delivery' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-2xl text-center space-y-1.5 shadow-inner mt-2">
            <p className="text-[9px] uppercase tracking-wider text-yellow-500 font-black flex items-center justify-center gap-1 leading-none">
              <Lock size={10} />
              <span>{isHindi ? "🔑 डिलीवरी पुष्टि पिन (OTP):" : "🔑 Delivery Security OTP:"}</span>
            </p>
            <p className="text-2xl font-black text-white tracking-widest font-mono leading-none py-0.5">
              {liveOrder.deliveryPin}
            </p>
            <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">
              {isHindi ? "(राइडर को यह पिन देकर ही अपना भोजन प्राप्त करें)" : "(Please share this PIN with rider to confirm delivery)"}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-2">
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
            className="bg-neutral-800 text-gray-400 px-4 py-3 rounded-xl hover:text-white uppercase text-[10px]"
          >
            {isHindi ? "छिपाएं" : "Dismiss"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
