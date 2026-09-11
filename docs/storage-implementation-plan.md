# Storage Redesign Implementation Plan

Status: implemented through Phase 6; Phase 7 operational cutover pending
Parent design: [storage-redesign.md](storage-redesign.md)
Date: 2026-09-10

## Implementation status

Phases 1–6 have been implemented and independently reviewed across the domain
and migration, server and delivery, and UI workstreams. The admin test suite
passes with 268 tests, and the admin production build, member production build,
and Storybook build pass. Seven member Playwright scenarios compile; executing
them locally still requires a running MongoDB instance and the Playwright
Chromium runtime.

Phase 7 has intentionally not been executed. It is an operational maintenance
window involving a production-like migration preview, manual unit-height
classification, deployment secrets, worker enablement, the coordinated legacy
write cutover, and post-cutover observation before legacy cleanup.

## 1. Workstreams and dependency gates

| Workstream | Phases | Scope | Starts when |
| --- | --- | --- | --- |
| Domain and migration | 1–2 | Schemas, indexes, rules, dry-run migration | Immediately |
| Server and delivery | 3–4 | Commands, previews, concurrency, email/SMS outbox | Phase 1 contracts pass |
| UI and cutover | 5–7 | Admin UI, member UI, rollout, cleanup | Phase 3 APIs stabilize |

The workstreams have separate file ownership, but their phases are gated. UI
code must not invent authoritative rules while the server contract is pending,
and production migration must not begin while legacy clients can still write.

## 2. Phase 1 — Domain foundation

Owner: domain and migration workstream.

### Deliverables

- Add models, schemas, collection modules, and a barrel export for all storage
  entities in the parent design, including `storageActionExecutions`.
- Deny all client inserts, updates, and removals. Events are immutable.
- Add awaited, idempotent index setup in `common/server/storageIndexes.js`.
- Add pure, time-injectable rules in `common/lib/storageRules.js`.
- Register pure-rule tests in the admin Mocha suite.

### Required indexes

- Unique unit `name` and unique `(wall, position)`.
- Partial unique active request per owner.
- Partial unique active assignment per unit and per owner.
- Partial unique open warning per assignment.
- Partial unique active exemption per assignment.
- Partial unique pending move per owner, request, and destination unit.
- Unique delivery per decision and action execution per
  `(created_by, operation_kind, command_id, suggestion_id)`. Startup creates
  this scoped index under a new name first, then drops the exact obsolete
  `{command_id, suggestion_id}` unique index if present. A same-named index
  with any unexpected shape is preserved and fails startup with an explicit
  diagnostic so it can be investigated manually.
- Query indexes for allocation inventory, queue age, deadlines, histories, and
  failed delivery channels.

### Pure rules

- Canonical payer resolution with explicit broken-family errors.
- Active-lab eligibility at an injected instant.
- Legacy preference parsing and compatibility/specificity.
- Deterministic three-phase allocation independent of input order.
- Queue pause/resume without changing `requested_at`.
- Exact 21-day reminder, 28-day reclamation, and 14-day move boundaries.
- Active-exemption calculation and unit/lifecycle invariant validation.

### Acceptance gate

- Schemas reject invalid records and enums.
- Required uniqueness indexes are created or startup fails clearly.
- No new collection accepts direct client writes.
- Allocator output is deterministic and all agreed priority cases pass.
- `npm test` passes from `admin/`.

## 3. Phase 2 — Migration and validation

Owner: domain and migration workstream. Starts after Phase 1.

### Files and APIs

- `admin/imports/storage/legacyMigration.js`: pure scanner/plan builder.
- `admin/server/storageMigration.js`: database adapter and idempotent apply.
- `admin/server/methods/storageMigration.js`: admin/board-only
  preview, apply, status, and explicit cutover-finalization methods.
- `admin/tests/storageMigration.tests.js`: mapping, anomaly, fingerprint, and
  rerun coverage.
- `admin/example-settings.json`: add explicit `floor` to legacy wall entries.

Do not put this cutover in automatic startup migrations. Application requires
an administrator-confirmed preview fingerprint with zero blockers.

### Migration rules

- Expand wall ranges into deterministic unit records.
- Migrate box comments to `note`; a noted unowned box becomes `unavailable`.
- Migrate member box ownership to units and active assignments under the
  canonical payer.
- Use the migration cutoff as unknown legacy `assigned_at`, with an audit event
  recording that the original time could not be recovered.
- Treat `storagequeue === true || storagerequest is present` as the effective
  legacy request set.
- Use the payer's earliest membership start as approximate `requested_at`.
- Map requests to allocation, move, or release and record migration provenance.
- Preserve legacy fields and comments during this phase.

### Acceptance gate

- Preview is read-only and has a stable source fingerprint.
- Preview reports target exact-ID and natural-key blockers before confirmation.
- Changed source data invalidates an old preview.
- Migration refuses every blocking anomaly described by the parent design.
- Identical reruns create no duplicate domain or event records.
- Interrupted application resumes safely without overwriting later work.
- A persisted manifest prevents interrupted or deleted migration targets from
  reporting ready while allowing additional v2 records.
