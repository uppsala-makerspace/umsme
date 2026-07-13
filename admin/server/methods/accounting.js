import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';

Meteor.methods({
  /**
   * Return the non-sensitive accounting config the admin UI needs: the allowed
   * dimensions (for tagging expense accounts) and the selectable bookkeeping
   * accounts (for reimbursing expenses). Settings aren't published to clients,
   * so this is a role-gated method mirroring the `fromOptions` pattern.
   */
  'accounting.config': async () => {
    if (
      !Meteor.userId() ||
      !(await Roles.userIsInRoleAsync(Meteor.userId(), ['admin', 'board', 'treasurer']))
    ) {
      throw new Meteor.Error('not-authorized', 'Insufficient role');
    }
    const a = Meteor.settings.accounting || {};
    return {
      dimensions: Array.isArray(a.dimensions) ? a.dimensions : [],
      expense: { accountOptions: a.expense?.accountOptions || [] },
    };
  },
});
