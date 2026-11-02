// ÄGARE: Del 2 (Backend – läsa och ändra)   GET /api/arenden/:arendenummer
import { NotFoundError } from '../errors.js';
import { findCaseByNumber } from '../repository/findCaseByNumber.js';

/** AK11 – 200 med ärendet, eller kasta NotFoundError (→ 404) om det saknas. */
export function getCase({ db, params }) {
  const arende = findCaseByNumber(db, params.arendenummer);
  if (!arende) throw new NotFoundError();
  return { status: 200, body: arende };
}
