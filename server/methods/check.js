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
          id: member.mid,
          storage: member.storage
        },
      };
    } else {
      return {
        member: false,
        info: {}
      }
    }
  },
  'storage': (id, box) => {
    const member = Members.findOne(id);
    if (parseInt(box, 10) != box) {
      return "invalid";
    }
    if (member) {
      if (box && box !== "") {
        if (member.storage == box) {
          return "current"
        }
        const memberForBox = Members.findOne({storage: parseInt(box, 10)});
        console.log(memberForBox ? `Found the member ${memberForBox.name} with the same box name` : 'no member for that box');
        if (memberForBox) {
          return "busy";
        }
        Members.update(id, {"$set": { storage: parseInt(box, 10)} });
        return "updated";
      } else {
        Members.update(id, {"$unset": { storage: ""} });
        return "cleared";
      }
    }
    return false;
  }
});
