# Aktiviteter — status och öppna frågor (2026-10-27)

Fortsättningspunkt för arbetet med aktiviteter. Planen i sin helhet:
`plan/activities.md` (beslut, datamodell, behörighet, etapper).

## Läge

- All kod ligger på grenen **`activities`** (omkring 78 commits från
  `master`), inte pushad, inte ihopslagen med `master`.
- Alla fem etapperna är byggda, plus några tillägg (nedan).
- Tester gröna vid senaste körningen: admin `npm test` (576, även med
  `TZ=UTC`), admin e2e (224), app e2e (54). Storybook bygger i båda.

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
  - `notify.js` och `defaultTemplates.js`: tretton malltyper som skickas som
    push och mail.
  - Påminnelser inför tillfället (`sendEventReminders`): 24 timmar och två
    timmar före, till dem med plats och till värdarna (egna mallar, med antal
    anmälda, tak och kö). Där tillfället har incheckning ersätter
    incheckningsmeddelandet deltagarnas påminnelse dagen före. Ett tillfälle som
    flyttas påminns på nytt för den nya tiden, även om incheckningen.
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
- Kalender i bottennavigeringen (`/calendar`): tillfällena, med väljaren
  Kommande, Tidigare och Mina anmälningar, tio tillfällen åt gången.
- Aktiviteterna på egen sida (`/activities`), ett kort på startsidan.
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

**Mål-certifikat (etapp 5)**
- En aktivitet (eller ett tillfälle) anger `targetCertificateId`, det
  certifikat den ger. Det finns inget val av hur.
- Närvaro och intyg är skilda: att markera närvaro ger inget intyg. En värd
  som får certifiera (`canCertify`, nu i `common/server/certificates/`)
  trycker "Certifiera eller kommentera" vid en närvarande och kommer till
  deltagarens förfrågan i den vanliga certifieringen (`/certifier-requests/:id`),
  där hen godkänner med publik eller privat kommentar och sedan kommer
  tillbaka till tillfället (`?returnTo=`). Finns ingen förfrågan skapas en i
  deltagarens namn (`certificateRequestFor`), om förkunskaperna finns. Raden
  visar sedan "Certifikat: X" när det är godkänt och "Kommentar: X" när en
  certifierare kommenterat och nekat; båda länkar till samma sida. Deltagaren
  kan också begära certifikatet som vanligt.
- "Neka" på förfrågningssidan behåller nu förfrågan, inte godkänd, med
  kommentaren (som krävs), i stället för att ta bort den: deltagaren läser
  den och kan begära igen. Det gäller hela certifieringen.
- Värdar sätts fritt; tillfällets sida varnar om ingen av dem får certifiera.
- Tillfällets och aktivitetens uppgifter visar "Ger certifikatet: X". Värdarna
  ser per deltagare "Har intyget" eller "Har begärt intyget" (länk till
  begäran för den som får certifiera).

**Lägga till närvarande**
- På tillfällen med frivillig eller krävd anmälan kan den som för närvaron
  (värdarna, de som får ändra tillfället, board/admin) lägga till en medlem
  som kom, från start tills närvaron stängs (`addAttendee`). Medlemmen blir
  närvarande direkt; varken medlemskap eller krav på intyg kontrolleras, och
  platserna får överskridas.
- Sökningen är på medlemsnummer; board och admin söker också på namn
  (`events.findMembers`).
- De som får ändra tillfället för nu närvaron, inte bara värdarna.

## Inställningar som behövs i produktion

- Servicekontot (`credentials` eller `keyFile`, som för `googleDrive`) och
  `location` i admins `private.googleCalendar`, för att
  spegla tillfällen till kalendern (jobbet var femte minut, kräver också
  `activityCron.enabled`). Kalendern delas med servicekontots e-post med
  "Göra ändringar i händelser".

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
- **Kostnad:** ingen betalning nu; kostnaden kan beskrivas i texten.
- **Hemsidan:** JSON:en har nu anmälan (`registration`), platser (`seats`, `seatsLeft`) och, när aktiviteten eller tillfället valt det i Synlighet, värdarnas förnamn (`hosts`). Se `docs/public-api.md`.
- **Kalender på grupp- och verkstadssidan:** delvis löst redan; återkom om
  något saknas.
- **Andra påminnelsen:** de som inte checkat in påminns igen två timmar innan
  incheckningen stänger (`checkInLastCall`, `sendCheckInLastCalls`, malltypen
  `activityCheckInLastCall`), aldrig inom en timme från den första. Byggt.

- **Ångra sig:** den som lämnat en plats kan inte anmäla sig igen förrän
  efter en timme (`seatReleasedAt`, `registerAgainAt`); appen säger från
  när. Att lämna kön räknas inte. Byggt.
- **`public.appUrl`** i produktion är `https://app.uppsalamakerspace.se`
  (står i exempelinställningarna och `docs/configuration.md`).
- **Tidszon:** alla tider aktiviteterna räknar fram på servern
  (incheckningsfönster, tider i mail, vanliga tider ur ett event, heldags-
  händelser från kalendern, dagens tillfällen) räknas nu i Europe/Stockholm
  med `zonedDate`/`zonedParts` i `common/lib/days.js`, oavsett serverns
  tidszon och med sommar- och vintertid. Admins tester går igenom även med
  `TZ=UTC`.
- **Google-kalendern i appen:** sidan är borta; `/calendar` är nu
  tillfällenas kalender. "Lägg till i kalender" (en .ics-fil) finns nu på
  tillfällets sida. Appen behöver inte längre `public.googleCalendar`.

## Öppna frågor

Inga just nu.

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

- Slå ihop `activities` med `master` och pusha. Före kalendersynken i
  produktion: servicekonto och `location` i admins
  `private.googleCalendar` (`docs/configuration.md`, avsnitt 13).
- Mindre saker: den som missat incheckningen kan anmäla sig igen direkt; dagsbubblorna finns
  bara i kalendern; egen pushtext kräver ändrade mallar.
