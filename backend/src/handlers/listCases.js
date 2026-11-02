// ÄGARE: Del 2 (Backend – läsa och ändra)   GET /api/arenden
import { findAllCases } from '../repository/findAllCases.js';

/** AK10 – return { status: 200, body: [ …ärenden ] } */
export function listCases({ db }) {
  return { status: 200, body: findAllCases(db) };
}
