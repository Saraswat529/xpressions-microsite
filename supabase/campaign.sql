-- Xpressions'27: traffic-generation campaign tracking (run AFTER schema.sql)
-- Supabase Dashboard -> SQL Editor -> New query -> paste ALL of this -> Run. Safe to re-run.
--
-- BEFORE RUNNING: change the team passcode on the line marked >>> below. It protects the
-- dated campaign log from edits by the public. Share it only with your group.
--
-- What it stores (anonymous only; no names, emails, IP addresses or device fingerprints):
--   traffic_events : visits, section views, CTA clicks, intents, Explorer finds, outbound clicks,
--                    each tagged with the campaign source (UTM/QR) and the A/B headline variant.
--   campaign_log   : the dated log of campaign actions, written by the team with the passcode.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.traffic_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  uuid not null,
  session_id  uuid not null,
  kind        text not null check (kind in ('visit', 'section', 'cta_click', 'intent', 'explorer', 'outbound')),
  source      text not null default '(direct)',
  medium      text not null default '(none)',
  campaign    text not null default '(none)',
  content     text not null default '(none)',
  variant     text,
  detail      text
);
create index if not exists traffic_events_kind_idx on public.traffic_events (kind, created_at);
create index if not exists traffic_events_session_idx on public.traffic_events (session_id);

create table if not exists public.campaign_log (
  id          bigint generated always as identity primary key,
  entry_date  date not null,
  channel     text not null,
  action      text not null,
  link        text,
  author      text,
  created_at  timestamptz not null default now()
);

create table if not exists public.app_secrets (
  name text primary key,
  hash text not null
);

alter table public.traffic_events enable row level security;
alter table public.campaign_log   enable row level security;
alter table public.app_secrets    enable row level security;
revoke all on public.traffic_events, public.campaign_log, public.app_secrets from anon, authenticated;

-- >>> Team passcode for the campaign log. Replace CHANGE-THIS-PASSCODE before running. <<<
insert into public.app_secrets (name, hash)
values ('campaign_log', encode(extensions.digest('CHANGE-THIS-PASSCODE', 'sha256'), 'hex'))
on conflict (name) do update set hash = excluded.hash;

