import { Members } from '/imports/common/collections/members.js';
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
  'storageCheck': async (id) => {
    const member = await Members.findOneAsync(id);
    let storage = member.storage;
    if (member.infamily) {
      const payingFamilyMember = await Members.findOneAsync(member.infamily);
      storage = payingFamilyMember.storage;
    }
    if (member) {
      return {
        member: member != null,
        info: {
          name: member.name,
          member: moment(member.member).format("YYYY-MM-DD"),
          lab: moment(member.lab).format("YYYY-MM-DD"),
          family: member.family,
          infamily: !!member.infamily,
          id: member.mid,
          storage,
          storagequeue: member.storagequeue ? true : undefined,
          storagerequest: member.storagerequest
        },
      };
    } else {
      return {
        member: false,
        info: {}
      }
    }
  },
  'storageQueue': async (id, queue) => {
    console.log("Queue called "+ typeof queue);
    const member = await Members.findOneAsync(id);
    console.log("For member "+ member._id);
    if (typeof queue !== 'boolean') {
      return false;
    }
    await Members.updateAsync(id, {"$set": { storagequeue: queue} });
    return true;
  },
  'storageRequest': async (id, request) => {
    console.log("Request called "+ typeof request);
    const member = await Members.findOneAsync(id);
    console.log("For member "+ member._id);
    if (request) {
      await Members.updateAsync(id, {"$set": { storagerequest: request} });
    } else {
      await Members.updateAsync(id, {"$unset": "storagerequest" });
    }
    return true;
  }
});
