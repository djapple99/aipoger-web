import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const nativeRequire = createRequire(import.meta.url);
export const uuid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
export const USER = uuid(1);

// Execute the actual TypeScript modules with mocked I/O, not source-pattern assertions.
export function loadTs(relativePath, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} };
  cache.set(filename, loaded);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith("@/")) return loadTs(`src/${specifier.slice(2)}.ts`, mocks, cache);
    return nativeRequire(specifier);
  };
  new Function("require", "module", "exports", compiled)(require, loaded, loaded.exports);
  return loaded.exports;
}

export function mockAdmin(seed = {}) {
  const tables = structuredClone({ listen_bar_tracks: [], battle_result_archives: [], battles: [],
    fighter_profiles: [], user_profiles: [], aipoger_creator_choice_collections: [], aipoger_creator_choice_items: [], ...seed });
  const operations = [];
  const favorites = { records: [] };
  let counter = 10000;
  const admin = {
    tables, operations, favorites, downloadError: null,
    auth: { getUser: async (token) => ({ data: { user: token === "valid" ? { id: USER, email: "creator@example.test" } : null }, error: null }) },
    storage: { from: (bucket) => ({
      getPublicUrl: (key) => ({ data: { publicUrl: `https://media.example.test/${bucket}/${key}` } }),
      createSignedUrl: async (key) => ({ data: { signedUrl: `https://media.example.test/${bucket}/${key}?signed=1` } }),
      download: async () => ({ data: new Blob([JSON.stringify(favorites)]), error: admin.downloadError }),
      upload: async (...args) => { operations.push({ storage: bucket, action: "upload", args }); return { error: null }; },
      remove: async (...args) => { operations.push({ storage: bucket, action: "remove", args }); return { error: null }; },
    }) },
    from: (table) => {
      const filters = [];
      const sorts = [];
      let action = "read", payload, start = 0, end = Infinity, single = false;
      const query = {
        select: () => query,
        eq: (key, value) => { filters.push((row) => row[key] === value); return query; },
        is: (key, value) => { filters.push((row) => (row[key] ?? null) === value); return query; },
        in: (key, values) => { filters.push((row) => values.includes(row[key])); return query; },
        order: (key, options = {}) => { sorts.push({ key, ascending: options.ascending !== false }); return query; },
        limit: (count) => { end = count - 1; return query; },
        range: (from, to) => { start = from; end = to; return query; },
        maybeSingle: () => { single = true; return query; },
        single: () => { single = true; return query; },
        insert: (data) => { action = "insert"; payload = data; return query; },
        update: (data) => { action = "update"; payload = data; return query; },
        delete: () => { action = "delete"; return query; },
        then: (resolve, reject) => Promise.resolve().then(() => {
          operations.push({ table, action, payload: structuredClone(payload), start, end });
          const all = tables[table] ?? (tables[table] = []);
          let rows = all.filter((row) => filters.every((filter) => filter(row)));
          if (action === "insert" || action === "update") {
            const changes = action === "insert" ? [{ id: uuid(counter++), is_published: false, ...payload }] : rows.map((row) => ({ ...row, ...payload }));
            const remaining = action === "insert" ? all : all.filter((row) => !rows.includes(row));
            const next = [...remaining, ...changes];
            const keys = table === "aipoger_creator_choice_collections" ? ["creator_id", "week_start"]
              : table === "aipoger_creator_choice_items" ? ["collection_id", "position"] : null;
            if (keys && new Set(next.map((row) => keys.map((key) => row[key]).join(":"))).size !== next.length) {
              return { data: null, error: { code: "23505", message: "duplicate key" } };
            }
            if (table === "aipoger_creator_choice_items" && next.some((row) => row.position < 1 || row.position > 99)) {
              return { data: null, error: { code: "23514", message: "position check" } };
            }
            tables[table] = next; rows = changes;
          } else if (action === "delete") {
            tables[table] = all.filter((row) => !rows.includes(row));
          }
          rows = [...rows].sort((a, b) => {
            for (const { key, ascending } of sorts) {
              const result = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
              if (result) return ascending ? result : -result;
            }
            return 0;
          }).slice(start, end + 1).map((row) => ({ ...row }));
          if (table === "aipoger_creator_choice_collections") rows = rows.map((row) => ({ ...row,
            aipoger_creator_choice_items: tables.aipoger_creator_choice_items.filter((item) => item.collection_id === row.id),
          }));
          return { data: single ? rows[0] ?? null : rows, error: null };
        }).then(resolve, reject),
      };
      return query;
    },
  };
  return admin;
}

export function mocksFor(admin) {
  return {
    "@supabase/supabase-js": { createClient: () => admin },
    "next/server": { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
    "@/lib/listen-bar": { LISTEN_BAR_AUDIO_BUCKET: "listen-bar-audio", LISTEN_BAR_COVER_BUCKET: "listen-bar-covers" },
  };
}

export function request(body, token = "valid") {
  return { headers: new Headers(token ? { authorization: `Bearer ${token}` } : {}), json: async () => body };
}

export function track(number, overrides = {}) {
  return { id: uuid(number), title: `Song ${number}`, artist: "Creator", genre: "Pop", audio_path: `${number}.mp3`,
    cover_path: null, created_at: "2020-01-01T00:00:00Z", is_active: true, review_status: "approved", ...overrides };
}

export function favorite(admin, number, user = USER, kind = "bar") {
  admin.favorites.records.push({ recordKey: `${kind}:${uuid(number)}`, targetKind: kind, targetId: uuid(number), favoriteUserIds: [user] });
}
