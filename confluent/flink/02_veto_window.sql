-- TRIBUNAL — the human veto window, enforced by the stream.
--
-- A ruling executes under AUTONOMOUS authority if and only if no veto for the
-- same arming (ruling_id + opened_at) lands within 10 seconds of the window
-- opening. The LEFT interval join emits the unmatched row once the watermark
-- passes opened + 10s; that row is the execution order.
--
-- The app never decides this itself when TRIBUNAL_EXECUTOR=flink. It waits
-- for the row on tribunal.executions (app/api/execute/route.ts).
--
-- Tables are joined directly, not through SELECT * subqueries: `$rowtime` is
-- a system column and does not survive a SELECT *. The v.kind filter sits in
-- ON so an unmatched ruling still comes out of the LEFT JOIN.
--
-- Long-running statement. Leave it RUNNING for the whole demo.

INSERT INTO `tribunal.executions`
  (ruling_id, hearing_id, incident_id, verdict, holding, opened_at, authority, decided_by)
SELECT
  r.ruling_id,
  r.hearing_id,
  r.incident_id,
  r.verdict,
  r.holding,
  r.opened_at,
  'AUTONOMOUS',
  'flink:veto_window'
FROM `tribunal.rulings` AS r
LEFT JOIN `tribunal.vetoes` AS v
  ON  r.ruling_id = v.ruling_id
  AND r.opened_at = v.opened_at
  AND v.kind = 'event'
  AND v.`$rowtime` BETWEEN r.`$rowtime` AND r.`$rowtime` + INTERVAL '10' SECOND
WHERE r.kind = 'event'
  AND v.ruling_id IS NULL;
