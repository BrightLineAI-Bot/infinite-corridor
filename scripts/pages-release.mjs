#!/usr/bin/env node
// GitHub Actions release tooling (Tim, 2026-10-18): previews and production publishing run on
// Actions instead of Tim's PC. The artifact itself is still frozen by src/release-artifact.mjs,
// exactly as the retired PC tool froze it, and gh-pages keeps the same layout: the release at
// the root, previews/<id>/, and release-identity.json naming the live candidate.
//
//   freeze   --dist dist --out <dir> --commit <sha> --tree <sha>   build output -> candidate dir
//   verify   --candidate <dir>                                     re-check a downloaded candidate
//   preview  --site <gh-pages checkout> --candidate <dir> [--keep 10]
//   release  --site <gh-pages checkout> --candidate <dir>
//   resolve  --repo owner/name [--candidate <id or commit>]        newest previewed candidate
//   wait     --url <url> --expect <json file>                      until Pages serves those bytes
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { freezeArtifact, verifyArtifact, inventory, inventoryDigest, inside } from "../src/release-artifact.mjs";

export const SITE_URL = "https://brightlineai-bot.github.io/infinite-corridor/";
export const PREVIEW_WORKFLOW = ".github/workflows/preview.yml";
export const KEEP_PREVIEWS = 10;
export const ID_RE = /^r\d+-[0-9a-f]{12}$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const PREVIEW_DIR_RE = /^[\w-]+$/;

export const candidateId = (release, commit) => {
  if (!/^\d+$/.test(String(release)) || !SHA_RE.test(commit)) throw new Error("candidate id needs a release number and a full commit SHA");
  return `r${release}-${commit.slice(0, 12)}`;
};

