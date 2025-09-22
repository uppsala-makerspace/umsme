import { fn } from 'storybook/test';

import Account from './Account';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'UMSAPP/Account',
  component: Account,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
//    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs']
};

const memberEnd = new Date();
const memberStart = new Date('2016');
memberEnd.setMonth(memberEnd.getMonth()+2);
const discounted = true;
const quarterly = true;

export const MemberBase = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, family: false, type: 'member' }
  },
};

export const MemberDiscountedBase = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, family: false, type: 'member', discounted }
  },
};

export const MemberLab = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, family: false, type: 'labandmember' }
  },
};

export const MemberDiscountedLab = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, family: false, type: 'labandmember', discounted }
  },
};

export const MemberQuarterlyLab = {
  args: {
    member: { name: 'John Doe', family: false, mid: '123' },
    status: { memberStart, memberEnd, family: false, type: 'labandmember', quarterly }
  },
};

export const FamilyPayer = {
  args: {
    member: { name: 'John Doe', family: true, mid: '123' },
    status: { memberStart: new Date('2016'), memberEnd: new Date('2025-12-12'), family: true, type: 'member' },
    familyMembers: [ {name: 'Jane Doe'} ],
  },
};