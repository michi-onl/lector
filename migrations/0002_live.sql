CREATE TABLE `live_answer` (
	`session_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`round` integer NOT NULL,
	`question` integer NOT NULL,
	`choice` integer,
	`correct` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `participant_id`, `round`, `question`),
	FOREIGN KEY (`session_id`) REFERENCES `live_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `live_participant` (
	`session_id` text NOT NULL,
	`participant_id` text NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `participant_id`),
	FOREIGN KEY (`session_id`) REFERENCES `live_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `live_session` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`host_id` text NOT NULL,
	`rounds` text NOT NULL,
	`round` integer DEFAULT 0 NOT NULL,
	`phase` text DEFAULT 'lobby' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_session_code_unique` ON `live_session` (`code`);--> statement-breakpoint
CREATE INDEX `live_session_host_idx` ON `live_session` (`host_id`);