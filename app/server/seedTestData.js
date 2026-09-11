/**
 * E2E Test Database Seed Module
 *
 * This module seeds the test database when running in test environment.
 * It only runs when SEED_TEST_DATA environment variable is set.
 */

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import Invites from '/imports/common/collections/Invites';
import {
  LEGACY_STORAGE_MIGRATION_VERSION,
  storageMigrationFingerprint,
} from '/imports/common/lib/legacyStorageMigrationFingerprint';
import {
  StorageActionExecutions,
  StorageAssignments,
  StorageEvents,
  StorageExemptions,
  StorageMoves,
  StorageNotificationDeliveries,
  StorageRequests,
  StorageUnits,
  StorageWarnings,
} from '/imports/common/collections/storage';

// Only run in test environment
if (process.env.SEED_TEST_DATA === 'true') {
  Meteor.startup(async () => {
    console.log('[E2E] Seeding test database...');

    // Dates for test data
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const liabilityDate = new Date('2024-01-01');

    // Clear existing data
    console.log('[E2E] Clearing existing data...');
    await Meteor.users.removeAsync({});
    await Members.removeAsync({});
    await Memberships.removeAsync({});
    await LiabilityDocuments.removeAsync({});
    await Invites.removeAsync({});
    await Promise.all([
      StorageActionExecutions.removeAsync({}),
      StorageAssignments.removeAsync({}),
      StorageEvents.removeAsync({}),
      StorageExemptions.removeAsync({}),
      StorageMoves.removeAsync({}),
      StorageNotificationDeliveries.removeAsync({}),
      StorageRequests.removeAsync({}),
      StorageUnits.removeAsync({}),
      StorageWarnings.removeAsync({}),
    ]);

    // Create admin role if it doesn't exist
    console.log('[E2E] Creating admin role...');
    const existingRole = await Meteor.roles.findOneAsync({ _id: 'admin' });
    if (!existingRole) {
      await Roles.createRoleAsync('admin');
    }

    // Create liability document first
    console.log('[E2E] Creating liability document...');
    await LiabilityDocuments.insertAsync({
      title: 'Test Liability Agreement',
      date: liabilityDate,
      text: {
        sv: '# Ansvarsfriskrivning\n\nDetta är ett testdokument för E2E-tester.\n\n## Regler\n\n1. Var försiktig\n2. Städa efter dig\n3. Fråga om du är osäker',
        en: '# Liability Agreement\n\nThis is a test document for E2E tests.\n\n## Rules\n\n1. Be careful\n2. Clean up after yourself\n3. Ask if unsure'
      }
    });

    // Test user definitions
    const testUsers = [
      {
        email: 'member@test.com',
        password: 'password123',
        verified: true,
        mid: 'M001',
        name: 'Test Member',
        mobile: '0701234567',
        birthyear: 1990,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: 'labandmember',
        hasLabAccess: true
      },
      {
        email: 'noliability@test.com',
        password: 'password123',
        verified: true,
        mid: 'M002',
        name: 'No Liability Member',
        mobile: '0702345678',
        birthyear: 1985,
        liabilityDate: null,
        family: false,
        membershipType: 'labandmember',
        hasLabAccess: true
      },
      {
        email: 'noliability2@test.com',
        password: 'password123',
        verified: true,
        mid: 'M007',
        name: 'No Liability Member 2',
        mobile: '0707890123',
        birthyear: 1988,
        liabilityDate: null,
        family: false,
        membershipType: 'labandmember',
        hasLabAccess: true
      },
      {
        email: 'family@test.com',
        password: 'password123',
        verified: true,
        mid: 'M003',
        name: 'Family Payer',
        mobile: '0703456789',
        birthyear: 1980,
        liabilityDate: liabilityDate,
        family: true,
        membershipType: 'labandmember',
        hasLabAccess: true
      },
      {
        email: 'storage-dependent@test.com',
        password: 'password123',
        verified: true,
        mid: 'M008',
        name: 'Storage Family Member',
        mobile: '0708901234',
        birthyear: 1998,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: null,
        hasLabAccess: false,
        infamilyEmail: 'family@test.com'
      },
      {
        email: 'storage-warning@test.com',
        password: 'password123',
        verified: true,
        mid: 'M009',
        name: 'Storage Warning Member',
        mobile: '0709012345',
        birthyear: 1982,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: null,
        hasLabAccess: false,
        expiredLab: true
      },
      {
        email: 'storage-clearance@test.com',
        password: 'password123',
        verified: true,
        mid: 'M010',
        name: 'Storage Clearance Member',
        mobile: '0700123456',
        birthyear: 1983,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: null,
        hasLabAccess: false
      },
      {
        email: 'storage-move@test.com',
        password: 'password123',
        verified: true,
        mid: 'M011',
        name: 'Storage Move Member',
        mobile: '0701123456',
        birthyear: 1984,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: 'labandmember',
        hasLabAccess: true
      },
      {
        email: 'storage-retry@test.com',
        password: 'password123',
        verified: true,
        mid: 'M012',
        name: 'Storage Retry Member',
        mobile: '0702123456',
        birthyear: 1986,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: 'labandmember',
        hasLabAccess: true
      },
      {
        email: 'storage-queue@test.com',
        password: 'password123',
        verified: true,
        mid: 'M013',
        name: 'Storage Queue Member',
        mobile: '0703123456',
        birthyear: 1987,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: 'labandmember',
        hasLabAccess: true
      },
      {
        email: 'invited@test.com',
        password: 'password123',
        verified: true,
        mid: 'M004',
        name: 'Invited Member',
        mobile: '0704567890',
        birthyear: 1995,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: 'member',
        hasLabAccess: false
      },
      {
        email: 'toinvite@test.com',
        password: 'password123',
        verified: true,
        mid: 'M005',
        name: 'To Invite Member',
        mobile: '0705678901',
        birthyear: 1992,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: 'member',
        hasLabAccess: false
      },
      {
        email: 'unverified@test.com',
        password: 'password123',
        verified: false,
        mid: null,
        name: null,
        mobile: null,
        birthyear: null,
        liabilityDate: null,
        family: false,
        membershipType: null,
        hasLabAccess: false,
        roles: []
      },
      {
        email: 'admin@test.com',
        password: 'adminadmin',
        verified: true,
        mid: 'M006',
        name: 'Admin User',
        mobile: '0706789012',
        birthyear: 1975,
        liabilityDate: liabilityDate,
        family: false,
        membershipType: 'labandmember',
        hasLabAccess: true,
        roles: ['admin']
      }
    ];

    // Create users and members
    console.log('[E2E] Creating test users and members...');
    const memberIdMap = {};  // Map email -> memberId for family references
    for (const userData of testUsers) {
      // Create Meteor user using async version to ensure insertion completes
      const userId = await Accounts.createUserAsync({
        email: userData.email,
        password: userData.password
      });

      // Set email verification status
      if (userData.verified) {
        await Meteor.users.updateAsync(
          { _id: userId },
          { $set: { 'emails.0.verified': true } }
        );
      }

      // Assign roles if specified
      if (userData.roles && userData.roles.length > 0) {
        await Roles.addUsersToRolesAsync(userId, userData.roles);
      }

      // Only create member and membership for verified users with member data
      if (userData.mid) {
        // Create member record - capture the MongoDB _id
        const memberDoc = {
          mid: userData.mid,
          name: userData.name,
          email: userData.email,
          mobile: userData.mobile,
          birthyear: userData.birthyear,
          family: userData.family
        };
        if (userData.infamilyEmail) memberDoc.infamily = memberIdMap[userData.infamilyEmail];
        if (userData.hasLabAccess) memberDoc.lab = threeMonthsFromNow;
        if (userData.expiredLab) memberDoc.lab = oneMonthAgo;
        // Only set liabilityDate if provided (null/undefined means no liability approved)
        if (userData.liabilityDate) {
          memberDoc.liabilityDate = userData.liabilityDate;
        }
        const memberId = await Members.insertAsync(memberDoc);

        // Store memberId for later reference (e.g., family invites)
        memberIdMap[userData.email] = memberId;

        // Create membership using the actual member _id
        if (userData.membershipType) {
          const membershipData = {
            mid: memberId,  // Use MongoDB _id, not custom mid
            type: userData.membershipType,
            start: oneMonthAgo,
            memberend: oneYearFromNow,
            family: userData.family
          };

          if (userData.hasLabAccess) {
            membershipData.labend = threeMonthsFromNow;
          }

          await Memberships.insertAsync(membershipData);
        }
      }

      console.log(`[E2E] Created user: ${userData.email}${userData.verified ? '' : ' (unverified)'}`);
    }

    // Create family invite (invited@test.com has pending invite from family@test.com)
    console.log('[E2E] Creating family invite...');
    const familyPayerId = memberIdMap['family@test.com'];
    await Invites.insertAsync({
      email: 'invited@test.com',
      infamily: familyPayerId
    });

    // Isolated v2 storage fixtures. The ordinary and retry members start
    // empty; each other lifecycle owns distinct units and records.
    const insertUnit = (name, position, availabilityStatus, owner) => StorageUnits.insertAsync({
      name,
      ...(owner ? { owner } : {}),
      floor: 'floor1',
      height: position <= 24 ? 'low' : 'high',
      wall: 'Floor 1, Wall 1',
      position,
      availability_status: availabilityStatus,
      createdAt: now,
      updatedAt: now,
    });
    const insertAssignment = (unit, owner, request) => StorageAssignments.insertAsync({
      unit,
      owner,
      ...(request ? { request } : {}),
      assigned_at: oneMonthAgo,
      assigned_by: '__e2e_seed__',
      createdAt: now,
      updatedAt: now,
    });

    const familyUnitId = await insertUnit('1001', 1, 'occupied', familyPayerId);
    await insertAssignment(familyUnitId, familyPayerId);

    const warningOwnerId = memberIdMap['storage-warning@test.com'];
    const warningUnitId = await insertUnit('1002', 2, 'occupied', warningOwnerId);
    const warningAssignmentId = await insertAssignment(warningUnitId, warningOwnerId);
    await StorageWarnings.insertAsync({
      assignment: warningAssignmentId,
      owner: warningOwnerId,
      warned_at: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
      warned_by: '__e2e_seed__',
      deadline_at: fiveDaysFromNow,
      warning_status: 'open',
      createdAt: now,
      updatedAt: now,
    });

    const clearanceOwnerId = memberIdMap['storage-clearance@test.com'];
    await insertUnit('1003', 3, 'awaiting_clearance', clearanceOwnerId);

    const moveOwnerId = memberIdMap['storage-move@test.com'];
    const moveSourceId = await insertUnit('1004', 4, 'occupied', moveOwnerId);
    const moveDestinationId = await insertUnit('1005', 5, 'reserved', moveOwnerId);
    const moveRequestId = await StorageRequests.insertAsync({
      owner: moveOwnerId,
      request_type: 'move',
      requested_at: oneMonthAgo,
      preference: { floor: 'floor1', height: 'low' },
      request_status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    });
    const moveAssignmentId = await insertAssignment(moveSourceId, moveOwnerId, moveRequestId);
    await StorageRequests.updateAsync(moveRequestId, { $set: { source_assignment: moveAssignmentId } });
    await StorageMoves.insertAsync({
      owner: moveOwnerId,
      request: moveRequestId,
      from_assignment: moveAssignmentId,
      from_unit: moveSourceId,
      to_unit: moveDestinationId,
      reserved_at: now,
      reserved_by: '__e2e_seed__',
      deadline_at: twoWeeksFromNow,
      requires_inspection: false,
      move_status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const queueOwnerId = memberIdMap['storage-queue@test.com'];
    await insertUnit('1006', 6, 'available');
    await StorageRequests.insertAsync({
      owner: queueOwnerId,
      request_type: 'allocation',
      requested_at: oneMonthAgo,
      preference: { floor: 'floor1', height: 'low' },
      request_status: 'waiting',
      createdAt: now,
      updatedAt: now,
    });

    // Fill four complete 12-position shelf sections. A few unavailable units
    // make the status visualization realistic; the remainder are assignable.
    for (let position = 7; position <= 48; position += 1) {
      const status = position % 13 === 0 ? 'unavailable' : 'available';
      await insertUnit(String(1000 + position), position, status);
    }

    // Mark the local fixture as having completed the administrator-confirmed
    // legacy cutover. The empty manifest is intentional: all records above
    // are native v2 fixture data rather than documents owned by the migration.
    // Production can only create these commit markers through the guarded
    // preview/apply/finalize workflow.
    const migrationDocuments = {
      storageUnits: [],
      storageAssignments: [],
      storageRequests: [],
      storageEvents: [],
    };
    const manifestPayload = { version: 1, documents: migrationDocuments };
    const migrationManifest = {
      ...manifestPayload,
      digest: storageMigrationFingerprint(manifestPayload),
    };
    const migrationFingerprint = storageMigrationFingerprint({ fixture: 'umsme-local-storage-v2' });
    const migrationSummaryId = `${LEGACY_STORAGE_MIGRATION_VERSION}:event:summary`;
    await StorageEvents.insertAsync({
      _id: migrationSummaryId,
      entity_type: 'storageMigration',
      entity_id: LEGACY_STORAGE_MIGRATION_VERSION,
      event_type: 'legacy_storage_migration_applied',
      actor_type: 'system',
      actor: '__e2e_seed__',
      occurred_at: now,
      details: {
        fingerprint: migrationFingerprint,
        manifest: migrationManifest,
        fixture: true,
      },
    });
    await StorageEvents.insertAsync({
      _id: `${LEGACY_STORAGE_MIGRATION_VERSION}:event:cutover-finalized`,
      entity_type: 'storageMigration',
      entity_id: LEGACY_STORAGE_MIGRATION_VERSION,
      event_type: 'legacy_storage_cutover_finalized',
      actor_type: 'administrator',
      actor: memberIdMap['admin@test.com'],
      occurred_at: now,
      reason: 'Local dummy-data fixture',
      details: {
        fingerprint: migrationFingerprint,
        summary_event_id: migrationSummaryId,
        manifest_digest: migrationManifest.digest,
        fixture: true,
      },
    });

    console.log('[E2E] Test database seeding completed!');
    console.log('[E2E] Test users:');
    console.log('[E2E]   - member@test.com / password123 (active member with liability)');
    console.log('[E2E]   - noliability@test.com / password123 (active member without liability)');
    console.log('[E2E]   - family@test.com / password123 (family payer)');
    console.log('[E2E]   - storage-dependent@test.com / password123 (read-only storage dependent)');
    console.log('[E2E]   - storage-warning@test.com / password123 (expired owner with warning)');
    console.log('[E2E]   - storage-clearance@test.com / password123 (awaiting clearance)');
    console.log('[E2E]   - storage-move@test.com / password123 (pending move)');
    console.log('[E2E]   - storage-retry@test.com / password123 (mutation retry)');
    console.log('[E2E]   - storage-queue@test.com / password123 (eligible allocation queue)');
    console.log('[E2E]   - invited@test.com / password123 (has pending family invite)');
    console.log('[E2E]   - toinvite@test.com / password123 (available to invite)');
    console.log('[E2E]   - unverified@test.com / password123 (unverified email)');
    console.log('[E2E]   - admin@test.com / adminadmin (admin user)');

    if (process.env.SEED_ONLY === 'true') {
      console.log('');
      console.log('[E2E] ✓ Seeding complete. Press Ctrl+C to exit.');
    }
  });
}
