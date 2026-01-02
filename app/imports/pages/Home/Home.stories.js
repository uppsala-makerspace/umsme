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

export const EmailNotVerified = {
  args: {
    memberName: '',
    memberStatus: { verified: false }
  },
};

export const MemberNoName = {
  args: {
    memberName: '',
    memberStatus: { verified: true, memberStart, memberEnd }
  },
};

export const MemberNotPaying = {
  args: {
    memberName,
    memberStatus: { verified: true }
  },
};

export const MembershipExpired = {
  args: {
    memberName,
    memberStatus: { verified: true, memberStart, memberEnd: memberEndPassed }
  },
};

export const MembershipTimeToRenew = {
  args: {
    memberName,
    memberStatus: { verified: true, memberStart, memberEnd: memberEndClose }
  },
};

export const MemberPaying = {
  args: {
    memberName,
    memberStatus: { verified: true, memberStart, memberEnd }
  },
};