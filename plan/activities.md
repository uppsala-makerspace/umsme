# Plan: Aktiviteter, events och anmälningar

## Kontext

Föreningen har en kalender (Google Calendar, läst i appen med API-nyckel) och en
förteckning över aktiviteter på hemsidan som ofta är inaktuell. Många aktiviteter
återkommer — träverkstadsintro, pysselfika, öppen kväll, täljcirkel — men utan fast
regelbundenhet: en grupp beslutar när det är dags. Vissa kräver anmälan, i dag via
en extern tjänst som fungerar sisådär, och det händer ofta att folk glömmer att
komma eller att avanmäla sig. Väntelista är ett krav.

Vi vill kunna:

- visa vilka aktiviteter vi *brukar ha*, även när inget event är inbokat, och
  låta medlemmar anmäla intresse redan då
- boka events från gruppen som äger aktiviteten, med en eller flera ansvariga (hosts)
- skapa enklare events utan aktivitet (städdag, årsmöte) i samma system
- ta anmälningar med kö, och angripa uteblivandet *innan* eventet genom
  incheckning
- få events in i den kalender medlemmarna redan prenumererar på

## Beslut

- **Aktivitet och event är skilda objekt.** Aktiviteten är produkten — det vi
  brukar göra — och finns oavsett om något event är inbokat. Ett event är en gång
  det händer, som en kalenderhändelse.
- **Ett event kan höra till en aktivitet, eller stå fritt.** Ett event har samma
  fält som en aktivitet. Hör det till en aktivitet är fälten överskrivningar: tomt
  betyder "som aktiviteten". Står det fritt är fälten eventets egna. Det ger ett
  enda regelverk för anmälan, kö och incheckning, med eller utan aktivitet.
- **Tillhörighet och visningskoppling är två olika fält.** Tillhörigheten
  (`groupId`) säger vem som äger och får redigera. Visningskopplingen
  (`workshopId`: en verkstad eller ett intresseområde) säger var aktiviteten
  visas. **Tom visningskoppling betyder något** — en aktivitet av större
  karaktär, som öppen kväll — och får därför aldrig fyllas i från tillhörigheten.
  Intressegrupper finns inte längre; intresseområden är en sorts verkstad
  (`workshop.kind: "areaOfInterest"`), så någon separat koppling till grupper
  behövs inte.
- **Ett event som hör till en aktivitet ägs av aktivitetens grupp.** Ett fritt
  event har en egen `groupId`, eller ingen — då är det föreningsgemensamt och bara
  board/admin får ändra det.
- **Aktiviteter öppna för allmänheten har ingen anmälan.** Anmälan förutsätter
  därmed alltid en medlem, och ingen personpost för icke-medlemmar behövs.
- **Anmälan är `none | optional | required`.** `optional` är "man kan anmäla
  sig": alla är välkomna, men vi vill gärna veta hur många som kommer.
- **Incheckning är ett val per aktivitet eller fritt event**, bara meningsfullt
  när anmälan finns.
- **Ledig plats erbjuds hela kön, först till kvarn, men den måste accepteras.**
  Ingen flyttas upp automatiskt.
- **Kalendern skrivs via ett Google-servicekonto** (alternativ A). Egen ICS-feed
  (B) är reservväg.
- **Ett event kan ha flera hosts.** Skaparen är förvald. Hosts väljs bland den
  ägande gruppens medlemmar — inte någon annan, eftersom man inte har rätt att
  lista föreningens medlemmar. Board/admin kan sätta vem som helst.
- **Kategori är en fast lista som admin sköter**, en egen liten samling, så att
  hemsidans filter blir rena.
- **Ingen förifyllning av Slack-kanal eller kontaktmail** från gruppen. Vanliga
  fält, tomma tills någon fyller i dem.
