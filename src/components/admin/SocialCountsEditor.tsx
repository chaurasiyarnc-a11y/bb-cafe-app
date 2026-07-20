'use client';
import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase'; // यदि आवश्यक हो तो इसे '@/lib/firebase' से बदलें
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Globe, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SocialCounts {
  facebook: string;
  instagram: string;
  whatsapp_channel: string;
  snapchat: string;
  youtube: string;
}

export default function SocialCountsEditor() {
  const [counts, setSocialCounts] = useState<SocialCounts>({
    facebook: '',
    instagram: '',
    whatsapp_channel: '',
    snapchat: '',
    youtube: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Firestore से पुराना डेटा लोड करना
  useEffect(() => {
    const fetchSocialCounts = async () => {
      try {
        const docRef = doc(db, "settings", "social_counts");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSocialCounts(snap.data() as SocialCounts);
        }
      } catch (error) {
        toast.error("डेटा लोड करने में विफल!");
      } finally {
        setLoading(false);
      }
    };
    fetchSocialCounts();
  }, []);

  // नया डेटा डेटाबेस में सहेजना
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("बदलाव सहेजे जा रहे हैं...");
    try {
      const docRef = doc(db, "settings", "social_counts");
      await setDoc(docRef, counts, { merge: true });
      toast.dismiss(toastId);
      toast.success("सोशल काउंट सफलतापूर्वक अपडेट किया गया!");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("अपडेट करने में त्रुटि आई!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500 mr-2" size={20} />
        <span className="text-xs font-bold">डेटा लोड हो रहा है...</span>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm space-y-4 font-sans">
      <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <Globe className="text-orange-500" size={20} />
        <div className="text-left">
          <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Social Counts Editor</h3>
          <p className="text-[10px] text-neutral-500">होम पेज के सोशल मीडिया फॉलोअर्स की संख्या बदलें</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3.5 text-left">
        <div className="space-y-3">
          {(['facebook', 'instagram', 'whatsapp_channel', 'snapchat', 'youtube'] as const).map((platform) => {
            const label = platform === 'whatsapp_channel' ? 'WhatsApp Channel' : platform.charAt(0).toUpperCase() + platform.slice(1);
            return (
              <div key={platform} className="space-y-1">
                <label className="text-[10px] font-black uppercase text-neutral-600 dark:text-neutral-400">
                  {label} Followers Count
                </label>
                <input
                  type="text"
                  placeholder="उदा: 1.2K+ Followers"
                  value={counts[platform] || ''}
                  onChange={(e) => setSocialCounts(prev => ({ ...prev, [platform]: e.target.value }))}
                  className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 dark:text-white outline-none focus:border-orange-500 font-bold"
                  required
                />
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
          <span>अपडेट करें (Save Updates)</span>
        </button>
      </form>
    </div>
  );
}
