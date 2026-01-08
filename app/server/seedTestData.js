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

// Only run in test environment
if (process.env.SEED_TEST_DATA === 'true') {
  Meteor.startup(async () => {
    console.log('[E2E] Seeding test database...');

    // Dates for test data
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const liabilityDate = new Date('2024-01-01');

    // Clear existing data
    console.log('[E2E] Clearing existing data...');
    await Meteor.users.removeAsync({});
    await Members.removeAsync({});
    await Memberships.removeAsync({});
    await LiabilityDocuments.removeAsync({});
    await Invites.removeAsync({});

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

    console.log('[E2E] Test database seeding completed!');
    console.log('[E2E] Test users:');
    console.log('[E2E]   - member@test.com / password123 (active member with liability)');
    console.log('[E2E]   - noliability@test.com / password123 (active member without liability)');
    console.log('[E2E]   - family@test.com / password123 (family payer)');
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
