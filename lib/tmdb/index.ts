/**
 * TMDB API client for metadata retrieval.
 * Uses TMDB Find by ID with external_source=imdb_id.
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

export async function fetchMovieMetadataByImdbId(
  imdbId: string,
  apiKeyOrToken?: string | null,
): Promise<FetchMetadataResult> {
  const canonicalUrl = `https://www.imdb.com/title/${imdbId}/`;
  const token =
    apiKeyOrToken ||
    process.env.TMDB_API_KEY ||
    process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
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

    // Check for TV shows or unsupported types
    const hasTv =
      (data.tv_results && data.tv_results.length > 0) ||
      (data.tv_episode_results && data.tv_episode_results.length > 0) ||
      (data.tv_season_results && data.tv_season_results.length > 0);

    const movie = data.movie_results?.[0];

    if (!movie && hasTv) {
      return {
        success: false,
        error:
          'This IMDb ID belongs to a TV series, season, or episode. Movie Watchlist Manager supports movies only.',
        isUnsupportedType: true,
        canFallbackToManual: false,
      };
    }

    if (!movie) {
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
