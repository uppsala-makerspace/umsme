/**
 * Named people with known logins, one per state worth looking at. The demo
 * scenario contains all of them, so that anyone exploring can log in as the
 * same person an e2e test uses.
 *
 * Every address is on example.org; the shared password is PASSWORD.
 */
export const PASSWORD = 'password123';

const at = (local) => `${local}@example.org`;

/**
 * `payments` lists [paymentType, daysFromNow] pairs, oldest first.
 * `roles` are admin roles; `member: false` means a login without a member.
 */
export const PERSONAS = [
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
