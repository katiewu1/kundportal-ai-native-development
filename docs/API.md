# API-kontrakt

Kontraktet mellan backend (Del 1–2) och frontend (Del 3–4). Ändra det bara tillsammans och uppdatera detta dokument i samma PR.

Alla svar är JSON (`Content-Type: application/json`). Fältnamn på svenska enligt specen.

## Ärende (så ser ett ärende ut i svar)

```json
{
  "arendenummer": "2026-1",
  "rubrik": "Kan inte logga in",
  "beskrivning": "Kunden får felmeddelande vid inloggning.",
  "kategori": "Digital tjänst och inloggning",
  "prioritet": 3,
  "status": "Nytt",
  "skapad": "2026-11-02T09:00:00.000Z",
  "deadline": "2026-11-30"
}
```

- `skapad`: ISO 8601 i UTC. `deadline`: `YYYY-MM-DD`. (Skelettets val – ändra bara om alla är överens.)
- Databasens interna `id` skickas aldrig ut.

## Endpoints

| Metod | Sökväg                              | Del | AK         | Body                                                         | Lyckat svar               |
| ----- | ----------------------------------- | --- | ---------- | ------------------------------------------------------------ | ------------------------- |
| POST  | `/api/arenden`                      | 1   | AK1–AK8    | `rubrik, beskrivning, kategori, prioritet, status, deadline` | `201` + ärendet           |
| GET   | `/api/arenden`                      | 2   | AK10       | –                                                            | `200` + lista med ärenden |
| GET   | `/api/arenden/:arendenummer`        | 2   | AK11       | –                                                            | `200` + ärendet           |
| PATCH | `/api/arenden/:arendenummer/status` | 2   | AK12, AK13 | `{ "status": "Pågående" }`                                   | `200` + ärendet           |
| PATCH | `/api/arenden/:arendenummer`        | 2   | AK14–AK16  | de fält som ändras                                           | `200` + ärendet           |

Listan är sorterad med det senast registrerade ärendet först.

## Felsvar

| Status | När                                              | Format                                                                                                                 |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `400`  | Ogiltig inmatning                                | `{ "fel": "Ärendet kunde inte sparas. Rätta de markerade fälten.", "faltfel": { "rubrik": "Rubrik måste fyllas i" } }` |
| `404`  | Ärendet eller sökvägen finns inte                | `{ "fel": "Ärendet hittades inte." }`                                                                                  |
| `501`  | Funktionen är inte byggd ännu (bara i skelettet) | `{ "fel": "Inte byggt ännu: …" }`                                                                                      |
| `500`  | Oväntat serverfel                                | `{ "fel": "Något gick fel på servern. Försök igen." }`                                                                 |

- `fel` är ett allmänt meddelande som kan visas överst. `faltfel` är ett meddelande per fält och visas vid respektive fält. Alla fel i samma begäran skickas tillsammans.
- Meddelandena i specen är exakta, t.ex. `Rubrik måste fyllas i`, `Deadline måste fyllas i`, `Deadline kan inte ligga före dagens datum`. Övriga meddelanden (längdgränser, ogiltig status m.fl.) bestämmer Del 1 respektive Del 2 – skriv in dem här när de är beslutade.

## Valideringsmeddelanden (Del 1)

Gäller `POST /api/arenden` och återanvänds av Del 2 vid ändring. Källa: `backend/src/validation/fields.js`, testade i `backend/tests/fields.test.js`.

| Fält          | Fel                                   | `faltfel`-meddelande                                                  |
| ------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `rubrik`      | saknas eller enbart blanktecken       | `Rubrik måste fyllas i`                                               |
| `rubrik`      | över 100 tecken                       | `Rubrik får vara högst 100 tecken`                                    |
| `rubrik`      | inte text                             | `Rubrik måste vara text`                                              |
| `rubrik`      | innehåller NUL-tecken                 | `Rubrik innehåller ogiltiga tecken`                                   |
| `beskrivning` | saknas eller enbart blanktecken       | `Beskrivning måste fyllas i`                                          |
| `beskrivning` | över 5000 tecken                      | `Beskrivning får vara högst 5000 tecken`                              |
| `beskrivning` | inte text                             | `Beskrivning måste vara text`                                         |
| `beskrivning` | innehåller NUL-tecken                 | `Beskrivning innehåller ogiltiga tecken`                              |
| `kategori`    | saknas                                | `Kategori måste fyllas i`                                             |
| `kategori`    | inte en av kategorierna               | `Kategori måste vara en av kategorierna i listan`                     |
| `prioritet`   | saknas                                | `Prioritet måste fyllas i`                                            |
| `prioritet`   | inte ett heltal 1–5                   | `Prioritet måste vara ett heltal från 1 till 5`                       |
| `status`      | saknas                                | `Status måste fyllas i`                                               |
| `status`      | inte en av statusarna                 | `Status måste vara en av: Nytt, Pågående, Väntar på kund, Avslutat`   |
| `deadline`    | saknas                                | `Deadline måste fyllas i`                                             |
| `deadline`    | inte ett riktigt datum `YYYY-MM-DD`   | `Deadline måste vara ett giltigt datum (ÅÅÅÅ-MM-DD)`                  |
| `deadline`    | före dagens datum                     | `Deadline kan inte ligga före dagens datum`                           |

- `prioritet` skickas som JSON-tal (`3`), inte som sträng (`"3"`). En `<select>` ger strängar, så frontend skickar `Number(value)`.
- Längden räknas utan blanktecken före och efter, i UTF-16-enheter (`text.length`). Det är samma räkning som `maxlength` i HTML. En emoji som 😀 räknas som 2 tecken.
- `arendenummer`: löpnumret börjar om från 1 varje nytt år, i svensk tid: … `2026-57`, `2027-1`.
- `rubrik` och `beskrivning` sparas utan blanktecken före och efter.
- `arendenummer`, `skapad` och okända fält i `POST`-kroppen ignoreras: systemet sätter dem.
- "Dagens datum" (AK7, AK8) och årtalet i `arendenummer` räknas i svensk tid, oavsett serverns tidszon.

## Ändra ett ärende (Del 2)

Gäller `PATCH /api/arenden/:arendenummer`. Källa: `backend/src/validation/caseChanges.js`, testade i `backend/tests/update.test.js`.

- Bara de fält som skickas med ändras: `rubrik`, `beskrivning`, `kategori`, `prioritet` och `deadline`. Samma meddelanden som i tabellen ovan, och alla fel skickas tillsammans.
- Är något fält ogiltigt sparas ingenting, inte heller de giltiga fälten (AK15).
- `arendenummer`, `skapad` och okända fält ignoreras, samma som vid `POST` (AK16). Svaret är `200` och värdena är oförändrade.
- `status` ändras bara via `/status` och ignoreras här.
- **Deadline (förslag på öppen fråga 2 i specen, teamet behöver bekräfta):** deadline får ändras till idag eller framåt. Skickas samma deadline som redan är sparad kontrolleras den inte, och ett ärende med passerad deadline kan ändras i andra fält.
- En kropp som inte är ett JSON-objekt (`null`, en lista, ett tal) ger `400`. En tom kropp räknas som en tom ändring och ger `200`.
- Okänt ärendenummer ger `404` även om värdena är ogiltiga. Kroppen läses först, så trasig JSON ger alltid `400`.
