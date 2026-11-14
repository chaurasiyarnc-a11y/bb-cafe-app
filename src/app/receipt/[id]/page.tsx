'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import QRCode from 'qrcode';
import {
  MapPin, ShoppingBag, Star, Printer, Phone,
  CheckCircle2, Clock, AlertCircle, Smartphone, Award, Loader2
} from 'lucide-react';

export default function LiveDigitalReceiptPage() {
  const params = useParams();
  const orderId = String(params?.id || '');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const STORE_NAME = 'BUM BUM CAFE';
  const STORE_ADDRESS = 'न्यू बस स्टैंड मोहंद्रा, पुलिस चौकी के सामने, जिला पन्ना, मध्य प्रदेश - 488442';
  const STORE_PHONE = '9714293759';
  const ORDER_ONLINE_URL = 'https://bb-cafe-app.vercel.app/';
  const GOOGLE_MAP_URL = 'https://maps.app.goo.gl/UBR3p1E66WkbJsSV8';
  const GOOGLE_REVIEW_URL = 'https://search.google.com/local/writereview?placeid=ChIJLyEjP4A3gjkRvyz8dQthZo8';

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    // Real-time listener: जैसे ही काउंटर पर बिल PAID होगा, यहाँ भी अपने-आप PAID हो जाएगा
    const unsub = onSnapshot(
      doc(db, 'orders', orderId),
      async (docSnap) => {
        if (!docSnap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data: any = { id: docSnap.id, ...docSnap.data() };
        setOrder(data);
        setNotFound(false);
        setLoading(false);

        if (Number(data.total) > 0) {
          try {
            const upiId = data.upiId || 'Q991347275@ybl';
            const upiStr = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(STORE_NAME)}&am=${data.total}&cu=INR&tn=Bill-${data.billNumber || 'Order'}`;
            const qr = await QRCode.toDataURL(upiStr, { width: 220, margin: 1 });
            setQrDataUrl(qr);
          } catch (e) {}
        }
      },
      (err) => {
        console.error('Receipt load error:', err);
        setNotFound(true);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-orange-600 mb-3" size={38} />
        <p className="text-sm font-bold text-neutral-600">आपका Digital Bill लोड हो रहा है...</p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-sm w-full space-y-4 border border-neutral-200">
          <AlertCircle className="text-red-500 mx-auto" size={44} />
          <h1 className="text-lg font-black text-neutral-900">बिल नहीं मिला!</h1>
          <p className="text-xs text-neutral-500">यह Digital Bill लिंक गलत है या हटा दिया गया है।</p>
          <a
            href={ORDER_ONLINE_URL}
            className="block w-full py-3 bg-orange-600 text-white font-black text-xs uppercase rounded-xl shadow"
          >
            Order Online Now
          </a>
        </div>
      </div>
    );
  }

  let billDate = new Date();
  if (order.timestamp?.toDate) billDate = order.timestamp.toDate();
  else if (order.timestamp?.seconds) billDate = new Date(order.timestamp.seconds * 1000);
  else if (order.timestamp) billDate = new Date(order.timestamp);

  const dateStr = billDate.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const isPaid = Boolean(order.status === 'completed' || order.paymentSettled);
  const isDue = order.paymentMethod === 'due';

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotalVal = order.subtotal !== undefined
    ? Number(order.subtotal)
    : items.reduce((acc: number, i: any) => acc + Number(i.price) * Number(i.quantity), 0);

  const cleanCustomerPhone = String(order.customerPhone || '').replace(/\D/g, '').slice(-10);

  const upiId = order.upiId || 'Q991347275@ybl';
  const upiPayLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(STORE_NAME)}&am=${order.total}&cu=INR&tn=Bill-${order.billNumber || 'Order'}`;

  const payStr = order.paymentMethod === 'split'
    ? `SPLIT (Cash: ₹${order.splitCashAmount || 0}, UPI: ₹${order.splitUpiAmount || 0})`
    : isDue
    ? 'UDHARI (DUE)'
    : (order.paymentMethod || 'CASH').toUpperCase();

  return (
    <div className="min-h-screen bg-neutral-100 py-6 px-3 sm:px-4 font-sans text-neutral-900 print:bg-white print:py-0">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-neutral-200 print:shadow-none print:border-none">
        
        {/* Top Orange Accent */}
        <div className="h-2.5 bg-orange-600 w-full" />

        {/* Store Header */}
        <div className="p-6 pb-4 text-center space-y-1.5 border-b border-neutral-200">
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">
            {STORE_NAME}
          </h1>
          <p className="text-xs text-neutral-600 leading-relaxed px-2">
            {STORE_ADDRESS}
          </p>
          <a
            href={`tel:${STORE_PHONE}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 hover:text-orange-600 pt-1"
          >
            <Phone size={13} /> Ph: {STORE_PHONE}
          </a>
        </div>

        {/* Receipt Title & Status Badge */}
        <div className="px-6 pt-4 pb-3 flex items-center justify-between">
          <span className="text-sm font-black tracking-wide uppercase text-neutral-800">
            Digital Receipt
          </span>
          {isPaid ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-black uppercase">
              <CheckCircle2 size={14} /> PAID
            </span>
          ) : isDue ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-black uppercase">
              <AlertCircle size={14} /> UDHAR / DUE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-black uppercase">
              <Clock size={14} /> UNSETTLED
            </span>
          )}
        </div>

        {/* Bill & Customer Meta Box */}
        <div className="px-6 pb-4">
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 font-semibold">
                Bill No: <strong className="text-neutral-900 font-black">#{order.billNumber ?? 'N/A'}</strong>
              </span>
              {order.tokenNumber && (
                <span className="text-neutral-500 font-semibold">
                  Token: <strong className="text-neutral-900 font-black">{order.tokenNumber}</strong>
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 font-medium">{dateStr}</span>
              <span className="text-orange-600 font-black uppercase">
                {(order.fulfillmentType || 'pickup').toUpperCase()}
                {order.tableNumber ? ` (${order.tableNumber})` : ''}
              </span>
            </div>
            <div className="pt-1 border-t border-neutral-200 font-bold text-neutral-800">
              Customer: {order.customerName || 'Walk-in Guest'}
              {cleanCustomerPhone ? ` (${cleanCustomerPhone})` : ''}
            </div>
            {order.address && (
              <p className="text-[11px] text-neutral-600">📍 {order.address}</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 pb-4">
          <div className="bg-neutral-800 text-white rounded-xl px-3 py-2 grid grid-cols-12 text-[11px] font-black uppercase tracking-wider">
            <div className="col-span-6">Item</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-2 text-right">Amt</div>
          </div>

          <div className="divide-y divide-dashed divide-neutral-200">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="py-2.5 px-2 grid grid-cols-12 items-start text-xs gap-1">
                <div className="col-span-6 pr-1">
                  <p className="font-bold text-neutral-900 leading-snug">
                    {idx + 1}. {item.name}
                  </p>
                  {item.note && (
                    <p className="text-[10px] text-neutral-500 italic mt-0.5">{item.note}</p>
                  )}
                </div>
                <div className="col-span-2 text-center font-bold text-neutral-800">
                  {item.quantity}
                </div>
                <div className="col-span-2 text-right font-mono text-neutral-600">
                  ₹{item.price}
                </div>
                <div className="col-span-2 text-right font-mono font-black text-neutral-900">
                  ₹{Number(item.price) * Number(item.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary & Grand Total */}
        <div className="px-6 pb-4 space-y-2 border-t border-dashed border-neutral-300 pt-3 text-xs">
          <div className="flex justify-between text-neutral-600 font-semibold">
            <span>Subtotal</span>
            <span className="font-mono font-bold text-neutral-900">₹{subtotalVal}</span>
          </div>

          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between text-orange-600 font-bold">
              <span>Discount {order.promoCodeUsed ? `(${order.promoCodeUsed})` : ''}</span>
              <span className="font-mono">-₹{order.discountAmount}</span>
            </div>
          )}

          {Number(order.pointsRedeemed) > 0 && (
            <div className="flex justify-between text-amber-600 font-bold">
              <span>Loyalty Points Redeemed</span>
              <span className="font-mono">-₹{order.pointsRedeemed}</span>
            </div>
          )}

          {Number(order.gstAmount) > 0 && (
            <div className="flex justify-between text-red-600 font-bold">
              <span>GST ({order.gstRate || 0}%)</span>
              <span className="font-mono">+₹{order.gstAmount}</span>
            </div>
          )}

          {Number(order.deliveryFee) > 0 && (
            <div className="flex justify-between text-blue-600 font-bold">
              <span>Delivery Charge</span>
              <span className="font-mono">+₹{order.deliveryFee}</span>
            </div>
          )}

          {Number(order.packingCharge) > 0 && (
            <div className="flex justify-between text-orange-600 font-bold">
              <span>Packing Charge</span>
              <span className="font-mono">+₹{order.packingCharge}</span>
            </div>
          )}

          <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-3.5 flex justify-between items-center mt-2">
            <span className="text-sm font-black uppercase text-neutral-900">Grand Total</span>
            <span className="text-2xl font-black font-mono text-green-700">₹{order.total}</span>
          </div>

          <p className="text-center text-[11px] font-bold text-neutral-500 pt-1">
            Payment Method: <span className="text-neutral-800">{payStr}</span>
          </p>
        </div>

        {/* Loyalty Points Card */}
        {(Number(order.pointsEarned) > 0 || order.remainingPoints !== undefined) && (
          <div className="px-6 pb-4">
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
              <Award size={16} className="text-amber-600 shrink-0" />
              <span>
                {Number(order.pointsEarned) > 0 && `Earned Today: +${order.pointsEarned} Pts  |  `}
                Balance: <strong>{order.remainingPoints ?? order.customerPoints ?? 0} Pts</strong>
              </span>
            </div>
          </div>
        )}

        {/* UPI QR & Pay Now Button */}
        {Number(order.total) > 0 && (
          <div className="px-6 pb-5 text-center space-y-3">
            {qrDataUrl && (
              <div className="inline-block bg-white p-2 rounded-2xl border border-neutral-200 shadow-sm">
                <img src={qrDataUrl} alt="UPI QR" className="w-32 h-32 mx-auto" />
                <p className="text-[11px] font-bold text-neutral-600 mt-1">
                  Scan & Pay via UPI (₹{order.total})
                </p>
              </div>
            )}

            {!isPaid && (
              <a
                href={upiPayLink}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all print:hidden"
              >
                <Smartphone size={16} /> Pay ₹{order.total} Now (GPay / PhonePe / Paytm)
              </a>
            )}
          </div>
        )}

        {/* Customer Action Buttons (Order Online + Google Map + Review + Print) */}
        <div className="bg-neutral-50 border-t border-neutral-200 p-5 space-y-2.5 print:hidden">
          <a
            href={ORDER_ONLINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <ShoppingBag size={16} /> घर बैठे अभी ऑनलाइन ऑर्डर करें (Order Online)
          </a>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={GOOGLE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-white hover:bg-neutral-100 text-blue-700 border border-blue-200 font-black text-[11px] uppercase rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <MapPin size={14} /> Google Map
            </a>
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 bg-white hover:bg-neutral-100 text-amber-600 border border-amber-300 font-black text-[11px] uppercase rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Star size={14} /> 5-Star Review
            </a>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="w-full py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-black text-[11px] uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer size={14} /> Print / Save Bill PDF
          </button>

          <p className="text-center text-[11px] text-neutral-500 font-semibold pt-2">
            Thank you for visiting {STORE_NAME}! Please visit again.
          </p>
        </div>

      </div>
    </div>
  );
}
