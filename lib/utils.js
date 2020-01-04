import { Members } from '/collections/members.js';
import { Memberships } from '/collections/memberships.js';

export const memberStatus = (mb) => {
  const mid = mb.infamily || mb._id;
  let member;
  let lab;
  let family;
  const updateMemberEndDate = (ms) => {
    if (!member || ms.end > member) {
      member = ms.end;
    }
  };
  const updateLabEndDate = (ms) => {
    if (!lab || ms.end > lab) {
      lab = ms.end;
    }
  };
  Memberships.find({mid}).forEach((ms) => {
    switch (ms.type) {
      case 'member':
        updateMemberEndDate(ms);
        break;
      case 'lab':
        updateLabEndDate(ms);
        break;
      case 'labandmember':
        updateMemberEndDate(ms);
        updateLabEndDate(ms);
        break;
    }
    if (ms.family && (!family || ms.end > family)) {
      family = ms.end;
    }
  });
  return { member, lab, family};
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