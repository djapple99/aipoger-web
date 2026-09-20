import assert from 'node:assert/strict';
import test from 'node:test';
import * as genre from '../src/lib/genre-suggestion.ts';
import { MUSIC_GENRE_VALUES } from '../src/lib/music-genres.ts';
import { loadTs, mockAdmin, mocksFor } from './helpers/choice-runtime.mjs';

const sample = () => genre.encodeGenreSample(new Float32Array(genre.GENRE_SAMPLE_RATE * 3));
test('sampling spans the track and sends a bounded mono PCM sample', () => {
  assert.deepEqual(genre.genreSampleWindows(20), [{ start: 0, duration: 20 }]);
  assert.deepEqual(genre.genreSampleWindows(100).map(w => w.start), [11.5, 46.5, 81.5]);
  for (const duration of [NaN, Infinity, 0, 2]) assert.throws(() => genre.genreSampleWindows(duration));
  const buffer = sample();
  assert.equal(genre.isGenreSample(buffer), true);
  new DataView(buffer).setUint16(22, 2, true);
  assert.equal(genre.isGenreSample(buffer), false);
  assert.equal(genre.isGenreSample(new ArrayBuffer(genre.GENRE_SAMPLE_MAX_BYTES + 2)), false);
  assert.equal(genre.isGenreSample(new ArrayBuffer(44)), false);
});

test('model results must use exact canonical genres, including the three new genres', () => {
  assert.deepEqual(genre.parseGenreSuggestion({ source: 'audio', genres: MUSIC_GENRE_VALUES.slice(-3) }).genres, MUSIC_GENRE_VALUES.slice(-3));
  for (const genres of [['unknown'], ['Pop'], [null], MUSIC_GENRE_VALUES]) assert.equal(genre.parseGenreSuggestion({ source: 'audio', genres }), null);
  assert.equal(genre.parseGenreSuggestion({ source: 'metadata', genres: [] }), null);
  assert.deepEqual(genre.parseGenreSuggestion({ source: 'audio', genres: [] }).genres, []);
});

test('authenticated proxy validates audio, preserves status and never writes catalog data', async t => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.test';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-public-key';
  process.env.MUSIC_GENRE_ANALYSIS_URL = 'https://analysis.example.test/api/genre';
  process.env.MUSIC_GENRE_ANALYSIS_SECRET = 'test-worker-secret';
  const admin = mockAdmin();
  const route = loadTs('src/app/api/music-analysis/genre/route.ts', { ...mocksFor(admin), '@/lib/genre-suggestion': genre });
  const request = (token = 'valid', body = sample(), type = 'audio/wav') => new Request('http://localhost/api/music-analysis/genre', {
    method: 'POST', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'Content-Type': type }, body,
  });
  const calls = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ source: 'audio', genres: MUSIC_GENRE_VALUES.slice(-3) }); };
  assert.equal((await route.POST(request(null))).status, 401);
  assert.equal((await route.POST(request('invalid'))).status, 401);
  assert.equal((await route.POST(request('valid', sample(), 'audio/mpeg'))).status, 400);
  assert.equal((await route.POST(request('valid', new ArrayBuffer(50)))).status, 400);
  assert.equal((await route.POST(request('valid', new ArrayBuffer(genre.GENRE_SAMPLE_MAX_BYTES + 1)))).status, 413);
  assert.equal(calls.length, 0);
  const response = await route.POST(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await response.json()).genres, MUSIC_GENRE_VALUES.slice(-3));
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-worker-secret');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(admin.operations.length, 0);
  globalThis.fetch = async () => Response.json({ source: 'audio', genres: ['Made up'] });
  assert.equal((await route.POST(request())).status, 503);
  globalThis.fetch = async () => new Response('', { status: 429 });
  assert.equal((await route.POST(request())).status, 429);
  globalThis.fetch = async () => { throw new Error('timeout'); };
  assert.equal((await route.POST(request())).status, 503);
  delete process.env.MUSIC_GENRE_ANALYSIS_SECRET;
  assert.equal((await route.POST(request())).status, 503);
});

test('genre share URLs preserve original indices and route new categories', async () => {
  const route = loadTs('src/app/l/[genre]/route.ts');
  for (const index of [1, 10, 11, 12, 13, 14]) {
    const url = new URL(`https://example.test/l/${index}?lang=ja`);
    const response = await route.GET({ url: url.href, nextUrl: url }, { params: Promise.resolve({ genre: String(index) }) });
    const target = new URL(response.headers.get('location'));
    assert.equal(target.searchParams.get('genre'), MUSIC_GENRE_VALUES[index - 1]);
    assert.equal(target.searchParams.get('lang'), 'ja');
  }
});
