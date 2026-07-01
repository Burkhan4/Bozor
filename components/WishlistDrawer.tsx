"use client";

import { Drawer, Box, IconButton, Button, Stack, Avatar } from "@mui/material";
import { Close, DeleteOutlined, FavoriteBorder, ShoppingCart } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeWishlist, removeFromWishlist } from "@/store/wishlistSlice";
import { addToCart } from "@/store/cartSlice";
import { formatPrice as fmt } from "@/lib/format";

export default function WishlistDrawer() {
  const dispatch = useAppDispatch();
  const { items, isOpen } = useAppSelector((s) => s.wishlist);

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => dispatch(closeWishlist())}
      slotProps={{ paper: { sx: { width: { xs: "100vw", sm: 420 }, display: "flex", flexDirection: "column" } } }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, borderBottom: "1px solid #eee" }}>
        <Box component="span" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>Sevimlilar</Box>
        <IconButton onClick={() => dispatch(closeWishlist())} aria-label="Yopish"><Close /></IconButton>
      </Box>

      {/* Items */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {items.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 2, color: "text.secondary" }}>
            <FavoriteBorder sx={{ fontSize: 64, opacity: 0.25 }} />
            <Box component="p" sx={{ m: 0 }}>Sevimlilar ro'yxati bo'sh</Box>
          </Box>
        ) : (
          <Stack spacing={2}>
            {items.map((item) => (
              <Box key={item.id} sx={{ display: "flex", gap: 2, p: 1.5, borderRadius: 2, border: "1px solid #eee", alignItems: "flex-start" }}>
                <Avatar
                  src={item.image}
                  variant="rounded"
                  sx={{ width: 68, height: 68, flexShrink: 0, backgroundColor: "#fafafa" }}
                  slotProps={{
                    img: {
                      onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
                        e.currentTarget.src = "https://placehold.co/68x68/f3e8ff/7B2FBE?text=?";
                      },
                    },
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box component="p" sx={{ m: 0, mb: 0.5, fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {item.name}
                  </Box>
                  <Box component="p" sx={{ m: 0, fontWeight: 700, color: "#7B2FBE", fontSize: "0.9rem" }}>
                    {fmt(item.price)}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Button
                      size="small" variant="outlined"
                      startIcon={<ShoppingCart sx={{ fontSize: 14 }} />}
                      onClick={() => dispatch(addToCart(item))}
                      sx={{ fontSize: "0.75rem", py: 0.5 }}
                    >
                      Savatga
                    </Button>
                    <IconButton size="small" onClick={() => dispatch(removeFromWishlist(item.id))} sx={{ color: "error.main" }} aria-label="O'chirish">
                      <DeleteOutlined sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
