ALTER TABLE `user_subscriptions` ADD `activeKey` varchar(64);--> statement-breakpoint
ALTER TABLE `user_subscriptions` ADD CONSTRAINT `user_subscriptions_activeKey_unique` UNIQUE(`activeKey`);