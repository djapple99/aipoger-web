import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(tsx?|html|md)$/.test(entry.name) ? [path] : [];
  });
}

test("public source does not promise retired analysis, certification, survival, or APC rewards", () => {
  // Match outward-facing promises, not historical database fields or legitimate ear checks.
  const retiredPromises = /A&R(?: Gate| Check| validation| 聽感驗證)|(?:通過驗證的作品才往|validated work toward) Showtime|SURVIVAL BAR|生存\s*Bar|생존 Bar|survival Bar|\+188 APC|APC POT|public_vote_score[^\n]* APC|公測期免 APC 入場/i;
  const files = [...sourceFiles(new URL("../src", import.meta.url).pathname), ...sourceFiles(new URL("../public", import.meta.url).pathname)];
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), retiredPromises, file);
  }
});
