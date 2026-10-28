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
  releaseDate: string | null;
  releaseYear: number | null;
  posterPath: string | null;
  overview: string | null;
  runtimeMinutes: number | null;
  genres: string[];
}

export type FetchMetadataResult =
  | { success: true; data: MovieMetadata }
  | {
      success: false;
      error: string;
      isUnsupportedType?: boolean;
      canFallbackToManual?: boolean;
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
 * Checks whether an IMDb ID is a movie or an unsupported type (TV series, episode, game, etc.)
 * using IMDb's public suggestion endpoint.
 */
export async function checkImdbTitleType(imdbId: string): Promise<{
  isKnown: boolean;
  isMovie: boolean;
  title?: string;
  year?: number;
  posterUrl?: string;
  typeName?: string;
}> {
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

    if (!res.ok) return { isKnown: false, isMovie: true };

    const text = await res.text();
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    if (start === -1 || end === -1) return { isKnown: false, isMovie: true };

    const data = JSON.parse(text.substring(start + 1, end));
    const items = data?.d;
    if (!Array.isArray(items) || items.length === 0) {
      return { isKnown: false, isMovie: true };
    }

    const exact = items.find(
      (item: any) => item.id && item.id.toLowerCase() === imdbId.toLowerCase(),
    );
    if (!exact) {
      return { isKnown: false, isMovie: true };
    }

    const qid = (exact.qid || '').toLowerCase();
    const q = (exact.q || '').toLowerCase();

    const isTvOrUnsupported =
      qid.includes('tv') ||
      qid.includes('series') ||
      qid.includes('episode') ||
      qid.includes('podcast') ||
      qid.includes('game') ||
      q.includes('tv') ||
      q.includes('series') ||
      q.includes('episode') ||
      q.includes('game') ||
      q.includes('podcast');

    return {
      isKnown: true,
      isMovie: !isTvOrUnsupported,
      title: exact.l,
      year: exact.y,
      posterUrl: Array.isArray(exact.i) && exact.i[0] ? exact.i[0] : undefined,
      typeName: exact.q || exact.qid,
    };
  } catch {
    return { isKnown: false, isMovie: true };
  }
}

export async function fetchMovieMetadataByImdbId(
  imdbId: string,
  apiKeyOrToken?: string | null,
): Promise<FetchMetadataResult> {
  const canonicalUrl = `https://www.imdb.com/title/${imdbId}/`;

  // Always check title type first (handles TV series / episodes / podcasts / games immediately)
  const imdbInfo = await checkImdbTitleType(imdbId);
  if (imdbInfo.isKnown && !imdbInfo.isMovie) {
    const titleLabel = imdbInfo.title ? ` (${imdbInfo.title})` : '';
    const typeLabel = imdbInfo.typeName ? ` a ${imdbInfo.typeName}` : ' a TV series';
    return {
      success: false,
      error: `This IMDb ID belongs to${typeLabel}${titleLabel}. Movie Watchlist Manager supports movies only.`,
      isUnsupportedType: true,
      canFallbackToManual: false,
    };
  }

  const token =
    apiKeyOrToken ||
    process.env.TMDB_API_KEY ||
    process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
    // If no TMDB token, but we have movie metadata from IMDb suggestion endpoint, return it
    if (imdbInfo.isKnown && imdbInfo.isMovie && imdbInfo.title) {
      return {
        success: true,
        data: {
          imdbId,
          imdbUrl: canonicalUrl,
          tmdbId: null,
          title: imdbInfo.title,
          originalTitle: null,
          releaseDate: imdbInfo.year ? `${imdbInfo.year}-01-01` : null,
          releaseYear: imdbInfo.year || null,
          posterPath: imdbInfo.posterUrl || null,
          overview: null,
          runtimeMinutes: null,
          genres: [],
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

    // Check for TV shows or unsupported types from TMDB response
    const hasTv =
      (data.tv_results && data.tv_results.length > 0) ||
      (data.tv_episode_results && data.tv_episode_results.length > 0) ||
      (data.tv_season_results && data.tv_season_results.length > 0);

    const movie = data.movie_results?.[0];

    if (!movie && hasTv) {
      const tvTitle = data.tv_results?.[0]?.name || imdbInfo.title;
      return {
        success: false,
        error: `This IMDb ID belongs to a TV series${tvTitle ? ` (${tvTitle})` : ''}. Movie Watchlist Manager supports movies only.`,
        isUnsupportedType: true,
        canFallbackToManual: false,
      };
    }

    if (!movie) {
      // Fallback to IMDb basic info if available
      if (imdbInfo.isKnown && imdbInfo.isMovie && imdbInfo.title) {
        return {
          success: true,
          data: {
            imdbId,
            imdbUrl: canonicalUrl,
            tmdbId: null,
            title: imdbInfo.title,
            originalTitle: null,
            releaseDate: imdbInfo.year ? `${imdbInfo.year}-01-01` : null,
            releaseYear: imdbInfo.year || null,
            posterPath: imdbInfo.posterUrl || null,
            overview: null,
            runtimeMinutes: null,
            genres: [],
          },
        };
      }

      return {
        success: false,
        error: 'No movie found for this IMDb ID on TMDB.',
        canFallbackToManual: true,
      };
    }

    // Found movie in find endpoint. Let's extract basic fields.
    const tmdbId = movie.id;
    let runtimeMinutes: number | null = null;
    let genres: string[] = [];

    if (Array.isArray(movie.genre_ids)) {
      genres = movie.genre_ids
        .map((id: number) => TMDB_GENRE_MAP[id])
        .filter(Boolean);
    }

    // Try fetching full movie details for runtime & full genre names
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
      // Ignore secondary detail lookup error, we already have basic movie data
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
        releaseDate,
        releaseYear,
        posterPath: movie.poster_path || null,
        overview: movie.overview || null,
        runtimeMinutes,
        genres,
      },
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
