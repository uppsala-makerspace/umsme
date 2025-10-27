import Home from './Home';

export default {
  title: 'UMSAPP/Home',
  component: Home,
  parameters: {
  },
  tags: ['autodocs']
};

const memberEnd = new Date();
const memberStart = new Date('2016');
memberEnd.setMonth(memberEnd.getMonth()+2);
const memberName = "John Doe";

export const MemberNoName = {
  args: {
    memberName: '',
    memberStatus: { memberStart, memberEnd }
  },
};

export const MemberNotPaying = {
  args: {
    memberName,
    memberStatus: { }
  },
};

export const MemberPaying = {
  args: {
    memberName,
    memberStatus: { memberStart, memberEnd }
  },
};