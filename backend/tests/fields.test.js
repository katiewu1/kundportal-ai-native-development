// ÄGARE: Del 1 (Backend – registrera och validera)   AK2–AK8, AK13, AK15
//
// Enhetstester för fältvalidatorerna i src/validation/fields.js.
// De körs utan server, så Del 2 kan lita på validatorerna innan POST /api/arenden är klar.
// Kontrakt: null om värdet är giltigt, annars ett svenskt meddelande.
// Meddelandena skrivs ut i klartext här (inte importerade), så att ett oavsiktligt
// ändrat meddelande syns som ett rött test.
import { describe, it, expect } from 'vitest';
import {
  countChars,
  validateRubrik,
  validateBeskrivning,
  validateKategori,
  validatePrioritet,
  validateStatus,
  validateDeadline,
} from '../src/validation/fields.js';
import { KATEGORIER, STATUSAR } from '../src/constants.js';
import { TODAY, YESTERDAY, TOMORROW } from './helpers/testServer.js';

const TOMMA_VARDEN = [undefined, null, ''];

describe('countChars (beslut: text.length, samma räkning som maxlength i HTML)', () => {
  it.each([
    ['a', 1],
    ['å', 1],
    ['😀', 2],
    ['👨‍👩‍👧', 8],
  ])('%s räknas som %i tecken', (text, antal) => {
    expect(countChars(text)).toBe(antal);
  });
});

describe('validateRubrik', () => {
  it('AK1: en vanlig rubrik godtas', () => {
    expect(validateRubrik('Kan inte logga in')).toBeNull();
  });

  it.each(TOMMA_VARDEN)('AK2: %o ger "Rubrik måste fyllas i"', (value) => {
    expect(validateRubrik(value)).toBe('Rubrik måste fyllas i');
  });

  it.each(['   ', '\t', ' \n '])('AK5: enbart blanktecken (%j) räknas som tomt', (value) => {
    expect(validateRubrik(value)).toBe('Rubrik måste fyllas i');
  });

  it('AK3: exakt 100 tecken godtas', () => {
    expect(validateRubrik('a'.repeat(100))).toBeNull();
  });

  it('AK3: 101 tecken avvisas med meddelande om högst 100 tecken', () => {
    expect(validateRubrik('a'.repeat(101))).toBe('Rubrik får vara högst 100 tecken');
  });

  it('AK3: blanktecken före och efter räknas inte in i längden', () => {
    expect(validateRubrik(`  ${'a'.repeat(100)}  `)).toBeNull();
  });

  it('AK3: en emoji som 😀 räknas som två tecken, så 50 emoji fyller rubriken', () => {
    expect(validateRubrik('😀'.repeat(50))).toBeNull();
    expect(validateRubrik(`${'😀'.repeat(50)}a`)).toBe('Rubrik får vara högst 100 tecken');
  });

  it.each([123, true, ['a'], { text: 'a' }])('annan typ än text (%o) avvisas', (value) => {
    expect(validateRubrik(value)).toBe('Rubrik måste vara text');
  });
});

describe('validateBeskrivning', () => {
  it('AK1: en vanlig beskrivning godtas', () => {
    expect(validateBeskrivning('Kunden får felmeddelande vid inloggning.')).toBeNull();
  });

  it.each(TOMMA_VARDEN)('AK2: %o ger "Beskrivning måste fyllas i"', (value) => {
    expect(validateBeskrivning(value)).toBe('Beskrivning måste fyllas i');
  });

  it.each(['     ', '\n\n'])('AK5: enbart blanktecken (%j) räknas som tomt', (value) => {
    expect(validateBeskrivning(value)).toBe('Beskrivning måste fyllas i');
  });

  it('AK4: exakt 5000 tecken godtas', () => {
    expect(validateBeskrivning('a'.repeat(5000))).toBeNull();
  });

  it('AK4: 5001 tecken avvisas med meddelande om högst 5000 tecken', () => {
    expect(validateBeskrivning('a'.repeat(5001))).toBe('Beskrivning får vara högst 5000 tecken');
  });

  it('annan typ än text avvisas', () => {
    expect(validateBeskrivning(42)).toBe('Beskrivning måste vara text');
  });
});

