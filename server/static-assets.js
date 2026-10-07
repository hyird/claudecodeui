import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';

function buildStaticAssets(directory) {
  const assets = new Map();

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const body = fs.readFileSync(fullPath);
      const urlPath = `/${path.relative(directory, fullPath).split(path.sep).join('/')}`;
      const precompressed = fullPath.endsWith('.woff2');
      assets.set(urlPath, {
        body,
        // WOFF2 already uses Brotli. Recompressing it wastes startup CPU and RAM.
        gzip: precompressed ? null : gzipSync(body, { level: 9 }),
        brotli: precompressed ? null : brotliCompressSync(body, {
          params: {
            [zlibConstants.BROTLI_PARAM_QUALITY]: 9,
            [zlibConstants.BROTLI_PARAM_SIZE_HINT]: body.length,
          },
        }),
        etag: `"${createHash('sha1').update(body).digest('base64url')}"`,
        type: Bun.file(fullPath).type,
        cacheControl: precompressed ? 'public, max-age=31536000, immutable' : 'no-cache',
      });
    }
  };

  walk(directory);
  return assets;
}

function sendStaticAsset(c, asset) {
  const headers = {
    'content-type': asset.type,
    etag: asset.etag,
    // The entry document changes on every deploy, so it must always revalidate. The
    // ETag turns that revalidation into a 304 instead of a full re-download.
    'cache-control': asset.cacheControl,
    vary: 'Accept-Encoding',
  };

  if (c.req.header('if-none-match') === asset.etag) {
    return new Response(null, { status: 304, headers });
  }

  const accepted = c.req.header('accept-encoding') ?? '';
  if (asset.brotli && accepted.includes('br')) {
    return new Response(asset.brotli, { headers: { ...headers, 'content-encoding': 'br' } });
  }
  if (asset.gzip && accepted.includes('gzip')) {
    return new Response(asset.gzip, { headers: { ...headers, 'content-encoding': 'gzip' } });
  }
  return new Response(asset.body, { headers });
}

export function registerStaticRoutes(app, distDir) {
  if (fs.existsSync(distDir)) {
    const staticAssets = buildStaticAssets(distDir);
    const indexAsset = staticAssets.get('/index.html');
    // Serve a real built asset when the path names one; otherwise hand back the
    // single-file index so the SPA can route it. Lookups hit the map, never the disk,
    // so a crafted path cannot escape the dist directory.
    app.get('*', (c) => {
      const asset = staticAssets.get(decodeURIComponent(c.req.path)) ?? indexAsset;
      if (!asset) {
        return c.text('Not found', 404);
      }
      return sendStaticAsset(c, asset);
    });
  }
}
