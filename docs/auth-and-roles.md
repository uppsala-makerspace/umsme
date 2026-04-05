# Authentication, Authorization, and Member Onboarding

## 1. Overview

UMSME uses [Meteor Accounts](https://docs.meteor.com/accounts) for authentication with email/password and Google OAuth. Authorization is role-based using the [`alanning:roles`](https://github.com/Meteor-Community-Packages/meteor-roles) package. The system maintains two separate identity concepts -- Meteor **Users** (authentication accounts) and **Members** (makerspace membership records) -- linked by email address.

All three applications (admin, app, payment) share the same MongoDB database, so a single set of Users, Members, and Roles applies across the system.

## 2. Authentication Methods

### Email + Password

Standard `accounts-password` flow. On signup, a verification email is sent automatically (`sendVerificationEmail: true` in `Accounts.config`). The sender is configured as `Uppsala MakerSpace <no-reply@uppsalamakerspace.se>`.

### Google OAuth

Configured at startup in `app/server/accounts.js`. Credentials are read from `Meteor.settings.serviceConfigurations.google` (containing `clientId` and `secret`) and upserted into the `ServiceConfiguration.configurations` collection.

### Facebook OAuth

Infrastructure is present but currently **commented out** in `app/server/accounts.js`. The settings key `serviceConfigurations.facebook` is expected but not loaded.

### Account Merging on OAuth Login

`Accounts.setAdditionalFindUserOnExternalLogin()` intercepts Google logins and looks up existing users by the OAuth email via `Accounts.findUserByEmail()`. This prevents duplicate accounts when a user first registers with email/password and later signs in with Google (or vice versa).

### OAuth Email Synchronization

An `Accounts.onLogin` hook fires after every login. If the user has no `emails` array (which happens when the account was originally created via OAuth), the hook copies the email from `services.google.email` (or `services.facebook.email`) into:

- `emails: [{ address, verified: true }]` -- marked verified because the OAuth provider already verified it
- `username` -- set to the email address

This is critical for two reasons:

1. The `services` subdocument is not published to the client; without `emails`, client code cannot determine the user's email or verification status.
2. It prevents the user from accidentally creating a second (email/password) account with the same address.

## 3. Email Verification

Email verification is the gate between "authenticated user" and "linked member." Until at least one email on the user's account is marked `verified: true`, the system will not look up a Member record.

- **Email/password signups**: Verification email sent automatically on account creation.
- **OAuth signups**: Treated as pre-verified (the `Accounts.onLogin` hook sets `verified: true`).
- **Custom reset-password URL**: Configured as `Meteor.absoluteUrl('resetPassword/${token}')` so the app's client-side router handles the token.

## 4. User-to-Member Linking

Users and Members are **separate collections** with no foreign key. The link is established at runtime by matching email addresses.

### `findForUser()` (`app/server/methods/utils.js`)

This is the core linking function, used by nearly every member-facing method:

```
1. Get the current Meteor user (via Meteor.userId() / Meteor.userAsync())
2. Extract the first email from user.emails[]
3. If the email is verified:
     member = Members.findOneAsync({ email })
4. Return { user, email, verified, member }
```

If `member` is `null`, the user is authenticated but has no membership record yet (either unverified or has not completed registration).

### `findMemberForUser()`

A convenience wrapper that returns only the `member` from `findForUser()`. Used as an authorization check in most app methods -- if it returns falsy, the method throws.

### Trust Implication

Any method that calls `findMemberForUser()` implicitly requires:
- An authenticated Meteor session (`Meteor.userId()` is set)
- A verified email address
- A Member document whose `email` matches the verified email

## 5. Member Onboarding Flow

Registration is a multi-step process that bridges the User and Member collections:

### Step 1: Account Creation

The user creates an account via email/password signup or Google OAuth. At this point, a Meteor User document exists but no Member record.

### Step 2: Email Verification

- **Email/password**: User must click the verification link sent to their email.
- **Google OAuth**: Automatically verified by the `onLogin` hook (see section 2).

### Step 3: Profile Completion (`createOrUpdateProfile`)

The `createOrUpdateProfile` method in `app/server/methods/profile.js` handles both creating new members and updating existing ones:

1. Calls `findForUser()` to get the current user, email, verification status, and any existing member.
2. **Guards**: Throws if no user is signed in or if the email is not verified.
3. **If a Member already exists** (matched by email): Updates the member's `name`, `mobile`, `birthyear`, `gender`, and `rfid` fields.
4. **If no Member exists**: Generates a unique random numeric `mid` (member ID), then inserts a new Member document with `{ name, email, mobile, mid, birthyear, gender, rfid }`.

There is no separate "pending member" collection or approval step in the current codebase. The Member record is created directly upon profile submission. However, the Member must still be marked `registered: true` (by an admin) before they gain access to certain features like door unlocking.

### Step 4: Admin Acceptance

A Member's `registered` field (boolean) indicates whether they have been formally accepted by an administrator. Until `registered` is `true`, the member cannot:
- Unlock doors (checked in `unlockDoor` via `isMemberRegistered()`)
- Access other registration-gated features

This provides an admin review step even though the Member record is created automatically.

## 6. Authorization Model

The system has three trust tiers:

### Tier 1: Unauthenticated

No access to any methods or publications. All Meteor methods check `Meteor.userId()` or call `findMemberForUser()` as a first guard.

### Tier 2: Authenticated Member (no role required)

Most app-facing methods operate at this level. The authorization pattern is:

```js
const member = await findMemberForUser();
if (!member) throw new Meteor.Error("no-user", "...");
// proceed -- ownership is implicit via email match
```

Members can only access their own data. There is no cross-member data access in the app. Examples:
- `findInfoForUser` -- returns the caller's own member info, memberships, family data
- `inviteFamilyMember` -- only if the caller's member has `family: true`
- `certificates.request` -- creates an attestation for the caller's own member ID
- `unlockDoor` -- requires active lab membership, `registered: true`, approved liability, and mandatory certificate

### Tier 3: Admin / Board (role required)

The admin application gates all access behind role checks.

**Publications** (`admin/server/publications.js`):

Every publication uses a shared guard function:

```js
const createAuthFuncFor = (col) => async function () {
  if (this.userId && await Roles.userIsInRoleAsync(this.userId, ['admin', 'board'])) {
    return col.find();
  }
  this.ready();
};
```

Both `admin` and `board` roles grant read access to all collections (members, memberships, payments, messages, users, certificates, etc.).

The `roleAssignment` publication is more granular: admins see all role assignments, while non-admin users see only their own.

**Methods** (`admin/server/methods/`):

All admin methods check for the `admin` role specifically (not `board`):

```js
if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
  throw new Meteor.Error('Not authorized');
}
```

This applies to: mail sending, bank operations, lock management, member updates, and role management.

## 7. Roles

### Built-in Roles

| Role | Scope | Description |
|------|-------|-------------|
| `admin` | Global | Full access to admin app publications and all admin methods. Can manage other users' roles. |
| `board` | Global | Read access to admin app publications (same as admin for data viewing). Cannot execute admin methods. |
| `admin-locks` | Global | Checked alongside `admin` in the app's `checkIsAdmin` method and for push notification testing. Does not grant admin publication access. |

### Certificate Roles (Dynamic)

Each Certificate document can define a `certifierRole` string (e.g., `"certifier-laser"`, `"certifier-3dprint"`). These are custom roles created per certificate type. A user with a matching role can certify attestation requests for that certificate, in addition to members explicitly listed in the certificate's `certifiers` array.

The `canCertify()` function in `app/server/methods/certificates.js` checks both paths:

1. Is the member's `_id` in `certificate.certifiers[]`?
2. Does the member's linked User have `certificate.certifierRole` via `Roles.userIsInRoleAsync()`?

See [certificates.md](certificates.md) for full certificate system documentation.

### Role Lifecycle

Roles are created with `Roles.createRoleAsync(name, { unlessExists: true })`. The `admin` role is created at startup of the admin app (in `admin/server/adminAvailable.js`).

## 8. Role Management

Role assignment is managed from the admin app's user view (`admin/client/ui/users/UserView.js`) and executed via server methods in `admin/server/methods/admin.js`:

| Method | Effect | Requires |
|--------|--------|----------|
| `addToAdminGroup(userId)` | Adds user to `admin` role | Caller must be `admin` |
| `removeFromAdminGroup(userId)` | Removes user from `admin` role | Caller must be `admin` |
| `addToBoardGroup(userId)` | Adds user to `board` role | Caller must be `admin` |
| `removeFromBoardGroup(userId)` | Removes user from `board` role | Caller must be `admin` |

Only users with the `admin` role can modify role assignments. The `board` role does not grant role management privileges.

### Bootstrap Admin Account

On admin app startup (`admin/server/adminAvailable.js`), the system ensures an `admin` user exists:

1. Looks for a user with username `admin`.
2. If found, resets its password to `Meteor.settings.adminpassword` (or `"adminadmin"` as fallback).
3. If not found, creates the user with that password.
4. Ensures the `admin` role exists and assigns it to this user.

This guarantees there is always a way to access the admin app, even on a fresh database.

### User Creation from Admin

The `serverCreateUser` method (`admin/server/methods/user.js`) allows creating users from the admin interface with a username and password. It requires the caller to have the `admin` role.

## 9. Family Invites

Family memberships allow a paying member to share their membership with up to 4 additional members. The invite flow works as follows:

### Invite Flow

1. **Paying member sends invite**: Calls `inviteFamilyMember({ email })`. The paying member must have `family: true` on their Member record. Creates an `Invites` document with `{ email, infamily: payingMember._id }`.

2. **Limits enforced**: Total family members plus outstanding invites cannot exceed 4.

3. **Invited person registers/logs in**: When checking member info (`findInfoForUser`), the system looks for an Invite matching the member's email. If found, it is returned to the client.

4. **Accept**: `acceptFamilyMemberInvite()` sets `infamily: invite.infamily` on the accepting member's record and deletes the invite. The member is now part of the family.

5. **Reject**: `rejectFamilyMemberInvite()` deletes the invite without modifying the member.

See [data-model.md](data-model.md) for the Invites collection schema and the `infamily`/`family` fields on Members.

For family members (those with `infamily` set), membership status is resolved from the **paying member's** memberships, not their own. See [business-rules.md](business-rules.md) for family membership rules.

### Family Management Methods

| Method | Who can call | Effect |
|--------|-------------|--------|
| `inviteFamilyMember({ email })` | Paying member (`family: true`) | Creates invite |
| `cancelFamilyMemberInvite({ email })` | Paying member | Deletes pending invite |
| `acceptFamilyMemberInvite()` | Invited member | Sets `infamily`, deletes invite |
| `rejectFamilyMemberInvite()` | Invited member | Deletes invite |
| `leaveFamilyMembership()` | Non-paying family member | Unsets `infamily`, sets `family: false` |
| `removeFamilyMember({ email })` | Paying member | Unsets `infamily` on the removed member |

## 10. Password Reset

Standard Meteor password reset flow with a custom URL:

```js
Accounts.urls.resetPassword = (token) => Meteor.absoluteUrl(`resetPassword/${token}`);
```

This generates URLs like `https://app.domain.se/resetPassword/<token>`, which the app's React router handles client-side.

## 11. OAuth Configuration

See [configuration.md](configuration.md#8-oauth-configuration) for how to set up Google OAuth credentials in `settings.json`.

## 12. Door Unlock Authorization

Door unlocking is the most heavily guarded operation, requiring authentication, a linked member, active lab membership, admin registration, liability approval, and a valid mandatory certificate. See [door-access.md](door-access.md#unlock-prerequisites) for the full prerequisite chain with error codes.

## 13. Collection-Level Allow Rules

The `allow` function in `common/collections/allow.js` permits all insert/update/remove operations for any logged-in user (`userId !== null`). This is applied to `Meteor.users`, `Meteor.roles`, and `Meteor.roleAssignment`.

This is a permissive configuration that relies on method-level authorization rather than collection-level restrictions. In practice, client-side direct collection writes are rare -- the applications use Meteor methods for mutations, which enforce their own authorization checks.

## 14. Security Summary

| Boundary | Mechanism |
|----------|-----------|
| Unauthenticated vs. authenticated | `Meteor.userId()` / `this.userId` check |
| Authenticated vs. member | `findMemberForUser()` -- requires verified email + matching Member document |
| Member vs. registered member | `member.registered` boolean (admin-set) |
| Member vs. admin | `Roles.userIsInRoleAsync(userId, 'admin')` |
| Admin read vs. admin write | Publications accept `admin` or `board`; methods require `admin` only |
| Certifier authorization | `certificate.certifiers[]` list or `certificate.certifierRole` via Roles |
| Family data isolation | Methods verify the caller is the paying member or an invited member before modifying family data |

## Related Documentation

- [certificates.md](certificates.md) -- Certificate types, certifier roles, and attestation workflow
- [data-model.md](data-model.md) -- User, Member, Membership, and Invite collection schemas
- [architecture.md](architecture.md) -- How authentication works across admin, app, and payment services
