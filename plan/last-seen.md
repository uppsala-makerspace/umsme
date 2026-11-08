# Plan: Senaste aktivitet i appen (`lastSeenAt`)

## Kontext

I admin vill vi se vilka som använder medlemsappen och när de senast var inne.
I dag sparas ingen sådan tidpunkt (bara `createdAt` på användaren). Planen togs
fram tillsammans med "Byt användare" (grenen `impersonation`) men sköts upp för
att den funktionen skulle göras först.

Visas i **användarlistan** och på **medlemsdetaljen** i admin.

## Registrera (app-servern)

- Nytt fält `lastSeenAt` (Date) på `Meteor.users`. Lägg till det, optional, i
  `models.users` i `common/lib/models.js` (schemat används för formulär; inget
  Collection2-schema är kopplat till `Meteor.users`).
- Ny helper `touchLastSeen(userId)` i `common/server/users/lastSeen.js`:
  en enda uppdatering som bara skriver om värdet saknas eller är äldre än
  15 minuter (`{_id, $or: [{lastSeenAt: {$exists: false}}, {lastSeenAt: {$lt: cutoff}}]}`),
  så att täta anrop inte ger skrivningar.
- Anropa den från `Accounts.onLogin` i `app/server/accounts.js` (fångar varje
  appstart och återanslutning) och från `findInfoForUser`
  (`app/server/methods/memberInfo.js`), som klienten anropar var 5:e minut medan
  appen är öppen.
- **Inte** när anslutningen är ett byte av användare — använd
  `impersonationOf` från `app/server/impersonation/` — annars skulle admins
  tittande räknas som medlemmens besök.
- Bara app-servern skriver fältet; inloggning i admin räknas inte.

## Visa (admin)

- `common/server/users/users.js`: lägg `lastSeenAt` i `USER_FIELDS`, tillåt
  sortering på det i `usersPage` och ta med det i raderna och i `userDetail`.
- `admin/imports/ui/users/UserList.jsx`: ny kolumn "Senast i appen" (datum +
  tid, tomt = aldrig). Uppdatera `UserList.stories.jsx` med fixturer som har
  och saknar värdet. Visa även fältet i `UserView.jsx`.
- `common/server/members/members.js` (`memberDetail`, där det länkade kontot
  slås upp): hämta även `lastSeenAt` och returnera det i `user`.
  `admin/imports/ui/members/MemberView.jsx`: visa "Senast i appen" bredvid
  länken till användarkontot. Uppdatera dess story.
- Visa gärna även "senast i appen" i sökresultaten på `/impersonate` i appen.

## Seed

Valfritt fält `lastSeen` (dagförskjutning) på personor i
`common/server/seed/scenarios/personas.js`, satt via `Meteor.users.updateAsync`
i `makePersonas` (`build.js`). Demo-scenariots bulkanvändare (`demo.js`) får
slumpade värden, några utan värde (aldrig inne).

## Test

- `touchLastSeen` skriver inte inom 15 minuter.
- Skriver inte under ett byte av användare.
- Admin: kolumnen sorterar, tomt värde visas som "aldrig".
