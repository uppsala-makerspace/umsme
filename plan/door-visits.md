# Plan: Besöksstatistik för dörrarna (admin)

Gren: `door-stats` (från `master`).

## Kontext

Dagens dörrstatistik (`/door`, `DoorStats.jsx`) visar bara hur många personer
som öppnat dörren 1–5, 6–10 … gånger det senaste halvåret, räknat från låsets
logg eller de sparade öppningarna. Sidan finns inte ens i menyn.

Vi vill i stället ha en aktivitetsvy för hela föreningen, i samma anda som
fliken Activity på medlemssidan, med fokus på **besök**: ett besök är en dag då
en medlem öppnat någon dörr (högst ett per medlem och dag, svensk tid).

- Besök **per dag** under en vald månad.
- Besök **per månad, kvartal eller år**, där man kan välja att räkna
  **besök** (medlem-dagar) eller **unika medlemmar** (en medlem räknas en gång
  per period, även om den kommit tio gånger).

Beslut (från användaren):
- **Beräknas vid varje anrop**, ingen cache eller förberäkning. Mätt på
  produktionskopian: 7 762 öppningar på ett halvår, alla besök framräknade på
  16 ms. Ett index på `timestamp` läggs till. Blir det långsamt kan en cache
  läggas runt `doorVisitStats` utan att något annat ändras.
- **Bara medlemmar** räknas: öppningar utan `memberid` (låsanvändare synken
  inte kunde knyta till någon, 355 av 7 762) räknas inte.
- **Dagens sida ersätts helt**: fördelningen 1–5, 6–10 … och knappen för
  låsets logg tas bort.
- **Inget dörrfilter**: ett besök är en dag med en öppning av vilken dörr som helst.

## Vyn (`/door`, "Door visits")

Överst en rad med val:

| Val | Alternativ | Standard |
|---|---|---|
| **View** (ToggleButtonGroup) | Per day · Per month · Per quarter · Per year | Per day |
| **Month** (meny, bara vid Per day) | månaderna med data, nyast först | innevarande månad |
| **Year** (meny, bara vid Per month) | åren med data, nyast först | innevarande år |
| **Count** (ToggleButtonGroup, inte vid Per day) | Visits · Unique members | Visits |

Vid Per day är besök och unika medlemmar samma sak (en medlem kan bara ge ett
besök per dag), så valet Count visas inte där.

Staplarna:
- **Per day**: en stapel per dag i vald månad (1–31). Värde: antal medlemmar
  som kom den dagen.
- **Per month**: tolv staplar för valt år. Månader efter innevarande visas inte.
- **Per quarter**: alla kvartal från det första med data till innevarande
  ("2026 Q2", "Q3" …).
- **Per year**: alla år från det första med data till innevarande.

Klick på en stapel går ett steg ned: ett år → Per month för det året, ett
kvartal → Per month för dess år, en månad → Per day för den månaden.

Under valen en sammanfattning för det som visas, t.ex.
"October 2026: 312 visits by 58 members" eller "2026: 2 657 visits by 121 members",
och en grå rad som förklarar: "A visit is a day a member opened any door: at
most one a day per member. Unique members counts each member once per bar."

Sedan diagrammet (`ChartCanvas`, full bredd, höjd 360). Inga besök → en text i
stället för ett tomt diagram.

## Server

### `common/server/doors/visitStats.js` (ny)

```js
/**
 * The member-days with an opening between two days (Swedish time),
 * inclusive: [{ day: '2026-10-01', memberid }]. Openings without a member
 * do not count.
 */
export const memberDays = async ({ fromDay, toDay }) => { … }
```
- En aggregering på `DoorUnlocks.rawCollection()`:
  `$match: { memberid: { $exists: true }, timestamp: { $gte: from − 2 dagar, $lt: to + 2 dagar } }`
  (marginal för tidszonen), `$group` på
  `{ day: $dateToString('%Y-%m-%d', timezone: ACTIVITY_TIME_ZONE), memberid }`.
  Behåll dagar inom `[fromDay, toDay]`.

