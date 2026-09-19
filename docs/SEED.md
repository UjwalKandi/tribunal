# SEED — 11:00–11:40, agent 🅲

The most important 40 minutes of the day. If the incidents look invented, the whole
project reads as theater. Real error text is the entire defense against that.

---

## Targets
| Table | Count | Source |
|---|---|---|
| `incidents` | 4 (hand-curated) | Real GitHub issues, real tracebacks |
| `precedents` | 1,205 | Real issue titles/bodies + synthesized ruling metadata |

## Sources — all public, NO AUTH REQUIRED
```
https://api.github.com/repos/apache/airflow/issues?state=closed&labels=kind:bug&per_page=100
https://api.github.com/repos/dbt-labs/dbt-core/issues?state=closed&labels=bug&per_page=100
https://api.github.com/repos/great-expectations/great_expectations/issues?state=closed&per_page=100
```
Unauthenticated rate limit is 60 req/hr — plenty. Paginate to ~1,205 total.
Cache raw JSON to `scripts/.cache/` so a re-run costs zero requests.

---

## The 4 demo incidents — WRITE THESE BY HAND

Pick real closed issues with genuinely ugly tracebacks. Suggested shape:

| case_number | service | severity | Theme |
|---|---|---|---|
| **CASE-2281** | `metadata-ingest` | P1 | Stale schema cache → downstream silent data loss. **THE PRE-CACHED DEMO CASE.** |
| CASE-3104 | `partner-feed-etl` | P2 | Retry storm amplified a partial write 400× |
| **CASE-4417** | `catalog-publish` | P1 | Upstream contract drift. **THE LIVE CASE — must be able to cite TRIB-1206.** |
| CASE-5002 | `warehouse-compact` | P3 | Partition skew → SLA breach, no data loss |

For each: paste the REAL traceback into `raw_log`, real `source_url`, and write
`error_signature` as a normalized one-liner (strip timestamps, UUIDs, paths, line numbers).

**CASE-4417 must be semantically adjacent to CASE-2281** so that after CASE-2281's
ruling becomes TRIB-1206, the vector search surfaces it for CASE-4417. Verify this
explicitly before freeze — it is the kill shot of the demo.

---

## Precedent generation

For each of the 1,205 issues:

| Field | Source |
|---|---|
| `precedent_number` | 1..1205 |
| `citation` | `TRIB-0001` … `TRIB-1205` (zero-padded to 4) |
| `holding` | **LLM-generated** from the real issue title+body: one general binding rule |
| `summary` | First 400 chars of the real issue body, cleaned |
| `verdict` | Weighted: 62% REMEDIATE, 28% HOLD, 10% DISMISS |
| `outcome` | Weighted: 55% REMEDIATION_SUCCEEDED, **25% REMEDIATION_WORSENED**, 15% HOLD_CORRECT, 5% UNKNOWN |
| `mttr_minutes` | Log-normal, median ~28, tail to 400 |
| `embedding` | `embed(holding + " " + summary)` — stored once, never recomputed |

The 25% `REMEDIATION_WORSENED` rate is deliberate: the Defense agent needs real
ammunition. Without it, hearings are one-sided and boring.

### Batch the holdings
Generate holdings in batches of 25 per LLM call. ~49 calls. If you're behind schedule
at 11:30, **drop to 300 precedents and move on** — the demo cannot tell the difference,
only the counter changes. Update the PRD number if you do.

---

## `scripts/ingest.ts`
```
1. Fetch + cache issues from all 3 repos
2. Filter: body length > 200 chars, has a traceback or error block
3. Normalize → error_signature
4. Generate holdings in batches of 25
5. Embed each holding+summary (batch the embedding calls too)
6. Insert precedents 1..1205
7. Insert the 4 hand-written incidents
8. Verify: SELECT count(*) FROM precedents; → 1205
9. Verify: match_precedents(embed('stale schema cache downstream data loss'), 0.7, 5)
   returns 5 rows with similarity > 0.7
```

## `scripts/precache.ts`
```
1. Run the full convene() flow for CASE-2281
2. Store the 3 arguments + ruling with hearings.state = 'RULED'
3. Set incidents.is_precached = true for CASE-2281
4. TEST: unset the LLM API key. Load /tribunal. Convene CASE-2281.
   It MUST work end to end with zero network calls to any model.
```

**That final test is the gate.** If CASE-2281 can't run with the LLM key removed,
you do not have a safe demo. Do not proceed to polish until it passes.

---

## Provenance — must appear in README
> Incidents and precedents are seeded from real public GitHub issues in
> apache/airflow, dbt-labs/dbt-core, and great-expectations. Error text and tracebacks
> are unmodified. Ruling metadata (verdict, outcome, MTTR) is synthesized for
> demonstration. No remediation is executed — rulings are recorded, never run.

State this plainly. Judges respect disclosed synthesis far more than data that looks fake.
