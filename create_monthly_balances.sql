CREATE TABLE IF NOT EXISTS `monthlyBalances` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `userId` int NOT NULL,
  `accountId` int NOT NULL,
  `month` int NOT NULL,
  `year` int NOT NULL,
  `initialBalance` decimal(12,2) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_monthly_balance` (`userId`, `accountId`, `month`, `year`)
);
