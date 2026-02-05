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
    isLoading: false,
    ...baseActions,
  },
};

// Existing member renewing membership
export const Renewal = {
  args: {
    paymentOption,
    membershipDates: renewalDates,
    isLoading: false,
    ...baseActions,
  },
};

// Lab membership for new member
export const LabMembership = {
  args: {
    paymentOption: labPaymentOption,
    membershipDates: labMembershipDates,
    isLoading: false,
    ...baseActions,
  },
};

// Lab member renewing lab
export const LabRenewal = {
  args: {
    paymentOption: labPaymentOption,
    membershipDates: labRenewalDates,
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
    isLoading: true,
    ...baseActions,
  },
};
