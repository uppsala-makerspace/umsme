import { fn } from 'storybook/test';
import Account from './Account';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'UMSAPP/Account',
  component: Account,
  parameters: {
  },
  tags: ['autodocs']
};

// Current membership (1 year)
const memberStart = new Date();
const memberEnd = new Date();
memberStart.setMonth(memberStart.getMonth()-6);
memberEnd.setMonth(memberEnd.getMonth()+6);

const discounted = true;
const quarterly = true;

// Previous memberships (each 1 year)
const previousMemberStart = new Date();
previousMemberStart.setMonth(previousMemberStart.getMonth()-18);
const previousMemberEnd = new Date();
previousMemberEnd.setMonth(previousMemberEnd.getMonth()-6);
const olderMemberStart = new Date();
olderMemberStart.setMonth(olderMemberStart.getMonth()-30);
const olderMemberEnd = new Date();
olderMemberEnd.setMonth(olderMemberEnd.getMonth()-18);

// Quarterly lab example (ending soon to show red warning)
const quarterlyLabStart = new Date();
quarterlyLabStart.setMonth(quarterlyLabStart.getMonth()-3);
const quarterlyLabEnd = new Date();
quarterlyLabEnd.setDate(quarterlyLabEnd.getDate()+10);

// Base member history
const baseMemberships = [
  { _id: '1', type: 'member', start: memberStart, memberend: memberEnd },
  { _id: '2', type: 'member', start: previousMemberStart, memberend: previousMemberEnd },
  { _id: '3', type: 'member', start: olderMemberStart, memberend: olderMemberEnd },
];

// Discounted base member history
const discountedBaseMemberships = [
  { _id: '1', type: 'member', start: memberStart, memberend: memberEnd, discount: true },
  { _id: '2', type: 'member', start: previousMemberStart, memberend: previousMemberEnd, discount: true },
  { _id: '3', type: 'member', start: olderMemberStart, memberend: olderMemberEnd },
];

// Lab member history (yearly lab)
const labMemberships = [
  { _id: '1', type: 'labandmember', start: memberStart, memberend: memberEnd, labend: memberEnd },
  { _id: '2', type: 'labandmember', start: previousMemberStart, memberend: previousMemberEnd, labend: previousMemberEnd },
  { _id: '3', type: 'member', start: olderMemberStart, memberend: olderMemberEnd },
];

// Discounted lab member history
const discountedLabMemberships = [
  { _id: '1', type: 'labandmember', start: memberStart, memberend: memberEnd, labend: memberEnd, discount: true },
  { _id: '2', type: 'labandmember', start: previousMemberStart, memberend: previousMemberEnd, labend: previousMemberEnd, discount: true },
  { _id: '3', type: 'member', start: olderMemberStart, memberend: olderMemberEnd },
];

// Quarterly lab member history (base membership + separate quarterly lab)
const quarterlyLabMemberships = [
  { _id: '1', type: 'member', start: memberStart, memberend: memberEnd },
  { _id: '2', type: 'lab', start: quarterlyLabStart, labend: quarterlyLabEnd },
  { _id: '3', type: 'member', start: previousMemberStart, memberend: previousMemberEnd },
];

// Family member history
const familyMemberships = [
  { _id: '1', type: 'member', start: memberStart, memberend: memberEnd, family: true },
  { _id: '2', type: 'member', start: previousMemberStart, memberend: previousMemberEnd, family: true },
  { _id: '3', type: 'member', start: olderMemberStart, memberend: olderMemberEnd },
];

// Family lab member history
const familyLabMemberships = [
  { _id: '1', type: 'labandmember', start: memberStart, memberend: memberEnd, labend: memberEnd, family: true },
  { _id: '2', type: 'labandmember', start: previousMemberStart, memberend: previousMemberEnd, labend: previousMemberEnd, family: true },
  { _id: '3', type: 'member', start: olderMemberStart, memberend: olderMemberEnd },
];

export const MemberBase = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, family: false, type: 'member' },
    memberships: baseMemberships,
  },
};

export const MemberNoPayment = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { },
    memberships: [],
  },
};

export const MemberDiscountedBase = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, family: false, type: 'member', discounted },
    memberships: discountedBaseMemberships,
  },
};

export const MemberLab = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, labEnd: memberEnd, family: false, type: 'labandmember' },
    memberships: labMemberships,
  },
};

export const MemberDiscountedLab = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, labEnd: memberEnd, family: false, type: 'labandmember', discounted },
    memberships: discountedLabMemberships,
  },
};

export const MemberQuarterlyLab = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, labEnd: quarterlyLabEnd, family: false, type: 'labandmember', quarterly },
    memberships: quarterlyLabMemberships,
  },
};

export const FamilyPayer = {
  args: {
    member: { name: 'John Doe', family: true, mid: '123', _id: 'xxx' },
    status: { memberStart, memberEnd, family: true, type: 'member' },
    familyMembers: [
      {name: 'Jane Doe', email: 'jane@doe.com'},
      {name: 'Jack Doe', email: 'jack@doe.com'}
     ],
    familyInvites: [
      { email: 'pending@example.com' }
    ],
    memberships: familyMemberships,
    addFamilyInvite: fn(),
    cancelFamilyInvite: fn(),
    removeFamilyMember: fn(),
  },
};

export const FamilyPayerNoInvites = {
  args: {
    member: { name: 'John Doe', family: true, mid: '123', _id: 'xxx' },
    status: { memberStart, memberEnd, family: true, type: 'member' },
    familyMembers: [
      {name: 'Jane Doe', email: 'jane@doe.com'},
      {name: 'Jack Doe', email: 'jack@doe.com'}
     ],
    familyInvites: [],
    memberships: familyMemberships,
    addFamilyInvite: fn(),
    cancelFamilyInvite: fn(),
    removeFamilyMember: fn(),
  },
};

export const FamilyLabPayer = {
  args: {
    member: { name: 'John Doe', family: true, mid: '123', _id: 'xxx' },
    status: { memberStart, memberEnd, labEnd: memberEnd, family: true, type: 'labandmember' },
    familyMembers: [
      {name: 'Jane Doe', email: 'jane@doe.com'},
      {name: 'Jack Doe', email: 'jack@doe.com'}
     ],
    familyInvites: [],
    memberships: familyLabMemberships,
    addFamilyInvite: fn(),
    cancelFamilyInvite: fn(),
    removeFamilyMember: fn(),
  },
};

export const FamilyMember = {
  args: {
    member: { name: 'Jane Doe', family: false, mid: '456', infamily: 'xxx' },
    status: { memberStart, memberEnd, family: true, type: 'member' },
    paying: { name: 'John Doe', email: 'john@doe.com', _id: 'xxx' },
  },
};

export const FamilyLabMember = {
  args: {
    member: { name: 'Jane Doe', family: false, mid: '456', infamily: 'xxx' },
    status: { memberStart, memberEnd, labEnd: memberEnd, family: true, type: 'labandmember' },
    paying: { name: 'John Doe', email: 'john@doe.com', _id: 'xxx' },
  },
};