describe('validateKategori', () => {
  it.each(KATEGORIER)('AK1: "%s" godtas', (value) => {
    expect(validateKategori(value)).toBeNull();
  });

  it.each([...TOMMA_VARDEN, '  '])('AK2: %o ger "Kategori måste fyllas i"', (value) => {
    expect(validateKategori(value)).toBe('Kategori måste fyllas i');
  });

  it.each(['Finns inte', 'övrigt', ' Övrigt', 7])('AK15: kategori som inte finns i listan (%o) avvisas', (value) => {
    expect(validateKategori(value)).toBe('Kategori måste vara en av kategorierna i listan');
  });
});

describe('validatePrioritet', () => {
  it.each([1, 2, 3, 4, 5])('AK1: %i godtas', (value) => {
    expect(validatePrioritet(value)).toBeNull();
  });

  it.each(TOMMA_VARDEN)('AK2: %o ger "Prioritet måste fyllas i"', (value) => {
    expect(validatePrioritet(value)).toBe('Prioritet måste fyllas i');
  });

  it.each([0, 6, -1])('AK15: %i utanför 1–5 avvisas (gränsfall)', (value) => {
    expect(validatePrioritet(value)).toBe('Prioritet måste vara ett heltal från 1 till 5');
  });

  it.each([2.5, NaN, Infinity, '3', true])('AK15: %o är inte ett heltal och avvisas', (value) => {
    expect(validatePrioritet(value)).toBe('Prioritet måste vara ett heltal från 1 till 5');
  });
});

describe('validateStatus', () => {
  it.each(STATUSAR)('AK1: "%s" godtas', (value) => {
    expect(validateStatus(value)).toBeNull();
  });

  it.each([...TOMMA_VARDEN, ' '])('AK2: %o ger "Status måste fyllas i"', (value) => {
    expect(validateStatus(value)).toBe('Status måste fyllas i');
  });

  it.each(['Stängd', 'nytt', 'Avslutad', 1])('AK13: ogiltig status (%o) avvisas med begripligt meddelande', (value) => {
    expect(validateStatus(value)).toBe('Status måste vara en av: Nytt, Pågående, Väntar på kund, Avslutat');
  });
});

describe('validateDeadline', () => {
  it('AK1: ett datum efter dagens godtas', () => {
    expect(validateDeadline(TOMORROW, TODAY)).toBeNull();
  });

  it.each([...TOMMA_VARDEN, '  '])('AK6: %o ger "Deadline måste fyllas i"', (value) => {
    expect(validateDeadline(value, TODAY)).toBe('Deadline måste fyllas i');
  });

  it('AK7: gårdagens datum avvisas', () => {
    expect(validateDeadline(YESTERDAY, TODAY)).toBe('Deadline kan inte ligga före dagens datum');
  });

  it('AK7: ett datum långt bak i tiden avvisas', () => {
    expect(validateDeadline('1999-12-31', TODAY)).toBe('Deadline kan inte ligga före dagens datum');
  });

  it('AK8: dagens datum godtas (gränsfall)', () => {
    expect(validateDeadline(TODAY, TODAY)).toBeNull();
  });

  it('AK8: över ett årsskifte jämförs datumen rätt', () => {
    expect(validateDeadline('2027-01-01', '2026-12-31')).toBeNull();
    expect(validateDeadline('2026-12-31', '2027-01-01')).toBe('Deadline kan inte ligga före dagens datum');
  });

  it('AK7: ett tvåsiffrigt årtal (0099) tolkas inte som 1999 utan avvisas som passerat', () => {
    expect(validateDeadline('0099-12-31', TODAY)).toBe('Deadline kan inte ligga före dagens datum');
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-11-2', '03/11/2026', '2026-11-03T00:00', 'imorgon', 20261103])(
    'ogiltigt datum (%o) avvisas',
    (value) => {
      expect(validateDeadline(value, TODAY)).toBe('Deadline måste vara ett giltigt datum (ÅÅÅÅ-MM-DD)');
    },
  );

  it('skottdagen 2028-02-29 är ett giltigt datum', () => {
    expect(validateDeadline('2028-02-29', TODAY)).toBeNull();
  });

  it.each([undefined, '', '2026-02-30'])('programmeringsfel: today = %o kastar i stället för att godta allt', (today) => {
    expect(() => validateDeadline('1999-12-31', today)).toThrow('validateDeadline: today');
  });
});
