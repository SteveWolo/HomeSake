import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateTechnician } from "@/lib/admin-technicians.functions";
import type { Appointment, Property } from "@/lib/portal";

const field = "min-h-11 rounded-sm border border-border bg-background px-3 text-sm";
const button = "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
const teamKey = ["technician-team"];

function useTeam() {
  return useQuery({
    queryKey: teamKey,
    queryFn: async () => {
      const { data, error } = await supabase.from("technicians").select("user_id,name").order("name");
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

export function TechnicianTeam() {
  const team = useTeam();
  const cache = useQueryClient();
  const create = useServerFn(adminCreateTechnician);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const save = useMutation({
    mutationFn: () => create({ data: { name, email, password } }),
    onSuccess: async () => {
      setName("");
      setEmail("");
      setPassword("");
      await Promise.all([cache.invalidateQueries({ queryKey: teamKey }), cache.invalidateQueries({ queryKey: ["client-profiles"] })]);
    },
  });

  return (
    <section className="panel rounded-sm p-6" aria-labelledby="technician-team">
      <h2 id="technician-team" className="font-display text-xl">Technicians</h2>
      <p className="mt-2 text-sm text-muted-foreground">Create a separate account for each technician. Set a default technician on a client property or assign a specific visit in its workspace.</p>
      <Link to="/tech-login" className="mt-2 inline-block text-sm text-primary underline">Technician sign-in page</Link>
      {team.isError && <p role="alert" className="mt-2 text-sm">Could not load the team.</p>}
      {!!team.data?.length && <ul className="mt-3 list-disc pl-5 text-sm">
        {team.data.map((tech) => <li key={tech.user_id}>{tech.name}</li>)}
      </ul>}
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <label className="grid gap-1 text-sm">Name
          <input className={field} required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">Email
          <input className={field} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">Initial password (12 characters minimum)
          <input className={field} type="password" autoComplete="new-password" required minLength={12} maxLength={72}
            value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button className={`${button} self-end justify-self-start`} disabled={save.isPending}>Create technician</button>
      </form>
      {save.isSuccess && <p role="status" className="mt-2 text-sm">Technician created. Share the sign-in link and credentials securely.</p>}
      {save.error && <p role="alert" className="mt-2 text-sm text-destructive">{save.error.message}</p>}
    </section>
  );
}

export function AssignTechnician({ visit, onAssigned }: { visit: Appointment; onAssigned: () => Promise<unknown> }) {
  const team = useTeam();
  const save = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.from("appointments").update({ technician_id: value || null }).eq("id", visit.id);
      if (error) throw new Error(error.message);
      await onAssigned();
    },
  });
  return (
    <div className="mt-3">
      <label className="grid gap-1 text-sm">Assigned technician
        <select className={field} disabled={!team.isSuccess || save.isPending}
          value={visit.technician_id ?? ""} onChange={(event) => save.mutate(event.target.value)}>
          <option value="">Unassigned</option>
          {team.data?.map((tech) => <option key={tech.user_id} value={tech.user_id}>{tech.name}</option>)}
        </select>
      </label>
      {team.isError && <p role="alert" className="text-sm">Could not load technicians.</p>}
      {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
      {save.isSuccess && <p role="status" className="text-sm">Assignment saved.</p>}
    </div>
  );
}

export function AssignPropertyTechnician({ property, onAssigned }: { property: Property; onAssigned: () => Promise<unknown> }) {
  const team = useTeam();
  const save = useMutation({
    mutationFn: async (value: string) => {
      const { data, error } = await supabase.rpc("set_property_technician", {
        property_key: property.id, technician_key: value || null,
      });
      if (error) throw new Error(error.message);
      await onAssigned();
      return data;
    },
  });
  return (
    <section className="panel rounded-sm p-6" aria-labelledby="property-technician">
      <h2 id="property-technician" className="font-display text-xl">Client’s technician</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        The default applies to future bookings and unassigned upcoming visits for this property.
        Existing assignments stay on their visits.
      </p>
      <label className="mt-4 grid gap-1 text-sm">Default technician
        <select className={field} disabled={!team.isSuccess || save.isPending}
          value={property.default_technician_id ?? ""} onChange={(event) => save.mutate(event.target.value)}>
          <option value="">No default technician</option>
          {team.data?.map((tech) => <option key={tech.user_id} value={tech.user_id}>{tech.name}</option>)}
        </select>
      </label>
      {team.isError && <p role="alert" className="mt-2 text-sm">Could not load technicians.</p>}
      {save.isPending && <p role="status" className="mt-2 text-sm">Saving assignment…</p>}
      {save.error && <p role="alert" className="mt-2 text-sm text-destructive">{save.error.message}</p>}
      {save.isSuccess && <p role="status" className="mt-2 text-sm">
        Default technician saved. {save.data > 0 && `${save.data} upcoming ${save.data === 1 ? "visit" : "visits"} assigned.`}
      </p>}
    </section>
  );
}
