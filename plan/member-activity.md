# Plan: Fliken "Activity" på medlemssidan i admin

Gren: `last-seen` (från `master`, efter att "Byt användare" slagits ihop).

## Kontext

I admin vill vi se hur en medlem använder föreningen:

1. **När medlemmen senast använde appen.** Sparas inte i dag; användarkontot har
   bara `createdAt`.
2. **När medlemmen senast öppnade en dörr.**
3. **Hur ofta medlemmen öppnat en dörr det senaste året**, som ett stapeldiagram
   per månad.

Mer kan tillkomma med tiden (intyg, köp, bokningar …), så allt samlas i en
egen flik **Activity** på medlemssidan (`/member/:id?tab=activity`), uppbyggd av
en del per sorts aktivitet så att en ny del kan läggas till utan att resten
ändras.

Beslut:
- Fliken visas för **alla** medlemmar, även familjemedlemmar (de har egna
  konton och egna dörröppningar).
- **Ingen** kolumn "Senast i appen" i användarlistan (strukits av användaren).
- "Senast i appen" räknas bara i medlemsappen, aldrig i admin, och aldrig
  när admin har bytt till medlemmen ("Byt användare").

## Datakällor

| Aktivitet | Källa | Finns i dag? |
|---|---|---|
| Senast i appen | `lastSeenAt` på `Meteor.users` | Nej — Del 1 |
| Dörröppningar | `DoorUnlocks`: `timestamp`, `door`, `memberid` (optional), `extid`, `method` (`app`/`danalock`) | Ja |

- Öppningar i appen skrivs med `memberid` (`app/server/methods/doors.js:131`).
- Danalock-öppningar förs över av synken (`admin/server/methods/lock.js:24`)
  och får `memberid` när e-posten matchar en medlem, annars bara `extid`. De
  utan `memberid` kan inte knytas till någon och räknas inte.
- Medlem ↔ konto kopplas via verifierad e-post:
  `verifiedUserSelectorForMember` i `common/lib/memberMatch.js` (samma regel
  som `memberForUser` åt andra hållet).

## Del 1 — Spara "senast i appen" (app-servern)

**Fält:** `lastSeenAt` (Date), optional, i `models.users` i
`common/lib/models.js` (bara för formulär; inget Collection2-schema är kopplat
till `Meteor.users`).

**Helper** `common/server/users/lastSeen.js`:

```js
export const LAST_SEEN_RESOLUTION_MS = 15 * 60 * 1000;

/**
 * Record that the user is in the app: lastSeenAt = now, in one atomic update,
 * unless it was set less than 15 minutes ago, or the connection is logged in
 * with a switch-user token (an admin viewing the app as this user).
 *
 * @param {string} userId
 * @param {{ hashedToken?: string, now?: Date }} options  hashedToken: the
 *   connection's login token, hashed; a token marked `impersonatedBy` skips.
 */
export const touchLastSeen = async (userId, { hashedToken, now = new Date() } = {}) => {
  if (!userId) return 0;
  const cutoff = new Date(now.getTime() - LAST_SEEN_RESOLUTION_MS);
  return Meteor.users.updateAsync(
    {
      _id: userId,
      $or: [{ lastSeenAt: { $exists: false } }, { lastSeenAt: { $lt: cutoff } }],
      ...(hashedToken ? {
        'services.resume.loginTokens': {
          $not: { $elemMatch: { hashedToken, impersonatedBy: { $exists: true } } },
        },
      } : {}),
    },
    { $set: { lastSeenAt: now } },
  );
};
```

Att villkoret "inte ett byte" ligger i själva uppdateringen gör den testbar
från admins mocha-svit (appen har ingen) och gör att ingen extra läsning
behövs.

**Anrop** (båda i appen, aldrig i admin), båda inom try/catch så att ett fel
aldrig fäller inloggningen eller sidan (ett fel i `onLogin` fäller
inloggningen; se rättelsen i förra committen):

1. `Accounts.onLogin` i `app/server/accounts.js` — fångar varje appstart och
   återanslutning. `hashedToken`: vid `loginInfo.type === "resume"`
   `Accounts._hashLoginToken(loginInfo.methodArguments[0].resume)`; vid
   lösenords- och OAuth-inloggning ingen (en sådan kan aldrig vara ett byte).
