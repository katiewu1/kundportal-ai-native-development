// ÄGARE: Del 2 (Backend – läsa och ändra)   PATCH /api/arenden/:arendenummer/status
import { NotFoundError, ValidationError } from '../errors.js';
import { findCaseByNumber } from '../repository/findCaseByNumber.js';
import { updateCaseStatus } from '../repository/updateCaseStatus.js';
import { validateStatus } from '../validation/fields.js';

/**
 * AK12, AK13 – body: { "status": "Pågående" }
 * Ogiltig status → kasta ValidationError({ status: '…' }) och låt den gamla statusen vara kvar.
 * Okänt ärendenummer → NotFoundError.
 */
export function updateStatus({ db, params, body }) {
  if (!findCaseByNumber(db, params.arendenummer)) throw new NotFoundError();
  const status = body?.status;
  const fel = validateStatus(status);
  if (fel) throw new ValidationError({ status: fel });
  return { status: 200, body: updateCaseStatus(db, params.arendenummer, status) };
}
