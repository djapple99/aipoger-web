# Authenticated User Journey And Mobile Volume Audit

Date: 2026-07-12

## Scope

- Mobile Bar Heartbreak volume control
- Logged-out and logged-in auth continuity
- Bar Heartbreak upload preparation
- Explore playback, seeking, lyrics HUD, and catalog mode switching
- Drop Battle setup, hook cutting, lyrics input, final metadata, and official five-second previews
- Profile identity save, avatar chooser, favorites pagination, and batch-management entry

## Confirmed Fix

- Bar Heartbreak now detects when a browser ignores `HTMLMediaElement.volume`.
- After the user touches or keyboards the volume slider, the page creates one `MediaElementAudioSourceNode` and `GainNode` for effective in-app volume control.
- Native media volume remains the normal path on supported browsers.
- The audio context resumes with the explicit playback-resume action.
- The media element uses anonymous CORS so public Supabase audio can safely enter the Web Audio graph.
- A concise side-button fallback appears only when neither native volume nor Web Audio gain is available.

## Production Journey Results

- Existing signed-in session remained valid across Profile, Bar Heartbreak, Explore, and Battle.
- Profile fighter-name save succeeded without changing the existing name; avatar file chooser opened; no avatar was uploaded.
- Logged-out mobile auth preserved the Profile return path and rejected an empty Email without sending a link.
- Bar Heartbreak accepted a valid MP3 for local form preparation, detected the title, exposed all 11 genres, and previewed the selected genre destination. The submission button was not used.
- Explore played a public song, moved its seek bar, opened the lyrics HUD, exposed the lyric scroll slider, and switched between genre lanes and Hot Now.
- Drop Battle accepted a source MP3, produced a 60-second Drop, preserved Chinese and English spaces in lyrics, and reached the final metadata screen with the 11-genre selector. No battle card was published.
- The one temporary Battle hook object created by this audit was removed from `battle-audio` and verified absent.
- Official gatekeeper preview played, displayed its active state, and stopped/reset after five seconds.
- Profile favorites showed 10 songs per page and entered batch-management mode with destructive actions disabled until selection.

## Verification

- Unit/source tests cover volume clamping, locked native volume detection, Web Audio fallback wiring, CORS, and suspended-context resume.
- A mobile Playwright run forced `HTMLMediaElement.volume` to stay locked, confirmed exactly one gain node was created, moved the slider to 0%, and confirmed audio time continued advancing.
- Screenshot: `output/playwright/mobile-volume-gain.png` (local verification artifact, not committed).
