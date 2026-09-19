# PLAN — Hackathon Day

## THE ONLY DEADLINE THAT MATTERS: 1:45 PM FEATURE FREEZE
Submissions close 3:00 PM. Everything after 1:45 is packaging, not building.
Net coding time is 200 minutes. Act like it.

---

## Timeline

| Time | Phase | Output | Gate |
|---|---|---|---|
| **Tonight** | Scaffold, deploy, rules, MCP, Supabase project | Live Vercel URL | URL loads |
| 9:00–9:30 | Breakfast. Re-read PRD. Write won't-dos on paper. | — | — |
| 9:30–10:00 | Team formation. Pitch TRIBUNAL. Assign roles. | Roles locked | — |
| 10:00–10:30 | **Plan Mode** on `@docs/PRD.md` → cut the plan in half | Reviewed plan | Zero code |
| 10:30–11:00 | **Supabase MCP** builds schema (`@docs/SCHEMA.md`) | 6 tables + rpc + types | Verification query passes |
| 11:00–11:40 | **Seed real incidents + 1,205 precedents** | Embeddings stored | 🔒 DATA FROZEN |
| 11:40–13:00 | **3 parallel agents on worktrees** | Hearing works locally | Demo path green |
| 13:00–13:30 | Pre-cache CASE-2281. Lunch while agents run. | Deterministic case | Runs with LLM disabled |
| 13:30–13:45 | Polish `/tribunal`. Deploy to prod. | Prod works | 3× clean runs |
| **13:45** | 🧊 **FEATURE FREEZE** | — | Nothing new. Ever. |
| 13:45–14:00 | Bugbot on diff. Fix only high-confidence, on-path. | Clean | Prod smoke ×3 |
| 14:00–14:30 | **Record video. 3 takes.** | 90s MP4 | ✅ File exists |
| 14:30–14:50 | README + submission copy + Cursor-usage section | Submitted | ✅ |
| 14:50–15:00 | Buffer. Stop touching the repo. | — | — |
| 15:00–16:30 | Judging. Work the room. Lead with the governance angle. | — | — |

---

## Parallel agent split (git worktrees)

```bash
git worktree add ../wt-court   -b feat/court
git worktree add ../wt-ui      -b feat/ui
git worktree add ../wt-data    -b feat/data
```

### 🅰 `wt-court` — the hearing engine
Owns: `lib/llm.ts`, `lib/court/*`, `app/api/hearing/route.ts`, Zod schemas
- `convene(incidentId)` → creates hearing row, returns docket number
- `prosecute(incident)` → Prosecution argument (Zod validated)
- `defend(incident, precedents)` → Defense argument citing retrieved precedents
- `adjudicate(incident, prosecution, defense, precedents)` → Ruling
- `matchPrecedents(errorSignature)` → calls `match_precedents` rpc
- `executeRuling(rulingId)` → writes `rulings.executed_at`, `authority='AUTONOMOUS'`,
  inserts next `precedents` row. **Simulated. Executes nothing.**
- Streaming: server route streams arguments sequentially (SSE or ReadableStream)

### 🅱 `wt-ui` — the courtroom
Owns: `app/tribunal/page.tsx`, `components/*`
- `DocketPanel` (left) — incident list, severity chips, case numbers
- `HearingStage` (center) — sequenced `ArgumentBlock`s, then `RulingOpinion` in serif
- `VetoCountdown` — brass monospace, 60s tick, T-10 pulse, expiry state swap
- `PrecedentPanel` (right) — cited precedents w/ similarity %, live counter
- `useSpeech(text)` — speechSynthesis hook, rate 0.85 pitch 0.9, mute toggle
- All loading / empty / error states

### 🅲 `wt-data` — seed and ops
Owns: `scripts/ingest.ts`, `scripts/precache.ts`, `README.md`, deploy config
- Pull real issues from apache/airflow, dbt-core, great-expectations (public API)
- Normalize into `incidents` (4 demo cases, hand-curated) + `precedents` (1,205)
- Compute and store all embeddings ONCE
- `precache.ts` — runs CASE-2281 hearing, stores arguments + ruling with
  `is_precached = true` so the demo needs zero live LLM calls

**Merge order:** `wt-data` → `wt-court` → `wt-ui`. Merge to `main` at 12:30 and 13:30 only.

---

## Checkpoints — if red, CUT SCOPE, do not extend time

| Time | Must be true | If not |
|---|---|---|
| 11:00 | Schema verified, types generated | Drop precedent count to 300, keep moving |
| 11:40 | 1,205 precedents embedded, rpc returns matches | Seed 200 by hand, move on |
| 12:30 | Prosecution + Defense render in the UI | Cut Defense→precedent citation, hardcode 3 |
| 13:00 | Full path works locally incl. countdown | Cut live Case #2 entirely. Pre-cache only. |
| 13:30 | Works on the DEPLOYED url | Demo localhost, record video immediately |

---

## Cursor discipline
- Never let one chat exceed ~15 exchanges. Start fresh, re-anchor with `@docs/PLAN.md`.
- Commit every time something works. `git commit -m "works: veto countdown"`.
- Agent derails twice on the same task → **Restore Checkpoint, rewrite the prompt.**
  Do not re-prompt into a poisoned context.
- Use the Browser tool to let the agent see and fix `/tribunal` visually.
- Screenshot: the rules files, the Plan Mode output, the MCP schema creation.
  These are demo assets.

---

## Prompt template for every task
```
CONTEXT: @docs/PLAN.md — agent 🅰 §prosecute
TASK: Implement only `prosecute(incident)`.
CONSTRAINTS: Touch only lib/court/prosecute.ts and lib/schemas.ts. No new deps.
DONE WHEN: `npm run build` passes and a test call returns a Zod-valid argument.
FIRST: restate the plan in 3 bullets and wait for my "go".
```

## Recovery prompt
```
Stop. Do not write code. List the 3 most likely root causes, ranked, with one line of
evidence each. Then name the single cheapest diagnostic to run.
```

## 13:30 polish prompt
```
You are a design engineer 20 minutes before a demo. Use the browser tool on /tribunal.
List the 5 highest-impact visual fixes ordered by impact ÷ effort. Implement only the
top 3. Restructure nothing.
```

## Stretch — ONLY if 13:00 checkpoint is green
`/registry` — a flat table of all 1,206 precedents, newest first, with holdings.
It makes the corpus feel real. It is one query and one table. Nothing more.
