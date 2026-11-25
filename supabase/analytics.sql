-- Xpressions'27: Step 5 analytics (run AFTER schema.sql and campaign.sql). Safe to re-run.
-- Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this -> Run.
--
-- Adds: device category, engagement time, registration starts, schedule downloads and
-- content interactions to the anonymous traffic events; a manual Search Console table; and
-- get_analytics_report(), which computes the Step 5 metrics, the funnel and the
-- before/after comparison for site improvements. No personal data is stored.

alter table public.traffic_events add column if not exists device text;
alter table public.traffic_events drop constraint if exists traffic_events_kind_check;
alter table public.traffic_events add constraint traffic_events_kind_check
  check (kind in ('visit', 'section', 'cta_click', 'intent', 'explorer', 'outbound', 'engage', 'download', 'reg_start', 'content'));

drop function if exists public.log_event(uuid, uuid, text, text, text, text, text, text, text);
create or replace function public.log_event(
  p_visitor uuid, p_session uuid, p_kind text,
  p_source text default null, p_medium text default null, p_campaign text default null, p_content text default null,
  p_variant text default null, p_detail text default null, p_device text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('visit', 'section', 'cta_click', 'intent', 'explorer', 'outbound', 'engage', 'download', 'reg_start', 'content') then
    raise exception 'Unknown event kind' using errcode = '22023';
  end if;
  if (select count(*) from traffic_events where session_id = p_session) >= 150 then
    return;
  end if;
  insert into traffic_events (visitor_id, session_id, kind, source, medium, campaign, content, variant, detail, device)
  values (p_visitor, p_session, p_kind,
    coalesce(nullif(left(lower(trim(p_source)), 60), ''), '(direct)'),
    coalesce(nullif(left(lower(trim(p_medium)), 60), ''), '(none)'),
    coalesce(nullif(left(lower(trim(p_campaign)), 80), ''), '(none)'),
    coalesce(nullif(left(lower(trim(p_content)), 80), ''), '(none)'),
    nullif(left(lower(trim(p_variant)), 8), ''),
    nullif(left(trim(p_detail), 120), ''),
    case when lower(p_device) in ('mobile', 'tablet', 'desktop') then lower(p_device) end);
end;
$$;
revoke all on function public.log_event(uuid, uuid, text, text, text, text, text, text, text, text) from public;
grant execute on function public.log_event(uuid, uuid, text, text, text, text, text, text, text, text) to anon, authenticated;

-- Search Console figures, copied in by the team (Google does not allow reading them anonymously).
create table if not exists public.search_stats (
  id           bigint generated always as identity primary key,
  period_start date not null,
  period_end   date not null,
  impressions  int  not null check (impressions >= 0),
  clicks       int  not null check (clicks >= 0),
  avg_position numeric(6, 2),
  top_query    text,
  created_at   timestamptz not null default now()
);
alter table public.search_stats enable row level security;
revoke all on public.search_stats from anon, authenticated;

create or replace function public.add_search_stats(p_passcode text, p_start date, p_end date, p_impressions int, p_clicks int, p_position numeric default null, p_query text default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_id bigint;
begin
  if encode(extensions.digest(coalesce(p_passcode, ''), 'sha256'), 'hex') <> (select hash from app_secrets where name = 'campaign_log') then
    raise exception 'Wrong passcode' using errcode = '28000';
  end if;
  if p_start is null or p_end is null or p_end < p_start or p_impressions < 0 or p_clicks < 0 or p_clicks > p_impressions then
    raise exception 'Check the dates and numbers' using errcode = '22023';
  end if;
  insert into search_stats (period_start, period_end, impressions, clicks, avg_position, top_query)
  values (p_start, p_end, p_impressions, p_clicks, p_position, nullif(left(trim(p_query), 120), ''))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.get_search_stats()
returns setof search_stats
language sql stable security definer set search_path = public
as $$ select * from search_stats order by period_start, id; $$;

-- The Step 5 report. p_change splits sessions into before/after a site improvement.
create or replace function public.get_analytics_report(p_change timestamptz default null)
returns json
language sql
stable
security definer
set search_path = public
as $$
  with ev as (select * from traffic_events),
  s as (
    select session_id,
      (array_agg(visitor_id order by created_at))[1] as visitor_id,
      (array_agg(source order by created_at))[1] as source,
      (array_agg(medium order by created_at))[1] as medium,
      coalesce((array_agg(device order by created_at) filter (where device is not null))[1], 'unknown') as device,
      (array_agg(variant order by created_at) filter (where variant is not null))[1] as variant,
      min(created_at) as started,
      least(1800, coalesce(sum(case when kind = 'engage' and detail ~ '^[0-9]{1,5}$' then detail::int end), 0)) as engage_s,
      count(*) filter (where kind = 'section') as views,
      count(*) filter (where kind = 'cta_click') as cta_clicks,
      count(*) filter (where kind = 'intent') as intents,
      bool_or(kind = 'visit') as has_visit,
      bool_or(kind = 'cta_click') as cta,
      bool_or(kind = 'reg_start') as reg_start,
      bool_or(kind = 'intent') as converted,
      bool_or(kind = 'download') as downloaded,
      bool_or(kind = 'section' and detail in ('register', 'competitions')) as reached_events,
      (array_agg(detail order by created_at desc) filter (where kind = 'section'))[1] as last_section
    from ev group by session_id
  ),
  ss as (
    select *, (engage_s >= 10 or views >= 2 or converted or downloaded) as engaged
    from s where has_visit
  ),
  agg as (
    select
      count(distinct visitor_id) as users,
      count(*) as sessions,
      count(*) filter (where engaged) as engaged_sessions,
      coalesce(sum(engage_s), 0) as engage_total,
      coalesce(sum(views), 0) as views,
      coalesce(sum(cta_clicks), 0) as cta_clicks,
      count(*) filter (where cta) as cta_sessions,
      count(*) filter (where reg_start) as reg_start_sessions,
      count(*) filter (where converted) as converted_sessions,
      coalesce(sum(intents), 0) as completions,
      count(*) filter (where downloaded) as download_sessions,
      count(*) filter (where engage_s > 0) as sessions_with_time
    from ss
  )
  select json_build_object(
    'generated_at', now(),
    'first_event', (select min(created_at) from ev),
    'totals', (select row_to_json(agg) from agg),
    'by_channel', (select coalesce(json_agg(r order by r.sessions desc), '[]'::json) from (
        select source, medium, count(distinct visitor_id) as users, count(*) as sessions,
          count(*) filter (where engaged) as engaged_sessions, sum(engage_s) as engage_total,
          count(*) filter (where engage_s > 0) as sessions_with_time,
          count(*) filter (where cta) as cta_sessions, count(*) filter (where reg_start) as reg_start_sessions,
          count(*) filter (where converted) as converted_sessions
        from ss group by source, medium) r),
    'by_device', (select coalesce(json_agg(r order by r.sessions desc), '[]'::json) from (
        select device, count(distinct visitor_id) as users, count(*) as sessions,
          count(*) filter (where engaged) as engaged_sessions, sum(engage_s) as engage_total,
          count(*) filter (where engage_s > 0) as sessions_with_time, sum(views) as views,
          count(*) filter (where cta) as cta_sessions, count(*) filter (where converted) as converted_sessions
        from ss group by device) r),
    'pages', (select coalesce(json_agg(r order by r.views desc), '[]'::json) from (
        select detail as page, count(*) as views, count(distinct session_id) as sessions
        from ev where kind = 'section' group by detail) r),
    'content', (select coalesce(json_agg(r order by r.interactions desc), '[]'::json) from (
        select detail as item, count(*) as interactions, count(distinct session_id) as sessions
        from ev where kind in ('content', 'explorer', 'outbound', 'download') group by detail order by 2 desc limit 25) r),
    'funnel', (select json_build_object(
        'landed', count(*),
        'engaged', count(*) filter (where engaged),
        'reached_events', count(*) filter (where reached_events or reg_start or converted),
        'reg_start', count(*) filter (where reg_start or converted),
        'converted', count(*) filter (where converted)) from ss),
    'exits', (select coalesce(json_agg(r order by r.sessions desc), '[]'::json) from (
        select coalesce(last_section, 'home') as page, count(*) as sessions,
          count(*) filter (where reached_events or reg_start) as after_seeing_events
        from ss where not converted group by 1) r),
    'experiment', (select coalesce(json_agg(r order by r.variant), '[]'::json) from (
        select variant, count(*) as sessions, count(distinct visitor_id) as users,
          count(*) filter (where cta) as cta_sessions, count(*) filter (where converted) as converted_sessions
        from ss where variant in ('a', 'b') group by variant) r),
    'by_day', (select coalesce(json_agg(r order by r.day), '[]'::json) from (
        select (started at time zone 'Asia/Kolkata')::date as day, count(*) as sessions,
          count(distinct visitor_id) as users, count(*) filter (where converted) as converted_sessions
        from ss group by 1) r),
    'change', case when p_change is null then null else (select json_agg(r order by r.period) from (
        select case when started < p_change then 'before' else 'after' end as period,
          count(*) as sessions, count(distinct visitor_id) as users,
          count(*) filter (where engaged) as engaged_sessions, sum(engage_s) as engage_total,
          count(*) filter (where engage_s > 0) as sessions_with_time,
          count(*) filter (where reached_events or reg_start or converted) as reached_events,
          count(*) filter (where reg_start or converted) as reg_start_sessions,
          count(*) filter (where cta) as cta_sessions,
          count(*) filter (where converted) as converted_sessions,
          count(*) filter (where downloaded) as download_sessions
        from ss group by 1) r) end
  );
$$;

revoke all on function public.add_search_stats(text, date, date, int, int, numeric, text) from public;
revoke all on function public.get_search_stats() from public;
revoke all on function public.get_analytics_report(timestamptz) from public;
grant execute on function public.add_search_stats(text, date, date, int, int, numeric, text) to anon, authenticated;
grant execute on function public.get_search_stats() to anon, authenticated;
grant execute on function public.get_analytics_report(timestamptz) to anon, authenticated;
