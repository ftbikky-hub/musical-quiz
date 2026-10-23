begin;
create table public.personal_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique check (length(token_hash)=64),
  calendar_id text not null,
  mode text not null check(mode in ('keywords','all')),
  expires_at timestamptz not null,
  revoked boolean not null default false,
  last_synced_at timestamptz,
  last_run_started_at timestamptz,
  last_counts jsonb,
  created_at timestamptz not null default now()
);
alter table public.personal_calendar_connections enable row level security;
revoke all on public.personal_calendar_connections from public,anon,authenticated,service_role;
grant select,insert,update on public.personal_calendar_connections to service_role;

create table public.personal_calendar_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_uid text not null,
  calendar_id text not null,
  plan_id uuid not null references public.personal_plans(id) on delete cascade,
  last_source jsonb not null,
  cancelled_at timestamptz,
  previous_status text,
  primary key(user_id,source_uid)
);
create index personal_calendar_items_plan on public.personal_calendar_items(plan_id);
alter table public.personal_calendar_items enable row level security;
revoke all on public.personal_calendar_items from public,anon,authenticated,service_role;
grant select,insert,update on public.personal_calendar_items to service_role;

-- 呼出者はservice_roleのみ。接続をロックし、スナップショット全体を一つの取引で反映。
create function public.sync_personal_calendar(
  p_token_hash text, p_calendar_id text, p_from date, p_through date,
  p_started_at timestamptz, p_events jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  c public.personal_calendar_connections%rowtype;
  p public.personal_plans%rowtype;
  i public.personal_calendar_items%rowtype;
  e jsonb; old_values jsonb; source_values jsonb; uid text;
  stamp timestamptz := now();
  added int := 0; changed int := 0; removed int := 0;
  total int; missing int;
begin
  select * into c from public.personal_calendar_connections
    where token_hash=p_token_hash for update;
  if not found or c.revoked or c.expires_at <= stamp or c.calendar_id<>p_calendar_id then
    raise exception 'invalid_connection' using errcode='28000';
  end if;
  if p_from is null or p_through is null or p_through<p_from or p_through-p_from>740
    or p_from < (stamp at time zone 'Asia/Tokyo')::date-2
    or p_from > (stamp at time zone 'Asia/Tokyo')::date+1
    or p_started_at is null or p_started_at<stamp-interval '15 minutes' or p_started_at>stamp+interval '2 minutes'
    or jsonb_typeof(p_events)<>'array' or p_events is null or jsonb_array_length(p_events)>500 then
    raise exception 'invalid_snapshot';
  end if;
  if c.last_run_started_at is not null and p_started_at<=c.last_run_started_at then
    return jsonb_build_object('ignored',true);
  end if;
  total := jsonb_array_length(p_events);
  if (select count(distinct x->>'source_uid') from jsonb_array_elements(p_events) x)<>total then
    raise exception 'duplicate_source_uid';
  end if;
  select count(*) into missing from public.personal_calendar_items ci
    join public.personal_plans pp on pp.id=ci.plan_id and pp.user_id=c.user_id
    where ci.user_id=c.user_id and ci.calendar_id=c.calendar_id
      and (ci.last_source->>'date')::date between p_from and p_through
      and pp.status in ('planned','applied','confirmed')
      and not exists(select 1 from jsonb_array_elements(p_events) x where x->>'source_uid'=ci.source_uid);
  if missing>10 and missing>total/2 then raise exception 'too_many_removed'; end if;

  for e in select * from jsonb_array_elements(p_events) loop
    uid:=e->>'source_uid';
    if uid is null or length(uid)>500 or uid not like 'ical:%'
      or (e->>'date')::date not between p_from and p_through then raise exception 'invalid_event'; end if;
    source_values:=jsonb_build_object('title',e->'title','date',e->'date','time',e->'time',
      'end_date',e->'end_date','end_time',e->'end_time','venue',e->'venue');
    select * into p from public.personal_plans where user_id=c.user_id and source_uid=uid for update;
    if not found then
      insert into public.personal_plans(user_id,title,kind,status,date,time,end_date,end_time,venue,memo,url,source_uid)
        values(c.user_id,e->>'title',e->>'kind','planned',(e->>'date')::date,(e->>'time')::time,
          (e->>'end_date')::date,(e->>'end_time')::time,coalesce(e->>'venue',''),coalesce(e->>'memo',''),coalesce(e->>'url',''),uid)
        returning * into p;
      added:=added+1;
    else
      select * into i from public.personal_calendar_items where user_id=c.user_id and source_uid=uid;
      if found then
        old_values:=jsonb_build_object('title',p.title,'date',p.date::text,'time',to_char(p.time,'HH24:MI'),
          'end_date',p.end_date::text,'end_time',to_char(p.end_time,'HH24:MI'),'venue',p.venue,'status',p.status);
        update public.personal_plans pp set
          title=case when old_values->'title'=i.last_source->'title' then e->>'title' else pp.title end,
          date=case when old_values->'date'=i.last_source->'date' then (e->>'date')::date else pp.date end,
          time=case when old_values->'time'=i.last_source->'time' then (e->>'time')::time else pp.time end,
          end_date=case when old_values->'end_date'=i.last_source->'end_date' then (e->>'end_date')::date else pp.end_date end,
          end_time=case when old_values->'end_time'=i.last_source->'end_time' then (e->>'end_time')::time else pp.end_time end,
          venue=case when old_values->'venue'=i.last_source->'venue' then coalesce(e->>'venue','') else pp.venue end,
          status=case when i.cancelled_at is not null and pp.status='cancelled' and pp.updated_at=i.cancelled_at then i.previous_status else pp.status end,
          updated_at=stamp
          where pp.id=p.id and pp.user_id=c.user_id returning * into p;
        if old_values<>jsonb_build_object('title',p.title,'date',p.date::text,'time',to_char(p.time,'HH24:MI'),
          'end_date',p.end_date::text,'end_time',to_char(p.end_time,'HH24:MI'),'venue',p.venue,'status',p.status) then changed:=changed+1; end if;
      end if;
    end if;
    insert into public.personal_calendar_items(user_id,source_uid,calendar_id,plan_id,last_source)
      values(c.user_id,uid,c.calendar_id,p.id,source_values)
      on conflict(user_id,source_uid) do update set calendar_id=excluded.calendar_id,plan_id=excluded.plan_id,
        last_source=excluded.last_source,cancelled_at=null,previous_status=null;
  end loop;
  for i in select ci.* from public.personal_calendar_items ci
    join public.personal_plans pp on pp.id=ci.plan_id and pp.user_id=c.user_id
    where ci.user_id=c.user_id and ci.calendar_id=c.calendar_id
      and (ci.last_source->>'date')::date between p_from and p_through
      and pp.status in ('planned','applied','confirmed')
      and not exists(select 1 from jsonb_array_elements(p_events) x where x->>'source_uid'=ci.source_uid)
  loop
    select * into p from public.personal_plans where id=i.plan_id and user_id=c.user_id for update;
    update public.personal_calendar_items set previous_status=p.status,cancelled_at=stamp
      where user_id=c.user_id and source_uid=i.source_uid;
    update public.personal_plans set status='cancelled',updated_at=stamp where id=p.id and user_id=c.user_id;
    removed:=removed+1;
  end loop;
  update public.personal_calendar_connections set last_synced_at=stamp,last_run_started_at=p_started_at,
    last_counts=jsonb_build_object('added',added,'updated',changed,'cancelled',removed,'seen',total) where user_id=c.user_id;
  return jsonb_build_object('added',added,'updated',changed,'cancelled',removed,'seen',total);
end;
$$;
revoke all on function public.sync_personal_calendar(text,text,date,date,timestamptz,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.sync_personal_calendar(text,text,date,date,timestamptz,jsonb) to service_role;
commit;