export function sourceRelease(root) {
  const release = /const release = "(\d+)"/.exec(readFileSync(join(root, "index.html"), "utf8"))?.[1];
  if (!release) throw new Error("index.html declares no release number");
  return release;
}

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${String(r.stderr).trim().slice(-1000)}`);
  return r.stdout.trim();
}

const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const without = (files, prefix) => Object.fromEntries(Object.entries(files).filter(([path]) => !path.startsWith(prefix)));
const within = (files, prefix) => Object.fromEntries(Object.entries(files).filter(([path]) => path.startsWith(prefix)).map(([path, value]) => [path.slice(prefix.length), value]));

// The frozen release must carry the candidate id everywhere the old tool put its proposal id.
// If release-artifact.mjs was not bumped with the release, its replacements silently miss.
function assertVersioned(release, id) {
  const checks = [["index.html", `const release = "${id}"`], ["sw.js", `\${CACHE_PREFIX}${id}`], ["sw.js", `?v=${id}`], ["proving-ground/sw.js", `\${PREFIX}${id}`], ["src/main.js", `release: "${id}"`], ["src/main.js", `Release ${id}`], ["proving-ground/index.html", `?v=${id}`], ["src/proving-ground-mobile.js", `"Game release":"${id}"`]];
  for (const [file, text] of checks) if (!readFileSync(join(release, file), "utf8").includes(text)) throw new Error(`frozen ${file} lacks ${JSON.stringify(text)}: was src/release-artifact.mjs bumped with the release?`);
}

export function freeze({ root = ".", dist = "dist", out, commit, tree }) {
  if (!SHA_RE.test(commit || "") || !SHA_RE.test(tree || "")) throw new Error("freeze needs full --commit and --tree SHAs");
  const release = sourceRelease(root), id = candidateId(release, commit);
  const binding = { proposalId: id, candidateCommit: commit, candidateTree: tree };
  const artifact = freezeArtifact(resolve(dist), resolve(out), binding);
  assertVersioned(artifact.release, id);
  const candidate = { id, release, commit, tree, binding, digest: artifact.digest, files: artifact.files };
  writeFileSync(join(out, "candidate.json"), `${JSON.stringify(candidate, null, 2)}\n`);
  return candidate;
}

// A downloaded candidate must be byte-identical to what freeze recorded, and self-consistent.
export function verifyCandidate(dir) {
  const candidate = readJson(join(dir, "candidate.json"));
  if (!ID_RE.test(candidate.id) || candidate.id !== candidateId(candidate.release, candidate.commit)) throw new Error("candidate id does not match its release and commit");
  const files = verifyArtifact(dir, candidate.digest);
  if (inventoryDigest(files.release) !== inventoryDigest(candidate.files.release) || inventoryDigest(files.preview) !== inventoryDigest(candidate.files.preview)) throw new Error("candidate inventory differs from candidate.json");
  const expected = JSON.stringify(candidate.binding);
  for (const part of ["release", "preview-site"]) if (readFileSync(join(dir, part, "release-identity.json"), "utf8") !== expected) throw new Error(`${part} release-identity.json does not name this candidate`);
  if (candidate.binding.proposalId !== candidate.id || candidate.binding.candidateCommit !== candidate.commit || candidate.binding.candidateTree !== candidate.tree) throw new Error("candidate binding mismatch");
  return candidate;
}

export function liveIdentity(site) {
  const path = join(site, "release-identity.json");
  return existsSync(path) ? readJson(path) : null;
}

// Newest first, by the last gh-pages commit that touched each preview. Needs full history.
export function previewsByAge(site) {
  if (git(site, "rev-parse", "--is-shallow-repository") === "true") throw new Error("gh-pages checkout is shallow; fetch full history to order previews");
  const dir = join(site, "previews");
  const present = existsSync(dir) ? readdirSync(dir).filter(name => PREVIEW_DIR_RE.test(name)) : [];
  const order = [];
  for (const line of git(site, "log", "--format=", "--name-only", "--", "previews").split("\n")) {
    const name = line.split("/")[1];
    if (name && present.includes(name) && !order.includes(name)) order.push(name);
  }
  return [...order, ...present.filter(name => !order.includes(name)).sort()];
}

export function stagePreview({ site, candidate: dir, keep = KEEP_PREVIEWS }) {
  const candidate = verifyCandidate(dir), before = inventory(site, { ignoreGit: true });
  const dest = inside(site, join(site, "previews", candidate.id));
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(join(site, "previews"), { recursive: true });
  cpSync(join(dir, "preview-site"), dest, { recursive: true });
  const live = liveIdentity(site)?.proposalId;
  const ordered = [candidate.id, ...previewsByAge(site).filter(name => name !== candidate.id)];
  const kept = ordered.slice(0, keep), pruned = [];
  for (const name of ordered.slice(keep)) {
    if (name === live) { kept.push(name); continue; }
    rmSync(inside(site, join(site, "previews", name)), { recursive: true });
    pruned.push(name);
  }
  const after = inventory(site, { ignoreGit: true });
  if (inventoryDigest(within(after, `previews/${candidate.id}/`)) !== inventoryDigest(candidate.files.preview)) throw new Error("staged preview differs from the candidate");
  if (inventoryDigest(without(after, "previews/")) !== inventoryDigest(without(before, "previews/"))) throw new Error("preview staging changed the live site");
  for (const name of kept) if (name !== candidate.id && inventoryDigest(within(after, `previews/${name}/`)) !== inventoryDigest(within(before, `previews/${name}/`))) throw new Error(`preview staging changed preview ${name}`);
  if (live && !existsSync(join(site, "previews", live))) console.warn(`note: the live candidate ${live} has no preview directory`);
  return { id: candidate.id, commit: candidate.commit, release: candidate.release, url: `${SITE_URL}previews/${candidate.id}/`, live, kept, pruned };
}

export function stageRelease({ site, candidate: dir }) {
  const candidate = verifyCandidate(dir), before = inventory(site, { ignoreGit: true });
  const previewed = within(before, `previews/${candidate.id}/`);
  if (!Object.keys(previewed).length) throw new Error(`candidate ${candidate.id} has no preview on gh-pages; preview it before publishing`);
  if (inventoryDigest(previewed) !== inventoryDigest(candidate.files.preview)) throw new Error(`gh-pages previews/${candidate.id}/ differs from the candidate artifact`);
  const previous = liveIdentity(site);
  for (const entry of readdirSync(site)) if (entry !== ".git" && entry !== "previews") rmSync(inside(site, join(site, entry)), { recursive: true });
  for (const entry of readdirSync(join(dir, "release"))) {
    if (entry === "previews" || entry === ".git") throw new Error(`reserved release path: ${entry}`);
    cpSync(join(dir, "release", entry), inside(site, join(site, entry)), { recursive: true });
  }
  const after = inventory(site, { ignoreGit: true });
  if (inventoryDigest(without(after, "previews/")) !== inventoryDigest(candidate.files.release)) throw new Error("staged release differs from the candidate artifact");
  if (inventoryDigest(within(after, "previews/")) !== inventoryDigest(within(before, "previews/"))) throw new Error("release staging changed previews/");
  return { id: candidate.id, commit: candidate.commit, release: candidate.release, previous, identity: candidate.binding, url: SITE_URL };
}

async function github(path, token) {
  const response = await fetch(`https://api.github.com${path}`, { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" } });
  if (!response.ok) throw new Error(`GitHub API ${path}: ${response.status}`);
  return response.json();
}

