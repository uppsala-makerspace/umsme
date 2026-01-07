import { fn } from 'storybook/test';
import Home from './Home';

export default {
  title: 'UMSAPP/Home',
  component: Home,
  parameters: {
  },
  tags: ['autodocs']
};

const memberEnd = new Date();
const memberEndPassed = new Date();
const memberEndClose = new Date();
const memberStart = new Date('2016');
memberEnd.setMonth(memberEnd.getMonth()+2);
memberEndPassed.setMonth(memberEndPassed.getMonth()-2);
memberEndClose.setDate(memberEndClose.getDate()+2);
const memberName = "John Doe";
const liabilityDate = new Date('2024-01-15');
const oldLiabilityDate = new Date('2023-06-01');

export const EmailNotVerified = {
  args: {
    memberName: '',
    memberStatus: {},
    verified: false
  },
};

export const MemberNoName = {
  args: {
    memberName: '',
    memberStatus: { memberStart, memberEnd },
    verified: true
  },
};

export const FamilyInvite = {
  args: {
    memberName,
    memberStatus: {},
    verified: true,
    invite: { _id: '123', email: 'john@example.com', infamily: '456' },
    onAcceptInvite: fn(),
    onDeclineInvite: fn()
  },
};

export const MemberNotPaying = {
  args: {
    memberName,
    memberStatus: {},
    verified: true
  },
};

export const MembershipExpired = {
  args: {
    memberName,
    memberStatus: { memberStart, memberEnd: memberEndPassed },
    verified: true
  },
};

export const MembershipTimeToRenew = {
  args: {
    memberName,
    memberStatus: { memberStart, memberEnd: memberEndClose },
    verified: true,
    liabilityDate,
    liabilityOutdated: false
  },
};

export const MemberPaying = {
  args: {
    memberName,
    memberStatus: { memberStart, memberEnd },
    verified: true,
    liabilityDate,
    liabilityOutdated: false
  },
};

export const LiabilityNotApproved = {
  args: {
    memberName,
    memberStatus: { memberStart, memberEnd },
    verified: true,
    liabilityDate: null,
    liabilityOutdated: false
  },
};

export const LiabilityOutdated = {
  args: {
    memberName,
    memberStatus: { memberStart, memberEnd },
    verified: true,
    liabilityDate: oldLiabilityDate,
    liabilityOutdated: true
  },
};