# Instruktioner till AI-agenter (projektets AI-instruktioner)

Du hjälper ett studentteam att bygga Kundserviceportalen. Läs `SPECIFIKATION.md` först – den är sanningen om vad som ska byggas.

## Regler

1. **Håll dig till specen.** Bygg inga funktioner som inte finns i `SPECIFIKATION.md`. Är något oklart eller listat under _Öppna frågor_: fråga, gissa inte.
2. **Rör bara filer i den Del du fått i uppdrag** (se `docs/ARBETSFORDELNING.md`, rubriken "ÄGARE" överst i varje fil). Skelettfiler (`app.js`, `db.js`, `server.js`, `errors.js`, `constants.js`, `tests/helpers/`) ändras bara på uttrycklig begäran.
3. **Inga nya beroenden** utan att teamet har godkänt det. Tekniken är: Node.js, `node:sqlite`, `node:http`, Vitest, JavaScript i en HTML-fil. Inga externa tjänster eller betaltjänster.
4. **Test först.** Gör en `it.todo` till ett riktigt test och kör det innan implementationen. Täck happy path, error path och gränsfall för kriteriet.
5. **Kör `npm test`** och rapportera det faktiska resultatet. Påstå aldrig att något fungerar utan att ha kört det.
6. **Svenska fältnamn** (`rubrik`, `arendenummer` …) och svenska felmeddelanden till användaren. Följ API-formatet i `docs/API.md`.
7. **Ändra inte acceptanskriterier eller specen.** Föreslå ändringen i stället.
8. Förklara kort vad du gjorde och vad du inte har kontrollerat.

## Tekniskt i korthet

- Backend: `backend/src/app.js` kopplar rutter till handlers. En handler får `{ db, now, params, body }` och returnerar `{ status, body }` eller kastar `ValidationError` / `NotFoundError`.
- Använd `now()` (aldrig `new Date()` direkt) så att tester kan fixera tiden.
- Frontend: all kod finns i `frontend/index.html`, uppdelad i zoner per Del.

## Projektstruktur

```
/
├── AGENTS.md
├── SPECIFIKATION.md
├── backend/
│ ├── src/ (app.js, caseNumber.js, constants.js, db.js, errors.js, server.js, handlers/, repository/, validation/)
│ └── tests/
├── frontend/
│ ├── index.html (all frontendkod: HTML, CSS och JavaScript)
│ └── tests/ (arenden.test.js, registrera.test.js, smoke.test.js)
└── docs/ (API.md, ARBETSFORDELNING.md, verifieringsplan.md)
```

## Frontend: kodstruktur

Frontend är **en enda fil**, `frontend/index.html`, uppdelad i tre delar, både i CSS och i JavaScript:

1. **Delat skelett** (ändras bara via liten, granskad PR): `PORTAL_CONFIG`, `api()`, `showView()`, `showGlobalMessage()`, `clearGlobalMessage()`, `showFieldErrors()`, `clearFieldErrors()` och `init()`.
2. **Zon DEL 3**: registreringsformuläret (`#view-new`, `initNewCaseView`, `onShowNewView`).
3. **Zon DEL 4**: lista, detalj, status och redigering (`#view-list`, `#view-detail`, `initCaseViews`, `onShowListView`, `onShowDetailView`).

Regler för frontendkoden:

- **Rör bara din zon.** Zonerna är markerade med kommentarer (`DEL 3` / `DEL 4`) i både `<style>`, HTML och `<script>`.
- **Anropa alltid backend via `api()`.** Den kastar aldrig fel utan returnerar `{ ok, status, data }`. Använd inte `fetch` direkt.
- **Visa fel med skeletthjälparna:** `showFieldErrors(form, data.faltfel)` vid fält, `showGlobalMessage(data.fel)` överst.
- **Byt vy med `showView(namn, arg)`.** Vynamn är `new`, `list` och `detail`. Lägg inte till egen navigering.
- **Använd `textContent`, aldrig `innerHTML`,** för data från servern.
- **Återanvänd `PORTAL_CONFIG`** för dropdown-värden i stället för att skriva listorna igen.
- **Formulärfält** har `name` enligt datamodellen (`rubrik`, `beskrivning`, `kategori`, `prioritet`, `status`, `deadline`) och ett `<span class="field-error" data-error-for="<fältnamn>">` vid varje fält.
- **Inget ramverk, inga externa bibliotek**.
- Funktionsnamn på engelska enligt skelettet, texter till användaren på svenska.
- **Citattecken:** enkla (`'`) i JavaScript, dubbla (`"`) i HTML-attribut. Använd backticks bara när strängen innehåller variabler. Följ stilen som redan finns i filen.
