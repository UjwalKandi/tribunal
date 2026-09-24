import type {
  DefenseOutput,
  Hearing,
  ProsecutionOutput,
  RulingRecord,
} from "@/lib/schemas";
import {
  FIXTURE_DEFENSE,
  FIXTURE_HEARING,
  FIXTURE_PROSECUTION,
  FIXTURE_RULING,
} from "@/fixtures/demo-data";

export interface ArchivedHearing {
  hearing: Hearing;
  prosecution: ProsecutionOutput;
  defense: DefenseOutput;
  ruling: RulingRecord;
}

const IDS = {
  c2281: "a0000001-0000-4000-8000-000000000001",
  c3104: "a0000002-0000-4000-8000-000000000002",
  c4417: "a0000003-0000-4000-8000-000000000003",
  c5002: "a0000004-0000-4000-8000-000000000004",
} as const;

function pack(
  incidentId: string,
  hearingId: string,
  rulingId: string,
  docket: string,
  prosecution: ProsecutionOutput,
  defense: DefenseOutput,
  ruling: Omit<RulingRecord, "id" | "hearing_id" | "veto_opens_at" | "executed_at" | "authority" | "veto_window_seconds">,
): ArchivedHearing {
  return {
    hearing: {
      id: hearingId,
      incident_id: incidentId,
      docket_number: docket,
      convened_at: "2026-03-14T04:00:00Z",
      concluded_at: null,
      state: "RULED",
    },
    prosecution,
    defense,
    ruling: {
      ...ruling,
      id: rulingId,
      hearing_id: hearingId,
      veto_window_seconds: 10,
      veto_opens_at: "2099-01-01T00:00:00.000Z",
      executed_at: null,
      authority: null,
    },
  };
}

const CASE_2281: ArchivedHearing = {
  hearing: FIXTURE_HEARING,
  prosecution: FIXTURE_PROSECUTION,
  defense: FIXTURE_DEFENSE,
  ruling: {
    ...FIXTURE_RULING,
    veto_window_seconds: 10,
    veto_opens_at: "2099-01-01T00:00:00.000Z",
  },
};

const CASE_3104 = pack(
  IDS.c3104,
  "b0000002-0000-4000-8000-000000000002",
  "c0000002-0000-4000-8000-000000000002",
  "DKT-2026-1204",
  {
    respondent: "SerializedDagModel.write_dag first-write race",
    body: "The Prosecution moves to treat the duplicate-key IntegrityError as a scheduler defect, not an import error. Two Dag processors raced on the first INSERT. Evidence: duplicate key value violates unique constraint, and the loser surfaces it to users as an import error. The winning processor already serialized the Dag. Recording the loser as import_errors is false harm visible in the UI for an entire parse cycle.",
    claims: [
      {
        claim: "The IntegrityError is a first-write race, not a malformed Dag.",
        evidence: "duplicate key value violates unique constraint",
      },
      {
        claim: "The failure is shown to operators as an import error.",
        evidence: "surfaces it to users as an import error",
      },
    ],
    harm: "Operators see a red banner on a Dag that is correctly serialized. Subsequent writes hit PendingRollbackError for the rest of the cycle.",
    motion: "Catch unique-constraint IntegrityError, roll back the losing session, and do not record an import error.",
  },
  {
    body: "The Defense concedes the race occurred but opposes rewriting write_dag as an immediate production patch. TRIB-0891 shows broad write-path remediations on partial commits amplified damage. TRIB-0312 warns that halting writes without isolating the race extended outage duration. The narrower remedy is a targeted except IntegrityError arm in _serialize_dag_capturing_errors only.",
    cited_precedents: [
      {
        citation: "TRIB-0891",
        relevance: "Broad remediation on partial writes amplified duplicate damage.",
      },
      {
        citation: "TRIB-0312",
        relevance: "Write halt without isolating the race extended the outage.",
      },
    ],
    theory: "PRECEDENT_HARM",
    alternative:
      "Add a unique-constraint IntegrityError handler that rolls back and returns an empty import-error list. Leave other IntegrityError causes on the existing Exception arm.",
  },
  {
    verdict: "HOLD",
    opinion:
      "This Tribunal finds a first-write race between Dag processors, not a broken Dag file. The Defense citation TRIB-0891 is followed on the facts. A wide patch to the write path is the class of remediation that previously multiplied duplicates. The unique-constraint error is benign when a peer has already committed. Disposition. Hold for a scoped handler. Do not halt Dag processing. Confidence is stated below seven tenths because the race is timing-dependent.",
    holding:
      "Where two processors race on the first insert of a Dag row, a unique-constraint error is not an import failure and must not be recorded as one.",
    remediation_order: [
      {
        step: 1,
        action: "Leave Dag processing running",
        rationale: "The winning writer already serialized the file",
      },
      {
        step: 2,
        action: "Add IntegrityError handling only in _serialize_dag_capturing_errors",
        rationale: "TRIB-0891 forbids a broad write-path rewrite",
      },
      {
        step: 3,
        action: "Roll back the losing session and return no import error",
        rationale: "Matches dialect unique-constraint detection already used in the API layer",
      },
    ],
    confidence: 0.62,
    cited_precedent_ids: ["TRIB-0891", "TRIB-0312"],
  },
);

