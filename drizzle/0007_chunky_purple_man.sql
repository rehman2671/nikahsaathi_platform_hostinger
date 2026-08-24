CREATE TABLE `review_case_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`evidenceType` varchar(60) NOT NULL,
	`evidenceReference` varchar(1000) NOT NULL,
	`source` varchar(80) NOT NULL DEFAULT 'operations',
	`redactionState` enum('redacted','restricted') NOT NULL DEFAULT 'redacted',
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`addedBy` int,
	CONSTRAINT `review_case_evidence_id` PRIMARY KEY(`id`)
);
