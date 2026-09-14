CREATE TABLE `complaintAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`complaintId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`fileName` varchar(180) NOT NULL,
	`contentType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(600) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `complaintAttachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaintAttachments_storageKey_unique` UNIQUE(`storageKey`)
);
