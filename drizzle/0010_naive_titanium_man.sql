CREATE TABLE `importHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` enum('creditCard','bankAccount') NOT NULL,
	`entityId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileType` varchar(50) NOT NULL,
	`bankDetected` varchar(100),
	`transactionsImported` int NOT NULL DEFAULT 0,
	`duplicatesFound` int NOT NULL DEFAULT 0,
	`duplicatesSkipped` int NOT NULL DEFAULT 0,
	`status` enum('success','partial','failed') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importHistory_id` PRIMARY KEY(`id`)
);
