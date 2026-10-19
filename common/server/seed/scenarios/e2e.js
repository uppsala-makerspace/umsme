/**
 * The e2e scenario: the personas and the fixtures the e2e tests rely on,
 * nothing more. See plan/test-strategy.md.
 *
 * Every persona gets a known login token (e2eLoginToken), so that tests can
 * start logged in.
 *
 * The storage fixtures are positional: tests look for units by name, 1001 to
 * 1006, and each storage lifecycle owns its own units.
 */
import { Accounts } from 'meteor/accounts-base';
import { StorageUnits, StorageRequests, StorageOffers } from '/imports/common/collections/storage';
import { daysFromNow } from '../dates';
import { makeStorageWalls, makeStorageUnit } from '../storage';
import { makeLiabilityDocument, makeMessageTemplate } from '../documents';
import { makeStoreItem, makePurchase } from '../shop';
import { makeFakeLock } from '../lock';
import { makeFakeBank } from '../bank';
import { makeMember, pay } from '../members';
import { Payments } from '/imports/common/collections/payments';
import { uploadImage } from '/imports/common/server/googleDrive';
import { Workshops } from '/imports/common/collections/workshops';
import { Spaces } from '/imports/common/collections/spaces';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { Certificates } from '/imports/common/collections/certificates';
import { Attestations } from '/imports/common/collections/attestations';
import { Announcements } from '/imports/common/collections/announcements';
import { Mails } from '/imports/common/collections/mails';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import { Messages } from '/imports/common/collections/messages';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { PERSONAS, E2E_PERSONAS, e2eLoginToken } from './personas';
import { makeLiabilityVersions, makePersonas } from './build';

