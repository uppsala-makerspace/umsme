# Plan: modernisera admin, modul för modul till React

Admin har byggts under lång tid och migrerats genom flera Meteor-versioner.
Grunden håller, men flera mönster från Meteors tidiga år skulle vi inte välja
idag. Planen tar admin hela vägen till ett React-gränssnitt, **en modul i
taget**: varje modul får metoder, smala publiceringar och ett nytt
React-gränssnitt i ett svep, och sedan går vi vidare till nästa.

Grundprincip: **befintlig funktionalitet rörs inte förrän det är dess tur.**
Nytt läggs bredvid det gamla. Gamla sidor, publiceringar och `allow`-regler
tas bort först när ingenting längre använder dem.

Relaterat: `plan/admin-role-overhaul.md` (differentierade roller, logg över
vem som gjort vad) och `docs/monolithic-design-revisited.md` §7 (en
auktoriseringsmodul, domäner som äger sina samlingar). Att alla skrivningar
går via metoder är förutsättningen för båda.

## Nuläge

- Ungefär 80 direkta skrivningar (`Members.update`, `Payments.remove` …) från
  ett 40-tal klientfiler, plus 11 AutoForm-formulär med `type="update"`. De
  släpps igenom av `common/collections/allow.js` (admin, board och treasurer
  får skriva vilket fält som helst) och lappas med `deny`-regler i ett dussin
  samlingar.
- Affärslogik i event-handlers, t.ex. att radera en medlem i
  `client/ui/members/MemberView.js`: loopar av `Memberships.remove` och
  `Messages.remove` från klienten, inte atomärt och inte testbart.
- Roll-kontrollen i metoderna är kopierad för hand i varje fil; `check()`
  används nästan bara i `storageV2.js` och `expenseBudgets.js`.
- `server/publications.js` publicerar i regel hela samlingar utan filter eller
  projektion. `subscribe('members')` förekommer 29 gånger; statistik och
  intäkter räknas på klienten ur hela `Payments` och `Memberships`.
- UI: Blaze, Bootstrap 3, jQuery, AutoForm, aldeed:tabular, moment, `Session`,
  FlowRouter (63 routes, 248 anrop till `FlowRouter.*` i Blaze-koden).

## Gjort: Meteor 3.5 (2026-10-19)

Admin, app och payment kör Meteor 3.5.3 på Node 24, även i drift (9a0c3ff,
ac3dd97). MongoDB 6 på servern, så reaktiviteten går via change streams.
`aldeed:collection2` är låst till `@=4.1.5` i admin eftersom 4.2 tar bort
`aldeed:simple-schema`, som `common/lib/schemas.js` importerar.

## Vägval

**FlowRouter och Blaze-layouten ligger kvar till sist.** Att byta till React
Router först skulle röra alla 63 routes och de 248 FlowRouter-anropen i
fungerande sidor. I stället monteras varje migrerad React-sida inuti den
befintliga `AppBody`-layouten. När sista Blaze-modulen är borta byts layout
och router i ett litet, avgränsat steg.

**Metoder, inte REST, för admins egna skrivningar.** DDP-anslutningen är redan
inloggad, metoder ger `this.userId`, `Meteor.Error`, `DDPRateLimiter` och
latency compensation. Realtiden påverkas inte: den kommer från
publiceringarna, och en metods skrivning slår igenom till alla prenumeranter
som idag. REST används utåt (webbplatsen, AI-agenten, filer), ovanpå samma
domänfunktioner.

**Smala publiceringar är fortfarande reaktiva.** Det som visas uppdateras i
realtid som nu; det som inte visas skickas inte. Bara aggregat som statistik
och intäkter flyttas till metoder som returnerar färdiga serier.

**Samtidiga redigeringar.** Metoder som uppdaterar ett dokument tar emot den
`updatedAt` (eller motsvarande) som klienten såg och vägrar om dokumentet
ändrats sedan dess. Gränssnittet visar då den aktuella versionen och låter
användaren göra om ändringen. Det är ett skydd som direkta klientskrivningar
inte kan ge.

