import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      if (location.pathname.startsWith("/admin")) throw redirect({ to: "/admin/login" });
      const visit = new URLSearchParams(location.searchStr).get("visit");
      throw redirect({ to: "/login", search: visit ? { visit } : {} });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
