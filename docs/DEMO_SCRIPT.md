# DEMO SCRIPT — 90 seconds

Record at 14:00. Three takes. Keep the best. Save locally before uploading anywhere.

---

## Setup checklist (run at 13:45, before the first take)

```
□ Deployed URL open in a clean browser window (not localhost)
□ Browser zoom 100%, window 1440x900, bookmarks bar hidden
□ Dev tools CLOSED
□ All other tabs closed. Notifications off. Slack quit.
□ System volume at 60%. Speech synthesis mute toggle set to UNMUTED.
□ CASE-2281 is is_precached = true — verified by running with LLM key unset
□ Precedent counter reads exactly 1,205
□ Run the full path once to warm caches, then reset state
□ Screen recorder: 1440x900, 30fps, system audio ON (we need the spoken ruling)
```

---

## Beat sheet

| Sec | Screen | You say |
|---|---|---|
| 0–8 | Real Airflow traceback, full screen | "This is a production pipeline failure. At three in the morning, an AI agent will now fix it. Nobody will ask it why." |
| 8–16 | Cut to `/tribunal`. Docket left, precedent counter right. | "Tribunal is a court. Click a case, and three agents convene a hearing." |
| 16–20 | Click CASE-2281 → **CONVENE HEARING** | *(silence — let it start)* |
| 20–32 | Prosecution streams in, oxblood border | "Prosecution moves for remediation. It quotes the log. It names a respondent." |
| 32–46 | Defense streams in, slate border. Right panel lights up with 3 cited precedents + similarity scores. | "Defense doesn't deny the failure. It cites three prior rulings where this exact remediation made things worse." |
| 46–58 | Ruling renders in serif. **VOICE SPEAKS.** Say nothing over it — let the machine talk. | *(silence)* |
| **58–70** | `HUMAN VETO WINDOW — 00:59` counting down. Your cursor moves toward the VETO button. **Then stops.** | "I have sixty seconds to overrule this. At three in the morning, nobody is awake to use it." |
| **70–78** | Timer hits 00:00. `VETO WINDOW CLOSED — EXECUTED UNDER AUTONOMOUS AUTHORITY`. `ENTERED AS PRECEDENT #1,206`. Counter ticks 1,205 → 1,206. | "It just entered its own decision as binding precedent." |
| 78–86 | Open CASE-4417. Live hearing. Judge's ruling **cites TRIB-1206**. Zoom on the citation. | "And now the court cites itself." |
| 86–90 | Cursor slide: rules files, Plan Mode spec, MCP schema, worktrees, Bugbot | "Built today in Cursor. Two years ago I built an engine that could diagnose. It had no authority and no memory. This has both." |

**Cut. Stop talking. Do not add a thank-you.**

---

## The three non-negotiable beats
1. **The silence at 46–58.** Let the voice deliver the ruling alone. Do not narrate over it.
2. **The cursor hesitation at 58–70.** Move toward VETO, then visibly decline. This is the whole project in one gesture.
3. **The self-citation at 78–86.** This proves precedent is real, not decoration.

---

## THINGS TO AVOID (demo killers)

❌ Do not:
- Refresh mid-hearing (loses streaming state)
- Click CONVENE twice (creates a duplicate docket)
- Open dev tools (lag + looks unpolished)
- Narrate over the spoken ruling
- Explain the architecture before showing the demo
- Say "as you can see" or "basically" or "so yeah"
- Apologize for anything. Ever.
- Run the live Case #2 as your FIRST case — always lead with the pre-cached one

✅ Do:
- Lead with the pre-cached case every single time
- Pause after the ruling. Silence reads as confidence.
- Say "precedent" and "authority" — those are the words that land
- Keep the mute toggle visible so the room knows the voice is real, not a video

---

## If something breaks mid-take
| Failure | Response |
|---|---|
| Live Case #2 stalls | Skip it. The pre-cached case already landed the demo. Cut to the Cursor slide. |
| Voice doesn't fire | Keep going. The serif ruling on screen carries it. Mention "it also reads the ruling aloud." |
| Realtime counter doesn't tick | Reload after execution — the number is correct in the DB. |
| Deployed URL is down | Switch to localhost. Do not mention it. |
| Whole app dies | Play the recorded video. This is why you recorded at 14:00. |

---

## Submission copy (paste into the portal)

**TRIBUNAL — a machine court for production incidents**

We already let AI agents act on production systems. We never built the part where they
have to justify it.

TRIBUNAL convenes an adversarial hearing over every incident. A Prosecution agent moves
for remediation. A Defense agent opposes it, citing precedent from 1,205 prior rulings
retrieved by vector similarity. A Judge issues a binding order and reads it aloud.

Then a sixty-second human veto window opens. If it expires — and at 3 AM it does — the
ruling executes under autonomous authority and is entered as precedent that constrains
every future hearing. The court builds its own case law.

Incidents are seeded from real public GitHub issues in apache/airflow, dbt-core, and
great-expectations. Real tracebacks. No remediation is actually executed — rulings are
recorded, not run.

**How Cursor was meaningful:**
- Three scoped `.cursor/rules/*.mdc` files acted as the project constitution all day
- Plan Mode produced the build spec before a line of code was written
- The entire Postgres schema, RLS policies, pgvector ivfflat index, and `match_precedents`
  rpc were created through the **Supabase MCP server** — we never wrote SQL or opened the dashboard
- Three Cursor agents ran in parallel on git worktrees: hearing engine, courtroom UI, seed pipeline
- The Browser tool let an agent see and fix `/tribunal` visually without us describing bugs
- Bugbot reviewed the final diff before freeze

**Lineage:** A.I.D.E. (Meta ATX Llama Hackathon, 2024) could diagnose an incident. It had
no authority and no memory. TRIBUNAL gives it both — and that is a governance problem,
not a feature. Build the courtroom before you need it.
