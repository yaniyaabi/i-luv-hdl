CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`space` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`name` text NOT NULL,
	`drink` text NOT NULL,
	`seen` integer NOT NULL
);
