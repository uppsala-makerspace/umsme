# Plan: Aktiviteter, tillfällen och anmälningar

## Kontext

Föreningen har en kalender (Google Calendar, läst i appen med API-nyckel) och en
förteckning över aktiviteter på hemsidan som ofta är inaktuell. Många aktiviteter
återkommer — träverkstadsintro, pysselfika, öppen kväll, täljcirkel — men utan fast
regelbundenhet: en grupp beslutar när det är dags. Vissa kräver anmälan, i dag via
en extern tjänst som fungerar sisådär, och det händer ofta att folk glömmer att
komma eller att avanmäla sig. Väntelista är ett krav.

Vi vill kunna:

- visa vilka aktiviteter vi *brukar ha*, även när inget tillfälle är inbokat, och
  låta medlemmar anmäla intresse redan då
- boka tillfällen från gruppen som äger aktiviteten, med en ansvarig per tillfälle
- ta anmälningar med kö, och angripa uteblivandet *innan* tillfället genom
  incheckning
- få tillfällena in i den kalender medlemmarna redan prenumererar på

## Beslut

- **Aktivitet och tillfälle är skilda objekt.** Aktiviteten är produkten — det vi
  brukar göra — och finns oavsett om något tillfälle är inbokat. Tillfället ärver
  aktivitetens uppgifter och kan skriva över dem.
- **Tillhörighet och visningskoppling är två olika fält.** Tillhörigheten
  (`groupId`) säger vem som äger och får redigera. Visningskopplingen (verkstad
  *eller* intressegrupp) säger var aktiviteten visas. **Tom visningskoppling
  betyder något** — en aktivitet av större karaktär, som öppen kväll — och får
  därför aldrig fyllas i från tillhörigheten.
- **Aktiviteter öppna för allmänheten har ingen anmälan.** Anmälan förutsätter
  därmed alltid en medlem, och ingen personpost för icke-medlemmar behövs.
- **Incheckning är ett val per aktivitet**, bara meningsfullt när anmälan finns.
- **Ledig plats erbjuds hela kön, först till kvarn, men den måste accepteras.**
  Ingen flyttas upp automatiskt.
- **Kalendern skrivs via ett Google-servicekonto** (alternativ A). Egen ICS-feed
  (B) är reservväg.
- **Host sätts till skaparen** som standard. Skaparen kan välja en annan medlem i
  samma grupp — inte någon annan, eftersom man inte har rätt att lista föreningens
  medlemmar. Board/admin kan sätta vem som helst.
- **Ingen förifyllning av Slack-kanal eller kontaktmail** från gruppen. Vanliga
  fält, tomma tills någon fyller i dem.
- **Certifikat kan vara krav eller mål, och de två är skilda fält.** Ett krav
  (`requiredCertificateId`) måste man ha för att få anmäla sig — teoriprovet för
  träverkstaden innan den praktiska introduktionen. Ett mål
  (`targetCertificateId`) är det aktiviteten syftar till, och delas ut på ett av
  två sätt: automatiskt vid närvaro, eller av hosten i det befintliga
  intygsflödet efter att deltagaren visat att hen kan momenten.
- **Betalning ingår inte i grundmodellen.** `cost` är ett fält; kopplingen till
  webbshoppen (en aktivitet med kostnad är i praktiken en `StoreItem`) kommer när
  behovet är verkligt.

## Datamodell

Fyra samlingar i `common/collections/`, scheman i `common/lib/models.js`. Rena
regler (kapacitet, kö, incheckning, behörighet) i `common/lib/activityRules.js`,
testade i `admin/tests/` som `storeRules` och `groupRules`.

### `activities` — det vi brukar göra

