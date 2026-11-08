import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { ReactiveVar } from "meteor/reactive-var";

/**
 * Client side of "switch user" (see server/impersonation). The admin's own
 * login token is kept in localStorage while switched, so the admin can log back
 * in — also after a reload — without entering the password again.
 */

const KEY = "umsme.impersonation";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch (_) {
    return null;
  }
};

/** `{ adminToken, adminUserId, targetName }` while switched, else null. Reactive. */
export const impersonationState = new ReactiveVar(read());

const write = (state) => {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
    else localStorage.removeItem(KEY);
  } catch (_) {
    // Without storage the switch still works, but cannot survive a reload.
  }
  impersonationState.set(state);
};

export const clearImpersonation = () => write(null);

const loginWithToken = (token) =>
  new Promise((resolve, reject) =>
    Meteor.loginWithToken(token, (err) => (err ? reject(err) : resolve()))
  );

const logout = () => new Promise((resolve) => Meteor.logout(() => resolve()));

/** Log in as the target user. Only works for the admin account (server checks). */
export const startImpersonation = async (targetUserId) => {
  const adminToken = Accounts._storedLoginToken();
  const adminUserId = Meteor.userId();
  const { token, name } = await Meteor.callAsync("impersonation.start", targetUserId);
  write({ adminToken, adminUserId, targetName: name });
  try {
    await loginWithToken(token);
  } catch (err) {
    // Stay (or get back to being) the admin.
    await loginWithToken(adminToken).catch(() => {});
    clearImpersonation();
    throw err;
  }
};

/**
 * Log back in as the admin and remove the switch tokens. Returns false when the
 * admin's own token no longer works; the user is then logged out.
 */
export const switchBack = async () => {
  const state = read();
  if (!state) return false;
  try {
    await loginWithToken(state.adminToken);
  } catch (_) {
    clearImpersonation();
    await logout();
    return false;
  }
  clearImpersonation();
  try {
    await Meteor.callAsync("impersonation.end");
  } catch (err) {
    console.error("Could not remove switch tokens:", err);
  }
  return true;
};
