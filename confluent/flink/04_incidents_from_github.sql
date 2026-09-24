-- TRIBUNAL — connector intake: GitHub issues → tribunal.incidents.
--
-- The fully managed GitHub Source connector writes raw issue records as plain
-- JSON to `github-raw-issues`. This statement keeps the ones that look like
-- failures and reshapes them into the incident contract (lib/stream/topics.ts),
-- which IS governed by Schema Registry. The app puts the newest five on the
-- docket, ready to be convened as live hearings.
--
-- Why plain JSON on the way in: GitHub issues vary in shape, so with JSON_SR
-- the connector registers a new schema version whenever a field changes type,
-- and Flink (which reads a topic with one schema) fails on the older records.
-- A schemaless topic appears in Flink as a raw `val` column; JSON_VALUE picks
-- out only the five fields TRIBUNAL needs, so the rest can change freely.
--
-- `j` unwraps a {"schema":…, "payload":…} envelope if the connector adds one.
--
-- Long-running statement. Leave it RUNNING.

INSERT INTO `tribunal.incidents`
  (incident_id, case_number, title, service, severity, raw_log, error_signature, source_url, occurred_at)
SELECT
  UUID(),
  CONCAT('GH-', num),
  title,
  CASE WHEN url LIKE '%dbt-labs%' THEN 'dbt' ELSE 'airflow' END,
  CASE
    WHEN LOWER(title) LIKE '%data loss%' OR LOWER(title) LIKE '%regression%' THEN 'P1'
    WHEN LOWER(title) LIKE '%fail%'      OR LOWER(title) LIKE '%error%'      THEN 'P2'
    ELSE 'P3'
  END,
  SUBSTRING(COALESCE(body, title), 1, 2000),
  LOWER(REGEXP_REPLACE(title, '[^A-Za-z0-9 ]', ' ')),
  url,
  CAST(COALESCE(TO_TIMESTAMP_LTZ(created_ms, 3), rt) AS STRING)
FROM (
  SELECT
    JSON_VALUE(j, '$.data.number')                     AS num,
    JSON_VALUE(j, '$.data.title')                      AS title,
    JSON_VALUE(j, '$.data.body')                       AS body,
    JSON_VALUE(j, '$.data.html_url')                   AS url,
    TRY_CAST(JSON_VALUE(j, '$.createdAt') AS BIGINT)   AS created_ms,
    rt
  FROM (
    SELECT
      COALESCE(JSON_QUERY(record_json, '$.payload'), record_json) AS j,
      rt
    FROM (
      SELECT MAKE_VALID_UTF8(`val`) AS record_json, `$rowtime` AS rt
      FROM `github-raw-issues`
    )
  )
)
-- Every output column is NOT NULL; drop records missing the essentials.
WHERE num IS NOT NULL
  AND title IS NOT NULL
  AND url IS NOT NULL
  AND (   LOWER(title) LIKE '%fail%'
       OR LOWER(title) LIKE '%error%'
       OR LOWER(title) LIKE '%bug%'
       OR LOWER(title) LIKE '%regression%'
       OR LOWER(title) LIKE '%broken%');
