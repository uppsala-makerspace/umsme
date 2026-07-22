# Plan: Synka verkstadsgruppers medlemskap med privata Slack-kanaler

## Kontext

En verkstadsgrupp (och potentiellt vilken grupp som helst) har ett `slackChannel`
i datamodellen. Idag är kopplingen bara informativ — appen länkar till kanalen.
Vi vill att den aktiva medlemslistan i en grupp ska vara **källan till sanning**
för vilka som är med i gruppens privata Slack-kanal: blir man godkänd i gruppen
bjuds man in i kanalen, lämnar man gruppen kickas man ut.

Detta är exakt samma mönster som redan finns för Meteor-roller i
`common/server/linkedRoleSync.js` (gruppen är master, manuella ändringar skrivs
över vid nästa synk). Slack-synken byggs som en tvilling till den.

### Varför bot-token, inte user-token
- En bot-token (`xoxb-…`) hör till Slack-appen, inte en person — överlever
  personalbyten och är tydlig i kanalen.
- Privata kanaler är osynliga för API:et om inte identiteten är **medlem** i
  kanalen. Boten måste alltså bjudas in manuellt en gång per kanal
  (`/invite @roboten`). Detta gäller oavsett bot eller user-token.
- Infrastrukturen finns delvis redan: `private.slack.botToken` läses av
  `scripts/fetch-slack-channels.js`, som redan anropar `conversations.list`.

## Förutsättningar (utanför koden)

1. **Slack-appens bot-scopes** utökas i api.slack.com → appen → OAuth & Permissions:
   - `groups:write` — bjuda in (`conversations.invite`) och kicka
     (`conversations.kick`) i privata kanaler.
   - `groups:read` — läsa medlemslista (`conversations.members`) och lista de
     privata kanaler boten är med i.
   - `users:read.email` — `users.lookupByEmail` för att mappa en medlems e-post
     till dess Slack-user-ID (`U…`). **Nyckeln till hela synken.**
   Efter scope-ändring måste appen ominstalleras i workspace och `botToken`
   uppdateras i `settings.json`.
2. **Boten bjuds in manuellt** i varje privat kanal som ska synkas.
3. **Kick-beteende måste testas tidigt** (se Risker) — det kan styra designen.

## Ändringar i koden

### 1. Slack Web API-klient — `common/server/slack/slackApi.js` (ny)
Tunn wrapper runt `fetch` (Meteor `meteor/fetch`, som `slackChannel.js` redan
använder). Läser `Meteor.settings.private.slack.botToken`. Funktioner:
- `lookupUserIdByEmail(email)` → `users.lookupByEmail`, returnerar `U…` eller
  `null` (hanterar `users_not_found` tyst).
- `channelMembers(channelId)` → `conversations.members` (paginerar `cursor`).
- `inviteUsers(channelId, userIds)` → `conversations.invite` (batchar, max 1000/anrop).
- `kickUser(channelId, userId)` → `conversations.kick`.
- `findChannelIdByName(name)` → `conversations.list?types=private_channel`
  (matchar namn utan `#`); resultatet cachas/sparas (se punkt 3).
Alla returnerar strukturerat resultat och loggar Slack-felkoder
(`ok:false` → `error`-fältet). Dev-escape som i `slackChannel.js`: om `botToken`
saknas, logga och no-op i stället för att kasta.

### 2. Kanal-ID på gruppen — `common/lib/models.js`
Slack vill ha kanal-ID (`C…`/`G…`), inte namn. Lägg fält `slackChannelId`
(optional, `autoform.omit`) på `group`. Fylls i av synken via
`findChannelIdByName` första gången (lazy), så admin fortsätter bara skriva
kanalnamnet i `slackChannel`. Rensas om `slackChannel` ändras.

### 3. Synkmodul — `common/server/slackChannelSync.js` (ny), speglar `linkedRoleSync.js`
- `slackUserIdsForGroup(groupId)`: aktiva medlemmar → deras `Members`-dokument →
  `lookupUserIdByEmail(member.email)`. Returnerar set av `U…` (hoppar tyst över
  medlemmar utan Slack-konto).
- `syncSlackChannel(group)`:
  1. Returnera om gruppen saknar `slackChannel` eller om `botToken` saknas.
  2. Lös `slackChannelId` (lazy via `findChannelIdByName`, spara på gruppen).
  3. `desired` = `slackUserIdsForGroup`; `current` = `channelMembers` **minus
     bot-user-id och ev. app-/integrationsanvändare** (boten får aldrig kicka
     sig själv → `cant_kick_self`).
  4. `invite` de i `desired \ current`, `kick` de i `current \ desired`.
  5. Fånga per-användar-fel (t.ex. `not_in_channel`, `restricted_action`) och
     logga utan att avbryta hela synken.
