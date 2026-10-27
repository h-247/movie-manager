/**
 * IMDb URL and ID parser, validator, and normalizer.
 */

const IMDB_ID_REGEX = /^(tt\d{7,10})$/i;
const IMDB_URL_REGEX = /(?:https?:\/\/(?:www\.|m\.)?imdb\.com\/title\/)?(tt\d{7,10})(?:[/?#]|$)/i;

export interface ParsedImdb {
  imdbId: string;
  imdbUrl: string;
}

/**
 * Normalizes input string and extracts validated IMDb title ID.
 * Returns null if input is not a valid IMDb URL or ID.
 */
export function parseImdbInput(input: string): ParsedImdb | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Try direct match first if it's already an ID
  if (IMDB_ID_REGEX.test(trimmed)) {
    const id = trimmed.toLowerCase();
    return {
      imdbId: id,
      imdbUrl: `https://www.imdb.com/title/${id}/`,
    };
  }

  // Extract from URL
  const match = trimmed.match(IMDB_URL_REGEX);
  if (match && match[1]) {
    const id = match[1].toLowerCase();
    return {
      imdbId: id,
      imdbUrl: `https://www.imdb.com/title/${id}/`,
    };
  }

  return null;
}

/**
 * Validates whether a string is a valid IMDb title ID.
 */
export function isValidImdbId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return IMDB_ID_REGEX.test(id.trim());
}

/**
 * Parses multiple lines of IMDb inputs, extracting valid items and identifying duplicates.
 */
export interface BulkParseItem {
  raw: string;
  lineNumber: number;
  parsed: ParsedImdb | null;
  isDuplicateInInput: boolean;
  error?: string;
}

export function parseBulkImdbInput(content: string): BulkParseItem[] {
  const lines = content.split(/\r?\n/);
  const seenIds = new Set<string>();
  const results: BulkParseItem[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return; // Skip empty lines
    }

    const parsed = parseImdbInput(trimmed);
    const lineNumber = index + 1;

    if (!parsed) {
      results.push({
        raw: trimmed,
        lineNumber,
        parsed: null,
        isDuplicateInInput: false,
        error: 'Invalid IMDb URL or ID format',
      });
      return;
    }

    const isDuplicate = seenIds.has(parsed.imdbId);
    if (!isDuplicate) {
      seenIds.add(parsed.imdbId);
    }

    results.push({
      raw: trimmed,
      lineNumber,
      parsed,
      isDuplicateInInput: isDuplicate,
      error: isDuplicate ? 'Duplicate IMDb ID in submitted list' : undefined,
    });
  });

  return results;
}
