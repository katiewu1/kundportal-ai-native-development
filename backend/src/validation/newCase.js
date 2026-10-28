// ÄGARE: Del 1 (Backend – registrera och validera)
import { ValidationError } from '../errors.js';
import * as fields from './fields.js';

/**
 * Validerar inmatningen för ett nytt ärende (AK1–AK8).
 *
 *   - kontrollerar ALLA obligatoriska fält och samlar alla fel, inte bara det första
 *   - finns det fel: kastar ValidationError({ rubrik: '…', deadline: '…' }) → 400
 *   - annars: returnerar ett nytt objekt med bara de fält som ska sparas. Okända fält,
 *     och fält som systemet sätter (arendenummer, skapad), följer inte med.
 *   - rubrik och beskrivning returneras utan blanktecken före och efter, eftersom
 *     längdgränsen räknas så (se fields.js).
 *
 * @param {unknown} input  JSON-kroppen från klienten (kan också vara null, en lista, ett tal …)
 * @param {string} today   dagens datum, YYYY-MM-DD
 */
export function validateNewCase(input, today) {
  // En kropp som inte är ett objekt behandlas som ett tomt formulär: alla fält saknas.
  const data = input !== null && typeof input === 'object' && !Array.isArray(input) ? input : {};

  const faltfel = {};
  const kontrollera = (falt, fel) => {
    if (fel) faltfel[falt] = fel;
  };
  kontrollera('rubrik', fields.validateRubrik(data.rubrik));
  kontrollera('beskrivning', fields.validateBeskrivning(data.beskrivning));
  kontrollera('kategori', fields.validateKategori(data.kategori));
  kontrollera('prioritet', fields.validatePrioritet(data.prioritet));
  kontrollera('status', fields.validateStatus(data.status));
  kontrollera('deadline', fields.validateDeadline(data.deadline, today));

  if (Object.keys(faltfel).length > 0) throw new ValidationError(faltfel);

  return {
    rubrik: data.rubrik.trim(),
    beskrivning: data.beskrivning.trim(),
    kategori: data.kategori,
    prioritet: data.prioritet,
    status: data.status,
    deadline: data.deadline,
  };
}
