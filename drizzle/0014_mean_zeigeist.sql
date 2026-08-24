CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userAId` int NOT NULL,
	`userBId` int NOT NULL,
	`status` enum('suggested','requested','accepted','rejected','blocked') NOT NULL DEFAULT 'suggested',
	`score` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `matches_pair_unique` UNIQUE(`userAId`,`userBId`)
);
--> statement-breakpoint
CREATE TABLE `user_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerUserId` int NOT NULL,
	`blockedUserId` int NOT NULL,
	`reason` varchar(200),
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `user_blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_blocks_pair_unique` UNIQUE(`blockerUserId`,`blockedUserId`)
);
--> statement-breakpoint
CREATE TABLE `user_interests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`interestKey` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_interests_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_interests_user_interest_unique` UNIQUE(`userId`,`interestKey`)
);
--> statement-breakpoint
CREATE TABLE `user_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterUserId` int NOT NULL,
	`reportedUserId` int NOT NULL,
	`reportType` enum('harassment','scam','impersonation','unsafe_behavior','spam','other') NOT NULL,
	`details` text,
	`status` enum('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
	`reviewCaseId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','approved','rejected','resubmission_required') NOT NULL DEFAULT 'pending',
	`provider` varchar(120) NOT NULL DEFAULT 'manual',
	`evidenceAssetId` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`reviewedBy` int,
	`reviewerNotes` text,
	CONSTRAINT `verification_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_userAId_users_id_fk` FOREIGN KEY (`userAId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_userBId_users_id_fk` FOREIGN KEY (`userBId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_blocks` ADD CONSTRAINT `user_blocks_blockerUserId_users_id_fk` FOREIGN KEY (`blockerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_blocks` ADD CONSTRAINT `user_blocks_blockedUserId_users_id_fk` FOREIGN KEY (`blockedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_interests` ADD CONSTRAINT `user_interests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_reports` ADD CONSTRAINT `user_reports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_reports` ADD CONSTRAINT `user_reports_reportedUserId_users_id_fk` FOREIGN KEY (`reportedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_submissions` ADD CONSTRAINT `verification_submissions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_submissions` ADD CONSTRAINT `verification_submissions_evidenceAssetId_media_assets_id_fk` FOREIGN KEY (`evidenceAssetId`) REFERENCES `media_assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_submissions` ADD CONSTRAINT `verification_submissions_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `matches_user_status_idx` ON `matches` (`userAId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `matches_other_status_idx` ON `matches` (`userBId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `user_blocks_blocker_status_idx` ON `user_blocks` (`blockerUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_blocks_blocked_status_idx` ON `user_blocks` (`blockedUserId`,`status`);--> statement-breakpoint
CREATE INDEX `user_interests_user_created_idx` ON `user_interests` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_reports_reporter_created_idx` ON `user_reports` (`reporterUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `user_reports_reported_status_idx` ON `user_reports` (`reportedUserId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `verification_submissions_user_status_idx` ON `verification_submissions` (`userId`,`status`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `verification_submissions_status_submitted_idx` ON `verification_submissions` (`status`,`submittedAt`);