# Medlemsadministration

## Installera och köra igång

    cd umsme
    curl https://install.meteor.com/ | sh

Kopiera settings.json_example till settings.json och anpassa, sen är det bara att köra:

    meteor --settings settings.json

## Användarhantering
Användarhantering görs via meteor shell:

    meteor shell
    // Följande kommandon sker inne i shellet.
    // Lägg till användare:
    Accounts.createUser({username: 'john', password: '12345'})

    // Lista användare (notera att utskriften komemr i meteorloggen, inte i shellet):
    Meteor.users.find().forEach(u => {console.log(u.username);});

    // Ta bort användare:
    Meteor.users.remove({username: 'john'});

## Integration med Swedbank
Integration med Swedbank görs via ett separat bibliotek [umsme-bank](https://github.com/uppsala-makerspace/umsme-bank).
Efter att det installeras bör man ändra i settings.json för att peka ut rooten i REST api:et.

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

    mongodump -h 127.0.0.1 --port 3001 --forceTableScan -d meteor -o backup/2020-01-30

För att återställa motsvarande backup med mongorestore:

    mongorestore -h 127.0.0.1 --port 3001 --drop -d meteor backup/2020-01-30/meteor

### Backup scripts
För att förenkla finns det nu två scripts, backup.sh och restore.sh i backup foldern. Backup scriptet tar inget argument då det automatiskt genererar en dump med ett namn som ser ut som ett ISO datum, t.ex. `2020-02-02T12:11`. Restore scriptet tar namnet (ISO datumet) som argument, t.ex.:

    cd backup
    ./restore.sh 2020-02-02T12\:11

Förslagsvis kör man backup scriptet en gång per natt. Då backuppens storlek är approximativt 1kb per medlem, så är storleken på dumpen liten. Ett år av dumpar för 200 medlemmar blir då cirka 70MB, dvs. att rensa dumpar pga diskutrymme är inte nödvändigt. Eventuellt blir det mer med många skickade meddelanden. Detta bör undersökas efter ett år.
