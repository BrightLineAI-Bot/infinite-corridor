import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export function inside(root, path) {
  const result = resolve(path), rel = relative(resolve(root), result);
  if (rel === ".." || rel.startsWith(`..${sep}`) || resolve(root) === result) throw new Error("artifact path escapes its root");
  return result;
}
export function inventory(root, { ignoreGit = false } = {}) {
  if (lstatSync(root).isSymbolicLink()) throw new Error("artifact root symlinks are forbidden");
  const result = Object.create(null);
  function walk(dir) {
    const lowerNames = new Set();
    for (const entry of readdirSync(dir).sort()) {
      if (ignoreGit && dir === root && entry === ".git") continue;
      if (lowerNames.has(entry.toLowerCase())) throw new Error("case-colliding artifact paths");
      lowerNames.add(entry.toLowerCase());
      const path = inside(root, join(dir, entry)), stat = lstatSync(path);
      if (stat.isSymbolicLink()) throw new Error("artifact symlinks are forbidden");
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) result[relative(root, path).split(sep).join("/")] = { bytes: stat.size, sha256: sha256(readFileSync(path)) };
      else throw new Error("unsupported artifact entry");
    }
  }
  walk(root);
  return result;
}
export const inventoryDigest = files => sha256(JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)))));

function versionText(text, token) {
  return text.replaceAll("?v=91", `?v=${token}`).replaceAll('const release = "91"', `const release = "${token}"`)
    .replaceAll('"Game release":"91"', `"Game release":"${token}"`).replaceAll("${CACHE_PREFIX}v91", "${CACHE_PREFIX}" + token)
    .replaceAll("${PREFIX}pg1-r91", "${PREFIX}" + token)
    .replace(/\brelease\s*:\s*91\b/g, `release: "${token}"`).replaceAll("Release 91", `Release ${token}`);
}

// Freeze a complete release once. Preview assets are copies of these exact
// versioned modules, with a scratch-only entry point and candidate-local URLs.
export function freezeArtifact(dist, destination, binding) {
  if (existsSync(destination)) throw new Error("artifact already exists; never rebuild a tested candidate");
  for (const file of ["index.html", "sw.js", "manifest.webmanifest", "src/main.js", "src/proving-ground-mobile.js", "proving-ground/index.html"])
    if (!existsSync(join(dist, file))) throw new Error(`missing build artifact: ${file}`);
  inventory(dist); // Reject links before copying anything.
  for (const name of [".git", "previews"]) if (existsSync(join(dist, name))) throw new Error(`reserved release path: ${name}`);
  mkdirSync(destination, { recursive: true });
  const release = join(destination, "release");
  cpSync(dist, release, { recursive: true, errorOnExist: true, force: false });
  const token = binding.proposalId;
  for (const file of Object.keys(inventory(release))) {
    if (/\.(js|html|webmanifest|css)$/.test(file)) {
      const path = join(release, file);
      writeFileSync(path, versionText(readFileSync(path, "utf8"), token));
    }
  }
  // Reset is scoped even on a shared origin. Scratch gameplay itself is in memory.
  const mobile = join(release, "src", "proving-ground-mobile.js");
  writeFileSync(mobile, readFileSync(mobile, "utf8").replaceAll("ic-proving-ground-scratch-v1", `ic-preview-${token}-scratch`));
  // No production HTML entry or persistence module is exposed in a preview.
  // Copy only the laboratory's actual static module dependency graph.
  const needed = new Set();
  function dependency(name) {
    if (needed.has(name)) return;
    if (name === "main" || name === "persistence") throw new Error("preview imports production persistence");
    needed.add(name);
    const text = readFileSync(join(release, "src", `${name}.js`), "utf8");
    for (const match of text.matchAll(/(?:from\s*|import\s*)["']\.\/([\w-]+)\.js(?:\?[^"']*)?["']/g)) dependency(match[1]);
  }
  dependency("proving-ground-mobile");
  const published = join(destination, "preview-site");
  mkdirSync(published);
  mkdirSync(join(published, "src"));
  for (const name of needed) cpSync(join(release, "src", `${name}.js`), join(published, "src", `${name}.js`));
  for (const name of ["assets", "styles.css", "icon.svg"]) cpSync(join(release, name), join(published, name), { recursive: true });
  let html = readFileSync(join(release, "proving-ground/index.html"), "utf8").replaceAll("../", "./")
    .replace("<title>Infinite Corridor - Proving Ground</title>", `<title>Corridor candidate ${token}</title>`)
    .replace("PROVING GROUND</strong>", `CANDIDATE PREVIEW</strong><span>${token}</span>`)
    .replaceAll("?v=pg1", `?v=${token}`);
  writeFileSync(join(published, "index.html"), html);
  const manifest = JSON.parse(readFileSync(join(release, "proving-ground/manifest.webmanifest"), "utf8"));
  manifest.name = `Infinite Corridor candidate ${token}`; manifest.short_name = "Corridor preview";
  manifest.id = "./"; manifest.scope = "./"; manifest.start_url = "./?dev=proving-ground";
  for (const icon of manifest.icons || []) icon.src = icon.src.replaceAll("../", "./");
  writeFileSync(join(published, "manifest.webmanifest"), JSON.stringify(manifest));
  writeFileSync(join(release, "release-identity.json"), JSON.stringify(binding));
  writeFileSync(join(published, "release-identity.json"), JSON.stringify(binding));
  const precache = ["./", ...Object.keys(inventory(published)).map(file => `./${file}`)];
  // Unique cache per candidate; never clear other candidates or production caches.
  writeFileSync(join(published, "sw.js"), `const CACHE=${JSON.stringify(`ic-preview-${token}`)},ASSETS=${JSON.stringify(precache)};
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.origin!==location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;e.respondWith(caches.open(CACHE).then(c=>c.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request))))});
`);
  validatePreview(published);
  const files = { release: inventory(release), preview: inventory(published) };
  return { release, preview: published, files, digest: inventoryDigest({ release: inventoryDigest(files.release), preview: inventoryDigest(files.preview) }) };
}

export function validatePreview(root) {
  const files = inventory(root);
  if (files["src/main.js"] || files["src/persistence.js"]) throw new Error("production entry present in preview");
  for (const file of Object.keys(files).filter(f => /\.(js|html|webmanifest|css)$/.test(f))) {
    const text = readFileSync(join(root, file), "utf8");
    if (/(?:["'`])\.\.\//.test(text)) throw new Error(`preview parent reference: ${file}`);
    for (const match of text.matchAll(/["'`]\.\/([\w./-]+\.(?:js|css|svg|png|webmanifest))(?:\?[^"'`]*)?["'`]/g)) {
      const base = file.startsWith("src/") ? join(root, "src") : root;
      if (!existsSync(inside(root, join(base, match[1])))) throw new Error(`missing preview dependency: ${file} -> ${match[1]}`);
    }
  }
  return { ok: true, files: Object.keys(files).length };
}

export function verifyArtifact(directory, expected) {
  const files = { release: inventory(join(directory, "release")), preview: inventory(join(directory, "preview-site")) };
  const digest = inventoryDigest({ release: inventoryDigest(files.release), preview: inventoryDigest(files.preview) });
  if (digest !== expected) throw new Error("tested artifact changed");
  validatePreview(join(directory, "preview-site"));
  return files;
}
