import { Meteor } from "meteor/meteor";
import { impersonationOf, isExpired } from "./impersonationOf";

/**
 * Methods that may run while an admin has switched to another user. Everything
 * else is refused, so a method added later is blocked until it is listed here.
 *
 * Only list a method after checking that it writes nothing — not even as a
 * side effect (marking something read, minting a record). A method missing from
 * the list only shows up as an error while switched; a wrongly listed one
 * would let the admin change things in the member's name.
 */
export const READ_ONLY_METHODS = new Set([
  // Accounts: switching and switching back are logins.
  "login",
  "logout",

  // Member info and app data. findInfoForUser updates lastSeenAt, but not on
  // a switch token (touchLastSeen's selector excludes it), so it stays read
  // only here.
  "findInfoForUser",
  "findMembershipsForUser",
  "checkIsAdmin",
  "impersonation.canStart",
  "availableDoors",
  "liabilityDocumentsList",
  "liabilityDocumentByDate",
  "membership.getDetail",
  "getMessagesAndAnnouncements",
  "getMessageDetail",
  "getNotificationPrefs",
  "texts.termsOfPurchaseMembership",
  "texts.termsOfPurchaseStore",
  "data.rooms",
  "data.slackChannels",

  // Payments and store
  "payment.getOptions",
  "payment.getStatus",
  "payment.getDetail",
  "getPaymentStatus",
  "store.getItems",
  "store.getItem",
  "store.getWorkshopRevenue",
  "store.getMyPayments",

  // Certificates and tests
  "certificates.getAll",
  "certificates.getDetails",
  "certificates.getMyAttestations",
  "certificates.getPendingToConfirm",
  "certificates.getRequestDetail",
  "certificates.getMandatoryStatus",
  "tests.getStatus",

  // Expenses
  "expenses.getMine",
  "expenses.getOne",
  "expenses.getToApprove",
  "expenses.getAccounts",
  "expenses.getMyAccounts",
  "expenses.getBudgetOverview",
  "expenses.getAccountExpenses",
  "expenses.getPlaces",

  // Groups, workshops, storage
  "groups.list",
  "groups.myGroups",
  "groups.getDetails",
  "groups.lookupMemberNumber",
  "workshops.list",
  "workshops.getDetails",
  "storage.member.getState",
]);

/**
 * Wrap every registered method so that, on a connection logged in through a
 * switch-user token, only READ_ONLY_METHODS run. Call once, after all methods
 * are registered.
 */
export const enforceReadOnlyWhileImpersonating = () => {
  const handlers = Meteor.server.method_handlers;
  for (const name of Object.keys(handlers)) {
    const original = handlers[name];
    handlers[name] = async function (...args) {
      const impersonation = await impersonationOf(this.connection, this.userId);
      // The reasons are in Swedish on purpose: pages show `reason` as is, and
      // the only one who ever sees these is the admin.
      if (impersonation && name !== "login" && name !== "logout") {
        if (isExpired(impersonation.startedAt)) {
          throw new Meteor.Error(
            "impersonation-expired",
            "Bytet av användare har gått ut. Gå tillbaka till admin."
          );
        }
        if (!READ_ONLY_METHODS.has(name)) {
          throw new Meteor.Error(
            "impersonation-read-only",
            "Ändringar är avstängda när du ser appen som en annan användare."
          );
        }
      }
      return original.apply(this, args);
    };
  }
};
