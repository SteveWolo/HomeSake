import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/image-compress";

export const PHOTO_BUCKET = "property-photos";

export type Property = {
  id: string;
  owner_id: string;
  address: string;
  health_score: number;
  score_calculated_at: string;
  next_visit_at: string | null;
  next_visit_note: string | null;
  credits_cents: number;
  home_notes?: string | null;
  tasks_completed_count?: number;
};

export type ActivityItem = {
  id: string;
  property_id: string;
  title: string;
  occurred_at: string;
};

export type OpenItem = {
  id: string;
  property_id: string;
  title: string;
  detail: string | null;
  priority: string;
  resolved: boolean;
};

export type PropertyPhoto = {
  id: string;
  property_id: string;
  storage_path: string;
  note: string | null;
  created_at: string;
};

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export async function listMyProperties(userId: string) {
  return unwrap<Property[]>(
    await supabase
      .from("properties")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true }),
  );
}

export async function listAllProperties() {
  return unwrap<Property[]>(
    await supabase.from("properties").select("*").order("created_at", { ascending: true }),
  );
}

export async function listProfiles() {
  return unwrap<{ id: string; full_name: string | null; email: string | null }[]>(
    await supabase.from("profiles").select("id, full_name, email"),
  );
}

export async function createProperty(ownerId: string, address: string) {
  const { error } = await supabase.from("properties").insert({ owner_id: ownerId, address });
  if (error) throw new Error(error.message);
}

export async function updateProperty(id: string, patch: Partial<Property>) {
  const { error } = await supabase.from("properties").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listActivity(propertyId: string) {
  return unwrap<ActivityItem[]>(
    await supabase
      .from("activity_items")
      .select("*")
      .eq("property_id", propertyId)
      .order("occurred_at", { ascending: false })
      .limit(20),
  );
}

export async function addActivity(propertyId: string, title: string) {
  const { error } = await supabase.from("activity_items").insert({ property_id: propertyId, title });
  if (error) throw new Error(error.message);
}

export async function listOpenItems(propertyId: string) {
  return unwrap<OpenItem[]>(
    await supabase
      .from("open_items")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),
  );
}

export async function addOpenItem(
  propertyId: string,
  title: string,
  detail: string,
  priority: string,
) {
  const { error } = await supabase
    .from("open_items")
    .insert({ property_id: propertyId, title, detail, priority });
  if (error) throw new Error(error.message);
}

export async function resolveOpenItem(id: string, resolved: boolean) {
  const { error } = await supabase.from("open_items").update({ resolved }).eq("id", id);
  if (error) throw new Error(error.message);
}

export type PhotoWithUrl = PropertyPhoto & { url: string | null };

export async function listPhotos(propertyId: string): Promise<PhotoWithUrl[]> {
  const rows = unwrap<PropertyPhoto[]>(
    await supabase
      .from("property_photos")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),
  );

  return Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(row.storage_path, 60 * 60);
      return { ...row, url: data?.signedUrl ?? null };
    }),
  );
}