```js
/**
 * Visits for the door statistics.
 * @param {{ view: 'day'|'month'|'quarter'|'year', month?: 'YYYY-MM', year?: number, now?: Date }}
 * @returns {{ view, month?, year?,
 *   bars: [{ key, visits, unique }],      // key: '2026-10-07' | '2026-10' | '2026-Q4' | '2026'
 *   total: { visits, unique },            // for everything shown
 *   available: { months: ['2026-11', …], years: [2026, …] } }}  // newest first, from the first opening
 */
export const doorVisitStats = async ({ view, month, year, now = new Date() }) => { … }
```
- Första öppningen: `DoorUnlocks.findOneAsync({ memberid: { $exists: true } }, { sort: { timestamp: 1 } })`.
  Ingen → tomma staplar och `available` med bara innevarande månad och år.
- Varje vy räknar fram sitt intervall (`fromDay`, `toDay`, aldrig efter idag),
  hämtar `memberDays` en gång och delar upp i staplar:
  `visits` = antal medlem-dagar i stapeln, `unique` = antal olika `memberid` i
  stapeln. `total` på samma sätt över hela intervallet.
- Dag- och månadsnycklar i svensk tid med samma helpers som medlemsfliken:
  `ACTIVITY_TIME_ZONE`, `monthKey` (exporteras) och `lastMonths` i
  `common/server/doors/doorUnlocks.js`. Kvartal: `Q = ceil(månad / 3)`.

### Index

`ensureDoorUnlockIndexes()` i `common/server/doors/doorUnlocks.js` får även
`{ timestamp: 1 }`, namn `doorunlocks_timestamp` (dagens `/doorunlocks`-lista
sorterar också på tid).

### Metod (`admin/server/methods/doorunlocks.js`)

```js
async 'doorStats.visits'(options) {
  check(options, {
    view: Match.OneOf('day', 'month', 'quarter', 'year'),
    month: Match.Optional(Match.Where((m) => /^\d{4}-\d{2}$/.test(m))),
    year: Match.Optional(Match.Integer),
  });
  await requireRole(this.userId, DOMAIN_ROLES.doors);   // admin, board
  return doorVisitStats(options);
}
```

### Bort

- Metoden `doorUnlocks.visits`, `visitBuckets` och `recordedVisits` i
  `common/server/doors/doorUnlocks.js`.
- `admin/server/lock/visits.js` (`lockVisits`), som bara användes där.
- `visitBuckets`-testet i `admin/tests/doorUnlocks.tests.js`.
- `doorVisits` i `admin/imports/ui/doors/data.js`.

## Klient (admin)

- **`admin/imports/ui/periods.js`** (ny, utan Meteor): `monthLabel`,
  `monthName`, `daysOf` och kvartals-/årsetiketter. Flyttas hit från
  `members/MemberActivity.jsx`, som sedan importerar dem, så att båda vyerna
  skriver perioder likadant.
- **`admin/imports/ui/doors/DoorStats.jsx`** (skrivs om, ren komponent):
  rubrik "Door visits", valen ovan, sammanfattningen, förklaringen och
  diagrammet. Props: `stats`, `loading`, `error`, `query` (`{ view, month, year }`),
  `onQuery`, `count` (`visits`/`unique`), `onCount`. Klick på stapel →
  `onQuery` med nästa nivå.
- **`DoorStatsPage.jsx`** (container): håller `query` och `count`, hämtar
  `doorStats.visits` när `query` ändras (inte när `count` ändras: svaret har
  båda), behåller förra resultatet medan nästa hämtas.
- **`data.js`**: `doorVisitStats = (query) => Meteor.callAsync('doorStats.visits', query)`.
- **`DoorStats.stories.jsx`** (skrivs om): Per day, Per month (Visits och
  Unique members), Per quarter, Per year, inga besök, laddar, fel.
- **Menyn** (`admin/imports/ui/shell/menu.js`, Statistics): ny post
  `['/door', 'Door visits']` bredvid "Door unlocks". Routen `/door` finns redan
  (`admin/client/ui/door/index.js`).
- Full bredd (överblickssida), datum och tal enligt `imports/ui/dates.js`
  och admins konventioner i `admin/CLAUDE.md`.

## Seed

Demot har redan ett års öppningar med olika vanor (från förra grenen). E2e har
Majas öppningar (1, 3, 6, 200, 400 dagar sedan), Fridas (4 dagar), och en
gästöppning utan medlem. Inget behöver läggas till; testerna räknar med att
lås-testerna kan synka in fler öppningar.

## Test

