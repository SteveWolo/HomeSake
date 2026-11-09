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
  const [selected, setSelected] = useState<string | null>(null);
  const jobs = useQuery({
    queryKey: ["technician-jobs", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("technician_jobs");
      if (error) throw new Error(error.message);
      return data as unknown as Job[];
    },
  });
  const job = jobs.data?.find((item) => item.id === selected);
  const draft = job?.draft ? readVisitReport(job.draft.report) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">My visits</h1>
        <button type="button" className="underline" onClick={async () => {
          await supabase.auth.signOut();
          cache.clear();
          await navigate({ to: "/tech-login", replace: true });
        }}>Sign out</button>
      </header>
      {jobs.isPending && <p role="status">Loading assigned visits…</p>}
      {jobs.isError && <p role="alert">Couldn’t load your visits. <button className="underline" onClick={() => void jobs.refetch()}>Try again</button></p>}
      {!job && jobs.data?.length === 0 && <p>No scheduled visits are assigned to you.</p>}
      {!job && jobs.data?.map((item) => (
        <article className="panel rounded-sm p-4" key={item.id}>
          <h2 className="font-semibold">{item.service}</h2>
          <p>{formatDateTime(item.scheduled_at)}</p>
          <p>{item.address}</p>
          {item.draft?.submittedAt && <p className="text-sm text-primary">Submitted for review</p>}
          <button className="mt-3 rounded-full bg-primary px-4 py-2 text-primary-foreground" onClick={() => setSelected(item.id)}>Open visit</button>
        </article>
      ))}
      {job && <section className="panel rounded-sm p-4">
        <button type="button" className="mb-3 underline" onClick={() => setSelected(null)}>Back to assigned visits</button>
        <h2 className="font-semibold">{job.address}</h2>
        <a className="text-primary underline" href={`https://maps.apple.com/?q=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer">Directions</a>
        {job.draft?.submittedAt && <p className="text-sm text-primary">Submitted for review</p>}
        {job.draft && !draft ? <p role="alert">This draft could not be read. Ask your admin to review it.</p> :
          <VisitEditor key={job.id} visit={job} nextVisit={undefined} plan={null} requests={[]}
            initial={draft && job.draft ? { report: draft, revision: job.draft.revision, notes: "", submittedAt: job.draft.submittedAt } : null}
            published={readVisitReport(job.published_report)} technician onPublished={() => jobs.refetch()} />}
      </section>}
      <Link to="/" className="text-sm underline">HomeSake home</Link>
    </main>
  );
}
