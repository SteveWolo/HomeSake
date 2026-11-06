import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, ImagePlus, Loader2, MapPin, Plus, Trash2, Upload, X } from "lucide-react";

import { lookupZip, type Area } from "@/lib/zip-coverage";

import { siteContentQueryKey } from "@/hooks/use-site-content";
import { formatBytes } from "@/lib/image-compress";
import {
  fetchSiteContent,
  saveSiteContent,
  uploadSiteImage,
  uploadSiteVideo,
  type SiteContent,
} from "@/lib/site-content";

type Json = unknown;

type EditorGroup =
  | "landing"
  | "team"
  | "benefits"
  | "faq"
  | "standards"
  | "terms"
  | "global";

const SECTIONS: { key: keyof SiteContent; label: string; hint: string; group: EditorGroup }[] = [
  {
    key: "seo",
    label: "SEO & analytics",
    hint: "Meta title/description/keywords, custom head & body scripts",
    group: "global",
  },
  { key: "header", label: "Header & navigation", hint: "Logo, menu links, portal button", group: "global" },
  { key: "hero", label: "Hero section", hint: "Headline, buttons, background image, trust badge", group: "landing" },
  { key: "health", label: "Dashboard preview", hint: "Score, indicators, next visit card", group: "landing" },
  { key: "services", label: "How it works & services", hint: "Steps, photo, service cards", group: "landing" },
  {
    key: "coverage",
    label: "Service area checker",
    hint: "Copy, served areas (any ZIP in the same city counts), result messages",
    group: "landing",
  },
  { key: "pricing", label: "Membership pricing", hint: "Toggle labels, tiers, features", group: "landing" },
  { key: "consultation", label: "Consultation form", hint: "Copy, phone, Web3Forms key, options", group: "landing" },
  { key: "faq", label: "FAQ content", hint: "Page introduction, search text, categories, questions and answers", group: "faq" },
  { key: "standards", label: "Standards content", hint: "Page introduction, process, working standards, principles and promise", group: "standards" },
  {
    key: "terms",
    label: "Terms & conditions page",
    hint: "Headline, intro, every legal section on /terms, closing note",
    group: "terms",
  },
  {
    key: "team",
    label: "Meet the team page",
    hint: "Header, founder bio, photo, quote and the values cards on /meet-the-team",
    group: "team",
  },
  {
    key: "benefits",
    label: "Membership benefits page",
    hint: "Comparison chart, 350 checkpoints, schedule, quick-care lists and exclusions",
    group: "benefits",
  },
  { key: "footer", label: "Footer", hint: "Brand text, link columns, legal line, credit", group: "global" },

];

const inputCls =
  "h-10 w-full rounded-sm border border-border bg-background/60 px-3 text-sm outline-none focus:border-primary/70";
const areaCls =
  "w-full rounded-sm border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/70";
const labelCls = "text-[11px] tracking-[0.14em] text-muted-foreground uppercase";

function humanize(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

/** Only true image-source fields get an upload control — never alt/caption text. */
const isImageKey = (key: string) =>
  /^(logo|logoUrl|image|imageUrl|imageSrc|avatar|avatarUrl|photo|photoUrl|poster|founderImage|background|backgroundImage)$/i.test(
    key,
  );
const isLinkKey = (key: string) => /href|url|link/i.test(key);
const isLongKey = (key: string) =>
  /body|blurb|intro|subtitle|note|tagline|description|success/i.test(key);


/** Image field: uploads through the WebP compressor, then stores a hosted URL. */
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setInfo(null);
    try {
      const { url, size } = await uploadSiteImage(file);
      onChange(url);
      setInfo(`Optimized to WebP · ${formatBytes(file.size)} → ${formatBytes(size)}`);
    } catch (err) {
      setInfo(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="grid gap-2">
      <span className={labelCls}>{label}</span>
      <div className="flex items-start gap-3">
        {value && (
          <img
            src={value}
            alt=""
            className="size-20 shrink-0 rounded-sm border border-border object-cover"
          />
        )}
        <div className="flex-1 space-y-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            onChange={(e) => void pick(e.target.files?.[0])}
            className="hidden"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => ref.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-3 py-1.5 text-[11px] uppercase text-primary disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              {busy ? "Uploading" : "Change image"}
            </button>
          </div>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Image URL"
            aria-label={`${label} URL`}
            className={inputCls}
          />
          {info && <p className="text-[11px] text-muted-foreground">{info}</p>}
        </div>
      </div>
    </div>
  );
}

/** Video field: uploads an MP4/WebM without image compression and stores its hosted URL. */
function VideoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setInfo(null);
    try {
      const { url, size } = await uploadSiteVideo(file);
      onChange(url);
      setInfo(`Video uploaded · ${formatBytes(size)}`);
    } catch (err) {
      setInfo(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="grid gap-2">
      <span className={labelCls}>{label}</span>
      {value && (
        <video
          src={value}
          controls
          preload="metadata"
          className="aspect-video w-full max-w-xl rounded-sm border border-border bg-background object-contain"
        />
      )}
      <input
        ref={ref}
        type="file"
        accept="video/mp4,video/webm"
        onChange={(event) => void pick(event.target.files?.[0])}
        className="hidden"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 px-3 py-1.5 text-[11px] uppercase text-primary disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {busy ? "Uploading" : value ? "Replace video" : "Upload video"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] uppercase text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Clear
          </button>
        )}
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Video URL"
        aria-label={`${label} URL`}
        className={inputCls}
      />
      <p className="text-[11px] text-muted-foreground">MP4 or WebM, up to 20MB.</p>
      {info && <p className="text-[11px] text-muted-foreground">{info}</p>}
    </div>
  );
}

