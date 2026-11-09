import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/website-chat";

export function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  const log = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lastId]);

  if (!messages.length) return null;
  return (
    <div
      ref={log}
      role="log"
      aria-label="Conversation"
      className="mb-3 max-h-64 space-y-2 overflow-y-auto rounded-md border p-2"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.sender === "homesake"
              ? "rounded-md bg-primary/10 p-2"
              : "rounded-md bg-muted p-2"
          }
        >
          <p className="text-xs font-semibold">
            {message.sender === "homesake" ? "HomeSake" : "Visitor"}
          </p>
          <p className="mt-1 text-sm break-words whitespace-pre-wrap">{message.text}</p>
        </div>
      ))}
    </div>
  );
}
