/**
 * TMDB API client for metadata retrieval.
 * Uses TMDB Find by ID with external_source=imdb_id,
 * with upfront title type validation for TV series & non-movie content.
 */

export interface MovieMetadata {
  imdbId: string;
  imdbUrl: string;
  tmdbId: number | null;
  title: string;
  originalTitle: string | null;
  mediaType: 'MOVIE' | 'SERIES';
  releaseDate: string | null;
  releaseYear: number | null;
  posterPath: string | null;
  overview: string | null;
  runtimeMinutes: number | null;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
  genres: string[];
}

export type FetchMetadataResult =
  | { success: true; data: MovieMetadata }
  | {
      success: false;
      error: string;
      isUnsupportedType?: boolean;
      canFallbackToManual?: boolean;
      unsupportedTitleInfo?: {
        title?: string;
        year?: number;
        posterUrl?: string;
        typeName?: string;
      };
    };

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

export function getFullPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  return `${TMDB_IMAGE_BASE_URL}${posterPath.startsWith('/') ? '' : '/'}${posterPath}`;
}

const TMDB_GENRE_MAP: Record<number, string> = {
  12: 'Adventure',
  14: 'Fantasy',
  16: 'Animation',
  18: 'Drama',
  27: 'Horror',
  28: 'Action',
  35: 'Comedy',
  36: 'History',
  37: 'Western',
  53: 'Thriller',
  80: 'Crime',
  878: 'Science Fiction',
  9648: 'Mystery',
  10402: 'Music',
  10749: 'Romance',
  10751: 'Family',
  10752: 'War',
  10770: 'TV Movie',
};

/**
 * Checks whether an IMDb ID is a movie or series using IMDb's public suggestion endpoint.
 */
export interface ImdbTitleInfo {
  isKnown: boolean;
  isMovie: boolean;
  isSeries: boolean;
  mediaType: 'MOVIE' | 'SERIES';
  title?: string;
  originalTitle?: string;
  year?: number;
  releaseDate?: string;
  posterUrl?: string;
  typeName?: string;
  overview?: string;
  runtimeMinutes?: number;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
  genres?: string[];
}

