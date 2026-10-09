'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // cafe_users कलेक्शन में पिन चेक करें
      const q = query(collection(db, "cafe_users"), where("pin", "==", pin));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0].data();
        const role = userDoc.role; // 'admin' या 'cashier'

        // सेशन में जानकारी सेव करें
        sessionStorage.setItem('user_role', role);
        sessionStorage.setItem('user_name', userDoc.name);
        
        toast.success(`Welcome ${userDoc.name}!`);

        // रोल के हिसाब से नेविगेशन
        if (role === 'admin') {
          router.push('/admin'); // Admin Dashboard का पाथ
        } else {
          router.push('/pos');   // POS Billing का पाथ
        }
      } else {
        toast.error("Invalid PIN!");
      }
    } catch (error) {
      toast.error("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-2xl font-black mb-6">Bum Bum Cafe Login</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input 
          type="password" 
          value={pin} 
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          className="p-4 rounded-xl text-black text-center text-xl font-bold"
          maxLength={6}
          autoFocus
        />
        <button type="submit" disabled={loading} className="w-full bg-orange-600 p-4 rounded-xl font-bold">
          {loading ? "Verifying..." : "Login"}
        </button>
      </form>
    </div>
  );
}
