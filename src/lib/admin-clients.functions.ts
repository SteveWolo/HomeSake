import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const newClientSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  phone: z.string().max(40).optional().default(""),
  address: z.string().min(3).max(200),
  membershipTier: z.string().min(1).max(40),
  paymentStatus: z.enum(["Paid", "Missed Payment"]).default("Paid"),
  password: z.string().min(8).max(72),
});

/** Admin-only: create a member auth account + profile + first property. */
export const adminCreateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => newClientSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();

    // Block duplicates in both the profile table and Supabase Auth.
    const existingProfile = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    let taken = Boolean(existingProfile.data);
    if (!taken) {
      const listed = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      taken = (listed.data?.users ?? []).some((u) => (u.email ?? "").toLowerCase() === email);
    }
    if (taken) {
      throw new Error(
        "An account with this email already exists. Please log in to renew or upgrade your plan.",
      );
    }

    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Could not create that member.");
    }
    const userId = created.data.user.id;

    await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || null,
        membership_tier: data.membershipTier,
        payment_status: data.paymentStatus,
      });

    const property = await supabaseAdmin
      .from("properties")
      .insert({ owner_id: userId, address: data.address });
    if (property.error) throw new Error(property.error.message);

    return { userId };
  });

/** Admin-only: delete a member account and all of their data. */
export const adminDeleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Public membership sign-up lives in `membership.functions.ts`: the account is
 * only created after Stripe confirms the first subscription payment.
 */
