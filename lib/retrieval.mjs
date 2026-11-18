export function extractImages(html, code) {
 const clean=html.replaceAll('\\/','/').replaceAll('&amp;','&');
 const urls=clean.match(/https:\/\/assets\.timberland\.com\/[^\s"<>\\]+/g)||[];
 const found=new Map();
 for(const url of urls){
  const match=url.match(new RegExp('/'+code+'-(HERO|ALT\\d+)(?:/|\\.)','i'));
  if(!match||/logo|placeholder/i.test(url))continue;
  const key=match[1].toUpperCase();
  if(!found.has(key)||url.includes('h_1300'))found.set(key,url);
 }
 return [...found].sort((a,b)=>(a[0]==='HERO'?-1:b[0]==='HERO'?1:parseInt(a[0].slice(3))-parseInt(b[0].slice(3)))).map(([view,url])=>({view,url}));
}
export async function retrieve(code){
 if(!/^TB[A-Z0-9]{9}$/.test(code))throw Error('Use a full 11-character TB style code.');
 const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'Mozilla/5.0'}});if(!r.ok)throw Error('Official site returned '+r.status);const s=await r.text();if(/px-captcha|Access to this page has been denied/.test(s))throw Error('Official site blocked retrieval. Please retry later.');return s;};
 // Search discovers official product paths; no fabricated product slug or image URL.
 const search=await get('https://www.timberland.com/en-us/search?q='+code);
 let images=extractImages(search,code),source='https://www.timberland.com/en-us/search?q='+code;
 const paths=[...new Set((search.replaceAll('\\/','/').match(/(?:https:\/\/www\.timberland\.com)?\/en-us\/p\/[^\s"<>\\?#]+/g)||[]).filter(x=>x.toUpperCase().endsWith(code)))].slice(0,2);
 for(const path of paths){if(images.length)break;source=path.startsWith('https:')?path:'https://www.timberland.com'+path;images=extractImages(await get(source),code);}
 if(!images.length)throw Error('No matching official photos found. The style may be unavailable or the official search may be blocked.');
 return {code,source,images};
}
