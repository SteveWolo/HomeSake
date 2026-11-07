create table public.visit_paid_extras (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  scope text not null check (char_length(btrim(scope)) between 1 and 1000),
  amount_cents integer not null check (amount_cents between 50 and 99999999),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Declined', 'Withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  -- Keep the issuance marker if an invoice is deleted so the same approval cannot be billed again.
  invoice_id uuid unique
);

create index visit_paid_extras_appointment_idx on public.visit_paid_extras (appointment_id);
alter table public.visit_paid_extras enable row level security;
revoke all on public.visit_paid_extras from public, anon, authenticated;
grant select, insert (id, appointment_id, scope, amount_cents), update (invoice_id)
  on public.visit_paid_extras to authenticated;

create policy "Staff and property owners can read quotes" on public.visit_paid_extras
  for select to authenticated using (
    (select public.has_role(auth.uid(), 'admin')) or exists (
      select 1 from public.appointments a join public.properties p on p.id = a.property_id
      where a.id = appointment_id and p.owner_id = (select auth.uid())
    )
  );

create policy "Staff can send quotes for scheduled visits" on public.visit_paid_extras
  for insert to authenticated with check (
    (select public.has_role(auth.uid(), 'admin')) and exists (
      select 1 from public.appointments a
      where a.id = appointment_id and a.status in ('Scheduled', 'Rescheduled')
    )
  );

create policy "Staff can record the linked invoice" on public.visit_paid_extras
  for update to authenticated
  using ((select public.has_role(auth.uid(), 'admin')))
  with check ((select public.has_role(auth.uid(), 'admin')));

create schema if not exists homesake_private;
revoke all on schema homesake_private from public, anon;
grant usage on schema homesake_private to authenticated;

create function homesake_private.respond_to_paid_extra(quote_id uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  quote public.visit_paid_extras%rowtype;
  visit_status text;
  owner_id uuid;
begin
  if auth.uid() is null or decision is null or decision not in ('Approved', 'Declined', 'Withdrawn') then
    raise exception 'Invalid quote response.';
  end if;

  select * into quote from public.visit_paid_extras where id = quote_id;
  if not found then raise exception 'This quote is unavailable.'; end if;

  select a.status, p.owner_id into visit_status, owner_id
    from public.appointments a join public.properties p on p.id = a.property_id
    where a.id = quote.appointment_id for share of a, p;

  if not found or (decision = 'Withdrawn' and not coalesce(public.has_role(auth.uid(), 'admin'), false))
    or (decision <> 'Withdrawn' and owner_id is distinct from auth.uid()) then
    raise exception 'This quote is unavailable.';
  end if;

  select * into quote from public.visit_paid_extras where id = quote_id for update;
  if not found then raise exception 'This quote is unavailable.'; end if;
  if quote.status = decision then return; end if;
  if quote.status <> 'Pending' then raise exception 'This quote has already been answered or withdrawn.'; end if;
  if decision <> 'Withdrawn' and visit_status not in ('Scheduled', 'Rescheduled') then
    raise exception 'This visit is no longer open for approval.';
  end if;

  update public.visit_paid_extras set status = decision, responded_at = now() where id = quote_id;
end;
$$;

create function public.respond_to_paid_extra(quote_id uuid, decision text)
returns void language sql set search_path = '' as $$
  select homesake_private.respond_to_paid_extra(quote_id, decision);
$$;

create function public.invoice_paid_extra(quote_id uuid)
returns uuid language plpgsql set search_path = '' as $$
declare
  quote public.visit_paid_extras%rowtype;
  visit_status text;
  property_id_value uuid;
  owner_id_value uuid;
  new_invoice_id uuid;
begin
  if not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    raise exception 'Only staff can issue an invoice.';
  end if;

  select * into quote from public.visit_paid_extras where id = quote_id;
  if not found or quote.status <> 'Approved' then raise exception 'This quote has not been approved.'; end if;

  select a.status, a.property_id, p.owner_id into visit_status, property_id_value, owner_id_value
    from public.appointments a join public.properties p on p.id = a.property_id
    where a.id = quote.appointment_id for share of a, p;
  if not found or visit_status <> 'Completed' then raise exception 'Complete the visit before invoicing this work.'; end if;

  select * into quote from public.visit_paid_extras where id = quote_id for update;
  if not found or quote.status <> 'Approved' then raise exception 'This quote has not been approved.'; end if;
  if quote.invoice_id is not null then return quote.invoice_id; end if;

  insert into public.invoices (owner_id, property_id, amount_cents, description, status, kind)
    values (owner_id_value, property_id_value, quote.amount_cents, quote.scope, 'Due', 'Custom')
    returning id into new_invoice_id;
  update public.visit_paid_extras set invoice_id = new_invoice_id where id = quote_id;
  return new_invoice_id;
end;
$$;

revoke execute on function homesake_private.respond_to_paid_extra(uuid, text),
  public.respond_to_paid_extra(uuid, text), public.invoice_paid_extra(uuid) from public, anon;
grant execute on function homesake_private.respond_to_paid_extra(uuid, text),
  public.respond_to_paid_extra(uuid, text), public.invoice_paid_extra(uuid) to authenticated;
