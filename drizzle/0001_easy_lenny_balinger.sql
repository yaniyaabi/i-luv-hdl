CREATE TABLE `cafe_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`item` integer NOT NULL,
	`bean` text NOT NULL,
	`task` text NOT NULL,
	`seconds` integer NOT NULL,
	`started` integer NOT NULL,
	`updated` integer NOT NULL
);
