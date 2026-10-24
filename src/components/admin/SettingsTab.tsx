'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase'; // अपनी लोकेशन के अनुसार पाथ सेट करें
import { collection, addDoc, doc, setDoc, deleteDoc, updateDoc, runTransaction, increment, onSnapshot } from 'firebase/firestore';
import { 
  Trash, 
  Eye, 
  EyeOff, 
  ImageIcon, 
  Play, 
  Settings, 
  X, 
  Percent, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Edit, 
  Check,
  Youtube,       
  Instagram, 
  Facebook, 
  MessageCircle,
  Ghost 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isVideoUrl, sha256 } from '../../lib/utils'; // अपनी लोकेशन के अनुसार पाथ सेट करें

interface SettingsTabProps {
  banners: any[];
  reels: any[];
  coupons: any[];
  reviews: any[];
  socialProofs: any[];
  pointsClaims: any[];
  staff: any[];
  cafeHelperUsers: any[];
  passcodes: { adminPin: string; managerPin: string };
  userRole: 'admin' | 'manager' | null;
  storeOpen: boolean;
}

export default function SettingsTab({
  banners,
  reels,
  coupons,
  reviews,
  socialProofs,
  pointsClaims,
  staff,
  cafeHelperUsers,
  passcodes,
  userRole,
  storeOpen
}: SettingsTabProps) {
  // --- LOCAL STATES ---
  const [activeSubTab, setActiveSubTab] = useState<'banners' | 'reels' | 'footer' | 'header_video' | 'coupons' | 'reviews' | 'proofs' | 'claims' | 'security'>('banners');

  // Promo Banners State
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newBannerTitle, setNewBannerTitle] = useState("");

  // Food Reels State
  const [newReelUrl, setNewReelUrl] = useState("");
  const [newReelCoverUrl, setNewReelCoverUrl] = useState("");
  const [newReelTitle, setNewReelTitle] = useState("");
  const [newReelDesc, setNewReelDesc] = useState("");
  const [newReelPrice, setNewReelPrice] = useState("");

  // Header Background, Timings & Maps
  const [headerVideoInput, setHeaderVideoInput] = useState("");
  const [storeTimingHindi, setStoreTimingHindi] = useState("सुबह 10:00 से रात 11:00 बजे");
  const [storeTimingEnglish, setStoreTimingEnglish] = useState("10:00 AM to 11:00 PM");
  const [googleMapUrl, setGoogleMapUrl] = useState("https://maps.app.goo.gl/8pj1Xby3bbMn5qxu5");

  // Social Counts States
  const [instagramCount, setInstagramCount] = useState("");
  const [youtubeCount, setYoutubeCount] = useState("");
  const [facebookCount, setFacebookCount] = useState("");
  const [whatsappCount, setWhatsAppCount] = useState("");
  const [snapchatCount, setSnapchatCount] = useState("");

  // Coupons
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponValue, setNewCouponValue] = useState("");

  // Social Proof Alerts
  const [newProofText, setNewProofText] = useState("");

  // Staff & Helper Users Editing
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("delivery");
  const [newStaffPin, setNewStaffPin] = useState("");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState("");
  const [editingStaffRole, setEditingStaffRole] = useState("delivery");
  const [editingStaffPin, setEditingStaffPin] = useState("");
  const [editingStaffOriginalRole, setEditingStaffOriginalRole] = useState<string | null>(null); 
  const [revealPinId, setRevealPinId] = useState<string | null>(null);

  // Dine-In Table QR State
  const [genTableNum, setGenTableNum] = useState("1");

  // Dynamic PIN Change Inputs
  const [newAdminPinInput, setNewAdminPinInput] = useState("");
  const [newManagerPinInput, setNewManagerPinInput] = useState("");

  // --- REAL-TIME DATA SYNC EFFECT ---
  useEffect(() => {
    // 1. Store Configs Sync
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.headerVideoUrl) setHeaderVideoInput(data.headerVideoUrl);
        if (data.timingHindi) setStoreTimingHindi(data.timingHindi);
        if (data.timingEnglish) setStoreTimingEnglish(data.timingEnglish);
        if (data.googleMapUrl) setGoogleMapUrl(data.googleMapUrl);
      }
    });

    // 2. 👉 FIX: Social Counts Sync (New Database Path)
    const unsubSocial = onSnapshot(doc(db, "settings", "social_counts"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.instagram) setInstagramCount(data.instagram);
        if (data.youtube) setYoutubeCount(data.youtube);
        if (data.facebook) setFacebookCount(data.facebook);
        if (data.whatsapp_channel) setWhatsAppCount(data.whatsapp_channel); // Correct mapped key
        if (data.snapchat) setSnapchatCount(data.snapchat);
      }
    });

    return () => {
      unsubStore();
      unsubSocial();
    };
  }, []);

  // --- CRUD HANDLERS ---
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerUrl || !newBannerTitle) return toast.error("Please fill Name & URL!");
    try {
      await addDoc(collection(db, "banners"), { url: newBannerUrl, title: newBannerTitle, isVisible: true, timestamp: new Date() });
      setNewBannerUrl(""); setNewBannerTitle("");
      toast.success("Promo Banner Added! 🖼️");
    } catch (err) { toast.error("Error adding banner"); }
  };

  const handleDeleteBanner = async (id: string) => {
    try {
      await deleteDoc(doc(db, "banners", id));
      toast.success("Promo Banner Deleted!");
    } catch (err) { toast.error("Error deleting banner"); }
  };

  const toggleBannerVisibility = async (banner: any) => {
    try {
      await updateDoc(doc(db, "banners", banner.id), { isVisible: banner.isVisible !== false ? false : true });
      toast.success("Banner status updated!");
    } catch (err) { toast.error("Error toggling banner"); }
  };

  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReelUrl || !newReelTitle || !newReelPrice) return toast.error("Please enter Reel title, price, and media URL!");
    try {
      await addDoc(collection(db, "reels"), {
        url: newReelUrl, coverUrl: newReelCoverUrl || "", title: newReelTitle, description: newReelDesc || "", price: Number(newReelPrice) || 0, timestamp: new Date()
      });
      setNewReelUrl(""); setNewReelCoverUrl(""); setNewReelTitle(""); setNewReelDesc(""); setNewReelPrice("");
      toast.success("New Food Reel / Story Added! 🎥");
    } catch (err) { toast.error("Error adding reel"); }
  };

  const handleDeleteReel = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reels", id));
      toast.success("Food Reel Deleted!");
    } catch (err) { toast.error("Error deleting reel"); }
  };

  const handleUpdateHeaderVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerVideoInput) return toast.error("Please enter a valid video link!");
    try {
      await setDoc(doc(db, "settings", "store"), { headerVideoUrl: headerVideoInput }, { merge: true });
      toast.success("Background video updated! 🎬");
    } catch (err) { toast.error("Failed to update video."); }
  };

  const handleUpdateStoreTimingsAndLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeTimingHindi || !storeTimingEnglish || !googleMapUrl) return toast.error("Please fill all timings and location URL!");
    try {
      await setDoc(doc(db, "settings", "store"), { timingHindi: storeTimingHindi, timingEnglish: storeTimingEnglish, googleMapUrl: googleMapUrl }, { merge: true });
      toast.success("Timings & Google Map Location updated! ⏰🗺️");
    } catch (err) { toast.error("Failed to update store data."); }
  };

  // 👉 FIX: Update Social Counts with new keys and path
  const handleUpdateSocialCounts = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "social_counts"), { 
        instagram: instagramCount, 
        youtube: youtubeCount, 
        facebook: facebookCount, 
        whatsapp_channel: whatsappCount, 
        snapchat: snapchatCount 
      }, { merge: true });
      toast.success("Social Media counts updated! 📊🎉");
    } catch (err) { toast.error("Failed to update social counts."); }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponValue) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    try {
      await setDoc(doc(db, "coupons", cleanCode), { code: cleanCode, discountValue: Number(newCouponValue), timestamp: new Date() });
      setNewCouponCode(""); setNewCouponValue("");
      toast.success("New Coupon created successfully! 🎟️");
    } catch (err) { toast.error("Error creating coupon"); }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await deleteDoc(doc(db, "coupons", id));
      toast.success("Coupon Deleted!");
    } catch (err) { toast.error("Error deleting coupon"); }
  };

  const handleApproveReview = async (id: string) => {
    try {
      await updateDoc(doc(db, "reviews", id), { isApproved: true });
      toast.success("Review Approved! ✅");
    } catch (err) { toast.error("Error approving review"); }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await deleteDoc(doc(db, "reviews", id));
      toast.success("Review Deleted!");
    } catch (err) { toast.error("Error deleting review"); }
  };

  const handleAddSocialProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofText.trim()) return toast.error("Please enter alert text!");
    try {
      await addDoc(collection(db, "social_proofs"), { text: newProofText.trim(), timestamp: new Date() });
      setNewProofText("");
      toast.success("New Order Alert Added! 🔥");
    } catch (err) { toast.error("Error adding alert"); }
  };

  const handleDeleteSocialProof = async (id: string) => {
    try {
      await deleteDoc(doc(db, "social_proofs", id));
      toast.success("Order Alert Deleted!");
    } catch (err) { toast.error("Error deleting alert"); }
  };

  const handleVerifyClaimApproval = async (claim: any) => {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "customer_points", claim.customerPhone);
        const claimRef = doc(db, "points_claims", claim.id);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          transaction.set(userRef, { name: claim.customerName, phone: claim.customerPhone, points: claim.pointsToReward, lastActive: new Date() });
        } else {
          transaction.update(userRef, { points: increment(claim.pointsToReward) });
        }
        transaction.update(claimRef, { status: "approved" });
        const histRef = doc(collection(db, "customer_points", claim.customerPhone, "history"));
        transaction.set(histRef, { type: "earn", points: claim.pointsToReward, description: `Followed us on ${claim.platformLabel} 📱 (Approved)`, timestamp: new Date() });
      });
      toast.success("Claim Approved! Point successfully credited.");
    } catch (err) { toast.error("Verification failed."); }
  };

  const handleRejectClaim = async (id: string) => {
    try {
      await updateDoc(doc(db, "points_claims", id), { status: "rejected" });
      toast.success("Claim Request Rejected!");
    } catch (err) { toast.error("Failed to reject claim request."); }
  };

  const handleAddStaffCombined = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPin) return toast.error("Kripya saari details bharein!");
    if (newStaffPin.length < 4 || isNaN(Number(newStaffPin))) return toast.error("PIN 4-अंकों ka numerical होना चाहिए!");
    
    try {
      if (newStaffRole === "godown") {
        const helperId = `user_${Date.now()}`;
        await setDoc(doc(db, "cafe_users", helperId), { id: helperId, name: newStaffName.trim().toUpperCase(), pin: newStaffPin.trim(), role: "staff" });
        toast.success("नया गोदाम सहायक सफलतापूर्वक स्टाफ में जोड़ा गया! 📦🎉");
      } else {
        await addDoc(collection(db, "staff_members"), { name: newStaffName.trim(), role: newStaffRole, pin: newStaffPin, timestamp: new Date() });
        toast.success("Naya staff member successfully add ho gaya! 🎉");
      }
      setNewStaffName(""); setNewStaffPin("");
    } catch (err) { toast.error("Staff member add karne me dikkat aayi."); }
  };

  const handleDeleteStaffCombined = async (id: string, role: string) => {
    if (!confirm("Kya aap sach me is staff member ko delete karna chahte hain?")) return;
    try {
      if (role === "godown") {
        await deleteDoc(doc(db, "cafe_users", id));
      } else {
        await deleteDoc(doc(db, "staff_members", id));
      }
      toast.success("Staff member successfully deleted.");
    } catch (err) { toast.error("Delete failed."); }
  };

  const handleUpdateStaffCombined = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId) return;
    if (!editingStaffName.trim() || !editingStaffPin) return toast.error("Saari details bharein!");
    if (editingStaffPin.length < 4 || isNaN(Number(editingStaffPin))) return toast.error("PIN 4-अंकों ka numerical hona chahiye!");

    try {
      if (editingStaffOriginalRole !== "godown" && editingStaffRole === "godown") {
        await setDoc(doc(db, "cafe_users", editingStaffId), { id: editingStaffId, name: editingStaffName.trim().toUpperCase(), pin: editingStaffPin.trim(), role: "staff" });
        await deleteDoc(doc(db, "staff_members", editingStaffId));
      } else if (editingStaffOriginalRole === "godown" && editingStaffRole !== "godown") {
        await setDoc(doc(db, "staff_members", editingStaffId), { name: editingStaffName.trim(), role: editingStaffRole, pin: editingStaffPin });
        await deleteDoc(doc(db, "cafe_users", editingStaffId));
      } else {
        if (editingStaffRole === "godown") {
          await setDoc(doc(db, "cafe_users", editingStaffId), { id: editingStaffId, name: editingStaffName.trim().toUpperCase(), pin: editingStaffPin.trim(), role: "staff" }, { merge: true });
        } else {
          await setDoc(doc(db, "staff_members", editingStaffId), { name: editingStaffName.trim(), role: editingStaffRole, pin: editingStaffPin }, { merge: true });
        }
      }
      setEditingStaffId(null); setEditingStaffOriginalRole(null);
      toast.success("Staff member details updated!");
    } catch (err) { toast.error("Update failed."); }
  };

  const handleUpdatePasscodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') return toast.error("केवल मुख्य एडमिन ही पिन बदल सकते हैं!");
    if (newAdminPinInput.length < 4 || newManagerPinInput.length < 4) return toast.error("पिन कम से कम 4 अक्षरों का होना चाहिए!");
    try {
      const hashedAdmin = await sha256(newAdminPinInput);
      const hashedManager = await sha256(newManagerPinInput);
      await setDoc(doc(db, "settings", "passcodes"), { adminPin: hashedAdmin, managerPin: hashedManager }, { merge: true });
      toast.success("PINs updated securely with SHA-256 Hashing Encryption! 🔒");
    } catch (err) { toast.error("Failed to update keys."); }
  };

  const unifiedStaffList = useMemo(() => {
    const list: any[] = [];
    staff.forEach(s => list.push({ ...s, isHelper: false }));
    cafeHelperUsers.forEach(h => list.push({ id: h.id, name: h.name, pin: h.pin, role: 'godown', isHelper: true }));
    return list;
  }, [staff, cafeHelperUsers]);

  return (
    <div className="space-y-6">
      {/* Sub-menu tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-neutral-200 dark:border-white/5 pb-2">
        {[
          { id: 'banners', label: '🖼️ Banners' },
          { id: 'reels', label: '🎥 Reels' },
          { id: 'footer', label: '🦶 Footer' }, 
          { id: 'header_video', label: '🎬 Media/Info' },
          { id: 'coupons', label: '🎟️ Coupons' },
          { id: 'reviews', label: '⭐ Reviews' },
          { id: 'proofs', label: '🔥 Alerts' },
          { id: 'claims', label: '✅ Claims' },
          { id: 'security', label: '🔑 PINs & QR' }
        ].map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => setActiveSubTab(subTab.id as any)}
            className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase whitespace-nowrap transition-all ${
              activeSubTab === subTab.id ? 'bg-orange-500 text-white shadow' : 'bg-neutral-200 text-neutral-600 hover:text-neutral-900 dark:bg-white/5 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {/* --- SUB-TAB 1: BANNERS --- */}
      {activeSubTab === 'banners' && (
        <div className="space-y-6">
          <form onSubmit={handleAddBanner} className="bg-white dark:bg-[#020202] border border-neutral-200 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-orange-600 dark:text-orange-500 uppercase flex items-center gap-1.5"><ImageIcon size={14}/> Add Promo Banner</h3>
            <div className="space-y-3 text-xs">
              <input type="text" placeholder="Banner Title (e.g. Free Delivery above ₹99)" value={newBannerTitle} onChange={(e) => setNewBannerTitle(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs text-neutral-900 dark:text-white outline-none" required />
              <input type="url" placeholder="Paste Image link or Video URL..." value={newBannerUrl} onChange={(e) => setNewBannerUrl(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs text-neutral-900 dark:text-white outline-none" required />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm">Add Banner</button>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map(b => (
              <div key={b.id} className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-3 rounded-2xl relative shadow-sm">
                <div className="h-32 overflow-hidden rounded-xl bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center">
                  {isVideoUrl(b.url) ? (
                    <video src={b.url} muted className="w-full h-full object-cover" />
                  ) : (
                    <img src={b.url} className="w-full h-full object-cover opacity-90 dark:opacity-80" alt="Banner" />
                  )}
                </div>
                <div className="mt-3 text-[10px] flex justify-between items-center">
                  <span className="font-black truncate pr-1 text-neutral-900 dark:text-white">{b.title}</span>
                  <div className="flex gap-1">
                    <button onClick={() => toggleBannerVisibility(b)} className="p-1.5 bg-neutral-200 text-neutral-600 dark:bg-white/5 rounded-lg dark:text-gray-400 hover:text-black dark:hover:text-white">
                      {b.isVisible !== false ? <Eye size={14}/> : <EyeOff size={14}/>}
                    </button>
                    <button onClick={() => handleDeleteBanner(b.id)} className="p-1.5 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20">
                      <Trash size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: REELS --- */}
      {activeSubTab === 'reels' && (
        <div className="space-y-6">
          <form onSubmit={handleAddReel} className="bg-white dark:bg-[#020202] border border-neutral-200 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-orange-600 dark:text-orange-500 uppercase flex items-center gap-1.5"><Play size={14}/> Add Food Reel</h3>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <input type="text" placeholder="Title/Dish Name" value={newReelTitle} onChange={(e) => setNewReelTitle(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-neutral-900 dark:text-white outline-none" required />
              <input type="number" placeholder="Item Price (₹)" value={newReelPrice} onChange={(e) => setNewReelPrice(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-neutral-900 dark:text-white outline-none" required />
            </div>
            <input type="text" placeholder="Description (e.g. Fresh pulling cheese!)" value={newReelDesc} onChange={(e) => setNewReelDesc(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs text-neutral-900 dark:text-white outline-none" required />
            <input type="url" placeholder="Reel Cover Thumbnail URL" value={newReelCoverUrl} onChange={(e) => setNewReelCoverUrl(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs text-neutral-900 dark:text-white outline-none" />
            <input type="url" placeholder="Media URL (.mp4)" value={newReelUrl} onChange={(e) => setNewReelUrl(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs text-neutral-900 dark:text-white outline-none" required />
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm">Add Reel</button>
          </form>

          <div className="grid grid-cols-2 gap-4">
            {reels.map(r => (
              <div key={r.id} className="bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-3 rounded-2xl relative shadow-sm">
                <div className="h-32 overflow-hidden bg-neutral-200 dark:bg-neutral-900 rounded-xl">
                  {isVideoUrl(r.url) ? (
                    <video src={r.url} muted loop autoPlay className="w-full h-full object-cover" />
                  ) : (
                    <img src={r.url} className="w-full h-full object-cover" alt="Reel Preview" />
                  )}
                </div>
                <div className="mt-3 text-[10px] space-y-0.5">
                  <p className="font-black text-neutral-800 dark:text-gray-200 truncate">{r.title}</p>
                  <p className="text-orange-600 dark:text-orange-500 font-bold">₹{r.price}</p>
                </div>
                <button onClick={() => handleDeleteReel(r.id)} className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-500 rounded-xl hover:bg-red-200 dark:hover:bg-red-500/40">
                  <Trash size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 3: FOOTER --- */}
      {activeSubTab === 'footer' && (
        <div className="space-y-6">
          <form onSubmit={handleUpdateSocialCounts} className="bg-white dark:bg-[#111] p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left border border-neutral-200 dark:border-white/5 shadow-sm">
            <h3 className="text-sm font-black text-orange-600 dark:text-orange-500 uppercase flex items-center gap-1.5">
              📊 Social Media Counts
            </h3>
            <p className="text-[10px] text-neutral-500 dark:text-gray-500 font-bold uppercase leading-relaxed font-mono">
              यहाँ से आप होम पेज के फुटर में दिखने वाले लाइव फ़ॉलोअर्स और सब्सक्राइबर्स के आंकड़े बदल सकते हैं।
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-pink-500">
                  <Instagram size={16} />
                  <span className="text-[10px] uppercase font-black">Instagram</span>
                </div>
                <input type="text" value={instagramCount} onChange={(e) => setInstagramCount(e.target.value)} placeholder="e.g. 12K+" className="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none text-xs font-mono font-bold" required />
              </div>

              <div className="bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-red-500">
                  <Youtube size={16} />
                  <span className="text-[10px] uppercase font-black">YouTube</span>
                </div>
                <input type="text" value={youtubeCount} onChange={(e) => setYoutubeCount(e.target.value)} placeholder="e.g. 10K+" className="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none text-xs font-mono font-bold" required />
              </div>

              <div className="bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-blue-500">
                  <Facebook size={16} />
                  <span className="text-[10px] uppercase font-black">Facebook</span>
                </div>
                <input type="text" value={facebookCount} onChange={(e) => setFacebookCount(e.target.value)} placeholder="e.g. 5K+" className="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none text-xs font-mono font-bold" required />
              </div>

              <div className="bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                <div className="flex items-center gap-2 text-green-500">
                  <MessageCircle size={16} />
                  <span className="text-[10px] uppercase font-black">WhatsApp</span>
                </div>
                <input type="text" value={whatsappCount} onChange={(e) => setWhatsAppCount(e.target.value)} placeholder="e.g. 2K+" className="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none text-xs font-mono font-bold" required />
              </div>

              <div className="bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex flex-col gap-2 col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 text-yellow-500 dark:text-yellow-400">
                  <Ghost size={16} />
                  <span className="text-[10px] uppercase font-black">Snapchat</span>
                </div>
                <input type="text" value={snapchatCount} onChange={(e) => setSnapchatCount(e.target.value)} placeholder="e.g. 15K+" className="w-full bg-white dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl p-2.5 text-neutral-900 dark:text-white outline-none text-xs font-mono font-bold" required />
              </div>
            </div>

            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm transition-all duration-200">
              Save Social Counts
            </button>
          </form>

          {/* Timings & Map Location Section */}
          <form onSubmit={handleUpdateStoreTimingsAndLocation} className="bg-white dark:bg-[#111] p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left border border-neutral-200 dark:border-white/5 shadow-sm">
            <h3 className="text-sm font-black text-orange-500 uppercase flex items-center gap-1.5">⏰ Timing & Location</h3>
            <p className="text-[10px] text-neutral-500 dark:text-gray-500 font-bold uppercase leading-relaxed font-mono">
              यहाँ से आप दुकान के खुलने/बंद होने का समय और गूगल मैप्स की लोकेशन बदल सकते हैं।
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 dark:text-gray-400 block mb-1">Store Timing (Hindi)</label>
                <input type="text" value={storeTimingHindi} onChange={e => setStoreTimingHindi(e.target.value)} placeholder="Timing (Hindi)" className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-neutral-900 dark:text-white outline-none" required />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 dark:text-gray-400 block mb-1">Store Timing (English)</label>
                <input type="text" value={storeTimingEnglish} onChange={e => setStoreTimingEnglish(e.target.value)} placeholder="Timing (English)" className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-neutral-900 dark:text-white outline-none" required />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-neutral-500 dark:text-gray-400 block mb-1">Google Maps Link</label>
                <input type="url" value={googleMapUrl} onChange={e => setGoogleMapUrl(e.target.value)} placeholder="Google Map Link" className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-neutral-900 dark:text-white outline-none" required />
              </div>
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm">Update Timings & Map</button>
          </form>
        </div>
      )}

      {/* --- SUB-TAB 4: MEDIA/INFO (केवल हेडर बैकग्राउंड वीडियो) --- */}
      {activeSubTab === 'header_video' && (
        <div className="space-y-6">
          <form onSubmit={handleUpdateHeaderVideo} className="bg-white dark:bg-[#111] p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left border border-neutral-200 dark:border-white/5 shadow-sm">
            <h3 className="text-sm font-black text-orange-500 uppercase flex items-center gap-1.5">🎬 Header Media</h3>
            <p className="text-[10px] text-neutral-500 dark:text-gray-500 font-bold uppercase leading-relaxed font-mono">
              यहाँ से आप होम पेज पर ऊपर दिखने वाले मुख्य बैकग्राउंड वीडियो का यूआरएल बदल सकते हैं।
            </p>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-neutral-500 dark:text-gray-400 block mb-1">Header Background Video URL</label>
              <input type="url" value={headerVideoInput} onChange={e => setHeaderVideoInput(e.target.value)} placeholder="Paste video URL" className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-neutral-900 dark:text-white outline-none" required />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm">Update Video</button>
          </form>
        </div>
      )}

      {/* --- SUB-TAB 5: COUPONS --- */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-6">
          <form onSubmit={handleAddCoupon} className="bg-white dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-orange-500 uppercase flex items-center gap-1.5"><Percent size={14}/> Create Coupon Code</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input type="text" placeholder="CODE (e.g. WELCOME)" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs font-black uppercase text-neutral-900 dark:text-white outline-none" required />
              <input type="number" placeholder="Discount (₹)" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs font-black text-neutral-900 dark:text-white outline-none" required />
            </div>
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm">Create Coupon</button>
          </form>

          <div className="space-y-3">
            {coupons.map(c => (
              <div key={c.id} className="bg-white dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs shadow-sm">
                <span className="font-black text-orange-600 dark:text-orange-500 uppercase">{c.code} - Flat ₹{c.discountValue} OFF</span>
                <button onClick={() => handleDeleteCoupon(c.id)} className="p-2.5 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500 rounded-xl hover:bg-red-200 dark:hover:bg-red-500/20">
                  <Trash size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 6: REVIEWS --- */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-4">
          {reviews.length === 0 && <p className="text-center text-neutral-500 dark:text-gray-500 py-12 text-xs uppercase font-bold">No reviews found...</p>}
          {reviews.map(r => (
            <div key={r.id} className="bg-white dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-5 rounded-[2rem] space-y-3 text-xs text-left shadow-sm">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs text-neutral-800 dark:text-gray-200">{r.name} ({r.rating} ★)</h4>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.isApproved ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-500'}`}>{r.isApproved ? 'Live' : 'Pending'}</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-gray-400 italic">"{r.comment}"</p>
              <div className="flex gap-2 justify-end pt-2 border-t border-neutral-200 dark:border-white/5">
                {!r.isApproved && (
                  <button onClick={() => handleApproveReview(r.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-[10px] font-black uppercase">Approve</button>
                )}
                <button onClick={() => handleDeleteReview(r.id)} className="p-2 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20">
                  <Trash size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- SUB-TAB 7: SOCIAL PROOF ALERTS --- */}
      {activeSubTab === 'proofs' && (
        <div className="space-y-6">
          <form onSubmit={handleAddSocialProof} className="bg-white dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-sm">
            <h3 className="text-sm font-black text-orange-500 uppercase">Create Social Proof Alert</h3>
            <textarea 
              rows={2}
              placeholder="उदा: शुभम द्विवेदी जी (टाउन) ने अभी-अभी 'स्पेशल थाली' आर्डर की 🍱" 
              value={newProofText}
              onChange={(e) => setNewProofText(e.target.value)}
              className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 text-xs text-neutral-900 dark:text-white outline-none font-bold"
              required
            />
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm">Add Alert</button>
          </form>

          <div className="space-y-3">
            {socialProofs.map(alert => (
              <div key={alert.id} className="bg-white dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-4 rounded-3xl flex justify-between items-center text-xs text-left shadow-sm">
                <p className="font-bold text-neutral-800 dark:text-gray-300 pr-2">{alert.text}</p>
                <button onClick={() => handleDeleteSocialProof(alert.id)} className="p-2.5 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20">
                  <Trash size={14}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 8: CLAIMS --- */}
      {activeSubTab === 'claims' && (
        <div className="space-y-6">
          {pointsClaims.length === 0 ? (
            <p className="text-center text-xs font-bold text-neutral-500 dark:text-gray-500 py-12 uppercase">कोई दावा अनुरोध नहीं मिला।</p>
          ) : (
            pointsClaims.map((claim) => (
              <div key={claim.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 p-4 rounded-3xl space-y-3 text-xs text-left shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-black text-orange-600 dark:text-orange-500">{claim.customerName}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${claim.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500' : claim.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-500'}`}>
                    {claim.status}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-600 dark:text-gray-400 font-semibold space-y-0.5 font-mono">
                  <p>प्लेटफॉर्म: <span className="text-neutral-900 dark:text-white">{claim.platformLabel}</span></p>
                  <p>सोशल यूज़रनेम / हैंडल: <span className="text-yellow-600 dark:text-yellow-400 font-black">{claim.socialUsername}</span></p>
                  <p>कस्टमर नंबर: <span className="text-neutral-900 dark:text-white">+{claim.customerPhone}</span></p>
                </div>
                {claim.status === "pending" && (
                  <div className="flex gap-2 pt-1.5">
                    <button 
                      onClick={() => handleVerifyClaimApproval(claim)} 
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-1.5 rounded text-[9px] uppercase flex items-center justify-center gap-1 shadow-md"
                    >
                      <CheckCircle2 size={10}/> Accept (+1 Point)
                    </button>
                    <button 
                      onClick={() => handleRejectClaim(claim.id)} 
                      className="flex-1 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-500 dark:hover:bg-red-900/40 font-black py-1.5 rounded text-[9px] uppercase flex items-center justify-center gap-1"
                    >
                      <XCircle size={10}/> Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* --- SUB-TAB 9: SECURITY (PINS, STAFF & TABLES QR) --- */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          {/* Master PIN changes form */}
          <form onSubmit={handleUpdatePasscodes} className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left shadow-sm">
            <div>
              <h4 className="text-sm font-black text-orange-500 uppercase">Change security PINs</h4>
              <p className="text-[9px] text-neutral-500 dark:text-gray-500 font-bold uppercase mt-1 leading-relaxed font-mono">केवल मुख्य एडमिन ही दोनों क्रेडेंशियल्स को बदल सकता है।</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase">Admin LOGIN PIN</label>
                <input type="password" value={newAdminPinInput} onChange={(e) => setNewAdminPinInput(e.target.value)} disabled={userRole !== 'admin'} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 outline-none text-neutral-900 dark:text-white tracking-widest text-center font-mono" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase">Manager LOGIN PIN</label>
                <input type="password" value={newManagerPinInput} onChange={(e) => setNewManagerPinInput(e.target.value)} disabled={userRole !== 'admin'} className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 outline-none text-neutral-900 dark:text-white tracking-widest text-center font-mono" required />
              </div>
            </div>
            {userRole === 'admin' ? (
              <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-3.5 rounded-xl font-black text-xs uppercase shadow-sm">Update Passcodes</button>
            ) : (
              <p className="text-[9px] text-red-500 text-center">⚠️ READ-ONLY: Only Admin role can edit PIN codes.</p>
            )}
          </form>

          {/* Combined Staff Registry Form */}
          <div className="bg-white dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left shadow-sm">
            <h4 className="text-sm font-black text-yellow-600 dark:text-yellow-400 uppercase">👥 Staff Accounts Registry</h4>
            
            {!editingStaffId ? (
              <form onSubmit={handleAddStaffCombined} className="bg-neutral-50 dark:bg-black/40 border border-neutral-200 dark:border-white/5 p-4 rounded-2xl space-y-3">
                <p className="text-[9px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-wider">➕ Add Staff Member / नया स्टाफ जोड़ें</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Name (e.g. Ramesh)" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg p-2.5 text-neutral-900 dark:text-white outline-none" required />
                  <input type="password" maxLength={6} placeholder="4-digit PIN (e.g. 1234)" value={newStaffPin} onChange={(e) => setNewStaffPin(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg p-2.5 text-neutral-900 dark:text-white outline-none text-center tracking-widest font-mono" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-500 dark:text-gray-500 uppercase">Staff Role / विभाग</label>
                  <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg p-2.5 text-neutral-900 dark:text-white outline-none cursor-pointer">
                    <option value="delivery">Rider / Delivery Boy 🛵</option>
                    <option value="kitchen">Cook / Kitchen Staff 👨‍🍳</option>
                    <option value="cashier">Cashier / Counter Manager 💼</option>
                    <option value="godown">Godown Helper / गोदाम यूज़र 📦</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white p-2.5 rounded-lg font-black uppercase text-[10px] shadow-sm">Add Staff</button>
              </form>
            ) : (
              <form onSubmit={handleUpdateStaffCombined} className="bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20 p-4 rounded-2xl space-y-3">
                <p className="text-[9px] font-black text-orange-600 dark:text-orange-500 uppercase tracking-wider">✏️ Edit Staff / चेंज पिन</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={editingStaffName} onChange={(e) => setEditingStaffName(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg p-2.5 text-neutral-900 dark:text-white outline-none" required />
                  <input type="password" maxLength={6} value={editingStaffPin} onChange={(e) => setEditingStaffPin(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg p-2.5 text-neutral-900 dark:text-white outline-none text-center tracking-widest font-mono" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-neutral-500 dark:text-gray-500 uppercase">Staff Role</label>
                  <select value={editingStaffRole} onChange={(e) => setEditingStaffRole(e.target.value)} className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-white/10 rounded-lg p-2.5 text-neutral-900 dark:text-white outline-none cursor-pointer">
                    <option value="delivery">Rider / Delivery Boy 🛵</option>
                    <option value="kitchen">Cook / Kitchen Staff 👨‍🍳</option>
                    <option value="cashier">Cashier / Counter Manager 💼</option>
                    <option value="godown">Godown Helper / गोदाम यूज़र 📦</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg text-[10px] font-black uppercase shadow-sm">Save</button>
                  <button type="button" onClick={() => { setEditingStaffId(null); setEditingStaffOriginalRole(null); }} className="bg-neutral-200 text-neutral-600 dark:bg-white/5 dark:text-gray-400 hover:bg-neutral-300 dark:hover:bg-white/10 p-2 rounded-lg text-[10px] font-black uppercase">Cancel</button>
                </div>
              </form>
            )}

            {/* Staff list */}
            <div className="space-y-2 pt-2">
              {unifiedStaffList.map((member) => {
                const isPinRevealed = revealPinId === member.id;
                return (
                  <div key={member.id} className="bg-neutral-50 dark:bg-[#111] p-3 rounded-2xl flex justify-between items-center border border-neutral-200 dark:border-white/5 text-xs font-bold shadow-sm">
                    <div>
                      <p className="text-neutral-900 dark:text-white font-black">{member.name}</p>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block ${
                        member.role === 'delivery' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : member.role === 'kitchen' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' : member.role === 'godown' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                      }`}>
                        {member.role === 'delivery' ? 'Rider 🛵' : member.role === 'kitchen' ? 'Kitchen 👨‍🍳' : member.role === 'godown' ? 'Godown 📦' : 'Cashier 💼'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400">PIN: {isPinRevealed ? member.pin : '••••'}</span>
                      <button onClick={() => setRevealPinId(isPinRevealed ? null : member.id)} className="p-2 bg-neutral-200 text-neutral-600 dark:bg-white/5 dark:text-gray-400 rounded hover:bg-neutral-300 dark:hover:text-white">👁️</button>
                      <button onClick={() => {
                        setEditingStaffId(member.id);
                        setEditingStaffName(member.name);
                        setEditingStaffRole(member.role);
                        setEditingStaffPin(member.pin);
                        setEditingStaffOriginalRole(member.role);
                      }} className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/20">⚙️</button>
                      <button onClick={() => handleDeleteStaffCombined(member.id, member.role)} className="p-2 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-500 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
           
          {/* Dine-In Table QR Generator */}
          <div className="bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/5 p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left shadow-sm">
            <div>
              <h4 className="text-sm font-black text-orange-500 uppercase">🍽️ Dine-In Table QR Generator</h4>
              <p className="text-[9px] text-neutral-500 dark:text-gray-500 font-bold uppercase mt-1 leading-relaxed">ऑटोमैटिक टेबल आर्डर रूटिंग के लिए स्कैन क्यूआर कोड जनरेट करें:</p>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-neutral-600 dark:text-gray-400 uppercase">Table Number</label>
                <input type="number" min={1} value={genTableNum} onChange={(e) => setGenTableNum(e.target.value)} placeholder="e.g. 3" className="w-full bg-neutral-100 dark:bg-black/40 border border-neutral-300 dark:border-white/10 rounded-xl p-3 outline-none text-xs font-black text-neutral-900 dark:text-white" />
              </div>
              <button 
                onClick={() => {
                  if (!genTableNum) return toast.error("Please enter a table number!");
                  const url = `https://bb-cafe-app.vercel.app/?table=${genTableNum}`;
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank');
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white dark:text-black font-black text-xs py-3.5 px-6 rounded-xl uppercase tracking-wider transition-all shadow-sm"
              >
                Generate QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
