import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';

/**
 * Whether a member may certify a certificate: named among its certifiers, or
 * holding its certifier role. Board and admin are no exception.
 */
export const canCertify = async (memberId, certificate) => {
  if (!memberId || !certificate) return false;
  if (certificate.certifiers?.includes(memberId)) return true;
  if (certificate.certifierRole) {
    const member = await Members.findOneAsync(memberId, { fields: { email: 1 } });
    const user = member?.email ? await Accounts.findUserByEmail(member.email) : null;
    if (user && (await Roles.userIsInRoleAsync(user._id, certificate.certifierRole))) return true;
  }
  return false;
};
