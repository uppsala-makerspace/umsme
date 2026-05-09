import { fn } from "storybook/test";
import MembershipSelection from "/imports/pages/membershipSelection/MembershipSelection";
import { calculateOptionAvailability } from "/imports/pages/membershipSelection/availabilityRules";
import { withLayout } from "./decorators";
import { member, membershipOptions } from "./fixtures";

export default {
  title: "Tutorial/Membership",
  component: MembershipSelection,
  decorators: [withLayout],
};

// New member with no active membership: all yearly options available, the
// quarterly lab is disabled (no base membership yet).
const newMemberStatus = {};

const baseActions = {
  onPay: fn(),
  onCancel: fn(),
  onIsDiscountedChange: fn(),
  onIsFamilyChange: fn(),
};

// Filename: membership-regular-{lang}.png — Family / Discounted unticked.
export const MembershipRegular = {
  args: {
    member: { name: member.name, mid: member.mid },
    memberStatus: newMemberStatus,
    options: calculateOptionAvailability(membershipOptions, newMemberStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
  parameters: { tutorial: { path: "/membership", file: "membership-regular", showNotifications: false } },
};

// Filename: membership-family-{lang}.png — Family ticked.
export const MembershipFamily = {
  args: {
    member: { name: member.name, mid: member.mid },
    memberStatus: newMemberStatus,
    options: calculateOptionAvailability(membershipOptions, newMemberStatus, false),
    isDiscounted: false,
    isFamily: true,
    familyLocked: false,
    ...baseActions,
  },
  parameters: { tutorial: { path: "/membership", file: "membership-family", showNotifications: false } },
};

// Filename: membership-discounted-{lang}.png — Discounted ticked.
export const MembershipDiscounted = {
  args: {
    member: { name: member.name, mid: member.mid },
    memberStatus: newMemberStatus,
    options: calculateOptionAvailability(membershipOptions, newMemberStatus, true),
    isDiscounted: true,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
  parameters: { tutorial: { path: "/membership", file: "membership-discounted", showNotifications: false } },
};
