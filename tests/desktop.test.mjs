import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { resolveAsset } = require('../desktop/paths.cjs');
test('desktop only serves bundled application assets', () => {
  const root = 'C:\\VoltLab';
  assert.equal(resolveAsset('voltlab://app/', root).mime, 'text/html; charset=utf-8');
  assert.equal(resolveAsset('voltlab://app/src/app.js', root).mime, 'text/javascript; charset=utf-8');
  assert.equal(resolveAsset('voltlab://app/src/brand.svg', root).mime, 'image/svg+xml');
  for (const url of ['https://app/src/app.js', 'voltlab://other/src/app.js', 'voltlab://app/package.json', 'voltlab://app/desktop/main.cjs', 'voltlab://app/src/%2e%2e%2fpackage.json', 'voltlab://app/src/%5capp.js', 'voltlab://app/src/app.js%00']) assert.equal(resolveAsset(url, root), null, url);
});
