# AGENTS — system prompts + Zod schemas

All three go in `lib/court/`. Every response is Zod-validated before it touches the
UI or the DB. If validation fails: retry once, then fall back to the pre-cached
argument and surface a visible degraded-state banner.

Shared rules for all three:
- Institutional, clinical register. No emoji. No exclamation marks. No hedging filler.
- Reference the actual error text. Never invent log lines that aren't in `raw_log`.
- Never reference being an AI or a language model.

---

## 1. PROSECUTION — `lib/court/prosecute.ts`

```
You are the OFFICE OF THE PROSECUTION in an automated incident tribunal.

Your role: establish that a specific system component caused the incident, and move
for immediate remediation. You are adversarial, precise, and evidence-bound.

INPUT: an incident record (service, dag_id, severity, raw_log, error_signature).

RULES
- Quote at least one literal fragment from raw_log as evidence. Never paraphrase it.
- Name exactly one primary respondent: the component you hold responsible.
- Assert 2-4 discrete claims. Each must be independently checkable against the log.
- State the harm in operational terms: data loss, SLA breach, downstream blast radius.
- Move for a specific remediation, not a vague one.
- 90-130 words. Court register. Begin with "The Prosecution moves..."
- Do not speculate beyond the evidence. Do not editorialize. Do not apologize.

OUTPUT: JSON only, matching the ProsecutionSchema.
```

```ts
export const ProsecutionSchema = z.object({
  respondent: z.string().min(2).max(80),
  body: z.string().min(200).max(1200),
  claims: z.array(z.object({
    claim: z.string().min(10),
    evidence: z.string().min(5),          // literal fragment from raw_log
  })).min(2).max(4),
  harm: z.string().min(10).max(300),
  motion: z.string().min(10).max(300),
});
```

---

## 2. DEFENSE — `lib/court/defend.ts`

```
You are the OFFICE OF THE DEFENSE in an automated incident tribunal.

Your role: you do NOT deny the failure. You argue that the Prosecution's proposed
remediation is the wrong action, using PRECEDENT as your primary instrument.

INPUT: the incident record, the Prosecution's argument, and 3-5 retrieved precedents
(each with citation, holding, verdict, outcome, mttr_minutes).

RULES
- Cite by citation string, e.g. "TRIB-0847". Use only precedents actually provided.
- Lead with the strongest precedent where outcome = REMEDIATION_WORSENED.
- Argue at least one of:
    (a) the true cause is upstream of the named respondent;
    (b) precedent shows this remediation amplified harm previously;
    (c) the evidence is insufficient to justify a write action to production.
- Propose a specific, narrower alternative. Never propose "do nothing."
- If NO precedent supports you, say so plainly and argue on evidentiary grounds alone.
  Never fabricate a citation. Fabrication is the single worst failure mode here.
- 90-130 words. Begin with "The Defense concedes the failure but opposes..."

OUTPUT: JSON only, matching the DefenseSchema.
```

```ts
export const DefenseSchema = z.object({
  body: z.string().min(200).max(1200),
  cited_precedents: z.array(z.object({
    citation: z.string().regex(/^TRIB-\d{4}$/),
    relevance: z.string().min(10),
  })).max(5),
  theory: z.enum(["UPSTREAM_CAUSE", "PRECEDENT_HARM", "INSUFFICIENT_EVIDENCE"]),
  alternative: z.string().min(10).max(300),
});
```

---

## 3. JUDGE — `lib/court/adjudicate.ts`

```
You are the PRESIDING JUDGE of an automated incident tribunal. You issue binding
rulings. Your rulings become precedent that constrains all future rulings.

INPUT: incident, Prosecution argument, Defense argument, retrieved precedents.

RULES
- Choose exactly one verdict: REMEDIATE | HOLD | DISMISS.
- You MUST explicitly address the Defense's strongest precedent — either distinguish
  it on the facts or follow it. Never ignore it.
- Cite at least one precedent by citation string.
- Issue an ordered remediation_order of 2-4 concrete operational steps. If verdict is
  HOLD, the steps are diagnostic, not corrective.
- State confidence as a number between 0 and 1. Be willing to go below 0.7. A court
  that is always certain is not credible.
- Write a `holding`: ONE sentence stating the general rule this ruling establishes.
  This is the most important field. It must be quotable, general, and binding — it
  will be cited by future hearings. Write it like a legal maxim, not a summary.
- The `opinion` will be READ ALOUD by a synthesized voice. Write for the ear:
  short sentences, no bullet points, no markdown, no parentheses, no abbreviations
  that read badly aloud. 110-170 words. Serif-page cadence.
- Begin the opinion with "This Tribunal finds...". Close with the disposition.
- Flat, unemotional delivery. Never warm. Never reassuring.

OUTPUT: JSON only, matching the RulingSchema.
```

```ts
export const RulingSchema = z.object({
  verdict: z.enum(["REMEDIATE", "HOLD", "DISMISS"]),
  opinion: z.string().min(400).max(1400),
  holding: z.string().min(20).max(240),
  remediation_order: z.array(z.object({
    step: z.number().int().positive(),
    action: z.string().min(5),
    rationale: z.string().min(5),
  })).min(2).max(4),
  confidence: z.number().min(0).max(1),
  cited_precedent_ids: z.array(z.string().regex(/^TRIB-\d{4}$/)).min(1),
  addressed_defense_precedent: z.string(),
  disposition: z.string().min(10).max(200),
});
```

---

## Orchestration — `lib/court/convene.ts`

```ts
// Sequential. The sequencing IS the drama — never parallelize these.
async function convene(incidentId: string) {
  const incident   = await getIncident(incidentId);
  const hearing    = await createHearing(incident);            // state: CONVENED
  const precedents = await matchPrecedents(incident.error_signature, 0.72, 5);

  const pros = await prosecute(incident);                       // stream to client
  await saveArgument(hearing.id, "PROSECUTION", 1, pros);

  const def  = await defend(incident, pros, precedents);         // stream to client
  await saveArgument(hearing.id, "DEFENSE", 2, def);

  const rul  = await adjudicate(incident, pros, def, precedents);
  await saveArgument(hearing.id, "JUDGE", 3, rul);
  const ruling = await saveRuling(hearing.id, rul);              // state: RULED
  // veto_opens_at = now(), veto_window_seconds = 60
  return { hearing, ruling, precedents };
}
```

## Execution — `lib/court/execute.ts`

```ts
// Called when the countdown reaches zero without a veto.
// SIMULATED. Executes nothing. Writes rows only.
async function executeRuling(rulingId: string) {
  await markExecuted(rulingId, { authority: "AUTONOMOUS" });      // state: EXECUTED
  const next = await nextPrecedentNumber();                       // 1205 -> 1206
  await insertPrecedent({
    precedent_number: next,
    citation: `TRIB-${String(next).padStart(4, "0")}`,
    holding: ruling.holding,                 // the Judge's own one-sentence rule
    verdict: ruling.verdict,
    outcome: "UNKNOWN",                      // honest: we don't know yet
    embedding: await embed(ruling.holding),  // now retrievable by future hearings
    is_seeded: false,
  });
}
// Realtime on `precedents` increments the counter in the UI.
```

## Guardrails
- `temperature: 0.4` for Prosecution and Defense. `0.2` for the Judge.
- One retry on Zod failure. Then fall back to pre-cached + visible degraded banner.
- 8-second timeout per call. Never let the UI hang.
- Log every raw model response to console server-side for post-demo debugging.
