// ============================================
//  DANE – edytuj tutaj albo w pliku kursy.txt
// ============================================
// Format: "RRRR-MM-DD GG:MM kurs"
// Przykład: 2026-08-21 00:12 1.32

const DANE_ZAPASOWE = `
2026-08-01 12:00 1.00
2026-08-05 15:30 1.12
2026-08-10 09:15 0.98
2026-08-15 18:45 1.25
2026-08-20 22:10 1.18
2026-08-21 00:05 1.22
`.trim();

// ============================================

async function wczytajDane() {
  try {
    const res = await fetch('kursy.txt');
    if (res.ok) {
      const tekst = await res.text();
      if (tekst.trim()) return tekst;
    }
  } catch (e) {
    // fetch nie działa przy file://
  }
  return DANE_ZAPASOWE;
}

function parsuj(tekst) {
  return tekst
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(linia => {
      // Obsługuje: "2026-08-21 00:12 1.32"   lub   "2026-08-21 1.32"
      const czesci = linia.split(/\s+/);
      if (czesci.length < 2) return null;

      let dataCzas, kursStr;

      if (czesci.length >= 3 && /^\d{1,2}:\d{2}$/.test(czesci[1])) {
        // ma godzinę
        dataCzas = czesci[0] + ' ' + czesci[1];
        kursStr = czesci[2];
      } else {
        // tylko data
        dataCzas = czesci[0] + ' 00:00';
        kursStr = czesci[1];
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

function formatZmiana(aktualny, poprzedni) {
  if (poprzedni === undefined) return { tekst: '—', klasa: 'neutral' };
  const diff = aktualny - poprzedni;
  const proc = (diff / poprzedni) * 100;
  const znak = diff > 0 ? '+' : '';
  const tekst = `${znak}${diff.toFixed(2).replace('.', ',')} (${znak}${proc.toFixed(1)}%)`;
  const klasa = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
  return { tekst, klasa };
}

function renderuj(dane) {
  const app = document.getElementById('app');

  if (!dane.length) {
    app.innerHTML = `
      <h1>Giełda mojej waluty</h1>
      <p class="subtitle">Brak danych</p>
      <div class="error">Dodaj wpisy w pliku <code>kursy.txt</code> lub w <code>script.js</code></div>
    `;
    return;
  }

  const ostatni = dane[dane.length - 1];

  let html = `
    <h1>Giełda mojej waluty</h1>
    <p class="subtitle">Aktualny kurs: <strong style="color:#facc15">${formatKurs(ostatni.kurs)}</strong>
    <br><span style="font-size:0.85rem;color:#71717a">${ostatni.dataCzas}</span></p>
    <div class="card">
      <div class="header-row">
        <div>Data i godzina</div>
        <div>Kurs</div>
        <div style="text-align:right">Zmiana</div>
      </div>
  `;

  dane.forEach((wpis, i) => {
    const poprzedni = i > 0 ? dane[i - 1].kurs : undefined;
    const zmiana = formatZmiana(wpis.kurs, poprzedni);

    html += `
      <div class="row">
        <div class="date">${wpis.dataCzas}</div>
        <div class="value">${formatKurs(wpis.kurs)}</div>
        <div class="change ${zmiana.klasa}">
          <span class="badge">${zmiana.tekst}</span>
        </div>
      </div>
    `;
  });

  html += `</div>
    <p class="hint">
      Format w <code>kursy.txt</code>:<br>
      <code>2026-08-21 00:12 1.32</code><br>
      (data + godzina:minuta + kurs)
    </p>
  `;

  app.innerHTML = html;
}

// Start
wczytajDane()
  .then(tekst => {
    const dane = parsuj(tekst);
    renderuj(dane);
  })
  .catch(err => {
    document.getElementById('app').innerHTML = `
      <div class="error">Błąd wczytywania danych: ${err.message}</div>
    `;
  });
