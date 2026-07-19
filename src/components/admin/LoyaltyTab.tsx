'use client';
import React, { useState } from 'react';
import { db } from '../../lib/firebase'; // अपनी लोकेशन के अनुसार पाथ सेट करें
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { Gift, Trash, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface LoyaltyTabProps {
  loyaltyRules: any[];
  transferLogs: any[];
}

export default function LoyaltyTab({ loyaltyRules, transferLogs }: LoyaltyTabProps) {
  const [newRuleName, setNewRuleName] = useState("");
  const [newRulePoints, setNewRulePoints] = useState("");

  // नया लॉयल्टी रूल/इनाम जोड़ना
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName || !newRulePoints) return toast.error("Please fill all fields!");
    try {
      await addDoc(collection(db, "loyalty_rules"), {
        rewardName: newRuleName,
        pointsCost: Number(newRulePoints),
        timestamp: new Date()
      });
      setNewRuleName(""); 
      setNewRulePoints("");
      toast.success("New Rule Added!");
    } catch (err) {
      toast.error("Failed to add rule.");
    }
  };

  // पुराने रूल को डिलीट करना
  const handleDeleteRule = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      try {
        await deleteDoc(doc(db, "loyalty_rules", id));
        toast.success("Loyalty Rule Deleted!");
      } catch (err) {
        toast.error("Failed to delete rule.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* नया इनाम रूल जोड़ने का फ़ॉर्म */}
      <form onSubmit={handleAddRule} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
        <h3 className="text-lg font-black text-orange-500 italic uppercase flex items-center gap-2">
          <Gift size={18}/> Setup Loyalty Rules
        </h3>
        <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">
          नया इनाम (Reward) बनाएं जो ग्राहक चेकआउट के समय अपने पॉइंट्स का उपयोग करके मुफ़्त में क्लेम कर सकें:
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <input 
            type="text" 
            placeholder="Reward Name (उदा: Free Pizza)" 
            value={newRuleName} 
            onChange={(e) => setNewRuleName(e.target.value)} 
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none text-xs font-black text-white" 
            required 
          />
          <input 
            type="number" 
            placeholder="Points Needed" 
            value={newRulePoints} 
            onChange={(e) => setNewRulePoints(e.target.value)} 
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-black text-white" 
            required 
          />
        </div>
        <button type="submit" className="w-full bg-green-600 text-white p-4 rounded-xl font-black text-sm uppercase">
          Add Reward Rule
        </button>
      </form>

      {/* एक्टिव रूल्स की लिस्ट */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">
          Active Customer Reward Rules ({loyaltyRules.length})
        </p>
        {loyaltyRules.length === 0 ? (
          <p className="text-center text-xs font-bold text-gray-500 py-6">
            No custom rules configured yet...
          </p>
        ) : (
          loyaltyRules.map(rule => (
            <div key={rule.id} className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex justify-between items-center hover:bg-white/[0.04] transition-all">
              <div>
                <h4 className="font-black text-sm text-gray-200">{rule.rewardName}</h4>
                <p className="text-xs text-yellow-400 font-extrabold mt-0.5">Cost: {rule.pointsCost} Points</p>
              </div>
              <button onClick={() => handleDeleteRule(rule.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl transition-all">
                <Trash size={16}/>
              </button>
            </div>
          ))
        )}
      </div>

      {/* ग्राहक पॉइंट ट्रांसफर ऑडिट लॉग्स (Passbook Audit) */}
      <div className="bg-[#111] border border-white/5 p-6 rounded-[2.5rem] space-y-4">
        <h3 className="text-sm font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
          <RefreshCw size={14}/> 🔄 Points Transfer Logs ({transferLogs.length})
        </h3>
        <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
          ग्राहकों द्वारा एक-दूसरे को गिफ्ट किए गए पॉइंट्स का रीयल-टाइम ऑडिट ट्रेल:
        </p>
        
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {transferLogs.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-6">कोई ट्रांसफर लॉग उपलब्ध नहीं है।</p>
          ) : (
            transferLogs.map(log => (
              <div key={log.id} className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs font-sans">
                <div>
                  <p className="font-bold text-gray-300">
                    <span className="text-orange-400">{log.senderName || "Sender"}</span> (+{log.senderPhone})
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                    ➡️ Gifted to: <span className="text-yellow-500 font-extrabold">+{log.recipientPhone}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-orange-500/10 text-orange-500 font-black px-2.5 py-1 rounded-md text-[10px] inline-block font-sans">
                    {log.points} Pts 🎁
                  </span>
                  <p className="text-[8px] text-gray-500 mt-1 font-mono">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : "Just now"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
