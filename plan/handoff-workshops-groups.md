# Överlämning: migrering av workshops och groups (våg 1)

Skriven 2026-10-19 inför tömning av kontextfönstret. Läs `plan/migration.md`
(flöde per modul, beslut) och `admin/CLAUDE.md` (avsnitten *React pages* och
*E2e tests*) först: där står mönstret och reglerna.

## Läget i våg 1

| Modul | Status |
|---|---|
| liability, messagetemplate, storeitems, spaces | Klara, pushade |
| workshops + groups | **Pågår** (görs tillsammans, de hänger ihop) |
| certificates | Kvar (störst, ~1000 rader Blaze) |
| announcement | Kvar (skickar mejl, inventera dolt beteende) |

Master är pushad t.o.m. `7fb63e3`. Därefter lokalt:
- `7532890` committad: e2e-tester mot Blaze för workshops (10) och groups (13)
  + fixtures i `common/server/seed/scenarios/e2e.js`. 71 admin-e2e gröna.
- **Ocommittat** (se nedan). Kör `git status` för att se exakt.

## Arbetsregler (från användaren)

- Jobba direkt på master, ingen gren om inte användaren ber om det. Pusha
  bara när användaren säger till. Inga Co-Authored-By/Claude-rader i commits.
- Svara på svenska.
- En Spara per redigeringssida: allt som kan vänta på Spara ligger i
  formuläret före knappen, även kopplingar (utrymmen, föräldergrupp,
  relaterade verkstäder/grupper, ansvarig). Efter Spara bara det som gäller
  direkt: bild, medlemsåtgärder (lägg till, godkänn, avslå, ta bort).
- Välja flera kopplingar: `ChipSelect` (inte listor med kryssrutor). En sak
  ur få: native select (`TextField select` med `slotProps.select.native`),
  så att e2e `selectOption` fungerar. Personer: `MemberSelect` (söker på
  servern).
- Listor: `DataList` med `rowHref` och en `linkColumn`. MUI-importer per
  komponent (`@mui/material/Button`), aldrig från `'@mui/material'`.
  `createSvgIcon` från `@mui/material/utils` (Storybooks webpack kräver det).
- Pure-komponenter importerar inget som rör Meteor; stories bredvid
  (`Xxx.stories.jsx`). Containers använder `data.js`, `useEditor`,
  `useNavigate` (context, aldrig FlowRouter direkt).
- Ingen testning mot huvuddatabasen `umsme`; e2e kör mot `umsme-admin-e2e`
  (port 3200) och `umsme-e2e` (app, 3201), demo mot `umsme-demo` (31xx).

## Ocommittat arbete

### Server (klart, 425 servertester gröna)
- `common/lib/models.js`: `updatedAt` på group och workshop.
- `common/lib/modelOptions.js`: `fieldOptions(model, field)` → `[{value,label}]`.
- `common/server/groups/text.js`: `text`, `bilingual`, `setOrUnset`.
- `common/server/groups/groups.js`: `createGroup`, `updateGroup` (konflikt på
  `updatedAt`), `groupReferences`, `removeGroup`, `addGroupMember` (även
  godkänna), `rejectGroupRequest`, `removeGroupMember`. Reglerna från
  `deny`: linkedRole aldrig `admin` och inte med joinPolicy `open`;
  ansvarsgrupp kräver styrgrupp som förälder (≠ sig själv); styrgrupp med
  beroenden får inte byta typ; radering nekas vid bild eller referenser
  (workshop, barngrupper, utläggskonton inkl. approverGroupIds,
  medlemskap). Ansvarig blir aktiv medlem. `syncLinkedRoleById` körs efter
  varje ändring av grupp/medlemskap.
- `common/server/workshops/workshops.js`: `createWorkshop`, `updateWorkshop`,
  `workshopDetails` (aktiva i styrgruppen + certifikat), `removeWorkshop`
  (nekas vid bild eller certifikat). groupId måste vara styrgrupp.
- `common/server/members/search.js`: `searchMembers(query)` (alla ord i
  namn/email/mid, ej uteslutna, max 20), `memberNames(ids)`.
