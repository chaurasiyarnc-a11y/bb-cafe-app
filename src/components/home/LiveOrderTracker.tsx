'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Lock, Loader2, CheckCircle, Clock, ChefHat, Bike, X, Info } from 'lucide-react';

export default function LiveOrderTracker({
  isHindi,
  liveOrder,
  setLiveOrder,
  formatBillNumber,
  whatsappNumber,
  triggerHaptic
}: any) {
  const [mapLoadError, setMapLoadError] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // 🏪 कैफे की फिक्स लोकेशन (Bum Bum Cafe)
  const CAFE_LAT = 24.190501;
  const CAFE_LNG = 79.953694;

  const mapId = `tracker-map-${liveOrder?.billNumber}`;

  useEffect(() => {
    if (!liveOrder || liveOrder.fulfillmentType !== 'delivery') return;

    let map: any = null;
    let checkInterval: any = null;

    // मैप लोड करने का सुरक्षित (Safe) तरीका
    const loadMap = () => {
      const L = (window as any).L;
      if (!L) return; // जब तक L न मिले, रुको

      const mapContainer = document.getElementById(mapId);
      if (!mapContainer) return;

      // अगर पहले से मैप है, तो उसे साफ़ करो
      if (L.DomUtil.get(mapId) !== null) {
        L.DomUtil.get(mapId)._leaflet_id = null;
      }

      try {
        const custLat = liveOrder.latitude || CAFE_LAT + 0.0070;
        const custLng = liveOrder.longitude || CAFE_LNG + 0.0070;

        map = L.map(mapId, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
        });

        // साफ़ और फ़ास्ट मैप
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);

        // 🏪 कैफे का पिन
        L.circleMarker([CAFE_LAT, CAFE_LNG], {
          color: '#ea580c', fillColor: '#ea580c', fillOpacity: 1, radius: 7
        }).addTo(map);

        // 🏠 ग्राहक का पिन
        L.circleMarker([custLat, custLng], {
          color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, radius: 7
        }).addTo(map);

        // ➖ रास्ता (Dashed Line)
        L.polyline([[CAFE_LAT, CAFE_LNG], [custLat, custLng]], {
          color: '#ea580c',
          weight: 3,
          dashArray: '5, 8'
        }).addTo(map);

        // 🛵 स्कूटर की पोजीशन
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
          html: `<div style="font-size: 26px; ${flipStyle} filter: drop-shadow(0 3px 3px rgba(0,0,0,0.4)); display: inline-block;">🛵</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker([currentLat, currentLng], { icon: scooterIcon, zIndexOffset: 1000 }).addTo(map);

        // मैप को सेट करें
        const bounds = L.latLngBounds([[CAFE_LAT, CAFE_LNG], [custLat, custLng]]);
        map.fitBounds(bounds, { padding: [30, 30] });

        setIsMapReady(true);
        clearInterval(checkInterval);

        // ग्रे स्क्रीन फिक्स
        setTimeout(() => { if (map) map.invalidateSize(); }, 500);

      } catch (err) {
        console.error("Map initialization failed", err);
        setMapLoadError(true);
      }
    };

    // स्क्रिप्ट लोड करें
    if (!(window as any).L) {
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
    }

    // हर 500ms में चेक करें कि क्या मैप लोड हो गया
    checkInterval = setInterval(loadMap, 500);

    // 10 सेकंड बाद भी न हो तो पुरानी डिज़ाइन दिखा दें
    const timeout = setTimeout(() => {
      if (!isMapReady) {
        clearInterval(checkInterval);
        setMapLoadError(true);
      }
    }, 10000);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
      if (map) map.remove();
    };
  }, [liveOrder]);

  if (!liveOrder) return null;

  // आर्डर का स्टेटस पता करें
  const status = liveOrder.status || 'pending';
  let statusText = isHindi ? "आर्डर प्राप्त हुआ" : "Order Received";
  let StatusIcon = Clock;
  let statusColor = "text-yellow-500";
  let statusBg = "bg-yellow-500";
  
  if (status === 'accepted' || status === 'preparing') {
    statusText = isHindi ? "खाना बन रहा है 👨‍🍳" : "Preparing Food 👨‍🍳";
    StatusIcon = ChefHat;
    statusColor = "text-orange-500";
    statusBg = "bg-orange-500";
  } else if (status === 'out_for_delivery') {
    statusText = isHindi ? "आर्डर रास्ते में है 🛵" : "Out for Delivery 🛵";
    StatusIcon = Bike;
    statusColor = "text-blue-500";
    statusBg = "bg-blue-500";
  } else if (status === 'delivered' || status === 'completed') {
    statusText = isHindi ? "आर्डर डिलीवर हो गया 🎉" : "Order Delivered 🎉";
    StatusIcon = CheckCircle;
    statusColor = "text-green-500";
    statusBg = "bg-green-500";
  } else if (status === 'rejected' || status === 'cancelled') {
    statusText = isHindi ? "आर्डर रद्द हो गया ❌" : "Order Cancelled ❌";
    StatusIcon = X;
    statusColor = "text-red-500";
    statusBg = "bg-red-500";
  }

  const isDelivery = liveOrder.fulfillmentType === 'delivery';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-orange-500/30 p-5 rounded-3xl shadow-xl flex flex-col gap-4 text-xs text-left font-sans font-bold w-full mx-auto mb-4"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusBg} ${status !== 'rejected' ? 'animate-pulse' : ''} shadow-[0_0_8px_currentColor]`} />
            <span className="text-gray-100 font-extrabold uppercase tracking-wide text-[13px]">
              {isHindi ? `लाइव ट्रैकर (#${formatBillNumber(liveOrder.billNumber)})` : `Live Tracker (#${formatBillNumber(liveOrder.billNumber)})`}
            </span>
          </div>
          <span className="bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-1 rounded-md text-[10px] font-black font-mono">
            Token: #{liveOrder.tokenNumber}
          </span>
        </div>

        {/* 🗺️ असली मैप (Real Map Area) */}
        {isDelivery && !mapLoadError && (
          <div className="w-full h-44 bg-neutral-800 rounded-2xl overflow-hidden relative border-2 border-neutral-700 shadow-inner">
            
            {!isMapReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-orange-500 bg-neutral-900 z-20">
                <Loader2 className="animate-spin mb-2" size={24} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{isHindi ? "लाइव मैप लोड हो रहा है..." : "Loading Live Map..."}</span>
              </div>
            )}
            
            {/* यह वह जगह है जहाँ नक्शा लोड होगा */}
            <div id={mapId} className="w-full h-full absolute inset-0 z-10"></div>
          </div>
        )}

        {/* अगर डिलीवरी नहीं है या मैप एरर हो गया, तो पुरानी डिज़ाइन */}
        {(!isDelivery || mapLoadError) && (
          <div className="relative w-full h-10 flex items-center mt-3 mb-2">
            <div className="absolute inset-x-4 h-1 border-t-2 border-dashed border-gray-600 top-1/2 -translate-y-1/2" />
            <div className="absolute left-0 z-10 flex flex-col items-center">
              <span className="text-xl bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">🏪</span>
            </div>
            <div className="absolute right-0 z-10 flex flex-col items-center">
              <span className="text-xl bg-neutral-800 p-1.5 rounded-full border border-white/10 shadow">{isDelivery ? '🏠' : (liveOrder.fulfillmentType === 'pickup' ? '🛍️' : '🪑')}</span>
            </div>
            <motion.div 
              className="absolute z-20"
              animate={{ left: status === 'pending' ? '4%' : status === 'preparing' ? '46%' : '88%' }}
            >
              <span className="text-3xl inline-block -translate-y-4" style={{ transform: isDelivery ? 'scaleX(-1)' : 'none' }}>
                {isDelivery ? '🛵' : '🍳'}
              </span>
            </motion.div>
          </div>
        )}

        {/* स्टेटस बॉक्स */}
        <div className="text-center bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-1.5 shadow-inner">
          <h3 className={`text-[13px] font-black flex items-center justify-center gap-2 ${statusColor}`}>
            <StatusIcon size={16} /> {statusText}
          </h3>
          <p className="text-[10px] text-gray-400 font-medium font-sans leading-relaxed">
            {status === 'pending' && (isHindi ? "काउंटर मैनेजर आर्डर की जांच कर रहे हैं।" : "We are checking items availability.")}
            {status === 'out_for_delivery' && (isHindi ? "कृपया राइडर को रिसीव करने के लिए अपना मोबाइल ऑन रखें।" : "Please keep your mobile active for delivery boy call.")}
          </p>
        </div>

        {/* डिलीवरी पिन (OTP) */}
        {status !== 'delivered' && status !== 'rejected' && liveOrder.deliveryPin && isDelivery && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-orange-500/20 p-3.5 rounded-2xl text-center shadow-lg mt-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Lock size={40} /></div>
            <p className="text-[10px] uppercase text-orange-400 font-black flex items-center justify-center gap-1.5 leading-none mb-1">
              <Lock size={12} /> {isHindi ? "डिलीवरी सिक्योरिटी पिन (OTP):" : "Delivery Security OTP:"}
            </p>
            <p className="text-3xl font-black text-white tracking-[0.3em] font-mono leading-none drop-shadow-md">
              {liveOrder.deliveryPin}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-2">
          <a href={`tel:+${whatsappNumber}`} onClick={() => triggerHaptic(20)} className="flex-[2] bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-center text-xs py-3.5 rounded-xl uppercase shadow-lg">
            {isHindi ? "कैफ़े को कॉल करें" : "Call Cafe"}
          </a>
          <button onClick={() => { triggerHaptic(); setLiveOrder(null); }} className="flex-1 bg-white/5 border border-white/10 text-gray-300 py-3.5 rounded-xl hover:bg-white/10 uppercase text-[10px]">
            {isHindi ? "बंद करें" : "Dismiss"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
