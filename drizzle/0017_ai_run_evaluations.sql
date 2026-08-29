CREATE TABLE `aiRunEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`runId` int NOT NULL,
	`rubric` varchar(160) NOT NULL,
	`score` int NOT NULL,
	`verdict` enum('pass','fail','needs_review') NOT NULL,
	`notes` text NOT NULL,
	`evaluatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiRunEvaluations_id` PRIMARY KEY(`id`),
	CONSTRAINT `ai_run_evaluation_rubric_uq` UNIQUE(`runId`,`rubric`)
);
--> statement-breakpoint
CREATE INDEX `ai_evaluation_workspace_created_idx` ON `aiRunEvaluations` (`workspaceId`,`createdAt`);