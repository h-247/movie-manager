import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const WATCH_STATUSES = ['TO_DO', 'DOING', 'DONE'] as const;
export type WatchStatus = (typeof WATCH_STATUSES)[number];

export const movies = sqliteTable(
  'movies',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    imdbId: text('imdb_id').notNull(),
    imdbUrl: text('imdb_url').notNull(),
    tmdbId: integer('tmdb_id'),
    title: text('title').notNull(),
    originalTitle: text('original_title'),
    releaseDate: text('release_date'),
    releaseYear: integer('release_year'),
    posterPath: text('poster_path'),
    overview: text('overview'),
    runtimeMinutes: integer('runtime_minutes'),
    genres: text('genres'), // JSON array string, e.g. ["Action", "Sci-Fi"]
    status: text('status', { enum: ['TO_DO', 'DOING', 'DONE'] })
      .notNull()
      .default('TO_DO'),
    personalRating: integer('personal_rating'), // 1 to 10
    notes: text('notes'),
    startedAt: text('started_at'),
    completedAt: text('completed_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex('unique_user_imdb').on(table.userId, table.imdbId),
    index('idx_movies_user_status').on(table.userId, table.status),
    index('idx_movies_user_created').on(table.userId, table.createdAt),
    index('idx_movies_user_title').on(table.userId, table.title),
  ],
);

export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
