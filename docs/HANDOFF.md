# HANDOFF — worktree boundaries

Read this before starting an agent. It exists so three Cursor agents can run in
parallel for 80 minutes without touching the same files.

---

## The contract

`lib/schemas.ts` and `lib/court/events.ts` are **FROZEN at 10:30 AM.**

They are the only files all three worktrees share. Every other file has exactly
one owner. If you think you need to change a frozen file: say it out loud, change
it, merge to `main` immediately, and tell the other windows to rebase.

Silent edits to these two files are the only realistic way this build fails.

---

## File ownership

| File | Owner | Merge conflict risk |
|---|---|---|
| `lib/schemas.ts` | 🔒 FROZEN | — |
| `lib/court/events.ts` | 🔒 FROZEN | — |
| `lib/court/prompts.ts` | 🅰 | none |
| `lib/llm.ts` | 🅰 | none |
| `lib/court/counsel.ts` | 🅰 | none |
| `lib/court/convene.ts` | 🅰 | none |
| `lib/court/execute.ts` | 🅰 | none |
| `app/api/hearing/route.ts` | 🅰 | none |
| `app/api/veto/route.ts` | 🅰 | none |
| `app/api/execute/route.ts` | 🅰 | none |
| `lib/db/queries.ts` | 🅰 | 🟡 🅲 reads types only — do not edit |
| `app/tribunal/page.tsx` | 🅱 | none |
| `components/**` | 🅱 | none |
| `app/globals.css`, `tailwind.config.ts` | 🅱 | 🟡 set these TONIGHT to avoid it |
| `scripts/ingest.ts` | 🅲 | none |
| `scripts/precache.ts` | 🅲 | none |
| `README.md` | 🅲 | none |
| `lib/database.types.ts` | generated | regenerate, never hand-edit |

---

## 🅱 can start immediately — no waiting on 🅰

Build the entire UI against **mock events**. Create `lib/court/mock-events.ts`:
a hardcoded array of `HearingEvent` objects in canonical order, replayed on a
timer. The UI never knows the difference.

```
Prompt for 🅱:
  CONTEXT: @lib/court/events.ts @.cursor/rules/200-ui.mdc @docs/PRD.md
  TASK: Build /tribunal against a mock HearingEvent array replayed on a timer.
        Do NOT call /api/hearing yet. Do not touch anything in lib/court/ except
        importing types from events.ts.
  DONE WHEN: the full demo path plays end to end from mocks, including the 60s
        countdown, the expiry state swap, and the spoken ruling.
  FIRST: restate the plan in 3 bullets and wait for my go.
```

At 12:30, swap the mock source for an `EventSource` on `/api/hearing`. That swap
is a **one-line change** if 🅱 respected the boundary. This is the whole point of
the frozen contract.

---

## Merge protocol

Merge to `main` at **12:30** and **13:30**. Nothing in between.

```bash
# in each worktree, before merging
npm run build            # must pass
git add -A && git commit -m "..."

# in main
git merge feat/data      # 🅲 first — types and seed data
git merge feat/court     # 🅰 second
git merge feat/ui        # 🅱 last
npm run build
```

Order matters: data → court → ui. Anything else and you'll merge UI against
signatures that don't exist yet.

---

## Definition of done per worktree

**🅰 court** — `curl -N "localhost:3000/api/hearing?incidentId=<CASE-2281-uuid>"`
streams the canonical event sequence, in order, with the LLM key **unset**.

**🅱 ui** — `/tribunal` plays the full demo path from mocks. Countdown ticks,
expiry swaps state, ruling is spoken, precedent counter increments.

**🅲 data** — `SELECT count(*) FROM precedents` returns 1,205 (or 300 if cut).
`match_precedents` returns 5 rows above threshold for CASE-2281's signature.
`precache.ts` has run and CASE-2281 works with no model credentials.

---

## The one test that decides whether you have a safe demo

```bash
# unset every model credential
unset OPENAI_API_KEY GROQ_API_KEY
npm run dev
# open /tribunal → CASE-2281 → CONVENE HEARING
```

It must complete the entire path — arguments, ruling, voice, countdown, expiry,
precedent increment — with **zero model calls**.

Run this at 13:00. If it fails, stop building features and fix it. Nothing else
on the plan matters more than this passing.
