# Certificates and Attestations

## 1. Overview

Certificates represent skills, safety training, or qualifications that members can obtain at Uppsala MakerSpace. Attestations are records of a specific member holding a specific certificate -- they track the request, confirmation, and (optionally) expiry of a member's certification.

This system serves two primary purposes:

- **Skill tracking**: Members can request certificates for skills they have demonstrated. Authorized certifiers review and confirm these requests.
- **Access control**: A certificate can be marked as mandatory, meaning members must hold a confirmed, non-expired attestation for it before they can unlock doors. See [door-access.md](door-access.md) for how mandatory certificates gate door unlocking.

## 2. Certificate and Attestation Properties

See [data-model.md](data-model.md) for the full schemas of both collections. The key fields to understand for this document:

- **Certificate**: `name` (multilingual), `defaultValidityDays` (auto-expiry), `prerequisites` (other certificate IDs), `certifiers` (member IDs), `certifierRole` (Meteor role name), `mandatory` (gates door access).
- **Attestation**: `certificateId`, `memberId`, `certifierId` (set on confirmation), `startDate`, `endDate` (auto-calculated from `defaultValidityDays`), `comment`/`privateComment`, `attempt`, `confirmedAt`.

### Determining attestation state

An attestation's state is derived from its fields rather than stored explicitly:

- **Pending**: `certifierId` does not exist.
- **Confirmed (active)**: `certifierId` exists AND (`endDate` is absent OR `endDate` is in the future).
- **Expired**: `certifierId` exists AND `endDate` is in the past.

## 4. Attestation Lifecycle

The full lifecycle of an attestation follows this flow:

```
                              +-----------+
                              |  No       |
                              |  attestation
                              +-----------+
                                    |
                          certificates.request()
                                    |
                                    v
                              +-----------+
                     +------->|  Pending  |<--------+
                     |        +-----------+         |
                     |           |  |   |           |
                     |           |  |   |           |
        certificates.reRequest() |  |   |  certificates.cancel()
                     |           |  |   |  certificates.remove()
                     |           |  |   |           |
                     |           |  |   +---------->+----------+
                     |           |  |               |  Removed |
                     |           |  |               +----------+
                     |           |  |
                     |           |  | certificates.confirm()
                     |           |  |
                     |           |  v
                     |     +------------+
                     |     |  Confirmed |
                     |     |  (active)  |
                     |     +------------+
                     |           |
                     |      time passes
                     |    (if endDate set)
                     |           |
                     |           v
                     |     +------------+
                     +-----|  Expired   | (member must re-request
                           +------------+  from scratch)
```

### Step-by-step workflow

1. **Request** -- A member calls `certificates.request(certificateId)`.
   - Creates an attestation with `startDate = now`, `attempt = 1`, and no `certifierId`.
   - Duplicate prevention: the call is rejected if the member already has a pending attestation or a confirmed, non-expired attestation for the same certificate.
   - A member with an expired attestation *can* create a new request.

2. **Pending** -- The attestation is now visible to certifiers. Certifiers see pending requests via `certificates.getPendingToConfirm()` or within the detail view of a specific certificate (`certificates.getDetails()`).

3. **Confirm** -- A certifier calls `certificates.confirm(attestationId, comment, privateComment)`.
   - Sets `certifierId` to the confirming member's ID and `confirmedAt` to the current time.
   - If the certificate has `defaultValidityDays`, calculates `endDate` as `now + defaultValidityDays` days.
   - Optionally attaches a public `comment` and/or `privateComment`.

4. **Active** -- The attestation is now confirmed. If an `endDate` was set, the attestation remains valid until that date.

5. **Cancel / Remove** -- A member can cancel their own pending request via `certificates.cancel(attestationId)` or `certificates.remove(attestationId)`. A certifier can also remove a pending request that has a comment via `certificates.remove()`. Confirmed attestations cannot be cancelled or removed.

6. **Re-request** -- While a request is still pending, the member can call `certificates.reRequest(attestationId)` to refresh it. This updates `startDate` to now, increments `attempt`, and clears any existing `comment`. This is useful if the original request has gone stale or the member wants to signal renewed readiness.

7. **Expiry** -- If the attestation has an `endDate` and that date passes, the attestation is considered expired. The member must submit a new request (step 1) to regain certification.

## 5. Certifier Authorization

A member can certify (confirm attestations for) a given certificate if **either** of the following is true:

- The member's `_id` appears in the certificate's `certifiers` array, **OR**
- The certificate has a `certifierRole` set, and the member's linked Meteor user account has that role.

The authorization check (`canCertify` in `app/server/methods/certificates.js`) resolves the member-to-user link by looking up the member's email and finding the corresponding Meteor user account, then checking `Roles.userIsInRoleAsync()`.

See [auth-and-roles.md](auth-and-roles.md) for details on how Meteor roles are assigned and managed.

## 6. Mandatory Certificates

