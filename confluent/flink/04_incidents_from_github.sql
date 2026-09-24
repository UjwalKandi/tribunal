-- TRIBUNAL — connector intake: GitHub issues → tribunal.incidents.
--
-- The fully managed GitHub Source connector writes raw issue records to
-- `github-issues`. This statement keeps the ones that look like failures and
-- reshapes them into the incident contract (lib/stream/topics.ts). The app
-- puts the newest five on the docket, ready to be convened as live hearings.
--
-- Column names below come from the schema the connector registered. If the
-- statement is rejected, run `DESCRIBE `github-issues`;` and adjust ONLY the
-- inner SELECT ("map connector columns"); everything else is stable.
--
-- Long-running statement. Leave it RUNNING.

INSERT INTO `tribunal.incidents`
  (incident_id, case_number, title, service, severity, raw_log, error_signature, source_url, occurred_at)
SELECT
  UUID(),
  CONCAT('GH-', CAST(num AS STRING)),
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
  CAST(created_at AS STRING)
FROM (
  -- ── map connector columns ────────────────────────────────────────────
  -- The GitHub Source connector wraps each issue as
  -- { type, createdAt (epoch ms), id, data: { number, title, body, html_url, ... } }.
  SELECT
    `data`.`number`                                AS num,
    `data`.`title`                                 AS title,
    `data`.`body`                                  AS body,
    `data`.`html_url`                              AS url,
    TO_TIMESTAMP_LTZ(`createdAt`, 3)               AS created_at
  FROM `github-issues`
  -- Every output column is NOT NULL; drop records missing the essentials.
  WHERE `data`.`number` IS NOT NULL
    AND `data`.`title` IS NOT NULL
    AND `data`.`html_url` IS NOT NULL
    AND `createdAt` IS NOT NULL
  -- ─────────────────────────────────────────────────────────────────────
)
WHERE LOWER(title) LIKE '%fail%'
   OR LOWER(title) LIKE '%error%'
   OR LOWER(title) LIKE '%bug%'
   OR LOWER(title) LIKE '%regression%'
   OR LOWER(title) LIKE '%broken%';
