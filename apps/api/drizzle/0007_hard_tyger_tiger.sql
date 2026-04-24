CREATE TABLE `collaborator_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `groupId` integer REFERENCES collaborator_groups(id);--> statement-breakpoint
CREATE INDEX `users_group_idx` ON `users` (`groupId`);