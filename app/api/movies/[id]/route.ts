import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { movieService } from '@/lib/movies/service';
import { updateMovieSchema } from '@/lib/validation';

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await Promise.resolve(props.params);
    const movie = await movieService.getMovieById(params.id, user.userId);

    if (!movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({ movie });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch movie' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await Promise.resolve(props.params);
    const body = await request.json();
    const parsed = updateMovieSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const updated = await movieService.updateMovie(
      params.id,
      parsed.data,
      user.userId,
    );

    return NextResponse.json({ movie: updated });
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update movie' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await Promise.resolve(props.params);
    const deleted = await movieService.deleteMovie(params.id, user.userId);

    if (!deleted) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete movie' },
      { status: 500 },
    );
  }
}
