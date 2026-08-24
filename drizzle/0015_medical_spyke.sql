CREATE TABLE `profile_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`mediaAssetId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profile_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `profile_photos_profile_media_unique` UNIQUE(`profileId`,`mediaAssetId`)
);
--> statement-breakpoint
ALTER TABLE `matches` ADD `requestedBy` int NOT NULL;--> statement-breakpoint
ALTER TABLE `profile_photos` ADD CONSTRAINT `profile_photos_profileId_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profile_photos` ADD CONSTRAINT `profile_photos_mediaAssetId_media_assets_id_fk` FOREIGN KEY (`mediaAssetId`) REFERENCES `media_assets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `profile_photos_profile_order_idx` ON `profile_photos` (`profileId`,`sortOrder`,`createdAt`);--> statement-breakpoint
ALTER TABLE `matches` ADD CONSTRAINT `matches_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;