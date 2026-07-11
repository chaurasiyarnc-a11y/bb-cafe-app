import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item: any) => set((state: any) => {
        const existing = state.items.find((i: any) => i.id === item.id);
        if (existing) {
          return {
            items: state.items.map((i: any) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          };
        }
        return { items: [...state.items, { ...item, quantity: 1 }] };
      }),
      removeItem: (id: string) => set((state: any) => {
        const existing = state.items.find((i: any) => i.id === id);
        if (existing && existing.quantity > 1) {
          return {
            items: state.items.map((i: any) =>
              i.id === id ? { ...i, quantity: i.quantity - 1 } : i
            ),
          };
        }
        return { items: state.items.filter((i: any) => i.id !== id) };
      }),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'bb-cafe-cart-storage', // local storage key
    }
  )
);
