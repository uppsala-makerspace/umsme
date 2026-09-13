import { Members } from '/imports/common/collections/members.js';
import { Meteor } from "meteor/meteor";
import { StorageUnits } from '/imports/common/collections/storage';
import { storageOwnerForMember } from '/imports/common/server/storage/access';

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
    if (member) {
      const owner = await storageOwnerForMember(member);
      const unit = await StorageUnits.findOneAsync({
        owner: owner._id,
        availability_status: 'occupied',
      });
      return {
        member: member != null,
        info: {
          name: member.name,
          member: moment(member.member).format("YYYY-MM-DD"),
          lab: moment(member.lab).format("YYYY-MM-DD"),
          family: member.family,
          infamily: !!member.infamily,
          id: member.mid,
          storage: unit?.name,
        },
      };
    } else {
      return {
        member: false,
        info: {}
      }
    }
  }
});
