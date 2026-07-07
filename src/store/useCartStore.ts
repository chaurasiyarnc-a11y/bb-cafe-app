import { create } from 'zustand';

// Cart mein jo item hoga uski details
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

// Store ka structure (States and Actions)
interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  
  // Item add karne ka function
  addItem: (newItem) => set((state) => {
    const existingItem = state.items.find((item) => item.id === newItem.id);
    if (existingItem) {
      return {
        items: state.items.map((item) =>
          item.id === newItem.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      };
    }
    return { items: [...state.items, { ...newItem, quantity: 1 }] };
  }),

  // Item hatane ka function
  removeItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),

  // Cart saaf karne ka function
  clearCart: () => set({ items: [] }),
}));
