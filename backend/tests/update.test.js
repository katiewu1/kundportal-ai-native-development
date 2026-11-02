// ÄGARE: Del 2 (Backend – läsa och ändra)   AK12–AK16
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIXED_NOW, TODAY, TOMORROW, YESTERDAY, startTestServer, validCase } from './helpers/testServer.js';

const URL_ARENDE = '/api/arenden/2026-1';
const URL_STATUS = `${URL_ARENDE}/status`;

let dir;
let dbPath;
let server;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'portal-update-'));
  dbPath = join(dir, 'portal.db');
});

afterEach(async () => {
  await server?.close();
  server = undefined;
  rmSync(dir, { recursive: true, force: true });
});

/** Startar en server med ett registrerat ärende (2026-1) och returnerar ärendet. */
async function startWithCase(overrides = {}) {
  server = await startTestServer({ dbPath });
  const { body } = await server.api('POST', '/api/arenden', validCase(overrides));
  return body;
}

async function restart(options = {}) {
  await server.close();
  server = await startTestServer({ dbPath, ...options });
}

async function saved() {
  return (await server.api('GET', URL_ARENDE)).body;
}

describe('AK12: ändra status (happy path)', () => {
  it('Nytt → Pågående syns direkt och finns kvar efter omstart', async () => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_STATUS, { status: 'Pågående' });

    expect(status).toBe(200);
    expect(body).toEqual({ ...fore, status: 'Pågående' });
    await restart();
    expect(await saved()).toEqual({ ...fore, status: 'Pågående' });
  });

  it('okänt ärendenummer ger 404 även om statusen är ogiltig', async () => {
    server = await startTestServer();

    const { status } = await server.api('PATCH', '/api/arenden/2026-99/status', { status: 'Klar' });

    expect(status).toBe(404);
  });

  it('man kan byta fritt, även från Avslutat tillbaka till Pågående', async () => {
    await startWithCase({ status: 'Avslutat' });

    const { status, body } = await server.api('PATCH', URL_STATUS, { status: 'Pågående' });

    expect(status).toBe(200);
    expect(body.status).toBe('Pågående');
  });

  it('okänt ärendenummer ger 404', async () => {
    server = await startTestServer();

    const { status, body } = await server.api('PATCH', '/api/arenden/2026-99/status', { status: 'Pågående' });

    expect(status).toBe(404);
    expect(body).toEqual({ fel: 'Ärendet hittades inte.' });
  });
});

describe('AK13: ogiltig status avvisas (error path)', () => {
  it('400 med begripligt felmeddelande och statusen är fortfarande Nytt', async () => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_STATUS, { status: 'Klar' });

    expect(status).toBe(400);
    expect(body.faltfel.status).toBe('Status måste vara en av: Nytt, Pågående, Väntar på kund, Avslutat');
    expect(await saved()).toEqual(fore);
  });

  it.each([
    ['tom kropp', {}],
    ['kroppen är null', null],
    ['kroppen är en lista', ['Pågående']],
  ])('%s avvisas', async (_namn, kropp) => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_STATUS, kropp);

    expect(status).toBe(400);
    expect(body.faltfel.status).toBe('Status måste fyllas i');
    expect(await saved()).toEqual(fore);
  });
});

describe('AK14: ändra ett fält (happy path)', () => {
  it('kategori och prioritet ändras, övriga fält är oförändrade, ändringen finns kvar efter omstart', async () => {
    const fore = await startWithCase({ kategori: 'Övrigt', prioritet: 2 });
    const andring = { kategori: 'Ersättning och stöd', prioritet: 4 };

    const { status, body } = await server.api('PATCH', URL_ARENDE, andring);

    expect(status).toBe(200);
    expect(body).toEqual({ ...fore, ...andring });
    await restart();
    expect(await saved()).toEqual({ ...fore, ...andring });
  });

  it('rubrik och beskrivning sparas utan blanktecken före och efter', async () => {
    await startWithCase();

    const { body } = await server.api('PATCH', URL_ARENDE, { rubrik: '  Ny rubrik  ', beskrivning: ' Ny text ' });

    expect(body.rubrik).toBe('Ny rubrik');
    expect(body.beskrivning).toBe('Ny text');
  });

  it('NUL-tecken i rubriken avvisas, texten kortas inte av i tysthet', async () => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_ARENDE, { rubrik: 'a\u0000b' });

    expect(status).toBe(400);
    expect(body.faltfel.rubrik).toBe('Rubrik innehåller ogiltiga tecken');
    expect(await saved()).toEqual(fore);
  });

  it('tom ändring lämnar ärendet oförändrat', async () => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_ARENDE, {});

    expect(status).toBe(200);
    expect(body).toEqual(fore);
  });

  it('okänt ärendenummer ger 404', async () => {
    server = await startTestServer();

    const { status, body } = await server.api('PATCH', '/api/arenden/2026-99', { prioritet: 4 });

    expect(status).toBe(404);
    expect(body).toEqual({ fel: 'Ärendet hittades inte.' });
  });
});

