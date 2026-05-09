// Generates tutorial screenshots from Storybook's Tutorial/* stories.
//
// Usage: cd tutorial && npm run shoot
// Pre-req: Storybook must already be running (cd app && npm run storybook).
//
// Output goes to tutorial/screens-generated/ — never to tutorial/screens/.
// Once the user is happy with a frame, the file can be moved into screens/.
//
// Manifest comes from each story's parameters.tutorial.file. The script reads
// /index.json from Storybook, filters stories whose id starts with "tutorial-",
// then captures each one once per locale.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import WebSocket from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "screens-generated");

const STORYBOOK = process.env.STORYBOOK_URL ?? "http://localhost:6006";
const CDP_PORT = Number(process.env.CDP_PORT ?? 9223);
const CDP_PROFILE = "/tmp/chrome-cdp-tutorial-shoot";
const VIEWPORT = { width: 412, height: 900, deviceScaleFactor: 2, mobile: true };

const LOCALES = ["en", "sv"];

// --- helpers ---

const httpGetJson = (url) =>
  new Promise((resolve, reject) =>
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
        });
      })
      .on("error", reject),
  );

const cdp = (ws) => {
  let nextId = 1;
  const pending = new Map();
  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- main ---

const main = async () => {
  // 1. Discover Tutorial/* stories from Storybook's index.
  const idx = await httpGetJson(`${STORYBOOK}/index.json`);
  const entries = Object.values(idx.entries ?? idx.stories ?? {})
    .filter((e) => e.id?.startsWith("tutorial-") && e.type !== "docs");

  if (!entries.length) {
    console.error("No Tutorial/* stories found at", STORYBOOK);
    console.error("Is Storybook running on the expected port?");
    process.exit(1);
  }

  // 2. Each story exposes parameters.tutorial.file via storybook channel —
  //    but index.json doesn't include parameters. Derive the filename from
  //    the story name instead: kebab-case of name + locale suffix.
  //    This sidesteps a separate manifest fetch.
  const fileFromName = (name) =>
    name.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/\s+/g, "-").toLowerCase();

  // 3. Launch Chrome via CDP.
  spawnSync("pkill", ["-f", `user-data-dir=${CDP_PROFILE}`], { stdio: "ignore" });
  const chrome = spawn(
    "google-chrome",
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${CDP_PROFILE}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--headless=new",
      "about:blank",
    ],
    { stdio: "ignore", detached: true },
  );
  chrome.unref();

  // wait for CDP to come up
  for (let i = 0; i < 30; i++) {
    try { await httpGetJson(`http://localhost:${CDP_PORT}/json/version`); break; }
    catch { await sleep(200); }
  }

  const tabs = await httpGetJson(`http://localhost:${CDP_PORT}/json`);
  const tab = tabs.find((t) => t.type === "page") ?? tabs[0];
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.on("open", r));
  const send = cdp(ws);
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", VIEWPORT);

  mkdirSync(outDir, { recursive: true });

  // 4. Capture each story × locale.
  for (const entry of entries) {
    const file = fileFromName(entry.name);
    for (const locale of LOCALES) {
      const url = `${STORYBOOK}/iframe.html?id=${entry.id}&globals=locale:${locale}&viewMode=story`;
      await send("Page.navigate", { url });
      await sleep(1500); // wait for render
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const out = resolve(outDir, `${file}-${locale}.png`);
      writeFileSync(out, Buffer.from(data, "base64"));
      console.log(`saved ${out}`);
    }
  }

  ws.close();
  spawnSync("pkill", ["-f", `user-data-dir=${CDP_PROFILE}`], { stdio: "ignore" });
};

main().catch((err) => { console.error(err); process.exit(1); });