export const buildE2e = async ({ people, now }) => {
  const days = (n) => daysFromNow(n, now);
  const liability = await makeLiabilityVersions(days);
  // Documents of their own for the admin tests that edit and delete one. Dated
  // long before the real versions, so neither becomes the version in force,
  // and at midnight UTC, as admin's date field stores a date.
  for (const purpose of ['edit', 'delete']) {
    await makeLiabilityDocument({
      title: `E2E ${purpose} target`, date: new Date(Date.UTC(2020, 0, purpose === 'edit' ? 1 : 2)),
      sv: `Dokument för testet som ${purpose === 'edit' ? 'ändrar' : 'raderar'}.`,
      en: `Document for the ${purpose} test.`,
    });
  }
  // Message templates: one to look at, and one each for the admin tests that
  // edit and delete. (Admin's startup adds the storage templates.)
  const welcomeTemplate = await makeMessageTemplate({
    name: 'Välkommen', type: 'welcome', membershiptype: 'member', membertype: 'normal',
    subject: 'Välkommen till Uppsala Makerspace', messagetext: 'Hej <%= name %>!\n\nDitt medlemsnummer är <%= mid %>.',
    created: days(-500),
  });
  for (const purpose of ['edit', 'delete']) {
    await makeMessageTemplate({
      name: `E2E ${purpose} template`, type: 'status',
      subject: `Template for the ${purpose} test`, messagetext: 'Hej <%= name %>!', created: days(-100),
    });
  }
  const { members, userIds } = await makePersonas([...PERSONAS, ...E2E_PERSONAS], { people, days, now, liability });
  for (const [key, userId] of Object.entries(userIds)) {
    await Accounts._insertLoginToken(userId, { token: e2eLoginToken(key), when: now });
  }

  // Web shop: an item that has been bought (so it cannot be deleted), one with
  // a buyer-set price, and one each for the admin tests that edit and delete.
  // A workshop to link items to.
  // Spaces: one the workshop is in (so it cannot be deleted), one on the upper
  // floor, and one each for the admin tests that edit and delete.
  const space = (spaceId, floor, sv, en) => Spaces.insertAsync({ spaceId, floor, name: { sv, ...(en ? { en } : {}) }, createdAt: now });
  const ceramicsRoom = await space('ceramics_workshop', 'floor2', 'Keramikrummet', 'Ceramics room');
  await space('bigroom', 'floor1', 'Stora rummet', 'Big room');
  await space('e2e-edit', 'floor1', 'E2E edit space');
  await space('e2e-delete', 'floor1', 'E2E delete space');
  // Groups and workshops: the ceramics steering group (responsible, two
  // members, the workshop), a function group, a group with join requests to
  // approve and reject, and one each to edit, link and delete; an area of
  // interest and a workshop each to edit, link and delete.
  const group = (fields) => Groups.insertAsync({ joinPolicy: 'request-responsible', allowJoinRequests: true, createdAt: now, ...fields });
  const member = (groupId, persona, state = 'active') => GroupMemberships.insertAsync({
    groupId, memberId: members[persona]._id, state, requestedAt: days(-20),
    ...(state === 'active' ? { approvedAt: days(-19), approvedBy: '__system__' } : {}),
  });
  const ceramicsGroup = await group({
    name: { sv: 'Styrgrupp Keramik', en: 'Ceramics steering group' }, type: 'steering',
    responsibleMemberId: members.groupLeader._id, allowJoinRequests: false,
  });
  await member(ceramicsGroup, 'groupLeader');
  await member(ceramicsGroup, 'steering');
  const premisesGroup = await group({ name: { sv: 'Lokalgruppen', en: 'Premises group' }, type: 'function', joinPolicy: 'request-any' });
  await member(premisesGroup, 'board');
  const requestsGroup = await group({ name: { sv: 'E2E requests group' }, type: 'function', responsibleMemberId: members.groupLeader._id });
  await member(requestsGroup, 'groupLeader');
  await member(requestsGroup, 'discounted');
  await member(requestsGroup, 'base', 'pending');
  await member(requestsGroup, 'quarterly', 'pending');
  await group({ name: { sv: 'E2E edit group' }, type: 'function' });
  await group({ name: { sv: 'E2E links group' }, type: 'function' });
  await group({ name: { sv: 'E2E delete group' }, type: 'function' });
  const ceramics = await Workshops.insertAsync({
    name: { sv: 'Keramikverkstaden', en: 'Ceramics workshop' }, kind: 'workshop', status: 'established',
    primarySpaceId: ceramicsRoom, groupId: ceramicsGroup, createdAt: now,
  });
  await Workshops.insertAsync({ name: { sv: 'Retrodatorer', en: 'Retro computers' }, kind: 'areaOfInterest', status: 'trial', createdAt: now });
  await Workshops.insertAsync({ name: { sv: 'E2E edit verkstad' }, kind: 'workshop', status: 'forming', createdAt: now });
  await Workshops.insertAsync({ name: { sv: 'E2E links verkstad' }, kind: 'workshop', status: 'forming', createdAt: now });
  await Workshops.insertAsync({ name: { sv: 'E2E delete verkstad' }, kind: 'workshop', status: 'forming', createdAt: now });
  // Certificates: the kiln under the ceramics workshop (a certifier, a
  // holder), the wheel that needs it first, and one each for the admin tests
  // that edit, link, delete, mark mandatory, grant and revoke. None is mandatory to
  // begin with: a mandatory certificate would keep the app's personas from
  // the doors.
  const certificate = (fields) => Certificates.insertAsync(fields);
  const attest = (certificateId, persona, fields = {}) => Attestations.insertAsync({
    certificateId, memberId: members[persona]._id, certifierId: members.steering._id,
    startDate: days(-30), confirmedAt: days(-30), ...fields,
  });
  const kiln = await certificate({
    name: { sv: 'Keramikugn', en: 'Ceramics kiln' }, description: { sv: 'Får bränna i ugnen.' },
    workshopId: ceramics, certifiers: [members.steering._id], defaultValidityDays: 365,
  });
  await attest(kiln, 'member', { endDate: days(335) });
  await certificate({ name: { sv: 'Drejskiva', en: 'Pottery wheel' }, workshopId: ceramics, prerequisites: [kiln] });
  for (const purpose of ['edit', 'links', 'delete', 'mandatory', 'grant']) {
    await certificate({ name: { sv: `E2E ${purpose} certificate` } });
  }
  const revoke = await certificate({ name: { sv: 'E2E revoke certificate' } });
  await attest(revoke, 'base');

  // Announcements: one sent, with its mail, and drafts to look at, edit,
  // send and delete.
  const sentAt = days(-60);
  const newsletterMail = await Mails.insertAsync({
    from: 'kansliet@example.org', recipients: 'members', family: true, to: [members.member.email],
    subject: 'Nyhetsbrev oktober', senddate: sentAt, template: '# Nyheter\n\nVälkommen på **städdag**!', formatted: true,
  });
  await Announcements.insertAsync({
    type: 'newsletter', subjectSv: 'Nyhetsbrev oktober', bodySv: '# Nyheter\n\nVälkommen på **städdag**!',
    status: 'sent', createdAt: days(-61), sentAt, mailId: newsletterMail,
  });
  await Announcements.insertAsync({
    type: 'information', subjectSv: 'Stängt under jul', subjectEn: 'Closed over Christmas',
    bodySv: 'Lokalen är stängd 23 december till 2 januari.', status: 'draft', createdAt: days(-5),
  });
  for (const purpose of ['edit', 'delete']) {
    await Announcements.insertAsync({
      type: 'information', subjectSv: `E2E ${purpose} announcement`, bodySv: `Utskick för testet som ${purpose === 'edit' ? 'ändrar' : 'raderar'}.`,
      status: 'draft', createdAt: days(-3),
    });
  }

  const clay = await makeStoreItem({
    code: 'lera', name: { sv: 'Lera, 10 kg', en: 'Clay, 10 kg' }, price: 150, bookkeepingAccount: '3010',
    requiresMembership: true, commentRequired: false,
  });
  await makePurchase(members.member, { _id: clay, code: 'lera', price: 150 }, { at: days(-10) });
  await makePurchase(members.base, { _id: clay, code: 'lera', price: 150 }, { at: days(-3) });
  await makeStoreItem({
    code: 'gava', name: { sv: 'Gåva', en: 'Donation' }, minPrice: 20, maxPrice: 5000, bookkeepingAccount: '3990',
    requiresMembership: false, commentRequired: false,
  });
  for (const purpose of ['edit', 'delete']) {
    await makeStoreItem({
      code: `e2e-${purpose}`, name: { sv: `E2E ${purpose} item` }, price: 25, bookkeepingAccount: '3011',
      requiresMembership: false, commentRequired: false,
    });
  }

  // The fake door lock: Maja right, Dagny thirty days short (and Ulla, for
  // the test that fixes it), Kalle invited but without an account, Fredrik
  // without an end date; Olle has no lock username at all. Maja has opened
  // the door a few times.
  await makeFakeLock([
    { member: members.member, visits: [1, 2, 5, 10, 40] },
    { member: members.discounted, end: -30 },
    { member: members.excluded, end: -30 },
    { member: members.quarterly, account: false },
    { member: members.family, end: 'forever' },
  ], { now });

  // Door openings: Maja through the app and the lock, and a guest the lock
  // could not tie to a member.
  for (const [daysAgo, method] of [[1, 'app'], [3, 'app'], [6, 'danalock']]) {
    await DoorUnlocks.insertAsync({ timestamp: days(-daysAgo), door: 'outerDoor', memberid: members.member._id, method });
  }
  await DoorUnlocks.insertAsync({ timestamp: days(-2), door: 'outerDoor', extid: 'user-guest-gast@example.org', method: 'danalock' });

  // Expense accounts: the ceramics account with its steering group's two
  // members as approvers and a budget, and one each for the admin tests that
  // edit, delete, link and budget. Expenses on the ceramics account, one per
  // test that moves one along, named by their place.
  const account = (name, fields = {}) => ExpenseAccounts.insertAsync({ name, explanation: 'Konto för testet.', createdAt: days(-100), ...fields });
  const ceramicsAccount = await account('Keramik', {
    explanation: 'Lera, glasyr och brännkostnader.', groupIds: [ceramicsGroup],
    approverMemberIds: [members.groupLeader._id, members.steering._id],
  });
  await ExpenseBudgets.insertAsync({ expenseAccountId: ceramicsAccount, year: now.getFullYear(), amount: 5000, setAt: days(-90), setBy: members.treasurer._id, createdAt: days(-90) });
  for (const purpose of ['edit', 'delete', 'links', 'budget']) await account(`E2E ${purpose} account`, { groupIds: [premisesGroup] });
  // A receipt picture each, where the receipt store keeps them; without one
  // configured the expense goes without.
  const receipt = async (place) => {
    const buffer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><text x="10" y="50">${place}</text></svg>`);
    try {
      return await uploadImage({ buffer, baseName: `e2e-${place.replaceAll(' ', '-')}`, mimeType: 'image/svg+xml', date: now });
    } catch (error) {
      return `e2e/${place}.svg`;
    }
  };
  const expense = async (place, status, fields = {}) => Expenses.insertAsync({
    memberId: members.steering._id, type: 'receipt', driveFileId: await receipt(place), mimeType: 'image/svg+xml',
    status, date: days(-20), createdAt: days(-20), amount: 250, expenseAccountId: ceramicsAccount, place, note: 'Glasyr',
    ...(status !== 'pending' ? { submittedAt: days(-19) } : {}),
    ...(['confirmed', 'reimbursed'].includes(status) ? { confirmedAt: days(-18), confirmedBy: members.groupLeader._id } : {}),
    ...(status === 'reimbursed' ? { reimbursedAt: days(-1), reimbursedBy: members.treasurer._id, reimbursedDate: days(1), bookkeepingAccount: '5010' } : {}),
    ...fields,
  });
  await expense('E2E draft', 'pending');
  await expense('E2E confirm', 'submitted');
  await expense('E2E reject', 'submitted');
  await expense('E2E reimburse', 'confirmed');
  await expense('E2E invoice', 'confirmed', { type: 'invoice', dueDate: days(10), amount: 1200 });
  await expense('E2E unreimburse', 'reimbursed');
  await expense('E2E paid', 'reimbursed', { amount: 480 });

  // Payments to file by hand: untreated ones to connect to a member, to mark
  // as other and to delete, and one connected to a member that needs its
  // membership. Two members of their own, with a membership each, for the
  // tests that edit and delete one.
  const payment = (message, fields = {}) => Payments.insertAsync({
    hash: `e2e-${message}`, type: 'swish', amount: 200, date: days(-4), message, name: 'Okänd Betalare', mobile: '46700000099', ...fields,
  });
  await payment('E2E connect payment');
  await payment('E2E other payment');
  await payment('E2E delete payment');
  await payment('E2E membership payment', { member: members.newcomer._id });
  for (const [mid, purpose] of [['901', 'edit'], ['902', 'delete']]) {
    const member = await makeMember({ mid, name: `E2E ${purpose} membership`, email: `e2e-${purpose}-membership@example.org` });
    await pay(member, 'memberBase', { at: days(-100), via: 'bankgiro' });
  }
  // The fake bank: two Swish deposits not yet in Payments.
  await makeFakeBank([
    { amount: 200, date: days(-1), swish: { name: 'Bo Basmedlem', mobile: '46700000106', message: 'E2E bank medlemskap' } },
    { amount: 75, date: days(-1), swish: { name: 'Gäst Gästsson', mobile: '46700000200', message: 'E2E bank kaffe' } },
  ]);

  // Messages sent to Ulla, one to look at and one to delete.
  for (const subject of ['E2E visa meddelande', 'E2E radera meddelande']) {
    await Messages.insertAsync({
      member: members.excluded._id, template: welcomeTemplate, type: 'status', to: members.excluded.email, subject,
      messagetext: `Hej Ulla!\n\n${subject}.`, senddate: days(-10),
    });
  }

  // Storage last, so that the storage hooks see the members' final dates.
  const walls = await makeStorageWalls([
    { _id: 'storage-fixture-wall-1', name: 'Floor 1, Wall 1', floor: 'floor1', column_count: 8, row_count: 6 },
    { _id: 'storage-fixture-wall-2', name: 'Floor 1, Wall 2', floor: 'floor1', column_count: 4, row_count: 5 },
    { _id: 'storage-fixture-wall-3', name: 'Floor 2, Wall 1', floor: 'floor2', column_count: 4, row_count: 6 },
  ], { now });
  const unit = (position, status, owner, fields) => makeStorageUnit(walls, {
    name: String(1000 + position), position, status, owner: owner?._id, assignedAt: days(-30), fields, now,
  });

  // 1001: the family's shared unit, read-only to the family member.
  await unit(1, 'occupied', members.family);

  // 1002: an owner whose lab expired, warned with five days left.
  await unit(2, 'occupied', members.storageWarning, {
    warning: { id: 'storage-fixture-warning', warned_at: days(-23), warned_by: '__seed__', deadline_at: days(5) },
  });

  // 1003: reclaimed, waiting to be emptied.
  await unit(3, 'awaiting_clearance', members.storageClearance);

  // 1004 → 1005: a move offered and not yet confirmed.
  const moveSource = await unit(4, 'occupied', members.storageMove);
  const moveDestination = await unit(5, 'reserved', members.storageMove);
  const moveRequest = await StorageRequests.insertAsync({
    owner: members.storageMove._id, request_type: 'move', requested_at: days(-30),
    preference: { floor: 'floor1', height: 'low' }, request_status: 'in_progress',
    source_unit: moveSource, createdAt: now, updatedAt: now,
  });
  await StorageUnits.updateAsync(moveSource, { $set: { source_request: moveRequest } });
  await StorageOffers.insertAsync({
    owner: members.storageMove._id, request: moveRequest, from_unit: moveSource, to_unit: moveDestination,
    offered_at: now, offered_by: '__seed__', deadline_at: days(14), requires_inspection: false,
    createdAt: now, updatedAt: now,
  });

  // 1006 free, with a member waiting in the queue for it.
  await unit(6, 'available');
  await StorageRequests.insertAsync({
    owner: members.storageQueue._id, request_type: 'allocation', requested_at: days(-30),
    preference: { floor: 'floor1', height: 'low' }, request_status: 'waiting', createdAt: now, updatedAt: now,
  });

  // The rest of the three walls, a few of them out of use.
  for (let position = 7; position <= walls[walls.length - 1].end; position += 1) {
    await unit(position, position % 13 === 0 ? 'unavailable' : 'available');
  }
};

/** Lines printed after seeding. */
export const e2eLoginSummary = () => [
  `${PERSONAS.length + E2E_PERSONAS.length} personas, password "password123"; see common/server/seed/scenarios/personas.js`,
];
