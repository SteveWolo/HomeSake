create or replace function homesake_private.technician_jobs()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id, 'property_id', a.property_id, 'address', p.address, 'client_name', owner.full_name,
    'scheduled_at', a.scheduled_at, 'service', a.service, 'status', a.status, 'notes', a.notes,
    'published_report', a.published_report, 'visit_report', a.visit_report,
    'draft', case when d.appointment_id is null then null else
      jsonb_build_object('report', d.report, 'revision', d.revision, 'submittedAt', d.technician_submitted_at) end
  ) order by a.scheduled_at), '[]'::jsonb)
  from public.appointments a join public.properties p on p.id = a.property_id
  left join public.profiles owner on owner.id = p.owner_id
  left join public.visit_report_drafts d on d.appointment_id = a.id
  where a.technician_id = (select auth.uid()) and a.status in ('Scheduled', 'Rescheduled');
$$;