/** Compresses to WebP (<=200KB), uploads, and records the photo row. */
export async function uploadPhoto(opts: {
  propertyId: string;
  userId: string;
  file: File;
  note: string;
}) {
  const optimized = await compressImage(opts.file);
  const path = `${opts.propertyId}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, optimized, { contentType: "image/webp", upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("property_photos").insert({
    property_id: opts.propertyId,
    uploaded_by: opts.userId,
    storage_path: path,
    note: opts.note || null,
  });
  if (error) throw new Error(error.message);

  return optimized;
}

export function formatDateTime(value: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  return "Needs work";
}

export async function deletePhoto(photo: PropertyPhoto) {
  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  const { error } = await supabase.from("property_photos").delete().eq("id", photo.id);
  if (error) throw new Error(error.message);
}

export async function deleteActivity(id: string) {
  const { error } = await supabase.from("activity_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteOpenItem(id: string) {
  const { error } = await supabase.from("open_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteProperty(id: string) {
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Member directory, appointments, invoices                            */
/* ------------------------------------------------------------------ */

export type ClientProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  membership_tier: string;
  payment_status: string;
  cancellation_requested: boolean;
  subscription_status: string;
  current_period_end: string | null;
  billing_period?: string | null;
};

/** Members keep access until the paid period ends, then go inactive. */
export function membershipState(profile: {
  subscription_status?: string | null;
  cancellation_requested?: boolean | null;
  current_period_end?: string | null;
}): "active" | "cancelling" | "cancelled" {
  const status = profile.subscription_status ?? "active";
  const expired = profile.current_period_end
    ? new Date(profile.current_period_end).getTime() <= Date.now()
    : false;
  if (status === "cancelled") return "cancelled";
  if (status === "cancelling" || profile.cancellation_requested) {
    return expired ? "cancelled" : "cancelling";
  }
  return "active";
}

export type Appointment = {
  id: string;
  property_id: string;
  scheduled_at: string;
  service: string;
  status: string;
  notes: string | null;
  reminder_sent_at: string | null;
};

export type Invoice = {
  id: string;
  owner_id: string;
  property_id: string | null;
  amount_cents: number;
  description: string;
  period: string | null;
  status: string;
  kind: string;
  due_date: string | null;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  issued_at: string;
};


const PROFILE_COLUMNS =
  "id, full_name, email, phone, membership_tier, payment_status, cancellation_requested, subscription_status, current_period_end";

export async function listClientProfiles() {
  return unwrap<ClientProfile[]>(
    await supabase.from("profiles").select(PROFILE_COLUMNS).order("full_name"),
  );
}

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as ClientProfile | null;
}

export async function updateProfile(id: string, patch: Partial<ClientProfile>) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listAppointments(propertyId: string) {
  return unwrap<Appointment[]>(
    await supabase
      .from("appointments")
      .select("*")
      .eq("property_id", propertyId)
      .order("scheduled_at", { ascending: false }),
  );
}

export async function listAllAppointments() {
  return unwrap<Appointment[]>(
    await supabase.from("appointments").select("*").order("scheduled_at", { ascending: true }),
  );
}

export async function createAppointment(input: {
  propertyId: string;
  scheduledAt: string;
  service: string;
  notes: string;
}) {
  const { error } = await supabase.from("appointments").insert({
    property_id: input.propertyId,
    scheduled_at: new Date(input.scheduledAt).toISOString(),
    service: input.service,
    notes: input.notes || null,
  });
  if (error) throw new Error(error.message);
}

export async function updateAppointment(id: string, patch: Partial<Appointment>) {
  const { error } = await supabase.from("appointments").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listMyInvoices(ownerId: string) {
  return unwrap<Invoice[]>(
    await supabase
      .from("invoices")
      .select("*")
      .eq("owner_id", ownerId)
      .order("issued_at", { ascending: false }),
  );
}

export async function listAllInvoices() {
  return unwrap<Invoice[]>(
    await supabase.from("invoices").select("*").order("issued_at", { ascending: false }),
  );
}

export async function createInvoice(input: {
  ownerId: string;
  amount: number;
  description: string;
  period?: string;
  status: string;
  propertyId?: string | null;
  dueDate?: string | null;
  kind?: string;
}) {
  const { data, error } = await supabase.from("invoices").insert({
    owner_id: input.ownerId,
    amount_cents: Math.round(input.amount * 100),
    description: input.description,
    period: input.period || null,
    status: input.status,
    property_id: input.propertyId ?? null,
    due_date: input.dueDate || null,
    kind: input.kind ?? "Membership",
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data as { id: string };
}


export async function updateInvoice(id: string, patch: Partial<Invoice>) {
  const { error } = await supabase.from("invoices").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function updatePhotoNote(id: string, note: string) {
  const { error } = await supabase
    .from("property_photos")
    .update({ note: note.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ */
/* Home notes, maintenance task log, scheduling availability           */
/* ------------------------------------------------------------------ */

export type MaintenanceTask = {
  id: string;
  property_id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type BlockedSlot = {
  id: string;
  slot_date: string;
  slot_time: string | null;
  reason: string | null;
};

/** Visit windows offered to members when rescheduling. */
export const VISIT_TIMES = ["08:00", "10:00", "12:00", "14:00", "16:00"] as const;

export function formatSlotTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const hour = h! % 12 === 0 ? 12 : h! % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}

export async function saveHomeNotes(propertyId: string, notes: string) {
  const { error } = await supabase
    .from("properties")
    .update({ home_notes: notes.trim() || null })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
}

export async function listMaintenanceTasks(propertyId: string) {
  return unwrap<MaintenanceTask[]>(
    await supabase
      .from("maintenance_tasks")
      .select("*")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false }),
  );
}

export async function addMaintenanceTask(propertyId: string, title: string) {
  const { error } = await supabase
    .from("maintenance_tasks")
    .insert({ property_id: propertyId, title });
  if (error) throw new Error(error.message);
}

export async function setMaintenanceTaskDone(id: string, completed: boolean) {
  const { error } = await supabase
    .from("maintenance_tasks")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteMaintenanceTask(id: string) {
  const { error } = await supabase.from("maintenance_tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listBlockedSlots() {
  return unwrap<BlockedSlot[]>(
    await supabase.from("blocked_slots").select("*").order("slot_date", { ascending: true }),
  );
}

export async function addBlockedSlot(slotDate: string, slotTime: string | null, reason: string) {
  const { error } = await supabase
    .from("blocked_slots")
    .insert({ slot_date: slotDate, slot_time: slotTime, reason: reason.trim() || null });
  if (error) throw new Error(error.message);
}

export async function deleteBlockedSlot(id: string) {
  const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** A slot is unavailable when the whole day is blocked or that exact time is blocked. */
export function isSlotBlocked(blocked: BlockedSlot[], date: string, time: string) {
  return blocked.some(
    (b) => b.slot_date === date && (b.slot_time === null || b.slot_time.slice(0, 5) === time),
  );
}

export async function rescheduleAppointment(id: string, isoDateTime: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ scheduled_at: new Date(isoDateTime).toISOString(), status: "Rescheduled" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Home notes are an append-only journal: each save adds a dated entry so the
 * client can clear the box and write a fresh instruction whenever they like.
 */
export async function appendHomeNote(propertyId: string, existing: string | null, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return;
  const stamp = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const entry = `[${stamp}] ${trimmed}`;
  const base = (existing ?? "").trim();
  const next = base ? `${base}\n\n${entry}` : entry;
  const { error } = await supabase
    .from("properties")
    .update({ home_notes: next })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
}

/** Splits the stored journal back into individual entries, newest first. */
export function parseHomeNotes(notes: string | null | undefined) {
  return (notes ?? "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .reverse();
}

/** Admin-only: bumps the "tasks you didn't have to do" counter for a property. */
export async function incrementTasksCompleted(propertyId: string) {
  const { error } = await supabase.rpc("increment_tasks_completed", {
    _property_id: propertyId,
  });
  if (error) throw new Error(error.message);
}
