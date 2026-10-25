import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";

/**
 * The signed-in user, and whether the sign-in is still being resumed: on a
 * link opened directly there is no user id until it is, and sending the
 * reader to the login page meanwhile would send a signed-in one home.
 */
export const useSignedIn = () => useTracker(() => ({
  user: Meteor.user(),
  userId: Meteor.userId(),
  loggingIn: Meteor.loggingIn(),
}));
