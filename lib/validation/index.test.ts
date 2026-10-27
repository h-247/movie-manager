import { describe, it, expect } from 'vitest';
import {
  createMovieSchema,
  updateMovieSchema,
  imdbIdSchema,
  movieQuerySchema,
  watchStatusSchema,
} from './index';

describe('Validation Schemas', () => {
  describe('imdbIdSchema', () => {
    it('accepts valid IMDb IDs', () => {
      expect(imdbIdSchema.safeParse('tt0111161').success).toBe(true);
      expect(imdbIdSchema.safeParse('tt12345678').success).toBe(true);
      expect(imdbIdSchema.safeParse('  tt0111161  ').success).toBe(true);
    });

    it('rejects invalid IMDb IDs', () => {
      expect(imdbIdSchema.safeParse('0111161').success).toBe(false);
      expect(imdbIdSchema.safeParse('tt12').success).toBe(false);
      expect(imdbIdSchema.safeParse('nm0111161').success).toBe(false);
      expect(imdbIdSchema.safeParse('').success).toBe(false);
    });
  });

  describe('watchStatusSchema', () => {
    it('accepts valid statuses', () => {
      expect(watchStatusSchema.safeParse('TO_DO').success).toBe(true);
      expect(watchStatusSchema.safeParse('DOING').success).toBe(true);
      expect(watchStatusSchema.safeParse('DONE').success).toBe(true);
    });

    it('rejects invalid statuses', () => {
      expect(watchStatusSchema.safeParse('WATCHED').success).toBe(false);
      expect(watchStatusSchema.safeParse('TODO').success).toBe(false);
      expect(watchStatusSchema.safeParse('').success).toBe(false);
    });
  });

  describe('createMovieSchema', () => {
    it('validates required fields and defaults status to TO_DO', () => {
      const parsed = createMovieSchema.safeParse({
        imdbId: 'tt0111161',
        title: 'The Shawshank Redemption',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.status).toBe('TO_DO');
        expect(parsed.data.title).toBe('The Shawshank Redemption');
      }
    });

    it('validates personal rating bounds 1-10', () => {
      expect(
        createMovieSchema.safeParse({
          imdbId: 'tt0111161',
          title: 'Movie',
          personalRating: 10,
        }).success,
      ).toBe(true);

      expect(
        createMovieSchema.safeParse({
          imdbId: 'tt0111161',
          title: 'Movie',
          personalRating: 1,
        }).success,
      ).toBe(true);

      expect(
        createMovieSchema.safeParse({
          imdbId: 'tt0111161',
          title: 'Movie',
          personalRating: 0,
        }).success,
      ).toBe(false);

      expect(
        createMovieSchema.safeParse({
          imdbId: 'tt0111161',
          title: 'Movie',
          personalRating: 11,
        }).success,
      ).toBe(false);
    });

    it('requires a non-empty title', () => {
      const parsed = createMovieSchema.safeParse({
        imdbId: 'tt0111161',
        title: '   ',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('updateMovieSchema', () => {
    it('allows partial updates', () => {
      const parsed = updateMovieSchema.safeParse({
        status: 'DOING',
        personalRating: 8,
        notes: 'Great opening scene',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid personal rating', () => {
      expect(updateMovieSchema.safeParse({ personalRating: 15 }).success).toBe(
        false,
      );
    });
  });

  describe('movieQuerySchema', () => {
    it('provides sensible defaults', () => {
      const parsed = movieQuerySchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.status).toBe('ALL');
        expect(parsed.data.sortBy).toBe('added_desc');
      }
    });
  });
});
