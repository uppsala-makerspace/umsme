# Storage Management Redesign

Status: implemented through the member and administrator interfaces; production cutover pending

Updated: 2026-09-13

## 1. The story

### 1.1 Why this work exists

Uppsala Makerspace has a limited number of storage units and a changing group
of members who need them. The physical work is simple to understand: give an
available unit to a member, contact people whose lab membership has expired,
and make returned units ready for the next person.

The administrative work is not simple today. An administrator must compare the
member list, the storage queue, membership dates, preferences, messages, and
the physical storage layout. Much of this work is repetitive. It also depends
on personal knowledge: who has waited longest, who has already been contacted,
which unit is free, and whether a family already has a shared unit.

The redesign makes the system do that preparation. It keeps a structured
inventory, calculates the next useful actions, and presents them as batches.
An administrator, board member, or storage operator reviews the suggestions and confirms them.
The system then updates the records and sends the required member messages.

The aim is not unattended storage management. The aim is to remove routine
searching, sorting, and message writing while keeping a person responsible for
every decision.

### 1.2 What a normal allocation should feel like

Assume that several storage units have become available. An administrator opens
the storage page and selects **Make assignments**. The system has already:

- found members who have an active lab membership and are waiting for storage;
- resolved family membership so only the paying family member can own a unit;
- sorted the requests by age;
- compared floor and low/high preferences with the available inventory;
- given priority to people who have no storage;
- considered compatible move requests only after those people; and
- prepared the email and app message for every proposed assignment.

The administrator sees the proposed member, unit, and reason for each match.
They can exclude a row or cancel the batch. When they confirm, the system checks
the live data again, assigns each valid unit, records the event, and sends the
message. A stale row fails by itself and does not undo the other valid rows.

The result is still an administrator-approved allocation, but the routine work
is reduced to review and confirmation.

### 1.3 What an overdue-membership cycle should feel like

When a storage owner no longer has an active lab membership, the unit becomes
visible as overdue. Nothing is sent automatically.

An administrator selects **Send warnings** and reviews the proposed recipients.
After confirmation, each member gets a Swedish and English message through the
existing member-message system, app push, and email when an email address is
available. The system records a 28-day deadline.

After 21 days, **Send reminders** shows the warnings that need one reminder.
After 28 days, **Reclaim units** shows the remaining overdue cases. If the
original warning message is missing, reclamation requires the administrator to
confirm another form of contact and record a reason.

If the member renews their lab membership at any point, the system clears the
open warning state. The member keeps the unit. The warning remains in the event
history, but it no longer appears in reminder or reclamation batches.

If reclamation is confirmed, the unit is not immediately offered to another
member. Its status becomes `awaiting_clearance`, because a digital decision and
physical removal are different events. An administrator makes the unit
available only after someone confirms that it is physically clear.

### 1.4 What a move should feel like

A member who already has storage can request a different unit. This does not
give the request the same priority as a member with no storage.

If a compatible unit remains after requests from people without storage have
been considered, the system can suggest a move. When an administrator confirms
it, the destination becomes reserved for 14 days and the member receives move
instructions. The old unit remains occupied during this period.

The paying member can confirm the move in the app. An administrator can also
complete it. The new unit then becomes occupied and the old unit becomes
available. If the administrator required inspection, the old unit becomes
`awaiting_clearance` instead.

An expired offer does not complete or cancel itself. It appears in **Review
expired offers**, where an administrator can complete it, extend it, or cancel
it. Cancellation returns the request to its original queue position by default.

### 1.5 What a voluntary return should feel like

A member can ask to release their unit in the app. The request appears in the
administrator panel. After confirmation, the member receives an acknowledgement
and the unit becomes `awaiting_clearance`. It becomes available only after
physical clearance is confirmed.

### 1.6 Where automation stops

Every suggested batch requires confirmation by an `admin`, `board`, or
storage-role user.
The system never assigns, warns, reminds, reclaims, releases, or resolves an
expired offer without that confirmation.

Direct manual actions are escape hatches for cases that do not fit the normal
flow. They create audit events but do not send automatic messages. The
administrator is expected to have contacted the member before or during such
an action.

Administrative exemptions are internal notes on an occupied unit. They keep
the case visible but remove it from automatic warning and reclamation
suggestions while the exemption is active.

## 2. Settled operating rules

### 2.1 Ownership and eligibility

- The paying family member is the storage owner, queue owner, and message
  recipient.
- A family normally has one shared unit.
- Other family members can see the shared state but cannot change it.
- A new allocation or move requires an active lab membership.
- A request is paused when the lab membership expires.
- Renewal returns a paused request to the queue with its original date.
- A release request does not require active lab membership.

### 2.2 Allocation order

