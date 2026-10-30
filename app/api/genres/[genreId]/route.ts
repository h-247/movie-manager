import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { movieGenres, movies } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{ genreId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { genreId } = await context.params;
    const db = getDb();

    const body = (await request.json()) as { name?: string; category?: string };
    const rawName = (body.name || '').trim();

    if (!rawName) {
      return NextResponse.json({ detail: 'Genre name cannot be empty.' }, { status: 400 });
    }

    const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

    const existing = await db
      .select()
      .from(movieGenres)
      .where(eq(movieGenres.id, genreId))
      .get();

    if (!existing) {
      return NextResponse.json({ detail: 'Genre not found.' }, { status: 404 });
    }

    const oldName = existing.name;

    await db
      .update(movieGenres)
      .set({
        name: formattedName,
        category: body.category || existing.category,
      })
      .where(eq(movieGenres.id, genreId));

    // Cascade update any movies that reference oldName in genres
    try {
      const allMovies = await db.select().from(movies).all();
      for (const m of allMovies) {
        if (m.genres) {
          try {
            const parsed = JSON.parse(m.genres);
            if (Array.isArray(parsed)) {
              let changed = false;
              const updatedGenres = parsed.map((g: string) => {
                if (typeof g === 'string' && g.toLowerCase() === oldName.toLowerCase()) {
                  changed = true;
                  return formattedName;
                }
                return g;
              });
              if (changed) {
                await db
                  .update(movies)
                  .set({
                    genres: JSON.stringify(updatedGenres),
                    updatedAt: new Date().toISOString(),
                  })
                  .where(eq(movies.id, m.id));
              }
            }
          } catch {}
        }
      }
    } catch {}

    return NextResponse.json({
      id: genreId,
      name: formattedName,
      category: body.category || existing.category,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { genreId } = await context.params;
    const db = getDb();

    const existing = await db
      .select()
      .from(movieGenres)
      .where(eq(movieGenres.id, genreId))
      .get();

    if (!existing) {
      return NextResponse.json({ success: true, message: 'Already deleted or not found.' });
    }

    await db.delete(movieGenres).where(eq(movieGenres.id, genreId));

    return NextResponse.json({ success: true, deletedId: genreId });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
