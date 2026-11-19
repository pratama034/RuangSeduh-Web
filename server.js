/**
 * server.js
 * Lightweight zero-dependency static dev server untuk menjalankan Kala Seduh via `npm run dev`.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = __dirname;
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function createStaticServer() {
  return http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    let pathname = decodeURIComponent(reqUrl.pathname);

    if (pathname === '/') {
      pathname = '/index.html';
    }

    // Cegah path traversal di luar folder proyek
    const filePath = path.normalize(path.join(ROOT_DIR, pathname));
    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        const status = err.code === 'ENOENT' ? 404 : 500;
        res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(status === 404 ? '404 Not Found' : '500 Internal Server Error');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    });
  });
}

function startServer(port) {
  const server = createStaticServer();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServer(port + 1);
      return;
    }
    console.error('Gagal menjalankan dev server:', err.message);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log('');
    console.log('  Kala Seduh Dev Server berjalan!');
    console.log(`  Lokal : http://localhost:${port}`);
    console.log('  Tekan Ctrl+C untuk berhenti.');
    console.log('');
  });
}

startServer(DEFAULT_PORT);
