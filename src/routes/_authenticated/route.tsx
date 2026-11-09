import { parsePortalSearch } from "@/lib/portal-links";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      if (location.pathname === "/tech") throw redirect({ to: "/tech-login" });
      if (location.pathname.startsWith("/admin")) {
        const inbox = new URLSearchParams(location.searchStr).get("inbox") === "1";
        throw redirect({ to: "/admin/login", search: inbox ? { inbox: 1 } : {} });
      }
      const search = parsePortalSearch(Object.fromEntries(new URLSearchParams(location.searchStr)));
      throw redirect({ to: "/login", search });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
