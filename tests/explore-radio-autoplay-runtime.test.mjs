import assert from 'node:assert/strict';
import test from 'node:test';
import { mountMv } from './helpers/mv-runtime.mjs';
import { shuffleMusicQueue } from '../src/lib/music-queue.ts';

const genre = 'Jazz / Bossa 微醺時刻';
const tracks = [
  { id: 'audio', heartTrackId: 'audio', title: 'Audio', artist: 'A', coverUrl: '/a.jpg', audioUrl: '/a.mp3', genre },
  { id: 'video', heartTrackId: 'video', title: 'Video', artist: 'B', coverUrl: '/b.jpg', audioUrl: '', youtubeId: 'abcdefghijk', genre: 'R&B 深情瞬間' },
];
async function setup(t, { ready = true, session = null, hidden = false, query = '', blocked = false } = {}) {
  const starts = [], listeners = new Map();
  let player = { session, playing: false, currentTime: 0, duration: 0 };
  const store = {
    getMusicPlayerState: () => player,
    useMusicPlayer: () => player,
    musicPlayer: {
      async start(queue, index, sourceLabel, options) {
        starts.push({ queue, options });
        player = { ...player, session: { queue, index, sourceLabel, ...options }, playing: !blocked };
        return !blocked;
      },
      toggle() { player = { ...player, playing: !player.playing }; },
    },
  };
  const ui = await mountMv(t, 'src/components/explore-radio.tsx', {
    tracks: ready ? tracks : [], ready, hearted: false, heartBusy: false, onHeart() {}, onComment() {},
  }, {
    'lucide-react': new Proxy({}, { get: (_, key) => String(key) }),
    '@/lib/music-player-store': store,
    '@/lib/music-queue': { shuffleMusicQueue },
    '@/lib/music-genres': { MUSIC_GENRE_OPTIONS: [{ value: genre, labelKey: 'jazz' }] },
    '@/lib/i18n': { useI18n: () => ({ lang: 'zh', t: key => key }) },
    '@/app/ai-music/ai-music.module.css': { __esModule: true, default: {} },
  }, {
    window: { location: { search: query } },
    document: {
      get hidden() { return hidden; },
      addEventListener(name, fn) { listeners.set(name, fn); },
      removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    },
  });
  return { ui, starts, store, setHidden(value) { hidden = value; listeners.get('visibilitychange')?.(); }, close() { player = { ...player, session: null, playing: false }; } };
}

test('Explore starts a shuffled mixed radio once after the catalog is ready, as passive listening', async t => {
  const x = await setup(t, { ready: false });
  assert.equal(x.starts.length, 0);
  await x.ui.update({ ready: true, tracks });
  assert.equal(x.starts.length, 1);
  assert.deepEqual(new Set(x.starts[0].queue.map(track => track.id)), new Set(['audio', 'video']));
  assert.deepEqual(x.starts[0].options, { sourceKey: 'bar:all', repeat: true, intentional: false });
  x.store.musicPlayer.toggle();
  await x.ui.update({ tracks: [...tracks] });
  assert.equal(x.store.getMusicPlayerState().playing, false);
  x.close();
  await x.ui.update({ ready: false });
  await x.ui.update({ ready: true, tracks: [...tracks] });
  x.setHidden(true); x.setHidden(false);
  assert.equal(x.starts.length, 1, 'pause, close, polling and focus must not restart the radio');
});

test('entry preserves an existing session, including a manually paused queue', async t => {
  const session = { queue: tracks, index: 1, sourceLabel: 'Choice', sourceKey: 'choice:one' };
  const x = await setup(t, { session });
  assert.equal(x.starts.length, 0);
  x.close(); await x.ui.update({ tracks: [...tracks] });
  assert.equal(x.starts.length, 0);
});

test('legacy genre links start only their chosen genre; manual genre selection remains intentional', async t => {
  const x = await setup(t, { query: '?genre=' + encodeURIComponent(genre) });
  assert.deepEqual(x.starts[0].queue, tracks.slice(0, 1));
  assert.equal(x.starts[0].options.sourceKey, `bar:${genre}`);
  x.ui.nodes().find(node => node.type === 'select').props.onChange({ target: { value: 'all' } });
  assert.equal(x.starts.at(-1).options.intentional, true);
});

test('background entry waits for visibility; blocked autoplay is attempted once and stays manually recoverable', async t => {
  const x = await setup(t, { hidden: true, blocked: true });
  assert.equal(x.starts.length, 0);
  x.setHidden(false); await x.ui.flush();
  assert.equal(x.starts.length, 1);
  await x.ui.update({ tracks: [...tracks] });
  x.setHidden(true); x.setHidden(false);
  assert.equal(x.starts.length, 1);
  x.ui.nodes().find(node => node.props?.['aria-label'] === '播放電台').props.onClick();
  assert.equal(x.store.getMusicPlayerState().playing, true);
});
