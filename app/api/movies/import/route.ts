import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { movieService } from '@/lib/movies/service';
import { importCollectionSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = importCollectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid collection JSON format', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { movies: items, overwriteExisting } = parsed.data;
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const item of items) {
      const existing = await movieService.getMovieByImdbId(
        item.imdbId,
        user.userId,
      );

      if (existing) {
        if (overwriteExisting) {
          try {
            await movieService.updateMovie(existing.id, item, user.userId);
            updatedCount++;
          } catch {
            failedCount++;
          }
        } else {
          skippedCount++;
        }
      } else {
        try {
          await movieService.createMovie(item, user.userId);
          importedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    return NextResponse.json({
      summary: {
        total: items.length,
        importedCount,
        updatedCount,
        skippedCount,
        failedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to import collection' },
      { status: 500 },
    );
  }
}
