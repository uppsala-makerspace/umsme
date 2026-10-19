# Plan: testdata och teststrategi

Förutsättning för migreringen i `plan/migration.md`. Två behov:

- **E2e-tester** som körs mot känd, nollställd data.
- **Utforskning**: en utvecklare (eller styrelsen) ska kunna starta systemet
  med realistisk data och se hur gränssnitten fungerar.

Beslut från intervju 2026-10-19.

## Princip: två scenarier, en källa

Två scenarier, `e2e` och `demo`, byggda av samma byggstenar. Två fristående
uppsättningar glider isär; det hände med appens `seedTestData.js`, som
saknade `registered` i ett halvår efter att unlock började kräva det.

Syntetisk data, aldrig en anonymiserad driftkopia: den väcker GDPR-frågor,
är svår att anonymisera på riktigt (födelseår, familjer och betalningsdatum
räcker ofta för att känna igen någon) och ändras vid varje ny kopia.

## Byggstenar — `common/server/seed/`

Funktioner som skapar giltiga dokument, t.ex.:

- `makeUser({ email, password, roles, verified })`
- `makeMember({ status, lab, liability, registered, excluded })`
- `withFamily(payer, n)`
- `withPaymentHistory(member, { years })` — Payments och Memberships som
  stämmer med varandra och med `common/lib/rules.js`
- `withStorageUnit(...)`, `withGroup(...)`, `withWorkshop(...)`,
  `withExpense(...)`, `withAttestation(...)`

Regler:

- Skriver via Collection2-scheman, och via domänfunktionerna när de finns
  (migreringen inför dem modul för modul). Datan blir då giltig per
  konstruktion.
- Datum räknas relativt till dagens datum, så att aktiva medlemmar förblir
  aktiva.
- Slumpen kommer från en PRNG med fast frö, så att två körningar ger samma
  namn och samma fördelning.

## Scenariot `e2e`

- Litet och förutsägbart: en namngiven person per tillstånd som testas
  (`member@test.com`, `noliability@test.com`, …), inget mer.
- Ersätter `app/server/seedTestData.js` direkt. Appens e2e-tester flyttas till
  det och körs mot samma databas som admins.
- Databasen `umsme-e2e` nollställs före varje körning.

## Scenariot `demo`

- **Volym:** omkring 200 medlemmar och 3 års historik.
- **Namn:** svenska namn, mobilnummer och kontonummer i rätt format. Mejl på
  `example.org`, så att inget kan nå en riktig person.
- **Medlemstillstånd:** aktiv, utgången, familjebetalare, familjemedlem,
  labbmedlem, väntar på godkännande, utesluten, overifierad, utan
  ansvarsförbindelse.
- **Inloggningar** med kända lösenord, listade i README och i
  seed-kommandots utskrift:
  - en per adminroll: `admin`, `board`, `treasurer`
  - lagerroll: `storage`
  - medlemmar i vart och ett av tillstånden ovan
  - gruppansvariga: ledare för en grupp och en verkstad, medlem i en
    styrgrupp
- **Innehåller e2e-personerna**, så att man kan logga in som samma person som
  ett test använder.
- **Förifyllt det externa tjänster normalt producerar:** bankrader som väntar
  på matchning, Swish-betalningar, dörröppningar, skickade mejl och
  meddelanden. Det går att utforska matchning, låshistorik och utskick, men
  inte att hämta nytt.
- **Övrigt innehåll:** grupper, verkstäder, utrymmen, lagring (väggar, enheter,
  förfrågningar, varningar), utlägg och budgetar, certifikat och intyg,
  butiksartiklar med försäljning, meddelanden på startsidan,
  ansvarsdokument, meddelandemallar.

## Externa tjänster: avstängda

I både `e2e` och `demo`:

- **Mejl och push:** flödet går igenom och `Messages`/`Mails`-posterna skapas
  som vanligt, men `recipientWhitelist: []` stoppar själva utskicket. E2e kan
  kontrollera att rätt meddelande skapades.
- **Slack:** kanaler med `"webhookUrl": "console:dev"` eller utan
  prenumerationer.
- **Bankproxy, Swish, lås-API:** inte konfigurerade. Knappar som hämtar eller
  skickar till dem ger fel; datan de skulle ha producerat finns förifylld.

## Köra

