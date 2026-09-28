import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAnalysisRequest } from '../src/lib/music-analysis-tools.ts';

const blank = { title: '', goal: '', source: '', results: '', lyrics: '' };

test('no report is invented when no analysis results were supplied', () => {
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    assert.equal(buildAnalysisRequest({ ...blank, goal: 'A better chorus', results: '  \n ' }, lang), '');
  }
});

test('external measurements and user notes stay intact without being interpreted as scores', () => {
  const input = { title: 'Version B', goal: 'Keep the dynamics', source: 'Loudness Penalty, 2026-09-28', results: 'Spotify: -3.2 dB\nYouTube: -2.1 dB\nKey: unknown', lyrics: '' };
  for (const lang of ['zh', 'en', 'ja', 'ko']) {
    const text = buildAnalysisRequest(input, lang);
    for (const key of ['title', 'goal', 'source', 'results']) assert.ok(text.includes(input[key]));
    assert.ok(!text.includes('120 BPM'));
    assert.ok(!text.includes('2026-09-29'));
  }
  const english = buildAnalysisRequest(input, 'en');
  assert.match(english, /Lyrics \/ section notes \(user supplied\):\nNot supplied/);
  assert.match(english, /Do not claim to have heard/);
  assert.match(english, /not quality scores/);
});
