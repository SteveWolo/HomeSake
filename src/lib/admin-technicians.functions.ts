import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminCreateTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    password: z.string().min(12).max(72),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (error || !admin) throw new Error("Only an admin can create technician accounts.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(), password: data.password, email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (created.error) throw new Error(created.error.message);
    const id = created.data.user.id;
    const marker = await supabaseAdmin.from("technicians").insert({ user_id: id, name: data.name });
    if (marker.error) {
      const cleanup = await supabaseAdmin.auth.admin.deleteUser(id);
      if (cleanup.error) throw new Error("Account setup was incomplete. Check the account before retrying.");
      throw new Error(marker.error.message);
    }
    return { userId: id };
  });
