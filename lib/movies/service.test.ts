import { describe, it, expect, beforeEach } from 'vitest';
import { MovieService, type CreateMovieInput } from './service';
import type { Movie } from '@/db/schema';

describe('MovieService Logic & Transitions', () => {
  let inMemoryMovies: Movie[] = [];
  let service: MovieService;

  beforeEach(() => {
    inMemoryMovies = [];

    // Mock DB layer
    const mockDb = {
      select: () => ({
        from: () => ({
          where: (condition: any) => ({
            orderBy: () => Promise.resolve([...inMemoryMovies]),
            limit: () => Promise.resolve([...inMemoryMovies]),
            then: (resolve: any) => resolve([...inMemoryMovies]),
          }),
        }),
      }),
      insert: () => ({
        values: (record: any) => {
          inMemoryMovies.push(record as Movie);
          return Promise.resolve();
        },
      }),
      update: () => ({
        set: (updates: any) => ({
          where: () => {
            if (inMemoryMovies.length > 0) {
              Object.assign(inMemoryMovies[0], updates);
            }
            return Promise.resolve();
          },
        }),
      }),
      delete: () => ({
        where: () => {
          inMemoryMovies = [];
          return Promise.resolve();
        },
      }),
    };

    service = new MovieService(() => mockDb);
  });

  it('creates movie with default status TO_DO and null viewing dates', async () => {
    const input: CreateMovieInput = {
      imdbId: 'tt0111161',
      title: 'The Shawshank Redemption',
      releaseYear: 1994,
    };

    // Override getMovieByImdbId & getMovieById for mock
    service.getMovieByImdbId = async () => null;
    service.getMovieById = async () => inMemoryMovies[0] || null;

    const created = await service.createMovie(input, 'user-1');
    expect(created.status).toBe('TO_DO');
    expect(created.startedAt).toBeNull();
    expect(created.completedAt).toBeNull();
    expect(created.title).toBe('The Shawshank Redemption');
  });

  it('prevents duplicate movie imports for the same user', async () => {
    const existingMovie: Movie = {
      id: 'existing-id',
      userId: 'user-1',
      imdbId: 'tt0111161',
      imdbUrl: 'https://www.imdb.com/title/tt0111161/',
      tmdbId: null,
      title: 'The Shawshank Redemption',
      originalTitle: null,
      mediaType: 'MOVIE',
      releaseDate: '1994-09-23',
      releaseYear: 1994,
      posterPath: null,
      overview: null,
      runtimeMinutes: 142,
      totalSeasons: null,
      totalEpisodes: null,
      currentSeason: null,
      currentEpisode: null,
      genres: '["Drama"]',
      status: 'TO_DO',
      personalRating: null,
      notes: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    service.getMovieByImdbId = async () => existingMovie;

    await expect(
      service.createMovie(
        {
          imdbId: 'tt0111161',
          title: 'The Shawshank Redemption',
        },
        'user-1',
      ),
    ).rejects.toThrow(/already in your watchlist/);
  });

  it('records startedAt when transitioning from TO_DO to DOING', async () => {
    const currentMovie: Movie = {
      id: 'm1',
      userId: 'user-1',
      imdbId: 'tt0111161',
      imdbUrl: 'https://www.imdb.com/title/tt0111161/',
      tmdbId: null,
      title: 'The Shawshank Redemption',
      originalTitle: null,
      mediaType: 'MOVIE',
      releaseDate: null,
      releaseYear: 1994,
      posterPath: null,
      overview: null,
      runtimeMinutes: null,
      totalSeasons: null,
      totalEpisodes: null,
      currentSeason: null,
      currentEpisode: null,
      genres: null,
      status: 'TO_DO',
      personalRating: null,
      notes: 'Plan to watch this weekend',
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryMovies = [currentMovie];
    service.getMovieById = async () => inMemoryMovies[0];

    const updated = await service.updateMovie(
      'm1',
      { status: 'DOING' },
      'user-1',
    );

    expect(updated.status).toBe('DOING');
    expect(updated.startedAt).toBeTruthy();
    expect(updated.completedAt).toBeNull();
    // Notes preserved
    expect(updated.notes).toBe('Plan to watch this weekend');
  });

  it('records completedAt and startedAt when transitioning to DONE', async () => {
    const currentMovie: Movie = {
      id: 'm1',
      userId: 'user-1',
      imdbId: 'tt0111161',
      imdbUrl: 'https://www.imdb.com/title/tt0111161/',
      tmdbId: null,
      title: 'The Shawshank Redemption',
      originalTitle: null,
      mediaType: 'MOVIE',
      releaseDate: null,
      releaseYear: 1994,
      posterPath: null,
      overview: null,
      runtimeMinutes: null,
      totalSeasons: null,
      totalEpisodes: null,
      currentSeason: null,
      currentEpisode: null,
      genres: null,
      status: 'TO_DO',
      personalRating: null,
      notes: null,
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryMovies = [currentMovie];
    service.getMovieById = async () => inMemoryMovies[0];

    const updated = await service.updateMovie(
      'm1',
      { status: 'DONE', personalRating: 10 },
      'user-1',
    );

    expect(updated.status).toBe('DONE');
    expect(updated.completedAt).toBeTruthy();
    expect(updated.startedAt).toBeTruthy();
    expect(updated.personalRating).toBe(10);
  });

  it('clears active viewing dates when transitioning back to TO_DO', async () => {
    const currentMovie: Movie = {
      id: 'm1',
      userId: 'user-1',
      imdbId: 'tt0111161',
      imdbUrl: 'https://www.imdb.com/title/tt0111161/',
      tmdbId: null,
      title: 'The Shawshank Redemption',
      originalTitle: null,
      mediaType: 'MOVIE',
      releaseDate: null,
      releaseYear: 1994,
      posterPath: null,
      overview: null,
      runtimeMinutes: null,
      totalSeasons: null,
      totalEpisodes: null,
      currentSeason: null,
      currentEpisode: null,
      genres: null,
      status: 'DONE',
      personalRating: 9,
      notes: 'Rewatching soon',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-02T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };

    inMemoryMovies = [currentMovie];
    service.getMovieById = async () => inMemoryMovies[0];

    const updated = await service.updateMovie(
      'm1',
      { status: 'TO_DO' },
      'user-1',
    );

    expect(updated.status).toBe('TO_DO');
    expect(updated.startedAt).toBeNull();
    expect(updated.completedAt).toBeNull();
    // Notes and rating retained
    expect(updated.personalRating).toBe(9);
    expect(updated.notes).toBe('Rewatching soon');
  });

  it('calculates dashboard counters correctly', async () => {
    const sampleMovies: Movie[] = [
      { status: 'TO_DO', genres: '["Action", "Sci-Fi"]' } as Movie,
      { status: 'TO_DO', genres: '["Drama"]' } as Movie,
      { status: 'DOING', genres: '["Sci-Fi"]' } as Movie,
      { status: 'DONE', genres: '["Drama", "Action"]' } as Movie,
    ];

    const statsDb = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve(sampleMovies),
        }),
      }),
    };

    const statsService = new MovieService(() => statsDb);
    const stats = await statsService.getDashboardStats('user-1');

    expect(stats.total).toBe(4);
    expect(stats.todo).toBe(2);
    expect(stats.doing).toBe(1);
    expect(stats.done).toBe(1);
    expect(stats.genres).toEqual([
      { name: 'Action', count: 2 },
      { name: 'Drama', count: 2 },
      { name: 'Sci-Fi', count: 2 },
    ]);
  });
});
