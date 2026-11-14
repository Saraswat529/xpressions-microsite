-- Xpressions '26: "Register Your Intent" tracker
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (idempotent).
--
-- Design
--   * events   : the list of events visitors can show interest in (ids match data-event in index.html)
--   * intents  : one row per (event, visitor). The primary key makes duplicates impossible.
--   * Visitors never read or write the tables directly. Row Level Security is on with no
--     policies, so the public "anon" key can only call the functions below.
--   * Interest is NOT a registration. Confirmed registrations are not stored here.

create table if not exists public.events (
  id         text primary key,
  name       text not null,
  category   text not null check (category in ('nights', 'business', 'stage', 'social')),
  sort_order int  not null default 0
);

create table if not exists public.intents (
  event_id   text        not null references public.events(id) on delete cascade,
  visitor_id uuid        not null,
  created_at timestamptz not null default now(),
  primary key (event_id, visitor_id)
);
create index if not exists intents_visitor_idx on public.intents (visitor_id);

alter table public.events  enable row level security;
alter table public.intents enable row level security;
revoke all on public.events, public.intents from anon, authenticated;

insert into public.events (id, name, category, sort_order) values
  ('pro-show',          'Celebrity pro show',          'nights',   1),
  ('comedy-night',      'Comedy night',                'nights',   2),
  ('edm-night',         'EDM night',                   'nights',   3),
  ('prom-night',        'Prom: A Red Carpet Affair',   'nights',   4),
  ('mpower',            'MPower',                      'business', 10),
  ('maven',             'Maven',                       'business', 11),
  ('aarohan-nirnay',    'Aarohan and Nirnay',          'business', 12),
  ('case-connect',      'Case Connect',                'business', 13),
  ('trade-wars-finbid', 'Trade Wars and FinBid',       'business', 14),
  ('ad-valorem',        'Ad Valorem',                  'business', 15),
  ('pitch-it-abroad',   'Pitch It Abroad',             'business', 16),
  ('vriddhi',           'Vriddhi',                     'business', 17),
  ('ximun',             'XIM Model United Nations',    'business', 18),
  ('inquizzitive',      'Inquizzitive',                'business', 19),
  ('footloose-thirkan', 'Footloose and Thirkan',       'stage',    20),
  ('symphony-goonj',    'Symphony and Goonj',          'stage',    21),
  ('decibelz',          'Decibelz',                    'stage',    22),
  ('abhinay-aaghaz',    'Abhinay and Aaghaz',          'stage',    23),
  ('carnival-de-vogue', 'Carnival de Vogue',           'stage',    24),
  ('paint-ximb',        'Paint@XIMB',                  'stage',    25),
  ('lensation',         'Lensation',                   'stage',    26),
  ('final-cut',         'The Final Cut',               'stage',    27),
  ('flight-of-fancy',   'Flight of Fancy',             'stage',    28),
  ('x-athon',           'X-Athon',                     'social',   30),
  ('x-enable',          'X-Enable',                    'social',   31),
  ('foot-of-fury',      'Foot of Fury',                'social',   32),
  ('enigmax',           'EnigmaX',                     'social',   33),
  ('big-xpressions',    'Big Xpressions',              'social',   34),
  ('xigabyte',          'Xigabyte',                    'social',   35)
on conflict (id) do update set name = excluded.name, category = excluded.category, sort_order = excluded.sort_order;

-- Record or withdraw one visitor's interest in one event. Returns the event's new total.
create or replace function public.set_intent(p_event text, p_visitor uuid, p_interested boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
begin
  if not exists (select 1 from events where id = p_event) then
    raise exception 'Unknown event %', p_event using errcode = '22023';
  end if;
  if p_interested then
    -- Simple abuse guard: one browser can follow at most 40 events.
    if (select count(*) from intents where visitor_id = p_visitor) >= 40 then
      raise exception 'Too many events for one visitor' using errcode = '22023';
    end if;
    insert into intents (event_id, visitor_id) values (p_event, p_visitor)
    on conflict (event_id, visitor_id) do nothing;
  else
    delete from intents where event_id = p_event and visitor_id = p_visitor;
  end if;
  select count(*) into total from intents where event_id = p_event;
  return total;
end;
$$;

-- Per-event totals for the website and the dashboard.
create or replace function public.get_intent_counts()
returns table (event_id text, name text, category text, interested bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.name, e.category, count(i.visitor_id)
  from events e
  left join intents i on i.event_id = e.id
  group by e.id, e.name, e.category, e.sort_order
  order by e.sort_order;
$$;

-- Headline numbers for the organisers' dashboard (aggregates only, no visitor ids).
create or replace function public.get_intent_summary()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'unique_visitors', (select count(distinct visitor_id) from intents),
    'total_intents',   (select count(*) from intents),
    'last_24h',        (select count(*) from intents where created_at > now() - interval '24 hours'),
    'events',          (select count(*) from events),
    'generated_at',    now()
  );
$$;

revoke all on function public.set_intent(text, uuid, boolean) from public;
revoke all on function public.get_intent_counts() from public;
revoke all on function public.get_intent_summary() from public;
grant execute on function public.set_intent(text, uuid, boolean) to anon, authenticated;
grant execute on function public.get_intent_counts() to anon, authenticated;
grant execute on function public.get_intent_summary() to anon, authenticated;
