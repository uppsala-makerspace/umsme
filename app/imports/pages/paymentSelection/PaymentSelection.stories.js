import { fn } from "storybook/test";
import PaymentSelection from "./PaymentSelection";

export default {
  title: "UMSAPP/PaymentSelection",
  component: PaymentSelection,
  parameters: {},
  tags: ["autodocs"],
};

const paymentOption = {
  paymentType: "memberBase",
  amount: 200,
  period: "year",
  label: { en: "Basic membership", sv: "Medlemskap Bas" },
  description: { en: "Access during open evenings and Saturday workshops.", sv: "Tillgång under öppna kvällar och lördagskurser." },
};

const labPaymentOption = {
  paymentType: "memberLab",
  amount: 1600,
  period: "year",
  label: { en: "Lab Membership", sv: "Medlemskap Labb" },
  description: { en: "24/7 access to the Makerspace.", sv: "24/7 tillgång till Makerspace." },
};

// Sample terms content in markdown
const sampleTermsContent = `# Terms of Purchase

## 1. Membership

By purchasing a membership, you agree to follow the rules and regulations of Uppsala Makerspace.

## 2. Payment

- All payments are non-refundable
- Memberships are personal and cannot be transferred
- Family memberships require all members to live at the same address

## 3. Cancellation

You may cancel your membership at any time, but no refunds will be issued for the remaining period.

For questions, contact kansliet@uppsalamakerspace.se
`;

// Membership dates for a new member (1 year + 14 days grace from now)
const newMemberDates = {
  start: new Date(),
  memberend: new Date(Date.now() + (365 + 14) * 24 * 60 * 60 * 1000),
  labend: null,
};

// Membership dates for renewal (extends from current end date)
const renewalDates = {
  start: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // starts from current memberend
  memberend: new Date(Date.now() + (90 + 365) * 24 * 60 * 60 * 1000), // current + 1 year
  labend: null,
};

// Lab membership dates
const labMembershipDates = {
  start: new Date(),
  memberend: new Date(Date.now() + (365 + 14) * 24 * 60 * 60 * 1000),
  labend: new Date(Date.now() + (365 + 14) * 24 * 60 * 60 * 1000),
};

// Lab renewal dates
const labRenewalDates = {
  start: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // starts from current labend
  memberend: new Date(Date.now() + (180 + 365) * 24 * 60 * 60 * 1000),
  labend: new Date(Date.now() + (180 + 365) * 24 * 60 * 60 * 1000),
};

const baseActions = {
  onPay: fn(),
  onCancel: fn(),
};

// Default state with "on this device" preselected (new member)
export const Default = {
  args: {
    paymentOption,
    membershipDates: newMemberDates,
    termsContent: sampleTermsContent,
    isLoading: false,
    ...baseActions,
  },
};

// Existing member renewing membership
export const Renewal = {
  args: {
    paymentOption,
    membershipDates: renewalDates,
    termsContent: sampleTermsContent,
    isLoading: false,
    ...baseActions,
  },
};

// Lab membership for new member
export const LabMembership = {
  args: {
    paymentOption: labPaymentOption,
    membershipDates: labMembershipDates,
    termsContent: sampleTermsContent,
    isLoading: false,
    ...baseActions,
  },
};

// Lab member renewing lab
export const LabRenewal = {
  args: {
    paymentOption: labPaymentOption,
    membershipDates: labRenewalDates,
    termsContent: sampleTermsContent,
    isLoading: false,
    ...baseActions,
  },
};

// No dates available (fallback)
export const NoDates = {
  args: {
    paymentOption,
    membershipDates: null,
    isLoading: false,
    ...baseActions,
  },
};

// Loading state (Pay button disabled)
export const Loading = {
  args: {
    paymentOption,
    membershipDates: newMemberDates,
    termsContent: sampleTermsContent,
    isLoading: true,
    ...baseActions,
  },
};

// Without terms content (terms not configured)
export const WithoutTerms = {
  args: {
    paymentOption,
    membershipDates: newMemberDates,
    termsContent: null,
    isLoading: false,
    ...baseActions,
  },
};

// Family member - blocked from paying
export const FamilyMemberBlocked = {
  args: {
    paymentOption,
    membershipDates: newMemberDates,
    termsContent: sampleTermsContent,
    isLoading: false,
    isFamilyMember: true,
    ...baseActions,
  },
};
