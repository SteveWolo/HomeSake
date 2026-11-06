import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Reads the Stripe publishable key from the server environment.
 * Netlify may only expose it as VITE_STRIPE_PUBLISHABLE_KEY, so both spellings
 * are accepted. The client prefers its own build-time `import.meta.env` value
 * and falls back to this function at runtime.
 */
export const getStripeConfig = createServerFn({ method: "GET" }).handler(async () => {
  const publishableKey =
    process.env["VITE_STRIPE_PUBLISHABLE_KEY"] ?? process.env["STRIPE_PUBLISHABLE_KEY"] ?? "";
  const configured = Boolean(process.env["STRIPE_SECRET_KEY"]) && Boolean(publishableKey);
  return { configured, publishableKey };
});

type StripeIntent = {
  id?: string;
  client_secret?: string;
  status?: string;
  error?: { message?: string };
};

async function stripeRequest(path: string, body?: URLSearchParams) {
  const secret = process.env["STRIPE_SECRET_KEY"];
  if (!secret) throw new Error("Stripe is not configured yet (missing STRIPE_SECRET_KEY).");

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    ...(body ? { body } : {}),
  });
  const json = (await res.json()) as StripeIntent;
  if (!res.ok) throw new Error(json.error?.message ?? "Stripe request failed.");
  return json;
}

/**
 * Creates (or reuses) a Stripe PaymentIntent for a specific invoice so the
 * client can pay it with real card fields through Stripe Elements.
 */
export const createInvoicePaymentIntent = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invoice, error } = await supabaseAdmin
      .from("invoices")
      .select("id, amount_cents, description, status, stripe_payment_intent_id, owner_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "Paid") return { alreadyPaid: true as const };
    if (invoice.amount_cents <= 0) throw new Error("This invoice has no amount to pay.");

    if (invoice.stripe_payment_intent_id) {
      const existing = await stripeRequest(`payment_intents/${invoice.stripe_payment_intent_id}`);
      if (existing.client_secret && existing.status !== "succeeded") {
        return {
          alreadyPaid: false as const,
          clientSecret: existing.client_secret,
          amountCents: invoice.amount_cents,
        };
      }
    }

    const body = new URLSearchParams({
      amount: String(invoice.amount_cents),
      currency: "usd",
      description: invoice.description,
      "payment_method_types[0]": "card",
      "metadata[invoice_id]": invoice.id,
      "metadata[owner_id]": invoice.owner_id,
    });
    const intent = await stripeRequest("payment_intents", body);
    if (!intent.client_secret || !intent.id) throw new Error("Could not start the payment.");

    await supabaseAdmin
      .from("invoices")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", invoice.id);

    return {
      alreadyPaid: false as const,
      clientSecret: intent.client_secret,
      amountCents: invoice.amount_cents,
    };
  });

/**
 * Fallback confirmation path: the browser reports a succeeded PaymentIntent and
 * the server verifies it directly with Stripe before marking the invoice paid.
 * The webhook remains the source of truth for asynchronous outcomes.
 */
export const confirmInvoicePayment = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("id, owner_id, kind, period, stripe_payment_intent_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!invoice?.stripe_payment_intent_id) throw new Error("No payment to confirm.");

    const intent = await stripeRequest(`payment_intents/${invoice.stripe_payment_intent_id}`);
    if (intent.status !== "succeeded") return { paid: false as const };

    await supabaseAdmin
      .from("invoices")
      .update({ status: "Paid", paid_at: new Date().toISOString() })
      .eq("id", invoice.id);

    // A paid membership invoice restores portal access for a full period.
    if ((invoice.kind ?? "Membership") === "Membership") {
      const months = invoice.period === "Annual" ? 12 : 1;
      const end = new Date();
      end.setMonth(end.getMonth() + months);
      await supabaseAdmin
        .from("profiles")
        .update({
          payment_status: "Paid",
          subscription_status: "active",
          cancellation_requested: false,
          current_period_end: end.toISOString(),
        })
        .eq("id", invoice.owner_id);
    } else {
      await supabaseAdmin
        .from("profiles")
        .update({ payment_status: "Paid" })
        .eq("id", invoice.owner_id);
    }
    return { paid: true as const };
  });

/** Public, minimal invoice details for the branded /pay/:invoiceId page. */
export const getPayableInvoice = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ invoiceId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("id, description, amount_cents, status, due_date, kind, period, owner_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (!invoice) return { found: false as const };

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", invoice.owner_id)
      .maybeSingle();

    return {
      found: true as const,
      invoice: {
        id: invoice.id,
        description: invoice.description,
        amountCents: invoice.amount_cents,
        status: invoice.status,
        dueDate: invoice.due_date,
        kind: invoice.kind ?? "Membership",
        period: invoice.period,
        ownerName: owner?.full_name ?? null,
      },
    };
  });

