import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distRoot = resolve(repositoryRoot, 'dist');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const mountPath = '/timeline';

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function resolveRequestPath(url) {
  const parsed = new URL(url, `http://${host}:${port}`);
  let pathname = decodeURIComponent(parsed.pathname);

  if (pathname === mountPath) pathname = `${mountPath}/`;
  if (pathname.startsWith(`${mountPath}/`)) pathname = pathname.slice(mountPath.length);

  if (pathname === '/') pathname = '/index.html';

  const relativePath = normalize(pathname).replace(/^[/\\]+/, '');
  const candidate = resolve(distRoot, relativePath);
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${sep}`)) return null;
  return candidate;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url || '/');
  if (!filePath) {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  let resolvedPath = filePath;
  try {
    const stat = statSync(resolvedPath);
    if (stat.isDirectory()) resolvedPath = join(resolvedPath, 'index.html');
    if (!statSync(resolvedPath).isFile()) throw new Error('Not a file');
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': mimeTypes.get(extname(resolvedPath).toLowerCase()) || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(resolvedPath).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`Pages preview serving ${distRoot} at http://${host}:${port}${mountPath}/\n`);
});