2. `findInfoForUser` i `app/server/methods/memberInfo.js` — anropas var 5:e
   minut medan appen är öppen, så även en app som står öppen i dagar
   uppdateras. Skriv om från pilfunktion till metodsyntax
   (`async findInfoForUser() {…}`) för att få `this.connection`;
   `hashedToken = Accounts._getLoginToken(this.connection.id)`.

`findInfoForUser` står i `READ_ONLY_METHODS` (`app/server/impersonation/readOnly.js`).
Den förblir läsande under ett byte, eftersom uppdateringen inte matchar då —
skriv det i kommentaren vid listan.

## Del 2 — Hämta aktiviteten (server, common)

### Dörrar: `common/server/doors/doorUnlocks.js` (finns, med `doorUnlocksPage`, `visitBuckets`)

Ny funktion `memberDoorActivity(memberId, { now = new Date() } = {})`:

- **Tolv kalendermånader** inklusive innevarande, i tidszonen
  `Europe/Stockholm`. Månadsnycklarna (`"2025-12"` … `"2026-11"`) räknas fram i
  JS med `Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit' })`.
- Hämta med en aggregering på `DoorUnlocks.rawCollection()`:
  `$match: { memberid, timestamp: { $gte: now − 400 dagar } }` (en marginal så
  att hela den äldsta månaden kommer med), `$group` på
  `{ $dateToString: { format: "%Y-%m", date: "$timestamp", timezone: "Europe/Stockholm" } }`
  och `door`. Behåll bara de tolv nycklarna; fyll saknade månader med 0.
- Senaste öppning: `findOneAsync({ memberid }, { sort: { timestamp: -1 }, fields: { timestamp, door, method } })`
  — oavsett ålder, så att även en öppning för två år sedan visas.
- Returnerar:

```js
{
  lastUnlock: { timestamp, door, method } | null,
  total: 47,                                             // summan av de tolv månaderna
  months: [{ month: "2025-12", count: 3 }, …],           // tolv, äldst först
  byDoor: [{ door: "outerDoor", count: 40 }, …],         // de tolv månaderna, flest först
}
```

**Index:** `{ memberid: 1, timestamp: -1 }` på `doorunlocks`, namn
`doorunlocks_member_timestamp`. Ny `ensureDoorUnlockIndexes()` i samma fil,
anropad vid start i `admin/server/main.js` bredvid `ensureStorageIndexes()` och
`ensureAuditLogIndexes()`, och i `app/server/main.js` (appen skriver också
öppningar).

### App: `common/server/users/lastSeen.js`

`memberAppActivity(member)` → `{ hasAccount, lastSeenAt }`. Kontot via
`verifiedUserSelectorForMember(member)`; finns flera, ta det senaste
`lastSeenAt`. Ingen e-post → `{ hasAccount: false, lastSeenAt: null }`.

### Sammanställning: `common/server/members/activity.js`

```js
export const memberActivity = async (memberId, { now } = {}) => {
  const member = await Members.findOneAsync(memberId, { fields: { email: 1 } });
  if (!member) throw new Meteor.Error('not-found', 'No such member');
  return {
    app: await memberAppActivity(member),
    doors: await memberDoorActivity(memberId, { now }),
  };
};
```

En ny sorts aktivitet blir en ny nyckel här och en ny `TabPart` i fliken.

### Metod: `admin/server/methods/members.js`

```js
async 'members.activity'(memberId) {
  check(memberId, String);
  await requireRole(this.userId, roles);   // DOMAIN_ROLES.members: admin, board
  return memberActivity(memberId);
}
```

## Del 3 — Fliken "Activity" (admin)

**`admin/imports/ui/members/MemberView.jsx`:**
- `tabsFor`: lägg `'activity'` sist i båda listorna.
- `LABELS`: `activity: 'Activity'`.
- Fliken är ingen formulärflik (inte i `FORM_TABS`) och får ingen räknare.
- Ny prop `activity`, renderad i sin `Panel` som `messages`, `comments` och
  `certificates`.

**`admin/imports/ui/members/data.js`:** `memberActivity = (memberId) => Meteor.callAsync('members.activity', memberId)`.

