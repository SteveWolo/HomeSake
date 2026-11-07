import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";

import { sendInvoiceDueEmail } from "@/lib/notifications.functions";
import {
  invoicePaidExtra, listVisitExtras, respondToPaidExtra, sendPaidExtra, type PaidExtra,
} from "@/lib/paid-extras";
import { formatMoney, type Appointment } from "@/lib/portal";

const button = "rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50";
const primary = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const field = "w-full rounded-sm border border-border bg-background p-3 text-sm";

export function canQuoteVisit(visit: Appointment) {
  return visit.status === "Scheduled" || visit.status === "Rescheduled";
}

function QuoteSummary({ quote }: { quote: PaidExtra }) {
  return (
    <>
      <p className="text-sm font-semibold">{formatMoney(quote.amount_cents)} · {quote.status}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{quote.scope}</p>
    </>
  );
}

export function AdminPaidExtras({ visit, requests }: {
  visit: Appointment;
  requests: { id: string; kind: string; details: string; status: string }[];
}) {
  const queryClient = useQueryClient();
  const emailInvoice = useServerFn(sendInvoiceDueEmail);
  const queryKey = ["visit-paid-extras", visit.id];
  const quotes = useQuery({ queryKey, queryFn: () => listVisitExtras(visit.id), refetchInterval: 30_000 });
  const [scope, setScope] = useState("");
  const sendId = useRef<string | null>(null);
  const [price, setPrice] = useState("");
  const [notice, setNotice] = useState("");
  const action = useMutation({
    mutationFn: (run: () => Promise<void>) => run(),
    onMutate: () => setNotice(""),
  });

  return (
    <section className="mt-4 rounded-sm border border-border p-4" aria-label="Paid extras">
      <h4 className="font-semibold">Paid extras</h4>
      <p className="mt-1 text-sm text-muted-foreground">Send a price for the client to review in their portal. Approved work stays on this visit.</p>
      {canQuoteVisit(visit) && (
        <form className="mt-4 grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          action.mutate(async () => {
            sendId.current ??= crypto.randomUUID();
            await sendPaidExtra(sendId.current, visit.id, scope, price);
            sendId.current = null;
            setScope("");
            setPrice("");
            setNotice("Quote sent to the client portal.");
            await quotes.refetch();
          });
        }}>
          {requests.filter((request) => request.kind !== "Cancel visit" && request.status !== "Declined").map((request) => (
            <button key={request.id} type="button" disabled={action.isPending} className={`${button} justify-self-start`}
              onClick={() => { sendId.current = null; setScope(request.details.slice(0, 1000)); }}>
              Use client request · {request.kind}
            </button>
          ))}
          <label className="grid gap-1 text-sm">
            Scope of work
            <textarea required disabled={action.isPending} maxLength={1000} className={field} value={scope}
              onChange={(event) => { sendId.current = null; setScope(event.target.value); }} />
          </label>
          <label className="grid gap-1 text-sm sm:max-w-48">
            Total price ($)
            <input required disabled={action.isPending} type="number" min="0.50" max="999999.99" step="0.01" className={field}
              value={price} onChange={(event) => { sendId.current = null; setPrice(event.target.value); }} />
          </label>
          <button className={`${primary} justify-self-start`} type="submit"
            disabled={action.isPending || !scope.trim()}>Send quote to portal</button>
        </form>
      )}
      {quotes.isPending && <p className="mt-3 text-sm" role="status">Loading quotes…</p>}
      {quotes.isError && <p className="mt-3 text-sm text-destructive" role="alert">Could not load quotes.</p>}
      <ul className="mt-3 space-y-3">
        {quotes.data?.map((quote) => (
          <li key={quote.id} className="rounded-sm border border-border p-3">
            <QuoteSummary quote={quote} />
            {quote.status === "Pending" && (
              <button type="button" className={`${button} mt-3`} disabled={action.isPending}
                onClick={() => action.mutate(async () => {
                  await respondToPaidExtra(quote.id, "Withdrawn");
                  setNotice("Quote withdrawn.");
                  await quotes.refetch();
                })}>Withdraw quote</button>
            )}
            {quote.status === "Approved" && !quote.invoice_id && (
              visit.status === "Completed" ? (
                <button type="button" className={`${primary} mt-3`} disabled={action.isPending}
                  onClick={() => action.mutate(async () => {
                    await invoicePaidExtra(quote.id);
                    setNotice("Invoice issued and available in the client portal.");
                    await Promise.all([quotes.refetch(), queryClient.invalidateQueries({ queryKey: ["all-invoices"] })]);
                  })}>Issue {formatMoney(quote.amount_cents)} invoice</button>
              ) : <p className="mt-2 text-sm text-muted-foreground">Complete the visit to issue the invoice.</p>
            )}
            {quote.invoice_id && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Invoice issued</span>
                <button type="button" className={button} disabled={action.isPending}
                  onClick={() => action.mutate(async () => {
                    const result = await emailInvoice({ data: { invoiceId: quote.invoice_id! } });
                    if (!result.ok) throw new Error(result.error ?? "Invoice email could not be sent.");
                    setNotice("Invoice email sent.");
                  })}>Email invoice</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {notice && <p className="mt-3 text-sm" role="status">{notice}</p>}
      {action.error && <p className="mt-3 text-sm text-destructive" role="alert">{action.error.message}</p>}
    </section>
  );
}

export function ClientPaidExtras({ visit, quotes, onResponse }: {
  visit: Appointment;
  quotes: PaidExtra[];
  onResponse: () => Promise<unknown>;
}) {
  const [confirmation, setConfirmation] = useState<PaidExtra | null>(null);
  const action = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "Approved" | "Declined" }) => {
      await respondToPaidExtra(id, decision);
      await onResponse();
    },
    onSuccess: () => setConfirmation(null),
  });

  if (!quotes.length) return null;
  return (
    <section className="mt-3 space-y-2" aria-label="Paid extras">
      <h3 className="text-sm font-semibold">Paid extras</h3>
      {quotes.map((quote) => (
        <div key={quote.id} className="rounded-sm border border-border p-3">
          <QuoteSummary quote={quote} />
          {quote.status === "Pending" && canQuoteVisit(visit) && (
            confirmation?.id === quote.id ? (
              <>
                <p className="mt-2 text-sm">Approve this work for {formatMoney(quote.amount_cents)}? Homesake can invoice you after the visit.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={primary} disabled={action.isPending}
                    onClick={() => action.mutate({ id: quote.id, decision: "Approved" })}>Confirm approval</button>
                  <button type="button" className={button} disabled={action.isPending}
                    onClick={() => setConfirmation(null)}>Back</button>
                </div>
              </>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={primary} disabled={action.isPending}
                  onClick={() => { action.reset(); setConfirmation(quote); }}>Review and approve</button>
                <button type="button" className={button} disabled={action.isPending}
                  onClick={() => action.mutate({ id: quote.id, decision: "Declined" })}>Decline quote</button>
              </div>
            )
          )}
          {quote.status === "Pending" && !canQuoteVisit(visit) && <p className="mt-2 text-sm">This visit is closed for approval.</p>}
          {quote.invoice_id && <p className="mt-2 text-sm">Invoice issued. See Membership &amp; invoices for payment details.</p>}
        </div>
      ))}
      {action.isSuccess && <p role="status" className="text-sm">Quote response saved.</p>}
      {action.error && <p role="alert" className="text-sm text-destructive">{action.error.message}</p>}
    </section>
  );
}
