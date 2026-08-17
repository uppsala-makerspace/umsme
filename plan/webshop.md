# Plan: Webshop i appen

## Kontext

Appen kan i dag bara ta emot medlemsbetalningar. Allt annat vi säljer — lera,
t-shirts, lördagskurser, gåvor — sker utanför systemet, vilket betyder kontanter,
swishar till privatpersoner och ingen spårbarhet mot medlem eller bokföring.

Vi vill ha en webshop i appen: varorna sköts i admin, köpet görs i appen, och
`payment/`-modulen tar emot Swish-bekräftelsen på samma sätt som för medlemskap.

Ett konto i appen krävs alltid (vi behöver en medlem att knyta köpet till). Bara
vissa varor kräver **medlemskap** — lera och kurser gör det, en t-shirt inte.

## Beslut

- **`ws:`-prefix i Swish-meddelandet** i stället för `pt:`, så ett varuköp aldrig
  kan förväxlas med en medlemsbetalning. Se dock varningen om att prefixet inte är
  identiteten, nedan.
- **Ett köp per vara.** Två t-shirts blir två köp. Enklaste modellen, och antal
  kan läggas till senare utan att bryta något.
- **Bokföringskonto på varan.** Utan det hamnar varje varuköp som
  `unclassified-payment` i bankavstämningen — se risken nedan.
- **Egna köpvillkor för varor**, `termsOfPurchaseStore.{sv,en}.md`, godkända i
  köpflödet precis som medlemsvillkoren. Vi säljer fysiska varor till
  icke-medlemmar, där konsumentköplagens ångerrätt gäller.
- **Kvitto via mallsystemet**, med en ny malltyp `purchase` vid sidan av
  `confirmation`. Se eget avsnitt nedan.

## Datamodell

### Ny collection: `storeItems` (`common/collections/storeItems.js` + `models.js`)

| Fält | Typ | Not |
|---|---|---|
| `code` | String, max 12 | Unik. Kort — den ska rymmas i Swish-meddelandet |
| `name` | Object `{sv, en}` | Som `workshop.name` |
| `description` | Object `{sv, en}` | Markdown |
| `price` | Number, optional | **Utelämnad = fritt pris**, köparen anger själv |
| `minPrice` / `maxPrice` | Number, optional | Bara meningsfulla vid fritt pris |
| `requiresMembership` | Boolean | Lera och kurser: sant. T-shirt: falskt |
| `commentRequired` | Boolean | |
| `commentPlaceholder` | Object `{sv, en}` | "Namn på kursdeltagaren" |
| `bookkeepingAccount` | String | Se bokföringsavsnittet |
| `dimension` | Object, blackbox, optional | Som `standardIncome.codes[].dimension` |
| `imageFileId` / `imageMimeType` | String, optional | Återanvänd `workshopImageStore` |
| `status` | `available` \| `hidden` | Dölj utan att radera; historiken måste bevaras |
| `sortOrder` | Number, optional | |

Fritt pris uttrycks som **avsaknad av `price`**, inte som en separat flagga — då
kan de två inte säga emot varandra.

### `initiatedPayments` — ny diskriminator

`paymentType` är i dag obligatoriskt (`common/lib/models.js`). Lägg till:

- `kind`: `"membership"` \| `"storeItem"`, `defaultValue: "membership"` så
  befintliga dokument fortsätter gälla.
- `storeItem` (varans `_id`), `itemCode`, `comment` — optional.
- Gör `paymentType` **optional**, eftersom ett varuköp inte har någon.

### `payments` — så admin kan skilja dem åt

- `storeItem` (varans `_id`), `itemCode`, `comment` — optional.

Ett varuköp känns igen på `storeItem`, inte på meddelandets prefix.

## Ändringar

### 1. Admin: hantera varor

Ny vy under **Economy** (menyn grupperades i commit `75b14c5`), efter mönstret
från `admin/client/ui/workshops/`: `StoreItemList.js`/`.html` (tabular),
`StoreItemAdd`, `StoreItemView` med `quickForm` över hela schemat. Bilduppladdning
återanvänder samma metoder som verkstadsbilden.

