// ÄGARE: Del 1 (Backend – registrera och validera)   AK1–AK8
//
// Arbetssätt: gör en `it.todo` till ett riktigt test, kör det (rött), låt implementationen bli grön.
// Hjälpare: startTestServer(), validCase(), TODAY / YESTERDAY / TOMORROW – se tests/helpers/testServer.js
//
// "Inget sparas" kontrolleras direkt i databasen, eftersom GET /api/arenden byggs av Del 2.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openDatabase } from '../src/db.js';
import { startTestServer, validCase, FIXED_NOW, TODAY, YESTERDAY } from './helpers/testServer.js';

const ALLMANT_FEL = 'Ärendet kunde inte sparas. Rätta de markerade fälten.';

const OBLIGATORISKA = [
  ['rubrik', 'Rubrik måste fyllas i'],
  ['beskrivning', 'Beskrivning måste fyllas i'],
  ['kategori', 'Kategori måste fyllas i'],
  ['prioritet', 'Prioritet måste fyllas i'],
  ['status', 'Status måste fyllas i'],
  ['deadline', 'Deadline måste fyllas i'],
];

let server;
beforeEach(async () => {
  server = await startTestServer();
});
afterEach(async () => {
  await server.close();
});

const registrera = (arende) => server.api('POST', '/api/arenden', arende);
const antalSparade = () => server.db.prepare('SELECT COUNT(*) AS antal FROM arenden').get().antal;

/** validCase() utan ett av fälten, så att fältet saknas helt i JSON-kroppen. */
function utan(falt) {
  const arende = validCase();
  delete arende[falt];
  return arende;
}

/** Startar en egen server med en annan klocka, kör `test` och stänger servern. */
async function medKlocka(nu, test) {
  const annan = await startTestServer({ now: () => nu });
  try {
    await test(annan);
  } finally {
    await annan.close();
  }
}

describe('AK1: registrera ett giltigt ärende (happy path)', () => {
  it('201: ärendet sparas med unikt ärendenummer och skapad-tidpunkt', async () => {
    const res = await registrera(validCase());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ arendenummer: '2026-1', ...validCase(), skapad: FIXED_NOW.toISOString() });
    expect(antalSparade()).toBe(1);
  });

  it('nästa ärende får nästa löpnummer: 2026-1, 2026-2, 2026-3', async () => {
    const nummer = [];
    for (let i = 0; i < 3; i++) nummer.push((await registrera(validCase())).body.arendenummer);

    expect(nummer).toEqual(['2026-1', '2026-2', '2026-3']);
  });

  it('löpnumret räknas som tal, inte text: efter 2026-9 kommer 2026-10 och 2026-11', async () => {
    const nummer = [];
    for (let i = 0; i < 11; i++) nummer.push((await registrera(validCase())).body.arendenummer);

    expect(nummer.slice(-3)).toEqual(['2026-9', '2026-10', '2026-11']);
  });

  it('arendenummer, skapad och okända fält i begäran ignoreras – systemet sätter dem', async () => {
    const res = await registrera(
      validCase({ arendenummer: '1999-1', skapad: '1999-01-01T00:00:00.000Z', id: 42, okantFalt: 'x' }),
    );

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ arendenummer: '2026-1', ...validCase(), skapad: FIXED_NOW.toISOString() });
  });

  it('rubrik och beskrivning sparas utan blanktecken före och efter', async () => {
    const res = await registrera(validCase({ rubrik: '  Kan inte logga in  ', beskrivning: '\nKunden ringde.\n' }));
    const sparat = server.db.prepare('SELECT rubrik, beskrivning FROM arenden').get();

    expect(res.body.rubrik).toBe('Kan inte logga in');
    expect(sparat.rubrik).toBe('Kan inte logga in');
    expect(sparat.beskrivning).toBe('Kunden ringde.');
  });

  it('201 betyder att ärendet verkligen är sparat, även när en annan anslutning läser databasen', async () => {
    // T.ex. DB Browser eller en andra server mot samma fil. Läsaren håller en lästransaktion öppen
    // medan POST körs, så att sparandet inte kan slutföras just då.
    const katalog = mkdtempSync(join(tmpdir(), 'kundportal-'));
    const dbPath = join(katalog, 'portal.db');
    const filserver = await startTestServer({ dbPath });
    const lasare = openDatabase(dbPath);
    vi.spyOn(console, 'error').mockImplementation(() => {}); // app.js loggar 500-fel
    try {
      lasare.exec('BEGIN');
      lasare.prepare('SELECT COUNT(*) AS antal FROM arenden').get();
      const res = await filserver.api('POST', '/api/arenden', validCase());
      lasare.exec('COMMIT');
      const sparade = filserver.db.prepare('SELECT COUNT(*) AS antal FROM arenden').get().antal;

      expect([201, 500]).toContain(res.status);
      expect(sparade).toBe(res.status === 201 ? 1 : 0);
    } finally {
      vi.restoreAllMocks();
      lasare.close();
      await filserver.close();
      rmSync(katalog, { recursive: true, force: true });
    }
  });

  it.todo('ärendet finns i listan (GET /api/arenden) – kräver Del 2:s listCases');
});

