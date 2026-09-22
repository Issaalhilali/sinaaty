#!/usr/bin/env node
/**
 * خادمٌ ساكن صغير للبناء الإنتاجي — بلا اعتماديات: يقدّم dist/ ويعيد index.html لأي مسارٍ لا يطابق ملفاً
 * (تطبيق صفحة واحدة يملك مساراته بنفسه). يستعمله CI وصورة Docker على المنفذ 3001 كما كانت النسخة السابقة.
 */
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', process.env.DIST_DIR ?? 'dist');
const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOSTNAME ?? '0.0.0.0';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8' };

const fileAt = (p) => { try { const s = statSync(p); return s.isFile() ? p : null; } catch { return null; } };

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const safe = normalize(url).replace(/^(\.\.[/\\])+/, '');
  const target = fileAt(join(ROOT, safe)) ?? join(ROOT, 'index.html');
  const ext = extname(target);
  const hashed = /\.[0-9A-Z]{8,}\.(js|css)$/i.test(target);
  res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream', 'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache' });
  createReadStream(target).pipe(res);
}).listen(PORT, HOST, () => console.log(`admin-web: serving ${ROOT} on http://${HOST}:${PORT}`));
