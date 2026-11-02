// ÄGARE: Del 2 (Backend – läsa och ändra)

const FIND_ALL_CASES = `
  SELECT arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline
  FROM arenden
  ORDER BY id DESC
`;

/** Returnerar alla ärenden som en lista i API-formatet, senast registrerade först (AK10). */
export function findAllCases(db) {
  // node:sqlite ger objekt utan prototyp; gör om dem till vanliga objekt.
  return db.prepare(FIND_ALL_CASES).all().map((rad) => ({ ...rad }));
}
