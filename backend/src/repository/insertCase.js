// ÄGARE: Del 1 (Backend – registrera och validera)

// RETURNING ger tillbaka det som faktiskt sparades, och bara API-fälten (inte `id`).
const INSERT_CASE = `
  INSERT INTO arenden (arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline)
  VALUES (:arendenummer, :rubrik, :beskrivning, :kategori, :prioritet, :status, :skapad, :deadline)
  RETURNING arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline
`;

/**
 * Sparar ett nytt ärende i tabellen `arenden` och returnerar det sparade ärendet
 * i API-formatet (se docs/API.md): { arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline }.
 * Kolumnen `id` ska inte läcka ut i API-svaret.
 *
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{arendenummer:string, rubrik:string, beskrivning:string, kategori:string, prioritet:number, status:string, skapad:string, deadline:string}} arende
 */
export function insertCase(db, arende) {
  // node:sqlite kastar fel på okända namngivna parametrar, så bara de åtta fälten skickas med.
  const { arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline } = arende;
  // .all() och inte .get(): .get() läser första raden och avslutar sedan satsen utan att rapportera fel.
  // Kan sparandet inte slutföras (t.ex. "database is locked") blev svaret ändå 201 fast inget sparades.
  const [sparat] = db
    .prepare(INSERT_CASE)
    .all({ arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline });
  // node:sqlite ger ett objekt utan prototyp; gör om det till ett vanligt objekt.
  return { ...sparat };
}