Preferences are soft constraints. A request can prefer Floor 1 or Floor 2 and
low or high storage. A compatible unit matches every preference component that
the member selected.

For all available and fully classified units, allocation runs in three phases:

1. Match the oldest request without storage to a compatible unit.
2. Match the oldest remaining request without storage to any suitable unit.
3. Match the oldest request from a member with storage to a compatible unit.

A member with storage is not moved when no compatible unit exists. There is no
benefit in moving them to another unit that does not meet their preference.

Within one phase, `requested_at` sets the order. A more specific preference
wins a tie. Unit selection preserves constrained units for later requests when
possible. Stable request and unit identifiers break any remaining tie, so the
same state produces the same preview.

### 2.3 Time periods

- Reminder suggestion: 21 days after the warning.
- Reclamation suggestion: 28 days after the warning.
- Move offer: 14 days from confirmation.

These are elapsed durations, not calendar-month approximations.

### 2.4 Communication

Confirmed suggested actions send member communication for:

- a new unit assignment;
- a move offer;
- an overdue warning;
- the 21-day reminder;
- reclamation; and
- acknowledgement of a voluntary return.

The message contains Swedish first and English second, separated by dashes.
It is stored in the existing `Messages` collection. The existing app-push
function is used, and email is sent when the paying member has an address.
Email uses:

`Uppsala Makerspace Hyllplats <hyllplats@uppsalamakerspace.se>`

There is no SMS support. There is no storage-specific delivery queue, retry
ledger, or message collection. SMTP credentials remain deployment secrets.

Manual assignments, offer extensions, offer cancellations, exemptions,
metadata changes, move completion, and physical-clearance confirmation do not
send automatic messages.

## 3. Architectural changes

### 3.1 From member fields to storage records

The production system currently stores storage state in three optional member
fields:

- `storage`: the current numeric unit number;
- `storagequeue`: whether the member is waiting; and
- `storagerequest`: a location preference or `none`.

It also builds the physical layout from settings and stores box notes as
special comments. This cannot safely represent queue age, availability,
warnings, moves, history, or concurrent allocation.

The redesign uses five storage collections. Current ownership and lifecycle
state stay on the domain records. History stays in one event collection.

```text
storageWalls
    └── storageUnits ── current owner, warning, exemption, availability
            ↑     ↑
storageRequests   storageOffers
            \     /
            storageEvents

Messages remains the existing communication system.
```

### 3.2 `storageWalls`

One record represents one named physical wall.

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

Columns on one wall use the same row count. An empty coordinate represents a
physical gap, so gaps do not need separate records. A wall cannot be reduced
past an existing unit, and a populated wall cannot change floor.

### 3.3 `storageUnits`

One record represents one physical storage unit.

```js
{
  _id,
  name,                 // unique member-facing number, such as 1001
  owner,                // paying Member._id; optional
  floor,                // floor1 | floor2
  height,               // low | high; derived from wall row
  wall_id,
  column,
  row,
  availability_status, // available | occupied | reserved |
                       // awaiting_clearance | unavailable
  assigned_at,
  assigned_by,
  source_request,
  warning: {
    id,
    warned_at,
    warned_by,
    deadline_at,
    reminded_at,
    message_id
  },
  exemption: {
    reason,
    exempt_until,
    created_at,
    created_by
  },
  note,
  createdAt,
  updatedAt
}
```

The availability states mean:

- `available`: ready for allocation;
- `occupied`: normal current ownership;
- `reserved`: destination of a pending offer;
- `awaiting_clearance`: digitally returned or reclaimed, but not yet cleared;
- `unavailable`: damaged, removed, blocked, or otherwise not usable.

Unit names and wall coordinates are unique. Available and unavailable units
have no owner. Occupied, reserved, and awaiting-clearance units have an owner.
Only available units with coherent floor, wall, row, and derived height can
enter automatic allocation.

Referenced units are not deleted. They are marked unavailable so their history
continues to resolve.

### 3.4 `storageRequests`

One record represents a request for an initial allocation, a move, or a
voluntary return.

```js
{
  _id,
  owner,
  request_type,   // allocation | move | release
  requested_at,
  preference: {
    floor,        // optional
    height        // optional
  },
  source_unit,    // move and release requests
  request_status, // waiting | paused_ineligible | in_progress |
                  // fulfilled | cancelled
  fulfilled_at,
  cancelled_at,
  createdAt,
  updatedAt
}
```

A paying member has at most one active request. Editing an allocation
preference preserves the original queue date. A new move request gets its own
queue date. Cancelling an offer returns its request to `waiting` by default.

### 3.5 `storageOffers`

This collection contains pending move offers only.

```js
{
  _id,
  owner,
  request,
  from_unit,
  to_unit,
  offered_at,
  offered_by,
  deadline_at,
  requires_inspection,
  createdAt,
  updatedAt
}
```

