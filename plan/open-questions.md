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

