// ÄGARE: Del 1 (Backend – registrera och validera)
//
// Ett valideringsfall per fält. Kontrakt för varje funktion:
//   - tar emot ett råvärde (kan vara undefined, fel typ, tom sträng …)
//   - returnerar `null` om värdet är giltigt
//   - returnerar annars ett felmeddelande på svenska som kan visas för handläggaren
//
// Exempel (ur AK2): validateRubrik('')  →  'Rubrik måste fyllas i'
//
// Del 2 återanvänder dessa vid ändring av ärenden (AK13, AK15) – gör dem klara tidigt!
//
// OBS för anropare: rubrik och beskrivning längdkontrolleras UTAN blanktecken före och efter.
// Spara därför `value.trim()`, annars kan en text med tusentals avslutande mellanslag sparas.
import { KATEGORIER, STATUSAR, RUBRIK_MAX, BESKRIVNING_MAX, PRIORITET_MIN, PRIORITET_MAX } from '../constants.js';

/** Saknat värde: undefined, null, eller en sträng med enbart blanktecken (AK2, AK5). */
function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

/**
 * BESLUT (Del 1): vad räknas som ett "tecken" i längdgränserna (AK3, AK4)?
 *
 * Får texten utan blanktecken före och efter. Returnerar antalet tecken som jämförs
 * med RUBRIK_MAX och BESKRIVNING_MAX.
 *
 * Alternativ:
 *   - text.length                        UTF-16-enheter. '😀' = 2. Samma som HTML-attributet maxlength.
 *   - [...text].length                   Unicode-kodpunkter. '😀' = 1, men '👨‍👩‍👧' = 5.
 *   - Intl.Segmenter (granularity: 'grapheme')  Det användaren ser. '👨‍👩‍👧' = 1.
 *
 * Beslut: text.length (se docs/API.md och docs/del1-ai-logg.md).
 */
export function countChars(text) {
  return text.length;
}

function validateText(value, falt, max) {
  if (isBlank(value)) return `${falt} måste fyllas i`;
  if (typeof value !== 'string') return `${falt} måste vara text`;
  if (countChars(value.trim()) > max) return `${falt} får vara högst ${max} tecken`;
  return null;
}

function validateChoice(value, falt, allowed, invalidMessage) {
  if (isBlank(value)) return `${falt} måste fyllas i`;
  if (!allowed.includes(value)) return invalidMessage;
  return null;
}

/** AK2, AK3, AK5 – 1–100 tecken, enbart mellanslag räknas som tomt. */
export function validateRubrik(value) {
  return validateText(value, 'Rubrik', RUBRIK_MAX);
}

/** AK2, AK4, AK5 – 1–5000 tecken, enbart mellanslag räknas som tomt. */
export function validateBeskrivning(value) {
  return validateText(value, 'Beskrivning', BESKRIVNING_MAX);
}

/** AK2, AK15 – en av KATEGORIER. */
export function validateKategori(value) {
  return validateChoice(value, 'Kategori', KATEGORIER, 'Kategori måste vara en av kategorierna i listan');
}

/**
 * AK2, AK15 – heltal 1–5.
 * Bara JSON-tal godtas, inte strängen "3": API.md skickar prioritet som tal.
 */
export function validatePrioritet(value) {
  if (isBlank(value)) return 'Prioritet måste fyllas i';
  if (!Number.isInteger(value) || value < PRIORITET_MIN || value > PRIORITET_MAX) {
    return `Prioritet måste vara ett heltal från ${PRIORITET_MIN} till ${PRIORITET_MAX}`;
  }
  return null;
}

/** AK2, AK13 – en av STATUSAR. */
export function validateStatus(value) {
  return validateChoice(value, 'Status', STATUSAR, `Status måste vara en av: ${STATUSAR.join(', ')}`);
}

/** Sant om `value` är exakt YYYY-MM-DD och ett datum som finns i kalendern (inte 2026-02-30). */
function isCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  // setUTCFullYear i stället för Date.UTC: Date.UTC tolkar år 0–99 som 1900–1999.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/**
 * AK2, AK6, AK7, AK8 – obligatoriskt datum (YYYY-MM-DD) som inte har passerat.
 * `today` är dagens datum som sträng (YYYY-MM-DD), beräknat av anroparen från `now()`.
 */
export function validateDeadline(value, today) {
  // Saknat `today` är ett programmeringsfel (blir 500), inte ett fel hos handläggaren.
  if (typeof today !== 'string' || !isCalendarDate(today)) {
    throw new Error('validateDeadline: today måste vara ett datum (YYYY-MM-DD)');
  }
  if (isBlank(value)) return 'Deadline måste fyllas i';
  if (typeof value !== 'string' || !isCalendarDate(value)) {
    return 'Deadline måste vara ett giltigt datum (ÅÅÅÅ-MM-DD)';
  }
  // Två YYYY-MM-DD-strängar sorteras som datum, så strängjämförelse räcker.
  if (value < today) return 'Deadline kan inte ligga före dagens datum';
  return null;
}