Ny tabular-konfiguration i `admin/imports/tabular/storeItems.js`. **Kom ihåg att
kolumnlistorna är blocklistor** (`filter`), så tvåspråkiga fält och
bild-id:n måste filtreras bort explicit, annars dyker de upp som kolumner.

### 2. Appen: butiken och köpet

Nya sidor under `app/imports/pages/`, alla enligt mönstret container `index.jsx`
+ ren `Xxx.jsx` + `Xxx.stories.jsx`:

- `store/` — listan. Varor med `requiresMembership` visas för alla men är
  köpbara bara för medlemmar; visa varför, dölj dem inte. Bild, namn, pris (eller
  "du anger själv").
- `storeItem/` — en vara: beskrivning, prisfält vid fritt pris, kommentarfält med
  varans placeholder, kryssruta för köpvillkoren, köpknapp.

Rutter i `app/imports/ui/App.jsx`: `/store`, `/store/:code`.
Menypost i `HamburgerMenu.jsx`.

Ny metod `store.initiate(code, { amount, comment })` i
`app/server/methods/store.js`, byggd på `payment.initiate`
(`app/server/methods/payments.js:150`) men **servern måste räkna om beloppet
själv**: fast pris hämtas ur varan och klientens värde ignoreras; fritt pris
valideras mot `minPrice`/`maxPrice`. Kräver medlemskap när varan gör det, och
kräver kommentar när varan gör det.

Meddelandet: `` sanitizeForSwish(`ws:${code} mid:${member.mid} ${member.name}`) ``

### 3. `payment/`: ta emot bekräftelsen

I `payment/server/api/swish.js`, `handlePaidStatus` (rad ~91): grena på
`initiated.kind`.

- `"membership"` → befintlig `processPayment`, oförändrad.
- `"storeItem"` → ny `processStorePurchase(payment, member, initiated)` i
  `payment/server/api/payments.js`: sätter `storeItem`, `itemCode` och `comment`
  på betalningen, och publicerar ett nytt `ManagerEventType.STORE_PURCHASE`
  (tre steg enligt `CLAUDE.md`: enum, anrop, `subscriptions` i
  `payment/settings.json`).

Loggraden `"Unknown paymentType, not creating membership"` ska bara gälla
medlemsgrenen — annars varnar varje varuköp i loggen.

Inget nytt behövs för orphan-fallet: en betalning utan `initiatedPayment` har
ingen vara och hanteras som i dag.

### 4. Appen: mina köp och landningssidan

- `store/purchases/` — "Mina köp": **alla** `Payments` för medlemmen, både
  varuköp och medlemsbetalningar. Ny metod `store.getMyPayments`.
- Klick på ett varuköp → `/payment/:paymentId` (ny landningssida, förlaga
  `app/imports/pages/membershipDetail/`, metod `payment.getDetail`).
- Klick på en medlemsbetalning → befintliga `/membership/:membershipId`.
- **`account`-sidan ändras inte.** Den listar `Memberships`, inte `Payments`
  (`app/imports/pages/account/Memberships.jsx`), så den innehåller redan bara
  medlemskap — inget att avgränsa.

### 5. Admin: se och filtrera betalningarna

`admin/imports/tabular/payments.js`:

- Ny kolumn "Kind": medlemsbetalning eller vara (varans kod). Härled från
  `storeItem`.
- **Status-renderaren är fel för varuköp som den är skriven** (rad ~9): den visar
  `Untreated`/rött för allt utan `membership`, så varje varuköp skulle stå
  obehandlat för alltid. Lägg till ett fall för `storeItem`.
- Filtrering: separata tabeller (`StorePayments`, `MembershipPayments`) via
  `changeSelector` är den minsta ändringen och följer hur `ManualPayments` och
  `AutomaticPayments` redan skiljs åt.

### 6. Kvitto: ny malltyp `purchase`