**Container `admin/imports/ui/members/MemberActivitySection.jsx`** (som
`MessagesFor`): hämtar vid montering, håller `loading`/`error`, renderar den
rena komponenten. Skickas in från `MemberViewPage` i `MemberPages.jsx`:
`activity={<MemberActivitySection memberId={_id} />}`. Alla flikar hålls
monterade, så hämtningen sker när sidan öppnas; den är liten (ett
`findOne` + en aggregering på index).

**Ren komponent `admin/imports/ui/members/MemberActivity.jsx`** (inget från
Meteor, så Storybook visar den utan stubbar):

- `TabToolbar` med noten: "When the member last used the app and opened a door."
- `TabPart title="App"`:
  - "Last used the app: 2026-11-07 14:05" (`dateTime()` från `imports/ui/dates.js`)
  - "Never" om `lastSeenAt` saknas, med en grå rad: "Recorded since 2026-11 —
    earlier use is not known." (datumet då funktionen gick i drift, som en
    konstant i komponenten).
  - "Has no app account" om `hasAccount` är falskt.
- `TabPart title="Doors"`:
  - "Last opened: 2026-11-07 14:05, outerDoor, via the app" (`danalock` →
    "via Danalock"); "Never" om ingen öppning finns.
  - "47 openings in the last 12 months".
  - Stapeldiagram med `ChartCanvas` (`admin/imports/ui/components/ChartCanvas.jsx`),
    `height={220}`, config byggd med `useMemo` (krav i ChartCanvas). Etiketter
    som korta månadsnamn (`"dec"`, `"jan"` … via `Intl.DateTimeFormat('sv-SE', { month: 'short' })`),
    samma färger som `DoorStats.jsx`, `y.beginAtZero`, heltalssteg
    (`ticks.precision: 0`). `label="Door openings per month"` för skärmläsare.
  - Under diagrammet antal per dörr ("outerDoor 40 · upperFloor 7"), bara om
    fler än en dörr förekommer.
  - Inga öppningar senaste året → texten "No openings in the last 12 months."
    i stället för diagrammet.
- Bredd: full bredd (överblick med diagram), som `DoorStats`.

**Story `admin/imports/ui/members/MemberActivity.stories.jsx`:**
`Active` (öppningar varje månad, två dörrar), `Occasional` (några månader),
`NeverInApp` (öppnar dörren, aldrig i appen), `NoAccount`, `NoActivity`,
`Loading`, `Error`.

## Tillägg: familj och besök

Två val i delen Doors, efter att planen godkänts:

- **Medlemmen eller hela familjen.** Standard är medlemmen vi tittar på. Valet
  visas bara när medlemmen ingår i en familj: den betalande medlemmen och alla
  vars `infamily` pekar på den (`familyOf` i `common/server/members/activity.js`).
  Valet hämtar om (`members.activity(memberId, scope)`, `scope` är `member`
  eller `family`). Delen App är alltid medlemmens egen. I familjevyn står vems
  den senaste öppningen var ("by Frida Familj").
- **Öppningar eller besök.** Ett besök är en dag (svensk tid) då en person
  öppnat någon dörr: högst ett per person och dag, så två familjemedlemmar
  samma dag är två besök. `memberDoorActivity` räknar båda i samma aggregering
  (grupperat på person, dag och dörr) och returnerar
  `months: [{ month, openings, visits }]` och `total: { openings, visits }`.
  Valet görs i klienten utan ny hämtning. Antal per dörr är alltid öppningar.

- **En månad per dag.** Menyn Period väljer "Last 12 months" (staplar per
  månad) eller en av de tolv månaderna (staplar per dag, 1–31). Man kan också
  klicka på en månads stapel. `memberDoorActivity` returnerar
  `days: [{ day, openings, visits }]` för dagar med öppningar under de tolv
  månaderna (högst 365 rader), så att byta månad inte kräver ny hämtning.
  Antal per dörr visas bara i årsvyn.

## Seed

- **Personor:** valfritt fält `lastSeen` (dagförskjutning) i
  `common/server/seed/scenarios/personas.js`. `makePersonas`
  (`scenarios/build.js`) sätter `lastSeenAt` med `Meteor.users.updateAsync`
  när det finns. Ge några personor värden: `member` (0, idag), `board` (−3),
  `family` (−40); låt `newcomer` sakna (aldrig).
