/**
 * Membership sign-up + recurring billing.
 *
 * Flow (single page, payment first):
 *  1. `startMembershipSubscription` creates a Stripe customer and a real
 *     recurring subscription in `default_incomplete` state, returning the
 *     PaymentIntent client secret for the first invoice.
 *  2. The browser confirms the card with Stripe Elements.
 *  3. `finalizeMembership` re-checks the subscription with Stripe and ONLY THEN
 *     creates the auth account, profile, property, and paid invoice.
 *
 * No portal account exists before Stripe confirms the payment.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().min(3).max(200),
  membershipTier: z.string().trim().min(1).max(40),
  period: z.enum(["Monthly", "Annual"]),
  monthlyPrice: z.number().min(0.1).max(100000),
});

/** Per-month price -> the amount actually billed per interval (annual = 12x). */
function intervalAmount(monthlyPrice: number, period: "Monthly" | "Annual") {
  return period === "Annual"
    ? Math.round(monthlyPrice * 12 * 100)
    : Math.round(monthlyPrice * 100);
}

type StripeApi = (typeof import("@/lib/stripe.server"))["stripeApi"];

/**
 * Returns the client secret for a subscription's first invoice.
 *
 * Newer Stripe API versions no longer expand `latest_invoice.payment_intent`
 * and expose `confirmation_secret` instead, so all shapes are handled.
 */
async function resolveInvoiceClientSecret(
  stripeApi: StripeApi,
  invoice: Record<string, unknown> | undefined,
): Promise<string | undefined> {
  if (!invoice) return undefined;

  const intent = invoice["payment_intent"];
  if (intent && typeof intent === "object") {
    const secret = (intent as Record<string, unknown>)["client_secret"];
    if (typeof secret === "string") return secret;
  }
  if (typeof intent === "string") {
    const fetched = await stripeApi(`payment_intents/${intent}`);
    if (typeof fetched.client_secret === "string") return fetched.client_secret;
  }

  const invoiceId = invoice["id"];
  if (typeof invoiceId !== "string") return undefined;
  const full = await stripeApi(
    `invoices/${invoiceId}`,
    { "expand[0]": "confirmation_secret" },
    { method: "GET" },
  );
  const confirmation = full["confirmation_secret"] as Record<string, unknown> | undefined;
  const secret = confirmation?.["client_secret"];
  return typeof secret === "string" ? secret : undefined;
}



export const startMembershipSubscription = createServerFn({ method: "POST" })
  .inputValidator((input) => signupSchema.parse(input))
  .handler(async ({ data }) => {
    const { stripeApi } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();

    // Reject emails that already have an account before taking money.
    const existing = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let taken = Boolean(existing.data);
    if (!taken) {
      // Also check Supabase Auth directly — an auth user can exist without a profile row.
      const listed = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      taken = (listed.data?.users ?? []).some((u) => (u.email ?? "").toLowerCase() === email);
    }

    if (taken) {
      return {
        ok: false as const,
        error:
          "An account with this email already exists. Please log in to renew or upgrade your plan.",
      };
    }


    const amount = intervalAmount(data.monthlyPrice, data.period);

    try {
      const customer = await stripeApi("customers", {
        email,
        name: data.fullName,
        phone: data.phone || undefined,
        metadata: { tier: data.membershipTier, address: data.address },
      });

      // Stripe does not accept price_data[product_data] on subscription items,
      // so the product is created explicitly first.
      const product = await stripeApi("products", {
        name: `${data.membershipTier} membership (${data.period})`,
      });

      const subscription = await stripeApi("subscriptions", {
        customer: customer.id,
        items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              recurring: { interval: data.period === "Annual" ? "year" : "month" },
              product: product.id,
            },
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
          payment_method_types: ["card"],
        },
        expand: ["latest_invoice.payment_intent"],
        metadata: { tier: data.membershipTier, period: data.period, email },
      });

      const invoice = subscription["latest_invoice"] as Record<string, unknown> | undefined;
      const clientSecret = await resolveInvoiceClientSecret(stripeApi, invoice);
      if (!clientSecret || !subscription.id) {
        return { ok: false as const, error: "Could not start the payment. Please try again." };
      }


      return {
        ok: true as const,
        clientSecret,
        subscriptionId: subscription.id,
        customerId: String(customer.id),
        amountCents: amount,
      };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Stripe could not start the subscription.",
      };
    }
  });

const finalizeSchema = signupSchema.extend({
  subscriptionId: z.string().min(3).max(120),
  customerId: z.string().min(3).max(120),
  password: z.string().min(8).max(72),
});

