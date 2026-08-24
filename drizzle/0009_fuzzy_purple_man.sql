CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileStatus` enum('draft','pending_review','active','paused','blocked') NOT NULL DEFAULT 'draft',
	`verificationState` enum('unverified','pending','verified','expired') NOT NULL DEFAULT 'unverified',
	`displayName` varchar(160),
	`introduction` text,
	`religion` varchar(80),
	`country` varchar(80),
	`city` varchar(120),
	`profession` varchar(160),
	`education` varchar(200),
	`languages` varchar(255),
	`marriageExpectations` text,
	`ownerConsent` text,
	`ownerPrivacy` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `profiles_status_country_religion_idx` ON `profiles` (`profileStatus`,`country`,`religion`,`updatedAt`);