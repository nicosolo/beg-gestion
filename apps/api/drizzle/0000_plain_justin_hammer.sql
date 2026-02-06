CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`date` integer NOT NULL,
	`duration` real NOT NULL,
	`kilometers` real NOT NULL,
	`expenses` real NOT NULL,
	`rate` real NOT NULL,
	`projectId` integer NOT NULL,
	`activityTypeId` integer NOT NULL,
	`description` text,
	`billed` integer DEFAULT false NOT NULL,
	`invoiceId` integer,
	`disbursement` integer DEFAULT false NOT NULL,
	`rateClass` text,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`activityTypeId`) REFERENCES `activity_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activities_user_project_idx` ON `activities` (`userId`,`projectId`);--> statement-breakpoint
CREATE INDEX `activities_date_idx` ON `activities` (`date`);--> statement-breakpoint
CREATE INDEX `activities_billed_idx` ON `activities` (`billed`);--> statement-breakpoint
CREATE INDEX `activities_project_billed_idx` ON `activities` (`projectId`,`billed`);--> statement-breakpoint
CREATE INDEX `activities_invoice_idx` ON `activities` (`invoiceId`);--> statement-breakpoint
CREATE TABLE `activity_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`billable` integer NOT NULL,
	`adminOnly` integer DEFAULT false NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `engineers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_adjudications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoiceId` integer NOT NULL,
	`file` text DEFAULT '' NOT NULL,
	`date` integer NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`remark` text DEFAULT '',
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_adjudications_invoice_idx` ON `invoice_adjudications` (`invoiceId`);--> statement-breakpoint
CREATE TABLE `invoice_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoiceId` integer NOT NULL,
	`file` text DEFAULT '' NOT NULL,
	`date` integer NOT NULL,
	`remark` text DEFAULT '',
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_documents_invoice_idx` ON `invoice_documents` (`invoiceId`);--> statement-breakpoint
CREATE TABLE `invoice_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoiceId` integer NOT NULL,
	`file` text DEFAULT '' NOT NULL,
	`date` integer NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`remark` text DEFAULT '',
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_offers_invoice_idx` ON `invoice_offers` (`invoiceId`);--> statement-breakpoint
CREATE TABLE `invoice_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoiceId` integer NOT NULL,
	`rateClass` text NOT NULL,
	`baseMinutes` integer DEFAULT 0 NOT NULL,
	`adjustedMinutes` integer DEFAULT 0 NOT NULL,
	`hourlyRate` integer DEFAULT 0 NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_rates_invoice_idx` ON `invoice_rates` (`invoiceId`);--> statement-breakpoint
CREATE TABLE `invoice_situations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoiceId` integer NOT NULL,
	`file` text DEFAULT '' NOT NULL,
	`date` integer NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`remark` text DEFAULT '',
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invoice_situations_invoice_idx` ON `invoice_situations` (`invoiceId`);--> statement-breakpoint
CREATE TABLE `invoices` (
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
	`expensesTravelRate` real DEFAULT 0.65 NOT NULL,
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
CREATE INDEX `invoices_invoice_number_idx` ON `invoices` (`invoiceNumber`);--> statement-breakpoint
CREATE INDEX `invoices_project_idx` ON `invoices` (`projectId`);--> statement-breakpoint
CREATE INDEX `invoices_status_idx` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `invoices_issue_date_idx` ON `invoices` (`issueDate`);--> statement-breakpoint
CREATE INDEX `invoices_project_status_idx` ON `invoices` (`projectId`,`status`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`country` text(2),
	`canton` text(2),
	`region` text,
	`address` text,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `monthly_hours` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`amountOfHours` real NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `monthly_hours_year_month_unique` ON `monthly_hours` (`year`,`month`);--> statement-breakpoint
CREATE TABLE `project_project_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`projectTypeId` integer NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`projectTypeId`) REFERENCES `project_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_project_types_unique` ON `project_project_types` (`projectId`,`projectTypeId`);--> statement-breakpoint
CREATE INDEX `project_project_types_project_idx` ON `project_project_types` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_project_types_type_idx` ON `project_project_types` (`projectTypeId`);--> statement-breakpoint
CREATE TABLE `project_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectId` integer NOT NULL,
	`userId` integer NOT NULL,
	`role` text NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_users_project_user_unique` ON `project_users` (`projectId`,`userId`);--> statement-breakpoint
CREATE INDEX `project_users_user_idx` ON `project_users` (`userId`);--> statement-breakpoint
CREATE INDEX `project_users_project_idx` ON `project_users` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_users_role_idx` ON `project_users` (`role`);--> statement-breakpoint
CREATE INDEX `project_users_project_role_idx` ON `project_users` (`projectId`,`role`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`projectNumber` text,
	`subProjectName` text,
	`name` text NOT NULL,
	`startDate` integer NOT NULL,
	`locationId` integer,
	`clientId` integer,
	`engineerId` integer,
	`companyId` integer,
	`remark` text,
	`invoicingAddress` text,
	`latitude` real,
	`longitude` real,
	`firstActivityDate` integer,
	`lastActivityDate` integer,
	`totalDuration` real DEFAULT 0,
	`unBilledDuration` real DEFAULT 0,
	`unBilledDisbursementDuration` real DEFAULT 0,
	`offerAmount` real,
	`status` text DEFAULT 'active' NOT NULL,
	`ended` integer DEFAULT false,
	`archived` integer DEFAULT false,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`engineerId`) REFERENCES `engineers`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `projects_name_idx` ON `projects` (`name`);--> statement-breakpoint
CREATE INDEX `projects_project_number_idx` ON `projects` (`projectNumber`);--> statement-breakpoint
CREATE INDEX `projects_start_date_idx` ON `projects` (`startDate`);--> statement-breakpoint
CREATE INDEX `projects_updated_at_idx` ON `projects` (`updatedAt`);--> statement-breakpoint
CREATE INDEX `projects_location_idx` ON `projects` (`locationId`);--> statement-breakpoint
CREATE INDEX `projects_client_idx` ON `projects` (`clientId`);--> statement-breakpoint
CREATE INDEX `projects_engineer_idx` ON `projects` (`engineerId`);--> statement-breakpoint
CREATE INDEX `projects_company_idx` ON `projects` (`companyId`);--> statement-breakpoint
CREATE INDEX `projects_first_activity_date_idx` ON `projects` (`firstActivityDate`);--> statement-breakpoint
CREATE INDEX `projects_last_activity_date_idx` ON `projects` (`lastActivityDate`);--> statement-breakpoint
CREATE INDEX `projects_total_duration_idx` ON `projects` (`totalDuration`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_archived_idx` ON `projects` (`archived`);--> statement-breakpoint
CREATE INDEX `projects_ended_idx` ON `projects` (`ended`);--> statement-breakpoint
CREATE INDEX `projects_un_billed_duration_idx` ON `projects` (`unBilledDuration`);--> statement-breakpoint
CREATE INDEX `projects_un_billed_disbursement_duration_idx` ON `projects` (`unBilledDisbursementDuration`);--> statement-breakpoint
CREATE TABLE `rate_classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class` text NOT NULL,
	`year` integer NOT NULL,
	`amount` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`lastName` text NOT NULL,
	`firstName` text NOT NULL,
	`initials` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`password` text NOT NULL,
	`role` text NOT NULL,
	`activityRates` text DEFAULT '[]',
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_archived_idx` ON `users` (`archived`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_name_idx` ON `users` (`lastName`,`firstName`);--> statement-breakpoint
CREATE TABLE `vat_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`year` integer NOT NULL,
	`rate` real NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `vat_rates_year_idx` ON `vat_rates` (`year`);--> statement-breakpoint
CREATE INDEX `vat_rates_year_unique` ON `vat_rates` (`year`);--> statement-breakpoint
CREATE TABLE `workloads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`workload` integer NOT NULL,
	`updatedAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workloads_user_year_month_idx` ON `workloads` (`userId`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `workloads_user_idx` ON `workloads` (`userId`);--> statement-breakpoint
CREATE INDEX `workloads_year_idx` ON `workloads` (`year`);