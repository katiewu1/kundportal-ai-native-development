// ÄGARE: Del 1 (Backend – registrera och validera)   AK1, AK2, AK7
//
// Enhetstester för validateNewCase: alla fältfel samlas, och bara de fält som ska sparas returneras.
import { describe, it, expect } from 'vitest';
import { validateNewCase } from '../src/validation/newCase.js';
import { ValidationError } from '../src/errors.js';
import { validCase, TODAY, TOMORROW } from './helpers/testServer.js';

const ALLA_SAKNAS = {
  rubrik: 'Rubrik måste fyllas i',
  beskrivning: 'Beskrivning måste fyllas i',
  kategori: 'Kategori måste fyllas i',
  prioritet: 'Prioritet måste fyllas i',
  status: 'Status måste fyllas i',
  deadline: 'Deadline måste fyllas i',
};

/** Kör validateNewCase och returnerar fältfelen. Testet misslyckas om inget ValidationError kastas. */
function faltfelFor(input, today = TODAY) {
  try {
    validateNewCase(input, today);
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    return err.faltfel;
  }
  throw new Error('validateNewCase godtog inmatningen');
}

describe('validateNewCase', () => {
  it('AK1: ett giltigt ärende ger tillbaka exakt de sex fält som ska sparas', () => {
    expect(validateNewCase(validCase(), TODAY)).toEqual(validCase());
  });

  it('arendenummer, skapad, id och okända fält följer inte med', () => {
    const input = validCase({ arendenummer: '1999-1', skapad: '1999-01-01T00:00:00.000Z', id: 7, extra: true });

    expect(validateNewCase(input, TODAY)).toEqual(validCase());
  });

  it('rubrik och beskrivning returneras utan blanktecken före och efter', () => {
    const resultat = validateNewCase(validCase({ rubrik: '  Rubrik ', beskrivning: '\tText\n' }), TODAY);

    expect(resultat.rubrik).toBe('Rubrik');
    expect(resultat.beskrivning).toBe('Text');
  });

  it('ändrar inte objektet som skickas in', () => {
    const input = validCase({ rubrik: '  Rubrik  ' });
    validateNewCase(input, TODAY);

    expect(input.rubrik).toBe('  Rubrik  ');
  });

  it('AK2: alla fel samlas, inte bara det första', () => {
    expect(faltfelFor(validCase({ rubrik: '', prioritet: 6, deadline: '2026-11-01' }))).toEqual({
      rubrik: 'Rubrik måste fyllas i',
      prioritet: 'Prioritet måste vara ett heltal från 1 till 5',
      deadline: 'Deadline kan inte ligga före dagens datum',
    });
  });

  it('AK2: ett tomt objekt ger fältfel för alla sex fält', () => {
    expect(faltfelFor({})).toEqual(ALLA_SAKNAS);
  });

  it.each([[null], [undefined], [[]], ['text'], [42]])(
    'inmatning som inte är ett objekt (%j) ger fältfel, inte TypeError',
    (input) => {
      expect(faltfelFor(input)).toEqual(ALLA_SAKNAS);
    },
  );

  it('AK7: deadline jämförs med det `today` som skickas in', () => {
    expect(faltfelFor(validCase({ deadline: TODAY }), TOMORROW)).toEqual({
      deadline: 'Deadline kan inte ligga före dagens datum',
    });
  });
});
