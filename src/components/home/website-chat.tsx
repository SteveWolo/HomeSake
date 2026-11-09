import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { getWebsiteChat, sendWebsiteChat } from "@/lib/website-chat.functions";
import { ChatMessages } from "@/components/website-chat-messages";

const storageKey = "homesake.website-chat";
const tokenPattern = /^[a-f0-9]{64}$/;

export function WebsiteChat() {
  const [expanded, setExpanded] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved && tokenPattern.test(saved)) setToken(saved);
    } catch {
      // The conversation can still run in memory.
    }
  }, []);

  function rememberToken(value: string | null) {
    setToken(value);
    try {
      if (value) sessionStorage.setItem(storageKey, value);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // The conversation can still run in memory.
    }
  }

  return (
    <Popover open={expanded} onOpenChange={setExpanded}>
      <PopoverTrigger asChild>
        <Button className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 min-h-11 rounded-full shadow-lg">
          <MessageSquare aria-hidden="true" />
          Chat with HomeSake
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={10}
        aria-label="Chat with HomeSake"
        className="max-h-[var(--radix-popover-content-available-height)] w-88 max-w-[calc(100vw-2rem)] overflow-y-auto"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold">Chat with HomeSake</h2>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Close chat"
            onClick={() => setExpanded(false)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
        <VisitorChat token={token} rememberToken={rememberToken} />
      </PopoverContent>
    </Popover>
  );
}

function VisitorChat({
  token,
  rememberToken,
}: {
  token: string | null;
  rememberToken: (token: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const getChat = useServerFn(getWebsiteChat);
  const sendChat = useServerFn(sendWebsiteChat);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("");
  const [full, setFull] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const request = useRef<{ id: string; message: string } | null>(null);
  const chat = useQuery({
    queryKey: ["website-chat", token],
    queryFn: () => getChat({ data: token }),
    refetchInterval: token ? 7000 : 30_000,
    gcTime: 0,
    retry: false,
  });
  const afterHours = chat.data?.open === false;

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = message.trim();
    if (!draft || !chat.data || pending.current) return;
    if (afterHours && (!name.trim() || (!email.trim() && !phone.trim()))) {
      setStatus("Enter your name and either a phone number or email.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setStatus("");
    try {
      const chatToken =
        token ??
        Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
      if (!token) rememberToken(chatToken);
      if (request.current?.message !== draft)
        request.current = { id: crypto.randomUUID(), message: draft };
      const result = await sendChat({
        data: {
          token: chatToken,
          id: request.current.id,
          text: draft,
          website,
          ...(afterHours && { contact: { name, email, phone } }),
        },
      });
      if (result.error) {
        setStatus(result.error);
        setFull(Boolean(result.full));
      } else {
        request.current = null;
        setMessage("");
        setStatus(
          result.open
            ? "Message sent."
            : "Message received. We’ll follow up during business hours.",
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["website-chat", chatToken] });
    } catch {
      setStatus("We couldn’t confirm delivery. Check your connection and try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!chat.data) {
    return chat.isError ? (
      <div className="text-sm">
        <p>Chat is temporarily unavailable.</p>
        <Button className="mt-2" variant="outline" onClick={() => void chat.refetch()}>
          Try again
        </Button>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Opening chat…</p>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        {afterHours
          ? "We’re outside chat hours. Leave your message and a way to reach you."
          : "Send us a message here. Keep this tab open to see our reply."}
      </p>
      <ChatMessages messages={chat.data.messages} />
      <form className="space-y-3" onSubmit={send}>
        {afterHours && (
          <>
            <label className="block text-sm">
              Name
              <Input
                className="mt-1"
                required
                autoComplete="name"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-1 text-xs text-muted-foreground">
                Enter a phone number, an email, or both.
              </legend>
              <label className="text-sm">
                Phone
                <Input
                  className="mt-1"
                  type="tel"
                  autoComplete="tel"
                  maxLength={40}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className="text-sm">
                Email
                <Input
                  className="mt-1"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            </fieldset>
          </>
        )}
        <label className="block text-sm">
          Your message
          <Textarea
            className="mt-1 resize-y"
            disabled={busy}
            required
            maxLength={2000}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
          />
        </label>
        <div className="hidden" aria-hidden="true">
          <label>
            Website{" "}
            <input
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </label>
        </div>
        <Button type="submit" className="w-full" disabled={busy || full || !message.trim()}>
          {busy ? "Sending…" : "Send message"}
        </Button>
        {full && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              rememberToken(null);
              request.current = null;
              setFull(false);
              setStatus("");
            }}
          >
            Start a new chat
          </Button>
        )}
        {status && (
          <p role="status" className="text-sm">
            {status}
          </p>
        )}
      </form>
    </>
  );
}
