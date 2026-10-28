# Verifieringsplan (mall)

Fylls i löpande. Uppgiften kräver tre saker: vilka tester som finns, hur och varför, samt resultat och begränsningar. Skilj automatiserade tester från manuella kontroller, och planerade från genomförda.

## 1. Vilka tester som finns

| AK | Typ | Beteende och förväntat resultat | Testfil | Status |
|---|---|---|---|---|
| AK1 | happy path | Giltigt ärende sparas med ärendenummer och skapad-tid | `backend/tests/create.test.js`, `newCase.test.js`, `caseNumber.test.js` | grön 2026-10-28 (delen "visas i listan" väntar på Del 2) |
| AK2 | error path | Saknat obligatoriskt fält avvisas, inget sparas | `backend/tests/create.test.js`, `newCase.test.js`, `fields.test.js` | grön 2026-10-28 |
| AK3 | gränsfall | Rubrik 100 tecken godtas, 101 avvisas | `backend/tests/create.test.js`, `fields.test.js` | grön 2026-10-28 |
| AK4 | gränsfall | Beskrivning 5000 tecken godtas, 5001 avvisas | `backend/tests/create.test.js`, `fields.test.js` | grön 2026-10-28 |
| AK5 | gränsfall | Enbart mellanslag räknas som tomt | `backend/tests/create.test.js`, `fields.test.js` | grön 2026-10-28 |
| AK6 | error path | Deadline saknas avvisas | `backend/tests/create.test.js`, `fields.test.js` | grön 2026-10-28 |
| AK7 | error path | Passerad deadline avvisas | `backend/tests/create.test.js`, `fields.test.js`, `dagensDatum.test.js` | grön 2026-10-28 |
| AK8 | gränsfall | Dagens datum som deadline godtas | `backend/tests/create.test.js`, `fields.test.js`, `dagensDatum.test.js` | grön 2026-10-28 |
| AK9 | happy path | Ärende finns kvar efter omstart | `backend/tests/read.test.js` | planerad |
| AK10 | happy path | Alla ärenden visas i listan | `backend/tests/read.test.js` | planerad |
| AK11 | happy path | Alla fält visas för ett ärende | `backend/tests/read.test.js` | planerad |
| AK12 | happy path | Statusändring sparas och finns kvar | `backend/tests/update.test.js` | planerad |
| AK13 | error path | Ogiltig status avvisas, gamla kvar | `backend/tests/update.test.js` | planerad |
| AK14 | happy path | Ändring av fält sparas, övriga oförändrade | `backend/tests/update.test.js` | planerad |
| AK15 | error path | Ogiltig ändring avvisas | `backend/tests/update.test.js` | planerad |
| AK16 | error path | Ärendenummer och skapad kan inte ändras | `backend/tests/update.test.js` | planerad |

## 2. Hur och varför

_Vald testnivå (t.ex. integrationstest mot HTTP + databas), varför just dessa testfall, och varför sättet att testa._

### Del 1 (AK1–AK8)

- **Integrationstester mot HTTP och databas** (`create.test.js`), ett eller flera per AK. De går genom hela kedjan. För varje error path räknas raderna i databasen, så att "inget sparas" verkligen kontrolleras.
- **Enhetstester** (`fields.test.js`, `newCase.test.js`, `caseNumber.test.js`) för gränsfall som är många eller krångliga att köra via HTTP. Exempel: ogiltiga datum som `2026-02-30`, och att `2026-9` följs av `2026-10`.
- **Tidszonstest** (`dagensDatum.test.js`). Testet byter datorns tidszon, eftersom ett fel med "dagens datum" annars inte syns på en dator som står på svensk tid.
- **Kontroll av testerna.** Felaktiga varianter av koden byttes in en i taget, och testerna blev röda varje gång (se `docs/del1-ai-logg.md`).

## 3. Resultat och begränsningar

_Faktiska körresultat (kommando + utfall), vad testerna inte visar, manuella kontroller (t.ex. är felmeddelandena begripliga?)._

### Del 1 (AK1–AK8), 2026-10-28

**Automatiserat**

- `npm test` på `main` (528569f) plus ändringarna för Del 1:
  - backend 179 gröna, 12 todo
  - frontend 7 gröna, 10 todo
- Samma resultat för backend med `TZ=UTC` och `TZ=America/New_York`.

**Manuellt**

Den riktiga servern startades med en tillfällig databasfil (`PORT=3917 DB_PATH=<tillfällig fil> npm start`). Sedan skickades tre `POST /api/arenden` med `curl`:

| Begäran | Svar |
|---|---|
| Giltigt ärende med dagens datum som deadline | `201` och `2026-1` |
| Tom kropp `{}` | `400` med fältfel för alla sex fält |
| Rubrik på 101 tecken och deadline `2020-01-01` | `400` med båda felen samtidigt |

Efteråt fanns exakt 1 ärende i databasen.

**Begränsningar**

- AK1 säger att ärendet "visas i ärendelistan". Det är inte testat, eftersom `GET /api/arenden` (Del 2) inte är byggd än.
- Bara API-svaren är kontrollerade. Hur felmeddelandena visas i formuläret är inte kontrollerat (Del 3).
- Med `TZ=Pacific/Auckland` blir 2 tester röda. Orsaken är `FIXED_NOW` i testhjälpen, inte koden. Förslaget till teamet finns i `docs/del1-ai-logg.md`.
- Flera servrar mot samma databasfil: en krock ger `500`, aldrig dubbla ärendenummer. Det finns ingen `busy_timeout`.

## Så körs testerna

```bash
npm install
npm test
```
