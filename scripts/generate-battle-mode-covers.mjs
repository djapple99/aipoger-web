import { ImageResponse } from 'next/og.js';
import { createElement as h } from 'react';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Reuse the Battle page illustrations. Commit the PNGs so social crawlers need
// neither JavaScript nor an image-rendering service to fetch a mode's cover.
const root = new URL('../', import.meta.url);
const output = new URL('public/images/battle-share/', root);
await mkdir(output, { recursive: true });
const cards = {
  blind: { image: 'blind-entry', title: 'BLIND LISTENING', subtitle: 'TWO CLIPS. YOUR CHOICE.', accent: '#ff985e', position: '68% center' },
  'q-crash': { image: 'q-crash', title: 'Q CRASH', subtitle: 'FULL SONGS. LISTEN & VOTE.', accent: '#a1dbc7', position: 'center' },
  drop: { image: 'drop-battle', title: 'DROP BATTLE', subtitle: '30–60 SECOND DROPS. FACE THE ROOM.', accent: '#ff7d44', position: 'center' },
};
for (const [mode, card] of Object.entries(cards)) {
  const art = await sharp(fileURLToPath(new URL(`public/images/battle-retro/${card.image}.webp`, root))).png().toBuffer();
  const response = new ImageResponse(
    h('div', { style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#111c23', color: '#fff4e8', fontFamily: 'sans-serif' } },
      h('div', { style: { display: 'flex', flexDirection: 'column', padding: '38px 56px 18px' } },
        h('div', { style: { fontSize: 64, fontWeight: 800, color: card.accent, letterSpacing: -2 } }, card.title),
        h('div', { style: { fontSize: 23, marginTop: 9, letterSpacing: 2 } }, card.subtitle)),
      h('img', { src: `data:image/png;base64,${art.toString('base64')}`, width: 1200, height: 365, style: { objectFit: 'cover', objectPosition: card.position } }),
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 56px', color: '#cfdbdf', fontSize: 22, letterSpacing: 4 } },
        h('span', {}, 'AIPOGER'), h('span', { style: { color: card.accent } }, 'LISTEN · CREATE · CONNECT'))),
    { width: 1200, height: 630 },
  );
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(`${mode}.png`, output), bytes);
  console.log(`${mode}: ${bytes.length} bytes`);
}
