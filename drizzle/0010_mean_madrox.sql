CREATE TABLE `media_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`storageKey` varchar(1000) NOT NULL,
	`purpose` enum('profile_photo','verification_evidence','incident_evidence','other') NOT NULL,
	`visibility` enum('public','owner_only','restricted') NOT NULL DEFAULT 'owner_only',
	`status` enum('active','deleted','quarantined') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `media_assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `media_assets_storageKey_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE INDEX `media_assets_owner_purpose_status_idx` ON `media_assets` (`ownerUserId`,`purpose`,`status`);