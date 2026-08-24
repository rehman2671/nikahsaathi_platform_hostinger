CREATE TABLE `rate_limit_buckets` (
	`bucketKey` varchar(220) NOT NULL,
	`windowStartedAt` bigint NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`expiresAt` bigint NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rate_limit_buckets_bucketKey` PRIMARY KEY(`bucketKey`)
);
--> statement-breakpoint
CREATE INDEX `rate_limit_buckets_expires_idx` ON `rate_limit_buckets` (`expiresAt`);