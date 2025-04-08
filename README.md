# Medlemsadministration

## Installera och köra igång - meteor utvecklarläge

    cd umsme
    curl https://install.meteor.com/ | sh

Kopiera `settings.json_example` till `private/settings.json` och anpassa, sen är det bara att köra:

    meteor

### Driftsätta
Sen fört skapa en build som passar din arkitektur, t.ex:

    meteor build ../umsme-build --architecture os.linux.x86_64

Men innan du gör detta se till att du har tre tomma filer: `settings.json`, `users.json` och eventuellt `members.csv` i private katalogen. Detta för att dessa ska finnas i ett index som gör att de går att slå upp i driftmiljön.

Se till att du har node (version 12), npm och mongodb installerat i din driftmiljö. Packa sen upp paketet på lämpligt ställe, förslagsvis genom att ha ett intialiseringsscript (`install.sh`) som ser ut som:

    #/bin/bash
    mkdir app
    rm -rf bundle
    tar xfz umsme.tar.gz
    cd bundle/programs/server/assets/
    rm -rf app
    ln -s ../../../../app .
    cd ..
    npm install

I katalogen app kan du lägga in filerna `settings.json`, `users.json` och `members.csv` utan att de påverkas av att du installerar nya paket.

Skapa sen skriptet `run.sh` som du lägger parallellt med installeringsscriptet: 

    #/bin/sh    
    cd bundle
    PORT=3000 \
    MAIL_URL=smtp://user:password@mail.uppsalamakerspace.se:587?tls.rejectUnauthorized=false \
    MONGO_URL=mongodb://localhost:27017/umsme ROOT_URL=https://umsme.uppsalamakerspace.se \
    node main.js

Se sektionen om maila från systemet nedan om hur `MAIL_URL` ska sättas.
Katalogen `private` ska ligga under `bundle/server`, den används både för konfiguration (`settings.json`), användarhanteirng (`users.json`) och import av data (`members.csv`). 

## Användarhantering
Användarhantering sker genom en fil `private/user.json` som ser ut som:

    [
      {username: 'john', password: '12345'}
    ]

Om du tar bort användare från denna fil kommer de tas bort från databasen, det är också möjligt att ändra lösen genom att ändra i denna fil.
Om filen inte finns så kommer varken användare läggas till eller tas bort. Däremot kommer då det skrivas ut i konsolen vilka användare som finns.

## Integration med Swedbank
Integration med Swedbank görs via ett separat bibliotek [umsme-bank](https://github.com/uppsala-makerspace/umsme-bank).
Efter att det installeras bör man ändra i settings.json för att peka ut rooten i REST api:et. Det är två värden som behöver sättas:

    "bankproxy": "http://localhost:8000/",
    "syncNrOfTransactions": 20,

## Maila från systemet
För att det ska gå att skicka mail måste man sätta miljövariabeln `MAIL_URL`. Det enklaste är att man sätter variabeln i samma kommando som man sätter igång meteor, så vi modifierar kommandot ovan till att vara:

    MAIL_URL=smtp://username:password@mail.uppsalamakerspace.se:587?tls.rejectUnauthorized=false meteor --settings settings.json

Där `username` typiskt är en email som `kansliet@uppsalamakerspace.se`.
Observera att man kan också slå av mailskickning i settings.json genom följande nyckelvärde:

      "deliverMails": false 

## Backup

Vi använder mongodump och mongorestore. Först måste man se till att ha dessa verktyg installerade, via apt blir der:

    sudo apt install mongo-tools

Nedam är ett exempel på hur man gör en backup namngiven som ett visst datum (2020-01-30):

    mongodump -h 127.0.0.1 --port 3001 --forceTableScan -d umsme -o backup/2020-01-30

För att återställa motsvarande backup med mongorestore:

    mongorestore -h 127.0.0.1 --port 3001 --drop -d umsme backup/2020-01-30/meteor
    
Observera att namnet för databasen ovan är satt till umsme, vilket är det föreslagna namnet i en driftsatt version, i utvecklarläget kommer defaultnamnet vara `meteor`.

### Resetta databasen
Om du av någon anledning vill börja om från början kan du stänga ner applikationen och sen:

   meteor reset
   
Därefter är det bara att starta igen.

Om du kör i driftsatt läge får ta bort databasen via:

    mongo
    > use umsme
    > db.dropDatabase()

### Backup scripts
För att förenkla finns det nu två scripts, backup.sh och restore.sh i backup foldern. Backup scriptet tar inget argument då det automatiskt genererar en dump med ett namn som ser ut som ett ISO datum, t.ex. `2020-02-02T12:11`. Restore scriptet tar namnet (ISO datumet) som argument, t.ex.:

    cd backup
    ./restore.sh 2020-02-02T12\:11

Förslagsvis kör man backup scriptet en gång per natt. Då backuppens storlek är approximativt 1kb per medlem, så är storleken på dumpen liten. Ett år av dumpar för 200 medlemmar blir då cirka 70MB, dvs. att rensa dumpar pga diskutrymme är inte nödvändigt. Eventuellt blir det mer med många skickade meddelanden. Detta bör undersökas efter ett år.

Notera även här att namnet på databasen är namngiven till `umsme`, i en default (icke driftsatt) meteor miljö är namnet istället `meteor`.



### Settings_example.json

För att köra projektet så måste du ha en settings.json-fil som ser ut som settings_example-filen fast med riktiga värden på API-tokens. Kör scriptet meteor settings.json för att köra igång appen med stöd för inloggning via google/facebook etc 