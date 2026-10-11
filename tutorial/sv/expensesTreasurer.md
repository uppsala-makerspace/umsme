# Utlägg för kassören

Den här guiden är för dig som är kassör. Den visar hur du betalar fakturor och återbetalar kvitton som har godkänts. Allt görs i admin. Hur utlägg görs och godkänns i appen beskrivs i guiden [Utlägg](expenses.html).

## 1. Det här gör kassören

Ett utlägg når kassören när det har godkänts och står som **Confirmed** (Bekräftat). Då ska det betalas:

- **Kvitto** — medlemmen har redan betalat. Du för över beloppet till medlemmens bankkonto.
- **Faktura** — ingen har betalat än. Du betalar fakturan till leverantören, med betalningsuppgifterna på fakturan.

När betalningen är gjord markerar du utlägget i admin och väljer vilket **bokföringskonto** det ska bokföras på. Det kopplar utlägget till rätt rad när bankfilen sedan bokförs.

Godkännandet sköts av kontots godkännare i appen. Styrelsen kan också bekräfta inskickade utlägg i admin, under **Economy** → **Confirm expenses**.

## 2. Hitta det som ska betalas

Logga in i admin och välj **Economy** → **Reimburse expenses** i menyn. Sidan har två listor:

- **Invoices to pay** — fakturor som ska betalas, den som förfaller först överst. Förfallodatumet blir gult när det närmar sig och rött när det har passerat.
- **Receipts to reimburse** — kvitton som ska återbetalas till medlemmar.

Klicka på en rad för att öppna utlägget.

## 3. Återbetala ett kvitto

Utläggets sida visar medlemmen, beloppet, kontot och kvittobilden till höger. Klicka på bilden för att förstora den. Under **Bank account** står medlemmens bank, clearingnummer och kontonummer, och en sammanslagen sifferserie att klistra in i banken. Kontrollera alltid formatet mot det din bank kräver.

1. Gör överföringen i banken.
2. Välj **Bookkeeping account** i panelen under uppgifterna.
3. Ange **Reimbursement date**, dagen då pengarna gick iväg.
4. Klicka på **Mark as reimbursed** och bekräfta.

**Varför datumet och bokföringskontot spelar roll.** När bankens transaktioner senare importeras för bokföringen matchas varje utbetalning automatiskt mot rätt utlägg. Matchningen bygger på belopp och datum: beloppet måste vara exakt detsamma, och datumet du anger här får skilja högst fem dagar från bankens transaktionsdag. Datumet behöver alltså inte vara exakt, men ju närmare desto bättre. Två saker gör att en utbetalning inte matchas automatiskt och måste bokföras för hand: att utlägget saknar bokföringskonto, och att två återbetalade utlägg med samma belopp ligger inom samma fem dagar, eftersom matchningen då inte kan avgöra vilket som är vilket.

Står det *no bank account on file* har medlemmen inte fyllt i sitt bankkonto. Be dem göra det under **Min profil** i appen.

## 4. Betala en faktura

En faktura visas med etiketten **Invoice**, förfallodatum och leverantör. Där bankkontot står för ett kvitto står i stället att leverantören ska betalas enligt fakturan. Är fakturan en PDF öppnar du den med **Open PDF invoice**.

1. Betala fakturan i banken med uppgifterna på fakturan.
2. Välj **Bookkeeping account**.
3. Ange **Payment date**.
4. Klicka på **Mark as paid** och bekräfta.

Betalningsdatumet och bokföringskontot används för den automatiska matchningen mot banken på samma sätt som för kvitton, se ovan.

## 5. Om något blev fel

- **Fel konto eller datum:** klicka på **Undo "mark as reimbursed"** (eller *paid*). Utlägget går tillbaka till Confirmed, med kontot och datumet kvar ifyllda, och du kan markera det igen.
- **Godkänt av misstag:** klicka på **Undo confirmation** och sedan **Yes, undo the confirmation**. Utlägget går tillbaka till Submitted och måste godkännas igen, i admin eller av en godkännare i appen. Det går bara så länge utlägget inte är betalt.
- **Utlägget ska inte betalas:** klicka på **Reject…** och skriv en anledning. Medlemmen ser anledningen i appen och kan rätta och skicka in igen.

Du kan inte återbetala dina egna utlägg; det får någon annan göra.
