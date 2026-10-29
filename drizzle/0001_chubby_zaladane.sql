ALTER TABLE `movies` ADD `media_type` text DEFAULT 'MOVIE' NOT NULL;--> statement-breakpoint
ALTER TABLE `movies` ADD `total_seasons` integer;--> statement-breakpoint
ALTER TABLE `movies` ADD `total_episodes` integer;--> statement-breakpoint
ALTER TABLE `movies` ADD `current_season` integer;--> statement-breakpoint
ALTER TABLE `movies` ADD `current_episode` integer;--> statement-breakpoint
CREATE INDEX `idx_movies_user_type` ON `movies` (`user_id`,`media_type`);