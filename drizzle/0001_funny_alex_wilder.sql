CREATE TABLE `agent_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentType` varchar(80) NOT NULL,
	`caseId` int,
	`recommendation` varchar(80) NOT NULL,
	`confidence` varchar(20) NOT NULL,
	`modelVersion` varchar(80),
	`requiresHuman` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_decisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorType` varchar(40) NOT NULL,
	`actorId` int,
	`action` varchar(120) NOT NULL,
	`resourceType` varchar(80) NOT NULL,
	`resourceId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`categoryType` enum('official','religion','country') NOT NULL,
	`status` enum('coming_soon','active','archived') NOT NULL DEFAULT 'coming_soon',
	`description` text,
	`eligibility` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`communityId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('active','left','restricted') NOT NULL DEFAULT 'active',
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	CONSTRAINT `community_memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `community_moderators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`communityId` int NOT NULL,
	`userId` int NOT NULL,
	`assignedBy` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `community_moderators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `human_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`reviewerId` int,
	`decision` varchar(60),
	`reasonCode` varchar(80),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `human_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `incident_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`incidentType` varchar(80) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'high',
	`status` enum('open','contained','resolved','postmortem') NOT NULL DEFAULT 'open',
	`ownerId` int,
	`summary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `incident_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`key` varchar(120) NOT NULL,
	`value` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_entitlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profile_field_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fieldKey` varchar(120) NOT NULL,
	`freeAccess` boolean NOT NULL DEFAULT false,
	`basicAccess` boolean NOT NULL DEFAULT false,
	`advancedAccess` boolean NOT NULL DEFAULT false,
	`requiresOwnerConsent` boolean NOT NULL DEFAULT true,
	`isSensitive` boolean NOT NULL DEFAULT false,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profile_field_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `profile_field_policies_fieldKey_unique` UNIQUE(`fieldKey`)
);
--> statement-breakpoint
CREATE TABLE `review_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseType` enum('moderation','verification','support','incident','agent_review') NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`status` enum('open','assigned','escalated','resolved','appealed') NOT NULL DEFAULT 'open',
	`subjectType` varchar(40),
	`subjectId` int,
	`summary` text NOT NULL,
	`assignedTo` int,
	`source` varchar(40) NOT NULL DEFAULT 'system',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safety_rule_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ruleId` int NOT NULL,
	`version` int NOT NULL,
	`pattern` text NOT NULL,
	`action` varchar(40) NOT NULL,
	`changedBy` int,
	`changeReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `safety_rule_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safety_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`ruleType` enum('bad_word','phone_number','link_domain','spam','personal_data','threat','scam') NOT NULL,
	`pattern` text NOT NULL,
	`scope` varchar(120) NOT NULL DEFAULT 'posts,comments,messages,profiles',
	`language` varchar(32) NOT NULL DEFAULT 'all',
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`action` enum('allow','warn','mask','replace','block','quarantine','rate_limit','create_case','escalate_human') NOT NULL DEFAULT 'block',
	`version` int NOT NULL DEFAULT 1,
	`isActive` boolean NOT NULL DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safety_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(80) NOT NULL,
	`status` enum('open','assigned','waiting','resolved') NOT NULL DEFAULT 'open',
	`priority` enum('normal','high','urgent') NOT NULL DEFAULT 'normal',
	`summary` text NOT NULL,
	`assignedTo` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