| Fält | Typ | Anm. |
|---|---|---|
| `name`, `description` | `{sv, en}` | som grupper |
| `category` | String | för hemsidans filter; fri text eller enum, avgörs i etapp 1 |
| `imageFileId`, `imageMimeType` | | samma bildlager som grupper/verkstäder |
| `groupId` | String, optional | **tillhörighet** — vem som äger. Sätts vid skapandet, ändras inte av gruppen. Tom → föreningsgemensam, bara board/admin |
| `workshopId` **eller** `displayGroupId` | String, optional, högst en | **visningskoppling**. `displayGroupId` måste peka på en intressegrupp |
| `spaceId` | String, optional | normal plats, mot `Spaces` |
| `slackChannel`, `contactEmail` | String, optional | inga standardvärden |
| `durationMinutes` | Number | normal längd |
| `minSeats`, `maxSeats` | Number, optional | tillfället kan skriva över |
| `cost` | Number, optional | kronor; ingen betalning kopplad än |
| `membersOnly` | Boolean | visningsuppgift för aktiviteter *utan* anmälan; anmälan förutsätter alltid medlemskap |
| `registration` | `none \| optional \| required` | "måste / kan anmäla sig" |
| `queueAllowed` | Boolean | kö när fullt |
| `infoRequired`, `infoPlaceholder` | Boolean, String | samma mönster som webbshoppens `commentRequired`/`commentPlaceholder` |
| `checkInEnabled` | Boolean | bara när `registration !== none` |
| `checkInOpensHoursBefore` | Number | fönstrets början; slutet sitter på tillfället |
| `published` | Boolean | visas på hemsidan |
| `requiredCertificateId` | String, optional | **krav**: giltigt intyg för att få anmäla sig. Sätts explicit — inte härlett från målets förkunskaper, av samma skäl som visningskopplingen |
| `targetCertificateId` | String, optional | **mål**: det intyg aktiviteten syftar till |
| `certificateGrant` | `onAttendance \| manual` | hur målet delas ut; bara när `targetCertificateId` är satt. Se *Certifikat* |
| `createdBy`, `createdAt`, `updatedAt` | | |

### `activityOccasions` — en gång det händer

| Fält | Anm. |
|---|---|
| `activityId` | |
| `start`, `end` | `end` från `durationMinutes` om inget annat anges |
| `hostMemberId` | den ansvarige; se behörighet för vem som får sättas |
| `spaceId`, `description`, `imageFileId`, `minSeats`, `maxSeats` | optional överskrivningar |
| `checkInDeadline` | Date, optional; krävs när aktiviteten har `checkInEnabled` |
| `status` | `awaiting \| confirmed \| cancelled` — *inväntar fler anmälningar / blir av / inställd*. Går till `confirmed` när antalet godkända når `minSeats`; utan `minSeats` är det `confirmed` från start |
| `googleEventId` | id på det speglade kalenderhändelsen, för idempotent uppdatering och radering |
| `createdBy`, `createdAt`, `updatedAt` | |

### `activityRegistrations` — anmälan till ett tillfälle

Unikt index på `{occasionId, memberId}`.

| Fält | Anm. |
|---|---|
| `occasionId`, `memberId` | |
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
| `attended` | deltog | var på plats enligt hosten. Det enda tillståndet som betyder "kom" |
| `missedCheckIn` | missade incheckning | godkänd men checkade inte in före deadline; platsen släpptes i tid till kön. Behålls så historiken överlever |
| `noShow` | uteblev | hade sin plats hela vägen — `approved`, eller `checkedIn` när incheckning krävs — och kom ändå inte. Den allvarliga varianten: platsen gick förlorad |
| `withdrawn` | förhinder | avanmäld av medlemmen själv |
| `cancelled` | inställd | tillfället ställdes in |

### `activityInterests` — innan det finns något att anmäla sig till

