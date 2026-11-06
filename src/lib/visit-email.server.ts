import { supabaseAdmin } from "../integrations/supabase/client.server";
import type { Database } from "../integrations/supabase/types";
import { layout, sendEmail, siteUrl, statHtml } from "./email.server";

type Visit = Database["public"]["Tables"]["appointments"]["Row"];
type Message = "confirmation" | "day-before" | "manual";

export async function emailVisit(visit: Visit, message: Message) {
  const sentField = message === "day-before" ? "day_before_sent_at" : "confirmation_sent_at";
  const { data: current, error: lookupError } = await supabaseAdmin.from("appointments")
    .select("*").eq("id", visit.id).eq("notification_version", visit.notification_version)
    .in("status", ["Scheduled", "Rescheduled"]).gt("scheduled_at", new Date().toISOString())
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!current || (message !== "manual" && current[sentField])) return false;

  const { data: property, error: propertyError } = await supabaseAdmin.from("properties")
    .select("owner_id, address").eq("id", current.property_id).single();
  if (propertyError) throw propertyError;
  const { data: owner, error: ownerError } = await supabaseAdmin.from("profiles")
    .select("email, full_name").eq("id", property.owner_id).single();
  if (ownerError) throw ownerError;
  if (!owner.email) throw new Error("This client has no email address on file.");

  const title = message === "day-before" ? "Your Homesake visit is coming up"
    : message === "manual" ? "Your Homesake visit details"
    : current.status === "Rescheduled" ? "Your Homesake visit was rescheduled"
    : "Your Homesake visit is scheduled";

  await sendEmail({
    to: owner.email,
    subject: title,
    html: layout({
      title,
      intro: `Hi ${owner.full_name || "there"}, here are the details for your upcoming visit.`,
      bodyHtml: statHtml([
        ["Service", current.service],
        ["Property", property.address],
        ["When", new Date(current.scheduled_at).toLocaleString("en-US", {
          timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric",
          year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
        })],
      ]),
      ctaLabel: "View your visits",
      ctaHref: `${siteUrl()}/dashboard`,
    }),
    ...(message === "manual" ? {} : {
      idempotencyKey: `visit/${current.id}/${current.notification_version}/${message}`,
    }),
  });
  if (message === "manual") return true;

  const sentAt = new Date();
  const lastMinute = message === "confirmation" &&
    Date.parse(current.scheduled_at) - sentAt.getTime() <= 24 * 60 * 60 * 1000;
  const { error } = await supabaseAdmin.from("appointments").update({
    [sentField]: sentAt.toISOString(),
    ...(lastMinute ? { day_before_sent_at: sentAt.toISOString() } : {}),
  })
    .eq("id", current.id).eq("notification_version", current.notification_version);
  if (error) throw error;
  return true;
}

export async function sendDueVisitEmails(now = new Date()) {
  const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin.from("appointments").select("*")
    .in("status", ["Scheduled", "Rescheduled"]).gt("scheduled_at", now.toISOString())
    .or(`confirmation_sent_at.is.null,and(day_before_sent_at.is.null,scheduled_at.lte.${cutoff})`)
    .order("scheduled_at").limit(20);
  if (error) throw error;

  const outcomes = await Promise.allSettled(data.map(async (visit) => {
    if (!visit.confirmation_sent_at) {
      await emailVisit(visit, "confirmation");
    } else if (Date.parse(visit.scheduled_at) <= Date.parse(cutoff) && !visit.day_before_sent_at) {
      await emailVisit(visit, "day-before");
    }
  }));
  const failures = outcomes.filter((outcome) => outcome.status === "rejected").length;
  if (failures) throw new Error(`Could not process ${failures} visit email(s).`);
}
