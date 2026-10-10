#!/usr/bin/env -S npx tsx

/**
 * dist/ を配信する最小限の静的ファイルサーバー (開発プレビュー用)
 *
 * 使い方: pnpm serve   (デフォルト port 8000)
 * 環境変数 PORT で変更可能。
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const DIST_DIR = resolve("./dist");
const PORT = Number(process.env.PORT ?? 8000);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function resolveFile(urlPath: string): Promise<string | null> {
  // ディレクトリトラバーサル防止
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(DIST_DIR, rel);

  if (!filePath.startsWith(DIST_DIR)) return null;

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, "index.html");
      await stat(filePath);
    }
    return filePath;
  } catch {
    return null;
  }
}

function notFound(res: ServerResponse): void {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const urlPath = new URL(req.url ?? "/", `http://localhost:${PORT}`).pathname;
  const filePath = await resolveFile(urlPath);

  if (!filePath) {
    notFound(res);
    return;
  }

  const type = MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  createReadStream(filePath)
    .on("error", () => notFound(res))
    .pipe(res);
});

server.listen(PORT, () => {
  console.log(`▶ Serving ./dist at http://localhost:${PORT}/`);
});
