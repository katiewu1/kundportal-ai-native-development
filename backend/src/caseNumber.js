// ÄGARE: Del 1 (Backend – registrera och validera)

/**
 * Skapar nästa unika ärendenummer enligt specen: "<årtal>-<löpnummer>", t.ex. "2026-1", "2026-2".
 * Löpnumret börjar om från 1 varje nytt år: … 2026-57, 2027-1.
 *
 * `year` ("2026") tas från samma "dagens datum" som deadline-kontrollen (se createCase.js).
 * Då får ett ärende som registreras 00:30 på nyårsnatten årtalet för det nya året i svensk tid.
 *
 * Unikt nummer:
 *   - I en server: createCase anropar denna funktion och insertCase direkt efter varandra utan
 *     `await` emellan. DatabaseSync är synkron, så två begäranden kan inte läsa samma högsta nummer.
 *   - Flera servrar mot samma fil: kolumnen är UNIQUE i db.js. En krock ger ett fel (500), aldrig
 *     två ärenden med samma nummer.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {string} year  årtalet, t.ex. "2026"
 */
export function generateCaseNumber(db, year) {
  // Beslut (Del 1): löpnumret börjar om varje år, så bara årets nummer räknas.
  // Alternativet var att räkna vidare över alla år (… 2026-57, 2027-58), se docs/del1-ai-logg.md.
  return `${year}-${hogstaLopnummer(db, `${year}-%`) + 1}`;
}

/**
 * Högsta löpnumret bland ärendenummer som matchar LIKE-mönstret, eller 0 om det inte finns något.
 * MAX(arendenummer) duger inte: som text är "2026-9" större än "2026-10".
 */
function hogstaLopnummer(db, monster) {
  const { hogsta } = db
    .prepare(
      `SELECT MAX(CAST(substr(arendenummer, instr(arendenummer, '-') + 1) AS INTEGER)) AS hogsta
       FROM arenden WHERE arendenummer LIKE ?`,
    )
    .get(monster);
  return hogsta ?? 0;
}
