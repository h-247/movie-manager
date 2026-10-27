import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { movieService } from '@/lib/movies/service';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const moviesList = await movieService.getMovies({
      userId: user.userId,
      sortBy: 'added_asc',
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: 1,
      totalMovies: moviesList.length,
      movies: moviesList.map((m) => {
        let parsedGenres = [];
        try {
          if (m.genres) parsedGenres = JSON.parse(m.genres);
        } catch {
          // ignore
        }
        return {
          imdbId: m.imdbId,
          imdbUrl: m.imdbUrl,
          tmdbId: m.tmdbId,
          title: m.title,
          originalTitle: m.originalTitle,
          releaseDate: m.releaseDate,
          releaseYear: m.releaseYear,
          posterPath: m.posterPath,
          overview: m.overview,
          runtimeMinutes: m.runtimeMinutes,
          genres: parsedGenres,
          status: m.status,
          personalRating: m.personalRating,
          notes: m.notes,
          startedAt: m.startedAt,
          completedAt: m.completedAt,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        };
      }),
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="watchlist-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to export watchlist' },
      { status: 500 },
    );
  }
}