- Source drift gates readiness until an authorized, audited finalization event
  explicitly retires the legacy source contract.
- Restored production-like data reconciles all expected counts and invariants.
- Allocation stays disabled while blockers or required unit metadata remain.

## 4. Phase 3 — Server-side storage service

Owner: server and delivery workstream. Starts after Phase 1; integration against
migrated data starts after Phase 2.

### Shared modules

- `common/server/storage/access.js`: operator and payer authorization.
- `common/server/storage/reconciliation.js`: idempotent pause/resume and renewal
  resolution.
- `common/server/storage/suggestions.js`: side-effect-free previews.
- `common/server/storage/commands.js`: all lifecycle mutations.
- `common/server/storage/atomic.js`: transactions, compare-and-set, conflict
  normalization, and safe fallback compensation.
- `common/server/storage/events.js`: immutable audit appends.
- `common/server/storage/memberState.js`: safe member DTO.
- `common/server/storage/membershipSync.js`: prompt renewal/family hooks.

### APIs

```text
adminStorage.preview({ action })
adminStorage.confirm({ action, command_id, selections })

storage.member.getState()
storage.member.upsertRequest(...)
storage.member.cancelRequest(...)
storage.member.confirmMove(...)
```

Preview returns opaque deterministic suggestion IDs, reason codes, dates,
expected channels, and skipped records. Confirm recalculates state and returns
one result per row: `applied`, `already_applied`, `stale`, `conflict`, or
`failed`.

Add role-checked manual methods for unit metadata, requests, assignments,
exemptions, moves, and clearance. Manual operations never create automatic
notifications. Overrides and corrections require their agreed reason or
acknowledgement.

The member server always resolves the caller and payer; clients never choose an
owner. Dependents are read-only. Release and move confirmation remain possible
after lab expiry.

### Consistency and idempotency

- Reconcile lazily before reads, previews, confirmations, and relevant manual
  actions; hooks improve promptness but are not the only correctness path.
- Commit domain state, audit event, action receipt, and notification outbox row
  before external I/O.
- Process batch rows independently.
- Prefer MongoDB transactions when supported; otherwise use compare-and-set,
  action receipts, safe unavailable states, and narrow compensation.
- Unique indexes remain the final conflict barrier.

### Acceptance gate

- Every method rejects unauthorized users; `admin` and `board` both work.
- Preview is deterministic and side-effect free.
- Confirmation is per-row idempotent and concurrency-safe.
- Every mutation has an authoritative actor and audit event.
- Families consistently resolve to the payer.
- Renewal resolves warnings and resumes requests without communication.
- External delivery never starts before the decision commits.

## 5. Phase 4 — Email and SMS delivery

Owner: server and delivery workstream. Starts after Phase 3 command boundaries
are stable.

### Delivery architecture

Implement an outbox under `common/server/storageNotifications/` with:

- template resolution and immutable rendering;
- Meteor email adapter;
- Swedish phone normalization to E.164;
- configurable SMS adapter plus explicit disabled adapter;
- per-channel `sending` leases, attempt history, failure normalization, and
  retry; and
- deterministic `Message-ID`/idempotency metadata where supported.

Add six storage template types: assignment, move, warning, reminder,
reclamation, and voluntary release. Storage mail uses:

```text
From: Uppsala Makerspace Hyllplats <hyllplats@uppsalamakerspace.se>
Reply-To: hyllplats@uppsalamakerspace.se
```

Credentials remain deployment secrets. A missing SMS provider yields
`unavailable` for SMS and does not block email or the decision.

### Retry API

```text
adminStorage.notifications.retry({ delivery_id, channels, command_id })
```

Retry preserves the original recipient and rendered content. It never resends
an already successful channel or repeats the storage decision.
`channels` accepts `email`, `sms`, and `render`; the latter is an explicit
operator recovery after a missing/broken template is fixed and still uses only
the immutable decision-time context stored in the outbox.

The email/SMS leases are separate and provider calls have a deadline shorter
than the lease. A process-local mutex coalesces worker ticks, while Mongo claim
tokens protect against other processes and expired-lease takeover. Channel
state—not the existence of a `Messages` row—is proof of completion. Storage
history rows use server-owned deterministic IDs and must exactly match the
outbox snapshot if already present.

Operational limitation: SMTP and MongoDB do not share a transaction. The
service writes member history after SMTP accepts the message and before it
marks the channel sent, and reuses a deterministic SMTP `Message-ID`. A crash
inside that narrow interval can cause an at-least-once resend unless the SMTP
provider deduplicates that identifier; it can never cause the storage decision
itself to roll back.

### Acceptance gate

- Each suggested member-facing decision creates one durable delivery.
- Manual/internal actions create none.
- Email and SMS succeed/fail independently.
- Failed channels can be retried without repeating successful work.
- Successful email creates one linked member-visible `Messages` record.
- Gmail credentials are absent from source control.

