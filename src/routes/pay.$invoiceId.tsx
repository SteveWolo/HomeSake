import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { InvoicePayment } from "@/components/payment/invoice-payment";
import { getPayableInvoice } from "@/lib/stripe.functions";
import logoUrl from "@/assets/homesake-logo.png";

export const Route = createFileRoute("/pay/$invoiceId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Pay your invoice — Homesake Care" },
      {
        name: "description",
        content:
          "Securely settle your Homesake Care invoice with a card. Encrypted payment processed by Stripe.",
      },
      { property: "og:title", content: "Pay your invoice — Homesake Care" },
      {
        property: "og:description",
        content: "Securely settle your Homesake Care invoice in a few seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayInvoicePage,
});

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function PayInvoicePage() {
  const { invoiceId } = Route.useParams();
  const load = useServerFn(getPayableInvoice);

  const invoice = useQuery({
    queryKey: ["payable-invoice", invoiceId],
    queryFn: () => load({ data: { invoiceId } }),
  });

  const data = invoice.data?.found ? invoice.data.invoice : null;
  const paid = data?.status === "Paid";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B132B] px-5 py-14">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-center">
          <Link to="/" aria-label="Homesake Care — home">
            <img src={logoUrl} alt="Homesake Care" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="rounded-sm border border-primary/25 bg-[#101A38] p-8 shadow-2xl">
          <p className="text-xs tracking-[0.22em] text-primary uppercase">Secure payment</p>
          <h1 className="font-display mt-3 text-3xl text-foreground">Settle your invoice</h1>

          {invoice.isLoading ? (
            <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading invoice…
            </p>
          ) : !data ? (
            <p className="mt-8 text-sm text-destructive">
              We couldn’t find this invoice. Please check the link in your email.
            </p>
          ) : (
            <>
              <dl className="mt-7 space-y-3 border-y border-border/60 py-6 text-sm">
                <Row label="Invoice" value={data.description} />
                {data.ownerName && <Row label="Member" value={data.ownerName} />}
                <Row label="Type" value={data.kind + (data.period ? ` · ${data.period}` : "")} />
                <Row
                  label="Due date"
                  value={
                    data.dueDate
                      ? new Date(`${data.dueDate}T00:00:00`).toLocaleDateString()
                      : "Upon receipt"
                  }
                />
                <div className="flex items-baseline justify-between pt-2">
                  <dt className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
                    Amount due
                  </dt>
                  <dd className="font-display text-3xl text-primary">{money(data.amountCents)}</dd>
                </div>
              </dl>

              {paid ? (
                <p className="mt-7 flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle2 className="size-4" /> This invoice is already paid — thank you.
                </p>
              ) : (
                <div className="mt-7">
                  <InvoicePayment
                    invoiceId={data.id}
                    onPaid={() => {
                      void invoice.refetch();
                    }}
                  />
                </div>
              )}

              <p className="mt-6 flex items-center justify-center gap-2 text-[11px] tracking-wide text-muted-foreground uppercase">
                <ShieldCheck className="size-3.5 text-primary" /> Encrypted &amp; processed by
                Stripe
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Questions about this invoice?{" "}
          <Link to="/dashboard" className="text-primary hover:underline">
            Open your dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{label}</dt>
      <dd className="text-right text-sm text-foreground">{value}</dd>
    </div>
  );
}
