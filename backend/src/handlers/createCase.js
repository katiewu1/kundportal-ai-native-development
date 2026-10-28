// ÄGARE: Del 1 (Backend – registrera och validera)   POST /api/arenden
import { validateNewCase } from '../validation/newCase.js';
import { generateCaseNumber } from '../caseNumber.js';
import { insertCase } from '../repository/insertCase.js';

/**
 * POST /api/arenden (AK1–AK8).
 *
 * Klockan läses en enda gång. Deadline-kontrollen, ärendenumrets årtal och `skapad` utgår då
 * från samma ögonblick, även om begäran kommer precis vid midnatt på nyårsnatten.
 * Inget sparas om valideringen misslyckas (AK2): validateNewCase kastar innan något skrivs.
 */
export function createCase({ db, now, body }) {
  const nu = now();
  const today = dagensDatum(nu);
  const input = validateNewCase(body, today); // kastar ValidationError → 400
  const arendenummer = generateCaseNumber(db, today.slice(0, 4));
  return { status: 201, body: insertCase(db, { arendenummer, ...input, skapad: nu.toISOString() }) };
}

/**
 * Dagens datum i Sverige som YYYY-MM-DD (AK7, AK8).
 *
 * Handläggarna sitter i Sverige, men servern kan stå på en annan tidszon (t.ex. UTC i molnet).
 * tests/dagensDatum.test.js kräver det svenska datumet, oavsett vilken tidszon datorn står på.
 *
 * Alternativ:
 *   - date.toISOString().slice(0, 10)          UTC-datum: fel mellan midnatt och 01:00 (02:00 sommartid) i Sverige.
 *   - getFullYear() / getMonth() / getDate()    Datorns tidszon: rätt på en svensk dator, fel på en server i UTC.
 *   - Intl.DateTimeFormat med timeZone: 'Europe/Stockholm'
 *                                               Alltid svensk tid, oberoende av datorn. Tidszonen står i koden.
 *
 * Beslut: Europe/Stockholm (se docs/del1-ai-logg.md).
 *
 * @param {Date} date  ett ögonblick, från now()
 */
export function dagensDatum(date) {
  const delar = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const del = (typ) => delar.find((d) => d.type === typ).value;
  return `${del('year')}-${del('month')}-${del('day')}`;
}
