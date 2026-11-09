import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { websiteChatIsOpen, type ChatMessage } from "@/lib/website-chat";

const token = z.string().regex(/^[a-f0-9]{64}$/);
const messageInput = z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(2000) });
const contactInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.union([z.literal(""), z.string().trim().max(254).email()]),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((value) => {
        const digits = value.replace(/\D/g, "").length;
        return !value || (/^[+\d ().-]+$/.test(value) && digits >= 7 && digits <= 15);
      }),
  })
  .refine(({ email, phone }) => Boolean(email || phone));

export const getWebsiteChat = createServerFn({ method: "POST" })
  .inputValidator(token.nullable())
  .handler(async ({ data }) => {
    const open = websiteChatIsOpen();
    if (!data) return { open, messages: [] as ChatMessage[] };
    const { visitorThread } = await import("./website-chat.server");
    return { open, messages: (await visitorThread(data)).thread?.messages ?? [] };
  });

export const sendWebsiteChat = createServerFn({ method: "POST" })
  .inputValidator(
    messageInput.extend({ token, contact: z.unknown().optional(), website: z.string().max(250) }),
  )
  .handler(async ({ data }) => {
    if (data.website) return { error: "Message could not be sent." };
    const open = websiteChatIsOpen();
    const chat = await import("./website-chat.server");
    const message: ChatMessage = {
      id: data.id,
      text: data.text,
      sender: "visitor",
      sentAt: new Date().toISOString(),
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      const { thread, hash } = await chat.visitorThread(data.token);
      if (thread?.messages.some((item) => item.id === message.id)) return { open };
      const contact = contactInput.safeParse(data.contact).data;
      if ((!open || data.contact) && !contact) {
        return { open, error: "Enter your name and a valid phone number or email address." };
      }
      const result = thread
        ? await chat.appendMessage(thread, message, contact)
        : await chat.startThread({
            token_hash: hash,
            visitor_key: chat.visitorKey(
              getRequestHeader("x-nf-client-connection-ip") ?? getRequestIP() ?? "unknown",
            ),
            name: contact?.name ?? null,
            email: contact?.email || null,
            phone: contact?.phone || null,
            messages: [message],
          });
      if (result === "retry") continue;
      if (result === "limit")
        return { open, error: "Too many messages. Please wait and try again." };
      if (result === "full")
        return { open, full: true, error: "This conversation is full. Please start a new chat." };
      if (result !== "duplicate" && (!thread || thread.messages.at(-1)?.sender === "homesake")) {
        await chat
          .notifyChatAdmins(message.id)
          .catch(() => console.error("HomeSake chat email alert failed."));
      }
      return { open };
    }
    return { open, error: "The conversation changed. Please try sending again." };
  });

export const getWebsiteInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.number().int().min(0).max(10_000))
  .handler(async ({ context, data }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !admin) throw new Error("Only admins can open the HomeSake inbox.");
    const { adminThreads } = await import("./website-chat.server");
    return adminThreads(data);
  });

export const getWebsiteInboxThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.string().uuid())
  .handler(async ({ context, data }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !admin) throw new Error("Only admins can open the HomeSake inbox.");
    const { adminThread } = await import("./website-chat.server");
    const thread = await adminThread(data);
    if (!thread) return null;
    const { id, name, email, phone, messages } = thread;
    return { id, name, email, phone, messages };
  });

export const replyToWebsiteChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(messageInput.extend({ threadId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !admin) throw new Error("Only admins can reply to website messages.");
    const chat = await import("./website-chat.server");
    const message: ChatMessage = {
      id: data.id,
      text: data.text,
      sender: "homesake",
      sentAt: new Date().toISOString(),
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      const thread = await chat.adminThread(data.threadId);
      if (!thread) return { error: "Conversation not found." };
      const result = await chat.appendMessage(thread, message);
      if (result === "retry") continue;
      if (result === "full")
        return {
          error: "This conversation is full. Use the visitor’s contact details if available.",
        };
      return { error: null };
    }
    return { error: "The conversation changed. Please try sending again." };
  });