## Före steg 0 — Testdata och e2e i admin

Se `plan/test-strategy.md`: gemensamma byggstenar för testdata, scenarierna
`e2e` och `demo`, Playwright i admin och e2e-tester för piloten mot
Blaze-versionen. Görs innan något i admin ändras.

## Steg 0 — Grunden (en gång, före första modulen)

**Klart 2026-10-19** tillsammans med piloten `liability` (8e6bdff–f90b90c),
utom en publicering av `AuditLog`, som kommer när den behövs. Storybook i
admin (port 6007) med stories för liabilitys två rena komponenter.

**Server**

- `common/server/authz.js`: `requireRole(userId, roles)` och på sikt rena
  funktioner av formen "får den här användaren göra den här handlingen på den
  här resursen". Nya metoder använder den; gamla metoder lämnas tills deras
  modul migreras.
- `AuditLog`-samlingen med TTL-index (ett år) och en hjälpfunktion som
  domänfunktionerna anropar vid varje skrivning, plus en publicering för
  admin och board.
- Konvention för metoder: namn `domän.handling` (som `storageV2`), `check()`
  på alla argument, behörighet först, domänfunktion i
  `common/server/<domän>/` som gör jobbet, skriver till `AuditLog` och har
  servertester.
- Konvention för publiceringar: namn `admin.<domän>.<vy>`, behörighet först,
  alltid filter och fältprojektion.

**Klient**

- React 19 och `react-meteor-data` i admin (samma versioner som appen).
- **MUI** som komponentbibliotek (beslut 2026-10-19, se nedan), med temat i
  `admin/imports/ui/theme.js`. Importera varje komponent från sin egen sökväg
  (`import Button from '@mui/material/Button'`), aldrig från `'@mui/material'`:
  Meteors bundler gör ingen tree shaking, och samlingsimporten drar in hela
  MUI. Temats `htmlFontSize: 10` kompenserar för Bootstrap 3:s
  `html { font-size: 10px }` och tas bort med Bootstrap. MUI:s stilar är
  avgränsade, så Bootstrap-sidorna påverkas inte.
- Blaze-mallen `ReactPage` (`admin/client/react/`) som monterar en
  React-komponent och avmonterar den när mallen försvinner. En migrerad route:

  ```js
  reactRoute('/liability/:_id', 'liabilityview', LiabilityEditPage);
  ```

  `reactRoute` lägger också på MUI-temat.

- Navigeringsadapter `useNavigate()` i `admin/imports/ui/navigation.js` som
  anropar `FlowRouter.go` nu och React Router senare. React-sidor importerar
  aldrig FlowRouter direkt; route-parametrar kommer som props till
  containern. Vanliga `<a href>` fungerar som de är.
- Sidor i `admin/imports/ui/<modul>/`: en container (`XxxPage.jsx`) som
  hämtar data och anropar metoder, och en ren komponent (`Xxx.jsx`) som bara
  ritar. Data och metodanrop i `data.js` (se `liability/data.js`).
- Storybook i admin (`npm run storybook`, port 6007), med MUI-temat och
  Bootstrap 3 som i admin. Varje ren komponent har stories bredvid sig.
- **Alla listor** använder MUI X DataGrid via den tunna `DataList`
  (`admin/imports/ui/components/DataList.jsx`): sökruta, sortering på varje
  kolumn, rader per sida och paginering, likadant överallt. Kolumnerna är
  listans egna, med hjälpare för det som återkommer (`columns.jsx`:
  `dateColumn`, `linkColumn`; fler när de behövs). Små listor sorterar och
  söker i webbläsaren; stora listor (medlemmar, betalningar) får paginering,
  sortering och sökning på servern, byggt en gång med den första stora
  listan, och ersätter `aldeed:tabular`.
