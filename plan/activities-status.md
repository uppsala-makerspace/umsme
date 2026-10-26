# Aktiviteter — status och öppna frågor (2026-10-26)

Fortsättningspunkt för arbetet med aktiviteter. Planen i sin helhet:
`plan/activities.md` (beslut, datamodell, behörighet, etapper).

## Läge

- All kod ligger på grenen **`activities`** (48 commits från `master`), inte
  pushad, inte ihopslagen med `master`.
- Etapp 1, 2 och 3 är byggda, plus några tillägg (nedan). Etapp 4
  (kalendersynk) och 5 (mål-certifikat) återstår.
- Tester gröna vid senaste körningen: admin `npm test` (551), admin e2e (221),
  app e2e (46). Storybook bygger i båda.

## Vad som finns

**Modell och regler** (`common/`)
- Samlingar: `activities`, `events`, `activityCategories`,
  `eventRegistrations`, `activityInterests`.
- Rena regler i `common/lib/activityRules.js`:
  - `resolveEvent`: ett event ärver från sin aktivitet.
  - Behörighet: `mayEditActivity`, `mayBookEvent`, `mayBookEventOf`.
  - Platser, kö och status.
  - Incheckningsfönster: `checkInWindow`, `DEFAULT_CHECK_IN`.
- Formulärvärden, delade av admin och app: `common/lib/activityValues.js`.
  Datum och tid: `common/lib/days.js`.
- Domänfunktioner i `common/server/activities/`:
  - Aktiviteter, events och kategorier.
  - `registrations.js`: anmälan, kö, ta plats, avanmälan, inställt,
    incheckning, närvaro och de schemalagda jobben.
  - `notify.js` och `defaultTemplates.js`: åtta malltyper som skickas som push
    och mail.
  - `linking.js`: aktivitet från ett event, och event med samma namn.
  - `calendarImport.js`: import från Google-kalendern.

**Behörighet** (tabellen i `plan/activities.md` är uppdaterad)
- **Aktivitet:**
  - Gruppens ansvarige och styrgruppens medlemmar.
  - För en aktivitetsgrupp även medlemmarna i styrgruppen ovanför.
  - Board/admin alltid.
- **Event av en aktivitet:** alla aktiva medlemmar i gruppen, eller bara de som
  får ändra aktiviteten (inställningen `eventBookers`).
- **Fristående event:** bara de som får skapa aktiviteter i gruppen.
- **Byte av ägande grupp:** bara mellan grupper där man får skapa aktiviteter.
- **Anmälan:** kräver betalt medlemskap (styrelsens godkännande behövs
  inte), och certifikatet om ett krävs. Appen säger varför man inte kan
  anmäla sig.

**Admin**
- Menysektionen Activities: Activities, Events, Categories.
- Formulären i kort med färgade rubrikband: blått för aktivitet, grönt för
  event.
- Eventets flikar: Details, Participants, Image.
- Värdar väljs ur gruppen eller fritt via sökning.
- Import från kalendern på `/events/import`.
- "Make an activity of it" på ett fristående event.
- "Find events by name" på aktivitetens flik Events.

**Appen**
- Kalender i bottennavigeringen (`/activities`).
  - Flikarna Tillfällen och Aktiviteter.
  - Väljaren Kommande, Tidigare och Mina anmälningar, tio tillfällen åt gången.
- Aktiviteter har vanliga tider (börjar/slutar, utan dag); ett nytt tillfälle
  får dem ifyllda och behöver bara sin dag, och längden räknas ur dem.
- Aktivitets- och tillfällessidor i färgade kort.
- Anmälningsruta: anmälan, kö, ta plats, incheckning och avanmälan, med
  förklaring när man inte får anmäla sig.
- Deltagare och närvaro för värdar.
- Intresseanmälan på aktiviteter.
- Formulär i kort, med bild som väljs och krymps i telefonen.
- Datum och tid skrivs alltid ÅÅÅÅ-MM-DD och TT:MM, oavsett språk.
- Verkstads- och intresseområdessidan har avsnittet **Kalender**: kommande
  tillfällen och utfällbara aktiviteter.