export const finalizeMembership = createServerFn({ method: "POST" })
  .inputValidator((input) => finalizeSchema.parse(input))
  .handler(async ({ data }) => {
    const { stripeApi } = await import("@/lib/stripe.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify with Stripe that the money actually cleared.
    const subscription = await stripeApi(`subscriptions/${data.subscriptionId}`, {
      expand: ["latest_invoice"],
    });
    const invoice = subscription["latest_invoice"] as Record<string, unknown> | undefined;
    const paid = invoice?.["status"] === "paid" || invoice?.["paid"] === true;
    const active = subscription.status === "active" || subscription.status === "trialing";
    if (!paid && !active) {
      return { ok: false as const, error: "Payment is not confirmed yet." };
    }

    const email = data.email.toLowerCase();
    const amount = intervalAmount(data.monthlyPrice, data.period);

    // 2. Payment confirmed — now create the account and grant access.
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (created.error || !created.data.user) {
      return {
        ok: false as const,
        error: created.error?.message ?? "Payment succeeded but the account could not be created.",
      };
    }
    const userId = created.data.user.id;

    const periodEndUnix = subscription["current_period_end"];
    const periodEnd =
      typeof periodEndUnix === "number" ? new Date(periodEndUnix * 1000).toISOString() : null;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.fullName,
      email,
      phone: data.phone || null,
      membership_tier: data.membershipTier,
      payment_status: "Paid",
      stripe_customer_id: data.customerId,
      stripe_subscription_id: data.subscriptionId,
      billing_period: data.period,
      subscription_status: "active",
      current_period_end: periodEnd,
      cancellation_requested: false,
    });


    await supabaseAdmin.from("properties").insert({ owner_id: userId, address: data.address });

    await supabaseAdmin.from("invoices").insert({
      owner_id: userId,
      amount_cents: amount,
      description: `${data.membershipTier} membership · ${data.period}`,
      period: data.period,
      status: "Paid",
      kind: "Membership",
      paid_at: new Date().toISOString(),
    });

    // Keep Stripe pointing back at the member for renewals + webhooks.
    await stripeApi(`customers/${data.customerId}`, { metadata: { owner_id: userId } });
    await stripeApi(`subscriptions/${data.subscriptionId}`, { metadata: { owner_id: userId } });

    // Branded welcome email (non-blocking: a mail failure must not undo signup).
    try {
      const { sendEmail, layout, statHtml, siteUrl } = await import("@/lib/email.server");
      await sendEmail({
        to: email,
        subject: "Welcome to Homesake Care",
        html: layout({
          title: "Your membership is active",
          intro: `Welcome, ${data.fullName}. Your Homesake membership is confirmed and your home is now under our care.`,
          bodyHtml: statHtml([
            ["Plan", data.membershipTier],
            ["Billing", data.period],
            ["Amount", `$${(amount / 100).toFixed(2)} / ${data.period === "Annual" ? "year" : "month"}`],
            ["Property", data.address],
          ]),
          ctaLabel: "Access Dashboard",
          ctaHref: `${siteUrl()}/dashboard`,
        }),
      });
    } catch (err) {
      console.error("[welcome-email]", err);
    }

    return { ok: true as const, email };
  });

type CardInfo = { brand: string; last4: string; expMonth: number; expYear: number } | null;

/** Signed-in member: current card on file + subscription state. */
export const getBillingDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select(
        "email, stripe_customer_id, stripe_subscription_id, billing_period, subscription_status, current_period_end",
      )
      .eq("id", context.userId)
      .maybeSingle();

    const base = {
      period: profile?.billing_period ?? null,
      subscriptionStatus: profile?.subscription_status ?? "active",
      currentPeriodEnd: profile?.current_period_end ?? null,
      subscriptionActive: Boolean(profile?.stripe_subscription_id),
    };

    const { stripeApi } = await import("@/lib/stripe.server");

    let customerId = profile?.stripe_customer_id ?? null;

    // Recover the Stripe customer by email when the id was never stored
    // (imported members, legacy checkouts) so the saved card still shows.
    if (!customerId && profile?.email) {
      try {
        const found = await stripeApi(
          "customers",
          { email: profile.email, limit: 1 },
          { method: "GET" },
        );
        const first = (found["data"] as Record<string, unknown>[] | undefined)?.[0];
        if (first?.["id"]) {
          customerId = String(first["id"]);
          await context.supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", context.userId);
        }
      } catch {
        customerId = null;
      }
    }

    if (!customerId) return { hasBilling: false as const, card: null as CardInfo, ...base };

    try {
      const customer = await stripeApi(`customers/${customerId}`, {
        expand: ["invoice_settings.default_payment_method"],
      });
      const settings = customer["invoice_settings"] as Record<string, unknown> | undefined;
      let pm = settings?.["default_payment_method"] as Record<string, unknown> | undefined;

      if (!pm) {
        const list = await stripeApi(
          `payment_methods`,
          { customer: customerId, type: "card", limit: 1 },
          { method: "GET" },
        );
        pm = (list["data"] as Record<string, unknown>[] | undefined)?.[0];
      }
      const card = pm?.["card"] as Record<string, unknown> | undefined;

      return {
        hasBilling: true as const,
        ...base,
        card: (card
          ? {
              brand: String(card["brand"] ?? "card"),
              last4: String(card["last4"] ?? "••••"),
              expMonth: Number(card["exp_month"] ?? 0),
              expYear: Number(card["exp_year"] ?? 0),
            }
          : null) as CardInfo,
      };
    } catch {
      return { hasBilling: true as const, card: null as CardInfo, ...base };
    }
  });

