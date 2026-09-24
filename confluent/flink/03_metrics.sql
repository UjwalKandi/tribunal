-- TRIBUNAL — the court record, one row per minute.
--
-- How many production decisions the machine made, how many a human
-- overruled, and how many executed and became precedent for the next one.

CREATE TABLE `tribunal.metrics` (
  window_start  TIMESTAMP(3),
  window_end    TIMESTAMP(3),
  rulings       BIGINT,
  vetoes        BIGINT,
  executions    BIGINT
);

CREATE VIEW `tribunal_court_activity` AS
  SELECT 'ruling'    AS src, `$rowtime` AS ts FROM `tribunal.rulings`    WHERE kind = 'event'
  UNION ALL
  SELECT 'veto'      AS src, `$rowtime` AS ts FROM `tribunal.vetoes`     WHERE kind = 'event'
  UNION ALL
  SELECT 'execution' AS src, `$rowtime` AS ts FROM `tribunal.executions`;

INSERT INTO `tribunal.metrics`
SELECT
  window_start,
  window_end,
  COUNT(*) FILTER (WHERE src = 'ruling')    AS rulings,
  COUNT(*) FILTER (WHERE src = 'veto')      AS vetoes,
  COUNT(*) FILTER (WHERE src = 'execution') AS executions
FROM TABLE(TUMBLE(TABLE `tribunal_court_activity`, DESCRIPTOR(ts), INTERVAL '1' MINUTE))
GROUP BY window_start, window_end;
