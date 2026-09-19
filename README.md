# ⚖️ TRIBUNAL

**A machine court for production incidents.**

We already let AI agents act on production systems. We never built the part where they
have to justify it — and we never asked what happens when the human's right to say no
has an expiration date.

---

## What it does

A production pipeline fails. TRIBUNAL convenes a hearing.

| Agent | Role |
|---|---|
| **Prosecution** | Moves for remediation. Quotes the traceback. Names a respondent. |
| **Defense** | Concedes the failure, opposes the remedy — citing prior rulings where that same remediation made things worse. |
| **Judge** | Addresses the Defense's strongest precedent, issues a binding order, and reads the opinion aloud. |

Then a **sixty-second human veto window** opens.

If it expires, the ruling **executes under autonomous authority** and is entered as
**precedent** — retrievable by vector search, binding on every future hearing.

The court builds its own case law.

---

## Architecture

```
Incident (real traceback)
  → pgvector search over 1,205 prior rulings
  → Prosecution argument      (Zod-validated)
  → Defense argument          (Zod-validated, cites retrieved precedents)
  → Judge ruling              (Zod-validated, spoken via browser speechSynthesis)
  → 60s veto window
      ├─ vetoed  → recorded as dissent
      └─ expired → EXECUTED under AUTONOMOUS AUTHORITY
                 → holding embedded and inserted as precedent #N+1
                 → future hearings cite it
```

**Stack:** Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase
(Postgres + pgvector + Realtime + RLS) · Zod · browser `speechSynthesis`

---

## Data provenance

Incidents and precedents are seeded from **real public GitHub issues** in
`apache/airflow`, `dbt-labs/dbt-core`, and `great-expectations`. Error text and
tracebacks are unmodified.

Ruling metadata (verdict, outcome, MTTR) is synthesized for demonstration.

**No remediation is ever executed.** Rulings are recorded, never run. There is no
write path to any external system.

---

## How Cursor was meaningful

- **Three scoped `.cursor/rules/*.mdc` files** acted as the project constitution —
  stack lock, a hard won't-do list, and a full institutional design language enforced
  on every generated component.
- **Plan Mode** produced the file-by-file build spec, with per-file time estimates and
  a ranked cut list, before a single line of code was written.
- **Supabase MCP server** created the entire schema: 6 tables, RLS policies, the
  `pgvector` ivfflat index, and the `match_precedents` rpc. We never wrote SQL and
  never opened the Supabase dashboard.
- **Three Cursor agents in parallel on git worktrees** — hearing engine, courtroom UI,
  seed pipeline — merged at two fixed checkpoints.
- **Browser tool** let an agent see `/tribunal` and fix visual defects without us
  describing them.
- **Bugbot** reviewed the final diff before feature freeze.
- **Context7 MCP** kept Supabase and Next.js API usage current instead of hallucinated.

---

## Lineage

**A.I.D.E.** (Meta ATX Llama Hackathon, April 2024) was an automated RCA engine. It
could tell you what went wrong. It had no authority and no memory.

| | A.I.D.E. (2024) | TRIBUNAL |
|---|---|---|
| Diagnose | ✅ | ✅ |
| Decide | ❌ | ✅ |
| Justify the decision | ❌ | ✅ adversarially |
| Be overruled | n/a | ✅ — for 60 seconds |
| Bind the future | ❌ | ✅ precedent |

TRIBUNAL gives it both. That is not a feature — it is a governance problem.

**Build the courtroom before you need it.**

---

## Run locally

```bash
npm install
cp .env.example .env.local     # fill in Supabase + model keys
npm run seed                   # ingest real issues, embed 1,205 precedents
npm run precache               # make CASE-2281 deterministic
npm run dev                    # → /tribunal
```

`CASE-2281` runs with **zero model calls** — it is fully pre-cached and will render
correctly with the LLM API key unset.

---

## Not built (deliberately)

No auth. No multi-tenancy. No real remediation execution. No appeals. No mobile layout.
One screen, one path, built in a day.