describe('AK2: obligatoriskt fält saknas (error path)', () => {
  it.each(OBLIGATORISKA)('%s saknas: 400 med fältfelet "%s", inget sparas', async (falt, meddelande) => {
    const res = await registrera(utan(falt));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ fel: ALLMANT_FEL, faltfel: { [falt]: meddelande } });
    expect(antalSparade()).toBe(0);
  });

  it.each(OBLIGATORISKA)('%s är en tom sträng (tom dropdown): samma fältfel, inget sparas', async (falt, meddelande) => {
    const res = await registrera(validCase({ [falt]: '' }));

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual({ [falt]: meddelande });
    expect(antalSparade()).toBe(0);
  });

  it('400 med fältfel för varje obligatoriskt fält som saknas – alla fel skickas tillsammans', async () => {
    const res = await registrera({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ fel: ALLMANT_FEL, faltfel: Object.fromEntries(OBLIGATORISKA) });
  });

  it('inget ärende sparas och listan är oförändrad', async () => {
    await registrera(validCase());
    const res = await registrera(validCase({ rubrik: '' }));

    expect(res.status).toBe(400);
    expect(antalSparade()).toBe(1);
  });

  it('ett avvisat försök förbrukar inget ärendenummer', async () => {
    await registrera(validCase({ deadline: YESTERDAY }));
    const res = await registrera(validCase());

    expect(res.body.arendenummer).toBe('2026-1');
  });

  it.each([[null], [[]], ['text'], [42]])('en JSON-kropp som inte är ett objekt (%j) ger 400, inte 500', async (kropp) => {
    const res = await registrera(kropp);

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual(Object.fromEntries(OBLIGATORISKA));
  });
});

describe('AK3: rubrikens längdgräns (gränsfall)', () => {
  it('100 tecken godtas', async () => {
    const res = await registrera(validCase({ rubrik: 'a'.repeat(100) }));

    expect(res.status).toBe(201);
    expect(res.body.rubrik).toBe('a'.repeat(100));
  });

  it('101 tecken avvisas med meddelande om högst 100 tecken, inget sparas', async () => {
    const res = await registrera(validCase({ rubrik: 'a'.repeat(101) }));

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual({ rubrik: 'Rubrik får vara högst 100 tecken' });
    expect(antalSparade()).toBe(0);
  });
});

describe('AK4: beskrivningens längdgräns (gränsfall)', () => {
  it('5000 tecken godtas', async () => {
    const res = await registrera(validCase({ beskrivning: 'a'.repeat(5000) }));

    expect(res.status).toBe(201);
    expect(res.body.beskrivning).toBe('a'.repeat(5000));
  });

  it('5001 tecken avvisas med meddelande om högst 5000 tecken, inget sparas', async () => {
    const res = await registrera(validCase({ beskrivning: 'a'.repeat(5001) }));

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual({ beskrivning: 'Beskrivning får vara högst 5000 tecken' });
    expect(antalSparade()).toBe(0);
  });
});

describe('AK5: enbart mellanslag (gränsfall)', () => {
  it('rubrik med enbart mellanslag räknas som tom', async () => {
    const res = await registrera(validCase({ rubrik: '     ' }));

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual({ rubrik: 'Rubrik måste fyllas i' });
    expect(antalSparade()).toBe(0);
  });

  it('beskrivning med enbart mellanslag räknas som tom', async () => {
    const res = await registrera(validCase({ beskrivning: '   \n   ' }));

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual({ beskrivning: 'Beskrivning måste fyllas i' });
    expect(antalSparade()).toBe(0);
  });
});

describe('AK6: deadline saknas (error path)', () => {
  it('400 med "Deadline måste fyllas i", inget sparas', async () => {
    const res = await registrera(utan('deadline'));

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual({ deadline: 'Deadline måste fyllas i' });
    expect(antalSparade()).toBe(0);
  });
});

describe('AK7: deadline har passerat (error path)', () => {
  it('gårdagens datum avvisas med "Deadline kan inte ligga före dagens datum", inget sparas', async () => {
    const res = await registrera(validCase({ deadline: YESTERDAY }));

    expect(res.status).toBe(400);
    expect(res.body.faltfel).toEqual({ deadline: 'Deadline kan inte ligga före dagens datum' });
    expect(antalSparade()).toBe(0);
  });
});

describe('AK8: deadline är dagens datum (gränsfall)', () => {
  it('dagens datum godtas och ärendet sparas', async () => {
    const res = await registrera(validCase({ deadline: TODAY }));

    expect(res.status).toBe(201);
    expect(res.body.deadline).toBe(TODAY);
    expect(antalSparade()).toBe(1);
  });
});

describe('AK7, AK8: "dagens datum" är datumet i Sverige, även strax efter midnatt', () => {
  // 23:30 UTC den 2 november är 00:30 svensk tid den 3 november (vintertid, UTC+1).
  const STRAX_EFTER_MIDNATT_I_SVERIGE = new Date('2026-11-02T23:30:00Z');

  it('den 2 november har passerat i Sverige, fast det fortfarande är den 2:a i UTC', async () => {
    await medKlocka(STRAX_EFTER_MIDNATT_I_SVERIGE, async (annan) => {
      const res = await annan.api('POST', '/api/arenden', validCase({ deadline: '2026-11-02' }));

      expect(res.status).toBe(400);
      expect(res.body.faltfel).toEqual({ deadline: 'Deadline kan inte ligga före dagens datum' });
    });
  });

  it('den 3 november är dagens datum i Sverige och godtas', async () => {
    await medKlocka(STRAX_EFTER_MIDNATT_I_SVERIGE, async (annan) => {
      const res = await annan.api('POST', '/api/arenden', validCase({ deadline: '2026-11-03' }));

      expect(res.status).toBe(201);
    });
  });

  it('nyårsnatten 00:30 svensk tid: ärendet får årtalet 2027', async () => {
    await medKlocka(new Date('2026-12-31T23:30:00Z'), async (annan) => {
      const res = await annan.api('POST', '/api/arenden', validCase({ deadline: '2027-01-01' }));

      expect(res.status).toBe(201);
      expect(res.body.arendenummer).toBe('2027-1');
    });
  });
});
