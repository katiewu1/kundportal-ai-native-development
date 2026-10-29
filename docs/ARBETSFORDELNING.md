# Arbetsfördelning: fyra delar

Skelettet är uppdelat så att varje del har **egna filer**, **egna acceptanskriterier** och **en egen testfil**. Då kan fyra personer arbeta samtidigt utan att redigera samma rader, och varje persons bidrag går att följa i historiken (uppgiften kräver ett eget, spårbart moment per student).

Vem som tar vilken del bestämmer ni själva. Förslaget nedan utgår från kompetens, och Del 3 är gjord så att den lätt kan lämnas över till en person som ansluter senare.

| Del | Innehåll                                    | Acceptanskriterier       | Förslag |
| --- | ------------------------------------------- | ------------------------ | ------- |
| 1   | Backend: registrera och validera            | AK1–AK8                  | Yunus   |
| 2   | Backend: lagring, läsa och ändra            | AK9–AK16                 | Jonas   |
| 3   | Frontend: registreringsformuläret           | AK1–AK8 (gränssnittet)   | Selin   |
| 4   | Frontend: lista, detalj, status, redigering | AK10–AK16 (gränssnittet) | Katie   |

Del 4 är den största frontenddelen, därför föreslås frontendaren där. Byt om det passar bättre.

## Spelregler

- **Rör bara filer i din del.** Varje fil har `ÄGARE: Del N` överst. Frontend är en enda fil, så där gäller markeringarna `DEL 3` och `DEL 4` i `index.html`.
- **Skelettfiler** (`app.js`, `db.js`, `server.js`, `errors.js`, `constants.js`, `tests/helpers/`, de delade funktionerna överst i `index.html`) ändras bara via en liten egen PR som någon annan granskar. Då får ni också en naturlig granskning av en klasskamrats förändring.
- **Kontraktet** mellan backend och frontend är [API.md](API.md). Ändras det, uppdatera dokumentet i samma PR.
- **En branch per del**, små PR:er, och kör `npm test` innan ni pushar.
- **Test först:** gör en `it.todo` till ett riktigt test, se det misslyckas, låt implementationen göra det grönt.

## Beroenden mellan delarna

```
Del 1 (fields.js)  ──►  Del 2 återanvänder validateStatus, validateKategori, validatePrioritet
Del 1 (POST)       ──►  Del 2:s tester behöver ärenden att läsa (kan skapas direkt med SQL tills Del 1 är klar)
API.md             ──►  Del 3 och 4 kan bygga mot låtsassvar tills backend är klar
```

- **Del 1 bör slå ihop `validation/fields.js` först** (en liten PR) så att Del 2 inte blockeras.
- Del 3 och 4 behöver inte vänta på backend: `api()` kan peka mot en låtsas-fetch i tester, och skelettets 501-svar visar att anropet nådde fram.

---

## Del 1: Backend, registrera och validera

**Kriterier:** AK1–AK8 &nbsp;|&nbsp; **Testfil:** `backend/tests/create.test.js`

**Filer:** `backend/src/validation/fields.js`, `validation/newCase.js`, `caseNumber.js`, `repository/insertCase.js`, `handlers/createCase.js`

**Att bygga**

1. Fältvalidatorerna i `fields.js` (rubrik, beskrivning, kategori, prioritet, status, deadline). Kontrakt: `null` om giltigt, annars ett svenskt meddelande.
2. `validateNewCase`: kontrollera alla fält och samla alla fel, kasta `ValidationError`.
3. `generateCaseNumber` och `insertCase`.
4. `createCase`-handlern som binder ihop kedjan, och testerna för AK1–AK8.

**Att besluta och dokumentera**

- Startar löpnumret om varje år, eller räknar det vidare? (Specen säger `"Årets årtal"-1, -2 …` men inte vad som händer vid årsskifte.)
- Hur garanterar ni unika nummer?

**Risker värda att granska (bra underlag för kritisk granskning av AI-förslag)**

- **Tidszon på "dagens datum" (AK7/AK8).** `new Date().toISOString().slice(0, 10)` ger UTC-datum, vilket kan vara gårdagen i Sverige nära midnatt. Testa att er lösning ger rätt datum, och att testet faktiskt fångar felet.
- **Text med enbart mellanslag** och tecken som räknas olika (t.ex. emoji). Bestäm vad "tecken" betyder för längdgränsen.
- Att något sparas trots att valideringen avvisar (AK2). Kontrollera att listan verkligen är oförändrad.

**Klart när:** alla `it.todo` i `create.test.js` är riktiga tester som passerar, och `POST /api/arenden` fungerar enligt `API.md`.

---

## Del 2: Backend, lagring, läsa och ändra

**Kriterier:** AK9–AK16 &nbsp;|&nbsp; **Testfiler:** `backend/tests/read.test.js`, `backend/tests/update.test.js`

**Filer:** `backend/src/repository/findAllCases.js`, `findCaseByNumber.js`, `updateCaseFields.js`, `updateCaseStatus.js`, `handlers/listCases.js`, `getCase.js`, `updateStatus.js`, `updateCase.js`

**Att bygga**

