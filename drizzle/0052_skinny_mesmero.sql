ALTER TABLE `findings`
  ADD `sourceObservationId` int;
--> statement-breakpoint
CREATE INDEX `findings_source_observation_idx` ON `findings` (`sourceObservationId`);
