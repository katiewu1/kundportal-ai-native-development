// ÄGARE: Del 4 (Frontend – lista, detalj, status och redigering)   AK10–AK16, gränssnittssidan
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const CASE_A = {
  arendenummer: '2026-1',
  rubrik: 'Kan inte logga in',
  beskrivning: 'Kunden får felmeddelande vid inloggning.',
  kategori: 'Digital tjänst och inloggning',
  prioritet: 3,
  status: 'Nytt',
  skapad: '2026-11-02T09:00:00.000Z',
  deadline: '2026-11-30',
};

const CASE_B = {
  arendenummer: '2026-2',
  rubrik: 'Saknar aktivitetsrapport',
  beskrivning: 'Kunden undrar hur rapporten skickas in.',
  kategori: 'Aktivitetsrapport',
  prioritet: 2,
  status: 'Pågående',
  skapad: '2026-11-03T10:00:00.000Z',
  deadline: '2026-12-01',
};

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

async function flushView() {
  // onShowListView / onShowDetailView är async (api/fetch) – vänta tills vyn hunnit ritas.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadPage(fetchStub) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(window) {
      window.fetch = fetchStub;
    },
  });
  await new Promise((resolve) => dom.window.addEventListener('load', resolve));
  await flushView();
  return dom.window;
}

function requestPath(url) {
  return new URL(String(url), 'http://localhost').pathname;
}

function listText(document) {
  return document.getElementById('view-list').textContent;
}

function formatCreatedAt(value) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function caseRow(document, arendenummer) {
  return [...document.querySelectorAll('#case-list tbody tr')].find((tr) =>
    tr.textContent.includes(arendenummer),
  );
}

