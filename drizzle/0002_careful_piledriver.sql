CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event` text NOT NULL,
	`properties` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `now_playing` (
	`station_uuid` text PRIMARY KEY NOT NULL,
	`station_name` text NOT NULL,
	`stream_title` text NOT NULL,
	`detected_at` integer NOT NULL,
	`country` text,
	`genre` text
);
--> statement-breakpoint
CREATE TABLE `station_plays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`station_uuid` text NOT NULL,
	`station_name` text NOT NULL,
	`station_url` text NOT NULL,
	`station_favicon` text,
	`station_country` text,
	`station_countrycode` text,
	`station_tags` text,
	`station_codec` text,
	`station_bitrate` integer,
	`played_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_data` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);