const CASE_4417 = pack(
  IDS.c4417,
  "b0000003-0000-4000-8000-000000000003",
  "c0000003-0000-4000-8000-000000000003",
  "DKT-2026-1207",
  {
    respondent: "EdgeDBManager.upgradedb stamp-without-migrate",
    body: "The Prosecution moves for a schema repair of edge3 before any further scheduler queries. airflow db migrate reported success and stamped alembic_version_edge3 to head while leaving columns missing. Evidence: column edge_job.team_name does not exist, and Creating EdgeDBManager tables from the ORM followed by stamp_revision with no upgrade chain. Operators had no signal the schema was broken.",
    claims: [
      {
        claim: "Migrate stamped head without running add_column migrations.",
        evidence: "stamped alembic_version_edge3 to head without running migrations",
      },
      {
        claim: "Subsequent queries fail on missing columns.",
        evidence: "column edge_job.team_name does not exist",
      },
    ],
    harm: "Scheduler processes querying edge tables fail after a migrate that exited zero. Silent stale schema.",
    motion: "Stamp edge3 to the base revision and walk the Alembic chain so missing columns are added before resume.",
  },
  {
    body: "The Defense concedes the schema is stale but opposes a global cache flush or full metadata rebuild. TRIB-1024 holds that targeted invalidation of a single schema entry is the correct repair. TRIB-1150 supports diagnostic hold until schema_version is confirmed. If TRIB-1206 is on the docket, this Tribunal is bound by its own rule that a poisoned complete-empty cache must be repaired at that entry, not by a wide flush.",
    cited_precedents: [
      {
        citation: "TRIB-1024",
        relevance: "Targeted cache or schema repair without global flush.",
      },
      {
        citation: "TRIB-1150",
        relevance: "Hold is appropriate until schema_version is confirmed.",
      },
    ],
    theory: "PRECEDENT_HARM",
    alternative:
      "Hold the scheduler off edge tables, stamp alembic_version_edge3 to base, and apply only the missing add_column revisions.",
  },
  {
    verdict: "REMEDIATE",
    opinion:
      "This Tribunal finds a silent schema stamp. Migrate reported done while edge_job.team_name does not exist. TRIB-1024 is followed. The repair is the missing migration chain, not a global rebuild. TRIB-1150 is distinguished. This is not suspected drift. It is a confirmed missing column after a successful-looking migrate. Disposition. Remediate by walking the edge3 revisions. Confidence is high because the smoking-gun migrate lines are in the record.",
    holding:
      "Where a migrate command stamps a schema to head without running add-column revisions, remediation must apply the skipped chain before any process reads those tables.",
    remediation_order: [
      {
        step: 1,
        action: "Stop scheduler queries against edge_job and edge_worker",
        rationale: "UndefinedColumn will repeat until columns exist",
      },
      {
        step: 2,
        action: "Stamp alembic_version_edge3 to base and walk the chain to head",
        rationale: "That path already exists in EdgeDBManager.initdb",
      },
      {
        step: 3,
        action: "Verify team_name and concurrency columns before resume",
        rationale: "TRIB-1024 requires a targeted verification, not a global flush",
      },
    ],
    confidence: 0.83,
    cited_precedent_ids: ["TRIB-1024", "TRIB-1150"],
  },
);

