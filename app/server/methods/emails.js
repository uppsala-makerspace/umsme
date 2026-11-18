import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Email } from "meteor/email";
import { check } from "meteor/check";
import { Members } from "/imports/common/collections/members";
import Invites from "/imports/common/collections/Invites";
import { normalizeEmail } from "/imports/common/lib/memberMatch";
import { memberForUser } from "/imports/common/server/memberForUser";
import { isEmailAllowed } from "/imports/common/server/emailGuard";
import { recordChange } from "/imports/common/server/auditLog";
import {
  createMergeRequest, mergeRequestInfo, confirmMergeRequest, userByAddress,
} from "/imports/common/server/users/mergeRequests";

/**
 * A member's email addresses: an account may have several, each verified by a
 * link mailed to it, and every verified one signs in and finds the member.
 * The primary one is first on the account and is the member's email, where
 * mail goes. An address that belongs to another account can be taken over by
 * merging that account into this one, once a link mailed to it is opened
 * (see requestMerge): whoever reads that mailbox can already take the other
 * account over with a password reset, so the same proof suffices.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Each of these mails someone, so there is a limit.
const MAX_ADDRESSES = 10;

const from = () => Accounts.emailTemplates.from || "no-reply@uppsalamakerspace.se";

const me = async () => {
  const user = await Meteor.userAsync();
  if (!user) throw new Meteor.Error("not-logged-in", "Sign in first");
  return user;
};

const addressOn = (user, address) =>
  (user.emails || []).find((e) => normalizeEmail(e.address) === normalizeEmail(address));

const validAddress = (address) => {
  check(address, String);
  const normalized = normalizeEmail(address);
  if (!EMAIL.test(normalized)) throw new Meteor.Error("bad-email", "Not an email address");
  return normalized;
};

// Mail that respects the recipient whitelist, as all mail from dev must.
const send = async (to, subject, text) => {
  if (!isEmailAllowed(to)) {
    console.log(`Email to ${to} blocked by whitelist`);
    return;
  }
  await Email.sendAsync({ to, from: from(), subject, text });
};

const sendVerification = async (userId, address) => {
  if (!isEmailAllowed(address)) {
    console.log(`Verification email to ${address} blocked by whitelist`);
    return;
  }
  await Accounts.sendVerificationEmail(userId, address);
};

/** The account's addresses, which one is primary, and whether each is verified. */
export const emailsOf = async (user) => {
  const member = await memberForUser(user);
  const primary = member?.email || normalizeEmail(user.emails?.[0]?.address);
  return (user.emails || []).map((e) => ({
    address: e.address,
    verified: !!e.verified,
    primary: normalizeEmail(e.address) === primary,
  }));
};

