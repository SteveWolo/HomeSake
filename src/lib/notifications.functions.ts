/**
 * Client email notifications (Resend).
 *
 * Property updates are NEVER sent automatically — an admin triggers one
 * aggregated summary from the property overview screen.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await (context.supabase.rpc as (n: string, a: unknown) => Promise<{ data: boolean | null }>)(
    "has_role",
    { _user_id: context.userId, _role: "admin" },
  );
  if (!data) throw new Error("Forbidden");
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Aggregated property update summary, sent manually by an admin. */
export const sendPropertyUpdateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ propertyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, layout, sectionHtml, statHtml, siteUrl } = await import("@/lib/email.server");

    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("*")
      .eq("id", data.propertyId)
      .maybeSingle();
    if (!property) return { ok: false as const, error: "Property not found." };

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", property.owner_id)
      .maybeSingle();
    if (!owner?.email) return { ok: false as const, error: "This member has no email on file." };

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [activity, items, photos] = await Promise.all([
      supabaseAdmin
        .from("activity_items")
        .select("title, occurred_at")
        .eq("property_id", property.id)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("open_items")
        .select("title, priority, resolved")
        .eq("property_id", property.id)
        .eq("resolved", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("property_photos")
        .select("note, created_at")
        .eq("property_id", property.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const activityRows = activity.data ?? [];
    const itemRows = items.data ?? [];
    const photoRows = photos.data ?? [];

    const bodyHtml = [
      statHtml([
        ["Property", property.address],
        ["Home health score", `${property.health_score}/100`],
        [
          "Next visit",
          property.next_visit_at
            ? new Date(property.next_visit_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "Not scheduled",
        ],
        ["New photos (30 days)", String(photoRows.length)],
      ]),
      `<div style="height:18px"></div>`,
      sectionHtml(
        "Recent visit reports",
        activityRows.map(
          (a) => `${new Date(a.occurred_at).toLocaleDateString("en-US")} — ${a.title}`,
        ),
      ),
      sectionHtml(
        "Open recommendations",
        itemRows.map((i) => `${i.title} (${i.priority} priority)`),
      ),
      sectionHtml(
        "Contractor notes on new photos",
        photoRows.filter((p) => p.note).map((p) => String(p.note)),
      ),
    ].join("");

    await sendEmail({
      to: owner.email,
      subject: `Your Homesake property update — ${property.address}`,
      html: layout({
        title: "Your property update is ready",
        intro: `Hi ${owner.full_name || "there"}, here's a summary of the latest work, reports, and photos we've added for your home.`,
        bodyHtml,
        ctaLabel: "View Property Report",
        ctaHref: `${siteUrl()}/dashboard`,
      }),
    });

    return { ok: true as const, email: owner.email };
  });

/** Tells the Homesake team when a member moves a visit from their dashboard. */
export const sendRescheduleAdminEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        appointmentId: z.string().uuid(),
        previousAt: z.string(),
        newAt: z.string(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, layout, statHtml, siteUrl } = await import("@/lib/email.server");

    const { data: appointment } = await supabaseAdmin
      .from("appointments")
      .select("id, service, property_id")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appointment) return { ok: false as const, error: "Appointment not found." };

    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("id, address, owner_id")
      .eq("id", appointment.property_id)
      .maybeSingle();
    if (!property) return { ok: false as const, error: "Property not found." };
    // Only the property owner may announce their own reschedule.
    if (property.owner_id !== (context as { userId: string }).userId) {
      return { ok: false as const, error: "Forbidden" };
    }

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", property.owner_id)
      .maybeSingle();

    // Admin recipients: explicit override first, otherwise every admin on file.
    let recipients = (process.env["ADMIN_EMAIL"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!recipients.length) {
      const { data: admins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const ids = (admins ?? []).map((a) => a.user_id);
      if (ids.length) {
        const { data: adminProfiles } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .in("id", ids);
        recipients = (adminProfiles ?? [])
          .map((p) => p.email)
          .filter((e): e is string => Boolean(e));
      }
    }
    if (!recipients.length) return { ok: false as const, error: "No admin email on file." };

    const fmt = (iso: string) =>
      new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

    const html = layout({
      title: "A member rescheduled a visit",
      intro: `${owner?.full_name || owner?.email || "A member"} moved an upcoming service visit from their dashboard.`,
      bodyHtml: statHtml([
        ["Client", owner?.full_name || "—"],
        ["Client email", owner?.email || "—"],
        ["Property", property.address],
        ["Service", appointment.service],
        ["Previous time", fmt(data.previousAt)],
        ["New time", fmt(data.newAt)],
      ]),
      ctaLabel: "Open Admin Portal",
      ctaHref: `${siteUrl()}/admin`,
    });

    await Promise.all(
      recipients.map((to) =>
        sendEmail({ to, subject: `Visit rescheduled — ${property.address}`, html }),
      ),
    );

    return { ok: true as const, notified: recipients.length };
  });

/** Payment-due email for an admin-issued one-time invoice. */
export const sendInvoiceDueEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEmail, layout, statHtml, siteUrl } = await import("@/lib/email.server");

    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!invoice) return { ok: false as const, error: "Invoice not found." };

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", invoice.owner_id)
      .maybeSingle();
    if (!owner?.email) return { ok: false as const, error: "This member has no email on file." };

    await sendEmail({
      to: owner.email,
      subject: `Payment due — ${invoice.description}`,
      html: layout({
        title: "A new invoice is ready",
        intro: `Hi ${owner.full_name || "there"}, your estate manager has issued an invoice for recent work on your home.`,
        bodyHtml: statHtml([
          ["Invoice", invoice.description],
          ["Amount", money(invoice.amount_cents)],
          [
            "Due date",
            invoice.due_date
              ? new Date(`${invoice.due_date}T00:00:00`).toLocaleDateString("en-US")
              : "Upon receipt",
          ],
        ]),
        ctaLabel: "Pay Invoice Now",
        ctaHref: `${siteUrl()}/pay/${invoice.id}`,
      }),
    });

    return { ok: true as const, email: owner.email };
  });
