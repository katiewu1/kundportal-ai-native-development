// ÄGARE: Del 1 (Backend – registrera och validera)   AK7, AK8
//
// "Dagens datum" ska vara datumet för handläggaren i Sverige (docs/ARBETSFORDELNING.md, Del 1, risker).
// Testerna byter datorns tidszon (TZ), så att de också fångar en lösning som bara fungerar
// på en dator som står på svensk tid.
//
// Modulen laddas om efter varje tidszonbyte. Annars skulle en formaterare som skapas när modulen
// laddas (t.ex. `const f = new Intl.DateTimeFormat('sv-SE')` överst i filen) behålla datorns
// tidszon och klara testet på en svensk dator.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const DATORNS_TIDSZONER = ['UTC', 'Europe/Stockholm', 'America/New_York', 'Asia/Tokyo'];

const FALL = [
  ['2026-11-02T10:00:00Z', '2026-11-02', 'mitt på dagen'],
  ['2026-11-02T22:59:59Z', '2026-11-02', '23:59:59 svensk vintertid'],
  ['2026-11-02T23:00:00Z', '2026-11-03', 'midnatt svensk vintertid, UTC+1'],
  ['2026-06-30T21:59:59Z', '2026-06-30', '23:59:59 svensk sommartid'],
  ['2026-06-30T22:00:00Z', '2026-07-01', 'midnatt svensk sommartid, UTC+2'],
  ['2026-12-31T23:30:00Z', '2027-01-01', 'nyårsnatten'],
];

describe.each(DATORNS_TIDSZONER)('dagensDatum när datorn står på %s', (tidszon) => {
  let dagensDatum;

  beforeEach(async () => {
    vi.stubEnv('TZ', tidszon);
    vi.resetModules();
    ({ dagensDatum } = await import('../src/handlers/createCase.js'));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('tidszonbytet slår igenom (annars bevisar testerna nedan ingenting)', () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(tidszon);
  });

  it.each(FALL)('%s ger %s (%s)', (iso, forvantat) => {
    expect(dagensDatum(new Date(iso))).toBe(forvantat);
  });
});
