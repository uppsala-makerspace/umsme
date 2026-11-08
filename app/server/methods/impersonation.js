import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Members } from "/imports/common/collections/members";
import { verifiedUserSelectorForMember } from "/imports/common/lib/memberMatch";
import { memberForUser } from "/imports/common/server/memberForUser";
import { mayImpersonate } from "/server/impersonation/impersonationOf";

const SEARCH_LIMIT = 20;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const requireImpersonator = async (userId) => {
  const user = userId && (await Meteor.users.findOneAsync(userId, { fields: { username: 1 } }));
  if (!(await mayImpersonate(user))) {
    throw new Meteor.Error("not-authorized", "Only the admin account may switch user");
  }
  return user;
};

Meteor.methods({
  /** Whether the caller may switch to another user (shows the menu entry). */
  async "impersonation.canStart"() {
    if (!this.userId) return false;
    const user = await Meteor.users.findOneAsync(this.userId, { fields: { username: 1 } });
    return mayImpersonate(user);
  },

  /**
   * Members matching a name or a member number, with the account a switch would
   * log in to. The account is found by verified email — the same link
   * memberForUser follows the other way — so the switch lands on this member.
   *
   * @returns {Array<{memberId, mid, name, email, userId: string|null}>}
   */
  async "impersonation.search"(query) {
    check(query, String);
    await requireImpersonator(this.userId);

    const q = query.trim();
    if (q.length < 2 && !/^\d+$/.test(q)) return [];

    const selector = /^\d+$/.test(q)
      ? { mid: q }
      : { name: { $regex: escapeRegExp(q), $options: "i" } };
    const members = await Members.find(selector, {
      fields: { mid: 1, name: 1, email: 1 },
      sort: { name: 1 },
      limit: SEARCH_LIMIT,
    }).fetchAsync();

    const results = [];
    for (const member of members) {
      const user = await Meteor.users.findOneAsync(verifiedUserSelectorForMember(member), {
        fields: { _id: 1 },
      });
      results.push({
        memberId: member._id,
        mid: member.mid,
        name: member.name,
        email: member.email,
        userId: user?._id ?? null,
      });
    }
    return results;
  },

  /**
   * Mint a login token for the target user, marked as a switch by this admin.
   * The client logs in with it; while it is in use the app is read-only.
   *
   * @returns {{ token: string, name: string }}
   */
  async "impersonation.start"(targetUserId) {
    check(targetUserId, String);
    const admin = await requireImpersonator(this.userId);
    if (targetUserId === admin._id) {
      throw new Meteor.Error("bad-target", "Cannot switch to yourself");
    }
    const target = await Meteor.users.findOneAsync(targetUserId, { fields: { username: 1, emails: 1 } });
    if (!target) throw new Meteor.Error("not-found", "No such user");

    const stamped = Accounts._generateStampedLoginToken();
    await Accounts._insertHashedLoginToken(target._id, {
      ...Accounts._hashStampedToken(stamped),
      impersonatedBy: admin._id,
      impersonationStartedAt: new Date(),
    });

    const member = await memberForUser(target);
    const name = member?.name || target.username || target.emails?.[0]?.address || target._id;
    console.log(`[Impersonation] admin ${admin._id} -> user ${target._id} (${name})`);
    return { token: stamped.token, name };
  },

  /**
   * Called as admin after switching back: removes every switch token this admin
   * minted. A connection still logged in with one of them is logged out.
   */
  async "impersonation.end"() {
    const admin = await requireImpersonator(this.userId);
    const removed = await Meteor.users.updateAsync(
      { "services.resume.loginTokens.impersonatedBy": admin._id },
      { $pull: { "services.resume.loginTokens": { impersonatedBy: admin._id } } },
      { multi: true }
    );
    console.log(`[Impersonation] admin ${admin._id} switched back (${removed} token holder(s) cleared)`);
    return removed;
  },
});
