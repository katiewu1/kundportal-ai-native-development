// ÄGARE: Del 1 (Backend – registrera och validera)   AK1
//
// Enhetstester för generateCaseNumber. Ärenden läggs in direkt med SQL,
// så att testerna bara prövar numreringen och inte resten av kedjan.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase } from '../src/db.js';
import { generateCaseNumber } from '../src/caseNumber.js';

let db;
beforeEach(() => {
  db = openDatabase();
});
afterEach(() => {
  db.close();
});

/** Lägger in ärenden med de givna ärendenumren. */
function finnsRedan(...arendenummer) {
  const insert = db.prepare(`
    INSERT INTO arenden (arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline)
    VALUES (?, 'Rubrik', 'Beskrivning', 'Övrigt', 1, 'Nytt', '2026-11-02T09:00:00.000Z', '2026-11-30')
  `);
  for (const nummer of arendenummer) insert.run(nummer);
}

describe('generateCaseNumber', () => {
  it('första ärendet blir <årtal>-1', () => {
    expect(generateCaseNumber(db, '2026')).toBe('2026-1');
  });

  it('nästa nummer är ett mer än det högsta', () => {
    finnsRedan('2026-1', '2026-2');

    expect(generateCaseNumber(db, '2026')).toBe('2026-3');
  });

  it('löpnumret jämförs som tal: efter 2026-9 och 2026-10 kommer 2026-11 (som text är "2026-9" störst)', () => {
    finnsRedan('2026-9', '2026-10');

    expect(generateCaseNumber(db, '2026')).toBe('2026-11');
  });

  it('numret bygger på det högsta, inte på antalet: efter 2026-1 och 2026-5 kommer 2026-6', () => {
    finnsRedan('2026-1', '2026-5');

    expect(generateCaseNumber(db, '2026')).toBe('2026-6');
  });

  it('årsskifte: löpnumret börjar om, så första numret 2027 blir 2027-1', () => {
    finnsRedan('2026-57');

    expect(generateCaseNumber(db, '2027')).toBe('2027-1');
  });

  it('bara årets nummer räknas: efter 2026-57 och 2027-1 kommer 2027-2', () => {
    finnsRedan('2026-57', '2027-1');

    expect(generateCaseNumber(db, '2027')).toBe('2027-2');
  });
});
