alter table public.open_items
  add column progress_status text not null default 'Needs attention'
    check (progress_status in ('Needs attention', 'Awaiting your decision', 'Follow-up scheduled', 'Resolved')),
  add column progress_note text check (char_length(progress_note) <= 2000);

update public.open_items set progress_status = 'Resolved' where resolved;

create table public.issue_updates (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.open_items(id) on delete cascade,
  status text not null check (status in ('Needs attention', 'Awaiting your decision', 'Follow-up scheduled', 'Resolved')),
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index issue_updates_issue_idx on public.issue_updates (issue_id, created_at desc);
alter table public.issue_updates enable row level security;
revoke all on public.issue_updates from public, anon, authenticated;
grant select, insert on public.issue_updates to authenticated;
grant all on public.issue_updates to service_role;

create policy "Owners and staff read issue progress" on public.issue_updates
  for select to authenticated using (
    (select public.has_role(auth.uid(), 'admin')) or exists (
      select 1 from public.open_items i join public.properties p on p.id = i.property_id
      where i.id = issue_id and p.owner_id = (select auth.uid())
    )
  );
create policy "Staff record issue progress" on public.issue_updates
  for insert to authenticated with check ((select public.has_role(auth.uid(), 'admin')));

create function public.sync_issue_progress()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.progress_status is distinct from old.progress_status then
      new.resolved := new.progress_status = 'Resolved';
    elsif new.resolved is distinct from old.resolved then
      new.progress_status := case when new.resolved then 'Resolved' else 'Needs attention' end;
      new.progress_note := null;
    end if;
  elsif new.resolved then
    new.progress_status := 'Resolved';
  else
    new.resolved := new.progress_status = 'Resolved';
  end if;
  return new;
end;
$$;
create trigger issue_progress_sync before insert or update on public.open_items
  for each row execute function public.sync_issue_progress();

create function public.record_issue_progress()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.progress_status is not distinct from old.progress_status
      and new.progress_note is not distinct from old.progress_note then return new; end if;
  end if;
  insert into public.issue_updates(issue_id, status, note)
    values (new.id, new.progress_status, new.progress_note);
  return new;
end;
$$;
create trigger issue_progress_record after insert or update on public.open_items
  for each row execute function public.record_issue_progress();

revoke execute on function public.sync_issue_progress(), public.record_issue_progress() from public, anon, authenticated;
