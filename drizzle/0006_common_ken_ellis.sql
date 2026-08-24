CREATE TABLE `verification_review_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`resubmissionReason` text,
	`fallbackProvider` varchar(120),
	`fallbackOutcome` text,
	`appealNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_review_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_review_details_caseId_unique` UNIQUE(`caseId`)
);
