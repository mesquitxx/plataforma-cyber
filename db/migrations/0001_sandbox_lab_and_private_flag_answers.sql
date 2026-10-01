PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_labs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`target` text NOT NULL,
	`compose_dir` text NOT NULL,
	`local_ports` text DEFAULT '[]' NOT NULL,
	`isolation_notes` text,
	CONSTRAINT "labs_target_valid" CHECK("__new_labs"."target" IN ('dvwa', 'juice-shop', 'webgoat', 'vulhub', 'linux-sandbox'))
);
--> statement-breakpoint
INSERT INTO `__new_labs`("id", "slug", "target", "compose_dir", "local_ports", "isolation_notes") SELECT "id", "slug", "target", "compose_dir", "local_ports", "isolation_notes" FROM `labs`;--> statement-breakpoint
DROP TABLE `labs`;--> statement-breakpoint
ALTER TABLE `__new_labs` RENAME TO `labs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `labs_slug_unique` ON `labs` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_flag_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flag_id` integer NOT NULL,
	`submitted_value` text,
	`is_correct` integer NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`flag_id`) REFERENCES `flags`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "flag_submissions_value_only_when_wrong" CHECK(("__new_flag_submissions"."is_correct" = 0 AND "__new_flag_submissions"."submitted_value" IS NOT NULL) OR ("__new_flag_submissions"."is_correct" = 1 AND "__new_flag_submissions"."submitted_value" IS NULL))
);
--> statement-breakpoint
INSERT INTO `__new_flag_submissions`("id", "flag_id", "submitted_value", "is_correct", "submitted_at") SELECT "id", "flag_id", "submitted_value", "is_correct", "submitted_at" FROM `flag_submissions`;--> statement-breakpoint
DROP TABLE `flag_submissions`;--> statement-breakpoint
ALTER TABLE `__new_flag_submissions` RENAME TO `flag_submissions`;--> statement-breakpoint
CREATE INDEX `flag_submissions_flag_idx` ON `flag_submissions` (`flag_id`);