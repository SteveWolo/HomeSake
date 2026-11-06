import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import logoUrl from "@/assets/homesake-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { resolveRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "Set a New Password — Homesake" },
      {
        name: "description",
        content:
          "Choose a new password for your Homesake portal account after requesting a reset link.",
      },
      { property: "og:title", content: "Set a New Password — Homesake" },
      {
        property: "og:description",
        content: "Securely update your member or admin portal password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Supabase puts the recovery session in place from the emailed link. The
  // PASSWORD_RECOVERY event fires once the link's tokens are exchanged.
  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
      else if (event === "INITIAL_SESSION") setReady(Boolean(session));
    });
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const field =
    "h-12 w-full rounded-sm border border-border bg-background/60 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/70";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (password.length < 8) throw new Error("Use at least 8 characters.");
      if (password !== confirm) throw new Error("Both passwords must match.");
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      const userId = data.user?.id;
      const role = userId ? await resolveRole(userId) : "client";
      setTimeout(
        () => navigate({ to: role === "admin" ? "/admin" : "/dashboard", replace: true }),
        1200,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="flex justify-center" aria-label="Homesake — home">
          <img src={logoUrl} alt="Homesake logo" className="h-11 w-auto" />
        </Link>

        <div className="panel mt-10 rounded-sm p-8">
          <p className="eyebrow">Account security</p>
          <h1 className="font-display mt-3 text-3xl">Set a new password</h1>

          {done ? (
            <p className="mt-4 text-sm text-emerald-400">
              Password updated — taking you to your portal…
            </p>
          ) : (
            <>
              {!ready && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Open this page from the reset link in your email, then choose a new password.
                </p>
              )}
              <form className="mt-6 space-y-3" onSubmit={submit}>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  aria-label="New password"
                  className={field}
                />
                <input
                  required
                  type="password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  aria-label="Confirm new password"
                  className={field}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-2 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <KeyRound className="size-4" />
                  )}
                  Update password
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/login" className="transition-colors hover:text-foreground">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
