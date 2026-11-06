import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Lock, ShieldCheck } from "lucide-react";
import { z } from "zod";

import logoUrl from "@/assets/homesake-logo.png";
import { useSiteContent } from "@/hooks/use-site-content";
import { finalizeMembership, startMembershipSubscription } from "@/lib/membership.functions";
import { getStripeConfig } from "@/lib/stripe.functions";

const searchSchema = z.object({
  plan: z.string().optional(),
  period: z.enum(["monthly", "annual"]).optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Homesake Membership Checkout" },
      {
        name: "description",
        content:
          "Complete your Homesake membership: account details and secure Stripe card payment on one page. Your portal account is created once payment clears.",
      },
      { property: "og:title", content: "Homesake Membership Checkout" },
      {
        property: "og:description",
        content: "One-step membership checkout with secure recurring Stripe billing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckoutPage,
});

let stripePromise: Promise<Stripe | null> | null = null;
function stripeFor(key: string) {
  if (!stripePromise) stripePromise = loadStripe(key);
  return stripePromise;
}

const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  phone: z.string().trim().max(40),
  address: z.string().trim().min(3, "Enter the property address.").max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
});

type Details = z.infer<typeof detailsSchema>;

const field =
  "h-12 w-full rounded-sm border border-border bg-background/60 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/70";

/**
 * Card fields mount immediately (Stripe deferred-intent mode). One button
 * validates the account fields, creates the real recurring subscription, and
 * confirms the card — no intermediate step.
 */