-- Record one anonymous event. Values are trimmed and capped; each session is limited to 80 events.
create or replace function public.log_event(
  p_visitor uuid, p_session uuid, p_kind text,
  p_source text default null, p_medium text default null, p_campaign text default null, p_content text default null,
  p_variant text default null, p_detail text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('visit', 'section', 'cta_click', 'intent', 'explorer', 'outbound') then
    raise exception 'Unknown event kind' using errcode = '22023';
  end if;
  if (select count(*) from traffic_events where session_id = p_session) >= 80 then
    return;
  end if;
  insert into traffic_events (visitor_id, session_id, kind, source, medium, campaign, content, variant, detail)
  values (p_visitor, p_session, p_kind,
    coalesce(nullif(left(lower(trim(p_source)), 60), ''), '(direct)'),
    coalesce(nullif(left(lower(trim(p_medium)), 60), ''), '(none)'),
    coalesce(nullif(left(lower(trim(p_campaign)), 80), ''), '(none)'),
    coalesce(nullif(left(lower(trim(p_content)), 80), ''), '(none)'),
    nullif(left(lower(trim(p_variant)), 8), ''),
    nullif(left(trim(p_detail), 120), ''));
end;
$$;

-- Aggregated report for the campaign page. No visitor ids leave the database.
create or replace function public.get_traffic_report()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with v as (select * from traffic_events)
  select json_build_object(
    'generated_at', now(),
    'totals', (select json_build_object(
        'visits',       count(*) filter (where kind = 'visit'),
        'visitors',     count(distinct visitor_id) filter (where kind = 'visit'),
        'sections',     count(*) filter (where kind = 'section'),
        'cta_clicks',   count(*) filter (where kind = 'cta_click'),
        'intents',      count(*) filter (where kind = 'intent'),
        'explorers',    count(*) filter (where kind = 'explorer'),
        'outbound',     count(*) filter (where kind = 'outbound'),
        'first_event',  min(created_at)) from v),
    'by_channel', (select coalesce(json_agg(r order by r.visits desc), '[]'::json) from (
        select source, medium,
          count(*) filter (where kind = 'visit') as visits,
          count(distinct visitor_id) filter (where kind = 'visit') as visitors,
          count(distinct visitor_id) filter (where kind = 'cta_click') as cta_visitors,
          count(distinct visitor_id) filter (where kind = 'intent') as intent_visitors,
          count(*) filter (where kind = 'intent') as intents,
          count(*) filter (where kind = 'section') as sections
        from v group by source, medium) r),
    'by_content', (select coalesce(json_agg(r order by r.visits desc), '[]'::json) from (
        select source, medium, campaign, content,
          count(*) filter (where kind = 'visit') as visits,
          count(distinct visitor_id) filter (where kind = 'intent') as intent_visitors
        from v where campaign <> '(none)' or content <> '(none)' group by source, medium, campaign, content) r),
    'experiment', (select coalesce(json_agg(r order by r.variant), '[]'::json) from (
        select variant,
          count(distinct visitor_id) filter (where kind = 'visit') as visitors,
          count(distinct visitor_id) filter (where kind = 'cta_click') as cta_visitors,
          count(distinct visitor_id) filter (where kind = 'intent') as intent_visitors
        from v where variant in ('a', 'b') group by variant) r),
    'by_day', (select coalesce(json_agg(r order by r.day), '[]'::json) from (
        select (created_at at time zone 'Asia/Kolkata')::date as day,
          count(*) filter (where kind = 'visit') as visits,
          count(*) filter (where kind = 'intent') as intents
        from v group by 1) r),
    'sections', (select coalesce(json_agg(r order by r.views desc), '[]'::json) from (
        select detail as section, count(*) as views from v where kind = 'section' group by detail) r)
  );
$$;

-- Dated campaign log: public read, passcode-protected write and delete.
create or replace function public.get_campaign_log()
returns setof campaign_log
language sql
stable
security definer
set search_path = public
as $$ select * from campaign_log order by entry_date, id; $$;

create or replace function public.add_campaign_log(p_passcode text, p_date date, p_channel text, p_action text, p_link text default null, p_author text default null)
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
  if p_date is null or length(trim(coalesce(p_channel, ''))) = 0 or length(trim(coalesce(p_action, ''))) = 0 then
    raise exception 'Date, channel and action are required' using errcode = '22023';
  end if;
  insert into campaign_log (entry_date, channel, action, link, author)
  values (p_date, left(trim(p_channel), 60), left(trim(p_action), 600), nullif(left(trim(p_link), 300), ''), nullif(left(trim(p_author), 60), ''))
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.delete_campaign_log(p_passcode text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if encode(extensions.digest(coalesce(p_passcode, ''), 'sha256'), 'hex') <> (select hash from app_secrets where name = 'campaign_log') then
    raise exception 'Wrong passcode' using errcode = '28000';
  end if;
  delete from campaign_log where id = p_id;
end;
$$;

-- Website milestones already completed (edit or delete these from the campaign page if needed).
insert into public.campaign_log (entry_date, channel, action, author)
select * from (values
  (date '2026-11-09', 'Website', 'Microsite published on GitHub Pages.', 'Web team'),
  (date '2026-11-14', 'Website', 'Interactive version launched: event cards, Register Your Intent tracker (Supabase), Explorer hunt.', 'Web team'),
  (date '2026-11-14', 'Website', 'Rebranded as Xpressions''27 with the official logo, favicon and share image.', 'Web team'),
  (date '2026-11-20', 'Website', 'Campaign tracking launched: UTM links, QR codes, A/B headline test, campaign dashboard.', 'Web team')
) as seed(entry_date, channel, action, author)
where not exists (select 1 from public.campaign_log);

revoke all on function public.log_event(uuid, uuid, text, text, text, text, text, text, text) from public;
revoke all on function public.get_traffic_report() from public;
revoke all on function public.get_campaign_log() from public;
revoke all on function public.add_campaign_log(text, date, text, text, text, text) from public;
revoke all on function public.delete_campaign_log(text, bigint) from public;
grant execute on function public.log_event(uuid, uuid, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_traffic_report() to anon, authenticated;
grant execute on function public.get_campaign_log() to anon, authenticated;
grant execute on function public.add_campaign_log(text, date, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_campaign_log(text, bigint) to anon, authenticated;