Seedningen körs inne i Meteor, så att Collection2, roles och accounts
fungerar som vanligt. Demon seedas i admin, vars egen uppstart sedan lägger
till admin-inloggningen och mallarna för lagringsmeddelanden; appens e2e
seedas i appen, som har samma paket (`runSeedFromEnv` anropas av båda):

- `SEED=e2e` eller `SEED=demo` vid start av admin seedar och fortsätter
  sedan köra.
- **Skydd:** seedningen vägrar om databasnamnet i `MONGO_URL` inte slutar på
  `-e2e` eller `-demo`, eller om `private.recipientWhitelist` inte är en tom
  lista. Den kan alltså aldrig skriva i drift eller i en lokal kopia av
  driften.
- npm-skript i admin: `seed:e2e`, `seed:demo`.
- Inställningsfiler för läget: `admin/settings_demo.json`,
  `app/settings_demo.json`, `payment/settings_demo.json` (och motsvarande för
  e2e), utan hemligheter, incheckade.

`./scripts/demo.sh` i roten seedar `umsme-demo` och startar admin (3100), app
(3101) och payment (3103) mot den, bredvid utvecklingsservrarna på 3000, 3001
och 3003. Det är kommandot en ny utvecklare kör.

Bara lokalt; ingen delad demo-instans.

## E2e i admin

- Playwright i admin, samma uppsättning som appen, med egen port och
  databasen `umsme-e2e`.
- **Före migreringen av en modul** skrivs e2e-tester för dess huvudflöden mot
  Blaze-versionen: lista, visa, skapa, ändra, ta bort, plus det som händer i
  bakgrunden (mejl som skapas, kaskader). Varje fält och felfall täcks av
  servertester, inte e2e.
- Samma tester ska gå igenom mot React-versionen. Det är beviset för att inget
  tappats.
- **Selektorer mot det användaren ser:** `getByRole`, `getByLabel`, synlig
  text. Aldrig CSS-klasser eller DOM-struktur, som byts när Blaze blir React.
  Appens sex inaktuella tester föll alla på klasser som försvann vid bytet
  till Tailwind.

## Servertester

Oförändrat: mocha-testerna skapar den minsta data de behöver i varje test och
använder inte scenarierna.

## Underhåll

Regel i `CLAUDE.md` (roten): nya fält, regler eller samlingar ska ha
motsvarighet i byggstenarna och i `demo`-scenariot, på samma sätt som
instruktionen för manager events.

Ingen CI tills vidare; allt körs lokalt.

## Ordning

1. ~~Byggstenar, PRNG och skyddet i `common/server/seed/`.~~ Klart (fb698c7).
2. ~~Scenariot `demo` och `./scripts/demo.sh`, med README-avsnitt.~~ Klart;
   tidigarelagt före e2e. Personerna ligger i `scenarios/personas.js` på
   `example.org`.
3. ~~Regeln i `CLAUDE.md`.~~ Klart, tillsammans med demo.
4. ~~Scenariot `e2e`; flytta appens seedning dit och få appens 20 e2e-tester
   gröna mot den.~~ Klart. Appen seedar `umsme-e2e` själv vid start
   (`SEED=e2e`), så ingen admin behöver köras för appens tester; `e2e/helpers.ts` läser personerna direkt ur `personas.js`, som
   också har `E2E_PERSONAS` för de personer bara lagringstesterna behöver.
   Appens `seedTestData.js` och skriptet `seed:dev` (som seedade
   huvuddatabasen `umsme`) är borttagna.
5. ~~Playwright i admin~~ Klart: port 3200, egen databas `umsme-admin-e2e`
   så att admins och appens sviter kan köras samtidigt, samma mönster som
   appen (`openAs`, parallellt, produktionsläge). `openAs` och testpersonerna
   delas via `common/e2e/personas.ts`. Fyra rökprov i `e2e/access.spec.ts`.
6. ~~E2e-tester för pilotmodulen `liability` mot Blaze-versionen.~~ Klart:
   `admin/e2e/liability.spec.ts`, åtta tester (lista, behörighet för admin,
   board och treasurer, lägga till, kräva titel, ändra, radera, datum).
   Testerna som ändrar och raderar har egna dokument i e2e-scenariot.

Sedan steg 0 och piloten i `plan/migration.md`.
