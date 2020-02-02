# Medlemsadministration

## Installera

    cd umsme
    curl https://install.meteor.com/ | sh
    meteor
    
    
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
