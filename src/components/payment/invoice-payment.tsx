import { useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Lock } from "lucide-react";

import {
  confirmInvoicePayment,
  createInvoicePaymentIntent,
  getStripeConfig,
} from "@/lib/stripe.functions";

let stripePromise: Promise<Stripe | null> | null = null;
function stripeFor(key: string) {
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

function PayForm({
  invoiceId,
  amountCents,
  onPaid,
}: {
  invoiceId: string;
  amountCents: number;
  onPaid?: (() => void) | undefined;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const confirm = useServerFn(confirmInvoicePayment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 className="size-4" /> Payment received — thank you.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setBusy(true);
        setError(null);
        try {
          const result = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
          });
          if (result.error) throw new Error(result.error.message ?? "Payment failed.");
          await confirm({ data: { invoiceId } });
          setDone(true);
          onPaid?.();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <PaymentElement options={{ wallets: { applePay: "never", googlePay: "never" } }} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={busy || !stripe}
        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Pay ${(amountCents / 100).toFixed(2)}
      </button>
    </form>
  );
}

/** Live Stripe card form for one invoice (membership or custom service). */
export function InvoicePayment({
  invoiceId,
  onPaid,
}: {
  invoiceId: string;
  onPaid?: (() => void) | undefined;
}) {
  const createIntent = useServerFn(createInvoicePaymentIntent);
  const loadConfig = useServerFn(getStripeConfig);
  const [publishableKey, setPublishableKey] = useState(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "paid" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let key = publishableKey;
        if (!key) {
          const cfg = await loadConfig();
          key = cfg.publishableKey;
          if (active) setPublishableKey(key);
        }
        if (!key) throw new Error("Stripe publishable key is not configured yet.");

        const intent = await createIntent({ data: { invoiceId } });
        if (!active) return;
        if (intent.alreadyPaid) {
          setState("paid");
          return;
        }
        setClientSecret(intent.clientSecret);
        setAmountCents(intent.amountCents);
        setState("ready");
      } catch (err) {
        if (!active) return;
        setMessage(err instanceof Error ? err.message : "Could not start the payment.");
        setState("error");
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const options = useMemo(
    () =>
      clientSecret
        ? ({ clientSecret, appearance: { theme: "night" as const, labels: "floating" as const } })
        : null,
    [clientSecret],
  );

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Preparing secure payment…
      </p>
    );
  }
  if (state === "paid") {
    return <p className="text-sm text-emerald-400">This invoice is already paid.</p>;
  }
  if (state === "error" || !options || !publishableKey) {
    return <p className="text-sm text-destructive">{message ?? "Payment unavailable."}</p>;
  }

  return (
    <Elements stripe={stripeFor(publishableKey)} options={options}>
      <PayForm invoiceId={invoiceId} amountCents={amountCents} onPaid={onPaid} />
    </Elements>
  );
}
