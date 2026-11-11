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

// Payment success — renewing / approved member with signed liability
export const Success = {
  args: {
    step: "success",
    qrCode: null,
    error: null,
    awaitingApproval: false,
    ...baseActions,
  },
};

// Payment success — new member: board hasn't approved yet, or liability not signed
export const SuccessAwaitingApproval = {
  args: {
    step: "success",
    qrCode: null,
    error: null,
    awaitingApproval: true,
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

// Webshop purchases: the page names the item instead of the membership.
const purchaseActions = { ...baseActions, onPurchases: fn() };
const purchase = {
  item: {
    code: "tshirt",
    name: { sv: "T-shirt med logga", en: "T-shirt with logo" },
    imageUrl: "https://placehold.co/256x256/png?text=T-shirt",
    available: true,
  },
  amount: "200",
  comment: "Storlek M",
};

// Purchase waiting for the payment
export const PurchaseProcessing = {
  args: { step: "processing", qrCode: null, error: null, purchase, ...purchaseActions },
};

// Purchase approved, with image and comment
export const PurchaseSuccess = {
  args: { step: "success", qrCode: null, error: null, purchase, ...purchaseActions },
};

// Purchase approved, an item without image and no comment
export const PurchaseSuccessPlain = {
  args: {
    step: "success",
    qrCode: null,
    error: null,
    purchase: { item: { ...purchase.item, imageUrl: null }, amount: "50", comment: null },
    ...purchaseActions,
  },
};

// Purchase failed
export const PurchaseError = {
  args: { step: "error", qrCode: null, error: "Payment was declined", purchase, ...purchaseActions },
};
