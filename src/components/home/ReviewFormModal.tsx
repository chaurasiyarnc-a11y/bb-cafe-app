'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';

interface ReviewFormModalProps {
  isHindi: boolean;
  isReviewFormOpen: boolean;
  setIsReviewFormOpen: (open: boolean) => void;
  reviewName: string;
  setReviewName: (name: string) => void;
  reviewComment: string;
  setReviewComment: (comment: string) => void;
  reviewRating: number;
  setReviewRating: (rating: number) => void;
  SUGGESTED_REVIEWS: string[];
  handleReviewSubmit: (e: React.FormEvent) => void;
  triggerHaptic: (ms?: number) => void;
}

export default function ReviewFormModal({
  isHindi, isReviewFormOpen, setIsReviewFormOpen, reviewName, setReviewName,
  reviewComment, setReviewComment, reviewRating, setReviewRating,
  SUGGESTED_REVIEWS, handleReviewSubmit, triggerHaptic
}: ReviewFormModalProps) {
  if (!isReviewFormOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-6 font-sans">
        <form onSubmit={handleReviewSubmit} className="dark:bg-[#111] bg-white w-full max-w-md p-6 rounded-3xl border dark:border-white/10 border-neutral-200 text-center space-y-4 shadow-xl transition-colors duration-200 font-sans font-bold">
          <div className="flex justify-between items-center pb-2 border-b dark:border-white/10 border-neutral-200">
            <h3 className="text-xl font-black text-orange-500 uppercase italic">{isHindi ? "आपकी समीक्षा" : "Your Feedback"}</h3>
            <button 
              type="button" 
              onClick={() => { triggerHaptic(15); setIsReviewFormOpen(false); }} 
              className="p-2 bg-red-100 hover:bg-red-500 hover:text-white text-red-600 rounded-full transition-all duration-200 shadow"
              title="Close Feedback"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-3 text-left">
            <div>
              <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400">{isHindi ? "आपका नाम" : "Your Name"}</label>
              <input autoComplete="name" type="text" placeholder={isHindi ? "अपना नाम दर्ज करें..." : "Enter your name..."} value={reviewName} onChange={(e) => setReviewName(e.target.value)} required className="w-full dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-lg text-xs text-neutral-900 dark:text-white focus:border-orange-500 outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400">{isHindi ? "रेटिंग" : "Rating"}</label>
              <div className="flex gap-1 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={20} 
                    style={{ color: '#fbbf24', fill: reviewRating >= star ? '#fbbf24' : 'none' }} 
                    onClick={() => setReviewRating(star)} 
                    className="cursor-pointer" 
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400">{isHindi ? "पसंदीदा समीक्षा टच करें:" : "Quick Suggestions:"}</label>
              <div className="flex flex-wrap gap-1.5 py-1">
                {SUGGESTED_REVIEWS.map((suggestion: string) => (
                  <button
                    type="button"
                    key={suggestion}
                    onClick={() => setReviewComment(suggestion)}
                    className="dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 hover:border-orange-500/50 px-2 py-1 rounded-full text-[9px] text-neutral-800 dark:text-gray-300 font-bold transition-all text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-neutral-700 dark:text-neutral-400">{isHindi ? "समीक्षा टिप्पणी" : "Comments"}</label>
              <textarea placeholder={isHindi ? "खाना कैसा लगा?..." : "How was the food?..."} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required rows={3} className="w-full dark:bg-white/5 bg-neutral-50 border dark:border-white/10 border-neutral-300 p-3 rounded-lg text-xs text-neutral-900 dark:text-white focus:border-orange-500 outline-none resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-orange-500 text-black font-black p-3 rounded-lg text-xs uppercase">{isHindi ? "जमा करें" : "SUBMIT"}</button>
            <button type="button" onClick={() => { triggerHaptic(15); setIsReviewFormOpen(false); }} className="dark:bg-white/5 bg-neutral-100 text-neutral-800 dark:text-gray-400 font-bold p-3 rounded-lg text-xs uppercase">{isHindi ? "बंद करें" : "CANCEL"}</button>
          </div>
        </form>
      </div>
    </AnimatePresence>
  );
}
