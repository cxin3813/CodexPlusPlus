import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "node:test";

it("manager has no advertisement route, carousel, cards or loading action", async () => {
  const source = await readFile(new URL("./App.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /"recommendations"|SponsorBoard|RecommendationsScreen|AdGrid|refreshAds|load_ads/);
  assert.match(source, /function OverviewScreen\(/);
  assert.match(source, /id: "userScripts"/);
  assert.match(source, /id: "pluginMarket"/);
});

it("bundled default themes do not carry sponsor registrations", async () => {
  for (const path of ["./dream-skin.ts", "../../../assets/inject/upstream/dream-skin/macos/theme.json", "../../../assets/inject/upstream/cidala-tiger/macos/theme.json", "../../../crates/codex-plus-core/src/settings.rs"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /passion8\.cc|感谢 Passion8 赞助/);
  }
});

it("legacy sponsor tab requests resolve to the functional home page", async () => {
  const renderer = await readFile(new URL("../../../assets/inject/renderer-inject.js", import.meta.url), "utf8");
  const source = renderer.match(/  function codexPlusModalTab\(tab\) \{[\s\S]*?^  \}/m)?.[0];
  assert.ok(source);
  const normalize = new Function(`const codexPlusExtensionsTab = "extensions"; ${source}; return codexPlusModalTab;`)();
  assert.equal(normalize("sponsor"), "home");
  assert.equal(normalize("userScripts"), "extensions");
  assert.equal(normalize("extensions"), "extensions");
});

it("theme render serialization excludes saved promotions without mutating persisted settings", async () => {
  const source = await readFile(new URL("../../../crates/codex-plus-core/src/assets.rs", import.meta.url), "utf8");
  assert.match(source, /fn dream_skin_render_theme_json/);
  assert.doesNotMatch(source, /serde_json::to_string\(&settings\.codex_app_dream_skin_theme_config\)/);
  assert.match(source, /let mut theme = settings\.codex_app_dream_skin_theme_config\.clone\(\)/);
  assert.match(source, /theme\.extra_fields\.remove\(key\)/);
});
