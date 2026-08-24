ALTER TABLE `telegram_update_receipts` MODIFY COLUMN `processedAt` timestamp;--> statement-breakpoint
ALTER TABLE `telegram_update_receipts` ADD `status` enum('received','processing','processed','failed','dead_letter') DEFAULT 'received' NOT NULL;--> statement-breakpoint
ALTER TABLE `telegram_update_receipts` ADD `attempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `telegram_update_receipts` ADD `lastError` text;--> statement-breakpoint
ALTER TABLE `telegram_update_receipts` ADD `nextAttemptAt` timestamp;