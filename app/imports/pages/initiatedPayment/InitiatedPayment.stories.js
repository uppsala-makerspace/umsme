import { fn } from "storybook/test";
import InitiatedPayment from "./InitiatedPayment";

export default {
  title: "UMSAPP/InitiatedPayment",
  component: InitiatedPayment,
  parameters: {},
  tags: ["autodocs"],
};

const baseActions = {
  onRetry: fn(),
  onCancel: fn(),
  onBackToStart: fn(),
};

// Processing with deep link (no QR)
export const ProcessingDeepLink = {
  args: {
    step: "processing",
    qrCode: null,
    error: null,
    ...baseActions,
  },
};

// Processing with QR code
export const ProcessingQrCode = {
  args: {
    step: "processing",
    qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    error: null,
    ...baseActions,
  },
};

// Payment success
export const Success = {
  args: {
    step: "success",
    qrCode: null,
    error: null,
    ...baseActions,
  },
};

// Payment error
export const Error = {
  args: {
    step: "error",
    qrCode: null,
    error: "Payment was declined",
    ...baseActions,
  },
};

// Payment timeout
export const Timeout = {
  args: {
    step: "error",
    qrCode: null,
    error: "timeout",
    ...baseActions,
  },
};