- `admin/server/methods/groups.js` (omskriven): `groups.create/update/
  references/remove/addMember/rejectRequest/removeMember`,
  `adminGroups.uploadImage/removeImage` (authz, check, audit, updatedAt).
  `adminGroups.syncLinkedRole` är borttagen (servern synkar själv).
- `admin/server/methods/workshops.js` (omskriven): `workshops.create/update/
  details/remove`, `adminWorkshops.uploadImage/removeImage`.
- `admin/server/methods/memberLookup.js`: `adminMembers.search`,
  `adminMembers.names`; registrerad i `methods/index.js`.
- `common/server/authz.js`: `groups`, `workshops`, `memberLookup`
  (alla admin, board).
- `admin/server/publications.js`: `admin.groups.list`, `admin.groups.group`,
  `admin.groups.memberships(groupId)`, `admin.workshops.list`,
  `admin.workshops.workshop`, `admin.groupsAndWorkshops.choices`
  (grupper: name/type/parentGroupId, workshops: name/kind/groupId, spaces).
- `admin/tests/groups.tests.js` (12 tester) + import i `tests/main.js`.

### Klient (påbörjad)
- `imports/ui/components/MemberSelect.jsx`: Autocomplete som söker via
  `search`-prop (debounce 250 ms, minst två tecken).
- `imports/ui/components/Section.jsx`: rubrik + not.
- `imports/ui/groups/choices.js`: `useChoices()` (groups, workshops,
  `spaceOptions`, `workshopOptions` med grupper, `groupName(id)`),
  `memberNames`, `searchMembers`, `uploadImage(method, id, file)`.
- `imports/ui/workshops/data.js`, `labels.js` (KINDS, STATUSES, `MISSING`
  = läsbara namn på saknade guideline-nycklar), `WorkshopList.jsx`,
  `WorkshopListPage.jsx`.

## Kvar att göra för workshops + groups

1. **WorkshopForm.jsx** (pure) + **WorkshopEditPage.jsx** (container, `useEditor`):
   - Rubrik `{Workshop|Area of interest}: namn sv / en` med chip
     Complete/Incomplete (`workshopCompleteness(sparat dokument, grupp,
     activeMemberCount)` från `common/lib/groupRules`). Alert "Missing per the
     guideline: …" (via `MISSING`), varning om namnet inte slutar på
     verkstad/verkstaden (inte för areaOfInterest).
   - Fält (etiketter som Blaze, testerna använder dem): Kind (select),
     Name (Swedish/English), Tag (Swedish/English), Description (Swedish,
     markdown)/(English, markdown), Rules (Swedish, markdown)/(English,
     markdown), Status (select, värden established/trial/forming/
     decommissioned), Slack channel, Guides URL, Steering group (select av
     typ steering; under fältet länk "Open <grupp>" och "(N active
     members)"), Primary space (select), Secondary spaces (ChipSelect).
     Spara. Add-sidan: submit-knappen heter "Add"; listans knapp "Add
     workshop or area of interest".
   - Efter Spara: bild (`ImageField`, `uploadWorkshopImage`), certifikat
     (läslista med länkar `/certificate/:id`, från `workshops.details`).
   - Radera (dialog) bara om ingen bild och inga certifikat; annars info-alert.
   - Efter egen spara/bild: hämta `workshopDetails` igen.
