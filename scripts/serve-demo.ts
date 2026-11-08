import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist-demo');
const base = '/Real-Estate-Listing-Maker/';
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};
createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname === '/') {
      response.writeHead(302, { Location: base });
      response.end();
      return;
    }
    if (!url.pathname.startsWith(base)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const path = resolve(
      root,
      decodeURIComponent(url.pathname.slice(base.length)) || 'index.html',
    );
    if (!path.startsWith(root + sep)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(4173, '127.0.0.1', () =>
  console.log(`Static demo preview listening on port 4173 at ${base}`),
);