- **Certifikat kan vara krav eller mål, och de två är skilda fält.** Ett krav
  (`requiredCertificateId`) måste man ha för att få anmäla sig — teoriprovet för
  träverkstaden innan den praktiska introduktionen. Ett mål
  (`targetCertificateId`) är det aktiviteten syftar till, och delas ut på ett av
  två sätt: automatiskt vid närvaro, eller av en host i det befintliga
  intygsflödet efter att deltagaren visat att hen kan momenten.
- **Betalning ingår inte i grundmodellen.** `cost` är ett fält; kopplingen till
  webbshoppen (en aktivitet med kostnad är i praktiken en `StoreItem`) kommer när
  behovet är verkligt.

## Datamodell

Fyra samlingar i `common/collections/`, scheman i `common/lib/models.js`. Rena
regler (överskrivning, kapacitet, kö, incheckning, behörighet) i
`common/lib/activityRules.js`, testade i `admin/tests/` som `storeRules` och
`groupRules`.

### `activities` — det vi brukar göra

| Fält | Typ | Anm. |
|---|---|---|
| `name`, `description` | `{sv, en}` | som grupper |
| `categoryId` | String, optional | mot `activityCategories` |
| `imageFileId`, `imageMimeType` | | samma bildlager som grupper/verkstäder |
| `groupId` | String, optional | **tillhörighet** — vem som äger. Sätts vid skapandet, ändras bara av board/admin. Tom → föreningsgemensam, bara board/admin |
| `workshopId` | String, optional | **visningskoppling**: en verkstad eller ett intresseområde |
| `spaceId` | String, optional | normal plats, mot `Spaces` |
| `slackChannel`, `contactEmail` | String, optional | inga standardvärden |
| `durationMinutes` | Number | normal längd |
| `minSeats`, `maxSeats` | Number, optional | eventet kan skriva över |
| `cost` | Number, optional | kronor; ingen betalning kopplad än |
| `membersOnly` | Boolean | visningsuppgift för aktiviteter *utan* anmälan; anmälan förutsätter alltid medlemskap |
| `registration` | `none \| optional \| required` | "ingen / kan / måste anmäla sig" |
| `queueAllowed` | Boolean | kö när fullt |
| `infoRequired`, `infoPlaceholder` | Boolean, String | samma mönster som webbshoppens `commentRequired`/`commentPlaceholder` |
| `checkInEnabled` | Boolean | bara när `registration !== none` |
| `checkInOpensHoursBefore` | Number | fönstrets början; slutet sitter på eventet |
| `published` | Boolean | visas på hemsidan |
| `requiredCertificateId` | String, optional | **krav**: giltigt intyg för att få anmäla sig. Sätts explicit — inte härlett från målets förkunskaper, av samma skäl som visningskopplingen |
| `targetCertificateId` | String, optional | **mål**: det intyg aktiviteten syftar till |
| `certificateGrant` | `onAttendance \| manual` | hur målet delas ut; bara när `targetCertificateId` är satt. Se *Certifikat* |
| `createdBy`, `createdAt`, `updatedAt` | | |

### `events` — en gång det händer

Alla fält i `activities` ovan finns också på eventet. Hör eventet till en
aktivitet är de överskrivningar (tomt = som aktiviteten), utom `groupId`, som
alltid är aktivitetens. Står eventet fritt är de eventets egna, och `name` krävs.
`resolveEvent(event, activity)` i `activityRules.js` ger de gällande värdena.

Därtill:

| Fält | Anm. |
|---|---|
| `activityId` | optional; tomt för ett fritt event |
| `start`, `end` | `end` från `durationMinutes` om inget annat anges |
| `hostMemberIds` | de ansvariga, en eller flera; se behörighet för vem som får sättas |
| `checkInDeadline` | Date, optional; krävs när incheckning gäller |
| `status` | `awaiting \| confirmed \| cancelled` — *inväntar fler anmälningar / blir av / inställt*. Går till `confirmed` när antalet godkända når `minSeats`; utan `minSeats`, eller utan anmälan, är det `confirmed` från start |
| `googleEventId` | id på den speglade kalenderhändelsen, för idempotent uppdatering och radering |
| `createdBy`, `createdAt`, `updatedAt` | |

