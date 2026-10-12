import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixture = process.argv.includes('--proving-ground-fixture');
// Reuse the offline production build, not a parallel laboratory implementation.
if (fixture) await import('./build.mjs');
const root = fixture ? fileURLToPath(new URL('../dist/', import.meta.url)) : resolve(process.cwd());
const host = fixture ? '127.0.0.1' : process.env.HOST || '0.0.0.0';
const port = fixture ? 5174 : Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ts': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

const server = http.createServer(async (req, res) => {
    try {
      // The page requests versioned assets (for example `/sw.js?v=88` and
      // `/src/main.js?v=88`). Strip the query string before resolving a file,
      // or every versioned request resolves to a nonexistent name and 404s.
      const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]) || '/';
      const route = pathname === '/' ? 'index.html' : pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
      const p = fixture ? route : route.replace(/^src\/(.+)\.js$/, 'src/$1.ts');
      const full = resolve(root, p);
      // Containment is decided on path components, not on a string prefix: a
      // prefix test would also accept a sibling directory whose name merely
      // begins with the root name, such as `infinite-corridor-pages-release40`.
      const rel = relative(root, full);
      if (rel.startsWith('..') || isAbsolute(rel)) throw 0;
      let data = await readFile(full);
      if (extname(full) === '.ts') data = Buffer.from(data.toString().replaceAll(".ts'", ".js'"));
      res.setHeader('content-type', types[extname(full)] || 'application/octet-stream');
      res.end(data);
    } catch {
      res.statusCode = 404;
      res.end('Not found');
    }
  });

server.listen(port, host, () => {
  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : port;
  console.log(`Infinite Corridor at http://${host}:${activePort}${fixture ? '/proving-ground/' : ''}`);
});
