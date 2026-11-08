import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { check, Match } from 'meteor/check';
import { runDoorUnlockSyncAndMail } from '../cronjob/syncAndMailUnlocks';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { doorUnlocksPage } from '/imports/common/server/doors/doorUnlocks';
import { migrateUnlocks } from '/imports/common/server/doors/migrateUnlocks';
import { doorVisitStats, VISIT_VIEWS } from '/imports/common/server/doors/visitStats';

Meteor.methods({
  /** A page of the door openings. */
  async 'doorUnlocks.page'(options) {
    check(options, {
      search: Match.Optional(String),
      sort: Match.Optional(Match.OneOf(null, { field: String, direction: Match.OneOf('asc', 'desc') })),
      page: Match.Optional(Match.Integer),
      pageSize: Match.Optional(Match.Integer),
    });
    await requireRole(this.userId, DOMAIN_ROLES.doors);
    return doorUnlocksPage({ ...options, sort: options.sort || undefined });
  },

  /**
   * Door visits (days a member opened any door) per day of a month, per month
   * of a year, per quarter or per year, for the door statistics.
   */
  async 'doorStats.visits'(options) {
    check(options, {
      view: Match.OneOf(...VISIT_VIEWS),
      month: Match.Optional(Match.Where((m) => typeof m === 'string' && /^\d{4}-\d{2}$/.test(m))),
      year: Match.Optional(Match.Integer),
    });
    await requireRole(this.userId, DOMAIN_ROLES.doors);
    return doorVisitStats(options);
  },

  async 'forceSyncDoorUnlocks'() {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    return await runDoorUnlockSyncAndMail();
  },

  /** Move the legacy lock log (`unlocks`) into doorunlocks; see migrateUnlocks. */
  async 'migrateUnlocksToDoorUnlocks'() {
    if (!Meteor.userId() || !await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      throw new Meteor.Error('Not authorized');
    }
    this.unblock();
    return migrateUnlocks();
  },
});