At most one certificate can be marked `mandatory: true` at a time. This is enforced by deny rules on the `certificates` collection:

- **Cannot delete** a mandatory certificate (deny rule blocks `remove` when `doc.mandatory` is true).
- **Cannot unmark** a mandatory certificate (deny rule blocks updates that set `mandatory` to `false` or `$unset` the `mandatory` field).
- **Cannot mark a second** certificate as mandatory (deny rule blocks updates that set `mandatory: true` if another mandatory certificate already exists).

### Door access gating

The `unlockDoor` method checks mandatory certificate status as one of several prerequisites for unlocking a door. If the member lacks a confirmed attestation, or the attestation has expired, the unlock is rejected. See [door-access.md](door-access.md) for the complete prerequisite chain.

The `certificates.getMandatoryStatus()` method provides a convenient way for the client to check the current user's mandatory certificate status (returns the certificate and whether the user holds a valid attestation).

## 7. Comments

Attestations support two comment fields, both set by certifiers:

- **`comment`** -- A public comment visible to the requesting member. Shown alongside the attestation details in the member-facing app. Stripped from the response when a non-certifier views their own attestation (via `getDetails` or `getMyAttestations`).
- **`privateComment`** -- A private comment visible only to certifiers and admins. Never included in responses to regular members. Useful for internal notes about the member's skill level or issues observed.

Comments can be added in two ways:

1. **During confirmation** -- Pass `comment` and/or `privateComment` as arguments to `certificates.confirm()`.
2. **Without confirming** -- Call `certificates.addComment(attestationId, comment, privateComment)` to add or update comments on a pending request without confirming it. Only authorized certifiers can use this method.

Note: When a member calls `certificates.reRequest()`, any existing `comment` is cleared (unset) from the attestation. The `privateComment` is preserved.

## 8. Auto-Cleanup of Pending Attestations

A cron job defined in `admin/server/cronjob/cleanupPendingAttestations.js` automatically removes stale pending requests:

| Property | Value |
|----------|-------|
| **Schedule** | Every 20 minutes |
| **Expiry threshold** | 2 hours |
| **Criteria for removal** | Attestation is pending (`certifierId` does not exist) AND has no `comment` AND `startDate` is older than 2 hours |

Pending attestations that have a `comment` from a certifier are preserved regardless of age. This ensures that certifier feedback is not lost -- the member or certifier must explicitly remove these via `certificates.remove()`.

The cron job runs within the **admin** application using `chatra:synced-cron`.

## 9. Available Methods Summary

All methods are defined in `app/server/methods/certificates.js`.

| Method | Who can call | Description |
|--------|-------------|-------------|
| `certificates.getAll` | Any logged-in user | Returns all certificate definitions. |
| `certificates.getDetails(certificateId)` | Any logged-in member | Returns a certificate with the caller's attestation (if any), certifier status, and (for certifiers) pending requests and recently confirmed attestations. Strips `privateComment` from the caller's own attestation. |
| `certificates.getMyAttestations` | Any logged-in member | Returns all attestations for the current member, enriched with certificate info. Strips `privateComment`. |
| `certificates.getPendingToConfirm` | Certifiers | Returns all pending attestations across certificates the caller can certify, plus attestations confirmed by the caller in the last 24 hours. Returns `null` if the caller is not a certifier for any certificate. |
| `certificates.getRequestDetail(attestationId)` | Certifiers | Returns full detail for a single attestation, including `privateComment`. Only accessible to certifiers of the associated certificate. |
| `certificates.request(certificateId)` | Any logged-in member | Creates a pending attestation. Rejected if the member already has a pending or confirmed (non-expired) attestation for this certificate. |
| `certificates.cancel(attestationId)` | Requesting member | Removes the caller's own pending attestation. Cannot cancel confirmed attestations. |
| `certificates.reRequest(attestationId)` | Requesting member | Updates `startDate` to now, increments `attempt`, and clears `comment` on the caller's own pending attestation. Cannot re-request confirmed attestations. |
| `certificates.confirm(attestationId, comment, privateComment)` | Certifiers | Confirms a pending attestation. Sets `certifierId`, `confirmedAt`, and optionally `endDate` (based on `defaultValidityDays`). Optionally attaches comments. |
| `certificates.addComment(attestationId, comment, privateComment)` | Certifiers | Adds or updates comments on a pending attestation without confirming it. |
| `certificates.getMandatoryStatus` | Any logged-in user | Returns the mandatory certificate (if any) and whether the current user holds a valid attestation for it. |
| `certificates.remove(attestationId)` | Requesting member or certifiers | Removes a pending attestation. The requesting member can always remove their own. A certifier can remove a pending attestation only if it has a `comment`. Cannot remove confirmed attestations. |

## Related Documentation

- [door-access.md](door-access.md) -- How mandatory certificates gate door unlocking
- [auth-and-roles.md](auth-and-roles.md) -- Certifier roles and role management
- [data-model.md](data-model.md) -- Certificate and Attestation collection schemas
