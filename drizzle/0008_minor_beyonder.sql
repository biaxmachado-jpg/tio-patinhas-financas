ALTER TABLE `categories` MODIFY COLUMN `type` enum('income','expense') NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` MODIFY COLUMN `type` enum('income','expense') NOT NULL;