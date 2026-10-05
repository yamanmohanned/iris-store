#!/usr/bin/env node
/**
 * Pulls a Google Stitch project (screens' HTML + screenshots + design system)
 * through the Stitch MCP endpoint into ./design/stitch for analysis.
 *
 * Usage:
 *   STITCH_API_KEY=... node scripts/stitch-sync.mjs [projectId]
 *
 * Auth (one of):
 *   STITCH_API_KEY                       -> header X-Goog-Api-Key
 *   STITCH_ACCESS_TOKEN (+ GOOGLE_CLOUD_PROJECT) -> OAuth bearer token
 *
 * The key is read from the environment only; it is never written to disk.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ENDPOINT = process.env.STITCH_MCP_URL ?? "https://stitch.googleapis.com/mcp";
const PROJECT_ID = process.argv[2] ?? process.env.STITCH_PROJECT_ID ?? "1055627941288859978";
const OUT_DIR = path.resolve("design/stitch");

function authHeaders() {
  if (process.env.STITCH_API_KEY) return { "X-Goog-Api-Key": process.env.STITCH_API_KEY };
  if (process.env.STITCH_ACCESS_TOKEN) {
    const h = { Authorization: `Bearer ${process.env.STITCH_ACCESS_TOKEN}` };
    if (process.env.GOOGLE_CLOUD_PROJECT)
      h["X-Goog-User-Project"] = process.env.GOOGLE_CLOUD_PROJECT;
    return h;
  }
  console.error(
    "✖ Missing credentials. Set STITCH_API_KEY (Stitch → Settings → API keys) in the environment.",
  );
  process.exit(1);
}

let rpcId = 0;
async function callTool(name, args) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...authHeaders(),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const raw = await res.text();
  // The endpoint may answer with plain JSON or a single SSE "data:" frame.
  const jsonText =
    raw.startsWith("event:") || raw.startsWith("data:")
      ? raw
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5))
          .join("")
      : raw;
  const msg = JSON.parse(jsonText);
  if (msg.error) throw new Error(`${name}: ${JSON.stringify(msg.error)}`);
  const result = msg.result ?? {};
  if (result.isError) {
    throw new Error(`${name}: ${result.content?.map((c) => c.text).join(" ") ?? "unknown error"}`);
  }
  if (result.structuredContent) return result.structuredContent;
  const text = result.content?.find((c) => c.type === "text")?.text;
  try {
    return text ? JSON.parse(text) : result;
  } catch {
    return { text };
  }
}

function slugify(s, fallback) {
  const slug = String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

async function download(url, file) {
  const candidates = [url];
  // FIFE image URLs serve a downscaled image unless a size option is appended.
  if (/googleusercontent\.com/.test(url) && !/=[a-z]\d/i.test(url.split("/").pop() ?? "")) {
    candidates.unshift(`${url}=s0`);
  }
  for (const u of candidates) {
    try {
      const res = await fetch(u);
      if (!res.ok) continue;
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      return true;
    } catch {
      /* try next candidate */
    }
  }
  return false;
}

async function main() {
  await mkdir(path.join(OUT_DIR, "screens"), { recursive: true });
  console.log(`→ Fetching Stitch project ${PROJECT_ID}`);

  const project = await callTool("get_project", { name: `projects/${PROJECT_ID}` });
  await writeFile(path.join(OUT_DIR, "project.json"), JSON.stringify(project, null, 2));

  let designSystems = null;
  try {
    designSystems = await callTool("list_design_systems", { projectId: PROJECT_ID });
    await writeFile(
      path.join(OUT_DIR, "design-systems.json"),
      JSON.stringify(designSystems, null, 2),
    );
  } catch (e) {
    console.warn(`! list_design_systems failed: ${e.message}`);
  }

  const listed = await callTool("list_screens", { projectId: PROJECT_ID });
  const screens = listed.screens ?? [];
  await writeFile(path.join(OUT_DIR, "screens.json"), JSON.stringify(listed, null, 2));
  console.log(`→ ${screens.length} screens`);

  const rows = [];
  for (const [i, s] of screens.entries()) {
    const id = s.name?.split("/").pop() ?? String(i);
    const base = `${String(i + 1).padStart(2, "0")}-${slugify(s.title, id)}`;
    let full = s;
    if (!s.htmlCode?.downloadUrl && s.name) {
      try {
        full = await callTool("get_screen", { name: s.name });
      } catch (e) {
        console.warn(`! get_screen ${s.name}: ${e.message}`);
      }
    }
    const htmlOk = full.htmlCode?.downloadUrl
      ? await download(full.htmlCode.downloadUrl, path.join(OUT_DIR, "screens", `${base}.html`))
      : false;
    const pngOk = full.screenshot?.downloadUrl
      ? await download(full.screenshot.downloadUrl, path.join(OUT_DIR, "screens", `${base}.png`))
      : false;
    rows.push(
      `| ${i + 1} | ${s.title ?? "(untitled)"} | ${s.deviceType ?? ""} | ${s.width ?? "?"}×${s.height ?? "?"} | ${htmlOk ? `[html](screens/${base}.html)` : "—"} | ${pngOk ? `[png](screens/${base}.png)` : "—"} |`,
    );
    console.log(`  ${htmlOk ? "✓" : "✗"} html  ${pngOk ? "✓" : "✗"} png  ${s.title}`);
  }

  const index = [
    `# Stitch project ${PROJECT_ID}`,
    "",
    `Title: **${project.title ?? project.displayName ?? "?"}** — synced ${new Date().toISOString()}`,
    "",
    "| # | Screen | Device | Size | HTML | Screenshot |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "INDEX.md"), index);
  console.log(`✓ Saved to ${path.relative(process.cwd(), OUT_DIR)}/ (see INDEX.md)`);
}

main().catch((e) => {
  console.error(`✖ ${e.message}`);
  process.exit(1);
});
