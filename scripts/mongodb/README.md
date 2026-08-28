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
## Repair self-family members

Run `./repair-self-family.sh` for a dry run, `--apply` to write, and an optional
database name as the last argument (defaults to `umsme`):

```
./repair-self-family.sh                 # report only
./repair-self-family.sh --apply         # write to umsme
./repair-self-family.sh --apply mydb    # write to another database
```

It repairs two things:

- **Members in their own family** — `infamily` pointing at their own `_id`,
  which hides their memberships in both the app and admin.
- **Family flags lost to a tie** — a family add-on carries the same `memberend`
  as the base membership it was bought alongside, and the flag used to be read
  off whichever document Mongo returned first. Family members of a repaired
  payer are resynced too, since the hooks in `common/server/familyCascade.js`
  do not run outside the Meteor app.

Both causes are fixed in the code (`common/lib/familyRules.js`,
`app/server/methods/family.js`, `admin/client/ui/family/`); this script only
cleans up documents already written. It is idempotent and reports orphaned or
ambiguous cases instead of guessing. Take a backup first with `./backup.sh`.
