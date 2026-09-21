# Tillåt plats och notiser

Appen ber om två behörigheter från telefonen: **plats**, som behövs för att låsa upp dörrarna, och **notiser**, som gör att appen kan påminna dig innan medlemskapet går ut och berätta när det kommit ett nytt meddelande. Den här guiden går igenom när frågorna dyker upp, vad som händer om du tackar nej, och hur du ändrar dig i efterhand på Android och iPhone.

Båda behörigheterna är frivilliga. Allt annat i appen — förnya medlemskapet, läsa meddelanden, se ditt konto och din profil — fungerar utan dem.

## 1. När appen frågar

### Plats

Appen börjar leta efter din position så fort den öppnas, oavsett vilken sida du landar på. Första gången visar telefonen därför en systemfråga i stil med *"app.uppsalamakerspace.se vill använda din plats"* nästan direkt. Välj **Tillåt när appen används** (Android) eller **Tillåt vid användning av appen** (iPhone). Appen behöver aldrig din plats i bakgrunden.

På iPhone kan du få två frågor i rad första gången: först en från iOS om att Safari eller webbappen får använda platstjänster alls, sedan en för just den här webbplatsen. Svara ja på båda.

Platsen används bara till en sak: när du trycker på en dörrbricka kontrollerar makerspacet att du verkligen står vid entrén innan låset öppnas. Positionen skickas inte till servern i något annat läge och sparas inte.

### Notiser

Frågan om notiser kommer först när du är inloggad och har landat på hemsidan som medlem. Då ber appen telefonen om tillstånd att skicka push-notiser, och systemet visar sin vanliga fråga.

På iPhone är det inte säkert att frågan kommer av sig själv — iOS kräver att du själv trycker på något för att en webbapp ska få fråga. Titta då på **klockikonen** uppe till höger: ett gult **!** betyder att notiser inte är påslagna. Tryck på klockan så kommer du till **Aviseringsinställningar**, och tryck där på **Tillåt aviseringar**. Då kommer systemfrågan.

![Aviseringsinställningar innan notiser är tillåtna, med knappen "Tillåt aviseringar"](../screens/notifications-ask-sv.png)

Notiser fungerar bara i den **installerade appen** på iPhone. Öppnar du sajten i Safari-webbläsaren visar Aviseringsinställningar i stället en knapp för att installera appen — se guiden [Installera appen](installApp.html). På Android fungerar notiser både i Chrome och i den installerade appen.

## 2. Vad händer om du säger nej

### Utan plats

Dörrar-sidan fungerar inte. Dörrbrickorna förblir grå, och högst upp visas en röd ruta med texten *"Platsåtkomst nekad. Aktivera platsdelning för att låsa upp dörrar."* följt av en länk till den här guiden. Under brickorna finns panelen **Dörren blir inte grön?** som säger samma sak.

![Dörrar-sidan när platsåtkomst har nekats](../screens/doors-denied-sv.png)

Telefonen frågar inte igen av sig själv. Både Android och iPhone kommer ihåg ett nej, så för att komma vidare måste du ändra inställningen manuellt enligt avsnitt 3 och sedan trycka på **Försök igen** i panelen.

### Utan notiser

Du får inga push-notiser. Det betyder konkret:

- **Ingen påminnelse** cirka 14 dagar innan medlemskapet går ut. Påminnelsen skickas bara som notis, inte som e-post, så utan notiser får du ingen förvarning alls.
- **Ingen signal** när styrelsen skickar ett utskick eller ett personligt meddelande till dig.

Meddelandena finns fortfarande i appen — du hittar dem under **Meddelanden** på hemsidan — men du måste själv öppna appen för att se att något nytt har kommit. Klockikonen fortsätter visa det gula **!** som en påminnelse om att notiser är av.

## 3. Ändra dig i efterhand

### Android (Chrome)

Chrome hanterar behörigheterna per webbplats, och den installerade appen delar inställningarna med Chrome. Det finns tre vägar in, välj den som passar:

**Via appikonen (installerad app):** håll fingret nedtryckt på **UMS**-ikonen, tryck på **Appinfo** (ⓘ), välj **Behörigheter** och sätt **Plats** till *Tillåt endast när appen används* och **Aviseringar** till *Tillåt*.

**Via Chromes inställningar:** öppna Chrome, tryck på **⋮** uppe till höger, välj **Inställningar** → **Webbplatsinställningar**. Under **Plats** respektive **Aviseringar** hittar du *app.uppsalamakerspace.se* i listan över blockerade webbplatser — tryck på den och välj **Tillåt**.

**Via adressfältet (i webbläsaren):** när du har sajten öppen i Chrome, tryck på **låsikonen** eller ikonen för inställningar till vänster om adressen, välj **Behörigheter** och slå på det du saknar.

### iPhone

iOS behandlar webbappen på hemskärmen som en del av Safari, så platsbehörigheten ligger under Safari i stället för under en egen UMS-post.

**Plats:** öppna **Inställningar** → **Safari** → **Plats** och välj **Fråga** eller **Tillåt**. Kontrollera också att **Inställningar** → **Integritet och säkerhet** → **Platstjänster** är på och att **Safari-webbplatser** där står på *Vid användning av appen*. Öppna sedan appen och gå till Dörrar — med **Fråga** valt ställs frågan på nytt, tryck **Tillåt**.

**Notiser:** när appen har frågat en gång får webbappen en egen rad i **Inställningar** → **Aviseringar**. Leta upp **UMS** där och slå på **Tillåt aviseringar**. Har appen aldrig frågat, gå i stället in i appen, tryck på klockan med det gula **!** och sedan på **Tillåt aviseringar**.

### Kontrollera att det fungerar

- **Plats:** gå till **Dörrar**, öppna panelen **Dörren blir inte grön?** och tryck **Försök igen**. Den röda rutan ska försvinna och brickorna visa ett avstånd. Står du vid makerspacet blir de gröna.
- **Notiser:** tryck på klockan. Det gula **!** ska vara borta och **Aviseringsinställningar** visa *Push-aviseringar aktiverade* med gröna reglage för de kategorier du vill ha.
