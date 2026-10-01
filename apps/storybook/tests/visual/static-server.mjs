// Minimal static file server for the built storybook-static directory.
// Used by playwright.config.ts (webServer); no third-party dependency.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'storybook-static');
const port = Number(process.argv[3] ?? 6007);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const file = join(root, safe.endsWith('/') ? `${safe}index.html` : safe);
  if (!file.startsWith(root)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1');
