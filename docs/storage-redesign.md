# Storage Management Redesign

Status: implemented through Phase 6; Phase 7 operational cutover pending
Date: 2026-09-10

## 1. Purpose

Replace the member-embedded storage model with a database-backed inventory and
administrator-confirmed workflows for allocation, warnings, reclamation, moves,
and communication.

The system recommends actions, but it never sends a warning, assigns a unit, or
reclaims an assignment without confirmation from an administrator or board
member. Confirmed suggested actions send their member communications
automatically.

## 2. Current system

Storage currently consists of three optional fields on `members`:

- `storage`: assigned numeric box number
- `storagequeue`: whether the member is waiting for storage
- `storagerequest`: a location preference or `none`

Physical units are generated in the admin browser from
`Meteor.settings.public.storageWalls`. Box notes are `comments` records whose
`about` value starts with `_box_`. Assignment is performed through direct client
updates to `Members`.

This representation has no queue-entry time, assignment history, structured
unit availability, unique assignment constraint, or safe atomic allocation.
Warnings and their deadlines are not represented at all.

## 3. Goals

### 3.1 Allocation

- Let administrators assign all suitable available units through a fast,
  previewable batch action.
- Allocate only to queued paying members or families with active lab
  membership.
- Respect floor and low/upper preferences without treating them as hard
  requirements.
- Prefer members without storage over members requesting a move.
- Prevent duplicate or concurrent assignment of a unit.
- Add the decision to the paying member's existing message inbox, send email
  when an address exists, and use the existing app-push function.
- Explain every proposed assignment and every skipped request.

### 3.2 Overdue assignments

- Clearly distinguish overdue assignments that are unwarned, warned, awaiting
  a reminder, past their warning deadline, or exempt from reclamation.
- Let administrators preview and confirm warning, reminder, and reclamation
  batches.
- Use a 28-day warning period and suggest one reminder after 21 days.
- Resolve an open warning automatically if lab membership is renewed.
- Preserve warning, reminder, renewal, and reclamation history.

### 3.3 Physical operations

- Do not make a digitally reclaimed or voluntarily released unit available
  until physical clearance is confirmed.
- Represent moves as a 14-day transition during which both the old and new unit
  are unavailable to other members.
- Let the paying member confirm completion of a normal move.
- Let administrators require inspection as an exception.

### 3.4 Administration and safety

- Keep MongoDB as the source of truth for inventory and ownership.
- Extend the existing admin `/storage` page rather than introduce a separate
  operational area.
- Permit direct manual actions as an audited escape hatch.
- Enforce all mutations in role-checked server methods.
- Keep immutable history for operational decisions and communication attempts.

## 4. Roles and terminology

### Paying member

The paying family member is the canonical storage owner, request owner, and
communication recipient. A family normally has one shared unit. Other family
members see the shared storage state read-only.

### Eligible request

An allocation or move request is eligible when:

- it is waiting rather than paused, fulfilled, or cancelled;
- its paying member has active lab membership; and
- it otherwise fits the allocation phase being evaluated.

An allocation or move request is paused when lab membership expires. Renewal
returns it to the queue with its original `requested_at`. Release requests do
not require active lab membership.

### Authorized operator

Users with either the `admin` or `board` role may manage storage and confirm
batches. Storage mutations must check the role on the server. Client routing,
subscriptions, or generic collection allow rules are not authorization.

## 5. Data model

The field names below define the intended domain vocabulary. Timestamps are
stored as UTC dates. Collection names follow the repository's lower-camel-case
MongoDB convention.

### 5.1 `storageWalls`

One document per named physical wall. Shelf groups are not domain objects.

```js
{
  _id,
  name,
  floor,          // floor1 | floor2
  display_order,
  column_count,
  row_count,
  note,
  active,
  createdAt,
  updatedAt
}
```

Columns on one wall have a uniform row count. A coordinate without a unit is
an empty physical position. Wall dimensions cannot be reduced past an existing
unit, and a populated wall cannot change floor.

### 5.2 `storageUnits`

One document per physical storage unit.

```js
{
  _id,
  name,                 // unique member-facing identifier
  owner,                // paying Member._id; optional
  floor,                // floor1 | floor2
  height,               // low | high; temporarily null during migration
  wall_id,              // StorageWall._id
  column,               // one-based horizontal coordinate
  row,                  // one-based vertical coordinate
  availability_status, // see states below
  assigned_at,
  assigned_by,
  source_request,
  warning: {            // optional current warning cycle
    id,
    warned_at,
    warned_by,
    deadline_at,
    reminded_at,
    message_id
  },
  exemption: {          // optional current administrative exemption
    reason,
    exempt_until,
    created_at,
    created_by
  },
  note,                 // internal administrative note
  createdAt,
  updatedAt
}
```

