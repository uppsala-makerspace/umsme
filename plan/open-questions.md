# Öppna frågor under migreringen (grenen `admin-react-waves`)

Det som behöver användarens beslut, antecknat medan arbetet fortsätter.
Varje punkt: modul, frågan, vad som är gjort i väntan.

## certificates

- **Radera ett certifikat som har innehavare.** Blaze raderade certifikatet
  och lät dess attestationer ligga kvar utan certifikat. Det gör
  `removeCertificate` fortfarande (och tar nu också bort det som
  förkunskapskrav hos andra). Ska radering i stället nekas så länge någon
  har certifikatet? Gjort i väntan: oförändrat beteende.
- **Testinställningar och testförsök kräver rollen admin** (`tests.*`), medan
  resten av certifikaten är admin och board. Board ser testet men kan inte
  byta det och ser inte medlemmars testförsök. Ska board få göra det?
  Gjort i väntan: oförändrat.

## door

- **Knappen "Sync door visits" på dörrstatistiken** anropade metoden
  `mailLockHistory`, som inte finns, och gjorde alltså ingenting. Den är
  borttagen. Synk och mejl av låsöppningar finns kvar som
  `forceSyncDoorUnlocks` i admin-konsolen och som cron-jobb. Ska knappen
  finnas på dörrsidan (och då göra vad)? Gjort i väntan: borttagen.
- **"Check unlocks in db"** räknade den gamla samlingen `Unlocks`, som
  migreringen i admin-konsolen tömmer. Den räknar nu `DoorUnlocks` i stället
  ("Count recorded visits"). Stapeln "0" (alltid noll) är borttagen.
- **Metoden `syncAndMailLockHistory`** mejlar till en hårdkodad adress
  (mpalmer@gmail.com) och anropas inte av någon sida. Ta bort, eller låta
  den följa `private.doorunlockMail` som cron-jobbet gör? Gjort i väntan:
  orörd.

## bank, membership

- **Mobilnumret följer med när en betalning kopplas till en medlem.** Blaze-
  koden försökte kopiera betalningens mobilnummer till en medlem som saknar
  ett, men det blev aldrig av (ett `findOneAsync` utan `await`). Nu görs det
  (`assignPaymentMember`). Önskat? Gjort i väntan: som koden avsåg.
- **`setPnr` skriver över hela `profile`** på användaren (`$set: { profile:
  { pnr } }`), och tar alltså bort t.ex. `profile.name`. Ska bara `profile.pnr`
  sättas? Gjort i väntan: orört.
- **Medlemskapssidan sparar och går till medlemmen**, som Blaze gjorde
  ("Update and go back to member"). Ska den stanna kvar med "Saved." som de
  andra React-sidorna? Gjort i väntan: som Blaze.

## message, mail

- **Utskick i demo och e2e.** `settings_demo.json` har `deliverMails: false`,
  så `mail`-metoden vägrar och inga meddelanden kan skickas (och sparas) i
  demo eller e2e; testerna kan bara se att vägran visas. Mottagarna skyddas
  redan av `private.recipientWhitelist: []` (ingen får något). Ska demo-
  inställningarna ha `deliverMails: true`, så att flödet går hela vägen och
  meddelandena sparas? Gjort i väntan: orört.

- **Gruppmejl skickas nu från servern** (`mails.send`): mallen renderas och
  varje mejl skickas på servern, och utskicket sparas först när alla är
  skickade. Förr gjorde webbläsaren det, ett mejl i taget. Mallar körs med
  underscore `template`, alltså kod (`<% %>`), nu på servern, som
  meddelandemallarna redan gjorde. Bara admin får skicka. Okej?
- **Mottagarlistan redigeras genom att ta bort** personer (chips med kryss),
  inte i ett fritt textfält. Det gamla fältet kunde ändå bara ta bort: okända
  adresser föll bort när mejlet skickades. Okej?
- **Att radera ett mejl** tar nu också bort länken från utskicket som
  skickades med det (`mailId`), så att "View sent mail" inte leder fel.
  Utskicket står kvar som skickat.

## admin-konsolen

Flyttat till React (`/admin`): Danalock-synken, sammanslagning av medlemmar
och det obligatoriska certifikatet till alla. Engångsverktygen står kvar
under dem, på den gamla Blaze-sidan (`AdminOneOffTools`), tills du bestämt
vilka som ska vara kvar. För vart och ett: behålla (som servermetod med
React-knapp) eller ta bort?

- **Migrate legacy unlocks to doorunlocks** (`migrateUnlocksToDoorUnlocks`,
  servermetod). Behövs inte om `unlocks` redan är tom i produktion.
- **Update members with correct dates** (`updateMembers`, servermetod).
  Medlemssidan har redan "Update dates" per medlem.
- **Detect mobile numbers in payments**: skriver i `Payments` från
  webbläsaren.
- **Update member mobile numbers from payments**: skriver i `Members` från
  webbläsaren.
- **Accept all current paying members**: skriver i `Members` från
  webbläsaren.
- **Lowercase member emails** (`lowercaseMemberEmails`, servermetod).

De tre som skriver från webbläsaren är det sista som håller kvar
allow-reglerna på `Members` och `Payments`. När de är borta eller flyttade
till servern kan reglerna tas bort.
