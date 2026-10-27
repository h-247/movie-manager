import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

let testDbInstance: any = null;

export function setTestDb(db: any) {
  testDbInstance = db;
}

export function getDb(d1Database?: any) {
  if (testDbInstance) {
    return testDbInstance;
  }

  let d1 = d1Database;
  try {
    if (!d1 && typeof env !== 'undefined' && env?.DB) {
      d1 = env.DB;
    }
  } catch {
    // env not accessible outside worker runtime
  }

  if (!d1) {
    throw new Error(
      'Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.',
    );
  }

  return drizzle(d1, { schema });
}