Meteor.methods({
  /** The signed-in account's addresses. */
  async "emails.list"() {
    return emailsOf(await me());
  },

  /**
   * Add an address, unverified, and mail it a link to verify it. One that
   * belongs to another account is refused with `email-taken`; the member may
   * then ask to merge that account (emails.requestMerge).
   */
  async "emails.add"(address) {
    const user = await me();
    const normalized = validAddress(address);
    if (addressOn(user, normalized)) throw new Meteor.Error("email-exists", "The account already has this address");
    if (await userByAddress(normalized)) throw new Meteor.Error("email-taken", "The address belongs to another account");
    if ((user.emails || []).length >= MAX_ADDRESSES) throw new Meteor.Error("too-many", "The account has as many addresses as it may");
    await Accounts.addEmailAsync(user._id, normalized, false);
    await sendVerification(user._id, normalized);
    return emailsOf(await Meteor.users.findOneAsync(user._id));
  },

  /** Mail the link to verify an unverified address again. */
  async "emails.resendVerification"(address) {
    const user = await me();
    const entry = addressOn(user, validAddress(address));
    if (!entry) throw new Meteor.Error("not-found", "The account has no such address");
    if (entry.verified) throw new Meteor.Error("already-verified", "The address is verified already");
    await sendVerification(user._id, entry.address);
  },

  /** Remove an address: never the primary one, nor the last verified one. */
  async "emails.remove"(address) {
    const user = await me();
    const entry = addressOn(user, validAddress(address));
    if (!entry) throw new Meteor.Error("not-found", "The account has no such address");
    const list = await emailsOf(user);
    if (list.find((e) => normalizeEmail(e.address) === normalizeEmail(entry.address))?.primary) {
      throw new Meteor.Error("primary", "The primary address cannot be removed; make another one primary first");
    }
    if (entry.verified && !(user.emails || []).some((e) => e !== entry && e.verified)) {
      throw new Meteor.Error("last-verified", "The last verified address cannot be removed");
    }
    await Accounts.removeEmail(user._id, entry.address);
    return emailsOf(await Meteor.users.findOneAsync(user._id));
  },

  /**
   * Make a verified address the primary one: first on the account, and the
   * member's email, where mail goes. Family invitations to the old address
   * follow it.
   */
  async "emails.makePrimary"(address) {
    const user = await me();
    const entry = addressOn(user, validAddress(address));
    if (!entry) throw new Meteor.Error("not-found", "The account has no such address");
    if (!entry.verified) throw new Meteor.Error("not-verified", "Only a verified address can be primary");
    const normalized = normalizeEmail(entry.address);
    const member = await memberForUser(user);
    if (member && member.email !== normalized) {
      if (await Members.findOneAsync({ email: normalized, _id: { $ne: member._id } }, { fields: { _id: 1 } })) {
        throw new Meteor.Error("email-in-use", "Another member has this address");
      }
      await Members.updateAsync(member._id, { $set: { email: normalized } });
      await Invites.updateAsync({ email: member.email }, { $set: { email: normalized } }, { multi: true });
      await recordChange({
        userId: user._id, domain: "members", action: "update", docId: member._id,
        before: { email: member.email }, after: { email: normalized },
      });
    }
    await Meteor.users.updateAsync(user._id, {
      $set: { emails: [entry, ...user.emails.filter((e) => e !== entry)] },
    });
    return emailsOf(await Meteor.users.findOneAsync(user._id));
  },

  /**
   * Ask to merge the account that has `address` into the signed-in one: a
   * link valid for a day goes to that address. Nothing changes until it is
   * opened and confirmed (emails.confirmMerge).
   */
  async "emails.requestMerge"(address) {
    const user = await me();
    const { token, address: normalized } = await createMergeRequest(user, validAddress(address));
    const url = Meteor.absoluteUrl(`merge-account/${token}`);
    const requester = user.emails?.[0]?.address || user.username;
    await send(normalized, "Slå ihop konton hos Uppsala MakerSpace / Merge accounts at Uppsala MakerSpace", [
      "Hej!",
      "",
      `Någon som är inloggad som ${requester} vill slå ihop det kontot med ditt konto för ${normalized} hos Uppsala MakerSpace.`,
      `Är det du? Öppna länken inom ett dygn för att se vad som händer och bekräfta: ${url}`,
      "",
      "Om det inte är du kan du lugnt ignorera meddelandet; inget ändras.",
      "",
      "---",
      "",
      "Hi!",
      "",
      `Someone signed in as ${requester} wants to merge that account with your account for ${normalized} at Uppsala MakerSpace.`,
      `Is that you? Open the link within a day to see what happens and confirm: ${url}`,
      "",
      "If it was not you, you can safely ignore this message; nothing changes.",
    ].join("\n"));
  },

  /** What a merge link would do: the two accounts, and whether it can be done here. */
  async "emails.mergeRequestInfo"(token) {
    check(token, String);
    return mergeRequestInfo(token);
  },

  /**
   * Merge, as the link to the other account's address asked (see
   * common/server/users/mergeRequests.js), then tell both addresses.
   */
  async "emails.confirmMerge"(token) {
    check(token, String);
    const result = await confirmMergeRequest(token);
    if (result.merged) {
      const text = [
        `Kontona för ${result.kept} och ${result.removed} hos Uppsala MakerSpace är nu ett. Du kan logga in med vilken av adresserna som helst.`,
        "",
        `The accounts for ${result.kept} and ${result.removed} at Uppsala MakerSpace are now one. You can sign in with either address.`,
      ].join("\n");
      for (const to of [result.kept, result.removed].filter(Boolean)) {
        await send(to, "Kontona är sammanslagna / The accounts are merged", text);
      }
    }
    return { merged: result.merged, reasons: result.reasons };
  },
});
