import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGiphy } from './api.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production');
const vite = production ? null : await (await import('vite')).createServer({
  root, server: { middlewareMode: true, allowedHosts: true }, appType: 'spa',
});
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  if (url.pathname === '/api/giphy') {
    const allowedOrigin = process.env.ALLOWED_ORIGIN;
    if (allowedOrigin && req.headers.origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      if (allowedOrigin && req.headers.origin !== allowedOrigin) {
        res.writeHead(403);
        return res.end();
      }
      res.writeHead(204, { Allow: 'GET, OPTIONS', 'Access-Control-Allow-Methods': 'GET, OPTIONS' });
      return res.end();
    }
    if (req.method !== 'GET') {
      res.writeHead(405, { Allow: 'GET' });
      return res.end();
    }
    const result = await fetchGiphy(req.url, process.env.GIPHY_API_KEY);
    res.writeHead(result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(result.body));
  }
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
