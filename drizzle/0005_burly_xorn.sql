CREATE TABLE `telegram_update_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`updateId` varchar(64) NOT NULL,
	`operatorId` varchar(64) NOT NULL,
	`command` varchar(160) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_update_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_update_receipts_updateId_unique` UNIQUE(`updateId`)
);