`{activityId, memberId, createdAt}`, unikt per par. Den som anmält intresse får
besked (push + mail) när ett tillfälle bokas. Hålls skild från anmälningar: olika
livscykler, olika frågor ("hur många vill ha en täljcirkel?" mot "vem kommer på
lördag?").

## Behörighet

Alla kontroller på serversidan; att knappar döljs är artighet.

| Handling | Vem | Regel att återanvända |
|---|---|---|
| Skapa aktivitet med tillhörighet G | medlem i en styrgrupp G, eller sammankallande (gruppansvarig) i annan grupptyp G | `mayEditGroup(member, G)` i `common/lib/groupRules.js` |
| Skapa aktivitet utan tillhörighet | board/admin | `isAdminish` |
| Redigera aktivitet | `mayEditGroup` mot `activity.groupId`; tom tillhörighet → board/admin | |
| Skapa/ändra/ställa in tillfälle | **alla aktiva medlemmar** i `activity.groupId`, oavsett grupptyp; tom tillhörighet → board/admin | aktiv gruppmedlem, som i `canApprove`:s request-any-gren |
| Sätta host | skaparen: sig själv eller en medlem i samma grupp (listan finns redan via `canSeeMembers`); board/admin: vilken medlem som helst, via medlemsnummer (`groups.lookupMemberNumber`-mönstret) | |
| Anmäla sig | aktiv medlem, med giltigt intyg för `requiredCertificateId` när det är satt | `isActiveMember` + befintlig attestering som inte gått ut |
| Intresseanmäla | aktiv medlem — kravet gäller inte här, intresse får man ha innan man tagit provet | `isActiveMember` |
| Acceptera erbjuden plats | den köande själv | |
| Checka in | den anmälde själv, inom fönstret | |
| Registrera närvaro, se deltagarlista | hosten, board/admin | |

Notera asymmetrin, som är avsiktlig: i en intressegrupp får bara sammankallande
definiera *aktiviteten*, men varje medlem får boka ett *tillfälle* av den.
Aktiviteten är produkten, tillfället är driften.

## Flöden

### Anmälan och kö

1. Medlem anmäler sig. Har aktiviteten ett `requiredCertificateId` kontrolleras
   först att medlemmen har ett giltigt intyg — servern avvisar annars, och appen
   säger varför med en länk till certifikatsidan, där teoriprovet redan finns.
   Finns plats → `approved`; annars, om `queueAllowed`, → `queued`. Bekräftelse
   via push + mail (nya malltyper).
2. När antalet `approved` når `minSeats` går tillfället från `awaiting` till
   `confirmed`; hosten och gruppens Slack-kanal får besked via `publishManagerEvent`.
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
   utskick direkt — anmäler två förhinder nästan samtidigt blir det två
   utskick, vilket är acceptabelt eftersom det sällan händer. Accepterar ingen
   står platsen tom, vilket är rätt.

### Incheckning

Bara när `checkInEnabled`.

1. Fönstret öppnar `checkInOpensHoursBefore` före start och stänger vid
   `checkInDeadline`. Påminnelse med push + mail när det öppnar.
2. Den anmälde checkar in i appen (`approved` → `checkedIn`). Bara den anmälde
   själv — incheckningen sker dagen före, inte vid dörren.
3. Vid deadline kör ett cronjobb i admin (som membership-påminnelserna): varje
   `approved` som inte checkat in → `missedCheckIn`, platsen släpps, kön får
   erbjudandet enligt ovan.

### Närvaro

Oberoende av om incheckning är påslagen.

1. Vid eller efter tillfället registrerar hosten vem som var där:
   `approved`/`checkedIn` → `attended`.
2. När hosten stänger närvaroregistreringen blir de som fortfarande står som
   `approved` eller `checkedIn` → `noShow`. De hade sin plats hela vägen och kom
   inte, vilket är det uteblivande som faktiskt kostar föreningen något.
3. Stängs närvaron aldrig lämnas tillstånden som de är och tillfället flaggas för
   hosten. Ingen automatisk `noShow` — en glömsk host ska inte tillskriva andra
   ett uteblivande.

### Inställt tillfälle

`status: cancelled`; alla `approved`/`queued`/`checkedIn` → `cancelled` och får
besked (`attended`, `noShow`, `missedCheckIn` och `withdrawn` är redan avslutade
och lämnas). Kalenderhändelsen tas bort. Ingen manager-händelse för avhopp (varken
`groups.leave` eller `groups.reject` publicerar någon), men inställt tillfälle är en
signal till gruppen.

## Kalendern

Appen läser i dag Google Calendar med API-nyckel — bara läsning. Tillfällen
speglas dit med ett **servicekonto med skrivrätt** på samma kalender:

- skapa tillfälle → skapa händelse, spara `googleEventId`
- ändra → uppdatera samma händelse
- ställa in → radera händelsen (eller märk titeln "INSTÄLLT" — avgörs i etapp 4)
- UMSME rör **bara** händelser den själv skapat; allt annat i kalendern lämnas.

Skrivningen sker på serversidan efter att databasen uppdaterats, med försök igen
vid fel; en misslyckad kalenderskrivning får inte hindra bokningen. Servicekontots
nyckel läggs i `app/settings.json` under `private`, och appens befintliga
kalendersida fortsätter fungera oförändrad.

## Hemsidan

`buildDirectory` i `common/lib/publicDirectory.js` får en tredje `kind: "activity"`
för publicerade aktiviteter, med kommande tillfällen (start, plats, status,
antal lediga platser om anmälan) inbäddade. Visningskopplingen avgör var på sajten
den hör hemma; aktiviteter utan koppling listas som föreningsgemensamma. Sajten
pollar redan varje timme.

## Certifikat

Två relationer, som en aktivitet kan ha båda, en eller ingen av.

### Krav — `requiredCertificateId`

Man måste ha ett giltigt intyg för att få anmäla sig. Exemplet: teoriprovet för
träverkstaden är kravet för att anmäla sig till den praktiska introduktionen.
Kontrollen är serversidans, vid anmälan, mot en attestering som inte gått ut.
Appen visar kravet på aktivitetssidan med länk till certifikatet, så den som
saknar det hittar direkt till provet.

Kravet sätts explicit på aktiviteten, även om det oftast är samma sak som målets
förkunskap i `certificate.prerequisites`. Två skäl: en aktivitet kan kräva ett
intyg utan att syfta till något (en fortsättningskurs), och att härleda krav ur
en annan post gör det omöjligt att se på aktiviteten vad som gäller — samma
resonemang som för visningskopplingen. Admin kan varna när de två inte stämmer
överens, men systemet väljer inte åt någon.

Kravet gäller anmälan, inte intresseanmälan: intresse får man ha innan man tagit
provet — det är ju ofta därför man tar det.

### Mål — `targetCertificateId` och `certificateGrant`

Aktiviteten syftar till ett intyg. Hur det delas ut är ett val per aktivitet:

**`onAttendance` — närvaro ger intyget.** När hosten registrerar `attended`
skapas attesteringen direkt, med hosten som certifierare. Det förutsätter att
hosten *får* certifiera det intyget enligt den befintliga regeln (`canCertify`:
certifikatets `certifiers`-lista eller `certifierRole`). Därför kontrolleras det
**när hosten sätts** på ett tillfälle av en sådan aktivitet — inte först vid
närvaroregistreringen, då det är för sent. Passar det som är en ren genomgång:
den som var med har fått informationen.

**`manual` — intyget visas, hosten delar ut.** Certifikatet listas på
aktivitetens och tillfällets sidor så det är lätt att hitta, men delas ut i det
flöde som redan finns: deltagaren begär (`certificates.request`), hosten som
certifierare godkänner (`certificates.confirm`) efter att deltagaren visat att hen
kan de nödvändiga momenten. Passar det som kräver bedömning. Tillfällets sida kan
visa hosten vilka av dagens deltagare som har en väntande begäran, så det inte
blir ett letande i den allmänna listan.

Ingen av relationerna kräver något av grundmodellen; de är fält och en kontroll
till.

## Etapper

1. **Aktiviteter och tillfällen.** Samlingar, behörighet, admin-vyer, appsidor
   under `/activities`, hemsidans `kind: "activity"`. Ger det aktuella
   aktivitetsregistret på hemsidan direkt — ett av de mest konkreta problemen.
2. **Anmälan, kö och erbjudanden.** Registreringar, intresseanmälan, malltyper,
   push, den atomära accepteringen, och kravet på intyg vid anmälan.
3. **Incheckning, närvaro och påminnelser.** Fönster, deadline-jobb,
   `missedCheckIn`; hostens närvaroregistrering och `noShow`.
4. **Kalendersynk.** Servicekonto, `googleEventId`, återförsök.
5. **Mål-certifikat.** Visning på aktivitets- och tillfällessidor, hostens
   väntande begäranden, och `onAttendance` med kontrollen vid host-tilldelning.

## Risker att bevaka

- **Två som accepterar samtidigt.** Kapacitetskontrollen måste ligga i samma
  uppdatering som tillståndsbytet, inte som en läsning före. Unikt index på
  `{occasionId, memberId}` skyddar mot dubbla anmälningar men inte mot detta.
- **Deadline-jobbet bor i admin, anmälningarna görs i appen.** Båda delar
  `common/`, men jobbet måste kunna skicka push och mail — se hur
  membership-påminnelserna gör det i `admin/server/cronjob/`.
- **Utskick till hela kön vid varje förhinder** kan bli många notiser för en
  populär aktivitet där folk droppar av i följd. Deadline-fallet är löst genom
  att jobbet räknas som en händelse; det som återstår är förhinder ett och ett.
  Mät innan någon tröskel införs.
- **Host som inte får certifiera** på en `onAttendance`-aktivitet skulle ge
  närvaro utan intyg. Därför avvisas host-tilldelningen redan när tillfället
  skapas, med ett tydligt fel — inte tyst nedgradering till `manual`.
- **Intyg som går ut mellan anmälan och tillfälle.** Kravet kontrolleras vid
  anmälan; att kontrollera det igen vid incheckning är billigt och rimligt, men
  avgörs i etapp 3.
- **Tidszon.** Alla tider i Europe/Stockholm; Google Calendar-händelser måste
  skapas med explicit tidszon, annars driver sommartiden dem en timme.
- **Servicekontots nyckel** är en hemlighet på samma nivå som Swish-certifikaten.
  `settings.json` är redan utanför git, men det förtjänar en rad i
  `docs/configuration.md`.
- **Hemsidan visar antal lediga platser** — det är en siffra som ändras oftare än
  timvis pollning. Acceptabelt, men värt att skriva "cirka" på sajten.

## Verifiering

Ingen testning mot huvuddatabasen; app och admin körs mot en engångskopia som
släpps efteråt.

- Rena regler (kapacitet, kö-ordning, incheckningsdeadline, behörighetstabellen)
  i `admin/tests/activityRules.tests.js`.
- Behörighet mot kopian: styrgruppsmedlem, sammankallande i intressegrupp, vanlig
  intressegruppsmedlem, utomstående, board — för var och en av handlingarna i
  tabellen, med direkta metodanrop och inte bara UI.
- Den atomära accepteringen: två samtidiga anrop mot en enda ledig plats — exakt
  ett ska lyckas.
- Deadline-jobbet mot ett tillfälle med blandade tillstånd.
- Kalenderskrivningen mot en testkalender, aldrig föreningens, tills etapp 4 är
  granskad.

## Frågor som lämnas öppna

- Är `registration: optional` värt att ha, eller räcker `none | required`?
  "Kan anmäla sig" utan platsbegränsning är egentligen en påminnelseprenumeration.
- Ska `category` vara fri text eller en fast lista? Fast lista ger renare filter på
  hemsidan men kräver admin för att lägga till en.
- Hur länge före start ska påminnelsen om incheckning gå ut, och ska det gå en
  andra påminnelse strax före deadline?
- När kostnad blir aktuell: skapas en `StoreItem` per aktivitet, eller blir
  anmälan själv ett köp?
