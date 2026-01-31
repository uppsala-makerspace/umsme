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
  onSelectMethod: fn(),
  onRetry: fn(),
  onCancel: fn(),
  onBackToStart: fn(),
};

// Method selection step
export const MethodSelection = {
  args: {
    paymentOption,
    step: "method",
    qrCode: null,
    error: null,
    isLoading: false,
    ...baseActions,
  },
};

// Method selection while loading
export const MethodSelectionLoading = {
  args: {
    paymentOption,
    step: "method",
    qrCode: null,
    error: null,
    isLoading: true,
    ...baseActions,
  },
};

// Processing with deep link (no QR)
export const ProcessingDeepLink = {
  args: {
    paymentOption,
    step: "processing",
    qrCode: null,
    error: null,
    isLoading: false,
    ...baseActions,
  },
};

// Processing with QR code
export const ProcessingQrCode = {
  args: {
    paymentOption,
    step: "processing",
    qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    error: null,
    isLoading: false,
    ...baseActions,
  },
};

// Payment success
export const Success = {
  args: {
    paymentOption,
    step: "success",
    qrCode: null,
    error: null,
    isLoading: false,
    ...baseActions,
  },
};

// Payment error
export const Error = {
  args: {
    paymentOption,
    step: "error",
    qrCode: null,
    error: "Payment was declined",
    isLoading: false,
    ...baseActions,
  },
};

// Payment timeout
export const Timeout = {
  args: {
    paymentOption,
    step: "error",
    qrCode: null,
    error: "timeout",
    isLoading: false,
    ...baseActions,
  },
};
