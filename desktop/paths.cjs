const path = require('node:path');
const mime = { '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };
function resolveAsset(raw, root) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'voltlab:' || url.host !== 'app') return null;
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\\') || pathname.includes('\0')) return null;
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (relative !== 'index.html' && !/^src\/[a-zA-Z0-9_-]+\.(?:js|mjs|css|svg)$/.test(relative)) return null;
    const target = path.resolve(root, relative);
    if (!target.startsWith(path.resolve(root) + path.sep)) return null;
    return { path: target, mime: mime[path.extname(target)] };
  } catch { return null; }
}
module.exports = { resolveAsset };