2. **groups/data.js, GroupList.jsx, GroupListPage.jsx, GroupForm.jsx,
   GroupEditPage.jsx**:
   - Lista: Name (link), Type (label från `fieldOptions('group','type')`),
     Members may ask to join (boolean), Join policy (label). rowHref
     `/group/:id`. Rubrik "Groups".
   - Formulär (före Spara): Name, Tag, Description, Rules (sv/en, etiketter
     som ovan), Type (select, alternativens etiketter från modellen t.ex.
     "Function group (funktionsgrupp)"), Parent group (select av styrgrupper
     ≠ sig själv; visas när type ≠ steering), Slack channel, Guides URL,
     Responsible (`MemberSelect`; namn via `memberNames`), Members may ask
     to join (checkbox), Join policy (select), Linked role (select av
     `Meteor.roles` utom admin; finns i klienten via null-publiceringen),
     spaces (bara type function: Primary select + Secondary ChipSelect),
     Related workshops (ChipSelect `workshopOptions`), Related groups
     (ChipSelect, ej sig själv). Submit på add-sidan: "Add group".
   - Efter Spara: bild; **Members**: lägg till (`MemberSelect` + knapp
     "Add member" → `groups.addMember`), väntande förfrågningar som
     `ListItem` med knapparna "Approve"/"Reject", aktiva medlemmar som
     `ListItem` med namnlänk `/member/:id`, chip "Responsible" och knapp
     "Remove" (dialog med knappen "Remove"); **Related** (läs):
     verkstaden gruppen styr, ansvarsgrupper, utläggskonton
     (`groups.references`).
   - Alert "…can not be deleted…" när referenser/bild finns; annars Delete.
   - Medlemsnamn: prenumerera `admin.groups.memberships`, slå upp namn med
     `memberNames` när id-listan ändras.
3. **Stories** för WorkshopList/Form, GroupList/Form.
4. **Byt routes** i `admin/client/ui/workshops/index.js` och
   `admin/client/ui/groups/index.js` till `reactRoute` (samma vägar:
   `/workshops`, `/workshops/add`, `/workshop/:_id`, `/groups`,
   `/groups/add`, `/group/:_id`). Ta bort Blaze-filerna där,
   `admin/client/ui/spaces/EntitySpaces.{html,js}`,
   `admin/imports/tabular/{workshops,groups}.js` (+ rader i
   `tabular/index.js`), `allow`/`deny` i
   `common/collections/{groups,workshops,groupMemberships}.js`. Behåll de
   breda publiceringarna `groups`, `workshops`, `groupMemberships` (utlägg
   och certifikat läser dem). Kolla om `/imports/tabular/members` behövs
   kvar av andra.
5. **E2e för kopplingar mot nya UI** (tillägg i `admin/e2e/groups.spec.ts`
   och `workshops.spec.ts`): sätta styrgrupp, utrymmen (primary +
   ChipSelect), föräldergrupp, relaterade verkstäder/grupper, byta
   ansvarig via MemberSelect, lägga till medlem. Spara → ladda om → kolla.
   Pills tas bort via `getByRole('img', { name: 'Remove X' })`.
6. Kör: `cd admin && npm test`, `npx playwright test` (två gånger),
   `npx storybook build -o <tmp>`; `cd ../app && npx playwright test`;
   `cd ../payment && npm test`. Återställ `admin/.meteor/versions`,
   `app/package-lock.json`, `app/.meteor/versions` om de ändrats av
   körningarna (brus). Skärmdumpa sidorna (Playwright-skript mot
   `npm run start:test:dev` på 3200, inloggning via localStorage
   `Meteor.loginToken = e2e-login-token-admin`).
7. Uppdatera tabellen i `plan/migration.md` (workshops, groups; EntitySpaces
   borta) och committa: först server+klient som en commit, med
   commit-meddelande i samma stil som tidigare.

## E2e-fixturer (redan i e2e-scenariot)

- Grupper: "Styrgrupp Keramik" (steering, ansvarig Gustav Gruppledare,
  medlemmar Gustav + Sara Styrgrupp, allowJoinRequests false),
  "Lokalgruppen" (function, medlem board-personan), "E2E requests group"
  (ansvarig Gustav; aktiva Gustav, Dagny Rabatt; väntande Bo Basmedlem,
  Kalle Kvartal), "E2E edit group", "E2E delete group".
- Verkstäder: "Keramikverkstaden" (styrd av Styrgrupp Keramik, primary
  space Keramikrummet), "Retrodatorer" (areaOfInterest, trial),
  "E2E edit verkstad", "E2E delete verkstad".
- Testerna förutsätter bl.a.: heading level 1 innehåller namnet; listan
  "Workshops & areas of interest"/"Groups"; kind/status/type som etiketter
  (regex-matchning); "can not be deleted"; "No image uploaded."; "2 active
  members"; knappar Approve/Reject/Remove inuti listitem för medlemmen.
