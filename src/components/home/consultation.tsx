import { useState } from "react";
import { ArrowUpRight, CheckCircle2, PhoneCall } from "lucide-react";
import { z } from "zod";

import { useSiteContent } from "@/hooks/use-site-content";

const consultationSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(100),
  email: z.string().trim().email("Please enter a valid email address.").max(255),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a reachable phone number.")
    .max(25, "That phone number looks too long.")
    .regex(/^[0-9+()\-.\s]+$/, "Phone can only contain digits, spaces, + ( ) - ."),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid 5-digit ZIP code."),
  property: z.string().trim().max(80),
  window: z.string().trim().max(80),
  notes: z.string().trim().max(1000, "Please keep notes under 1000 characters.").optional(),
});

export function Consultation() {
  const { consultation } = useSiteContent();
  const accessKey = consultation.web3formsAccessKey.trim();

  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    zip: "",
    property: "",
    window: "",
    notes: "",
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFieldErrors((prev) => {
        if (!prev[k]) return prev;
        const next = { ...prev };
        delete next[k];
        return next;
      });
      setForm((f) => ({ ...f, [k]: e.target.value }));
    };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const parsed = consultationSchema.safeParse({
      ...form,
      property: form.property || consultation.propertyTypes[0] || "",
      window: form.window || consultation.callWindows[0] || "",
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setError("Please correct the highlighted fields.");
      return;
    }
    setFieldErrors({});

    if (!accessKey) {
      setError("The contact form is not configured yet. Please try again later.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: accessKey,
          subject: "New consultation request — Homesake",
          from_name: "Homesake",
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          zip: parsed.data.zip,
          property_type: parsed.data.property,
          call_window: parsed.data.window,
          notes: parsed.data.notes ?? "",
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (json.success) {
        setSent(true);
        setForm({ name: "", email: "", phone: "", zip: "", property: "", window: "", notes: "" });
      } else setError(json.message || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const field =
    "h-13 w-full rounded-sm border border-border bg-background/60 px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/70";
  const errCls = "border-destructive/70";
  const fieldError = (k: string) =>
    fieldErrors[k] ? (
      <p className="mt-1.5 text-xs text-destructive">{fieldErrors[k]}</p>
    ) : null;


  return (
    <section id="consultation" className="pt-14 pb-24 lg:pt-20 lg:pb-36">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="eyebrow">{consultation.eyebrow}</p>
            <h2 className="font-display mt-5 text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.03]">
              {consultation.title}
              <br />
              <span className="text-brass-gradient italic">{consultation.titleAccent}</span>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-muted-foreground">
              {consultation.body}
            </p>

            <div className="mt-10 space-y-4 text-sm text-muted-foreground">
              {consultation.bullets.map((t) => (
                <p key={t} className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 text-primary" />
                  {t}
                </p>
              ))}
            </div>

            {consultation.phoneLabel && consultation.phoneHref && (
              <a
                href={consultation.phoneHref}
                className="hairline mt-12 flex items-center gap-3 pt-6 text-foreground"
              >
                <PhoneCall className="size-4 text-primary" />
                <span className="font-display text-2xl">{consultation.phoneLabel}</span>
              </a>
            )}
          </div>

          <div className="panel rounded-sm p-8 sm:p-10">
            {sent ? (
              <div className="flex min-h-96 flex-col items-start justify-center">
                <CheckCircle2 className="size-10 text-primary" />
                <h3 className="font-display mt-6 text-3xl">{consultation.successTitle}</h3>
                <p className="mt-3 max-w-sm text-muted-foreground">
                  Thank you, {form.name || "friend"}. {consultation.successBody}
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-8 text-sm text-primary underline underline-offset-4"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} />
                <div className="sm:col-span-2">
                  <input
                    value={form.name}
                    name="name"
                    onChange={set("name")}
                    placeholder="Full name"
                    aria-label="Full name"
                    aria-invalid={!!fieldErrors["name"]}
                    className={`${field} ${fieldErrors["name"] ? errCls : ""}`}
                  />
                  {fieldError("name")}
                </div>
                <div>
                  <input
                    type="email"
                    value={form.email}
                    name="email"
                    onChange={set("email")}
                    placeholder="Email address"
                    aria-label="Email address"
                    aria-invalid={!!fieldErrors["email"]}
                    className={`${field} ${fieldErrors["email"] ? errCls : ""}`}
                  />
                  {fieldError("email")}
                </div>
                <div>
                  <input
                    value={form.phone}
                    name="phone"
                    onChange={set("phone")}
                    placeholder="Phone"
                    aria-label="Phone"
                    aria-invalid={!!fieldErrors["phone"]}
                    className={`${field} ${fieldErrors["phone"] ? errCls : ""}`}
                  />
                  {fieldError("phone")}
                </div>
                <div>
                  <input
                    value={form.zip}
                    name="zip"
                    onChange={set("zip")}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="Property ZIP"
                    aria-label="Property ZIP"
                    aria-invalid={!!fieldErrors["zip"]}
                    className={`${field} ${fieldErrors["zip"] ? errCls : ""}`}
                  />
                  {fieldError("zip")}
                </div>
                <select
                  value={form.property || consultation.propertyTypes[0] || ""}
                  name="property_type"
                  onChange={set("property")}
                  aria-label="Property type"
                  className={field}
                >
                  {consultation.propertyTypes.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={form.window || consultation.callWindows[0] || ""}
                  name="call_window"
                  onChange={set("window")}
                  aria-label="Preferred call window"
                  className={`${field} sm:col-span-2`}
                >
                  {consultation.callWindows.map((w) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
                <div className="sm:col-span-2">
                  <textarea
                    value={form.notes}
                    name="notes"
                    onChange={set("notes")}
                    rows={4}
                    maxLength={1000}
                    placeholder="Anything we should know about the home?"
                    aria-label="Notes"
                    aria-invalid={!!fieldErrors["notes"]}
                    className={`w-full rounded-sm border bg-background/60 px-4 py-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/70 ${
                      fieldErrors["notes"] ? errCls : "border-border"
                    }`}
                  />
                  {fieldError("notes")}
                </div>

                {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="group mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-all hover:gap-3 disabled:opacity-60 sm:col-span-2"
                >
                  {sending ? "Sending…" : consultation.submitLabel}
                  <ArrowUpRight className="size-4 transition-transform group-hover:rotate-45" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
