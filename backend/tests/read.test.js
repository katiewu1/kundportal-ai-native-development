// ÄGARE: Del 2 (Backend – läsa och ändra)   AK9–AK11
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startTestServer, validCase } from './helpers/testServer.js';

let dir;
let server;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'portal-read-'));
});

afterEach(async () => {
  await server?.close();
  server = undefined;
  rmSync(dir, { recursive: true, force: true });
});

describe('AK9: ärenden finns kvar efter omstart (happy path)', () => {
  it('samma uppgifter, ärendenummer och skapad-tidpunkt efter att databasen öppnats på nytt', async () => {
    const dbPath = join(dir, 'portal.db');
    server = await startTestServer({ dbPath });
    const { body: sparat } = await server.api('POST', '/api/arenden', validCase());
    await server.close();

    // En ny server med en ny anslutning: bara det som finns i filen kan läsas.
    server = await startTestServer({ dbPath });
    const { status, body } = await server.api('GET', `/api/arenden/${sparat.arendenummer}`);

    expect(status).toBe(200);
    expect(body).toEqual(sparat);
  });
});

describe('AK10: lista över ärenden (happy path)', () => {
  it('alla registrerade ärenden finns i listan', async () => {
    server = await startTestServer();
    await server.api('POST', '/api/arenden', validCase({ rubrik: 'Första' }));
    await server.api('POST', '/api/arenden', validCase({ rubrik: 'Andra' }));
    await server.api('POST', '/api/arenden', validCase({ rubrik: 'Tredje' }));

    const { status, body } = await server.api('GET', '/api/arenden');

    expect(status).toBe(200);
    expect(body.map((a) => a.rubrik).sort()).toEqual(['Andra', 'Första', 'Tredje']);
  });

  it('senast registrerade ärendet kommer först', async () => {
    server = await startTestServer();
    await server.api('POST', '/api/arenden', validCase());
    await server.api('POST', '/api/arenden', validCase());

    const { body } = await server.api('GET', '/api/arenden');

    expect(body.map((a) => a.arendenummer)).toEqual(['2026-2', '2026-1']);
  });

  it('tom databas ger en tom lista', async () => {
    server = await startTestServer();

    const { status, body } = await server.api('GET', '/api/arenden');

    expect(status).toBe(200);
    expect(body).toEqual([]);
  });

  it('databasens interna id skickas inte ut', async () => {
    server = await startTestServer();
    await server.api('POST', '/api/arenden', validCase());

    const { body } = await server.api('GET', '/api/arenden');

    expect(body[0]).not.toHaveProperty('id');
  });
});

describe('AK11: detaljer för ett ärende (happy path)', () => {
  it('alla åtta fält returneras', async () => {
    server = await startTestServer();
    await server.api('POST', '/api/arenden', validCase());

    const { status, body } = await server.api('GET', '/api/arenden/2026-1');

    expect(status).toBe(200);
    expect(body).toEqual({
      arendenummer: '2026-1',
      skapad: '2026-11-02T09:00:00.000Z',
      ...validCase(),
    });
  });

  it('okänt ärendenummer ger 404 med begripligt meddelande', async () => {
    server = await startTestServer();

    const { status, body } = await server.api('GET', '/api/arenden/2026-99');

    expect(status).toBe(404);
    expect(body).toEqual({ fel: 'Ärendet hittades inte.' });
  });
});
