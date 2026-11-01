import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { movieService } from '@/lib/movies/service';

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await Promise.resolve(props.params);
    const result = await movieService.syncSeriesWithImdb(params.id, user.userId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to sync series with IMDb' },
      { status: 500 },
    );
  }
}
