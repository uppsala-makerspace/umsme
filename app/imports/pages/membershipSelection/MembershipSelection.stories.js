import { fn } from "storybook/test";
import MembershipSelection from "./MembershipSelection";
import { calculateOptionAvailability } from "./availabilityRules";

export default {
  title: "UMSAPP/MembershipSelection",
  component: MembershipSelection,
  parameters: {},
  tags: ["autodocs"],
};

// All membership options from config
const allOptions = [
  {
    paymentType: "memberBase",
    amount: 200,
    period: "year",
    label: { en: "Basic membership", sv: "Medlemskap Bas" },
    description: { en: "Access during open evenings and Saturday workshops.", sv: "Tillgång under öppna kvällar och lördagskurser." },
  },
  {
    paymentType: "memberDiscountedBase",
    amount: 100,
    period: "year",
    label: { en: "Basic membership (discounted)", sv: "Medlemskap Bas (rabatterat)" },
    description: { en: "For students, pensioners, or unemployed.", sv: "För studenter, pensionärer eller arbetslösa." },
    discountedOnly: true,
  },
  {
    paymentType: "memberLab",
    amount: 1600,
    period: "year",
    label: { en: "Lab Membership", sv: "Medlemskap Labb" },
    description: { en: "24/7 access to the Makerspace.", sv: "24/7 tillgång till Makerspace." },
  },
  {
    paymentType: "memberDiscountedLab",
    amount: 1200,
    period: "year",
    label: { en: "Lab Membership (discounted)", sv: "Medlemskap Labb (rabatterat)" },
    description: { en: "24/7 access at a reduced price.", sv: "24/7 tillgång till reducerat pris." },
    discountedOnly: true,
  },
  {
    paymentType: "memberQuarterlyLab",
    amount: 450,
    period: "quarter",
    label: { en: "Lab Membership (quarterly)", sv: "Medlemskap Labb (kvartal)" },
    description: { en: "24/7 access for three months.", sv: "24/7 tillgång i tre månader." },
  },
  {
    paymentType: "familyBase",
    amount: 300,
    period: "year",
    label: { en: "Family Basic Membership", sv: "Familjemedlemskap Bas" },
    description: { en: "For up to 5 people at the same address.", sv: "För upp till 5 personer på samma adress." },
    familyOnly: true,
  },
  {
    paymentType: "familyLab",
    amount: 2000,
    period: "year",
    label: { en: "Family Lab Membership", sv: "Familjemedlemskap Labb" },
    description: { en: "24/7 access for up to 5 people.", sv: "24/7 tillgång för upp till 5 personer." },
    familyOnly: true,
  },
];

const baseActions = {
  onSelectOption: fn(),
  onDiscountedChange: fn(),
  onFamilyChange: fn(),
  onCancel: fn(),
};

// Helper to create member status with dates relative to now
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// === NEW MEMBER STORIES ===