Completion or cancellation removes the offer and records the outcome as an
event. A passed deadline only creates an administrator suggestion.

### 3.6 `storageEvents`

One immutable event stream provides the operational history.

```js
{
  _id,
  entity_type,
  entity_id,
  event_type,
  actor_type,     // member | administrator | system
  actor,
  member,
  unit,
  related_unit,
  occurred_at,
  reason,
  details
}
```

The member and unit references make history searchable even after ownership
changes. The administrator page shows the newest 500 events and supports member
and unit search filters.

Events also act as idempotency receipts for confirmed commands. There is no
separate action-execution collection.

### 3.7 Server-side command boundary

All storage mutations run in server methods. Administrative methods require an
`admin`, `board`, or dedicated `storage` role. The storage role grants no
unrelated board or administrator data access. Member methods resolve the signed-in person to the
paying storage owner before reading or changing state.

The main interfaces are:

```text
adminStorage.preview({ action })
adminStorage.confirm({ action, command_id, selections })
adminStorage.units.*
adminStorage.requests.*
adminStorage.offers.*

storage.member.getState()
storage.member.upsertRequest(...)
storage.member.cancelRequest(...)
storage.member.confirmOffer(...)
```

Confirmation reloads the authoritative state and uses conditional database
updates inside a MongoDB transaction. Storage changes require a replica set;
readiness blocks them when transaction support is unavailable. Stable command
and event identifiers prevent a retry from applying the same decision twice.

Reads and previews also perform lazy reconciliation: they pause or resume queue
requests as eligibility changes, clear warnings after renewal, and expire
administrative exemptions. These housekeeping changes never communicate with a
member. Each reconciliation update and its audit event commit in one transaction.

### 3.8 Existing communication system

Storage communication is an extension of the current message system, not a new
messaging subsystem. A confirmed decision creates one deterministic `Messages`
record. The current push and email functions then use that record.

Push or email transport failure is logged, but storage does not keep its own
delivery-state machine or retry records. That concern remains with the shared
communication system.

## 4. Suggested administrator flow

### 4.1 Open the storage page

The existing `/storage` page is the operational home for administrators and
board members. It shows only negative migration or readiness feedback. When the
system is ready, no success banner takes space from the work.

The first section contains suggested-action cards with live counts:

| Action | What appears |
| --- | --- |
| Make assignments | Initial allocations and compatible move offers |
| Send warnings | Overdue occupied units with no warning or exemption |
| Send reminders | Open warnings that are at least 21 days old |
| Reclaim assignments | Open warnings past 28 days |
| Process releases | Waiting voluntary-return requests |
| Review expired offers | Offers past their 14-day deadline |
| Confirm clearances | Units waiting for physical clearance |

### 4.2 Review and confirm a batch

Every action uses the same pattern:

1. Open a preview. Nothing changes yet.
2. Review the member, unit, reason, date, and communication channel.
3. Exclude any row that needs separate handling.
4. Add required choices, such as inspection or expired-offer resolution.
5. Confirm the selected rows.
6. Review applied, stale, conflicting, or failed results.

The server generates a fresh preview immediately before confirmation. If the
suggestion set changed, the administrator must review it again.

### 4.3 Work with the queue

The queue lists active allocation and move requests in waiting order. It can be
searched by member name, member number, or email. An administrator can:

- add a member to the queue;
- create a move request for a current owner;
- change a preference without changing queue age;
- correct the queue date with a reason;
- pause or resume an eligible request; and
- cancel a request with a reason.

These direct edits do not send automatic messages.

### 4.4 Work with walls and inventory

The wall visualization remains part of the page. Each wall uses its configured
number of columns and rows. Each unit is shown at its physical coordinate with
a strong status color. The page supports status, floor, height, wall, owner,
warning, overdue, and text filters.

An administrator can edit wall and unit metadata and set units available or
unavailable when their lifecycle allows it. Height follows the unit row: the
top half is high and the bottom half is low; on an odd-row wall the middle row
is low. Moving a unit or changing a wall's row count recalculates height.
Metadata changes to occupied or reserved units require explicit acknowledgement.

The selected-unit panel shows the current owner, request, pending offer,
warning, exemption, messages, and event history. It also contains the manual
operations. Every manual control states that it sends no automatic message.

### 4.5 Use the event log

The event log is read-only and sorted newest first. Search boxes filter it by
member and storage unit. Display labels use member names and unit numbers;
internal database identifiers are not shown as the main description.

This lets administrators answer questions such as:

- Who has this unit now?
- Who had it before?
- When was this member warned?
- Which units were involved in a move?
- Who confirmed the decision?

## 5. Suggested member flow

The member flow is available in the progressive web app at
`app.uppsalamakerspace.se`.

