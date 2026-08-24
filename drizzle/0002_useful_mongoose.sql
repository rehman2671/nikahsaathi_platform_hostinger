CREATE TABLE `blocked_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(255) NOT NULL,
	`reason` text,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'high',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blocked_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocked_domains_domain_unique` UNIQUE(`domain`)
);
