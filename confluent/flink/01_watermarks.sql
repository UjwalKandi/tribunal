-- TRIBUNAL — run once, before 02_veto_window.sql.
--
-- Confluent's default watermark strategy waits for lots of traffic before it
-- advances. A courtroom sees a handful of events per minute, so pin a strict
-- 1-second bound. The app also emits kind='tick' rows every second while a
-- veto window is open (lib/stream/kafka.ts) so the watermark keeps moving.

ALTER TABLE `tribunal.rulings`    MODIFY WATERMARK FOR `$rowtime` AS `$rowtime` - INTERVAL '1' SECOND;
ALTER TABLE `tribunal.vetoes`     MODIFY WATERMARK FOR `$rowtime` AS `$rowtime` - INTERVAL '1' SECOND;
ALTER TABLE `tribunal.executions` MODIFY WATERMARK FOR `$rowtime` AS `$rowtime` - INTERVAL '1' SECOND;
