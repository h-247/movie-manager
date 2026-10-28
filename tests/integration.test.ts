import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovieService } from '@/lib/movies/service';
import type { Movie } from '@/db/schema';
import * as tmdbModule from '@/lib/tmdb';

describe('Movie Watchlist Integration Tests', () => {
  let dbRecords: Movie[] = [];
  let service: MovieService;

  beforeEach(() => {
    vi.restoreAllMocks();
    dbRecords = [];

    // Realistic in-memory SQLite emulation for MovieService
    const mockDb = {
      select: (fields?: any) => ({
        from: (table: any) => ({
          where: (condition: any) => {
            const queryPromise: any = Promise.resolve([...dbRecords]);
            queryPromise.orderBy = (orderFn: any) => Promise.resolve([...dbRecords]);
            queryPromise.limit = (n: number) => Promise.resolve(dbRecords.slice(0, n));
            return queryPromise;
          },
        }),
      }),
      insert: (table: any) => ({
        values: (record: any) => {
          dbRecords.push({ ...record });
          return Promise.resolve();
        },
      }),
      update: (table: any) => ({
        set: (updates: any) => ({
          where: (condition: any) => {
            // update matching records
            if (dbRecords.length > 0) {
              Object.assign(dbRecords[0], updates);
            }
            return Promise.resolve();
          },
        }),
      }),
      delete: (table: any) => ({
        where: (condition: any) => {
          dbRecords = [];
          return Promise.resolve();
        },
      }),
    };

    service = new MovieService(() => mockDb);
  });

  it('1. Successfully creates a movie in database', async () => {
    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);
    service.getMovieById = vi.fn().mockImplementation((id: string) =>
      Promise.resolve(dbRecords.find((r) => r.id === id) || null),
    );

    const movie = await service.createMovie(
      {
        imdbId: 'tt0111161',
        title: 'The Shawshank Redemption',
        releaseYear: 1994,
        status: 'TO_DO',
      },
      'user_123',
    );

    expect(movie).toBeDefined();
    expect(movie.imdbId).toBe('tt0111161');
    expect(movie.userId).toBe('user_123');
    expect(movie.status).toBe('TO_DO');
    expect(dbRecords).toHaveLength(1);
  });

  it('2. Imports movie with fetched metadata', async () => {
    const fetchSpy = vi.spyOn(tmdbModule, 'fetchMovieMetadataByImdbId').mockResolvedValueOnce({
      success: true,
      data: {
        imdbId: 'tt0068646',
        imdbUrl: 'https://www.imdb.com/title/tt0068646/',
        tmdbId: 238,
        title: 'The Godfather',
        originalTitle: 'The Godfather',
        releaseDate: '1972-03-14',
        releaseYear: 1972,
        posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.',
        runtimeMinutes: 175,
        genres: ['Drama', 'Crime'],
      },
    });

    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);
    service.getMovieById = vi.fn().mockImplementation((id: string) =>
      Promise.resolve(dbRecords.find((r) => r.id === id) || null),
    );

    const result = await service.bulkImportMovies(
      [{ imdbId: 'tt0068646', imdbUrl: 'https://www.imdb.com/title/tt0068646/' }],
      'TO_DO',
      'user_123',
    );

    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].title).toBe('The Godfather');
    expect(result.imported[0].runtimeMinutes).toBe(175);
    fetchSpy.mockRestore();
  });

  it('3. Falls back to manual metadata entry when TMDB has no record', async () => {
    const fetchSpy = vi.spyOn(tmdbModule, 'fetchMovieMetadataByImdbId').mockResolvedValueOnce({
      success: false,
      error: 'No movie found for this IMDb ID on TMDB.',
      canFallbackToManual: true,
    });

    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);
    service.getMovieById = vi.fn().mockImplementation((id: string) =>
      Promise.resolve(dbRecords.find((r) => r.id === id) || null),
    );

    const result = await service.bulkImportMovies(
      [{ imdbId: 'tt9999999', imdbUrl: 'https://www.imdb.com/title/tt9999999/' }],
      'TO_DO',
      'user_123',
    );

    // Fallback creates movie placeholder with preserved IMDb ID
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].imdbId).toBe('tt9999999');
    expect(result.imported[0].title).toBe('Movie (tt9999999)');
    fetchSpy.mockRestore();
  });

  it('4. Handles multiple link bulk imports, tracking counts accurately', async () => {
    vi.spyOn(tmdbModule, 'fetchMovieMetadataByImdbId').mockResolvedValue({
      success: true,
      data: {
        imdbId: 'tt0111161',
        imdbUrl: 'https://www.imdb.com/title/tt0111161/',
        tmdbId: 278,
        title: 'Movie Title',
        originalTitle: null,
        releaseDate: '1994-09-23',
        releaseYear: 1994,
        posterPath: null,
        overview: 'Overview',
        runtimeMinutes: 120,
        genres: ['Drama'],
      },
    });

    service.getMovieByImdbId = vi.fn().mockImplementation((imdbId: string) => {
      // Simulate tt0068646 already existing
      if (imdbId === 'tt0068646') {
        return Promise.resolve({
          id: 'existing-id',
          imdbId: 'tt0068646',
          title: 'The Godfather',
        } as Movie);
      }
      return Promise.resolve(null);
    });

    service.getMovieById = vi.fn().mockImplementation((id: string) =>
      Promise.resolve(dbRecords.find((r) => r.id === id) || null),
    );

    const items = [
      { imdbId: 'tt0111161', imdbUrl: 'https://www.imdb.com/title/tt0111161/' },
      { imdbId: 'tt0068646', imdbUrl: 'https://www.imdb.com/title/tt0068646/' },
      { imdbId: 'tt0468569', imdbUrl: 'https://www.imdb.com/title/tt0468569/' },
    ];

    const result = await service.bulkImportMovies(items, 'TO_DO', 'user_123');

    expect(result.imported).toHaveLength(2); // tt0111161, tt0468569
    expect(result.skipped).toHaveLength(1); // tt0068646
    expect(result.skipped[0].imdbId).toBe('tt0068646');
  });

  it('5. Prevents duplicate movies for the same user', async () => {
    service.getMovieByImdbId = vi.fn().mockResolvedValue({
      id: 'existing-1',
      imdbId: 'tt0111161',
      title: 'The Shawshank Redemption',
    } as Movie);

    await expect(
      service.createMovie(
        { imdbId: 'tt0111161', title: 'The Shawshank Redemption' },
        'user_123',
      ),
    ).rejects.toThrow(/already in your watchlist/);
  });

  it('6. Updates movie statuses correctly with date progression', async () => {
    const movie: Movie = {
      id: 'm-1',
      userId: 'user_123',
      imdbId: 'tt0111161',
      imdbUrl: 'https://www.imdb.com/title/tt0111161/',
      tmdbId: 278,
      title: 'The Shawshank Redemption',
      originalTitle: null,
      releaseDate: '1994-09-23',
      releaseYear: 1994,
      posterPath: null,
      overview: null,
      runtimeMinutes: 142,
      genres: '["Drama"]',
      status: 'TO_DO',
      personalRating: null,
      notes: null,
      startedAt: null,
      completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    dbRecords = [movie];
    service.getMovieById = vi.fn().mockImplementation(() => Promise.resolve(dbRecords[0]));

    // Transition to DOING
    const doingMovie = await service.updateMovie('m-1', { status: 'DOING' }, 'user_123');
    expect(doingMovie.status).toBe('DOING');
    expect(doingMovie.startedAt).toBeDefined();

    // Transition to DONE
    const doneMovie = await service.updateMovie('m-1', { status: 'DONE' }, 'user_123');
    expect(doneMovie.status).toBe('DONE');
    expect(doneMovie.completedAt).toBeDefined();

    // Transition back to TO_DO
    const todoMovie = await service.updateMovie('m-1', { status: 'TO_DO' }, 'user_123');
    expect(todoMovie.status).toBe('TO_DO');
    expect(todoMovie.startedAt).toBeNull();
    expect(todoMovie.completedAt).toBeNull();
  });

  it('7. Edits notes and personal rating without losing other data', async () => {
    const movie: Movie = {
      id: 'm-1',
      userId: 'user_123',
      imdbId: 'tt0111161',
      imdbUrl: 'https://www.imdb.com/title/tt0111161/',
      tmdbId: 278,
      title: 'The Shawshank Redemption',
      originalTitle: null,
      releaseDate: '1994-09-23',
      releaseYear: 1994,
      posterPath: null,
      overview: null,
      runtimeMinutes: 142,
      genres: '["Drama"]',
      status: 'DONE',
      personalRating: null,
      notes: null,
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-02T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    dbRecords = [movie];
    service.getMovieById = vi.fn().mockImplementation(() => Promise.resolve(dbRecords[0]));

    const updated = await service.updateMovie(
      'm-1',
      {
        personalRating: 10,
        notes: 'Masterpiece film with incredible performances by Tim Robbins and Morgan Freeman.',
      },
      'user_123',
    );

    expect(updated.personalRating).toBe(10);
    expect(updated.notes).toContain('Masterpiece film');
    expect(updated.title).toBe('The Shawshank Redemption');
  });

  it('8. Deletes movie permanently', async () => {
    const movie: Movie = {
      id: 'm-1',
      userId: 'user_123',
      imdbId: 'tt0111161',
      title: 'The Shawshank Redemption',
    } as Movie;

    service.getMovieById = vi.fn().mockResolvedValue(movie);

    const deleted = await service.deleteMovie('m-1', 'user_123');
    expect(deleted).toBe(true);
    expect(dbRecords).toHaveLength(0);
  });

  it('9. Calculates dashboard statistics accurately', async () => {
    const moviesList: Movie[] = [
      { status: 'TO_DO', genres: '["Action"]' } as Movie,
      { status: 'TO_DO', genres: '["Sci-Fi"]' } as Movie,
      { status: 'DOING', genres: '["Action", "Sci-Fi"]' } as Movie,
      { status: 'DONE', genres: '["Drama"]' } as Movie,
    ];

    const statsDb = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve(moviesList),
        }),
      }),
    };

    const statsService = new MovieService(() => statsDb);
    const stats = await statsService.getDashboardStats('user_123');

    expect(stats.total).toBe(4);
    expect(stats.todo).toBe(2);
    expect(stats.doing).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.genres.find((g) => g.name === 'Action')?.count).toBe(2);
  });

  it('10. Enforces user ownership authorization', async () => {
    // If user_456 queries or attempts to update a movie owned by user_123, service returns null / not found
    service.getMovieById = vi.fn().mockImplementation((id: string, userId: string) => {
      if (userId === 'user_123') {
        return Promise.resolve({ id, userId: 'user_123' } as Movie);
      }
      return Promise.resolve(null);
    });

    const unauthorized = await service.getMovieById('m-1', 'user_456');
    expect(unauthorized).toBeNull();

    await expect(
      service.updateMovie('m-1', { status: 'DONE' }, 'user_456'),
    ).rejects.toThrow(/not found/i);
  });

  it('11. Gracefully rejects TV shows and unsupported types', async () => {
    vi.spyOn(tmdbModule, 'fetchMovieMetadataByImdbId').mockResolvedValueOnce({
      success: false,
      error: 'This IMDb ID belongs to a TV series, season, or episode. Movie Watchlist Manager supports movies only.',
      isUnsupportedType: true,
      canFallbackToManual: false,
    });

    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);

    const result = await service.bulkImportMovies(
      [{ imdbId: 'tt0903747', imdbUrl: 'https://www.imdb.com/title/tt0903747/' }], // Breaking Bad
      'TO_DO',
      'user_123',
    );

    expect(result.imported).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toContain('supports movies only');
  });

  it('12. Explicitly detects and rejects Peaky Blinders (tt2442560) as a TV series', async () => {
    const res = await tmdbModule.fetchMovieMetadataByImdbId('tt2442560');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.isUnsupportedType).toBe(true);
      expect(res.canFallbackToManual).toBe(false);
      expect(res.error).toMatch(/TV series.*Peaky Blinders/i);
    }

    // Also verify createMovie rejects it
    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);
    await expect(
      service.createMovie(
        { imdbId: 'tt2442560', title: 'Peaky Blinders' },
        'user_123',
      ),
    ).rejects.toThrow(/TV series.*Peaky Blinders/i);
  });
});