### `eventRegistrations` — anmälan till ett event

Unikt index på `{eventId, memberId}`.

| Fält | Anm. |
|---|---|
| `eventId`, `memberId` | |
| `registeredAt` | avgör ordningen i kön |
| `info` | det den anmälde lämnat, när `infoRequired` |
| `state` | se nedan |
| `stateChangedAt` | |

Tillstånd, med de svenska ord vi använt i diskussionen:

| `state` | Svenska | Betydelse |
|---|---|---|
| `approved` | godkänd | har en plats |
| `queued` | kö | väntar på plats |
| `checkedIn` | incheckad | har i förväg, inom incheckningsfönstret, bekräftat att hen kommer. Ett åtagande — inte ett bevis på närvaro |
| `attended` | deltog | var på plats enligt en host. Det enda tillståndet som betyder "kom" |
| `missedCheckIn` | missade incheckning | godkänd men checkade inte in före deadline; platsen släpptes i tid till kön. Behålls så historiken överlever |
| `noShow` | uteblev | hade sin plats hela vägen — `approved`, eller `checkedIn` när incheckning krävs — och kom ändå inte. Den allvarliga varianten: platsen gick förlorad |
| `withdrawn` | förhinder | avanmäld av medlemmen själv |
| `cancelled` | inställd | eventet ställdes in |

### `activityInterests` — innan det finns något att anmäla sig till

`{activityId, memberId, createdAt}`, unikt per par. Den som anmält intresse får
besked (push + mail) när ett event av aktiviteten bokas. Hålls skild från
anmälningar: olika livscykler, olika frågor ("hur många vill ha en täljcirkel?"
mot "vem kommer på lördag?"). Fria events har ingen intresseanmälan.

### `activityCategories` — hemsidans filter

`{name: {sv, en}, sortOrder}`. Sköts av board/admin i admin. En kategori som
används kan inte tas bort.

## Behörighet

Alla kontroller på serversidan; att knappar döljs är artighet. Grupptyperna är
styrgrupp, funktionsgrupp och ansvarsgrupp.

| Handling | Vem | Regel att återanvända |
|---|---|---|
| Skapa/redigera aktivitet med tillhörighet G | aktiv medlem i styrgruppen G, eller ansvarig för G av annan typ; för en aktivitetsgrupp (ansvarsgrupp) även aktiv medlem i styrgruppen ovanför | `mayEditActivity` i `common/lib/activityRules.js`, byggd på `mayEditGroup` |
| Skapa/redigera aktivitet utan tillhörighet | board/admin | `isAdminish` |
| Ändra en aktivitets tillhörighet | board/admin | |
| Skapa/ändra/ställa in event av en aktivitet | **alla aktiva medlemmar** i aktivitetens grupp, oavsett grupptyp — eller, när aktiviteten säger så (`eventBookers: "activityEditors"`), bara de som får ändra aktiviteten; tom tillhörighet → board/admin | `mayBookEventOf` i `common/lib/activityRules.js` |
| Skapa/ändra/ställa in fritt event med tillhörighet G | alla aktiva medlemmar i G | som ovan |
| Skapa/ändra/ställa in fritt event utan tillhörighet | board/admin | |
| Sätta hosts | skaparen: sig själv och medlemmar i samma grupp (listan finns redan via `canSeeMembers`); board/admin: vilken medlem som helst, via medlemsnummer (`groups.lookupMemberNumber`-mönstret) | |
| Anmäla sig | aktiv medlem, med giltigt intyg för `requiredCertificateId` när det är satt | `isActiveMember` + befintlig attestering som inte gått ut |
| Intresseanmäla | aktiv medlem — kravet gäller inte här, intresse får man ha innan man tagit provet | `isActiveMember` |
| Acceptera erbjuden plats | den köande själv | |
| Checka in | den anmälde själv, inom fönstret | |
| Registrera närvaro, se deltagarlista | eventets hosts, board/admin | |
| Sköta kategorier | board/admin | |