Medlemskap får ett bekräftelsemejl genom mallsystemet
(`sendConfirmationEmail` i `payment/server/api/payments.js:172`). Varuköp ska få
motsvarande kvitto samma väg, så texten kan redigeras i admin utan kodändring.

**Ny typ, inte en variant av `confirmation`.** `findBestTemplate` väljer mall
inom en typ och rangordnar på `membershiptype`/`membertype` — begrepp som inte
finns för ett varuköp. Att lägga varukvitton i `confirmation` skulle innebära att
ett medlemskapsköp kan få ett varukvitto som "bästa" mall när ingen bättre
kandidat finns. Skilda typer kan inte förväxlas.

- `common/lib/models.js`, `template.type`: nytt alternativ `purchase: "Purchase"`.
  Fältet är `max: 15`, så värdet ryms.
- `template.membershiptype`/`membertype` lämnas tomma på en varumall. Det kräver
  ingen ändring i `findBestTemplate`: anropas den med båda `undefined` blir en mall
  med tomma fält högst rankad. **Var dock beredd på** att AutoForms `"": "Any"`
  kan spara tom sträng snarare än att utelämna fältet — `"" !== undefined` sänker
  då poängen från 6 till 4, vilket fortfarande vinner så länge det bara finns
  varumallar av typen. Verifiera med en sparad mall.
- Vill man senare ha olika text per vara är den naturliga analogin till
  `membershiptype` ett `storeItemCode` på mallen plus ett steg i `score`. Inte nu.

**`messageData` behöver varans och betalningens uppgifter.** Signaturen är i dag
`messageData(memberId, templateId, membershipId)` och tredje argumentet är
hårdkodat till ett medlemskap. Byt det till ett options-objekt,
`messageData(memberId, templateId, { membershipId, paymentId })` — bara två av sju
anropare skickar tredje argumentet i dag (`payment/server/api/payments.js:183`
och `admin/client/ui/message/SendMessage.js:38`), så bytet är billigt och
undviker en fjärde positionsparameter.

Nya variabler när `paymentId` är satt: `itemName`, `itemCode`, `amount`,
`comment`, `purchaseDate`. `amount` finns redan för medlemskap och betyder samma
sak, så den återanvänds.

- `admin/client/ui/messagetemplate/templateTesting.js` har en `SAMPLE_DATA` som
  enligt sin egen kommentar "mirrors every variable surfaced by messageData()"
  och används som validitetsgrind före sparning. **De nya variablerna måste in
  där också**, annars går en varumall som använder dem inte att spara.
- `message`-modellen har `membership` men inget `payment`. Lägg till `payment`
  (optional) så kvittot går att spåra till sitt köp, precis som ett
  medlemskapsmejl går att spåra till sitt medlemskap.
- `processStorePurchase` anropar en `sendPurchaseReceipt` byggd som tvilling till
  `sendConfirmationEmail`: samma tysta felhantering (ett trasigt mejl får inte
  fälla betalningshanteringen), samma `isEmailAllowed`-grind, samma
  `Messages.insertAsync` + `pushMessage`.

### 7. Bokföring

`admin/imports/accounting/match.js:59` klassar en betalning som medlemsbetalning
bara om meddelandet innehåller `pt:`, så `ws:`-köp faller igenom — men de matchar
inte heller någon income code, och blir därför **`unclassified-payment`** med
diagnosen "link it to a member/membership in the Payments view". Utan åtgärd blir
varje varuköp manuellt arbete i varje månadsavstämning.

- Ny klassificering `isStorePayment(payment) = !!payment.storeItem`, med kontot
  hämtat från varan — inte genom att sträng-matcha meddelandet.
- Ny verifikationsgren i `toVerifications` (`sie.js:40`), en tvilling till
  `'S'`-grenen: bank debet, varans `bookkeepingAccount` kredit, texten från varans
  namn och köparen.
- Enhetstester i `admin/tests/accounting.tests.js`, som redan har fixturer för
  bankfil och matchning.

## Risker att bevaka

