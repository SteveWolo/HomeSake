import { useServerFn } from "@tanstack/react-start";
import { sendIssueProgressEmail } from "@/lib/notifications.functions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { issueStatuses, listIssueUpdates, updateIssueProgress } from "@/lib/issue-progress";
import { formatDateTime, type OpenItem } from "@/lib/portal";

export function IssueHistory({ issue }: { issue: OpenItem }) {
  const history = useQuery({
    queryKey: ["issue-updates", issue.id],
    queryFn: () => listIssueUpdates(issue.id),
    refetchInterval: 30_000,
  });
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm text-primary">Progress history</summary>
      <p className="mt-2 text-xs text-muted-foreground">Reported {formatDateTime(issue.created_at)}</p>
      {history.isPending && <p role="status" className="mt-2 text-sm">Loading updates…</p>}
      {history.isError && <p role="alert" className="mt-2 text-sm">Could not load updates.</p>}
      {history.data?.map((entry) => (
        <div key={entry.id} className="mt-3 border-l-2 border-primary/30 pl-3 text-sm">
          <p className="font-semibold">{entry.status}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
          {entry.note && <p className="mt-1 whitespace-pre-wrap break-words">{entry.note}</p>}
        </div>
      ))}
      {history.isSuccess && !history.data.length && <p className="mt-2 text-sm text-muted-foreground">No progress updates yet.</p>}
    </details>
  );
}

export function AdminIssueProgress({ issue, onSaved }: { issue: OpenItem; onSaved: () => Promise<unknown> }) {
  const queryClient = useQueryClient();
  const emailIssue = useServerFn(sendIssueProgressEmail);
  const email = useMutation({ mutationFn: () => emailIssue({ data: { issueId: issue.id } }) });
  const [status, setStatus] = useState(issue.progress_status);
  const [note, setNote] = useState("");
  const mutation = useMutation({
    mutationFn: async () => {
      await updateIssueProgress(issue, status, note);
      await onSaved();
      await queryClient.invalidateQueries({ queryKey: ["issue-updates", issue.id] });
      setNote("");
    },
  });
  return (
    <form className="mt-3 grid gap-2" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      <label className="grid gap-1 text-xs">Issue status
        <select className="rounded-sm border border-border bg-background p-2 text-sm" value={status}
          disabled={mutation.isPending} onChange={(event) => setStatus(event.target.value)}>
          {issueStatuses.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs">Client update
        <textarea maxLength={2000} className="rounded-sm border border-border bg-background p-2 text-sm"
          value={note} disabled={mutation.isPending} onChange={(event) => setNote(event.target.value)}
          placeholder="Explain the next step or what was resolved." />
      </label>
      <button type="submit" className="justify-self-start rounded-full border border-border px-3 py-2 text-sm disabled:opacity-50"
        disabled={mutation.isPending || (status === issue.progress_status && !note.trim())}>Save client update</button>
      <button type="button" className="justify-self-start text-sm text-primary underline"
        disabled={mutation.isPending || email.isPending}
        onClick={() => email.mutate()}>Email saved issue update</button>
      {email.error && <p role="alert" className="text-sm text-destructive">{email.error.message}</p>}
      {email.isSuccess && <p role="status" className="text-sm">Issue email sent.</p>}
      {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
      {mutation.isSuccess && <p role="status" className="text-sm">Client update saved.</p>}
    </form>
  );
}