export async function checkImdbTitleType(imdbId: string): Promise<ImdbTitleInfo> {
  // 1. Try IMDb's GraphQL service for detailed title metadata including seasons & episodes
  try {
    const query = `
      query TitleDetails($id: ID!) {
        title(id: $id) {
          id
          titleText { text }
          originalTitleText { text }
          titleType { id text isSeries }
          releaseYear { year }
          releaseDate { day month year }
          primaryImage { url }
          genres { genres { text } }
          plot { plotText { plainText } }
          runtime { seconds }
          episodes {
            episodes(first: 1) { total }
            seasons { number }
          }
        }
      }
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const gqlRes = await fetch('https://api.graphql.imdb.com/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/json',
        'x-imdb-client-name': 'imdb-web-next',
      },
      body: JSON.stringify({ query, variables: { id: imdbId } }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (gqlRes.ok) {
      const gqlData: any = await gqlRes.json();
      const t = gqlData.data?.title;
      if (t) {
        const isSeries = Boolean(
          t.titleType?.isSeries ||
            t.titleType?.id === 'tvSeries' ||
            t.titleType?.id === 'tvMiniSeries' ||
            t.titleType?.id === 'tvSpecial',
        );
        const mediaType: 'MOVIE' | 'SERIES' = isSeries ? 'SERIES' : 'MOVIE';

        let releaseDate: string | undefined = undefined;
        if (t.releaseDate?.year && t.releaseDate?.month && t.releaseDate?.day) {
          const m = String(t.releaseDate.month).padStart(2, '0');
          const d = String(t.releaseDate.day).padStart(2, '0');
          releaseDate = `${t.releaseDate.year}-${m}-${d}`;
        }

        const seasonsList = t.episodes?.seasons;
        let totalSeasons: number | null = null;
        if (Array.isArray(seasonsList) && seasonsList.length > 0) {
          const valid = seasonsList.filter(
            (s: any) => typeof s.number === 'number' && s.number > 0,
          );
          totalSeasons = valid.length || seasonsList.length;
        }

        const totalEpisodes: number | null = t.episodes?.episodes?.total ?? null;

        const genres = Array.isArray(t.genres?.genres)
          ? t.genres.genres.map((g: any) => g.text).filter(Boolean)
          : [];

        return {
          isKnown: true,
          isMovie: !isSeries,
          isSeries,
          mediaType,
          title: t.titleText?.text || t.originalTitleText?.text,
          originalTitle: t.originalTitleText?.text,
          year: t.releaseYear?.year,
          releaseDate,
          posterUrl: t.primaryImage?.url,
          typeName: t.titleType?.text || (isSeries ? 'TV Series' : 'Movie'),
          overview: t.plot?.plotText?.plainText,
          runtimeMinutes: t.runtime?.seconds
            ? Math.round(t.runtime.seconds / 60)
            : undefined,
          totalSeasons,
          totalEpisodes,
          genres,
        };
      }
    }
  } catch {
    // Fallback below
  }

  // 2. Fallback to IMDb suggestions endpoint + TVMaze for seasons/episodes
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://v2.sg.media-imdb.com/suggests/t/${encodeURIComponent(imdbId.toLowerCase())}.json`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: '*/*',
        },
      },
    );
    clearTimeout(timeout);

    if (!res.ok) return { isKnown: false, isMovie: true, isSeries: false, mediaType: 'MOVIE' };

    const text = await res.text();
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    if (start === -1 || end === -1) return { isKnown: false, isMovie: true, isSeries: false, mediaType: 'MOVIE' };

    const data = JSON.parse(text.substring(start + 1, end));
    const items = data?.d;
    if (!Array.isArray(items) || items.length === 0) {
      return { isKnown: false, isMovie: true, isSeries: false, mediaType: 'MOVIE' };
    }

    const exact = items.find(
      (item: any) => item.id && item.id.toLowerCase() === imdbId.toLowerCase(),
    );
    if (!exact) {
      return { isKnown: false, isMovie: true, isSeries: false, mediaType: 'MOVIE' };
    }

    const qid = (exact.qid || '').toLowerCase();
    const q = (exact.q || '').toLowerCase();

    const isTvMovie = qid.includes('tvmovie') || q.includes('tv movie');
    const isSeries =
      !isTvMovie &&
      (qid.includes('tv') ||
        qid.includes('series') ||
        qid.includes('miniseries') ||
        q.includes('tv') ||
        q.includes('series') ||
        q.includes('show'));

    const mediaType: 'MOVIE' | 'SERIES' = isSeries ? 'SERIES' : 'MOVIE';

    let totalSeasons: number | null = null;
    let totalEpisodes: number | null = null;

    if (isSeries) {
      try {
        const tvMazeRes = await fetch(
          `https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(imdbId)}`,
          { headers: { 'User-Agent': 'MovieWatchlist/1.0' } },
        );
        if (tvMazeRes.ok) {
          const tvData: any = await tvMazeRes.json();
          const sRes = await fetch(
            `https://api.tvmaze.com/shows/${tvData.id}/seasons`,
          );
          if (sRes.ok) {
            const seasons: any[] = await sRes.json();
            totalSeasons = seasons.length;
            totalEpisodes = seasons.reduce(
              (acc, s) => acc + (s.episodeOrder || 0),
              0,
            );
          }
        }
      } catch {
        // ignore
      }
    }

    return {
      isKnown: true,
      isMovie: !isSeries,
      isSeries,
      mediaType,
      title: exact.l,
      year: exact.y,
      posterUrl: Array.isArray(exact.i) && exact.i[0] ? exact.i[0] : undefined,
      typeName: exact.q || exact.qid,
      totalSeasons,
      totalEpisodes,
    };
  } catch {
    return { isKnown: false, isMovie: true, isSeries: false, mediaType: 'MOVIE' };
  }
}

