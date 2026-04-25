# Backup, restore and clean

The commands allow you to backup, restore and clean the mongodb database. The backups end up in the `backup` directory.

A prerequisite is that:

- you need to have mongodump and mongorestore utility commands installed
- a local mongodb running

## Backup

Run `./backup.sh` and it will create a folder with the current date inside of `backup` with all the backup files.

## Restore

Run `./restore.sh DIR` and it will replace the mongodb database umsme from the `backup/DIR/meteor` files.

WARNING IT WILL REPLACE YOUR CURRENT DATABASE, ALL DATA IN THERE WILL BE LOST. CONSIDER MAKING A BACKUP FIRST BEFORE YOU RESTORE IF YOU HAVEN'T ALREADY.

## Clean

Run `./clean.sh` to drop the umsme database entirely (useful for starting fresh in tests). It prompts for confirmation before dropping.

WARNING SAME AS RESTORE: ALL DATA WILL BE LOST. MAKE A BACKUP FIRST IF YOU NEED TO KEEP IT.