Allowed `availability_status` values:

- `available`: eligible for automatic allocation
- `occupied`: has a normal active assignment
- `reserved`: destination of a pending move
- `awaiting_clearance`: an assignment has ended but belongings may remain
- `unavailable`: damaged, removed, blocked, or otherwise unusable

Invariants:

- `name` is unique.
- `(wall_id, column, row)` is unique.
- Every unit coordinate is inside its wall and its floor matches the wall.
- `available` and `unavailable` units have no owner.
- `occupied`, `reserved`, and `awaiting_clearance` units have an owner.
- Only classified `available` units with both `floor` and `height` participate
  in automatic allocation.
- A note never implicitly changes availability.
- Referenced units are not deleted. They are made `unavailable` instead.

The owner remains present during `awaiting_clearance` so administrators can see
whose belongings may remain. Physical-clearance confirmation removes the owner
and changes the status to `available`.

### 5.3 `storageRequests`

One record for an allocation, move, or voluntary-release request.

```js
{
  _id,
  owner,             // paying Member._id
  request_type,      // allocation | move | release
  requested_at,
  preference: {
    floor,           // optional: floor1 | floor2
    height           // optional: low | high
  },
  source_unit,       // present for a move or release
  request_status,    // waiting | paused_ineligible | in_progress |
                     // fulfilled | cancelled
  fulfilled_at,
  cancelled_at,
  createdAt,
  updatedAt
}
```

Rules:

- A paying member has at most one active request.
- Changing the preference of an initial allocation request preserves
  `requested_at`.
- A move request receives a new `requested_at` when it is created.
- Cancelling a pending move returns its request to `waiting` with its original
  date by default. The administrator may explicitly cancel it instead.
- `none` in the legacy model becomes a `release` request, not an allocation
  preference.

### 5.4 `storageOffers`

A pending offer to move between two units.

```js
{
  _id,
  owner,
  request,
  from_unit,
  to_unit,
  offered_at,
  offered_by,
  deadline_at,       // initially offered_at + 14 days
  requires_inspection,
  createdAt,
  updatedAt
}
```

Deadline expiry is advisory: it creates a suggested action but never changes
the offer automatically. Administrators may complete, extend, or cancel an
expired offer. Completion and cancellation append events and remove the offer,
so this collection contains pending offers only.

### 5.5 `storageEvents`

Immutable, cross-entity audit feed.

```js
{
  _id,
  entity_type,
  entity_id,
  event_type,
  actor_type, // member | administrator | system
  actor,
  member,
  unit,
  related_unit,
  occurred_at,
  reason,
  details
}
```

Domain collections remain the source of current state. Events provide a single
chronology for request changes, renewals, warnings, exemptions, assignments,
offers, clearances, and overrides. Member and unit fields make history directly
filterable after current ownership changes.

The administrator dashboard exposes the newest 500 events as a read-only log.
Administrators and board members can filter it by member, storage unit, or both;
the event fields preserve those relationships after a unit changes owner.

The event ID is also the idempotency receipt for a confirmed command. Commands
use compare-and-set updates and MongoDB transactions where available. There is
no separate action-execution or delivery-retry collection.

## 6. Allocation policy

### 6.1 Preference compatibility

Legacy preferences map as follows:

| Legacy value | Structured preference |
| --- | --- |
| `floor1` | Floor 1, any height |
| `floor2` | Floor 2, any height |
| `floor1L` | Floor 1, low |
| `floor1U` | Floor 1, high |
| `floor2L` | Floor 2, low |
| `floor2U` | Floor 2, high |
| absent | Any unit |
| `none` | Voluntary-release request |

Preferences are soft. A compatible unit matches every preference component
that is present.

### 6.2 Batch algorithm

For the complete available inventory, process these phases in order:

1. Match the oldest eligible requests without storage to compatible units.
2. Assign remaining units to the oldest eligible requests without storage,
   regardless of preference.
3. Reserve remaining compatible units for the oldest eligible move requests,
   but only when the current unit does not already satisfy the preference.

Within a phase, `requested_at` determines order. If dates are equal, a narrower
preference wins before a broader preference. When a broad request can use
several units, choose the unit that preserves the most options for remaining
requests. Finish with stable unit-name and request-ID tie breakers so previews
are deterministic.

