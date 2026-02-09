import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/roles";

Meteor.methods({
  async checkIsAdmin() {
    if (!this.userId) return false;
    return Roles.userIsInRoleAsync(this.userId, ["admin", "admin-locks"]);
  },
});
