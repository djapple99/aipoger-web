# Studio Mastering Disco preview audit — 2026-09-12

Five new free Studio Mastering directions were generated in Suno v6 with their matching Style prompts, downloaded as MP3, and cropped from `00:30` to a 15-second preview. The published files are normalized to stereo, 44.1 kHz, 128 kbps MP3 and are mapped one-to-one in `src/lib/suno-studio-mastering-audio-previews.ts`.

| Prompt key | Published asset | Suno source ID |
| --- | --- | --- |
| `studio-mastering-classic-disco` | `classic-disco.mp3` | `0d457d2e-8748-4145-bcd4-a0c840d0362c` |
| `studio-mastering-italo-disco` | `italo-disco.mp3` | `9798b96d-aa94-47f8-9bb3-bdfe49f2ab71` |
| `studio-mastering-eurodisco` | `eurodisco.mp3` | `2c9a949e-b3f5-4de4-a7d4-487c5d519c0b` |
| `studio-mastering-hi-nrg-disco` | `hi-nrg-disco.mp3` | `b3e7b0c3-7b32-407d-b554-db7641a2d1a0` |
| `studio-mastering-boogie-post-disco` | `boogie-post-disco.mp3` | `cb368eb4-b735-4606-8311-efd5fa358f43` |

The five previews measured between `-14.5` and `-14.1 LUFS-I` after normalization. The source MP3s remain in the local working download folder only; signed download URLs are intentionally not stored in the repository.

## Release preparation — 2026-09-14

- Release branch: `codex/disco-studio-prompts`, based on the live production commit `42496b88c568c840fd6b03e298076de7e3caa270` so the existing unified-player changes are preserved.
- Scope: five prompt cards and their Disco & Funk mappings, five matching preview assets, counts, focused catalog tests, and the related product/engineering documentation.
- Validation: 311 tests passed; ESLint reported zero errors and 16 existing warnings; Next.js build and TypeScript completed. Local build cannot load dynamic sitemap records with the redacted credentials returned by the environment pull; the production deployment must rebuild in Vercel with its configured credentials.
- Every new MP3 has a different SHA-256 checksum and is encoded as 15 seconds, 44.1 kHz, stereo, 128 kbps.

## Production verification — 2026-09-14

- Application commit: `f8c16417d5d4f9684c193f7118412633c9519259` (pushed to GitHub).
- Vercel deployment: `dpl_9Eh2G9kNozZJrTTauVtY2KGQzbMc`, `READY`, production aliases `aipoger.com` and `www.aipoger.com`.
- Deployment URL: https://aipoger-web-rnz8-l34ou3lmr-yohungs-projects.vercel.app
- Production build completed with the configured credentials; the local sitemap credential warning did not recur in the cloud build.
- All five public MP3 URLs returned `200` with `audio/mpeg`, 241,206 bytes, and SHA-256 checksums matching the release files.
- Logged-in Chrome on `aipoger.com` showed all five new cards under Disco & Funk (nine cards including the four existing directions). Each new preview began playing its correct URL with a 15-second duration and no media error.
- Italo search and copied prompt matched the published text. Desktop 1440×900 and mobile 390×844 had no horizontal overflow; mobile playback controls were visible. English, Japanese, and Korean routes also exposed the new card via the existing English prompt-content fallback. The changed page produced no captured console errors.
- `/`, `/auth`, `/listen-bar`, and the Bible's `zh`, `en`, `ja`, and `ko` routes returned `200`.