const CASE_5002 = pack(
  IDS.c5002,
  "b0000004-0000-4000-8000-000000000004",
  "c0000004-0000-4000-8000-000000000004",
  "DKT-2026-1202",
  {
    respondent: "KubernetesPodOperator.trigger_reentry unguarded get_pod",
    body: "The Prosecution moves to treat completed tasks as failed when the pod is garbage-collected before re-entry. Evidence: ApiException 404 pods not found, then AttributeError NoneType has no attribute metadata. The trigger had already emitted status success. Marking that task failed and retrying is the harm.",
    claims: [
      {
        claim: "trigger_reentry crashes on 404 after the pod completed.",
        evidence: "ApiException: (404)",
      },
      {
        claim: "A successful pod is marked failed.",
        evidence: "a task whose pod actually completed successfully is marked failed and retried",
      },
    ],
    harm: "Successful work is retried. SLA noise. Cluster churn from unnecessary reruns.",
    motion: "Catch ApiException 404 in trigger_reentry and return success when the trigger event was success.",
  },
  {
    body: "The Defense concedes the 404 but opposes a cluster-wide change to garbage collection. TRIB-1150 supports hold and diagnosis when the write path is uncertain. The operator already intends to raise PodNotFoundException. The defect is uncaught ApiException, not the GC policy. Do not disable deferrable mode.",
    cited_precedents: [
      {
        citation: "TRIB-1150",
        relevance: "Diagnostic hold is correct when the failure is a resume path, not data loss.",
      },
      {
        citation: "TRIB-1024",
        relevance: "Scope the fix to the failing call, not the whole platform.",
      },
    ],
    theory: "UPSTREAM_CAUSE",
    alternative:
      "Wrap get_pod in trigger_reentry. On 404 plus trigger success, log and return. On 404 plus non-success, raise PodNotFoundException. Leave cluster GC unchanged.",
  },
  {
    verdict: "REMEDIATE",
    opinion:
      "This Tribunal finds an unguarded get_pod after successful deferral. The pod completed. The cluster reclaimed it. The worker then failed the task. TRIB-1150 is distinguished. This is not unknown drift. The traceback is specific. TRIB-1024 is followed. Patch the single call. Do not change cluster garbage collection. Disposition. Remediate the operator resume path. Confidence is moderate because provider versions differ in _clean.",
    holding:
      "Where a deferrable pod operator resumes after a successful trigger and the pod has been reclaimed, a 404 must not convert a completed task into a failure.",
    remediation_order: [
      {
        step: 1,
        action: "Catch ApiException 404 around get_pod in trigger_reentry",
        rationale: "The existing if not self.pod branch is dead code",
      },
      {
        step: 2,
        action: "If the trigger event is success, log and return",
        rationale: "The work finished. Retrying is the harm.",
      },
      {
        step: 3,
        action: "If the trigger event is not success, raise PodNotFoundException",
        rationale: "Preserves the author's original intent without a cluster policy change",
      },
    ],
    confidence: 0.71,
    cited_precedent_ids: ["TRIB-1024", "TRIB-1150"],
  },
);

export const ARCHIVED_HEARINGS: Record<string, ArchivedHearing> = {
  [IDS.c2281]: CASE_2281,
  [IDS.c3104]: CASE_3104,
  [IDS.c4417]: CASE_4417,
  [IDS.c5002]: CASE_5002,
};

export function archivedHearingFor(incidentId: string): ArchivedHearing | null {
  return ARCHIVED_HEARINGS[incidentId] ?? null;
}

export function archivedHearingByRulingId(rulingId: string): ArchivedHearing | null {
  return Object.values(ARCHIVED_HEARINGS).find((row) => row.ruling.id === rulingId) ?? null;
}

export function archivedHearingByHearingId(hearingId: string): ArchivedHearing | null {
  return Object.values(ARCHIVED_HEARINGS).find((row) => row.hearing.id === hearingId) ?? null;
}
