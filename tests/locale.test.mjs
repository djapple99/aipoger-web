import assert from "node:assert/strict";
import test from "node:test";
import { langForCountry, langForRequest } from "../src/lib/locale.ts";

test("geo language policy maps the requested countries", () => {
  assert.equal(langForCountry("TW"), "zh");
  assert.equal(langForCountry("cn"), "zh");
  assert.equal(langForCountry("JP"), "ja");
  assert.equal(langForCountry("KR"), "ko");
  assert.equal(langForCountry("US"), "en");
  assert.equal(langForCountry("DE"), "en");
});

test("browser language is only a fallback when country geo is missing", () => {
  assert.equal(langForRequest("US", "zh-TW,zh;q=0.9"), "en");
  assert.equal(langForRequest(null, "zh-TW,zh;q=0.9"), "zh");
  assert.equal(langForRequest(undefined, "ja-JP,ja;q=0.9"), "ja");
  assert.equal(langForRequest(null, "fr-FR,fr;q=0.9"), "en");
});