Requests with storage and no compatible available unit are not moved. Units
released by a pending move are not reused in the same batch: the old unit stays
occupied until move completion.

Every preview row states the phase and reason used to select it. Confirmation
rechecks roles, membership, request state, unit state, and competing writes on
the server.

## 7. Operational lifecycles

### 7.1 New allocation

```text
waiting request
    -> administrator confirms suggested assignment
    -> unit occupied, assignment created, request fulfilled
    -> existing Messages record, app push, and email when available
```

There is no acceptance step for a normal new assignment.

### 7.2 Queue eligibility

```text
waiting --lab expires--> paused_ineligible
paused_ineligible --lab renews--> waiting (original requested_at)
```

Pause and resume are system events, not administrator batches, and do not send
notifications.

### 7.3 Overdue warning and reclamation

```text
active assignment
    -> lab membership expires
overdue, unwarned
    -> administrator confirms warning batch
open warning (deadline in 28 days)
    -> after 21 days: reminder suggested
    -> administrator confirms reminder batch
    -> after 28 days: reclamation suggested
    -> delivered warning, or administrator records manual contact and a reason
    -> administrator confirms reclamation
assignment ended; unit awaiting_clearance
    -> administrator confirms physical clearance
unit available
```

Renewal while the warning is open resolves it as `resolved_renewal` and removes
it from reminder and reclamation suggestions. The historical warning and its
deliveries remain.

An active exemption keeps the assignment visible but removes it from warning
and reclamation suggestions.

The warning clock starts when the warning batch is confirmed, but a passed
deadline is not sufficient evidence for reclamation. The warning must have a
persistent member message. If it does not, the reclamation row
requires an explicit manual-contact confirmation and a reason. The server
rechecks this evidence when the batch is confirmed and records the evidence in
the assignment-ended event.

### 7.4 Voluntary release

```text
release request
    -> administrator confirms suggested release
assignment ended; unit awaiting_clearance
    -> existing Messages record, app push, and email when available
    -> administrator confirms physical clearance
unit available
```

### 7.5 Move

```text
move request
    -> administrator confirms suggested move
old unit occupied; new unit reserved; 14-day deadline
    -> payer or administrator confirms physical move
old assignment ended; new assignment created
old unit available; new unit occupied; request fulfilled
```

If the old unit requires inspection, move confirmation puts it in
`awaiting_clearance` instead of `available`.

After the deadline, the move appears for administrator review. Nothing changes
automatically. Cancellation frees the destination and returns the original
request to the queue by default. An administrator may instead cancel the
request. Extensions and cancellations are manual decisions and do not send a
message.

## 8. Communication policy

Suggested member-facing decisions use the existing `Messages` collection and
app-push function. They also send email when the paying member has an address.
Storage email is sent as `Uppsala Makerspace Hyllplats
<hyllplats@uppsalamakerspace.se>`. SMTP credentials are deployment secrets and
must not be stored in this repository.

Generated subjects and message bodies contain Swedish first and English
second. The two language blocks are separated by dashes; dates are
formatted in the language of their block.

Automatic communication applies to confirmed suggested actions for:

- assignment;
- move instructions;
- overdue warning;
- 21-day reminder;
- reclamation; and
- voluntary release acknowledgement.

The preview indicates `Email + app message` or `App message only`. Storage has
no separate delivery collection, background worker, or retry interface.

Direct manual actions do not send notifications because the administrator is
expected to coordinate with the member. Their confirmation UI must state
`No automatic notification`. Exemptions, metadata changes, physical-clearance
confirmation, and ordinary move-completion confirmation are also internal.

## 9. Suggested-actions panel

The existing admin `/storage` page gains a panel with live counts:

| Action | Suggested records |
| --- | --- |
| Make assignments | Proposals from the three-phase allocator |
| Send warnings | Ineligible occupied assignments without a warning or exemption |
| Send reminders | Open warnings at least 21 days old without the suggested reminder |
| Reclaim assignments | Still-ineligible open warnings whose 28-day deadline passed; confirmation requires delivered-warning or manual-contact evidence |
| Process voluntary releases | Active release requests |
| Review expired moves | Pending moves beyond their 14-day deadline |
| Confirm physical clearances | Units in `awaiting_clearance` |

Each action follows the same interaction:

1. Calculate suggestions without changing state.
2. Preview members, units, reasons, deadlines, and message handling.
3. Allow individual rows to be excluded.
4. Require explicit confirmation.
5. Revalidate each row server-side and execute it safely.
6. Report successes, stale suggestions, conflicts, and delivery failures.

