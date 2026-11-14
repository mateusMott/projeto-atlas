CREATE TABLE `atlas_characters` (
	`id` varchar(128) NOT NULL,
	`name` text NOT NULL,
	`tier` varchar(32) NOT NULL,
	`universe` text NOT NULL,
	`image` text NOT NULL,
	`ranked` boolean NOT NULL DEFAULT false,
	`aliases` json NOT NULL,
	`profile` json NOT NULL,
	`payload` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atlas_characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atlas_research_pairs` (
	`pairKey` varchar(257) NOT NULL,
	`firstId` varchar(128) NOT NULL,
	`secondId` varchar(128) NOT NULL,
	`status` enum('favored','inconclusive') NOT NULL,
	`winnerId` varchar(128),
	`isStale` boolean NOT NULL DEFAULT false,
	`specific` boolean NOT NULL DEFAULT false,
	`payload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atlas_research_pairs_pairKey` PRIMARY KEY(`pairKey`)
);
--> statement-breakpoint
CREATE TABLE `atlas_state` (
	`stateKey` varchar(64) NOT NULL,
	`seedVersion` varchar(128) NOT NULL,
	`initializedAt` timestamp,
	`researchPayload` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atlas_state_stateKey` PRIMARY KEY(`stateKey`)
);
--> statement-breakpoint
CREATE INDEX `atlas_research_first_second_idx` ON `atlas_research_pairs` (`firstId`,`secondId`);