/** Served-area list: each row is one ZIP whose whole city/state is covered. */
function AreaList({
  label,
  areas,
  onChange,
}: {
  label: string;
  areas: Area[];
  onChange: (next: Area[]) => void;
}) {
  const [lookups, setLookups] = useState<Record<number, string>>({});

  const resolve = async (i: number, zip: string) => {
    if (!/^\d{5}$/.test(zip)) {
      setLookups((s) => ({ ...s, [i]: "Enter a 5-digit ZIP." }));
      return;
    }
    setLookups((s) => ({ ...s, [i]: "Checking…" }));
    const place = await lookupZip(zip);
    if (!place) {
      setLookups((s) => ({ ...s, [i]: "ZIP not recognised." }));
      return;
    }
    const name = `${place.city}, ${place.state}`;
    onChange(areas.map((a, j) => (j === i ? { ...a, name } : a)));
    setLookups((s) => ({
      ...s,
      [i]: `Covers every ZIP in ${place.city}, ${place.state}.`,
    }));
  };

  return (
    <div className="grid gap-3 rounded-sm border border-border/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={labelCls}>{label}</span>
        <button
          type="button"
          onClick={() => onChange([...areas, { zip: "", name: "" }])}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] uppercase hover:border-primary/60 hover:text-primary"
        >
          <Plus className="size-3" /> Add area
        </button>
      </div>
      {areas.map((area, i) => (
        <div
          key={i}
          className="grid gap-3 rounded-sm border border-border/50 bg-background/30 p-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end"
        >
          <label className="grid gap-2">
            <span className={labelCls}>ZIP</span>
            <input
              value={area.zip}
              inputMode="numeric"
              maxLength={5}
              onChange={(e) =>
                onChange(areas.map((a, j) => (j === i ? { ...a, zip: e.target.value } : a)))
              }
              onBlur={(e) => void resolve(i, e.target.value.trim())}
              className={inputCls}
            />
          </label>
          <label className="grid gap-2">
            <span className={labelCls}>Area name (City, ST)</span>
            <input
              value={area.name}
              placeholder="Palo Alto, CA"
              onChange={(e) =>
                onChange(areas.map((a, j) => (j === i ? { ...a, name: e.target.value } : a)))
              }
              className={inputCls}
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void resolve(i, area.zip.trim())}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/50 px-3 text-[11px] uppercase text-primary"
            >
              <MapPin className="size-3.5" /> Detect
            </button>
            <button
              type="button"
              aria-label={`Remove ${label} ${i + 1}`}
              onClick={() => onChange(areas.filter((_, j) => j !== i))}
              className="rounded-full border border-border p-2 hover:border-destructive/60 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          {lookups[i] && (
            <p className="text-[11px] text-muted-foreground sm:col-span-3">{lookups[i]}</p>
          )}
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Visitors do not have to type the exact ZIP listed here — any ZIP in the same city and state
        is matched automatically.
      </p>
    </div>
  );
}

