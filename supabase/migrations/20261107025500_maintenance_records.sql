create table public.maintenance_records (
  property_id uuid not null references public.properties(id) on delete cascade,
  category text not null check (category in ('hvac', 'smoke', 'sump', 'softener')),
  location text not null default '' check (char_length(location) <= 250),
  specifications text not null default '' check (char_length(specifications) <= 500),
  notes text not null default '' check (char_length(notes) <= 2000),
  primary key (property_id, category)
);
alter table public.maintenance_records enable row level security;
revoke all on public.maintenance_records from public, anon, authenticated;
grant select, insert, update on public.maintenance_records to authenticated;
create policy "Owners and staff read maintenance records" on public.maintenance_records
  for select to authenticated using (
    (select public.has_role(auth.uid(), 'admin')) or exists (
      select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid())
    )
  );
create policy "Staff manage maintenance records" on public.maintenance_records
  for all to authenticated using ((select public.has_role(auth.uid(), 'admin')))
  with check ((select public.has_role(auth.uid(), 'admin')));
