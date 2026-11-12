-- Add the property setup details technicians need during an assigned visit.
alter table public.maintenance_records
  drop constraint if exists maintenance_records_category_check;
alter table public.maintenance_records
  add constraint maintenance_records_category_check
  check (category = any (array['hvac', 'smoke', 'sump', 'softener', 'water', 'electrical', 'home', 'emergency']::text[]));

-- Keep the technician API scoped to their assigned, active appointments while
-- returning only the client-visible setup information for that property.
create or replace function homesake_private.technician_jobs()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'property_id', a.property_id,
    'address', p.address,
    'home_notes', p.home_notes,
    'home_details', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category', r.category,
        'location', r.location,
        'specifications', r.specifications,
        'notes', r.notes
      ) order by r.category)
      from public.maintenance_records r
      where r.property_id = a.property_id
    ), '[]'::jsonb),
    'client_name', owner.full_name,
    'scheduled_at', a.scheduled_at,
    'service', a.service,
    'status', a.status,
    'notes', a.notes,
    'published_report', a.published_report,
    'visit_report', a.visit_report,
    'draft', case when d.appointment_id is null then null else
      jsonb_build_object('report', d.report, 'revision', d.revision, 'submittedAt', d.technician_submitted_at) end
  ) order by a.scheduled_at), '[]'::jsonb)
  from public.appointments a
  join public.properties p on p.id = a.property_id
  left join public.profiles owner on owner.id = p.owner_id
  left join public.visit_report_drafts d on d.appointment_id = a.id
  where a.technician_id = (select auth.uid())
    and a.status in ('Scheduled', 'Rescheduled');
$$;

create or replace function public.reassign_technician_date_range(
  from_technician uuid,
  to_technician uuid,
  start_day date,
  end_day date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare reassigned integer := 0;
begin
  if not coalesce(public.has_role((select auth.uid()), 'admin'), false) then
    raise exception 'Only an admin can reassign visits.';
  end if;
  if from_technician is null or to_technician is null or from_technician = to_technician then
    raise exception 'Choose two different technicians.';
  end if;
  if start_day is null or end_day is null or end_day < start_day then
    raise exception 'Choose a valid date range.';
  end if;
  if end_day - start_day > 90 then
    raise exception 'Choose a date range of 90 days or less.';
  end if;
  if not exists (select 1 from public.technicians where user_id = from_technician)
     or not exists (select 1 from public.technicians where user_id = to_technician) then
    raise exception 'One of the selected technicians is no longer active.';
  end if;

  update public.appointments as a
    set technician_id = to_technician
    where a.technician_id = from_technician
      and a.status in ('Scheduled', 'Rescheduled')
      and a.scheduled_at >= (start_day::timestamp at time zone 'America/Chicago')
      and a.scheduled_at < ((end_day + 1)::timestamp at time zone 'America/Chicago');
  get diagnostics reassigned = row_count;
  return reassigned;
end;
$$;

revoke execute on function public.reassign_technician_date_range(uuid, uuid, date, date) from public, anon;
grant execute on function public.reassign_technician_date_range(uuid, uuid, date, date) to authenticated;
