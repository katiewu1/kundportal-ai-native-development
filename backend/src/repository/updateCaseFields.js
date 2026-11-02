// ÄGARE: Del 2 (Backend – läsa och ändra)

// COALESCE behåller det sparade värdet för fält som inte ändras. Inget av fälten får vara NULL,
// så NULL betyder alltid "ingen ändring". arendenummer och skapad finns inte med här (AK16).
const UPDATE_FIELDS = `
  UPDATE arenden SET
    rubrik      = COALESCE(:rubrik, rubrik),
    beskrivning = COALESCE(:beskrivning, beskrivning),
    kategori    = COALESCE(:kategori, kategori),
    prioritet   = COALESCE(:prioritet, prioritet),
    deadline    = COALESCE(:deadline, deadline)
  WHERE arendenummer = :arendenummer
  RETURNING arendenummer, rubrik, beskrivning, kategori, prioritet, status, skapad, deadline
`;

/**
 * Uppdaterar de angivna fälten på ett ärende och returnerar det uppdaterade ärendet (AK14).
 * Fält som inte anges ska vara oförändrade.
 * @param {object} changes  t.ex. { kategori: 'Ersättning och stöd', prioritet: 4 }
 */
export function updateCaseFields(db, arendenummer, changes) {
  const { rubrik, beskrivning, kategori, prioritet, deadline } = changes;
  // .all() och inte .get(), av samma skäl som i insertCase.js: .get() kan dölja att sparandet misslyckades.
  const [sparat] = db.prepare(UPDATE_FIELDS).all({
    arendenummer,
    rubrik: rubrik ?? null,
    beskrivning: beskrivning ?? null,
    kategori: kategori ?? null,
    prioritet: prioritet ?? null,
    deadline: deadline ?? null,
  });
  return { ...sparat };
}
