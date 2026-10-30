import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { movieGenres, movies } from '@/db/schema';
import { asc, sql } from 'drizzle-orm';

export const DEFAULT_MOVIE_GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Sport',
  'Thriller',
  'War',
  'Western',
];

export async function GET() {
  try {
    const db = getDb();

    let items = await db.select().from(movieGenres).orderBy(asc(movieGenres.name)).all();

    // If empty, seed default genres + any genres from existing movies
    if (!items || items.length === 0) {
      const nowIso = new Date().toISOString();
      const existingGenresSet = new Set<string>(DEFAULT_MOVIE_GENRES);

      try {
        const allMovies = await db.select({ genres: movies.genres }).from(movies).all();
        for (const m of allMovies) {
          if (m.genres) {
            try {
              const parsed = JSON.parse(m.genres);
              if (Array.isArray(parsed)) {
                parsed.forEach((g: string) => {
                  if (g && typeof g === 'string') existingGenresSet.add(g.trim());
                });
              }
            } catch {}
          }
        }
      } catch {}

      for (const gName of existingGenresSet) {
        const id =
          gName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || crypto.randomUUID();
        try {
          await db.insert(movieGenres).values({
            id,
            name: gName,
            category: 'genre',
            createdAt: nowIso,
          });
        } catch {}
      }

      items = await db.select().from(movieGenres).orderBy(asc(movieGenres.name)).all();
    }

    const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(sorted);
  } catch (err: any) {
    return NextResponse.json(
      DEFAULT_MOVIE_GENRES.map((name) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        category: 'genre',
        createdAt: new Date().toISOString(),
      })),
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = (await request.json()) as { name?: string; category?: string };
    const rawName = (body.name || '').trim();

    if (!rawName) {
      return NextResponse.json({ detail: 'Genre name cannot be empty.' }, { status: 400 });
    }

    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const category = body.category === 'broad' ? 'broad' : 'genre';

    const existing = await db
      .select()
      .from(movieGenres)
      .where(sql`lower(${movieGenres.name}) = ${formattedName.toLowerCase()}`)
      .get();

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const id =
      formattedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const newRecord = {
      id,
      name: formattedName,
      category,
      createdAt: nowIso,
    };

    await db.insert(movieGenres).values(newRecord);

    return NextResponse.json(newRecord, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
