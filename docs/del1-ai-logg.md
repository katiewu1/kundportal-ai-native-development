# Del 1: AI-logg (Yunus)

Syfte: visa vad AI-agenten föreslog och gjorde, hur det kontrollerades, och vad jag själv beslutade.
Kolumnen "Min granskning" fyller jag i själv.

## Agentuppdraget

- **Uppdrag:** bygga Del 1 (`POST /api/arenden`, AK1–AK8), med `fields.js` först. Tester skrivs före koden.
- **Gränser:**
  - Bara Del 1-filerna (AGENTS.md, regel 2).
  - Inga nya beroenden.
  - Specen ändras inte.
  - Beslut som specen lämnar öppna fattar jag, inte agenten.
- **Kontrollpunkter:**
  - Testerna ska vara röda innan koden skrivs.
  - Det faktiska resultatet av `npm test` redovisas.
  - En oberoende granskningsagent läser ändringen.
  - Varje fynd ska kunna återskapas.

## Logg

| Datum      | AI föreslog eller gjorde | Hur det kontrollerades | Min granskning |
| ---------- | ------------------------ | ---------------------- | -------------- |
| 2026-10-27 | Skrev validatorerna i `fields.js` och 89 enhetstester. | Kört: 81 gröna, 7 röda. De röda väntar på `countChars`. | |
| 2026-10-27 | Granskningsagenten hittade att `Date.UTC` tolkar år 0–99 som 1900–1999. Därför godtogs `0099-12-31` inte som ett passerat datum. | Ett nytt test var rött före rättningen och grönt efter. | |
| 2026-10-27 | Skrev `newCase.js`, `insertCase.js` och `createCase.js`, plus testerna för AK1–AK8, tidszonen och ärendenumret. | 77 tester röda innan mina tre beslut är gjorda. I en kopia med tillfälliga beslut: 167 gröna. | |
| 2026-10-27 | Kontroll av testerna med sex felaktiga varianter som en AI lätt föreslår (tabellen nedan). | Alla sex fångades. | |
| 2026-10-27 | Granskningsagenten: `insertCase` använde `.get()` på `INSERT … RETURNING`. När en annan anslutning läste databasen blev svaret 201, men ärendet sparades inte. | Återskapat: 201, 0 sparade rader, och nästa ärende fick samma nummer. Ett nytt test är rött med `.get()` och grönt med `.all()`. Rättat. | |
| 2026-10-27 | Granskningsagenten: tidszonstestet kunde luras av en formaterare som skapas när modulen laddas. | Återskapat: fel kod klarade 24 av 24 tester. Efter rättningen laddas modulen om efter varje tidszonbyte: 8 röda. Ett kontrolltest visar att tidszonbytet slår igenom. | |
| 2026-10-27 | Skrev koden för mina tre beslut och gjorde om två `it.todo` till tester. | `npm test`: 179 gröna, 0 röda. Samma resultat med `TZ=UTC` och `TZ=America/New_York`. | |
| 2026-10-28 | Uppdaterade grenen till senaste `main` (PR #3–#5). Följde teamets `ak-check` för AK1–AK8, fyllde i Del 1 i `verifieringsplan.md` och provade den riktiga servern med `curl`. | Ingen fil krockade med `main`. Backend 179 gröna, frontend 7 gröna. Servern svarade 201, 400 och 400, och 1 ärende sparades. | |

### Fångar testerna felet?

| Felaktig variant                                            | Röda tester |
| ----------------------------------------------------------- | ----------- |
| Dagens datum i UTC: `toISOString().slice(0, 10)`            | 14          |
| Dagens datum i datorns tidszon: `getDate()` m.fl.           | 8 (alla i `dagensDatum.test.js`) |
| Samma variant, bara `create.test.js` på en svensk dator     | 0           |
| Ärendenummer = `COUNT(*) + 1`                               | 2           |
| Ärendenummer = `MAX(arendenummer)` jämfört som text         | 2           |
| `rubrik` och `beskrivning` sparas utan `trim()`             | 2           |
| Ingen kontroll av att kroppen är ett objekt (`null`)        | 3           |
| `insertCase` med `.get()` medan databasen är låst           | 1           |
| Formaterare skapad när modulen laddas (svensk dator)        | 8 (före rättningen av testet: 0) |

Raderna med "0" visar varför `dagensDatum.test.js` byter tidszon och laddar om modulen. Utan det hade felet inte syntes på en svensk dator.

## Förslag till teamet (skelettfiler, ändras inte av Del 1)

| Fil | Problem | Belägg | Förslag |
| --- | ------- | ------ | ------- |
| `tests/helpers/testServer.js` | `FIXED_NOW` anges i datorns lokala tid. | Rätt kod, men med `TZ=Pacific/Auckland` blir 2 tester i `create.test.js` röda. | `new Date('2026-11-02T09:00:00Z')` |
| `src/db.js` | Ingen `busy_timeout`. | En andra anslutning mot samma fil ger direkt "database is locked" (500). | `db.exec('PRAGMA busy_timeout = 5000')` |
| `SPECIFIKATION.md`, AK5 | En rubrik med bara osynliga tecken (t.ex. U+200B) godtas. | `trim()` tar inte bort U+200B. | Teamet beslutar om det ska räknas som tomt. |

## Mina beslut

| Beslut                            | Alternativ                                                    | Mitt val | Varför |
| --------------------------------- | ------------------------------------------------------------- | -------- | ------ |
| Vad är ett tecken (`countChars`)? | `.length` (UTF-16, som `maxlength`), `[...text].length` (kodpunkter), `Intl.Segmenter` (det användaren ser) | `.length` | |
| Löpnummer vid årsskiftet          | börjar om på 1, eller räknar vidare                           | börjar om på 1 | |
| Dagens datum (`dagensDatum`)      | UTC, datorns tidszon, eller `Europe/Stockholm`                | `Europe/Stockholm` | |

Testerna skyddar besluten. Med `[...text].length` blir 3 tester röda. Om numret räknar vidare över åren blir 2 tester röda.

## AI-förslag som jag behöver godkänna eller ändra

| Förslag                                                                              | Påverkar           | Godkänt? |
| ------------------------------------------------------------------------------------ | ------------------ | -------- |
| `prioritet` godtas bara som JSON-tal, så frontend skickar `Number(value)`.           | Selin (Del 3)      | |
| `rubrik` och `beskrivning` sparas trimmade. Del 2 måste också spara `value.trim()`.  | Jonas (Del 2)      | |
| `generateCaseNumber(db, year)` i stället för `(db, now)`, så klockan läses en gång.  | bara Del 1         | |
| Unika nummer: `UNIQUE` i databasen och synkron `DatabaseSync`, ingen transaktion.    | bara Del 1         | |
| "Dagens datum" ska vara svenskt datum oavsett server. Taget från ARBETSFORDELNING.md. | Del 2 (deadline vid ändring) | |
