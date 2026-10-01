CREATE TABLE `glossary_term_mentions` (
	`term_id` integer NOT NULL,
	`module_id` integer NOT NULL,
	PRIMARY KEY(`term_id`, `module_id`),
	FOREIGN KEY (`term_id`) REFERENCES `glossary_terms`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `glossary_term_mentions_module_idx` ON `glossary_term_mentions` (`module_id`);--> statement-breakpoint
CREATE TABLE `quiz_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quiz_id` integer NOT NULL,
	`answers` text NOT NULL,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "quiz_attempts_score_range" CHECK("quiz_attempts"."score" BETWEEN 0 AND "quiz_attempts"."total" AND "quiz_attempts"."total" > 0)
);
--> statement-breakpoint
CREATE INDEX `quiz_attempts_quiz_idx` ON `quiz_attempts` (`quiz_id`);--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`quiz_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`answer_index` integer NOT NULL,
	`explanation` text NOT NULL,
	PRIMARY KEY(`quiz_id`, `sort_order`),
	FOREIGN KEY (`quiz_id`) REFERENCES `quizzes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "quiz_questions_answer_index_valid" CHECK("quiz_questions"."answer_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`pass_percent` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "quizzes_pass_percent_range" CHECK("quizzes"."pass_percent" BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quizzes_task_id_unique` ON `quizzes` (`task_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module_id` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`prompt` text,
	`sort_order` integer NOT NULL,
	`type` text NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tasks_type_valid" CHECK("__new_tasks"."type" IN ('reading', 'exercise', 'lab_step', 'flag', 'quiz'))
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "module_id", "slug", "title", "prompt", "sort_order", "type") SELECT "id", "module_id", "slug", "title", "prompt", "sort_order", "type" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_module_slug_uq` ON `tasks` (`module_id`,`slug`);