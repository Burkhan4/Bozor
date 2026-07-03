"use client";

import { useState, useTransition, useRef, useLayoutEffect, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  AppBar, Toolbar, IconButton, Badge,
  Drawer, List, ListItem, ListItemButton, ListItemText,
  Divider, Button, Avatar, Menu, MenuItem,
} from "@mui/material";
import {
  ShoppingCart, FavoriteBorder,
  Menu as MenuIcon, Close as CloseIcon,
  StorefrontOutlined, Person,
} from "@mui/icons-material";
import { Category, supabase } from "@/lib/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleCart } from "@/store/cartSlice";
import { toggleWishlistDrawer } from "@/store/wishlistSlice";
import { logout } from "@/store/authSlice";
import SearchBar from "@/components/SearchBar";

export default function NavbarClient({ categories }: { categories: Category[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isPending, startTransition] = useTransition();
  const navRef = useRef<HTMLDivElement | null>(null);
  const [navHeight, setNavHeight] = useState(0);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const h = navRef.current?.getBoundingClientRect().height || 0;
      setNavHeight(Math.ceil(h));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isPending) setPendingPath(null);
  }, [isPending]);

  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const cartCount = useAppSelector((s) => s.cart.items.reduce((n, i) => n + i.quantity, 0));
  const wishlistCount = useAppSelector((s) => s.wishlist.items.length);
  const { user } = useAppSelector((s) => s.auth);

  const navigateTo = (path: string) => {
    setMobileOpen(false);
    setPendingPath(path);
    startTransition(() => {
      router.push(path);
    });
  };
  const goTo = navigateTo;

  const handleLogout = async () => {
    setAnchorEl(null);
    await supabase.auth.signOut();
    dispatch(logout());
    router.push("/");
  };

  const displayName = user?.full_name?.trim() || user?.email?.split("@")[0] || "";

  const roleLink = user?.role === "salesman"
    ? { id: -1, name: "Sotuvchi paneli", path: "/sales" }
    : user?.role === "admin"
    ? { id: -2, name: "Admin panel", path: "/admin" }
    : null;

  const allItems = [
    { id: 0, name: "Barchasi", path: "/" },
    ...categories.map((c) => ({ id: c.id, name: c.name, path: `/category/${c.id}` })),
    ...(roleLink ? [roleLink] : []),
  ];

  const Icons = () => (
    <>
      <IconButton onClick={() => dispatch(toggleWishlistDrawer())} sx={{ color: "#444" }} aria-label="Sevimlilar">
        <Badge badgeContent={wishlistCount} color="error"><FavoriteBorder /></Badge>
      </IconButton>
      <IconButton onClick={() => dispatch(toggleCart())} sx={{ color: "#444" }} aria-label="Savatcha">
        <Badge badgeContent={cartCount} color="error"><ShoppingCart /></Badge>
      </IconButton>
    </>
  );

  return (
    <>
      {/* ═══ LOADING OVERLAY ═══ */}
      {isPending && (
        <div style={{
          position: "fixed",
          top: navHeight,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "4px solid #f3e8ff",
            borderTop: "4px solid #7B2FBE",
            animation: "spin 0.8s linear infinite",
          }} />
          <span style={{
            color: "#7B2FBE",
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: 0.5,
          }}>Yuklanmoqda...</span>
        </div>
      )}
      {/* ═══ DESKTOP ═══ */}
      <div ref={navRef} className="desktop-nav">

        {/* Top row */}
        <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #eee" }}>
          <div className="nav-container" style={{ display: "flex", alignItems: "center", gap: 20, height: 68 }}>

            {/* Logo */}
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <StorefrontOutlined style={{ color: "#7B2FBE", fontSize: 30 }} />
              <span style={{ fontWeight: 900, fontSize: "1.35rem", color: "#7B2FBE", letterSpacing: -0.5 }}>
                Bozor
              </span>
            </Link>

            {/* Search — takes remaining space */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <SearchBar />
            </div>

            {/* Right icons + auth */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <Icons />
              {user ? (
                <>
                  <Button
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    startIcon={
                      <Avatar sx={{ width: 28, height: 28, backgroundColor: "#7B2FBE", fontSize: "0.8rem" }}>
                        {displayName[0]?.toUpperCase() || "U"}
                      </Avatar>
                    }
                    sx={{ color: "#333", fontWeight: 600, fontSize: "0.875rem", textTransform: "none", ml: 0.5, borderRadius: 2, px: 1.5 }}
                  >
                    {displayName.length > 16 ? displayName.slice(0, 16) + "…" : displayName}
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    slotProps={{ paper: { sx: { borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", mt: 1, minWidth: 160 } } }}
                  >
                    <MenuItem onClick={() => { setAnchorEl(null); router.push("/profile"); }} sx={{ fontSize: "0.9rem" }}>Profil</MenuItem>
                    <MenuItem onClick={() => { setAnchorEl(null); router.push("/orders"); }} sx={{ fontSize: "0.9rem" }}>Buyurtmalarim</MenuItem>
                    <Divider />
                    <MenuItem onClick={handleLogout} sx={{ fontSize: "0.9rem", color: "error.main" }}>Chiqish</MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<Person />}
                  onClick={() => router.push("/login")}
                  sx={{ ml: 0.5, borderRadius: 2, borderColor: "#7B2FBE", color: "#7B2FBE", fontWeight: 600, fontSize: "0.875rem", px: 2, "&:hover": { backgroundColor: "#f3e8ff", borderColor: "#5A1F8A" } }}
                >
                  Kirish
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Categories row */}
        <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #eee", position: "sticky", top: 0, zIndex: 1100, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div className="nav-container" style={{ display: "flex", alignItems: "center", overflowX: "auto" }}>
            {allItems.map((item) => {
              const currentPath = (isPending && pendingPath) ? pendingPath : pathname;
              const active = item.id === 0 ? currentPath === "/" : currentPath === item.path;
              return (
                <Button
                  key={item.id}
                  onClick={() => navigateTo(item.path)}
                  sx={{
                    flexShrink: 0, px: 2, py: 0.75, my: 0.5, borderRadius: 2,
                    fontSize: "0.875rem", fontWeight: active ? 700 : 500,
                    color: active ? "#7B2FBE" : "#555",
                    backgroundColor: active ? "#f3e8ff" : "transparent",
                    whiteSpace: "nowrap", minWidth: "unset",
                    "&:hover": { backgroundColor: "#f3e8ff", color: "#7B2FBE" },
                  }}
                >
                  {item.name}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ MOBILE APPBAR ═══ */}
      <AppBar
        position="sticky"
        sx={{
          display: { md: "none" },
          backgroundColor: "#fff",
          color: "text.primary",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 1100,
        }}
      >
        <div style={{ padding: "0 12px", display: "flex", alignItems: "center", gap: 8, height: 56 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <StorefrontOutlined style={{ color: "#7B2FBE", fontSize: 24 }} />
            <span style={{ fontWeight: 800, color: "#7B2FBE", fontSize: "1rem" }}>Bozor</span>
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar />
          </div>

          <IconButton onClick={() => dispatch(toggleWishlistDrawer())} sx={{ color: "#444", p: 0.75 }} aria-label="Sevimlilar">
            <Badge badgeContent={wishlistCount} color="error"><FavoriteBorder fontSize="small" /></Badge>
          </IconButton>
          <IconButton onClick={() => dispatch(toggleCart())} sx={{ color: "#444", p: 0.75 }} aria-label="Savatcha">
            <Badge badgeContent={cartCount} color="error"><ShoppingCart fontSize="small" /></Badge>
          </IconButton>
          <IconButton onClick={() => setMobileOpen(true)} sx={{ color: "#444", p: 0.75 }} aria-label="Menyu">
            <MenuIcon />
          </IconButton>
        </div>
      </AppBar>

      {/* ═══ MOBILE DRAWER ═══ */}
      <Drawer anchor="left" open={mobileOpen} onClose={() => setMobileOpen(false)} slotProps={{ paper: { sx: { width: 280 } } }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
          <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#7B2FBE" }}>Menyu</span>
          <IconButton onClick={() => setMobileOpen(false)} size="small"><CloseIcon /></IconButton>
        </div>
        <Divider />

        {/* Auth */}
        {user ? (
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar sx={{ width: 38, height: 38, backgroundColor: "#7B2FBE", fontSize: "0.9rem" }}>
              {displayName[0]?.toUpperCase() || "U"}
            </Avatar>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a1a1a" }}>{displayName}</div>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>{user.email}</div>
            </div>
          </div>
        ) : (
          <div style={{ padding: "12px 16px" }}>
            <button
              onClick={() => goTo("/login")}
              style={{ width: "100%", padding: "10px 16px", background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}
            >
              Kirish
            </button>
          </div>
        )}
        <Divider />

        <List dense>
          <ListItem disablePadding>
            <ListItemButton selected={pathname === "/"} onClick={() => navigateTo("/")}>
              <ListItemText primary="Barcha mahsulotlar" slotProps={{ primary: { sx: { fontWeight: 600, fontSize: "0.9rem" } } }} />
            </ListItemButton>
          </ListItem>
          {categories.map((cat) => (
            <ListItem key={cat.id} disablePadding>
              <ListItemButton selected={pathname === `/category/${cat.id}`} onClick={() => navigateTo(`/category/${cat.id}`)}>
                <ListItemText primary={cat.name} slotProps={{ primary: { sx: { fontSize: "0.875rem" } } }} />
              </ListItemButton>
            </ListItem>
          ))}
          {roleLink && (
            <ListItem disablePadding>
              <ListItemButton selected={pathname === roleLink.path} onClick={() => navigateTo(roleLink.path)}>
                <ListItemText primary={roleLink.name} slotProps={{ primary: { sx: { fontSize: "0.875rem", fontWeight: 600 } } }} />
              </ListItemButton>
            </ListItem>
          )}
            
        </List>
      </Drawer>
    </>
  );
}
