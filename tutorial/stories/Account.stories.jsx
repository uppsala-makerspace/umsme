import { fn } from "storybook/test";
import AccountPage from "/imports/pages/account/Account";
import { withLayout } from "./decorators";
import {
  member,
  partnerMember,
  dates,
  activeLabStatus,
  familyLabStatus,
  familyInvites,
  familyMembersAccepted,
  labMembershipHistory,
  familyLabMembershipHistory,
} from "./fixtures";

export default {
  title: "Tutorial/Account",
  component: AccountPage,
  decorators: [withLayout],
};

// Filename: account-{lang}.png — the lab member's My Account page. Account.jsx
// shows a "your account is pending board approval" note when paying.registered
// is falsy, so we set it true here.
export const Account = {
  args: {
    member: { name: member.name, mid: member.mid, _id: member._id, family: false, registered: true },
    paying: { ...member, registered: true },
    status: activeLabStatus,
    memberships: labMembershipHistory,
  },
  parameters: { tutorial: { path: "/account", file: "account" } },
};

// Filename: family-account-{lang}.png — family payer's My Account showing
// pending invites + Add family member button.
export const FamilyAccount = {
  args: {
    member: { name: member.name, mid: member.mid, _id: member._id, family: true, registered: true },
    paying: { ...member, registered: true },
    status: familyLabStatus,
    familyMembers: familyMembersAccepted,
    familyInvites,
    memberships: familyLabMembershipHistory,
    addFamilyInvite: fn(),
    cancelFamilyInvite: fn(),
    removeFamilyMember: fn(),
  },
  parameters: { tutorial: { path: "/account", file: "family-account" } },
};

// Filename: familymember-account-{lang}.png — non-paying family member's
// My Account, showing the "you are part of a family" panel + Leave button.
export const FamilymemberAccount = {
  args: {
    member: {
      name: partnerMember.name,
      mid: partnerMember.mid,
      _id: partnerMember._id,
      family: false,
      infamily: member._id,
      registered: true,
    },
    status: { ...familyLabStatus, family: true },
    paying: { name: member.name, email: "mpalmer@gmail.com", _id: member._id, registered: true },
    onLeaveFamily: fn(),
  },
  parameters: { tutorial: { path: "/account", file: "familymember-account" } },
};
