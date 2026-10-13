import test from "node:test";
import assert from "node:assert/strict";
import {
  loadTs,
  mockAdmin,
  mocksFor,
  request,
  track,
  USER,
  uuid,
} from "./helpers/choice-runtime.mjs";
process.env.SUPABASE_SERVICE_ROLE_KEY = "unit-test-signing-key";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unit-test.invalid";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "unit-test-anon";
const server = loadTs("src/lib/server-external-music.ts");
const media = {
  provider: "youtube",
  mediaId: "MdxaU0l3FzI",
  url: "https://www.youtube.com/watch?v=MdxaU0l3FzI",
};
const metadata = {
  title: "Demo",
  artist: "Creator",
  coverUrl: "https://i.ytimg.com/vi/MdxaU0l3FzI/hqdefault.jpg",
};
const token = () => server.signLinkPreview(USER, media, metadata);
function mount(admin, { owner = false } = {}) {
  const writes = [];
  const client = {
    from(table) {
      return {
        insert(payload) {
          writes.push({ table, payload });
          return {
            select() {
              return {
                single: async () => ({
                  data: { id: "new-work" },
                  error: admin.writeError ?? null,
                }),
              };
            },
          };
        },
      };
    },
  };
  const mocks = {
    ...mocksFor(admin),
    "@supabase/supabase-js": {
      createClient: (url, key, options) => {
        writes.push({ key, options });
        return client;
      },
    },
    "@/lib/server-external-music": {
      ...server,
      resolveLinkPreview: async (url, userId) => ({
        ...metadata,
        media,
        token: server.signLinkPreview(userId, media, metadata),
      }),
    },
    "@/lib/server-creator-auth": {
      creatorAuth: async (r) =>
        r.headers.get("authorization") === "Bearer valid"
          ? {
              admin,
              token: "valid",
              user: {
                id: USER,
                email: owner ? "djapple99@gmail.com" : "creator@example.test",
              },
            }
          : null,
    },
  };
  return {
    post: loadTs("src/app/api/creator-links/route.ts", mocks).POST,
    get: loadTs("src/app/api/creator-center/route.ts", mocks).GET,
    writes,
  };
}
const submission = () => ({
  action: "submit",
  previewToken: token(),
  title: "My song",
  artist: "Creator",
  genre: "Original 自我風格",
  confirmedPlayback: true,
  confirmedRights: true,
  isMusicVideo: true,
});
test("signed previews expire, bind to the verified user, and reject tampering", () => {
  const signed = server.signLinkPreview(USER, media, metadata, 1000);
  assert.ok(server.verifyLinkPreview(signed, USER, 1001));
  assert.equal(server.verifyLinkPreview(signed, uuid(2), 1001), null);
  assert.equal(server.verifyLinkPreview(signed, USER, 1801000), null);
  assert.equal(
    server.verifyLinkPreview(signed.replace("ey", "xx"), USER, 1001),
    null,
  );
});
test("preview and rejected confirmations never insert tracks or consume an upload", async () => {
  const admin = mockAdmin(),
    ui = mount(admin);
  assert.equal(
    (await ui.post(request({ action: "preview", url: media.url }))).status,
    200,
  );
  for (const change of [
    { confirmedPlayback: false },
    { confirmedRights: false },
    { genre: "" },
    { previewToken: "bad" },
    { artist: "" },
  ])
    assert.equal(
      (await ui.post(request({ ...submission(), ...change }))).status,
      400,
    );
  assert.equal(ui.writes.length, 0);
  assert.equal(admin.operations.length, 0);
  assert.equal((await ui.post(request(submission(), null))).status, 401);
});
test("link submission uses the user RLS context and keeps one original work/MV ID without audio hosting", async () => {
  const ui = mount(mockAdmin());
  const result = await ui.post(
    request({ ...submission(), createdBy: uuid(2) }),
  );
  assert.equal(result.status, 201);
  assert.equal(ui.writes[0].key, "unit-test-anon");
  assert.equal(
    ui.writes[0].options.global.headers.Authorization,
    "Bearer valid",
  );
  const payload = ui.writes[1].payload;
  assert.equal(payload.created_by, USER);
  assert.equal(payload.audio_path, null);
  assert.equal(payload.external_media_id, media.mediaId);
  assert.equal(payload.youtube_url, media.url);
  assert.equal(payload.is_music_video, true);
  assert.equal(payload.source, "community");
  assert.equal(ui.writes.filter((w) => w.table).length, 1);
});
test("an existing same-owner MV link is reused, while another creator does not block submission", async () => {
  const same = mount(
    mockAdmin({
      listen_bar_tracks: [
        track(1, {
          created_by: USER,
          youtube_url: "https://youtu.be/MdxaU0l3FzI?si=old",
        }),
      ],
    }),
  );
  assert.equal((await same.post(request(submission()))).status, 409);
  assert.equal(same.writes.length, 0);
  const other = mount(
    mockAdmin({
      listen_bar_tracks: [
        track(1, { created_by: uuid(2), youtube_url: media.url }),
      ],
    }),
  );
  assert.equal((await other.post(request(submission()))).status, 201);
});
test("database duplicate and shared upload quota errors remain visible", async () => {
  for (const [error, status, code] of [
    [{ code: "23505", message: "duplicate" }, 409, "LINK_ALREADY_SUBMITTED"],
    [{ message: "CREATOR_WEEKLY_UPLOAD_LIMIT" }, 429, "UPLOAD_LIMIT"],
  ]) {
    const admin = mockAdmin();
    admin.writeError = error;
    const r = await mount(admin).post(request(submission()));
    assert.equal(r.status, status);
    assert.equal((await r.json()).error, code);
  }
});
test("private summary reads all own submissions including expired records, hides identities and excludes self comments", async () => {
  const tracks = Array.from({ length: 501 }, (_, i) =>
    track(i + 10, {
      created_by: USER,
      source: "community",
      created_at: "2020-01-01T00:00:00Z",
    }),
  );
  tracks.push(track(999, { created_by: uuid(2), source: "community" }));
  const comments = [
    {
      id: "c1",
      track_id: tracks[0].id,
      user_id: uuid(2),
      display_name: "Listener",
      body: "Useful feedback",
      created_at: "2026-10-12",
      moderation_status: "visible",
    },
    {
      id: "c2",
      track_id: tracks[0].id,
      user_id: USER,
      display_name: "Self",
      body: "Self",
      created_at: "2026-10-12",
      moderation_status: "visible",
    },
    {
      id: "c3",
      track_id: tracks[0].id,
      user_id: uuid(3),
      body: "Hidden",
      moderation_status: "hidden",
    },
  ];
  const admin = mockAdmin({
      listen_bar_tracks: tracks,
      listen_bar_track_comments: comments,
      listen_bar_track_reactions: [],
    }),
    ui = mount(admin);
  const r = await ui.get(request(null));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
  const p = await r.json();
  assert.equal(p.works.length, 501);
  assert.equal(p.works[0].status, "ended");
  assert.equal(p.commenters, 1);
  assert.equal(p.commentCount, 1);
  assert.equal(p.comments[0].user_id, undefined);
  assert.equal(p.isOwner, false);
  assert.deepEqual(p.credits, { enabled: false, balance: null });
  assert.equal(
    (await mount(admin, { owner: true }).get(request(null))).status,
    200,
  );
  assert.equal(
    (await (await mount(admin, { owner: true }).get(request(null))).json())
      .isOwner,
    true,
  );
  assert.equal((await ui.get(request(null, null))).status, 401);
});
test("owner status cannot come from editable metadata or anonymous sign-in", async () => {
  const admin = mockAdmin();
  admin.auth.getUser = async () => ({
    data: {
      user: {
        id: USER,
        email: "member@example.test",
        user_metadata: { email: "djapple99@gmail.com" },
      },
    },
    error: null,
  });
  const auth = loadTs("src/lib/server-creator-auth.ts", mocksFor(admin));
  assert.equal(
    (await auth.creatorAuth(request(null))).user.email,
    "member@example.test",
  );
  admin.auth.getUser = async () => ({
    data: { user: { id: USER, is_anonymous: true } },
    error: null,
  });
  assert.equal(await auth.creatorAuth(request(null)), null);
});
