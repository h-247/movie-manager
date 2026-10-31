import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { movies, movieGenres, type Movie, type WatchStatus, type MediaType } from '@/db/schema';
import { fetchMovieMetadataByImdbId, checkImdbTitleType } from '@/lib/tmdb';

export interface GetMoviesParams {
  userId: string;
  status?: string;
  mediaType?: string;
  search?: string;
  genre?: string;
  year?: number;
  sortBy?:
    | 'added_desc'
    | 'added_asc'
    | 'title_asc'
    | 'title_desc'
    | 'year_desc'
    | 'year_asc'
    | 'updated_desc';
}

export interface CreateMovieInput {
  imdbId: string;
  imdbUrl?: string;
  tmdbId?: number | null;
  title: string;
  originalTitle?: string | null;
  mediaType?: MediaType;
  releaseDate?: string | null;
  releaseYear?: number | null;
  posterPath?: string | null;
  overview?: string | null;
  runtimeMinutes?: number | null;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
  currentSeason?: number | null;
  currentEpisode?: number | null;
  currentHour?: number | null;
  currentMinute?: number | null;
  seriesProgress?: string | null;
  genres?: string[] | string;
  countries?: string[] | string | null;
  status?: WatchStatus;
  personalRating?: number | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  forceAsMovie?: boolean;
}

export interface UpdateMovieInput {
  status?: WatchStatus;
  mediaType?: MediaType;
  personalRating?: number | null;
  notes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  title?: string;
  originalTitle?: string | null;
  releaseDate?: string | null;
  releaseYear?: number | null;
  posterPath?: string | null;
  overview?: string | null;
  runtimeMinutes?: number | null;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
  currentSeason?: number | null;
  currentEpisode?: number | null;
  currentHour?: number | null;
  currentMinute?: number | null;
  seriesProgress?: string | null;
  genres?: string[] | string;
  countries?: string[] | string | null;
}

export interface DashboardStats {
  total: number;
  totalMovies: number;
  totalSeries: number;
  todo: number;
  doing: number;
  done: number;
  genres: { name: string; count: number }[];
}

export class MovieService {
  constructor(private dbGetter: () => any = getDb) {}

  private get db() {
    return this.dbGetter();
  }

  async getMovies(params: GetMoviesParams): Promise<Movie[]> {
    const { userId, status, mediaType, search, genre, year, sortBy = 'added_desc' } = params;

    const conditions = [eq(movies.userId, userId)];

    if (status && status !== 'ALL') {
      conditions.push(eq(movies.status, status as WatchStatus));
    }

    if (mediaType && mediaType !== 'ALL') {
      conditions.push(eq(movies.mediaType, mediaType as MediaType));
    }

    if (year) {
      conditions.push(eq(movies.releaseYear, year));
    }

    if (genre) {
      conditions.push(like(movies.genres, `%"${genre}"%`));
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        or(
          sql`lower(${movies.title}) LIKE ${term}`,
          sql`lower(coalesce(${movies.originalTitle}, '')) LIKE ${term}`,
          sql`lower(${movies.imdbId}) LIKE ${term}`,
        )!,
      );
    }

    let orderByClause;
    switch (sortBy) {
      case 'added_asc':
        orderByClause = asc(movies.createdAt);
        break;
      case 'title_asc':
        orderByClause = asc(sql`lower(${movies.title})`);
        break;
      case 'title_desc':
        orderByClause = desc(sql`lower(${movies.title})`);
        break;
      case 'year_desc':
        orderByClause = desc(movies.releaseYear);
        break;
      case 'year_asc':
        orderByClause = asc(movies.releaseYear);
        break;
      case 'updated_desc':
        orderByClause = desc(movies.updatedAt);
        break;
      case 'added_desc':
      default:
        orderByClause = desc(movies.createdAt);
        break;
    }

