import { createHash, createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { layout, sendEmail, siteUrl } from "@/lib/email.server";
import type { ChatMessage } from "@/lib/website-chat";

type Thread = {
  id: string;
  token_hash: string;
  visitor_key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  messages: ChatMessage[];
  latest_message: ChatMessage;
  revision: number;
  created_at: string;
  updated_at: string;
};

type ChatDatabase = {
  public: {
    Tables: {
      website_chat_threads: {
        Row: Thread;
        Insert: Pick<
          Thread,
          "token_hash" | "visitor_key" | "name" | "email" | "phone" | "messages"
        >;
        Update: Partial<
          Pick<Thread, "name" | "email" | "phone" | "messages" | "revision" | "updated_at">
        >;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};

const chatDb = supabaseAdmin as unknown as SupabaseClient<ChatDatabase>;

export function visitorKey(ip: string) {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Chat storage is unavailable.");
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function visitorThread(token: string) {
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await chatDb
    .from("website_chat_threads")
    .select("*")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) throw error;
  return { thread: data, hash };
}

export async function startThread(
  values: ChatDatabase["public"]["Tables"]["website_chat_threads"]["Insert"],
) {
  const result = await chatDb.from("website_chat_threads").insert(values).select("id").single();
  if (result.error?.code === "PT429") return "limit";
  if (result.error?.code === "23505") return "retry";
  if (result.error) throw result.error;
  return result.data.id;
}

export async function appendMessage(
  thread: Thread,
  message: ChatMessage,
  contact?: { name: string; email: string; phone: string },
) {
  if (thread.messages.some((item) => item.id === message.id)) return "duplicate";
  if (thread.messages.length >= 200) return "full";
  if (message.sender === "visitor") {
    const recent = thread.messages.filter(
      (item) => item.sender === "visitor" && Date.parse(item.sentAt) > Date.now() - 60_000,
    );
    if (recent.length >= 8) return "limit";
  }
  const { data, error } = await chatDb
    .from("website_chat_threads")
    .update({
      ...(contact && {
        name: contact.name,
        email: contact.email || null,
        phone: contact.phone || null,
      }),
      messages: [...thread.messages, message],
      updated_at: message.sentAt,
      revision: thread.revision + 1,
    })
    .eq("id", thread.id)
    .eq("revision", thread.revision)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ? "saved" : "retry";
}

export async function adminThreads(page: number) {
  const { data, error } = await chatDb
    .from("website_chat_threads")
    .select("id, name, updated_at, latest_message")
    .order("updated_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw error;
  return data;
}

export async function adminThread(id: string) {
  const { data, error } = await chatDb
    .from("website_chat_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function notifyChatAdmins(messageId: string) {
  const subject = "New HomeSake website message";
  await sendEmail({
    to: "stevewoloszyk1@gmail.com",
    subject,
    idempotencyKey: `website-chat/${messageId}/0`,
    html: layout({
      title: subject,
      intro: "A visitor sent a message. Open your HomeSake inbox to reply.",
      bodyHtml: "",
      ctaLabel: "Open HomeSake inbox",
      ctaHref: `${siteUrl()}/admin?inbox=1`,
    }),
  });
}
