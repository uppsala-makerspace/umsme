/**
 * Named people with known logins, one per state worth looking at. Both the
 * demo and the e2e scenario contain all of PERSONAS, so that anyone exploring
 * the demo can log in as the same person an e2e test uses. E2E_PERSONAS are
 * the few that only make sense with a test's own fixtures; they exist in the
 * e2e scenario only. A test that changes data gets a persona of its own, so
 * that the tests can run in parallel and in any order (the liability test
 * approves noliability's agreement, so the unlock test uses noliability2).
 *
 * Every address is on example.org; the shared password is PASSWORD. Member
 * numbers are fixed (see withMids), so that tests can look for them.
 *
 * No imports: the app's Playwright helpers read this file directly.
 */
export const PASSWORD = 'password123';

const at = (local) => `${local}@example.org`;

/**
 * `payments` lists [paymentType, daysFromNow] pairs, oldest first.
 * `roles` are admin roles; `member: false` means a login without a member.
 */
const SHARED = [
  { key: 'admin', email: at('admin'), name: 'Astrid Admin', roles: ['admin'],
    description: 'admin role, lab member',
    payments: [['memberLab', -700], ['memberLab', -335]] },
  { key: 'board', email: at('board'), name: 'Bertil Styrelse', roles: ['board'],
    description: 'board role, lab member',
    payments: [['memberLab', -420], ['memberLab', -60]] },
  { key: 'treasurer', email: at('treasurer'), name: 'Kerstin Kassör', roles: ['treasurer'],
    description: 'treasurer role, base member',
    payments: [['memberBase', -500], ['memberBase', -140]] },
  { key: 'storage', email: at('storage'), name: 'Lars Lagerhållare', roles: ['storage'],
    description: 'storage role, lab member',
    payments: [['memberLab', -200]] },
  { key: 'member', email: at('member'), name: 'Maja Medlem',
    description: 'active lab member, liability approved',
    payments: [['memberBase', -800], ['memberLab', -430], ['memberLab', -70]] },
  { key: 'base', email: at('base'), name: 'Bo Basmedlem',
    description: 'active base member, no lab',
    payments: [['memberBase', -100]] },
  { key: 'discounted', email: at('discounted'), name: 'Dagny Rabatt',
    description: 'discounted lab member',
    payments: [['memberDiscountedLab', -150]] },
  { key: 'quarterly', email: at('quarterly'), name: 'Kalle Kvartal',
    description: 'base member with quarterly lab',
    payments: [['memberBase', -200], ['memberQuarterlyLab', -30]] },
  { key: 'expiring', email: at('expiring'), name: 'Ella Utgående',
    description: 'membership ends within two weeks',
    payments: [['memberBase', -365 - 14 + 10]] },
  { key: 'expired', email: at('expired'), name: 'Erik Utgången',
    description: 'membership expired half a year ago',
    payments: [['memberBase', -560]] },
  { key: 'family', email: at('family'), name: 'Fredrik Familj',
    description: 'family payer with two family members',
    payments: [['familyLab', -90]] },
  { key: 'familyMember', email: at('family-member'), name: 'Frida Familj', familyOf: 'family',
    description: 'family member, paid for by family@example.org' },
  { key: 'familyChild', email: at('family-child'), name: 'Filip Familj', familyOf: 'family', birthyearOffset: -14,
    description: 'young family member' },
  { key: 'invited', email: at('invited'), name: 'Ingrid Inbjuden', invitedBy: 'family',
    description: 'has a pending invitation to the family of family@example.org',
    payments: [['memberBase', -40]] },
  { key: 'pending', email: at('pending'), name: 'Petra Väntande', registered: false,
    description: 'paid, waiting for the board to approve',
    payments: [['memberBase', -3]] },
  { key: 'noliability', email: at('noliability'), name: 'Nils Ansvarslös', liability: 'none',
    description: 'active lab member who has not approved the liability agreement',
    payments: [['memberLab', -20]] },
  { key: 'outdated', email: at('outdated-liability'), name: 'Olle Gammalavtal', liability: 'outdated',
    description: 'approved an older version of the liability agreement',
    payments: [['memberLab', -300]] },
  { key: 'excluded', email: at('excluded'), name: 'Ulla Utesluten', excluded: true,
    description: 'excluded member',
    payments: [['memberLab', -250]] },
  { key: 'newcomer', email: at('newcomer'), name: 'Nora Ny',
    description: 'registered member who has not paid yet' },
  { key: 'groupLeader', email: at('group-leader'), name: 'Gustav Gruppledare',
    description: 'responsible for the wood workshop steering group',
    payments: [['memberLab', -500], ['memberLab', -135]] },
  { key: 'steering', email: at('steering'), name: 'Sara Styrgrupp',
    description: 'member of the wood workshop steering group, certifier for the laser',
    payments: [['memberLab', -240]] },
  { key: 'unverified', email: at('unverified'), name: null, verified: false, member: false,
    description: 'signed up, email not verified, no member yet' },
];