Notera asymmetrin, som är avsiktlig: i en funktions- eller ansvarsgrupp får bara
den ansvarige (och för en ansvarsgrupp styrgruppen ovanför) definiera *aktiviteten*, men varje medlem får boka ett *event* av
den. Aktiviteten är produkten, eventet är driften.

## Flöden

### Anmälan och kö

1. Medlem anmäler sig. Har aktiviteten ett `requiredCertificateId` kontrolleras
   först att medlemmen har ett giltigt intyg — servern avvisar annars, och appen
   säger varför med en länk till certifikatsidan, där teoriprovet redan finns.
   Finns plats → `approved`; annars, om `queueAllowed`, → `queued`. Bekräftelse
   via push + mail (nya malltyper).
2. När antalet `approved` når `minSeats` går eventet från `awaiting` till
   `confirmed`; hosts och gruppens Slack-kanal får besked via `publishManagerEvent`.
3. Medlem meddelar förhinder → `withdrawn`, platsen släpps.

### Ledig plats

När en plats släpps — genom förhinder eller missad incheckning — och kön inte är
tom:

1. **Alla** i kön får push + mail: "En plats har blivit ledig, först till kvarn."
2. Den som accepterar först får platsen → `approved`. Accepterandet är en atomär
   uppdatering med kapacitetskontroll på servern; den andre får "platsen är redan
   tagen". Ingen flyttas upp utan att ha sagt ja.
3. Släpps platsen **efter** incheckningsdeadline blir den som accepterar
   `checkedIn` direkt — att aktivt säga ja så nära inpå är åtagandet.
4. **Ett utskick per händelse som släpper platser, inte per plats.** När
   deadline-jobbet markerar fem som uteblivna på en gång går ett enda mail och
   en enda push till kön, med antalet lediga platser i texten; de fem första
   som accepterar får dem. Ett förhinder är sin egen händelse och ger ett
   utskick direkt. Accepterar ingen står platsen tom, vilket är rätt.

### Incheckning

Bara när incheckning gäller för eventet.

1. Fönstret öppnar `checkInOpensHoursBefore` före start och stänger vid
   `checkInDeadline`. Påminnelse med push + mail när det öppnar.
2. Den anmälde checkar in i appen (`approved` → `checkedIn`). Bara den anmälde
   själv — incheckningen sker dagen före, inte vid dörren.
3. Vid deadline kör ett cronjobb i admin (som membership-påminnelserna): varje
   `approved` som inte checkat in → `missedCheckIn`, platsen släpps, kön får
   erbjudandet enligt ovan.

### Närvaro

Oberoende av om incheckning är påslagen.

1. Vid eller efter eventet registrerar en host vem som var där:
   `approved`/`checkedIn` → `attended`. Alla eventets hosts får göra det.
2. När närvaroregistreringen stängs blir de som fortfarande står som
   `approved` eller `checkedIn` → `noShow`.
3. Stängs närvaron aldrig lämnas tillstånden som de är och eventet flaggas för
   hosts. Ingen automatisk `noShow` — en glömsk host ska inte tillskriva andra
   ett uteblivande.

### Inställt event

`status: cancelled`; alla `approved`/`queued`/`checkedIn` → `cancelled` och får
besked (`attended`, `noShow`, `missedCheckIn` och `withdrawn` är redan avslutade
och lämnas). Kalenderhändelsen tas bort. Inställt event är en signal till
gruppen.

## Kalendern

Appen läser i dag Google Calendar med API-nyckel — bara läsning. Events speglas
dit med ett **servicekonto med skrivrätt** på samma kalender, fria och de som hör
till en aktivitet:

- skapa event → skapa händelse, spara `googleEventId`
- ändra → uppdatera samma händelse
- ställa in → radera händelsen (eller märk titeln "INSTÄLLT" — avgörs i etapp 4)
- UMSME rör **bara** händelser den själv skapat; allt annat i kalendern lämnas.

