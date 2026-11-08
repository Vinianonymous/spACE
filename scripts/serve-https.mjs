import { createServer } from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const certificates = fileURLToPath(new URL('../.local/https/', import.meta.url));
const keyPath = resolve(certificates, 'localhost-key.pem');
const certificatePath = resolve(certificates, 'localhost.pem');
if (!existsSync(resolve(root, 'index.html'))) throw new Error('Build first with npm run build.');
await mkdir(certificates, { recursive: true, mode: 0o700 });
if (!existsSync(keyPath) || !existsSync(certificatePath)) {
  const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certificatePath, '-sha256', '-days', '30', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-addext', 'basicConstraints=critical,CA:FALSE'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Could not generate local certificate. Install OpenSSL. ${result.stderr}`);
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.webm': 'video/webm' };
const server = createServer({ key: readFileSync(keyPath), cert: readFileSync(certificatePath), minVersion: 'TLSv1.2' }, async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'");
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (!['GET', 'HEAD'].includes(request.method || '')) { response.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'https://localhost').pathname);
    const candidate = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!candidate.startsWith(`${resolve(root)}${sep}`)) { response.writeHead(403).end(); return; }
    const actual = await realpath(candidate);
    if (!actual.startsWith(`${resolve(root)}${sep}`)) { response.writeHead(403).end(); return; }
    const info = await stat(actual);
    if (!info.isFile()) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[extname(actual)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : await readFile(actual));
  } catch {
    response.writeHead(404).end();
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(Number(process.env.PORT || 8443), '127.0.0.1', () => {
  console.log(`spACE production build: https://localhost:${process.env.PORT || 8443}`);
  console.log('Loopback only. Self-signed local certificate: expect a browser warning until explicitly trusted. Never use this certificate for public hosting.');
});
