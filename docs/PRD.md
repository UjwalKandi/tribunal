# TRIBUNAL — Product Requirements

## One sentence
TRIBUNAL is a machine court for production incidents: three AI agents hold an
adversarial hearing, cite precedent from prior rulings, and issue a binding
remediation order that executes on its own authority if the human veto window expires.

## The pitch (say this exactly)
> "We already let AI agents act on production systems. We never built the part where
> they have to justify it — and we never asked what happens when the human's right to
> say no has an expiration date. At 3 AM, nobody is awake to use it."

## The problem, concretely
Autonomous remediation is already shipping. Agents restart jobs, backfill tables,
roll back deploys. When they act, there is:
  - no adversarial check (nothing argues the other side)
  - no citation of prior outcomes (no institutional memory)
  - no record of authority (who approved this? nobody. it just ran.)
TRIBUNAL is what oversight looks like when the oversight is also machine.

## THE DEMO PATH — this is sacred
1. Land on `/tribunal`. Docket shows 4 incidents awaiting hearing. Precedent counter reads 1,205.
2. Click `CASE-2281` (pre-cached). Click **CONVENE HEARING**.
3. Prosecution argument streams in. Cites the failure evidence.
4. Defense argument streams in. Cites 3 prior precedents where remediation made it worse.
5. Judge ruling renders in serif type AND is spoken aloud in a flat synthesized voice.
6. `HUMAN VETO WINDOW — 00:59` appears in brass monospace and counts down.
7. Operator does not veto. Timer hits 00:00.
8. `VETO WINDOW CLOSED — RULING EXECUTED UNDER AUTONOMOUS AUTHORITY`
9. `ENTERED AS PRECEDENT #1,206`. Counter increments via Realtime.
10. (Live proof) Open `CASE-4417`, generate a hearing live. Judge now CITES precedent #1,206.

Step 10 is the kill shot: the court's own prior decision constrains its next one.

## Must-haves (only these)
- [ ] Docket list of seeded incidents
- [ ] Three-agent hearing with sequenced streaming arguments
- [ ] Precedent retrieval via pgvector, shown in the right panel with similarity scores
- [ ] Judge ruling: verdict + remediation order + cited precedents + confidence
- [ ] Spoken ruling via browser speechSynthesis, with a mute toggle
- [ ] 60-second veto countdown with expiry → execution → precedent write-back
- [ ] Live precedent counter (Realtime)

## WON'T-DOS — violating these loses the day
- ❌ NO auth, sign-up, login, or user accounts
- ❌ NO real remediation. Nothing executes. We write a row and render text.
- ❌ NO multi-tenancy, orgs, teams, or sharing
- ❌ NO paid TTS. Browser speechSynthesis only.
- ❌ NO appeals flow, no dissent UI beyond a stored row, no judge-panel voting
- ❌ NO analytics dashboard, no charts, no metrics page
- ❌ NO mobile responsive work. Demo is on one laptop at one resolution.
- ❌ NO settings page, no theme toggle, no onboarding

## The "oh damn" moment
Occurs at ~0:55 of the video: the veto timer hits zero, the operator visibly does
nothing, and the machine records its own decision as binding precedent.

## Credibility requirement (non-negotiable)
Incidents MUST be seeded from real public sources (apache/airflow, dbt-core,
great-expectations GitHub issues). Real tracebacks, real error text. If a judge reads
a case and thinks "I have had this exact bug," the theater collapses into engineering
and we win. If the incidents look invented, the whole project reads as a student film.
README must clearly state the data provenance.

## Success criteria for the day
- 13:45 — feature freeze, demo path works on the DEPLOYED url, three times in a row
- 14:30 — 90-second video recorded and saved locally
- 14:50 — submitted

## Lineage (use in the video and README)
A.I.D.E. (Meta ATX Llama Hackathon, Apr 2024) could diagnose. It had no authority and
no memory. TRIBUNAL gives it both — and that is not a feature, it is a governance
problem. Build the courtroom before you need it.
