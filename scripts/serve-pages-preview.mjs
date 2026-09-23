import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const distRoot = resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const mountPath = "/timeline";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  let relativePath;

  if (pathname === mountPath || pathname === `${mountPath}/`) {
    relativePath = "index.html";
  } else if (pathname.startsWith(`${mountPath}/`)) {
    relativePath = pathname.slice(mountPath.length + 1);
  } else {
    return null;
  }

  const candidate = resolve(distRoot, relativePath || "index.html");
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${sep}`)) return null;
  return candidate;
}

const server = createServer((request, response) => {
  if (request.url === "/__ready") {
    response.writeHead(204);
    response.end();
    return;
  }

  const filePath = resolveRequestPath(request.url || "/");
  if (!filePath) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  try {
    if (!statSync(filePath).isFile()) throw new Error("Not a file");
  } catch {
    process.stderr.write(`Pages preview missing ${filePath} for ${request.url}\n`);
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mimeTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  let indexStatus = "missing";
  try {
    indexStatus = statSync(resolve(distRoot, "index.html")).isFile() ? "present" : "not-file";
  } catch {}
  process.stderr.write(
    `Pages preview root=${distRoot} index=${indexStatus} url=http://${host}:${port}${mountPath}/\n`,
  );
});
