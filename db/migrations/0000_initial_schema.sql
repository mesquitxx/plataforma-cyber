CREATE TABLE `flag_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flag_id` integer NOT NULL,
	`submitted_value` text NOT NULL,
	`is_correct` integer NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`flag_id`) REFERENCES `flags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `flag_submissions_flag_idx` ON `flag_submissions` (`flag_id`);--> statement-breakpoint
CREATE TABLE `flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`answer_hash` text NOT NULL,
	`salt` text NOT NULL,
	`hint` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flags_task_id_unique` ON `flags` (`task_id`);--> statement-breakpoint
CREATE TABLE `glossary_terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`term` text NOT NULL,
	`definition` text NOT NULL,
	`first_module_id` integer,
	FOREIGN KEY (`first_module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `glossary_terms_term_ci_uq` ON `glossary_terms` (lower("term"));--> statement-breakpoint
CREATE TABLE `labs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`target` text NOT NULL,
	`compose_dir` text NOT NULL,
	`local_ports` text DEFAULT '[]' NOT NULL,
	`isolation_notes` text,
	CONSTRAINT "labs_target_valid" CHECK("labs"."target" IN ('dvwa', 'juice-shop', 'webgoat', 'vulhub'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `labs_slug_unique` ON `labs` (`slug`);--> statement-breakpoint
CREATE TABLE `module_prerequisites` (
	`module_id` integer NOT NULL,
	`required_module_id` integer NOT NULL,
	PRIMARY KEY(`module_id`, `required_module_id`),
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`required_module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "module_prerequisites_not_self" CHECK("module_prerequisites"."module_id" <> "module_prerequisites"."required_module_id")
);
--> statement-breakpoint
CREATE INDEX `module_prerequisites_required_idx` ON `module_prerequisites` (`required_module_id`);--> statement-breakpoint
CREATE TABLE `module_progress` (
	`module_id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "module_progress_status_valid" CHECK("module_progress"."status" IN ('not_started', 'in_progress', 'completed'))
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`track_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	`body_mdx` text NOT NULL,
	`lab_id` integer,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lab_id`) REFERENCES `labs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modules_slug_unique` ON `modules` (`slug`);--> statement-breakpoint
CREATE INDEX `modules_track_idx` ON `modules` (`track_id`);--> statement-breakpoint
CREATE INDEX `modules_lab_idx` ON `modules` (`lab_id`);--> statement-breakpoint
CREATE TABLE `task_progress` (
	`task_id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "task_progress_status_valid" CHECK("task_progress"."status" IN ('not_started', 'in_progress', 'completed'))
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`prompt` text,
	`sort_order` integer NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tasks_type_valid" CHECK("tasks"."type" IN ('reading', 'exercise', 'lab_step', 'flag'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_module_slug_uq` ON `tasks` (`module_id`,`slug`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer NOT NULL,
	CONSTRAINT "tracks_number_range" CHECK("tracks"."number" BETWEEN 0 AND 7)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_slug_unique` ON `tracks` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_number_unique` ON `tracks` (`number`);