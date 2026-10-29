import { z } from 'zod';

export const watchStatusSchema = z.enum(['TO_DO', 'DOING', 'DONE']);

export const mediaTypeSchema = z.enum(['MOVIE', 'SERIES']);

export const imdbIdSchema = z
  .string()
  .trim()
  .regex(/^tt\d{7,10}$/i, 'IMDb ID must start with "tt" followed by 7 to 10 digits');

export const createMovieSchema = z.object({
  imdbId: imdbIdSchema,
  imdbUrl: z.string().url().optional(),
  tmdbId: z.number().int().positive().nullable().optional(),
  title: z.string().trim().min(1, 'Title is required'),
  originalTitle: z.string().trim().nullable().optional(),
  mediaType: mediaTypeSchema.default('MOVIE'),
  releaseDate: z.string().trim().nullable().optional(),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  posterPath: z.string().trim().nullable().optional(),
  overview: z.string().trim().nullable().optional(),
  runtimeMinutes: z.number().int().positive().nullable().optional(),
  totalSeasons: z.number().int().positive().nullable().optional(),
  totalEpisodes: z.number().int().positive().nullable().optional(),
  currentSeason: z.number().int().positive().nullable().optional(),
  currentEpisode: z.number().int().positive().nullable().optional(),
  genres: z.union([z.array(z.string()), z.string()]).optional(),
  countries: z.union([z.array(z.string()), z.string()]).optional().nullable(),
  status: watchStatusSchema.default('TO_DO'),
  personalRating: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  forceAsMovie: z.boolean().optional(),
});

export const updateMovieSchema = z.object({
  status: watchStatusSchema.optional(),
  mediaType: mediaTypeSchema.optional(),
  personalRating: z.number().int().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  title: z.string().trim().min(1).optional(),
  originalTitle: z.string().trim().nullable().optional(),
  releaseDate: z.string().trim().nullable().optional(),
  releaseYear: z.number().int().min(1888).max(2100).nullable().optional(),
  posterPath: z.string().trim().nullable().optional(),
  overview: z.string().trim().nullable().optional(),
  runtimeMinutes: z.number().int().positive().nullable().optional(),
  totalSeasons: z.number().int().positive().nullable().optional(),
  totalEpisodes: z.number().int().positive().nullable().optional(),
  currentSeason: z.number().int().positive().nullable().optional(),
  currentEpisode: z.number().int().positive().nullable().optional(),
  genres: z.union([z.array(z.string()), z.string()]).optional(),
  countries: z.union([z.array(z.string()), z.string()]).optional().nullable(),
});

export const previewInputSchema = z.object({
  input: z.string().trim().min(1, 'Please enter an IMDb URL or title ID'),
});

export const bulkImportInputSchema = z.object({
  content: z.string().min(1, 'Please enter at least one IMDb link'),
  defaultStatus: watchStatusSchema.default('TO_DO'),
});

export const movieQuerySchema = z.object({
  status: z.enum(['ALL', 'TO_DO', 'DOING', 'DONE']).optional().default('ALL'),
  type: z.enum(['ALL', 'MOVIE', 'SERIES']).optional().default('ALL'),
  search: z.string().optional(),
  genre: z.string().optional(),
  year: z.coerce.number().int().optional(),
  sortBy: z
    .enum([
      'added_desc',
      'added_asc',
      'title_asc',
      'title_desc',
      'year_desc',
      'year_asc',
      'updated_desc',
    ])
    .optional()
    .default('added_desc'),
});

export const importCollectionSchema = z.object({
  movies: z.array(createMovieSchema),
  overwriteExisting: z.boolean().optional().default(false),
});
