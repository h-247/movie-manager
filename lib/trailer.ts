const trailerCache = new Map<string, string>();

/**
 * Resolves the best direct YouTube trailer URL (e.g. https://www.youtube.com/watch?v=...)
 * by querying YouTube search results and extracting the first video ID.
 */
export async function resolveBestTrailerUrl(
  title: string,
  year?: string | number | null,
): Promise<string> {
  const cleanTitle = title.trim();
  const cleanYear = year ? String(year).trim() : '';
  const query = `${cleanTitle}${cleanYear ? ` ${cleanYear}` : ''} official trailer`;
  const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  if (!cleanTitle) return fallbackUrl;

  const cacheKey = `${cleanTitle.toLowerCase()}-${cleanYear}`;
  if (trailerCache.has(cacheKey)) {
    return `https://www.youtube.com/watch?v=${trailerCache.get(cacheKey)}`;
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      },
    );

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) {
        const videoId = match[1];
        trailerCache.set(cacheKey, videoId);
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
  } catch {
    // Fallback to search results URL on network error
  }

  return fallbackUrl;
}

/**
 * Opens the best YouTube trailer for a given movie/series title.
 * Queries the trailer API to resolve directly to https://www.youtube.com/watch?v=...
 * instead of the search results page.
 */
export async function openBestTrailer(title: string, year?: number | null): Promise<void> {
  if (typeof window === 'undefined') return;

  const cleanTitle = title.trim();
  const cleanYear = year ? String(year).trim() : '';
  const query = encodeURIComponent(
    `${cleanTitle}${cleanYear ? ` ${cleanYear}` : ''} official trailer`,
  );
  const fallbackUrl = `https://www.youtube.com/results?search_query=${query}`;

  // Open window immediately in user-click context to prevent popup blockers
  const newTab = window.open('about:blank', '_blank');

  try {
    const params = new URLSearchParams({
      title: cleanTitle,
      year: cleanYear,
    });

    const res = await fetch(`/api/trailer?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data?.url && newTab) {
        newTab.location.href = data.url;
        return;
      }
    }
  } catch {
    // fallback to search page
  }

  if (newTab) {
    newTab.location.href = fallbackUrl;
  }
}
