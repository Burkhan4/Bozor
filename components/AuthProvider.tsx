"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/authSlice";
import type { User } from "@supabase/supabase-js";

async function buildUser(authUser: User) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", authUser.id)   // UUID bo'yicha izlash
    .single();

  const meta = authUser.user_metadata;

  return {
    id: authUser.id,                                    // UUID
    email: authUser.email ?? "",
    full_name: (profile?.full_name as string) || meta?.full_name || meta?.name || "",
    phone: (profile?.phone as string) || "",
    role: (profile?.role as "user" | "salesman" | "admin") || "user",
  };
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const user = await buildUser(session.user);
        dispatch(setUser(user));
      } else {
        dispatch(setUser(null));
      }
    });

    // Listen for auth changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const user = await buildUser(session.user);
          dispatch(setUser(user));
        } else {
          dispatch(setUser(null));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <>{children}</>;
}