function PayButton({
  amountCents,
  onPay,
}: {
  amountCents: number;
  onPay: (
    confirm: (clientSecret: string) => Promise<void>,
    submitElements: () => Promise<void>,
  ) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  return (
    <>
      <PaymentElement options={{ wallets: { applePay: "never", googlePay: "never" } }} />

      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked);
            if (e.target.checked) setError(null);
          }}
          className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
          aria-label="Accept terms and conditions"
        />
        <span>
          I have read and agree to the Homesake{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            Terms and Conditions
          </a>{" "}
          and recurring billing terms.
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        disabled={busy || !stripe || !accepted}
        aria-disabled={!accepted}
        onClick={async () => {
          if (!accepted) {
            setError("Please accept the Terms and Conditions to continue.");
            return;
          }
          if (!stripe || !elements) return;
          setBusy(true);
          setError(null);
          try {
            await onPay(
              async (clientSecret: string) => {
                const result = await stripe.confirmPayment({
                  elements,
                  clientSecret,
                  redirect: "if_required",
                });
                if (result.error) throw new Error(result.error.message ?? "Payment failed.");
              },
              async () => {
                const submitted = await elements.submit();
                if (submitted.error) {
                  throw new Error(submitted.error.message ?? "Check your card details.");
                }
              },
            );
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment failed.");
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Pay ${(amountCents / 100).toLocaleString()} &amp; start membership
      </button>
    </>
  );
}


function CheckoutPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { pricing } = useSiteContent();

  const start = useServerFn(startMembershipSubscription);
  const finalize = useServerFn(finalizeMembership);
  const loadConfig = useServerFn(getStripeConfig);

  const annual = search.period !== "monthly";
  const plan = useMemo(
    () => pricing.tiers.find((t) => t.name === search.plan) ?? pricing.tiers[0],
    [pricing.tiers, search.plan],
  );

  const [details, setDetails] = useState<Details>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [publishableKey, setPublishableKey] = useState(
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  );

  useEffect(() => {
    if (publishableKey) return;
    let active = true;
    void loadConfig().then((cfg) => {
      if (active) setPublishableKey(cfg.publishableKey);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plan) return null;

  const annualMonthly = plan.annualMonthly || Math.round((plan.monthly * 10) / 12);
  const monthlyEffective = annual ? annualMonthly : plan.monthly;
  const dueToday = annual ? annualMonthly * 12 : plan.monthly;
  const savings = annual ? plan.monthly * 12 - annualMonthly * 12 : 0;
  const dueTodayCents = Math.round(dueToday * 100);

  const set = (key: keyof Details) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDetails((d) => ({ ...d, [key]: e.target.value }));
  };

  /**
   * One click: validate the account fields, validate the card, create the real
   * recurring subscription, confirm the card, then create the portal account.
   */
  const payAndStart = async (
    confirm: (clientSecret: string) => Promise<void>,
    submitElements: () => Promise<void>,
  ) => {
    setNotice(null);
    const parsed = detailsSchema.safeParse(details);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      throw new Error("Please complete the highlighted fields above.");
    }
    setErrors({});

    await submitElements();

    const started = await start({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        membershipTier: plan.name,
        period: annual ? "Annual" : "Monthly",
        monthlyPrice: monthlyEffective,
      },
    });
    if (!started.ok) throw new Error(started.error);

    await confirm(started.clientSecret);

    const finalized = await finalize({
      data: {
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        membershipTier: plan.name,
        period: annual ? "Annual" : "Monthly",
        monthlyPrice: monthlyEffective,
        subscriptionId: started.subscriptionId,
        customerId: started.customerId,
        password: parsed.data.password,
      },
    });
    if (!finalized.ok) throw new Error(finalized.error);
    setDone(true);
  };

  const elementsOptions = {
    mode: "subscription" as const,
    amount: dueTodayCents,
    currency: "usd",
    setupFutureUsage: "off_session" as const,
    // Card only — no Link, Cash App, Amazon Pay or wallets.
    paymentMethodTypes: ["card"],
    appearance: { theme: "night" as const },
  };


  const err = (k: string) =>
    errors[k] ? <p className="mt-1.5 text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <div className="min-h-screen bg-background px-6 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="inline-flex" aria-label="Homesake — home">
          <img src={logoUrl} alt="Homesake logo" className="h-10 w-auto" />
        </Link>

        {done ? (
          <div className="panel mx-auto mt-16 max-w-lg rounded-sm p-10 text-center">
            <CheckCircle2 className="mx-auto size-8 text-emerald-400" />
            <h1 className="font-display mt-5 text-3xl">Welcome to {plan.name}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Payment confirmed and your portal account is ready. Sign in with{" "}
              {details.email} and the password you chose.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/login" })}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground"
            >
              Sign in to your portal
            </button>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="panel rounded-sm p-8 lg:p-10">
              <p className="eyebrow">Checkout</p>
              <h1 className="font-display mt-3 text-3xl lg:text-4xl">
                {plan.name} membership
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>

              <div className="mt-8 space-y-3">
                <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                  Account &amp; property
                </p>
                <div>
                  <input
                    className={field}
                    value={details.fullName}
                    onChange={set("fullName")}
                    placeholder="Full name"
                    aria-label="Full name"
                    autoComplete="off"
                  />
                  {err("fullName")}
                </div>
                <div>
                  <input
                    type="email"
                    className={field}
                    value={details.email}
                    onChange={set("email")}
                    placeholder="Email for portal & receipts"
                    aria-label="Email address"
                    autoComplete="off"
                  />
                  {err("email")}
                </div>
                <div>
                  <input
                    className={field}
                    value={details.phone}
                    onChange={set("phone")}
                    placeholder="Phone number (optional)"
                    aria-label="Phone number"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <input
                    className={field}
                    value={details.address}
                    onChange={set("address")}
                    placeholder="Property address"
                    aria-label="Property address"
                    autoComplete="off"
                  />
                  {err("address")}
                </div>
                <div>
                  <input
                    type="password"
                    className={field}
                    value={details.password}
                    onChange={set("password")}
                    placeholder="Create a portal password (min 8 characters)"
                    aria-label="Portal password"
                    autoComplete="new-password"
                  />
                  {err("password")}
                </div>
              </div>

              <div className="mt-9 space-y-4">
                <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                  Card payment
                </p>

                {!publishableKey ? (
                  <p className="text-sm text-destructive">
                    Stripe is not fully configured yet — the publishable key is missing.
                  </p>
                ) : (
                  <Elements stripe={stripeFor(publishableKey)} options={elementsOptions}>
                    <PayButton amountCents={dueTodayCents} onPay={payAndStart} />
                  </Elements>
                )}

                {notice && <p className="text-sm text-destructive">{notice}</p>}

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <span>
                    Stripe processes your card details. Your membership renews automatically{" "}
                    {annual ? "each year" : "each month"}. Turn off renewal in your portal before
                    your next billing date. Your membership stays active through the paid period.
                    See the <Link to="/terms" className="underline">Membership Terms</Link>.
                  </span>
                </p>
              </div>
            </div>

            <aside className="panel h-fit rounded-sm p-8">
              <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                Order summary
              </p>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Plan</span>
                  <span>
                    {plan.name} · {annual ? "Annual" : "Monthly"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Rate</span>
                  <span>${monthlyEffective.toLocaleString()} / month</span>
                </div>
                {annual && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Annual savings</span>
                    <span className="text-primary">−${savings.toLocaleString()}</span>
                  </div>
                )}
                <div className="hairline flex justify-between gap-4 pt-4">
                  <span className="font-semibold">Due today</span>
                  <span className="font-display text-2xl leading-none">
                    ${dueToday.toLocaleString()}
                  </span>
                </div>
              </div>
              <ul className="mt-7 space-y-2 text-xs text-muted-foreground">
                {plan.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <Link
                to="/"
                className="mt-8 inline-block text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Back to memberships
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
