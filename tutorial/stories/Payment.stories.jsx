import { fn } from "storybook/test";
import PaymentSelection from "/imports/pages/paymentSelection/PaymentSelection";
import InitiatedPayment from "/imports/pages/initiatedPayment/InitiatedPayment";
import { withLayout } from "./decorators";
import { dates, membershipOptions, termsContent, otherPaymentOptionsUrl } from "./fixtures";

export default {
  title: "Tutorial/Payment",
  decorators: [withLayout],
};

const labOption = membershipOptions.find((o) => o.paymentType === "memberLab");

// Filename: payment-{lang}.png — pre-payment review screen with the
// lab membership picked, Swish-on-this-device selected, terms link.
export const Payment = {
  render: (args) => <PaymentSelection {...args} />,
  args: {
    loading: false,
    error: null,
    paymentOption: labOption,
    membershipDates: {
      start: dates.memberStart,
      memberend: dates.memberEnd,
      labend: dates.labEnd,
    },
    termsContent,
    isLoading: false,
    isFamilyMember: false,
    statusChanged: false,
    otherPaymentOptionsUrl,
    onPay: fn(),
    onCancel: fn(),
  },
  parameters: { tutorial: { path: "/membership/lab", file: "payment", showNotifications: false } },
};

// Filename: payment-approved-{lang}.png — success screen for a brand new
// member who still needs board approval and a signed liability.
export const PaymentApproved = {
  render: (args) => <InitiatedPayment {...args} />,
  args: {
    step: "success",
    qrCode: null,
    error: null,
    awaitingApproval: true,
    onRetry: fn(),
    onCancel: fn(),
    onBackToStart: fn(),
  },
  parameters: { tutorial: { path: "/initiatedPayment/x", file: "payment-approved", showNotifications: false } },
};
