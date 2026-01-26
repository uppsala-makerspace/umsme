import { Members } from '/imports/common/collections/members.js';
import { Memberships } from '/imports/common/collections/memberships.js';

/**
 * Detect start and end dates for the regular and lab memberships for a specific member.
 *
 * @param {member} mb an instance in the Member collection
 * @return {Promise<{
 *   memberStart: date,
 *   memberEnd: date,
 *   labStart: date,
 *   labEnd: date,
 *   family: boolean,
 *   type: string,
 *   discounted: boolean,
 *   quarterly: boolean
 * }>}
 */
export const memberStatus = async (mb) => {
  if (!mb) {
    return {};
  }
  const mid = mb.infamily || mb._id;
  let member;
  let memberStart;
  let lab;
  let labStart;
  let family = false;
  const now = new Date();
  let discounted = false;
  const updateMemberDate = (ms) => {
    if (!member || ms.memberend > member) {
      member = ms.memberend;
      memberStart = ms.start;
      family = ms.family;
      if (ms.memberend > now) {
        discounted = !!ms.discount;
      }
    }
  };
  let labms;
  const updateLabDate = (ms) => {
    if (!lab || ms.labend > lab) {
      lab = ms.labend;
      labStart = ms.start;
      if (ms.labend > now) {
        discounted = !!ms.discount;
        labms = ms;
      }
    }
  };
  await Memberships.find({mid}).forEachAsync((ms) => {
    switch (ms.type) {
      case 'member':
        updateMemberDate(ms);
        break;
      case 'lab':
        updateLabDate(ms);
        // Quarterly lab may extend memberend when labend > memberend
        if (ms.memberend) {
          updateMemberDate(ms);
        }
        break;
      case 'labandmember':
        updateMemberDate(ms);
        updateLabDate(ms);
        break;
    }
  });
  let type = 'none';
  if (member > now && lab > now) {
    type = 'labandmember';
  } else if (lab > now) {
    type = 'lab';
  } else if (member > now) {
    type = 'member';
  }
  const quarterly = labms && labms.type === 'lab';
  return { memberEnd: member, memberStart, labEnd: lab, labStart, family, type, discounted, quarterly};
};

/**
 * The member instance in the member collection contains duplicate information regarding
 * end dates of regular and lab membership. This method synchronizes that information
 * where the instances of the memberships collection are considered the truth.
 *
 * @param {member} mb an instance of the member collection
 * @return {Promise<void>}
 */
export const updateMember = async (mb) => {
  const { memberEnd, labEnd, family } = await memberStatus(mb);
  const $set = { family };
  const $unset = {};
  if (memberEnd) {
    $set.member = memberEnd;
  } else {
    $unset.member = "";
  }
  if (labEnd) {
    $set.lab = labEnd;
  } else {
    $unset.lab = "";
  }
  await Members.updateAsync(mb._id, {$set, $unset});
};