Batch execution is per-row idempotent. One stale or failing row does not repeat
or conceal successful rows.

Below the panel, retain and extend the current wall/grid and unit list with:

- first-class wall metadata and uniform grid dimensions;
- filters for every availability status and incomplete metadata;
- inline unit metadata and note editing;
- bulk low/high classification;
- links to owner member records;
- unit, assignment, warning, exemption, move, and notification history; and
- clear visual distinction between occupied, reserved, awaiting-clearance,
  unavailable, and unclassified units.

## 10. Manual operations

Administrators and board members may:

- assign a selected unit directly;
- create, edit, pause, or cancel a request on behalf of a member;
- complete, extend, or cancel a move;
- end or correct an assignment;
- create or revoke an exemption;
- confirm physical clearance;
- edit inventory metadata and availability.

Bypassing membership or queue eligibility requires a reason and stronger
confirmation. Cancelling another person's request or changing its queue date
also requires a reason. All manual operations are audited. They do not send
automatic messages.

Referenced units cannot be deleted. Editing the name, height, wall, column, or
row of an occupied or reserved unit requires an explicit warning
confirmation and creates an audit event.

## 11. Migration

Migration must be idempotent and begin with a dry-run report.

The admin server exposes four `admin`/`board`-only methods:

- `storageMigration.preview` reads legacy and current storage data and returns
  a cutoff, stable source fingerprint, anomaly report, read-only target
  preflight (exact-ID and natural-key conflicts), and current readiness;
- `storageMigration.apply` accepts that exact cutoff and fingerprint, rescans,
  and refuses changed source data or any blocker before writing; and
- `storageMigration.status` returns the current invariant/count/readiness
  report. It also compares the applied event's fingerprint with the live
  legacy source and blocks allocation if those fields changed after migration;
  and
- `storageMigration.finalizeCutover` requires the applied fingerprint and an
  audit reason, then records the authorized operator's decision that legacy
  fields may be retired. Only after this explicit checkpoint does readiness
  stop comparing the live legacy source.

The migration is never run automatically at process startup. Its deterministic
document IDs make an interrupted application resumable. A matching existing
document is accepted, while a differing document or natural-key collision is
reported and never overwritten. The summary commit event contains a digest and
the sorted IDs of every migration-owned wall, unit, assignment, request, and
provenance event. Readiness requires the complete manifest, so an interrupted
write or later deletion cannot look applied; additional legitimate v2 records
remain allowed.

### 11.1 Unit inventory

1. Generate wall and unit records from the current `storageWalls` ranges.
2. Add an explicit `floor` value to every legacy wall setting before migration;
   do not parse the English wall name. Derive each wall's uniform dimensions
   and every unit's `name`, `floor`, `wall_id`, `column`, and `row` from that
   definition. The legacy `shelfSize` supplies the row count but shelf groups
   are not retained.
3. Leave `height` unset; it cannot be inferred from current data.
4. Convert `_box_<number>` comments into unit notes.
5. Mark an unowned unit with a legacy comment as `unavailable`.
6. Create active assignments and set `owner` for each valid `Member.storage`.
   Since the original assignment time is unavailable, use the migration cutoff
   for `assigned_at` and record that provenance in the migration event.
7. Report duplicate ownership, duplicate numbers, missing members, and
   assignments outside configured ranges for manual resolution.

The admin page provides bulk low/high classification. An unclassified unit is
excluded from automatic allocation even if its availability status is
`available`.

### 11.2 Requests

The effective legacy queue includes records with `storagequeue === true` or a
present `storagerequest`. This preserves existing move and release requests,
which the current member application can create without setting
`storagequeue`.

For every effective queued paying member:

- set `requested_at` to the start of their earliest membership;
- preserve and structure the current preference;
- create an `allocation` request when they have no unit;
- create a `move` request linked to the current unit when they have
  a location preference and a unit; and
- create a `release` request when the legacy value is `none`.

This date is intentionally approximate and must be marked as legacy-derived in
the migration event. Family records are consolidated under the paying member.
Contradictory records are preserved in the dry-run report for review.

### 11.3 Cutover

During rollout, retain the legacy member fields only as read-only compatibility
data. Do not allow old and new clients to independently mutate both models.
After both applications use the new collections and production migration has
been verified, remove `storage`, `storagequeue`, and `storagerequest` from the
member schema and remove `storageWalls` as an inventory source.

