import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatDateTime, type Appointment } from "@/lib/portal";
import { readVisitReport } from "@/lib/visit-workspace";

const categories = [
  { id: "hvac", title: "HVAC filters", match: /^(check|replace) (approved )?HVAC filter/i },
  { id: "smoke", title: "Smoke detectors", match: /^(test|check) smoke[- ]detectors?/i },
  { id: "sump", title: "Sump pumps", match: /^(visually check|test|check) sump (pump|backup-battery)/i },
  { id: "softener", title: "Water softeners", match: /^(check|refill) water[- ]softener/i },
];

type RecordDetails = Pick<Tables<"maintenance_records">, "location" | "specifications" | "notes">;
const empty: RecordDetails = { location: "", specifications: "", notes: "" };
const fields = [
  { key: "location", label: "Location", max: 250 },
  { key: "specifications", label: "Size or equipment details", max: 500 },
  { key: "notes", label: "Client-visible notes", max: 2000 },
] as const;

function EquipmentForm({ propertyId, category, initial }: {
  propertyId: string; category: string; initial: RecordDetails;
}) {
  const [details, setDetails] = useState(initial);
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("maintenance_records").upsert({
        property_id: propertyId, category, ...details,
      });
      if (error) throw new Error(error.message);
      await cache.invalidateQueries({ queryKey: ["maintenance-record", propertyId] });
    },
  });
  return (
    <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      {fields.map(({ key, label, max }) => (
        <label key={key} className="grid gap-1 text-sm">
          {label}
          <textarea className="rounded-sm border border-border bg-background p-2" rows={key === "notes" ? 3 : 1}
            maxLength={max} value={details[key]} disabled={save.isPending}
            onChange={(event) => { save.reset(); setDetails({ ...details, [key]: event.target.value }); }} />
        </label>
      ))}
      <button type="submit" className="justify-self-start rounded-full border border-border px-4 py-2 text-sm"
        disabled={save.isPending}>{save.isPending ? "Saving…" : "Save equipment details"}</button>
      {save.isSuccess && <p role="status" className="text-sm">Equipment details saved.</p>}
      {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
    </form>
  );
}

export function MaintenanceRecord({ propertyId, visits, visitsLoading, visitsFailed, admin = false }: {
  propertyId: string; visits: Appointment[]; visitsLoading: boolean; visitsFailed: boolean; admin?: boolean;
}) {
  const [search, setSearch] = useState("");
  const records = useQuery({
    queryKey: ["maintenance-record", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("maintenance_records").select("*").eq("property_id", propertyId);
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const reports = visits.filter((visit) => visit.status !== "Cancelled")
    .map((visit) => ({ visit, report: readVisitReport(visit.published_report) }))
    .sort((a, b) => Date.parse(b.visit.scheduled_at) - Date.parse(a.visit.scheduled_at));
  const query = search.trim().toLowerCase();
  const entries = categories.map(({ id, title, match }) => {
    const details = records.data?.find((row) => row.category === id) ?? empty;
    const history = reports.flatMap(({ visit, report }) => {
      const tasks = report?.checks.filter((check) => check.status === "Completed" && match.test(check.title)) ?? [];
      return tasks.length ? [{ visit, tasks, photos: report?.photos.length ?? 0 }] : [];
    });
    const matches = [title, details.location, details.specifications, details.notes,
      ...history.flatMap(({ visit, tasks }) => [visit.service, ...tasks.map((task) => task.title)])]
      .some((value) => value.toLowerCase().includes(query));
    return { id, title, details, history, matches };
  }).filter((entry) => entry.matches);

  return (
    <section className="panel rounded-sm p-6" aria-labelledby="maintenance-record">
      <h2 id="maintenance-record" className="font-display text-xl">Home maintenance record</h2>
      <p className="mt-2 text-sm text-muted-foreground">Equipment details and work completed in published visit reports.</p>
      <label className="mt-4 grid gap-1 text-sm">
        Search equipment or service
        <input type="search" className="rounded-sm border border-border bg-background p-2" value={search}
          onChange={(event) => setSearch(event.target.value)} />
      </label>
      {(records.isPending || visitsLoading) && <p role="status" className="mt-3 text-sm">Loading maintenance records…</p>}
      {(records.isError || visitsFailed) && <p role="alert" className="mt-3 text-sm">Some maintenance records could not be loaded.</p>}
      {!entries.length && records.isSuccess && !visitsLoading && !visitsFailed && <p className="mt-3 text-sm">No matching equipment or work.</p>}
      <div className="mt-4 space-y-3">
        {entries.map(({ id, title, details, history }) => (
          <details key={id} className="rounded-sm border border-border p-4">
            <summary className="cursor-pointer font-semibold">
              {title}
              {history[0] && <span className="ml-2 text-sm font-normal text-muted-foreground">
                Last recorded service {formatDateTime(history[0].visit.scheduled_at)}
              </span>}
            </summary>
            {admin && records.isSuccess ? <EquipmentForm propertyId={propertyId} category={id} initial={details} /> : (
              <dl className="mt-3 space-y-2 text-sm">
                {fields.filter(({ key }) => details[key]).map(({ key, label }) => (
                  <div key={key}><dt className="font-semibold">{key === "notes" ? "Notes" : label}</dt>
                    <dd className="whitespace-pre-wrap break-words">{details[key]}</dd></div>
                ))}
              </dl>
            )}
            <h3 className="mt-4 text-sm font-semibold">Service history</h3>
            {!history.length && !visitsLoading && !visitsFailed && <p className="mt-1 text-sm text-muted-foreground">No completed tasks recorded yet.</p>}
            <ul className="mt-2 space-y-3">
              {history.map(({ visit, tasks, photos }) => (
                <li key={visit.id} className="border-l-2 border-primary/30 pl-3 text-sm">
                  <p className="font-semibold">{formatDateTime(visit.scheduled_at)} · {visit.service}</p>
                  {tasks.map((task, index) => <p key={index}>{task.title}</p>)}
                  {!admin && <Link to="/dashboard" search={{ visit: visit.id }} className="text-primary underline">
                    View visit report{photos ? ` and ${photos} visit photo${photos === 1 ? "" : "s"}` : ""}
                  </Link>}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
