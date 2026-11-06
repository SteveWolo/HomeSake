import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Globe,
  Home,
  ImagePlus,
  Loader2,
  Mail,
  LogOut,
  Plus,
  Receipt,
  Trash2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import logoUrl from "@/assets/homesake-logo.png";
import { SiteEditor } from "@/components/admin/site-editor";
import { PhotoLightbox } from "@/components/portal/photo-lightbox";
import {
  sendInvoiceDueEmail,
  sendPropertyUpdateEmail,
} from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBytes } from "@/lib/image-compress";
import { adminCreateClient, adminDeleteClient } from "@/lib/admin-clients.functions";
import { sidebarHeading, sidebarItem, sidebarShell } from "@/lib/portal-ui";
import {
  incrementTasksCompleted,
  parseHomeNotes,
  addActivity,
  addOpenItem,
  createAppointment,
  createInvoice,
  deleteActivity,
  deleteAppointment,
  deleteInvoice,
  deleteOpenItem,
  deletePhoto,
  deleteProperty,
  formatDateTime,
  formatMoney,
  listActivity,
  listAllAppointments,
  listAllInvoices,
  listAllProperties,
  listAppointments,
  listClientProfiles,
  listOpenItems,
  listPhotos,
  membershipState,
  resolveOpenItem,
  updateAppointment,
  updateInvoice,
  updatePhotoNote,
  updateProfile,
  updateProperty,
  uploadPhoto,
  type ClientProfile,
  type PhotoWithUrl,
} from "@/lib/portal";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin & Contractor Portal — Home Harmony Hub" },
      {
        name: "description",
        content:
          "Manage the client directory, properties, appointments, visit reports with compressed photos, urgent repairs, and membership invoices.",
      },
      { property: "og:title", content: "Admin & Contractor Portal — Home Harmony Hub" },
      {
        property: "og:description",
        content: "Internal operations portal for estate managers and contractors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const field =
  "h-11 w-full rounded-sm border border-border bg-background/60 px-4 text-sm outline-none focus:border-primary/70";
const label = "text-xs tracking-[0.16em] text-muted-foreground uppercase";
const btn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60";
const ghostBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] uppercase transition-colors hover:border-primary/60 hover:text-primary";

const TIERS = ["Essential", "Signature", "Estate"];

type Tab = "clients" | "appointments" | "invoices" | "site";

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "clients", label: "Clients & properties", icon: Users },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "invoices", label: "Invoicing", icon: Receipt },
  { id: "site", label: "Website editor", icon: Globe },
];

