begin;
create table public.activity_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('theatre','movie','fanmeeting','concert','other')),
  date date not null,
  time time without time zone,
  title text not null check(length(title) between 1 and 200),
  venue text not null check(length(venue) between 1 and 500),
  city text not null default '',
  memo text not null default '',
  source_plan_id uuid references public.personal_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,source_plan_id)
);
create index activity_records_user_date on public.activity_records(user_id,date desc);
create index activity_records_source_plan on public.activity_records(source_plan_id);
alter table public.activity_records enable row level security;
revoke all on public.activity_records from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.activity_records to service_role;
commit;