- **Swish-meddelandet kapas vid 50 tecken** (`sanitizeForSwish`,
  `app/server/methods/utils.js:198`). `ws:<kod> mid:<mid> <namn>` — koden först,
  så det är namnet som faller bort vid trunkering, aldrig koden. Därav `max: 12`
  på koden.
- **Meddelandet är inte identiteten.** Kopplingen går via `externalId` →
  `initiatedPayment` → `storeItem`. Prefixet finns för människor som läser
  bankutdraget och för att skilja klasserna åt i avstämningen. Parsa aldrig
  varukoden ur meddelandet — den kan vara trunkerad, och en köpare kan skriva
  vad som helst i sitt eget meddelande.
- **Beloppet får aldrig komma från klienten.** Ett fritt pris är ett *intervall*
  servern validerar, inte ett värde den litar på. Samma sak för
  `requiresMembership` — kontrollera på servern, inte bara genom att gömma knappen.
- **`price` saknas betyder fritt pris.** En vara som råkar sakna pris av misstag
  blir alltså gratis att sätta själv. Kräv `bookkeepingAccount` och antingen
  `price` eller `minPrice` i schemat så en halvfärdig vara inte går att publicera.
- **Dölj, radera inte.** En raderad vara lämnar betalningar med en `storeItem` som
  inte går att slå upp, både i appens historik och i bokföringen. Därav `status`.
- **Familjemedlemmar**: `requiresMembership` måste räkna medlemskap via
  `memberStatus`, som redan hanterar `infamily` — en familjemedlem har giltigt
  medlemskap genom den betalande.
- **`messageData` saknar ett `await` i dag** (`common/lib/message.js`):
  `const status = memberStatus(member)` — men `memberStatus` är `async`
  (`common/lib/utils.js:27`), så `status` är ett Promise och
  `status.memberStart`/`status.labStart` är `undefined`. Variablerna
  `memberStartDate` och `labStartDate` är alltså trasiga i *alla* mallar redan nu,
  inklusive medlemskapsbekräftelserna. Rätta det innan varumallen byggs, annars
  ärver kvittot samma fel — och rättningen ändrar innehållet i befintliga utskick,
  så den förtjänar en egen commit.

## Verifiering

**Ingen testning mot huvuddatabasen** — inga testköp eller dokumentändringar i
umsme-DB:n.

- Enhetstester enligt etablerat mönster (rena moduler + fixturer i
  `admin/tests/`, importerade från `main.js`): prisvalidering (fast pris ignorerar
  klientens belopp, fritt pris mot min/max), `requiresMembership` mot en
  familjemedlem, och bokföringsklassificeringen av ett varuköp.
- `payment/tests/` har redan `processPayment`-tester med egna fixturer och en
  `clearTestData()` som tömmer `Members` — **kör dem aldrig med `MONGO_URL`
  satt**. Lägg `processStorePurchase`-tester vid sidan av dem.
- Storybook för butiken, varusidan, mina köp och landningssidan; inklusive fritt
  pris, obligatorisk kommentar och en vara som kräver medlemskap sedd av en
  icke-medlem.
- Kvittomallen: att `findBestTemplate({ auto: true, type: "purchase" })` verkligen
  hittar den sparade mallen (se varningen om tom sträng kontra utelämnat fält), att
  "Test templates"-knappen i admin renderar de nya variablerna, och att ett
  medlemskapsköp aldrig får en varumall eller omvänt.
- Swish-callbacken testas mot payment-tjänstens dev-server med en påhittad
  `PAID`-payload, som `payment/tests` redan gör.
- Live-test av ett riktigt köp görs av Matthias.

## Frågor som lämnas öppna

- **Leverans och lager.** En t-shirt måste hämtas och finns i begränsat antal.
  Ingenting i denna plan spårar lager eller utlämning; köpet är bara betalningen.
- **Återbetalning.** Om en kurs ställs in finns ingen väg tillbaka i systemet i
  dag; det blir en manuell swish och en anteckning.
- **En mall per vara.** Kvittot blir en och samma text för alla varor. Behövs
  olika texter för kurs och lera är utbyggnaden beskriven i avsnitt 6.
