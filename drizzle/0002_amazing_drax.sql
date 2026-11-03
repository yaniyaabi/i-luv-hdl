CREATE TABLE `room_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`kind` text NOT NULL,
	`sender` text NOT NULL,
	`sender_name` text NOT NULL,
	`sender_owner` text NOT NULL,
	`recipient` text NOT NULL,
	`recipient_name` text NOT NULL,
	`recipient_owner` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `visitors` ADD `owner` text;