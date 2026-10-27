import { describe, it, expect } from 'vitest';
import { parseImdbInput, isValidImdbId, parseBulkImdbInput } from './index';

describe('IMDb Parser & Validator', () => {
  it('parses direct IMDb title IDs', () => {
    const res = parseImdbInput('tt0111161');
    expect(res).not.toBeNull();
    expect(res?.imdbId).toBe('tt0111161');
    expect(res?.imdbUrl).toBe('https://www.imdb.com/title/tt0111161/');
  });

  it('parses standard IMDb desktop URLs', () => {
    const res = parseImdbInput('https://www.imdb.com/title/tt0111161/');
    expect(res?.imdbId).toBe('tt0111161');
    expect(res?.imdbUrl).toBe('https://www.imdb.com/title/tt0111161/');
  });

  it('parses URLs without trailing slash', () => {
    const res = parseImdbInput('https://www.imdb.com/title/tt0111161');
    expect(res?.imdbId).toBe('tt0111161');
  });

  it('parses mobile IMDb URLs', () => {
    const res = parseImdbInput('https://m.imdb.com/title/tt0111161/');
    expect(res?.imdbId).toBe('tt0111161');
  });

  it('parses URLs with query parameters or tracking ref', () => {
    const res = parseImdbInput('https://www.imdb.com/title/tt0111161/?ref_=nv_sr_srsg_0');
    expect(res?.imdbId).toBe('tt0111161');
  });

  it('handles 8 to 10 digit title IDs', () => {
    const res = parseImdbInput('tt12345678');
    expect(res?.imdbId).toBe('tt12345678');
  });

  it('rejects invalid IMDb URLs and inputs', () => {
    expect(parseImdbInput('')).toBeNull();
    expect(parseImdbInput('https://google.com')).toBeNull();
    expect(parseImdbInput('tt123')).toBeNull(); // too short
    expect(parseImdbInput('nm0000123')).toBeNull(); // name id, not title
    expect(parseImdbInput('random string')).toBeNull();
  });

  it('validates IMDb IDs with isValidImdbId', () => {
    expect(isValidImdbId('tt0111161')).toBe(true);
    expect(isValidImdbId('tt1234567890')).toBe(true);
    expect(isValidImdbId('tt12345')).toBe(false);
    expect(isValidImdbId('')).toBe(false);
    expect(isValidImdbId('random')).toBe(false);
  });

  it('parses bulk IMDb inputs with line numbers and duplicate detection', () => {
    const bulkInput = `
      https://www.imdb.com/title/tt0111161/
      tt0068646
      invalid_url
      tt0111161
    `;
    const results = parseBulkImdbInput(bulkInput);

    expect(results).toHaveLength(4);
    expect(results[0].parsed?.imdbId).toBe('tt0111161');
    expect(results[0].isDuplicateInInput).toBe(false);

    expect(results[1].parsed?.imdbId).toBe('tt0068646');
    expect(results[1].isDuplicateInInput).toBe(false);

    expect(results[2].parsed).toBeNull();
    expect(results[2].error).toBeDefined();

    expect(results[3].parsed?.imdbId).toBe('tt0111161');
    expect(results[3].isDuplicateInInput).toBe(true);
    expect(results[3].error).toContain('Duplicate');
  });
});
