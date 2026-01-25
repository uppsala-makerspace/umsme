# Backup and restore

The two commands allows you to backup and restore the mongodb database. The backups end up in the `backup` directory.

A prerequisite is that:

- you need to have mongodump and mongorestore utility commands installed
- a local mongodb running

## Backup

Run `./backup.sh` and it will create a folder with the current date inside of `backup` with all the backup files.

## Restore

Run `./restore.sh DIR` and it will replace the mongodb database umsme from the `backup/DIR/meteor` files.

WARNING IT WILL REPLACE YOUR CURRENT DATABASE, ALL DATA IN THERE WILL BE LOST. CONSIDER MAKING A BACKUP FIRST BEFORE YOU RESTORE IF YOU HAVEN'T ALREADY.