/**
 * LyricsService Integration Tests
 *
 * Tests the complete LyricsService pipeline against PRODUCTION Genius API:
 * Parser → Referents API → Transformer → Final Output
 *
 * Compares live results against saved snapshots.
 *
 * Run with: source .env && bun test
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DefaultLyricsService } from '../../LyricsService';
import type { Snapshot } from './generate-snapshots';
import type { TransformedLyricsBySection } from '../lyrics-transformer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, 'snapshots');
const HAS_TOKEN = !!process.env.GENIUS_CLIENT_TOKEN;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function loadSnapshots(): Snapshot[] {
  const files = readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('_')); // Exclude timestamped files
  return files.map(file => {
    const content = readFileSync(join(SNAPSHOTS_DIR, file), 'utf-8');
    return JSON.parse(content) as Snapshot;
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as Error;
      if (i < retries - 1) {
        await sleep(1000 * (i + 1)); // Exponential backoff: 1s, 2s, 3s
      }
    }
  }
  throw lastError;
}

type FetchResult = {
  key: string;
  snapshot: Snapshot;
  result?: TransformedLyricsBySection[];
  error?: Error;
};

async function fetchAllSongs(
  service: DefaultLyricsService,
  snapshots: Snapshot[]
): Promise<Map<string, FetchResult>> {
  const results = new Map<string, FetchResult>();

  for (const snapshot of snapshots) {
    const key = `${snapshot.metadata.artist} - ${snapshot.metadata.song}`;
    try {
      const result = await fetchWithRetry(() =>
        service.getLyrics(snapshot.metadata.artist, snapshot.metadata.song)
      );
      results.set(key, { key, snapshot, result });
    } catch (e) {
      results.set(key, { key, snapshot, error: e as Error });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe('LyricsService Integration', () => {
  const snapshots = loadSnapshots();

  // Always show snapshot info, even if skipped
  test('snapshots loaded', () => {
    expect(snapshots.length).toBeGreaterThan(0);
    console.log(`\n📦 Loaded ${snapshots.length} snapshots:`);
    snapshots.forEach(f => {
      const totalLines = f.result.reduce((acc, s) => acc + s.lines.length, 0);
      const annotatedLines = f.result.reduce(
        (acc, s) => acc + s.lines.filter(l => l.annotations?.length).length,
        0
      );
      console.log(
        `   • ${f.metadata.artist} - ${f.metadata.song}: ${totalLines} lines, ${annotatedLines} annotated`
      );
    });

    if (!HAS_TOKEN) {
      console.log('\n⚠️  GENIUS_CLIENT_TOKEN not set - integration tests will be skipped');
      console.log('   Run with: source .env && bun test\n');
    }
  });

  describe.skipIf(!HAS_TOKEN)('Production API Tests', () => {
    let results: Map<string, FetchResult>;
    let service: DefaultLyricsService;

    beforeAll(async () => {
      service = new DefaultLyricsService({
        accessToken: process.env.GENIUS_CLIENT_TOKEN!,
      });

      console.log('\n🔄 Fetching lyrics from Genius API...');
      results = await fetchAllSongs(service, snapshots);

      // Report fetch results
      let successCount = 0;
      let failCount = 0;
      for (const [key, res] of results) {
        if (res.result) {
          successCount++;
          console.log(`   ✓ ${key}`);
        } else {
          failCount++;
          console.log(`   ✗ ${key}: ${res.error?.message}`);
        }
      }
      console.log(`\n   Fetched: ${successCount}/${snapshots.length} songs\n`);
    }, 60000);

    for (const snapshot of snapshots) {
      const key = `${snapshot.metadata.artist} - ${snapshot.metadata.song}`;

      describe(key, () => {
        test('fetch succeeded', () => {
          const res = results.get(key);
          expect(res, `No result for ${key}`).toBeDefined();
          expect(res!.error, `Fetch failed: ${res!.error?.message}`).toBeUndefined();
          expect(res!.result, 'Result is undefined').toBeDefined();
        });

        test('same number of sections', () => {
          const res = results.get(key);
          if (!res?.result) return; // Skip if fetch failed (already reported above)

          expect(res.result.length).toBe(snapshot.result.length);
        });

        test('same section types', () => {
          const res = results.get(key);
          if (!res?.result) return;

          const resultTypes = res.result.map(s => s.type);
          const snapshotTypes = snapshot.result.map(s => s.type);
          expect(resultTypes).toEqual(snapshotTypes);
        });

        test('same line counts per section', () => {
          const res = results.get(key);
          if (!res?.result) return;

          for (let i = 0; i < snapshot.result.length; i++) {
            expect(
              res.result[i]?.lines.length,
              `Section ${i} (${snapshot.result[i].type}) line count mismatch`
            ).toBe(snapshot.result[i].lines.length);
          }
        });

        test('same line text content', () => {
          const res = results.get(key);
          if (!res?.result) return;

          for (let i = 0; i < snapshot.result.length; i++) {
            for (let j = 0; j < snapshot.result[i].lines.length; j++) {
              expect(
                res.result[i]?.lines[j]?.text,
                `Section ${i} (${snapshot.result[i].type}), Line ${j} mismatch`
              ).toBe(snapshot.result[i].lines[j].text);
            }
          }
        });

        test('annotations present on same lines', () => {
          const res = results.get(key);
          if (!res?.result) return;

          for (let i = 0; i < snapshot.result.length; i++) {
            for (let j = 0; j < snapshot.result[i].lines.length; j++) {
              const snapshotHasAnnotation =
                (snapshot.result[i].lines[j].annotations?.length ?? 0) > 0;
              const resultHasAnnotation =
                (res.result[i]?.lines[j]?.annotations?.length ?? 0) > 0;

              expect(
                resultHasAnnotation,
                `Section ${i}, Line ${j} annotation presence mismatch`
              ).toBe(snapshotHasAnnotation);
            }
          }
        });
      });
    }
  });
});
