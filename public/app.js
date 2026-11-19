const $ = id => document.getElementById(id),
  KEY = 'timberland-workbench-v1',
  HEAD = ['Handle', 'Item Code', 'Image Position', 'Image Src', 'Image Alt Text'];
let products = [],
  busy = false,
  drag = null;
try {
  const data = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(data)) products = data.filter(p => /^TB[A-Z0-9]{9}$/.test(p.code) && typeof p.handle === 'string' && Array.isArray(p.images)).map(p => ({
    ...p,
    images: p.images.filter(i => {
      try {
        return new URL(i.url).hostname === 'assets.timberland.com';
      } catch {
        return false;
      }
    })
  }));
} catch {}
const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[c]);
const verifiedNames = {
  TB010061713: "Men's Timberland® Premium 6-Inch Waterproof Boot",
  TB0A2MDGALY: "Men's Field Boot"
};

function setProductName(product, name) {
  product.name = name.trim();
  if (!product.autoHandle) return;
  const slug = product.name.normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  product.handle = [slug, product.code.toLowerCase()].filter(Boolean).join('-');
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(products));
    $('saved').textContent = 'Saved in this browser · ' + new Date().toLocaleTimeString();
  } catch {
    $('saved').textContent = 'Browser storage unavailable — export your work.';
  }
}
function rows() {
  return products.flatMap(p => p.images.map((im, i) => [p.handle, p.code, i + 1, im.url, `${p.code}- ${i === 0 ? 'hero view' : 'Alt ' + i}`]));
}
const REGIONS = ['US', 'Europe', 'Japan'];
const SEARCH = {
  US: 'https://www.timberland.com/en-us/search?searchTerm=',
  Europe: 'https://www.timberland.com/en-gb/search?searchTerm=',
  Japan: 'https://www.timberland.co.jp/search?q='
};
async function lookup(product, region, page = '') {
  try {
    const query = new URLSearchParams({
      code: product.code,
      region,
      page
    });
    const response = await fetch('/api/region?' + query, {
      signal: AbortSignal.timeout(11000)
    });
    if (!response.ok) throw Error();
    const result = await response.json();
    const images = (await Promise.all(result.images.map(validateImage))).filter(Boolean);
    return {
      ...result,
      images
    };
  } catch {
    return {
      images: [],
      message: 'Regional lookup needs the local Node server or a Netlify deploy with Functions.'
    };
  }
}
function regionalControls(product, index) {
  return `<details class="regions"><summary>Regional sources · US / Europe / Japan</summary>
    <p>${REGIONS.map(region => `<a href="${SEARCH[region] + product.code}" target="_blank" rel="noopener">${region} store ↗</a>`).join(' · ')}</p>
    <label for="region-${index}">Official product link (optional)</label>
    <input id="region-${index}" type="url" placeholder="Paste an official Timberland product link">
    <p>${REGIONS.map(region => `<button data-region="${region}" data-item="${index}">Check ${region}</button>`).join(' ')}</p>
    <p role="status">${esc(product.regionalMessage || '')}</p></details>`;
}
function render() {
  $('count').textContent = products.length;
  $('empty').hidden = !!products.length;
  $('empty').style.display = products.length ? 'none' : 'grid';
  $('products').innerHTML = products.map((p, pi) => `
    <article class="product">
      <div class="producthead">
        <div class="product-meta">
          <b>${esc(p.code)}</b>
          <span class="view-count">${p.images.length} ${p.images.length === 1 ? 'view' : 'views'}</span>
          <label>Product name <input data-name="${pi}" value="${esc(p.name ?? verifiedNames[p.code] ?? '')}" placeholder="Enter product name"></label>
          <label>Handle <input data-handle="${pi}" value="${esc(p.handle)}"></label>
        </div>
        ${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener">Official source ↗</a>` : ''}
      </div>
      ${p.error ? `<div class="message">${esc(p.error)} <button data-retry="${pi}">Retry</button></div>` : ''}
      <div class="gallery">
        ${p.images.map((im, i) => `
          <div class="photo ${i === 0 ? 'hero' : ''}" draggable="true" data-product="${pi}" data-index="${i}">
            <span class="view-badge">${String(i + 1).padStart(2, '0')} / ${i === 0 ? 'HERO' : 'ALT ' + i}</span>
            <img src="${esc(im.preview || im.url)}" alt="${esc(p.code)} ${i === 0 ? 'hero view' : 'Alt ' + i}" loading="lazy" data-p="${pi}" data-i="${i}">
            <div class="photofoot">
              <small title="${esc(im.url)}">${esc(im.url)}</small>
              <div class="view-actions">
                <button data-move="${pi},${i},-1" aria-label="Move image left" ${i === 0 ? 'disabled' : ''}>←</button>
                <button data-move="${pi},${i},1" aria-label="Move image right" ${i === p.images.length - 1 ? 'disabled' : ''}>→</button>
                <button data-hero="${pi},${i}" aria-label="Make image hero" ${i === 0 ? 'disabled' : ''}>Hero</button>
                <button data-delete="${pi},${i}" aria-label="Delete image">×</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div class="product-tools">
        ${regionalControls(p, pi)}
        <button data-remove="${pi}" aria-label="Delete product ${p.code}">
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/>
  </svg>
  Delete
</button>
      </div>
    </article>`).join('');
  $('export-file').disabled = $('export').disabled = busy || !rows().length;
  $('preview').disabled = !rows().length;
}
function validateImage(im) {
  return new Promise(resolve => {
    const image = new Image();
    const t = setTimeout(() => resolve(null), 15000);
    image.onload = () => {
      clearTimeout(t);
      resolve(image.naturalWidth >= 300 && image.naturalHeight >= 300 && !(image.naturalWidth === 2000 && image.naturalHeight === 2000) ? im : null);
    };
    image.onerror = () => {
      clearTimeout(t);
      resolve(null);
    };
    image.src = im.preview || im.url;
  });
}
async function load(p, sample = false) {
  p.error = '';
  try {
    let data;
    if (sample || p.code === 'TB010061713') {
      data = {
        ...window.TIMBERLAND_SAMPLE,
        images: window.TIMBERLAND_SAMPLE.images.map(image => image.view === 'HERO' ? {
          ...image,
          preview: 'sample-hero.png'
        } : image)
      };
    } else {
      const views = ['HERO', ...Array.from({
        length: 10
      }, (_, i) => 'ALT' + (i + 1))];
      data = {
        source: 'https://www.timberland.com/en-us/search?searchTerm=' + p.code,
        images: views.map(view => ({
          view,
          url: 'https://assets.timberland.com/image/upload/f_png,w_1200/' + p.code + '-' + view
        }))
      };
    }
    p.source = data.source;
    const imgs = await Promise.all(data.images.map(validateImage));
    p.images = imgs.filter(Boolean);
    if (!p.images.length || (!p.name && !location.hostname.endsWith('.github.io'))) {
      const results = await Promise.all(REGIONS.map(region => lookup(p, region)));
      const matches = results.filter(result => result.images.length);
      if (!p.name) {
        const named = results.find(result => result.name);
        if (named) setProductName(p, named.name);
      }
      if (!p.images.length) p.images = matches.flatMap(result => result.images).filter((image, index, all) => all.findIndex(other => other.url === image.url) === index);
      if (matches.length) p.source = matches[0].source;
    }
    if (!p.images.length) throw Error('No usable official photos loaded. Open Regional sources to try a store or paste an official product link.');
  } catch (e) {
    p.error = e.message;
  }
  save();
  render();
}
async function add(items) {
  if (busy) return;
  busy = true;
  $('find').disabled = true;
  $('file').disabled = true;
  $('new').disabled = true;
  $('sample').disabled = true;
  let invalid = 0;
  try {
    for (const item of items) {
      const code = String(item.code || '').trim().toUpperCase();
      if (!/^TB[A-Z0-9]{9}$/.test(code)) {
        invalid++;
        continue;
      }
      const handle = item.handle === undefined ? code.toLowerCase() : String(item.handle);
      if (!handle.trim()) {
        invalid++;
        continue;
      }
      if (products.some(p => p.code === code && (p.handle === handle || (item.handle === undefined && p.autoHandle)))) continue;
      const p = {
        code,
        handle,
        autoHandle: item.handle === undefined,
        images: [],
        error: ''
      };
      setProductName(p, verifiedNames[code] || '');
      products.push(p);
      $('status').textContent = 'Finding official photos for ' + code + '…';
      render();
      await load(p);
    }
    $('status').textContent = `Batch finished. ${rows().length} usable images.${invalid ? ' Skipped ' + invalid + ' invalid or incomplete rows.' : ''}`;
  } finally {
    busy = false;
    for (const id of ['find', 'file', 'new', 'sample']) $(id).disabled = false;
    render();
  }
}
$('find').onclick = () => {
  const codes = $('codes').value.split(/[\s,;]+/).filter(Boolean);
  if (!codes.length) {
    $('status').textContent = 'Enter at least one full TB code.';
    return;
  }
  add(codes.map(code => ({
    code
  })));
};
$('sample').onclick = () => add([{
  code: 'TB010061713'
}]);
$('file').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (!window.XLSX) throw Error('Excel library is unavailable. Reload the page.');
    const workbook = XLSX.read(await file.arrayBuffer(), {
      type: 'array'
    });
    let items = [];
    for (const name of workbook.SheetNames) {
      const grid = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1,
        defval: '',
        raw: false
      });
      const index = grid.findIndex(row => row.some(x => String(x).trim().toLowerCase() === 'handle') && row.some(x => String(x).trim().toLowerCase() === 'item code'));
      if (index < 0) continue;
      const headers = grid[index].map(x => String(x).trim().toLowerCase());
      items.push(...grid.slice(index + 1).filter(r => r.some(x => String(x).trim())).map(r => ({
        handle: r[headers.indexOf('handle')],
        code: r[headers.indexOf('item code')]
      })));
    }
    if (!items.length) throw Error('No data found. Include Handle and Item Code headers.');
    await add(items);
  } catch (e) {
    $('status').textContent = e.message;
  }
  e.target.value = '';
};
$('products').onchange = e => {
  if (e.target.dataset.name !== undefined) {
    const product = products[+e.target.dataset.name];
    setProductName(product, e.target.value);
    e.target.closest('.product-meta').querySelector('[data-handle]').value = product.handle;
    save();
  }
  if (e.target.dataset.handle !== undefined) {
    products[+e.target.dataset.handle].autoHandle = false;
    products[+e.target.dataset.handle].handle = e.target.value;
    save();
  }
};
$('products').onclick = async e => {
  const d = e.target.closest('button')?.dataset || e.target.dataset;
  if (d.region) {
    const product = products[+d.item];
    const section = e.target.closest('details');
    const status = section.querySelector('[role="status"]');
    e.target.disabled = true;
    status.textContent = 'Checking Timberland ' + d.region + '…';
    const result = await lookup(product, d.region, section.querySelector('input').value.trim());
    if (!products.includes(product)) return;
    if (result.name && !product.name) setProductName(product, result.name);
    const added = result.images.filter(image => !product.images.some(existing => existing.url === image.url));
    product.images.push(...added);
    if (added.length) {
      product.source = result.source;
      product.error = '';
    }
    product.regionalMessage = added.length ? d.region + ': ' + added.length + ' photos added.' : result.images.length ? 'These photos are already in the gallery.' : result.message;
    save();
    render();
    const current = $('products').children[products.indexOf(product)]?.querySelector('details');
    if (current) current.open = true;
    return;
  }
  if (d.delete) {
    const [p, i] = d.delete.split(',').map(Number);
    products[p].images.splice(i, 1);
  } else if (d.hero) {
    const [productIndex, imageIndex] = d.hero.split(',').map(Number);
    const images = products[productIndex].images;
    images.unshift(images.splice(imageIndex, 1)[0]);
  } else if (d.move) {
    const [p, i, delta] = d.move.split(',').map(Number);
    const arr = products[p].images;
    [arr[i], arr[i + delta]] = [arr[i + delta], arr[i]];
  } else if (d.remove !== undefined) {
    products.splice(+d.remove, 1);
  } else if (d.retry !== undefined) {
    if (!busy) {
      busy = true;
      load(products[+d.retry]).finally(() => {
        busy = false;
        render();
      });
    }
    return;
  } else return;
  save();
  render();
};
$('products').addEventListener('error', e => {
  if (e.target.tagName === 'IMG') {
    const p = products[+e.target.dataset.p],
      i = +e.target.dataset.i;
    if (p?.images[i]) {
      p.images.splice(i, 1);
      save();
      render();
    }
  }
}, true);
$('products').ondragstart = e => {
  const card = e.target.closest('.photo');
  if (card) {
    drag = [+card.dataset.product, +card.dataset.index];
    e.dataTransfer.effectAllowed = 'move';
  }
};
$('products').ondragover = e => {
  if (e.target.closest('.photo')) e.preventDefault();
};
$('products').ondrop = e => {
  e.preventDefault();
  const card = e.target.closest('.photo');
  if (!card || !drag) return;
  const [p, i] = drag,
    j = +card.dataset.index;
  if (p === +card.dataset.product) {
    const arr = products[p].images;
    arr.splice(j, 0, arr.splice(i, 1)[0]);
    save();
    render();
  }
  drag = null;
};
$('new').onclick = () => {
  if (products.length && !confirm('Start a new batch? Export first if you need to keep this workspace.')) return;
  products = [];
  $('codes').value = '';
  $('status').textContent = 'New batch ready.';
  save();
  render();
};
$('preview').onclick = () => {
  $('table').innerHTML = '<thead><tr>' + HEAD.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' + rows().map(r => '<tr>' + r.map(v => `<td>${esc(v)}</td>`).join('') + '</tr>').join('') + '</tbody>';
  $('dialog').showModal();
};
$('close').onclick = () => $('dialog').close();
$('export-file').onclick = () => $('export').click();
$('export').onclick = () => {
  if (!window.XLSX) {
    $('status').textContent = 'Excel library unavailable. Please reload.';
    return;
  }
  if (products.some(p => p.images.length && !p.handle.trim())) {
    $('status').textContent = 'Every product needs a handle before export.';
    return;
  }
  const book = XLSX.utils.book_new(),
    sheet = XLSX.utils.aoa_to_sheet([HEAD, ...rows()]);
  sheet['!cols'] = [{
    wch: 35
  }, {
    wch: 16
  }, {
    wch: 16
  }, {
    wch: 85
  }, {
    wch: 30
  }];
  XLSX.utils.book_append_sheet(book, sheet, 'Images');
  XLSX.writeFile(book, `Timberland_Images_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
render();

function enableSnoopyFollower() {
  const preference = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const snoopy = new Image(28, 36);
  snoopy.src = './snoopy-heart.svg';
  snoopy.alt = '';
  snoopy.draggable = false;
  snoopy.hidden = true;
  snoopy.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:1000;transition:transform 90ms ease-out';
  document.body.append(snoopy);

  function hide() {
    snoopy.hidden = true;
  }

  document.addEventListener('pointermove', event => {
    if (!preference.matches || event.pointerType !== 'mouse' || event.buttons) {
      hide();
      return;
    }

    const x = event.clientX + snoopy.width + 20 <= innerWidth ? event.clientX + 20 : event.clientX - snoopy.width - 20;
    const y = event.clientY + snoopy.height + 20 <= innerHeight ? event.clientY + 20 : event.clientY - snoopy.height - 20;
    snoopy.style.transform = `translate(${x}px, ${y}px)`;
    snoopy.hidden = false;
  });
  document.documentElement.addEventListener('pointerleave', hide);
  document.addEventListener('pointerdown', hide);
  document.addEventListener('dragstart', hide);
  window.addEventListener('blur', hide);
  preference.addEventListener('change', hide);
}

enableSnoopyFollower();
