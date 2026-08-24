CREATE TABLE `telegram_message_outbox` (
	`id` int AUTO_INCREMENT NOT NULL,
	`updateId` varchar(64) NOT NULL,
	`chatId` varchar(64) NOT NULL,
	`text` text NOT NULL,
	`status` enum('pending','sending','sent','failed','dead_letter') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`nextAttemptAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_message_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegram_message_outbox_updateId_unique` UNIQUE(`updateId`)
);
--> statement-breakpoint
CREATE INDEX `telegram_outbox_status_next_attempt_idx` ON `telegram_message_outbox` (`status`,`nextAttemptAt`);