-- TRIBUNAL schema — run against Supabase when MCP credentials are configured.
-- See docs/SCHEMA.md

create extension if not exists vector;

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_number text unique not null,
  title text not null,
  service text not null,
  dag_id text,
  severity text not null,
  raw_log text not null,
  error_signature text not null,
  source_url text,
  occurred_at timestamptz not null,
  status text not null default 'AWAITING_HEARING',
  is_precached boolean not null default false
);

create table if not exists hearings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  incident_id uuid not null references incidents(id) on delete cascade,
  docket_number text unique not null,
  convened_at timestamptz not null default now(),
  concluded_at timestamptz,
  state text not null default 'CONVENED'
);

create table if not exists arguments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  hearing_id uuid not null references hearings(id) on delete cascade,
  role text not null,
  sequence int not null,
  body text not null,
  claims jsonb not null default '[]'::jsonb,
  cited_precedents jsonb not null default '[]'::jsonb,
  model text
);

create table if not exists rulings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  hearing_id uuid not null references hearings(id) on delete cascade,
  verdict text not null,
  opinion text not null,
  holding text not null,
  remediation_order jsonb not null default '[]'::jsonb,
  confidence numeric not null,
  cited_precedent_ids jsonb not null default '[]'::jsonb,
  veto_window_seconds int not null default 10,
  veto_opens_at timestamptz not null default now(),
  executed_at timestamptz,
  authority text
);

create table if not exists precedents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  precedent_number int unique not null,
  ruling_id uuid references rulings(id) on delete set null,
  incident_id uuid references incidents(id) on delete set null,
  citation text not null,
  holding text not null,
  summary text not null,
  verdict text not null,
  outcome text not null,
  mttr_minutes int,
  embedding vector(1536),
  is_seeded boolean not null default true
);

create table if not exists vetoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ruling_id uuid not null references rulings(id) on delete cascade,
  exercised_at timestamptz not null default now(),
  seconds_remaining int not null,
  reason text
);

create index if not exists idx_incidents_status on incidents(status);
create index if not exists idx_hearings_incident_id on hearings(incident_id);
create index if not exists idx_arguments_hearing_id on arguments(hearing_id);
create index if not exists idx_rulings_hearing_id on rulings(hearing_id);
create index if not exists idx_precedents_number_desc on precedents(precedent_number desc);

create index if not exists idx_precedents_embedding
  on precedents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_precedents(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  precedent_number int,
  citation text,
  holding text,
  summary text,
  verdict text,
  outcome text,
  mttr_minutes int,
  similarity float
)
language sql stable
as $$
  select
    p.id,
    p.precedent_number,
    p.citation,
    p.holding,
    p.summary,
    p.verdict,
    p.outcome,
    p.mttr_minutes,
    1 - (p.embedding <=> query_embedding) as similarity
  from precedents p
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

create or replace view docket as
select *
from incidents
where status = 'AWAITING_HEARING'
order by
  case severity when 'P1' then 1 when 'P2' then 2 else 3 end,
  occurred_at desc;

alter table incidents enable row level security;
alter table hearings enable row level security;
alter table arguments enable row level security;
alter table rulings enable row level security;
alter table precedents enable row level security;
alter table vetoes enable row level security;

-- TODO: tighten before any real deployment
create policy "anon_select_incidents" on incidents for select to anon using (true);
create policy "anon_select_hearings" on hearings for select to anon using (true);
create policy "anon_select_arguments" on arguments for select to anon using (true);
create policy "anon_select_rulings" on rulings for select to anon using (true);
create policy "anon_select_precedents" on precedents for select to anon using (true);
create policy "anon_select_vetoes" on vetoes for select to anon using (true);
create policy "anon_insert_vetoes" on vetoes for insert to anon with check (true);
