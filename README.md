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

The four docket cases and the precedent summaries are taken from **real public GitHub issues** in
`apache/airflow`, `dbt-labs/dbt-core` / `dbt`, and `great-expectations` (`npm run fetch-issues`).
Issue bodies in `raw_log` / `summary` are unmodified excerpts.

There are **486 unique issues** in the cache. The on-screen corpus is padded to **1,205** citation
slots (PLAN cut-gate). Holdings for most slots are title-derived, not LLM-extracted, until
`OPENAI_API_KEY` is set. Ruling metadata (verdict, outcome, MTTR) is synthesized.

**No remediation is ever executed.** Rulings are recorded, never run.

**Not yet true in this checkout:** a live Supabase project, pgvector embeddings, or MCP-created
schema. `supabase/schema.sql` is ready to apply when you add credentials to `.env.local`.
Without those keys the app runs in **fixture mode**.

CASE-4417 live generation requires `OPENAI_API_KEY` or `GROQ_API_KEY`. Without a key it degrades
to the archived CASE-2281 hearing.

---

## How Cursor was used in the kit

The repo still ships the three `.cursor/rules/*.mdc` files, Plan Mode docs, and a
schema intended for Supabase MCP. This checkout has not yet applied that schema through
MCP (placeholders remain in `.cursor/mcp.json`). Parallel worktrees and Bugbot were
the planned day-of process, not a completed history of this tree.

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
npm run fetch-issues      # optional refresh of scripts/.cache
npm run generate-corpus   # rebuild fixtures from the cache
npm run dev               # → /tribunal  (fixture mode if no Supabase keys)
```

To attach a real database later:

```bash
cp .env.example .env.local   # Supabase URL + service role + OPENAI_API_KEY
# apply supabase/schema.sql to the project, then:
npm run seed
npm run precache
```

`CASE-2281` runs with **zero model calls** in fixture mode.

---

## Not built (deliberately)

No auth. No multi-tenancy. No real remediation execution. No appeals. No mobile layout.
One screen, one path, built in a day.
