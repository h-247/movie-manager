CREATE TABLE `movie_genres` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'genre' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movie_genres_name_unique` ON `movie_genres` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `movie_genres_name_idx` ON `movie_genres` (`name`);