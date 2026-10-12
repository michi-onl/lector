CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `calibration` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `calibration_user_idx` ON `calibration` (`user_id`);--> statement-breakpoint
CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`format` text NOT NULL,
	`file_name` text,
	`source_url` text,
	`language` text,
	`byte_length` integer,
	`sha256` text,
	`source_key` text,
	`model_key` text NOT NULL,
	`analyzer_version` text NOT NULL,
	`word_count` integer NOT NULL,
	`unit_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_opened_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `document_user_opened_idx` ON `document` (`user_id`,`last_opened_at`);--> statement-breakpoint
CREATE TABLE `measurement` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`calibration_id` text,
	`document_id` text,
	`text_id` text,
	`wpm` integer NOT NULL,
	`correct` integer NOT NULL,
	`answered` integer NOT NULL,
	`skipped` integer DEFAULT 0 NOT NULL,
	`depth` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`calibration_id`) REFERENCES `calibration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "measurement_counts_check" CHECK("measurement"."correct" >= 0 and "measurement"."correct" <= "measurement"."answered" and "measurement"."skipped" >= 0)
);
--> statement-breakpoint
CREATE INDEX `measurement_user_created_idx` ON `measurement` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `measurement_calibration_idx` ON `measurement` (`calibration_id`);--> statement-breakpoint
CREATE TABLE `progress` (
	`document_id` text PRIMARY KEY NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`max_position` integer DEFAULT 0 NOT NULL,
	`word_ms` integer DEFAULT 0 NOT NULL,
	`word_presentations` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "progress_position_check" CHECK("progress"."position" >= 0 and "progress"."max_position" >= 0)
);
--> statement-breakpoint
CREATE TABLE `reading_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`calibration_id` text,
	`target_wpm` integer,
	`comprehension` real,
	`confidence` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`calibration_id`) REFERENCES `calibration`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `reading_profile_user_created_idx` ON `reading_profile` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `reading_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`target_wpm` integer DEFAULT 240 NOT NULL,
	`adaptive` integer DEFAULT true NOT NULL,
	`chunk_size` integer DEFAULT 1 NOT NULL,
	`font` text DEFAULT 'sans' NOT NULL,
	`font_size_px` integer DEFAULT 48 NOT NULL,
	`background` text DEFAULT 'cream' NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reading_settings_wpm_check" CHECK("reading_settings"."target_wpm" > 0),
	CONSTRAINT "reading_settings_chunk_check" CHECK("reading_settings"."chunk_size" between 1 and 3)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);