// New member - quarterly lab disabled (no base membership)
const newMemberStatus = { type: "none" };
export const NewMember = {
  args: {
    member: { name: "John Doe", mid: 12345 },
    memberStatus: newMemberStatus,
    options: calculateOptionAvailability(allOptions, newMemberStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
};

// New member with discounted selected
export const NewMemberDiscounted = {
  args: {
    member: { name: "John Doe", mid: 12345 },
    memberStatus: newMemberStatus,
    options: calculateOptionAvailability(allOptions, newMemberStatus, false),
    isDiscounted: true,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
};

// New member with family selected
export const NewMemberFamily = {
  args: {
    member: { name: "John Doe", mid: 12345 },
    memberStatus: newMemberStatus,
    options: calculateOptionAvailability(allOptions, newMemberStatus, true),
    isDiscounted: false,
    isFamily: true,
    familyLocked: false,
    ...baseActions,
  },
};

// === ACTIVE MEMBER - TOO EARLY TO RENEW ===

// Active member with >14 days remaining - all options disabled
const activeMemberTooEarlyStatus = {
  type: "member",
  memberEnd: daysFromNow(90),
};
export const ActiveMemberTooEarlyToRenew = {
  args: {
    member: { name: "Jane Smith", mid: 12346 },
    memberStatus: activeMemberTooEarlyStatus,
    options: calculateOptionAvailability(allOptions, activeMemberTooEarlyStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: true,
    ...baseActions,
  },
};

// === ACTIVE MEMBER - WITHIN RENEWAL WINDOW ===

// Active member within 14 days of expiry - can renew
const activeMemberRenewalWindowStatus = {
  type: "member",
  memberEnd: daysFromNow(10),
};
export const ActiveMemberWithinRenewalWindow = {
  args: {
    member: { name: "Jane Smith", mid: 12346 },
    memberStatus: activeMemberRenewalWindowStatus,
    options: calculateOptionAvailability(allOptions, activeMemberRenewalWindowStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
};

// === LAB MEMBER STORIES ===

// Lab member with yearly membership - quarterly disabled (has yearly lab)
const yearlyLabMemberStatus = {
  type: "labandmember",
  memberEnd: daysFromNow(10),
  labEnd: daysFromNow(10),
  quarterly: false,
};
export const YearlyLabMemberRenewal = {
  args: {
    member: { name: "Bob Wilson", mid: 12347 },
    memberStatus: yearlyLabMemberStatus,
    options: calculateOptionAvailability(allOptions, yearlyLabMemberStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
};

// Quarterly lab member within renewal window - can renew quarterly
const quarterlyLabMemberStatus = {
  type: "labandmember",
  memberEnd: daysFromNow(60),
  labEnd: daysFromNow(10),
  quarterly: true,
};
export const QuarterlyLabMemberCanRenew = {
  args: {
    member: { name: "Alice Brown", mid: 12348 },
    memberStatus: quarterlyLabMemberStatus,
    options: calculateOptionAvailability(allOptions, quarterlyLabMemberStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: true,
    ...baseActions,
  },
};

// Quarterly lab member too early to renew quarterly
const quarterlyLabTooEarlyStatus = {
  type: "labandmember",
  memberEnd: daysFromNow(60),
  labEnd: daysFromNow(30),
  quarterly: true,
};
export const QuarterlyLabMemberTooEarly = {
  args: {
    member: { name: "Alice Brown", mid: 12348 },
    memberStatus: quarterlyLabTooEarlyStatus,
    options: calculateOptionAvailability(allOptions, quarterlyLabTooEarlyStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: true,
    ...baseActions,
  },
};

// === Q4 SCENARIO ===

// Quarterly lab where labEnd === memberEnd - must renew yearly first
const q4ScenarioDate = daysFromNow(10);
const q4ScenarioStatus = {
  type: "labandmember",
  memberEnd: q4ScenarioDate,
  labEnd: q4ScenarioDate,
  quarterly: true,
};
export const Q4ScenarioRenewYearlyFirst = {
  args: {
    member: { name: "Charlie Davis", mid: 12349 },
    memberStatus: q4ScenarioStatus,
    options: calculateOptionAvailability(allOptions, q4ScenarioStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
};

// === FAMILY MEMBER STORIES ===

// Family member with locked family checkbox (too early to change)
const familyMemberTooEarlyStatus = {
  type: "labandmember",
  memberEnd: daysFromNow(90),
  labEnd: daysFromNow(90),
  family: true,
  quarterly: false,
};
export const FamilyMemberLockedCheckbox = {
  args: {
    member: { name: "The Smiths", mid: 12350, family: true },
    memberStatus: familyMemberTooEarlyStatus,
    options: calculateOptionAvailability(allOptions, familyMemberTooEarlyStatus, true),
    isDiscounted: false,
    isFamily: true,
    familyLocked: true,
    ...baseActions,
  },
};

// Family member within renewal window - can change family status
const familyMemberRenewalStatus = {
  type: "labandmember",
  memberEnd: daysFromNow(10),
  labEnd: daysFromNow(10),
  family: true,
  quarterly: false,
};
export const FamilyMemberCanChangeStatus = {
  args: {
    member: { name: "The Smiths", mid: 12350, family: true },
    memberStatus: familyMemberRenewalStatus,
    options: calculateOptionAvailability(allOptions, familyMemberRenewalStatus, true),
    isDiscounted: false,
    isFamily: true,
    familyLocked: false,
    ...baseActions,
  },
};

// === FAMILY MEMBER (infamily - non-paying) ===

export const FamilyMemberBlocked = {
  args: {
    member: { name: "Jane Doe", mid: 12352, infamily: "xxx" },
    memberStatus: { type: "member", memberEnd: daysFromNow(10), family: true },
    options: calculateOptionAvailability(allOptions, { type: "member", memberEnd: daysFromNow(10), family: true }, false),
    isDiscounted: false,
    isFamily: false,
    isFamilyMember: true,
    familyLocked: false,
    ...baseActions,
  },
};

// === EXPIRED MEMBER ===

// Expired member - treated as new, all yearly options available
const expiredMemberStatus = {
  type: "member",
  memberEnd: daysFromNow(-30),
};
export const ExpiredMember = {
  args: {
    member: { name: "Expired User", mid: 12351 },
    memberStatus: expiredMemberStatus,
    options: calculateOptionAvailability(allOptions, expiredMemberStatus, false),
    isDiscounted: false,
    isFamily: false,
    familyLocked: false,
    ...baseActions,
  },
};