1. Läsa lista och detalj (AK10, AK11), inklusive `404` för okänt ärendenummer.
2. Ändra status (AK12) och avvisa ogiltig status utan att den gamla ändras (AK13).
3. Ändra övriga fält (AK14), avvisa ogiltiga ändringar (AK15) och skydda `arendenummer` och `skapad` (AK16).
4. Omstartstestet (AK9): starta servern med `dbPath` till en tillfällig fil, stäng, öppna igen.

**Att besluta och dokumentera**

- Sortering av listan.
- AK16: avvisa eller ignorera ändring av `arendenummer` och `skapad`? (Specen tillåter båda.)
- Öppna fråga 2 i specen: får `deadline` ändras, och måste nytt datum ligga idag eller framåt? Vad gäller för ett ärende vars deadline redan har passerat när ett annat fält ändras? Besluta tillsammans med Del 1, eftersom det påverkar `validateDeadline`.

**Risker värda att granska**

- **Falskt grönt omstartstest (AK9):** testar ni verkligen mot en ny databasanslutning, eller läser ni samma minnesdatabas? Prova att tillfälligt ta bort sparandet och se att testet misslyckas.
- Att en avvisad ändring (AK15) ändå sparar en del av fälten.

**Klart när:** alla `it.todo` i `read.test.js` och `update.test.js` är riktiga tester som passerar, och endpointsen fungerar enligt `API.md`.

---

## Del 3: Frontend, registreringsformuläret

**Kriterier:** AK1–AK8 (gränssnittssidan) &nbsp;|&nbsp; **Testfil:** `frontend/tests/registrera.test.js`

**Filer:** zonen `DEL 3` i `frontend/index.html` (`<section id="view-new">`, funktionerna `initNewCaseView` och `onShowNewView`, CSS under `DEL 3`)

**Att bygga**

1. Formuläret med fälten i specens datamodell: rubrik (textfält), beskrivning (textarea), kategori, prioritet och status (dropdowns), deadline (datumfält). Dropdown-värdena finns i `PORTAL_CONFIG`.
2. Knappen "Registrera" som skickar `api('POST', '/api/arenden', …)`.
3. Vid fel: visa `faltfel` vid rätt fält med `showFieldErrors`, och `fel` överst med `showGlobalMessage`.
4. Vid lyckad registrering: bekräfta för handläggaren och nollställ formuläret.

**Att besluta och dokumentera**

- Ska frontend även kontrollera fälten innan anropet (snabb återkoppling), eller litar den helt på serverns svar? Servern måste i alla fall validera. Dubbla regler kan glida isär, så ange vilken som gäller.
- Vad ser handläggaren efter en lyckad registrering (stannar på formuläret, eller går till listan)?

**Risker värda att granska**

- Att felmeddelandet hamnar vid fel fält eller inte försvinner när fältet rättas.
- Att knappen kan trycks flera gånger så att samma ärende registreras dubbelt.

**Klart när:** formuläret fungerar mot backend (när Del 1 är klar), felmeddelanden visas enligt AK2–AK7, och testerna i `registrera.test.js` passerar.

---

## Del 4: Frontend, lista, detalj, status och redigering

**Kriterier:** AK10–AK16 (gränssnittssidan) &nbsp;|&nbsp; **Testfil:** `frontend/tests/arenden.test.js`

**Filer:** zonen `DEL 4` i `frontend/index.html` (`<section id="view-list">`, `<section id="view-detail">`, funktionerna `initCaseViews`, `onShowListView`, `onShowDetailView`, CSS under `DEL 4`)

**Att bygga**

1. Listan över alla ärenden (AK10) och navigering till detaljvyn när man väljer ett ärende.
2. Detaljvyn som visar alla åtta fält (AK11).
3. Statusbyte via dropdown med bekräftelse (AK12) och visning av serverns fel (AK13).
4. Redigering av övriga fält (AK14, AK15). Fälten `arendenummer` och `skapad` ska inte gå att redigera (AK16).

**Att besluta och dokumentera**

- Vad visas i listan: alla fält eller ett urval (t.ex. ärendenummer, rubrik, status, deadline)? Specen kräver bara att alla ärenden visas. Beslut 2026-10-28 (Katie): Listan visar ärendenummer, rubrik, prioritet, status och deadline.
- Hur ser en tom lista ut? Beslut 2026-10-28 (Katie): Tom lista visar texten "Inga ärenden ännu".
- Öppna fråga 1 i specen: ska ett ärende med passerad deadline som inte är avslutat markeras i listan? Tas bara med om teamet vill det, och då skrivs ett nytt acceptanskriterium först.

**Risker värda att granska**

- Att gränssnittet visar den nya statusen innan servern har bekräftat den, så att användaren tror att något sparats som avvisades.
- Att data från servern (rubrik, beskrivning) sätts in som HTML. Använd `textContent`, inte `innerHTML`, så att en rubrik som innehåller `<` inte bryter sidan.

**Klart när:** listan, detaljen, statusbytet och redigeringen fungerar mot backend (när Del 2 är klar), och testerna i `arenden.test.js` passerar.

---

## Gemensamt arbete (utöver delarna)

Uppgiften kräver också följande från gruppen. Fördela dem så att alla bidrar:

- Verifieringsplanen (`docs/verifieringsplan.md`, finns som mall) och körresultat.
- Det gemensamma AI-arbetssättet. `AGENTS.md` är en första version. Utveckla den tillsammans.
- Att granska varandras PR:er. Varje person ska granska minst en kamrats förändring.
