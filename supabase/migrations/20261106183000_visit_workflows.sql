alter table public.appointments
  add column visit_report text,
  add column confirmation_sent_at timestamptz,
  add column day_before_sent_at timestamptz,
  add column notification_version uuid not null default gen_random_uuid();

-- Existing bookings did not opt in to a new booking confirmation.
update public.appointments set confirmation_sent_at = now();

create function public.protect_visit_updates()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.role() = 'authenticated' and not public.has_role(auth.uid(), 'admin') then
    if (to_jsonb(new) - array['scheduled_at', 'status', 'updated_at'])
       is distinct from (to_jsonb(old) - array['scheduled_at', 'status', 'updated_at'])
       or old.status not in ('Scheduled', 'Rescheduled')
       or old.scheduled_at <= now()
       or new.status <> 'Rescheduled' or new.scheduled_at <= now() then
      raise exception 'Only a future visit can be rescheduled';
    end if;
  end if;
  if new.scheduled_at is distinct from old.scheduled_at then
    new.confirmation_sent_at := null;
    new.day_before_sent_at := null;
    new.notification_version := gen_random_uuid();
  end if;
  return new;
end;
$$;

create trigger protect_visit_updates before update on public.appointments
for each row execute function public.protect_visit_updates();

alter table public.open_items add column recommended_action text,
  add unique (id, property_id);
alter table public.property_photos add column issue_id uuid,
  add constraint property_photos_issue_fkey foreign key (issue_id, property_id)
  references public.open_items (id, property_id) on delete set null (issue_id);

alter table public.appointments add unique (id, property_id);
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  appointment_id uuid,
  kind text not null check (kind in ('Add service', 'Cancel service', 'Cancel visit', 'Next visit request')),
  details text not null check (char_length(btrim(details)) between 1 and 1000),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Declined')),
  created_at timestamptz not null default now(),
  foreign key (appointment_id, property_id)
    references public.appointments (id, property_id) on delete set null (appointment_id)
);
create index service_requests_property_idx on public.service_requests (property_id, created_at desc);
grant select, insert, update on public.service_requests to authenticated;
grant all on public.service_requests to service_role;
alter table public.service_requests enable row level security;
create policy "Owners read service requests" on public.service_requests
  for select to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );
create policy "Owners submit pending service requests" on public.service_requests
  for insert to authenticated with check (
    status = 'Pending'
    and exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
    and (appointment_id is null or exists (
      select 1 from public.appointments a where a.id = appointment_id
        and a.scheduled_at > now() and a.status in ('Scheduled', 'Rescheduled')
    ))
    and (kind <> 'Cancel visit' or appointment_id is not null)
  );
create policy "Admins read service requests" on public.service_requests
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins review service requests" on public.service_requests
  for update to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create unique index one_pending_visit_cancellation
  on public.service_requests (appointment_id) where kind = 'Cancel visit' and status = 'Pending';

create function public.review_service_request(request_id uuid, decision text)
returns void language plpgsql set search_path = public as $$
declare request_row public.service_requests;
begin
  if not public.has_role(auth.uid(), 'admin') or decision not in ('Approved', 'Declined') then
    raise exception 'Invalid request review';
  end if;
  select * into request_row from public.service_requests
    where id = request_id and status = 'Pending' for update;
  if not found then raise exception 'This request has already been reviewed'; end if;

  if decision = 'Approved' and request_row.kind = 'Cancel visit' then
    update public.appointments set status = 'Cancelled'
      where id = request_row.appointment_id and property_id = request_row.property_id
        and status in ('Scheduled', 'Rescheduled') and scheduled_at > now();
    if not found then raise exception 'This visit is no longer available to cancel'; end if;
  end if;

  update public.service_requests set status = decision where id = request_id;
end;
$$;
revoke execute on function public.review_service_request(uuid, text) from public;
grant execute on function public.review_service_request(uuid, text) to authenticated;

create function public.complete_homesake_visit(visit_id uuid)
returns void language plpgsql set search_path = public as $$
declare completed_visit public.appointments;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Forbidden'; end if;
  update public.appointments set status = 'Completed'
    where id = visit_id and status in ('Scheduled', 'Rescheduled')
    returning * into completed_visit;
  if not found then raise exception 'This visit is no longer scheduled'; end if;

  insert into public.activity_items (property_id, title)
    values (completed_visit.property_id, completed_visit.service || ' completed');
  perform public.increment_tasks_completed(completed_visit.property_id);
end;
$$;
revoke execute on function public.complete_homesake_visit(uuid) from public;
grant execute on function public.complete_homesake_visit(uuid) to authenticated;
