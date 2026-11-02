// ÄGARE: Del 2 (Backend – läsa och ändra)

const FIND_CASE = `
  SELECT arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline
  FROM arenden
  WHERE arendenummer = ?
`;

/** Returnerar ett ärende i API-formatet, eller `null` om ärendenumret inte finns (AK11). */
export function findCaseByNumber(db, arendenummer) {
  const rad = db.prepare(FIND_CASE).get(arendenummer);
  return rad ? { ...rad } : null;
}
