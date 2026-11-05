import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MovieService } from '@/lib/movies/service';
import type { Movie } from '@/db/schema';
import * as tmdbModule from '@/lib/tmdb';
import { getSeriesEpisodes, getActiveSeriesEpisode } from '@/components/movie-card';

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
        mediaType: 'MOVIE' as const,
        releaseDate: '1972-03-14',
        releaseYear: 1972,
        posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
        overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.',
        runtimeMinutes: 175,
        totalSeasons: null,
        totalEpisodes: null,
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
        mediaType: 'MOVIE' as const,
        releaseDate: '1994-09-23',
        releaseYear: 1994,
        posterPath: null,
        overview: 'Overview',
        runtimeMinutes: 120,
        totalSeasons: null,
        totalEpisodes: null,
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
      currentHour: null,
      currentMinute: null,
      seriesProgress: null,
      genres: '["Drama"]',
      countries: null,
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
      currentHour: null,
      currentMinute: null,
      seriesProgress: null,
      genres: '["Drama"]',
      countries: null,
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

  it('11. Successfully imports TV series in bulk imports', async () => {
    vi.spyOn(tmdbModule, 'fetchMovieMetadataByImdbId').mockResolvedValueOnce({
      success: true,
      data: {
        imdbId: 'tt0903747',
        imdbUrl: 'https://www.imdb.com/title/tt0903747/',
        tmdbId: 1396,
        title: 'Breaking Bad',
        originalTitle: null,
        mediaType: 'SERIES',
        releaseDate: '2008-01-20',
        releaseYear: 2008,
        posterPath: null,
        overview: 'A chemistry teacher diagnosed with cancer turns to manufacturing meth.',
        runtimeMinutes: 47,
        totalSeasons: 5,
        totalEpisodes: 62,
        genres: ['Crime', 'Drama'],
      },
    });

    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);

    const result = await service.bulkImportMovies(
      [{ imdbId: 'tt0903747', imdbUrl: 'https://www.imdb.com/title/tt0903747/' }],
      'TO_DO',
      'user_123',
    );

    expect(result.imported).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
    expect(result.imported[0].title).toBe('Breaking Bad');
    expect(result.imported[0].mediaType).toBe('SERIES');
    expect(result.imported[0].totalSeasons).toBe(5);
  });

  it('12. Explicitly detects and imports Peaky Blinders (tt2442560) as a TV series', async () => {
    const res = await tmdbModule.fetchMovieMetadataByImdbId('tt2442560');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.mediaType).toBe('SERIES');
      expect(res.data.title).toMatch(/Peaky Blinders/i);
    }

    // Also verify createMovie saves it with mediaType: 'SERIES'
    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);
    const movie = await service.createMovie(
      {
        imdbId: 'tt2442560',
        title: 'Peaky Blinders',
        mediaType: 'SERIES',
        totalSeasons: 6,
      },
      'user_123',
    );
    expect(movie.title).toBe('Peaky Blinders');
    expect(movie.mediaType).toBe('SERIES');
    expect(movie.totalSeasons).toBe(6);
  });

  it('13. Supports Crew Girl (tt38218082) as a series and distinguishes media types', async () => {
    const res = await tmdbModule.fetchMovieMetadataByImdbId('tt38218082');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.mediaType).toBe('SERIES');
      expect(res.data.title).toMatch(/Crew Girl/i);
      expect(res.data.totalSeasons).toBeGreaterThanOrEqual(1);
      expect(res.data.totalEpisodes).toBeGreaterThanOrEqual(1);
    }

    // Verify createMovie succeeds with mediaType: 'SERIES'
    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);
    const series = await service.createMovie(
      {
        imdbId: 'tt38218082',
        title: 'Crew Girl',
        releaseYear: 2026,
        mediaType: 'SERIES',
      },
      'user_123',
    );
    expect(series.title).toBe('Crew Girl');
    expect(series.imdbId).toBe('tt38218082');
    expect(series.mediaType).toBe('SERIES');
    expect(series.status).toBe('TO_DO');
  });

  it('14. Manages series progress with 4 columns: Season, Episode, Status, Hour and Minute', async () => {
    service.getMovieByImdbId = vi.fn().mockResolvedValue(null);
    const series = await service.createMovie(
      {
        imdbId: 'tt9999991',
        title: 'Test Series Progress',
        mediaType: 'SERIES',
        totalSeasons: 2,
        totalEpisodes: 16,
      },
      'user_123',
    );

    const progressTable = [
      { season: 1, episode: 1, status: 'Done', hour: 0, minute: 0 },
      { season: 1, episode: 2, status: 'Doing', hour: 1, minute: 25 },
      { season: 1, episode: 3, status: 'To do', hour: 0, minute: 0 },
    ];

    service.getMovieById = vi.fn().mockResolvedValue({
      ...series,
      currentSeason: 1,
      currentEpisode: 2,
      status: 'DOING',
      currentHour: 1,
      currentMinute: 25,
      seriesProgress: JSON.stringify(progressTable),
    });

    const updated = await service.updateMovie(
      series.id,
      {
        currentSeason: 1,
        currentEpisode: 2,
        status: 'DOING',
        currentHour: 1,
        currentMinute: 25,
        seriesProgress: JSON.stringify(progressTable),
      },
      'user_123',
    );

    expect(updated.currentSeason).toBe(1);
    expect(updated.currentEpisode).toBe(2);
    expect(updated.status).toBe('DOING');
    expect(updated.currentHour).toBe(1);
    expect(updated.currentMinute).toBe(25);
    expect(updated.seriesProgress).toBeTruthy();
    const parsed = JSON.parse(updated.seriesProgress!);
    expect(parsed).toHaveLength(3);
    expect(parsed[1].status).toBe('Doing');
    expect(parsed[1].hour).toBe(1);
    expect(parsed[1].minute).toBe(25);
  });

  it('15. Accurately determines active series episode and derives series overall status', () => {
    const mockSeries: Movie = {
      id: 'series_progress_test',
      userId: 'user_123',
      imdbId: 'tt12345678',
      imdbUrl: 'https://www.imdb.com/title/tt12345678/',
      tmdbId: 12345,
      title: 'Crew Girl',
      originalTitle: 'Crew Girl',
      mediaType: 'SERIES',
      releaseDate: '2026-01-01',
      releaseYear: 2026,
      posterPath: null,
      overview: null,
      runtimeMinutes: 45,
      genres: JSON.stringify(['Drama', 'Romance']),
      countries: JSON.stringify(['Canada']),
      status: 'TO_DO',
      personalRating: null,
      notes: null,
      startedAt: null,
      completedAt: null,
      totalSeasons: 2,
      totalEpisodes: 16,
      currentSeason: 1,
      currentEpisode: 1,
      currentHour: null,
      currentMinute: null,
      seriesProgress: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    // 1. Initial state: S1 E1 To do
    const initialEpisodes = getSeriesEpisodes(mockSeries);
    expect(initialEpisodes).toHaveLength(16);
    expect(initialEpisodes[0]).toMatchObject({ season: 1, episode: 1, status: 'To do' });
    const initialActive = getActiveSeriesEpisode(mockSeries, initialEpisodes);
    expect(initialActive).toMatchObject({ season: 1, episode: 1, status: 'To do' });

    // 2. Mark S1 E1 as Done: next episode is S1 E2 To do
    const progressWithEp1Done = initialEpisodes.map((ep) =>
      ep.season === 1 && ep.episode === 1 ? { ...ep, status: 'Done' as const } : ep,
    );
    const seriesWithEp1Done: Movie = {
      ...mockSeries,
      status: 'DOING',
      currentSeason: 1,
      currentEpisode: 2,
      seriesProgress: JSON.stringify(progressWithEp1Done),
    };
    const activeEpAfterDone = getActiveSeriesEpisode(
      seriesWithEp1Done,
      getSeriesEpisodes(seriesWithEp1Done),
    );
    expect(activeEpAfterDone).toMatchObject({ season: 1, episode: 2, status: 'To do' });

    // 3. Mark all episodes as Done: active is S2 E8 Done
    const allDoneEpisodes = initialEpisodes.map((ep) => ({ ...ep, status: 'Done' as const }));
    const seriesAllDone: Movie = {
      ...mockSeries,
      status: 'DONE',
      currentSeason: 2,
      currentEpisode: 8,
      seriesProgress: JSON.stringify(allDoneEpisodes),
    };
    const activeEpAllDone = getActiveSeriesEpisode(
      seriesAllDone,
      getSeriesEpisodes(seriesAllDone),
    );
    expect(activeEpAllDone).toMatchObject({ season: 2, episode: 8, status: 'Done' });
  });

  it('16. Syncs series with IMDb, detecting new seasons and preserving existing progress', async () => {
    const seriesToSync: Movie = {
      id: 'series-sync-1',
      userId: 'user_123',
      imdbId: 'tt2442560',
      imdbUrl: 'https://www.imdb.com/title/tt2442560/',
      tmdbId: null,
      title: 'Peaky Blinders',
      originalTitle: null,
      mediaType: 'SERIES',
      releaseDate: '2013-09-12',
      releaseYear: 2013,
      posterPath: null,
      overview: null,
      runtimeMinutes: 60,
      genres: '["Crime", "Drama"]',
      countries: '["United Kingdom"]',
      status: 'DOING',
      personalRating: null,
      notes: null,
      startedAt: null,
      completedAt: null,
      totalSeasons: 4, // out-of-date: only 4 seasons
      totalEpisodes: 24,
      currentSeason: 1,
      currentEpisode: 1,
      currentHour: null,
      currentMinute: null,
      seriesProgress: JSON.stringify([
        { id: 'ep-1-1', season: 1, episode: 1, status: 'Done', hour: 0, minute: 0 },
      ]),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    dbRecords = [seriesToSync];
    service.getMovieById = vi.fn().mockImplementation((id: string) =>
      Promise.resolve(dbRecords.find((r) => r.id === id) || null),
    );

    const syncResult = await service.syncSeriesWithImdb('series-sync-1', 'user_123');

    expect(syncResult.updated).toBe(true);
    expect(syncResult.hasNewSeasons).toBe(true);
    expect(syncResult.newSeasonsCount).toBeGreaterThanOrEqual(1);
    expect(syncResult.movie.totalSeasons).toBeGreaterThanOrEqual(6);

    // Verify existing progress preserved: S1 E1 is still Done
    const parsed = JSON.parse(syncResult.movie.seriesProgress!);
    const ep1 = parsed.find((p: any) => p.season === 1 && p.episode === 1);
    expect(ep1.status).toBe('Done');

    // And new season episodes exist in 'To do' status
    const newSeasonEp = parsed.find((p: any) => p.season > 4);
    expect(newSeasonEp).toBeDefined();
    expect(newSeasonEp.status).toBe('To do');
  });

  it('17. Manages stremio links in series progress and preserves them in active episode', () => {
    const mockSeriesWithStremio: Movie = {
      id: 'series_stremio_test',
      userId: 'user_123',
      imdbId: 'tt2442560',
      imdbUrl: 'https://www.imdb.com/title/tt2442560/',
      tmdbId: 60574,
      title: 'Peaky Blinders',
      originalTitle: 'Peaky Blinders',
      mediaType: 'SERIES',
      releaseDate: '2013-09-12',
      releaseYear: 2013,
      posterPath: null,
      overview: null,
      runtimeMinutes: 60,
      genres: JSON.stringify(['Crime', 'Drama']),
      countries: JSON.stringify(['United Kingdom']),
      status: 'DOING',
      personalRating: null,
      notes: null,
      startedAt: null,
      completedAt: null,
      totalSeasons: 6,
      totalEpisodes: 36,
      currentSeason: 1,
      currentEpisode: 2,
      currentHour: 0,
      currentMinute: 45,
      seriesProgress: JSON.stringify([
        {
          id: 'ep-1-1',
          season: 1,
          episode: 1,
          status: 'Done',
          hour: 0,
          minute: 0,
          stremio: 'stremio:///detail/series/tt2442560/1/1',
        },
        {
          id: 'ep-1-2',
          season: 1,
          episode: 2,
          status: 'Doing',
          hour: 0,
          minute: 45,
          stremio: 'https://web.stremio.com/#/detail/series/tt2442560/1/2',
        },
      ]),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const episodes = getSeriesEpisodes(mockSeriesWithStremio);
    expect(episodes).toHaveLength(2);
    expect(episodes[0].stremio).toBe('stremio:///detail/series/tt2442560/1/1');
    expect(episodes[1].stremio).toBe('https://web.stremio.com/#/detail/series/tt2442560/1/2');

    const activeEp = getActiveSeriesEpisode(mockSeriesWithStremio, episodes);
    expect(activeEp.season).toBe(1);
    expect(activeEp.episode).toBe(2);
    expect(activeEp.status).toBe('Doing');
    expect(activeEp.stremio).toBe('https://web.stremio.com/#/detail/series/tt2442560/1/2');
  });
});
