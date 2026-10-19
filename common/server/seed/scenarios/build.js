/**
 * Pieces both scenarios build the same way: the liability agreement and the
 * named personas.
 */
import { makeUser } from '../accounts';
import { makeMember, pay, joinFamily, inviteToFamily } from '../members';
import { makeLiabilityDocument } from '../documents';
import { PASSWORD } from './personas';

/**
 * An older and a current version of the liability agreement.
 *
 * @returns {Promise<{ old: Date, current: Date }>} the two version dates
 */
export const makeLiabilityVersions = async (days) => {
  const old = days(-900);
  const current = days(-400);
  await makeLiabilityDocument({
    title: 'Ansvarsförbindelse 2023', date: old,
    sv: '# Ansvarsförbindelse\n\nÄldre version.\n\n1. Var försiktig\n2. Städa efter dig',
    en: '# Liability agreement\n\nOlder version.\n\n1. Be careful\n2. Clean up after yourself',
  });
  await makeLiabilityDocument({
    title: 'Ansvarsförbindelse 2025', date: current,
    sv: '# Ansvarsförbindelse\n\nJag använder lokalen och maskinerna på egen risk.\n\n1. Var försiktig\n2. Städa efter dig\n3. Fråga om du är osäker\n4. Gå aldrig ifrån en maskin som är igång',
    en: '# Liability agreement\n\nI use the premises and machines at my own risk.\n\n1. Be careful\n2. Clean up after yourself\n3. Ask if unsure\n4. Never leave a running machine',
  });
  return { old, current };
};

/** The member fields for a liability state: 'current' (default), 'outdated' or 'none'. */
export const liabilityFields = (state, versions) => {
  if (state === 'none') return {};
  if (state === 'outdated') return { liabilityDate: versions.old };
  return { liabilityDate: versions.current };
};

/**
 * Logins, members, payments, families and invitations for a list of
 * personas (see personas.js).
 *
 * @returns {Promise<{ members: Object<string, object>, userIds: Object<string, string> }>}
 *   by persona key
 */
export const makePersonas = async (list, { people, days, now, liability }) => {
  const members = {};
  const userIds = {};
  for (const persona of list) {
    people.reserve(persona.email);
    userIds[persona.key] = await makeUser({
      email: persona.email, password: PASSWORD, verified: persona.verified !== false, roles: persona.roles || [],
    });
    if (persona.member === false) continue;
    const generated = people.person();
    const member = await makeMember({
      mid: persona.mid,
      name: persona.name,
      email: persona.email,
      mobile: generated.mobile,
      birthyear: persona.birthyearOffset ? now.getFullYear() + persona.birthyearOffset : generated.birthyear,
      ...liabilityFields(persona.liability, liability),
      registered: persona.registered !== false,
      ...(persona.excluded ? { excluded: true } : {}),
    });
    for (const [type, offset] of persona.payments || []) await pay(member, type, { at: days(offset) });
    members[persona.key] = member;
  }
  for (const persona of list) {
    if (persona.familyOf) members[persona.key] = await joinFamily(members[persona.key], members[persona.familyOf]);
    if (persona.invitedBy) await inviteToFamily(persona.email, members[persona.invitedBy]);
  }
  return { members, userIds };
};
