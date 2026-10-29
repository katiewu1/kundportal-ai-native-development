// Delad testhjälp (skelettet – ändras bara via gemensam PR).
// Startar riktiga servern på en slumpad port med fast klocka, så att tester
// kan köra mot hela kedjan HTTP → handler → databas.
import http from 'node:http';
import { createApp } from '../../src/app.js';
import { openDatabase } from '../../src/db.js';

// Fast "nu": 2 november 2026 kl 10:00 svensk tid (09:00 UTC). Används för deadline-tester (AK7, AK8).
// Anges i UTC, så att TODAY stämmer oavsett vilken tidszon datorn som kör testerna står på.
export const FIXED_NOW = new Date('2026-11-02T09:00:00Z');
export const TODAY = '2026-11-02';
export const YESTERDAY = '2026-11-01';
export const TOMORROW = '2026-11-03';

/**
 * @param {{ dbPath?: string, now?: () => Date }} [options]
 *   dbPath – en filväg gör att databasen överlever stop/start (AK9). Standard: tillfällig minnesdatabas.
 */
export async function startTestServer({ dbPath = ':memory:', now = () => FIXED_NOW } = {}) {
  const db = openDatabase(dbPath);
  const server = http.createServer(createApp({ db, now }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  async function api(method, path, body) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* inte JSON (t.ex. HTML) */ }
    return { status: res.status, body: json, text };
  }

  async function close() {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }

  return { baseUrl, db, api, close };
}

/** Ett giltigt ärende att utgå från. Skriv över enstaka fält: validCase({ rubrik: '' }). */
export function validCase(overrides = {}) {
  return {
    rubrik: 'Kan inte logga in',
    beskrivning: 'Kunden får felmeddelande vid inloggning.',
    kategori: 'Digital tjänst och inloggning',
    prioritet: 3,
    status: 'Nytt',
    deadline: TOMORROW,
    ...overrides,
  };
}
