CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` text NOT NULL,
	`status` enum('published','quarantined','blocked') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`communityId` int,
	`body` text NOT NULL,
	`status` enum('draft','published','quarantined','blocked') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `comments_post_status_created_idx` ON `comments` (`postId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `comments_author_created_idx` ON `comments` (`authorId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `posts_community_status_created_idx` ON `posts` (`communityId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `posts_author_created_idx` ON `posts` (`authorId`,`createdAt`);