Existing expired occupants have no reliable warning history. They enter the new
system as overdue and unwarned unless administrators explicitly reconcile them
during migration review.

## 12. Implementation plan

### Phase 1: Domain foundation

- Add the five shared storage collections and their schemas.
- Add unique and query-supporting indexes.
- Implement canonical paying-family-owner resolution.
- Implement pure compatibility, eligibility, allocation, and lifecycle rules.
- Unit-test the rules independently of Meteor methods and UI.

Likely locations:

- `common/lib/storageRules.js`
- `common/collections/storageWalls.js`
- `common/collections/storageUnits.js`
- `common/collections/storageRequests.js`
- `common/collections/storageOffers.js`
- `common/collections/storageEvents.js`

### Phase 2: Migration and validation

- Build a dry-run scanner that reports every legacy anomaly without writing.
- Add the idempotent migration under the admin-owned migration mechanism.
- Create walls, units with current ownership, requests, and migration audit events.
- Add an admin migration report and block automatic allocation until required
  metadata and conflicts are resolved.
- Verify counts and sample records against a restored database backup before
  production rollout.

### Phase 3: Server-side storage service

- Centralize storage mutations in a shared server/domain service.
- Add `admin`/`board` role guards to every administrative method.
- Add member-scoped methods for viewing storage, managing their request, and
  confirming a move.
- Implement preview and confirm methods with stable suggestion identifiers and
  state revalidation.
- Use conditional MongoDB updates and unique indexes to prevent conflicting
  assignment. Use transactions where the deployment supports them, with
  idempotent compensating behavior otherwise.
- Retire direct client collection mutations and unsecured legacy storage
  methods.

### Phase 4: Communication delivery

- Define email templates for assignment, move, warning, reminder, reclamation,
  and voluntary release.
- Reuse `Messages` for member-visible email history.
- Use the existing `Messages`, email, and app-push flow without a separate
  storage delivery ledger.

### Phase 5: Administrator UI

- Change `/storage` to subscribe to database-backed inventory and lifecycle
  records.
- Add the suggested-actions panel and preview/confirmation dialogs.
- Preserve the wall/grid view using first-class walls and unit coordinates.
- Add unit editing, filters, bulk height classification, exemptions, histories,
  and manual operations.
- Make notification behavior explicit in both suggested and manual flows.

### Phase 6: Member UI

- Replace legacy member-field reads and writes with request and assignment
  methods.
- Keep family members read-only and show the payer's shared unit.
- Show queue pause/eligibility, current preference, pending move, and deadlines.
- Let the payer confirm a move.
- Keep voluntary release behind administrator confirmation.

### Phase 7: Cutover and cleanup

- Run migration dry-run and resolve all reported conflicts.
- Disable all three legacy write surfaces in the same maintenance window: the
  admin storage page's direct member updates, the PWA's legacy storage methods,
  and the legacy check page's storage methods. Then deploy schemas, server
  writes, and both UIs.
- Run the production migration with before/after counts.
- Monitor failed notifications and assignment conflicts.
- Remove legacy member storage fields, direct writes, box-comment conventions,
  and settings-backed inventory after a defined verification period.
- Update `data-model.md`, `architecture.md`, configuration examples, and
  operational documentation to describe the implemented system.

## 13. Verification plan

Automated tests must cover:

- all three allocation phases and deterministic tie-breaking;
- soft-preference fallback and preservation of constrained units;
- exclusion of unclassified, unavailable, reserved, and uncleared units;
- queue pause/resume without loss of original age;
- paying-family-member ownership and recipient selection;
- concurrent attempts to assign the same unit;
- 21-day reminders and 28-day reclamation eligibility;
- renewal resolution and later creation of a new warning cycle;
- active and expired exemptions;
- release and physical-clearance transitions;
- move reservation, member/admin completion, extension and cancellation without notification, and
  inspection exceptions;
- suggested-action versus manual-action notification policy;
- existing message, email, and app-push integration;
- authorization of every method; and
- idempotent migration, legacy anomalies, and reruns.

Before production cutover, validate these operational scenarios against a copy
of production data and exercise all admin previews without delivery enabled.

## 14. Remaining implementation choices

The product policy is settled. These technical choices remain for the build:

- final email and app-message wording and localization
- Gmail SMTP submission versus Google Workspace SMTP relay for
  `hyllplats@uppsalamakerspace.se`
- whether the production MongoDB deployment supports multi-document
  transactions
- exact batch size
- how long member messages, action receipts, and audit records are retained

None changes the lifecycle or allocation policy in this document.
