'use client';
import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW Registered successfully:', registration.scope);
          })
          .catch((err) => {
            console.error('SW Registration Failed:', err);
          });
      });
    }
  }, []);

  return null;
}
