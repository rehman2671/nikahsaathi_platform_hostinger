ALTER TABLE `community_memberships` ADD CONSTRAINT `community_memberships_community_user_unique` UNIQUE(`communityId`,`userId`);--> statement-breakpoint
ALTER TABLE `community_moderators` ADD CONSTRAINT `community_moderators_community_user_unique` UNIQUE(`communityId`,`userId`);--> statement-breakpoint
ALTER TABLE `plan_entitlements` ADD CONSTRAINT `plan_entitlements_plan_key_unique` UNIQUE(`planId`,`key`);--> statement-breakpoint
CREATE INDEX `community_memberships_community_status_idx` ON `community_memberships` (`communityId`,`status`);--> statement-breakpoint
CREATE INDEX `community_moderators_community_active_idx` ON `community_moderators` (`communityId`,`isActive`);--> statement-breakpoint
CREATE INDEX `review_cases_type_status_severity_idx` ON `review_cases` (`caseType`,`status`,`severity`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `user_subscriptions_user_status_idx` ON `user_subscriptions` (`userId`,`status`,`createdAt`);