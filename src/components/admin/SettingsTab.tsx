'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase'; // अपनी लोकेशन के अनुसार पाथ सेट करें
import { collection, addDoc, doc, setDoc, deleteDoc, updateDoc, runTransaction, increment, onSnapshot } from 'firebase/firestore';
import { Trash, Eye, EyeOff, ImageIcon, Play, Settings, X, Percent, CheckCircle2, XCircle, Lock, Edit, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { isVideoUrl, sha256 } from '../../lib/utils'; // अपनी लोकेशन के अनुसार पाथ सेट करें
import SocialCountsEditor from './SocialCountsEditor'; // या सही पाथ दें

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
  storeOpen // [सुधार] storeOpen को यहाँ डीस्ट्रक्चर कर दिया गया है
}: SettingsTabProps) {
  // --- LOCAL STATES ---
  const [activeSubTab, setActiveSubTab] = useState<'banners' | 'reels' | 'categories' | 'header_video' | 'coupons' | 'reviews' | 'proofs' | 'claims' | 'security'>('banners');

  // Promo Banners State
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newBannerTitle, setNewBannerTitle] = useState("");

  // Food Reels State
  const [newReelUrl, setNewReelUrl] = useState("");
  const [newReelCoverUrl, setNewReelCoverUrl] = useState("");
  const [newReelTitle, setNewReelTitle] = useState("");
  const [newReelDesc, setNewReelDesc] = useState("");
  const [newReelPrice, setNewReelPrice] = useState("");

  // Categories State (नया फीचर)
  const [localCategories, setLocalCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCoverUrl, setNewCatCoverUrl] = useState("");

  // Header Background, Timings & Maps
  const [headerVideoInput, setHeaderVideoInput] = useState("");
  const [storeTimingHindi, setStoreTimingHindi] = useState("सुबह 10:00 से रात 11:00 बजे");
  const [storeTimingEnglish, setStoreTimingEnglish] = useState("10:00 AM to 11:00 PM");
  const [googleMapUrl, setGoogleMapUrl] = useState("https://maps.app.goo.gl/8pj1Xby3bbMn5qxu5");

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
  const [revealPinId, setRevealPinId] = useState<string | null>(null);

  // Dine-In Table QR State
  const [genTableNum, setGenTableNum] = useState("1");

  // Dynamic PIN Change Inputs
  const [newAdminPinInput, setNewAdminPinInput] = useState("");
  const [newManagerPinInput, setNewManagerPinInput] = useState("");

  // --- REAL-TIME DATA SYNC EFFECT ---
  useEffect(() => {
    // 1. [सुधार] डेटाबेस से वास्तविक स्टोर सेटिंग्स (वीडियो, टाइमिंग्स, मैप) लोड करना
    const unsubStore = onSnapshot(doc(db, "settings", "store"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.headerVideoUrl) setHeaderVideoInput(data.headerVideoUrl);
        if (data.timingHindi) setStoreTimingHindi(data.timingHindi);
        if (data.timingEnglish) setStoreTimingEnglish(data.timingEnglish);
        if (data.googleMapUrl) setGoogleMapUrl(data.googleMapUrl);
      }
    });

    // 2. [नया सुधार] रीयल-टाइम कैटेगरीज लोड करना
    const unsubCategories = onSnapshot(collection(db, "categories"), (snap) => {
      setLocalCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubStore();
      unsubCategories();
    };
  }, []);

  // --- CRUD HANDLERS ---

  // 1. BANNERS
  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerUrl || !newBannerTitle) return toast.error("Please fill Name & URL!");
    try {
      await addDoc(collection(db, "banners"), { 
        url: newBannerUrl, 
        title: newBannerTitle,
        isVisible: true, 
        timestamp: new Date() 
      });
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
      await updateDoc(doc(db, "banners", banner.id), {
        isVisible: banner.isVisible !== false ? false : true
      });
      toast.success("Banner status updated!");
    } catch (err) { toast.error("Error toggling banner"); }
  };

  // 2. REELS
  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReelUrl || !newReelTitle || !newReelPrice) {
      return toast.error("Please enter Reel title, price, and media URL!");
    }
    try {
      await addDoc(collection(db, "reels"), {
        url: newReelUrl,
        coverUrl: newReelCoverUrl || "",
        title: newReelTitle,
        description: newReelDesc || "",
        price: Number(newReelPrice) || 0,
        timestamp: new Date()
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

  // 3. CATEGORIES MANAGEMENT (नया फीचर) [1]
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return toast.error("कृपया कैटेगरी का नाम लिखें!");
    try {
      await addDoc(collection(db, "categories"), {
        name: newCatName.trim(),
        coverUrl: newCatCoverUrl.trim() || "",
        isVisible: true,
        timestamp: new Date()
      });
      setNewCatName("");
      setNewCatCoverUrl("");
      toast.success("नई कैटेगरी सफलतापूर्वक जोड़ी गई! 📁");
    } catch (err) { toast.error("कैटेगरी जोड़ने में त्रुटि आई।"); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("क्या आप सच में इस कैटेगरी को डिलीट करना चाहते हैं?")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      toast.success("कैटेगरी डिलीट कर दी गई!");
    } catch (err) { toast.error("डिलीट करने में त्रुटि आई।"); }
  };

  const toggleCategoryVisibility = async (cat: any) => {
    try {
      await updateDoc(doc(db, "categories", cat.id), {
        isVisible: cat.isVisible !== false ? false : true
      });
      toast.success("कैटेगरी स्टेटस अपडेट किया गया!");
    } catch (err) { toast.error("स्टेटस बदलने में त्रुटि आई।"); }
  };

  // 4. HEADER VIDEO, TIMINGS & MAPS
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
    if (!storeTimingHindi || !storeTimingEnglish || !googleMapUrl) {
      return toast.error("Please fill all timings and location URL!");
    }
    try {
      await setDoc(doc(db, "settings", "store"), {
        timingHindi: storeTimingHindi,
        timingEnglish: storeTimingEnglish,
        googleMapUrl: googleMapUrl
      }, { merge: true });
      toast.success("Timings & Google Map Location updated! ⏰🗺️");
    } catch (err) { toast.error("Failed to update store data."); }
  };

  // 5. COUPONS
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode || !newCouponValue) return;
    const cleanCode = newCouponCode.trim().toUpperCase();
    try {
      await setDoc(doc(db, "coupons", cleanCode), {
        code: cleanCode,
        discountValue: Number(newCouponValue),
        timestamp: new Date()
      });
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

  // 6. REVIEWS
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

  // 7. SOCIAL PROOF ALERTS
  const handleAddSocialProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProofText.trim()) return toast.error("Please enter alert text!");
    try {
      await addDoc(collection(db, "social_proofs"), {
        text: newProofText.trim(),
        timestamp: new Date()
      });
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

  // 8. POINTS CLAIMS
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
        transaction.set(histRef, {
          type: "earn",
          points: claim.pointsToReward,
          description: `Followed us on ${claim.platformLabel} 📱 (Approved)`,
          timestamp: new Date()
        });
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

  // 9. STAFF PIN & CONFIGURATION
  const handleAddStaffCombined = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPin) return toast.error("Kripya saari details bharein!");
    if (newStaffPin.length < 4 || isNaN(Number(newStaffPin))) {
      return toast.error("PIN 4-अंकों ka numerical होना चाहिए!");
    }
    
    try {
      if (newStaffRole === "godown") {
        const helperId = `user_${Date.now()}`;
        await setDoc(doc(db, "cafe_users", helperId), {
          id: helperId,
          name: newStaffName.trim().toUpperCase(),
          pin: newStaffPin.trim(),
          role: "staff"
        });
        toast.success("नया गोदाम सहायक सफलतापूर्वक स्टाफ में जोड़ा गया! 📦🎉");
      } else {
        await addDoc(collection(db, "staff_members"), {
          name: newStaffName.trim(),
          role: newStaffRole,
          pin: newStaffPin,
          timestamp: new Date()
        });
        toast.success("Naya staff member successfully add ho gaya! 🎉");
      }
      setNewStaffName("");
      setNewStaffPin("");
    } catch (err) {
      toast.error("Staff member add karne me dikkat aayi.");
    }
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
    if (editingStaffPin.length < 4 || isNaN(Number(editingStaffPin))) {
      return toast.error("PIN 4-अंकों ka numerical hona chahiye!");
    }

    try {
      if (editingStaffRole === "godown") {
        await setDoc(doc(db, "cafe_users", editingStaffId), {
          id: editingStaffId,
          name: editingStaffName.trim().toUpperCase(),
          pin: editingStaffPin.trim(),
          role: "staff"
        }, { merge: true });
      } else {
        await setDoc(doc(db, "staff_members", editingStaffId), {
          name: editingStaffName.trim(),
          role: editingStaffRole,
          pin: editingStaffPin
        }, { merge: true });
      }
      setEditingStaffId(null);
      toast.success("Staff member details updated!");
    } catch (err) { toast.error("Update failed."); }
  };

  const handleUpdatePasscodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'admin') {
      return toast.error("केवल मुख्य एडमिन ही पिन बदल सकते हैं!");
    }
    if (newAdminPinInput.length < 4 || newManagerPinInput.length < 4) {
      return toast.error("पिन कम से कम 4 अक्षरों का होना चाहिए!");
    }
    try {
      const hashedAdmin = await sha256(newAdminPinInput);
      const hashedManager = await sha256(newManagerPinInput);
      await setDoc(doc(db, "settings", "passcodes"), {
        adminPin: hashedAdmin,
        managerPin: hashedManager
      }, { merge: true });
      toast.success("PINs updated securely with SHA-256 Hashing Encryption! 🔒");
    } catch (err) { toast.error("Failed to update keys."); }
  };

  // कंबाइंड स्टाफ लिस्ट तैयार करना
  const unifiedStaffList = useMemo(() => {
    const list: any[] = [];
    staff.forEach(s => list.push({ ...s, isHelper: false }));
    cafeHelperUsers.forEach(h => list.push({ id: h.id, name: h.name, pin: h.pin, role: 'godown', isHelper: true }));
    return list;
  }, [staff, cafeHelperUsers]);

  return (
    <div className="space-y-6">
      {/* उप-सेटिंग्स नेविगेशन बार (Sub-menu tabs) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5 pb-2">
        {[
          { id: 'banners', label: '🖼️ Banners' },
          { id: 'reels', label: '🎥 Reels' },
          { id: 'categories', label: '📁 Categories' }, // [नया सब-टैब जोड़ा गया]
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
              activeSubTab === subTab.id ? 'bg-orange-500 text-white shadow' : 'bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {subTab.label}
          </button>
        ))}
      </div>

      {/* --- SUB-TAB 1: BANNERS --- */}
      {activeSubTab === 'banners' && (
        <div className="space-y-6">
          <form onSubmit={handleAddBanner} className="bg-[#020202] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
            <h3 className="text-sm font-black text-orange-500 uppercase flex items-center gap-1.5"><ImageIcon size={14}/> Add Promo Banner</h3>
            <div className="space-y-3 text-xs">
              <input type="text" placeholder="Banner Title (e.g. Free Delivery above ₹99)" value={newBannerTitle} onChange={(e) => setNewBannerTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
              <input type="url" placeholder="Paste Image link or Video URL..." value={newBannerUrl} onChange={(e) => setNewBannerUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Add Banner</button>
          </form>
          <div className="mt-6">
             <SocialCountsEditor />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {banners.map(b => (
              <div key={b.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative">
                <div className="h-24 overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center">
                  {isVideoUrl(b.url) ? (
                    <video src={b.url} muted className="w-full h-full object-cover" />
                  ) : (
                    <img src={b.url} className="w-full h-full object-cover opacity-80" alt="Banner" />
                  )}
                </div>
                <div className="mt-2 text-[10px] flex justify-between items-center">
                  <span className="font-black truncate pr-1">{b.title}</span>
                  <div className="flex gap-1">
                    <button onClick={() => toggleBannerVisibility(b)} className="p-1 bg-white/5 rounded text-gray-400">
                      {b.isVisible !== false ? <Eye size={12}/> : <EyeOff size={12}/>}
                    </button>
                    <button onClick={() => handleDeleteBanner(b.id)} className="p-1 bg-red-500/10 text-red-500 rounded">
                      <Trash size={12}/>
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
          <form onSubmit={handleAddReel} className="bg-[#020202] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
            <h3 className="text-sm font-black text-orange-500 uppercase flex items-center gap-1.5"><Play size={14}/> Add Food Reel</h3>
            <div className="grid grid-cols-2 gap-3 text-xs font-bold">
              <input type="text" placeholder="Title/Dish Name" value={newReelTitle} onChange={(e) => setNewReelTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
              <input type="number" placeholder="Item Price (₹)" value={newReelPrice} onChange={(e) => setNewReelPrice(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
            </div>
            <input type="text" placeholder="Description (e.g. Fresh pulling cheese!)" value={newReelDesc} onChange={(e) => setNewReelDesc(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
            <input type="url" placeholder="Reel Cover Thumbnail URL" value={newReelCoverUrl} onChange={(e) => setNewReelCoverUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" />
            <input type="url" placeholder="Media URL (.mp4)" value={newReelUrl} onChange={(e) => setNewReelUrl(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" required />
            <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Add Reel</button>
          </form>

          <div className="grid grid-cols-2 gap-4">
            {reels.map(r => (
              <div key={r.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative">
                <div className="h-32 overflow-hidden bg-neutral-900 rounded-xl">
                  {isVideoUrl(r.url) ? (
                    <video src={r.url} muted loop autoPlay className="w-full h-full object-cover" />
                  ) : (
                    <img src={r.url} className="w-full h-full object-cover" alt="Reel Preview" />
                  )}
                </div>
                <div className="mt-2 text-[10px] space-y-0.5">
                  <p className="font-black text-gray-200 truncate">{r.title}</p>
                  <p className="text-orange-500 font-bold">₹{r.price}</p>
                </div>
                <button onClick={() => handleDeleteReel(r.id)} className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-500 rounded-xl">
                  <Trash size={12}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- [नया सब-टैब] SUB-TAB 3: CATEGORIES --- */}
      {activeSubTab === 'categories' && (
        <div className="space-y-6">
          <form onSubmit={handleAddCategory} className="bg-[#020202] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
            <h3 className="text-sm font-black text-orange-500 uppercase flex items-center gap-1.5">
              <ImageIcon size={14}/> Add New Category
            </h3>
            <div className="space-y-3 text-xs">
              <input 
                type="text" 
                placeholder="Category Name (e.g. Burger, Pizza)" 
                value={newCatName} 
                onChange={(e) => setNewCatName(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" 
                required 
              />
              <input 
                type="url" 
                placeholder="Category Cover Image URL" 
                value={newCatCoverUrl} 
                onChange={(e) => setNewCatCoverUrl(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none" 
              />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">
              Add Category
            </button>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {localCategories.map(cat => (
              <div key={cat.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl relative">
                <div className="h-24 overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center">
                  {cat.coverUrl ? (
                    <img src={cat.coverUrl} className="w-full h-full object-cover opacity-80" alt={cat.name} />
                  ) : (
                    <div className="text-[10px] text-gray-500 font-bold uppercase">No Image</div>
                  )}
                </div>
                <div className="mt-2 text-[10px] flex justify-between items-center">
                  <span className="font-black truncate pr-1">{cat.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => toggleCategoryVisibility(cat)} className="p-1 bg-white/5 rounded text-gray-400" title="Toggle Visibility">
                      {cat.isVisible !== false ? <Eye size={12}/> : <EyeOff size={12}/>}
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 bg-red-500/10 text-red-500 rounded" title="Delete">
                      <Trash size={12}/>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {localCategories.length === 0 && (
              <p className="col-span-full text-center text-gray-500 py-6 text-xs uppercase font-bold">No categories found...</p>
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 4: MEDIA/INFO --- */}
      {activeSubTab === 'header_video' && (
        <div className="space-y-6">
          <form onSubmit={handleUpdateHeaderVideo} className="bg-[#111] p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left">
            <label className="text-[10px] font-black uppercase text-gray-400">Header Background Video URL</label>
            <input type="url" value={headerVideoInput} onChange={e => setHeaderVideoInput(e.target.value)} placeholder="Paste video URL" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
            <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Update Video</button>
          </form>

          <form onSubmit={handleUpdateStoreTimingsAndLocation} className="bg-[#111] p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left">
            <label className="text-[10px] font-black uppercase text-gray-400">Store Timings & Google Maps Link</label>
            <input type="text" value={storeTimingHindi} onChange={e => setStoreTimingHindi(e.target.value)} placeholder="Timing (Hindi)" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
            <input type="text" value={storeTimingEnglish} onChange={e => setStoreTimingEnglish(e.target.value)} placeholder="Timing (English)" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
            <input type="url" value={googleMapUrl} onChange={e => setGoogleMapUrl(e.target.value)} placeholder="Google Map Link" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none" required />
            <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Update Timings & Map</button>
          </form>
        </div>
      )}

      {/* --- SUB-TAB 5: COUPONS --- */}
      {activeSubTab === 'coupons' && (
        <div className="space-y-6">
          <form onSubmit={handleAddCoupon} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
            <h3 className="text-sm font-black text-orange-500 uppercase flex items-center gap-1.5"><Percent size={14}/> Create Coupon Code</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input type="text" placeholder="CODE (e.g. WELCOME)" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-black uppercase text-white outline-none" required />
              <input type="number" placeholder="Discount (₹)" value={newCouponValue} onChange={(e) => setNewCouponValue(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-black text-white outline-none" required />
            </div>
            <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Create Coupon</button>
          </form>

          <div className="space-y-3">
            {coupons.map(c => (
              <div key={c.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-black text-orange-500 uppercase">{c.code} - Flat ₹{c.discountValue} OFF</span>
                <button onClick={() => handleDeleteCoupon(c.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
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
          {reviews.length === 0 && <p className="text-center text-gray-500 py-12 text-xs uppercase font-bold">No reviews found...</p>}
          {reviews.map(r => (
            <div key={r.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] space-y-3 text-xs text-left">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs text-gray-200">{r.name} ({r.rating} ★)</h4>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${r.isApproved ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{r.isApproved ? 'Live' : 'Pending'}</span>
              </div>
              <p className="text-xs text-gray-400 italic">"{r.comment}"</p>
              <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
                {!r.isApproved && (
                  <button onClick={() => handleApproveReview(r.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase">Approve</button>
                )}
                <button onClick={() => handleDeleteReview(r.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg">
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
          <form onSubmit={handleAddSocialProof} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
            <h3 className="text-sm font-black text-orange-500 uppercase">Create Social Proof Alert</h3>
            <textarea 
              rows={2}
              placeholder="उदा: शुभम द्विवेदी जी (टाउन) ने अभी-अभी 'स्पेशल थाली' आर्डर की 🍱" 
              value={newProofText}
              onChange={(e) => setNewProofText(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none font-bold"
              required
            />
            <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Add Alert</button>
          </form>

          <div className="space-y-3">
            {socialProofs.map(alert => (
              <div key={alert.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex justify-between items-center text-xs text-left">
                <p className="font-bold text-gray-300 pr-2">{alert.text}</p>
                <button onClick={() => handleDeleteSocialProof(alert.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-lg">
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
            <p className="text-center text-xs font-bold text-gray-500 py-12 uppercase">कोई दावा अनुरोध नहीं मिला।</p>
          ) : (
            pointsClaims.map((claim) => (
              <div key={claim.id} className="bg-neutral-900 border border-white/5 p-4 rounded-3xl space-y-3 text-xs text-left">
                <div className="flex justify-between items-center">
                  <span className="font-black text-orange-500">{claim.customerName}</span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${claim.status === 'approved' ? 'bg-green-500/10 text-green-500' : claim.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {claim.status}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-semibold space-y-0.5 font-mono">
                  <p>प्लेटफॉर्म: <span className="text-white">{claim.platformLabel}</span></p>
                  <p>सोशल यूज़रनेम / हैंडल: <span className="text-yellow-400 font-black">{claim.socialUsername}</span></p>
                  <p>कस्टमर नंबर: <span className="text-white">+{claim.customerPhone}</span></p>
                </div>
                {claim.status === "pending" && (
                  <div className="flex gap-2 pt-1.5">
                    <button 
                      onClick={() => handleVerifyClaimApproval(claim)} 
                      className="flex-1 bg-green-600 text-white font-black py-1.5 rounded text-[9px] uppercase flex items-center justify-center gap-1 shadow-md"
                    >
                      <CheckCircle2 size={10}/> Accept (+1 Point)
                    </button>
                    <button 
                      onClick={() => handleRejectClaim(claim.id)} 
                      className="flex-1 bg-red-900/10 text-red-500 font-black py-1.5 rounded text-[9px] uppercase flex items-center justify-center gap-1"
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
          {/* Master PIN changes form (Admin role only) */}
          <form onSubmit={handleUpdatePasscodes} className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left">
            <div>
              <h4 className="text-sm font-black text-orange-500 uppercase">Change security PINs</h4>
              <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 leading-relaxed font-mono">केवल मुख्य एडमिन ही दोनों क्रेडेंशियल्स को बदल सकता है।</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Admin LOGIN PIN</label>
                <input type="password" value={newAdminPinInput} onChange={(e) => setNewAdminPinInput(e.target.value)} disabled={userRole !== 'admin'} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white tracking-widest text-center font-mono" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Manager LOGIN PIN</label>
                <input type="password" value={newManagerPinInput} onChange={(e) => setNewManagerPinInput(e.target.value)} disabled={userRole !== 'admin'} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-white tracking-widest text-center font-mono" required />
              </div>
            </div>
            {userRole === 'admin' ? (
              <button type="submit" className="w-full bg-green-600 text-white p-3.5 rounded-xl font-black text-xs uppercase">Update Passcodes</button>
            ) : (
              <p className="text-[9px] text-red-500 text-center">⚠️ READ-ONLY: Only Admin role can edit PIN codes.</p>
            )}
          </form>

          {/* Combined Staff Registry Form */}
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left">
            <h4 className="text-sm font-black text-yellow-400 uppercase">👥 Staff Accounts Registry</h4>
            
            {!editingStaffId ? (
              <form onSubmit={handleAddStaffCombined} className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-3">
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider">➕ Add Staff Member / नया स्टाफ जोड़ें</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Name (e.g. Ramesh)" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none" required />
                  <input type="password" maxLength={6} placeholder="4-digit PIN (e.g. 1234)" value={newStaffPin} onChange={(e) => setNewStaffPin(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none text-center tracking-widest font-mono" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 uppercase">Staff Role / विभाग</label>
                  <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none cursor-pointer">
                    <option value="delivery">Rider / Delivery Boy 🛵</option>
                    <option value="kitchen">Cook / Kitchen Staff 👨‍🍳</option>
                    <option value="cashier">Cashier / Counter Manager 💼</option>
                    <option value="godown">Godown Helper / गोदाम यूज़र 📦</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-green-600 text-white p-2.5 rounded-lg font-black uppercase text-[10px]">Add Staff</button>
              </form>
            ) : (
              <form onSubmit={handleUpdateStaffCombined} className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-2xl space-y-3">
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider">✏️ Edit Staff / चेंज पिन</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={editingStaffName} onChange={(e) => setEditingStaffName(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none" required />
                  <input type="password" maxLength={6} value={editingStaffPin} onChange={(e) => setEditingStaffPin(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none text-center tracking-widest font-mono" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 uppercase">Staff Role</label>
                  <select value={editingStaffRole} onChange={(e) => setEditingStaffRole(e.target.value)} className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white outline-none cursor-pointer">
                    <option value="delivery">Rider / Delivery Boy 🛵</option>
                    <option value="kitchen">Cook / Kitchen Staff 👨‍🍳</option>
                    <option value="cashier">Cashier / Counter Manager 💼</option>
                    <option value="godown">Godown Helper / गोदाम यूज़र 📦</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-green-600 text-white p-2 rounded-lg text-[10px] font-black uppercase">Save</button>
                  <button type="button" onClick={() => setEditingStaffId(null)} className="bg-white/5 text-gray-400 p-2 rounded-lg text-[10px] font-black uppercase">Cancel</button>
                </div>
              </form>
            )}

            {/* Staff list */}
            <div className="space-y-2 pt-2">
              {unifiedStaffList.map((member) => {
                const isPinRevealed = revealPinId === member.id;
                return (
                  <div key={member.id} className="bg-[#111] p-3 rounded-2xl flex justify-between items-center border border-white/5 text-xs font-bold">
                    <div>
                      <p className="text-white font-black">{member.name}</p>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 inline-block ${
                        member.role === 'delivery' ? 'bg-blue-500/10 text-blue-400' : member.role === 'kitchen' ? 'bg-yellow-500/10 text-yellow-400' : member.role === 'godown' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {member.role === 'delivery' ? 'Rider 🛵' : member.role === 'kitchen' ? 'Kitchen 👨‍🍳' : member.role === 'godown' ? 'Godown 📦' : 'Cashier 💼'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-orange-400">PIN: {isPinRevealed ? member.pin : '••••'}</span>
                      <button onClick={() => setRevealPinId(isPinRevealed ? null : member.id)} className="p-2 bg-white/5 rounded text-gray-400">👁️</button>
                      <button onClick={() => {
                        setEditingStaffId(member.id);
                        setEditingStaffName(member.name);
                        setEditingStaffRole(member.role);
                        setEditingStaffPin(member.pin);
                      }} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">⚙️</button>
                      <button onClick={() => handleDeleteStaffCombined(member.id, member.role)} className="p-2 bg-red-500/10 text-red-500 rounded-lg">🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
           
          {/* Dine-In Table QR Generator */}
          <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] space-y-4 text-xs font-bold text-left">
            <div>
              <h4 className="text-sm font-black text-orange-500 uppercase">🍽️ Dine-In Table QR Generator</h4>
              <p className="text-[9px] text-gray-500 font-bold uppercase mt-1 leading-relaxed">ऑटोमैटिक टेबल आर्डर रूटिंग के लिए स्कैन क्यूआर कोड जनरेट करें:</p>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Table Number</label>
                <input type="number" min={1} value={genTableNum} onChange={(e) => setGenTableNum(e.target.value)} placeholder="e.g. 3" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" />
              </div>
              <button 
                onClick={() => {
                  if (!genTableNum) return toast.error("Please enter a table number!");
                  const url = `https://bb-cafe-app.vercel.app/?table=${genTableNum}`;
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`, '_blank');
                }}
                className="bg-orange-500 hover:bg-orange-600 text-black font-black text-xs py-3.5 px-6 rounded-xl uppercase tracking-wider transition-all"
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
