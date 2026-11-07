import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PaidExtra = Tables<"visit_paid_extras">;

export async function listVisitExtras(appointmentId: string) {
  const { data, error } = await supabase.from("visit_paid_extras").select("*")
    .eq("appointment_id", appointmentId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function listPropertyExtras(propertyId: string): Promise<PaidExtra[]> {
  const { data, error } = await supabase.from("visit_paid_extras").select("*, appointments!inner(property_id)")
    .eq("appointments.property_id", propertyId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function sendPaidExtra(id: string, appointmentId: string, scope: string, price: string) {
  const amount = price.trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(amount) || Number(amount) < 0.5) {
    throw new Error("Enter a price from $0.50 to $999,999.99.");
  }
  const { error } = await supabase.from("visit_paid_extras").insert({
    id, appointment_id: appointmentId, scope: scope.trim(), amount_cents: Math.round(Number(amount) * 100),
  });
  if (error?.code === "23505") {
    const existing = await supabase.from("visit_paid_extras").select("id, scope, amount_cents").eq("id", id).single();
    if (!existing.error && existing.data.scope === scope.trim() &&
      existing.data.amount_cents === Math.round(Number(amount) * 100)) return;
  }
  if (error) throw new Error(error.message);
}

export async function respondToPaidExtra(quoteId: string, decision: "Approved" | "Declined" | "Withdrawn") {
  const { error } = await supabase.rpc("respond_to_paid_extra", { quote_id: quoteId, decision });
  if (error) throw new Error(error.message);
}

export async function invoicePaidExtra(quoteId: string) {
  const { data, error } = await supabase.rpc("invoice_paid_extra", { quote_id: quoteId });
  if (error) throw new Error(error.message);
  return data;
}
