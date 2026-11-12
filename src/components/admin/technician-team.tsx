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
  const [fromTech, setFromTech] = useState("");
  const [toTech, setToTech] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
  const [startDay, setStartDay] = useState(today);
  const [endDay, setEndDay] = useState(today);
  const reassign = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reassign_technician_date_range", {
        from_technician: fromTech,
        to_technician: toTech,
        start_day: startDay,
        end_day: endDay,
      });
      if (error) throw new Error(error.message);
      return Number(data ?? 0);
    },
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["all-appointments"] }),
        cache.invalidateQueries({ queryKey: ["technician-jobs"] }),
      ]);
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
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="font-semibold">Cover a technician’s time off</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Move all scheduled visits from one technician to another for one day or a date range. Their regular assignments are not changed.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          if (!fromTech || !toTech || fromTech === toTech || !startDay || !endDay || startDay > endDay) return;
          const fromName = team.data?.find((item) => item.user_id === fromTech)?.name ?? "the selected technician";
          const toName = team.data?.find((item) => item.user_id === toTech)?.name ?? "the covering technician";
          if (!window.confirm(`Reassign ${fromName}’s scheduled visits from ${startDay} through ${endDay} to ${toName}?`)) return;
          reassign.mutate();
        }}>
          <label className="grid gap-1 text-sm">Technician who is out
            <select className={field} required value={fromTech} onChange={(event) => { reassign.reset(); setFromTech(event.target.value); }}>
              <option value="">Choose technician…</option>
              {team.data?.map((item) => <option key={item.user_id} value={item.user_id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Covering technician
            <select className={field} required value={toTech} onChange={(event) => { reassign.reset(); setToTech(event.target.value); }}>
              <option value="">Choose technician…</option>
              {team.data?.filter((item) => item.user_id !== fromTech).map((item) => <option key={item.user_id} value={item.user_id}>{item.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">From
              <input className={field} type="date" required value={startDay} max={endDay || undefined}
                onChange={(event) => { reassign.reset(); setStartDay(event.target.value); }} />
            </label>
            <label className="grid gap-1 text-sm">Through
              <input className={field} type="date" required value={endDay} min={startDay || undefined}
                onChange={(event) => { reassign.reset(); setEndDay(event.target.value); }} />
            </label>
          </div>
          <button className={`${button} sm:col-span-2 lg:col-span-1`}
            disabled={reassign.isPending || team.isPending || !team.data?.length || !fromTech || !toTech || fromTech === toTech || !startDay || !endDay || startDay > endDay}>
            {reassign.isPending ? "Reassigning…" : "Reassign visits"}
          </button>
        </form>
        {reassign.isSuccess && <p role="status" className="mt-3 text-sm">{reassign.data} scheduled {reassign.data === 1 ? "visit was" : "visits were"} reassigned.</p>}
        {reassign.error && <p role="alert" className="mt-3 text-sm text-destructive">{reassign.error.message}</p>}
      </div>
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
