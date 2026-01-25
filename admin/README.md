# UMSME - Uppsala MakerSpace MEmber administrative system
This is a system that aims to:
* adminstrate members and their membership status
* integrate with the bank to see the payments
* send mails to groups of members
* see statistics of how the amount of members change over time
* administrate members storage space
* integrate with the opening of the doors

## INSTALL - developer mode

You need a modern node version, typically node 22.

    cd umsme/admin
    curl https://install.meteor.com/ | sh

Copy `example-settings.json` to `settings.json`, adapt it, then run `meteor`.

Alternatively, see the script `example-start.sh` to point to an external mongo database etc.

## Running the webbapp in development environment

* Copy the script `example-start-dev.sh` to `start.sh` and change the `PASSWORD` if you want to be able to send mails.
* Copy `example-settings.json` to `settings.json`.
* Start by executing `./start.sh`

## Running the webbapp in production environment

First you have build for the right architecture, the `npm run build` command corresponds to:

    meteor build dist --architecture os.linux.x86_64

**In the deployment environment:**

* Make sure you have recent version of node on your server, node 22 is suitable. Also make sure you have mongod installed separately.
* Initialize your built bundle, see the `example-install.sh` script for how to do this.
* Locate the `example-start.sh` and copy to `start.sh`.
* Take notice on the section on how to set the `MAIL_URL` should be configured if you want to be able to send emails.
Make sure you copy `example-settings.json` to `settings.json` and make relevant changes.
* Start the app by calling `./start.sh`

## Integration with Swedbank

The integration is dependant on a separate library [umsme-bank](https://github.com/uppsala-makerspace/umsme-bank).
After the installation, change the `settings.json` to indicate the root of the REST api:et for the integration. The following values are relevant:

    "bankproxy": "http://localhost:8000/",
    "syncNrOfTransactions": 20,

## Sending mails

To be able to send emails you need to set the environement variable `MAIL_URL`. It is possible to set the variable in the command that starts the application, hence the command `meteor` is changed to:

    MAIL_URL=smtp://username:password@mail.uppsalamakerspace.se:587?tls.rejectUnauthorized=false meteor --settings settings.json

Note 1, this is better done in a start script as indicated in `example-start.sh`.
Note 2, `username` is typically an email like `kansliet@uppsalamakerspace.se`.
It is possible to disable sending emails entirely by changing in settings.json:

      "deliverMails": false

## Backup

We use mongodump and mongorestore. To install these tools on linux environment with apt do:

    sudo apt install mongo-tools

Below is an example how to do backup given a certain date (2020-01-30):

    mongodump -h 127.0.0.1 --port 3001 --forceTableScan -d umsme -o backup/2020-01-30

To restore, use the corresponding command with mongorestore:

    mongorestore -h 127.0.0.1 --port 3001 --drop -d umsme backup/2020-01-30/meteor

Note that the name for the database is set to umsme, which is the suggested name in a deployed version. In the development mode the default name is `meteor`.

### Reset the databasen

If you want to reset the database in development mode, shut down the application and do:

meteor reset

Then you can start again.

If you are runing against a production database:

    mongo
    > use umsme
    > db.dropDatabase()

### Backup scripts

To simplify regualar backup (typically in a production environment) there are two script sin the backup folder.
The backup script does not take any argument as it automatically generates a dump from the current time in ISO form, e.g. `2020-02-02T12:11`.
The restore script takes this date (in ISO form) as argument, e.g.:

    cd backup
    ./restore.sh 2020-02-02T12\:11

Note that the name of the database is given to `umsme`, in a non-production environment the name needs to be changed to `meteor`.