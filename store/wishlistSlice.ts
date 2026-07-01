import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Product } from "@/lib/supabase";

interface WishlistState {
  items: Product[];
  isOpen: boolean;
}

const initialState: WishlistState = {
  items: [],
  isOpen: false,
};

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    toggleWishlist(state, action: PayloadAction<Product>) {
      const exists = state.items.find((i) => i.id === action.payload.id);
      if (exists) {
        state.items = state.items.filter((i) => i.id !== action.payload.id);
      } else {
        state.items.push(action.payload);
      }
    },
    removeFromWishlist(state, action: PayloadAction<number>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
    openWishlist(state) {
      state.isOpen = true;
    },
    closeWishlist(state) {
      state.isOpen = false;
    },
    toggleWishlistDrawer(state) {
      state.isOpen = !state.isOpen;
    },
  },
});

export const {
  toggleWishlist,
  removeFromWishlist,
  openWishlist,
  closeWishlist,
  toggleWishlistDrawer,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
