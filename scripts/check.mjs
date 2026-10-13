import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const seen = new Set();
async function check(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const text = await readFile(file, 'utf8');
  if (/\.(?:js|mjs)$/.test(file)) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
  }
  const references = [
    ...[...text.matchAll(/(?:src|href)=["'](\.\/[^"']+)["']/g)].map(match => [dirname(file), match[1]]),
    ...[...text.matchAll(/\bfrom\s+['"](\.\/[^'"]+)['"]/g)].map(match => [dirname(file), match[1]]),
    ...[...text.matchAll(/(?:src|poster|image):\s*['"](\.\/[^'"]+)['"]/g)].map(match => [resolve('.'), match[1]]),
    ...[...text.matchAll(/url\(['"]?(\.\/[^'"\)]+)['"]?\)/g)].map(match => [dirname(file), match[1]])
  ];
  for (const [base, reference] of references) {
    const target = resolve(base, reference);
    await access(target);
    if (/\.(?:html|css|js|mjs)$/.test(target)) await check(target);
  }
}
await check(resolve('index.html'));
const html = await readFile('index.html', 'utf8');
if (!/^<!doctype html>/i.test(html) || !html.includes('name="viewport"')) throw new Error('Missing native page document or viewport.');
console.log(`Syntax and relative resource paths verified (${seen.size} source files).`);
