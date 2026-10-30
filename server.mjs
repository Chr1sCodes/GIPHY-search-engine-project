import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production');
const vite = production ? null : await (await import('vite')).createServer({
  root, server: { middlewareMode: true, allowedHosts: true }, appType: 'spa',
});
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (vite) return vite.middlewares(req, res);
  const dist = path.join(root, 'dist');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end('Invalid URL encoding');
  }
  const requested = path.resolve(dist, `.${pathname}`);
  if (requested !== dist && !requested.startsWith(dist + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const file = path.extname(requested) ? requested : path.join(dist, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (error) {
    console.error('Static file request failed:', error.code);
    res.writeHead(404);
    res.end('Not found');
  }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log(`Loop is running at http://localhost:${process.env.PORT || 3000}`);
});