- `syncSlackChannelById(groupId)`: hämta grupp + `syncSlackChannel`.
- `syncSlackForUser(user)`: grant-only catch-up vid login (en medlem kan ha
  godkänts i grupper innan Slack-kontot fanns / e-posten verifierades), speglar
  `syncLinkedRolesForUser`.

### 4. Anropspunkter — `app/server/methods/groups.js`
Vid varje ställe som redan anropar `syncLinkedRole(group)`, anropa även
`syncSlackChannel(group)` (efter medlemskaps-mutationen):
- `groups.join` (öppen grupp → direkt aktiv) — rad ~239
- `groups.leave` — rad ~270
- `groups.approve` — rad ~290
Anropen görs "fire-and-forget med fellogg" (Slack-fel får aldrig fälla
medlemskaps-operationen) — antingen `try/catch` runt varje, eller en gemensam
hjälpare `safeSlackSync(group)`.

### 5. Login-catch-up — `app/server/accounts.js`
I `Accounts.onLogin`-hooken, bredvid `syncLinkedRolesForUser(user)`, anropa
`syncSlackForUser(user)` (egen try/catch, som den befintliga).

### 6. Admin: manuell full-synk (valfritt men rekommenderat)
Metod `adminGroups.resyncSlack(groupId)` + knapp i `admin/client/ui/groups/`
för att köra `syncSlackChannelById` på begäran (felsökning + initial synk av
en kanal som fyllts på manuellt innan integrationen fanns).

### 7. settings — `app/settings_example.json`
`private.slack.botToken` finns redan. Dokumentera de nya scopes som krävs i en
kommentar/README-not. Ev. `private.slack.botUserId` (för att exkludera boten i
kick-steget) — annars härledas via `auth.test` en gång.

## Risker och gränsfall

- **`conversations.kick` med bot-token är kinkig.** Kan ge `restricted_action`
  beroende på workspace-inställning (vem får ta bort medlemmar) och vägrar alltid
  `#general`. **Testa detta först av allt.** Om det inte fungerar med bot-token:
  fallback är en user-token enbart för kick, medan invite/läsning går via boten.
- **Medlem utan Slack-konto / annan e-post i Slack än i medlemsregistret** →
  `lookupByEmail` ger `null`; personen hoppas tyst över. Värt att logga så det
  går att felsöka "varför kom jag inte in i kanalen".
- **Boten inte inbjuden i kanalen** → `conversations.members`/`invite` ger
  `not_in_channel`. Synken ska logga tydligt och no-op:a, inte krascha.
- **Rate limits** (Slack Tier 2/3, ~20–50 rpm). En full omsynk av många kanaler
  bör serialiseras/strypas; batcha invites (ett anrop tar flera användare).
- **Master-principen**: precis som linked roles skrivs manuella kanaländringar
  över. Detta måste kommuniceras — den som manuellt lägger till någon i en synkad
  kanal får se dem kickade vid nästa synk om de inte är aktiva gruppmedlemmar.
- **Vilka grupptyper?** Börja med verkstadsgrupper (de har privata kanaler idag).
  Synken triggas ändå bara för grupper med ifyllt `slackChannel`, så det
  begränsar sig självt.

## Verifiering

- **INGEN testning mot användarens huvuddatabas** (mongodb) — inga testanvändare,
  inga dokumentändringar. Enhetsnära test av `slackChannelSync` med mockad
  `slackApi` (invite/kick-diffen är ren logik).
- **Slack-sandbox**: testa mot en separat testkanal i workspace där boten är
  inbjuden. Verifiera i tur och ordning: `lookupByEmail`, `conversations.members`,
  `invite`, och **`kick`** (den osäkra) — innan resten byggs.
- **Handskakningstest av scopes** via `auth.test` och ett manuellt
  `conversations.kick`-anrop med `curl` innan kodintegrationen, så vi vet att
  workspace-inställningarna tillåter det.
- Live-synk av en riktig grupp görs av Matthias när koden är på plats.

## Öppna beslut (att ta innan implementation)

1. Ska synken gälla alla grupptyper eller bara verkstadsgrupper?
2. Ska en medlem som saknas i Slack få en notis (t.ex. via managerEvents) så att
   någon kan följa upp?
3. Fungerar `conversations.kick` med bot-token i vår workspace, eller behövs
   user-token-fallback för kick?
