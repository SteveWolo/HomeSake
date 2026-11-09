import { healthCheck } from "@/lib/home-health";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";

import { AdminPaidExtras } from "@/components/portal/paid-extras";
import { VisitReportContent } from "@/components/portal/visit-report";
import { defaultBenefitModules } from "@/lib/membership-benefits-content";
import { sendPublishedVisitReportEmail } from "@/lib/notifications.functions";
import { formatDateTime, type Appointment } from "@/lib/portal";
import {
  checkStates, conditions, emptyVisitReport, loadVisitDraft, readVisitReport, saveTechnicianDraft, saveVisitDraft, uploadVisitReportPhoto,
  type VisitReport,
} from "@/lib/visit-workspace";

const button = "rounded-full border border-border px-4 py-2 text-sm disabled:opacity-50";
const primary = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const input = "w-full rounded-sm border border-border bg-background p-3 text-sm";

export function VisitWorkspace({ visit, nextVisit, plan, requests, onPublished }: {
  visit: Appointment;
  nextVisit: Appointment | undefined;
  plan?: string | null;
  requests: { id: string; kind: string; details: string; status: string }[];
  onPublished: () => Promise<unknown>;
}) {
  const draft = useQuery({ queryKey: ["visit-report-draft", visit.id], queryFn: () => loadVisitDraft(visit.id) });
  if (draft.isPending) return <p role="status">Loading visit workspace…</p>;
  if (draft.isError) return <p role="alert">Could not load this visit. <button type="button"
    className="underline" onClick={() => void draft.refetch()}>Retry</button></p>;
  const published = readVisitReport(visit.published_report);
  return (
    <>
      {draft.data?.submittedAt && <p className="mt-3 font-semibold text-primary">Technician submitted this draft for review.</p>}
      <AdminPaidExtras visit={visit} requests={requests} />
      <VisitEditor visit={visit} nextVisit={nextVisit} plan={plan ?? null} requests={requests} initial={draft.data} published={published}
        onPublished={onPublished} />
    </>
  );
}

