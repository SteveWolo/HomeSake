import { MaintenanceRecord } from "@/components/portal/maintenance-record";
import { resolvePortalTarget } from "@/lib/portal-target";
import { IssueHistory } from "@/components/portal/issue-progress";
import { parsePortalSearch } from "@/lib/portal-links";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BadgeDollarSign,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Gauge,
  ListChecks,
  Loader2,
  LockKeyhole,
  LogOut,
  NotebookPen,
  Wallet,
} from "lucide-react";

import logoUrl from "@/assets/homesake-logo.png";
import { toast } from "sonner";
import { InvoicePayment } from "@/components/payment/invoice-payment";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  cancelMembership,
  createBillingPortalSession,
  getBillingDetails,
  reactivateMembership,
} from "@/lib/membership.functions";
import { sidebarHeading, sidebarItem, sidebarShell } from "@/lib/portal-ui";
import {
  appendHomeNote,
  parseHomeNotes,
  formatDateTime,
  formatMoney,
  getMyProfile,
  listActivity,
  listAppointments,
  listBlockedSlots,
  listMaintenanceTasks,
  listMyInvoices,
  listMyProperties,
  listOpenItems,
  listPhotos,
  type PhotoWithUrl,
  membershipState,
  saveHomeNotes,
  scoreLabel,
} from "@/lib/portal";
import { PhotoLightbox } from "@/components/portal/photo-lightbox";
import { VisitReportContent } from "@/components/portal/visit-report";
import { readVisitReport } from "@/lib/visit-workspace";
import { canQuoteVisit, ClientPaidExtras } from "@/components/portal/paid-extras";
import { listPropertyExtras } from "@/lib/paid-extras";
import { ServiceRequests } from "@/components/portal/service-requests";
import { RescheduleModal } from "@/components/portal/reschedule-modal";

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: parsePortalSearch,
  head: () => ({
    meta: [
      { title: "Member Dashboard — Home Harmony Hub" },
      {
        name: "description",
        content:
          "Your home health score, upcoming visits, appointment history, inspection photos, contractor notes, membership plan, and invoices in one place.",
      },
      { property: "og:title", content: "Member Dashboard — Home Harmony Hub" },
      {
        property: "og:description",
        content: "Track your property health, appointments, photos, and billing history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const priorityStyles: Record<string, string> = {
  High: "border-destructive/50 text-destructive",
  Medium: "border-primary/60 text-primary",
  Low: "border-border text-muted-foreground",
};

type Tab = "overview" | "appointments" | "maintenance" | "membership";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Dashboard" },
  { id: "appointments", label: "Visits & service requests" },
  { id: "maintenance", label: "Maintenance record" },
  { id: "membership", label: "Membership & invoices" },
];

function ScoreRing({ score }: { score: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-[124px] place-items-center">
      <svg viewBox="0 0 112 112" className="size-[124px] -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" strokeWidth="8" className="stroke-border" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-3xl leading-none">{score}</p>
        <p className="mt-1 text-[10px] tracking-[0.18em] text-primary uppercase">
          {scoreLabel(score)}
        </p>
      </div>
    </div>
  );
}

function cardBrand(brand: string) {
  const map: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    jcb: "JCB",
    diners: "Diners Club",
    unionpay: "UnionPay",
  };
  return map[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

/** Read-only photo note that stays clamped until the member expands it. */
function PhotoNote({ note }: { note: string | null }) {
  const [open, setOpen] = useState(false);
  if (!note) return <span className="block text-muted-foreground">No note</span>;

  const long = note.length > 90 || note.includes("\n");
  return (
    <div className="min-w-0">
      <span
        className={`block break-words whitespace-pre-wrap ${open || !long ? "" : "line-clamp-2"}`}
      >
        {note}
      </span>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[11px] font-semibold text-primary uppercase"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** Persistent home info (garage codes, pet notes) shared with the Homesake team. */
function HomeNotesCard({
  propertyId,
  value,
  onSaved,
}: {
  propertyId: string;
  value: string;
  onSaved: () => void | Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadedFor, setLoadedFor] = useState(propertyId);
  const history = parseHomeNotes(value);

  if (loadedFor !== propertyId) {
    setLoadedFor(propertyId);
    setNotes("");
  }

  const save = async () => {
    if (!notes.trim()) return;
    setBusy(true);
    try {
      await appendHomeNote(propertyId, value, notes);
      setNotes("");
      toast.success("Home notes saved — your specialist will see them before the next visit.");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your notes.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel rounded-sm p-6" aria-labelledby="home-notes">
      <h2
        id="home-notes"
        className="flex items-center gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase"
      >
        <NotebookPen className="size-3.5 text-primary" />
        Home notes &amp; special instructions
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Gate or garage codes, alarm details, pets, parking, rooms to avoid — anything our specialist
        should know before arriving.
      </p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={5}
        placeholder="e.g. Garage code 4821. Friendly dog (Momo) in the back yard. Please do not enter the nursery."
        className="mt-4 w-full rounded-sm border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary/70"
      />
      <button
        type="button"
        disabled={busy || !notes.trim()}
        onClick={() => void save()}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {busy && <Loader2 className="size-3.5 animate-spin" />}
        Save home notes
      </button>

      {history.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Notes on file
          </p>
          <ul className="mt-3 space-y-3">
            {history.map((entry, i) => (
              <li
                key={`${i}-${entry.slice(0, 24)}`}
                className="rounded-sm border border-border bg-background/40 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-muted-foreground"
              >
                {entry}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}


function PublishedVisitReport({ visit, expanded }: {
  visit: import("@/lib/portal").Appointment;
  expanded: boolean;
}) {
  const report = readVisitReport(visit.published_report);
  if (!report) return visit.visit_report ? (
    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{visit.visit_report}</p>
  ) : null;
  return (
    <details className="mt-3" open={expanded || undefined}>
      <summary className="cursor-pointer text-sm font-semibold text-primary">View visit report</summary>
      <div className="mt-3"><VisitReportContent report={report} /></div>
    </details>
  );
}

function DashboardPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const linkedVisitId = search.visit;
  const targetKey = JSON.stringify(search);
  const hasTarget = Object.keys(search).length > 0;
  const [tab, setTab] = useState<Tab>(search.invoice ? "membership" : (search.visit || search.quote) ? "appointments" : "overview");
  const openedLink = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const openPortal = useServerFn(createBillingPortalSession);
  const loadBilling = useServerFn(getBillingDetails);
  const cancelPlan = useServerFn(cancelMembership);
  const reactivatePlan = useServerFn(reactivateMembership);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [reactivateBusy, setReactivateBusy] = useState(false);
  const [renewalInvoiceId, setRenewalInvoiceId] = useState<string | null>(null);

  // Strict role routing: admins belong in the admin portal only.
  useEffect(() => {
    if (!loading && role === "admin") navigate({ to: "/admin", replace: true });
  }, [loading, role, navigate]);

  const properties = useQuery({
    queryKey: ["my-properties", user?.id],
    queryFn: () => listMyProperties(user!.id),
    enabled: !!user,
  });
  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => getMyProfile(user!.id),
    enabled: !!user,
  });
  const invoices = useQuery({
    queryKey: ["my-invoices", user?.id],
    queryFn: () => listMyInvoices(user!.id),
    enabled: !!user,
  });
  const billing = useQuery({
    queryKey: ["my-billing", user?.id],
    queryFn: () => loadBilling(),
    enabled: !!user,
  });

  useEffect(() => {
    if (!activeId && properties.data?.length) setActiveId(properties.data[0]!.id);
  }, [properties.data, activeId]);

  const property = properties.data?.find((p) => p.id === activeId) ?? null;
  const extras = useQuery({
    queryKey: ["property-paid-extras", property?.id],
    queryFn: () => listPropertyExtras(property!.id),
    enabled: Boolean(property),
    refetchInterval: 30_000,
  });

  const linkedTarget = useQuery({
    queryKey: ["portal-target", user?.id, search],
    queryFn: () => resolvePortalTarget(search),
    enabled: Boolean(user && hasTarget),
  });
  useEffect(() => {
    if (!hasTarget) {
      openedLink.current = null;
      return;
    }
    const target = linkedTarget.data;
    if (!target || openedLink.current === targetKey) return;
    openedLink.current = targetKey;
    if (target.propertyId) setActiveId(target.propertyId);
    setTab(target.tab);
    if (search.invoice) setPayingId(search.invoice);
  }, [hasTarget, linkedTarget.data, targetKey, search.invoice]);

  const activity = useQuery({
    queryKey: ["activity", property?.id],
    queryFn: () => listActivity(property!.id),
    enabled: !!property,
  });
  const openItems = useQuery({
    queryKey: ["open-items", property?.id],
    queryFn: () => listOpenItems(property!.id),
    enabled: !!property,
    refetchInterval: 30_000,
  });
  const [lightbox, setLightbox] = useState<PhotoWithUrl | null>(null);

  const photos = useQuery({
    queryKey: ["photos", property?.id],
    queryFn: () => listPhotos(property!.id),
    enabled: !!property,
  });
  const appointments = useQuery({
    queryKey: ["appointments", property?.id],
    queryFn: () => listAppointments(property!.id),
    enabled: !!property,
  });
  useEffect(() => {
    const target = linkedTarget.data;
    if (!target || tab !== target.tab || (target.propertyId && property?.id !== target.propertyId)) return;
    const element = document.getElementById(target.elementId);
    element?.scrollIntoView({ block: "nearest" });
    element?.focus({ preventScroll: true });
  }, [tab, property?.id, linkedTarget.data, appointments.data, extras.data, openItems.data, invoices.data]);

  const tasks = useQuery({
    queryKey: ["maintenance-tasks", property?.id],
    queryFn: () => listMaintenanceTasks(property!.id),
    enabled: !!property,
  });
  const blockedSlots = useQuery({
    queryKey: ["blocked-slots"],
    queryFn: listBlockedSlots,
    enabled: !!user,
  });
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [requestFocus, setRequestFocus] = useState(false);
  useEffect(() => {
    if (!requestFocus || tab !== "appointments" || !property) return;
    const heading = document.getElementById("request-service");
    heading?.scrollIntoView({ block: "nearest" });
    heading?.parentElement?.querySelector("textarea")?.focus({ preventScroll: true });
    setRequestFocus(false);
  }, [requestFocus, tab, property?.id]);
  /**
   * Every routine job an admin logs bumps the property counter, so the metric
   * covers both the maintenance checklist and posted visit reports.
   */
  const taskLog = [
    ...(tasks.data ?? [])
      .filter((t) => t.completed)
      .map((t) => ({ id: t.id, title: t.title, at: t.completed_at ?? t.created_at })),
    ...(activity.data ?? []).map((a) => ({ id: a.id, title: a.title, at: a.occurred_at })),
  ].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime());
  const tasksDone = property?.tasks_completed_count ?? taskLog.length;



  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  // Live sync: invoice + membership changes land without a manual refresh.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices", filter: `owner_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["my-invoices", user.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
          void queryClient.invalidateQueries({ queryKey: ["my-billing", user.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "properties", filter: `owner_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["my-properties", user.id] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_items" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["activity"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "open_items" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["open-items"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_tasks" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["maintenance-tasks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  /**
   * Reactivation keeps the member on their existing plan and interval.
   * Scenario A: resume auto-renewal in Stripe. Scenario B: pay the renewal
   * invoice in-app with Stripe Elements — never a trip back to /checkout.
   */
  const handleReactivate = async () => {
    setReactivateBusy(true);
    setCancelNotice(null);
    try {
      const res = await reactivatePlan();
      if (res.ok) {
        setRenewalInvoiceId(null);
        toast.success("Membership reactivated — auto-renewal is back on.");
        setCancelNotice("Membership reactivated — renewals are back on.");
        await profile.refetch();
        await billing.refetch();
        return;
      }
      if (res.needsPayment) {
        setRenewalInvoiceId(res.invoiceId);
        setCancelNotice(res.error);
        toast.info("Complete the payment below to restore your membership.");
        return;
      }
      setCancelNotice(res.error);
      toast.error(res.error);
    } finally {
      setReactivateBusy(false);
    }
  };

  const manageCard = async () => {
    setBillingBusy(true);
    setBillingError(null);
    try {
      const result = await openPortal({
        data: { returnUrl: `${window.location.origin}/dashboard` },
      });
      if (!result.ok) throw new Error(result.error);
      window.location.href = result.url;
    } catch (err) {
      setBillingError(
        err instanceof Error ? err.message : "Could not open the billing portal right now.",
      );
    } finally {
      setBillingBusy(false);
    }
  };

  const card = "panel flex flex-col justify-between rounded-sm p-6";
  const label = "flex items-center gap-2 text-xs tracking-[0.16em] text-muted-foreground uppercase";

  const now = Date.now();
  const upcoming = (appointments.data ?? []).filter(
    (visit) => ["Scheduled", "Rescheduled"].includes(visit.status) && Date.parse(visit.scheduled_at) >= now,
  ).reverse();
  const past = (appointments.data ?? []).filter((visit) => !upcoming.includes(visit));
  const useLegacyVisit = appointments.isSuccess && appointments.data.length === 0 &&
    Boolean(property?.next_visit_at && Date.parse(property.next_visit_at) >= now);
  const nextVisitAt = upcoming[0]?.scheduled_at ?? (useLegacyVisit ? property?.next_visit_at : null);
  const nextVisitName = upcoming[0]?.service ?? (useLegacyVisit ? property?.next_visit_note : null);

  const pendingExtras = extras.data?.filter((quote) => quote.status === "Pending" &&
    (appointments.data ?? []).some((visit) => visit.id === quote.appointment_id && canQuoteVisit(visit))) ?? [];
  const latestReport = (appointments.data ?? []).find((visit) => Boolean(visit.published_report || visit.visit_report));

  const attentionInvoices = (invoices.data ?? []).filter((invoice) =>
    invoice.status === "Due" && (!invoice.property_id || invoice.property_id === property?.id));
  const attentionIssues = (openItems.data ?? []).filter((issue) => !issue.resolved);
  const latestSummary = latestReport ? readVisitReport(latestReport.published_report)?.summary || latestReport.visit_report : null;

  const state = profile.data ? membershipState(profile.data) : "active";

  // Cancelled and past the paid period — the portal is closed.
  if (state === "cancelled") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="panel w-full max-w-md rounded-sm p-8 text-center">
          <LockKeyhole className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-5 text-2xl">Account inactive</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your membership ended on {formatDateTime(profile.data?.current_period_end ?? null)}.
            Reactivate to restore access — you keep your{" "}
            {profile.data?.membership_tier ?? "current"} plan
            {profile.data?.billing_period
              ? ` · ${profile.data.billing_period.toLowerCase()}`
              : ""}
            .
          </p>
          <button
            type="button"
            disabled={reactivateBusy}
            onClick={() => void handleReactivate()}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {reactivateBusy && <Loader2 className="size-4 animate-spin" />}
            Reactivate membership
          </button>
          {renewalInvoiceId && (
            <div className="mt-6 border-t border-border pt-6 text-left">
              <InvoicePayment
                invoiceId={renewalInvoiceId}
                onPaid={async () => {
                  setRenewalInvoiceId(null);
                  toast.success("Membership reactivated — payment received.");
                  await profile.refetch();
                  await invoices.refetch();
                }}
              />
            </div>
          )}
          {cancelNotice && <p className="mt-4 text-xs text-muted-foreground">{cancelNotice}</p>}
          <button
            type="button"
            onClick={signOut}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full border border-border px-6 text-sm"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-background lg:flex">
      <aside className={sidebarShell}>
        <div className="flex h-20 items-center border-b border-border/50 px-6">
          <Link to="/" aria-label="Home Harmony Hub — home">
            <img src={logoUrl} alt="Home Harmony Hub logo" className="h-9 w-auto" />
          </Link>
        </div>
        <p className={sidebarHeading}>Portal</p>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={sidebarItem(tab === t.id)}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={signOut}
            className={`${sidebarItem(false)} mt-2 flex items-center gap-3 lg:mt-6`}
          >
            <LogOut className="size-4" />
            Log Out
          </button>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="grid gap-4 border-b border-border px-4 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:px-10">
          <div className="min-w-0">
            <p className="eyebrow">Active property</p>
            <div className="relative mt-2 flex w-full items-center sm:inline-flex sm:w-auto">
              <select
                aria-label="Select active property"
                value={activeId ?? ""}
                onChange={(e) => setActiveId(e.target.value)}
                className="w-full max-w-full appearance-none truncate rounded-full border border-border bg-background/60 py-2.5 pr-10 pl-5 text-sm outline-none focus:border-primary/70 sm:w-auto sm:max-w-xs"
              >
                {(properties.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.address}
                  </option>
                ))}
                {!properties.data?.length && <option value="">No property yet</option>}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 size-4 shrink-0 text-muted-foreground" />
            </div>
          </div>
          <div className="min-w-0 md:text-right">
            <p className="truncate text-sm font-semibold">
              Welcome back{profile.data?.full_name ? `, ${profile.data.full_name}` : ""}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.data?.membership_tier ?? "Membership"} member
            </p>
          </div>
        </header>

        <main className="space-y-6 px-4 py-8 sm:px-6 lg:px-10">
          <h1 className="font-display text-2xl sm:text-3xl">
            {tabs.find((t) => t.id === tab)?.label}
          </h1>


          {hasTarget && linkedTarget.isPending && <p role="status" className="text-sm">Opening your item…</p>}
          {hasTarget && (linkedTarget.isError || (linkedTarget.isSuccess && !linkedTarget.data)) && (
            <p role="alert" className="rounded-sm border border-border p-4 text-sm">
              This item is unavailable. Check your link or contact Homesake.
            </p>
          )}

          {loading || properties.isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading your home data…
            </p>
          ) : !property && tab !== "membership" ? (
            <section className="panel max-w-xl rounded-sm p-6">
              <h2 className="font-display text-xl">No property on file yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your estate manager adds your property, health score, visits, and reports. Reach out
                if something looks missing.
              </p>
            </section>
          ) : null}

          {tab === "overview" && property && (
            <>
              <section id="client-home" tabIndex={-1} className="panel rounded-sm p-6" aria-labelledby="next-visit-heading">
                <p className={label}>Your home, taken care of</p>
                <h2 id="next-visit-heading" className="font-display mt-3 text-2xl">Your next visit</h2>
                {appointments.isPending ? <p role="status" className="mt-3 text-sm">Loading your schedule…</p> :
                  appointments.isError ? <p role="alert" className="mt-3 text-sm">Could not load your schedule. Try refreshing.</p> : (
                    <>
                      <p className="mt-3 text-lg font-semibold">{formatDateTime(nextVisitAt ?? null)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{nextVisitName || "We’ll confirm the date and planned service with you."}</p>
                      {upcoming[0]?.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{upcoming[0].notes}</p>}
                    </>
                  )}
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-primary">
                  {upcoming[0] && <Link to="/dashboard" onClick={() => setTab("appointments")} search={{ visit: upcoming[0].id }} className="underline">View visit details</Link>}
                  {upcoming.length > 0 && <button type="button" className="underline" onClick={() => setRescheduleOpen(true)}>Request a schedule change</button>}
                  <button type="button" className="underline" onClick={() => { setTab("appointments"); setRequestFocus(true); }}>Request extra work</button>
                </div>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="client-attention">
                <h2 id="client-attention" className="font-display text-xl">Needs your attention</h2>
                {(extras.isPending || invoices.isPending || openItems.isPending) &&
                  <p role="status" className="mt-3 text-sm">Checking your updates…</p>}
                {(extras.isError || invoices.isError || openItems.isError) &&
                  <p role="alert" className="mt-3 text-sm">Some updates could not be loaded. Try refreshing.</p>}
                <ul className="mt-3 space-y-3">
                  {pendingExtras.map((quote) => (
                    <li key={quote.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border p-3">
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Quote for {formatMoney(quote.amount_cents)}</p>
                        <p className="break-words text-sm text-muted-foreground">{quote.scope}</p></div>
                      <Link to="/dashboard" onClick={() => setTab("appointments")} search={{ quote: quote.id }} className="text-sm text-primary underline">Review quote</Link>
                    </li>
                  ))}
                  {attentionInvoices.map((invoice) => (
                    <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border p-3">
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{formatMoney(invoice.amount_cents)} due</p>
                        <p className="break-words text-sm text-muted-foreground">{invoice.description}</p></div>
                      <Link to="/dashboard" onClick={() => setTab("membership")} search={{ invoice: invoice.id }} className="text-sm text-primary underline">View invoice</Link>
                    </li>
                  ))}
                  {attentionIssues.map((issue) => (
                    <li key={issue.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border p-3">
                      <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{issue.title}</p>
                        <p className="text-sm text-muted-foreground">{issue.progress_status}</p></div>
                      <Link to="/dashboard" onClick={() => setTab("overview")} search={{ issue: issue.id }} className="text-sm text-primary underline">View issue</Link>
                    </li>
                  ))}
                </ul>
                {extras.isSuccess && invoices.isSuccess && openItems.isSuccess &&
                  !pendingExtras.length && !attentionInvoices.length && !attentionIssues.length &&
                  <p className="mt-3 text-sm text-muted-foreground">You’re up to date. There are no pending quotes, invoices, or open issues for this home.</p>}
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="latest-report-heading">
                <h2 id="latest-report-heading" className="font-display text-xl">Latest visit report</h2>
                {latestReport ? (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">{latestReport.service} · {formatDateTime(latestReport.scheduled_at)}</p>
                    {latestSummary && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{latestSummary}</p>}
                    <PublishedVisitReport visit={latestReport} expanded={false} />
                    <button type="button" className="mt-3 mr-4 text-sm text-primary underline"
                      onClick={() => setTab("maintenance")}>View maintenance record</button>
                    <Link to="/dashboard" onClick={() => setTab("appointments")} search={{ visit: latestReport.id }} className="mt-3 inline-block text-sm text-primary underline">Open full visit</Link>
                  </>
                ) : appointments.isPending ? <p role="status" className="mt-3 text-sm">Loading your latest report…</p>
                  : appointments.isError ? <p role="alert" className="mt-3 text-sm">Could not load your latest report.</p>
                  : <p className="mt-3 text-sm text-muted-foreground">Your published report will appear here after a visit.</p>}
              </section>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="panel flex flex-col items-start gap-4 rounded-sm p-6 sm:flex-row sm:items-center sm:gap-6">
                  <ScoreRing score={property.health_score} />
                  <div className="min-w-0">

                    <p className={label}>
                      <Gauge className="size-3.5 text-primary" />
                      Home health score
                    </p>
                    <p className="mt-3 text-sm">Overall score</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Calculated{" "}
                      {new Date(property.score_calculated_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className={card}>
                  <div>
                    <p className={label}>
                      <BadgeDollarSign className="size-3.5 text-primary" />
                      Credits balance
                    </p>
                    <p className="font-display mt-4 text-2xl">
                      {formatMoney(property.credits_cents)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">Available credit</p>
                  </div>
                </div>

                <div className={`${card} border border-primary/30`}>
                  <div>
                    <p className={label}>
                      <ListChecks className="size-3.5 text-primary" />
                      Tasks you didn't have to do
                    </p>
                    <p className="font-display mt-4 text-4xl text-primary">{tasksDone}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Maintenance jobs we handled for you
                    </p>
                  </div>
                </div>
              </div>


              <div className="grid gap-6 lg:grid-cols-2">
                <section className="panel rounded-sm p-6" aria-labelledby="recent-activity">
                  <h2 id="recent-activity" className={label}>
                    Recent activity &amp; contractor notes
                  </h2>
                  <ul className="mt-5 space-y-4">
                    {(activity.data ?? []).map((a) => (
                      <li key={a.id} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <div>
                          <p className="text-sm">{a.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateTime(a.occurred_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                    {!activity.data?.length && (
                      <li className="text-sm text-muted-foreground">No activity logged yet.</li>
                    )}
                  </ul>
                </section>

                <section className="panel rounded-sm p-6" aria-labelledby="open-items">
                  <h2 id="open-items" className={label}>
                    Needs attention
                  </h2>
                  <ul className="mt-5 space-y-3">
                    {(openItems.data ?? [])
                      .filter((o) => !o.resolved)
                      .map((o) => (
                        <li
                          key={o.id}
                          id={`issue-${o.id}`}
                          tabIndex={-1}
                          className="flex items-start justify-between gap-4 rounded-sm border border-border bg-background/40 px-4 py-4"
                        >
                          <div>
                            <p className="text-sm font-semibold">{o.title}</p>
                            <p className="mt-1 text-xs font-semibold text-primary">{o.progress_status}</p>
                            {o.detail && (
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{o.detail}</p>
                            )}
                            {o.recommended_action && (
                              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                                <span className="font-semibold">Recommended action:</span> {o.recommended_action}
                              </p>
                            )}
                            <IssueHistory issue={o} />
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(photos.data ?? []).filter((photo) => photo.issue_id === o.id && photo.url).map((photo, index) => (
                                <button key={photo.id} type="button" className="text-sm text-primary underline"
                                  onClick={() => setLightbox(photo)}>View issue photo {index + 1} · {formatDateTime(photo.created_at)}</button>
                              ))}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-3 py-1 text-[11px] tracking-[0.1em] uppercase ${
                              priorityStyles[o.priority] ?? priorityStyles["Low"]
                            }`}
                          >
                            {o.priority === "High" ? "Urgent" : o.priority}
                          </span>
                        </li>
                      ))}
                    {!openItems.data?.filter((o) => !o.resolved).length && (
                      <li className="text-sm text-muted-foreground">Nothing open — all clear.</li>
                    )}
                  </ul>
                </section>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <HomeNotesCard
                  propertyId={property.id}
                  value={property.home_notes ?? ""}
                  onSaved={() => properties.refetch().then(() => undefined)}
                />

                <section className="panel rounded-sm p-6" aria-labelledby="tasks-log">
                  <h2 id="tasks-log" className={label}>
                    <ListChecks className="size-3.5 text-primary" />
                    Tasks you didn't have to do
                  </h2>
                  <p className="font-display mt-3 text-3xl text-primary">{tasksDone}</p>
                  <ul className="mt-5 space-y-2">
                    {taskLog.map((t) => (
                      <li key={t.id} className="flex items-start gap-3 text-sm">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <span className="min-w-0 break-words text-muted-foreground">
                          {t.title}
                          {t.at && <span className="block text-xs">{formatDateTime(t.at)}</span>}
                        </span>
                      </li>
                    ))}
                    {!taskLog.length && (
                      <li className="text-sm text-muted-foreground">
                        Nothing logged yet — completed maintenance will appear here after your next
                        visit.
                      </li>
                    )}
                  </ul>
                </section>
              </div>

              <section className="panel rounded-sm p-6" aria-labelledby="photos">
                <h2 id="photos" className={label}>
                  Inspection photos
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Photos and notes are added by your estate manager after each visit.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {(photos.data ?? []).map((p) => (
                    <figure
                      key={p.id}
                      className="flex min-w-0 flex-col overflow-hidden rounded-sm border border-border bg-background/40"
                    >
                      {p.url && (
                        <button
                          type="button"
                          onClick={() => setLightbox(p)}
                          aria-label="Open full-size photo"
                          className="block w-full cursor-zoom-in"
                        >
                          <img
                            src={p.url}
                            alt={p.note ?? "Property photo"}
                            loading="lazy"
                            className="aspect-4/3 w-full object-cover"
                          />
                        </button>
                      )}
                      <figcaption className="min-w-0 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        <PhotoNote note={p.note} />
                      </figcaption>
                    </figure>
                  ))}
                  {!photos.data?.length && (
                    <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
                  )}
                </div>

                {lightbox?.url && (
                  <PhotoLightbox
                    src={lightbox.url}
                    note={lightbox.note}
                    caption={new Date(lightbox.created_at).toLocaleString()}
                    onClose={() => setLightbox(null)}
                  />
                )}
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="completed-items">
                <h2 id="completed-items" className={label}>
                  Completed recommendations
                </h2>
                <ul className="mt-5 space-y-2">
                  {(openItems.data ?? [])
                    .filter((o) => o.resolved)
                    .map((o) => (
                      <li
                        key={o.id}
                        id={`issue-${o.id}`}
                        tabIndex={-1}
                        className="rounded-sm border border-border p-3 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                        <span className="font-semibold">{o.title} · Resolved</span>
                        <IssueHistory issue={o} />
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(photos.data ?? []).filter((photo) => photo.issue_id === o.id && photo.url).map((photo, index) => (
                            <button key={photo.id} type="button" className="text-sm text-primary underline"
                              onClick={() => setLightbox(photo)}>View issue photo {index + 1} · {formatDateTime(photo.created_at)}</button>
                          ))}
                        </div>
                      </li>
                    ))}
                  {!openItems.data?.filter((o) => o.resolved).length && (
                    <li className="text-sm text-muted-foreground">Nothing resolved yet.</li>
                  )}
                </ul>
              </section>
            </>
          )}

          {tab === "maintenance" && property && (
            <MaintenanceRecord key={property.id} propertyId={property.id} visits={appointments.data ?? []}
              visitsLoading={appointments.isPending} visitsFailed={appointments.isError} />
          )}

          {tab === "appointments" && property && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="panel rounded-sm p-6" aria-labelledby="upcoming">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="upcoming" className={label}>Upcoming visits</h2>
                  {upcoming.length > 0 && <button type="button" className="text-sm text-primary underline"
                    onClick={() => setRescheduleOpen(true)}>Reschedule a visit</button>}
                </div>
                <ul className="mt-5 space-y-3">
                  {upcoming.map((a) => (
                    <li
                      key={a.id}
                      id={`visit-${a.id}`}
                      tabIndex={-1}
                      className="rounded-sm border border-border bg-background/40 px-4 py-4"
                    >
                      <p className="text-xs font-semibold text-primary">{formatDateTime(a.scheduled_at)}</p>
                      <p className="mt-1 text-sm font-semibold">{a.service}</p>
                      {a.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{a.notes}</p>}
                      <PublishedVisitReport visit={a} expanded={linkedVisitId === a.id} />
                        <ClientPaidExtras visit={a}
                          quotes={(extras.data ?? []).filter((quote) => quote.appointment_id === a.id)}
                          onResponse={() => extras.refetch()} />
                    </li>
                  ))}
                  {!upcoming.length && (
                    <li className="text-sm text-muted-foreground">No visits scheduled yet.</li>
                  )}
                </ul>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="past-visits">
                <h2 id="past-visits" className={label}>
                  Visit history &amp; notes
                </h2>
                <ul className="mt-5 space-y-3">
                  {past.map((a) => (
                    <li key={a.id} id={`visit-${a.id}`} tabIndex={-1} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(a.scheduled_at)} · {a.status}
                        </p>
                        <p className="mt-1 text-sm font-semibold">{a.service}</p>
                        {a.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{a.notes}</p>}
                        <PublishedVisitReport visit={a} expanded={linkedVisitId === a.id} />
                        <ClientPaidExtras visit={a}
                          quotes={(extras.data ?? []).filter((quote) => quote.appointment_id === a.id)}
                          onResponse={() => extras.refetch()} />
                      </div>
                    </li>
                  ))}
                  {!past.length && (
                    <li className="text-sm text-muted-foreground">No past appointments yet.</li>
                  )}
                </ul>
              </section>
              <div className="lg:col-span-2">
                {extras.isError && <p role="alert" className="mb-4 text-sm text-destructive">Could not load paid extras. Try refreshing the page.</p>}
                <ServiceRequests key={property.id} propertyId={property.id} visits={upcoming} />
              </div>
            </div>
          )}

          {tab === "membership" && (
            <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
              <section className="panel rounded-sm p-6" aria-labelledby="plan">
                <h2 id="plan" className={label}>
                  <CreditCard className="size-3.5 text-primary" />
                  Active plan
                </h2>
                <p className="font-display mt-4 text-3xl">
                  {profile.data?.membership_tier ?? "—"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Payment status:{" "}
                  <span
                    className={
                      profile.data?.payment_status === "Paid" ? "text-emerald-400" : "text-destructive"
                    }
                  >
                    {profile.data?.payment_status ?? "—"}
                  </span>
                </p>
                {profile.data?.phone && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Contact on file: {profile.data.phone}
                  </p>
                )}

                {state !== "active" ? (
                  <div className="mt-6 space-y-3 rounded-sm border border-border bg-background/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Auto-renewal is off. You keep full access until{" "}
                      {formatDateTime(profile.data?.current_period_end ?? null)}. Reactivating keeps
                      your {profile.data?.membership_tier ?? "current"} plan
                      {profile.data?.billing_period
                        ? ` · ${profile.data.billing_period.toLowerCase()}`
                        : ""}
                      .
                    </p>
                    <button
                      type="button"
                      disabled={reactivateBusy}
                      onClick={() => void handleReactivate()}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {reactivateBusy && <Loader2 className="size-3.5 animate-spin" />}
                      Reactivate membership
                    </button>
                    {renewalInvoiceId && (
                      <div className="border-t border-border pt-4">
                        <InvoicePayment
                          invoiceId={renewalInvoiceId}
                          onPaid={async () => {
                            setRenewalInvoiceId(null);
                            toast.success("Membership reactivated — payment received.");
                            await profile.refetch();
                            await invoices.refetch();
                            await billing.refetch();
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={cancelBusy}
                    onClick={async () => {
                      if (!confirm("Cancel automatic renewal of your membership?")) return;
                      setCancelBusy(true);
                      try {
                        const res = await cancelPlan();
                        setCancelNotice(
                          res.ok
                            ? "Renewal cancelled. Access stays open until the end of your paid period."
                            : res.error,
                        );
                        await profile.refetch();
                        await billing.refetch();
                      } finally {
                        setCancelBusy(false);
                      }
                    }}
                    className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm transition-colors hover:border-destructive/60 hover:text-destructive disabled:opacity-60"
                  >
                    {cancelBusy && <Loader2 className="size-4 animate-spin" />}
                    Request cancellation
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setRescheduleOpen(true)}
                  className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary/50 px-6 text-sm text-primary transition-colors hover:bg-primary/10 sm:mt-6 sm:ml-3"
                >
                  <CalendarClock className="size-4" />
                  Reschedule service
                </button>
                {cancelNotice && <p className="mt-3 text-xs text-primary">{cancelNotice}</p>}

                <div className="mt-8 border-t border-border pt-6">
                  <h3 className={label}>
                    <Wallet className="size-3.5 text-primary" />
                    Payment method
                  </h3>
                  {billing.isLoading ? (
                    <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Loading billing details…
                    </p>
                  ) : billing.data?.hasBilling ? (
                    <>
                      <p className="mt-4 text-sm">
                        {billing.data.card
                          ? `${cardBrand(billing.data.card.brand)} ending in ${billing.data.card.last4}`
                          : "No card on file"}
                      </p>
                      {billing.data.card && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Exp {String(billing.data.card.expMonth).padStart(2, "0")}/
                          {String(billing.data.card.expYear).slice(-2)}
                          {billing.data.period ? ` · billed ${billing.data.period.toLowerCase()}` : ""}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => void manageCard()}
                        disabled={billingBusy}
                        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-60"
                      >
                        {billingBusy && <Loader2 className="size-4 animate-spin" />}
                        Update payment method
                      </button>
                    </>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">
                      No saved card found for your account. Add one with “Update payment method”, or
                      pay invoices individually below.
                    </p>
                  )}
                  {billingError && (
                    <p className="mt-3 text-xs text-destructive">{billingError}</p>
                  )}
                </div>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="invoices">
                <h2 id="invoices" className={label}>
                  Membership &amp; service invoices
                </h2>
                <ul className="mt-5 space-y-3">
                  {(invoices.data ?? []).map((inv) => (
                    <li
                      key={inv.id}
                      id={`invoice-${inv.id}`}
                      tabIndex={-1}
                      className="rounded-sm border border-border bg-background/40 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm break-words">{inv.description}</p>
                          <p className="text-xs break-words text-muted-foreground">
                            {new Date(inv.issued_at).toLocaleDateString()} ·{" "}
                            {inv.kind ?? "Membership"}
                            {inv.period ? ` · ${inv.period}` : ""}
                            {inv.due_date
                              ? ` · due ${new Date(`${inv.due_date}T00:00:00`).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">

                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatMoney(inv.amount_cents)}</p>
                            <p
                              className={`text-[11px] uppercase ${
                                inv.status === "Paid" ? "text-emerald-400" : "text-destructive"
                              }`}
                            >
                              {inv.status}
                            </p>
                          </div>
                          {inv.status !== "Paid" && (
                            <button
                              type="button"
                              onClick={() => setPayingId(payingId === inv.id ? null : inv.id)}
                              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              <CreditCard className="size-3.5" />
                              {payingId === inv.id ? "Close" : "Pay now"}
                            </button>
                          )}
                        </div>
                      </div>
                      {payingId === inv.id && inv.status !== "Paid" && (
                        <div className="mt-4 border-t border-border pt-4">
                          <InvoicePayment
                            invoiceId={inv.id}
                            onPaid={async () => {
                              await invoices.refetch();
                              setPayingId(null);
                            }}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                  {!invoices.data?.length && (
                    <li className="text-sm text-muted-foreground">No invoices yet.</li>
                  )}
                </ul>
              </section>

            </div>
          )}

          {rescheduleOpen && (
            <RescheduleModal
              appointments={upcoming}
              blocked={blockedSlots.data ?? []}
              onClose={() => setRescheduleOpen(false)}
              onDone={async () => {
                await appointments.refetch();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