// Find the newest candidate artifact uploaded by a preview.yml run on main, optionally narrowed
// to one candidate id or commit. Publish never rebuilds: it downloads exactly this artifact.
export async function resolveCandidate({ repo, candidate = "", token, api = github }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("bad --repo");
  const wanted = candidate.trim().toLowerCase();
  if (wanted && !ID_RE.test(wanted) && !/^[0-9a-f]{7,40}$/.test(wanted)) throw new Error("candidate must be a preview id like r181-0123456789ab or a commit SHA");
  const query = ID_RE.test(wanted) ? `&name=candidate-${wanted}` : "";
  for (let page = 1; page <= 5; page++) {
    const { artifacts = [] } = await api(`/repos/${repo}/actions/artifacts?per_page=100&page=${page}${query}`, token);
    for (const artifact of artifacts.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))) {
      const id = /^candidate-(r\d+-[0-9a-f]{12})$/.exec(artifact.name)?.[1], run = artifact.workflow_run || {};
      if (!id || artifact.expired || run.head_branch !== "main" || !SHA_RE.test(run.head_sha || "")) continue;
      if (wanted && !ID_RE.test(wanted) && !run.head_sha.startsWith(wanted)) continue;
      if (!id.endsWith(run.head_sha.slice(0, 12))) continue;
      const details = await api(`/repos/${repo}/actions/runs/${run.id}`, token);
      if (details.path !== PREVIEW_WORKFLOW || details.head_branch !== "main" || !["push", "workflow_dispatch"].includes(details.event)) continue;
      return { id, artifact: artifact.name, runId: run.id, commit: run.head_sha };
    }
    if (artifacts.length < 100) break;
  }
  throw new Error(wanted ? `no unexpired preview artifact on main for ${wanted}` : "no unexpired preview artifact on main");
}

// Poll with a cache-buster until the URL serves exactly the expected bytes.
export async function waitFor({ url, expected, timeoutMs = 15 * 60 * 1000, intervalMs = 15000, onSlow }) {
  const started = Date.now();
  let last = "", slowCalled = false;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`, { cache: "no-store" });
      last = `${response.status}`;
      if (response.ok && (await response.text()).trim() === expected.trim()) return { ok: true, seconds: Math.round((Date.now() - started) / 1000) };
    } catch (error) { last = error.message; }
    if (onSlow && !slowCalled && Date.now() - started > 4 * 60 * 1000) { slowCalled = true; await onSlow(); }
    await new Promise(done => setTimeout(done, intervalMs));
  }
  throw new Error(`${url} did not serve the expected content within ${Math.round(timeoutMs / 60000)} minutes (last: ${last})`);
}

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

// Results go to stdout as JSON and, on Actions, to step outputs.
function report(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (process.env.GITHUB_OUTPUT) for (const key of ["id", "commit", "release", "url", "runId", "artifact"]) if (result[key] != null) appendFileSync(process.env.GITHUB_OUTPUT, `${key === "runId" ? "run_id" : key}=${result[key]}\n`);
}

async function main(action) {
  if (action === "freeze") { const c = freeze({ dist: arg("dist", "dist"), out: arg("out"), commit: arg("commit"), tree: arg("tree") }); return { id: c.id, commit: c.commit, release: c.release, digest: c.digest }; }
  if (action === "verify") { const c = verifyCandidate(arg("candidate")); return { id: c.id, commit: c.commit, release: c.release, digest: c.digest }; }
  if (action === "preview") return stagePreview({ site: arg("site"), candidate: arg("candidate"), keep: Number(arg("keep", KEEP_PREVIEWS)) });
  if (action === "release") return stageRelease({ site: arg("site"), candidate: arg("candidate") });
  if (action === "resolve") return resolveCandidate({ repo: arg("repo"), candidate: arg("candidate", process.env.CANDIDATE || ""), token: process.env.GH_TOKEN });
  if (action === "wait") {
    const repo = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN;
    // A push by GITHUB_TOKEN normally starts a Pages build; ask once more if it is slow.
    const onSlow = repo && token ? async () => { await fetch(`https://api.github.com/repos/${repo}/pages/builds`, { method: "POST", headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}` } }).then(r => console.log(`requested a Pages build: ${r.status}`), e => console.log(`Pages build request failed: ${e.message}`)); } : undefined;
    return waitFor({ url: arg("url"), expected: readFileSync(arg("expect"), "utf8"), timeoutMs: Number(arg("timeout-minutes", 15)) * 60000, onSlow });
  }
  throw new Error(`unknown action: ${action}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv[2]).then(report, error => { console.error(`error: ${error.message}`); process.exitCode = 1; });
}