- Gruppsidan visar gruppens aktiviteter, med "+ Ny aktivitet" för den som får
  skapa aktiviteter.

**Hemsidans JSON** (`/api/public`, `docs/public-api.md`)
- Publicerade aktiviteter med kommande tillfällen.
- Fristående publicerade tillfällen.
- Kategorier.

## Inställningar som behövs i produktion

- `activityCron.enabled: true` i admin: påminnelser om incheckning och
  deadline-jobbet. Det är avstängt utan inställningen.
- `private.googleCalendar: { apiKey, calendarId }` i admin, för importen. I
  `settings_demo.json` är den `"fake"`.
- `public.appUrl` i admin och appen, för länkar i mail. Utan den saknas länken.
- Standardmallarna läggs in vid start av admin och appen, i den databas de är
  kopplade till, om typerna saknas.

## Besvarade frågor (2026-10-26)

- **Minsta antal deltagare:** bekräftat för gott när det nåtts, som byggt.
- **Kön:** har ingen förtur. En ledig plats går till den som först tar den,
  ny anmälan eller köande; kön får besked när platser blir lediga. Ändrat.
  (Viktigast är att kursledarna får deltagare; en ordnad kö där var och en
  får en chans i tur och ordning är för komplicerat för en första version.)
- **Borttagning:** ett tillfälle med anmälda kan bara ställas in, som byggt.
- **Ej godkänd medlem:** betalt medlemskap räcker för att anmäla sig.
  Ändrat. Intresseanmälan och grupperna kräver fortfarande godkänt
  medlemskap.

## Öppna frågor

1. **`public.appUrl`** i produktion: `https://app.uppsalamakerspace.se`?
2. **Tidszon:** incheckningsfönstret (t.ex. 03:00–15:00 dagen före) räknas i
   serverns tidszon. Går produktionsservern på svensk tid?
7. **Kostnad:** ska varje aktivitet bli en artikel i webbshoppen, eller ska
   anmälan själv vara ett köp?
8. **Hemsidan:** ska platser kvar och anmälningsläge med i JSON:en?
9. **Gruppsidan:** behåller sin aktivitetslista. Ska den också få
   Kalender-avsnittet som verkstadssidan?
10. **Verkstad utan aktiviteter och tillfällen:** Kalender-avsnittet döljs
    helt. Ska rubriken synas även då?
11. **Google-kalendern i appen:** ligger kvar som "Google-kalender" i
    hamburgermenyn. När ska den bort?
12. **Incheckning från etapp 3:** ska det gå en andra påminnelse strax innan
    incheckningen stänger?

## Kända saker att veta

- **Inloggningsfel på andra sidor:** appens befintliga sidor (verkstäder,
  grupper med flera) skickar till startsidan om de öppnas via direktlänk
  medan inloggningen återupptas. Aktivitetssidorna väntar
  (`activities/components/useSignedIn.js`); de andra är inte ändrade.
- **Tillfälliga testfel:** fulla e2e-körningar faller ibland i sin helhet
  innan servern hunnit starta. En omkörning går igenom. Användartestet i
  admin (`users.spec.ts`) är också instabilt i full körning men passerar
  ensamt.
- **Tailwind-filen:** appens `client/tailwind.output.css` är incheckad och
  byggs om med `npm run build:css` när nya klasser tillkommer.
- **Databaser:** tester körs aldrig mot `umsme` eller `umsme-demo`. E2e
  använder `umsme-admin-e2e` och `umsme-e2e`; enhetstesterna en egen tillfällig
  databas.

## Nästa steg att välja mellan

- Svara på frågorna ovan, och slå sedan ihop `activities` med `master` och pusha.
- **Etapp 4:** spegla tillfällen till Google-kalendern (`googleEventId` finns
  redan, och importen åt andra hållet är byggd).
- **Etapp 5:** mål-certifikat som delas ut vid närvaro.
