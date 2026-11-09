alter table public.properties
  add column default_technician_id uuid references public.technicians(user_id) on delete set null;
create index properties_default_technician_idx on public.properties(default_technician_id)
  where default_technician_id is not null;

create function homesake_private.protect_default_technician()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (case when tg_op = 'INSERT' then new.default_technician_id is not null
      else new.default_technician_id is distinct from old.default_technician_id end)
     and current_user not in ('postgres', 'service_role')
     and not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    raise exception 'Only an admin can change a default technician.';
  end if;
  return new;
end;
$$;
create trigger protect_default_technician before insert or update of default_technician_id on public.properties
for each row execute function homesake_private.protect_default_technician();

create function homesake_private.assign_default_technician()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.technician_id is null then
    select default_technician_id into new.technician_id from public.properties
      where id = new.property_id for no key update;
  end if;
  return new;
end;
$$;
create trigger assign_default_technician before insert on public.appointments
for each row execute function homesake_private.assign_default_technician();

create function public.set_property_technician(property_key uuid, technician_key uuid)
returns integer language plpgsql set search_path = '' as $$
declare assigned integer := 0;
begin
  if not coalesce(public.has_role(auth.uid(), 'admin'), false) then
    raise exception 'Only an admin can assign a technician.';
  end if;
  update public.properties set default_technician_id = technician_key where id = property_key;
  if not found then raise exception 'Property not found.'; end if;
  if technician_key is not null then
    update public.appointments set technician_id = technician_key
      where property_id = property_key and technician_id is null
        and status in ('Scheduled', 'Rescheduled') and scheduled_at >= now();
    get diagnostics assigned = row_count;
  end if;
  return assigned;
end;
$$;
revoke execute on function homesake_private.protect_default_technician(), homesake_private.assign_default_technician(),
  public.set_property_technician(uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_property_technician(uuid, uuid) to authenticated;
