import { fn } from "storybook/test";
import Emails from "./Emails";

export default {
  title: "Pages/Emails",
  component: Emails,
  args: {
    emails: [
      { address: "anna@example.com", verified: true, primary: true },
      { address: "anna.work@example.com", verified: true, primary: false },
      { address: "anna.old@example.com", verified: false, primary: false },
    ],
    onAdd: fn(async () => true), onResend: fn(), onRemove: fn(), onMakePrimary: fn(), onRequestMerge: fn(),
  },
};

export const Some = {};
export const Taken = { args: { taken: "anna.other@example.com" } };
export const Failed = { args: { error: "Only a verified address can be primary" } };
export const Loading = { args: { loading: true } };
