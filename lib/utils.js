import { Members } from '/collections/members.js';
import { Memberships } from '/collections/memberships.js';

export const memberStatus = (mb) => {
  if (!mb) {
    return {};
  }
  const mid = mb.infamily || mb._id;
  let member;
  let memberStart;
  let lab;
  let labStart;
  let family;
  const updateMemberDate = (ms) => {
    if (!member || ms.memberend > member) {
      member = ms.memberend;
      memberStart = ms.start;
    }
  };
  const updateLabDate = (ms) => {
    if (!lab || ms.labend > lab) {
      lab = ms.labend;
      labStart = ms.start;
    }
  };
  Memberships.find({mid}).forEach((ms) => {
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
    if (ms.family && (!family || ms.memberend > family)) {
      family = ms.memberend;
    }
  });
  return { member, memberStart, lab, labStart, family};
};

export const updateMember = (mb) => {
  const { member, lab, family } = memberStatus(mb);
  const familyNow = family > new Date();
  const $set = { family: familyNow};
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
  Members.update(mb._id, {$set, $unset});
};