**Admin mocha** (`admin/tests/doorVisitStats.tests.js`, prefixade testdata):
- två öppningar samma dag av samma medlem = 1 besök; två medlemmar samma dag = 2;
- en öppning 23:30 svensk tid sista dagen i månaden hamnar i den månaden;
- `unique` räknar en medlem en gång per stapel: tio besök i en månad = 1;
  `total.unique` över hela intervallet;
- öppningar utan `memberid` räknas inte;
- Per month visar inga månader efter `now`; Per quarter och Per year börjar
  vid första öppningen;
- `available` från första öppningen till `now`, nyast först.

Eftersom testdatabasen delas med andra tester sätts `now` och intervall så
att bara testets egna öppningar ingår, eller så jämförs skillnaden med och
utan testdata.

**Admin e2e** (`admin/e2e/door.spec.ts`, ersätter "charts the visits from the lock"):
- `/door` via menyn: rubriken, diagrammet för innevarande månad;
- byt till Per month → Unique members → diagrammet byter etikett;
- klick på en stapel i Per year går till Per month;
- kassören (`treasurer`) ser inte sidan (som för `/doorunlocks`).

**Storybook**: alla fall av `DoorStats`, och `MemberActivity` fortfarande
efter flytten av period-hjälparna.

**Manuellt** mot demot (`./scripts/demo.sh --no-seed`): rimliga tal och
staplar i alla vyer.

## Filer

Nya: `common/server/doors/visitStats.js`, `admin/imports/ui/periods.js`,
`admin/tests/doorVisitStats.tests.js`.

Ändras: `common/server/doors/doorUnlocks.js` (index, export av `monthKey`,
bort med `visitBuckets`/`recordedVisits`),
`admin/server/methods/doorunlocks.js`,
`admin/imports/ui/doors/{DoorStats,DoorStatsPage}.jsx`, `DoorStats.stories.jsx`, `data.js`,
`admin/imports/ui/members/MemberActivity.jsx` (importerar period-hjälparna),
`admin/imports/ui/shell/menu.js`, `admin/tests/{main,doorUnlocks.tests}.js`,
`admin/e2e/door.spec.ts`.

Tas bort: `admin/server/lock/visits.js`.



## Tillägg: snabbare migrering av den gamla låsloggen

`migrateUnlocksToDoorUnlocks` (Console → Migrate now) flyttar den gamla
låsloggen `unlocks` (35 436 öppningar, nov 2021 – maj 2026 i
produktionskopian) till `doorunlocks`. Den gjorde tre databasanrop per rad,
två utan index (`doorunlocks` på tid, `members` på e-post), och tog timmar.

Omskriven till `migrateUnlocks` i `common/server/doors/migrateUnlocks.js`:
medlemmarna läses en gång (e-post utan hänsyn till skiftläge), de öppningar
som redan finns läses en gång, raderna sätts in och tas bort 1 000 i taget.
Ett avbrott lämnar resten kvar i `unlocks`; en ny körning fortsätter. Samma
steg på en kopia av produktionsdatan: 3 sekunder, 30 893 kopplade till en
medlem, 4 519 som `extid`, 24 redan på plats.

Test: `admin/tests/migrateUnlocks.tests.js`.

## Tillägg: färger, genomsnitt och veckodagar

- **Färger:** diagrammen (besöksvyn och medlemsfliken Activity) har inga egna
  färger längre; Chart.js standardpalett (Colors-pluginen) används.
- **Genomsnitt per stapel**, i sammanfattningen för Per day och Per month:
  "…, on average 3 visits per day" och med Unique members "on average 170
  unique member visits per month". Per dag räknas över dagarna fram till idag;
  per månad utan den oavslutade månaden (om den inte är den enda). Servern
  returnerar `average: { visits, unique, over }` för alla vyer, men det visas
  inte per kvartal och år.
- **Besök per veckodag:** ett andra diagram för Per day och Per month, med
  genomsnittligt antal besök måndag–söndag över månadens respektive årets dagar
  fram till idag, dagar utan besök inräknade (`weekdays` från servern,
  `weekdayAverages` i `visitStats.js`). Valet Unique members påverkar det inte:
  en medlem ger högst ett besök per dag. Öppen fråga: ska Unique members i
  stället visa hur många olika medlemmar som kommit på respektive veckodag?
