import { supabase } from "@/integrations/supabase/client";
import type { PortalSearch } from "@/lib/portal-links";

export async function resolvePortalTarget(search: PortalSearch) {
  if (search.invoice) {
    const { data, error } = await supabase.from("invoices").select("property_id,status").eq("id", search.invoice).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { propertyId: data.property_id, tab: "membership" as const, elementId: `invoice-${search.invoice}` } : null;
  }
  if (search.quote) {
    const { data, error } = await supabase.from("visit_paid_extras").select("appointment_id").eq("id", search.quote).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const visit = await supabase.from("appointments").select("property_id").eq("id", data.appointment_id).maybeSingle();
    if (visit.error) throw new Error(visit.error.message);
    return visit.data ? { propertyId: visit.data.property_id, tab: "appointments" as const, elementId: `quote-${search.quote}` } : null;
  }
  if (search.issue) {
    const { data, error } = await supabase.from("open_items").select("property_id").eq("id", search.issue).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { propertyId: data.property_id, tab: "overview" as const, elementId: `issue-${search.issue}` } : null;
  }
  if (search.visit) {
    const { data, error } = await supabase.from("appointments").select("property_id").eq("id", search.visit).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { propertyId: data.property_id, tab: "appointments" as const, elementId: `visit-${search.visit}` } : null;
  }
  if (search.property) {
    const { data, error } = await supabase.from("properties").select("id").eq("id", search.property).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { propertyId: data.id, tab: "overview" as const, elementId: "client-home" } : null;
  }
  return null;
}
