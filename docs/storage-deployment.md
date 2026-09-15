# Storage deployment runbook

Run migration during the coordinated deployment window. Use the authenticated
admin application's browser console with an admin, board, or storage account.
Keep legacy storage writers stopped until cutover completes.

## Preview

Back up the database and rehearse against a restored copy with email delivery
disabled. Configure every legacy wall's floor and verify rows and numbering.
Initialize MongoDB's replica set and wait for a primary before starting the
applications. Configure both `MONGO_URL` and the admin `MONGO_OPLOG_URL`.

Choose and retain a fixed cutoff for this deployment:

```js
const cutoff = new Date().toISOString();
const preview = await Meteor.callAsync('storageMigration.preview', { cutoff });
console.log(preview);
```

Review `preview_report.issues`, counts, and `target_preflight.blockers`. Resolve
all blockers, then preview again using the same cutoff. Save the final cutoff
and fingerprint in the deployment record. A changed source invalidates an older
preview; the apply method checks this again.

## Apply and verify

```js
const applied = await Meteor.callAsync('storageMigration.apply', {
  cutoff: preview.cutoff,
  fingerprint: preview.fingerprint,
});
console.log(applied);
const status = await Meteor.callAsync('storageMigration.status');
console.log(status);
```

Verify manifest completeness, counts, sampled owners, queue dates, preferences,
and wall heights. Existing expired memberships should have no warning yet.
Inspect the member and administrator interfaces. Allocation stays blocked until
finalization. If application is interrupted, rerun with the saved cutoff and
fingerprint: identical records are accepted, conflicting records are not overwritten.

## Finalize

After verification, record the actual deployment review reason:

```js
const finalized = await Meteor.callAsync('storageMigration.finalizeCutover', {
  fingerprint: preview.fingerprint,
  reason: 'Deployment review: counts, ownership, queue and wall layout verified',
});
console.log(finalized.validation);
```

Confirm `allocation_ready` is true. Finalization retires legacy source-drift
checking; it does not delete legacy fields. All applications must use the new
storage methods from this point. Enable configured member communication after
the rehearsal and deployment review. Assignments and warnings still require
operator-confirmed batches.

If validation fails, keep allocation blocked and investigate the reported
conflicts. Do not delete migration receipts or restore legacy writers over new
storage changes. A database restore requires a coordinated rollback of all
applications and any changes made since the backup.
