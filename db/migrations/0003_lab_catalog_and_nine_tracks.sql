PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_labs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`isolation_notes` text
);
--> statement-breakpoint
INSERT INTO `__new_labs`("id", "slug", "isolation_notes") SELECT "id", "slug", "isolation_notes" FROM `labs`;--> statement-breakpoint
DROP TABLE `labs`;--> statement-breakpoint
ALTER TABLE `__new_labs` RENAME TO `labs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `labs_slug_unique` ON `labs` (`slug`);--> statement-breakpoint
CREATE TABLE `__new_tracks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`sort_order` integer NOT NULL,
	CONSTRAINT "tracks_number_range" CHECK("__new_tracks"."number" BETWEEN 0 AND 8)
);
--> statement-breakpoint
INSERT INTO `__new_tracks`("id", "slug", "number", "title", "description", "sort_order") SELECT "id", "slug", "number", "title", "description", "sort_order" FROM `tracks`;--> statement-breakpoint
DROP TABLE `tracks`;--> statement-breakpoint
ALTER TABLE `__new_tracks` RENAME TO `tracks`;--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_slug_unique` ON `tracks` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_number_unique` ON `tracks` (`number`);