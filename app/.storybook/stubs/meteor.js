// Storybook stub for the `meteor/meteor` package. Lets components that
// import { Meteor } from "meteor/meteor" mount under Storybook even though
// the real Meteor runtime isn't bundled. Tutorial stories need this so
// ConnectivityBanner-adjacent code paths and any incidental Meteor reads
// don't crash. Methods that mutate state are no-ops.

export const Meteor = {
  status: () => ({ connected: true }),
  userId: () => "stub-user-id",
  user: () => null,
  callAsync: () => Promise.resolve(),
  call: (_name, ...args) => {
    const cb = args[args.length - 1];
    if (typeof cb === "function") cb(null);
  },
  logout: (cb) => { if (typeof cb === "function") cb(); },
  loginWithPassword: () => {},
  loginWithGoogle: () => {},
  loginWithFacebook: () => {},
  isClient: true,
  isServer: false,
};
