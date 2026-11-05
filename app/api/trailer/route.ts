import { NextResponse } from 'next/server';
import { resolveBestTrailerUrl } from '@/lib/trailer';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || '';
    const year = searchParams.get('year') || '';

    if (!title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const url = await resolveBestTrailerUrl(title, year);
    const videoIdMatch = url.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    return NextResponse.json({
      success: true,
      videoId,
      url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to resolve trailer URL' },
      { status: 500 },
    );
  }
}