- E2e-testerna för varje lista provar sökning och sortering
  (`admin/e2e/lists.ts`), så att de inte kan försvinna obemärkt.

## Per modul

Samma flöde för varje modul, i en eller ett par PR:er:

0. **E2e-tester mot Blaze-versionen** för modulens huvudflöden, med
   selektorer mot det användaren ser (`getByRole`, `getByLabel`, text), och
   det demo-innehåll modulen behöver. Testerna ska sedan gå igenom oförändrade
   mot React-versionen.
1. **Server: domänfunktioner och metoder.** Flytta logiken från modulens
   event-handlers och AutoForm-hooks till domänfunktioner med servertester.
   Inventera först vad Blaze-koden gör i bakgrunden (hooks som skickar mejl,
   kaskader, beräkningar) så att inget tappas.
2. **Server: smala publiceringar.** En per vy, med filter och projektion.
   Aggregat blir metoder.
3. **Klient: React-sidor** enligt mönstret ovan, med stories.
4. **Byt route** till `ReactPage` och ta bort modulens Blaze-filer, tabular-
   definitioner och AutoForm-scheman som bara den använde.
5. **Städa det delade** när modulen var den sista användaren:
   - `allow` för en samling tas bort när ingen Blaze-sida längre skriver till
     den, liksom `deny`-regler som bara fanns för att lappa `allow`.
   - En bred publicering tas bort när ingen sida längre prenumererar på den.
   - Gamla metoder tas bort när ingen anropar dem.

Modulen är klar när den inte har några Blaze-filer kvar, alla dess skrivningar
går via metoder med servertester och dess sidor bara prenumererar på smala
publiceringar.

## Modulordning

Storlek är rader `.js`/`.html` i `admin/client/ui/<modul>/`. "Skriver" är
samlingar modulen skriver direkt till från klienten.

### Våg 1 — Fristående moduler med egen samling

Prövar mönstret på moduler som bara skriver till sin egen samling.

| Modul | Storlek | Skriver | Kommentar |
|---|---|---|---|
| liability | 125 | LiabilityDocuments | **Pilot.** Lista, visa, formulär; tillsammans med steg 0 |
| messagetemplate | 496 | MessageTemplates | Mallar används av message/pending/mail; de läser via egna publiceringar |
| storeitems | 309 | StoreItems | Läser payments för försäljning |
| spaces | 431 | Spaces | Bilduppladdning via befintlig `/api/spaces` |
| workshops | 360 | Workshops | |
| groups | 702 | Groups, GroupMemberships | |
| certificates | 1014 | Certificates, Attestations | Delvis redan metoder |
| announcement | 296 | Announcements, Mails | Skickar mejl; inventera hooks |

### Våg 2 — Läsande vyer

Inga skrivningar, men de håller de breda publiceringarna vid liv. När de är
klara kan `members`, `memberships` och `payments` börja ersättas.

| Modul | Storlek | Kommentar |
|---|---|---|
| excluded, reminders | 39, 64 | Små listor över medlemmar |
| history | 178 | |
| lock, door, check | 230, 185, 204 | Lås-API via befintliga metoder |
| stats | 569 | Serier till metod; `imports/stats/membershipSeries.js` finns och är testad |
| revenue | 531 | Serier till metod; `imports/stats/revenueSeries.js` finns och är testad |
| accounting | 164 | |

### Våg 3 — Ekonomi och lagring

| Modul | Storlek | Skriver | Kommentar |
|---|---|---|---|
| storage | 997 | — | Redan metoder och smala publiceringar; bara gränssnittet |
| expenses | 1371 | ExpenseAccounts | Mest metoder redan |
| membership | 258 | Memberships, Payments | Pengar; optimistic concurrency här först |
| bank | 474 | Members, Memberships, Payments | Bankmatchning; delar logik med membership |

### Våg 4 — Medlemskärnan