const E2E_ONLY = [
  { key: 'noliability2', email: at('noliability2'), name: 'Nanna Ansvarslös', liability: 'none',
    description: 'second member without liability, for the unlock test',
    payments: [['memberLab', -20]] },
  { key: 'toInvite', email: at('toinvite'), name: 'Tove Tillgänglig',
    description: 'member who can be invited to a family',
    payments: [['memberBase', -30]] },
  { key: 'familyInviter', email: at('family-inviter'), name: 'Ivar Inbjudare',
    description: 'family payer without family members, for the invite tests',
    payments: [['familyLab', -60]] },
  { key: 'inviteAccepter', email: at('invite-accepter'), name: 'Alva Accepterar', invitedBy: 'familyInviter',
    description: 'has a pending invitation to the family of family-inviter, which the accept test accepts',
    payments: [['memberBase', -40]] },
  { key: 'storageRequester', email: at('storage-requester'), name: 'Sixten Sökande',
    description: 'lab member without storage, for the request test',
    payments: [['memberLab', -30]] },
  { key: 'storageWarning', email: at('storage-warning'), name: 'Vera Varnad',
    description: 'lab expired, has storage unit 1002 with a warning',
    payments: [['memberLab', -400]] },
  { key: 'storageClearance', email: at('storage-clearance'), name: 'Rolf Rensning',
    description: 'storage unit 1003 awaiting clearance' },
  { key: 'storageMove', email: at('storage-move'), name: 'Mona Flytt',
    description: 'has unit 1004 and an offer to move to 1005',
    payments: [['memberLab', -30]] },
  { key: 'storageRetry', email: at('storage-retry'), name: 'Rasmus Retry',
    description: 'lab member without storage, for the retry test',
    payments: [['memberLab', -30]] },
  { key: 'storageQueue', email: at('storage-queue'), name: 'Kim Kö',
    description: 'waiting in the storage queue',
    payments: [['memberLab', -30]] },
];

/** Member numbers from 101, in list order, for everyone who is a member. */
const withMids = (people, first) => {
  let next = first;
  return people.map((person) => (person.member === false ? person : { ...person, mid: String(next++) }));
};

/**
 * The login token the e2e scenario gives each persona. A test puts it in
 * localStorage before the page loads and starts out logged in, without going
 * through the login page.
 */
export const e2eLoginToken = (key) => `e2e-login-token-${key}`;

const memberCount = (people) => people.filter((person) => person.member !== false).length;

export const PERSONAS = withMids(SHARED, 101);
export const E2E_PERSONAS = withMids(E2E_ONLY, 101 + memberCount(SHARED));

/** The first number after the personas, for generated members. */
export const FIRST_FREE_MID = 101 + memberCount(SHARED) + memberCount(E2E_ONLY);
