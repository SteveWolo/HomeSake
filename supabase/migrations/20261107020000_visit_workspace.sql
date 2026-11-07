alter table public.appointments add column published_report jsonb;

create table public.visit_report_drafts (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  report jsonb not null,
  staff_notes text not null default '' check (char_length(staff_notes) <= 4000),
  revision uuid not null default gen_random_uuid()
);
alter table public.visit_report_drafts enable row level security;
grant select, insert, update on public.visit_report_drafts to authenticated;
create policy "Admins manage visit report drafts" on public.visit_report_drafts
  for all to authenticated using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create function public.save_visit_workspace(
  visit_id uuid, expected_revision uuid, public_report jsonb, private_notes text, publish boolean
)
returns uuid language plpgsql set search_path = public as $$
declare new_revision uuid := gen_random_uuid();
begin
  if not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    raise exception 'Only Homesake staff can edit visit reports.';
  end if;
  perform 1 from public.appointments where id = visit_id and status <> 'Cancelled' for update;
  if not found then raise exception 'This visit is no longer available.'; end if;

  if expected_revision is null then
    insert into public.visit_report_drafts(appointment_id, report, staff_notes, revision)
      values(visit_id, public_report, private_notes, new_revision)
      on conflict (appointment_id) do nothing;
  else
    update public.visit_report_drafts
      set report=public_report, staff_notes=private_notes, revision=new_revision
      where appointment_id=visit_id and revision=expected_revision;
  end if;
  if not found then raise exception 'Another person changed this report. Reload the visit before saving.'; end if;

  if publish then
    update public.appointments set published_report =
      jsonb_build_object(
        'summary', public_report->'summary',
        'photos', public_report->'photos',
        'checks', coalesce((select jsonb_agg(item) from jsonb_array_elements(public_report->'checks') as item
          where item->>'status' in ('Completed', 'Needs attention', 'Not applicable')), '[]'::jsonb),
        'publishedAt', now()
      ) where id=visit_id;
  end if;
  return new_revision;
end;
$$;
revoke execute on function public.save_visit_workspace(uuid,uuid,jsonb,text,boolean) from public;
grant execute on function public.save_visit_workspace(uuid,uuid,jsonb,text,boolean) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-report-photos', 'visit-report-photos', false, 204800, array['image/webp']);

create policy "Admins upload visit report photos" on storage.objects
  for insert to authenticated with check (
    bucket_id='visit-report-photos' and public.has_role(auth.uid(), 'admin')
  );
create policy "Read authorized visit report photos" on storage.objects
  for select to authenticated using (
    bucket_id='visit-report-photos' and (
      public.has_role(auth.uid(), 'admin') or exists (
        select 1 from public.appointments a
        join public.properties p on p.id=a.property_id
        where p.owner_id=auth.uid() and a.id::text=(storage.foldername(name))[1]
          and (a.published_report->'photos') ? name
      )
    )
  );
