import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  formatDateTime,
  listServiceRequests,
  serviceRequestKinds,
  submitServiceRequest,
  type Appointment,
} from "@/lib/portal";

const field = "w-full rounded-sm border border-border bg-background/60 p-3 text-sm";

export function ServiceRequests({ propertyId, visits }: { propertyId: string; visits: Appointment[] }) {
  const [kind, setKind] = useState<(typeof serviceRequestKinds)[number]>("Next visit request");
  const [selectedVisit, setSelectedVisit] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const sending = useRef(false);
  const requests = useQuery({
    queryKey: ["service-requests", propertyId],
    queryFn: () => listServiceRequests(propertyId),
    refetchInterval: 30_000,
  });

  const requestedVisit = selectedVisit ?? (kind === "Next visit request" || kind === "Cancel visit"
    ? visits[0]?.id ?? "" : "");
  const visitId = visits.some((visit) => visit.id === requestedVisit) ? requestedVisit : "";

  return (
    <section className="panel rounded-sm p-6" aria-labelledby="request-service">
      <h2 id="request-service" className="font-display text-xl">Request a service change</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask to add or cancel a service, cancel a visit, or request something for your next visit.
        Your booking and charges stay the same while Homesake reviews the request.
      </p>
      <form className="mt-4 grid gap-3" onSubmit={async (event) => {
        event.preventDefault();
        if (sending.current || !details.trim() || (kind === "Cancel visit" && !visitId)) return;
        sending.current = true;
        setSaving(true);
        setNotice("");
        try {
          await submitServiceRequest({ propertyId, appointmentId: visitId || null, kind, details });
          setDetails("");
          setNotice("Request sent. You can track its status below.");
          await requests.refetch();
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Could not send your request.");
        } finally {
          sending.current = false;
          setSaving(false);
        }
      }}>
        <label className="text-sm">What would you like to do?
          <select className={field} value={kind} onChange={(event) => {
            const next = serviceRequestKinds.find((option) => option === event.target.value);
            if (next) setKind(next);
            setSelectedVisit(null);
          }}>
            {serviceRequestKinds.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="text-sm">Related visit
          <select className={field} value={visitId} required={kind === "Cancel visit"}
            onChange={(event) => setSelectedVisit(event.target.value)}>
            <option value="">{kind === "Cancel visit" ? "Choose an upcoming visit" : "No visit selected"}</option>
            {visits.map((visit) => (
              <option key={visit.id} value={visit.id}>{formatDateTime(visit.scheduled_at)} · {visit.service}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">Tell us what you need
          <textarea className={field} required rows={3} maxLength={1000} value={details}
            onChange={(event) => setDetails(event.target.value)} />
        </label>
        <button type="submit" disabled={saving || (kind === "Cancel visit" && !visitId)}
          className="w-fit rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Sending…" : "Send request"}
        </button>
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </form>
      <h3 className="mt-6 font-semibold">Your requests</h3>
      {requests.isError && <p role="alert" className="mt-2 text-sm text-destructive">Could not load requests.</p>}
      {!requests.isPending && !requests.isError && !requests.data?.length && (
        <p className="mt-2 text-sm text-muted-foreground">No requests yet.</p>
      )}
      <ul className="mt-2 space-y-3">
        {(requests.data ?? []).map((request) => (
          <li key={request.id} className="rounded-sm border border-border p-3">
            <p className="text-sm font-semibold">{request.kind} · {request.status}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(request.created_at)}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{request.details}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