/**
 * Signed-in member: stop the recurring Stripe subscription at the end of the
 * paid period. Access stays open until `current_period_end`.
 */
export const cancelMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_subscription_id, current_period_end")
      .eq("id", context.userId)
      .maybeSingle();

    let periodEnd = profile?.current_period_end ?? null;

    if (profile?.stripe_subscription_id) {
      try {
        const { stripeApi } = await import("@/lib/stripe.server");
        const sub = await stripeApi(`subscriptions/${profile.stripe_subscription_id}`, {
          cancel_at_period_end: true,
        });
        const unix = sub["current_period_end"];
        if (typeof unix === "number") periodEnd = new Date(unix * 1000).toISOString();
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Stripe could not cancel the renewal.",
        };
      }
    }

    // No Stripe record: fall back to a 30-day grace window from today.
    if (!periodEnd) {
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({
        cancellation_requested: true,
        subscription_status: "cancelling",
        current_period_end: periodEnd,
      })
      .eq("id", context.userId);
    if (error) return { ok: false as const, error: error.message };

    return { ok: true as const, currentPeriodEnd: periodEnd };
  });


/** Signed-in member: Stripe Customer Portal link to change the card on file. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ returnUrl: z.string().url().max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.stripe_customer_id) {
      return { ok: false as const, error: "No Stripe billing profile on file yet." };
    }

    try {
      const { stripeApi } = await import("@/lib/stripe.server");
      const session = await stripeApi("billing_portal/sessions", {
        customer: profile.stripe_customer_id,
        return_url: data.returnUrl,
      });
      const url = session["url"] as string | undefined;
      if (!url) return { ok: false as const, error: "Could not open the billing portal." };
      return { ok: true as const, url };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Could not open the billing portal.",
      };
    }
  });

/**
 * Signed-in member: resume a subscription that is scheduled to cancel
 * (Scenario A), or prepare an in-app payable invoice for the SAME plan and
 * interval when the period already lapsed / the last invoice is unpaid
 * (Scenario B). Never sends the member back through onboarding.
 */
export const reactivateMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_subscription_id, membership_tier, billing_period")
      .eq("id", context.userId)
      .maybeSingle();

    const fail = async (message: string) => {
      const renewal = await ensureRenewalInvoice(context.userId, profile);
      if (!renewal) return { ok: false as const, needsPayment: false as const, error: message };
      return {
        ok: false as const,
        needsPayment: true as const,
        invoiceId: renewal.id,
        amountCents: renewal.amount_cents,
        error: message,
      };
    };

    if (!profile?.stripe_subscription_id) {
      return fail("Your membership period has ended. Pay the renewal invoice to restore access.");
    }

    try {
      const { stripeApi } = await import("@/lib/stripe.server");
      const sub = await stripeApi(`subscriptions/${profile.stripe_subscription_id}`);
      if (sub.status !== "active" && sub.status !== "trialing") {
        return fail("Your subscription has ended. Pay the renewal invoice to restore access.");
      }

      const resumed = await stripeApi(`subscriptions/${profile.stripe_subscription_id}`, {
        cancel_at_period_end: false,
      });
      const unix = resumed["current_period_end"];

      await context.supabase
        .from("profiles")
        .update({
          cancellation_requested: false,
          subscription_status: "active",
          payment_status: "Paid",
          current_period_end:
            typeof unix === "number" ? new Date(unix * 1000).toISOString() : null,
        })
        .eq("id", context.userId);

      return { ok: true as const, needsPayment: false as const };
    } catch (err) {
      return fail(
        err instanceof Error ? err.message : "Could not resume the membership automatically.",
      );
    }
  });

/**
 * Finds the member's outstanding membership invoice, or creates one that
 * mirrors their existing plan + interval so they can pay it in-app.
 */
async function ensureRenewalInvoice(
  userId: string,
  profile: { membership_tier?: string | null; billing_period?: string | null } | null,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: due } = await supabaseAdmin
    .from("invoices")
    .select("id, amount_cents")
    .eq("owner_id", userId)
    .eq("kind", "Membership")
    .neq("status", "Paid")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (due) return due;

  const { data: last } = await supabaseAdmin
    .from("invoices")
    .select("amount_cents, period, description")
    .eq("owner_id", userId)
    .eq("kind", "Membership")
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last?.amount_cents) return null;

  const period = profile?.billing_period ?? last.period ?? "Monthly";
  const tier = profile?.membership_tier ?? "Membership";

  const { data: created } = await supabaseAdmin
    .from("invoices")
    .insert({
      owner_id: userId,
      amount_cents: last.amount_cents,
      description: `${tier} membership renewal · ${period}`,
      period,
      status: "Due",
      kind: "Membership",
    })
    .select("id, amount_cents")
    .single();

  return created ?? null;
}

