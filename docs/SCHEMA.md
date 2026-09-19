# SCHEMA — paste this to Cursor Agent at 10:30 AM

Give the block below to Cursor Agent verbatim. It uses the Supabase MCP server.
Do not open the Supabase dashboard. Do not hand-write SQL.

---

## PROMPT TO PASTE

```
Using the Supabase MCP server tools, set up the TRIBUNAL database. Do all of this
through MCP — do not create local migration files and do not ask me to open the dashboard.

1. Enable the `vector` extension.

2. Create these tables. Every table gets:
     id uuid primary key default gen_random_uuid()
     created_at timestamptz not null default now()

   incidents
     case_number      text unique not null        -- e.g. 'CASE-2281'
     title            text not null
     service          text not null               -- e.g. 'metadata-ingest'
     dag_id           text
     severity         text not null               -- 'P1' | 'P2' | 'P3'
     raw_log          text not null               -- REAL traceback text
     error_signature  text not null               -- normalized one-line fingerprint
     source_url       text                        -- public GitHub issue we seeded from
     occurred_at      timestamptz not null
     status           text not null default 'AWAITING_HEARING'
                      -- 'AWAITING_HEARING' | 'IN_HEARING' | 'ADJUDICATED'
     is_precached     boolean not null default false

   hearings
     incident_id      uuid not null references incidents(id) on delete cascade
     docket_number    text unique not null        -- e.g. 'DKT-2026-1206'
     convened_at      timestamptz not null default now()
     concluded_at     timestamptz
     state            text not null default 'CONVENED'
                      -- 'CONVENED' | 'ARGUED' | 'RULED' | 'EXECUTED' | 'VETOED'

   arguments
     hearing_id       uuid not null references hearings(id) on delete cascade
     role             text not null               -- 'PROSECUTION' | 'DEFENSE' | 'JUDGE'
     sequence         int not null                -- 1, 2, 3
     body             text not null
     claims           jsonb not null default '[]'::jsonb
     cited_precedents jsonb not null default '[]'::jsonb
     model            text

   rulings
     hearing_id         uuid not null references hearings(id) on delete cascade
     verdict            text not null             -- 'REMEDIATE' | 'HOLD' | 'DISMISS'
     opinion            text not null             -- the spoken/serif legal opinion
     remediation_order  jsonb not null default '[]'::jsonb  -- ordered array of steps
     confidence         numeric not null          -- 0..1
     cited_precedent_ids jsonb not null default '[]'::jsonb
     veto_window_seconds int not null default 60
     veto_opens_at      timestamptz not null default now()
     executed_at        timestamptz
     authority          text                      -- 'AUTONOMOUS' | 'HUMAN_CONFIRMED' | null

   precedents
     precedent_number int unique not null          -- 1..1205 seeded, then 1206+
     ruling_id        uuid references rulings(id) on delete set null
     incident_id      uuid references incidents(id) on delete set null
     citation         text not null                -- 'TRIB-1206'
     holding          text not null                -- one-sentence binding rule
     summary          text not null
     verdict          text not null
     outcome          text not null                -- 'REMEDIATION_SUCCEEDED' | 'REMEDIATION_WORSENED' | 'HOLD_CORRECT' | 'UNKNOWN'
     mttr_minutes     int
     embedding        vector(1536)
     is_seeded        boolean not null default true

   vetoes
     ruling_id        uuid not null references rulings(id) on delete cascade
     exercised_at     timestamptz not null default now()
     seconds_remaining int not null
     reason           text

3. Indexes:
   - ivfflat on precedents.embedding using vector_cosine_ops with lists = 100
   - btree on incidents.status, hearings.incident_id, arguments.hearing_id,
     rulings.hearing_id, precedents.precedent_number desc

4. Enable RLS on every table. Create demo-permissive policies:
   - anon SELECT on all tables
   - anon INSERT on vetoes only
   Put this comment above each policy: `-- TODO: tighten before any real deployment`

5. Create this rpc:

   match_precedents(query_embedding vector(1536), match_threshold float, match_count int)
   returns table (
     id uuid, precedent_number int, citation text, holding text, summary text,
     verdict text, outcome text, mttr_minutes int, similarity float
   )
   language sql stable
   -- orders by cosine similarity desc, filters where similarity > match_threshold,
   -- limits to match_count

6. Create a view `docket` that returns incidents where status = 'AWAITING_HEARING'
   ordered by severity then occurred_at desc.

7. After creating everything: run a verification query that lists all tables with
   their row counts and confirms the vector extension and ivfflat index exist.
   Show me the output.

8. Generate TypeScript types from this schema into `lib/database.types.ts`.
```

---

## Verification gate (do not proceed until all true)
- [ ] `vector` extension enabled
- [ ] 6 tables created
- [ ] ivfflat index exists on `precedents.embedding`
- [ ] `match_precedents` rpc callable and returns rows after seeding
- [ ] RLS enabled on all 6 tables
- [ ] `lib/database.types.ts` generated
