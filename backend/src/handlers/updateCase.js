// ÄGARE: Del 2 (Backend – läsa och ändra)   PATCH /api/arenden/:arendenummer
import { NotFoundError } from '../errors.js';
import { findCaseByNumber } from '../repository/findCaseByNumber.js';
import { updateCaseFields } from '../repository/updateCaseFields.js';
import { validateCaseChanges } from '../validation/caseChanges.js';
import { dagensDatum } from './createCase.js';

/**
 * AK14, AK15, AK16 – body innehåller de fält som ska ändras, t.ex. { "kategori": "Övrigt", "prioritet": 4 }.
 *
 * Besluten står i docs/API.md: arendenummer, skapad och status ignoreras här, och deadline får
 * ändras till idag eller framåt.
 *
 * Ogiltig ändring → ValidationError, och inget sparas (AK15).
 */
export function updateCase({ db, now, params, body }) {
  const sparat = findCaseByNumber(db, params.arendenummer);
  if (!sparat) throw new NotFoundError();
  const andringar = validateCaseChanges(body, sparat, dagensDatum(now()));
  return { status: 200, body: updateCaseFields(db, params.arendenummer, andringar) };
}
