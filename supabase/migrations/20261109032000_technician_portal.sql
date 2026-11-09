create table public.technicians (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120)
);
alter table public.technicians enable row level security;
revoke all on public.technicians from public, anon, authenticated;
grant select on public.technicians to authenticated;
grant all on public.technicians to service_role;
create policy "Technicians read their own account" on public.technicians for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role(auth.uid(), 'admin')));

alter table public.appointments add column technician_id uuid references public.technicians(user_id) on delete set null;
create index appointments_technician_idx on public.appointments (technician_id, scheduled_at) where technician_id is not null;

alter table public.visit_report_drafts add column technician_submitted_at timestamptz;

create function homesake_private.technician_jobs()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'property_id', a.property_id, 'address', p.address,
    'scheduled_at', a.scheduled_at, 'service', a.service, 'status', a.status, 'notes', a.notes,
    'published_report', a.published_report, 'visit_report', a.visit_report,
    'draft', case when d.appointment_id is null then null else
      jsonb_build_object('report', d.report, 'revision', d.revision, 'submittedAt', d.technician_submitted_at) end
  ) order by a.scheduled_at), '[]'::jsonb)
  from public.appointments a join public.properties p on p.id = a.property_id
  left join public.visit_report_drafts d on d.appointment_id = a.id
  where a.technician_id = (select auth.uid()) and a.status in ('Scheduled', 'Rescheduled');
$$;

create function homesake_private.save_technician_draft(visit_id uuid, expected_revision uuid, report_data jsonb, submit_for_review boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_revision uuid := gen_random_uuid();
begin
  perform 1 from public.appointments
    where id = visit_id and technician_id = (select auth.uid()) and status in ('Scheduled', 'Rescheduled')
    for update;
  if not found then raise exception 'This visit is no longer assigned to you.'; end if;

  if jsonb_typeof(report_data) is distinct from 'object'
     or jsonb_typeof(report_data->'checks') is distinct from 'array'
     or jsonb_typeof(report_data->'photos') is distinct from 'array'
     or octet_length(report_data::text) > 600000 then
    raise exception 'Invalid visit report.';
  end if;

  if expected_revision is null then
    insert into public.visit_report_drafts (appointment_id, report, revision, technician_submitted_at)
      values (visit_id, report_data, new_revision, case when submit_for_review then now() end) on conflict (appointment_id) do nothing;
  else
    update public.visit_report_drafts set report = report_data, revision = new_revision,
      technician_submitted_at = case when submit_for_review then now() end
      where appointment_id = visit_id and revision = expected_revision;
  end if;
  if not found then raise exception 'This draft changed. Reopen the visit before saving.'; end if;
  return new_revision;
end;
$$;

create function homesake_private.technician_can_access_photo(visit_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.appointments
    where id::text = visit_folder and technician_id = (select auth.uid()) and status in ('Scheduled', 'Rescheduled'));
$$;

create function public.technician_jobs()
returns jsonb language sql set search_path = '' as $$ select homesake_private.technician_jobs(); $$;
create function public.save_technician_draft(visit_id uuid, expected_revision uuid, report_data jsonb, submit_for_review boolean)
returns uuid language sql set search_path = '' as $$
  select homesake_private.save_technician_draft(visit_id, expected_revision, report_data, submit_for_review);
$$;

revoke execute on function homesake_private.technician_jobs(), homesake_private.save_technician_draft(uuid, uuid, jsonb, boolean),
  homesake_private.technician_can_access_photo(text), public.technician_jobs(), public.save_technician_draft(uuid, uuid, jsonb, boolean)
  from public, anon;
grant execute on function homesake_private.technician_jobs(), homesake_private.save_technician_draft(uuid, uuid, jsonb, boolean),
  homesake_private.technician_can_access_photo(text), public.technician_jobs(), public.save_technician_draft(uuid, uuid, jsonb, boolean)
  to authenticated;

create policy "Technicians read assigned visit photos" on storage.objects for select to authenticated using (
  bucket_id = 'visit-report-photos' and homesake_private.technician_can_access_photo((storage.foldername(name))[1])
);
create policy "Technicians upload assigned visit photos" on storage.objects for insert to authenticated with check (
  bucket_id = 'visit-report-photos' and homesake_private.technician_can_access_photo((storage.foldername(name))[1])
);

-- Clients can reschedule their own appointments, but assignment belongs to admins.
create function homesake_private.protect_technician_assignment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.technician_id is distinct from old.technician_id
     and current_user not in ('postgres', 'service_role')
     and not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    raise exception 'Only an admin can change a technician assignment.';
  end if;
  return new;
end;
$$;
create trigger protect_technician_assignment before update of technician_id on public.appointments
for each row execute function homesake_private.protect_technician_assignment();
revoke execute on function homesake_private.protect_technician_assignment() from public, anon, authenticated;
