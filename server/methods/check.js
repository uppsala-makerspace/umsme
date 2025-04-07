import { Members } from '/collections/members.js';
import { Meteor } from "meteor/meteor";

Meteor.methods({
  'findMemberId': async (mail, mid) => {
    console.log("Checking for "+ mail+ " and " + mid);
    const member = await Members.findOneAsync({email: mail});
    if (member) {
      console.log("Found member "+ member.name);
    }
    if (member && member.mid === mid) {
      return member._id;
    }
  },
  'check': async (id) => {
    const member = await Members.findOneAsync(id);
    if (member) {
      return {
        member: member != null,
        info: {
          name: member.name,
          member: moment(member.member).format("YYYY-MM-DD"),
          lab: moment(member.lab).format("YYYY-MM-DD"),
          family: member.family,
          id: member.mid,
          storage: member.storage,
          storagequeue: member.storagequeue ? true : undefined
        },
      };
    } else {
      return {
        member: false,
        info: {}
      }
    }
  },
  'queue': async (id, queue) => {
    console.log("Queue called "+ typeof queue);
    const member = await Members.findOneAsync(id);
    console.log("For member "+ member._id);
    if (typeof queue !== 'boolean') {
      return false;
    }
    await Members.updateAsync(id, {"$set": { storagequeue: queue} });
    return true;
  }
});
