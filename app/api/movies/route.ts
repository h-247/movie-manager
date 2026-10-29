import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { movieService } from '@/lib/movies/service';
import { createMovieSchema, movieQuerySchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = movieQuerySchema.safeParse({
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
      genre: searchParams.get('genre') || undefined,
      year: searchParams.get('year') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsedQuery.error.format() },
        { status: 400 },
      );
    }

    const moviesList = await movieService.getMovies({
      userId: user.userId,
      status: parsedQuery.data.status,
      mediaType: parsedQuery.data.type,
      search: parsedQuery.data.search,
      genre: parsedQuery.data.genre,
      year: parsedQuery.data.year,
      sortBy: parsedQuery.data.sortBy,
    });

    return NextResponse.json({ movies: moviesList });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch movies' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createMovieSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const movie = await movieService.createMovie(parsed.data, user.userId);
    return NextResponse.json({ movie }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'UNSUPPORTED_TITLE_TYPE') {
      return NextResponse.json(
        {
          error: error.message,
          isUnsupportedType: true,
          code: 'UNSUPPORTED_TITLE_TYPE',
        },
        { status: 400 },
      );
    }

    if (error.code === 'DUPLICATE_MOVIE') {
      return NextResponse.json(
        {
          error: error.message,
          existingMovie: error.existingMovie,
          code: 'DUPLICATE_MOVIE',
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create movie' },
      { status: 500 },
    );
  }
}
