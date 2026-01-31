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

const baseActions = {
  onPay: fn(),
  onCancel: fn(),
};

// Default state with "on this device" preselected
export const Default = {
  args: {
    paymentOption,
    isLoading: false,
    ...baseActions,
  },
};

// Loading state (Pay button disabled)
export const Loading = {
  args: {
    paymentOption,
    isLoading: true,
    ...baseActions,
  },
};
