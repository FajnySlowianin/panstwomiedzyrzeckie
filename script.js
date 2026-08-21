// Dane zapasowe – używane gdy nie da się wczytać kursy.txt
const DANE_ZAPASOWE = `

`.trim();

async function wczytajDane() {
  try {
    const res = await fetch('kursy.txt');
    if (res.ok) {
      const tekst = await res.text();
      if (tekst.trim()) return tekst;
    }
  } catch (e) {}
  return DANE_ZAPASOWE;
}

function parsuj(tekst) {
  return tekst.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(linia => {
      const p = linia.split(/\s+/);
      if (p.length < 2) return null;
      let dataCzas, kursStr;
      if (p.length >= 3 && /^\d{1,2}:\d{2}$/.test(p[1])) {
        dataCzas = p[0] + ' ' + p[1];
        kursStr = p[2];
      } else {
        dataCzas = p[0] + ' 00:00';
        kursStr = p[1];
      }
      const kurs = parseFloat(kursStr.replace(',', '.'));
      if (isNaN(kurs)) return null;
      return { dataCzas, kurs };
    })
    .filter(Boolean)
    .sort((a, b) => a.dataCzas.localeCompare(b.dataCzas));
}

function formatKurs(n) {
  return n.toFixed(2).replace('.', ',');
}

function formatZmiana(akt, pop) {
  if (pop === undefined) return { tekst: '—', klasa: 'neutral' };
  const d = akt - pop;
  const proc = (d / pop) * 100;
  const z = d > 0 ? '+' : '';
  return {
    tekst: `${z}${d.toFixed(2).replace('.', ',')} (${z}${proc.toFixed(1)}%)`,
    klasa: d > 0 ? 'up' : d < 0 ? 'down' : 'neutral'
  };
}

function rysujWykres(dane) {
  if (dane.length < 2) return '';
  const w = 360, h = 150, pad = 8;
  const kursy = dane.map(d => d.kurs);
  const min = Math.min(...kursy) * 0.97;
  const max = Math.max(...kursy) * 1.03;
  const range = max - min || 1;

  let path = '';
  let bars = '';
  dane.forEach((d, i) => {
    const x = pad + (i / (dane.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.kurs - min) / range) * (h - pad * 2);
    if (i === 0) path += `M ${x} ${y}`;
    else path += ` L ${x} ${y}`;

    if (i > 0) {
      const prev = dane[i - 1].kurs;
      const y1 = h - pad - ((prev - min) / range) * (h - pad * 2);
      const color = d.kurs >= prev ? '#facc15' : '#ef4444';
      const barW = Math.max(4, (w - pad * 2) / dane.length * 0.55);
      const top = Math.min(y, y1);
      const height = Math.abs(y - y1) || 2;
      bars += `<rect x="${x - barW/2}" y="${top}" width="${barW}" height="${height}" fill="${color}" rx="1"/>`;
    }
  });

  const lastX = pad + (w - pad * 2);
  const area = path + ` L ${lastX} ${h - pad} L ${pad} ${h - pad} Z`;

  return `
    <svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#facc15" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#facc15" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#grad)"/>
      ${bars}
      <path d="${path}" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function renderuj(dane) {
  const app = document.getElementById('app');
  if (!dane.length) {
    app.innerHTML = '<p style="text-align:center;color:#71717a">Brak danych</p>';
    return;
  }
  const ost = dane[dane.length - 1];
  let html = `
    <div class="price-box">
      <div class="price">${formatKurs(ost.kurs)}</div>
      <div class="price-time">${ost.dataCzas}</div>
    </div>
    <div class="chart-wrap">${rysujWykres(dane)}</div>
    <div class="card">
      <div class="header-row">
        <div>Data / godzina</div>
        <div>Kurs</div>
        <div style="text-align:right">Zmiana</div>
      </div>
  `;
  dane.forEach((wpis, i) => {
    const pop = i > 0 ? dane[i - 1].kurs : undefined;
    const z = formatZmiana(wpis.kurs, pop);
    html += `
      <div class="row">
        <div class="date">${wpis.dataCzas}</div>
        <div class="value">${formatKurs(wpis.kurs)}</div>
        <div class="change ${z.klasa}"><span class="badge">${z.tekst}</span></div>
      </div>
    `;
  });
  html += '</div>';
  app.innerHTML = html;
}

wczytajDane().then(tekst => renderuj(parsuj(tekst)));
