CREATE TABLE `station_health` (
	`url` text PRIMARY KEY NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`last_success` integer,
	`last_failure` integer,
	`avg_response_ms` integer
);
