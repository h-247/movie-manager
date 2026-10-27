CREATE TABLE `movies` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`imdb_id` text NOT NULL,
	`imdb_url` text NOT NULL,
	`tmdb_id` integer,
	`title` text NOT NULL,
	`original_title` text,
	`release_date` text,
	`release_year` integer,
	`poster_path` text,
	`overview` text,
	`runtime_minutes` integer,
	`genres` text,
	`status` text DEFAULT 'TO_DO' NOT NULL,
	`personal_rating` integer,
	`notes` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_user_imdb` ON `movies` (`user_id`,`imdb_id`);--> statement-breakpoint
CREATE INDEX `idx_movies_user_status` ON `movies` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_movies_user_created` ON `movies` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_movies_user_title` ON `movies` (`user_id`,`title`);