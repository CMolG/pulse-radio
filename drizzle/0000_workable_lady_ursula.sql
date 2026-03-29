CREATE TABLE `artist_info_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`ttl_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concerts_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`ttl_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `itunes_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`ttl_ms` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lyrics_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL,
	`ttl_ms` integer NOT NULL
);
