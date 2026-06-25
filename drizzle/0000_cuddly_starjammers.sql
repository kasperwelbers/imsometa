CREATE TABLE `batch_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`batch_id` integer NOT NULL,
	`url` text NOT NULL,
	`norm_url` text NOT NULL,
	`domain` text NOT NULL,
	`method` text DEFAULT 'both' NOT NULL,
	`tag` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`error` text,
	`meta_json` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `batch_items_status_id_idx` ON `batch_items` (`status`,`id`);--> statement-breakpoint
CREATE INDEX `batch_items_domain_idx` ON `batch_items` (`domain`);--> statement-breakpoint
CREATE INDEX `batch_items_tag_idx` ON `batch_items` (`tag`);--> statement-breakpoint
CREATE INDEX `batch_items_batch_id_idx` ON `batch_items` (`batch_id`);--> statement-breakpoint
CREATE TABLE `batches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag` text,
	`created_at` integer NOT NULL,
	`total_count` integer DEFAULT 0 NOT NULL,
	`completed_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `url_metadata` (
	`norm_url` text NOT NULL,
	`method` text NOT NULL,
	`meta_json` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`norm_url`, `method`)
);
