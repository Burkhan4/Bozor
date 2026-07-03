"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  Box,
  IconButton,
  Button,
  Stack,
  Avatar,
} from "@mui/material";
import {
  Close,
  Add,
  Remove,
  DeleteOutlined,
  ShoppingCartOutlined,
} from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  closeCart,
  removeFromCart,
  increaseQty,
  decreaseQty,
} from "@/store/cartSlice";
import { formatPrice as fmt } from "@/lib/format";

export default function CartDrawer() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { items, isOpen } = useAppSelector((s) => s.cart);
  const { user } = useAppSelector((s) => s.auth);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const sellerName = items[0]?.organization ?? null;

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => dispatch(closeCart())}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100vw", sm: 420 },
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderBottom: "1px solid #eee",
        }}
      >
        <Box component="span" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          Savatcha
        </Box>

        <IconButton
          onClick={() => dispatch(closeCart())}
          aria-label="Yopish"
        >
          <Close />
        </IconButton>
      </Box>

      {/* Items */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 2,
              color: "text.secondary",
            }}
          >
            <ShoppingCartOutlined sx={{ fontSize: 64, opacity: 0.25 }} />
            <Box component="p" sx={{ m: 0 }}>
              Savatchingiz bo&apos;sh
            </Box>
          </Box>
        ) : (
          <>
            {sellerName && (
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                }}
              >
                Sotuvchi: {sellerName}
              </Box>
            )}

            <Stack spacing={2}>
              {items.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    gap: 2,
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid #eee",
                    alignItems: "flex-start",
                  }}
                >
                  <Avatar
                    src={item.image}
                    variant="rounded"
                    sx={{
                      width: 68,
                      height: 68,
                      flexShrink: 0,
                      backgroundColor: "#fafafa",
                    }}
                    slotProps={{
                      img: {
                        onError: (
                          e: React.SyntheticEvent<HTMLImageElement>
                        ) => {
                          e.currentTarget.src =
                            "https://placehold.co/68x68/f3e8ff/7B2FBE?text=?";
                        },
                      },
                    }}
                  />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      component="p"
                      sx={{
                        m: 0,
                        mb: 0.5,
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.name}
                    </Box>

                    <Box
                      component="p"
                      sx={{
                        m: 0,
                        fontWeight: 700,
                        color: "#7B2FBE",
                        fontSize: "0.9rem",
                      }}
                    >
                      {fmt(item.price)}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mt: 1,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => dispatch(decreaseQty(item.id))}
                        sx={{
                          border: "1px solid #eee",
                          p: 0.25,
                        }}
                        aria-label="-"
                      >
                        <Remove sx={{ fontSize: 14 }} />
                      </IconButton>

                      <Box
                        component="span"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          minWidth: 20,
                          textAlign: "center",
                        }}
                      >
                        {item.quantity}
                      </Box>

                      <IconButton
                        size="small"
                        onClick={() => dispatch(increaseQty(item.id))}
                        sx={{
                          border: "1px solid #eee",
                          p: 0.25,
                        }}
                        aria-label="+"
                      >
                        <Add sx={{ fontSize: 14 }} />
                      </IconButton>

                      <Box sx={{ flex: 1 }} />

                      <IconButton
                        size="small"
                        onClick={() => dispatch(removeFromCart(item.id))}
                        sx={{ color: "error.main" }}
                        aria-label="O'chirish"
                      >
                        <DeleteOutlined sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </Box>

      {/* Footer */}
      {items.length > 0 && (
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid #eee",
            backgroundColor: "#fff",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box component="span" sx={{ color: "#666" }}>
              Jami:
            </Box>

            <Box
              component="span"
              sx={{
                fontWeight: 700,
                fontSize: "1.1rem",
                color: "#7B2FBE",
              }}
            >
              {fmt(total)}
            </Box>
          </Box>

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => {
              dispatch(closeCart());

              if (!user) {
                router.push("/login");
                return;
              }

              router.push("/checkout");
            }}
            sx={{
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 700,
              borderRadius: 2,
              background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)",
              "&:hover": {
                background: "linear-gradient(135deg,#5A1F8A,#7B2FBE)",
              },
            }}
          >
            Buyurtma berish
          </Button>
        </Box>
      )}
    </Drawer>
  );
}