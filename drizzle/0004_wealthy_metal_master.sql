ALTER TABLE `support_tickets` MODIFY COLUMN `status` enum('open','assigned','waiting','escalated','resolved') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `agent_decisions` ADD `persistedToReview` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incident_records` ADD `isFrozen` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `incident_records` ADD `evidenceReference` text;--> statement-breakpoint
ALTER TABLE `incident_records` ADD `escalationReason` varchar(200);--> statement-breakpoint
ALTER TABLE `support_tickets` ADD `slaDueAt` timestamp;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD `escalationReason` varchar(200);