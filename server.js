const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data.json');

function send(res, status, body, type = 'text/plain') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(body);
}

async function readJsonFile() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeJsonFile(data) {
  const safe = Array.isArray(data) ? data : [];
  const json = JSON.stringify(safe, null, 2);
  await fs.writeFile(DATA_PATH, json, 'utf8');
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/' || req.url === '/index.html') {
      const html = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
      return send(res, 200, html, 'text/html; charset=utf-8');
    }

    if (req.url === '/data.json' && req.method === 'GET') {
      const data = await readJsonFile();
      return send(res, 200, JSON.stringify(data), 'application/json; charset=utf-8');
    }

    if (req.url === '/data.json' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 5 * 1024 * 1024) req.destroy(); // 5MB guard
      });
      req.on('end', async () => {
        try {
          const parsed = body ? JSON.parse(body) : [];
          await writeJsonFile(parsed);
          send(res, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
        } catch (err) {
          send(res, 400, JSON.stringify({ ok: false, error: 'Invalid JSON' }), 'application/json; charset=utf-8');
        }
      });
      return;
    }

    // Static file fallback (only for files in root)
    const safePath = path.normalize(req.url || '').replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(ROOT, safePath);
    if (filePath.startsWith(ROOT) && safePath !== '/' && safePath !== '/data.json') {
      try {
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const type =
          ext === '.css' ? 'text/css; charset=utf-8' :
          ext === '.js' ? 'text/javascript; charset=utf-8' :
          ext === '.svg' ? 'image/svg+xml' :
          ext === '.json' ? 'application/json; charset=utf-8' :
          'application/octet-stream';
        return send(res, 200, data, type);
      } catch (err) {
        // fall through to 404
      }
    }

    return send(res, 404, 'Not Found');
  } catch (err) {
    console.error(err);
    return send(res, 500, 'Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
