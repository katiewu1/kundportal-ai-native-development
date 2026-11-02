// ÄGARE: Del 2 (Backend – läsa och ändra)
import { ValidationError } from '../errors.js';
import * as fields from './fields.js';

/**
 * Validerar en ändring av ett sparat ärende (AK14–AK16).
 *
 *   - en kropp som inte är ett objekt avvisas med 400
 *   - kontrollerar bara de fält som skickats med, och samlar alla fel
 *   - finns det fel: kastar ValidationError → 400, och inget sparas (AK15)
 *   - annars: returnerar ett nytt objekt med de fält som ska sparas. arendenummer, skapad,
 *     status (ändras via /status) och okända fält följer inte med (AK16).
 *   - en deadline som är samma som den sparade kontrolleras inte. Annars skulle ett ärende
 *     med passerad deadline inte kunna sparas (se docs/API.md).
 *
 * @param {unknown} input  JSON-kroppen från klienten (kan också vara null, en lista, ett tal …)
 * @param {{deadline: string}} sparat  ärendet som det ser ut i databasen
 * @param {string} today   dagens datum, YYYY-MM-DD
 */
export function validateCaseChanges(input, sparat, today) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError({}, 'Ändringen måste skickas som ett JSON-objekt.');
  }
  const data = input;
  const finns = (falt) => Object.hasOwn(data, falt);

  const faltfel = {};
  const kontrollera = (falt, fel) => {
    if (finns(falt) && fel) faltfel[falt] = fel;
  };
  kontrollera('rubrik', fields.validateRubrik(data.rubrik));
  kontrollera('beskrivning', fields.validateBeskrivning(data.beskrivning));
  kontrollera('kategori', fields.validateKategori(data.kategori));
  kontrollera('prioritet', fields.validatePrioritet(data.prioritet));
  if (data.deadline !== sparat.deadline) {
    kontrollera('deadline', fields.validateDeadline(data.deadline, today));
  }

  if (Object.keys(faltfel).length > 0) throw new ValidationError(faltfel);

  const andringar = {};
  if (finns('rubrik')) andringar.rubrik = data.rubrik.trim();
  if (finns('beskrivning')) andringar.beskrivning = data.beskrivning.trim();
  if (finns('kategori')) andringar.kategori = data.kategori;
  if (finns('prioritet')) andringar.prioritet = data.prioritet;
  if (finns('deadline')) andringar.deadline = data.deadline;
  return andringar;
}
