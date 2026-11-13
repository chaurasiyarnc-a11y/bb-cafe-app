'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, Loader2, CheckCircle, Clock, ChefHat, Bike, X, Info } from 'lucide-react';

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
  const mapInstanceRef = useRef<any>(null);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // 🏪 कैफे की फिक्स लोकेशन (Bum Bum Cafe)
  const CAFE_LAT = 24.190501;
  const CAFE_LNG = 79.953694;

  useEffect(() => {
    // मैप सिर्फ तब लोड होगा जब आर्डर 'Delivery' का हो
    if (!liveOrder || liveOrder.fulfillmentType !== 'delivery') return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.head.appendChild(script);
    }

    const custLat = liveOrder.latitude || CAFE_LAT + 0.0070;
    const custLng = liveOrder.longitude || CAFE_LNG + 0.0070;

    const checkInterval = setInterval(() => {
      if ((window as any).L && mapContainerRef.current) {
        clearInterval(checkInterval);
        
        try {
          if (mapInstanceRef.current) {
             mapInstanceRef.current.remove();
          }

          const L = (window as any).L;
          
          const map = L.map(mapContainerRef.current, {
             zoomControl: false,
             attributionControl: false,
             dragging: false, 
             touchZoom: false,
             scrollWheelZoom: false,
             doubleClickZoom: false,
          });

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
          }).addTo(map);

          // 🏪 कैफे का मार्कर
          const cafeIcon = L.divIcon({
            className: 'bg-transparent',
            html: '<div style="font-size: 28px; filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4));">🏪</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });
          L.marker([CAFE_LAT, CAFE_LNG], { icon: cafeIcon }).addTo(map);

          // 🏠 ग्राहक का मार्कर
          const homeIcon = L.divIcon({
            className: 'bg-transparent',
            html: '<div style="font-size: 28px; filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4)); animation: bounce 2s infinite;">🏠</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
          });
          L.marker([custLat, custLng], { icon: homeIcon }).addTo(map);

          // ➖ रास्ता (Line)
          L.polyline([[CAFE_LAT, CAFE_LNG], [custLat, custLng]], {
             color: '#ea580c',
             weight: 3,
             dashArray: '6, 8'
          }).addTo(map);

          // 👉 स्कूटर की लाइव पोजीशन
          let progress = 0.1;
          if (liveOrder.status === 'preparing') progress = 0.25;
          if (liveOrder.status === 'out_for_delivery') progress = 0.70;
          if (liveOrder.status === 'delivered') progress = 1.0;

          const currentLat = CAFE_LAT + (custLat - CAFE_LAT) * progress;
          const currentLng = CAFE_LNG + (custLng - CAFE_LNG) * progress;

          const isMovingEast = custLng > CAFE_LNG;
          const flipStyle = isMovingEast ? 'transform: scaleX(-1);' : '';
          const bounceClass = liveOrder.status === 'preparing' ? 'animate-bounce' : '';

          const scooterIcon = L.divIcon({
            className: `bg-transparent flex items-center justify-center ${bounceClass}`,
            html: `<div style="font-size: 28px; ${flipStyle} filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4)); display: inline-block;">🛵</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          L.marker([currentLat, currentLng], { icon: scooterIcon, zIndexOffset: 1000 }).addTo(map);

          // 🔍 मैप को दोनों लोकेशन्स के हिसाब से फिट करना
          const bounds = L.latLngBounds([[CAFE_LAT, CAFE_LNG], [custLat, custLng]]);
          map.fitBounds(bounds, { padding: [30, 30] });

          mapInstanceRef.current = map;
          setIsMapReady(true);

          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
          }, 400);

        } catch (err) {
           console.error(err);
           setMapLoadError(true);
        }
      }
    }, 500);

    const timeout = setTimeout(() => {
       if (!isMapReady) {
          clearInterval(checkInterval);
          setMapLoadError(true);
       }
    }, 8000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [liveOrder]);

  if (!liveOrder) return null;

  // 📝 आर्डर स्टेटस
  const status = liveOrder.status || 'pending';
  let statusText = isHindi ? "आर्डर प्राप्त हुआ" : "Order Received";
  let StatusIcon = Clock;
  let statusColor = "text-yellow-500";
  let statusBg = "bg-yellow-500";
  let progress = 25;

  if (status === 'accepted' || status === 'preparing') {
    statusText = isHindi ? "खाना बन रहा है 👨‍🍳" : "Preparing Food 👨‍🍳";
    StatusIcon = ChefHat;
    statusColor = "text-orange-500";
    statusBg = "bg-orange-500";
    progress = 50;
  } else if (status === 'out_for_delivery') {
    statusText = isHindi ? "आर्डर रास्ते में है 🛵" : "Out for Delivery 🛵";
    StatusIcon = Bike;
    statusColor = "text-blue-500";
    statusBg = "bg-blue-500";
    progress = 75;
  } else if (status === 'delivered' || status === 'completed') {
    statusText = isHindi ? "आर्डर डिलीवर हो गया 🎉" : "Order Delivered 🎉";
    StatusIcon = CheckCircle;
    statusColor = "text-green-500";
    statusBg = "bg-green-500";
    progress = 100;
  } else if (status === 'rejected' || status === 'cancelled') {
    statusText = isHindi ? "आर्डर रद्द हो गया ❌" : "Order Cancelled ❌";
    StatusIcon = X;
    statusColor = "text-red-500";
    statusBg = "bg-red-500";
    progress = 100;
  }

  const isDelivery = liveOrder.fulfillmentType === 'delivery';

  // Fallback UI Icons (अगर मैप न हो तो क्या दिखे)
  let destIcon = '🏠';
  let destText = isHindi ? "आपका घर" : "Your Home";
  if (liveOrder.fulfillmentType === 'pickup') {
    destIcon = '🛍️';
    destText = isHindi ? "आप (पिकअप)" : "You (Pickup)";
  } else if (liveOrder.fulfillmentType === 'table') {
    destIcon = '🪑';
    destText = isHindi ? "टेबल" : "Table";
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-orange-500/30 p-5 rounded-t-3xl shadow-[0_-10px_40px_rgba(234,88,12,0.15)] flex flex-col gap-4 text-xs text-left font-sans font-bold w-full mx-auto"
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-1" />

        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusBg} ${status !== 'rejected' ? 'animate-pulse' : ''} shadow-[0_0_8px_currentColor]`} />
            <span className="text-gray-100 font-extrabold uppercase tracking-wide text-sm">
              {isHindi ? `लाइव आर्डर (#${formatBillNumber(liveOrder.billNumber)})` : `Live Tracker (#${formatBillNumber(liveOrder.billNumber)})`}
            </span>
          </div>
          <span className="bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black font-mono shadow-sm">
            Token: #{liveOrder.tokenNumber}
          </span>
        </div>

        {/* 🗺️ LIVE TRACKING MAP (केवल डिलीवरी के लिए, एरर न होने पर) */}
        {isDelivery && !mapLoadError && (
          <div className="w-full h-48 bg-neutral-800 rounded-2xl overflow-hidden relative border-2 border-neutral-700 shadow-inner">
            {!isMapReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-500 bg-neutral-900 z-10">
                <Loader2 className="animate-spin mb-2" size={28} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{isHindi ? "लाइव मैप कनेक्ट हो रहा है..." : "Connecting to Live Map..."}</span>
              </div>
            )}
            
            {/* असली मैप */}
            <div ref={mapContainerRef} className="w-full h-full absolute inset-0 z-0 pointer-events-none"></div>
          </div>
        )}

        {/* अगर पिकअप/डाइन-इन है या मैप लोड होने में एरर आ गया, तो पुरानी सड़क वाला डिज़ाइन दिखेगा */}
        {(!isDelivery || mapLoadError) && (
          <div className="relative w-full h-10 flex items-center mt-3 mb-2">
            <div className="absolute inset-x-4 h-1 border-t-2 border-dashed border-gray-600 top-1/2 -translate-y-1/2" />
            
            <div className="absolute left-0 z-10 flex flex-col items-center">
              <span className="text-xl bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">🏪</span>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-1">{isHindi ? "कैफ़े" : "Cafe"}</span>
            </div>

            <div className="absolute right-0 z-10 flex flex-col items-center">
              <span className="text-xl bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">{destIcon}</span>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-1">{destText}</span>
            </div>

            <motion.div 
              className="absolute z-20"
              animate={{ 
                left: status === 'pending' ? '4%' : status === 'preparing' ? '46%' : '88%',
                scale: status === 'preparing' ? [1, 1.15, 1] : 1
              }}
              transition={{ 
                left: { type: "spring", stiffness: 45, damping: 15 },
                scale: { repeat: Infinity, duration: 1.5 }
              }}
            >
              <span 
                className="text-3xl drop-shadow-md inline-block -translate-y-4"
                style={{ transform: isDelivery ? 'scaleX(-1)' : 'none' }}
              >
                {isDelivery ? '🛵' : '🍳'}
              </span>
            </motion.div>
          </div>
        )}

        {/* लाइव स्टेटस टेक्स्ट विवरण */}
        <div className="text-center bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-1.5 shadow-inner">
          <h3 className={`text-[13px] font-black flex items-center justify-center gap-2 ${statusColor}`}>
            <StatusIcon size={16} /> {statusText}
          </h3>
          <p className="text-[10px] text-gray-400 font-medium font-sans leading-relaxed">
            {status === 'pending' && (isHindi ? "काउंटर मैनेजर आर्डर की जांच कर रहे हैं।" : "We are checking items availability.")}
            {status === 'preparing' && (isHindi ? "ताज़ा और गरम सामग्री के साथ आर्डर बनाया जा रहा है।" : "We are cooking with fresh ingredients.")}
            {status === 'out_for_delivery' && (isHindi ? "कृपया राइडर को रिसीव करने के लिए अपना मोबाइल ऑन रखें।" : "Please keep your mobile active for delivery boy call.")}
            {status === 'delivered' && (isHindi ? "बम बम कैफ़े का भोजन चुनने के लिए धन्यवाद! 😊" : "Thank you for choosing Bum Bum Cafe! 😊")}
            {status === 'rejected' && (isHindi ? "कृपया अधिक जानकारी के लिए सीधे कैफ़े को कॉल करें।" : "Please call the cafe directly for more info.")}
          </p>
        </div>

        {/* --- डिलीवरी पिन (OTP) --- */}
        {status !== 'delivered' && status !== 'completed' && status !== 'rejected' && liveOrder.deliveryPin && isDelivery && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-orange-500/20 p-3.5 rounded-2xl text-center space-y-2 shadow-lg mt-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Lock size={40} />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-orange-400 font-black flex items-center justify-center gap-1.5 leading-none">
              <Lock size={12} />
              <span>{isHindi ? "डिलीवरी सिक्योरिटी पिन (OTP):" : "Delivery Security OTP:"}</span>
            </p>
            <p className="text-3xl font-black text-white tracking-[0.3em] font-mono leading-none py-1 drop-shadow-md">
              {liveOrder.deliveryPin}
            </p>
            <p className="text-[8px] text-gray-400 font-bold uppercase leading-none">
              {isHindi ? "(राइडर को यह पिन देकर ही अपना भोजन प्राप्त करें)" : "(Please share this PIN with rider to confirm delivery)"}
            </p>
          </div>
        )}

        {/* Fulfillment Alert for Pickup/Table */}
        {!isDelivery && (
          <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex items-start gap-2.5 mt-2">
            <Info size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-gray-300 font-bold leading-relaxed">
              {liveOrder.fulfillmentType === 'pickup' 
                ? (isHindi ? "यह एक सेल्फ़-पिकअप आर्डर है। कृपया कैफ़े से अपना खाना लें।" : "This is a Self-Pickup order. Please collect your food from the counter.") 
                : (isHindi ? `डाइन-इन आर्डर। टेबल नंबर: ${liveOrder.tableNumber || 'N/A'}` : `Dine-In order. Serving at Table: ${liveOrder.tableNumber || 'N/A'}`)}
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <a 
            href={`tel:+${whatsappNumber}`}
            onClick={() => triggerHaptic(20)}
            className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-center text-xs py-3.5 rounded-xl border border-transparent shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Phone size={14} />
            <span>{isHindi ? "कैफ़े को कॉल करें" : "Call Cafe"}</span>
          </a>
          <button 
            type="button"
            onClick={() => { 
              triggerHaptic(); 
              setLiveOrder(null); 
            }}
            className="flex-1 bg-white/5 border border-white/10 text-gray-300 py-3.5 rounded-xl hover:bg-white/10 hover:text-white uppercase text-[10px] shadow-sm transition-all"
          >
            {isHindi ? "बंद करें" : "Dismiss"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