- **Demo:** demo-scenariots bulkanvändare (`demo.js:143-145`) får slumpade
  `lastSeenAt` inom 120 dagar, en del utan värde.
- **Dörröppningar i demot** (`demo.js:428-434`): i dag 400 öppningar inom
  *senaste månaden*. Sprid dem över **ett år** med olika täthet per medlem
  (några ofta, de flesta sällan, ett par bara under en period), så att
  diagrammet blir intressant. Kontrollera att dörrstatistiken (`DoorStats`,
  senaste sex månaderna) fortfarande ser rimlig ut.
- **E2e:** personan `member` (Maja) har redan tre öppningar (1, 3, 6 dagar
  sedan, `e2e.js:198-201`) och en gästöppning utan `memberid`. Räcker för
  testerna; lägg till en öppning ~200 dagar bakåt så att diagrammet har en
  äldre månad, och en äldre än ett år som inte ska räknas.

## Test

**Admin mocha** (`admin/tests/memberActivity.tests.js`, mönster som
`doorUnlocks.tests.js`, prefixade testdata som städas i `after`):
- tolv månader, äldst först, tomma månader med 0, även när `now` ligger i
  början av en månad;
- öppningar äldre än tolv månader räknas inte i `total`/`months`, men
  `lastUnlock` visar dem om de är de senaste;
- öppningar utan `memberid` räknas inte;
- `byDoor` summerar per dörr;
- en öppning kl. 23:30 svensk tid sista dagen i en månad hamnar i den
  månaden (tidszonen);
- `memberAppActivity`: konto med `lastSeenAt`, utan, och medlem utan konto.

**`touchLastSeen`** (samma testfil, eftersom den ligger i common), med en
testanvändare som har en vanlig token och en märkt `impersonatedBy`:
- skriver första gången; skriver inte inom 15 minuter; skriver efter;
- skriver inte med den märkta token som `hashedToken`; skriver med den vanliga.

**Admin e2e** (`admin/e2e/members.spec.ts`, ny `describe('Activity')`):
- öppna Majas sida (`member`) med `openTab(page, /activity/i)`: senaste
  öppning, "3 openings" + den äldre (4), "Last used the app" med datum;
- en persona utan värden: "Never".
- `members.activity` vägras för en roll utan medlemsbehörighet (t.ex. `storage`).

**App e2e:** hela appens svit körs (den rör `onLogin` och `findInfoForUser`),
inklusive `impersonation.spec.ts`.

**Storybook** (admin 6007): alla fall av `MemberActivity`.

**Manuellt** mot demo (`./scripts/demo.sh`, admin 3100, app 3101): öppna en
medlem med många öppningar → fliken Activity, diagrammet syns; logga in i
appen som en persona → "Last used the app" blir nu; byt användare som admin
till samma persona → värdet ändras inte.

## Filer

Nya:
- `common/server/users/lastSeen.js`
- `common/server/members/activity.js`
- `admin/imports/ui/members/{MemberActivity,MemberActivitySection}.jsx`, `MemberActivity.stories.jsx`
- `admin/tests/memberActivity.tests.js`

Ändras:
- `common/lib/models.js` (`users.lastSeenAt`)
- `common/server/doors/doorUnlocks.js` (`memberDoorActivity`, index)
- `app/server/accounts.js`, `app/server/methods/memberInfo.js`, `app/server/main.js`,
  `app/server/impersonation/readOnly.js` (kommentar)
- `admin/server/methods/members.js`, `admin/server/main.js`
- `admin/imports/ui/members/{MemberView,MemberPages}.jsx`, `MemberView.stories.jsx`, `data.js`
- `common/server/seed/scenarios/{personas,build,demo,e2e}.js`
- `admin/e2e/members.spec.ts`
- `plan/member-activity.md`

## Senare (inte nu)

- Fler delar i fliken: intyg, köp, grupper, bokningar.
- Kolumner i medlemslistan ("senast i dörren", "senast i appen") för att
  sortera fram inaktiva medlemmar.
- "Senast i appen" i sökresultaten på `/impersonate`.