### 5.1 Member without storage

An eligible paying member sees that no unit is assigned. They can join the
queue and select optional floor and height preferences. They can later edit the
preference without losing their place or leave the queue.

### 5.2 Member with storage

The member sees the unit number and assignment date. They can:

- request a different unit and choose a preference; or
- request release of the current unit.

Both actions create requests. They do not immediately change ownership.

### 5.3 Member with a pending offer

The member sees the reserved destination and deadline. They can confirm that
they completed the move. The system then updates both units and closes the
request. If they need help or cannot move, they can reply to the storage email.

### 5.4 Member with an overdue warning

The member sees the warning and its deadline. Renewal clears the active warning
state automatically. The message also explains that they can collect or donate
their belongings.

### 5.5 Family member

The paying family member controls the shared request and unit. Other family
members see the same storage information in read-only form.

## 6. Migration and deployment story

Migration is a controlled deployment task. It starts with a dry run and does
not run as an unreviewed application-startup side effect.

The migration tools are restricted to administrators, board members, and
storage-role users:

- `storageMigration.preview` scans the legacy source, reports anomalies and
  target conflicts, and creates a stable source fingerprint;
- `storageMigration.apply` accepts that exact fingerprint, scans again, and
  refuses to write if the source changed or blockers remain;
- `storageMigration.status` verifies the migration manifest, document counts,
  invariants, and source fingerprint; and
- `storageMigration.finalizeCutover` records the reviewed decision to retire
  the legacy source.

Deterministic document identifiers make an interrupted apply resumable. A
matching record is accepted on rerun. A different record is reported and is
never overwritten. Automatic allocation remains disabled until the
authoritative readiness checks pass.

### 6.1 Inventory migration

The migration creates walls and units from the current configured ranges. The
wall definition supplies the floor and grid dimensions. Unit numbers and
coordinates are derived from those ranges.

Height is derived from the generated row and the wall's row count. The top half
is high and the remaining rows are low, including the middle row of an odd-row
wall. A missing or inconsistent derived value blocks automatic allocation.

Legacy `_box_<number>` comments become internal unit notes. A commented unit
without an owner becomes unavailable so it is not assigned by mistake.

Each valid `Member.storage` value becomes current ownership on the matching
unit. The old system has no reliable assignment time, so the migration uses the
cutoff time and records that limitation in the event history.

### 6.2 Queue migration

A member is treated as queued when `storagequeue === true` or a legacy
`storagerequest` is present. This preserves move and release requests that may
not have set the queue flag.

For each effective queued paying member, the migration:

- approximates `requested_at` from the start of their earliest membership;
- converts the legacy floor and low/upper preference;
- creates an allocation request when they have no unit;
- creates a move request when they have a unit and a location preference; or
- creates a release request when the old value is `none`.

Family claims are consolidated under the paying member. Duplicate ownership,
unknown units, conflicting family claims, and other unsafe cases are blockers
in the dry-run report.

Existing owners with expired lab memberships enter the new system as overdue
and unwarned. They do not receive an immediate warning during migration. The
first warning still requires an administrator-confirmed batch.

### 6.3 Cutover

The deployment sequence is:

1. Restore recent production data in a safe test environment.
2. Run the preview and resolve every blocker.
3. Verify that production MongoDB is a replica set with transaction support.
4. Verify wall layouts and their derived unit heights.
5. Deploy the shared schema, server methods, admin UI, and member UI together.
6. Disable all legacy storage write paths in the same maintenance window.
7. Apply the reviewed migration and verify counts and sample records.
8. Exercise every preview with delivery disabled or restricted.
9. Finalize the cutover after operational review.
10. Remove legacy member fields and settings-backed inventory in a later cleanup.

## 7. Safety and verification

The implemented test suite covers:

- all allocation phases and stable tie-breaking;
- soft-preference fallback;
- exclusion of unavailable, reserved, uncleared, and invalid-layout units;
- family ownership and eligibility;
- queue pause and renewal;
- warning, reminder, reclamation, and exemption timing;
- release and physical-clearance transitions;
- offer creation, completion, extension, cancellation, and inspection;
- automatic versus manual communication policy;
- the existing message, email, and app-push integration;
- event-log presentation and filtering;
- role checks and conflicting updates; and
- migration fingerprints, blockers, interrupted applies, and reruns.

Before production cutover, these scenarios must also be checked against a copy
of production data. Email and push delivery should use restricted settings
during that rehearsal.

## 8. Remaining deployment choices

The storage policy and application flow are settled. Deployment still needs:

- Gmail SMTP submission or Google Workspace SMTP relay configuration for
  `hyllplats@uppsalamakerspace.se`;
- a retention policy for member messages and storage events.

These choices do not change the allocation order or lifecycle described above.
