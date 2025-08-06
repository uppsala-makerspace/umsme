import { Members } from '/collections/members.js';
import { Memberships } from '/collections/memberships.js';

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
  const updateMemberDate = (ms) => {
    if (!member || ms.memberend > member) {
      member = ms.memberend;
      memberStart = ms.start;
      family = ms.family;
    }
  };
  const updateLabDate = (ms) => {
    if (!lab || ms.labend > lab) {
      lab = ms.labend;
      labStart = ms.start;
    }
  };
  await Memberships.find({mid}).forEachAsync((ms) => {
    switch (ms.type) {
      case 'member':
        updateMemberDate(ms);
        break;
      case 'lab':
        updateLabDate(ms);
        break;
      case 'labandmember':
        updateMemberDate(ms);
        updateLabDate(ms);
        break;
    }
  });
  return { member, memberStart, lab, labStart, family};
};

export const updateMember = async (mb) => {
  const { member, lab, family } = await memberStatus(mb);
  const $set = { family };
  const $unset = {};
  if (member) {
    $set.member = member;
  } else {
    $unset.member = "";
  }
  if (lab) {
    $set.lab = lab;
  } else {
    $unset.lab = "";
  }
  await Members.updateAsync(mb._id, {$set, $unset});
};