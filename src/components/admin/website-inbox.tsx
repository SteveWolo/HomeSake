import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatMessages } from "@/components/website-chat-messages";
import {
  getWebsiteInbox,
  getWebsiteInboxThread,
  replyToWebsiteChat,
} from "@/lib/website-chat.functions";

export function WebsiteInbox() {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const loadInbox = useServerFn(getWebsiteInbox);
  const inbox = useQuery({
    queryKey: ["admin-website-inbox", page],
    queryFn: () => loadInbox({ data: page }),
    refetchInterval: 7000,
    gcTime: 0,
    retry: false,
  });
  const loadThread = useServerFn(getWebsiteInboxThread);
  const conversation = useQuery({
    queryKey: ["admin-website-inbox-thread", selected],
    queryFn: () => loadThread({ data: selected! }),
    enabled: Boolean(selected),
    refetchInterval: 7000,
    gcTime: 0,
    retry: false,
  });
  const thread = conversation.data;

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Messages from the public website. Chat hours are weekdays, 9 a.m. to 5 p.m. Central.
      </p>
      {inbox.isPending && <p>Loading messages…</p>}
      {inbox.isError && (
        <p role="status">
          Couldn’t refresh messages.{" "}
          <Button variant="outline" onClick={() => void inbox.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {inbox.data?.length === 0 && <p>No conversations on this page.</p>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-2">
          {inbox.data?.map((item) => {
            const latest = item.latest_message;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === selected}
                onClick={() => setSelected(item.id)}
                className="block w-full rounded-md border p-3 text-left hover:bg-muted aria-pressed:border-primary"
              >
                <span className="block truncate font-medium">{item.name || "Website visitor"}</span>
                <span className="block truncate text-sm text-muted-foreground">{latest?.text}</span>
                <span className="mt-1 block text-xs">
                  {latest?.sender === "visitor" ? "Visitor last replied" : "HomeSake last replied"}{" "}
                  ·{" "}
                  {new Date(item.updated_at).toLocaleString("en-US", {
                    timeZone: "America/Chicago",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  CT
                </span>
              </button>
            );
          })}
          <div className="flex gap-2">
            {page > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setPage(page - 1);
                }}
              >
                Newer
              </Button>
            )}
            {inbox.data?.length === 25 && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setPage(page + 1);
                }}
              >
                Older
              </Button>
            )}
          </div>
        </div>
        {selected && conversation.isPending && <p>Loading conversation…</p>}
        {selected && conversation.isError && (
          <p role="status">
            Couldn’t load this conversation.{" "}
            <Button variant="outline" onClick={() => void conversation.refetch()}>
              Retry
            </Button>
          </p>
        )}
        {thread && (
          <div className="min-w-0 rounded-md border p-4">
            <h2 className="mb-1 text-lg font-semibold">{thread.name || "Website visitor"}</h2>
            {(thread.email || thread.phone) && (
              <div className="mb-3 flex flex-wrap gap-x-3 text-sm break-all">
                {thread.email && (
                  <a className="underline" href={`mailto:${thread.email}`}>
                    {thread.email}
                  </a>
                )}
                {thread.phone && (
                  <a className="underline" href={`tel:${thread.phone.replace(/[^+\d]/g, "")}`}>
                    {thread.phone}
                  </a>
                )}
              </div>
            )}
            <ChatMessages messages={thread.messages} />
            <ReplyForm
              key={thread.id}
              threadId={thread.id}
              refresh={() => {
                void conversation.refetch();
                void inbox.refetch();
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ReplyForm({ threadId, refresh }: { threadId: string; refresh: () => void }) {
  const reply = useServerFn(replyToWebsiteChat);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const request = useRef<{ id: string; text: string } | null>(null);
  const pending = useRef(false);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending.current) return;
    pending.current = true;
    setBusy(true);
    setStatus("");
    try {
      if (request.current?.text !== text) request.current = { id: crypto.randomUUID(), text };
      const result = await reply({ data: { ...request.current, threadId } });
      if (result.error) setStatus(result.error);
      else {
        request.current = null;
        setDraft("");
        setStatus("Reply sent in chat.");
        refresh();
      }
    } catch {
      setStatus("We couldn’t confirm delivery. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="space-y-2" onSubmit={send}>
      <label className="block text-sm">
        Reply in chat
        <Textarea
          className="mt-1"
          disabled={busy}
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          rows={3}
        />
      </label>
      <Button type="submit" disabled={busy || !draft.trim()}>
        {busy ? "Sending…" : "Send reply"}
      </Button>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
    </form>
  );
}