Skrivningen sker på serversidan efter att databasen uppdaterats, med försök igen
vid fel; en misslyckad kalenderskrivning får inte hindra bokningen. Servicekontots
nyckel läggs i `app/settings.json` under `private`, och appens befintliga
kalendersida fortsätter fungera oförändrad.

## Hemsidan

`buildDirectory` i `common/lib/publicDirectory.js` får en ny `kind: "activity"`
för publicerade aktiviteter, med kommande events (start, slut, plats, status,
antal lediga platser om anmälan) inbäddade, och publicerade fria events som egen
lista. Visningskopplingen avgör var på sajten en aktivitet hör hemma; aktiviteter
utan koppling listas som föreningsgemensamma. Sajten pollar redan varje timme.

## Certifikat

Två relationer, som en aktivitet kan ha båda, en eller ingen av.

### Krav — `requiredCertificateId`

Man måste ha ett giltigt intyg för att få anmäla sig. Exemplet: teoriprovet för
träverkstaden är kravet för att anmäla sig till den praktiska introduktionen.
Kontrollen är serversidans, vid anmälan, mot en attestering som inte gått ut.
Appen visar kravet på aktivitetssidan med länk till certifikatet, så den som
saknar det hittar direkt till provet.

Kravet sätts explicit på aktiviteten, även om det oftast är samma sak som målets
förkunskap i `certificate.prerequisites`. Admin kan varna när de två inte stämmer
överens, men systemet väljer inte åt någon. Kravet gäller anmälan, inte
intresseanmälan.

### Mål — `targetCertificateId` och `certificateGrant`

**`onAttendance` — närvaro ger intyget.** När en host registrerar `attended`
skapas attesteringen direkt, med den hosten som certifierare. Det förutsätter att
hosten *får* certifiera det intyget (`canCertify`: certifikatets
`certifiers`-lista eller `certifierRole`). Därför kontrolleras det **när hosts
sätts** på ett event av en sådan aktivitet: minst en host måste få certifiera, och
bara de som får det kan registrera närvaro som ger intyg.

**`manual` — intyget visas, en host delar ut.** Certifikatet listas på
aktivitetens och eventets sidor, men delas ut i det flöde som redan finns:
deltagaren begär (`certificates.request`), en host som certifierare godkänner
(`certificates.confirm`). Eventets sida kan visa hosts vilka av dagens deltagare
som har en väntande begäran.

## Etapper

1. **Aktiviteter, events och kategorier.** Samlingar, behörighet, admin-vyer,
   appsidor under `/activities`, fria events, hemsidans `kind: "activity"`. Ger
   det aktuella aktivitetsregistret på hemsidan direkt. Anmälningsfälten kommer
   med i etapp 2, så formulären inte visar inställningar som inte gör något än.
   *Byggd på grenen `activities` (oktober 2026).* Avvikelser och rester: ett
   event tas bort med sin bild (en aktivitet kräver att bilden tas bort först);
   ett events bild faller tillbaka på aktivitetens, också i `/api/events`; i
   appen laddas bilder ännu inte upp (admin gör det), och appens formulär har
   ingen slutdag (ett event över flera dagar behåller den som finns). Ett
   publicerat event till en opublicerad aktivitet visas inte på hemsidan.
2. **Anmälan, kö och erbjudanden.** Registreringar, intresseanmälan, platser,
   malltyper, push, den atomära accepteringen, och kravet på intyg vid anmälan.