## 6. Phase 5 — Administrator UI

Owner: UI and cutover workstream. Starts when Phase 3 preview/manual APIs are
stable; notification status integration follows Phase 4.

### Deliverables

- Rework `admin/client/ui/storage/Storage.{js,html}` as the dashboard shell.
- Add suggested-action, batch-preview, inventory, unit-details, and bulk-edit
  Blaze templates under the same directory.
- Add pure presentation helpers under `admin/imports/storage/` and test them in
  admin Mocha.
- Add compact admin/board-only dashboard publications and on-demand history.
- Hide storage navigation from treasurer-only users.

### Required states and interactions

- Migration missing, migration blocked, metadata incomplete, ready, loading,
  unauthorized, and recoverable failure.
- Eight suggested-action cards from the design.
- Fresh preview before confirmation, row exclusion, double-submit prevention,
  and per-row results.
- Database-backed wall/grid ordered by `wall` and `position`.
- Filters for availability, metadata, floor, height, wall, owner, overdue, and
  warning state.
- Bulk classification, manual operations, exemptions, history, and channel
  retries.
- Accessible status labels/icons in addition to color.

### Acceptance gate

- `/storage` derives entirely from storage collections and server DTOs.
- No client code mutates `Members`, `Comments`, or storage collections.
- Units with incomplete metadata cannot be allocated.
- Both operator roles have equivalent access; treasurer does not.
- Two simultaneous admin previews cannot produce two successful assignments.

## 7. Phase 6 — Member UI

Owner: UI and cutover workstream. Starts after the Phase 3 member DTO and methods
stabilize.

### Deliverables

- Replace legacy reads/writes in `app/server/methods/storage.js`.
- Refactor `app/imports/pages/storage/index.jsx` to refetch authoritative state
  after sequential mutations and display actionable errors.
- Refactor the pure `Storage.jsx` component and replace its Storybook stories.
- Add Swedish/English lifecycle strings.
- Add v2 storage fixtures and Playwright storage scenarios.

Member state must cover waiting, paused, occupied, move requested, move pending,
release requested, awaiting clearance, warning/deadline, and family-dependent
read-only views. Do not expose unit notes, exemptions, audit internals, other
members, or notification failures. Do not show a misleading queue rank.

### Acceptance gate

- The app never reads or writes legacy member storage fields.
- All mutations are authenticated and payer scoped.
- Dependents see the payer's state without mutation controls.
- The payer can confirm a pending move.
- Release awaits administrator confirmation.
- Storybook and isolated Playwright scenarios cover the lifecycle in both
  languages.

## 8. Phase 7 — Cutover and cleanup

Owner: UI and cutover workstream, coordinated with the other workstreams.

### Production gates

1. Foundation: collections/indexes exist, transaction capability is known, and
   Phases 1–4 tests pass.
2. Migration: backup restore is tested, dry run is stable, blockers are zero,
   and expected counts are approved.
3. UI: both applications pass, delivery is whitelisted/disabled for rehearsal,
   and operators have a runbook.
4. Write cutover: in one maintenance window disable all three legacy write
   surfaces, run final fingerprinted migration, validate invariants, deploy new
   read paths, smoke test, and enable v2 writes.
5. Cleanup: wait at least 28 days and observe successful examples of every
   lifecycle before removing compatibility data.

The three legacy write surfaces are:

1. Admin `/storage` direct `Members.update` calls.
2. PWA `storage`/`updateStorage` methods.
3. Legacy `/check/:_id` `storageQueue`/`storageRequest` methods.

Do not run legacy and v2 writes concurrently. After v2 writes begin, rollback
means disabling storage mutations and repairing forward; never restore legacy
writes.

### Cleanup

- Remove member `storage`, `storagequeue`, and `storagerequest` fields.
- Remove settings-backed inventory and `_box_*` runtime conventions after
  verifying migrated-note parity.
- Remove legacy methods and check-page mutation controls.
- Replace legacy history/tabular fields with v2 history links or summaries.
- Retire the one-off migration only after production completion is recorded.
- Update all architecture, data-model, configuration, messaging, business-rule,
  README, and operator documentation.

### Final acceptance gate

- All storage reads and writes use the new domain.
- No legacy write method or direct collection mutation remains callable.
- Invariant reports remain clean through the verification period.
- Backup, migration report, invariant report, runbook, and deployment
  configuration are retained.

## 9. Test and review matrix

| Concern | Primary level |
| --- | --- |
| Allocation, compatibility, timing, invariants | Pure admin Mocha tests |
| Migration mapping/idempotence | Pure and database-backed admin tests |
| Authorization, commands, concurrency | Server integration tests |
| Delivery failure/retry/idempotency | Fake-adapter server tests |
| Admin grouping and presentation | Pure admin Mocha plus browser matrix |
| Member lifecycle and family behavior | Storybook plus Playwright |
| Production readiness | Dry-run, invariant report, restored-data rehearsal |

Every phase must finish its acceptance gate before its dependent phase can take
ownership of mutable integration work.
