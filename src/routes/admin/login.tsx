import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

import logoUrl from "@/assets/homesake-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { resolveRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Admin & Contractor Login — Homesake" },
      {
        name: "description",
        content:
          "Estate managers and contractors sign in here to manage clients, appointments, visit reports, and invoices.",
      },
      { property: "og:title", content: "Admin & Contractor Login — Homesake" },
      {
        property: "og:description",
        content: "Internal operations sign-in for estate managers and contractors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetNotice(null);
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else setResetNotice(`Reset link sent to ${resetEmail.trim()} — check your inbox.`);
  };

  // Clients never belong here — send them to their own portal.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user?.id;
      if (!userId || !active) return;
      const role = await resolveRole(userId);
      if (!active) return;
      navigate({ to: role === "admin" ? "/admin" : "/dashboard", replace: true });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      if (!data.user) throw new Error("Sign-in failed.");
      const role = await resolveRole(data.user.id);
      if (role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("This login is for admins only. Please use the client portal login.");
      }
      navigate({ to: "/admin", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "h-12 w-full rounded-sm border border-border bg-background/60 pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/70";

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center" aria-label="Homesake — home">
          <img src={logoUrl} alt="Homesake logo" className="h-11 w-auto" />
        </Link>

        <div className="panel mt-10 rounded-sm p-8">
          {mode === "forgot" ? (
            <>
              <p className="eyebrow">Password help</p>
              <h1 className="font-display mt-3 text-3xl">Reset your password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your admin email and we'll send you a secure reset link.
              </p>

              <form className="mt-7 space-y-3" onSubmit={(e) => void sendReset(e)}>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Admin email address"
                    aria-label="Admin email address"
                    className={field}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                {resetNotice && <p className="text-sm text-emerald-400">{resetNotice}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Send reset link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setResetNotice(null);
                  }}
                  className="w-full pt-1 text-center text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  ← Back to sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="eyebrow">Admin &amp; contractor</p>
              <h1 className="font-display mt-3 text-3xl">Operations sign in</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage clients, properties, appointments, visit reports, and invoices.
              </p>

              <form className="mt-7 space-y-3" onSubmit={submit}>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Admin email address"
                    aria-label="Admin email address"
                    className={field}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    aria-label="Password"
                    className={field}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setResetEmail(email);
                    setError(null);
                  }}
                  className="w-full pt-1 text-center text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  Forgot password?
                </button>
              </form>

              <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Restricted to estate managers and contractors.
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="transition-colors hover:text-foreground">
            Client portal login →
          </Link>
        </p>
      </div>
    </div>
  );
}
