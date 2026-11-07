import { supabase } from "@/integrations/supabase/client";
import type { OpenItem } from "@/lib/portal";

export const issueStatuses = ["Needs attention", "Awaiting your decision", "Follow-up scheduled", "Resolved"] as const;

export async function listIssueUpdates(issueId: string) {
  const { data, error } = await supabase.from("issue_updates").select("*")
    .eq("issue_id", issueId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateIssueProgress(issue: OpenItem, status: string, note: string) {
  const { data, error } = await supabase.from("open_items")
    .update({ progress_status: status, progress_note: note.trim() || null })
    .eq("id", issue.id).eq("updated_at", issue.updated_at).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This issue changed. Refresh before saving your update.");
}