/** Client directory row: dropdown edits stay local until the admin saves them. */
function ClientRow({
  profile,
  addresses,
  canDelete,
  onSaved,
  onDelete,
}: {
  profile: ClientProfile;
  addresses: string;
  canDelete: boolean;
  onSaved: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}) {
  const [tier, setTier] = useState(profile.membership_tier);
  const [status, setStatus] = useState(profile.payment_status);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTier(profile.membership_tier);
    setStatus(profile.payment_status);
  }, [profile.membership_tier, profile.payment_status]);

  const dirty = tier !== profile.membership_tier || status !== profile.payment_status;

  return (
    <div className="rounded-sm border border-border bg-background/40 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 break-words">

          <p className="text-sm font-semibold">{profile.full_name || profile.email}</p>
          <p className="text-xs text-muted-foreground">
            {profile.email}
            {profile.phone ? ` · ${profile.phone}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{addresses || "No property yet"}</p>
          {(() => {
            const state = membershipState(profile);
            if (state === "active") return null;
            return (
              <p className="mt-1 text-xs text-destructive">
                {state === "cancelled"
                  ? "Cancelled — access revoked"
                  : `Cancelling — access until ${formatDateTime(profile.current_period_end)}`}
              </p>
            );
          })()}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tier}
            aria-label={`Membership tier for ${profile.email}`}
            onChange={(e) => {
              setTier(e.target.value);
              setDone(false);
            }}
            className="h-9 rounded-full border border-border bg-background/60 px-4 text-xs"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={status}
            aria-label={`Payment status for ${profile.email}`}
            onChange={(e) => {
              setStatus(e.target.value);
              setDone(false);
            }}
            className={`h-9 rounded-full border bg-background/60 px-4 text-xs ${
              status === "Paid" ? "border-border" : "border-destructive/60 text-destructive"
            }`}
          >
            <option value="Paid">Paid</option>
            <option value="Missed Payment">Missed Payment</option>
          </select>
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await updateProfile(profile.id, {
                  membership_tier: tier,
                  payment_status: status,
                });
                await onSaved();
                setDone(true);
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-3 py-1.5 text-[11px] uppercase text-primary transition-opacity disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {done && !dirty ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => void onDelete()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] uppercase transition-colors hover:border-destructive/60 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/** Photo card with an expandable note that can be added or updated any time after upload. */
function PhotoCard({
  photo,
  onChanged,
  onOpen,
}: {
  photo: PhotoWithUrl;
  onChanged: () => Promise<void> | void;
  onOpen: () => void;
}) {
  const [note, setNote] = useState(photo.note ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNote(photo.note ?? "");
  }, [photo.note]);

  return (
    <figure className="flex flex-col rounded-sm border border-border bg-background/40">
      {photo.url && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open full-size photo"
          className="block w-full cursor-zoom-in"
        >
          <img
            src={photo.url}
            alt={photo.note ?? "Property photo"}
            loading="lazy"
            className="aspect-4/3 w-full rounded-t-sm object-cover"
          />
        </button>
      )}
      <figcaption className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[11px] text-muted-foreground">
          {new Date(photo.created_at).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            // Grow with the content so the whole note stays visible.
            e.currentTarget.style.height = "auto";
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
          rows={Math.min(10, Math.max(2, Math.ceil((note.length || 1) / 34)))}
          placeholder="Add a note…"
          aria-label="Photo note"
          className="min-h-16 w-full resize-y rounded-sm border border-border bg-background/60 px-3 py-2 text-xs leading-relaxed outline-none focus:border-primary/70"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={saving || note === (photo.note ?? "")}
            onClick={async () => {
              setSaving(true);
              try {
                await updatePhotoNote(photo.id, note);
                await onChanged();
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-3 py-1 text-[11px] uppercase text-primary disabled:opacity-40"
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            Save note
          </button>
          <button
            type="button"
            aria-label="Delete photo"
            onClick={async () => {
              await deletePhoto(photo);
              await onChanged();
            }}
            className="shrink-0 rounded-full border border-border p-1 transition-colors hover:border-destructive/60 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

/** Groups visit photos into newest-first date buckets. */
function groupPhotosByDate(photos: PhotoWithUrl[]) {
  const map = new Map<string, PhotoWithUrl[]>();
  for (const p of photos) {
    const day = new Date(p.created_at).toISOString().slice(0, 10);
    const bucket = map.get(day);
    if (bucket) bucket.push(p);
    else map.set(day, [p]);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}


function AdminPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createClientFn = useServerFn(adminCreateClient);
  const deleteClientFn = useServerFn(adminDeleteClient);

  const [tab, setTab] = useState<Tab>("clients");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [score, setScore] = useState("");
  const [credits, setCredits] = useState("");
  const [nc, setNc] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    membershipTier: TIERS[0]!,
    paymentStatus: "Paid",
    password: "",
  });
  const [appt, setAppt] = useState({ at: "", service: "", notes: "" });
  const [activityTitle, setActivityTitle] = useState("");
  const [item, setItem] = useState({ title: "", detail: "", priority: "Low" });
  const [photoNote, setPhotoNote] = useState("");
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<PhotoWithUrl | null>(null);
  const [notifying, setNotifying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [customInv, setCustomInv] = useState({ description: "", amount: "", dueDate: "" });
  const [inv, setInv] = useState({
    ownerId: "",
    amount: "",
    description: "",
    period: "Monthly",
    status: "Due",
  });

  const isAdmin = role === "admin";

  // Strict role routing: clients never see the admin portal.
  useEffect(() => {
    if (!loading && role && role !== "admin") navigate({ to: "/dashboard", replace: true });
  }, [loading, role, navigate]);

  const properties = useQuery({
    queryKey: ["all-properties"],
    queryFn: listAllProperties,
    enabled: isAdmin,
  });
  const profiles = useQuery({
    queryKey: ["client-profiles"],
    queryFn: listClientProfiles,
    enabled: isAdmin,
  });
  const allAppointments = useQuery({
    queryKey: ["all-appointments"],
    queryFn: listAllAppointments,
    enabled: isAdmin,
  });
  const allInvoices = useQuery({
    queryKey: ["all-invoices"],
    queryFn: listAllInvoices,
    enabled: isAdmin,
  });

  // Live sync: invoice payments and membership status changes appear instantly.
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-billing-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["all-invoices"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["client-profiles"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["all-properties"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["all-appointments"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-appointments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_items" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-activity"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  const property = properties.data?.find((p) => p.id === activeId) ?? null;
  const ownerProfile = property
    ? (profiles.data?.find((x) => x.id === property.owner_id) ?? null)
    : null;

  useEffect(() => {
    if (!property) return;
    setScore(String(property.health_score));
    setCredits((property.credits_cents / 100).toFixed(2));
  }, [property?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activity = useQuery({
    queryKey: ["admin-activity", property?.id],
    queryFn: () => listActivity(property!.id),
    enabled: !!property,
  });
  const openItems = useQuery({
    queryKey: ["admin-open-items", property?.id],
    queryFn: () => listOpenItems(property!.id),
    enabled: !!property,
  });
  const photos = useQuery({
    queryKey: ["admin-photos", property?.id],
    queryFn: () => listPhotos(property!.id),
    enabled: !!property,
  });
  const propertyAppointments = useQuery({
    queryKey: ["admin-appointments", property?.id],
    queryFn: () => listAppointments(property!.id),
    enabled: !!property,
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  const notifyOwner = useServerFn(sendPropertyUpdateEmail);
  const notifyInvoice = useServerFn(sendInvoiceDueEmail);

  const sendPropertyUpdate = async () => {
    if (!property) return;
    setNotifying(true);
    setSaved(null);
    try {
      const res = await notifyOwner({ data: { propertyId: property.id } });
      setSaved(
        res.ok
          ? `Update notification sent to ${res.email}.`
          : (res.error ?? "Could not send the notification."),
      );
    } catch (err) {
      setSaved(err instanceof Error ? err.message : "Could not send the notification.");
    } finally {
      setNotifying(false);
    }
  };

  const ownerLabel = (ownerId: string) => {
    const p = profiles.data?.find((x) => x.id === ownerId);
    return p?.full_name || p?.email || "Member";
  };
  const propertyLabel = (propertyId: string) => {
    const p = properties.data?.find((x) => x.id === propertyId);
    return p ? `${ownerLabel(p.owner_id)} · ${p.address}` : "Property";
  };

  const saveProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    await updateProperty(property.id, {
      health_score: Math.max(0, Math.min(100, Number(score) || 0)),
      credits_cents: Math.round((Number(credits) || 0) * 100),
      score_calculated_at: new Date().toISOString().slice(0, 10),
    });
    setSaved("Property updated.");
    await properties.refetch();
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file || !property || !user) return;
    setUploadInfo(null);
    try {
      const optimized = await uploadPhoto({
        propertyId: property.id,
        userId: user.id,
        file,
        note: photoNote,
      });
      setUploadInfo(
        `Optimized to WebP · ${formatBytes(file.size)} → ${formatBytes(optimized.size)}`,
      );
      setPhotoNote("");
      await photos.refetch();
    } catch (err) {
      setUploadInfo(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading || (!isAdmin && !role)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const upcomingAll = (allAppointments.data ?? []).filter(
    (a) => a.status !== "Completed" && new Date(a.scheduled_at).getTime() >= Date.now(),
  );
  const upcomingProperty = property
    ? upcomingAll.filter((a) => a.property_id === property.id)
    : [];

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className={sidebarShell}>
        <div className="flex h-20 items-center border-b border-border/50 px-6">
          <Link to="/" aria-label="Home Harmony Hub — home">
            <img src={logoUrl} alt="Home Harmony Hub logo" className="h-9 w-auto" />
          </Link>
        </div>
        <div className="px-3 pb-6">
          <p className={sidebarHeading}>Operations</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {tabs
              .filter((t) => t.id !== "site")
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setActiveId(null);
                  }}
                  className={`${sidebarItem(tab === t.id && !activeId)} flex items-center gap-3`}
                >
                  <t.icon className="size-4 shrink-0 opacity-80" />
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
          </nav>

          <p className={sidebarHeading}>Properties</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {(properties.data ?? []).length === 0 && (
              <p className="px-4 py-2 text-xs text-muted-foreground/70">No properties yet.</p>
            )}
            {(properties.data ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTab("clients");
                  setActiveId(p.id);
                }}
                className={`${sidebarItem(activeId === p.id)} flex items-start gap-3`}
              >
                <Home className="mt-0.5 size-4 shrink-0 opacity-80" />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{p.address}</span>
                  <span className="block truncate text-[11px] text-muted-foreground/70">
                    {ownerLabel(p.owner_id)}
                  </span>
                </span>
              </button>
            ))}
          </nav>

          <p className={sidebarHeading}>Website</p>
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            <button
              type="button"
              onClick={() => {
                setTab("site");
                setActiveId(null);
              }}
              className={`${sidebarItem(tab === "site" && !activeId)} flex items-center gap-3`}
            >
              <Globe className="size-4 shrink-0 opacity-80" />
              Website editor
            </button>
          </nav>

          <button
            type="button"
            onClick={signOut}
            className={`${sidebarItem(false)} mt-6 flex items-center gap-3`}
          >
            <LogOut className="size-4 shrink-0" /> Log Out
          </button>
        </div>

      </aside>

      <div className="flex-1">
        <header className="grid gap-4 border-b border-border px-4 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start lg:px-10">
          <div className="min-w-0">
            <p className="eyebrow">Admin &amp; contractor portal</p>
            <select
              aria-label="Select active property"
              value={activeId ?? ""}
              onChange={(e) => setActiveId(e.target.value || null)}
              className="mt-2 h-10 w-full max-w-full truncate rounded-sm border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary/70 sm:max-w-sm"
            >
              <option value="">Global management</option>
              {(properties.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {ownerLabel(p.owner_id)} — {p.address}
                </option>
              ))}
            </select>
          </div>
          {property ? (
            <div className="min-w-0 md:text-right">
              <p className="truncate text-sm font-semibold">
                {ownerProfile?.full_name || ownerProfile?.email || "Client"}
              </p>
              <p className="text-xs break-words text-muted-foreground">{property.address}</p>
              <p className="text-xs text-muted-foreground">
                {ownerProfile?.phone || "No phone on file"}
              </p>
              <p className="truncate text-xs text-muted-foreground">{ownerProfile?.email ?? "—"}</p>
            </div>
          ) : (
            <p className="truncate text-sm font-semibold">{user?.email}</p>
          )}
        </header>

        <main className="space-y-6 px-4 py-8 sm:px-6 lg:px-10">
          <h1 className="font-display text-2xl break-words sm:text-3xl">
            {property ? `${ownerLabel(property.owner_id)} — property overview` : tabs.find((t) => t.id === tab)?.label}
          </h1>

          {saved && <p className="text-xs text-primary">{saved}</p>}

          {/* ---------------- Unified property view ---------------- */}
          {property && (
            <>
              <section className="panel flex flex-wrap items-center justify-between gap-4 rounded-sm p-6">
                <div>
                  <h2 className={label}>Client notification</h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Nothing is emailed automatically. Send one aggregated summary of recent
                    reports, notes, and photos when the visit work is finished.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={notifying}
                  onClick={() => void sendPropertyUpdate()}
                  className={btn}
                >
                  {notifying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                  Send update notification to client
                </button>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="update-property">
                <h2 id="update-property" className={label}>
                  Health score &amp; credits
                </h2>
                <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={saveProperty}>
                  <label className="text-sm">
                    <span className="text-xs text-muted-foreground">Health score (0–100)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      className={`${field} mt-1.5`}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-xs text-muted-foreground">Credits balance ($)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={credits}
                      onChange={(e) => setCredits(e.target.value)}
                      className={`${field} mt-1.5`}
                    />
                  </label>
                  <div className="flex items-end gap-3">
                    <button type="submit" className={btn}>
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Delete ${property.address}?`)) return;
                        await deleteProperty(property.id);
                        setActiveId(null);
                        setTab("clients");
                        await properties.refetch();
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition-colors hover:border-destructive/60 hover:text-destructive"
                    >
                      <Trash2 className="size-4" /> Delete property
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="schedule">
                <h2 id="schedule" className={label}>
                  Schedule a visit
                </h2>
                <form
                  className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!appt.at || !appt.service.trim()) return;
                    await createAppointment({
                      propertyId: property.id,
                      scheduledAt: appt.at,
                      service: appt.service.trim(),
                      notes: appt.notes,
                    });
                    await updateProperty(property.id, {
                      next_visit_at: new Date(appt.at).toISOString(),
                      next_visit_note: appt.service.trim(),
                    });
                    setAppt({ at: "", service: "", notes: "" });
                    setSaved("Appointment scheduled.");
                    await Promise.all([
                      propertyAppointments.refetch(),
                      allAppointments.refetch(),
                      properties.refetch(),
                    ]);
                  }}
                >
                  <input
                    required
                    type="datetime-local"
                    value={appt.at}
                    onChange={(e) => setAppt({ ...appt, at: e.target.value })}
                    aria-label="Date and time"
                    className={field}
                  />
                  <input
                    required
                    value={appt.service}
                    onChange={(e) => setAppt({ ...appt, service: e.target.value })}
                    placeholder="Quarterly walkthrough"
                    aria-label="Service"
                    className={field}
                  />
                  <input
                    value={appt.notes}
                    onChange={(e) => setAppt({ ...appt, notes: e.target.value })}
                    placeholder="Notes (optional)"
                    aria-label="Notes"
                    className={field}
                  />
                  <button type="submit" className={btn}>
                    <Plus className="size-4" /> Schedule
                  </button>
                </form>

                <h3 className={`${label} mt-8`}>Upcoming visits</h3>
                <ul className="mt-4 space-y-3">
                  {upcomingProperty.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{a.service}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(a.scheduled_at)}
                        </p>
                        {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await updateAppointment(a.id, {
                              reminder_sent_at: new Date().toISOString(),
                            });
                            setSaved("Reminder logged for this appointment.");
                            await allAppointments.refetch();
                          }}
                          className={ghostBtn}
                        >
                          {a.reminder_sent_at ? "Reminder sent" : "Send reminder"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await updateAppointment(a.id, { status: "Completed" });
                            await addActivity(a.property_id, `${a.service} completed`);
                            await incrementTasksCompleted(a.property_id);
                            setSaved("Marked complete and logged to the client's activity feed.");
                            await Promise.all([
                              allAppointments.refetch(),
                              propertyAppointments.refetch(),
                              activity.refetch(),
                              properties.refetch(),
                            ]);
                          }}
                          className={ghostBtn}
                        >
                          Mark complete
                        </button>
                        <button
                          type="button"
                          aria-label="Delete appointment"
                          onClick={async () => {
                            await deleteAppointment(a.id);
                            await Promise.all([
                              allAppointments.refetch(),
                              propertyAppointments.refetch(),
                            ]);
                          }}
                          className="rounded-full border border-border p-1.5 transition-colors hover:border-destructive/60 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {!upcomingProperty.length && (
                    <li className="text-sm text-muted-foreground">Nothing scheduled.</li>
                  )}
                </ul>

                <h3 className={`${label} mt-8`}>Appointment history</h3>
                <ul className="mt-4 space-y-3">
                  {(propertyAppointments.data ?? []).map((a) => (
                    <li key={a.id} className="flex gap-3">
                      <CheckCircle2
                        className={`mt-0.5 size-4 shrink-0 ${
                          a.status === "Completed" ? "text-emerald-400" : "text-muted-foreground"
                        }`}
                      />
                      <div>
                        <p className="text-sm">{a.service}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(a.scheduled_at)} · {a.status}
                        </p>
                      </div>
                    </li>
                  ))}
                  {!propertyAppointments.data?.length && (
                    <li className="text-sm text-muted-foreground">No appointments yet.</li>
                  )}
                </ul>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="client-home-notes">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h2 id="client-home-notes" className={label}>
                    Client home notes &amp; special instructions
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Tasks logged:{" "}
                    <span className="font-display text-lg text-primary">
                      {property.tasks_completed_count ?? 0}
                    </span>
                  </p>
                </div>
                <ul className="mt-5 space-y-3">
                  {parseHomeNotes(property.home_notes).map((entry, i) => (
                    <li
                      key={`${i}-${entry.slice(0, 24)}`}
                      className="rounded-sm border border-border bg-background/40 px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground"
                    >
                      {entry}
                    </li>
                  ))}
                  {!parseHomeNotes(property.home_notes).length && (
                    <li className="text-sm text-muted-foreground">
                      This member hasn't left any instructions yet.
                    </li>
                  )}
                </ul>
              </section>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="panel rounded-sm p-6" aria-labelledby="post-report">
                  <h2 id="post-report" className={label}>
                    Visit reports &amp; activity
                  </h2>
                  <form
                    className="mt-5 flex gap-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!activityTitle.trim()) return;
                      await addActivity(property.id, activityTitle.trim());
                      await incrementTasksCompleted(property.id);
                      setActivityTitle("");
                      await Promise.all([activity.refetch(), properties.refetch()]);
                    }}
                  >
                    <input
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      placeholder="HVAC seasonal maintenance completed"
                      aria-label="Activity title"
                      className={field}
                    />
                    <button type="submit" className={`${btn} shrink-0 px-5`}>
                      Post
                    </button>
                  </form>
                  <ul className="mt-5 space-y-3">
                    {(activity.data ?? []).map((a) => (
                      <li key={a.id} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                        <div className="flex-1">
                          <p className="text-sm">{a.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(a.occurred_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Delete activity"
                          onClick={async () => {
                            await deleteActivity(a.id);
                            await activity.refetch();
                          }}
                          className="shrink-0 rounded-full border border-border p-1.5 transition-colors hover:border-destructive/60 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    ))}
                    {!activity.data?.length && (
                      <li className="text-sm text-muted-foreground">No reports posted yet.</li>
                    )}
                  </ul>
                </section>

                <section className="panel rounded-sm p-6" aria-labelledby="recommendations">
                  <h2 id="recommendations" className={label}>
                    Urgent repairs &amp; recommended maintenance
                  </h2>
                  <form
                    className="mt-5 space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!item.title.trim()) return;
                      await addOpenItem(property.id, item.title.trim(), item.detail, item.priority);
                      setItem({ title: "", detail: "", priority: "Low" });
                      await openItems.refetch();
                    }}
                  >
                    <input
                      value={item.title}
                      onChange={(e) => setItem({ ...item, title: e.target.value })}
                      placeholder="Monitor water heater"
                      aria-label="Item title"
                      className={field}
                    />
                    <input
                      value={item.detail}
                      onChange={(e) => setItem({ ...item, detail: e.target.value })}
                      placeholder="Minor sediment noise noted."
                      aria-label="Item detail"
                      className={field}
                    />
                    <div className="flex gap-3">
                      <select
                        value={item.priority}
                        onChange={(e) => setItem({ ...item, priority: e.target.value })}
                        aria-label="Priority"
                        className={field}
                      >
                        <option value="High">High — urgent repair</option>
                        <option value="Medium">Medium — recommended</option>
                        <option value="Low">Low — recommended</option>
                      </select>
                      <button type="submit" className={`${btn} shrink-0 px-5`}>
                        Add
                      </button>
                    </div>
                  </form>
                  <ul className="mt-5 space-y-3">
                    {(openItems.data ?? []).map((o) => (
                      <li
                        key={o.id}
                        className="flex items-start justify-between gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
                      >
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              o.resolved ? "line-through opacity-60" : ""
                            }`}
                          >
                            {o.title}
                          </p>
                          {o.detail && (
                            <p className="mt-1 text-xs text-muted-foreground">{o.detail}</p>
                          )}
                          <p className="mt-1 text-[11px] uppercase text-muted-foreground">
                            {o.priority === "High" ? "Urgent repair" : `${o.priority} priority`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await resolveOpenItem(o.id, !o.resolved);
                              await openItems.refetch();
                            }}
                            className={ghostBtn}
                          >
                            {o.resolved ? "Reopen" : "Resolve"}
                          </button>
                          <button
                            type="button"
                            aria-label="Delete item"
                            onClick={async () => {
                              await deleteOpenItem(o.id);
                              await openItems.refetch();
                            }}
                            className="rounded-full border border-border p-1.5 transition-colors hover:border-destructive/60 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                    {!openItems.data?.length && (
                      <li className="text-sm text-muted-foreground">Nothing logged yet.</li>
                    )}
                  </ul>
                </section>
              </div>

              <section className="panel rounded-sm p-6" aria-labelledby="custom-invoice">
                <h2 id="custom-invoice" className={label}>
                  Issue custom invoice — this property
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  For ad-hoc service work. The member pays it with a card from their portal.
                </p>
                <form
                  className="mt-5 grid gap-3 sm:grid-cols-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!property) return;
                    const created = await createInvoice({
                      ownerId: property.owner_id,
                      propertyId: property.id,
                      amount: Number(customInv.amount),
                      description: customInv.description,
                      dueDate: customInv.dueDate || null,
                      status: "Due",
                      kind: "Custom",
                    });
                    setCustomInv({ description: "", amount: "", dueDate: "" });
                    await allInvoices.refetch();
                    try {
                      const res = await notifyInvoice({ data: { invoiceId: created.id } });
                      setSaved(
                        res.ok
                          ? `Invoice issued — payment due email sent to ${res.email}.`
                          : `Invoice issued. ${res.error ?? ""}`,
                      );
                    } catch (err) {
                      setSaved(
                        `Invoice issued, but the email failed: ${err instanceof Error ? err.message : "unknown error"}`,
                      );
                    }
                  }}
                >
                  <input
                    required
                    value={customInv.description}
                    onChange={(e) => setCustomInv({ ...customInv, description: e.target.value })}
                    placeholder="Invoice title / description"
                    aria-label="Invoice description"
                    className={`${field} sm:col-span-2`}
                  />
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={customInv.amount}
                    onChange={(e) => setCustomInv({ ...customInv, amount: e.target.value })}
                    placeholder="Amount ($)"
                    aria-label="Invoice amount"
                    className={field}
                  />
                  <input
                    type="date"
                    value={customInv.dueDate}
                    onChange={(e) => setCustomInv({ ...customInv, dueDate: e.target.value })}
                    aria-label="Due date"
                    className={field}
                  />
                  <button type="submit" className={`${btn} sm:col-span-4`}>
                    <Plus className="size-4" /> Issue custom invoice
                  </button>
                </form>
                <ul className="mt-6 space-y-3">
                  {(allInvoices.data ?? [])
                    .filter((i) => i.property_id === property.id)
                    .map((i) => (
                      <li
                        key={i.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm">{i.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(i.issued_at).toLocaleDateString()}
                            {i.due_date
                              ? ` · due ${new Date(`${i.due_date}T00:00:00`).toLocaleDateString()}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">
                            {formatMoney(i.amount_cents)}
                          </span>
                          <span
                            className={`text-[11px] uppercase ${
                              i.status === "Paid" ? "text-emerald-400" : "text-destructive"
                            }`}
                          >
                            {i.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  {!(allInvoices.data ?? []).some((i) => i.property_id === property.id) && (
                    <li className="text-sm text-muted-foreground">
                      No custom invoices for this property yet.
                    </li>
                  )}
                </ul>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="admin-photos">
                <h2 id="admin-photos" className={label}>
                  Visit photos — auto-compressed WebP (≤200KB)
                </h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  Photos are grouped by visit date. A note is optional — you can add or edit it
                  under each photo at any time.
                </p>
                <div className="mt-5 flex flex-wrap items-start gap-3">
                  <textarea
                    value={photoNote}
                    onChange={(e) => setPhotoNote(e.target.value)}
                    rows={2}
                    placeholder="Contractor note (optional)"
                    aria-label="Photo note"
                    className="w-full min-w-0 flex-1 resize-y rounded-sm border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary/70 sm:min-w-[240px]"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void onPhoto(e.target.files?.[0])}
                  />
                  <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
                    <ImagePlus className="size-4" /> Upload photo
                  </button>
                </div>
                {uploadInfo && <p className="mt-3 text-xs text-primary">{uploadInfo}</p>}
                <div className="mt-6 space-y-8">
                  {groupPhotosByDate(photos.data ?? []).map(([day, items]) => (
                    <div key={day}>
                      <div className="hairline flex items-baseline justify-between gap-3 pb-3">
                        <h3 className="font-display text-lg">
                          {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {items.length} photo{items.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {items.map((p) => (
                          <PhotoCard
                            key={p.id}
                            photo={p}
                            onOpen={() => setLightbox(p)}
                            onChanged={async () => {
                              await photos.refetch();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {!photos.data?.length && (
                    <p className="text-sm text-muted-foreground">No photos yet.</p>
                  )}
                </div>

                {lightbox?.url && (
                  <PhotoLightbox
                    src={lightbox.url}
                    note={lightbox.note}
                    caption={new Date(lightbox.created_at).toLocaleString()}
                    onClose={() => setLightbox(null)}
                  />
                )}
              </section>
            </>
          )}

          {/* ---------------- Global views ---------------- */}
          {!property && tab === "clients" && (
            <>
              <section className="panel rounded-sm p-6" aria-labelledby="new-client">
                <h2 id="new-client" className={label}>
                  Add a client
                </h2>
                <form
                  className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setSaved(null);
                    try {
                      await createClientFn({
                        data: {
                          fullName: nc.fullName,
                          email: nc.email,
                          phone: nc.phone,
                          address: nc.address,
                          membershipTier: nc.membershipTier,
                          paymentStatus: nc.paymentStatus as "Paid" | "Missed Payment",
                          password: nc.password,
                        },
                      });
                      setNc({
                        fullName: "",
                        email: "",
                        phone: "",
                        address: "",
                        membershipTier: TIERS[0]!,
                        paymentStatus: "Paid",
                        password: "",
                      });
                      setSaved("Client created — share their temporary password.");
                      await Promise.all([profiles.refetch(), properties.refetch()]);
                    } catch (err) {
                      setSaved(err instanceof Error ? err.message : "Could not create client.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <input
                    required
                    value={nc.fullName}
                    onChange={(e) => setNc({ ...nc, fullName: e.target.value })}
                    placeholder="Full name"
                    aria-label="Full name"
                    className={field}
                  />
                  <input
                    required
                    type="email"
                    value={nc.email}
                    onChange={(e) => setNc({ ...nc, email: e.target.value })}
                    placeholder="Email"
                    aria-label="Email"
                    className={field}
                  />
                  <input
                    value={nc.phone}
                    onChange={(e) => setNc({ ...nc, phone: e.target.value })}
                    placeholder="Phone number"
                    aria-label="Phone number"
                    className={field}
                  />
                  <input
                    required
                    value={nc.address}
                    onChange={(e) => setNc({ ...nc, address: e.target.value })}
                    placeholder="123 Maple Drive, Franklin, TN"
                    aria-label="Property address"
                    className={field}
                  />
                  <select
                    value={nc.membershipTier}
                    onChange={(e) => setNc({ ...nc, membershipTier: e.target.value })}
                    aria-label="Membership tier"
                    className={field}
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <select
                    value={nc.paymentStatus}
                    onChange={(e) => setNc({ ...nc, paymentStatus: e.target.value })}
                    aria-label="Payment status"
                    className={field}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Missed Payment">Missed Payment</option>
                  </select>
                  <input
                    required
                    minLength={8}
                    value={nc.password}
                    onChange={(e) => setNc({ ...nc, password: e.target.value })}
                    placeholder="Temporary password (min 8)"
                    aria-label="Temporary password"
                    className={field}
                  />
                  <button type="submit" disabled={busy} className={btn}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Create client
                  </button>
                </form>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="directory">
                <h2 id="directory" className={label}>
                  Client directory
                </h2>
                <div className="mt-5 space-y-3">
                  {(profiles.data ?? []).map((p) => (
                    <ClientRow
                      key={p.id}
                      profile={p}
                      addresses={(properties.data ?? [])
                        .filter((x) => x.owner_id === p.id)
                        .map((o) => o.address)
                        .join(" · ")}
                      canDelete={!busy && p.id !== user?.id}
                      onSaved={async () => {
                        setSaved("Client updated.");
                        await profiles.refetch();
                      }}
                      onDelete={async () => {
                        if (!confirm(`Delete ${p.email} and all of their data?`)) return;
                        setBusy(true);
                        try {
                          await deleteClientFn({ data: { userId: p.id } });
                          setSaved("Client deleted.");
                          await Promise.all([profiles.refetch(), properties.refetch()]);
                        } catch (err) {
                          setSaved(err instanceof Error ? err.message : "Delete failed.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                  ))}
                  {!profiles.data?.length && (
                    <p className="text-sm text-muted-foreground">No clients yet.</p>
                  )}
                </div>
              </section>
            </>
          )}

          {!property && tab === "appointments" && (
            <section className="panel rounded-sm p-6" aria-labelledby="upcoming-all">
              <h2 id="upcoming-all" className={label}>
                Upcoming appointments — all clients
              </h2>
              <ul className="mt-5 space-y-3">
                {upcomingAll.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold">{a.service}</p>
                      <p className="text-xs text-muted-foreground">
                        {propertyLabel(a.property_id)} · {formatDateTime(a.scheduled_at)}
                      </p>
                      {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await updateAppointment(a.id, {
                            reminder_sent_at: new Date().toISOString(),
                          });
                          setSaved("Reminder logged for this appointment.");
                          await allAppointments.refetch();
                        }}
                        className={ghostBtn}
                      >
                        {a.reminder_sent_at ? "Reminder sent" : "Send reminder"}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateAppointment(a.id, { status: "Completed" });
                          await addActivity(a.property_id, `${a.service} completed`);
                          setSaved("Marked complete and logged to the client's activity feed.");
                          await allAppointments.refetch();
                        }}
                        className={ghostBtn}
                      >
                        Mark complete
                      </button>
                      <button
                        type="button"
                        aria-label="Delete appointment"
                        onClick={async () => {
                          await deleteAppointment(a.id);
                          await allAppointments.refetch();
                        }}
                        className="rounded-full border border-border p-1.5 transition-colors hover:border-destructive/60 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
                {!upcomingAll.length && (
                  <li className="text-sm text-muted-foreground">Nothing scheduled.</li>
                )}
              </ul>
            </section>
          )}

          {!property && tab === "invoices" && (
            <>
              <section className="panel rounded-sm p-6" aria-labelledby="new-invoice">
                <h2 id="new-invoice" className={label}>
                  Issue a membership invoice
                </h2>
                <form
                  className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!inv.ownerId || !inv.description.trim()) return;
                    await createInvoice({
                      ownerId: inv.ownerId,
                      amount: Number(inv.amount) || 0,
                      description: inv.description.trim(),
                      period: inv.period,
                      status: inv.status,
                    });
                    setInv({ ...inv, amount: "", description: "" });
                    setSaved("Invoice issued.");
                    await allInvoices.refetch();
                  }}
                >
                  <select
                    required
                    value={inv.ownerId}
                    onChange={(e) => setInv({ ...inv, ownerId: e.target.value })}
                    aria-label="Client"
                    className={field}
                  >
                    <option value="">Select client…</option>
                    {(profiles.data ?? []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    value={inv.description}
                    onChange={(e) => setInv({ ...inv, description: e.target.value })}
                    placeholder="Signature membership"
                    aria-label="Description"
                    className={field}
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={inv.amount}
                    onChange={(e) => setInv({ ...inv, amount: e.target.value })}
                    placeholder="Amount ($)"
                    aria-label="Amount"
                    className={field}
                  />
                  <select
                    value={inv.period}
                    onChange={(e) => setInv({ ...inv, period: e.target.value })}
                    aria-label="Period"
                    className={field}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual</option>
                  </select>
                  <button type="submit" className={btn}>
                    <Plus className="size-4" /> Issue
                  </button>
                </form>
              </section>

              <section className="panel rounded-sm p-6" aria-labelledby="all-invoices">
                <h2 id="all-invoices" className={label}>
                  All invoices — membership &amp; custom services
                </h2>
                <ul className="mt-5 space-y-3">
                  {(allInvoices.data ?? []).map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{i.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {ownerLabel(i.owner_id)} ·{" "}
                          {i.property_id ? propertyLabel(i.property_id) : "No property"} ·{" "}
                          {i.kind ?? "Membership"} · {new Date(i.issued_at).toLocaleDateString()}
                          {i.due_date
                            ? ` · due ${new Date(`${i.due_date}T00:00:00`).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold">{formatMoney(i.amount_cents)}</span>
                        <select
                          value={i.status}
                          aria-label="Invoice status"
                          onChange={async (e) => {
                            await updateInvoice(i.id, { status: e.target.value });
                            await allInvoices.refetch();
                          }}
                          className="h-9 rounded-full border border-border bg-background/60 px-4 text-xs"
                        >
                          <option value="Paid">Paid</option>
                          <option value="Due">Due</option>
                          <option value="Missed Payment">Missed Payment</option>
                        </select>
                        <button
                          type="button"
                          aria-label="Delete invoice"
                          onClick={async () => {
                            await deleteInvoice(i.id);
                            await allInvoices.refetch();
                          }}
                          className="rounded-full border border-border p-1.5 transition-colors hover:border-destructive/60 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {!allInvoices.data?.length && (
                    <li className="text-sm text-muted-foreground">No invoices yet.</li>
                  )}
                </ul>
              </section>
            </>
          )}

          {!property && tab === "site" && <SiteEditor />}
        </main>
      </div>
    </div>
  );
}