export function VisitEditor({ visit, nextVisit, plan, requests, initial, published, onPublished, technician = false }: {
  visit: Appointment;
  nextVisit: Appointment | undefined;
  plan: string | null;
  requests: { id: string; kind: string; details: string; status: string }[];
  initial: Awaited<ReturnType<typeof loadVisitDraft>>;
  published: VisitReport | null;
  technician?: boolean;
  onPublished: () => Promise<unknown>;
}) {
  const [report, setReport] = useState<VisitReport>(() => {
    const source = initial?.report ?? published ?? { ...emptyVisitReport, summary: visit.visit_report ?? "" };
    const taskPhotos = new Set(source.checks.flatMap((check) => check.photos ?? []));
    return { ...source, photos: source.photos.filter((path) => !taskPhotos.has(path)) };
  });
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [revision, setRevision] = useState(initial?.revision ?? null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [followUpsOnly, setFollowUpsOnly] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState(true);
  const [hasPublished, setHasPublished] = useState(Boolean(published));
  const notify = useServerFn(sendPublishedVisitReportEmail);
  const queryClient = useQueryClient();
  const month = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/Chicago" })
    .format(new Date(visit.scheduled_at)));
  const season = month >= 4 && month <= 9 ? "spring" : "fall";
  const awayVisit = /\b(away|vacation|home watch)\b/i.test(visit.service);
  const seasonalModules = plan === "Signature" || plan === "Estate" ? ["standard", season] : ["standard"];
  const suggestedModules = awayVisit ? ["away"] : seasonalModules;
  const addModules = (ids: string[]) => {
    setReport((current) => {
      const titles = new Set(current.checks.map((item) => item.title));
      const additions = defaultBenefitModules.filter((module) => ids.includes(module.id))
        .flatMap((module) => module.items)
        .filter((title) => {
          if (titles.has(title)) return false;
          titles.add(title);
          return true;
        }).map((title) => ({ title, status: null }));
      return { ...current, checks: [...current.checks, ...additions] };
    });
  };

  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The visit could not be updated.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const updateCheck = (index: number, changes: Partial<VisitReport["checks"][number]>) =>
    setReport((current) => ({ ...current, checks: current.checks.map((check, i) =>
      i === index ? { ...check, ...changes,
        ...(changes.status !== undefined && changes.status !== "Needs attention" ? { urgent: false } : {}),
        ...(!("condition" in changes) && "status" in changes ? { condition: undefined } : {}),
      } : check) }));

  const preview = {
    ...report,
    checks: report.checks.flatMap((check) =>
      check.status ? [check] : check.note?.trim() || check.photos?.length
        ? [{ ...check, status: "Needs attention" as const }] : []),
  };
  const checkableTasks = report.checks.filter((task) => !task.condition && (task.status === null || task.status === "Completed"));
  const allChecked = checkableTasks.length > 0 && checkableTasks.every((task) => task.status === "Completed");
  const followUpCount = report.checks.filter((task) => task.status === "Needs attention").length;
  const photoCount = report.photos.length + report.checks.reduce((count, check) => count + (check.photos?.length ?? 0), 0);
  const uploadTaskPhoto = (index: number, file: File) => run(async () => {
    const path = await uploadVisitReportPhoto(visit.id, file);
    updateCheck(index, { photos: [...(report.checks[index]?.photos ?? []), path] });
    setNotice("Task photo attached. Save the draft to keep it.");
  });

  const carryForward = (task: VisitReport["checks"][number]) => run(async () => {
    if (!nextVisit) return;
    const draft = await loadVisitDraft(nextVisit.id);
    const target = draft?.report ?? readVisitReport(nextVisit.published_report) ??
      { ...emptyVisitReport, summary: nextVisit.visit_report ?? "" };
    const existing = target.checks.find((check) => check.title === task.title);
    const note = task.note?.trim();
    if (existing && (existing.condition || existing.status === "Completed" || existing.status === "Not applicable" || existing.note?.trim() || (existing.status === "Needs attention" && !note))) {
      setNotice("This task already has an outcome or note on the next visit. Open that visit to review it.");
      return;
    }
    const followUp = { ...existing, title: task.title, status: "Needs attention" as const, note };
    const nextReport = {
      ...target,
      checks: existing ? target.checks.map((check) => check === existing ? followUp : check)
        : [...target.checks, followUp],
    };
    const nextRevision = await saveVisitDraft(nextVisit.id, draft?.revision ?? null, nextReport, draft?.notes ?? "", false);
    queryClient.setQueryData(["visit-report-draft", nextVisit.id], {
      report: nextReport, notes: draft?.notes ?? "", revision: nextRevision,
    });
    setNotice(`Follow-up added to the draft for ${formatDateTime(nextVisit.scheduled_at)}.`);
  });

  const save = (publish: boolean) => run(async () => {
    const next = { ...report, summary: report.summary.trim() };
    if (publish) {
      if (!reviewed) throw new Error("Confirm you reviewed the checklist before publishing.");
      if (report.checks.some((task) => task.status === "Needs attention" && task.urgent && !task.note?.trim())) {
        throw new Error("Add a note with the recommended next step for every urgent task.");
      }
      next.checks = preview.checks;
      if (!next.summary && !next.checks.length && !next.photos.length) {
        throw new Error("Add a summary, a checked item, or a photo before publishing.");
      }
    }
    // Draft retains unfinished checklist items. The published snapshot is filtered in SQL.
    const savedReport = {
      ...report,
      summary: next.summary,
      checks: report.checks.map((check) => publish && !check.status && (check.note?.trim() || check.photos?.length)
        ? { ...check, status: "Needs attention" as const } : check),
    };
    // The storage policy authorizes photos from the published report's top-level list.
    const outgoing = publish ? {
      ...savedReport,
      photos: [...new Set([...report.photos, ...preview.checks.flatMap((check) => check.photos ?? [])])],
    } : savedReport;
    const savedRevision = technician
      ? await saveTechnicianDraft(visit.id, revision, savedReport, publish)
      : await saveVisitDraft(visit.id, revision, outgoing, notes, publish);
    setRevision(savedRevision);
    setReport(savedReport);
    if (technician) {
      setNotice(publish ? "Draft submitted for admin review." : "Draft saved.");
      await onPublished();
      return;
    }
    queryClient.setQueryData(["visit-report-draft", visit.id], {
      report: savedReport, notes, revision: savedRevision, submittedAt: initial?.submittedAt ?? null,
    });
    if (!publish) {
      setNotice("Private draft saved.");
      return;
    }
    setHasPublished(true);
    setNotice("Report published to the client dashboard.");
    if (email) {
      try {
        await notify({ data: { appointmentId: visit.id } });
        setNotice("Report published and client email sent.");
      } catch {
        setNotice("Report published. Email failed. You can retry with Email published report.");
      }
    }
    await onPublished();
  });

  return (
    <div className="mt-4 space-y-5">
      <div className="rounded-sm border border-border p-4">
        <p className="font-semibold">{visit.service}</p>
        <p className="text-sm text-muted-foreground">{formatDateTime(visit.scheduled_at)} · {visit.status}{plan ? ` · ${plan}` : ""}</p>
        {visit.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{visit.notes}</p>}
        {requests.length > 0 && <div className="mt-3">
          <h4 className="font-semibold">Client requests for this visit</h4>
          <ul className="space-y-1 text-sm">{requests.map((request) => (
            <li key={request.id}><strong>{request.kind} · {request.status}:</strong> {request.details}</li>
          ))}</ul>
        </div>}
      </div>
      {mode === "edit" ? (
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm">Client-facing summary and next steps
            <textarea className={input} rows={4} maxLength={4000} value={report.summary}
              onChange={(event) => setReport({ ...report, summary: event.target.value })} />
          </label>
          {!technician && <label className="block text-sm">Private staff notes
            <textarea className={input} rows={3} maxLength={4000} value={notes}
              onChange={(event) => setNotes(event.target.value)} />
          </label>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={() => addModules(suggestedModules)}>Load suggested checklist</button>
            <select aria-label="Add a checklist module" className="rounded-sm border border-border bg-background px-3 py-2 text-sm" value=""
              onChange={(event) => addModules([event.target.value])}>
              <option value="">Add a checklist module…</option>
              {defaultBenefitModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}
            </select>
          </div>
          {report.checks.length > 0 && (
            <details open>
              <summary className="cursor-pointer font-semibold">Checklist · {report.checks.filter((item) => item.status === "Completed").length} of {report.checks.length} completed</summary>
              <label className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="size-4" checked={allChecked} disabled={!checkableTasks.length}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setReport((current) => ({
                      ...current,
                      checks: current.checks.map((task) => checked && !task.condition && task.status === null
                        ? { ...task, status: "Completed" }
                        : !checked && !task.condition && task.status === "Completed" ? { ...task, status: null } : task),
                    }));
                  }} />
                Check all
              </label>
              <p className="mt-1 text-xs text-muted-foreground">Rated tasks and tasks marked Needs attention or Not applicable keep their outcome.</p>
              {!technician && <p className="mt-1 text-xs text-muted-foreground">{nextVisit
                ? `Follow-ups go to the draft for ${formatDateTime(nextVisit.scheduled_at)}.`
                : "Schedule a later visit to carry tasks forward."}</p>}
              {(followUpCount > 0 || followUpsOnly) && <button type="button" className={`${button} mt-2`}
                aria-pressed={followUpsOnly} onClick={() => setFollowUpsOnly(!followUpsOnly)}>
                {followUpsOnly ? "Show all tasks" : `Show follow-ups (${followUpCount})`}
              </button>}
              <ol className="mt-2 max-h-[28rem] divide-y divide-border overflow-y-auto rounded-sm border border-border px-3">
                {report.checks.map((item, i) => (!followUpsOnly || item.status === "Needs attention") && (
                  <li key={i} className="space-y-2 py-3 text-sm">
                    <label className="flex items-start gap-2">
                      <input type="checkbox" className="mt-1 size-4" checked={item.status === "Completed"}
                        onChange={(event) => updateCheck(i, { status: event.target.checked ? "Completed" : null })} />
                      {item.title}
                    </label>
                    {item.status !== "Completed" && <select aria-label={`Outcome for ${item.title}`}
                      className="min-h-10 rounded-sm border border-border bg-background px-2"
                      value={item.status ?? ""} onChange={(event) => updateCheck(i, {
                        status: checkStates.find((option) => option === event.target.value) ?? null,
                      })}>
                      <option value="">Not checked</option>
                      <option>Needs attention</option>
                      <option>Not applicable</option>
                    </select>}
                    {healthCheck(item.title) && <label className="flex flex-wrap items-center gap-2">
                      Condition · {healthCheck(item.title)?.weight} points
                      <select className="min-h-10 rounded-sm border border-border bg-background px-2"
                        value={item.condition ?? ""} onChange={(event) => {
                          const condition = conditions.find((value) => value === event.target.value);
                          if (!condition) {
                            updateCheck(i, { condition: undefined });
                            return;
                          }
                          const status = condition === "Good" ? "Completed"
                            : condition === "Not applicable" ? "Not applicable" : "Needs attention";
                          updateCheck(i, { condition, status, urgent: condition === "Urgent issue" });
                        }}>
                        <option value="">Not rated</option>
                        {conditions.map((condition) => <option key={condition}>{condition}</option>)}
                      </select>
                    </label>}
                    {item.status === "Needs attention" && <label className="flex items-center gap-2 text-destructive">
                      <input type="checkbox" checked={Boolean(item.urgent)} disabled={Boolean(item.condition)}
                        onChange={(event) => updateCheck(i, { urgent: event.target.checked })} />
                      Needs immediate attention
                    </label>}
                    <div className="flex flex-wrap items-start gap-2">
                      <details className="min-w-0">
                        <summary className={`${button} cursor-pointer`}>Notes{item.note?.trim() ? " ✓" : ""}</summary>
                        <label className="mt-2 block">Client note
                          <textarea className={input} maxLength={1000} rows={2} value={item.note ?? ""}
                            placeholder="What did you do, or why couldn’t you finish?"
                            onChange={(event) => updateCheck(i, { note: event.target.value })} />
                        </label>
                      </details>
                      <label className={`${button} cursor-pointer focus-within:ring-2 focus-within:ring-primary`}>
                        Pics{item.photos?.length ? ` (${item.photos.length})` : ""}
                        <input className="sr-only" aria-label={`Add a picture for ${item.title}`}
                          type="file" accept="image/*" disabled={photoCount >= 12}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) void uploadTaskPhoto(i, file);
                          }} />
                      </label>
                    </div>
                      {!!item.photos?.length && <VisitReportContent report={{ ...emptyVisitReport, photos: item.photos }} />}
                      {item.photos?.map((path, index) => <button type="button" key={path} className={button}
                        onClick={() => updateCheck(i, { photos: item.photos?.filter((photo) => photo !== path) ?? [] })}>
                        Remove task photo {index + 1}
                      </button>)}
                    {!technician && (item.status === "Needs attention" || item.status === null) && (
                      <button type="button" className={button} disabled={!nextVisit}
                        title={nextVisit ? formatDateTime(nextVisit.scheduled_at) : "Schedule a later visit first"}
                        onClick={() => void carryForward(item)}>Carry forward to next visit</button>
                    )}
                  </li>
                ))}
              </ol>
            </details>
          )}
          <label className="block text-sm">General report photos ({photoCount}/12 photos used)
            <input className="mt-2 block w-full" type="file" accept="image/*" disabled={photoCount >= 12}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void run(async () => {
                  const path = await uploadVisitReportPhoto(visit.id, file);
                  setReport((current) => ({ ...current, photos: [...current.photos, path] }));
                  setNotice("Photo attached. Save the draft to keep it.");
                });
              }} />
          </label>
          {report.photos.length > 0 && <div>
            <VisitReportContent report={{ ...emptyVisitReport, photos: report.photos }} />
            <div className="mt-2 flex flex-wrap gap-2">
              {report.photos.map((path, i) => <button type="button" className={button} key={path}
                onClick={() => setReport({ ...report, photos: report.photos.filter((photo) => photo !== path) })}>
                Remove photo {i + 1}
              </button>)}
            </div>
          </div>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} onClick={() => void save(false)}>Save draft</button>
            <button type="button" className={primary} onClick={() => { setReviewed(false); setMode("preview"); }}>Finish visit · Review report</button>
          </div>
        </fieldset>
      ) : (
        <section className="space-y-4 rounded-sm border border-border p-4">
          <h4 className="font-semibold">{technician ? "Review before submitting" : "Review before publishing"}</h4>
          <dl className="flex flex-wrap gap-4 text-sm">
            <div><dt>Completed</dt><dd className="font-semibold">{preview.checks.filter((task) => task.status === "Completed").length}</dd></div>
            <div><dt>Follow-up</dt><dd className="font-semibold">{preview.checks.filter((task) => task.status === "Needs attention").length}</dd></div>
            <div><dt>Not applicable</dt><dd className="font-semibold">{preview.checks.filter((task) => task.status === "Not applicable").length}</dd></div>
            <div><dt>Unchecked</dt><dd className="font-semibold">{report.checks.length - preview.checks.length}</dd></div>
          </dl>
          <p className="text-sm text-muted-foreground">Unchecked tasks with a client note or photo appear under Needs attention.</p>
          <VisitReportContent report={preview} reviewing />
          {report.checks.length > preview.checks.length && <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Review unchecked tasks</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {report.checks.filter((task) => !task.status && !task.note?.trim() && !task.photos?.length)
                .map((task, i) => <li key={i}>{task.title}</li>)}
            </ul>
          </details>}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={reviewed} disabled={busy} onChange={(event) => setReviewed(event.target.checked)} />
            I reviewed the checklist and confirmed that every task marked complete was done.
          </label>
          {!technician && <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={email} disabled={busy} onChange={(event) => setEmail(event.target.checked)} />
            Email the client a link after publishing
          </label>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy} onClick={() => setMode("edit")}>Back to editing</button>
            <button type="button" className={primary} disabled={busy || !reviewed} onClick={() => void save(true)}>{technician ? "Submit for admin review" : "Publish report"}</button>
          </div>
        </section>
      )}
      {!technician && hasPublished && <button type="button" disabled={busy} className={button} onClick={() => void run(async () => {
        await notify({ data: { appointmentId: visit.id } });
        setNotice("The published report email was accepted.");
      })}>Email published report</button>}
      {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    </div>
  );
}
