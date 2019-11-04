import { Template } from 'meteor/templating';
import { Memberships } from '../../../collections/memberships.js';

import './MembershipAdd.html';

Template.MembershipAdd.helpers({
  Memberships() {
    return Memberships;
  },
  draft() {
    return {
      mid: FlowRouter.getQueryParam("member")
    }
  }
});
