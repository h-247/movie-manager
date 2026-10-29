import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { parseBulkImdbInput } from '@/lib/imdb';
import { movieService } from '@/lib/movies/service';
import { checkImdbTitleType } from '@/lib/tmdb';
import { bulkImportInputSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: any = await request.json();
    const parsed = bulkImportInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please enter at least one valid IMDb link' },
        { status: 400 },
      );
    }

    const isPreviewOnly = body.previewOnly === true;
    const items = parseBulkImdbInput(parsed.data.content);

    // If preview only, check each valid item against existing movies and verify title type
    if (isPreviewOnly) {
      const previewItems = await Promise.all(
        items.map(async (item) => {
          if (!item.parsed || item.isDuplicateInInput) {
            return {
              ...item,
              isAlreadyInCollection: false,
            };
          }

          // Check title type and title info
          const titleCheck = await checkImdbTitleType(item.parsed.imdbId);
          const existing = await movieService.getMovieByImdbId(
            item.parsed.imdbId,
            user.userId,
          );
          return {
            ...item,
            mediaType: titleCheck.mediaType,
            detectedTitle: titleCheck.title,
            isAlreadyInCollection: !!existing,
            existingTitle: existing?.title,
          };
        }),
      );

      return NextResponse.json({ items: previewItems });
    }

    // Filter to valid and unique-within-input
    const validItems = items
      .filter((item) => item.parsed !== null && !item.isDuplicateInInput)
      .map((item) => item.parsed!);

    const result = await movieService.bulkImportMovies(
      validItems,
      parsed.data.defaultStatus,
      user.userId,
    );

    return NextResponse.json({
      summary: {
        totalLines: items.length,
        importedCount: result.imported.length,
        skippedCount: result.skipped.length,
        failedCount: result.failed.length,
      },
      imported: result.imported,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process bulk import' },
      { status: 500 },
    );
  }
}
