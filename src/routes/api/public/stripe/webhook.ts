import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type StripeEvent = {
  type?: string;
  data?: { object?: Record<string, unknown> };
};

function verify(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = header.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const payload = await request.text();
        if (!verify(payload, request.headers.get("stripe-signature"), secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(payload) as StripeEvent;
        const object = event.data?.object ?? {};
        const metadata = (object["metadata"] as Record<string, string> | undefined) ?? {};
        const invoiceId = metadata["invoice_id"];
        const ownerId = metadata["owner_id"];
        const intentId = typeof object["id"] === "string" ? (object["id"] as string) : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const markInvoice = async (status: string) => {
          const patch: { status: string; paid_at?: string } = { status };
          if (status === "Paid") patch.paid_at = new Date().toISOString();
          if (invoiceId) {
            await supabaseAdmin.from("invoices").update(patch).eq("id", invoiceId);
          } else if (intentId) {
            await supabaseAdmin
              .from("invoices")
              .update(patch)
              .eq("stripe_payment_intent_id", intentId);
          }
          if (ownerId) {
            await supabaseAdmin
              .from("profiles")
              .update({ payment_status: status === "Paid" ? "Paid" : "Missed Payment" })
              .eq("id", ownerId);
          }
        };

        const syncSubscription = async (deleted: boolean) => {
          const subId = intentId;
          const periodEndUnix = object["current_period_end"];
          const patch: {
            subscription_status: string;
            cancellation_requested: boolean;
            current_period_end?: string;
          } = {
            subscription_status: deleted
              ? "cancelled"
              : object["cancel_at_period_end"] === true
                ? "cancelling"
                : "active",
            cancellation_requested:
              deleted || object["cancel_at_period_end"] === true,
          };
          if (typeof periodEndUnix === "number") {
            patch.current_period_end = new Date(periodEndUnix * 1000).toISOString();
          }
          if (ownerId) {
            await supabaseAdmin.from("profiles").update(patch).eq("id", ownerId);
          } else if (subId) {
            await supabaseAdmin.from("profiles").update(patch).eq("stripe_subscription_id", subId);
          }
        };

        switch (event.type) {
          case "payment_intent.succeeded":
          case "checkout.session.completed":
          case "invoice.paid":
            await markInvoice("Paid");
            break;
          case "payment_intent.payment_failed":
          case "invoice.payment_failed":
            await markInvoice("Missed Payment");
            break;
          case "customer.subscription.updated":
            await syncSubscription(false);
            break;
          case "customer.subscription.deleted":
            await syncSubscription(true);
            break;
          default:
            break;
        }


        return new Response("ok");
      },
    },
  },
});