/** Recursive editor for the content document: strings, numbers, flags, lists, groups. */
function Node({
  value,
  fieldKey,
  onChange,
}: {
  value: Json;
  fieldKey: string;
  onChange: (next: Json) => void;
}) {
  const label = humanize(fieldKey);

  if (
    (fieldKey === "coveredAreas" || fieldKey === "waitlistAreas") &&
    Array.isArray(value)
  ) {
    return (
      <AreaList
        label={label}
        areas={value as Area[]}
        onChange={(next) => onChange(next as Json)}
      />
    );
  }

  if (typeof value === "string") {
    if (fieldKey === "src") {
      return <VideoField label="Video file" value={value} onChange={onChange} />;
    }
    if (isImageKey(fieldKey)) {
      return <ImageField label={label} value={value} onChange={onChange} />;
    }
    if (isLongKey(fieldKey) || value.length > 90) {
      return (
        <label className="grid gap-2">
          <span className={labelCls}>{label}</span>
          <textarea
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={areaCls}
          />
        </label>
      );
    }
    return (
      <label className="grid gap-2">
        <span className={labelCls}>{isLinkKey(fieldKey) ? `${label} (link)` : label}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isLinkKey(fieldKey) ? "#section, /login or https://…" : undefined}
          className={inputCls}
        />
      </label>
    );
  }

  if (typeof value === "number") {
    return (
      <label className="grid gap-2">
        <span className={labelCls}>{label}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputCls}
        />
      </label>
    );
  }

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-[var(--color-primary)]"
        />
        {label}
      </label>
    );
  }

  if (Array.isArray(value)) {
    const template = (): Json => {
      const first = value[0];
      if (typeof first === "string") return "";
      if (typeof first === "number") return 0;
      if (first && typeof first === "object") {
        const blank: Record<string, Json> = {};
        for (const [k, v] of Object.entries(first as Record<string, Json>)) {
          blank[k] = typeof v === "string" ? "" : typeof v === "number" ? 0 : typeof v === "boolean" ? false : Array.isArray(v) ? [] : {};
        }
        return blank;
      }
      return "";
    };

    return (
      <div className="grid gap-3 rounded-sm border border-border/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className={labelCls}>{label}</span>
          <button
            type="button"
            onClick={() => onChange([...value, template()])}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] uppercase hover:border-primary/60 hover:text-primary"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>
        {value.map((item, i) => (
          <div key={i} className="grid gap-3 rounded-sm border border-border/50 bg-background/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {label} #{i + 1}
              </span>
              <button
                type="button"
                aria-label={`Remove ${label} ${i + 1}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="rounded-full border border-border p-1 hover:border-destructive/60 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <Node
              value={item}
              fieldKey={fieldKey.replace(/s$/, "")}
              onChange={(next) => onChange(value.map((v, j) => (j === i ? next : v)))}
            />
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, Json>);
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map(([k, v]) => {
          const wide = Array.isArray(v) || (v && typeof v === "object") || isLongKey(k) || isImageKey(k);
          return (
            <div key={k} className={wide ? "sm:col-span-2" : ""}>
              <Node
                value={v}
                fieldKey={k}
                onChange={(next) => onChange({ ...(value as Record<string, Json>), [k]: next })}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

export function SiteEditor() {
  const queryClient = useQueryClient();
  const saved = useQuery({ queryKey: siteContentQueryKey, queryFn: fetchSiteContent });
  const [draft, setDraft] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<keyof SiteContent>("hero");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (saved.data && !draft) setDraft(saved.data);
  }, [saved.data, draft]);

  if (!draft) {
    return (
      <div className="grid min-h-40 place-items-center">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  const active = SECTIONS.find((s) => s.key === section)!;
  const group = active.group;
  const groups: { id: EditorGroup; label: string }[] = [
    { id: "landing", label: "Landing page" },
    { id: "team", label: "Meet the Team page" },
    { id: "benefits", label: "Membership Benefits page" },
    { id: "faq", label: "FAQ page" },
    { id: "standards", label: "Our Standards page" },
    { id: "terms", label: "Terms page" },
    { id: "global", label: "Global header & footer" },
  ];

  const publish = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await saveSiteContent(draft);
      await queryClient.invalidateQueries({ queryKey: siteContentQueryKey });
      setStatus("Website updated — changes are live.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Site editor</p>
          <h2 className="font-display mt-2 text-3xl">Edit the public website</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Choose a page, then edit its headings, paragraphs, links, lists, and images.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm hover:border-primary/60 hover:text-primary"
          >
            <ExternalLink className="size-4" /> View site
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={() => void publish()}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Publish changes
          </button>
        </div>
      </header>

      {status && <p className="text-sm text-primary">{status}</p>}

      <div className="grid gap-3 border-b border-border pb-5 sm:grid-cols-2 lg:grid-cols-5">
        {groups.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              const first = SECTIONS.find((candidate) => candidate.group === item.id);
              if (first) setSection(first.key);
            }}
            className={`min-h-11 rounded-sm border px-4 py-2 text-left text-xs transition-colors ${
              group === item.id
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.filter((item) => item.group === group).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setSection(item.key)}
            className={`rounded-full border px-4 py-2 text-xs transition-colors ${
              section === item.key
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="rounded-sm border border-border bg-background/40 p-6">
        <p className="text-sm font-semibold">{active.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{active.hint}</p>
        <div className="mt-6">
          <Node
            value={draft[section] as Json}
            fieldKey={String(section)}
            onChange={(next) => setDraft({ ...draft, [section]: next } as SiteContent)}
          />
        </div>
      </section>
    </div>
  );
}
