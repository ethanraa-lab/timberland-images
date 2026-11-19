import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const output = 'public/product-names.json';
const names = JSON.parse(await readFile(output, 'utf8'));
const queue = ['https://www.timberland.com/sitemap.xml'];
const seen = new Set();
let matched = 0;

while (queue.length) {
  const address = queue.shift();
  if (seen.has(address)) continue;
  seen.add(address);
  const response = await fetch(address, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error('Sitemap returned ' + response.status);
  let bytes = Buffer.from(await response.arrayBuffer());
  if (bytes[0] === 31 && bytes[1] === 139) bytes = gunzipSync(bytes);
  const xml = bytes.toString();
  const index = /<sitemapindex\b/i.test(xml);
  for (const entry of xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gs)) {
    const url = new URL(entry[1].replaceAll('&amp;', '&'), address);
    if (url.origin !== 'https://www.timberland.com') continue;
    if (index) {
      queue.push(url.href);
      continue;
    }
    const product = decodeURIComponent(url.pathname).match(/^\/en-(?:us|gb)\/p\/.*\/([^/]+)-(TB[A-Z0-9]{9})\/?$/i);
    if (!product) continue;
    const [, slug, code] = product;
    const title = slug.replace(/-+/g, ' ').trim().replace(/\b(men|women|kid)s\b/gi, "$1's").replace(/\b[a-z]/g, c => c.toUpperCase());
    if (title) {
      names[code.toUpperCase()] ??= title;
      matched++;
    }
  }
}
if (!matched) throw Error('No exact-code product links found in the official sitemaps');
await writeFile(output, JSON.stringify(names, null, 2) + '\n');
console.log(Object.keys(names).length + ' styles indexed');
