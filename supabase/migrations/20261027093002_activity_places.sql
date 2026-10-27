begin;
create table public.activity_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_key text not null check(length(venue_key) between 1 and 1405),
  latitude double precision not null check(latitude between 20 and 46),
  longitude double precision not null check(longitude between 122 and 154),
  updated_at timestamptz not null default now(),
  primary key(user_id,venue_key)
);
alter table public.activity_places enable row level security;
revoke all on public.activity_places from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.activity_places to service_role;
commit;
