import { extractImages } from './retrieval.mjs';

const stores = {
  US: 'https://www.timberland.com/en-us/search?searchTerm=',
  Europe: 'https://www.timberland.com/en-gb/search?searchTerm=',
  Japan: 'https://www.timberland.co.jp/search?q=',
};

function productLink(value, region, code) {
  try {
    const url = new URL(value, stores[region]);
    const host = new URL(stores[region]).hostname;
    const locale = region === 'US' ? '/en-us/p/' : region === 'Europe' ? '/en-gb/p/' : '/p/';
    if (url.origin !== 'https://' + host || !url.pathname.startsWith(locale)) return null;
    if (!new RegExp(code + '(?:[0-9]{1,2}\\.html|\\.html|/)?$', 'i').test(url.pathname)) return null;
    return url.origin + url.pathname;
  } catch {
    return null;
  }
}

async function page(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(4500) });
  if (!response.ok) throw Error('Official store returned ' + response.status);
  return (await response.text()).replaceAll('\\/', '/').replaceAll('&amp;', '&');
}

export async function regionalLookup(params) {
  const code = params.get('code') || '';
  const region = params.get('region') || '';
  if (!/^TB[A-Z0-9]{9}$/.test(code) || !Object.hasOwn(stores, region)) {
    return { images: [], message: 'Invalid style code or region.' };
  }
  const search = stores[region] + code;
  const supplied = params.get('page');
  try {
    const manual = supplied && productLink(supplied, region, code);
    if (supplied && !manual) return { images: [], message: 'Use an official product link ending in this style code.' };
    let source = manual || search;
    let html = await page(source);
    if (!manual) {
      const links = html.match(/(?:https:\/\/[^"'\s<>]+)?\/(?:en-us\/|en-gb\/)?p\/[^"'\s<>?#]+/g) || [];
      const match = links.map(link => productLink(link, region, code)).find(Boolean);
      if (match) {
        source = match;
        html = await page(source);
      }
    }
    const images = extractImages(html, code);
    const heading = productLink(source, region, code) && images.length
      ? html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      : '';
    const name = (heading || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return { source, images, name, message: images.length ? 'Official photos found.' : 'No exact-code gallery found.' };
  } catch {
    return { source: search, images: [], message: 'Official store unavailable or blocked. Try its product link.' };
  }
}
