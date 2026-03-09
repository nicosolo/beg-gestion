CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer,
	`userEmail` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entityId` integer,
	`meta` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_logs_user_idx` ON `audit_logs` (`userId`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`invoiceNumber` text,
	`reference` text,
	`type` text DEFAULT 'invoice' NOT NULL,
	`billingMode` text DEFAULT 'accordingToData' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`issueDate` integer NOT NULL,
	`dueDate` integer,
	`periodStart` integer NOT NULL,
	`periodEnd` integer NOT NULL,
	`period` text,
	`clientAddress` text,
	`recipientAddress` text,
	`description` text,
	`note` text,
	`invoiceDocument` text,
	`visaByUserId` integer,
	`visaBy` text,
	`visaDate` integer,
	`inChargeUserId` integer,
	`legacyInvoicePath` text,
	`feesBase` real DEFAULT 0 NOT NULL,
	`feesAdjusted` real DEFAULT 0 NOT NULL,
	`feesTotal` real DEFAULT 0 NOT NULL,
	`feesOthers` real DEFAULT 0 NOT NULL,
	`feesFinalTotal` real DEFAULT 0 NOT NULL,
	`feesMultiplicationFactor` real DEFAULT 1 NOT NULL,
	`feesDiscountPercentage` real,
	`feesDiscountAmount` real,
	`expensesTravelBase` real DEFAULT 0 NOT NULL,
	`expensesTravelAdjusted` real DEFAULT 0 NOT NULL,
	`expensesTravelRate` real DEFAULT 0.7 NOT NULL,
	`expensesTravelAmount` real DEFAULT 0 NOT NULL,
	`expensesOtherBase` real DEFAULT 0 NOT NULL,
	`expensesOtherAmount` real DEFAULT 0 NOT NULL,
	`expensesThirdPartyAmount` real DEFAULT 0 NOT NULL,
	`expensesPackagePercentage` real,
	`expensesPackageAmount` real,
	`expensesTotalExpenses` real DEFAULT 0 NOT NULL,
	`totalHT` real DEFAULT 0 NOT NULL,
	`vatRate` real DEFAULT 8 NOT NULL,
	`vatAmount` real DEFAULT 0 NOT NULL,
	`totalTTC` real DEFAULT 0 NOT NULL,
	`otherServices` text DEFAULT '',
	`remarksOtherServices` text DEFAULT '',
	`remarksTravelExpenses` text DEFAULT '',
	`remarksExpenses` text DEFAULT '',
	`remarksThirdPartyExpenses` text DEFAULT '',
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`visaByUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`inChargeUserId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_invoices`("id", "projectId", "invoiceNumber", "reference", "type", "billingMode", "status", "issueDate", "dueDate", "periodStart", "periodEnd", "period", "clientAddress", "recipientAddress", "description", "note", "invoiceDocument", "visaByUserId", "visaBy", "visaDate", "inChargeUserId", "legacyInvoicePath", "feesBase", "feesAdjusted", "feesTotal", "feesOthers", "feesFinalTotal", "feesMultiplicationFactor", "feesDiscountPercentage", "feesDiscountAmount", "expensesTravelBase", "expensesTravelAdjusted", "expensesTravelRate", "expensesTravelAmount", "expensesOtherBase", "expensesOtherAmount", "expensesThirdPartyAmount", "expensesPackagePercentage", "expensesPackageAmount", "expensesTotalExpenses", "totalHT", "vatRate", "vatAmount", "totalTTC", "otherServices", "remarksOtherServices", "remarksTravelExpenses", "remarksExpenses", "remarksThirdPartyExpenses", "updatedAt", "createdAt") SELECT "id", "projectId", "invoiceNumber", "reference", "type", "billingMode", "status", "issueDate", "dueDate", "periodStart", "periodEnd", "period", "clientAddress", "recipientAddress", "description", "note", "invoiceDocument", "visaByUserId", "visaBy", "visaDate", "inChargeUserId", "legacyInvoicePath", "feesBase", "feesAdjusted", "feesTotal", "feesOthers", "feesFinalTotal", "feesMultiplicationFactor", "feesDiscountPercentage", "feesDiscountAmount", "expensesTravelBase", "expensesTravelAdjusted", "expensesTravelRate", "expensesTravelAmount", "expensesOtherBase", "expensesOtherAmount", "expensesThirdPartyAmount", "expensesPackagePercentage", "expensesPackageAmount", "expensesTotalExpenses", "totalHT", "vatRate", "vatAmount", "totalTTC", "otherServices", "remarksOtherServices", "remarksTravelExpenses", "remarksExpenses", "remarksThirdPartyExpenses", "updatedAt", "createdAt" FROM `invoices`;--> statement-breakpoint
DROP TABLE `invoices`;--> statement-breakpoint
ALTER TABLE `__new_invoices` RENAME TO `invoices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `invoices_invoice_number_idx` ON `invoices` (`invoiceNumber`);--> statement-breakpoint
CREATE INDEX `invoices_project_idx` ON `invoices` (`projectId`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `invoices_issue_date_idx` ON `invoices` (`issueDate`);--> statement-breakpoint
CREATE INDEX `invoices_project_status_idx` ON `invoices` (`projectId`,`status`);