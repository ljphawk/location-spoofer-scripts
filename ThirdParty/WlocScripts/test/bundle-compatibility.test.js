import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const files = new Map([
  [new URL("../dist/v1/wloc.js", import.meta.url), "a1b361e60f0b434585260fb59c65d1ddbe3bff89ace3639f592e7d8af432b3c1"],
  [new URL("../dist/v1/wloc-settings.js", import.meta.url), "cbff047a7f42055615ee19e208ddfc2ec66833e6f2b75555eac84f1c299a66cf"],
  [new URL("../LICENSE", import.meta.url), "8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef"]
]);

test("vendored upstream files retain their pinned SHA-256 hashes", async () => {
  for (const [file, expectedHash] of files) {
    const contents = await readFile(file);
    const actualHash = createHash("sha256").update(contents).digest("hex");
    assert.equal(actualHash, expectedHash, file.pathname);
  }
});

test("settings bundle saves and queries wloc_settings in Shadowrocket", async () => {
  const source = await readFile(new URL("../dist/v1/wloc-settings.js", import.meta.url), "utf8");
  const storage = new Map();

  const run = (url) => {
    let result;
    vm.runInNewContext(source, {
      $rocket: {},
      $request: { url },
      $persistentStore: {
        read: (key) => storage.get(key) ?? null,
        write: (value, key) => {
          storage.set(key, value);
          return true;
        }
      },
      $done: (value) => { result = value; },
      console
    });
    return JSON.parse(result.response.body);
  };

  const saved = run("https://gs-loc.apple.com/wloc-settings/save?lon=121.1&lat=31.2&acc=25");
  assert.equal(saved.success, true);
  assert.equal(storage.has("wloc_settings"), true);

  const queried = run("https://gs-loc.apple.com/wloc-settings/save?action=query");
  assert.deepEqual(
    { success: queried.success, longitude: queried.longitude, latitude: queried.latitude, accuracy: queried.accuracy },
    { success: true, longitude: 121.1, latitude: 31.2, accuracy: 25 }
  );
});
