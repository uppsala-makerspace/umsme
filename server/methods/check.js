import { Members } from '/collections/members.js';
import { Memberships } from '/collections/memberships.js';
import {Meteor} from "meteor/meteor";

Meteor.methods({
  'findMemberId': (mail, mid) => {
//    const member = Members.findOne({email: 'mpalmer@gmail.com'});
    console.log("Checking for "+ mail+ " and " + mid);
    const member = Members.findOne({email: mail});
    if (member) {
      console.log("Found member "+ member.name);
    }
    if (member && member.mid === mid) {
      return member._id;
    }
  },
  'check': (id) => {
    const member = Members.findOne(id);
    if (member) {
      return {
        member: member != null,
        info: {
          name: member.name,
          member: moment(member.member).format("YYYY-MM-DD"),
          lab: moment(member.lab).format("YYYY-MM-DD"),
          family: member.family,
          id: member.mid
        },
      };
    } else {
      return {
        member: false,
        info: {}
      }
    }
  },
});
