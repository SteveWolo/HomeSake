import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { VisitEditor } from "@/components/portal/visit-workspace";
import { resolveRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, type Appointment } from "@/lib/portal";
import { readVisitReport } from "@/lib/visit-workspace";
import type { Json } from "@/integrations/supabase/types";

type Job = Appointment & {
  address: string;
  client_name?: string | null;
  draft: { report: Json; revision: string; submittedAt: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/tech")({
  beforeLoad: async ({ context }) => {
    if (await resolveRole(context.user.id) !== "technician") throw redirect({ to: "/tech-login" });
  },
  component: TechnicianDashboard,
});

function TechnicianDashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [propertyId, setPropertyId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const jobs = useQuery({
    queryKey: ["technician-jobs", user.id],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("technician_jobs");
      if (error) throw new Error(error.message);
      return data as unknown as Job[];
    },
  });
  const job = jobs.data?.find((item) => item.id === selected);
  const draft = job?.draft ? readVisitReport(job.draft.report) : null;

  const allJobs = jobs.data ?? [];
  const clients = [...new Map(allJobs.map((item) => [item.property_id, item])).values()]
    .sort((a, b) => (a.client_name || a.address).localeCompare(b.client_name || b.address));
  const selectedClient = clients.find((item) => item.property_id === propertyId);
  const visibleJobs = selectedClient ? allJobs.filter((item) => item.property_id === selectedClient.property_id) : allJobs;
  const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" });
  const today = localDay.format(new Date());
  const sections = [
    { title: "Today", visits: visibleJobs.filter((item) => localDay.format(new Date(item.scheduled_at)) === today) },
    { title: "Upcoming appointments", visits: visibleJobs.filter((item) => localDay.format(new Date(item.scheduled_at)) > today) },
    { title: "Earlier scheduled visits", visits: visibleJobs.filter((item) => localDay.format(new Date(item.scheduled_at)) < today) },
  ];

  return (
    <div className="portal-redesign min-h-screen">
    <main className="mx-auto max-w-3xl space-y-4 px-4 pb-8">
      <header className="portal-brand -mx-4 flex items-center justify-between gap-3 px-4 py-4 sm:mx-0 sm:rounded-b-lg">
        <h1 className="font-display text-3xl">{job ? "Visit checklist" : "My jobs"}</h1>
        <button type="button" className="min-h-11 text-sm underline" onClick={async () => {
          await supabase.auth.signOut();
          cache.clear();
          await navigate({ to: "/tech-login", replace: true });
        }}>Sign out</button>
      </header>
      {jobs.isPending && <p role="status">Loading assigned visits…</p>}
      {jobs.isError && <p role="alert">Couldn’t load your visits. <button className="underline" onClick={() => void jobs.refetch()}>Try again</button></p>}
      {!job && jobs.data?.length === 0 && <p>No scheduled visits are assigned to you.</p>}
      {!job && clients.length > 0 && <>
        <label className="panel grid gap-2 rounded-sm p-4 font-semibold">
          Select a client or property
          <select className="min-h-12 w-full rounded-sm border border-border bg-background p-2 text-sm"
            value={selectedClient?.property_id ?? ""} onChange={(event) => setPropertyId(event.target.value)}>
            <option value="">All assigned clients</option>
            {clients.map((item) => <option key={item.property_id} value={item.property_id}>
              {item.client_name ? `${item.client_name} · ` : ""}{item.address}
            </option>)}
          </select>
        </label>
        {sections.map(({ title, visits }) => (visits.length > 0 || title === "Upcoming appointments") && (
          <section key={title} className="space-y-3">
            <h2 className="font-display text-xl">{title}</h2>
            {!visits.length && <p className="text-sm text-muted-foreground">No upcoming visits for this selection.</p>}
            {visits.map((item) => (
              <article className="panel flex flex-wrap items-center justify-between gap-3 p-4" key={item.id}>
                <div className="min-w-0 break-words">
                <h3 className="font-semibold">{item.service}</h3>
                <p className="text-sm">{formatDateTime(item.scheduled_at)}</p>
                {item.client_name && <p className="mt-1 font-medium">{item.client_name}</p>}
                <p className="text-sm">{item.address}</p>
                {item.draft?.submittedAt && <p className="text-sm text-primary">Submitted for review</p>}
                </div>
                <button type="button" className="min-h-11 rounded-full bg-primary px-4 py-2 text-primary-foreground"
                  onClick={() => { setSelected(item.id); window.scrollTo(0, 0); }}>Open checklist</button>
              </article>
            ))}
          </section>
        ))}
      </>}
      {job && <section className="panel rounded-sm p-4">
        <button type="button" className="mb-3 min-h-11 text-sm underline" onClick={() => setSelected(null)}>Back to clients and visits</button>
        <h2 className="text-lg font-semibold">{job.client_name || job.address}</h2>
        {job.client_name && <p className="text-sm">{job.address}</p>}
        <a className="mt-2 inline-flex min-h-11 items-center rounded-sm border border-border px-3 text-sm font-semibold text-primary" href={`https://maps.apple.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer">Directions</a>
        {job.draft?.submittedAt && <p className="text-sm text-primary">Submitted for review</p>}
        {job.draft && !draft ? <p role="alert">This draft could not be read. Ask your admin to review it.</p> :
          <VisitEditor key={job.id} visit={job} nextVisit={undefined} plan={null} requests={[]}
            initial={draft && job.draft ? { report: draft, revision: job.draft.revision, notes: "", submittedAt: job.draft.submittedAt } : null}
            published={readVisitReport(job.published_report)} technician onPublished={() => jobs.refetch()} />}
      </section>}
      <Link to="/" className="text-sm underline">HomeSake home</Link>
    </main>
    </div>
  );
}