function pressKey(window, element, key) {
  element.dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function detailFetch(url) {
  const path = requestPath(url);
  if (path === '/api/arenden') return jsonResponse(200, [CASE_A, CASE_B]);
  if (path === `/api/arenden/${CASE_B.arendenummer}`) return jsonResponse(200, CASE_B);
  if (path === `/api/arenden/${CASE_A.arendenummer}`) return jsonResponse(200, CASE_A);
  return jsonResponse(404, { fel: 'Sökvägen finns inte.' });
}

describe('Ärendelistan och detaljvyn', () => {
  it('AK10: alla ärenden från servern visas i listan', async () => {
    const { document } = await loadPage(async (url) => {
      if (String(url).includes('/api/arenden')) return jsonResponse(200, [CASE_A, CASE_B]);
      return jsonResponse(404, { fel: 'Sökvägen finns inte.' });
    });

    const text = listText(document);
    expect(text).toContain(CASE_A.arendenummer);
    expect(text).toContain(CASE_B.arendenummer);
    expect(text).toContain(CASE_A.rubrik);
    expect(text).toContain(CASE_B.rubrik);
    expect(text).toContain(String(CASE_A.prioritet));
    expect(text).toContain(CASE_A.status);
    expect(text).toContain(CASE_A.deadline);
    expect(text).toContain('Ärendenummer');
    expect(text).toContain('Rubrik');
    expect(text).toContain('Prioritet');
    expect(text).toContain('Status');
    expect(text).toContain('Deadline');
  });

  it('AK10: tom lista visar ett begripligt meddelande', async () => {
    const { document } = await loadPage(async () => jsonResponse(200, []));
    expect(listText(document)).toContain('Inga ärenden ännu.');
  });

  it('AK10: fel från servern visas och listan kraschar inte', async () => {
    const { document } = await loadPage(async () => {
      throw new Error('nätverk');
    });
    const msg = document.getElementById('global-message');
    expect(msg.hidden).toBe(false);
    expect(msg.textContent).toContain('Kunde inte nå servern');
    expect(document.getElementById('view-list')).toBeTruthy();
  });

  it('AK11: klick på ett ärende visar alla åtta fält', async () => {
    const { document } = await loadPage(async (url) => {
      const path = requestPath(url);
      if (path === '/api/arenden') return jsonResponse(200, [CASE_A, CASE_B]);
      if (path === `/api/arenden/${CASE_B.arendenummer}`) return jsonResponse(200, CASE_B);
      return jsonResponse(404, { fel: 'Sökvägen finns inte.' });
    });

    expect(document.getElementById('view-list').hidden).toBe(false);
    expect(listText(document)).toContain(CASE_A.arendenummer);
    expect(listText(document)).toContain(CASE_B.arendenummer);

    const row = [...document.querySelectorAll('#case-list tbody tr')].find((tr) =>
      tr.textContent.includes(CASE_B.arendenummer),
    );
    expect(row, 'raden för valt ärende').toBeTruthy();
    (row.querySelector('button, a') ?? row).click();
    await flushView();

    const detail = document.getElementById('view-detail');
    expect(detail.hidden, 'detaljvyn ska visas').toBe(false);
    const text = detail.textContent;
    expect(text).toContain(CASE_B.arendenummer);
    expect(text).toContain(CASE_B.rubrik);
    expect(text).toContain(CASE_B.beskrivning);
    expect(text).toContain(CASE_B.kategori);
    expect(text).toContain(CASE_B.status);
    expect(text).toContain(formatCreatedAt(CASE_B.skapad));
    expect(text).not.toContain(CASE_B.skapad);
    expect(text).toContain(CASE_B.deadline);
    expect(text).not.toContain(CASE_A.rubrik);
    expect(text).not.toContain(CASE_A.beskrivning);

    const utanOvrigaFalt = [
      CASE_B.arendenummer,
      CASE_B.rubrik,
      CASE_B.beskrivning,
      CASE_B.kategori,
      CASE_B.status,
      formatCreatedAt(CASE_B.skapad),
      CASE_B.deadline,
    ].reduce((acc, value) => acc.replaceAll(String(value), ''), text);
    expect(utanOvrigaFalt).toContain(String(CASE_B.prioritet));
  });

  it('Enter och mellanslag på en rad öppnar detaljvyn', async () => {
    const window = await loadPage(detailFetch);
    const { document } = window;

    const rowB = caseRow(document, CASE_B.arendenummer);
    rowB.focus();
    pressKey(window, rowB, 'Enter');
    await flushView();
    expect(document.getElementById('view-detail').hidden).toBe(false);
    expect(document.getElementById('view-detail').textContent).toContain(CASE_B.rubrik);

    pressKey(window, document, 'Escape');
    const rowA = caseRow(document, CASE_A.arendenummer);
    rowA.focus();
    pressKey(window, rowA, ' ');
    await flushView();
    const detail = document.getElementById('view-detail');
    expect(detail.hidden).toBe(false);
    expect(detail.textContent).toContain(CASE_A.rubrik);
    expect(detail.textContent).not.toContain(CASE_B.rubrik);
  });

  it('Escape stänger detaljvyn och fokus återgår till raden', async () => {
    const window = await loadPage(detailFetch);
    const { document } = window;
    const row = caseRow(document, CASE_B.arendenummer);
    row.focus();
    pressKey(window, row, 'Enter');
    await flushView();

    expect(document.activeElement).toBe(document.querySelector('#view-detail .detail-close'));
    pressKey(window, document, 'Escape');
    expect(document.getElementById('view-detail').hidden).toBe(true);
    expect(document.activeElement).toBe(row);
  });

  it('klick på stäng eller utanför lägger fokus på raden', async () => {
    const { document } = await loadPage(detailFetch);
    const row = caseRow(document, CASE_B.arendenummer);
    row.click();
    await flushView();

    document.querySelector('#view-detail .detail-close').click();
    await flushView();
    expect(document.getElementById('view-detail').hidden).toBe(true);
    expect(document.activeElement).toBe(row);

    row.click();
    await flushView();
    document.getElementById('view-detail').click();
    await flushView();
    expect(document.getElementById('view-detail').hidden).toBe(true);
    expect(document.activeElement).toBe(row);
  });
  it.todo('AK12: statusbyte skickas till servern och ny status visas');
  it.todo('AK13: serverns felmeddelande vid ogiltig status visas och gamla statusen visas kvar');
  it.todo('AK14: sparad ändring av kategori/prioritet visas i detaljvyn');
  it.todo('AK15: serverns fältfel visas vid rätt fält vid ogiltig ändring');
});
