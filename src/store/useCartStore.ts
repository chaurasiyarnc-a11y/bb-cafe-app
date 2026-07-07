import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  cart: [],
  addToCart: (product: any, variant: any = null, addOns: any[] = []) => {
    const cart = get().cart;
    // यूनिक आईडी बनाना (ID + Size)
    const cartId = variant ? `${product.id}-${variant.size}` : product.id;
    
    const existing = cart.find((i: any) => i.cartId === cartId);
    if (existing) {
      set({ cart: cart.map((i: any) => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i) });
    } else {
      const price = variant ? variant.price : product.price;
      const addOnPrice = addOns.reduce((acc, curr) => acc + curr.price, 0);
      set({ cart: [...cart, { ...product, cartId, variant, addOns, price: price + addOnPrice, qty: 1 }] });
    }
  },
  removeFromCart: (cartId: string) => {
    set({ cart: get().cart.map((i: any) => i.cartId === cartId ? { ...i, qty: i.qty - 1 } : i).filter((i: any) => i.qty > 0) });
  },
  clearCart: () => set({ cart: [] }),
  totalAmount: () => get().cart.reduce((acc: number, i: any) => acc + (i.price * i.qty), 0),
}));