export async function fetchMovieMetadataByImdbId(
  imdbId: string,
  apiKeyOrToken?: string | null,
): Promise<FetchMetadataResult> {
  const canonicalUrl = `https://www.imdb.com/title/${imdbId}/`;

  const imdbInfo = await checkImdbTitleType(imdbId);

  const token =
    apiKeyOrToken ||
    process.env.TMDB_API_KEY ||
    process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
    // If no TMDB token, return rich metadata retrieved from IMDb directly
    if (imdbInfo.isKnown && imdbInfo.title) {
      return {
        success: true,
        data: {
          imdbId,
          imdbUrl: canonicalUrl,
          tmdbId: null,
          title: imdbInfo.title,
          originalTitle: imdbInfo.originalTitle || null,
          mediaType: imdbInfo.mediaType,
          releaseDate: imdbInfo.releaseDate || (imdbInfo.year ? `${imdbInfo.year}-01-01` : null),
          releaseYear: imdbInfo.year || null,
          posterPath: imdbInfo.posterUrl || null,
          overview: imdbInfo.overview || null,
          runtimeMinutes: imdbInfo.runtimeMinutes || null,
          totalSeasons: imdbInfo.totalSeasons ?? null,
          totalEpisodes: imdbInfo.totalEpisodes ?? null,
          genres: imdbInfo.genres || [],
        },
      };
    }

    return {
      success: false,
      error: 'TMDB API key is not configured on the server.',
      canFallbackToManual: true,
    };
  }

  // TMDB supports v3 API key via query parameter or Bearer token
  const isBearer = token.length > 50 || token.startsWith('ey');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (isBearer) {
    headers.Authorization = `Bearer ${token}`;
  }

  const findUrl = new URL(`https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}`);
  findUrl.searchParams.set('external_source', 'imdb_id');
  findUrl.searchParams.set('language', 'en-US');
  if (!isBearer) {
    findUrl.searchParams.set('api_key', token);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(findUrl.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: 'TMDB API authentication failed. Please verify the API key.',
        canFallbackToManual: true,
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        error: 'TMDB API rate limit exceeded. Please try again shortly.',
        canFallbackToManual: true,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `TMDB API returned error status ${response.status}.`,
        canFallbackToManual: true,
      };
    }

    const data: any = await response.json();

    const movie = data.movie_results?.[0];
    const tv = data.tv_results?.[0];

    // 1. If TV series match found
    if (tv && (!movie || imdbInfo.isSeries)) {
      const tmdbId = tv.id;
      let totalSeasons: number | null = null;
      let totalEpisodes: number | null = null;
      let runtimeMinutes: number | null = null;
      let genres: string[] = [];

      if (Array.isArray(tv.genre_ids)) {
        genres = tv.genre_ids
          .map((id: number) => TMDB_GENRE_MAP[id])
          .filter(Boolean);
      }

      // Fetch full TV series details
      try {
        const detailUrl = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
        detailUrl.searchParams.set('language', 'en-US');
        if (!isBearer) {
          detailUrl.searchParams.set('api_key', token);
        }

        const detailCtrl = new AbortController();
        const detailTimeout = setTimeout(() => detailCtrl.abort(), 4000);
        const detailRes = await fetch(detailUrl.toString(), {
          headers,
          signal: detailCtrl.signal,
        });
        clearTimeout(detailTimeout);

        if (detailRes.ok) {
          const detailData: any = await detailRes.json();
          if (typeof detailData.number_of_seasons === 'number') {
            totalSeasons = detailData.number_of_seasons;
          }
          if (typeof detailData.number_of_episodes === 'number') {
            totalEpisodes = detailData.number_of_episodes;
          }
          if (Array.isArray(detailData.episode_run_time) && detailData.episode_run_time[0]) {
            runtimeMinutes = detailData.episode_run_time[0];
          }
          if (Array.isArray(detailData.genres) && detailData.genres.length > 0) {
            genres = detailData.genres.map((g: any) => g.name).filter(Boolean);
          }
        }
      } catch {
        // ignore secondary lookup error
      }

      const releaseDate = tv.first_air_date || null;
      let releaseYear: number | null = imdbInfo.year || null;
      if (releaseDate && typeof releaseDate === 'string') {
        const parsedYear = parseInt(releaseDate.substring(0, 4), 10);
        if (!isNaN(parsedYear)) {
          releaseYear = parsedYear;
        }
      }

      return {
        success: true,
        data: {
          imdbId,
          imdbUrl: canonicalUrl,
          tmdbId: typeof tmdbId === 'number' ? tmdbId : null,
          title: tv.name || tv.original_name || imdbInfo.title || 'Untitled Series',
          originalTitle: tv.original_name || null,
          mediaType: 'SERIES',
          releaseDate,
          releaseYear,
          posterPath: tv.poster_path ? getFullPosterUrl(tv.poster_path) : imdbInfo.posterUrl || null,
          overview: tv.overview || null,
          runtimeMinutes: runtimeMinutes || imdbInfo.runtimeMinutes || null,
          totalSeasons: totalSeasons ?? imdbInfo.totalSeasons ?? null,
          totalEpisodes: totalEpisodes ?? imdbInfo.totalEpisodes ?? null,
          genres: genres.length > 0 ? genres : (imdbInfo.genres || []),
        },
      };
    }

    // 2. If Movie match found
    if (movie) {
      const tmdbId = movie.id;
      let runtimeMinutes: number | null = null;
      let genres: string[] = [];

      if (Array.isArray(movie.genre_ids)) {
        genres = movie.genre_ids
          .map((id: number) => TMDB_GENRE_MAP[id])
          .filter(Boolean);
      }

      // Try fetching full movie details
      try {
        const detailUrl = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
        detailUrl.searchParams.set('language', 'en-US');
        if (!isBearer) {
          detailUrl.searchParams.set('api_key', token);
        }

        const detailCtrl = new AbortController();
        const detailTimeout = setTimeout(() => detailCtrl.abort(), 4000);
        const detailRes = await fetch(detailUrl.toString(), {
          headers,
          signal: detailCtrl.signal,
        });
        clearTimeout(detailTimeout);

        if (detailRes.ok) {
          const detailData: any = await detailRes.json();
          if (typeof detailData.runtime === 'number' && detailData.runtime > 0) {
            runtimeMinutes = detailData.runtime;
          }
          if (Array.isArray(detailData.genres) && detailData.genres.length > 0) {
            genres = detailData.genres.map((g: any) => g.name).filter(Boolean);
          }
        }
      } catch {
        // ignore secondary lookup error
      }

      const releaseDate = movie.release_date || null;
      let releaseYear: number | null = null;
      if (releaseDate && typeof releaseDate === 'string') {
        const parsedYear = parseInt(releaseDate.substring(0, 4), 10);
        if (!isNaN(parsedYear)) {
          releaseYear = parsedYear;
        }
      }

      return {
        success: true,
        data: {
          imdbId,
          imdbUrl: canonicalUrl,
          tmdbId: typeof tmdbId === 'number' ? tmdbId : null,
          title: movie.title || movie.original_title || 'Untitled',
          originalTitle: movie.original_title || null,
          mediaType: 'MOVIE',
          releaseDate,
          releaseYear,
          posterPath: movie.poster_path ? getFullPosterUrl(movie.poster_path) : imdbInfo.posterUrl || null,
          overview: movie.overview || null,
          runtimeMinutes,
          totalSeasons: null,
          totalEpisodes: null,
          genres,
        },
      };
    }

    // 3. Fallback to IMDb basic info if available
    if (imdbInfo.isKnown && imdbInfo.title) {
      return {
        success: true,
        data: {
          imdbId,
          imdbUrl: canonicalUrl,
          tmdbId: null,
          title: imdbInfo.title,
          originalTitle: imdbInfo.originalTitle || null,
          mediaType: imdbInfo.mediaType,
          releaseDate: imdbInfo.releaseDate || (imdbInfo.year ? `${imdbInfo.year}-01-01` : null),
          releaseYear: imdbInfo.year || null,
          posterPath: imdbInfo.posterUrl || null,
          overview: imdbInfo.overview || null,
          runtimeMinutes: imdbInfo.runtimeMinutes || null,
          totalSeasons: imdbInfo.totalSeasons ?? null,
          totalEpisodes: imdbInfo.totalEpisodes ?? null,
          genres: imdbInfo.genres || [],
        },
      };
    }

    return {
      success: false,
      error: 'No movie or series found for this IMDb ID on TMDB.',
      canFallbackToManual: true,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'TMDB API request timed out.',
        canFallbackToManual: true,
      };
    }
    return {
      success: false,
      error: err.message || 'Failed to communicate with TMDB API.',
      canFallbackToManual: true,
    };
  }
}
