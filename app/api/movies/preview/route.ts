import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { parseImdbInput } from '@/lib/imdb';
import { movieService } from '@/lib/movies/service';
import { fetchMovieMetadataByImdbId } from '@/lib/tmdb';
import { previewInputSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedInput = previewInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json(
        { error: 'Please enter a valid IMDb URL or title ID' },
        { status: 400 },
      );
    }

    const parsedImdb = parseImdbInput(parsedInput.data.input);
    if (!parsedImdb) {
      return NextResponse.json(
        {
          error:
            'Invalid IMDb link or ID. Please provide a link like "https://www.imdb.com/title/tt0111161/" or ID like "tt0111161".',
        },
        { status: 400 },
      );
    }

    // Check if duplicate in user collection
    const existing = await movieService.getMovieByImdbId(
      parsedImdb.imdbId,
      user.userId,
    );

    // Fetch metadata from TMDB
    const metaResult = await fetchMovieMetadataByImdbId(parsedImdb.imdbId);

    return NextResponse.json({
      parsed: parsedImdb,
      isExisting: !!existing,
      existingMovie: existing,
      metadata: metaResult.success ? metaResult.data : null,
      error: !metaResult.success ? metaResult.error : null,
      isUnsupportedType: !metaResult.success && !!metaResult.isUnsupportedType,
      canFallbackToManual: !metaResult.success && !!metaResult.canFallbackToManual,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to preview movie metadata' },
      { status: 500 },
    );
  }
}
