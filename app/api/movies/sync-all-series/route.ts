import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { movieService } from '@/lib/movies/service';

export async function POST(_request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await movieService.syncAllSeriesWithImdb(user.userId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to sync series collection with IMDb' },
      { status: 500 },
    );
  }
}