3. **Incheckning, närvaro och påminnelser.** Fönster, deadline-jobb,
   `missedCheckIn`; hosts närvaroregistrering och `noShow`.
   *Etapp 2 och 3 byggda på grenen `activities` (oktober 2026)*, med:
   - Platser räknas på eventet (`seatsTaken`) och tas med en villkorad
     ökning, så den sista platsen aldrig ges bort två gånger.
   - En ny anmälan hamnar i kön när någon redan köar, även om en plats är
     ledig: kön har den först. Den köande ser "Ta platsen" i appen.
   - `awaiting` → `confirmed` är enkelriktat.
   - Ett event med anmälda kan inte tas bort, bara ställas in.
   - Incheckningen öppnar 24 h före start om inget annat sägs, och stänger vid
     start om eventet saknar deadline.
   - Åtta nya malltyper (`activity…`), en egen notiskategori som medlemmen kan
     stänga av, standardtexter som läggs in när admin och appen startar.
   - Cronjobbet (var tionde minut) körs bara med `activityCron.enabled: true`.
   - Utöver planen: import från Google-kalendern i admin
     (`private.googleCalendar`; "fake" i demo och e2e), "gör en aktivitet av
     eventet" och "hitta event med aktivitetens namn" i admin, och "Mina
     anmälningar" i appens kalender.
4. **Kalendersynk.** Servicekonto, `googleEventId`, återförsök.
5. **Mål-certifikat.** Visning på aktivitets- och eventsidor, hosts väntande
   begäranden, och `onAttendance` med kontrollen vid host-tilldelning.

## Risker att bevaka

- **Två som accepterar samtidigt.** Kapacitetskontrollen måste ligga i samma
  uppdatering som tillståndsbytet, inte som en läsning före. Unikt index på
  `{eventId, memberId}` skyddar mot dubbla anmälningar men inte mot detta.
- **Överskrivningar som blir inaktuella.** Ett event som skriver över aktivitetens
  fält behåller sitt värde när aktiviteten ändras. Det är avsikten, men admin bör
  visa vad som är ärvt och vad som är eget.
- **Deadline-jobbet bor i admin, anmälningarna görs i appen.** Båda delar
  `common/`, men jobbet måste kunna skicka push och mail — se hur
  membership-påminnelserna gör det i `admin/server/cronjob/`.
- **Utskick till hela kön vid varje förhinder** kan bli många notiser för en
  populär aktivitet. Mät innan någon tröskel införs.
- **Host som inte får certifiera** på en `onAttendance`-aktivitet skulle ge
  närvaro utan intyg. Därför avvisas host-tilldelningen redan när eventet
  skapas, med ett tydligt fel.
- **Intyg som går ut mellan anmälan och event.** Kravet kontrolleras vid
  anmälan; att kontrollera det igen vid incheckning avgörs i etapp 3.
- **Tidszon.** Alla tider i Europe/Stockholm; Google Calendar-händelser måste
  skapas med explicit tidszon.
- **Servicekontots nyckel** är en hemlighet på samma nivå som Swish-certifikaten
  och förtjänar en rad i `docs/configuration.md`.
- **Hemsidan visar antal lediga platser** — en siffra som ändras oftare än
  timvis pollning. Acceptabelt, men värt att skriva "cirka" på sajten.

## Verifiering

Ingen testning mot huvuddatabasen; app och admin körs mot e2e- och
demodatabaserna.

- Rena regler (överskrivning, kapacitet, kö-ordning, incheckningsdeadline,
  behörighetstabellen) i `admin/tests/activityRules.tests.js`.
- Domänfunktioner och behörighet med direkta metodanrop: styrgruppsmedlem,
  ansvarig i funktionsgrupp, vanlig gruppmedlem, utomstående, board.
- Den atomära accepteringen: två samtidiga anrop mot en enda ledig plats — exakt
  ett ska lyckas.
- Deadline-jobbet mot ett event med blandade tillstånd.
- Kalenderskrivningen mot en testkalender, aldrig föreningens, tills etapp 4 är
  granskad.
- Admin- och app-e2e för varje etapp.

## Frågor som lämnas öppna

- Hur länge före start ska påminnelsen om incheckning gå ut, och ska det gå en
  andra påminnelse strax före deadline?
- När kostnad blir aktuell: skapas en `StoreItem` per aktivitet, eller blir
  anmälan själv ett köp?
