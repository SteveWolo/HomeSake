import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "technician" | "client";

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
};

async function fetchRole(userId: string): Promise<AppRole> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: true });
  const roles = (data ?? []).map((r) => r.role as AppRole);
  if (roles.includes("admin")) return "admin";
  const { data: tech } = await supabase.from("technicians").select("user_id").eq("user_id", userId).maybeSingle();
  return tech ? "technician" : "client";
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    user: null,
    role: null,
  });

  useEffect(() => {
    let active = true;

    const resolve = async (session: Session | null) => {
      if (!session?.user) {
        if (active) setState({ loading: false, session: null, user: null, role: null });
        return;
      }
      const role = await fetchRole(session.user.id);
      if (active) setState({ loading: false, session, user: session.user, role });
    };

    supabase.auth.getSession().then(({ data }) => resolve(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED") return;
      void resolve(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function resolveRole(userId: string): Promise<AppRole> {
  return fetchRole(userId);
}
