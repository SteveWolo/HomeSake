import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";
import type { Json } from "@/integrations/supabase/types";

export const checkStates = ["Completed", "Needs attention", "Not applicable"] as const;
const checkSchema = z.object({
  title: z.string().max(300),
  status: z.enum(checkStates).nullable(),
  note: z.string().max(1000).optional(),
  photos: z.array(z.string().max(100)).max(12).optional(),
});
const reportSchema = z.object({
  summary: z.string().max(4000),
  checks: z.array(checkSchema).max(400),
  photos: z.array(z.string().max(100)).max(12),
  publishedAt: z.string().optional(),
});
export type VisitReport = z.infer<typeof reportSchema>;
export const emptyVisitReport: VisitReport = { summary: "", checks: [], photos: [] };
const bucket = "visit-report-photos";

export function readVisitReport(value: unknown) {
  const result = reportSchema.safeParse(value);
  return result.success ? result.data : null;
}

export async function loadVisitDraft(appointmentId: string) {
  const { data, error } = await supabase.from("visit_report_drafts").select("report,staff_notes,revision")
    .eq("appointment_id", appointmentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const report = readVisitReport(data.report);
  if (!report) throw new Error("This draft could not be loaded.");
  return { report, notes: data.staff_notes, revision: data.revision };
}

export async function saveVisitDraft(appointmentId: string, revision: string | null, report: VisitReport, notes: string, publish: boolean) {
  const { data, error } = await supabase.rpc("save_visit_workspace", {
    visit_id: appointmentId, expected_revision: revision, public_report: reportSchema.parse(report) as Json,
    private_notes: notes, publish,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function uploadVisitReportPhoto(appointmentId: string, file: File) {
  const path = `${appointmentId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, await compressImage(file), { contentType: "image/webp" });
  if (error) throw new Error(error.message);
  return path;
}

export async function visitPhotoLinks(paths: string[]) {
  if (!paths.length) return [];
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(paths, 1800);
  if (error) throw new Error(error.message);
  return data;
}