describe('AK15: ogiltig ändring avvisas (error path)', () => {
  it.each([
    ['tom rubrik', { rubrik: '' }, 'rubrik', 'Rubrik måste fyllas i'],
    ['rubrik med enbart mellanslag', { rubrik: '   ' }, 'rubrik', 'Rubrik måste fyllas i'],
    ['rubrik på 101 tecken', { rubrik: 'a'.repeat(101) }, 'rubrik', 'Rubrik får vara högst 100 tecken'],
    ['tom beskrivning', { beskrivning: '' }, 'beskrivning', 'Beskrivning måste fyllas i'],
    ['prioritet 6', { prioritet: 6 }, 'prioritet', 'Prioritet måste vara ett heltal från 1 till 5'],
    ['prioritet null', { prioritet: null }, 'prioritet', 'Prioritet måste fyllas i'],
    ['kategori som inte finns', { kategori: 'Påhittad' }, 'kategori', 'Kategori måste vara en av kategorierna i listan'],
  ])('%s avvisas, sparade uppgifter oförändrade', async (_namn, andring, falt, meddelande) => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_ARENDE, andring);

    expect(status).toBe(400);
    expect(body.faltfel[falt]).toBe(meddelande);
    expect(await saved()).toEqual(fore);
  });

  it('ett giltigt fält sparas inte när ett annat fält i samma ändring är ogiltigt', async () => {
    const fore = await startWithCase();

    const { status } = await server.api('PATCH', URL_ARENDE, { kategori: 'Övrigt', prioritet: 6 });

    expect(status).toBe(400);
    expect(await saved()).toEqual(fore);
  });

  it.each([
    ['null', null],
    ['en lista', [1]],
    ['ett tal', 5],
    ['en sträng', 'x'],
  ])('kroppen är %s: 400, sparade uppgifter oförändrade', async (_namn, kropp) => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_ARENDE, kropp);

    expect(status).toBe(400);
    expect(body.fel).toBe('Ändringen måste skickas som ett JSON-objekt.');
    expect(await saved()).toEqual(fore);
  });

  it('okänt ärendenummer ger 404 även om värdena är ogiltiga', async () => {
    server = await startTestServer();

    const { status } = await server.api('PATCH', '/api/arenden/2026-99', { prioritet: 6 });

    expect(status).toBe(404);
  });

  it('alla fel i samma ändring skickas tillsammans', async () => {
    await startWithCase();

    const { body } = await server.api('PATCH', URL_ARENDE, { rubrik: '', prioritet: 6 });

    expect(Object.keys(body.faltfel).sort()).toEqual(['prioritet', 'rubrik']);
  });
});

describe('AK16: fält som inte kan ändras (error path)', () => {
  it('försök att ändra arendenummer eller skapad ignoreras, värdena är oförändrade', async () => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_ARENDE, {
      arendenummer: '2020-7',
      skapad: '2020-01-01T00:00:00.000Z',
      prioritet: 5,
    });

    expect(status).toBe(200);
    expect(body).toEqual({ ...fore, prioritet: 5 });
    expect((await server.api('GET', '/api/arenden/2020-7')).status).toBe(404);
  });

  it('status ändras bara via /status och ignoreras här', async () => {
    const fore = await startWithCase();

    const { body } = await server.api('PATCH', URL_ARENDE, { status: 'Avslutat' });

    expect(body).toEqual(fore);
  });
});

// Öppen fråga 2 i specen. Beslutet står i docs/API.md.
describe('deadline vid ändring', () => {
  it('ny deadline får ligga idag eller framåt', async () => {
    await startWithCase();

    const { status, body } = await server.api('PATCH', URL_ARENDE, { deadline: TODAY });

    expect(status).toBe(200);
    expect(body.deadline).toBe(TODAY);
  });

  it('ny deadline före dagens datum avvisas', async () => {
    const fore = await startWithCase();

    const { status, body } = await server.api('PATCH', URL_ARENDE, { deadline: YESTERDAY });

    expect(status).toBe(400);
    expect(body.faltfel.deadline).toBe('Deadline kan inte ligga före dagens datum');
    expect(await saved()).toEqual(fore);
  });

  it('dagens datum räknas i svensk tid från den inskickade klockan', async () => {
    await startWithCase({ deadline: TOMORROW });
    // 23:30 UTC är redan nästa dag i Sverige. Året visar att now() används, inte datorns klocka.
    await restart({ now: () => new Date('2030-06-15T23:30:00Z') });

    const { status, body } = await server.api('PATCH', URL_ARENDE, { deadline: '2030-06-15' });

    expect(status).toBe(400);
    expect(body.faltfel.deadline).toBe('Deadline kan inte ligga före dagens datum');
  });

  it('ett ärende med passerad deadline kan ändras i andra fält', async () => {
    const fore = await startWithCase({ deadline: TOMORROW });
    const enVeckaSenare = new Date(FIXED_NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
    await restart({ now: () => enVeckaSenare });

    const { status, body } = await server.api('PATCH', URL_ARENDE, { prioritet: 5 });

    expect(status).toBe(200);
    expect(body).toEqual({ ...fore, prioritet: 5 });
  });

  it('samma passerade deadline kan skickas med när hela formuläret sparas', async () => {
    const fore = await startWithCase({ deadline: TOMORROW });
    const enVeckaSenare = new Date(FIXED_NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
    await restart({ now: () => enVeckaSenare });

    const { status, body } = await server.api('PATCH', URL_ARENDE, { deadline: TOMORROW, prioritet: 5 });

    expect(status).toBe(200);
    expect(body).toEqual({ ...fore, prioritet: 5 });
  });
});
