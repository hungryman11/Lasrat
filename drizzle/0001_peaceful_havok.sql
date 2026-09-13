CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(32) NOT NULL,
	`submittedByUserId` int NOT NULL,
	`category` enum('service_quality','access','safety','billing','other') NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`subject` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`status` enum('new','in_review','assigned','awaiting_response','resolved','closed') NOT NULL DEFAULT 'new',
	`assignedToUserId` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaints_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','staff','admin') NOT NULL DEFAULT 'user';