    return await this.db
      .select()
      .from(movies)
      .where(and(...conditions))
      .orderBy(orderByClause);
  }

  async getMovieById(id: string, userId: string): Promise<Movie | null> {
    const rows = await this.db
      .select()
      .from(movies)
      .where(and(eq(movies.id, id), eq(movies.userId, userId)))
      .limit(1);

    return rows[0] || null;
  }

  async getMovieByImdbId(imdbId: string, userId: string): Promise<Movie | null> {
    const rows = await this.db
      .select()
      .from(movies)
      .where(and(eq(movies.imdbId, imdbId.toLowerCase()), eq(movies.userId, userId)))
      .limit(1);

    return rows[0] || null;
  }

  async createMovie(input: CreateMovieInput, userId: string): Promise<Movie> {
    const imdbId = input.imdbId.toLowerCase();

    // Check duplicate
    const existing = await this.getMovieByImdbId(imdbId, userId);
    if (existing) {
      const err = new Error(`Item with IMDb ID "${imdbId}" is already in your watchlist.`);
      (err as any).code = 'DUPLICATE_MOVIE';
      (err as any).existingMovie = existing;
      throw err;
    }

    let mediaType: MediaType = input.mediaType || 'MOVIE';
    if (!input.mediaType) {
      const titleCheck = await checkImdbTitleType(imdbId);
      if (titleCheck.isKnown && titleCheck.mediaType) {
        mediaType = titleCheck.mediaType;
      }
    }

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const status = input.status || 'TO_DO';

    let startedAt = input.startedAt || null;
    let completedAt = input.completedAt || null;

    if (status === 'DOING' && !startedAt) {
      startedAt = nowIso;
    } else if (status === 'DONE') {
      if (!completedAt) completedAt = nowIso;
      if (!startedAt) startedAt = nowIso;
    }

    let genresStr: string | null = null;
    if (input.genres) {
      genresStr = Array.isArray(input.genres)
        ? JSON.stringify(input.genres)
        : input.genres;
    }

    let countriesStr: string | null = null;
    if (input.countries) {
      if (Array.isArray(input.countries)) {
        countriesStr = JSON.stringify(input.countries);
      } else if (typeof input.countries === 'string') {
        const trimmed = input.countries.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          countriesStr = trimmed;
        } else {
          countriesStr = JSON.stringify(trimmed.split(',').map((s) => s.trim()).filter(Boolean));
        }
      }
    }

    const canonicalUrl = input.imdbUrl || `https://www.imdb.com/title/${imdbId}/`;

    const newMovieRecord = {
      id,
      userId,
      imdbId,
      imdbUrl: canonicalUrl,
      tmdbId: input.tmdbId ?? null,
      title: input.title.trim(),
      originalTitle: input.originalTitle ? input.originalTitle.trim() : null,
      mediaType,
      releaseDate: input.releaseDate || null,
      releaseYear: input.releaseYear || null,
      posterPath: input.posterPath || null,
      overview: input.overview ? input.overview.trim() : null,
      runtimeMinutes: input.runtimeMinutes || null,
      totalSeasons: input.totalSeasons ?? null,
      totalEpisodes: input.totalEpisodes ?? null,
      currentSeason: input.currentSeason ?? null,
      currentEpisode: input.currentEpisode ?? null,
      currentHour: input.currentHour ?? null,
      currentMinute: input.currentMinute ?? null,
      seriesProgress: input.seriesProgress ?? null,
      genres: genresStr,
      countries: countriesStr,
      status,
      personalRating:
        typeof input.personalRating === 'number' ? input.personalRating : null,
      notes: input.notes ? input.notes.trim() : null,
      startedAt,
      completedAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.db.insert(movies).values(newMovieRecord);

    const created = await this.getMovieById(id, userId);
    if (!created) {
      throw new Error('Failed to retrieve newly created record');
    }
    return created;
  }

  async updateMovie(
    id: string,
    input: UpdateMovieInput,
    userId: string,
  ): Promise<Movie> {
    const current = await this.getMovieById(id, userId);
    if (!current) {
      const err = new Error('Movie not found');
      (err as any).code = 'NOT_FOUND';
      throw err;
    }

    const nowIso = new Date().toISOString();
    const updates: Partial<typeof movies.$inferInsert> = {
      updatedAt: nowIso,
    };

    if (input.mediaType !== undefined) {
      updates.mediaType = input.mediaType;
    }
    if (input.totalSeasons !== undefined) {
      updates.totalSeasons = input.totalSeasons;
    }
    if (input.totalEpisodes !== undefined) {
      updates.totalEpisodes = input.totalEpisodes;
    }
    if (input.currentSeason !== undefined) {
      updates.currentSeason = input.currentSeason;
    }
    if (input.currentEpisode !== undefined) {
      updates.currentEpisode = input.currentEpisode;
    }
    if (input.currentHour !== undefined) {
      updates.currentHour = input.currentHour;
    }
    if (input.currentMinute !== undefined) {
      updates.currentMinute = input.currentMinute;
    }
    if (input.seriesProgress !== undefined) {
      updates.seriesProgress = input.seriesProgress;
    }
    if (input.title !== undefined) {
      updates.title = input.title.trim();
    }
    if (input.originalTitle !== undefined) {
      updates.originalTitle = input.originalTitle ? input.originalTitle.trim() : null;
    }
    if (input.releaseDate !== undefined) {
      updates.releaseDate = input.releaseDate;
    }
    if (input.releaseYear !== undefined) {
      updates.releaseYear = input.releaseYear;
    }
    if (input.posterPath !== undefined) {
      updates.posterPath = input.posterPath;
    }
    if (input.overview !== undefined) {
      updates.overview = input.overview ? input.overview.trim() : null;
    }
    if (input.runtimeMinutes !== undefined) {
      updates.runtimeMinutes = input.runtimeMinutes;
    }
    if (input.genres !== undefined) {
      updates.genres = Array.isArray(input.genres)
        ? JSON.stringify(input.genres)
        : input.genres;
    }
    if (input.countries !== undefined) {
      if (input.countries === null) {
        updates.countries = null;
      } else if (Array.isArray(input.countries)) {
        updates.countries = JSON.stringify(input.countries);
      } else if (typeof input.countries === 'string') {
        const trimmed = input.countries.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          updates.countries = trimmed;
        } else {
          updates.countries = JSON.stringify(trimmed.split(',').map((s) => s.trim()).filter(Boolean));
        }
      }
    }
    if (input.personalRating !== undefined) {
      updates.personalRating = input.personalRating;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes ? input.notes.trim() : null;
    }

    // Status transition & date tracking logic
    if (input.status !== undefined && input.status !== current.status) {
      updates.status = input.status;

      if (input.status === 'DOING') {
        // Entering Doing: populate startedAt if not provided or set
        if (input.startedAt !== undefined) {
          updates.startedAt = input.startedAt;
        } else if (!current.startedAt) {
          updates.startedAt = nowIso;
        }
      } else if (input.status === 'DONE') {
        // Entering Done: populate completedAt
        if (input.completedAt !== undefined) {
          updates.completedAt = input.completedAt;
        } else if (!current.completedAt) {
          updates.completedAt = nowIso;
        }
        // Ensure startedAt is set
        if (input.startedAt !== undefined) {
          updates.startedAt = input.startedAt;
        } else if (!current.startedAt) {
          updates.startedAt = updates.completedAt || nowIso;
        }
      } else if (input.status === 'TO_DO') {
        // Returning to To do: clear active viewing dates unless user explicitly provided them
        if (input.startedAt !== undefined) {
          updates.startedAt = input.startedAt;
        } else {
          updates.startedAt = null;
        }

        if (input.completedAt !== undefined) {
          updates.completedAt = input.completedAt;
        } else {
          updates.completedAt = null;
        }
      }
    } else {
      // If status didn't change, allow manual date edits if provided
      if (input.startedAt !== undefined) {
        updates.startedAt = input.startedAt;
      }
      if (input.completedAt !== undefined) {
        updates.completedAt = input.completedAt;
      }
    }

    await this.db
      .update(movies)
      .set(updates)
      .where(and(eq(movies.id, id), eq(movies.userId, userId)));

    const updated = await this.getMovieById(id, userId);
    return updated!;
  }

  async deleteMovie(id: string, userId: string): Promise<boolean> {
    const existing = await this.getMovieById(id, userId);
    if (!existing) {
      return false;
    }

    await this.db
      .delete(movies)
      .where(and(eq(movies.id, id), eq(movies.userId, userId)));

    return true;
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const allUserMovies = await this.db
      .select({
        status: movies.status,
        genres: movies.genres,
        mediaType: movies.mediaType,
      })
      .from(movies)
      .where(eq(movies.userId, userId));

    let todo = 0;
    let doing = 0;
    let done = 0;
    let totalMovies = 0;
    let totalSeries = 0;
    const genreCountMap: Record<string, number> = {};

    for (const m of allUserMovies) {
      if (m.mediaType === 'SERIES') {
        totalSeries++;
      } else {
        totalMovies++;
      }

      if (m.status === 'TO_DO') todo++;
      else if (m.status === 'DOING') doing++;
      else if (m.status === 'DONE') done++;

      if (m.genres) {
        try {
          const parsed = JSON.parse(m.genres);
          if (Array.isArray(parsed)) {
            for (const g of parsed) {
              if (typeof g === 'string') {
                genreCountMap[g] = (genreCountMap[g] || 0) + 1;
              }
            }
          }
        } catch {
          // ignore malformed genre json
        }
      }
    }

    const genreList = Object.entries(genreCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return {
      total: allUserMovies.length,
      totalMovies,
      totalSeries,
      todo,
      doing,
      done,
      genres: genreList,
    };
  }

  async bulkImportMovies(
    parsedItems: { imdbId: string; imdbUrl: string }[],
    defaultStatus: WatchStatus,
    userId: string,
  ): Promise<{
    imported: Movie[];
    skipped: { imdbId: string; title?: string; reason: string }[];
    failed: { imdbId: string; error: string }[];
  }> {
    const imported: Movie[] = [];
    const skipped: { imdbId: string; title?: string; reason: string }[] = [];
    const failed: { imdbId: string; error: string }[] = [];

    for (const item of parsedItems) {
      const existing = await this.getMovieByImdbId(item.imdbId, userId);
      if (existing) {
        skipped.push({
          imdbId: item.imdbId,
          title: existing.title,
          reason: 'Movie is already in your watchlist',
        });
        continue;
      }

      try {
        const metadataResult = await fetchMovieMetadataByImdbId(item.imdbId);
        let movieData: CreateMovieInput;

        if (metadataResult.success) {
          movieData = {
            ...metadataResult.data,
            status: defaultStatus,
          };
        } else {
          if (metadataResult.isUnsupportedType) {
            failed.push({
              imdbId: item.imdbId,
              error: metadataResult.error,
            });
            continue;
          }
          // Fallback to minimal placeholder with valid IMDb id/url
          movieData = {
            imdbId: item.imdbId,
            imdbUrl: item.imdbUrl,
            title: `Movie (${item.imdbId})`,
            status: defaultStatus,
          };
        }

        const created = await this.createMovie(movieData, userId);
        imported.push(created);
      } catch (err: any) {
        failed.push({
          imdbId: item.imdbId,
          error: err.message || 'Import failed',
        });
      }
    }

    return { imported, skipped, failed };
  }
}

export const movieService = new MovieService();
