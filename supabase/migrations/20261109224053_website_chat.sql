create table public.website_chat_threads (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  visitor_key text not null check (visitor_key ~ '^[0-9a-f]{64}$'),
  name text check (char_length(name) between 1 and 120),
  email text check (char_length(email) between 1 and 254),
  phone text check (char_length(phone) between 1 and 40),
  messages jsonb not null check (jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) between 1 and 200),
  latest_message jsonb generated always as (messages -> -1) stored,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (name is null or email is not null or phone is not null)
);

create index website_chat_threads_latest_idx on public.website_chat_threads (updated_at desc, id);
create index website_chat_threads_rate_idx on public.website_chat_threads (visitor_key, created_at);

alter table public.website_chat_threads enable row level security;
revoke all on public.website_chat_threads from public, anon, authenticated, service_role;
grant select, insert, update on public.website_chat_threads to service_role;

-- Lock per visitor during creation so concurrent submissions share the same limit.
create function public.limit_website_chat_threads()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.visitor_key, 0));
  if (select count(*) from public.website_chat_threads
      where visitor_key = new.visitor_key and created_at >= now() - interval '1 hour') >= 5 then
    raise exception using errcode = 'PT429', message = 'Website chat limit reached';
  end if;
  return new;
end;
$$;

revoke all on function public.limit_website_chat_threads() from public, anon, authenticated;
grant execute on function public.limit_website_chat_threads() to service_role;
create trigger limit_website_chat_threads before insert on public.website_chat_threads
for each row execute function public.limit_website_chat_threads();
