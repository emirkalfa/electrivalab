import { packager } from '@electron/packager';
import { createRequire } from 'node:module';
import { readdir, access } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const version = require('electron/package.json').version;
let electronZipDir;
if (process.env.LOCALAPPDATA) {
  const cache = path.join(process.env.LOCALAPPDATA, 'electron', 'Cache');
  for (const entry of await readdir(cache, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(cache, entry.name);
    try { await access(path.join(folder, `electron-v${version}-win32-x64.zip`)); electronZipDir = folder; break; } catch {}
  }
}
const outputs = await packager({ dir: '.', out: 'dist/0.1.6', name: 'ElectrivaLab', executableName: 'ElectrivaLab', platform: 'win32', arch: 'x64', electronVersion: version, icon: 'src/app-icon.ico', asar: true, prune: true, overwrite: false,
  ...(electronZipDir ? { electronZipDir } : {}),
  ignore: [/^\/dist(?:\/|$)/, /^\/tests(?:\/|$)/, /\.jpg$/, /^\/server\.mjs$/, /^\/\.git(?:\/|$)/],
  win32metadata: { CompanyName: 'ElectrivaLab', FileDescription: 'ElectrivaLab Elektronik Laboratuvarı', ProductName: 'ElectrivaLab' }
});
console.log(outputs.join('\n'));
