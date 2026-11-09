import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { resolveRole, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tech-login")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }, { title: "Technician sign-in · HomeSake" }] }),
  component: TechnicianLogin,
});

function TechnicianLogin() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (role === "technician") void navigate({ to: "/tech", replace: true });
  }, [role, navigate]);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <section className="panel w-full max-w-md rounded-sm p-6">
        <Link to="/" className="text-primary">HomeSake</Link>
        <h1 className="font-display mt-3 text-3xl">Technician sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to see your assigned visits.</p>
        <form className="mt-5 grid gap-3" onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setNotice("");
          try {
            const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
            if (error) throw error;
            if (!data.user || await resolveRole(data.user.id) !== "technician") {
              throw new Error("Use a technician account for this portal.");
            }
            await navigate({ to: "/tech", replace: true });
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Could not sign in.");
          } finally {
            setBusy(false);
          }
        }}>
          <label className="grid gap-1 text-sm">Email
            <input required type="email" autoComplete="email" className="rounded border bg-background p-3" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Password
            <input required type="password" autoComplete="current-password" className="rounded border bg-background p-3" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-primary p-3 font-semibold text-primary-foreground">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" disabled={busy || !email.trim()} className="text-sm text-primary underline" onClick={async () => {
            setBusy(true);
            try {
              const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + "/reset-password" });
              setNotice(error ? error.message : "Check your inbox for a reset link.");
            } finally {
              setBusy(false);
            }
          }}>Send password reset email</button>
        </form>
        {notice && <p className="mt-3 text-sm" role="status">{notice}</p>}
        <nav className="mt-5 flex gap-4 text-sm">
          <Link to="/login" className="underline">Client sign-in</Link>
          <Link to="/admin/login" className="underline">Admin sign-in</Link>
        </nav>
      </section>
    </main>
  );
}
