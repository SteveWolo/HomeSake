import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { sendRescheduleAdminEmail } from "@/lib/notifications.functions";


import {
  VISIT_TIMES,
  formatDateTime,
  formatSlotTime,
  isSlotBlocked,
  rescheduleAppointment,
  type Appointment,
  type BlockedSlot,
} from "@/lib/portal";

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Next 21 selectable days, starting tomorrow. */
function upcomingDays() {
  const out: Date[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 21; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}

export function RescheduleModal({
  appointments,
  blocked,
  onClose,
  onDone,
}: {
  appointments: Appointment[];
  blocked: BlockedSlot[];
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const days = useMemo(upcomingDays, []);
  const [appointmentId, setAppointmentId] = useState(appointments[0]?.id ?? "");
  const [date, setDate] = useState<string>(toISODate(days[0]!));
  const [time, setTime] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const notifyAdmin = useServerFn(sendRescheduleAdminEmail);

  const dayFullyBlocked = (iso: string) =>
    VISIT_TIMES.every((t) => isSlotBlocked(blocked, iso, t));

  const submit = async () => {
    if (!appointmentId || !time) return;
    const previous = appointments.find((a) => a.id === appointmentId)?.scheduled_at ?? null;
    setBusy(true);
    try {
      await rescheduleAppointment(appointmentId, `${date}T${time}`);
      // The team is told by email; a failed notification must not block the member.
      void notifyAdmin({
        data: {
          appointmentId,
          previousAt: previous ?? new Date().toISOString(),
          newAt: new Date(`${date}T${time}`).toISOString(),
        },
      }).catch(() => undefined);
      toast.success("Visit rescheduled — your manager has been notified.");
      await onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reschedule that visit.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reschedule service"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/90 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="panel w-full max-w-2xl rounded-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Reschedule service</p>
            <h2 className="font-display mt-2 text-2xl">Pick a new visit time</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {appointments.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            You have no upcoming visit to move. Your manager will schedule the next one shortly.
          </p>
        ) : (
          <>
            <label className="mt-6 block text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Visit to move
            </label>
            <select
              value={appointmentId}
              onChange={(e) => setAppointmentId(e.target.value)}
              className="mt-2 h-11 w-full rounded-sm border border-border bg-background/60 px-4 text-sm outline-none focus:border-primary/70"
            >
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.service} — {formatDateTime(a.scheduled_at)}
                </option>
              ))}
            </select>

            <p className="mt-6 text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Choose a day
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {days.map((d) => {
                const iso = toISODate(d);
                const off = dayFullyBlocked(iso);
                const active = iso === date;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={off}
                    onClick={() => {
                      setDate(iso);
                      setTime("");
                    }}
                    className={`rounded-sm border px-2 py-3 text-center text-xs transition-colors ${
                      active
                        ? "border-primary/60 bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    } ${off ? "cursor-not-allowed opacity-35" : ""}`}
                  >
                    <span className="block">
                      {d.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="mt-1 block text-sm text-foreground">{d.getDate()}</span>
                    <span className="block">
                      {d.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-6 text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Choose a time
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {VISIT_TIMES.map((t) => {
                const off = isSlotBlocked(blocked, date, t);
                return (
                  <button
                    key={t}
                    type="button"
                    disabled={off}
                    onClick={() => setTime(t)}
                    className={`rounded-full border px-5 py-2 text-xs transition-colors ${
                      time === t
                        ? "border-primary/60 bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    } ${off ? "cursor-not-allowed line-through opacity-35" : ""}`}
                  >
                    {formatSlotTime(t)}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Greyed-out days and times are unavailable. Please give at least 24 hours' notice.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!time || busy}
                onClick={() => void submit()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Confirm new time
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
