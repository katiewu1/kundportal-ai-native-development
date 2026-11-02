// ÄGARE: Del 2 (Backend – läsa och ändra)

const UPDATE_STATUS = `
  UPDATE arenden SET status = ?
  WHERE arendenummer = ?
  RETURNING arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline
`;

/** Sätter ny status på ett ärende och returnerar det uppdaterade ärendet (AK12). */
export function updateCaseStatus(db, arendenummer, status) {
  // .all() och inte .get(), av samma skäl som i insertCase.js: .get() kan dölja att sparandet misslyckades.
  const [sparat] = db.prepare(UPDATE_STATUS).all(status, arendenummer);
  return { ...sparat };
}