Sist, eftersom de delar `Members` och har mest gömd logik. När hela vågen är
klar kan `allow` för `Members`, `Messages` och `Comments` tas bort.

| Modul | Storlek | Skriver |
|---|---|---|
| comment | 106 | Comments |
| family | 183 | Members |
| pending | 108 | Members, Messages |
| message | 265 | Members, Messages |
| mail | 547 | Announcements, Comments, Mails |
| members | 454 | Members, Memberships, Messages, Payments |
| users | 265 | Comments, Meteor.users |
| admin | 369 | Attestations, Members, Payments |

## Sista steget — Layout, router och städning

När ingen Blaze-modul finns kvar:

1. `AppBody` (topbar, meny, inloggning) i React. accounts-ui ersätts med ett
   eget inloggningsformulär.
2. FlowRouter ersätts med React Router i en routetabell; bara
   navigeringsadaptern och routetabellen ändras.
3. `htmlFontSize: 10` tas bort ur MUI-temat.
4. Paket bort: `blaze-html-templates`, `blaze-hot`, `aldeed:autoform`,
   `communitypackages:autoform-bootstrap3`, `aldeed:tabular`,
   `ostrio:flow-router-extra`, `accounts-ui`, `jquery`, `session`, Bootstrap,
   DataTables, och `common/collections/allow.js`.
5. Uppdatera `admin/CLAUDE.md` och `docs/architecture.md`.

## Uppföljning

Modulstatus hålls här. Uppdatera när en modul är klar.

| Modul | Server | Publiceringar | React | Blaze borta |
|---|---|---|---|---|
| (steg 0) | ✓ | ✓ | ✓ | – |
| liability | ✓ | ✓ | ✓ (MUI) | ✓ |
| messagetemplate | ✓ | ✓ | ✓ | ✓ (dokumentationen är en Blaze-brygga till React-versionen tills mail och announcement migreras) |
| storeitems | ✓ | ✓ | ✓ | ✓ |
| spaces | ✓ | ✓ | ✓ | ✓ (EntitySpaces, valet av utrymmen på verkstäder och grupper, är Blaze tills de modulerna migreras) |

## Beslut (2026-10-19)

- **Behörighet:** `common/server/authz.js` från början, delad av alla tre
  apparna. Appens befintliga behörighetsfunktioner flyttas dit efterhand.
- **Ändringslogg:** en gemensam samling `AuditLog`, skriven från piloten och
  framåt av varje migrerad modul. Varje post: `userId`, `action`, `domain`,
  `docId`, ändrade fält med före- och eftervärden, `at`. Gallras efter ett år
  (TTL-index på `at`). Läses av admin och board. `StorageEvents` ligger kvar
  som lagringens domänhändelser.
- **Komponentbibliotek: MUI** (2026-10-19). Piloten byggdes i två versioner,
  Tailwind med egna komponenter och MUI, mot samma e2e-tester. MUI gav 183
  nya rader mot 312 (sex egna komponenter behövdes inte) och färdig
  tillgänglighet (fokus i dialoger), till priset av +112 KB gzip JavaScript.
  Skillnaden växer i de tunga modulerna: tabeller med paginering på servern,
  autocomplete, datumväljare. Admin och appen får olika formspråk.
- **Listor: DataGrid för alla** (2026-10-19), via en tunn gemensam
  komponent. Liabilitys första React-lista tappade sökning, sortering och
  paginering, som Blaze-sidans DataTables hade, utan att det sades; nu har
  varje lista dem. DataGrid kostar +204 KB gzip JavaScript utöver MUI.
- **Storybook:** egen instans i admin, port 6007, med MUI-temat.
- **Delade komponenter:** inga mellan admin (MUI) och appen (Tailwind).
- **Cron-jobb, migreringar och publika API:er** ligger kvar i admin.
  Domänfunktionerna läggs ändå i `common/server/` så att de kan flyttas senare.
